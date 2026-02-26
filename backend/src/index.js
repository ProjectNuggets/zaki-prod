import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { initDb, dbGet, dbQuery, withDbTransaction } from "./db.js";
import {
  resolveLegalPolicyVersion,
  buildLoginSchema,
  buildSignupSchema,
  buildLegalConsentShape,
  validateLegalPolicyVersion,
  buildConsentStatus,
} from "./legal-consent.js";
import { validateRuntimeConfig } from "./config-validation.js";
import { createMemoryRoutes, buildContext, findDuplicateMemory } from "./memory/index.js";
import {
  configureMemoryTelemetryAlerts,
  getMemoryTelemetrySnapshot,
  recordMemoryTelemetry,
} from "./memory/telemetry.js";
import { extractFacts } from "./memory-extraction.js";
import { summarizeConversation } from "./memory/session-summary.js";
import { createSessionEndHandler } from "./memory/session-end-route.js";
import { buildStreamUpstreamPayload, extractStreamMessage } from "./chat-proxy.js";
import { markWebhookEventProcessed as markWebhookEventProcessedOnce } from "./billing-webhook-events.js";
import { createBillingHealthTracker } from "./billing-health.js";
import { createBillingAlertDispatcher } from "./billing-alerts.js";
import {
  buildStripePricingCatalog,
  normalizeBillingInterval,
  resolveStripePriceDetailsById,
  resolveStripePriceForSelection,
} from "./billing-pricing.js";
import {
  resolveSyncMaxAttempts,
  runBillingSyncWithRetries,
} from "./billing-reconciliation.js";
import {
  createBillingSyncHandler,
  createBillingReconcileHandler,
} from "./billing-route-handlers.js";
import { createStripeWebhookHandler } from "./billing-stripe-webhook-handler.js";

// Load environment variables from the first valid .env location.
const envCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "backend", ".env"),
  path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", ".env"),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

// =============================================================================
// P0 FIX: Preview memories instead of auto-storing
// =============================================================================
async function previewAndNotify({ userId, message, threadId = null }) {
  const facts = await extractFacts(message);
  
  if (facts.length === 0) {
    return { pending: 0 };
  }
  
  let pending = 0;
  
  for (const fact of facts) {
    const duplicate = await findDuplicateMemory({
      userId,
      content: fact.content,
      conflictKey: fact.conflictKey,
      polarity: fact.polarity,
    });
    if (duplicate) continue;
    
    // Stage for confirmation
    const id = crypto.randomUUID();
    await dbQuery(
      `INSERT INTO memory_confirmations (id, user_id, content, type, source_thread_id, source_message_id, conflict_key, polarity, confidence_score, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW())`,
      [id, userId, fact.content, fact.type, threadId, null, fact.conflictKey || null, fact.polarity || null, 0.8]
    );
    pending++;
  }
  
  // Create notification
  if (pending > 0) {
    await dbQuery(
      `INSERT INTO memory_notifications (id, user_id, type, title, message, read, created_at)
       VALUES ($1, $2, 'memory_extracted', 'New memories', $3, false, NOW())`,
      [crypto.randomUUID(), userId, `ZAKI learned ${pending} thing${pending > 1 ? 's' : ''} about you`]
    );
  }
  
  return { pending };
}

function normalizeEmailValue(value) {
  return String(value || "").trim().toLowerCase();
}

const app = express();
const billingHealth = createBillingHealthTracker();
const PORT = Number(process.env.PORT || 8787);
const isProduction = process.env.NODE_ENV === "production";
const NOVA_TYP_BASE_URL = (process.env.NOVA_TYP_BASE_URL || "").trim();
const NOVA_TYP_API_KEY = (process.env.NOVA_TYP_API_KEY || "").trim();
const ZAKI_PUBLIC_URL = (process.env.ZAKI_PUBLIC_URL || "").trim();
const ZAKI_APP_URL = (process.env.ZAKI_APP_URL || "").trim();
const ZAKI_DEFAULT_WORKSPACE_SLUG = (process.env.ZAKI_DEFAULT_WORKSPACE_SLUG || "").trim();
const ZAKI_EMAIL_MODE = (process.env.ZAKI_EMAIL_MODE || "console").trim();
const STRIPE_SECRET_KEY = (process.env.STRIPE_SECRET_KEY || "").trim();
const STRIPE_WEBHOOK_SECRET = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
const STRIPE_PRICE_STUDENT = (process.env.STRIPE_PRICE_STUDENT || "").trim();
const STRIPE_PRICE_PERSONAL = (process.env.STRIPE_PRICE_PERSONAL || "").trim();
const STRIPE_PRICE_STUDENT_YEARLY = (process.env.STRIPE_PRICE_STUDENT_YEARLY || "").trim();
const STRIPE_PRICE_PERSONAL_YEARLY = (process.env.STRIPE_PRICE_PERSONAL_YEARLY || "").trim();
const ZAKI_BILLING_PROVIDER = (process.env.ZAKI_BILLING_PROVIDER || "stripe")
  .trim()
  .toLowerCase();
const ZAKI_EXTERNAL_CHECKOUT_URL_STUDENT = (
  process.env.ZAKI_EXTERNAL_CHECKOUT_URL_STUDENT || ""
).trim();
const ZAKI_EXTERNAL_CHECKOUT_URL_PERSONAL = (
  process.env.ZAKI_EXTERNAL_CHECKOUT_URL_PERSONAL || ""
).trim();
const ZAKI_EXTERNAL_PORTAL_URL = (process.env.ZAKI_EXTERNAL_PORTAL_URL || "").trim();
const ZAKI_EXTERNAL_PROVIDER_LABEL = (
  process.env.ZAKI_EXTERNAL_PROVIDER_LABEL || "Paddle"
).trim();
const CREEM_API_KEY = (process.env.CREEM_API_KEY || "").trim();
const CREEM_API_BASE_URL = (process.env.CREEM_API_BASE_URL || "https://api.creem.io").trim();
const CREEM_PRODUCT_ID_STUDENT = (process.env.CREEM_PRODUCT_ID_STUDENT || "").trim();
const CREEM_PRODUCT_ID_PERSONAL = (process.env.CREEM_PRODUCT_ID_PERSONAL || "").trim();
const CREEM_SUCCESS_URL = (process.env.CREEM_SUCCESS_URL || "").trim();
const CREEM_WEBHOOK_SECRET = (process.env.CREEM_WEBHOOK_SECRET || "").trim();
const SKIP_EMAIL_VERIFICATION = ["non", "none", "no"].includes(
  ZAKI_EMAIL_MODE.toLowerCase()
);
const ZAKI_VERIFY_TTL_MINUTES = Number(
  process.env.ZAKI_VERIFY_TTL_MINUTES || 60
);
const ZAKI_RESET_TTL_MINUTES = Number(
  process.env.ZAKI_RESET_TTL_MINUTES || 30
);
const ZAKI_LEGAL_POLICY_VERSION = resolveLegalPolicyVersion(
  process.env.ZAKI_LEGAL_POLICY_VERSION
);
const MAX_STREAM_MESSAGE_CHARS = 8000;
const ZAKI_INCLUDE_VERIFY_LINK =
  String(process.env.ZAKI_INCLUDE_VERIFY_LINK || "").toLowerCase() === "true";
const ZAKI_MEMORY_ALERT_WEBHOOK_URL = (
  process.env.ZAKI_MEMORY_ALERT_WEBHOOK_URL || ""
).trim();
const ZAKI_MEMORY_ALERT_WEBHOOK_TOKEN = (
  process.env.ZAKI_MEMORY_ALERT_WEBHOOK_TOKEN || ""
).trim();
const ZAKI_MEMORY_ALERT_TIMEOUT_MS = Math.max(
  500,
  Number(process.env.ZAKI_MEMORY_ALERT_TIMEOUT_MS || 4000)
);
const ZAKI_BILLING_ALERT_WEBHOOK_URL = (
  process.env.ZAKI_BILLING_ALERT_WEBHOOK_URL || ""
).trim();
const ZAKI_BILLING_ALERT_WEBHOOK_TOKEN = (
  process.env.ZAKI_BILLING_ALERT_WEBHOOK_TOKEN || ""
).trim();
const ZAKI_BILLING_ALERT_TIMEOUT_MS = Math.max(
  500,
  Number(process.env.ZAKI_BILLING_ALERT_TIMEOUT_MS || 4000)
);
const ZAKI_BILLING_ALERT_COOLDOWN_MS = Math.max(
  1000,
  Number(process.env.ZAKI_BILLING_ALERT_COOLDOWN_MS || 180000)
);
const ZAKI_ENABLE_SESSION_SUMMARIZATION =
  String(process.env.ZAKI_ENABLE_SESSION_SUMMARIZATION || "")
    .toLowerCase()
    .trim() === "true";
const ZAKI_WORKSPACE_SOFT_HIDE_FALLBACK_ENABLED =
  String(process.env.ZAKI_WORKSPACE_SOFT_HIDE_FALLBACK_ENABLED || "true")
    .toLowerCase()
    .trim() !== "false";
