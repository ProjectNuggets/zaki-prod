import { describe, expect, it } from "@jest/globals";
import { reserveUnits, settleHold, releaseHold, ensureWallet } from "./unit-ledger.js";

// Fake pg client: routes queries by SQL shape, records calls, returns canned rows.
// NOTE: a fake cannot prove real FOR UPDATE / concurrency semantics — those need a real Postgres
// integration test (tracked as an H-02 follow-up). These tests pin the orchestration + accounting.
function makeClient(canned = {}) {
  const calls = [];
  let grantIdx = 0;
  const client = {
    calls,
    query: async (text, params = []) => {
      calls.push({ text, params });
      if (/FROM zaki_meter_holds WHERE grant_id = \$1 AND reserve_idempotency_key/.test(text)) {
        if (Array.isArray(canned.grantLookups)) {
          const r = canned.grantLookups[grantIdx] ?? null;
          grantIdx += 1;
          return { rows: r ? [r] : [] };
        }
        return { rows: canned.existingHold ? [canned.existingHold] : [] };
      }
      if (/FROM zaki_unit_wallets WHERE user_id = \$1 FOR UPDATE/.test(text)) {
        return { rows: canned.wallet ? [canned.wallet] : [] };
      }
      if (/SUM\(CASE WHEN state = 'reserved'/.test(text)) {
        return { rows: [{ used: canned.burstUsed ?? 0 }] };
      }
      if (/INSERT INTO zaki_unit_wallets/.test(text)) {
        return { rows: [{ user_id: params[0], plan_id: params[1], weekly_allowance_units: params[2], burst_allowance_units: params[3] }] };
      }
      if (/UPDATE zaki_unit_wallets/.test(text)) return { rows: [], rowCount: 1 };
      if (/INSERT INTO zaki_meter_holds/.test(text)) {
        return { rows: canned.insertConflict ? [] : [{ id: "hold-new", state: "reserved" }] };
      }
      if (/FROM zaki_meter_holds WHERE id = \$1 FOR UPDATE/.test(text)) {
        return { rows: canned.hold ? [canned.hold] : [] };
      }
      if (/UPDATE zaki_meter_holds/.test(text)) return { rows: [{ id: "hold-new" }] };
      return { rows: [] };
    },
  };
  return {
    client,
    calls,
    walletUpdate: () => calls.find((c) => /UPDATE zaki_unit_wallets/.test(c.text)),
    walletLock: () => calls.find((c) => /zaki_unit_wallets WHERE user_id = \$1 FOR UPDATE/.test(c.text)),
  };
}

const WALLET = {
  user_id: 42, plan_id: "personal",
  weekly_allowance_units: 100, weekly_used_units: 90,
  burst_allowance_units: 1000, burst_window_hours: 5, topup_units: 5,
};
const baseReserve = {
  userId: 42, grantId: "g1", productId: "agent", action: "agent_step",
  reserveIdempotencyKey: "g1:agent_step", expiresAt: "2026-06-08T00:00:00Z",
};

describe("unit-ledger: reserveUnits", () => {
  it("locks wallet first, debits recurring-first then top-up, inserts the hold", async () => {
    const { client, walletUpdate, walletLock } = makeClient({ wallet: { ...WALLET }, burstUsed: 0 });
    const r = await reserveUnits({ ...baseReserve, reservedUnits: 12 }, client); // recurring 10 + topup 2
    expect(r.ok).toBe(true);
    expect(r.funding).toMatchObject({ fromRecurring: 10, fromTopup: 2 });
    expect(walletLock()).toBeDefined();
    expect(walletUpdate().params).toEqual([42, 10, 2]); // [userId, +weekly_used, -topup]
  });

  it("denies when insufficient and does NOT touch the wallet", async () => {
    const { client, walletUpdate } = makeClient({ wallet: { ...WALLET }, burstUsed: 0 }); // remaining 15
    const r = await reserveUnits({ ...baseReserve, reservedUnits: 20 }, client);
    expect(r).toMatchObject({ ok: false, reason: "insufficient_units", shortfall: 5 });
    expect(walletUpdate()).toBeUndefined();
  });

  it("enforces the burst (5h) gate even when weekly has plenty", async () => {
    // weekly_remaining = 100, but burst_allowance 50 - burstUsed 48 = 2 → recurring capped at 2
    const wallet = { ...WALLET, weekly_used_units: 0, burst_allowance_units: 50, topup_units: 0 };
    const { client, walletUpdate } = makeClient({ wallet, burstUsed: 48 });
    const r = await reserveUnits({ ...baseReserve, reservedUnits: 5 }, client);
    expect(r).toMatchObject({ ok: false, reason: "insufficient_units", shortfall: 3 });
    expect(walletUpdate()).toBeUndefined();
  });

  it("is idempotent under the lock: existing hold returns without re-debiting", async () => {
    const { client, walletUpdate, walletLock } = makeClient({
      wallet: { ...WALLET }, existingHold: { id: "hold-x", state: "reserved" },
    });
    const r = await reserveUnits({ ...baseReserve, reservedUnits: 12 }, client);
    expect(r).toMatchObject({ ok: true, idempotent: true });
    expect(walletLock()).toBeDefined();      // wallet IS locked first
    expect(walletUpdate()).toBeUndefined();  // but never debited
  });

  it("insert conflict (lost race) returns idempotent WITHOUT debiting", async () => {
    // step-2 lookup empty → proceeds; INSERT conflicts (0 rows) → re-select returns the winner's hold
    const { client, walletUpdate } = makeClient({
      wallet: { ...WALLET }, burstUsed: 0, insertConflict: true,
      grantLookups: [null, { id: "hold-winner", state: "reserved" }],
    });
    const r = await reserveUnits({ ...baseReserve, reservedUnits: 5 }, client);
    expect(r).toMatchObject({ ok: true, idempotent: true });
    expect(r.hold).toMatchObject({ id: "hold-winner" });
    expect(walletUpdate()).toBeUndefined(); // conflict → never debited (no double-charge)
  });

  it("returns no_wallet when the user has no wallet row", async () => {
    const { client } = makeClient({ wallet: null });
    const r = await reserveUnits({ ...baseReserve, reservedUnits: 1 }, client);
    expect(r).toMatchObject({ ok: false, reason: "no_wallet" });
  });
});

describe("unit-ledger: ensureWallet (provisioning)", () => {
  it("provisions allowances from the plan (personal → weekly 500 / burst 100)", async () => {
    const { client, calls } = makeClient({});
    const w = await ensureWallet({ userId: 7, planId: "personal", env: {} }, client);
    const ins = calls.find((c) => /INSERT INTO zaki_unit_wallets/.test(c.text));
    expect(ins.params).toEqual([7, "personal", 500, 100, 5]); // [userId, plan, weekly, burst, windowHours]
    expect(w).toMatchObject({ weekly_allowance_units: 500 });
  });

  it("normalizes legacy/unknown plans (bogus → free defaults)", async () => {
    const { client, calls } = makeClient({});
    await ensureWallet({ userId: 7, planId: "bogus", env: {} }, client);
    const ins = calls.find((c) => /INSERT INTO zaki_unit_wallets/.test(c.text));
    expect(ins.params).toEqual([7, "free", 100, 20, 5]);
  });

  it("maps a paid tier (pro → weekly 1500 / burst 300)", async () => {
    const { client, calls } = makeClient({});
    await ensureWallet({ userId: 9, planId: "pro", env: {} }, client);
    const ins = calls.find((c) => /INSERT INTO zaki_unit_wallets/.test(c.text));
    expect(ins.params).toEqual([9, "pro", 1500, 300, 5]);
  });
});

describe("unit-ledger: settleHold / releaseHold", () => {
  const HOLD = { id: "hold-1", user_id: 42, state: "reserved", reserved_units: 15, funding_json: { fromRecurring: 10, fromTopup: 5 } };

  it("partial settle refunds top-up first (preserve paid units)", async () => {
    const { client, walletUpdate } = makeClient({ hold: { ...HOLD } });
    const r = await settleHold({ holdId: "hold-1", settleIdempotencyKey: "g1:agent_step:receipt", settledUnits: 8 }, client);
    expect(r.refund).toMatchObject({ settledUnits: 8, refundTopup: 5, refundRecurring: 2 });
    expect(walletUpdate().params).toEqual([42, 2, 5]); // [-weekly_used(refundRecurring), +topup(refundTopup)]
  });

  it("is idempotent: a non-reserved hold is a no-op (no double-settle)", async () => {
    const { client, walletUpdate } = makeClient({ hold: { ...HOLD, state: "settled" } });
    const r = await settleHold({ holdId: "hold-1", settleIdempotencyKey: "k", settledUnits: 8 }, client);
    expect(r).toMatchObject({ ok: true, idempotent: true });
    expect(walletUpdate()).toBeUndefined();
  });

  it("rejects a settle with a non-finite settledUnits (data-quality guard)", async () => {
    const { client } = makeClient({ hold: { ...HOLD } });
    const r = await settleHold({ holdId: "hold-1", settleIdempotencyKey: "k", settledUnits: undefined }, client);
    expect(r).toMatchObject({ ok: false, reason: "invalid_settled_units" });
  });

  it("releaseHold fully refunds (settled 0)", async () => {
    const { client, walletUpdate } = makeClient({ hold: { ...HOLD } });
    const r = await releaseHold({ holdId: "hold-1", settleIdempotencyKey: "k" }, client);
    expect(r.refund).toMatchObject({ settledUnits: 0, refundRecurring: 10, refundTopup: 5 });
    expect(walletUpdate().params).toEqual([42, 10, 5]);
  });

  it("returns no_hold for an unknown hold id", async () => {
    const { client } = makeClient({ hold: null });
    const r = await settleHold({ holdId: "nope", settleIdempotencyKey: "k", settledUnits: 1 }, client);
    expect(r).toMatchObject({ ok: false, reason: "no_hold" });
  });
});
