import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  NullalisNarrationFrame,
  NullalisTranscriptEntry,
  ZakiUsageSummary,
} from "./BotStatusRail";
import { ReasoningBlock } from "./blocks/ReasoningBlock";
import { ToolCard, type ToolBlockStatus } from "./blocks/ToolCard";

const DEDUP_WINDOW_MS = 450;

const GENERIC_STAGE_LABELS = new Set([
  "analyzing request",
  "analyzing the request",
  "gathering context",
  "checking context and memory",
  "retrieving memory",
  "searching saved memory",
  "trimming context",
  "trimming context to keep the request focused",
  "thinking",
  "thinking through the request",
  "preparing model request",
  "preparing the model request",
  "model response received",
  "reading the model response",
  "processing model response",
  "processing the model response",
  "preparing final reply",
  "preparing the final reply",
  "preparing the final answer",
  "finalizing reply",
  "finalizing the response",
  "finishing the response",
  "response ready",
  "processing request",
  "starting the request",
  "working through the request",
  "still working on the reply",
]);

function normalize(value: string | null | undefined) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[.]+$/g, "")
    .trim()
    .toLowerCase();
}

function isRealReasoningEntry(entry: NullalisTranscriptEntry) {
  if (entry.source !== "reasoning_summary") return false;
  const normalized = normalize(entry.text);
  if (normalized.length === 0) return false;
  if (GENERIC_STAGE_LABELS.has(normalized)) return false;
  return true;
}

function toToolStatus(
  state: NullalisTranscriptEntry["resultState"] | undefined | null
): ToolBlockStatus {
  if (state === "done") return "done";
  if (state === "failed") return "failed";
  if (state === "queued") return "queued";
  if (state === "blocked") return "blocked";
  return "running";
}

type ReasoningBlockModel = {
  kind: "reasoning";
  id: string;
  text: string;
  timestamp: number;
};

type ToolBlockModel = {
  kind: "tool";
  id: string;
  tool: string;
  label?: string | null;
  status: ToolBlockStatus;
  startedAt: number;
  endedAt?: number | null;
  durationMs?: number | null;
  command?: string | null;
  files?: string[];
  inputPreview?: string | null;
  input?: string | null;
  output?: string | null;
  outputTruncated?: boolean;
  resultSummary?: string | null;
  exitCode?: number | null;
  timestamp: number;
};

export type TimelineBlock = ReasoningBlockModel | ToolBlockModel;

export function composeTurnTimeline(
  entries: NullalisTranscriptEntry[]
): TimelineBlock[] {
  const sorted = [...entries]
    .filter((entry) => String(entry.text || "").trim().length > 0 || entry.kind === "tool")
    .sort((a, b) => a.timestamp - b.timestamp);

  const blocksByKey = new Map<string, TimelineBlock>();
  const order: string[] = [];
  const lastExactText: Array<{ text: string; at: number }> = [];

  const pushOrdered = (key: string, block: TimelineBlock) => {
    if (!blocksByKey.has(key)) order.push(key);
    blocksByKey.set(key, block);
  };

  for (const entry of sorted) {
    if (entry.kind === "tool") {
      const key = entry.toolUseId
        ? `tool:${entry.toolUseId}`
        : entry.groupKey
          ? `tool-group:${entry.groupKey}`
          : `tool-entry:${entry.id}`;
      const previous = blocksByKey.get(key);
      const resolvedStatus = toToolStatus(entry.resultState);
      if (previous && previous.kind === "tool") {
        pushOrdered(key, {
          ...previous,
          status:
            resolvedStatus === "running" && previous.status !== "running"
              ? previous.status
              : resolvedStatus,
          endedAt: entry.timestamp >= (previous.endedAt ?? 0) ? entry.timestamp : previous.endedAt,
          durationMs: entry.durationMs ?? previous.durationMs ?? null,
          command: entry.command ?? previous.command ?? null,
          files:
            entry.files && entry.files.length > 0
              ? Array.from(new Set([...(previous.files ?? []), ...entry.files]))
              : previous.files,
          inputPreview: entry.inputPreview ?? previous.inputPreview ?? null,
          output: entry.outputPreview ?? previous.output ?? null,
          outputTruncated: entry.outputTruncated ?? previous.outputTruncated ?? false,
          resultSummary: entry.resultSummary ?? previous.resultSummary ?? null,
          exitCode: entry.exitCode ?? previous.exitCode ?? null,
          label: entry.activityLabel ?? previous.label ?? null,
        });
      } else {
        pushOrdered(key, {
          kind: "tool",
          id: key,
          tool: entry.tool || "tool",
          label: entry.activityLabel ?? null,
          status: resolvedStatus,
          startedAt: entry.timestamp,
          endedAt: resolvedStatus !== "running" ? entry.timestamp : null,
          durationMs: entry.durationMs ?? null,
          command: entry.command ?? null,
          files: entry.files ? [...entry.files] : undefined,
          inputPreview: entry.inputPreview ?? null,
          input: entry.inputPreview ?? null,
          output: entry.outputPreview ?? null,
          outputTruncated: entry.outputTruncated ?? false,
          resultSummary: entry.resultSummary ?? null,
          exitCode: entry.exitCode ?? null,
          timestamp: entry.timestamp,
        });
      }
      continue;
    }

    if (!isRealReasoningEntry(entry)) continue;

    const text = String(entry.text).trim();
    const normText = normalize(text);
    const recent = lastExactText[lastExactText.length - 1];
    if (recent && recent.text === normText && entry.timestamp - recent.at <= DEDUP_WINDOW_MS) {
      continue;
    }
    lastExactText.push({ text: normText, at: entry.timestamp });
    if (lastExactText.length > 8) lastExactText.shift();

    const key = `reason:${entry.id}`;
    pushOrdered(key, {
      kind: "reasoning",
      id: key,
      text,
      timestamp: entry.timestamp,
    });
  }

  return order
    .map((key) => blocksByKey.get(key))
    .filter((block): block is TimelineBlock => Boolean(block));
}

