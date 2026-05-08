// 2026-05-09 — Brain mention popover (composer @-trigger).
//
// When the user types "@<query>" in the composer, this popover opens
// above the textarea with matching brain memories from the live
// fetchBrainSearch endpoint. Selecting one inserts a short reference
// to the memory at the cursor.
//
// Keyboard:
//   ↑ / ↓     — move highlight
//   Enter / Tab — select highlighted result
//   Escape    — dismiss
//
// Display:
//   - Shows up to 6 results, each with summary + kind chip + community.
//   - Empty / loading / no-results states are i18n'd and visible so the
//     user gets feedback while typing.
//   - Click outside dismisses.

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Brain, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrainGraphNode } from "@/lib/api";

interface BrainMentionPopoverProps {
  open: boolean;
  filter: string;
  results: BrainGraphNode[];
  isLoading: boolean;
  highlightIndex: number;
  onHighlightChange: (index: number) => void;
  onSelect: (memory: BrainGraphNode) => void;
  onDismiss: () => void;
  isRtl?: boolean;
}

export function BrainMentionPopover({
  open,
  filter,
  results,
  isLoading,
  highlightIndex,
  onHighlightChange,
  onSelect,
  onDismiss,
  isRtl = false,
}: BrainMentionPopoverProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    if (!open) return;
    const el = itemRefs.current[highlightIndex];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      onDismiss();
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open, onDismiss]);

  if (!open) return null;

  const headerLabel = filter
    ? t("brainMention.matching", {
        defaultValue: "Memories matching “{{q}}”",
        q: filter,
      })
    : t("brainMention.title", { defaultValue: "Mention a memory" });

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute bottom-[calc(100%+8px)] z-30 max-h-[280px] w-[320px] overflow-y-auto rounded-zaki-xl border border-zaki-strong bg-zaki-raised p-1.5 font-body shadow-[0_16px_36px_rgba(15,15,15,0.18)] dark:bg-[#1a1714]",
        isRtl ? "right-2" : "left-2",
      )}
      role="listbox"
      aria-label={t("brainMention.title", { defaultValue: "Mention a memory" })}
    >
      <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zaki-muted flex items-center gap-1.5">
        <Brain className="size-3" />
        <span className="truncate">{headerLabel}</span>
      </div>
      {isLoading ? (
        <div className="px-3 py-3 text-xs text-zaki-secondary flex items-center gap-2">
          <Loader2 className="size-3.5 animate-spin text-zaki-brand" />
          {t("brainMention.loading", { defaultValue: "Searching your brain..." })}
        </div>
      ) : results.length === 0 ? (
        <div className="px-3 py-3 text-xs text-zaki-muted">
          {filter.length < 2
            ? t("brainMention.minChars", {
                defaultValue: "Type at least 2 characters to search.",
              })
            : t("brainMention.empty", {
                defaultValue: "No memories match that query.",
              })}
        </div>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {results.slice(0, 6).map((memory, index) => {
            const selected = index === highlightIndex;
            return (
              <li
                key={memory.id}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                role="option"
                aria-selected={selected}
              >
                <button
                  type="button"
                  className={cn(
                    "w-full flex flex-col items-start gap-0.5 rounded-zaki-md px-2.5 py-2 text-left transition-colors",
                    selected
                      ? "bg-zaki-hover text-zaki-primary"
                      : "text-zaki-primary hover:bg-zaki-hover",
                  )}
                  onMouseEnter={() => onHighlightChange(index)}
                  onMouseDown={(e) => {
                    // mousedown so the click registers before the textarea blur
                    // path closes the popover.
                    e.preventDefault();
                    onSelect(memory);
                  }}
                >
                  <span className="text-xs leading-snug line-clamp-2">
                    {memory.display_label || memory.summary}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-zaki-muted">
                    <span className="rounded-full bg-zaki-elevated px-1.5 py-0.5 uppercase tracking-wide">
                      {memory.kind}
                    </span>
                    {memory.community_name ? (
                      <span className="truncate">{memory.community_name}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
