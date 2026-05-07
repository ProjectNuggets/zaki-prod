import { Transform } from "node:stream";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

const STRIPPED_BROWSER_HEADERS = new Set([
  "authorization",
  "content-type",
  "cookie",
  "host",
  "x-internal-token",
  "x-zaki-user-id",
  "x-webhook-base-url",
]);

const LEARNING_PATH_SAFE_PATTERN = /^\/[A-Za-z0-9/_:.,~@?&=%+\-[\]]*$/;
const OPERATOR_MANAGED_LEARNING_FIELDS = new Set([
  "apikey",
  "baseurl",
  "binding",
  "llmselection",
  "model",
  "modelid",
  "modelname",
  "provider",
  "providerconfig",
  "providerid",
  "providername",
  "providersettings",
]);
const LEARNING_WS_ALLOWED_ROOT_FIELDS = new Set([
  "agent_id",
  "attachments",
  "book_id",
  "book_references",
  "bot_id",
  "capability",
  "chat_id",
  "config",
  "content",
  "entry_id",
  "file_id",
  "filename",
  "history_references",
  "id",
  "knowledge_bases",
  "language",
  "memory_references",
  "message",
  "notebook_references",
  "operation_id",
  "page_id",
  "prompt",
  "query",
  "question_notebook_references",
  "session_id",
  "skills",
  "task_id",
  "tools",
  "turn_id",
  "type",
]);
const DEFAULT_LEARNING_MAX_REQUEST_BYTES = 100 * 1024 * 1024;
const LEARNING_WS_QUOTA_FREE_TYPES = new Set([
  "cancel",
  "cancel_turn",
  "heartbeat",
  "ping",
  "pong",
  "subscribe",
  "unsubscribe",
]);
const LEARNING_NOTEBOOK_ID_SEGMENT = "[^/?#]+";
export const LEARNING_TUTOR_AGENT_CHANNEL_ALLOWLIST = [
  "whatsapp",
  "telegram",
  "discord",
  "email",
  "slack",
];
const LEARNING_TUTOR_AGENT_CHANNEL_SET = new Set(LEARNING_TUTOR_AGENT_CHANNEL_ALLOWLIST);
const LEARNING_TUTOR_AGENT_CHANNEL_GLOBAL_KEYS = new Set([
  "send_progress",
  "send_tool_hints",
]);

export function isLearningEnabled(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

export function getLearningBase(rawBaseUrl) {
  const normalized = String(rawBaseUrl || "").trim().replace(/\/+$/, "");
  return normalized || null;
}

export function resolveCanonicalLearningUserId(authResult) {
  const rawId = authResult?.zakiUser?.id;
  const parsed = Number(rawId);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return String(parsed);
}

export function buildLearningForwardHeaders({
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

  const headers = {
    "X-Internal-Token": String(internalToken || "").trim(),
    "X-Zaki-User-Id": normalizedUserId,
    "X-Request-Id": String(requestId || "").trim(),
    ...extraHeaders,
  };
  if (contentType) {
    headers["Content-Type"] = contentType;
  }
  return headers;
}

export function sanitizeLearningPath(path) {
  const raw = String(path || "");
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) || raw.startsWith("//")) {
    throw new Error("invalid_learning_path");
  }
  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  if (!LEARNING_PATH_SAFE_PATTERN.test(normalized)) {
    throw new Error("invalid_learning_path");
  }
  if (normalized.includes("\r") || normalized.includes("\n")) {
    throw new Error("invalid_learning_path");
  }
  return normalized;
}

export function buildLearningProxyHeaders(req, {
  internalToken,
  userId,
  requestId,
  contentType,
  extraHeaders = {},
}) {
  const outgoing = {};
  for (const [key, value] of Object.entries(req?.headers || {})) {
    if (!value) continue;
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower) || STRIPPED_BROWSER_HEADERS.has(lower)) {
      continue;
    }
    outgoing[key] = Array.isArray(value) ? value.join(",") : String(value);
  }
  return buildLearningForwardHeaders({
    internalToken,
    userId,
    requestId,
    contentType,
    extraHeaders: {
      ...outgoing,
      ...extraHeaders,
    },
  });
}

