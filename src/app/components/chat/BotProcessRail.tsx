import { useEffect, useMemo, useRef, useState } from "react";

import type { BotToolCall } from "./BotToolCallBlock";
import type {
  BotReasoningSummary,
  BotReplyStart,
  BotStatusEvent,
  ZakiProcessSnapshot,
  ZakiUxPhase,
} from "./BotStatusRail";

type ProcessStage = "thinking" | "researching" | "writing";

interface BotProcessRailProps {
  isStreaming: boolean;
  stage: ProcessStage;
  toolCalls: BotToolCall[];
  statusEvents: BotStatusEvent[];
  reasoningSummary?: BotReasoningSummary | null;
  replyStart?: BotReplyStart | null;
  snapshot?: ZakiProcessSnapshot | null;
  compact?: boolean;
}

const SUMMARY_DWELL_MS = 700;

function formatStageLabel(stage: ProcessStage) {
  if (stage === "researching") return "Researching";
  if (stage === "writing") return "Writing";
  return "Thinking";
}

function formatDuration(durationMs?: number) {
  if (typeof durationMs !== "number") return null;
  if (durationMs >= 1000) return `${(durationMs / 1000).toFixed(1)}s`;
  return `${durationMs}ms`;
}

function compactJsonPreview(value: unknown, max = 140) {
  let raw = "";
  try {
    raw = JSON.stringify(value);
  } catch {
    raw = String(value ?? "");
  }
  if (!raw) return "";
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max)}...`;
}

function statusBadge(toolCall: BotToolCall) {
  if (!toolCall.result) {
    return {
      label: "RUNNING",
      cls: "border-amber-300/80 bg-amber-100/80 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300",
    };
  }
  if (toolCall.result.ok) {
    return {
      label: "OK",
      cls: "border-emerald-300/80 bg-emerald-100/80 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300",
    };
  }
  return {
    label: "FAIL",
    cls: "border-rose-300/80 bg-rose-100/80 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-300",
  };
}

function stageChip(current: ProcessStage, target: ProcessStage, isStreaming: boolean) {
  const active = current === target && isStreaming;
  const complete =
    !isStreaming ||
    (current === "researching" && target === "thinking") ||
    (current === "writing" && (target === "thinking" || target === "researching"));
  if (active) {
    return "border-zaki-brand/40 bg-zaki-brand/10 text-zaki-primary dark:bg-zaki-brand/15 dark:text-zaki-dark-primary";
  }
  if (complete) {
    return "border-emerald-200/80 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/45 dark:bg-emerald-950/20 dark:text-emerald-300";
  }
  return "border-zaki-subtle/80 bg-zaki-sunken/40 text-zaki-muted dark:border-[#34271d] dark:bg-[#18120e] dark:text-zaki-dark-muted";
}

function normalizeText(value: string | null | undefined) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeSummaryKey(value: string | null | undefined) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/\biteration\s+\d+\b/g, "")
    .replace(/[.,!?;:()[\]{}"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isCacheText(value: string | null | undefined) {
  const haystack = normalizeText(value).toLowerCase();
  return (
    haystack.includes("cached response") ||
    haystack.includes("cache hit") ||
    haystack.includes("using cached") ||
    haystack.includes("cached answer") ||
    haystack.includes("reusing a cached answer")
  );
}

function humanizeToken(value: string | null | undefined) {
  const normalized = normalizeText(value)
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
  if (!normalized) return "";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function isCacheEvent(event: BotStatusEvent | null | undefined) {
  return isCacheText([event?.text, event?.phase, event?.state].filter(Boolean).join(" "));
}

function isErrorEvent(event: BotStatusEvent | null | undefined) {
  return event?.terminal === "error";
}

function isDoneEvent(event: BotStatusEvent | null | undefined) {
  return event?.terminal === "done";
}

function dedupeEvents(events: BotStatusEvent[]) {
  return events.reduce<BotStatusEvent[]>((acc, event) => {
    const last = acc[acc.length - 1];
    const fingerprint =
      event.fingerprint ||
      [
        normalizeText(event.text).toLowerCase(),
        normalizeText(event.phase).toLowerCase(),
        normalizeText(event.state).toLowerCase(),
        normalizeText(event.tool).toLowerCase(),
      ].join("|");
    if (last?.fingerprint === fingerprint) {
      acc[acc.length - 1] = { ...event, fingerprint };
      return acc;
    }
    acc.push({ ...event, fingerprint });
    return acc;
  }, []);
}

function buildHeadlineMeta(event: BotStatusEvent | null, fallbackMeta?: string | null) {
  if (fallbackMeta) return fallbackMeta;
  if (!event) return null;
  const parts = [
    humanizeToken(event.phase),
    event.tool ? `Tool: ${event.tool}` : "",
    typeof event.durationMs === "number" ? formatDuration(event.durationMs) : null,
  ].filter(Boolean);
  return parts.join(" • ") || null;
}

function isMeaningfulArgsPreview(preview: string) {
  const normalized = preview.trim();
  return Boolean(normalized && normalized !== "{}" && normalized !== "[]");
}

function summarizeToolCalls(toolCalls: BotToolCall[]) {
  const activeTool = [...toolCalls].reverse().find((toolCall) => !toolCall.result) ?? null;
  if (activeTool) return [activeTool];
  return toolCalls.slice(-2);
}

function summaryTextsAreEquivalent(currentText: string, nextText: string) {
  const currentKey = normalizeSummaryKey(currentText);
  const nextKey = normalizeSummaryKey(nextText);
  if (!currentKey || !nextKey) return false;
  return (
    currentKey === nextKey ||
    currentKey.includes(nextKey) ||
    nextKey.includes(currentKey)
  );
}

function shouldSwapSummaryImmediately(
  currentText: string,
  currentPhase: ZakiUxPhase | null,
  nextPhase: ZakiUxPhase | null,
  isCacheHit: boolean,
  isReplyState: boolean
) {
  if (!currentText) return true;
  if (currentPhase !== nextPhase) return true;
  if (isCacheHit || isReplyState) return true;
  return false;
}

export function BotProcessRail({
  isStreaming,
  stage,
  toolCalls,
  statusEvents,
  reasoningSummary = null,
  replyStart = null,
  snapshot = null,
  compact = false,
}: BotProcessRailProps) {
  const [activeSummaryText, setActiveSummaryText] = useState<string | null>(null);
  const [pendingSummaryText, setPendingSummaryText] = useState<string | null>(null);
  const summaryTimerRef = useRef<number | null>(null);
  const lastSummarySwapRef = useRef(0);
  const lastPhaseRef = useRef<ZakiUxPhase | null>(null);

  useEffect(() => {
    return () => {
      if (summaryTimerRef.current) {
        window.clearTimeout(summaryTimerRef.current);
      }
    };
  }, []);

  const dedupedEvents = useMemo(() => dedupeEvents(statusEvents), [statusEvents]);
  const visibleEvents = dedupedEvents.slice(-6);
  const latestEvent = visibleEvents[visibleEvents.length - 1] ?? null;
  const summaryCandidate = normalizeText(snapshot?.summaryText || reasoningSummary?.text || "");
  const replyRevealActive =
    Boolean(snapshot?.isReplyReplay) ||
    (Boolean(replyStart) &&
      replyStart?.streamKind === "final_reply" &&
      replyStart?.deliveryMode === "buffered_replay" &&
      replyStart?.live === false);
  const isCacheHit = Boolean(snapshot?.isCacheHit) || isCacheText(summaryCandidate) || isCacheEvent(latestEvent);
  const phase = snapshot?.phase ?? (replyRevealActive ? "reply_ready" : summaryCandidate || latestEvent ? "working" : "ack");
  const hasSnapshotActivity = Boolean(
    snapshot &&
      (
        snapshot.summaryText ||
        snapshot.latestStatusText ||
        snapshot.hasTools ||
        snapshot.isCacheHit ||
        snapshot.isReplyReplay ||
        snapshot.phase === "error"
      )
  );
  const isIdleAckOnly =
    !isStreaming &&
    phase === "ack" &&
    normalizeText(snapshot?.latestStatusText) === "Processing request" &&
    !normalizeText(snapshot?.summaryText) &&
    !replyStart &&
    toolCalls.length === 0 &&
    statusEvents.length <= 1;

  useEffect(() => {
    if (!summaryCandidate) {
      setPendingSummaryText(null);
      if (phase !== "working" && phase !== "tooling") {
        setActiveSummaryText(null);
      }
      lastPhaseRef.current = phase;
      return;
    }

    const replyLikePhase =
      phase === "reply_ready" || phase === "revealing" || phase === "complete";
    if (summaryTextsAreEquivalent(activeSummaryText || "", summaryCandidate)) {
      setPendingSummaryText(null);
      lastPhaseRef.current = phase;
      return;
    }
    const swapImmediately = shouldSwapSummaryImmediately(
      activeSummaryText || "",
      lastPhaseRef.current,
      phase,
      isCacheHit,
      replyLikePhase
    );
    if (summaryTimerRef.current) {
      window.clearTimeout(summaryTimerRef.current);
      summaryTimerRef.current = null;
    }
    if (swapImmediately) {
      setActiveSummaryText(summaryCandidate);
      setPendingSummaryText(null);
      lastSummarySwapRef.current = Date.now();
      lastPhaseRef.current = phase;
      return;
    }

    const elapsed = Date.now() - lastSummarySwapRef.current;
    if (elapsed >= SUMMARY_DWELL_MS) {
      setActiveSummaryText(summaryCandidate);
      setPendingSummaryText(null);
      lastSummarySwapRef.current = Date.now();
      lastPhaseRef.current = phase;
      return;
    }

    setPendingSummaryText(summaryCandidate);
    const remaining = SUMMARY_DWELL_MS - elapsed;
    summaryTimerRef.current = window.setTimeout(() => {
      setActiveSummaryText(summaryCandidate);
      setPendingSummaryText(null);
      lastSummarySwapRef.current = Date.now();
      lastPhaseRef.current = phase;
      summaryTimerRef.current = null;
    }, remaining);

    return () => {
      if (summaryTimerRef.current) {
        window.clearTimeout(summaryTimerRef.current);
        summaryTimerRef.current = null;
      }
    };
  }, [activeSummaryText, isCacheHit, phase, summaryCandidate]);

  if (
    !isStreaming &&
    toolCalls.length === 0 &&
    statusEvents.length === 0 &&
    !reasoningSummary &&
    !replyStart &&
    !hasSnapshotActivity
  ) {
    return null;
  }

  if (isIdleAckOnly) {
    return null;
  }

  const orderedTools = summarizeToolCalls(toolCalls);
  const latestStatusText = snapshot?.latestStatusText || latestEvent?.text || null;
  const latestStatusMeta = snapshot?.latestStatusMeta || buildHeadlineMeta(latestEvent);
  const summaryText = activeSummaryText || summaryCandidate || null;
  const recentEventCap = toolCalls.length > 0 ? 2 : 3;
  const previousEvents = latestEvent
    ? visibleEvents.filter((event) => event.id !== latestEvent.id).slice(-recentEventCap)
    : visibleEvents.slice(-recentEventCap);
  const visualStage =
    phase === "reply_ready" || phase === "revealing" || phase === "complete"
      ? "writing"
      : phase === "tooling"
        ? "researching"
        : stage;

  let headlineLabel = "What I'm doing";
  let headlineBody = summaryText || latestStatusText || "Listening for live status from agent...";
  let headlineMeta = latestStatusMeta;
  let headlineTone =
    "border-[#ecdac5] bg-white/78 dark:border-[#36291f] dark:bg-[#1a1410]/92";
  let headlinePill: string | null = null;
  let headlineNote: string | null = null;

  if (phase === "ack") {
    headlineLabel = "On it";
    headlineBody = latestStatusText || "Processing request";
    headlineMeta = null;
  } else if (phase === "error") {
    headlineLabel = "Need attention";
    headlineBody = latestStatusText || "Something interrupted the reply.";
    headlineTone = "border-rose-300/70 bg-rose-50/90 dark:border-rose-900/50 dark:bg-rose-950/20";
  } else if (isCacheHit) {
    headlineLabel = "Cache hit";
    headlineBody = summaryText || latestStatusText || "Using cached response";
    headlineTone = "border-emerald-300/70 bg-emerald-50/90 dark:border-emerald-900/50 dark:bg-emerald-950/20";
    headlinePill = "Reused";
  } else if (phase === "reply_ready" || phase === "revealing" || phase === "complete") {
    headlineLabel = "Final reply";
    headlineBody =
      phase === "revealing"
        ? "Final reply is being revealed."
        : "Answer ready. Revealing final reply.";
    headlineMeta =
      snapshot?.latestStatusMeta ||
      (latestStatusText && latestStatusText !== headlineBody ? latestStatusText : null);
    if (summaryText) {
      headlineNote = summaryText;
    }
  } else if (summaryText) {
    headlineLabel = "What I'm doing";
    headlineBody = summaryText;
  } else if (phase === "tooling") {
    headlineLabel = "Using tools";
    headlineBody = latestStatusText || "Running tools";
  } else if (!latestStatusText && isStreaming) {
    headlineLabel = "On it";
    headlineBody = "Listening for live status from agent...";
  }

  const latestStatusRowText =
    latestStatusText && latestStatusText !== headlineBody ? latestStatusText : null;

  if (compact) {
    const compactLabel =
      phase === "error" ? "Need attention" : isCacheHit ? "Cache hit" : "Final reply";
    const compactBody =
      phase === "error"
        ? headlineBody
        : isCacheHit
          ? headlineBody
          : "Answer ready. Revealing final reply.";
    return (
      <section className="zaki-process-compact max-w-[92%] rounded-2xl border border-[#e8d4bc] bg-[linear-gradient(140deg,#fff9f0_0%,#fff3e2_100%)] px-3 py-2.5 shadow-[0px_10px_24px_rgba(52,36,24,0.10)] transition-[opacity,transform] duration-150 ease-out dark:border-[#34271d] dark:bg-[linear-gradient(160deg,#17120e_0%,#211812_100%)] dark:shadow-[0px_18px_36px_rgba(0,0,0,0.34)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zaki-muted dark:text-zaki-dark-muted">
              <span
                className={[
                  "inline-block size-1.5 rounded-full",
                  phase === "error"
                    ? "bg-rose-500"
                    : isCacheHit
                      ? "bg-emerald-500"
                    : "bg-zaki-brand/80",
                ].join(" ")}
                aria-hidden
              />
              {compactLabel}
            </div>
            <div className="mt-1 truncate text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
              {compactBody}
            </div>
          </div>
          {headlinePill ? (
            <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              {headlinePill}
            </span>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="zaki-process-enter max-w-[92%] rounded-2xl border border-[#e8d4bc] bg-[linear-gradient(140deg,#fff9f0_0%,#fff3e2_100%)] px-4 py-3 shadow-[0px_10px_24px_rgba(52,36,24,0.10)] transition-[opacity,transform] duration-150 ease-out dark:border-[#34271d] dark:bg-[linear-gradient(160deg,#17120e_0%,#211812_100%)] dark:shadow-[0px_18px_36px_rgba(0,0,0,0.34)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8f6c4b] dark:text-[#d0b79b]">
          Live process
        </div>
        {phase !== "ack" ? (
          <div className="rounded-full border border-[#dcc0a1] bg-white/80 px-2.5 py-0.5 text-[10px] font-semibold text-[#7c5b3e] dark:border-[#413126] dark:bg-[#1a1410] dark:text-[#ddc7af]">
            {formatStageLabel(visualStage)}
          </div>
        ) : null}
      </div>

      <div className={`rounded-xl border px-3 py-3 ${headlineTone}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zaki-muted dark:text-zaki-dark-muted">
              <span
                className={[
                  "inline-block size-1.5 rounded-full",
                  phase === "error"
                    ? "bg-rose-500"
                    : isCacheHit || isDoneEvent(latestEvent)
                      ? "bg-emerald-500"
                      : isStreaming
                        ? "animate-pulse bg-zaki-brand"
                        : "bg-zaki-brand/70",
                ].join(" ")}
                aria-hidden
              />
              {headlineLabel}
            </div>
            <div
              className={[
                "mt-1 text-sm font-semibold leading-6 text-zaki-primary dark:text-zaki-dark-primary",
                summaryText ? "zaki-process-summary-swap" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {headlineBody}
            </div>
            {headlineMeta ? (
              <div className="mt-1 text-[11px] leading-5 text-zaki-muted dark:text-zaki-dark-muted">
                {headlineMeta}
              </div>
            ) : null}
            {headlineNote && (phase === "reply_ready" || phase === "revealing" || phase === "complete") ? (
              <div className="mt-2 text-[11px] leading-5 text-zaki-secondary dark:text-zaki-dark-subtle">
                {headlineNote}
              </div>
            ) : null}
            {latestStatusRowText ? (
              <div className="mt-2 flex items-center gap-2 text-[11px] leading-5 text-zaki-secondary dark:text-zaki-dark-subtle">
                <span className="rounded-full border border-zaki-subtle bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zaki-muted dark:border-[#3a2d22] dark:bg-[#140f0c] dark:text-zaki-dark-muted">
                  Status
                </span>
                <span className="min-w-0 truncate">{latestStatusRowText}</span>
              </div>
            ) : null}
          </div>
          {headlinePill ? (
            <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              {headlinePill}
            </span>
          ) : null}
        </div>
      </div>

      {phase !== "ack" ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className={`rounded-xl border px-2 py-1.5 text-center text-[11px] font-semibold ${stageChip(visualStage, "thinking", isStreaming)}`}>
            Thinking
          </div>
          <div className={`rounded-xl border px-2 py-1.5 text-center text-[11px] font-semibold ${stageChip(visualStage, "researching", isStreaming)}`}>
            Researching
          </div>
          <div className={`rounded-xl border px-2 py-1.5 text-center text-[11px] font-semibold ${stageChip(visualStage, "writing", isStreaming)}`}>
            Writing
          </div>
        </div>
      ) : null}

      {previousEvents.length > 0 ? (
        <div className="mt-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zaki-muted dark:text-zaki-dark-muted">
            Recent
          </div>
          <div className="space-y-1.5">
            {previousEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-2 rounded-lg border border-[#ecdac5] bg-white/60 px-2.5 py-1.5 text-xs text-zaki-secondary dark:border-[#36291f] dark:bg-[#1a1410]/82 dark:text-zaki-dark-subtle"
              >
                <span
                  className={[
                    "inline-block size-1.5 rounded-full",
                    isErrorEvent(event)
                      ? "bg-rose-500"
                      : isDoneEvent(event) || isCacheEvent(event)
                        ? "bg-emerald-500"
                        : "bg-zaki-brand/55",
                  ].join(" ")}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate leading-5">{event.text}</span>
                {event.phase ? (
                  <span className="rounded-full border border-zaki-subtle bg-white/65 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-zaki-muted dark:border-[#3a2d22] dark:bg-[#140f0c] dark:text-zaki-dark-muted">
                    {humanizeToken(event.phase)}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {orderedTools.length > 0 ? (
        <div className="mt-3 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zaki-muted dark:text-zaki-dark-muted">
            Tools
          </div>
          {orderedTools.map((toolCall) => {
            const badge = statusBadge(toolCall);
            const duration =
              toolCall.durationMs ??
              (typeof toolCall.finishedAt === "number" ? toolCall.finishedAt - toolCall.startedAt : undefined);
            const argsPreview = compactJsonPreview(toolCall.arguments);
            const resultPreview = toolCall.result
              ? toolCall.result.error || compactJsonPreview(toolCall.result.result, 100)
              : "";
            const shouldShowArgs = isMeaningfulArgsPreview(argsPreview);
            const shouldShowResult =
              Boolean(toolCall.result?.error) ||
              (Boolean(resultPreview) && resultPreview.length <= 100);

            return (
              <div
                key={toolCall.id}
                className="rounded-xl border border-[#ecdac5] bg-white/70 px-3 py-2 dark:border-[#36291f] dark:bg-[#1a1410]/88"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                    {toolCall.name}
                  </span>
                  {formatDuration(duration) ? (
                    <span className="rounded-full border border-zaki-subtle px-1.5 py-0.5 font-mono text-[10px] text-zaki-muted dark:border-[#3a2d22] dark:text-zaki-dark-muted">
                      {formatDuration(duration)}
                    </span>
                  ) : null}
                  <span className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
                {shouldShowArgs ? (
                  <div className="text-[11px] leading-5 text-zaki-secondary dark:text-zaki-dark-subtle">
                    <span className="font-semibold text-zaki-muted dark:text-zaki-dark-muted">Args:</span> {argsPreview}
                  </div>
                ) : null}
                {shouldShowResult ? (
                  <div className="mt-1 text-[11px] leading-5 text-zaki-secondary dark:text-zaki-dark-subtle">
                    <span className="font-semibold text-zaki-muted dark:text-zaki-dark-muted">Result:</span> {resultPreview}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {pendingSummaryText && pendingSummaryText !== activeSummaryText ? (
        <div className="sr-only" aria-hidden>
          {pendingSummaryText}
        </div>
      ) : null}
    </section>
  );
}
