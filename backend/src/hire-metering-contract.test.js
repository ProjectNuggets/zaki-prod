import { describe, expect, it, jest } from "@jest/globals";

import { HIRE_SURFACE } from "./daily-quota.js";
import {
  HIRE_METERING_CONTRACT_VERSION,
  HIRE_METER_ACTIONS,
  buildHireMeterForwardHeaders,
  buildHireMeterGrant,
  buildHireMeterReceiptEvent,
  buildSignedHireMeterGrant,
  classifyHireMeterAction,
  recordHireMeterReceipt,
  verifySignedHireMeterGrant,
} from "./hire-metering-contract.js";
import { ZAKI_PRODUCT_IDS } from "./platform-policy.js";

const SIGNING_KEY = "zaki-hire-meter-signing-key-2026-local-test";

function meteredRequest(overrides = {}) {
  return {
    method: "POST",
    originalUrl: "/api/hire/leads/job_1/generate",
    headers: { "x-request-id": "req-hire-meter-1" },
    hireUserId: "42",
    hireAuthResult: {
      zakiUser: {
        id: 42,
        plan_tier: "free",
      },
    },
    ...overrides,
  };
}

function quotaDecision(overrides = {}) {
  return {
    allowed: true,
    quota: {
      surface: HIRE_SURFACE,
      bucket: "zaki_shared_weekly",
      period: "week",
      limit: 10,
      used: 3,
      remaining: 7,
      resetAt: "2026-05-25T00:00:00.000Z",
      ...overrides,
    },
  };
}

