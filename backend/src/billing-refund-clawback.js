import { ensureWallet } from "./unit-ledger.js";

function stripeId(value) {
  if (typeof value === "string") return value.trim() || null;
  if (value && typeof value === "object") return String(value.id || "").trim() || null;
  return null;
}

function nonNegativeInteger(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

export function computeRefundedTopupUnits({
  grantedUnits,
  amountTotalCents,
  refundedAmountCents,
  fullRefund = false,
} = {}) {
  const units = Math.max(0, Number(grantedUnits || 0));
  if (fullRefund) return units;
  const total = nonNegativeInteger(amountTotalCents);
  const refunded = nonNegativeInteger(refundedAmountCents);
  if (!total || refunded === null) return units;
  return Math.min(units, Math.ceil(units * Math.min(refunded, total) / total));
}

async function resolveInvoiceContext({ invoice, stripe }) {
  let resolved = invoice && typeof invoice === "object" ? invoice : null;
  const invoiceId = stripeId(invoice);
  if (!resolved && invoiceId && stripe?.invoices?.retrieve) {
    resolved = await stripe.invoices.retrieve(invoiceId);
  }
  return {
    customerId: stripeId(resolved?.customer),
    paymentIntentId: stripeId(resolved?.payment_intent),
    subscriptionId: stripeId(resolved?.subscription),
  };
}

export async function resolveStripeRefundContext({ event, stripe } = {}) {
  const object = event?.data?.object || {};
  if (event?.type === "charge.refunded") {
    const invoice = await resolveInvoiceContext({ invoice: object.invoice, stripe });
    return {
      paymentIntentId: stripeId(object.payment_intent) || invoice.paymentIntentId,
      customerId: stripeId(object.customer) || invoice.customerId,
      subscriptionId: invoice.subscriptionId,
      refundedAmountCents: nonNegativeInteger(object.amount_refunded),
      fullRefund: Boolean(object.refunded),
    };
  }

  if (event?.type === "credit_note.created") {
    let refund = object.refund && typeof object.refund === "object" ? object.refund : null;
    const refundId = stripeId(object.refund);
    if (!refund && refundId && stripe?.refunds?.retrieve) {
      refund = await stripe.refunds.retrieve(refundId);
    }
    const invoice = await resolveInvoiceContext({ invoice: object.invoice, stripe });
    return {
      paymentIntentId: stripeId(refund?.payment_intent) || invoice.paymentIntentId,
      customerId: stripeId(object.customer) || stripeId(refund?.customer) || invoice.customerId,
      subscriptionId: invoice.subscriptionId,
      refundedAmountCents:
        nonNegativeInteger(refund?.amount) ?? nonNegativeInteger(object.amount),
      fullRefund: false,
    };
  }

  return {
    paymentIntentId: null,
    customerId: null,
    subscriptionId: null,
    refundedAmountCents: null,
    fullRefund: false,
  };
}

export async function clawbackTopupByPaymentIntent({
  withDbTransaction,
  paymentIntentId,
  refundedAmountCents,
  fullRefund,
  eventId,
} = {}) {
  if (!paymentIntentId) return { handled: false, reason: "missing_payment_intent" };
  return withDbTransaction(async (client) => {
    const result = await client.query(
      `SELECT id, user_id, units, amount_total_cents, refunded_units, refunded_amount_cents
       FROM billing_topup_orders
       WHERE stripe_payment_intent_id = $1
         AND status = 'fulfilled'
       ORDER BY id DESC
       LIMIT 1
       FOR UPDATE`,
      [paymentIntentId]
    );
    const order = result?.rows?.[0] || null;
    if (!order) return { handled: false, reason: "topup_not_found" };

    const targetRefundedUnits = computeRefundedTopupUnits({
      grantedUnits: order.units,
      amountTotalCents: order.amount_total_cents,
      refundedAmountCents,
      fullRefund,
    });
    const alreadyRefundedUnits = Math.max(0, Number(order.refunded_units || 0));
    const unitsToClawback = Math.max(0, targetRefundedUnits - alreadyRefundedUnits);
    const cumulativeRefundedAmount = Math.max(
      Number(order.refunded_amount_cents || 0),
      Number(refundedAmountCents || 0)
    );

    if (unitsToClawback > 0) {
      await client.query(
        `UPDATE zaki_unit_wallets
         SET topup_units = GREATEST(0, topup_units - $2),
             updated_at = NOW(),
             version = version + 1
         WHERE user_id = $1`,
        [order.user_id, unitsToClawback]
      );
    }
    await client.query(
      `UPDATE billing_topup_orders
       SET refunded_units = GREATEST(refunded_units, $2),
           refunded_amount_cents = GREATEST(refunded_amount_cents, $3),
           refund_event_id = COALESCE($4, refund_event_id),
           refunded_at = COALESCE(refunded_at, NOW()),
           updated_at = NOW()
       WHERE id = $1`,
      [order.id, targetRefundedUnits, cumulativeRefundedAmount, eventId || null]
    );

    return {
      handled: true,
      duplicate: unitsToClawback === 0,
      userId: order.user_id,
      unitsClawedBack: unitsToClawback,
      refundedUnits: targetRefundedUnits,
    };
  });
}

export function createRefundClawbackHandler({
  stripe,
  withDbTransaction,
  resolveUserByStripeCustomer,
  dbQuery,
  revokeNullalisEntitlement,
  ensureWalletForPlan = ensureWallet,
} = {}) {
  return async function handleRefundEvent({ event, eventId, requestId } = {}) {
    const context = await resolveStripeRefundContext({ event, stripe });
    const topup = await clawbackTopupByPaymentIntent({
      withDbTransaction,
      paymentIntentId: context.paymentIntentId,
      refundedAmountCents: context.refundedAmountCents,
      fullRefund: context.fullRefund,
      eventId,
    });
    if (topup.handled || !context.subscriptionId || !context.customerId) {
      return { ...context, topup, subscriptionRevoked: false };
    }

    const user = await resolveUserByStripeCustomer(context.customerId, null);
    if (!user) return { ...context, topup, subscriptionRevoked: false };

    await dbQuery(
      `UPDATE zaki_users
       SET plan_tier = 'free',
           plan_status = 'canceled',
           current_period_end = NOW(),
           cancel_at_period_end = FALSE,
           stripe_last_event_id = COALESCE($1, stripe_last_event_id),
           billing_updated_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [eventId || null, user.id]
    );
    await ensureWalletForPlan({ userId: user.id, planId: "free" });
    const revokeResult = await revokeNullalisEntitlement(
      {
        ...user,
        plan_tier: "free",
        plan_status: "canceled",
        current_period_end: new Date().toISOString(),
      },
      { requestId }
    );
    if (!revokeResult?.ok) {
      throw new Error(
        `Subscription refund entitlement revoke failed for user ${user.id} (status ${revokeResult?.status || "unknown"}).`
      );
    }
    return { ...context, topup, subscriptionRevoked: true, userId: user.id };
  };
}
