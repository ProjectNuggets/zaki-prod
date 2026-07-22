import express from "express";
import request from "supertest";
import { describe, expect, jest, test } from "@jest/globals";
import { buildDesignSessionRouter } from "./design-session-routes.js";
import { createDesignWorkbenchAccess } from "./design-workbench-access.js";
import { resolveDesignQuotaPolicy } from "./design-quota.js";
import { resolvePlatformWalletPlanForUser } from "./platform-entitlement-context.js";

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
    const issueWorkbenchAccess = jest.fn().mockReturnValue("zaki_design_workbench=scoped; HttpOnly");
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
      issueWorkbenchAccess,
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
    expect(issueWorkbenchAccess).toHaveBeenCalledWith({
      userId: "42",
      sessionId: "sess_01",
      projectId: "project_01",
      generation: 7,
    });
    expect(response.headers["set-cookie"]?.[0]).toContain("zaki_design_workbench=scoped");
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
    const issueWorkbenchAccess = jest.fn().mockReturnValue("design_workbench=token");
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
      issueWorkbenchAccess,
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
    expect(issueWorkbenchAccess).not.toHaveBeenCalled();
    expect(response.headers["set-cookie"]).toBeUndefined();
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

  test("does not issue workbench access when admission returns a terminal session", async () => {
    const issueWorkbenchAccess = jest.fn().mockReturnValue("unexpected=credential");
    const revokeWorkbenchAccess = jest.fn().mockReturnValue(
      "zaki_design_workbench_sess_failed=; Path=/api/design; HttpOnly; SameSite=Strict; Max-Age=0",
    );
    const app = express();
    app.use("/api/design/sessions", buildDesignSessionRouter({
      enabled: true,
      resolveUser: jest.fn().mockResolvedValue({ zakiUser: { id: 42 } }),
      ensureSession: jest.fn().mockResolvedValue({
        sessionId: "sess_failed", projectId: "project_01", userId: "42",
        tenantId: "default", state: "REQUESTED", generation: 7,
      }),
      readSessionBinding: jest.fn(), updateSessionState: jest.fn(), runInTransaction: jest.fn(),
      dbQuery: jest.fn(), createSessionId: jest.fn(),
      controller: {
        ensure: jest.fn().mockResolvedValue({
          session: { id: "sess_failed", projectId: "project_01", state: "FAILED", generation: 7 },
        }),
        status: jest.fn(), stop: jest.fn(),
      },
      getRequestId: () => "req_failed",
      issueWorkbenchAccess,
      revokeWorkbenchAccess,
    }));

    const response = await request(app).post("/api/design/sessions").send({ projectId: "project_01" });

    expect(response.status).toBe(202);
    expect(issueWorkbenchAccess).not.toHaveBeenCalled();
    expect(revokeWorkbenchAccess).toHaveBeenCalledWith("sess_failed");
    expect(response.headers["set-cookie"]?.[0]).toContain("Max-Age=0");
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

  test("hydrates canonical billing identity for a session-bound workbench credential", async () => {
    let receivedBody = "";
    const controllerProxy = jest.fn().mockImplementation(async (input) => {
      for await (const chunk of input.body) receivedBody += chunk.toString();
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const resolveUser = jest.fn(async (_req, res) => {
      res.status(401).json({ error: "auth_required" });
      return null;
    });
    const billingUser = {
      id: 42,
      verified: true,
      plan_tier: "personal",
      plan_status: "active",
      current_period_end: "2099-01-01T00:00:00.000Z",
    };
    const resolveBillingUserById = jest.fn().mockResolvedValue(billingUser);
    const authorizeProxy = jest.fn(async ({ auth }) => {
      const nowDate = new Date("2026-07-17T00:00:00.000Z");
      const walletPlan = resolvePlatformWalletPlanForUser(auth.zakiUser, { env: {}, nowDate });
      const quotaTier = resolveDesignQuotaPolicy(auth.zakiUser, { env: {}, nowDate }).tier;
      return walletPlan === "personal" && quotaTier === "personal"
        ? { allowed: true, action: "design_file_write", grant: null }
        : {
            allowed: false,
            status: 503,
            body: { code: "design_billing_identity_unavailable" },
          };
    });
    const workbenchAccess = createDesignWorkbenchAccess({
      secret: "controller-secret-at-least-16",
      secure: false,
    });
    const cookie = workbenchAccess.issue({
      userId: "42",
      sessionId: "sess_01",
      projectId: "project_01",
      generation: 7,
    }).split(";")[0];
    const app = express();
    app.use("/api/design/sessions", buildDesignSessionRouter({
      enabled: true,
      resolveUser,
      resolveBillingUserById,
      resolveProxyAccess: (req) => workbenchAccess.resolve(req),
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
      getRequestId: () => "req_proxy_cookie",
      authorizeProxy,
    }));

    const response = await request(app)
      .post("/api/design/sessions/sess_01/proxy/api/projects/project_01/files")
      .set("x-zaki-project-id", "project_01")
      .set("cookie", cookie)
      .send({ name: "concept.html" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(resolveUser).not.toHaveBeenCalled();
    expect(resolveBillingUserById).toHaveBeenCalledWith("42");
    expect(authorizeProxy).toHaveBeenCalledWith(expect.objectContaining({
      auth: { zakiUser: billingUser },
    }));
    expect(controllerProxy).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      expectedGeneration: 7,
      method: "POST",
    }));
    expect(receivedBody).toBe(JSON.stringify({ name: "concept.html" }));
  });

  test.each([
    ["missing", null],
    ["mismatched", { id: 99, verified: true, plan_tier: "personal", plan_status: "active" }],
  ])("rejects a %s canonical billing row before metering or proxy delivery", async (_case, billingUser) => {
    const authorizeProxy = jest.fn();
    const controllerProxy = jest.fn();
    const workbenchAccess = createDesignWorkbenchAccess({
      secret: "controller-secret-at-least-16",
      secure: false,
    });
    const cookie = workbenchAccess.issue({
      userId: "42",
      sessionId: "sess_01",
      projectId: "project_01",
      generation: 7,
    }).split(";")[0];
    const app = express();
    app.use("/api/design/sessions", buildDesignSessionRouter({
      enabled: true,
      resolveUser: jest.fn(),
      resolveBillingUserById: jest.fn().mockResolvedValue(billingUser),
      resolveProxyAccess: (req, sessionId) => workbenchAccess.resolve(req, sessionId),
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
      getRequestId: () => "req_proxy_invalid_billing",
      authorizeProxy,
    }));

    const response = await request(app)
      .post("/api/design/sessions/sess_01/proxy/api/projects/project_01/files")
      .set("x-zaki-project-id", "project_01")
      .set("cookie", cookie)
      .send({ name: "concept.html" });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: "design_workbench_auth_required",
      requestId: "req_proxy_invalid_billing",
    });
    expect(authorizeProxy).not.toHaveBeenCalled();
    expect(controllerProxy).not.toHaveBeenCalled();
  });

  test("allows read-only artifact delivery and rejects artifact mutations", async () => {
    const controllerProxy = jest.fn().mockResolvedValue(new Response("asset", {
      status: 206,
      headers: {
        "accept-ranges": "bytes",
        "content-range": "bytes 0-4/10",
        "content-type": "application/octet-stream",
      },
    }));
    const app = express();
    app.use("/api/design/sessions", buildDesignSessionRouter({
      enabled: true,
      resolveUser: jest.fn().mockResolvedValue({ zakiUser: { id: 42 } }),
      ensureSession: jest.fn(),
      readSessionBinding: jest.fn().mockResolvedValue({
        sessionId: "sess_01", projectId: "project_01", userId: "42", tenantId: "default",
        state: "READY", generation: 7,
      }),
      updateSessionState: jest.fn(), runInTransaction: jest.fn(), dbQuery: jest.fn(), createSessionId: jest.fn(),
      controller: { ensure: jest.fn(), status: jest.fn(), stop: jest.fn(), proxy: controllerProxy },
      getRequestId: () => "req_asset",
    }));

    const asset = await request(app).get("/api/design/sessions/sess_01/proxy/artifacts/site/index.html")
      .set("x-zaki-project-id", "project_01")
      .set("range", "bytes=0-4");
    expect(asset.status).toBe(206);
    expect(asset.headers["accept-ranges"]).toBe("bytes");
    expect(asset.headers["content-range"]).toBe("bytes 0-4/10");
    expect((await request(app).post("/api/design/sessions/sess_01/proxy/frames/preview.png")
      .set("x-zaki-project-id", "project_01")).status).toBe(400);
    expect(controllerProxy).toHaveBeenCalledTimes(1);
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
    const revokeWorkbenchAccess = jest.fn().mockReturnValue(
      "zaki_design_workbench_sess_01=; Path=/api/design; HttpOnly; SameSite=Strict; Max-Age=0",
    );
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
      revokeWorkbenchAccess,
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
    expect(revokeWorkbenchAccess).toHaveBeenCalledWith("sess_01");
    expect(response.headers["set-cookie"]?.[0]).toContain("zaki_design_workbench_sess_01=");
    expect(response.headers["set-cookie"]?.[0]).toContain("Max-Age=0");
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

  test("reverts the drain when the controller refuses to stop, so a later ensure is not latched", async () => {
    const session = {
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      state: "READY",
      generation: 7,
    };
    const controllerStop = jest.fn().mockRejectedValue(
      Object.assign(new Error("controller is down"), {
        code: "DESIGN_CONTROLLER_UNAVAILABLE",
        status: 503,
      }),
    );
    const updateSessionState = jest.fn().mockResolvedValue(true);
    const app = express();
    app.use("/api/design/sessions", buildDesignSessionRouter({
      enabled: true,
      resolveUser: jest.fn().mockResolvedValue({ zakiUser: { id: 42 } }),
      ensureSession: jest.fn(),
      readSessionBinding: jest.fn().mockResolvedValue(session),
      beginSessionDrain: jest.fn().mockResolvedValue({ ...session, state: "DRAINING" }),
      updateSessionState,
      runInTransaction: jest.fn(),
      dbQuery: jest.fn(),
      createSessionId: jest.fn(),
      controller: { ensure: jest.fn(), status: jest.fn(), stop: controllerStop },
      getRequestId: () => "req_stop_fail",
    }));

    const response = await request(app)
      .post("/api/design/sessions/sess_01/stop")
      .send({ projectId: "project_01" });

    expect(response.status).toBe(503);
    expect(updateSessionState).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: "sess_01",
      projectId: "project_01",
      state: "READY",
      generation: 7,
      requestId: "req_stop_fail",
    }));
  });

  test("leaves an already terminal stop alone when the controller refuses", async () => {
    const session = {
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      state: "DRAINING",
      generation: 7,
    };
    const updateSessionState = jest.fn().mockResolvedValue(true);
    const app = express();
    app.use("/api/design/sessions", buildDesignSessionRouter({
      enabled: true,
      resolveUser: jest.fn().mockResolvedValue({ zakiUser: { id: 42 } }),
      ensureSession: jest.fn(),
      readSessionBinding: jest.fn().mockResolvedValue(session),
      beginSessionDrain: jest.fn().mockResolvedValue(session),
      updateSessionState,
      runInTransaction: jest.fn(),
      dbQuery: jest.fn(),
      createSessionId: jest.fn(),
      controller: {
        ensure: jest.fn(),
        status: jest.fn(),
        stop: jest.fn().mockRejectedValue(
          Object.assign(new Error("controller is down"), {
            code: "DESIGN_CONTROLLER_UNAVAILABLE",
            status: 503,
          }),
        ),
      },
      getRequestId: () => "req_stop_draining",
    }));

    const response = await request(app)
      .post("/api/design/sessions/sess_01/stop")
      .send({ projectId: "project_01" });

    expect(response.status).toBe(503);
    expect(updateSessionState).not.toHaveBeenCalled();
  });

  test("marks a never-started session FAILED when the controller cannot ensure it", async () => {
    const updateSessionState = jest.fn().mockResolvedValue(true);
    const app = express();
    app.use("/api/design/sessions", buildDesignSessionRouter({
      enabled: true,
      resolveUser: jest.fn().mockResolvedValue({ zakiUser: { id: 42 } }),
      ensureSession: jest.fn().mockResolvedValue({
        sessionId: "sess_01",
        projectId: "project_01",
        userId: "42",
        tenantId: "default",
        state: "REQUESTED",
        generation: 0,
      }),
      readSessionBinding: jest.fn(),
      beginSessionDrain: jest.fn(),
      updateSessionState,
      runInTransaction: jest.fn(),
      dbQuery: jest.fn(),
      createSessionId: () => "sess_01",
      controller: {
        ensure: jest.fn().mockRejectedValue(
          Object.assign(new Error("controller is down"), {
            code: "DESIGN_CONTROLLER_UNAVAILABLE",
            status: 503,
          }),
        ),
        status: jest.fn(),
        stop: jest.fn(),
      },
      getRequestId: () => "req_ensure_fail",
    }));

    const response = await request(app)
      .post("/api/design/sessions")
      .send({ projectId: "project_01" });

    expect(response.status).toBe(503);
    expect(updateSessionState).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: "sess_01",
      projectId: "project_01",
      state: "FAILED",
      generation: 0,
      requestId: "req_ensure_fail",
    }));
  });

  test("does not mark a live session FAILED when a transient ensure fails", async () => {
    const updateSessionState = jest.fn().mockResolvedValue(true);
    const app = express();
    app.use("/api/design/sessions", buildDesignSessionRouter({
      enabled: true,
      resolveUser: jest.fn().mockResolvedValue({ zakiUser: { id: 42 } }),
      ensureSession: jest.fn().mockResolvedValue({
        sessionId: "sess_01",
        projectId: "project_01",
        userId: "42",
        tenantId: "default",
        state: "READY",
        generation: 3,
      }),
      readSessionBinding: jest.fn(),
      beginSessionDrain: jest.fn(),
      updateSessionState,
      runInTransaction: jest.fn(),
      dbQuery: jest.fn(),
      createSessionId: () => "sess_01",
      controller: {
        ensure: jest.fn().mockRejectedValue(
          Object.assign(new Error("controller is down"), {
            code: "DESIGN_CONTROLLER_UNAVAILABLE",
            status: 503,
          }),
        ),
        status: jest.fn(),
        stop: jest.fn(),
      },
      getRequestId: () => "req_ensure_transient",
    }));

    const response = await request(app)
      .post("/api/design/sessions")
      .send({ projectId: "project_01" });

    expect(response.status).toBe(503);
    expect(updateSessionState).not.toHaveBeenCalled();
  });

  test("admits a capacity rejection as a non-retryable capacity failure, not an outage", async () => {
    const app = express();
    app.use("/api/design/sessions", buildDesignSessionRouter({
      enabled: true,
      resolveUser: jest.fn().mockResolvedValue({ zakiUser: { id: 42 } }),
      ensureSession: jest.fn().mockResolvedValue({
        sessionId: "sess_01",
        projectId: "project_01",
        userId: "42",
        tenantId: "default",
        state: "REQUESTED",
        generation: 0,
      }),
      readSessionBinding: jest.fn(),
      beginSessionDrain: jest.fn(),
      updateSessionState: jest.fn().mockResolvedValue(true),
      runInTransaction: jest.fn(),
      dbQuery: jest.fn(),
      createSessionId: () => "sess_01",
      controller: {
        ensure: jest.fn().mockRejectedValue(
          Object.assign(new Error("Design controller returned status 429."), {
            code: "DESIGN_CONTROLLER_CAPACITY_EXHAUSTED",
            status: 429,
          }),
        ),
        status: jest.fn(),
        stop: jest.fn(),
      },
      getRequestId: () => "req_capacity",
    }));

    const response = await request(app)
      .post("/api/design/sessions")
      .send({ projectId: "project_01" });

    expect(response.status).toBe(429);
    expect(response.body).toEqual({
      code: "design_capacity_exhausted",
      message: "Design has no free workspace slot right now. Stop another Design session, then try again.",
      retryable: false,
      requestId: "req_capacity",
    });
  });

  test("still reports a controller outage as a retryable temporary failure", async () => {
    const app = express();
    app.use("/api/design/sessions", buildDesignSessionRouter({
      enabled: true,
      resolveUser: jest.fn().mockResolvedValue({ zakiUser: { id: 42 } }),
      ensureSession: jest.fn().mockResolvedValue({
        sessionId: "sess_01",
        projectId: "project_01",
        userId: "42",
        tenantId: "default",
        state: "REQUESTED",
        generation: 0,
      }),
      readSessionBinding: jest.fn(),
      beginSessionDrain: jest.fn(),
      updateSessionState: jest.fn().mockResolvedValue(true),
      runInTransaction: jest.fn(),
      dbQuery: jest.fn(),
      createSessionId: () => "sess_01",
      controller: {
        ensure: jest.fn().mockRejectedValue(
          Object.assign(new Error("Design controller returned status 503."), {
            code: "DESIGN_CONTROLLER_UNAVAILABLE",
            status: 503,
          }),
        ),
        status: jest.fn(),
        stop: jest.fn(),
      },
      getRequestId: () => "req_outage",
    }));

    const response = await request(app)
      .post("/api/design/sessions")
      .send({ projectId: "project_01" });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      code: "design_session_unavailable",
      message: "Design session is temporarily unavailable.",
      retryable: true,
      requestId: "req_outage",
    });
  });
});
