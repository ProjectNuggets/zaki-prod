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
import { initDb, dbGet, dbQuery } from "./db.js";
import { createMemoryRoutes, buildContext } from "./memory/index.js";
import { extractFacts } from "./memory-extraction.js";
import { summarizeConversation } from "./memory-legacy.js";

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
    // Check for duplicates
    const hash = crypto.createHash("sha256").update(fact.content).digest("hex");
    const existing = await dbGet(
      "SELECT id FROM memories WHERE user_id = $1 AND content_hash = $2",
      [userId, hash]
    );
    if (existing) continue;
    
    // Stage for confirmation
    const id = crypto.randomUUID();
    await dbQuery(
      `INSERT INTO memory_confirmations (id, user_id, content, type, source_thread_id, source_message_id, confidence_score, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())`,
      [id, userId, fact.content, fact.type, threadId, null, 0.8]
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

const app = express();
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
const SKIP_EMAIL_VERIFICATION = ["non", "none", "no"].includes(
  ZAKI_EMAIL_MODE.toLowerCase()
);
const ZAKI_VERIFY_TTL_MINUTES = Number(
  process.env.ZAKI_VERIFY_TTL_MINUTES || 60
);
const ZAKI_RESET_TTL_MINUTES = Number(
  process.env.ZAKI_RESET_TTL_MINUTES || 30
);
const ZAKI_INCLUDE_VERIFY_LINK =
  String(process.env.ZAKI_INCLUDE_VERIFY_LINK || "").toLowerCase() === "true";
const allowedOrigins = (process.env.ZAKI_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
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

const PRICE_BY_TIER = {
  student: STRIPE_PRICE_STUDENT,
  personal: STRIPE_PRICE_PERSONAL,
};

const TIER_BY_PRICE = Object.entries(PRICE_BY_TIER).reduce((acc, [tier, priceId]) => {
  if (priceId) acc[priceId] = tier;
  return acc;
}, {});

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

// Stripe webhook must use raw body (must be registered before express.json)
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    res.status(500).json({ error: "Stripe is not configured." });
    return;
  }
  const signature = req.headers["stripe-signature"];
  if (!signature) {
    res.status(400).json({ error: "Missing Stripe signature." });
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const customerId = session.customer;
      const email = session.customer_email || session.metadata?.user_email;
      if (customerId && email) {
        const normalizedEmail = normalizeEmail(email);
        const zakiUser = await dbGet(
          "SELECT id FROM zaki_users WHERE email = $1",
          [normalizedEmail]
        );
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
      const tierFromPrice = priceId ? TIER_BY_PRICE[priceId] : null;
      const tierFromMetadata = subscription.metadata?.plan_tier;
      const resolvedTier = resolveTier(tierFromPrice || tierFromMetadata || "free");
      const status = subscription.status || "inactive";
      const currentPeriodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null;
      const cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);

      const user = await resolveUserByStripeCustomer(customerId, subscription.metadata?.user_email);
      if (user) {
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
               billing_updated_at = NOW(),
               updated_at = NOW()
           WHERE id = $8`,
          [
            customerId,
            subscription.id,
            priceId,
            tierToStore,
            statusToStore,
            currentPeriodEnd,
            cancelAtPeriodEnd,
            user.id,
          ]
        );
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("[Stripe] Webhook handler error:", err);
    res.status(500).json({ error: "Webhook handler failed." });
  }
});

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
  max: 10, // 10 attempts per hour
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

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // In development, allow all origins
      if (!isProduction && (!origin || allowedOrigins.length === 0)) {
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
app.use((req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  const incomingRequestId = req.headers["x-request-id"];
  const requestId =
    (typeof incomingRequestId === "string" && incomingRequestId.trim()) ||
    crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  
  // Log request start
  console.log(`[${timestamp}] [${requestId}] → ${req.method} ${req.path} (${req.ip})`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusColor = status < 400 ? '\x1b[32m' : status < 500 ? '\x1b[33m' : '\x1b[31m';
    const resetColor = '\x1b[0m';
    
    console.log(`[${timestamp}] [${requestId}] ← ${req.method} ${req.path} ${statusColor}${status}${resetColor} ${duration}ms`);
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

const LoginSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().email().optional(),
  password: z.string().min(1, "Password is required"),
}).refine(data => data.email || data.username, {
  message: "Email or username is required",
  path: ["email"]
});

const SignupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
});

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

// Initialize memory routes
createMemoryRoutes(app);

await initDb();

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
  return String(value || "").trim().toLowerCase();
}

function normalizeAccessCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "");
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

  return { email, zakiUser };
}

async function resolveUserByStripeCustomer(customerId, fallbackEmail) {
  if (!customerId) return null;
  let user = await dbGet(
    "SELECT id, email FROM zaki_users WHERE stripe_customer_id = $1",
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
  user = await dbGet("SELECT id, email FROM zaki_users WHERE email = $1", [
    normalizedEmail,
  ]);
  if (user) {
    await dbQuery(
      `UPDATE zaki_users SET stripe_customer_id = $1, billing_updated_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [customerId, user.id]
    );
  }
  return user;
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

async function sendVerificationEmail(email, token) {
  const baseUrl =
    ZAKI_PUBLIC_URL ||
    `http://localhost:${PORT}`;
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const verifyBase = normalizedBase.endsWith("/api")
    ? normalizedBase.replace(/\/api$/, "")
    : normalizedBase;
  const verifyUrl = `${verifyBase}/verify?token=${token}`;
  const subject = "Verify your ZAKI account";
  const text = `Welcome to ZAKI! Verify your email by visiting: ${verifyUrl}`;

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
  const subject = "Reset your ZAKI password";
  const text = `Use this link to reset your password: ${resetUrl}`;

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

    const { email, password, name, dateOfBirth } = validation.data;
    const normalizedEmail = normalizeEmail(email);
    const normalizedName = name.trim();
    const normalizedDob = dateOfBirth;

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
// Account: irreversible account deletion
// -----------------------------------------------------------------------------
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

    // Best-effort Stripe customer cleanup.
    if (stripe && zakiUser.stripe_customer_id) {
      try {
        await stripe.customers.del(zakiUser.stripe_customer_id);
      } catch (err) {
        console.warn("[Account] Stripe customer delete failed:", err?.message || err);
      }
    }

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
});

