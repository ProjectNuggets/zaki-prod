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
  "cookie",
  "host",
  "x-internal-token",
  "x-zaki-user-id",
  "x-webhook-base-url",
]);

const LEARNING_PATH_SAFE_PATTERN = /^\/[A-Za-z0-9/_:.,~@?&=%+\-[\]]*$/;

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
