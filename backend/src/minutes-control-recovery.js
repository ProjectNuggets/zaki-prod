import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { dbQuery as defaultDbQuery, withDbTransaction as defaultWithDbTransaction } from "./db.js";
import { canonicalMinutesControlJson } from "./minutes-control-contract.js";
import {
  releaseMinutesCapture as defaultReleaseMinutesCapture,
  reserveMinutesCapture as defaultReserveMinutesCapture,
} from "./minutes-control-metering.js";

// A recovery intent is deliberately separate from the primary capture row.  It
// is committed *before* any engine request, so neither an ambiguous HTTP
// response nor a post-create database failure can leave a paid bot without a
// durable owner.  The request body is encrypted at rest because a meeting URL
// is a bearer-like join capability for some providers.
export const MINUTES_CONTROL_RECOVERY_DDL = `
CREATE TABLE IF NOT EXISTS zaki_minutes_control_recoveries (
  recovery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  idempotency_key TEXT NOT NULL,
  request_id TEXT NOT NULL,
  reservation_id UUID NOT NULL REFERENCES zaki_meter_holds(id) ON DELETE RESTRICT,
  request_sha256 TEXT NOT NULL,
  request_ciphertext BYTEA NOT NULL,
  request_iv BYTEA NOT NULL,
  request_tag BYTEA NOT NULL,
  state TEXT NOT NULL DEFAULT 'prepared'
    CHECK (state IN ('prepared','create_uncertain','tracking','stop_pending','stop_requested','terminal','blocked')),
  capture_id TEXT,
  operation_id TEXT,
  meeting_id TEXT,
  terminal_captured_seconds BIGINT,
  lease_owner UUID,
  lease_expires_at TIMESTAMPTZ,
  lease_generation BIGINT NOT NULL DEFAULT 0,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error_code TEXT,
  last_error_at TIMESTAMPTZ,
  terminal_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_zaki_minutes_control_recoveries_due
  ON zaki_minutes_control_recoveries (next_attempt_at, created_at)
  WHERE state IN ('prepared','create_uncertain','tracking','stop_pending','stop_requested');
CREATE INDEX IF NOT EXISTS idx_zaki_minutes_control_recoveries_capture
  ON zaki_minutes_control_recoveries (capture_id)
  WHERE capture_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_zaki_minutes_control_recoveries_operation
  ON zaki_minutes_control_recoveries (operation_id)
  WHERE operation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_zaki_minutes_control_recoveries_reservation
  ON zaki_minutes_control_recoveries (reservation_id, state);
`;

const ACTIVE_STATES = new Set([
  "prepared",
  "create_uncertain",
  "tracking",
  "stop_pending",
  "stop_requested",
]);
const RECOVERY_STATES = new Set([...ACTIVE_STATES, "terminal", "blocked"]);
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const USER_ID = /^[1-9][0-9]{0,18}$/;
// A reclaimed create has to keep its ledger hold reserved for longer than the
// largest retry gap and one bounded engine request. Otherwise the ordinary
// hold-expiry sweep could refund it while the reconciler is still allowed to
// create the capture. This is deliberately a fixed internal safety window,
// not a new operator-facing knob.
const RECOVERY_RESERVATION_GRACE_MS = 10 * 60 * 1_000;

export class MinutesControlRecoveryError extends Error {
  constructor(message, { code = "recovery_unavailable", retryable = true, cause } = {}) {
    super(message, { cause });
    this.name = "MinutesControlRecoveryError";
    this.code = code;
    this.retryable = retryable;
  }
}

function rows(result) {
  return Array.isArray(result?.rows) ? result.rows : [];
}

function same(left, right) {
  return String(left ?? "") === String(right ?? "");
}

function validIdentifier(value) {
  return IDENTIFIER.test(String(value || ""));
}

function validSubject({ userId, tenantId }) {
  return USER_ID.test(String(userId || "")) && validIdentifier(tenantId);
}

