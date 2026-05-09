#!/usr/bin/env node

/**
 * ZAKI Learn two-user isolation smoke.
 *
 * Drives the real local ZAKI BFF and learning engine with two seeded paid users.
 * It validates that auth-bound Learn state stays tenant-scoped across study
 * setup, notebooks, knowledge uploads, memory, co-writer docs, and TutorBot
 * runtime/config state.
 *
 * Usage:
 *   ZAKI_BASE_URL=http://127.0.0.1:8787 node scripts/multiuser-learning-isolation.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const requireFromBackend = createRequire(new URL("../backend/package.json", import.meta.url));
const pg = requireFromBackend("pg");
const bcrypt = requireFromBackend("bcryptjs");

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const backendEnvPath = path.join(repoRoot, "backend", ".env");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

loadEnvFile(backendEnvPath);

const baseUrl = String(process.env.ZAKI_BASE_URL || "http://127.0.0.1:8787").replace(/\/+$/, "");
const databaseUrl = String(process.env.DATABASE_URL || "").trim();
const policyVersion = String(process.env.ZAKI_LEGAL_POLICY_VERSION || "2026-02-17.v2").trim();
const password = process.env.LEARNING_ISOLATION_PASSWORD || "LearnIsolation!123";
const cleanup = String(process.env.LEARNING_ISOLATION_CLEANUP || "true").toLowerCase() !== "false";
const runId = `learniso-${Date.now().toString(36)}`;

function logStep(message) {
  process.stdout.write(`\n[LEARN-ISO] ${message}\n`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function compact(value) {
  return JSON.stringify(value ?? "").slice(0, 240);
}

function containsMarker(raw, marker) {
  return String(raw || "").includes(marker);
}

async function request(pathname, { method = "GET", token, json, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: form || (json === undefined ? undefined : JSON.stringify(json)),
  });
  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  return { status: response.status, ok: response.ok, data, raw };
}

async function requireOk(label, promise) {
  const result = await promise;
  assert(result.ok, `${label} failed: ${result.status} ${result.raw}`);
  return result;
}

async function seedUsers(users) {
  assert(databaseUrl, "DATABASE_URL is required to seed local isolation users.");
  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    for (const user of users) {
      const passwordHash = await bcrypt.hash(password, 10);
      const result = await pool.query(
        `INSERT INTO zaki_users
          (email, password_hash, full_name, date_of_birth, verified, plan_tier, plan_status,
           current_period_end, created_at, updated_at, legal_consent_at, legal_consent_version)
         VALUES ($1, $2, $3, '1999-01-01', true, 'personal', 'active',
           NOW() + INTERVAL '30 days', NOW(), NOW(), NOW(), $4)
         ON CONFLICT (email) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           verified = true,
           plan_tier = 'personal',
           plan_status = 'active',
           current_period_end = NOW() + INTERVAL '30 days',
           updated_at = NOW(),
           legal_consent_at = NOW(),
           legal_consent_version = $4
         RETURNING id`,
        [user.email, passwordHash, user.name, policyVersion],
      );
      user.userId = String(result.rows[0]?.id || "");
      assert(user.userId, `Unable to seed ${user.email}`);
    }
  } finally {
    await pool.end();
  }
}

async function login(user) {
  const result = await requireOk(
    `login ${user.label}`,
    request("/login", {
      method: "POST",
      json: {
        username: user.email,
        password,
        legalConsentAccepted: true,
        legalPolicyVersion: policyVersion,
      },
    }),
  );
  const token = String(result.data?.token || "");
  assert(token.length > 16, `Missing token for ${user.label}`);
  user.token = token;
}

async function createNotebook(user) {
  const name = `${runId} ${user.label} notebook ${user.marker}`;
  const result = await requireOk(
    `create notebook ${user.label}`,
    request("/api/learning/notebooks", {
      method: "POST",
      token: user.token,
      json: {
        name,
        description: user.marker,
        color: "#f10202",
        icon: "book",
      },
    }),
  );
  user.notebookId = String(result.data?.notebook?.id || "");
  assert(user.notebookId, `Missing notebook id for ${user.label}: ${compact(result.data)}`);

  await requireOk(
    `add notebook record ${user.label}`,
    request("/api/learning/notebooks/records/manual", {
      method: "POST",
      token: user.token,
      json: {
        notebook_ids: [user.notebookId],
        record_type: "chat",
        title: `Notebook record ${user.marker}`,
        summary: `Summary ${user.marker}`,
        user_query: `Query ${user.marker}`,
        output: `Output ${user.marker}`,
        metadata: { source: "multiuser-learning-isolation", run_id: runId },
      },
    }),
  );
}

async function createKnowledge(user) {
  const name = `${runId}-${user.label}-kb`;
  const form = new FormData();
  form.set("name", name);
  form.append(
    "files",
    new Blob([`Knowledge file for ${user.marker}\n`], { type: "text/plain" }),
    `${user.label}-marker.txt`,
  );
  const result = await requireOk(
    `create knowledge ${user.label}`,
    request("/api/learning/knowledge/create", {
      method: "POST",
      token: user.token,
      form,
    }),
  );
  user.knowledgeName = name;
  user.knowledgeTaskId = String(result.data?.task_id || "");
}

async function createTutorBot(user, sharedBotId) {
  await requireOk(
    `create shared-id tutor ${user.label}`,
    request("/api/learning/tutor-agents", {
      method: "POST",
      token: user.token,
      json: {
        bot_id: sharedBotId,
        name: `${runId} ${user.label} tutor`,
        persona: `Persona ${user.marker}`,
      },
    }),
  );
  user.botId = sharedBotId;
}

async function writeTenantState(user) {
  await requireOk(
    `study profile ${user.label}`,
    request("/api/learning/study/profile", {
      method: "PUT",
      token: user.token,
      json: {
        course: `Course ${user.marker}`,
        examDate: "2026-09-01",
        topics: `Topics ${user.marker}`,
        goal: "Pass the course",
        weakTopics: `Weak areas ${user.marker}`,
        weeklyHours: "5",
        difficulty: "medium",
        preferredStyle: "visual",
      },
    }),
  );
  await createNotebook(user);
  await createKnowledge(user);
  await requireOk(
    `memory profile ${user.label}`,
    request("/api/learning/memory", {
      method: "PUT",
      token: user.token,
      json: { file: "profile", content: `Memory profile ${user.marker}` },
    }),
  );
  const document = await requireOk(
    `co-writer document ${user.label}`,
    request("/api/learning/co-writer/documents", {
      method: "POST",
      token: user.token,
      json: {
        title: `Draft ${user.marker}`,
        content: `Draft body ${user.marker}`,
      },
    }),
  );
  user.documentId = String(document.data?.id || "");
}

async function readTenantSnapshot(user) {
  const paths = [
    "/api/learning/study",
    "/api/learning/notebooks",
    user.notebookId ? `/api/learning/notebooks/${encodeURIComponent(user.notebookId)}` : null,
    "/api/learning/knowledge/list",
    "/api/learning/memory",
    "/api/learning/co-writer/documents",
    "/api/learning/tutor-agents",
    user.botId ? `/api/learning/tutor-agents/${encodeURIComponent(user.botId)}` : null,
  ].filter(Boolean);

  const parts = [];
  for (const pathname of paths) {
    const result = await requireOk(`snapshot ${user.label} ${pathname}`, request(pathname, { token: user.token }));
    parts.push(result.raw);
  }
  return parts.join("\n");
}

async function cleanupUser(user) {
  if (user.knowledgeName) {
    const settled = await waitForKnowledgeTaskSettled(user);
    if (!settled) {
      process.stderr.write(
        `[LEARN-ISO] Skipping knowledge cleanup for ${user.label}; background indexing is still running.\n`,
      );
      user.knowledgeName = "";
    }
  }
  const tasks = [
    user.botId
      ? request(`/api/learning/tutor-agents/${encodeURIComponent(user.botId)}/destroy`, {
          method: "DELETE",
          token: user.token,
        })
      : null,
    user.documentId
      ? request(`/api/learning/co-writer/documents/${encodeURIComponent(user.documentId)}`, {
          method: "DELETE",
          token: user.token,
        })
      : null,
    user.knowledgeName
      ? request(`/api/learning/knowledge/${encodeURIComponent(user.knowledgeName)}`, {
          method: "DELETE",
          token: user.token,
        })
      : null,
    user.notebookId
      ? request(`/api/learning/notebooks/${encodeURIComponent(user.notebookId)}`, {
          method: "DELETE",
          token: user.token,
        })
      : null,
  ].filter(Boolean);
  await Promise.allSettled(tasks);
  const deleteResult = await request("/api/account/delete", {
    method: "POST",
    token: user.token,
    json: { confirmEmail: user.email },
  }).catch((error) => ({ ok: false, raw: error?.message || String(error) }));
  if (!deleteResult?.ok) {
    process.stderr.write(
      `[LEARN-ISO] Account delete did not complete for ${user.label}; removing seeded local DB row directly.\n`,
    );
    await deleteSeededUserRow(user.email).catch((error) => {
      process.stderr.write(`[LEARN-ISO] Seeded user DB cleanup failed for ${user.label}: ${error?.message || error}\n`);
    });
  }
}

async function deleteSeededUserRow(email) {
  if (!databaseUrl || !email) return;
  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    await pool.query("DELETE FROM zaki_users WHERE email = $1", [email]);
  } finally {
    await pool.end();
  }
}

async function waitForKnowledgeTaskSettled(user) {
  if (!user.knowledgeName) return true;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const result = await request(
      `/api/learning/knowledge/${encodeURIComponent(user.knowledgeName)}/progress`,
      { token: user.token },
    );
    if (result.status === 404) return true;
    const stage = String(result.data?.stage || "").toLowerCase();
    const taskId = String(result.data?.task_id || "");
    if (user.knowledgeTaskId && taskId && taskId !== user.knowledgeTaskId) return true;
    if (["completed", "error"].includes(stage)) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function main() {
  const users = ["a", "b"].map((label) => ({
    label,
    email: `${runId}-${label}@zaki.local`,
    name: `Learn Isolation ${label.toUpperCase()}`,
    marker: `${runId}-marker-${label}`,
    token: "",
    userId: "",
    notebookId: "",
    knowledgeName: "",
    knowledgeTaskId: "",
    documentId: "",
    botId: "",
  }));
  const sharedBotId = `${runId}-shared-bot`;

  logStep(`Target base URL: ${baseUrl}`);
  await requireOk("backend health", request("/health"));
  await requireOk("backend readiness", request("/ready"));

  logStep("Seeding two verified paid users");
  await seedUsers(users);
  await Promise.all(users.map(login));

  logStep("Writing tenant-owned Learn state for both users");
  await Promise.all(users.map(writeTenantState));

  logStep("Starting same TutorBot id under both tenants");
  await Promise.all(users.map((user) => createTutorBot(user, sharedBotId)));

  logStep("Checking snapshots for cross-user marker leakage");
  const snapshots = await Promise.all(users.map(readTenantSnapshot));
  for (let index = 0; index < users.length; index += 1) {
    const user = users[index];
    const snapshot = snapshots[index];
    assert(containsMarker(snapshot, user.marker), `${user.label} snapshot is missing its own marker`);
    for (const other of users) {
      if (other.label === user.label) continue;
      assert(
        !containsMarker(snapshot, other.marker),
        `${user.label} snapshot leaked ${other.label} marker ${other.marker}`,
      );
    }
  }

  logStep(cleanup ? "Cleaning up smoke users and tenant artifacts" : "Skipping cleanup");
  if (cleanup) await Promise.all(users.map(cleanupUser));

  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        runId,
        baseUrl,
        users: users.map((user) => ({
          label: user.label,
          userId: user.userId,
          marker: user.marker,
          notebookId: user.notebookId,
          knowledgeName: user.knowledgeName,
          botId: user.botId,
        })),
        covered: [
          "central auth login",
          "study profile",
          "notebooks and records",
          "knowledge upload/list",
          "memory profile",
          "co-writer documents",
          "TutorBot same-id tenant runtime",
        ],
      },
      null,
      2,
    ) + "\n",
  );
}

main().catch((error) => {
  console.error("\n[LEARN-ISO] FAILED");
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
