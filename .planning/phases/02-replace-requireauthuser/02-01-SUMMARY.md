---
phase: 02-replace-requireauthuser
plan: "01"
subsystem: backend/auth
tags: [tdd, red-state, auth, jwt, audit-logging]
dependency_graph:
  requires: [01-04]
  provides: [02-02, 02-03]
  affects: [backend/src/require-auth-user.js, backend/src/auth-endpoints.js, backend/src/zaki-auth.js, backend/src/login-handler.js]
tech_stack:
  added: []
  patterns: [jest.unstable_mockModule ESM mocking, factory injection pattern]
key_files:
  created:
    - backend/src/require-auth-user.test.js
    - backend/src/login-handler.test.js
  modified:
    - backend/src/auth-endpoints.test.js
    - backend/src/zaki-auth.test.js
decisions:
  - Wave 2 contract uses factory injection: createRequireAuthUser({ novaSessionRequest, normalizeEmail, ... }) returning { requireAuthUser, requireBotBffContext }
  - login-handler.test.js created from scratch (file did not exist before Plan 02-01)
  - node_modules symlinked from main repo to worktree for test runner access
metrics:
  duration: 35m
  completed: "2026-05-02T18:57:22Z"
  tasks_completed: 2
  files_changed: 4
---

# Phase 2 Plan 01: Wave 0 RED Test Stubs Summary

**One-liner:** 24 failing RED tests across 4 files lock the AUTH-01..08 contract before Wave 2 implementation begins.

## What Was Built

Wave 0 RED test stubs define the behavior contract for Phase 2's dual-auth requireAuthUser module. All new tests fail because production code doesn't exist yet. This is intentional — the tests are forcing functions for Wave 2 plans (02-02, 02-03).

### Test Files Created / Extended

| File | Status | New Tests | AUTH Requirements |
|------|--------|-----------|-------------------|
| `backend/src/require-auth-user.test.js` | Created | 18 | AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-07 |
| `backend/src/auth-endpoints.test.js` | Extended | 5 | AUTH-06, AUTH-07 |
| `backend/src/zaki-auth.test.js` | Extended | 1 | AUTH-07 |
| `backend/src/login-handler.test.js` | Created | 1 | AUTH-07 |

**Total new tests: 25** (18 + 5 + 1 + 1)

### Test Count by AUTH Requirement

| Requirement | Description | Test Count |
|-------------|-------------|------------|
| AUTH-01 | Token extraction (missing header, malformed) | 2 |
| AUTH-02 | requireBotBffContext dual-auth | 3 |
| AUTH-03 | SELECT specific columns, excludes password_hash | 2 |
| AUTH-04 | 5s AbortController timeout on TYP path | 1 |
| AUTH-05 | X-Zaki-Session-Upgrade header on legacy success | 1 |
| AUTH-06 | Concurrent refresh guard (SESSION_NOT_FOUND guard) | 3 |
| AUTH-07 | [ZakiAudit] logs (login, session_mint, session_refresh, session_revoke, legacy_typ_path) | 6 |

### Key Contracts Locked

1. **require-auth-user.js Wave 2 export shape:** `createRequireAuthUser({ novaSessionRequest, normalizeEmail, resolveCanonicalAgentUserId, mapBotBffAuthFailure, getOrCreateRequestId, NULLCLAW_DEV_USER_ID, buildDevAuthResultFromUserId })` returning `{ requireAuthUser, requireBotBffContext }`.

2. **ZAKI path:** `tryDecodeJwtPayload` then `verifyZakiAccessToken` local. No `novaSessionRequest` call. `SELECT id, email, verified, plan_tier, plan_status, nova_user_id, current_period_end FROM zaki_users WHERE id = $1`.

3. **Legacy TYP path:** `novaSessionRequest("/system/refresh-user", authHeader, { signal: AbortSignal })` with 5s timeout. On success: `mintZakiSession`, `res.setHeader("X-Zaki-Session-Upgrade", accessToken)`. `SELECT ... WHERE email = $1`.

4. **Concurrent guard SQL:** `WHERE user_id = $1 AND created_at > NOW() - INTERVAL '5 seconds' AND revoked_at IS NULL`.

5. **Audit log patterns:** `[ZakiAudit] login userId=<id> ip=<ip>`, `[ZakiAudit] session_mint userId=<id> ip=<ip>`, `[ZakiAudit] session_refresh userId=<id>`, `[ZakiAudit] session_revoke.*reason=logout`, `[ZakiAudit] legacy_typ_path userId=<id> ip=<ip>`.

## RED State Verification

- `require-auth-user.test.js`: 18/18 FAIL — "Could not locate module ./require-auth-user.js" (module not created yet)
- `auth-endpoints.test.js` new tests: 4/5 FAIL — production code lacks guard SQL + audit logs (1 passes: 401 guard miss path)
- `zaki-auth.test.js` new test: 1/1 FAIL — mintZakiSession does not emit [ZakiAudit] log
- `login-handler.test.js` new test: 1/1 FAIL — loginHandler does not emit [ZakiAudit] log

## Existing OATH Tests (No Regression)

All 19 previously-passing OATH-tagged tests still pass:
- `auth-endpoints.test.js`: 6/6 OATH tests pass
- `zaki-auth.test.js`: 12/12 OATH tests pass (new AUTH-07 test runs separately, fails as expected)

## Commits

| Hash | Description |
|------|-------------|
| `f992ff3` | test(02-01): add RED test stubs for require-auth-user.js (AUTH-01..05, AUTH-07) |
| `9c98b7f` | test(02-01): add RED tests for concurrent refresh guard + audit logs (AUTH-06, AUTH-07) |

## Deviations from Plan

None — plan executed exactly as written.

- `login-handler.test.js` did not exist in the repo before this plan (confirmed via `ls`). Created from scratch using the auth-endpoints.test.js mocking template as specified.
- Worktree node_modules symlinked from main repo backend (worktree was created before Phase 1 auth files were committed; this is a worktree initialization detail, not a code deviation).

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `backend/src/require-auth-user.test.js` exists | FOUND |
| `backend/src/login-handler.test.js` exists | FOUND |
| Commit f992ff3 exists | FOUND |
| Commit 9c98b7f exists | FOUND |