const superAdminEmailSet = new Set(["as@novanuggets.com"]);
const allowedOrigins = (process.env.ZAKI_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const billingAlertDispatcher = createBillingAlertDispatcher({
  webhookUrl: ZAKI_BILLING_ALERT_WEBHOOK_URL,
  webhookToken: ZAKI_BILLING_ALERT_WEBHOOK_TOKEN,
  timeoutMs: ZAKI_BILLING_ALERT_TIMEOUT_MS,
  cooldownMs: ZAKI_BILLING_ALERT_COOLDOWN_MS,
});

const configReport = validateRuntimeConfig(process.env);
if (configReport.warnings.length > 0) {
  for (const warning of configReport.warnings) {
    console.warn(`[Config] ${warning.key}: ${warning.message}`);
  }
}
if (isProduction && !configReport.ok) {
  const details = configReport.errors
    .map((issue) => `${issue.key}: ${issue.message}`)
    .join(" | ");
  throw new Error(`[Config] Invalid production configuration. ${details}`);
}

const ACCESS_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
let stripe = null;
if (STRIPE_SECRET_KEY) {
  try {
    const StripeModule = await import("stripe");
    const StripeCtor = StripeModule?.default || StripeModule;
    stripe = new StripeCtor(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  } catch (err) {
    console.warn("[Stripe] Stripe SDK not installed. Billing endpoints disabled.");
  }
}

const stripePricingCatalog = buildStripePricingCatalog({
  studentMonthly: STRIPE_PRICE_STUDENT,
  studentYearly: STRIPE_PRICE_STUDENT_YEARLY,
  personalMonthly: STRIPE_PRICE_PERSONAL,
  personalYearly: STRIPE_PRICE_PERSONAL_YEARLY,
});
const PRICE_BY_PLAN_INTERVAL = stripePricingCatalog.priceByPlanInterval;
const PRICE_DETAILS_BY_ID = stripePricingCatalog.priceDetailsById;
const TIER_BY_PRICE = stripePricingCatalog.tierByPrice;

function getStripePricingAvailability() {
  return stripePricingCatalog.pricingAvailability;
}

function isStripeProviderSelected() {
  return ZAKI_BILLING_PROVIDER === "stripe";
}

function isExternalProviderSelected() {
  return ZAKI_BILLING_PROVIDER === "external" || ZAKI_BILLING_PROVIDER === "paddle";
}

function isCreemProviderSelected() {
  return ZAKI_BILLING_PROVIDER === "creem";
}

function getCheckoutProviderOptions() {
  const pricingAvailability = getStripePricingAvailability();
  const stripeHasConfiguredPrice = Object.values(pricingAvailability).some(
    (item) => item.monthly || item.yearly
  );
  const stripeCheckoutEnabled = Boolean(
    stripe && stripeHasConfiguredPrice
  );
  const externalCheckoutEnabled = Boolean(
    ZAKI_EXTERNAL_CHECKOUT_URL_STUDENT && ZAKI_EXTERNAL_CHECKOUT_URL_PERSONAL
  );
  const creemCheckoutEnabled = Boolean(
    CREEM_API_KEY && CREEM_PRODUCT_ID_STUDENT && CREEM_PRODUCT_ID_PERSONAL
  );

  return [
    {
      key: "stripe",
      label: "Stripe",
      enabled: stripeCheckoutEnabled,
    },
    {
      key: "paddle",
      label: ZAKI_EXTERNAL_PROVIDER_LABEL || "Paddle",
      enabled: externalCheckoutEnabled,
    },
    {
      key: "creem",
      label: "Creem",
      enabled: creemCheckoutEnabled,
    },
  ];
}

function getActiveBillingProviderKey() {
  if (isStripeProviderSelected() && stripe) return "stripe";
  if (isCreemProviderSelected()) return "creem";
  if (isExternalProviderSelected()) return "paddle";
  return "none";
}

function getBillingConfigStatus() {
  const activeProvider = getActiveBillingProviderKey();
  const checkoutProviders = getCheckoutProviderOptions();
  const pricingAvailability = getStripePricingAvailability();
  const stripeHasConfiguredPrice = Object.values(pricingAvailability).some(
    (item) => item.monthly || item.yearly
  );
  const anyCheckoutProviderEnabled = checkoutProviders.some((provider) => provider.enabled);
  if (activeProvider === "creem") {
    const checkoutEnabled = Boolean(
      CREEM_API_KEY && CREEM_PRODUCT_ID_STUDENT && CREEM_PRODUCT_ID_PERSONAL
    );
    const missing = [];
    if (!CREEM_API_KEY) missing.push("creem_api_key");
    if (!CREEM_PRODUCT_ID_STUDENT) missing.push("creem_product_id_student");
    if (!CREEM_PRODUCT_ID_PERSONAL) missing.push("creem_product_id_personal");
    return {
      provider: "creem",
      requestedProvider: ZAKI_BILLING_PROVIDER,
      checkoutProviders,
      stripeEnabled: Boolean(stripe),
      checkoutEnabled,
      portalEnabled: false,
      cancelEnabled: false,
      webhookEnabled: Boolean(CREEM_WEBHOOK_SECRET),
      pricingAvailability,
      missing,
    };
  }
  if (activeProvider === "paddle") {
    const checkoutEnabled = Boolean(
      ZAKI_EXTERNAL_CHECKOUT_URL_STUDENT && ZAKI_EXTERNAL_CHECKOUT_URL_PERSONAL
    );
    const portalEnabled = Boolean(ZAKI_EXTERNAL_PORTAL_URL);
    const missing = [];
    if (!ZAKI_EXTERNAL_CHECKOUT_URL_STUDENT) missing.push("external_checkout_url_student");
    if (!ZAKI_EXTERNAL_CHECKOUT_URL_PERSONAL) missing.push("external_checkout_url_personal");
    if (!ZAKI_EXTERNAL_PORTAL_URL) missing.push("external_portal_url");
    return {
      provider: "paddle",
      requestedProvider: ZAKI_BILLING_PROVIDER,
      checkoutProviders,
      stripeEnabled: Boolean(stripe),
      checkoutEnabled,
      portalEnabled,
      cancelEnabled: false,
      webhookEnabled: false,
      pricingAvailability,
      missing,
    };
  }

  if (activeProvider !== "stripe") {
    const missing = [];
    if (isStripeProviderSelected() && !stripe) {
      missing.push("stripe_secret_key");
    }
    if (!["stripe", "external", "paddle", "creem", "none"].includes(ZAKI_BILLING_PROVIDER)) {
      missing.push("unsupported_billing_provider");
    }
    return {
      provider: activeProvider,
      requestedProvider: ZAKI_BILLING_PROVIDER,
      checkoutProviders,
      stripeEnabled: Boolean(stripe),
      checkoutEnabled: anyCheckoutProviderEnabled,
      portalEnabled: false,
      cancelEnabled: false,
      webhookEnabled: false,
      pricingAvailability,
      missing,
    };
  }

  const stripeEnabled = Boolean(stripe);
  const checkoutEnabled = Boolean(
    stripeEnabled && stripeHasConfiguredPrice
  );
  const portalEnabled = stripeEnabled;
  const cancelEnabled = stripeEnabled;
  const webhookEnabled = Boolean(stripeEnabled && STRIPE_WEBHOOK_SECRET);
  const missing = [];

  if (!stripeEnabled) {
    missing.push("stripe_secret_key");
  }
  if (!PRICE_BY_PLAN_INTERVAL.student.monthly) {
    missing.push("stripe_price_student");
  }
  if (!PRICE_BY_PLAN_INTERVAL.personal.monthly) {
    missing.push("stripe_price_personal");
  }
  if (!PRICE_BY_PLAN_INTERVAL.student.yearly) {
    missing.push("stripe_price_student_yearly");
  }
  if (!PRICE_BY_PLAN_INTERVAL.personal.yearly) {
    missing.push("stripe_price_personal_yearly");
  }
  if (!STRIPE_WEBHOOK_SECRET) {
    missing.push("stripe_webhook_secret");
  }

  return {
    provider: "stripe",
    requestedProvider: ZAKI_BILLING_PROVIDER,
    checkoutProviders,
    stripeEnabled,
    checkoutEnabled: anyCheckoutProviderEnabled,
    portalEnabled,
    cancelEnabled,
    webhookEnabled,
    pricingAvailability,
    missing,
  };
}

function sendBillingUnavailable(res, capability) {
  const configured = getBillingConfigStatus();
  res.status(503).json({
    success: false,
    code: "billing_unavailable",
    capability,
    configured,
    error: "Billing is not configured yet. Please try again later.",
  });
}

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

function normalizeWebhookHexSignature(input) {
  return String(input || "")
    .trim()
    .replace(/^sha256=/i, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function verifyCreemWebhookSignature(rawBody, signatureHeader) {
  if (!CREEM_WEBHOOK_SECRET) return false;
  const received = normalizeWebhookHexSignature(signatureHeader);
  if (!received) return false;
  const expected = crypto
    .createHmac("sha256", CREEM_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  const receivedBuffer = Buffer.from(received, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (receivedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

function resolveCreemPlanTier(payload = {}) {
  const productId =
    payload?.product_id ||
    payload?.product?.id ||
    payload?.line_item?.product_id ||
    payload?.metadata?.product_id ||
    null;
  const metadataTier = payload?.metadata?.plan_tier || payload?.plan_tier || null;
  if (productId && String(productId) === String(CREEM_PRODUCT_ID_STUDENT)) {
    return { tier: "student", productId: String(productId) };
  }
  if (productId && String(productId) === String(CREEM_PRODUCT_ID_PERSONAL)) {
    return { tier: "personal", productId: String(productId) };
  }
  return {
    tier: resolveTier(metadataTier || "free"),
    productId: productId ? String(productId) : null,
  };
}

function parseCreemDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function mapCreemStatus(type, payload = {}) {
  const subscriptionStatus = String(payload?.status || "").toLowerCase();
  const eventType = String(type || "").toLowerCase();
  const cancelAtPeriodEnd = Boolean(
    payload?.cancel_at_period_end ||
      payload?.scheduled_cancel_at ||
      subscriptionStatus === "scheduled_cancel"
  );

  if (
    eventType.includes("subscription.cancel") ||
    eventType.includes("subscription.expire") ||
    eventType.includes("subscription.pause") ||
    subscriptionStatus === "canceled" ||
    subscriptionStatus === "expired" ||
    subscriptionStatus === "paused"
  ) {
    return { tier: "free", status: "canceled", cancelAtPeriodEnd: false };
  }

  if (subscriptionStatus === "trialing" || eventType.includes("trialing")) {
    return { tier: null, status: "trialing", cancelAtPeriodEnd };
  }
  if (subscriptionStatus === "past_due" || eventType.includes("past_due")) {
    return { tier: null, status: "past_due", cancelAtPeriodEnd };
  }

  // Default: keep access active for paid lifecycle events.
  return { tier: null, status: "active", cancelAtPeriodEnd };
}

async function resolveUserForCreemWebhook(payload = {}) {
  const metadataUserId = Number(payload?.metadata?.user_id || payload?.user_id || 0);
  if (Number.isInteger(metadataUserId) && metadataUserId > 0) {
    const byId = await dbGet("SELECT id, email FROM zaki_users WHERE id = $1", [metadataUserId]);
    if (byId) return byId;
  }

  const candidateEmail =
    payload?.customer_email ||
    payload?.customer?.email ||
    payload?.email ||
    payload?.metadata?.user_email ||
    null;
  if (!candidateEmail) return null;
  const normalized = normalizeEmail(candidateEmail);
  return dbGet("SELECT id, email FROM zaki_users WHERE email = $1", [normalized]);
}

async function handleCreemWebhookEvent(eventType, payload = {}) {
  const user = await resolveUserForCreemWebhook(payload);
  if (!user) return;

  const { tier: productTier, productId } = resolveCreemPlanTier(payload);
  const statusState = mapCreemStatus(eventType, payload);
  const finalTier = resolveTier(statusState.tier || productTier || "free");
  const subscriptionId =
    payload?.subscription_id || payload?.subscription?.id || payload?.id || null;
  const customerId =
    payload?.customer_id || payload?.customer?.id || payload?.metadata?.customer_id || null;
  const currentPeriodEnd =
    parseCreemDate(payload?.current_period_end) ||
    parseCreemDate(payload?.period_end) ||
    parseCreemDate(payload?.renews_at) ||
    parseCreemDate(payload?.ends_at) ||
    null;

  await dbQuery(
    `UPDATE zaki_users
     SET creem_customer_id = $1,
         creem_subscription_id = $2,
         creem_product_id = $3,
         plan_tier = $4,
         plan_status = $5,
         current_period_end = $6,
         cancel_at_period_end = $7,
         billing_updated_at = NOW(),
         updated_at = NOW()
     WHERE id = $8`,
    [
      customerId,
      subscriptionId,
      productId,
      finalTier,
      statusState.status,
      currentPeriodEnd,
      statusState.cancelAtPeriodEnd,
      user.id,
    ]
  );
}

async function creemWebhookHandler(req, res) {
  if (!CREEM_WEBHOOK_SECRET) {
    await emitBillingAlert({
      provider: "creem",
      id: "creem.webhook.unconfigured",
      severity: "medium",
      message: "Creem webhook called but secret is not configured.",
      details: {
        statusCode: 503,
        path: req.path,
        requestId: req.requestId || null,
      },
    });
    res.status(503).json({
      success: false,
      code: "billing_unavailable",
      error: "Creem webhook is not configured.",
    });
    return;
  }

  const signature =
    req.headers["x-creem-signature"] ||
    req.headers["creem-signature"] ||
    req.headers["x-signature"];
  if (!signature) {
    await emitBillingAlert({
      provider: "creem",
      id: "creem.webhook.missing_signature",
      severity: "medium",
      message: "Creem webhook request missing signature header.",
      details: {
        statusCode: 400,
        path: req.path,
        requestId: req.requestId || null,
      },
    });
    res.status(400).json({ error: "Missing Creem signature." });
    return;
  }

  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "");
  if (!verifyCreemWebhookSignature(rawBody, signature)) {
    await emitBillingAlert({
      provider: "creem",
      id: "creem.webhook.invalid_signature",
      severity: "high",
      message: "Creem webhook signature validation failed.",
      details: {
        statusCode: 401,
        path: req.path,
        requestId: req.requestId || null,
      },
    });
    res.status(401).json({ error: "Invalid Creem webhook signature." });
    return;
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8") || "{}");
  } catch {
    await emitBillingAlert({
      provider: "creem",
      id: "creem.webhook.invalid_json",
      severity: "medium",
      message: "Creem webhook payload JSON parsing failed.",
      details: {
        statusCode: 400,
        path: req.path,
        requestId: req.requestId || null,
      },
    });
    res.status(400).json({ error: "Invalid JSON payload." });
    return;
  }
  const eventType = String(event?.eventType || event?.event_type || event?.type || "").trim();
  const eventPayload = event?.object || event?.data || {};
  const eventId = String(event?.id || event?.event_id || "").trim();
  if (!eventType) {
    await emitBillingAlert({
      provider: "creem",
      id: "creem.webhook.missing_event_type",
      severity: "medium",
      message: "Creem webhook payload missing event type.",
      details: {
        statusCode: 400,
        path: req.path,
        requestId: req.requestId || null,
      },
    });
    res.status(400).json({ error: "Missing webhook event type." });
    return;
  }

  try {
    billingHealth.recordReceived("creem", { eventId, eventType });
    if (eventId) {
      const shouldProcess = await markWebhookEventProcessedOnce(dbGet, {
        provider: "creem",
        eventId,
      });
      if (!shouldProcess) {
        billingHealth.recordDuplicate("creem", { eventId, eventType });
        res.status(200).json({ received: true, duplicate: true });
        return;
      }
    }
    if (
      eventType.includes("subscription") ||
      eventType.includes("checkout") ||
      eventType.includes("payment")
    ) {
      await handleCreemWebhookEvent(eventType, eventPayload);
    }
    billingHealth.recordProcessed("creem", { eventId, eventType });
    res.status(200).json({ received: true });
  } catch (err) {
    billingHealth.recordFailure("creem", {
      eventId,
      eventType,
      error: err?.message || String(err),
    });
    await emitBillingAlert({
      provider: "creem",
      id: "creem.webhook.handler_failed",
      severity: "high",
      message: "Creem webhook handler failed while processing event.",
      details: {
        eventId,
        eventType,
        statusCode: 500,
        path: req.path,
        requestId: req.requestId || null,
        error: err?.message || String(err),
      },
    });
    console.error("[Creem] Webhook handler error:", err);
    res.status(500).json({ error: "Webhook handler failed." });
  }
}

// Creem webhook must use raw body (must be registered before express.json)
app.post("/api/billing/creem/webhook", express.raw({ type: "application/json" }), creemWebhookHandler);
// Backward-compatible alias (deployment routing convenience)
app.post("/api/webhooks/creem", express.raw({ type: "application/json" }), creemWebhookHandler);

const stripeWebhookHandler = createStripeWebhookHandler({
  getBillingConfigStatus,
  stripe,
  stripeWebhookSecret: STRIPE_WEBHOOK_SECRET,
  markWebhookEventProcessed: (provider, eventId) =>
    markWebhookEventProcessedOnce(dbGet, { provider, eventId }),
  billingHealth,
  emitBillingAlert,
  normalizeEmail,
  dbGet,
  dbQuery,
  resolveUserByStripeCustomer,
  resolveTier,
  tierByPrice: TIER_BY_PRICE,
});

// Stripe webhook must use raw body (must be registered before express.json)
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);

// Request size limits to prevent memory exhaustion
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Normalize JSON parsing failures to API-friendly responses.
app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON payload." });
    return;
  }
  next(err);
});

// Rate limiting - general API
// Removed global limiter per requirement. Auth limiter remains below.

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 10 attempts per hour
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' }
});
app.use('/login', authLimiter);
app.use('/signup', authLimiter);
app.use('/password-reset', authLimiter);
app.use('/api/login', authLimiter);
app.use('/api/signup', authLimiter);
app.use('/api/password-reset', authLimiter);

const memoryReadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many memory read requests. Please retry in a minute." },
});

const memoryWriteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 90,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many memory write requests. Please retry in a minute." },
});

const streamChatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many chat requests. Please retry in a minute." },
});

const productTelemetryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many telemetry events. Please retry in a minute." },
});

const memoryReadPathMatchers = [
  /^\/api\/memory\/health\/?$/u,
  /^\/api\/memory\/events\/?$/u,
  /^\/api\/memory\/list(?:\/[^/]+)?\/?$/u,
  /^\/api\/memory\/search\/?$/u,
  /^\/api\/memory\/confirmations(?:\/[^/]+)?\/?$/u,
  /^\/api\/memory\/conflicts(?:\/[^/]+)?\/?$/u,
  /^\/api\/memory\/status(?:\/[^/]+)?\/?$/u,
  /^\/api\/memory\/context(?:\/[^/]+)?\/?$/u,
];
const memoryWriteMatchers = [
  { method: "POST", matcher: /^\/api\/memory\/?$/u },
  { method: "POST", matcher: /^\/api\/memory\/preview\/?$/u },
  { method: "POST", matcher: /^\/api\/memory\/autosave\/?$/u },
  { method: "POST", matcher: /^\/api\/memory\/undo\/[^/]+\/?$/u },
  { method: "POST", matcher: /^\/api\/memory\/confirmations\/[^/]+\/confirm\/?$/u },
  { method: "POST", matcher: /^\/api\/memory\/confirmations\/[^/]+\/reject\/?$/u },
  { method: "POST", matcher: /^\/api\/memory\/conflicts\/[^/]+\/resolve\/?$/u },
  { method: "DELETE", matcher: /^\/api\/memory\/[^/]+\/?$/u },
];

function isLocalDevelopmentOrigin(origin) {
  if (typeof origin !== "string" || origin.trim() === "") return false;
  try {
    const parsed = new URL(origin);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    return ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }
  if (
    memoryWriteMatchers.some(
      (entry) => entry.method === req.method && entry.matcher.test(req.path)
    )
  ) {
    return memoryWriteLimiter(req, res, next);
  }
  if (memoryReadPathMatchers.some((matcher) => matcher.test(req.path))) {
    return memoryReadLimiter(req, res, next);
  }
  return next();
});

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // In development, allow non-browser/local requests and localhost loopback origins.
      if (!isProduction && (!origin || isLocalDevelopmentOrigin(origin))) {
        return callback(null, true);
      }
      
      // In development, allow file:// protocol for local testing
      if (!isProduction && origin?.startsWith('file://')) {
        return callback(null, true);
      }
      
      // Production: strict allowlist only
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      return callback(new Error("Origin not allowed"));
    },
    credentials: true,
  })
);

