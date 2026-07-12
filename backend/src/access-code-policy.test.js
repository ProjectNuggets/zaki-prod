import { describe, expect, it, jest } from "@jest/globals";
import { readFileSync } from "node:fs";
import {
  ACCESS_CODE_DEFAULT_DURATION_DAYS,
  ACCESS_CODE_MAX_DURATION_DAYS,
  clampAccessCodeDurationDays,
  redeemAccessCodeForUser,
} from "./access-code-policy.js";

function buildClient(results) {
  const query = jest.fn();
  for (const result of results) query.mockResolvedValueOnce({ rows: result });
  return { query };
}

describe("access-code duration policy", () => {
  it("keeps the 30-day default and intentionally caps every grant path at ten years", () => {
    expect(clampAccessCodeDurationDays(undefined)).toBe(ACCESS_CODE_DEFAULT_DURATION_DAYS);
    expect(clampAccessCodeDurationDays("  ")).toBe(ACCESS_CODE_DEFAULT_DURATION_DAYS);
    expect(clampAccessCodeDurationDays(0)).toBe(1);
    expect(clampAccessCodeDurationDays(30)).toBe(30);
    expect(clampAccessCodeDurationDays(999_999)).toBe(ACCESS_CODE_MAX_DURATION_DAYS);
    expect(clampAccessCodeDurationDays(undefined, 999_999)).toBe(
      ACCESS_CODE_MAX_DURATION_DAYS
    );
  });
});

describe("redeemAccessCodeForUser", () => {
  it("returns the original grant for a replay without incrementing or extending access", async () => {
    const originalExpiry = "2026-08-11T12:00:00.000Z";
    const client = buildClient([
      [
        {
          id: "code-1",
          code: "GIFT1234",
          campaign: "gift",
          active: false,
          duration_days: 30,
        },
      ],
      [{ access_expires_at: originalExpiry, campaign: "gift" }],
    ]);

    const result = await redeemAccessCodeForUser({
      client,
      normalizedCode: "GIFT1234",
      userId: 42,
      now: new Date("2026-07-12T12:00:00.000Z"),
    });

    expect(result).toEqual({
      status: 200,
      body: {
        success: true,
        accessExpiresAt: originalExpiry,
        campaign: "gift",
        alreadyRedeemed: true,
      },
    });
    expect(client.query).toHaveBeenCalledTimes(2);
    expect(client.query.mock.calls.some(([sql]) => sql.includes("redeemed_count + 1"))).toBe(false);
    expect(client.query.mock.calls.some(([sql]) => sql.includes("UPDATE zaki_users"))).toBe(false);
  });

  it("caps a legacy oversized duration before writing a new grant", async () => {
    const client = buildClient([
      [
        {
          id: "code-2",
          code: "LONG1234",
          campaign: "founder",
          active: true,
          expires_at: null,
          duration_days: 999_999,
        },
      ],
      [],
      [{ id: "code-2" }],
      [{ access_expires_at: null }],
      [],
      [],
    ]);

    const result = await redeemAccessCodeForUser({
      client,
      normalizedCode: "LONG1234",
      userId: 7,
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result.body.alreadyRedeemed).toBe(false);
    expect(result.body.accessExpiresAt).toBe("2035-12-30T00:00:00.000Z");
    const userUpdate = client.query.mock.calls.find(([sql]) => sql.includes("UPDATE zaki_users"));
    expect(userUpdate[1][0]).toBe(result.body.accessExpiresAt);
  });

  it("extends an existing active grant once for a different code", async () => {
    const client = buildClient([
      [
        {
          id: "code-3",
          code: "NEXT1234",
          campaign: "support",
          active: true,
          expires_at: null,
          duration_days: 30,
        },
      ],
      [],
      [{ id: "code-3" }],
      [{ access_expires_at: "2026-02-01T00:00:00.000Z" }],
      [],
      [],
    ]);

    const result = await redeemAccessCodeForUser({
      client,
      normalizedCode: "NEXT1234",
      userId: 7,
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result.body.accessExpiresAt).toBe("2026-03-03T00:00:00.000Z");
    expect(client.query.mock.calls.filter(([sql]) => sql.includes("redeemed_count + 1"))).toHaveLength(1);
  });
});

describe("access-code route gates", () => {
  const source = readFileSync(new URL("./index.js", import.meta.url), "utf8");

  function routeSlice(start, end) {
    const startIndex = source.indexOf(start);
    const endIndex = source.indexOf(end, startIndex + start.length);
    expect(startIndex).toBeGreaterThan(-1);
    expect(endIndex).toBeGreaterThan(startIndex);
    return source.slice(startIndex, endIndex);
  }

  it("limits list, generation, and mutation routes to configured super admins", () => {
    const create = routeSlice(
      'app.post("/api/admin/access-codes"',
      'app.get("/api/admin/access-codes"'
    );
    const list = routeSlice(
      'app.get("/api/admin/access-codes"',
      'app.patch("/api/admin/access-codes/:id"'
    );
    const update = routeSlice(
      'app.patch("/api/admin/access-codes/:id"',
      'app.post("/api/access-code/redeem"'
    );

    for (const handler of [create, list, update]) {
      expect(handler).toContain("await requireSuperAdminUser(req, res)");
      expect(handler).not.toContain("await requireAdminUser(req, res)");
    }
  });

  it("defines super-admin authority directly from ZAKI_SUPER_ADMIN_EMAILS", () => {
    const guard = source.slice(
      source.indexOf("async function requireSuperAdminUser"),
      source.indexOf("async function resolveUserByStripeCustomer")
    );
    expect(guard).toContain("superAdminEmailSet.has(normalizeEmail(authResult.email))");
  });

  it("keeps end-user redemption authenticated and routed through idempotent policy", () => {
    const redeem = routeSlice(
      'app.post("/api/access-code/redeem"',
      '"/api/access-code/purchase/resend"'
    );
    expect(redeem).toContain("await requireAuthUser(req, res)");
    expect(redeem).toContain("redeemAccessCodeForUser({");
  });
});
