import { createHash, randomUUID } from "node:crypto";
import {
  MinutesControlContractError,
  assertMinutesControlResponseBinding,
  parseMinutesCaptureResponse,
  parseMinutesStatusResponse,
  readMinutesControlResponseJson,
} from "./minutes-control-contract.js";
import {
  createMinutesCapture,
  getMinutesCapture,
  stopMinutesCapture,
} from "./minutes-control-client.js";
import {
  decryptMinutesControlRecoveryRequest,
  claimMinutesControlRecoveries,
  ensureMinutesControlRecoveryReservation,
  releaseRejectedMinutesControlRecovery,
  rescheduleMinutesControlRecovery,
} from "./minutes-control-recovery.js";
import {
  recordMinutesControlCapture,
  settleRecoveredMinutesControlCapture,
} from "./minutes-control-state.js";

const DEFAULT_CLIENT = Object.freeze({
  createCapture: createMinutesCapture,
  getCapture: getMinutesCapture,
  stopCapture: stopMinutesCapture,
});

const INITIAL_RETRY_MS = 5_000;
const MAX_RETRY_MS = 5 * 60_000;

function discardBody(response) {
  try {
    const pending = response?.body?.cancel?.();
    pending?.catch?.(() => {});
  } catch {
    // An upstream error body is untrusted and never needed for recovery.
  }
}

function retryAfter(recovery) {
  const exponent = Math.max(0, Math.min(6, Number(recovery?.attempt_count || 1) - 1));
  return Math.min(MAX_RETRY_MS, INITIAL_RETRY_MS * (2 ** exponent));
}

function optionsForRecovery(dependencies, recovery) {
  return {
    baseUrl: dependencies.baseUrl,
    controlSigningKey: dependencies.controlSigningKey,
    authHeaderName: dependencies.authHeaderName,
    userId: String(recovery.user_id),
    tenantId: String(recovery.tenant_id),
    requestId: String(recovery.request_id),
    fetchWithTimeout: dependencies.fetchWithTimeout,
    timeoutMs: dependencies.timeoutMs,
    tokenTtlSeconds: dependencies.tokenTtlSeconds,
    nowMs: dependencies.now().getTime(),
  };
}

async function parseBoundResponse(upstream, parseResponse, recovery, expected = {}) {
  const payload = await readMinutesControlResponseJson(upstream);
  const response = parseResponse(payload);
  return assertMinutesControlResponseBinding(response, {
    subject: { tenant_id: String(recovery.tenant_id), user_id: String(recovery.user_id) },
    requestId: String(recovery.request_id),
    ...expected,
  });
}

function recoveryStopIdempotencyKey(captureId) {
  // Capture identifiers are valid at up to 160 characters, while the control
  // idempotency envelope has the same maximum. Hash the opaque capture id so
  // a valid long engine id cannot make a recovery stop request invalid.
  return `minutes-recovery-stop-${createHash("sha256")
    .update(String(captureId || ""), "utf8")
    .digest("hex")}`;
}

async function terminalizeFromStatus({ dependencies, recovery, response }) {
  await dependencies.settleRecovered({
    recoveryId: recovery.recovery_id,
    leaseOwner: dependencies.leaseOwner,
    response,
  });
  return "terminal";
}

async function blockRecovery({ dependencies, recovery, code }) {
  await dependencies.reschedule({
    recoveryId: recovery.recovery_id,
    leaseOwner: dependencies.leaseOwner,
    state: "blocked",
    errorCode: code,
  });
  return "blocked";
}