// =============================================================================
// REQUEST LOGGING
// =============================================================================
function logStructured(level, event, context = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...context,
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

async function emitBillingAlert({
  provider = "unknown",
  id = "billing_webhook_error",
  severity = "high",
  message = "Billing webhook processing failed.",
  details = {},
} = {}) {
  const payload = {
    provider: String(provider || "unknown").toLowerCase(),
    id: String(id || "billing_webhook_error"),
    severity: String(severity || "high"),
    message: String(message || "Billing webhook processing failed."),
    details: details && typeof details === "object" ? details : {},
  };
  try {
    const result = await billingAlertDispatcher.dispatch(payload);
    if (result?.sent) {
      logStructured("warn", "billing.alert.dispatched", {
        provider: payload.provider,
        alertId: payload.id,
        severity: payload.severity,
      });
    }
  } catch (error) {
    logStructured("error", "billing.alert.dispatch_failed", {
      provider: payload.provider,
      alertId: payload.id,
      severity: payload.severity,
      message: error?.message || String(error),
    });
  }
}

async function sendMemoryAlertWebhook(alert) {
  if (!ZAKI_MEMORY_ALERT_WEBHOOK_URL) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ZAKI_MEMORY_ALERT_TIMEOUT_MS);
  try {
    const headers = new Headers({ "Content-Type": "application/json" });
    if (ZAKI_MEMORY_ALERT_WEBHOOK_TOKEN) {
      headers.set("Authorization", `Bearer ${ZAKI_MEMORY_ALERT_WEBHOOK_TOKEN}`);
    }
    const response = await fetch(ZAKI_MEMORY_ALERT_WEBHOOK_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        source: "zaki.memory.telemetry",
        alert,
        env: process.env.NODE_ENV || "development",
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const raw = await response.text().catch(() => "");
      throw new Error(`Webhook returned ${response.status}${raw ? ` ${raw.slice(0, 280)}` : ""}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

if (ZAKI_MEMORY_ALERT_WEBHOOK_URL) {
  configureMemoryTelemetryAlerts({
    onAlert: async (alert) => {
      try {
        await sendMemoryAlertWebhook(alert);
        logStructured("warn", "memory.alert.dispatched", {
          alertId: alert?.id || null,
          severity: alert?.severity || null,
        });
      } catch (error) {
        logStructured("error", "memory.alert.dispatch_failed", {
          alertId: alert?.id || null,
          severity: alert?.severity || null,
          message: error?.message || String(error),
        });
      }
    },
  });
}

app.use((req, res, next) => {
  const start = Date.now();
  const incomingRequestId = req.headers["x-request-id"];
  const requestId =
    (typeof incomingRequestId === "string" && incomingRequestId.trim()) ||
    crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  logStructured("info", "http.request.start", {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get("user-agent") || null,
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    logStructured(
      status >= 500 ? "error" : status >= 400 ? "warn" : "info",
      "http.request.finish",
      {
        requestId,
        method: req.method,
        path: req.path,
        status,
        durationMs: duration,
      }
    );
  });

  next();
});

function getApiBase() {
  if (!NOVA_TYP_BASE_URL) return null;
  const normalized = NOVA_TYP_BASE_URL.replace(/\/+$/, "");
  return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
}

async function novaAdminRequest(path, options = {}) {
  const apiBase = getApiBase();
  if (!apiBase) throw new Error("NOVA_TYP_BASE_URL is not configured.");
  if (!NOVA_TYP_API_KEY) throw new Error("NOVA_TYP_API_KEY is not configured.");

  const urlPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${apiBase}${urlPath}`;
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${NOVA_TYP_API_KEY}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

async function novaSessionRequest(path, authHeader, options = {}) {
  const apiBase = getApiBase();
  if (!apiBase) throw new Error("NOVA_TYP_BASE_URL is not configured.");
  const urlPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${apiBase}${urlPath}`;
  const headers = new Headers(options.headers || {});
  if (authHeader) {
    headers.set("Authorization", authHeader);
  }
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

async function fetchNovaUserIdByUsername(username) {
  const response = await novaAdminRequest("/v1/users", { method: "GET" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(data?.users)) {
    return null;
  }
  const match = data.users.find(
    (user) => String(user.username).toLowerCase() === String(username).toLowerCase()
  );
  return match?.id ?? null;
}

async function ensureUserInDefaultWorkspace(novaUserId) {
  if (!ZAKI_DEFAULT_WORKSPACE_SLUG || !novaUserId) {
    return { success: true };
  }
  const response = await novaAdminRequest(
    `/v1/admin/workspaces/${ZAKI_DEFAULT_WORKSPACE_SLUG}/manage-users`,
    {
      method: "POST",
      body: JSON.stringify({ userIds: [Number(novaUserId)], reset: false }),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) {
    return {
      success: false,
      error: data?.error || data?.message || "Unable to assign workspace.",
    };
  }
  return { success: true };
}

async function fetchSessionWorkspaceSlugs(authHeader) {
  const response = await novaSessionRequest("/workspaces", authHeader, {
    method: "GET",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(data?.workspaces)) {
    return {
      success: false,
      status: response.status || 502,
      error: data?.error || data?.message || "Unable to fetch workspaces.",
      slugs: [],
    };
  }
  return {
    success: true,
    status: response.status,
    slugs: data.workspaces
      .map((workspace) => String(workspace?.slug || "").trim().toLowerCase())
      .filter(Boolean),
  };
}

async function workspaceVisibleForSession(authHeader, normalizedSlug) {
  const result = await fetchSessionWorkspaceSlugs(authHeader);
  if (!result.success) {
    return result;
  }
  return {
    success: true,
    status: 200,
    visible: result.slugs.includes(normalizedSlug),
    slugs: result.slugs,
  };
}

async function verifyWorkspaceDeleted(authHeader, normalizedSlug, attempts = 3) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const check = await workspaceVisibleForSession(authHeader, normalizedSlug);
    if (!check.success) return check;
    if (!check.visible) {
      return { success: true, deleted: true };
    }
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  return {
    success: true,
    deleted: false,
    error: "Workspace is still visible after delete verification.",
  };
}

async function listHiddenWorkspaceSlugsForUser(userId) {
  const result = await dbQuery(
    `SELECT workspace_slug
     FROM zaki_hidden_workspaces
     WHERE user_id = $1`,
    [userId]
  );
  return new Set(
    result.rows
      .map((row) => String(row.workspace_slug || "").trim().toLowerCase())
      .filter(Boolean)
  );
}

async function hideWorkspaceForUser(userId, workspaceSlug, reason) {
  await dbQuery(
    `INSERT INTO zaki_hidden_workspaces (user_id, workspace_slug, reason, created_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, workspace_slug)
     DO UPDATE SET reason = EXCLUDED.reason, created_at = NOW()`,
    [userId, workspaceSlug, String(reason || "manual_fallback")]
  );
}

async function unhideWorkspaceForUser(userId, workspaceSlug) {
  await dbQuery(
    `DELETE FROM zaki_hidden_workspaces
     WHERE user_id = $1 AND workspace_slug = $2`,
    [userId, workspaceSlug]
  );
}

function buildProxyHeaders(req) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue;
    const lower = key.toLowerCase();
    if (
      [
        "host",
        "connection",
        "content-length",
        "accept-encoding",
        "transfer-encoding",
      ].includes(lower)
    ) {
      continue;
    }
    headers.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  return headers;
}

function copyResponseHeaders(upstream, res) {
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      [
        "connection",
        "transfer-encoding",
        "content-encoding",
        "content-length",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailers",
        "upgrade",
      ].includes(lower)
    ) {
      return;
    }
    res.setHeader(key, value);
  });
}

app.get("/health", async (_, res) => {
  try {
    // Check database connection using dbQuery
    await dbQuery('SELECT 1');
    res.status(200).json({ 
      ok: true, 
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({ 
      ok: false, 
      status: 'unhealthy',
      database: 'disconnected',
      error: err.message
    });
  }
});

// =============================================================================
// INPUT VALIDATION SCHEMAS
// =============================================================================

const LoginSchema = buildLoginSchema();
const SignupSchema = buildSignupSchema();
const LegalReconsentSchema = z.object(buildLegalConsentShape());

const PasswordResetRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const PasswordResetTokenSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/i, "Invalid reset token.");

const PasswordResetConfirmSchema = z.object({
  token: PasswordResetTokenSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const DeleteAccountSchema = z.object({
  confirmEmail: z.string().email("Invalid email address"),
});

const AccessCodeAdminCreateSchema = z.object({
  campaign: z.string().trim().min(1, "Campaign is required").max(120),
  count: z.coerce.number().int().min(1).max(500).default(1),
  durationDays: z.coerce.number().int().min(1).max(3650).default(30),
  maxRedemptions: z.union([z.coerce.number().int().min(1), z.null()]).default(1),
  expiresAt: z.union([z.string().trim().min(1), z.null()]).optional(),
  active: z.boolean().default(true),
});

const AccessCodeAdminListSchema = z.object({
  campaign: z.string().trim().min(1).max(120).optional(),
  active: z.enum(["true", "false"]).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const AccessCodeAdminUpdateSchema = z
  .object({
    campaign: z.string().trim().min(1).max(120).optional(),
    durationDays: z.coerce.number().int().min(1).max(3650).optional(),
    maxRedemptions: z.union([z.coerce.number().int().min(1), z.null()]).optional(),
    expiresAt: z.union([z.string().trim().min(1), z.null()]).optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value || {}).length > 0, {
    message: "At least one field is required.",
  });

const AdminMemberUpsertSchema = z.object({
  email: z.string().trim().email("Invalid admin email address"),
});

const ClientErrorEventSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  stack: z.string().max(12000).optional(),
  componentStack: z.string().max(12000).optional(),
  url: z.string().max(3000).optional(),
  userAgent: z.string().max(1200).optional(),
  timestamp: z.string().max(120).optional(),
});

const ProductEventSchema = z.object({
  event: z.enum([
    "pricing_viewed",
    "upgrade_cta_clicked",
    "checkout_started",
    "checkout_succeeded",
    "first_message_sent",
    "first_memory_saved",
    "activation_completed",
  ]),
  source: z.enum([
    "website_nav",
    "website_pricing",
    "chat_input",
    "settings",
    "pricing_page",
    "success_page",
  ]),
  language: z.enum(["en", "ar"]).optional(),
  viewport: z.enum(["mobile", "tablet", "desktop"]).optional(),
  plan: z.enum(["free", "student", "personal"]).nullable().optional(),
  interval: z.enum(["monthly", "yearly"]).nullable().optional(),
  timestamp: z.string().max(120).optional(),
});

// Validation helper
function validateInput(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error?.issues || result.error?.errors || [];
    return {
      valid: false,
      errors: issues.map(e => ({
        field: e.path?.join('.') || 'unknown',
        message: e.message
      }))
    };
  }
  return { valid: true, data: result.data };
}

app.post("/api/telemetry/client-error", express.json({ limit: "200kb" }), async (req, res) => {
  const validation = validateInput(ClientErrorEventSchema, req.body || {});
  if (!validation.valid) {
    res.status(400).json({
      success: false,
      error: validation.errors.map((issue) => issue.message).join(", "),
    });
    return;
  }

  logStructured("error", "client.error", {
    requestId: req.requestId || null,
    url: validation.data.url || null,
    userAgent: validation.data.userAgent || req.get("user-agent") || null,
    message: validation.data.message,
    stack: validation.data.stack || null,
    componentStack: validation.data.componentStack || null,
    clientTimestamp: validation.data.timestamp || null,
  });

  res.status(202).json({ success: true });
});

app.post(
  "/api/telemetry/product-event",
  productTelemetryLimiter,
  express.json({ limit: "100kb" }),
  async (req, res) => {
    const authResult = await requireAuthUser(req, res);
    if (!authResult) return;

    const validation = validateInput(ProductEventSchema, req.body || {});
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: validation.errors.map((issue) => issue.message).join(", "),
      });
      return;
    }

    const payload = validation.data;
    try {
      await dbQuery(
        `INSERT INTO product_analytics_events
          (user_id, event, source, language, viewport, plan, billing_interval, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::timestamptz, NOW()))`,
        [
          authResult.zakiUser.id,
          payload.event,
          payload.source,
          payload.language || null,
          payload.viewport || null,
          payload.plan || null,
          payload.interval || null,
          payload.timestamp || null,
        ]
      );
    } catch (error) {
      logStructured("error", "product.telemetry.persist_failed", {
        requestId: req.requestId || null,
        userId: authResult.zakiUser.id,
        event: payload.event,
        source: payload.source,
        message: error?.message || String(error),
      });
    }

    // Non-blocking by design: product flows should not fail on telemetry issues.
    res.status(202).json({ success: true });
  }
);

// Initialize memory routes
createMemoryRoutes(app, { requireAuthUser });

app.get("/api/admin/telemetry/memory", async (req, res) => {
  const authResult = await requireAdminUser(req, res);
  if (!authResult) return;
  res.json({
    success: true,
    telemetry: getMemoryTelemetrySnapshot(),
  });
});

app.get("/api/admin/telemetry/billing", async (req, res) => {
  const authResult = await requireAdminUser(req, res);
  if (!authResult) return;
  res.json({
    success: true,
    configured: getBillingConfigStatus(),
    telemetry: billingHealth.getSnapshot(),
  });
});

await initDb();
await ensureSuperAdminMembersSeed();

const smtpHost = (process.env.SMTP_HOST || "").trim();
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = (process.env.SMTP_USER || "").trim();
const smtpPass = (process.env.SMTP_PASS || "").trim();
const smtpFrom = (process.env.SMTP_FROM || "").trim();
const resendApiKey = (process.env.RESEND_API_KEY || "").trim();
const resendFrom = (process.env.RESEND_FROM || "").trim();

const mailer =
  ZAKI_EMAIL_MODE === "smtp" && smtpHost
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined,
      })
    : null;

function normalizeEmail(value) {
  return normalizeEmailValue(value);
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    const first = String(forwarded[0] || "").trim();
    if (first) return first;
  }
  return req.ip || null;
}

function getLegalConsentStatus(zakiUser) {
  if (!zakiUser) {
    return {
      policyVersion: ZAKI_LEGAL_POLICY_VERSION,
      hasConsent: false,
      isCurrent: false,
      requiresReconsent: false,
      consentVersion: null,
      consentedAt: null,
    };
  }
  return buildConsentStatus(zakiUser, ZAKI_LEGAL_POLICY_VERSION);
}

async function recordLegalConsent({ userId, policyVersion, source, req }) {
  const now = new Date().toISOString();
  await dbQuery(
    `UPDATE zaki_users
     SET legal_consent_at = $1,
         legal_consent_version = $2,
         updated_at = $3
     WHERE id = $4`,
    [now, policyVersion, now, userId]
  );

  await dbQuery(
    `INSERT INTO legal_consent_events
     (user_id, policy_version, source, consented_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      userId,
      policyVersion,
      source,
      now,
      getClientIp(req),
      req.get("user-agent") || null,
    ]
  );
}

function normalizeAccessCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "");
}

function buildGeneratedAccessCode(campaign) {
  const prefix = String(campaign || "CODE")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4)
    .padEnd(4, "X");
  const bytes = crypto.randomBytes(8);
  let token = "";
  for (let i = 0; i < bytes.length; i += 1) {
    token += ACCESS_CODE_ALPHABET[bytes[i] % ACCESS_CODE_ALPHABET.length];
  }
  return `${prefix}${token}`;
}

function parseOptionalDateInput(value) {
  if (value === null || value === undefined) {
    return { ok: true, value: null };
  }
  const raw = String(value).trim();
  if (!raw) {
    return { ok: true, value: null };
  }
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? `${raw}T23:59:59.000Z`
    : raw;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, error: "Invalid date value." };
  }
  return { ok: true, value: parsed.toISOString() };
}

function formatAccessCodeRow(row) {
  const maxRedemptions =
    row?.max_redemptions === null || row?.max_redemptions === undefined
      ? null
      : Number(row.max_redemptions);
  const redeemedCount = Number(row?.redeemed_count || 0);
  return {
    id: row?.id || null,
    code: row?.code || null,
    campaign: row?.campaign || null,
    durationDays: Number(row?.duration_days || 30),
    maxRedemptions,
    redeemedCount,
    remainingRedemptions:
      maxRedemptions === null ? null : Math.max(0, maxRedemptions - redeemedCount),
    active: Boolean(row?.active),
    expiresAt: row?.expires_at ? new Date(row.expires_at).toISOString() : null,
    createdAt: row?.created_at ? new Date(row.created_at).toISOString() : null,
  };
}

function formatAdminMemberRow(row) {
  const role = normalizeAdminRole(row?.role);
  return {
    email: normalizeEmail(row?.email),
    role,
    isSuperAdmin: role === "super_admin",
    active: Boolean(row?.active),
    createdBy: row?.created_by ? normalizeEmail(row.created_by) : null,
    createdAt: row?.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row?.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

function isEduEmail(email) {
  const domain = String(email || "").split("@")[1] || "";
  return domain.toLowerCase().endsWith(".edu");
}

function resolveTier(tier) {
  if (tier === "pro") return "personal";
  return tier || "free";
}

function isPaidActive(tier, status) {
  return (
    ["student", "personal"].includes(resolveTier(tier)) &&
    ["active", "trialing", "past_due"].includes(status || "")
  );
}

function getAccessStatus(zakiUser) {
  const expiresAt = zakiUser?.access_expires_at
    ? new Date(zakiUser.access_expires_at)
    : null;
  const active = expiresAt ? expiresAt.getTime() > Date.now() : false;
  return {
    active,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    campaign: zakiUser?.access_code_campaign || null,
  };
}

function getAppUrl() {
  return (
    ZAKI_APP_URL ||
    ZAKI_PUBLIC_URL ||
    `http://localhost:${PORT}`
  ).replace(/\/+$/, "");
}

async function requireAuthUser(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !/^Bearer\s+\S+/i.test(String(authHeader))) {
    res.status(401).json({ error: "Missing authorization token." });
    return null;
  }

  let sessionResponse;
  try {
    sessionResponse = await novaSessionRequest(
      "/system/refresh-user",
      authHeader,
      { method: "GET" }
    );
  } catch (error) {
    console.error("[Auth] Session refresh failed:", error);
    res.status(502).json({ error: "Unable to validate session." });
    return null;
  }
  const sessionData = await sessionResponse.json().catch(() => ({}));
  if (!sessionResponse.ok || !sessionData?.success || !sessionData?.user) {
    res.status(401).json({ error: "Invalid or expired token." });
    return null;
  }

  const email = normalizeEmail(String(sessionData.user.username || ""));
  if (!email) {
    res.status(400).json({ error: "Invalid user." });
    return null;
  }

  const zakiUser = await dbGet(
    "SELECT * FROM zaki_users WHERE email = $1",
    [email]
  );
  if (!zakiUser) {
    res.status(404).json({ error: "ZAKI user not found." });
    return null;
  }

  return { email, zakiUser, sessionUser: sessionData.user };
}

const listWorkspacesHandler = async (req, res) => {
  try {
    const authResult = await requireAuthUser(req, res);
    if (!authResult) return;
    const { zakiUser } = authResult;
    const authHeader = req.headers.authorization;

    const upstream = await novaSessionRequest("/workspaces", authHeader, {
      method: "GET",
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok || !Array.isArray(data?.workspaces)) {
      res.status(upstream.status || 502).json({
        success: false,
        error: data?.error || data?.message || "Unable to fetch workspaces.",
      });
      return;
    }

    const hiddenSlugs = await listHiddenWorkspaceSlugsForUser(zakiUser.id);
    if (hiddenSlugs.size === 0) {
      res.status(200).json(data);
      return;
    }

    const filtered = data.workspaces.filter((workspace) => {
      const slug = String(workspace?.slug || "").trim().toLowerCase();
      return slug && !hiddenSlugs.has(slug);
    });
    res.status(200).json({
      ...data,
      workspaces: filtered,
    });
  } catch (error) {
    console.error("[Workspace] listWorkspacesHandler error:", error);
    res.status(500).json({ success: false, error: "Failed to load workspaces." });
  }
};

app.get("/workspaces", listWorkspacesHandler);
app.get("/api/workspaces", listWorkspacesHandler);

function normalizeAdminRole(value) {
  return String(value || "").trim().toLowerCase() === "super_admin"
    ? "super_admin"
    : "admin";
}

function buildAdminAuthContext(email, role, source) {
  const normalizedRole = normalizeAdminRole(role);
  return {
    email,
    role: normalizedRole,
    isAdmin: true,
    isSuperAdmin: normalizedRole === "super_admin",
    source: String(source || "unknown"),
  };
}

async function ensureSuperAdminMembersSeed() {
  const superAdminEmails = Array.from(superAdminEmailSet.values()).filter(Boolean);
  if (superAdminEmails.length === 0) {
    return;
  }

  await dbQuery(
    `UPDATE zaki_admin_members
     SET role = 'admin',
         updated_at = NOW()
     WHERE role = 'super_admin'
       AND email <> ALL($1::text[])`,
    [superAdminEmails]
  );

  for (const email of superAdminEmails) {
    await dbQuery(
      `INSERT INTO zaki_admin_members (email, role, active, created_by, created_at, updated_at)
       VALUES ($1, 'super_admin', TRUE, $1, NOW(), NOW())
       ON CONFLICT (email)
       DO UPDATE SET
         role = 'super_admin',
         active = TRUE,
         updated_at = NOW()`,
      [email]
    );
  }
}

async function resolveAdminAuthContext(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  if (superAdminEmailSet.has(normalizedEmail)) {
    return buildAdminAuthContext(normalizedEmail, "super_admin", "super_admin_config");
  }

  const membership = await dbGet(
    `SELECT role
     FROM zaki_admin_members
     WHERE email = $1
       AND active = TRUE
     LIMIT 1`,
    [normalizedEmail]
  );
  if (!membership) return null;

  return buildAdminAuthContext(normalizedEmail, membership.role, "db");
}

async function requireAdminUser(req, res) {
  const authResult = await requireAuthUser(req, res);
  if (!authResult) return null;

  const admin = await resolveAdminAuthContext(authResult.email);
  if (!admin?.isAdmin) {
    res.status(403).json({ error: "Admin access required." });
    return null;
  }

  return {
    ...authResult,
    admin,
  };
}

async function requireSuperAdminUser(req, res) {
  const authResult = await requireAdminUser(req, res);
  if (!authResult) return null;
  if (!authResult.admin?.isSuperAdmin) {
    res.status(403).json({ error: "Super admin access required." });
    return null;
  }
  return authResult;
}

async function resolveUserByStripeCustomer(customerId, fallbackEmail) {
  if (!customerId) return null;
  let user = await dbGet(
    `SELECT id, email, stripe_last_event_created_at, stripe_last_event_id
     FROM zaki_users
     WHERE stripe_customer_id = $1`,
    [customerId]
  );
  if (user) return user;

  let email = fallbackEmail;
  if (!email && stripe) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer && typeof customer === "object" && "email" in customer) {
        email = customer.email;
      }
    } catch (err) {
      console.warn("[Stripe] Could not retrieve customer:", err.message);
    }
  }

  if (!email) return null;
  const normalizedEmail = normalizeEmail(email);
  user = await dbGet(
    `SELECT id, email, stripe_last_event_created_at, stripe_last_event_id
     FROM zaki_users
     WHERE email = $1`,
    [normalizedEmail]
  );
  if (user) {
    await dbQuery(
      `UPDATE zaki_users SET stripe_customer_id = $1, billing_updated_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [customerId, user.id]
    );
  }
  return user;
}

async function ensureStripeCustomerId({ email, zakiUser }) {
  let customerId = zakiUser.stripe_customer_id;
  if (customerId) return customerId;
  const customer = await stripe.customers.create({
    email,
    metadata: { zaki_user_id: String(zakiUser.id), user_email: email },
  });
  customerId = customer.id;
  await dbQuery(
    `UPDATE zaki_users SET stripe_customer_id = $1, billing_updated_at = NOW(), updated_at = NOW()
     WHERE id = $2`,
    [customerId, zakiUser.id]
  );
  return customerId;
}

async function syncStripeSubscriptionState({ email, zakiUser }) {
  if (!stripe) {
    const err = new Error("Stripe is not configured.");
    err.status = 503;
    throw err;
  }

  let customerId = zakiUser.stripe_customer_id || null;
  if (!customerId) {
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });
    customerId = customers?.data?.[0]?.id || null;
  }

  if (!customerId) {
    return {
      updated: false,
      reason: "customer_not_found",
    };
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });
  const ordered = Array.isArray(subscriptions?.data) ? subscriptions.data : [];
  const preferred =
    ordered.find((sub) => ["active", "trialing", "past_due", "unpaid"].includes(sub.status)) ||
    ordered.find((sub) => Boolean(sub.cancel_at_period_end)) ||
    ordered[0] ||
    null;

  if (!preferred) {
    await dbQuery(
      `UPDATE zaki_users
       SET stripe_customer_id = $1,
           stripe_subscription_id = NULL,
           stripe_price_id = NULL,
           plan_tier = 'free',
           plan_status = 'inactive',
           current_period_end = NULL,
           cancel_at_period_end = FALSE,
           billing_updated_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [customerId, zakiUser.id]
    );
    return {
      updated: true,
      customerId,
      tier: "free",
      interval: null,
      status: "inactive",
    };
  }

  const priceId = preferred.items?.data?.[0]?.price?.id || null;
  const priceDetails = resolveStripePriceDetailsById(stripePricingCatalog, priceId);
  const tierFromPrice = priceDetails?.tier || null;
  const intervalFromPrice = priceDetails?.interval || null;
  const tierFromMetadata = preferred.metadata?.plan_tier || null;
  const isCanceled = preferred.status === "canceled";
  const tier = isCanceled
    ? "free"
    : resolveTier(tierFromPrice || tierFromMetadata || zakiUser.plan_tier || "free");
  const status = isCanceled ? "canceled" : preferred.status || "inactive";
  const currentPeriodEnd = preferred.current_period_end
    ? new Date(preferred.current_period_end * 1000).toISOString()
    : null;
  const cancelAtPeriodEnd = Boolean(preferred.cancel_at_period_end);

  await dbQuery(
    `UPDATE zaki_users
     SET stripe_customer_id = $1,
         stripe_subscription_id = $2,
         stripe_price_id = $3,
         plan_tier = $4,
         plan_status = $5,
         current_period_end = $6,
         cancel_at_period_end = $7,
         billing_updated_at = NOW(),
         updated_at = NOW()
     WHERE id = $8`,
    [
      customerId,
      preferred.id || null,
      priceId,
      tier,
      status,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      zakiUser.id,
    ]
  );

  return {
    updated: true,
    customerId,
    subscriptionId: preferred.id || null,
    tier,
    interval: intervalFromPrice,
    status,
    currentPeriodEnd,
    cancelAtPeriodEnd,
  };
}

