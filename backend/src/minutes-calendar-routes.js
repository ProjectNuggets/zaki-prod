import express from "express";
import {
  buildCalendarAuthorizeUrl,
  buildCalendarNonceCookie,
  buildClearedCalendarNonceCookie,
  extractCalendarNonceFromCookieHeader,
  signCalendarConnectState,
  verifyCalendarConnectState,
  verifyCalendarNonceBinding,
  revokeGoogleToken,
} from "./google-calendar-oauth.js";
import {
  upsertCalendarConnection as defaultUpsert,
  getCalendarConnectionStatus as defaultGetStatus,
  takeCalendarRefreshTokenForRevocation as defaultTakeForRevocation,
} from "./minutes-calendar-store.js";
import {
  getAutojoinStatus as defaultGetAutojoinStatus,
  saveAutojoinConsent as defaultSaveAutojoinConsent,
} from "./minutes-calendar-autojoin.js";

// WP-M10 slice 2b — the route glue mounting the calendar OAuth mechanics (slice
// 2) + the encrypted store (slice 1). Dependency-injected like
// buildMinutesControlRouter so it unit-tests against a mock user resolver,
// store, and token-exchange.
//
// IDENTITY MODEL (deviates from the design-review checklist item 3, on purpose):
// the callback is a top-level browser redirect from Google and carries NO bearer
// token, so it cannot re-run the bearer-based resolveUser. Instead it trusts the
// HMAC-signed state.userId — which was written from the *authenticated* session
// at /start — gated by the path-scoped HttpOnly nonce cookie that proves the same
// browser is completing the flow it started. Forging state needs the HMAC secret;
// the nonce cookie can't be read/replayed cross-browser. So the grant can only
// ever attach to the user who authenticated at /start. /start and /disconnect DO
// run resolveUser (they're bearer-authed SPA fetches).

// The id_token is trusted WITHOUT signature verification because it comes
// straight from Google's token endpoint over TLS inside the code exchange (never
// via the browser), and google_sub is stored as metadata only — never used for
// an authorization decision. If sub ever becomes security-load-bearing, verify
// the id_token signature/issuer/aud first.
function decodeIdTokenClaims(idToken) {
  try {
    const [, payload] = String(idToken || "").split(".");
    if (!payload) return {};
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) || {};
  } catch {
    return {};
  }
}

// Persist the full set we actually requested/hold, not just the sensitive one,
// so the stored scopes reflect reality.
const CALENDAR_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/calendar.events.readonly"];

