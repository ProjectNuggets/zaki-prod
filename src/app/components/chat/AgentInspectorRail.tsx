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
  type AgentTodoItem,
  type AgentTodoList,
  type AgentTodoStatus,
  type AgentTrace,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { compileSchedule, type FollowUpSchedule } from "@/queries/useAgentScheduledFollowUps";
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
import {
  buildAgentInspectorPanelModel,
  type AgentInspectorPanelEvent,
} from "./AgentInspectorPanelModel";

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
  oneShot?: boolean;
  error?: string | null;
};

export type AgentInspectorJob = {
  id: string;
  title: string;
  prompt?: string | null;
  status: string | null;
  schedule: string | null;
  nextRunAt: number | null;
  lastRunAt: number | null;
  createdAt: number | null;
  error?: string | null;
  enabled?: boolean;
  paused?: boolean;
  lastStatus?: string | null;
  failureCount?: number;
  oneShot?: boolean;
};

type ScheduleQuickKey =
  | "in1h"
  | "in4h"
  | "tomorrow9"
  | "weekdays9"
  | "weekly_mon9"
  | "custom"
  | "advanced";

type ScheduleRow = {
  id: string;
  displayTitle: string;
  brief: string | null;
  cadenceLabel: string;
  rawSchedule: string | null;
  prompt: string | null;
  schedule: string | null;
  status: string | null;
  enabled: boolean;
  paused: boolean;
  nextRunAt: number | null;
  lastRunAt: number | null;
  lastStatus: string | null;
  failureCount: number;
  error: string | null;
  oneShot: boolean;
  editableJob: AgentInspectorCronJob;
  runtimeJob: AgentInspectorJob | null;
};

type ScheduleTabState = "loading" | "attention" | "ready" | "empty" | "unavailable";

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
type ArtifactTabState = "loading" | "ready" | "syncing" | "empty" | "unavailable";

type ArtifactRow = {
  artifact: AgentInspectorArtifact;
  shareUrl: string | null;
  supportedFormats: AgentArtifactExportFormat[];
};

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

type SourceRow = {
  event: AgentInspectorPanelEvent;
  title: string;
  summary: string;
  meta: string;
};