async function recoverCreate({ dependencies, recovery }) {
  let request;
  try {
    request = dependencies.decryptRecoveryRequest({
      recovery,
      encryptionKey: dependencies.recoveryEncryptionKey,
    });
  } catch (error) {
    return blockRecovery({ dependencies, recovery, code: error?.code || "recovery_request_unavailable" });
  }

  let upstream;
  try {
    upstream = await dependencies.client.createCapture({
      ...optionsForRecovery(dependencies, recovery),
      idempotencyKey: recovery.idempotency_key,
      ...request,
      label: "Minutes durable capture recovery",
    });
  } catch {
    await dependencies.reschedule({
      recoveryId: recovery.recovery_id,
      leaseOwner: dependencies.leaseOwner,
      state: "create_uncertain",
      errorCode: "engine_create_transport_failed",
      retryAfterMs: retryAfter(recovery),
    });
    return "retry";
  }
  if (!upstream?.ok) {
    const status = Number(upstream?.status);
    discardBody(upstream);
    if ([400, 422].includes(status)) {
      await dependencies.releaseRejected({
        recoveryId: recovery.recovery_id,
        leaseOwner: dependencies.leaseOwner,
        errorCode: "engine_create_rejected",
      });
      return "blocked";
    }
    await dependencies.reschedule({
      recoveryId: recovery.recovery_id,
      leaseOwner: dependencies.leaseOwner,
      state: "create_uncertain",
      errorCode: status === 409 ? "engine_create_conflict" : "engine_create_unavailable",
      retryAfterMs: retryAfter(recovery),
    });
    return "retry";
  }

  let response;
  try {
    response = await parseBoundResponse(upstream, parseMinutesCaptureResponse, recovery);
    if (String(response.metering.reservation_id) !== String(recovery.reservation_id)) {
      throw new MinutesControlContractError("Minutes recovery response changed the reservation.");
    }
  } catch {
    await dependencies.reschedule({
      recoveryId: recovery.recovery_id,
      leaseOwner: dependencies.leaseOwner,
      state: "create_uncertain",
      errorCode: "engine_create_response_invalid",
      retryAfterMs: retryAfter(recovery),
    });
    return "retry";
  }

  try {
    await dependencies.recordCapture({
      response,
      userId: String(recovery.user_id),
      tenantId: String(recovery.tenant_id),
      reservationId: recovery.reservation_id,
      recoveryIntentId: recovery.recovery_id,
      recoveryState: "stop_pending",
      recoveryLeaseOwner: dependencies.leaseOwner,
    });
  } catch {
    // The old lease is still valid, but the pre-spawn intent survives even if
    // this transaction did not. Retry the exact idempotent create instead of
    // inventing a capture id from an untrusted failure body.
    await dependencies.reschedule({
      recoveryId: recovery.recovery_id,
      leaseOwner: dependencies.leaseOwner,
      state: "create_uncertain",
      errorCode: "capture_binding_persist_failed",
      retryAfterMs: retryAfter(recovery),
    });
    return "retry";
  }
  return recoverStop({ dependencies, recovery: { ...recovery, ...response, state: "stop_pending", capture_id: response.capture_id } });
}

async function recoverStop({ dependencies, recovery }) {
  if (!recovery.capture_id) {
    await dependencies.reschedule({
      recoveryId: recovery.recovery_id,
      leaseOwner: dependencies.leaseOwner,
      state: "create_uncertain",
      errorCode: "capture_id_missing",
      retryAfterMs: retryAfter(recovery),
    });
    return "retry";
  }
  let upstream;
  try {
    upstream = await dependencies.client.stopCapture({
      ...optionsForRecovery(dependencies, recovery),
      captureId: recovery.capture_id,
      idempotencyKey: recoveryStopIdempotencyKey(recovery.capture_id),
      label: "Minutes durable capture stop recovery",
    });
  } catch {
    await dependencies.reschedule({
      recoveryId: recovery.recovery_id,
      leaseOwner: dependencies.leaseOwner,
      state: "stop_pending",
      errorCode: "engine_stop_transport_failed",
      retryAfterMs: retryAfter(recovery),
    });
    return "retry";
  }
  if (!upstream?.ok) {
    const status = Number(upstream?.status);
    discardBody(upstream);
    await dependencies.reschedule({
      recoveryId: recovery.recovery_id,
      leaseOwner: dependencies.leaseOwner,
      state: "stop_pending",
      errorCode: status === 404 ? "engine_capture_not_found" : "engine_stop_unavailable",
      retryAfterMs: retryAfter(recovery),
    });
    return "retry";
  }
  try {
    const response = await parseBoundResponse(upstream, parseMinutesStatusResponse, recovery, { captureId: recovery.capture_id });
    if (String(response.metering.reservation_id) !== String(recovery.reservation_id)) {
      throw new MinutesControlContractError("Minutes recovery stop changed the reservation.");
    }
    if (response.metering.terminal) return terminalizeFromStatus({ dependencies, recovery, response });
  } catch {
    await dependencies.reschedule({
      recoveryId: recovery.recovery_id,
      leaseOwner: dependencies.leaseOwner,
      state: "stop_pending",
      errorCode: "engine_stop_response_invalid",
      retryAfterMs: retryAfter(recovery),
    });
    return "retry";
  }
  await dependencies.reschedule({
    recoveryId: recovery.recovery_id,
    leaseOwner: dependencies.leaseOwner,
    state: "stop_requested",
    retryAfterMs: 5_000,
  });
  return "waiting";
}

