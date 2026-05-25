import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Brain,
  CheckCircle2,
  Circle,
  Clock3,
  FileDown,
  Loader2,
  PanelRight,
  Radio,
  Share2,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import type { AgentSessionMode } from "@/lib/api";
import type { ZakiRuntimeSandbox } from "@/stores/zakiSessionUiStore";
import { cn } from "@/lib/utils";
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

type AgentInspectorTab = "plan" | "trace" | "context";

export type AgentInspectorRailProps = {
  mode: AgentSessionMode | null;
  modePending?: boolean;
  onModeChange?: (mode: AgentSessionMode) => void | Promise<void>;
  isStreaming: boolean;
  live?: boolean | null;
  lastChannel?: string | null;
  sandbox: ZakiRuntimeSandbox | null;
  tasks: NullalisTaskItem[];
  transcriptEntries: NullalisTranscriptEntry[];
  narrationFrame: NullalisNarrationFrame | null;
  approvalRequest: NullalisApprovalRequest | null;
  approvalCount?: number;
  contextGaugeData: ContextGaugeData | null;
  usageSummary: ZakiUsageSummary | null;
  quotaInfo: { limit: number; remaining: number } | null;
  turnStartedAt?: number | null;
  turnDurationMs?: number | null;
  onOpenMemory?: () => void;
  onShare?: () => void;
  onExport?: () => void;
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

function formatElapsed(ms: number): string {
  const safe = Math.max(0, Math.trunc(ms));
  if (safe < 1000) return "1s";
  const total = Math.floor(safe / 1000);
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes < 60) return `${minutes}m ${seconds}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
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

export function AgentInspectorRail({
  mode,
  modePending = false,
  onModeChange,
  isStreaming,
  live = null,
  lastChannel = null,
  sandbox,
  tasks,
  transcriptEntries,
  narrationFrame,
  approvalRequest,
  approvalCount = 0,
  contextGaugeData,
  usageSummary,
  quotaInfo,
  turnStartedAt = null,
  turnDurationMs = null,
  onOpenMemory,
  onShare,
  onExport,
}: AgentInspectorRailProps) {
  const [tab, setTab] = useState<AgentInspectorTab>("plan");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isStreaming) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isStreaming]);

  const timelineBlocks = useMemo(
    () => composeTurnTimeline(transcriptEntries),
    [transcriptEntries]
  );
  const recentTrace = useMemo(() => transcriptEntries.slice(-7).reverse(), [transcriptEntries]);
  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => a.updatedAt - b.updatedAt),
    [tasks]
  );
  const ctxPct = contextPercent(contextGaugeData);
  const elapsed =
    turnDurationMs != null
      ? turnDurationMs
      : turnStartedAt != null
        ? now - turnStartedAt
        : null;
  const currentMode = mode ?? "execute";
  const activeApprovals = approvalRequest ? Math.max(1, approvalCount) : approvalCount;
  const sandboxLabel = sandbox?.enabled
    ? sandbox.backend
      ? sandbox.backend
      : "enabled"
    : "off";
  const liveState = live === true || isStreaming;
  const weeklyRemaining =
    quotaInfo && quotaInfo.limit > 0
      ? Math.max(0, Math.min(100, (quotaInfo.remaining / quotaInfo.limit) * 100))
      : null;

  return (
    <aside className="zaki-agent-inspector" aria-label="Agent inspector">
      <div className="zaki-agent-inspector__head">
        <div>
          <p className="zaki-agent-inspector__kicker">Agent Ops</p>
          <h2>ZAKI Agent</h2>
        </div>
        <span className={cn("zaki-agent-inspector__live", liveState && "is-live")}>
          <Radio className="size-3" aria-hidden />
          {liveState ? "Live" : "Idle"}
        </span>
      </div>

      <div className="zaki-agent-inspector__status-grid" aria-label="Runtime status">
        <div>
          <span>Mode</span>
          <strong>{modeLabel(currentMode)}</strong>
        </div>
        <div>
          <span>Sandbox</span>
          <strong>{sandboxLabel}</strong>
        </div>
        <div>
          <span>Approvals</span>
          <strong>{activeApprovals}</strong>
        </div>
        <div>
          <span>Elapsed</span>
          <strong>{elapsed != null ? formatElapsed(elapsed) : "0s"}</strong>
        </div>
      </div>

      <div className="zaki-agent-inspector__modes" aria-label="Agent mode">
        {(["plan", "execute", "review"] as const).map((entry) => (
          <button
            key={entry}
            type="button"
            disabled={modePending || !onModeChange}
            aria-pressed={currentMode === entry}
            onClick={() => {
              if (currentMode !== entry) void onModeChange?.(entry);
            }}
          >
            {entry}
          </button>
        ))}
      </div>

      <div className="zaki-agent-inspector__tabs" role="tablist" aria-label="Agent panels">
        {([
          ["plan", "Plan"],
          ["trace", "Trace"],
          ["context", "Context"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="zaki-agent-inspector__body">
        {tab === "plan" ? (
          <section className="zaki-agent-inspector__panel" aria-label="Plan">
            <div className="zaki-agent-inspector__panel-head">
              <span>Run Plan</span>
              <span>{sortedTasks.length || 0} steps</span>
            </div>
            {approvalRequest ? (
              <div className="zaki-agent-inspector__approval">
                <ShieldAlert className="size-4" aria-hidden />
                <div>
                  <strong>{approvalRequest.tool}</strong>
                  <span>{approvalRequest.riskLevel || "approval needed"}</span>
                </div>
              </div>
            ) : null}
            {sortedTasks.length ? (
              <ol className="zaki-agent-inspector__task-list">
                {sortedTasks.map((task) => (
                  <li key={task.taskId}>
                    {taskStatusIcon(task.status)}
                    <div>
                      <span>{task.description || task.taskId}</span>
                      <small>{taskStatusLabel(task.status)}</small>
                    </div>
                    {typeof task.progressPct === "number" && task.status === "running" ? (
                      <b>{Math.round(task.progressPct)}%</b>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="zaki-agent-inspector__empty">
                {isStreaming ? "Plan is forming." : "No active plan."}
              </div>
            )}
          </section>
        ) : null}

        {tab === "trace" ? (
          <section className="zaki-agent-inspector__panel" aria-label="Trace">
            <div className="zaki-agent-inspector__panel-head">
              <span>Activity Trace</span>
              <span>{timelineBlocks.length} blocks</span>
            </div>
            {narrationFrame ? (
              <div className="zaki-agent-inspector__now">
                <Activity className="size-4" aria-hidden />
                <div>
                  <strong>{narrationFrame.label}</strong>
                  <span>{narrationFrame.tool || narrationFrame.phase}</span>
                </div>
              </div>
            ) : null}
            {recentTrace.length ? (
              <ol className="zaki-agent-inspector__trace-list">
                {recentTrace.map((entry) => (
                  <li key={entry.id}>
                    <span className="zaki-agent-inspector__trace-dot" aria-hidden />
                    <div>
                      <strong>{entry.tool || entry.intent || entry.kind}</strong>
                      <span>{entry.activityLabel || entry.text}</span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="zaki-agent-inspector__empty">
                {isStreaming ? "Waiting for trace events." : "No trace in this turn."}
              </div>
            )}
          </section>
        ) : null}

        {tab === "context" ? (
          <section className="zaki-agent-inspector__panel" aria-label="Context">
            <div className="zaki-agent-inspector__panel-head">
              <span>Context</span>
              <span>{lastChannel || "agent"}</span>
            </div>
            <div className="zaki-agent-inspector__meter">
              <div>
                <span>Context window</span>
                <strong>{ctxPct != null ? `${Math.round(ctxPct)}%` : "0%"}</strong>
              </div>
              <div className="zaki-agent-inspector__bar" aria-hidden>
                <span style={{ width: `${ctxPct ?? 0}%` }} />
              </div>
              <small>
                {contextGaugeData
                  ? `${formatTokens(contextGaugeData.tokenCount)} / ${formatTokens(contextGaugeData.contextMax)} tokens`
                  : "No context sample"}
              </small>
            </div>
            {weeklyRemaining != null ? (
              <div className="zaki-agent-inspector__meter">
                <div>
                  <span>Weekly allowance</span>
                  <strong>{Math.round(weeklyRemaining)}%</strong>
                </div>
                <div className="zaki-agent-inspector__bar" aria-hidden>
                  <span style={{ width: `${weeklyRemaining}%` }} />
                </div>
                <small>
                  {quotaInfo?.remaining ?? 0} of {quotaInfo?.limit ?? 0} preview turns
                </small>
              </div>
            ) : null}
            <dl className="zaki-agent-inspector__facts">
              <div>
                <dt>Tokens</dt>
                <dd>{formatTokens(usageSummary?.usageTokens)}</dd>
              </div>
              <div>
                <dt>Cost</dt>
                <dd>{formatCost(usageSummary?.costUsd)}</dd>
              </div>
              <div>
                <dt>Memory</dt>
                <dd>User scoped</dd>
              </div>
            </dl>
          </section>
        ) : null}
      </div>

      <div className="zaki-agent-inspector__actions" aria-label="Agent actions">
        <button type="button" onClick={onOpenMemory} disabled={!onOpenMemory}>
          <Brain className="size-4" aria-hidden />
          Memory
        </button>
        <button type="button" onClick={onShare} disabled={!onShare}>
          <Share2 className="size-4" aria-hidden />
          Share
        </button>
        <button type="button" onClick={onExport} disabled={!onExport}>
          <FileDown className="size-4" aria-hidden />
          Export
        </button>
      </div>

      <div className="zaki-agent-inspector__foot">
        <span>
          <ShieldCheck className="size-3" aria-hidden />
          Server guarded
        </span>
        <span>
          <Clock3 className="size-3" aria-hidden />
          {lastChannel || "thread"}
        </span>
        <span>
          <PanelRight className="size-3" aria-hidden />
          V2
        </span>
      </div>
    </aside>
  );
}
