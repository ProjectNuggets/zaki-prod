import { describe, expect, it } from "@jest/globals";
import {
  COMMERCIAL_PLAN_IDS,
  getAccessStatus,
  getEffectiveEntitlementState,
  isPaidActive,
} from "./effective-entitlements.js";

describe("effective entitlements", () => {
  it("treats student and personal subscriptions with active-like states as paid", () => {
    expect(isPaidActive("student", "active")).toBe(true);
    expect(isPaidActive("personal", "trialing")).toBe(true);
    expect(isPaidActive("pro", "past_due")).toBe(true);
    expect(isPaidActive("agent", "active")).toBe(true);
    expect(isPaidActive("learn", "active")).toBe(true);
    expect(isPaidActive("hire", "active")).toBe(true);
    expect(isPaidActive("complete", "active")).toBe(true);
    expect(isPaidActive("free", "active")).toBe(false);
    expect(isPaidActive("student", "inactive")).toBe(false);
  });

  it("reads access-code state from access expiry only", () => {
    expect(
      getAccessStatus(
        { access_expires_at: "2026-03-20T00:00:00.000Z", access_code_campaign: "launch" },
        new Date("2026-03-17T00:00:00.000Z")
      )
    ).toEqual({
      active: true,
      expiresAt: "2026-03-20T00:00:00.000Z",
      campaign: "launch",
    });
  });

  it("returns free effective access when there is no subscription or active code", () => {
    expect(
      getEffectiveEntitlementState(
        { plan_tier: "free", plan_status: "inactive", access_expires_at: null },
        new Date("2026-03-17T00:00:00.000Z")
      )
    ).toEqual(
      expect.objectContaining({
        tier: "free",
        status: "inactive",
        source: "free",
        premium: false,
      })
    );
  });

  it("mirrors active subscription state as the effective entitlement", () => {
    expect(
      getEffectiveEntitlementState(
        { plan_tier: "student", plan_status: "active", access_expires_at: null },
        new Date("2026-03-17T00:00:00.000Z")
      )
    ).toEqual(
      expect.objectContaining({
        tier: "student",
        status: "active",
        source: "subscription",
        premium: true,
        hasActiveSubscription: true,
        commercial: expect.objectContaining({
          planId: COMMERCIAL_PLAN_IDS.LEGACY_PERSONAL,
        }),
      })
    );
  });

  it("maps active legacy personal subscriptions to Complete product access", () => {
    const effective = getEffectiveEntitlementState(
      { plan_tier: "personal", plan_status: "active", access_expires_at: null },
      new Date("2026-03-17T00:00:00.000Z")
    );

    expect(effective.commercial).toEqual(
      expect.objectContaining({
        planId: COMMERCIAL_PLAN_IDS.LEGACY_PERSONAL,
        label: "ZAKI Complete",
      })
    );
    expect(effective.products.billing).toEqual(
      expect.objectContaining({
        paid: true,
        wholeApp: true,
        grandfathered: true,
      })
    );
    expect(effective.products.agent.access).toBe(true);
    expect(effective.products.learn.access).toBe(true);
    expect(effective.products.hire.access).toBe(true);
    // Legacy personal keeps full PRODUCT access but is METERED for Spaces chat —
    // uncapped is a bypass/access-code grant only, never a paid-subscription
    // perk (Bug 1 fix).
    expect(effective.products.spaces.uncapped).toBe(false);
    expect(effective.products.spaces.quota).toBe("metered");
  });

  it("keeps canceled legacy personal subscriptions on free access", () => {
    const effective = getEffectiveEntitlementState(
      { plan_tier: "personal", plan_status: "canceled", access_expires_at: null },
      new Date("2026-03-17T00:00:00.000Z")
    );

    expect(effective).toEqual(
      expect.objectContaining({
        tier: "free",
        status: "canceled",
        source: "free",
        premium: false,
        hasActiveSubscription: false,
      })
    );
    expect(effective.commercial.planId).toBe(COMMERCIAL_PLAN_IDS.SPACES_FREE);
    expect(effective.products.billing.wholeApp).toBe(false);
    expect(effective.products.agent.access).toBe(false);
    expect(effective.products.learn.access).toBe(false);
    expect(effective.products.hire.access).toBe(false);
    expect(effective.products.spaces.uncapped).toBe(false);
  });

  it("keeps expired legacy personal subscriptions on free access even if status is stale-active", () => {
    const effective = getEffectiveEntitlementState(
      {
        plan_tier: "personal",
        plan_status: "active",
        current_period_end: "2026-03-16T23:59:59.000Z",
        access_expires_at: null,
      },
      new Date("2026-03-17T00:00:00.000Z")
    );

    expect(effective.source).toBe("free");
    expect(effective.premium).toBe(false);
    expect(effective.commercial.planId).toBe(COMMERCIAL_PLAN_IDS.SPACES_FREE);
  });

  it("maps new Agent subscriptions to Agent access without uncapped Spaces", () => {
    const effective = getEffectiveEntitlementState(
      { plan_tier: "agent", plan_status: "active", access_expires_at: null },
      new Date("2026-03-17T00:00:00.000Z")
    );

    expect(effective).toEqual(
      expect.objectContaining({
        tier: "personal",
        source: "subscription",
        premium: true,
        commercial: expect.objectContaining({
          planId: COMMERCIAL_PLAN_IDS.AGENT,
          label: "ZAKI Agent",
        }),
      })
    );
    expect(effective.products.agent.access).toBe(true);
    expect(effective.products.learn.access).toBe(false);
    expect(effective.products.hire.access).toBe(false);
    expect(effective.products.spaces.uncapped).toBe(false);
  });

  it("maps new Learn subscriptions to Learn access without Agent access", () => {
    const effective = getEffectiveEntitlementState(
      { plan_tier: "learn", plan_status: "active", access_expires_at: null },
      new Date("2026-03-17T00:00:00.000Z")
    );

    expect(effective.commercial).toEqual(
      expect.objectContaining({
        planId: COMMERCIAL_PLAN_IDS.LEARN,
        label: "ZAKI Learn",
      })
    );
    expect(effective.products.learn.access).toBe(true);
    expect(effective.products.agent.access).toBe(false);
    expect(effective.products.hire.access).toBe(false);
    expect(effective.products.spaces.uncapped).toBe(false);
  });

  it("maps new Hire subscriptions to Hire access without Agent or Learn access", () => {
    const effective = getEffectiveEntitlementState(
      { plan_tier: "hire", plan_status: "active", access_expires_at: null },
      new Date("2026-03-17T00:00:00.000Z")
    );

    expect(effective.commercial).toEqual(
      expect.objectContaining({
        planId: COMMERCIAL_PLAN_IDS.HIRE,
        label: "ZAKI Hire",
      })
    );
    expect(effective.products.hire.access).toBe(true);
    expect(effective.products.agent.access).toBe(false);
    expect(effective.products.learn.access).toBe(false);
    expect(effective.products.spaces.uncapped).toBe(false);
  });

  it("maps new Complete subscriptions to whole-app access", () => {
    const effective = getEffectiveEntitlementState(
      { plan_tier: "complete", plan_status: "active", access_expires_at: null },
      new Date("2026-03-17T00:00:00.000Z")
    );

    expect(effective.commercial).toEqual(
      expect.objectContaining({
        planId: COMMERCIAL_PLAN_IDS.COMPLETE,
        label: "ZAKI Complete",
      })
    );
    expect(effective.products.billing.wholeApp).toBe(true);
    expect(effective.products.agent.access).toBe(true);
    expect(effective.products.learn.access).toBe(true);
    expect(effective.products.hire.access).toBe(true);
    // Complete (whole-app) keeps product access but is METERED for Spaces chat
    // (Bug 1 fix) — only access-code/bypass grants are uncapped.
    expect(effective.products.spaces.uncapped).toBe(false);
    expect(effective.products.spaces.quota).toBe("metered");
  });

  it("treats active access-code users as effective personal access", () => {
    expect(
      getEffectiveEntitlementState(
        {
          plan_tier: "free",
          plan_status: "inactive",
          access_expires_at: "2026-03-20T00:00:00.000Z",
          access_code_campaign: "gift",
        },
        new Date("2026-03-17T00:00:00.000Z")
      )
    ).toEqual(
      expect.objectContaining({
        tier: "personal",
        status: "active",
        source: "access_code",
        premium: true,
        hasActiveSubscription: false,
        commercial: expect.objectContaining({
          planId: COMMERCIAL_PLAN_IDS.ACCESS_CODE,
        }),
      })
    );
  });

  it("keeps subscription as source when both subscription and access code are active", () => {
    expect(
      getEffectiveEntitlementState(
        {
          plan_tier: "personal",
          plan_status: "active",
          access_expires_at: "2026-03-20T00:00:00.000Z",
        },
        new Date("2026-03-17T00:00:00.000Z")
      )
    ).toEqual(
      expect.objectContaining({
        tier: "personal",
        source: "subscription",
        premium: true,
        hasActiveSubscription: true,
      })
    );
  });

  // -- V1 commercial ladder: pro / pro_max are first-class paid tiers (Bug 2/3) --

  it("treats pro and pro_max active subscriptions as paid", () => {
    // Bug 3: pro_max was absent from the paid-active set → free entitlement.
    expect(isPaidActive("pro", "active")).toBe(true);
    expect(isPaidActive("pro_max", "active")).toBe(true);
    expect(isPaidActive("pro_max", "trialing")).toBe(true);
    expect(isPaidActive("pro_max", "inactive")).toBe(false);
  });

  it("surfaces Pro (€45) as its own tier with premium + agent access, METERED (Bug 2)", () => {
    const effective = getEffectiveEntitlementState(
      { plan_tier: "pro", plan_status: "active", access_expires_at: null },
      new Date("2026-03-17T00:00:00.000Z")
    );

    expect(effective).toEqual(
      expect.objectContaining({
        tier: "pro",
        source: "subscription",
        premium: true,
        hasActiveSubscription: true,
      })
    );
    expect(effective.products.agent.access).toBe(true);
    // Pro keeps product access but Spaces chat is metered — no uncapped leak.
    expect(effective.products.spaces.uncapped).toBe(false);
    expect(effective.products.spaces.quota).toBe("metered");
  });

  it("surfaces Pro Max (€99) as its own tier with premium + agent access, METERED (Bug 3)", () => {
    const effective = getEffectiveEntitlementState(
      { plan_tier: "pro_max", plan_status: "active", access_expires_at: null },
      new Date("2026-03-17T00:00:00.000Z")
    );

    expect(effective).toEqual(
      expect.objectContaining({
        tier: "pro_max",
        source: "subscription",
        premium: true,
        hasActiveSubscription: true,
      })
    );
    // Bug 3: pro_max previously locked to tier:'free', premium:false, agent locked.
    expect(effective.products.agent.access).toBe(true);
    expect(effective.products.learn.access).toBe(true);
    expect(effective.products.hire.access).toBe(true);
    expect(effective.products.spaces.uncapped).toBe(false);
    expect(effective.products.spaces.quota).toBe("metered");
  });

  it("keeps an active access-code grant UNCAPPED (the only non-bypass uncapped path)", () => {
    const effective = getEffectiveEntitlementState(
      {
        plan_tier: "free",
        plan_status: "inactive",
        access_expires_at: "2026-03-20T00:00:00.000Z",
        access_code_campaign: "gift",
      },
      new Date("2026-03-17T00:00:00.000Z")
    );
    expect(effective.commercial.planId).toBe(COMMERCIAL_PLAN_IDS.ACCESS_CODE);
    expect(effective.products.spaces.uncapped).toBe(true);
    expect(effective.products.spaces.quota).toBe("uncapped");
  });
});
