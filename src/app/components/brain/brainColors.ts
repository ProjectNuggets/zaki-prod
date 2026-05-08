// Shared palette + color helpers for the V1.7 brain graph.
//
// Four color presets (user-toggleable):
//   - mono: monochrome dark canvas (V1.11 default — Obsidian aesthetic)
//   - community: palette[community_id mod 12]
//   - link_type: 7 LinkType values
//   - kind: core / daily / conversation (legacy fallback)
//
// V1.11 (2026-05-07) — `mono` added as the new default. The 12-color
// community palette was visually noisy out-of-the-box; mono renders
// every node in a muted gray and lets the existing border-emphasis
// styles (selected, highlighted, center) carry the visual weight,
// matching Obsidian's restraint. Users who want colors can switch
// preset; all existing color logic preserved unchanged.

// Canonical brand red. Mirror of CSS `--zaki-brand` so JS contexts that
// can't resolve CSS vars (cytoscape style configs, canvas renderers)
// have a single source of truth instead of inlined hex.
export const BRAND_RED = "#f10202";

export type ColorPreset = "mono" | "community" | "link_type" | "kind";

// V1.11 monochrome canvas — muted gray for all nodes; emphasis comes
// from border styles (selected/highlighted/center) defined in
// BrainGraphView.tsx cytoscape stylesheet. Picked to read on a dark
// canvas (#0a0a0a background) without competing with the red brand
// accent on selected/center nodes.
export const MONO_NODE = "#6b7280";

// 12-color qualitative palette (D3 Tableau, color-blind-friendly)
export const COMMUNITY_PALETTE: readonly string[] = [
  "#4e79a7",
  "#f28e2b",
  "#59a14f",
  "#e15759",
  "#76b7b2",
  "#edc948",
  "#b07aa1",
  "#ff9da7",
  "#9c755f",
  "#bab0ac",
  "#86bcb6",
  "#d37295",
];

export const LINK_TYPE_COLOR: Record<string, string> = {
  preference: "#f10202",
  attribute: "#3b82f6",
  supersession: "#a78bfa",
  relationship: "#10b981",
  usage: "#f59e0b",
  synthesis: "#ec4899",
  episode: "#6b7280",
};

// Audit (2026-05-07) — brand-coherent palette + user-language semantics.
// `core` = facts about you (brand red, sparing — these are identity).
// `daily` = recent activity (brand teal — accent).
// `conversation` = excerpts pulled from chats (warm desert neutral).
// Replaces a stock-Tailwind palette (#22c55e green / #6b7280 gray) that
// didn't read as a coherent system. Each color now appears elsewhere
// in the brand, so legend chips reuse the same tokens visually.
export const KIND_COLOR: Record<string, string> = {
  core: "#f10202",
  daily: "#219171",
  conversation: "#B09472",
};

// User-facing labels for kinds. The internal vocabulary (core / daily /
// conversation) is opaque to a first-time user; these read as life
// categories. Used by the canvas legend chip strip.
export const KIND_LABEL: Record<string, string> = {
  core: "About you",
  daily: "Daily life",
  conversation: "Conversations",
};

export const EDGE_COLOR: Record<string, string> = {
  semantic: "#7b9fd4",
  reference: "#a89070",
  session: "#7a7a8a",
  typed: "#c084fc",
};

const FALLBACK_NODE = "#6b7280";

export function colorForCommunity(id: number | null | undefined): string {
  if (id === null || id === undefined || Number.isNaN(id)) return FALLBACK_NODE;
  const idx = ((id % COMMUNITY_PALETTE.length) + COMMUNITY_PALETTE.length) % COMMUNITY_PALETTE.length;
  return COMMUNITY_PALETTE[idx] ?? FALLBACK_NODE;
}

export function colorForLinkType(t: string | null | undefined): string {
  if (!t) return FALLBACK_NODE;
  return LINK_TYPE_COLOR[t] ?? FALLBACK_NODE;
}

export function colorForKind(k: string | null | undefined): string {
  if (!k) return FALLBACK_NODE;
  return KIND_COLOR[k] ?? FALLBACK_NODE;
}

