export const BILLING_INTERVALS = ["monthly", "yearly"];

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

  const pricingAvailability = {
    student: {
      monthly: Boolean(priceByPlanInterval.student.monthly),
      yearly: Boolean(priceByPlanInterval.student.yearly),
    },
    personal: {
      monthly: Boolean(priceByPlanInterval.personal.monthly),
      yearly: Boolean(priceByPlanInterval.personal.yearly),
    },
  };
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
  if (!["student", "personal"].includes(normalizedPlan)) return "";
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
  if (!["student", "personal"].includes(tier)) return null;
  return { tier, interval };
}
