import { createHash } from "node:crypto";
import express from "express";
import {
  MINUTES_CONTROL_API_VERSION,
  MINUTES_CONTROL_NOTETAKER_NAME,
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
  validateMinutesCaptureFundingWindow,
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
  MinutesControlStateError,
  applyMinutesControlCallback as defaultApplyMinutesControlCallback,
  forgetMinutesControlMeeting as defaultForgetMinutesControlMeeting,
  recordMinutesControlCompensation as defaultRecordMinutesControlCompensation,
  recordMinutesControlCapture as defaultRecordMinutesControlCapture,
} from "./minutes-control-state.js";
import {
  decryptMinutesControlRecoveryRequest as defaultDecryptRecoveryRequest,
  markMinutesControlRecoveryCapture as defaultMarkRecoveryCapture,
  markMinutesControlRecoveryPreSpawnOutcome as defaultMarkRecoveryPreSpawnOutcome,
  reserveMinutesControlCaptureWithIntent as defaultReserveMinutesControlCaptureWithIntent,
} from "./minutes-control-recovery.js";

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

function captureCompensationIdempotencyKey(captureId) {
  return `minutes-compensate-${createHash("sha256")
    .update(String(captureId || ""), "utf8")
    .digest("hex")}`;
}

async function compensateUnpersistedCapture({ dependencies, context, response, reservation }) {
  const idempotencyKey = captureCompensationIdempotencyKey(response.capture_id);
  const compensation = {
    captureId: response.capture_id,
    operationId: response.operation_id,
    meetingId: response.meeting_id,
    reservationId: reservation.hold.id,
    userId: context.userId,
    tenantId: context.tenantId,
  };
  const recoveryIntentId = reservation?.recoveryIntent?.recovery_id;
  if (recoveryIntentId) {
    try {
      await dependencies.markRecoveryCapture({
        recoveryId: recoveryIntentId,
        userId: context.userId,
        tenantId: context.tenantId,
        reservationId: reservation.hold.id,
        captureId: response.capture_id,
        operationId: response.operation_id,
        meetingId: response.meeting_id,
        state: "stop_pending",
        retryAfterMs: 0,
      });
    } catch (error) {
      emitFailure(dependencies, {
        requestId: context.requestId,
        operation: "capture_recovery_bind",
        failure: error?.code || "unavailable",
      });
    }
  }
  let compensationRecorded = false;
  try {
    await dependencies.recordCompensation({ ...compensation, stopState: "stop_pending" });
    compensationRecorded = true;
  } catch (error) {
    emitFailure(dependencies, {
      requestId: context.requestId,
      operation: "capture_compensation_record",
      failure: error?.code || "unavailable",
    });
  }

  let stopState = "stop_uncertain";
  try {
    const upstream = await dependencies.client.stopCapture({
      ...clientOptions(dependencies, context),
      captureId: response.capture_id,
      idempotencyKey,
      label: "Minutes capture persistence compensation",
    });
    if (!upstream?.ok) {
      discardBody(upstream);
      throw new Error("minutes_capture_compensation_stop_failed");
    }
    await parseUpstreamSuccess(upstream, parseMinutesStatusResponse, context, { captureId: response.capture_id });
    stopState = "stop_requested";
  } catch (error) {
    emitFailure(dependencies, {
      requestId: context.requestId,
      operation: "capture_compensation_stop",
      failure: error?.code || "unavailable",
    });
  }

  if (compensationRecorded) {
    try {
      await dependencies.recordCompensation({ ...compensation, stopState });
    } catch (error) {
      emitFailure(dependencies, {
        requestId: context.requestId,
        operation: "capture_compensation_update",
        failure: error?.code || "unavailable",
      });
    }
  }
  if (recoveryIntentId) {
    try {
      await dependencies.markRecoveryCapture({
        recoveryId: recoveryIntentId,
        userId: context.userId,
        tenantId: context.tenantId,
        reservationId: reservation.hold.id,
        captureId: response.capture_id,
        operationId: response.operation_id,
        meetingId: response.meeting_id,
        state: stopState === "stop_requested" ? "stop_requested" : "stop_pending",
        retryAfterMs: stopState === "stop_requested" ? 15_000 : 0,
      });
    } catch (error) {
      emitFailure(dependencies, {
        requestId: context.requestId,
        operation: "capture_recovery_stop",
        failure: error?.code || "unavailable",
      });
    }
  }
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
  recoveryEncryptionKey,
  callbackHmacKey,
  authHeaderName,
  timeoutMs,
  tokenTtlSeconds,
  policy,
  captureReserveUnits,
  captureHoldTtlMs,
  captureMaxSeconds = 60 * 60,
  resolveUser,
  getRequestId,
  fetchWithTimeout,
  resolvePlan,
  reserveCapture = defaultReserveMinutesControlCaptureWithIntent,
  recordCapture = defaultRecordMinutesControlCapture,
  recordCompensation = defaultRecordMinutesControlCompensation,
  markRecoveryCapture = defaultMarkRecoveryCapture,
  markRecoveryPreSpawnOutcome = defaultMarkRecoveryPreSpawnOutcome,
  decryptRecoveryRequest = defaultDecryptRecoveryRequest,
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
    captureReserveUnits, captureHoldTtlMs, captureMaxSeconds, resolveUser, getRequestId, fetchWithTimeout, resolvePlan,
    reserveCapture, recordCapture, recordCompensation,
    markRecoveryCapture, markRecoveryPreSpawnOutcome, decryptRecoveryRequest,
    forgetMeeting, applyCallback, recordFailure, client, now,
    recoveryEncryptionKey,
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
    let engineCreateStarted = false;
    let recoveryOutcomeKnown = false;
    try {
      const fundingWindow = validateMinutesCaptureFundingWindow({
        maxCaptureSeconds: dependencies.captureMaxSeconds,
        reservedUnits: Number(dependencies.captureReserveUnits),
        holdTtlMs: Number(dependencies.captureHoldTtlMs),
      });
      if (!fundingWindow.ok) {
        emitFailure(dependencies, { requestId: context.requestId, operation: "capture", failure: "invalid_metering_window" });
        sendBrowserError(res, 503, "minutes_control_unavailable", "Minutes controls are temporarily unavailable.", context.requestId, true);
        return;
      }
      input = parseMinutesBrowserCapture(req.body);
      const policyView = browserControlPolicy(dependencies);
      const recoveryRequest = {
        platform: input.platform,
        meetingUrl: input.meeting_url,
        captureAttestation: {
          bot_visible: true,
          bot_display_name: MINUTES_CONTROL_NOTETAKER_NAME,
          policy_version: policyView.capture_notice_policy_version,
          attested_at: dependencies.now().toISOString(),
          attested_by_user_id: context.userId,
        },
        metering: {
          // The hold id is attached below after the atomic reserve completes.
          reservation_id: null,
          unit: "bot_minute",
          reserved_units: dependencies.captureReserveUnits,
        },
      };
      reservation = await dependencies.reserveCapture({
        zakiUser: context.zakiUser,
        tenantId: context.tenantId,
        requestId: context.requestId,
        idempotencyKey: input.idempotency_key,
        reservedUnits: dependencies.captureReserveUnits,
        holdTtlMs: dependencies.captureHoldTtlMs,
        resolvePlan: dependencies.resolvePlan,
        recoveryRequest,
        recoveryEncryptionKey: dependencies.recoveryEncryptionKey,
      });
      const recoveryState = String(reservation.recoveryIntent?.state || "");
      if (["blocked", "terminal"].includes(recoveryState)) {
        throw new MinutesControlStateError("Minutes capture recovery is not eligible for another create.", {
          code: "upstream_unavailable",
          status: 503,
          retryable: true,
        });
      }
      // Test doubles may not create a recovery row, in which case the
      // in-memory request below remains the authoritative outbound payload.
      let createRequest = {
        ...recoveryRequest,
        metering: {
          ...recoveryRequest.metering,
          reservation_id: String(reservation.hold.id),
        },
      };
      if (reservation.recoveryIntent) {
        createRequest = dependencies.decryptRecoveryRequest({
          recovery: reservation.recoveryIntent,
          encryptionKey: dependencies.recoveryEncryptionKey,
        });
      }
      // An engine idempotency replay is bound to the original request id. A
      // browser retry gets a new Hub request id, but must reuse the immutable
      // one stored with its recovery intent or a valid replay response would
      // look untrusted and be needlessly reclassified as ambiguous.
      const createContext = reservation.recoveryIntent?.request_id
        ? { ...context, requestId: String(reservation.recoveryIntent.request_id) }
        : context;
      engineCreateStarted = true;
      const upstream = await dependencies.client.createCapture({
        ...clientOptions(dependencies, createContext),
        idempotencyKey: input.idempotency_key,
        ...createRequest,
      });
      if (!upstream?.ok) {
        if (reservation.recoveryIntent) {
          await dependencies.markRecoveryPreSpawnOutcome({
            recoveryId: reservation.recoveryIntent.recovery_id,
            state: "create_uncertain",
            // A browser request owns no reconciliation lease. Keep every
            // post-reservation response durable until the worker can repeat
            // the exact idempotent create and, for only verified 400/422,
            // perform a lease-fenced release in the same DB transaction.
            errorCode: [400, 422].includes(Number(upstream?.status))
              ? "engine_create_rejected"
              : Number(upstream?.status) === 409
                ? "engine_create_conflict"
                : "engine_create_unavailable",
            retryAfterMs: 0,
          });
        }
        recoveryOutcomeKnown = Boolean(reservation.recoveryIntent);
        mapUpstreamFailure(res, upstream, context.requestId);
        return;
      }
      const response = await parseUpstreamSuccess(upstream, parseMinutesCaptureResponse, createContext);
      if (String(response.metering.reservation_id) !== String(reservation.hold.id)) {
        throw new MinutesControlContractError("Minutes upstream changed the capture reservation.", "minutes_control_upstream_binding_mismatch");
      }
      try {
        await dependencies.recordCapture({
          response,
          userId: context.userId,
          tenantId: context.tenantId,
          reservationId: reservation.hold.id,
          recoveryIntentId: reservation.recoveryIntent?.recovery_id,
        });
        recoveryOutcomeKnown = true;
      } catch (error) {
        // The engine has already created a real capture. Keep the paid hold in
        // place, durably record reconciliation when possible, and issue the
        // engine's idempotent stop before returning an unavailable response.
        // Never release the hold here: stop is asynchronous and a failed or
        // delayed compensation must not turn an untracked capture into free use.
        await compensateUnpersistedCapture({ dependencies, context, response, reservation });
        recoveryOutcomeKnown = true;
        throw new MinutesControlStateError("Minutes capture persistence failed after engine creation.", {
          code: "upstream_unavailable",
          status: 503,
          retryable: true,
          cause: error,
        });
      }
      res.status(202).json({
        captureId: response.capture_id,
        meetingId: response.meeting_id,
        state: response.state,
      });
    } catch (error) {
      if (engineCreateStarted && !recoveryOutcomeKnown && reservation?.recoveryIntent?.recovery_id) {
        try {
          await dependencies.markRecoveryPreSpawnOutcome({
            recoveryId: reservation.recoveryIntent.recovery_id,
            state: "create_uncertain",
            errorCode: error?.code || "engine_create_ambiguous",
            retryAfterMs: 0,
          });
        } catch (recoveryError) {
          emitFailure(dependencies, {
            requestId: context.requestId,
            operation: "capture_recovery_uncertain",
            failure: recoveryError?.code || "unavailable",
          });
        }
      }
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
      // The archive UI hands back the READ-plane item id (`meeting:<n>`); the engine's
      // erasure API wants the bare meeting id. Forwarding the namespaced shape verbatim
      // made the engine erase NOTHING while answering success-shaped — the owner clicked
      // forget, saw "requested", and the meeting persisted forever. Normalize here, at
      // the one choke point every client shape passes through.
      const meetingId = String(req.params.meetingId || "").replace(/^meeting:/, "");
      const upstream = await dependencies.client.eraseMeeting({
        ...clientOptions(dependencies, context),
        meetingId,
        idempotencyKey: input.idempotency_key,
      });
      if (!upstream?.ok) {
        mapUpstreamFailure(res, upstream, context.requestId);
        return;
      }
      const response = await parseUpstreamSuccess(upstream, parseMinutesErasureResponse, context, { scope: "meeting" });
      if (response.target_id !== meetingId) {
        throw new MinutesControlContractError("Minutes upstream erased a different meeting.", "minutes_control_upstream_binding_mismatch");
      }
      await dependencies.forgetMeeting({ userId: context.userId, tenantId: context.tenantId, meetingId });
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
