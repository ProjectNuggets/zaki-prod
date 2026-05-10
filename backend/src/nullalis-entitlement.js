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
  pro: "pro",
  personal: "pro",
  student: "pro",
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