function recoveryAad({ tenantId, userId, idempotencyKey }) {
  return Buffer.from(`zaki-minutes-recovery-v1\u0000${tenantId}\u0000${userId}\u0000${idempotencyKey}`, "utf8");
}

function recoveryKey(encryptionKey) {
  const source = String(encryptionKey || "");
  if (source.length < 32 || source.length > 512) {
    throw new MinutesControlRecoveryError("Minutes recovery encryption key is unavailable.", {
      code: "recovery_key_unavailable",
      retryable: false,
    });
  }
  return createHash("sha256")
    .update("zaki-minutes-recovery-v1\u0000", "utf8")
    .update(source, "utf8")
    .digest();
}

function encodedRequest(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new MinutesControlRecoveryError("Minutes recovery request is invalid.", {
      code: "recovery_request_invalid",
      retryable: false,
    });
  }
  return Buffer.from(canonicalMinutesControlJson(request), "utf8");
}

// `attested_at` is generated by the Hub, not supplied by the browser.  A
// browser retry with the same idempotency key must reuse the original signed
// engine request rather than be rejected merely because its new process clock
// ticked.  Everything a caller can influence remains part of this fingerprint.
function recoveryRequestFingerprint(request) {
  const stable = {
    ...request,
    // Recovery stores the Hub client-call shape (camelCase), not the
    // downstream JSON wire shape. Normalize only the server-generated clock
    // value so an otherwise identical browser idempotency retry maps to the
    // immutable original request.
    captureAttestation: request?.captureAttestation
      ? { ...request.captureAttestation, attested_at: "__server_attestation_time__" }
      : request?.captureAttestation,
  };
  return createHash("sha256").update(canonicalMinutesControlJson(stable), "utf8").digest("hex");
}

export function encryptMinutesControlRecoveryRequest({ request, encryptionKey, tenantId, userId, idempotencyKey } = {}) {
  const plain = encodedRequest(request);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", recoveryKey(encryptionKey), iv);
  cipher.setAAD(recoveryAad({ tenantId, userId, idempotencyKey }));
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  return {
    requestSha256: recoveryRequestFingerprint(request),
    ciphertext,
    iv,
    tag: cipher.getAuthTag(),
  };
}

export function decryptMinutesControlRecoveryRequest({ recovery, encryptionKey } = {}) {
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      recoveryKey(encryptionKey),
      Buffer.from(recovery?.request_iv || [])
    );
    decipher.setAAD(recoveryAad({
      tenantId: recovery?.tenant_id,
      userId: recovery?.user_id,
      idempotencyKey: recovery?.idempotency_key,
    }));
    decipher.setAuthTag(Buffer.from(recovery?.request_tag || []));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(recovery?.request_ciphertext || [])),
      decipher.final(),
    ]);
    const expected = String(recovery?.request_sha256 || "");
    const value = JSON.parse(plain.toString("utf8"));
    const actual = recoveryRequestFingerprint(value);
    if (!/^[a-f0-9]{64}$/.test(expected) || !same(actual, expected)) {
      throw new Error("request integrity mismatch");
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("request shape invalid");
    return value;
  } catch (cause) {
    throw new MinutesControlRecoveryError("Minutes recovery request could not be decrypted.", {
      code: "recovery_request_unavailable",
      retryable: false,
      cause,
    });
  }
}

