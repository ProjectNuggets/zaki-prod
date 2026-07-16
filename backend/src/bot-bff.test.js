import { describe, expect, it, jest } from "@jest/globals";
import {
  PRODUCT_ERROR_CODES,
  buildProductError,
  buildSseProductError,
  createBotBffHandlers,
  isUpstreamProvisioningFailure,
  looksLikeMachineCode,
  normalizeBotUsageSummaryFromQuota,
  resolveProductErrorMessage,
  sanitizeBotOnboardingState,
  validateBotOnboardingUpdate,
  validateBotSettingsPatch,
} from "./bot-bff.js";

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    jsonBody: null,
    chunks: [],
    headersSent: false,
    writableEnded: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
      return this;
    },
    json(payload) {
      this.headersSent = true;
      this.jsonBody = payload;
      this.writableEnded = true;
      return this;
    },
    write(chunk) {
      this.headersSent = true;
      this.chunks.push(String(chunk));
      return true;
    },
    end(chunk) {
      if (chunk) this.write(chunk);
      this.writableEnded = true;
      return this;
    },
    flushHeaders() {
      this.headersSent = true;
    },
  };
}

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...(init.headers || {}) },
  });
}

function sseResponse(blocks) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const block of blocks) controller.enqueue(encoder.encode(block));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "content-type": "text/event-stream; charset=utf-8" },
  });
}

function crashingSseResponse(initialBlock) {
  const encoder = new TextEncoder();
  let emitted = false;
  const stream = new ReadableStream({
    pull(controller) {
      if (!emitted) {
        emitted = true;
        controller.enqueue(encoder.encode(initialBlock));
        return;
      }
      controller.error(new Error("stream crashed"));
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "content-type": "text/event-stream; charset=utf-8" },
  });
}

function createHandlers(overrides = {}) {
  const sendUpstreamRequest = overrides.sendUpstreamRequest || jest.fn();
  const getAuthContext =
    overrides.getAuthContext ||
    jest.fn(async () => ({ userId: "7", zakiUser: { id: 7, email: "user@example.com" } }));
  const buildUsageSummary =
    overrides.buildUsageSummary ||
    jest.fn(async () => ({
      state: "normal",
      requests_day: 3,
      tokens_day: 0,
      tokens_month: 0,
    }));

  return {
    handlers: createBotBffHandlers({
      getAuthContext,
      sendUpstreamRequest,
      buildUsageSummary,
      loadEntitlement: overrides.loadEntitlement,
      telegramWebhookBaseUrl: overrides.telegramWebhookBaseUrl,
      createRequestId: () => "req-1",
      createIdempotencyKey: () => "idem-1",
      nowFn: overrides.nowFn || (() => 0),
      sleepFn: overrides.sleepFn || jest.fn(async () => {}),
      jitterFn: overrides.jitterFn || (() => 0.5),
    }),
    sendUpstreamRequest,
    getAuthContext,
    buildUsageSummary,
  };
}

