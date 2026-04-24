import { describe, it, expect, jest } from "@jest/globals";
import { prepareAndApplySecret } from "./nullalis-secrets.js";

function callLog() {
  const calls = [];
  return {
    calls,
    make(responses) {
      let i = 0;
      return async (args) => {
        calls.push(args);
        const r = responses[i++];
        if (!r) throw new Error(`unexpected call #${i}: ${JSON.stringify(args)}`);
        return r;
      };
    },
  };
}

describe("prepareAndApplySecret — put", () => {
  it("runs prepare then put with the issued token", async () => {
    const log = callLog();
    const callNullclaw = log.make([
      { ok: true, status: 200, data: { token: "tkn_1", action: "put", expires_at_unix: 99 } },
      { ok: true, status: 200, data: { status: "ok" } },
    ]);
    const result = await prepareAndApplySecret({
      callNullclaw,
      userId: "42",
      key: "stripe_key",
      action: "put",
      value: "sk_live_xyz",
    });
    expect(result).toEqual({ status: 200, body: { status: "ok" } });
    expect(log.calls).toEqual([
      {
        method: "POST",
        path: "/api/v1/users/42/secrets/stripe_key/prepare",
        body: { action: "put" },
      },
      {
        method: "PUT",
        path: "/api/v1/users/42/secrets/stripe_key",
        body: { value: "sk_live_xyz", confirmation_token: "tkn_1" },
      },
    ]);
  });

  it("rejects missing value before calling nullclaw", async () => {
    const callNullclaw = jest.fn();
    const result = await prepareAndApplySecret({
      callNullclaw,
      userId: "42",
      key: "k",
      action: "put",
      value: undefined,
    });
    expect(result).toEqual({ status: 400, body: { error: "value_required" } });
    expect(callNullclaw).not.toHaveBeenCalled();
  });

  it("surfaces prepare failure with nullclaw status + body", async () => {
    const callNullclaw = callLog().make([
      { ok: false, status: 401, data: { error: "unauthorized" } },
    ]);
    const result = await prepareAndApplySecret({
      callNullclaw,
      userId: "42",
      key: "k",
      action: "put",
      value: "v",
    });
    expect(result).toEqual({ status: 401, body: { error: "unauthorized" } });
  });

  it("returns 502 when prepare is ok but token is missing", async () => {
    const callNullclaw = callLog().make([{ ok: true, status: 200, data: {} }]);
    const result = await prepareAndApplySecret({
      callNullclaw,
      userId: "42",
      key: "k",
      action: "put",
      value: "v",
    });
    expect(result).toEqual({ status: 502, body: { error: "secret_prepare_missing_token" } });
  });

  it("does NOT retry on apply failure (prevents token reuse)", async () => {
    const log = callLog();
    const callNullclaw = log.make([
      { ok: true, status: 200, data: { token: "tkn_1" } },
      { ok: false, status: 401, data: { error: "token_expired" } },
    ]);
    const result = await prepareAndApplySecret({
      callNullclaw,
      userId: "42",
      key: "k",
      action: "put",
      value: "v",
    });
    expect(result).toEqual({ status: 401, body: { error: "token_expired" } });
    expect(log.calls).toHaveLength(2);
  });

  it("url-encodes user id and key", async () => {
    const log = callLog();
    const callNullclaw = log.make([
      { ok: true, status: 200, data: { token: "t" } },
      { ok: true, status: 200, data: { status: "ok" } },
    ]);
    await prepareAndApplySecret({
      callNullclaw,
      userId: "user/42",
      key: "path with space",
      action: "put",
      value: "v",
    });
    expect(log.calls[0].path).toBe("/api/v1/users/user%2F42/secrets/path%20with%20space/prepare");
    expect(log.calls[1].path).toBe("/api/v1/users/user%2F42/secrets/path%20with%20space");
  });
});

describe("prepareAndApplySecret — delete", () => {
  it("runs prepare(delete) then delete with the issued token and no value", async () => {
    const log = callLog();
    const callNullclaw = log.make([
      { ok: true, status: 200, data: { token: "tkn_d", action: "delete" } },
      { ok: true, status: 200, data: { status: "ok" } },
    ]);
    const result = await prepareAndApplySecret({
      callNullclaw,
      userId: "42",
      key: "stripe_key",
      action: "delete",
    });
    expect(result).toEqual({ status: 200, body: { status: "ok" } });
    expect(log.calls).toEqual([
      {
        method: "POST",
        path: "/api/v1/users/42/secrets/stripe_key/prepare",
        body: { action: "delete" },
      },
      {
        method: "DELETE",
        path: "/api/v1/users/42/secrets/stripe_key",
        body: { confirmation_token: "tkn_d" },
      },
    ]);
  });

  it("forwards token_action_mismatch from apply", async () => {
    const callNullclaw = callLog().make([
      { ok: true, status: 200, data: { token: "tkn" } },
      { ok: false, status: 401, data: { error: "token_action_mismatch" } },
    ]);
    const result = await prepareAndApplySecret({
      callNullclaw,
      userId: "42",
      key: "k",
      action: "delete",
    });
    expect(result).toEqual({ status: 401, body: { error: "token_action_mismatch" } });
  });
});

describe("prepareAndApplySecret — guard", () => {
  it("rejects unknown action", async () => {
    const callNullclaw = jest.fn();
    const result = await prepareAndApplySecret({
      callNullclaw,
      userId: "42",
      key: "k",
      action: "rotate",
    });
    expect(result).toEqual({ status: 500, body: { error: "invalid_action" } });
    expect(callNullclaw).not.toHaveBeenCalled();
  });
});
