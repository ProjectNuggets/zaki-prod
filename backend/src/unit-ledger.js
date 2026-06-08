// DB-backed reserve→settle unit ledger (H-02, DATA-MODEL.md).
// Wraps the pure wallet math (unit-wallet.js) in a transaction that locks the wallet row
// (SELECT ... FOR UPDATE) so ALL of a user's reserves serialize — closing TOCTOU for the weekly,
// top-up AND burst dimensions. Idempotency is decided UNDER the lock and the DB UNIQUE constraint
// is the final arbiter (insert-first; debit only if we created the row → a conflict never debits).
//
// Bucket accounting:
//   - reserve: weekly_used_units += fromRecurring ; topup_units -= fromTopup
//   - settle : refund (reserved - settled), top-up-first → weekly_used -= refundRecurring ; topup_units += refundTopup
//
// SIMPLIFICATION vs DATA-MODEL.md (deliberate, documented): funding_json stores a 2-key
// {fromRecurring, fromTopup} split, not the doc's 3-key {weekly,burst,topup}. This is sound because
// burst is NOT a stored counter — it is recomputed each reserve from the rolling-window holds, so
// "recurring" only ever debits weekly_used. If burst ever becomes a separately-debited stored bucket,
// widen funding_json to 3 keys so refunds route correctly.
//
// COMPANION REQUIRED (H-02 follow-up): an expiry SWEEPER that releases `reserved` holds past
// expires_at (idx_zaki_meter_holds_expiry_sweep) — until it exists, an orphaned reserve (settle never
// called) stays debited (correct fail-closed direction, but units are stuck for the user).
//
// NOTE on precision: unit columns are DOUBLE PRECISION; running sums can drift over many requests.
// Acceptable for weighted units; revisit integer micro-units if it ever backs direct $ accounting.

import { withDbTransaction, dbAll, dbGet } from "./db.js";
import { computeRemaining, planFunding, computeSettleRefund } from "./unit-wallet.js";
import { buildPlatformPlanPolicy, normalizePlatformPlanId } from "./platform-policy.js";

const TERMINAL_STATES = new Set(["settled", "released", "expired"]);

/**
 * Provision (or re-sync) a user's wallet from their plan (minimal H-03 slice). Allowances come from
 * the platform plan policy (env-overridable). Idempotent: on a plan change it updates the allowances
 * but PRESERVES weekly_used_units and topup_units (so an upgrade adds headroom without wiping usage).
 * @returns {Promise<object>} the wallet row
 */
export async function ensureWallet({ userId, planId, env = process.env }, client) {
  const plan = normalizePlatformPlanId(planId);
  const policy = buildPlatformPlanPolicy({ env });
  const p = policy.plans[plan] || policy.plans.free;
  const q = `
    INSERT INTO zaki_unit_wallets
      (user_id, plan_id, weekly_allowance_units, burst_allowance_units, burst_window_hours)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id) DO UPDATE SET
      plan_id = EXCLUDED.plan_id,
      weekly_allowance_units = EXCLUDED.weekly_allowance_units,
      burst_allowance_units = EXCLUDED.burst_allowance_units,
      burst_window_hours = EXCLUDED.burst_window_hours,
      version = zaki_unit_wallets.version + 1,
      updated_at = NOW()
    RETURNING *`;
  const params = [userId, plan, p.weeklyAllowanceUnits ?? 0, p.rollingAllowanceUnits ?? 0, policy.burstWindowHours];
  if (client) return (await client.query(q, params)).rows[0];
  return dbGet(q, params);
}

export const UNIT_LEDGER_DDL = `
CREATE TABLE IF NOT EXISTS zaki_unit_wallets (
  user_id BIGINT PRIMARY KEY REFERENCES zaki_users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'free',
  weekly_allowance_units DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (weekly_allowance_units >= 0),
  weekly_used_units DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (weekly_used_units >= 0),
  weekly_anchor_at TIMESTAMPTZ,
  weekly_reset_at TIMESTAMPTZ,
  burst_allowance_units DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (burst_allowance_units >= 0),
  burst_window_hours INT NOT NULL DEFAULT 5,
  topup_units DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (topup_units >= 0),
  version BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zaki_meter_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id UUID NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id BIGINT REFERENCES zaki_users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  action TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'reserved' CHECK (state IN ('reserved','settled','released','expired')),
  reserved_units DOUBLE PRECISION NOT NULL DEFAULT 0,
  settled_units DOUBLE PRECISION,
  provider TEXT,
  provider_model TEXT,
  provider_input_tokens BIGINT,
  provider_output_tokens BIGINT,
  provider_cost_usd_micros BIGINT,
  funding_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  reserve_idempotency_key TEXT NOT NULL,
  settle_idempotency_key TEXT,
  raw_facts_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (grant_id, reserve_idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_zaki_meter_holds_active_user
  ON zaki_meter_holds (user_id, state, reserved_at DESC) WHERE state = 'reserved';
CREATE INDEX IF NOT EXISTS idx_zaki_meter_holds_expiry_sweep
  ON zaki_meter_holds (state, expires_at) WHERE state = 'reserved';
CREATE INDEX IF NOT EXISTS idx_zaki_meter_holds_burst_window
  ON zaki_meter_holds (user_id, reserved_at DESC);
`;

