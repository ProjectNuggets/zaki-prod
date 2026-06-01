import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  Brain,
  Boxes,
  CalendarClock,
  CheckCircle2,
  Circle,
  Copy,
  Download,
  ExternalLink,
  Globe2,
  Link2,
  Link2Off,
  Loader2,
  PanelRightClose,
  Share2,
  ShieldAlert,
} from "lucide-react";
import {
  downloadAgentExportFile,
  exportAgentArtifact,
  fetchAgentTrace,
  listAgentTraces,
  revokeAgentTraceShare,
  shareAgentArtifact,
  shareAgentTrace,
  type AgentExtensionDiagnosticsResponse,
  type AgentSessionMode,
  type AgentTrace,
} from "@/lib/api";
import { DEFAULT_AGENT_MODEL_ID, resolveAgentModel } from "@/lib/agentModelCatalog";
import { cn } from "@/lib/utils";
import type { ZakiRuntimeSandbox } from "@/stores/zakiSessionUiStore";
import {
  getAgentArtifactExportDownloadUrl,
  getAgentArtifactShareUrl,
  PUBLIC_AGENT_ARTIFACT_EXPORT_FORMATS,
  type AgentArtifactExportFormat,
  type AgentArtifactExportState,
} from "@/app/components/agent/agentArtifactSurface";
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
  | "evidence"
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
  sessionKey?: string | null;
  shareUrl?: string | null;
  createdAt?: number | null;
  updatedAt: number | null;
};

type AgentArtifactScope = "session" | "recent";

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
  artifactsScope?: AgentArtifactScope;
  artifactsLoading?: boolean;
  artifactsError?: string | null;
  extensionDiagnostics?: AgentExtensionDiagnosticsResponse | null;
  extensionDiagnosticsLoading?: boolean;
  extensionDiagnosticsError?: string | null;
  transcriptEntries: NullalisTranscriptEntry[];
  narrationFrame: NullalisNarrationFrame | null;
  approvalRequest: NullalisApprovalRequest | null;
  artifactCount?: number;
  contextGaugeData: ContextGaugeData | null;
  usageSummary: ZakiUsageSummary | null;
  onOpenMemory?: () => void;
  onOpenCron?: () => void;
  onOpenArtifact?: (artifact: AgentInspectorArtifact) => void;
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
  if (!data) return null;
  if (typeof data.context_pressure_percent === "number") {
    return Math.min(100, Math.max(0, data.context_pressure_percent));
  }
  if (!data.contextMax || data.contextMax <= 0) return null;
  const tokenCount =
    data.tokenCount ??
    Math.round(((data.context_pressure_percent ?? 0) / 100) * data.contextMax);
  return Math.min(100, Math.max(0, (tokenCount / data.contextMax) * 100));
}

