import { describe, expect, test } from "@jest/globals";
import {
  buildAgentForwardHeaders,
  buildAgentRetrySsePayload,
  extractAgentTokenChunk,
  normalizeTelegramConnectPayload,
  resolveCanonicalAgentUserId,
} from "./agent-proxy-contract.js";

describe("resolveCanonicalAgentUserId", () => {
  test("returns numeric id as string", () => {
    expect(resolveCanonicalAgentUserId({ zakiUser: { id: 42 } })).toBe("42");
    expect(resolveCanonicalAgentUserId({ zakiUser: { id: "19" } })).toBe("19");
  });

  test("rejects missing/invalid ids", () => {
    expect(resolveCanonicalAgentUserId({})).toBeNull();
    expect(resolveCanonicalAgentUserId({ zakiUser: { id: 0 } })).toBeNull();
    expect(resolveCanonicalAgentUserId({ zakiUser: { id: "abc" } })).toBeNull();
  });
});

describe("buildAgentForwardHeaders", () => {
  test("builds required forwarding headers", () => {
    const headers = buildAgentForwardHeaders({
      internalToken: "dev-token",
      userId: "7",
      requestId: "req-1",
    });
    expect(headers["X-Internal-Token"]).toBe("dev-token");
    expect(headers["X-Zaki-User-Id"]).toBe("7");
    expect(headers["X-Request-Id"]).toBe("req-1");
  });

  test("throws for invalid user id", () => {
    expect(() =>
      buildAgentForwardHeaders({
        internalToken: "dev-token",
        userId: "",
        requestId: "req-1",
      })
    ).toThrow("invalid_user_id");
  });
});

describe("extractAgentTokenChunk", () => {
  test("extracts token chunk across supported payload keys", () => {
    expect(extractAgentTokenChunk("token", { delta: "a" })).toBe("a");
    expect(extractAgentTokenChunk("token", { token: "b" })).toBe("b");
    expect(extractAgentTokenChunk("token", { text: "c" })).toBe("c");
    expect(extractAgentTokenChunk("token", { chunk: "d" })).toBe("d");
    expect(extractAgentTokenChunk("token", { content: "e" })).toBe("e");
  });

  test("returns empty string for non-token events", () => {
    expect(extractAgentTokenChunk("done", { delta: "x" })).toBe("");
  });
});

describe("buildAgentRetrySsePayload", () => {
  test("maps conflict and draining statuses", () => {
    expect(buildAgentRetrySsePayload(409)).toEqual({
      code: "ownership_lock_conflict",
      message: "agent is handling another request for this user, retry shortly",
    });
    expect(buildAgentRetrySsePayload(503)).toEqual({
      code: "gateway_draining",
      message: "agent is draining, retry shortly",
    });
    expect(buildAgentRetrySsePayload(500)).toBeNull();
  });
});

describe("normalizeTelegramConnectPayload", () => {
  test("normalizes legacy camelCase telegram connect payload keys", () => {
    expect(
      normalizeTelegramConnectPayload({
        botToken: " 123456:ABC ",
        webhookUrl: " https://agent-dev.zaki.com/webhook/telegram?user_id=7 ",
        webhookSecretToken: "  secret-token  ",
        accountId: " main ",
        chatId: " 1110331014 ",
        allowFrom: [" 1110331014 ", ""],
        dropPendingUpdates: true,
      })
    ).toEqual({
      bot_token: "123456:ABC",
      webhook_url: "https://agent-dev.zaki.com/webhook/telegram?user_id=7",
      webhook_secret_token: "secret-token",
      account_id: "main",
      chat_id: "1110331014",
      allow_from: ["1110331014"],
      drop_pending_updates: true,
    });
  });

  test("keeps canonical snake_case keys and ignores invalid values", () => {
    expect(
      normalizeTelegramConnectPayload({
        bot_token: "123456:ABC",
        webhook_base_url: "https://agent-dev.zaki.com",
        drop_pending_updates: "false",
        allow_from: ["100", "200"],
      })
    ).toEqual({
      bot_token: "123456:ABC",
      webhook_base_url: "https://agent-dev.zaki.com",
      allow_from: ["100", "200"],
      drop_pending_updates: false,
    });
  });

  test("returns empty object for non-object payloads", () => {
    expect(normalizeTelegramConnectPayload(null)).toEqual({});
    expect(normalizeTelegramConnectPayload("invalid")).toEqual({});
  });
});
