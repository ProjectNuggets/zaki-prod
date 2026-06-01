import { Group, Raycaster, Vector2 } from "three";
import { createScene } from "./scene";
import { createSimulation, type GraphSimulation, type SimNode } from "./forces";
import { createNodeField, type NodeField } from "./nodes";
import { createEdgeLines, type EdgeLines } from "./edges";
import { createBloomComposer, type BloomComposer } from "./bloom";
import { createNebula, type Nebula } from "./nebula";
import { edgeSegmentsForCount } from "./lod";
import type { GraphRenderer, GraphRendererOptions, RenderModel, RenderQuality } from "./interface";

const ALPHA_MIN = 0.02;
const INITIAL_ALPHA = 1;
const TWO_PI = Math.PI * 2;
const BREATHE_PERIOD_S = 14;

// WebGL implementation of GraphRenderer. Owns the scene, the d3-force-3d
// simulation, the instanced node field + filament edges, the bloom composer,
// and the FBM nebula. Runs a settle-then-(idle-breathe | stop) rAF loop and
// translates pointer events into hover/select. Visual richness is gated by
// options.quality (set by the LOD tier), so it scales down on large corpora and
// honors prefers-reduced-motion.
export function createGalaxyEngine(
  canvas: HTMLCanvasElement,
  initialOptions: GraphRendererOptions,
): GraphRenderer {
  const sceneBundle = createScene(canvas);
  if (!sceneBundle) return createNoopRenderer();
  const { renderer, scene, camera } = sceneBundle;

  const graphGroup = new Group();
  scene.add(graphGroup);

  let options = initialOptions;
  let model: RenderModel = { nodes: [], edges: [] };
  let graphSim: GraphSimulation | null = null;
  let nodeField: NodeField | null = null;
  let edgeLines: EdgeLines | null = null;
  let composer: BloomComposer | null = null;
  let nebula: Nebula | null = null;
  let nodeById = new Map<string, SimNode>();
  let raf = 0;
  let settled = false;
  // Seed from the canvas's current client size so the bloom composer is created
  // at the right resolution even if resize() hasn't fired yet (avoids a 1×1
  // first frame).
  let width = Math.max(1, canvas.clientWidth || 1);
  let height = Math.max(1, canvas.clientHeight || 1);
  const startTime = nowMs();

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  let hovered: string | null = null;

  function renderFrame(): void {
    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  function disposeFx(): void {
    if (composer) {
      composer.dispose();
      composer = null;
    }
    if (nebula) {
      scene.remove(nebula.mesh);
      nebula.dispose();
      nebula = null;
    }
  }

  function clearGraph(): void {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    settled = false;
    if (nodeField) {
      graphGroup.remove(nodeField.mesh);
      nodeField.dispose();
      nodeField = null;
    }
    if (edgeLines) {
      graphGroup.remove(edgeLines.lines);
      edgeLines.dispose();
      edgeLines = null;
    }
    if (graphSim) {
      graphSim.sim.stop();
      graphSim = null;
    }
    disposeFx();
    graphGroup.rotation.set(0, 0, 0);
    graphGroup.scale.setScalar(1);
    nodeById = new Map();
    hovered = null;
    renderer.domElement.style.cursor = "default";
  }

  function rebuild(): void {
    clearGraph();
    if (model.nodes.length === 0) {
      renderFrame();
      return;
    }
    graphSim = createSimulation(model);
    graphSim.sim.alpha(INITIAL_ALPHA);
    nodeById = new Map(graphSim.nodes.map((n) => [n.id, n]));
    edgeLines = createEdgeLines(model, edgeSegmentsForCount(model.nodes.length));
    nodeField = createNodeField(model);
    graphGroup.add(edgeLines.lines);
    graphGroup.add(nodeField.mesh);
    if (options.quality.nebula) {
      nebula = createNebula();
      scene.add(nebula.mesh);
    }
    if (options.quality.bloom) {
      composer = createBloomComposer(renderer, scene, camera, width, height);
    }
    startLoop();
  }

  function syncPositions(): void {
    if (!graphSim) return;
    nodeField?.sync(graphSim.nodes);
    edgeLines?.sync(nodeById);
  }

  // React to a quality change without tearing down the graph/sim: add or dispose
  // the bloom composer and nebula, and restart the idle loop if motion/nebula
  // just turned on. Used by setOptions so the P4 display-panel toggles work and
  // toggling never leaks a composer.
  function applyQuality(): void {
    if (model.nodes.length === 0) return;
    if (options.quality.bloom && !composer) {
      composer = createBloomComposer(renderer, scene, camera, width, height);
    } else if (!options.quality.bloom && composer) {
      composer.dispose();
      composer = null;
    }
    if (options.quality.nebula && !nebula) {
      nebula = createNebula();
      scene.add(nebula.mesh);
    } else if (!options.quality.nebula && nebula) {
      scene.remove(nebula.mesh);
      nebula.dispose();
      nebula = null;
    }
    if (settled && raf === 0 && (options.quality.motion || options.quality.nebula)) {
      startLoop();
    } else {
      renderFrame();
    }
  }

  function startLoop(): void {
    if (raf) cancelAnimationFrame(raf);
    const loop = () => {
      if (!graphSim) {
        raf = 0;
        return;
      }
      const tSec = (nowMs() - startTime) / 1000;

      if (!settled && graphSim.sim.alpha() > ALPHA_MIN) {
        graphSim.sim.tick();
        syncPositions();
      } else if (!settled) {
        settled = true;
        syncPositions();
        fit();
      }

      if (settled && options.quality.motion) {
        const phase = Math.sin((tSec * TWO_PI) / BREATHE_PERIOD_S);
        graphGroup.scale.setScalar(1 + 0.006 * phase);
        graphGroup.rotation.y = 0.0032 * phase;
      }
      if (options.quality.nebula) nebula?.update(tSec);

      renderFrame();

      if (!settled || options.quality.motion || options.quality.nebula) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = 0;
      }
    };
    raf = requestAnimationFrame(loop);
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
      const prevQuality = options.quality;
      options = { ...options, ...next };
      if (next.quality && qualityChanged(prevQuality, options.quality)) {
        applyQuality();
      }
    },
    resize(w: number, h: number) {
      if (w === 0 || h === 0) return;
      width = w;
      height = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      composer?.setSize(w, h);
      renderFrame();
    },
    fit() {
      fit();
      renderFrame();
    },
    relayout() {
      if (!graphSim) return;
      settled = false;
      graphSim.sim.alpha(INITIAL_ALPHA);
      startLoop();
    },
    dispose() {
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("click", onClick);
      clearGraph();
      sceneBundle.dispose();
    },
  };
}

function qualityChanged(a: RenderQuality, b: RenderQuality): boolean {
  return (
    a.bloom !== b.bloom ||
    a.nebula !== b.nebula ||
    a.motion !== b.motion ||
    a.threads !== b.threads
  );
}

function nowMs(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : 0;
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
