import { describe, expect, it } from "@jest/globals";
import { resolveEffectivePlatformEntitlement } from "./platform-entitlement-context.js";
import { buildPlatformEntitlementSummary } from "./platform-policy.js";

// Mirror of the BFF plan{} builder used by /api/meter/status,
// /api/entitlements and /api/usage/summary — the exact source the dashboard
// status strip reads `plan.label` from. Kept here so the regression covers the
// real chain (effective entitlement → platform summary → displayed label).
function displayedPlanForUser(zakiUser, options) {
  const effective = resolveEffectivePlatformEntitlement(zakiUser, options);
  const summary = buildPlatformEntitlementSummary({
    commercialPlanId: effective.commercial?.planId || "spaces_free",
    effectiveTier: effective.tier,
    source: effective.source,
    premium: effective.premium,
    env: {},
  });
  return summary.plan;
}

describe("platform entitlement context", () => {
  it("preserves canonical effective entitlement when no local bypass is configured", () => {
    const effective = resolveEffectivePlatformEntitlement(
      {
        email: "user@example.com",
        plan_tier: "free",
        plan_status: "inactive",
      },
      { env: {}, nowDate: new Date("2026-05-30T00:00:00.000Z") }
    );

    expect(effective).toEqual(
      expect.objectContaining({
        tier: "free",
        source: "free",
        premium: false,
      })
    );
    expect(effective.commercial.planId).toBe("spaces_free");
  });

  it("promotes local allowlisted users through the same access-code platform contract", () => {
    const effective = resolveEffectivePlatformEntitlement(
      {
        email: "alaasuccar@gmail.com",
        plan_tier: "free",
        plan_status: "inactive",
      },
      {
        env: { ZAKI_LOCAL_UNLIMITED_QUOTA_EMAILS: "owner@example.com, alaasuccar@gmail.com" },
        nowDate: new Date("2026-05-30T00:00:00.000Z"),
      }
    );

    expect(effective).toEqual(
      expect.objectContaining({
        tier: "personal",
        status: "active",
        source: "access_code",
        premium: true,
      })
    );
    expect(effective.access).toEqual(
      expect.objectContaining({
        active: true,
        expiresAt: null,
        campaign: "local_unlimited_quota",
      })
    );
    expect(effective.commercial.planId).toBe("access_code");
    expect(effective.products.agent.access).toBe(true);
    expect(effective.products.learn.access).toBe(true);
    expect(effective.products.spaces.uncapped).toBe(true);
  });

  // Regression for the "PLAN PERSONAL on a paid Pro account" trust bug: an
  // active Pro subscriber (zaki_users.plan_tier='pro') must surface as "Pro"
  // through the same chain the dashboard status strip reads. Before the fix the
  // commercial alias (legacy_personal) collapsed the badge to "Personal".
  it("displays a Pro subscriber as 'Pro' end-to-end through the strip's plan builder", () => {
    const nowDate = new Date("2026-06-16T00:00:00.000Z");
    const proUser = {
      email: "zaki.checkout.test.0616@gmail.com",
      plan_tier: "pro",
      plan_status: "active",
      current_period_end: "2026-12-31T00:00:00.000Z",
    };
    const effective = resolveEffectivePlatformEntitlement(proUser, { env: {}, nowDate });
    expect(effective.tier).toBe("pro");
    expect(effective.premium).toBe(true);

    const plan = displayedPlanForUser(proUser, { env: {}, nowDate });
    expect(plan).toEqual(
      expect.objectContaining({ id: "pro", label: "Pro", premium: true })
    );
    expect(plan.label).not.toBe("Personal");
  });

  it("displays a Pro MAX subscriber as 'Pro MAX' end-to-end", () => {
    const nowDate = new Date("2026-06-16T00:00:00.000Z");
    const proMaxUser = {
      email: "pro-max@example.com",
      plan_tier: "pro_max",
      plan_status: "active",
      current_period_end: "2026-12-31T00:00:00.000Z",
    };
    const plan = displayedPlanForUser(proMaxUser, { env: {}, nowDate });
    expect(plan).toEqual(
      expect.objectContaining({ id: "pro_max", label: "Pro MAX", premium: true })
    );
    expect(plan.label).not.toBe("Personal");
  });
});
