// Shared palette + color helpers for the V1.7 brain graph.
//
// Three color presets (user-toggleable):
//   - community: palette[community_id mod 12]
//   - link_type: 7 LinkType values
//   - kind: core / daily / conversation (legacy fallback)

export type ColorPreset = "community" | "link_type" | "kind";

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

// Importance (0..1) -> radius. Three-decimal float -> 1000 buckets.
export function importanceToRadius(importance: number | undefined): number {
  const i = typeof importance === "number" ? Math.max(0, Math.min(1, importance)) : 0.3;
  return 8 + 16 * i;
}
