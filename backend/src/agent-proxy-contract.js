export function resolveCanonicalAgentUserId(authResult) {
  const rawId = authResult?.zakiUser?.id;
  const parsed = Number(rawId);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return String(parsed);
}

export function buildAgentForwardHeaders({
  internalToken,
  userId,
  requestId,
  contentType = "application/json",
  extraHeaders = {},
}) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    throw new Error("invalid_user_id");
  }
  return {
    "Content-Type": contentType,
    "X-Internal-Token": String(internalToken || "").trim(),
    "X-Zaki-User-Id": normalizedUserId,
    "X-Request-Id": String(requestId || "").trim(),
    ...extraHeaders,
  };
}

export function extractAgentTokenChunk(eventType, payload) {
  if (eventType !== "token") return "";
  if (!payload || typeof payload !== "object") return "";
  return String(
    payload.delta || payload.token || payload.text || payload.chunk || payload.content || ""
  );
}

export function buildAgentRetrySsePayload(statusCode) {
  if (statusCode === 409) {
    return {
      code: "ownership_lock_conflict",
      message: "agent is handling another request for this user, retry shortly",
    };
  }
  if (statusCode === 503) {
    return {
      code: "gateway_draining",
      message: "agent is draining, retry shortly",
    };
  }
  return null;
}

