---
phase: 01-zaki-mints-sessions
verified: 2026-05-02T12:00:00Z
status: passed
score: 6/6 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/6
  gaps_closed:
    - "Existing users can log in with no visible change (frontend contract: data.valid && data.token)"
  gaps_remaining: []
  regressions: []
---

# Phase 1: ZAKI Mints Sessions — Verification Report

**Phase Goal:** ZAKI backend mints HS256 access JWTs and rotating HttpOnly refresh cookies on login, with session storage in `zaki_sessions`, a config-validation startup gate for the signing key, and refresh/logout endpoints.
**Verified:** 2026-05-02T12:00:00Z
**Status:** PASSED
**Re-verification:** Yes — after gap closure (gap: NOVA_API_BASE vs NOVA_TYP_BASE_URL)

---

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POST /login returns valid HS256 JWT with iss:zaki and sets HttpOnly zaki_refresh cookie | VERIFIED | `zaki-auth.js` lines 34-38: `alg:"HS256"`, `setIssuer("zaki")`, `setSubject(String(zakiUser.id))`, `setJti(crypto.randomUUID())`. Cookie: `zaki_refresh=...; HttpOnly; Secure; SameSite=Strict; Domain=.chatzaki.com; Path=/api/auth/refresh`. 29/29 tests pass. |
| 2 | POST /api/auth/refresh rotates the refresh token and returns a new access JWT | VERIFIED | `auth-endpoints.js` `handleRefresh` calls `rotateRefreshToken` (atomic `withDbTransaction`). Rate limited 60/15min/IP via `buildRefreshLimiter()` (windowMs:900000, max:60). Returns `{token: accessToken}` + new Set-Cookie. |
| 3 | POST /api/auth/logout revokes the session and clears the cookie | VERIFIED | `auth-endpoints.js` `handleLogout` sets `revoked_at = NOW()`, returns `Max-Age=0` cookie to clear. Idempotent (handles missing cookie). |
| 4 | ZAKI_JWT_SIGNING_KEY missing in production causes startup failure | VERIFIED | `config-validation.js` lines 241-252: pushes error when absent or not 64-char hex. `index.js` throws on startup when `configReport.ok` is false in production. |
| 5 | zaki_sessions table exists in DB with required columns and 3 indexes | VERIFIED | `db.js` lines 911-935: `CREATE TABLE IF NOT EXISTS zaki_sessions` with all required columns. Three indexes: `idx_zaki_sessions_user_id`, `idx_zaki_sessions_active` (partial WHERE revoked_at IS NULL), `idx_zaki_sessions_refresh_hash` (UNIQUE). |
| 6 | Existing users can log in with no visible change (frontend contract: data.valid && data.token) | VERIFIED | Fix confirmed: `login-handler.js` no longer reads `process.env.NOVA_API_BASE`. DB lookup at line 101 runs unconditionally after input validation. Bcrypt check at line 118 runs before any TYP call. `NOVA_TYP_BASE_URL` read at line 194 (after bcrypt passes). URL normalized via `replace(/\/+$/, "")` + `/api` suffix if absent. TYP call skipped when `typApiBase` is null. Response at line 213: `{valid:true, token:accessToken}`. Integration test line 24 sets `NOVA_TYP_BASE_URL` (not `NOVA_API_BASE`). |

**Score:** 6/6 truths verified

---

## Gap Closure Detail

### Closed: NOVA_API_BASE early guard (was SC-6 blocker)

**Previous state:** `login-handler.js` read `process.env.NOVA_API_BASE` at what was line 101, followed by an immediate `if (!typBase)` guard that returned HTTP 500 before DB lookup. `NOVA_API_BASE` is not defined in `.env` or `.env.example` — only `NOVA_TYP_BASE_URL` is. All production logins were blocked.

**Fix applied:**
- Removed the early `NOVA_API_BASE` guard entirely. The handler now goes straight to DB lookup at line 101.
- `NOVA_TYP_BASE_URL` is read at line 194, after bcrypt passes, and only used for the best-effort TYP call.
- URL normalization (trailing slash strip + `/api` suffix) matches the legacy `getApiBase()` helper in `index.js`.
- TYP call is guarded by `typApiBase !== null` — if `NOVA_TYP_BASE_URL` is unset, the TYP call is silently skipped and login succeeds with ZAKI session only.
- Integration test updated to set `process.env.NOVA_TYP_BASE_URL` (line 24) — `NOVA_API_BASE` no longer appears anywhere in the file.

