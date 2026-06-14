export const BILLING_INTERVALS = ["monthly", "yearly"];
export const STRIPE_BILLING_PLANS = ["student", "personal", "agent", "learn", "complete"];

function normalizePriceId(value) {
  return String(value || "").trim();
}

function normalizeTopupPackId(value) {
  const id = String(value || "").trim().toLowerCase();
  return /^[a-z0-9_-]{1,64}$/.test(id) ? id : "";
}

function normalizeCurrency(value) {
  const currency = String(value || "").trim().toLowerCase();
  return /^[a-z]{3}$/.test(currency) ? currency : null;
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

export function buildTopupPackCatalog(rawJson = "") {
  const raw = String(rawJson || "").trim();
  if (!raw) return [];

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const seen = new Set();
  const packs = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const id = normalizeTopupPackId(entry.id);
    if (!id || seen.has(id)) continue;

    const units = Number(entry.units);
    if (!Number.isFinite(units) || units <= 0) continue;

    const stripePriceId = normalizePriceId(entry.stripePriceId || entry.priceId);
    const label = String(entry.label || "").trim().slice(0, 80) || `${units} units`;
    const unitAmount =
      Number.isInteger(Number(entry.unitAmount)) && Number(entry.unitAmount) >= 0
        ? Number(entry.unitAmount)
        : null;
    const currency = normalizeCurrency(entry.currency);

    seen.add(id);
    packs.push({
      id,
      label,
      units,
      stripePriceId,
      unitAmount,
      currency,
      available: Boolean(stripePriceId),
    });
  }
  return packs;
}

export function resolveTopupPack(catalog, packId) {
  const id = normalizeTopupPackId(packId);
  if (!id) return null;
  return (Array.isArray(catalog) ? catalog : []).find((pack) => pack.id === id) || null;
}
