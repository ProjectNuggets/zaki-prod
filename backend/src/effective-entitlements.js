export const COMMERCIAL_PLAN_IDS = Object.freeze({
  SPACES_FREE: "spaces_free",
  AGENT: "agent",
  LEARN: "learn",
  HIRE: "hire",
  COMPLETE: "complete",
  LEGACY_PERSONAL: "legacy_personal",
  ACCESS_CODE: "access_code",
});

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);
// V1 commercial ladder: personal / pro / pro_max are first-class paid tiers.
// `pro` and `pro_max` MUST stay distinct here so isPaidActive(true) lights up
// premium + the per-tier wallet — previously `pro_max` was absent (→ free
// entitlement, Bug 3) and `pro` was folded into personal (Bug 2).
const LEGACY_PAID_TIERS = new Set(["student", "personal", "pro", "pro_max"]);
const COMMERCIAL_SUBSCRIPTION_PLANS = new Set(["agent", "learn", "hire", "complete"]);

function normalizeRawTier(tier) {
  // Pass the real tier through untouched. The historic `pro -> personal`
  // collapse here is what made every $45 USD Pro subscriber resolve as Personal
  // (Bug 2); the V1 ladder treats pro/pro_max as their own tiers.
  return String(tier || "").trim().toLowerCase() || "free";
}

// The effective tier surfaced on an ACTIVE subscription. The first-class paid
// ladder tiers (personal/pro/pro_max) and the legacy `student` grandfather tier
// surface their REAL tier so /api/entitlements + wallet sizing agree;
// previously pro/pro_max fell through to `personal` (Bug 2/3). Commercial
// product SKUs (agent/learn/hire/complete) have no ladder tier of their own and
// grandfather onto the `personal` label, matching prior behavior.
function resolveEffectiveLadderTier(rawTier) {
  const normalized = normalizeRawTier(rawTier);
  if (
    normalized === "personal" ||
    normalized === "pro" ||
    normalized === "pro_max" ||
    normalized === "student"
  ) {
    return normalized;
  }
  return "personal";
}

function normalizeStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  if (["active", "trialing", "past_due", "inactive", "canceled", "unpaid"].includes(value)) {
    return value;
  }
  return "inactive";
}

export function isPaidActive(tier, status) {
  const rawTier = normalizeRawTier(tier);
  return (
    (LEGACY_PAID_TIERS.has(rawTier) || COMMERCIAL_SUBSCRIPTION_PLANS.has(rawTier)) &&
    ACTIVE_SUBSCRIPTION_STATUSES.has(normalizeStatus(status))
  );
}

function hasValidSubscriptionPeriod(zakiUser, nowDate) {
  const value = zakiUser?.current_period_end;
  if (!value) return true;
  const periodEnd = new Date(value);
  const periodEndMs = periodEnd.getTime();
  if (!Number.isFinite(periodEndMs)) return false;
  return periodEndMs > nowDate.getTime();
}

function resolveSubscriptionCommercialPlanId(tier) {
  const normalized = normalizeRawTier(tier);
  if (normalized === "agent") return COMMERCIAL_PLAN_IDS.AGENT;
  if (normalized === "learn") return COMMERCIAL_PLAN_IDS.LEARN;
  if (normalized === "hire") return COMMERCIAL_PLAN_IDS.HIRE;
  if (normalized === "complete") return COMMERCIAL_PLAN_IDS.COMPLETE;
  if (LEGACY_PAID_TIERS.has(normalized)) return COMMERCIAL_PLAN_IDS.LEGACY_PERSONAL;
  return COMMERCIAL_PLAN_IDS.SPACES_FREE;
}

export function getAccessStatus(zakiUser, nowDate = new Date()) {
  const expiresAt = zakiUser?.access_expires_at ? new Date(zakiUser.access_expires_at) : null;
  const active = expiresAt ? expiresAt.getTime() > nowDate.getTime() : false;
  return {
    active,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    campaign: zakiUser?.access_code_campaign || null,
  };
}

