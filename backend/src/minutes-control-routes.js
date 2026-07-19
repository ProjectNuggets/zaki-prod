import { createHash } from "node:crypto";
import express from "express";
import {
  MINUTES_CONTROL_API_VERSION,
  MinutesControlContractError,
  assertMinutesControlResponseBinding,
  parseMinutesBrowserCapture,
  parseMinutesBrowserConsent,
  parseMinutesBrowserIdempotency,
  parseMinutesCallbackEnvelope,
  parseMinutesCaptureResponse,
  parseMinutesEnsureResponse,
  parseMinutesErasureResponse,
  parseMinutesStatusResponse,
  readMinutesControlResponseJson,
  verifyMinutesCallbackSignature,
} from "./minutes-control-contract.js";
import {
  createMinutesCapture,
  ensureMinutesControl,
  eraseMinutesAccount,
  eraseMinutesMeeting,
  getMinutesCapture,
  stopMinutesCapture,
} from "./minutes-control-client.js";
import {
  releaseMinutesCapture as defaultReleaseMinutesCapture,
  reserveMinutesCapture as defaultReserveMinutesCapture,
} from "./minutes-control-metering.js";
import {
  MinutesControlStateError,
  applyMinutesControlCallback as defaultApplyMinutesControlCallback,
  forgetMinutesControlMeeting as defaultForgetMinutesControlMeeting,
  recordMinutesControlCapture as defaultRecordMinutesControlCapture,
} from "./minutes-control-state.js";

const DEFAULT_CLIENT = Object.freeze({
  ensure: ensureMinutesControl,
  createCapture: createMinutesCapture,
  getCapture: getMinutesCapture,
  stopCapture: stopMinutesCapture,
  eraseMeeting: eraseMinutesMeeting,
  eraseAccount: eraseMinutesAccount,
});

const CONFIG_ERRORS = new Set([
  "MINUTES_ENGINE_BASE_URL is not configured.",
  "MINUTES_ENGINE_CONTROL_TOKEN is invalid.",
  "invalid_minutes_control_base_url",
  "invalid_minutes_control_user_id",
  "invalid_minutes_control_tenant_id",
  "invalid_minutes_control_request_id",
  "invalid_minutes_control_auth_header",
  "invalid_minutes_control_transport",
  "invalid_minutes_control_timeout",
]);

function browserErrorPayload(code, message, requestId, retryable = false) {
  return { code, message, requestId, retryable };
}

function sendBrowserError(res, status, code, message, requestId, retryable = false) {
  return res.status(status).json(browserErrorPayload(code, message, requestId, retryable));
}

function sendCallbackError(res, status, code, retryable, eventId) {
  const body = { api_version: MINUTES_CONTROL_API_VERSION, code, retryable };
  if (eventId) body.event_id = eventId;
  return res.status(status).json(body);
}

function discardBody(response) {
  try {
    const pending = response?.body?.cancel?.();
    pending?.catch?.(() => {});
  } catch {
    // Upstream failure is authoritative. Never inspect an error body.
  }
}

function emitFailure(dependencies, event) {
  try {
    const pending = dependencies.recordFailure?.(event);
    pending?.catch?.(() => {});
  } catch {
    // Telemetry cannot alter the user-visible safe response.
  }
}

function normalizeUserId(value) {
  const userId = String(value || "");
  return /^[1-9][0-9]{0,18}$/.test(userId) ? userId : null;
}

function isConfiguredError(error) {
  return CONFIG_ERRORS.has(String(error?.message || ""));
}

function isControlInputError(error) {
  return error instanceof MinutesControlContractError && error.code === "minutes_control_invalid_request";
}

function browserControlPolicy(dependencies) {
  const policy = dependencies.policy || {};
  return {
    capture_notice_policy_version: String(policy.capture_notice_policy_version || "minutes-capture-consent-v1"),
    retention: {
      audio_days: Number(policy.retention?.audio_days ?? 0),
      transcript_days: Number(policy.retention?.transcript_days ?? 30),
      summary_days: Number(policy.retention?.summary_days ?? 30),
    },
  };
}

async function authenticate(req, res, next, dependencies) {
  const requestId = dependencies.getRequestId(req);
  res.set("Cache-Control", "no-store");
  res.set("X-Request-Id", requestId);
  const authResult = await dependencies.resolveUser(req, res);
  if (!authResult) return;
  const userId = normalizeUserId(authResult.zakiUser?.id);
  if (!userId) {
    sendBrowserError(res, 403, "minutes_control_identity_invalid", "Minutes controls could not be authorized.", requestId);
    return;
  }
  req.minutesControlContext = {
    userId,
    tenantId: "default",
    requestId,
    zakiUser: authResult.zakiUser,
  };
  next();
}

