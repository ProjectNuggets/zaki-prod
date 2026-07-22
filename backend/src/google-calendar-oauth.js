import crypto from "node:crypto";
import { sanitizeLocalReturnTo } from "./auth-return-to.js";

// WP-M10 slice 2 — the pure OAuth mechanics for connecting a Google Calendar,
// FORKED from the login flow (google-oauth.js / the /api/auth/google/* routes)
// rather than reused. Forking is deliberate (design-review risk #1): the login
// callback always mints a session + runs the consent/age gate + hard-codes the
// "openid email profile" scope. A calendar connect must instead attach a
// calendar grant to an ALREADY-authenticated user, keep the refresh_token, and
// touch none of the session/consent machinery.
//
// This module is Express-free and side-effect-free so it unit-tests in
// isolation; the thin route glue in index.js supplies req/res, the store, and
// the shared client id/secret.

// Scope: openid+email so we can bind the grant to the Google account, plus the
// single sensitive scope that returns events (incl. conferenceData/Meet links).
export const CALENDAR_OAUTH_SCOPE =
  "openid email https://www.googleapis.com/auth/calendar.events.readonly";
export const CALENDAR_CONNECT_CALLBACK_PATH = "/api/minutes/calendar/connect/callback";
export const CALENDAR_OAUTH_NONCE_COOKIE_NAME = "zaki_calendar_oauth_nonce";
const NONCE_MAX_AGE_SECONDS = 10 * 60;
const STATE_TTL_MS = 10 * 60 * 1000;

// ── authorize URL ───────────────────────────────────────────────────────────
// access_type=offline + prompt=consent is what actually returns a refresh_token
// (login uses prompt=select_account, which usually does NOT). include_granted_
// scopes=true makes this incremental consent layered on the login grant.
export function buildCalendarAuthorizeUrl({ clientId, redirectUri, state } = {}) {
  if (!String(clientId || "").trim()) throw new Error("calendar oauth client id missing");
  if (!String(redirectUri || "").trim()) throw new Error("calendar oauth redirect uri missing");
  if (!String(state || "").trim()) throw new Error("calendar oauth state missing");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", CALENDAR_OAUTH_SCOPE);
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  return url.toString();
}

// ── nonce ─────────────────────────────────────────────────────────────────
export function createCalendarOAuthNonce() {
  return crypto.randomBytes(32).toString("hex");
}
export function hashCalendarOAuthNonce(nonce) {
  const normalized = String(nonce || "").trim();
  if (!normalized) return "";
  return crypto.createHash("sha256").update(normalized).digest("base64url");
}