const billingAdapters = {
  none: {
    name: "none",
    async createCheckout() {
      throw new Error("Billing provider is not configured.");
    },
    async createPortal() {
      throw new Error("Billing provider is not configured.");
    },
    async cancelSubscription() {
      throw new Error("Billing provider is not configured.");
    },
    async cleanupCustomerOnDelete() {
      return;
    },
  },
  stripe: {
    name: "stripe",
    async createCheckout({ plan, interval = "monthly", email, zakiUser, context }) {
      const selectedInterval = normalizeBillingInterval(interval, "monthly");
      const checkoutSource = String(context?.source || "").trim().toLowerCase() || "pricing_page";
      if (plan === "student" && !isEduEmail(email)) {
        const err = new Error("Student plan requires a .edu email address.");
        err.status = 400;
        throw err;
      }

      if (plan === "student") {
        await dbQuery(
          `UPDATE zaki_users SET student_verified = true, student_verified_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [zakiUser.id]
        );
      }

      const priceId = resolveStripePriceForSelection(stripePricingCatalog, {
        plan,
        interval: selectedInterval,
      });
      if (!priceId) {
        const err = new Error("Selected billing interval is not configured for this plan.");
        err.status = 400;
        throw err;
      }

      const customerId = await ensureStripeCustomerId({ email, zakiUser });
      const appUrl = getAppUrl();
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        success_url: `${appUrl}/pricing/success?billing=success&plan=${plan}&interval=${selectedInterval}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/pricing?billing=cancel`,
        metadata: {
          user_email: email,
          plan_tier: plan,
          billing_interval: selectedInterval,
          checkout_source: checkoutSource,
        },
        subscription_data: {
          metadata: {
            user_email: email,
            plan_tier: plan,
            billing_interval: selectedInterval,
            checkout_source: checkoutSource,
          },
        },
      });
      return { url: session.url };
    },
    async createPortal({ email, zakiUser }) {
      const customerId = await ensureStripeCustomerId({ email, zakiUser });
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${getAppUrl()}/pricing?billing=manage`,
      });
      return { url: portal.url };
    },
    async cancelSubscription({ zakiUser }) {
      let subscriptionId = zakiUser.stripe_subscription_id || null;
      let subscription = null;

      if (!subscriptionId && zakiUser.stripe_customer_id) {
        const subscriptions = await stripe.subscriptions.list({
          customer: zakiUser.stripe_customer_id,
          status: "all",
          limit: 10,
        });
        subscription =
          subscriptions.data.find((sub) =>
            ["active", "trialing", "past_due", "unpaid"].includes(sub.status)
          ) || subscriptions.data[0] || null;
        subscriptionId = subscription?.id || null;
      }

      if (!subscriptionId) {
        const err = new Error("No active subscription found.");
        err.status = 400;
        throw err;
      }

      if (!subscription) {
        subscription = await stripe.subscriptions.retrieve(subscriptionId);
      }

      if (!subscription || subscription.status === "canceled") {
        const err = new Error("Subscription is already canceled.");
        err.status = 400;
        throw err;
      }

      const alreadyScheduled = Boolean(subscription.cancel_at_period_end);
      const finalSubscription = alreadyScheduled
        ? subscription
        : await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
          });

      const priceId =
        finalSubscription.items?.data?.[0]?.price?.id || zakiUser.stripe_price_id || null;
      const priceDetails = resolveStripePriceDetailsById(stripePricingCatalog, priceId);
      const tier = resolveTier(priceDetails?.tier || zakiUser.plan_tier || "free");
      const currentPeriodEnd = finalSubscription.current_period_end
        ? new Date(finalSubscription.current_period_end * 1000).toISOString()
        : zakiUser.current_period_end || null;

      await dbQuery(
        `UPDATE zaki_users
         SET stripe_subscription_id = $1,
             stripe_price_id = $2,
             plan_tier = $3,
             plan_status = $4,
             current_period_end = $5,
             cancel_at_period_end = true,
             billing_updated_at = NOW(),
             updated_at = NOW()
         WHERE id = $6`,
        [
          finalSubscription.id,
          priceId,
          tier,
          finalSubscription.status || zakiUser.plan_status || "active",
          currentPeriodEnd,
          zakiUser.id,
        ]
      );

      return {
        alreadyScheduled,
        cancelAtPeriodEnd: true,
        currentPeriodEnd,
        status: finalSubscription.status,
      };
    },
    async cleanupCustomerOnDelete({ zakiUser }) {
      if (!stripe || !zakiUser.stripe_customer_id) return;
      try {
        await stripe.customers.del(zakiUser.stripe_customer_id);
      } catch (err) {
        console.warn("[Account] Stripe customer delete failed:", err?.message || err);
      }
    },
  },
  paddle: {
    name: "paddle",
    async createCheckout({ plan }) {
      const checkoutUrl =
        plan === "student"
          ? ZAKI_EXTERNAL_CHECKOUT_URL_STUDENT
          : ZAKI_EXTERNAL_CHECKOUT_URL_PERSONAL;
      if (!checkoutUrl) {
        const err = new Error("External checkout URL is not configured for this plan.");
        err.status = 503;
        throw err;
      }
      return { url: checkoutUrl };
    },
    async createPortal() {
      if (!ZAKI_EXTERNAL_PORTAL_URL) {
        const err = new Error("External billing portal URL is not configured.");
        err.status = 503;
        throw err;
      }
      return { url: ZAKI_EXTERNAL_PORTAL_URL };
    },
    async cancelSubscription() {
      const err = new Error("Cancel is not supported by external billing provider.");
      err.status = 400;
      throw err;
    },
    async cleanupCustomerOnDelete() {
      return;
    },
  },
  creem: {
    name: "creem",
    async createCheckout({ plan, email, zakiUser, context }) {
      const checkoutSource = String(context?.source || "").trim().toLowerCase() || "pricing_page";
      const productId =
        plan === "student" ? CREEM_PRODUCT_ID_STUDENT : CREEM_PRODUCT_ID_PERSONAL;
      if (!productId) {
        const err = new Error("Creem product is not configured for this plan.");
        err.status = 503;
        throw err;
      }
      if (!CREEM_API_KEY) {
        const err = new Error("Creem API key is not configured.");
        err.status = 503;
        throw err;
      }

      const appUrl = getAppUrl();
      const successUrl =
        CREEM_SUCCESS_URL || `${appUrl}/pricing/success?billing=success&plan=${plan}&interval=monthly`;
      const requestId = `zaki_${zakiUser?.id || "user"}_${plan}_${Date.now()}`;
      const body = {
        product_id: productId,
        request_id: requestId,
        success_url: successUrl,
        customer: {
          email,
        },
        metadata: {
          user_email: email,
          user_id: String(zakiUser?.id || ""),
          plan_tier: plan,
          checkout_source: checkoutSource,
        },
      };

      const response = await fetch(`${CREEM_API_BASE_URL.replace(/\/+$/, "")}/v1/checkouts`, {
        method: "POST",
        headers: {
          "x-api-key": CREEM_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const err = new Error(
          payload?.message || payload?.error || "Creem checkout creation failed."
        );
        err.status = response.status || 502;
        throw err;
      }

      const checkoutUrl =
        payload?.url ||
        payload?.checkout_url ||
        payload?.data?.url ||
        payload?.data?.checkout_url ||
        null;
      if (!checkoutUrl) {
        const err = new Error("Creem checkout URL missing in provider response.");
        err.status = 502;
        throw err;
      }
      return { url: checkoutUrl };
    },
    async createPortal() {
      const err = new Error("Billing portal is not configured for Creem.");
      err.status = 503;
      throw err;
    },
    async cancelSubscription() {
      const err = new Error("Cancel is not supported yet for Creem in this release.");
      err.status = 400;
      throw err;
    },
    async cleanupCustomerOnDelete() {
      return;
    },
  },
};

function getBillingAdapter() {
  const activeProvider = getActiveBillingProviderKey();
  return billingAdapters[activeProvider] || billingAdapters.none;
}

function getBillingAdapterByKey(providerKey) {
  const key = String(providerKey || "").trim().toLowerCase();
  if (key === "stripe") return billingAdapters.stripe;
  if (key === "paddle" || key === "external") return billingAdapters.paddle;
  if (key === "creem") return billingAdapters.creem;
  if (key === "none") return billingAdapters.none;
  return null;
}

function parseFromAddress(value, fallbackEmail) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return { email: fallbackEmail, name: undefined };
  }
  const match = trimmed.match(/^(.*)<([^>]+)>$/);
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, "");
    const email = match[2].trim();
    return { email, name: name || undefined };
  }
  return { email: trimmed, name: undefined };
}

