import { describe, it, expect } from "@jest/globals";
import {
  BILLING_INTERVALS,
  STRIPE_BILLING_PLANS,
  STRIPE_COMMERCIAL_PLANS,
  buildTopupPackCatalog,
  buildStripePricingCatalog,
  isCheckoutablePlan,
  normalizeBillingInterval,
  resolveStripePriceDetailsById,
  resolveStripePriceForSelection,
  resolveTopupPack,
} from "./billing-pricing.js";

describe("billing pricing helpers", () => {
  it("normalizes interval values with monthly fallback", () => {
    expect(BILLING_INTERVALS).toEqual(["monthly", "yearly"]);
    expect(STRIPE_BILLING_PLANS).toEqual([
      "student",
      "personal",
      "pro",
      "pro_max",
    ]);
    expect(STRIPE_COMMERCIAL_PLANS).toEqual(["personal", "pro", "pro_max"]);
    expect(normalizeBillingInterval("yearly")).toBe("yearly");
    expect(normalizeBillingInterval("MONTHLY")).toBe("monthly");
    expect(normalizeBillingInterval("invalid")).toBe("monthly");
  });

  it("builds availability and lookup maps from configured prices", () => {
    const catalog = buildStripePricingCatalog({
      studentMonthly: "price_student_month",
      studentYearly: "price_student_year",
      personalMonthly: "price_personal_month",
      personalYearly: "",
      proMonthly: "price_pro_month",
      proMaxMonthly: "price_pro_max_month",
    });

    expect(catalog.hasAnyStripePrice).toBe(true);
    expect(catalog.pricingAvailability).toEqual({
      student: { monthly: true, yearly: true },
      personal: { monthly: true, yearly: false },
      pro: { monthly: true, yearly: false },
      pro_max: { monthly: true, yearly: false },
    });
    expect(catalog.tierByPrice).toEqual({
      price_student_month: "student",
      price_student_year: "student",
      price_personal_month: "personal",
      price_pro_month: "pro",
      price_pro_max_month: "pro_max",
    });
  });

  it("resolves selected prices by plan and interval", () => {
    const catalog = buildStripePricingCatalog({
      studentMonthly: "price_student_month",
      studentYearly: "price_student_year",
      personalMonthly: "price_personal_month",
      proMonthly: "price_pro_month",
      proMaxMonthly: "price_pro_max_month",
    });

    expect(
      resolveStripePriceForSelection(catalog, {
        plan: "student",
        interval: "monthly",
      })
    ).toBe("price_student_month");
    expect(
      resolveStripePriceForSelection(catalog, {
        plan: "student",
        interval: "yearly",
      })
    ).toBe("price_student_year");
    expect(
      resolveStripePriceForSelection(catalog, {
        plan: "personal",
        interval: "monthly",
      })
    ).toBe("price_personal_month");
    expect(
      resolveStripePriceForSelection(catalog, {
        plan: "personal",
        interval: "yearly",
      })
    ).toBe("");
    expect(
      resolveStripePriceForSelection(catalog, {
        plan: "pro",
        interval: "monthly",
      })
    ).toBe("price_pro_month");
    expect(
      resolveStripePriceForSelection(catalog, {
        plan: "pro_max",
        interval: "monthly",
      })
    ).toBe("price_pro_max_month");
  });

  it("rejects removed legacy plans (agent/learn/complete) when resolving a price", () => {
    const catalog = buildStripePricingCatalog({
      personalMonthly: "price_personal_month",
      proMonthly: "price_pro_month",
      proMaxMonthly: "price_pro_max_month",
    });

    expect(
      resolveStripePriceForSelection(catalog, { plan: "agent", interval: "monthly" })
    ).toBe("");
    expect(
      resolveStripePriceForSelection(catalog, { plan: "learn", interval: "monthly" })
    ).toBe("");
    expect(
      resolveStripePriceForSelection(catalog, { plan: "complete", interval: "monthly" })
    ).toBe("");
  });

  it("accepts the new tiers at checkout and rejects removed legacy plans", () => {
    // The checkout Zod enum is derived from STRIPE_BILLING_PLANS, so these are
    // exactly the plans checkout will accept.
    expect(isCheckoutablePlan("personal")).toBe(true);
    expect(isCheckoutablePlan("pro")).toBe(true);
    expect(isCheckoutablePlan("pro_max")).toBe(true);
    expect(isCheckoutablePlan("student")).toBe(true);
    expect(isCheckoutablePlan("PRO_MAX")).toBe(true);

    expect(isCheckoutablePlan("agent")).toBe(false);
    expect(isCheckoutablePlan("learn")).toBe(false);
    expect(isCheckoutablePlan("complete")).toBe(false);
    expect(isCheckoutablePlan("")).toBe(false);
  });

  it("each commercial tier resolves to a price when its env id is configured", () => {
    const catalog = buildStripePricingCatalog({
      personalMonthly: "price_personal_env",
      proMonthly: "price_pro_env",
      proMaxMonthly: "price_pro_max_env",
    });
    for (const plan of STRIPE_COMMERCIAL_PLANS) {
      expect(isCheckoutablePlan(plan)).toBe(true);
      expect(
        resolveStripePriceForSelection(catalog, { plan, interval: "monthly" })
      ).not.toBe("");
    }
  });

  it("resolves price details by price id", () => {
    const catalog = buildStripePricingCatalog({
      studentMonthly: "price_student_month",
      studentYearly: "price_student_year",
      personalMonthly: "price_personal_month",
      personalYearly: "price_personal_year",
      proMonthly: "price_pro_month",
      proMaxMonthly: "price_pro_max_month",
    });

    expect(resolveStripePriceDetailsById(catalog, "price_student_year")).toEqual({
      tier: "student",
      interval: "yearly",
    });
    expect(resolveStripePriceDetailsById(catalog, "price_personal_month")).toEqual({
      tier: "personal",
      interval: "monthly",
    });
    expect(resolveStripePriceDetailsById(catalog, "price_pro_month")).toEqual({
      tier: "pro",
      interval: "monthly",
    });
    expect(resolveStripePriceDetailsById(catalog, "price_pro_max_month")).toEqual({
      tier: "pro_max",
      interval: "monthly",
    });
    expect(resolveStripePriceDetailsById(catalog, "unknown")).toBeNull();
  });

  it("builds a config-driven top-up catalog and omits invalid packs", () => {
    const catalog = buildTopupPackCatalog(
      JSON.stringify([
        {
          id: "boost_500",
          label: "500 units",
          units: 500,
          stripePriceId: "price_topup_500",
          unitAmount: 900,
          currency: "USD",
        },
        { id: "bad_units", label: "bad", units: 0, stripePriceId: "price_bad" },
        { id: "missing_price", label: "100 units", units: 100 },
        { id: "boost_500", label: "duplicate", units: 999, stripePriceId: "price_dup" },
      ])
    );

    expect(catalog).toEqual([
      {
        id: "boost_500",
        label: "500 units",
        units: 500,
        stripePriceId: "price_topup_500",
        unitAmount: 900,
        currency: "usd",
        available: true,
      },
      {
        id: "missing_price",
        label: "100 units",
        units: 100,
        stripePriceId: "",
        unitAmount: null,
        currency: null,
        available: false,
      },
    ]);
    expect(resolveTopupPack(catalog, "BOOST_500")?.stripePriceId).toBe("price_topup_500");
    expect(resolveTopupPack(catalog, "unknown")).toBeNull();
    expect(buildTopupPackCatalog("{bad json")).toEqual([]);
  });
});
