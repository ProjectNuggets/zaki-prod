import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock3,
  Loader2,
  Mic,
  ShieldAlert,
  Volume2,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type {
  NullalisApprovalRequest,
  NullalisNarrationFrame,
  NullalisTaskItem,
  NullalisTaskStatus,
  NullalisTranscriptEntry,
  NullalisTranscriptEntryKind,
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
        "inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs shadow-sm",
        "border-zaki-subtle bg-white/85 text-zaki-secondary dark:border-[#2f281f] dark:bg-[#16110d]/90 dark:text-zaki-dark-subtle",
        frame.phase === "error_recovery" && "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/45 dark:bg-amber-950/40 dark:text-amber-200",
        frame.phase === "tool_done" && "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-200"
      )}
      aria-live="polite"
    >
      <span
        className={cn(
          "grid size-5 place-items-center rounded-full bg-zaki-primary/10 text-zaki-primary dark:bg-zaki-dark-primary/15 dark:text-zaki-dark-primary",
          frame.phase === "error_recovery" && "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
          frame.phase === "tool_done" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
          isPulsePhase && "animate-pulse"
        )}
      >
        {narrationIcon(frame)}
      </span>
      <span className="truncate font-medium">{formatNarrationText(frame)}</span>
    </div>
  );
}

function transcriptToneClass(kind: NullalisTranscriptEntryKind, status?: string | null) {
  if (status === "failed" || status === "blocked" || status === "error") return "bg-rose-500";
  if (status === "done" || status === "succeeded" || status === "complete") return "bg-emerald-500";
  if (kind === "tool") return "bg-sky-500";
  if (kind === "task") return "bg-amber-500";
  if (kind === "approval") return "bg-amber-600";
  if (kind === "transition") return "bg-zaki-brand";
  return "bg-zaki-brand/75";
}

