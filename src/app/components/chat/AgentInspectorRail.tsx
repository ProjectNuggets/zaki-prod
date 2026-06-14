import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  Bot,
  Brain,
  Boxes,
  Cable,
  CalendarClock,
  CheckCircle2,
  Circle,
  Copy,
  Download,
  ExternalLink,
  Globe2,
  KeyRound,
  Link2,
  Link2Off,
  LockKeyhole,
  Loader2,
  MonitorSmartphone,
  PanelRightClose,
  Pause,
  Pencil,
  Play,
  Plus,
  ServerCog,
  Share2,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  createAgentCron,
  deleteAgentCron,
  downloadAgentExportFile,
  exportAgentArtifact,
  fetchAgentSessionPlan,
  fetchAgentSessionTodos,
  fetchAgentTrace,
  fetchAgentTask,
  listAgentTraces,
  revokeAgentArtifactShare,
  revokeAgentTraceShare,
  shareAgentArtifact,
  shareAgentTrace,
  stopAgentTask,
  updateAgentSessionTodoItem,
  updateAgentCron,
  type AgentContextReport,
  type AgentExtensionDiagnosticsResponse,
  type AgentSessionMode,
  type AgentSessionPlanResponse,
  type AgentSessionTodosResponse,
  type AgentTaskPlanStep,
  type AgentTodoItem,
  type AgentTodoList,
  type AgentTodoStatus,
  type AgentTrace,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import type { BrowserFrame } from "@/types";
import type { ZakiRuntimeSandbox } from "@/stores/zakiSessionUiStore";
import {
  getAgentArtifactExportAvailability,
  getAgentArtifactExportDownloadUrl,
  getAgentArtifactExportFormatLabel,
  getAgentArtifactShareUrl,
  PUBLIC_AGENT_ARTIFACT_EXPORT_FORMATS,
  type AgentArtifactExportFormat,
  type AgentArtifactExportState,
} from "@/app/components/agent/agentArtifactSurface";
import {
  V2InlineRow,
  V2Panel,
  V2PanelHead,
  V2Tabs,
} from "@/app/components/v2";
import { resolveContextGaugePercent } from "@/lib/agentContext";
import { BrowserViewFeedPanel } from "./BrowserViewFeedPanel";
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

export type AgentSettingsSection =
  | "agent"
  | "channels"
  | "secrets"
  | "providers"
  | "devices"
  | "developer-access";

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

