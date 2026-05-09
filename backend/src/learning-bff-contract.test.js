import { describe, expect, test } from "@jest/globals";
import { readFileSync } from "node:fs";
import { once } from "node:events";
import { PassThrough } from "node:stream";
import {
  buildLearningConfigErrorPayload,
  buildLearningAcceptedPayload,
  buildLearningDisabledPayload,
  buildLearningForwardHeaders,
  buildLearningProxyHeaders,
  checkLearningContentLength,
  createLearningByteLimitTransform,
  extractLearningTelegramUpdateSender,
  extractLearningWsToken,
  filterLearningTutorAgentChannelsConfig,
  filterLearningTutorAgentChannelsSchema,
  findLearningRequestSizeError,
  getLearningBase,
  isLearningTelegramQuotaFreeUpdate,
  isLearningTelegramSenderAllowed,
  isLearningEnabled,
  mapLearningUpstreamFailure,
  mergeLearningTutorAgentChannelSecrets,
  resolveCanonicalLearningUserId,
  resolveLearningMaxRequestBytes,
  sanitizeLearningClientPayload,
  sanitizeLearningProviderText,
  sanitizeLearningTutorAgentPayload,
  sanitizeLearningUpstreamPayload,
  sanitizeLearningPath,
  sanitizeLearningWsClientMessage,
  shouldConsumeLearningIngressQuota,
  shouldConsumeLearningWsQuota,
} from "./learning-bff-contract.js";

