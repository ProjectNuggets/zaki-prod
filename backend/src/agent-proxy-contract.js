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

const PERSISTABLE_AGENT_EVENTS = new Set([
  "reasoning_summary",
  "tool_start",
  "tool_result",
  "tool_done",
  "task_update",
  "approval_required",
  "system_notice",
  "progress",
  "done",
]);

export function isPersistableAgentEvent(eventType) {
  if (!eventType) return false;
  return PERSISTABLE_AGENT_EVENTS.has(String(eventType));
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

function normalizedStringOrNull(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizedBooleanOrNull(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
}

function normalizedStringArrayOrNull(value) {
  if (!Array.isArray(value)) return null;
  const normalized = value
    .map((entry) => normalizedStringOrNull(entry))
    .filter(Boolean);
  return normalized.length > 0 ? normalized : null;
}

function pickValue(payload, snakeKey, camelKey) {
  if (Object.prototype.hasOwnProperty.call(payload, snakeKey)) {
    return payload[snakeKey];
  }
  if (camelKey && Object.prototype.hasOwnProperty.call(payload, camelKey)) {
    return payload[camelKey];
  }
  return undefined;
}

export function normalizeTelegramConnectPayload(payload) {
  if (!payload || typeof payload !== "object") return {};

  const source = payload;
  const normalized = {};

  const botToken = normalizedStringOrNull(pickValue(source, "bot_token", "botToken"));
  const webhookUrl = normalizedStringOrNull(pickValue(source, "webhook_url", "webhookUrl"));
  const webhookBaseUrl = normalizedStringOrNull(
    pickValue(source, "webhook_base_url", "webhookBaseUrl")
  );
  const webhookSecretToken = normalizedStringOrNull(
    pickValue(source, "webhook_secret_token", "webhookSecretToken")
  );
  const accountId = normalizedStringOrNull(pickValue(source, "account_id", "accountId"));
  const chatId = normalizedStringOrNull(pickValue(source, "chat_id", "chatId"));
  const allowFrom = normalizedStringArrayOrNull(pickValue(source, "allow_from", "allowFrom"));
  const dropPendingUpdates = normalizedBooleanOrNull(
    pickValue(source, "drop_pending_updates", "dropPendingUpdates")
  );

  if (botToken) normalized.bot_token = botToken;
  if (webhookUrl) normalized.webhook_url = webhookUrl;
  if (webhookBaseUrl) normalized.webhook_base_url = webhookBaseUrl;
  if (webhookSecretToken) normalized.webhook_secret_token = webhookSecretToken;
  if (accountId) normalized.account_id = accountId;
  if (chatId) normalized.chat_id = chatId;
  if (allowFrom) normalized.allow_from = allowFrom;
  if (dropPendingUpdates !== null) normalized.drop_pending_updates = dropPendingUpdates;

  return normalized;
}