describe("bot BFF T6 contract", () => {
  it("enforces auth-bound user identity instead of client-supplied user_id", async () => {
    const { handlers, sendUpstreamRequest } = createHandlers({
      sendUpstreamRequest: jest.fn(async ({ userId, body }) => {
        expect(userId).toBe("7");
        expect(body.user_id).toBe("7");
        return jsonResponse({ status: "provisioned" });
      }),
    });
    const req = { body: { user_id: "999", nickname: "nova" }, headers: {} };
    const res = createMockRes();

    await handlers.provision(req, res);

    expect(sendUpstreamRequest).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ status: "provisioned" });
  });

  it("retries lock conflicts and succeeds within budget", async () => {
    const sleepFn = jest.fn(async () => {});
    let attempt = 0;
    const { handlers, sendUpstreamRequest } = createHandlers({
      sleepFn,
      sendUpstreamRequest: jest.fn(async () => {
        attempt += 1;
        if (attempt === 1) {
          return jsonResponse({ error: "ownership_lock_conflict", retry_after_ms: 120 }, { status: 409 });
        }
        return jsonResponse({ status: "provisioned" });
      }),
    });
    const req = { body: {}, headers: {} };
    const res = createMockRes();

    await handlers.provision(req, res);

    expect(sendUpstreamRequest).toHaveBeenCalledTimes(2);
    expect(sleepFn).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ status: "provisioned" });
  });

  it("preserves enriched onboarding setup metadata", async () => {
    const setup = {
      channels: {
        telegram: {
          status: "connected",
          bot_username: "@zaki_bot",
        },
        slack: {
          instructions: ["Open Slack", "Add the app", "Authorize the workspace"],
        },
      },
      guidance: {
        summary: "Finish channels to complete your bot setup.",
      },
    };

    expect(
      sanitizeBotOnboardingState({
        completed: true,
        completed_at_s: 1760000000,
        setup,
      })
    ).toEqual({
      completed: true,
      completed_at_s: 1760000000,
      can_start_chat_now: undefined,
      minimum_required: undefined,
      operator_configure_model_provider: undefined,
      setup,
    });
  });

  it("preserves onboarding readiness metadata needed by the settings plane", () => {
    expect(
      sanitizeBotOnboardingState({
        completed: false,
        completed_at_s: null,
        can_start_chat_now: false,
        minimum_required: ["telegram", " model_provider "],
        operator_configure_model_provider: true,
        setup: null,
      })
    ).toEqual({
      completed: false,
      completed_at_s: null,
      can_start_chat_now: false,
      minimum_required: ["telegram", "model_provider"],
      operator_configure_model_provider: true,
      setup: null,
    });
  });

  it("accepts the engine identity document when the user names their agent", () => {
    const identity = "# IDENTITY.md - ZAKI BOT Identity\n\n- **Name:** Nova";

    expect(
      validateBotOnboardingUpdate({
        completed: true,
        identity,
      })
    ).toEqual({
      success: true,
      data: {
        completed: true,
        identity,
      },
    });
  });

  it("rejects UI-specific fields inside onboarding setup metadata", () => {
    expect(() =>
      sanitizeBotOnboardingState({
        completed: false,
        completed_at_s: null,
        setup: {
          channels: {
            telegram: {
              status: "connected",
              panel_tab: "telegram",
            },
          },
        },
      })
    ).toThrow(/ui-specific fields are not allowed/i);
  });

  it("returns 503 temporary_contention when lock retries exhaust", async () => {
    const sleepFn = jest.fn(async () => {});
    const { handlers, sendUpstreamRequest } = createHandlers({
      sleepFn,
      sendUpstreamRequest: jest.fn(async () =>
        jsonResponse({ error: "ownership_lock_conflict", retry_after_ms: 100 }, { status: 409 })
      ),
    });
    const req = { body: { completed: true }, headers: {} };
    const res = createMockRes();

    await handlers.putOnboarding(req, res);

    expect(sendUpstreamRequest).toHaveBeenCalledTimes(3);
    expect(sleepFn).toHaveBeenCalledTimes(2);
    expect(res.statusCode).toBe(503);
    expect(res.jsonBody).toEqual(
      expect.objectContaining({
        error: PRODUCT_ERROR_CODES.TEMPORARY_CONTENTION,
        retryable: true,
        request_id: "req-1",
      })
    );
  });

  it("derives session_key from auth-bound user identity and thread id", async () => {
    const sendUpstreamRequest = jest.fn(async ({ userId, body }) => {
      expect(userId).toBe("7");
      expect(body.session_key).toBe("agent:zaki-bot:user:7:thread:thread-42");
      expect(body.user_id).toBeUndefined();
      return sseResponse(['event: done\ndata: {"ok":true}\n\n']);
    });
    const { handlers } = createHandlers({ sendUpstreamRequest });
    const req = { body: { message: "hello", threadId: "thread-42", user_id: "999" }, headers: {} };
    const res = createMockRes();

    await handlers.chatStream(req, res);

    expect(sendUpstreamRequest).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.chunks.join("")).toContain("event: done");
  });

  it("defaults derived session_key to thread:main when thread id is absent", async () => {
    const sendUpstreamRequest = jest.fn(async ({ body }) => {
      expect(body.session_key).toBe("agent:zaki-bot:user:7:thread:main");
      return sseResponse(['event: done\ndata: {"ok":true}\n\n']);
    });
    const { handlers } = createHandlers({ sendUpstreamRequest });
    const req = { body: { message: "hello" }, headers: {} };
    const res = createMockRes();

    await handlers.chatStream(req, res);

    expect(sendUpstreamRequest).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
  });

  it("rejects client supplied session_key for a different user", async () => {
    const { handlers, sendUpstreamRequest } = createHandlers();
    const req = {
      body: {
        message: "hello",
        session_key: "agent:zaki-bot:user:99:thread:thread-42",
      },
      headers: {},
    };
    const res = createMockRes();

    await handlers.chatStream(req, res);

    expect(sendUpstreamRequest).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toEqual(
      expect.objectContaining({
        error: PRODUCT_ERROR_CODES.FORBIDDEN,
        message: "invalid chat payload or session_key",
      })
    );
  });

  it("rejects invalid session_key lane classes", async () => {
    const { handlers, sendUpstreamRequest } = createHandlers();
    const req = {
      body: {
        message: "hello",
        session_key: "agent:zaki-bot:user:7:workspace:thread-42",
      },
      headers: {},
    };
    const res = createMockRes();

    await handlers.chatStream(req, res);

    expect(sendUpstreamRequest).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toEqual(
      expect.objectContaining({
        error: PRODUCT_ERROR_CODES.FORBIDDEN,
        message: "invalid chat payload or session_key",
      })
    );
  });

  it("accepts valid explicit thread session_key overrides", async () => {
    const sendUpstreamRequest = jest.fn(async ({ body }) => {
      expect(body.session_key).toBe("agent:zaki-bot:user:7:thread:thread-99");
      return sseResponse(['event: done\ndata: {"ok":true}\n\n']);
    });
    const { handlers } = createHandlers({ sendUpstreamRequest });
    const req = {
      body: {
        message: "hello",
        threadId: "thread-42",
        session_key: "agent:zaki-bot:user:7:thread:thread-99",
      },
      headers: {},
    };
    const res = createMockRes();

    await handlers.chatStream(req, res);

    expect(sendUpstreamRequest).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
  });

  it("accepts valid explicit task session_key overrides", async () => {
    const sendUpstreamRequest = jest.fn(async ({ body }) => {
      expect(body.session_key).toBe("agent:zaki-bot:user:7:task:task-77");
      return sseResponse(['event: done\ndata: {"ok":true}\n\n']);
    });
    const { handlers } = createHandlers({ sendUpstreamRequest });
    const req = {
      body: {
        message: "hello",
        session_key: "agent:zaki-bot:user:7:task:task-77",
      },
      headers: {},
    };
    const res = createMockRes();

    await handlers.chatStream(req, res);

    expect(sendUpstreamRequest).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
  });

  it("normalizes upstream session_key validation failures to a clear 400 product error", async () => {
    const { handlers } = createHandlers({
      sendUpstreamRequest: jest.fn(async () =>
        jsonResponse({ error: "invalid_session_lane", message: "invalid_session_lane" }, { status: 400 })
      ),
    });
    const req = { body: { message: "hello", session_key: "agent:zaki-bot:user:7:main" }, headers: {} };
    const res = createMockRes();

    await handlers.chatStream(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toEqual(
      expect.objectContaining({
        error: PRODUCT_ERROR_CODES.FORBIDDEN,
        message: "invalid chat payload or session_key",
      })
    );
  });

  it("retries SSE conflicts before stream establishment but never retries after stream bytes are forwarded", async () => {
    const preStreamSend = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ error: "ownership_lock_conflict", retry_after_ms: 100 }, { status: 409 })
      )
      .mockResolvedValueOnce(
        sseResponse(['event: token\ndata: {"text":"hello"}\n\n', 'event: done\ndata: {"ok":true}\n\n'])
      );
    const firstPass = createHandlers({ sendUpstreamRequest: preStreamSend });
    const firstReq = { body: { message: "hello" }, headers: {} };
    const firstRes = createMockRes();

    await firstPass.handlers.chatStream(firstReq, firstRes);

    expect(preStreamSend).toHaveBeenCalledTimes(2);
    expect(firstRes.chunks.join("")).toContain("event: token");

    const postStreamSend = jest.fn(async () =>
      crashingSseResponse('event: token\ndata: {"text":"hello"}\n\n')
    );
    const secondPass = createHandlers({ sendUpstreamRequest: postStreamSend });
    const secondReq = { body: { message: "hello again" }, headers: {} };
    const secondRes = createMockRes();

    await secondPass.handlers.chatStream(secondReq, secondRes);

    expect(postStreamSend).toHaveBeenCalledTimes(1);
    expect(secondRes.chunks.join("")).toContain("event: error");
    expect(secondRes.chunks.join("")).toContain(PRODUCT_ERROR_CODES.TEMPORARY_CONTENTION);
  });

  it("roundtrips settings profiles and rejects UI-specific fields", async () => {
    const profile = {
      group_activation: "always",
      proactive_updates: true,
      voice_replies: false,
      session_timeout_minutes: 45,
      assistant_mode: "deep",
      autonomy: "supervised",
      dream_enabled: true,
      query_expansion_enabled: false,
      selected_model: "claude-opus-4.7",
    };
    const { handlers, sendUpstreamRequest } = createHandlers({
      sendUpstreamRequest: jest.fn(async ({ body }) => {
        expect(body).toEqual(profile);
        return jsonResponse(profile);
      }),
    });
    const req = { body: profile, headers: {} };
    const res = createMockRes();

    await handlers.patchSettings(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual(profile);

    const invalidPatch = validateBotSettingsPatch({
      ...profile,
      view_mode: "compact",
    });
    expect(invalidPatch.success).toBe(false);
    expect(validateBotSettingsPatch({ assistant_mode: "deep" }).success).toBe(true);
    expect(validateBotSettingsPatch({ assistant_mode: "turbo" }).success).toBe(false);

    const invalidReq = { body: { view_mode: "compact" }, headers: {} };
    const invalidRes = createMockRes();
    await handlers.patchSettings(invalidReq, invalidRes);
    expect(sendUpstreamRequest).toHaveBeenCalledTimes(1);
    expect(invalidRes.statusCode).toBe(400);
    expect(invalidRes.jsonBody).toEqual(
      expect.objectContaining({
        error: PRODUCT_ERROR_CODES.SETTINGS_UPDATE_FAILED,
      })
    );
  });

  it("roundtrips heartbeat state through the bot BFF", async () => {
    const { handlers } = createHandlers({
      sendUpstreamRequest: jest.fn(async ({ method, body }) => {
        if (method === "GET") {
          return jsonResponse({ enabled: true, interval_minutes: 15, prompt: "Daily summary" });
        }
        expect(body).toEqual({ enabled: false });
        return jsonResponse({ enabled: false, interval_minutes: 15, prompt: "Daily summary" });
      }),
    });

    const getReq = { body: {}, headers: {} };
    const getRes = createMockRes();
    await handlers.getHeartbeat(getReq, getRes);
    expect(getRes.statusCode).toBe(200);
    expect(getRes.jsonBody).toEqual({
      enabled: true,
      interval_minutes: 15,
      prompt: "Daily summary",
    });

    const putReq = { body: { enabled: false }, headers: {} };
    const putRes = createMockRes();
    await handlers.putHeartbeat(putReq, putRes);
    expect(putRes.statusCode).toBe(200);
    expect(putRes.jsonBody).toEqual({
      enabled: false,
      interval_minutes: 15,
      prompt: "Daily summary",
    });
  });

  it("maps invalid telegram token failures to invalid_telegram_token", async () => {
    const { handlers } = createHandlers({
      telegramWebhookBaseUrl: "https://agent.zaki.test",
      sendUpstreamRequest: jest.fn(async () =>
        jsonResponse({ error: "telegram returned invalid token" }, { status: 400 })
      ),
    });
    const req = { body: { bot_token: "bad-token" }, headers: {} };
    const res = createMockRes();

    await handlers.telegramConnect(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toEqual(
      expect.objectContaining({
        error: PRODUCT_ERROR_CODES.INVALID_TELEGRAM_TOKEN,
      })
    );
  });

  it("fails Telegram connect fast when no platform webhook base or override is available", async () => {
    const { handlers, sendUpstreamRequest } = createHandlers();
    const req = { body: { bot_token: "123456:ABC", allow_from: ["1"] }, headers: {} };
    const res = createMockRes();

    await handlers.telegramConnect(req, res);

    expect(sendUpstreamRequest).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toEqual(
      expect.objectContaining({
        error: PRODUCT_ERROR_CODES.FORBIDDEN,
        message: expect.stringContaining("Webhook base URL is not configured"),
      })
    );
  });

  it("injects the platform webhook base header for Telegram connect when the user does not provide one", async () => {
    const sendUpstreamRequest = jest.fn(async ({ headers }) => {
      expect(headers).toEqual(
        expect.objectContaining({
          "X-Webhook-Base-Url": "https://agent.zaki.test",
        })
      );
      return jsonResponse({ status: "connected", channel: "telegram" });
    });
    const { handlers } = createHandlers({
      telegramWebhookBaseUrl: "https://agent.zaki.test",
      sendUpstreamRequest,
    });
    const req = { body: { bot_token: "123456:ABC", allow_from: ["1"] }, headers: {} };
    const res = createMockRes();

    await handlers.telegramConnect(req, res);

    expect(sendUpstreamRequest).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ status: "connected", channel: "telegram" });
  });

  it("maps unavailable usage telemetry to usage_unavailable", async () => {
    const { handlers } = createHandlers({
      buildUsageSummary: jest.fn(async () => {
        throw new Error("quota backend offline");
      }),
    });
    const req = { headers: {} };
    const res = createMockRes();

    await handlers.usage(req, res);

    expect(res.statusCode).toBe(503);
    expect(res.jsonBody).toEqual(
      expect.objectContaining({
        error: PRODUCT_ERROR_CODES.USAGE_UNAVAILABLE,
        retryable: true,
      })
    );
  });

  it("returns the same product DTO for synthetic web and mobile clients unchanged", async () => {
    const settingsPayload = {
      group_activation: "mention",
      proactive_updates: true,
      voice_replies: false,
      session_timeout_minutes: 30,
      assistant_mode: "balanced",
      dream_enabled: true,
      query_expansion_enabled: false,
      selected_model: null,
    };
    const { handlers } = createHandlers({
      sendUpstreamRequest: jest.fn(async () => jsonResponse(settingsPayload)),
    });
    const req = { headers: {} };
    const res = createMockRes();

    await handlers.getSettings(req, res);

    const webClient = (payload) => payload.group_activation;
    const mobileClient = (payload) => `${payload.session_timeout_minutes}:${payload.voice_replies}`;

    expect(webClient(res.jsonBody)).toBe("mention");
    expect(mobileClient(res.jsonBody)).toBe("30:false");
    expect(Object.keys(res.jsonBody).sort()).toEqual([
      "assistant_mode",
      "dream_enabled",
      "group_activation",
      "proactive_updates",
      "query_expansion_enabled",
      "selected_model",
      "session_timeout_minutes",
      "voice_replies",
    ]);
  });
});

