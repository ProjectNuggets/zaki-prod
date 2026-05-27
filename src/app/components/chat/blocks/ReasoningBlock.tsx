import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const COLLAPSE_LINE_LIMIT = 20;

export function ReasoningBlock({
  text,
  isStreaming = false,
}: {
  text: string;
  isStreaming?: boolean;
}) {
  const trimmed = String(text || "").trim();
  const lineCount = trimmed ? trimmed.split(/\r?\n/).length : 0;
  const overflow = lineCount > COLLAPSE_LINE_LIMIT;
  const [expanded, setExpanded] = useState(false);

  if (!trimmed) return null;

  const bodyClass = cn(
    "zaki-cot-thought__body whitespace-pre-wrap break-words font-mono-ui text-[13px] leading-6 text-zaki-secondary dark:text-zaki-dark-subtle",
    overflow && !expanded && "max-h-[20.5em] overflow-hidden"
  );

  return (
    <div className="zaki-cot-thought relative rounded-zaki-xl border border-zaki bg-zaki-raised/60 px-3 py-2.5 dark:border-[rgba(240,236,230,0.08)] dark:bg-[#141210]/60">
      <div className="zaki-cot-thought__head mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-zaki-muted dark:text-zaki-dark-muted">
        <Sparkles
          className={cn("size-3", isStreaming && "animate-pulse text-zaki-brand")}
          aria-hidden
        />
        <span>Thinking</span>
      </div>
      <div className={bodyClass}>{trimmed}</div>
      {overflow ? (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="zaki-cot-thought__toggle mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-zaki-brand hover:underline"
        >
          <ChevronDown
            className={cn("size-3 transition-transform", expanded && "rotate-180")}
            aria-hidden
          />
          {expanded ? "Show less" : `Show all ${lineCount} lines`}
        </button>
      ) : null}
    </div>
  );
}
