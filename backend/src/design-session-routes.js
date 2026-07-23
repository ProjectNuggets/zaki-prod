import express from "express";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { normalizeDesignProxyPath } from "./design-proxy-path.js";
import { isTerminalDesignSessionState } from "./design-session-store.js";

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export function buildDesignSessionRouter({
  enabled,
  sessionScope = "project",
  resolveUser,
  resolveBillingUserById,
  ensureSession,
  readSessionBinding,
  beginSessionDrain,
  updateSessionState,
  touchSessionActivity,
  runInTransaction,
  dbQuery,
  createSessionId,
  controller,
  getRequestId,
  authorizeProxy,
  settleProxy,
  issueWorkbenchAccess,
  revokeWorkbenchAccess,
  resolveProxyAccess,
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
  // ROUTE CLASS: USER. Authenticated end user acting on their own project; every binding is
  // scoped to resolveUser's zakiUser.id. A future MCP tool over this route inherits exactly
  // that posture — caller-authenticated, owner-scoped — and must never be exposed to an
  // operator/service credential that could ensure a session for another user's project.
  const ensureHandler = async (req, res) => {
    const projectId = validOpaqueId(req.body?.projectId) ? req.body.projectId : null;
    if (!projectId) return invalidRequest(res, getRequestId(req));
    const auth = await resolveUser(req, res);
    if (!auth?.zakiUser?.id) return;
    const requestId = getRequestId(req);
    let session = null;
    try {
      session = await ensureSession({
        runInTransaction,
        userId: auth.zakiUser.id,
        projectId,
        tenantId: "default",
        requestId,
        createSessionId,
        sessionScope,
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
      if (isTerminalDesignSessionState(result.session.state)) {
        appendWorkbenchRevocation(res, revokeWorkbenchAccess, session.sessionId);
      } else if (!recoveringStop && typeof issueWorkbenchAccess === "function") {
        res.append("set-cookie", issueWorkbenchAccess({
          userId: session.userId,
          sessionId: session.sessionId,
          projectId: session.projectId,
          generation: session.generation,
        }));
      }
      await updateSessionStateBestEffort(updateSessionState, dbQuery, session, result, requestId);
      return res
        .status(["READY", "ACTIVE"].includes(result.session.state) ? 200 : 202)
        .json(result);
    } catch (error) {
      await failUnstartedSessionBestEffort(updateSessionState, dbQuery, session, requestId);
      return sessionFailure(res, error, requestId);
    }
  };
  router.post("/", lifecycleJson, ensureHandler);
  router.post("/ensure", lifecycleJson, ensureHandler);

  router.all("/:sessionId/proxy/*", async (req, res) => {
    const sessionId = req.params.sessionId;
    const projectId = String(req.get("x-zaki-project-id") || "");
    const targetPath = proxyTargetPath(req, sessionId, req.method.toUpperCase());
    if (!validOpaqueId(sessionId) || !validOpaqueId(projectId) || !targetPath) {
      return invalidRequest(res, getRequestId(req));
    }
    const proxyAccess = req.get("authorization")
      ? null
      : await resolveProxyAccess?.(req, sessionId);
    // Per-user sessions serve every project the user owns, so the workbench cookie binds (user,
    // session) only — the request's projectId is a focus pointer, not part of the cookie identity.
    // Asserting cookie.pid === request project (the per-project posture) would reject every project
    // except the session's seed. matchesProxyRequest still enforces the session match in both modes.
    const projectScopedCookie = sessionScope !== "user";
    if (
      proxyAccess &&
      !matchesProxyRequest(proxyAccess, sessionId, projectId, { requireProject: projectScopedCookie })
    ) {
      return invalidWorkbenchAccess(res, getRequestId(req));
    }
    let auth = proxyAccess ? null : await resolveUser(req, res);
    const ownerUserId = proxyAccess?.userId || auth?.zakiUser?.id;
    if (!ownerUserId) return;
    const requestId = getRequestId(req);
    try {
      const session = await readSessionBinding({
        dbQuery,
        sessionId,
        projectId,
        userId: ownerUserId,
        tenantId: "default",
        sessionScope,
      });
      if (!session) return notFound(res, requestId);
      if (proxyAccess && proxyAccess.generation !== session.generation) {
        return invalidWorkbenchAccess(res, requestId);
      }
      if (proxyAccess) {
        const zakiUser = await resolveBillingUserById?.(session.userId);
        if (!zakiUser || String(zakiUser.id) !== session.userId) {
          return invalidWorkbenchAccess(res, requestId);
        }
        auth = { zakiUser };
      }
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
      // The request reached the worker, so this session is doing real design work right now.
      // Refresh its idle signal (updated_at) so the reaper's `updated_at < now - idleTtl`
      // predicate keeps counting it active — the status poll bumps updated_at, but the proxy
      // route did not, so a working session whose client stopped polling (closed/backgrounded/
      // throttled tab) could otherwise go stale and be descaled mid-work. Best effort and
      // un-awaited: never add latency to the proxy path.
      touchSessionActivityBestEffort(touchSessionActivity, dbQuery, session, requestId);
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

  const statusHandler = async (req, res, value) => {
    const input = parseBoundSessionRequest(req.params.sessionId, value);
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
        sessionScope,
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
      if (isTerminalDesignSessionState(result.session.state)) {
        appendWorkbenchRevocation(res, revokeWorkbenchAccess, session.sessionId);
      }
      return res.json(result);
    } catch (error) {
      return sessionFailure(res, error, requestId);
    }
  };
  router.get("/:sessionId", async (req, res) => statusHandler(req, res, req.query));
  router.post("/:sessionId/status", lifecycleJson, async (req, res) => statusHandler(req, res, req.body));

  // ROUTE CLASS: USER. Authenticated end user stopping their own session; the binding is
  // re-read under the caller's zakiUser.id before anything drains. A future MCP tool over
  // this route inherits that posture and must not accept an operator credential — stopping
  // another tenant's worker is not an operator convenience, it is data loss.
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
        sessionScope,
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
      // The store treats every terminal state as a no-op success for stop, so answer all of
      // them here. FAILED especially: that row never had a worker, and asking the controller
      // to stop one it never started turns the store's clean no-op into an error the user
      // sees. Terminality is the store's call, not a second list kept in step by hand.
      if (isTerminalDesignSessionState(drainingSession.state)) {
        appendWorkbenchRevocation(res, revokeWorkbenchAccess, drainingSession.sessionId);
        return res.json({
          session: {
            id: drainingSession.sessionId,
            projectId: drainingSession.projectId,
            state: drainingSession.state,
            generation: drainingSession.generation,
          },
        });
      }
      let result;
      try {
        result = await controller.stop({
          sessionId: drainingSession.sessionId,
          projectId: drainingSession.projectId,
          userId: drainingSession.userId,
          tenantId: drainingSession.tenantId,
          expectedGeneration: drainingSession.generation,
          ...(drainingSession.state === "CHECKPOINTING"
            ? { committedGeneration: drainingSession.generation }
            : {}),
          requestId,
        });
      } catch (error) {
        await revertSessionDrainBestEffort(
          updateSessionState, dbQuery, session, drainingSession, requestId
        );
        throw error;
      }
      await updateSessionStateBestEffort(updateSessionState, dbQuery, session, result, requestId);
      if (isTerminalDesignSessionState(result.session.state)) {
        appendWorkbenchRevocation(res, revokeWorkbenchAccess, drainingSession.sessionId);
      }
      return res.json(result);
    } catch (error) {
      return sessionFailure(res, error, requestId);
    }
  });

  return router;
}

function appendWorkbenchRevocation(res, revokeWorkbenchAccess, sessionId) {
  if (typeof revokeWorkbenchAccess !== "function") return;
  res.append("set-cookie", revokeWorkbenchAccess(sessionId));
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

// Fire-and-forget refresh of a session's idle signal after it did proxied work, so the reaper
// cannot descale a session that is actively working but whose client stopped polling. Un-awaited
// by design (no added proxy latency) and fully self-contained — a synchronous throw from
// validation or a rejected query is swallowed here, so it can never leak an unhandled rejection
// past the response. A no-op when no touch function is wired (keeps the dep optional).
function touchSessionActivityBestEffort(touchSessionActivity, dbQuery, session, requestId) {
  if (typeof touchSessionActivity !== "function") return;
  Promise.resolve()
    .then(() => touchSessionActivity({
      dbQuery,
      sessionId: session.sessionId,
      projectId: session.projectId,
      userId: session.userId,
      tenantId: session.tenantId,
    }))
    .catch((error) => {
      console.warn("[Design] Session activity touch could not be recorded:", {
        requestId,
        code: error?.code || "DESIGN_SESSION_ACTIVITY_TOUCH_FAILED",
      });
    });
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

// The hub writes DRAINING before it asks the controller to stop. If that write stands over a
// stop that never happened, the session is latched: a later ensure reads DRAINING, re-drives
// stop instead of start, and the session never comes back. So a throw from controller.stop
// puts the state back.
//
// What a throw does not establish is that the stop was refused. A timeout can land after the
// controller already deleted the worker, and this reverts on every throw — so the revert is a
// guess, and it is only safe because it is conditional. `expectedState` holds it to the state
// beginSessionDrain left behind, which means a concurrent request that carried the stop
// through to STOPPED wins and this write silently does nothing. The generation cannot draw
// that line by itself: a stop does not bump it, so a generation-only CAS cannot tell "nobody
// moved this row" from "somebody already finished the stop". Losing that distinction would
// republish a live state over a session whose worker is gone, and the proxy admits live
// states — it would forward to a dead pod until the next ensure healed it.
async function revertSessionDrainBestEffort(
  updateSessionState, dbQuery, session, drainingSession, requestId
) {
  if (session.state === drainingSession.state) return;
  try {
    await updateSessionState({
      dbQuery,
      sessionId: session.sessionId,
      projectId: session.projectId,
      userId: session.userId,
      tenantId: session.tenantId,
      state: session.state,
      generation: session.generation,
      requestId,
      expectedState: drainingSession.state,
    });
  } catch (error) {
    console.warn("[Design] Session drain could not be reverted:", {
      requestId,
      code: error?.code || "DESIGN_SESSION_DRAIN_REVERT_FAILED",
    });
  }
}

// A session still in REQUESTED has no worker behind it. If the controller could not start
// one, record FAILED so the row stops advertising a start that is never coming. A session
// that already reached a live state keeps it — a transient ensure failure is not evidence
// the worker died. Sweeping rows abandoned mid-flight is D4.1, not this fix.
async function failUnstartedSessionBestEffort(updateSessionState, dbQuery, session, requestId) {
  if (session?.state !== "REQUESTED") return;
  try {
    await updateSessionState({
      dbQuery,
      sessionId: session.sessionId,
      projectId: session.projectId,
      userId: session.userId,
      tenantId: session.tenantId,
      state: "FAILED",
      generation: session.generation,
      requestId,
    });
  } catch (error) {
    console.warn("[Design] Failed session state could not be recorded:", {
      requestId,
      code: error?.code || "DESIGN_SESSION_FAILURE_RECORD_FAILED",
    });
  }
}

function parseBoundSessionRequest(sessionId, value) {
  if (!validOpaqueId(sessionId) || !validOpaqueId(value?.projectId)) return null;
  return { sessionId, projectId: value.projectId };
}

function proxyTargetPath(req, sessionId, method) {
  const marker = `/api/design/sessions/${sessionId}/proxy`;
  if (!req.originalUrl.startsWith(marker)) return null;
  return normalizeDesignProxyPath(req.originalUrl.slice(marker.length), method);
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
    "accept-ranges", "cache-control", "content-disposition", "content-language",
    "content-range", "content-type", "etag", "last-modified",
  ]);
  for (const [name, value] of upstream.headers.entries()) {
    if (allowed.has(name.toLowerCase())) res.setHeader(name, value);
  }
}

// Internal controller-client codes are not a public contract. Map the ones this route
// promises callers; anything unmapped still forwards verbatim, as it did before.
const PUBLIC_FAILURE_CODES = {
  DESIGN_CONTROLLER_CAPACITY_EXHAUSTED: "design_capacity_exhausted",
  DESIGN_CONTROLLER_UNAVAILABLE: "design_session_unavailable",
};

function sessionFailure(res, error, requestId) {
  const status = Number(error?.status);
  const safeStatus = Number.isInteger(status) && status >= 400 && status <= 599 ? status : 503;
  const code = PUBLIC_FAILURE_CODES[error?.code] || error?.code || "design_session_unavailable";
  return res.status(safeStatus).json({
    code,
    message: sessionFailureMessage(code, safeStatus),
    retryable: safeStatus >= 500,
    requestId,
  });
}

// "Temporarily unavailable" invites a retry. Never say it about a full cluster: retrying
// cannot free a slot, so name the one action that can.
function sessionFailureMessage(code, safeStatus) {
  if (code === "design_capacity_exhausted") {
    return "Design has no free workspace slot right now. Stop another Design session, then try again.";
  }
  return safeStatus === 404 ? "Design session was not found." : "Design session is temporarily unavailable.";
}

function invalidRequest(res, requestId) {
  return res.status(400).json({ code: "invalid_design_session_request", message: "Invalid Design session request.", requestId });
}

function notFound(res, requestId) {
  return res.status(404).json({ code: "design_session_not_found", message: "Design session was not found.", requestId });
}

function invalidWorkbenchAccess(res, requestId) {
  return res.status(401).json({
    code: "design_workbench_auth_required",
    message: "Design workbench access is required.",
    requestId,
  });
}

function matchesProxyRequest(access, sessionId, projectId, { requireProject = true } = {}) {
  return Boolean(
    access &&
    validOpaqueId(access.userId) &&
    access.sessionId === sessionId &&
    // Per-user sessions (requireProject=false): the cookie binds (user, session); projectId is a
    // per-request focus pointer, so we validate its shape but not equality. Per-project
    // (requireProject=true): the cookie is bound to one project and must match exactly.
    validOpaqueId(access.projectId) &&
    (!requireProject || access.projectId === projectId) &&
    Number.isSafeInteger(access.generation) &&
    access.generation >= 0
  );
}

function validOpaqueId(value) {
  return typeof value === "string" && OPAQUE_ID.test(value);
}

function isProxyableSessionState(state) {
  return ["READY", "ACTIVE", "IDLE"].includes(state);
}
