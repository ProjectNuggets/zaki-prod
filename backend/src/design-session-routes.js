import express from "express";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export function buildDesignSessionRouter({
  enabled,
  resolveUser,
  ensureSession,
  readSessionBinding,
  beginSessionDrain,
  updateSessionState,
  runInTransaction,
  dbQuery,
  createSessionId,
  controller,
  getRequestId,
  authorizeProxy,
  settleProxy,
}) {
  const router = express.Router();
  const lifecycleJson = express.json({ limit: "32kb", strict: true });
  router.use((req, res, next) => {
    if (!enabled) {
      return res.status(404).json({
        code: "design_disabled",
        message: "Design is not enabled for this environment.",
        requestId: getRequestId(req),
      });
    }
    next();
  });
  router.post("/ensure", lifecycleJson, async (req, res) => {
    const projectId = validOpaqueId(req.body?.projectId) ? req.body.projectId : null;
    if (!projectId) return invalidRequest(res, getRequestId(req));
    const auth = await resolveUser(req, res);
    if (!auth?.zakiUser?.id) return;
    const requestId = getRequestId(req);
    try {
      const session = await ensureSession({
        runInTransaction,
        userId: auth.zakiUser.id,
        projectId,
        tenantId: "default",
        requestId,
        createSessionId,
      });
      const recoveringStop = ["DRAINING", "CHECKPOINTING"].includes(session.state);
      const finalizingCheckpoint = session.state === "CHECKPOINTING";
      const result = recoveringStop
        ? await controller.stop({
            sessionId: session.sessionId,
            projectId: session.projectId,
            userId: session.userId,
            tenantId: session.tenantId,
            expectedGeneration: session.generation,
            ...(finalizingCheckpoint ? { committedGeneration: session.generation } : {}),
            requestId,
          })
        : await controller.ensure({
            sessionId: session.sessionId,
            projectId: session.projectId,
            userId: session.userId,
            tenantId: session.tenantId,
            desiredGeneration: session.generation,
            requestId,
          });
      await updateSessionStateBestEffort(updateSessionState, dbQuery, session, result, requestId);
      return res
        .status(["READY", "ACTIVE"].includes(result.session.state) ? 200 : 202)
        .json(result);
    } catch (error) {
      return sessionFailure(res, error, requestId);
    }
  });

  router.all("/:sessionId/proxy/*", async (req, res) => {
    const sessionId = req.params.sessionId;
    const projectId = String(req.get("x-zaki-project-id") || "");
    const targetPath = proxyTargetPath(req, sessionId);
    if (!validOpaqueId(sessionId) || !validOpaqueId(projectId) || !targetPath) {
      return invalidRequest(res, getRequestId(req));
    }
    const auth = await resolveUser(req, res);
    if (!auth?.zakiUser?.id) return;
    const requestId = getRequestId(req);
    try {
      const session = await readSessionBinding({
        dbQuery,
        sessionId,
        projectId,
        userId: auth.zakiUser.id,
        tenantId: "default",
      });
      if (!session) return notFound(res, requestId);
      if (!isProxyableSessionState(session.state)) {
        return res.status(409).json({
          code: "design_session_not_writable",
          message: "Design session is not accepting requests.",
          state: session.state,
          retryable: ["REQUESTED", "STARTING", "RESTORING", "DRAINING", "CHECKPOINTING"].includes(session.state),
          requestId,
        });
      }
      const method = req.method.toUpperCase();
      const body = proxyBody(req, method);
      const authorization = await authorizeSessionProxy({
        authorizeProxy,
        req,
        res,
        auth,
        session,
        targetPath,
        method,
        body,
        requestId,
      });
      if (!authorization.allowed) {
        return res.status(authorization.status).json(authorization.body);
      }
      const startedAt = Date.now();
      const upstream = await controller.proxy({
        sessionId: session.sessionId,
        projectId: session.projectId,
        userId: session.userId,
        tenantId: session.tenantId,
        expectedGeneration: session.generation,
        targetPath,
        method,
        headers: proxyHeaders(req),
        ...(body === undefined ? {} : { body }),
        requestId,
      });
      const settleDelivery = (deliveryStatus) => settleSessionProxyBestEffort(settleProxy, {
        req,
        auth,
        session,
        targetPath,
        method,
        requestId,
        authorization,
        upstreamStatus: upstream.status,
        deliveryStatus,
        receiptStatus: deliveryStatus === "success" && upstream.status >= 200 && upstream.status < 400
          ? "success"
          : "failed",
        durationMs: Date.now() - startedAt,
      });
      res.status(upstream.status);
      copyResponseHeaders(upstream, res);
      if (!upstream.body || method === "HEAD" || [204, 304].includes(upstream.status)) {
        res.end();
        await settleDelivery("success");
        return undefined;
      }
      try {
        await pipeline(Readable.fromWeb(upstream.body), res);
      } catch (error) {
        await settleDelivery("failed");
        throw error;
      }
      await settleDelivery("success");
      return undefined;
    } catch (error) {
      if (res.headersSent) {
        if (!res.destroyed) res.destroy();
        return undefined;
      }
      return sessionFailure(res, error, requestId);
    }
  });

  router.post("/:sessionId/status", lifecycleJson, async (req, res) => {
    const input = parseBoundSessionRequest(req.params.sessionId, req.body);
    if (!input) return invalidRequest(res, getRequestId(req));
    const auth = await resolveUser(req, res);
    if (!auth?.zakiUser?.id) return;
    const requestId = getRequestId(req);
    try {
      const session = await readSessionBinding({
        dbQuery,
        sessionId: input.sessionId,
        projectId: input.projectId,
        userId: auth.zakiUser.id,
        tenantId: "default",
      });
      if (!session) return notFound(res, requestId);
      const result = await controller.status({
        sessionId: session.sessionId,
        projectId: session.projectId,
        userId: session.userId,
        tenantId: session.tenantId,
        expectedGeneration: session.generation,
        requestId,
      });
      await updateSessionStateBestEffort(updateSessionState, dbQuery, session, result, requestId);
      return res.json(result);
    } catch (error) {
      return sessionFailure(res, error, requestId);
    }
  });

  router.post("/:sessionId/stop", lifecycleJson, async (req, res) => {
    const input = parseBoundSessionRequest(req.params.sessionId, req.body);
    if (!input) return invalidRequest(res, getRequestId(req));
    const auth = await resolveUser(req, res);
    if (!auth?.zakiUser?.id) return;
    const requestId = getRequestId(req);
    try {
      const session = await readSessionBinding({
        dbQuery,
        sessionId: input.sessionId,
        projectId: input.projectId,
        userId: auth.zakiUser.id,
        tenantId: "default",
      });
      if (!session) return notFound(res, requestId);
      const drainingSession = await beginSessionDrain({
        runInTransaction,
        sessionId: session.sessionId,
        projectId: session.projectId,
        userId: session.userId,
        tenantId: session.tenantId,
        expectedGeneration: session.generation,
        requestId,
      });
      if (drainingSession.state === "STOPPED") {
        return res.json({
          session: {
            id: drainingSession.sessionId,
            projectId: drainingSession.projectId,
            state: "STOPPED",
            generation: drainingSession.generation,
          },
        });
      }
      const result = await controller.stop({
        sessionId: drainingSession.sessionId,
        projectId: drainingSession.projectId,
        userId: drainingSession.userId,
        tenantId: drainingSession.tenantId,
        expectedGeneration: drainingSession.generation,
        requestId,
      });
      await updateSessionStateBestEffort(updateSessionState, dbQuery, session, result, requestId);
      return res.json(result);
    } catch (error) {
      return sessionFailure(res, error, requestId);
    }
  });

  return router;
}

