// Pure, deterministic wallet math for the reserve→settle unit ledger (H-02, DATA-MODEL.md).
//
// The wallet has three buckets:
//   - weekly  : weekly allowance, resets on anchor cycle (no rollover)
//   - burst   : rolling 5h window cap (computed from holds+receipts, passed in as burstUsed)
//   - topup   : persistent purchased units, never auto-reset, drained LAST, refunded FIRST
//
// Recurring usage is gated by BOTH weekly and burst (min of the two). Top-up is additive on top
// and bypasses both gates (the user paid for it). Reserve debits recurring first, then topup.
// Settle refunds (reserved - settled) topup-first so paid units are preserved and the free
// weekly bucket bears the cost.
//
// All functions are pure (no IO) so the correctness-critical math is exhaustively unit-tested.

const EPS = 1e-9;

function clampNonNeg(n) {
  const x = Number(n);
  return Number.isFinite(x) && x > 0 ? x : 0;
}

/**
 * Compute remaining units across buckets.
 * @returns {{weeklyRemaining:number, burstRemaining:number, recurringRemaining:number, topupUnits:number, remaining:number}}
 */
export function computeRemaining({
  weeklyAllowanceUnits = 0,
  weeklyUsedUnits = 0,
  burstAllowanceUnits = 0,
  burstUsedUnits = 0,
  topupUnits = 0,
} = {}) {
  const weeklyRemaining = clampNonNeg(weeklyAllowanceUnits - weeklyUsedUnits);
  const burstRemaining = clampNonNeg(burstAllowanceUnits - burstUsedUnits);
  const recurringRemaining = Math.min(weeklyRemaining, burstRemaining);
  const topup = clampNonNeg(topupUnits);
  return {
    weeklyRemaining,
    burstRemaining,
    recurringRemaining,
    topupUnits: topup,
    remaining: recurringRemaining + topup,
  };
}

/**
 * Plan how a reservation is funded: recurring first, then top-up.
 * @returns {{ok:boolean, fromRecurring:number, fromTopup:number, funded:number, shortfall:number}}
 */
export function planFunding(reservedUnits, { recurringRemaining = 0, topupUnits = 0 } = {}) {
  const need = clampNonNeg(reservedUnits);
  const fromRecurring = Math.min(need, clampNonNeg(recurringRemaining));
  const shortfall = need - fromRecurring;
  const fromTopup = Math.min(shortfall, clampNonNeg(topupUnits));
  const funded = fromRecurring + fromTopup;
  return {
    ok: funded >= need - EPS,
    fromRecurring,
    fromTopup,
    funded,
    shortfall: clampNonNeg(need - funded),
  };
}

/**
 * Compute the settle refund. refund = reserved - settled, returned top-up first (preserve paid
 * units), then recurring.
 *
 * recordTrueCost (WP-BILL2, owner decision 2026-07-18): by default settledUnits is CAPPED at
 * reserved, which silently under-bills every turn whose real cost exceeded the flat reserve — one
 * observed turn cost 463 units and was billed 60. Opted-in callers record the true cost instead and
 * receive `overageUnits`, which the ledger debits so the wallet reflects reality and the NEXT turn
 * is correctly refused. Left default-off so the spaces surface, whose reserve is a message-derived
 * ESTIMATE (input-only) settled against actual (input+output), is not silently switched to charging
 * for output tokens by this change.
 * @returns {{settledUnits:number, refundUnits:number, overageUnits:number, refundRecurring:number, refundTopup:number, consumedRecurring:number, consumedTopup:number}}
 */
export function computeSettleRefund({
  reservedUnits = 0,
  settledUnits = 0,
  funding = {},
  recordTrueCost = false,
} = {}) {
  const reserved = clampNonNeg(reservedUnits);
  const rawSettled = clampNonNeg(settledUnits);
  const settled = recordTrueCost ? rawSettled : Math.min(rawSettled, reserved);
  const overageUnits = clampNonNeg(settled - reserved);
  const refund = clampNonNeg(reserved - settled);
  const fromRecurring = clampNonNeg(funding.fromRecurring);
  const fromTopup = clampNonNeg(funding.fromTopup);
  const refundTopup = Math.min(refund, fromTopup); // refund paid units first
  const refundRecurring = clampNonNeg(refund - refundTopup);
  return {
    settledUnits: settled,
    refundUnits: refund,
    overageUnits,
    refundRecurring,
    refundTopup,
    consumedRecurring: clampNonNeg(fromRecurring - refundRecurring),
    consumedTopup: clampNonNeg(fromTopup - refundTopup),
  };
}
