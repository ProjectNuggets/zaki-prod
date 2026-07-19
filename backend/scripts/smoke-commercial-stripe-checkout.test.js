import { describe, expect, it } from "@jest/globals";
import {
  buildCommercialSmokePlans,
  validateCommercialSmokePrice,
} from "./smoke-commercial-stripe-checkout.js";

describe("commercial Stripe checkout smoke plans", () => {
  it("checks every configured yearly Price without inventing an annual amount", () => {
    const plans = buildCommercialSmokePlans({
      STRIPE_PRICE_PERSONAL: "price_personal_month",
      STRIPE_PRICE_PRO: "price_pro_month",
      STRIPE_PRICE_PRO_MAX: "price_pro_max_month",
      STRIPE_PRICE_PERSONAL_YEARLY: "price_personal_year",
      STRIPE_PRICE_PRO_YEARLY: "price_pro_year",
      STRIPE_PRICE_PRO_MAX_YEARLY: "price_pro_max_year",
    });

    expect(plans).toEqual([
      { plan: "personal", interval: "monthly", price: "price_personal_month", expectedAmount: 1500 },
      { plan: "pro", interval: "monthly", price: "price_pro_month", expectedAmount: 4500 },
      { plan: "pro_max", interval: "monthly", price: "price_pro_max_month", expectedAmount: 9500 },
      {
        plan: "personal",
        interval: "yearly",
        price: "price_personal_year",
        expectedAmount: null,
        envName: "STRIPE_PRICE_PERSONAL_YEARLY",
      },
      {
        plan: "pro",
        interval: "yearly",
        price: "price_pro_year",
        expectedAmount: null,
        envName: "STRIPE_PRICE_PRO_YEARLY",
      },
      {
        plan: "pro_max",
        interval: "yearly",
        price: "price_pro_max_year",
        expectedAmount: null,
        envName: "STRIPE_PRICE_PRO_MAX_YEARLY",
      },
    ]);
  });

  it("omits only missing optional yearly Prices", () => {
    const plans = buildCommercialSmokePlans({
      STRIPE_PRICE_PERSONAL: "price_personal_month",
      STRIPE_PRICE_PRO: "price_pro_month",
      STRIPE_PRICE_PRO_MAX: "price_pro_max_month",
      STRIPE_PRICE_PRO_YEARLY: "price_pro_year",
    });

    expect(plans.filter((plan) => plan.interval === "yearly")).toEqual([
      {
        plan: "pro",
        interval: "yearly",
        price: "price_pro_year",
        expectedAmount: null,
        envName: "STRIPE_PRICE_PRO_YEARLY",
      },
    ]);
  });

  it("rejects multi-interval Stripe Prices", () => {
    const yearlyPlan = {
      plan: "pro",
      interval: "yearly",
      price: "price_pro_every_two_years",
      expectedAmount: null,
    };
    const biennialPrice = {
      livemode: true,
      active: true,
      currency: "usd",
      unit_amount: 90000,
      recurring: { interval: "year", interval_count: 2 },
    };

    expect(() => validateCommercialSmokePrice(biennialPrice, yearlyPlan)).toThrow(
      "must recur exactly once per interval"
    );
  });
});
