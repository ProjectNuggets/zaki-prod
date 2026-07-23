import { dbQuery as defaultDbQuery, withDbTransaction as defaultWithDbTransaction } from "./db.js";
import { minutesControlPayloadFingerprint } from "./minutes-control-contract.js";
import { settleMinutesCapture as defaultSettleMinutesCapture } from "./minutes-control-metering.js";
import {
  MINUTES_CONTROL_RECOVERY_DDL,
  findMinutesControlRecoveryForCallback,
  markMinutesControlRecoveryCallback,
} from "./minutes-control-recovery.js";

export const MINUTES_CONTROL_STATE_DDL = `
CREATE TABLE IF NOT EXISTS zaki_minutes_control_captures (
  capture_id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  operation_id TEXT NOT NULL,
  reservation_id UUID NOT NULL REFERENCES zaki_meter_holds(id) ON DELETE RESTRICT,
  meeting_id TEXT,
  state TEXT NOT NULL DEFAULT 'requested' CHECK (state IN ('requested','joining','awaiting_admission','active','stopping','completed','failed')),
  failure_code TEXT,
  usage_sequence INTEGER NOT NULL DEFAULT -1 CHECK (usage_sequence >= -1),
  captured_seconds_total BIGINT NOT NULL DEFAULT 0 CHECK (captured_seconds_total >= 0),
  usage_terminal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id, operation_id)
);
CREATE INDEX IF NOT EXISTS idx_zaki_minutes_control_captures_subject
  ON zaki_minutes_control_captures (tenant_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zaki_minutes_control_captures_meeting
  ON zaki_minutes_control_captures (tenant_id, user_id, meeting_id)
  WHERE meeting_id IS NOT NULL;

-- An engine capture can succeed during a transient failure while the Hub is
-- persisting its callback binding. This contains only opaque identifiers so a
-- later signed callback can promote the capture and settle the same hold.
CREATE TABLE IF NOT EXISTS zaki_minutes_control_compensations (
  capture_id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  operation_id TEXT NOT NULL,
  reservation_id UUID NOT NULL REFERENCES zaki_meter_holds(id) ON DELETE RESTRICT,
  meeting_id TEXT,
  stop_state TEXT NOT NULL CHECK (stop_state IN ('stop_pending','stop_requested','stop_uncertain')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id, operation_id)
);
CREATE INDEX IF NOT EXISTS idx_zaki_minutes_control_compensations_subject
  ON zaki_minutes_control_compensations (tenant_id, user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS zaki_minutes_control_callback_events (
  event_id TEXT PRIMARY KEY,
  canonical_event_sha256 TEXT NOT NULL,
  capture_id TEXT NOT NULL REFERENCES zaki_minutes_control_captures(capture_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('minutes.capture.status','minutes.capture.usage')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_zaki_minutes_control_callback_events_capture
  ON zaki_minutes_control_callback_events (capture_id, created_at DESC);

CREATE TABLE IF NOT EXISTS zaki_minutes_control_usage_sequences (
  capture_id TEXT NOT NULL REFERENCES zaki_minutes_control_captures(capture_id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL CHECK (sequence >= 0 AND sequence <= 1000000),
  captured_seconds_total BIGINT NOT NULL CHECK (captured_seconds_total >= 0 AND captured_seconds_total <= 31536000),
  terminal BOOLEAN NOT NULL,
  event_id TEXT NOT NULL REFERENCES zaki_minutes_control_callback_events(event_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (capture_id, sequence)
);

${MINUTES_CONTROL_RECOVERY_DDL}
`;

// The engine's status callbacks are best-effort and at-least-once: an
// intermediate status (notably `joining`) can be dropped or arrive out of
// order. Requiring strictly adjacent transitions stranded a capture at
// `requested` whenever `joining` was lost — every later `awaiting_admission`
// callback was then rejected as invalid_state and the capture failed with zero
// captured seconds. Accept any FORWARD move along the lifecycle (a skipped
// intermediate is always safe) plus `failed` from any non-terminal state;
// reject backward moves and any move out of a terminal state.
const LIFECYCLE_ORDER = ["requested", "joining", "awaiting_admission", "active", "stopping", "completed"];

