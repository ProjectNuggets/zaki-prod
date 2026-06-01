import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  forceZ,
  type Simulation,
} from "d3-force-3d";
import type { RenderModel } from "./interface";

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
const BASE_EDGE_LENGTH = 120; // baseline link spring length, scaled by relevance
const COMMUNITY_RADIUS = 280; // Fibonacci-sphere radius for cluster seed points
const COMMUNITY_PULL = 0.05; // gentle per-community centering (charge/link dominate)

// Build a stopped 3D force simulation from the render model. Layout reads by
// MEANING, not just connectivity: link distance/strength scale with the ported
// edge relevance, and a gentle per-community pull separates LLM-named clusters
// into distinct regions. The caller drives ticking inside its rAF loop.
export function createSimulation(model: RenderModel): GraphSimulation {
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
    .force("charge", forceManyBody<SimNode>().strength(-140).distanceMax(900))
    .force(
      "link",
      forceLink<SimNode, SimLink>(links)
        .id((d) => d.id)
        .distance((l) => Math.max(20, BASE_EDGE_LENGTH * (1.5 - l.relevance)))
        .strength((l) => 0.12 + 0.5 * l.relevance),
    )
    .force("center", forceCenter<SimNode>(0, 0, 0).strength(0.04))
    .force("cx", forceX<SimNode>((n) => targetFor(n, "x")).strength(communityStrength))
    .force("cy", forceY<SimNode>((n) => targetFor(n, "y")).strength(communityStrength))
    .force("cz", forceZ<SimNode>((n) => targetFor(n, "z")).strength(communityStrength))
    .stop();

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
