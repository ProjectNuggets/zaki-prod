import type { BrainGraphEdge } from "@/lib/api";

// Per-edge relevance (0..1) — drives force-layout link strength/distance and
// visual edge weight. Shared by the cytoscape view (BrainGraphView) and the
// Galaxy renderer so both read one source of truth.
//
//   session   → 0.5 (co-occurrence; no per-pair similarity signal)
//   semantic  → remap cosine [0.7,1.0] → [0,1] (strong links pull tight)
//   typed     → confidence × tanh(weight/3) (vote-weighted, saturating)
//   reference / unknown → 0.5 (neutral)
export function edgeRelevance(edge: BrainGraphEdge): number {
  if (edge.type === "session") return 0.5;
  if (edge.type === "semantic") {
    const w =
      typeof edge.weight === "number" && Number.isFinite(edge.weight)
        ? Math.max(0, Math.min(1, edge.weight))
        : 0.5;
    return Math.max(0, Math.min(1, (w - 0.7) / 0.3));
  }
  if (edge.type !== "typed") return 0.5;
  const conf =
    typeof edge.confidence === "number" && Number.isFinite(edge.confidence)
      ? Math.max(0, Math.min(1, edge.confidence))
      : 1.0;
  const w =
    typeof edge.weight === "number" && Number.isFinite(edge.weight)
      ? Math.max(0, edge.weight)
      : 1.0;
  return Math.max(0, Math.min(1, conf * Math.tanh(w / 3)));
}
