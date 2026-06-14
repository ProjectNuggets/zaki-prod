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
// - retry:          when true, the proxy retries connection-class upstream
//                   outages (ECONNREFUSED / "fetch failed" / 502/503/504) with
//                   bounded jittered backoff. ONLY set this on idempotent
//                   routes. /approve qualifies because the frontend always
//                   sends a stable `approval_id`, so re-POSTing the same
//                   approval is safe; non-idempotent routes (compact, mode,
//                   cancel, ...) must leave this false.
export const AGENT_SESSION_BFF_ROUTES = Object.freeze([
  { method: "get",    path: "/api/agent/sessions/:sessionKey",          upstreamSuffix: "",         json: false },
  { method: "post",   path: "/api/agent/sessions/:sessionKey/compact",  upstreamSuffix: "/compact", json: false },
  { method: "get",    path: "/api/agent/sessions/:sessionKey/context",  upstreamSuffix: "/context", json: false },
  { method: "get",    path: "/api/agent/sessions/:sessionKey/todos",    upstreamSuffix: "/todos",   json: false },
  { method: "patch",  path: "/api/agent/sessions/:sessionKey/todos/:listId/items/:itemId", upstreamSuffix: "/todos/:listId/items/:itemId", json: true },
  { method: "get",    path: "/api/agent/sessions/:sessionKey/plan",     upstreamSuffix: "/plan",    json: false },
  { method: "get",    path: "/api/agent/sessions/:sessionKey/export",   upstreamSuffix: "/export",  json: false },
  { method: "get",    path: "/api/agent/sessions/:sessionKey/history",  upstreamSuffix: "/history", json: false },
  { method: "post",   path: "/api/agent/sessions/:sessionKey/mode",     upstreamSuffix: "/mode",    json: true  },
  { method: "post",   path: "/api/agent/sessions/:sessionKey/approve",  upstreamSuffix: "/approve", json: true,  retry: true },
  { method: "post",   path: "/api/agent/sessions/:sessionKey/cancel",   upstreamSuffix: "/cancel",  json: false },
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
  { method: "get", path: "/api/agent/diagnostics/extension" },
  { method: "get", path: "/api/agent/tasks" },
  { method: "get", path: "/api/agent/tasks/:taskId" },
  { method: "post", path: "/api/agent/tasks/:taskId/stop" },
  { method: "get", path: "/api/agent/jobs" },
  { method: "post", path: "/api/agent/history/append" },
  { method: "get", path: "/api/agent/traces" },
  { method: "get", path: "/api/agent/traces/:runId" },
  { method: "get", path: "/api/agent/traces/:runId/events" },
  { method: "post", path: "/api/agent/traces/:runId/share" },
  { method: "delete", path: "/api/agent/traces/:runId/share" },
  { method: "get", path: "/api/agent/exports/:filename" },
  { method: "get", path: "/api/agent/share/artifact/:shareCode" },
  { method: "get", path: "/api/agent/share/trace/:shareCode" },
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

const AGENT_EXPORT_FILENAME_SAFE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;

function normalizeAgentExportFilename(value) {
  let decoded;
  try {
    decoded = decodeURIComponent(String(value || ""));
  } catch {
    return null;
  }
  const filename = decoded.trim();
  if (
    !AGENT_EXPORT_FILENAME_SAFE_PATTERN.test(filename) ||
    filename.includes("..") ||
    filename.startsWith(".")
  ) {
    return null;
  }
  return encodeURIComponent(filename);
}

export function normalizeAgentExportDownloadUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  try {
    const parsed = new URL(raw, "http://zaki.local");
    const upstream = parsed.pathname.match(/^\/api\/v1\/users\/[^/]+\/exports\/([^/?#]+)$/);
    if (upstream?.[1]) {
      const filename = normalizeAgentExportFilename(upstream[1]);
      return filename ? `/api/agent/exports/${filename}` : null;
    }
    const bff = parsed.pathname.match(/^\/api\/agent\/exports\/([^/?#]+)$/);
    if (bff?.[1]) {
      const filename = normalizeAgentExportFilename(bff[1]);
      return filename ? `/api/agent/exports/${filename}${parsed.search || ""}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function normalizeAgentArtifactExportPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const next = { ...payload };
  const downloadUrl = normalizeAgentExportDownloadUrl(
    next.download_url ?? next.downloadUrl ?? next.url
  );
  if (downloadUrl) {
    next.download_url = downloadUrl;
    next.url = downloadUrl;
    if ("downloadUrl" in next) next.downloadUrl = downloadUrl;
    return next;
  }
  for (const key of ["download_url", "downloadUrl", "url"]) {
    if (typeof next[key] === "string" && next[key].trim()) {
      next[key] = null;
    }
  }
  return next;
}

export const AGENT_LAUNCH_CHANNELS = Object.freeze([
  Object.freeze({
    id: "telegram",
    label: "Telegram",
    live: true,
    directConnect: true,
    bindings: true,
    secretKeys: Object.freeze(["telegram_bot_token"]),
  }),
  Object.freeze({
    id: "slack",
    label: "Slack",
    live: true,
    directConnect: false,
    bindings: true,
    secretKeys: Object.freeze(["slack_bot_token", "slack_app_token", "slack_signing_secret"]),
  }),
  Object.freeze({
    id: "discord",
    label: "Discord",
    live: true,
    directConnect: false,
    bindings: true,
    secretKeys: Object.freeze(["discord_bot_token"]),
  }),
  Object.freeze({
    id: "email",
    label: "Email",
    live: true,
    directConnect: false,
    bindings: true,
    secretKeys: Object.freeze(["email_smtp_password", "email_imap_password"]),
  }),
]);

export const AGENT_LAUNCH_CHANNEL_IDS = Object.freeze(
  AGENT_LAUNCH_CHANNELS.map((channel) => channel.id)
);

export const AGENT_CHANNEL_BINDING_BFF_ROUTES = Object.freeze([
  { method: "get", path: "/api/agent/channels/:channel/bindings" },
  { method: "post", path: "/api/agent/channels/:channel/bindings" },
  { method: "delete", path: "/api/agent/channels/:channel/bindings/:bindingId" },
]);

export const AGENT_CONTROL_CHANNEL_IDS = Object.freeze([
  "telegram",
  "slack",
  "discord",
  "email",
  "whatsapp",
]);

export const AGENT_SETTINGS_CONTROL_PLANE_ROUTES = Object.freeze([
  { method: "get", path: "/api/agent/integrations" },
  { method: "get", path: "/api/agent/channel-control" },
  { method: "get", path: "/api/agent/channel-control/:channel" },
  { method: "post", path: "/api/agent/channel-control/:channel/connect" },
  { method: "post", path: "/api/agent/channel-control/:channel/test" },
  { method: "post", path: "/api/agent/channel-control/:channel/disconnect" },
  { method: "delete", path: "/api/agent/channel-control/:channel/disconnect" },
  { method: "get", path: "/api/agent/providers" },
  { method: "post", path: "/api/agent/providers" },
  { method: "get", path: "/api/agent/providers/:profileId" },
  { method: "patch", path: "/api/agent/providers/:profileId" },
  { method: "put", path: "/api/agent/providers/:profileId" },
  { method: "delete", path: "/api/agent/providers/:profileId" },
  { method: "post", path: "/api/agent/providers/:profileId/test" },
  { method: "get", path: "/api/agent/extension/devices" },
  { method: "post", path: "/api/agent/extension/devices" },
  { method: "delete", path: "/api/agent/extension/devices/:deviceId" },
  { method: "post", path: "/api/agent/extension/devices/:deviceId/revoke" },
  { method: "get", path: "/api/agent/memory/governance" },
  { method: "post", path: "/api/agent/memory/forget" },
  { method: "post", path: "/api/agent/memory/purge-pii" },
  { method: "get", path: "/api/agent/memory/export" },
]);

export function normalizeAgentLaunchChannelId(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return AGENT_LAUNCH_CHANNEL_IDS.includes(normalized) ? normalized : null;
}

export function normalizeAgentControlChannelId(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return AGENT_CONTROL_CHANNEL_IDS.includes(normalized) ? normalized : null;
}

export function getAgentLaunchChannel(channelId) {
  const normalized = normalizeAgentLaunchChannelId(channelId);
  if (!normalized) return null;
  return AGENT_LAUNCH_CHANNELS.find((channel) => channel.id === normalized) || null;
}

export function sanitizeAgentChannelBindingPayload(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const accountId = String(source.account_id || "").trim();
  const principalKey = String(source.principal_key || "").trim();
  const scopeKey = String(source.scope_key || "").trim();
  if (!accountId || !principalKey || !scopeKey) {
    return { ok: false, error: "missing_binding_fields" };
  }

  const sanitized = {
    account_id: accountId,
    principal_key: principalKey,
    scope_key: scopeKey,
  };
  for (const key of ["thread_key", "peer_kind", "peer_id", "metadata_json"]) {
    const value = String(source[key] || "").trim();
    if (value) sanitized[key] = value;
  }
  return { ok: true, payload: sanitized };
}

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
// `handlers.makeSessionProxyHandler(pathBuilder, proxyOptions)` must return an
// express handler that proxies the request to the nullalis path built by
// `pathBuilder(userId, req)`. `proxyOptions` (e.g. `{ retry: true }`) is passed
// through to the underlying proxy. `agentJson1mb` is the JSON body parser; it is
// applied only for routes that opt in via `json: true`.
export function registerAgentSessionBffRoutes(app, handlers) {
  const { requireAgentContext, agentJson1mb, makeSessionProxyHandler } = handlers;
  for (const route of AGENT_SESSION_BFF_ROUTES) {
    const proxyOptions = route.retry ? { retry: true } : {};
    const proxyHandler = makeSessionProxyHandler(
      (userId, req) => {
        const suffix = route.upstreamSuffix.replace(/:([A-Za-z0-9_]+)/g, (_, name) =>
          encodeURIComponent(String(req.params?.[name] ?? ""))
        );
        return `/api/v1/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(req.params.sessionKey)}${suffix}`;
      },
      proxyOptions
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
