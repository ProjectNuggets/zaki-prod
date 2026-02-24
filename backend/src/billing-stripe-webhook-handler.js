function toIsoFromUnixSeconds(value) {
  const seconds = Number(value || 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const iso = new Date(seconds * 1000).toISOString();
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

export function isIncomingStripeEventStale({
  lastAppliedEventCreatedAt,
  incomingEventCreatedAt,
} = {}) {
  const lastTs = Date.parse(String(lastAppliedEventCreatedAt || ""));
  const incomingTs = Date.parse(String(incomingEventCreatedAt || ""));
  if (!Number.isFinite(lastTs) || !Number.isFinite(incomingTs)) return false;
  return incomingTs < lastTs;
}

export function createStripeWebhookHandler({
  getBillingConfigStatus,
  stripe,
  stripeWebhookSecret,
  markWebhookEventProcessed,
  billingHealth,
  emitBillingAlert,
  normalizeEmail,
  dbGet,
  dbQuery,
  resolveUserByStripeCustomer,
  resolveTier,
  tierByPrice,
} = {}) {
  return async function stripeWebhookHandler(req, res) {
    const billingConfig = getBillingConfigStatus();
    if (billingConfig.provider !== "stripe") {
      await emitBillingAlert({
        provider: "stripe",
        id: "stripe.webhook.provider_unavailable",
        severity: "medium",
        message: "Stripe webhook received while active billing provider is not stripe.",
        details: {
          statusCode: 503,
          configuredProvider: billingConfig.provider,
          path: req.path,
          requestId: req.requestId || null,
        },
      });
      res.status(503).json({
        success: false,
        code: "billing_unavailable",
        error: "Billing webhook is not configured for an active provider.",
      });
      return;
    }
    if (!stripe || !stripeWebhookSecret) {
      await emitBillingAlert({
        provider: "stripe",
        id: "stripe.webhook.unconfigured",
        severity: "medium",
        message: "Stripe webhook called but Stripe secret/webhook secret is not configured.",
        details: {
          statusCode: 503,
          hasStripeClient: Boolean(stripe),
          hasWebhookSecret: Boolean(stripeWebhookSecret),
          path: req.path,
          requestId: req.requestId || null,
        },
      });
      res.status(503).json({
        success: false,
        code: "billing_unavailable",
        error: "Stripe webhook is not configured.",
      });
      return;
    }
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      await emitBillingAlert({
        provider: "stripe",
        id: "stripe.webhook.missing_signature",
        severity: "medium",
        message: "Stripe webhook request missing stripe-signature header.",
        details: {
          statusCode: 400,
          path: req.path,
          requestId: req.requestId || null,
        },
      });
      res.status(400).json({ error: "Missing Stripe signature." });
      return;
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
    } catch (error) {
      await emitBillingAlert({
        provider: "stripe",
        id: "stripe.webhook.invalid_signature",
        severity: "high",
        message: "Stripe webhook signature validation failed.",
        details: {
          statusCode: 400,
          path: req.path,
          requestId: req.requestId || null,
          error: error?.message || String(error),
        },
      });
      res.status(400).send(`Webhook Error: ${error.message}`);
      return;
    }

    try {
      const eventId = String(event?.id || "").trim();
      const eventType = String(event?.type || "").trim();
      let staleSkipped = false;

      billingHealth.recordReceived("stripe", { eventId, eventType });
      if (eventId) {
        const shouldProcess = await markWebhookEventProcessed("stripe", eventId);
        if (!shouldProcess) {
          billingHealth.recordDuplicate("stripe", { eventId, eventType });
          res.status(200).json({ received: true, duplicate: true });
          return;
        }
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const customerId = session.customer;
        const email = session.customer_email || session.metadata?.user_email;
        if (customerId && email) {
          const normalizedEmail = normalizeEmail(email);
          const zakiUser = await dbGet("SELECT id FROM zaki_users WHERE email = $1", [normalizedEmail]);
          if (zakiUser) {
            await dbQuery(
              `UPDATE zaki_users
               SET stripe_customer_id = $1, billing_updated_at = NOW(), updated_at = NOW()
               WHERE id = $2`,
              [customerId, zakiUser.id]
            );
          }
        }
      }

      if (
        event.type === "customer.subscription.created" ||
        event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.deleted"
      ) {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const priceId = subscription.items?.data?.[0]?.price?.id || null;
        const tierFromPrice = priceId ? tierByPrice[priceId] : null;
        const tierFromMetadata = subscription.metadata?.plan_tier;
        const resolvedTier = resolveTier(tierFromPrice || tierFromMetadata || "free");
        const status = subscription.status || "inactive";
        const currentPeriodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;
        const cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);
        const incomingEventCreatedAt = toIsoFromUnixSeconds(event?.created);

        const user = await resolveUserByStripeCustomer(customerId, subscription.metadata?.user_email);
        if (user) {
          if (
            isIncomingStripeEventStale({
              lastAppliedEventCreatedAt: user.stripe_last_event_created_at,
              incomingEventCreatedAt,
            })
          ) {
            staleSkipped = true;
          } else {
            const tierToStore =
              event.type === "customer.subscription.deleted" ? "free" : resolvedTier;
            const statusToStore =
              event.type === "customer.subscription.deleted" ? "canceled" : status;

            await dbQuery(
              `UPDATE zaki_users
               SET stripe_customer_id = $1,
                   stripe_subscription_id = $2,
                   stripe_price_id = $3,
                   plan_tier = $4,
                   plan_status = $5,
                   current_period_end = $6,
                   cancel_at_period_end = $7,
                   stripe_last_event_created_at = COALESCE($8::timestamptz, stripe_last_event_created_at),
                   stripe_last_event_id = COALESCE($9, stripe_last_event_id),
                   billing_updated_at = NOW(),
                   updated_at = NOW()
               WHERE id = $10`,
              [
                customerId,
                subscription.id,
                priceId,
                tierToStore,
                statusToStore,
                currentPeriodEnd,
                cancelAtPeriodEnd,
                incomingEventCreatedAt,
                eventId || null,
                user.id,
              ]
            );
          }
        }
      }

      billingHealth.recordProcessed("stripe", { eventId, eventType });
      res.json({ received: true, ...(staleSkipped ? { stale: true } : {}) });
    } catch (error) {
      billingHealth.recordFailure("stripe", {
        eventId: String(event?.id || "").trim(),
        eventType: String(event?.type || "").trim(),
        error: error?.message || String(error),
      });
      await emitBillingAlert({
        provider: "stripe",
        id: "stripe.webhook.handler_failed",
        severity: "high",
        message: "Stripe webhook handler failed while processing event.",
        details: {
          eventId: String(event?.id || "").trim(),
          eventType: String(event?.type || "").trim(),
          statusCode: 500,
          path: req.path,
          requestId: req.requestId || null,
          error: error?.message || String(error),
        },
      });
      console.error("[Stripe] Webhook handler error:", error);
      res.status(500).json({ error: "Webhook handler failed." });
    }
  };
}
