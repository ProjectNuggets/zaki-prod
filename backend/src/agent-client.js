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

export async function fetchNullclawUserHistory({
  baseUrl,
  internalToken,
  userId,
  requestId,
  spaceId,
  threadId,
  fetchWithTimeout,
  timeoutMs,
}) {
  const historyPath =
    `/api/v1/users/${encodeURIComponent(userId)}/history` +
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
