import { describe, expect, it } from "@jest/globals";
import {
  buildMeterGrantDecision,
  buildMeterReceiptDebit,
  calculateRawUnitsFromUsageFacts,
  resolveMeterCapabilityForAction,
  signMeterGrant,
  verifyMeterGrantSignature,
} from "./meter-contract.js";
import {
  PLATFORM_METER_CAPABILITIES,
  PRODUCT_OPERATIONAL_STATES,
  buildPlatformEntitlementSummary,
  buildPlatformMeterPolicy,
} from "./platform-policy.js";

const SECRET = "b".repeat(64);

function platformFor(planId = "pro") {
  return buildPlatformEntitlementSummary({
    commercialPlanId: planId,
    effectiveTier: planId,
    source: "subscription",
    premium: planId !== "free",
    env: {
      ZAKI_PLATFORM_PRO_WEEKLY_ALLOWANCE_UNITS: "1000",
      ZAKI_PLATFORM_PRO_ROLLING_ALLOWANCE_UNITS: "200",
    },
  });
}

function meterSnapshotFor() {
  return {
    rolling: { remaining: 200, resetAt: "2026-05-22T15:00:00.000Z" },
    weekly: { remaining: 1000, resetAt: "2026-05-25T00:00:00.000Z" },
  };
}

describe("central meter contract", () => {
  it("signs short-lived grants and rejects tampering", () => {
    const signedGrant = signMeterGrant(
      {
        grantId: "grant-1",
        product: "hire",
        expiresAt: "2026-05-22T10:05:00.000Z",
      },
      SECRET
    );

    expect(
      verifyMeterGrantSignature(signedGrant, SECRET, {
        nowDate: new Date("2026-05-22T10:00:00.000Z"),
      })
    ).toEqual(expect.objectContaining({ valid: true }));
    expect(
      verifyMeterGrantSignature(`${signedGrant}x`, SECRET, {
        nowDate: new Date("2026-05-22T10:00:00.000Z"),
      })
    ).toEqual(expect.objectContaining({ valid: false }));
    expect(
      verifyMeterGrantSignature(signedGrant, SECRET, {
        nowDate: new Date("2026-05-22T10:06:00.000Z"),
      })
    ).toEqual(expect.objectContaining({ valid: false, reason: "expired" }));
  });

  it("builds a Hire grant from central plan allowance and product state", () => {
    const decision = buildMeterGrantDecision({
      tenantId: "tenant-1",
      identity: { type: "user", userId: 42 },
      product: "hire",
      productState: PRODUCT_OPERATIONAL_STATES.ENABLED,
      action: "candidate_screen",
      estimatedUnits: 5,
      requestId: "req-1",
      idempotencyKey: "idem-1",
      platform: platformFor("pro"),
      meterSnapshot: meterSnapshotFor(),
      policy: buildPlatformMeterPolicy({ env: {} }),
      signingSecret: SECRET,
      grantId: "00000000-0000-4000-8000-000000000001",
      nowDate: new Date("2026-05-22T10:00:00.000Z"),
    });

    expect(decision).toEqual(
      expect.objectContaining({
        allowed: true,
        grantId: "00000000-0000-4000-8000-000000000001",
        productId: "hire",
        internalProductId: "hire",
        planTier: "pro",
        productState: "enabled",
      })
    );
    expect(decision.signedGrant).toContain(".");
    expect(decision.maxUnits).toBeGreaterThan(0);
  });

  it("denies grants when the product is operationally hidden", () => {
    const decision = buildMeterGrantDecision({
      identity: { type: "user", userId: 42 },
      product: "hire",
      productState: PRODUCT_OPERATIONAL_STATES.HIDDEN,
      action: "candidate_screen",
      platform: platformFor("pro"),
      meterSnapshot: meterSnapshotFor(),
      policy: buildPlatformMeterPolicy({ env: {} }),
      signingSecret: SECRET,
    });

    expect(decision).toEqual(
      expect.objectContaining({
        allowed: false,
        status: 404,
        reason: "product_hidden",
      })
    );
  });

  it("computes weighted receipt debits from raw usage facts", () => {
    const rawUnits = calculateRawUnitsFromUsageFacts({
      inputTokens: 1000,
      outputTokens: 500,
      toolCalls: 2,
      externalApiCalls: 1,
      durationMs: 60000,
    });
    expect(rawUnits).toBe(3.5);

    const debit = buildMeterReceiptDebit({
      product: "hire",
      action: "candidate_screen",
      status: "success",
      usageFacts: {
        inputTokens: 1000,
        outputTokens: 500,
        toolCalls: 2,
        externalApiCalls: 1,
        durationMs: 60000,
        model: "test-model",
      },
      maxUnits: 2,
      policy: buildPlatformMeterPolicy({ env: {} }),
    });

    expect(debit).toEqual(
      expect.objectContaining({
        valid: true,
        productId: "hire",
        internalProductId: "hire",
        rawUnits: 3.5,
        weightedUnits: 3.5,
        maxExceeded: true,
      })
    );
  });

  it("maps search/query actions to tool-call capability", () => {
    expect(resolveMeterCapabilityForAction("hire.candidate.search")).toBe(
      PLATFORM_METER_CAPABILITIES.TOOL_CALL
    );
    expect(resolveMeterCapabilityForAction("spaces.chat.query")).toBe(
      PLATFORM_METER_CAPABILITIES.TOOL_CALL
    );
  });
});
