import { describe, expect, test, jest } from "@jest/globals";
import {
  ensureNullclawProvisioned,
  fetchNullclawPath,
  fetchNullclawUserHistory,
  getNullclawBase,
  probeNullclawReady,
  probeNullclawReadyWithRetry,
  requestNullalisUserPurge,
  requestNullclawChatStream,
} from "./agent-client.js";

describe("getNullclawBase", () => {
  test("trims and strips trailing slashes", () => {
    expect(getNullclawBase(" http://nullclaw:3000/ ")).toBe("http://nullclaw:3000");
    expect(getNullclawBase("")).toBeNull();
  });
});

describe("agent client", () => {
  test("requests the user purge with bound confirmation and internal headers", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    await requestNullalisUserPurge({
      baseUrl: "http://nullclaw:3000/",
      internalToken: "secret",
      userId: "42",
      requestId: "req-purge",
      fetchWithTimeout,
      timeoutMs: 10000,
    });

    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "http://nullclaw:3000/api/v1/users/42/data",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          "X-Internal-Token": "secret",
          "X-Zaki-User-Id": "42",
          "X-Request-Id": "req-purge",
        }),
        body: JSON.stringify({ confirm: "PURGE-USER-42" }),
      }),
      10000,
      "Nullalis GDPR user purge"
    );
  });

  test("probes readiness with internal headers", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    await probeNullclawReady({
      baseUrl: "http://nullclaw:3000/",
      internalToken: "secret",
      userId: "7",
      requestId: "req-1",
      fetchWithTimeout,
      timeoutMs: 1500,
    });

    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "http://nullclaw:3000/ready",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "X-Internal-Token": "secret",
          "X-Zaki-User-Id": "7",
          "X-Request-Id": "req-1",
        }),
      }),
      1500,
      "Agent upstream ready probe"
    );
  });

  test("posts agent chat stream payloads", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    await requestNullclawChatStream({
      baseUrl: "http://nullclaw:3000",
      internalToken: "secret",
      userId: "8",
      requestId: "req-2",
      payload: { message: "hello" },
      fetchWithTimeout,
      timeoutMs: 10000,
    });

    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "http://nullclaw:3000/api/v1/chat/stream",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ message: "hello" }),
      }),
      10000,
      "Agent upstream request"
    );
  });

  test("builds history request paths", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    await fetchNullclawUserHistory({
      baseUrl: "http://nullclaw:3000",
      internalToken: "secret",
      userId: "9",
      requestId: "req-3",
      spaceId: "zaki-bot",
      threadId: "main",
      fetchWithTimeout,
      timeoutMs: 5000,
    });

    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "http://nullclaw:3000/api/v1/users/9/history?space_id=zaki-bot&thread_id=main",
      expect.objectContaining({ method: "GET" }),
      5000,
      "Agent history request"
    );
  });

  test("throws when base URL or token is missing", async () => {
    const fetchWithTimeout = jest.fn();

    await expect(
      fetchNullclawPath({
        baseUrl: "",
        internalToken: "secret",
        userId: "7",
        requestId: "req-4",
        path: "/health",
        fetchWithTimeout,
        timeoutMs: 1000,
      })
    ).rejects.toThrow("NULLALIS_BASE_URL is not configured.");

    await expect(
      fetchNullclawPath({
        baseUrl: "http://nullclaw:3000",
        internalToken: "",
        userId: "7",
        requestId: "req-5",
        path: "/health",
        fetchWithTimeout,
        timeoutMs: 1000,
      })
    ).rejects.toThrow("NULLALIS_INTERNAL_TOKEN is not configured.");
  });
});