async function authorizeSessionProxy(input) {
  if (typeof input.authorizeProxy === "function") {
    const result = await input.authorizeProxy(input);
    if (result?.allowed) return result;
    return {
      allowed: false,
      status: Number.isInteger(result?.status) ? result.status : 403,
      body: result?.body || {
        code: "design_proxy_authorization_denied",
        message: "Design proxy authorization was denied.",
        requestId: input.requestId,
      },
    };
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(input.method)) {
    return {
      allowed: false,
      status: 503,
      body: {
        code: "design_meter_unavailable",
        message: "Design mutation metering is unavailable.",
        retryable: true,
        requestId: input.requestId,
      },
    };
  }
  return { allowed: true, action: null, grant: null };
}

async function settleSessionProxyBestEffort(settleProxy, input) {
  if (typeof settleProxy !== "function" || !input.authorization?.grant) return;
  try {
    await settleProxy(input);
  } catch (error) {
    console.warn("[Design] Session proxy meter receipt failed:", {
      requestId: input.requestId,
      code: error?.code || "DESIGN_PROXY_METER_RECEIPT_FAILED",
    });
  }
}

async function updateSessionStateBestEffort(updateSessionState, dbQuery, session, result, requestId) {
  try {
    await updateSessionState({
      dbQuery,
      sessionId: session.sessionId,
      projectId: session.projectId,
      userId: session.userId,
      tenantId: session.tenantId,
      state: result.session.state,
      generation: result.session.generation,
      requestId,
    });
  } catch (error) {
    console.warn("[Design] Session observation could not be recorded:", {
      requestId,
      code: error?.code || "DESIGN_SESSION_OBSERVATION_FAILED",
    });
  }
}

