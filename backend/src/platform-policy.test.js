import { describe, expect, it } from "@jest/globals";
import {
  MEMORY_SCOPE_IDS,
  PLATFORM_PLAN_IDS,
  PLATFORM_PLAN_LADDER,
  ZAKI_PRODUCT_IDS,
  buildPlatformEntitlementSummary,
  buildPlatformPlanPolicy,
  buildPlatformProductCatalog,
  normalizePlatformPlanId,
  resolvePlatformPlanForCommercialState,
} from "./platform-policy.js";

describe("platform policy", () => {
  it("defines the accepted platform plan ladder", () => {
    expect(PLATFORM_PLAN_LADDER).toEqual(["free", "personal", "pro", "pro_max"]);
    expect(PLATFORM_PLAN_IDS.PRO_MAX).toBe("pro_max");
  });

  it("maps legacy commercial plans into the new platform ladder", () => {
    expect(normalizePlatformPlanId("spaces_free")).toBe("free");
    expect(normalizePlatformPlanId("agent")).toBe("personal");
    expect(normalizePlatformPlanId("learn")).toBe("personal");
    expect(normalizePlatformPlanId("access_code")).toBe("personal");
    expect(normalizePlatformPlanId("complete")).toBe("pro");
    expect(normalizePlatformPlanId("pro_max")).toBe("pro_max");
  });

  it("keeps all current products available in every plan policy", () => {
    const policy = buildPlatformPlanPolicy({ env: {} });
    for (const planId of PLATFORM_PLAN_LADDER) {
      expect(policy.plans[planId].products[ZAKI_PRODUCT_IDS.SPACES].available).toBe(true);
      expect(policy.plans[planId].products[ZAKI_PRODUCT_IDS.AGENT].available).toBe(true);
      expect(policy.plans[planId].products[ZAKI_PRODUCT_IDS.LEARN].available).toBe(true);
      expect(policy.plans[planId].products[ZAKI_PRODUCT_IDS.BRAIN].available).toBe(true);
      expect(policy.plans[planId].products[ZAKI_PRODUCT_IDS.CLI].available).toBe(false);
    }
    expect(policy.plans.free.products).not.toBe(policy.plans.personal.products);
  });

  it("keeps numeric quota values configurable until pricing is finalized", () => {
    const incompletePolicy = buildPlatformPlanPolicy({ env: {} });
    expect(incompletePolicy.numericLimitsFinalized).toBe(false);
    expect(incompletePolicy.plans.free.weeklyAllowanceUnits).toBeNull();
    expect(incompletePolicy.burstWindowHours).toBe(5);

    const configuredPolicy = buildPlatformPlanPolicy({
      env: {
        ZAKI_PLATFORM_FREE_WEEKLY_ALLOWANCE_UNITS: "100",
        ZAKI_PLATFORM_PERSONAL_WEEKLY_ALLOWANCE_UNITS: "500",
        ZAKI_PLATFORM_PRO_WEEKLY_ALLOWANCE_UNITS: "1500",
        ZAKI_PLATFORM_PRO_MAX_WEEKLY_ALLOWANCE_UNITS: "5000",
        ZAKI_PLATFORM_BURST_WINDOW_HOURS: "6",
      },
    });
    expect(configuredPolicy.numericLimitsFinalized).toBe(true);
    expect(configuredPolicy.burstWindowHours).toBe(6);
    expect(configuredPolicy.plans.pro.weeklyAllowanceUnits).toBe(1500);
  });

  it("models current and future product memory scopes", () => {
    const catalog = buildPlatformProductCatalog();
    expect(catalog.find((product) => product.id === ZAKI_PRODUCT_IDS.AGENT)).toEqual(
      expect.objectContaining({ memoryScope: MEMORY_SCOPE_IDS.PERSONAL_BRAIN })
    );
    expect(catalog.find((product) => product.id === ZAKI_PRODUCT_IDS.SPACES)).toEqual(
      expect.objectContaining({ memoryScope: MEMORY_SCOPE_IDS.WORKSPACE_MEMORY })
    );
    expect(catalog.find((product) => product.id === ZAKI_PRODUCT_IDS.LEARN)).toEqual(
      expect.objectContaining({ memoryScope: MEMORY_SCOPE_IDS.LEARNER_MEMORY })
    );
    expect(catalog.find((product) => product.id === ZAKI_PRODUCT_IDS.CLI)).toEqual(
      expect.objectContaining({ lifecycle: "future" })
    );
  });

  it("builds an entitlement summary for the additive platform contract", () => {
    const summary = buildPlatformEntitlementSummary({
      commercialPlanId: "complete",
      effectiveTier: "personal",
      source: "subscription",
      premium: true,
      env: {},
    });

    expect(summary.plan).toEqual(
      expect.objectContaining({
        id: "pro",
        label: "Pro",
        source: "subscription",
        premium: true,
        legacyPlanId: "complete",
        migration: true,
      })
    );
    expect(summary.usage).toEqual(
      expect.objectContaining({
        model: "shared_weekly_allowance",
        burstWindowHours: 5,
        productQuotaMode: "weighted_product_caps",
      })
    );
    expect(summary.products.spaces.memoryScope).toBe(MEMORY_SCOPE_IDS.WORKSPACE_MEMORY);
    expect(summary.memory.personalAuthority).toBe(ZAKI_PRODUCT_IDS.AGENT);
  });

  it("resolves free as default when no active commercial state exists", () => {
    expect(resolvePlatformPlanForCommercialState()).toBe("free");
    expect(resolvePlatformPlanForCommercialState({ premium: true, effectiveTier: "pro_max" })).toBe(
      "pro_max"
    );
  });
});
