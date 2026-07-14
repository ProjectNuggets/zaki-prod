import type {
  AgentSessionPlanResponse,
  AgentSessionTodosResponse,
  AgentTaskPlanStep,
} from "@/lib/api";
import type { NullalisTaskItem, NullalisTranscriptEntry } from "./BotStatusRail";
import { looksLikeMachineCode } from "@/lib/userFacingErrors";
import { displaySafeRuntimePreview } from "./rendering/agentReplyPresentation";

export type AgentPlanStepState = "queued" | "running" | "done" | "failed" | "blocked";
export type AgentPlanSource = "backend" | "live" | "checklist" | "tasks" | "idle";

export type AgentPlanPanelStep = {
  id: string;
  index: number;
  title: string;
  state: AgentPlanStepState;
  tool: string | null;
  summary: string | null;
  retryable: boolean;
};

export type AgentPlanPanelModel = {
  source: AgentPlanSource;
  objective: string | null;
  steps: AgentPlanPanelStep[];
  completedSteps: number;
  totalSteps: number;
  revision: number | null;
};

export type AgentPlanPanelModelInput = {
  plan: AgentSessionPlanResponse | null;
  todos: AgentSessionTodosResponse | null;
  transcriptEntries: NullalisTranscriptEntry[];
  tasks: NullalisTaskItem[];
  isStreaming: boolean;
};

