const WHOLE_APP_PLANS = new Set(["complete", "legacy_personal"]);
const SINGLE_PRODUCT_PLANS = new Set(["agent", "learn"]);

function normalizePlan(value) {
  return String(value || "").trim().toLowerCase();
}

function currentPlanFromEffectiveEntitlement(effective) {
  const commercialPlanId = normalizePlan(effective?.commercial?.planId);
  if (commercialPlanId) return commercialPlanId;
  const tier = normalizePlan(effective?.tier);
  if (tier === "agent" || tier === "learn" || tier === "complete") return tier;
  if (tier === "personal" || tier === "student" || tier === "pro") return "legacy_personal";
  return "spaces_free";
}

export function resolveBillingPlanTransition(effective, requestedPlan) {
  const plan = normalizePlan(requestedPlan);
  const currentPlan = currentPlanFromEffectiveEntitlement(effective);
  const hasSubscription = Boolean(effective?.hasActiveSubscription);

  if (!hasSubscription) {
    return { allowed: true, mode: "checkout", currentPlan, plan };
  }

  if (currentPlan === plan) {
    return {
      allowed: false,
      reason: "already_on_plan",
      currentPlan,
      plan,
      message: "You are already subscribed to this plan.",
    };
  }

  if (WHOLE_APP_PLANS.has(currentPlan)) {
    return {
      allowed: false,
      reason: "already_included",
      currentPlan,
      plan,
      message: "Your current plan already includes this product.",
    };
  }

  if (SINGLE_PRODUCT_PLANS.has(currentPlan) && plan === "complete") {
    return { allowed: true, mode: "subscription_update", currentPlan, plan };
  }

  if (SINGLE_PRODUCT_PLANS.has(currentPlan) && SINGLE_PRODUCT_PLANS.has(plan)) {
    return {
      allowed: false,
      reason: "complete_required",
      currentPlan,
      plan,
      suggestedPlan: "complete",
      message: "Upgrade to ZAKI Complete to combine Agent and Learn.",
    };
  }

  return {
    allowed: false,
    reason: "unsupported_transition",
    currentPlan,
    plan,
    message: "This plan change is not available from your current subscription.",
  };
}
