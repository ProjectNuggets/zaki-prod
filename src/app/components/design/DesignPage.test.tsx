import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DesignPage } from "./DesignPage";

const mockEnsure = jest.fn();
const mockStop = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key }),
}));

jest.mock("@/lib/designApi", () => ({
  getDesignHealth: jest.fn().mockResolvedValue({ ok: true, enabled: true, configured: true }),
  listDesignProjects: jest.fn().mockResolvedValue({ projects: [{ id: "project_01", name: "Brand system" }] }),
  createDesignProject: jest.fn(),
  ensureDesignSession: (...args: unknown[]) => mockEnsure(...args),
  getDesignSession: jest.fn(),
  stopDesignSession: (...args: unknown[]) => mockStop(...args),
  designWorkbenchUrl: (session: { id: string; projectId: string }) =>
    `/api/design/workbench/projects/${session.projectId}?sessionId=${session.id}`,
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><DesignPage /></QueryClientProvider>);
}

describe("DesignPage hosted lifecycle", () => {
  beforeEach(() => {
    mockEnsure.mockReset().mockResolvedValue({
      session: { id: "sess_01", projectId: "project_01", state: "READY", generation: 1 },
    });
    mockStop.mockReset().mockResolvedValue({
      session: { id: "sess_01", projectId: "project_01", state: "STOPPED", generation: 1 },
    });
  });

  it("opens an isolated project workbench and stops it before returning", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Brand system/i }));

    await waitFor(() => expect(mockEnsure).toHaveBeenCalledWith("project_01"));
    const frame = await screen.findByTitle("ZAKI Design workbench");
    expect(frame).toHaveAttribute("src", "/api/design/workbench/projects/project_01?sessionId=sess_01");

    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    await waitFor(() => expect(mockStop).toHaveBeenCalledWith("sess_01", "project_01"));
    expect(await screen.findByText("Your design projects")).toBeInTheDocument();
  });

  it("does not allow leaving while session admission is still pending", async () => {
    let resolveEnsure!: (value: unknown) => void;
    mockEnsure.mockImplementation(() => new Promise((resolve) => { resolveEnsure = resolve; }));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Brand system/i }));

    expect(await screen.findByRole("button", { name: "Back to projects" })).toBeDisabled();
    resolveEnsure({ session: { id: "sess_01", projectId: "project_01", state: "READY", generation: 1 } });
    expect(await screen.findByTitle("ZAKI Design workbench")).toBeVisible();
  });
});
