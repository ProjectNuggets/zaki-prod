import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  forceZ,
  type LinkForce,
  type ManyBodyForce,
  type PositionForce,
  type Simulation,
} from "d3-force-3d";
import type { ForceConfig, RenderModel } from "./interface";

// Default force config — reproduces the prior hardcoded look exactly, and is the
// baseline the Forces sliders center on (low center, roomy distance, moderate
// repel + link), calibrated from the Obsidian reference.
export const DEFAULT_FORCES: ForceConfig = {
  center: 0.04,
  repel: 140,
  linkDistance: 120,
  linkStrength: 0.4,
};

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

// Apply a ForceConfig to an existing sim's charge/link/center forces. Called on
// build and again (live) whenever a Forces slider moves — no rebuild needed,
// the caller just reheats the alpha so the layout re-settles from where it is.
export function applyForces(sim: Simulation<SimNode>, cfg: ForceConfig): void {
  const charge = sim.force("charge") as ManyBodyForce<SimNode> | undefined;
  if (charge) charge.strength(-cfg.repel);
  const link = sim.force("link") as LinkForce<SimNode, SimLink> | undefined;
  if (link) {
    link
      .distance((l) => Math.max(20, cfg.linkDistance * (1.5 - l.relevance)))
      // relevance-weighted, scaled by the slider (linkStrength 0.4 reproduces
      // the prior 0.12 + 0.5·relevance curve exactly).
      .strength((l) => clamp(cfg.linkStrength * (0.3 + 1.25 * l.relevance), 0.01, 2));
  }
  // "Center force" = positional GRAVITY toward the origin (forceX/Y/Z), which
  // actually compacts the layout. (d3 forceCenter only re-centers the centroid
  // and barely changes the look — that's the "center does nothing" bug.) The
  // fixed forceCenter stays as a gentle keep-on-screen recenter.
  for (const axis of ["gx", "gy", "gz"] as const) {
    const g = sim.force(axis) as PositionForce<SimNode> | undefined;
    if (g) g.strength(cfg.center);
  }
}

export interface SimNode {
  id: string;
  importance: number;
  communityId: number | null;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
}

export interface SimLink {
  source: string | SimNode;
  target: string | SimNode;
  relevance: number;
}

export interface GraphSimulation {
  sim: Simulation<SimNode>;
  nodes: SimNode[];
  links: SimLink[];
}

// Provisional layout defaults. These are sensible starting values; they'll be
// tuned against real corpora once a live backend is connected (the graph can't
// be visually verified without data). Kept as named constants so the tuning
// pass is a one-line change per knob.
const COMMUNITY_RADIUS = 280; // Fibonacci-sphere radius for cluster seed points
const COMMUNITY_PULL = 0.05; // gentle per-community centering (charge/link dominate)

// Build a stopped 3D force simulation from the render model. Layout reads by
// MEANING, not just connectivity: link distance/strength scale with the ported
// edge relevance, and a gentle per-community pull separates LLM-named clusters
// into distinct regions. The caller drives ticking inside its rAF loop.
export function createSimulation(
  model: RenderModel,
  forces: ForceConfig = DEFAULT_FORCES,
): GraphSimulation {
  const nodes: SimNode[] = model.nodes.map((n) => ({
    id: n.id,
    importance: n.importance,
    communityId: n.communityId,
  }));
  const links: SimLink[] = model.edges.map((e) => ({
    source: e.source,
    target: e.target,
    relevance: e.relevance,
  }));

  const targets = communityTargets(model);
  const targetFor = (n: SimNode, axis: "x" | "y" | "z"): number => {
    if (n.communityId == null) return 0;
    return targets.get(n.communityId)?.[axis] ?? 0;
  };
  const communityStrength = (n: SimNode): number => (n.communityId == null ? 0 : COMMUNITY_PULL);

  const sim = forceSimulation<SimNode>(nodes, 3)
    .force("charge", forceManyBody<SimNode>().distanceMax(900))
    .force("link", forceLink<SimNode, SimLink>(links).id((d) => d.id))
    .force("center", forceCenter<SimNode>(0, 0, 0).strength(0.05)) // fixed: keep framed
    .force("cx", forceX<SimNode>((n) => targetFor(n, "x")).strength(communityStrength))
    .force("cy", forceY<SimNode>((n) => targetFor(n, "y")).strength(communityStrength))
    .force("cz", forceZ<SimNode>((n) => targetFor(n, "z")).strength(communityStrength))
    // Adjustable gravity toward origin — the real "Center force" knob.
    .force("gx", forceX<SimNode>(0))
    .force("gy", forceY<SimNode>(0))
    .force("gz", forceZ<SimNode>(0))
    .stop();

  applyForces(sim, forces); // charge / link distance+strength / center
  return { sim, nodes, links };
}

// Distinct communities are seeded onto a Fibonacci sphere so each cluster gets
// its own region of space without overlapping the others.
function communityTargets(model: RenderModel): Map<number, { x: number; y: number; z: number }> {
  const ids = [
    ...new Set(model.nodes.map((n) => n.communityId).filter((c): c is number => c != null)),
  ];
  const map = new Map<number, { x: number; y: number; z: number }>();
  const n = ids.length;
  ids.forEach((id, i) => {
    if (n <= 1) {
      map.set(id, { x: 0, y: 0, z: 0 });
      return;
    }
    const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    map.set(id, {
      x: COMMUNITY_RADIUS * Math.sin(phi) * Math.cos(theta),
      y: COMMUNITY_RADIUS * Math.sin(phi) * Math.sin(theta),
      z: COMMUNITY_RADIUS * Math.cos(phi),
    });
  });
  return map;
}
