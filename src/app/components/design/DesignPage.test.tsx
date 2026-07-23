import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DesignPage } from "./DesignPage";

const mockEnsure = jest.fn();
const mockStatus = jest.fn();
const mockCreate = jest.fn();
const mockListProjects = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key }),
}));

jest.mock("@/lib/designApi", () => ({
  getDesignHealth: jest.fn().mockResolvedValue({ ok: true, enabled: true, configured: true }),
  listDesignProjects: (...args: unknown[]) => mockListProjects(...args),
  createDesignProject: (...args: unknown[]) => mockCreate(...args),
  ensureDesignSession: (...args: unknown[]) => mockEnsure(...args),
  getDesignSession: (...args: unknown[]) => mockStatus(...args),
  stopDesignSession: jest.fn(),
  designWorkbenchUrl: (session: { id: string; projectId: string }, projectName: string) => {
    const query = new URLSearchParams({
      sessionId: session.id,
      projectId: session.projectId,
      projectName,
    });
    return `/api/design/workbench/projects/${session.projectId}?${query.toString()}`;
  },
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><DesignPage /></QueryClientProvider>);
}

describe("DesignPage hosted lifecycle", () => {
  beforeEach(() => {
    mockListProjects.mockReset().mockResolvedValue({ projects: [{ id: "project_01", name: "Brand system" }] });
    mockEnsure.mockReset().mockResolvedValue({
      session: { id: "sess_01", projectId: "project_01", state: "READY", generation: 1 },
    });
    mockStatus.mockReset().mockResolvedValue({
      session: { id: "sess_01", projectId: "project_01", state: "READY", generation: 1 },
    });
    mockCreate.mockReset().mockResolvedValue({ project: { id: "project_new", name: "My designs" } });
  });

  it("auto-opens the most recent project's workbench on entry — no picker, no session controls", async () => {
    renderPage();

    // No click: the page lands straight in the workbench for the most recent project.
    await waitFor(() => expect(mockEnsure).toHaveBeenCalledWith("project_01"));
    const frame = await screen.findByTitle("ZAKI Design workbench");
    expect(frame).toHaveAttribute(
      "src",
      "/api/design/workbench/projects/project_01?sessionId=sess_01&projectId=project_01&projectName=Brand+system",
    );

    // The old project-picker page and ZAKI-side session controls are gone.
    expect(screen.queryByText("Your design projects")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stop" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back to projects" })).not.toBeInTheDocument();
  });

  it("seeds a default project when the user has none", async () => {
    mockListProjects.mockResolvedValue({ projects: [] });
    mockEnsure.mockResolvedValue({
      session: { id: "sess_02", projectId: "project_new", state: "READY", generation: 0 },
    });
    renderPage();

    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({ name: "My designs" }));
    await waitFor(() => expect(mockEnsure).toHaveBeenCalledWith("project_new"));
    expect(await screen.findByTitle("ZAKI Design workbench")).toBeVisible();
  });

  it("offers a safe retry when the worker comes back stopped", async () => {
    mockEnsure.mockResolvedValueOnce({
      session: { id: "sess_01", projectId: "project_01", state: "STARTING", generation: 1 },
      retryAfterMs: 10,
    });
    mockStatus.mockResolvedValueOnce({
      session: { id: "sess_01", projectId: "project_01", state: "STOPPED", generation: 1 },
    });
    renderPage();

    expect(await screen.findByRole("button", { name: "Retry" })).toBeVisible();
  });

  it("opens the workbench when retry readmits the session", async () => {
    mockEnsure
      .mockResolvedValueOnce({
        session: { id: "sess_01", projectId: "project_01", state: "STARTING", generation: 1 },
        retryAfterMs: 10,
      })
      .mockResolvedValueOnce({
        session: { id: "sess_01", projectId: "project_01", state: "READY", generation: 1 },
      });
    mockStatus.mockResolvedValueOnce({
      session: { id: "sess_01", projectId: "project_01", state: "STOPPED", generation: 1 },
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));

    expect(await screen.findByTitle("ZAKI Design workbench")).toHaveAttribute(
      "src",
      "/api/design/workbench/projects/project_01?sessionId=sess_01&projectId=project_01&projectName=Brand+system",
    );
  });
});
