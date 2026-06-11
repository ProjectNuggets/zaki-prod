// Wave 2 BFF metering completeness: reconciliation sweep for DAEMON agent turns.
//
// The nullALIS engine writes EVERY agent turn to the shared-DB table zaki_bot.turn_usage,
// tagged entry_kind 'http' | 'daemon':
//   - 'http'   turns are settled LIVE via the SSE done-frame (the existing agent wallet path,
//              settleAgentChatUnits). This sweep MUST NEVER touch them.
//   - 'daemon' turns (cron / heartbeat / channel) ran real Kimi cost but were never metered
//              live (there is no SSE response to settle on). This sweep debits them.
//
// reconciled_at IS NULL = not yet debited. The sweep is the durable, crash-safe path that
// reconciles those daemon turns into the unit wallet.
//
// IDEMPOTENCY / NO DOUBLE-DEBIT (three independent layers):
//   1. The selection filter (reconciled_at IS NULL) is the cursor: once a row is marked it is
//      never re-selected, so a re-run is a no-op for already-settled turns.
//   2. The ledger idempotency key is derived from turn_key ('reconcile:'+turn_key): if the
//      reconciled_at write was lost (crash AFTER the debit, BEFORE the cursor write) the next
//      sweep re-selects the row, reserveUnits collides on UNIQUE(grant_id, reserve_key) and
//      returns idempotency_replayed (C1) / idempotent — the SAFE "already debited" signal. We
//      then just advance the cursor; we NEVER re-debit.
//   3. Per-row settle uses 'reconcile:'+turn_key+':settle' so the settle is itself idempotent.
//
// This makes the sweep safe to re-run and crash-safe mid-batch.
//
// This module is PURE orchestration: every collaborator is dependency-injected, so index.js
// wires the real ledger + DB and the tests mock them. Mirrors agent-metering.js style.

import { computeAgentSettleUnits } from "./agent-metering.js";

// Bounded batch (one SELECT pull) + a max-loops guard so a large backlog drains across loops
// without an unbounded single pass. Defaults chosen to mirror the holds sweeper cadence.
export const RECONCILE_BATCH_LIMIT = 200;
export const RECONCILE_MAX_LOOPS = 25; // ≤ 5000 rows per sweep at the default limit
export const RECONCILE_HOLD_EXPIRY_MS = 10 * 60 * 1000;
export const RECONCILE_SOURCE_ROUTE = "reconcile:turn_usage";
export const RECONCILE_PROVIDER = "nullalis";
export const RECONCILE_DEFAULT_ACTION = "agent_cron_turn";