async function issueVerificationToken(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + ZAKI_VERIFY_TTL_MINUTES * 60 * 1000;
  const now = new Date().toISOString();
  await dbQuery(
    `INSERT INTO verification_tokens (user_id, token, expires_at, created_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, token, expiresAt, now]
  );
  return { token, expiresAt };
}

async function issuePasswordResetToken(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + ZAKI_RESET_TTL_MINUTES * 60 * 1000;
  const now = new Date().toISOString();
  await dbQuery(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, token, expiresAt, now]
  );
  return { token, expiresAt };
}

function getVerificationBaseUrl() {
  const baseUrl = ZAKI_PUBLIC_URL || `http://localhost:${PORT}`;
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  return normalizedBase.endsWith("/api")
    ? normalizedBase.replace(/\/api$/, "")
    : normalizedBase;
}

function getLoginRedirectUrl(verifiedState = "success") {
  const appBaseRaw = getAppUrl();
  const appBase = appBaseRaw.endsWith("/api")
    ? appBaseRaw.replace(/\/api$/, "")
    : appBaseRaw;
  const loginUrl = new URL(appBase.endsWith("/") ? appBase : `${appBase}/`);
  loginUrl.pathname = "/";
  loginUrl.searchParams.set("auth", "login");
  loginUrl.searchParams.set("verified", String(verifiedState || "success"));
  return loginUrl.toString();
}

function getEmailLogoUrl() {
  const appBaseRaw = getAppUrl();
  const appBase = appBaseRaw.endsWith("/api")
    ? appBaseRaw.replace(/\/api$/, "")
    : appBaseRaw;
  const normalized = appBase.replace(/\/+$/, "");
  return `${normalized}/favicon.svg`;
}

function buildVerificationEmailHtml({ verifyUrl, logoUrl }) {
  const expiryText = `${Math.max(1, Number(ZAKI_VERIFY_TTL_MINUTES || 60))} minutes`;
  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Verify your ZAKI account</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1f1914;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:radial-gradient(circle at 5% 0%,#fff7ec 0%,#f4ece1 42%,#f1e8dd 100%);padding:28px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e7ddd1;border-radius:20px;overflow:hidden;box-shadow:0 18px 44px rgba(38,22,7,0.10);">
            <tr>
              <td style="padding:24px 28px 16px 28px;background:linear-gradient(135deg,#fff8ef 0%,#f1e6d8 100%);border-bottom:1px solid #eadfce;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <div style="height:40px;width:40px;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;border:1px solid #eadfce;">
                        <img src="${logoUrl}" width="26" height="26" alt="ZAKI" style="display:block;width:26px;height:26px;" />
                      </div>
                    </td>
                    <td style="padding-left:10px;vertical-align:middle;">
                      <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#9a7e62;font-weight:700;">ZAKI</div>
                      <div style="font-size:13px;line-height:1.2;color:#705a46;font-weight:500;">Account Security</div>
                    </td>
                  </tr>
                </table>
                <h1 style="margin:14px 0 0 0;font-size:25px;line-height:1.25;color:#231b14;font-weight:650;">One quick tap and you're in</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 10px 28px;">
                <p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#3b3026;">
                  Your workspace is ready. Verify this email to unlock ZAKI and start your first conversation.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:22px 0 20px 0;">
                  <tr>
                    <td style="border-radius:12px;background:linear-gradient(135deg,#df6847 0%,#c75236 100%);box-shadow:0 8px 20px rgba(199,82,54,0.35);">
                      <a href="${verifyUrl}" style="display:inline-block;padding:12px 22px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">
                        Activate My Account
                      </a>
                    </td>
                  </tr>
                </table>
                <div style="margin:0 0 14px 0;border-radius:12px;border:1px solid #f1e2d5;background:#fff8f1;padding:10px 12px;">
                  <p style="margin:0;font-size:13px;line-height:1.6;color:#7a5f49;">
                    This link expires in <strong>${expiryText}</strong>. If it times out, just sign up again and we will send a fresh one.
                  </p>
                </div>
                <p style="margin:0 0 12px 0;font-size:13px;line-height:1.7;color:#6a5847;">
                  If the button does not open, use this link:
                </p>
                <p style="margin:0;font-size:12px;line-height:1.7;color:#6a5847;word-break:break-all;">
                  <a href="${verifyUrl}" style="color:#d86a4d;text-decoration:underline;">${verifyUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 24px 28px;border-top:1px solid #f4eadf;">
                <p style="margin:0;font-size:12px;line-height:1.55;color:#7f6b59;">
                  If this was not you, you can safely ignore this email. Need help? Reach us at <a href="mailto:info@novanuggets.com" style="color:#c75236;text-decoration:none;">info@novanuggets.com</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

function buildPasswordResetEmailHtml({ resetUrl, logoUrl }) {
  const expiryText = `${Math.max(1, Number(ZAKI_RESET_TTL_MINUTES || 30))} minutes`;
  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Reset your ZAKI password</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1f1914;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:radial-gradient(circle at 5% 0%,#fff7ec 0%,#f4ece1 42%,#f1e8dd 100%);padding:28px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e7ddd1;border-radius:20px;overflow:hidden;box-shadow:0 18px 44px rgba(38,22,7,0.10);">
            <tr>
              <td style="padding:24px 28px 16px 28px;background:linear-gradient(135deg,#fff8ef 0%,#f1e6d8 100%);border-bottom:1px solid #eadfce;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <div style="height:40px;width:40px;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;border:1px solid #eadfce;">
                        <img src="${logoUrl}" width="26" height="26" alt="ZAKI" style="display:block;width:26px;height:26px;" />
                      </div>
                    </td>
                    <td style="padding-left:10px;vertical-align:middle;">
                      <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#9a7e62;font-weight:700;">ZAKI</div>
                      <div style="font-size:13px;line-height:1.2;color:#705a46;font-weight:500;">Account Security</div>
                    </td>
                  </tr>
                </table>
                <h1 style="margin:14px 0 0 0;font-size:25px;line-height:1.25;color:#231b14;font-weight:650;">Let's get you back in</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 10px 28px;">
                <p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#3b3026;">
                  Forgot your password? No stress. Tap below to set a fresh one and jump back into your workspace.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:22px 0 20px 0;">
                  <tr>
                    <td style="border-radius:12px;background:linear-gradient(135deg,#df6847 0%,#c75236 100%);box-shadow:0 8px 20px rgba(199,82,54,0.35);">
                      <a href="${resetUrl}" style="display:inline-block;padding:12px 22px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">
                        Reset My Password
                      </a>
                    </td>
                  </tr>
                </table>
                <div style="margin:0 0 14px 0;border-radius:12px;border:1px solid #f1e2d5;background:#fff8f1;padding:10px 12px;">
                  <p style="margin:0;font-size:13px;line-height:1.6;color:#7a5f49;">
                    This reset link expires in <strong>${expiryText}</strong>.
                  </p>
                </div>
                <p style="margin:0 0 12px 0;font-size:13px;line-height:1.7;color:#6a5847;">
                  If the button does not open, use this link:
                </p>
                <p style="margin:0;font-size:12px;line-height:1.7;color:#6a5847;word-break:break-all;">
                  <a href="${resetUrl}" style="color:#d86a4d;text-decoration:underline;">${resetUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 24px 28px;border-top:1px solid #f4eadf;">
                <p style="margin:0;font-size:12px;line-height:1.55;color:#7f6b59;">
                  If you did not request a reset, you can ignore this email. Need help? Reach us at <a href="mailto:info@novanuggets.com" style="color:#c75236;text-decoration:none;">info@novanuggets.com</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

async function sendVerificationEmail(email, token) {
  const verifyBase = getVerificationBaseUrl();
  const verifyUrl = `${verifyBase}/verify?token=${token}`;
  const logoUrl = getEmailLogoUrl();
  const subject = "You are one click away from ZAKI";
  const text = [
    "Welcome to ZAKI.",
    "Your workspace is ready.",
    "One quick tap to activate your account:",
    verifyUrl,
    "",
    `This link expires in ${Math.max(1, Number(ZAKI_VERIFY_TTL_MINUTES || 60))} minutes.`,
    "",
    "If this was not you, you can ignore this email.",
    "Support: info@novanuggets.com",
  ].join("\n");
  const html = buildVerificationEmailHtml({ verifyUrl, logoUrl });

  if (ZAKI_EMAIL_MODE.toLowerCase() === "resend") {
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured.");
    }
    const from = parseFromAddress(resendFrom, "");
    if (!from.email) {
      throw new Error("RESEND_FROM is not configured.");
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: from.name ? `${from.name} <${from.email}>` : from.email,
          to: [email],
          subject,
          text,
          html,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          `Resend error (${response.status})${errorText ? `: ${errorText}` : ""}`
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  } else if (mailer) {
    await mailer.sendMail({
      from: smtpFrom || smtpUser || "no-reply@zaki.local",
      to: email,
      subject,
      text,
      html,
    });
  } else {
    console.log(`[ZAKI] Verification link for ${email}: ${verifyUrl}`);
  }

  return verifyUrl;
}

async function sendPasswordResetEmail(email, token) {
  const baseUrl =
    ZAKI_APP_URL ||
    ZAKI_PUBLIC_URL ||
    `http://localhost:${PORT}`;
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const resetBase = normalizedBase.endsWith("/api")
    ? normalizedBase.replace(/\/api$/, "")
    : normalizedBase;
  const resetUrl = `${resetBase}/reset?token=${token}`;
  const logoUrl = getEmailLogoUrl();
  const subject = "Password reset for your ZAKI account";
  const text = [
    "Forgot your password? No problem.",
    "Use this link to set a new password and get back into ZAKI:",
    resetUrl,
    "",
    `This reset link expires in ${Math.max(1, Number(ZAKI_RESET_TTL_MINUTES || 30))} minutes.`,
    "",
    "If you did not request this, you can ignore this email.",
    "Support: info@novanuggets.com",
  ].join("\n");
  const html = buildPasswordResetEmailHtml({ resetUrl, logoUrl });

  if (ZAKI_EMAIL_MODE.toLowerCase() === "resend") {
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured.");
    }
    const from = parseFromAddress(resendFrom, "");
    if (!from.email) {
      throw new Error("RESEND_FROM is not configured.");
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: from.name ? `${from.name} <${from.email}>` : from.email,
          to: [email],
          subject,
          text,
          html,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          `Resend error (${response.status})${errorText ? `: ${errorText}` : ""}`
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  } else if (mailer) {
    await mailer.sendMail({
      from: smtpFrom || smtpUser || "no-reply@zaki.local",
      to: email,
      subject,
      text,
      html,
    });
  } else {
    console.log(`[ZAKI] Password reset link for ${email}: ${resetUrl}`);
  }

  return resetUrl;
}

const signupHandler = async (req, res) => {
  try {
    // Validate input with Zod
    const validation = validateInput(SignupSchema, req.body || {});
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: validation.errors.map(e => e.message).join(', '),
      });
      return;
    }

    const { email, password, name, dateOfBirth, legalPolicyVersion } = validation.data;
    const normalizedEmail = normalizeEmail(email);
    const normalizedName = name.trim();
    const normalizedDob = dateOfBirth;
    const policyVersionResult = validateLegalPolicyVersion(
      legalPolicyVersion,
      ZAKI_LEGAL_POLICY_VERSION
    );
    if (!policyVersionResult.ok) {
      res.status(409).json({
        success: false,
        error: policyVersionResult.error,
      });
      return;
    }
    const policyVersion = policyVersionResult.version;

    const now = new Date().toISOString();
    const existing = await dbGet(
      "SELECT * FROM zaki_users WHERE email = $1",
      [normalizedEmail]
    );
    const passwordHash = bcrypt.hashSync(String(password), 10);

    let userId = existing?.id;
    if (existing && existing.verified) {
      res.status(400).json({
        success: false,
        error: "Email already registered. Please sign in.",
      });
      return;
    }

    if (existing) {
      await dbQuery(
        `UPDATE zaki_users
         SET password_hash = $1, full_name = $2, date_of_birth = $3, updated_at = $4
         WHERE id = $5`,
        [passwordHash, normalizedName, normalizedDob, now, existing.id]
      );
    } else {
      const insertResult = await dbQuery(
        `INSERT INTO zaki_users
         (email, password_hash, full_name, date_of_birth, verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, false, $5, $6)
         RETURNING id`,
        [normalizedEmail, passwordHash, normalizedName, normalizedDob, now, now]
      );
      userId = insertResult.rows[0]?.id;
    }

    if (!userId) {
      res.status(500).json({ success: false, error: "Unable to create user." });
      return;
    }

    await recordLegalConsent({
      userId,
      policyVersion,
      source: "signup",
      req,
    });

    if (SKIP_EMAIL_VERIFICATION) {
      await dbQuery(
        `UPDATE zaki_users SET verified = true, updated_at = $1 WHERE id = $2`,
        [now, userId]
      );
      res.status(200).json({
        success: true,
        message: "Account created. You can sign in now.",
      });
      return;
    }

    const { token } = await issueVerificationToken(userId);
    const verificationLink = await sendVerificationEmail(
      normalizedEmail,
      token
    );

    res.status(200).json({
      success: true,
      message: "Check your email to verify your account.",
      verificationLink: ZAKI_INCLUDE_VERIFY_LINK ? verificationLink : undefined,
    });
  } catch (error) {
    console.error("[ZAKI] Signup error:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Server error.",
    });
  }
};

app.post("/signup", signupHandler);
app.post("/api/signup", signupHandler);

const passwordResetRequestHandler = async (req, res) => {
  try {
    const validation = validateInput(PasswordResetRequestSchema, req.body || {});
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: validation.errors.map((e) => e.message).join(", "),
      });
      return;
    }

    const normalizedEmail = normalizeEmail(validation.data.email);

    const user = await dbGet("SELECT * FROM zaki_users WHERE email = $1", [
      normalizedEmail,
    ]);

    if (user) {
      const { token } = await issuePasswordResetToken(user.id);
      const resetLink = await sendPasswordResetEmail(normalizedEmail, token);
      res.status(200).json({
        success: true,
        message: "If the account exists, a reset link has been sent.",
        resetLink: ZAKI_INCLUDE_VERIFY_LINK ? resetLink : undefined,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "If the account exists, a reset link has been sent.",
    });
  } catch (error) {
    console.error("[ZAKI] Password reset request error:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Server error.",
    });
  }
};

app.post(
  "/password-reset/request",
  express.json({ limit: "1mb" }),
  passwordResetRequestHandler
);
app.post(
  "/api/password-reset/request",
  express.json({ limit: "1mb" }),
  passwordResetRequestHandler
);

const passwordResetConfirmHandler = async (req, res) => {
  try {
    const validation = validateInput(PasswordResetConfirmSchema, req.body || {});
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: validation.errors.map((e) => e.message).join(", "),
      });
      return;
    }

    const normalizedToken = String(validation.data.token || "")
      .trim()
      .toLowerCase();
    const nextPassword = String(validation.data.password || "");

    const record = await dbGet(
      `SELECT pr.id, pr.user_id, pr.expires_at, pr.used_at
       FROM password_reset_tokens pr
       WHERE pr.token = $1`,
      [normalizedToken]
    );

    if (!record) {
      res.status(404).json({
        success: false,
        error: "Invalid reset token.",
      });
      return;
    }

    if (record.used_at) {
      res.status(400).json({
        success: false,
        error: "Reset token already used.",
      });
      return;
    }

    const expiresAt = Number(record.expires_at);
    if (Date.now() > expiresAt) {
      res.status(410).json({
        success: false,
        error: "Reset token expired.",
      });
      return;
    }

    const passwordHash = bcrypt.hashSync(String(nextPassword), 10);
    const now = Date.now();
    const nowIso = new Date().toISOString();

    const zakiUser = await dbGet("SELECT * FROM zaki_users WHERE id = $1", [
      record.user_id,
    ]);
    if (!zakiUser) {
      res.status(404).json({
        success: false,
        error: "User not found.",
      });
      return;
    }

    let novaUserId = zakiUser.nova_user_id
      ? Number(zakiUser.nova_user_id)
      : null;
    if (!novaUserId) {
      const fetchedId = await fetchNovaUserIdByUsername(zakiUser.email);
      if (fetchedId) {
        novaUserId = Number(fetchedId);
        await dbQuery(
          `UPDATE zaki_users SET nova_user_id = $1, updated_at = $2 WHERE id = $3`,
          [novaUserId, nowIso, zakiUser.id]
        );
      }
    }

    if (novaUserId) {
      const novaResponse = await novaAdminRequest(`/v1/admin/users/${novaUserId}`, {
        method: "POST",
        body: JSON.stringify({ password: String(nextPassword) }),
      });
      const novaPayload = await novaResponse.json().catch(() => ({}));
      if (!novaResponse.ok || novaPayload?.success === false) {
        const errorMessage =
          novaPayload?.error ||
          (novaResponse.status === 401
            ? "NOVA.TYP is not in multi-user mode."
            : "Unable to update NOVA.TYP password.");
        res.status(400).json({
          success: false,
          error: errorMessage,
        });
        return;
      }
    }

    await dbQuery(
      `UPDATE password_reset_tokens SET used_at = $1 WHERE id = $2`,
      [now, record.id]
    );
    await dbQuery(
      `UPDATE zaki_users SET password_hash = $1, updated_at = $2 WHERE id = $3`,
      [passwordHash, nowIso, record.user_id]
    );

    res.status(200).json({
      success: true,
      message: "Password updated. You can sign in now.",
    });
  } catch (error) {
    console.error("[ZAKI] Password reset confirm error:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Server error.",
    });
  }
};

app.post(
  "/password-reset/confirm",
  express.json({ limit: "1mb" }),
  passwordResetConfirmHandler
);
app.post(
  "/api/password-reset/confirm",
  express.json({ limit: "1mb" }),
  passwordResetConfirmHandler
);

