// BrainOrphanRail — vertical list of brain-visible facts with no edges.
// Consumes /brain/orphans. Click to drill into local-graph (with that
// fact as center).
//
// V1.11 (2026-05-07) — UI label flipped from "Orphans" to "Loose facts"
// per Nova: orphan is a programmer word that sounds broken/sad. The
// fact isn't broken — the extractor just hasn't connected it to anything
// else yet. "Loose" is honest about the state and inviting (the user
// can drill in and tell ZAKI how it relates). Endpoint name +
// component name + hook name kept as-is to avoid scope creep; only
// user-visible strings change.

import { formatDistanceToNowStrict } from "date-fns";
import { useTranslation } from "react-i18next";
import { useBrainOrphans } from "@/queries";
import { KIND_COLOR } from "./brainColors";
import { brainDisplayText } from "./brainText";

interface Props {
  userId: string;
  onPick: (key: string) => void;
}

export function BrainOrphanRail({ userId, onPick }: Props) {
  const { t } = useTranslation();
  const orphansQuery = useBrainOrphans(userId, { limit: 50 });

  const list = orphansQuery.data?.orphans ?? [];

  return (
    <section
      // V1.11 hotfix (2026-05-07) — solid #181818 bg matching the
      // BrainFilterPanel update; overlay panels need to be readable
      // when slid over the dark canvas.
      className="flex w-72 shrink-0 flex-col gap-2 overflow-hidden rounded-zaki-lg border border-white/10 bg-[#181818] p-3 text-sm"
      data-testid="brain-orphan-rail"
    >
      <header className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-white/55">
          {t("brain.orphanRail.title", { defaultValue: "Loose facts" })}
        </h3>
        <span className="text-xs text-white/55">{orphansQuery.data?.stats.orphans ?? 0}</span>
      </header>

      {orphansQuery.isLoading && (
        <p className="text-xs text-white/55">
          {t("brain.orphanRail.loading", { defaultValue: "Loading..." })}
        </p>
      )}

      {!orphansQuery.isLoading && list.length === 0 && (
        <p className="text-xs text-white/55">
          {t("brain.orphanRail.empty", { defaultValue: "No loose facts — every memory is connected." })}
        </p>
      )}

      <ul className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {list.map((o) => {
          const key = o.key ?? o.id;
          const color = KIND_COLOR[o.kind] ?? "#6b7280";
          return (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => onPick(key)}
                className="flex w-full flex-col gap-0.5 rounded-[2px] px-2 py-1.5 text-left transition hover:bg-white/5"
                data-testid="brain-orphan-row"
              >
                <span className="line-clamp-1 text-xs text-white/85">
                  {brainDisplayText(o.summary, key, "Memory")}
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-white/55">
                  <span
                    className="size-1.5 rounded-[1px]"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  <span>{o.kind}</span>
                  <span>·</span>
                  <span>
                    {o.created_at
                      ? formatDistanceToNowStrict(new Date(o.created_at * 1000), {
                          addSuffix: true,
                        })
                      : ""}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
