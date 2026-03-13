export const BOT_BFF_ALIAS_ROUTES = Object.freeze([
  { method: "post", path: "/v1/me/bot/provision", target: "/api/agent/provision" },
  { method: "get", path: "/v1/me/bot/onboarding", target: "/api/agent/onboarding" },
  { method: "put", path: "/v1/me/bot/onboarding", target: "/api/agent/onboarding" },
  { method: "post", path: "/v1/me/bot/chat/stream", target: "/api/agent/chat/stream" },
  { method: "get", path: "/v1/me/bot/settings", target: "/api/agent/config" },
  { method: "patch", path: "/v1/me/bot/settings", target: "/api/agent/config" },
  {
    method: "post",
    path: "/v1/me/bot/telegram/connect",
    target: "/api/agent/channels/telegram/connect",
  },
  {
    method: "post",
    path: "/v1/me/bot/telegram/disconnect",
    target: "/api/agent/channels/telegram/disconnect",
  },
  { method: "get", path: "/v1/me/bot/usage", target: "/api/usage/quota?surface=zaki_bot" },
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
    agentRouteLimiter,
    json1mb,
    json10mb,
    agentProvisionHandler,
    onboardingGetHandler,
    onboardingPutHandler,
    agentChatStreamHandler,
    configGetHandler,
    configPatchHandler,
    agentTelegramConnectHandler,
    agentTelegramDisconnectHandler,
    botUsageHandler,
  } = handlers;

  app.post(
    "/v1/me/bot/provision",
    requireAgentContext,
    agentRouteLimiter,
    json1mb,
    agentProvisionHandler
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
    agentChatStreamHandler
  );
  app.get("/v1/me/bot/settings", requireAgentContext, agentRouteLimiter, configGetHandler);
  app.patch(
    "/v1/me/bot/settings",
    requireAgentContext,
    agentRouteLimiter,
    json1mb,
    configPatchHandler
  );
  app.post(
    "/v1/me/bot/telegram/connect",
    requireAgentContext,
    agentRouteLimiter,
    json1mb,
    agentTelegramConnectHandler
  );
  app.post(
    "/v1/me/bot/telegram/disconnect",
    requireAgentContext,
    agentRouteLimiter,
    agentTelegramDisconnectHandler
  );
  app.get("/v1/me/bot/usage", requireAgentContext, botUsageHandler);
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
