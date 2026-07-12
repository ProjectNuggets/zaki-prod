import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";

const indexSource = readFileSync(new URL("./index.js", import.meta.url), "utf8");
const dbSource = readFileSync(new URL("./db.js", import.meta.url), "utf8");

describe("refund clawback production wiring", () => {
  it("persists refunds independently of top-up fulfillment order", () => {
    expect(dbSource).toContain("CREATE TABLE IF NOT EXISTS billing_payment_refunds");
    expect(dbSource).toContain("stripe_payment_intent_id TEXT PRIMARY KEY");
    expect(dbSource).toContain("fully_refunded BOOLEAN NOT NULL DEFAULT FALSE");
  });

  it("subtracts a pending refund before granting checkout units", () => {
    const start = indexSource.indexOf("async function fulfillTopupCheckoutSession(");
    const end = indexSource.indexOf("\nconst handleStripeRefundEvent", start);
    const fulfillment = indexSource.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(fulfillment.indexOf("lockPaymentIntentRefund(client, paymentIntent)")).toBeLessThan(
      fulfillment.indexOf("FROM billing_topup_orders")
    );
    expect(fulfillment).toContain("resolvePendingTopupRefund({");
    expect(fulfillment).toContain("const unitsToGrant = Math.max(0, units - pendingRefund.refundedUnits)");
    expect(fulfillment).toContain("[user.id, unitsToGrant]");
    expect(fulfillment).toContain("refunded_units = GREATEST(refunded_units, $8)");
  });
});
