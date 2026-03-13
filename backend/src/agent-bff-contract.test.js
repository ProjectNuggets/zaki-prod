import { describe, expect, it, jest } from "@jest/globals";
import {
  BOT_BFF_ALIAS_ROUTES,
  buildBotProvisionPayload,
  normalizeTelegramDisconnectErrorPayload,
  registerBotBffAliases,
  registerTelegramDisconnectAliases,
} from "./agent-bff-contract.js";

describe("agent BOT BFF contract", () => {
  it("defines the expected /v1/me/bot alias surface", () => {
    expect(BOT_BFF_ALIAS_ROUTES).toEqual([
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
  });

  it("overrides client-supplied user_id in provision payloads", () => {
    const payload = buildBotProvisionPayload("42", {
      user_id: "999",
      nickname: "nova",
    });

    expect(payload).toEqual({
      user_id: "42",
      nickname: "nova",
    });
  });

  it("normalizes telegram disconnect invalid token errors", () => {
    expect(
      normalizeTelegramDisconnectErrorPayload(
        { error: "Telegram returned invalid token for bot" },
        401
      )
    ).toEqual(
      expect.objectContaining({
        code: "invalid_token",
        error: "Telegram returned invalid token for bot",
      })
    );
  });

  it("normalizes telegram disconnect webhook rejection errors", () => {
    expect(
      normalizeTelegramDisconnectErrorPayload(
        { message: "Webhook rejected by Telegram" },
        400
      )
    ).toEqual(
      expect.objectContaining({
        code: "webhook_rejected",
      })
    );
  });

  it("normalizes telegram disconnect secret mismatch errors", () => {
    expect(
      normalizeTelegramDisconnectErrorPayload(
        { detail: "Webhook secret mismatch" },
        400
      )
    ).toEqual(
      expect.objectContaining({
        code: "secret_mismatch",
      })
    );
  });

  it("normalizes telegram disconnect not-connected errors", () => {
    expect(
      normalizeTelegramDisconnectErrorPayload(
        { error: "Telegram not connected for this user" },
        404
      )
    ).toEqual(
      expect.objectContaining({
        code: "not_connected",
      })
    );
  });

  it("registers every BOT alias with auth-bound handlers", () => {
    const app = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
    };
    const handlers = {
      requireAgentContext: jest.fn(),
      agentRouteLimiter: jest.fn(),
      json1mb: jest.fn(),
      json10mb: jest.fn(),
      agentProvisionHandler: jest.fn(),
      onboardingGetHandler: jest.fn(),
      onboardingPutHandler: jest.fn(),
      agentChatStreamHandler: jest.fn(),
      configGetHandler: jest.fn(),
      configPatchHandler: jest.fn(),
      agentTelegramConnectHandler: jest.fn(),
      agentTelegramDisconnectHandler: jest.fn(),
      botUsageHandler: jest.fn(),
    };

    registerBotBffAliases(app, handlers);

    expect(app.post).toHaveBeenCalledWith(
      "/v1/me/bot/provision",
      handlers.requireAgentContext,
      handlers.agentRouteLimiter,
      handlers.json1mb,
      handlers.agentProvisionHandler
    );
    expect(app.post).toHaveBeenCalledWith(
      "/v1/me/bot/chat/stream",
      handlers.requireAgentContext,
      handlers.agentRouteLimiter,
      handlers.json10mb,
      handlers.agentChatStreamHandler
    );
    expect(app.post).toHaveBeenCalledWith(
      "/v1/me/bot/telegram/disconnect",
      handlers.requireAgentContext,
      handlers.agentRouteLimiter,
      handlers.agentTelegramDisconnectHandler
    );
    expect(app.get).toHaveBeenCalledWith(
      "/v1/me/bot/usage",
      handlers.requireAgentContext,
      handlers.botUsageHandler
    );
  });

  it("registers both DELETE and POST disconnect aliases on /api/agent/channels/telegram/disconnect", () => {
    const app = {
      delete: jest.fn(),
      post: jest.fn(),
    };
    const handlers = {
      requireAgentContext: jest.fn(),
      agentRouteLimiter: jest.fn(),
      agentTelegramDisconnectHandler: jest.fn(),
    };

    registerTelegramDisconnectAliases(app, handlers);

    expect(app.delete).toHaveBeenCalledWith(
      "/api/agent/channels/telegram/disconnect",
      handlers.requireAgentContext,
      handlers.agentRouteLimiter,
      handlers.agentTelegramDisconnectHandler
    );
    expect(app.post).toHaveBeenCalledWith(
      "/api/agent/channels/telegram/disconnect",
      handlers.requireAgentContext,
      handlers.agentRouteLimiter,
      handlers.agentTelegramDisconnectHandler
    );
  });
});
