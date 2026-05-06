import {
  AlertTriangle,
  BookMarked,
  Check,
  LayoutList,
  Lightbulb,
  Loader2,
  Network,
  ScanSearch,
  Search,
} from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import type {
  LearningBookProgress,
  LearningBookStageId,
  LearningBookStageState,
} from "./learningBookProgress";

type LearningBookProgressTimelineProps = {
  progress: LearningBookProgress;
  compact?: boolean;
  className?: string;
};

const STAGE_ICONS: Record<
  LearningBookStageId,
  ComponentType<{ className?: string }>
> = {
  ideation: Lightbulb,
  exploration: Search,
  synthesis: Network,
  critique: ScanSearch,
  overview: BookMarked,
  compilation: LayoutList,
};

const STATE_STYLE: Record<
  LearningBookStageState,
  { container: string; icon: string }
> = {
  pending: {
    container: "border-zaki-border bg-zaki-hover/40 text-zaki-muted",
    icon: "text-zaki-muted",
  },
  running: {
    container: "border-zaki-brand/40 bg-zaki-brand/10 text-zaki-text",
    icon: "text-zaki-brand",
  },
  completed: {
    container: "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    icon: "text-emerald-600 dark:text-emerald-300",
  },
  error: {
    container: "border-rose-400/50 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    icon: "text-rose-600 dark:text-rose-300",
  },
};

function progressFraction(progress: LearningBookProgress) {
  let value = 0;
  for (const id of progress.ordered) {
    const state = progress.stages[id].state;
    if (state === "completed" || state === "error") value += 1;
    if (state === "running") value += 0.5;
  }
  return Math.min(1, value / progress.ordered.length);
}

function activeStage(progress: LearningBookProgress) {
  return (
    progress.ordered.find((id) => progress.stages[id].state === "running") ||
    [...progress.ordered].reverse().find((id) => progress.stages[id].state === "completed") ||
    progress.ordered[0] ||
    "ideation"
  );
}

function StageIcon({ id, state }: { id: LearningBookStageId; state: LearningBookStageState }) {
  if (state === "running") return <Loader2 className="size-3.5 animate-spin" />;
  if (state === "completed") return <Check className="size-3.5" />;
  if (state === "error") return <AlertTriangle className="size-3.5" />;
  const Icon = STAGE_ICONS[id];
  return <Icon className="size-3.5" />;
}

function counters(progress: LearningBookProgress) {
  const items: { label: string; value: string | number }[] = [];
  if (progress.exploration.queryCount > 0) {
    items.push({ label: "queries", value: progress.exploration.queryCount });
  }
  if (progress.exploration.chunkCount > 0) {
    items.push({ label: "chunks", value: progress.exploration.chunkCount });
  }
  if (progress.synthesis.chapterCount > 0) {
    items.push({ label: "chapters", value: progress.synthesis.chapterCount });
  }
  if (progress.synthesis.conceptNodes > 0) {
    items.push({
      label: "concepts",
      value: `${progress.synthesis.conceptNodes}/${progress.synthesis.conceptEdges}`,
    });
  }
  if (progress.compilation.blocksReady > 0) {
    items.push({ label: "blocks ready", value: progress.compilation.blocksReady });
  }
  if (progress.compilation.pagesReady > 0) {
    items.push({ label: "pages ready", value: progress.compilation.pagesReady });
  }
  if (progress.compilation.blocksError > 0) {
    items.push({ label: "block errors", value: progress.compilation.blocksError });
  }
  return items;
}

export function LearningBookProgressTimeline({
  progress,
  compact = false,
  className,
}: LearningBookProgressTimelineProps) {
  const fraction = progressFraction(progress);
  const activeId = activeStage(progress);
  const active = progress.stages[activeId];
  const counterItems = counters(progress);
  const message = progress.message && progress.message !== active.label ? progress.message : "";

  if (compact) {
    return (
      <div
        className={cn(
          "flex min-w-0 items-center gap-3 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 py-2",
          className,
        )}
        title={message || active.description}
      >
        <div className="flex shrink-0 items-center gap-1">
          {progress.ordered.map((id) => {
            const stage = progress.stages[id];
            const style = STATE_STYLE[stage.state];
            return (
              <span
                key={id}
                className={cn(
                  "inline-flex size-5 items-center justify-center rounded-full border",
                  style.container,
                  style.icon,
                )}
                title={`${stage.label}: ${stage.state}`}
              >
                <StageIcon id={id} state={stage.state} />
              </span>
            );
          })}
        </div>
        <div className="min-w-0 flex-1 truncate text-xs text-zaki-muted">
          <span className="font-semibold text-zaki-text">{active.label}</span>
          {active.detail ? <span className="ml-1.5">/ {active.detail}</span> : null}
          {message ? <span className="ml-1.5">/ {message}</span> : null}
        </div>
        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-zaki-muted">
          {Math.round(fraction * 100)}%
        </span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-zaki-lg border border-zaki-border bg-zaki-raised p-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-zaki-brand">
            <Loader2 className={cn("size-3.5", fraction < 1 && "animate-spin")} />
            Generating book
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-zaki-text">
            {active.label}
            {active.detail ? (
              <span className="ml-1.5 text-xs font-normal text-zaki-muted">/ {active.detail}</span>
            ) : null}
          </div>
          {message ? <div className="mt-1 truncate text-xs text-zaki-muted">{message}</div> : null}
        </div>
        <div className="shrink-0 text-xs font-semibold tabular-nums text-zaki-muted">
          {Math.round(fraction * 100)}%
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zaki-hover">
        <div
          className="h-full rounded-full bg-zaki-brand transition-all duration-500"
          style={{ width: `${Math.max(2, fraction * 100)}%` }}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {progress.ordered.map((id) => {
          const stage = progress.stages[id];
          const style = STATE_STYLE[stage.state];
          return (
            <div
              key={id}
              className={cn("min-w-0 rounded-zaki-md border px-2 py-2", style.container)}
              title={stage.description}
            >
              <div className={cn("mb-1 inline-flex", style.icon)}>
                <StageIcon id={id} state={stage.state} />
              </div>
              <div className="truncate text-[11px] font-semibold">{stage.label}</div>
            </div>
          );
        })}
      </div>
      {counterItems.length ? (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-zaki-border pt-3 text-xs text-zaki-muted">
          {counterItems.map((item) => (
            <span key={item.label} className="inline-flex items-baseline gap-1">
              <span className="font-semibold tabular-nums text-zaki-text">{item.value}</span>
              {item.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
