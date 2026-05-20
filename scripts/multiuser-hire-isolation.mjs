#!/usr/bin/env node

/**
 * ZAKI Hire two-user isolation smoke.
 *
 * Requires two existing ZAKI users that can access /hire.
 *
 * Usage:
 *   ZAKI_BASE_URL=https://api.chatzaki.com \
 *   HIRE_USER_A_EMAIL=a@example.com HIRE_USER_A_PASSWORD=... \
 *   HIRE_USER_B_EMAIL=b@example.com HIRE_USER_B_PASSWORD=... \
 *   node scripts/multiuser-hire-isolation.mjs
 */

const baseUrl = String(process.env.ZAKI_BASE_URL || process.env.SMOKE_BASE_URL || "http://127.0.0.1:8787")
  .replace(/\/+$/, "");
const cleanup = String(process.env.HIRE_ISOLATION_CLEANUP || "true").toLowerCase() !== "false";
const runId = `hire-isolation-${Date.now().toString(36)}`;

const users = [
  {
    label: "user-a",
    email: String(process.env.HIRE_USER_A_EMAIL || process.env.SMOKE_USER_A_EMAIL || "").trim(),
    password: String(process.env.HIRE_USER_A_PASSWORD || process.env.SMOKE_USER_A_PASSWORD || "").trim(),
    uniqueTitle: `ZAKI Hire Isolation A ${runId}`,
  },
  {
    label: "user-b",
    email: String(process.env.HIRE_USER_B_EMAIL || process.env.SMOKE_USER_B_EMAIL || "").trim(),
    password: String(process.env.HIRE_USER_B_PASSWORD || process.env.SMOKE_USER_B_PASSWORD || "").trim(),
    uniqueTitle: `ZAKI Hire Isolation B ${runId}`,
  },
];

function logStep(message) {
  process.stdout.write(`\n[HIRE-ISOLATION] ${message}\n`);
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

function leadId(lead) {
  return String(lead?.job_id || lead?.id || "").trim();
}

function leadTitle(lead) {
  return String(lead?.title || lead?.text || lead?.description || "").trim();
}

function normalizeLeads(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.leads)) return payload.leads;
  return [];
}

async function login(user) {
  assert(user.email, `${user.label} email is required`);
  assert(user.password, `${user.label} password is required`);
  const result = await request("/login", {
    method: "POST",
    json: { username: user.email, password: user.password },
  });
  assert(result.status === 200, `${user.label} login failed: ${result.status} ${result.raw}`);
  assert(typeof result.data?.token === "string" && result.data.token.length > 16, `${user.label} missing auth token`);
  user.token = result.data.token;
}

async function createManualLead(user) {
  const text = [
    `${user.uniqueTitle}`,
    "Company: ZAKI Isolation Labs",
    "Location: Remote",
    "Description: Build tenant-safe FastAPI, React, PostgreSQL, and LLM workflow software.",
    "Apply: https://example.com/zaki-hire-isolation",
  ].join("\n");
  const result = await request("/api/hire/leads/manual", {
    method: "POST",
    token: user.token,
    json: { text, url: "https://example.com/zaki-hire-isolation", kind: "job" },
  });
  assert(result.status === 200, `${user.label} manual lead failed: ${result.status} ${result.raw}`);
  const id = leadId(result.data);
  assert(id, `${user.label} manual lead response did not include an id`);
  user.createdLeadId = id;
}

async function listLeads(user) {
  const result = await request("/api/hire/leads", { token: user.token });
  assert(result.status === 200, `${user.label} lead list failed: ${result.status} ${result.raw}`);
  return normalizeLeads(result.data);
}

async function deleteLead(user) {
  if (!user.createdLeadId) return;
  const result = await request(`/api/hire/leads/${encodeURIComponent(user.createdLeadId)}`, {
    method: "DELETE",
    token: user.token,
  });
  if (![200, 202, 204, 404].includes(result.status)) {
    throw new Error(`${user.label} cleanup failed: ${result.status} ${result.raw}`);
  }
}

async function cleanupCreatedLeads() {
  if (!cleanup) {
    logStep("Skipping cleanup (HIRE_ISOLATION_CLEANUP=false)");
    return;
  }

  logStep("Cleaning up created leads");
  const results = await Promise.allSettled(users.map(deleteLead));
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length > 0) {
    throw new Error(
      `cleanup failed for ${failures.length} lead(s): ${failures
        .map((failure) => failure.reason?.message || String(failure.reason || "unknown"))
        .join("; ")}`
    );
  }
}

async function main() {
  logStep(`Target base URL: ${baseUrl}`);
  assert(users[0].email !== users[1].email, "two distinct users are required");

  let primaryError = null;
  try {
    logStep("Logging in both users");
    await Promise.all(users.map(login));

    logStep("Creating one unique manual lead per user");
    await createManualLead(users[0]);
    await createManualLead(users[1]);

    logStep("Verifying each tenant sees its own lead and not the other tenant's lead");
    const [aLeads, bLeads] = await Promise.all(users.map(listLeads));
    const aTitles = aLeads.map(leadTitle).join("\n");
    const bTitles = bLeads.map(leadTitle).join("\n");

    assert(aTitles.includes(users[0].uniqueTitle), "user-a cannot see its own Hire lead");
    assert(bTitles.includes(users[1].uniqueTitle), "user-b cannot see its own Hire lead");
    assert(!aTitles.includes(users[1].uniqueTitle), "user-a can see user-b Hire lead");
    assert(!bTitles.includes(users[0].uniqueTitle), "user-b can see user-a Hire lead");
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    try {
      await cleanupCreatedLeads();
    } catch (cleanupError) {
      if (!primaryError) throw cleanupError;
      console.error(`[HIRE-ISOLATION] Cleanup failed after primary failure: ${cleanupError?.message || cleanupError}`);
    }
  }

  logStep("Hire two-user isolation smoke completed successfully.");
  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        runId,
        cleanedUp: cleanup,
      },
      null,
      2
    ) + "\n"
  );
}

main().catch((error) => {
  console.error(`\n[HIRE-ISOLATION] FAILED: ${error?.message || error}`);
  process.exitCode = 1;
});
