#!/usr/bin/env node

/**
 * Memory session end-to-end smoke (API-level).
 *
 * Validates:
 * 1) short conversation is skipped
 * 2) valid session gets queued
 * 3) memory is persisted
 * 4) duplicate session does not create duplicate memory
 * 5) contradictory statement creates a conflict
 *
 * Usage:
 *   SMOKE_BASE_URL=http://localhost:8787 \
 *   SMOKE_USER_EMAIL=verified@example.com \
 *   SMOKE_USER_PASSWORD='...' \
 *   node scripts/smoke-memory-session.mjs
 */

const baseUrl = String(process.env.SMOKE_BASE_URL || "http://127.0.0.1:8787").replace(/\/+$/, "");
const email = String(process.env.SMOKE_USER_EMAIL || "").trim();
const password = String(process.env.SMOKE_USER_PASSWORD || "").trim();
const policyVersion = String(
  process.env.SMOKE_LEGAL_POLICY_VERSION ||
    process.env.ZAKI_LEGAL_POLICY_VERSION ||
    "2026-02-17.v2"
).trim();
const timeoutMs = Number.parseInt(process.env.SMOKE_TIMEOUT_MS || "15000", 10);
const pollTimeoutMs = Number.parseInt(process.env.SMOKE_POLL_TIMEOUT_MS || "25000", 10);
const pollIntervalMs = Number.parseInt(process.env.SMOKE_POLL_INTERVAL_MS || "1000", 10);
const autoResolveConflict =
  String(process.env.SMOKE_AUTO_RESOLVE_CONFLICT || "true").trim().toLowerCase() !== "false";

