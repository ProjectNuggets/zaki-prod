import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  NullalisNarrationFrame,
  NullalisTranscriptEntry,
  ZakiUsageSummary,
} from "./BotStatusRail";
import { ReasoningBlock } from "./blocks/ReasoningBlock";
import {
  CompactToolRow,
  type ToolRowStatus,
  type CompactToolRowProps,
} from "./blocks/CompactToolRow";
import {
  ContextToolGroup,
  isContextGroupTool,
  type ContextGroupChild,
} from "./blocks/ContextToolGroup";
import { TextShimmer } from "./blocks/TextShimmer";

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
): ToolRowStatus {
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
  timestamp: number;
  props: CompactToolRowProps & { id: string };
};

type GroupBlockModel = {
  kind: "group";
  id: string;
  timestamp: number;
  children: ContextGroupChild[];
};

export type TimelineBlock = ReasoningBlockModel | ToolBlockModel | GroupBlockModel;

function toolPropsFromEntry(
  entry: NullalisTranscriptEntry,
  key: string
): CompactToolRowProps & { id: string } {
  const status = toToolStatus(entry.resultState);
  return {
    id: key,
    tool: entry.tool || "tool",
    label: entry.activityLabel ?? null,
    status,
    startedAt: entry.timestamp,
    endedAt: status !== "running" ? entry.timestamp : null,
    durationMs: entry.durationMs ?? null,
    command: entry.command ?? null,
    files: entry.files ? [...entry.files] : undefined,
    inputPreview: entry.inputPreview ?? null,
    input: entry.inputPreview ?? null,
    output: entry.outputPreview ?? null,
    outputTruncated: entry.outputTruncated ?? false,
    resultSummary: entry.resultSummary ?? null,
    exitCode: entry.exitCode ?? null,
  };
}

function mergeToolProps(
  prev: CompactToolRowProps & { id: string },
  entry: NullalisTranscriptEntry
): CompactToolRowProps & { id: string } {
  const resolvedStatus = toToolStatus(entry.resultState);
  return {
    ...prev,
    status:
      resolvedStatus === "running" && prev.status !== "running"
        ? prev.status
        : resolvedStatus,
    endedAt: entry.timestamp >= (prev.endedAt ?? 0) ? entry.timestamp : prev.endedAt,
    durationMs: entry.durationMs ?? prev.durationMs ?? null,
    command: entry.command ?? prev.command ?? null,
    files:
      entry.files && entry.files.length > 0
        ? Array.from(new Set([...(prev.files ?? []), ...entry.files]))
        : prev.files,
    inputPreview: entry.inputPreview ?? prev.inputPreview ?? null,
    input: entry.inputPreview ?? prev.input ?? null,
    output: entry.outputPreview ?? prev.output ?? null,
    outputTruncated: entry.outputTruncated ?? prev.outputTruncated ?? false,
    resultSummary: entry.resultSummary ?? prev.resultSummary ?? null,
    exitCode: entry.exitCode ?? prev.exitCode ?? null,
    label: entry.activityLabel ?? prev.label ?? null,
  };
}

