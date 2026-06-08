// DB-backed reserve→settle unit ledger (H-02, DATA-MODEL.md).
// Wraps the pure wallet math (unit-wallet.js) in transactions that lock the wallet row
// (SELECT ... FOR UPDATE) so concurrent reservations cannot over-grant (the real TOCTOU fix),
// and are idempotent (UNIQUE(grant_id, reserve_idempotency_key) + terminal-state no-op on settle).
//
// Bucket accounting:
//   - reserve: weekly_used_units += fromRecurring ; topup_units -= fromTopup
//   - settle : refund (reserved - settled) — topup-first — weekly_used -= refundRecurring ; topup_units += refundTopup
// Burst is NOT stored; it is recomputed from the rolling-window holds/receipts and passed in as burstUsedUnits.

import { withDbTransaction, dbQuery } from "./db.js";
import { computeRemaining, planFunding, computeSettleRefund } from "./unit-wallet.js";

export const UNIT_LEDGER_DDL = `
CREATE TABLE IF NOT EXISTS zaki_unit_wallets (
  user_id BIGINT PRIMARY KEY REFERENCES zaki_users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'free',
  weekly_allowance_units DOUBLE PRECISION NOT NULL DEFAULT 0,
  weekly_used_units DOUBLE PRECISION NOT NULL DEFAULT 0,
  weekly_anchor_at TIMESTAMPTZ,
  weekly_reset_at TIMESTAMPTZ,
  burst_allowance_units DOUBLE PRECISION NOT NULL DEFAULT 0,
  burst_window_hours INT NOT NULL DEFAULT 5,
  topup_units DOUBLE PRECISION NOT NULL DEFAULT 0,
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
`;

export async function initUnitLedgerSchema() {
  await dbQuery(UNIT_LEDGER_DDL);
}

function parseFunding(funding) {
  const f = typeof funding === "string" ? JSON.parse(funding || "{}") : funding || {};
  return { fromRecurring: Number(f.fromRecurring) || 0, fromTopup: Number(f.fromTopup) || 0 };
}

/**
 * Reserve units for an op. Atomic + idempotent. Debits the wallet.
 * @returns {Promise<{ok:boolean, hold?:object, funding?:object, remaining?:number, idempotent?:boolean, reason?:string, shortfall?:number}>}
 */
export async function reserveUnits(
  { userId, grantId, productId, action, reservedUnits, reserveIdempotencyKey, burstUsedUnits = 0, expiresAt },
  client
) {
  const run = async (c) => {
    // Idempotency: a hold already exists for this (grant, key) → return it, no second debit.
    const existing = await c.query(
      `SELECT * FROM zaki_meter_holds WHERE grant_id = $1 AND reserve_idempotency_key = $2`,
      [grantId, reserveIdempotencyKey]
    );
    if (existing.rows[0]) return { ok: true, idempotent: true, hold: existing.rows[0] };

    // Lock the wallet row so concurrent reserves serialize (closes TOCTOU).
    const w = await c.query(`SELECT * FROM zaki_unit_wallets WHERE user_id = $1 FOR UPDATE`, [userId]);
    const wallet = w.rows[0];
    if (!wallet) return { ok: false, reason: "no_wallet" };

    const rem = computeRemaining({
      weeklyAllowanceUnits: Number(wallet.weekly_allowance_units),
      weeklyUsedUnits: Number(wallet.weekly_used_units),
      burstAllowanceUnits: Number(wallet.burst_allowance_units),
      burstUsedUnits: Number(burstUsedUnits),
      topupUnits: Number(wallet.topup_units),
    });
    const funding = planFunding(reservedUnits, {
      recurringRemaining: rem.recurringRemaining,
      topupUnits: rem.topupUnits,
    });
    if (!funding.ok) {
      return { ok: false, reason: "insufficient_units", shortfall: funding.shortfall, remaining: rem.remaining };
    }

    // Debit: recurring draws from the weekly bucket (within the burst gate); top-up drains separately.
    await c.query(
      `UPDATE zaki_unit_wallets
         SET weekly_used_units = weekly_used_units + $2,
             topup_units = topup_units - $3,
             version = version + 1,
             updated_at = NOW()
       WHERE user_id = $1`,
      [userId, funding.fromRecurring, funding.fromTopup]
    );

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
    return { ok: true, hold: ins.rows[0], funding, remaining: rem.remaining - funding.funded };
  };
  return client ? run(client) : withDbTransaction(run);
}

/**
 * Settle (or release) a reserved hold. Idempotent (no-op if already terminal). Refunds topup-first.
 * settledUnits is capped at reserved by the pure math. settledUnits=0 + finalState 'released' = full refund.
 * @returns {Promise<{ok:boolean, hold?:object, refund?:object, idempotent?:boolean, reason?:string}>}
 */
export async function settleHold(
  { holdId, settleIdempotencyKey, settledUnits, finalState = "settled", provider = null, providerModel = null, providerCostUsdMicros = null, providerInputTokens = null, providerOutputTokens = null },
  client
) {
  const run = async (c) => {
    const h = await c.query(`SELECT * FROM zaki_meter_holds WHERE id = $1 FOR UPDATE`, [holdId]);
    const hold = h.rows[0];
    if (!hold) return { ok: false, reason: "no_hold" };
    if (hold.state !== "reserved") return { ok: true, idempotent: true, hold }; // already terminal — no double-settle

    const funding = parseFunding(hold.funding_json);
    const refund = computeSettleRefund({
      reservedUnits: Number(hold.reserved_units),
      settledUnits: finalState === "released" ? 0 : Number(settledUnits),
      funding,
    });

    // Refund unused units to the wallet (topup-first via the pure math).
    await c.query(
      `UPDATE zaki_unit_wallets
         SET weekly_used_units = GREATEST(0, weekly_used_units - $2),
             topup_units = topup_units + $3,
             version = version + 1,
             updated_at = NOW()
       WHERE user_id = $1`,
      [hold.user_id, refund.refundRecurring, refund.refundTopup]
    );

    const state = finalState === "released" ? "released" : "settled";
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
