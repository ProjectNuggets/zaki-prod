// chat-quota-context.js — the Spaces/product chat METERING DECISION, extracted
// from index.js so the call-site is importable and unit-testable.
//
// This is the exact logic index.js#buildUserQuotaContext used to inline. It was
// un-importable (index.js is the server entrypoint and exports nothing), which
// is precisely how the tier→entitlement revenue leak hid: every test exercised
// ensureWallet / effective-entitlements in isolation, never the gate that
// decides whether a chat turn is metered. Keep this module pure (no I/O) so the
// call-site integration test can drive it per tier.
import {
  APP_CHAT_SURFACE,
  HIRE_SURFACE,
  LEARNING_SURFACE,
  ZAKI_BOT_SURFACE,
  hasLocalUnlimitedQuotaBypass,
  isUnlimitedUser,
  resolveQuotaSurface,
} from "./daily-quota.js";
import { getAccessStatus } from "./effective-entitlements.js";
import { resolveEffectivePlatformEntitlement } from "./platform-entitlement-context.js";

// Mirror of index.js#resolveTier (V1 ladder passthrough). Kept local so this
// pure module has no dependency on the server entrypoint.
export function normalizeQuotaTier(tier) {
  return String(tier || "free").trim().toLowerCase() || "free";
}

// Decide whether a chat turn on `surface` is UNMETERED for this user.
//
// Contract (post tier→entitlement fix):
//   - Spaces chat (APP_CHAT_SURFACE): unmetered ONLY for the local-unlimited
//     bypass / super-admin (hasLocalUnlimitedQuotaBypass) or an active
//     access-code grant (spaces.uncapped / accessActive). A PAID subscription
//     (personal/pro/pro_max) is METERED — its turns debit the wallet and 429 at
//     the weekly cap.
//   - Agent / Learn / Hire surfaces: unmetered when the user holds product
//     access for that surface (the product they bought; metered separately by
//     that product's own meter).
export function isChatTurnUnlimited(
  zakiUser,
  { surface = APP_CHAT_SURFACE, env = process.env } = {}
) {
  const normalizedSurface = resolveQuotaSurface(surface);
  if (hasLocalUnlimitedQuotaBypass(zakiUser, env)) return true;

  const effective = resolveEffectivePlatformEntitlement(zakiUser, { env });
  if (normalizedSurface === ZAKI_BOT_SURFACE) {
    return Boolean(effective?.products?.agent?.access);
  }
  if (normalizedSurface === LEARNING_SURFACE) {
    return Boolean(effective?.products?.learn?.access);
  }
  if (normalizedSurface === HIRE_SURFACE) {
    return Boolean(effective?.products?.hire?.access);
  }
  // Spaces / app chat: bypass + access-code only. Paid tiers are metered.
  const access = getAccessStatus(zakiUser);
  return (
    Boolean(effective?.products?.spaces?.uncapped) ||
    isUnlimitedUser({ accessActive: access.active })
  );
}

// The full quota context index.js#buildUserQuotaContext returns. Pure wrapper so
// callers (and tests) get tier/status/access/effective/surface/unlimited in one
// shot from the same decision path the chat gate uses.
export function buildUserQuotaContext(
  zakiUser,
  { surface = APP_CHAT_SURFACE, env = process.env } = {}
) {
  const normalizedSurface = resolveQuotaSurface(surface);
  const tier = normalizeQuotaTier(zakiUser?.plan_tier || "free");
  const status = zakiUser?.plan_status || "inactive";
  const access = getAccessStatus(zakiUser);
  const effective = resolveEffectivePlatformEntitlement(zakiUser, { env });
  const unlimited = isChatTurnUnlimited(zakiUser, { surface: normalizedSurface, env });
  return { tier, status, access, effective, surface: normalizedSurface, unlimited };
}
