// Task 5 — best-effort wallet re-provision on plan change (webhook path).
// Mocks ./unit-ledger.js so we can assert ensureWallet is called with the
// correct { userId, planId } object and that a rejection is swallowed (the
// webhook must never 500 on a wallet re-sync failure — the event is marked
// after success so a throw simply lets Stripe retry idempotently).
import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals";
import { normalizeQuotaTier } from "./chat-quota-context.js";

const ensureWalletMock = jest.fn(async () => ({ user_id: 7, plan_id: "personal" }));

jest.unstable_mockModule("./unit-ledger.js", () => ({
  ensureWallet: ensureWalletMock,
}));

let createStripeWebhookHandler;

beforeAll(async () => {
  ({ createStripeWebhookHandler } = await import("./billing-stripe-webhook-handler.js"));
});

beforeEach(() => {
  ensureWalletMock.mockClear();
  ensureWalletMock.mockResolvedValue({ user_id: 7, plan_id: "personal" });
});

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
  const req = { body, headers, path, requestId: "req-test-1" };
  const res = createMockRes();
  await handler(req, res);
  return res;
}

function createDependencies({ event, resolvedUser = null } = {}) {
  const stripe = {
    webhooks: {
      constructEvent: jest.fn(() => event),
    },
  };
  return {
    getBillingConfigStatus: () => ({ provider: "stripe" }),
    stripe,
    stripeWebhookSecret: "whsec_test",
    markWebhookEventProcessed: jest.fn(async () => true),
    hasWebhookEventBeenProcessed: jest.fn(async () => false),
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
    resolveTier: normalizeQuotaTier,
    tierByPrice: {
      price_student: "student",
      price_personal: "personal",
      price_pro: "pro",
      price_pro_max: "pro_max",
    },
    fulfillAccessCodePurchaseCheckoutSession: jest.fn(async () => ({ handled: false })),
  };
}

function personalUpdateEvent() {
  return {
    id: "evt_personal_upd",
    type: "customer.subscription.updated",
    created: 1766710800,
    data: {
      object: {
        id: "sub_personal",
        customer: "cus_personal",
        status: "active",
        cancel_at_period_end: false,
        current_period_end: 1769302800,
        items: { data: [{ price: { id: "price_personal" } }] },
        metadata: {},
      },
    },
  };
}

describe("stripe webhook handler — Task 5 wallet re-provision (subscription events)", () => {
  it("re-syncs the wallet with { userId, planId } after a subscription.updated resolving to 'personal'", async () => {
    const deps = createDependencies({
      event: personalUpdateEvent(),
      resolvedUser: { id: 7, email: "owner@example.com", stripe_last_event_created_at: null },
    });
    const handler = createStripeWebhookHandler(deps);

    const res = await invoke(handler, { headers: { "stripe-signature": "sig_ok" } });

    expect(res.statusCode).toBe(200);
    expect(ensureWalletMock).toHaveBeenCalledTimes(1);
    expect(ensureWalletMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 7, planId: "personal" })
    );
  });

  it("does NOT return 500 when ensureWallet rejects (best-effort re-provision)", async () => {
    ensureWalletMock.mockRejectedValueOnce(new Error("wallet db down"));
    const deps = createDependencies({
      event: personalUpdateEvent(),
      resolvedUser: { id: 7, email: "owner@example.com", stripe_last_event_created_at: null },
    });
    const handler = createStripeWebhookHandler(deps);

    const res = await invoke(handler, { headers: { "stripe-signature": "sig_ok" } });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(ensureWalletMock).toHaveBeenCalledTimes(1);
    expect(deps.billingHealth.recordFailure).not.toHaveBeenCalled();
  });
});

