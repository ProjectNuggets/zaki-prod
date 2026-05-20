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
  "x-zaki-account-id",
  "x-zaki-user-id",
]);

const HIRE_PATH_SAFE_PATTERN = /^\/[A-Za-z0-9/_:.,~@?&=%+\-[\]]*$/;
const HIRE_THINK_BLOCK_PATTERN = /<think\b[^>]*>[\s\S]*?<\/think>/gi;
const HIRE_UNCLOSED_THINK_PATTERN = /<think\b[^>]*>[\s\S]*$/gi;
const HIRE_UPSTREAM_BRAND_PATTERN = /\bJust\s*Hire\s*Me\b|\bJustHireMe\b|\bjusthireme\b/gi;
const OPERATOR_MANAGED_HIRE_FIELDS = new Set([
  "apikey",
  "apitoken",
  "baseurl",
  "credential",
  "credentials",
  "internaltoken",
  "llmprovider",
  "model",
  "modelid",
  "modelname",
  "objectkey",
  "password",
  "provider",
  "providerconfig",
  "providerid",
  "providersettings",
  "secret",
  "secrets",
  "sourcecredentials",
  "storagekey",
  "token",
]);
const HIRE_ARTIFACT_REF_FIELDS = new Set([
  "asset",
  "assetpath",
  "coverletterasset",
  "coverletterpath",
  "resumeasset",
]);

export function isHireEnabled(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

export function getHireBase(rawBaseUrl) {
  const normalized = String(rawBaseUrl || "").trim().replace(/\/+$/, "");
  return normalized || null;
}

export function resolveCanonicalHireUserId(authResult) {
  const rawId = authResult?.zakiUser?.id;
  const parsed = Number(rawId);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return String(parsed);
}

export function buildHireForwardHeaders({
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
  const normalizedInternalToken = String(internalToken || "").trim();

  const headers = {
    Authorization: normalizedInternalToken ? `Bearer ${normalizedInternalToken}` : "",
    "X-Internal-Token": normalizedInternalToken,
    "X-Zaki-User-Id": normalizedUserId,
    "X-Request-Id": String(requestId || "").trim(),
    ...extraHeaders,
  };
  if (contentType) {
    headers["Content-Type"] = contentType;
  }
  return headers;
}

export function buildHireProxyHeaders(req, {
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
  return buildHireForwardHeaders({
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

export function sanitizeHirePath(path) {
  const raw = String(path || "");
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) || raw.startsWith("//")) {
    throw new Error("invalid_hire_path");
  }
  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  if (!HIRE_PATH_SAFE_PATTERN.test(normalized)) {
    throw new Error("invalid_hire_path");
  }
  if (normalized.includes("\r") || normalized.includes("\n")) {
    throw new Error("invalid_hire_path");
  }
  return normalized;
}

export function buildHireDisabledPayload(requestId) {
  return {
    code: "hire_disabled",
    error: "Hire is not enabled.",
    message: "Hire is not enabled for this environment.",
    requestId,
  };
}

export function buildHireConfigErrorPayload(message, requestId) {
  return {
    code: "hire_config_missing",
    error: message,
    message,
    requestId,
  };
}

export function mapHireUpstreamFailure(statusCode, requestId) {
  if (statusCode === 401 || statusCode === 403) {
    return {
      status: 502,
      body: {
        code: "hire_upstream_auth_failed",
        error: "Hire upstream authentication failed.",
        message: "Hire is temporarily unavailable.",
        requestId,
      },
    };
  }
  if (statusCode === 404) {
    return {
      status: 404,
      body: {
        code: "hire_resource_not_found",
        error: "Hire resource not found.",
        message: "Hire resource not found.",
        requestId,
      },
    };
  }
  if (statusCode === 409) {
    return {
      status: 409,
      body: {
        code: "hire_conflict",
        error: "Hire request conflict.",
        message: "Hire is handling a conflicting request. Try again shortly.",
        requestId,
      },
    };
  }
  if (statusCode === 413) {
    return {
      status: 413,
      body: {
        code: "hire_request_too_large",
        error: "Hire request is too large.",
        message: "The Hire request is larger than the allowed limit.",
        requestId,
      },
    };
  }
  if (statusCode === 503) {
    return {
      status: 503,
      body: {
        code: "hire_unavailable",
        error: "Hire is unavailable.",
        message: "Hire is temporarily unavailable.",
        retryable: true,
        requestId,
      },
    };
  }
  if (statusCode >= 500) {
    return {
      status: 502,
      body: {
        code: "hire_upstream_failed",
        error: "Hire upstream failed.",
        message: "Hire is temporarily unavailable.",
        retryable: true,
        requestId,
      },
    };
  }
  return null;
}

export function sanitizeHireClientPayload(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeHireClientPayload(item));
  }
  if (!value || typeof value !== "object") return value;

  const output = {};
  for (const [key, nested] of Object.entries(value)) {
    if (isOperatorManagedHireField(key)) continue;
    output[key] = sanitizeHireClientPayload(nested);
  }
  return output;
}

export function sanitizeHireProviderText(value) {
  const text = String(value || "");
  if (!text) return text;
  return text
    .replace(HIRE_THINK_BLOCK_PATTERN, "")
    .replace(HIRE_UNCLOSED_THINK_PATTERN, "")
    .replace(HIRE_UPSTREAM_BRAND_PATTERN, "ZAKI Hire")
    .trim();
}

export function sanitizeHireUpstreamPayload(value, key = "") {
  if (typeof value === "string") {
    return sanitizeHireArtifactRef(key, sanitizeHireProviderText(value));
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeHireUpstreamPayload(item));
  }
  if (!value || typeof value !== "object") return value;

  const output = {};
  for (const [field, nested] of Object.entries(value)) {
    if (isOperatorManagedHireField(field)) continue;
    output[field] = sanitizeHireUpstreamPayload(nested, field);
  }
  return output;
}

function sanitizeHireArtifactRef(key, value) {
  const normalizedKey = normalizeHirePayloadKey(key);
  if (!HIRE_ARTIFACT_REF_FIELDS.has(normalizedKey)) return value;
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.includes("/") || text.includes("\\") || text.startsWith("~") || /^[a-z]:/i.test(text)) {
    return "";
  }
  if (text.length > 240) return "";
  return text;
}

function normalizeHirePayloadKey(key) {
  return String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isOperatorManagedHireField(key) {
  const normalized = normalizeHirePayloadKey(key);
  return (
    OPERATOR_MANAGED_HIRE_FIELDS.has(normalized) ||
    normalized.endsWith("apikey") ||
    normalized.endsWith("apitoken") ||
    normalized.endsWith("credential") ||
    normalized.endsWith("credentials") ||
    normalized.endsWith("password") ||
    normalized.endsWith("secret") ||
    normalized.endsWith("token")
  );
}