describe("normalizeBotUsageSummaryFromQuota", () => {
  it("maps quota payloads into stable usage summaries", () => {
    expect(normalizeBotUsageSummaryFromQuota({ used: 4, remaining: 1 })).toEqual({
      state: "normal",
      requests_day: 4,
      tokens_day: 0,
      tokens_month: 0,
    });
    expect(normalizeBotUsageSummaryFromQuota({ used: 5, remaining: 0 })).toEqual({
      state: "limit_reached",
      requests_day: 5,
      tokens_day: 0,
      tokens_month: 0,
    });
  });
});

describe("bot BFF provision — entitlement forwarding (S2.1)", () => {
  it("forwards the authenticated email to loadEntitlement (enables super-admin override)", async () => {
    // The provision handler is the engine-bound entitlement chokepoint. It
    // must pass the authenticated email through so loadEntitlement can apply
    // the owner-only super-admin override (engine payload only; wallet
    // metering is a separate path and is not exercised here).
    const loadEntitlement = jest.fn(async (userId, opts) => {
      expect(userId).toBe("7");
      expect(opts).toEqual({ email: "owner@novanuggets.com" });
      return { plan_tier: "pro", status: "active", period_end_unix: null };
    });
    const { handlers, sendUpstreamRequest } = createHandlers({
      getAuthContext: jest.fn(async () => ({
        userId: "7",
        email: "owner@novanuggets.com",
        zakiUser: { id: 7, email: "owner@novanuggets.com" },
      })),
      loadEntitlement,
      sendUpstreamRequest: jest.fn(async ({ body }) => {
        expect(body).toEqual({
          user_id: "7",
          nickname: "nova",
          plan_tier: "pro",
          status: "active",
          period_end_unix: null,
        });
        return jsonResponse({ status: "provisioned" });
      }),
    });
    const req = { body: { nickname: "nova" }, headers: {} };
    const res = createMockRes();

    await handlers.provision(req, res);

    expect(loadEntitlement).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
  });

  it("merges loadEntitlement result into the outbound provision payload", async () => {
    const loadEntitlement = jest.fn(async (userId) => {
      expect(userId).toBe("7");
      return {
        plan_tier: "pro",
        status: "active",
        period_end_unix: 1735689600,
      };
    });
    const { handlers, sendUpstreamRequest } = createHandlers({
      loadEntitlement,
      sendUpstreamRequest: jest.fn(async ({ body }) => {
        expect(body).toEqual({
          user_id: "7",
          nickname: "nova",
          plan_tier: "pro",
          status: "active",
          period_end_unix: 1735689600,
        });
        return jsonResponse({ status: "provisioned" });
      }),
    });
    const req = { body: { nickname: "nova" }, headers: {} };
    const res = createMockRes();

    await handlers.provision(req, res);

    expect(loadEntitlement).toHaveBeenCalledTimes(1);
    expect(sendUpstreamRequest).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ status: "provisioned" });
  });

  it("still forwards user_id when entitlement lookup returns null (soft-fail)", async () => {
    const loadEntitlement = jest.fn(async () => null);
    const { handlers, sendUpstreamRequest } = createHandlers({
      loadEntitlement,
      sendUpstreamRequest: jest.fn(async ({ body }) => {
        expect(body).toEqual({ user_id: "7", nickname: "nova" });
        expect(body.plan_tier).toBeUndefined();
        return jsonResponse({ status: "provisioned" });
      }),
    });
    const req = { body: { nickname: "nova" }, headers: {} };
    const res = createMockRes();

    await handlers.provision(req, res);

    expect(loadEntitlement).toHaveBeenCalledTimes(1);
    expect(sendUpstreamRequest).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
  });

  it("operates normally when loadEntitlement injection is absent", async () => {
    const { handlers, sendUpstreamRequest } = createHandlers({
      sendUpstreamRequest: jest.fn(async ({ body }) => {
        expect(body.user_id).toBe("7");
        expect(body.plan_tier).toBeUndefined();
        return jsonResponse({ status: "provisioned" });
      }),
    });
    const req = { body: {}, headers: {} };
    const res = createMockRes();

    await handlers.provision(req, res);

    expect(sendUpstreamRequest).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
  });

  it("client-supplied plan_tier is overwritten by the trusted entitlement lookup", async () => {
    const loadEntitlement = jest.fn(async () => ({
      plan_tier: "free",
      status: "expired",
      period_end_unix: null,
    }));
    const { handlers, sendUpstreamRequest } = createHandlers({
      loadEntitlement,
      sendUpstreamRequest: jest.fn(async ({ body }) => {
        expect(body.plan_tier).toBe("free");
        expect(body.status).toBe("expired");
        expect(body.period_end_unix).toBeNull();
        return jsonResponse({ status: "provisioned" });
      }),
    });
    const req = {
      body: { plan_tier: "enterprise", status: "active", period_end_unix: 9999999999 },
      headers: {},
    };
    const res = createMockRes();

    await handlers.provision(req, res);

    expect(sendUpstreamRequest).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
  });
});

