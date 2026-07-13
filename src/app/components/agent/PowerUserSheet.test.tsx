import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PowerUserSheet, deriveSoftLimitState } from "./PowerUserSheet";
import type { NullalisApprovalRequest } from "@/app/components/chat/BotStatusRail";

jest.mock("@/queries/useBilling", () => ({
  useMeterStatus: jest.fn(() => ({ data: null, isLoading: false })),
}));

jest.mock("@/lib/api", () => ({
  downloadAgentExportFile: jest.fn(),
  exportAgentArtifact: jest.fn(),
  fetchAgentExtensionDiagnostics: jest.fn(),
  fetchAgentSessionContext: jest.fn(),
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
    "zakiControls.powerUser.context.sections.compaction": "Compaction policy",
    "zakiControls.powerUser.context.windowSource": "Window source",
    "zakiControls.powerUser.context.remainingTokens": "Remaining tokens",
    "zakiControls.powerUser.context.compactionRecommended": "recommended",
    "zakiControls.powerUser.context.compactionNormal": "normal",
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
  if (key === "zakiControls.powerUser.usage.unlimited") {
    return "Unlimited";
  }
  if (key === "zakiControls.powerUser.usage.weeklyPercent") {
    return `${String(options?.percent ?? "")}% of your weekly usage`;
  }
  if (key === "zakiControls.powerUser.usage.usedThisWeek") {
    return "Used this week";
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
const useMeterStatusMock = jest.requireMock("@/queries/useBilling")
  .useMeterStatus as jest.Mock;
const fetchAgentDiagnosticsMock = jest.requireMock("@/lib/api")
  .fetchAgentDiagnostics as jest.Mock;
const fetchAgentExtensionDiagnosticsMock = jest.requireMock("@/lib/api")
  .fetchAgentExtensionDiagnostics as jest.Mock;
const fetchAgentSessionContextMock = jest.requireMock("@/lib/api")
  .fetchAgentSessionContext as jest.Mock;
const fetchContextDiagnosticsMock = jest.requireMock("@/lib/api")
  .fetchContextDiagnostics as jest.Mock;
const fetchMemoryDoctorMock = jest.requireMock("@/lib/api")
  .fetchMemoryDoctor as jest.Mock;
const exportAgentArtifactMock = jest.requireMock("@/lib/api").exportAgentArtifact as jest.Mock;
const fetchAgentTraceMock = jest.requireMock("@/lib/api").fetchAgentTrace as jest.Mock;
const listAgentArtifactsMock = jest.requireMock("@/lib/api").listAgentArtifacts as jest.Mock;
const listAgentTracesMock = jest.requireMock("@/lib/api").listAgentTraces as jest.Mock;
const shareAgentArtifactMock = jest.requireMock("@/lib/api").shareAgentArtifact as jest.Mock;
const shareAgentTraceMock = jest.requireMock("@/lib/api").shareAgentTrace as jest.Mock;

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
  fetchAgentSessionContextMock.mockResolvedValue({
    response: { ok: true },
    data: {
      active: true,
      report: {
        model: "moonshot/kimi-k2.6",
        history_messages: 0,
        token_estimate: 0,
        context_window_tokens: 262144,
        pressure_percent: 0,
        context_pressure_percent: 0,
      },
    },
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

  it("does not treat private artifact export urls as public share links or expose parked exports", async () => {
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
    expect(
      screen.queryByTestId("power-user-artifact-export-pdf-artifact-private")
    ).not.toBeInTheDocument();
    expect(exportAgentArtifactMock).not.toHaveBeenCalled();
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

  it("loads context diagnostics from the active session context endpoint when a session key is available", async () => {
    fetchAgentSessionContextMock.mockResolvedValueOnce({
      response: { ok: true },
      data: {
        active: true,
        session_key: "agent:zaki-bot:user:42:thread:main",
        status: "live",
        model: "openai/gpt-5.2",
        token_estimate: 6400,
        context_window_tokens: 128000,
        pressure_percent: 5,
        context_pressure_percent: 5,
        pressure_token_source: "provider_last_usage",
        local_token_estimate: 5900,
        provider_prompt_tokens: 6400,
        provider_cached_prompt_tokens: 5100,
        provider_usage_last_turn: {
          prompt_tokens: 6400,
          cached_prompt_tokens: 5100,
          cache_hit_percent: 80,
        },
        remaining_tokens: 121600,
        context_window_source: "model_capability",
        token_compaction_recommended: false,
        compaction: {
          nudge_percent: 50,
          pass_a_percent: 70,
          pass_c_percent: 90,
          recommended: false,
        },
      },
    });

    await act(async () => {
      render(
        <PowerUserSheet
          isOpen
          onClose={() => {}}
          initialTab="context"
          activeSessionKey="agent:zaki-bot:user:42:thread:main"
        />
      );
    });

    await waitFor(() => {
      expect(fetchAgentSessionContextMock).toHaveBeenCalledWith(
        "agent:zaki-bot:user:42:thread:main"
      );
      expect(screen.getByText("openai/gpt-5.2")).toBeInTheDocument();
    });
    expect(fetchContextDiagnosticsMock).not.toHaveBeenCalled();
    expect(screen.getByText(/5%/)).toBeInTheDocument();
    expect(screen.getByText("model_capability")).toBeInTheDocument();
    expect(screen.getByTestId("power-user-context-pressure-source")).toHaveTextContent(
      "provider_last_usage"
    );
    expect(screen.getByText("6,400")).toBeInTheDocument();
    expect(screen.getByText("5,100 (80%)")).toBeInTheDocument();
    expect(screen.getByText("5,900")).toBeInTheDocument();
    expect(
      screen.getByTestId("power-user-context-section-compaction-policy")
    ).toBeInTheDocument();
  });

  it("preserves unavailable active-session context envelopes as inactive", async () => {
    fetchAgentSessionContextMock.mockResolvedValueOnce({
      response: { ok: true },
      data: {
        active: false,
        live: false,
        code: "session_manager_unavailable",
        reason: "Live session manager is not available.",
      },
    });

    await act(async () => {
      render(
        <PowerUserSheet
          isOpen
          onClose={() => {}}
          initialTab="context"
          activeSessionKey="agent:zaki-bot:user:42:thread:main"
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("power-user-context")).toHaveAttribute(
        "data-state",
        "inactive"
      );
    });
    expect(fetchContextDiagnosticsMock).not.toHaveBeenCalled();
    expect(
      screen.getByText(/No context diagnostics available \(session_manager_unavailable\)/i)
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

  it("derives soft-limit state on the shared 80/100 model", () => {
    expect(deriveSoftLimitState(0, 10, false)).toBe("normal");
    expect(deriveSoftLimitState(7, 10, false)).toBe("normal"); // 70% no longer warns
    expect(deriveSoftLimitState(8, 10, false)).toBe("warning"); // 80% near-cap
    expect(deriveSoftLimitState(9, 10, false)).toBe("warning");
    expect(deriveSoftLimitState(10, 10, false)).toBe("near_limit"); // 100% at cap
    expect(deriveSoftLimitState(100, null, true)).toBe("unlimited");
  });

  it("reads per-product usage from the unified meter and flags near-cap on the 80/100 model", async () => {
    // Usage is one shared pool: the cap is meterStatus.weekly.limit; each product carries only its
    // `used` contribution. Rows show each product's SHARE of the pooled limit.
    useMeterStatusMock.mockReturnValue({
      data: {
        data: {
          weekly: { limit: 100, used: 205, remaining: 0, resetAt: "2026-04-19T00:00:00Z" },
          products: {
            spaces: { weekly: { used: 85 } },
            agent: { weekly: { used: 20 } },
            learning: { weekly: { used: 100 } },
          },
        },
      },
      isLoading: false,
    });
    await act(async () => {
      render(<PowerUserSheet isOpen onClose={() => {}} initialTab="usage" />);
    });
    // Share of the pooled limit (100): spaces 85% -> warning, agent 20% -> normal, learning 100% -> near_limit.
    await waitFor(() => {
      expect(
        screen.getByTestId("power-user-usage-surface-spaces")
      ).toHaveAttribute("data-soft-limit-state", "warning");
    });
    expect(
      screen.getByTestId("power-user-usage-surface-agent")
    ).toHaveAttribute("data-soft-limit-state", "normal");
    expect(
      screen.getByTestId("power-user-usage-surface-learning")
    ).toHaveAttribute("data-soft-limit-state", "near_limit");
    // No longer reads the legacy per-surface quota endpoint.
    expect(fetchUsageQuotaMock).not.toHaveBeenCalled();
  });
});
