// BrainTimeScrubber — date picker + births/deaths panel + animate.
// Consumes /brain/diff?date=YYYY-MM-DD.
// Animate cycles backward through the last 30 days at 1 day/sec, exposing
// the affected node keys so the parent graph can highlight them.

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBrainDiff } from "@/queries";

interface Props {
  userId: string;
  onHighlightKeys: (keys: string[]) => void;
  onPick: (key: string) => void;
}

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function shiftDay(iso: string, deltaDays: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

export function BrainTimeScrubber({ userId, onHighlightKeys, onPick }: Props) {
  const { t } = useTranslation();
  const [date, setDate] = useState<string>(todayISO());
  const [animating, setAnimating] = useState(false);

  const diffQuery = useBrainDiff(userId, { date });

  // Highlight affected keys in the graph whenever the diff resolves.
  useEffect(() => {
    if (!diffQuery.data) return;
    const keys: string[] = [];
    for (const b of diffQuery.data.births) keys.push(b.key);
    for (const d of diffQuery.data.deaths) keys.push(d.key);
    onHighlightKeys(keys);
  }, [diffQuery.data, onHighlightKeys]);

  // Animate: walk backward 30 days, 1 day/sec, stopping when toggled off.
  useEffect(() => {
    if (!animating) return;
    let remaining = 30;
    const id = window.setInterval(() => {
      setDate((cur) => shiftDay(cur, -1));
      remaining -= 1;
      if (remaining <= 0) {
        setAnimating(false);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [animating]);

  const births = diffQuery.data?.births ?? [];
  const deaths = diffQuery.data?.deaths ?? [];

  return (
    <section
      className="flex flex-col gap-2 rounded-zaki-lg border border-white/10 bg-[#181818] p-3 text-sm"
      data-testid="brain-time-scrubber"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-white/55">
          {t("brain.scrubber.title", { defaultValue: "Time scrubber" })}
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-zaki-md border border-white/10 bg-[#1f1f1f] px-2 py-0.5 text-xs text-white/85 focus:border-zaki-brand focus:outline-none"
            data-testid="brain-scrubber-date"
          />
          <button
            type="button"
            onClick={() => {
              setDate((cur) => shiftDay(cur, -1));
            }}
            className="rounded-zaki-md border border-white/10 px-2 py-0.5 text-xs text-white/55 hover:text-white"
            aria-label={t("brain.scrubber.prevDay", { defaultValue: "Previous day" })}
          >
            {"‹"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDate((cur) => shiftDay(cur, 1));
            }}
            className="rounded-zaki-md border border-white/10 px-2 py-0.5 text-xs text-white/55 hover:text-white"
            aria-label={t("brain.scrubber.nextDay", { defaultValue: "Next day" })}
          >
            {"›"}
          </button>
          <button
            type="button"
            onClick={() => setAnimating((v) => !v)}
            className={`rounded-zaki-md border px-2 py-0.5 text-xs transition ${
              animating
                ? "border-zaki-brand bg-zaki-brand-10 text-zaki-brand"
                : "border-white/10 text-white/85 hover:border-zaki-brand"
            }`}
            data-testid="brain-scrubber-animate"
          >
            {animating
              ? t("brain.scrubber.stop", { defaultValue: "Stop" })
              : t("brain.scrubber.animate", { defaultValue: "Animate" })}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <DiffColumn
          title={t("brain.scrubber.born", { defaultValue: "Born" })}
          tone="positive"
          items={births}
          onPick={onPick}
        />
        <DiffColumn
          title={t("brain.scrubber.archived", { defaultValue: "Archived" })}
          tone="negative"
          items={deaths}
          onPick={onPick}
        />
      </div>
    </section>
  );
}

interface DiffColumnProps {
  title: string;
  tone: "positive" | "negative";
  items: Array<{ key: string; summary: string }>;
  onPick: (key: string) => void;
}

function DiffColumn({ title, tone, items, onPick }: DiffColumnProps) {
  const dot = tone === "positive" ? "bg-zaki-success" : "bg-zaki-warning";
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-white/55">
        <span className={`size-1.5 rounded-[1px] ${dot}`} aria-hidden />
        <span>
          {title} <span className="text-white/55">({items.length})</span>
        </span>
      </div>
      <ul className="max-h-32 space-y-0.5 overflow-y-auto">
        {items.length === 0 && (
          <li className="px-1 text-xs text-white/55">—</li>
        )}
        {items.map((it) => (
          <li key={`${tone}-${it.key}`}>
            <button
              type="button"
              onClick={() => onPick(it.key)}
              className="block w-full truncate rounded-zaki-md px-1 py-0.5 text-left text-xs text-white/85 hover:bg-white/5"
            >
              {it.summary}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
