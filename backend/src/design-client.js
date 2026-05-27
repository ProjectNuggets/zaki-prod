import {
  buildDesignForwardHeaders,
  buildDesignProxyHeaders,
  getDesignBase,
  sanitizeDesignPath,
} from "./design-bff-contract.js";

function assertBaseAndToken(baseUrl, internalToken) {
  const resolvedBase = getDesignBase(baseUrl);
  if (!resolvedBase) {
    throw new Error("DESIGN_ENGINE_BASE_URL is not configured.");
  }
  const resolvedToken = String(internalToken || "").trim();
  if (!resolvedToken) {
    throw new Error("DESIGN_ENGINE_INTERNAL_TOKEN is not configured.");
  }
  return { resolvedBase, resolvedToken };
}

export async function fetchDesignPath({
  baseUrl,
  internalToken,
  userId,
  requestId,
  path,
  method = "GET",
  body,
  fetchWithTimeout,
  timeoutMs,
  label = "Design upstream request",
  contentType = "application/json",
  extraHeaders = {},
}) {
  const { resolvedBase, resolvedToken } = assertBaseAndToken(baseUrl, internalToken);
  const normalizedPath = sanitizeDesignPath(path);
  const options = {
    method,
    headers: buildDesignForwardHeaders({
      internalToken: resolvedToken,
      userId,
      requestId,
      contentType,
      extraHeaders,
    }),
  };
  if (body !== undefined) {
    options.body = typeof body === "string" || body instanceof Uint8Array ? body : JSON.stringify(body);
  }
  return fetchWithTimeout(`${resolvedBase}${normalizedPath}`, options, timeoutMs, label);
}

export async function fetchDesignProxyPath({
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
  label = "Design upstream proxy request",
  extraHeaders = {},
}) {
  const { resolvedBase, resolvedToken } = assertBaseAndToken(baseUrl, internalToken);
  const normalizedPath = sanitizeDesignPath(path);
  const contentType = req?.headers?.["content-type"]
    ? String(req.headers["content-type"])
    : null;
  const options = {
    method,
    headers: buildDesignProxyHeaders(req, {
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

export async function probeDesignReady(options) {
  return fetchDesignPath({
    ...options,
    path: "/readyz",
    method: "GET",
    label: options.label || "Design ready probe",
  });
}

export { getDesignBase };
