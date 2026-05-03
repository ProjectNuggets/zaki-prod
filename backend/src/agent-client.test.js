import { describe, expect, test, jest } from "@jest/globals";
import {
  fetchNullclawPath,
  fetchNullclawUserHistory,
  getNullclawBase,
  probeNullclawReady,
  requestNullclawChatStream,
} from "./agent-client.js";

describe("getNullclawBase", () => {
  test("trims and strips trailing slashes", () => {
    expect(getNullclawBase(" http://nullclaw:3000/ ")).toBe("http://nullclaw:3000");
    expect(getNullclawBase("")).toBeNull();
  });
});

describe("agent client", () => {
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
