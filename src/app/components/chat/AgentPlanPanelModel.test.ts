import { describe, expect, it } from "@jest/globals";
import type { AgentSessionPlanResponse, AgentSessionTodosResponse } from "@/lib/api";
import type { NullalisTaskItem, NullalisTranscriptEntry } from "./BotStatusRail";
import { buildAgentPlanPanelModel } from "./AgentPlanPanelModel";

function entry(overrides: Partial<NullalisTranscriptEntry>): NullalisTranscriptEntry {
  return {
    id: overrides.id ?? "event-1",
    kind: overrides.kind ?? "task",
    text: overrides.text ?? "Inspect the current state",
    timestamp: overrides.timestamp ?? 1,
    ...overrides,
  };
}

describe("buildAgentPlanPanelModel", () => {
  it("prefers a populated backend plan and normalizes step states", () => {
    const plan: AgentSessionPlanResponse = {
      active: true,
      plan: {
        plan_id: "plan-1",
        summary: "Ship the release",
        current_step: 2,
        revision: 3,
        steps: [
          { index: 0, title: "Inspect", status: "done", actual_tool: "file_read" },
          { index: 1, title: "Build", status: "running", expected_tool: "file_edit" },
          { index: 2, title: "Verify", status: "pending" },
        ],
      },
    };

    const model = buildAgentPlanPanelModel({
      plan,
      todos: null,
      transcriptEntries: [
        entry({ phase: "plan_step", stepIndex: 0, stepTotal: 1, text: "Stale live step" }),
      ],
      tasks: [],
      isStreaming: true,
    });

    expect(model.source).toBe("backend");
    expect(model.objective).toBe("Ship the release");
    expect(model.steps.map((step) => step.state)).toEqual(["done", "running", "queued"]);
    expect(model.completedSteps).toBe(1);
    expect(model.totalSteps).toBe(3);
    expect(model.revision).toBe(3);
  });

  it("builds a live plan from progress frames and identifies the failed step", () => {
    const model = buildAgentPlanPanelModel({
      plan: { active: false, plan: null },
      todos: { lists: [], current_list_id: null },
      transcriptEntries: [
        entry({
          id: "step-1",
          phase: "plan_step",
          source: "progress",
          resultState: "running",
          stepIndex: 0,
          stepTotal: 3,
          text: "Step 1/3: Inspect the repository",
        }),
        entry({
          id: "done-1",
          kind: "tool",
          phase: "tool_done",
          source: "progress",
          resultState: "done",
          stepIndex: 0,
          stepTotal: 3,
          tool: "file_read",
          text: "file_read completed",
        }),
        entry({
          id: "step-2",
          phase: "plan_step",
          source: "progress",
          resultState: "running",
          stepIndex: 1,
          stepTotal: 3,
          text: "Step 2/3: Run the migration",
        }),
        entry({
          id: "failed-2",
          kind: "status",
          phase: "error_recovery",
          source: "progress",
          resultState: "failed",
          stepIndex: 1,
          stepTotal: 3,
          tool: "shell",
          text: "The migration command failed",
        }),
      ],
      tasks: [],
      isStreaming: false,
    });

    expect(model.source).toBe("live");
    expect(model.totalSteps).toBe(3);
    expect(model.completedSteps).toBe(1);
    expect(model.steps).toEqual([
      expect.objectContaining({ index: 1, title: "Inspect the repository", state: "done" }),
      expect.objectContaining({
        index: 2,
        title: "Run the migration",
        state: "failed",
        tool: "shell",
        retryable: true,
      }),
    ]);
  });

  it("uses the persisted checklist before background tasks", () => {
    const todos: AgentSessionTodosResponse = {
      current_list_id: "release",
      lists: [
        {
          list_id: "release",
          title: "Release checklist",
          items: [
            { id: 1, title: "Build", status: "completed" },
            { id: 2, title: "Deploy", status: "blocked", note: "Waiting for approval" },
          ],
        },
      ],
    };
    const tasks: NullalisTaskItem[] = [
      { taskId: "job-1", status: "running", description: "Background job", updatedAt: 2 },
    ];

    const model = buildAgentPlanPanelModel({
      plan: null,
      todos,
      transcriptEntries: [],
      tasks,
      isStreaming: false,
    });

    expect(model.source).toBe("checklist");
    expect(model.objective).toBe("Release checklist");
    expect(model.steps.map((step) => step.title)).toEqual(["Build", "Deploy"]);
    expect(model.steps[1]).toMatchObject({ state: "blocked", summary: "Waiting for approval" });
  });

  it("surfaces a failed tool as its own retryable step when no plan coordinates exist", () => {
    const model = buildAgentPlanPanelModel({
      plan: { active: false, plan: null },
      todos: { lists: [], current_list_id: null },
      transcriptEntries: [
        entry({
          id: "tool-failure",
          kind: "tool",
          source: "tool",
          phase: "tool_result",
          text: "shell failed",
          tool: "shell",
          toolUseId: "call-1",
          resultState: "failed",
          resultSummary: "invalid_session_key",
        }),
      ],
      tasks: [],
      isStreaming: false,
    });

    expect(model.source).toBe("live");
    expect(model.steps).toEqual([
      expect.objectContaining({
        index: 1,
        title: "shell failed",
        state: "failed",
        tool: "shell",
        summary: null,
        retryable: true,
      }),
    ]);
  });

  it("preserves separate failures of the same tool when correlation ids are absent", () => {
    const model = buildAgentPlanPanelModel({
      plan: { active: false, plan: null },
      todos: { lists: [], current_list_id: null },
      transcriptEntries: [
        entry({
          id: "shell-failure-1",
          kind: "tool",
          source: "tool",
          phase: "tool_done",
          text: "First shell call failed",
          tool: "shell",
          groupKey: "tool:shell",
          resultState: "failed",
          timestamp: 1,
        }),
        entry({
          id: "shell-failure-2",
          kind: "tool",
          source: "tool",
          phase: "tool_done",
          text: "Second shell call failed",
          tool: "shell",
          groupKey: "tool:shell",
          resultState: "failed",
          timestamp: 2,
        }),
      ],
      tasks: [],
      isStreaming: false,
    });

    expect(model.steps).toHaveLength(2);
    expect(model.steps.map((step) => step.title)).toEqual([
      "First shell call failed",
      "Second shell call failed",
    ]);
  });

  it("renders the soft-empty endpoint payload as idle rather than an error", () => {
    const model = buildAgentPlanPanelModel({
      plan: { active: false, plan: null },
      todos: { lists: [], current_list_id: null },
      transcriptEntries: [],
      tasks: [],
      isStreaming: false,
    });

    expect(model.source).toBe("idle");
    expect(model.steps).toEqual([]);
    expect(model.totalSteps).toBe(0);
  });
});
