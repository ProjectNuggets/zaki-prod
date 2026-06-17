// CALL-SITE integration test for the TIER→ENTITLEMENT mapping layer.
//
// This is the test that was MISSING — the one whose absence let the revenue
// leak ship. The prior suite only exercised ensureWallet / effective-entitlements
// in ISOLATION; nothing drove the chat gate (index.js#buildUserQuotaContext) that
// decides whether a paid subscriber's turn is metered. That logic now lives in
// the importable chat-quota-context.js, so here we drive the REAL gate for each
// paid tier and assert the three things the live deploy got wrong:
//
//   1. the turn is METERED (unlimited=false) — no spaces.uncapped for paid tiers
//   2. the wallet provisioned for the tier has the right weekly allowance
//   3. the effective entitlement is premium with the right tier + product access
//
// It also pins the legitimate UNMETERED paths (local bypass + access code) so a
// future "make everyone metered" overcorrection can't silently break them.
import { describe, it, expect } from "@jest/globals";
import {
  buildUserQuotaContext,
  isChatTurnUnlimited,
} from "./chat-quota-context.js";
import {
  APP_CHAT_SURFACE,
  ZAKI_BOT_SURFACE,
  LEARNING_SURFACE,
} from "./daily-quota.js";
import { buildPlatformPlanPolicy, normalizePlatformPlanId } from "./platform-policy.js";

// Empty env so no real super-admin/bypass allowlist leaks into the assertions.
const ENV = {};

function paidUser(tier, overrides = {}) {
  return {
    id: 1,
    email: `${tier}@example.com`,
    plan_tier: tier,
    plan_status: "active",
    current_period_end: "2999-01-01T00:00:00.000Z",
    access_expires_at: null,
    ...overrides,
  };
}

function weeklyAllowanceForTier(tier) {
  const policy = buildPlatformPlanPolicy({ env: ENV });
  return policy.plans[normalizePlatformPlanId(tier)].weeklyAllowanceUnits;
}

describe("chat gate call-site — paid tiers are METERED with the right wallet/entitlement", () => {
  it.each([
    // tier,       weeklyAllowance, agentAccess
    ["personal", 1000, true],
    ["pro", 3000, true],
    ["pro_max", 7500, true],
  ])(
    "%s subscriber: Spaces chat is metered, wallet=%d, premium + agent=%s",
    (tier, expectedWeeklyAllowance, expectedAgentAccess) => {
      const ctx = buildUserQuotaContext(paidUser(tier), {
        surface: APP_CHAT_SURFACE,
        env: ENV,
      });

      // 1) METERED — this is the revenue-leak gate. A true here means the chat
      //    turn short-circuits before the wallet reserve (index.js:10182) and the
      //    weekly cap never fires.
      expect(ctx.unlimited).toBe(false);

      // 2) the gate surfaces the REAL ladder tier (pro does not collapse to personal).
      expect(ctx.tier).toBe(tier);
      expect(ctx.effective.tier).toBe(tier);

      // 3) premium + product access from the effective entitlement.
      expect(ctx.effective.premium).toBe(true);
      expect(ctx.effective.hasActiveSubscription).toBe(true);
      expect(ctx.effective.products.agent.access).toBe(expectedAgentAccess);

      // 4) Spaces is explicitly metered, not uncapped.
      expect(ctx.effective.products.spaces.uncapped).toBe(false);
      expect(ctx.effective.products.spaces.quota).toBe("metered");

      // 5) the wallet this tier provisions carries the right weekly allowance.
      expect(weeklyAllowanceForTier(tier)).toBe(expectedWeeklyAllowance);
    }
  );

  it("free user: Spaces chat is metered (100-unit free wallet)", () => {
    const ctx = buildUserQuotaContext(
      paidUser("free", { plan_status: "inactive", current_period_end: null }),
      { surface: APP_CHAT_SURFACE, env: ENV }
    );
    expect(ctx.unlimited).toBe(false);
    expect(ctx.effective.premium).toBe(false);
    expect(weeklyAllowanceForTier("free")).toBe(100);
  });

  it("pro_max unlocks agent (€99 product access) while pro_max Spaces stays metered", () => {
    const user = paidUser("pro_max");
    // Agent surface: the product they bought is unlimited on its own surface.
    expect(isChatTurnUnlimited(user, { surface: ZAKI_BOT_SURFACE, env: ENV })).toBe(true);
    expect(isChatTurnUnlimited(user, { surface: LEARNING_SURFACE, env: ENV })).toBe(true);
    // Spaces surface: metered.
    expect(isChatTurnUnlimited(user, { surface: APP_CHAT_SURFACE, env: ENV })).toBe(false);
  });

  describe("legitimate UNMETERED paths are preserved", () => {
    it("local-unlimited-quota bypass (super-admin/owner) is unmetered on Spaces", () => {
      const env = { ZAKI_LOCAL_UNLIMITED_QUOTA_EMAILS: "owner@zaki.test" };
      const user = paidUser("free", {
        email: "owner@zaki.test",
        plan_status: "inactive",
        current_period_end: null,
      });
      const ctx = buildUserQuotaContext(user, { surface: APP_CHAT_SURFACE, env });
      expect(ctx.unlimited).toBe(true);
    });

    it("active access-code grant is unmetered on Spaces (uncapped)", () => {
      const user = paidUser("free", {
        plan_status: "inactive",
        current_period_end: null,
        access_expires_at: "2999-01-01T00:00:00.000Z",
        access_code_campaign: "gift",
      });
      const ctx = buildUserQuotaContext(user, { surface: APP_CHAT_SURFACE, env: ENV });
      expect(ctx.unlimited).toBe(true);
      expect(ctx.effective.products.spaces.uncapped).toBe(true);
    });

    it("a PAID subscriber is NOT granted the bypass just by being paid", () => {
      // Guards the exact regression: paid + no bypass/access-code → metered.
      for (const tier of ["personal", "pro", "pro_max"]) {
        const ctx = buildUserQuotaContext(paidUser(tier), {
          surface: APP_CHAT_SURFACE,
          env: ENV,
        });
        expect(ctx.unlimited).toBe(false);
      }
    });
  });
});
