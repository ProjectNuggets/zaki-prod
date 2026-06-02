import { describe, expect, it } from "@jest/globals";
import type { BrainCommunity, BrainGraphResponse } from "@/lib/api";
import {
  buildClusterOverviewModel,
  buildRenderModel,
  clusterNodeId,
  filterGraphByCommunity,
  parseClusterNodeId,
} from "./model";

function community(id: number, member_count: number, extra: Partial<BrainCommunity> = {}): BrainCommunity {
  return {
    community_id: id,
    member_count,
    generated_at: 0,
    name: `Cluster ${id}`,
    name_source: "fallback",
    ...extra,
  };
}

function graph(partial: Partial<BrainGraphResponse>): BrainGraphResponse {
  return {
    nodes: [],
    edges: [],
    trimmed: false,
    total_skipped: 0,
    total_nodes_in_corpus: 0,
    semantic_degraded: false,
    ...partial,
  } as BrainGraphResponse;
}

function node(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    kind: "core",
    created_at: 0,
    session_id: null,
    summary: `summary ${id}`,
    valid_to: null,
    ...extra,
  };
}

const OPTS = { colorPreset: "kind" as const, selfKey: null, semanticEdgeThreshold: 0.85 };

describe("buildRenderModel", () => {
  it("returns an empty model for missing or empty graphs", () => {
    expect(buildRenderModel(undefined, OPTS)).toEqual({ nodes: [], edges: [] });
    expect(buildRenderModel(graph({ nodes: [] }), OPTS)).toEqual({ nodes: [], edges: [] });
  });

  it("maps importance to a percentile rank (lowest→0, highest→1)", () => {
    const g = graph({
      nodes: [
        node("a", { importance: 0.1 }),
        node("b", { importance: 0.5 }),
        node("c", { importance: 0.9 }),
      ],
    });
    const model = buildRenderModel(g, OPTS);
    const byId = Object.fromEntries(model.nodes.map((n) => [n.id, n.importance]));
    expect(byId.a).toBeCloseTo(0);
    expect(byId.b).toBeCloseTo(0.5);
    expect(byId.c).toBeCloseTo(1);
  });

  it("flags stale (valid_to set) and self nodes; resolves a label", () => {
    const g = graph({
      nodes: [
        node("me", { key: "user:me", display_label: "You" }),
        node("old", { valid_to: 123, summary: "archived fact" }),
      ],
    });
    const model = buildRenderModel(g, { ...OPTS, selfKey: "user:me" });
    const me = model.nodes.find((n) => n.id === "me");
    const old = model.nodes.find((n) => n.id === "old");
    expect(me?.isSelf).toBe(true);
    expect(me?.label).toBe("You");
    expect(old?.stale).toBe(true);
    expect(old?.isSelf).toBe(false);
  });

  it("drops semantic edges below the threshold but keeps strong + non-semantic ones", () => {
    const g = graph({
      nodes: [node("a"), node("b"), node("c")],
      edges: [
        { type: "semantic", source: "a", target: "b", weight: 0.6 }, // below 0.85 → dropped
        { type: "semantic", source: "a", target: "c", weight: 0.95 }, // kept
        { type: "session", source: "b", target: "c" }, // non-semantic → kept
      ] as BrainGraphResponse["edges"],
    });
    const model = buildRenderModel(g, OPTS);
    expect(model.edges).toHaveLength(2);
    expect(model.edges.every((e) => !(e.type === "semantic" && e.relevance < 0))).toBe(true);
  });

  it("drops edges whose endpoints are not in the node set", () => {
    const g = graph({
      nodes: [node("a"), node("b")],
      edges: [
        { type: "session", source: "a", target: "ghost" },
        { type: "session", source: "a", target: "b" },
      ] as BrainGraphResponse["edges"],
    });
    const model = buildRenderModel(g, OPTS);
    expect(model.edges).toHaveLength(1);
    expect(model.edges[0]?.target).toBe("b");
  });
});

