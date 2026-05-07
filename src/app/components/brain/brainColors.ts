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

export const KIND_COLOR: Record<string, string> = {
  core: "#f10202",
  daily: "#22c55e",
  conversation: "#6b7280",
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

// Importance (0..1) -> radius.
//
// V1.11 (2026-05-07) — range widened 8-24px (3×) → 6-36px (6×) for
// stronger visual hierarchy. The prior 3× ratio was too subtle on
// the dark canvas — hubs and leaves read as roughly the same size,
// and the size-only signal couldn't carry the eye to important
// nodes. 6× gives Obsidian-like contrast: hubs dominate, leaves
// recede. Combined with the V1.11 importance-opacity (0.45-1.0),
// the eye gets two stacked anchors for the same hierarchy.
export function importanceToRadius(importance: number | undefined): number {
  const i = typeof importance === "number" ? Math.max(0, Math.min(1, importance)) : 0.3;
  return 6 + 30 * i;
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
