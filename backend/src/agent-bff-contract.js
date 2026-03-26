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
    agentRouteLimiter,
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
    agentRouteLimiter,
    json1mb,
    provisionHandler
  );
  app.get("/v1/me/bot/onboarding", requireAgentContext, agentRouteLimiter, onboardingGetHandler);
  app.put(
    "/v1/me/bot/onboarding",
    requireAgentContext,
    agentRouteLimiter,
    json1mb,
    onboardingPutHandler
  );
  app.post(
    "/v1/me/bot/chat/stream",
    requireAgentContext,
    agentRouteLimiter,
    json10mb,
    chatStreamHandler
  );
  app.get("/v1/me/bot/settings", requireAgentContext, agentRouteLimiter, settingsGetHandler);
  app.patch(
    "/v1/me/bot/settings",
    requireAgentContext,
    agentRouteLimiter,
    json1mb,
    settingsPatchHandler
  );
  app.get("/v1/me/bot/heartbeat", requireAgentContext, agentRouteLimiter, heartbeatGetHandler);
  app.put(
    "/v1/me/bot/heartbeat",
    requireAgentContext,
    agentRouteLimiter,
    json1mb,
    heartbeatPutHandler
  );
  app.post(
    "/v1/me/bot/telegram/connect",
    requireAgentContext,
    agentRouteLimiter,
    json1mb,
    telegramConnectHandler
  );
  app.post(
    "/v1/me/bot/telegram/disconnect",
    requireAgentContext,
    agentRouteLimiter,
    telegramDisconnectHandler
  );
  app.get("/v1/me/bot/usage", requireAgentContext, usageHandler);
}

export function registerTelegramDisconnectAliases(app, handlers) {
  const { requireAgentContext, agentRouteLimiter, agentTelegramDisconnectHandler } = handlers;
  app.delete(
    "/api/agent/channels/telegram/disconnect",
    requireAgentContext,
    agentRouteLimiter,
    agentTelegramDisconnectHandler
  );
  app.post(
    "/api/agent/channels/telegram/disconnect",
    requireAgentContext,
    agentRouteLimiter,
    agentTelegramDisconnectHandler
  );
}
