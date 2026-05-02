---
phase: 02-replace-requireauthuser
reviewed: 2026-05-02T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - backend/src/require-auth-user.js
  - backend/src/auth-endpoints.js
  - backend/src/zaki-auth.js
  - backend/src/login-handler.js
  - backend/src/index.js
  - backend/src/zaki-session-cookie.js
findings:
  critical: 0
  high: 3
  medium: 3
  low: 3
  info: 4
  total: 13
status: issues_found
---

# Phase 02: Code Review Report — replace-requireauthuser

**Reviewed:** 2026-05-02
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

---

## Summary

Phase 02 correctly wires the dual-auth factory, concurrent refresh guard, audit logging, and `revokeAllSessionsForUser` on password change. The architecture is sound: ZAKI tokens verify locally, legacy TYP tokens fall back with an AbortController timeout, and the return shape is preserved so zero route handlers changed.

Three high-severity issues require attention before production traffic:

1. `Number(payload.sub)` in `resolveZakiPath` passes `NaN` to the DB query when `sub` is non-numeric — a forged token can trigger a type error or unexpected DB behavior.
2. The concurrent refresh guard's inner subquery does not filter `AND revoked_at IS NULL` on the session it uses to look up `user_id`, meaning a revoked (stolen + rotated) token hash can still resolve a `user_id` and pass the guard.
3. `X-Zaki-Session-Upgrade` carries the full access JWT in a plain response header. While HTTPS mitigates interception, the header persists in server logs, CDN edge caches, and browser devtools — an access token should not travel as a header value.

---

## High Severity

### H-01: `Number(payload.sub)` — NaN passed to DB on non-numeric sub

**File:** `backend/src/require-auth-user.js:46`

**Issue:** The JWT `sub` claim is always a string (jose sets it via `String(zakiUser.id)` in `zaki-auth.js:42`). `Number("12345")` works correctly. However, a token with a crafted or malformed `sub` (e.g. `"abc"`, `""`, or `"12 34"`) yields `Number("abc") === NaN`. When `NaN` is passed as a PostgreSQL parameter, `pg` coerces it to the string `"NaN"` rather than throwing immediately, which means the `WHERE id = $1` predicate silently returns zero rows — the user is then treated as not found and a 401 is returned. That is the safe outcome, but it bypasses any assumption that a verified ZAKI token carries a valid ID and can mask a misconfigured token-minting path.

More importantly: if a future caller creates a ZAKI token with a non-integer `sub` (e.g., a UUID), every request from that user silently returns 401 with no diagnostic log, making the failure extremely hard to trace.

**Fix:** Validate that `sub` parses to a positive integer before querying:

```js
// require-auth-user.js — resolveZakiPath
const userId = Number.parseInt(String(payload.sub), 10);
if (!Number.isInteger(userId) || userId <= 0) return { error: "invalid_token" };
const zakiUser = await dbGet(
  `SELECT ${ZAKI_USER_COLUMNS} FROM zaki_users WHERE id = $1`,
  [userId]
);
```

---

### H-02: Concurrent refresh guard inner subquery does not filter revoked sessions

**File:** `backend/src/auth-endpoints.js:46`

**Issue:** The guard query resolves `user_id` from the presented (now-stale) token hash via a correlated subquery:

```sql
WHERE s.user_id = (SELECT user_id FROM zaki_sessions WHERE refresh_token_hash = $1)
```

The inner `SELECT` has no `AND revoked_at IS NULL` filter. A revoked session row remains in the table until cleanup runs (currently unscheduled — see I-01). An attacker who possesses a previously rotated (and therefore revoked) refresh token can present it to `/api/auth/refresh`, fail the primary lookup (correct — it is revoked), then hit the guard. The inner subquery finds the revoked row, resolves the `user_id`, and if that user happened to refresh another session within the last 5 seconds, the guard returns a valid access token for that user.

In practice this requires the victim to have refreshed very recently, so the window is narrow. But the correct behavior is: if the presented token hash belongs only to a revoked session, the guard must not help.

**Fix:** Add `AND revoked_at IS NULL` (or `OR expires_at > NOW()`) to the inner subquery:

```sql
WHERE s.user_id = (
  SELECT user_id FROM zaki_sessions
  WHERE refresh_token_hash = $1
    AND expires_at > NOW()   -- at minimum, token was not expired at the time it was issued
)
```

Note: even `expires_at > NOW()` is stricter — a properly rotated token has `revoked_at` set and should be rejected. The cleanest fix is:

