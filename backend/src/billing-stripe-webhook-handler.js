import { ensureWallet } from "./unit-ledger.js";

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

// Nullalis statuses that warrant an immediate revoke push. Other
// statuses either preserve access (active/trialing) or are write-only
// to the DB and don't need out-of-band signaling.
const REVOKE_STATUSES = new Set(["canceled", "past_due", "unpaid", "incomplete_expired"]);
const METER_ENTITLEMENT_ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

function hasMeteredEntitlement(tier, status) {
  return (
    String(tier || "").trim().toLowerCase() !== "free" &&
    METER_ENTITLEMENT_ACTIVE_STATUSES.has(String(status || "").trim().toLowerCase())
  );
}

async function fireRevoke({ revokeNullalisEntitlement, user, requestId, eventType }) {
  if (!revokeNullalisEntitlement || !user) return;
  try {
    const result = await revokeNullalisEntitlement(user, { requestId });
    if (!result?.ok) {
      console.error("[Stripe] nullalis revoke non-ok:", {
        eventType,
        userId: user.id,
        upstreamStatus: result?.status,
        upstreamData: result?.data,
      });
    }
  } catch (err) {
    // Revoke is best-effort: if nullalis can't hear the push, the BFF's
    // next provision call (Commit 1) will still carry the correct
    // entitlement tuple. Don't let this throw bubble the webhook 500.
    console.error("[Stripe] nullalis revoke threw:", {
      eventType,
      userId: user?.id,
      error: err?.message || String(err),
    });
  }
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
  fulfillAccessCodePurchaseCheckoutSession,
  revokeNullalisEntitlement = null,
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
        if (typeof fulfillAccessCodePurchaseCheckoutSession === "function") {
          await fulfillAccessCodePurchaseCheckoutSession({
            session,
            eventId,
          });
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
        const currentPeriodStart =
          toIsoFromUnixSeconds(subscription.current_period_start) || incomingEventCreatedAt;

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
            const meteredEntitlementActive = hasMeteredEntitlement(tierToStore, statusToStore);

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
                   meter_entitlement_started_at = CASE
                     WHEN $10::boolean THEN
                       CASE
                         WHEN meter_entitlement_started_at IS NULL
                           OR plan_status NOT IN ('active', 'trialing', 'past_due')
                           OR plan_tier = 'free'
                         THEN COALESCE($11::timestamptz, NOW())
                         ELSE meter_entitlement_started_at
                       END
                     ELSE NULL
                   END,
                   billing_updated_at = NOW(),
                   updated_at = NOW()
               WHERE id = $12`,
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
                meteredEntitlementActive,
                currentPeriodStart,
                user.id,
              ]
            );

            // Best-effort: re-sync the unit wallet allowance to the new plan.
            // markWebhookEventProcessed already marked this event up front, so a
            // throw here would make Stripe's retry a skipped duplicate and lose
            // the re-provision — keep it non-fatal.
            try {
              await ensureWallet({ userId: user.id, planId: tierToStore });
            } catch (e) {
              console.error(
                `[Billing] ensureWallet after ${event.type} failed (non-fatal) user=${user.id}: ${e?.message}`
              );
            }

            if (
              event.type === "customer.subscription.deleted" ||
              (event.type === "customer.subscription.updated" && REVOKE_STATUSES.has(statusToStore))
            ) {
              await fireRevoke({
                revokeNullalisEntitlement,
                user: {
                  ...user,
                  plan_tier: tierToStore,
                  plan_status: statusToStore,
                  current_period_end: currentPeriodEnd,
                },
                requestId: req.requestId || null,
                eventType: event.type,
              });
            }
          }
        }
      }

      // S2.7 — payment failure. Flip plan_status to past_due and push an
      // immediate revoke so nullalis's Sprint 2 chokepoints see the
      // degraded state without waiting for the next provision call.
      if (event.type === "invoice.payment_failed") {
        const invoice = event.data.object;
        const customerId = invoice?.customer;
        if (customerId) {
          const user = await resolveUserByStripeCustomer(customerId, invoice?.customer_email);
          if (user) {
            await dbQuery(
              `UPDATE zaki_users
               SET plan_status = 'past_due',
                   stripe_last_event_id = COALESCE($1, stripe_last_event_id),
                   billing_updated_at = NOW(),
                   updated_at = NOW()
               WHERE id = $2`,
              [eventId || null, user.id]
            );
            await fireRevoke({
              revokeNullalisEntitlement,
              user: { ...user, plan_status: "past_due" },
              requestId: req.requestId || null,
              eventType: event.type,
            });
          }
        }
      }

      // S2.7 — dispute. The Dispute object only carries `charge` (id);
      // we fetch the charge to resolve customer. If retrieve fails we
      // log and skip: better no revoke than wrong-user revoke.
      if (event.type === "charge.dispute.created") {
        const dispute = event.data.object;
        const chargeId = dispute?.charge;
        let customerId = null;
        if (chargeId && stripe?.charges?.retrieve) {
          try {
            const charge = await stripe.charges.retrieve(chargeId);
            customerId = charge?.customer || null;
          } catch (err) {
            console.error("[Stripe] dispute: charge retrieve failed:", {
              chargeId,
              error: err?.message || String(err),
            });
          }
        }
        if (customerId) {
          const user = await resolveUserByStripeCustomer(customerId, null);
          if (user) {
            await dbQuery(
              `UPDATE zaki_users
               SET plan_status = 'past_due',
                   stripe_last_event_id = COALESCE($1, stripe_last_event_id),
                   billing_updated_at = NOW(),
                   updated_at = NOW()
               WHERE id = $2`,
              [eventId || null, user.id]
            );
            await fireRevoke({
              revokeNullalisEntitlement,
              user: { ...user, plan_status: "past_due" },
              requestId: req.requestId || null,
              eventType: event.type,
            });
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
