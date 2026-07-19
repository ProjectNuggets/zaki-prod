import { describe, expect, jest, test } from "@jest/globals";
import { resolveMinutesControlAccountErasure } from "./minutes-control-account-erasure.js";

describe("Minutes account-erasure gate", () => {
  test("fails retryably while control is dark when local state proves a prior capture exists", async () => {
    const eraseAccount = jest.fn();
    await expect(resolveMinutesControlAccountErasure({
      controlActive: false,
      zakiUser: { id: 42 },
      requestId: "erase-01",
      hasAccountState: jest.fn().mockResolvedValue(true),
      eraseAccount,
    })).resolves.toEqual({
      attempted: false,
      ok: false,
      status: 503,
      retryable: true,
      reason: "minutes_control_erasure_unavailable",
    });
    expect(eraseAccount).not.toHaveBeenCalled();
  });

  test("does not block a dark-plane erasure when there is no capture evidence", async () => {
    await expect(resolveMinutesControlAccountErasure({
      controlActive: false,
      zakiUser: { id: 42 },
      hasAccountState: jest.fn().mockResolvedValue(false),
    })).resolves.toEqual({ attempted: false, ok: true, reason: "minutes_control_not_ready" });
  });

  test("uses the raw-store erasure path once the coherent control plane is active", async () => {
    const eraseAccount = jest.fn().mockResolvedValue({ attempted: true, ok: true, receipt: { receiptId: "receipt-01" } });
    await expect(resolveMinutesControlAccountErasure({
      controlActive: true,
      zakiUser: { id: 42 },
      requestId: "erase-01",
      eraseAccount,
    })).resolves.toMatchObject({ attempted: true, ok: true });
    expect(eraseAccount).toHaveBeenCalledWith({ zakiUser: { id: 42 }, requestId: "erase-01" });
  });
});
