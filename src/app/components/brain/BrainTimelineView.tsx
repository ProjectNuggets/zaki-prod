import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBrainTimeline } from "@/queries";
import type { BrainTimelineEntry } from "@/lib/api";
import { brainDisplayText } from "./brainText";

interface Props {
  userId: string;
  onPick?: (key: string) => void;
}

// S5: One year window for the time-travel slider.
// V1.7 will replace the fixed start with the actual earliest-memory date from the backend.
const SLIDER_RANGE_SECS = 365 * 24 * 3600;

function nowSecs() {
  return Math.floor(Date.now() / 1000);
}

export function BrainTimelineView({ userId, onPick }: Props) {
  const { t } = useTranslation();

  // S5: slider state. undefined = no `to` filter (show full / latest)
  const maxSecs = useRef(nowSecs());
  const minSecs = maxSecs.current - SLIDER_RANGE_SECS;
  const [sliderVal, setSliderVal] = useState<number>(maxSecs.current);
  const isAtNow = sliderVal >= maxSecs.current;
  const toParam = isAtNow ? undefined : sliderVal;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useBrainTimeline(userId, { to: toParam });

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

  // Sentinel-based infinite scroll — keep a ref so the observer callback always
  // reads the latest isFetchingNextPage without being a dep (which would recreate
  // the observer on every fetch-state change and risk a duplicate request).
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isFetchingRef = useRef(isFetchingNextPage);
  useEffect(() => {
    isFetchingRef.current = isFetchingNextPage;
  }, [isFetchingNextPage]);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (items) => {
        for (const it of items) {
          if (it.isIntersecting && hasNextPage && !isFetchingRef.current) {
            fetchNextPage();
          }
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [hasNextPage, fetchNextPage]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSliderVal(Number(e.target.value));
    },
    [],
  );

  const handleResetToNow = useCallback(() => {
    maxSecs.current = nowSecs();
    setSliderVal(maxSecs.current);
  }, []);

  const asOfLabel = useMemo(() => {
    if (isAtNow) return t("brain.timeline.slider.now");
    return t("brain.timeline.slider.asOf", {
      date: new Date(sliderVal * 1000).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    });
  }, [isAtNow, sliderVal, t]);

  if (isLoading) {
    return <div className="py-6 text-sm text-zaki-muted">…</div>;
  }

  if (isError) {
    return (
      <div className="py-6 text-center text-sm text-zaki-muted">
        {t("brain.error.loadFailed")}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* S5: Time-travel slider */}
      <div className="mb-5 rounded-zaki-lg border border-zaki-border bg-zaki-raised px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zaki-muted">
            {t("brain.timeline.slider.label")}
          </span>
          <span className="flex items-center gap-2">
            <span
              className={`text-xs font-medium tabular-nums transition-colors ${
                isAtNow ? "text-zaki-muted" : "text-zaki-brand"
              }`}
            >
              {asOfLabel}
            </span>
            {!isAtNow && (
              <button
                type="button"
                onClick={handleResetToNow}
                aria-label={t("brain.timeline.slider.resetAria")}
                className="rounded px-1.5 py-0.5 text-[10px] font-medium text-zaki-brand ring-1 ring-zaki-brand-40 hover:bg-zaki-brand-10 focus:outline-none focus:ring-2"
              >
                {t("brain.timeline.slider.now")}
              </button>
            )}
          </span>
        </div>
        <input
          type="range"
          min={minSecs}
          max={maxSecs.current}
          step={3600} // 1-hour granularity
          value={sliderVal}
          onChange={handleSliderChange}
          aria-label={t("brain.timeline.slider.label")}
          aria-valuetext={asOfLabel}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-[2px] bg-zaki-border accent-zaki-brand"
        />
        <div className="mt-1 flex justify-between text-[9px] text-zaki-muted">
          <span>
            {new Date(minSecs * 1000).toLocaleDateString(undefined, {
              month: "short",
              year: "numeric",
            })}
          </span>
          <span>{t("brain.timeline.slider.now")}</span>
        </div>
      </div>

      {/* Timeline entries */}
      {grouped.map((group) => (
        // Key by the group's first entry id, not the date label: out-of-order
        // timestamps across pages can produce two non-contiguous groups with the
        // same date label, which collided as duplicate React keys.
        <section key={group.entries[0]?.id ?? group.label} className="mb-6">
          <h3 className="sticky top-0 z-10 -mx-2 bg-zaki-base/95 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-zaki-muted">
            {group.label}
          </h3>
          <ul className="mt-2 space-y-2">
            {group.entries.map((entry) => (
              <TimelineEntryRow key={entry.id} entry={entry} t={t} onPick={onPick} />
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
  onPick?: (key: string) => void;
}

function TimelineEntryRow({ entry, t, onPick }: RowProps) {
  const isDeprecated = entry.valid_to !== null;
  const summary = brainDisplayText(entry.summary, entry.key, entry.id, "Memory");
  const kindLabel =
    entry.kind === "core" || entry.kind === "daily" || entry.kind === "conversation"
      ? t(`brain.timeline.kindLabel.${entry.kind}`)
      : entry.kind;

  return (
    <li
      className={`rounded-[2px] bg-zaki-raised p-3 ${
        isDeprecated ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zaki-muted">
        <span>{kindLabel}</span>
        {isDeprecated && (
          <span className="rounded-[2px] bg-zaki-base px-1.5 py-0.5 text-zaki-muted">
            {t("brain.timeline.superseded")}
          </span>
        )}
      </div>
      {onPick ? (
        <button
          type="button"
          className="mt-1 block w-full rounded-[2px] text-left text-sm text-zaki-text hover:text-zaki-brand focus:outline-none focus:ring-2 focus:ring-zaki-brand-40"
          onClick={() => onPick(entry.key ?? entry.id)}
        >
          {summary}
        </button>
      ) : (
        <p className="mt-1 text-sm text-zaki-text">{summary}</p>
      )}
    </li>
  );
}
