import { dbQuery as defaultDbQuery, withDbTransaction as defaultWithDbTransaction } from "./db.js";
import { minutesControlPayloadFingerprint } from "./minutes-control-contract.js";
import { settleMinutesCapture as defaultSettleMinutesCapture } from "./minutes-control-metering.js";

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
`;

const TRANSITIONS = new Map([
  ["requested", new Set(["joining", "failed"])],
  ["joining", new Set(["awaiting_admission", "active", "failed"])],
  ["awaiting_admission", new Set(["active", "failed"])],
  ["active", new Set(["stopping", "completed", "failed"])],
  ["stopping", new Set(["completed", "failed"])],
  ["completed", new Set()],
  ["failed", new Set()],
]);

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

export async function recordMinutesControlCapture({
  response,
  userId,
  tenantId = "default",
  reservationId,
  runInTransaction = defaultWithDbTransaction,
} = {}) {
  if (!response?.capture_id || !response?.operation_id || !reservationId) {
    throw new MinutesControlStateError("Minutes capture response cannot be recorded.", {
      code: "upstream_unavailable",
      status: 503,
      retryable: true,
    });
  }
  return runInTransaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO zaki_minutes_control_captures
         (capture_id, user_id, tenant_id, operation_id, reservation_id, meeting_id, state)
       VALUES ($1, $2, $3, $4, $5, $6, 'requested')
       ON CONFLICT (capture_id) DO NOTHING
       RETURNING *`,
      [response.capture_id, userId, tenantId, response.operation_id, reservationId, response.meeting_id || null]
    );
    const created = rows(inserted)[0];
    if (created) return created;
    const existing = rows(await client.query(
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
    if (response.meeting_id) return bindMeetingId(client, existing, response.meeting_id);
    return existing;
  });
}

function canTransition(from, to) {
  return from === to || Boolean(TRANSITIONS.get(from)?.has(to));
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
  if (Boolean(bound.usage_terminal)) return { capture: bound, applied: false };

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
    const capture = rows(await client.query(
      `SELECT * FROM zaki_minutes_control_captures WHERE capture_id = $1 FOR UPDATE`,
      [envelope.data.capture_id]
    ))[0];
    if (!capture) {
      // The engine may beat the capture-response persistence by a few milliseconds.
      // No event is recorded in this transaction, so a normal engine retry can apply it.
      throw new MinutesControlStateError("Minutes callback capture is not ready.", {
        code: "upstream_unavailable",
        status: 503,
        retryable: true,
      });
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

export async function forgetMinutesControlMeeting({ userId, tenantId = "default", meetingId, dbQuery = defaultDbQuery } = {}) {
  if (!userId || !meetingId) return { rowCount: 0 };
  return dbQuery(
    `DELETE FROM zaki_minutes_control_captures
      WHERE user_id = $1 AND tenant_id = $2 AND meeting_id = $3`,
    [userId, tenantId, meetingId]
  );
}
