import type { BrainGraphEdge } from "@/lib/api";

// Engine-agnostic contract for the Brain "Galaxy" renderer.
//
// React owns data + state; the engine owns pixels. Keeping this interface
// framework- and backend-agnostic lets the WebGL implementation be swapped
// for a future WebGPU one without touching any React code. The render model
// is intentionally a flat, pre-resolved view of the brain graph: all the
// importance/relevance/color math (ported from the cytoscape implementation)
// runs in React adapters before it reaches the engine.

export type BrainViewMode = "spatial" | "tactical";

export interface RenderNode {
  id: string;
  label: string;
  /** 0..1 importance percentile → drives radius + opacity. */
  importance: number;
  /** Hex color resolved from the active color preset. */
  color: string;
  kind: string;
  communityId: number | null;
  /** Archived (valid_to set) → rendered as a faint "wisp". */
  stale: boolean;
  /** The canonical self/"me" anchor node, if this is it. */
  isSelf: boolean;
}

export interface RenderEdge {
  source: string;
  target: string;
  /** 0..1 relevance → link strength (layout) + visual weight. */
  relevance: number;
  type: BrainGraphEdge["type"];
}

export interface RenderModel {
  nodes: RenderNode[];
  edges: RenderEdge[];
}

/** Quality knobs surfaced by the in-canvas display panel + the LOD tiers. */
export interface RenderQuality {
  bloom: boolean;
  nebula: boolean;
  threads: boolean;
  motion: boolean;
}

export interface GraphRendererOptions {
  view: BrainViewMode;
  quality: RenderQuality;
  selectedIds: readonly string[];
  /** The ember focus node — bright accent, neighbors lit, the rest dimmed. */
  focusId: string | null;
  /** Seed-and-expand radius (hops) around the focus node. */
  focusDepth?: number;
  /** Node ids to glow (time scrubber births/affected). */
  highlightIds?: readonly string[];
  /** Search matches; non-matches dim. null = no active search. */
  searchIds?: readonly string[] | null;
  onHover?: (id: string | null) => void;
  onSelect?: (id: string, additive: boolean) => void;
}

/**
 * One instance is bound to a canvas by the React wrapper (GalaxyRenderer).
 * Implemented by the WebGL engine in P1+; a WebGPU variant can implement the
 * same surface later.
 */
export interface GraphRenderer {
  setModel(model: RenderModel): void;
  setOptions(options: Partial<GraphRendererOptions>): void;
  resize(width: number, height: number): void;
  /** Canvas-control-cluster actions (bottom-right of the canvas). */
  fit(): void;
  relayout(): void;
  dispose(): void;
}