// Own cookie, scoped to the calendar callback path — the login cookie is
// Path=/api/auth/google/callback and would never reach our callback (risk #4).
export function buildCalendarNonceCookie(nonce, { secure = false, maxAgeSeconds = NONCE_MAX_AGE_SECONDS } = {}) {
  const attrs = [
    `${CALENDAR_OAUTH_NONCE_COOKIE_NAME}=${encodeURIComponent(String(nonce || ""))}`,
    `Path=${CALENDAR_CONNECT_CALLBACK_PATH}`,
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.max(0, Number.parseInt(String(maxAgeSeconds), 10) || 0)}`,
  ];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}
export function buildClearedCalendarNonceCookie({ secure = false } = {}) {
  return buildCalendarNonceCookie("", { secure, maxAgeSeconds: 0 });
}
export function extractCalendarNonceFromCookieHeader(cookieHeader) {
  const header = String(cookieHeader || "");
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === CALENDAR_OAUTH_NONCE_COOKIE_NAME) {
      const raw = rest.join("=") || "";
      // A planted cookie with malformed percent-encoding must not throw a
      // URIError out of the extractor (it would 500 the callback instead of
      // cleanly failing the nonce binding). Mirror the login parser: fall back
      // to the raw value, which then simply fails the timing-safe binding.
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return "";
}

// ── state (HMAC, bound to the authenticated user) ───────────────────────────
// Mirrors google-oauth.js state exactly, but the payload BINDS the userId so a
// callback can only attach the grant to the same user who started it — even
// though the callback also independently requires that user's session. Both
// checks must agree (defense in depth against login-CSRF / session swap).
export function signCalendarConnectState({ userId, returnTo, stateSecret, now = Date.now() } = {}) {
  const secret = String(stateSecret || "").trim();
  if (!secret) throw new Error("calendar oauth state secret is not configured");
  if (!/^[1-9][0-9]{0,18}$/.test(String(userId || ""))) throw new Error("calendar oauth state needs a user id");
  const nonce = createCalendarOAuthNonce();
  const payload = {
    userId: String(userId),
    returnTo: sanitizeLocalReturnTo(returnTo, { fallback: "/settings" }),
    nonceHash: hashCalendarOAuthNonce(nonce),
    exp: now + STATE_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return { state: `${body}.${sig}`, nonce };
}

export function verifyCalendarConnectState(state, stateSecret, { now = Date.now() } = {}) {
  const secret = String(stateSecret || "").trim();
  if (!secret) throw new Error("calendar oauth state secret is not configured");
  const [body, sig] = String(state || "").split(".");
  if (!body || !sig) throw new Error("invalid calendar oauth state");
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error("invalid calendar oauth state signature");
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (!payload?.exp || Number(payload.exp) < now) throw new Error("calendar oauth state expired");
  if (!/^[1-9][0-9]{0,18}$/.test(String(payload.userId || ""))) throw new Error("calendar oauth state missing user");
  return {
    userId: String(payload.userId),
    returnTo: sanitizeLocalReturnTo(payload.returnTo, { fallback: "/settings" }),
    nonceHash: String(payload.nonceHash || "").trim(),
  };
}

export function verifyCalendarNonceBinding({ cookieNonce, stateNonceHash }) {
  const expected = String(stateNonceHash || "").trim();
  const actual = hashCalendarOAuthNonce(cookieNonce);
  if (!expected || !actual) { const e = new Error("calendar oauth nonce missing"); e.status = 401; throw e; }
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    const e = new Error("calendar oauth nonce mismatch"); e.status = 401; throw e;
  }
  return true;
}

// ── revocation ──────────────────────────────────────────────────────────────
// On disconnect, revoke the refresh_token (not the access token — the access
// token alone would leave a live refresh_token that can silently reconnect).
//
// IMPORTANT: Google's /revoke is grant-scoped per (user, client_id), and we
// layer calendar onto the login grant via include_granted_scopes. So this DOES
// revoke the app's whole grant for the user — it is NOT a surgical scope peel.
// That is safe TODAY only because the login flow persists no Google token (it
// consumes the id_token and discards the refresh/access tokens): there is no
// sibling token to kill; worst case the user re-consents on next Google sign-in,
// and their first-party Zaki session cookie is untouched. If any flow ever
// starts STORING a Google token under this client_id, move calendar to its own
// client_id first. The route glue must also delete the stored token regardless
// of the revoke HTTP outcome, so a /revoke network failure never strands a live
// token. Google's /revoke is idempotent; a 400 "already invalid" is success.
export async function revokeGoogleToken({ token, fetchImpl = fetch } = {}) {
  const value = String(token || "").trim();
  if (!value) return { revoked: false, reason: "no_token" };
  const res = await fetchImpl("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token: value }).toString(),
  });
  if (res.ok) return { revoked: true };
  let detail = "";
  try { detail = (await res.json())?.error || ""; } catch { /* ignore */ }
  // token already expired/revoked at Google → treat as done, not an error.
  if (res.status === 400 && /invalid_token|invalid_grant/.test(detail)) return { revoked: true, alreadyGone: true };
  return { revoked: false, status: res.status, detail };
}

// A refresh that returns invalid_grant means the user revoked our grant at
// Google — the poller must stop firing and surface a reconnect (attack 3).
export function isInvalidGrant(tokenErrorPayload) {
  const err = String(tokenErrorPayload?.error || tokenErrorPayload || "").trim();
  return err === "invalid_grant";
}
