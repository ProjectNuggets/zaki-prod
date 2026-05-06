import {
  buildLearningForwardHeaders,
  getLearningBase,
  sanitizeLearningPath,
} from "./learning-bff-contract.js";

function assertBaseAndToken(baseUrl, internalToken) {
  const resolvedBase = getLearningBase(baseUrl);
  if (!resolvedBase) {
    throw new Error("LEARNING_ENGINE_BASE_URL is not configured.");
  }
  const resolvedToken = String(internalToken || "").trim();
  if (!resolvedToken) {
    throw new Error("LEARNING_ENGINE_INTERNAL_TOKEN is not configured.");
  }
  return { resolvedBase, resolvedToken };
}

export async function fetchLearningPath({
  baseUrl,
  internalToken,
  userId,
  requestId,
  path,
  method = "GET",
  body,
  fetchWithTimeout,
  timeoutMs,
  label = "Learning upstream request",
  contentType = "application/json",
  extraHeaders = {},
}) {
  const { resolvedBase, resolvedToken } = assertBaseAndToken(baseUrl, internalToken);
  const normalizedPath = sanitizeLearningPath(path);
  const headers = buildLearningForwardHeaders({
    internalToken: resolvedToken,
    userId,
    requestId,
    contentType,
    extraHeaders,
  });
  const options = {
    method,
    headers,
  };
  if (body !== undefined) {
    options.body = typeof body === "string" || body instanceof Uint8Array ? body : JSON.stringify(body);
  }
  return fetchWithTimeout(`${resolvedBase}${normalizedPath}`, options, timeoutMs, label);
}

export async function probeLearningHealth(options) {
  return fetchLearningPath({
    ...options,
    path: "/healthz",
    method: "GET",
    label: options.label || "Learning health probe",
  });
}

export async function probeLearningReady(options) {
  return fetchLearningPath({
    ...options,
    path: "/readyz",
    method: "GET",
    label: options.label || "Learning ready probe",
  });
}

export async function fetchLearningSessions({
  limit = 50,
  offset = 0,
  ...options
}) {
  const qs = new URLSearchParams();
  qs.set("limit", String(limit));
  qs.set("offset", String(offset));
  return fetchLearningPath({
    ...options,
    path: `/api/v1/sessions?${qs.toString()}`,
    method: "GET",
    label: options.label || "Learning sessions request",
  });
}

export async function fetchLearningSession({
  sessionId,
  ...options
}) {
  const safeSessionId = String(sessionId || "").trim();
  if (!safeSessionId) {
    throw new Error("missing_learning_session_id");
  }
  return fetchLearningPath({
    ...options,
    path: `/api/v1/sessions/${encodeURIComponent(safeSessionId)}`,
    method: "GET",
    label: options.label || "Learning session request",
  });
}

export { getLearningBase };

