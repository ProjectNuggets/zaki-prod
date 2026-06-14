import { describe, it, expect } from "@jest/globals";
import {
  BILLING_INTERVALS,
  STRIPE_BILLING_PLANS,
  buildTopupPackCatalog,
  buildStripePricingCatalog,
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
      "agent",
      "learn",
      "complete",
    ]);
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
      agentMonthly: "price_agent_month",
      learnMonthly: "price_learn_month",
      completeMonthly: "price_complete_month",
    });

    expect(catalog.hasAnyStripePrice).toBe(true);
    expect(catalog.pricingAvailability).toEqual({
      student: { monthly: true, yearly: true },
      personal: { monthly: true, yearly: false },
      agent: { monthly: true, yearly: false },
      learn: { monthly: true, yearly: false },
      complete: { monthly: true, yearly: false },
    });
    expect(catalog.tierByPrice).toEqual({
      price_student_month: "student",
      price_student_year: "student",
      price_personal_month: "personal",
      price_agent_month: "agent",
      price_learn_month: "learn",
      price_complete_month: "complete",
    });
  });

  it("resolves selected prices by plan and interval", () => {
    const catalog = buildStripePricingCatalog({
      studentMonthly: "price_student_month",
      studentYearly: "price_student_year",
      personalMonthly: "price_personal_month",
      agentMonthly: "price_agent_month",
      learnMonthly: "price_learn_month",
      completeMonthly: "price_complete_month",
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
        interval: "yearly",
      })
    ).toBe("");
    expect(
      resolveStripePriceForSelection(catalog, {
        plan: "agent",
        interval: "monthly",
      })
    ).toBe("price_agent_month");
    expect(
      resolveStripePriceForSelection(catalog, {
        plan: "learn",
        interval: "monthly",
      })
    ).toBe("price_learn_month");
    expect(
      resolveStripePriceForSelection(catalog, {
        plan: "complete",
        interval: "monthly",
      })
    ).toBe("price_complete_month");
  });

  it("resolves price details by price id", () => {
    const catalog = buildStripePricingCatalog({
      studentMonthly: "price_student_month",
      studentYearly: "price_student_year",
      personalMonthly: "price_personal_month",
      personalYearly: "price_personal_year",
      agentMonthly: "price_agent_month",
      learnMonthly: "price_learn_month",
      completeMonthly: "price_complete_month",
    });

    expect(resolveStripePriceDetailsById(catalog, "price_student_year")).toEqual({
      tier: "student",
      interval: "yearly",
    });
    expect(resolveStripePriceDetailsById(catalog, "price_personal_month")).toEqual({
      tier: "personal",
      interval: "monthly",
    });
    expect(resolveStripePriceDetailsById(catalog, "price_agent_month")).toEqual({
      tier: "agent",
      interval: "monthly",
    });
    expect(resolveStripePriceDetailsById(catalog, "price_learn_month")).toEqual({
      tier: "learn",
      interval: "monthly",
    });
    expect(resolveStripePriceDetailsById(catalog, "price_complete_month")).toEqual({
      tier: "complete",
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
