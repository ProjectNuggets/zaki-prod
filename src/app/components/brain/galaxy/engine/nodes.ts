import {
  AdditiveBlending,
  Color,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  SphereGeometry,
} from "three";
import { importanceToRadius } from "../../brainColors";
import type { RenderModel } from "./interface";
import type { SimNode } from "./forces";

export interface NodeField {
  mesh: InstancedMesh;
  /** Copy live simulation positions into the instance matrices. */
  sync(nodes: SimNode[]): void;
  /** Map a raycast instanceId back to a node id. */
  nodeIdAt(instanceId: number): string | undefined;
  dispose(): void;
}

// One InstancedMesh draws every node in a single GPU draw call regardless of
// corpus size. Radius is the ported importance→radius mapping; per-instance
// color is the resolved preset color. (Per-node opacity + bloom land in P2.)
export function createNodeField(model: RenderModel): NodeField {
  const count = model.nodes.length;
  const geometry = new SphereGeometry(1, 12, 12);
  // Additive blending over the dark canvas so dense clusters self-brighten into
  // hot cores (amplified by the bloom pass). depthWrite off keeps overlaps from
  // z-fighting; additive is order-independent so that's safe.
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
  const radii = model.nodes.map((n) => importanceToRadius(n.importance));

  const scratch = new Color();
  model.nodes.forEach((n, i) => {
    mesh.setColorAt(i, scratch.set(n.color));
  });
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  const matrix = new Matrix4();

  function sync(simNodes: SimNode[]): void {
    for (let i = 0; i < count; i++) {
      const node = simNodes[i];
      if (!node) continue;
      const r = radii[i] ?? 6;
      matrix.makeScale(r, r, r);
      matrix.setPosition(node.x ?? 0, node.y ?? 0, node.z ?? 0);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  return {
    mesh,
    sync,
    nodeIdAt: (instanceId) => ids[instanceId],
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
