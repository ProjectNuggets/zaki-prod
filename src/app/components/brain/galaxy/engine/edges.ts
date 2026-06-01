import {
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  LineBasicMaterial,
  LineSegments,
} from "three";
import { readCssColor } from "./scene";
import type { RenderModel } from "./interface";
import type { SimNode } from "./forces";

export interface EdgeLines {
  lines: LineSegments;
  /** Copy live endpoint positions into the line buffer. */
  sync(nodeById: Map<string, SimNode>): void;
  dispose(): void;
}

// P1 edges are straight 1px segments (one buffer, one draw call). P2 upgrades
// these to curved Bézier "filaments" with per-type styling.
export function createEdgeLines(model: RenderModel): EdgeLines {
  const edges = model.edges;
  const positions = new Float32Array(edges.length * 6);
  const geometry = new BufferGeometry();
  const attribute = new BufferAttribute(positions, 3);
  attribute.setUsage(DynamicDrawUsage); // positions update every tick.
  geometry.setAttribute("position", attribute);

  const { color, alpha } = readCssColor("--g-edge", "rgba(180,176,170,0.18)");
  const material = new LineBasicMaterial({ color, transparent: true, opacity: alpha });
  const lines = new LineSegments(geometry, material);
  lines.frustumCulled = false;

  function sync(nodeById: Map<string, SimNode>): void {
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      if (!edge) continue;
      const s = nodeById.get(edge.source);
      const t = nodeById.get(edge.target);
      const o = i * 6;
      positions[o] = s?.x ?? 0;
      positions[o + 1] = s?.y ?? 0;
      positions[o + 2] = s?.z ?? 0;
      positions[o + 3] = t?.x ?? 0;
      positions[o + 4] = t?.y ?? 0;
      positions[o + 5] = t?.z ?? 0;
    }
    attribute.needsUpdate = true;
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