function sourceDomain(href?: string | null): string | null {
  if (!href) return null;
  try {
    return new URL(href).hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

function sourceTitle(event: AgentInspectorPanelEvent): string {
  if (event.category === "web") return sourceDomain(event.href) || "Web source";
  if (event.category === "file") return event.files[0] || event.label || "File source";
  if (event.category === "memory") return "Memory";
  if (event.category === "retrieval" || event.category === "compaction" || event.category === "continuity") {
    return "Retrieved context";
  }
  return event.files[0] || event.label || "Source";
}

function sourceMeta(event: AgentInspectorPanelEvent): string {
  return `${evidenceCategoryLabel(event.category)} · ${event.meta || formatClock(event.timestamp)}`;
}

function buildSourceRows(events: AgentInspectorPanelEvent[]): SourceRow[] {
  return events.map((event) => ({
    event,
    title: sourceTitle(event),
    summary: event.summary,
    meta: sourceMeta(event),
  }));
}

function pluralSource(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function sourceBrief(events: AgentInspectorPanelEvent[], hasContext: boolean): string | undefined {
  const web = events.filter((event) => event.category === "web").length;
  const files = events.filter((event) => event.category === "file").length;
  const memory = events.filter((event) => event.category === "memory").length;
  const context = events.filter((event) =>
    event.category === "retrieval" || event.category === "compaction" || event.category === "continuity"
  ).length;
  const parts = [
    web ? pluralSource(web, "web") : "",
    files ? pluralSource(files, "file") : "",
    memory ? (memory === 1 ? "memory used" : `${memory} memories used`) : "",
    context ? pluralSource(context, "context hit") : "",
    hasContext && !context ? "context sample" : "",
  ].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  return hasContext ? "context sample" : undefined;
}

function hasTrustedContextSample(data: ContextGaugeData | null, pressurePct: number | null): boolean {
  if (!data) return false;
  return pressurePct != null || data.source === "live_session" || data.confidence === "exact";
}

function planStepVisualState(status?: string | null) {
  if (status === "done" || status === "completed" || status === "succeeded") return "done";
  if (status === "running" || status === "in_progress") return "live";
  if (status === "failed" || status === "blocked" || status === "cancelled") return "blocked";
  return "queued";
}

function planStepStatusIcon(status?: string | null) {
  const visualState = planStepVisualState(status);
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

function compactPlanStepTitle(
  step: NonNullable<NonNullable<AgentSessionPlanResponse["plan"]>["steps"]>[number],
  index: number
) {
  return step.title || step.description || `Step ${index + 1}`;
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

function scheduleNumber(value: number) {
  return value < 10 ? `0${value}` : String(value);
}

function defaultScheduleCustomDateTime(): string {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  return `${next.getFullYear()}-${scheduleNumber(next.getMonth() + 1)}-${scheduleNumber(next.getDate())}T${scheduleNumber(next.getHours())}:${scheduleNumber(next.getMinutes())}`;
}

function scheduleFromQuick(quick: ScheduleQuickKey, customDateTime: string): FollowUpSchedule | null {
  if (quick === "in1h") return { kind: "in_minutes", minutes: 60 };
  if (quick === "in4h") return { kind: "in_minutes", minutes: 240 };
  if (quick === "tomorrow9") {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
    return { kind: "at_datetime", date };
  }
  if (quick === "weekdays9") return { kind: "weekdays", hour: 9, minute: 0 };
  if (quick === "weekly_mon9") return { kind: "weekly", dow: 1, hour: 9, minute: 0 };
  if (quick === "custom") {
    const date = customDateTime ? new Date(customDateTime) : null;
    if (!date || Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return null;
    return { kind: "at_datetime", date };
  }
  return null;
}

function schedulePreviewText(schedule: FollowUpSchedule | null) {
  if (!schedule) return "pick a future time";
  if (schedule.kind === "in_minutes") {
    return formatCalendarStamp(Date.now() + schedule.minutes * 60_000);
  }
  if (schedule.kind === "at_datetime") return formatCalendarStamp(schedule.date.getTime());
  if (schedule.kind === "weekdays") {
    return `weekdays ${scheduleNumber(schedule.hour)}:${scheduleNumber(schedule.minute)}`;
  }
  return `mondays ${scheduleNumber(schedule.hour)}:${scheduleNumber(schedule.minute)}`;
}

function compactScheduleText(value?: string | null): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeScheduleExpression(value?: string | null): string {
  return compactScheduleText(value).toLowerCase();
}

function normalizeScheduleFingerprintText(value?: string | null): string {
  return compactScheduleText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scheduleDescriptor(value: { prompt?: string | null; name?: string | null; title?: string | null }) {
  return compactScheduleText(value.prompt) || compactScheduleText(value.name) || compactScheduleText(value.title);
}

function scheduleFingerprint(schedule?: string | null, descriptor?: string | null): string | null {
  const normalizedSchedule = normalizeScheduleExpression(schedule);
  const normalizedDescriptor = normalizeScheduleFingerprintText(descriptor);
  if (!normalizedSchedule || !normalizedDescriptor) return null;
  return `${normalizedSchedule}::${normalizedDescriptor}`;
}

function scheduleIntentLabel(prompt?: string | null): string {
  const haystack = normalizeScheduleFingerprintText(prompt);
  if (/\bremind(?:er)?\b/.test(haystack)) return "Reminder";
  if (/\breport\b/.test(haystack)) return "Scheduled report";
  if (/\bbrief(?:ing)?\b/.test(haystack)) return "Scheduled brief";
  if (/\bdigest\b/.test(haystack)) return "Scheduled digest";
  if (/\b(summary|summarize)\b/.test(haystack)) return "Scheduled summary";
  if (/\b(check|scan|audit|review)\b/.test(haystack)) return "Scheduled check";
  return "Scheduled job";
}

function readableScheduleCase(value: string): string {
  const letters = value.replace(/[^A-Za-z]/g, "");
  if (letters.length < 18) return value;
  const upper = letters.replace(/[^A-Z]/g, "").length;
  if (upper / letters.length < 0.7) return value;
  const lowered = value.toLowerCase();
  return lowered.replace(/(^|[.!?]\s+)([a-z])/g, (_match, prefix: string, letter: string) =>
    `${prefix}${letter.toUpperCase()}`
  );
}

function truncateScheduleBrief(value: string, maxLength = 180): string {
  if (value.length <= maxLength) return value;
  const clipped = value.slice(0, maxLength).replace(/\s+\S*$/, "").trim();
  return `${clipped || value.slice(0, maxLength).trim()}...`;
}

function scheduleBriefFromPrompt(prompt?: string | null): string | null {
  let text = compactScheduleText(prompt);
  if (!text) return null;

  text = text
    .replace(/^prepare\s+(?:the\s+)?scheduled\s+(?:report|brief)\s+now\.?\s*/i, "")
    .replace(/\b(?:brief|report)\s+specification\s*:\s*/gi, "")
    .replace(/\bstyle\s*:\s*/gi, "")
    .replace(/\bformat\s*:\s*/gi, "");

  const lower = text.toLowerCase();
  const internalMarkers = [
    " read heartbeat.md",
    " use runtime_info",
    " use schedule first",
    " using read-only",
    " read-only tools",
    " wake policy",
    " scheduler delivery",
    " final output",
    " do not call",
    " do not create",
    " do not update",
    " deliver one ",
    " then gather",
    " workspace only",
  ];
  const cutIndex = internalMarkers
    .map((marker) => lower.indexOf(marker))
    .filter((index) => index > 12)
    .sort((a, b) => a - b)[0];
  if (typeof cutIndex === "number") text = text.slice(0, cutIndex);

  const sentences = text.match(/[^.!?]+[.!?]?/g) || [text];
  const useful = sentences
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .filter((sentence) => {
      const normalized = sentence.toLowerCase();
      return !/\b(runtime_info|heartbeat\.md|scheduler|wake policy|do not|read-only tools?)\b/.test(normalized);
    })
    .slice(0, 2)
    .map(readableScheduleCase)
    .join(" ");
  const brief = (useful || readableScheduleCase(text))
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
  return brief ? truncateScheduleBrief(brief) : null;
}

function scheduleDisplayTitle(job: AgentInspectorCronJob): string {
  const explicitName = compactScheduleText(job.name);
  return explicitName || scheduleIntentLabel(job.prompt);
}

function parseCronNumber(value: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

function expandCronDayOfWeek(value: string): number[] | null {
  const normalized = value.trim();
  if (!normalized || normalized === "*" || normalized === "?") return null;
  const days = new Set<number>();
  for (const segment of normalized.split(",")) {
    const part = segment.trim();
    if (!part) continue;
    if (part.includes("-")) {
      const [startRaw, endRaw] = part.split("-");
      if (!startRaw || !endRaw) return null;
      const start = parseCronNumber(startRaw, 0, 7);
      const end = parseCronNumber(endRaw, 0, 7);
      if (start == null || end == null || start > end) return null;
      for (let day = start; day <= end; day += 1) days.add(day === 7 ? 0 : day);
      continue;
    }
    const day = parseCronNumber(part, 0, 7);
    if (day == null) return null;
    days.add(day === 7 ? 0 : day);
  }
  return [...days].sort((a, b) => a - b);
}

function sameCronDays(left: number[], right: number[]) {
  return left.length === right.length && left.every((day, index) => day === right[index]);
}

function humanizeScheduleCadence(expression: string | null, oneShot: boolean, nextRunAt: number | null): string {
  if (oneShot && nextRunAt) return `Runs ${formatCalendarStamp(nextRunAt)}`;
  const raw = normalizeScheduleExpression(expression);
  if (!raw) return "Schedule pending";
  const parts = raw.split(" ");
  if (parts.length !== 5) return "Custom schedule";
  const [minuteRaw, hourRaw, dayOfMonth, month, dayOfWeek] = parts;
  if (!minuteRaw || !hourRaw || !dayOfMonth || !month || !dayOfWeek) return "Custom schedule";
  const minute = parseCronNumber(minuteRaw, 0, 59);
  const hour = parseCronNumber(hourRaw, 0, 23);
  if (minute == null || hour == null) return "Custom schedule";
  const time = `${scheduleNumber(hour)}:${scheduleNumber(minute)}`;
  if (nextRunAt && dayOfMonth !== "*" && month !== "*") return `Runs ${formatCalendarStamp(nextRunAt)}`;
  if (dayOfMonth !== "*" || month !== "*") return `Custom schedule at ${time}`;
  const days = expandCronDayOfWeek(dayOfWeek);
  if (!days) return `Every day at ${time}`;
  if (sameCronDays(days, [1, 2, 3, 4, 5])) return `Weekdays at ${time}`;
  const dayNames = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
  const shortDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  if (days.length === 1) {
    const day = days[0];
    return `${typeof day === "number" ? dayNames[day] || "Scheduled" : "Scheduled"} at ${time}`;
  }
  return `${days.map((day) => shortDayNames[day] || String(day)).join(", ")} at ${time}`;
}

function findRuntimeJobForCron(
  cronJob: AgentInspectorCronJob,
  jobs: AgentInspectorJob[],
  consumedJobIds: Set<string>
): AgentInspectorJob | null {
  const idMatch = jobs.find((job) => job.id === cronJob.id && !consumedJobIds.has(job.id));
  if (idMatch) {
    consumedJobIds.add(idMatch.id);
    return idMatch;
  }
  const cronFingerprint = scheduleFingerprint(cronJob.schedule, scheduleDescriptor(cronJob));
  if (!cronFingerprint) return null;
  const fingerprintMatch = jobs.find((job) => {
    if (consumedJobIds.has(job.id)) return false;
    return scheduleFingerprint(job.schedule, scheduleDescriptor(job)) === cronFingerprint;
  });
  if (fingerprintMatch) consumedJobIds.add(fingerprintMatch.id);
  return fingerprintMatch ?? null;
}

function scheduleRowFromCron(job: AgentInspectorCronJob, runtimeJob: AgentInspectorJob | null): ScheduleRow {
  const nextRunAt = runtimeJob?.nextRunAt ?? job.nextRunAt;
  const rawSchedule = job.schedule ?? runtimeJob?.schedule ?? null;
  return {
    id: job.id,
    displayTitle: scheduleDisplayTitle(job),
    brief: scheduleBriefFromPrompt(job.prompt),
    cadenceLabel: humanizeScheduleCadence(rawSchedule, Boolean(job.oneShot ?? runtimeJob?.oneShot), nextRunAt),
    rawSchedule,
    prompt: job.prompt,
    schedule: rawSchedule,
    status: runtimeJob?.status ?? job.status,
    enabled: job.enabled,
    paused: job.paused,
    nextRunAt,
    lastRunAt: runtimeJob?.lastRunAt ?? job.lastRunAt,
    lastStatus: runtimeJob?.lastStatus ?? job.lastStatus,
    failureCount: runtimeJob?.failureCount ?? job.failureCount,
    error: runtimeJob?.error ?? job.error ?? null,
    oneShot: Boolean(job.oneShot ?? runtimeJob?.oneShot),
    editableJob: job,
    runtimeJob,
  };
}

function scheduleRowsFromSources(jobs: AgentInspectorJob[], cronJobs: AgentInspectorCronJob[]) {
  const consumedJobIds = new Set<string>();
  return cronJobs.map((job) => scheduleRowFromCron(job, findRuntimeJobForCron(job, jobs, consumedJobIds)));
}

function scheduleRowHealth(row: ScheduleRow) {
  if (row.paused || !row.enabled) return "paused";
  if (
    row.failureCount > 0 ||
    row.error ||
    /\b(failed|failure|error|lost|timed_out|cancelled)\b/i.test(`${row.status || ""} ${row.lastStatus || ""}`)
  ) {
    return "attention";
  }
  if (/\brunning\b/i.test(row.status || "")) return "running";
  return "scheduled";
}

function scheduleRowHealthLabel(row: ScheduleRow) {
  const health = scheduleRowHealth(row);
  if (health === "attention") {
    if (row.failureCount > 0) return `${row.failureCount} failures`;
    return row.error ? "attention" : "attention";
  }
  if (row.oneShot && health === "scheduled") return "one-time";
  return health;
}

function scheduleRowRank(row: ScheduleRow) {
  const health = scheduleRowHealth(row);
  if (health === "attention") return 0;
  if (health === "running") return 1;
  if (health === "scheduled") return 2;
  return 3;
}

function sortScheduleRows(rows: ScheduleRow[]) {
  return [...rows].sort((a, b) => {
    const rankDelta = scheduleRowRank(a) - scheduleRowRank(b);
    if (rankDelta) return rankDelta;
    const left = a.nextRunAt ?? Number.MAX_SAFE_INTEGER;
    const right = b.nextRunAt ?? Number.MAX_SAFE_INTEGER;
    if (left !== right) return left - right;
    return a.displayTitle.localeCompare(b.displayTitle);
  });
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

function supportedArtifactFormats(
  artifact: AgentInspectorArtifact,
  states: Partial<Record<AgentArtifactExportFormat, AgentArtifactExportState>> | undefined
) {
  return PUBLIC_AGENT_ARTIFACT_EXPORT_FORMATS.filter((format) => {
    if (states?.[format]) return true;
    return getAgentArtifactExportAvailability(artifact, format).supported;
  });
}

function artifactBrief({
  count,
  shared,
  latest,
  syncing,
}: {
  count: number;
  shared: number;
  latest: number | null;
  syncing: number;
}) {
  const parts = [
    count ? `${count} deliverable${count === 1 ? "" : "s"}` : "",
    shared ? `${shared} shared` : "",
    latest ? `updated ${formatCalendarStamp(latest)}` : "",
    syncing ? `${syncing} syncing` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
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
  cronJobs = [],
  cronLoading = false,
  cronError = null,
  jobs = [],
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
  contextGaugeData,
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
  const [todoBusyKey, setTodoBusyKey] = useState<string | null>(null);
  const [planData, setPlanData] = useState<AgentSessionPlanResponse | null>(null);
  const [cronFormOpen, setCronFormOpen] = useState(false);
  const [editingCronId, setEditingCronId] = useState<string | null>(null);
  const [cronNameDraft, setCronNameDraft] = useState("");
  const [cronExpressionDraft, setCronExpressionDraft] = useState("0 */6 * * *");
  const [cronPromptDraft, setCronPromptDraft] = useState("");
  const [cronQuickDraft, setCronQuickDraft] = useState<ScheduleQuickKey>("in1h");
  const [cronCustomDateTimeDraft, setCronCustomDateTimeDraft] = useState(defaultScheduleCustomDateTime);
  const [cronBusyId, setCronBusyId] = useState<string | null>(null);
  const [confirmCronDeleteId, setConfirmCronDeleteId] = useState<string | null>(null);
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);
  const [expandedArtifactId, setExpandedArtifactId] = useState<string | null>(null);

  const shareUrlForArtifact = (artifact: AgentInspectorArtifact) => {
    const state = artifactShareStates[artifact.id];
    if (state) return state.url || null;
    return getAgentArtifactShareUrl(artifact as unknown as Record<string, unknown>) || artifact.shareUrl || null;
  };

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
  const artifactIds = useMemo(
    () => new Set(sortedArtifacts.map((artifact) => artifact.id).filter(Boolean)),
    [sortedArtifacts]
  );
  const provisionalArtifactEntries = artifactEntries.filter(
    (event) => !event.artifactId || !artifactIds.has(event.artifactId)
  );
  const artifactRows: ArtifactRow[] = artifactsScope === "recent"
    ? []
    : sortedArtifacts.map((artifact) => ({
        artifact,
        shareUrl: shareUrlForArtifact(artifact),
        supportedFormats: supportedArtifactFormats(artifact, artifactExportStates[artifact.id]),
      }));
  const syncingArtifactRows = provisionalArtifactEntries;
  const artifactLatestUpdate = artifactRows
    .map((row) => row.artifact.updatedAt)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .sort((a, b) => b - a)[0] ?? null;
  const artifactBriefText = artifactBrief({
    count: artifactRows.length,
    shared: artifactRows.filter((row) => Boolean(row.shareUrl)).length,
    latest: artifactLatestUpdate,
    syncing: syncingArtifactRows.length,
  });
  const artifactTabState: ArtifactTabState = artifactsLoading && !artifactRows.length && !syncingArtifactRows.length
    ? "loading"
    : artifactRows.length
      ? "ready"
      : syncingArtifactRows.length
        ? "syncing"
        : artifactsError
          ? "unavailable"
          : "empty";
  const artifactTabCount = artifactRows.length || syncingArtifactRows.length || undefined;
  const browserEntries = panelModel.browser;
  const scheduleEvents = panelModel.cron;
  const scheduleRows = useMemo(
    () => sortScheduleRows(scheduleRowsFromSources(jobs, cronJobs)),
    [jobs, cronJobs]
  );
  const scheduleLoading = cronLoading && !scheduleRows.length;
  const scheduleAttentionCount = scheduleRows.filter(
    (row) => scheduleRowHealth(row) === "attention"
  ).length;
  const scheduleActiveCount = scheduleRows.filter((row) => row.enabled && !row.paused).length;
  const schedulePausedCount = scheduleRows.filter((row) => row.paused || !row.enabled).length;
  const scheduleNextRun = scheduleRows
    .filter((row) => row.enabled && !row.paused && row.nextRunAt)
    .sort((a, b) => (a.nextRunAt ?? 0) - (b.nextRunAt ?? 0))[0]?.nextRunAt ?? null;
  const scheduleLastRow = [...scheduleRows]
    .filter((row) => row.lastRunAt || row.error || row.lastStatus)
    .sort((a, b) => (b.lastRunAt ?? 0) - (a.lastRunAt ?? 0))[0] ?? null;
  const scheduleTabState: ScheduleTabState = scheduleLoading
    ? "loading"
    : scheduleAttentionCount
      ? "attention"
      : scheduleRows.length
        ? "ready"
        : cronError
          ? "unavailable"
          : "empty";
  const scheduleTabCount =
    scheduleTabState === "attention"
      ? "!"
      : scheduleRows.length
        ? String(scheduleRows.length)
        : undefined;
  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => a.updatedAt - b.updatedAt),
    [tasks]
  );
  const currentTasks = useMemo(
    () => sortedTasks.filter((task) => !isTerminalTask(task.status)),
    [sortedTasks]
  );
  const runningTask = currentTasks.find((task) => task.status === "running") ?? null;
  const ctxPct = contextPercent(contextGaugeData);
  const sourceRows = useMemo(() => buildSourceRows(sourceEntries), [sourceEntries]);
  const trustedContextSample = hasTrustedContextSample(contextGaugeData, ctxPct);
  const hasMemorySources = sourceEntries.some((event) => event.category === "memory");
  const sourceBriefText = sourceBrief(sourceEntries, trustedContextSample);
  const sourcesTabState: "ready" | "context" | "empty" = sourceRows.length
    ? "ready"
    : trustedContextSample
      ? "context"
      : "empty";
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
  const traceWarnCount = recentTrace.filter((event) => traceLevel(event) === "warn").length;
  const traceToolCount = recentTrace.filter((event) =>
    /\b(tool|browser|file|memory|artifact|extension|playwright|cron|automation)\b/i.test(
      `${event.label} ${event.summary}`
    )
  ).length;
  const latestLatency =
    recentTrace.find((event) => typeof event.durationMs === "number")?.durationMs ?? null;
  const blockingApproval = approvalRequest && !approvalContinuationPending ? approvalRequest : null;
  const activeTodoList = useMemo(() => {
    const lists = todosData?.lists ?? [];
    if (!lists.length) return null;
    const currentId = todosData?.current_list_id;
    return lists.find((list) => list.list_id === currentId) ?? lists[0] ?? null;
  }, [todosData]);
  type PlanWorkItem =
    | {
        kind: "persisted-todo";
        id: string;
        title: string;
        status: string;
        visualState: ReturnType<typeof todoVisualState>;
        metaParts: string[];
        list: AgentTodoList;
        item: AgentTodoItem;
      }
    | {
        kind: "task";
        id: string;
        title: string;
        status: NullalisTaskStatus;
        visualState: ReturnType<typeof taskVisualState>;
        metaParts: string[];
        task: NullalisTaskItem;
        readonlyTodo: boolean;
      };
  const persistedTodoWorkItems = useMemo<PlanWorkItem[]>(() => {
    if (!activeTodoList?.items?.length) return [];
    return activeTodoList.items.map((item) => ({
      kind: "persisted-todo" as const,
      id: `${activeTodoList.list_id}:${item.id}`,
      title: item.title || `Item ${item.id}`,
      status: String(item.status || "pending"),
      visualState: todoVisualState(item.status),
      metaParts: [
        String(item.status || "pending").replace(/_/g, " "),
        item.depends_on?.length ? `depends on ${item.depends_on.join(", ")}` : "",
        item.note || "",
      ].filter(Boolean),
      list: activeTodoList,
      item,
    }));
  }, [activeTodoList]);
  const liveTodoWorkItems = useMemo<PlanWorkItem[]>(
    () =>
      currentTasks
        .filter((task) => task.taskId.startsWith("todo:"))
        .map((task) => ({
          kind: "task" as const,
          id: task.taskId,
          title: task.description || task.taskId,
          status: task.status,
          visualState: taskVisualState(task.status),
          metaParts: [
            taskStatusLabel(task.status),
            typeof task.progressPct === "number" ? `${Math.round(task.progressPct)}%` : "",
          ].filter(Boolean),
          task,
          readonlyTodo: true,
        })),
    [currentTasks]
  );
  const backgroundWorkItems = useMemo<PlanWorkItem[]>(
    () =>
      currentTasks
        .filter((task) => !task.taskId.startsWith("todo:"))
        .map((task) => ({
          kind: "task" as const,
          id: task.taskId,
          title: task.description || task.taskId,
          status: task.status,
          visualState: taskVisualState(task.status),
          metaParts: [
            taskStatusLabel(task.status),
            typeof task.progressPct === "number" && task.status === "running"
              ? `${Math.round(task.progressPct)}%`
              : "",
            stoppedTaskIds[task.taskId] ? "stop requested" : "",
          ].filter(Boolean),
          task,
          readonlyTodo: false,
        })),
    [currentTasks, stoppedTaskIds]
  );
  const currentWorkItems = persistedTodoWorkItems.length
    ? persistedTodoWorkItems
    : liveTodoWorkItems.length
      ? liveTodoWorkItems
      : backgroundWorkItems;
  const currentWorkSource = persistedTodoWorkItems.length
    ? "persisted checklist"
    : liveTodoWorkItems.length
      ? "live checklist"
      : backgroundWorkItems.length
        ? "background tasks"
        : "idle";
  const completedWorkCount = currentWorkItems.filter((item) => item.visualState === "done").length;
  const workProgressPercent = currentWorkItems.length
    ? Math.round(
        (currentWorkItems.reduce((total, item) => {
          if (item.visualState === "done") return total + 1;
          if (
            item.kind === "task" &&
            item.status === "running" &&
            typeof item.task.progressPct === "number"
          ) {
            return total + Math.max(0, Math.min(100, item.task.progressPct)) / 100;
          }
          return total;
        }, 0) /
          currentWorkItems.length) *
          100
      )
    : 0;
  const activePlan =
    planData?.active && planData.plan?.steps?.length ? planData.plan : null;
  const livePlanItems = useMemo(() => {
    const seen = new Set<string>();
    return transcriptEntries
      .filter((entry) => entry.phase === "plan_step" && entry.source === "reasoning_summary")
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
      .reduce<
        Array<{
          id: string;
          title: string;
          status: string;
          meta: string;
          visualState: ReturnType<typeof planStepVisualState>;
        }>
      >((items, entry) => {
        const title = (entry.text || entry.resultSummary || entry.activityLabel || "").trim();
        if (!title) return items;
        const key = title.toLowerCase();
        if (seen.has(key)) return items;
        seen.add(key);
        items.push({
          id: entry.id || `plan-step:${entry.timestamp || items.length}`,
          title,
          status: "planned",
          meta: "live plan hint",
          visualState: "queued",
        });
        return items;
      }, [])
      .slice(-8);
  }, [transcriptEntries]);
  const plannedItems = useMemo(() => {
    if (activePlan?.steps?.length) {
      return activePlan.steps.map((step, index) => ({
        id: step.id || `step-${index + 1}`,
        title: compactPlanStepTitle(step, index),
        status: step.status || (index === activePlan.current_step ? "running" : "pending"),
        meta:
          step.result_summary ||
          step.error_summary ||
          step.actual_tool ||
          step.expected_tool ||
          "runtime plan",
        visualState: planStepVisualState(step.status),
      }));
    }
    return livePlanItems;
  }, [activePlan, livePlanItems]);
  const planTabState: "blocked" | "working" | "planned" | "idle" = blockingApproval
    ? "blocked"
    : currentWorkItems.length || isStreaming || approvalContinuationPending
      ? "working"
      : plannedItems.length
        ? "planned"
        : "idle";
  const planTabCount = blockingApproval
    ? "!"
    : currentWorkItems.length
      ? currentWorkItems.length
      : planTabState === "planned"
        ? plannedItems.length || undefined
        : undefined;
  const currentWorkHeadline = approvalContinuationPending
    ? "Approved. ZAKI is continuing."
    : narrationFrame?.label ||
      runningTask?.description ||
      recentTrace[0]?.summary ||
      "Waiting for live work updates.";
  const handleTabChange = (nextTab: AgentInspectorTab) => {
    setManualTabSelected(true);
    setTab(nextTab);
  };

  const resetCronForm = () => {
    setEditingCronId(null);
    setCronNameDraft("");
    setCronExpressionDraft("0 */6 * * *");
    setCronPromptDraft("");
    setCronQuickDraft("in1h");
    setCronCustomDateTimeDraft(defaultScheduleCustomDateTime());
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
      await refreshRuntimeSchedules();
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
    setExpandedScheduleId(null);
    setCronFormOpen(true);
  };

  const beginCronEdit = (job: AgentInspectorCronJob) => {
    setEditingCronId(job.id);
    setCronNameDraft(job.name || "");
    setCronExpressionDraft(job.schedule || "0 */6 * * *");
    setCronPromptDraft(job.prompt || "");
    setCronQuickDraft("advanced");
    setConfirmCronDeleteId(null);
    setExpandedScheduleId(null);
    setCronFormOpen(true);
  };

  const refreshRuntimeSchedules = async () => {
    if (!onCronChanged) return;
    try {
      await onCronChanged();
    } catch {
      toast.error("Action completed, but schedules did not refresh.");
    }
  };

  const handleCronSave = async () => {
    const prompt = cronPromptDraft.trim();
    if (!prompt) {
      toast.error("Prompt is required.");
      return;
    }
    const busy = editingCronId ? `cron-update:${editingCronId}` : "cron-create";
    setCronBusyId(busy);
    try {
      const schedule = scheduleFromQuick(cronQuickDraft, cronCustomDateTimeDraft);
      const advanced = editingCronId || cronQuickDraft === "advanced";
      const compiled = advanced ? null : schedule ? compileSchedule(schedule) : null;
      const expression = advanced ? cronExpressionDraft.trim() : compiled?.expression ?? "";
      if (!expression) {
        throw new Error(advanced ? "Schedule expression is required." : "Pick a future schedule.");
      }
      const payload: Record<string, unknown> = {
        expression,
        prompt,
        name: cronNameDraft.trim() || null,
        job_type: "agent",
      };
      if (!editingCronId) {
        payload.one_shot = compiled?.oneShot ?? false;
      }
      const { response, data } = editingCronId
        ? await updateAgentCron(editingCronId, payload)
        : await createAgentCron(payload);
      if (!response.ok) {
        throw new Error(cronActionError(data, editingCronId ? "cron_update_failed" : "cron_create_failed"));
      }
      resetCronForm();
      setCronFormOpen(false);
      toast.success(editingCronId ? "Schedule updated." : "Schedule created.");
      await refreshRuntimeSchedules();
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
      await refreshRuntimeSchedules();
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
      setExpandedScheduleId(null);
      toast.success("Schedule deleted.");
      await refreshRuntimeSchedules();
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
    if (hasBrowserFrame) {
      setTab("browser");
      return;
    }
    if (planTabState !== "idle") {
      setTab("plan");
      return;
    }
    if (artifactTabState !== "empty" && artifactTabState !== "unavailable") {
      setTab("artifacts");
      return;
    }
    if (browserActivity) {
      setTab("browser");
      return;
    }
    if (scheduleRows.length) {
      setTab("cron");
      return;
    }
    if (sourcesTabState !== "empty") {
      setTab("evidence");
    }
  }, [
    artifactTabState,
    browserActivity,
    hasBrowserFrame,
    manualTabSelected,
    planTabState,
    scheduleRows.length,
    sourcesTabState,
    tabRequest,
  ]);

  useEffect(() => {
    if (!sessionKey) {
      setTodosData(null);
      setTodosLoading(false);
      setPlanData(null);
      return;
    }
    let active = true;
    setTodosLoading(true);

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
        }
      } else {
        setTodosData(null);
      }

      if (planResult.status === "fulfilled") {
        const { response, data } = planResult.value;
        if (response.ok) {
          setPlanData(data);
        } else {
          setPlanData(null);
        }
      } else {
        setPlanData(null);
      }
      setTodosLoading(false);
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
          { id: "plan", label: "Plan", count: planTabCount },
          { id: "cron", label: "Schedules", count: scheduleTabCount },
          { id: "evidence", label: "Sources", count: sourceRows.length || undefined },
          {
            id: "artifacts",
            label: "Artifacts",
            count: artifactTabCount,
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
                  {currentWorkItems.length ? (
                    <span className="zaki-agent-inspector__plan-progress">
                      <span className="bar" aria-hidden>
                        <span className="fill" style={{ width: `${workProgressPercent}%` }} />
                      </span>
                      <span className="num">
                        {completedWorkCount} / {currentWorkItems.length}
                      </span>
                    </span>
                  ) : (
                    <span>{planTabState}</span>
                  )}
                  <span className="sep">.</span>
                  <span>
                    {currentWorkItems.length
                      ? currentWorkSource
                      : plannedItems.length
                        ? `${plannedItems.length} planned`
                        : "session scoped"}
                  </span>
                </div>
              </div>
            </div>
            {blockingApproval ? (
              <section className="zaki-agent-inspector__jobs" data-testid="agent-plan-blocked">
                <div className="zaki-agent-inspector__jobs-head">
                  <span>blocked</span>
                  <span>{blockingApproval.riskLevel || "approval"}</span>
                </div>
                <V2InlineRow
                  tone="warn"
                  icon={<ShieldAlert className="size-4" aria-hidden />}
                  title={`Waiting on ${blockingApproval.tool}`}
                  meta={blockingApproval.reason || "Approval required before this run continues."}
                />
              </section>
            ) : null}
            <section className="zaki-agent-inspector__jobs" data-testid="agent-current-work">
              <div className="zaki-agent-inspector__jobs-head">
                <span>current work</span>
                <span>
                  {currentWorkItems.length
                    ? `${currentWorkSource} · ${currentWorkItems.length} ${currentWorkItems.length === 1 ? "item" : "items"}`
                    : tasksLoading || todosLoading
                      ? "checking"
                      : currentWorkSource}
                </span>
              </div>
              {currentWorkItems.length ? (
                <ol className="zaki-agent-inspector__plan-list">
                  {currentWorkItems.map((workItem) => (
                    <li
                      key={workItem.id}
                      data-testid="agent-task-row"
                      className={cn("zaki-agent-inspector__todo", `is-${workItem.visualState}`)}
                    >
                      <div className="zaki-agent-inspector__todo-mark" aria-hidden>
                        {workItem.kind === "persisted-todo"
                          ? todoStatusIcon(workItem.status)
                          : taskStatusIcon(workItem.status)}
                      </div>
                      <div className="zaki-agent-inspector__todo-body">
                        <div className="zaki-agent-inspector__todo-text">{workItem.title}</div>
                        <div className="zaki-agent-inspector__todo-meta">
                          {workItem.metaParts.map((part, index) => (
                            <span key={`${workItem.id}:meta:${part}`}>
                              {index > 0 ? <span className="sep">. </span> : null}
                              {part}
                            </span>
                          ))}
                        </div>
                        {workItem.kind === "persisted-todo" ? (
                          <div className="zaki-agent-inspector__todo-actions">
                            <button
                              type="button"
                              disabled={todoBusyKey === workItem.id}
                              onClick={() => void handleTodoStatusUpdate(workItem.list, workItem.item)}
                            >
                              {todoBusyKey === workItem.id ? "Updating" : todoActionLabel(workItem.status)}
                            </button>
                          </div>
                        ) : !workItem.readonlyTodo ? (
                          <div className="zaki-agent-inspector__todo-actions">
                            <button
                              type="button"
                              onClick={() => void handleExpandTask(workItem.task)}
                              aria-expanded={expandedTaskId === workItem.task.taskId}
                            >
                              {expandedTaskId === workItem.task.taskId ? "Hide details" : "Details"}
                            </button>
                            {taskCanStop(workItem.task.status) ? (
                              confirmStopTaskId === workItem.task.taskId ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={stoppingTaskId === workItem.task.taskId}
                                    onClick={() => void handleStopTask(workItem.task)}
                                  >
                                    {stoppingTaskId === workItem.task.taskId ? "Stopping" : "Confirm stop"}
                                  </button>
                                  <button type="button" onClick={() => setConfirmStopTaskId(null)}>
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  disabled={stoppingTaskId === workItem.task.taskId}
                                  onClick={() => setConfirmStopTaskId(workItem.task.taskId)}
                                >
                                  Stop
                                </button>
                              )
                            ) : null}
                          </div>
                        ) : null}
                        {workItem.kind === "task" && expandedTaskId === workItem.task.taskId ? (
                          <div className="zaki-agent-inspector__task-detail" data-testid="agent-task-detail">
                            {taskDetailLoadingId === workItem.task.taskId ? (
                              <div className="v2-empty-line">Loading task detail...</div>
                            ) : taskDetailErrorById[workItem.task.taskId] ? (
                              <div className="v2-empty-line">
                                Task detail unavailable: {taskDetailErrorById[workItem.task.taskId]}
                              </div>
                            ) : (
                              <dl>
                                <div>
                                  <dt>Task</dt>
                                  <dd>{taskDetailText(taskDetailById[workItem.task.taskId], "id", "task_id", "taskId") || workItem.task.taskId}</dd>
                                </div>
                                <div>
                                  <dt>Session</dt>
                                  <dd>{taskDetailText(taskDetailById[workItem.task.taskId], "session_key", "sessionKey") || "session scoped"}</dd>
                                </div>
                                <div>
                                  <dt>Started</dt>
                                  <dd>{taskDetailTime(taskDetailById[workItem.task.taskId], "started_at", "startedAt", "created_at", "createdAt") || "not recorded"}</dd>
                                </div>
                                <div>
                                  <dt>Updated</dt>
                                  <dd>{taskDetailTime(taskDetailById[workItem.task.taskId], "updated_at", "updatedAt", "completed_at", "completedAt") || formatCalendarStamp(workItem.task.updatedAt)}</dd>
                                </div>
                                <div>
                                  <dt>Result</dt>
                                  <dd>{taskDetailText(taskDetailById[workItem.task.taskId], "error", "last_error", "result", "summary") || taskStatusLabel(workItem.task.status)}</dd>
                                </div>
                              </dl>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : tasksLoading || todosLoading ? (
                <div className="v2-empty-line">Checking active work...</div>
              ) : planTabState === "working" ? (
                <div className={cn("zaki-agent-inspector__live-signal", "is-live")}>
                  <span>live run</span>
                  <strong>{currentWorkHeadline}</strong>
                  <small>Structured work items will appear when the runtime emits them.</small>
                </div>
              ) : (
                <div className="v2-empty-line" data-testid="agent-plan-empty">
                  No active work for this session.
                </div>
              )}
            </section>
            {plannedItems.length ? (
              <section className="zaki-agent-inspector__jobs" data-testid="agent-planned">
                <div className="zaki-agent-inspector__jobs-head">
                  <span>planned</span>
                  <span>{activePlan ? `${plannedItems.length} steps` : `${plannedItems.length} hints`}</span>
                </div>
                {activePlan?.summary ? (
                  <div className="v2-empty-line">{activePlan.summary}</div>
                ) : null}
                <ol className="zaki-agent-inspector__plan-list">
                  {plannedItems.map((item) => (
                    <li
                      key={item.id}
                      className={cn("zaki-agent-inspector__todo", `is-${item.visualState}`)}
                    >
                      <div className="zaki-agent-inspector__todo-mark" aria-hidden>
                        {planStepStatusIcon(item.status)}
                      </div>
                      <div className="zaki-agent-inspector__todo-body">
                        <div className="zaki-agent-inspector__todo-text">{item.title}</div>
                        <div className="zaki-agent-inspector__todo-meta">
                          <span>{String(item.status || "planned").replace(/_/g, " ")}</span>
                          {item.meta ? (
                            <>
                              <span className="sep">.</span>
                              <span>{item.meta}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </V2Panel>
        ) : null}

        {tab === "cron" ? (
          <V2Panel aria-label="Schedules" className="zaki-agent-inspector__pane">
            <div className="zaki-agent-inspector__cron-head">
              <div>
                <div className="zaki-agent-inspector__cron-title">scheduled work</div>
                <div className="zaki-agent-inspector__cron-meta">
                  <span>
                    <span
                      className={cn(
                        "dot",
                        scheduleTabState === "attention" || scheduleTabState === "ready" ? "running" : ""
                      )}
                      aria-hidden
                    />
                    {scheduleTabState === "loading"
                      ? "loading"
                      : scheduleRows.length
                        ? `${scheduleActiveCount} active`
                        : scheduleTabState}
                  </span>
                  <span className="sep">.</span>
                  <span>{scheduleRows.length} total</span>
                </div>
              </div>
            </div>

            <div className="zaki-agent-inspector__cron-brief" data-testid="agent-schedule-brief">
              <div>
                <span>Total</span>
                <strong>{scheduleRows.length}</strong>
              </div>
              <div>
                <span>Paused</span>
                <strong>{schedulePausedCount}</strong>
              </div>
              <div>
                <span>Attention</span>
                <strong>{scheduleAttentionCount}</strong>
              </div>
              <div>
                <span>Next</span>
                <strong>{formatCalendarStamp(scheduleNextRun)}</strong>
              </div>
              <div>
                <span>Last</span>
                <strong>
                  {scheduleLastRow?.error || scheduleLastRow?.lastStatus || formatCalendarStamp(scheduleLastRow?.lastRunAt)}
                </strong>
              </div>
            </div>

            {scheduleLoading ? <div className="v2-empty-line">Loading schedules...</div> : null}
            {scheduleTabState === "unavailable" ? (
              <div className="v2-empty-line">
                Schedules are unavailable right now. {cronError || "Try refresh."}
              </div>
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
                {!editingCronId ? (
                  <div className="zaki-agent-inspector__cron-quick" role="group" aria-label="Schedule presets">
                    {[
                      ["in1h", "In 1 hour"],
                      ["in4h", "In 4 hours"],
                      ["tomorrow9", "Tomorrow 9am"],
                      ["weekdays9", "Weekdays 9am"],
                      ["weekly_mon9", "Mondays 9am"],
                      ["custom", "Custom"],
                      ["advanced", "Advanced cron"],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className={cn(cronQuickDraft === key ? "is-active" : "")}
                        onClick={() => setCronQuickDraft(key as ScheduleQuickKey)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                ) : null}
                {cronQuickDraft === "custom" && !editingCronId ? (
                  <input
                    className="zaki-agent-inspector__cron-input is-mono"
                    type="datetime-local"
                    value={cronCustomDateTimeDraft}
                    aria-label="Custom schedule time"
                    onChange={(event) => setCronCustomDateTimeDraft(event.target.value)}
                  />
                ) : null}
                {!editingCronId && cronQuickDraft !== "advanced" ? (
                  <div className="zaki-agent-inspector__cron-preview">
                    Fires {schedulePreviewText(scheduleFromQuick(cronQuickDraft, cronCustomDateTimeDraft))}
                  </div>
                ) : null}
                <input
                  className="zaki-agent-inspector__cron-input"
                  value={cronNameDraft}
                  placeholder="Name, optional"
                  onChange={(event) => setCronNameDraft(event.target.value)}
                />
                {editingCronId || cronQuickDraft === "advanced" ? (
                  <input
                    className="zaki-agent-inspector__cron-input is-mono"
                    value={cronExpressionDraft}
                    placeholder="0 */6 * * *"
                    aria-label="Cron expression"
                    onChange={(event) => setCronExpressionDraft(event.target.value)}
                  />
                ) : null}
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

            {scheduleRows.length ? (
              <ol className="zaki-agent-inspector__cron-list" data-testid="agent-schedule-list">
                {scheduleRows.map((row) => {
                  const health = scheduleRowHealth(row);
                  const editableJob = row.editableJob;
                  const detailsOpen = expandedScheduleId === row.id;
                  return (
                    <li
                      key={row.id}
                      className={cn(
                        "zaki-agent-inspector__cron-row",
                        health === "running" ? "is-running" : "",
                        health === "attention" ? "is-attention" : "",
                        health === "paused" ? "is-paused" : ""
                      )}
                    >
                      <div className="zaki-agent-inspector__cron-status" aria-hidden>
                        <span className={health === "running" ? "dot" : health === "paused" ? "pause" : "ring"} />
                      </div>
                      <div className="zaki-agent-inspector__cron-main">
                        <div className="zaki-agent-inspector__cron-name">{row.displayTitle}</div>
                        <div className="zaki-agent-inspector__cron-sched">
                          {row.cadenceLabel}
                          {" · "}
                          {scheduleRowHealthLabel(row)}
                        </div>
                        {row.brief ? (
                          <div className="zaki-agent-inspector__cron-briefline">{row.brief}</div>
                        ) : null}
                        <div className="zaki-agent-inspector__cron-sched">
                          next {formatCalendarStamp(row.nextRunAt)} · last {formatCalendarStamp(row.lastRunAt)}
                        </div>
                        {row.error ? (
                          <div className="zaki-agent-inspector__cron-sched">last error {row.error}</div>
                        ) : null}
                        {detailsOpen ? (
                          <div className="zaki-agent-inspector__cron-details" data-testid="agent-schedule-details">
                            <dl>
                              <div>
                                <dt>Prompt</dt>
                                <dd>{row.prompt || "not set"}</dd>
                              </div>
                              <div>
                                <dt>Cron</dt>
                                <dd>{row.rawSchedule || "not set"}</dd>
                              </div>
                              <div>
                                <dt>Schedule id</dt>
                                <dd>{row.id}</dd>
                              </div>
                              <div>
                                <dt>Runtime job</dt>
                                <dd>{row.runtimeJob?.id || "not matched"}</dd>
                              </div>
                              <div>
                                <dt>Status</dt>
                                <dd>{row.lastStatus || row.status || scheduleRowHealthLabel(row)}</dd>
                              </div>
                              <div>
                                <dt>Last error</dt>
                                <dd>{row.error || "none"}</dd>
                              </div>
                            </dl>
                          </div>
                        ) : null}
                        <div className="zaki-agent-inspector__cron-actions">
                          {confirmCronDeleteId === editableJob.id ? (
                            <>
                              <button
                                type="button"
                                disabled={cronBusyId === `cron-delete:${editableJob.id}`}
                                onClick={() => void handleCronDelete(editableJob)}
                              >
                                {cronBusyId === `cron-delete:${editableJob.id}` ? "Deleting" : "Confirm delete"}
                              </button>
                              <button type="button" onClick={() => setConfirmCronDeleteId(null)}>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                aria-expanded={detailsOpen}
                                onClick={() => setExpandedScheduleId(detailsOpen ? null : row.id)}
                              >
                                Details
                              </button>
                              <button type="button" onClick={() => beginCronEdit(editableJob)}>
                                <Pencil className="size-3.5" aria-hidden />
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={cronBusyId === `cron-toggle:${editableJob.id}`}
                                onClick={() => void handleCronToggle(editableJob)}
                              >
                                {editableJob.paused ? (
                                  <Play className="size-3.5" aria-hidden />
                                ) : (
                                  <Pause className="size-3.5" aria-hidden />
                                )}
                                {editableJob.paused ? "Resume" : "Pause"}
                              </button>
                              <button type="button" onClick={() => setConfirmCronDeleteId(editableJob.id)}>
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
            ) : !scheduleLoading && scheduleTabState !== "unavailable" ? (
              <div className="v2-empty-line">No scheduled work yet.</div>
            ) : null}

            {scheduleEvents.length ? (
              <section className="zaki-agent-inspector__jobs" data-testid="agent-schedule-activity">
                <div className="zaki-agent-inspector__jobs-head">
                  <span>Recent activity</span>
                  <span>{scheduleEvents.length} events</span>
                </div>
                <ol className="zaki-agent-inspector__job-list">
                  {scheduleEvents.map((event) => (
                    <li key={event.id} className="zaki-agent-inspector__job-row">
                      <strong>{event.label}</strong>
                      <span>{event.summary}</span>
                      {event.meta ? <small>{event.meta}</small> : null}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            <PanelActionButton onClick={beginCronCreate} ariaLabel="Create schedule">
              <Plus className="size-4" aria-hidden />
              New schedule
            </PanelActionButton>
            <PanelActionButton onClick={() => void refreshRuntimeSchedules()} ariaLabel="Refresh schedules">
              <CalendarClock className="size-4" aria-hidden />
              Refresh schedules
            </PanelActionButton>
          </V2Panel>
        ) : null}

        {tab === "evidence" ? (
          <V2Panel aria-label="Sources" className="zaki-agent-inspector__pane">
            <V2PanelHead title="Sources" />
            {sourceBriefText ? (
              <div className="zaki-agent-inspector__source-brief" data-testid="agent-sources-brief">
                {sourceBriefText}
              </div>
            ) : null}
            {sourceRows.length ? (
              <div className="zaki-agent-inspector__source-stack">
                {sourceRows.map((row) => (
                  <article key={row.event.id} className="zaki-agent-inspector__source-doc">
                    <div className="zaki-agent-inspector__source-head">
                      <span className="name">{row.title}</span>
                      <span className="meta">{row.meta}</span>
                    </div>
                    <div className="zaki-agent-inspector__source-body">
                      <span className="hl">{row.summary}</span>
                      {row.event.files.length > 1 ? (
                        <small>{row.event.files.slice(1).join(", ")}</small>
                      ) : null}
                      {row.event.href ? (
                        <a href={row.event.href} target="_blank" rel="noreferrer">
                          Open source
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : sourcesTabState === "empty" ? (
              <div className="v2-empty-line">
                No sources surfaced in this turn yet. Web pages, files, memory hits, and context events will appear here when the runtime emits them.
              </div>
            ) : null}
            {trustedContextSample ? (
              <div className="zaki-agent-inspector__evidence-context">
                <span>context source</span>
                <strong>{contextSourceLabel(contextGaugeData)}</strong>
                <small>
                  {ctxPct != null
                    ? `${Math.round(ctxPct)}% pressure${
                        contextGaugeData?.confidence ? ` · ${contextGaugeData.confidence}` : ""
                      }`
                    : "Pressure unavailable"}
                </small>
              </div>
            ) : null}
            {hasMemorySources && onOpenMemory ? (
              <PanelActionButton onClick={onOpenMemory} ariaLabel="Open memory graph">
                <Brain className="size-4" aria-hidden />
                Open memory graph
              </PanelActionButton>
            ) : null}
          </V2Panel>
        ) : null}

        {tab === "artifacts" ? (
          <V2Panel aria-label="Artifacts" className="zaki-agent-inspector__pane">
            <V2PanelHead title="Artifacts" />
            {artifactBriefText ? (
              <div className="zaki-agent-inspector__artifact-brief" data-testid="agent-artifact-brief">
                {artifactBriefText}
              </div>
            ) : null}
            {artifactTabState === "loading" ? (
              <div className="v2-empty-line">Loading artifacts...</div>
            ) : null}
            {artifactTabState === "unavailable" ? (
              <div className="v2-empty-line">Artifacts are unavailable right now.</div>
            ) : null}
            {artifactRows.length ? (
              <div className="zaki-agent-inspector__artifact-list" data-testid="agent-artifact-list">
                {artifactRows.map((row) => {
                  const artifact = row.artifact;
                  const shareState = artifactShareStates[artifact.id];
                  const shareUrl = row.shareUrl;
                  const isExpanded = expandedArtifactId === artifact.id;
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
                        <button
                          type="button"
                          className="zaki-agent-inspector__artifact-action"
                          onClick={() => setExpandedArtifactId(isExpanded ? null : artifact.id)}
                          aria-expanded={isExpanded}
                          aria-label={`${isExpanded ? "Hide" : "Show"} details for ${artifact.title}`}
                        >
                          <Boxes className="size-3.5" aria-hidden />
                          Details
                        </button>
                      </div>
                      {isExpanded ? (
                        <div className="zaki-agent-inspector__artifact-details">
                          {row.supportedFormats.length ? (
                            <div className="zaki-agent-inspector__artifact-actions is-delivery">
                              {row.supportedFormats.map((format) => {
                                const exportState = artifactExportStates[artifact.id]?.[format];
                                const formatLabel = getAgentArtifactExportFormatLabel(format);
                                const label = `Download ${formatLabel}`;
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
                            </div>
                          ) : null}
                          <div className="zaki-agent-inspector__artifact-actions is-delivery">
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
                          {row.supportedFormats.map((format) => {
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
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : null}
            {syncingArtifactRows.length ? (
              <section className="zaki-agent-inspector__artifact-syncing" data-testid="agent-artifact-syncing">
                <div className="zaki-agent-inspector__jobs-head">
                  <span>Syncing</span>
                  <span>{syncingArtifactRows.length} event{syncingArtifactRows.length === 1 ? "" : "s"}</span>
                </div>
                <ol className="zaki-agent-inspector__event-list">
                  {syncingArtifactRows.map((event) => (
                    <li key={event.id}>
                      <Boxes className="zaki-agent-inspector__event-icon" aria-hidden />
                      <div>
                        <strong>{event.files[0] || event.label}</strong>
                        <span>{event.summary}</span>
                        <small>{event.meta || "Waiting for artifact record"}</small>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
            {artifactTabState === "empty" ? (
              <div className="v2-empty-line">
                No artifacts in this session yet.
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
