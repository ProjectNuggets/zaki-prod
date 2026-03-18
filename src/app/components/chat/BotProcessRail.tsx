import type { BotToolCall } from "./BotToolCallBlock";
import type { BotStatusEvent } from "./BotStatusRail";

type ProcessStage = "thinking" | "researching" | "writing";

interface BotProcessRailProps {
  isStreaming: boolean;
  stage: ProcessStage;
  toolCalls: BotToolCall[];
  statusEvents: BotStatusEvent[];
}

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
  return `${raw.slice(0, max)}…`;
}

function statusBadge(toolCall: BotToolCall) {
  if (!toolCall.result) {
    return {
      label: "RUNNING",
      cls: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
    };
  }
  if (toolCall.result.ok) {
    return {
      label: "OK",
      cls: "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    };
  }
  return {
    label: "FAIL",
    cls: "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300",
  };
}

function stageChip(current: ProcessStage, target: ProcessStage, isStreaming: boolean) {
  const active = current === target && isStreaming;
  const complete =
    !isStreaming ||
    (current === "researching" && target === "thinking") ||
    (current === "writing" && (target === "thinking" || target === "researching"));
  if (active) {
    return "border-zaki-brand bg-zaki-brand/15 text-zaki-primary shadow-[0px_4px_12px_rgba(52,36,24,0.12)] animate-pulse dark:bg-zaki-brand/20 dark:text-zaki-dark-primary dark:shadow-[0px_8px_18px_rgba(0,0,0,0.28)]";
  }
  if (complete) {
    return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/55 dark:bg-emerald-950/30 dark:text-emerald-300";
  }
  return "border-zaki-subtle bg-zaki-sunken/50 text-zaki-muted dark:border-[#34271d] dark:bg-[#18120e] dark:text-zaki-dark-muted";
}

export function BotProcessRail({
  isStreaming,
  stage,
  toolCalls,
  statusEvents,
}: BotProcessRailProps) {
  if (!isStreaming && toolCalls.length === 0 && statusEvents.length === 0) return null;

  const latestEvents = statusEvents.slice(-10);
  const dedupedEvents = latestEvents.filter((event, index, all) => {
    if (index === 0) return true;
    const prev = all[index - 1];
    if (!prev) return true;
    return (
      prev.text !== event.text ||
      prev.phase !== event.phase ||
      prev.state !== event.state ||
      prev.tool !== event.tool ||
      prev.terminal !== event.terminal
    );
  });
  const orderedTools = toolCalls.slice(-8);
  const showStatusEvents = orderedTools.length === 0 && dedupedEvents.length > 0;
  const showFallbackPulse = orderedTools.length === 0 && dedupedEvents.length === 0 && isStreaming;
  const latestProgressEvent = [...dedupedEvents]
    .reverse()
    .find((event) => Boolean(event.text));

  return (
    <section className="max-w-[92%] rounded-2xl border border-[#e8d4bc] bg-[linear-gradient(140deg,#fff9f0_0%,#fff3e2_100%)] px-4 py-3 shadow-[0px_10px_24px_rgba(52,36,24,0.10)] dark:border-[#34271d] dark:bg-[linear-gradient(160deg,#17120e_0%,#211812_100%)] dark:shadow-[0px_18px_36px_rgba(0,0,0,0.34)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6c4b] dark:text-[#d0b79b]">
          Live Process
        </div>
        <div className="rounded-full border border-[#dcc0a1] bg-white/80 px-2.5 py-0.5 text-[10px] font-semibold text-[#7c5b3e] dark:border-[#413126] dark:bg-[#1a1410] dark:text-[#ddc7af]">
          {formatStageLabel(stage)}
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <div className={`rounded-xl border px-2 py-1.5 text-center text-[11px] font-semibold ${stageChip(stage, "thinking", isStreaming)}`}>
          Thinking
        </div>
        <div className={`rounded-xl border px-2 py-1.5 text-center text-[11px] font-semibold ${stageChip(stage, "researching", isStreaming)}`}>
          Researching
        </div>
        <div className={`rounded-xl border px-2 py-1.5 text-center text-[11px] font-semibold ${stageChip(stage, "writing", isStreaming)}`}>
          Writing
        </div>
      </div>

      {showStatusEvents ? (
        <div className="mb-3 space-y-1.5">
          {dedupedEvents.map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-2 rounded-lg border border-[#ecdac5] bg-white/70 px-2.5 py-1.5 text-xs text-zaki-secondary dark:border-[#36291f] dark:bg-[#1a1410]/88 dark:text-zaki-dark-subtle"
            >
              <span
                className={[
                  "inline-block size-1.5 rounded-full",
                  event.terminal === "error"
                    ? "bg-rose-500"
                    : event.terminal === "done"
                      ? "bg-emerald-500"
                      : "bg-zaki-brand/70",
                ].join(" ")}
                aria-hidden
              />
              <span className="flex-1 leading-5">{event.text}</span>
              {event.phase ? (
                <span className="rounded-full border border-zaki-subtle bg-white/70 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-zaki-muted dark:border-[#3a2d22] dark:bg-[#140f0c] dark:text-zaki-dark-muted">
                  {event.phase}
                </span>
              ) : null}
              <span className="font-mono text-[10px] text-zaki-muted dark:text-zaki-dark-muted">
                {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {showFallbackPulse ? (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#ecdac5] bg-white/70 px-2.5 py-2 text-xs text-zaki-secondary dark:border-[#36291f] dark:bg-[#1a1410]/88 dark:text-zaki-dark-subtle">
          <span className="inline-block size-1.5 rounded-full bg-zaki-brand animate-ping" aria-hidden />
          <span className="font-medium">Listening for live status from agent…</span>
        </div>
      ) : null}

      {orderedTools.length > 0 ? (
        <div className="space-y-2">
          {latestProgressEvent ? (
            <div className="rounded-lg border border-[#ecdac5] bg-white/70 px-2.5 py-1.5 text-xs text-zaki-secondary dark:border-[#36291f] dark:bg-[#1a1410]/88 dark:text-zaki-dark-subtle">
              <span className="font-semibold text-zaki-muted dark:text-zaki-dark-muted">Latest:</span> {latestProgressEvent.text}
            </div>
          ) : null}
          {orderedTools.map((toolCall) => {
            const badge = statusBadge(toolCall);
            const duration =
              toolCall.durationMs ??
              (typeof toolCall.finishedAt === "number" ? toolCall.finishedAt - toolCall.startedAt : undefined);
            const argsPreview = compactJsonPreview(toolCall.arguments);
            const resultPreview = toolCall.result
              ? toolCall.result.error || compactJsonPreview(toolCall.result.result)
              : "";
            return (
              <div
                key={toolCall.id}
                className="rounded-xl border border-[#ecdac5] bg-white/75 px-3 py-2 dark:border-[#36291f] dark:bg-[#1a1410]/92"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-zaki-muted dark:text-zaki-dark-muted">
                    Tool
                  </span>
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
                {argsPreview ? (
                  <div className="text-[11px] leading-5 text-zaki-secondary dark:text-zaki-dark-subtle">
                    <span className="font-semibold text-zaki-muted dark:text-zaki-dark-muted">Args:</span> {argsPreview}
                  </div>
                ) : null}
                {resultPreview ? (
                  <div className="mt-1 text-[11px] leading-5 text-zaki-secondary dark:text-zaki-dark-subtle">
                    <span className="font-semibold text-zaki-muted dark:text-zaki-dark-muted">Result:</span> {resultPreview}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
