import { describe, expect, it } from "@jest/globals";
import { reserveUnits, settleHold, releaseHold } from "./unit-ledger.js";

// Fake pg client: routes queries by SQL shape, records calls, returns canned rows.
function makeClient(canned = {}) {
  const calls = [];
  const client = {
    calls,
    query: async (text, params = []) => {
      calls.push({ text, params });
      if (/FROM zaki_meter_holds WHERE grant_id/.test(text)) {
        return { rows: canned.existingHold ? [canned.existingHold] : [] };
      }
      if (/FROM zaki_unit_wallets WHERE user_id = \$1 FOR UPDATE/.test(text)) {
        return { rows: canned.wallet ? [canned.wallet] : [] };
      }
      if (/UPDATE zaki_unit_wallets/.test(text)) return { rows: [], rowCount: 1 };
      if (/INSERT INTO zaki_meter_holds/.test(text)) {
        return { rows: [{ id: "hold-new", state: "reserved", ...(params && {}) }] };
      }
      if (/FROM zaki_meter_holds WHERE id = \$1 FOR UPDATE/.test(text)) {
        return { rows: canned.hold ? [canned.hold] : [] };
      }
      if (/UPDATE zaki_meter_holds/.test(text)) {
        return { rows: [{ id: "hold-new", state: /released/.test(params?.[1] || "") ? "released" : "settled" }] };
      }
      return { rows: [] };
    },
  };
  const walletUpdate = () => calls.find((c) => /UPDATE zaki_unit_wallets/.test(c.text));
  return { client, calls, walletUpdate };
}

const WALLET = {
  user_id: 42, plan_id: "personal",
  weekly_allowance_units: 100, weekly_used_units: 90,
  burst_allowance_units: 1000, topup_units: 5,
};
const baseReserve = {
  userId: 42, grantId: "g1", productId: "agent", action: "agent_step",
  reserveIdempotencyKey: "g1:agent_step", burstUsedUnits: 0, expiresAt: "2026-06-08T00:00:00Z",
};

describe("unit-ledger: reserveUnits", () => {
  it("debits recurring-first then top-up, inserts the hold", async () => {
    const { client, walletUpdate } = makeClient({ wallet: { ...WALLET } });
    const r = await reserveUnits({ ...baseReserve, reservedUnits: 12 }, client); // recurring=10, topup=5 → 10+2
    expect(r.ok).toBe(true);
    expect(r.funding).toMatchObject({ fromRecurring: 10, fromTopup: 2 });
    const upd = walletUpdate();
    expect(upd.params).toEqual([42, 10, 2]); // [userId, +weekly_used, -topup]
  });

  it("denies when insufficient and does NOT touch the wallet (TOCTOU-safe)", async () => {
    const { client, walletUpdate } = makeClient({ wallet: { ...WALLET } }); // remaining = 15
    const r = await reserveUnits({ ...baseReserve, reservedUnits: 20 }, client);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("insufficient_units");
    expect(r.shortfall).toBe(5);
    expect(walletUpdate()).toBeUndefined(); // no debit
  });

  it("is idempotent: an existing hold returns without re-debiting or locking", async () => {
    const { client, calls, walletUpdate } = makeClient({ existingHold: { id: "hold-x", state: "reserved" } });
    const r = await reserveUnits({ ...baseReserve, reservedUnits: 12 }, client);
    expect(r).toMatchObject({ ok: true, idempotent: true });
    expect(calls.some((c) => /FOR UPDATE/.test(c.text))).toBe(false); // never locked the wallet
    expect(walletUpdate()).toBeUndefined();
  });

  it("returns no_wallet when the user has no wallet row", async () => {
    const { client } = makeClient({ wallet: null });
    const r = await reserveUnits({ ...baseReserve, reservedUnits: 1 }, client);
    expect(r).toMatchObject({ ok: false, reason: "no_wallet" });
  });
});

describe("unit-ledger: settleHold / releaseHold", () => {
  const HOLD = { id: "hold-1", user_id: 42, state: "reserved", reserved_units: 15, funding_json: { fromRecurring: 10, fromTopup: 5 } };

  it("partial settle refunds top-up first (preserve paid units)", async () => {
    const { client, walletUpdate } = makeClient({ hold: { ...HOLD } });
    const r = await settleHold({ holdId: "hold-1", settleIdempotencyKey: "g1:agent_step:receipt", settledUnits: 8 }, client);
    expect(r.ok).toBe(true);
    expect(r.refund).toMatchObject({ settledUnits: 8, refundTopup: 5, refundRecurring: 2 });
    expect(walletUpdate().params).toEqual([42, 2, 5]); // [userId, -weekly_used(refundRecurring), +topup(refundTopup)]
  });

  it("is idempotent: a non-reserved hold is a no-op (no double-settle)", async () => {
    const { client, walletUpdate } = makeClient({ hold: { ...HOLD, state: "settled" } });
    const r = await settleHold({ holdId: "hold-1", settleIdempotencyKey: "k", settledUnits: 8 }, client);
    expect(r).toMatchObject({ ok: true, idempotent: true });
    expect(walletUpdate()).toBeUndefined();
  });

  it("releaseHold fully refunds (settled 0)", async () => {
    const { client, walletUpdate } = makeClient({ hold: { ...HOLD } });
    const r = await releaseHold({ holdId: "hold-1", settleIdempotencyKey: "k" }, client);
    expect(r.ok).toBe(true);
    expect(r.refund).toMatchObject({ settledUnits: 0, refundRecurring: 10, refundTopup: 5 });
    expect(walletUpdate().params).toEqual([42, 10, 5]);
  });

  it("returns no_hold for an unknown hold id", async () => {
    const { client } = makeClient({ hold: null });
    const r = await settleHold({ holdId: "nope", settleIdempotencyKey: "k", settledUnits: 1 }, client);
    expect(r).toMatchObject({ ok: false, reason: "no_hold" });
  });
});
