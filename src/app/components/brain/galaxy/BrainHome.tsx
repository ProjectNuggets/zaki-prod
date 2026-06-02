import { useMemo, useState } from "react";
import type { BrainGraphNode } from "@/lib/api";
import { useBrainCommunities, useBrainGraph } from "@/queries";
import { colorForCommunity } from "../brainColors";
import { BrainDetailPanel } from "./BrainDetailPanel";
import { BrainTimelineView } from "../BrainTimelineView";

// Brain Home — the search-first landing surface (replaces the graph as the
// default view). Research: a force-graph is decorative at thousands of nodes;
// daily value comes from a clear, observable overview. So we lead with theme
// cards (counts + samples) and the timeline ("what ZAKI learned") in one
// surface, with search as the front door. The galaxy lives behind "Explore".

const INTERNAL_CODENAME = /\b(nullalis|null[\s_-]?alis|panther|neptune)\b/i;
// Overview stays bounded (progressive disclosure) — showing all 250+ clusters
// would just be a hairball of cards. Search reaches the rest.
const VISIBLE_THEME_LIMIT = 24;

function labelOf(n: BrainGraphNode): string {
  return n.display_label || n.summary || n.key || n.id;
}

interface ThemeCard {
  id: number;
  title: string;
  named: boolean;
  count: number;
  /** Representative member labels, for the "e.g. …" sample line. */
  sample: string[];
  color: string;
}

export interface BrainHomeProps {
  userId: string;
}

export function BrainHome({ userId }: BrainHomeProps) {
  const communities = useBrainCommunities(userId);
  // NOTE: distinct params from the page probe + insights strip, so this is its
  // own fetch (not deduped). Fine at this corpus size; R3 will consolidate the
  // brain graph fetches into one shared query.
  const graph = useBrainGraph(userId, { max_nodes: 2000, exclude_orphans: false });

  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const nodes = useMemo(() => graph.data?.nodes ?? [], [graph.data]);

  // Members grouped by community, sorted by importance so samples are the most
  // representative memories of each theme.
  const membersByCommunity = useMemo(() => {
    const map = new Map<number, BrainGraphNode[]>();
    for (const n of nodes) {
      const cid = n.community_id ?? null;
      if (cid == null) continue;
      const list = map.get(cid);
      if (list) list.push(n);
      else map.set(cid, [n]);
    }
    const score = (n: BrainGraphNode) => n.importance ?? n.importance_score ?? 0;
    for (const list of map.values()) list.sort((a, b) => score(b) - score(a));
    return map;
  }, [nodes]);

  const cards = useMemo<ThemeCard[]>(() => {
    const list = (communities.data?.communities ?? []).filter(
      (c) => c.member_count > 0 && !INTERNAL_CODENAME.test(c.name),
    );
    const toCard = (c: (typeof list)[number]): ThemeCard => {
      const members = membersByCommunity.get(c.community_id) ?? [];
      const named = c.name_source === "llm";
      // count is the full-corpus member_count; the expanded list shows only
      // members within the fetched graph. Equal at this corpus size; BH2's
      // faceted browse handles clusters whose members exceed the cap.
      // Unnamed cluster → borrow its most important member as a provisional
      // title so the user never sees a raw "Cluster 19716777".
      const title = named ? c.name : members[0] ? labelOf(members[0]) : `Untitled theme`;
      return {
        id: c.community_id,
        title,
        named,
        count: c.member_count,
        sample: members.slice(0, 3).map(labelOf),
        color: colorForCommunity(c.community_id),
      };
    };
    // Named themes lead; then provisional ones, both by size.
    const byCount = (a: ThemeCard, b: ThemeCard) => b.count - a.count;
    const named = list.filter((c) => c.name_source === "llm").map(toCard).sort(byCount);
    const unnamed = list.filter((c) => c.name_source !== "llm").map(toCard).sort(byCount);
    return [...named, ...unnamed];
  }, [communities.data, membersByCommunity]);

  const matchedCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.sample.some((s) => s.toLowerCase().includes(q)),
    );
  }, [cards, query]);

  // Cap the default overview; searching reaches the full set.
  const searching = query.trim().length > 0;
  const visibleCards = searching ? matchedCards : matchedCards.slice(0, VISIBLE_THEME_LIMIT);
  const hiddenCount = searching ? 0 : Math.max(0, matchedCards.length - visibleCards.length);

  const loading = communities.isLoading || graph.isLoading;

  return (
    <div className="zaki-brain-home" data-testid="brain-home">
      <div className="zaki-brain-home__search">
        <input
          type="search"
          className="zaki-brain-home__search-input"
          placeholder="Search your memories and themes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search memories and themes"
        />
      </div>

      <section className="zaki-brain-home__section" aria-label="Themes">
        <h2 className="zaki-brain-home__heading">
          Themes
          {cards.length > 0 && <span className="zaki-brain-home__count">{cards.length}</span>}
        </h2>
        {loading ? (
          <p className="zaki-brain-home__muted">Loading your themes…</p>
        ) : visibleCards.length === 0 ? (
          <p className="zaki-brain-home__muted">
            {query ? "No themes match your search." : "No themes yet."}
          </p>
        ) : (
          <div className="zaki-brain-home__cards">
            {visibleCards.map((card) => {
              const expanded = expandedId === card.id;
              const members = membersByCommunity.get(card.id) ?? [];
              return (
                <div
                  key={card.id}
                  className={`zaki-brain-home__card${expanded ? " is-expanded" : ""}`}
                >
                  <button
                    type="button"
                    className="zaki-brain-home__card-head"
                    onClick={() => setExpandedId(expanded ? null : card.id)}
                    aria-expanded={expanded}
                  >
                    <span
                      className="zaki-brain-home__swatch"
                      style={{ background: card.color }}
                      aria-hidden
                    />
                    <span className="zaki-brain-home__card-title" title={card.title}>
                      {card.title}
                      {!card.named && <span className="zaki-brain-home__tag">untitled</span>}
                    </span>
                    <span className="zaki-brain-home__card-count">{card.count}</span>
                  </button>
                  {!expanded && card.sample.length > 0 && (
                    <p className="zaki-brain-home__sample">{card.sample.join(" · ")}</p>
                  )}
                  {expanded && (
                    <ul className="zaki-brain-home__members">
                      {members.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            className="zaki-brain-home__member"
                            onClick={() => setOpenKey(m.key ?? m.id)}
                          >
                            {labelOf(m)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {hiddenCount > 0 && (
          <p className="zaki-brain-home__muted">
            + {hiddenCount} more {hiddenCount === 1 ? "theme" : "themes"} — search to find them.
          </p>
        )}
      </section>

      <section className="zaki-brain-home__section" aria-label="Timeline">
        <h2 className="zaki-brain-home__heading">Timeline</h2>
        {/* Home and Timeline are the same idea ("what ZAKI knows / learned"),
            so the full timeline lives here rather than in a separate tab. */}
        <BrainTimelineView userId={userId} />
      </section>

      {openKey && (
        <div className="zaki-brain-home__drawer" role="dialog" aria-label="Memory detail">
          <BrainDetailPanel userId={userId} memoryKey={openKey} onClose={() => setOpenKey(null)} />
        </div>
      )}
    </div>
  );
}

export default BrainHome;
