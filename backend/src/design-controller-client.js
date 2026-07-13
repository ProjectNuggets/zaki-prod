const SESSION_STATES = new Set([
  "REQUESTED",
  "STARTING",
  "RESTORING",
  "READY",
  "ACTIVE",
  "IDLE",
  "DRAINING",
  "CHECKPOINTING",
  "STOPPED",
  "FAILED",
]);
const SESSION_KEYS = new Set(["id", "projectId", "state", "generation", "failureCode"]);
const MAX_JSON_BYTES = 64 * 1024;

export class DesignControllerClientError extends Error {
  constructor(code, message, status = 503) {
    super(message);
    this.name = "DesignControllerClientError";
    this.code = code;
    this.status = status;
  }
}

export class DesignControllerClient {
  constructor({ baseUrl, token, fetchWithTimeout, timeoutMs = 180000 }) {
    this.baseUrl = validControllerOrigin(baseUrl);
    this.token = requiredToken(token);
    if (typeof fetchWithTimeout !== "function") {
      throw new DesignControllerClientError(
        "DESIGN_CONTROLLER_CONFIG_INVALID",
        "Design controller fetch client is required.",
        500
      );
    }
    this.fetchWithTimeout = fetchWithTimeout;
    this.timeoutMs = boundedTimeout(timeoutMs);
  }

  ensure(input) {
    return this.#lifecycleRequest({
      path: "/internal/v1/sessions/ensure",
      label: "Design controller ensure",
      input,
      body: {
        sessionId: input.sessionId,
        projectId: input.projectId,
        userId: input.userId,
        tenantId: input.tenantId,
        desiredGeneration: input.desiredGeneration,
      },
    });
  }

  status(input) {
    return this.#lifecycleRequest({
      path: `/internal/v1/sessions/${encodeURIComponent(input.sessionId)}/status`,
      label: "Design controller status",
      input,
      body: lifecycleBindingBody(input),
    });
  }

  stop(input) {
    return this.#lifecycleRequest({
      path: `/internal/v1/sessions/${encodeURIComponent(input.sessionId)}/stop`,
      label: "Design controller stop",
      input,
      body: lifecycleBindingBody(input),
    });
  }

  async ready() {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/readyz`,
      { method: "GET", redirect: "error" },
      Math.min(this.timeoutMs, 5000),
      "Design controller readiness"
    );
    const payload = await boundedJson(response, Math.min(this.timeoutMs, 5000));
    return {
      ok: response.ok && isRecord(payload) && payload.ok === true,
      upstreamStatus: response.status,
    };
  }

  async proxy(input) {
    const targetPath = validProxyPath(input.targetPath);
    const method = String(input.method || "GET").toUpperCase();
    if (!/^[A-Z]+$/.test(method)) {
      throw new DesignControllerClientError("DESIGN_CONTROLLER_REQUEST_INVALID", "Design proxy method is invalid.", 400);
    }
    const options = {
      method,
      redirect: "error",
      headers: {
        ...allowedProxyHeaders(input.headers || {}),
        authorization: `Bearer ${this.token}`,
        "x-request-id": input.requestId,
        "x-zaki-project-id": input.projectId,
        "x-zaki-user-id": String(input.userId),
        "x-zaki-tenant-id": input.tenantId,
        "x-zaki-design-generation": String(input.expectedGeneration),
      },
    };
    if (input.body !== undefined && !["GET", "HEAD"].includes(method)) {
      options.body = input.body;
      options.duplex = "half";
    }
    return this.fetchWithTimeout(
      `${this.baseUrl}/internal/v1/sessions/${encodeURIComponent(input.sessionId)}/proxy${targetPath}`,
      options,
      this.timeoutMs,
      "Design controller worker proxy"
    );
  }

  async #lifecycleRequest({ path, label, input, body }) {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}${path}`,
      {
        method: "POST",
        redirect: "error",
        headers: {
          authorization: `Bearer ${this.token}`,
          "content-type": "application/json",
          "x-request-id": input.requestId,
        },
        body: JSON.stringify(body),
      },
      this.timeoutMs,
      label
    );
    const payload = await boundedJson(response, this.timeoutMs);
    if (!response.ok) {
      throw new DesignControllerClientError(
        "DESIGN_CONTROLLER_UNAVAILABLE",
        `Design controller returned status ${response.status}.`,
        response.status >= 500 ? 503 : response.status
      );
    }
    if (!validSessionResponse(payload, input)) {
      throw new DesignControllerClientError(
        "DESIGN_CONTROLLER_RESPONSE_INVALID",
        "Design controller returned an invalid session response."
      );
    }
    return payload;
  }
}