export type AgentInspectorJob = {
  id: string;
  title: string;
  status: string | null;
  schedule: string | null;
  nextRunAt: number | null;
  lastRunAt: number | null;
  createdAt: number | null;
  error?: string | null;
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

const APP_BROWSER_TOOLS = [
  "browser_new_session",
  "browser_navigate",
  "browser_snapshot",
  "browser_exec",
  "browser_close_session",
] as const;
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

const AGENT_SETTINGS_LINKS: Array<{
  section: AgentSettingsSection;
  label: string;
  ariaLabel: string;
  icon: ReactNode;
}> = [
  {
    section: "agent",
    label: "Agent",
    ariaLabel: "Open Agent settings",
    icon: <Bot className="size-4" aria-hidden />,
  },
  {
    section: "channels",
    label: "Channels",
    ariaLabel: "Open Channels settings",
    icon: <Cable className="size-4" aria-hidden />,
  },
  {
    section: "secrets",
    label: "Secrets",
    ariaLabel: "Open Secrets settings",
    icon: <KeyRound className="size-4" aria-hidden />,
  },
  {
    section: "providers",
    label: "Providers",
    ariaLabel: "Open Providers settings",
    icon: <ServerCog className="size-4" aria-hidden />,
  },
  {
    section: "devices",
    label: "Devices",
    ariaLabel: "Open Devices settings",
    icon: <MonitorSmartphone className="size-4" aria-hidden />,
  },
  {
    section: "developer-access",
    label: "Developer",
    ariaLabel: "Open Developer Access settings",
    icon: <LockKeyhole className="size-4" aria-hidden />,
  },
];

export type AgentInspectorRailProps = {
  sessionKey?: string | null;
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
  jobs?: AgentInspectorJob[];
  jobsLoading?: boolean;
  jobsError?: string | null;
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
  approvalContinuationPending?: boolean;
  artifactCount?: number;
  contextGaugeData: ContextGaugeData | null;
  contextReport?: AgentContextReport | null;
  usageSummary: ZakiUsageSummary | null;
  browserFrame?: BrowserFrame | null;
  onOpenMemory?: () => void;
  onCronChanged?: () => void | Promise<void>;
  onOpenExtensionSettings?: () => void;
  onOpenSettings?: (section: AgentSettingsSection) => void;
  onOpenArtifact?: (artifact: AgentInspectorArtifact) => void;
  onCloseBrowserFrame?: () => void;
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

function contextPercent(data: ContextGaugeData | null): number | null {
  return resolveContextGaugePercent(data);
}

function contextSourceLabel(data: ContextGaugeData | null): string {
  if (!data) return "No sample";
  if (data.source === "live_session") return "Live session";
  if (data.source === "diagnostics_fallback") return "Diagnostics fallback";
  if (data.source === "inactive_session") return "Inactive session";
  return "Unknown";
}

function isCompleteTask(status: NullalisTaskStatus) {
  return status === "done" || status === "succeeded";
}

function isTerminalTask(status: NullalisTaskStatus) {
  return isCompleteTask(status) || status === "failed" || status === "cancelled";
}

function taskVisualState(status: NullalisTaskStatus) {
  if (isCompleteTask(status)) return "done";
  if (status === "running") return "live";
  if (status === "failed" || status === "blocked" || status === "cancelled") return "blocked";
  return "queued";
}

function todoVisualState(status?: string | null) {
  if (status === "completed" || status === "done" || status === "succeeded") return "done";
  if (status === "in_progress" || status === "running") return "live";
  if (status === "blocked" || status === "failed" || status === "cancelled") return "blocked";
  return "queued";
}

function todoStatusIcon(status?: string | null) {
  const visualState = todoVisualState(status);
  if (visualState === "done") {
    return <CheckCircle2 className="zaki-agent-inspector__status-icon is-done" aria-hidden />;
  }
  if (visualState === "live") {
    return <Loader2 className="zaki-agent-inspector__status-icon is-running" aria-hidden />;
  }
  if (visualState === "blocked") {
    return <ShieldAlert className="zaki-agent-inspector__status-icon is-alert" aria-hidden />;
  }
  return <Circle className="zaki-agent-inspector__status-icon" aria-hidden />;
}

function nextTodoStatus(status?: string | null): AgentTodoStatus {
  if (status === "pending") return "in_progress";
  if (status === "in_progress") return "completed";
  if (status === "completed") return "pending";
  if (status === "blocked") return "in_progress";
  return "in_progress";
}

function todoActionLabel(status?: string | null) {
  if (status === "pending") return "Start";
  if (status === "in_progress") return "Complete";
  if (status === "completed") return "Reopen";
  if (status === "blocked") return "Resume";
  return "Update";
}

function currentPlanStep(plan?: AgentSessionPlanResponse["plan"] | null): AgentTaskPlanStep | null {
  if (!plan?.steps?.length) return null;
  const index =
    typeof plan.current_step === "number" && Number.isFinite(plan.current_step)
      ? Math.max(0, Math.min(plan.steps.length - 1, Math.trunc(plan.current_step)))
      : plan.steps.findIndex((step) => step.status === "running");
  return plan.steps[index >= 0 ? index : 0] ?? null;
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

function evidenceCategoryLabel(category: string) {
  if (category === "web") return "web";
  if (category === "file") return "file";
  if (category === "memory") return "memory";
  if (category === "retrieval") return "retrieval";
  if (category === "compaction") return "context";
  if (category === "continuity") return "continuity";
  if (category === "browser") return "browser";
  if (category === "artifact") return "artifact";
  if (category === "schedule") return "schedule";
  return "tool";
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
  return /\b(browser_(?:new_session|navigate|snapshot|exec|close_session)|browser|web_fetch|web_search)\b/i.test(
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

function taskCanStop(status: NullalisTaskStatus) {
  return status === "running" || status === "queued" || status === "deferred";
}

function taskDetailText(detail: Record<string, unknown> | null | undefined, ...keys: string[]) {
  if (!detail) return null;
  for (const key of keys) {
    const value = detail[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }
  return null;
}

function taskDetailTime(detail: Record<string, unknown> | null | undefined, ...keys: string[]) {
  const value = detail ? keys.map((key) => detail[key]).find((candidate) => candidate != null) : null;
  if (typeof value === "number") return formatCalendarStamp(value < 10_000_000_000 ? value * 1000 : value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? formatCalendarStamp(parsed) : value;
  }
  return null;
}

function cronActionError(data: unknown, fallback: string) {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const key of ["message", "error", "reason"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return fallback;
}

function isExportedState(state?: AgentArtifactExportState | null): state is AgentArtifactExportState & {
  url: string;
} {
  return Boolean(
    state?.url &&
      (state.status === "ready" || state.status === "exported")
  );
}

function isUnavailableExportError(responseStatus: number, code: string) {
  return (
    responseStatus === 400 ||
    responseStatus === 501 ||
    responseStatus === 502 ||
    code === "unsupported_format" ||
    code === "export_not_yet_available" ||
    code === "renderer_unavailable"
  );
}

function compactJobTitle(title: string) {
  const normalized = title.replace(/\s+/g, " ").trim();
  if (!normalized) return "Untitled job";
  const scheduleCut = normalized.match(/\b(?:brief|report|task|job)\s+specification\b/i);
  const head = scheduleCut?.index && scheduleCut.index > 12
    ? normalized.slice(0, scheduleCut.index).trim()
    : normalized;
  return head.length > 92 ? `${head.slice(0, 89).trim()}...` : head;
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
  sessionKey = null,
  isStreaming,
  lastChannel = null,
  sandbox,
  tasks,
  tasksLoading = false,
  tasksError = null,
  cronJobs = [],
  cronLoading = false,
  cronError = null,
  jobs = [],
  jobsLoading = false,
  jobsError = null,
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
  approvalContinuationPending = false,
  artifactCount = 0,
  contextGaugeData,
  contextReport = null,
  usageSummary,
  browserFrame = null,
  onOpenMemory,
  onCronChanged,
  onOpenExtensionSettings,
  onOpenSettings,
  onOpenArtifact,
  onCloseBrowserFrame,
  tabRequest = null,
  onClose,
}: AgentInspectorRailProps) {
  const [tab, setTab] = useState<AgentInspectorTab>("plan");
  const [manualTabSelected, setManualTabSelected] = useState(false);
  const [artifactExportStates, setArtifactExportStates] = useState<
    Record<string, Partial<Record<AgentArtifactExportFormat, AgentArtifactExportState>>>
  >({});
  const [artifactShareStates, setArtifactShareStates] = useState<
    Record<string, { status: "idle" | "sharing" | "ready" | "revoking" | "failed" | "copied"; url?: string | null; error?: string | null }>
  >({});
  const [traces, setTraces] = useState<AgentTrace[] | null>(null);
  const [tracesLoading, setTracesLoading] = useState(false);
  const [tracesError, setTracesError] = useState<string | null>(null);
  const [traceDetailById, setTraceDetailById] = useState<Record<string, AgentTrace | null>>({});
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [traceDetailLoadingId, setTraceDetailLoadingId] = useState<string | null>(null);
  const [traceDetailError, setTraceDetailError] = useState<string | null>(null);
  const [traceBusyId, setTraceBusyId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [taskDetailById, setTaskDetailById] = useState<Record<string, Record<string, unknown> | null>>({});
  const [taskDetailLoadingId, setTaskDetailLoadingId] = useState<string | null>(null);
  const [taskDetailErrorById, setTaskDetailErrorById] = useState<Record<string, string | null>>({});
  const [confirmStopTaskId, setConfirmStopTaskId] = useState<string | null>(null);
  const [stoppingTaskId, setStoppingTaskId] = useState<string | null>(null);
  const [stoppedTaskIds, setStoppedTaskIds] = useState<Record<string, boolean>>({});
  const [todosData, setTodosData] = useState<AgentSessionTodosResponse | null>(null);
  const [todosLoading, setTodosLoading] = useState(false);
  const [todosError, setTodosError] = useState<string | null>(null);
  const [todoBusyKey, setTodoBusyKey] = useState<string | null>(null);
  const [planData, setPlanData] = useState<AgentSessionPlanResponse | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [cronFormOpen, setCronFormOpen] = useState(false);
  const [editingCronId, setEditingCronId] = useState<string | null>(null);
  const [cronNameDraft, setCronNameDraft] = useState("");
  const [cronExpressionDraft, setCronExpressionDraft] = useState("0 */6 * * *");
  const [cronPromptDraft, setCronPromptDraft] = useState("");
  const [cronBusyId, setCronBusyId] = useState<string | null>(null);
  const [confirmCronDeleteId, setConfirmCronDeleteId] = useState<string | null>(null);

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
  const currentTasks = useMemo(
    () => sortedTasks.filter((task) => !isTerminalTask(task.status)),
    [sortedTasks]
  );
  const taskHistory = useMemo(
    () => sortedTasks.filter((task) => isTerminalTask(task.status)).slice(-5).reverse(),
    [sortedTasks]
  );
  const completedTaskCount = currentTasks.filter((task) => isCompleteTask(task.status)).length;
  const runningTask = currentTasks.find((task) => task.status === "running") ?? null;
  const hasActiveRun = isStreaming || approvalContinuationPending || Boolean(approvalRequest) || currentTasks.length > 0;
  const weightedTaskProgress = currentTasks.reduce((total, task) => {
    if (isCompleteTask(task.status)) return total + 1;
    if (task.status === "running" && typeof task.progressPct === "number") {
      return total + Math.max(0, Math.min(100, task.progressPct)) / 100;
    }
    return total;
  }, 0);
  const planPercent = currentTasks.length
    ? Math.round((weightedTaskProgress / currentTasks.length) * 100)
    : 0;
  const ctxPct = contextPercent(contextGaugeData);
  const hasBrowserFrame = Boolean(browserFrame?.frame?.trim());
  const sandboxLabel = sandbox?.enabled
    ? sandbox.backend
      ? sandbox.backend
      : "enabled"
    : "off";
  const browserActivity =
    hasBrowserFrame ||
    browserEntries.length > 0 ||
    /\b(browser|extension)\b/i.test(lastChannel ?? "");
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
    hasBrowserFrame ||
    browserEntries.some(eventHasAppBrowserSignal) ||
    /\b(browser|web_fetch|web_search)\b/i.test(lastChannel ?? "");
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
  const latestPlanSignal = !hasActiveRun
    ? "No active run."
    : approvalContinuationPending
      ? "Approved. ZAKI is continuing..."
      : narrationFrame?.label ||
        runningTask?.description ||
        recentTrace[0]?.summary ||
        "Waiting for the next runtime event.";
  const narrationLog = recentTrace.slice(0, 4);
  const activeTodoList = useMemo(() => {
    const lists = todosData?.lists ?? [];
    if (!lists.length) return null;
    const currentId = todosData?.current_list_id;
    return lists.find((list) => list.list_id === currentId) ?? lists[0] ?? null;
  }, [todosData]);
  const activeTodoItems = activeTodoList?.items ?? [];
  const completedTodoCount = activeTodoItems.filter(
    (item) => todoVisualState(item.status) === "done"
  ).length;
  const otherTodoLists = useMemo(
    () =>
      (todosData?.lists ?? []).filter(
        (list) => !activeTodoList || list.list_id !== activeTodoList.list_id
      ),
    [activeTodoList, todosData]
  );
  const activePlan = planData?.active ? planData.plan : null;
  const activePlanStep = currentPlanStep(activePlan);
  const recentFailure = recentTrace.find((event) => traceLevel(event) === "warn") ?? null;
  const nativeToolCount = contextReport?.last_turn?.native_tool_call_count ?? null;
  const xmlToolCount = contextReport?.last_turn?.xml_fallback_call_count ?? null;
  const boundedResultCount = contextReport?.last_turn?.bounded_result_count ?? null;
  const promptTokens =
    contextReport?.provider_prompt_tokens ??
    contextReport?.provider_usage_last_turn?.prompt_tokens ??
    null;
  const cachedPromptTokens =
    contextReport?.provider_cached_prompt_tokens ??
    contextReport?.provider_usage_last_turn?.cached_prompt_tokens ??
    null;
  const toolMode =
    contextReport?.last_turn_delta?.tool_mode ??
    contextReport?.last_turn?.tool_mode ??
    contextReport?.prompt_shape?.tool_surface ??
    "unknown";
  const workStatusText = activePlan
    ? activePlan.status || "active plan"
    : runningTask
      ? `${Math.round(runningTask.progressPct ?? planPercent)}% live`
      : hasActiveRun
        ? "forming"
        : "idle";
  const handleTabChange = (nextTab: AgentInspectorTab) => {
    setManualTabSelected(true);
    setTab(nextTab);
  };

  const resetCronForm = () => {
    setEditingCronId(null);
    setCronNameDraft("");
    setCronExpressionDraft("0 */6 * * *");
    setCronPromptDraft("");
    setConfirmCronDeleteId(null);
  };

  const handleExpandTask = async (task: NullalisTaskItem) => {
    const nextId = expandedTaskId === task.taskId ? null : task.taskId;
    setExpandedTaskId(nextId);
    setConfirmStopTaskId(null);
    if (!nextId || taskDetailById[nextId] || taskDetailLoadingId === nextId) return;
    setTaskDetailLoadingId(nextId);
    setTaskDetailErrorById((current) => ({ ...current, [nextId]: null }));
    try {
      const { response, data } = await fetchAgentTask(nextId);
      if (!response.ok) {
        throw new Error(cronActionError(data, `task_${response.status}`));
      }
      setTaskDetailById((current) => ({
        ...current,
        [nextId]: data && typeof data === "object" ? (data as Record<string, unknown>) : null,
      }));
    } catch (error) {
      setTaskDetailErrorById((current) => ({
        ...current,
        [nextId]: error instanceof Error ? error.message : "task_detail_unavailable",
      }));
    } finally {
      setTaskDetailLoadingId(null);
    }
  };

  const handleStopTask = async (task: NullalisTaskItem) => {
    setStoppingTaskId(task.taskId);
    try {
      const { response, data } = await stopAgentTask(task.taskId);
      if (!response.ok || data?.error) {
        throw new Error(data?.error || `task_stop_${response.status}`);
      }
      setStoppedTaskIds((current) => ({ ...current, [task.taskId]: true }));
      setConfirmStopTaskId(null);
      toast.success("Task stop requested.");
      await refreshRuntimeLedger();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to stop task.");
    } finally {
      setStoppingTaskId(null);
    }
  };

  const handleTodoStatusUpdate = async (list: AgentTodoList, item: AgentTodoItem) => {
    if (!sessionKey) return;
    const nextStatus = nextTodoStatus(item.status);
    const busyKey = `${list.list_id}:${item.id}`;
    setTodoBusyKey(busyKey);
    try {
      const { response, data } = await updateAgentSessionTodoItem(
        sessionKey,
        list.list_id,
        item.id,
        { status: nextStatus }
      );
      if (!response.ok || data?.error || !data?.list) {
        throw new Error(data?.error || `todo_update_${response.status}`);
      }
      setTodosData((current) => {
        const replacement = data.list as AgentTodoList;
        const existing = current?.lists ?? [];
        const nextLists = existing.length
          ? existing.map((candidate) =>
              candidate.list_id === replacement.list_id ? replacement : candidate
            )
          : [replacement];
        if (!nextLists.some((candidate) => candidate.list_id === replacement.list_id)) {
          nextLists.unshift(replacement);
        }
        return {
          session_key: data.session_key || current?.session_key || sessionKey,
          current_list_id: data.current_list_id ?? current?.current_list_id ?? replacement.list_id,
          lists: nextLists,
        };
      });
      toast.success("Checklist updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checklist update failed.");
    } finally {
      setTodoBusyKey(null);
    }
  };

  const beginCronCreate = () => {
    resetCronForm();
    setCronFormOpen(true);
  };

  const beginCronEdit = (job: AgentInspectorCronJob) => {
    setEditingCronId(job.id);
    setCronNameDraft(job.name || "");
    setCronExpressionDraft(job.schedule || "0 */6 * * *");
    setCronPromptDraft(job.prompt || "");
    setConfirmCronDeleteId(null);
    setCronFormOpen(true);
  };

  const refreshRuntimeLedger = async () => {
    if (!onCronChanged) return;
    try {
      await onCronChanged();
    } catch {
      toast.error("Action completed, but the Agent ledger refresh failed.");
    }
  };

  const handleCronSave = async () => {
    const expression = cronExpressionDraft.trim();
    const prompt = cronPromptDraft.trim();
    if (!expression || !prompt) {
      toast.error("Schedule and prompt are required.");
      return;
    }
    const busy = editingCronId ? `cron-update:${editingCronId}` : "cron-create";
    setCronBusyId(busy);
    try {
      const payload = {
        expression,
        prompt,
        name: cronNameDraft.trim() || null,
        job_type: "agent",
      };
      const { response, data } = editingCronId
        ? await updateAgentCron(editingCronId, payload)
        : await createAgentCron(payload);
      if (!response.ok) {
        throw new Error(cronActionError(data, editingCronId ? "cron_update_failed" : "cron_create_failed"));
      }
      resetCronForm();
      setCronFormOpen(false);
      toast.success(editingCronId ? "Schedule updated." : "Schedule created.");
      await refreshRuntimeLedger();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Schedule action failed.");
    } finally {
      setCronBusyId(null);
    }
  };

  const handleCronToggle = async (job: AgentInspectorCronJob) => {
    setCronBusyId(`cron-toggle:${job.id}`);
    try {
      const { response, data } = await updateAgentCron(job.id, { paused: !job.paused });
      if (!response.ok) {
        throw new Error(cronActionError(data, "cron_toggle_failed"));
      }
      toast.success(job.paused ? "Schedule resumed." : "Schedule paused.");
      await refreshRuntimeLedger();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update schedule.");
    } finally {
      setCronBusyId(null);
    }
  };

  const handleCronDelete = async (job: AgentInspectorCronJob) => {
    setCronBusyId(`cron-delete:${job.id}`);
    try {
      const { response, data } = await deleteAgentCron(job.id);
      if (!response.ok) {
        throw new Error(cronActionError(data, "cron_delete_failed"));
      }
      setConfirmCronDeleteId(null);
      toast.success("Schedule deleted.");
      await refreshRuntimeLedger();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete schedule.");
    } finally {
      setCronBusyId(null);
    }
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
    if (hasBrowserFrame) {
      setTab("browser");
      return;
    }
    if (currentTasks.length) {
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
    hasBrowserFrame,
    manualTabSelected,
    sourceEntries.length,
    currentTasks.length,
    tabRequest,
  ]);

  useEffect(() => {
    if (!sessionKey) {
      setTodosData(null);
      setTodosError(null);
      setTodosLoading(false);
      setPlanData(null);
      setPlanError(null);
      setPlanLoading(false);
      return;
    }
    let active = true;
    setTodosLoading(true);
    setTodosError(null);
    setPlanLoading(true);
    setPlanError(null);

    void Promise.allSettled([
      fetchAgentSessionTodos(sessionKey),
      fetchAgentSessionPlan(sessionKey),
    ]).then(([todosResult, planResult]) => {
      if (!active) return;
      if (todosResult.status === "fulfilled") {
        const { response, data } = todosResult.value;
        if (response.ok) {
          setTodosData(data);
        } else {
          setTodosData(null);
          setTodosError(data?.error || `todos_${response.status}`);
        }
      } else {
        setTodosData(null);
        setTodosError("todos_unavailable");
      }

      if (planResult.status === "fulfilled") {
        const { response, data } = planResult.value;
        if (response.ok) {
          setPlanData(data);
        } else {
          setPlanData(null);
          setPlanError(data?.error || `plan_${response.status}`);
        }
      } else {
        setPlanData(null);
        setPlanError("plan_unavailable");
      }
      setTodosLoading(false);
      setPlanLoading(false);
    });

    return () => {
      active = false;
    };
  }, [sessionKey, isStreaming]);

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

  const shareUrlForArtifact = (artifact: AgentInspectorArtifact) => {
    const state = artifactShareStates[artifact.id];
    if (state) return state.url || null;
    return artifact.shareUrl || null;
  };

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
      setArtifactExportState(artifact.id, format, { status: "exported", url });
    } catch {
      setArtifactExportState(artifact.id, format, { status: "failed", url, error: "download_failed" });
    }
  };

  const handleArtifactExport = async (
    artifact: AgentInspectorArtifact,
    format: AgentArtifactExportFormat
  ) => {
    if (!artifact.id) return;
    const availability = getAgentArtifactExportAvailability(artifact, format);
    if (!availability.supported) {
      setArtifactExportState(artifact.id, format, {
        status: "unavailable",
        error:
          availability.reason ||
          `${getAgentArtifactExportFormatLabel(format)} export unavailable`,
      });
      return;
    }
    setArtifactExportState(artifact.id, format, { status: "exporting" });
    try {
      const { response, data } = await exportAgentArtifact(artifact.id, format);
      if (!response.ok) {
        const code = typeof data?.error === "string" ? data.error : "export_failed";
        setArtifactExportState(artifact.id, format, {
          status: isUnavailableExportError(response.status, code) ? "unavailable" : "failed",
          error: code,
        });
        return;
      }
      const url = getAgentArtifactExportDownloadUrl(data);
      setArtifactExportState(
        artifact.id,
        format,
        url ? { status: "exported", url } : { status: "failed", error: "missing_download_url" }
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

  const handleArtifactShareRevoke = async (artifact: AgentInspectorArtifact) => {
    if (!artifact.id) return;
    const currentUrl = shareUrlForArtifact(artifact);
    if (!currentUrl) return;
    setArtifactShareStates((current) => ({
      ...current,
      [artifact.id]: { status: "revoking", url: currentUrl },
    }));
    try {
      const { response, data } = await revokeAgentArtifactShare(artifact.id);
      if (!response.ok || data?.error) {
        throw new Error(data?.error || `revoke_${response.status}`);
      }
      setArtifactShareStates((current) => ({
        ...current,
        [artifact.id]: { status: "idle", url: null },
      }));
      toast.success("Artifact share link revoked.");
    } catch (error) {
      setArtifactShareStates((current) => ({
        ...current,
        [artifact.id]: {
          status: "failed",
          url: currentUrl,
          error: error instanceof Error ? error.message : "revoke_failed",
        },
      }));
      toast.error("Could not revoke artifact share link.");
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
        [artifact.id]: {
          status: "copied",
          url: shareUrl || current[artifact.id]?.url || artifact.shareUrl || null,
        },
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
      toast.success("Trace share link created.");
    } catch {
      setTraceDetailError("trace_share_failed");
      toast.error("Trace share failed.");
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
      mergeTrace(traceId, {
        public_url: null,
        publicUrl: null,
        share_url: null,
        shareUrl: null,
        share_code: null,
      });
      toast.success("Trace share revoked.");
    } catch {
      setTraceDetailError("trace_revoke_failed");
      toast.error("Trace revoke failed.");
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
          { id: "plan", label: "Plan", count: approvalRequest ? "!" : currentTasks.length || undefined },
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
                <div className="zaki-agent-inspector__plan-title">work</div>
                <div className="zaki-agent-inspector__plan-meta">
                  <span className="zaki-agent-inspector__plan-progress">
                    <span className="bar" aria-hidden>
                      <span
                        className="fill"
                        style={{
                          width: `${
                            activeTodoItems.length
                              ? Math.round((completedTodoCount / activeTodoItems.length) * 100)
                              : planPercent
                          }%`,
                        }}
                      />
                    </span>
                    <span className="num">
                      {activeTodoItems.length
                        ? `${completedTodoCount} / ${activeTodoItems.length}`
                        : `${completedTaskCount} / ${currentTasks.length || 0}`}
                    </span>
                  </span>
                  <span className="sep">.</span>
                  <span>{workStatusText}</span>
                </div>
              </div>
            </div>
            <section className="zaki-agent-inspector__jobs" data-testid="agent-work-checklist">
              <div className="zaki-agent-inspector__jobs-head">
                <span>checklist</span>
                <span>
                  {todosLoading
                    ? "loading"
                    : activeTodoItems.length
                      ? `${completedTodoCount}/${activeTodoItems.length} done`
                      : "none"}
                </span>
              </div>
              {todosError ? (
                <div className="v2-empty-line">Checklist unavailable: {todosError}</div>
              ) : null}
              {todosLoading && !activeTodoList ? (
                <div className="v2-empty-line">Loading checklist...</div>
              ) : null}
              {activeTodoList ? (
                <>
                  <ol className="zaki-agent-inspector__plan-list">
                    {activeTodoItems.map((item) => {
                      const busyKey = `${activeTodoList.list_id}:${item.id}`;
                      return (
                        <li
                          key={`${activeTodoList.list_id}:${item.id}`}
                          className={cn(
                            "zaki-agent-inspector__todo",
                            `is-${todoVisualState(item.status)}`
                          )}
                        >
                          <div className="zaki-agent-inspector__todo-mark" aria-hidden>
                            {todoStatusIcon(item.status)}
                          </div>
                          <div className="zaki-agent-inspector__todo-body">
                            <div className="zaki-agent-inspector__todo-text">
                              {item.title || `Item ${item.id}`}
                            </div>
                            <div className="zaki-agent-inspector__todo-meta">
                              <span>{String(item.status || "pending").replace(/_/g, " ")}</span>
                              {item.depends_on?.length ? (
                                <>
                                  <span className="sep">.</span>
                                  <span>depends on {item.depends_on.join(", ")}</span>
                                </>
                              ) : null}
                              {item.note ? (
                                <>
                                  <span className="sep">.</span>
                                  <span>{item.note}</span>
                                </>
                              ) : null}
                            </div>
                            <div className="zaki-agent-inspector__todo-actions">
                              <button
                                type="button"
                                disabled={todoBusyKey === busyKey}
                                onClick={() => void handleTodoStatusUpdate(activeTodoList, item)}
                              >
                                {todoBusyKey === busyKey ? "Updating" : todoActionLabel(item.status)}
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                  {otherTodoLists.length ? (
                    <div className="v2-empty-line">
                      {otherTodoLists.length} older checklist{otherTodoLists.length === 1 ? "" : "s"} retained.
                    </div>
                  ) : null}
                </>
              ) : !todosLoading && !todosError ? (
                <div className="v2-empty-line">No durable checklist exists for this session yet.</div>
              ) : null}
            </section>
            <section className="zaki-agent-inspector__jobs" data-testid="agent-run-plan">
              <div className="zaki-agent-inspector__jobs-head">
                <span>run plan</span>
                <span>
                  {planLoading
                    ? "loading"
                    : activePlan
                      ? `${activePlan.status || "active"} · rev ${activePlan.revision ?? 1}`
                      : "inactive"}
                </span>
              </div>
              {planError ? (
                <div className="v2-empty-line">Run plan unavailable: {planError}</div>
              ) : null}
              {planLoading && !activePlan ? (
                <div className="v2-empty-line">Loading active plan...</div>
              ) : null}
              {activePlan ? (
                <div className="zaki-agent-inspector__task-detail">
                  <dl>
                    <div>
                      <dt>Summary</dt>
                      <dd>{activePlan.summary || activePlan.plan_id || "active plan"}</dd>
                    </div>
                    <div>
                      <dt>Current step</dt>
                      <dd>{activePlanStep?.title || activePlanStep?.description || "not recorded"}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{activePlanStep?.status || activePlan.status || "active"}</dd>
                    </div>
                    <div>
                      <dt>Expected tool</dt>
                      <dd>{activePlanStep?.expected_tool || "not specified"}</dd>
                    </div>
                    <div>
                      <dt>Actual tool</dt>
                      <dd>{activePlanStep?.actual_tool || "not recorded"}</dd>
                    </div>
                    <div>
                      <dt>Result</dt>
                      <dd>{activePlanStep?.result_summary || activePlanStep?.error_summary || "pending"}</dd>
                    </div>
                  </dl>
                </div>
              ) : !planLoading && !planError ? (
                <div className="v2-empty-line">No active task plan for this run.</div>
              ) : null}
            </section>
            <section className="zaki-agent-inspector__jobs" data-testid="agent-work-trace-strip">
              <div className="zaki-agent-inspector__jobs-head">
                <span>trace</span>
                <span>{toolMode}</span>
              </div>
              <dl className="zaki-agent-inspector__fact-grid">
                <div>
                  <dt>Native/XML</dt>
                  <dd>
                    {nativeToolCount ?? "--"} / {xmlToolCount ?? "--"}
                  </dd>
                </div>
                <div>
                  <dt>Bounded results</dt>
                  <dd>{boundedResultCount ?? "--"}</dd>
                </div>
                <div>
                  <dt>Prompt</dt>
                  <dd>{formatTokens(promptTokens)}</dd>
                </div>
                <div>
                  <dt>Cache</dt>
                  <dd>{formatTokens(cachedPromptTokens)}</dd>
                </div>
              </dl>
              {recentFailure ? (
                <V2InlineRow
                  tone="warn"
                  icon={<ShieldAlert className="size-4" aria-hidden />}
                  title={recentFailure.label}
                  meta={recentFailure.meta || recentFailure.summary}
                />
              ) : null}
            </section>
            {approvalRequest ? (
              <V2InlineRow
                tone="warn"
                icon={<ShieldAlert className="size-4" aria-hidden />}
                title={approvalRequest.tool}
                meta={approvalRequest.riskLevel || "approval needed"}
              />
            ) : null}
            <section
              className={cn("zaki-agent-inspector__narration", hasActiveRun && "is-live")}
              aria-live={hasActiveRun ? "polite" : undefined}
              data-testid="agent-narration-box"
            >
              <div className="zaki-agent-inspector__narration-head">
                <span>narration</span>
                <span>{hasActiveRun ? frameMeta(narrationFrame) : "idle"}</span>
              </div>
              <strong>
                {approvalRequest && !approvalContinuationPending
                  ? `Waiting on ${approvalRequest.tool}`
                  : latestPlanSignal}
              </strong>
              <small>
                {approvalRequest && !approvalContinuationPending
                  ? approvalRequest.reason || "Approval required before this run continues."
                  : approvalContinuationPending
                    ? "The approval was accepted. ZAKI is executing the approved action and continuation."
                    : hasActiveRun
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
            {currentTasks.length ? (
              <ol className="zaki-agent-inspector__plan-list">
                {currentTasks.map((task) => (
                  <li
                    key={task.taskId}
                    data-testid="agent-task-row"
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
                        {stoppedTaskIds[task.taskId] ? (
                          <>
                            <span className="sep">.</span>
                            <span>stop requested</span>
                          </>
                        ) : null}
                      </div>
                      <div className="zaki-agent-inspector__todo-actions">
                        <button
                          type="button"
                          onClick={() => void handleExpandTask(task)}
                          aria-expanded={expandedTaskId === task.taskId}
                        >
                          {expandedTaskId === task.taskId ? "Hide details" : "Details"}
                        </button>
                        {taskCanStop(task.status) ? (
                          confirmStopTaskId === task.taskId ? (
                            <>
                              <button
                                type="button"
                                disabled={stoppingTaskId === task.taskId}
                                onClick={() => void handleStopTask(task)}
                              >
                                {stoppingTaskId === task.taskId ? "Stopping" : "Confirm stop"}
                              </button>
                              <button type="button" onClick={() => setConfirmStopTaskId(null)}>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={stoppingTaskId === task.taskId}
                              onClick={() => setConfirmStopTaskId(task.taskId)}
                            >
                              Stop
                            </button>
                          )
                        ) : null}
                      </div>
                      {expandedTaskId === task.taskId ? (
                        <div className="zaki-agent-inspector__task-detail" data-testid="agent-task-detail">
                          {taskDetailLoadingId === task.taskId ? (
                            <div className="v2-empty-line">Loading task detail...</div>
                          ) : taskDetailErrorById[task.taskId] ? (
                            <div className="v2-empty-line">
                              Task detail unavailable: {taskDetailErrorById[task.taskId]}
                            </div>
                          ) : (
                            <dl>
                              <div>
                                <dt>Task</dt>
                                <dd>{taskDetailText(taskDetailById[task.taskId], "id", "task_id", "taskId") || task.taskId}</dd>
                              </div>
                              <div>
                                <dt>Session</dt>
                                <dd>{taskDetailText(taskDetailById[task.taskId], "session_key", "sessionKey") || "session scoped"}</dd>
                              </div>
                              <div>
                                <dt>Started</dt>
                                <dd>{taskDetailTime(taskDetailById[task.taskId], "started_at", "startedAt", "created_at", "createdAt") || "not recorded"}</dd>
                              </div>
                              <div>
                                <dt>Updated</dt>
                                <dd>{taskDetailTime(taskDetailById[task.taskId], "updated_at", "updatedAt", "completed_at", "completedAt") || formatCalendarStamp(task.updatedAt)}</dd>
                              </div>
                              <div>
                                <dt>Result</dt>
                                <dd>{taskDetailText(taskDetailById[task.taskId], "error", "last_error", "result", "summary") || taskStatusLabel(task.status)}</dd>
                              </div>
                            </dl>
                          )}
                        </div>
                      ) : null}
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
            {tasksLoading && !currentTasks.length ? (
              <div className="v2-empty-line">Loading task ledger...</div>
            ) : null}
            {tasksError ? (
              <div className="v2-empty-line">Task ledger unavailable: {tasksError}</div>
            ) : null}
            {!currentTasks.length && taskHistory.length ? (
              <section className="zaki-agent-inspector__jobs" data-testid="agent-task-history">
                <div className="zaki-agent-inspector__jobs-head">
                  <span>task history</span>
                  <span>{taskHistory.length} done</span>
                </div>
                <ol className="zaki-agent-inspector__job-list">
                  {taskHistory.map((task) => (
                    <li key={task.taskId} className="zaki-agent-inspector__job-row">
                      <div>
                        <strong title={task.description}>{compactJobTitle(task.description || task.taskId)}</strong>
                        <span>{taskStatusLabel(task.status)}</span>
                      </div>
                      <small>{formatCalendarStamp(task.updatedAt)}</small>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
            <section className="zaki-agent-inspector__jobs" data-testid="agent-job-ledger">
              <div className="zaki-agent-inspector__jobs-head">
                <span>run history</span>
                <span>
                  {jobsLoading ? "loading" : jobs.length ? `${jobs.length} jobs` : "no jobs"}
                </span>
              </div>
              {jobsLoading && !jobs.length ? (
                <div className="v2-empty-line">Loading job ledger...</div>
              ) : null}
              {jobsError ? (
                <div className="v2-empty-line">Job ledger unavailable: {jobsError}</div>
              ) : null}
              {jobs.length ? (
                <ol className="zaki-agent-inspector__job-list">
                  {jobs.slice(0, 5).map((job) => (
                    <li key={job.id} className="zaki-agent-inspector__job-row">
                      <div>
                        <strong title={job.title}>{compactJobTitle(job.title)}</strong>
                        <span>
                          {job.status || "unknown"} · {job.schedule || "foreground run"}
                        </span>
                      </div>
                      <small>
                        next {formatCalendarStamp(job.nextRunAt)} · last{" "}
                        {formatCalendarStamp(job.lastRunAt || job.createdAt)}
                      </small>
                      {job.error ? <small>{job.error}</small> : null}
                    </li>
                  ))}
                </ol>
              ) : !jobsLoading && !jobsError ? (
                <div className="v2-empty-line">Completed and scheduled Agent jobs will appear here.</div>
              ) : null}
            </section>
            <div className="zaki-agent-inspector__plan-foot">
              <span>
                {hasActiveRun
                  ? "Live plan updates are attached to this run."
                  : "No active plan. Finished backend tasks are shown as history only."}
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
            {cronFormOpen ? (
              <div className="zaki-agent-inspector__cron-form" data-testid="agent-cron-form">
                <div className="zaki-agent-inspector__cron-form-head">
                  <span>{editingCronId ? "edit schedule" : "new schedule"}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCronFormOpen(false);
                      resetCronForm();
                    }}
                    aria-label="Close schedule form"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </div>
                <input
                  className="zaki-agent-inspector__cron-input"
                  value={cronNameDraft}
                  placeholder="Name, optional"
                  onChange={(event) => setCronNameDraft(event.target.value)}
                />
                <input
                  className="zaki-agent-inspector__cron-input is-mono"
                  value={cronExpressionDraft}
                  placeholder="0 */6 * * *"
                  onChange={(event) => setCronExpressionDraft(event.target.value)}
                />
                <textarea
                  className="zaki-agent-inspector__cron-input"
                  value={cronPromptDraft}
                  rows={3}
                  placeholder="What should ZAKI do on this schedule?"
                  onChange={(event) => setCronPromptDraft(event.target.value)}
                />
                <div className="zaki-agent-inspector__cron-actions">
                  <button
                    type="button"
                    onClick={() => void handleCronSave()}
                    disabled={cronBusyId === "cron-create" || cronBusyId === `cron-update:${editingCronId}`}
                  >
                    {cronBusyId ? "Saving" : editingCronId ? "Update schedule" : "Create schedule"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCronFormOpen(false);
                      resetCronForm();
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
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
                        <div className="zaki-agent-inspector__cron-actions">
                          {confirmCronDeleteId === job.id ? (
                            <>
                              <button
                                type="button"
                                disabled={cronBusyId === `cron-delete:${job.id}`}
                                onClick={() => void handleCronDelete(job)}
                              >
                                {cronBusyId === `cron-delete:${job.id}` ? "Deleting" : "Confirm delete"}
                              </button>
                              <button type="button" onClick={() => setConfirmCronDeleteId(null)}>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => beginCronEdit(job)}>
                                <Pencil className="size-3.5" aria-hidden />
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={cronBusyId === `cron-toggle:${job.id}`}
                                onClick={() => void handleCronToggle(job)}
                              >
                                {job.paused ? (
                                  <Play className="size-3.5" aria-hidden />
                                ) : (
                                  <Pause className="size-3.5" aria-hidden />
                                )}
                                {job.paused ? "Resume" : "Pause"}
                              </button>
                              <button type="button" onClick={() => setConfirmCronDeleteId(job.id)}>
                                <Trash2 className="size-3.5" aria-hidden />
                                Delete
                              </button>
                            </>
                          )}
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
            <PanelActionButton onClick={beginCronCreate} ariaLabel="Create schedule">
              <Plus className="size-4" aria-hidden />
              New schedule
            </PanelActionButton>
            <PanelActionButton onClick={() => void refreshRuntimeLedger()} ariaLabel="Refresh schedules">
              <CalendarClock className="size-4" aria-hidden />
              Refresh ledger
            </PanelActionButton>
          </V2Panel>
        ) : null}

        {tab === "evidence" ? (
          <V2Panel aria-label="Evidence" className="zaki-agent-inspector__pane">
            <V2PanelHead title="Evidence" meta={sourceEntries.length ? "runtime audit trail" : lastChannel || "agent"} />
            {sourceEntries.length ? (
              <div className="zaki-agent-inspector__source-stack">
                {sourceEntries.map((event, index) => (
                  <article key={event.id} className="zaki-agent-inspector__source-doc">
                    <div className="zaki-agent-inspector__source-head">
                      <span className="name">{event.files[0] || event.label}</span>
                      <span className="meta">
                        [{index + 1}] · {evidenceCategoryLabel(event.category)} · {event.meta || formatClock(event.timestamp)}
                      </span>
                    </div>
                    <div className="zaki-agent-inspector__source-body">
                      <span className="hl">{event.summary}</span>
                      {event.files.length > 1 ? (
                        <small>{event.files.slice(1).join(", ")}</small>
                      ) : null}
                      {event.href ? (
                        <a href={event.href} target="_blank" rel="noreferrer">
                          Open source
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="v2-empty-line">
                No sources surfaced in this turn yet. Web pages, files, memory hits, and context events will appear here when the runtime emits them.
              </div>
            )}
            <div className="zaki-agent-inspector__evidence-context">
              <span>context source</span>
              <strong>{contextSourceLabel(contextGaugeData)}</strong>
              <small>
                {ctxPct != null
                  ? `${Math.round(ctxPct)}% pressure${
                      contextGaugeData?.confidence ? ` · ${contextGaugeData.confidence}` : ""
                    }`
                  : contextGaugeData
                    ? "-- pressure"
                    : "No trusted context sample"}
              </small>
            </div>
            <PanelActionButton onClick={onOpenMemory} ariaLabel="Open memory graph">
              <Brain className="size-4" aria-hidden />
              Open memory graph
            </PanelActionButton>
          </V2Panel>
        ) : null}

        {tab === "artifacts" ? (
          <V2Panel aria-label="Artifacts" className="zaki-agent-inspector__pane">
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
                {sortedArtifacts.map((artifact) => {
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
                          <span>{artifact.version != null ? `v${artifact.version}` : "current"}</span>
                          <span data-state={shareUrl ? "shared" : "private"}>
                            {shareUrl ? "shared" : "private"}
                          </span>
                          <span>{formatCalendarStamp(artifact.updatedAt)}</span>
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
                          const availability = getAgentArtifactExportAvailability(artifact, format);
                          const exportState = artifactExportStates[artifact.id]?.[format];
                          const formatLabel = getAgentArtifactExportFormatLabel(format);
                          const label = `Download ${formatLabel}`;
                          const unavailableReason =
                            availability.reason || exportState?.error || `${formatLabel} export unavailable`;
                          const exported = isExportedState(exportState);
                          if (exported) {
                            return (
                              <button
                                key={format}
                                type="button"
                                className="zaki-agent-inspector__artifact-action is-ready"
                                onClick={() => void handleArtifactDownload(artifact, format, exportState.url)}
                                data-testid={`agent-artifact-download-${format}-${artifact.id}`}
                                aria-label={`${label} for ${artifact.title}`}
                              >
                                <Download className="size-3.5" aria-hidden />
                                {formatLabel}
                              </button>
                            );
                          }
                          if (!availability.supported) {
                            return (
                              <button
                                key={format}
                                type="button"
                                className="zaki-agent-inspector__artifact-action is-unavailable"
                                disabled
                                data-testid={`agent-artifact-export-${format}-${artifact.id}`}
                                aria-label={`${formatLabel} export unavailable for ${artifact.title}`}
                                title={unavailableReason}
                              >
                                <Download className="size-3.5" aria-hidden />
                                {formatLabel} unavailable
                              </button>
                            );
                          }
                          const failedWithUrl = exportState?.status === "failed" && exportState.url;
                          const actionText =
                            exportState?.status === "exporting"
                              ? "Exporting"
                              : exportState?.status === "failed"
                                ? failedWithUrl
                                  ? `Retry ${formatLabel} download`
                                  : `Retry ${formatLabel} export`
                                : exportState?.status === "unavailable"
                                  ? `${formatLabel} unavailable`
                                  : label;
                          return (
                            <button
                              key={format}
                              type="button"
                              className="zaki-agent-inspector__artifact-action"
                              onClick={() =>
                                failedWithUrl
                                  ? void handleArtifactDownload(artifact, format, exportState.url || "")
                                  : void handleArtifactExport(artifact, format)
                              }
                              disabled={exportState?.status === "exporting" || exportState?.status === "unavailable"}
                              data-testid={`agent-artifact-export-${format}-${artifact.id}`}
                              aria-label={`${actionText} for ${artifact.title}`}
                              title={exportState?.error || undefined}
                            >
                              <Download className="size-3.5" aria-hidden />
                              {actionText}
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
                          {shareState?.status === "sharing" ? "Sharing" : shareUrl ? "Refresh share" : "Share"}
                        </button>
                        {shareUrl ? (
                          <>
                            <a
                              className="zaki-agent-inspector__artifact-action is-ready"
                              href={shareUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open public share for ${artifact.title}`}
                            >
                              <ExternalLink className="size-3.5" aria-hidden />
                              Public
                            </a>
                            <button
                              type="button"
                              className="zaki-agent-inspector__artifact-action"
                              onClick={() => void handleArtifactShareRevoke(artifact)}
                              disabled={shareState?.status === "revoking"}
                              aria-label={`Stop sharing ${artifact.title}`}
                            >
                              <Link2Off className="size-3.5" aria-hidden />
                              {shareState?.status === "revoking" ? "Stopping" : "Stop"}
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          className="zaki-agent-inspector__artifact-action"
                          onClick={() => void handleCopyArtifactLink(artifact)}
                          disabled={!shareUrl && !PUBLIC_AGENT_ARTIFACT_EXPORT_FORMATS.some((format) => artifactExportStates[artifact.id]?.[format]?.url)}
                          aria-label={`Copy link for ${artifact.title}`}
                        >
                          {shareUrl ? <Link2 className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                          {shareState?.status === "copied" ? "Copied" : "Copy"}
                        </button>
                      </div>
                      {shareState?.status === "failed" ? (
                        <div className="zaki-agent-inspector__artifact-state">Share/link action failed: {shareState.error || "retry available"}</div>
                      ) : null}
                      {PUBLIC_AGENT_ARTIFACT_EXPORT_FORMATS.map((format) => {
                        const exportState = artifactExportStates[artifact.id]?.[format];
                        if (
                          !exportState ||
                          exportState.status === "idle" ||
                          exportState.status === "ready" ||
                          exportState.status === "exported" ||
                          exportState.status === "exporting"
                        ) return null;
                        return (
                          <div key={format} className="zaki-agent-inspector__artifact-state">
                            {getAgentArtifactExportFormatLabel(format)} {exportState.status}: {exportState.error || "retry available"}
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
            <BrowserViewFeedPanel
              frame={browserFrame}
              embedded
              onClose={() => onCloseBrowserFrame?.()}
            />
            <V2InlineRow
              tone={browserActivity || sandbox?.enabled ? "accent" : "default"}
              icon={<Globe2 className="size-4" aria-hidden />}
              title={browserActivity ? "Agent browser active" : "Browser lanes ready"}
              meta="agent-browser/K8s plus user-browser extension"
            />
            <div className="zaki-agent-inspector__browser-lanes" data-testid="agent-browser-lanes">
              <article className={cn("zaki-agent-inspector__browser-lane", appBrowserActivity && "is-active")}>
                <div className="lane-kicker">agent-browser/K8s</div>
                <div className="lane-title">
                  {appBrowserActivity ? "watch-only browser active" : "watch-only browser"}
                </div>
                <p>Frame-per-action runtime view for pages ZAKI opens inside the isolated agent browser.</p>
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
            {extensionDiagnosticsError ? (
              <div className="v2-empty-line">
                Extension diagnostics unavailable: {extensionDiagnosticsError}
              </div>
            ) : null}
            {onOpenSettings || onOpenExtensionSettings ? (
              <div
                className="zaki-agent-inspector__settings-links"
                data-testid="agent-settings-deep-links"
                aria-label="Agent settings deep links"
              >
                {AGENT_SETTINGS_LINKS.map((link) => (
                  <PanelActionButton
                    key={link.section}
                    onClick={
                      onOpenSettings
                        ? () => onOpenSettings(link.section)
                        : link.section === "devices"
                          ? onOpenExtensionSettings
                          : undefined
                    }
                    ariaLabel={link.ariaLabel}
                  >
                    {link.icon}
                    {link.label}
                  </PanelActionButton>
                ))}
              </div>
            ) : null}
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
                <dt>Blocks</dt>
                <dd>{timelineBlocks.length}</dd>
              </div>
              <div>
                <dt>Events</dt>
                <dd>{recentTrace.length}</dd>
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
                <span>runtime traces</span>
                <span>{tracesLoading ? "loading" : traces?.length ? `${traces.length} records` : "none"}</span>
              </div>
              {tracesLoading && !traces ? (
                <div className="v2-empty-line">Loading trace ledger...</div>
              ) : null}
              {tracesError ? (
                <div className="v2-empty-line">Trace ledger unavailable: {tracesError}</div>
              ) : null}
              {traces && traces.length === 0 ? (
                <div className="v2-empty-line">
                  No retained trace records yet. Shared trace links persist as sanitized snapshots.
                </div>
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