function parseFunding(funding) {
  const f = typeof funding === "string" ? JSON.parse(funding || "{}") : funding || {};
  return { fromRecurring: Number(f.fromRecurring) || 0, fromTopup: Number(f.fromTopup) || 0 };
}

/**
 * Reserve units for an op. Atomic + idempotent + fail-closed. Debits the wallet only on success.
 * @returns {Promise<{ok:boolean, hold?:object, funding?:object, remaining?:number, idempotent?:boolean, reason?:string, shortfall?:number}>}
 */
export async function reserveUnits(
  { userId, grantId, productId, action, reservedUnits, reserveIdempotencyKey, expiresAt },
  client
) {
  const run = async (c) => {
    // 1) Lock the wallet FIRST → all of this user's reserves serialize here (TOCTOU close for every bucket).
    const w = await c.query(`SELECT * FROM zaki_unit_wallets WHERE user_id = $1 FOR UPDATE`, [userId]);
    const wallet = w.rows[0];
    if (!wallet) return { ok: false, reason: "no_wallet" };

    // 2) Idempotency UNDER the lock: a concurrent retry (same user/grant) is blocked above, so a
    //    committed prior hold is visible now. Return it without re-debiting.
    const existing = await c.query(
      `SELECT * FROM zaki_meter_holds WHERE grant_id = $1 AND reserve_idempotency_key = $2`,
      [grantId, reserveIdempotencyKey]
    );
    if (existing.rows[0]) return { ok: true, idempotent: true, hold: existing.rows[0] };

    // 3) Recompute burst usage INSIDE the lock (rolling window) → TOCTOU-safe 5h gate.
    const windowHours = Number(wallet.burst_window_hours) || 5;
    const burstRow = await c.query(
      `SELECT COALESCE(SUM(CASE WHEN state = 'reserved' THEN reserved_units
                                WHEN state = 'settled'  THEN COALESCE(settled_units, 0)
                                ELSE 0 END), 0) AS used
         FROM zaki_meter_holds
        WHERE user_id = $1 AND reserved_at > NOW() - ($2 * INTERVAL '1 hour')`,
      [userId, windowHours]
    );
    const burstUsedUnits = Number(burstRow.rows[0]?.used) || 0;

    const rem = computeRemaining({
      weeklyAllowanceUnits: Number(wallet.weekly_allowance_units),
      weeklyUsedUnits: Number(wallet.weekly_used_units),
      burstAllowanceUnits: Number(wallet.burst_allowance_units),
      burstUsedUnits,
      topupUnits: Number(wallet.topup_units),
    });
    const funding = planFunding(reservedUnits, {
      recurringRemaining: rem.recurringRemaining,
      topupUnits: rem.topupUnits,
    });
    if (!funding.ok) {
      return { ok: false, reason: "insufficient_units", shortfall: funding.shortfall, remaining: rem.remaining };
    }

    // 4) Insert the hold FIRST (DB UNIQUE is the idempotency arbiter). Debit ONLY if we created the row.
    const ins = await c.query(
      `INSERT INTO zaki_meter_holds
         (grant_id, tenant_id, user_id, product_id, action, state, reserved_units, funding_json, reserve_idempotency_key, expires_at)
       VALUES ($1, 'default', $2, $3, $4, 'reserved', $5, $6::jsonb, $7, $8)
       ON CONFLICT (grant_id, reserve_idempotency_key) DO NOTHING
       RETURNING *`,
      [
        grantId, userId, productId, action, reservedUnits,
        JSON.stringify({ fromRecurring: funding.fromRecurring, fromTopup: funding.fromTopup }),
        reserveIdempotencyKey, expiresAt,
      ]
    );
    if (ins.rows.length === 0) {
      // Not expected (we hold the lock and checked existing), but if a conflict occurs we did NOT
      // create the row → must NOT debit. Return the existing hold as an idempotent hit.
      const again = await c.query(
        `SELECT * FROM zaki_meter_holds WHERE grant_id = $1 AND reserve_idempotency_key = $2`,
        [grantId, reserveIdempotencyKey]
      );
      return { ok: true, idempotent: true, hold: again.rows[0] ?? null };
    }

    // 5) Debit the wallet — same tx as the insert → atomic.
    await c.query(
      `UPDATE zaki_unit_wallets
         SET weekly_used_units = weekly_used_units + $2,
             topup_units = topup_units - $3,
             version = version + 1,
             updated_at = NOW()
       WHERE user_id = $1`,
      [userId, funding.fromRecurring, funding.fromTopup]
    );
    return { ok: true, hold: ins.rows[0], funding, remaining: rem.remaining - funding.funded };
  };
  return client ? run(client) : withDbTransaction(run);
}

