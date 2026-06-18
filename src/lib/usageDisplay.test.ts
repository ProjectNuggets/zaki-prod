import { describe, expect, it } from "@jest/globals";
import {
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
});
