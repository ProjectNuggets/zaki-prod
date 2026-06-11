// Proves the meter-gate over REAL HTTP against REAL Postgres: an authenticated request provisions a
// wallet and debits it through the full reserve→settle loop. Gated on LEDGER_TEST_DATABASE_URL.
import { describe, it, expect, beforeAll, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";

const RUN = process.env.LEDGER_TEST_DATABASE_URL;
const d = RUN ? describe : describe.skip;

d("meter-gate — HTTP request debits a real wallet (real PG)", () => {
  let app, dbQuery, dbGet, userId;

  beforeAll(async () => {
    process.env.DATABASE_URL = RUN;
    delete process.env.PGSSLMODE;
    process.env.NODE_ENV = "test";
    const db = await import("./db.js");
    const { buildMeterDemoRouter } = await import("./meter-demo-router.js");
    ({ dbQuery, dbGet } = db);
    await db.initDb();
    const u = await dbGet(
      `INSERT INTO zaki_users (email, password_hash, created_at, updated_at) VALUES ($1,'x',NOW(),NOW()) RETURNING id`,
      [`metergate+${Date.now()}@test.local`]
    );
    userId = Number(u.id);
    app = express();
    app.use(
      buildMeterDemoRouter({
        resolveUser: async (req) => ({ userId: Number(req.get("X-Test-User")), planId: req.get("X-Test-Plan") || "free" }),
      })
    );
  });

  beforeEach(async () => {
    await dbQuery(`DELETE FROM zaki_meter_holds WHERE user_id = $1`, [userId]);
    await dbQuery(`DELETE FROM zaki_unit_wallets WHERE user_id = $1`, [userId]);
  });

  const post = (body) => request(app).post("/api/meter/demo").set("X-Test-User", String(userId)).send(body);
  const usedUnits = async () =>
    Number((await dbGet(`SELECT weekly_used_units FROM zaki_unit_wallets WHERE user_id = $1`, [userId])).weekly_used_units);

  it("401s without a user", async () => {
    const r = await request(app).post("/api/meter/demo").send({ units: 1 });
    expect(r.status).toBe(401);
  });

  it("a real HTTP request provisions the wallet and debits it", async () => {
    const r = await post({ units: 5, actualUnits: 5 });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, settledUnits: 5 });
    expect(await usedUnits()).toBe(5);
  });

  it("settles the ACTUAL cost (< estimate) and refunds the difference", async () => {
    const r = await post({ units: 10, actualUnits: 4 });
    expect(r.status).toBe(200);
    expect(await usedUnits()).toBe(4); // 6 refunded
  });

  it("denies with HTTP 429 when the 5h burst window is exhausted", async () => {
    // free plan burst = 20 → four 5-unit ops fill it, the fifth is denied
    for (let i = 0; i < 4; i++) {
      const r = await post({ units: 5, actualUnits: 5, idempotencyKey: `fill${i}` });
      expect(r.status).toBe(200);
    }
    const denied = await post({ units: 5, actualUnits: 5 });
    expect(denied.status).toBe(429);
    expect(denied.body).toMatchObject({ ok: false, reason: "insufficient_units" });
    expect(await usedUnits()).toBe(20); // never over-debited
  });

  // C1 money-exploit fix: replaying the SAME grant+key AFTER the first op has fully completed (its hold
  // is terminal/settled) is a REPLAY of a completed operation — it must be REFUSED (409), NOT served as
  // a 200 idempotent success. Serving it 200 without re-charging = a free, unmetered run of the work
  // (the exploit, since the idempotency key is client-controlled).
  // (This test previously asserted r2.status===200 + r2.body.idempotent===true — that encoded the BUGGY
  //  behavior where a reused key after settle ran free. Updated to the secure semantics.)
  it("replaying a completed grant+key is REFUSED (409), never a free unmetered run — C1", async () => {
    const body = { units: 6, actualUnits: 6, grantId: "88888888-8888-8888-8888-888888888888", idempotencyKey: "idem1" };
    const r1 = await post(body);
    expect(r1.status).toBe(200); // first op runs + settles → hold terminal
    expect(await usedUnits()).toBe(6); // charged once

    const r2 = await post(body); // same key replayed after completion
    expect(r2.status).toBe(409);
    expect(r2.body).toMatchObject({ ok: false, reason: "idempotency_replayed" });
    expect(await usedUnits()).toBe(6); // STILL charged exactly once — not re-charged, not freed
  });
});
