#!/usr/bin/env node

const baseUrl = String(process.env.SMOKE_BASE_URL || "http://127.0.0.1:8787").replace(/\/+$/, "");
const email = String(process.env.SMOKE_USER_EMAIL || "").trim();
const password = String(process.env.SMOKE_USER_PASSWORD || "").trim();
const policyVersion = String(
  process.env.SMOKE_LEGAL_POLICY_VERSION ||
    process.env.ZAKI_LEGAL_POLICY_VERSION ||
    "2026-07-12.v4"
).trim();
const timeoutMs = Number.parseInt(process.env.SMOKE_TIMEOUT_MS || "15000", 10);
const undoExpiryWaitMs = Number.parseInt(process.env.SMOKE_UNDO_EXPIRY_WAIT_MS || "5600", 10);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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

async function capture(token, message, threadId = null) {
  return request("/api/memory/capture", {
    method: "POST",
    token,
    json: {
      message,
      threadId,
    },
  });
}

async function getMemoryList(token) {
  return request("/api/memory/list?limit=100", {
    token,
  });
}

async function getMemoryStatus(token) {
  return request("/api/memory/status", {
    token,
  });
}

async function undoMemory(token, memoryId) {
  return request(`/api/memory/undo/${encodeURIComponent(memoryId)}`, {
    method: "POST",
    token,
  });
}

function includesMarker(items, marker, fields = ["content"]) {
  const needle = String(marker || "").toLowerCase();
  return (Array.isArray(items) ? items : []).some((item) =>
    fields.some((field) => String(item?.[field] || "").toLowerCase().includes(needle))
  );
}

async function main() {
  const token = await login();
  const runToken = `smoke-${Date.now().toString(36)}`;

  const preferenceMessage = `I prefer concise answers for ${runToken} and weekly plans for ${runToken}.`;
  const sensitiveMessage = `My phone number is +49 170 123 ${Math.floor(1000 + Math.random() * 9000)}.`;
  const conflictMessageOne = `I work at First ${runToken}.`;
  const conflictMessageTwo = `I work at Second ${runToken}.`;
  const expiryMessage = `I prefer short recaps for ${runToken}.`;

  const summary = {
    baseUrl,
    scenarios: {},
  };

  const preferenceResult = await capture(token, preferenceMessage, `thread-${runToken}`);
  assert(preferenceResult.status === 200, `Preference capture failed: ${preferenceResult.status} ${preferenceResult.raw}`);
  assert(
    Array.isArray(preferenceResult.data?.saved) && preferenceResult.data.saved.length >= 1,
    `Preference capture did not autosave: ${JSON.stringify(preferenceResult.data)}`
  );
  summary.scenarios.preference = {
    saved: preferenceResult.data.saved.length,
    review: preferenceResult.data.review?.length || 0,
  };

  const duplicateResult = await capture(token, preferenceMessage, `thread-${runToken}`);
  assert(duplicateResult.status === 200, `Duplicate capture failed: ${duplicateResult.status} ${duplicateResult.raw}`);
  assert(
    Array.isArray(duplicateResult.data?.duplicates) && duplicateResult.data.duplicates.length >= 1,
    `Duplicate capture did not return duplicates: ${JSON.stringify(duplicateResult.data)}`
  );
  summary.scenarios.duplicate = {
    duplicates: duplicateResult.data.duplicates.length,
  };

  const sensitiveResult = await capture(token, sensitiveMessage, `thread-${runToken}`);
  assert(sensitiveResult.status === 200, `Sensitive capture failed: ${sensitiveResult.status} ${sensitiveResult.raw}`);
  assert(
    Array.isArray(sensitiveResult.data?.review) &&
      sensitiveResult.data.review.length >= 1 &&
      String(sensitiveResult.data.review[0]?.reason || "").length > 0,
    `Sensitive capture did not route to review: ${JSON.stringify(sensitiveResult.data)}`
  );
  summary.scenarios.sensitive = {
    review: sensitiveResult.data.review.length,
    reason: sensitiveResult.data.review[0]?.reason || null,
  };

  const firstConflictSeed = await capture(token, conflictMessageOne, `thread-${runToken}`);
  assert(firstConflictSeed.status === 200, `Conflict seed failed: ${firstConflictSeed.status} ${firstConflictSeed.raw}`);
  const conflictResult = await capture(token, conflictMessageTwo, `thread-${runToken}`);
  assert(conflictResult.status === 200, `Conflict capture failed: ${conflictResult.status} ${conflictResult.raw}`);
  assert(
    Array.isArray(conflictResult.data?.conflicts) && conflictResult.data.conflicts.length >= 1,
    `Conflict capture did not return conflicts: ${JSON.stringify(conflictResult.data)}`
  );
  summary.scenarios.conflict = {
    conflicts: conflictResult.data.conflicts.length,
  };

  const firstSavedIds = preferenceResult.data.saved.map((memory) => String(memory?.id || "").trim()).filter(Boolean);
  assert(firstSavedIds.length >= 1, "Expected saved memory ids for undo success check.");
  for (const memoryId of firstSavedIds) {
    const undoResult = await undoMemory(token, memoryId);
    assert(undoResult.status === 200 && undoResult.data?.success === true, `Undo failed: ${undoResult.status} ${undoResult.raw}`);
  }

  const afterUndoList = await getMemoryList(token);
  assert(afterUndoList.status === 200, `Memory list failed after undo: ${afterUndoList.status} ${afterUndoList.raw}`);
  const remainingIds = new Set(
    (Array.isArray(afterUndoList.data?.memories) ? afterUndoList.data.memories : [])
      .map((memory) => String(memory?.id || "").trim())
      .filter(Boolean)
  );
  assert(
    firstSavedIds.every((memoryId) => !remainingIds.has(memoryId)),
    `Undo did not remove the saved memory ids: ${JSON.stringify(afterUndoList.data)}`
  );
  summary.scenarios.undoSuccess = { ok: true };

  const expiryResult = await capture(token, expiryMessage, `thread-${runToken}`);
  assert(expiryResult.status === 200, `Expiry capture failed: ${expiryResult.status} ${expiryResult.raw}`);
  const expirySavedId = expiryResult.data?.saved?.[0]?.id;
  assert(expirySavedId, "Expected saved memory id for undo expiry check.");

  await new Promise((resolve) => setTimeout(resolve, undoExpiryWaitMs));
  const expiredUndo = await undoMemory(token, expirySavedId);
  assert(
    expiredUndo.status >= 400 || expiredUndo.data?.success === false,
    `Expired undo should fail cleanly: ${expiredUndo.status} ${expiredUndo.raw}`
  );
  summary.scenarios.undoExpired = {
    status: expiredUndo.status,
    error: expiredUndo.data?.error || null,
  };

  const statusResult = await getMemoryStatus(token);
  assert(statusResult.status === 200, `Memory status failed: ${statusResult.status} ${statusResult.raw}`);
  assert(
    Number(statusResult.data?.pending || 0) >= 1 && Number(statusResult.data?.conflicts || 0) >= 1,
    `Memory status did not reflect review/conflict counts: ${JSON.stringify(statusResult.data)}`
  );
  summary.scenarios.status = {
    pending: Number(statusResult.data?.pending || 0),
    conflicts: Number(statusResult.data?.conflicts || 0),
  };

  process.stdout.write(`${JSON.stringify({ ok: true, ...summary }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(
    `${JSON.stringify({ ok: false, error: error?.message || String(error) }, null, 2)}\n`
  );
  process.exitCode = 1;
});