function toFiniteNonNegInt(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

function reconcileKey(turnKey) {
  return `reconcile:${turnKey}`;
}

/**
 * Reconcile a bounded batch (possibly across several SELECT loops) of un-reconciled DAEMON
 * turn_usage rows into the unit wallet. Returns counters for observability.
 *
 * Selection contract (enforced in SQL): entry_kind='daemon' AND reconciled_at IS NULL, ordered
 * by created_at so the oldest debt settles first. http rows are excluded by the WHERE clause and
 * are NEVER selected or updated.
 *
 * Per-row pipeline (each wrapped in its own try/catch so one bad row never stalls the sweep):
 *   1. units = computeAgentSettleUnits({costUsd: row.cost_usd}) — real-cost when cost_available
 *      & cost>0, else the flat estimate (computeAgentSettleUnits already does this fallback).
 *   2. ensureWallet (plan from zaki_users.plan_tier, default 'free').
 *   3. reserveUnits with reserveIdempotencyKey = 'reconcile:'+turn_key:
 *        - ok && fresh         → settleHold (settledUnits = units) → debit. mark reconciled.
 *        - idempotency_replayed
 *          OR idempotent echo  → the turn was ALREADY debited by a prior sweep (C1 safe signal).
 *                                Do NOT re-debit, do NOT settle (the original owns the hold);
 *                                just advance the cursor.
 *        - insufficient_units  → OVERDRAW: a background turn already ran, so we must STILL debit
 *                                (never skip / never 429). We re-reserve with the funding gate
 *                                bypassed (allowOverdraw) then settle. // TODO kill-switch: a
 *                                platform spend cap will gate this later.
 *        - no_wallet           → ensureWallet then retry once.
 *   4. recordUsageEvent (best-effort; a failure here NEVER blocks the debit or the cursor write).
 *   5. UPDATE zaki_bot.turn_usage SET reconciled_at=now() — the cursor. Written ONLY after a
 *      successful debit or an idempotent-replay. If the debit throws, reconciled_at stays NULL
 *      and the row is retried next sweep.
 *
 * @returns {Promise<{scanned:number, debited:number, replayed:number, failed:number, loops:number}>}
 */
export async function reconcileDaemonTurnUsage({
  dbQuery,
  dbGet,
  reserveUnits,
  settleHold,
  ensureWallet,
  recordUsageEvent,
  deterministicGrantId,
  logStructured,
  env = process.env,
  limit = RECONCILE_BATCH_LIMIT,
  maxLoops = RECONCILE_MAX_LOOPS,
} = {}) {
  const counters = { scanned: 0, debited: 0, replayed: 0, failed: 0, loops: 0 };
  const batchLimit = toFiniteNonNegInt(limit) || RECONCILE_BATCH_LIMIT;
  const loopGuard = toFiniteNonNegInt(maxLoops) || RECONCILE_MAX_LOOPS;

  for (let loop = 0; loop < loopGuard; loop += 1) {
    counters.loops = loop + 1;
    const { rows } = await dbQuery(
      `SELECT user_id, turn_key, turn_origin, model,
              input_tokens, output_tokens, cost_usd, cost_available
         FROM zaki_bot.turn_usage
        WHERE entry_kind = 'daemon' AND reconciled_at IS NULL
        ORDER BY created_at ASC
        LIMIT $1`,
      [batchLimit]
    );

    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      counters.scanned += 1;
      try {
        const outcome = await reconcileRow({
          row,
          dbQuery,
          dbGet,
          reserveUnits,
          settleHold,
          ensureWallet,
          recordUsageEvent,
          deterministicGrantId,
          logStructured,
          env,
        });
        if (outcome === "debited") counters.debited += 1;
        else if (outcome === "replayed") counters.replayed += 1;
      } catch (error) {
        // Per-row isolation: leave reconciled_at NULL → retried next sweep. Never abort the batch.
        counters.failed += 1;
        logStructured?.("error", "agent.reconcile.row_failed", {
          userId: row?.user_id,
          turnKey: row?.turn_key,
          message: error?.message || String(error),
        });
      }
    }

    // A short batch means we've drained the table for now — stop early.
    if (rows.length < batchLimit) break;
  }

  return counters;
}

/**
 * Resolve a single daemon row through the ledger. Returns 'debited' | 'replayed'.
 * Throws on a hard ledger error so the caller can leave the cursor NULL for retry.
 */
