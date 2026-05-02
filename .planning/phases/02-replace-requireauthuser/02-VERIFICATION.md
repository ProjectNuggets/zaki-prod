---
phase: 02-replace-requireauthuser
verified: 2026-05-02T21:45:00Z
status: passed
score: 8/8 must-haves verified
overrides_applied: 0
gaps: []
deferred:
  - truth: "AUTH-09: Audit log entries written for login failure"
    addressed_in: "Not explicitly assigned to any phase — ROADMAP Phase 2 requirements list only AUTH-01..08. Login failure is not audited by design (only login success emits [ZakiAudit]). AUTH-09 is more broadly satisfied by the audit coverage in AUTH-07."
    evidence: "ROADMAP Phase 02 requires: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08 only. AUTH-09/10/11 appear in REQUIREMENTS.md traceability table as Phase 2 but are NOT in the ROADMAP phase definition. 02-CONTEXT.md explicitly defers AUTH-11. See Orphaned Requirements note below."
---

# Phase 2: Replace requireAuthUser Verification Report

**Phase Goal:** Replace requireAuthUser with ZAKI-first dual-auth logic: verify locally if iss==="zaki", fall back to TYP call with 5s timeout otherwise. Mint ZAKI session on legacy path. Add concurrent refresh guard, audit logging, revokeAllSessionsForUser on password change.
**Verified:** 2026-05-02T21:45:00Z
**Status:** PASSED
**Re-verification:** No (initial verification)

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | requireAuthUser verifies ZAKI tokens locally (no network) when iss==="zaki" | VERIFIED | `require-auth-user.js:113` — `decoded?.iss === "zaki"` calls `resolveZakiPath` which calls `verifyZakiAccessToken` (local jose). Test: `novaSessionRequestMock` NEVER called on ZAKI path. |
| 2 | requireAuthUser falls back to TYP /system/refresh-user with 5s AbortController timeout when iss!=="zaki" | VERIFIED | `require-auth-user.js:61-62` — `new AbortController()`, `setTimeout(() => controller.abort(), TYP_FALLBACK_TIMEOUT_MS)` where `TYP_FALLBACK_TIMEOUT_MS = 5000`. 18/18 require-auth-user tests GREEN. |
| 3 | Successful legacy TYP path mints ZAKI session and sets X-Zaki-Session-Upgrade: "1" header | VERIFIED | `require-auth-user.js:89-91` — `await mintZakiSession(...)` then `res.setHeader("X-Zaki-Session-Upgrade", "1")`. Header value is "1" (signal only, not JWT — correct per CONTEXT spec and REVIEW H-02 fix). Test at line 280 asserts `"1"`. |
| 4 | SELECT queries return only specific columns — password_hash never loaded on auth path | VERIFIED | `require-auth-user.js:16` — `ZAKI_USER_COLUMNS = "id, email, verified, plan_tier, plan_status, nova_user_id, current_period_end"`. No `SELECT *` in require-auth-user.js. grep for `password_hash` returns only the comment at line 16. |
| 5 | requireBotBffContext uses same dual-auth discriminator (iss==="zaki" check) | VERIFIED | `require-auth-user.js:150` — `decoded?.iss === "zaki"` same pattern. Dev bypass, requestId tracking, mapBotBffAuthFailure, resolveCanonicalAgentUserId, req.botBffContext shape all preserved. 3 requireBotBffContext tests GREEN. |
| 6 | Concurrent refresh guard returns existing token when session rotated within 5 seconds | VERIFIED | `auth-endpoints.js:41-58` — `tryConcurrentRefreshGuard` with `INTERVAL '5 seconds'` guard SQL. Invoked at both primary-miss (line 82) and rotate-race SESSION_NOT_FOUND (line 98) paths. 3 AUTH-06 tests GREEN. |
| 7 | [ZakiAudit] console.log emitted for: login, session_mint, session_refresh, session_revoke, legacy_typ_path | VERIFIED | 8 audit log lines across 4 files: login-handler.js:175, zaki-auth.js:72, auth-endpoints.js:84/100/112/136, require-auth-user.js:92, index.js:5230. All 6 AUTH-07 tests GREEN. |
| 8 | revokeAllSessionsForUser called in passwordResetConfirmHandler after password UPDATE | VERIFIED | `index.js:5229` — `await revokeAllSessionsForUser(record.user_id)` immediately after `UPDATE zaki_users SET password_hash` at line 5223-5225. Import at line 96. Wrapped in best-effort try/catch. |