function clientOptions(dependencies, context) {
  return {
    baseUrl: dependencies.baseUrl,
    controlSigningKey: dependencies.controlSigningKey,
    authHeaderName: dependencies.authHeaderName,
    userId: context.userId,
    tenantId: context.tenantId,
    requestId: context.requestId,
    fetchWithTimeout: dependencies.fetchWithTimeout,
    timeoutMs: dependencies.timeoutMs,
    tokenTtlSeconds: dependencies.tokenTtlSeconds,
    nowMs: dependencies.now().getTime(),
  };
}

function mapUpstreamFailure(res, response, requestId) {
  discardBody(response);
  switch (response?.status) {
    case 400:
      return sendBrowserError(res, 400, "minutes_control_invalid_request", "The Minutes control request is invalid.", requestId);
    case 404:
      return sendBrowserError(res, 404, "minutes_control_not_found", "This Minutes resource is not available.", requestId);
    case 409:
      return sendBrowserError(res, 409, "minutes_control_conflict", "This Minutes request conflicts with its current state.", requestId);
    case 429:
      return sendBrowserError(res, 429, "minutes_control_quota_exhausted", "Minutes capture quota is exhausted.", requestId);
    case 401:
    case 403:
    case 500:
    case 502:
    case 503:
    case 504:
      return sendBrowserError(res, 503, "minutes_control_unavailable", "Minutes controls are temporarily unavailable.", requestId, true);
    default:
      return sendBrowserError(res, 502, "minutes_control_invalid_response", "Minutes controls returned an invalid response.", requestId, true);
  }
}

async function parseUpstreamSuccess(upstream, parseResponse, context, expected = {}) {
  const payload = await readMinutesControlResponseJson(upstream);
  const parsed = parseResponse(payload);
  return assertMinutesControlResponseBinding(parsed, {
    subject: { tenant_id: context.tenantId, user_id: context.userId },
    requestId: context.requestId,
    ...expected,
  });
}

function controlUnavailable(res, dependencies, req) {
  const requestId = dependencies.getRequestId(req);
  res.set("Cache-Control", "no-store");
  res.set("X-Request-Id", requestId);
  return sendBrowserError(res, 404, "minutes_control_disabled", "Minutes controls are not available.", requestId);
}

function safeReceipt(receipt) {
  return {
    receiptId: receipt.receipt.receipt_id,
    erasedAt: receipt.receipt.erased_at,
    counts: {
      meetingRows: receipt.receipt.counts.meeting_rows,
      transcriptRows: receipt.receipt.counts.transcript_rows,
      summaryRows: receipt.receipt.counts.summary_rows,
      recordingObjects: receipt.receipt.counts.recording_objects,
    },
  };
}

