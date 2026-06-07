#!/usr/bin/env node

/**
 * Value-producing ZAKI Hire E2E smoke.
 *
 * Exercises the hosted path users care about:
 * login -> profile -> manual lead -> generated package -> artifact download.
 */

const baseUrl = String(process.env.ZAKI_BASE_URL || process.env.SMOKE_BASE_URL || "http://127.0.0.1:8787")
  .replace(/\/+$/, "");
const email = String(process.env.HIRE_VALUE_EMAIL || process.env.SMOKE_USER_EMAIL || "zaki-e2e-user-a@example.com").trim();
const password = String(process.env.HIRE_VALUE_PASSWORD || process.env.SMOKE_USER_PASSWORD || process.env.SMOKE_PASSWORD || "ZakiE2E!2026").trim();
const cleanup = String(process.env.HIRE_VALUE_CLEANUP || "true").toLowerCase() !== "false";
const runId = `hire-value-${Date.now().toString(36)}`;

let token = "";
let createdLeadId = "";

function logStep(message) {
  process.stdout.write(`\n[HIRE-VALUE] ${message}\n`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, { method = "GET", json, expectJson = true, timeoutMs = 180_000 } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json !== undefined) headers["Content-Type"] = "application/json";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: json !== undefined ? JSON.stringify(json) : undefined,
      signal: controller.signal,
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    const raw = buffer.toString("utf8");
    let data = null;
    if (expectJson) {
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }
    }
    return { response, status: response.status, data, raw, buffer };
  } finally {
    clearTimeout(timeout);
  }
}

async function login() {
  assert(email, "HIRE_VALUE_EMAIL or SMOKE_USER_EMAIL is required");
  assert(password, "HIRE_VALUE_PASSWORD or SMOKE_USER_PASSWORD is required");
  const result = await request("/login", {
    method: "POST",
    json: { username: email, password },
    timeoutMs: 30_000,
  });
  assert(result.status === 200, `login failed: ${result.status} ${result.raw}`);
  assert(typeof result.data?.token === "string" && result.data.token.length > 16, "login did not return a token");
  token = result.data.token;
}

function leadId(payload) {
  return String(payload?.job_id || payload?.id || payload?.lead?.job_id || payload?.lead?.id || "").trim();
}

function assertPublicArtifactRef(value, label) {
  const text = String(value || "").trim();
  assert(text, `${label} artifact reference is missing`);
  assert(!text.includes("/") && !text.includes("\\"), `${label} artifact leaked a filesystem path: ${text}`);
  assert(text.toLowerCase().endsWith(".pdf"), `${label} artifact is not a PDF reference: ${text}`);
}

async function cleanupLead() {
  if (!createdLeadId || !cleanup) return;
  const result = await request(`/api/hire/leads/${encodeURIComponent(createdLeadId)}`, {
    method: "DELETE",
    timeoutMs: 30_000,
  });
  if (![200, 202, 204, 404].includes(result.status)) {
    throw new Error(`cleanup failed: ${result.status} ${result.raw}`);
  }
}

async function main() {
  logStep(`Target base URL: ${baseUrl}`);
  await login();

  try {
    logStep("Saving candidate profile");
    const profile = await request("/api/hire/profile/candidate", {
      method: "PUT",
      json: {
        n: "ZAKI Hire E2E Candidate",
        s: "Backend and product engineer with FastAPI, React, PostgreSQL, and LLM workflow experience.",
      },
      timeoutMs: 30_000,
    });
    assert(profile.status === 200, `profile update failed: ${profile.status} ${profile.raw}`);
    assert(String(profile.data?.n || "").includes("ZAKI Hire E2E"), `profile response did not include candidate: ${profile.raw}`);

    logStep("Creating a detailed manual lead");
    const uniqueTitle = `ZAKI Hire Value Engineer ${runId}`;
    const leadText = [
      uniqueTitle,
      "Company: ZAKI Value Labs",
      "Location: Remote",
      "Role: Senior Backend Engineer",
      "Requirements: Python, FastAPI, React, TypeScript, PostgreSQL, multi-tenant SaaS, LLM workflow orchestration, observability, and secure API design.",
      "Responsibilities: build production SaaS services, integrate AI providers, harden tenant isolation, and ship user-facing hiring automation.",
      "Apply: https://example.com/zaki-hire-value-e2e",
    ].join("\n");
    const created = await request("/api/hire/leads/manual", {
      method: "POST",
      json: { text: leadText, url: "https://example.com/zaki-hire-value-e2e", kind: "job" },
      timeoutMs: 45_000,
    });
    assert(created.status === 200, `manual lead failed: ${created.status} ${created.raw}`);
    createdLeadId = leadId(created.data);
    assert(createdLeadId, `manual lead response did not include an id: ${created.raw}`);

    logStep("Generating resume and cover-letter package");
    const generated = await request(`/api/hire/leads/${encodeURIComponent(createdLeadId)}/generate`, {
      method: "POST",
      json: {},
      timeoutMs: 240_000,
    });
    assert(generated.status === 200, `generation failed: ${generated.status} ${generated.raw}`);
    const generatedLead = generated.data?.lead || generated.data;
    assertPublicArtifactRef(generatedLead?.resume_asset || generatedLead?.asset, "resume");
    assertPublicArtifactRef(generatedLead?.cover_letter_asset, "cover letter");
    assert(!JSON.stringify(generated.data || {}).includes("/tmp/"), "generation response leaked a temp filesystem path");

    logStep("Verifying generated versions and artifact downloads");
    const versions = await request(`/api/hire/leads/${encodeURIComponent(createdLeadId)}/versions`, { timeoutMs: 30_000 });
    assert(versions.status === 200, `versions failed: ${versions.status} ${versions.raw}`);
    assert(Array.isArray(versions.data) && versions.data.length > 0, `no generated versions returned: ${versions.raw}`);
    assertPublicArtifactRef(versions.data[0]?.resume, "version resume");
    assertPublicArtifactRef(versions.data[0]?.cover_letter, "version cover letter");

    const resumePdf = await request(`/api/hire/leads/${encodeURIComponent(createdLeadId)}/pdf?kind=resume`, {
      expectJson: false,
      timeoutMs: 30_000,
    });
    assert(resumePdf.status === 200, `resume PDF failed: ${resumePdf.status} ${resumePdf.raw}`);
    assert(resumePdf.buffer.subarray(0, 5).toString("utf8") === "%PDF-", "resume response is not a PDF");

    const coverPdf = await request(`/api/hire/leads/${encodeURIComponent(createdLeadId)}/pdf?kind=cover_letter`, {
      expectJson: false,
      timeoutMs: 30_000,
    });
    assert(coverPdf.status === 200, `cover letter PDF failed: ${coverPdf.status} ${coverPdf.raw}`);
    assert(coverPdf.buffer.subarray(0, 5).toString("utf8") === "%PDF-", "cover letter response is not a PDF");

    logStep("Hire value E2E smoke completed successfully.");
    process.stdout.write(JSON.stringify({
      ok: true,
      baseUrl,
      leadId: createdLeadId,
      generatedStatus: generated.data?.status || generatedLead?.status || "",
      versions: versions.data.length,
      cleanedUp: cleanup,
    }, null, 2) + "\n");
  } finally {
    await cleanupLead();
  }
}

main().catch((error) => {
  console.error(`\n[HIRE-VALUE] FAILED: ${error?.message || error}`);
  process.exitCode = 1;
});