export function buildLearningDisabledPayload(requestId) {
  return {
    code: "learning_disabled",
    error: "Learning is not enabled.",
    message: "Learning is not enabled for this environment.",
    requestId,
  };
}

export function buildLearningConfigErrorPayload(message, requestId) {
  return {
    code: "learning_config_missing",
    error: message,
    message,
    requestId,
  };
}

export function mapLearningUpstreamFailure(statusCode, requestId) {
  if (statusCode === 401 || statusCode === 403) {
    return {
      status: 502,
      body: {
        code: "learning_upstream_auth_failed",
        error: "Learning upstream authentication failed.",
        message: "Learning is temporarily unavailable.",
        requestId,
      },
    };
  }
  if (statusCode === 404) {
    return {
      status: 404,
      body: {
        code: "learning_resource_not_found",
        error: "Learning resource not found.",
        message: "Learning resource not found.",
        requestId,
      },
    };
  }
  if (statusCode === 409) {
    return {
      status: 409,
      body: {
        code: "learning_conflict",
        error: "Learning request conflict.",
        message: "Learning is handling a conflicting request. Try again shortly.",
        requestId,
      },
    };
  }
  if (statusCode === 503) {
    return {
      status: 503,
      body: {
        code: "learning_unavailable",
        error: "Learning is unavailable.",
        message: "Learning is temporarily unavailable.",
        retryable: true,
        requestId,
      },
    };
  }
  if (statusCode >= 500) {
    return {
      status: 502,
      body: {
        code: "learning_upstream_failed",
        error: "Learning upstream failed.",
        message: "Learning is temporarily unavailable.",
        retryable: true,
        requestId,
      },
    };
  }
  return null;
}

export function extractLearningWsToken(req) {
  const authHeader = String(req?.headers?.authorization || "");
  if (/^Bearer\s+\S+/i.test(authHeader)) {
    return authHeader.slice(authHeader.indexOf(" ") + 1).trim();
  }

  const protocol = String(req?.headers?.["sec-websocket-protocol"] || "");
  const parts = protocol
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const bearerPart = parts.find((part) => part.toLowerCase().startsWith("zaki.jwt."));
  if (!bearerPart) return null;
  return bearerPart.slice("zaki.jwt.".length).trim() || null;
}

export function sanitizeLearningClientPayload(value, { root = false } = {}) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLearningClientPayload(item));
  }
  if (!value || typeof value !== "object") return value;

  const output = {};
  const entries = Object.entries(value);

  for (const [key, nested] of entries) {
    const normalizedKey = String(key);
    if (isOperatorManagedLearningField(normalizedKey)) continue;
    if (root && !LEARNING_WS_ALLOWED_ROOT_FIELDS.has(normalizedKey)) continue;
    output[normalizedKey] = sanitizeLearningClientPayload(nested);
  }
  return output;
}

