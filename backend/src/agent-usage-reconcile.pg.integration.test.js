// REAL-Postgres schema-contract guard for the daemon reconciliation sweep.
//
// WHY THIS EXISTS: the sweep reads/writes the ENGINE-owned table zaki_bot.turn_usage, whose
// migration-0004 schema lives in a DIFFERENT repo (the nullALIS engine). That table has NO
// surrogate id/PK — row identity is the composite UNIQUE(user_id, turn_key). The unit-mock
// (agent-usage-reconcile.test.js) cannot catch a column-name mismatch because it matches on a
// table-name regex; an earlier `SELECT id, ...` / `WHERE id = $1` therefore passed the mock but
// threw `column "id" does not exist` against REAL Postgres on every run — the feature was inert.
//
// This test creates the table with the EXACT migration-0004 column set and runs the REAL queries
// against it, so the cross-repo schema contract can't silently drift again. It deliberately does
// NOT create a surrogate id: if the sweep ever re-introduces an `id` reference it will throw here.
//
// Gated on LEDGER_TEST_DATABASE_URL so the normal `npm test` skips it. Run via:
//   bash scripts/ledger-pg-it.sh        (spins an ephemeral pgvector container)
import { describe, it, expect, beforeAll, beforeEach } from "@jest/globals";

const RUN = process.env.LEDGER_TEST_DATABASE_URL;
const d = RUN ? describe : describe.skip;

// Mirror of the engine's migration-0004 zaki_bot.turn_usage DDL (copied — the BFF must NOT own or
// alter the engine migration). Column set: user_id, session_key, turn_key, entry_kind, turn_origin,
// model, input_tokens, output_tokens, cost_usd, cost_available, created_at, reconciled_at;
// row identity is UNIQUE(user_id, turn_key). NO id/serial/PK.
const TURN_USAGE_DDL = `
  CREATE SCHEMA IF NOT EXISTS zaki_bot;
  CREATE TABLE IF NOT EXISTS zaki_bot.turn_usage (
    user_id        BIGINT       NOT NULL,
    session_key    TEXT,
    turn_key       TEXT         NOT NULL,
    entry_kind     TEXT         NOT NULL,
    turn_origin    TEXT,
    model          TEXT,
    input_tokens   INTEGER,
    output_tokens  INTEGER,
    cost_usd       DOUBLE PRECISION,
    cost_available BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    reconciled_at  TIMESTAMPTZ,
    UNIQUE (user_id, turn_key)
  );
`;

