import { describe, expect, jest, test } from "@jest/globals";
import {
  MinutesControlMeteringError,
  minutesUnitsFromCapturedSeconds,
  reserveMinutesCapture,
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
});
