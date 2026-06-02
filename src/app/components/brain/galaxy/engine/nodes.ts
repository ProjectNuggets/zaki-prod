import {
  AdditiveBlending,
  Color,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  SphereGeometry,
} from "three";
import { importanceToRadius } from "../../brainColors";
import { readCssColor } from "./scene";
import type { RenderModel } from "./interface";
import type { SimNode } from "./forces";

export interface VisualState {
  focusId: string | null;
  /** Ids within the focus seed-and-expand radius (includes the focus node). */
  nearSet: Set<string> | null;
  /** Ids to glow (time scrubber). */
  highlightSet: Set<string> | null;
  /** Search matches; non-matches dim. null = no active search. */
  searchSet: Set<string> | null;
  /** Hover neighborhood (incl. hovered) — dims the rest when no focus is set. */
  hoverNearSet: Set<string> | null;
}

export interface NodeField {
  mesh: InstancedMesh;
  /** Copy live simulation positions (× per-node focus scale) into instances. */
  sync(nodes: SimNode[]): void;
  /** Recolor + rescale instances for focus / time / search state. */
  setVisualState(state: VisualState): void;
  nodeIdAt(instanceId: number): string | undefined;
  dispose(): void;
}

const DIM_FAR = 0.16; // non-neighbors when a node is focused
const DIM_UNMATCHED = 0.1; // non-matches during search
const FOCUS_SCALE = 1.9;
const GLOW_SCALE = 1.3;
// Dimmed nodes also shrink — additive blending saturates dense clusters, so
// color dimming alone is invisible where nodes overlap; reducing area reads.
const DIM_FAR_SCALE = 0.5;
const DIM_UNMATCHED_SCALE = 0.4;

// One InstancedMesh draws every node in a single GPU draw call. Base color is
// the resolved preset color; base radius is the ported importance→radius. The
// focus/time/search visual state recolors + rescales instances in place (no
// rebuild) so highlighting is cheap.
export function createNodeField(model: RenderModel): NodeField {
  const count = model.nodes.length;
  const geometry = new SphereGeometry(1, 12, 12);
  const material = new MeshBasicMaterial({
    transparent: true,
    opacity: 0.95,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const mesh = new InstancedMesh(geometry, material, Math.max(1, count));
  mesh.count = count;
  mesh.frustumCulled = false;

  const ids = model.nodes.map((n) => n.id);
  const baseColors = model.nodes.map((n) => new Color(n.color));
  const baseRadii = model.nodes.map((n) => importanceToRadius(n.importance));
  const scaleMul = new Float32Array(count).fill(1);
  const accent = readCssColor("--g-ember", "rgba(210,68,48,1)").color;

  // Initial colors = base.
  baseColors.forEach((c, i) => mesh.setColorAt(i, c));
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  const matrix = new Matrix4();
  const scratch = new Color();

  function sync(simNodes: SimNode[]): void {
    for (let i = 0; i < count; i++) {
      const node = simNodes[i];
      if (!node) continue;
      const r = (baseRadii[i] ?? 6) * (scaleMul[i] ?? 1);
      matrix.makeScale(r, r, r);
      matrix.setPosition(node.x ?? 0, node.y ?? 0, node.z ?? 0);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  function setVisualState(state: VisualState): void {
    const { focusId, nearSet, highlightSet, searchSet, hoverNearSet } = state;
    for (let i = 0; i < count; i++) {
      const id = ids[i];
      if (id === undefined) continue;
      const base = baseColors[i] ?? accent;
      scratch.copy(base);
      let scale = 1;

      const matched = !searchSet || searchSet.has(id);
      if (!matched) {
        scratch.multiplyScalar(DIM_UNMATCHED);
        scale = DIM_UNMATCHED_SCALE;
      } else if (focusId) {
        if (id === focusId) {
          scratch.copy(accent);
          scale = FOCUS_SCALE;
        } else if (nearSet && nearSet.has(id)) {
          // keep base
        } else {
          scratch.multiplyScalar(DIM_FAR);
          scale = DIM_FAR_SCALE;
        }
      } else if (hoverNearSet && !hoverNearSet.has(id)) {
        // Hover-to-highlight (no focus set): dim everything outside the hovered
        // node's neighborhood.
        scratch.multiplyScalar(DIM_FAR);
        scale = DIM_FAR_SCALE;
      }

      if (highlightSet && highlightSet.has(id)) {
        scratch.lerp(accent, 0.6);
        scale = Math.max(scale, GLOW_SCALE);
      }

      mesh.setColorAt(i, scratch);
      scaleMul[i] = scale;
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  return {
    mesh,
    sync,
    setVisualState,
    nodeIdAt: (instanceId) => ids[instanceId],
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
