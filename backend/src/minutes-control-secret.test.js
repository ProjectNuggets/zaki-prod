import { describe, expect, jest, test } from "@jest/globals";
import {
  mintMinutesControlAccessToken,
  resolveMinutesCallbackHmacKey,
  resolveMinutesControlRecoveryKey,
  resolveMinutesControlToken,
  verifyMinutesControlAccessToken,
} from "./minutes-control-secret.js";

describe("Minutes control credential loading", () => {
  test("loads control and callback credentials only from absolute projected paths", () => {
    const readFileSync = jest.fn().mockReturnValue("f".repeat(32));
    expect(resolveMinutesControlToken({
      tokenFile: "/run/secrets/zaki-control/token",
      fallbackToken: "ignore-me".repeat(4),
      readFileSync,
    })).toBe("f".repeat(32));
    expect(resolveMinutesCallbackHmacKey({
      tokenFile: "/run/secrets/zaki-control/callback",
      fallbackToken: "ignore-me".repeat(4),
      readFileSync,
    })).toBe("f".repeat(32));
    expect(resolveMinutesControlRecoveryKey({
      tokenFile: "/run/secrets/zaki-control/recovery",
      fallbackToken: "ignore-me".repeat(4),
      readFileSync,
    })).toBe("f".repeat(32));
    expect(() => resolveMinutesControlToken({ tokenFile: "relative", readFileSync })).toThrow("MINUTES_ENGINE_CONTROL_TOKEN_FILE is invalid.");
  });

  test("mints a short-lived request-scope token rather than forwarding the raw signing secret", () => {
    const signingKey = "s".repeat(32);
    const token = mintMinutesControlAccessToken({
      signingKey,
      tenantId: "default",
      userId: "42",
      nowMs: Date.parse("2026-07-19T10:00:00.000Z"),
      ttlSeconds: 60,
    });
    expect(token).not.toContain(signingKey);
    expect(verifyMinutesControlAccessToken({
      token,
      signingKey,
      nowMs: Date.parse("2026-07-19T10:00:30.000Z"),
    })).toEqual(expect.objectContaining({
      v: 1,
      aud: "zaki-control.v1",
      tenant_id: "default",
      user_id: "42",
    }));
    expect(verifyMinutesControlAccessToken({
      token,
      signingKey,
      nowMs: Date.parse("2026-07-19T10:02:00.000Z"),
    })).toBeNull();
  });
});
