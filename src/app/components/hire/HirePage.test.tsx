import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { fetchUsageQuota } from "@/lib/api";
import * as hireApi from "@/lib/hireApi";
import { HirePage } from "./HirePage";

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/lib/api", () => ({
  fetchUsageQuota: jest.fn(),
}));

jest.mock("@/lib/hireApi", () => ({
  hireKeys: {
    readiness: ["hire", "readiness"],
    health: ["hire", "health"],
    status: ["hire", "status"],
    leads: ["hire", "leads"],
    profile: ["hire", "profile"],
    quota: ["hire", "quota"],
  },
  getHireReadiness: jest.fn(),
  getHireHealth: jest.fn(),
  getHireStatus: jest.fn(),
  listHireLeads: jest.fn(),
  getHireProfile: jest.fn(),
  createHireManualLead: jest.fn(),
  updateHireLeadStatus: jest.fn(),
  updateHireLeadFollowup: jest.fn(),
  generateHireLead: jest.fn(),
  startHireLeadPipeline: jest.fn(),
  startHireScan: jest.fn(),
  stopHireScan: jest.fn(),
  reevaluateHireLeads: jest.fn(),
  scanHireFreeSources: jest.fn(),
  updateHireCandidate: jest.fn(),
  updateHireIdentity: jest.fn(),
  ingestHireResume: jest.fn(),
  ingestHireGithub: jest.fn(),
  ingestHirePortfolio: jest.fn(),
  readHireLeadForm: jest.fn(),
  previewHireApplication: jest.fn(),
  fireHireApplication: jest.fn(),
}));

const fetchUsageQuotaMock = fetchUsageQuota as jest.MockedFunction<typeof fetchUsageQuota>;
const lead = {
  job_id: "job_123",
  title: "Senior Product Engineer",
  company: "Acme",
  platform: "greenhouse",
  location: "Remote",
  status: "discovered",
  score: 86,
  reason: "Strong React and SaaS fit.",
  match_points: ["React", "Product engineering"],
  gaps: ["No fintech domain signal"],
  url: "https://jobs.example/apply",
};

function renderHirePage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/hire"]}>
        <HirePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("HirePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (hireApi.getHireReadiness as jest.Mock).mockResolvedValue({
      available: true,
      status: "ready",
      message: "ZAKI Hire is ready.",
      capabilities: {
        dashboard: true,
        pipeline: true,
        profile: true,
        imports: true,
        sourceScan: true,
        generation: true,
        browserAutomation: true,
        autoApply: true,
      },
      operations: {
        operatorManagedSettings: true,
        userProviderSettingsExposed: false,
        billingManagedCentrally: true,
        quotaManagedCentrally: true,
      },
    });
    (hireApi.getHireHealth as jest.Mock).mockResolvedValue({ status: "alive" });
    (hireApi.getHireStatus as jest.Mock).mockResolvedValue({ scanning: false, reevaluating: false });
    (hireApi.listHireLeads as jest.Mock).mockResolvedValue([lead]);
    (hireApi.getHireProfile as jest.Mock).mockResolvedValue({
      n: "Nova",
      s: "Product engineer",
      identity: { email: "nova@example.com" },
      skills: [{ n: "React" }],
      exp: [{ role: "Engineer", co: "Acme" }],
      projects: [{ title: "ZAKI" }],
    });
    fetchUsageQuotaMock.mockResolvedValue({
      response: {} as Response,
      data: {
        success: true,
        surface: "hire",
        period: "week",
        remaining: 8,
        used: 2,
        limit: 10,
      },
    });
    (hireApi.createHireManualLead as jest.Mock).mockResolvedValue({ ...lead, job_id: "job_456" });
    (hireApi.fireHireApplication as jest.Mock).mockResolvedValue({ status: "firing" });
    (hireApi.readHireLeadForm as jest.Mock).mockResolvedValue({ fields: [] });
    (hireApi.previewHireApplication as jest.Mock).mockResolvedValue({ preview: true });
  });

  it("renders the authenticated Hire workbench with lead and quota data", async () => {
    renderHirePage();

    expect(await screen.findByText("ZAKI Hire")).toBeInTheDocument();
    expect(await screen.findAllByText("Senior Product Engineer")).toHaveLength(2);
    expect(screen.getByText("Product ready")).toBeInTheDocument();
    expect(screen.getByText("Engine online")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(fetchUsageQuotaMock).toHaveBeenCalledWith("hire");
  });

  it("creates a manual lead through the BFF client", async () => {
    const user = userEvent.setup();
    renderHirePage();

    await screen.findAllByText("Senior Product Engineer");
    await screen.findByText("Product ready");
    await user.type(screen.getByPlaceholderText("Job URL"), "https://jobs.example/new");
    await user.type(screen.getByPlaceholderText("Paste job text"), "Build workflow automation.");
    await user.click(screen.getByRole("button", { name: /add to pipeline/i }));

    await waitFor(() => {
      expect(hireApi.createHireManualLead).toHaveBeenCalledWith({
        text: "Build workflow automation.",
        url: "https://jobs.example/new",
      });
    });
  });

  it("requires local consent before calling auto-apply", async () => {
    const user = userEvent.setup();
    renderHirePage();

    await screen.findAllByText("Senior Product Engineer");
    await screen.findByText("Product ready");
    expect(screen.getByRole("button", { name: /auto-apply/i })).toBeDisabled();

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /auto-apply/i }));

    await waitFor(() => {
      expect(hireApi.fireHireApplication).toHaveBeenCalledWith("job_123");
    });
  });

  it("disables high-impact actions when central Hire activation is pending", async () => {
    const user = userEvent.setup();
    (hireApi.getHireReadiness as jest.Mock).mockResolvedValueOnce({
      available: false,
      status: "not_configured",
      message: "ZAKI Hire activation is pending.",
      operations: {
        operatorManagedSettings: true,
        userProviderSettingsExposed: false,
        billingManagedCentrally: true,
        quotaManagedCentrally: true,
      },
    });

    renderHirePage();

    expect(await screen.findByText("Activation pending")).toBeInTheDocument();
    expect(screen.getByText("ZAKI Hire activation is pending.")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Job URL"), "https://jobs.example/new");
    await user.type(screen.getByPlaceholderText("Paste job text"), "Build workflow automation.");
    expect(screen.getByRole("button", { name: /run scan/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /add to pipeline/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /generate package/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /auto-apply/i })).toBeDisabled();
  });
});
