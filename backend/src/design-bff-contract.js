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
  "x-zaki-product-id",
]);

const DESIGN_PATH_SAFE_PATTERN = /^\/[A-Za-z0-9/_:.,~@?&=%+\-[\]]*$/;
const DESIGN_MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const DESIGN_PRIVATE_RESPONSE_KEYS = new Set([
  "baseDir",
  "originalBaseDir",
  "resolvedDir",
  "fromTrustedPicker",
]);
const DESIGN_HOSTED_BLOCKED_PATHS = [
  { pattern: /^\/api\/dialog\//, reason: "native host dialogs are not available in hosted design" },
  { pattern: /^\/api\/import\/folder(?:\/|$)/, reason: "local folder import is not available in hosted design" },
  { pattern: /^\/api\/plugins\/upload-folder(?:\/|$)/, reason: "local plugin folder upload is not available in hosted design" },
  { pattern: /^\/api\/projects\/[^/]+\/working-dir(?:\/|$)/, reason: "local working directory changes are not available in hosted design" },
  { pattern: /^\/api\/projects\/[^/]+\/open-in(?:\/|$)/, reason: "host application launching is not available in hosted design" },
  { pattern: /^\/api\/projects\/[^/]+\/plugins\/install-folder(?:\/|$)/, reason: "local plugin folder install is not available in hosted design" },
];

export function isDesignEnabled(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

export function getDesignBase(rawBaseUrl) {
  const normalized = String(rawBaseUrl || "").trim().replace(/\/+$/, "");
  return normalized || null;
}

export function resolveCanonicalDesignUserId(authResult) {
  const rawId = authResult?.zakiUser?.id;
  const parsed = Number(rawId);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return String(parsed);
}

export function buildDesignForwardHeaders({
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
    "X-Zaki-Product-Id": "design",
    "X-Request-Id": String(requestId || "").trim(),
    ...extraHeaders,
  };
  if (contentType) {
    headers["Content-Type"] = contentType;
  }
  return headers;
}

export function sanitizeDesignPath(path) {
  const raw = String(path || "");
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) || raw.startsWith("//")) {
    throw new Error("invalid_design_path");
  }
  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  if (!DESIGN_PATH_SAFE_PATTERN.test(normalized)) {
    throw new Error("invalid_design_path");
  }
  if (normalized.includes("\r") || normalized.includes("\n")) {
    throw new Error("invalid_design_path");
  }
  return normalized;
}

export function buildDesignProxyHeaders(req, {
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
  return buildDesignForwardHeaders({
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

export function buildDesignDisabledPayload(requestId) {
  return {
    code: "design_disabled",
    error: "Design is not enabled.",
    message: "Design is not enabled for this environment.",
    requestId,
  };
}

export function buildDesignConfigErrorPayload(message, requestId) {
  return {
    code: "design_config_missing",
    error: "Design engine is not configured.",
    message,
    requestId,
  };
}

export function mapDesignUpstreamFailure(status, requestId) {
  if (status === 401 || status === 403) {
    return {
      status: 503,
      body: {
        code: "design_upstream_auth_failed",
        error: "Design is unavailable.",
        message: "Design engine authentication failed.",
        requestId,
      },
    };
  }
  return null;
}

export function getBlockedHostedDesignPathReason(path) {
  const normalized = String(path || "").split("?")[0];
  const blocked = DESIGN_HOSTED_BLOCKED_PATHS.find((entry) => entry.pattern.test(normalized));
  return blocked?.reason || null;
}

export function sanitizeDesignClientPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const clean = { ...value };
  delete clean.baseDir;
  delete clean.originalBaseDir;
  delete clean.fromTrustedPicker;
  delete clean.resolvedDir;
  return clean;
}

export function prepareDesignClientPayload({
  method,
  path,
  payload,
  generateProjectId,
}) {
  const clean = sanitizeDesignClientPayload(payload);
  if (!clean || typeof clean !== "object" || Array.isArray(clean)) return clean;
  const normalizedMethod = String(method || "GET").toUpperCase();
  const normalizedPath = String(path || "").split("?")[0];
  if (normalizedMethod === "POST" && normalizedPath === "/api/projects") {
    return {
      ...clean,
      id: typeof generateProjectId === "function" ? generateProjectId() : clean.id,
    };
  }
  return clean;
}

export function sanitizeDesignUpstreamPayload(value) {
  if (Array.isArray(value)) return value.map((item) => sanitizeDesignUpstreamPayload(item));
  if (!value || typeof value !== "object") return value;
  const clean = {};
  for (const [key, child] of Object.entries(value)) {
    if (DESIGN_PRIVATE_RESPONSE_KEYS.has(key)) continue;
    clean[key] = sanitizeDesignUpstreamPayload(child);
  }
  return clean;
}

export function classifyDesignMeterActionForIngress(req) {
  const method = String(req?.method || "GET").toUpperCase();
  if (!DESIGN_MUTATION_METHODS.has(method)) return null;
  const path = String(req?.originalUrl || req?.url || "").split("?")[0];
  if (method === "POST" && path === "/api/design/projects") return "design_project_create";
  if (path.includes("/chat") || path.includes("/runs")) return "design_generation";
  if (path.includes("/upload") || path.includes("/files")) return "design_file_write";
  return "design_request";
}

export function estimateDesignMeterUnitsForIngress(req, action) {
  const contentLength = Number(req?.headers?.["content-length"] || 0) || 0;
  const storageUnits = contentLength > 0 ? Math.max(0.1, contentLength / (1024 * 1024)) : 0;
  if (action === "design_generation") return 3 + storageUnits;
  if (action === "design_project_create") return 1;
  if (action === "design_file_write") return 1 + storageUnits;
  return 1 + storageUnits;
}
