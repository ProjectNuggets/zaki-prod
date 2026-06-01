import { Raycaster, Vector2 } from "three";
import { createScene } from "./scene";
import { createSimulation, type GraphSimulation, type SimNode } from "./forces";
import { createNodeField, type NodeField } from "./nodes";
import { createEdgeLines, type EdgeLines } from "./edges";
import type { GraphRenderer, GraphRendererOptions, RenderModel } from "./interface";

const ALPHA_MIN = 0.02;
const INITIAL_ALPHA = 1;

// WebGL implementation of the GraphRenderer contract: owns the scene, the
// d3-force-3d simulation, the instanced node field, and edge lines; drives a
// settle-then-idle rAF loop; and translates pointer events into hover/select
// callbacks. Conforms to the engine-agnostic interface so a WebGPU variant can
// replace it later without touching React.
export function createGalaxyEngine(
  canvas: HTMLCanvasElement,
  initialOptions: GraphRendererOptions,
): GraphRenderer {
  const bundle = createScene(canvas);
  if (!bundle) return createNoopRenderer();
  const { renderer, scene, camera } = bundle;

  let options = initialOptions;
  let model: RenderModel = { nodes: [], edges: [] };
  let graphSim: GraphSimulation | null = null;
  let nodeField: NodeField | null = null;
  let edgeLines: EdgeLines | null = null;
  let nodeById = new Map<string, SimNode>();
  let raf = 0;

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  let hovered: string | null = null;

  function clearGraph(): void {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    if (nodeField) {
      scene.remove(nodeField.mesh);
      nodeField.dispose();
      nodeField = null;
    }
    if (edgeLines) {
      scene.remove(edgeLines.lines);
      edgeLines.dispose();
      edgeLines = null;
    }
    if (graphSim) {
      graphSim.sim.stop();
      graphSim = null;
    }
    nodeById = new Map();
    // Drop hover state: the rebuilt graph has different instances, so a
    // retained id would be stale until the pointer next moves.
    hovered = null;
    renderer.domElement.style.cursor = "default";
  }

  function rebuild(): void {
    clearGraph();
    if (model.nodes.length === 0) {
      renderer.render(scene, camera);
      return;
    }
    graphSim = createSimulation(model);
    graphSim.sim.alpha(INITIAL_ALPHA);
    nodeById = new Map(graphSim.nodes.map((n) => [n.id, n]));
    edgeLines = createEdgeLines(model);
    nodeField = createNodeField(model);
    scene.add(edgeLines.lines);
    scene.add(nodeField.mesh);
    startLoop();
  }

  function syncPositions(): void {
    if (graphSim) {
      nodeField?.sync(graphSim.nodes);
      edgeLines?.sync(nodeById);
    }
  }

  function startLoop(): void {
    if (raf) cancelAnimationFrame(raf);
    const frame = () => {
      if (!graphSim) {
        raf = 0;
        return;
      }
      if (graphSim.sim.alpha() > ALPHA_MIN) {
        graphSim.sim.tick();
        syncPositions();
        renderer.render(scene, camera);
        raf = requestAnimationFrame(frame);
      } else {
        // Settled: final sync + frame the graph, then idle (re-render only on
        // resize / relayout) to keep the GPU quiet.
        syncPositions();
        fit();
        renderer.render(scene, camera);
        raf = 0;
      }
    };
    raf = requestAnimationFrame(frame);
  }

  function fit(): void {
    if (!graphSim || graphSim.nodes.length === 0) return;
    const nodes = graphSim.nodes;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (const n of nodes) {
      cx += n.x ?? 0;
      cy += n.y ?? 0;
      cz += n.z ?? 0;
    }
    cx /= nodes.length;
    cy /= nodes.length;
    cz /= nodes.length;
    let maxDist = 1;
    for (const n of nodes) {
      const dx = (n.x ?? 0) - cx;
      const dy = (n.y ?? 0) - cy;
      const dz = (n.z ?? 0) - cz;
      maxDist = Math.max(maxDist, Math.hypot(dx, dy, dz));
    }
    const fovRad = (camera.fov * Math.PI) / 180;
    const dist = (maxDist * 1.3) / Math.tan(fovRad / 2) + 80;
    camera.position.set(cx, cy, cz + dist);
    camera.lookAt(cx, cy, cz);
    camera.updateProjectionMatrix();
  }

  // --- Picking ---------------------------------------------------------------
  function pickAt(clientX: number, clientY: number): string | null {
    if (!nodeField) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(nodeField.mesh, false);
    const hit = hits[0];
    if (hit && typeof hit.instanceId === "number") {
      return nodeField.nodeIdAt(hit.instanceId) ?? null;
    }
    return null;
  }

  const onPointerMove = (event: PointerEvent) => {
    const id = pickAt(event.clientX, event.clientY);
    if (id !== hovered) {
      hovered = id;
      renderer.domElement.style.cursor = id ? "pointer" : "default";
      options.onHover?.(id);
    }
  };

  const onClick = (event: MouseEvent) => {
    const id = pickAt(event.clientX, event.clientY);
    if (id) options.onSelect?.(id, event.shiftKey);
  };

  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("click", onClick);

  return {
    setModel(next: RenderModel) {
      model = next;
      rebuild();
    },
    setOptions(next: Partial<GraphRendererOptions>) {
      options = { ...options, ...next };
    },
    resize(width: number, height: number) {
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    },
    fit() {
      fit();
      renderer.render(scene, camera);
    },
    relayout() {
      if (!graphSim) return;
      graphSim.sim.alpha(INITIAL_ALPHA);
      startLoop();
    },
    dispose() {
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("click", onClick);
      clearGraph();
      bundle.dispose();
    },
  };
}

function createNoopRenderer(): GraphRenderer {
  return {
    setModel() {},
    setOptions() {},
    resize() {},
    fit() {},
    relayout() {},
    dispose() {},
  };
}
