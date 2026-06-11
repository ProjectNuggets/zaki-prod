import { describe, expect, it, jest } from "@jest/globals";
import {
  APPROVE_RETRY_ATTEMPTS,
  APPROVE_RETRY_BACKOFF_MS,
  computeApproveRetryDelay,
  isRetryableUpstreamError,
  isRetryableUpstreamStatus,
  fetchWithUpstreamRetry,
} from "./agent-approve-retry.js";

describe("agent approve retry — connection-class classification", () => {
  it("treats ECONNREFUSED (direct and nested .cause) as retryable", () => {
    expect(isRetryableUpstreamError(Object.assign(new Error("connect"), { code: "ECONNREFUSED" }))).toBe(true);
    const wrapped = new Error("fetch failed");
    wrapped.cause = Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" });
    expect(isRetryableUpstreamError(wrapped)).toBe(true);
  });

  it('treats a bare "fetch failed" TypeError as retryable (undici connect refusal)', () => {
    expect(isRetryableUpstreamError(new TypeError("fetch failed"))).toBe(true);
  });

  it("treats transient socket errors (ECONNRESET / ETIMEDOUT / EAI_AGAIN) as retryable", () => {
    for (const code of ["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN"]) {
      expect(isRetryableUpstreamError(Object.assign(new Error(code), { code }))).toBe(true);
    }
  });

  it("does NOT treat an application/timeout error as a connection-class retry", () => {
    expect(isRetryableUpstreamError(new Error("Nullclaw proxy request timed out after 300000ms"))).toBe(false);
    expect(isRetryableUpstreamError(new Error("boom"))).toBe(false);
    expect(isRetryableUpstreamError(null)).toBe(false);
  });

  it("treats 502/503/504 upstream statuses as retryable, but not 4xx or 200/500", () => {
    expect(isRetryableUpstreamStatus(502)).toBe(true);
    expect(isRetryableUpstreamStatus(503)).toBe(true);
    expect(isRetryableUpstreamStatus(504)).toBe(true);
    expect(isRetryableUpstreamStatus(200)).toBe(false);
    expect(isRetryableUpstreamStatus(400)).toBe(false);
    expect(isRetryableUpstreamStatus(409)).toBe(false);
    expect(isRetryableUpstreamStatus(500)).toBe(false);
  });
});

describe("agent approve retry — jittered backoff schedule", () => {
  it("exposes a bounded 3-attempt schedule with ~250ms,1s,2s bases", () => {
    expect(APPROVE_RETRY_ATTEMPTS).toBe(3);
    expect(APPROVE_RETRY_BACKOFF_MS).toEqual([250, 1000, 2000]);
  });

  it("jitters each base within [base, base*1.5) and never exceeds the next base", () => {
    for (let i = 0; i < APPROVE_RETRY_BACKOFF_MS.length; i++) {
      const base = APPROVE_RETRY_BACKOFF_MS[i];
      const lo = computeApproveRetryDelay(i, () => 0);
      const hi = computeApproveRetryDelay(i, () => 0.999999);
      expect(lo).toBe(base);
      expect(hi).toBeGreaterThan(base);
      // Jitter band is [base, base*1.5]; rounding can touch the ceiling.
      expect(hi).toBeLessThanOrEqual(base * 1.5);
    }
  });
});

describe("fetchWithUpstreamRetry — idempotent approve proxy", () => {
  it("retries a connection-class throw then succeeds on the 2nd attempt", async () => {
    const sleep = jest.fn(async () => {});
    const doFetch = jest
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }))
      .mockResolvedValueOnce({ status: 200, ok: true });

    const result = await fetchWithUpstreamRetry(doFetch, { sleep });

    expect(doFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ status: 200, ok: true });
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("retries a 503 response then returns the eventual 200", async () => {
    const sleep = jest.fn(async () => {});
    const doFetch = jest
      .fn()
      .mockResolvedValueOnce({ status: 503, ok: false })
      .mockResolvedValueOnce({ status: 200, ok: true });

    const result = await fetchWithUpstreamRetry(doFetch, { sleep });

    expect(doFetch).toHaveBeenCalledTimes(2);
    expect(result.status).toBe(200);
  });

  it("does NOT retry a non-retryable 4xx — returns it on the first attempt", async () => {
    const sleep = jest.fn(async () => {});
    const doFetch = jest.fn().mockResolvedValueOnce({ status: 409, ok: false });

    const result = await fetchWithUpstreamRetry(doFetch, { sleep });

    expect(doFetch).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(409);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("stops after the bounded attempt budget and rethrows the last connection-class error", async () => {
    const sleep = jest.fn(async () => {});
    const err = Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" });
    const doFetch = jest.fn().mockRejectedValue(err);

    await expect(fetchWithUpstreamRetry(doFetch, { sleep })).rejects.toBe(err);

    expect(doFetch).toHaveBeenCalledTimes(APPROVE_RETRY_ATTEMPTS);
    expect(sleep).toHaveBeenCalledTimes(APPROVE_RETRY_ATTEMPTS - 1);
  });

  it("returns the final retryable status response after exhausting attempts (no throw)", async () => {
    const sleep = jest.fn(async () => {});
    const doFetch = jest.fn().mockResolvedValue({ status: 502, ok: false });

    const result = await fetchWithUpstreamRetry(doFetch, { sleep });

    expect(doFetch).toHaveBeenCalledTimes(APPROVE_RETRY_ATTEMPTS);
    expect(result.status).toBe(502);
  });

  it("invokes onRetry with attempt metadata for observability", async () => {
    const sleep = jest.fn(async () => {});
    const onRetry = jest.fn();
    const doFetch = jest
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("x"), { code: "ECONNRESET" }))
      .mockResolvedValueOnce({ status: 200, ok: true });

    await fetchWithUpstreamRetry(doFetch, { sleep, onRetry });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(
      expect.objectContaining({ attempt: 1, reason: "connection_error" })
    );
  });
});
