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
      (user_id, plan_id, weekly_allowance_units, burst_allowance_units, burst_window_hours, weekly_anchor_at, weekly_reset_at)
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '7 days')
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

/**
 * Read-only fetch of a user's wallet row. No lock, no mutation — safe for the DISPLAY path
 * (GET /api/meter/status sources the weekly window from this). Returns null if the user has no
 * wallet yet (anonymous identities and not-yet-provisioned users → caller falls back to receipts).
 * @returns {Promise<object|null>} the zaki_unit_wallets row, or null.
 */
export async function readWallet(userId) {
  const id = Number(userId);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return (await dbGet(`SELECT * FROM zaki_unit_wallets WHERE user_id = $1`, [id])) || null;
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
 * Lazy anchored weekly reset, applied UNDER the wallet's FOR UPDATE lock (called from reserveUnits).
 * No cron: the reset is realized the next time the user reserves. Two cases, both serialized by the lock:
 *   - init  (weekly_reset_at IS NULL): seed the anchor + next reset boundary. NEVER touch weekly_used_units,
 *            so a wallet that already has usage (e.g. a free user at the cap) is NOT silently refilled.
 *   - reset (NOW() >= weekly_reset_at): zero weekly_used_units and roll the anchor forward by whole 7-day
 *            periods. FLOOR(gap/7d)+1 guarantees the new boundary is STRICTLY in the future (now, now+7d],
 *            even when the elapsed gap is an exact integer number of weeks (no double-reset at the boundary).
 * The WHERE clause re-checks the gate so it's a no-op if a concurrent winner already reset; on 0 rows we
 * return the original wallet unchanged. Idempotent and safe to call on every reserve.
 * @returns {Promise<object>} the (possibly) updated wallet row
 */
export async function applyWeeklyResetLocked(c, wallet) {
  if (wallet.weekly_reset_at == null) {
    const r = await c.query(`UPDATE zaki_unit_wallets SET weekly_anchor_at = NOW(), weekly_reset_at = NOW() + INTERVAL '7 days', updated_at = NOW() WHERE user_id = $1 AND weekly_reset_at IS NULL RETURNING *`, [wallet.user_id]);
    return r.rows[0] || wallet;
  }
  const r = await c.query(`UPDATE zaki_unit_wallets SET weekly_used_units = 0, weekly_anchor_at = NOW(), weekly_reset_at = weekly_reset_at + ((FLOOR(EXTRACT(EPOCH FROM (NOW() - weekly_reset_at)) / 604800.0) + 1)::int * INTERVAL '7 days'), updated_at = NOW() WHERE user_id = $1 AND weekly_reset_at IS NOT NULL AND NOW() >= weekly_reset_at RETURNING *`, [wallet.user_id]);
  return r.rows[0] || wallet;
}

/**
 * Reserve units for an op. Atomic + idempotent + fail-closed. Debits the wallet only on success.
 * Idempotency outcomes (decided under the lock, keyed on the matched hold's STATE):
 *   - new reserve            → {ok:true, hold, funding, remaining}   (debited once)
 *   - in-flight retry        → {ok:true, idempotent:true, hold}      (state='reserved'; NOT re-debited)
 *   - replay of a done op     → {ok:false, reason:'idempotency_replayed', hold}  (terminal hold; refuse —
 *                               callers MUST NOT run a fresh free/unmetered op for this. C1 fix.)
 * @returns {Promise<{ok:boolean, hold?:object, funding?:object, remaining?:number, idempotent?:boolean, reason?:string, shortfall?:number}>}
 */
export async function reserveUnits(
  {
    userId,
    grantId,
    productId,
    action,
    reservedUnits,
    reserveIdempotencyKey,
    expiresAt,
    allowOverdraw = false,
    admitOnPositiveBalance = false,
  },
  client
) {
  const run = async (c) => {
    // 1) Lock the wallet FIRST → all of this user's reserves serialize here (TOCTOU close for every bucket).
    const w = await c.query(`SELECT * FROM zaki_unit_wallets WHERE user_id = $1 FOR UPDATE`, [userId]);
    let wallet = w.rows[0];
    if (!wallet) return { ok: false, reason: "no_wallet" };
    // 1b) Lazy anchored weekly reset, still under the lock (init anchors / roll the period / no-op).
    wallet = await applyWeeklyResetLocked(c, wallet);

    // 2) Idempotency UNDER the lock: a concurrent retry (same user/grant) is blocked above, so a
    //    committed prior hold is visible now. The MEANING of a match depends on the matched hold's state:
    //      - state='reserved' → a genuine in-flight RETRY of the SAME op (dropped connection, client
    //        re-sends the key while the original hold is still open). Echo it WITHOUT re-debiting; the
    //        ORIGINAL owner settles it (caller must NOT run a second billable op for this echo).
    //      - terminal (settled/released/expired) → the key belongs to an ALREADY-COMPLETED op. This is a
    //        REPLAY, not a reservation (C1 money exploit: with a client-controlled key this otherwise
    //        yields a FREE, UNMETERED op). Signal a DISTINCT refusal so callers reject the duplicate
    //        instead of proceeding allowed+null-hold.
    // G2-ISO-4 defense-in-depth: scope the idempotency match to THIS user. grant_id is derived from
    // the key string, so without user_id a key colliding across tenants would match another user's
    // hold (cross-tenant 409 DoS). Scoping to user_id makes a foreign key's collision INVISIBLE here →
    // it falls through to a fresh reserve against the caller's own wallet.
    const existing = await c.query(
      `SELECT * FROM zaki_meter_holds WHERE grant_id = $1 AND reserve_idempotency_key = $2 AND user_id = $3`,
      [grantId, reserveIdempotencyKey, userId]
    );
    if (existing.rows[0]) {
      const hold = existing.rows[0];
      if (TERMINAL_STATES.has(hold.state)) {
        return { ok: false, reason: "idempotency_replayed", hold };
      }
      return { ok: true, idempotent: true, hold };
    }

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
      // allowOverdraw: the op ALREADY happened and MUST be debited regardless of balance — only
      // the reconciliation sweep for daemon turns uses this (a background turn can't 429). We
      // drain top-up first (paid units), then push the remainder onto weekly_used past allowance:
      // weekly_used_units has only a >= 0 CHECK, so over-the-cap debits are permitted, and routing
      // the overflow through fromRecurring keeps the funding_json refund-correct at settle.
      // Live (interactive) reserves never set this flag → the 429 gate is unchanged for them.
      //
      // admitOnPositiveBalance (owner metering decision 2026-07-18): the flat reserve is a
      // worst-case ceiling, NOT an entitlement to spend. Gating admission on it meant a tier whose
      // allowance was below the reserve got exactly ONE turn per window and was then refused with
      // most of its balance unspent. So: while the user still has ANY units, admit the turn and
      // absorb the shortfall; the NEXT turn is refused once the wallet is drained to zero.
      // This deliberately reuses the overdraw funding path below rather than adding a second debit
      // route — same top-up-first ordering, same refund-correct funding_json.
      const hasPositiveBalance = Number(rem.remaining) > 0;
      if (!allowOverdraw && !(admitOnPositiveBalance && hasPositiveBalance)) {
        return {
          ok: false,
          reason: "insufficient_units",
          shortfall: funding.shortfall,
          remaining: rem.remaining,
          requiredUnits: reservedUnits,
          weeklyRemaining: rem.weeklyRemaining,
          rollingRemaining: rem.burstRemaining,
          topupUnits: rem.topupUnits,
          effectiveRemaining: rem.remaining,
          constraint:
            rem.burstRemaining < rem.weeklyRemaining
              ? "rolling"
              : "weekly",
        };
      }
      const need = Math.max(0, Number(reservedUnits) || 0);
      const fromTopup = Math.min(need, Number(rem.topupUnits) || 0);
      funding.fromTopup = fromTopup;
      funding.fromRecurring = need - fromTopup;
      funding.funded = need;
      funding.shortfall = 0;
      funding.ok = true;
      funding.overdraw = true;
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
      // create the row → must NOT debit. Apply the SAME state gate as step 2: a reserved winner is a
      // true in-flight retry (echo idempotent); a terminal winner means the key was consumed by a
      // completed op → a REPLAY (refuse, never a free reserve — C1).
      const again = await c.query(
        `SELECT * FROM zaki_meter_holds WHERE grant_id = $1 AND reserve_idempotency_key = $2 AND user_id = $3`,
        [grantId, reserveIdempotencyKey, userId]
      );
      const winner = again.rows[0] ?? null;
      if (winner && TERMINAL_STATES.has(winner.state)) {
        return { ok: false, reason: "idempotency_replayed", hold: winner };
      }
      return { ok: true, idempotent: true, hold: winner };
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
 *
 * recordTrueCost (WP-BILL2): default-off. When off, settledUnits is capped at reserved, so a turn
 * that cost more than its reserve is recorded — and billed — as the reserve. When on, the true cost
 * is recorded and the overage is DEBITED here, which is the half that actually matters: the receipt
 * alone would not drain the wallet, so the user would never be refused a subsequent turn.
 * @returns {Promise<{ok:boolean, hold?:object, refund?:object, idempotent?:boolean, reason?:string}>}
 */
export async function settleHold(
  { holdId, settleIdempotencyKey, settledUnits, finalState = "settled", recordTrueCost = false, provider = null, providerModel = null, providerCostUsdMicros = null, providerInputTokens = null, providerOutputTokens = null },
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
      recordTrueCost: recordTrueCost && finalState === "settled",
    });

    // refundRecurring and overageUnits are mutually exclusive — one of (reserved-settled) and
    // (settled-reserved) is always 0 — so one signed delta covers both: positive refunds, negative
    // debits. GREATEST(0,..) still floors the refund direction and never clamps a debit.
    const recurringDelta = refund.refundRecurring - refund.overageUnits;
    await c.query(
      `UPDATE zaki_unit_wallets
         SET weekly_used_units = GREATEST(0, weekly_used_units - $2),
             topup_units = topup_units + $3,
             version = version + 1,
             updated_at = NOW()
       WHERE user_id = $1`,
      [hold.user_id, recurringDelta, refund.refundTopup]
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
        -- A Minutes recovery row means the engine outcome is still unknown.
        -- Never refund that hold underneath its durable reconciler; a terminal
        -- receipt or an explicit lease-fenced rejection is required first.
        AND NOT EXISTS (
          SELECT 1
            FROM zaki_minutes_control_recoveries AS recovery
           WHERE recovery.reservation_id = zaki_meter_holds.id
             AND recovery.state <> 'terminal'
        )
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
