import { describe, expect, it, jest } from "@jest/globals";
import {
  clawbackTopupByPaymentIntent,
  computeRefundedTopupUnits,
  createRefundClawbackHandler,
  resolveStripeRefundContext,
} from "./billing-refund-clawback.js";

describe("refund clawback", () => {
  it("rounds partial refunds up and clamps the clawback to granted units", () => {
    expect(
      computeRefundedTopupUnits({
        grantedUnits: 500,
        amountTotalCents: 999,
        refundedAmountCents: 100,
      })
    ).toBe(51);
    expect(
      computeRefundedTopupUnits({
        grantedUnits: 500,
        amountTotalCents: 999,
        refundedAmountCents: 5_000,
      })
    ).toBe(500);
  });

  it("clamps the wallet at zero and records cumulative refunded units atomically", async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [{
          id: 11,
          user_id: 7,
          units: 500,
          amount_total_cents: 1000,
          refunded_units: 0,
          refunded_amount_cents: 0,
        }],
      })
      .mockResolvedValue({ rows: [] });
    const result = await clawbackTopupByPaymentIntent({
      withDbTransaction: (callback) => callback({ query }),
      paymentIntentId: "pi_topup",
      refundedAmountCents: 1000,
      fullRefund: true,
      eventId: "evt_refund",
    });

    expect(result).toMatchObject({ handled: true, duplicate: false, unitsClawedBack: 500 });
    expect(query.mock.calls[1][0]).toContain("topup_units = GREATEST(0, topup_units - $2)");
    expect(query.mock.calls[1][1]).toEqual([7, 500]);
    expect(query.mock.calls[2][1]).toEqual([11, 500, 1000, "evt_refund"]);
  });

  it("is idempotent when a replay arrives after the wallet mutation committed", async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [{
          id: 11,
          user_id: 7,
          units: 500,
          amount_total_cents: 1000,
          refunded_units: 500,
          refunded_amount_cents: 1000,
        }],
      })
      .mockResolvedValue({ rows: [] });
    const result = await clawbackTopupByPaymentIntent({
      withDbTransaction: (callback) => callback({ query }),
      paymentIntentId: "pi_topup",
      refundedAmountCents: 1000,
      fullRefund: true,
      eventId: "evt_refund_replay",
    });

    expect(result).toMatchObject({ handled: true, duplicate: true, unitsClawedBack: 0 });
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][0]).toContain("UPDATE billing_topup_orders");
  });

  it("resolves a credit note through its refund and invoice", async () => {
    const stripe = {
      refunds: { retrieve: jest.fn(async () => ({ id: "re_1", payment_intent: "pi_1", amount: 500 })) },
      invoices: { retrieve: jest.fn(async () => ({ id: "in_1", customer: "cus_1", subscription: "sub_1" })) },
    };
    const context = await resolveStripeRefundContext({
      event: {
        type: "credit_note.created",
        data: { object: { id: "cn_1", refund: "re_1", invoice: "in_1", customer: "cus_1" } },
      },
      stripe,
    });

    expect(context).toEqual({
      paymentIntentId: "pi_1",
      customerId: "cus_1",
      subscriptionId: "sub_1",
      refundedAmountCents: 500,
      fullRefund: false,
    });
  });

  it("immediately revokes a refunded subscription when no top-up order owns the payment", async () => {
    const query = jest.fn(async () => ({ rows: [] }));
    const dbQuery = jest.fn(async () => ({ rowCount: 1 }));
    const revoke = jest.fn(async () => ({ ok: true }));
    const ensureWalletForPlan = jest.fn(async () => ({}));
    const handler = createRefundClawbackHandler({
      stripe: {},
      withDbTransaction: (callback) => callback({ query }),
      resolveUserByStripeCustomer: jest.fn(async () => ({ id: 7, plan_tier: "pro", plan_status: "active" })),
      dbQuery,
      revokeNullalisEntitlement: revoke,
      ensureWalletForPlan,
    });

    const result = await handler({
      event: {
        type: "charge.refunded",
        data: {
          object: {
            payment_intent: "pi_subscription",
            customer: "cus_1",
            invoice: { id: "in_1", subscription: "sub_1", customer: "cus_1" },
            amount: 1000,
            amount_refunded: 1000,
            refunded: true,
          },
        },
      },
      eventId: "evt_subscription_refund",
      requestId: "req_1",
    });

    expect(result.subscriptionRevoked).toBe(true);
    expect(dbQuery.mock.calls[0][0]).toContain("plan_tier = 'free'");
    expect(dbQuery.mock.calls[0][0]).toContain("plan_status = 'canceled'");
    expect(ensureWalletForPlan).toHaveBeenCalledWith({ userId: 7, planId: "free" });
    expect(revoke).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, plan_tier: "free", plan_status: "canceled" }),
      { requestId: "req_1" }
    );
  });

  it("throws on a non-ok entitlement revoke so Stripe retries the refund event", async () => {
    const handler = createRefundClawbackHandler({
      stripe: {},
      withDbTransaction: (callback) => callback({ query: jest.fn(async () => ({ rows: [] })) }),
      resolveUserByStripeCustomer: jest.fn(async () => ({ id: 7, plan_tier: "pro", plan_status: "active" })),
      dbQuery: jest.fn(async () => ({ rowCount: 1 })),
      revokeNullalisEntitlement: jest.fn(async () => ({ ok: false, status: 503 })),
      ensureWalletForPlan: jest.fn(async () => ({})),
    });

    await expect(
      handler({
        event: {
          type: "charge.refunded",
          data: {
            object: {
              payment_intent: "pi_subscription",
              customer: "cus_1",
              invoice: { id: "in_1", subscription: "sub_1" },
              amount_refunded: 1000,
              refunded: true,
            },
          },
        },
        eventId: "evt_retry_revoke",
      })
    ).rejects.toThrow("entitlement revoke failed");
  });
});
