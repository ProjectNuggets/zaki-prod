---
phase: 01-zaki-mints-sessions
plan: "01"
subsystem: backend/auth
tags: [tdd, test-stubs, red-state, wave-0, jwt, sessions]
dependency_graph:
  requires: []
  provides:
    - backend/src/zaki-auth.test.js
    - backend/src/auth-endpoints.test.js
    - backend/src/login-zaki.integration.test.js
  affects:
    - backend/src/zaki-auth.js (Wave 1 must satisfy these tests)
    - backend/src/auth-endpoints.js (Wave 2 must satisfy these tests)
    - backend/src/login-handler.js (Wave 3 must satisfy these tests)
tech_stack:
  added:
    - supertest@^7.2.2 (devDependency — HTTP integration testing)
  patterns:
    - jest.unstable_mockModule for ESM db.js mocking
    - beforeAll dynamic import after mock registration
    - supertest Express app factory pattern (makeApp())
key_files:
  created:
    - backend/src/zaki-auth.test.js
    - backend/src/auth-endpoints.test.js
    - backend/src/login-zaki.integration.test.js
  modified:
    - backend/package.json (supertest devDependency — installed alongside jose by Wave 1)
    - backend/package-lock.json
decisions:
  - supertest installed as devDependency to support Express endpoint integration tests in Tasks 2 and 3
  - Test files use jest.unstable_mockModule pattern consistent with context-retrieval.test.js
  - login-zaki.integration.test.js imports from ./login-handler.js (Wave 3 will extract loginHandler there)
  - auth-endpoints.test.js imports buildAuthRouter from ./auth-endpoints.js (Wave 2 will create this router module)
metrics:
  duration: ~5 minutes
  completed: "2026-05-02T13:15:35Z"
  tasks_completed: 3
  tasks_total: 3
  files_created: 3
  files_modified: 0
---

# Phase 1 Plan 01: Wave 0 — Test Stubs (RED State) Summary

Three test stub files created with full RED state. All test files import the module-under-test via dynamic ESM import and assert the public contracts locked in CONTEXT.md. Tests fail with "Cannot find module" errors — correct RED state for TDD Wave 0.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create zaki-auth.test.js with RED stubs for all 6 exports | ef44733 | backend/src/zaki-auth.test.js |
| 2 | Create auth-endpoints.test.js with RED stubs for refresh + logout + rate limiter | f11c4bc | backend/src/auth-endpoints.test.js |
| 3 | Create login-zaki.integration.test.js with RED stubs for modified loginHandler | 7019882 | backend/src/login-zaki.integration.test.js |

## Test Files Created

### backend/src/zaki-auth.test.js (151 lines)

Covers all 6 exports from the future `zaki-auth.js` module:

- `mintZakiSession` (OATH-01, OATH-02): return shape, DB INSERT pattern, HS256 JWT structure (alg, kid, iss, sub, email, jti, exp-iat=900)
- `verifyZakiAccessToken` (OATH-01): valid token, tampered, wrong signing key
- `rotateRefreshToken` (OATH-07): withDbTransaction wrapping, UPDATE revoked_at, INSERT new row, SESSION_NOT_FOUND error code
- `revokeAllSessionsForUser`: UPDATE SQL pattern with user_id param
- `tryDecodeJwtPayload`: valid payload extraction, null for garbage
- `cleanupExpiredSessions`: DELETE SQL pattern with 7-day intervals

### backend/src/auth-endpoints.test.js (119 lines)

Covers the `buildAuthRouter` factory from future `auth-endpoints.js`:

- POST /api/auth/refresh (OATH-07, OATH-11): 401 no cookie, 401 invalid session, 200 with rotation + cookie attributes
- POST /api/auth/logout (OATH-08): 200 + revoke + Max-Age=0 cookie, 200 no cookie present
- Rate limiter: 65 requests must trigger at least one 429 response (OATH-11)
- Cookie assertions: HttpOnly, Secure, SameSite=Strict, Domain=.chatzaki.com, Path=/api/auth/refresh

### backend/src/login-zaki.integration.test.js (113 lines)

Covers modified `loginHandler` from future `login-handler.js`:

- OATH-04: response body is `{ valid:true, token:<ZAKI JWT> }` — token is 3-part JWT, not TYP opaque token
- OATH-03: HttpOnly cookie with all locked attributes on login response
- OATH-05: login succeeds when TYP fetch rejects (ECONNREFUSED)
- OATH-05: login succeeds when TYP returns non-OK (503)
- OATH-05: when TYP succeeds, UPDATE writes typ_session_token to zaki_sessions

## Wave Progression

- Wave 1 will turn `zaki-auth.test.js` GREEN by creating `backend/src/zaki-auth.js` (jose SignJWT, DB INSERT, rotateRefreshToken transaction)
- Wave 2 will turn `auth-endpoints.test.js` GREEN by creating `backend/src/auth-endpoints.js` (Express router with refresh + logout + rate limiter)
- Wave 3 will turn `login-zaki.integration.test.js` GREEN by extracting loginHandler to `backend/src/login-handler.js`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Install supertest devDependency**
- **Found during:** Task 2 preparation
- **Issue:** `supertest` was not in backend/package.json; Tasks 2 and 3 import it at top level. Without it, tests fail with "Cannot find module 'supertest'" rather than the expected "Cannot find module './auth-endpoints.js'" / "./login-handler.js"
- **Fix:** `npm install --save-dev supertest` in backend directory
- **Files modified:** backend/package.json, backend/package-lock.json
- **Commit:** ef44733 (included alongside Task 1 commit)
- **Note:** The parallel 01-02 agent also installed jose in the same commit (1812bf2), which also included supertest. Both installations landed correctly.

## Known Stubs

None. These files are intentional test stubs in RED state. They will be turned GREEN by Wave 1, 2, and 3 tasks respectively.

## Threat Flags

None. This plan creates only test stub files. No production code, no network surface, no DB writes. The test signing key `"a".repeat(64)` is a fixed test fixture — not a real secret, documented as test-only (T-1-W0-02).

## Self-Check: PASSED

- backend/src/zaki-auth.test.js: FOUND (151 lines, 6 describe blocks, jest.unstable_mockModule, dynamic import)
- backend/src/auth-endpoints.test.js: FOUND (119 lines, 3 describe blocks, module-not-found RED state)
- backend/src/login-zaki.integration.test.js: FOUND (113 lines, 5 it-blocks, module-not-found RED state)
- Commits: ef44733, f11c4bc, 7019882 — all verified in git log
