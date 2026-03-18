function normalizeTier(tier) {
  if (tier === "pro") return "personal";
  if (tier === "student" || tier === "personal") return tier;
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
  return (
    ["student", "personal"].includes(normalizeTier(tier)) &&
    ["active", "trialing", "past_due"].includes(normalizeStatus(status))
  );
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

export function getEffectiveEntitlementState(zakiUser, nowDate = new Date()) {
  const planTier = normalizeTier(zakiUser?.plan_tier || "free");
  const planStatus = normalizeStatus(zakiUser?.plan_status || "inactive");
  const access = getAccessStatus(zakiUser, nowDate);
  const subscriptionActive = isPaidActive(planTier, planStatus);

  if (subscriptionActive) {
    return {
      tier: planTier,
      status: planStatus,
      source: "subscription",
      premium: true,
      hasActiveSubscription: true,
      access,
    };
  }

  if (access.active) {
    return {
      tier: "personal",
      status: "active",
      source: "access_code",
      premium: true,
      hasActiveSubscription: false,
      access,
    };
  }

  return {
    tier: "free",
    status: planStatus === "canceled" ? "canceled" : "inactive",
    source: "free",
    premium: false,
    hasActiveSubscription: false,
    access,
  };
}