function normalizeLearningPayloadKey(key) {
  return String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isOperatorManagedLearningField(key) {
  return OPERATOR_MANAGED_LEARNING_FIELDS.has(normalizeLearningPayloadKey(key));
}

export function filterLearningTutorAgentChannelsConfig(channels) {
  if (!channels || typeof channels !== "object" || Array.isArray(channels)) return channels;
  const output = {};
  for (const [key, value] of Object.entries(channels)) {
    const normalizedKey = String(key).trim().toLowerCase();
    if (
      LEARNING_TUTOR_AGENT_CHANNEL_SET.has(normalizedKey) ||
      LEARNING_TUTOR_AGENT_CHANNEL_GLOBAL_KEYS.has(normalizedKey)
    ) {
      output[normalizedKey] = value;
    }
  }
  return output;
}

export function sanitizeLearningTutorAgentPayload(value) {
  const sanitized = sanitizeLearningClientPayload(value);
  if (!sanitized || typeof sanitized !== "object" || Array.isArray(sanitized)) return sanitized;
  if ("channels" in sanitized) {
    return {
      ...sanitized,
      channels: filterLearningTutorAgentChannelsConfig(sanitized.channels),
    };
  }
  return sanitized;
}

export function filterLearningTutorAgentChannelsSchema(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const payload = { ...value };
  const channels = value.channels;
  if (!channels || typeof channels !== "object" || Array.isArray(channels)) {
    return payload;
  }

  const filteredChannels = {};
  for (const key of LEARNING_TUTOR_AGENT_CHANNEL_ALLOWLIST) {
    if (Object.prototype.hasOwnProperty.call(channels, key)) {
      filteredChannels[key] = channels[key];
    }
  }

  return {
    ...payload,
    channels: filteredChannels,
  };
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getDotPath(value, path) {
  let current = value;
  for (const part of String(path || "").split(".").filter(Boolean)) {
    if (!isPlainObject(current)) return undefined;
    current = current[part];
  }
  return current;
}

function setDotPath(value, path, nextValue) {
  const parts = String(path || "").split(".").filter(Boolean);
  if (!parts.length || !isPlainObject(value)) return value;
  let current = value;
  for (const part of parts.slice(0, -1)) {
    if (!isPlainObject(current[part])) current[part] = {};
    current = current[part];
  }
  current[parts[parts.length - 1]] = nextValue;
  return value;
}

function shouldPreserveExistingSecret(nextValue, existingValue) {
  if (existingValue === undefined || existingValue === null || existingValue === "") return false;
  return nextValue === undefined || nextValue === null || nextValue === "" || nextValue === "***";
}

export function mergeLearningTutorAgentChannelSecrets(nextChannels, existingChannels, schemaPayload) {
  const filtered = filterLearningTutorAgentChannelsConfig(nextChannels);
  if (!isPlainObject(filtered) || !isPlainObject(existingChannels)) return filtered;
  const schemaChannels = isPlainObject(schemaPayload?.channels) ? schemaPayload.channels : {};
  const output = {};

  for (const [key, value] of Object.entries(filtered)) {
    if (!LEARNING_TUTOR_AGENT_CHANNEL_SET.has(key) || !isPlainObject(value)) {
      output[key] = value;
      continue;
    }

    const merged = structuredClone(value);
    const existing = isPlainObject(existingChannels[key]) ? existingChannels[key] : {};
    const schema = isPlainObject(schemaChannels[key]) ? schemaChannels[key] : {};
    const secretFields = Array.isArray(schema.secret_fields) ? schema.secret_fields : [];
    for (const secretPath of secretFields) {
      const nextValue = getDotPath(merged, secretPath);
      const existingValue = getDotPath(existing, secretPath);
      if (shouldPreserveExistingSecret(nextValue, existingValue)) {
        setDotPath(merged, secretPath, existingValue);
      }
    }
    output[key] = merged;
  }

  return output;
}

export function sanitizeLearningWsClientMessage(data, isBinary) {
  if (isBinary) return { data, isBinary };
  const text = Buffer.isBuffer(data) ? data.toString("utf8") : String(data || "");
  if (!text.trim()) return { data, isBinary };
  try {
    const payload = JSON.parse(text);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return { data, isBinary };
    }
    return {
      data: JSON.stringify(sanitizeLearningClientPayload(payload, { root: true })),
      isBinary: false,
    };
  } catch {
    return { data, isBinary };
  }
}

export function shouldConsumeLearningWsQuota(data, isBinary) {
  if (isBinary) return true;
  const text = Buffer.isBuffer(data) ? data.toString("utf8") : String(data || "");
  if (!text.trim()) return false;
  try {
    const payload = JSON.parse(text);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
    const type = String(payload.type || "").trim().toLowerCase();
    if (type && LEARNING_WS_QUOTA_FREE_TYPES.has(type)) return false;
    if (type === "start_turn") return true;
    return Boolean(
      payload.content ||
      payload.message ||
      payload.prompt ||
      payload.query
    );
  } catch {
    return text.trim().length > 0;
  }
}

function normalizeLearningRequestPath(value) {
  const raw = String(value || "").trim();
  const path = raw.split("?")[0].split("#")[0] || "";
  return path.startsWith("/") ? path : `/${path}`;
}

export function shouldConsumeLearningIngressQuota(req = {}) {
  const method = String(req.method || "").trim().toUpperCase();
  if (!["POST", "PUT", "PATCH"].includes(method)) return false;

  const path = normalizeLearningRequestPath(req.originalUrl || req.path || req.url);
  const learningPath = path.startsWith("/api/learning")
    ? path.slice("/api/learning".length) || "/"
    : path;

  if (method === "POST") {
    if (learningPath === "/books") return true;
    if (
      [
        "/books/confirm-proposal",
        "/books/confirm-spine",
        "/books/compile-page",
        "/books/regenerate-block",
        "/books/insert-block",
        "/books/change-block-type",
        "/books/deep-dive",
        "/books/supplement",
        "/books/rebuild",
        "/co-writer/edit",
        "/co-writer/edit-react",
        "/co-writer/edit-react/stream",
        "/co-writer/automark",
        "/knowledge/create",
        "/memory/refresh",
        "/notebooks/records",
        "/notebooks/records/with-summary",
        "/vision/analyze",
      ].includes(learningPath)
    ) {
      return true;
    }
    if (/^\/knowledge\/[^/]+\/(?:upload|upload-folder|upload-archive|reindex)$/.test(learningPath)) {
      return true;
    }
    return false;
  }

  return false;
}

export function resolveLearningMaxRequestBytes(env = process.env) {
  const parsed = Number(env?.ZAKI_LEARNING_MAX_REQUEST_BYTES);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_LEARNING_MAX_REQUEST_BYTES;
  return Math.floor(parsed);
}

export function checkLearningContentLength(headers = {}, maxBytes = DEFAULT_LEARNING_MAX_REQUEST_BYTES) {
  const raw = headers["content-length"] ?? headers["Content-Length"];
  if (raw === undefined || raw === null || raw === "") {
    return { allowed: true, contentLength: null, maxBytes };
  }
  const contentLength = Number(raw);
  if (!Number.isFinite(contentLength) || contentLength < 0) {
    return { allowed: false, contentLength: null, maxBytes, reason: "invalid_content_length" };
  }
  if (contentLength > maxBytes) {
    return { allowed: false, contentLength, maxBytes, reason: "request_too_large" };
  }
  return { allowed: true, contentLength, maxBytes };
}

export function createLearningRequestSizeError(maxBytes, contentLength) {
  const error = new Error("Learning request is too large.");
  error.code = "learning_request_too_large";
  error.maxBytes = maxBytes;
  error.contentLength = contentLength;
  return error;
}

export function findLearningRequestSizeError(error) {
  let current = error;
  const seen = new Set();
  while (current && typeof current === "object" && !seen.has(current)) {
    if (current.code === "learning_request_too_large") return current;
    seen.add(current);
    current = current.cause;
  }
  return null;
}

export function createLearningByteLimitTransform(maxBytes, { onLimit } = {}) {
  let total = 0;
  return new Transform({
    transform(chunk, _encoding, callback) {
      total += Buffer.byteLength(chunk);
      if (total > maxBytes) {
        const error = createLearningRequestSizeError(maxBytes, total);
        if (typeof onLimit === "function") onLimit(error);
        callback(error);
        return;
      }
      callback(null, chunk);
    },
  });
}
