import { beforeAll, describe, expect, it } from "@jest/globals";

const RUN = process.env.LEDGER_TEST_DATABASE_URL;
const d = RUN ? describe : describe.skip;

d("refund clawback — real Postgres serialization", () => {
  let dbGet;
  let dbQuery;
  let withDbTransaction;
  let clawbackTopupByPaymentIntent;
  let resolvePendingTopupRefund;
  let userId;

  beforeAll(async () => {
    process.env.DATABASE_URL = RUN;
    delete process.env.PGSSLMODE;
    process.env.NODE_ENV = "test";
    const db = await import("./db.js");
    const refunds = await import("./billing-refund-clawback.js");
    ({ dbGet, dbQuery, withDbTransaction } = db);
    ({ clawbackTopupByPaymentIntent, resolvePendingTopupRefund } = refunds);
    await db.initDb();
    const user = await dbGet(
      `INSERT INTO zaki_users (email, password_hash, created_at, updated_at)
       VALUES ($1, 'x', NOW(), NOW()) RETURNING id`,
      [`refund+${Date.now()}@test.local`]
    );
    userId = Number(user.id);
    await dbQuery(
      `INSERT INTO zaki_unit_wallets
       (user_id, plan_id, weekly_allowance_units, weekly_used_units, burst_allowance_units, burst_window_hours, topup_units)
       VALUES ($1, 'personal', 1000, 0, 200, 5, 500)`,
      [userId]
    );
  });

  it("serializes concurrent replay and debits a fulfilled top-up exactly once", async () => {
    const paymentIntentId = `pi_refund_${Date.now()}`;
    await dbQuery(
      `INSERT INTO billing_topup_orders
       (user_id, checkout_session_id, stripe_payment_intent_id, pack_id, units, amount_total_cents, currency, status, fulfilled_at)
       VALUES ($1, $2, $3, 'boost_500', 500, 1000, 'usd', 'fulfilled', NOW())`,
      [userId, `cs_${Date.now()}`, paymentIntentId]
    );

    const refund = (eventId) => clawbackTopupByPaymentIntent({
      withDbTransaction,
      paymentIntentId,
      refundedAmountCents: 1000,
      fullRefund: true,
      eventId,
    });
    const [first, replay] = await Promise.all([refund("evt_a"), refund("evt_b")]);

    expect(first.unitsClawedBack + replay.unitsClawedBack).toBe(500);
    const wallet = await dbGet("SELECT topup_units FROM zaki_unit_wallets WHERE user_id = $1", [userId]);
    expect(Number(wallet.topup_units)).toBe(0);
    const order = await dbGet(
      "SELECT refunded_units FROM billing_topup_orders WHERE stripe_payment_intent_id = $1",
      [paymentIntentId]
    );
    expect(Number(order.refunded_units)).toBe(500);
  });

  it("retains a refund that arrives before its top-up order", async () => {
    const paymentIntentId = `pi_early_${Date.now()}`;
    const result = await clawbackTopupByPaymentIntent({
      withDbTransaction,
      paymentIntentId,
      refundedAmountCents: 1000,
      fullRefund: true,
      eventId: "evt_early",
    });
    expect(result).toMatchObject({ handled: false, pending: true });

    const pending = await withDbTransaction((client) => resolvePendingTopupRefund({
      client,
      paymentIntentId,
      grantedUnits: 500,
      amountTotalCents: 1000,
    }));
    expect(pending).toMatchObject({ refundedUnits: 500, fullRefund: true });
  });
});