```sql
  WHERE refresh_token_hash = $1
  -- no revoked_at filter: a recently rotated token is revoked, but we still want
  -- its user_id so we can look for a sibling session minted by a winning tab.
  -- This is intentional for the race case.
```

On further inspection, the race scenario is: tab A and tab B both hold the same valid (not yet rotated) refresh token. Tab A wins the `FOR UPDATE` lock, rotates, marks the old row revoked. Tab B arrives after and hits the guard with a hash that is now revoked — this is the exact legitimate use case. So the inner subquery intentionally omits `revoked_at IS NULL`.

Revising the severity: the attack requires possessing an expired-and-revoked token (not just rotated), which is harder to obtain. The outer query correctly requires the sibling session to be `revoked_at IS NULL AND created_at > NOW() - INTERVAL '5 seconds'`. The guard therefore only returns a token if a *different*, currently-active session for that user was minted in the last 5 seconds — which an attacker cannot engineer by merely holding a revoked hash.

**Revised assessment:** The logic is defensible for the race case. However add a comment to the inner subquery explicitly documenting why `revoked_at IS NULL` is intentionally absent, to prevent a future maintainer from "fixing" it incorrectly:

```sql
-- intentionally no revoked_at filter: a just-rotated token is revoked by the winning tab;
-- we still need its user_id to check whether a sibling tab already minted a fresh session.
(SELECT user_id FROM zaki_sessions WHERE refresh_token_hash = $1)
```

**Downgrade this finding to MEDIUM — see M-01 below.**

---

### H-02 (REVISED — actual second high finding): Access JWT exposed in `X-Zaki-Session-Upgrade` response header

**File:** `backend/src/require-auth-user.js:79`

**Issue:** The full ZAKI access token (a signed HS256 JWT, valid for 15 minutes) is written directly into the `X-Zaki-Session-Upgrade` response header:

```js
res.setHeader("X-Zaki-Session-Upgrade", accessToken);
```

The 02-CONTEXT.md spec (AUTH-05 note) says this header "signals the frontend that a new access token is available" and that the frontend will "call /api/auth/refresh to get a new cookie+token." That description implies the header should carry a *signal* (e.g., `"1"` or `"true"`), not the token itself.

Putting the full JWT in a response header causes it to appear in:
- Express/Node HTTP access logs (if any middleware logs response headers)
- CDN or reverse-proxy request logs (Nginx, Cloudflare)
- Browser developer tools Network tab (readable without special permissions)
- Any API gateway that captures response headers for debugging

An access JWT must be treated as a secret for its 15-minute TTL. If the intent is for the frontend to use this token directly (not call `/api/auth/refresh`), the risk is lower because the token is short-lived and the user already holds a valid TYP token. But the spec's own description says the frontend should *then* call `/api/auth/refresh` — meaning the header token is never used and is exposed for no gain.

**Fix (Option A — signal only, per spec):**

```js
// require-auth-user.js:79
res.setHeader("X-Zaki-Session-Upgrade", "1");
// Frontend: on seeing X-Zaki-Session-Upgrade: 1, call POST /api/auth/refresh
// to exchange the (newly minted, cookie-backed) refresh token for a new access JWT.
// Note: mintZakiSession already inserted the session row; the cookie must be set
// here to make /api/auth/refresh work. See Phase 3 plan.
```

**Fix (Option B — if the token is needed directly by the frontend):**

Keep the current behavior but ensure the exposed header list in the CORS config is limited to specific origins (already done), and add a note to the Phase 3 plan that the token in this header replaces the `/api/auth/refresh` call.

Either way, document the choice explicitly. Currently there is a mismatch between the CONTEXT.md spec and the implementation.

---

### H-03: `resolveZakiPath` DB error propagates as an unhandled exception, returning 500 instead of 401

**File:** `backend/src/require-auth-user.js:41-49`

**Issue:** `resolveZakiPath` is not wrapped in a try/catch:

```js
async function resolveZakiPath(token) {
  const payload = await verifyZakiAccessToken(token);
  if (!payload || !payload.sub) return { error: "invalid_token" };
  const zakiUser = await dbGet(           // ← throws if DB is down
    `SELECT ${ZAKI_USER_COLUMNS} FROM zaki_users WHERE id = $1`,
    [Number(payload.sub)]
  );
  if (!zakiUser || !zakiUser.verified) return { error: "user_not_found" };
  return { ok: true, email: zakiUser.email, zakiUser, sessionUser: null };
}
```

