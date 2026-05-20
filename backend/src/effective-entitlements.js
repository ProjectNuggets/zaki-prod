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
const LEGACY_PAID_TIERS = new Set(["student", "personal", "pro"]);
const COMMERCIAL_SUBSCRIPTION_PLANS = new Set(["agent", "learn", "hire", "complete"]);

function normalizeRawTier(tier) {
  const normalized = String(tier || "").trim().toLowerCase();
  if (normalized === "pro") return "personal";
  return normalized || "free";
}

function normalizeLegacyTier(tier) {
  const normalized = normalizeRawTier(tier);
  if (normalized === "student" || normalized === "personal") return normalized;
  return "free";
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

  return {
    spaces: {
      access: true,
      authenticated: Boolean(authenticated),
      memoryEligible: Boolean(authenticated),
      uncapped: hasWholeAppAccess,
      quota: hasWholeAppAccess ? "uncapped" : "metered",
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
  const legacyPlanTier = normalizeLegacyTier(rawPlanTier);
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
      tier: legacyPlanTier === "free" ? "personal" : legacyPlanTier,
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
