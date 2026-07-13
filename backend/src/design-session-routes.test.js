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
      .post("/api/design/sessions/ensure")
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
});
