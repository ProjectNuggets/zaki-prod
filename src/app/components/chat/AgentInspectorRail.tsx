import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  Brain,
  Boxes,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock3,
  FileDown,
  FileText,
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

type AgentInspectorTab =
  | "plan"
  | "cron"
  | "sources"
  | "artifacts"
  | "browser"
  | "trace";

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
  onOpenBrowser?: () => void;
  onOpenArtifacts?: () => void;
  onOpenTrace?: () => void;
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

function transcriptLabel(entry: NullalisTranscriptEntry): string {
  return entry.tool || entry.intent || entry.kind;
}

function transcriptSummary(entry: NullalisTranscriptEntry): string {
  return (
    entry.activityLabel ||
    entry.resultSummary ||
    entry.outputPreview ||
    entry.inputPreview ||
    entry.text
  );
}

function entryMatches(entry: NullalisTranscriptEntry, terms: readonly string[]) {
  const haystack = [
    entry.intent,
    entry.kind,
    entry.tool,
    entry.activityLabel,
    entry.text,
    entry.resultSummary,
    entry.inputPreview,
    entry.outputPreview,
    ...(entry.files ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return terms.some((term) => haystack.includes(term));
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
  onOpenBrowser,
  onOpenArtifacts,
  onOpenTrace,
  onOpenSettings,
  onShare,
  onExport,
}: AgentInspectorRailProps) {
  const [tab, setTab] = useState<AgentInspectorTab>("plan");
  const [manualTabSelected, setManualTabSelected] = useState(false);
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
  const sourceEntries = useMemo(
    () =>
      transcriptEntries
        .filter(
          (entry) =>
            entry.intent === "memory" ||
            entry.intent === "context" ||
            entry.intent === "file" ||
            Boolean(entry.files?.length) ||
            entryMatches(entry, ["source", "citation", "document", "web"])
        )
        .slice(-5)
        .reverse(),
    [transcriptEntries]
  );
  const artifactEntries = useMemo(
    () =>
      transcriptEntries
        .filter(
          (entry) =>
            Boolean(entry.files?.length) ||
            entryMatches(entry, ["artifact", "canvas", "document", "export", "pdf", "docx"])
        )
        .slice(-5)
        .reverse(),
    [transcriptEntries]
  );
  const browserEntries = useMemo(
    () =>
      transcriptEntries
        .filter((entry) => entryMatches(entry, ["browser", "playwright", "extension"]))
        .slice(-5)
        .reverse(),
    [transcriptEntries]
  );
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
  const browserActivity =
    browserEntries.length > 0 || /\b(browser|playwright|extension)\b/i.test(lastChannel ?? "");
  const handleTabChange = (nextTab: AgentInspectorTab) => {
    setManualTabSelected(true);
    setTab(nextTab);
  };

  useEffect(() => {
    if (!isStreaming || !browserActivity || manualTabSelected) return;
    setTab("browser");
  }, [browserActivity, isStreaming, manualTabSelected]);

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
        className="zaki-agent-inspector__tabs"
        ariaLabel="Agent panels"
        value={tab}
        onChange={handleTabChange}
        options={[
          { id: "plan", label: "Plan", count: sortedTasks.length || undefined },
          { id: "cron", label: "Cron" },
          { id: "sources", label: "Sources", count: sourceEntries.length || undefined },
          {
            id: "artifacts",
            label: "Artifacts",
            count: artifactCount || artifactEntries.length || undefined,
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

        {tab === "cron" ? (
          <V2Panel aria-label="Cron">
            <V2PanelHead title="Cron" meta="scheduled runs" />
            <V2InlineRow
              tone={isStreaming ? "accent" : "default"}
              icon={<CalendarClock className="size-4" aria-hidden />}
              title={isStreaming ? "Foreground run active" : "No scheduled run active"}
              meta={
                isStreaming
                  ? "This turn is live now; scheduled runs will be linked here."
                  : "Automations and background retries will appear here once wired."
              }
            />
            <div className="v2-empty-line">
              No linked cron jobs or autonomous follow-ups in this session.
            </div>
          </V2Panel>
        ) : null}

        {tab === "sources" ? (
          <V2Panel aria-label="Sources">
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
              <ol className="zaki-agent-inspector__event-list">
                {sourceEntries.map((entry) => (
                  <li key={entry.id}>
                    <FileText className="zaki-agent-inspector__event-icon" aria-hidden />
                    <div>
                      <strong>{transcriptLabel(entry)}</strong>
                      <span>{transcriptSummary(entry)}</span>
                      {entry.files?.length ? <small>{entry.files.join(", ")}</small> : null}
                    </div>
                  </li>
                ))}
              </ol>
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
          <V2Panel aria-label="Artifacts">
            <V2PanelHead
              title="Artifacts"
              meta={`${artifactCount || artifactEntries.length || 0} events`}
            />
            <V2InlineRow
              tone={artifactCount || artifactEntries.length ? "accent" : "default"}
              icon={<Boxes className="size-4" aria-hidden />}
              title={
                artifactCount || artifactEntries.length
                  ? "Artifact activity captured"
                  : "No artifact activity"
              }
              meta="Documents, canvases, exports, and generated files"
            />
            {artifactEntries.length ? (
              <ol className="zaki-agent-inspector__event-list">
                {artifactEntries.map((entry) => (
                  <li key={entry.id}>
                    <Boxes className="zaki-agent-inspector__event-icon" aria-hidden />
                    <div>
                      <strong>{transcriptLabel(entry)}</strong>
                      <span>{transcriptSummary(entry)}</span>
                      {entry.files?.length ? <small>{entry.files.join(", ")}</small> : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="v2-empty-line">
                Generated outputs will appear here as the agent creates them.
              </div>
            )}
            <PanelActionButton onClick={onOpenArtifacts} ariaLabel="Open artifacts manager">
              <Boxes className="size-4" aria-hidden />
              Open artifacts
            </PanelActionButton>
          </V2Panel>
        ) : null}

        {tab === "browser" ? (
          <V2Panel aria-label="Browser">
            <V2PanelHead title="Browser" meta={sandboxLabel} />
            <V2InlineRow
              tone={browserActivity || sandbox?.enabled ? "accent" : "default"}
              icon={<Globe2 className="size-4" aria-hidden />}
              title={browserActivity ? "Browser activity detected" : "Browser lane ready"}
              meta="Server Playwright plus extension handoff"
            />
            <dl className="zaki-agent-inspector__fact-grid">
              <div>
                <dt>Sandbox</dt>
                <dd>{sandboxLabel}</dd>
              </div>
              <div>
                <dt>Extension</dt>
                <dd>{sandbox?.enabled ? "available" : "idle"}</dd>
              </div>
            </dl>
            {browserEntries.length ? (
              <ol className="zaki-agent-inspector__event-list">
                {browserEntries.map((entry) => (
                  <li key={entry.id}>
                    <Globe2 className="zaki-agent-inspector__event-icon" aria-hidden />
                    <div>
                      <strong>{transcriptLabel(entry)}</strong>
                      <span>{transcriptSummary(entry)}</span>
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
          <V2Panel aria-label="Trace">
            <V2PanelHead title="Trace" meta={`${timelineBlocks.length} blocks`} />
            {narrationFrame ? (
              <V2InlineRow
                tone="accent"
                icon={<Activity className="size-4" aria-hidden />}
                title={narrationFrame.label}
                meta={narrationFrame.tool || narrationFrame.phase}
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
              ]}
            />
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
            <PanelActionButton onClick={onOpenTrace} ariaLabel="Open trace viewer">
              <Activity className="size-4" aria-hidden />
              Open trace viewer
            </PanelActionButton>
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
