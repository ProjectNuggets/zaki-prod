import { describe, expect, it, jest } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AGENT_CHANNEL_BINDING_BFF_ROUTES,
  AGENT_CONTROL_CHANNEL_IDS,
  AGENT_LAUNCH_CHANNELS,
  AGENT_LAUNCH_CHANNEL_IDS,
  AGENT_RUNTIME_FACADE_ROUTES,
  AGENT_SETTINGS_CONTROL_PLANE_ROUTES,
  AGENT_SESSION_BFF_ROUTES,
  AGENT_SESSION_IDLE_CONTEXT_PAYLOAD,
  AGENT_SESSION_IDLE_DETAIL_PAYLOAD,
  AGENT_SESSION_IDLE_HISTORY_PAYLOAD,
  AGENT_SESSION_IDLE_PLAN_PAYLOAD,
  AGENT_SESSION_IDLE_TODOS_PAYLOAD,
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
  resolveSoftEmptyAgentResponse,
  sanitizeAgentChannelBindingPayload,
} from "./agent-bff-contract.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
        { method: "post", path: "/api/agent/memory/forget" },
        { method: "get", path: "/api/agent/memory/export" },
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
      { method: "get",    path: "/api/agent/sessions/:sessionKey",          upstreamSuffix: "",         json: false, softEmptyOnMissing: AGENT_SESSION_IDLE_DETAIL_PAYLOAD },
      { method: "post",   path: "/api/agent/sessions/:sessionKey/compact",  upstreamSuffix: "/compact", json: false },
      { method: "get",    path: "/api/agent/sessions/:sessionKey/context",  upstreamSuffix: "/context", json: false, softEmptyOnMissing: AGENT_SESSION_IDLE_CONTEXT_PAYLOAD },
      { method: "get",    path: "/api/agent/sessions/:sessionKey/todos",    upstreamSuffix: "/todos",   json: false, softEmptyOnMissing: AGENT_SESSION_IDLE_TODOS_PAYLOAD },
      { method: "patch",  path: "/api/agent/sessions/:sessionKey/todos/:listId/items/:itemId", upstreamSuffix: "/todos/:listId/items/:itemId", json: true },
      { method: "get",    path: "/api/agent/sessions/:sessionKey/plan",     upstreamSuffix: "/plan",    json: false, softEmptyOnMissing: AGENT_SESSION_IDLE_PLAN_PAYLOAD },
      { method: "get",    path: "/api/agent/sessions/:sessionKey/export",   upstreamSuffix: "/export",  json: false },
      { method: "get",    path: "/api/agent/sessions/:sessionKey/history",  upstreamSuffix: "/history", json: false, softEmptyOnMissing: AGENT_SESSION_IDLE_HISTORY_PAYLOAD },
      { method: "post",   path: "/api/agent/sessions/:sessionKey/mode",     upstreamSuffix: "/mode",    json: true  },
      { method: "post",   path: "/api/agent/sessions/:sessionKey/approve",  upstreamSuffix: "/approve", json: true,  retry: true },
      { method: "post",   path: "/api/agent/sessions/:sessionKey/cancel",   upstreamSuffix: "/cancel",  json: false },
    ]);
  });

  it("leases inactive runtime entitlement only after the Agent wallet gate allows the turn", () => {
    const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
    const streamHandlerSource = source.slice(
      source.indexOf("const agentChatStreamHandler = async"),
      source.indexOf("function normalizeZakiBotThreadTitle")
    );
    const ordinaryProvisionSource = source.slice(
      source.indexOf("const agentProvisionHandler = async"),
      source.indexOf("const makeAgentSecretsTwoPhaseHandler")
    );

    const reserveIndex = streamHandlerSource.indexOf("requireAgentWalletReserveForChat");
    const denialIndex = streamHandlerSource.indexOf("if (!meterDecision.allowed || res.headersSent)");
    const provisionIndex = streamHandlerSource.indexOf("ensureProvisionedBeforeChat");
    const authorizationIndex = streamHandlerSource.indexOf("meterGatePassed: true");

    expect(reserveIndex).toBeGreaterThanOrEqual(0);
    expect(denialIndex).toBeGreaterThan(reserveIndex);
    expect(provisionIndex).toBeGreaterThan(denialIndex);
    expect(authorizationIndex).toBeGreaterThan(provisionIndex);
    expect(ordinaryProvisionSource).not.toContain("meterGatePassed: true");
  });

  it("soft-empties the explicit Agent session detail handler on missing sessions", () => {
    const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
    const detailHandlerSource = source.slice(
      source.indexOf("async function agentSessionDetailHandler"),
      source.indexOf("app.get(\"/api/agent/history\"")
    );

    expect(detailHandlerSource).toContain("AGENT_SESSION_IDLE_DETAIL_PAYLOAD");
    expect(detailHandlerSource).toContain("resolveSoftEmptyAgentResponse");
    expect(detailHandlerSource).toContain("await upstream.text()");
    expect(detailHandlerSource).not.toContain("await upstream.json()");
  });

  it("runs soft-empty normalization before JSON response buffering", () => {
    const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
    const proxySource = source.slice(
      source.indexOf("async function proxyNullclawRequest"),
      source.indexOf("const makeAgentUserProxyHandler")
    );

    expect(proxySource.indexOf("options.softEmptyOnMissing")).toBeGreaterThanOrEqual(0);
    expect(proxySource.indexOf('options.responseMode === "json"')).toBeGreaterThanOrEqual(0);
    expect(proxySource.indexOf("options.softEmptyOnMissing")).toBeLessThan(
      proxySource.indexOf('options.responseMode === "json"')
    );
  });

  it("soft-empties Brain self-anchor for cold corpus accounts", () => {
    const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
    const brainSource = source.slice(
      source.indexOf("const NULLCLAW_BRAIN_JSON_PROXY_OPTIONS"),
      source.indexOf('app.post(\n  "/api/agent/brain/compose"')
    );
    const brainMeRouteSource = source.slice(
      source.indexOf('"/api/agent/brain/me"'),
      source.indexOf('app.post(\n  "/api/agent/brain/compose"')
    );

    expect(brainSource).toContain("const NULLCLAW_BRAIN_ME_JSON_PROXY_OPTIONS");
    expect(brainSource).toContain("softEmptyOnMissing: { memory: null }");
    expect(brainMeRouteSource).toContain("NULLCLAW_BRAIN_ME_JSON_PROXY_OPTIONS");
  });

  it("enables connection-class retry ONLY on the idempotent /approve route", () => {
    // /approve is the single idempotent control route (the FE always ships a
    // stable approval_id), so it is the only entry allowed to opt into retry.
    // A regression that flips `retry` on a non-idempotent route (compact, mode,
    // cancel, todos) would double-execute a side effect — pin it here.
    const retryRoutes = AGENT_SESSION_BFF_ROUTES.filter((route) => route.retry);
    expect(retryRoutes).toEqual([
      {
        method: "post",
        path: "/api/agent/sessions/:sessionKey/approve",
        upstreamSuffix: "/approve",
        json: true,
        retry: true,
      },
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
        patch: jest.fn(),
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
      const makeSessionProxyHandler = jest.fn((pathBuilder, proxyOptions = {}) => {
        const proxyHandler = jest.fn();
        proxyHandler.pathBuilder = pathBuilder;
        proxyHandler.proxyOptions = proxyOptions;
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
        "/api/agent/sessions/:sessionKey/todos",
        "/api/agent/sessions/:sessionKey/plan",
        "/api/agent/sessions/:sessionKey/export",
        "/api/agent/sessions/:sessionKey/history",
      ]);
      expect(verbCalls("delete")).toEqual([]);
      expect(verbCalls("patch")).toEqual([
        "/api/agent/sessions/:sessionKey/todos/:listId/items/:itemId",
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

      const todoUpdateCall = app.patch.mock.calls.find(
        (args) => args[0] === "/api/agent/sessions/:sessionKey/todos/:listId/items/:itemId"
      );
      expect(todoUpdateCall).toBeDefined();
      expect(todoUpdateCall).toHaveLength(4);
      expect(todoUpdateCall[1]).toBe(handlers.requireAgentContext);
      expect(todoUpdateCall[2]).toBe(handlers.agentJson1mb);
    });

    it("encodes user, session, and nested todo segments in upstream paths", () => {
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
        "/api/v1/users/user%20with%20space/sessions/agent%3Azaki-bot%3Auser%3A42%3Athread%3Amain/mode"
      );
      const proxyHandler = approveCall[approveCall.length - 1];
      const upstream = proxyHandler.pathBuilder("user with space", {
        params: { sessionKey: "agent:zaki-bot:user:42:thread:main" },
      });
      // Path segments are URI-encoded after Express decodes route params.
      expect(upstream).toBe(
        "/api/v1/users/user%20with%20space/sessions/agent%3Azaki-bot%3Auser%3A42%3Athread%3Amain/approve"
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
        "/api/v1/users/user%20with%20space/sessions/agent%3Azaki-bot%3Auser%3A42%3Athread%3Amain/cancel"
      );

      const contextCall = app.get.mock.calls.find(
        (args) => args[0] === "/api/agent/sessions/:sessionKey/context"
      );
      expect(contextCall).toBeDefined();
      const contextProxyHandler = contextCall[contextCall.length - 1];
      const contextUpstream = contextProxyHandler.pathBuilder("user with space", {
        // Express decodes `/agent%3Azaki.../context` before this builder runs.
        params: { sessionKey: "agent:zaki-bot:user:42:thread:main" },
      });
      expect(contextUpstream).toBe(
        "/api/v1/users/user%20with%20space/sessions/agent%3Azaki-bot%3Auser%3A42%3Athread%3Amain/context"
      );

      const todoUpdateCall = app.patch.mock.calls.find(
        (args) => args[0] === "/api/agent/sessions/:sessionKey/todos/:listId/items/:itemId"
      );
      expect(todoUpdateCall).toBeDefined();
      const todoUpdateProxyHandler = todoUpdateCall[todoUpdateCall.length - 1];
      const todoUpdateUpstream = todoUpdateProxyHandler.pathBuilder("user with space", {
        params: {
          sessionKey: "agent:zaki-bot:user:42:thread:main",
          listId: "list a",
          itemId: "2",
        },
      });
      expect(todoUpdateUpstream).toBe(
        "/api/v1/users/user%20with%20space/sessions/agent%3Azaki-bot%3Auser%3A42%3Athread%3Amain/todos/list%20a/items/2"
      );
    });

    it("passes { retry: true } to the proxy only for /approve, not for non-idempotent routes", () => {
      const app = buildApp();
      const { proxyHandlersBySuffix, ...handlers } = buildHandlers();

      registerAgentSessionBffRoutes(app, handlers);

      const proxyHandlerFor = (verb, path) => {
        const call = app[verb].mock.calls.find((args) => args[0] === path);
        expect(call).toBeDefined();
        return call[call.length - 1];
      };

      // /approve is idempotent (stable approval_id) → retry enabled.
      expect(
        proxyHandlerFor("post", "/api/agent/sessions/:sessionKey/approve").proxyOptions
      ).toEqual({ retry: true });

      // Non-idempotent / read-only routes must NOT retry.
      expect(
        proxyHandlerFor("post", "/api/agent/sessions/:sessionKey/mode").proxyOptions
      ).toEqual({});
      expect(
        proxyHandlerFor("post", "/api/agent/sessions/:sessionKey/cancel").proxyOptions
      ).toEqual({});
      expect(
        proxyHandlerFor("post", "/api/agent/sessions/:sessionKey/compact").proxyOptions
      ).toEqual({});
      expect(
        proxyHandlerFor("get", "/api/agent/sessions/:sessionKey").proxyOptions
      ).toEqual({ softEmptyOnMissing: AGENT_SESSION_IDLE_DETAIL_PAYLOAD });
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

  // ---------------------------------------------------------------------------
  // Agent-panel idle-state normalization (detail / plan / todos / context / history)
  // ---------------------------------------------------------------------------
  // The nullalis engine does not implement /plan or /todos yet (deferred
  // post-launch) so it mis-parses those reads and 400s with
  // `invalid_session_key`; /context legitimately 404s when the thread has no
  // active run, and /history 404s before the first turn exists. Surfacing those raw errors leaks
  //   "Checklist unavailable: invalid_session_key"
  //   "Run plan unavailable: invalid_session_key"
  // into the inspector panel. For these idle-safe READ-ONLY reads the BFF converts
  // a `400 invalid_session_key` or any `404` into HTTP 200 + a clean idle
  // payload the FE renders as "no active run". Everything else passes through.
  describe("agent-panel idle-state normalization", () => {
    it("declares idle payloads that match the FE 'no active run' shapes", () => {
      // src/lib/api.ts: AgentSessionPlanResponse → activePlan = data.active ? data.plan : null
      expect(AGENT_SESSION_IDLE_PLAN_PAYLOAD).toEqual({ active: false, plan: null });
      // src/lib/api.ts: AgentSessionTodosResponse → activeTodoList from lists[] (empty → none)
      expect(AGENT_SESSION_IDLE_TODOS_PAYLOAD).toEqual({ lists: [], current_list_id: null });
      // PowerUserSheet / agentContext treat active:false + code:no_active_session as idle
      expect(AGENT_SESSION_IDLE_CONTEXT_PAYLOAD).toEqual({
        active: false,
        runtime: false,
        code: "no_active_session",
        report: null,
      });
      expect(AGENT_SESSION_IDLE_DETAIL_PAYLOAD).toEqual({
        live: false,
        pending_approval_count: 0,
        pending_approvals: [],
      });
      // src/lib/api.ts: fetchAgentSessionHistory → empty messages means a fresh thread.
      expect(AGENT_SESSION_IDLE_HISTORY_PAYLOAD).toEqual({ messages: [] });
    });

    it("opts only idle-safe reads into softEmptyOnMissing with the right payload", () => {
      const byPath = Object.fromEntries(
        AGENT_SESSION_BFF_ROUTES.map((route) => [route.path, route])
      );

      expect(byPath["/api/agent/sessions/:sessionKey"].softEmptyOnMissing).toEqual(
        AGENT_SESSION_IDLE_DETAIL_PAYLOAD
      );
      expect(byPath["/api/agent/sessions/:sessionKey/plan"].softEmptyOnMissing).toEqual(
        AGENT_SESSION_IDLE_PLAN_PAYLOAD
      );
      expect(byPath["/api/agent/sessions/:sessionKey/todos"].softEmptyOnMissing).toEqual(
        AGENT_SESSION_IDLE_TODOS_PAYLOAD
      );
      expect(byPath["/api/agent/sessions/:sessionKey/context"].softEmptyOnMissing).toEqual(
        AGENT_SESSION_IDLE_CONTEXT_PAYLOAD
      );
      expect(byPath["/api/agent/sessions/:sessionKey/history"].softEmptyOnMissing).toEqual(
        AGENT_SESSION_IDLE_HISTORY_PAYLOAD
      );

      // Every other route — including the mutating ones and the other reads —
      // must NOT opt in, so their upstream status/body is forwarded verbatim.
      for (const route of AGENT_SESSION_BFF_ROUTES) {
        if (
          route.path === "/api/agent/sessions/:sessionKey/plan" ||
          route.path === "/api/agent/sessions/:sessionKey/todos" ||
          route.path === "/api/agent/sessions/:sessionKey/context" ||
          route.path === "/api/agent/sessions/:sessionKey/history" ||
          route.path === "/api/agent/sessions/:sessionKey"
        ) {
          continue;
        }
        expect(route.softEmptyOnMissing).toBeUndefined();
      }
    });

    it("forwards softEmptyOnMissing into proxyOptions only for the opted-in reads", () => {
      const app = {
        get: jest.fn(),
        post: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
      };
      const makeSessionProxyHandler = jest.fn((pathBuilder, proxyOptions = {}) => {
        const handler = jest.fn();
        handler.proxyOptions = proxyOptions;
        return handler;
      });
      registerAgentSessionBffRoutes(app, {
        requireAgentContext: jest.fn(),
        agentJson1mb: jest.fn(),
        makeSessionProxyHandler,
      });

      const proxyOptionsFor = (verb, path) => {
        const call = app[verb].mock.calls.find((args) => args[0] === path);
        expect(call).toBeDefined();
        return call[call.length - 1].proxyOptions;
      };

      expect(proxyOptionsFor("get", "/api/agent/sessions/:sessionKey")).toEqual({
        softEmptyOnMissing: AGENT_SESSION_IDLE_DETAIL_PAYLOAD,
      });
      expect(proxyOptionsFor("get", "/api/agent/sessions/:sessionKey/plan")).toEqual({
        softEmptyOnMissing: AGENT_SESSION_IDLE_PLAN_PAYLOAD,
      });
      expect(proxyOptionsFor("get", "/api/agent/sessions/:sessionKey/todos")).toEqual({
        softEmptyOnMissing: AGENT_SESSION_IDLE_TODOS_PAYLOAD,
      });
      expect(proxyOptionsFor("get", "/api/agent/sessions/:sessionKey/context")).toEqual({
        softEmptyOnMissing: AGENT_SESSION_IDLE_CONTEXT_PAYLOAD,
      });
      expect(proxyOptionsFor("get", "/api/agent/sessions/:sessionKey/history")).toEqual({
        softEmptyOnMissing: AGENT_SESSION_IDLE_HISTORY_PAYLOAD,
      });

      // The mutating + non-opted reads carry no soft-empty option.
      expect(proxyOptionsFor("get", "/api/agent/sessions/:sessionKey/export")).toEqual({});
      expect(proxyOptionsFor("post", "/api/agent/sessions/:sessionKey/compact")).toEqual({});
      expect(proxyOptionsFor("post", "/api/agent/sessions/:sessionKey/mode")).toEqual({});
      expect(proxyOptionsFor("post", "/api/agent/sessions/:sessionKey/cancel")).toEqual({});
      expect(
        proxyOptionsFor("patch", "/api/agent/sessions/:sessionKey/todos/:listId/items/:itemId")
      ).toEqual({});
      // /approve keeps its retry option and gains no soft-empty.
      expect(proxyOptionsFor("post", "/api/agent/sessions/:sessionKey/approve")).toEqual({
        retry: true,
      });
    });

    describe("resolveSoftEmptyAgentResponse", () => {
      const idle = AGENT_SESSION_IDLE_PLAN_PAYLOAD;

      it("returns the idle payload on upstream 400 invalid_session_key", () => {
        expect(
          resolveSoftEmptyAgentResponse(idle, 400, JSON.stringify({ error: "invalid_session_key" }))
        ).toEqual({ soft: true, payload: idle });
        // Also matches when the engine nests it under `code`.
        expect(
          resolveSoftEmptyAgentResponse(idle, 400, JSON.stringify({ code: "invalid_session_key" }))
        ).toEqual({ soft: true, payload: idle });
        // ...or in a bare/extra-text body.
        expect(
          resolveSoftEmptyAgentResponse(idle, 400, "invalid_session_key")
        ).toEqual({ soft: true, payload: idle });
      });

      it("returns the idle payload on any upstream 404 (no active run)", () => {
        expect(resolveSoftEmptyAgentResponse(idle, 404, "")).toEqual({
          soft: true,
          payload: idle,
        });
        expect(
          resolveSoftEmptyAgentResponse(idle, 404, JSON.stringify({ error: "not_found" }))
        ).toEqual({ soft: true, payload: idle });
      });

      it("passes through a 400 with a DIFFERENT error body unchanged", () => {
        expect(
          resolveSoftEmptyAgentResponse(idle, 400, JSON.stringify({ error: "session_not_owned" }))
        ).toEqual({ soft: false });
        expect(
          resolveSoftEmptyAgentResponse(idle, 400, JSON.stringify({ error: "invalid_title" }))
        ).toEqual({ soft: false });
      });

      it("passes through every non-400/404 status unchanged", () => {
        for (const status of [200, 201, 403, 409, 422, 500, 502, 503]) {
          expect(
            resolveSoftEmptyAgentResponse(idle, status, JSON.stringify({ error: "invalid_session_key" }))
          ).toEqual({ soft: false });
        }
      });

      it("never softens when no soft-empty payload is configured (mutating routes)", () => {
        expect(
          resolveSoftEmptyAgentResponse(undefined, 400, JSON.stringify({ error: "invalid_session_key" }))
        ).toEqual({ soft: false });
        expect(resolveSoftEmptyAgentResponse(null, 404, "")).toEqual({ soft: false });
      });
    });
  });
});
