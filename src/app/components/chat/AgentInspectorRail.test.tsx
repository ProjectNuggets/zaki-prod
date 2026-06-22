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
const deleteAgentCronMock = jest.requireMock("@/lib/api").deleteAgentCron as jest.Mock;
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
const updateAgentCronMock = jest.requireMock("@/lib/api").updateAgentCron as jest.Mock;

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
      data: { download_url: "/api/agent/exports/artifact.pdf" },
    });
    downloadAgentExportFileMock.mockResolvedValue({
      filename: "artifact.pdf",
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
    deleteAgentCronMock.mockResolvedValue({
      response: { ok: true },
      data: { ok: true },
    });
    updateAgentCronMock.mockResolvedValue({
      response: { ok: true },
      data: { job: { id: "cron-updated" } },
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
    for (const label of ["Plan", "Schedules", "Sources", "Artifacts", "Browser", "Trace"]) {
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

  it("renders a minimal live work signal before structured work arrives", () => {
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
    const currentWork = screen.getByTestId("agent-current-work");
    expect(within(currentWork).getByText("live run")).toBeInTheDocument();
    expect(within(currentWork).getByText("Reading the agent handoff")).toBeInTheDocument();
    expect(screen.queryByTestId("agent-narration-box")).not.toBeInTheDocument();
  });

  it("renders persisted checklist work and trusted plan data without diagnostics", async () => {
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

    const currentWork = screen.getByTestId("agent-current-work");
    expect(currentWork).toHaveTextContent("2 items");
    expect(currentWork).toHaveTextContent("Render checklist");
    expect(within(currentWork).getByRole("button", { name: "Complete" })).toBeInTheDocument();

    const planned = screen.getByTestId("agent-planned");
    expect(planned).toHaveTextContent("Ship the right rail work panel");
    expect(planned).toHaveTextContent("Render run plan");
    expect(planned).toHaveTextContent("Snapshot loaded");
    expect(screen.queryByTestId("agent-work-trace-strip")).not.toBeInTheDocument();
    expect(screen.queryByText("native_tool_calls")).not.toBeInTheDocument();
  });

  it("uses live todo-derived tasks as read-only current work", () => {
    renderRail({
      tasks: [
        {
          taskId: "todo:draft:item:1",
          status: "running",
          description: "Draft implementation checklist",
          progressPct: 50,
          updatedAt: 1,
        },
      ],
    });

    const currentWork = screen.getByTestId("agent-current-work");
    expect(currentWork).toHaveTextContent("live checklist");
    expect(currentWork).toHaveTextContent("Draft implementation checklist");
    expect(currentWork).toHaveTextContent("50%");
    expect(within(currentWork).queryByRole("button", { name: "Details" })).not.toBeInTheDocument();
    expect(within(currentWork).queryByRole("button", { name: "Stop" })).not.toBeInTheDocument();
  });

  it("renders live plan-step hints when no persisted plan is available", () => {
    renderRail({
      transcriptEntries: [
        {
          id: "plan-step-1",
          kind: "narration",
          phase: "plan_step",
          source: "reasoning_summary",
          text: "Inspect available todo and plan signals",
          timestamp: 1,
        },
        {
          id: "plan-step-2",
          kind: "narration",
          phase: "plan_step",
          source: "reasoning_summary",
          text: "Replace low-value diagnostics with current work",
          timestamp: 2,
        },
      ],
    });

    expect(screen.getByRole("tab", { name: /Plan 2/i })).toBeInTheDocument();
    const planned = screen.getByTestId("agent-planned");
    expect(planned).toHaveTextContent("2 hints");
    expect(planned).toHaveTextContent("Inspect available todo and plan signals");
    expect(planned).toHaveTextContent("Replace low-value diagnostics with current work");
  });

  it("does not badge plan hints as planned count while a live run is still forming", () => {
    renderRail({
      isStreaming: true,
      transcriptEntries: [
        {
          id: "plan-step-live",
          kind: "narration",
          phase: "plan_step",
          source: "reasoning_summary",
          text: "Inspect plan signals while work is still forming",
          timestamp: 1,
        },
      ],
    });

    expect(screen.getByRole("tab", { name: /^Plan$/i })).toBeInTheDocument();
    const currentWork = screen.getByTestId("agent-current-work");
    expect(within(currentWork).getByText("live run")).toBeInTheDocument();
    expect(screen.getByTestId("agent-planned")).toHaveTextContent(
      "Inspect plan signals while work is still forming"
    );
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

    expect(screen.getByRole("tab", { name: /Sources/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("surfaces memory and context evidence in the Sources tab", () => {
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
        {
          id: "context-1",
          kind: "tool",
          intent: "context",
          tool: "retrieve_context",
          text: "Loaded retrieved workspace context.",
          timestamp: 2,
        },
      ],
      contextGaugeData: {
        pressurePercent: 25,
        source: "live_session",
        confidence: "exact",
      },
    });

    fireEvent.click(screen.getByRole("tab", { name: /Sources/i }));

    expect(screen.getByTestId("agent-sources-brief")).toHaveTextContent(
      "memory used · 1 context hit"
    );
    expect(screen.getByText("context source")).toBeInTheDocument();
    expect(screen.getByText("25% pressure · exact")).toBeInTheDocument();
    expect(screen.getByText("Fetched durable graph memory for this user.")).toBeInTheDocument();
    expect(screen.getByText("Loaded retrieved workspace context.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open memory graph" }));
    expect(onOpenMemory).toHaveBeenCalledTimes(1);
  });

  it("surfaces web and file evidence in the Sources tab", () => {
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

    fireEvent.click(screen.getByRole("tab", { name: /Sources/i }));

    expect(screen.getByTestId("agent-sources-brief")).toHaveTextContent("1 web · 1 file");
    expect(screen.getByText("example.com")).toBeInTheDocument();
    expect(screen.getByText(/web source/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open source" })).toHaveAttribute(
      "href",
      "https://example.com/agent-market"
    );
    expect(screen.getByText("docs/ui-handoff.md")).toBeInTheDocument();
    expect(screen.getByText(/file · done · 1 file/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open memory graph" })).not.toBeInTheDocument();
  });

  it("keeps generic trace wording and untrusted context out of Sources", () => {
    renderRail({
      transcriptEntries: [
        {
          id: "status-1",
          kind: "status",
          text: "Read context, search sources, then continue.",
          timestamp: 1,
        },
      ],
      contextGaugeData: {
        tokenCount: 2_000,
        contextMax: 8_000,
      },
    });

    fireEvent.click(screen.getByRole("tab", { name: /Sources/i }));

    expect(screen.queryByText("Read context, search sources, then continue.")).not.toBeInTheDocument();
    expect(screen.queryByText("context source")).not.toBeInTheDocument();
    expect(screen.getByText(/No sources surfaced/i)).toBeInTheDocument();
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

    expect(screen.getByTestId("agent-artifact-brief")).toHaveTextContent("1 syncing");
    expect(screen.getByTestId("agent-artifact-syncing")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Artifacts/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getAllByText("launch-brief.md").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Open launch-brief/i })).not.toBeInTheDocument();
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
    expect(screen.queryByRole("button", { name: /Share Stored execution report/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-artifact-export-html-artifact-backend-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-artifact-export-docx-artifact-backend-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-artifact-export-pptx-artifact-backend-1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Stored execution report" }));
    expect(onOpenArtifact).toHaveBeenCalledWith(
      expect.objectContaining({ id: "artifact-backend-1" })
    );
    expect(screen.getByRole("button", { name: "Show details for Stored execution report" })).toBeInTheDocument();
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

    expect(screen.queryByTestId("agent-artifact-export-pdf-artifact-download-1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show details for Downloadable report" }));
    expect(screen.queryByTestId("agent-artifact-export-html-artifact-download-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-artifact-export-docx-artifact-download-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-artifact-export-pptx-artifact-download-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-artifact-export-xlsx-artifact-download-1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("agent-artifact-export-pdf-artifact-download-1"));

    await waitFor(() => {
      expect(exportAgentArtifactMock).toHaveBeenCalledWith("artifact-download-1", "pdf");
      expect(downloadAgentExportFileMock).toHaveBeenCalledWith(
        "/api/agent/exports/artifact.pdf",
        "Downloadable_report.pdf"
      );
      expect(screen.getByTestId("agent-artifact-download-pdf-artifact-download-1")).toBeInTheDocument();
    });
  });

  it("manages public artifact share links from the right panel", async () => {
    const writeText = jest.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
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
    expect(screen.queryByRole("button", { name: "Share Sharable report" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show details for Sharable report" }));
    fireEvent.click(screen.getByRole("button", { name: "Share Sharable report" }));

    await waitFor(() => {
      expect(shareAgentArtifactMock).toHaveBeenCalledWith("artifact-share-1");
      expect(screen.getByRole("link", { name: "Open public share for Sharable report" })).toHaveAttribute(
        "href",
        "https://share.local/artifact"
      );
      expect(screen.getByText("shared")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Copy link for Sharable report" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("https://share.local/artifact"));

    fireEvent.click(screen.getByRole("button", { name: "Stop sharing Sharable report" }));

    await waitFor(() => {
      expect(revokeAgentArtifactShareMock).toHaveBeenCalledWith("artifact-share-1");
      expect(screen.queryByRole("link", { name: "Open public share for Sharable report" })).not.toBeInTheDocument();
      expect(screen.getByText("private")).toBeInTheDocument();
    });
  });

  it("does not expose non-PDF exports from the right panel", () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Show details for Slide deck" }));
    expect(screen.getByTestId("agent-artifact-export-pdf-artifact-pptx-1")).toBeInTheDocument();
    expect(screen.queryByTestId("agent-artifact-export-html-artifact-pptx-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-artifact-export-docx-artifact-pptx-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-artifact-export-pptx-artifact-pptx-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-artifact-export-xlsx-artifact-pptx-1")).not.toBeInTheDocument();
  });

  it("does not show recent artifacts as current-session deliverables", () => {
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

    fireEvent.click(screen.getByRole("tab", { name: /Artifacts/i }));
    expect(screen.queryByText("Older artifact")).not.toBeInTheDocument();
    expect(screen.getByText("No artifacts in this session yet.")).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("tab", { name: /Sources/i }));
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

    expect(screen.getByRole("tab", { name: /Sources/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("creates schedules from quick presets and advanced cron in the Schedules tab", async () => {
    const onCronChanged = jest.fn();
    renderRail({ onCronChanged });

    fireEvent.click(screen.getByRole("tab", { name: /Schedules/i }));

    expect(screen.getByText("scheduled work")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create schedule" }));
    const form = screen.getByTestId("agent-cron-form");
    fireEvent.change(within(form).getByPlaceholderText("What should ZAKI do on this schedule?"), {
      target: { value: "Review launch blockers every morning." },
    });
    fireEvent.click(within(form).getByRole("button", { name: /Create schedule/i }));
    await waitFor(() => {
      expect(createAgentCronMock).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "Review launch blockers every morning.",
          job_type: "agent",
          one_shot: true,
          expression: expect.any(String),
        })
      );
      expect(onCronChanged).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "Create schedule" }));
    const advancedForm = screen.getByTestId("agent-cron-form");
    fireEvent.click(within(advancedForm).getByRole("button", { name: "Advanced cron" }));
    fireEvent.change(within(advancedForm).getByLabelText("Cron expression"), {
      target: { value: "0 9 * * 1" },
    });
    fireEvent.change(within(advancedForm).getByPlaceholderText("What should ZAKI do on this schedule?"), {
      target: { value: "Prepare Monday brief." },
    });
    fireEvent.click(within(advancedForm).getByRole("button", { name: /Create schedule/i }));
    await waitFor(() => {
      expect(createAgentCronMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          expression: "0 9 * * 1",
          prompt: "Prepare Monday brief.",
          job_type: "agent",
          one_shot: false,
        })
      );
      expect(onCronChanged).toHaveBeenCalledTimes(2);
    });
  });

  it("does not force one-shot schedules to recurring when editing", async () => {
    renderRail({
      cronJobs: [
        {
          id: "one-shot",
          name: "One-shot reminder",
          schedule: "30 9 23 6 *",
          prompt: "Remind me about launch.",
          status: "queued",
          enabled: true,
          paused: false,
          nextRunAt: 1_803_217_800_000,
          lastRunAt: null,
          lastStatus: null,
          failureCount: 0,
          oneShot: true,
        },
      ],
    });

    fireEvent.click(screen.getByRole("tab", { name: /Schedules/i }));
    fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
    const form = screen.getByTestId("agent-cron-form");
    fireEvent.change(within(form).getByPlaceholderText("What should ZAKI do on this schedule?"), {
      target: { value: "Remind me about launch checklist." },
    });
    fireEvent.click(within(form).getByRole("button", { name: /Update schedule/i }));

    await waitFor(() => {
      expect(updateAgentCronMock).toHaveBeenCalledWith(
        "one-shot",
        expect.not.objectContaining({ one_shot: expect.anything() })
      );
    });
  });

  it("renders cron-backed schedules, hides unmatched jobs, and enriches matching runtime rows", () => {
    renderRail({
      jobs: [
        {
          id: "cron-1",
          title: "Runtime scheduler row",
          status: "running",
          schedule: null,
          prompt: "Runtime prompt should not replace editable prompt.",
          nextRunAt: 1_800_000_000_000,
          lastRunAt: 1_799_900_000_000,
          createdAt: null,
        },
        {
          id: "job-only",
          title: "Runtime-only scheduler row",
          status: "queued",
          schedule: "0 18 * * 5",
          prompt: "Send weekly digest.",
          nextRunAt: 1_800_100_000_000,
          lastRunAt: null,
          createdAt: null,
        },
      ],
      cronJobs: [
        {
          id: "cron-1",
          name: "Editable cron name",
          schedule: "0 9 * * 1",
          prompt: "Editable prompt.",
          status: "queued",
          enabled: true,
          paused: false,
          nextRunAt: 1_800_000_000_000,
          lastRunAt: null,
          lastStatus: null,
          failureCount: 0,
        },
        {
          id: "cron-extra",
          name: "Cron fallback still visible",
          schedule: "0 9 * * 2",
          prompt: "Should render because cron is the display source.",
          status: "queued",
          enabled: true,
          paused: false,
          nextRunAt: null,
          lastRunAt: null,
          lastStatus: null,
          failureCount: 0,
        },
      ],
    });

    fireEvent.click(screen.getByRole("tab", { name: /Schedules/i }));

    const scheduleList = screen.getByTestId("agent-schedule-list");
    expect(within(scheduleList).getByText("Editable cron name")).toBeInTheDocument();
    expect(within(scheduleList).getByText(/Mondays at 09:00/)).toBeInTheDocument();
    expect(within(scheduleList).getByText("Cron fallback still visible")).toBeInTheDocument();
    expect(screen.queryByText("Runtime-only scheduler row")).not.toBeInTheDocument();
    expect(screen.queryByText("read-only scheduler row")).not.toBeInTheDocument();
    expect(within(scheduleList).getByText(/running/)).toBeInTheDocument();
    expect(within(scheduleList).getAllByRole("button", { name: /Edit/i })).toHaveLength(2);
  });

  it("generates compact titles, sanitizes briefs, and hides full prompts behind Details", () => {
    const longPrompt =
      "Prepare the scheduled report now. Report specification: CHECK EMAIL INBOX FOR UNREAD MESSAGES. Include count of total unread. Style: concise operator briefing. Read HEARTBEAT.md in workspace only as wake policy if it is relevant. Use runtime_info and schedule first for runtime truth. Do not call the message tool in this turn; scheduler delivery sends the final output. Do not create/update scheduler jobs in this turn.";

    renderRail({
      cronJobs: [
        {
          id: "cron-1",
          name: "",
          schedule: "0 12 * * *",
          prompt: longPrompt,
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

    fireEvent.click(screen.getByRole("tab", { name: /Schedules/i }));

    const scheduleList = screen.getByTestId("agent-schedule-list");
    expect(within(scheduleList).getByText("Scheduled report")).toBeInTheDocument();
    expect(within(scheduleList).getByText(/Every day at 12:00/)).toBeInTheDocument();
    expect(within(scheduleList).getByText(/Check email inbox for unread messages/i)).toBeInTheDocument();
    expect(screen.queryByText(longPrompt)).not.toBeInTheDocument();
    expect(screen.queryByText(/0 12 \* \* \*/)).not.toBeInTheDocument();

    fireEvent.click(within(scheduleList).getByRole("button", { name: /Details/i }));

    const details = screen.getByTestId("agent-schedule-details");
    expect(within(details).getByText(longPrompt)).toBeInTheDocument();
    expect(within(details).getByText("0 12 * * *")).toBeInTheDocument();
  });

  it("matches runtime jobs by schedule and prompt fingerprint", () => {
    renderRail({
      jobs: [
        {
          id: "runtime-77",
          title: "Runtime row",
          status: "running",
          schedule: "0 12 * * *",
          prompt: "Prepare daily brief.",
          nextRunAt: 1_800_000_000_000,
          lastRunAt: null,
          createdAt: null,
        },
      ],
      cronJobs: [
        {
          id: "cron-brief",
          name: "",
          schedule: "0 12 * * *",
          prompt: "Prepare daily brief.",
          status: "queued",
          enabled: true,
          paused: false,
          nextRunAt: null,
          lastRunAt: null,
          lastStatus: null,
          failureCount: 0,
        },
      ],
    });

    fireEvent.click(screen.getByRole("tab", { name: /Schedules/i }));

    const scheduleList = screen.getByTestId("agent-schedule-list");
    expect(within(scheduleList).getByText("Scheduled brief")).toBeInTheDocument();
    expect(within(scheduleList).getByText(/Every day at 12:00/)).toBeInTheDocument();
    expect(within(scheduleList).getByText(/running/)).toBeInTheDocument();
    fireEvent.click(within(scheduleList).getByRole("button", { name: /Details/i }));
    expect(within(screen.getByTestId("agent-schedule-details")).getByText("runtime-77")).toBeInTheDocument();
  });

  it("renders cron rows with human cadence and cron actions", () => {
    renderRail({
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

    fireEvent.click(screen.getByRole("tab", { name: /Schedules/i }));

    expect(screen.getByText("Weekly investor scan")).toBeInTheDocument();
    expect(screen.getByText(/Mondays at 09:00/)).toBeInTheDocument();
    expect(screen.getByText("Review market signals every Monday.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Details/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pause/i })).toBeInTheDocument();
  });

  it("pauses and deletes cron-backed schedules", async () => {
    renderRail({
      cronJobs: [
        {
          id: "cron-actions",
          name: "Daily brief",
          schedule: "0 12 * * *",
          prompt: "Prepare daily brief.",
          status: "queued",
          enabled: true,
          paused: false,
          nextRunAt: null,
          lastRunAt: null,
          lastStatus: null,
          failureCount: 0,
        },
      ],
    });

    fireEvent.click(screen.getByRole("tab", { name: /Schedules/i }));
    fireEvent.click(screen.getByRole("button", { name: /Pause/i }));
    await waitFor(() => {
      expect(updateAgentCronMock).toHaveBeenCalledWith("cron-actions", { paused: true });
    });

    fireEvent.click(screen.getByRole("button", { name: /Delete/i }));
    fireEvent.click(screen.getByRole("button", { name: /Confirm delete/i }));
    await waitFor(() => {
      expect(deleteAgentCronMock).toHaveBeenCalledWith("cron-actions");
    });
  });

  it("shows strict schedule activity without treating background work as scheduled jobs", () => {
    renderRail({
      transcriptEntries: [
        {
          id: "scheduled",
          kind: "tool",
          tool: "schedule",
          text: "Scheduled weekly automation run.",
          resultSummary: "Created weekly digest schedule.",
          resultState: "queued",
          timestamp: 3,
        },
        {
          id: "background",
          kind: "task",
          phase: "tool_only_turn",
          text: "4 tools ran and 2 background tasks spawned",
          resultState: "running",
          timestamp: 2,
        },
        {
          id: "completion",
          kind: "task",
          phase: "subagent_completion",
          text: "Completed subagent: research finished",
          timestamp: 1,
        },
      ],
    });

    fireEvent.click(screen.getByRole("tab", { name: /Schedules/i }));

    expect(screen.getByText("No scheduled work yet.")).toBeInTheDocument();
    const activity = screen.getByTestId("agent-schedule-activity");
    expect(within(activity).getByText("Created weekly digest schedule.")).toBeInTheDocument();
    expect(screen.queryByText(/background tasks spawned/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Completed subagent/)).not.toBeInTheDocument();
  });

  it("renders soft empty and unavailable schedule states", () => {
    const { rerender } = renderRail();

    fireEvent.click(screen.getByRole("tab", { name: /Schedules/i }));

    expect(screen.getByText("No scheduled work yet.")).toBeInTheDocument();
    expect(screen.queryByText(/ledger unavailable/i)).not.toBeInTheDocument();

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
        jobsError="network_error"
        cronError="network_error"
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: /Schedules/i }));
    expect(screen.getByText(/Schedules are unavailable right now/)).toBeInTheDocument();
    expect(screen.queryByText(/Schedule ledger unavailable/i)).not.toBeInTheDocument();
  });

  it("falls back to active background task rows when no checklist exists", () => {
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

    const currentWork = screen.getByTestId("agent-current-work");
    expect(screen.getByText("0 / 1")).toBeInTheDocument();
    expect(currentWork).toHaveTextContent("background tasks");
    expect(currentWork).toHaveTextContent("Polish the right rail");
    expect(within(currentWork).getByRole("button", { name: "Details" })).toBeInTheDocument();
    expect(screen.queryByText("subagent")).not.toBeInTheDocument();
  });

  it("does not show completed historical tasks in the Plan tab", () => {
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

    expect(screen.getByTestId("agent-plan-empty")).toHaveTextContent(
      "No active work for this session."
    );
    expect(screen.queryByTestId("agent-task-history")).not.toBeInTheDocument();
    expect(screen.queryByText("Old completed task")).not.toBeInTheDocument();
    expect(screen.queryByText("Old failed task")).not.toBeInTheDocument();
    expect(screen.queryByText("Old cancelled task")).not.toBeInTheDocument();
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

    const currentWork = screen.getByTestId("agent-current-work");
    expect(within(currentWork).getByText("Approved. ZAKI is continuing.")).toBeInTheDocument();
    expect(within(currentWork).getByText(/Structured work items will appear/i)).toBeInTheDocument();
    expect(screen.queryByTestId("agent-plan-blocked")).not.toBeInTheDocument();
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
