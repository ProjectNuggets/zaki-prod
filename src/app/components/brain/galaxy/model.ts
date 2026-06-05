import type { BrainCommunity, BrainGraphEdge, BrainGraphNode, BrainGraphResponse } from "@/lib/api";
import {
  BRAND_RED,
  colorForCommunity,
  colorForRecency,
  colorForStatus,
  importancePercentileRanks,
  nodeColor,
  type ColorPreset,
} from "../brainColors";
import { edgeRelevance } from "../graphMath";
import type { RenderEdge, RenderModel, RenderNode } from "./engine/interface";

// ── Cluster-overview ("clusters-first" default) ──────────────────────────────
// The default Brain view is a constellation of ~12 LLM-named cluster hubs, not
// the full corpus hairball (research: a global force-graph is eye-candy past
// ~200 nodes; bounded/curated views drive daily return). A hub is just a
// RenderNode the engine draws like any other — id-prefixed so a click can be
// routed back to "drill into this cluster".

export const CLUSTER_NODE_PREFIX = "cluster:";
// How many theme hubs the clusters-first overview shows. A readability cap, not
// a data limit — too many hubs is just a hairball-of-cards, and "Explore
// everything" always reaches the full corpus. Named (LLM) themes fill it first.
const CLUSTER_OVERVIEW_LIMIT = 18;
// Internal project codenames must never surface as a user-facing cluster name
// (mirrors BrainInsightsStrip's filter).
const INTERNAL_CODENAME = /\b(nullalis|null[\s_-]?alis|panther|neptune)\b/i;

export function clusterNodeId(communityId: number): string {
  return `${CLUSTER_NODE_PREFIX}${communityId}`;
}

/** Returns the community id if `id` is a cluster hub node, else null. */
export function parseClusterNodeId(id: string): number | null {
  if (!id.startsWith(CLUSTER_NODE_PREFIX)) return null;
  const n = Number(id.slice(CLUSTER_NODE_PREFIX.length));
  return Number.isFinite(n) ? n : null;
}

/** Top-N communities by size as hub super-nodes (radius ∝ √member_count). */
export function buildClusterOverviewModel(
  communities: readonly BrainCommunity[] | undefined,
  limit: number = CLUSTER_OVERVIEW_LIMIT,
): RenderModel {
  const list = (communities ?? []).filter(
    (c) => c.member_count > 0 && !INTERNAL_CODENAME.test(c.name),
  );
  if (list.length === 0) return { nodes: [], edges: [] };

  // Prefer human-readable LLM-named themes ("Orlando Travel") over raw
  // "Cluster 19716777" fallbacks — even when a fallback cluster is larger.
  // Showing meaningless ids as the landing would defeat clusters-first; the
  // full corpus is one tap away via "Explore everything".
  const byCount = (a: BrainCommunity, b: BrainCommunity) => b.member_count - a.member_count;
  const named = list.filter((c) => c.name_source === "llm").sort(byCount);
  const unnamed = list.filter((c) => c.name_source !== "llm").sort(byCount);
  const top = [...named, ...unnamed].slice(0, limit);
  const maxCount = Math.max(...top.map((c) => c.member_count));

  const nodes: RenderNode[] = top.map((c) => ({
    id: clusterNodeId(c.community_id),
    label: c.name,
    // √-scaled so a 10× larger cluster reads as bigger without dwarfing the
    // rest; floored at 0.5 so even small hubs stay legible + clickable.
    importance: maxCount > 0 ? 0.5 + 0.5 * Math.sqrt(c.member_count / maxCount) : 0.7,
    color: colorForCommunity(c.community_id),
    kind: "cluster",
    communityId: c.community_id,
    stale: false,
    isSelf: false,
  }));

  return { nodes, edges: [] };
}

/** Narrow a graph response to one community's members (client-side drill-in). */
export function filterGraphByCommunity(
  graph: BrainGraphResponse | undefined,
  communityId: number,
): BrainGraphResponse | undefined {
  if (!graph) return graph;
  const nodes = graph.nodes.filter((n) => (n.community_id ?? null) === communityId);
  const ids = new Set(nodes.map((n) => n.id));
  const edges = graph.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  return { ...graph, nodes, edges };
}

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
  const now = Date.now();

  const nodes: RenderNode[] = rawNodes.map((n) => {
    const isSelf = opts.selfKey != null && (n.key === opts.selfKey || n.id === opts.selfKey);
    const stale = n.valid_to !== null && n.valid_to !== undefined;
    // "You" always renders in the molten accent so the anchor pops; everything
    // else follows the active "Color by" dimension. recency/status need
    // per-node time/validity, so they're resolved here rather than in nodeColor.
    let color: string;
    if (isSelf) color = BRAND_RED;
    else if (opts.colorPreset === "recency") color = colorForRecency(n.created_at, now);
    else if (opts.colorPreset === "status") color = colorForStatus(stale);
    else
      color = nodeColor(opts.colorPreset, {
        kind: n.kind,
        community_id: n.community_id ?? null,
        link_type: n.link_type ?? null,
      });
    return {
      id: n.id,
      label: n.display_label || n.summary || n.key || n.id,
      importance: ranks.get(n.id) ?? 0.3,
      color,
      kind: n.kind,
      communityId: n.community_id ?? null,
      stale,
      isSelf,
    };
  });

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
