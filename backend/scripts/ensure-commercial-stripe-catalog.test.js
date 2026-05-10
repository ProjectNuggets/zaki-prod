import { describe, expect, it } from "@jest/globals";
import { buildCommercialPortalConfigurationPayload } from "./ensure-commercial-stripe-catalog.js";

describe("ensure commercial Stripe catalog", () => {
  it("builds a portal configuration that allows commercial plan updates", () => {
    const payload = buildCommercialPortalConfigurationPayload({
      appUrl: "https://app.chatzaki.com/",
      products: [
        { productId: "prod_agent", priceId: "price_agent" },
        { productId: "prod_learn", priceId: "price_learn" },
        { productId: "prod_complete", priceId: "price_complete" },
      ],
    });

    expect(payload.default_return_url).toBe("https://app.chatzaki.com/pricing?billing=manage");
    expect(payload.features.subscription_update).toMatchObject({
      enabled: true,
      default_allowed_updates: ["price"],
      proration_behavior: "create_prorations",
    });
    expect(payload.features.subscription_update.products).toEqual([
      { product: "prod_agent", prices: ["price_agent"] },
      { product: "prod_learn", prices: ["price_learn"] },
      { product: "prod_complete", prices: ["price_complete"] },
    ]);
    expect(payload.features.payment_method_update.enabled).toBe(true);
    expect(payload.features.invoice_history.enabled).toBe(true);
  });
});
