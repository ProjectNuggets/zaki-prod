import { describe, expect, it } from "@jest/globals";
import {
  buildClearedGoogleOAuthNonceCookie,
  buildGoogleOAuthRedirectUri,
  buildGoogleOAuthNonceCookie,
  extractGoogleOAuthNonceFromCookieHeader,
  GOOGLE_OAUTH_NONCE_COOKIE_NAME,
  hashGoogleOAuthNonce,
  isGoogleOAuthConfigured,
  sanitizeGoogleOAuthReturnTo,
  signGoogleOAuthStatePayload,
  validateGoogleIdTokenInfoPayload,
  verifyGoogleOAuthNonceBinding,
  verifyGoogleOAuthState,
} from "./google-oauth.js";

describe("google-oauth helpers", () => {
  it("detects complete Google OAuth configuration only", () => {
    expect(
      isGoogleOAuthConfigured({
        clientId: "client",
        clientSecret: "secret",
        stateSecret: "state-secret",
      })
    ).toBe(true);
    expect(
      isGoogleOAuthConfigured({
        clientId: "client",
        clientSecret: "",
        stateSecret: "state-secret",
      })
    ).toBe(false);
  });

  it("builds callback redirect URI from explicit config or request/public base", () => {
    expect(
      buildGoogleOAuthRedirectUri({
        configuredRedirectUri: "https://api.chatzaki.com/api/auth/google/callback",
        publicUrl: "https://ignored.example",
      })
    ).toBe("https://api.chatzaki.com/api/auth/google/callback");

    expect(
      buildGoogleOAuthRedirectUri({
        publicUrl: "https://api.chatzaki.com/",
        protocol: "http",
        host: "localhost:8791",
      })
    ).toBe("https://api.chatzaki.com/api/auth/google/callback");

    expect(
      buildGoogleOAuthRedirectUri({
        protocol: "http",
        host: "localhost:8791",
      })
    ).toBe("http://localhost:8791/api/auth/google/callback");
  });

  it("sanitizes returnTo to local paths while preserving checkout intent", () => {
    expect(
      sanitizeGoogleOAuthReturnTo("/pricing?plan=complete&autostart=1&auth=login#top")
    ).toBe("/pricing?plan=complete&autostart=1#top");
    expect(sanitizeGoogleOAuthReturnTo("learn?verified=1")).toBe("/learn");
    expect(sanitizeGoogleOAuthReturnTo("https://evil.example/pricing")).toBe("/spaces");
    expect(sanitizeGoogleOAuthReturnTo("//evil.example/pricing")).toBe("/spaces");
  });

  it("signs and verifies state without accepting tampering or expiry", () => {
    const secret = "state-secret";
    const state = signGoogleOAuthStatePayload(
      {
        returnTo: "/pricing?plan=agent&auth=login",
        exp: 2_000,
        nonceHash: hashGoogleOAuthNonce("nonce-value"),
        legalPolicyVersion: "2026-07-12.v4",
      },
      secret
    );

    expect(verifyGoogleOAuthState(state, secret, { now: 1_000 })).toEqual({
      returnTo: "/pricing?plan=agent",
      nonceHash: hashGoogleOAuthNonce("nonce-value"),
      legalPolicyVersion: "2026-07-12.v4",
    });

    expect(() => verifyGoogleOAuthState(`${state}tampered`, secret, { now: 1_000 })).toThrow(
      /signature/i
    );
    expect(() => verifyGoogleOAuthState(state, secret, { now: 3_000 })).toThrow(/expired/i);
  });

  it("binds the signed OAuth state to the browser nonce cookie", () => {
    const nonce = "nonce-value";
    const nonceHash = hashGoogleOAuthNonce(nonce);

    expect(verifyGoogleOAuthNonceBinding({ cookieNonce: nonce, stateNonceHash: nonceHash })).toBe(true);
    expect(() =>
      verifyGoogleOAuthNonceBinding({ cookieNonce: "other-nonce", stateNonceHash: nonceHash })
    ).toThrow(/nonce mismatch/i);
    expect(() =>
      verifyGoogleOAuthNonceBinding({ cookieNonce: "", stateNonceHash: nonceHash })
    ).toThrow(/nonce is missing/i);
  });

  it("builds and clears the OAuth nonce cookie with callback-only scope", () => {
    const setCookie = buildGoogleOAuthNonceCookie("nonce value", { secure: true });
    expect(setCookie).toContain(`${GOOGLE_OAUTH_NONCE_COOKIE_NAME}=nonce%20value`);
    expect(setCookie).toContain("Path=/api/auth/google/callback");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Secure");
    expect(
      extractGoogleOAuthNonceFromCookieHeader(`${setCookie}; other=value`)
    ).toBe("nonce value");

    const cleared = buildClearedGoogleOAuthNonceCookie({ secure: true });
    expect(cleared).toContain(`${GOOGLE_OAUTH_NONCE_COOKIE_NAME}=`);
    expect(cleared).toContain("Max-Age=0");
    expect(cleared).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  });

  it("validates Google tokeninfo payload into the app profile shape", () => {
    expect(
      validateGoogleIdTokenInfoPayload(
        {
          aud: "client-id",
          iss: "https://accounts.google.com",
          email_verified: "true",
          email: "USER@Example.COM",
          sub: "google-sub",
          name: "Ada Lovelace",
        },
        "client-id"
      )
    ).toEqual({
      email: "user@example.com",
      googleSub: "google-sub",
      fullName: "Ada Lovelace",
    });
  });

  it("rejects invalid Google tokeninfo payloads", () => {
    const base = {
      aud: "client-id",
      iss: "accounts.google.com",
      email_verified: "true",
      email: "user@example.com",
      sub: "sub",
    };

    expect(() => validateGoogleIdTokenInfoPayload({ ...base, aud: "other" }, "client-id")).toThrow(
      /audience/i
    );
    expect(() =>
      validateGoogleIdTokenInfoPayload({ ...base, iss: "https://issuer.example" }, "client-id")
    ).toThrow(/issuer/i);
    expect(() =>
      validateGoogleIdTokenInfoPayload({ ...base, email_verified: "false" }, "client-id")
    ).toThrow(/verified/i);
    expect(() =>
      validateGoogleIdTokenInfoPayload({ ...base, email: "" }, "client-id")
    ).toThrow(/missing/i);
  });
});
