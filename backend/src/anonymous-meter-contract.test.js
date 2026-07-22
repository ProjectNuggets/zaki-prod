import { describe, expect, it, jest } from "@jest/globals";
import {
  buildAnonymousUnitMeterDenial,
  buildAnonymousMeterStatusPayload,
  createAnonymousMeterStatusResponder,
} from "./anonymous-meter-contract.js";

describe("WP-L anonymous meter contract", () => {
  it("returns the daily allowance as the only anonymous meter authority", () => {
    const payload = buildAnonymousMeterStatusPayload({
      identity: {
        type: "anonymous",
        tenantId: "default",
        anonymousSessionId: "anon-session-1",
      },
      allowance: {
        kind: "anonymous_daily_prompts",
        surface: "spaces",
        period: "day",
        limit: 10,
        used: 3,
        remaining: 7,
        resetAt: "2026-07-15T00:00:00.000Z",
      },
      nowDate: new Date("2026-07-14T12:00:00.000Z"),
    });

    expect(payload).toEqual({
      success: true,
      contractVersion: "2026-07-14.anonymous-daily-meter.v1",
      generatedAt: "2026-07-14T12:00:00.000Z",
      identity: {
        type: "anonymous",
        tenantId: "default",
        userId: null,
        anonymousSessionId: "anon-session-1",
      },
      plan: {
        tier: "anonymous",
        label: "Anonymous",
        source: "anonymous_daily_allowance",
      },
      enforced: {
        kind: "anonymous_daily_prompts",
        surface: "spaces",
        period: "day",
        limit: 10,
        used: 3,
        remaining: 7,
        resetAt: "2026-07-15T00:00:00.000Z",
      },
    });

    expect(payload).not.toHaveProperty("weekly");
    expect(payload).not.toHaveProperty("rolling");
    expect(payload).not.toHaveProperty("availableNow");
    expect(payload).not.toHaveProperty("products");
  });

  it("answers anonymous status requests before the unit meter path", async () => {
    const allowance = {
      kind: "anonymous_daily_prompts",
      surface: "spaces",
      period: "day",
      limit: 10,
      used: 4,
      remaining: 6,
      resetAt: "2026-07-15T00:00:00.000Z",
    };
    const readAllowance = jest.fn(async () => allowance);
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const respond = createAnonymousMeterStatusResponder({ readAllowance });

    const handled = await respond(
      { headers: { "user-agent": "test" } },
      { status },
      {
        type: "anonymous",
        tenantId: "default",
        anonymousSessionId: "anon-session-2",
      }
    );

    expect(handled).toBe(true);
    expect(readAllowance).toHaveBeenCalledTimes(1);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        identity: expect.objectContaining({ type: "anonymous" }),
        enforced: allowance,
      })
    );
  });

  it("retires every anonymous unit-meter operation with a named user-safe denial", () => {
    expect(
      buildAnonymousUnitMeterDenial({
        type: "anonymous",
        anonymousSessionId: "anon-session-3",
      })
    ).toEqual({
      status: 403,
      body: {
        success: false,
        error: "anonymous_unit_meter_retired",
        code: "anonymous_unit_meter_retired",
        message:
          "Anonymous usage uses the daily free-turn allowance. Use an anonymous product endpoint or sign in.",
        retryable: false,
      },
    });
  });
});
