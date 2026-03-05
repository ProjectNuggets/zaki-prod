import { describe, expect, test } from "@jest/globals";
import {
  buildAgentForwardHeaders,
  buildAgentRetrySsePayload,
  extractAgentTokenChunk,
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

