import { describe, expect, it } from "@jest/globals";
import { buildAdjacency, computeNear, computeFitView, screenToNdc } from "./spatial";

describe("buildAdjacency", () => {
  it("builds an undirected adjacency list", () => {
    const adj = buildAdjacency([
      { source: "a", target: "b" },
      { source: "b", target: "c" },
    ]);
    expect(adj.get("a")).toEqual(["b"]);
    expect(adj.get("b")?.sort()).toEqual(["a", "c"]);
    expect(adj.get("c")).toEqual(["b"]);
  });

  it("returns an empty map for no edges", () => {
    expect(buildAdjacency([]).size).toBe(0);
  });
});

describe("computeNear (focus BFS)", () => {
  // a — b — c — d   (plus an isolated node e)
  const adj = buildAdjacency([
    { source: "a", target: "b" },
    { source: "b", target: "c" },
    { source: "c", target: "d" },
  ]);

  it("depth 1 returns the node and its direct neighbours", () => {
    expect([...computeNear(adj, "b", 1)].sort()).toEqual(["a", "b", "c"]);
  });

  it("depth 2 expands one more hop", () => {
    expect([...computeNear(adj, "a", 2)].sort()).toEqual(["a", "b", "c"]);
  });

  it("always includes the focus node, even with no neighbours", () => {
    expect([...computeNear(adj, "e", 3)]).toEqual(["e"]);
  });

  it("stops early when the frontier is exhausted (depth > diameter)", () => {
    expect([...computeNear(adj, "a", 99)].sort()).toEqual(["a", "b", "c", "d"]);
  });
});

describe("screenToNdc", () => {
  const rect = { left: 100, top: 50, width: 800, height: 400 };

  it("maps the rect centre to the origin", () => {
    expect(screenToNdc(500, 250, rect)).toEqual({ x: 0, y: 0 });
  });

  it("maps the top-left corner to (-1, 1) and bottom-right to (1, -1)", () => {
    expect(screenToNdc(100, 50, rect)).toEqual({ x: -1, y: 1 });
    expect(screenToNdc(900, 450, rect)).toEqual({ x: 1, y: -1 });
  });
});

describe("computeFitView", () => {
  it("returns null for no points", () => {
    expect(computeFitView([], 50)).toBeNull();
  });

  it("centres on the centroid", () => {
    const v = computeFitView(
      [
        { x: -10, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
        { x: 0, y: 6, z: 0 },
      ],
      50,
    );
    expect(v?.cx).toBeCloseTo(0);
    expect(v?.cy).toBeCloseTo(2);
    expect(v?.cz).toBeCloseTo(0);
  });

  it("pulls the camera further back as the cloud grows (the framing fix)", () => {
    const near = computeFitView([{ x: -5 }, { x: 5 }], 50)!;
    const far = computeFitView([{ x: -500 }, { x: 500 }], 50)!;
    expect(far.distance).toBeGreaterThan(near.distance);
  });

  it("keeps a minimum standoff for a single point", () => {
    const v = computeFitView([{ x: 0, y: 0, z: 0 }], 50)!;
    expect(v.distance).toBeGreaterThan(0);
  });
});
