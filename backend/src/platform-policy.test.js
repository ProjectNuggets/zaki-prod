import { describe, expect, it } from "@jest/globals";
import {
  MEMORY_SCOPE_IDS,
  PLATFORM_PLAN_IDS,
  PLATFORM_PLAN_LADDER,
  PLATFORM_METER_CAPABILITIES,
  PRODUCT_OPERATIONAL_STATES,
  PRODUCT_REGISTRY_VERSION,
  ZAKI_PRODUCT_IDS,
  buildPlatformEntitlementSummary,
  buildPlatformMeterPolicy,
  buildPlatformPlanPolicy,
  buildPlatformProductCatalog,
  buildPlatformProductRegistry,
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
    expect(normalizePlatformPlanId("hire")).toBe("personal");
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

  it("provides provisional quota defaults and keeps them configurable", () => {
    const defaultPolicy = buildPlatformPlanPolicy({ env: {} });
    expect(defaultPolicy.numericLimitsFinalized).toBe(true);
    expect(defaultPolicy.plans.free.weeklyAllowanceUnits).toBe(100);
    expect(defaultPolicy.plans.free.rollingAllowanceUnits).toBe(40);
    expect(defaultPolicy.plans.pro.weeklyAllowanceUnits).toBe(1500);
    expect(defaultPolicy.burstWindowHours).toBe(5);

    const configuredPolicy = buildPlatformPlanPolicy({
      env: {
        ZAKI_PLATFORM_FREE_WEEKLY_ALLOWANCE_UNITS: "100",
        ZAKI_PLATFORM_PERSONAL_WEEKLY_ALLOWANCE_UNITS: "500",
        ZAKI_PLATFORM_PRO_WEEKLY_ALLOWANCE_UNITS: "1500",
        ZAKI_PLATFORM_PRO_MAX_WEEKLY_ALLOWANCE_UNITS: "5000",
        ZAKI_PLATFORM_FREE_ROLLING_ALLOWANCE_UNITS: "20",
        ZAKI_PLATFORM_PERSONAL_ROLLING_ALLOWANCE_UNITS: "100",
        ZAKI_PLATFORM_PRO_ROLLING_ALLOWANCE_UNITS: "300",
        ZAKI_PLATFORM_PRO_MAX_ROLLING_ALLOWANCE_UNITS: "1000",
        ZAKI_PLATFORM_BURST_WINDOW_HOURS: "6",
      },
    });
    expect(configuredPolicy.numericLimitsFinalized).toBe(true);
    expect(configuredPolicy.burstWindowHours).toBe(6);
    expect(configuredPolicy.plans.pro.weeklyAllowanceUnits).toBe(1500);
    expect(configuredPolicy.plans.pro.rollingAllowanceUnits).toBe(300);
  });

  it("defines weighted product and capability meter policy", () => {
    const policy = buildPlatformMeterPolicy({
      env: {
        ZAKI_METER_PRODUCT_WEIGHT_HIRE: "1.4",
        ZAKI_METER_CAPABILITY_WEIGHT_DEEP_RESEARCH: "3.5",
      },
    });

    expect(policy.products[ZAKI_PRODUCT_IDS.HIRE].weight).toBe(1.4);
    expect(policy.products[ZAKI_PRODUCT_IDS.SPACES].weight).toBe(0.5);
    expect(policy.capabilities[PLATFORM_METER_CAPABILITIES.DEEP_RESEARCH].weight).toBe(3.5);
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
    expect(catalog.find((product) => product.id === ZAKI_PRODUCT_IDS.HIRE)).toEqual(
      expect.objectContaining({ memoryScope: MEMORY_SCOPE_IDS.HIRE_MEMORY, lifecycle: "future" })
    );
    expect(catalog.find((product) => product.id === ZAKI_PRODUCT_IDS.DESIGN)).toEqual(
      expect.objectContaining({ memoryScope: MEMORY_SCOPE_IDS.DESIGN_MEMORY, lifecycle: "current" })
    );
    expect(catalog.find((product) => product.id === ZAKI_PRODUCT_IDS.CLI)).toEqual(
      expect.objectContaining({ lifecycle: "future" })
    );
  });

  it("builds the central operational product registry", () => {
    const registry = buildPlatformProductRegistry({
      env: {
        ZAKI_PRODUCT_STATE_AGENT: PRODUCT_OPERATIONAL_STATES.DEGRADED,
        ZAKI_PRODUCT_STATE_HIRE: PRODUCT_OPERATIONAL_STATES.READ_ONLY,
      },
      nowDate: new Date("2026-05-22T10:00:00.000Z"),
    });

    expect(registry).toEqual(
      expect.objectContaining({
        success: true,
        contractVersion: PRODUCT_REGISTRY_VERSION,
        generatedAt: "2026-05-22T10:00:00.000Z",
      })
    );
    expect(registry.products.find((product) => product.productId === "learning")).toEqual(
      expect.objectContaining({
        legacyProductId: ZAKI_PRODUCT_IDS.LEARN,
        state: PRODUCT_OPERATIONAL_STATES.ENABLED,
        route: "/learn",
        visibleInSettings: true,
        memoryScope: MEMORY_SCOPE_IDS.LEARNER_MEMORY,
      })
    );
    expect(registry.products.find((product) => product.productId === "agent")).toEqual(
      expect.objectContaining({
        state: PRODUCT_OPERATIONAL_STATES.DEGRADED,
        route: "/agent",
        entryPoint: "Agent workbench",
      })
    );
    expect(registry.products.find((product) => product.productId === "hire")).toEqual(
      expect.objectContaining({
        state: PRODUCT_OPERATIONAL_STATES.READ_ONLY,
        lifecycle: "future",
        visibleInSettings: true,
      })
    );
    expect(registry.products.find((product) => product.productId === "cli")).toEqual(
      expect.objectContaining({
        state: PRODUCT_OPERATIONAL_STATES.HIDDEN,
        visibleInSettings: false,
      })
    );
  });

  it("builds an entitlement summary for the additive platform contract", () => {
    const summary = buildPlatformEntitlementSummary({
      commercialPlanId: "complete",
      effectiveTier: "personal",
      source: "subscription",
      premium: true,
      weeklyAllowanceEntitlementStartedAt: "2026-05-20T09:00:00.000Z",
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
        weeklyAllowancePeriod: "entitlement_week",
        weeklyAllowanceAnchorPolicy: "first_metered_use_after_entitlement_active",
        weeklyAllowanceEntitlementStartedAt: "2026-05-20T09:00:00.000Z",
        weeklyAllowanceResetPolicy: "fixed_7_day_no_rollover",
        weeklyAllowanceRollover: false,
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