function logStep(message) {
  process.stdout.write(`\n[SMOKE-MEMORY] ${message}\n`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

async function login() {
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
  assert(result.status === 200, `Login failed: ${result.status} ${result.raw}`);
  const token = String(result.data?.token || "");
  assert(token.length > 16, "Missing auth token from /login");
  return token;
}

async function getMemoryList(token) {
  const result = await request("/api/memory/list?limit=100", { token });
  assert(result.status === 200, `Memory list failed: ${result.status} ${result.raw}`);
  const memories = Array.isArray(result.data?.memories) ? result.data.memories : [];
  return memories;
}

async function getConflicts(token) {
  const result = await request("/api/memory/conflicts?limit=100", { token });
  assert(result.status === 200, `Memory conflicts failed: ${result.status} ${result.raw}`);
  return Array.isArray(result.data?.conflicts) ? result.data.conflicts : [];
}

function countMemoriesWithToken(memories, uniqueToken) {
  const needle = String(uniqueToken || "").toLowerCase();
  return memories.filter((memory) =>
    String(memory?.content || "").toLowerCase().includes(needle)
  ).length;
}

function countConflictsWithToken(conflicts, uniqueToken) {
  const needle = String(uniqueToken || "").toLowerCase();
  return conflicts.filter((conflict) =>
    String(conflict?.new_content || "").toLowerCase().includes(needle) ||
    String(conflict?.conflicting_content || "").toLowerCase().includes(needle)
  ).length;
}

async function pollUntil(description, fn) {
  const start = Date.now();
  let lastValue = null;
  while (Date.now() - start < pollTimeoutMs) {
    // eslint-disable-next-line no-await-in-loop
    lastValue = await fn();
    if (lastValue?.ok) return lastValue;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  throw new Error(`${description} timed out after ${pollTimeoutMs}ms`);
}

async function endSession(token, messages, threadId) {
  return request("/api/memory/end-session", {
    method: "POST",
    token,
    json: {
      threadId,
      threadTitle: "Smoke Memory Session",
      messages,
    },
  });
}

async function resolveConflict(token, conflictId) {
  return request(`/api/memory/conflicts/${encodeURIComponent(conflictId)}/resolve`, {
    method: "POST",
    token,
    json: { action: "keep_existing" },
  });
}

async function main() {
  logStep(`Target base URL: ${baseUrl}`);
  const token = await login();

  const runToken = `smoke${Date.now().toString(36)}`;
  const preferenceToken = `${runToken}tea`;
  const threadId = `smoke-thread-${Date.now().toString(36)}`;

  logStep("Baseline memory/conflict snapshot");
  const baselineMemories = await getMemoryList(token);
  const baselineConflicts = await getConflicts(token);
  const baseMemMatch = countMemoriesWithToken(baselineMemories, preferenceToken);
  const baseConflictMatch = countConflictsWithToken(baselineConflicts, preferenceToken);

  logStep("Check short session skip");
  const shortSession = await endSession(
    token,
    [
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
    ],
    threadId
  );
  assert(
    shortSession.status === 200 &&
      shortSession.data?.skipped === true &&
      shortSession.data?.reason === "conversation_too_short",
    `Short session skip failed: ${shortSession.status} ${shortSession.raw}`
  );

  logStep("Submit valid session and wait for persisted memory");
  const firstSession = await endSession(
    token,
    [
      { role: "user", content: `I like ${preferenceToken}` },
      { role: "assistant", content: "Got it." },
      { role: "user", content: `Remember that I like ${preferenceToken}` },
    ],
    threadId
  );
  assert(
    firstSession.status === 200 && firstSession.data?.ok === true,
    `Valid session queue failed: ${firstSession.status} ${firstSession.raw}`
  );

  await pollUntil("memory persistence", async () => {
    const list = await getMemoryList(token);
    const count = countMemoriesWithToken(list, preferenceToken);
    return { ok: count >= baseMemMatch + 1, count };
  });

  const afterFirstMemories = await getMemoryList(token);
  const firstMatchCount = countMemoriesWithToken(afterFirstMemories, preferenceToken);

  logStep("Submit duplicate session and verify no duplicate memory row");
  const duplicateSession = await endSession(
    token,
    [
      { role: "user", content: `I like ${preferenceToken}` },
      { role: "assistant", content: "Okay." },
      { role: "user", content: `Yes I still like ${preferenceToken}` },
    ],
    threadId
  );
  assert(
    duplicateSession.status === 200 && duplicateSession.data?.ok === true,
    `Duplicate session queue failed: ${duplicateSession.status} ${duplicateSession.raw}`
  );

  await new Promise((resolve) => setTimeout(resolve, 2500));
  const afterDuplicateMemories = await getMemoryList(token);
  const duplicateMatchCount = countMemoriesWithToken(afterDuplicateMemories, preferenceToken);
  assert(
    duplicateMatchCount === firstMatchCount,
    `Duplicate suppression failed: before=${firstMatchCount} after=${duplicateMatchCount}`
  );

  logStep("Submit contradictory session and wait for conflict");
  const conflictSession = await endSession(
    token,
    [
      { role: "user", content: `I don't like ${preferenceToken}` },
      { role: "assistant", content: "Understood." },
      { role: "user", content: `Please update that I dislike ${preferenceToken}` },
    ],
    threadId
  );
  assert(
    conflictSession.status === 200 && conflictSession.data?.ok === true,
    `Conflict session queue failed: ${conflictSession.status} ${conflictSession.raw}`
  );

  const conflictPoll = await pollUntil("conflict creation", async () => {
    const conflicts = await getConflicts(token);
    const count = countConflictsWithToken(conflicts, preferenceToken);
    return { ok: count >= baseConflictMatch + 1, count, conflicts };
  });

  let resolvedConflictId = null;
  if (autoResolveConflict) {
    const matching = conflictPoll.conflicts.find((conflict) =>
      String(conflict?.new_content || "").toLowerCase().includes(preferenceToken.toLowerCase())
    );
    if (matching?.id) {
      logStep("Resolving created conflict with keep_existing");
      const resolved = await resolveConflict(token, matching.id);
      assert(
        resolved.status === 200 && resolved.data?.success === true,
        `Conflict resolve failed: ${resolved.status} ${resolved.raw}`
      );
      resolvedConflictId = matching.id;
    }
  }

  const summary = {
    ok: true,
    baseUrl,
    email,
    threadId,
    preferenceToken,
    baseline: {
      matchingMemories: baseMemMatch,
      matchingConflicts: baseConflictMatch,
    },
    afterFirstSession: {
      matchingMemories: firstMatchCount,
    },
    afterDuplicateSession: {
      matchingMemories: duplicateMatchCount,
    },
    conflict: {
      countAfterConflict: conflictPoll.count,
      autoResolved: Boolean(resolvedConflictId),
      resolvedConflictId,
    },
  };

  logStep("Memory smoke completed successfully.");
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  console.error("\n[SMOKE-MEMORY] FAILED");
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