describe("color-by dimensions", () => {
  it("colors by status (live vs archived)", () => {
    const g = graph({ nodes: [node("live"), node("old", { valid_to: 123 })] });
    const model = buildRenderModel(g, { ...OPTS, colorPreset: "status" });
    const live = model.nodes.find((n) => n.id === "live");
    const old = model.nodes.find((n) => n.id === "old");
    expect(live?.color).toBe("#b8b2a9"); // STATUS_COLOR.live
    expect(old?.color).toBe("#57534e"); // STATUS_COLOR.archived
  });

  it("colors by recency (recent = accent, old = muted)", () => {
    const g = graph({
      nodes: [node("fresh", { created_at: Date.now() }), node("ancient", { created_at: 0 })],
    });
    const model = buildRenderModel(g, { ...OPTS, colorPreset: "recency" });
    expect(model.nodes.find((n) => n.id === "fresh")?.color).toBe("#d24430"); // week → accent
    expect(model.nodes.find((n) => n.id === "ancient")?.color).toBe("#8a857d"); // older → muted
  });
});

describe("cluster overview (clusters-first)", () => {
  it("round-trips a cluster node id", () => {
    expect(parseClusterNodeId(clusterNodeId(42))).toBe(42);
    expect(parseClusterNodeId("not-a-cluster")).toBeNull();
    expect(parseClusterNodeId("cluster:NaNish")).toBeNull();
  });

  it("returns an empty model when there are no communities", () => {
    expect(buildClusterOverviewModel(undefined)).toEqual({ nodes: [], edges: [] });
    expect(buildClusterOverviewModel([])).toEqual({ nodes: [], edges: [] });
  });

  it("prefers LLM-named themes over larger fallback clusters", () => {
    const model = buildClusterOverviewModel(
      [
        community(1, 99), // big but unnamed
        community(2, 4, { name: "Orlando Travel", name_source: "llm" }),
        community(3, 50), // unnamed
      ],
      2,
    );
    const labels = model.nodes.map((n) => n.label);
    expect(labels[0]).toBe("Orlando Travel"); // named leads despite smaller count
    expect(model.nodes).toHaveLength(2);
    // the named one drilled-back resolves to its community id
    expect(parseClusterNodeId(model.nodes[0]!.id)).toBe(2);
  });

  it("excludes zero-size clusters and internal codenames", () => {
    const model = buildClusterOverviewModel([
      community(1, 0, { name: "Empty", name_source: "llm" }),
      community(2, 5, { name: "Nullalis internals", name_source: "llm" }),
      community(3, 5, { name: "Travel", name_source: "llm" }),
    ]);
    expect(model.nodes.map((n) => n.label)).toEqual(["Travel"]);
  });

  it("sizes hubs by member count (largest shown = max importance)", () => {
    const model = buildClusterOverviewModel([
      community(1, 20, { name: "Big", name_source: "llm" }),
      community(2, 5, { name: "Small", name_source: "llm" }),
    ]);
    const big = model.nodes.find((n) => n.label === "Big");
    const small = model.nodes.find((n) => n.label === "Small");
    expect(big!.importance).toBeGreaterThan(small!.importance);
    expect(big!.importance).toBeCloseTo(1);
  });
});

describe("filterGraphByCommunity", () => {
  it("keeps only that community's members and their internal edges", () => {
    const g = graph({
      nodes: [
        node("a", { community_id: 1 }),
        node("b", { community_id: 1 }),
        node("c", { community_id: 2 }),
      ],
      edges: [
        { type: "session", source: "a", target: "b" }, // within community 1 → kept
        { type: "session", source: "a", target: "c" }, // crosses → dropped
      ] as BrainGraphResponse["edges"],
    });
    const filtered = filterGraphByCommunity(g, 1);
    expect(filtered?.nodes.map((n) => n.id)).toEqual(["a", "b"]);
    expect(filtered?.edges).toHaveLength(1);
  });
});
