import { describe, expect, it } from "@jest/globals";
import {
  CATALOG_VERSION,
  PRODUCTS,
  envNameForPlan,
  buildCommercialPortalConfigurationPayload,
} from "./ensure-commercial-stripe-catalog.js";

describe("ensure commercial Stripe catalog", () => {
  it("defines the personal/pro/pro_max tiers with the expected amounts", () => {
    expect(PRODUCTS.map((product) => product.plan)).toEqual([
      "personal",
      "pro",
      "pro_max",
    ]);
    const byPlan = Object.fromEntries(
      PRODUCTS.map((product) => [product.plan, product])
    );
    expect(byPlan.personal.monthlyUnitAmount).toBe(1500);
    expect(byPlan.pro.monthlyUnitAmount).toBe(4500);
    expect(byPlan.pro_max.monthlyUnitAmount).toBe(9900);
    expect(byPlan.personal.name).toBe("ZAKI Personal");
    expect(byPlan.pro.name).toBe("ZAKI Pro");
    expect(byPlan.pro_max.name).toBe("ZAKI Pro Max");
    // Each tier has a fresh, unique lookup key for the new catalog version.
    const lookupKeys = PRODUCTS.map((product) => product.lookupKey);
    expect(new Set(lookupKeys).size).toBe(lookupKeys.length);
    expect(CATALOG_VERSION).toContain("tiers-personal-pro-promax");
  });

  it("maps each plan to its suffix-less deployed env var name", () => {
    expect(envNameForPlan("personal")).toBe("STRIPE_PRICE_PERSONAL");
    expect(envNameForPlan("pro")).toBe("STRIPE_PRICE_PRO");
    expect(envNameForPlan("pro_max")).toBe("STRIPE_PRICE_PRO_MAX");
  });

  it("builds a portal configuration that allows commercial plan updates", () => {
    const payload = buildCommercialPortalConfigurationPayload({
      appUrl: "https://app.chatzaki.com/",
      products: [
        { productId: "prod_personal", priceId: "price_personal" },
        { productId: "prod_pro", priceId: "price_pro" },
        { productId: "prod_pro_max", priceId: "price_pro_max" },
      ],
    });

    expect(payload.default_return_url).toBe("https://app.chatzaki.com/pricing?billing=manage");
    expect(payload.features.subscription_update).toMatchObject({
      enabled: true,
      default_allowed_updates: ["price"],
      proration_behavior: "create_prorations",
    });
    expect(payload.features.subscription_update.products).toEqual([
      { product: "prod_personal", prices: ["price_personal"] },
      { product: "prod_pro", prices: ["price_pro"] },
      { product: "prod_pro_max", prices: ["price_pro_max"] },
    ]);
    expect(payload.features.payment_method_update.enabled).toBe(true);
    expect(payload.features.invoice_history.enabled).toBe(true);
  });
});
