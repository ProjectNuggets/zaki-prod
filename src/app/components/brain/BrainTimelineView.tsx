import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useBrainTimeline } from "@/queries";
import type { BrainTimelineEntry } from "@/lib/api";

interface Props {
  userId: string;
}

export function BrainTimelineView({ userId }: Props) {
  const { t } = useTranslation();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useBrainTimeline(userId);

  const entries: BrainTimelineEntry[] = useMemo(
    () => data?.pages.flatMap((p) => p.entries) ?? [],
    [data],
  );

  // Group entries by date label (yyyy-mm-dd), preserve order.
  const grouped = useMemo(() => {
    const groups: Array<{ label: string; entries: BrainTimelineEntry[] }> = [];
    for (const e of entries) {
      const label = new Date(e.created_at * 1000).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.entries.push(e);
      else groups.push({ label, entries: [e] });
    }
    return groups;
  }, [entries]);

  // Sentinel-based infinite scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (items) => {
        for (const it of items) {
          if (it.isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return <div className="py-6 text-sm text-zaki-muted">…</div>;
  }

  return (
    <div className="relative">
      {grouped.map((group) => (
        <section key={group.label} className="mb-6">
          <h3 className="sticky top-0 z-10 -mx-2 bg-zaki-base/95 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-zaki-muted backdrop-blur">
            {group.label}
          </h3>
          <ul className="mt-2 space-y-2">
            {group.entries.map((entry) => (
              <TimelineEntryRow key={entry.id} entry={entry} t={t} />
            ))}
          </ul>
        </section>
      ))}
      <div ref={sentinelRef} className="h-8" />
      {isFetchingNextPage && (
        <div className="py-4 text-center text-xs text-zaki-muted">
          {t("brain.timeline.loading")}
        </div>
      )}
      {!hasNextPage && entries.length > 0 && (
        <div className="py-4 text-center text-xs text-zaki-muted">
          {t("brain.timeline.end")}
        </div>
      )}
    </div>
  );
}

interface RowProps {
  entry: BrainTimelineEntry;
  t: ReturnType<typeof useTranslation>["t"];
}

function TimelineEntryRow({ entry, t }: RowProps) {
  const isDeprecated = entry.valid_to !== null;
  const kindLabel =
    entry.kind === "core" || entry.kind === "daily" || entry.kind === "conversation"
      ? t(`brain.timeline.kindLabel.${entry.kind}`)
      : entry.kind;

  return (
    <li
      className={`rounded-zaki-lg bg-zaki-raised p-3 ${
        isDeprecated ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zaki-muted">
        <span>{kindLabel}</span>
        {isDeprecated && (
          <span className="rounded-full bg-zaki-base px-1.5 py-0.5 text-zaki-muted">
            {t("brain.timeline.superseded")}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-zaki-text">{entry.summary}</p>
    </li>
  );
}