export function isMinutesControlEnabled(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

export function buildMinutesControlRouter({
  enabled,
  baseUrl,
  controlSigningKey,
  callbackHmacKey,
  authHeaderName,
  timeoutMs,
  tokenTtlSeconds,
  policy,
  captureReserveUnits,
  captureHoldTtlMs,
  resolveUser,
  getRequestId,
  fetchWithTimeout,
  resolvePlan,
  reserveCapture = defaultReserveMinutesCapture,
  releaseCapture = defaultReleaseMinutesCapture,
  recordCapture = defaultRecordMinutesControlCapture,
  forgetMeeting = defaultForgetMinutesControlMeeting,
  applyCallback = defaultApplyMinutesControlCallback,
  recordFailure,
  client = DEFAULT_CLIENT,
  now = () => new Date(),
} = {}) {
  if (typeof resolveUser !== "function") throw new Error("Minutes control auth resolver is required.");
  if (typeof getRequestId !== "function") throw new Error("Minutes control request-id resolver is required.");
  const dependencies = {
    enabled: Boolean(enabled), baseUrl, controlSigningKey, callbackHmacKey, authHeaderName, timeoutMs, tokenTtlSeconds, policy,
    captureReserveUnits, captureHoldTtlMs, resolveUser, getRequestId, fetchWithTimeout, resolvePlan,
    reserveCapture, releaseCapture, recordCapture, forgetMeeting, applyCallback, recordFailure, client, now,
  };
  const router = express.Router();
  const browserJson = express.json({ limit: "16kb", strict: true });
  const requireMinutesUser = (req, res, next) => authenticate(req, res, next, dependencies);
  // This router shares the `/api/minutes` mount with the pre-existing read
  // plane. Gate only the explicit control routes: a default-false control
  // plane must never shadow `/index`, `/items`, or `/search` downstream.
  const requireControlEnabled = (req, res, next) => {
    if (!dependencies.enabled) {
      controlUnavailable(res, dependencies, req);
      return;
    }
    next();
  };

  router.post(
    "/callback/v1",
    (req, res, next) => {
      res.set("Cache-Control", "no-store");
      if (!dependencies.enabled) {
        sendCallbackError(res, 503, "upstream_unavailable", true);
        return;
      }
      // A missing server-side verifier is an operator/configuration outage, not
      // an authentication failure attributable to the engine. Preserve a
      // retryable response so the callback is not discarded permanently.
      if (!dependencies.callbackHmacKey) {
        sendCallbackError(res, 503, "upstream_unavailable", true);
        return;
      }
      next();
    },
    express.raw({ type: () => true, limit: `${Math.max(1, Math.floor(Number(65_536)))}b` }),
    async (req, res) => {
      const verification = verifyMinutesCallbackSignature({
        rawBody: req.body,
        contentType: req.get("content-type"),
        timestamp: req.get("x-webhook-timestamp"),
        signature: req.get("x-webhook-signature"),
        secret: dependencies.callbackHmacKey,
        nowMs: dependencies.now().getTime(),
      });
      if (!verification.ok) {
        const status = verification.reason === "auth_failed" ? 401 : 400;
        sendCallbackError(res, status, verification.reason, false);
        return;
      }
      let envelope;
      try {
        envelope = parseMinutesCallbackEnvelope(JSON.parse(req.body.toString("utf8")));
      } catch (error) {
        emitFailure(dependencies, { operation: "callback", failure: "invalid_request" });
        sendCallbackError(res, 400, "invalid_request", false);
        return;
      }
      try {
        const result = await dependencies.applyCallback({ envelope });
        res.status(200).json({
          api_version: MINUTES_CONTROL_API_VERSION,
          event_id: envelope.event_id,
          status: result?.status === "duplicate" ? "duplicate" : "accepted",
        });
      } catch (error) {
        const known = error instanceof MinutesControlStateError;
        const code = known && ["invalid_request", "invalid_state", "upstream_unavailable"].includes(error.code)
          ? error.code
          : "internal_error";
        const status = known && Number.isInteger(error.status) ? error.status : 500;
        const retryable = known ? Boolean(error.retryable) : true;
        emitFailure(dependencies, { operation: "callback", failure: code, eventId: envelope.event_id });
        sendCallbackError(res, status, code, retryable, envelope.event_id);
      }
    }
  );

  router.get("/control", requireControlEnabled, requireMinutesUser, (req, res) => {
    const policyView = browserControlPolicy(dependencies);
    res.status(200).json({
      available: true,
      policy: policyView,
    });
  });

  router.post("/control/consent", requireControlEnabled, requireMinutesUser, browserJson, async (req, res) => {
    const context = req.minutesControlContext;
    if (!context) return;
    try {
      const input = parseMinutesBrowserConsent(req.body);
      const configured = browserControlPolicy(dependencies);
      const upstream = await dependencies.client.ensure({
        ...clientOptions(dependencies, context),
        idempotencyKey: input.idempotency_key,
        policy: {
          capture_enabled: input.capture_enabled,
          agent_read_enabled: input.agent_read_enabled,
          capture_notice_policy_version: configured.capture_notice_policy_version,
          retention: input.retention,
        },
      });
      if (!upstream?.ok) {
        mapUpstreamFailure(res, upstream, context.requestId);
        return;
      }
      const response = await parseUpstreamSuccess(upstream, parseMinutesEnsureResponse, context);
      res.status(200).json({ state: response.state, policyVersion: response.policy_version });
    } catch (error) {
      if (isControlInputError(error)) {
        sendBrowserError(res, 400, "minutes_control_invalid_request", "The Minutes control request is invalid.", context.requestId);
        return;
      }
      const unavailable = isConfiguredError(error) || error instanceof MinutesControlContractError;
      emitFailure(dependencies, { requestId: context.requestId, operation: "ensure", failure: unavailable ? error.code || "unavailable" : "unavailable" });
      sendBrowserError(res, unavailable ? 503 : 503, "minutes_control_unavailable", "Minutes controls are temporarily unavailable.", context.requestId, true);
    }
  });

  router.post("/captures", requireControlEnabled, requireMinutesUser, browserJson, async (req, res) => {
    const context = req.minutesControlContext;
    if (!context) return;
    let reservation;
    let input;
    try {
      input = parseMinutesBrowserCapture(req.body);
      reservation = await dependencies.reserveCapture({
        zakiUser: context.zakiUser,
        tenantId: context.tenantId,
        idempotencyKey: input.idempotency_key,
        reservedUnits: dependencies.captureReserveUnits,
        holdTtlMs: dependencies.captureHoldTtlMs,
        resolvePlan: dependencies.resolvePlan,
      });
      const policyView = browserControlPolicy(dependencies);
      const upstream = await dependencies.client.createCapture({
        ...clientOptions(dependencies, context),
        idempotencyKey: input.idempotency_key,
        platform: input.platform,
        meetingUrl: input.meeting_url,
        captureAttestation: {
          bot_visible: true,
          bot_display_name: input.bot_display_name,
          policy_version: policyView.capture_notice_policy_version,
          attested_at: dependencies.now().toISOString(),
          attested_by_user_id: context.userId,
        },
        metering: {
          reservation_id: String(reservation.hold.id),
          unit: "bot_minute",
          reserved_units: dependencies.captureReserveUnits,
        },
      });
      if (!upstream?.ok) {
        if ([400, 409, 422].includes(Number(upstream?.status))) {
          await dependencies.releaseCapture({ holdId: reservation.hold.id, idempotencyKey: input.idempotency_key });
        }
        mapUpstreamFailure(res, upstream, context.requestId);
        return;
      }
      const response = await parseUpstreamSuccess(upstream, parseMinutesCaptureResponse, context);
      if (String(response.metering.reservation_id) !== String(reservation.hold.id)) {
        throw new MinutesControlContractError("Minutes upstream changed the capture reservation.", "minutes_control_upstream_binding_mismatch");
      }
      await dependencies.recordCapture({
        response,
        userId: context.userId,
        tenantId: context.tenantId,
        reservationId: reservation.hold.id,
      });
      res.status(202).json({
        captureId: response.capture_id,
        meetingId: response.meeting_id,
        state: response.state,
      });
    } catch (error) {
      if (error?.code === "quota_exhausted") {
        sendBrowserError(res, 429, "minutes_control_quota_exhausted", "Minutes capture quota is exhausted.", context.requestId);
        return;
      }
      if (error?.code === "idempotency_conflict") {
        sendBrowserError(res, 409, "minutes_control_conflict", "This Minutes request conflicts with its current state.", context.requestId);
        return;
      }
      if (isControlInputError(error)) {
        sendBrowserError(res, 400, "minutes_control_invalid_request", "The Minutes control request is invalid.", context.requestId);
        return;
      }
      emitFailure(dependencies, { requestId: context.requestId, operation: "capture", failure: error?.code || "unavailable" });
      sendBrowserError(res, 503, "minutes_control_unavailable", "Minutes controls are temporarily unavailable.", context.requestId, true);
    }
  });

  router.get("/captures/:captureId", requireControlEnabled, requireMinutesUser, async (req, res) => {
    const context = req.minutesControlContext;
    if (!context) return;
    try {
      const upstream = await dependencies.client.getCapture({
        ...clientOptions(dependencies, context),
        captureId: req.params.captureId,
      });
      if (!upstream?.ok) {
        mapUpstreamFailure(res, upstream, context.requestId);
        return;
      }
      const response = await parseUpstreamSuccess(upstream, parseMinutesStatusResponse, context, { captureId: req.params.captureId });
      res.status(200).json({
        captureId: response.capture_id,
        meetingId: response.meeting_id,
        state: response.state,
        failureCode: response.failure_code,
        capturedSecondsTotal: response.metering.captured_seconds_total,
        terminal: response.metering.terminal,
      });
    } catch (error) {
      emitFailure(dependencies, { requestId: context.requestId, operation: "status", failure: error?.code || "unavailable" });
      sendBrowserError(res, 503, "minutes_control_unavailable", "Minutes controls are temporarily unavailable.", context.requestId, true);
    }
  });

  router.post("/captures/:captureId/stop", requireControlEnabled, requireMinutesUser, browserJson, async (req, res) => {
    const context = req.minutesControlContext;
    if (!context) return;
    try {
      const input = parseMinutesBrowserIdempotency(req.body);
      const upstream = await dependencies.client.stopCapture({
        ...clientOptions(dependencies, context),
        captureId: req.params.captureId,
        idempotencyKey: input.idempotency_key,
      });
      if (!upstream?.ok) {
        mapUpstreamFailure(res, upstream, context.requestId);
        return;
      }
      const response = await parseUpstreamSuccess(upstream, parseMinutesStatusResponse, context, { captureId: req.params.captureId });
      res.status(200).json({
        captureId: response.capture_id,
        meetingId: response.meeting_id,
        state: response.state,
        terminal: response.metering.terminal,
      });
    } catch (error) {
      if (isControlInputError(error)) {
        sendBrowserError(res, 400, "minutes_control_invalid_request", "The Minutes control request is invalid.", context.requestId);
        return;
      }
      emitFailure(dependencies, { requestId: context.requestId, operation: "stop", failure: error?.code || "unavailable" });
      sendBrowserError(res, 503, "minutes_control_unavailable", "Minutes controls are temporarily unavailable.", context.requestId, true);
    }
  });

  router.post("/meetings/:meetingId/forget", requireControlEnabled, requireMinutesUser, browserJson, async (req, res) => {
    const context = req.minutesControlContext;
    if (!context) return;
    try {
      const input = parseMinutesBrowserIdempotency(req.body);
      const upstream = await dependencies.client.eraseMeeting({
        ...clientOptions(dependencies, context),
        meetingId: req.params.meetingId,
        idempotencyKey: input.idempotency_key,
      });
      if (!upstream?.ok) {
        mapUpstreamFailure(res, upstream, context.requestId);
        return;
      }
      const response = await parseUpstreamSuccess(upstream, parseMinutesErasureResponse, context, { scope: "meeting" });
      if (response.target_id !== req.params.meetingId) {
        throw new MinutesControlContractError("Minutes upstream erased a different meeting.", "minutes_control_upstream_binding_mismatch");
      }
      await dependencies.forgetMeeting({ userId: context.userId, tenantId: context.tenantId, meetingId: req.params.meetingId });
      res.status(200).json({ status: response.status, ...safeReceipt(response) });
    } catch (error) {
      if (isControlInputError(error)) {
        sendBrowserError(res, 400, "minutes_control_invalid_request", "The Minutes control request is invalid.", context.requestId);
        return;
      }
      emitFailure(dependencies, { requestId: context.requestId, operation: "erase_meeting", failure: error?.code || "unavailable" });
      sendBrowserError(res, 503, "minutes_control_unavailable", "Minutes controls are temporarily unavailable.", context.requestId, true);
    }
  });

  router.use((error, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    if (String(req.path || "") === "/callback/v1") {
      res.set("Cache-Control", "no-store");
      sendCallbackError(res, error?.type === "entity.too.large" || error?.status === 413 ? 413 : 400, "invalid_request", false);
      return;
    }
    if (!req.minutesControlContext) {
      next(error);
      return;
    }
    const status = error?.type === "entity.too.large" || error?.status === 413 ? 413 : 400;
    sendBrowserError(
      res,
      status,
      "minutes_control_invalid_request",
      status === 413 ? "The Minutes control request is too large." : "The Minutes control request is invalid.",
      req.minutesControlContext.requestId
    );
  });

  return router;
}

export async function eraseMinutesAccountForErasure({
  baseUrl,
  controlSigningKey,
  authHeaderName,
  userId,
  tenantId = "default",
  requestId,
  fetchWithTimeout,
  timeoutMs,
  client = DEFAULT_CLIENT,
} = {}) {
  const idempotencyKey = `minutes-erase-${createHash("sha256")
    .update(`${String(tenantId || "")}:${String(userId || "")}:${String(requestId || "")}`, "utf8")
    .digest("hex")}`;
  const upstream = await client.eraseAccount({
    baseUrl,
    controlSigningKey,
    authHeaderName,
    userId,
    tenantId,
    requestId,
    idempotencyKey,
    fetchWithTimeout,
    timeoutMs,
    label: "Minutes account erasure request",
  });
  if (!upstream?.ok) {
    discardBody(upstream);
    return { attempted: true, ok: false, status: Number(upstream?.status) || null };
  }
  const response = await parseUpstreamSuccess(
    upstream,
    parseMinutesErasureResponse,
    { userId: String(userId), tenantId: String(tenantId), requestId: String(requestId) },
    { scope: "account" }
  );
  return { attempted: true, ok: true, status: 200, receipt: safeReceipt(response) };
}
