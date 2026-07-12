import { describe, expect, it, jest } from "@jest/globals";
import {
  clawbackTopupByPaymentIntent,
  computeRefundedTopupUnits,
  createRefundClawbackHandler,
  resolvePendingTopupRefund,
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
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 11,
          user_id: 7,
          status: "fulfilled",
          units: 500,
          amount_total_cents: 1000,
          refunded_units: 0,
          refunded_amount_cents: 0,
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ refunded_amount_cents: 1000, fully_refunded: true, latest_event_id: "evt_refund" }],
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
    expect(query.mock.calls[3][0]).toContain("topup_units = GREATEST(0, topup_units - $2)");
    expect(query.mock.calls[3][1]).toEqual([7, 500]);
    expect(query.mock.calls[4][1]).toEqual([11, 500, 1000, "evt_refund"]);
  });

  it("is idempotent when a replay arrives after the wallet mutation committed", async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 11,
          user_id: 7,
          status: "fulfilled",
          units: 500,
          amount_total_cents: 1000,
          refunded_units: 500,
          refunded_amount_cents: 1000,
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ refunded_amount_cents: 1000, fully_refunded: true, latest_event_id: "evt_refund_replay" }],
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
    expect(query).toHaveBeenCalledTimes(4);
    expect(query.mock.calls[3][0]).toContain("UPDATE billing_topup_orders");
  });

  it("resolves a credit note through its refund and uses cumulative charge totals", async () => {
    const stripe = {
      refunds: { retrieve: jest.fn(async () => ({ id: "re_1", payment_intent: "pi_1", charge: "ch_1", amount: 500 })) },
      charges: { retrieve: jest.fn(async () => ({ id: "ch_1", payment_intent: "pi_1", customer: "cus_1", amount_refunded: 1000, refunded: true })) },
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
      invoiceId: "in_1",
      subscriptionId: "sub_1",
      refundedAmountCents: 1000,
      fullRefund: true,
      isPaymentRefund: true,
    });
  });

  it("persists an out-of-order refund for checkout fulfillment to consume later", async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ refunded_amount_cents: 1000, fully_refunded: true, latest_event_id: "evt_early" }],
      });

    const result = await clawbackTopupByPaymentIntent({
      withDbTransaction: (callback) => callback({ query }),
      paymentIntentId: "pi_early",
      refundedAmountCents: 1000,
      fullRefund: true,
      eventId: "evt_early",
    });

    expect(result).toMatchObject({ handled: false, pending: true, reason: "topup_not_found" });
    expect(query.mock.calls[0][0]).toContain("pg_advisory_xact_lock");
    expect(query.mock.calls[1][0]).toContain("FROM billing_topup_orders");
    expect(query.mock.calls[2][0]).toContain("INSERT INTO billing_payment_refunds");
  });

  it("turns a persisted pre-fulfillment refund into zero grantable units", async () => {
    const client = {
      query: jest.fn(async () => ({
        rows: [{ refunded_amount_cents: 1000, fully_refunded: true, latest_event_id: "evt_early" }],
      })),
    };

    await expect(
      resolvePendingTopupRefund({
        client,
        paymentIntentId: "pi_early",
        grantedUnits: 500,
        amountTotalCents: 1000,
      })
    ).resolves.toEqual({
      refundedUnits: 500,
      refundedAmountCents: 1000,
      fullRefund: true,
      eventId: "evt_early",
    });
  });

  it("immediately revokes a refunded subscription when no top-up order owns the payment", async () => {
    const query = jest.fn(async () => ({ rows: [] }));
    const dbQuery = jest.fn(async () => ({ rowCount: 1 }));
    const revoke = jest.fn(async () => ({ ok: true }));
    const ensureWalletForPlan = jest.fn(async () => ({}));
    const handler = createRefundClawbackHandler({
      stripe: {
        subscriptions: {
          retrieve: jest.fn(async () => ({
            id: "sub_1",
            status: "active",
            current_period_end: 1769302800,
            cancel_at_period_end: false,
            latest_invoice: "in_1",
          })),
        },
      },
      withDbTransaction: (callback) => callback({ query }),
      resolveUserByStripeCustomer: jest.fn(async () => ({ id: 7, plan_tier: "pro", plan_status: "active" })),
      dbQuery,
      revokeNullalisEntitlement: revoke,
      ensureWalletForPlan,
    });

    const result = await handler({
      event: {
        type: "charge.refunded",
        created: 1766710800,
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
    expect(dbQuery.mock.calls[0][0]).toContain("plan_status = $1");
    expect(dbQuery.mock.calls[0][0]).toContain("stripe_last_event_created_at = CASE");
    expect(dbQuery.mock.calls[0][1][0]).toBe("unpaid");
    expect(dbQuery.mock.calls[0][1][3]).toBe("2025-12-26T01:00:00.000Z");
    expect(ensureWalletForPlan).toHaveBeenCalledWith({ userId: 7, planId: "free" });
    expect(revoke).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, plan_tier: "pro", plan_status: "unpaid" }),
      { requestId: "req_1" }
    );
  });

  it("does not revoke an active subscription for a partial refund", async () => {
    const resolveUser = jest.fn();
    const handler = createRefundClawbackHandler({
      stripe: {},
      withDbTransaction: jest.fn(),
      resolveUserByStripeCustomer: resolveUser,
      dbQuery: jest.fn(),
      revokeNullalisEntitlement: jest.fn(),
      ensureWalletForPlan: jest.fn(),
    });

    const result = await handler({
      event: {
        type: "charge.refunded",
        data: {
          object: {
            payment_intent: "pi_subscription",
            customer: "cus_1",
            invoice: { id: "in_1", subscription: "sub_1" },
            amount_refunded: 100,
            refunded: false,
          },
        },
      },
      eventId: "evt_partial_subscription_refund",
    });

    expect(result.subscriptionRevoked).toBe(false);
    expect(resolveUser).not.toHaveBeenCalled();
  });

  it("does not revoke a renewed subscription when an older invoice is refunded", async () => {
    const resolveUser = jest.fn();
    const handler = createRefundClawbackHandler({
      stripe: {
        subscriptions: {
          retrieve: jest.fn(async () => ({
            id: "sub_1",
            status: "active",
            latest_invoice: "in_current",
          })),
        },
      },
      withDbTransaction: jest.fn(),
      resolveUserByStripeCustomer: resolveUser,
      dbQuery: jest.fn(),
      revokeNullalisEntitlement: jest.fn(),
      ensureWalletForPlan: jest.fn(),
    });

    const result = await handler({
      event: {
        type: "charge.refunded",
        data: {
          object: {
            payment_intent: "pi_old",
            customer: "cus_1",
            invoice: { id: "in_old", subscription: "sub_1" },
            amount_refunded: 1000,
            refunded: true,
          },
        },
      },
      eventId: "evt_old_invoice_refund",
    });

    expect(result.subscriptionRevoked).toBe(false);
    expect(resolveUser).not.toHaveBeenCalled();
  });

  it("throws on a non-ok entitlement revoke so Stripe retries the refund event", async () => {
    const handler = createRefundClawbackHandler({
      stripe: {
        subscriptions: {
          retrieve: jest.fn(async () => ({ id: "sub_1", status: "active", latest_invoice: "in_1" })),
        },
      },
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
