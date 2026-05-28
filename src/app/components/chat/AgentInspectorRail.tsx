import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  Brain,
  Boxes,
  CalendarClock,
  CheckCircle2,
  Circle,
  Globe2,
  Loader2,
  PanelRightClose,
  ShieldAlert,
} from "lucide-react";
import type { AgentSessionMode } from "@/lib/api";
import { DEFAULT_AGENT_MODEL_ID, resolveAgentModel } from "@/lib/agentModelCatalog";
import { cn } from "@/lib/utils";
import type { ZakiRuntimeSandbox } from "@/stores/zakiSessionUiStore";
import {
  V2InlineRow,
  V2Meter,
  V2MetricGrid,
  V2Panel,
  V2PanelHead,
  V2Tabs,
} from "@/app/components/v2";
import type {
  NullalisApprovalRequest,
  NullalisNarrationFrame,
  NullalisTaskItem,
  NullalisTaskStatus,
  NullalisTranscriptEntry,
  ZakiUsageSummary,
} from "./BotStatusRail";
import type { ContextGaugeData } from "./NullalisRuntimeWidgets";
import { composeTurnTimeline } from "./NullalisTurnTimeline";
import { buildAgentInspectorPanelModel } from "./AgentInspectorPanelModel";

export type AgentInspectorTab =
  | "plan"
  | "cron"
  | "sources"
  | "artifacts"
  | "browser"
  | "trace";

export type AgentInspectorTabRequest = {
  tab: AgentInspectorTab;
  id: number;
};

export type AgentInspectorCronJob = {
  id: string;
  name: string;
  schedule: string | null;
  prompt: string | null;
  status: string | null;
  enabled: boolean;
  paused: boolean;
  nextRunAt: number | null;
  lastRunAt: number | null;
  lastStatus: string | null;
  failureCount: number;
};

export type AgentInspectorArtifact = {
  id: string;
  title: string;
  type: string | null;
  version: string | number | null;
  updatedAt: number | null;
};

const APP_BROWSER_TOOLS = ["web_fetch", "web_search", "playwright_*"] as const;
const EXTENSION_BROWSER_TOOLS = [
  "extension_navigate",
  "extension_click",
  "extension_type",
  "extension_fill_form",
  "extension_screenshot",
  "extension_get_text",
  "extension_get_dom",
  "extension_wait_for",
  "extension_scroll",
  "extension_list_tabs",
] as const;

export type AgentInspectorRailProps = {
  mode: AgentSessionMode | null;
  isStreaming: boolean;
  lastChannel?: string | null;
  sandbox: ZakiRuntimeSandbox | null;
  tasks: NullalisTaskItem[];
  tasksLoading?: boolean;
  tasksError?: string | null;
  cronJobs?: AgentInspectorCronJob[];
  cronLoading?: boolean;
  cronError?: string | null;
  artifacts?: AgentInspectorArtifact[];
  artifactsLoading?: boolean;
  artifactsError?: string | null;
  transcriptEntries: NullalisTranscriptEntry[];
  narrationFrame: NullalisNarrationFrame | null;
  approvalRequest: NullalisApprovalRequest | null;
  artifactCount?: number;
  contextGaugeData: ContextGaugeData | null;
  usageSummary: ZakiUsageSummary | null;
  quotaInfo: { limit: number; remaining: number } | null;
  onOpenMemory?: () => void;
  onOpenCron?: () => void;
  onOpenBrowser?: () => void;
  onOpenArtifacts?: () => void;
  onOpenTrace?: () => void;
  tabRequest?: AgentInspectorTabRequest | null;
  onClose?: () => void;
};

function taskStatusLabel(status: NullalisTaskStatus) {
  if (status === "succeeded") return "done";
  return status;
}

function taskStatusIcon(status: NullalisTaskStatus) {
  if (status === "done" || status === "succeeded") {
    return <CheckCircle2 className="zaki-agent-inspector__status-icon is-done" aria-hidden />;
  }
  if (status === "running") {
    return <Loader2 className="zaki-agent-inspector__status-icon is-running" aria-hidden />;
  }
  if (status === "failed" || status === "blocked" || status === "cancelled") {
    return <ShieldAlert className="zaki-agent-inspector__status-icon is-alert" aria-hidden />;
  }
  return <Circle className="zaki-agent-inspector__status-icon" aria-hidden />;
}

