import { describe, expect, it, jest } from "@jest/globals";
import {
  RECONCILE_BATCH_LIMIT,
  RECONCILE_HOLD_EXPIRY_MS,
  RECONCILE_SOURCE_ROUTE,
  reconcileDaemonTurnUsage,
} from "./agent-usage-reconcile.js";

// ---------------------------------------------------------------------------
// Test harness: an in-memory stand-in for zaki_bot.turn_usage + the unit ledger.
// We intercept the SELECT (returns un-reconciled daemon rows that the sweep would
// see) and the UPDATE ... reconciled_at (the cursor). reserveUnits / settleHold /
// recordUsageEvent are jest mocks so we assert "exactly one debit", "no double-debit",
// and "replay → mark reconciled, no re-debit".
// ---------------------------------------------------------------------------

function makeRow(overrides = {}) {
  return {
    id: 1,
    user_id: 42,
    turn_key: "turn-abc",
    turn_origin: "agent_cron_turn",
    model: "kimi-k2.6",
    input_tokens: 100,
    output_tokens: 50,
    cost_usd: 0.0015, // 0.0015 / 0.00075 = 2 units
    cost_available: true,
    entry_kind: "daemon",
    reconciled_at: null,
    ...overrides,
  };
}

// dbQuery dispatcher: routes the sweep's three statement shapes against an in-memory store.
function makeDbQuery(store) {
  return jest.fn(async (text, params = []) => {
    if (/FROM\s+zaki_bot\.turn_usage/i.test(text) && /SELECT/i.test(text)) {
      // The sweep's selection contract: entry_kind='daemon' AND reconciled_at IS NULL.
      const rows = store.rows
        .filter((r) => r.entry_kind === "daemon" && r.reconciled_at == null)
        .sort((a, b) => a.id - b.id)
        .slice(0, params[0] ?? store.rows.length);
      return { rows: rows.map((r) => ({ ...r })) };
    }
    if (/UPDATE\s+zaki_bot\.turn_usage/i.test(text) && /reconciled_at\s*=\s*now\(\)/i.test(text)) {
      const id = params[0];
      const row = store.rows.find((r) => r.id === id);
      if (row) row.reconciled_at = new Date().toISOString();
      return { rowCount: row ? 1 : 0, rows: [] };
    }
    // zaki_users plan lookup (dbGet path) — handled by makeDbGet; never hit here.
    throw new Error(`unexpected dbQuery: ${text}`);
  });
}

function makeDeps(store, overrides = {}) {
  const dbQuery = overrides.dbQuery || makeDbQuery(store);
  return {
    dbQuery,
    dbGet:
      overrides.dbGet ||
      jest.fn(async () => ({ plan_tier: "free" })), // plan lookup
    reserveUnits:
      overrides.reserveUnits ||
      jest.fn(async () => ({ ok: true, hold: { id: "hold-x", user_id: 42, reserved_units: 40 } })),
    settleHold: overrides.settleHold || jest.fn(async () => ({ ok: true })),
    ensureWallet: overrides.ensureWallet || jest.fn(async () => ({ user_id: 42, plan_id: "free" })),
    recordUsageEvent: overrides.recordUsageEvent || jest.fn(async () => ({ recorded: true })),
    deterministicGrantId: overrides.deterministicGrantId || ((k) => `grant-${k}`),
    logStructured: overrides.logStructured || jest.fn(),
    env: overrides.env || {},
    limit: overrides.limit,
    maxLoops: overrides.maxLoops,
  };
}

