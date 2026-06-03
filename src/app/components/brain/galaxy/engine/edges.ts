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
  /** Light edges incident to `activeId` in accent + dim the rest. null = reset. */
  setHighlight(activeId: string | null): void;
  dispose(): void;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

// Curved Bézier "filaments": each edge bows perpendicular to its chord, sampled
// into `segments` straight pieces (LOD lowers this for big graphs). Per-vertex
// color comes from the ink ramp — typed edges read brighter, and intensity
// scales with relevance — kept monochrome (BRAND_LAW: accent is reserved for
// the focus threads in P3). Additive so dense bundles glow under bloom.
// Bow apex offset perpendicular to the chord, as a fraction of the edge length.
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
  const accent = readCssColor("--g-ember", "rgba(210,68,48,1)").color;

  const tmp = new Color();
  function writeEdge(i: number, c: Color): void {
    const start = i * vertsPerEdge * 3;
    for (let v = 0; v < vertsPerEdge; v++) {
      colors[start + v * 3] = c.r;
      colors[start + v * 3 + 1] = c.g;
      colors[start + v * 3 + 2] = c.b;
    }
  }
  // Color each edge: incident to the active node → accent (bright); when a node
  // is active, the rest dim hard; otherwise the base ink ramp by type/relevance.
  function fillColors(activeId: string | null): void {
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      if (!edge) continue;
      const incident = activeId != null && (edge.source === activeId || edge.target === activeId);
      if (incident) {
        writeEdge(i, accent);
        continue;
      }
      const src = edge.type === "typed" ? strong : base;
      const intensity = 0.4 + 0.6 * clamp01(edge.relevance);
      tmp.copy(src).multiplyScalar(activeId != null ? intensity * 0.18 : intensity);
      writeEdge(i, tmp);
    }
  }
  fillColors(null);

  const geometry = new BufferGeometry();
  const posAttr = new BufferAttribute(positions, 3);
  posAttr.setUsage(DynamicDrawUsage);
  geometry.setAttribute("position", posAttr);
  const colorAttr = new BufferAttribute(colors, 3);
  geometry.setAttribute("color", colorAttr);

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
      const base = i * vertsPerEdge * 3;
      if (len < 1e-6) {
        // Degenerate (self-loop / coincident endpoints): collapse to a point so
        // normalize() can't emit NaN and poison the buffer.
        for (let v = 0; v < vertsPerEdge; v++) {
          positions[base + v * 3] = a.x;
          positions[base + v * 3 + 1] = a.y;
          positions[base + v * 3 + 2] = a.z;
        }
        continue;
      }
      mid.copy(a).add(b).multiplyScalar(0.5);
      // Perpendicular in a stable plane; fall back if the chord is ~parallel.
      perp.copy(dir).cross(up);
      if (perp.lengthSq() < 1e-6) perp.copy(dir).cross(altUp);
      perp.normalize().multiplyScalar(len * BOW);
      ctrl.copy(mid).add(perp);

      for (let seg = 0; seg < segs; seg++) {
        pointAt(seg / segs, p0);
        pointAt((seg + 1) / segs, p1);
        const o = base + seg * 6;
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
    setHighlight(activeId: string | null) {
      fillColors(activeId);
      colorAttr.needsUpdate = true;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
