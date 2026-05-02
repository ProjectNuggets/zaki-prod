# Phase 2 Context: Replace requireAuthUser (dual-auth window)

**Phase:** 2 — Replace requireAuthUser
**Requirements:** AUTH-01..08
**Goal:** Replace requireAuthUser with ZAKI-first dual-auth logic. Verify ZAKI JWTs locally (no network). Fall back to TYP for legacy tokens. Mint ZAKI session on legacy path. 60-day dual-auth window.

---

## Locked Decisions

### requireAuthUser Replacement (AUTH-01, AUTH-02)
Location: `index.js` — current function at ~line 3842.

New logic (dual-auth):
1. Extract Bearer token from `Authorization` header.
2. `tryDecodeJwtPayload(token)` → check `iss`.
3a. `iss === "zaki"` → `verifyZakiAccessToken(token)` (local HS256, no network). On success: `dbGet("SELECT id, email, verified, plan_tier, plan_status, nova_user_id, current_period_end FROM zaki_users WHERE id = $1", [payload.sub])`. Return `{ email, zakiUser, sessionUser }`.
3b. else (legacy TYP token, no `iss` claim) → `novaSessionRequest("/system/refresh-user", authHeader, { timeout: 5000 })` → if valid: mint ZAKI session, set `X-Zaki-Session-Upgrade` header on response, log legacy path warning. Return same `{ email, zakiUser, sessionUser }` shape.
4. On any failure: return null (existing behavior — handler returns 401).

The return shape `{ email, zakiUser, sessionUser }` MUST stay identical — zero route handler changes.

### requireBotBffContext Replacement (AUTH-02)
Location: `index.js` ~line 8882. Nearly identical logic to requireAuthUser. Apply same dual-auth replacement.

### SELECT Columns (AUTH-03)
`requireAuthUser` currently does `SELECT * FROM zaki_users`. Phase 2 changes to specific columns only:
```sql
SELECT id, email, verified, plan_tier, plan_status, nova_user_id, current_period_end FROM zaki_users WHERE id = $1
```
`password_hash` MUST NOT be in the SELECT. This prevents password hash from appearing in auth context memory throughout request lifetime.

### novaSessionRequest Timeout (AUTH-04)
The TYP fallback call uses the existing `novaSessionRequest` helper with a 5-second timeout.
Current `novaSessionRequest` has no timeout. Add AbortController + setTimeout(5000) wrapping inside requireAuthUser's legacy path (not inside `novaSessionRequest` itself — that would break other callers).

### ZAKI Session Minting on Legacy Path (AUTH-05)
When legacy TYP path succeeds: call `mintZakiSession(zakiUser, req)`, then set `X-Zaki-Session-Upgrade: 1` header on the response. The new refresh token is NOT sent in the Set-Cookie header here (only on /login and /api/auth/refresh) — Phase 3 handles token swap on the frontend.

Actually: `X-Zaki-Session-Upgrade` header signals the frontend that a new access token is available. The response body is unchanged. Frontend (Phase 3) will read this header and call /api/auth/refresh to get a new cookie+token.

### Concurrent Refresh Guard (AUTH-06)
On `/api/auth/refresh`, if another request rotated this user's session within the last 5 seconds, return the already-rotated token instead of rejecting with 401. This prevents race conditions when multiple tabs call /api/auth/refresh simultaneously.

Implementation: after `rotateRefreshToken` throws `SESSION_NOT_FOUND`, do a secondary lookup: `SELECT * FROM zaki_sessions WHERE user_id = $1 AND created_at > NOW() - INTERVAL '5 seconds' AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1`. If found, sign a new access JWT for that session's user and return it. If not found, return 401.

This guard lives in `auth-endpoints.js` `handleRefresh`, not in `rotateRefreshToken`.

### Audit Logging (AUTH-07)
Use `console.log` with `[ZakiAudit]` prefix (same pattern as `[ZakiAuth]`). Log:
- Login success: `[ZakiAudit] login userId=<id> ip=<ip>`
- Session mint: `[ZakiAudit] session_mint userId=<id> ip=<ip>`
- Session refresh: `[ZakiAudit] session_refresh userId=<id> ip=<ip>`
- Session revoke: `[ZakiAudit] session_revoke userId=<id> reason=<logout|password_change>`
- Legacy TYP path: `[ZakiAudit] legacy_typ_path userId=<id> ip=<ip>` (for day-45 checkpoint query)

Add audit log to: `login-handler.js` (login success), `zaki-auth.js` (mint, revoke), `auth-endpoints.js` (refresh).

### Password Change — revokeAllSessionsForUser (AUTH-08)
Find the password change handler in `index.js`. After bcrypt.hashSync + UPDATE zaki_users SET password_hash: call `revokeAllSessionsForUser(user.id)` from `zaki-auth.js`. Import already available.

---

## Code Patterns to Follow

- DB access: `dbGet`, `dbQuery`, `dbAll`, `withDbTransaction` from `./db.js`
- Timeout: `AbortController` + `setTimeout(5000)` wrapping fetch (same pattern as login-handler.js bestEffortTypFetch)
- Cookie constants: import from `./zaki-session-cookie.js` (established in Phase 1 code review)
- Auth context: `{ email, zakiUser, sessionUser }` return shape — `zakiUser` is the DB row, `sessionUser` is the TYP response (kept for workspace compat until Phase 4)
- `tryDecodeJwtPayload` and `verifyZakiAccessToken` are exported from `./zaki-auth.js`
- `mintZakiSession` returns `{ accessToken, refreshToken, refreshTokenHash }` — only `accessToken` needed for X-Zaki-Session-Upgrade path

---

## What Does NOT Change in Phase 2

- Login flow (`login-handler.js`) — untouched
- `/api/auth/refresh` and `/api/auth/logout` — only the concurrent guard is added to refresh
- All route handlers using requireAuthUser — zero changes (return shape preserved)
- Frontend `src/lib/api.ts` — Phase 3
- TYP pod — zero changes
- Nullalis — zero changes

---

## Out of Scope for Phase 2

- Frontend token swap — Phase 3
- Removing TYP /request-token from login — Phase 4
- `typ_session_token` column drop — Phase 4
- Legacy path cutoff enforcement — Phase 5
- `cleanupExpiredSessions` scheduling (AUTH-11 from Phase 1 context, deferred here too)
