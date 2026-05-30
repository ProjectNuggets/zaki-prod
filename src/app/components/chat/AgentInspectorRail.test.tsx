import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { AgentInspectorRail, type AgentInspectorRailProps } from "./AgentInspectorRail";

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
    quotaInfo: null,
    ...overrides,
  };

  return render(<AgentInspectorRail {...props} />);
}

describe("AgentInspectorRail", () => {
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
    for (const label of ["Plan", "Cron", "Sources", "Artifacts", "Browser", "Trace"]) {
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

  it("honors external tab requests from status strip and inline evidence links", () => {
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
        quotaInfo={null}
        tabRequest={{ tab: "sources", id: 2 }}
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
      ],
      contextGaugeData: {
        tokenCount: 2_000,
        contextMax: 8_000,
      },
      quotaInfo: {
        limit: 5,
        remaining: 3,
      },
    });

    fireEvent.click(screen.getByRole("tab", { name: /Sources/i }));

    expect(screen.getByText("Context window")).toBeInTheDocument();
    expect(screen.getByText("Fetched durable graph memory for this user.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open memory graph" }));
    expect(onOpenMemory).toHaveBeenCalledTimes(1);
  });

  it("separates artifact activity and opens the artifact manager", () => {
    const onOpenArtifacts = jest.fn();
    renderRail({
      artifactCount: 1,
      onOpenArtifacts,
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

    expect(screen.getByText("output · captured")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Artifacts/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getAllByText("launch-brief.md").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Open artifacts manager" }));
    expect(onOpenArtifacts).toHaveBeenCalledTimes(1);
  });

  it("renders stored artifacts from the backend ledger", () => {
    const onOpenArtifacts = jest.fn();
    renderRail({
      onOpenArtifacts,
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
    expect(screen.getByText("Stored artifact from the backend ledger.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open artifacts manager" }));
    expect(onOpenArtifacts).toHaveBeenCalledTimes(1);
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
    const onOpenBrowser = jest.fn();
    renderRail({
      onOpenBrowser,
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

    expect(screen.getByText("Browser activity detected")).toBeInTheDocument();
    expect(screen.getByTestId("agent-browser-lanes")).toBeInTheDocument();
    expect(screen.getByText("app browser")).toBeInTheDocument();
    expect(screen.getByText("user browser extension")).toBeInTheDocument();
    expect(screen.getByText("web_fetch")).toBeInTheDocument();
    expect(screen.getByText("extension_navigate")).toBeInTheDocument();
    expect(screen.getByText("ok · extension_click")).toBeInTheDocument();
    expect(screen.getAllByText("playwright")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Open browser controls" }));
    expect(onOpenBrowser).toHaveBeenCalledTimes(1);
  });

  it("opens the schedule manager from the Cron panel", () => {
    const onOpenCron = jest.fn();
    renderRail({
      onOpenCron,
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
    fireEvent.click(screen.getByRole("button", { name: "Open schedule manager" }));
    expect(onOpenCron).toHaveBeenCalledTimes(1);
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

    expect(screen.getByText("current plan")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getAllByText("Polish the right rail").length).toBeGreaterThan(0);
    expect(screen.getByText("subagent")).toBeInTheDocument();
    expect(screen.getAllByText("subagent verifying trace rows against V6").length).toBeGreaterThan(0);
  });

  it("renders trace as V6 operation rows with latency and warning count", () => {
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

    expect(screen.getAllByText("42ms").length).toBeGreaterThan(0);
    expect(screen.getByText(/1 warn/)).toBeInTheDocument();
    expect(screen.getByText("1.2k")).toBeInTheDocument();
    expect(screen.getByText("WARN")).toBeInTheDocument();
    expect(screen.getByText(/memory.search/)).toBeInTheDocument();
  });
});