d("agent-usage-reconcile — REAL Postgres schema contract (zaki_bot.turn_usage, no id/PK)", () => {
  let dbQuery, dbGet, reserveUnits, settleHold, ensureWallet;
  let recordUsageEvent, deterministicGrantId, reconcileDaemonTurnUsage;
  let userId;

  beforeAll(async () => {
    process.env.DATABASE_URL = RUN;
    delete process.env.PGSSLMODE;
    process.env.NODE_ENV = "test";
    const db = await import("./db.js");
    const ledger = await import("./unit-ledger.js");
    const usage = await import("./usage-events.js");
    const chatMeter = await import("./chat-meter.js");
    const reconcile = await import("./agent-usage-reconcile.js");
    ({ dbQuery, dbGet } = db);
    ({ reserveUnits, settleHold, ensureWallet } = ledger);
    ({ recordUsageEvent } = usage);
    ({ deterministicGrantId } = chatMeter);
    ({ reconcileDaemonTurnUsage } = reconcile);

    await db.initDb(); // BFF schema (wallets, holds, usage events, users)
    await dbQuery(TURN_USAGE_DDL); // engine-owned table — created here for the cross-repo contract

    const u = await dbGet(
      `INSERT INTO zaki_users (email, password_hash, created_at, updated_at)
       VALUES ($1, 'x', NOW(), NOW()) RETURNING id`,
      [`reconcile+${Date.now()}@test.local`]
    );
    userId = Number(u.id);
  });

  beforeEach(async () => {
    await dbQuery(`DELETE FROM zaki_bot.turn_usage WHERE user_id = $1`, [userId]);
    await dbQuery(`DELETE FROM zaki_meter_holds WHERE user_id = $1`, [userId]);
    await dbQuery(`DELETE FROM zaki_unit_wallets WHERE user_id = $1`, [userId]);
    // Fund the wallet generously so the happy-path debit succeeds (no overdraw branch).
    await dbQuery(
      `INSERT INTO zaki_unit_wallets (user_id, plan_id, weekly_allowance_units, weekly_used_units, burst_allowance_units, burst_window_hours, topup_units)
       VALUES ($1,'personal',1000,0,1000,5,0)
       ON CONFLICT (user_id) DO UPDATE SET weekly_allowance_units = 1000, weekly_used_units = 0, burst_allowance_units = 1000, topup_units = 0`,
      [userId]
    );
  });

  const deps = () => ({
    dbQuery,
    dbGet,
    reserveUnits,
    settleHold,
    ensureWallet,
    recordUsageEvent,
    deterministicGrantId,
    logStructured: () => {},
    env: {},
  });

  const insertTurn = (turnKey, entryKind, over = {}) =>
    dbQuery(
      `INSERT INTO zaki_bot.turn_usage
         (user_id, session_key, turn_key, entry_kind, turn_origin, model,
          input_tokens, output_tokens, cost_usd, cost_available, created_at, reconciled_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now(), $11)`,
      [
        userId,
        over.session_key ?? `sess-${turnKey}`,
        turnKey,
        entryKind,
        over.turn_origin ?? "agent_cron_turn",
        over.model ?? "kimi-k2.6",
        over.input_tokens ?? 100,
        over.output_tokens ?? 50,
        over.cost_usd ?? 0.0015, // 0.0015 / 0.0015 = 1 unit
        over.cost_available ?? true,
        over.reconciled_at ?? null,
      ]
    );

  const getTurn = (turnKey) =>
    dbGet(`SELECT * FROM zaki_bot.turn_usage WHERE user_id = $1 AND turn_key = $2`, [userId, turnKey]);

  it("runs the REAL sweep against the REAL schema: daemon row reconciled, http untouched, re-run no-op", async () => {
    await insertTurn("daemon-it-1", "daemon");
    await insertTurn("http-it-1", "http");

    // 1) First sweep — exercises the REAL SELECT (no `id` column) + REAL composite-key UPDATE.
    const r1 = await reconcileDaemonTurnUsage(deps());
    expect(r1.scanned).toBe(1); // only the daemon row is selected
    expect(r1.debited).toBe(1);
    expect(r1.replayed).toBe(0);
    expect(r1.failed).toBe(0);

    // daemon row got the cursor set
    const daemonAfter = await getTurn("daemon-it-1");
    expect(daemonAfter.reconciled_at).not.toBeNull();

    // http row NEVER selected or touched
    const httpAfter = await getTurn("http-it-1");
    expect(httpAfter.reconciled_at).toBeNull();

    // a real wallet debit landed (real-cost = 1 unit)
    const w = await dbGet(`SELECT weekly_used_units FROM zaki_unit_wallets WHERE user_id = $1`, [userId]);
    expect(Number(w.weekly_used_units)).toBe(1);

    // 2) Second sweep — the cursor (reconciled_at IS NULL filter) makes it a no-op: no re-debit.
    const r2 = await reconcileDaemonTurnUsage(deps());
    expect(r2.scanned).toBe(0);
    expect(r2.debited).toBe(0);
    const w2 = await dbGet(`SELECT weekly_used_units FROM zaki_unit_wallets WHERE user_id = $1`, [userId]);
    expect(Number(w2.weekly_used_units)).toBe(1); // unchanged — no double-debit
  });
});
