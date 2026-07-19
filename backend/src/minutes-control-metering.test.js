import { describe, expect, jest, test } from "@jest/globals";
import {
  MinutesControlMeteringError,
  minutesUnitsFromCapturedSeconds,
  reserveMinutesCapture,
  settleMinutesCapture,
} from "./minutes-control-metering.js";

describe("Minutes capture metering", () => {
  test("converts cumulative captured seconds to non-fractional bot minutes", () => {
    expect(minutesUnitsFromCapturedSeconds(0)).toBe(0);
    expect(minutesUnitsFromCapturedSeconds(1)).toBe(1);
    expect(minutesUnitsFromCapturedSeconds(60)).toBe(1);
    expect(minutesUnitsFromCapturedSeconds(61)).toBe(2);
  });

  test("namespaces a reservation by tenant and owner before calling the ledger", async () => {
    const reserveUnits = jest.fn().mockResolvedValue({ ok: true, hold: { id: "hold-01" } });
    const deterministicGrantId = jest.fn().mockReturnValue("grant-01");
    const result = await reserveMinutesCapture({
      zakiUser: { id: 42, plan_tier: "personal" },
      tenantId: "default",
      idempotencyKey: "capture-01",
      reservedUnits: 60,
      nowMs: Date.parse("2026-07-19T10:00:00.000Z"),
      reserveUnits,
      deterministicGrantId,
    });
    expect(result.hold.id).toBe("hold-01");
    expect(deterministicGrantId).toHaveBeenCalledWith("minutes-control:default:42:capture-01");
    expect(reserveUnits).toHaveBeenCalledWith(expect.objectContaining({
      userId: "42", productId: "minutes", action: "minutes_capture", reservedUnits: 60,
    }));
  });

  test("maps a ledger quota denial to the closed control response", async () => {
    await expect(reserveMinutesCapture({
      zakiUser: { id: 42 },
      idempotencyKey: "capture-01",
      reservedUnits: 60,
      reserveUnits: jest.fn().mockResolvedValue({ ok: false, reason: "insufficient_units" }),
    })).rejects.toMatchObject({
      code: "quota_exhausted",
      status: 429,
      retryable: false,
    });
  });

  test("settles the true cumulative cost when capture duration exceeds its initial hold", async () => {
    const settleHold = jest.fn().mockResolvedValue({ ok: true, hold: { state: "settled" } });
    await settleMinutesCapture({
      holdId: "hold-01",
      idempotencyKey: "event-01",
      capturedSecondsTotal: 7_201,
      settleHold,
    });
    expect(settleHold).toHaveBeenCalledWith(expect.objectContaining({
      holdId: "hold-01",
      settledUnits: 121,
      finalState: "settled",
      recordTrueCost: true,
    }), undefined);
  });

  test("refuses to acknowledge a terminal callback after the paid hold expired", async () => {
    await expect(settleMinutesCapture({
      holdId: "hold-01",
      idempotencyKey: "event-late",
      capturedSecondsTotal: 60,
      settleHold: jest.fn().mockResolvedValue({ ok: true, idempotent: true, hold: { state: "expired" } }),
    })).rejects.toMatchObject({
      code: "upstream_unavailable",
      status: 503,
      retryable: true,
    });
  });
});
