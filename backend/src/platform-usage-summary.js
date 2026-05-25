import {
  APP_CHAT_SURFACE,
  LEARNING_SURFACE,
  ZAKI_BOT_SURFACE,
} from "./daily-quota.js";
import {
  MEMORY_SCOPE_IDS,
  PLATFORM_POLICY_VERSION,
  ZAKI_PRODUCT_IDS,
} from "./platform-policy.js";

export const PLATFORM_USAGE_SUMMARY_VERSION = "2026-05-19.usage-summary.v1";

export const PLATFORM_USAGE_PRODUCT_SURFACES = Object.freeze([
  Object.freeze({
    productId: ZAKI_PRODUCT_IDS.SPACES,
    surface: APP_CHAT_SURFACE,
    label: "ZAKI Spaces",
    memoryScope: MEMORY_SCOPE_IDS.WORKSPACE_MEMORY,
  }),
  Object.freeze({
    productId: ZAKI_PRODUCT_IDS.AGENT,
    surface: ZAKI_BOT_SURFACE,
    label: "ZAKI Agent",
    memoryScope: MEMORY_SCOPE_IDS.PERSONAL_BRAIN,
  }),
  Object.freeze({
    productId: ZAKI_PRODUCT_IDS.LEARN,
    surface: LEARNING_SURFACE,
    label: "ZAKI Learn",
    memoryScope: MEMORY_SCOPE_IDS.LEARNER_MEMORY,
  }),
]);

function toIso(nowDate) {
  const date = nowDate instanceof Date ? nowDate : new Date(nowDate);
  const timestamp = date.getTime();
  return Number.isFinite(timestamp) ? date.toISOString() : new Date().toISOString();
}

function normalizeQuotaPayload(payload = {}, surface) {
  return {
    success: payload.success !== false,
    unavailable: false,
    unlimited: Boolean(payload.unlimited),
    limit: typeof payload.limit === "number" ? payload.limit : null,
    used: typeof payload.used === "number" ? Math.max(0, Math.floor(payload.used)) : 0,
    remaining:
      typeof payload.remaining === "number"
        ? Math.max(0, Math.floor(payload.remaining))
        : null,
    resetAt: typeof payload.resetAt === "string" ? payload.resetAt : null,
    bucket: typeof payload.bucket === "string" ? payload.bucket : null,
    period: typeof payload.period === "string" ? payload.period : null,
    surface: typeof payload.surface === "string" ? payload.surface : surface,
  };
}

function buildUnavailableQuota(surface, error) {
  return {
    success: false,
    unavailable: true,
    unlimited: false,
    limit: null,
    used: 0,
    remaining: null,
    resetAt: null,
    bucket: null,
    period: null,
    surface,
    error: error?.message || String(error || "usage_unavailable"),
  };
}

function buildBrainUsageProduct(platformProducts = {}) {
  const platformBrain = platformProducts[ZAKI_PRODUCT_IDS.BRAIN] || {};
  return {
    productId: ZAKI_PRODUCT_IDS.BRAIN,
    label: platformBrain.label || "ZAKI Brain",
    available: platformBrain.available !== false,
    lifecycle: platformBrain.lifecycle || "current",
    memoryScope: platformBrain.memoryScope || MEMORY_SCOPE_IDS.PERSONAL_BRAIN,
    quota: {
      success: true,
      unavailable: false,
      metered: false,
      surface: null,
      status: "governed_by_memory_policy",
    },
  };
}

