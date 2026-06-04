import { describe, expect, it, jest } from "@jest/globals";
import {
  AGENT_CHANNEL_BINDING_BFF_ROUTES,
  AGENT_CONTROL_CHANNEL_IDS,
  AGENT_LAUNCH_CHANNELS,
  AGENT_LAUNCH_CHANNEL_IDS,
  AGENT_RUNTIME_FACADE_ROUTES,
  AGENT_SETTINGS_CONTROL_PLANE_ROUTES,
  AGENT_SESSION_BFF_ROUTES,
  BOT_BFF_ALIAS_ROUTES,
  BOT_CHAT_STREAM_SESSION_KEY_CONTRACT,
  buildBotProvisionPayload,
  getAgentLaunchChannel,
  normalizeAgentArtifactExportPayload,
  normalizeAgentExportDownloadUrl,
  normalizeTelegramDisconnectErrorPayload,
  normalizeAgentControlChannelId,
  normalizeAgentLaunchChannelId,
  registerAgentSessionBffRoutes,
  registerBotBffAliases,
  registerTelegramDisconnectAliases,
  sanitizeAgentChannelBindingPayload,
} from "./agent-bff-contract.js";

describe("agent BOT BFF contract", () => {
  it("defines the reviewed Agent runtime facade surface", () => {
    expect(AGENT_RUNTIME_FACADE_ROUTES).toEqual([
      { method: "get", path: "/api/agent/diagnostics/context" },
      { method: "get", path: "/api/agent/diagnostics/memory-doctor" },
      { method: "get", path: "/api/agent/diagnostics/extension" },
      { method: "get", path: "/api/agent/tasks" },
      { method: "get", path: "/api/agent/tasks/:taskId" },
      { method: "post", path: "/api/agent/tasks/:taskId/stop" },
      { method: "get", path: "/api/agent/jobs" },
      { method: "get", path: "/api/agent/traces" },
      { method: "get", path: "/api/agent/traces/:runId" },
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
  });

  it("normalizes produced-file download URLs through the Agent export bridge", () => {
    expect(
      normalizeAgentExportDownloadUrl("/api/v1/users/42/exports/report.pdf")
    ).toBe("/api/agent/exports/report.pdf");
    expect(
      normalizeAgentExportDownloadUrl(
        "http://nullalis.local/api/v1/users/42/exports/research_brief.docx"
      )
    ).toBe("/api/agent/exports/research_brief.docx");
    expect(normalizeAgentExportDownloadUrl("/api/agent/exports/report.pdf")).toBe(
      "/api/agent/exports/report.pdf"
    );
    expect(normalizeAgentExportDownloadUrl("https://download.local/report.pdf")).toBeNull();
    expect(normalizeAgentExportDownloadUrl("/api/v1/users/42/exports/../secret.pdf")).toBeNull();
    expect(normalizeAgentExportDownloadUrl("/api/v1/users/42/exports/.hidden.pdf")).toBeNull();
    expect(normalizeAgentExportDownloadUrl("/api/v1/users/42/exports/report.pdf/extra")).toBeNull();
  });

  it("normalizes artifact export payloads without leaking raw upstream paths", () => {
    expect(
      normalizeAgentArtifactExportPayload({
        ok: true,
        download_url: "/api/v1/users/42/exports/report.pdf",
      })
    ).toEqual({
      ok: true,
      download_url: "/api/agent/exports/report.pdf",
      url: "/api/agent/exports/report.pdf",
    });
    expect(
      normalizeAgentArtifactExportPayload({
        ok: true,
        download_url: "https://download.local/report.pdf",
        url: "/api/v1/users/42/exports/.hidden.pdf",
      })
    ).toEqual({
      ok: true,
      download_url: null,
      url: null,
    });
  });

  it("defines the launch channel control-plane surface", () => {
    expect(AGENT_LAUNCH_CHANNEL_IDS).toEqual(["telegram", "slack", "discord", "email"]);
    expect(AGENT_CHANNEL_BINDING_BFF_ROUTES).toEqual([
      { method: "get", path: "/api/agent/channels/:channel/bindings" },
      { method: "post", path: "/api/agent/channels/:channel/bindings" },
      { method: "delete", path: "/api/agent/channels/:channel/bindings/:bindingId" },
    ]);
    expect(AGENT_LAUNCH_CHANNELS.find((channel) => channel.id === "telegram")).toMatchObject({
      directConnect: true,
      bindings: true,
      secretKeys: ["telegram_bot_token"],
    });
    expect(AGENT_LAUNCH_CHANNELS.find((channel) => channel.id === "slack")).toMatchObject({
      directConnect: false,
      bindings: true,
      secretKeys: ["slack_bot_token", "slack_app_token", "slack_signing_secret"],
    });
  });

  it("normalizes and rejects unsupported Agent channel ids", () => {
    expect(normalizeAgentLaunchChannelId(" Slack ")).toBe("slack");
    expect(getAgentLaunchChannel("DISCORD")?.label).toBe("Discord");
    expect(normalizeAgentLaunchChannelId("whatsapp")).toBeNull();
  });

  it("defines the settings control-plane surface for S7 contracts", () => {
    expect(AGENT_CONTROL_CHANNEL_IDS).toEqual([
      "telegram",
      "slack",
      "discord",
      "email",
      "whatsapp",
    ]);
    expect(normalizeAgentControlChannelId(" WhatsApp ")).toBe("whatsapp");
    expect(normalizeAgentControlChannelId("signal")).toBeNull();
    expect(AGENT_SETTINGS_CONTROL_PLANE_ROUTES).toEqual(
      expect.arrayContaining([
        { method: "get", path: "/api/agent/integrations" },
        { method: "get", path: "/api/agent/channel-control" },
        { method: "post", path: "/api/agent/channel-control/:channel/connect" },
        { method: "post", path: "/api/agent/channel-control/:channel/test" },
        { method: "post", path: "/api/agent/channel-control/:channel/disconnect" },
        { method: "get", path: "/api/agent/providers" },
        { method: "post", path: "/api/agent/providers" },
        { method: "post", path: "/api/agent/providers/:profileId/test" },
        { method: "get", path: "/api/agent/extension/devices" },
        { method: "post", path: "/api/agent/extension/devices" },
        { method: "post", path: "/api/agent/extension/devices/:deviceId/revoke" },
        { method: "get", path: "/api/agent/memory/governance" },
        { method: "post", path: "/api/agent/memory/purge-pii" },
      ])
    );
  });

  it("sanitizes Agent channel binding payloads before proxying", () => {
    expect(
      sanitizeAgentChannelBindingPayload({
        account_id: " main ",
        principal_key: " U123 ",
        scope_key: " C456 ",
        thread_key: " thread:ops ",
        ignored: "drop",
      })
    ).toEqual({
      ok: true,
      payload: {
        account_id: "main",
        principal_key: "U123",
        scope_key: "C456",
        thread_key: "thread:ops",
      },
    });
    expect(sanitizeAgentChannelBindingPayload({ account_id: "main" })).toEqual({
      ok: false,
      error: "missing_binding_fields",
    });
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

  it("defines the agent session BFF proxy surface (matches src/lib/api.ts)", () => {
    expect(AGENT_SESSION_BFF_ROUTES).toEqual([
      { method: "get",    path: "/api/agent/sessions/:sessionKey",          upstreamSuffix: "",         json: false },
      { method: "delete", path: "/api/agent/sessions/:sessionKey",          upstreamSuffix: "",         json: false },
      { method: "post",   path: "/api/agent/sessions/:sessionKey/compact",  upstreamSuffix: "/compact", json: false },
      { method: "get",    path: "/api/agent/sessions/:sessionKey/context",  upstreamSuffix: "/context", json: false },
      { method: "get",    path: "/api/agent/sessions/:sessionKey/export",   upstreamSuffix: "/export",  json: false },
      { method: "get",    path: "/api/agent/sessions/:sessionKey/history",  upstreamSuffix: "/history", json: false },
      { method: "post",   path: "/api/agent/sessions/:sessionKey/mode",     upstreamSuffix: "/mode",    json: true  },
      { method: "post",   path: "/api/agent/sessions/:sessionKey/approve",  upstreamSuffix: "/approve", json: true  },
      { method: "post",   path: "/api/agent/sessions/:sessionKey/cancel",   upstreamSuffix: "/cancel",  json: false },
    ]);
  });

  it("includes the POST /mode route (frontend setAgentSessionMode contract)", () => {
    // The composer mode toggle calls
    //   POST /api/agent/sessions/:sessionKey/mode  body: { mode }
    // which proxies to nullalis
    //   POST /api/v1/users/${userId}/sessions/${sessionKey}/mode
    // → handleSessionMode → the /mode slash command. This regression test
    // pins the BFF surface so the frontend toggle never silently 404s.
    const modeRoute = AGENT_SESSION_BFF_ROUTES.find(
      (route) =>
        route.method === "post" &&
        route.path === "/api/agent/sessions/:sessionKey/mode"
    );
    expect(modeRoute).toBeDefined();
    expect(modeRoute).toMatchObject({
      method: "post",
      path: "/api/agent/sessions/:sessionKey/mode",
      upstreamSuffix: "/mode",
      json: true,
    });
  });

  describe("registerAgentSessionBffRoutes", () => {
    function buildApp() {
      return {
        get: jest.fn(),
        post: jest.fn(),
        delete: jest.fn(),
      };
    }

    function buildHandlers() {
      const requireAgentContext = jest.fn();
      const agentJson1mb = jest.fn();
      // The factory returns a fresh stub handler per call so we can later
      // assert per-route wiring + invoke a single handler to check the
      // upstream path it would build.
      const proxyHandlersBySuffix = new Map();
      const makeSessionProxyHandler = jest.fn((pathBuilder) => {
        const proxyHandler = jest.fn();
        proxyHandler.pathBuilder = pathBuilder;
        proxyHandlersBySuffix.set(pathBuilder, proxyHandler);
        return proxyHandler;
      });
      return {
        requireAgentContext,
        agentJson1mb,
        makeSessionProxyHandler,
        proxyHandlersBySuffix,
      };
    }

    it("registers every entry from AGENT_SESSION_BFF_ROUTES", () => {
      const app = buildApp();
      const { proxyHandlersBySuffix, ...handlers } = buildHandlers();

      registerAgentSessionBffRoutes(app, handlers);

      const verbCalls = (verb) =>
        app[verb].mock.calls.map((args) => args[0]);

      expect(verbCalls("get")).toEqual([
        "/api/agent/sessions/:sessionKey",
        "/api/agent/sessions/:sessionKey/context",
        "/api/agent/sessions/:sessionKey/export",
        "/api/agent/sessions/:sessionKey/history",
      ]);
      expect(verbCalls("delete")).toEqual([
        "/api/agent/sessions/:sessionKey",
      ]);
      expect(verbCalls("post")).toEqual([
        "/api/agent/sessions/:sessionKey/compact",
        "/api/agent/sessions/:sessionKey/mode",
        "/api/agent/sessions/:sessionKey/approve",
        "/api/agent/sessions/:sessionKey/cancel",
      ]);
    });

    it("omits the JSON body parser for read-only and non-body POST proxy routes", () => {
      const app = buildApp();
      const { proxyHandlersBySuffix, ...handlers } = buildHandlers();

      registerAgentSessionBffRoutes(app, handlers);

      const compactCall = app.post.mock.calls.find(
        (args) => args[0] === "/api/agent/sessions/:sessionKey/compact"
      );
      expect(compactCall).toBeDefined();
      // requireAgentContext + proxy handler only — no body parser.
      expect(compactCall).toHaveLength(3);
      expect(compactCall[1]).toBe(handlers.requireAgentContext);
      expect(compactCall[2]).not.toBe(handlers.agentJson1mb);

      const getDetailCall = app.get.mock.calls.find(
        (args) => args[0] === "/api/agent/sessions/:sessionKey"
      );
      expect(getDetailCall).toBeDefined();
      expect(getDetailCall).toHaveLength(3);
      expect(getDetailCall[1]).toBe(handlers.requireAgentContext);

      const modeCall = app.post.mock.calls.find(
        (args) => args[0] === "/api/agent/sessions/:sessionKey/mode"
      );
      expect(modeCall).toBeDefined();
      expect(modeCall).toHaveLength(4);
      expect(modeCall[1]).toBe(handlers.requireAgentContext);
      expect(modeCall[2]).toBe(handlers.agentJson1mb);

      const cancelCall = app.post.mock.calls.find(
        (args) => args[0] === "/api/agent/sessions/:sessionKey/cancel"
      );
      expect(cancelCall).toBeDefined();
      expect(cancelCall).toHaveLength(3);
      expect(cancelCall[1]).toBe(handlers.requireAgentContext);
      expect(cancelCall[2]).not.toBe(handlers.agentJson1mb);
    });

    it("encodes the userId segment in upstream paths but forwards the raw session key", () => {
      const app = buildApp();
      const { proxyHandlersBySuffix, ...handlers } = buildHandlers();

      registerAgentSessionBffRoutes(app, handlers);

      const approveCall = app.post.mock.calls.find(
        (args) => args[0] === "/api/agent/sessions/:sessionKey/approve"
      );
      expect(approveCall).toBeDefined();
      const modeCall = app.post.mock.calls.find(
        (args) => args[0] === "/api/agent/sessions/:sessionKey/mode"
      );
      expect(modeCall).toBeDefined();
      const modeProxyHandler = modeCall[modeCall.length - 1];
      const modeUpstream = modeProxyHandler.pathBuilder("user with space", {
        params: { sessionKey: "agent:zaki-bot:user:42:thread:main" },
      });
      expect(modeUpstream).toBe(
        "/api/v1/users/user%20with%20space/sessions/agent:zaki-bot:user:42:thread:main/mode"
      );
      const proxyHandler = approveCall[approveCall.length - 1];
      const upstream = proxyHandler.pathBuilder("user with space", {
        params: { sessionKey: "agent:zaki-bot:user:42:thread:main" },
      });
      // userId is URI-encoded so spaces don't injection-break the path.
      expect(upstream).toBe(
        "/api/v1/users/user%20with%20space/sessions/agent:zaki-bot:user:42:thread:main/approve"
      );

      const cancelCall = app.post.mock.calls.find(
        (args) => args[0] === "/api/agent/sessions/:sessionKey/cancel"
      );
      expect(cancelCall).toBeDefined();
      const cancelProxyHandler = cancelCall[cancelCall.length - 1];
      const cancelUpstream = cancelProxyHandler.pathBuilder("user with space", {
        params: { sessionKey: "agent:zaki-bot:user:42:thread:main" },
      });
      expect(cancelUpstream).toBe(
        "/api/v1/users/user%20with%20space/sessions/agent:zaki-bot:user:42:thread:main/cancel"
      );
    });
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