const loginHandler = async (req, res) => {
  try {
    // Validate input
    const validation = validateInput(LoginSchema, req.body || {});
    if (!validation.valid) {
      res.status(400).json({
        valid: false,
        token: null,
        message: validation.errors.map(e => e.message).join(', '),
      });
      return;
    }

    const apiBase = getApiBase();
    if (!apiBase) {
      res.status(500).json({ error: "NOVA_TYP_BASE_URL is not configured." });
      return;
    }

    const { email, username, password } = validation.data;
    const normalizedEmail = normalizeEmail(email || username);

    const user = await dbGet("SELECT * FROM zaki_users WHERE email = $1", [
      normalizedEmail,
    ]);
    if (!user) {
      res.status(401).json({
        valid: false,
        token: null,
        message: "Invalid login credentials.",
      });
      return;
    }
    if (!user.verified) {
      res.status(401).json({
        valid: false,
        token: null,
        message: "Please verify your email before signing in.",
      });
      return;
    }
    if (!bcrypt.compareSync(String(password), user.password_hash)) {
      res.status(401).json({
        valid: false,
        token: null,
        message: "Invalid login credentials.",
      });
      return;
    }

    let novaUserId = user.nova_user_id ? Number(user.nova_user_id) : null;

    if (!novaUserId) {
      // First, try to fetch existing NOVA user
      const fetchedId = await fetchNovaUserIdByUsername(normalizedEmail);
      
      if (fetchedId) {
        // Link existing NOVA user
        await dbQuery(
          `UPDATE zaki_users SET nova_user_id = $1, updated_at = $2 WHERE id = $3`,
          [Number(fetchedId), new Date().toISOString(), user.id]
        );
        novaUserId = Number(fetchedId);
      } else {
        // Create new NOVA user
        const createResponse = await novaAdminRequest("/v1/admin/users/new", {
          method: "POST",
          body: JSON.stringify({
            username: normalizedEmail,
            password: String(password),
            role: "default",
          }),
        });
        const payload = await createResponse.json().catch(() => ({}));
        if (createResponse.ok && payload?.user?.id) {
          await dbQuery(
            `UPDATE zaki_users SET nova_user_id = $1, updated_at = $2 WHERE id = $3`,
            [Number(payload.user.id), new Date().toISOString(), user.id]
          );
          novaUserId = Number(payload.user.id);
        } else if (createResponse.status === 401) {
          res.status(401).json({
            valid: false,
            token: null,
            message: "NOVA.TYP is not in multi-user mode.",
          });
          return;
        } else if (payload?.error && !String(payload.error).toLowerCase().includes("exists")) {
          // Only fail if it's not a "user exists" error
          res.status(400).json({
            valid: false,
            token: null,
            message: payload.error,
          });
          return;
        }
        // If user exists error, fetch ID and continue
        if (payload?.error && String(payload.error).toLowerCase().includes("exists")) {
          const retryFetchId = await fetchNovaUserIdByUsername(normalizedEmail);
          if (retryFetchId) {
            await dbQuery(
              `UPDATE zaki_users SET nova_user_id = $1, updated_at = $2 WHERE id = $3`,
              [Number(retryFetchId), new Date().toISOString(), user.id]
            );
            novaUserId = Number(retryFetchId);
          }
        }
      }
    }

    if (novaUserId) {
      const assignResult = await ensureUserInDefaultWorkspace(novaUserId);
      if (!assignResult.success) {
        console.warn(
          "[ZAKI] Failed to assign default workspace:",
          assignResult.error
        );
      }
    }

    const response = await fetch(`${apiBase}/request-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: normalizedEmail,
        password: String(password),
      }),
    });
    const data = await response.json().catch(() => ({}));
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error?.message || "Server error." });
  }
};

app.post("/login", loginHandler);
app.post("/api/login", loginHandler);

app.get("/api/legal/consent-status", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const hasBearerToken =
      !!authHeader && /^Bearer\s+\S+/i.test(String(authHeader));

    if (!hasBearerToken) {
      res.status(200).json({
        success: true,
        authenticated: false,
        ...getLegalConsentStatus(null),
      });
      return;
    }

    const authResult = await requireAuthUser(req, res);
    if (!authResult) return;

    res.status(200).json({
      success: true,
      authenticated: true,
      ...getLegalConsentStatus(authResult.zakiUser),
    });
  } catch (error) {
    console.error("[Legal] Consent status error:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Unable to load consent status.",
    });
  }
});

app.post("/api/legal/re-consent", express.json({ limit: "100kb" }), async (req, res) => {
  try {
    const authResult = await requireAuthUser(req, res);
    if (!authResult) return;

    const validation = validateInput(LegalReconsentSchema, req.body || {});
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: validation.errors.map((e) => e.message).join(", "),
      });
      return;
    }

    const policyVersionResult = validateLegalPolicyVersion(
      validation.data.legalPolicyVersion,
      ZAKI_LEGAL_POLICY_VERSION
    );
    if (!policyVersionResult.ok) {
      res.status(409).json({
        success: false,
        error: policyVersionResult.error,
      });
      return;
    }

    await recordLegalConsent({
      userId: authResult.zakiUser.id,
      policyVersion: policyVersionResult.version,
      source: "reconsent",
      req,
    });

    const refreshedUser = await dbGet(
      `SELECT legal_consent_version, legal_consent_at
       FROM zaki_users
       WHERE id = $1`,
      [authResult.zakiUser.id]
    );

    res.status(200).json({
      success: true,
      ...getLegalConsentStatus(refreshedUser || authResult.zakiUser),
    });
  } catch (error) {
    console.error("[Legal] Re-consent error:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Unable to record legal consent.",
    });
  }
});

// -----------------------------------------------------------------------------
// Profile: get/update display name (full_name)
// -----------------------------------------------------------------------------
const ProfileSchema = z.object({
  fullName: z.string().trim().max(80).optional(),
});

const getProfileHandler = async (req, res) => {
  try {
    const authResult = await requireAuthUser(req, res);
    if (!authResult) return;
    const { zakiUser } = authResult;

    res.status(200).json({
      success: true,
      user: {
        username: zakiUser.email,
        fullName: zakiUser.full_name || null,
      },
    });
  } catch (error) {
    console.error("[ZAKI] Profile fetch error:", error);
    res.status(500).json({ error: error?.message || "Server error." });
  }
};

const updateProfileHandler = async (req, res) => {
  try {
    const authResult = await requireAuthUser(req, res);
    if (!authResult) return;
    const { email } = authResult;

    const validation = validateInput(ProfileSchema, req.body || {});
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: validation.errors.map((e) => e.message).join(", "),
      });
      return;
    }

    const nextNameRaw = validation.data.fullName ?? "";
    const nextName = String(nextNameRaw || "").trim();
    const now = new Date().toISOString();

    await dbQuery(
      `UPDATE zaki_users SET full_name = $1, updated_at = $2 WHERE email = $3`,
      [nextName || null, now, email]
    );

    res.status(200).json({
      success: true,
      user: { username: email, fullName: nextName || null },
    });
  } catch (error) {
    console.error("[ZAKI] Profile update error:", error);
    res.status(500).json({ error: error?.message || "Server error." });
  }
};

app.get("/api/profile", getProfileHandler);
app.patch("/api/profile", express.json({ limit: "1mb" }), updateProfileHandler);

// -----------------------------------------------------------------------------
// Account: export + irreversible account deletion
// -----------------------------------------------------------------------------
app.get("/api/account/export", async (req, res) => {
  try {
    const authResult = await requireAuthUser(req, res);
    if (!authResult) return;
    const { email, zakiUser } = authResult;

    const loadOptionalRows = async (sql, params = []) => {
      try {
        const result = await dbQuery(sql, params);
        return result.rows;
      } catch (error) {
        // Older environments may not have every table.
        if (error?.code === "42P01") return [];
        throw error;
      }
    };

    const [accessRedemptions, sharedConversations, memories, memoryConfirmations, memoryConflicts] =
      await Promise.all([
        loadOptionalRows(
          `SELECT id, code_id, code, campaign, redeemed_at, access_expires_at
           FROM access_code_redemptions
           WHERE user_id = $1
           ORDER BY redeemed_at DESC`,
          [zakiUser.id]
        ),
        loadOptionalRows(
          `SELECT id, token, workspace_slug, thread_slug, title, expires_at, view_count, created_at, conversation_snapshot
           FROM shared_conversations
           WHERE user_id = $1
           ORDER BY created_at DESC`,
          [zakiUser.id]
        ),
        loadOptionalRows(
          `SELECT id, content, type, metadata, created_at, updated_at, importance_score, confidence_score, user_verified, source_thread_id, source_message_id
           FROM memories
           WHERE user_id = $1
           ORDER BY created_at DESC`,
          [email]
        ),
        loadOptionalRows(
          `SELECT id, content, type, status, confidence_score, source_thread_id, source_message_id, created_at, updated_at
           FROM memory_confirmations
           WHERE user_id = $1
           ORDER BY created_at DESC`,
          [email]
        ),
        loadOptionalRows(
          `SELECT id, new_content, new_type, new_confidence_score, conflicting_content, conflicting_type, status, resolution, created_at, resolved_at
           FROM memory_conflicts
           WHERE user_id = $1
           ORDER BY created_at DESC`,
          [email]
        ),
      ]);

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      account: {
        id: zakiUser.id,
        email: zakiUser.email,
        fullName: zakiUser.full_name || null,
        dateOfBirth: zakiUser.date_of_birth || null,
        verified: Boolean(zakiUser.verified),
        createdAt: zakiUser.created_at ? new Date(zakiUser.created_at).toISOString() : null,
        updatedAt: zakiUser.updated_at ? new Date(zakiUser.updated_at).toISOString() : null,
      },
      billing: {
        planTier: zakiUser.plan_tier || "free",
        planStatus: zakiUser.plan_status || "inactive",
        currentPeriodEnd: zakiUser.current_period_end
          ? new Date(zakiUser.current_period_end).toISOString()
          : null,
        cancelAtPeriodEnd: Boolean(zakiUser.cancel_at_period_end),
        stripeCustomerId: zakiUser.stripe_customer_id || null,
        stripeSubscriptionId: zakiUser.stripe_subscription_id || null,
        stripePriceId: zakiUser.stripe_price_id || null,
      },
      access: {
        accessExpiresAt: zakiUser.access_expires_at
          ? new Date(zakiUser.access_expires_at).toISOString()
          : null,
        accessCodeCampaign: zakiUser.access_code_campaign || null,
        accessCodeLast: zakiUser.access_code_last || null,
        redemptions: accessRedemptions,
      },
      sharedConversations,
      memories: {
        stored: memories,
        confirmations: memoryConfirmations,
        conflicts: memoryConflicts,
      },
    };

    const fileDate = new Date().toISOString().slice(0, 10);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=\"zaki-account-export-${fileDate}.json\"`
    );
    res.status(200).json({ success: true, export: exportPayload });
  } catch (error) {
    console.error("[Account] Export error:", error);
    res.status(500).json({ error: error?.message || "Account export failed." });
  }
});

app.post("/api/account/delete", express.json({ limit: "100kb" }), async (req, res) => {
  try {
    const authResult = await requireAuthUser(req, res);
    if (!authResult) return;
    const { email, zakiUser } = authResult;

    const validation = validateInput(DeleteAccountSchema, req.body || {});
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: validation.errors.map((e) => e.message).join(", "),
      });
      return;
    }

    const confirmEmail = normalizeEmail(validation.data.confirmEmail);
    if (confirmEmail !== email) {
      res.status(400).json({
        success: false,
        error: "Confirmation email does not match the signed-in account.",
      });
      return;
    }

    // Best-effort cleanup in NOVA.TYP (non-blocking; local deletion remains source of truth).
    if (zakiUser.nova_user_id) {
      try {
        const novaDelete = await novaAdminRequest(
          `/v1/admin/users/${Number(zakiUser.nova_user_id)}`,
          { method: "DELETE" }
        );
        if (!novaDelete.ok && novaDelete.status !== 404) {
          const payload = await novaDelete.json().catch(() => ({}));
          console.warn("[Account] NOVA delete returned non-OK:", novaDelete.status, payload);
        }
      } catch (err) {
        console.warn("[Account] NOVA delete failed:", err?.message || err);
      }
    }

    // Best-effort provider customer cleanup.
    await getBillingAdapter().cleanupCustomerOnDelete({ zakiUser });

    await dbQuery("BEGIN");
    try {
      const deleteByEmail = async (table) => {
        try {
          await dbQuery(`DELETE FROM ${table} WHERE user_id = $1`, [email]);
        } catch (err) {
          // Table may not exist in older deployments; skip safely.
          if (err?.code !== "42P01") throw err;
        }
      };
      await deleteByEmail("memory_notifications");
      await deleteByEmail("memory_conflicts");
      await deleteByEmail("memory_confirmations");
      await deleteByEmail("memory_triggers");
      await deleteByEmail("memories");
      await dbQuery("DELETE FROM zaki_users WHERE id = $1", [zakiUser.id]);
      await dbQuery("COMMIT");
    } catch (err) {
      await dbQuery("ROLLBACK");
      throw err;
    }

    res.status(200).json({ success: true, message: "Account deleted." });
  } catch (error) {
    console.error("[Account] Delete error:", error);
    res.status(500).json({ error: error?.message || "Account delete failed." });
  }
});

// -----------------------------------------------------------------------------
// Billing: Stripe Checkout, Portal, Entitlements
// -----------------------------------------------------------------------------
const CheckoutSchema = z.object({
  plan: z.enum(["student", "personal"]),
  interval: z.enum(["monthly", "yearly"]).optional(),
  provider: z.enum(["stripe", "paddle", "external", "creem"]).optional(),
  context: z
    .object({
      source: z
        .enum([
          "website_nav",
          "website_pricing",
          "chat_input",
          "settings",
          "pricing_page",
          "success_page",
        ])
        .optional(),
    })
    .optional(),
});

app.get("/api/billing/config", async (req, res) => {
  const authResult = await requireAuthUser(req, res);
  if (!authResult) return;
  res.status(200).json({
    success: true,
    configured: getBillingConfigStatus(),
  });
});

app.post("/api/billing/checkout", express.json({ limit: "1mb" }), async (req, res) => {
  try {
    if (!getBillingConfigStatus().checkoutEnabled) {
      sendBillingUnavailable(res, "checkout");
      return;
    }

    const validation = validateInput(CheckoutSchema, req.body || {});
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: validation.errors.map((e) => e.message).join(", "),
      });
      return;
    }

    const { email, zakiUser } = (await requireAuthUser(req, res)) || {};
    if (!email || !zakiUser) return;

    const currentTier = resolveTier(zakiUser.plan_tier || "free");
    const currentStatus = zakiUser.plan_status || "inactive";
    if (isPaidActive(currentTier, currentStatus)) {
      res.status(409).json({
        success: false,
        error: "You are already subscribed to an active paid plan.",
      });
      return;
    }

    const plan = validation.data.plan;
    const interval = normalizeBillingInterval(validation.data.interval, "monthly");
    const context = validation.data.context || undefined;
    const requestedProvider = String(validation.data.provider || "").trim().toLowerCase();
    const configured = getBillingConfigStatus();
    const availableProviders = (configured.checkoutProviders || []).filter((item) => item.enabled);

    const providerToUse = requestedProvider || configured.provider;
    const providerOption = availableProviders.find((item) => item.key === providerToUse);
    if (!providerOption) {
      res.status(400).json({
        success: false,
        error:
          requestedProvider
            ? "Selected billing provider is not available."
            : "No billing provider is currently available for checkout.",
      });
      return;
    }

    const adapter = getBillingAdapterByKey(providerOption.key);
    if (!adapter) {
      res.status(400).json({
        success: false,
        error: "Selected billing provider is not supported.",
      });
      return;
    }

    if (interval === "yearly" && providerOption.key !== "stripe") {
      res.status(400).json({
        success: false,
        error: "Yearly billing is currently available only through Stripe checkout.",
      });
      return;
    }

    const result = await adapter.createCheckout({ plan, interval, email, zakiUser, context });
    res.status(200).json({ success: true, url: result?.url || null });
  } catch (error) {
    console.error("[Billing] Checkout error:", error);
    res.status(error?.status || 500).json({ error: error?.message || "Checkout failed." });
  }
});

const billingSyncHandler = createBillingSyncHandler({
  getBillingConfigStatus,
  requireAuthUser,
  syncStripeSubscriptionState,
  runBillingSyncWithRetries,
  resolveSyncMaxAttempts,
});

const billingReconcileHandler = createBillingReconcileHandler({
  requireAdminUser,
  getBillingConfigStatus,
  dbGet,
  normalizeEmail,
  syncStripeSubscriptionState,
  runBillingSyncWithRetries,
  resolveSyncMaxAttempts,
});

app.post("/api/billing/sync", express.json({ limit: "256kb" }), billingSyncHandler);
app.post(
  "/api/admin/billing/reconcile",
  express.json({ limit: "256kb" }),
  billingReconcileHandler
);

app.post("/api/billing/portal", express.json({ limit: "1mb" }), async (req, res) => {
  try {
    if (!getBillingConfigStatus().portalEnabled) {
      sendBillingUnavailable(res, "portal");
      return;
    }

    const { email, zakiUser } = (await requireAuthUser(req, res)) || {};
    if (!email || !zakiUser) return;

    const result = await getBillingAdapter().createPortal({ email, zakiUser });
    res.status(200).json({ success: true, url: result?.url || null });
  } catch (error) {
    console.error("[Billing] Portal error:", error);
    res.status(error?.status || 500).json({ error: error?.message || "Portal failed." });
  }
});

app.post("/api/billing/cancel", express.json({ limit: "1mb" }), async (req, res) => {
  try {
    if (!getBillingConfigStatus().cancelEnabled) {
      sendBillingUnavailable(res, "cancel");
      return;
    }

    const { zakiUser } = (await requireAuthUser(req, res)) || {};
    if (!zakiUser) return;

    const result = await getBillingAdapter().cancelSubscription({ zakiUser });
    res.status(200).json({
      success: true,
      alreadyScheduled: Boolean(result?.alreadyScheduled),
      cancelAtPeriodEnd: Boolean(result?.cancelAtPeriodEnd),
      currentPeriodEnd: result?.currentPeriodEnd || null,
      status: result?.status || "active",
    });
  } catch (error) {
    console.error("[Billing] Cancel subscription error:", error);
    res.status(error?.status || 500).json({ error: error?.message || "Cancel subscription failed." });
  }
});

app.get("/api/entitlements", async (req, res) => {
  try {
    const { zakiUser } = (await requireAuthUser(req, res)) || {};
    if (!zakiUser) return;

    const tier = resolveTier(zakiUser.plan_tier || "free");
    const status = zakiUser.plan_status || "inactive";
    const priceDetails = resolveStripePriceDetailsById(
      stripePricingCatalog,
      zakiUser.stripe_price_id || null
    );
    const premiumActive = isPaidActive(tier, status);
    const access = getAccessStatus(zakiUser);
    const accessActive = premiumActive || access.active;
    const readOnly = !premiumActive && !access.active;
    const hasPersonal = premiumActive && tier === "personal";

    res.status(200).json({
      success: true,
      plan: {
        tier,
        status,
        priceId: zakiUser.stripe_price_id || null,
        interval: priceDetails?.interval || null,
        currentPeriodEnd: zakiUser.current_period_end || null,
        cancelAtPeriodEnd: Boolean(zakiUser.cancel_at_period_end),
      },
      access: {
        active: accessActive,
        readOnly,
        expiresAt: access.expiresAt,
        campaign: access.campaign,
      },
      features: {
        premium: premiumActive,
        imageGeneration: hasPersonal,
        advancedModels: premiumActive,
        deepResearch: hasPersonal,
        agentMode: hasPersonal,
      },
    });
  } catch (error) {
    console.error("[Billing] Entitlements error:", error);
    res.status(500).json({ error: error?.message || "Entitlements failed." });
  }
});

// -----------------------------------------------------------------------------
// Admins (super admin managed)
// -----------------------------------------------------------------------------
app.get("/api/admin/admins", async (req, res) => {
  try {
    const authResult = await requireAdminUser(req, res);
    if (!authResult) return;

    const result = await dbQuery(
      `SELECT email, role, active, created_by, created_at, updated_at
       FROM zaki_admin_members
       WHERE active = TRUE
       ORDER BY
         CASE WHEN role = 'super_admin' THEN 0 ELSE 1 END,
         email ASC`
    );

    res.status(200).json({
      success: true,
      actor: {
        email: authResult.email,
        role: authResult.admin.role,
        isSuperAdmin: authResult.admin.isSuperAdmin,
      },
      items: result.rows.map(formatAdminMemberRow),
    });
  } catch (error) {
    console.error("[Admin] List members error:", error);
    res.status(500).json({ error: error?.message || "Failed to load admins." });
  }
});

