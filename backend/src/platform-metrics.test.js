import { describe, expect, it, jest } from "@jest/globals";
import { getUsageMetrics, __test__ } from "./platform-metrics.js";

describe("platform metrics", () => {
  it("clampInt bounds the window and falls back on garbage", () => {
    expect(__test__.clampInt("45", 1, 90, 30)).toBe(45);
    expect(__test__.clampInt("1000", 1, 90, 30)).toBe(90);
    expect(__test__.clampInt("0", 1, 90, 30)).toBe(1);
    expect(__test__.clampInt("abc", 1, 90, 30)).toBe(30);
  });

  it("activityUnion references all three event sources", () => {
    const u = __test__.activityUnion("INTERVAL '30 days'");
    expect(u).toContain("zaki_meter_holds");
    expect(u).toContain("zaki_meter_grants");
    expect(u).toContain("zaki_usage_events");
  });

  it("shapes DAU/usage metrics from db rows and coerces counts to numbers", async () => {
    const dbAll = jest
      .fn()
      .mockResolvedValueOnce([{ dau: "5", wau: "12", mau: "30" }]) // active (meter-derived)
      .mockResolvedValueOnce([{ dau: "6", wau: "14", mau: "33" }]) // active (session-derived)
      .mockResolvedValueOnce([{ day: "2026-06-09", active_users: "5" }]) // dau series
      .mockResolvedValueOnce([{ product_id: "chat", users: "5", actions: "40" }]) // per product
      .mockResolvedValueOnce([{ total: "100", new_1d: "2", new_7d: "9", new_30d: "25" }]) // signups
      .mockResolvedValueOnce([{ day: "2026-06-09", signups: "2" }]) // signup series
      .mockResolvedValueOnce([{ total_users: "100", active_plan_users: "8", paid_tier_users: "8" }]); // totals

    const m = await getUsageMetrics(dbAll, { windowDays: 30 });

    expect(dbAll).toHaveBeenCalledTimes(7);
    expect(m.windowDays).toBe(30);
    expect(m.activeUsers).toEqual({ dau: 5, wau: 12, mau: 30, source: "meter+usage events" });
    expect(m.sessionActiveUsers.dau).toBe(6);
    expect(m.dauSeries).toEqual([{ day: "2026-06-09", activeUsers: 5 }]);
    expect(m.perProduct).toEqual([{ productId: "chat", users: 5, actions: 40 }]);
    expect(m.signups.total).toBe(100);
    expect(m.signups.new7d).toBe(9);
    expect(m.totals.totalUsers).toBe(100);
    expect(m.totals.paidTierUsers).toBe(8);
  });

  it("rejects when dbAll is missing", async () => {
    await expect(getUsageMetrics(null)).rejects.toThrow(/requires a dbAll/);
  });
});