function parseBoundSessionRequest(sessionId, value) {
  if (!validOpaqueId(sessionId) || !validOpaqueId(value?.projectId)) return null;
  return { sessionId, projectId: value.projectId };
}

function proxyTargetPath(req, sessionId) {
  const marker = `/api/design/sessions/${sessionId}/proxy`;
  if (!req.originalUrl.startsWith(marker)) return null;
  const raw = req.originalUrl.slice(marker.length);
  if (!raw.startsWith("/api/") && raw !== "/api") return null;
  try {
    const url = new URL(raw, "http://worker.invalid");
    const segments = url.pathname.split("/").map((segment) => decodeURIComponent(segment));
    if (segments.includes(".") || segments.includes("..")) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

function proxyHeaders(req) {
  const allowed = new Set([
    "accept", "accept-language", "content-type", "idempotency-key",
    "if-match", "if-none-match", "last-event-id", "range", "x-idempotency-key",
  ]);
  const result = {};
  for (const [name, value] of Object.entries(req.headers || {})) {
    const normalized = name.toLowerCase();
    if (!allowed.has(normalized) || value === undefined) continue;
    result[normalized] = Array.isArray(value) ? value.join(",") : String(value);
  }
  return result;
}

function proxyBody(req, method) {
  if (["GET", "HEAD"].includes(method)) return undefined;
  const contentType = String(req.get("content-type") || "").toLowerCase();
  if (contentType.includes("application/json")) {
    if (req.body !== undefined) return Buffer.from(JSON.stringify(req.body));
  }
  return req;
}

function copyResponseHeaders(upstream, res) {
  const allowed = new Set([
    "cache-control", "content-disposition", "content-language", "content-type",
    "etag", "last-modified",
  ]);
  for (const [name, value] of upstream.headers.entries()) {
    if (allowed.has(name.toLowerCase())) res.setHeader(name, value);
  }
}

function sessionFailure(res, error, requestId) {
  const status = Number(error?.status);
  const safeStatus = Number.isInteger(status) && status >= 400 && status <= 599 ? status : 503;
  return res.status(safeStatus).json({
    code: error?.code || "design_session_unavailable",
    message: safeStatus === 404 ? "Design session was not found." : "Design session is temporarily unavailable.",
    retryable: safeStatus >= 500,
    requestId,
  });
}

function invalidRequest(res, requestId) {
  return res.status(400).json({ code: "invalid_design_session_request", message: "Invalid Design session request.", requestId });
}

function notFound(res, requestId) {
  return res.status(404).json({ code: "design_session_not_found", message: "Design session was not found.", requestId });
}

function validOpaqueId(value) {
  return typeof value === "string" && OPAQUE_ID.test(value);
}

function isProxyableSessionState(state) {
  return ["READY", "ACTIVE", "IDLE"].includes(state);
}