async function reconcileRow({
  row,
  dbQuery,
  dbGet,
  reserveUnits,
  settleHold,
  ensureWallet,
  recordUsageEvent,
  deterministicGrantId,
  logStructured,
  env,
}) {
  const userId = Number(row.user_id);
  const turnKey = String(row.turn_key || "");
  const action = String(row.turn_origin || RECONCILE_DEFAULT_ACTION) || RECONCILE_DEFAULT_ACTION;
  const idemKey = reconcileKey(turnKey);
  const grantId = deterministicGrantId(idemKey);
  const expiresAt = new Date(Date.now() + RECONCILE_HOLD_EXPIRY_MS).toISOString();

  // Real-cost units (cost_available & cost>0) else the flat estimate. computeAgentSettleUnits
  // owns the gate: a null/0/non-finite cost falls back to the estimate (never billed as free).
  const costUsd =
    row.cost_available === false ? null : Number(row.cost_usd);
  const { units, costSource } = computeAgentSettleUnits({ costUsd, action, env });

  const reserveArgs = {
    userId,
    grantId,
    productId: "agent",
    action,
    reservedUnits: units,
    reserveIdempotencyKey: idemKey,
    expiresAt,
  };

  // --- 1) Reserve (idempotent on turn_key). ----------------------------------------------------
  let reserved = await reserveUnits(reserveArgs);

  // no_wallet → provision from the user's plan and retry once.
  if (!reserved.ok && reserved.reason === "no_wallet") {
    const planId = await lookupPlanId({ dbGet, userId });
    await ensureWallet({ userId, planId });
    reserved = await reserveUnits(reserveArgs);
  }

  // C1: a replay of an already-used reserve key (terminal hold) OR an in-flight idempotent echo
  // BOTH mean this daemon turn was ALREADY debited by a prior sweep. The SAFE signal: skip the
  // re-debit, do NOT settle (the original reserve owns the hold), just advance the cursor.
  if (
    (!reserved.ok && reserved.reason === "idempotency_replayed") ||
    (reserved.ok && reserved.idempotent)
  ) {
    await markReconciled({ dbQuery, userId: row.user_id, turnKey: row.turn_key });
    return "replayed";
  }

  // insufficient_units → OVERDRAW. The background turn ALREADY ran; we MUST debit it, never skip
  // and never surface a 429 (there is no caller to 429). Force the reserve past the funding gate.
  // TODO kill-switch: a platform-level spend cap will gate runaway daemon spend here later.
  if (!reserved.ok && reserved.reason === "insufficient_units") {
    logStructured?.("warn", "agent.reconcile.overdraw", {
      userId,
      turnKey,
      units,
      remaining: reserved.remaining ?? null,
    });
    reserved = await reserveUnits({ ...reserveArgs, allowOverdraw: true });
  }

  if (!reserved.ok || !reserved.hold?.id) {
    // Any other refusal is a hard error for this row → throw so the cursor stays NULL (retry).
    throw new Error(`reserve_failed:${reserved.reason || "unknown"}`);
  }

  // --- 2) Settle the fresh hold to the row's real cost. ---------------------------------------
  const hold = reserved.hold;
  const costMicros = Number.isFinite(Number(row.cost_usd))
    ? Math.round(Number(row.cost_usd) * 1e6)
    : null;
  const inputTokens = toFiniteNonNegInt(row.input_tokens);
  const outputTokens = toFiniteNonNegInt(row.output_tokens);

  const settleResult = await settleHold({
    holdId: hold.id,
    settleIdempotencyKey: `${idemKey}:settle`,
    settledUnits: units,
    finalState: "settled",
    provider: RECONCILE_PROVIDER,
    providerModel: row.model || null,
    providerCostUsdMicros: costMicros,
    providerInputTokens: inputTokens,
    providerOutputTokens: outputTokens,
  });

  if (!settleResult?.ok) {
    // Settle refused (e.g. no_hold) — treat as a hard error so we retry rather than mark settled.
    throw new Error(`settle_failed:${settleResult?.reason || "unknown"}`);
  }

  // --- 3) First-class usage event (best-effort). NEVER blocks the debit or the cursor. ---------
  try {
    await recordUsageEvent({
      dbQuery,
      logStructured,
      event: {
        userId,
        productId: "agent",
        surface: "agent",
        eventType: action,
        usageUnitType: "request",
        usageUnits: units,
        sourceRoute: RECONCILE_SOURCE_ROUTE,
        metadata: {
          entry_kind: "daemon",
          turn_origin: action,
          model: row.model || null,
          inputTokens: inputTokens ?? null,
          outputTokens: outputTokens ?? null,
          costUsd: Number.isFinite(Number(row.cost_usd)) ? Number(row.cost_usd) : null,
          costSource,
          reconciled: true,
        },
      },
    });
  } catch (usageError) {
    logStructured?.("error", "agent.reconcile.usage_record_failed", {
      userId,
      turnKey,
      message: usageError?.message || String(usageError),
    });
  }

  // --- 4) Advance the cursor — AFTER a successful debit. ---------------------------------------
  await markReconciled({ dbQuery, userId: row.user_id, turnKey: row.turn_key });
  return "debited";
}

async function lookupPlanId({ dbGet, userId }) {
  try {
    const row = await dbGet(`SELECT plan_tier FROM zaki_users WHERE id = $1`, [userId]);
    const plan = String(row?.plan_tier || "").trim();
    return plan || "free";
  } catch {
    return "free";
  }
}

// Advance the cursor on the row's REAL composite identity. The engine's migration-0004
// table has NO surrogate id/PK — row identity is UNIQUE(user_id, turn_key). The
// `AND reconciled_at IS NULL` guard makes the cursor-set itself idempotent (a re-run
// touches zero rows once the cursor is written).
async function markReconciled({ dbQuery, userId, turnKey }) {
  await dbQuery(
    `UPDATE zaki_bot.turn_usage
        SET reconciled_at = now()
      WHERE user_id = $1 AND turn_key = $2 AND reconciled_at IS NULL`,
    [userId, turnKey]
  );
}
