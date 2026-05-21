#!/usr/bin/env node

/**
 * ZAKI Hire operator readiness smoke.
 *
 * Usage:
 *   SMOKE_BASE_URL=https://api.chatzaki.com \
 *   SMOKE_ADMIN_EMAIL=admin@example.com \
 *   SMOKE_ADMIN_PASSWORD=... \
 *   node scripts/smoke-hire-readiness.mjs
 */

const baseUrl = String(process.env.SMOKE_BASE_URL || process.env.ZAKI_BASE_URL || "http://127.0.0.1:8787")
  .replace(/\/+$/, "");
const adminEmail = String(process.env.SMOKE_ADMIN_EMAIL || "").trim();
const adminPassword = String(process.env.SMOKE_ADMIN_PASSWORD || process.env.SMOKE_PASSWORD || "").trim();
const userEmail = String(process.env.SMOKE_USER_EMAIL || adminEmail).trim();
const userPassword = String(process.env.SMOKE_USER_PASSWORD || process.env.SMOKE_PASSWORD || adminPassword).trim();

function logStep(message) {
  process.stdout.write(`\n[HIRE-SMOKE] ${message}\n`);
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
  return { status: response.status, data, raw };
}

async function login(email, password, label) {
  assert(email, `${label} email is required`);
  assert(password, `${label} password is required`);
  const result = await request("/login", {
    method: "POST",
    json: { username: email, password },
  });
  assert(result.status === 200, `${label} login failed: ${result.status} ${result.raw}`);
  assert(typeof result.data?.token === "string" && result.data.token.length > 16, `${label} login did not return a token`);
  return result.data.token;
}

function assertNoInternalHealthDetails(payload) {
  const raw = JSON.stringify(payload || {});
  for (const marker of ["components", "checks", "services", "log_level"]) {
    assert(!Object.prototype.hasOwnProperty.call(payload || {}, marker), `Hire health leaked ${marker}`);
    assert(!raw.includes(`"${marker}"`), `Hire health payload included ${marker}`);
  }
  assert(payload?.details_available === false, "Hire health details should be hidden from user-facing smoke calls");
}

async function main() {
  logStep(`Target base URL: ${baseUrl}`);
  const adminToken = await login(adminEmail, adminPassword, "admin");
  const userToken = await login(userEmail, userPassword, "user");

  logStep("Checking internal Hire BFF status");
  const internalStatus = await request("/api/internal/hire/status", { token: adminToken });
  assert(internalStatus.status === 200, `Internal status failed: ${internalStatus.status} ${internalStatus.raw}`);
  assert(internalStatus.data?.hire?.enabled === true, "ZAKI_HIRE_ENABLED is not true");
  assert(internalStatus.data?.hire?.configured === true, "Hire BFF is not fully configured");
  assert(internalStatus.data?.hire?.baseUrlConfigured === true, "Hire base URL is not configured");
  assert(internalStatus.data?.hire?.internalTokenConfigured === true, "Hire internal token is not configured");

  logStep("Checking internal Hire deployment readiness");
  const readiness = await request("/api/internal/hire/deployment-readiness", { token: adminToken });
  assert(readiness.status === 200, `Deployment readiness failed: ${readiness.status} ${readiness.raw}`);
  assert(readiness.data?.ok === true, `Hire deployment readiness not ok: ${readiness.raw}`);
  assert(readiness.data?.deploymentReadiness?.ready === true, `Hire engine is not ready: ${readiness.raw}`);

  logStep("Checking user-facing Hire health sanitization");
  const health = await request("/api/hire/health", { token: userToken });
  assert(health.status === 200, `Hire health failed: ${health.status} ${health.raw}`);
  assertNoInternalHealthDetails(health.data);

  logStep("Checking user-facing Hire status and lead list");
  const userReadiness = await request("/api/hire/readiness", { token: userToken });
  assert(userReadiness.status === 200, `Hire readiness failed: ${userReadiness.status} ${userReadiness.raw}`);
  assert(userReadiness.data?.available === true, `Hire user readiness is not available: ${userReadiness.raw}`);
  assert(userReadiness.data?.operations?.userProviderSettingsExposed === false, "Hire readiness exposed user provider settings");
  const status = await request("/api/hire/status", { token: userToken });
  assert(status.status === 200, `Hire status failed: ${status.status} ${status.raw}`);
  const leads = await request("/api/hire/leads", { token: userToken });
  assert(leads.status === 200, `Hire leads list failed: ${leads.status} ${leads.raw}`);

  logStep("Hire readiness smoke completed successfully.");
  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        readinessStatus: readiness.data?.deploymentReadiness?.status,
      },
      null,
      2
    ) + "\n"
  );
}

main().catch((error) => {
  console.error(`\n[HIRE-SMOKE] FAILED: ${error?.message || error}`);
  process.exitCode = 1;
});
