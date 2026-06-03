import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineSegments,
  MOUSE,
  Raycaster,
  Vector2,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createScene, readCssColor } from "./scene";
import { createSimulation, type GraphSimulation, type SimNode } from "./forces";
import { createNodeField, type NodeField } from "./nodes";
import { createEdgeLines, type EdgeLines } from "./edges";
import { createBloomComposer, type BloomComposer } from "./bloom";
import { createNebula, type Nebula } from "./nebula";
import { edgeSegmentsForCount } from "./lod";
import { createLabelLayer, type LabelEntry, type LabelLayer } from "./labels";
import type { GraphRenderer, GraphRendererOptions, RenderModel, RenderQuality } from "./interface";

const ALPHA_MIN = 0.02;
const INITIAL_ALPHA = 1;
const TWO_PI = Math.PI * 2;
const BREATHE_PERIOD_S = 14;
const MAX_LABELS = 28;

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

  // Pan + zoom (Obsidian-style). Rotate off → 2.5D; a true-3D/orbit toggle
  // comes later. No damping so the idle loop can still stop; render on change
  // only when the animation loop isn't already running.
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableRotate = false;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.enableZoom = true;
  controls.zoomToCursor = true;
  controls.minDistance = 40;
  controls.maxDistance = 6000;
  // Rotate is off (2.5D), so rebind LEFT to PAN — otherwise left-drag does
  // nothing (OrbitControls' default LEFT is ROTATE, PAN is on RIGHT). Now
  // click-and-drag moves the graph; a plain left-click still selects via the
  // click-vs-drag guard.
  controls.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };
  const onControlsChange = () => {
    if (raf === 0) renderFrame();
  };
  controls.addEventListener("change", onControlsChange);

  let options = initialOptions;
  let model: RenderModel = { nodes: [], edges: [] };
  let graphSim: GraphSimulation | null = null;
  let nodeField: NodeField | null = null;
  let edgeLines: EdgeLines | null = null;
  let composer: BloomComposer | null = null;
  let nebula: Nebula | null = null;
  let nodeById = new Map<string, SimNode>();
  let adjacency = new Map<string, string[]>();
  let focusThreads: LineSegments | null = null;
  let labelLayer: LabelLayer | null = null;
  let labelTextById = new Map<string, string>();
  let topImportantIds: string[] = [];
  let currentNearSet: Set<string> | null = null;
  let lastFocusForThreads: string | null = null;
  let lastView = initialOptions.view;
  let highlightSig = "";
  let raf = 0;
  let settled = false;
  // Auto-fit the camera when the layout settles — but only on a COLD rebuild
  // (new graph / scope change). On a WARM rebuild (cutoff / max-nodes / color
  // tweak where the nodes mostly survive) we keep the user's camera + positions.
  let shouldFitOnSettle = true;
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
    if (labelLayer && options.quality.labels) labelLayer.render(chooseLabels(), camera);
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
    if (focusThreads) {
      graphGroup.remove(focusThreads);
      focusThreads.geometry.dispose();
      (focusThreads.material as LineBasicMaterial).dispose();
      focusThreads = null;
    }
    if (labelLayer) {
      graphGroup.remove(labelLayer.group);
      labelLayer.dispose();
      labelLayer = null;
    }
    labelTextById = new Map();
    topImportantIds = [];
    currentNearSet = null;
    lastFocusForThreads = null;
    disposeFx();
    graphGroup.rotation.set(0, 0, 0);
    graphGroup.scale.setScalar(1);
    nodeById = new Map();
    adjacency = new Map();
    highlightSig = "";
    hovered = null;
    renderer.domElement.style.cursor = "default";
  }

  function rebuild(): void {
    // Snapshot the outgoing layout so a warm restart can carry positions over.
    const prevPos = new Map<string, { x: number; y: number; z: number }>();
    if (graphSim) {
      for (const n of graphSim.nodes) prevPos.set(n.id, { x: n.x ?? 0, y: n.y ?? 0, z: n.z ?? 0 });
    }
    clearGraph();
    if (model.nodes.length === 0) {
      renderFrame();
      return;
    }
    graphSim = createSimulation(model);
    // Warm-start: when most nodes survive the change (cutoff / max-nodes / color
    // tweak), carry their positions so the layout MORPHS instead of restarting
    // from random, and re-settle gently. A cold rebuild (new graph / scope
    // change) starts fresh and re-fits the camera.
    let carried = 0;
    for (const n of graphSim.nodes) {
      const p = prevPos.get(n.id);
      if (p) {
        n.x = p.x;
        n.y = p.y;
        n.z = p.z;
        carried++;
      }
    }
    const warm = carried > 0 && carried >= graphSim.nodes.length * 0.5;
    shouldFitOnSettle = !warm;
    graphSim.sim.alpha(warm ? 0.3 : INITIAL_ALPHA);
    if (options.view === "tactical") {
      for (const n of graphSim.nodes) n.fz = 0; // flatten to a plane
    }
    lastView = options.view;
    nodeById = new Map(graphSim.nodes.map((n) => [n.id, n]));
    adjacency = buildAdjacency(model);
    edgeLines = createEdgeLines(model, edgeSegmentsForCount(model.nodes.length));
    nodeField = createNodeField(model);
    nodeField.setSizeScale(options.nodeScale ?? 1);
    graphGroup.add(edgeLines.lines);
    graphGroup.add(nodeField.mesh);
    labelTextById = new Map(model.nodes.map((n) => [n.id, n.label]));
    topImportantIds = [...model.nodes]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 80)
      .map((n) => n.id);
    labelLayer = createLabelLayer(MAX_LABELS);
    labelLayer.setFadeScale(options.labelFade ?? 0.6);
    graphGroup.add(labelLayer.group);
    if (options.quality.nebula) {
      nebula = createNebula();
      scene.add(nebula.mesh);
    }
    if (options.quality.bloom) {
      composer = createBloomComposer(renderer, scene, camera, width, height);
    }
    applyHighlight();
    highlightSig = highlightSignature(options);
    startLoop();
  }

  // Undirected adjacency for seed-and-expand focus BFS.
  function buildAdjacency(m: RenderModel): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    const push = (from: string, to: string) => {
      const list = adj.get(from);
      if (list) list.push(to);
      else adj.set(from, [to]);
    };
    for (const e of m.edges) {
      push(e.source, e.target);
      push(e.target, e.source);
    }
    return adj;
  }

  function computeNear(focusId: string, depth: number): Set<string> {
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

  // Accent "threads" drawn from the focus node to its direct neighbors.
  function buildFocusThreads(focusId: string | null): void {
    if (focusThreads) {
      graphGroup.remove(focusThreads);
      focusThreads.geometry.dispose();
      (focusThreads.material as LineBasicMaterial).dispose();
      focusThreads = null;
    }
    if (!focusId) return;
    const center = nodeById.get(focusId);
    const neighbors = adjacency.get(focusId);
    if (!center || !neighbors || neighbors.length === 0) return;

    const positions = new Float32Array(neighbors.length * 6);
    let w = 0;
    for (const nb of neighbors) {
      const node = nodeById.get(nb);
      if (!node) continue;
      positions[w++] = center.x ?? 0;
      positions[w++] = center.y ?? 0;
      positions[w++] = center.z ?? 0;
      positions[w++] = node.x ?? 0;
      positions[w++] = node.y ?? 0;
      positions[w++] = node.z ?? 0;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions.subarray(0, w), 3));
    const accent = readCssColor("--g-thread", "rgba(210,68,48,0.55)");
    const material = new LineBasicMaterial({
      color: new Color().copy(accent.color),
      transparent: true,
      opacity: Math.max(0.4, accent.alpha),
    });
    focusThreads = new LineSegments(geometry, material);
    focusThreads.frustumCulled = false;
    graphGroup.add(focusThreads);
  }

  // Apply focus / time / search visual state to the node field + focus threads.
  function applyHighlight(): void {
    if (!nodeField) return;
    const focusId = options.focusId ?? null;
    const depth = Math.max(1, options.focusDepth ?? 1);
    const nearSet = focusId ? computeNear(focusId, depth) : null;
    currentNearSet = nearSet;
    // Hover-to-highlight only when nothing is focus-pinned.
    const hoverNearSet = !focusId && hovered ? computeNear(hovered, 1) : null;
    const highlightSet =
      options.highlightIds && options.highlightIds.length > 0
        ? new Set(options.highlightIds)
        : null;
    const searchSet = options.searchIds ? new Set(options.searchIds) : null;
    nodeField.setVisualState({ focusId, nearSet, highlightSet, searchSet, hoverNearSet });
    // Rebuild focus threads only when the focus node actually changes (not on
    // every hover) to avoid churning the geometry.
    if (focusId !== lastFocusForThreads) {
      buildFocusThreads(focusId);
      lastFocusForThreads = focusId;
    }
    syncPositions();
    renderFrame();
  }

  function chooseLabels(): LabelEntry[] {
    if (!labelLayer) return [];
    const out: LabelEntry[] = [];
    const seen = new Set<string>();
    const add = (id: string | null | undefined) => {
      if (!id || seen.has(id) || out.length >= MAX_LABELS) return;
      const n = nodeById.get(id);
      const text = labelTextById.get(id);
      if (n && text) {
        out.push({ id, text, x: n.x ?? 0, y: n.y ?? 0, z: n.z ?? 0 });
        seen.add(id);
      }
    };
    add(hovered);
    add(options.focusId ?? null);
    if (currentNearSet) for (const id of currentNearSet) add(id);
    for (const id of topImportantIds) {
      if (out.length >= MAX_LABELS) break;
      add(id);
    }
    return out;
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
    if (edgeLines) edgeLines.lines.visible = options.quality.threads;
    if (labelLayer) labelLayer.group.visible = options.quality.labels;
    if (settled && raf === 0 && (options.quality.motion || options.quality.nebula)) {
      startLoop();
    } else {
      renderFrame();
    }
  }

  // Switch Spatial (3D) ↔ Tactical (flat): pin/unpin z and reheat so the layout
  // re-settles into the new dimensionality.
  function applyView(): void {
    if (!graphSim) return;
    const flat = options.view === "tactical";
    for (const n of graphSim.nodes) {
      n.fz = flat ? 0 : null;
    }
    settled = false;
    graphSim.sim.alpha(0.5);
    startLoop();
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
        if (shouldFitOnSettle) fit(); // keep the user's camera on warm rebuilds
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
    controls.target.set(cx, cy, cz);
    controls.update();
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

  let pressPos: { x: number; y: number } | null = null;
  let draggedDuringPress = false;

  const onPointerDown = (event: PointerEvent) => {
    pressPos = { x: event.clientX, y: event.clientY };
    draggedDuringPress = false;
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.buttons !== 0) {
      // A button is held → panning/zooming; track movement, skip hover picking.
      if (pressPos && Math.hypot(event.clientX - pressPos.x, event.clientY - pressPos.y) > 5) {
        draggedDuringPress = true;
      }
      return;
    }
    const id = pickAt(event.clientX, event.clientY);
    if (id !== hovered) {
      hovered = id;
      renderer.domElement.style.cursor = id ? "pointer" : "default";
      options.onHover?.(id);
      applyHighlight(); // hover-to-highlight + hover label
    }
  };

  const onClick = (event: MouseEvent) => {
    if (draggedDuringPress) {
      draggedDuringPress = false;
      return; // a pan/drag, not a click-select
    }
    const id = pickAt(event.clientX, event.clientY);
    if (id) options.onSelect?.(id, event.shiftKey);
  };

  const onContextMenu = (event: MouseEvent) => {
    // RIGHT is also a pan button, so a right-drag ends with a contextmenu but
    // no click — swallow it and reset the guard (click never fires to reset it).
    if (draggedDuringPress) {
      draggedDuringPress = false;
      event.preventDefault();
      return;
    }
    const id = pickAt(event.clientX, event.clientY);
    if (id) {
      event.preventDefault();
      options.onSelect?.(id, false); // right-click focuses → opens detail
    }
  };

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("click", onClick);
  renderer.domElement.addEventListener("contextmenu", onContextMenu);

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
      if (options.view !== lastView) {
        lastView = options.view;
        applyView();
      }
      const sig = highlightSignature(options);
      if (sig !== highlightSig) {
        highlightSig = sig;
        applyHighlight();
      }
      // Display sliders (live, no rebuild): node size re-scales instances,
      // text fade adjusts the label distance falloff.
      if (next.nodeScale !== undefined && nodeField) {
        nodeField.setSizeScale(options.nodeScale ?? 1);
        syncPositions();
        renderFrame();
      }
      if (next.labelFade !== undefined && labelLayer) {
        labelLayer.setFadeScale(options.labelFade ?? 0.6);
        renderFrame();
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
      controls.update();
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
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("contextmenu", onContextMenu);
      controls.removeEventListener("change", onControlsChange);
      controls.dispose();
      clearGraph();
      sceneBundle.dispose();
    },
  };
}

function highlightSignature(o: GraphRendererOptions): string {
  // searchIds: null (no active search) must be distinct from [] (search active,
  // zero matches) — the latter should dim everything.
  const search = o.searchIds == null ? "none" : `q[${o.searchIds.join(",")}]`;
  return [o.focusId ?? "", o.focusDepth ?? 1, (o.highlightIds ?? []).join(","), search].join("|");
}

function qualityChanged(a: RenderQuality, b: RenderQuality): boolean {
  return (
    a.bloom !== b.bloom ||
    a.nebula !== b.nebula ||
    a.motion !== b.motion ||
    a.threads !== b.threads ||
    a.labels !== b.labels
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