export async function prepareMinutesControlRecoveryIntent({
  userId,
  tenantId = "default",
  idempotencyKey,
  requestId,
  reservationId,
  request,
  encryptionKey,
  client,
  runInTransaction = defaultWithDbTransaction,
} = {}) {
  if (
    !validSubject({ userId, tenantId }) ||
    !validIdentifier(idempotencyKey) ||
    !validIdentifier(requestId) ||
    !reservationId
  ) {
    throw new MinutesControlRecoveryError("Minutes recovery identity is invalid.", {
      code: "recovery_request_invalid",
      retryable: false,
    });
  }
  const encrypted = encryptMinutesControlRecoveryRequest({
    request,
    encryptionKey,
    tenantId,
    userId: String(userId),
    idempotencyKey,
  });
  const run = async (dbClient) => {
    const result = await dbClient.query(
      `INSERT INTO zaki_minutes_control_recoveries
       (user_id, tenant_id, idempotency_key, request_id, reservation_id,
          request_sha256, request_ciphertext, request_iv, request_tag, state, next_attempt_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'prepared', NOW() + INTERVAL '1 minute')
       ON CONFLICT (tenant_id, user_id, idempotency_key) DO UPDATE
         SET updated_at = NOW()
       WHERE zaki_minutes_control_recoveries.request_sha256 = EXCLUDED.request_sha256
         AND zaki_minutes_control_recoveries.reservation_id = EXCLUDED.reservation_id
       RETURNING *`,
      [
        String(userId), tenantId, idempotencyKey, requestId, reservationId,
        encrypted.requestSha256, encrypted.ciphertext, encrypted.iv, encrypted.tag,
      ]
    );
    const recovery = rows(result)[0];
    if (!recovery) {
      throw new MinutesControlRecoveryError("Minutes recovery intent conflicted with an existing operation.", {
        code: "recovery_intent_conflict",
        retryable: false,
      });
    }
    return recovery;
  };
  return client ? run(client) : runInTransaction(run);
}

// This is the only production entrypoint that reserves a Minutes hold.  The
// callback passed to the ledger runs inside its reservation transaction, so an
// engine create can happen only after both durable facts exist.
export async function reserveMinutesControlCaptureWithIntent({
  recoveryRequest,
  recoveryEncryptionKey,
  prepareRecoveryIntent = prepareMinutesControlRecoveryIntent,
  reserveCapture = defaultReserveMinutesCapture,
  ...reserveOptions
} = {}) {
  const userId = String(reserveOptions.zakiUser?.id || "");
  const tenantId = String(reserveOptions.tenantId || "default");
  const idempotencyKey = String(reserveOptions.idempotencyKey || "");
  const requestId = String(reserveOptions.requestId || "");
  return reserveCapture({
    ...reserveOptions,
    onReserved: async ({ hold }, client) => prepareRecoveryIntent({
      userId,
      tenantId,
      idempotencyKey,
      requestId,
      reservationId: hold.id,
      request: {
        ...recoveryRequest,
        metering: {
          ...recoveryRequest?.metering,
          reservation_id: String(hold.id),
        },
      },
      encryptionKey: recoveryEncryptionKey,
      client,
    }),
  });
}

export async function markMinutesControlRecoveryCapture({
  recoveryId,
  userId,
  tenantId = "default",
  reservationId,
  captureId,
  operationId,
  meetingId,
  state = "tracking",
  leaseOwner,
  retryAfterMs = 60_000,
  client,
  dbQuery = defaultDbQuery,
} = {}) {
  if (
    !recoveryId || !validSubject({ userId, tenantId }) || !reservationId ||
    !validIdentifier(captureId) || !validIdentifier(operationId) ||
    (meetingId && !validIdentifier(meetingId)) || !ACTIVE_STATES.has(state)
  ) {
    throw new MinutesControlRecoveryError("Minutes recovery capture binding is invalid.", {
      code: "recovery_request_invalid",
      retryable: false,
    });
  }
  const target = client || { query: dbQuery };
  const query = target.query.bind(target);
  const ownerClause = leaseOwner ? " AND lease_owner = $10::uuid" : "";
  const params = [
    recoveryId, String(userId), tenantId, reservationId, captureId, operationId, meetingId || null,
    state, Math.max(0, Math.floor(Number(retryAfterMs) || 0)),
  ];
  if (leaseOwner) params.push(leaseOwner);
  const result = await query(
    `UPDATE zaki_minutes_control_recoveries
       SET capture_id = $5,
           operation_id = $6,
           meeting_id = COALESCE(meeting_id, $7),
           state = $8,
           next_attempt_at = NOW() + ($9 * INTERVAL '1 millisecond'),
           last_error_code = NULL,
           last_error_at = NULL,
           updated_at = NOW()
     WHERE recovery_id = $1
       AND user_id = $2
       AND tenant_id = $3
       AND reservation_id = $4
       AND (capture_id IS NULL OR capture_id = $5)
       AND (operation_id IS NULL OR operation_id = $6)
       -- A blocked recovery has already taken its only safe automatic refund
       -- path. Never let a late browser response resurrect it and bind a
       -- capture to a released reservation.
       AND state IN ('prepared','create_uncertain','tracking','stop_pending','stop_requested')${ownerClause}
     RETURNING *`,
    params
  );
  const recovery = rows(result)[0];
  if (!recovery) {
    throw new MinutesControlRecoveryError("Minutes recovery capture binding was lost.", {
      code: "recovery_lease_lost",
      retryable: true,
    });
  }
  return recovery;
}

