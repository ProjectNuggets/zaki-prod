import {
  buildHireForwardHeaders,
  buildHireProxyHeaders,
  getHireBase,
  sanitizeHirePath,
} from "./hire-bff-contract.js";

function assertBaseAndToken(baseUrl, internalToken) {
  const resolvedBase = getHireBase(baseUrl);
  if (!resolvedBase) {
    throw new Error("HIRE_ENGINE_BASE_URL is not configured.");
  }
  const resolvedToken = String(internalToken || "").trim();
  if (!resolvedToken) {
    throw new Error("HIRE_ENGINE_INTERNAL_TOKEN is not configured.");
  }
  return { resolvedBase, resolvedToken };
}

export async function fetchHirePath({
  baseUrl,
  internalToken,
  userId,
  requestId,
  path,
  method = "GET",
  body,
  fetchWithTimeout,
  timeoutMs,
  label = "Hire upstream request",
  contentType = "application/json",
  extraHeaders = {},
}) {
  const { resolvedBase, resolvedToken } = assertBaseAndToken(baseUrl, internalToken);
  const normalizedPath = sanitizeHirePath(path);
  const headers = buildHireForwardHeaders({
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
    if (
      body &&
      typeof body === "object" &&
      (typeof body.pipe === "function" || typeof body[Symbol.asyncIterator] === "function")
    ) {
      options.body = body;
      options.duplex = "half";
    } else {
      options.body = typeof body === "string" || body instanceof Uint8Array ? body : JSON.stringify(body);
    }
  }
  return fetchWithTimeout(`${resolvedBase}${normalizedPath}`, options, timeoutMs, label);
}

export async function fetchHireProxyPath({
  baseUrl,
  internalToken,
  userId,
  requestId,
  path,
  req,
  body = req,
  method = req?.method || "GET",
  fetchWithTimeout,
  timeoutMs,
  label = "Hire upstream proxy request",
  extraHeaders = {},
}) {
  const { resolvedBase, resolvedToken } = assertBaseAndToken(baseUrl, internalToken);
  const normalizedPath = sanitizeHirePath(path);
  const contentType = req?.headers?.["content-type"]
    ? String(req.headers["content-type"])
    : null;
  const options = {
    method,
    headers: buildHireProxyHeaders(req, {
      internalToken: resolvedToken,
      userId,
      requestId,
      contentType,
      extraHeaders,
    }),
  };
  if (!["GET", "HEAD"].includes(String(method).toUpperCase())) {
    options.body = body;
    options.duplex = "half";
  }
  return fetchWithTimeout(`${resolvedBase}${normalizedPath}`, options, timeoutMs, label);
}

export async function probeHireHealth(options) {
  return fetchHirePath({
    ...options,
    path: "/health",
    method: "GET",
    label: options.label || "Hire health probe",
  });
}

export async function fetchHireDeploymentReadiness(options) {
  return fetchHirePath({
    ...options,
    path: "/internal/v1/deployment-readiness",
    method: "GET",
    label: options.label || "Hire deployment readiness request",
  });
}

export { getHireBase };
