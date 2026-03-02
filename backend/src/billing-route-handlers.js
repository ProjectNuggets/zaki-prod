import { z } from "zod";

export const BillingReconcileSchema = z
  .object({
    userId: z.number().int().positive().optional(),
    email: z.string().trim().email().optional(),
    retryCount: z.number().int().min(0).max(4).optional(),
  })
  .refine((value) => Boolean(value?.userId || value?.email), {
    message: "Provide userId or email.",
  });

function parseSchema(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error?.issues || [];
    return {
      valid: false,
      error: issues.map((issue) => issue.message).join(", ") || "Invalid request payload.",
    };
  }
  return { valid: true, data: result.data };
}

export function createBillingSyncHandler({
  getBillingConfigStatus,
  requireAuthUser,
  syncStripeSubscriptionState,
  runBillingSyncWithRetries,
  resolveSyncMaxAttempts,
  logError = console.error,
} = {}) {
  return async function billingSyncHandler(req, res) {
    try {
      const configured = getBillingConfigStatus();
      if (configured.provider !== "stripe") {
        res.status(400).json({
          success: false,
          error: "Billing sync is only supported for Stripe provider.",
        });
        return;
      }

      const authResult = (await requireAuthUser(req, res)) || {};
      const { email, zakiUser } = authResult;
      if (!email || !zakiUser) return;

      const syncResult = await runBillingSyncWithRetries(
        () => syncStripeSubscriptionState({ email, zakiUser }),
        {
          maxAttempts: resolveSyncMaxAttempts(1),
        }
      );
      res.status(200).json({
        success: true,
        ...syncResult.result,
        attemptsUsed: syncResult.attemptsUsed,
      });
    } catch (error) {
      logError("[Billing] Sync error:", error);
      res.status(error?.status || 500).json({ error: error?.message || "Billing sync failed." });
    }
  };
}

export function createBillingReconcileHandler({
  requireAdminUser,
  getBillingConfigStatus,
  dbGet,
  normalizeEmail,
  syncStripeSubscriptionState,
  runBillingSyncWithRetries,
  resolveSyncMaxAttempts,
  logError = console.error,
} = {}) {
  return async function billingReconcileHandler(req, res) {
    try {
      const authResult = await requireAdminUser(req, res);
      if (!authResult) return;

      const configured = getBillingConfigStatus();
      if (configured.provider !== "stripe") {
        res.status(400).json({
          success: false,
          error: "Billing reconciliation is only supported for Stripe provider.",
        });
        return;
      }

      const validation = parseSchema(BillingReconcileSchema, req.body || {});
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: validation.error,
        });
        return;
      }

      const byUserId = Number(validation.data.userId || 0);
      const byEmail = validation.data.email ? normalizeEmail(validation.data.email) : "";
      const user = byUserId
        ? await dbGet(
            `SELECT id, email, stripe_customer_id, plan_tier, plan_status, stripe_last_event_created_at
             FROM zaki_users
             WHERE id = $1`,
            [byUserId]
          )
        : await dbGet(
            `SELECT id, email, stripe_customer_id, plan_tier, plan_status, stripe_last_event_created_at
             FROM zaki_users
             WHERE email = $1`,
            [byEmail]
          );

      if (!user) {
        res.status(404).json({
          success: false,
          error: "User not found for reconciliation.",
        });
        return;
      }

      const maxAttempts = resolveSyncMaxAttempts(validation.data.retryCount);
      const syncResult = await runBillingSyncWithRetries(
        () => syncStripeSubscriptionState({ email: user.email, zakiUser: user }),
        { maxAttempts }
      );

      res.status(200).json({
        success: true,
        userId: user.id,
        email: user.email,
        attemptsUsed: syncResult.attemptsUsed,
        maxAttempts: syncResult.maxAttempts,
        ...syncResult.result,
      });
    } catch (error) {
      logError("[Billing] Reconcile error:", error);
      res.status(error?.status || 500).json({
        error: error?.message || "Billing reconciliation failed.",
      });
    }
  };
}
