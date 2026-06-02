import type { RenderQuality } from "./interface";

// Level-of-detail tiers. Visual richness is traded against node count + the
// user's motion preference so the galaxy stays smooth on large corpora and
// respects prefers-reduced-motion. The display panel (P4) can override these.
//
//   reduced-motion → no motion
//   > 3000 nodes   → no idle motion (heavy corpus)
//   otherwise      → idle breathe on
// NOTE: bloom + nebula are currently forced OFF in every tier for the bare
// nodes+edges review; the P5 display panel restores them as user toggles.
export function resolveQuality(nodeCount: number, reducedMotion: boolean): RenderQuality {
  // Temporary: bloom + nebula default OFF so the bare nodes + edges are visible
  // for review. The P4 display panel will expose these as user toggles (and
  // pick sensible defaults from there).
  if (reducedMotion) {
    return { bloom: false, nebula: false, threads: true, motion: false };
  }
  if (nodeCount > 3000) {
    return { bloom: false, nebula: false, threads: true, motion: false };
  }
  return { bloom: false, nebula: false, threads: true, motion: true };
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