export function buildMinutesCalendarRouter(dependencies = {}) {
  const {
    enabled = false,
    oauthClientId,
    oauthClientSecret,
    oauthStateSecret,
    buildRedirectUri, // (req) => absolute calendar callback URL
    encryptionKey,
    resolveUser,
    isSecure = () => false,
    appUrl = "",
    exchangeCode, // ({ code, redirectUri, clientId, clientSecret, fetchImpl }) => token payload
    fetchImpl = fetch,
    store = {},
    recordFailure = () => {},
  } = dependencies;

  const upsert = store.upsertCalendarConnection || defaultUpsert;
  const getStatus = store.getCalendarConnectionStatus || defaultGetStatus;
  const takeForRevocation = store.takeCalendarRefreshTokenForRevocation || defaultTakeForRevocation;
  const getAutojoin = store.getAutojoinStatus || defaultGetAutojoinStatus;
  const saveAutojoin = store.saveAutojoinConsent || defaultSaveAutojoinConsent;

  const router = express.Router();
  // POST /calendar/autojoin reads req.body. This router is mounted WITHOUT any
  // app-level body parser (index.js applies express.json per-route, and the
  // calendar mount had none), so the router must parse its own JSON — else
  // req.body is undefined and every save silently records enabled:false.
  const jsonBody = express.json({ limit: "16kb", strict: true });

  const configured = () =>
    Boolean(
      String(oauthClientId || "").trim() &&
        String(oauthClientSecret || "").trim() &&
        String(oauthStateSecret || "").trim() &&
        String(encryptionKey || "").trim()
    );

  // A dark/unconfigured deployment is invisible, matching the Minutes control
  // gate: never hint at a feature that isn't wired.
  const guard = (req, res) => {
    if (!enabled || !configured()) {
      res.status(404).json({ error: "not_found" });
      return false;
    }
    return true;
  };

  const settleReturn = (req, base, params) => {
    const target = new URL(String(base || "/settings"), appUrl || "http://localhost");
    for (const [k, v] of Object.entries(params || {})) target.searchParams.set(k, v);
    const pathOnly = `${target.pathname}${target.search}${target.hash}`;
    // The callback runs on the API origin, but the SPA lives on the APP origin
    // (split app/api hosts, e.g. api-staging vs app-staging). A relative redirect
    // would land on the API host, which doesn't serve the SPA (blank 500). Redirect
    // to the configured app origin, taking ONLY the path/query/hash from returnTo so
    // a crafted absolute returnTo can't open-redirect off the app origin (host is
    // always appUrl). Falls back to a relative path when appUrl is unset (single-host).
    const appOrigin = String(appUrl || "").replace(/\/+$/, "");
    return appOrigin ? `${appOrigin}${pathOnly}` : pathOnly;
  };

  // res.setHeader REPLACES; a bearer resolver (legacy-TYP path) may have already
  // set a session-upgrade Set-Cookie. Append rather than clobber it.
  const appendSetCookie = (res, cookie) => {
    const existing = res.getHeader("Set-Cookie");
    const list = existing ? (Array.isArray(existing) ? existing.slice() : [existing]) : [];
    list.push(cookie);
    res.setHeader("Set-Cookie", list);
  };

  // GET /calendar/connect/start — bearer-authed SPA fetch. Returns the Google
  // authorize URL as JSON and sets the nonce cookie; the SPA navigates.
  router.get("/calendar/connect/start", async (req, res) => {
    if (!guard(req, res)) return;
    try {
      const auth = await resolveUser(req, res);
      if (!auth) return; // resolveUser already sent 401
      const userId = String(auth.zakiUser?.id || "");
      const { state, nonce } = signCalendarConnectState({
        userId,
        returnTo: req.query?.returnTo,
        stateSecret: oauthStateSecret,
      });
      const authorizeUrl = buildCalendarAuthorizeUrl({
        clientId: oauthClientId,
        redirectUri: buildRedirectUri(req),
        state,
      });
      appendSetCookie(res, buildCalendarNonceCookie(nonce, { secure: isSecure(req) }));
      res.json({ authorizeUrl });
    } catch (err) {
      recordFailure({ stage: "start", code: "calendar_oauth_start_failed" });
      if (!res.headersSent) res.status(500).json({ error: "calendar_oauth_start_failed" });
    }
  });

  // GET /calendar/connect/status — bearer-authed SPA fetch.
  router.get("/calendar/connect/status", async (req, res) => {
    if (!guard(req, res)) return;
    try {
      const auth = await resolveUser(req, res);
      if (!auth) return;
      res.json(await getStatus({ userId: String(auth.zakiUser?.id || "") }));
    } catch {
      if (!res.headersSent) res.status(502).json({ error: "calendar_status_unavailable" });
    }
  });

  // GET /calendar/connect/callback — top-level browser redirect from Google.
  // No bearer; identity comes from the signed state + nonce cookie.
  router.get("/calendar/connect/callback", async (req, res) => {
    if (!guard(req, res)) return;
    const secure = isSecure(req);
    const clearNonce = () => res.setHeader("Set-Cookie", buildClearedCalendarNonceCookie({ secure }));
    const fail = (code, returnTo = "/settings") => {
      clearNonce();
      res.redirect(302, settleReturn(req, returnTo, { calendar: "error", reason: code }));
    };
    try {
      const state = String(req.query?.state || "").trim();
      const googleError = String(req.query?.error || "").trim();
      // Verify state FIRST so we have a trustworthy returnTo for the redirect.
      let verified;
      try {
        verified = verifyCalendarConnectState(state, oauthStateSecret);
      } catch {
        return fail("bad_state");
      }
      const returnTo = verified.returnTo;
      if (googleError) return fail(googleError === "access_denied" ? "cancelled" : "google_error", returnTo);

      // Nonce cookie proves the same browser that started the flow.
      const cookieNonce = extractCalendarNonceFromCookieHeader(req.headers?.cookie);
      try {
        verifyCalendarNonceBinding({ cookieNonce, stateNonceHash: verified.nonceHash });
      } catch {
        return fail("nonce_mismatch", returnTo);
      }

      const code = String(req.query?.code || "").trim();
      if (!code) return fail("missing_code", returnTo);

      const tokenPayload = await exchangeCode({
        code,
        redirectUri: buildRedirectUri(req),
        clientId: oauthClientId,
        clientSecret: oauthClientSecret,
        fetchImpl,
      });
      const refreshToken = String(tokenPayload?.refresh_token || "").trim();
      // Google omits refresh_token on a re-consent it considers redundant. We set
      // prompt=consent to avoid that, but if it still happens, DO NOT clobber the
      // stored token — surface a reconnect.
      if (!refreshToken) {
        recordFailure({ stage: "callback", code: "no_refresh_token", userId: verified.userId });
        return fail("no_refresh_token", returnTo);
      }
      const claims = decodeIdTokenClaims(tokenPayload?.id_token);
      await upsert({
        userId: verified.userId,
        googleSub: claims.sub,
        scopes: CALENDAR_SCOPES,
        refreshToken,
        encryptionKey,
      });
      clearNonce();
      res.redirect(302, settleReturn(req, returnTo, { calendar: "connected" }));
    } catch (err) {
      recordFailure({ stage: "callback", code: "calendar_callback_failed" });
      fail("callback_failed");
    }
  });

  // POST /calendar/disconnect — bearer-authed SPA fetch (POST = CSRF-safe under
  // the SPA's bearer model; not a GET). Revokes the specific refresh_token, then
  // the store deletes the row regardless of the revoke result.
  router.post("/calendar/disconnect", async (req, res) => {
    if (!guard(req, res)) return;
    try {
      const auth = await resolveUser(req, res);
      if (!auth) return;
      const userId = String(auth.zakiUser?.id || "");
      // takeForRevocation returns the decrypted token once AND deletes the row,
      // so a /revoke failure below never strands a live token in the store.
      const token = await takeForRevocation({ userId, encryptionKey });
      let revoked = false;
      if (token) {
        try {
          revoked = (await revokeGoogleToken({ token, fetchImpl })).revoked;
        } catch {
          revoked = false; // best-effort; the row is already gone
        }
      }
      res.json({ disconnected: true, revoked });
    } catch {
      if (!res.headersSent) res.status(502).json({ error: "calendar_disconnect_failed" });
    }
  });

  // GET /calendar/autojoin — the standing-consent + scope settings view.
  router.get("/calendar/autojoin", async (req, res) => {
    if (!guard(req, res)) return;
    try {
      const auth = await resolveUser(req, res);
      if (!auth) return;
      res.json(await getAutojoin({ userId: String(auth.zakiUser?.id || "") }));
    } catch {
      if (!res.headersSent) res.status(502).json({ error: "calendar_autojoin_unavailable" });
    }
  });

  // POST /calendar/autojoin — grant/withdraw the standing auto-join consent and
  // set the meeting scope. Bearer-authed SPA fetch (POST = CSRF-safe here).
  router.post("/calendar/autojoin", jsonBody, async (req, res) => {
    if (!guard(req, res)) return;
    try {
      const auth = await resolveUser(req, res);
      if (!auth) return;
      const userId = String(auth.zakiUser?.id || "");
      const body = req.body && typeof req.body === "object" ? req.body : {};
      await saveAutojoin({ userId, enabled: Boolean(body.enabled), joinScope: body.joinScope ?? body.join_scope });
      res.json(await getAutojoin({ userId }));
    } catch {
      if (!res.headersSent) res.status(502).json({ error: "calendar_autojoin_save_failed" });
    }
  });

  return router;
}
