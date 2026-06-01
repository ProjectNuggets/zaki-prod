import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PowerUserSheet, deriveSoftLimitState } from "./PowerUserSheet";
import type { NullalisApprovalRequest } from "@/app/components/chat/BotStatusRail";

jest.mock("@/lib/api", () => ({
  downloadAgentExportFile: jest.fn(),
  exportAgentArtifact: jest.fn(),
  fetchAgentExtensionDiagnostics: jest.fn(),
  fetchAgentTrace: jest.fn(),
  fetchAgentDiagnostics: jest.fn(),
  fetchUsageQuota: jest.fn(),
  fetchContextDiagnostics: jest.fn(),
  fetchMemoryDoctor: jest.fn(),
  listAgentArtifacts: jest.fn(),
  listAgentTraces: jest.fn(),
  normalizeAgentArtifactShareUrl: (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null,
  normalizeAgentExportDownloadUrl: (value: unknown) => {
    if (typeof value !== "string" || !value.trim()) return null;
    const raw = value.trim();
    const rawPathish = (raw.split(/[?#]/, 1)[0] ?? "")
      .replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i, "");
    const safeFilename = (filename: string) => {
      const decoded = decodeURIComponent(filename).trim();
      return /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(decoded)
        ? encodeURIComponent(decoded)
        : null;
    };
    const parsed = new URL(raw, "http://zaki.local");
    const match = parsed.pathname.match(/^\/api\/v1\/users\/[^/]+\/exports\/([^/?#]+)$/);
    if (match?.[1]) {
      const filename = safeFilename(match[1]);
      return filename ? `/api/agent/exports/${filename}` : null;
    }
    if (/^\/api\/v1\/users\/[^/]+\/exports(?:\/|$)/.test(rawPathish)) return null;
    if (parsed.pathname.startsWith("/api/agent/exports/")) return raw;
    return null;
  },
  revokeAgentArtifactShare: jest.fn(),
  revokeAgentTraceShare: jest.fn(),
  shareAgentArtifact: jest.fn(),
  shareAgentTrace: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    message: jest.fn(),
    success: jest.fn(),
  },
}));

const tMock = (key: string, options?: Record<string, unknown>) => {
  const labels: Record<string, string> = {
    "zakiControls.powerUser.context.noActiveSession":
      "Start a conversation to see context diagnostics.",
    "zakiControls.powerUser.memory.noActiveSession":
      "Start a conversation to see memory diagnostics.",
    "zakiControls.powerUser.context.sections.memory": "Memory",
    "zakiControls.powerUser.tabs.controls": "Controls",
    "zakiControls.powerUser.tabs.approvals": "Approvals",
    "zakiControls.powerUser.tabs.browser": "Browser",
    "zakiControls.powerUser.tabs.artifacts": "Artifacts",
    "zakiControls.powerUser.tabs.trace": "Trace",
    "zakiControls.powerUser.tabs.context": "Context",
    "zakiControls.powerUser.tabs.memory": "Memory",
    "zakiControls.powerUser.tabs.usage": "Usage",
    "zakiControls.powerUser.approvals.approve": "Approve",
    "zakiControls.powerUser.approvals.deny": "Deny",
    "zakiControls.powerUser.browser.serverLane": "App browser",
    "zakiControls.powerUser.browser.extensionLane": "User browser extension",
    "zakiControls.powerUser.browser.toolSurface": "Extension command contract",
    "zakiControls.powerUser.browser.ready": "Ready",
    "zakiControls.powerUser.browser.paired": "Paired",
    "zakiControls.powerUser.browser.pairingRequired": "Pairing required",
    "zakiControls.powerUser.artifacts.share": "Share",
    "zakiControls.powerUser.artifacts.revoke": "Stop sharing",
    "zakiControls.powerUser.artifacts.shareSuccess": "Artifact share created",
    "zakiControls.powerUser.trace.share": "Share run",
    "zakiControls.powerUser.trace.revoke": "Stop sharing",
    "zakiControls.powerUser.trace.shareSuccess": "Trace share created",
  };
  if (labels[key]) return labels[key];
  if (key === "zakiControls.powerUser.context.unavailable") {
    return `Diagnostics unavailable: ${String(options?.error ?? "")}`;
  }
  if (key === "zakiControls.powerUser.memory.unavailable") {
    return `Memory doctor unavailable: ${String(options?.error ?? "")}`;
  }
  if (key === "zakiControls.powerUser.context.noDiagnostics") {
    return `No context diagnostics available (${String(options?.reason ?? "")}).`;
  }
  if (key === "zakiControls.powerUser.memory.noDiagnostics") {
    return `Memory doctor unavailable (${String(options?.reason ?? "")}).`;
  }
  if (key === "zakiControls.powerUser.usage.usedUnlimited") {
    return `${String(options?.used ?? "")} · unlimited`;
  }
  if (key === "zakiControls.powerUser.usage.footer") {
    return `Soft-limit warning at ${String(options?.warning ?? "")}% used; near-limit at ${String(options?.near ?? "")}%. Hard stops still apply on hit.`;
  }
  if (key === "zakiControls.powerUser.trace.events") {
    return `${String(options?.count ?? "")} events`;
  }
  if (key === "zakiControls.powerUser.browser.lastCommand") {
    return `${String(options?.result ?? "")} · ${String(options?.tool ?? "")}`;
  }
  return key;
};

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: tMock,
  }),
}));

