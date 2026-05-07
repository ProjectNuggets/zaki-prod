import { describe, expect, test } from "@jest/globals";
import {
  buildLearningConfigErrorPayload,
  buildLearningDisabledPayload,
  buildLearningForwardHeaders,
  buildLearningProxyHeaders,
  checkLearningContentLength,
  extractLearningWsToken,
  getLearningBase,
  isLearningEnabled,
  mapLearningUpstreamFailure,
  resolveCanonicalLearningUserId,
  resolveLearningMaxRequestBytes,
  sanitizeLearningClientPayload,
  sanitizeLearningPath,
  sanitizeLearningWsClientMessage,
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
  });

  test("sanitizes websocket message buffers without touching binary frames", () => {
    const text = sanitizeLearningWsClientMessage(
      Buffer.from(JSON.stringify({ content: "hello", api_key: "secret" })),
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
});
