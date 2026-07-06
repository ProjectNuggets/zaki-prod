import { describe, expect, it } from "@jest/globals";
import {
  EST_UNITS_PER_AGENT_RUN,
  EST_UNITS_PER_CHAT,
  estimateTurnsFromUnits,
  formatUnits,
  formatUsagePercentLabel,
  getUsagePercent,
  isUsageAtCap,
  isUsageNearCap,
} from "./usageDisplay";

describe("usageDisplay", () => {
  it("computes a clamped percentage from raw meter units", () => {
    expect(getUsagePercent({ used: 80, limit: 100 })).toBe(80);
    expect(getUsagePercent({ used: 6500, limit: 8000 })).toBe(81.25);
    expect(getUsagePercent({ used: 120, limit: 100 })).toBe(100);
    expect(getUsagePercent({ used: null, limit: 100 })).toBe(0);
    expect(getUsagePercent({ used: 10, limit: 0 })).toBe(0);
  });

  it("formats the in-app usage label without exposing raw units", () => {
    expect(formatUsagePercentLabel(82.4)).toBe("82% of your weekly usage");
    expect(formatUsagePercentLabel(99.6)).toBe("99% of your weekly usage");
    expect(formatUsagePercentLabel(100)).toBe("100% of your weekly usage");
  });

  it("flags near-cap and cap states from percentage only", () => {
    expect(isUsageNearCap(79.9)).toBe(false);
    expect(isUsageNearCap(80)).toBe(true);
    expect(isUsageNearCap(100)).toBe(false);
    expect(isUsageAtCap(99.9)).toBe(false);
    expect(isUsageAtCap(100)).toBe(true);
  });

  it("estimates agent runs and chats from remaining pooled units", () => {
    expect(EST_UNITS_PER_AGENT_RUN).toBeGreaterThan(EST_UNITS_PER_CHAT);
    expect(estimateTurnsFromUnits(1420)).toEqual({ agentRuns: 64, chats: 1420 });
    expect(estimateTurnsFromUnits(97)).toEqual({ agentRuns: 4, chats: 97 });
    expect(estimateTurnsFromUnits(0)).toEqual({ agentRuns: 0, chats: 0 });
    // null / negative / non-finite -> null so callers fall back to a percent
    expect(estimateTurnsFromUnits(null)).toBeNull();
    expect(estimateTurnsFromUnits(-5)).toBeNull();
    expect(estimateTurnsFromUnits(Number.NaN)).toBeNull();
  });

  it("formats fractional units for display", () => {
    expect(formatUnits(22.083)).toBe("22");
    expect(formatUnits(0)).toBe("0");
    expect(formatUnits(-3)).toBe("0");
    expect(formatUnits(null)).toBe("—");
    expect(formatUnits(Number.NaN)).toBe("—");
  });
});