// Browser-request code has no reconciliation lease; it may only move its own
// pre-spawn intent into a conservative retry/blocked state.  It cannot erase a
// terminal receipt or overwrite a capture binding claimed by a worker.
export async function markMinutesControlRecoveryPreSpawnOutcome({
  recoveryId,
  state,
  errorCode,
  retryAfterMs = 0,
  dbQuery = defaultDbQuery,
} = {}) {
  if (!recoveryId || !["create_uncertain", "blocked"].includes(state)) {
    throw new MinutesControlRecoveryError("Minutes recovery pre-spawn transition is invalid.", {
      code: "recovery_request_invalid",
      retryable: false,
    });
  }
  const result = await dbQuery(
    `UPDATE zaki_minutes_control_recoveries
       SET state = $2,
           next_attempt_at = CASE WHEN $2 = 'blocked' THEN next_attempt_at
                                  ELSE NOW() + ($3 * INTERVAL '1 millisecond') END,
           last_error_code = $4,
           last_error_at = CASE WHEN $4 IS NULL THEN NULL ELSE NOW() END,
           updated_at = NOW()
     WHERE recovery_id = $1
       AND state IN ('prepared','create_uncertain')
     RETURNING *`,
    [
      recoveryId,
      state,
      Math.max(0, Math.floor(Number(retryAfterMs) || 0)),
      errorCode || null,
    ]
  );
  const recovery = rows(result)[0];
  if (!recovery) {
    throw new MinutesControlRecoveryError("Minutes recovery pre-spawn transition was lost.", {
      code: "recovery_lease_lost",
      retryable: true,
    });
  }
  return recovery;
}

// Renew the hold immediately before any reconciler-owned create. The update
// is the admission check: a released, settled, expired, or already-expired
// reservation can never produce a late free capture. A live uncertainty gets
// a bounded lease past the next retry window. The ordinary hold sweep also
// excludes nonterminal recovery records, so a process outage leaves a visible
// manual-reconciliation record rather than refunding a possibly live capture.
export async function ensureMinutesControlRecoveryReservation({
  recovery,
  graceMs = RECOVERY_RESERVATION_GRACE_MS,
  dbQuery = defaultDbQuery,
} = {}) {
  if (
    !recovery?.reservation_id ||
    !validSubject({ userId: recovery.user_id, tenantId: recovery.tenant_id })
  ) {
    throw new MinutesControlRecoveryError("Minutes recovery reservation is invalid.", {
      code: "recovery_request_invalid",
      retryable: false,
    });
  }
  const boundedGraceMs = Math.max(
    60_000,
    Math.min(24 * 60 * 60 * 1_000, Math.floor(Number(graceMs) || 0))
  );
  const result = await dbQuery(
    `UPDATE zaki_meter_holds
        SET expires_at = GREATEST(expires_at, NOW() + ($5 * INTERVAL '1 millisecond'))
      WHERE id = $1
        AND user_id = $2
        AND tenant_id = $3
        AND product_id = 'minutes'
        AND action = $4
        AND state = 'reserved'
        AND expires_at > NOW()
      RETURNING id`,
    [
      recovery.reservation_id,
      String(recovery.user_id),
      String(recovery.tenant_id),
      "minutes_capture",
      boundedGraceMs,
    ]
  );
  return Boolean(rows(result)[0]);
}