function hasTimelineContent(blocks: TimelineBlock[]): boolean {
  return blocks.some(
    (block) =>
      (block.kind === "reasoning" && block.text.trim().length > 0) || block.kind === "tool"
  );
}

function currentPhaseLabel(frame: NullalisNarrationFrame | null): string | null {
  if (!frame) return null;
  const label = String(frame.label || "").trim();
  switch (frame.phase) {
    case "tool_start":
      return frame.tool ? `Running ${frame.tool}...` : label || "Running tool...";
    case "tool_done":
      return frame.tool ? `${frame.tool} completed` : label || "Tool completed";
    case "waiting":
      return label || "Waiting for provider...";
    case "error_recovery":
      return label || "Retrying after a transient issue...";
    case "listening":
      return label || "Listening...";
    case "speaking":
      return label || "Speaking response...";
    case "thinking":
    case "plan_step":
    default:
      return label || "Thinking...";
  }
}

function formatTokens(value?: number | null): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 1000) return `${value} tok`;
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}k tok`;
  return `${(value / 1_000_000).toFixed(1)}M tok`;
}

function formatCost(value?: number | null): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const digits = value > 0 && value < 0.01 ? 3 : 2;
  return `$${value.toFixed(digits)}`;
}

export function NullalisTurnTimeline({
  entries,
  frame,
  isStreaming,
  compact = false,
  model,
  mode,
  usage,
}: {
  entries: NullalisTranscriptEntry[];
  frame: NullalisNarrationFrame | null;
  isStreaming: boolean;
  compact?: boolean;
  model?: string | null;
  mode?: string | null;
  usage?: ZakiUsageSummary | null;
}) {
  const blocks = useMemo(() => composeTurnTimeline(entries), [entries]);
  const [expandedCompact, setExpandedCompact] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isStreaming) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isStreaming]);

  if (!hasTimelineContent(blocks) && !frame) return null;

  const startedAt = blocks.length > 0 ? blocks[0]!.timestamp : frame?.timestamp ?? null;
  const elapsedMs = startedAt != null ? Math.max(0, now - startedAt) : null;
  const elapsedLabel =
    elapsedMs != null
      ? elapsedMs < 1000
        ? "1s"
        : `${Math.floor(elapsedMs / 1000)}s`
      : null;
  const phaseLabel = isStreaming ? currentPhaseLabel(frame) : null;

  const renderBlocks = (all: TimelineBlock[]) => (
    <div className="flex flex-col gap-2">
      {all.map((block) => {
        if (block.kind === "reasoning") {
          return (
            <ReasoningBlock
              key={block.id}
              text={block.text}
              isStreaming={isStreaming}
            />
          );
        }
        return (
          <ToolCard
            key={block.id}
            tool={block.tool}
            label={block.label}
            status={block.status}
            startedAt={block.startedAt}
            endedAt={block.endedAt}
            durationMs={block.durationMs}
            command={block.command}
            files={block.files}
            inputPreview={block.inputPreview}
            input={block.input}
            output={block.output}
            outputTruncated={block.outputTruncated}
            resultSummary={block.resultSummary}
            exitCode={block.exitCode}
            isStreaming={isStreaming}
          />
        );
      })}
    </div>
  );

  if (compact) {
    const hasBlocks = blocks.length > 0;
    const summary = hasBlocks
      ? `${blocks.length} ${blocks.length === 1 ? "step" : "steps"}`
      : phaseLabel || "Working";
    return (
      <details
        className="zaki-process-compact mt-2 max-w-[92%] rounded-zaki-xl border border-zaki bg-zaki-raised px-3 py-2.5 text-zaki-primary shadow-sm dark:border-[rgba(240,236,230,0.08)] dark:bg-[#141210] dark:text-zaki-dark-primary"
        open={expandedCompact}
        onToggle={(event) =>
          setExpandedCompact((event.currentTarget as HTMLDetailsElement).open)
        }
        dir="auto"
      >
        <summary
          className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium leading-6 [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
          aria-expanded={expandedCompact}
          aria-label={
            elapsedLabel
              ? `${isStreaming ? "Working" : "Worked"} for ${elapsedLabel}, ${summary}. Toggle details.`
              : `${summary}. Toggle details.`
          }
        >
          <span
            className={cn(
              "inline-block size-2 rounded-full bg-zaki-brand",
              isStreaming && "animate-pulse"
            )}
            aria-hidden
          />
          <span>
            {elapsedLabel
              ? `${isStreaming ? "Working" : "Worked"} for ${elapsedLabel} · ${summary}`
              : summary}
          </span>
          <ChevronDown className="size-3 text-zaki-muted transition-transform group-open:rotate-180 dark:text-zaki-dark-muted" />
        </summary>
        <div className="mt-2">{renderBlocks(blocks)}</div>
      </details>
    );
  }

  return (
    <section
      className="zaki-process-enter max-w-[92%] text-zaki-primary dark:text-zaki-dark-primary"
      aria-live="polite"
      aria-busy={isStreaming || undefined}
      aria-label={isStreaming ? "Agent working" : "Agent finished"}
      dir="auto"
    >
      <div
        className={cn(
          "mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-medium",
          "border-zaki bg-zaki-raised text-zaki-secondary dark:border-[rgba(240,236,230,0.08)] dark:bg-[#141210] dark:text-zaki-dark-subtle",
          isStreaming && "shadow-[0_0_0_1px_var(--zaki-brand-10),0_0_24px_var(--zaki-brand-15)]"
        )}
      >
        <span
          className={cn(
            "inline-block size-2 rounded-full bg-zaki-brand",
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
        {phaseLabel && isStreaming ? (
          <span className="truncate font-mono-ui text-[11px] text-zaki-muted dark:text-zaki-dark-muted">
            {phaseLabel}
          </span>
        ) : null}
        {model ? (
          <span className="font-mono-ui text-[11px] text-zaki-muted dark:text-zaki-dark-muted">
            · {model}
          </span>
        ) : null}
        {mode ? (
          <span className="font-mono-ui text-[11px] text-zaki-muted dark:text-zaki-dark-muted">
            · {mode}
          </span>
        ) : null}
      </div>
      {renderBlocks(blocks)}
      {(usage?.usageTokens != null || usage?.costUsd != null) && !isStreaming ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-zaki-muted dark:text-zaki-dark-muted">
          {elapsedLabel ? (
            <span className="font-mono-ui">{elapsedLabel}</span>
          ) : null}
          {formatTokens(usage?.usageTokens) ? (
            <span className="font-mono-ui">· {formatTokens(usage?.usageTokens)}</span>
          ) : null}
          {formatCost(usage?.costUsd) ? (
            <span className="font-mono-ui">· {formatCost(usage?.costUsd)}</span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
