import { describe, expect, it } from "@jest/globals";
import { resolveEffectivePlatformEntitlement } from "./platform-entitlement-context.js";

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
});