describe("reconcileDaemonTurnUsage", () => {
  it("debits exactly one daemon row: one reserve+settle, one usage-event, reconciled_at set", async () => {
    const store = { rows: [makeRow()] };
    const deps = makeDeps(store);

    const result = await reconcileDaemonTurnUsage(deps);

    expect(result.scanned).toBe(1);
    expect(result.debited).toBe(1);
    expect(result.replayed).toBe(0);
    expect(result.failed).toBe(0);

    // exactly one debit path
    expect(deps.reserveUnits).toHaveBeenCalledTimes(1);
    expect(deps.settleHold).toHaveBeenCalledTimes(1);
    expect(deps.recordUsageEvent).toHaveBeenCalledTimes(1);

    // wallet delta = the row's real-cost units: 0.0015 / 0.00075 = 2
    const reserveArgs = deps.reserveUnits.mock.calls[0][0];
    expect(reserveArgs.reservedUnits).toBe(2);
    expect(reserveArgs.productId).toBe("agent");
    expect(reserveArgs.action).toBe("agent_cron_turn");
    expect(reserveArgs.reserveIdempotencyKey).toBe("reconcile:turn-abc");
    expect(reserveArgs.grantId).toBe("grant-reconcile:turn-abc");

    const settleArgs = deps.settleHold.mock.calls[0][0];
    expect(settleArgs.holdId).toBe("hold-x");
    expect(settleArgs.settledUnits).toBe(2);
    expect(settleArgs.finalState).toBe("settled");
    expect(settleArgs.settleIdempotencyKey).toBe("reconcile:turn-abc:settle");
    expect(settleArgs.providerModel).toBe("kimi-k2.6");
    expect(settleArgs.providerCostUsdMicros).toBe(1500); // round(0.0015 * 1e6)
    expect(settleArgs.providerInputTokens).toBe(100);
    expect(settleArgs.providerOutputTokens).toBe(50);

    const usageEvent = deps.recordUsageEvent.mock.calls[0][0].event;
    expect(usageEvent.userId).toBe(42);
    expect(usageEvent.productId).toBe("agent");
    expect(usageEvent.eventType).toBe("agent_cron_turn");
    expect(usageEvent.usageUnits).toBe(2);
    expect(usageEvent.sourceRoute).toBe(RECONCILE_SOURCE_ROUTE);
    expect(usageEvent.metadata.entry_kind).toBe("daemon");
    expect(usageEvent.metadata.reconciled).toBe(true);
    expect(usageEvent.metadata.costSource).toBe("real");

    // cursor advanced
    expect(store.rows[0].reconciled_at).not.toBeNull();
  });

  it("does NOT re-select an already-reconciled row on a second sweep (no double-debit)", async () => {
    const store = { rows: [makeRow()] };
    const deps = makeDeps(store);

    await reconcileDaemonTurnUsage(deps);
    expect(deps.reserveUnits).toHaveBeenCalledTimes(1);

    // second pass over the SAME store — the row now has reconciled_at set, so the
    // selection filter excludes it. No new debit.
    const result2 = await reconcileDaemonTurnUsage(deps);
    expect(result2.scanned).toBe(0);
    expect(result2.debited).toBe(0);
    expect(deps.reserveUnits).toHaveBeenCalledTimes(1); // still just the first
    expect(deps.settleHold).toHaveBeenCalledTimes(1);
  });

  it("treats an idempotency_replayed reserve as already-reconciled: mark, do NOT re-debit", async () => {
    const store = { rows: [makeRow()] };
    const deps = makeDeps(store, {
      reserveUnits: jest.fn(async () => ({
        ok: false,
        reason: "idempotency_replayed",
        hold: { id: "hold-prev", state: "settled" },
      })),
    });

    const result = await reconcileDaemonTurnUsage(deps);

    expect(result.scanned).toBe(1);
    expect(result.replayed).toBe(1);
    expect(result.debited).toBe(0);
    expect(result.failed).toBe(0);

    // refused reserve → NO settle, NO re-debit, but the cursor IS advanced.
    expect(deps.settleHold).not.toHaveBeenCalled();
    expect(store.rows[0].reconciled_at).not.toBeNull();
  });

  it("treats an idempotent in-flight reserve echo as already-reconciled (no re-debit, mark)", async () => {
    const store = { rows: [makeRow()] };
    const deps = makeDeps(store, {
      reserveUnits: jest.fn(async () => ({
        ok: true,
        idempotent: true,
        hold: { id: "hold-prev", state: "reserved" },
      })),
    });

    const result = await reconcileDaemonTurnUsage(deps);

    expect(result.replayed).toBe(1);
    expect(result.debited).toBe(0);
    // The original owner settles its own hold; the sweep must NOT settle an echoed hold.
    expect(deps.settleHold).not.toHaveBeenCalled();
    expect(store.rows[0].reconciled_at).not.toBeNull();
  });

  it("NEVER selects or touches http rows", async () => {
    const store = {
      rows: [
        makeRow({ id: 1, entry_kind: "http", turn_key: "http-1" }),
        makeRow({ id: 2, entry_kind: "daemon", turn_key: "daemon-2" }),
      ],
    };
    const deps = makeDeps(store);

    const result = await reconcileDaemonTurnUsage(deps);

    expect(result.scanned).toBe(1); // only the daemon row
    expect(result.debited).toBe(1);
    expect(deps.reserveUnits).toHaveBeenCalledTimes(1);
    expect(deps.reserveUnits.mock.calls[0][0].reserveIdempotencyKey).toBe("reconcile:daemon-2");

    // http row untouched: never reconciled.
    const httpRow = store.rows.find((r) => r.id === 1);
    expect(httpRow.reconciled_at).toBeNull();
  });

  it("isolates a throwing row: others still settle, the bad row stays unreconciled for retry", async () => {
    const store = {
      rows: [
        makeRow({ id: 1, turn_key: "good-1" }),
        makeRow({ id: 2, turn_key: "bad-2" }),
        makeRow({ id: 3, turn_key: "good-3" }),
      ],
    };
    const reserveUnits = jest.fn(async ({ reserveIdempotencyKey }) => {
      if (reserveIdempotencyKey === "reconcile:bad-2") {
        throw new Error("ledger blip");
      }
      return { ok: true, hold: { id: `hold-${reserveIdempotencyKey}`, user_id: 42, reserved_units: 40 } };
    });
    const deps = makeDeps(store, { reserveUnits });

    const result = await reconcileDaemonTurnUsage(deps);

    expect(result.scanned).toBe(3);
    expect(result.debited).toBe(2);
    expect(result.failed).toBe(1);

    // good rows reconciled; bad row left NULL for the next sweep.
    expect(store.rows.find((r) => r.id === 1).reconciled_at).not.toBeNull();
    expect(store.rows.find((r) => r.id === 2).reconciled_at).toBeNull();
    expect(store.rows.find((r) => r.id === 3).reconciled_at).not.toBeNull();
  });

  it("falls back to the estimate when cost is unavailable (cost_available=false / 0)", async () => {
    const store = {
      rows: [makeRow({ cost_usd: 0, cost_available: false })],
    };
    const deps = makeDeps(store);

    const result = await reconcileDaemonTurnUsage(deps);

    expect(result.debited).toBe(1);
    const settleArgs = deps.settleHold.mock.calls[0][0];
    // estimate path: a plain agent_cron_turn → base 1 unit (estimateAgentMeterUnits default).
    expect(settleArgs.settledUnits).toBeGreaterThan(0);
    expect(settleArgs.providerCostUsdMicros).toBe(0);
    const usageEvent = deps.recordUsageEvent.mock.calls[0][0].event;
    expect(usageEvent.metadata.costSource).toBe("estimate");
  });

  it("overdraws on insufficient funds — background turns already ran, debit anyway (never skip)", async () => {
    const store = { rows: [makeRow()] };
    // reserveUnits refuses with insufficient_units → the sweep must NOT skip; it forces a debit
    // via a direct settle path (overdraw allowed). We assert the row is still reconciled + a debit
    // attempt was made.
    const reserveUnits = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, reason: "insufficient_units", remaining: 0 })
      // forced overdraw reserve (no funding gate) succeeds
      .mockResolvedValueOnce({ ok: true, hold: { id: "hold-od", user_id: 42, reserved_units: 2 } });
    const deps = makeDeps(store, { reserveUnits });

    const result = await reconcileDaemonTurnUsage(deps);

    expect(result.debited).toBe(1);
    expect(result.failed).toBe(0);
    expect(deps.settleHold).toHaveBeenCalledTimes(1);
    expect(store.rows[0].reconciled_at).not.toBeNull();
  });

  it("ensures the wallet when reserve reports no_wallet, then retries", async () => {
    const store = { rows: [makeRow()] };
    const reserveUnits = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, reason: "no_wallet" })
      .mockResolvedValueOnce({ ok: true, hold: { id: "hold-w", user_id: 42, reserved_units: 40 } });
    const ensureWallet = jest.fn(async () => ({ user_id: 42, plan_id: "free" }));
    const deps = makeDeps(store, { reserveUnits, ensureWallet });

    const result = await reconcileDaemonTurnUsage(deps);

    expect(result.debited).toBe(1);
    expect(ensureWallet).toHaveBeenCalledTimes(1);
    expect(ensureWallet.mock.calls[0][0].planId).toBe("free");
    expect(reserveUnits).toHaveBeenCalledTimes(2);
  });

  it("respects the batch LIMIT passed to the SELECT and the maxLoops guard", async () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      makeRow({ id: i + 1, turn_key: `t-${i + 1}` })
    );
    const store = { rows };
    const deps = makeDeps(store, { limit: 2, maxLoops: 1 });

    const result = await reconcileDaemonTurnUsage(deps);

    // one loop of LIMIT 2 → only 2 processed; maxLoops guard stops the sweep.
    expect(result.scanned).toBe(2);
    expect(result.debited).toBe(2);
    // the SELECT was called with the configured limit.
    const selectCall = deps.dbQuery.mock.calls.find((c) => /SELECT/i.test(c[0]));
    expect(selectCall[1][0]).toBe(2);
  });

  it("drains multiple batches across loops until the table is clear", async () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      makeRow({ id: i + 1, turn_key: `t-${i + 1}` })
    );
    const store = { rows };
    const deps = makeDeps(store, { limit: 2, maxLoops: 10 });

    const result = await reconcileDaemonTurnUsage(deps);

    expect(result.debited).toBe(5);
    expect(rows.every((r) => r.reconciled_at != null)).toBe(true);
  });

  it("exposes sane defaults for the batch limit and hold expiry", () => {
    expect(RECONCILE_BATCH_LIMIT).toBe(200);
    expect(RECONCILE_HOLD_EXPIRY_MS).toBeGreaterThan(0);
    expect(RECONCILE_SOURCE_ROUTE).toBe("reconcile:turn_usage");
  });
});
