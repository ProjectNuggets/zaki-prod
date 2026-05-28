// Session-scoped BFF proxy routes — declarative source of truth so the wiring in
// index.js stays in lockstep with what the frontend (src/lib/api.ts) calls. Each
// entry maps a `/api/agent/sessions/:sessionKey/...` surface to the equivalent
// nullalis `/api/v1/users/${userId}/sessions/${sessionKey}/...` upstream path.
//
// - method:         HTTP verb registered on express.
// - path:           BFF path (browser-facing).
// - upstreamSuffix: appended to `/api/v1/users/${userId}/sessions/${sessionKey}`
//                   to build the nullalis target. Empty string is valid.
// - json:           when true, `agentJson1mb` is inserted before the proxy
//                   handler so `req.body` is parsed for forwarding.
export const AGENT_SESSION_BFF_ROUTES = Object.freeze([
  { method: "get",    path: "/api/agent/sessions/:sessionKey",          upstreamSuffix: "",         json: false },
  { method: "delete", path: "/api/agent/sessions/:sessionKey",          upstreamSuffix: "",         json: false },
  { method: "post",   path: "/api/agent/sessions/:sessionKey/compact",  upstreamSuffix: "/compact", json: false },
  { method: "get",    path: "/api/agent/sessions/:sessionKey/context",  upstreamSuffix: "/context", json: false },
  { method: "get",    path: "/api/agent/sessions/:sessionKey/export",   upstreamSuffix: "/export",  json: false },
  { method: "get",    path: "/api/agent/sessions/:sessionKey/history",  upstreamSuffix: "/history", json: false },
  { method: "post",   path: "/api/agent/sessions/:sessionKey/approve",  upstreamSuffix: "/approve", json: true  },
]);

export const BOT_BFF_ALIAS_ROUTES = Object.freeze([
  { method: "post", path: "/v1/me/bot/provision" },
  { method: "get", path: "/v1/me/bot/onboarding" },
  { method: "put", path: "/v1/me/bot/onboarding" },
  { method: "post", path: "/v1/me/bot/chat/stream" },
  { method: "get", path: "/v1/me/bot/settings" },
  { method: "patch", path: "/v1/me/bot/settings" },
  { method: "get", path: "/v1/me/bot/heartbeat" },
  { method: "put", path: "/v1/me/bot/heartbeat" },
  { method: "post", path: "/v1/me/bot/telegram/connect" },
  { method: "post", path: "/v1/me/bot/telegram/disconnect" },
  { method: "get", path: "/v1/me/bot/usage" },
]);

export const BOT_CHAT_STREAM_SESSION_KEY_CONTRACT = Object.freeze({
  surfaces: Object.freeze(["/api/agent/chat/stream", "/v1/me/bot/chat/stream"]),
  upstreamPath: "/api/v1/chat/stream",
  ownership: "server_auth_bound",
  defaultLane: "thread:<threadId|main>",
  supportedOverrideLanes: Object.freeze(["main", "thread:<id>", "task:<id>", "cron:<id>"]),
});

export const AGENT_RUNTIME_FACADE_ROUTES = Object.freeze([
  { method: "get", path: "/api/agent/diagnostics/context" },
  { method: "get", path: "/api/agent/diagnostics/memory-doctor" },
  { method: "get", path: "/api/agent/tasks" },
  { method: "get", path: "/api/agent/tasks/:taskId" },
  { method: "post", path: "/api/agent/tasks/:taskId/stop" },
  { method: "get", path: "/api/agent/jobs" },
  { method: "get", path: "/api/agent/traces" },
  { method: "get", path: "/api/agent/traces/:runId" },
  { method: "post", path: "/api/agent/traces/:runId/share" },
  { method: "delete", path: "/api/agent/traces/:runId/share" },
  { method: "get", path: "/api/agent/artifacts" },
  { method: "get", path: "/api/agent/artifacts/:artifactId" },
  { method: "put", path: "/api/agent/artifacts/:artifactId" },
  { method: "get", path: "/api/agent/artifacts/:artifactId/history" },
  { method: "get", path: "/api/agent/artifacts/:artifactId/diff/:fromVersion/:toVersion" },
  { method: "post", path: "/api/agent/artifacts/:artifactId/share" },
  { method: "delete", path: "/api/agent/artifacts/:artifactId/share" },
  { method: "post", path: "/api/agent/artifacts/:artifactId/export" },
  { method: "get", path: "/api/agent/brain/documents" },
]);

export function buildBotProvisionPayload(userId, payload = {}) {
  return {
    ...(payload && typeof payload === "object" ? payload : {}),
    user_id: String(userId || "").trim(),
  };
}

function normalizeErrorText(payload) {
  if (!payload || typeof payload !== "object") return "";
  return [payload.code, payload.error, payload.message, payload.detail]
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join(" ");
}

