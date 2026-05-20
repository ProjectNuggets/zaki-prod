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
  "accept-encoding",
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
const HIRE_ROUTE_SEGMENT = "[^/?#]+";
const HIRE_USER_ROUTE_ALLOWLIST = Object.freeze([
  { methods: ["GET"], pattern: /^\/events$/ },
  { methods: ["GET"], pattern: /^\/followups\/due$/ },
  { methods: ["GET"], pattern: /^\/graph$/ },
  { methods: ["GET", "POST"], pattern: /^\/template$/ },
  { methods: ["POST"], pattern: /^\/help\/chat$/ },
  { methods: ["POST"], pattern: /^\/errors$/ },
  { methods: ["GET"], pattern: /^\/identity$/ },
  { methods: ["GET"], pattern: /^\/leads$/ },
  { methods: ["GET"], pattern: /^\/leads\/export\.csv$/ },
  {
    methods: ["GET", "DELETE"],
    pattern: new RegExp(`^/leads/${HIRE_ROUTE_SEGMENT}$`),
  },
  {
    methods: ["GET"],
    pattern: new RegExp(`^/leads/${HIRE_ROUTE_SEGMENT}/(?:versions|pdf)$`),
  },
  {
    methods: ["PUT"],
    pattern: new RegExp(`^/leads/${HIRE_ROUTE_SEGMENT}/(?:status|feedback|followup)$`),
  },
  { methods: ["POST"], pattern: /^\/leads\/manual$/ },
  { methods: ["POST"], pattern: /^\/leads\/manual\/generate\/start$/ },
  {
    methods: ["POST"],
    pattern: new RegExp(`^/leads/${HIRE_ROUTE_SEGMENT}/(?:generate|generate/start|pipeline/run|form/read|apply/preview)$`),
  },
  { methods: ["GET"], pattern: /^\/profile$/ },
  { methods: ["PUT"], pattern: /^\/profile\/(?:candidate|identity)$/ },
  {
    methods: ["POST"],
    pattern: /^\/profile\/(?:skill|experience|project|education|certification|achievement)$/,
  },
  {
    methods: ["PUT"],
    pattern: new RegExp(`^/profile/(?:skill|experience|project)/${HIRE_ROUTE_SEGMENT}$`),
  },
  {
    methods: ["DELETE"],
    pattern: /^\/profile\/(?:skill|experience|project|education|certification|achievement)\/.+$/,
  },
  { methods: ["POST"], pattern: /^\/ingest$/ },
  {
    methods: ["POST"],
    pattern: /^\/ingest\/(?:linkedin|github|profile|portfolio)$/,
  },
  { methods: ["GET"], pattern: /^\/ingest\/profile\/template$/ },
  { methods: ["POST"], pattern: /^\/scan$/ },
  { methods: ["POST"], pattern: /^\/scan\/stop$/ },
  { methods: ["GET"], pattern: /^\/status$/ },
  { methods: ["POST"], pattern: /^\/leads\/reevaluate$/ },
  { methods: ["POST"], pattern: /^\/leads\/reevaluate\/stop$/ },
  { methods: ["POST"], pattern: /^\/leads\/cleanup$/ },
  { methods: ["POST"], pattern: /^\/free-sources\/scan$/ },
  { methods: ["POST"], pattern: new RegExp(`^/fire/${HIRE_ROUTE_SEGMENT}$`) },
  { methods: ["POST"], pattern: /^\/selectors\/refresh$/ },
]);
const HIRE_QUOTA_ROUTE_ALLOWLIST = Object.freeze([
  { methods: ["POST"], pattern: /^\/help\/chat$/, action: "help_chat", routeTemplate: "/api/hire/help/chat" },
  { methods: ["POST"], pattern: /^\/leads\/manual$/, action: "manual_lead", routeTemplate: "/api/hire/leads/manual" },
  {
    methods: ["POST"],
    pattern: /^\/leads\/manual\/generate\/start$/,
    action: "manual_lead_generation",
    routeTemplate: "/api/hire/leads/manual/generate/start",
  },
  {
    methods: ["POST"],
    pattern: new RegExp(`^/leads/${HIRE_ROUTE_SEGMENT}/generate$`),
    action: "generated_package",
    routeTemplate: "/api/hire/leads/:leadId/generate",
  },
  {
    methods: ["POST"],
    pattern: new RegExp(`^/leads/${HIRE_ROUTE_SEGMENT}/generate/start$`),
    action: "generated_package_task",
    routeTemplate: "/api/hire/leads/:leadId/generate/start",
  },
  {
    methods: ["POST"],
    pattern: new RegExp(`^/leads/${HIRE_ROUTE_SEGMENT}/pipeline/run$`),
    action: "pipeline_run",
    routeTemplate: "/api/hire/leads/:leadId/pipeline/run",
  },
  {
    methods: ["POST"],
    pattern: new RegExp(`^/leads/${HIRE_ROUTE_SEGMENT}/form/read$`),
    action: "form_read",
    routeTemplate: "/api/hire/leads/:leadId/form/read",
  },
  {
    methods: ["POST"],
    pattern: new RegExp(`^/leads/${HIRE_ROUTE_SEGMENT}/apply/preview$`),
    action: "apply_preview",
    routeTemplate: "/api/hire/leads/:leadId/apply/preview",
  },
  { methods: ["POST"], pattern: /^\/ingest$/, action: "resume_ingest", routeTemplate: "/api/hire/ingest" },
  {
    methods: ["POST"],
    pattern: /^\/ingest\/linkedin$/,
    action: "linkedin_ingest",
    routeTemplate: "/api/hire/ingest/linkedin",
  },
  {
    methods: ["POST"],
    pattern: /^\/ingest\/github$/,
    action: "github_ingest",
    routeTemplate: "/api/hire/ingest/github",
  },
  {
    methods: ["POST"],
    pattern: /^\/ingest\/portfolio$/,
    action: "portfolio_ingest",
    routeTemplate: "/api/hire/ingest/portfolio",
  },
  { methods: ["POST"], pattern: /^\/scan$/, action: "source_scan", routeTemplate: "/api/hire/scan" },
  {
    methods: ["POST"],
    pattern: /^\/leads\/reevaluate$/,
    action: "lead_reevaluation",
    routeTemplate: "/api/hire/leads/reevaluate",
  },
  {
    methods: ["POST"],
    pattern: /^\/free-sources\/scan$/,
    action: "free_source_scan",
    routeTemplate: "/api/hire/free-sources/scan",
  },
  {
    methods: ["POST"],
    pattern: new RegExp(`^/fire/${HIRE_ROUTE_SEGMENT}$`),
    action: "auto_apply",
    routeTemplate: "/api/hire/fire/:leadId",
  },
  {
    methods: ["POST"],
    pattern: /^\/selectors\/refresh$/,
    action: "automation_selectors_refresh",
    routeTemplate: "/api/hire/selectors/refresh",
  },
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

export function buildHireRouteUnavailablePayload(requestId) {
  return {
    code: "hire_route_unavailable",
    error: "Hire route is unavailable.",
    message: "This Hire route is not available through ZAKI.",
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

export function isHireUserFacingPath(req = {}) {
  const method = normalizeHireRequestMethod(req);
  const path = normalizeHireRequestPath(req.originalUrl || req.path || req.url || req);
  return HIRE_USER_ROUTE_ALLOWLIST.some((entry) =>
    entry.methods.includes(method) && entry.pattern.test(path)
  );
}

export function shouldConsumeHireIngressQuota(req = {}) {
  return Boolean(classifyHireIngressUsageEvent(req));
}

export function classifyHireIngressUsageEvent(req = {}) {
  const method = normalizeHireRequestMethod(req);
  const path = normalizeHireRequestPath(req.originalUrl || req.path || req.url || req);
  const entry = HIRE_QUOTA_ROUTE_ALLOWLIST.find((candidate) =>
    candidate.methods.includes(method) && candidate.pattern.test(path)
  );
  if (!entry) return null;
  return {
    action: entry.action,
    routeTemplate: entry.routeTemplate,
    method,
  };
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

function normalizeHireRequestMethod(req = {}) {
  return String(req?.method || "GET").trim().toUpperCase();
}

function normalizeHireRequestPath(value) {
  const raw = String(value || "").trim().split("?")[0].split("#")[0] || "/";
  let path = raw.startsWith("/") ? raw : `/${raw}`;
  if (path.startsWith("/api/hire")) {
    path = path.slice("/api/hire".length) || "/";
  }
  if (path.startsWith("/api/v1")) {
    path = path.slice("/api/v1".length) || "/";
  }
  return path.replace(/\/+$/, "") || "/";
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