export function nodeColor(
  preset: ColorPreset,
  node: {
    kind?: string;
    community_id?: number | null;
    link_type?: string | null;
  },
): string {
  // V1.11 mono preset — every node muted gray. Border styles
  // (selected/highlighted/center) carry the visual emphasis.
  if (preset === "mono") return MONO_NODE;
  if (preset === "community") {
    if (node.community_id !== null && node.community_id !== undefined) {
      return colorForCommunity(node.community_id);
    }
    // Fallback when no community
    return colorForKind(node.kind);
  }
  if (preset === "link_type") return colorForLinkType(node.link_type);
  return colorForKind(node.kind);
}

// Importance percentile (0..1) -> radius.
//
// History:
//   pre-V1.11:  8 + 16*i  (range  8-24px, 3×)
//   V1.11 a:    6 + 30*i  (range  6-36px, 6×)  — too big, Nova feedback
//   V1.11 b:    4 + 10*i  (range 4-14px, 3.5×) — Obsidian-calibrated
//   audit (2026-05-07): 5 + 13*i (range 5-18px, 3.6×)
//
// Audit (2026-05-07) — input is now percentile rank, not raw value.
// Real ZAKI corpora cluster importance values tightly (test corpus
// spanned 0.65–0.91, range 0.26). With linear remap of raw values
// the radius range was wasted on importance < 0.65 (no nodes there)
// and the visible spread collapsed to ~2.6px — every node looked
// the same size. By feeding percentile rank (computed from the
// sorted corpus), the smallest 10% always paint at 5px and the
// largest 10% at ~17–18px regardless of how the underlying scoring
// distributes. Hubs are visibly hubs; leaves visibly leaves.
//
// Range bumped 4-14 → 5-18 (3.6× ratio, slightly more headroom for
// hubs without making leaves feel too small). Combined with the
// importance-opacity (0.45-1.0 per node, also percentile-rank
// driven now), the eye gets two stacked hierarchy anchors that
// always span their full range.
export function importanceToRadius(importancePercentile: number | undefined): number {
  const i = typeof importancePercentile === "number"
    ? Math.max(0, Math.min(1, importancePercentile))
    : 0.3;
  return 5 + 13 * i;
}

// Compute percentile rank (0..1) for each value against the population.
// Ties get the average rank. NaN / non-finite values map to 0.5.
// Returns a Map keyed by stable id so callers can look up per-node.
export function importancePercentileRanks<T>(
  items: readonly T[],
  getId: (item: T) => string,
  getValue: (item: T) => number | undefined | null,
): Map<string, number> {
  const valid: Array<{ id: string; value: number }> = [];
  for (const item of items) {
    const v = getValue(item);
    if (typeof v === "number" && Number.isFinite(v)) {
      valid.push({ id: getId(item), value: v });
    }
  }
  const ranks = new Map<string, number>();
  if (valid.length === 0) return ranks;
  if (valid.length === 1) {
    ranks.set(valid[0]!.id, 0.5);
    return ranks;
  }
  // Sort ascending by value; rank = index / (n - 1)
  valid.sort((a, b) => a.value - b.value);
  for (let i = 0; i < valid.length; i++) {
    ranks.set(valid[i]!.id, i / (valid.length - 1));
  }
  return ranks;
}

// V1.11 (2026-05-07) — Per-edge ideal length used by cose-bilkent.
// Pre-V1.11 every edge had a single global ideal-length (slider-tunable);
// the layout treated every relationship as equally tight. Obsidian's
// actual mechanism varies distance by relationship type — strong content
// links pull nodes close, loose co-occurrence links sit further apart.
// This function returns the per-edge length cose-bilkent uses as the
// spring's resting position, so:
//   - typed edges (explicit predicate, e.g. WORKS_ON, LIKES): tight
//   - semantic edges (vector similarity above threshold): close
//   - reference edges (one mentions the other): medium
//   - session edges (co-occurred in same conversation): loose
// Result: organic distance variation that the eye reads as relationship
// strength without any explicit legend. The slider-controlled
// idealEdgeLength becomes a baseline the per-edge multiplier scales.
export function idealEdgeLengthForType(type: string | null | undefined, baseline: number): number {
  switch (type) {
    case "typed":
      return baseline * 0.7;
    case "semantic":
      return baseline * 0.85;
    case "reference":
      return baseline * 1.15;
    case "session":
    default:
      return baseline * 1.5;
  }
}