function compact(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function safePreview(value: unknown): string {
  const preview = displaySafeRuntimePreview(compact(value));
  return preview && !looksLikeMachineCode(preview) ? preview : "";
}

function normalizeState(value: unknown): AgentPlanStepState {
  const status = compact(value).toLowerCase();
  if (["done", "completed", "complete", "succeeded", "success"].includes(status)) return "done";
  if (["running", "in_progress", "active", "working"].includes(status)) return "running";
  if (["failed", "error"].includes(status)) return "failed";
  if (["blocked", "cancelled", "canceled"].includes(status)) return "blocked";
  return "queued";
}

function titleFromLiveStep(entry: NullalisTranscriptEntry): string {
  const text = safePreview(entry.text || entry.activityLabel || entry.resultSummary);
  if (!text) return "";
  return text.replace(/^step\s+\d+\s*\/\s*\d+\s*:\s*/i, "").trim() || text;
}

function backendStep(step: AgentTaskPlanStep, position: number): AgentPlanPanelStep {
  const index = Number.isFinite(step.index) && step.index >= 0 ? step.index + 1 : position + 1;
  const state = normalizeState(step.status);
  return {
    id: step.id || `backend-step-${index}`,
    index,
    title: safePreview(step.title || step.description),
    state,
    tool: compact(step.actual_tool || step.expected_tool) || null,
    summary: state === "failed" ? null : safePreview(step.result_summary) || null,
    retryable: state === "failed",
  };
}

function liveSteps(
  transcriptEntries: NullalisTranscriptEntry[],
  isStreaming: boolean
): { steps: AgentPlanPanelStep[]; total: number } {
  const byIndex = new Map<number, AgentPlanPanelStep>();
  let total = 0;
  let lastPlanIndex: number | null = null;
  let lastPlanTimestamp = 0;
  let runFinishedAt = 0;

  const entries = [...transcriptEntries].sort((left, right) => left.timestamp - right.timestamp);
  for (const entry of entries) {
    if (entry.source === "done" || entry.phase === "done") {
      runFinishedAt = Math.max(runFinishedAt, entry.timestamp);
    }
    const wireIndex = Number(entry.stepIndex);
    const hasIndex = Number.isInteger(wireIndex) && wireIndex >= 0;
    if (Number.isInteger(entry.stepTotal) && Number(entry.stepTotal) > 0) {
      total = Math.max(total, Number(entry.stepTotal));
    }
    if (!hasIndex) continue;
    const index = wireIndex + 1;
    total = Math.max(total, index);

    if (entry.phase === "plan_step") {
      if (lastPlanIndex != null && lastPlanIndex !== index) {
        const previous = byIndex.get(lastPlanIndex);
        if (previous?.state === "running") {
          byIndex.set(lastPlanIndex, { ...previous, state: "done" });
        }
      }
      const previous = byIndex.get(index);
      byIndex.set(index, {
        id: previous?.id || `live-step-${index}`,
        index,
        title: titleFromLiveStep(entry),
        state: entry.resultState === "failed" ? "failed" : "running",
        tool: compact(entry.tool) || previous?.tool || null,
        summary: previous?.summary || null,
        retryable: entry.resultState === "failed",
      });
      lastPlanIndex = index;
      lastPlanTimestamp = entry.timestamp;
      continue;
    }

    if (entry.phase !== "tool_done" && entry.phase !== "error_recovery") continue;
    const previous = byIndex.get(index);
    const failed = entry.phase === "error_recovery" || entry.resultState === "failed";
    byIndex.set(index, {
      id: previous?.id || `live-step-${index}`,
      index,
      title: previous?.title || `Step ${index}`,
      state: failed ? "failed" : "done",
      tool: compact(entry.tool) || previous?.tool || null,
      summary: failed ? null : safePreview(entry.resultSummary || entry.text) || previous?.summary || null,
      retryable: failed,
    });
  }

  if (!isStreaming && lastPlanIndex != null && runFinishedAt >= lastPlanTimestamp) {
    const last = byIndex.get(lastPlanIndex);
    if (last?.state === "running") byIndex.set(lastPlanIndex, { ...last, state: "done" });
  }

  return {
    steps: [...byIndex.values()].sort((left, right) => left.index - right.index),
    total,
  };
}

function failedToolSteps(transcriptEntries: NullalisTranscriptEntry[]): AgentPlanPanelStep[] {
  const seen = new Set<string>();
  return [...transcriptEntries]
    .sort((left, right) => left.timestamp - right.timestamp)
    .filter(
      (entry) =>
        entry.resultState === "failed" &&
        (entry.kind === "tool" || entry.phase === "error_recovery")
    )
    .reduce<AgentPlanPanelStep[]>((steps, entry) => {
      const key = entry.toolUseId || entry.groupKey || entry.id;
      if (seen.has(key)) return steps;
      seen.add(key);
      const index = steps.length + 1;
      steps.push({
        id: `failed-tool:${key}`,
        index,
        title: safePreview(entry.activityLabel || entry.text),
        state: "failed",
        tool: safePreview(entry.tool) || null,
        summary: null,
        retryable: true,
      });
      return steps;
    }, []);
}

function completeModel(
  source: AgentPlanSource,
  objective: string | null,
  steps: AgentPlanPanelStep[],
  totalSteps = steps.length,
  revision: number | null = null
): AgentPlanPanelModel {
  return {
    source,
    objective,
    steps,
    completedSteps: steps.filter((step) => step.state === "done").length,
    totalSteps,
    revision,
  };
}

export function buildAgentPlanPanelModel({
  plan,
  todos,
  transcriptEntries,
  tasks,
  isStreaming,
}: AgentPlanPanelModelInput): AgentPlanPanelModel {
  const backendPlan = plan?.plan;
  if (backendPlan?.steps?.length) {
    const steps = backendPlan.steps
      .map(backendStep)
      .sort((left, right) => left.index - right.index);
    return completeModel(
      "backend",
      safePreview(backendPlan.summary) || null,
      steps,
      steps.length,
      Number.isFinite(backendPlan.revision) ? Number(backendPlan.revision) : null
    );
  }

  const live = liveSteps(transcriptEntries, isStreaming);
  if (live.steps.length) {
    return completeModel("live", null, live.steps, Math.max(live.total, live.steps.length));
  }

  const failures = failedToolSteps(transcriptEntries);
  if (failures.length) return completeModel("live", null, failures);

  const todoLists = Array.isArray(todos?.lists) ? todos.lists : [];
  const todoList =
    todoLists.find((list) => list.list_id === todos?.current_list_id) || todoLists[0] || null;
  if (todoList?.items?.length) {
    const steps = todoList.items.map((item, position) => {
      const state = normalizeState(item.status);
      return {
        id: `${todoList.list_id}:${item.id}`,
        index: position + 1,
        title: safePreview(item.title),
        state,
        tool: null,
        summary: safePreview(item.note) || null,
        retryable: state === "failed",
      } satisfies AgentPlanPanelStep;
    });
    return completeModel("checklist", safePreview(todoList.title) || null, steps);
  }

  if (tasks.length) {
    const steps = [...tasks]
      .sort((left, right) => left.updatedAt - right.updatedAt)
      .map((task, position) => {
        const state = normalizeState(task.status);
        return {
          id: task.taskId || `task-${position + 1}`,
          index: position + 1,
          title: safePreview(task.description),
          state,
          tool: null,
          summary:
            typeof task.progressPct === "number" && state === "running"
              ? `${Math.round(task.progressPct)}%`
              : null,
          retryable: state === "failed",
        } satisfies AgentPlanPanelStep;
      });
    return completeModel("tasks", null, steps);
  }

  return completeModel("idle", null, []);
}
