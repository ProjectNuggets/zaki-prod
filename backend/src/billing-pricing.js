export const BILLING_INTERVALS = ["monthly", "yearly"];
export const STRIPE_BILLING_PLANS = ["student", "personal", "agent", "learn", "complete"];

function normalizePriceId(value) {
  return String(value || "").trim();
}

export function normalizeBillingInterval(value, fallback = "monthly") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (BILLING_INTERVALS.includes(normalized)) return normalized;
  return BILLING_INTERVALS.includes(fallback) ? fallback : "monthly";
}

export function buildStripePricingCatalog({
  studentMonthly = "",
  studentYearly = "",
  personalMonthly = "",
  personalYearly = "",
  agentMonthly = "",
  learnMonthly = "",
  completeMonthly = "",
} = {}) {
  const priceByPlanInterval = {
    student: {
      monthly: normalizePriceId(studentMonthly),
      yearly: normalizePriceId(studentYearly),
    },
    personal: {
      monthly: normalizePriceId(personalMonthly),
      yearly: normalizePriceId(personalYearly),
    },
    agent: {
      monthly: normalizePriceId(agentMonthly),
      yearly: "",
    },
    learn: {
      monthly: normalizePriceId(learnMonthly),
      yearly: "",
    },
    complete: {
      monthly: normalizePriceId(completeMonthly),
      yearly: "",
    },
  };

  const priceDetailsById = {};
  const tierByPrice = {};
  for (const [tier, byInterval] of Object.entries(priceByPlanInterval)) {
    for (const interval of BILLING_INTERVALS) {
      const priceId = normalizePriceId(byInterval?.[interval]);
      if (!priceId) continue;
      priceDetailsById[priceId] = { tier, interval };
      tierByPrice[priceId] = tier;
    }
  }

  const pricingAvailability = Object.fromEntries(
    STRIPE_BILLING_PLANS.map((plan) => [
      plan,
      {
        monthly: Boolean(priceByPlanInterval[plan]?.monthly),
        yearly: Boolean(priceByPlanInterval[plan]?.yearly),
      },
    ])
  );
  const hasAnyStripePrice = Object.values(pricingAvailability).some(
    (item) => item.monthly || item.yearly
  );

  return {
    priceByPlanInterval,
    priceDetailsById,
    tierByPrice,
    pricingAvailability,
    hasAnyStripePrice,
  };
}

export function resolveStripePriceForSelection(
  catalog,
  { plan, interval = "monthly" } = {}
) {
  const normalizedPlan = String(plan || "").trim().toLowerCase();
  const normalizedInterval = normalizeBillingInterval(interval, "monthly");
  if (!STRIPE_BILLING_PLANS.includes(normalizedPlan)) return "";
  return (
    normalizePriceId(
      catalog?.priceByPlanInterval?.[normalizedPlan]?.[normalizedInterval]
    ) || ""
  );
}

export function resolveStripePriceDetailsById(catalog, priceId) {
  const normalizedPriceId = normalizePriceId(priceId);
  if (!normalizedPriceId) return null;
  const found = catalog?.priceDetailsById?.[normalizedPriceId];
  if (!found) return null;
  const tier = String(found.tier || "").trim().toLowerCase();
  const interval = normalizeBillingInterval(found.interval, "monthly");
  if (!STRIPE_BILLING_PLANS.includes(tier)) return null;
  return { tier, interval };
}
