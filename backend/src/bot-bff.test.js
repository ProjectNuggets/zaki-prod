import { describe, expect, it, jest } from "@jest/globals";
import {
  PRODUCT_ERROR_CODES,
  createBotBffHandlers,
  normalizeBotUsageSummaryFromQuota,
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
      assistant_mode: "deep",
      group_activation: "always",
      proactive_updates: true,
      voice_replies: false,
      session_timeout_minutes: 45,
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

  it("maps invalid telegram token failures to invalid_telegram_token", async () => {
    const { handlers } = createHandlers({
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
      assistant_mode: "balanced",
      group_activation: "mention",
      proactive_updates: true,
      voice_replies: false,
      session_timeout_minutes: 30,
    };
    const { handlers } = createHandlers({
      sendUpstreamRequest: jest.fn(async () => jsonResponse(settingsPayload)),
    });
    const req = { headers: {} };
    const res = createMockRes();

    await handlers.getSettings(req, res);

    const webClient = (payload) => `${payload.assistant_mode}:${payload.group_activation}`;
    const mobileClient = (payload) => `${payload.session_timeout_minutes}:${payload.voice_replies}`;

    expect(webClient(res.jsonBody)).toBe("balanced:mention");
    expect(mobileClient(res.jsonBody)).toBe("30:false");
    expect(Object.keys(res.jsonBody).sort()).toEqual([
      "assistant_mode",
      "group_activation",
      "proactive_updates",
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
