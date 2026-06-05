// Pure, three-free geometry + graph helpers extracted from galaxyEngine so they
// can be unit-tested. The engine module imports `three` (WebGL), which Jest
// can't transform, so the testable logic lives here with zero dependencies.
//
// These cover the engine's most bug-prone math: neighbour BFS (focus depth),
// pointer→NDC (picking), and the fit/framing camera solve.

/** A point with optional coordinates (matches d3-force-3d sim nodes). */
export interface Pt {
  x?: number;
  y?: number;
  z?: number;
}

/** Undirected adjacency list for seed-and-expand focus BFS. */
export function buildAdjacency(
  edges: ReadonlyArray<{ source: string; target: string }>,
): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  const push = (from: string, to: string) => {
    const list = adj.get(from);
    if (list) list.push(to);
    else adj.set(from, [to]);
  };
  for (const e of edges) {
    push(e.source, e.target);
    push(e.target, e.source);
  }
  return adj;
}

/** BFS from `focusId` out to `depth` hops, inclusive of the focus node itself. */
export function computeNear(
  adjacency: Map<string, string[]>,
  focusId: string,
  depth: number,
): Set<string> {
  const near = new Set<string>([focusId]);
  let frontier = [focusId];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const nb of adjacency.get(id) ?? []) {
        if (!near.has(nb)) {
          near.add(nb);
          next.push(nb);
        }
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
  }
  return near;
}

export interface Rectish {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Pointer client coordinates → normalized device coordinates in [-1, 1].
 * This is the half of picking that's pure math (the raycast itself needs three).
 * A regression here is what made cluster hubs unclickable, so it's worth a guard.
 */
export function screenToNdc(clientX: number, clientY: number, rect: Rectish): { x: number; y: number } {
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -((clientY - rect.top) / rect.height) * 2 + 1,
  };
}

export interface FitView {
  cx: number;
  cy: number;
  cz: number;
  /** Distance to pull the camera back along +z from the centroid. */
  distance: number;
}

/**
 * Camera framing solve: the centroid of all points plus the dolly distance that
 * fits the furthest point for a given vertical FOV (degrees). Returns plain
 * numbers; the engine applies them to the three camera/controls.
 */
export function computeFitView(points: ReadonlyArray<Pt>, fovDeg: number): FitView | null {
  if (points.length === 0) return null;
  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (const p of points) {
    cx += p.x ?? 0;
    cy += p.y ?? 0;
    cz += p.z ?? 0;
  }
  cx /= points.length;
  cy /= points.length;
  cz /= points.length;

  let maxDist = 1;
  for (const p of points) {
    const dx = (p.x ?? 0) - cx;
    const dy = (p.y ?? 0) - cy;
    const dz = (p.z ?? 0) - cz;
    maxDist = Math.max(maxDist, Math.hypot(dx, dy, dz));
  }

  const fovRad = (fovDeg * Math.PI) / 180;
  const distance = (maxDist * 1.3) / Math.tan(fovRad / 2) + 80;
  return { cx, cy, cz, distance };
}
