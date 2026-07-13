#!/usr/bin/env node

/**
 * Billing webhook E2E smoke (Stripe-focused).
 *
 * Proves:
 * 1) checkout session can be created
 * 2) Stripe webhook is processed by backend
 * 3) user entitlements become premium without calling /api/billing/sync
 *
 * Usage:
 *   SMOKE_BASE_URL=http://localhost:8787 \
 *   SMOKE_USER_EMAIL=verified@example.com \
 *   SMOKE_USER_PASSWORD='...' \
 *   SMOKE_ADMIN_EMAIL=admin@example.com \
 *   SMOKE_ADMIN_PASSWORD='...' \
 *   npm run smoke:billing
 */

const baseUrl = String(process.env.SMOKE_BASE_URL || "http://127.0.0.1:8787").replace(/\/+$/, "");
const userEmail = String(process.env.SMOKE_USER_EMAIL || "").trim();
const userPassword = String(process.env.SMOKE_USER_PASSWORD || "").trim();
const adminEmail = String(process.env.SMOKE_ADMIN_EMAIL || "").trim();
const adminPassword = String(process.env.SMOKE_ADMIN_PASSWORD || "").trim();
const plan = String(process.env.SMOKE_BILLING_PLAN || "student").trim().toLowerCase();
const timeoutMs = Number.parseInt(process.env.SMOKE_TIMEOUT_MS || "15000", 10);
const pollTimeoutMs = Number.parseInt(process.env.SMOKE_BILLING_WEBHOOK_TIMEOUT_MS || "600000", 10);
const pollIntervalMs = Number.parseInt(process.env.SMOKE_BILLING_POLL_INTERVAL_MS || "5000", 10);
const shouldOpenCheckout =
  String(process.env.SMOKE_BILLING_OPEN_CHECKOUT || "").trim().toLowerCase() === "true";
const requireFreshUpgrade =
  String(process.env.SMOKE_BILLING_REQUIRE_FRESH_UPGRADE || "true").trim().toLowerCase() !== "false";
const requireSecrets =
  String(process.env.SMOKE_REQUIRE_SECRETS || "").trim().toLowerCase() === "true";
const policyVersion = String(
  process.env.SMOKE_LEGAL_POLICY_VERSION ||
    process.env.ZAKI_LEGAL_POLICY_VERSION ||
    "2026-07-12.v4"
).trim();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function logStep(message) {
  process.stdout.write(`\n[SMOKE-BILLING] ${message}\n`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path, { method = "GET", token, json } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json !== undefined) headers["Content-Type"] = "application/json";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: json !== undefined ? JSON.stringify(json) : undefined,
      signal: controller.signal,
    });
    const raw = await response.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }
    return { status: response.status, data, raw };
  } finally {
    clearTimeout(timer);
  }
}

async function login(email, password) {
  const result = await request("/login", {
    method: "POST",
    json: {
      username: email,
      password,
      legalConsentAccepted: true,
      legalPolicyVersion: policyVersion,
    },
  });
  assert(result.status === 200, `Login failed for ${email}: ${result.status} ${result.raw}`);
  const token = String(result.data?.token || "");
  assert(token.length > 16, `Missing token for ${email}`);
  return token;
}

async function getEntitlements(token) {
  const result = await request("/api/entitlements", { token });
  assert(result.status === 200, `Entitlements failed: ${result.status} ${result.raw}`);
  return result.data || {};
}

async function getBillingTelemetry(token) {
  const result = await request("/api/admin/telemetry/billing", { token });
  assert(result.status === 200, `Billing telemetry failed: ${result.status} ${result.raw}`);
  return result.data?.telemetry || {};
}

function getStripeProcessedCount(telemetry) {
  const providers = telemetry?.providers || {};
  return Number(providers?.stripe?.processed || 0);
}

function isPremiumEntitlement(data) {
  return Boolean(data?.features?.premium);
}

async function maybeOpenCheckout(url) {
  if (!shouldOpenCheckout) return;
  if (!url) return;
  try {
    if (process.platform === "darwin") {
      const { execSync } = await import("node:child_process");
      execSync(`open "${url.replace(/"/g, '\\"')}"`, { stdio: "ignore" });
      logStep("Opened checkout URL in browser.");
    }
  } catch {
    logStep("Could not auto-open checkout URL. Open it manually.");
  }
}