app.post("/api/admin/admins", express.json({ limit: "50kb" }), async (req, res) => {
  try {
    const authResult = await requireSuperAdminUser(req, res);
    if (!authResult) return;

    const validation = validateInput(AdminMemberUpsertSchema, req.body || {});
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: validation.errors.map((e) => e.message).join(", "),
      });
      return;
    }

    const email = normalizeEmail(validation.data.email);
    if (!email) {
      res.status(400).json({
        success: false,
        error: "Invalid admin email address.",
      });
      return;
    }

    if (superAdminEmailSet.has(email)) {
      const row = await dbGet(
        `SELECT email, role, active, created_by, created_at, updated_at
         FROM zaki_admin_members
         WHERE email = $1`,
        [email]
      );
      res.status(200).json({
        success: true,
        member: row ? formatAdminMemberRow(row) : formatAdminMemberRow({
          email,
          role: "super_admin",
          active: true,
          created_by: email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
        message: "Email is reserved as super admin.",
      });
      return;
    }

    const result = await dbQuery(
      `INSERT INTO zaki_admin_members (email, role, active, created_by, created_at, updated_at)
       VALUES ($1, 'admin', TRUE, $2, NOW(), NOW())
       ON CONFLICT (email)
       DO UPDATE SET
         role = 'admin',
         active = TRUE,
         updated_at = NOW()
       RETURNING email, role, active, created_by, created_at, updated_at`,
      [email, authResult.email]
    );

    res.status(201).json({
      success: true,
      member: formatAdminMemberRow(result.rows[0]),
    });
  } catch (error) {
    console.error("[Admin] Add member error:", error);
    res.status(500).json({ error: error?.message || "Failed to add admin." });
  }
});

app.delete("/api/admin/admins/:email", async (req, res) => {
  try {
    const authResult = await requireSuperAdminUser(req, res);
    if (!authResult) return;

    const email = normalizeEmail(req.params.email);
    if (!email) {
      res.status(400).json({ success: false, error: "Invalid admin email address." });
      return;
    }

    if (superAdminEmailSet.has(email)) {
      res.status(400).json({
        success: false,
        error: "Super admin cannot be removed from this endpoint.",
      });
      return;
    }

    const result = await dbQuery(
      `UPDATE zaki_admin_members
       SET active = FALSE,
           updated_at = NOW()
       WHERE email = $1
         AND role = 'admin'
         AND active = TRUE
       RETURNING email, role, active, created_by, created_at, updated_at`,
      [email]
    );
    if (!result.rows[0]) {
      res.status(404).json({
        success: false,
        error: "Admin not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      member: formatAdminMemberRow(result.rows[0]),
    });
  } catch (error) {
    console.error("[Admin] Remove member error:", error);
    res.status(500).json({ error: error?.message || "Failed to remove admin." });
  }
});

// -----------------------------------------------------------------------------
// Access Codes (Admin + User redemption)
// -----------------------------------------------------------------------------
const AccessCodeSchema = z.object({
  code: z.string().min(4),
});

app.post("/api/admin/access-codes", express.json({ limit: "200kb" }), async (req, res) => {
  try {
    const authResult = await requireAdminUser(req, res);
    if (!authResult) return;

    const validation = validateInput(AccessCodeAdminCreateSchema, req.body || {});
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: validation.errors.map((e) => e.message).join(", "),
      });
      return;
    }

    const {
      campaign,
      count,
      durationDays,
      maxRedemptions,
      expiresAt,
      active,
    } = validation.data;
    const parsedExpiry = parseOptionalDateInput(expiresAt ?? null);
    if (!parsedExpiry.ok) {
      res.status(400).json({ success: false, error: parsedExpiry.error });
      return;
    }

    const created = [];
    for (let i = 0; i < count; i += 1) {
      let row = null;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const code = buildGeneratedAccessCode(campaign);
        try {
          const result = await dbQuery(
            `INSERT INTO access_codes
             (code, campaign, duration_days, max_redemptions, expires_at, active)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, code, campaign, duration_days, max_redemptions, redeemed_count, expires_at, active, created_at`,
            [
              code,
              campaign,
              durationDays,
              maxRedemptions,
              parsedExpiry.value,
              active,
            ]
          );
          row = result.rows[0] || null;
          break;
        } catch (err) {
          if (err?.code !== "23505") throw err;
        }
      }
      if (!row) {
        throw new Error("Unable to generate unique access code.");
      }
      created.push(formatAccessCodeRow(row));
    }

    res.status(201).json({
      success: true,
      count: created.length,
      codes: created,
    });
  } catch (error) {
    console.error("[AccessCode][Admin] Create error:", error);
    res.status(500).json({ error: error?.message || "Failed to create access codes." });
  }
});

app.get("/api/admin/access-codes", async (req, res) => {
  try {
    const authResult = await requireAdminUser(req, res);
    if (!authResult) return;

    const validation = validateInput(AccessCodeAdminListSchema, req.query || {});
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: validation.errors.map((e) => e.message).join(", "),
      });
      return;
    }

    const { campaign, active, search, limit, offset } = validation.data;
    const clauses = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(code ILIKE $${params.length} OR campaign ILIKE $${params.length})`);
    }
    if (campaign) {
      params.push(campaign);
      clauses.push(`campaign = $${params.length}`);
    }
    if (active) {
      params.push(active === "true");
      clauses.push(`active = $${params.length}`);
    }

    const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rowsResult = await dbQuery(
      `SELECT id, code, campaign, duration_days, max_redemptions, redeemed_count, expires_at, active, created_at
       FROM access_codes
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1}
       OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    const totalResult = await dbGet(
      `SELECT COUNT(*)::int AS count FROM access_codes ${whereSql}`,
      params
    );

    res.status(200).json({
      success: true,
      total: Number(totalResult?.count || 0),
      limit,
      offset,
      items: rowsResult.rows.map(formatAccessCodeRow),
    });
  } catch (error) {
    console.error("[AccessCode][Admin] List error:", error);
    res.status(500).json({ error: error?.message || "Failed to list access codes." });
  }
});

app.patch("/api/admin/access-codes/:id", express.json({ limit: "100kb" }), async (req, res) => {
  try {
    const authResult = await requireAdminUser(req, res);
    if (!authResult) return;

    const codeId = String(req.params.id || "").trim();
    const idValidation = z.string().uuid("Invalid access code id").safeParse(codeId);
    if (!idValidation.success) {
      res.status(400).json({ success: false, error: "Invalid access code id." });
      return;
    }

    const validation = validateInput(AccessCodeAdminUpdateSchema, req.body || {});
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: validation.errors.map((e) => e.message).join(", "),
      });
      return;
    }

    const updates = [];
    const values = [];

    if (validation.data.campaign !== undefined) {
      values.push(validation.data.campaign);
      updates.push(`campaign = $${values.length}`);
    }
    if (validation.data.durationDays !== undefined) {
      values.push(validation.data.durationDays);
      updates.push(`duration_days = $${values.length}`);
    }
    if (validation.data.maxRedemptions !== undefined) {
      values.push(validation.data.maxRedemptions);
      updates.push(`max_redemptions = $${values.length}`);
    }
    if (validation.data.expiresAt !== undefined) {
      const parsedExpiry = parseOptionalDateInput(validation.data.expiresAt);
      if (!parsedExpiry.ok) {
        res.status(400).json({ success: false, error: parsedExpiry.error });
        return;
      }
      values.push(parsedExpiry.value);
      updates.push(`expires_at = $${values.length}`);
    }
    if (validation.data.active !== undefined) {
      values.push(validation.data.active);
      updates.push(`active = $${values.length}`);
    }

    values.push(codeId);
    const result = await dbQuery(
      `UPDATE access_codes
       SET ${updates.join(", ")}
       WHERE id = $${values.length}
       RETURNING id, code, campaign, duration_days, max_redemptions, redeemed_count, expires_at, active, created_at`,
      values
    );
    if (!result.rows[0]) {
      res.status(404).json({ success: false, error: "Access code not found." });
      return;
    }

    res.status(200).json({
      success: true,
      code: formatAccessCodeRow(result.rows[0]),
    });
  } catch (error) {
    console.error("[AccessCode][Admin] Update error:", error);
    res.status(500).json({ error: error?.message || "Failed to update access code." });
  }
});