describe("isUpstreamProvisioningFailure — FK/not-found classifier (B4/P1-16)", () => {
  it("matches an explicit user_not_found code", () => {
    expect(isUpstreamProvisioningFailure({ code: "user_not_found" }, 400)).toBe(true);
  });

  it("matches a foreign-key violation error string", () => {
    expect(
      isUpstreamProvisioningFailure(
        { error: "insert or update on table violates foreign key constraint" },
        500
      )
    ).toBe(true);
  });

  it("matches a 'user does not exist' message", () => {
    expect(
      isUpstreamProvisioningFailure({ message: "User does not exist" }, 422)
    ).toBe(true);
  });

  it("matches a bare 404 with no descriptive body", () => {
    expect(isUpstreamProvisioningFailure(null, 404)).toBe(true);
    expect(isUpstreamProvisioningFailure({}, 404)).toBe(true);
  });

  it("does NOT match a session-key validation failure", () => {
    expect(isUpstreamProvisioningFailure({ code: "invalid_session_key" }, 400)).toBe(false);
  });

  it("does NOT match an unrelated 503", () => {
    expect(
      isUpstreamProvisioningFailure({ error: "engine temporarily unavailable" }, 503)
    ).toBe(false);
  });

  it("does NOT match a generic 200/ok payload", () => {
    expect(isUpstreamProvisioningFailure({ status: "ok" }, 200)).toBe(false);
  });
});