describe("webhook mark-after-success semantics", () => {
  const KNOWN_EVENT_ID = "evt_mark_after_test_1";

  function subscriptionUpdateEvent(id = KNOWN_EVENT_ID) {
    return {
      id,
      type: "customer.subscription.updated",
      created: 1766710800,
      data: {
        object: {
          id: "sub_mark_after",
          customer: "cus_mark_after",
          status: "active",
          cancel_at_period_end: false,
          current_period_end: 1769302800,
          items: { data: [{ price: { id: "price_personal" } }] },
          metadata: {},
        },
      },
    };
  }

  it("failure leaves event unmarked: subscription UPDATE throws → 500 and markWebhookEventProcessed NOT called", async () => {
    const deps = {
      ...createDependencies({
        event: subscriptionUpdateEvent(),
        resolvedUser: { id: 7, email: "owner@example.com", stripe_last_event_created_at: null },
      }),
      dbQuery: jest.fn(async () => { throw new Error("db blip"); }),
      resolveUserByStripeCustomer: jest.fn(async () => ({ id: 7, email: "owner@example.com", stripe_last_event_created_at: null })),
      markWebhookEventProcessed: jest.fn(async () => true),
      hasWebhookEventBeenProcessed: jest.fn(async () => false),
    };
    const handler = createStripeWebhookHandler(deps);

    const res = await invoke(handler, { headers: { "stripe-signature": "sig_ok" } });

    expect(res.statusCode).toBe(500);
    expect(deps.markWebhookEventProcessed).not.toHaveBeenCalled();
  });

  it("success marks after processing: normal subscription update → 200 and markWebhookEventProcessed called once with ('stripe', eventId)", async () => {
    const deps = {
      ...createDependencies({
        event: subscriptionUpdateEvent(),
        resolvedUser: { id: 7, email: "owner@example.com", stripe_last_event_created_at: null },
      }),
      resolveUserByStripeCustomer: jest.fn(async () => ({ id: 7, email: "owner@example.com", stripe_last_event_created_at: null })),
      markWebhookEventProcessed: jest.fn(async () => true),
      hasWebhookEventBeenProcessed: jest.fn(async () => false),
    };
    const handler = createStripeWebhookHandler(deps);

    const res = await invoke(handler, { headers: { "stripe-signature": "sig_ok" } });

    expect(res.statusCode).toBe(200);
    expect(deps.markWebhookEventProcessed).toHaveBeenCalledTimes(1);
    expect(deps.markWebhookEventProcessed).toHaveBeenCalledWith("stripe", KNOWN_EVENT_ID);
  });

  it("duplicate short-circuits without work: hasWebhookEventBeenProcessed returns true → 200 duplicate:true, dbQuery UPDATE NOT called, markWebhookEventProcessed NOT called", async () => {
    const deps = {
      ...createDependencies({
        event: subscriptionUpdateEvent(),
        resolvedUser: { id: 7, email: "owner@example.com", stripe_last_event_created_at: null },
      }),
      resolveUserByStripeCustomer: jest.fn(async () => ({ id: 7, email: "owner@example.com", stripe_last_event_created_at: null })),
      markWebhookEventProcessed: jest.fn(async () => true),
      hasWebhookEventBeenProcessed: jest.fn(async () => true),
      dbQuery: jest.fn(async () => ({ rowCount: 1 })),
    };
    const handler = createStripeWebhookHandler(deps);

    const res = await invoke(handler, { headers: { "stripe-signature": "sig_ok" } });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true, duplicate: true });
    expect(deps.dbQuery).not.toHaveBeenCalled();
    expect(deps.markWebhookEventProcessed).not.toHaveBeenCalled();
  });

  it("checkout.session.completed failure leaves unmarked: fulfillTopupCheckoutSession throws → 500 and markWebhookEventProcessed NOT called", async () => {
    const checkoutEvent = {
      id: "evt_checkout_fail_1",
      type: "checkout.session.completed",
      created: 1766710800,
      data: {
        object: {
          id: "cs_test_1",
          customer: "cus_checkout",
          customer_email: "buyer@example.com",
          metadata: {},
        },
      },
    };
    const deps = {
      ...createDependencies({
        event: checkoutEvent,
        resolvedUser: null,
      }),
      markWebhookEventProcessed: jest.fn(async () => true),
      hasWebhookEventBeenProcessed: jest.fn(async () => false),
      fulfillTopupCheckoutSession: jest.fn(async () => { throw new Error("topup db down"); }),
    };
    const handler = createStripeWebhookHandler(deps);

    const res = await invoke(handler, { headers: { "stripe-signature": "sig_ok" } });

    expect(res.statusCode).toBe(500);
    expect(deps.markWebhookEventProcessed).not.toHaveBeenCalled();
  });
});
