// 2026-05-09 — Pin a brain memory to the active thread.
//
// Users open this sheet from the composer plus menu. They search for
// memories, click "Pin" on the ones they want included with every
// outgoing turn in the current thread, and the chip rail above the
// textarea reflects the pinned set.
//
// The sheet itself is purely a picker + status panel — the actual pin
// state and persistence lives in usePinnedContext. We also call
// fetchBrainMemory on pin so the full memory body is captured at pin
// time and outgoing turns don't have to re-fetch.

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Brain, Loader2, Pin, X } from "lucide-react";
import { toast } from "sonner";
import { SheetShell } from "@/app/components/ui/zaki";
import { brainDisplayText, sanitizeBrainText } from "@/app/components/brain/brainText";
import { cn } from "@/lib/utils";
import { useBrainSearch } from "@/queries/useBrainSearch";
import { fetchBrainMemory, type BrainGraphNode } from "@/lib/api";
import type { PinnedMemory } from "@/queries/usePinnedContext";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  agentUserId: string | null;
  pins: PinnedMemory[];
  onPin: (memory: PinnedMemory) => void;
  onUnpin: (id: string) => void;
  limit: number;
};

export function PinContextSheet({
  isOpen,
  onClose,
  agentUserId,
  pins,
  onPin,
  onUnpin,
  limit,
}: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [pinningId, setPinningId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setQuery("");
  }, [isOpen]);

  const { data, isLoading } = useBrainSearch(
    isOpen && agentUserId ? agentUserId : "",
    isOpen ? query : "",
  );

  const results: BrainGraphNode[] = useMemo(
    () => (data?.results ? data.results : []),
    [data],
  );

  const pinnedIds = useMemo(() => new Set(pins.map((p) => p.id)), [pins]);

  const handlePin = async (memory: BrainGraphNode) => {
    if (!agentUserId) return;
    if (pins.length >= limit && !pinnedIds.has(memory.id)) {
      toast.error(
        t("pinContext.limitReached", {
          defaultValue: "You can pin up to {{limit}} memories per thread.",
          limit,
        }),
      );
      return;
    }
    const label = brainDisplayText(memory.display_label, memory.summary, memory.key, memory.id);
    setPinningId(memory.id);
    try {
      // Capture the full memory body at pin time so outgoing turns
      // don't have to re-fetch. Fall back to the search-result summary
      // when the detail endpoint isn't live.
      let content: string | undefined = memory.summary;
      try {
        const detail = await fetchBrainMemory(agentUserId, memory.id);
        content = detail.content || detail.summary || content;
      } catch {
        // 404 / fallback path — keep the summary.
      }
      // A full memory body can contain internal Agent context that search
      // summaries never expose. Sanitize before this reaches sessionStorage
      // and the prefix for every subsequent turn.
      onPin({ id: memory.id, label, content: sanitizeBrainText(content) || undefined });
      toast.success(
        t("pinContext.pinned", {
          defaultValue: "Pinned. ZAKI will keep this in mind.",
        }),
      );
    } finally {
      setPinningId(null);
    }
  };

  return (
    <SheetShell
      isOpen={isOpen}
      onClose={onClose}
      title={t("pinContext.title", { defaultValue: "Pin a memory" })}
      subtitle={t("pinContext.subtitle", {
        defaultValue:
          "Pinned memories travel with every turn in this thread until you unpin them.",
      })}
      icon={<Pin className="size-4" />}
      width="md"
    >
      <div className="flex flex-col gap-4">
        {pins.length > 0 ? (
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zaki-muted">
              {t("pinContext.pinnedHeader", {
                defaultValue: "Pinned ({{count}}/{{limit}})",
                count: pins.length,
                limit,
              })}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {pins.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 rounded-full border border-zaki-strong bg-zaki-elevated px-2.5 py-1 text-xs text-zaki-primary"
                >
                  <Pin className="size-3 text-zaki-brand" />
                  <span className="max-w-[180px] truncate">{p.label}</span>
                  <button
                    type="button"
                    onClick={() => onUnpin(p.id)}
                    className="rounded-full p-0.5 text-zaki-muted transition-colors hover:bg-zaki-hover hover:text-zaki-primary"
                    aria-label={t("pinContext.unpinAria", {
                      defaultValue: "Unpin {{label}}",
                      label: p.label,
                    })}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zaki-muted">
            {t("pinContext.searchLabel", { defaultValue: "Search your brain" })}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("pinContext.searchPlaceholder", {
              defaultValue: "espresso, last meeting, etc.",
            })}
            className="w-full rounded-zaki-md border border-zaki-strong bg-zaki-raised px-3 py-2 text-xs text-zaki-primary outline-none transition-colors focus:border-zaki-accent focus:ring-2 focus:ring-zaki-accent/20 dark:bg-[#141210]"
          />
        </div>

        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zaki-muted flex items-center gap-1.5">
            <Brain className="size-3" />
            {t("pinContext.resultsLabel", { defaultValue: "Results" })}
          </div>
          {isLoading ? (
            <div className="px-1 py-2 text-xs text-zaki-secondary flex items-center gap-2">
              <Loader2 className="size-3.5 animate-spin text-zaki-brand" />
              {t("pinContext.loading", { defaultValue: "Searching..." })}
            </div>
          ) : query.length < 2 ? (
            <div className="px-1 py-2 text-xs text-zaki-muted">
              {t("pinContext.minChars", {
                defaultValue: "Type at least 2 characters to search.",
              })}
            </div>
          ) : results.length === 0 ? (
            <div className="px-1 py-2 text-xs text-zaki-muted">
              {t("pinContext.empty", {
                defaultValue: "No memories match that query.",
              })}
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {results.slice(0, 8).map((memory) => {
                const isPinned = pinnedIds.has(memory.id);
                const isPinning = pinningId === memory.id;
                return (
                  <li
                    key={memory.id}
                    className="flex items-start gap-2 rounded-zaki-md border border-zaki-strong bg-zaki-elevated px-3 py-2 dark:bg-[#1a1714]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs leading-snug text-zaki-primary line-clamp-2">
                        {memory.display_label || memory.summary}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-zaki-muted">
                        <span className="rounded-full bg-zaki-raised px-1.5 py-0.5 uppercase tracking-wide">
                          {memory.kind}
                        </span>
                        {memory.community_name ? (
                          <span className="truncate">{memory.community_name}</span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isPinned || isPinning}
                      onClick={() => handlePin(memory)}
                      className={cn(
                        "shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                        isPinned
                          ? "bg-zaki-brand-10 text-zaki-brand cursor-default"
                          : "bg-zaki-brand text-white hover:brightness-110",
                        isPinning && "opacity-60",
                      )}
                    >
                      {isPinning ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Pin className="size-3" />
                      )}
                      {isPinned
                        ? t("pinContext.alreadyPinned", { defaultValue: "Pinned" })
                        : t("pinContext.pinAction", { defaultValue: "Pin" })}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </SheetShell>
  );
}
