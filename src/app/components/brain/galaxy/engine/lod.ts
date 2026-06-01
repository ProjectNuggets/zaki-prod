import type { RenderQuality } from "./interface";

// Level-of-detail tiers. Visual richness is traded against node count + the
// user's motion preference so the galaxy stays smooth on large corpora and
// respects prefers-reduced-motion. The display panel (P4) can override these.
//
//   reduced-motion → "lite":     no bloom/nebula/motion (accessible, static)
//   > 3000 nodes   → "balanced": bloom on, nebula + idle motion off
//   otherwise      → "high":     full galaxy (bloom + nebula + breathe)
export function resolveQuality(nodeCount: number, reducedMotion: boolean): RenderQuality {
  if (reducedMotion) {
    return { bloom: false, nebula: false, threads: true, motion: false };
  }
  if (nodeCount > 3000) {
    return { bloom: true, nebula: false, threads: true, motion: false };
  }
  return { bloom: true, nebula: true, threads: true, motion: true };
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
