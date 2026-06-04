import { describe, expect, it } from "@jest/globals";
import { clampQuality, edgeSegmentsForCount, prefersReducedMotion, DEFAULT_FX } from "./lod";

const FX = { bloom: true, nebula: true, threads: true, motion: true, labels: true } as const;

describe("clampQuality", () => {
  it("honors all FX on a small graph with motion allowed", () => {
    expect(clampQuality(FX, 500, false)).toEqual(FX);
  });

  it("drops nebula + motion on heavy corpora (>3000)", () => {
    const q = clampQuality(FX, 5000, false);
    expect(q.nebula).toBe(false);
    expect(q.motion).toBe(false);
    expect(q.bloom).toBe(true); // bloom + threads + labels still honored
    expect(q.threads).toBe(true);
    expect(q.labels).toBe(true);
  });

  it("forces motion off under prefers-reduced-motion", () => {
    expect(clampQuality(FX, 100, true).motion).toBe(false);
  });

  it("DEFAULT_FX settles-and-holds (motion + bloom + nebula off)", () => {
    expect(DEFAULT_FX.motion).toBe(false);
    expect(DEFAULT_FX.bloom).toBe(false);
    expect(DEFAULT_FX.nebula).toBe(false);
    expect(DEFAULT_FX.labels).toBe(true);
  });
});

describe("edgeSegmentsForCount", () => {
  it("straightens edges as the graph grows (LOD)", () => {
    expect(edgeSegmentsForCount(500)).toBe(6);
    expect(edgeSegmentsForCount(2000)).toBe(3);
    expect(edgeSegmentsForCount(5000)).toBe(1);
  });
});

describe("prefersReducedMotion", () => {
  it("is false when matchMedia is unavailable (jsdom)", () => {
    expect(prefersReducedMotion()).toBe(false);
  });
});