app.post("/api/billing/checkout", express.json({ limit: "1mb" }), async (req, res) => {
  try {
    if (!stripe) {
      res.status(500).json({ error: "Stripe is not configured." });
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

    const plan = validation.data.plan;
    if (plan === "student" && !isEduEmail(email)) {
      res.status(400).json({
        error: "Student plan requires a .edu email address.",
      });
      return;
    }

    if (plan === "student") {
      await dbQuery(
        `UPDATE zaki_users SET student_verified = true, student_verified_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [zakiUser.id]
      );
    }

    const priceId = PRICE_BY_TIER[plan];
    if (!priceId) {
      res.status(400).json({ error: "Plan is not configured." });
      return;
    }

    let customerId = zakiUser.stripe_customer_id;
    if (!customerId) {
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
    }

    const appUrl = getAppUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${appUrl}/pricing?billing=success`,
      cancel_url: `${appUrl}/pricing?billing=cancel`,
      metadata: { user_email: email, plan_tier: plan },
      subscription_data: {
        metadata: { user_email: email, plan_tier: plan },
      },
    });

    res.status(200).json({ success: true, url: session.url });
  } catch (error) {
    console.error("[Billing] Checkout error:", error);
    res.status(500).json({ error: error?.message || "Checkout failed." });
  }
});

app.post("/api/billing/portal", express.json({ limit: "1mb" }), async (req, res) => {
  try {
    if (!stripe) {
      res.status(500).json({ error: "Stripe is not configured." });
      return;
    }

    const { email, zakiUser } = (await requireAuthUser(req, res)) || {};
    if (!email || !zakiUser) return;

    let customerId = zakiUser.stripe_customer_id;
    if (!customerId) {
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
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getAppUrl()}/pricing?billing=manage`,
    });

    res.status(200).json({ success: true, url: portal.url });
  } catch (error) {
    console.error("[Billing] Portal error:", error);
    res.status(500).json({ error: error?.message || "Portal failed." });
  }
});

app.post("/api/billing/cancel", express.json({ limit: "1mb" }), async (req, res) => {
  try {
    if (!stripe) {
      res.status(500).json({ error: "Stripe is not configured." });
      return;
    }

    const { zakiUser } = (await requireAuthUser(req, res)) || {};
    if (!zakiUser) return;

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
      res.status(400).json({ error: "No active subscription found." });
      return;
    }

    if (!subscription) {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
    }

    if (!subscription || subscription.status === "canceled") {
      res.status(400).json({ error: "Subscription is already canceled." });
      return;
    }

    const alreadyScheduled = Boolean(subscription.cancel_at_period_end);
    const finalSubscription = alreadyScheduled
      ? subscription
      : await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });

    const priceId =
      finalSubscription.items?.data?.[0]?.price?.id || zakiUser.stripe_price_id || null;
    const tier = resolveTier((priceId && TIER_BY_PRICE[priceId]) || zakiUser.plan_tier || "free");
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

    res.status(200).json({
      success: true,
      alreadyScheduled,
      cancelAtPeriodEnd: true,
      currentPeriodEnd,
      status: finalSubscription.status,
    });
  } catch (error) {
    console.error("[Billing] Cancel subscription error:", error);
    res.status(500).json({ error: error?.message || "Cancel subscription failed." });
  }
});

app.get("/api/entitlements", async (req, res) => {
  try {
    const { zakiUser } = (await requireAuthUser(req, res)) || {};
    if (!zakiUser) return;

    const tier = resolveTier(zakiUser.plan_tier || "free");
    const status = zakiUser.plan_status || "inactive";
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
// Access Codes (Free tier monthly activation)
// -----------------------------------------------------------------------------
const AccessCodeSchema = z.object({
  code: z.string().min(4),
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
    const accessCode = await dbGet(
      "SELECT * FROM access_codes WHERE code = $1",
      [code]
    );
    if (!accessCode || !accessCode.active) {
      res.status(404).json({ success: false, error: "Invalid access code." });
      return;
    }

    if (accessCode.expires_at && new Date(accessCode.expires_at).getTime() < Date.now()) {
      res.status(410).json({ success: false, error: "Access code expired." });
      return;
    }

    if (
      accessCode.max_redemptions !== null &&
      Number(accessCode.redeemed_count) >= Number(accessCode.max_redemptions)
    ) {
      res.status(400).json({ success: false, error: "Access code already fully redeemed." });
      return;
    }

    const now = new Date();
    const currentExpiry = zakiUser.access_expires_at
      ? new Date(zakiUser.access_expires_at)
      : null;
    const baseDate =
      currentExpiry && currentExpiry.getTime() > now.getTime()
        ? currentExpiry
        : now;
    const durationDays = Number(accessCode.duration_days || 30);
    const expiresAt = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    await dbQuery(
      `UPDATE zaki_users
       SET access_expires_at = $1,
           access_code_campaign = $2,
           access_code_last = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [expiresAt.toISOString(), accessCode.campaign, code, zakiUser.id]
    );

    await dbQuery(
      `INSERT INTO access_code_redemptions
       (code_id, user_id, access_expires_at, campaign, code)
       VALUES ($1, $2, $3, $4, $5)`,
      [accessCode.id, zakiUser.id, expiresAt.toISOString(), accessCode.campaign, code]
    );

    await dbQuery(
      `UPDATE access_codes SET redeemed_count = redeemed_count + 1 WHERE id = $1`,
      [accessCode.id]
    );

    res.status(200).json({
      success: true,
      accessExpiresAt: expiresAt.toISOString(),
      campaign: accessCode.campaign,
    });
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

    if (!zakiUser.verified) {
      res.status(403).json({ error: "Email is not verified." });
      return;
    }

    const { slug } = req.params;

    // Log the deletion attempt
    console.log(`[ZAKI] User ${email} deleting workspace ${slug}`);

    // Use admin API to delete the workspace
    console.log(`[ZAKI] Calling NOVA API: DELETE /v1/admin/workspaces/${slug}`);
    const deleteResponse = await novaAdminRequest(`/v1/admin/workspaces/${slug}`, {
      method: "DELETE",
    });

    const deleteData = await deleteResponse.json().catch(() => ({}));
    console.log(`[ZAKI] NOVA delete response: ${deleteResponse.status}`, deleteData);

    if (!deleteResponse.ok) {
      console.error(`[ZAKI] Failed to delete workspace ${slug}:`, deleteData);
      res.status(deleteResponse.status || 400).json({
        success: false,
        error: deleteData?.message || deleteData?.error || `NOVA API error: ${deleteResponse.status}`
      });
      return;
    }

    console.log(`[ZAKI] Workspace ${slug} deleted successfully by ${email}`);

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
      res.status(400).send("Missing verification token.");
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
      res.status(404).send("Invalid verification token.");
    }
    return;
  }

  if (record.used_at) {
    if (wantsJson) {
      res.status(200).json({ success: true, message: "Already verified." });
    } else {
      res.status(200).send("Your email is already verified. You can sign in.");
    }
    return;
  }

  const expiresAt = Number(record.expires_at);
  if (Date.now() > expiresAt) {
    if (wantsJson) {
      res.status(410).json({ success: false, error: "Token expired." });
    } else {
      res.status(410).send("Verification link expired. Please sign up again.");
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
    res
      .status(200)
      .send("Email verified. Return to ZAKI and sign in.");
  }
};

app.get("/verify", verifyHandler);
app.get("/api/verify", verifyHandler);

// =============================================================================
// Chat Integration with Memory
// =============================================================================

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

    const { message } = req.body || {};
    const originalMessage = String(message || "").trim();
    console.log(`[Chat] Message length: ${originalMessage.length}`);

    if (!originalMessage) {
      return res.status(400).json({ error: "Message is required." });
    }

    let enrichedMessage = originalMessage;
    console.log(`[Chat] Original message: ${originalMessage}`);
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
        });

        if (memoryResult.context) {
          // Prepend memory context with explicit relevance guidance + no hallucination
          enrichedMessage = `[About this person — use ONLY if directly relevant to the user's request. Ignore if not relevant. Do not quote verbatim. Do not hallucinate or invent details beyond this memory.]\n${memoryResult.context}\n\n---\n\n${originalMessage}`;
          memoryInjected = true;
          memorySources = (memoryResult.sources || []).map((source) => ({
            id: source.id,
            content: source.content,
            type: source.type,
          }));
          console.log(`[Memory] Injected ${memoryResult.sources.length} memories for ${userEmail}`);
          const preview = memoryResult.context.slice(0, 220).replace(/\s+/g, " ");
          console.log(`[Memory] Context preview: ${preview}`);
        } else {
          console.log(`[Memory] No context injected for ${userEmail}`);
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
        console.warn("[Memory] Context injection failed:", err.message);
        // Continue without memory
      }
    }

    // Forward to NOVA.TYP with enriched message
    const { slug, threadSlug } = req.params;
    const targetUrl = `${apiBase}/workspace/${slug}/thread/${threadSlug}/stream-chat`;
    
    console.log(`[Chat] Forwarding to NOVA: ${targetUrl}`);
    console.log(`[Chat] Memory injected: ${memoryInjected}`);

    const upstreamResponse = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({ message: enrichedMessage }),
    });

    console.log(`[Chat] NOVA response status: ${upstreamResponse.status}`);

    // Stream the response back
    res.status(upstreamResponse.status);
    copyResponseHeaders(upstreamResponse, res);

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
  express.json({ limit: "10mb" }),
  streamChatHandler
);
app.post(
  "/api/workspace/:slug/thread/:threadSlug/stream-chat",
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
app.post("/api/memory/end-session", express.json({ limit: "5mb" }), async (req, res) => {
  try {
    const authResult = await requireAuthUser(req, res);
    if (!authResult) return;
    const userEmail = authResult.email;

    const { messages, threadId, threadTitle } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length < 3) {
      // Skip summarization for very short conversations
      return res.json({ skipped: true, reason: "conversation_too_short" });
    }

    // Run summarization in background (don't block the response)
    summarizeConversation({
      userId: userEmail,
      messages,
      threadId,
      threadTitle,
    }).then((result) => {
      console.log(`[Memory] Session ended for ${userEmail}: ${result.memories?.length || 0} memories extracted`);
    }).catch((err) => {
      console.warn("[Memory] Summarization failed:", err.message);
    });

    res.json({ ok: true, queued: true });
  } catch (error) {
    console.error("[Memory] End session error:", error);
    res.status(500).json({ error: "Failed to process session end" });
  }
});

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
