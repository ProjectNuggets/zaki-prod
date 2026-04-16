import { useEffect, useMemo, useState } from "react";

import type { BotToolCall } from "./BotToolCallBlock";
import type {
  BotReasoningSummary,
  BotReplyStart,
  BotStatusEvent,
  ZakiProcessSnapshot,
  ZakiTranscriptEntry,
  ZakiTranscriptEntryKind,
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

function formatElapsedDuration(durationMs: number) {
  const safeDuration = Math.max(0, Math.trunc(durationMs));
  const totalSeconds = Math.floor(safeDuration / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${Math.max(1, totalSeconds)}s`;
}

function formatStageLabel(stage: ProcessStage) {
  if (stage === "researching") return "Researching";
  if (stage === "writing") return "Writing";
  return "Thinking";
}

function normalizeText(value: string | null | undefined) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function fallbackTranscriptEntries(statusEvents: BotStatusEvent[]): ZakiTranscriptEntry[] {
  return statusEvents.slice(-6).map((event) => ({
    id: event.id,
    kind: "status",
    text: normalizeText(event.text),
    timestamp: event.timestamp,
    meta: null,
    state:
      event.terminal === "error"
        ? "error"
        : event.terminal === "done"
          ? "done"
          : "active",
  }));
}

function toneClass(kind: ZakiTranscriptEntryKind | null | undefined, state?: ZakiTranscriptEntry["state"]) {
  if (state === "error") return "bg-zaki-brand";
  if (state === "done") return "bg-zaki-accent";
  if (kind === "task") return "bg-amber-500";
  if (kind === "tool") return "bg-zaki-accent";
  if (kind === "transition") return "bg-zaki-brand";
  return "bg-zaki-brand/70";
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
  const [clockNow, setClockNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isStreaming) return;
    setClockNow(Date.now());
    const timer = window.setInterval(() => {
      setClockNow(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isStreaming]);

  const phase =
    snapshot?.phase ??
    (snapshot?.isReplyReplay || replyStart ? "reply_ready" : statusEvents.length > 0 || reasoningSummary ? "working" : "ack");
  const currentActionText =
    snapshot?.currentActionText ||
    normalizeText(reasoningSummary?.text) ||
    normalizeText(snapshot?.latestStatusText) ||
    normalizeText(statusEvents[statusEvents.length - 1]?.text) ||
    (isStreaming ? "Getting started" : "");
  const currentActionMeta =
    snapshot?.currentActionMeta ||
    (phase === "reply_ready" || phase === "revealing" || phase === "complete"
      ? "Final reply"
      : phase === "error"
        ? "Needs attention"
        : formatStageLabel(stage));
  const transcriptEntries = useMemo(
    () => snapshot?.transcriptEntries ?? fallbackTranscriptEntries(statusEvents),
    [snapshot?.transcriptEntries, statusEvents]
  );
  const workStartedAt = useMemo(() => {
    if (typeof snapshot?.workStartedAt === "number") return snapshot.workStartedAt;
    const candidates = [
      ...statusEvents.map((event) => event.timestamp),
      ...toolCalls.map((toolCall) => toolCall.startedAt || toolCall.timestamp),
      reasoningSummary?.timestamp,
      replyStart?.timestamp,
    ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    return candidates.length > 0 ? Math.min(...candidates) : null;
  }, [replyStart?.timestamp, reasoningSummary?.timestamp, snapshot?.workStartedAt, statusEvents, toolCalls]);
  const elapsedLabel =
    workStartedAt != null ? formatElapsedDuration(Math.max(0, clockNow - workStartedAt)) : null;

  if (
    !currentActionText &&
    transcriptEntries.length === 0 &&
    !isStreaming
  ) {
    return null;
  }

  if (compact) {
    const compactBody =
      phase === "error"
        ? currentActionText || "Something interrupted the reply."
        : snapshot?.isCacheHit
          ? "Reusing a cached answer"
          : "Preparing the final reply";
    return (
      <section className="zaki-process-compact max-w-[92%] rounded-zaki-xl border border-zaki bg-zaki-raised px-3 py-2.5 text-zaki-primary shadow-sm dark:border-[rgba(240,236,230,0.08)] dark:bg-[#141210] dark:text-zaki-dark-primary">
        <div className="flex items-center gap-2 text-sm font-medium leading-6">
          <span
            className={["inline-block size-2 rounded-full", toneClass(snapshot?.currentActionKind, phase === "error" ? "error" : "active")].join(" ")}
            aria-hidden
          />
          <span>{compactBody}</span>
        </div>
      </section>
    );
  }

  return (
    <section className="zaki-process-enter max-w-[92%] text-zaki-primary dark:text-zaki-dark-primary">
      {elapsedLabel ? (
        <div className="text-[15px] font-medium leading-6 text-zaki-secondary dark:text-zaki-dark-subtle">
          {isStreaming ? `Working for ${elapsedLabel}` : `Worked for ${elapsedLabel}`}
        </div>
      ) : null}

      <div className="mt-3 flex items-start gap-3">
        <span
          className={[
            "mt-2 inline-block size-2 rounded-full",
            toneClass(snapshot?.currentActionKind, phase === "error" ? "error" : "active"),
            isStreaming ? "animate-pulse" : "",
          ].join(" ")}
          aria-hidden
        />
        <div className="min-w-0">
          <div className="text-[22px] font-medium leading-8 tracking-[-0.01em] text-zaki-primary dark:text-zaki-dark-primary">
            {currentActionText}
          </div>
          {currentActionMeta ? (
            <div className="mt-1 text-[13px] leading-5 text-zaki-muted dark:text-zaki-dark-muted">
              {currentActionMeta}
            </div>
          ) : null}
        </div>
      </div>

      {transcriptEntries.length > 0 ? (
        <div className="mt-5 space-y-4">
          {transcriptEntries.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3">
              <span
                className={[
                  "mt-2 inline-block size-1.5 rounded-full",
                  toneClass(entry.kind, entry.state),
                ].join(" ")}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="text-[16px] leading-7 text-zaki-primary/95 dark:text-zaki-dark-primary/95">
                  {entry.text}
                </div>
                {entry.meta ? (
                  <div className="mt-0.5 text-[12px] leading-5 text-zaki-muted dark:text-zaki-dark-muted">
                    {entry.meta}
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
