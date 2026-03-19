import { describe, expect, test } from "@jest/globals";
import {
  INTERNAL_AGENT_SMOKE_PATHS,
  resolveInternalAgentSmokeRequest,
} from "./agent-internal-auth.js";

describe("resolveInternalAgentSmokeRequest", () => {
  test("limits internal smoke bypass to the approved agent surfaces", () => {
    expect(INTERNAL_AGENT_SMOKE_PATHS).toEqual([
      "/api/agent/chat/stream",
      "/api/agent/diagnostics",
      "/v1/me/bot/chat/stream",
    ]);
    expect(
      resolveInternalAgentSmokeRequest(
        {
          path: "/api/agent/history",
          headers: {
            "x-internal-token": "secret",
            "x-zaki-user-id": "7",
          },
        },
        "secret"
      )
    ).toEqual({ mode: "disabled" });
  });

  test("returns none when no internal smoke headers are present", () => {
    expect(
      resolveInternalAgentSmokeRequest(
        {
          path: "/api/agent/chat/stream",
          headers: {},
        },
        "secret"
      )
    ).toEqual({ mode: "none" });
  });

  test("rejects missing or invalid internal tokens", () => {
    expect(
      resolveInternalAgentSmokeRequest(
        {
          path: "/api/agent/chat/stream",
          headers: { "x-zaki-user-id": "7" },
        },
        "secret"
      )
    ).toEqual({
      mode: "error",
      status: 401,
      body: { error: "Missing internal token." },
    });

    expect(
      resolveInternalAgentSmokeRequest(
        {
          path: "/api/agent/chat/stream",
          headers: {
            "x-internal-token": "wrong",
            "x-zaki-user-id": "7",
          },
        },
        "secret"
      )
    ).toEqual({
      mode: "error",
      status: 401,
      body: { error: "Invalid internal token." },
    });
  });

  test("rejects invalid user ids", () => {
    expect(
      resolveInternalAgentSmokeRequest(
        {
          path: "/api/agent/chat/stream",
          headers: {
            "x-internal-token": "secret",
            "x-zaki-user-id": "abc",
          },
        },
        "secret"
      )
    ).toEqual({
      mode: "error",
      status: 400,
      body: { error: "Invalid user.", code: "invalid_user_id" },
    });
  });

  test("authorizes internal smoke requests with a token and canonical user id", () => {
    expect(
      resolveInternalAgentSmokeRequest(
        {
          path: "/api/agent/diagnostics",
          headers: {
            "x-internal-token": "secret",
            "x-zaki-user-id": "42",
          },
        },
        "secret"
      )
    ).toEqual({
      mode: "authorized",
      userId: "42",
    });
  });
});
