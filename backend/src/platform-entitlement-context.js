import { hasLocalUnlimitedQuotaBypass } from "./daily-quota.js";
import {
  getCommercialPlanState,
  getEffectiveEntitlementState,
} from "./effective-entitlements.js";

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