function buildProductPermissions(planId, { authenticated = true } = {}) {
  const viaComplete = planId === COMMERCIAL_PLAN_IDS.COMPLETE;
  const viaLegacy = planId === COMMERCIAL_PLAN_IDS.LEGACY_PERSONAL;
  const viaAccessCode = planId === COMMERCIAL_PLAN_IDS.ACCESS_CODE;
  const hasWholeAppAccess = viaComplete || viaLegacy || viaAccessCode;
  const hasAgent = planId === COMMERCIAL_PLAN_IDS.AGENT || hasWholeAppAccess;
  const hasLearn = planId === COMMERCIAL_PLAN_IDS.LEARN || hasWholeAppAccess;
  const hasHire = planId === COMMERCIAL_PLAN_IDS.HIRE || hasWholeAppAccess;
  const hasPaidProduct = hasAgent || hasLearn || hasHire || hasWholeAppAccess;
  // Bug 1 fix — UNMETERED Spaces chat is a bypass/super-admin grant ONLY, never
  // a paid-subscription perk. Only the ACCESS_CODE plan (reached via the local
  // unlimited-quota bypass / super-admin override in
  // platform-entitlement-context, and via genuine access-code grants) is
  // uncapped. Paid ladder tiers (personal/pro/pro_max) and the legacy/complete
  // whole-app plans keep full PRODUCT access but stay METERED — their chat
  // turns debit the unit wallet and 429 at the weekly cap.
  const spacesUncapped = viaAccessCode;

  return {
    spaces: {
      access: true,
      authenticated: Boolean(authenticated),
      memoryEligible: Boolean(authenticated),
      uncapped: spacesUncapped,
      quota: spacesUncapped ? "uncapped" : "metered",
    },
    agent: {
      access: hasAgent,
      preview: !hasAgent,
      weeklyFreeMessages: hasAgent ? null : 10,
    },
    learn: {
      access: hasLearn,
      preview: !hasLearn,
      weeklyFreeActions: hasLearn ? null : 10,
    },
    hire: {
      access: hasHire,
      preview: !hasHire,
      weeklyFreeActions: hasHire ? null : 10,
    },
    billing: {
      paid: hasPaidProduct,
      wholeApp: hasWholeAppAccess,
      grandfathered: viaLegacy,
    },
  };
}

export function getCommercialPlanState({
  source = "free",
  tier = "free",
  accessActive = false,
} = {}) {
  if (source === "access_code" || accessActive) {
    const planId = COMMERCIAL_PLAN_IDS.ACCESS_CODE;
    return {
      planId,
      label: "Access Code",
      source: "access_code",
      products: buildProductPermissions(planId),
    };
  }

  if (source === "subscription") {
    const planId = resolveSubscriptionCommercialPlanId(tier);
    const labelByPlanId = {
      [COMMERCIAL_PLAN_IDS.AGENT]: "ZAKI Agent",
      [COMMERCIAL_PLAN_IDS.LEARN]: "ZAKI Learn",
      [COMMERCIAL_PLAN_IDS.HIRE]: "ZAKI Hire",
      [COMMERCIAL_PLAN_IDS.COMPLETE]: "ZAKI Complete",
      [COMMERCIAL_PLAN_IDS.LEGACY_PERSONAL]: "ZAKI Complete",
    };
    return {
      planId,
      label: labelByPlanId[planId] || "Spaces Free",
      source: "subscription",
      products: buildProductPermissions(planId),
    };
  }

  const planId = COMMERCIAL_PLAN_IDS.SPACES_FREE;
  return {
    planId,
    label: "Spaces Free",
    source: "free",
    products: buildProductPermissions(planId),
  };
}

export function getEffectiveEntitlementState(zakiUser, nowDate = new Date()) {
  const rawPlanTier = normalizeRawTier(zakiUser?.plan_tier || "free");
  const planStatus = normalizeStatus(zakiUser?.plan_status || "inactive");
  const access = getAccessStatus(zakiUser, nowDate);
  const subscriptionActive =
    isPaidActive(rawPlanTier, planStatus) && hasValidSubscriptionPeriod(zakiUser, nowDate);

  if (subscriptionActive) {
    const commercial = getCommercialPlanState({
      source: "subscription",
      tier: rawPlanTier,
      accessActive: access.active,
    });
    return {
      tier: resolveEffectiveLadderTier(rawPlanTier),
      status: planStatus,
      source: "subscription",
      premium: true,
      hasActiveSubscription: true,
      access,
      commercial,
      products: commercial.products,
    };
  }

  if (access.active) {
    const commercial = getCommercialPlanState({
      source: "access_code",
      tier: rawPlanTier,
      accessActive: true,
    });
    return {
      tier: "personal",
      status: "active",
      source: "access_code",
      premium: true,
      hasActiveSubscription: false,
      access,
      commercial,
      products: commercial.products,
    };
  }

  const commercial = getCommercialPlanState({
    source: "free",
    tier: rawPlanTier,
    accessActive: false,
  });
  return {
    tier: "free",
    status: planStatus === "canceled" ? "canceled" : "inactive",
    source: "free",
    premium: false,
    hasActiveSubscription: false,
    access,
    commercial,
    products: commercial.products,
  };
}