function formatTokens(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0";
  if (value < 1000) return String(Math.round(value));
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}k`;
  return `${(value / 1_000_000).toFixed(1)}m`;
}

function formatCost(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "$0.00";
  const digits = value > 0 && value < 0.01 ? 3 : 2;
  return `$${value.toFixed(digits)}`;
}

function formatWeight(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0.0";
  return value.toFixed(value > 0 && value < 0.1 ? 2 : 1);
}

function contextPercent(data: ContextGaugeData | null): number | null {
  if (!data || !data.contextMax || data.contextMax <= 0) return null;
  const tokenCount =
    data.tokenCount ??
    Math.round(((data.context_pressure_percent ?? 0) / 100) * data.contextMax);
  return Math.min(100, Math.max(0, (tokenCount / data.contextMax) * 100));
}

function modeLabel(mode: AgentSessionMode | null) {
  if (mode === "plan") return "Plan";
  if (mode === "review") return "Review";
  return "Execute";
}

function isCompleteTask(status: NullalisTaskStatus) {
  return status === "done" || status === "succeeded";
}

function taskVisualState(status: NullalisTaskStatus) {
  if (isCompleteTask(status)) return "done";
  if (status === "running") return "live";
  if (status === "failed" || status === "blocked" || status === "cancelled") return "blocked";
  return "queued";
}

function traceLevel(event: { state: NullalisTranscriptEntry["resultState"]; meta: string | null }) {
  if (event.state === "failed" || event.state === "blocked") return "warn";
  if (event.state === "running") return "run";
  if (event.state === "queued") return "wait";
  if (/\b(error|failed|blocked|warn)\b/i.test(event.meta ?? "")) return "warn";
  return "ok";
}

function traceLevelLabel(level: ReturnType<typeof traceLevel>) {
  if (level === "warn") return "WARN";
  if (level === "run") return "RUN";
  if (level === "wait") return "WAIT";
  return "OK";
}

function formatClock(timestamp: number): string {
  if (!timestamp) return "--:--:--";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(timestamp));
  } catch {
    return "--:--:--";
  }
}

function formatCalendarStamp(timestamp?: number | null): string {
  if (!timestamp) return "not scheduled";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(timestamp));
  } catch {
    return "not scheduled";
  }
}

function formatDurationShort(ms?: number | null): string {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "--";
  if (ms < 1000) return `${Math.max(1, Math.round(ms))}ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
}

function eventText(event: {
  label: string;
  summary: string;
  command: string | null;
  files: string[];
}) {
  const file = event.files[0];
  if (event.command) return `${event.label} · ${event.command}`;
  if (file) return `${event.label} · ${file}`;
  return `${event.label} · ${event.summary}`;
}

function eventMetaShort(event: { meta: string | null; durationMs: number | null }) {
  if (event.meta) return event.meta;
  return typeof event.durationMs === "number" ? formatDurationShort(event.durationMs) : "";
}

function frameMeta(frame: NullalisNarrationFrame | null) {
  if (!frame) return "session scoped";
  const bits = [
    frame.phase.replace(/_/g, " "),
    frame.tool,
    frame.stepIndex != null && frame.stepTotal != null
      ? `${frame.stepIndex + 1}/${frame.stepTotal}`
      : null,
    typeof frame.durationMs === "number" ? formatDurationShort(frame.durationMs) : null,
  ].filter(Boolean);
  return bits.join(" · ");
}

function eventHasExtensionSignal(event: {
  label: string;
  summary: string;
  command: string | null;
  files: string[];
}) {
  return /\bextension[_\w]*\b/i.test(eventText(event));
}

function eventHasAppBrowserSignal(event: {
  label: string;
  summary: string;
  command: string | null;
  files: string[];
}) {
  if (eventHasExtensionSignal(event)) return false;
  return /\b(browser|playwright|web_fetch|web_search|page\.|screenshot|navigate)\b/i.test(
    eventText(event)
  );
}

function cronJobHealth(job: AgentInspectorCronJob) {
  if (job.paused || !job.enabled) return "paused";
  if (job.failureCount > 0 || /\b(failed|error|lost|timed_out)\b/i.test(job.lastStatus || "")) {
    return "attention";
  }
  if (/\brunning\b/i.test(job.status || "")) return "running";
  return "scheduled";
}

