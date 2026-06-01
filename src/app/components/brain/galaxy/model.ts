import type { BrainGraphEdge, BrainGraphNode, BrainGraphResponse } from "@/lib/api";
import { importancePercentileRanks, nodeColor, type ColorPreset } from "../brainColors";
import { edgeRelevance } from "../graphMath";
import type { RenderEdge, RenderModel, RenderNode } from "./engine/interface";

export interface BuildModelOptions {
  colorPreset: ColorPreset;
  selfKey: string | null;
  /** Semantic edges below this weight are dropped (matches the filter rail +
   *  the counter strip). Non-semantic edges always pass. */
  semanticEdgeThreshold: number;
}

// Adapt a raw BrainGraphResponse into the engine's flat RenderModel. All the
// importance/relevance/color math (ported, shared with the cytoscape view)
// runs here so the engine stays a pure consumer of resolved values.
export function buildRenderModel(
  graph: BrainGraphResponse | undefined,
  opts: BuildModelOptions,
): RenderModel {
  const rawNodes = graph?.nodes ?? [];
  if (rawNodes.length === 0) return { nodes: [], edges: [] };

  const rawEdges = graph?.edges ?? [];

  // Degree centrality as the importance fallback when the corpus emits no
  // importance/importance_score (mirrors BrainGraphView).
  const degree = new Map<string, number>();
  for (const e of rawEdges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }
  let maxDeg = 0;
  for (const d of degree.values()) maxDeg = Math.max(maxDeg, d);

  const importanceOf = (n: BrainGraphNode): number => {
    if (typeof n.importance === "number") return n.importance;
    if (typeof n.importance_score === "number") return n.importance_score;
    return maxDeg > 0 ? (degree.get(n.id) ?? 0) / maxDeg : 0;
  };

  const ranks = importancePercentileRanks(rawNodes, (n) => n.id, importanceOf);

  const nodes: RenderNode[] = rawNodes.map((n) => ({
    id: n.id,
    label: n.display_label || n.summary || n.key || n.id,
    importance: ranks.get(n.id) ?? 0.3,
    color: nodeColor(opts.colorPreset, {
      kind: n.kind,
      community_id: n.community_id ?? null,
      link_type: n.link_type ?? null,
    }),
    kind: n.kind,
    communityId: n.community_id ?? null,
    stale: n.valid_to !== null && n.valid_to !== undefined,
    isSelf: opts.selfKey != null && (n.key === opts.selfKey || n.id === opts.selfKey),
  }));

  const present = new Set(nodes.map((n) => n.id));
  const edges: RenderEdge[] = [];
  for (const e of rawEdges) {
    if (!present.has(e.source) || !present.has(e.target)) continue;
    if (isBelowSemanticThreshold(e, opts.semanticEdgeThreshold)) continue;
    edges.push({
      source: e.source,
      target: e.target,
      relevance: edgeRelevance(e),
      type: e.type,
    });
  }

  return { nodes, edges };
}

function isBelowSemanticThreshold(edge: BrainGraphEdge, threshold: number): boolean {
  if (edge.type !== "semantic") return false;
  const w = (edge as { weight?: number }).weight;
  return typeof w === "number" && w < threshold;
}