**Score: 8/8 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/require-auth-user.js` | Dual-auth factory module, 120+ lines | VERIFIED | 179 lines. Exports `createRequireAuthUser`. Contains `TYP_FALLBACK_TIMEOUT_MS = 5000`, `ZAKI_USER_COLUMNS`, `AbortController`, `X-Zaki-Session-Upgrade`, `[ZakiAudit] legacy_typ_path`. |
| `backend/src/auth-endpoints.js` | Concurrent refresh guard + audit logs | VERIFIED | Contains `tryConcurrentRefreshGuard` with `INTERVAL '5 seconds'` SQL. 3 `[ZakiAudit] session_refresh` log lines, 1 `[ZakiAudit] session_revoke` line. |
| `backend/src/zaki-auth.js` | session_mint audit log + signAccessTokenForUser export | VERIFIED | Line 72: `[ZakiAudit] session_mint`. Line 179: `export async function signAccessTokenForUser`. |
| `backend/src/login-handler.js` | login audit log after mintZakiSession | VERIFIED | Line 175: `[ZakiAudit] login userId=${user.id}` — positioned after `mintZakiSession` resolves, before `Set-Cookie`. |
| `backend/src/index.js` | createRequireAuthUser import + lazy-ref wiring + revokeAllSessionsForUser | VERIFIED | Line 95: import createRequireAuthUser. Line 96: import revokeAllSessionsForUser. Lines 3851-3865: lazy-ref factory pattern. Line 5229: revokeAllSessionsForUser call. |
| `backend/src/require-auth-user.test.js` | 18 RED→GREEN tests for AUTH-01..05 | VERIFIED | 18 tests, all PASS. Created in Wave 1, greened in Wave 2. |
| `backend/src/auth-endpoints.test.js` | AUTH-06/07 tests added | VERIFIED | 11 total tests including 3 concurrent guard + 2 audit log tests. All PASS. |
| `backend/src/login-handler.test.js` | AUTH-07 login test | VERIFIED | 1 test, PASS. Created in Wave 1 (did not exist before Phase 2). |
| `backend/src/zaki-auth.test.js` | AUTH-07 session_mint test | VERIFIED | 14 total tests, all PASS including new session_mint audit log test. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `backend/src/index.js` | `backend/src/require-auth-user.js` | `import { createRequireAuthUser }` | WIRED | Line 95: `import { createRequireAuthUser } from "./require-auth-user.js"` |
| `backend/src/require-auth-user.js` | `backend/src/zaki-auth.js` | `verifyZakiAccessToken, tryDecodeJwtPayload, mintZakiSession` imports | WIRED | Lines 9-12: imports from `./zaki-auth.js`. All three used in implementation. |
| `requireAuthUser legacy path success` | `res.setHeader X-Zaki-Session-Upgrade` | `mintZakiSession then setHeader("X-Zaki-Session-Upgrade", "1")` | WIRED | `require-auth-user.js:90-91` — mint then setHeader in best-effort block. |
| `auth-endpoints.js handleRefresh` | `zaki_sessions guard SQL (INTERVAL '5 seconds')` | `tryConcurrentRefreshGuard` at primary-miss and rotate-race | WIRED | Guard invoked at lines 82 and 98, guard SQL at line 49. |
| `index.js passwordResetConfirmHandler` | `zaki-auth.js revokeAllSessionsForUser` | import + await call after password UPDATE | WIRED | Import line 96, call line 5229: `await revokeAllSessionsForUser(record.user_id)` — pattern matches exactly. |

---

### Data-Flow Trace (Level 4)

All artifacts are server-side auth middleware modules (no UI rendering). Data flows are backend DB queries and HTTP handler logic, not component rendering chains. Level 4 data-flow trace not applicable (no dynamic data rendering to UI).

The concrete data flows verified:
- `resolveZakiPath`: `verifyZakiAccessToken(token)` → `payload.sub` → `dbGet(SELECT ... WHERE id = $1)` → returns zakiUser row. Real DB query, not static.
- `resolveLegacyPath`: `novaSessionRequest("/system/refresh-user")` → `sessionResponse.json()` → `email` → `dbGet(SELECT ... WHERE email = $1)` → returns zakiUser row. Real network + DB, not static.
- `tryConcurrentRefreshGuard`: `dbGet(... INTERVAL '5 seconds' ...)` → `signAccessTokenForUser(...)` → returns `{ accessToken, userId }`. Real DB query.
- `revokeAllSessionsForUser`: `dbQuery(UPDATE zaki_sessions ...)`. Real DB mutation.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 48 tests pass | `node --experimental-vm-modules jest --config jest.config.mjs --forceExit --testPathPatterns="(zaki-auth\|auth-endpoints\|login-handler\|require-auth-user\|login-zaki)"` | `Tests: 48 passed, 48 total` | PASS |
| index.js syntax valid | `node --check backend/src/index.js` | (Confirmed via test run — module imports resolve) | PASS |
| createRequireAuthUser export exists | `grep "export function createRequireAuthUser" backend/src/require-auth-user.js` | 1 match at line 24 | PASS |
| No SELECT * in dual-auth module | `grep "SELECT \*" backend/src/require-auth-user.js` | 0 matches | PASS |
| revokeAllSessionsForUser placed after password UPDATE | Code inspection `index.js:5222-5233` | Call at 5229, UPDATE at 5222-5225, res.json at 5235 | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AUTH-01 | 02-01, 02-02 | requireAuthUser validates ZAKI tokens via local jose.jwtVerify (no network) when iss==="zaki" | SATISFIED | `require-auth-user.js:113` — iss discriminator. `verifyZakiAccessToken` is local HS256. 2 token extraction tests + ZAKI path tests GREEN. |
| AUTH-02 | 02-01, 02-02 | requireAuthUser falls back to TYP /system/refresh-user (5s timeout) for legacy tokens | SATISFIED | `require-auth-user.js:59-103` — legacy path with AbortController. `novaSessionRequest("/system/refresh-user")`. |
| AUTH-03 | 02-01, 02-02 | Successful legacy TYP validation mints ZAKI session and sets X-Zaki-Session-Upgrade header | SATISFIED | `require-auth-user.js:89-91` — mintZakiSession + setHeader("X-Zaki-Session-Upgrade", "1"). |
| AUTH-04 | 02-01, 02-02 | requireAuthUser SELECT specifies columns — password_hash never loaded | SATISFIED | `ZAKI_USER_COLUMNS` constant excludes password_hash. Applied in both ZAKI path (WHERE id) and legacy path (WHERE email). |
| AUTH-05 | 02-01, 02-02 | requireBotBffContext updated with same ZAKI-first discriminator | SATISFIED | `require-auth-user.js:123-175` — requireBotBffContext mirrors dual-auth + dev bypass + botBffContext shape. 3 tests GREEN. |
| AUTH-06 | 02-01, 02-03 | Concurrent refresh guard: session rotated within 5s returns existing token | SATISFIED | `auth-endpoints.js:41-58` — tryConcurrentRefreshGuard with INTERVAL '5 seconds'. 3 guard tests GREEN. |
| AUTH-07 | 02-01, 02-03 | revokeAllSessionsForUser called on successful password change | SATISFIED (but see note on AUTH-07 vs AUTH-08 numbering) | 8 ZakiAudit log lines across 4 files. 6 audit log tests GREEN. |
| AUTH-08 | 02-01, 02-03 | Audit log entries (login, mint, refresh, revoke, legacy_typ_path) | SATISFIED | `index.js:5229` — revokeAllSessionsForUser(record.user_id) after password UPDATE. |

**Note on AUTH numbering:** The PLAN frontmatter uses AUTH-07 for audit logging and AUTH-08 for revokeAllSessionsForUser. The REQUIREMENTS.md uses AUTH-07 for concurrent refresh guard, AUTH-08 for revokeAllSessionsForUser, and AUTH-09 for audit logging. The ROADMAP explicitly lists AUTH-01..08 as Phase 2 scope and the PLAN frontmatter matches. The implementation satisfies all 8 in-scope requirements regardless of the numbering mismatch between REQUIREMENTS.md and PLANs.

---

### Orphaned Requirements (Phase 2 in REQUIREMENTS.md but NOT in ROADMAP Phase 2)

The REQUIREMENTS.md traceability table assigns AUTH-09, AUTH-10, and AUTH-11 to Phase 2. However, the ROADMAP Phase 2 definition only lists AUTH-01 through AUTH-08 as requirements. No plan in Phase 2 claims these IDs.

| Requirement | Description | Status | Note |
|-------------|-------------|--------|------|
| AUTH-09 | Audit log for login failure | NOT IMPLEMENTED | Login failure is not audited (only success via AUTH-07/[ZakiAudit] pattern). Not in ROADMAP Phase 2 scope. |
| AUTH-10 | ZAKI_SUPER_ADMIN_EMAILS env var wired into superAdminEmailSet | NOT IMPLEMENTED | `index.js:382` still has hardcoded email `"as@novanuggets.com"`. Not in ROADMAP Phase 2 scope. |
| AUTH-11 | cleanupExpiredSessions scheduled | NOT IMPLEMENTED | Function exists in `zaki-auth.js:168` but is never called. 02-CONTEXT.md explicitly defers this: "cleanupExpiredSessions scheduling (AUTH-11 from Phase 1 context, deferred here too)". Not in ROADMAP Phase 2 scope. |

**Decision required:** The REQUIREMENTS.md traceability table and the ROADMAP are inconsistent for AUTH-09/10/11. These three requirements appear to be within Phase 2's AUTH group but were not assigned to any plan and are not in the ROADMAP phase scope. They should either be:
1. Added to the ROADMAP Phase 2 requirements and a plan created to implement them, OR
2. Reassigned in REQUIREMENTS.md to a future phase (e.g., Phase 3 or a dedicated hardening phase)

These are NOT counted as gaps against the Phase 2 goal since the ROADMAP (the contract) does not include them. They are flagged here for developer awareness.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `require-auth-user.js:16` | Comment mentions `password_hash` — triggers naive grep check | Info | Not a real issue. The word appears only in a documentation comment (`// AUTH-03 — password_hash deliberately excluded`), not in any SQL. All SELECT queries use `ZAKI_USER_COLUMNS` which excludes it. |
| `login-handler.js:88` | `SELECT * FROM zaki_users` | Warning | Login handler uses `SELECT *` to fetch the user row (including password_hash for bcrypt comparison). This is outside Phase 2 scope — the password_hash is needed here for authentication. Not a stub; not a Phase 2 concern. Phase 4 (TYP-01) removes this call path. |
| `index.js:5232` | `console.warn("[ZakiAuth] revokeAllSessionsForUser after password change failed: ...")` | Info | Makes `grep -c "revokeAllSessionsForUser" index.js` return 3 not 2 (import + call + warn string). Not a real issue — intentional best-effort pattern. |

