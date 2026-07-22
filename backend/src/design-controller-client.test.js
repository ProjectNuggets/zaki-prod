import { describe, expect, jest, test } from "@jest/globals";
import { DesignControllerClient } from "./design-controller-client.js";

describe("DesignControllerClient", () => {
  test("ensures a session with only the hub-to-controller bearer", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue(new Response(JSON.stringify({
      session: {
        id: "sess_01",
        projectId: "project_01",
        state: "STARTING",
        generation: 7,
      },
      retryAfterMs: 1000,
    }), { status: 202, headers: { "content-type": "application/json" } }));
    const client = new DesignControllerClient({
      baseUrl: "http://zaki-design-controller.design-sessions.svc.cluster.local:7460",
      token: "hub-controller-secret",
      fetchWithTimeout,
      timeoutMs: 180000,
    });

    await expect(client.ensure({
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      desiredGeneration: 7,
      requestId: "req_01",
    })).resolves.toMatchObject({
      session: { id: "sess_01", state: "STARTING", generation: 7 },
      retryAfterMs: 1000,
    });
    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "http://zaki-design-controller.design-sessions.svc.cluster.local:7460/internal/v1/sessions/ensure",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer hub-controller-secret",
          "x-request-id": "req_01",
        }),
      }),
      180000,
      "Design controller ensure"
    );
  });

  test("rejects controller responses that expose worker coordinates", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue(new Response(JSON.stringify({
      session: {
        id: "sess_01",
        projectId: "project_01",
        state: "READY",
        generation: 0,
        podIP: "10.42.0.8",
      },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const client = new DesignControllerClient({
      baseUrl: "http://controller.internal:7460",
      token: "hub-controller-secret",
      fetchWithTimeout,
    });
    await expect(client.ensure({
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      desiredGeneration: 0,
      requestId: "req_02",
    })).rejects.toMatchObject({ code: "DESIGN_CONTROLLER_RESPONSE_INVALID" });
  });

  test("sends the committed generation for deletion-only stop finalization", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue(new Response(JSON.stringify({
      session: {
        id: "sess_01",
        projectId: "project_01",
        state: "STOPPED",
        generation: 8,
      },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const client = new DesignControllerClient({
      baseUrl: "http://controller.internal:7460",
      token: "hub-controller-secret",
      fetchWithTimeout,
    });

    await client.stop({
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      expectedGeneration: 8,
      committedGeneration: 8,
      requestId: "req_finalize_01",
    });

    const [, options] = fetchWithTimeout.mock.calls[0] ?? [];
    expect(JSON.parse(options.body)).toEqual({
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      expectedGeneration: 8,
      committedGeneration: 8,
    });
  });

  test("proxies through the controller while replacing browser credentials with the hub bearer", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue(new Response("proxied", {
      status: 200,
      headers: { "content-type": "text/plain" },
    }));
    const client = new DesignControllerClient({
      baseUrl: "http://controller.internal:7460",
      token: "hub-controller-secret",
      fetchWithTimeout,
    });
    const response = await client.proxy({
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      expectedGeneration: 7,
      targetPath: "/api/projects/project_01?include=files",
      method: "GET",
      headers: {
        authorization: "Bearer browser-secret",
        cookie: "session=secret",
        accept: "application/json",
      },
      requestId: "req_proxy_01",
    });
    expect(await response.text()).toBe("proxied");
    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "http://controller.internal:7460/internal/v1/sessions/sess_01/proxy/api/projects/project_01?include=files",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "Bearer hub-controller-secret",
          accept: "application/json",
          "x-zaki-project-id": "project_01",
          "x-zaki-user-id": "42",
          "x-zaki-tenant-id": "default",
          "x-zaki-design-generation": "7",
        }),
      }),
      180000,
      "Design controller worker proxy"
    );
    const [, options] = fetchWithTimeout.mock.calls[0] ?? [];
    expect(options.headers.cookie).toBeUndefined();
  });

  test("allows read-only artifact delivery and rejects artifact mutations", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue(new Response("asset"));
    const client = new DesignControllerClient({
      baseUrl: "http://controller.internal:7460", token: "hub-controller-secret", fetchWithTimeout,
    });
    const input = {
      sessionId: "sess_01", projectId: "project_01", userId: "42", tenantId: "default",
      expectedGeneration: 7, headers: {}, requestId: "req_asset",
    };
    await expect(client.proxy({ ...input, targetPath: "/artifacts/site/index.html", method: "GET" }))
      .resolves.toBeInstanceOf(Response);
    await expect(client.proxy({ ...input, targetPath: "/frames/preview.png", method: "POST" }))
      .rejects.toMatchObject({ code: "DESIGN_CONTROLLER_REQUEST_INVALID" });
    expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
  });

  test("rejects encoded dot segments before proxy URL normalization", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue(new Response("unexpected"));
    const client = new DesignControllerClient({
      baseUrl: "http://controller.internal:7460", token: "hub-controller-secret", fetchWithTimeout,
    });
    const input = {
      sessionId: "sess_01", projectId: "project_01", userId: "42", tenantId: "default",
      expectedGeneration: 7, headers: {}, requestId: "req_escape", method: "POST",
    };

    await expect(client.proxy({ ...input, targetPath: "/api/%2e%2e/healthz" }))
      .rejects.toMatchObject({ code: "DESIGN_CONTROLLER_REQUEST_INVALID", status: 400 });
    expect(fetchWithTimeout).not.toHaveBeenCalled();
  });

  test("fetches only read-only workbench assets with server credentials", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue(new Response("html"));
    const client = new DesignControllerClient({
      baseUrl: "http://controller.internal:7460", token: "hub-controller-secret", fetchWithTimeout,
    });
    await expect(client.workbench({
      targetPath: "/_next/static/app.js?v=1", method: "GET", requestId: "req_ui",
      headers: { cookie: "browser=secret", accept: "text/javascript" },
    })).resolves.toBeInstanceOf(Response);
    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "http://controller.internal:7460/internal/v1/workbench/_next/static/app.js?v=1",
      expect.objectContaining({ headers: {
        authorization: "Bearer hub-controller-secret", "x-request-id": "req_ui", accept: "text/javascript",
      } }),
      180000,
      "Design controller workbench"
    );
    await expect(client.workbench({ targetPath: "/", method: "POST", requestId: "req_bad" }))
      .rejects.toMatchObject({ status: 405 });
  });

  test("probes the controller readiness endpoint without sending a bearer", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue(new Response('{"ok":true}', {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    const client = new DesignControllerClient({
      baseUrl: "http://controller.internal:7460",
      token: "hub-controller-secret",
      fetchWithTimeout,
    });
    await expect(client.ready()).resolves.toEqual({ ok: true, upstreamStatus: 200 });
    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "http://controller.internal:7460/readyz",
      { method: "GET", redirect: "error" },
      5000,
      "Design controller readiness"
    );
  });

  test("rejects a declared oversized lifecycle response without buffering it", async () => {
    const text = jest.fn().mockRejectedValue(new Error("body must not be read"));
    const cancel = jest.fn().mockResolvedValue(undefined);
    const fetchWithTimeout = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-length": String(65 * 1024) }),
      body: { cancel },
      text,
    });
    const client = new DesignControllerClient({
      baseUrl: "http://controller.internal:7460",
      token: "hub-controller-secret",
      fetchWithTimeout,
    });

    await expect(client.status({
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      expectedGeneration: 7,
      requestId: "req_oversized",
    })).rejects.toMatchObject({ code: "DESIGN_CONTROLLER_RESPONSE_INVALID" });
    expect(text).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalled();
  });

  test("times out when a lifecycle JSON body stalls after response headers", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue(new Response(new ReadableStream({
      start() {
        // Intentionally never enqueue or close: the body deadline must cancel this stream.
      },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const client = new DesignControllerClient({
      baseUrl: "http://controller.internal:7460",
      token: "hub-controller-secret",
      fetchWithTimeout,
      timeoutMs: 1000,
    });

    await expect(client.status({
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      expectedGeneration: 7,
      requestId: "req_stalled",
    })).rejects.toMatchObject({ code: "DESIGN_CONTROLLER_UNAVAILABLE" });
  });
});
