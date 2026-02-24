import { describe, it, expect, jest } from "@jest/globals";
import { createStripeWebhookHandler } from "./billing-stripe-webhook-handler.js";

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function invoke(handler, { body = Buffer.from("{}"), headers = {}, path = "/api/billing/webhook" } = {}) {
  const req = {
    body,
    headers,
    path,
    requestId: "req-test-1",
  };
  const res = createMockRes();
  await handler(req, res);
  return res;
}

function createDependencies({ event, constructError = null, markResult = true, resolvedUser = null } = {}) {
  const stripe = {
    webhooks: {
      constructEvent: jest.fn(() => {
        if (constructError) throw constructError;
        return event;
      }),
    },
  };
  return {
    getBillingConfigStatus: () => ({ provider: "stripe" }),
    stripe,
    stripeWebhookSecret: "whsec_test",
    markWebhookEventProcessed: jest.fn(async () => markResult),
    billingHealth: {
      recordReceived: jest.fn(),
      recordDuplicate: jest.fn(),
      recordProcessed: jest.fn(),
      recordFailure: jest.fn(),
    },
    emitBillingAlert: jest.fn(async () => undefined),
    normalizeEmail: (value) => String(value || "").trim().toLowerCase(),
    dbGet: jest.fn(async () => null),
    dbQuery: jest.fn(async () => ({ rowCount: 1 })),
    resolveUserByStripeCustomer: jest.fn(async () => resolvedUser),
    resolveTier: (value) => String(value || "free").trim().toLowerCase(),
    tierByPrice: {
      price_student: "student",
      price_personal: "personal",
    },
  };
}

describe("stripe webhook handler integration", () => {
  it("returns 400 for missing stripe signature", async () => {
    const deps = createDependencies({
      event: { id: "evt_1", type: "checkout.session.completed", data: { object: {} } },
    });
    const handler = createStripeWebhookHandler(deps);

    const res = await invoke(handler, { headers: {} });
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Missing Stripe signature." });
    expect(deps.emitBillingAlert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "stripe.webhook.missing_signature" })
    );
  });

  it("returns 400 for invalid stripe signature payload", async () => {
    const deps = createDependencies({
      event: null,
      constructError: new Error("No signatures found matching expected signature for payload"),
    });
    const handler = createStripeWebhookHandler(deps);

    const res = await invoke(handler, { headers: { "stripe-signature": "bad_signature" } });
    expect(res.statusCode).toBe(400);
    expect(String(res.body || "")).toContain("Webhook Error:");
    expect(deps.emitBillingAlert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "stripe.webhook.invalid_signature" })
    );
  });

  it("returns duplicate acknowledgement when event was already processed", async () => {
    const event = {
      id: "evt_duplicate",
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_1",
          customer_email: "owner@example.com",
          metadata: {},
        },
      },
    };
    const deps = createDependencies({ event, markResult: false });
    const handler = createStripeWebhookHandler(deps);

    const res = await invoke(handler, { headers: { "stripe-signature": "sig_ok" } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true, duplicate: true });
    expect(deps.billingHealth.recordDuplicate).toHaveBeenCalledWith(
      "stripe",
      expect.objectContaining({ eventId: "evt_duplicate" })
    );
    expect(deps.dbQuery).not.toHaveBeenCalled();
  });

  it("skips stale out-of-order subscription events", async () => {
    const event = {
      id: "evt_old",
      type: "customer.subscription.updated",
      created: 1766624400,
      data: {
        object: {
          id: "sub_1",
          customer: "cus_2",
          status: "active",
          cancel_at_period_end: false,
          current_period_end: 1766710800,
          items: {
            data: [{ price: { id: "price_student" } }],
          },
          metadata: {
            user_email: "owner@example.com",
          },
        },
      },
    };
    const deps = createDependencies({
      event,
      markResult: true,
      resolvedUser: {
        id: 77,
        email: "owner@example.com",
        stripe_last_event_created_at: "2026-01-01T12:00:00.000Z",
      },
    });
    const handler = createStripeWebhookHandler(deps);

    const res = await invoke(handler, { headers: { "stripe-signature": "sig_ok" } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true, stale: true });
    expect(deps.dbQuery).not.toHaveBeenCalled();
    expect(deps.billingHealth.recordProcessed).toHaveBeenCalledWith(
      "stripe",
      expect.objectContaining({ eventId: "evt_old", eventType: "customer.subscription.updated" })
    );
  });
});
