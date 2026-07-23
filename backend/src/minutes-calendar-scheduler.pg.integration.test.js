// Gated on LEDGER_TEST_DATABASE_URL (CI's backend-pg-integration lane sets it;
// normal `npm test` skips it). The fakes-based scheduler suite mocks dbQuery, so
// it is structurally blind to two things only real Postgres enforces:
//   1. lease_owner is a UUID column — a non-UUID owner throws 22P02 (the exact
//      bug that made the poller 100% dead: `host:pid` is not valid UUID syntax).
//   2. the claimAutojoinFire ON CONFLICT DO UPDATE ... WHERE (capture_id IS NULL
//      AND stale) reclaim semantics — the double-bot guarantee lives in that WHERE,
//      and a fake can't tell a correct predicate from a broken one.
// It also exercises the `$n::bigint * INTERVAL` casts against the extended protocol
// (bare `$n * INTERVAL` positions broke live with 42P08 in the recovery path).
import { describe, it, expect, beforeAll, beforeEach } from "@jest/globals";
import { randomUUID } from "node:crypto";
import pg from "pg";

const RUN = process.env.LEDGER_TEST_DATABASE_URL;
const d = RUN ? describe : describe.skip;

let pool;
let scheduler;
const dbQuery = (sql, params) => pool.query(sql, params);

d("calendar scheduler SQL against real Postgres", () => {
  beforeAll(async () => {
    if (!RUN) return;
    pool = new pg.Pool({ connectionString: RUN });
    scheduler = await import("./minutes-calendar-scheduler.js");
    // FK-less mirrors — the SQL under test doesn't depend on the zaki_users FK,
    // but lease_owner MUST keep its real UUID type (that's what we're pinning).
    await pool.query(`DROP TABLE IF EXISTS zaki_calendar_autojoin_fires CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS zaki_calendar_connections CASCADE`);
    await pool.query(`
      CREATE TABLE zaki_calendar_autojoin_fires (
        dedup_key TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        user_id BIGINT NOT NULL,
        meeting_url TEXT NOT NULL,
        occurrence_start TIMESTAMPTZ NOT NULL,
        capture_id TEXT,
        fired_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
    await pool.query(`
      CREATE TABLE zaki_calendar_connections (
        user_id BIGINT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'active',
        refresh_ciphertext BYTEA NOT NULL DEFAULT '\\x00',
        refresh_iv BYTEA NOT NULL DEFAULT '\\x00',
        refresh_tag BYTEA NOT NULL DEFAULT '\\x00',
        lease_owner UUID,
        lease_expires_at TIMESTAMPTZ,
        last_polled_at TIMESTAMPTZ
      )`);
  });
  beforeEach(async () => {
    if (!RUN) return;
    await pool.query(`TRUNCATE zaki_calendar_autojoin_fires`);
    await pool.query(`TRUNCATE zaki_calendar_connections`);
  });

  const fire = (over = {}) => ({
    dedupKey: "k1", tenantId: "default", userId: 42,
    meetingUrl: "https://meet.google.com/abc", occurrenceStart: "2026-07-23T10:00:00.000Z",
    ...over,
  });

  describe("claimAutojoinFire — one bot per meeting, with self-heal", () => {
    it("first writer wins the fresh claim", async () => {
      expect(await scheduler.claimAutojoinFire(fire(), { dbQuery })).toBe(true);
    });

    it("a second claim while the first is in-flight (capture_id NULL, not stale) LOSES — no double bot", async () => {
      expect(await scheduler.claimAutojoinFire(fire(), { dbQuery })).toBe(true);
      // staleMs huge → the existing row is never 'stale', so the reclaim WHERE fails.
      expect(await scheduler.claimAutojoinFire(fire({ userId: 99, staleMs: 9_999_999 }), { dbQuery })).toBe(false);
    });

    it("a stale unfired claim (capture_id NULL, fired_at old) is RE-claimable — transient-failure/crash self-heal", async () => {
      expect(await scheduler.claimAutojoinFire(fire(), { dbQuery })).toBe(true);
      await pool.query(`UPDATE zaki_calendar_autojoin_fires SET fired_at = NOW() - INTERVAL '10 minutes' WHERE dedup_key = 'k1'`);
      expect(await scheduler.claimAutojoinFire(fire({ userId: 99, staleMs: 120_000 }), { dbQuery })).toBe(true);
      const { rows } = await pool.query(`SELECT user_id FROM zaki_calendar_autojoin_fires WHERE dedup_key = 'k1'`);
      expect(String(rows[0].user_id)).toBe("99"); // reclaimed by the new poller
    });

    it("a captured claim (capture_id set) is NEVER reclaimed, even when stale — never a second bot after success", async () => {
      expect(await scheduler.claimAutojoinFire(fire(), { dbQuery })).toBe(true);
      await scheduler.recordAutojoinFireCapture({ dedupKey: "k1", captureId: "capture-1" }, { dbQuery });
      await pool.query(`UPDATE zaki_calendar_autojoin_fires SET fired_at = NOW() - INTERVAL '1 hour' WHERE dedup_key = 'k1'`);
      expect(await scheduler.claimAutojoinFire(fire({ userId: 99, staleMs: 1 }), { dbQuery })).toBe(false);
    });
  });

  describe("claimCalendarConnectionsForPoll — leasing", () => {
    it("leases an active row and writes a valid UUID lease_owner (regression: non-UUID owner threw 22P02)", async () => {
      await pool.query(`INSERT INTO zaki_calendar_connections (user_id, status) VALUES (42, 'active')`);
      const owner = randomUUID();
      const rows = await scheduler.claimCalendarConnectionsForPoll({ limit: 10, leaseOwner: owner, leaseMs: 120_000 }, { dbQuery });
      expect(rows).toHaveLength(1);
      expect(String(rows[0].user_id)).toBe("42");
      const { rows: chk } = await pool.query(`SELECT lease_owner::text AS o FROM zaki_calendar_connections WHERE user_id = 42`);
      expect(chk[0].o).toBe(owner);
    });

    it("does not re-lease a row whose lease is still valid", async () => {
      await pool.query(`INSERT INTO zaki_calendar_connections (user_id, status) VALUES (42, 'active')`);
      await scheduler.claimCalendarConnectionsForPoll({ limit: 10, leaseOwner: randomUUID(), leaseMs: 120_000 }, { dbQuery });
      const second = await scheduler.claimCalendarConnectionsForPoll({ limit: 10, leaseOwner: randomUUID(), leaseMs: 120_000 }, { dbQuery });
      expect(second).toHaveLength(0);
    });

    it("reclaims a row whose lease has expired", async () => {
      await pool.query(`INSERT INTO zaki_calendar_connections (user_id, status, lease_owner, lease_expires_at) VALUES (42, 'active', $1, NOW() - INTERVAL '1 minute')`, [randomUUID()]);
      const rows = await scheduler.claimCalendarConnectionsForPoll({ limit: 10, leaseOwner: randomUUID(), leaseMs: 120_000 }, { dbQuery });
      expect(rows).toHaveLength(1);
    });

    it("never leases a non-active (revoked / invalid_grant) connection", async () => {
      await pool.query(`INSERT INTO zaki_calendar_connections (user_id, status) VALUES (42, 'invalid_grant')`);
      await pool.query(`INSERT INTO zaki_calendar_connections (user_id, status) VALUES (43, 'revoked')`);
      const rows = await scheduler.claimCalendarConnectionsForPoll({ limit: 10, leaseOwner: randomUUID(), leaseMs: 120_000 }, { dbQuery });
      expect(rows).toHaveLength(0);
    });
  });
});
