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
    invoiceId,
    customerId: stripeId(resolved?.customer),
    paymentIntentId: stripeId(resolved?.payment_intent),
    subscriptionId: stripeId(resolved?.subscription),
  };
}

async function resolveCumulativeChargeRefund({ refund, stripe }) {
  let chargeId = stripeId(refund?.charge);
  const paymentIntentId = stripeId(refund?.payment_intent);
  if (!chargeId && paymentIntentId && stripe?.paymentIntents?.retrieve) {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    chargeId = stripeId(paymentIntent?.latest_charge);
  }
  if (!chargeId || !stripe?.charges?.retrieve) {
    throw new Error("Stripe credit-note refund is missing a retrievable charge.");
  }
  const charge = await stripe.charges.retrieve(chargeId);
  const refundedAmountCents = nonNegativeInteger(charge?.amount_refunded);
  if (refundedAmountCents === null) {
    throw new Error(`Stripe charge ${chargeId} is missing cumulative refund amount.`);
  }
  return {
    paymentIntentId: stripeId(charge?.payment_intent) || paymentIntentId,
    customerId: stripeId(charge?.customer),
    refundedAmountCents,
    fullRefund: Boolean(charge?.refunded),
  };
}

export async function lockPaymentIntentRefund(client, paymentIntentId) {
  if (!paymentIntentId) return;
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
    [paymentIntentId]
  );
}

export async function resolveStripeRefundContext({ event, stripe } = {}) {
  const object = event?.data?.object || {};
  if (event?.type === "charge.refunded") {
    const invoice = await resolveInvoiceContext({ invoice: object.invoice, stripe });
    return {
      paymentIntentId: stripeId(object.payment_intent) || invoice.paymentIntentId,
      customerId: stripeId(object.customer) || invoice.customerId,
      invoiceId: invoice.invoiceId,
      subscriptionId: invoice.subscriptionId,
      refundedAmountCents: nonNegativeInteger(object.amount_refunded),
      fullRefund: Boolean(object.refunded),
      isPaymentRefund: true,
    };
  }

  if (event?.type === "credit_note.created") {
    let refund = object.refund && typeof object.refund === "object" ? object.refund : null;
    const refundId = stripeId(object.refund);
    if (!refund && refundId && stripe?.refunds?.retrieve) {
      refund = await stripe.refunds.retrieve(refundId);
    }
    const invoice = await resolveInvoiceContext({ invoice: object.invoice, stripe });
    const chargeRefund = refund
      ? await resolveCumulativeChargeRefund({ refund, stripe })
      : null;
    return {
      paymentIntentId: chargeRefund?.paymentIntentId || invoice.paymentIntentId,
      customerId: stripeId(object.customer) || chargeRefund?.customerId || invoice.customerId,
      invoiceId: invoice.invoiceId,
      subscriptionId: invoice.subscriptionId,
      refundedAmountCents: chargeRefund?.refundedAmountCents ?? null,
      fullRefund: Boolean(chargeRefund?.fullRefund),
      isPaymentRefund: Boolean(refund),
    };
  }

  return {
    paymentIntentId: null,
    customerId: null,
    invoiceId: null,
    subscriptionId: null,
    refundedAmountCents: null,
    fullRefund: false,
    isPaymentRefund: false,
  };
}

async function recordCumulativeRefund(client, {
  paymentIntentId,
  refundedAmountCents,
  fullRefund,
  eventId,
}) {
  const result = await client.query(
    `INSERT INTO billing_payment_refunds
     (stripe_payment_intent_id, refunded_amount_cents, fully_refunded, latest_event_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (stripe_payment_intent_id)
     DO UPDATE SET
       refunded_amount_cents = GREATEST(billing_payment_refunds.refunded_amount_cents, EXCLUDED.refunded_amount_cents),
       fully_refunded = billing_payment_refunds.fully_refunded OR EXCLUDED.fully_refunded,
       latest_event_id = COALESCE(EXCLUDED.latest_event_id, billing_payment_refunds.latest_event_id),
       updated_at = NOW()
     RETURNING refunded_amount_cents, fully_refunded, latest_event_id`,
    [paymentIntentId, Math.max(0, Number(refundedAmountCents || 0)), Boolean(fullRefund), eventId || null]
  );
  return result?.rows?.[0] || {
    refunded_amount_cents: Math.max(0, Number(refundedAmountCents || 0)),
    fully_refunded: Boolean(fullRefund),
    latest_event_id: eventId || null,
  };
}