async function pollCapture({ dependencies, recovery }) {
  if (!recovery.capture_id) return recoverCreate({ dependencies, recovery });
  let upstream;
  try {
    upstream = await dependencies.client.getCapture({
      ...optionsForRecovery(dependencies, recovery),
      captureId: recovery.capture_id,
      label: "Minutes durable capture status recovery",
    });
  } catch {
    await dependencies.reschedule({
      recoveryId: recovery.recovery_id,
      leaseOwner: dependencies.leaseOwner,
      state: recovery.state,
      errorCode: "engine_status_transport_failed",
      retryAfterMs: retryAfter(recovery),
    });
    return "retry";
  }
  if (!upstream?.ok) {
    const status = Number(upstream?.status);
    discardBody(upstream);
    await dependencies.reschedule({
      recoveryId: recovery.recovery_id,
      leaseOwner: dependencies.leaseOwner,
      state: recovery.state,
      errorCode: status === 404 ? "engine_capture_not_found" : "engine_status_unavailable",
      retryAfterMs: retryAfter(recovery),
    });
    return "retry";
  }
  try {
    const response = await parseBoundResponse(upstream, parseMinutesStatusResponse, recovery, { captureId: recovery.capture_id });
    if (String(response.metering.reservation_id) !== String(recovery.reservation_id)) {
      throw new MinutesControlContractError("Minutes recovery status changed the reservation.");
    }
    if (response.metering.terminal) return terminalizeFromStatus({ dependencies, recovery, response });
  } catch {
    await dependencies.reschedule({
      recoveryId: recovery.recovery_id,
      leaseOwner: dependencies.leaseOwner,
      state: recovery.state,
      errorCode: "engine_status_response_invalid",
      retryAfterMs: retryAfter(recovery),
    });
    return "retry";
  }
  await dependencies.reschedule({
    recoveryId: recovery.recovery_id,
    leaseOwner: dependencies.leaseOwner,
    state: recovery.state,
    retryAfterMs: recovery.state === "tracking" ? 60_000 : 5_000,
  });
  return "waiting";
}

async function reconcileOne(dependencies, recovery) {
  let reservationActive;
  try {
    reservationActive = await dependencies.ensureReservation({ recovery });
  } catch {
    await dependencies.reschedule({
      recoveryId: recovery.recovery_id,
      leaseOwner: dependencies.leaseOwner,
      state: recovery.state,
      errorCode: "recovery_reservation_check_failed",
      retryAfterMs: retryAfter(recovery),
    });
    return "retry";
  }
  if (!reservationActive) {
    return blockRecovery({ dependencies, recovery, code: "recovery_reservation_inactive" });
  }
  if (["prepared", "create_uncertain"].includes(recovery.state)) {
    return recoverCreate({ dependencies, recovery });
  }
  if (recovery.state === "stop_pending") return recoverStop({ dependencies, recovery });
  return pollCapture({ dependencies, recovery });
}

export async function reconcileMinutesControlRecoveries({
  baseUrl,
  controlSigningKey,
  authHeaderName,
  fetchWithTimeout,
  timeoutMs,
  tokenTtlSeconds,
  recoveryEncryptionKey,
  leaseOwner = randomUUID(),
  limit = 25,
  leaseMs = 60_000,
  now = () => new Date(),
  client = DEFAULT_CLIENT,
  claim = claimMinutesControlRecoveries,
  ensureReservation = ensureMinutesControlRecoveryReservation,
  releaseRejected = releaseRejectedMinutesControlRecovery,
  reschedule = rescheduleMinutesControlRecovery,
  decryptRecoveryRequest = decryptMinutesControlRecoveryRequest,
  recordCapture = recordMinutesControlCapture,
  settleRecovered = settleRecoveredMinutesControlCapture,
} = {}) {
  const claimed = await claim({ leaseOwner, limit, leaseMs });
  const dependencies = {
    baseUrl,
    controlSigningKey,
    authHeaderName,
    fetchWithTimeout,
    timeoutMs,
    tokenTtlSeconds,
    recoveryEncryptionKey,
    leaseOwner,
    now,
    client,
    reschedule,
    ensureReservation,
    releaseRejected,
    decryptRecoveryRequest,
    recordCapture,
    settleRecovered,
  };
  const result = { claimed: claimed.length, terminal: 0, blocked: 0, retry: 0, waiting: 0, failed: 0 };
  // Claims have a short lease because an engine operation is bounded to 30
  // seconds. Reconcile the bounded batch concurrently: serial handling could
  // otherwise let later records lose their leases behind unrelated timeouts.
  const outcomes = await Promise.all(claimed.map(async (recovery) => {
    try {
      return await reconcileOne(dependencies, recovery);
    } catch {
      try {
        await reschedule({
          recoveryId: recovery.recovery_id,
          leaseOwner,
          state: recovery.state,
          errorCode: "reconciler_internal_error",
          retryAfterMs: retryAfter(recovery),
        });
      } catch {
        // A lost lease is safe: another worker owns the durable record now.
      }
      return "failed";
    }
  }));
  for (const outcome of outcomes) {
    if (Object.hasOwn(result, outcome)) result[outcome] += 1;
    else result.waiting += 1;
  }
  return result;
}