/**
 * Settle (or release) a reserved hold. Idempotent (no-op if already terminal). Refunds top-up-first.
 * For finalState='settled', settledUnits must be a finite number. settledUnits=0 + 'released' = full refund.
 * @returns {Promise<{ok:boolean, hold?:object, refund?:object, idempotent?:boolean, reason?:string}>}
 */
export async function settleHold(
  { holdId, settleIdempotencyKey, settledUnits, finalState = "settled", provider = null, providerModel = null, providerCostUsdMicros = null, providerInputTokens = null, providerOutputTokens = null },
  client
) {
  if (!TERMINAL_STATES.has(finalState)) return { ok: false, reason: "invalid_final_state" };
  if (finalState === "settled" && !Number.isFinite(Number(settledUnits))) {
    return { ok: false, reason: "invalid_settled_units" };
  }
  const run = async (c) => {
    const h = await c.query(`SELECT * FROM zaki_meter_holds WHERE id = $1 FOR UPDATE`, [holdId]);
    const hold = h.rows[0];
    if (!hold) return { ok: false, reason: "no_hold" };
    if (hold.state !== "reserved") return { ok: true, idempotent: true, hold }; // terminal → no double-settle

    const funding = parseFunding(hold.funding_json);
    const refund = computeSettleRefund({
      reservedUnits: Number(hold.reserved_units),
      // only 'settled' consumes units; 'released'/'expired' are full refunds
      settledUnits: finalState === "settled" ? Number(settledUnits) : 0,
      funding,
    });

    await c.query(
      `UPDATE zaki_unit_wallets
         SET weekly_used_units = GREATEST(0, weekly_used_units - $2),
             topup_units = topup_units + $3,
             version = version + 1,
             updated_at = NOW()
       WHERE user_id = $1`,
      [hold.user_id, refund.refundRecurring, refund.refundTopup]
    );

    const state = finalState; // 'settled' | 'released' | 'expired'
    const upd = await c.query(
      `UPDATE zaki_meter_holds
         SET state = $2, settled_units = $3, settle_idempotency_key = $4,
             provider = $5, provider_model = $6, provider_cost_usd_micros = $7,
             provider_input_tokens = $8, provider_output_tokens = $9, settled_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [holdId, state, refund.settledUnits, settleIdempotencyKey, provider, providerModel, providerCostUsdMicros, providerInputTokens, providerOutputTokens]
    );
    return { ok: true, hold: upd.rows[0], refund };
  };
  return client ? run(client) : withDbTransaction(run);
}

/** Release a hold (op never ran or fully failed) — full refund. */
export async function releaseHold({ holdId, settleIdempotencyKey }, client) {
  return settleHold({ holdId, settleIdempotencyKey, settledUnits: 0, finalState: "released" }, client);
}

/**
 * Expiry sweeper (the required fail-closed companion): releases `reserved` holds past expires_at
 * with a FULL refund and state='expired', so an orphaned reservation (settle never called) can't
 * leak the user's units forever. Each hold is settled in its own transaction (idempotent), so the
 * sweep is safe to run concurrently / on a schedule. Returns the count actually released.
 */
export async function sweepExpiredHolds({ limit = 500 } = {}) {
  const due = await dbAll(
    `SELECT id FROM zaki_meter_holds
      WHERE state = 'reserved' AND expires_at < NOW()
      ORDER BY expires_at ASC
      LIMIT $1`,
    [limit]
  );
  let released = 0;
  for (const row of due) {
    const res = await settleHold({
      holdId: row.id,
      settleIdempotencyKey: `sweep:${row.id}`,
      settledUnits: 0,
      finalState: "expired",
    });
    if (res.ok && !res.idempotent) released += 1;
  }
  return released;
}