export function composeTurnTimeline(
  entries: NullalisTranscriptEntry[]
): TimelineBlock[] {
  const sorted = [...entries]
    .filter(
      (entry) => String(entry.text || "").trim().length > 0 || entry.kind === "tool"
    )
    .sort((a, b) => a.timestamp - b.timestamp);

  // First pass: build raw blocks (reasoning + individual tools) in order,
  // merging repeat updates to the same tool_use_id.
  type RawBlock =
    | { kind: "reasoning"; id: string; text: string; timestamp: number }
    | {
        kind: "tool";
        id: string;
        timestamp: number;
        tool: string;
        props: CompactToolRowProps & { id: string };
      };

  const rawByKey = new Map<string, RawBlock>();
  const order: string[] = [];
  const lastExactText: Array<{ text: string; at: number }> = [];

  const put = (key: string, block: RawBlock) => {
    if (!rawByKey.has(key)) order.push(key);
    rawByKey.set(key, block);
  };

  for (const entry of sorted) {
    if (entry.kind === "tool") {
      const key = entry.toolUseId
        ? `tool:${entry.toolUseId}`
        : entry.groupKey
          ? `tool-group:${entry.groupKey}`
          : `tool-entry:${entry.id}`;
      const previous = rawByKey.get(key);
      if (previous && previous.kind === "tool") {
        put(key, {
          ...previous,
          props: mergeToolProps(previous.props, entry),
        });
      } else {
        put(key, {
          kind: "tool",
          id: key,
          timestamp: entry.timestamp,
          tool: entry.tool || "tool",
          props: toolPropsFromEntry(entry, key),
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
    put(key, { kind: "reasoning", id: key, text, timestamp: entry.timestamp });
  }

  const raw: RawBlock[] = order
    .map((k) => rawByKey.get(k))
    .filter((b): b is RawBlock => Boolean(b));

  // Second pass: fold consecutive read-like tools into a group block.
  const result: TimelineBlock[] = [];
  let buffer: Extract<RawBlock, { kind: "tool" }>[] = [];

  const flushGroup = () => {
    if (buffer.length === 0) return;
    if (buffer.length === 1) {
      const only = buffer[0]!;
      result.push({
        kind: "tool",
        id: only.id,
        timestamp: only.timestamp,
        props: only.props,
      });
    } else {
      result.push({
        kind: "group",
        id: `group:${buffer[0]!.id}`,
        timestamp: buffer[0]!.timestamp,
        children: buffer.map((b) => b.props),
      });
    }
    buffer = [];
  };

  for (const block of raw) {
    if (block.kind === "tool" && isContextGroupTool(block.tool)) {
      buffer.push(block);
      continue;
    }
    flushGroup();
    if (block.kind === "reasoning") {
      result.push(block);
    } else {
      result.push({
        kind: "tool",
        id: block.id,
        timestamp: block.timestamp,
        props: block.props,
      });
    }
  }
  flushGroup();

  return result;
}

function hasTimelineContent(blocks: TimelineBlock[]): boolean {
  return blocks.some(
    (block) =>
      (block.kind === "reasoning" && block.text.trim().length > 0) ||
      block.kind === "tool" ||
      block.kind === "group"
  );
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

function formatElapsed(ms: number): string {
  if (ms < 1000) return "1s";
  const total = Math.floor(ms / 1000);
  if (total < 60) return `${total}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${s}s`;
}

export type TimelineRevealPhase = "working" | "revealing" | "done";

export function NullalisTurnTimeline({
  entries,
  frame: _frame,
  isStreaming,
  revealPhase = "working",
  turnStartedAt = null,
  compact = false,
  usage,
}: {
  entries: NullalisTranscriptEntry[];
  frame: NullalisNarrationFrame | null;
  isStreaming: boolean;
  revealPhase?: TimelineRevealPhase;
  turnStartedAt?: number | null;
  compact?: boolean;
  model?: string | null;
  mode?: string | null;
  usage?: ZakiUsageSummary | null;
}) {
  const blocks = useMemo(() => composeTurnTimeline(entries), [entries]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isStreaming) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [isStreaming]);

  const hasContent = hasTimelineContent(blocks);
  if (!hasContent && !isStreaming && revealPhase !== "revealing" && revealPhase !== "done") {
    return null;
  }

  // Timer start preference: user-submit timestamp > first block timestamp.
  const startedAt =
    turnStartedAt ?? (blocks.length > 0 ? blocks[0]!.timestamp : null);
  const elapsedMs =
    startedAt != null
      ? revealPhase === "done" && !isStreaming && blocks.length > 0
        ? Math.max(0, (blocks[blocks.length - 1]!.timestamp || now) - startedAt)
        : Math.max(0, now - startedAt)
      : null;
  const elapsedLabel = elapsedMs != null ? formatElapsed(elapsedMs) : null;

  const renderBlocks = (all: TimelineBlock[]) => (
    <div className="flex flex-col">
      {all.map((block) => {
        if (block.kind === "reasoning") {
          return (
            <div key={block.id} className="py-1">
              <ReasoningBlock text={block.text} isStreaming={isStreaming} />
            </div>
          );
        }
        if (block.kind === "group") {
          return (
            <ContextToolGroup
              key={block.id}
              children={block.children}
              isStreaming={isStreaming}
            />
          );
        }
        return (
          <CompactToolRow
            key={block.id}
            {...block.props}
            isStreaming={isStreaming}
          />
        );
      })}
    </div>
  );

  // Empty while streaming → single Thinking shimmer.
  const showThinkingOnly = isStreaming && !hasContent;

  // Reveal phase: collapse trail into "Worked for Ns ›" details.
  const shouldCollapse = revealPhase === "revealing" || revealPhase === "done";

  if (showThinkingOnly) {
    return (
      <section
        className="zaki-process-enter max-w-[92%] py-1 text-zaki-primary dark:text-zaki-dark-primary"
        aria-live="polite"
        dir="auto"
      >
        <TextShimmer text="Thinking" />
      </section>
    );
  }

  if (shouldCollapse) {
    const summaryLabel = elapsedLabel ? `Worked for ${elapsedLabel}` : "Worked";
    return (
      <details
        className="zaki-process-compact group max-w-[92%] py-1 text-zaki-primary dark:text-zaki-dark-primary [&[open]_svg.zaki-timeline-chevron]:rotate-90"
        dir="auto"
      >
        <summary
          className="flex cursor-pointer list-none items-center gap-1.5 text-[14px] leading-6 text-zaki-muted [&::-webkit-details-marker]:hidden focus-visible:outline-none dark:text-zaki-dark-muted"
          aria-label={`${summaryLabel}. Toggle agent trail.`}
        >
          <span>{summaryLabel}</span>
          <ChevronRight
            className={cn(
              "zaki-timeline-chevron size-3 shrink-0 transition-transform"
            )}
            aria-hidden
          />
        </summary>
        <div className="mt-1">{renderBlocks(blocks)}</div>
      </details>
    );
  }

  if (compact) {
    const stepCount = blocks.length;
    const stepLabel = stepCount === 1 ? "1 step" : `${stepCount} steps`;
    return (
      <details
        className="zaki-process-compact group max-w-[92%] py-1 text-zaki-primary dark:text-zaki-dark-primary [&[open]_svg.zaki-timeline-chevron]:rotate-90"
        dir="auto"
      >
        <summary
          className="flex cursor-pointer list-none items-center gap-1.5 text-[14px] leading-6 text-zaki-muted [&::-webkit-details-marker]:hidden dark:text-zaki-dark-muted"
          aria-label={`${stepLabel}. Toggle agent trail.`}
        >
          <span>
            {elapsedLabel
              ? `${isStreaming ? "Working" : "Worked"} for ${elapsedLabel} · ${stepLabel}`
              : stepLabel}
          </span>
          <ChevronRight className="zaki-timeline-chevron size-3 shrink-0 transition-transform" aria-hidden />
        </summary>
        <div className="mt-1">{renderBlocks(blocks)}</div>
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
      {elapsedLabel ? (
        <div className="mb-1 text-[13px] leading-6 text-zaki-muted dark:text-zaki-dark-muted">
          {isStreaming ? `Working for ${elapsedLabel}` : `Worked for ${elapsedLabel}`}
        </div>
      ) : null}
      {renderBlocks(blocks)}
      {(usage?.usageTokens != null || usage?.costUsd != null) && !isStreaming ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-zaki-muted dark:text-zaki-dark-muted">
          {formatTokens(usage?.usageTokens) ? (
            <span className="font-mono-ui">{formatTokens(usage?.usageTokens)}</span>
          ) : null}
          {formatCost(usage?.costUsd) ? (
            <span className="font-mono-ui">· {formatCost(usage?.costUsd)}</span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
