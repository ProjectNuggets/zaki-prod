import { describe, expect, it } from "@jest/globals";
import type { BrainGraphResponse } from "@/lib/api";
import { buildRenderModel } from "./model";

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