const fetchUsageQuotaMock = jest.requireMock("@/lib/api").fetchUsageQuota as jest.Mock;
const fetchAgentDiagnosticsMock = jest.requireMock("@/lib/api")
  .fetchAgentDiagnostics as jest.Mock;
const fetchAgentExtensionDiagnosticsMock = jest.requireMock("@/lib/api")
  .fetchAgentExtensionDiagnostics as jest.Mock;
const fetchContextDiagnosticsMock = jest.requireMock("@/lib/api")
  .fetchContextDiagnostics as jest.Mock;
const fetchMemoryDoctorMock = jest.requireMock("@/lib/api")
  .fetchMemoryDoctor as jest.Mock;
const downloadAgentExportFileMock = jest.requireMock("@/lib/api")
  .downloadAgentExportFile as jest.Mock;
const exportAgentArtifactMock = jest.requireMock("@/lib/api").exportAgentArtifact as jest.Mock;
const fetchAgentTraceMock = jest.requireMock("@/lib/api").fetchAgentTrace as jest.Mock;
const listAgentArtifactsMock = jest.requireMock("@/lib/api").listAgentArtifacts as jest.Mock;
const listAgentTracesMock = jest.requireMock("@/lib/api").listAgentTraces as jest.Mock;
const shareAgentArtifactMock = jest.requireMock("@/lib/api").shareAgentArtifact as jest.Mock;
const shareAgentTraceMock = jest.requireMock("@/lib/api").shareAgentTrace as jest.Mock;
const toastErrorMock = jest.requireMock("sonner").toast.error as jest.Mock;
const toastMessageMock = jest.requireMock("sonner").toast.message as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  fetchAgentDiagnosticsMock.mockResolvedValue({
    response: { ok: true },
    data: {
      agentBackendEnabled: true,
      upstreamReady: { ok: true, latencyMs: 24 },
      upstreamHealth: { ok: true, latencyMs: 20 },
      upstreamControlPlane: { extension_ws_enabled: true },
    },
  });
  fetchAgentExtensionDiagnosticsMock.mockResolvedValue({
    response: { ok: true },
    data: {
      user_id: "42",
      paired: true,
      connected_at_unix: 1770000000,
      last_command_tool: "extension_navigate",
      last_command_result: "ok",
    },
  });
  fetchContextDiagnosticsMock.mockResolvedValue({
    response: { ok: true },
    data: { active: false, reason: "no_active_session" },
  });
  fetchMemoryDoctorMock.mockResolvedValue({
    response: { ok: true },
    data: { active: false, reason: "no_active_session" },
  });
  listAgentArtifactsMock.mockResolvedValue({
    response: { ok: true },
    data: { artifacts: [] },
  });
  exportAgentArtifactMock.mockResolvedValue({
    response: { ok: true },
    data: { url: "/api/agent/exports/artifact.pdf" },
  });
  downloadAgentExportFileMock.mockResolvedValue({
    filename: "artifact.pdf",
    bytes: 12,
  });
  fetchAgentTraceMock.mockResolvedValue({
    response: { ok: true },
    data: { run_id: "run-1", events: [] },
  });
  listAgentTracesMock.mockResolvedValue({
    response: { ok: true },
    data: { traces: [] },
  });
  shareAgentArtifactMock.mockResolvedValue({
    response: { ok: true },
    data: { id: "artifact-1", public_url: "https://share.local/a" },
  });
  shareAgentTraceMock.mockResolvedValue({
    response: { ok: true },
    data: { run_id: "run-1", public_url: "https://share.local/t" },
  });
});

