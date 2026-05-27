import { describe, expect, test, jest } from "@jest/globals";
import {
  fetchDesignPath,
  fetchDesignProxyPath,
  getDesignBase,
  probeDesignReady,
} from "./design-client.js";
import {
  getBlockedHostedDesignPathReason,
  prepareDesignClientPayload,
  sanitizeDesignClientPayload,
  sanitizeDesignUpstreamPayload,
} from "./design-bff-contract.js";
import {
  buildDesignStorageLimitPayload,
  checkDesignContentLength,
  checkDesignStorageQuota,
  resolveDesignQuotaPolicy,
} from "./design-quota.js";

describe("design client", () => {
  test("normalizes design base", () => {
    expect(getDesignBase(" http://design:7456/ ")).toBe("http://design:7456");
    expect(getDesignBase("")).toBeNull();
  });

  test("probes readiness with downstream headers", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    await probeDesignReady({
      baseUrl: "http://design:7456",
      internalToken: "secret",
      userId: "7",
      requestId: "req-1",
      fetchWithTimeout,
      timeoutMs: 1000,
    });

    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "http://design:7456/readyz",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "X-Internal-Token": "secret",
          "X-Zaki-User-Id": "7",
          "X-Zaki-Product-Id": "design",
          "X-Request-Id": "req-1",
        }),
      }),
      1000,
      "Design ready probe"
    );
  });

  test("posts JSON bodies", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    await fetchDesignPath({
      baseUrl: "http://design:7456",
      internalToken: "secret",
      userId: "9",
      requestId: "req-2",
      path: "/api/projects",
      method: "POST",
      body: { id: "brand-kit", name: "Brand kit" },
      fetchWithTimeout,
      timeoutMs: 10000,
    });

    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "http://design:7456/api/projects",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ id: "brand-kit", name: "Brand kit" }),
      }),
      10000,
      "Design upstream request"
    );
  });

  test("proxies streams without leaking browser auth", async () => {
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

    await fetchDesignProxyPath({
      baseUrl: "http://design:7456",
      internalToken: "secret",
      userId: "10",
      requestId: "req-raw",
      path: "/api/upload",
      req,
      fetchWithTimeout,
      timeoutMs: 30000,
    });

    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "http://design:7456/api/upload",
      expect.objectContaining({
        method: "POST",
        body: req,
        duplex: "half",
        headers: expect.objectContaining({
          "Content-Type": "multipart/form-data; boundary=abc",
          "X-Internal-Token": "secret",
          "X-Zaki-User-Id": "10",
          "X-Zaki-Product-Id": "design",
          accept: "application/json",
        }),
      }),
      30000,
      "Design upstream proxy request"
    );
    const [, options] = fetchWithTimeout.mock.calls[0];
    expect(options.headers.authorization).toBeUndefined();
    expect(options.headers.cookie).toBeUndefined();
    expect(options.headers["x-internal-token"]).toBeUndefined();
    expect(options.headers["x-zaki-user-id"]).toBeUndefined();
  });

  test("strips privileged local path fields", () => {
    expect(sanitizeDesignClientPayload({
      name: "Project",
      baseDir: "/etc",
      metadata: { kind: "web" },
    })).toEqual({
      name: "Project",
      metadata: { kind: "web" },
    });
    expect(sanitizeDesignUpstreamPayload({
      project: { id: "p1", metadata: { baseDir: "/tmp/private", kind: "web" } },
      resolvedDir: "/tmp/private",
    })).toEqual({
      project: { id: "p1", metadata: { kind: "web" } },
    });
  });

  test("blocks local-host design daemon paths from the hosted BFF", () => {
    expect(getBlockedHostedDesignPathReason("/api/import/folder")).toMatch(/local folder/);
    expect(getBlockedHostedDesignPathReason("/api/projects/p1/open-in")).toMatch(/host application/);
    expect(getBlockedHostedDesignPathReason("/api/projects/p1/files")).toBeNull();
  });

  test("generates server-owned project ids for project creation", () => {
    const payload = prepareDesignClientPayload({
      method: "POST",
      path: "/api/projects",
      payload: { id: "client-controlled", name: "Project" },
      generateProjectId: () => "design-server-id",
    });
    expect(payload).toEqual({ id: "design-server-id", name: "Project" });
  });

  test("enforces design request and storage quota policy", () => {
    const policy = resolveDesignQuotaPolicy(
      { plan_tier: "free", plan_status: "inactive" },
      {
        env: {
          ZAKI_DESIGN_FREE_MAX_REQUEST_BYTES: "1024",
          ZAKI_DESIGN_FREE_TENANT_STORAGE_BYTES: "2048",
        },
      }
    );
    expect(checkDesignContentLength({ incomingBytes: 2048, policy })).toMatchObject({
      allowed: false,
      maxBytes: 1024,
    });
    const storageDecision = checkDesignStorageQuota({
      currentBytes: 1900,
      incomingBytes: 200,
      policy,
    });
    expect(storageDecision).toMatchObject({
      allowed: false,
      maxBytes: 2048,
      projectedBytes: 2100,
    });
    expect(buildDesignStorageLimitPayload(storageDecision, "req-1", policy)).toMatchObject({
      code: "design_storage_limit_reached",
      requestId: "req-1",
      policyTier: "free",
    });
  });
});