async function pollForWebhookAndEntitlement({
  userToken,
  adminToken,
  baselineProcessed,
  baselinePremium,
}) {
  const start = Date.now();
  let lastProcessed = baselineProcessed;
  let lastPremium = baselinePremium;

  while (Date.now() - start < pollTimeoutMs) {
    // eslint-disable-next-line no-await-in-loop
    const [entitlements, telemetry] = await Promise.all([
      getEntitlements(userToken),
      getBillingTelemetry(adminToken),
    ]);
    lastProcessed = getStripeProcessedCount(telemetry);
    lastPremium = isPremiumEntitlement(entitlements);
    const processedDelta = lastProcessed - baselineProcessed;
    const upgraded = lastPremium && (!baselinePremium || !requireFreshUpgrade);

    if (processedDelta > 0 && upgraded) {
      return {
        ok: true,
        processedDelta,
        premium: lastPremium,
        entitlements,
      };
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(pollIntervalMs);
  }

  return {
    ok: false,
    processedDelta: lastProcessed - baselineProcessed,
    premium: lastPremium,
  };
}

async function main() {
  logStep(`Target base URL: ${baseUrl}`);
  assert(["student", "personal"].includes(plan), "SMOKE_BILLING_PLAN must be student or personal.");
  const missingSecrets = [];
  if (!userEmail) missingSecrets.push("SMOKE_USER_EMAIL");
  if (!userPassword) missingSecrets.push("SMOKE_USER_PASSWORD");
  if (!adminEmail) missingSecrets.push("SMOKE_ADMIN_EMAIL");
  if (!adminPassword) missingSecrets.push("SMOKE_ADMIN_PASSWORD");
  if (missingSecrets.length > 0) {
    const msg = `Missing required billing smoke secrets: ${missingSecrets.join(", ")}`;
    if (requireSecrets) {
      logStep(`REQUIRED-MODE FAILURE: ${msg}. Refusing to skip. Provision secrets in the release environment.`);
    }
    throw new Error(msg);
  }

  const health = await request("/health");
  assert(health.status === 200, `Health failed: ${health.status} ${health.raw}`);

  logStep("Logging in user/admin");
  const [userToken, adminToken] = await Promise.all([
    login(userEmail, userPassword),
    login(adminEmail, adminPassword),
  ]);

  logStep("Checking billing config");
  const billingConfig = await request("/api/billing/config", { token: userToken });
  assert(
    billingConfig.status === 200,
    `Billing config failed: ${billingConfig.status} ${billingConfig.raw}`
  );
  const configured = billingConfig.data?.configured || {};
  assert(configured.provider === "stripe", `Expected stripe provider, got: ${configured.provider || "unknown"}`);
  assert(configured.checkoutEnabled === true, "Checkout is not enabled.");
  assert(configured.webhookEnabled === true, "Webhook is not enabled.");

  const baselineEntitlements = await getEntitlements(userToken);
  const baselinePremium = isPremiumEntitlement(baselineEntitlements);
  if (requireFreshUpgrade) {
    assert(
      baselinePremium === false,
      "User is already premium. Use a free test user or set SMOKE_BILLING_REQUIRE_FRESH_UPGRADE=false."
    );
  }

  const baselineTelemetry = await getBillingTelemetry(adminToken);
  const baselineProcessed = getStripeProcessedCount(baselineTelemetry);

  logStep(`Creating checkout session for plan=${plan}`);
  const checkout = await request("/api/billing/checkout", {
    method: "POST",
    token: userToken,
    json: { plan },
  });
  assert(checkout.status === 200, `Checkout failed: ${checkout.status} ${checkout.raw}`);
  const checkoutUrl = String(checkout.data?.url || "");
  assert(checkout.data?.success === true && checkoutUrl.startsWith("http"), "Checkout URL missing.");
  process.stdout.write(`[SMOKE-BILLING] Checkout URL: ${checkoutUrl}\n`);
  await maybeOpenCheckout(checkoutUrl);

  logStep(
    "Complete the checkout in Stripe, then wait for webhook processing. " +
      "This script will poll telemetry + entitlements."
  );

  const pollResult = await pollForWebhookAndEntitlement({
    userToken,
    adminToken,
    baselineProcessed,
    baselinePremium,
  });

  assert(
    pollResult.ok,
    `Timed out waiting for webhook-driven entitlement update. ` +
      `processedDelta=${pollResult.processedDelta} premium=${pollResult.premium}`
  );

  logStep("Billing webhook E2E smoke completed successfully.");
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        baseUrl,
        plan,
        checkoutUrl,
        provider: configured.provider,
        checkoutEnabled: configured.checkoutEnabled,
        webhookEnabled: configured.webhookEnabled,
        processedDelta: pollResult.processedDelta,
        premium: pollResult.premium,
      },
      null,
      2
    )}\n`
  );
}

main().catch((error) => {
  console.error("\n[SMOKE-BILLING] FAILED");
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
