#!/usr/bin/env node

/**
 * Browser-level smoke for the ZAKI Hire local/staging UI.
 *
 * It signs in, uses the visible Add lead form, verifies the lead renders in the
 * Today command center/dossier view, captures a screenshot, then deletes the
 * temporary lead.
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const frontendUrl = String(process.env.ZAKI_FRONTEND_URL || "http://127.0.0.1:5174").replace(/\/+$/, "");
const backendUrl = String(process.env.ZAKI_BASE_URL || process.env.SMOKE_BASE_URL || "http://127.0.0.1:8787").replace(/\/+$/, "");
const email = String(process.env.HIRE_BROWSER_EMAIL || process.env.SMOKE_USER_EMAIL || "zaki-e2e-user-a@example.com").trim();
const password = String(process.env.HIRE_BROWSER_PASSWORD || process.env.SMOKE_USER_PASSWORD || process.env.SMOKE_PASSWORD || "ZakiE2E!2026").trim();
const legalPolicyVersion = String(process.env.ZAKI_LEGAL_POLICY_VERSION || "2026-02-17.v2").trim();
const screenshotPath = String(process.env.HIRE_BROWSER_SCREENSHOT || "/tmp/zaki-hire-browser-smoke.png").trim();
const cleanup = String(process.env.HIRE_BROWSER_CLEANUP || "true").toLowerCase() !== "false";
const runId = Date.now().toString(36);
const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const backendEnvPath = path.join(repoRoot, "backend", ".env");
const requireFromBackend = createRequire(new URL("../backend/package.json", import.meta.url));

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

loadEnvFile(backendEnvPath);

let createdLeadId = "";

function logStep(message) {
  process.stdout.write(`\n[HIRE-BROWSER] ${message}\n`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, { method = "GET", token, json } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${backendUrl}${path}`, {
    method,
    headers,
    body: json === undefined ? undefined : JSON.stringify(json),
  });
  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  return { response, status: response.status, data, raw };
}

async function loginViaApi() {
  const result = await request("/login", {
    method: "POST",
    json: { username: email, password },
  });
  if (result.status === 200 && typeof result.data?.token === "string") {
    return result.data.token;
  }
  return null;
}

function canDirectSeedLocalAccount() {
  const directSeedEnabled = String(process.env.HIRE_BROWSER_DIRECT_DB_SEED || "true").toLowerCase() !== "false";
  if (!directSeedEnabled || !process.env.DATABASE_URL) return false;
  try {
    const url = new URL(backendUrl);
    return ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

async function seedVerifiedLocalAccount() {
  const pg = requireFromBackend("pg");
  const bcrypt = requireFromBackend("bcryptjs");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO zaki_users
        (email, password_hash, full_name, date_of_birth, verified, plan_tier, plan_status,
         current_period_end, created_at, updated_at, legal_consent_at, legal_consent_version)
       VALUES ($1, $2, $3, '1990-01-01', true, 'personal', 'active',
         NOW() + INTERVAL '30 days', NOW(), NOW(), NOW(), $4)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         full_name = EXCLUDED.full_name,
         verified = true,
         plan_tier = 'personal',
         plan_status = 'active',
         current_period_end = NOW() + INTERVAL '30 days',
         updated_at = NOW(),
         legal_consent_at = NOW(),
         legal_consent_version = $4`,
      [email, passwordHash, "ZAKI Hire Browser Smoke", legalPolicyVersion],
    );
  } finally {
    await pool.end();
  }
}

async function ensureAccount() {
  if (await loginViaApi()) return;
  if (canDirectSeedLocalAccount()) {
    await seedVerifiedLocalAccount();
    const token = await loginViaApi();
    if (token) return;
  }
  const signup = await request("/signup", {
    method: "POST",
    json: {
      email,
      password,
      name: "ZAKI Hire Browser Smoke",
      dateOfBirth: "1990-01-01",
      legalConsentAccepted: true,
      legalPolicyVersion,
    },
  });
  if (![200, 400].includes(signup.status)) {
    throw new Error(`signup failed: ${signup.status} ${signup.raw}`);
  }
  const token = await loginViaApi();
  assert(token, `login failed after account seed: ${signup.raw}`);
}

function isExpectedFailedResponse(response) {
  const url = response.url();
  return url.includes("/api/auth/refresh") && response.status() === 401;
}

async function cleanupLead() {
  if (!createdLeadId || !cleanup) return;
  const token = await loginViaApi();
  if (!token) return;
  const result = await request(`/api/hire/leads/${encodeURIComponent(createdLeadId)}`, {
    method: "DELETE",
    token,
  });
  if (![200, 202, 204, 404].includes(result.status)) {
    throw new Error(`cleanup failed: ${result.status} ${result.raw}`);
  }
}

async function main() {
  logStep(`Frontend: ${frontendUrl}`);
  logStep(`Backend: ${backendUrl}`);
  await ensureAccount();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    baseURL: frontendUrl,
  });
  const page = await context.newPage();
  const failedResponses = [];
  const consoleErrors = [];
  const uniqueTitle = `ZAKI Hire Browser Smoke ${runId}`;

  page.on("response", (response) => {
    const url = response.url();
    if (isExpectedFailedResponse(response)) return;
    if (response.status() >= 500 || (url.includes("/api/hire") && response.status() >= 400)) {
      failedResponses.push(`${response.status()} ${url}`);
    }
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (text.includes("/api/auth/refresh") && text.includes("401")) return;
    if (text.includes("Failed to load resource") && text.includes("401")) return;
    consoleErrors.push(text);
  });

  try {
    logStep("Signing in through the UI");
    await page.goto("/hire", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Email").fill(email);
    await page.locator('input[type="password"][autocomplete="current-password"]').fill(password);
    const loginResponsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/login") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Sign in" }).click();
    const loginResponse = await loginResponsePromise;
    assert(loginResponse.ok(), `UI login failed: ${loginResponse.status()}`);

    logStep("Checking Hire shell and engine status");
    await page.getByRole("heading", { name: "Today command center" }).waitFor({ state: "visible", timeout: 20_000 });
    await page.getByText("ZAKI Hire").waitFor({ state: "visible", timeout: 10_000 });
    await page.getByText("operational").waitFor({ state: "visible", timeout: 15_000 });
    await page.getByText("Engine online").waitFor({ state: "visible", timeout: 15_000 });
    await page.getByText("central").waitFor({ state: "visible", timeout: 15_000 });
    assert(await page.getByText("JustHireMe").count() === 0, "legacy JustHireMe branding is visible");

    logStep("Creating a lead through the visible Add lead form");
    await page.getByPlaceholder("Job URL").fill("https://example.com/zaki-hire-browser-smoke");
    await page.getByPlaceholder("Paste job text").fill([
      uniqueTitle,
      "Company: ZAKI Browser Smoke Labs",
      "Location: Remote",
      "Description: Validate the ZAKI Hire browser form path.",
      "Apply: https://example.com/zaki-hire-browser-smoke",
    ].join("\n"));
    const addResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/hire/leads/manual") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Add to pipeline" }).click();
    const addResponse = await addResponsePromise;
    const addPayload = await addResponse.json().catch(() => ({}));
    assert(addResponse.ok(), `UI add failed: ${addResponse.status()} ${JSON.stringify(addPayload)}`);
    createdLeadId = String(addPayload.job_id || addPayload.id || "").trim();
    assert(createdLeadId, `lead response did not include an id: ${JSON.stringify(addPayload)}`);

    logStep("Checking pipeline/detail render and automation consent gate");
    await page.getByText(uniqueTitle).first().waitFor({ state: "visible", timeout: 20_000 });
    await page.getByText(uniqueTitle).first().click();
    await page.getByRole("heading", { name: uniqueTitle }).waitFor({ state: "visible", timeout: 10_000 });
    await page.getByText("ZAKI Browser Smoke Labs · Remote").first().waitFor({ state: "visible", timeout: 10_000 });
    const previewButton = page.getByRole("button", { name: "Preview apply" });
    assert(await previewButton.isDisabled(), "Preview apply should be disabled before lead-specific consent");
    await page.getByLabel(/I approve this lead-specific automation action/).check();
    await page.waitForTimeout(250);
    assert(!(await previewButton.isDisabled()), "Preview apply did not enable after consent");

    await page.screenshot({ path: screenshotPath, fullPage: true });
    assert(failedResponses.length === 0, `unexpected failed responses: ${failedResponses.join("; ")}`);
    assert(consoleErrors.length === 0, `unexpected console errors: ${consoleErrors.join("; ")}`);

    logStep("Browser smoke completed successfully.");
    process.stdout.write(JSON.stringify({
      ok: true,
      frontendUrl,
      backendUrl,
      createdLeadId,
      screenshot: screenshotPath,
      cleanedUp: cleanup,
    }, null, 2) + "\n");
  } finally {
    await cleanupLead();
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`\n[HIRE-BROWSER] FAILED: ${error?.message || error}`);
  process.exitCode = 1;
});
