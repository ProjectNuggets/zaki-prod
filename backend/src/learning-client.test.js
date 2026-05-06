import { describe, expect, test, jest } from "@jest/globals";
import {
  fetchLearningPath,
  fetchLearningProxyPath,
  fetchLearningSession,
  fetchLearningSessions,
  getLearningBase,
  probeLearningHealth,
  probeLearningReady,
} from "./learning-client.js";

describe("learning client", () => {
  test("normalizes learning base", () => {
    expect(getLearningBase(" http://learning:8001/ ")).toBe("http://learning:8001");
    expect(getLearningBase("")).toBeNull();
  });

  test("probes health and readiness with downstream headers", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const base = {
      baseUrl: "http://learning:8001",
      internalToken: "secret",
      userId: "7",
      requestId: "req-1",
      fetchWithTimeout,
      timeoutMs: 1000,
    };

    await probeLearningHealth(base);
    await probeLearningReady(base);

    expect(fetchWithTimeout).toHaveBeenNthCalledWith(
      1,
      "http://learning:8001/healthz",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "X-Internal-Token": "secret",
          "X-Zaki-User-Id": "7",
          "X-Request-Id": "req-1",
        }),
      }),
      1000,
      "Learning health probe"
    );
    expect(fetchWithTimeout).toHaveBeenNthCalledWith(
      2,
      "http://learning:8001/readyz",
      expect.objectContaining({ method: "GET" }),
      1000,
      "Learning ready probe"
    );
  });

  test("fetches sessions and session detail", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const base = {
      baseUrl: "http://learning:8001/",
      internalToken: "secret",
      userId: "8",
      requestId: "req-2",
      fetchWithTimeout,
      timeoutMs: 5000,
    };

    await fetchLearningSessions({ ...base, limit: 25, offset: 10 });
    await fetchLearningSession({ ...base, sessionId: "session:main" });

    expect(fetchWithTimeout).toHaveBeenNthCalledWith(
      1,
      "http://learning:8001/api/v1/sessions?limit=25&offset=10",
      expect.objectContaining({ method: "GET" }),
      5000,
      "Learning sessions request"
    );
    expect(fetchWithTimeout).toHaveBeenNthCalledWith(
      2,
      "http://learning:8001/api/v1/sessions/session%3Amain",
      expect.objectContaining({ method: "GET" }),
      5000,
      "Learning session request"
    );
  });

  test("posts JSON bodies", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    await fetchLearningPath({
      baseUrl: "http://learning:8001",
      internalToken: "secret",
      userId: "9",
      requestId: "req-3",
      path: "/api/v1/book/books",
      method: "POST",
      body: { user_intent: "learn calculus" },
      fetchWithTimeout,
      timeoutMs: 10000,
    });

    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "http://learning:8001/api/v1/book/books",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ user_intent: "learn calculus" }),
      }),
      10000,
      "Learning upstream request"
    );
  });

  test("proxies multipart upload streams without leaking browser auth", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const req = {
      method: "POST",
      headers: {
        authorization: "Bearer browser-token",
        cookie: "refresh=secret",
        "content-type": "multipart/form-data; boundary=abc",
        "x-internal-token": "evil",
        "x-zaki-user-id": "999",
        accept: "application/json",
      },
      pipe() {},
    };

    await fetchLearningProxyPath({
      baseUrl: "http://learning:8001",
      internalToken: "secret",
      userId: "10",
      requestId: "req-raw",
      path: "/api/v1/knowledge/main/upload",
      req,
      fetchWithTimeout,
      timeoutMs: 30000,
    });

    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "http://learning:8001/api/v1/knowledge/main/upload",
      expect.objectContaining({
        method: "POST",
        body: req,
        duplex: "half",
        headers: expect.objectContaining({
          "Content-Type": "multipart/form-data; boundary=abc",
          "X-Internal-Token": "secret",
          "X-Zaki-User-Id": "10",
          accept: "application/json",
        }),
      }),
      30000,
      "Learning upstream proxy request"
    );
    const [, options] = fetchWithTimeout.mock.calls[0];
    expect(options.headers.authorization).toBeUndefined();
    expect(options.headers.cookie).toBeUndefined();
    expect(options.headers["x-internal-token"]).toBeUndefined();
    expect(options.headers["x-zaki-user-id"]).toBeUndefined();
  });

  test("throws when required config is missing", async () => {
    const fetchWithTimeout = jest.fn();
    await expect(
      fetchLearningPath({
        baseUrl: "",
        internalToken: "secret",
        userId: "7",
        requestId: "req-4",
        path: "/healthz",
        fetchWithTimeout,
        timeoutMs: 1000,
      })
    ).rejects.toThrow("LEARNING_ENGINE_BASE_URL is not configured.");
    await expect(
      fetchLearningPath({
        baseUrl: "http://learning:8001",
        internalToken: "",
        userId: "7",
        requestId: "req-5",
        path: "/healthz",
        fetchWithTimeout,
        timeoutMs: 1000,
      })
    ).rejects.toThrow("LEARNING_ENGINE_INTERNAL_TOKEN is not configured.");
  });
});