export async function resolvePendingTopupRefund({
  client,
  paymentIntentId,
  grantedUnits,
  amountTotalCents,
} = {}) {
  if (!paymentIntentId) {
    return { refundedUnits: 0, refundedAmountCents: 0, fullRefund: false, eventId: null };
  }
  await lockPaymentIntentRefund(client, paymentIntentId);
  const result = await client.query(
    `SELECT refunded_amount_cents, fully_refunded, latest_event_id
     FROM billing_payment_refunds
     WHERE stripe_payment_intent_id = $1
     FOR UPDATE`,
    [paymentIntentId]
  );
  const refund = result?.rows?.[0] || null;
  if (!refund) {
    return { refundedUnits: 0, refundedAmountCents: 0, fullRefund: false, eventId: null };
  }
  const refundedAmount = Math.max(0, Number(refund.refunded_amount_cents || 0));
  const fullRefund = Boolean(refund.fully_refunded);
  return {
    refundedUnits: computeRefundedTopupUnits({
      grantedUnits,
      amountTotalCents,
      refundedAmountCents: refundedAmount,
      fullRefund,
    }),
    refundedAmountCents: refundedAmount,
    fullRefund,
    eventId: refund.latest_event_id || null,
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
    await lockPaymentIntentRefund(client, paymentIntentId);
    const result = await client.query(
      `SELECT id, user_id, status, units, amount_total_cents, refunded_units, refunded_amount_cents
       FROM billing_topup_orders
       WHERE stripe_payment_intent_id = $1
       ORDER BY id DESC
       LIMIT 1
       FOR UPDATE`,
      [paymentIntentId]
    );
    const order = result?.rows?.[0] || null;
    const cumulativeRefund = await recordCumulativeRefund(client, {
      paymentIntentId,
      refundedAmountCents,
      fullRefund,
      eventId,
    });
    if (!order) return { handled: false, pending: true, reason: "topup_not_found" };
    if (order.status !== "fulfilled") {
      return { handled: false, pending: true, reason: "topup_not_fulfilled" };
    }

    const targetRefundedUnits = computeRefundedTopupUnits({
      grantedUnits: order.units,
      amountTotalCents: order.amount_total_cents,
      refundedAmountCents: cumulativeRefund.refunded_amount_cents,
      fullRefund: cumulativeRefund.fully_refunded,
    });
    const alreadyRefundedUnits = Math.max(0, Number(order.refunded_units || 0));
    const unitsToClawback = Math.max(0, targetRefundedUnits - alreadyRefundedUnits);
    const cumulativeRefundedAmount = Math.max(
      Number(order.refunded_amount_cents || 0),
      Number(cumulativeRefund.refunded_amount_cents || 0)
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
      [order.id, targetRefundedUnits, cumulativeRefundedAmount, cumulativeRefund.latest_event_id || null]
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
    if (context.subscriptionId) {
      if (!context.isPaymentRefund || !context.fullRefund || !context.customerId) {
        return { ...context, topup: { handled: false }, subscriptionRevoked: false };
      }

      const subscription = await stripe.subscriptions.retrieve(context.subscriptionId);
      const latestInvoiceId = stripeId(subscription?.latest_invoice);
      if (context.invoiceId && latestInvoiceId && context.invoiceId !== latestInvoiceId) {
        return { ...context, topup: { handled: false }, subscriptionRevoked: false };
      }
      const user = await resolveUserByStripeCustomer(context.customerId, null);
      if (!user) return { ...context, topup: { handled: false }, subscriptionRevoked: false };
      const stripeStatus = String(subscription?.status || "").trim().toLowerCase();
      const planStatus = ["canceled", "unpaid", "past_due", "incomplete_expired"].includes(stripeStatus)
        ? stripeStatus
        : "unpaid";
      const currentPeriodEnd = subscription?.current_period_end
        ? new Date(Number(subscription.current_period_end) * 1000).toISOString()
        : user.current_period_end || null;
      const incomingEventCreatedAt = Number(event?.created) > 0
        ? new Date(Number(event.created) * 1000).toISOString()
        : null;

      await dbQuery(
        `UPDATE zaki_users
         SET plan_status = $1,
             current_period_end = $2,
             cancel_at_period_end = $3,
             stripe_last_event_created_at = CASE
               WHEN $4::timestamptz IS NULL THEN stripe_last_event_created_at
               WHEN stripe_last_event_created_at IS NULL OR stripe_last_event_created_at < $4::timestamptz
                 THEN $4::timestamptz
               ELSE stripe_last_event_created_at
             END,
             stripe_last_event_id = COALESCE($5, stripe_last_event_id),
             billing_updated_at = NOW(),
             updated_at = NOW()
         WHERE id = $6`,
        [
          planStatus,
          currentPeriodEnd,
          Boolean(subscription?.cancel_at_period_end),
          incomingEventCreatedAt,
          eventId || null,
          user.id,
        ]
      );
      await ensureWalletForPlan({ userId: user.id, planId: "free" });
      const revokedUser = { ...user, plan_status: planStatus, current_period_end: currentPeriodEnd };
      const revokeResult = await revokeNullalisEntitlement(revokedUser, { requestId });
      if (!revokeResult?.ok) {
        throw new Error(
          `Subscription refund entitlement revoke failed for user ${user.id} (status ${revokeResult?.status || "unknown"}).`
        );
      }
      return { ...context, topup: { handled: false }, subscriptionRevoked: true, userId: user.id };
    }

    if (!context.isPaymentRefund) {
      return { ...context, topup: { handled: false }, subscriptionRevoked: false };
    }
    const topup = await clawbackTopupByPaymentIntent({
      withDbTransaction,
      paymentIntentId: context.paymentIntentId,
      refundedAmountCents: context.refundedAmountCents,
      fullRefund: context.fullRefund,
      eventId,
    });
    return { ...context, topup, subscriptionRevoked: false };
  };
}
