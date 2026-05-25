import { describe, expect, it, jest } from "@jest/globals";
import {
  AGENT_RUNTIME_FACADE_ROUTES,
  BOT_BFF_ALIAS_ROUTES,
  BOT_CHAT_STREAM_SESSION_KEY_CONTRACT,
  buildBotProvisionPayload,
  normalizeTelegramDisconnectErrorPayload,
  registerBotBffAliases,
  registerTelegramDisconnectAliases,
} from "./agent-bff-contract.js";

describe("agent BOT BFF contract", () => {
  it("defines the reviewed Agent runtime facade surface", () => {
    expect(AGENT_RUNTIME_FACADE_ROUTES).toEqual([
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
  });

  it("defines the expected /v1/me/bot alias surface", () => {
    expect(BOT_BFF_ALIAS_ROUTES).toEqual([
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

  it("documents auth-bound canonical session key forwarding for both chat stream surfaces", () => {
    expect(BOT_CHAT_STREAM_SESSION_KEY_CONTRACT).toEqual({
      surfaces: ["/api/agent/chat/stream", "/v1/me/bot/chat/stream"],
      upstreamPath: "/api/v1/chat/stream",
      ownership: "server_auth_bound",
      defaultLane: "thread:<threadId|main>",
      supportedOverrideLanes: ["main", "thread:<id>", "task:<id>", "cron:<id>"],
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
      json1mb: jest.fn(),
      json10mb: jest.fn(),
      provisionHandler: jest.fn(),
      onboardingGetHandler: jest.fn(),
      onboardingPutHandler: jest.fn(),
      chatStreamHandler: jest.fn(),
      settingsGetHandler: jest.fn(),
      settingsPatchHandler: jest.fn(),
      heartbeatGetHandler: jest.fn(),
      heartbeatPutHandler: jest.fn(),
      telegramConnectHandler: jest.fn(),
      telegramDisconnectHandler: jest.fn(),
      usageHandler: jest.fn(),
    };

    registerBotBffAliases(app, handlers);

    expect(app.post).toHaveBeenCalledWith(
      "/v1/me/bot/provision",
      handlers.requireAgentContext,
      handlers.json1mb,
      handlers.provisionHandler
    );
    expect(app.post).toHaveBeenCalledWith(
      "/v1/me/bot/chat/stream",
      handlers.requireAgentContext,
      handlers.json10mb,
      handlers.chatStreamHandler
    );
    expect(app.post).toHaveBeenCalledWith(
      "/v1/me/bot/telegram/disconnect",
      handlers.requireAgentContext,
      handlers.telegramDisconnectHandler
    );
    expect(app.put).toHaveBeenCalledWith(
      "/v1/me/bot/heartbeat",
      handlers.requireAgentContext,
      handlers.json1mb,
      handlers.heartbeatPutHandler
    );
    expect(app.get).toHaveBeenCalledWith(
      "/v1/me/bot/usage",
      handlers.requireAgentContext,
      handlers.usageHandler
    );
  });

  it("registers both DELETE and POST disconnect aliases on /api/agent/channels/telegram/disconnect", () => {
    const app = {
      delete: jest.fn(),
      post: jest.fn(),
    };
    const handlers = {
      requireAgentContext: jest.fn(),
      agentTelegramDisconnectHandler: jest.fn(),
    };

    registerTelegramDisconnectAliases(app, handlers);

    expect(app.delete).toHaveBeenCalledWith(
      "/api/agent/channels/telegram/disconnect",
      handlers.requireAgentContext,
      handlers.agentTelegramDisconnectHandler
    );
    expect(app.post).toHaveBeenCalledWith(
      "/api/agent/channels/telegram/disconnect",
      handlers.requireAgentContext,
      handlers.agentTelegramDisconnectHandler
    );
  });
});
