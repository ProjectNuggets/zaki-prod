import type { RenderQuality } from "./interface";

// Default FX the display panel initializes to — bare nodes+edges+labels with
// gentle idle motion; bloom/nebula are opt-in (the "galaxy" look).
export const DEFAULT_FX: RenderQuality = {
  bloom: false,
  nebula: false,
  threads: true,
  motion: true,
  labels: true,
};

// Clamp the user's chosen FX for performance + accessibility: nebula + idle
// motion drop on heavy corpora, and motion respects prefers-reduced-motion.
// Everything else is honored as the user set it.
export function clampQuality(
  fx: RenderQuality,
  nodeCount: number,
  reducedMotion: boolean,
): RenderQuality {
  return {
    bloom: fx.bloom,
    nebula: fx.nebula && nodeCount <= 3000,
    threads: fx.threads,
    labels: fx.labels,
    motion: fx.motion && !reducedMotion && nodeCount <= 3000,
  };
}

/** Bézier segments per edge — straighter (cheaper) as the graph grows. */
export function edgeSegmentsForCount(nodeCount: number): number {
  if (nodeCount > 3000) return 1; // straight
  if (nodeCount > 1200) return 3;
  return 6;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