function contextSourceLabel(data: ContextGaugeData | null): string {
  if (!data) return "No sample";
  if (data.source === "live_session") return "Live session";
  if (data.source === "diagnostics_fallback") return "Diagnostics fallback";
  if (data.source === "inactive_session") return "Inactive session";
  return "Unknown";
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

function formatTraceTs(value?: string | number | null) {
  if (!value) return "--";
  const parsed =
    typeof value === "number"
      ? new Date(value < 10_000_000_000 ? value * 1000 : value)
      : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleString();
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

function normalizeAgentTraceList(data: { traces?: AgentTrace[]; items?: AgentTrace[] } | null | undefined) {
  if (!data) return [];
  if (Array.isArray(data.traces)) return data.traces;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

function getTraceId(trace: AgentTrace): string {
  return trace.run_id || trace.id || "";
}

function getTraceEventType(event: Record<string, unknown>, index: number): string {
  const candidates = [event.type, event.event, event.kind, event.phase, event.name, event.tool];
  const match = candidates.find((value) => typeof value === "string" && value.trim());
  return typeof match === "string" ? match : `event ${index + 1}`;
}

function getTraceEventPreview(event: Record<string, unknown>): string {
  const candidates = [
    event.summary,
    event.message,
    event.text,
    event.content,
    event.delta,
    event.output_preview,
    event.outputPreview,
    event.error,
  ];
  const match = candidates.find((value) => typeof value === "string" && value.trim());
  if (typeof match !== "string") return "No preview";
  return match.length > 220 ? `${match.slice(0, 220)}...` : match;
}

function getTraceShareUrl(trace: AgentTrace): string | null {
  const candidates = [
    trace.public_url,
    (trace as Record<string, unknown>).publicUrl,
    (trace as Record<string, unknown>).share_url,
    (trace as Record<string, unknown>).shareUrl,
  ];
  const match = candidates.find((value) => typeof value === "string" && value.trim());
  return typeof match === "string" ? match : null;
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
  artifactsScope = "session",
  artifactsLoading = false,
  artifactsError = null,
  extensionDiagnostics = null,
  extensionDiagnosticsLoading = false,
  extensionDiagnosticsError = null,
  transcriptEntries,
  narrationFrame,
  approvalRequest,
  artifactCount = 0,
  contextGaugeData,
  usageSummary,
  onOpenMemory,
  onOpenCron,
  onOpenArtifact,
  tabRequest = null,
  onClose,
}: AgentInspectorRailProps) {
  const [tab, setTab] = useState<AgentInspectorTab>("plan");
  const [manualTabSelected, setManualTabSelected] = useState(false);
  const [artifactExportStates, setArtifactExportStates] = useState<
    Record<string, Partial<Record<AgentArtifactExportFormat, AgentArtifactExportState>>>
  >({});
  const [artifactShareStates, setArtifactShareStates] = useState<
    Record<string, { status: "idle" | "sharing" | "ready" | "failed" | "copied"; url?: string | null; error?: string | null }>
  >({});
  const [traces, setTraces] = useState<AgentTrace[] | null>(null);
  const [tracesLoading, setTracesLoading] = useState(false);
  const [tracesError, setTracesError] = useState<string | null>(null);
  const [traceDetailById, setTraceDetailById] = useState<Record<string, AgentTrace | null>>({});
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [traceDetailLoadingId, setTraceDetailLoadingId] = useState<string | null>(null);
  const [traceDetailError, setTraceDetailError] = useState<string | null>(null);
  const [traceBusyId, setTraceBusyId] = useState<string | null>(null);

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
  const sortedArtifacts = useMemo(
    () =>
      [...artifacts].sort((a, b) => {
        const left = typeof a.updatedAt === "number" ? a.updatedAt : 0;
        const right = typeof b.updatedAt === "number" ? b.updatedAt : 0;
        return right - left;
      }),
    [artifacts]
  );
  const primaryBackendArtifact = sortedArtifacts[0] ?? null;
  const artifactIds = useMemo(
    () => new Set(sortedArtifacts.map((artifact) => artifact.id).filter(Boolean)),
    [sortedArtifacts]
  );
  const provisionalArtifactEntries = artifactEntries.filter(
    (event) => !event.artifactId || !artifactIds.has(event.artifactId)
  );
  const artifactSourceCount = artifactCount || artifactEntries.length || sortedArtifacts.length;
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
  const contextTokenCountForDisplay =
    contextGaugeData?.tokenCount ??
    (ctxPct != null && contextGaugeData?.contextMax
      ? Math.round((ctxPct / 100) * contextGaugeData.contextMax)
      : null);
  const currentMode = mode ?? "execute";
  const sandboxLabel = sandbox?.enabled
    ? sandbox.backend
      ? sandbox.backend
      : "enabled"
    : "off";
  const defaultModel = resolveAgentModel(DEFAULT_AGENT_MODEL_ID);
  const browserActivity =
    browserEntries.length > 0 || /\b(browser|playwright|extension)\b/i.test(lastChannel ?? "");
  const extensionActivity = browserEntries.some(eventHasExtensionSignal);
  const extensionPaired = Boolean(extensionDiagnostics?.paired);
  const extensionLaneActive = extensionActivity || extensionPaired;
  const extensionLastCommandResult = String(extensionDiagnostics?.last_command_result || "").trim();
  const extensionLastCommandTool = String(extensionDiagnostics?.last_command_tool || "").trim();
  const extensionLaneStatus = extensionDiagnosticsLoading
    ? "checking"
    : extensionDiagnosticsError
      ? "status unavailable"
      : extensionPaired
        ? extensionLastCommandResult
          ? extensionLastCommandResult
          : "paired"
        : extensionActivity
          ? "activity detected"
        : "not paired";
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
      setTab("evidence");
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

  const setArtifactExportState = (
    artifactId: string,
    format: AgentArtifactExportFormat,
    state: AgentArtifactExportState
  ) => {
    setArtifactExportStates((current) => ({
      ...current,
      [artifactId]: {
        ...(current[artifactId] || {}),
        [format]: state,
      },
    }));
  };

  const shareUrlForArtifact = (artifact: AgentInspectorArtifact) =>
    artifactShareStates[artifact.id]?.url || artifact.shareUrl || null;

  useEffect(() => {
    if (tab !== "trace") return;
    let active = true;
    setTracesLoading(true);
    setTracesError(null);
    void listAgentTraces({ limit: 20 })
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok) {
          setTraces(null);
          setTracesError(
            String((data as { error?: string | null } | null)?.error || `trace_${response.status}`)
          );
          return;
        }
        setTraces(normalizeAgentTraceList(data));
      })
      .catch(() => {
        if (!active) return;
        setTraces(null);
        setTracesError("network_error");
      })
      .finally(() => {
        if (active) setTracesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab, recentTrace.length]);

  const exportFilenameForArtifact = (
    artifact: AgentInspectorArtifact,
    format: AgentArtifactExportFormat
  ) => {
    const stem =
      artifact.title
        .trim()
        .replace(/[^\w.-]+/g, "_")
        .replace(/^_+|_+$/g, "") || "zaki-artifact";
    return `${stem}.${format}`;
  };

  const handleArtifactDownload = async (
    artifact: AgentInspectorArtifact,
    format: AgentArtifactExportFormat,
    url: string
  ) => {
    try {
      await downloadAgentExportFile(url, exportFilenameForArtifact(artifact, format));
    } catch {
      setArtifactExportState(artifact.id, format, { status: "failed", url, error: "download_failed" });
    }
  };

  const handleArtifactExport = async (
    artifact: AgentInspectorArtifact,
    format: AgentArtifactExportFormat
  ) => {
    if (!artifact.id) return;
    setArtifactExportState(artifact.id, format, { status: "exporting" });
    try {
      const { response, data } = await exportAgentArtifact(artifact.id, format);
      if (!response.ok) {
        const code = typeof data?.error === "string" ? data.error : "export_failed";
        setArtifactExportState(artifact.id, format, {
          status: response.status === 501 || code === "export_not_yet_available" ? "unavailable" : "failed",
          error: code,
        });
        return;
      }
      const url = getAgentArtifactExportDownloadUrl(data);
      setArtifactExportState(
        artifact.id,
        format,
        url ? { status: "ready", url } : { status: "failed", error: "missing_download_url" }
      );
      if (url) {
        await handleArtifactDownload(artifact, format, url);
      }
    } catch {
      setArtifactExportState(artifact.id, format, { status: "failed", error: "export_failed" });
    }
  };

  const handleArtifactShare = async (artifact: AgentInspectorArtifact) => {
    if (!artifact.id) return;
    setArtifactShareStates((current) => ({
      ...current,
      [artifact.id]: { status: "sharing", url: current[artifact.id]?.url || artifact.shareUrl || null },
    }));
    try {
      const { response, data } = await shareAgentArtifact(artifact.id);
      const url = getAgentArtifactShareUrl(data);
      if (!response.ok || !url) {
        throw new Error(typeof data?.error === "string" ? data.error : "share_failed");
      }
      setArtifactShareStates((current) => ({
        ...current,
        [artifact.id]: { status: "ready", url },
      }));
    } catch (error) {
      setArtifactShareStates((current) => ({
        ...current,
        [artifact.id]: {
          status: "failed",
          url: current[artifact.id]?.url || artifact.shareUrl || null,
          error: error instanceof Error ? error.message : "share_failed",
        },
      }));
    }
  };

  const handleCopyArtifactLink = async (artifact: AgentInspectorArtifact) => {
    const shareUrl = shareUrlForArtifact(artifact);
    const firstDownload = PUBLIC_AGENT_ARTIFACT_EXPORT_FORMATS
      .map((format) => artifactExportStates[artifact.id]?.[format]?.url)
      .find((url): url is string => typeof url === "string" && url.length > 0);
    const value = shareUrl || firstDownload;
    if (!artifact.id || !value || typeof navigator === "undefined" || !navigator.clipboard) {
      setArtifactShareStates((current) => ({
        ...current,
        [artifact.id]: {
          status: "failed",
          url: value || shareUrl,
          error: value ? "clipboard_unavailable" : "no_link_available",
        },
      }));
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setArtifactShareStates((current) => ({
        ...current,
        [artifact.id]: { status: "copied", url: value },
      }));
    } catch {
      setArtifactShareStates((current) => ({
        ...current,
        [artifact.id]: { status: "failed", url: value, error: "copy_failed" },
      }));
    }
  };

  const mergeTrace = (traceId: string, patch: AgentTrace) => {
    setTraces((current) =>
      (current || []).map((trace) => (getTraceId(trace) === traceId ? { ...trace, ...patch } : trace))
    );
  };

  const handleTraceDetails = async (trace: AgentTrace) => {
    const traceId = getTraceId(trace);
    if (!traceId) return;
    if (selectedTraceId === traceId) {
      setSelectedTraceId(null);
      setTraceDetailError(null);
      return;
    }
    setSelectedTraceId(traceId);
    setTraceDetailError(null);
    if (traceDetailById[traceId]) return;
    setTraceDetailLoadingId(traceId);
    try {
      const { response, data } = await fetchAgentTrace(traceId);
      if (!response.ok) {
        throw new Error(String((data as { error?: unknown })?.error || "trace_unavailable"));
      }
      setTraceDetailById((current) => ({ ...current, [traceId]: data }));
    } catch {
      setTraceDetailError("trace_unavailable");
    } finally {
      setTraceDetailLoadingId(null);
    }
  };

  const handleTraceShare = async (trace: AgentTrace) => {
    const traceId = getTraceId(trace);
    if (!traceId) return;
    setTraceBusyId(`trace-share:${traceId}`);
    try {
      const { response, data } = await shareAgentTrace(traceId);
      if (!response.ok) {
        throw new Error(String((data as { error?: unknown })?.error || "share_failed"));
      }
      mergeTrace(traceId, data);
    } catch {
      setTraceDetailError("trace_share_failed");
    } finally {
      setTraceBusyId(null);
    }
  };

  const handleTraceRevoke = async (trace: AgentTrace) => {
    const traceId = getTraceId(trace);
    if (!traceId) return;
    setTraceBusyId(`trace-revoke:${traceId}`);
    try {
      const { response } = await revokeAgentTraceShare(traceId);
      if (!response.ok) throw new Error("revoke_failed");
      mergeTrace(traceId, { public_url: null, share_code: null });
    } catch {
      setTraceDetailError("trace_revoke_failed");
    } finally {
      setTraceBusyId(null);
    }
  };

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
        columns={3}
        className="zaki-agent-inspector__tabs"
        ariaLabel="Agent panels"
        value={tab}
        onChange={handleTabChange}
        options={[
          { id: "plan", label: "Plan", count: approvalRequest ? "!" : sortedTasks.length || undefined },
          { id: "cron", label: "Cron", count: cronSourceCount || undefined },
          { id: "evidence", label: "Evidence", count: sourceEntries.length || undefined },
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

        {tab === "evidence" ? (
          <V2Panel aria-label="Evidence" className="zaki-agent-inspector__pane">
            <V2PanelHead title="Evidence" meta={lastChannel || "agent"} />
            <V2Meter
              label="Context window"
              value={ctxPct}
              detail={
                contextGaugeData?.contextMax
                  ? `${formatTokens(contextTokenCountForDisplay)} / ${formatTokens(contextGaugeData.contextMax)} tokens`
                  : ctxPct != null
                    ? `${Math.round(ctxPct)}% pressure`
                    : "No trusted context sample"
              }
            />
            <V2MetricGrid
              columns={2}
              items={[
                { id: "memory", label: "Memory", value: "User scoped" },
                { id: "context-source", label: "Context", value: contextSourceLabel(contextGaugeData) },
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
                No evidence surfaced in this turn yet. Web pages, files, memory hits, and context events will appear here when the runtime emits them.
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
                : sortedArtifacts.length
                  ? sortedArtifacts
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
              {!artifactEntries.length && !sortedArtifacts.length ? (
                <span className="version is-active">v0 · waiting</span>
              ) : null}
              <span className="diff">{artifactSourceCount || 0} records</span>
            </div>
            <article className="zaki-agent-inspector__artifact-doc">
              <header className="zaki-agent-inspector__artifact-head">
                <div className="tag">
                  artifacts · {sortedArtifacts.length ? (artifactsScope === "recent" ? "recent" : "session") : provisionalArtifactEntries.length ? "syncing" : "idle"}
                </div>
                <div className="title">
                  {primaryBackendArtifact?.title ||
                    primaryArtifact?.files[0] ||
                    primaryArtifact?.label ||
                    "No artifact activity"}
                </div>
                <div className="sub">
                  {artifactsScope === "recent" && sortedArtifacts.length
                    ? "Recent artifacts shown because this session has no ledger outputs yet"
                    : primaryBackendArtifact?.type ||
                      primaryArtifact?.meta ||
                      "Documents, canvases, exports, and generated files"}
                </div>
              </header>
            </article>
            {artifactsLoading && !sortedArtifacts.length ? (
              <div className="v2-empty-line">Loading artifact ledger...</div>
            ) : null}
            {artifactsError ? (
              <div className="v2-empty-line">Artifact ledger unavailable: {artifactsError}</div>
            ) : null}
            {sortedArtifacts.length ? (
              <div className="zaki-agent-inspector__artifact-list" data-testid="agent-artifact-list">
                {artifactsScope === "recent" ? (
                  <div className="zaki-agent-inspector__artifact-scope">Recent artifacts</div>
                ) : null}
                {sortedArtifacts.map((artifact, index) => {
                  const shareState = artifactShareStates[artifact.id];
                  const shareUrl = shareUrlForArtifact(artifact);
                  return (
                    <article
                      key={artifact.id}
                      className="zaki-agent-inspector__artifact-row"
                      data-testid="agent-artifact-row"
                    >
                      <div className="zaki-agent-inspector__artifact-row-head">
                        <div className="zaki-agent-inspector__artifact-row-title" title={artifact.title}>
                          {artifact.title}
                        </div>
                        <div className="zaki-agent-inspector__artifact-row-meta">
                          <span>{artifact.type || "artifact"}</span>
                          <span>{artifactVersionLabel(artifact, index)}</span>
                        </div>
                      </div>
                      <div className="zaki-agent-inspector__artifact-actions">
                        <button
                          type="button"
                          className="zaki-agent-inspector__artifact-action"
                          onClick={() => onOpenArtifact?.(artifact)}
                          aria-label={`Open ${artifact.title}`}
                          disabled={!artifact.id || !onOpenArtifact}
                        >
                          <ExternalLink className="size-3.5" aria-hidden />
                          Open
                        </button>
                        {PUBLIC_AGENT_ARTIFACT_EXPORT_FORMATS.map((format) => {
                          const exportState = artifactExportStates[artifact.id]?.[format];
                          const label = `Download ${format.toUpperCase()}`;
                          if (exportState?.status === "ready" && exportState.url) {
                            return (
                              <button
                                key={format}
                                type="button"
                                className="zaki-agent-inspector__artifact-action is-ready"
                                onClick={() => void handleArtifactDownload(artifact, format, exportState.url || "")}
                                data-testid={`agent-artifact-download-${format}-${artifact.id}`}
                                aria-label={`${label} for ${artifact.title}`}
                              >
                                <Download className="size-3.5" aria-hidden />
                                {label}
                              </button>
                            );
                          }
                          return (
                            <button
                              key={format}
                              type="button"
                              className="zaki-agent-inspector__artifact-action"
                              onClick={() => void handleArtifactExport(artifact, format)}
                              disabled={exportState?.status === "exporting"}
                              data-testid={`agent-artifact-export-${format}-${artifact.id}`}
                              aria-label={`${label} for ${artifact.title}`}
                              title={exportState?.error || undefined}
                            >
                              <Download className="size-3.5" aria-hidden />
                              {exportState?.status === "exporting" ? "Exporting" : label}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          className="zaki-agent-inspector__artifact-action"
                          onClick={() => void handleArtifactShare(artifact)}
                          disabled={shareState?.status === "sharing"}
                          aria-label={`Share ${artifact.title}`}
                        >
                          <Share2 className="size-3.5" aria-hidden />
                          {shareState?.status === "sharing" ? "Sharing" : "Share"}
                        </button>
                        <button
                          type="button"
                          className="zaki-agent-inspector__artifact-action"
                          onClick={() => void handleCopyArtifactLink(artifact)}
                          disabled={!shareUrl && !PUBLIC_AGENT_ARTIFACT_EXPORT_FORMATS.some((format) => artifactExportStates[artifact.id]?.[format]?.url)}
                          aria-label={`Copy link for ${artifact.title}`}
                        >
                          {shareUrl ? <Link2 className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                          {shareState?.status === "copied" ? "Copied" : "Copy link"}
                        </button>
                      </div>
                      {shareState?.status === "failed" ? (
                        <div className="zaki-agent-inspector__artifact-state">Share/link action failed: {shareState.error || "retry available"}</div>
                      ) : null}
                      {PUBLIC_AGENT_ARTIFACT_EXPORT_FORMATS.map((format) => {
                        const exportState = artifactExportStates[artifact.id]?.[format];
                        if (!exportState || exportState.status === "idle" || exportState.status === "ready" || exportState.status === "exporting") return null;
                        return (
                          <div key={format} className="zaki-agent-inspector__artifact-state">
                            {format.toUpperCase()} {exportState.status}: {exportState.error || "retry available"}
                          </div>
                        );
                      })}
                    </article>
                  );
                })}
              </div>
            ) : null}
            {provisionalArtifactEntries.length ? (
              <ol className="zaki-agent-inspector__event-list">
                {provisionalArtifactEntries.map((event) => (
                  <li key={event.id}>
                    <Boxes className="zaki-agent-inspector__event-icon" aria-hidden />
                    <div>
                      <strong>{event.label}</strong>
                      <span>{event.summary}</span>
                      <small>{event.meta || "Syncing with artifact ledger"}</small>
                    </div>
                  </li>
                ))}
              </ol>
            ) : null}
            {!sortedArtifacts.length && !provisionalArtifactEntries.length && !artifactsLoading ? (
              <div className="v2-empty-line">
                Generated outputs will appear here as the agent creates them.
              </div>
            ) : null}
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
              <article className={cn("zaki-agent-inspector__browser-lane", extensionLaneActive && "is-active")}>
                <div className="lane-kicker">user browser extension</div>
                <div className="lane-title">
                  {extensionLaneActive ? "logged-in browser active" : "logged-in browser lane"}
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
                <dd>
                  {extensionLaneStatus}
                  {extensionLastCommandTool ? ` · ${extensionLastCommandTool}` : ""}
                </dd>
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
            <div className="zaki-agent-inspector__trace-ledger" data-testid="agent-trace-ledger">
              <div className="zaki-agent-inspector__trace-ledger-head">
                <span>durable traces</span>
                <span>{tracesLoading ? "loading" : traces?.length ? `${traces.length} records` : "none"}</span>
              </div>
              {tracesLoading && !traces ? (
                <div className="v2-empty-line">Loading durable traces...</div>
              ) : null}
              {tracesError ? (
                <div className="v2-empty-line">Trace ledger unavailable: {tracesError}</div>
              ) : null}
              {traces && traces.length === 0 ? (
                <div className="v2-empty-line">No durable trace records yet.</div>
              ) : null}
              {(traces || []).map((trace, index) => {
                const traceId = getTraceId(trace);
                const shareUrl = getTraceShareUrl(trace);
                const detail = traceId ? traceDetailById[traceId] : null;
                const detailEvents = Array.isArray(detail?.events) ? detail.events : [];
                return (
                  <article
                    key={traceId || index}
                    className="zaki-agent-inspector__trace-record"
                    data-testid="agent-trace-record"
                  >
                    <div className="zaki-agent-inspector__trace-record-head">
                      <div>
                        <strong>{traceId || `trace ${index + 1}`}</strong>
                        <span>
                          {trace.status || "unknown"} · {formatTraceTs(trace.started_at)}
                        </span>
                      </div>
                      {shareUrl ? (
                        <a
                          href={shareUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open shared trace ${traceId}`}
                        >
                          <ExternalLink className="size-3.5" aria-hidden />
                        </a>
                      ) : null}
                    </div>
                    <div className="zaki-agent-inspector__trace-actions">
                      <button
                        type="button"
                        onClick={() => void handleTraceDetails(trace)}
                        disabled={!traceId || traceDetailLoadingId === traceId}
                      >
                        <Activity className="size-3.5" aria-hidden />
                        {selectedTraceId === traceId ? "Hide details" : traceDetailLoadingId === traceId ? "Loading" : "Details"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleTraceShare(trace)}
                        disabled={!traceId || traceBusyId === `trace-share:${traceId}`}
                      >
                        <Share2 className="size-3.5" aria-hidden />
                        Share
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleTraceRevoke(trace)}
                        disabled={!traceId || !shareUrl || traceBusyId === `trace-revoke:${traceId}`}
                      >
                        <Link2Off className="size-3.5" aria-hidden />
                        Revoke
                      </button>
                    </div>
                    {selectedTraceId === traceId ? (
                      <div className="zaki-agent-inspector__trace-detail" data-testid="agent-trace-detail">
                        {traceDetailLoadingId === traceId ? (
                          <div className="v2-empty-line">Loading trace events...</div>
                        ) : traceDetailError ? (
                          <div className="v2-empty-line">Trace detail unavailable: {traceDetailError}</div>
                        ) : detailEvents.length ? (
                          <ol>
                            {detailEvents.slice(0, 24).map((event, eventIndex) => (
                              <li key={`${traceId}-event-${eventIndex}`}>
                                <span>{getTraceEventType(event, eventIndex)}</span>
                                <small>
                                  {formatTraceTs(
                                    (event.ts as string | number | null | undefined) ??
                                      (event.timestamp as string | number | null | undefined) ??
                                      (event.created_at as string | number | null | undefined)
                                  )}
                                </small>
                                <p>{getTraceEventPreview(event)}</p>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <div className="v2-empty-line">No trace events recorded.</div>
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </V2Panel>
        ) : null}
      </div>
    </aside>
  );
}
