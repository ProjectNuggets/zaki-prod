import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Brain,
  Boxes,
  CheckCircle2,
  Circle,
  Clock3,
  FileDown,
  Globe2,
  Loader2,
  PanelRight,
  Radio,
  Settings2,
  Share2,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import type { AgentSessionMode } from "@/lib/api";
import { DEFAULT_AGENT_MODEL_ID, resolveAgentModel } from "@/lib/agentModelCatalog";
import type { ZakiRuntimeSandbox } from "@/stores/zakiSessionUiStore";
import {
  V2ActionGrid,
  V2Badge,
  V2InlineRow,
  V2Meter,
  V2MetricGrid,
  V2Panel,
  V2PanelHead,
  V2SegmentedControl,
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
  artifactCount?: number;
  contextGaugeData: ContextGaugeData | null;
  usageSummary: ZakiUsageSummary | null;
  quotaInfo: { limit: number; remaining: number } | null;
  turnStartedAt?: number | null;
  turnDurationMs?: number | null;
  onOpenMemory?: () => void;
  onOpenSettings?: () => void;
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
  artifactCount = 0,
  contextGaugeData,
  usageSummary,
  quotaInfo,
  turnStartedAt = null,
  turnDurationMs = null,
  onOpenMemory,
  onOpenSettings,
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
  const defaultModel = resolveAgentModel(DEFAULT_AGENT_MODEL_ID);
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
        <V2Badge tone={liveState ? "accent" : "default"} dot pulse={liveState}>
          <Radio className="size-3" aria-hidden />
          {liveState ? "Live" : "Idle"}
        </V2Badge>
      </div>

      <V2MetricGrid
        items={[
          { id: "mode", label: "Mode", value: modeLabel(currentMode).toUpperCase() },
          { id: "sandbox", label: "Sandbox", value: sandboxLabel.toUpperCase() },
          { id: "approvals", label: "Approvals", value: activeApprovals },
          {
            id: "elapsed",
            label: "Elapsed",
            value: elapsed != null ? formatElapsed(elapsed) : "0s",
          },
        ]}
      />

      <V2SegmentedControl
        fullWidth
        ariaLabel="Agent mode"
        value={currentMode}
        disabled={modePending}
        onChange={onModeChange}
        options={[
          { id: "plan", label: "Plan" },
          { id: "execute", label: "Execute" },
          { id: "review", label: "Review" },
        ]}
      />

      <V2Tabs
        fullWidth
        ariaLabel="Agent panels"
        value={tab}
        onChange={setTab}
        options={[
          { id: "plan", label: "Plan" },
          { id: "trace", label: "Trace" },
          { id: "context", label: "Context" },
        ]}
      />

      <V2Panel className="zaki-agent-inspector__capabilities" aria-label="Agent capabilities">
        <V2PanelHead title="Capability Plane" meta={defaultModel.contextWindow} />
        <div className="zaki-agent-inspector__capability-grid">
          <V2InlineRow
            icon={<Brain className="size-4" aria-hidden />}
            title="Graph Memory"
            meta="user scoped"
            tone="success"
          />
          <V2InlineRow
            icon={<Globe2 className="size-4" aria-hidden />}
            title="Browser Control"
            meta="server + extension"
            tone={sandbox?.enabled ? "success" : "accent"}
          />
          <V2InlineRow
            icon={<Boxes className="size-4" aria-hidden />}
            title="Artifacts"
            meta={artifactCount > 0 ? `${artifactCount} events` : "ready"}
            tone={artifactCount > 0 ? "accent" : "default"}
          />
          <V2InlineRow
            icon={<Activity className="size-4" aria-hidden />}
            title="Trace Share"
            meta={`${recentTrace.length} recent`}
            tone={recentTrace.length > 0 ? "accent" : "default"}
          />
        </div>
      </V2Panel>

      <div className="zaki-agent-inspector__body">
        {tab === "plan" ? (
          <V2Panel aria-label="Plan">
            <V2PanelHead title="Run Plan" meta={`${sortedTasks.length || 0} steps`} />
            {approvalRequest ? (
              <V2InlineRow
                tone="warn"
                icon={<ShieldAlert className="size-4" aria-hidden />}
                title={approvalRequest.tool}
                meta={approvalRequest.riskLevel || "approval needed"}
              />
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
              <div className="v2-empty-line">
                {isStreaming ? "Plan is forming." : "No active plan."}
              </div>
            )}
          </V2Panel>
        ) : null}

        {tab === "trace" ? (
          <V2Panel aria-label="Trace">
            <V2PanelHead title="Activity Trace" meta={`${timelineBlocks.length} blocks`} />
            {narrationFrame ? (
              <V2InlineRow
                tone="accent"
                icon={<Activity className="size-4" aria-hidden />}
                title={narrationFrame.label}
                meta={narrationFrame.tool || narrationFrame.phase}
              />
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
              <div className="v2-empty-line">
                {isStreaming ? "Waiting for trace events." : "No trace in this turn."}
              </div>
            )}
          </V2Panel>
        ) : null}

        {tab === "context" ? (
          <V2Panel aria-label="Context">
            <V2PanelHead title="Context" meta={lastChannel || "agent"} />
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
                {
                  id: "tokens",
                  label: "Tokens",
                  value: formatTokens(usageSummary?.usageTokens),
                },
                {
                  id: "cost",
                  label: "Cost",
                  value: formatCost(usageSummary?.costUsd),
                },
                {
                  id: "turn-weight",
                  label: "Turn weight",
                  value: formatWeight(usageSummary?.turnWeight),
                },
                {
                  id: "session-weight",
                  label: "Session",
                  value: formatWeight(usageSummary?.sessionWeight),
                },
                { id: "memory", label: "Memory", value: "User scoped" },
                { id: "model", label: "Model", value: defaultModel.label },
              ]}
            />
          </V2Panel>
        ) : null}
      </div>

      <V2ActionGrid
        ariaLabel="Agent actions"
        actions={[
          {
            id: "memory",
            label: "Memory",
            icon: <Brain className="size-4" aria-hidden />,
            onClick: onOpenMemory,
          },
          {
            id: "share",
            label: "Share",
            icon: <Share2 className="size-4" aria-hidden />,
            onClick: onShare,
          },
          {
            id: "export",
            label: "Export",
            icon: <FileDown className="size-4" aria-hidden />,
            onClick: onExport,
          },
          {
            id: "settings",
            label: "Settings",
            icon: <Settings2 className="size-4" aria-hidden />,
            onClick: onOpenSettings,
          },
        ]}
      />

      <div className="v2-footnote-grid">
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
