import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AgentInspectorRail, type AgentInspectorRailProps } from "./AgentInspectorRail";

jest.mock("@/lib/api", () => ({
  createAgentCron: jest.fn(),
  deleteAgentCron: jest.fn(),
  downloadAgentExportFile: jest.fn(),
  exportAgentArtifact: jest.fn(),
  fetchAgentSessionPlan: jest.fn(),
  fetchAgentSessionTodos: jest.fn(),
  fetchAgentTask: jest.fn(),
  fetchAgentTrace: jest.fn(),
  listAgentTraces: jest.fn(),
  normalizeAgentArtifactShareUrl: (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null,
  normalizeAgentExportDownloadUrl: (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null,
  revokeAgentArtifactShare: jest.fn(),
  revokeAgentTraceShare: jest.fn(),
  shareAgentArtifact: jest.fn(),
  shareAgentTrace: jest.fn(),
  stopAgentTask: jest.fn(),
  updateAgentSessionTodoItem: jest.fn(),
  updateAgentCron: jest.fn(),
}));

const createAgentCronMock = jest.requireMock("@/lib/api").createAgentCron as jest.Mock;
const exportAgentArtifactMock = jest.requireMock("@/lib/api").exportAgentArtifact as jest.Mock;
const downloadAgentExportFileMock = jest.requireMock("@/lib/api").downloadAgentExportFile as jest.Mock;
const fetchAgentSessionPlanMock = jest.requireMock("@/lib/api").fetchAgentSessionPlan as jest.Mock;
const fetchAgentSessionTodosMock = jest.requireMock("@/lib/api").fetchAgentSessionTodos as jest.Mock;
const fetchAgentTaskMock = jest.requireMock("@/lib/api").fetchAgentTask as jest.Mock;
const fetchAgentTraceMock = jest.requireMock("@/lib/api").fetchAgentTrace as jest.Mock;
const listAgentTracesMock = jest.requireMock("@/lib/api").listAgentTraces as jest.Mock;
const revokeAgentArtifactShareMock = jest.requireMock("@/lib/api").revokeAgentArtifactShare as jest.Mock;
const revokeAgentTraceShareMock = jest.requireMock("@/lib/api").revokeAgentTraceShare as jest.Mock;
const shareAgentArtifactMock = jest.requireMock("@/lib/api").shareAgentArtifact as jest.Mock;
const shareAgentTraceMock = jest.requireMock("@/lib/api").shareAgentTrace as jest.Mock;
const updateAgentSessionTodoItemMock = jest.requireMock("@/lib/api").updateAgentSessionTodoItem as jest.Mock;

function renderRail(overrides: Partial<AgentInspectorRailProps> = {}) {
  const props: AgentInspectorRailProps = {
    mode: "execute",
    isStreaming: false,
    lastChannel: null,
    sandbox: null,
    tasks: [],
    transcriptEntries: [],
    narrationFrame: null,
    approvalRequest: null,
    contextGaugeData: null,
    usageSummary: null,
    ...overrides,
  };

  return render(<AgentInspectorRail {...props} />);
}

describe("AgentInspectorRail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    exportAgentArtifactMock.mockResolvedValue({
      response: { ok: true },
      data: { download_url: "/api/agent/exports/artifact.docx" },
    });
    downloadAgentExportFileMock.mockResolvedValue({
      filename: "artifact.docx",
      bytes: 12,
    });
    listAgentTracesMock.mockResolvedValue({
      response: { ok: true },
      data: { traces: [] },
    });
    fetchAgentTraceMock.mockResolvedValue({
      response: { ok: true },
      data: { run_id: "run-detail", events: [{ type: "tool_start", summary: "Read file" }] },
    });
    shareAgentArtifactMock.mockResolvedValue({
      response: { ok: true },
      data: { public_url: "https://share.local/artifact" },
    });
    revokeAgentArtifactShareMock.mockResolvedValue({
      response: { ok: true },
      data: { ok: true },
    });
    shareAgentTraceMock.mockResolvedValue({
      response: { ok: true },
      data: { run_id: "run-1", share_url: "https://share.local/trace" },
    });
    revokeAgentTraceShareMock.mockResolvedValue({
      response: { ok: true },
      data: { ok: true },
    });
    fetchAgentTaskMock.mockResolvedValue({
      response: { ok: true },
      data: { id: "task-1", session_key: "session", started_at: 1_800_000 },
    });
    fetchAgentSessionTodosMock.mockResolvedValue({
      response: { ok: true },
      data: { session_key: "session", current_list_id: null, lists: [] },
    });
    fetchAgentSessionPlanMock.mockResolvedValue({
      response: { ok: true },
      data: { session_key: "session", active: false, plan: null },
    });
    updateAgentSessionTodoItemMock.mockResolvedValue({
      response: { ok: true },
      data: { session_key: "session", current_list_id: null, list: null },
    });
    createAgentCronMock.mockResolvedValue({
      response: { ok: true },
      data: { job: { id: "cron-new" } },
    });
  });

  it("renders the V6 execution rail as six MECE tabs", () => {
    const onClose = jest.fn();
    renderRail({
      onClose,
      tasks: [
        {
          taskId: "task-1",
          status: "running",
          description: "Map the agent surface",
          progressPct: 40,
          updatedAt: 1,
        },
      ],
    });

    const tablist = screen.getByRole("tablist", { name: "Agent panels" });
    expect(within(tablist).getAllByRole("tab")).toHaveLength(6);
    for (const label of ["Plan", "Cron", "Evidence", "Artifacts", "Browser", "Trace"]) {
      expect(within(tablist).getByRole("tab", { name: new RegExp(label, "i") })).toBeInTheDocument();
    }
    expect(within(tablist).getByRole("tab", { name: /Plan/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    fireEvent.click(screen.getByRole("button", { name: "Hide right agent panel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("Map the agent surface").length).toBeGreaterThan(0);
  });

  it("renders a live narration box from Nullalis operational events", () => {
    renderRail({
      isStreaming: true,
      narrationFrame: {
        id: "frame-1",
        phase: "tool_start",
        label: "Reading the agent handoff",
        tool: "read_file",
        durationMs: 42,
        timestamp: 1_800_000,
      },
      transcriptEntries: [
        {
          id: "trace-1",
          kind: "tool",
          tool: "read_file",
          text: "Read docs/ui-handoff.md",
          resultSummary: "Read docs/ui-handoff.md",
          resultState: "done",
          durationMs: 42,
          timestamp: 1_800_000,
        },
      ],
    });

    fireEvent.click(screen.getByRole("tab", { name: /Plan/i }));
    const narration = screen.getByTestId("agent-narration-box");
    expect(within(narration).getByText("Reading the agent handoff")).toBeInTheDocument();
    expect(within(narration).getByText(/tool start/i)).toBeInTheDocument();
    expect(within(narration).getAllByText(/read_file/).length).toBeGreaterThan(0);
    expect(within(narration).getByText(/Read docs\/ui-handoff\.md/)).toBeInTheDocument();
  });

  it("renders checklist, run plan, and compact trace diagnostics in the Plan tab", async () => {
    fetchAgentSessionTodosMock.mockResolvedValueOnce({
      response: { ok: true },
      data: {
        session_key: "agent:zaki-bot:user:42:thread:main",
        current_list_id: "list-a",
        lists: [
          {
            list_id: "list-a",
            title: "Work panel",
            items: [
              { id: 1, title: "Wire todo endpoint", status: "completed" },
              { id: 2, title: "Render checklist", status: "in_progress" },
            ],
          },
        ],
      },
    });
    fetchAgentSessionPlanMock.mockResolvedValueOnce({
      response: { ok: true },
      data: {
        session_key: "agent:zaki-bot:user:42:thread:main",
        active: true,
        plan: {
          schema: "nullalis.task_plan.v1",
          plan_id: "plan-1",
          run_id: "run-1",
          summary: "Ship the right rail work panel",
          status: "active",
          current_step: 0,
          revision: 2,
          steps: [
            {
              index: 0,
              id: "step-1",
              title: "Render run plan",
              description: "Render run plan",
              status: "running",
              expected_tool: "browser_navigate",
              actual_tool: "browser_snapshot",
              result_summary: "Snapshot loaded",
            },
          ],
        },
      },
    });

    renderRail({
      sessionKey: "agent:zaki-bot:user:42:thread:main",
      contextReport: {
        last_turn_delta: { tool_mode: "native_tool_calls" },
        last_turn: {
          native_tool_call_count: 3,
          xml_fallback_call_count: 1,
          bounded_result_count: 2,
        },
        provider_prompt_tokens: 1234,
        provider_cached_prompt_tokens: 456,
      },
    });

    await waitFor(() => {
      expect(screen.getByText("Wire todo endpoint")).toBeInTheDocument();
    });

    expect(screen.getByTestId("agent-work-checklist")).toHaveTextContent("1/2 done");
    expect(screen.getByText("Render checklist")).toBeInTheDocument();
    expect(screen.getByTestId("agent-run-plan")).toHaveTextContent("Ship the right rail work panel");
    expect(screen.getByTestId("agent-run-plan")).toHaveTextContent("browser_navigate");
    expect(screen.getByTestId("agent-run-plan")).toHaveTextContent("browser_snapshot");
    expect(screen.getByTestId("agent-work-trace-strip")).toHaveTextContent("native_tool_calls");
    expect(screen.getByTestId("agent-work-trace-strip")).toHaveTextContent("3 / 1");
    expect(screen.getByTestId("agent-work-trace-strip")).toHaveTextContent("2");
  });

  it("honors external tab requests from status strip and inline source links", async () => {
    const { rerender } = renderRail({
      tabRequest: { tab: "trace", id: 1 },
      transcriptEntries: [
        {
          id: "trace-1",
          kind: "tool",
          tool: "read_file",
          text: "Read docs/ui-handoff.md",
          resultSummary: "Read docs/ui-handoff.md",
          resultState: "done",
          durationMs: 42,
          timestamp: 1_800_000,
        },
      ],
    });

    expect(screen.getByRole("tab", { name: /Trace/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await waitFor(() => expect(listAgentTracesMock).toHaveBeenCalled());

    rerender(
      <AgentInspectorRail
        mode="execute"
        isStreaming={false}
        lastChannel={null}
        sandbox={null}
        tasks={[]}
        transcriptEntries={[]}
        narrationFrame={null}
        approvalRequest={null}
        contextGaugeData={null}
        usageSummary={null}
        tabRequest={{ tab: "evidence", id: 2 }}
      />
    );

    expect(screen.getByRole("tab", { name: /Evidence/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("surfaces memory and context evidence in the Evidence tab", () => {
    const onOpenMemory = jest.fn();
    renderRail({
      onOpenMemory,
      transcriptEntries: [
        {
          id: "memory-1",
          kind: "tool",
          intent: "memory",
          text: "Fetched durable graph memory for this user.",
          timestamp: 1,
        },
      ],
      contextGaugeData: {
        tokenCount: 2_000,
        contextMax: 8_000,
      },
    });

    fireEvent.click(screen.getByRole("tab", { name: /Evidence/i }));

    expect(screen.getByText("context source")).toBeInTheDocument();
    expect(screen.getByText("-- pressure")).toBeInTheDocument();
    expect(screen.getByText("Fetched durable graph memory for this user.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open memory graph" }));
    expect(onOpenMemory).toHaveBeenCalledTimes(1);
  });

  it("surfaces web and file evidence in the Evidence tab", () => {
    renderRail({
      transcriptEntries: [
        {
          id: "web-1",
          kind: "tool",
          tool: "web_search",
          text: "Searched https://example.com/agent-market for the latest market data.",
          resultSummary: "Used https://example.com/agent-market as a web source.",
          resultState: "done",
          timestamp: 2,
        },
        {
          id: "file-1",
          kind: "tool",
          tool: "read_file",
          text: "Read the UI handoff.",
          resultSummary: "Read docs/ui-handoff.md",
          resultState: "done",
          files: ["docs/ui-handoff.md"],
          timestamp: 1,
        },
      ],
    });

    fireEvent.click(screen.getByRole("tab", { name: /Evidence/i }));

    expect(screen.getByText(/web source/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open source" })).toHaveAttribute(
      "href",
      "https://example.com/agent-market"
    );
    expect(screen.getByText("docs/ui-handoff.md")).toBeInTheDocument();
    expect(screen.getByText(/\[2\] · file/i)).toBeInTheDocument();
  });

  it("routes browser control-plane links to canonical settings sections", () => {
    const onOpenSettings = jest.fn();
    renderRail({ onOpenSettings });

    fireEvent.click(screen.getByRole("tab", { name: /Browser/i }));

    const links = screen.getByTestId("agent-settings-deep-links");
    for (const label of ["Agent", "Channels", "Secrets", "Providers", "Devices", "Developer"]) {
      expect(within(links).getByRole("button", { name: new RegExp(label, "i") })).toBeInTheDocument();
    }

    fireEvent.click(within(links).getByRole("button", { name: "Open Agent settings" }));
    fireEvent.click(within(links).getByRole("button", { name: "Open Channels settings" }));
    fireEvent.click(within(links).getByRole("button", { name: "Open Devices settings" }));
    fireEvent.click(within(links).getByRole("button", { name: "Open Developer Access settings" }));

    expect(onOpenSettings).toHaveBeenNthCalledWith(1, "agent");
    expect(onOpenSettings).toHaveBeenNthCalledWith(2, "channels");
    expect(onOpenSettings).toHaveBeenNthCalledWith(3, "devices");
    expect(onOpenSettings).toHaveBeenNthCalledWith(4, "developer-access");
  });

  it("separates provisional artifact activity in the right panel", () => {
    renderRail({
      artifactCount: 1,
      transcriptEntries: [
        {
          id: "artifact-1",
          kind: "tool",
          intent: "file",
          phase: "artifact_event",
          tool: "artifact",
          text: "Artifact created: launch brief",
          timestamp: 1,
          files: ["launch-brief.md"],
        },
      ],
    });

    expect(screen.getByText(/artifacts ·/i)).toBeInTheDocument();
    expect(screen.getByText(/syncing/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Artifacts/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getAllByText("launch-brief.md").length).toBeGreaterThan(0);
  });

  it("opens stored artifacts through the central artifact canvas callback", async () => {
    const onOpenArtifact = jest.fn();
    renderRail({
      onOpenArtifact,
      artifacts: [
        {
          id: "artifact-backend-1",
          title: "Stored execution report",
          type: "markdown",
          version: 4,
          updatedAt: 1_800_000_000_000,
        },
      ],
    });

    expect(screen.getByRole("tab", { name: /Artifacts/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getAllByText("Stored execution report").length).toBeGreaterThan(0);
    expect(screen.getAllByText("markdown").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Open Stored execution report" }));
    expect(onOpenArtifact).toHaveBeenCalledWith(
      expect.objectContaining({ id: "artifact-backend-1" })
    );
  });

  it("exports stored artifacts from the right panel and starts an authenticated download", async () => {
    renderRail({
      artifacts: [
        {
          id: "artifact-download-1",
          title: "Downloadable report",
          type: "markdown",
          version: 2,
          updatedAt: 1_800_000_000_000,
        },
      ],
    });

    fireEvent.click(screen.getByTestId("agent-artifact-export-docx-artifact-download-1"));

    await waitFor(() => {
      expect(exportAgentArtifactMock).toHaveBeenCalledWith("artifact-download-1", "docx");
      expect(downloadAgentExportFileMock).toHaveBeenCalledWith(
        "/api/agent/exports/artifact.docx",
        "Downloadable_report.docx"
      );
      expect(screen.getByTestId("agent-artifact-download-docx-artifact-download-1")).toBeInTheDocument();
    });
  });

  it("manages public artifact share links from the right panel", async () => {
    renderRail({
      artifacts: [
        {
          id: "artifact-share-1",
          title: "Sharable report",
          type: "markdown",
          version: 5,
          updatedAt: 1_800_000_000_000,
        },
      ],
    });

    expect(screen.getByText("v5")).toBeInTheDocument();
    expect(screen.getByText("private")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Share Sharable report" }));

    await waitFor(() => {
      expect(shareAgentArtifactMock).toHaveBeenCalledWith("artifact-share-1");
      expect(screen.getByRole("link", { name: "Open public share for Sharable report" })).toHaveAttribute(
        "href",
        "https://share.local/artifact"
      );
      expect(screen.getByText("shared")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Stop sharing Sharable report" }));

    await waitFor(() => {
      expect(revokeAgentArtifactShareMock).toHaveBeenCalledWith("artifact-share-1");
      expect(screen.queryByRole("link", { name: "Open public share for Sharable report" })).not.toBeInTheDocument();
      expect(screen.getByText("private")).toBeInTheDocument();
    });
  });

  it("exposes PPTX export from the right panel when the renderer is available", async () => {
    renderRail({
      artifacts: [
        {
          id: "artifact-pptx-1",
          title: "Slide deck",
          type: "markdown",
          version: 1,
          updatedAt: 1_800_000_000_000,
        },
      ],
    });

    fireEvent.click(screen.getByTestId("agent-artifact-export-pptx-artifact-pptx-1"));

    await waitFor(() => {
      expect(exportAgentArtifactMock).toHaveBeenCalledWith("artifact-pptx-1", "pptx");
      expect(downloadAgentExportFileMock).toHaveBeenCalledWith(
        "/api/agent/exports/artifact.docx",
        "Slide_deck.pptx"
      );
      expect(screen.getByTestId("agent-artifact-download-pptx-artifact-pptx-1")).toBeInTheDocument();
    });
  });

  it("labels recent artifacts when the active session has no ledger output", () => {
    renderRail({
      artifactsScope: "recent",
      artifacts: [
        {
          id: "artifact-recent-1",
          title: "Older artifact",
          type: "html",
          version: 1,
          updatedAt: 1_700_000_000_000,
        },
      ],
    });

    expect(screen.getByText("Recent artifacts")).toBeInTheDocument();
    expect(screen.getByText(/this session has no ledger outputs/i)).toBeInTheDocument();
  });

  it("auto-routes pending approvals to the Plan panel before manual tab selection", () => {
    renderRail({
      isStreaming: true,
      transcriptEntries: [
        {
          id: "browser-1",
          kind: "tool",
          tool: "browser.open",
          text: "Opened the target page.",
          timestamp: 1,
        },
      ],
      approvalRequest: {
        id: "approval-1",
        tool: "extension_click",
        reason: "supervised_mutating_requires_approval",
        riskLevel: "high",
        timestamp: 1,
      },
    });

    const planTab = screen.getByRole("tab", { name: /Plan/i });
    expect(planTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByText("Waiting on extension_click").length).toBeGreaterThan(0);
    expect(screen.getAllByText("supervised_mutating_requires_approval").length).toBeGreaterThan(0);
  });

  it("keeps browser control in its own panel", () => {
    const onOpenExtensionSettings = jest.fn();
    renderRail({
      onOpenExtensionSettings,
      sandbox: {
        enabled: true,
        backend: "playwright",
      } as AgentInspectorRailProps["sandbox"],
      extensionDiagnostics: {
        user_id: "1",
        paired: true,
        connected_at_unix: 1_800_000,
        last_command_at_unix: 1_800_100,
        last_command_tool: "extension_click",
        last_command_result: "ok",
      },
      transcriptEntries: [
        {
          id: "browser-1",
          kind: "tool",
          intent: "tool",
          tool: "browser.open",
          text: "Opened the checkout page.",
          timestamp: 1,
        },
        {
          id: "extension-1",
          kind: "tool",
          intent: "tool",
          tool: "extension_click",
          text: "Clicked the logged-in checkout button.",
          resultState: "done",
          timestamp: 2,
        },
      ],
    });

    fireEvent.click(screen.getByRole("tab", { name: /Browser/i }));

    expect(screen.getByText("Agent browser active")).toBeInTheDocument();
    expect(screen.getByTestId("agent-browser-lanes")).toBeInTheDocument();
    expect(screen.getByText("agent-browser/K8s")).toBeInTheDocument();
    expect(screen.getByText("user browser extension")).toBeInTheDocument();
    expect(screen.getByText("browser_new_session")).toBeInTheDocument();
    expect(screen.getByText("extension_navigate")).toBeInTheDocument();
    expect(screen.getByText("ok · extension_click")).toBeInTheDocument();
    expect(screen.getAllByText("playwright").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Open Devices settings" }));
    expect(onOpenExtensionSettings).toHaveBeenCalledTimes(1);
  });

  it("renders live browser frames in the Browser tab and respects manual tab selection", async () => {
    const frame = {
      sessionId: "browser-session",
      frame: "iVBORw0KGgo=",
      url: "https://example.com",
      title: "Example",
      timestamp: 1_800_000,
    };
    const { rerender } = renderRail({
      browserFrame: frame,
    });

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Browser/i })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });
    expect(screen.getByText("Example")).toBeInTheDocument();
    expect(screen.getByText("https://example.com")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Evidence/i }));
    rerender(
      <AgentInspectorRail
        mode="execute"
        isStreaming={false}
        lastChannel={null}
        sandbox={null}
        tasks={[]}
        transcriptEntries={[]}
        narrationFrame={null}
        approvalRequest={null}
        contextGaugeData={null}
        usageSummary={null}
        browserFrame={{ ...frame, title: "Example refreshed" }}
      />
    );

    expect(screen.getByRole("tab", { name: /Evidence/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("creates schedules directly from the Cron panel", async () => {
    const onCronChanged = jest.fn();
    renderRail({
      onCronChanged,
      transcriptEntries: [
        {
          id: "scheduled",
          kind: "tool",
          text: "Scheduled weekly automation run.",
          resultState: "queued",
          timestamp: 2,
        },
      ],
    });

    fireEvent.click(screen.getByRole("tab", { name: /Cron/i }));

    expect(screen.getByText("schedules")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create schedule" }));
    const form = screen.getByTestId("agent-cron-form");
    fireEvent.change(within(form).getByPlaceholderText("What should ZAKI do on this schedule?"), {
      target: { value: "Review launch blockers every morning." },
    });
    fireEvent.click(within(form).getByRole("button", { name: /Create schedule/i }));
    await waitFor(() => {
      expect(createAgentCronMock).toHaveBeenCalledWith(
        expect.objectContaining({
          expression: "0 */6 * * *",
          prompt: "Review launch blockers every morning.",
        })
      );
      expect(onCronChanged).toHaveBeenCalledTimes(1);
    });
  });

  it("renders backend task and cron ledgers as the durable source of record", () => {
    renderRail({
      tasks: [
        {
          taskId: "backend-task-1",
          status: "queued",
          description: "Queued backend task",
          updatedAt: 1,
        },
      ],
      tasksError: "stale_cache",
      cronJobs: [
        {
          id: "cron-1",
          name: "Weekly investor scan",
          schedule: "0 9 * * 1",
          prompt: "Review market signals every Monday.",
          status: "queued",
          enabled: true,
          paused: false,
          nextRunAt: 1_800_000_000_000,
          lastRunAt: null,
          lastStatus: null,
          failureCount: 0,
        },
      ],
    });

    expect(screen.getByText("Queued backend task")).toBeInTheDocument();
    expect(screen.getByText(/Task ledger unavailable: stale_cache/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Cron/i }));

    expect(screen.getByText("Weekly investor scan")).toBeInTheDocument();
    expect(screen.getByText(/0 9 \* \* 1/)).toBeInTheDocument();
    expect(screen.getByText("Review market signals every Monday.")).toBeInTheDocument();
    expect(screen.getByText(/backend ledger/)).toBeInTheDocument();
  });

  it("renders V6 plan progress and delegated subagent work", () => {
    renderRail({
      isStreaming: true,
      tasks: [
        {
          taskId: "task-1",
          status: "done",
          description: "Read the handoff",
          updatedAt: 1,
        },
        {
          taskId: "task-2",
          status: "running",
          description: "Polish the right rail",
          progressPct: 55,
          updatedAt: 2,
        },
      ],
      transcriptEntries: [
        {
          id: "subagent-1",
          kind: "task",
          phase: "tool_only_turn",
          text: "subagent verifying trace rows",
          resultSummary: "subagent verifying trace rows against V6",
          resultState: "running",
          timestamp: 3,
        },
      ],
    });

    expect(screen.getByText("work")).toBeInTheDocument();
    expect(screen.getByText("0 / 1")).toBeInTheDocument();
    expect(screen.getAllByText("Polish the right rail").length).toBeGreaterThan(0);
    expect(screen.getByText("subagent")).toBeInTheDocument();
    expect(screen.getAllByText("subagent verifying trace rows against V6").length).toBeGreaterThan(0);
  });

  it("does not count completed historical tasks as the current plan", () => {
    renderRail({
      tasks: [
        {
          taskId: "task-done-1",
          status: "done",
          description: "Old completed task",
          updatedAt: 1,
        },
        {
          taskId: "task-failed-1",
          status: "failed",
          description: "Old failed task",
          updatedAt: 2,
        },
        {
          taskId: "task-cancelled-1",
          status: "cancelled",
          description: "Old cancelled task",
          updatedAt: 3,
        },
      ],
    });

    expect(screen.getByText("0 / 0")).toBeInTheDocument();
    expect(screen.getByText("No active run.")).toBeInTheDocument();
    expect(screen.getByTestId("agent-task-history")).toBeInTheDocument();
    expect(screen.getByText("Old completed task")).toBeInTheDocument();
    expect(screen.getByText("Old failed task")).toBeInTheDocument();
    expect(screen.getByText("Old cancelled task")).toBeInTheDocument();
    expect(screen.getByText("No active plan. Finished backend tasks are shown as history only.")).toBeInTheDocument();
  });

  it("shows approval continuation as an active run without requiring session.live", () => {
    renderRail({
      approvalContinuationPending: true,
      approvalRequest: {
        id: "approval-1",
        tool: "shell",
        reason: "supervised_mutating_requires_approval",
        riskLevel: "high",
        timestamp: 1,
      },
    });

    expect(screen.getAllByText("Approved. ZAKI is continuing...").length).toBeGreaterThan(0);
    expect(screen.getByText(/executing the approved action and continuation/i)).toBeInTheDocument();
    expect(screen.getByText("forming")).toBeInTheDocument();
  });

  it("renders trace as V6 operation rows with latency and warning count", async () => {
    renderRail({
      usageSummary: {
        usageTokens: 1200,
        costUsd: 0.01,
        turnWeight: 0.2,
        sessionWeight: 0.6,
      },
      transcriptEntries: [
        {
          id: "memory-search",
          kind: "tool",
          tool: "memory.search",
          text: "memory.search query",
          resultSummary: "memory.search · q=agent inspector",
          resultState: "done",
          durationMs: 42,
          timestamp: 1_800_000,
        },
        {
          id: "stale-file",
          kind: "tool",
          tool: "file.stale",
          text: "file.stale risks.md",
          resultSummary: "file.stale · risks.md",
          resultState: "blocked",
          timestamp: 1_801_000,
        },
      ],
    });

    fireEvent.click(screen.getByRole("tab", { name: /Trace/i }));
    await waitFor(() => expect(listAgentTracesMock).toHaveBeenCalled());

    expect(screen.getAllByText("42ms").length).toBeGreaterThan(0);
    expect(screen.getByText(/1 warn/)).toBeInTheDocument();
    expect(screen.getByText("1.2k")).toBeInTheDocument();
    expect(screen.getByText("WARN")).toBeInTheDocument();
    expect(screen.getByText(/memory.search/)).toBeInTheDocument();
  });

  it("loads trace details and manages durable share links from the Trace tab", async () => {
    listAgentTracesMock.mockResolvedValueOnce({
      response: { ok: true },
      data: {
        traces: [
          {
            run_id: "run-1",
            status: "completed",
            started_at: 1_800_000_000_000,
          },
        ],
      },
    });
    fetchAgentTraceMock.mockResolvedValueOnce({
      response: { ok: true },
      data: {
        run_id: "run-1",
        events: [
          {
            type: "tool_call",
            ts_ms: 1_800_000_001_000,
            summary: "Fetched source evidence",
          },
        ],
      },
    });

    renderRail();

    fireEvent.click(screen.getByRole("tab", { name: /Trace/i }));
    await waitFor(() => expect(listAgentTracesMock).toHaveBeenCalledWith({ limit: 20 }));
    expect(screen.getByText("runtime traces")).toBeInTheDocument();
    expect(screen.getByText("run-1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Details/i }));
    await waitFor(() => expect(fetchAgentTraceMock).toHaveBeenCalledWith("run-1"));
    expect(screen.getByText("Fetched source evidence")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    await waitFor(() => expect(shareAgentTraceMock).toHaveBeenCalledWith("run-1"));
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Open shared trace run-1" })).toHaveAttribute(
        "href",
        "https://share.local/trace"
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
    await waitFor(() => expect(revokeAgentTraceShareMock).toHaveBeenCalledWith("run-1"));
    await waitFor(() => {
      expect(screen.queryByRole("link", { name: "Open shared trace run-1" })).not.toBeInTheDocument();
    });
  });
});
