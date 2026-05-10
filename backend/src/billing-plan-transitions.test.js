import { describe, expect, it } from "@jest/globals";
import { resolveBillingPlanTransition } from "./billing-plan-transitions.js";

describe("billing plan transitions", () => {
  it("allows direct checkout when the user has no active subscription", () => {
    expect(
      resolveBillingPlanTransition({ hasActiveSubscription: false }, "agent")
    ).toMatchObject({ allowed: true, mode: "checkout" });
  });

  it("allows single-product subscribers to upgrade to Complete", () => {
    expect(
      resolveBillingPlanTransition(
        {
          hasActiveSubscription: true,
          commercial: { planId: "agent" },
        },
        "complete"
      )
    ).toMatchObject({ allowed: true, mode: "subscription_update" });
  });

  it("does not create a second single-product subscription", () => {
    expect(
      resolveBillingPlanTransition(
        {
          hasActiveSubscription: true,
          commercial: { planId: "agent" },
        },
        "learn"
      )
    ).toMatchObject({
      allowed: false,
      reason: "complete_required",
      suggestedPlan: "complete",
    });
  });

  it("blocks duplicate checkout when the current plan already includes the requested product", () => {
    expect(
      resolveBillingPlanTransition(
        {
          hasActiveSubscription: true,
          commercial: { planId: "complete" },
        },
        "agent"
      )
    ).toMatchObject({ allowed: false, reason: "already_included" });
  });
});
