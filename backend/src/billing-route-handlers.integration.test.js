import { describe, it, expect, jest } from "@jest/globals";
import {
  createBillingSyncHandler,
  createBillingReconcileHandler,
} from "./billing-route-handlers.js";

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
  };
}

async function invoke(handler, { body = {}, headers = {} } = {}) {
  const req = {
    body,
    headers,
    path: "/test",
  };
  const res = createMockRes();
  await handler(req, res);
  return res;
}

describe("billing route handlers integration", () => {
  it("returns 400 when sync is called while provider is not stripe", async () => {
    const handler = createBillingSyncHandler({
      getBillingConfigStatus: () => ({ provider: "creem" }),
      requireAuthUser: jest.fn(),
      syncStripeSubscriptionState: jest.fn(),
      runBillingSyncWithRetries: jest.fn(),
      resolveSyncMaxAttempts: jest.fn(() => 2),
    });

    const res = await invoke(handler);
    expect(res.statusCode).toBe(400);
    expect(res.body?.success).toBe(false);
    expect(String(res.body?.error || "")).toContain("only supported for Stripe");
  });

  it("returns 403 from reconcile when admin auth fails", async () => {
    const requireAdminUser = jest.fn(async (_req, res) => {
      res.status(403).json({ error: "Admin access required." });
      return null;
    });
    const dbGet = jest.fn();
    const handler = createBillingReconcileHandler({
      requireAdminUser,
      getBillingConfigStatus: () => ({ provider: "stripe" }),
      dbGet,
      normalizeEmail: (value) => String(value || "").trim().toLowerCase(),
      syncStripeSubscriptionState: jest.fn(),
      runBillingSyncWithRetries: jest.fn(),
      resolveSyncMaxAttempts: jest.fn(() => 2),
    });

    const res = await invoke(handler, { body: { email: "owner@example.com" } });
    expect(res.statusCode).toBe(403);
    expect(dbGet).not.toHaveBeenCalled();
  });

  it("returns 400 from reconcile for invalid payload", async () => {
    const handler = createBillingReconcileHandler({
      requireAdminUser: jest.fn(async () => ({ admin: true })),
      getBillingConfigStatus: () => ({ provider: "stripe" }),
      dbGet: jest.fn(),
      normalizeEmail: (value) => String(value || "").trim().toLowerCase(),
      syncStripeSubscriptionState: jest.fn(),
      runBillingSyncWithRetries: jest.fn(),
      resolveSyncMaxAttempts: jest.fn(() => 2),
    });

    const res = await invoke(handler, { body: {} });
    expect(res.statusCode).toBe(400);
    expect(String(res.body?.error || "")).toContain("Provide userId or email");
  });

  it("returns 404 from reconcile when target user is missing", async () => {
    const dbGet = jest.fn(async () => null);
    const handler = createBillingReconcileHandler({
      requireAdminUser: jest.fn(async () => ({ admin: true })),
      getBillingConfigStatus: () => ({ provider: "stripe" }),
      dbGet,
      normalizeEmail: (value) => String(value || "").trim().toLowerCase(),
      syncStripeSubscriptionState: jest.fn(),
      runBillingSyncWithRetries: jest.fn(),
      resolveSyncMaxAttempts: jest.fn(() => 2),
    });

    const res = await invoke(handler, { body: { email: "missing@example.com" } });
    expect(res.statusCode).toBe(404);
    expect(String(res.body?.error || "")).toContain("User not found");
    expect(dbGet).toHaveBeenCalledTimes(1);
  });

  it("returns reconcile sync errors with status code", async () => {
    const syncError = Object.assign(new Error("Stripe temporarily unavailable"), {
      status: 503,
    });
    const handler = createBillingReconcileHandler({
      requireAdminUser: jest.fn(async () => ({ admin: true })),
      getBillingConfigStatus: () => ({ provider: "stripe" }),
      dbGet: jest.fn(async () => ({
        id: 1,
        email: "owner@example.com",
        stripe_customer_id: "cus_123",
        plan_tier: "free",
        plan_status: "inactive",
      })),
      normalizeEmail: (value) => String(value || "").trim().toLowerCase(),
      syncStripeSubscriptionState: jest.fn(),
      runBillingSyncWithRetries: jest.fn(async () => {
        throw syncError;
      }),
      resolveSyncMaxAttempts: jest.fn(() => 2),
      logError: jest.fn(),
    });

    const res = await invoke(handler, { body: { email: "owner@example.com", retryCount: 1 } });
    expect(res.statusCode).toBe(503);
    expect(String(res.body?.error || "")).toContain("Stripe temporarily unavailable");
  });
});
