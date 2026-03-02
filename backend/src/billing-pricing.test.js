import { describe, it, expect } from "@jest/globals";
import {
  BILLING_INTERVALS,
  buildStripePricingCatalog,
  normalizeBillingInterval,
  resolveStripePriceDetailsById,
  resolveStripePriceForSelection,
} from "./billing-pricing.js";

describe("billing pricing helpers", () => {
  it("normalizes interval values with monthly fallback", () => {
    expect(BILLING_INTERVALS).toEqual(["monthly", "yearly"]);
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
    });

    expect(catalog.hasAnyStripePrice).toBe(true);
    expect(catalog.pricingAvailability).toEqual({
      student: { monthly: true, yearly: true },
      personal: { monthly: true, yearly: false },
    });
    expect(catalog.tierByPrice).toEqual({
      price_student_month: "student",
      price_student_year: "student",
      price_personal_month: "personal",
    });
  });

  it("resolves selected prices by plan and interval", () => {
    const catalog = buildStripePricingCatalog({
      studentMonthly: "price_student_month",
      studentYearly: "price_student_year",
      personalMonthly: "price_personal_month",
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
  });

  it("resolves price details by price id", () => {
    const catalog = buildStripePricingCatalog({
      studentMonthly: "price_student_month",
      studentYearly: "price_student_year",
      personalMonthly: "price_personal_month",
      personalYearly: "price_personal_year",
    });

    expect(resolveStripePriceDetailsById(catalog, "price_student_year")).toEqual({
      tier: "student",
      interval: "yearly",
    });
    expect(resolveStripePriceDetailsById(catalog, "price_personal_month")).toEqual({
      tier: "personal",
      interval: "monthly",
    });
    expect(resolveStripePriceDetailsById(catalog, "unknown")).toBeNull();
  });
});