export class MinutesControlStateError extends Error {
  constructor(message, { code = "invalid_state", status = 409, retryable = false, cause } = {}) {
    super(message, { cause });
    this.name = "MinutesControlStateError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

function rows(result) {
  return Array.isArray(result?.rows) ? result.rows : [];
}

function validSame(left, right) {
  return String(left ?? "") === String(right ?? "");
}

const COMPENSATION_STOP_STATES = new Set(["stop_pending", "stop_requested", "stop_uncertain"]);

function assertedCaptureBinding(capture, data) {
  const subject = data?.subject || {};
  if (
    !capture ||
    !validSame(capture.capture_id, data.capture_id) ||
    !validSame(capture.operation_id, data.operation_id) ||
    !validSame(capture.user_id, subject.user_id) ||
    !validSame(capture.tenant_id, subject.tenant_id)
  ) {
    throw new MinutesControlStateError("Minutes callback identity did not match a capture.");
  }
}

async function bindMeetingId(client, capture, meetingId) {
  if (!meetingId) return capture;
  if (capture.meeting_id && !validSame(capture.meeting_id, meetingId)) {
    throw new MinutesControlStateError("Minutes callback meeting identity changed.");
  }
  if (capture.meeting_id) return capture;
  const result = await client.query(
    `UPDATE zaki_minutes_control_captures
       SET meeting_id = $2, updated_at = NOW()
     WHERE capture_id = $1
     RETURNING *`,
    [capture.capture_id, meetingId]
  );
  return rows(result)[0] || capture;
}

async function bindRecoveryIntentToCapture(client, {
  recoveryIntentId,
  response,
  userId,
  tenantId,
  reservationId,
  recoveryState = "tracking",
  recoveryLeaseOwner,
} = {}) {
  if (!recoveryIntentId) return null;
  const recoveryParams = [recoveryIntentId];
  const recoveryLeaseClause = recoveryLeaseOwner ? " AND lease_owner = $2::uuid" : "";
  if (recoveryLeaseOwner) recoveryParams.push(recoveryLeaseOwner);
  const recovery = rows(await client.query(
    `SELECT * FROM zaki_minutes_control_recoveries WHERE recovery_id = $1${recoveryLeaseClause} FOR UPDATE`,
    recoveryParams
  ))[0];
  if (
    !recovery ||
    !validSame(recovery.user_id, userId) ||
    !validSame(recovery.tenant_id, tenantId) ||
    !validSame(recovery.reservation_id, reservationId) ||
    (recovery.capture_id && !validSame(recovery.capture_id, response.capture_id)) ||
    (recovery.operation_id && !validSame(recovery.operation_id, response.operation_id)) ||
    recovery.state === "terminal" ||
    recovery.state === "blocked"
  ) {
    throw new MinutesControlStateError("Minutes recovery intent conflicted with a capture response.", {
      code: "upstream_unavailable",
      status: 503,
      retryable: true,
    });
  }
  // A browser retry may race a leased reconciler that has already discovered
  // the same idempotent capture and started its stop path. It may verify the
  // binding above, but cannot rewind the worker's state back to `tracking`.
  if (!recoveryLeaseOwner && recovery.capture_id) return recovery;
  const updated = rows(await client.query(
    `UPDATE zaki_minutes_control_recoveries
       SET capture_id = $2,
           operation_id = $3,
           meeting_id = COALESCE(meeting_id, $4),
           state = $5,
           next_attempt_at = NOW() + INTERVAL '1 minute',
           last_error_code = NULL,
           last_error_at = NULL,
           updated_at = NOW()
     WHERE recovery_id = $1
     RETURNING *`,
    [recoveryIntentId, response.capture_id, response.operation_id, response.meeting_id || null, recoveryState]
  ))[0];
  if (!updated) {
    throw new MinutesControlStateError("Minutes recovery intent could not be updated.", {
      code: "upstream_unavailable",
      status: 503,
      retryable: true,
    });
  }
  return updated;
}

async function recordMinutesControlCaptureInTransaction(client, {
  response,
  userId,
  tenantId,
  reservationId,
  recoveryIntentId,
  recoveryState,
  recoveryLeaseOwner,
} = {}) {
  const inserted = await client.query(
    `INSERT INTO zaki_minutes_control_captures
       (capture_id, user_id, tenant_id, operation_id, reservation_id, meeting_id, state)
     VALUES ($1, $2, $3, $4, $5, $6, 'requested')
     ON CONFLICT (capture_id) DO NOTHING
     RETURNING *`,
    [response.capture_id, userId, tenantId, response.operation_id, reservationId, response.meeting_id || null]
  );
  const created = rows(inserted)[0];
  const existing = created || rows(await client.query(
    `SELECT * FROM zaki_minutes_control_captures WHERE capture_id = $1 FOR UPDATE`,
    [response.capture_id]
  ))[0];
  if (
    !existing ||
    !validSame(existing.user_id, userId) ||
    !validSame(existing.tenant_id, tenantId) ||
    !validSame(existing.operation_id, response.operation_id) ||
    !validSame(existing.reservation_id, reservationId)
  ) {
    throw new MinutesControlStateError("Minutes capture replay conflicted with a stored capture.");
  }
  const bound = response.meeting_id ? await bindMeetingId(client, existing, response.meeting_id) : existing;
  await bindRecoveryIntentToCapture(client, {
    recoveryIntentId,
    response,
    userId,
    tenantId,
    reservationId,
    recoveryState,
    recoveryLeaseOwner,
  });
  // A retry may reach normal persistence after the legacy compensation record
  // was written. The recovery intent remains until terminal settlement; only
  // the obsolete one-shot marker can be removed here.
  await client.query(
    `DELETE FROM zaki_minutes_control_compensations WHERE capture_id = $1`,
    [response.capture_id]
  );
  return bound;
}

export async function recordMinutesControlCapture({
  response,
  userId,
  tenantId = "default",
  reservationId,
  recoveryIntentId,
  recoveryState = "tracking",
  recoveryLeaseOwner,
  runInTransaction = defaultWithDbTransaction,
} = {}) {
  if (!response?.capture_id || !response?.operation_id || !reservationId) {
    throw new MinutesControlStateError("Minutes capture response cannot be recorded.", {
      code: "upstream_unavailable",
      status: 503,
      retryable: true,
    });
  }
  return runInTransaction((client) => recordMinutesControlCaptureInTransaction(client, {
    response,
    userId,
    tenantId,
    reservationId,
    recoveryIntentId,
    recoveryState,
    recoveryLeaseOwner,
  }));
}

export async function recordMinutesControlCompensation({
  captureId,
  operationId,
  meetingId,
  reservationId,
  userId,
  tenantId = "default",
  stopState,
  runInTransaction = defaultWithDbTransaction,
} = {}) {
  if (!captureId || !operationId || !reservationId || !userId || !COMPENSATION_STOP_STATES.has(stopState)) {
    throw new MinutesControlStateError("Minutes capture compensation is invalid.", {
      code: "upstream_unavailable",
      status: 503,
      retryable: true,
    });
  }
  return runInTransaction(async (client) => {
    const recorded = rows(await client.query(
      `INSERT INTO zaki_minutes_control_compensations
         (capture_id, user_id, tenant_id, operation_id, reservation_id, meeting_id, stop_state)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (capture_id) DO UPDATE
         SET meeting_id = COALESCE(zaki_minutes_control_compensations.meeting_id, EXCLUDED.meeting_id),
             stop_state = EXCLUDED.stop_state,
             updated_at = NOW()
       WHERE zaki_minutes_control_compensations.user_id = EXCLUDED.user_id
         AND zaki_minutes_control_compensations.tenant_id = EXCLUDED.tenant_id
         AND zaki_minutes_control_compensations.operation_id = EXCLUDED.operation_id
         AND zaki_minutes_control_compensations.reservation_id = EXCLUDED.reservation_id
       RETURNING *`,
      [captureId, userId, tenantId, operationId, reservationId, meetingId || null, stopState]
    ))[0];
    if (!recorded) {
      throw new MinutesControlStateError("Minutes capture compensation conflicted with stored state.", {
        code: "upstream_unavailable",
        status: 503,
        retryable: true,
      });
    }
    return recorded;
  });
}

async function promoteMinutesControlCompensation(client, envelope) {
  const data = envelope.data;
  // Read the legacy marker without a row lock, then acquire the primary
  // capture first. Capture writers use this same order (capture → marker),
  // which avoids a callback/persistence deadlock during the narrow promotion
  // race.
  const candidate = rows(await client.query(
    `SELECT * FROM zaki_minutes_control_compensations WHERE capture_id = $1`,
    [data.capture_id]
  ))[0];
  if (!candidate) return null;
  assertedCaptureBinding(candidate, data);
  if (candidate.meeting_id && data.meeting_id && !validSame(candidate.meeting_id, data.meeting_id)) {
    throw new MinutesControlStateError("Minutes compensation meeting identity changed.");
  }
  const state = envelope.event_type === "minutes.capture.status"
    ? data.state
    : candidate.stop_state === "stop_requested" ? "stopping" : "requested";
  const meetingId = data.meeting_id || candidate.meeting_id || null;
  const inserted = rows(await client.query(
    `INSERT INTO zaki_minutes_control_captures
       (capture_id, user_id, tenant_id, operation_id, reservation_id, meeting_id, state)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (capture_id) DO NOTHING
    RETURNING *`,
    [
      candidate.capture_id,
      candidate.user_id,
      candidate.tenant_id,
      candidate.operation_id,
      candidate.reservation_id,
      meetingId,
      state,
    ]
  ))[0];
  const capture = inserted || rows(await client.query(
    `SELECT * FROM zaki_minutes_control_captures WHERE capture_id = $1 FOR UPDATE`,
    [data.capture_id]
  ))[0];
  assertedCaptureBinding(capture, data);
  const compensation = rows(await client.query(
    `SELECT * FROM zaki_minutes_control_compensations WHERE capture_id = $1 FOR UPDATE`,
    [data.capture_id]
  ))[0];
  if (!compensation) return capture;
  assertedCaptureBinding(compensation, data);
  if (compensation.meeting_id && data.meeting_id && !validSame(compensation.meeting_id, data.meeting_id)) {
    throw new MinutesControlStateError("Minutes compensation meeting identity changed.");
  }
  await client.query(
    `DELETE FROM zaki_minutes_control_compensations WHERE capture_id = $1`,
    [data.capture_id]
  );
  return capture;
}

async function promoteMinutesControlRecovery(client, envelope) {
  const data = envelope.data;
  // Take the primary-capture lock before the recovery lock. This matches
  // post-create persistence and prevents a callback from holding recovery
  // while waiting on an uncommitted capture insert.
  const candidate = await findMinutesControlRecoveryForCallback({
    client,
    captureId: data.capture_id,
    operationId: data.operation_id,
  });
  if (!candidate) return null;
  assertedCaptureBinding(candidate, data);
  if (candidate.meeting_id && data.meeting_id && !validSame(candidate.meeting_id, data.meeting_id)) {
    throw new MinutesControlStateError("Minutes recovery meeting identity changed.");
  }
  const state = envelope.event_type === "minutes.capture.status"
    ? data.state
    : candidate.state === "stop_requested" ? "stopping" : "requested";
  const meetingId = data.meeting_id || candidate.meeting_id || null;
  const inserted = rows(await client.query(
    `INSERT INTO zaki_minutes_control_captures
       (capture_id, user_id, tenant_id, operation_id, reservation_id, meeting_id, state)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (capture_id) DO NOTHING
    RETURNING *`,
    [
      candidate.capture_id,
      candidate.user_id,
      candidate.tenant_id,
      candidate.operation_id,
      candidate.reservation_id,
      meetingId,
      state,
    ]
  ))[0];
  const capture = inserted || rows(await client.query(
    `SELECT * FROM zaki_minutes_control_captures WHERE capture_id = $1 FOR UPDATE`,
    [data.capture_id]
  ))[0];
  assertedCaptureBinding(capture, data);
  const recovery = rows(await client.query(
    `SELECT * FROM zaki_minutes_control_recoveries WHERE recovery_id = $1 FOR UPDATE`,
    [candidate.recovery_id]
  ))[0];
  if (!recovery) {
    throw new MinutesControlStateError("Minutes recovery disappeared during callback promotion.", {
      code: "upstream_unavailable",
      status: 503,
      retryable: true,
    });
  }
  assertedCaptureBinding(recovery, data);
  if (recovery.meeting_id && data.meeting_id && !validSame(recovery.meeting_id, data.meeting_id)) {
    throw new MinutesControlStateError("Minutes recovery meeting identity changed.");
  }
  return capture;
}

function canTransition(from, to) {
  if (from === to) return true;
  if (to === "failed") return from !== "completed" && from !== "failed";
  const fromIndex = LIFECYCLE_ORDER.indexOf(from);
  const toIndex = LIFECYCLE_ORDER.indexOf(to);
  return fromIndex >= 0 && toIndex > fromIndex;
}

async function applyStatusCallback(client, capture, data) {
  const bound = await bindMeetingId(client, capture, data.meeting_id);
  if (bound.state === data.state) return { capture: bound, applied: false };
  if (!canTransition(bound.state, data.state)) {
    throw new MinutesControlStateError("Minutes callback made an invalid lifecycle transition.");
  }
  const updated = await client.query(
    `UPDATE zaki_minutes_control_captures
       SET state = $2, failure_code = $3, updated_at = NOW()
     WHERE capture_id = $1
     RETURNING *`,
    [bound.capture_id, data.state, data.failure_code || null]
  );
  return { capture: rows(updated)[0] || bound, applied: true };
}

async function applyUsageCallback(client, capture, data, settleCapture) {
  const metering = data.metering;
  const bound = await bindMeetingId(client, capture, data.meeting_id);
  if (!validSame(bound.reservation_id, metering.reservation_id)) {
    throw new MinutesControlStateError("Minutes callback reservation identity changed.");
  }

  const priorAtSequence = rows(await client.query(
    `SELECT * FROM zaki_minutes_control_usage_sequences
      WHERE capture_id = $1 AND sequence = $2
      FOR UPDATE`,
    [bound.capture_id, metering.sequence]
  ))[0];
  if (priorAtSequence) {
    if (
      Number(priorAtSequence.captured_seconds_total) !== metering.captured_seconds_total ||
      Boolean(priorAtSequence.terminal) !== metering.terminal
    ) {
      throw new MinutesControlStateError("Minutes callback reused a usage sequence with different values.");
    }
    return { capture: bound, applied: false };
  }

  // Once the first terminal usage has settled, later callbacks remain auditable
  // through the event table but intentionally have no state or wallet effect.
  if (bound.usage_terminal === true) return { capture: bound, applied: false };

  if (metering.sequence < Number(bound.usage_sequence)) {
    if (metering.captured_seconds_total > Number(bound.captured_seconds_total)) {
      throw new MinutesControlStateError("Minutes callback regressed its sequence while increasing usage.");
    }
    return { capture: bound, applied: false };
  }
  if (metering.captured_seconds_total < Number(bound.captured_seconds_total)) {
    throw new MinutesControlStateError("Minutes callback decreased cumulative usage.");
  }

  await client.query(
    `INSERT INTO zaki_minutes_control_usage_sequences
       (capture_id, sequence, captured_seconds_total, terminal, event_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [bound.capture_id, metering.sequence, metering.captured_seconds_total, metering.terminal, data.__eventId]
  );
  const updated = rows(await client.query(
    `UPDATE zaki_minutes_control_captures
       SET usage_sequence = $2,
           captured_seconds_total = $3,
           usage_terminal = $4,
           updated_at = NOW()
     WHERE capture_id = $1
     RETURNING *`,
    [bound.capture_id, metering.sequence, metering.captured_seconds_total, metering.terminal]
  ))[0] || bound;

  if (metering.terminal) {
    await settleCapture({
      holdId: updated.reservation_id,
      idempotencyKey: data.__eventId,
      capturedSecondsTotal: metering.captured_seconds_total,
      client,
    });
    await markMinutesControlRecoveryCallback({
      client,
      captureId: updated.capture_id,
      terminal: true,
      capturedSecondsTotal: metering.captured_seconds_total,
    });
  }
  return { capture: updated, applied: true };
}

export async function applyMinutesControlCallback({
  envelope,
  runInTransaction = defaultWithDbTransaction,
  settleCapture = defaultSettleMinutesCapture,
} = {}) {
  if (!envelope?.event_id || !envelope?.event_type || !envelope?.data) {
    throw new MinutesControlStateError("Minutes callback is invalid.", {
      code: "invalid_request",
      status: 400,
      retryable: false,
    });
  }
  const fingerprint = minutesControlPayloadFingerprint(envelope);
  return runInTransaction(async (client) => {
    let capture = rows(await client.query(
      `SELECT * FROM zaki_minutes_control_captures WHERE capture_id = $1 FOR UPDATE`,
      [envelope.data.capture_id]
    ))[0];
    if (!capture) {
      capture = await promoteMinutesControlCompensation(client, envelope);
      if (!capture) capture = await promoteMinutesControlRecovery(client, envelope);
      if (!capture) {
        // The engine may beat the capture-response persistence by a few milliseconds.
        // No event is recorded in this transaction, so a normal engine retry can apply it.
        throw new MinutesControlStateError("Minutes callback capture is not ready.", {
          code: "upstream_unavailable",
          status: 503,
          retryable: true,
        });
      }
    }
    assertedCaptureBinding(capture, envelope.data);
    const eventInsert = await client.query(
      `INSERT INTO zaki_minutes_control_callback_events
         (event_id, canonical_event_sha256, capture_id, event_type)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`,
      [envelope.event_id, fingerprint, envelope.data.capture_id, envelope.event_type]
    );
    if (!rows(eventInsert)[0]) {
      const prior = rows(await client.query(
        `SELECT canonical_event_sha256 FROM zaki_minutes_control_callback_events WHERE event_id = $1`,
        [envelope.event_id]
      ))[0];
      if (!prior || !validSame(prior.canonical_event_sha256, fingerprint)) {
        throw new MinutesControlStateError("Minutes callback event identity was reused with a different payload.");
      }
      return { status: "duplicate", eventId: envelope.event_id };
    }
    const data = { ...envelope.data, __eventId: envelope.event_id };
    if (envelope.event_type === "minutes.capture.status") {
      await applyStatusCallback(client, capture, data);
    } else if (envelope.event_type === "minutes.capture.usage") {
      await applyUsageCallback(client, capture, data, settleCapture);
    } else {
      throw new MinutesControlStateError("Minutes callback event type is invalid.", {
        code: "invalid_request",
        status: 400,
      });
    }
    return { status: "accepted", eventId: envelope.event_id };
  });
}

// The engine's status endpoint is the fallback when a signed terminal callback
// is delayed or lost.  Its response is authenticated and contract-validated by
// the caller; this transaction then settles the same hold and terminalizes the
// durable recovery record together.  A later callback is still recorded, but
// cannot charge twice because `usage_terminal` is already true.
export async function settleRecoveredMinutesControlCapture({
  recoveryId,
  leaseOwner,
  response,
  settleCapture = defaultSettleMinutesCapture,
  runInTransaction = defaultWithDbTransaction,
} = {}) {
  if (!recoveryId || !leaseOwner || !response?.capture_id || !response?.metering?.terminal) {
    throw new MinutesControlStateError("Minutes recovered terminal state is invalid.", {
      code: "upstream_unavailable",
      status: 503,
      retryable: true,
    });
  }
  return runInTransaction(async (client) => {
    // Keep the capture → recovery lock order used by callback handling and
    // capture recording. A terminal callback can then settle concurrently
    // without taking the two durable rows in reverse order.
    const capture = rows(await client.query(
      `SELECT * FROM zaki_minutes_control_captures WHERE capture_id = $1 FOR UPDATE`,
      [response.capture_id]
    ))[0];
    const recovery = rows(await client.query(
      `SELECT * FROM zaki_minutes_control_recoveries
        WHERE recovery_id = $1 AND lease_owner = $2::uuid
        FOR UPDATE`,
      [recoveryId, leaseOwner]
    ))[0];
    if (
      !recovery ||
      !validSame(recovery.capture_id, response.capture_id) ||
      !validSame(recovery.reservation_id, response.metering.reservation_id) ||
      recovery.state === "terminal"
    ) {
      throw new MinutesControlStateError("Minutes recovery lease was lost before terminal settlement.", {
        code: "upstream_unavailable",
        status: 503,
        retryable: true,
      });
    }
    if (
      !capture ||
      !validSame(capture.user_id, recovery.user_id) ||
      !validSame(capture.tenant_id, recovery.tenant_id) ||
      !validSame(capture.reservation_id, recovery.reservation_id)
    ) {
      throw new MinutesControlStateError("Minutes recovery terminal capture is not bound locally.", {
        code: "upstream_unavailable",
        status: 503,
        retryable: true,
      });
    }
    if (capture.usage_terminal !== true) {
      const updated = rows(await client.query(
        `UPDATE zaki_minutes_control_captures
           SET state = $2,
               failure_code = $3,
               captured_seconds_total = $4,
               usage_terminal = TRUE,
               updated_at = NOW()
         WHERE capture_id = $1
         RETURNING *`,
        [
          capture.capture_id,
          response.state,
          response.failure_code || null,
          response.metering.captured_seconds_total,
        ]
      ))[0] || capture;
      await settleCapture({
        holdId: updated.reservation_id,
        idempotencyKey: `recovery-${recovery.recovery_id}`,
        capturedSecondsTotal: response.metering.captured_seconds_total,
        client,
      });
    }
    const terminal = rows(await client.query(
      `UPDATE zaki_minutes_control_recoveries
         SET state = 'terminal',
             terminal_captured_seconds = $2,
             terminal_at = COALESCE(terminal_at, NOW()),
             lease_owner = NULL,
             lease_expires_at = NULL,
             last_error_code = NULL,
             last_error_at = NULL,
             updated_at = NOW()
       WHERE recovery_id = $1 AND lease_owner = $3::uuid
       RETURNING *`,
      [recovery.recovery_id, response.metering.captured_seconds_total, leaseOwner]
    ))[0];
    if (!terminal) {
      throw new MinutesControlStateError("Minutes recovery terminal receipt was lost.", {
        code: "upstream_unavailable",
        status: 503,
        retryable: true,
      });
    }
    return terminal;
  });
}

export async function forgetMinutesControlMeeting({ userId, tenantId = "default", meetingId, dbQuery = defaultDbQuery } = {}) {
  if (!userId || !meetingId) return { rowCount: 0 };
  await dbQuery(
    `DELETE FROM zaki_minutes_control_recoveries AS recovery
      WHERE recovery.user_id = $1
        AND recovery.tenant_id = $2
        AND (
          recovery.meeting_id = $3 OR
          EXISTS (
            SELECT 1 FROM zaki_minutes_control_captures AS capture
             WHERE capture.capture_id = recovery.capture_id
               AND capture.user_id = $1
               AND capture.tenant_id = $2
               AND capture.meeting_id = $3
          )
        )`,
    [userId, tenantId, meetingId]
  );
  const result = await dbQuery(
    `DELETE FROM zaki_minutes_control_captures
      WHERE user_id = $1 AND tenant_id = $2 AND meeting_id = $3`,
    [userId, tenantId, meetingId]
  );
  await dbQuery(
    `DELETE FROM zaki_minutes_control_compensations
      WHERE user_id = $1 AND tenant_id = $2 AND meeting_id = $3`,
    [userId, tenantId, meetingId]
  );
  return result;
}

export async function hasMinutesControlAccountState({ userId, tenantId = "default", dbQuery = defaultDbQuery } = {}) {
  if (!userId) return false;
  const result = await dbQuery(
    `SELECT EXISTS (
       SELECT 1 FROM zaki_minutes_control_captures WHERE user_id = $1 AND tenant_id = $2
       UNION ALL
       SELECT 1 FROM zaki_minutes_control_compensations WHERE user_id = $1 AND tenant_id = $2
       UNION ALL
       SELECT 1 FROM zaki_minutes_control_recoveries WHERE user_id = $1 AND tenant_id = $2
     ) AS has_minutes_control_state`,
    [userId, tenantId]
  );
  return Boolean(rows(result)[0]?.has_minutes_control_state);
}
