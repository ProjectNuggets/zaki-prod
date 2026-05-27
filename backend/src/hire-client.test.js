import { describe, expect, test, jest } from "@jest/globals";
import {
  fetchHireDeploymentReadiness,
  fetchHireOperatorProviderHealth,
  fetchHireOperatorProviderSmoke,
  fetchHireOperatorReadiness,
  fetchHirePath,
  fetchHireProxyPath,
  getHireBase,
  probeHireHealth,
} from "./hire-client.js";

describe("hire client", () => {
  test("normalizes hire base", () => {
    expect(getHireBase(" http://hire:8002/ ")).toBe("http://hire:8002");
    expect(getHireBase("")).toBeNull();
  });

  test("probes health and deployment readiness with downstream headers", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const base = {
      baseUrl: "http://hire:8002",
      internalToken: "secret",
      userId: "7",
      requestId: "req-1",
      fetchWithTimeout,
      timeoutMs: 1000,
    };

    await probeHireHealth(base);
    await fetchHireDeploymentReadiness(base);

    expect(fetchWithTimeout).toHaveBeenNthCalledWith(
      1,
      "http://hire:8002/health",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer secret",
          "X-Internal-Token": "secret",
          "X-Zaki-User-Id": "7",
          "X-Request-Id": "req-1",
        }),
      }),
      1000,
      "Hire health probe"
    );
    expect(fetchWithTimeout).toHaveBeenNthCalledWith(
      2,
      "http://hire:8002/internal/v1/deployment-readiness",
      expect.objectContaining({ method: "GET" }),
      1000,
      "Hire deployment readiness request"
    );
  });

  test("calls operator handshake endpoints with downstream headers", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const base = {
      baseUrl: "http://hire:8002/",
      internalToken: "secret",
      userId: "7",
      requestId: "req-operator",
      fetchWithTimeout,
      timeoutMs: 1000,
    };

    await fetchHireOperatorReadiness(base);
    await fetchHireOperatorProviderHealth(base);
    await fetchHireOperatorProviderSmoke(base);

    expect(fetchWithTimeout).toHaveBeenNthCalledWith(
      1,
      "http://hire:8002/internal/v1/operator/hire/readiness",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer secret",
          "X-Internal-Token": "secret",
          "X-Zaki-User-Id": "7",
          "X-Request-Id": "req-operator",
        }),
      }),
      1000,
      "Hire operator readiness request"
    );
    expect(fetchWithTimeout).toHaveBeenNthCalledWith(
      2,
      "http://hire:8002/internal/v1/operator/hire/provider-health",
      expect.objectContaining({ method: "GET" }),
      1000,
      "Hire operator provider health request"
    );
    expect(fetchWithTimeout).toHaveBeenNthCalledWith(
      3,
      "http://hire:8002/internal/v1/operator/hire/provider-smoke",
      expect.objectContaining({ method: "POST", body: "{}" }),
      1000,
      "Hire operator provider smoke request"
    );
  });

  test("posts JSON bodies", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    await fetchHirePath({
      baseUrl: "http://hire:8002",
      internalToken: "secret",
      userId: "9",
      requestId: "req-3",
      path: "/api/v1/leads/manual",
      method: "POST",
      body: { title: "Backend Engineer" },
      fetchWithTimeout,
      timeoutMs: 10000,
    });

    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "http://hire:8002/api/v1/leads/manual",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ title: "Backend Engineer" }),
      }),
      10000,
      "Hire upstream request"
    );
  });

  test("forwards central meter grant headers to Hire", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    await fetchHirePath({
      baseUrl: "http://hire:8002",
      internalToken: "secret",
      userId: "9",
      requestId: "req-meter",
      path: "/api/v1/scan",
      method: "POST",
      body: {},
      fetchWithTimeout,
      timeoutMs: 10000,
      extraHeaders: {
        "X-Zaki-Meter-Grant-Id": "hmg_123",
        "X-Zaki-Meter-Grant": "signed-grant",
        "X-Zaki-Meter-Action": "hire.job.search",
      },
    });

    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "http://hire:8002/api/v1/scan",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Zaki-Meter-Grant-Id": "hmg_123",
          "X-Zaki-Meter-Grant": "signed-grant",
          "X-Zaki-Meter-Action": "hire.job.search",
        }),
      }),
      10000,
      "Hire upstream request"
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

    await fetchHireProxyPath({
      baseUrl: "http://hire:8002",
      internalToken: "secret",
      userId: "10",
      requestId: "req-raw",
      path: "/api/v1/ingest",
      req,
      fetchWithTimeout,
      timeoutMs: 30000,
    });

    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "http://hire:8002/api/v1/ingest",
      expect.objectContaining({
        method: "POST",
        body: req,
        duplex: "half",
        headers: expect.objectContaining({
          Authorization: "Bearer secret",
          "Content-Type": "multipart/form-data; boundary=abc",
          "X-Internal-Token": "secret",
          "X-Zaki-User-Id": "10",
          accept: "application/json",
        }),
      }),
      30000,
      "Hire upstream proxy request"
    );
    const [, options] = fetchWithTimeout.mock.calls[0];
    expect(options.headers.authorization).toBeUndefined();
    expect(options.headers["content-type"]).toBeUndefined();
    expect(options.headers.cookie).toBeUndefined();
    expect(options.headers["x-internal-token"]).toBeUndefined();
    expect(options.headers["x-zaki-user-id"]).toBeUndefined();
  });

  test("throws when required config is missing", async () => {
    const fetchWithTimeout = jest.fn();
    await expect(
      fetchHirePath({
        baseUrl: "",
        internalToken: "secret",
        userId: "7",
        requestId: "req-4",
        path: "/health",
        fetchWithTimeout,
        timeoutMs: 1000,
      })
    ).rejects.toThrow("HIRE_ENGINE_BASE_URL is not configured.");
    await expect(
      fetchHirePath({
        baseUrl: "http://hire:8002",
        internalToken: "",
        userId: "7",
        requestId: "req-5",
        path: "/health",
        fetchWithTimeout,
        timeoutMs: 1000,
      })
    ).rejects.toThrow("HIRE_ENGINE_INTERNAL_TOKEN is not configured.");
  });
});
