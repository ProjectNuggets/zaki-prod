import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  LineBasicMaterial,
  LineSegments,
  Vector3,
} from "three";
import { readCssColor } from "./scene";
import type { RenderModel } from "./interface";
import type { SimNode } from "./forces";

export interface EdgeLines {
  lines: LineSegments;
  /** Recompute curved endpoint positions from live node positions. */
  sync(nodeById: Map<string, SimNode>): void;
  dispose(): void;
}

// Curved Bézier "filaments": each edge bows perpendicular to its chord, sampled
// into `segments` straight pieces (LOD lowers this for big graphs). Per-vertex
// color comes from the ink ramp — typed edges read brighter, and intensity
// scales with relevance — kept monochrome (BRAND_LAW: accent is reserved for
// the focus threads in P3). Additive so dense bundles glow under bloom.
const BOW = 0.18;

export function createEdgeLines(model: RenderModel, segments: number): EdgeLines {
  const edges = model.edges;
  const segs = Math.max(1, Math.floor(segments));
  const vertsPerEdge = segs * 2;
  const total = edges.length * vertsPerEdge;

  const positions = new Float32Array(total * 3);
  const colors = new Float32Array(total * 3);

  const base = readCssColor("--g-edge", "rgba(180,176,170,0.18)").color;
  const strong = readCssColor("--g-edge-strong", "rgba(180,176,170,0.34)").color;

  // Per-vertex colors are static (positions animate, colors don't) — fill once.
  const tmp = new Color();
  edges.forEach((edge, i) => {
    const src = edge.type === "typed" ? strong : base;
    const intensity = 0.4 + 0.6 * Math.max(0, Math.min(1, edge.relevance));
    tmp.copy(src).multiplyScalar(intensity);
    const start = i * vertsPerEdge * 3;
    for (let v = 0; v < vertsPerEdge; v++) {
      colors[start + v * 3] = tmp.r;
      colors[start + v * 3 + 1] = tmp.g;
      colors[start + v * 3 + 2] = tmp.b;
    }
  });

  const geometry = new BufferGeometry();
  const posAttr = new BufferAttribute(positions, 3);
  posAttr.setUsage(DynamicDrawUsage);
  geometry.setAttribute("position", posAttr);
  geometry.setAttribute("color", new BufferAttribute(colors, 3));

  const material = new LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const lines = new LineSegments(geometry, material);
  lines.frustumCulled = false;

  // Scratch vectors reused across the hot loop.
  const a = new Vector3();
  const b = new Vector3();
  const mid = new Vector3();
  const dir = new Vector3();
  const perp = new Vector3();
  const ctrl = new Vector3();
  const p0 = new Vector3();
  const p1 = new Vector3();
  const up = new Vector3(0, 1, 0);
  const altUp = new Vector3(1, 0, 0);

  function pointAt(t: number, out: Vector3): void {
    // Quadratic Bézier: (1-t)^2 a + 2(1-t)t ctrl + t^2 b
    const u = 1 - t;
    out.set(0, 0, 0)
      .addScaledVector(a, u * u)
      .addScaledVector(ctrl, 2 * u * t)
      .addScaledVector(b, t * t);
  }

  function sync(nodeById: Map<string, SimNode>): void {
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      if (!edge) continue;
      const s = nodeById.get(edge.source);
      const t = nodeById.get(edge.target);
      a.set(s?.x ?? 0, s?.y ?? 0, s?.z ?? 0);
      b.set(t?.x ?? 0, t?.y ?? 0, t?.z ?? 0);
      dir.copy(b).sub(a);
      const len = dir.length();
      const base0 = i * vertsPerEdge * 3;
      if (len < 1e-6) {
        // Degenerate (self-loop / coincident endpoints): collapse to a point so
        // normalize() can't emit NaN and poison the buffer.
        for (let v = 0; v < vertsPerEdge; v++) {
          positions[base0 + v * 3] = a.x;
          positions[base0 + v * 3 + 1] = a.y;
          positions[base0 + v * 3 + 2] = a.z;
        }
        continue;
      }
      mid.copy(a).add(b).multiplyScalar(0.5);
      // Perpendicular in a stable plane; fall back if the chord is ~parallel.
      perp.copy(dir).cross(up);
      if (perp.lengthSq() < 1e-6) perp.copy(dir).cross(altUp);
      perp.normalize().multiplyScalar(len * BOW);
      ctrl.copy(mid).add(perp);

      const base3 = i * vertsPerEdge * 3;
      for (let seg = 0; seg < segs; seg++) {
        pointAt(seg / segs, p0);
        pointAt((seg + 1) / segs, p1);
        const o = base3 + seg * 6;
        positions[o] = p0.x;
        positions[o + 1] = p0.y;
        positions[o + 2] = p0.z;
        positions[o + 3] = p1.x;
        positions[o + 4] = p1.y;
        positions[o + 5] = p1.z;
      }
    }
    posAttr.needsUpdate = true;
  }

  return {
    lines,
    sync,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