function detectDisconnectErrorCode(text = "", statusCode = 0) {
  const normalized = String(text || "").trim().toLowerCase();
  if (!normalized && Number(statusCode) === 404) return "not_connected";
  if (
    /invalid[_\s-]*token|token[_\s-]*invalid|unauthorized|forbidden|401\b/.test(normalized)
  ) {
    return "invalid_token";
  }
  if (/webhook/.test(normalized) && /(reject|rejected|refused|failed|invalid)/.test(normalized)) {
    return "webhook_rejected";
  }
  if (/secret/.test(normalized) && /(mismatch|invalid|wrong|expected)/.test(normalized)) {
    return "secret_mismatch";
  }
  if (
    /not[_\s-]*connected|not connected|no active telegram|no telegram connection|already disconnected|404\b/.test(
      normalized
    )
  ) {
    return "not_connected";
  }
  return null;
}

function defaultDisconnectMessage(code) {
  switch (code) {
    case "invalid_token":
      return "Telegram token is invalid.";
    case "webhook_rejected":
      return "Telegram rejected the webhook disconnect request.";
    case "secret_mismatch":
      return "Telegram webhook secret does not match.";
    case "not_connected":
      return "Telegram is not connected.";
    default:
      return "Telegram disconnect failed.";
  }
}

export function normalizeTelegramDisconnectErrorPayload(payload, statusCode = 0) {
  const code = detectDisconnectErrorCode(normalizeErrorText(payload), statusCode);
  if (!code) {
    return payload;
  }

  const message =
    String(
      payload?.message || payload?.error || payload?.detail || defaultDisconnectMessage(code)
    ).trim() || defaultDisconnectMessage(code);

  return {
    ...(payload && typeof payload === "object" ? payload : {}),
    code,
    error: message,
    message,
  };
}

export function registerBotBffAliases(app, handlers) {
  const {
    requireAgentContext,
    json1mb,
    json10mb,
    provisionHandler,
    onboardingGetHandler,
    onboardingPutHandler,
    chatStreamHandler,
    settingsGetHandler,
    settingsPatchHandler,
    heartbeatGetHandler,
    heartbeatPutHandler,
    telegramConnectHandler,
    telegramDisconnectHandler,
    usageHandler,
  } = handlers;

  app.post(
    "/v1/me/bot/provision",
    requireAgentContext,
    json1mb,
    provisionHandler
  );
  app.get("/v1/me/bot/onboarding", requireAgentContext, onboardingGetHandler);
  app.put(
    "/v1/me/bot/onboarding",
    requireAgentContext,
    json1mb,
    onboardingPutHandler
  );
  app.post(
    "/v1/me/bot/chat/stream",
    requireAgentContext,
    json10mb,
    chatStreamHandler
  );
  app.get("/v1/me/bot/settings", requireAgentContext, settingsGetHandler);
  app.patch(
    "/v1/me/bot/settings",
    requireAgentContext,
    json1mb,
    settingsPatchHandler
  );
  app.get("/v1/me/bot/heartbeat", requireAgentContext, heartbeatGetHandler);
  app.put(
    "/v1/me/bot/heartbeat",
    requireAgentContext,
    json1mb,
    heartbeatPutHandler
  );
  app.post(
    "/v1/me/bot/telegram/connect",
    requireAgentContext,
    json1mb,
    telegramConnectHandler
  );
  app.post(
    "/v1/me/bot/telegram/disconnect",
    requireAgentContext,
    telegramDisconnectHandler
  );
  app.get("/v1/me/bot/usage", requireAgentContext, usageHandler);
}

// Registers every `/api/agent/sessions/:sessionKey/...` proxy entry from
// `AGENT_SESSION_BFF_ROUTES` on the express app. Keeping registration here lets
// the contract test cover wiring directly and prevents drift between the
// listing the frontend depends on (`src/lib/api.ts`) and what the BFF wires up.
//
// `handlers.makeSessionProxyHandler(pathBuilder)` must return an express
// handler that proxies the request to the nullalis path built by
// `pathBuilder(userId, req)`. `agentJson1mb` is the JSON body parser; it is
// applied only for routes that opt in via `json: true`.
export function registerAgentSessionBffRoutes(app, handlers) {
  const { requireAgentContext, agentJson1mb, makeSessionProxyHandler } = handlers;
  for (const route of AGENT_SESSION_BFF_ROUTES) {
    const proxyHandler = makeSessionProxyHandler(
      (userId, req) =>
        `/api/v1/users/${encodeURIComponent(userId)}/sessions/${req.params.sessionKey}${route.upstreamSuffix}`
    );
    const middlewares = [requireAgentContext];
    if (route.json) middlewares.push(agentJson1mb);
    middlewares.push(proxyHandler);
    app[route.method](route.path, ...middlewares);
  }
}

export function registerTelegramDisconnectAliases(app, handlers) {
  const { requireAgentContext, agentTelegramDisconnectHandler } = handlers;
  app.delete(
    "/api/agent/channels/telegram/disconnect",
    requireAgentContext,
    agentTelegramDisconnectHandler
  );
  app.post(
    "/api/agent/channels/telegram/disconnect",
    requireAgentContext,
    agentTelegramDisconnectHandler
  );
}
