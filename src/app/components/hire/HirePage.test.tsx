import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import * as hireApi from "@/lib/hireApi";
import { HirePage } from "./HirePage";

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/lib/hireApi", () => ({
  hireKeys: {
    readiness: ["hire", "readiness"],
    health: ["hire", "health"],
    status: ["hire", "status"],
    leads: ["hire", "leads"],
    profile: ["hire", "profile"],
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
    (hireApi.createHireManualLead as jest.Mock).mockResolvedValue({ ...lead, job_id: "job_456" });
    (hireApi.fireHireApplication as jest.Mock).mockResolvedValue({ status: "firing" });
    (hireApi.readHireLeadForm as jest.Mock).mockResolvedValue({ fields: [] });
    (hireApi.previewHireApplication as jest.Mock).mockResolvedValue({ preview: true });
  });

  it("renders the authenticated V2 Hire workbench with central product state", async () => {
    renderHirePage();

    expect(await screen.findByText("ZAKI Hire")).toBeInTheDocument();
    expect(await screen.findAllByText("Senior Product Engineer")).toHaveLength(2);
    expect(screen.getByText("operational")).toBeInTheDocument();
    expect(screen.getByText("Engine online")).toBeInTheDocument();
    expect(screen.getByText("central")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "billing" })).toHaveAttribute("href", "/settings#settings-billing");
    expect(screen.getByRole("link", { name: "usage" })).toHaveAttribute("href", "/settings#settings-billing");
  });

  it("creates a manual lead through the BFF client", async () => {
    const user = userEvent.setup();
    renderHirePage();

    await screen.findAllByText("Senior Product Engineer");
    await screen.findByText("operational");
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
    await screen.findByText("operational");
    expect(screen.getByRole("button", { name: /auto-apply/i })).toBeDisabled();

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /auto-apply/i }));

    await waitFor(() => {
      expect(hireApi.fireHireApplication).toHaveBeenCalledWith("job_123");
    });
  });

  it("renders an empty operational queue without marketing fallback", async () => {
    (hireApi.listHireLeads as jest.Mock).mockResolvedValueOnce([]);

    renderHirePage();

    expect(await screen.findByText("operational")).toBeInTheDocument();
    expect(screen.getByText("No lead queue yet")).toBeInTheDocument();
    expect(screen.getByText("Add first lead")).toBeInTheDocument();
    expect(screen.getByText("Select a lead")).toBeInTheDocument();
  });

  it("renders loading product state and blocks expensive actions", async () => {
    (hireApi.getHireReadiness as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));

    renderHirePage();

    expect((await screen.findAllByText("loading")).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /run scan/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /add to pipeline/i })).toBeDisabled();
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

    expect((await screen.findAllByText("disabled")).length).toBeGreaterThan(0);
    expect(screen.getByText("ZAKI Hire activation is pending.")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Job URL"), "https://jobs.example/new");
    await user.type(screen.getByPlaceholderText("Paste job text"), "Build workflow automation.");
    expect(screen.getByRole("button", { name: /run scan/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /add to pipeline/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /generate package/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /auto-apply/i })).toBeDisabled();
  });

  it.each([
    ["degraded", "ZAKI Hire is degraded."],
  ])("renders %s product state and blocks expensive actions", async (status, message) => {
    (hireApi.getHireReadiness as jest.Mock).mockResolvedValueOnce({
      available: status === "degraded",
      status,
      message,
      operations: {
        operatorManagedSettings: true,
        userProviderSettingsExposed: false,
        billingManagedCentrally: true,
        quotaManagedCentrally: true,
      },
    });

    renderHirePage();

    expect((await screen.findAllByText(status)).length).toBeGreaterThan(0);
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run scan/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /generate package/i })).toBeDisabled();
  });
});
