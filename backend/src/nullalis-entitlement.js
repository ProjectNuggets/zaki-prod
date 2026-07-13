// Translate zaki-prod's internal billing state into the tuple
// nullalis expects on POST /api/v1/users/provision (S2.1,
// NULL-ALIS#10). Mappings are authoritative per Nova sign-off on
// PR #5; update this file if the product taxonomy changes.

// Why a BFF-side map: nullalis speaks "free|pro|team|enterprise" and
// zaki brands Stripe's Pro SKU as "personal" (plus a "student"
// discount variant). Doing the translation here keeps nullalis
// taxonomy clean and keeps product branding on the product side.
export const TIER_MAP = Object.freeze({
  free: "free",
  // New commercial tiers (personal/pro/pro_max). All paid platform tiers map to
  // nullalis "pro" — nullalis only distinguishes free vs. entitled.
  personal: "pro",
  pro: "pro",
  pro_max: "pro",
  student: "pro",
  // Legacy/grandfathered tiers that may still live on existing user rows.
  agent: "pro",
  learn: "pro",
  complete: "pro",
  legacy_personal: "pro",
});

// Stripe subscription statuses zaki stores raw vs. the four states
// nullalis accepts. trialing/unpaid/incomplete are still-billable
// states, so we conservatively keep access (active or past_due).
// incomplete_expired and inactive are terminal → expired.
export const STATUS_MAP = Object.freeze({
  active: "active",
  trialing: "active",
  past_due: "past_due",
  unpaid: "past_due",
  incomplete: "past_due",
  canceled: "canceled",
  incomplete_expired: "expired",
  inactive: "expired",
});

export function mapPlanTier(zakiTier) {
  const key = String(zakiTier || "").trim().toLowerCase();
  return TIER_MAP[key] || "free";
}

export function mapPlanStatus(zakiStatus) {
  const key = String(zakiStatus || "").trim().toLowerCase();
  return STATUS_MAP[key] || "expired";
}

export function toPeriodEndUnix(currentPeriodEnd) {
  if (currentPeriodEnd === null || currentPeriodEnd === undefined) return null;
  if (typeof currentPeriodEnd === "number") {
    if (!Number.isFinite(currentPeriodEnd)) return null;
    // Heuristic: values below year-2500-in-seconds are already unix seconds;
    // larger integers are almost certainly milliseconds.
    return currentPeriodEnd > 1e12
      ? Math.floor(currentPeriodEnd / 1000)
      : Math.floor(currentPeriodEnd);
  }
  const parsed =
    currentPeriodEnd instanceof Date
      ? currentPeriodEnd.getTime()
      : Date.parse(String(currentPeriodEnd));
  if (!Number.isFinite(parsed)) return null;
  return Math.floor(parsed / 1000);
}

export function buildEntitlementFields(zakiUserRow) {
  if (!zakiUserRow || typeof zakiUserRow !== "object") return null;
  return {
    plan_tier: mapPlanTier(zakiUserRow.plan_tier),
    status: mapPlanStatus(zakiUserRow.plan_status),
    period_end_unix: toPeriodEndUnix(zakiUserRow.current_period_end),
  };
}

// Owner-only super-admin bypass of the AGENT entitlement paywall.
// The nullalis ENGINE caches the entitlement tuple it receives at PROVISION
// time (POST /api/v1/users/provision) and returns 402 entitlement_inactive on
// chat when that cached status is expired/canceled. For an allowlisted
// super-admin we send the engine an entitled tuple REGARDLESS of the DB
// tier/status, so the engine provisions them entitled and never 402s them.
//
// This ONLY affects the entitlement payload sent to the engine. Wallet
// metering (reserve/settle) is a separate path and is intentionally NOT
// touched here — super-admins still debit units like everyone else.
export const SUPER_ADMIN_ENTITLEMENT = Object.freeze({
  plan_tier: "pro",
  status: "active",
  period_end_unix: null,
});

// Pure override: given the DB-derived entitlement (possibly null on soft-fail)
// and whether the authenticated caller is a super-admin, return the tuple to
// send to the engine. Non-super-admins get the input back untouched (same
// reference). buildEntitlementFields stays a pure DB-state mapper, and none of
// these engine-bound transforms touch Stripe/Creem billing-write paths.
export function applySuperAdminEntitlementOverride(entitlement, { isSuperAdmin = false } = {}) {
  if (!isSuperAdmin) return entitlement;
  return { ...SUPER_ADMIN_ENTITLEMENT };
}

function canRuntimeEntitlementAct(entitlement, nowUnix) {
  if (!entitlement) return false;
  if (entitlement.status === "active" || entitlement.status === "past_due") return true;
  return (
    entitlement.status === "canceled" &&
    Number.isFinite(entitlement.period_end_unix) &&
    entitlement.period_end_unix > nowUnix
  );
}

// Nullalis still has a legacy subscription-status gate even though zaki-prod's
// unit wallet is the commercial source of truth for Agent turns. After the BFF
// meter gate allows a turn (reserved or explicit fail-open), give an otherwise
// inactive engine entitlement a bounded canceled-period lease. Nullalis canAct
// accepts that tuple only until period_end_unix, avoiding an indefinite global
// activation in the process-wide entitlement cache. Already-valid paid or
// super-admin tuples pass through unchanged.
export function buildAgentRuntimeEntitlementFields(
  zakiUserRow,
  {
    isSuperAdmin = false,
    nowUnix = Math.floor(Date.now() / 1000),
    meterAuthorizedUntilUnix = null,
  } = {}
) {
  const entitlement = applySuperAdminEntitlementOverride(
    buildEntitlementFields(zakiUserRow),
    { isSuperAdmin }
  );
  const authorizationEnd = Number(meterAuthorizedUntilUnix);
  if (
    !Number.isFinite(authorizationEnd) ||
    authorizationEnd <= nowUnix ||
    canRuntimeEntitlementAct(entitlement, nowUnix)
  ) {
    return entitlement;
  }
  return {
    plan_tier: entitlement?.plan_tier || "free",
    status: "canceled",
    period_end_unix: Math.floor(authorizationEnd),
  };
}
