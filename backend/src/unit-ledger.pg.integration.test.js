// REAL-Postgres integration test for the unit ledger — proves what a fake client cannot:
// FOR UPDATE serialization (no over-grant / no double-debit under concurrency) and the sweeper.
//
// Gated on LEDGER_TEST_DATABASE_URL so the normal `npm test` skips it. Run via:
//   bash scripts/ledger-pg-it.sh        (spins an ephemeral pgvector container)
import { describe, it, expect, beforeAll, beforeEach } from "@jest/globals";

const RUN = process.env.LEDGER_TEST_DATABASE_URL;
const d = RUN ? describe : describe.skip;

d("unit-ledger — real Postgres concurrency, idempotency, sweeper", () => {
  let dbQuery, dbGet, dbAll, reserveUnits, settleHold, sweepExpiredHolds, ensureWallet;
  let userId;
  const future = new Date(Date.now() + 3600_000).toISOString();
  const past = new Date(Date.now() - 3600_000).toISOString();

  beforeAll(async () => {
    process.env.DATABASE_URL = RUN;
    delete process.env.PGSSLMODE;
    process.env.NODE_ENV = "test";
    const db = await import("./db.js");
    const ledger = await import("./unit-ledger.js");
    ({ dbQuery, dbGet, dbAll } = db);
    ({ reserveUnits, settleHold, sweepExpiredHolds, ensureWallet } = ledger);
    await db.initDb();
    const u = await dbGet(
      `INSERT INTO zaki_users (email, password_hash, created_at, updated_at)
       VALUES ($1, 'x', NOW(), NOW()) RETURNING id`,
      [`ledger+${Date.now()}@test.local`]
    );
    userId = Number(u.id);
  });

  async function setWallet({ weekly = 0, used = 0, burst = 1_000_000, topup = 0 }) {
    await dbQuery(`DELETE FROM zaki_meter_holds WHERE user_id = $1`, [userId]);
    await dbQuery(
      `INSERT INTO zaki_unit_wallets (user_id, plan_id, weekly_allowance_units, weekly_used_units, burst_allowance_units, burst_window_hours, topup_units)
       VALUES ($1,'personal',$2,$3,$4,5,$5)
       ON CONFLICT (user_id) DO UPDATE SET
         weekly_allowance_units = EXCLUDED.weekly_allowance_units,
         weekly_used_units = EXCLUDED.weekly_used_units,
         burst_allowance_units = EXCLUDED.burst_allowance_units,
         topup_units = EXCLUDED.topup_units`,
      [userId, weekly, used, burst, topup]
    );
  }
  const getWallet = () => dbGet(`SELECT * FROM zaki_unit_wallets WHERE user_id = $1`, [userId]);
  const reserve = (over) =>
    reserveUnits({ userId, grantId: over.grantId, productId: "agent", action: "a", reservedUnits: over.units, reserveIdempotencyKey: over.key, expiresAt: over.expiresAt ?? future });

  it("two concurrent reserves with the SAME key debit EXACTLY once", async () => {
    await setWallet({ weekly: 100, used: 0 });
    const a = { grantId: "11111111-1111-1111-1111-111111111111", units: 10, key: "same" };
    const [r1, r2] = await Promise.all([reserve(a), reserve(a)]);
    expect(r1.ok && r2.ok).toBe(true);
    expect(r1.idempotent || r2.idempotent).toBe(true); // exactly one was the idempotent echo
    const holds = await dbAll(`SELECT * FROM zaki_meter_holds WHERE user_id = $1`, [userId]);
    expect(holds.length).toBe(1); // only one hold created
    expect(Number((await getWallet()).weekly_used_units)).toBe(10); // debited once, not twice
  });

  it("N concurrent reserves with DIFFERENT keys NEVER over-grant beyond allowance", async () => {
    await setWallet({ weekly: 30, used: 0 }); // exactly 6 × 5 fit
    const calls = Array.from({ length: 12 }, (_, i) =>
      reserve({ grantId: `22222222-2222-2222-2222-0000000000${(10 + i)}`, units: 5, key: `k${i}` })
    );
    const results = await Promise.all(calls);
    const created = results.filter((r) => r.ok && !r.idempotent).length;
    const used = Number((await getWallet()).weekly_used_units);
    expect(used).toBeLessThanOrEqual(30); // the invariant: never debit past the allowance
    expect(used).toBe(created * 5);
    expect(created).toBe(6);
  });

  // C1 money-exploit proof (real Postgres): replaying a reserve key AFTER its hold is TERMINAL must be
  // REFUSED (idempotency_replayed) — it must NOT echo a reusable reserve (which the BFF maps to
  // allowed+null-hold → a FREE, UNMETERED engine turn). And it must NOT re-debit (already settled once).
  it("a reserve key replayed after SETTLE is refused (no free turn, no re-debit) — C1", async () => {
    await setWallet({ weekly: 100, used: 0 });
    const key = "c1-replay";
    const grantId = "c1111111-1111-1111-1111-111111111111";
    const r1 = await reserve({ grantId, units: 10, key });
    expect(r1.ok && !r1.idempotent).toBe(true);
    expect(Number((await getWallet()).weekly_used_units)).toBe(10);

    // Settle the real cost (4) → hold is now terminal (state='settled'), wallet shows 4 used.
    await settleHold({ holdId: r1.hold.id, settleIdempotencyKey: `${key}:settle`, settledUnits: 4 });
    expect(Number((await getWallet()).weekly_used_units)).toBe(4);

    // Replay the SAME key (the exploit: x-request-id reused for a brand-new, distinct turn).
    const replay = await reserve({ grantId, units: 10, key });
    expect(replay).toMatchObject({ ok: false, reason: "idempotency_replayed" });
    expect(replay.idempotent).not.toBe(true);
    expect(Number((await getWallet()).weekly_used_units)).toBe(4); // unchanged — not re-debited, not freed
    const holds = await dbAll(`SELECT * FROM zaki_meter_holds WHERE user_id = $1`, [userId]);
    expect(holds.length).toBe(1); // no new hold materialized for the replay
  });

  // Same proof for a RELEASED (error-turn) hold: still terminal → replay refused.
  it("a reserve key replayed after RELEASE is refused — C1", async () => {
    await setWallet({ weekly: 100, used: 0 });
    const key = "c1-replay-rel";
    const grantId = "c2222222-2222-2222-2222-222222222222";
    const r1 = await reserve({ grantId, units: 10, key });
    await settleHold({ holdId: r1.hold.id, settleIdempotencyKey: `${key}:settle`, settledUnits: 0, finalState: "released" });
    expect(Number((await getWallet()).weekly_used_units)).toBe(0);
    const replay = await reserve({ grantId, units: 10, key });
    expect(replay).toMatchObject({ ok: false, reason: "idempotency_replayed" });
  });

  it("reserve → settle refunds the unused portion (real round-trip)", async () => {
    await setWallet({ weekly: 100, used: 0 });
    const r = await reserve({ grantId: "33333333-3333-3333-3333-333333333333", units: 10, key: "rt" });
    expect(Number((await getWallet()).weekly_used_units)).toBe(10);
    const s = await settleHold({ holdId: r.hold.id, settleIdempotencyKey: "rt:receipt", settledUnits: 4 });
    expect(s.ok).toBe(true);
    expect(Number((await getWallet()).weekly_used_units)).toBe(4); // 6 refunded
  });

  it("sweeper releases an expired reserved hold with a FULL refund", async () => {
    await setWallet({ weekly: 100, used: 0 });
    const r = await reserve({ grantId: "44444444-4444-4444-4444-444444444444", units: 20, key: "exp", expiresAt: past });
    expect(Number((await getWallet()).weekly_used_units)).toBe(20);
    const released = await sweepExpiredHolds();
    expect(released).toBeGreaterThanOrEqual(1);
    expect(Number((await getWallet()).weekly_used_units)).toBe(0); // fully refunded
    const hold = await dbGet(`SELECT state FROM zaki_meter_holds WHERE id = $1`, [r.hold.id]);
    expect(hold.state).toBe("expired");
  });

  it("FULL metering loop: provision → reserve → settle → drain → deny (the H-02 proof)", async () => {
    await dbQuery(`DELETE FROM zaki_meter_holds WHERE user_id = $1`, [userId]);
    await dbQuery(`DELETE FROM zaki_unit_wallets WHERE user_id = $1`, [userId]);

    // 1) Provision from the 'personal' plan → weekly 1000, burst (5h) 200.
    // (mirrors platform-policy.js DEFAULT_WEEKLY_ALLOWANCE_UNITS.personal / DEFAULT_ROLLING_ALLOWANCE_UNITS.personal —
    //  if those change, update this test too; the pg.integration CI job will now catch drift.)
    await ensureWallet({ userId, planId: "personal", env: {} });
    const w0 = await getWallet();
    expect(Number(w0.weekly_allowance_units)).toBe(1000);
    expect(Number(w0.burst_allowance_units)).toBe(200);

    // 2) Reserve 30, settle the real cost (12) → wallet shows 12 used (18 refunded).
    const r1 = await reserve({ grantId: "55555555-5555-5555-5555-555555555555", units: 30, key: "loop1" });
    expect(Number((await getWallet()).weekly_used_units)).toBe(30);
    await settleHold({ holdId: r1.hold.id, settleIdempotencyKey: "loop1:receipt", settledUnits: 12 });
    expect(Number((await getWallet()).weekly_used_units)).toBe(12);

    // 3) Drain the burst window: 12 (settled) + 188 (reserved) = 200 = the 5h cap.
    const r2 = await reserve({ grantId: "66666666-6666-6666-6666-666666666666", units: 188, key: "loop2" });
    expect(r2.ok).toBe(true);

    // 4) Next request is DENIED by the burst gate (even though weekly has 800 left).
    const r3 = await reserve({ grantId: "77777777-7777-7777-7777-777777777777", units: 1, key: "loop3" });
    expect(r3).toMatchObject({ ok: false, reason: "insufficient_units" });
  });

  it("CHECK constraints prevent a wallet going negative", async () => {
    await setWallet({ weekly: 100, used: 0, topup: 0 });
    await expect(
      dbQuery(`UPDATE zaki_unit_wallets SET topup_units = topup_units - 1 WHERE user_id = $1`, [userId])
    ).rejects.toThrow();
  });
});