describe("probeNullclawReadyWithRetry — loosened readiness gate (P1-11)", () => {
  const baseOptions = () => ({
    baseUrl: "http://nullclaw:3000",
    internalToken: "secret",
    userId: "7",
    requestId: "req-ready",
    timeoutMs: 4000,
  });

  test("a single ok probe yields decision=ready with no re-probe", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    const result = await probeNullclawReadyWithRetry({ ...baseOptions(), fetchWithTimeout });

    expect(result.decision).toBe("ready");
    expect(result.attempts).toBe(1);
    expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
  });

  test("a connected-but-slow probe (timeout) re-probes once then proceeds (no hard 503)", async () => {
    // First probe times out (our fetchWithTimeout throws a "timed out after" Error),
    // re-probe also times out → connected-but-slow → attempt the stream anyway.
    const fetchWithTimeout = jest
      .fn()
      .mockRejectedValueOnce(new Error("Agent upstream ready probe timed out after 4000ms"))
      .mockRejectedValueOnce(new Error("Agent upstream ready probe timed out after 4000ms"));

    const result = await probeNullclawReadyWithRetry({ ...baseOptions(), fetchWithTimeout });

    expect(result.decision).toBe("proceed");
    expect(result.attempts).toBe(2);
    expect(fetchWithTimeout).toHaveBeenCalledTimes(2);
  });

  test("a slow first probe that recovers on re-probe yields decision=ready", async () => {
    const fetchWithTimeout = jest
      .fn()
      .mockRejectedValueOnce(new Error("Agent upstream ready probe timed out after 4000ms"))
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const result = await probeNullclawReadyWithRetry({ ...baseOptions(), fetchWithTimeout });

    expect(result.decision).toBe("ready");
    expect(result.attempts).toBe(2);
  });

  test("a non-ok status re-probes once then proceeds when still connected (no hard 503)", async () => {
    const fetchWithTimeout = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: false, status: 503 });

    const result = await probeNullclawReadyWithRetry({ ...baseOptions(), fetchWithTimeout });

    expect(result.decision).toBe("proceed");
    expect(result.attempts).toBe(2);
    expect(result.lastStatus).toBe(503);
  });

  test("a true connection refusal (ECONNREFUSED) yields decision=refused after re-probe", async () => {
    const refusal = Object.assign(new Error("connect ECONNREFUSED 10.0.0.1:3000"), {
      code: "ECONNREFUSED",
    });
    const fetchWithTimeout = jest.fn().mockRejectedValue(refusal);

    const result = await probeNullclawReadyWithRetry({ ...baseOptions(), fetchWithTimeout });

    expect(result.decision).toBe("refused");
    expect(result.attempts).toBe(2);
    expect(result.lastError).toBe(refusal);
  });

  test("a refusal that recovers on re-probe yields decision=ready", async () => {
    const refusal = Object.assign(new Error("connect ECONNREFUSED 10.0.0.1:3000"), {
      code: "ECONNREFUSED",
    });
    const fetchWithTimeout = jest
      .fn()
      .mockRejectedValueOnce(refusal)
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const result = await probeNullclawReadyWithRetry({ ...baseOptions(), fetchWithTimeout });

    expect(result.decision).toBe("ready");
    expect(result.attempts).toBe(2);
  });
});

describe("ensureNullclawProvisioned — server-side ensure-provisioned (B4/P1-16)", () => {
  const baseOptions = () => ({
    baseUrl: "http://nullclaw:3000",
    internalToken: "secret",
    userId: "42",
    requestId: "req-prov",
    timeoutMs: 8000,
  });

  test("POSTs the provision payload to /api/v1/users/provision with internal headers", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    const result = await ensureNullclawProvisioned({
      ...baseOptions(),
      payload: { user_id: "42", plan_tier: "personal" },
      fetchWithTimeout,
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "http://nullclaw:3000/api/v1/users/provision",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Internal-Token": "secret",
          "X-Zaki-User-Id": "42",
          "X-Request-Id": "req-prov",
        }),
        body: JSON.stringify({ user_id: "42", plan_tier: "personal" }),
      }),
      8000,
      "Agent upstream provision"
    );
  });

  test("returns ok=false with the upstream status on a non-2xx provision response", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: false, status: 503 });

    const result = await ensureNullclawProvisioned({
      ...baseOptions(),
      payload: { user_id: "42" },
      fetchWithTimeout,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
  });

  test("returns ok=false with the thrown error on a connection-class outage", async () => {
    const outage = Object.assign(new Error("fetch failed"), { code: "ECONNREFUSED" });
    const fetchWithTimeout = jest.fn().mockRejectedValue(outage);

    const result = await ensureNullclawProvisioned({
      ...baseOptions(),
      payload: { user_id: "42" },
      fetchWithTimeout,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBeNull();
    expect(result.error).toBe(outage);
  });
});
