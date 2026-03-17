import { describe, expect, it } from "@jest/globals";
import {
  getAccessStatus,
  getEffectiveEntitlementState,
  isPaidActive,
} from "./effective-entitlements.js";

describe("effective entitlements", () => {
  it("treats student and personal subscriptions with active-like states as paid", () => {
    expect(isPaidActive("student", "active")).toBe(true);
    expect(isPaidActive("personal", "trialing")).toBe(true);
    expect(isPaidActive("pro", "past_due")).toBe(true);
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
      })
    );
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
});
