import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals";
import { normalizeQuotaTier } from "./chat-quota-context.js";
import { buildPlatformPlanPolicy, normalizePlatformPlanId } from "./platform-policy.js";

// Mock the unit ledger so we can assert the webhook re-provisions the wallet
// with the REAL per-tier planId. ensureWallet is a hard import inside the
// handler module (not injected), so capturing it requires a module mock.
const ensureWalletMock = jest.fn(async ({ planId }) => ({ user_id: 7, plan_id: planId }));
jest.unstable_mockModule("./unit-ledger.js", () => ({
  ensureWallet: ensureWalletMock,
}));

let createStripeWebhookHandler;
beforeAll(async () => {
  ({ createStripeWebhookHandler } = await import("./billing-stripe-webhook-handler.js"));
});
beforeEach(() => {
  ensureWalletMock.mockClear();
  ensureWalletMock.mockImplementation(async ({ planId }) => ({ user_id: 7, plan_id: planId }));
});

// The weekly allowance a given commercial tier resolves to once the wallet is
// provisioned — sourced from the SAME platform policy index.js#ensureWallet
// uses, so the assertion tracks the real allowance ladder (personal 1000 /
// pro 3000 / pro_max 7500).
function weeklyAllowanceForTier(tier) {
  const policy = buildPlatformPlanPolicy({ env: {} });
  return policy.plans[normalizePlatformPlanId(tier)].weeklyAllowanceUnits;
}

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

function createDependencies({ event, constructError = null, markResult = true, alreadyProcessed = false, resolvedUser = null } = {}) {
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
    hasWebhookEventBeenProcessed: jest.fn(async () => alreadyProcessed),
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
    // Use the REAL resolveTier (canonical impl exported from chat-quota-context).
    // The previous identity stub here masked the pro→personal collapse: it
    // happened to match the fixed behavior, so the test passed whether or not
    // the production resolver was buggy. Wiring the real resolver makes this
    // test fail if `pro` ever collapses again.
    resolveTier: normalizeQuotaTier,
    tierByPrice: {
      price_student: "student",
      price_student_yearly: "student",
      price_personal: "personal",
      price_personal_yearly: "personal",
      price_pro: "pro",
      price_pro_max: "pro_max",
    },
    fulfillAccessCodePurchaseCheckoutSession: jest.fn(async () => ({ handled: false })),
    fulfillTopupCheckoutSession: jest.fn(async () => ({ handled: false })),
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
    const deps = createDependencies({ event, alreadyProcessed: true });
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

  it("invokes access-code purchase fulfillment callback for checkout sessions", async () => {
    const event = {
      id: "evt_access_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_access_1",
          customer: "cus_access_1",
          customer_email: "owner@example.com",
          metadata: {
            fulfillment_type: "access_code_purchase",
            user_email: "owner@example.com",
          },
        },
      },
    };
    const deps = createDependencies({ event, markResult: true });
    deps.dbGet.mockResolvedValueOnce({ id: 7 });
    const handler = createStripeWebhookHandler(deps);

    const res = await invoke(handler, { headers: { "stripe-signature": "sig_ok" } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(deps.fulfillAccessCodePurchaseCheckoutSession).toHaveBeenCalledWith({
      session: event.data.object,
      eventId: "evt_access_1",
    });
  });

  it("invokes unit top-up fulfillment callback for checkout sessions", async () => {
    const event = {
      id: "evt_topup_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_topup_1",
          customer: "cus_topup_1",
          customer_email: "owner@example.com",
          metadata: {
            fulfillment_type: "unit_topup",
            user_email: "owner@example.com",
            pack_id: "boost_500",
            units: "500",
          },
        },
      },
    };
    const deps = createDependencies({ event, markResult: true });
    deps.dbGet.mockResolvedValueOnce({ id: 7 });
    const handler = createStripeWebhookHandler(deps);

    const res = await invoke(handler, { headers: { "stripe-signature": "sig_ok" } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(deps.fulfillTopupCheckoutSession).toHaveBeenCalledWith({
      session: event.data.object,
      eventId: "evt_topup_1",
    });
  });

  it.each([
    ["price_personal", "personal", 1000],
    ["price_pro", "pro", 3000],
    ["price_pro_max", "pro_max", 7500],
  ])(
    "stores %s subscription as %s and provisions the %s-unit wallet (Bug 2)",
    async (priceId, expectedTier, expectedWeeklyAllowance) => {
      const event = {
        id: `evt_${expectedTier}_created`,
        type: "customer.subscription.created",
        created: 1766710800,
        data: {
          object: {
            id: `sub_${expectedTier}`,
            customer: `cus_${expectedTier}`,
            status: "active",
            cancel_at_period_end: false,
            current_period_end: 1769302800,
            items: { data: [{ price: { id: priceId } }] },
            metadata: {},
          },
        },
      };
      const deps = createDependencies({
        event,
        markResult: true,
        resolvedUser: {
          id: 90,
          email: `${expectedTier}@example.com`,
          stripe_last_event_created_at: null,
        },
      });
      const handler = createStripeWebhookHandler(deps);

      const res = await invoke(handler, { headers: { "stripe-signature": "sig_ok" } });

      expect(res.statusCode).toBe(200);
      // (a) the REAL tier is written to plan_tier — pro does NOT collapse to personal.
      expect(deps.dbQuery).toHaveBeenCalledWith(
        expect.stringContaining("plan_tier = $4"),
        expect.arrayContaining([expectedTier, "active"])
      );
      // (b) the wallet is re-provisioned with the real per-tier planId.
      expect(ensureWalletMock).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 90, planId: expectedTier })
      );
      // (c) that planId resolves to the correct weekly allowance ladder.
      expect(weeklyAllowanceForTier(expectedTier)).toBe(expectedWeeklyAllowance);
    }
  );

  it.each([
    ["customer.subscription.created", "2026-01-01T00:00:00.000Z", "2027-01-01T00:00:00.000Z"],
    ["customer.subscription.updated", "2027-01-01T00:00:00.000Z", "2028-01-01T00:00:00.000Z"],
  ])(
    "persists Stripe's full annual period for %s without a monthly fallback",
    async (eventType, periodStartIso, periodEndIso) => {
      const event = {
        id: `evt_personal_yearly_${eventType.endsWith("created") ? "created" : "renewed"}`,
        type: eventType,
        created: Math.floor(Date.parse(periodStartIso) / 1000),
        data: {
          object: {
            id: "sub_personal_yearly",
            customer: "cus_personal_yearly",
            status: "active",
            cancel_at_period_end: false,
            current_period_start: Math.floor(Date.parse(periodStartIso) / 1000),
            current_period_end: Math.floor(Date.parse(periodEndIso) / 1000),
            items: { data: [{ price: { id: "price_personal_yearly" } }] },
            metadata: { billing_interval: "yearly" },
          },
        },
      };
      const deps = createDependencies({
        event,
        resolvedUser: {
          id: 91,
          email: "yearly@example.com",
          stripe_last_event_created_at: null,
        },
      });
      const handler = createStripeWebhookHandler(deps);

      const res = await invoke(handler, { headers: { "stripe-signature": "sig_ok" } });

      expect(res.statusCode).toBe(200);
      expect(deps.dbQuery).toHaveBeenCalledWith(
        expect.stringContaining("current_period_end = $6"),
        expect.arrayContaining([
          "price_personal_yearly",
          "personal",
          "active",
          periodEndIso,
          periodStartIso,
        ])
      );
      expect(ensureWalletMock).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 91, planId: "personal" })
      );
    }
  );
});

