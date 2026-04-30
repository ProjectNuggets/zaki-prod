import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  FileText,
  Loader2,
  Mic,
  Search,
  ShieldAlert,
  Terminal,
  Volume2,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { CONTEXT_PRESSURE_WARNING, CONTEXT_PRESSURE_NEAR_LIMIT } from "@/stores/zakiSessionUiStore";
import type {
  NullalisApprovalRequest,
  NullalisNarrationFrame,
  NullalisTaskItem,
  NullalisTaskStatus,
  NullalisTranscriptEntry,
  NullalisTranscriptEntryKind,
  NullalisTranscriptIntent,
  ZakiUsageSummary,
} from "./BotStatusRail";

function formatDuration(durationMs?: number | null) {
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs)) return null;
  return `${Math.max(0, Math.round(durationMs))}ms`;
}

function formatElapsedDuration(durationMs: number) {
  const safeDuration = Math.max(0, Math.trunc(durationMs));
  const totalSeconds = Math.floor(safeDuration / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${Math.max(1, totalSeconds)}s`;
}

function formatNarrationText(frame: NullalisNarrationFrame) {
  const label = String(frame.label || "").trim();
  const tool = String(frame.tool || "").trim();
  const duration = formatDuration(frame.durationMs);

  switch (frame.phase) {
    case "tool_start":
      return tool ? `Running ${tool}...` : label || "Running tool...";
    case "tool_done":
      return [tool ? `${tool} completed` : label || "Tool completed", duration]
        .filter(Boolean)
        .join(" · ");
    case "waiting":
      return label || "Waiting for provider...";
    case "plan_step":
      if (frame.stepIndex != null && frame.stepTotal != null && label) {
        return `Step ${frame.stepIndex}/${frame.stepTotal}: ${label}`;
      }
      return label || "Working through the plan";
    case "error_recovery":
      return label || "Retrying after a transient issue...";
    case "listening":
      return label || "Listening...";
    case "speaking":
      return label || "Speaking response...";
    case "thinking":
    default:
      return label || "Thinking...";
  }
}

function narrationIcon(frame: NullalisNarrationFrame) {
  const className = "size-3.5";
  if (frame.phase === "tool_done") return <CheckCircle2 className={className} />;
  if (frame.phase === "tool_start") return <Wrench className={className} />;
  if (frame.phase === "waiting") return <Clock3 className={className} />;
  if (frame.phase === "error_recovery") return <AlertTriangle className={className} />;
  if (frame.phase === "listening") return <Mic className={className} />;
  if (frame.phase === "speaking") return <Volume2 className={className} />;
  return <Loader2 className={cn(className, "animate-spin")} />;
}

export function NarrationStatusLine({
  frame,
  isStreaming,
}: {
  frame: NullalisNarrationFrame | null;
  isStreaming: boolean;
}) {
  if (!isStreaming || !frame) return null;

  const isPulsePhase =
    frame.phase === "thinking" ||
    frame.phase === "waiting" ||
    frame.phase === "listening" ||
    frame.phase === "speaking";

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-all duration-200",
        "border-zaki bg-zaki-raised text-zaki-secondary",
        "dark:border-[rgba(240,236,230,0.08)] dark:bg-[#141210]",
        frame.phase === "error_recovery" && "border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
        frame.phase === "tool_done" && "border-zaki-accent/30 bg-zaki-accent-10 text-zaki-accent dark:bg-zaki-accent-10"
      )}
      aria-live="polite"
    >
      <span
        className={cn(
          "grid size-5 place-items-center rounded-full bg-zaki-brand-10 text-zaki-brand",
          frame.phase === "error_recovery" && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
          frame.phase === "tool_done" && "bg-zaki-accent-15 text-zaki-accent",
          isPulsePhase && "animate-pulse"
        )}
      >
        {narrationIcon(frame)}
      </span>
      <span className="truncate font-medium font-mono-ui">{formatNarrationText(frame)}</span>
    </div>
  );
}

function transcriptToneClass(kind: NullalisTranscriptEntryKind, status?: string | null) {
  if (status === "failed" || status === "blocked" || status === "error") return "bg-zaki-brand";
  if (status === "done" || status === "succeeded" || status === "complete") return "bg-zaki-accent";
  if (kind === "tool") return "bg-zaki-accent";
  if (kind === "task") return "bg-amber-500";
  if (kind === "approval") return "bg-amber-600";
  if (kind === "transition") return "bg-zaki-brand";
  return "bg-zaki-brand/75";
}

type NullalisWorklogDisplayEntry = NullalisTranscriptEntry & {
  metaText?: string | null;
};

type NullalisWorklogGroup = {
  id: string;
  kind: NullalisTranscriptEntryKind;
  intent: NullalisTranscriptIntent;
  title: string;
  detailHint?: string | null;
  metaText?: string | null;
  status?: string | null;
  resultState?: NullalisTranscriptEntry["resultState"];
  timestamp: number;
  importance: number;
  entries: NullalisWorklogDisplayEntry[];
  details: string[];
};

export type NullalisWorklogViewModel = {
  currentAction: NullalisWorklogDisplayEntry | null;
  visibleEntries: NullalisWorklogDisplayEntry[];
  groups: NullalisWorklogGroup[];
  hiddenCount: number;
  workStartedAt: number | null;
  compactSummary: string | null;
};

function normalizeWorklogText(value: string | null | undefined) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[.]+$/g, "")
    .trim()
    .toLowerCase();
}

function inferIntent(entry: NullalisTranscriptEntry): NullalisTranscriptIntent {
  if (entry.intent) return entry.intent;
  const haystack = [
    entry.text,
    entry.phase,
    entry.tool,
    entry.command,
    ...(entry.files ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (haystack.includes("memory")) return "memory";
  if (haystack.includes("context") || haystack.includes("prompt")) return "context";
  if (haystack.includes("plan") || haystack.includes("step")) return "planning";
  if (haystack.includes("model")) return "model";
  if (haystack.includes("test") || haystack.includes("jest") || haystack.includes("vitest")) {
    return "test";
  }
  if (haystack.includes("git ") || haystack.includes("commit") || haystack.includes("push")) {
    return "git";
  }
  if (entry.files?.length) return "file";
  if (entry.tool) return "tool";
  if (entry.kind === "approval") return "approval";
  if (entry.kind === "transition") return "final";
  return "status";
}

function isLowValueEntry(entry: NullalisTranscriptEntry) {
  if (entry.source === "reasoning_summary") return false;
  if (entry.kind === "tool" || entry.kind === "task" || entry.kind === "approval") return false;
  if (entry.kind === "transition") return false;
  if (entry.files?.length || entry.command) return false;
  if (isHeartbeatEntry(entry)) return true;
  const text = normalizeWorklogText(entry.text);
  return (
    text === "starting the request" ||
    text === "processing request" ||
    text === "preparing the model request" ||
    text === "reading the model response" ||
    text === "response ready" ||
    text === "finalized the response"
  );
}

function getEntryImportance(entry: NullalisTranscriptEntry) {
  if (typeof entry.importance === "number" && Number.isFinite(entry.importance)) {
    return entry.importance;
  }
  if (entry.source === "reasoning_summary") return 90;
  if (entry.kind === "approval") return 95;
  if (entry.kind === "tool") return entry.files?.length || entry.command ? 88 : 78;
  if (entry.kind === "task") return 76;
  if (entry.kind === "transition") return 65;
  const intent = inferIntent(entry);
  if (intent === "memory" || intent === "context") return 70;
  if (intent === "model") return 35;
  return 55;
}

function entrySemanticKey(entry: NullalisTranscriptEntry) {
  return (
    entry.groupKey ||
    [
      inferIntent(entry),
      entry.kind,
      normalizeWorklogText(entry.text),
      normalizeWorklogText(entry.tool),
      normalizeWorklogText(entry.taskId),
    ].join("|")
  );
}

function composeEntryMeta(entry: NullalisTranscriptEntry) {
  if (entry.files?.length) return entry.files.join(", ");
  if (entry.command) return entry.command;
  if (entry.outputPreview) return entry.outputPreview;
  if (entry.inputPreview) return entry.inputPreview;
  const duration = formatDuration(entry.durationMs);
  if (entry.kind === "tool" && duration) return duration;
  if (entry.kind === "approval" && entry.status) return `Risk: ${entry.status}`;
  if (entry.kind === "task" && entry.status && entry.resultState !== "running") {
    return entry.status;
  }
  return null;
}

function isHeartbeatEntry(entry: NullalisTranscriptEntry) {
  const text = normalizeWorklogText(entry.text);
  return (
    entry.heartbeat === true ||
    text === "still working on the reply" ||
    text === "working through the request"
  );
}

function toolFamily(tool?: string | null) {
  const name = normalizeWorklogText(tool);
  if (name === "bash" || name === "shell" || name === "powershell") return "shell";
  if (name === "file_read" || name === "read") return "read";
  if (name === "file_write" || name === "write_file") return "write";
  if (name === "file_edit" || name === "edit") return "edit";
  if (name === "grep" || name === "search" || name === "web_search") return "search";
  if (name === "glob" || name === "list") return "list";
  return "tool";
}

function toolGroupTitle(entry: NullalisWorklogDisplayEntry, count: number, active: boolean) {
  const family = toolFamily(entry.tool);
  const verb = active ? "Running" : "Ran";
  if (family === "shell") {
    return count > 1 ? `${verb} ${count} commands` : active ? "Running command" : "Ran command";
  }
  if (family === "read") return count > 1 ? `Read ${count} files` : "Read file";
  if (family === "write") return count > 1 ? `Wrote ${count} files` : "Wrote file";
  if (family === "edit") return count > 1 ? `Edited ${count} files` : "Edited file";
  if (family === "search") return count > 1 ? `Searched ${count} times` : "Searched";
  if (family === "list") return count > 1 ? `Listed ${count} paths` : "Listed files";
  if (entry.activityLabel) return entry.activityLabel;
  return entry.tool ? `Used ${entry.tool}` : "Used a tool";
}

function groupKeyForEntry(entry: NullalisTranscriptEntry) {
  if (entry.kind === "tool") {
    if (entry.toolUseId) return `tool-use:${entry.toolUseId}`;
    if (entry.command) return `tool-command:${entry.tool}:${entry.command}`;
    if (entry.files?.length) return `tool-file:${entry.tool}:${entry.files.join("|")}`;
    return entry.groupKey || `tool:${entry.tool ?? "unknown"}:${entry.id}`;
  }
  if (entry.kind === "task" && entry.taskId) return `task:${entry.taskId}`;
  if (entry.kind === "approval") return entry.groupKey || `approval:${entry.tool ?? entry.id}`;
  if (entry.source === "reasoning_summary") return entry.id;
  return entry.groupKey || entrySemanticKey(entry);
}

function compactDetails(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => String(value || "").split(/\r?\n/))
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ).slice(0, 6);
}

function composeWorklogGroups(entries: NullalisWorklogDisplayEntry[]) {
  const groups = new Map<string, NullalisWorklogDisplayEntry[]>();
  const orderedKeys: string[] = [];
  for (const entry of entries) {
    if (isLowValueEntry(entry)) continue;
    const key = groupKeyForEntry(entry);
    if (!groups.has(key)) {
      groups.set(key, []);
      orderedKeys.push(key);
    }
    groups.get(key)?.push(entry);
  }

  return orderedKeys.map((key) => {
    const groupEntries = groups.get(key) ?? [];
    const first = groupEntries[0]!;
    const latest = groupEntries[groupEntries.length - 1]!;
    const active = latest.resultState === "running";
    const files = Array.from(new Set(groupEntries.flatMap((entry) => entry.files ?? []))).slice(0, 6);
    const commands = Array.from(
      new Set(groupEntries.map((entry) => entry.command).filter(Boolean) as string[])
    );
    const outputPreview = latest.outputPreview || null;
    const inputPreview = first.inputPreview || null;
    const details = compactDetails([
      ...commands,
      ...files,
      latest.resultSummary,
      outputPreview,
      inputPreview && !commands.length ? inputPreview : null,
    ]);
    const duration = formatDuration(latest.durationMs);
    const count =
      first.kind === "tool"
        ? Math.max(1, new Set(groupEntries.map((entry) => entry.toolUseId || entry.id)).size)
        : groupEntries.length;
    const title =
      first.kind === "tool"
        ? toolGroupTitle(latest, count, active)
        : latest.text;
    const metaText =
      files.length > 0
        ? files.join(", ")
        : commands.length > 0
          ? commands[0]
          : duration || latest.metaText || null;

    return {
      id: key,
      kind: latest.kind,
      intent: inferIntent(latest),
      title,
      detailHint: details[0] ?? null,
      metaText,
      status: latest.status,
      resultState: active ? "running" : latest.resultState,
      timestamp: latest.timestamp,
      importance: Math.max(...groupEntries.map(getEntryImportance)),
      entries: groupEntries,
      details,
    } satisfies NullalisWorklogGroup;
  });
}

function frameFallbackEntry(frame: NullalisNarrationFrame | null): NullalisWorklogDisplayEntry | null {
  if (!frame) return null;
  return {
    id: frame.id,
    kind: frame.phase === "tool_start" || frame.phase === "tool_done" ? "tool" : "narration",
    intent: frame.phase === "tool_start" || frame.phase === "tool_done" ? "tool" : "thinking",
    text: currentActionFromFrame(frame) || "Working through the request",
    timestamp: frame.timestamp,
    importance: 45,
    phase: frame.phase,
    tool: frame.tool,
    durationMs: frame.durationMs,
    resultState: frame.phase === "tool_done" ? "done" : frame.phase === "tool_start" ? "running" : null,
    groupKey: `frame:${frame.phase}:${frame.tool ?? frame.label}`,
    source: "fallback",
    metaText:
      frame.phase === "tool_done" && frame.durationMs != null
        ? formatDuration(frame.durationMs)
        : null,
  };
}

export function composeNullalisWorklog({
  entries,
  entryCount,
  frame,
  isStreaming,
}: {
  entries: NullalisTranscriptEntry[];
  entryCount?: number;
  frame: NullalisNarrationFrame | null;
  isStreaming: boolean;
}): NullalisWorklogViewModel {
  const sorted = [...entries]
    .filter((entry) => entry.text.trim())
    .sort((a, b) => a.timestamp - b.timestamp);
  const deduped: NullalisTranscriptEntry[] = [];
  const lastByKey = new Map<string, NullalisTranscriptEntry>();

  for (const entry of sorted) {
    const key = entrySemanticKey(entry);
    const previous = lastByKey.get(key);
    if (
      previous &&
      previous.resultState === entry.resultState &&
      normalizeWorklogText(previous.text) === normalizeWorklogText(entry.text)
    ) {
      continue;
    }
    if (previous && entry.kind !== "task" && entry.kind !== "tool") {
      const previousIndex = deduped.findIndex((candidate) => candidate.id === previous.id);
      if (previousIndex >= 0 && getEntryImportance(entry) >= getEntryImportance(previous)) {
        deduped.splice(previousIndex, 1);
      }
    }
    deduped.push(entry);
    lastByKey.set(key, entry);
  }

  const highSignalCount = deduped.filter((entry) => !isLowValueEntry(entry)).length;
  const filtered =
    highSignalCount > 0
      ? deduped.filter((entry) => !isLowValueEntry(entry) || getEntryImportance(entry) >= 70)
      : deduped;
  const fallback = filtered.length === 0 ? frameFallbackEntry(frame) : null;
  const displayEntries = (fallback ? [fallback, ...filtered] : filtered).map((entry) => ({
    ...entry,
    intent: inferIntent(entry),
    metaText: composeEntryMeta(entry),
  }));
  const worklogGroups = composeWorklogGroups(displayEntries).slice(-8);
  const meaningfulEntries = displayEntries.filter((entry) => !isLowValueEntry(entry)).slice(-8);
  const latestMeaningful =
    [...meaningfulEntries]
      .reverse()
      .find(
        (entry) =>
          getEntryImportance(entry) >= 40 &&
          normalizeWorklogText(entry.text) &&
          !isHeartbeatEntry(entry)
      ) ??
    meaningfulEntries[meaningfulEntries.length - 1] ??
    frameFallbackEntry(frame);
  const streamingFallbackAction: NullalisWorklogDisplayEntry | null = isStreaming
    ? {
        id: "nullalis-working-fallback",
        kind: "narration",
        intent: "thinking",
        text: "Working through the request",
        timestamp: Date.now(),
        importance: 30,
        source: "fallback",
        metaText: null,
      }
    : null;
  const currentAction: NullalisWorklogDisplayEntry | null = latestMeaningful
    ? {
        ...latestMeaningful,
        text:
          normalizeWorklogText(latestMeaningful.text) === "still working on the reply"
            ? "Working through the request"
            : latestMeaningful.text,
        metaText: composeEntryMeta(latestMeaningful),
      }
    : streamingFallbackAction;
  const currentKey = currentAction ? entrySemanticKey(currentAction) : null;
  const visibleEntries = meaningfulEntries.filter((entry) => {
    if (!currentKey) return true;
    return entry.id !== currentAction?.id && entrySemanticKey(entry) !== currentKey;
  });
  const count = Math.max(entryCount ?? entries.length, displayEntries.length);
  const firstTimestamp =
    displayEntries.reduce<number | null>(
      (earliest, entry) =>
        earliest == null || entry.timestamp < earliest ? entry.timestamp : earliest,
      frame?.timestamp ?? null
    ) ?? null;

  return {
    currentAction,
    visibleEntries,
    groups: worklogGroups,
    hiddenCount: Math.max(0, count - meaningfulEntries.length),
    workStartedAt: firstTimestamp,
    compactSummary: `${Math.max(worklogGroups.length, count)} ${Math.max(worklogGroups.length, count) === 1 ? "step" : "steps"}`,
  };
}

function currentActionFromFrame(frame: NullalisNarrationFrame | null) {
  if (!frame) return null;
  return formatNarrationText(frame);
}

function WorklogGroupIcon({ group }: { group: NullalisWorklogGroup }) {
  const className = "size-3.5";
  if (group.kind === "task") return <Circle className={className} />;
  if (group.kind === "approval") return <ShieldAlert className={className} />;
  if (group.kind === "tool") {
    const latest = group.entries[group.entries.length - 1];
    const family = toolFamily(latest?.tool);
    if (family === "search" || family === "list") return <Search className={className} />;
    if (family === "shell") return <Terminal className={className} />;
    if (family === "read" || family === "write" || family === "edit") return <FileText className={className} />;
    return <Wrench className={className} />;
  }
  if (group.intent === "file") return <FileText className={className} />;
  if (group.intent === "test" || group.intent === "git") {
    return <Terminal className={className} />;
  }
  return <Circle className={className} />;
}

function WorklogGroupRow({
  group,
  isStreaming,
}: {
  group: NullalisWorklogGroup;
  isStreaming: boolean;
}) {
  const isActive = isStreaming && group.resultState === "running";

  return (
    <details
      className={cn(
        "group rounded-zaki-xl border border-transparent px-2 py-1.5 transition-colors",
        "open:border-zaki open:bg-zaki-raised dark:open:border-[rgba(240,236,230,0.08)] dark:open:bg-[#141210]"
      )}
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 [&::-webkit-details-marker]:hidden">
        <span
          className={cn(
            "mt-1.5 grid size-5 shrink-0 place-items-center rounded-full text-zaki-muted dark:text-zaki-dark-muted",
            isActive && "bg-zaki-brand-10 text-zaki-brand animate-pulse",
            !isActive && group.resultState === "done" && "bg-zaki-accent-10 text-zaki-accent",
            !isActive && group.resultState === "failed" && "bg-zaki-brand-10 text-zaki-brand"
          )}
          aria-hidden
        >
          <WorklogGroupIcon group={group} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[15px] leading-6 text-zaki-primary/95 dark:text-zaki-dark-primary/95">
              {group.title}
            </span>
            <ChevronDown
              className="size-3 shrink-0 text-zaki-muted transition-transform group-open:rotate-180 dark:text-zaki-dark-muted"
              aria-hidden
            />
          </div>
          {group.detailHint || group.metaText ? (
            <div className="mt-0.5 truncate font-mono-ui text-[12px] leading-5 text-zaki-muted dark:text-zaki-dark-muted">
              {group.detailHint || group.metaText}
            </div>
          ) : null}
        </div>
      </summary>
      {group.details.length > 0 ? (
        <div className="ml-8 mt-2 space-y-1 border-l border-zaki pl-3 font-mono-ui text-[12px] leading-5 text-zaki-muted dark:border-[rgba(240,236,230,0.08)] dark:text-zaki-dark-muted">
          {group.details.map((detail) => (
            <div key={detail} className="break-words">
              {detail}
            </div>
          ))}
        </div>
      ) : null}
    </details>
  );
}

export function NullalisWorklog({
  entries,
  entryCount,
  frame,
  isStreaming,
  compact = false,
}: {
  entries: NullalisTranscriptEntry[];
  entryCount?: number;
  frame: NullalisNarrationFrame | null;
  isStreaming: boolean;
  compact?: boolean;
}) {
  const [clockNow, setClockNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isStreaming) return;
    setClockNow(Date.now());
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isStreaming]);

  const worklog = useMemo(
    () =>
      composeNullalisWorklog({
        entries,
        entryCount,
        frame,
        isStreaming,
      }),
    [entries, entryCount, frame, isStreaming]
  );
  const elapsedLabel =
    worklog.workStartedAt != null ? formatElapsedDuration(clockNow - worklog.workStartedAt) : null;
  const currentAction = worklog.currentAction;
  const feedEntries = worklog.visibleEntries;
  const groups = worklog.groups;
  const totalCount = Math.max(entryCount ?? entries.length, entries.length, 1);
  const compactSummary =
    worklog.compactSummary ?? `${totalCount} ${totalCount === 1 ? "step" : "steps"}`;

  if (!currentAction && feedEntries.length === 0 && groups.length === 0) return null;

  if (compact) {
    return (
      <details className="zaki-process-compact group mt-2 max-w-[92%] rounded-zaki-xl border border-zaki bg-zaki-raised px-3 py-2.5 text-zaki-primary shadow-sm dark:border-[rgba(240,236,230,0.08)] dark:bg-[#141210] dark:text-zaki-dark-primary">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium leading-6 [&::-webkit-details-marker]:hidden">
          <span
            className={cn(
              "inline-block size-2 rounded-full",
              transcriptToneClass(currentAction?.kind ?? "transition", currentAction?.status),
              isStreaming && "animate-pulse"
            )}
            aria-hidden
          />
          <span>
            {elapsedLabel
              ? `${isStreaming ? "Working" : "Worked"} for ${elapsedLabel} · ${compactSummary}`
              : compactSummary}
          </span>
          <ChevronDown className="size-3 text-zaki-muted transition-transform group-open:rotate-180 dark:text-zaki-dark-muted" />
        </summary>
        {currentAction ? (
          <div className="mt-1 truncate text-xs text-zaki-muted dark:text-zaki-dark-muted">
            {currentAction.text}
          </div>
        ) : null}
        {groups.length > 0 ? (
          <div className="mt-2 space-y-1">
            {groups.map((group) => (
              <WorklogGroupRow key={group.id} group={group} isStreaming={isStreaming} />
            ))}
          </div>
        ) : null}
      </details>
    );
  }

  return (
    <section className="zaki-process-enter max-w-[92%] text-zaki-primary dark:text-zaki-dark-primary" aria-live="polite">
      <details open className="group">
        <summary
          className={cn(
            "inline-flex cursor-pointer list-none items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium leading-5 shadow-sm [&::-webkit-details-marker]:hidden",
            "border-zaki bg-zaki-raised text-zaki-secondary dark:border-[rgba(240,236,230,0.08)] dark:bg-[#141210] dark:text-zaki-dark-subtle",
            isStreaming && "shadow-[0_0_0_1px_var(--zaki-brand-10),0_0_24px_var(--zaki-brand-15)]"
          )}
        >
          <span
            className={cn(
              "inline-block size-2 rounded-full",
              transcriptToneClass(currentAction?.kind ?? "narration", currentAction?.status),
              isStreaming && "animate-pulse"
            )}
            aria-hidden
          />
          <span>
            {elapsedLabel
              ? `${isStreaming ? "Working" : "Worked"} for ${elapsedLabel}`
              : isStreaming
                ? "Working"
                : "Worked"}
          </span>
          <ChevronDown className="size-3 transition-transform group-open:rotate-180" aria-hidden />
        </summary>

        <div className="mt-3">
          {currentAction ? (
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-2 inline-block size-2 rounded-full",
                  transcriptToneClass(currentAction.kind, currentAction.status),
                  isStreaming && "animate-pulse"
                )}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="text-[22px] font-medium leading-8 tracking-[-0.01em] text-zaki-primary dark:text-zaki-dark-primary">
                  {currentAction.text}
                </div>
                {currentAction.metaText ? (
                  <div className="mt-1 truncate text-[13px] leading-5 text-zaki-muted dark:text-zaki-dark-muted">
                    {currentAction.metaText}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {groups.length > 0 ? (
            <div className="mt-5 space-y-1">
              {groups.map((group) => (
                <WorklogGroupRow key={group.id} group={group} isStreaming={isStreaming} />
              ))}
            </div>
          ) : null}
        </div>
      </details>
    </section>
  );
}

function taskStatusCopy(status: NullalisTaskStatus) {
  if (status === "succeeded") return "done";
  return status;
}

function taskStatusIcon(status: NullalisTaskStatus) {
  if (status === "done" || status === "succeeded") {
    return <CheckCircle2 className="size-3.5 text-zaki-accent" />;
  }
  if (status === "running") {
    return <Loader2 className="size-3.5 animate-spin text-zaki-brand" />;
  }
  if (status === "failed" || status === "blocked" || status === "cancelled") {
    return <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-300" />;
  }
  return <Circle className="size-3.5 text-zaki-muted dark:text-zaki-dark-muted" />;
}

export function TaskChecklist({ tasks }: { tasks: NullalisTaskItem[] }) {
  if (!tasks.length) return null;

  const sortedTasks = [...tasks].sort((a, b) => a.updatedAt - b.updatedAt);

  return (
    <details
      className="mt-2 max-w-[88%] rounded-zaki-xl border border-zaki bg-zaki-raised p-3 text-xs shadow-sm dark:border-[rgba(240,236,230,0.08)] dark:bg-[#141210]"
      open={sortedTasks.some((task) => task.status === "running")}
    >
      <summary className="cursor-pointer select-none text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
        Task Plan
      </summary>
      <div className="mt-2 space-y-2">
        {sortedTasks.map((task) => (
          <div key={task.taskId} className="flex items-center gap-2 text-zaki-secondary dark:text-zaki-dark-subtle">
            {taskStatusIcon(task.status)}
            <span className="min-w-0 flex-1 truncate">
              {task.description || task.taskId}
            </span>
            {typeof task.progressPct === "number" && task.status === "running" ? (
              <span className="shrink-0 text-[11px] text-zaki-muted dark:text-zaki-dark-muted">
                {Math.round(task.progressPct)}%
              </span>
            ) : null}
            <span className="shrink-0 rounded-full bg-zaki-elevated px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-zaki-muted dark:bg-[#1a1714] dark:text-zaki-dark-muted">
              {taskStatusCopy(task.status)}
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}

export function ApprovalRequiredCard({
  request,
  onApprove,
  onDeny,
}: {
  request: NullalisApprovalRequest | null;
  onApprove?: (requestId: string) => void | Promise<void>;
  onDeny?: (requestId: string) => void | Promise<void>;
}) {
  const [submitting, setSubmitting] = useState<"approve" | "deny" | null>(null);
  const [decided, setDecided] = useState<"approved" | "denied" | null>(null);

  const handleAction = useCallback(
    async (action: "approve" | "deny") => {
      if (!request || submitting || decided) return;
      setSubmitting(action);
      try {
        const cb = action === "approve" ? onApprove : onDeny;
        await cb?.(request.id);
        setDecided(action === "approve" ? "approved" : "denied");
      } catch {
        setSubmitting(null);
      }
    },
    [request, submitting, decided, onApprove, onDeny]
  );

  if (!request) return null;

  if (decided) {
    return (
      <div
        className={cn(
          "mt-2 max-w-[88%] rounded-zaki-xl border p-3 text-xs shadow-sm",
          decided === "approved"
            ? "border-zaki-accent/40 bg-zaki-accent-10 text-zaki-accent"
            : "border-zaki-brand/40 bg-zaki-brand-10 text-zaki-brand"
        )}
      >
        <div className="flex items-center gap-2">
          {decided === "approved" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <ShieldAlert className="size-4 shrink-0" />
          )}
          <span className="font-semibold font-mono-ui">
            {request.tool} · {decided === "approved" ? "Approved" : "Denied"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 max-w-[88%] rounded-zaki-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 shadow-sm dark:border-amber-500/40 dark:bg-amber-950/35 dark:text-amber-100">
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0">
          <div className="font-semibold">
            Approval required for <span className="font-mono-ui">{request.tool}</span>
          </div>
          <div className="mt-1 text-amber-900/80 dark:text-amber-100/80">
            {request.reason || "Nullalis requested approval before continuing."}
          </div>
          <div className="mt-2 text-[11px] uppercase tracking-[0.1em] text-amber-800/70 dark:text-amber-100/70">
            Risk: {request.riskLevel || "unknown"}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!!submitting}
              onClick={() => handleAction("approve")}
              className={cn(
                "rounded-full border border-zaki-accent bg-zaki-accent px-3 py-1 text-[11px] font-semibold text-white transition-colors",
                "hover:bg-zaki-accent-hover",
                submitting === "approve" && "opacity-70"
              )}
            >
              {submitting === "approve" ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" /> Approving...
                </span>
              ) : (
                "Approve"
              )}
            </button>
            <button
              type="button"
              disabled={!!submitting}
              onClick={() => handleAction("deny")}
              className={cn(
                "rounded-full border border-zaki-brand bg-zaki-brand px-3 py-1 text-[11px] font-semibold text-white transition-colors",
                "hover:bg-zaki-brand-hover",
                submitting === "deny" && "opacity-70"
              )}
            >
              {submitting === "deny" ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" /> Denying...
                </span>
              ) : (
                "Deny"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UsageCostFooter({ usage }: { usage: ZakiUsageSummary | null }) {
  if (!usage || (usage.usageTokens == null && usage.costUsd == null)) return null;

  const parts: string[] = [];
  if (typeof usage.usageTokens === "number" && Number.isFinite(usage.usageTokens)) {
    parts.push(`${new Intl.NumberFormat("en-US").format(usage.usageTokens)} tokens`);
  }
  if (typeof usage.costUsd === "number" && Number.isFinite(usage.costUsd)) {
    const digits = usage.costUsd > 0 && usage.costUsd < 0.01 ? 3 : 2;
    parts.push(`$${usage.costUsd.toFixed(digits)}`);
  }
  if (!parts.length) return null;

  return (
    <div className="mt-1 inline-flex max-w-[80%] items-center rounded-full border border-zaki bg-zaki-raised px-2.5 py-0.5 font-mono-ui text-[11px] text-zaki-muted dark:border-[rgba(240,236,230,0.08)] dark:bg-[#141210] dark:text-zaki-dark-muted">
      {parts.join(" · ")}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Context Window Gauge
// ---------------------------------------------------------------------------

export type ContextGaugeData = {
  tokenCount: number;
  contextMax: number;
  messageCount?: number;
};

export function ContextGauge({
  data,
  compact = false,
}: {
  data: ContextGaugeData | null;
  compact?: boolean;
}) {
  if (!data || !data.contextMax || data.contextMax <= 0) return null;

  const pct = Math.min(100, Math.max(0, (data.tokenCount / data.contextMax) * 100));
  const pctLabel = pct.toFixed(0);
  const tokenLabel = new Intl.NumberFormat("en-US").format(data.tokenCount);
  const maxLabel = new Intl.NumberFormat("en-US").format(data.contextMax);

  const barColor =
    pct >= CONTEXT_PRESSURE_NEAR_LIMIT
      ? "bg-zaki-brand"
      : pct >= CONTEXT_PRESSURE_WARNING
        ? "bg-amber-500 dark:bg-amber-400"
        : "bg-zaki-accent";

  const textColor =
    pct >= CONTEXT_PRESSURE_NEAR_LIMIT
      ? "text-zaki-brand"
      : pct >= CONTEXT_PRESSURE_WARNING
        ? "text-amber-700 dark:text-amber-300"
        : "text-zaki-muted dark:text-zaki-dark-muted";

  const trackColor = "bg-zaki-elevated dark:bg-[#1a1714]";

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 font-mono-ui text-[11px]">
        <div className={cn("h-1 w-12 rounded-full", trackColor)}>
          <div
            className={cn("h-full rounded-full transition-all", barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={textColor}>{pctLabel}%</span>
      </div>
    );
  }

  return (
    <div className="mt-1.5 max-w-[88%] text-[11px]">
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <span className="text-zaki-muted dark:text-zaki-dark-muted">Context</span>
        <span className={cn("font-mono-ui", textColor)}>
          {tokenLabel} / {maxLabel} ({pctLabel}%)
        </span>
      </div>
      <div className={cn("h-1.5 w-full rounded-full", trackColor)}>
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {typeof data.messageCount === "number" && (
        <div className="mt-0.5 text-zaki-muted dark:text-zaki-dark-muted">
          {data.messageCount} message{data.messageCount !== 1 ? "s" : ""} in session
        </div>
      )}
    </div>
  );
}