describe("PowerUserSheet", () => {
  it("opens on Controls tab by default and keeps controls visible", () => {
    render(<PowerUserSheet isOpen onClose={() => {}} />);
    expect(screen.getByTestId("power-user-tab-controls")).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByTestId("power-user-controls")).toBeInTheDocument();
  });

  it("keeps mode controls interactive even when runtime state is not yet loaded", () => {
    const onModeChange = jest.fn();
    render(
      <PowerUserSheet
        isOpen
        onClose={() => {}}
        activeMode={null}
        onModeChange={onModeChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "zakiControls.modes.plan" }));
    expect(onModeChange).toHaveBeenCalledWith("plan");
  });

  it("renders a badge count when approvals are pending", () => {
    const pending: NullalisApprovalRequest[] = [
      { id: "a1", tool: "send_email", reason: "Needs your ok", riskLevel: "high", timestamp: 1 },
      { id: "a2", tool: "delete", reason: "Destructive", riskLevel: "critical", timestamp: 2 },
    ];
    render(<PowerUserSheet isOpen onClose={() => {}} pendingApprovals={pending} />);
    const tab = screen.getByTestId("power-user-tab-approvals");
    expect(tab.textContent).toContain("2");
    fireEvent.click(tab);
    expect(screen.getAllByTestId("power-user-approval-item")).toHaveLength(2);
  });

  it("switches to Context and Memory tabs on click", async () => {
    render(<PowerUserSheet isOpen onClose={() => {}} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("power-user-tab-context"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("power-user-context")).toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("power-user-tab-memory"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("power-user-memory")).toBeInTheDocument();
    });
  });

  it("renders the browser surface from Agent diagnostics", async () => {
    await act(async () => {
      render(<PowerUserSheet isOpen onClose={() => {}} initialTab="browser" />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("power-user-browser")).toBeInTheDocument();
      expect(screen.getByText("App browser")).toBeInTheDocument();
      expect(screen.getByText("User browser extension")).toBeInTheDocument();
      expect(screen.getByText("Paired")).toBeInTheDocument();
      expect(screen.getByText("ok · extension_navigate")).toBeInTheDocument();
      expect(screen.getByText("extension_navigate")).toBeInTheDocument();
    });
    expect(screen.getByText("extension_list_tabs")).toBeInTheDocument();
    expect(fetchAgentDiagnosticsMock).toHaveBeenCalled();
    expect(fetchAgentExtensionDiagnosticsMock).toHaveBeenCalled();
  });

  it("lists session artifacts and can request a share", async () => {
    listAgentArtifactsMock.mockResolvedValueOnce({
      response: { ok: true },
      data: {
        artifacts: [
          {
            id: "artifact-1",
            title: "Launch brief",
            type: "markdown",
            version: 3,
            updated_at: "2026-05-25T10:00:00Z",
          },
        ],
      },
    });
    await act(async () => {
      render(
        <PowerUserSheet
          isOpen
          onClose={() => {}}
          initialTab="artifacts"
          activeSessionKey="agent:zaki:user:test:thread:main"
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Launch brief")).toBeInTheDocument();
    });
    expect(listAgentArtifactsMock).toHaveBeenCalledWith({
      limit: 20,
      session_key: "agent:zaki:user:test:thread:main",
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("power-user-artifact-share-artifact-1"));
    });
    await waitFor(() => {
      expect(shareAgentArtifactMock).toHaveBeenCalledWith("artifact-1");
    });
  });

  it("supports camelCase artifact ids from upstream payloads", async () => {
    listAgentArtifactsMock.mockResolvedValueOnce({
      response: { ok: true },
      data: {
        artifacts: [
          {
            artifactId: "artifact-camel",
            title: "Camel artifact",
            type: "markdown",
            version: 1,
          },
        ],
      },
    });

    await act(async () => {
      render(<PowerUserSheet isOpen onClose={() => {}} initialTab="artifacts" />);
    });

    await waitFor(() => {
      expect(screen.getByText("Camel artifact")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("power-user-artifact-share-artifact-camel"));
    });

    await waitFor(() => {
      expect(shareAgentArtifactMock).toHaveBeenCalledWith("artifact-camel");
    });
  });

  it("does not treat private artifact export urls as public share links", async () => {
    listAgentArtifactsMock.mockResolvedValueOnce({
      response: { ok: true },
      data: {
        artifacts: [
          {
            id: "artifact-private",
            title: "Private preview",
            type: "markdown",
            version: 1,
            url: "https://download.local/private-preview",
          },
        ],
      },
    });

    await act(async () => {
      render(<PowerUserSheet isOpen onClose={() => {}} initialTab="artifacts" />);
    });

    await waitFor(() => {
      expect(screen.getByText("Private preview")).toBeInTheDocument();
    });
    expect(
      screen.queryByLabelText("zakiControls.powerUser.artifacts.openShared")
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("power-user-artifact-revoke-artifact-private")
    ).toBeDisabled();

    await act(async () => {
      fireEvent.click(screen.getByTestId("power-user-artifact-export-pdf-artifact-private"));
    });
    await waitFor(() => {
      expect(exportAgentArtifactMock).toHaveBeenCalledWith("artifact-private", "pdf");
      expect(downloadAgentExportFileMock).toHaveBeenCalledWith(
        "/api/agent/exports/artifact.pdf",
        "Private_preview.pdf"
      );
      expect(screen.getByTestId("power-user-artifact-download-pdf-artifact-private")).toBeInTheDocument();
    });
  });

  it("rewrites upstream artifact export downloads through the ZAKI BFF bridge", async () => {
    exportAgentArtifactMock.mockResolvedValueOnce({
      response: { ok: true },
      data: { download_url: "/api/v1/users/42/exports/report.pdf" },
    });
    listAgentArtifactsMock.mockResolvedValueOnce({
      response: { ok: true },
      data: {
        artifacts: [
          {
            id: "artifact-report",
            title: "Research report",
            type: "markdown",
            version: 1,
          },
        ],
      },
    });

    await act(async () => {
      render(<PowerUserSheet isOpen onClose={() => {}} initialTab="artifacts" />);
    });

    await waitFor(() => {
      expect(screen.getByText("Research report")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("power-user-artifact-export-pdf-artifact-report"));
    });

    await waitFor(() => {
      expect(downloadAgentExportFileMock).toHaveBeenCalledWith(
        "/api/agent/exports/report.pdf",
        "Research_report.pdf"
      );
      expect(screen.getByTestId("power-user-artifact-download-pdf-artifact-report")).toBeInTheDocument();
    });
  });

  it("keeps artifact export retryable when the backend omits a download URL", async () => {
    exportAgentArtifactMock.mockResolvedValueOnce({
      response: { ok: true },
      data: { ok: true },
    });
    listAgentArtifactsMock.mockResolvedValueOnce({
      response: { ok: true },
      data: {
        artifacts: [
          {
            id: "artifact-no-url",
            title: "Missing URL",
            type: "markdown",
            version: 1,
          },
        ],
      },
    });

    await act(async () => {
      render(<PowerUserSheet isOpen onClose={() => {}} initialTab="artifacts" />);
    });

    await waitFor(() => {
      expect(screen.getByText("Missing URL")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("power-user-artifact-export-pdf-artifact-no-url"));
    });

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        "zakiControls.powerUser.artifacts.exportFailed"
      );
    });
  });

  it("surfaces parked artifact export as an unavailable action", async () => {
    exportAgentArtifactMock.mockResolvedValueOnce({
      response: { ok: false, status: 501 },
      data: { error: "export_not_yet_available" },
    });
    listAgentArtifactsMock.mockResolvedValueOnce({
      response: { ok: true },
      data: {
        artifacts: [
          {
            id: "artifact-export-parked",
            title: "Export parked",
            type: "markdown",
            version: 1,
          },
        ],
      },
    });

    await act(async () => {
      render(<PowerUserSheet isOpen onClose={() => {}} initialTab="artifacts" />);
    });

    await waitFor(() => {
      expect(screen.getByText("Export parked")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("power-user-artifact-export-pdf-artifact-export-parked"));
    });

    await waitFor(() => {
      expect(exportAgentArtifactMock).toHaveBeenCalledWith("artifact-export-parked", "pdf");
      expect(toastMessageMock).toHaveBeenCalledWith(
        "zakiControls.powerUser.artifacts.exportNotAvailable"
      );
    });
  });

  it("lists traces and can request a sanitized share", async () => {
    listAgentTracesMock.mockResolvedValueOnce({
      response: { ok: true },
      data: {
        traces: [
          {
            run_id: "run-1",
            status: "succeeded",
            started_at: "2026-05-25T10:00:00Z",
            events: [{ type: "tool_start" }, { type: "done" }],
          },
        ],
      },
    });
    await act(async () => {
      render(<PowerUserSheet isOpen onClose={() => {}} initialTab="trace" />);
    });

    await waitFor(() => {
      expect(screen.getByText("run-1")).toBeInTheDocument();
    });
    expect(screen.getByText("2 events")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId("power-user-trace-share-run-1"));
    });
    await waitFor(() => {
      expect(shareAgentTraceMock).toHaveBeenCalledWith("run-1");
    });
  });

  it("opens trace details from the runtime trace endpoint", async () => {
    listAgentTracesMock.mockResolvedValueOnce({
      response: { ok: true },
      data: {
        traces: [
          {
            run_id: "run-detail",
            status: "completed",
            started_at: "2026-05-25T10:00:00Z",
          },
        ],
      },
    });
    fetchAgentTraceMock.mockResolvedValueOnce({
      response: { ok: true },
      data: {
        run_id: "run-detail",
        events: [
          {
            type: "tool_start",
            message: "Opening browser lane",
            timestamp: "2026-05-25T10:00:02Z",
          },
        ],
      },
    });

    await act(async () => {
      render(<PowerUserSheet isOpen onClose={() => {}} initialTab="trace" />);
    });

    await waitFor(() => {
      expect(screen.getByText("run-detail")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("power-user-trace-details-run-detail"));
    });

    await waitFor(() => {
      expect(fetchAgentTraceMock).toHaveBeenCalledWith("run-detail");
      expect(screen.getByTestId("power-user-trace-detail")).toHaveTextContent("tool_start");
      expect(screen.getByText("Opening browser lane")).toBeInTheDocument();
    });
  });

  it("invokes onApproveRequest with true when Approve is clicked", async () => {
    const onApprove = jest.fn<(id: string, approved: boolean) => Promise<void>>();
    onApprove.mockResolvedValue(undefined);
    const pending: NullalisApprovalRequest[] = [
      { id: "req-1", tool: "send_email", reason: "ok?", riskLevel: "high", timestamp: 1 },
    ];
    render(
      <PowerUserSheet
        isOpen
        onClose={() => {}}
        pendingApprovals={pending}
        onApproveRequest={onApprove}
      />
    );
    fireEvent.click(screen.getByTestId("power-user-tab-approvals"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("power-user-approval-approve-req-1"));
    });
    await waitFor(() => {
      expect(onApprove).toHaveBeenCalledWith("req-1", true);
    });
  });

  it("invokes onApproveRequest with false when Deny is clicked", async () => {
    const onApprove = jest.fn<(id: string, approved: boolean) => Promise<void>>();
    onApprove.mockResolvedValue(undefined);
    const pending: NullalisApprovalRequest[] = [
      { id: "req-1", tool: "send_email", reason: "ok?", riskLevel: "high", timestamp: 1 },
    ];
    render(
      <PowerUserSheet
        isOpen
        onClose={() => {}}
        pendingApprovals={pending}
        onApproveRequest={onApprove}
      />
    );
    fireEvent.click(screen.getByTestId("power-user-tab-approvals"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("power-user-approval-deny-req-1"));
    });
    await waitFor(() => {
      expect(onApprove).toHaveBeenCalledWith("req-1", false);
    });
  });

  it("renders context diagnostics empty state when no active session", async () => {
    await act(async () => {
      render(
        <PowerUserSheet isOpen onClose={() => {}} initialTab="context" />
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId("power-user-context")).toHaveAttribute(
        "data-state",
        "inactive"
      );
    });
    expect(
      screen.getByText(/Start a conversation to see context diagnostics/i)
    ).toBeInTheDocument();
  });

  it("renders real context diagnostics report from BFF", async () => {
    fetchContextDiagnosticsMock.mockResolvedValueOnce({
      response: { ok: true },
      data: {
        active: true,
        report: {
          model: "moonshotai/Kimi-K2.5",
          history_messages: 43,
          token_estimate: 12430,
          context_window_tokens: 128000,
          context_pressure_percent: 9.7,
          history_trim_limit_messages: 80,
          token_compaction_threshold: 96000,
          token_compaction_triggered: false,
          tools: 14,
          roles: { system: 1, user: 10, assistant: 20, tool: 12 },
          memory: { hot: 5, warm: 12, cold: 40 },
        },
      },
    });
    await act(async () => {
      render(
        <PowerUserSheet isOpen onClose={() => {}} initialTab="context" />
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId("power-user-context")).toBeInTheDocument();
      expect(screen.getByText("moonshotai/Kimi-K2.5")).toBeInTheDocument();
    });
    expect(screen.getByText(/10%/)).toBeInTheDocument();
    expect(
      screen.getByTestId("power-user-context-section-memory")
    ).toBeInTheDocument();
  });

  it("renders memory report text when backend returns it", async () => {
    fetchMemoryDoctorMock.mockResolvedValueOnce({
      response: { ok: true },
      data: {
        active: true,
        runtime: true,
        report_text: "Memory Doctor Report\n====================\nStatus: OK\n",
      },
    });
    await act(async () => {
      render(
        <PowerUserSheet
          isOpen
          onClose={() => {}}
          initialTab="memory"
        />
      );
    });
    await waitFor(() => {
      expect(
        screen.getByTestId("power-user-memory-report")
      ).toHaveTextContent(/Memory Doctor Report/);
    });
  });

  it("derives soft-limit state at 70% (warning) and 90% (near_limit)", () => {
    expect(deriveSoftLimitState(0, 10, false)).toBe("normal");
    expect(deriveSoftLimitState(7, 10, false)).toBe("warning");
    expect(deriveSoftLimitState(9, 10, false)).toBe("near_limit");
    expect(deriveSoftLimitState(10, 10, false)).toBe("near_limit");
    expect(deriveSoftLimitState(100, null, true)).toBe("unlimited");
  });

  it("fetches usage quota when Usage tab is shown and marks near-limit state", async () => {
    fetchUsageQuotaMock.mockImplementation((surface: string) => {
      if (surface === "app_chat") {
        return Promise.resolve({
          response: { ok: true },
          data: { unlimited: false, limit: 10, used: 9, remaining: 1, resetAt: "2026-04-19T00:00:00Z" },
        });
      }
      return Promise.resolve({
        response: { ok: true },
        data: { unlimited: false, limit: 10, used: 2, remaining: 8, resetAt: "2026-04-19T00:00:00Z" },
      });
    });
    await act(async () => {
      render(<PowerUserSheet isOpen onClose={() => {}} initialTab="usage" />);
    });
    await waitFor(() => {
      expect(
        screen.getByTestId("power-user-usage-surface-app_chat")
      ).toHaveAttribute("data-soft-limit-state", "near_limit");
    });
    expect(
      screen.getByTestId("power-user-usage-surface-zaki_bot")
    ).toHaveAttribute("data-soft-limit-state", "normal");
  });
});
