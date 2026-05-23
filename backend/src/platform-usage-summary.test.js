import { describe, expect, it, jest } from "@jest/globals";
import {
  APP_CHAT_SURFACE,
  LEARNING_SURFACE,
  ZAKI_BOT_SURFACE,
} from "./daily-quota.js";
import {
  MEMORY_SCOPE_IDS,
  ZAKI_PRODUCT_IDS,
  buildPlatformEntitlementSummary,
} from "./platform-policy.js";
import {
  PLATFORM_USAGE_SUMMARY_VERSION,
  buildPlatformUsageSummary,
} from "./platform-usage-summary.js";

function buildPlatform(overrides = {}) {
  return {
    ...buildPlatformEntitlementSummary({
      commercialPlanId: "complete",
      effectiveTier: "personal",
      source: "subscription",
      premium: true,
      env: {},
    }),
    ...overrides,
  };
}

describe("platform usage summary", () => {
  it("combines platform plan state with current product quota surfaces", async () => {
    const resolveQuotaForSurface = jest.fn(async (surface) => {
      const bySurface = {
        [APP_CHAT_SURFACE]: {
          success: true,
          surface,
          bucket: "app_chat",
          period: "day",
          limit: 10,
          used: 2,
          remaining: 8,
          resetAt: "2026-05-20T00:00:00.000Z",
        },
        [ZAKI_BOT_SURFACE]: {
          success: true,
          surface,
          bucket: "zaki_bot_weekly",
          period: "week",
          limit: null,
          unlimited: true,
          used: 0,
          remaining: null,
          resetAt: "2026-05-25T00:00:00.000Z",
        },
        [LEARNING_SURFACE]: {
          success: true,
          surface,
          bucket: "learning_weekly",
          period: "week",
          limit: 20,
          used: 5,
          remaining: 15,
          resetAt: "2026-05-25T00:00:00.000Z",
        },
      };
      return bySurface[surface];
    });

    const summary = await buildPlatformUsageSummary({
      zakiUser: { id: 42 },
      platform: buildPlatform(),
      resolveQuotaForSurface,
      buildLearningStatus: (quota) => ({ promptQuota: quota, policyTier: "free" }),
      nowDate: new Date("2026-05-19T12:00:00.000Z"),
    });

    expect(summary).toEqual(
      expect.objectContaining({
        success: true,
        contractVersion: PLATFORM_USAGE_SUMMARY_VERSION,
        generatedAt: "2026-05-19T12:00:00.000Z",
        plan: expect.objectContaining({
          id: "pro",
          label: "Pro",
          legacyPlanId: "complete",
          migration: true,
        }),
      })
    );
    expect(summary.allowance).toEqual(
      expect.objectContaining({
        model: "shared_weekly_allowance",
        ledgerMode: "legacy_surface_counters",
        productQuotaMode: "weighted_product_caps",
      })
    );
    expect(summary.allowance.weekly).toEqual(
      expect.objectContaining({
        used: null,
        remaining: null,
        source: "pending_central_usage_ledger",
      })
    );
    expect(summary.allowance.burst).toEqual(
      expect.objectContaining({
        windowHours: 5,
        source: "pending_burst_ledger",
      })
    );
    expect(summary.products[ZAKI_PRODUCT_IDS.SPACES].quota).toEqual(
      expect.objectContaining({
        surface: APP_CHAT_SURFACE,
        bucket: "app_chat",
        used: 2,
        remaining: 8,
      })
    );
    expect(summary.products[ZAKI_PRODUCT_IDS.AGENT].quota).toEqual(
      expect.objectContaining({
        surface: ZAKI_BOT_SURFACE,
        unlimited: true,
        period: "week",
      })
    );
    expect(summary.products[ZAKI_PRODUCT_IDS.LEARN].learning).toEqual(
      expect.objectContaining({ policyTier: "free" })
    );
    expect(summary.products[ZAKI_PRODUCT_IDS.BRAIN]).toEqual(
      expect.objectContaining({
        memoryScope: MEMORY_SCOPE_IDS.PERSONAL_BRAIN,
        quota: expect.objectContaining({
          metered: false,
          status: "governed_by_memory_policy",
        }),
      })
    );
    expect(summary.products[ZAKI_PRODUCT_IDS.HIRE]).toBeUndefined();
    expect(summary.products[ZAKI_PRODUCT_IDS.DESIGN]).toBeUndefined();
    expect(resolveQuotaForSurface).toHaveBeenCalledTimes(3);
  });

  it("marks one product unavailable without failing the full summary", async () => {
    const summary = await buildPlatformUsageSummary({
      zakiUser: { id: 42 },
      platform: buildPlatform(),
      resolveQuotaForSurface: jest.fn(async (surface) => {
        if (surface === ZAKI_BOT_SURFACE) throw new Error("upstream unavailable");
        return {
          success: true,
          surface,
          bucket: surface,
          period: "week",
          limit: 10,
          used: 1,
          remaining: 9,
        };
      }),
    });

    expect(summary.success).toBe(true);
    expect(summary.products[ZAKI_PRODUCT_IDS.AGENT].quota).toEqual(
      expect.objectContaining({
        success: false,
        unavailable: true,
        error: "upstream unavailable",
      })
    );
    expect(summary.products[ZAKI_PRODUCT_IDS.SPACES].quota.success).toBe(true);
  });

  it("uses central meter weekly aggregation with no rollover when provided", async () => {
    const summary = await buildPlatformUsageSummary({
      zakiUser: { id: 42 },
      platform: buildPlatform(),
      meterSnapshot: {
        weekly: {
          period: "utc_week",
          resetPolicy: "fixed_window_no_rollover",
          rollover: false,
          unusedUnitsExpireAt: "2026-05-25T00:00:00.000Z",
          limit: 1500,
          used: 37.5,
          remaining: 1462.5,
          startedAt: "2026-05-18T00:00:00.000Z",
          resetAt: "2026-05-25T00:00:00.000Z",
        },
      },
      resolveQuotaForSurface: jest.fn(async (surface) => ({
        success: true,
        surface,
        bucket: surface,
        period: "week",
        limit: 10,
        used: 1,
        remaining: 9,
      })),
    });

    expect(summary.allowance).toEqual(
      expect.objectContaining({
        ledgerMode: "central_meter_receipts",
      })
    );
    expect(summary.allowance.weekly).toEqual(
      expect.objectContaining({
        limit: 1500,
        used: 37.5,
        remaining: 1462.5,
        startedAt: "2026-05-18T00:00:00.000Z",
        resetAt: "2026-05-25T00:00:00.000Z",
        period: "utc_week",
        resetPolicy: "fixed_window_no_rollover",
        rollover: false,
        unusedUnitsExpireAt: "2026-05-25T00:00:00.000Z",
        source: "central_meter_receipts",
      })
    );
    expect(summary.allowance.weekly.remaining).toBeLessThanOrEqual(
      summary.allowance.weekly.limit
    );
  });

  it("requires canonical user and platform context", async () => {
    await expect(
      buildPlatformUsageSummary({
        zakiUser: {},
        platform: buildPlatform(),
        resolveQuotaForSurface: jest.fn(),
      })
    ).rejects.toThrow("zakiUser.id");

    await expect(
      buildPlatformUsageSummary({
        zakiUser: { id: 1 },
        platform: {},
        resolveQuotaForSurface: jest.fn(),
      })
    ).rejects.toThrow("platform plan and usage");
  });
});
