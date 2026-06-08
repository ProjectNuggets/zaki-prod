import { describe, expect, it } from "@jest/globals";
import { computeRemaining, planFunding, computeSettleRefund } from "./unit-wallet.js";

describe("unit-wallet: computeRemaining", () => {
  it("gates recurring by the smaller of weekly and burst", () => {
    // weekly limits
    expect(
      computeRemaining({ weeklyAllowanceUnits: 100, weeklyUsedUnits: 90, burstAllowanceUnits: 50, burstUsedUnits: 0 })
        .recurringRemaining
    ).toBe(10);
    // burst limits
    expect(
      computeRemaining({ weeklyAllowanceUnits: 100, weeklyUsedUnits: 0, burstAllowanceUnits: 50, burstUsedUnits: 45 })
        .recurringRemaining
    ).toBe(5);
  });

  it("adds top-up on top of recurring and never goes negative", () => {
    const r = computeRemaining({
      weeklyAllowanceUnits: 100, weeklyUsedUnits: 200, // over-used → clamps to 0
      burstAllowanceUnits: 50, burstUsedUnits: 10,
      topupUnits: 25,
    });
    expect(r.weeklyRemaining).toBe(0);
    expect(r.recurringRemaining).toBe(0);
    expect(r.topupUnits).toBe(25);
    expect(r.remaining).toBe(25); // only top-up left
  });

  it("handles all-zero / missing inputs", () => {
    expect(computeRemaining().remaining).toBe(0);
  });
});

describe("unit-wallet: planFunding", () => {
  it("funds fully from recurring when available", () => {
    const f = planFunding(10, { recurringRemaining: 50, topupUnits: 0 });
    expect(f).toMatchObject({ ok: true, fromRecurring: 10, fromTopup: 0, shortfall: 0 });
  });

  it("spills the shortfall to top-up", () => {
    const f = planFunding(30, { recurringRemaining: 20, topupUnits: 100 });
    expect(f).toMatchObject({ ok: true, fromRecurring: 20, fromTopup: 10, funded: 30 });
  });

  it("reports not-ok with a shortfall when both buckets are insufficient (TOCTOU guard)", () => {
    const f = planFunding(30, { recurringRemaining: 5, topupUnits: 10 });
    expect(f.ok).toBe(false);
    expect(f.fromRecurring).toBe(5);
    expect(f.fromTopup).toBe(10);
    expect(f.shortfall).toBe(15);
  });

  it("zero reservation is always ok with no debit", () => {
    expect(planFunding(0, { recurringRemaining: 0, topupUnits: 0 })).toMatchObject({ ok: true, funded: 0 });
  });
});

describe("unit-wallet: computeSettleRefund", () => {
  it("no refund on a full settle (actual == reserved)", () => {
    const r = computeSettleRefund({ reservedUnits: 15, settledUnits: 15, funding: { fromRecurring: 10, fromTopup: 5 } });
    expect(r.refundUnits).toBe(0);
    expect(r.consumedRecurring).toBe(10);
    expect(r.consumedTopup).toBe(5);
  });

  it("refunds top-up first on a partial settle (preserve paid units)", () => {
    // reserved 15 (10 recurring + 5 topup), settled 8 → refund 7: 5 topup back, 2 recurring back
    const r = computeSettleRefund({ reservedUnits: 15, settledUnits: 8, funding: { fromRecurring: 10, fromTopup: 5 } });
    expect(r.refundUnits).toBe(7);
    expect(r.refundTopup).toBe(5);
    expect(r.refundRecurring).toBe(2);
    expect(r.consumedRecurring).toBe(8);
    expect(r.consumedTopup).toBe(0); // top-up fully preserved
  });

  it("caps settled at reserved (never debit more than held)", () => {
    const r = computeSettleRefund({ reservedUnits: 10, settledUnits: 999, funding: { fromRecurring: 10, fromTopup: 0 } });
    expect(r.settledUnits).toBe(10);
    expect(r.refundUnits).toBe(0);
  });

  it("full refund on release (settled 0)", () => {
    const r = computeSettleRefund({ reservedUnits: 12, settledUnits: 0, funding: { fromRecurring: 7, fromTopup: 5 } });
    expect(r.refundUnits).toBe(12);
    expect(r.refundTopup).toBe(5);
    expect(r.refundRecurring).toBe(7);
    expect(r.consumedRecurring).toBe(0);
    expect(r.consumedTopup).toBe(0);
  });

  it("round-trips: consumed + refunded == reserved per bucket", () => {
    const funding = { fromRecurring: 9, fromTopup: 4 };
    const r = computeSettleRefund({ reservedUnits: 13, settledUnits: 6, funding });
    expect(r.consumedRecurring + r.refundRecurring).toBe(funding.fromRecurring);
    expect(r.consumedTopup + r.refundTopup).toBe(funding.fromTopup);
    expect(r.consumedRecurring + r.consumedTopup).toBe(r.settledUnits);
  });
});