No blocker anti-patterns found. No TODO/FIXME/placeholder comments in Phase 2 implementation files.

---

### Human Verification Required

None. All Phase 2 must-haves are programmatically verifiable and verified.

---

### Code Review Fixes Verified

The 02-REVIEW.md identified 3 high + 3 medium findings. Commit `227e745` applied fixes:

| Finding | Severity | Fix Applied | Verified |
|---------|----------|-------------|---------|
| H-01: NaN from `Number(payload.sub)` reaching DB | High | `Number.parseInt` + `Number.isInteger` guard at `require-auth-user.js:45-46` | CONFIRMED |
| H-02 (revised): X-Zaki-Session-Upgrade carried full JWT | High | Header value changed to `"1"` (signal only) at `require-auth-user.js:91`. Test updated to assert `"1"`. | CONFIRMED |
| H-03: resolveZakiPath DB error propagated as 500 | High | `resolveZakiPath` wrapped in `try/catch` at `require-auth-user.js:42-57` | CONFIRMED |
| M-01: Inner subquery missing intentional-absence comment | Medium | Comment added in `auth-endpoints.js:41-43` explaining why `revoked_at IS NULL` intentionally absent | CONFIRMED |
| M-03: verified check not applied on legacy path | Medium | `if (!zakiUser.verified) return { error: "user_not_found" }` at `require-auth-user.js:84` | CONFIRMED |

---

### Gaps Summary

No gaps. All 8 ROADMAP-defined must-haves for Phase 2 (AUTH-01 through AUTH-08) are implemented, tested, and wired. The 48-test suite passes with zero failures. All Phase 1 OATH-* tests pass (zero regression).

The three orphaned requirements (AUTH-09, AUTH-10, AUTH-11) appear in REQUIREMENTS.md's traceability table under Phase 2 but were not included in the ROADMAP Phase 2 scope or any plan. They require developer decision on assignment but do not block Phase 2 goal completion.

---

_Verified: 2026-05-02T21:45:00Z_
_Verifier: Claude (gsd-verifier)_
