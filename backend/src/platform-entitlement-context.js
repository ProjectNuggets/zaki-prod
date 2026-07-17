import { hasLocalUnlimitedQuotaBypass } from "./daily-quota.js";
import {
  getCommercialPlanState,
  getEffectiveEntitlementState,
} from "./effective-entitlements.js";
import {
  buildPlatformEntitlementSummary,
  resolvePlatformPlanForCommercialState,
} from "./platform-policy.js";

export function resolveEffectivePlatformEntitlement(
  zakiUser,
  { env = process.env, nowDate = new Date() } = {}
) {
  const effective = getEffectiveEntitlementState(zakiUser, nowDate);
  if (!hasLocalUnlimitedQuotaBypass(zakiUser, env)) return effective;

  const commercial = getCommercialPlanState({
    source: "access_code",
    accessActive: true,
  });

  return {
    ...effective,
    tier: "personal",
    status: "active",
    source: "access_code",
    premium: true,
    hasActiveSubscription: false,
    access: {
      ...effective.access,
      active: true,
      expiresAt: null,
      campaign: effective.access?.campaign || "local_unlimited_quota",
    },
    commercial,
    products: commercial.products,
  };
}

function resolveMeterEntitlementStartedAt(zakiUser, effective) {
  const source = String(effective?.source || "").trim();
  if (source !== "subscription" && source !== "access_code") return null;
  return zakiUser?.meter_entitlement_started_at || zakiUser?.billing_updated_at || null;
}

export function buildPlatformForMeterIdentity(
  identity,
  { env = process.env, nowDate = new Date() } = {}
) {
  if (identity?.type === "user") {
    const effective = resolveEffectivePlatformEntitlement(identity.zakiUser, { env, nowDate });
    const commercial = effective.commercial || {};
    return buildPlatformEntitlementSummary({
      commercialPlanId: commercial.planId || "spaces_free",
      effectiveTier: effective.tier,
      source: effective.source,
      premium: effective.premium,
      weeklyAllowanceEntitlementStartedAt: resolveMeterEntitlementStartedAt(
        identity.zakiUser,
        effective
      ),
      env,
    });
  }
  return buildPlatformEntitlementSummary({
    commercialPlanId: "spaces_free",
    effectiveTier: "free",
    source: "anonymous",
    premium: false,
    env,
  });
}

export function resolvePlatformWalletPlanForUser(zakiUser, options = {}) {
  const effective = resolveEffectivePlatformEntitlement(zakiUser, options);
  // Explicit subscription tiers win; legacy commercial aliases only fill cutover-only rows.
  const hasExplicitTier = Boolean(
    String(zakiUser?.plan_tier || zakiUser?.plan_id || "").trim()
  );
  const commercialPlanId =
    !hasExplicitTier && (zakiUser?.commercial_plan_id || zakiUser?.commercialPlanId)
      ? zakiUser.commercial_plan_id || zakiUser.commercialPlanId
      : effective?.commercial?.planId || "";
  return resolvePlatformPlanForCommercialState({
    commercialPlanId,
    effectiveTier: effective?.tier || zakiUser?.plan_tier || "free",
    premium: effective?.premium,
  });
}