app.post("/api/access-code/redeem", express.json({ limit: "50kb" }), async (req, res) => {
  try {
    const validation = validateInput(AccessCodeSchema, req.body || {});
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: validation.errors.map((e) => e.message).join(", "),
      });
      return;
    }

    const { email, zakiUser } = (await requireAuthUser(req, res)) || {};
    if (!email || !zakiUser) return;

    const code = normalizeAccessCode(validation.data.code);
    const redeemResult = await withDbTransaction(async (client) => {
      const accessCodeResult = await client.query(
        `SELECT *
         FROM access_codes
         WHERE UPPER(regexp_replace(code, '[\\s-]+', '', 'g')) = $1
         FOR UPDATE`,
        [code]
      );
      const accessCode = accessCodeResult.rows[0];
      if (!accessCode || !accessCode.active) {
        return { status: 404, body: { success: false, error: "Invalid access code." } };
      }

      if (accessCode.expires_at && new Date(accessCode.expires_at).getTime() < Date.now()) {
        return { status: 410, body: { success: false, error: "Access code expired." } };
      }

      const incrementResult = await client.query(
        `UPDATE access_codes
         SET redeemed_count = redeemed_count + 1
         WHERE id = $1
           AND active = TRUE
           AND (max_redemptions IS NULL OR redeemed_count < max_redemptions)
         RETURNING id, code, campaign, duration_days, redeemed_count`,
        [accessCode.id]
      );
      const incrementedCode = incrementResult.rows[0];
      if (!incrementedCode) {
        return {
          status: 400,
          body: { success: false, error: "Access code already fully redeemed." },
        };
      }

      const userRowResult = await client.query(
        `SELECT access_expires_at
         FROM zaki_users
         WHERE id = $1
         FOR UPDATE`,
        [zakiUser.id]
      );
      const userRow = userRowResult.rows[0];
      if (!userRow) {
        throw new Error("Authenticated user not found during code redemption.");
      }

      const now = new Date();
      const currentExpiry = userRow.access_expires_at
        ? new Date(userRow.access_expires_at)
        : null;
      const baseDate =
        currentExpiry && currentExpiry.getTime() > now.getTime()
          ? currentExpiry
          : now;
      const durationDays = Number(accessCode.duration_days || 30);
      const expiresAt = new Date(
        baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000
      );

      await client.query(
        `UPDATE zaki_users
         SET access_expires_at = $1,
             access_code_campaign = $2,
             access_code_last = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [expiresAt.toISOString(), accessCode.campaign, accessCode.code, zakiUser.id]
      );

      await client.query(
        `INSERT INTO access_code_redemptions
         (code_id, user_id, access_expires_at, campaign, code)
         VALUES ($1, $2, $3, $4, $5)`,
        [accessCode.id, zakiUser.id, expiresAt.toISOString(), accessCode.campaign, code]
      );

      return {
        status: 200,
        body: {
          success: true,
          accessExpiresAt: expiresAt.toISOString(),
          campaign: accessCode.campaign,
        },
      };
    });

    res.status(redeemResult.status).json(redeemResult.body);
  } catch (error) {
    console.error("[AccessCode] Redeem error:", error);
    res.status(500).json({ error: error?.message || "Failed to redeem access code." });
  }
});

const createWorkspaceHandler = async (req, res) => {
  try {
    const authResult = await requireAuthUser(req, res);
    if (!authResult) return;
    const { email, zakiUser } = authResult;

    if (!zakiUser.verified) {
      res.status(403).json({ error: "Email is not verified." });
      return;
    }

    let novaUserId = zakiUser.nova_user_id
      ? Number(zakiUser.nova_user_id)
      : null;
    if (!novaUserId) {
      novaUserId = await fetchNovaUserIdByUsername(email);
      if (novaUserId) {
        await dbQuery(
          `UPDATE zaki_users SET nova_user_id = $1, updated_at = $2 WHERE id = $3`,
          [Number(novaUserId), new Date().toISOString(), zakiUser.id]
        );
      }
    }

    if (!novaUserId) {
      res.status(400).json({
        error: "NOVA.TYP user not found. Please log out and log back in.",
      });
      return;
    }

    const { name } = req.body || {};
    if (!name || !String(name).trim()) {
      res.status(400).json({ error: "Workspace name is required." });
      return;
    }

    const createResponse = await novaAdminRequest("/v1/workspace/new", {
      method: "POST",
      body: JSON.stringify({ name: String(name).trim() }),
    });
    const createData = await createResponse.json().catch(() => ({}));
    if (!createResponse.ok || !createData?.workspace) {
      res.status(400).json({
        error: createData?.message || "Unable to create workspace.",
      });
      return;
    }

    const workspaceSlug = createData.workspace.slug;
    const assignResponse = await novaAdminRequest(
      `/v1/admin/workspaces/${workspaceSlug}/manage-users`,
      {
        method: "POST",
        body: JSON.stringify({ userIds: [Number(novaUserId)], reset: false }),
      }
    );
    const assignData = await assignResponse.json().catch(() => ({}));
    if (!assignResponse.ok || assignData?.success === false) {
      res.status(400).json({
        error: assignData?.error || "Workspace created, but user not assigned.",
      });
      return;
    }

    // Ensure recreated workspace is visible even if it had been locally hidden before.
    await unhideWorkspaceForUser(zakiUser.id, String(workspaceSlug || "").trim().toLowerCase());

    res.status(200).json({
      workspace: createData.workspace,
      message: createData.message || "Workspace created",
    });
  } catch (error) {
    res.status(500).json({ error: error?.message || "Server error." });
  }
};

app.post("/zaki/workspaces", express.json({ limit: "1mb" }), createWorkspaceHandler);
app.post("/api/zaki/workspaces", express.json({ limit: "1mb" }), createWorkspaceHandler);

/**
 * Route: DELETE /zaki/workspaces/:slug
 * Proxy to NOVA.TYP admin API for workspace deletion
 * Uses admin API key to bypass permission restrictions
 */
const deleteWorkspaceHandler = async (req, res) => {
  try {
    const authResult = await requireAuthUser(req, res);
    if (!authResult) return;
    const { email, zakiUser } = authResult;
    const authHeader = req.headers.authorization;

    if (!zakiUser.verified) {
      res.status(403).json({ error: "Email is not verified." });
      return;
    }

    const slug = String(req.params.slug || "").trim();
    if (!slug) {
      res.status(400).json({ success: false, error: "Workspace slug is required." });
      return;
    }
    const normalizedSlug = slug.toLowerCase();
    const defaultSlug = String(ZAKI_DEFAULT_WORKSPACE_SLUG || "zaki").trim().toLowerCase();
    if (normalizedSlug === "zaki" || normalizedSlug === defaultSlug) {
      res.status(400).json({
        success: false,
        error: "Default workspace cannot be deleted.",
      });
      return;
    }

    // Permission scope: only allow deleting a workspace currently visible to this session user.
    const accessCheck = await workspaceVisibleForSession(authHeader, normalizedSlug);
    if (!accessCheck.success) {
      res.status(accessCheck.status || 502).json({
        success: false,
        error: accessCheck.error || "Unable to verify workspace permissions.",
      });
      return;
    }
    if (!accessCheck.visible) {
      res.status(403).json({
        success: false,
        error: "You do not have access to delete this workspace.",
      });
      return;
    }

    // Log the deletion attempt
    console.log(`[ZAKI] User ${email} deleting workspace ${slug}`);

    // Use admin API to delete the workspace
    console.log(`[ZAKI] Calling NOVA API: DELETE /v1/admin/workspaces/${slug}`);
    const deleteResponse = await novaAdminRequest(`/v1/admin/workspaces/${slug}`, {
      method: "DELETE",
    });

    const deleteData = await deleteResponse.json().catch(() => ({}));
    console.log(`[ZAKI] NOVA delete response: ${deleteResponse.status}`, deleteData);

    if (!deleteResponse.ok && deleteResponse.status !== 404) {
      console.error(`[ZAKI] Failed to delete workspace ${slug}:`, deleteData);
      if (ZAKI_WORKSPACE_SOFT_HIDE_FALLBACK_ENABLED) {
        await hideWorkspaceForUser(
          zakiUser.id,
          normalizedSlug,
          `upstream_delete_failed:${deleteResponse.status || "unknown"}`
        );
        res.status(200).json({
          success: true,
          softHidden: true,
          message:
            "Workspace hidden for this account. Upstream deletion is pending and will be retried by support.",
        });
        return;
      }
      res.status(deleteResponse.status || 400).json({
        success: false,
        error: deleteData?.message || deleteData?.error || `NOVA API error: ${deleteResponse.status}`
      });
      return;
    }

    // Idempotent delete semantics: treat already-deleted upstream resource as success.
    if (deleteResponse.status === 404) {
      console.log(`[ZAKI] Workspace ${slug} already deleted upstream (404).`);
      await unhideWorkspaceForUser(zakiUser.id, normalizedSlug);
      res.status(200).json({
        success: true,
        message: "Workspace already deleted.",
      });
      return;
    }

    // Strong consistency check: confirm workspace is gone for this user before reporting success.
    const verification = await verifyWorkspaceDeleted(authHeader, normalizedSlug);
    if (!verification.success) {
      if (ZAKI_WORKSPACE_SOFT_HIDE_FALLBACK_ENABLED) {
        await hideWorkspaceForUser(
          zakiUser.id,
          normalizedSlug,
          "verification_unavailable"
        );
        res.status(200).json({
          success: true,
          softHidden: true,
          message:
            "Workspace hidden for this account while deletion verification is unavailable.",
        });
        return;
      }
      res.status(502).json({
        success: false,
        error: verification.error || "Unable to verify workspace deletion.",
      });
      return;
    }
    if (!verification.deleted) {
      if (ZAKI_WORKSPACE_SOFT_HIDE_FALLBACK_ENABLED) {
        await hideWorkspaceForUser(
          zakiUser.id,
          normalizedSlug,
          "verification_failed"
        );
        res.status(200).json({
          success: true,
          softHidden: true,
          message:
            "Workspace hidden for this account. Upstream deletion could not be confirmed.",
        });
        return;
      }
      res.status(409).json({
        success: false,
        error: "Workspace deletion could not be confirmed. Please retry.",
      });
      return;
    }

    console.log(`[ZAKI] Workspace ${slug} deleted successfully by ${email}`);
    await unhideWorkspaceForUser(zakiUser.id, normalizedSlug);

    res.status(200).json({
      success: true,
      message: "Workspace deleted successfully."
    });
  } catch (error) {
    console.error("[ZAKI] Workspace deletion error:", error);
    res.status(500).json({ success: false, error: "Failed to delete workspace." });
  }
};

app.delete("/zaki/workspaces/:slug", deleteWorkspaceHandler);
app.delete("/api/zaki/workspaces/:slug", deleteWorkspaceHandler);

const verifyHandler = async (req, res) => {
  const token = String(req.query.token || "");
  const wantsJson =
    String(req.query.format || "").toLowerCase() === "json" ||
    String(req.headers.accept || "").includes("application/json");

  if (!token) {
    if (wantsJson) {
      res.status(400).json({ success: false, error: "Missing token." });
    } else {
      res.redirect(302, getLoginRedirectUrl("missing_token"));
    }
    return;
  }

  const record = await dbGet(
    `SELECT vt.id, vt.user_id, vt.expires_at, vt.used_at, u.email
     FROM verification_tokens vt
     JOIN zaki_users u ON u.id = vt.user_id
     WHERE vt.token = $1`,
    [token]
  );

  if (!record) {
    if (wantsJson) {
      res.status(404).json({ success: false, error: "Invalid token." });
    } else {
      res.redirect(302, getLoginRedirectUrl("invalid_token"));
    }
    return;
  }

  if (record.used_at) {
    if (wantsJson) {
      res.status(200).json({ success: true, message: "Already verified." });
    } else {
      res.redirect(302, getLoginRedirectUrl("already_verified"));
    }
    return;
  }

  const expiresAt = Number(record.expires_at);
  if (Date.now() > expiresAt) {
    if (wantsJson) {
      res.status(410).json({ success: false, error: "Token expired." });
    } else {
      res.redirect(302, getLoginRedirectUrl("expired"));
    }
    return;
  }

  const now = Date.now();
  const nowIso = new Date().toISOString();
  await dbQuery(`UPDATE verification_tokens SET used_at = $1 WHERE id = $2`, [
    now,
    record.id,
  ]);
  await dbQuery(
    `UPDATE zaki_users SET verified = true, updated_at = $1 WHERE id = $2`,
    [nowIso, record.user_id]
  );

  if (wantsJson) {
    res.status(200).json({
      success: true,
      message: "Email verified. You can sign in now.",
    });
  } else {
    res.redirect(302, getLoginRedirectUrl("success"));
  }
};

app.get("/verify", verifyHandler);
app.get("/api/verify", verifyHandler);

// =============================================================================
// Chat Integration with Memory
// =============================================================================

const MEMORY_CONTEXT_ENVELOPE_OPEN = "[[ZAKI_MEMORY_CONTEXT_V2]]";
const MEMORY_CONTEXT_ENVELOPE_CLOSE = "[[/ZAKI_MEMORY_CONTEXT_V2]]";

/**
 * Intercept stream-chat requests to inject memory context
 * Route: POST /workspace/:slug/thread/:threadSlug/stream-chat
 */
const streamChatHandler = async (req, res) => {
  console.log(`[Chat] Received message request for ${req.params.slug}/${req.params.threadSlug}`);
  try {
    const apiBase = getApiBase();
    if (!apiBase) {
      console.error('[Chat] NOVA_TYP_BASE_URL not configured');
      return res.status(500).json({ error: "NOVA_TYP_BASE_URL is not configured." });
    }

    const authHeader = req.headers.authorization;
    const authResult = await requireAuthUser(req, res);
    if (!authResult) {
      console.error("[Chat] Authorization failed");
      return;
    }
    const userEmail = authResult.email;
    const zakiUser = authResult.zakiUser;
    console.log(`[Chat] User: ${userEmail}`);

    if (zakiUser) {
      const tier = resolveTier(zakiUser.plan_tier || "free");
      const status = zakiUser.plan_status || "inactive";
      const premiumActive = isPaidActive(tier, status);
      const access = getAccessStatus(zakiUser);
      if (!premiumActive && !access.active) {
        return res.status(403).json({
          error: "Access code required.",
          code: "access_expired",
          message:
            "Your access code took a coffee break. Add a fresh code to keep chatting.",
        });
      }
    }

    const requestPayload = req.body;
    const originalMessage = extractStreamMessage(requestPayload);
    console.log(`[Chat] Message length: ${originalMessage.length}`);

    if (!originalMessage) {
      return res.status(400).json({ error: "Message is required." });
    }
    if (originalMessage.length > MAX_STREAM_MESSAGE_CHARS) {
      return res.status(400).json({
        error: `Message is too long. Maximum ${MAX_STREAM_MESSAGE_CHARS} characters.`,
      });
    }

    const { slug, threadSlug } = req.params;

    let enrichedMessage = originalMessage;
    let memoryInjected = false;
    let memorySources = [];

    // Inject memory context if we have a user
    if (userEmail) {
      try {
        // Build context from memory
        const memoryResult = await buildContext({
          userId: userEmail,
          query: originalMessage,
          maxChars: 1500,
          currentThreadId: threadSlug,
        });

        if (memoryResult.context) {
          // Versioned envelope keeps context injection parseable and easy to strip client-side.
          enrichedMessage = `${MEMORY_CONTEXT_ENVELOPE_OPEN}
Use ONLY if directly relevant to the user's request. Ignore if not relevant. Do not quote verbatim. Do not hallucinate details beyond this memory.
${memoryResult.context}
${MEMORY_CONTEXT_ENVELOPE_CLOSE}
${originalMessage}`;
          memoryInjected = true;
          memorySources = (memoryResult.sources || []).map((source) => ({
            id: source.id,
            content: source.content,
            type: source.type,
          }));
          recordMemoryTelemetry("context.injected", memorySources.length || 1);
          console.log(`[Memory] Injected ${memoryResult.sources.length} memories`);
        } else {
          recordMemoryTelemetry("context.miss");
          console.log("[Memory] No context injected");
        }

        // Optional: Extract and stage for confirmation during stream (disabled by default)
        if (process.env.ZAKI_STREAM_CAPTURE === "true") {
          previewAndNotify({ userId: userEmail, message: originalMessage, threadId: threadSlug })
            .then((result) => {
              if (result.pending > 0) {
                console.log(`[Memory] ${result.pending} memories staged for confirmation`);
              }
            })
            .catch((err) => {
              console.warn('[Memory] Preview failed:', err.message);
            });
        }
      } catch (err) {
        recordMemoryTelemetry("pipeline.error");
        console.warn("[Memory] Context injection failed:", err.message);
        // Continue without memory
      }
    }

    // Forward to NOVA.TYP with enriched message + original payload fields
    const targetUrl = `${apiBase}/workspace/${slug}/thread/${threadSlug}/stream-chat`;
    
    console.log(`[Chat] Forwarding to NOVA: ${targetUrl}`);
    console.log(`[Chat] Memory injected: ${memoryInjected}`);

    const upstreamPayload = buildStreamUpstreamPayload(requestPayload, enrichedMessage);
    const upstreamResponse = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify(upstreamPayload),
    });

    console.log(`[Chat] NOVA response status: ${upstreamResponse.status}`);

    // Stream the response back
    res.status(upstreamResponse.status);
    copyResponseHeaders(upstreamResponse, res);
    res.setHeader(
      "X-Zaki-Web-Search",
      upstreamPayload.webSearchEnabled === true ? "1" : "0"
    );
    if (typeof upstreamPayload.mode === "string" && upstreamPayload.mode.trim()) {
      res.setHeader("X-Zaki-Mode", upstreamPayload.mode.trim());
    }

    if (!upstreamResponse.body) {
      res.end();
      return;
    }

    // Add memory injection indicator to first chunk
    const reader = upstreamResponse.body.getReader();
    let firstChunk = true;

    const stream = new ReadableStream({
      async pull(controller) {
        try {
          const { value, done } = await reader.read();
          if (done) {
            console.log('[Chat] Stream complete');
            controller.close();
            return;
          }
          
          if (firstChunk && memoryInjected && memorySources.length > 0) {
            const indicatorPayload = {
              type: "memoryUsed",
              count: memorySources.length,
              sources: memorySources.slice(0, 5),
            };
            const indicator = new TextEncoder().encode(`data: ${JSON.stringify(indicatorPayload)}\n\n`);
            controller.enqueue(indicator);
          }
          
          firstChunk = false;
          controller.enqueue(value);
        } catch (err) {
          console.error('[Chat] Stream error:', err.message);
          controller.error(err);
        }
      },
    });

    Readable.fromWeb(stream).pipe(res);
  } catch (error) {
    console.error("[Chat] Stream error:", error);
    res.status(500).json({ error: error?.message || "Chat stream failed." });
  }
};

app.post(
  "/workspace/:slug/thread/:threadSlug/stream-chat",
  streamChatLimiter,
  express.json({ limit: "10mb" }),
  streamChatHandler
);
app.post(
  "/api/workspace/:slug/thread/:threadSlug/stream-chat",
  streamChatLimiter,
  express.json({ limit: "10mb" }),
  streamChatHandler
);

// =============================================================================
// CONVERSATION SUMMARIZATION (Memory)
// =============================================================================

/**
 * POST /api/memory/end-session
 * Called when user leaves a thread - triggers conversation summarization
 */
app.post(
  "/api/memory/end-session",
  express.json({ limit: "5mb" }),
  createSessionEndHandler({
    requireAuthUser,
    summarizeConversation,
    isEnabled: () => ZAKI_ENABLE_SESSION_SUMMARIZATION,
  })
);

// =============================================================================
// SHARE CONVERSATION ROUTES
// =============================================================================

const SHARE_EXPIRY_DAYS = 10;

/**
 * POST /api/share/create
 * Create a shareable link for a conversation
 */
app.post("/api/share/create", express.json({ limit: "5mb" }), async (req, res) => {
  try {
    const authResult = await requireAuthUser(req, res);
    if (!authResult) return;
    const zakiUserId = authResult.zakiUser.id;
    
    const { 
      workspaceSlug, 
      threadSlug, 
      title,
      conversation, // Array of messages
      isPasswordProtected = false,
      password = null
    } = req.body;
    
    if (!workspaceSlug || !threadSlug || !conversation || !Array.isArray(conversation)) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    // Generate unique share token
    const shareToken = crypto.randomBytes(16).toString('hex');
    
    // Hash password if protected
    let passwordHash = null;
    if (isPasswordProtected && password) {
      passwordHash = await bcrypt.hash(password, 10);
    }
    
    // Calculate expiry (10 days from now)
    const expiresAt = new Date(Date.now() + SHARE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    
    await dbQuery(
      `INSERT INTO shared_conversations 
       (token, user_id, workspace_slug, thread_slug, title, conversation_snapshot, 
        is_password_protected, password_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        shareToken,
        zakiUserId,
        workspaceSlug,
        threadSlug,
        title || 'Shared Conversation',
        JSON.stringify(conversation),
        isPasswordProtected,
        passwordHash,
        expiresAt.toISOString()
      ]
    );
    
    const shareUrl = `${ZAKI_APP_URL || 'http://localhost:5173'}/share/${shareToken}`;
    
    res.json({
      success: true,
      token: shareToken,
      url: shareUrl,
      expiresAt: expiresAt.toISOString(),
      isPasswordProtected
    });
    
  } catch (error) {
    console.error("[Share] Create error:", error);
    res.status(500).json({ error: "Failed to create share link" });
  }
});

/**
 * GET /api/share/list
 * List all share links for the current user
 */
app.get("/api/share/list", async (req, res) => {
  try {
    const authResult = await requireAuthUser(req, res);
    if (!authResult) return;
    const userId = authResult.zakiUser.id;

    const shares = await dbQuery(
      `SELECT token, title, is_password_protected, expires_at, view_count, created_at
       FROM shared_conversations
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      shares: shares.rows.map((s) => ({
        token: s.token,
        title: s.title,
        isPasswordProtected: s.is_password_protected,
        expiresAt: s.expires_at,
        viewCount: s.view_count,
        createdAt: s.created_at,
        isExpired: new Date(s.expires_at) < new Date(),
      })),
    });
  } catch (error) {
    console.error("[Share] List error:", error);
    res.status(500).json({ error: "Failed to list shares" });
  }
});

/**
 * GET /api/share/:token
 * Get shared conversation metadata (doesn't include content if password protected)
 */
app.get("/api/share/:token", async (req, res) => {
  try {
    const { token } = req.params;
    
    const share = await dbGet(
      `SELECT id, title, is_password_protected, expires_at, view_count, created_at
       FROM shared_conversations 
       WHERE token = $1`,
      [token]
    );
    
    if (!share) {
      return res.status(404).json({ error: "Share link not found" });
    }
    
    // Check if expired
    if (new Date(share.expires_at) < new Date()) {
      return res.status(410).json({ error: "Share link has expired" });
    }
    
    res.json({
      title: share.title,
      isPasswordProtected: share.is_password_protected,
      expiresAt: share.expires_at,
      viewCount: share.view_count,
      createdAt: share.created_at
    });
    
  } catch (error) {
    console.error("[Share] Get error:", error);
    res.status(500).json({ error: "Failed to get share info" });
  }
});

/**
 * POST /api/share/:token/view
 * Get the actual conversation content (with optional password verification)
 */
app.post("/api/share/:token/view", express.json(), async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body || {};
    
    const share = await dbGet(
      `SELECT * FROM shared_conversations WHERE token = $1`,
      [token]
    );
    
    if (!share) {
      return res.status(404).json({ error: "Share link not found" });
    }
    
    // Check if expired
    if (new Date(share.expires_at) < new Date()) {
      return res.status(410).json({ error: "Share link has expired" });
    }
    
    // Verify password if protected
    if (share.is_password_protected) {
      if (!password) {
        return res.status(401).json({ error: "Password required", requiresPassword: true });
      }
      
      const isValid = await bcrypt.compare(password, share.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid password" });
      }
    }
    
    // Increment view count
    await dbQuery(
      `UPDATE shared_conversations SET view_count = view_count + 1 WHERE id = $1`,
      [share.id]
    );
    
    // conversation_snapshot is already parsed by pg (JSONB column)
    const conversation = typeof share.conversation_snapshot === 'string' 
      ? JSON.parse(share.conversation_snapshot) 
      : share.conversation_snapshot;
    
    res.json({
      title: share.title,
      conversation,
      expiresAt: share.expires_at,
      viewCount: share.view_count + 1,
      createdAt: share.created_at
    });
    
  } catch (error) {
    console.error("[Share] View error:", error);
    res.status(500).json({ error: "Failed to load conversation" });
  }
});

/**
 * DELETE /api/share/:token
 * Delete a share link (owner only)
 */
app.delete("/api/share/:token", async (req, res) => {
  try {
    const authResult = await requireAuthUser(req, res);
    if (!authResult) return;
    const userId = authResult.zakiUser.id;
    
    const { token: shareToken } = req.params;
    
    const result = await dbQuery(
      `DELETE FROM shared_conversations WHERE token = $1 AND user_id = $2`,
      [shareToken, userId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Share link not found or unauthorized" });
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error("[Share] Delete error:", error);
    res.status(500).json({ error: "Failed to delete share link" });
  }
});

// =============================================================================
// CATCH-ALL PROXY
// =============================================================================

app.all("*", async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }

    const apiBase = getApiBase();
    if (!apiBase) {
      res.status(500).json({ error: "NOVA_TYP_BASE_URL is not configured." });
      return;
    }

    const proxiedPath = req.originalUrl.replace(/^\/api(\/|$)/, "/");
    const targetUrl = `${apiBase}${proxiedPath}`;
    const headers = buildProxyHeaders(req);
    const method = req.method.toUpperCase();
    const needsBody = !["GET", "HEAD"].includes(method);

    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body: needsBody ? req : undefined,
      duplex: needsBody ? "half" : undefined,
    });

    res.status(upstream.status);
    copyResponseHeaders(upstream, res);

    if (!upstream.body) {
      res.end();
      return;
    }

    Readable.fromWeb(upstream.body).pipe(res);
  } catch (error) {
    res.status(500).json({ error: error?.message || "Proxy error." });
  }
});

app.listen(PORT, () => {
  console.log(`ZAKI backend listening on port ${PORT}`);
});
