import express from "express";
import request from "supertest";
import { describe, expect, jest, test } from "@jest/globals";
import { buildDesignSessionRouter } from "./design-session-routes.js";

describe("Design public session routes", () => {
  test("authenticates the user, owns the binding in the hub, then asks the controller to ensure it", async () => {
    const ensureSession = jest.fn().mockResolvedValue({
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      state: "REQUESTED",
      generation: 7,
    });
    const controllerEnsure = jest.fn().mockResolvedValue({
      session: {
        id: "sess_01",
        projectId: "project_01",
        state: "STARTING",
        generation: 7,
      },
      retryAfterMs: 1000,
    });
    const app = express();
    app.use("/api/design/sessions", buildDesignSessionRouter({
      enabled: true,
      resolveUser: jest.fn().mockResolvedValue({ zakiUser: { id: 42 } }),
      ensureSession,
      readSessionBinding: jest.fn(),
      updateSessionState: jest.fn(),
      runInTransaction: jest.fn(),
      dbQuery: jest.fn(),
      createSessionId: () => "sess_01",
      controller: { ensure: controllerEnsure, status: jest.fn(), stop: jest.fn() },
      getRequestId: () => "req_01",
    }));

    const response = await request(app)
      .post("/api/design/sessions")
      .send({ projectId: "project_01" });
    expect(response.status).toBe(202);
    expect(response.body).toEqual({
      session: {
        id: "sess_01",
        projectId: "project_01",
        state: "STARTING",
        generation: 7,
      },
      retryAfterMs: 1000,
    });
    expect(ensureSession).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      projectId: "project_01",
      tenantId: "default",
    }));
    expect(controllerEnsure).toHaveBeenCalledWith({
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      desiredGeneration: 7,
      requestId: "req_01",
    });
  });

  test("keeps the ensure path as a compatibility alias", async () => {
    const ensureSession = jest.fn().mockResolvedValue({
      sessionId: "sess_compat",
      projectId: "project_compat",
      userId: "42",
      tenantId: "default",
      state: "REQUESTED",
      generation: 0,
    });
    const controllerEnsure = jest.fn().mockResolvedValue({
      session: {
        id: "sess_compat",
        projectId: "project_compat",
        state: "READY",
        generation: 0,
      },
    });
    const app = express();
    app.use("/api/design/sessions", buildDesignSessionRouter({
      enabled: true,
      resolveUser: jest.fn().mockResolvedValue({ zakiUser: { id: 42 } }),
      ensureSession,
      readSessionBinding: jest.fn(),
      updateSessionState: jest.fn(),
      runInTransaction: jest.fn(),
      dbQuery: jest.fn(),
      createSessionId: () => "sess_compat",
      controller: { ensure: controllerEnsure, status: jest.fn(), stop: jest.fn() },
      getRequestId: () => "req_compat",
    }));

    const response = await request(app)
      .post("/api/design/sessions/ensure")
      .send({ projectId: "project_compat" });

    expect(response.status).toBe(200);
    expect(response.body.session.id).toBe("sess_compat");
  });

  test("reads canonical session status with a GET and server-owned binding", async () => {
    const session = {
      sessionId: "sess_status",
      projectId: "project_status",
      userId: "42",
      tenantId: "default",
      state: "STARTING",
      generation: 3,
    };
    const controllerStatus = jest.fn().mockResolvedValue({
      session: {
        id: "sess_status",
        projectId: "project_status",
        state: "RESTORING",
        generation: 3,
      },
      retryAfterMs: 750,
    });
    const app = express();
    app.use("/api/design/sessions", buildDesignSessionRouter({
      enabled: true,
      resolveUser: jest.fn().mockResolvedValue({ zakiUser: { id: 42 } }),
      ensureSession: jest.fn(),
      readSessionBinding: jest.fn().mockResolvedValue(session),
      updateSessionState: jest.fn(),
      runInTransaction: jest.fn(),
      dbQuery: jest.fn(),
      createSessionId: jest.fn(),
      controller: { ensure: jest.fn(), status: controllerStatus, stop: jest.fn() },
      getRequestId: () => "req_status",
    }));

    const response = await request(app)
      .get("/api/design/sessions/sess_status?projectId=project_status");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      session: {
        id: "sess_status",
        projectId: "project_status",
        state: "RESTORING",
        generation: 3,
      },
      retryAfterMs: 750,
    });
    expect(controllerStatus).toHaveBeenCalledWith({
      sessionId: "sess_status",
      projectId: "project_status",
      userId: "42",
      tenantId: "default",
      expectedGeneration: 3,
      requestId: "req_status",
    });
  });

  test("keeps the lifecycle API dark when Design activation is off", async () => {
    const resolveUser = jest.fn();
    const app = express();
    app.use("/api/design/sessions", buildDesignSessionRouter({
      enabled: false,
      resolveUser,
      ensureSession: jest.fn(),
      readSessionBinding: jest.fn(),
      updateSessionState: jest.fn(),
      runInTransaction: jest.fn(),
      dbQuery: jest.fn(),
      createSessionId: jest.fn(),
      controller: { ensure: jest.fn(), status: jest.fn(), stop: jest.fn() },
      getRequestId: () => "req_02",
    }));
    const response = await request(app).post("/api/design/sessions/ensure").send({ projectId: "project_01" });
    expect(response.status).toBe(404);
    expect(resolveUser).not.toHaveBeenCalled();
  });

  test("finalizes a committed checkpoint instead of reopening the session", async () => {
    const controllerEnsure = jest.fn();
    const controllerStop = jest.fn().mockResolvedValue({
      session: {
        id: "sess_01",
        projectId: "project_01",
        state: "STOPPED",
        generation: 7,
      },
    });
    const updateSessionState = jest.fn();
    const app = express();
    app.use("/api/design/sessions", buildDesignSessionRouter({
      enabled: true,
      resolveUser: jest.fn().mockResolvedValue({ zakiUser: { id: 42 } }),
      ensureSession: jest.fn().mockResolvedValue({
        sessionId: "sess_01",
        projectId: "project_01",
        userId: "42",
        tenantId: "default",
        state: "CHECKPOINTING",
        generation: 7,
      }),
      readSessionBinding: jest.fn(),
      updateSessionState,
      runInTransaction: jest.fn(),
      dbQuery: jest.fn(),
      createSessionId: jest.fn(),
      controller: { ensure: controllerEnsure, status: jest.fn(), stop: controllerStop },
      getRequestId: () => "req_ensure_draining",
    }));

    const response = await request(app)
      .post("/api/design/sessions/ensure")
      .send({ projectId: "project_01" });

    expect(response.status).toBe(202);
    expect(response.body).toEqual({
      session: {
        id: "sess_01",
        projectId: "project_01",
        state: "STOPPED",
        generation: 7,
      },
    });
    expect(controllerEnsure).not.toHaveBeenCalled();
    expect(controllerStop).toHaveBeenCalledWith({
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      expectedGeneration: 7,
      committedGeneration: 7,
      requestId: "req_ensure_draining",
    });
    expect(updateSessionState).toHaveBeenCalledWith(expect.objectContaining({
      state: "STOPPED",
      generation: 7,
    }));
  });

  test("proxies only through a session binding owned by the authenticated user", async () => {
    const controllerProxy = jest.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    const app = express();
    app.use("/api/design/sessions", buildDesignSessionRouter({
      enabled: true,
      resolveUser: jest.fn().mockResolvedValue({ zakiUser: { id: 42 } }),
      ensureSession: jest.fn(),
      readSessionBinding: jest.fn().mockResolvedValue({
        sessionId: "sess_01",
        projectId: "project_01",
        userId: "42",
        tenantId: "default",
        state: "READY",
        generation: 7,
      }),
      updateSessionState: jest.fn(),
      runInTransaction: jest.fn(),
      dbQuery: jest.fn(),
      createSessionId: jest.fn(),
      controller: { ensure: jest.fn(), status: jest.fn(), stop: jest.fn(), proxy: controllerProxy },
      getRequestId: () => "req_proxy_01",
    }));
    const response = await request(app)
      .get("/api/design/sessions/sess_01/proxy/api/projects/project_01?include=files")
      .set("x-zaki-project-id", "project_01")
      .set("authorization", "Bearer browser-auth");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(controllerProxy).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      expectedGeneration: 7,
      targetPath: "/api/projects/project_01?include=files",
      method: "GET",
    }));
  });

  test("fails closed before proxying a mutation when the meter denies it", async () => {
    const controllerProxy = jest.fn();
    const authorizeProxy = jest.fn().mockResolvedValue({
      allowed: false,
      status: 402,
      body: { code: "design_meter_denied", requestId: "req_proxy_meter" },
    });
    const app = express();
    app.use("/api/design/sessions", buildDesignSessionRouter({
      enabled: true,
      resolveUser: jest.fn().mockResolvedValue({ zakiUser: { id: 42 } }),
      ensureSession: jest.fn(),
      readSessionBinding: jest.fn().mockResolvedValue({
        sessionId: "sess_01",
        projectId: "project_01",
        userId: "42",
        tenantId: "default",
        state: "READY",
        generation: 7,
      }),
      updateSessionState: jest.fn(),
      runInTransaction: jest.fn(),
      dbQuery: jest.fn(),
      createSessionId: jest.fn(),
      controller: { ensure: jest.fn(), status: jest.fn(), stop: jest.fn(), proxy: controllerProxy },
      getRequestId: () => "req_proxy_meter",
      authorizeProxy,
    }));

    const response = await request(app)
      .post("/api/design/sessions/sess_01/proxy/api/projects/project_01/files")
      .set("x-zaki-project-id", "project_01")
      .send({ name: "concept.html" });

    expect(response.status).toBe(402);
    expect(response.body).toEqual({ code: "design_meter_denied", requestId: "req_proxy_meter" });
    expect(authorizeProxy).toHaveBeenCalledWith(expect.objectContaining({
      method: "POST",
      targetPath: "/api/projects/project_01/files",
      requestId: "req_proxy_meter",
    }));
    expect(controllerProxy).not.toHaveBeenCalled();
  });

  test("streams a JSON mutation above the lifecycle parser limit", async () => {
    const content = "x".repeat(40 * 1024);
    let receivedBody = "";
    const controllerProxy = jest.fn().mockImplementation(async (input) => {
      for await (const chunk of input.body) receivedBody += chunk.toString();
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const app = express();
    app.use("/api/design/sessions", buildDesignSessionRouter({
      enabled: true,
      resolveUser: jest.fn().mockResolvedValue({ zakiUser: { id: 42 } }),
      ensureSession: jest.fn(),
      readSessionBinding: jest.fn().mockResolvedValue({
        sessionId: "sess_01",
        projectId: "project_01",
        userId: "42",
        tenantId: "default",
        state: "READY",
        generation: 7,
      }),
      updateSessionState: jest.fn(),
      runInTransaction: jest.fn(),
      dbQuery: jest.fn(),
      createSessionId: jest.fn(),
      controller: { ensure: jest.fn(), status: jest.fn(), stop: jest.fn(), proxy: controllerProxy },
      getRequestId: () => "req_proxy_stream",
      authorizeProxy: jest.fn().mockResolvedValue({ allowed: true, action: "design_file_write", grant: null }),
    }));

    const response = await request(app)
      .post("/api/design/sessions/sess_01/proxy/api/projects/project_01/files")
      .set("x-zaki-project-id", "project_01")
      .send({ content });

    expect(response.status).toBe(200);
    expect(receivedBody).toBe(JSON.stringify({ content }));
  });

  test("rejects proxy traffic after the session starts draining", async () => {
    const controllerProxy = jest.fn();
    const app = express();
    app.use("/api/design/sessions", buildDesignSessionRouter({
      enabled: true,
      resolveUser: jest.fn().mockResolvedValue({ zakiUser: { id: 42 } }),
      ensureSession: jest.fn(),
      readSessionBinding: jest.fn().mockResolvedValue({
        sessionId: "sess_01",
        projectId: "project_01",
        userId: "42",
        tenantId: "default",
        state: "DRAINING",
        generation: 7,
      }),
      updateSessionState: jest.fn(),
      runInTransaction: jest.fn(),
      dbQuery: jest.fn(),
      createSessionId: jest.fn(),
      controller: { ensure: jest.fn(), status: jest.fn(), stop: jest.fn(), proxy: controllerProxy },
      getRequestId: () => "req_proxy_draining",
    }));

    const response = await request(app)
      .get("/api/design/sessions/sess_01/proxy/api/projects/project_01")
      .set("x-zaki-project-id", "project_01");

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      code: "design_session_not_writable",
      state: "DRAINING",
      retryable: true,
    });
    expect(controllerProxy).not.toHaveBeenCalled();
  });

  test("marks the authoritative session draining before asking the controller to stop", async () => {
    const events = [];
    const session = {
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      state: "READY",
      generation: 7,
    };
    const beginSessionDrain = jest.fn().mockImplementation(async () => {
      events.push("drain");
      return { ...session, state: "DRAINING" };
    });
    const controllerStop = jest.fn().mockImplementation(async () => {
      events.push("stop");
      return { session: { id: "sess_01", projectId: "project_01", state: "STOPPED", generation: 8 } };
    });
    const app = express();
    app.use("/api/design/sessions", buildDesignSessionRouter({
      enabled: true,
      resolveUser: jest.fn().mockResolvedValue({ zakiUser: { id: 42 } }),
      ensureSession: jest.fn(),
      readSessionBinding: jest.fn().mockResolvedValue(session),
      beginSessionDrain,
      updateSessionState: jest.fn(),
      runInTransaction: jest.fn(),
      dbQuery: jest.fn(),
      createSessionId: jest.fn(),
      controller: { ensure: jest.fn(), status: jest.fn(), stop: controllerStop },
      getRequestId: () => "req_stop_01",
    }));

    const response = await request(app)
      .post("/api/design/sessions/sess_01/stop")
      .send({ projectId: "project_01" });

    expect(response.status).toBe(200);
    expect(events).toEqual(["drain", "stop"]);
    expect(beginSessionDrain).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: "sess_01",
      expectedGeneration: 7,
      requestId: "req_stop_01",
    }));
  });

  test("finalizes an already committed checkpoint on a direct stop retry", async () => {
    const session = {
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      state: "CHECKPOINTING",
      generation: 7,
    };
    const controllerStop = jest.fn().mockResolvedValue({
      session: { id: "sess_01", projectId: "project_01", state: "STOPPED", generation: 7 },
    });
    const app = express();
    app.use("/api/design/sessions", buildDesignSessionRouter({
      enabled: true,
      resolveUser: jest.fn().mockResolvedValue({ zakiUser: { id: 42 } }),
      ensureSession: jest.fn(),
      readSessionBinding: jest.fn().mockResolvedValue(session),
      beginSessionDrain: jest.fn().mockResolvedValue(session),
      updateSessionState: jest.fn(),
      runInTransaction: jest.fn(),
      dbQuery: jest.fn(),
      createSessionId: jest.fn(),
      controller: { ensure: jest.fn(), status: jest.fn(), stop: controllerStop },
      getRequestId: () => "req_stop_checkpointing",
    }));

    const response = await request(app)
      .post("/api/design/sessions/sess_01/stop")
      .send({ projectId: "project_01" });

    expect(response.status).toBe(200);
    expect(controllerStop).toHaveBeenCalledWith({
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      expectedGeneration: 7,
      committedGeneration: 7,
      requestId: "req_stop_checkpointing",
    });
  });

  test("settles a metered controller body failure as failed after containing the stream error", async () => {
    const streamError = new Error("controller body reset");
    const controllerProxy = jest.fn().mockResolvedValue(new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("partial"));
        controller.error(streamError);
      },
    })));
    const settleProxy = jest.fn().mockResolvedValue(undefined);
    const unhandled = jest.fn();
    process.on("uncaughtException", unhandled);
    const app = express();
    app.use("/api/design/sessions", buildDesignSessionRouter({
      enabled: true,
      resolveUser: jest.fn().mockResolvedValue({ zakiUser: { id: 42 } }),
      ensureSession: jest.fn(),
      readSessionBinding: jest.fn().mockResolvedValue({
        sessionId: "sess_01",
        projectId: "project_01",
        userId: "42",
        tenantId: "default",
        state: "READY",
        generation: 7,
      }),
      updateSessionState: jest.fn(),
      runInTransaction: jest.fn(),
      dbQuery: jest.fn(),
      createSessionId: jest.fn(),
      controller: { ensure: jest.fn(), status: jest.fn(), stop: jest.fn(), proxy: controllerProxy },
      getRequestId: () => "req_proxy_reset",
      authorizeProxy: jest.fn().mockResolvedValue({
        allowed: true,
        action: "design_file_write",
        grant: { grantId: "grant_reset" },
      }),
      settleProxy,
    }));

    try {
      await request(app)
        .post("/api/design/sessions/sess_01/proxy/api/projects/project_01/files")
        .set("x-zaki-project-id", "project_01")
        .send({ name: "concept.html" })
        .timeout({ response: 500, deadline: 500 })
        .catch(() => undefined);
      await new Promise((resolve) => setImmediate(resolve));
      expect(unhandled).not.toHaveBeenCalled();
      expect(settleProxy).toHaveBeenCalledTimes(1);
      expect(settleProxy).toHaveBeenCalledWith(expect.objectContaining({
        requestId: "req_proxy_reset",
        deliveryStatus: "failed",
        receiptStatus: "failed",
      }));
    } finally {
      process.off("uncaughtException", unhandled);
    }
  });
});