// A definitive create rejection is the only automatic-refund path. It must
// fence on the current recovery lease and prove no capture has ever been
// bound before changing the ledger hold; otherwise a stale worker could turn
// a real capture into free use after a newer worker takes over.
export async function releaseRejectedMinutesControlRecovery({
  recoveryId,
  leaseOwner,
  errorCode = "engine_create_rejected",
  releaseCapture = defaultReleaseMinutesCapture,
  runInTransaction = defaultWithDbTransaction,
} = {}) {
  if (!recoveryId || !leaseOwner || typeof releaseCapture !== "function") {
    throw new MinutesControlRecoveryError("Minutes recovery release is invalid.", {
      code: "recovery_request_invalid",
      retryable: false,
    });
  }
  return runInTransaction(async (client) => {
    const recovery = rows(await client.query(
      `SELECT *
         FROM zaki_minutes_control_recoveries
        WHERE recovery_id = $1
          AND lease_owner = $2::uuid
        FOR UPDATE`,
      [recoveryId, leaseOwner]
    ))[0];
    if (
      !recovery ||
      !["prepared", "create_uncertain"].includes(recovery.state) ||
      recovery.capture_id ||
      recovery.operation_id
    ) {
      throw new MinutesControlRecoveryError("Minutes recovery lease was lost before release.", {
        code: "recovery_lease_lost",
        retryable: true,
      });
    }
    const released = await releaseCapture({
      holdId: recovery.reservation_id,
      idempotencyKey: `minutes-recovery-release-${recovery.recovery_id}`,
      client,
    });
    if (!released?.ok || (released.idempotent && released.hold?.state !== "released")) {
      throw new MinutesControlRecoveryError("Minutes recovery hold could not be safely released.", {
        code: "recovery_release_unavailable",
        retryable: true,
      });
    }
    const updated = rows(await client.query(
      `UPDATE zaki_minutes_control_recoveries
          SET state = 'blocked',
              lease_owner = NULL,
              lease_expires_at = NULL,
              last_error_code = $3,
              last_error_at = NOW(),
              updated_at = NOW()
        WHERE recovery_id = $1
          AND lease_owner = $2::uuid
        RETURNING *`,
      [recoveryId, leaseOwner, errorCode]
    ))[0];
    if (!updated) {
      throw new MinutesControlRecoveryError("Minutes recovery release transition was lost.", {
        code: "recovery_lease_lost",
        retryable: true,
      });
    }
    return updated;
  });
}

export async function claimMinutesControlRecoveries({
  leaseOwner,
  limit = 25,
  leaseMs = 30_000,
  dbQuery = defaultDbQuery,
} = {}) {
  if (!leaseOwner) throw new MinutesControlRecoveryError("Minutes recovery lease owner is required.", { code: "recovery_request_invalid", retryable: false });
  const boundedLimit = Math.max(1, Math.min(100, Math.floor(Number(limit) || 0)));
  const boundedLeaseMs = Math.max(1_000, Math.min(5 * 60_000, Math.floor(Number(leaseMs) || 0)));
  const result = await dbQuery(
    `WITH candidates AS (
       SELECT recovery_id
         FROM zaki_minutes_control_recoveries
        WHERE state IN ('prepared','create_uncertain','tracking','stop_pending','stop_requested')
          AND next_attempt_at <= NOW()
          AND (lease_expires_at IS NULL OR lease_expires_at < NOW())
        ORDER BY next_attempt_at ASC, created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
     )
     UPDATE zaki_minutes_control_recoveries AS recovery
        SET lease_owner = $2::uuid,
            lease_expires_at = NOW() + ($3 * INTERVAL '1 millisecond'),
            lease_generation = lease_generation + 1,
            attempt_count = attempt_count + 1,
            updated_at = NOW()
       FROM candidates
      WHERE recovery.recovery_id = candidates.recovery_id
      RETURNING recovery.*`,
    [boundedLimit, leaseOwner, boundedLeaseMs]
  );
  return rows(result);
}