function currentActionFromFrame(frame: NullalisNarrationFrame | null) {
  if (!frame) return null;
  return formatNarrationText(frame);
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

  const visibleEntries = useMemo(
    () => entries.filter((entry) => entry.text.trim()).slice(-8),
    [entries]
  );
  const latestEntry = visibleEntries[visibleEntries.length - 1] ?? null;
  const currentAction = latestEntry?.text || currentActionFromFrame(frame) || (isStreaming ? "Starting the work" : null);
  const currentEntryId = latestEntry?.id ?? null;
  const feedEntries = visibleEntries.filter((entry) => entry.id !== currentEntryId);
  const totalCount = Math.max(entryCount ?? visibleEntries.length, visibleEntries.length);
  const firstTimestamp =
    visibleEntries.reduce<number | null>(
      (earliest, entry) =>
        earliest == null || entry.timestamp < earliest ? entry.timestamp : earliest,
      frame?.timestamp ?? null
    ) ?? null;
  const elapsedLabel =
    firstTimestamp != null ? formatElapsedDuration(clockNow - firstTimestamp) : null;

  if (!currentAction && visibleEntries.length === 0) return null;

  if (compact) {
    return (
      <section className="zaki-process-compact mt-2 max-w-[92%] rounded-2xl border border-[#e8d4bc] bg-white/72 px-3 py-2.5 text-zaki-primary shadow-[0px_10px_20px_rgba(52,36,24,0.08)] dark:border-[#34271d] dark:bg-[#18120e]/88 dark:text-zaki-dark-primary">
        <div className="flex items-center gap-2 text-sm font-medium leading-6">
          <span
            className={cn(
              "inline-block size-2 rounded-full",
              transcriptToneClass(latestEntry?.kind ?? "transition", latestEntry?.status),
              isStreaming && "animate-pulse"
            )}
            aria-hidden
          />
          <span>
            {elapsedLabel
              ? `${isStreaming ? "Working" : "Worked"} for ${elapsedLabel} · ${totalCount} ${totalCount === 1 ? "step" : "steps"}`
              : `${totalCount} ${totalCount === 1 ? "step" : "steps"}`}
          </span>
        </div>
        {currentAction ? (
          <div className="mt-1 truncate text-xs text-zaki-muted dark:text-zaki-dark-muted">
            {currentAction}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="zaki-process-enter max-w-[92%] text-zaki-primary dark:text-zaki-dark-primary" aria-live="polite">
      {elapsedLabel ? (
        <div className="text-[15px] font-medium leading-6 text-zaki-secondary dark:text-zaki-dark-subtle">
          {isStreaming ? `Working for ${elapsedLabel}` : `Worked for ${elapsedLabel}`}
        </div>
      ) : null}

      <div className="mt-3 flex items-start gap-3">
        <span
          className={cn(
            "mt-2 inline-block size-2 rounded-full",
            transcriptToneClass(latestEntry?.kind ?? "narration", latestEntry?.status),
            isStreaming && "animate-pulse"
          )}
          aria-hidden
        />
        <div className="min-w-0">
          <div className="text-[22px] font-medium leading-8 tracking-[-0.01em] text-zaki-primary dark:text-zaki-dark-primary">
            {currentAction}
          </div>
          {latestEntry?.files?.length ? (
            <div className="mt-1 truncate text-[13px] leading-5 text-zaki-muted dark:text-zaki-dark-muted">
              {latestEntry.files.join(", ")}
            </div>
          ) : latestEntry?.tool || latestEntry?.phase || latestEntry?.durationMs ? (
            <div className="mt-1 text-[13px] leading-5 text-zaki-muted dark:text-zaki-dark-muted">
              {[latestEntry.tool, latestEntry.phase, formatDuration(latestEntry.durationMs)]
                .filter(Boolean)
                .join(" · ")}
            </div>
          ) : null}
        </div>
      </div>

      {feedEntries.length > 0 ? (
        <div className="mt-5 space-y-4">
          {feedEntries.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-2 inline-block size-1.5 rounded-full",
                  transcriptToneClass(entry.kind, entry.status)
                )}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="text-[16px] leading-7 text-zaki-primary/95 dark:text-zaki-dark-primary/95">
                  {entry.text}
                </div>
                {entry.files?.length ? (
                  <div className="mt-0.5 truncate text-[12px] leading-5 text-zaki-muted dark:text-zaki-dark-muted">
                    {entry.files.join(", ")}
                  </div>
                ) : entry.tool || entry.phase || entry.durationMs ? (
                  <div className="mt-0.5 text-[12px] leading-5 text-zaki-muted dark:text-zaki-dark-muted">
                    {[entry.tool, entry.phase, formatDuration(entry.durationMs)]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function taskStatusCopy(status: NullalisTaskStatus) {
  if (status === "succeeded") return "done";
  return status;
}

function taskStatusIcon(status: NullalisTaskStatus) {
  if (status === "done" || status === "succeeded") {
    return <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-300" />;
  }
  if (status === "running") {
    return <Loader2 className="size-3.5 animate-spin text-zaki-primary dark:text-zaki-dark-primary" />;
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
      className="mt-2 max-w-[88%] rounded-zaki-lg border border-zaki-subtle bg-white/80 p-3 text-xs shadow-sm dark:border-[#2f281f] dark:bg-[#16110d]/85"
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
            <span className="shrink-0 rounded-full bg-zaki-elevated px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-zaki-muted dark:bg-[#211912] dark:text-zaki-dark-muted">
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
}: {
  request: NullalisApprovalRequest | null;
}) {
  if (!request) return null;

  return (
    <div className="mt-2 max-w-[88%] rounded-zaki-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 shadow-sm dark:border-amber-500/40 dark:bg-amber-950/35 dark:text-amber-100">
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0">
          <div className="font-semibold">Approval required for {request.tool}</div>
          <div className="mt-1 text-amber-900/80 dark:text-amber-100/80">
            {request.reason || "Nullalis requested approval before continuing."}
          </div>
          <div className="mt-2 text-[11px] uppercase tracking-[0.1em] text-amber-800/70 dark:text-amber-100/70">
            Risk: {request.riskLevel || "unknown"}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              className="rounded-full border border-amber-300 bg-white/70 px-3 py-1 text-[11px] font-medium opacity-70 dark:border-amber-500/40 dark:bg-amber-950/30"
            >
              Approve (not wired)
            </button>
            <button
              type="button"
              disabled
              className="rounded-full border border-amber-300 bg-white/70 px-3 py-1 text-[11px] font-medium opacity-70 dark:border-amber-500/40 dark:bg-amber-950/30"
            >
              Deny (not wired)
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
    <div className="mt-1 max-w-[80%] text-[11px] text-zaki-muted dark:text-zaki-dark-muted">
      {parts.join(" · ")}
    </div>
  );
}
