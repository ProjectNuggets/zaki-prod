import { buildAgentForwardHeaders } from "./agent-proxy-contract.js";
import { isRetryableUpstreamError } from "./agent-approve-retry.js";

export function getNullclawBase(rawBaseUrl) {
  const normalized = String(rawBaseUrl || "").trim().replace(/\/+$/, "");
  return normalized || null;
}

function assertBaseAndToken(baseUrl, internalToken) {
  const resolvedBase = getNullclawBase(baseUrl);
  if (!resolvedBase) {
    // D28 (sunset 2026-05-15): error message names canonical NULLALIS_* env
    // var; legacy NULLCLAW_BASE_URL still accepted upstream by readNullalisEnv.
    throw new Error("NULLALIS_BASE_URL is not configured.");
  }
  const resolvedToken = String(internalToken || "").trim();
  if (!resolvedToken) {
    throw new Error("NULLALIS_INTERNAL_TOKEN is not configured.");
  }
  return { resolvedBase, resolvedToken };
}

export async function fetchNullclawPath({
  baseUrl,
  internalToken,
  userId,
  requestId,
  path,
  method = "GET",
  body,
  fetchWithTimeout,
  timeoutMs,
  label = "Nullclaw request",
  contentType = "application/json",
  extraHeaders = {},
}) {
  const { resolvedBase, resolvedToken } = assertBaseAndToken(baseUrl, internalToken);
  const normalizedPath = String(path || "").startsWith("/") ? String(path) : `/${String(path || "")}`;
  const options = {
    method,
    headers: buildAgentForwardHeaders({
      internalToken: resolvedToken,
      userId,
      requestId,
      contentType,
      extraHeaders,
    }),
  };
  if (body !== undefined) {
    options.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return fetchWithTimeout(`${resolvedBase}${normalizedPath}`, options, timeoutMs, label);
}

export async function probeNullclawReady(options) {
  return fetchNullclawPath({
    ...options,
    path: "/ready",
    method: "GET",
    label: options.label || "Agent upstream ready probe",
  });
}

// P1-11: a loosened readiness gate for the per-chat probe. A single 1500ms probe
// against a busy-but-healthy agent was producing spurious 503s + refunded turns
// (GlitchTip "Agent upstream ready probe timed out after 1500ms"). Instead of a
// one-shot pass/fail, we probe up to twice and classify the outcome:
//
//   - "ready"   : the /ready probe returned ok → stream normally.
//   - "proceed" : the agent answered the socket but the probe was slow/non-ok
//                 (a timeout from fetchWithTimeout, or a non-2xx status). The
//                 process is up; prefer ATTEMPTING the stream (which carries its
//                 own ~300s budget) over a hard 503 on a busy-but-healthy agent.
//   - "refused" : a true connection-class refusal (ECONNREFUSED and friends) —
//                 nothing is listening → a retryable 503 is correct.
//
// One re-probe is performed before deciding "proceed"/"refused" so a single
// transient blip during the gate does not leak through as either outcome.
export async function probeNullclawReadyWithRetry(options) {
  const maxAttempts = Math.max(1, Number(options.maxAttempts) || 2);
  let lastError = null;
  let lastStatus = null;
  let sawRefusal = false;
  let attempts = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attempts = attempt;
    try {
      const probe = await probeNullclawReady(options);
      if (probe && probe.ok) {
        return { decision: "ready", attempts, lastStatus: probe.status ?? null, lastError: null };
      }
      // Connected (got an HTTP response) but not ok. The process is listening, so
      // it is busy/degraded rather than absent. Remember the status and re-probe.
      lastStatus = probe ? (probe.status ?? null) : null;
      lastError = null;
      sawRefusal = false;
    } catch (error) {
      lastError = error;
      lastStatus = null;
      // A true connection-class refusal (ECONNREFUSED/ECONNRESET/...) means the
      // socket was refused; a "... timed out after Nms" throw means we connected
      // (or were trying to) but the agent was slow — that is NOT a refusal.
      sawRefusal = isRetryableUpstreamError(error);
    }
  }

  if (sawRefusal) {
    return { decision: "refused", attempts, lastStatus, lastError };
  }
  // Connected-but-slow / non-ok after the re-probe → attempt the stream anyway.
  return { decision: "proceed", attempts, lastStatus, lastError };
}

export async function requestNullclawChatStream({
  baseUrl,
  internalToken,
  userId,
  requestId,
  payload,
  fetchWithTimeout,
  timeoutMs,
}) {
  return fetchNullclawPath({
    baseUrl,
    internalToken,
    userId,
    requestId,
    path: "/api/v1/chat/stream",
    method: "POST",
    body: payload,
    fetchWithTimeout,
    timeoutMs,
    label: "Agent upstream request",
  });
}

export async function requestNullalisUserPurge({
  baseUrl,
  internalToken,
  userId,
  requestId,
  fetchWithTimeout,
  timeoutMs,
}) {
  const normalizedUserId = String(userId || "").trim();
  return fetchNullclawPath({
    baseUrl,
    internalToken,
    userId: normalizedUserId,
    requestId,
    path: `/api/v1/users/${encodeURIComponent(normalizedUserId)}/data`,
    method: "DELETE",
    body: { confirm: `PURGE-USER-${normalizedUserId}` },
    fetchWithTimeout,
    timeoutMs,
    label: "Nullalis GDPR user purge",
  });
}

// B4 (P1-16): server-side ensure-provisioned primitive. Posts the provision
// payload to the engine's idempotent /api/v1/users/provision endpoint so the
// BFF can (re)provision a user before driving chat — defense-in-depth for the
// FK/not-found window where the engine no longer holds a user the BFF is about
// to write for. Connection-class outages and non-2xx upstreams are reported as
// { ok: false } (never thrown) so callers can hard-fail chat with a retryable
// 503 instead of leaking an unhandled rejection.
export async function ensureNullclawProvisioned({
  baseUrl,
  internalToken,
  userId,
  requestId,
  payload,
  fetchWithTimeout,
  timeoutMs,
}) {
  try {
    const response = await fetchNullclawPath({
      baseUrl,
      internalToken,
      userId,
      requestId,
      path: "/api/v1/users/provision",
      method: "POST",
      body: payload,
      fetchWithTimeout,
      timeoutMs,
      label: "Agent upstream provision",
    });
    return {
      ok: Boolean(response && response.ok),
      status: response ? (response.status ?? null) : null,
      response: response ?? null,
      error: null,
    };
  } catch (error) {
    return { ok: false, status: null, response: null, error };
  }
}

export async function fetchNullclawUserHistory({
  baseUrl,
  internalToken,
  userId,
  requestId,
  sessionKey = null,
  spaceId,
  threadId,
  fetchWithTimeout,
  timeoutMs,
}) {
  const normalizedSessionKey = String(sessionKey || "").trim();
  const historyPath = normalizedSessionKey
    ? `/api/v1/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(normalizedSessionKey)}/history`
    : `/api/v1/users/${encodeURIComponent(userId)}/history` +
      `?space_id=${encodeURIComponent(spaceId)}` +
      `&thread_id=${encodeURIComponent(threadId)}`;
  return fetchNullclawPath({
    baseUrl,
    internalToken,
    userId,
    requestId,
    path: historyPath,
    method: "GET",
    fetchWithTimeout,
    timeoutMs,
    label: "Agent history request",
  });
}
