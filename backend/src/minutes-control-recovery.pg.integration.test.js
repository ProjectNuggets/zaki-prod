// Gated on LEDGER_TEST_DATABASE_URL so the normal `npm test` skips it (CI's
// backend-pg-integration lane sets it). These statements broke live with
// 42P08 ambiguous_parameter: node-postgres speaks the extended protocol, and a
// parameter whose ONLY uses are un-typed positions (a bare boolean in CASE
// WHEN, a null-or-equality guard) gives Postgres nothing to infer from. The
// fakes-based suites are structurally blind to preparation, so this suite runs
// each recovery statement shape against REAL Postgres with the exact
// null/boolean parameter patterns the live capture path produced.
//
// The table mirrors MINUTES_CONTROL_RECOVERY_DDL's column names/types minus
// the zaki_users / zaki_meter_holds foreign keys (type inference — the class
// under test — does not depend on FK enforcement).
import { describe, it, expect, beforeAll, beforeEach } from "@jest/globals";
import { randomUUID } from "node:crypto";
import pg from "pg";

const RUN = process.env.LEDGER_TEST_DATABASE_URL;
const d = RUN ? describe : describe.skip;

let pool;
let recovery;
const dbQuery = (sql, params) => pool.query(sql, params);

beforeAll(async () => {
  if (!RUN) return;
  pool = new pg.Pool({ connectionString: RUN });
  recovery = await import("./minutes-control-recovery.js");
  // This suite owns the table: the app's real DDL (which the pg lane may have
  // applied first) carries NOT NULLs and FKs irrelevant to the class under
  // test (extended-protocol type inference), so recreate the FK-less mirror.
  await pool.query(`DROP TABLE IF EXISTS zaki_minutes_control_recoveries CASCADE`);
  await pool.query(`
    CREATE TABLE zaki_minutes_control_recoveries (
      recovery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id BIGINT NOT NULL,
      tenant_id TEXT NOT NULL DEFAULT 'default',
      idempotency_key TEXT NOT NULL,
      request_id TEXT NOT NULL,
      request_sha256 TEXT NOT NULL,
      reservation_id UUID NOT NULL,
      request_ciphertext BYTEA NOT NULL,
      request_iv BYTEA NOT NULL,
      request_tag BYTEA NOT NULL,
      state TEXT NOT NULL DEFAULT 'prepared',
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
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
});

beforeEach(async () => {
  if (!RUN) return;
  await pool.query(`DELETE FROM zaki_minutes_control_recoveries WHERE tenant_id = 'itest'`);
});

async function seed({ state, captureId = null, operationId = null }) {
  const recoveryId = randomUUID();
  const reservationId = randomUUID();
  await pool.query(
    `INSERT INTO zaki_minutes_control_recoveries
       (recovery_id, user_id, tenant_id, idempotency_key, request_id, request_sha256, reservation_id,
        request_ciphertext, request_iv, request_tag, state, capture_id, operation_id,
        next_attempt_at)
     VALUES ($1, 1, 'itest', $2, $3, $4, $5, '\\x00', '\\x00', '\\x00', $6, $7, $8, NOW() - INTERVAL '1 second')`,
    [recoveryId, `idem-${recoveryId}`, `req-${recoveryId}`, "a".repeat(64), reservationId, state, captureId, operationId]
  );
  return { recoveryId, reservationId };
}

d("minutes-control recovery SQL prepares cleanly on real Postgres", () => {
  it("pre-spawn outcome with a NULL error code (the live create_uncertain shape)", async () => {
    const { recoveryId } = await seed({ state: "prepared" });
    await expect(
      recovery.markMinutesControlRecoveryPreSpawnOutcome({
        recoveryId,
        state: "create_uncertain",
        retryAfterMs: 0,
        errorCode: null,
        dbQuery,
      })
    ).resolves.toBeTruthy();
    const check = await pool.query(
      `SELECT state, last_error_at FROM zaki_minutes_control_recoveries WHERE recovery_id = $1`,
      [recoveryId]
    );
    expect(check.rows[0].state).toBe("create_uncertain");
    expect(check.rows[0].last_error_at).toBeNull();
  });

  it("capture binding with fresh ids (null-or-equality guards)", async () => {
    const { recoveryId, reservationId } = await seed({ state: "prepared" });
    await expect(
      recovery.markMinutesControlRecoveryCapture({
        recoveryId,
        userId: 1,
        tenantId: "itest",
        reservationId,
        captureId: "capture-itest-1",
        operationId: "op-itest-1",
        meetingId: null,
        state: "tracking",
        retryAfterMs: 0,
        dbQuery,
      })
    ).resolves.toBeTruthy();
  });

  it("reschedule to terminal with null seconds and a bare boolean terminal flag", async () => {
    const { recoveryId } = await seed({
      state: "tracking",
      captureId: "capture-itest-2",
      operationId: "op-itest-2",
    });
    const leaseOwner = randomUUID();
    const claimed = await recovery.claimMinutesControlRecoveries({ leaseOwner, limit: 25, dbQuery });
    expect((claimed || []).some((r) => r.recovery_id === recoveryId)).toBe(true);
    await expect(
      recovery.rescheduleMinutesControlRecovery({
        recoveryId,
        leaseOwner,
        state: "terminal",
        retryAfterMs: 0,
        errorCode: null,
        terminalCapturedSeconds: null,
        dbQuery,
      })
    ).resolves.toBeTruthy();
  });

  it("callback correlation lookup by capture OR operation id", async () => {
    const { recoveryId } = await seed({
      state: "tracking",
      captureId: "capture-itest-3",
      operationId: "op-itest-3",
    });
    const found = await recovery.findMinutesControlRecoveryForCallback({
      client: pool,
      captureId: "capture-itest-3",
      operationId: "op-itest-3",
    });
    expect(found?.recovery_id).toBe(recoveryId);
  });
});