export async function rescheduleMinutesControlRecovery({
  recoveryId,
  leaseOwner,
  state,
  retryAfterMs = 60_000,
  errorCode,
  terminalCapturedSeconds,
  dbQuery = defaultDbQuery,
} = {}) {
  if (!recoveryId || !leaseOwner || !RECOVERY_STATES.has(state)) {
    throw new MinutesControlRecoveryError("Minutes recovery transition is invalid.", {
      code: "recovery_request_invalid",
      retryable: false,
    });
  }
  const isTerminal = state === "terminal";
  const result = await dbQuery(
    `UPDATE zaki_minutes_control_recoveries
       SET state = $3,
           next_attempt_at = CASE WHEN $3 IN ('terminal','blocked') THEN next_attempt_at
                                  ELSE NOW() + ($4 * INTERVAL '1 millisecond') END,
           lease_owner = NULL,
           lease_expires_at = NULL,
           last_error_code = $5,
           last_error_at = CASE WHEN $5 IS NULL THEN NULL ELSE NOW() END,
           terminal_captured_seconds = COALESCE($6, terminal_captured_seconds),
           terminal_at = CASE WHEN $7 THEN COALESCE(terminal_at, NOW()) ELSE terminal_at END,
           updated_at = NOW()
     WHERE recovery_id = $1
       AND lease_owner = $2::uuid
       AND state <> 'terminal'
     RETURNING *`,
    [
      recoveryId,
      leaseOwner,
      state,
      Math.max(0, Math.floor(Number(retryAfterMs) || 0)),
      errorCode || null,
      Number.isSafeInteger(terminalCapturedSeconds) ? terminalCapturedSeconds : null,
      isTerminal,
    ]
  );
  const recovery = rows(result)[0];
  if (!recovery) {
    throw new MinutesControlRecoveryError("Minutes recovery lease was lost.", {
      code: "recovery_lease_lost",
      retryable: true,
    });
  }
  return recovery;
}

export async function findMinutesControlRecoveryForCallback({ client, captureId, operationId } = {}) {
  if (!client || !validIdentifier(captureId) || !validIdentifier(operationId)) return null;
  const result = await client.query(
    `SELECT *
       FROM zaki_minutes_control_recoveries
      WHERE (capture_id = $1 OR operation_id = $2)
        -- Terminal rows must already have a primary capture binding, and a
        -- blocked row may have refunded its hold. Neither may be promoted by
        -- a late callback into a new capture record.
        AND state IN ('prepared','create_uncertain','tracking','stop_pending','stop_requested')
      ORDER BY created_at DESC
      LIMIT 1`,
    [captureId, operationId]
  );
  return rows(result)[0] || null;
}

export async function markMinutesControlRecoveryCallback({
  client,
  captureId,
  terminal = false,
  capturedSecondsTotal,
} = {}) {
  if (!client || !validIdentifier(captureId)) return null;
  const result = await client.query(
    `UPDATE zaki_minutes_control_recoveries
       SET state = CASE WHEN $2 THEN 'terminal' ELSE state END,
           terminal_captured_seconds = CASE WHEN $2 THEN $3 ELSE terminal_captured_seconds END,
           terminal_at = CASE WHEN $2 THEN COALESCE(terminal_at, NOW()) ELSE terminal_at END,
           lease_owner = CASE WHEN $2 THEN NULL ELSE lease_owner END,
           lease_expires_at = CASE WHEN $2 THEN NULL ELSE lease_expires_at END,
           last_error_code = CASE WHEN $2 THEN NULL ELSE last_error_code END,
           last_error_at = CASE WHEN $2 THEN NULL ELSE last_error_at END,
           updated_at = NOW()
     WHERE capture_id = $1
       AND state <> 'terminal'
     RETURNING *`,
    [captureId, Boolean(terminal), Number.isSafeInteger(capturedSecondsTotal) ? capturedSecondsTotal : null]
  );
  return rows(result)[0] || null;
}

export function isActiveMinutesControlRecoveryState(value) {
  return ACTIVE_STATES.has(String(value || ""));
}
