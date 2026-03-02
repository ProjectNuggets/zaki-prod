import { describe, it, expect, jest } from "@jest/globals";
import {
  resolveSyncMaxAttempts,
  runBillingSyncWithRetries,
  shouldRetryBillingSyncError,
} from "./billing-reconciliation.js";

describe("billing reconciliation retries", () => {
  it("retries transient failures then succeeds", async () => {
    const syncFn = jest
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("timeout"), { status: 503 }))
      .mockResolvedValueOnce({ updated: true });
    const sleepFn = jest.fn().mockResolvedValue(undefined);

    const output = await runBillingSyncWithRetries(syncFn, {
      maxAttempts: 3,
      baseDelayMs: 50,
      sleepFn,
    });

    expect(output.result).toEqual({ updated: true });
    expect(output.attemptsUsed).toBe(2);
    expect(output.maxAttempts).toBe(3);
    expect(syncFn).toHaveBeenCalledTimes(2);
    expect(sleepFn).toHaveBeenCalledWith(50);
  });

  it("does not retry non-retryable failures", async () => {
    const err = Object.assign(new Error("invalid request"), { status: 400 });
    const syncFn = jest.fn().mockRejectedValue(err);
    const sleepFn = jest.fn().mockResolvedValue(undefined);

    await expect(
      runBillingSyncWithRetries(syncFn, { maxAttempts: 3, sleepFn })
    ).rejects.toThrow("invalid request");
    expect(syncFn).toHaveBeenCalledTimes(1);
    expect(sleepFn).not.toHaveBeenCalled();
  });

  it("classifies retryable errors", () => {
    expect(shouldRetryBillingSyncError({ status: 429 })).toBe(true);
    expect(shouldRetryBillingSyncError({ code: "ETIMEDOUT" })).toBe(true);
    expect(shouldRetryBillingSyncError({ message: "service temporarily unavailable" })).toBe(true);
    expect(shouldRetryBillingSyncError({ status: 401 })).toBe(false);
  });

  it("normalizes retry counts into attempt caps", () => {
    expect(resolveSyncMaxAttempts(undefined)).toBe(2);
    expect(resolveSyncMaxAttempts(0)).toBe(1);
    expect(resolveSyncMaxAttempts(1)).toBe(2);
    expect(resolveSyncMaxAttempts(10)).toBe(5);
  });
});