describe("learning BFF contract", () => {
  test("normalizes feature flag values", () => {
    expect(isLearningEnabled("true")).toBe(true);
    expect(isLearningEnabled("1")).toBe(true);
    expect(isLearningEnabled("yes")).toBe(true);
    expect(isLearningEnabled("false")).toBe(false);
    expect(isLearningEnabled("")).toBe(false);
  });

  test("normalizes base URL", () => {
    expect(getLearningBase(" http://learning:8001/// ")).toBe("http://learning:8001");
    expect(getLearningBase("")).toBeNull();
  });

  test("resolves canonical user id from ZAKI auth result", () => {
    expect(resolveCanonicalLearningUserId({ zakiUser: { id: 42 } })).toBe("42");
    expect(resolveCanonicalLearningUserId({ zakiUser: { id: "7" } })).toBe("7");
    expect(resolveCanonicalLearningUserId({ zakiUser: { id: "abc" } })).toBeNull();
    expect(resolveCanonicalLearningUserId({ zakiUser: { id: 0 } })).toBeNull();
  });

  test("builds downstream auth headers without browser auth", () => {
    const headers = buildLearningForwardHeaders({
      internalToken: "secret",
      userId: "7",
      requestId: "req-1",
    });
    expect(headers).toMatchObject({
      "Content-Type": "application/json",
      "X-Internal-Token": "secret",
      "X-Zaki-User-Id": "7",
      "X-Request-Id": "req-1",
    });
  });

  test("throws for invalid user id", () => {
    expect(() =>
      buildLearningForwardHeaders({
        internalToken: "secret",
        userId: "",
        requestId: "req-1",
      })
    ).toThrow("invalid_user_id");
  });

  test("strips browser and internal headers when proxying", () => {
    const headers = buildLearningProxyHeaders(
      {
        headers: {
          authorization: "Bearer browser-token",
          cookie: "refresh=secret",
          "x-internal-token": "evil",
          "x-zaki-user-id": "999",
          "x-client-version": "1.2.3",
          connection: "upgrade",
        },
      },
      {
        internalToken: "service-token",
        userId: "7",
        requestId: "req-2",
      }
    );
    expect(headers.authorization).toBeUndefined();
    expect(headers.cookie).toBeUndefined();
    expect(headers["x-internal-token"]).toBeUndefined();
    expect(headers["x-zaki-user-id"]).toBeUndefined();
    expect(headers["X-Internal-Token"]).toBe("service-token");
    expect(headers["X-Zaki-User-Id"]).toBe("7");
    expect(headers["x-client-version"]).toBe("1.2.3");
  });

  test("sanitizes learning upstream paths", () => {
    expect(sanitizeLearningPath("api/v1/sessions?limit=10")).toBe("/api/v1/sessions?limit=10");
    expect(sanitizeLearningPath("/api/v1/book/books/book_1")).toBe("/api/v1/book/books/book_1");
    expect(() => sanitizeLearningPath("/api/v1/sessions\nx")).toThrow("invalid_learning_path");
    expect(() => sanitizeLearningPath("https://evil.test/api")).toThrow("invalid_learning_path");
  });

  test("builds stable disabled and config errors", () => {
    expect(buildLearningDisabledPayload("req-3")).toMatchObject({
      code: "learning_disabled",
      requestId: "req-3",
    });
    expect(buildLearningConfigErrorPayload("missing", "req-4")).toMatchObject({
      code: "learning_config_missing",
      error: "missing",
      requestId: "req-4",
    });
  });

  test("builds stable accepted payload for long-running learning tasks", () => {
    expect(
      buildLearningAcceptedPayload({
        requestId: "req-book-timeout",
        action: "book_compile_page",
        poll: {
          method: "GET",
          path: "/api/learning/books/book-1",
          interval_ms: 2000,
          resource_type: "book",
          resource_id: "book-1",
        },
      })
    ).toEqual({
      code: "learning_action_still_running",
      status: "accepted",
      action: "book_compile_page",
      error: "Learning task is still running.",
      message: "Learning task is still running. Progress will update automatically.",
      poll: {
        method: "GET",
        path: "/api/learning/books/book-1",
        interval_ms: 2000,
        resource_type: "book",
        resource_id: "book-1",
      },
      retryable: false,
      requestId: "req-book-timeout",
    });
  });

  test("maps upstream failures without leaking internals", () => {
    expect(mapLearningUpstreamFailure(401, "req-5")).toEqual({
      status: 502,
      body: expect.objectContaining({
        code: "learning_upstream_auth_failed",
        requestId: "req-5",
      }),
    });
    expect(mapLearningUpstreamFailure(404, "req-6")).toEqual({
      status: 404,
      body: expect.objectContaining({ code: "learning_resource_not_found" }),
    });
    expect(mapLearningUpstreamFailure(503, "req-7")).toEqual({
      status: 503,
      body: expect.objectContaining({ code: "learning_unavailable", retryable: true }),
    });
    expect(mapLearningUpstreamFailure(400, "req-8")).toBeNull();
  });

  test("extracts websocket token from authorization or protocol", () => {
    expect(
      extractLearningWsToken({ headers: { authorization: "Bearer access-token" } })
    ).toBe("access-token");
    expect(
      extractLearningWsToken({
        headers: {
          "sec-websocket-protocol": "zaki.learning.v1, zaki.jwt.access-token-2",
        },
      })
    ).toBe("access-token-2");
    expect(extractLearningWsToken({ headers: {} })).toBeNull();
  });

  test("sanitizes client websocket payloads through a root allowlist", () => {
    const sanitized = sanitizeLearningClientPayload(
      {
        type: "start_turn",
        content: "Explain this",
        provider: "evil",
        unknown_root: "drop",
        config: {
          mode: "standard",
          provider_config: { api_key: "secret" },
          nested: [{ model: "evil-model", keep: true }],
        },
      },
      { root: true }
    );
    expect(sanitized).toEqual({
      type: "start_turn",
      content: "Explain this",
      config: {
        mode: "standard",
        nested: [{ keep: true }],
      },
    });

    expect(sanitizeLearningClientPayload({ unknown_root: "drop" }, { root: true })).toEqual({});
    expect(
      sanitizeLearningClientPayload(
        { type: "subscribe", book_id: "book-1", unknown_root: "drop" },
        { root: true }
      )
    ).toEqual({ type: "subscribe", book_id: "book-1" });
  });

  test("recursively strips provider routing variants from learning payloads", () => {
    const sanitized = sanitizeLearningClientPayload({
      topic: "linear algebra",
      apiKey: "secret",
      baseURL: "https://evil.example",
      modelName: "evil-model",
      providerSettings: {
        provider: "evil",
      },
      nested: [
        {
          provider_config: { api_key: "secret" },
          llmSelection: "evil-provider",
          keep: true,
        },
      ],
    });

    expect(sanitized).toEqual({
      topic: "linear algebra",
      nested: [{ keep: true }],
    });
  });

  test("sanitizes upstream learning payloads before browser display", () => {
    expect(
      sanitizeLearningProviderText("<think>private reasoning</think>\n\nVisible answer")
    ).toBe("Visible answer");
    expect(sanitizeLearningProviderText("<think>private reasoning")).toBe("");
    expect(sanitizeLearningProviderText("I am DeepTutor.")).toBe("I am ZAKI Deep Learning.");

    expect(
      sanitizeLearningUpstreamPayload({
        items: [
          {
            type: "chat",
            summary: "Intro <think>secret</think> safe from Deep Tutor",
            nested: { response: "<think>hidden</think>\n\nShown by deeptutor" },
          },
          { type: "thinking", content: "internal chain" },
        ],
      })
    ).toEqual({
      items: [
        {
          type: "chat",
          summary: "Intro  safe from ZAKI Deep Learning",
          nested: { response: "Shown by ZAKI Deep Learning" },
        },
        { type: "thinking", content: "" },
      ],
    });
  });

  test("learning mutation proxies do not forward raw request bodies", () => {
    const source = readFileSync(new URL("./index.js", import.meta.url), "utf8");
    const learningStart = source.indexOf("// LEARNING ENGINE BFF");
    const learningEnd = source.indexOf("// SHARE CONVERSATION ROUTES");
    expect(learningStart).toBeGreaterThan(-1);
    expect(learningEnd).toBeGreaterThan(learningStart);

    const learningSection = source.slice(learningStart, learningEnd);
    expect(learningSection).not.toMatch(/body:\s*req\.body/);
    expect(learningSection).not.toMatch(/sanitizeBody:\s*\(?\s*body\s*\)?\s*=>\s*body\b/);
  });

  test("sanitizes websocket message buffers without touching binary frames", () => {
    const text = sanitizeLearningWsClientMessage(
      Buffer.from(JSON.stringify({ content: "hello", apiKey: "secret", unknown_root: "drop" })),
      false
    );
    expect(JSON.parse(String(text.data))).toEqual({ content: "hello" });

    const binary = Buffer.from("raw");
    expect(sanitizeLearningWsClientMessage(binary, true)).toEqual({
      data: binary,
      isBinary: true,
    });
  });

  test("identifies websocket messages that should consume learning quota", () => {
    expect(shouldConsumeLearningWsQuota(JSON.stringify({ type: "start_turn", content: "teach" }), false)).toBe(true);
    expect(shouldConsumeLearningWsQuota(JSON.stringify({ content: "hello", chat_id: "web" }), false)).toBe(true);
    expect(shouldConsumeLearningWsQuota(JSON.stringify({ type: "cancel_turn", turn_id: "t1" }), false)).toBe(false);
    expect(shouldConsumeLearningWsQuota(JSON.stringify({ type: "subscribe", book_id: "b1" }), false)).toBe(false);
    expect(shouldConsumeLearningWsQuota(Buffer.from("raw prompt"), false)).toBe(true);
    expect(shouldConsumeLearningWsQuota(Buffer.from("raw"), true)).toBe(true);
  });

  test("identifies learning HTTP mutations that should consume prompt quota", () => {
    expect(
      shouldConsumeLearningIngressQuota({
        method: "POST",
        originalUrl: "/api/learning/notebooks",
      })
    ).toBe(false);
    expect(
      shouldConsumeLearningIngressQuota({
        method: "POST",
        originalUrl: "/api/learning/notebooks/records/manual",
      })
    ).toBe(false);
    expect(
      shouldConsumeLearningIngressQuota({
        method: "PUT",
        originalUrl: "/api/learning/notebooks/notebook-1/records/record-1",
      })
    ).toBe(false);
    expect(
      shouldConsumeLearningIngressQuota({
        method: "POST",
        originalUrl: "/api/learning/tutor-agents",
      })
    ).toBe(false);
    expect(
      shouldConsumeLearningIngressQuota({
        method: "POST",
        originalUrl: "/api/learning/tutor-agents/souls",
      })
    ).toBe(false);
    expect(
      shouldConsumeLearningIngressQuota({
        method: "PUT",
        originalUrl: "/api/learning/tutor-agents/souls/mentor",
      })
    ).toBe(false);
    expect(
      shouldConsumeLearningIngressQuota({
        method: "PUT",
        originalUrl: "/api/learning/tutor-agents/bot-1/files/SOUL.md",
      })
    ).toBe(false);
    expect(
      shouldConsumeLearningIngressQuota({
        method: "PATCH",
        originalUrl: "/api/learning/tutor-agents/bot-1",
      })
    ).toBe(false);
    expect(
      shouldConsumeLearningIngressQuota({
        method: "POST",
        originalUrl: "/api/learning/questions/categories",
      })
    ).toBe(false);
    expect(
      shouldConsumeLearningIngressQuota({
        method: "POST",
        originalUrl: "/api/learning/skills",
      })
    ).toBe(false);
    expect(
      shouldConsumeLearningIngressQuota({
        method: "PATCH",
        originalUrl: "/api/learning/co-writer/documents/doc-1",
      })
    ).toBe(false);
    expect(
      shouldConsumeLearningIngressQuota({
        method: "PUT",
        originalUrl: "/api/learning/memory",
      })
    ).toBe(false);
    expect(
      shouldConsumeLearningIngressQuota({
        method: "POST",
        originalUrl: "/api/learning/notebooks/records/with-summary",
      })
    ).toBe(true);
    expect(
      shouldConsumeLearningIngressQuota({
        method: "POST",
        originalUrl: "/api/learning/knowledge/main/upload",
      })
    ).toBe(true);
    expect(
      shouldConsumeLearningIngressQuota({
        method: "POST",
        originalUrl: "/api/learning/co-writer/edit",
      })
    ).toBe(true);
    expect(
      shouldConsumeLearningIngressQuota({
        method: "POST",
        originalUrl: "/api/learning/vision/analyze",
      })
    ).toBe(true);
    expect(
      shouldConsumeLearningIngressQuota({
        method: "POST",
        originalUrl: "/api/learning/books",
      })
    ).toBe(true);
    expect(
      shouldConsumeLearningIngressQuota({
        method: "GET",
        originalUrl: "/api/learning/books",
      })
    ).toBe(false);
  });

  test("filters tutor agent channels to the ZAKI hosted allowlist", () => {
    expect(
      filterLearningTutorAgentChannelsConfig({
        send_progress: true,
        send_tool_hints: false,
        telegram: { enabled: true, proxy: "socks5://evil.test", group_policy: "mention" },
        discord: { enabled: true, gateway_url: "wss://evil.test", group_policy: "mention" },
        whatsapp: { enabled: true, bridge_url: "ws://evil.test" },
        email: { enabled: true },
        slack: { enabled: true, mode: "webhook", dm: { enabled: true, webhook_path: "/x" } },
        feishu: { enabled: true },
      })
    ).toEqual({
      send_progress: true,
      send_tool_hints: false,
      whatsapp: { enabled: true },
      telegram: { enabled: true, group_policy: "mention" },
      discord: { enabled: true, group_policy: "mention" },
      email: { enabled: true },
      slack: { enabled: true, dm: { enabled: true } },
    });

    expect(
      filterLearningTutorAgentChannelsSchema({
        channels: {
          slack: {
            display_name: "Slack",
            default_config: { enabled: false, mode: "socket", dm: { enabled: true, webhook_path: "/x" } },
            json_schema: {
              properties: {
                enabled: { type: "boolean" },
                mode: { type: "string" },
                dm: {
                  type: "object",
                  properties: { enabled: { type: "boolean" }, webhook_path: { type: "string" } },
                },
              },
            },
          },
          email: { display_name: "Email" },
          whatsapp: {
            display_name: "WhatsApp",
            default_config: { enabled: false, bridge_url: "ws://localhost:3001" },
            json_schema: { properties: { enabled: { type: "boolean" }, bridge_url: { type: "string" } } },
          },
          telegram: {
            display_name: "Telegram",
            default_config: { enabled: false, proxy: "socks5://proxy" },
            json_schema: { properties: { enabled: { type: "boolean" }, proxy: { type: "string" } } },
          },
          discord: {
            display_name: "Discord",
            default_config: { enabled: false, gateway_url: "wss://gateway.discord.gg" },
            json_schema: { properties: { enabled: { type: "boolean" }, gateway_url: { type: "string" } } },
          },
          feishu: { display_name: "Feishu" },
        },
        global: { json_schema: {} },
      })
    ).toEqual({
      channels: {
        whatsapp: {
          display_name: "WhatsApp",
          default_config: { enabled: false },
          json_schema: { properties: { enabled: { type: "boolean" } } },
        },
        telegram: {
          display_name: "Telegram",
          default_config: { enabled: false },
          json_schema: { properties: { enabled: { type: "boolean" } } },
        },
        discord: {
          display_name: "Discord",
          default_config: { enabled: false },
          json_schema: { properties: { enabled: { type: "boolean" } } },
        },
        email: { display_name: "Email", default_config: {} },
        slack: {
          display_name: "Slack",
          default_config: { enabled: false, dm: { enabled: true } },
          json_schema: {
            properties: {
              enabled: { type: "boolean" },
              dm: { type: "object", properties: { enabled: { type: "boolean" } } },
            },
          },
        },
      },
      global: { json_schema: {} },
    });
  });

  test("sanitizes tutor agent payloads without allowing unsupported channels or provider routing", () => {
    expect(
      sanitizeLearningTutorAgentPayload({
        bot_id: "bot-1",
        provider: "client-provider",
        api_key: "client-key",
        channels: {
          telegram: { enabled: true, token: "secret", proxy: "socks5://evil.test" },
          slack: { enabled: true, bot_token: "secret", mode: "webhook" },
          discord: { enabled: true, token: "secret", gateway_url: "wss://evil.test" },
          send_progress: true,
        },
      })
    ).toEqual({
      bot_id: "bot-1",
        channels: {
          telegram: { enabled: true, token: "secret" },
          slack: { enabled: true, bot_token: "secret" },
          discord: { enabled: true, token: "secret" },
          send_progress: true,
        },
      });
  });

  test("preserves existing tutor agent channel secrets when clients leave masked or blank values", () => {
    expect(
      mergeLearningTutorAgentChannelSecrets(
        {
          telegram: { enabled: true, token: "***", allow_from: ["1"] },
          email: { enabled: true, smtp_password: "", imap_password: "new-imap" },
          slack: { enabled: true, bot_token: "***" },
          discord: { enabled: true, token: "***" },
          send_progress: false,
        },
        {
          telegram: { enabled: true, token: "old-telegram", allow_from: ["9"], mode: "webhook" },
          email: { smtp_password: "old-smtp", imap_password: "old-imap" },
          slack: { bot_token: "old-slack" },
          discord: { token: "old-discord", gateway_url: "wss://gateway.discord.gg" },
        },
        {
          channels: {
            telegram: { secret_fields: ["token"] },
            email: { secret_fields: ["smtp_password", "imap_password"] },
            slack: { secret_fields: ["bot_token"] },
            discord: { secret_fields: ["token"] },
          },
        }
      )
    ).toEqual({
        telegram: { enabled: true, token: "old-telegram", allow_from: ["1"] },
        email: { enabled: true, smtp_password: "old-smtp", imap_password: "new-imap" },
        slack: { enabled: true, bot_token: "old-slack" },
        discord: { enabled: true, token: "old-discord" },
        send_progress: false,
      });
  });

  test("extracts and authorizes Telegram webhook senders before quota is consumed", () => {
    const update = {
      update_id: 1,
      message: {
        text: "Explain entropy",
        chat: { id: 999 },
        from: { id: 123, username: "learner" },
      },
    };

    expect(extractLearningTelegramUpdateSender(update)).toEqual({
      senderId: "123",
      username: "learner",
      senderKey: "123|learner",
      chatId: "999",
      text: "Explain entropy",
    });
    expect(isLearningTelegramSenderAllowed(["123"], "123|learner")).toBe(true);
    expect(isLearningTelegramSenderAllowed(["learner"], "123|learner")).toBe(true);
    expect(isLearningTelegramSenderAllowed(["123|learner"], "123|learner")).toBe(true);
    expect(isLearningTelegramSenderAllowed(["456"], "123|learner")).toBe(false);
    expect(isLearningTelegramSenderAllowed([], "123|learner")).toBe(false);
    expect(isLearningTelegramQuotaFreeUpdate(update)).toBe(false);
    expect(
      isLearningTelegramQuotaFreeUpdate({
        message: { text: "/start", chat: { id: 999 }, from: { id: 123 } },
      })
    ).toBe(true);
  });

  test("resolves and enforces learning request byte caps", () => {
    expect(resolveLearningMaxRequestBytes({ ZAKI_LEARNING_MAX_REQUEST_BYTES: "2048" })).toBe(2048);
    expect(resolveLearningMaxRequestBytes({ ZAKI_LEARNING_MAX_REQUEST_BYTES: "bad" })).toBe(
      100 * 1024 * 1024
    );

    expect(checkLearningContentLength({ "content-length": "1024" }, 2048)).toEqual({
      allowed: true,
      contentLength: 1024,
      maxBytes: 2048,
    });
    expect(checkLearningContentLength({ "content-length": "4096" }, 2048)).toEqual({
      allowed: false,
      contentLength: 4096,
      maxBytes: 2048,
      reason: "request_too_large",
    });
    expect(checkLearningContentLength({ "content-length": "nope" }, 2048)).toEqual({
      allowed: false,
      contentLength: null,
      maxBytes: 2048,
      reason: "invalid_content_length",
    });
  });

  test("byte-limits chunked learning upload streams without content length", async () => {
    const source = new PassThrough();
    const limited = source.pipe(createLearningByteLimitTransform(5));
    const chunks = [];
    limited.on("data", (chunk) => chunks.push(chunk.toString("utf8")));

    source.write("abc");
    source.end("def");

    const [error] = await once(limited, "error");
    const sizeError = findLearningRequestSizeError(error);
    expect(sizeError).toMatchObject({
      code: "learning_request_too_large",
      maxBytes: 5,
      contentLength: 6,
    });
    expect(chunks).toEqual(["abc"]);
  });
});
