import { describe, expect, test, jest } from "@jest/globals";
import {
  createProvisionConfirmationCache,
  ensureProvisionedBeforeChat,
  streamChatWithProvisionRetry,
} from "./agent-ensure-provisioned.js";

describe("createProvisionConfirmationCache — recent-confirmation TTL (B4/P1-16)", () => {
  test("a user is unconfirmed until recorded, then confirmed within the TTL", () => {
    let now = 1_000_000;
    const cache = createProvisionConfirmationCache({ ttlMs: 60_000, nowFn: () => now });

    expect(cache.hasRecentConfirmation("7")).toBe(false);

    cache.recordConfirmation("7");
    expect(cache.hasRecentConfirmation("7")).toBe(true);

    now += 59_999;
    expect(cache.hasRecentConfirmation("7")).toBe(true);

    now += 2;
    expect(cache.hasRecentConfirmation("7")).toBe(false);
  });

  test("invalidate forces a re-provision on the next check", () => {
    let now = 5_000;
    const cache = createProvisionConfirmationCache({ ttlMs: 60_000, nowFn: () => now });
    cache.recordConfirmation("9");
    expect(cache.hasRecentConfirmation("9")).toBe(true);

    cache.invalidate("9");
    expect(cache.hasRecentConfirmation("9")).toBe(false);
  });

  test("confirmations are per-user", () => {
    const cache = createProvisionConfirmationCache({ ttlMs: 60_000, nowFn: () => 0 });
    cache.recordConfirmation("1");
    expect(cache.hasRecentConfirmation("1")).toBe(true);
    expect(cache.hasRecentConfirmation("2")).toBe(false);
  });
});

describe("ensureProvisionedBeforeChat — proactive lazy (re)provision (B4/P1-16)", () => {
  test("skips the provision call when the BFF has a recent confirmation", async () => {
    const cache = createProvisionConfirmationCache({ ttlMs: 60_000, nowFn: () => 0 });
    cache.recordConfirmation("7");
    const ensureProvisioned = jest.fn();

    const result = await ensureProvisionedBeforeChat({
      userId: "7",
      cache,
      ensureProvisioned,
    });

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(ensureProvisioned).not.toHaveBeenCalled();
  });

  test("provisions and records a confirmation when none is recent", async () => {
    const cache = createProvisionConfirmationCache({ ttlMs: 60_000, nowFn: () => 0 });
    const ensureProvisioned = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    const result = await ensureProvisionedBeforeChat({
      userId: "7",
      cache,
      ensureProvisioned,
    });

    expect(ensureProvisioned).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(false);
    expect(cache.hasRecentConfirmation("7")).toBe(true);
  });

  test("a provision 503 blocks chat (ok=false) and does NOT record a confirmation", async () => {
    const cache = createProvisionConfirmationCache({ ttlMs: 60_000, nowFn: () => 0 });
    const ensureProvisioned = jest.fn().mockResolvedValue({ ok: false, status: 503 });

    const result = await ensureProvisionedBeforeChat({
      userId: "7",
      cache,
      ensureProvisioned,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
    expect(cache.hasRecentConfirmation("7")).toBe(false);
  });
});

describe("streamChatWithProvisionRetry — FK/not-found re-provision-and-retry ONCE (B4/P1-16)", () => {
  const okJsonResponse = (status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "application/json" },
  });
  const fkJsonResponse = (status = 400) => ({
    ok: false,
    status,
    clone() {
      return {
        json: async () => ({ error: "violates foreign key constraint" }),
      };
    },
    headers: { get: () => "application/json" },
  });

  test("returns the first upstream response when it is not an FK/not-found failure", async () => {
    const cache = createProvisionConfirmationCache({ ttlMs: 60_000, nowFn: () => 0 });
    const first = okJsonResponse(200);
    const requestChatStream = jest.fn().mockResolvedValue(first);
    const ensureProvisioned = jest.fn();

    const result = await streamChatWithProvisionRetry({
      userId: "7",
      cache,
      requestChatStream,
      ensureProvisioned,
    });

    expect(result.upstream).toBe(first);
    expect(result.reprovisioned).toBe(false);
    expect(ensureProvisioned).not.toHaveBeenCalled();
    expect(requestChatStream).toHaveBeenCalledTimes(1);
  });

  test("on an FK/not-found first write: re-provisions then retries the stream ONCE", async () => {
    const cache = createProvisionConfirmationCache({ ttlMs: 60_000, nowFn: () => 0 });
    cache.recordConfirmation("7"); // a stale confirmation must be invalidated by the retry path
    const retried = okJsonResponse(200);
    const requestChatStream = jest
      .fn()
      .mockResolvedValueOnce(fkJsonResponse(400))
      .mockResolvedValueOnce(retried);
    const ensureProvisioned = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    const result = await streamChatWithProvisionRetry({
      userId: "7",
      cache,
      requestChatStream,
      ensureProvisioned,
    });

    expect(ensureProvisioned).toHaveBeenCalledTimes(1);
    expect(requestChatStream).toHaveBeenCalledTimes(2);
    expect(result.upstream).toBe(retried);
    expect(result.reprovisioned).toBe(true);
    expect(cache.hasRecentConfirmation("7")).toBe(true);
  });

  test("does NOT retry a second time when the FK failure repeats after re-provision", async () => {
    const cache = createProvisionConfirmationCache({ ttlMs: 60_000, nowFn: () => 0 });
    const stillFk = fkJsonResponse(400);
    const requestChatStream = jest
      .fn()
      .mockResolvedValueOnce(fkJsonResponse(400))
      .mockResolvedValueOnce(stillFk);
    const ensureProvisioned = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    const result = await streamChatWithProvisionRetry({
      userId: "7",
      cache,
      requestChatStream,
      ensureProvisioned,
    });

    expect(ensureProvisioned).toHaveBeenCalledTimes(1);
    expect(requestChatStream).toHaveBeenCalledTimes(2);
    expect(result.upstream).toBe(stillFk);
    expect(result.reprovisioned).toBe(true);
  });

  test("when re-provision itself fails, returns the original FK response WITHOUT retrying the stream", async () => {
    const cache = createProvisionConfirmationCache({ ttlMs: 60_000, nowFn: () => 0 });
    const fk = fkJsonResponse(400);
    const requestChatStream = jest.fn().mockResolvedValueOnce(fk);
    const ensureProvisioned = jest.fn().mockResolvedValue({ ok: false, status: 503 });

    const result = await streamChatWithProvisionRetry({
      userId: "7",
      cache,
      requestChatStream,
      ensureProvisioned,
    });

    expect(ensureProvisioned).toHaveBeenCalledTimes(1);
    expect(requestChatStream).toHaveBeenCalledTimes(1);
    expect(result.upstream).toBe(fk);
    expect(result.reprovisioned).toBe(false);
    expect(result.provisionFailed).toBe(true);
  });

  test("does NOT re-provision a non-JSON upstream error (e.g. a streamed 5xx)", async () => {
    const cache = createProvisionConfirmationCache({ ttlMs: 60_000, nowFn: () => 0 });
    const nonJson = { ok: false, status: 502, headers: { get: () => "text/event-stream" } };
    const requestChatStream = jest.fn().mockResolvedValue(nonJson);
    const ensureProvisioned = jest.fn();

    const result = await streamChatWithProvisionRetry({
      userId: "7",
      cache,
      requestChatStream,
      ensureProvisioned,
    });

    expect(ensureProvisioned).not.toHaveBeenCalled();
    expect(requestChatStream).toHaveBeenCalledTimes(1);
    expect(result.upstream).toBe(nonJson);
  });
});