// ─────────────────────────────────────────────────────────────────────────────────
// WP-C — the BFF must NEVER emit a bare machine code with no user-facing message.
//
// The regression: `buildProductError` put the machine code in `error` and the frontend
// preferred `error` over `message`, so `invalid_session_key` rendered verbatim at the
// user. The envelope now ALWAYS carries a human `message` plus an explicit `code`.
// ─────────────────────────────────────────────────────────────────────────────────

describe("WP-C — buildProductError never emits a bare code", () => {
  it("always carries a machine `code` AND a human `message`", () => {
    const payload = buildProductError({
      error: "invalid_session_key",
      retryable: false,
      requestId: "req-1",
    });

    // The machine code is preserved for the client to switch on...
    expect(payload.code).toBe("invalid_session_key");
    expect(payload.error).toBe("invalid_session_key");
    // ...but a human sentence is ALWAYS present to render.
    expect(payload.message).toBeTruthy();
    expect(looksLikeMachineCode(payload.message)).toBe(false);
    expect(payload.message).not.toContain("invalid_session_key");
    expect(payload.message).toMatch(/no longer valid|new chat/i);
    expect(payload.request_id).toBe("req-1");
  });

  it("keeps a caller-supplied human message", () => {
    const payload = buildProductError({
      error: PRODUCT_ERROR_CODES.PROVISION_FAILED,
      message: "Agent setup is unavailable.",
      retryable: true,
      requestId: "req-2",
    });
    expect(payload.message).toBe("Agent setup is unavailable.");
    expect(payload.code).toBe("provision_failed");
    expect(payload.retryable).toBe(true);
  });

  it("REJECTS a message that is really a machine code", () => {
    const payload = buildProductError({
      error: "provision_failed",
      // Somebody passed the code through as the "message" — that is not a message.
      message: "provision_failed",
      requestId: "req-3",
    });
    expect(payload.message).not.toBe("provision_failed");
    expect(looksLikeMachineCode(payload.message)).toBe(false);
  });

  it("every known PRODUCT_ERROR_CODE resolves to human copy", () => {
    for (const code of Object.values(PRODUCT_ERROR_CODES)) {
      const payload = buildProductError({ error: code, requestId: "r" });
      expect(payload.message).toBeTruthy();
      expect(looksLikeMachineCode(payload.message)).toBe(false);
      expect(payload.message).not.toBe(code);
    }
  });

  it("an unknown code degrades to generic human copy, never to the code", () => {
    const payload = buildProductError({ error: "brand_new_code", requestId: "r" });
    expect(payload.message).not.toContain("brand_new_code");
    expect(looksLikeMachineCode(payload.message)).toBe(false);
  });

  it("the SSE error frame carries the same guarantee", () => {
    const frame = buildSseProductError({ error: "invalid_session_key", retryable: false });
    expect(frame.code).toBe("invalid_session_key");
    expect(looksLikeMachineCode(frame.message)).toBe(false);
    expect(frame.message).not.toContain("invalid_session_key");
  });
});

describe("WP-C — looksLikeMachineCode / resolveProductErrorMessage", () => {
  it("distinguishes machine codes from human sentences", () => {
    expect(looksLikeMachineCode("invalid_session_key")).toBe(true);
    expect(looksLikeMachineCode("daily_limit_reached")).toBe(true);
    expect(looksLikeMachineCode("This chat session is no longer valid.")).toBe(false);
    expect(looksLikeMachineCode("")).toBe(false);
  });

  it("maps the taxonomy codes onto tailored copy", () => {
    expect(resolveProductErrorMessage("rate_limited")).toMatch(/faster than/i);
    expect(resolveProductErrorMessage("context_window_exceeded")).toMatch(/shorten/i);
    expect(resolveProductErrorMessage("model_overload")).toMatch(/switch/i);
    expect(resolveProductErrorMessage("timeout")).toMatch(/too long/i);
    expect(resolveProductErrorMessage("content_filter")).toMatch(/rephras/i);
  });
});