If `dbGet` throws (connection timeout, pool exhausted, transient network error), the exception propagates up to `requireAuthUser`, which has no try/catch. The exception then propagates to the Express route handler, which also typically has no outer try/catch (routes call `await requireAuthUser(req, res)` and immediately `if (!authResult) return`). Express will catch the unhandled promise rejection and return a generic 500, but only if the global error handler is configured. Some routes in `index.js` are bare `async (req, res)` handlers with their own try/catch — those will catch it. Others are not wrapped.

`resolveLegacyPath` correctly wraps everything in a `try/catch` (line 86), treating all failures as `{ error: "invalid_token" }`.

**Fix:** Wrap the DB call in `resolveZakiPath` to match legacy path behavior:

```js
async function resolveZakiPath(token) {
  try {
    const payload = await verifyZakiAccessToken(token);
    if (!payload || !payload.sub) return { error: "invalid_token" };
    const userId = Number.parseInt(String(payload.sub), 10);
    if (!Number.isInteger(userId) || userId <= 0) return { error: "invalid_token" };
    const zakiUser = await dbGet(
      `SELECT ${ZAKI_USER_COLUMNS} FROM zaki_users WHERE id = $1`,
      [userId]
    );
    if (!zakiUser || !zakiUser.verified) return { error: "user_not_found" };
    return { ok: true, email: zakiUser.email, zakiUser, sessionUser: null };
  } catch (err) {
    console.error("[ZakiAuth] resolveZakiPath error:", err?.message);
    return { error: "server_error" };
  }
}
```

Note: returning `{ error: "server_error" }` will cause `requireAuthUser` to respond with `401 { error: "server_error" }` — you may want a separate 503 path. The simplest improvement is just adding the try/catch and re-throwing, letting the route's own try/catch return 500.

---

## Medium Severity

### M-01: Concurrent refresh guard inner subquery missing intentional-absence comment (documentation correctness)

**File:** `backend/src/auth-endpoints.js:46`

**Issue:** As analyzed in H-02 above, the omission of `AND revoked_at IS NULL` from the inner subquery is intentional for the race case (tab A rotates, tab B presents the same now-revoked hash). However, no comment documents this. A future maintainer will almost certainly "fix" this by adding `AND revoked_at IS NULL`, which breaks the guard's purpose entirely.

**Fix:** Add a one-line comment:

```sql
-- No revoked_at filter: the winning tab already revoked this hash; we still need
-- its user_id to find the sibling session minted by the winning tab.
WHERE s.user_id = (SELECT user_id FROM zaki_sessions WHERE refresh_token_hash = $1)
```

---

### M-02: Legacy upgrade path mints a session but never sets the refresh cookie — frontend cannot use `/api/auth/refresh`

**File:** `backend/src/require-auth-user.js:77-79`

**Issue:** When the legacy TYP path succeeds, `mintZakiSession` inserts a `zaki_sessions` row and returns `{ accessToken, refreshToken, refreshTokenHash }`. Only `accessToken` is captured. The `refreshToken` is discarded:

```js
const { accessToken } = await mintZakiSession({ id: zakiUser.id, email: zakiUser.email }, req);
try { res.setHeader("X-Zaki-Session-Upgrade", accessToken); } catch (_e) {}
```

`mintZakiSession` in `zaki-auth.js` logs `[ZakiAudit] session_mint` for every call. So every legacy request that succeeds writes a new orphaned session row to `zaki_sessions` — one row per authenticated API call — with no corresponding refresh cookie ever sent to the browser. These rows will accumulate until `cleanupExpiredSessions` runs (currently unscheduled).

If the frontend is meant to call `/api/auth/refresh` upon seeing `X-Zaki-Session-Upgrade`, it cannot do so because no refresh cookie was set. The session row that was inserted is therefore unreachable.

