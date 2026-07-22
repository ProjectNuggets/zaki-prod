import { describe, expect, test } from "@jest/globals";
import {
  CALENDAR_OAUTH_SCOPE,
  CALENDAR_CONNECT_CALLBACK_PATH,
  buildCalendarAuthorizeUrl,
  buildCalendarNonceCookie,
  extractCalendarNonceFromCookieHeader,
  signCalendarConnectState,
  verifyCalendarConnectState,
  verifyCalendarNonceBinding,
  hashCalendarOAuthNonce,
  revokeGoogleToken,
  isInvalidGrant,
} from "./google-calendar-oauth.js";

const SECRET = "calendar-oauth-state-secret-0123456789abcdef";

describe("calendar authorize url", () => {
  test("carries the sensitive calendar scope, offline access, and prompt=consent (to get a refresh token)", () => {
    const u = new URL(buildCalendarAuthorizeUrl({ clientId: "cid", redirectUri: "https://app/cb", state: "s" }));
    expect(u.searchParams.get("scope")).toBe(CALENDAR_OAUTH_SCOPE);
    expect(u.searchParams.get("scope")).toContain("calendar.events.readonly");
    expect(u.searchParams.get("access_type")).toBe("offline");
    expect(u.searchParams.get("prompt")).toBe("consent");
    expect(u.searchParams.get("include_granted_scopes")).toBe("true");
    expect(u.searchParams.get("client_id")).toBe("cid");
    expect(u.searchParams.get("redirect_uri")).toBe("https://app/cb");
  });
  test("refuses to build without client id / redirect / state", () => {
    expect(() => buildCalendarAuthorizeUrl({ redirectUri: "x", state: "s" })).toThrow();
    expect(() => buildCalendarAuthorizeUrl({ clientId: "c", state: "s" })).toThrow();
    expect(() => buildCalendarAuthorizeUrl({ clientId: "c", redirectUri: "x" })).toThrow();
  });
});

describe("calendar connect state (user-bound HMAC)", () => {
  test("round-trips and returns the bound userId + returnTo + nonceHash", () => {
    const { state, nonce } = signCalendarConnectState({ userId: 42, returnTo: "/settings#calendar", stateSecret: SECRET });
    const v = verifyCalendarConnectState(state, SECRET);
    expect(v.userId).toBe("42");
    expect(v.returnTo).toBe("/settings#calendar");
    expect(v.nonceHash).toBe(hashCalendarOAuthNonce(nonce));
  });
  test("a tampered signature is rejected", () => {
    const { state } = signCalendarConnectState({ userId: 42, stateSecret: SECRET });
    const [body] = state.split(".");
    expect(() => verifyCalendarConnectState(`${body}.deadbeef`, SECRET)).toThrow();
  });
  test("a state signed with another secret is rejected", () => {
    const { state } = signCalendarConnectState({ userId: 42, stateSecret: SECRET });
    expect(() => verifyCalendarConnectState(state, "another-secret-0123456789abcdefghi")).toThrow();
  });
  test("an expired state is rejected", () => {
    const { state } = signCalendarConnectState({ userId: 42, stateSecret: SECRET, now: 1000 });
    expect(() => verifyCalendarConnectState(state, SECRET, { now: 1000 + 11 * 60 * 1000 })).toThrow(/expired/);
  });
  test("state requires a valid user id", () => {
    expect(() => signCalendarConnectState({ userId: "0", stateSecret: SECRET })).toThrow();
  });
  test("an off-path returnTo is sanitized to the settings fallback", () => {
    const { state } = signCalendarConnectState({ userId: 42, returnTo: "https://evil.example/x", stateSecret: SECRET });
    expect(verifyCalendarConnectState(state, SECRET).returnTo).toBe("/settings");
  });
});

describe("nonce cookie + binding", () => {
  test("cookie is scoped to the calendar callback path (not the login path) and HttpOnly", () => {
    const c = buildCalendarNonceCookie("abc", { secure: true });
    expect(c).toContain(`Path=${CALENDAR_CONNECT_CALLBACK_PATH}`);
    expect(c).not.toContain("/api/auth/google/callback");
    expect(c).toContain("HttpOnly");
    expect(c).toContain("SameSite=Lax");
    expect(c).toContain("Secure");
  });
  test("round-trips through a Cookie header and binds to the state's nonceHash", () => {
    const { state, nonce } = signCalendarConnectState({ userId: 7, stateSecret: SECRET });
    const cookie = buildCalendarNonceCookie(nonce);
    const header = `other=1; ${cookie.split(";")[0]}`;
    const parsed = extractCalendarNonceFromCookieHeader(header);
    expect(parsed).toBe(nonce);
    expect(verifyCalendarNonceBinding({ cookieNonce: parsed, stateNonceHash: verifyCalendarConnectState(state, SECRET).nonceHash })).toBe(true);
  });
  test("a planted cookie with malformed percent-encoding does not throw (falls back to raw → fails binding)", () => {
    const { state } = signCalendarConnectState({ userId: 7, stateSecret: SECRET });
    const hash = verifyCalendarConnectState(state, SECRET).nonceHash;
    let parsed;
    expect(() => { parsed = extractCalendarNonceFromCookieHeader("zaki_calendar_oauth_nonce=%zz"); }).not.toThrow();
    expect(parsed).toBe("%zz");
    expect(() => verifyCalendarNonceBinding({ cookieNonce: parsed, stateNonceHash: hash })).toThrow(expect.objectContaining({ status: 401 }));
  });

  test("a wrong / missing cookie nonce fails binding with 401", () => {
    const { state } = signCalendarConnectState({ userId: 7, stateSecret: SECRET });
    const hash = verifyCalendarConnectState(state, SECRET).nonceHash;
    expect(() => verifyCalendarNonceBinding({ cookieNonce: "wrong", stateNonceHash: hash })).toThrow(expect.objectContaining({ status: 401 }));
    expect(() => verifyCalendarNonceBinding({ cookieNonce: "", stateNonceHash: hash })).toThrow(expect.objectContaining({ status: 401 }));
  });
});

describe("revocation + invalid_grant", () => {
  test("revokes the specific token and reports success", async () => {
    let seenBody = null;
    const fetchImpl = async (url, opts) => { seenBody = { url, body: opts.body }; return { ok: true }; };
    const r = await revokeGoogleToken({ token: "1//refresh-xyz", fetchImpl });
    expect(r.revoked).toBe(true);
    expect(seenBody.url).toBe("https://oauth2.googleapis.com/revoke");
    expect(seenBody.body).toBe("token=1%2F%2Frefresh-xyz");
  });
  test("a 400 already-invalid revoke is treated as done, not an error", async () => {
    const fetchImpl = async () => ({ ok: false, status: 400, json: async () => ({ error: "invalid_token" }) });
    expect((await revokeGoogleToken({ token: "x", fetchImpl }))).toEqual(expect.objectContaining({ revoked: true, alreadyGone: true }));
  });
  test("no token → no-op", async () => {
    expect(await revokeGoogleToken({ token: "" })).toEqual({ revoked: false, reason: "no_token" });
  });
  test("isInvalidGrant detects a user-revoked grant on refresh", () => {
    expect(isInvalidGrant({ error: "invalid_grant" })).toBe(true);
    expect(isInvalidGrant({ error: "invalid_client" })).toBe(false);
    expect(isInvalidGrant("invalid_grant")).toBe(true);
  });
});