**Verification commands:**
```
grep -n "NOVA_API_BASE" backend/src/login-handler.js   # no output — variable is gone
grep -n "NOVA_TYP_BASE_URL" backend/src/login-handler.js  # lines 58, 194
grep -n "NOVA_TYP_BASE_URL" backend/src/login-zaki.integration.test.js  # line 24
```

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/zaki-auth.js` | mintZakiSession, verifyZakiAccessToken, rotateRefreshToken, revokeAllSessionsForUser, tryDecodeJwtPayload, cleanupExpiredSessions | VERIFIED | All 6 exports present. HS256, iss:zaki, sub:String(userId), email, jti (randomUUID), kid header confirmed. |
| `backend/src/db.js` | zaki_sessions CREATE TABLE IF NOT EXISTS with all columns + 3 indexes | VERIFIED | Lines 911-935: full table definition. Three indexes immediately after. |
| `backend/src/config-validation.js` | ZAKI_JWT_SIGNING_KEY checked as required production error | VERIFIED | Lines 241-252: production block. Checks absence and 64-char hex format. |
| `backend/src/auth-endpoints.js` | POST /refresh (60/15min/IP), POST /logout, parseRefreshCookie | VERIFIED | `buildRefreshLimiter()` windowMs:900000 max:60. `parseRefreshCookie` manual parse — no cookie-parser dep. Both routes in `buildAuthRouter()`. |
| `backend/src/login-handler.js` | loginHandler, ZAKI session minting after bcrypt, HttpOnly cookie, best-effort TYP with NOVA_TYP_BASE_URL, returns {valid:true, token:accessToken} | VERIFIED | Fix applied. DB lookup first, bcrypt second, mintZakiSession third, TYP call fourth (skipped if NOVA_TYP_BASE_URL unset). Response: `{valid:true, token:accessToken}`. |
| `backend/src/index.js` | imports loginHandler + buildAuthRouter, mounts /api/auth, X-Zaki-Session-Upgrade in exposedHeaders | VERIFIED | Lines 93-94: imports. Lines 5271-5273: routes. Line 2091: exposedHeaders. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `login-handler.js` | `zaki-auth.js` mintZakiSession | import + call at line 184 | WIRED | Called after bcrypt passes, passing `{id:user.id, email:user.email}, req`. |
| `auth-endpoints.js` | `zaki-auth.js` rotateRefreshToken | import + call in handleRefresh | WIRED | Called in atomic transaction with old token hash. |
| `login-handler.js` | TYP /request-token | bestEffortTypFetch with NOVA_TYP_BASE_URL | WIRED (conditional) | typApiBase is null when NOVA_TYP_BASE_URL unset — TYP call safely skipped, login proceeds. |
| `index.js` | `login-handler.js` | import + route mount | WIRED | Lines 93, 5271-5272: loginHandler mounted at POST /login and POST /api/login. |
| `index.js` | `auth-endpoints.js` | import + app.use("/api/auth") | WIRED | Lines 93, 5273: buildAuthRouter mounted at /api/auth. |
| `zaki-auth.js` | `db.js` zaki_sessions table | dbQuery INSERT in mintZakiSession | WIRED | INSERT into zaki_sessions with correct columns. Table created by initDb(). |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `login-handler.js` | `accessToken` (returned in body) | `mintZakiSession` → `signAccessToken` → jose SignJWT | Yes — signs real payload from DB user row | FLOWING |
| `login-handler.js` | `typApiBase` (for TYP call) | `process.env.NOVA_TYP_BASE_URL` | Yes — env var defined in .env; null when absent, skips TYP call | FLOWING |
| `auth-endpoints.js` | `accessToken` (returned in refresh) | `rotateRefreshToken` → `signAccessToken` | Yes | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 29 Phase 1 tests pass | `node --experimental-vm-modules node_modules/jest/bin/jest.js --testPathPatterns="zaki-auth\|auth-endpoints\|login-zaki\|config-validation"` | Test Suites: 4 passed, 4 total. Tests: 29 passed, 29 total. Time: 0.311s | PASS |

---

## Requirements Coverage

| Requirement | Evidence | Status |
|-------------|----------|--------|
| OATH-01: mintZakiSession signs HS256 JWT | `signAccessToken` in `zaki-auth.js` lines 34-38, verified by test | SATISFIED |
| OATH-02: INSERT into zaki_sessions on mint | `mintZakiSession` runs INSERT with user_id, refresh_token_hash, expires_at, ip, ua | SATISFIED |
| OATH-03: HttpOnly zaki_refresh cookie set on login | `buildRefreshCookie` in `login-handler.js`, cookie attributes confirmed | SATISFIED |
| OATH-04: ZAKI access JWT in response body (not TYP token) | `res.json({valid:true, token:accessToken})` — TYP token stored server-side only | SATISFIED |
| OATH-05: TYP call best-effort, 5s timeout, login succeeds on TYP failure | `bestEffortTypFetch` with AbortController(5000ms), called only when NOVA_TYP_BASE_URL set | SATISFIED |
| OATH-06: Refresh token is crypto.randomBytes(32).hex stored as sha256 hash | `crypto.randomBytes(32).toString("hex")` + `sha256Hex()` in `zaki-auth.js` | SATISFIED |
| OATH-07: rotateRefreshToken is atomic (revoke + insert in one transaction) | `withDbTransaction` in `rotateRefreshToken`, `FOR UPDATE` lock on old row | SATISFIED |
| OATH-08: POST /api/auth/logout revokes session, clears cookie | `handleLogout` sets revoked_at, returns Max-Age=0 cookie | SATISFIED |
| OATH-09: Missing ZAKI_JWT_SIGNING_KEY in production causes startup failure | `config-validation.js` lines 241-252 pushes error, `index.js` throws on startup | SATISFIED |
| OATH-10: Frontend contract {valid:true, token:string} preserved | `login-handler.js` line 213: `{valid:true, token:accessToken}` — reachable in production | SATISFIED |
| OATH-11: POST /api/auth/refresh rate limited 60/15min/IP | `buildRefreshLimiter()` windowMs:900000, max:60 | SATISFIED |
| OATH-12: X-Zaki-Session-Upgrade in CORS exposedHeaders | `index.js` line 2091: confirmed in array | SATISFIED |

---

## Anti-Patterns Found

None. The `NOVA_API_BASE` reference has been removed. The `NOVA_TYP_BASE_URL` reference in the integration test was corrected to match.

---

## Human Verification Required

None — all claims are verifiable from source code and test output.

---

## Gaps Summary

No gaps. All 6 success criteria are verified. The one previously identified gap (NOVA_API_BASE early guard blocking production logins) has been correctly fixed: the guard is removed, `NOVA_TYP_BASE_URL` is read after bcrypt passes, and URL normalization matches the legacy `getApiBase()` helper. The integration test was updated to set `NOVA_TYP_BASE_URL`. All 29 Phase 1 tests pass.

---

_Verified: 2026-05-02T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes (gap closure — NOVA_API_BASE → NOVA_TYP_BASE_URL)_
