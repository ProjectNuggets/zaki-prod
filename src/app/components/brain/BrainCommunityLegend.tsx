// BrainCommunityLegend — cluster legend with manual recompute button.
// Consumes /brain/communities + POST /brain/communities/recompute.
//
// V1 limitations handled:
//   - empty list -> "Compute clusters" CTA (LPA hasn't run yet)
//   - 409 conflict -> "Recompute already running"
//   - name_source === "fallback" -> italic + dim

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useBrainCommunities,
  useBrainCommunitiesRecompute,
  BrainRecomputeConflictError,
} from "@/queries";
import { colorForCommunity } from "./brainColors";

interface Props {
  userId: string;
  selectedCommunityId: number | null;
  onSelectCommunity: (id: number | null) => void;
}

export function BrainCommunityLegend({
  userId,
  selectedCommunityId,
  onSelectCommunity,
}: Props) {
  const { t } = useTranslation();
  const communitiesQuery = useBrainCommunities(userId);
  const recompute = useBrainCommunitiesRecompute(userId);
  const [toast, setToast] = useState<string | null>(null);

  const communities = communitiesQuery.data?.communities ?? [];
  const sorted = [...communities].sort((a, b) => b.member_count - a.member_count);
  const isRunning = recompute.isPending;

  const handleRecompute = async () => {
    setToast(null);
    try {
      const res = await recompute.mutateAsync();
      setToast(
        t("brain.communities.recomputeSuccess", {
          defaultValue: "{{found}} clusters detected, {{llm}} LLM-named.",
          found: res.stats.communities_found,
          llm: res.stats.llm_calls_succeeded,
        }),
      );
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      if (err instanceof BrainRecomputeConflictError) {
        setToast(
          t("brain.communities.recomputeConflict", {
            defaultValue: "Recompute already running.",
          }),
        );
      } else {
        setToast(
          t("brain.communities.recomputeError", { defaultValue: "Recompute failed." }),
        );
      }
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <section
      // V1.11 hotfix (2026-05-07) — solid #181818 bg matching the
      // BrainFilterPanel update; overlay panels need to be readable
      // when slid over the dark canvas.
      className="flex w-72 shrink-0 flex-col gap-2 overflow-hidden rounded-zaki-lg border border-white/10 bg-[#181818] p-3 text-sm"
      data-testid="brain-community-legend"
    >
      <header className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-zaki-muted">
          {t("brain.communities.title", { defaultValue: "Clusters" })}
        </h3>
        <button
          type="button"
          onClick={handleRecompute}
          disabled={isRunning}
          className="rounded-zaki-md border border-zaki-border px-2 py-0.5 text-xs text-zaki-text transition hover:border-[#f10202] hover:text-[#f10202] disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="brain-recompute-clusters"
        >
          {isRunning
            ? t("brain.communities.recomputing", { defaultValue: "Running..." })
            : t("brain.communities.recompute", { defaultValue: "Recompute" })}
        </button>
      </header>

      {toast && <p className="text-xs text-zaki-muted">{toast}</p>}

      {!communitiesQuery.isLoading && sorted.length === 0 && (
        <p className="text-xs text-zaki-muted">
          {t("brain.communities.emptyHint", {
            defaultValue:
              "No clusters yet. Click Recompute to detect groups in your knowledge graph.",
          })}
        </p>
      )}

      <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {sorted.map((c) => {
          const swatch = colorForCommunity(c.community_id);
          const isFallback = c.name_source === "fallback";
          const isActive = selectedCommunityId === c.community_id;
          return (
            <li key={c.community_id}>
              <button
                type="button"
                onClick={() =>
                  onSelectCommunity(isActive ? null : c.community_id)
                }
                className={`flex w-full items-center gap-2 rounded-zaki-md px-2 py-1 text-left text-xs transition ${
                  isActive
                    ? "bg-zaki-text/10 text-zaki-text"
                    : "text-zaki-text hover:bg-zaki-text/5"
                }`}
                data-testid={`brain-cluster-row-${c.community_id}`}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: swatch }}
                  aria-hidden
                />
                <span
                  className={`flex-1 truncate ${
                    isFallback ? "italic text-zaki-muted" : ""
                  }`}
                >
                  {c.name}
                </span>
                <span className="shrink-0 text-zaki-muted">{c.member_count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
