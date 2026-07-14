import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Boxes,
  CalendarClock,
  Copy,
  Download,
  ExternalLink,
  Link2,
  Link2Off,
  PanelRightClose,
  Pause,
  Pencil,
  Play,
  Plus,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  createAgentCron,
  deleteAgentCron,
  downloadAgentExportFile,
  exportAgentArtifact,
  revokeAgentArtifactShare,
  shareAgentArtifact,
  updateAgentCron,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { compileSchedule, type FollowUpSchedule } from "@/queries/useAgentScheduledFollowUps";
import {
  getAgentArtifactExportAvailability,
  getAgentArtifactExportDownloadUrl,
  getAgentArtifactExportFormatLabel,
  getAgentArtifactShareUrl,
  PUBLIC_AGENT_ARTIFACT_EXPORT_FORMATS,
  type AgentArtifactExportFormat,
  type AgentArtifactExportState,
} from "@/app/components/agent/agentArtifactSurface";
import { V2Panel, V2PanelHead, V2Tabs } from "@/app/components/v2";
import type { NullalisTaskItem, NullalisTranscriptEntry } from "./BotStatusRail";
import { buildAgentInspectorPanelModel } from "./AgentInspectorPanelModel";
import { AgentPlanPanel } from "./AgentPlanPanel";
import type { AgentPlanPanelStep } from "./AgentPlanPanelModel";

export type AgentInspectorTab = "plan" | "artifacts" | "cron";

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

export type AgentInspectorRailProps = {
  sessionKey?: string | null;
  tasks?: NullalisTaskItem[];
  isStreaming?: boolean;
  isOnline?: boolean;
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
  transcriptEntries: NullalisTranscriptEntry[];
  onCronChanged?: () => void | Promise<void>;
  onOpenArtifact?: (artifact: AgentInspectorArtifact) => void;
  onRetryPlanStep?: (step: AgentPlanPanelStep) => void | Promise<void>;
  tabRequest?: AgentInspectorTabRequest | null;
  onClose?: () => void;
};

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
  tasks = [],
  isStreaming = false,
  isOnline = true,
  cronJobs = [],
  cronLoading = false,
  cronError = null,
  jobs = [],
  artifacts = [],
  artifactsScope = "session",
  artifactsLoading = false,
  artifactsError = null,
  transcriptEntries,
  onCronChanged,
  onOpenArtifact,
  onRetryPlanStep,
  tabRequest = null,
  onClose,
}: AgentInspectorRailProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<AgentInspectorTab>("plan");
  const [artifactExportStates, setArtifactExportStates] = useState<
    Record<string, Partial<Record<AgentArtifactExportFormat, AgentArtifactExportState>>>
  >({});
  const [artifactShareStates, setArtifactShareStates] = useState<
    Record<string, { status: "idle" | "sharing" | "ready" | "revoking" | "failed" | "copied"; url?: string | null; error?: string | null }>
  >({});
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

  const panelModel = useMemo(
    () => buildAgentInspectorPanelModel(transcriptEntries),
    [transcriptEntries]
  );
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
  const handleTabChange = (nextTab: AgentInspectorTab) => {
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
    setTab(
      tabRequest.tab === "cron"
        ? "cron"
        : tabRequest.tab === "artifacts"
          ? "artifacts"
          : "plan"
    );
  }, [tabRequest?.id, tabRequest?.tab]);

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

  return (
    <aside className="zaki-agent-inspector" aria-label="Agent inspector">
      <div className="zaki-agent-inspector__topline">
        <div>
          <span>Agent panel</span>
          <strong>Ready</strong>
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
          {
            id: "plan",
            label: t("zakiAgent.planPanel.tab", { defaultValue: "Plan" }),
          },
          {
            id: "artifacts",
            label: "Artifacts",
            count: artifactTabCount,
          },
          { id: "cron", label: "Schedules", count: scheduleTabCount },
        ]}
      />

      <div className="zaki-agent-inspector__body">
        {tab === "plan" ? (
          <AgentPlanPanel
            sessionKey={sessionKey}
            transcriptEntries={transcriptEntries}
            tasks={tasks}
            isStreaming={isStreaming}
            isOnline={isOnline}
            onRetryStep={onRetryPlanStep}
          />
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

      </div>
    </aside>
  );
}