describe("hire metering contract", () => {
  it("maps Hire BFF routes to canonical central meter actions", () => {
    expect(classifyHireMeterAction(meteredRequest())).toEqual(
      expect.objectContaining({
        action: HIRE_METER_ACTIONS.RESUME_TAILOR,
        sourceAction: "generated_package",
        routeTemplate: "/api/hire/leads/:leadId/generate",
      })
    );
    expect(
      classifyHireMeterAction(meteredRequest({
        originalUrl: "/api/hire/fire/job_1",
      }))
    ).toEqual(
      expect.objectContaining({
        action: HIRE_METER_ACTIONS.OUTREACH_SEND,
        sourceAction: "auto_apply",
      })
    );
    expect(
      classifyHireMeterAction(meteredRequest({
        method: "GET",
        originalUrl: "/api/hire/leads",
      }))
    ).toBeNull();
  });

  it("builds short-lived signed grants that Hire can verify", () => {
    const grant = buildHireMeterGrant({
      req: meteredRequest(),
      quotaDecision: quotaDecision(),
      signingKey: SIGNING_KEY,
      nowDate: new Date("2026-05-22T10:00:00.000Z"),
      ttlMs: 60_000,
    });

    expect(grant).toEqual(
      expect.objectContaining({
        contractVersion: HIRE_METERING_CONTRACT_VERSION,
        version: HIRE_METERING_CONTRACT_VERSION,
        grantId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/),
        product: ZAKI_PRODUCT_IDS.HIRE,
        internalProductId: ZAKI_PRODUCT_IDS.HIRE,
        surface: HIRE_SURFACE,
        action: HIRE_METER_ACTIONS.RESUME_TAILOR,
        sourceAction: "generated_package",
        subject: {
          type: "user",
          userId: "42",
          anonymousKeyHash: null,
        },
        userId: "42",
        tenantId: "42",
        planId: "free",
        planTier: "free",
        entitlement: "metered",
        maxUnits: 1,
        estimatedRawUnits: 1,
        issuedAt: "2026-05-22T10:00:00.000Z",
        expiresAt: "2026-05-22T10:01:00.000Z",
      })
    );

    const verified = verifySignedHireMeterGrant(grant.signedGrant, {
      signingKey: SIGNING_KEY,
      nowDate: new Date("2026-05-22T10:00:30.000Z"),
    });
    expect(verified).toMatchObject({
      grantId: grant.grantId,
      action: HIRE_METER_ACTIONS.RESUME_TAILOR,
      quota: expect.objectContaining({ remaining: 7 }),
    });
    expect(() =>
      verifySignedHireMeterGrant(grant.signedGrant, {
        signingKey: SIGNING_KEY,
        nowDate: new Date("2026-05-22T10:02:00.000Z"),
      })
    ).toThrow("hire_meter_grant_expired");
    expect(() =>
      verifySignedHireMeterGrant(`${grant.signedGrant}.extra`, {
        signingKey: SIGNING_KEY,
        nowDate: new Date("2026-05-22T10:00:30.000Z"),
      })
    ).toThrow("hire_meter_grant_invalid");
  });

  it("fails closed when no production-grade signing key is available", () => {
    expect(() =>
      buildHireMeterGrant({
        req: meteredRequest(),
        quotaDecision: quotaDecision(),
        signingKey: "short",
      })
    ).toThrow("hire_meter_signing_key_required");
    expect(() =>
      buildSignedHireMeterGrant({
        payload: { grantId: "hmg_1" },
        signingKey: "",
      })
    ).toThrow("hire_meter_signing_key_required");
  });

  it("fails closed when grant identity is missing", () => {
    expect(() =>
      buildHireMeterGrant({
        req: meteredRequest({
          headers: {},
          hireUserId: "",
          hireAuthResult: { zakiUser: {} },
        }),
        quotaDecision: quotaDecision(),
        signingKey: SIGNING_KEY,
      })
    ).toThrow("hire_meter_user_required");
    expect(() =>
      buildHireMeterGrant({
        req: meteredRequest({
          headers: {},
        }),
        quotaDecision: quotaDecision(),
        signingKey: SIGNING_KEY,
      })
    ).toThrow("hire_meter_request_id_required");
  });

  it("builds downstream-only meter headers without exposing browser auth", () => {
    const grant = buildHireMeterGrant({
      req: meteredRequest(),
      quotaDecision: quotaDecision(),
      signingKey: SIGNING_KEY,
      nowDate: new Date("2026-05-22T10:00:00.000Z"),
    });

    expect(buildHireMeterForwardHeaders(grant)).toEqual({
      "X-Zaki-Meter-Contract": HIRE_METERING_CONTRACT_VERSION,
      "X-Zaki-Meter-Grant-Id": grant.grantId,
      "X-Zaki-Meter-Grant": grant.signedGrant,
      "X-Zaki-Meter-Action": HIRE_METER_ACTIONS.RESUME_TAILOR,
      "X-Zaki-Meter-Product": ZAKI_PRODUCT_IDS.HIRE,
      "X-Zaki-Product-Id": ZAKI_PRODUCT_IDS.HIRE,
    });
    expect(buildHireMeterForwardHeaders(null)).toEqual({});
  });

  it("builds receipt events with raw usage facts and idempotency key", () => {
    const grant = buildHireMeterGrant({
      req: meteredRequest(),
      quotaDecision: quotaDecision(),
      signingKey: SIGNING_KEY,
      nowDate: new Date("2026-05-22T10:00:00.000Z"),
    });
    const event = buildHireMeterReceiptEvent({
      req: meteredRequest(),
      grant,
      quotaDecision: quotaDecision(),
      upstreamStatus: 200,
      responsePayload: {
        usage: {
          input_tokens: 120,
          output_tokens: 30,
          model: "operator-model",
          external_api_calls: 2,
        },
      },
      durationMs: 321,
      createdAt: new Date("2026-05-22T10:00:02.000Z"),
    });

    expect(event).toEqual(
      expect.objectContaining({
        userId: 42,
        productId: ZAKI_PRODUCT_IDS.HIRE,
        surface: HIRE_SURFACE,
        eventType: "hire.receipt.resume.tailor",
        usageUnitType: "meter_unit",
        requestId: "req-hire-meter-1",
        sourceRoute: "/api/hire/leads/:leadId/generate",
        createdAt: "2026-05-22T10:00:02.000Z",
      })
    );
    expect(event.metadata).toEqual(
      expect.objectContaining({
        contractVersion: HIRE_METERING_CONTRACT_VERSION,
        grantId: grant.grantId,
        idempotencyKey: `${grant.grantId}:receipt`,
        action: HIRE_METER_ACTIONS.RESUME_TAILOR,
        sourceAction: "generated_package",
        status: "success",
        upstreamStatus: 200,
        finalStatus: 200,
        durationMs: 321,
        rawUsageFacts: expect.objectContaining({
          status: "success",
          inputTokens: 120,
          outputTokens: 30,
          model: "operator-model",
          externalApiCalls: 2,
        }),
      })
    );
  });

  it("does not coerce missing numeric usage facts to zero", () => {
    const grant = buildHireMeterGrant({
      req: meteredRequest(),
      quotaDecision: quotaDecision(),
      signingKey: SIGNING_KEY,
      nowDate: new Date("2026-05-22T10:00:00.000Z"),
    });
    const event = buildHireMeterReceiptEvent({
      req: meteredRequest(),
      grant,
      quotaDecision: quotaDecision(),
      upstreamStatus: 200,
      responsePayload: {},
    });

    expect(event.metadata.rawUsageFacts).toEqual({
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      toolCalls: null,
      externalApiCalls: null,
      durationMs: null,
      jobRuntimeMs: null,
      storageBytes: null,
      model: null,
      provider: null,
      status: "success",
    });
  });

  it("marks receipts failed when ZAKI returns a gateway failure for a successful upstream status", () => {
    const grant = buildHireMeterGrant({
      req: meteredRequest(),
      quotaDecision: quotaDecision(),
      signingKey: SIGNING_KEY,
      nowDate: new Date("2026-05-22T10:00:00.000Z"),
    });
    const event = buildHireMeterReceiptEvent({
      req: meteredRequest(),
      grant,
      quotaDecision: quotaDecision(),
      upstreamStatus: 200,
      finalStatus: 502,
      durationMs: 40,
    });

    expect(event.metadata).toEqual(
      expect.objectContaining({
        status: "failed",
        upstreamStatus: 200,
        finalStatus: 502,
      })
    );
    expect(event.metadata.rawUsageFacts.status).toBe("failed");
  });

  it("persists receipt events through the central usage event helper", async () => {
    const dbQuery = jest.fn(async () => ({ rowCount: 1 }));
    const grant = buildHireMeterGrant({
      req: meteredRequest(),
      quotaDecision: quotaDecision(),
      signingKey: SIGNING_KEY,
      nowDate: new Date("2026-05-22T10:00:00.000Z"),
    });

    const result = await recordHireMeterReceipt({
      req: meteredRequest(),
      grant,
      quotaDecision: quotaDecision(),
      upstreamStatus: 409,
      responsePayload: { detail: "already running" },
      durationMs: 25,
      dbQuery,
    });

    expect(result.recorded).toBe(true);
    expect(dbQuery).toHaveBeenCalledTimes(1);
    const [, params] = dbQuery.mock.calls[0];
    expect(params).toEqual(
      expect.arrayContaining([
        "42",
        ZAKI_PRODUCT_IDS.HIRE,
        HIRE_SURFACE,
        "hire.receipt.resume.tailor",
        "meter_unit",
      ])
    );
    const metadata = JSON.parse(params[15]);
    expect(metadata.status).toBe("failed");
    expect(metadata.idempotencyKey).toBe(`${grant.grantId}:receipt`);
  });
});
