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
 * Compute the settle refund. settledUnits is capped at reserved; refund = reserved - settled,
 * returned top-up first (preserve paid units), then recurring.
 * @returns {{settledUnits:number, refundUnits:number, refundRecurring:number, refundTopup:number, consumedRecurring:number, consumedTopup:number}}
 */
export function computeSettleRefund({ reservedUnits = 0, settledUnits = 0, funding = {} } = {}) {
  const reserved = clampNonNeg(reservedUnits);
  const settled = Math.min(clampNonNeg(settledUnits), reserved); // never settle more than reserved
  const refund = clampNonNeg(reserved - settled);
  const fromRecurring = clampNonNeg(funding.fromRecurring);
  const fromTopup = clampNonNeg(funding.fromTopup);
  const refundTopup = Math.min(refund, fromTopup); // refund paid units first
  const refundRecurring = clampNonNeg(refund - refundTopup);
  return {
    settledUnits: settled,
    refundUnits: refund,
    refundRecurring,
    refundTopup,
    consumedRecurring: clampNonNeg(fromRecurring - refundRecurring),
    consumedTopup: clampNonNeg(fromTopup - refundTopup),
  };
}
