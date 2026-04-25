import { buildAgentForwardHeaders } from "./agent-proxy-contract.js";

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