export async function buildPlatformUsageSummary({
  zakiUser,
  platform,
  meterSnapshot = null,
  resolveQuotaForSurface,
  buildLearningStatus,
  surfaces = PLATFORM_USAGE_PRODUCT_SURFACES,
  nowDate = new Date(),
} = {}) {
  if (!zakiUser?.id) {
    throw new Error("buildPlatformUsageSummary requires zakiUser.id");
  }
  if (!platform?.plan || !platform?.usage) {
    throw new Error("buildPlatformUsageSummary requires platform plan and usage");
  }
  if (typeof resolveQuotaForSurface !== "function") {
    throw new Error("buildPlatformUsageSummary requires resolveQuotaForSurface");
  }

  const weeklyMeter = meterSnapshot?.weekly || null;
  const hasWeeklyMeter =
    weeklyMeter &&
    (typeof weeklyMeter.used === "number" ||
      typeof weeklyMeter.remaining === "number" ||
      typeof weeklyMeter.resetAt === "string");
  const productEntries = [];
  for (const productSurface of surfaces) {
    let quota;
    try {
      quota = normalizeQuotaPayload(
        await resolveQuotaForSurface(productSurface.surface),
        productSurface.surface
      );
    } catch (error) {
      quota = buildUnavailableQuota(productSurface.surface, error);
    }

    const product = {
      productId: productSurface.productId,
      label:
        platform.products?.[productSurface.productId]?.label ||
        productSurface.label,
      available:
        platform.products?.[productSurface.productId]?.available !== false,
      lifecycle:
        platform.products?.[productSurface.productId]?.lifecycle || "current",
      memoryScope:
        platform.products?.[productSurface.productId]?.memoryScope ||
        productSurface.memoryScope,
      quota,
    };

    if (
      productSurface.surface === LEARNING_SURFACE &&
      typeof buildLearningStatus === "function"
    ) {
      product.learning = buildLearningStatus(quota);
    }

    productEntries.push([productSurface.productId, product]);
  }

  if (!productEntries.some(([productId]) => productId === ZAKI_PRODUCT_IDS.BRAIN)) {
    productEntries.push([
      ZAKI_PRODUCT_IDS.BRAIN,
      buildBrainUsageProduct(platform.products || {}),
    ]);
  }

  return {
    success: true,
    contractVersion: PLATFORM_USAGE_SUMMARY_VERSION,
    platformPolicyVersion: platform.policyVersion || PLATFORM_POLICY_VERSION,
    generatedAt: toIso(nowDate),
    plan: {
      id: platform.plan.id,
      label: platform.plan.label,
      source: platform.plan.source,
      premium: Boolean(platform.plan.premium),
      legacyPlanId: platform.plan.legacyPlanId || null,
      migration: Boolean(platform.plan.migration),
    },
    allowance: {
      model: platform.usage.model || "shared_weekly_allowance",
      ledgerMode: hasWeeklyMeter ? "central_meter_receipts" : "legacy_surface_counters",
      weekly: {
        configured: Boolean(platform.usage.weeklyAllowanceConfigured),
        limit: weeklyMeter?.limit ?? platform.usage.weeklyAllowanceUnits ?? null,
        used: typeof weeklyMeter?.used === "number" ? weeklyMeter.used : null,
        remaining:
          typeof weeklyMeter?.remaining === "number" ? weeklyMeter.remaining : null,
        resetAt: weeklyMeter?.resetAt || null,
        startedAt: weeklyMeter?.startedAt || null,
        period:
          weeklyMeter?.period || platform.usage.weeklyAllowancePeriod || "entitlement_week",
        anchorType: weeklyMeter?.anchorType || null,
        anchorAt: weeklyMeter?.anchorAt || null,
        entitlementStartedAt:
          weeklyMeter?.entitlementStartedAt ||
          platform.usage.weeklyAllowanceEntitlementStartedAt ||
          null,
        planMeterGroup: weeklyMeter?.planMeterGroup || null,
        pendingFirstUse: Boolean(weeklyMeter?.pendingFirstUse),
        resetPolicy:
          weeklyMeter?.resetPolicy || platform.usage.weeklyAllowanceResetPolicy || null,
        rollover:
          typeof weeklyMeter?.rollover === "boolean"
            ? weeklyMeter.rollover
            : platform.usage.weeklyAllowanceRollover ?? null,
        unusedUnitsExpireAt: weeklyMeter?.unusedUnitsExpireAt || weeklyMeter?.resetAt || null,
        source: hasWeeklyMeter ? "central_meter_receipts" : "pending_central_usage_ledger",
      },
      burst: {
        windowHours: platform.usage.burstWindowHours || 5,
        active: null,
        remainingSeconds: null,
        source: "pending_burst_ledger",
      },
      productQuotaMode:
        platform.usage.productQuotaMode || "weighted_product_caps",
      numericLimitsFinalized: Boolean(platform.usage.numericLimitsFinalized),
    },
    products: Object.fromEntries(productEntries),
    memory: platform.memory || null,
  };
}
