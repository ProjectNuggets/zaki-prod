import { useEffect, useState } from "react";

export type BotStatusEvent = {
  id: string;
  text: string;
  timestamp: number;
  fingerprint?: string | null;
  source?: "progress" | "status" | "fallback";
  phase?: string | null;
  state?: string | null;
  label?: string | null;
  tool?: string | null;
  taskId?: string | null;
  iteration?: number | null;
  durationMs?: number | null;
  terminal?: "done" | "error" | null;
};

export type BotReasoningSummary = {
  id: string;
  text: string;
  timestamp: number;
  phase?: string | null;
  tool?: string | null;
  iteration?: number | null;
};

export type BotReplyStart = {
  id: string;
  timestamp: number;
  streamKind?: string | null;
  deliveryMode?: string | null;
  live?: boolean | null;
};

export type ZakiUxPhase =
  | "ack"
  | "working"
  | "tooling"
  | "reply_ready"
  | "revealing"
  | "complete"
  | "error";

export type ZakiProcessSnapshot = {
  phase: ZakiUxPhase;
  summaryText: string | null;
  latestStatusText: string | null;
  latestStatusMeta: string | null;
  latestToolName: string | null;
  hasTools: boolean;
  isCacheHit: boolean;
  isReplyReplay: boolean;
  replyRevealStarted: boolean;
};

interface BotStatusRailProps {
  events: BotStatusEvent[];
  isStreaming?: boolean;
  fallbackText?: string;
}

export function BotStatusRail({
  events,
  isStreaming = false,
  fallbackText = "Analyzing request",
}: BotStatusRailProps) {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    if (!isStreaming || events.length > 0) return;
    const timer = window.setInterval(() => {
      setDotCount((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 350);
    return () => window.clearInterval(timer);
  }, [events.length, isStreaming]);

  const visibleEvents =
    events.length > 0
      ? events
      : isStreaming
        ? [
            {
              id: "streaming-fallback",
              text: `${fallbackText}${".".repeat(dotCount)}`,
              timestamp: Date.now(),
            },
          ]
        : [];

  if (!visibleEvents.length) return null;

  return (
    <div className="max-w-[80%] rounded-zaki-lg border border-zaki-subtle bg-zaki-elevated/35 px-3 py-2 dark:border-[#31261c] dark:bg-[#16110d]">
      <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-zaki-muted dark:text-zaki-dark-muted">
        Process
      </div>
      <div className="space-y-1.5">
        {visibleEvents.map((event, index) => {
          const isLatest = index === visibleEvents.length - 1;
          return (
            <div
              key={event.id}
              className="flex items-center gap-2 text-xs text-zaki-secondary dark:text-zaki-dark-subtle"
            >
              <span
                className={[
                  "inline-block size-1.5 rounded-full bg-zaki-muted/70 transition-colors dark:bg-zaki-dark-muted/70",
                  isStreaming && isLatest ? "animate-pulse bg-zaki-primary/80 dark:bg-zaki-dark-primary/80" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden
              />
              <span className="leading-5">{event.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