**Fix:** Either:
- Only call `mintZakiSession` once per login (not per API call) by checking whether the user already has an active ZAKI session before minting. Or:
- Set the refresh cookie on the response here (matching the Phase 3 plan's token-swap flow). Or:
- Do not call `mintZakiSession` on the per-request legacy path at all; instead have the frontend explicitly call `/login` to get a ZAKI session when Phase 3 ships.

The simplest immediate fix is a guard before minting:

```js
// Only mint if user has no active ZAKI session yet (avoids session row explosion)
const existingSession = await dbGet(
  `SELECT id FROM zaki_sessions WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1`,
  [zakiUser.id]
);
if (!existingSession) {
  const { accessToken } = await mintZakiSession({ id: zakiUser.id, email: zakiUser.email }, req);
  try { res.setHeader("X-Zaki-Session-Upgrade", accessToken); } catch (_e) {}
}
```

---

### M-03: `verified` flag not checked on legacy TYP path

**File:** `backend/src/require-auth-user.js:70-74`

**Issue:** The ZAKI path (line 48) checks `!zakiUser || !zakiUser.verified` before granting access. The legacy TYP path (line 70-74) only checks `!zakiUser`:

```js
const zakiUser = await dbGet(
  `SELECT ${ZAKI_USER_COLUMNS} FROM zaki_users WHERE email = $1`,
  [email]
);
if (!zakiUser) return { error: "user_not_found" };
// ← verified check missing
return { ok: true, email, zakiUser, sessionUser: sessionData.user || sessionData };
```

A user whose email is in `zaki_users` with `verified = false` would be blocked on the ZAKI path but granted access on the legacy TYP path (because TYP authenticated them successfully). This creates an inconsistency: an unverified ZAKI account can authenticate if it has a valid TYP token.

**Fix:**

```js
if (!zakiUser) return { error: "user_not_found" };
if (!zakiUser.verified) return { error: "user_not_found" };
```

---

## Low Severity

### L-01: No rate limiting on `POST /api/auth/logout`

**File:** `backend/src/auth-endpoints.js:163`

**Issue:** `/api/auth/refresh` has a rate limiter (60 requests / 15 minutes / IP). `/api/auth/logout` has none. The logout handler performs a `SELECT` + `UPDATE` on `zaki_sessions` on every call. An unauthenticated caller can flood the endpoint causing unnecessary DB load. Logout is intentionally unauthenticated (to allow clearing cookies even with an invalid access token), but a basic rate limit is still appropriate.

**Fix:**

```js
router.post("/logout", rateLimit({ windowMs: 15 * 60 * 1000, max: 30, ... }), handleLogout);
```

---

### L-02: `cleanupExpiredSessions` is exported but never scheduled

**File:** `backend/src/zaki-auth.js:168`

**Issue:** `cleanupExpiredSessions` deletes sessions older than 7 days. It is exported from `zaki-auth.js` but is not imported or called anywhere in `index.js`. The CONTEXT.md notes this is deferred ("AUTH-11 from Phase 1 context, deferred here too"). Without cleanup, `zaki_sessions` will grow unboundedly. Given every legacy path API call also mints a new orphaned session row (M-02), this growth will be faster than expected.

**Fix:** Schedule via `setInterval` at startup, or integrate with an existing cron endpoint. Minimum viable approach in `index.js`:

```js
// After initDb() succeeds:
setInterval(async () => {
  try { await cleanupExpiredSessions(); }
  catch (err) { console.warn("[ZakiAuth] session cleanup failed:", err?.message); }
}, 6 * 60 * 60 * 1000); // every 6 hours
```

---

### L-03: `setTimeout` in `resolveLegacyPath` is not `.unref()`'d

**File:** `backend/src/require-auth-user.js:55`

**Issue:** The 5-second AbortController timer:

```js
const timer = setTimeout(() => controller.abort(), TYP_FALLBACK_TIMEOUT_MS);
```

The timer correctly goes through `clearTimeout(timer)` in `finally`, so it does not leak. However if the process receives a shutdown signal while a request is in flight, the timer prevents the Node.js event loop from draining cleanly during the `SHUTDOWN_GRACE_MS` window. `fetchWithTimeout` in `index.js` calls `timeout.unref()` to avoid this; `resolveLegacyPath` does not.

**Fix:**

```js
const timer = setTimeout(() => controller.abort(), TYP_FALLBACK_TIMEOUT_MS);
if (typeof timer.unref === "function") timer.unref();
```

---

## Info

### I-01: `SELECT *` still used in `loginHandler` and `buildDevAuthResultFromUserId`

**File:** `backend/src/login-handler.js:88`, `backend/src/index.js:8692`

The `requireAuthUser` refactor correctly moves to `SELECT id, email, verified, ...` (AUTH-03). However `loginHandler` still does `SELECT * FROM zaki_users WHERE email = $1`, which returns `password_hash` into the `user` object. This is not a new issue (it predates Phase 2) and `password_hash` is needed for `bcrypt.compare`, but the row then flows into `mintZakiSession`, which only needs `id` and `email`. The hash lives in memory for the duration of the request. Not a Phase 2 regression — note for cleanup.

---

### I-02: Audit log for `login` fires after session mint, so a mint failure leaves a logged login with no corresponding session

**File:** `backend/src/login-handler.js:171-175`

```js
const { accessToken, refreshToken, refreshTokenHash } = await mintZakiSession(...);
console.log(`[ZakiAudit] login userId=${user.id} ...`);
```

If `mintZakiSession` throws, the audit log is never written (correct). But the `[ZakiAudit] session_mint` log inside `mintZakiSession` fires before the `[ZakiAudit] login` log in `loginHandler`. So the audit trail shows `session_mint` without a preceding `login` if `loginHandler`'s own log is never reached. Minor ordering issue; the data is complete but the sequence is counterintuitive for log forensics.

---

### I-03: `X-Zaki-Session-Upgrade` header spec mismatch between CONTEXT.md and implementation

**File:** `backend/src/require-auth-user.js:79` / `02-CONTEXT.md line 38`

CONTEXT.md says: "The response body is unchanged. Frontend (Phase 3) will read this header and call /api/auth/refresh." This implies the header is a signal, but the implementation sets the full access token as the value. If Phase 3 is built to use this token directly (treating it as the new access token without a `/api/auth/refresh` round-trip), the missing refresh cookie (M-02) makes it impossible to use the ZAKI session going forward. Ensure Phase 3 design is finalized before the implementation is locked.

---

### I-04: Legacy path audit log fires inside the mint try/catch — not emitted if mint fails

**File:** `backend/src/require-auth-user.js:80`

```js
try {
  const { accessToken } = await mintZakiSession(...);
  try { res.setHeader("X-Zaki-Session-Upgrade", accessToken); } catch (_e) {}
  console.log(`[ZakiAudit] legacy_typ_path userId=${zakiUser.id} ...`);  // ← inside mint try
} catch (mintErr) {
  console.warn("[ZakiAuth] legacy path session mint failed:", mintErr?.message);
}
```

If `mintZakiSession` throws, the `legacy_typ_path` audit event is not logged. The CONTEXT.md calls this log out specifically for "day-45 checkpoint query" — so every legacy-path authentication that failed to mint a session is invisible in the audit trail. The TYP auth itself succeeded; only the mint failed.

**Fix:** Move the audit log before the mint attempt, or add a separate log in the catch block:

```js
console.log(`[ZakiAudit] legacy_typ_path userId=${zakiUser.id} ip=${req?.ip ?? "unknown"}`);
try {
  const { accessToken } = await mintZakiSession(...);
  try { res.setHeader("X-Zaki-Session-Upgrade", accessToken); } catch (_e) {}
} catch (mintErr) {
  console.warn("[ZakiAuth] legacy path session mint failed:", mintErr?.message);
}
```

---

## Finding Index

| ID | Severity | File | Line | Title |
|----|----------|------|------|-------|
| H-01 | HIGH | require-auth-user.js | 46 | `Number(payload.sub)` — NaN passed to DB on non-numeric sub |
| H-02 | HIGH | require-auth-user.js | 79 | Full access JWT written to `X-Zaki-Session-Upgrade` response header |
| H-03 | HIGH | require-auth-user.js | 41 | `resolveZakiPath` DB error propagates unhandled — no try/catch |
| M-01 | MEDIUM | auth-endpoints.js | 46 | Concurrent guard inner subquery missing intentional-absence comment |
| M-02 | MEDIUM | require-auth-user.js | 77 | Legacy path mints session per-request but never sets refresh cookie |
| M-03 | MEDIUM | require-auth-user.js | 70 | `verified` flag not checked on legacy TYP auth path |
| L-01 | LOW | auth-endpoints.js | 163 | No rate limiting on `POST /api/auth/logout` |
| L-02 | LOW | zaki-auth.js | 168 | `cleanupExpiredSessions` exported but never scheduled |
| L-03 | LOW | require-auth-user.js | 55 | AbortController `setTimeout` not `.unref()`'d |
| I-01 | INFO | login-handler.js | 88 | `SELECT *` still used in loginHandler (predates Phase 2) |
| I-02 | INFO | login-handler.js | 171 | `session_mint` audit log precedes `login` audit log |
| I-03 | INFO | require-auth-user.js | 79 | Header value vs. signal: spec mismatch between CONTEXT.md and code |
| I-04 | INFO | require-auth-user.js | 80 | `legacy_typ_path` audit log suppressed when mint fails |

---

_Reviewed: 2026-05-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