describe("stripe webhook handler — S2.7 nullalis revocation", () => {
  function makeUser(overrides = {}) {
    return {
      id: 42,
      email: "owner@example.com",
      plan_tier: "personal",
      plan_status: "active",
      current_period_end: "2025-01-01T00:00:00Z",
      stripe_last_event_created_at: null,
      ...overrides,
    };
  }

  it("fires revoke on customer.subscription.deleted", async () => {
    const event = {
      id: "evt_delete",
      type: "customer.subscription.deleted",
      created: 1766710800,
      data: {
        object: {
          id: "sub_1",
          customer: "cus_del",
          status: "canceled",
          cancel_at_period_end: false,
          current_period_end: 1766710800,
          items: { data: [{ price: { id: "price_personal" } }] },
          metadata: {},
        },
      },
    };
    const deps = createDependencies({ event, resolvedUser: makeUser() });
    const revoke = jest.fn(async () => ({ ok: true, status: 200, data: { status: "ok" } }));
    const handler = createStripeWebhookHandler({ ...deps, revokeNullalisEntitlement: revoke });

    const res = await invoke(handler, { headers: { "stripe-signature": "sig_ok" } });
    expect(res.statusCode).toBe(200);
    expect(revoke).toHaveBeenCalledTimes(1);
    const [revokedUser] = revoke.mock.calls[0];
    expect(revokedUser.id).toBe(42);
    expect(revokedUser.plan_tier).toBe("free");
    expect(revokedUser.plan_status).toBe("canceled");
  });

  it.each([
    ["past_due"],
    ["unpaid"],
    ["canceled"],
  ])(
    "fires revoke on customer.subscription.updated → %s",
    async (nextStatus) => {
      const event = {
        id: `evt_upd_${nextStatus}`,
        type: "customer.subscription.updated",
        created: 1766710800,
        data: {
          object: {
            id: "sub_1",
            customer: "cus_upd",
            status: nextStatus,
            cancel_at_period_end: false,
            current_period_end: 1766710800,
            items: { data: [{ price: { id: "price_personal" } }] },
            metadata: {},
          },
        },
      };
      const deps = createDependencies({ event, resolvedUser: makeUser() });
      const revoke = jest.fn(async () => ({ ok: true, status: 200, data: {} }));
      const handler = createStripeWebhookHandler({ ...deps, revokeNullalisEntitlement: revoke });

      const res = await invoke(handler, { headers: { "stripe-signature": "sig_ok" } });
      expect(res.statusCode).toBe(200);
      expect(revoke).toHaveBeenCalledTimes(1);
      expect(revoke.mock.calls[0][0].plan_status).toBe(nextStatus);
    }
  );

  it("does NOT fire revoke on customer.subscription.updated → active", async () => {
    const event = {
      id: "evt_upd_active",
      type: "customer.subscription.updated",
      created: 1766710800,
      data: {
        object: {
          id: "sub_1",
          customer: "cus_upd",
          status: "active",
          cancel_at_period_end: false,
          current_period_end: 1766710800,
          items: { data: [{ price: { id: "price_personal" } }] },
          metadata: {},
        },
      },
    };
    const deps = createDependencies({ event, resolvedUser: makeUser() });
    const revoke = jest.fn(async () => ({ ok: true, status: 200, data: {} }));
    const handler = createStripeWebhookHandler({ ...deps, revokeNullalisEntitlement: revoke });

    const res = await invoke(handler, { headers: { "stripe-signature": "sig_ok" } });
    expect(res.statusCode).toBe(200);
    expect(revoke).not.toHaveBeenCalled();
  });

  it("handles invoice.payment_failed → updates DB to past_due + revokes", async () => {
    const event = {
      id: "evt_pf_1",
      type: "invoice.payment_failed",
      created: 1766710800,
      data: {
        object: {
          id: "in_1",
          customer: "cus_pf",
          customer_email: "owner@example.com",
        },
      },
    };
    const user = makeUser();
    const deps = createDependencies({ event, resolvedUser: user });
    const revoke = jest.fn(async () => ({ ok: true, status: 200, data: {} }));
    const handler = createStripeWebhookHandler({ ...deps, revokeNullalisEntitlement: revoke });

    const res = await invoke(handler, { headers: { "stripe-signature": "sig_ok" } });
    expect(res.statusCode).toBe(200);
    expect(deps.resolveUserByStripeCustomer).toHaveBeenCalledWith("cus_pf", "owner@example.com");
    expect(deps.dbQuery).toHaveBeenCalledWith(
      expect.stringContaining("plan_status = 'past_due'"),
      expect.arrayContaining(["evt_pf_1", 42])
    );
    expect(deps.dbQuery.mock.calls[0][0]).not.toContain("current_period_end =");
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(revoke.mock.calls[0][0].plan_status).toBe("past_due");
  });

  it("handles charge.dispute.created → resolves customer via stripe.charges.retrieve + revokes", async () => {
    const event = {
      id: "evt_dis_1",
      type: "charge.dispute.created",
      created: 1766710800,
      data: {
        object: {
          id: "dp_1",
          charge: "ch_abc",
        },
      },
    };
    const user = makeUser();
    const deps = createDependencies({ event, resolvedUser: user });
    deps.stripe.charges = {
      retrieve: jest.fn(async (chargeId) => {
        expect(chargeId).toBe("ch_abc");
        return { id: "ch_abc", customer: "cus_disp" };
      }),
    };
    const revoke = jest.fn(async () => ({ ok: true, status: 200, data: {} }));
    const handler = createStripeWebhookHandler({ ...deps, revokeNullalisEntitlement: revoke });

    const res = await invoke(handler, { headers: { "stripe-signature": "sig_ok" } });
    expect(res.statusCode).toBe(200);
    expect(deps.stripe.charges.retrieve).toHaveBeenCalledWith("ch_abc");
    expect(deps.resolveUserByStripeCustomer).toHaveBeenCalledWith("cus_disp", null);
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(revoke.mock.calls[0][0].plan_status).toBe("past_due");
  });

  it("charge.dispute.created: skips cleanly when stripe.charges.retrieve throws", async () => {
    const event = {
      id: "evt_dis_2",
      type: "charge.dispute.created",
      created: 1766710800,
      data: { object: { id: "dp_2", charge: "ch_bad" } },
    };
    const deps = createDependencies({ event });
    deps.stripe.charges = {
      retrieve: jest.fn(async () => {
        throw new Error("stripe timeout");
      }),
    };
    const revoke = jest.fn();
    const handler = createStripeWebhookHandler({ ...deps, revokeNullalisEntitlement: revoke });

    const res = await invoke(handler, { headers: { "stripe-signature": "sig_ok" } });
    expect(res.statusCode).toBe(200);
    expect(revoke).not.toHaveBeenCalled();
  });

  it("revoke failure is swallowed — webhook still returns 200", async () => {
    const event = {
      id: "evt_rfail",
      type: "customer.subscription.deleted",
      created: 1766710800,
      data: {
        object: {
          id: "sub_1",
          customer: "cus_rf",
          status: "canceled",
          cancel_at_period_end: false,
          current_period_end: 1766710800,
          items: { data: [{ price: { id: "price_personal" } }] },
          metadata: {},
        },
      },
    };
    const deps = createDependencies({ event, resolvedUser: makeUser() });
    const revoke = jest.fn(async () => {
      throw new Error("nullalis down");
    });
    const handler = createStripeWebhookHandler({ ...deps, revokeNullalisEntitlement: revoke });

    const res = await invoke(handler, { headers: { "stripe-signature": "sig_ok" } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(revoke).toHaveBeenCalledTimes(1);
  });
});