function lifecycleBindingBody(input) {
  return {
    projectId: input.projectId,
    userId: input.userId,
    tenantId: input.tenantId,
    expectedGeneration: input.expectedGeneration,
  };
}

function allowedProxyHeaders(input) {
  const allowed = new Set([
    "accept",
    "accept-language",
    "content-type",
    "idempotency-key",
    "if-match",
    "if-none-match",
    "last-event-id",
    "range",
    "x-idempotency-key",
  ]);
  const headers = {};
  for (const [name, value] of Object.entries(input)) {
    const normalized = name.toLowerCase();
    if (allowed.has(normalized) && value !== undefined) {
      headers[normalized] = Array.isArray(value) ? value.join(",") : String(value);
    }
  }
  return headers;
}

function validProxyPath(value) {
  const raw = String(value || "");
  if (!raw.startsWith("/api/") && raw !== "/api") {
    throw new DesignControllerClientError("DESIGN_CONTROLLER_REQUEST_INVALID", "Design proxy path is invalid.", 400);
  }
  try {
    const url = new URL(raw, "http://worker.invalid");
    const segments = url.pathname.split("/").map((segment) => decodeURIComponent(segment));
    if (segments.includes(".") || segments.includes("..")) throw new Error("dot segment");
    return `${url.pathname}${url.search}`;
  } catch {
    throw new DesignControllerClientError("DESIGN_CONTROLLER_REQUEST_INVALID", "Design proxy path is invalid.", 400);
  }
}

async function boundedJson(response, timeoutMs) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BYTES) {
    await response.body?.cancel();
    throw new DesignControllerClientError(
      "DESIGN_CONTROLLER_RESPONSE_INVALID",
      "Design controller response exceeded its limit."
    );
  }
  const raw = await boundedResponseText(response, MAX_JSON_BYTES, timeoutMs);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    throw new DesignControllerClientError(
      "DESIGN_CONTROLLER_RESPONSE_INVALID",
      "Design controller returned invalid JSON."
    );
  }
}

async function boundedResponseText(response, maximumBytes, timeoutMs) {
  if (!response.body) {
    throw new DesignControllerClientError(
      "DESIGN_CONTROLLER_RESPONSE_INVALID",
      "Design controller returned an empty response."
    );
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    void reader.cancel().catch(() => undefined);
  }, timeoutMs);
  if (typeof timer.unref === "function") timer.unref();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximumBytes) {
        await reader.cancel();
        throw new DesignControllerClientError(
          "DESIGN_CONTROLLER_RESPONSE_INVALID",
          "Design controller response exceeded its limit."
        );
      }
      text += decoder.decode(value, { stream: true });
    }
    if (timedOut) {
      throw new DesignControllerClientError(
        "DESIGN_CONTROLLER_UNAVAILABLE",
        "Design controller response body timed out."
      );
    }
    return text + decoder.decode();
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}

function validSessionResponse(value, input) {
  if (!isRecord(value) || !isRecord(value.session)) return false;
  if (Object.keys(value).some((key) => !["session", "retryAfterMs"].includes(key))) return false;
  if (Object.keys(value.session).some((key) => !SESSION_KEYS.has(key))) return false;
  const session = value.session;
  if (session.id !== input.sessionId || session.projectId !== input.projectId) return false;
  if (!SESSION_STATES.has(session.state)) return false;
  if (!Number.isSafeInteger(session.generation) || session.generation < 0) return false;
  if (session.failureCode !== undefined && typeof session.failureCode !== "string") return false;
  if (
    value.retryAfterMs !== undefined &&
    (!Number.isSafeInteger(value.retryAfterMs) || value.retryAfterMs < 0 || value.retryAfterMs > 30000)
  ) return false;
  return true;
}

function validControllerOrigin(value) {
  try {
    const url = new URL(String(value || ""));
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) throw new Error("invalid origin");
    return url.origin;
  } catch {
    throw new DesignControllerClientError(
      "DESIGN_CONTROLLER_CONFIG_INVALID",
      "Design controller URL is invalid.",
      500
    );
  }
}

function requiredToken(value) {
  const token = String(value || "").trim();
  if (token.length < 16 || token.length > 4096) {
    throw new DesignControllerClientError(
      "DESIGN_CONTROLLER_CONFIG_INVALID",
      "Design controller token is invalid.",
      500
    );
  }
  return token;
}

function boundedTimeout(value) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1000 || parsed > 180000) {
    throw new DesignControllerClientError(
      "DESIGN_CONTROLLER_CONFIG_INVALID",
      "Design controller timeout is invalid.",
      500
    );
  }
  return parsed;
}

function isRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}
