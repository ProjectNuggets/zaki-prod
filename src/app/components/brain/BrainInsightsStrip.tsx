import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Layers, Database } from "lucide-react";
import { useBrainGraph, useBrainCommunities, useBrainTimeline } from "@/queries";

interface Props {
  userId: string;
}

/**
 * Internal codenames that may surface as community names in the brain
 * data (the runtime had memories tagged with "nullALIS", "panther",
 * etc. during pre-launch development). When the brain's top community
 * matches one of these, fall back to a generic copy so the user never
 * sees a developer-facing label on their dashboard.
 */
const INTERNAL_CODENAME_PATTERN = /\b(nullalis|null[\s_-]?alis|panther|neptune)\b/i;

function isInternalCodename(name: string | null | undefined): boolean {
  if (!name) return false;
  return INTERNAL_CODENAME_PATTERN.test(name);
}

// Audit (2026-05-08) — Insights strip. Pillar-1 visible-memory beat:
// users SEE the brain accruing. Three cards above the tabs answer
// "what does ZAKI know about me?" at a glance.
//
// Today: derived client-side from /brain/graph + /brain/timeline +
// /brain/communities. When backend ships /brain/insights (spec
// item #4), swap to that single endpoint — the data shape stays
// the same per-card.
//
// Cards:
//   • New this week — count of memories with created_at in last 7 days
//   • Top community — community with most members
//   • Total memories — corpus size from graph endpoint
//
// Each card is informational today; future: clickable to filter or
// anchor the canvas. Card layout collapses to horizontally-scrollable
// row on narrow screens.
export function BrainInsightsStrip({ userId }: Props) {
  const { t } = useTranslation();
  const graphQuery = useBrainGraph(userId, { max_nodes: 50, exclude_orphans: true });
  const communitiesQuery = useBrainCommunities(userId);
  const timelineQuery = useBrainTimeline(userId, { limit: 50 });

  const stats = useMemo(() => {
    const total = graphQuery.data?.total_nodes_in_corpus ?? 0;
    // Most recent timeline page (50 entries). Filter to last 7 days.
    const nowSeconds = Date.now() / 1000;
    const sevenDaysAgo = nowSeconds - 7 * 24 * 60 * 60;
    const firstPage = timelineQuery.data?.pages?.[0]?.entries ?? [];
    const newThisWeek = firstPage.filter((e) => (e.created_at ?? 0) >= sevenDaysAgo).length;
    // Top community by member_count. Skip any whose name matches an
    // internal-only codename so a developer artifact never leaks onto
    // the user's dashboard.
    const communities = communitiesQuery.data?.communities ?? [];
    const topCommunity = communities
      .slice()
      .filter((c) => !isInternalCodename(c.name))
      .sort((a, b) => (b.member_count ?? 0) - (a.member_count ?? 0))[0];
    return {
      total,
      newThisWeek,
      topCommunityName: topCommunity?.name ?? null,
      topCommunityCount: topCommunity?.member_count ?? 0,
      isLoading:
        graphQuery.isLoading || communitiesQuery.isLoading || timelineQuery.isLoading,
    };
  }, [graphQuery.data, communitiesQuery.data, timelineQuery.data, graphQuery.isLoading, communitiesQuery.isLoading, timelineQuery.isLoading]);

  if (stats.isLoading || stats.total === 0) {
    return null;
  }

  return (
    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card
        icon={<Sparkles className="size-4 text-zaki-brand" />}
        value={stats.newThisWeek}
        label={t("brain.insights.newThisWeek", { defaultValue: "new this week" })}
        hint={
          stats.newThisWeek === 0
            ? t("brain.insights.newThisWeekEmpty", {
                defaultValue: "Quiet stretch. ZAKI's caught up.",
              })
            : t("brain.insights.newThisWeekHint", {
                defaultValue: "memories ZAKI added recently",
              })
        }
      />
      <Card
        icon={<Layers className="size-4 text-zaki-brand" />}
        value={stats.topCommunityCount}
        label={
          stats.topCommunityName
            ? t("brain.insights.topCommunity", {
                defaultValue: "memories in {{name}}",
                name: stats.topCommunityName,
              })
            : t("brain.insights.topCommunityFallback", {
                defaultValue: "in your largest cluster",
              })
        }
        hint={t("brain.insights.topCommunityHint", {
          defaultValue: "what you and ZAKI talk about most",
        })}
      />
      <Card
        icon={<Database className="size-4 text-zaki-brand" />}
        value={stats.total}
        label={t("brain.insights.total", { defaultValue: "total memories" })}
        hint={t("brain.insights.totalHint", {
          defaultValue: "every fact, preference, and conversation",
        })}
      />
    </div>
  );
}

interface CardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  hint: string;
}

function Card({ icon, value, label, hint }: CardProps) {
  return (
    <div className="rounded-zaki-lg border border-zaki-border bg-zaki-raised p-4">
      <div className="flex items-baseline gap-2">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-zaki-brand/10">
          {icon}
        </span>
        <div className="font-display text-2xl font-bold tracking-tight text-zaki-text tabular-nums">
          {value.toLocaleString()}
        </div>
      </div>
      <div className="mt-1 text-sm font-medium text-zaki-text">{label}</div>
      <div className="mt-0.5 text-xs text-zaki-muted">{hint}</div>
    </div>
  );
}
