#!/usr/bin/env node

/**
 * V0.1 smoke test for ZAKI backend flows.
 *
 * Usage:
 *   SMOKE_BASE_URL=http://localhost:8792 node scripts/smoke-v01.mjs
 */

const baseUrl = (process.env.SMOKE_BASE_URL || "http://localhost:8792").replace(/\/+$/, "");
const runId = Date.now().toString(36);
const skipSignup = String(process.env.SMOKE_SKIP_SIGNUP || "").toLowerCase() === "true";
const adminEmail = process.env.SMOKE_ADMIN_EMAIL || `smoke-admin-${runId}@zaki.local`;
const userEmail = process.env.SMOKE_USER_EMAIL || `smoke-user-${runId}@zaki.local`;
const defaultPassword = process.env.SMOKE_PASSWORD || "SmokePass!123";
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD || defaultPassword;
const userPassword = process.env.SMOKE_USER_PASSWORD || defaultPassword;
const name = "Smoke User";
const dateOfBirth = "1995-01-15";
const legalPolicyVersion =
  (
    process.env.SMOKE_LEGAL_POLICY_VERSION ||
    process.env.ZAKI_LEGAL_POLICY_VERSION ||
    "2026-02-17.v1"
  ).trim();

function logStep(message) {
  process.stdout.write(`\n[SMOKE] ${message}\n`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, { method = "GET", token, json } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  return { status: response.status, data, raw, headers: response.headers };
}

async function signup(email, password) {
  const result = await request("/signup", {
    method: "POST",
    json: {
      email,
      password,
      name,
      dateOfBirth,
      legalConsentAccepted: true,
      legalPolicyVersion,
    },
  });
  assert(result.status === 200, `Signup failed for ${email}: ${result.status} ${result.raw}`);
  assert(result.data?.success === true, `Signup did not return success=true for ${email}`);
}

async function login(email, password) {
  const result = await request("/login", {
    method: "POST",
    json: {
      username: email,
      password,
      legalConsentAccepted: true,
      legalPolicyVersion,
    },
  });
  assert(result.status === 200, `Login failed for ${email}: ${result.status} ${result.raw}`);
  assert(typeof result.data?.token === "string" && result.data.token.length > 10, `Missing token for ${email}`);
  return result.data.token;
}

async function deleteAccount(token, email) {
  const result = await request("/api/account/delete", {
    method: "POST",
    token,
    json: { confirmEmail: email },
  });
  assert(result.status === 200, `Delete account failed for ${email}: ${result.status} ${result.raw}`);
  assert(result.data?.success === true, `Delete account did not return success=true for ${email}`);
}

async function main() {
  logStep(`Target base URL: ${baseUrl}`);

  logStep("Checking health");
  const health = await request("/health");
  assert(health.status === 200, `Health failed: ${health.status} ${health.raw}`);

  if (!skipSignup) {
    logStep("Creating smoke users");
    await signup(adminEmail, adminPassword);
    await signup(userEmail, userPassword);
  } else {
    logStep("Skipping signup (SMOKE_SKIP_SIGNUP=true)");
  }

  logStep("Logging in smoke users");
  const adminToken = await login(adminEmail, adminPassword);
  const userToken = await login(userEmail, userPassword);

  logStep("Checking authenticated profile and entitlements");
  const profile = await request("/api/profile", { token: userToken });
  assert(profile.status === 200, `Profile failed: ${profile.status} ${profile.raw}`);
  const entitlements = await request("/api/entitlements", { token: userToken });
  assert(entitlements.status === 200, `Entitlements failed: ${entitlements.status} ${entitlements.raw}`);
  const billingConfig = await request("/api/billing/config", { token: userToken });
  assert(
    billingConfig.status === 200,
    `Billing config failed: ${billingConfig.status} ${billingConfig.raw}`
  );

  logStep("Checking account export");
  const exportRes = await request("/api/account/export", { token: userToken });
  assert(exportRes.status === 200, `Export failed: ${exportRes.status} ${exportRes.raw}`);
  assert(exportRes.data?.success === true, "Export did not return success=true");
  assert(exportRes.data?.export?.account?.email === userEmail, "Export payload account email mismatch");

  logStep("Checking access-expired behavior before code redemption");
  const preAccess = await request("/workspace/smoke/thread/smoke/stream-chat", {
    method: "POST",
    token: userToken,
    json: { message: "hello smoke" },
  });
  assert(preAccess.status === 403, `Expected 403 before access code, got ${preAccess.status}`);
  assert(preAccess.data?.code === "access_expired", "Expected access_expired code before redemption");

  logStep("Checking admin list endpoint");
  const adminList = await request("/api/admin/access-codes?limit=5&offset=0", {
    token: adminToken,
  });
  assert(adminList.status === 200, `Admin list failed: ${adminList.status} ${adminList.raw}`);

  logStep("Creating access code via admin endpoint");
  const createCode = await request("/api/admin/access-codes", {
    method: "POST",
    token: adminToken,
    json: {
      campaign: "smoke",
      count: 1,
      durationDays: 30,
      maxRedemptions: 1,
      active: true,
    },
  });
  assert(createCode.status === 201, `Create code failed: ${createCode.status} ${createCode.raw}`);
  const createdCode = createCode.data?.codes?.[0]?.code;
  const createdCodeId = createCode.data?.codes?.[0]?.id;
  assert(typeof createdCode === "string" && createdCode.length > 6, "Created code missing");
  assert(typeof createdCodeId === "string" && createdCodeId.length > 10, "Created code id missing");

  logStep("Redeeming access code as regular user");
  const redeem = await request("/api/access-code/redeem", {
    method: "POST",
    token: userToken,
    json: { code: createdCode },
  });
  assert(redeem.status === 200, `Redeem failed: ${redeem.status} ${redeem.raw}`);
  assert(redeem.data?.success === true, "Redeem did not return success=true");

  logStep("Checking stream endpoint after redemption (must not be access_expired)");
  const postAccess = await request("/workspace/smoke/thread/smoke/stream-chat", {
    method: "POST",
    token: userToken,
    json: { message: "hello after redemption" },
  });
  assert(
    !(postAccess.status === 403 && postAccess.data?.code === "access_expired"),
    "Still getting access_expired after successful redemption"
  );

  logStep("Disabling created access code");
  const disableCode = await request(`/api/admin/access-codes/${encodeURIComponent(createdCodeId)}`, {
    method: "PATCH",
    token: adminToken,
    json: { active: false },
  });
  assert(disableCode.status === 200, `Disable code failed: ${disableCode.status} ${disableCode.raw}`);
  assert(disableCode.data?.code?.active === false, "Code was not disabled");

  logStep("Checking cancel subscription endpoint behavior");
  const cancel = await request("/api/billing/cancel", {
    method: "POST",
    token: userToken,
  });
  assert(
    cancel.status === 200 || cancel.status === 400 || cancel.status === 500 || cancel.status === 503,
    `Unexpected cancel status: ${cancel.status} ${cancel.raw}`
  );

  if (!skipSignup) {
    logStep("Deleting smoke users");
    await deleteAccount(userToken, userEmail);
    await deleteAccount(adminToken, adminEmail);
  } else {
    logStep("Skipping account deletion (SMOKE_SKIP_SIGNUP=true)");
  }

  logStep("Smoke run completed successfully.");
  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        skipSignup,
        adminEmail,
        userEmail,
        cancelStatus: cancel.status,
      },
      null,
      2
    ) + "\n"
  );
}

main().catch((error) => {
  console.error("\n[SMOKE] FAILED");
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
