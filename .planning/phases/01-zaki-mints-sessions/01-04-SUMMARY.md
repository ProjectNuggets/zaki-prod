---
plan: 01-04
wave: 3
status: complete
commit: db32051
---

# Plan 01-04 Summary — Wave 3: Login Handler Extraction

## Files Created
- `backend/src/login-handler.js` (254 lines) — extracted loginHandler with Phase 1 modifications:
  - `mintZakiSession()` called after bcrypt passes
  - HttpOnly `zaki_refresh` cookie set before response body
  - Best-effort TYP `/request-token` call with 5-second AbortController timeout (`TYP_TIMEOUT_MS = 5000`)
  - `UPDATE zaki_sessions SET typ_session_token = $1 WHERE refresh_token_hash = $2` on TYP success
  - Returns `{ valid: true, token: <ZAKI accessToken> }` — TYP token never touches browser
  - `novaUserId` resolution block preserved from legacy handler (Phase 4 removes it)
  - TLS error handling from legacy handler preserved

## Files Modified
- `backend/src/index.js` — removed 163-line inline `loginHandler` body, added `import { loginHandler } from "./login-handler.js"`, both `/login` and `/api/login` routes intact
- `backend/src/login-zaki.integration.test.js` — fixed incorrect bcrypt hash in stub (was hash for unknown string, not "password"); replaced with `$2a$04$...` (rounds=4, fast for tests, valid bcrypt)

## Wave 0 RED → GREEN
`login-zaki.integration.test.js`: all 5 it-blocks now GREEN
- OATH-04: response body is `{ valid:true, token:<ZAKI JWT> }` — no TYP token ✓
- OATH-03: HttpOnly refresh cookie with correct attributes (HttpOnly, Secure, SameSite=Strict, Domain, Path) ✓
- OATH-05: login succeeds when TYP fetch rejects (ECONNREFUSED) ✓
- OATH-05: login succeeds when TYP returns non-OK (503) ✓
- OATH-05: UPDATE writes typ_session_token to zaki_sessions on TYP success ✓

## Phase 1 Success Criteria — All 6 Satisfied
1. POST /login returns valid HS256 JWT with iss:zaki + sets HttpOnly refresh cookie ✓ (this plan)
2. POST /api/auth/refresh rotates the refresh token and returns a new access JWT ✓ (Plan 03)
3. POST /api/auth/logout revokes the session and clears the cookie ✓ (Plan 03)
4. ZAKI_JWT_SIGNING_KEY missing in production causes startup failure ✓ (Plan 02)
5. zaki_sessions table exists in DB with all required indexes ✓ (Plan 02)
6. Existing users can log in with no visible change (LoginScreen.tsx contract: `data.valid && data.token`) ✓ (this plan)

## Open Questions Resolved
- **A1** (dev cookie Secure flag): `NODE_ENV !== "production"` → Secure omitted in dev, added in prod (implemented in Plans 03 and 04)
- **A2** (TYP timeout): 5-second AbortController in `bestEffortTypFetch` (this plan)
- **A3** (FOR UPDATE concurrent rotation): Plan 02 implemented; concurrent grace window deferred to Phase 2 AUTH-07

## Test Suite State
- Full suite: 292/293 passing (1 pre-existing failure in `agent-client.test.js` — NULLCLAW→NULLALIS rename mismatch, unrelated to Phase 1)
- Phase 1 tests: 29/29 passing across `zaki-auth`, `auth-endpoints`, `login-zaki`, `config-validation`

## Patterns Established for Phase 2
- `login-handler.js` is the canonical extraction pattern — future handlers follow this (extract to module, import in index.js)
- The 5s AbortController best-effort pattern is reusable when Phase 2 wraps `novaSessionRequest`
- `mintZakiSession` returns `refreshTokenHash` so callers can post-update the row
