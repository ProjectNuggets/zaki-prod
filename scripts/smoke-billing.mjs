#!/usr/bin/env node

/**
 * Billing API smoke (Stripe-focused).
 *
 * Validates:
 * 1) billing config endpoint responds
 * 2) checkout session can be created
 * 3) billing sync endpoint works
 * 4) entitlements endpoint reflects current billing state
 * 5) optional admin reconcile + billing telemetry endpoints work
 *
 * Usage:
 *   SMOKE_BASE_URL=http://localhost:8787 \
 *   SMOKE_USER_EMAIL=verified@example.com \
 *   SMOKE_USER_PASSWORD='...' \
 *   node scripts/smoke-billing.mjs
 */

const baseUrl = String(process.env.SMOKE_BASE_URL || "http://127.0.0.1:8787").replace(/\/+$/, "");
const userEmail = String(process.env.SMOKE_USER_EMAIL || "").trim();
const userPassword = String(process.env.SMOKE_USER_PASSWORD || "").trim();
const adminEmail = String(process.env.SMOKE_ADMIN_EMAIL || "").trim();
const adminPassword = String(process.env.SMOKE_ADMIN_PASSWORD || "").trim();
const plan = String(process.env.SMOKE_BILLING_PLAN || "student").trim().toLowerCase();
const timeoutMs = Number.parseInt(process.env.SMOKE_TIMEOUT_MS || "15000", 10);
const policyVersion = String(
  process.env.SMOKE_LEGAL_POLICY_VERSION ||
    process.env.ZAKI_LEGAL_POLICY_VERSION ||
    "2026-02-17.v2"
).trim();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function logStep(message) {
  process.stdout.write(`\n[SMOKE-BILLING] ${message}\n`);
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
  assert(email && password, "SMOKE_USER_EMAIL and SMOKE_USER_PASSWORD are required.");
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

async function main() {
  logStep(`Target base URL: ${baseUrl}`);

  assert(["student", "personal"].includes(plan), "SMOKE_BILLING_PLAN must be student or personal.");
  assert(userEmail && userPassword, "SMOKE_USER_EMAIL and SMOKE_USER_PASSWORD are required.");

  const health = await request("/health");
  assert(health.status === 200, `Health failed: ${health.status} ${health.raw}`);

  logStep("Logging in billing smoke user");
  const userToken = await login(userEmail, userPassword);

  logStep("Checking billing config");
  const billingConfig = await request("/api/billing/config", { token: userToken });
  assert(
    billingConfig.status === 200,
    `Billing config failed: ${billingConfig.status} ${billingConfig.raw}`
  );

  const configured = billingConfig.data?.configured || {};
  assert(
    configured.provider === "stripe",
    `Expected stripe provider for this smoke, got: ${configured.provider || "unknown"}`
  );
  assert(
    configured.checkoutEnabled === true,
    "Checkout is not enabled. Verify Stripe keys and price ids."
  );

  logStep(`Creating checkout session for plan=${plan}`);
  const checkout = await request("/api/billing/checkout", {
    method: "POST",
    token: userToken,
    json: { plan },
  });
  assert(checkout.status === 200, `Checkout failed: ${checkout.status} ${checkout.raw}`);
  assert(
    checkout.data?.success === true && String(checkout.data?.url || "").startsWith("http"),
    `Checkout response missing URL: ${checkout.raw}`
  );

  logStep("Triggering billing sync");
  const sync = await request("/api/billing/sync", {
    method: "POST",
    token: userToken,
    json: {},
  });
  assert(sync.status === 200, `Billing sync failed: ${sync.status} ${sync.raw}`);
  assert(sync.data?.success === true, "Billing sync did not return success=true");

  logStep("Checking entitlements");
  const entitlements = await request("/api/entitlements", { token: userToken });
  assert(
    entitlements.status === 200,
    `Entitlements failed: ${entitlements.status} ${entitlements.raw}`
  );

  let adminChecksRan = false;
  if (adminEmail && adminPassword) {
    logStep("Running admin billing telemetry/reconcile checks");
    const adminToken = await login(adminEmail, adminPassword);

    const telemetry = await request("/api/admin/telemetry/billing", { token: adminToken });
    assert(
      telemetry.status === 200,
      `Billing telemetry failed: ${telemetry.status} ${telemetry.raw}`
    );
    assert(telemetry.data?.success === true, "Billing telemetry did not return success=true");

    const reconcile = await request("/api/admin/billing/reconcile", {
      method: "POST",
      token: adminToken,
      json: { email: userEmail, retryCount: 1 },
    });
    assert(
      reconcile.status === 200,
      `Billing reconcile failed: ${reconcile.status} ${reconcile.raw}`
    );
    assert(reconcile.data?.success === true, "Billing reconcile did not return success=true");
    adminChecksRan = true;
  }

  logStep("Billing smoke completed successfully.");
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        baseUrl,
        plan,
        provider: configured.provider,
        checkoutEnabled: configured.checkoutEnabled,
        webhookEnabled: configured.webhookEnabled,
        adminChecksRan,
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