function cronJobHealthLabel(job: AgentInspectorCronJob) {
  const health = cronJobHealth(job);
  if (health === "attention") {
    return job.failureCount > 0 ? `${job.failureCount} failures` : "attention";
  }
  return health;
}

function artifactVersionLabel(artifact: AgentInspectorArtifact, index: number) {
  const version = artifact.version != null ? `v${artifact.version}` : `v${index + 1}`;
  return `${version} · ${formatCalendarStamp(artifact.updatedAt)}`;
}

function PanelActionButton({
  children,
  onClick,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      className="zaki-agent-inspector__panel-action"
      onClick={onClick}
      disabled={!onClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

export function AgentInspectorRail({
  mode,
  isStreaming,
  lastChannel = null,
  sandbox,
  tasks,
  tasksLoading = false,
  tasksError = null,
  cronJobs = [],
  cronLoading = false,
  cronError = null,
  artifacts = [],
  artifactsLoading = false,
  artifactsError = null,
  transcriptEntries,
  narrationFrame,
  approvalRequest,
  artifactCount = 0,
  contextGaugeData,
  usageSummary,
  quotaInfo,
  onOpenMemory,
  onOpenCron,
  onOpenBrowser,
  onOpenArtifacts,
  onOpenTrace,
  tabRequest = null,
  onClose,
}: AgentInspectorRailProps) {
  const [tab, setTab] = useState<AgentInspectorTab>("plan");
  const [manualTabSelected, setManualTabSelected] = useState(false);

  const timelineBlocks = useMemo(
    () => composeTurnTimeline(transcriptEntries),
    [transcriptEntries]
  );
  const panelModel = useMemo(
    () => buildAgentInspectorPanelModel(transcriptEntries),
    [transcriptEntries]
  );
  const recentTrace = panelModel.trace;
  const sourceEntries = panelModel.sources;
  const artifactEntries = panelModel.artifacts;
  const primaryBackendArtifact = artifacts[0] ?? null;
  const artifactSourceCount = artifactCount || artifactEntries.length || artifacts.length;
  const browserEntries = panelModel.browser;
  const cronEntries = panelModel.cron;
  const cronSourceCount = cronJobs.length || cronEntries.length;
  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => a.updatedAt - b.updatedAt),
    [tasks]
  );
  const completedTaskCount = sortedTasks.filter((task) => isCompleteTask(task.status)).length;
  const runningTask = sortedTasks.find((task) => task.status === "running") ?? null;
  const weightedTaskProgress = sortedTasks.reduce((total, task) => {
    if (isCompleteTask(task.status)) return total + 1;
    if (task.status === "running" && typeof task.progressPct === "number") {
      return total + Math.max(0, Math.min(100, task.progressPct)) / 100;
    }
    return total;
  }, 0);
  const planPercent = sortedTasks.length
    ? Math.round((weightedTaskProgress / sortedTasks.length) * 100)
    : 0;
  const ctxPct = contextPercent(contextGaugeData);
  const currentMode = mode ?? "execute";
  const sandboxLabel = sandbox?.enabled
    ? sandbox.backend
      ? sandbox.backend
      : "enabled"
    : "off";
  const defaultModel = resolveAgentModel(DEFAULT_AGENT_MODEL_ID);
  const weeklyRemaining =
    quotaInfo && quotaInfo.limit > 0
      ? Math.max(0, Math.min(100, (quotaInfo.remaining / quotaInfo.limit) * 100))
      : null;
  const browserActivity =
    browserEntries.length > 0 || /\b(browser|playwright|extension)\b/i.test(lastChannel ?? "");
  const extensionActivity = browserEntries.some(eventHasExtensionSignal);
  const appBrowserActivity =
    browserEntries.some(eventHasAppBrowserSignal) ||
    /\b(browser|playwright|web_fetch|web_search)\b/i.test(lastChannel ?? "");
  const delegatedEvent = cronEntries.find((event) =>
    /\b(subagent|spawned|background|worker)\b/i.test(`${event.label} ${event.summary}`)
  );
  const traceWarnCount = recentTrace.filter((event) => traceLevel(event) === "warn").length;
  const traceToolCount = recentTrace.filter((event) =>
    /\b(tool|browser|file|memory|artifact|extension|playwright|cron|automation)\b/i.test(
      `${event.label} ${event.summary}`
    )
  ).length;
  const latestLatency =
    recentTrace.find((event) => typeof event.durationMs === "number")?.durationMs ?? null;
  const primaryArtifact = artifactEntries[0] ?? null;
  const latestPlanSignal =
    narrationFrame?.label ||
    runningTask?.description ||
    recentTrace[0]?.summary ||
    (isStreaming ? "Waiting for the next runtime event." : "No active run.");
  const narrationLog = recentTrace.slice(0, 4);
  const handleTabChange = (nextTab: AgentInspectorTab) => {
    setManualTabSelected(true);
    setTab(nextTab);
  };

  useEffect(() => {
    if (!tabRequest) return;
    setManualTabSelected(true);
    setTab(tabRequest.tab);
  }, [tabRequest?.id, tabRequest?.tab]);

  useEffect(() => {
    if (tabRequest) return;
    if (manualTabSelected) return;
    if (approvalRequest) {
      setTab("plan");
      return;
    }
    if (sortedTasks.length) {
      setTab("plan");
      return;
    }
    if (artifactSourceCount) {
      setTab("artifacts");
      return;
    }
    if (browserActivity) {
      setTab("browser");
      return;
    }
    if (cronSourceCount) {
      setTab("cron");
      return;
    }
    if (sourceEntries.length) {
      setTab("sources");
    }
  }, [
    approvalRequest,
    artifactSourceCount,
    browserActivity,
    cronSourceCount,
    manualTabSelected,
    sourceEntries.length,
    sortedTasks.length,
    tabRequest,
  ]);

  return (
    <aside className="zaki-agent-inspector" aria-label="Agent inspector">
      <div className="zaki-agent-inspector__topline">
        <div>
          <span>Agent panel</span>
          <strong>{isStreaming ? "Live" : "Ready"}</strong>
        </div>
        {onClose ? (
          <button
            type="button"
            className="zaki-agent-inspector__close"
            onClick={onClose}
            aria-label="Hide right agent panel"
            title="Hide panel"
          >
            <PanelRightClose className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
      <V2Tabs
        fullWidth
        className="zaki-agent-inspector__tabs"
        ariaLabel="Agent panels"
        value={tab}
        onChange={handleTabChange}
        options={[
          { id: "plan", label: "Plan", count: approvalRequest ? "!" : sortedTasks.length || undefined },
          { id: "cron", label: "Cron", count: cronSourceCount || undefined },
          { id: "sources", label: "Sources", count: sourceEntries.length || undefined },
          {
            id: "artifacts",
            label: "Artifacts",
            count: artifactSourceCount || undefined,
          },
          {
            id: "browser",
            label: "Browser",
            count: browserActivity ? "live" : sandbox?.enabled ? "on" : undefined,
          },
          { id: "trace", label: "Trace", count: recentTrace.length || undefined },
        ]}
      />

      <div className="zaki-agent-inspector__body">
        {tab === "plan" ? (
          <V2Panel aria-label="Plan" className="zaki-agent-inspector__pane">
            <div className="zaki-agent-inspector__plan-head">
              <div>
                <div className="zaki-agent-inspector__plan-title">current plan</div>
                <div className="zaki-agent-inspector__plan-meta">
                  <span className="zaki-agent-inspector__plan-progress">
                    <span className="bar" aria-hidden>
                      <span className="fill" style={{ width: `${planPercent}%` }} />
                    </span>
                    <span className="num">
                      {completedTaskCount} / {sortedTasks.length || 0}
                    </span>
                  </span>
                  <span className="sep">.</span>
                  <span>
                    {runningTask
                      ? `${Math.round(runningTask.progressPct ?? planPercent)}% live`
                      : isStreaming
                        ? "forming"
                        : "idle"}
                  </span>
                </div>
              </div>
            </div>
            {approvalRequest ? (
              <V2InlineRow
                tone="warn"
                icon={<ShieldAlert className="size-4" aria-hidden />}
                title={approvalRequest.tool}
                meta={approvalRequest.riskLevel || "approval needed"}
              />
            ) : null}
            <section
              className={cn("zaki-agent-inspector__narration", isStreaming && "is-live")}
              aria-live={isStreaming ? "polite" : undefined}
              data-testid="agent-narration-box"
            >
              <div className="zaki-agent-inspector__narration-head">
                <span>narration</span>
                <span>{frameMeta(narrationFrame)}</span>
              </div>
              <strong>{approvalRequest ? `Waiting on ${approvalRequest.tool}` : latestPlanSignal}</strong>
              <small>
                {approvalRequest
                  ? approvalRequest.reason || "Approval required before this run continues."
                  : isStreaming
                    ? "Live operational trail from the agent runtime."
                    : "Latest operational trail for this session."}
              </small>
              {narrationLog.length ? (
                <ol className="zaki-agent-inspector__narration-log">
                  {narrationLog.map((event) => (
                    <li key={event.id}>
                      <span className="time">{formatClock(event.timestamp)}</span>
                      <span className="text">{eventText(event)}</span>
                      <span className="meta">{eventMetaShort(event)}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </section>
            {sortedTasks.length ? (
              <ol className="zaki-agent-inspector__plan-list">
                {sortedTasks.map((task) => (
                  <li
                    key={task.taskId}
                    className={cn(
                      "zaki-agent-inspector__todo",
                      `is-${taskVisualState(task.status)}`
                    )}
                  >
                    <div className="zaki-agent-inspector__todo-mark" aria-hidden>
                      {taskStatusIcon(task.status)}
                    </div>
                    <div className="zaki-agent-inspector__todo-body">
                      <div className="zaki-agent-inspector__todo-text">
                        {task.description || task.taskId}
                      </div>
                      <div className="zaki-agent-inspector__todo-meta">
                        <span>{taskStatusLabel(task.status)}</span>
                        {typeof task.progressPct === "number" && task.status === "running" ? (
                          <>
                            <span className="sep">.</span>
                            <span>{Math.round(task.progressPct)}%</span>
                          </>
                        ) : null}
                      </div>
                      {task.status === "running" && delegatedEvent ? (
                        <div className="zaki-agent-inspector__subagent">
                          <span className="sa-branch" aria-hidden />
                          <span className="sa-badge">subagent</span>
                          <span className="sa-text">{delegatedEvent.summary}</span>
                          <span className="sa-status">{delegatedEvent.meta || "live"}</span>
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : null}
            {tasksLoading && !sortedTasks.length ? (
              <div className="v2-empty-line">Loading task ledger...</div>
            ) : null}
            {tasksError ? (
              <div className="v2-empty-line">Task ledger unavailable: {tasksError}</div>
            ) : null}
            <div className="zaki-agent-inspector__plan-foot">
              <span>
                {isStreaming
                  ? "Live plan updates are attached to this run."
                  : "Backend task ledger and live run events are scoped to this session."}
              </span>
            </div>
          </V2Panel>
        ) : null}

        {tab === "cron" ? (
          <V2Panel aria-label="Cron" className="zaki-agent-inspector__pane">
            <div className="zaki-agent-inspector__cron-head">
              <div>
                <div className="zaki-agent-inspector__cron-title">schedules</div>
                <div className="zaki-agent-inspector__cron-meta">
                  <span>
                    <span className={cn("dot", cronSourceCount || isStreaming ? "running" : "")} aria-hidden />
                    {cronJobs.length
                      ? `${cronJobs.length} scheduled`
                      : cronEntries.length
                        ? `${cronEntries.length} linked`
                      : isStreaming
                        ? "foreground run active"
                        : "none active"}
                  </span>
                  <span className="sep">.</span>
                  <span>{cronJobs.length ? "backend ledger" : "session scoped"}</span>
                </div>
              </div>
            </div>
            {cronLoading && !cronJobs.length ? (
              <div className="v2-empty-line">Loading schedule ledger...</div>
            ) : null}
            {cronError ? (
              <div className="v2-empty-line">Schedule ledger unavailable: {cronError}</div>
            ) : null}
            {cronJobs.length ? (
              <ol className="zaki-agent-inspector__cron-list">
                {cronJobs.map((job) => {
                  const health = cronJobHealth(job);
                  return (
                    <li
                      key={job.id}
                      className={cn(
                        "zaki-agent-inspector__cron-row",
                        health === "running" ? "is-running" : "is-scheduled"
                      )}
                    >
                      <div className="zaki-agent-inspector__cron-status" aria-hidden>
                        <span className={health === "running" ? "dot" : "ring"} />
                      </div>
                      <div className="zaki-agent-inspector__cron-main">
                        <div className="zaki-agent-inspector__cron-name">{job.name}</div>
                        <div className="zaki-agent-inspector__cron-sched">
                          {job.schedule || "schedule pending"}
                          {" · "}
                          {cronJobHealthLabel(job)}
                        </div>
                        {job.prompt ? (
                          <div className="zaki-agent-inspector__cron-sched">
                            {job.prompt}
                          </div>
                        ) : null}
                        <div className="zaki-agent-inspector__cron-sched">
                          next {formatCalendarStamp(job.nextRunAt)} · last{" "}
                          {formatCalendarStamp(job.lastRunAt)}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : null}
            {cronEntries.length ? (
              <ol className="zaki-agent-inspector__cron-list">
                {cronEntries.map((event) => (
                  <li
                    key={event.id}
                    className={cn(
                      "zaki-agent-inspector__cron-row",
                      event.state === "running" ? "is-running" : "is-scheduled"
                    )}
                  >
                    <div className="zaki-agent-inspector__cron-status" aria-hidden>
                      <span className={event.state === "running" ? "dot" : "ring"} />
                    </div>
                    <div className="zaki-agent-inspector__cron-main">
                      <div className="zaki-agent-inspector__cron-name">{event.label}</div>
                      <div className="zaki-agent-inspector__cron-sched">
                        {event.summary}
                        {event.meta ? ` · ${event.meta}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : !cronJobs.length && !cronLoading ? (
              <div className="v2-empty-line">
                No linked cron jobs or autonomous follow-ups in this session.
              </div>
            ) : null}
            <PanelActionButton onClick={onOpenCron} ariaLabel="Open schedule manager">
              <CalendarClock className="size-4" aria-hidden />
              New schedule
            </PanelActionButton>
          </V2Panel>
        ) : null}

        {tab === "sources" ? (
          <V2Panel aria-label="Sources" className="zaki-agent-inspector__pane">
            <V2PanelHead title="Sources" meta={lastChannel || "agent"} />
            <V2Meter
              label="Context window"
              value={ctxPct}
              detail={
                contextGaugeData
                  ? `${formatTokens(contextGaugeData.tokenCount)} / ${formatTokens(contextGaugeData.contextMax)} tokens`
                  : "No context sample"
              }
            />
            {weeklyRemaining != null ? (
              <V2Meter
                label="Weekly allowance"
                value={weeklyRemaining}
                detail={`${quotaInfo?.remaining ?? 0} of ${quotaInfo?.limit ?? 0} preview turns`}
              />
            ) : null}
            <V2MetricGrid
              columns={2}
              items={[
                { id: "memory", label: "Memory", value: "User scoped" },
                { id: "model", label: "Model", value: defaultModel.label },
              ]}
            />
            {sourceEntries.length ? (
              <div className="zaki-agent-inspector__source-stack">
                {sourceEntries.map((event, index) => (
                  <article key={event.id} className="zaki-agent-inspector__source-doc">
                    <div className="zaki-agent-inspector__source-head">
                      <span className="name">{event.files[0] || event.label}</span>
                      <span className="meta">
                        [{index + 1}] · {event.meta || formatClock(event.timestamp)}
                      </span>
                    </div>
                    <div className="zaki-agent-inspector__source-body">
                      <span className="hl">{event.summary}</span>
                      {event.files.length > 1 ? (
                        <small>{event.files.slice(1).join(", ")}</small>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="v2-empty-line">
                No sources surfaced in this turn yet.
              </div>
            )}
            <PanelActionButton onClick={onOpenMemory} ariaLabel="Open memory graph">
              <Brain className="size-4" aria-hidden />
              Open memory graph
            </PanelActionButton>
          </V2Panel>
        ) : null}

        {tab === "artifacts" ? (
          <V2Panel aria-label="Artifacts" className="zaki-agent-inspector__pane">
            <div className="zaki-agent-inspector__artifact-versions">
              {(artifactEntries.length
                ? artifactEntries
                : artifacts.length
                  ? artifacts
                  : primaryArtifact
                    ? [primaryArtifact]
                    : [])
                .slice(0, 3)
                .map((event, index) => (
                  <span
                    key={event.id}
                    className={cn("version", index === 0 && "is-active")}
                  >
                    {"timestamp" in event
                      ? `v${artifactEntries.length - index || 1} · ${
                          index === 0 && isStreaming ? "live" : formatClock(event.timestamp)
                        }`
                      : artifactVersionLabel(event, index)}
                  </span>
                ))}
              {!artifactEntries.length && !artifacts.length ? (
                <span className="version is-active">v0 · waiting</span>
              ) : null}
              <span className="diff">{artifactSourceCount || 0} records</span>
            </div>
            <article className="zaki-agent-inspector__artifact-doc">
              <header className="zaki-agent-inspector__artifact-head">
                <div className="tag">
                  output · {primaryArtifact ? "captured" : primaryBackendArtifact ? "stored" : "idle"}
                </div>
                <div className="title">
                  {primaryArtifact?.files[0] ||
                    primaryArtifact?.label ||
                    primaryBackendArtifact?.title ||
                    "No artifact activity"}
                </div>
                <div className="sub">
                  {primaryArtifact?.meta ||
                    primaryBackendArtifact?.type ||
                    "Documents, canvases, exports, and generated files"}
                </div>
              </header>
              <div className="zaki-agent-inspector__artifact-body">
                {primaryArtifact ? (
                  <p>{primaryArtifact.summary}</p>
                ) : primaryBackendArtifact ? (
                  <p>Stored artifact from the backend ledger.</p>
                ) : (
                  <p>Generated outputs will appear here as the agent creates them.</p>
                )}
              </div>
            </article>
            {artifactsLoading && !artifacts.length ? (
              <div className="v2-empty-line">Loading artifact ledger...</div>
            ) : null}
            {artifactsError ? (
              <div className="v2-empty-line">Artifact ledger unavailable: {artifactsError}</div>
            ) : null}
            {artifactEntries.length ? (
              <ol className="zaki-agent-inspector__event-list">
                {artifactEntries.map((event) => (
                  <li key={event.id}>
                    <Boxes className="zaki-agent-inspector__event-icon" aria-hidden />
                    <div>
                      <strong>{event.label}</strong>
                      <span>{event.summary}</span>
                      {event.files.length ? <small>{event.files.join(", ")}</small> : event.meta ? <small>{event.meta}</small> : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : null}
            {!artifactEntries.length && artifacts.length ? (
              <ol className="zaki-agent-inspector__event-list">
                {artifacts.slice(0, 5).map((artifact) => (
                  <li key={artifact.id}>
                    <Boxes className="zaki-agent-inspector__event-icon" aria-hidden />
                    <div>
                      <strong>{artifact.title}</strong>
                      <span>{artifact.type || "artifact"}</span>
                      <small>{artifactVersionLabel(artifact, 0)}</small>
                    </div>
                  </li>
                ))}
              </ol>
            ) : null}
            <PanelActionButton onClick={onOpenArtifacts} ariaLabel="Open artifacts manager">
              <Boxes className="size-4" aria-hidden />
              Open artifacts
            </PanelActionButton>
          </V2Panel>
        ) : null}

        {tab === "browser" ? (
          <V2Panel aria-label="Browser" className="zaki-agent-inspector__pane">
            <V2PanelHead title="Browser" meta={sandboxLabel} />
            <V2InlineRow
              tone={browserActivity || sandbox?.enabled ? "accent" : "default"}
              icon={<Globe2 className="size-4" aria-hidden />}
              title={browserActivity ? "Browser activity detected" : "Dual browser lanes ready"}
              meta="App browser plus user-browser extension"
            />
            <div className="zaki-agent-inspector__browser-lanes" data-testid="agent-browser-lanes">
              <article className={cn("zaki-agent-inspector__browser-lane", appBrowserActivity && "is-active")}>
                <div className="lane-kicker">app browser</div>
                <div className="lane-title">
                  {appBrowserActivity ? "public-web automation active" : "public-web automation"}
                </div>
                <p>Public pages, screenshots, search, and Playwright control without user-login cookies.</p>
                <div className="lane-tools" aria-label="App browser tools">
                  {APP_BROWSER_TOOLS.map((tool) => (
                    <span key={tool}>{tool}</span>
                  ))}
                </div>
              </article>
              <article className={cn("zaki-agent-inspector__browser-lane", extensionActivity && "is-active")}>
                <div className="lane-kicker">user browser extension</div>
                <div className="lane-title">
                  {extensionActivity ? "logged-in browser active" : "logged-in browser lane"}
                </div>
                <p>Paired extension lane for the user's authenticated tabs, with supervised approval gates.</p>
                <div className="lane-tools" aria-label="User browser extension tools">
                  {EXTENSION_BROWSER_TOOLS.slice(0, 4).map((tool) => (
                    <span key={tool}>{tool}</span>
                  ))}
                  <span>+{EXTENSION_BROWSER_TOOLS.length - 4}</span>
                </div>
              </article>
            </div>
            <dl className="zaki-agent-inspector__fact-grid">
              <div>
                <dt>App lane</dt>
                <dd>{sandboxLabel}</dd>
              </div>
              <div>
                <dt>Extension lane</dt>
                <dd>{extensionActivity ? "active" : "pairing"}</dd>
              </div>
            </dl>
            {browserEntries.length ? (
              <ol className="zaki-agent-inspector__event-list">
                {browserEntries.map((event) => (
                  <li key={event.id}>
                    <Globe2 className="zaki-agent-inspector__event-icon" aria-hidden />
                    <div>
                      <strong>{event.label}</strong>
                      <span>{event.summary}</span>
                      {event.meta ? <small>{event.meta}</small> : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="v2-empty-line">
                Browser traces will appear here when the agent opens or controls a page.
              </div>
            )}
            <PanelActionButton onClick={onOpenBrowser} ariaLabel="Open browser controls">
              <Globe2 className="size-4" aria-hidden />
              Open browser controls
            </PanelActionButton>
          </V2Panel>
        ) : null}

        {tab === "trace" ? (
          <V2Panel aria-label="Trace" className="zaki-agent-inspector__pane">
            <div className="zaki-agent-inspector__trace-now">
              <div className="cell">
                <div className="label">latency</div>
                <div className="value">{formatDurationShort(latestLatency)}</div>
              </div>
              <div className="cell">
                <div className="label">tools</div>
                <div className="value">
                  {traceToolCount}<span className="unit"> · {traceWarnCount} warn</span>
                </div>
              </div>
              <div className="cell">
                <div className="label">tokens</div>
                <div className="value">{formatTokens(usageSummary?.usageTokens)}</div>
              </div>
              <div className="cell">
                <div className="label">model</div>
                <div className="value">{defaultModel.id}<span className="unit"> · {modeLabel(currentMode)}</span></div>
              </div>
            </div>
            {narrationFrame ? (
              <V2InlineRow
                tone="accent"
                icon={<Activity className="size-4" aria-hidden />}
                title={narrationFrame.label}
                meta={narrationFrame.tool || narrationFrame.phase}
              />
            ) : null}
            <dl className="zaki-agent-inspector__fact-grid">
              <div>
                <dt>Cost</dt>
                <dd>{formatCost(usageSummary?.costUsd)}</dd>
              </div>
              <div>
                <dt>Turn weight</dt>
                <dd>{formatWeight(usageSummary?.turnWeight)}</dd>
              </div>
              <div>
                <dt>Session</dt>
                <dd>{formatWeight(usageSummary?.sessionWeight)}</dd>
              </div>
              <div>
                <dt>Blocks</dt>
                <dd>{timelineBlocks.length}</dd>
              </div>
            </dl>
            {recentTrace.length ? (
              <div className="zaki-agent-inspector__trace-steps">
                {recentTrace.map((event) => {
                  const level = traceLevel(event);
                  return (
                    <div key={event.id} className="zaki-agent-inspector__trace-step">
                      <span className="ts">{formatClock(event.timestamp)}</span>
                      <span className={cn("lvl", `is-${level}`)}>
                        {traceLevelLabel(level)}
                      </span>
                      <span className="msg">{eventText(event)}</span>
                      <span className="ms">{formatDurationShort(event.durationMs)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="v2-empty-line">
                {isStreaming ? "Waiting for trace events." : "No trace in this turn."}
              </div>
            )}
            <PanelActionButton onClick={onOpenTrace} ariaLabel="Open trace viewer">
              <Activity className="size-4" aria-hidden />
              Open trace viewer
            </PanelActionButton>
          </V2Panel>
        ) : null}
      </div>
    </aside>
  );
}
