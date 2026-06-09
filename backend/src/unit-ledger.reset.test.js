import { describe, expect, it } from "@jest/globals";
import { applyWeeklyResetLocked } from "./unit-ledger.js";

// Lazy anchored weekly reset (Task 4). Exercised UNDER the existing FOR UPDATE lock in reserveUnits.
// Fake pg client: records the UPDATE SQL + params, returns a canned row (or 0 rows for the no-op case).
// A fake can't prove real lock/anchor semantics — those live in the pg integration suite. These tests
// pin the SQL SHAPE: init must NOT wipe usage; an elapsed reset must zero usage and gate on NOW().
function makeClient(updateRows) {
  const calls = [];
  const client = {
    calls,
    query: async (text, params = []) => {
      calls.push({ text, params });
      if (/UPDATE zaki_unit_wallets/.test(text)) return { rows: updateRows, rowCount: updateRows.length };
      return { rows: [] };
    },
  };
  return { client, calls, update: () => calls.find((c) => /UPDATE zaki_unit_wallets/.test(c.text)) };
}

describe("unit-ledger: applyWeeklyResetLocked", () => {
  it("init (weekly_reset_at null): seeds anchors WITHOUT wiping weekly_used_units", async () => {
    const wallet = { user_id: 42, weekly_used_units: 90, weekly_reset_at: null };
    const fresh = { ...wallet, weekly_reset_at: "2026-06-16T00:00:00Z", weekly_anchor_at: "2026-06-09T00:00:00Z" };
    const { client, update } = makeClient([fresh]);
    const out = await applyWeeklyResetLocked(client, wallet);
    const sql = update().text;
    expect(sql).toMatch(/weekly_reset_at IS NULL/);
    expect(sql).not.toMatch(/weekly_used_units\s*=\s*0/); // MUST NOT zero usage on init
    expect(update().params).toEqual([42]);
    expect(out).toBe(fresh);
  });

  it("reset (elapsed): zeroes weekly_used_units and gates on NOW() >= weekly_reset_at", async () => {
    const wallet = { user_id: 42, weekly_used_units: 100, weekly_reset_at: "2026-06-02T00:00:00Z" };
    const reset = { ...wallet, weekly_used_units: 0, weekly_reset_at: "2026-06-09T00:00:00Z" };
    const { client, update } = makeClient([reset]);
    const out = await applyWeeklyResetLocked(client, wallet);
    const sql = update().text;
    expect(sql).toMatch(/weekly_used_units\s*=\s*0/);
    expect(sql).toMatch(/NOW\(\)\s*>=\s*weekly_reset_at/);
    expect(update().params).toEqual([42]);
    expect(out).toBe(reset);
  });

  it("no-op (UPDATE matched 0 rows): returns the SAME wallet object unchanged", async () => {
    const wallet = { user_id: 42, weekly_used_units: 40, weekly_reset_at: "2026-06-20T00:00:00Z" };
    const { client } = makeClient([]); // not yet due → UPDATE affects 0 rows
    const out = await applyWeeklyResetLocked(client, wallet);
    expect(out).toBe(wallet);
  });
});
