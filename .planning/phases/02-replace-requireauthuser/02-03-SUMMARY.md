---
phase: 02-replace-requireauthuser
plan: "03"
subsystem: backend/auth
tags: [tdd, green-state, auth, audit-logging, concurrent-guard, session-revoke]
dependency_graph:
  requires: [02-01, 02-02]
  provides: []
  affects:
    - backend/src/auth-endpoints.js
    - backend/src/zaki-auth.js
    - backend/src/login-handler.js
    - backend/src/index.js
tech_stack:
  added: []
  patterns:
    - concurrent refresh guard (secondary dbGet with INTERVAL '5 seconds' subquery)
    - [ZakiAudit] prefix console.log pattern for session lifecycle events
    - best-effort try/catch for non-fatal post-action operations (password change revoke)
key_files:
  created: []
  modified:
    - backend/src/zaki-auth.js
    - backend/src/login-handler.js
    - backend/src/auth-endpoints.js
    - backend/src/index.js
decisions:
  - signAccessTokenForUser exported from zaki-auth.js as thin wrapper over private signAccessToken — guard path needs to mint token without inserting a session row
  - Guard invoked at TWO spots in handleRefresh: primary-miss path AND rotate-race (SESSION_NOT_FOUND) path — covers both concurrent-tab race scenarios
  - handleLogout does dbGet for user_id BEFORE the UPDATE so row is readable; no race window for audit logging
  - revokeAllSessionsForUser in passwordResetConfirmHandler wrapped in best-effort try/catch — password change succeeds even if session revoke fails
  - console.warn string mentions revokeAllSessionsForUser making grep -c return 3 not 2 — acceptable, no call added to signup flow
metrics:
  duration: 6m
  completed: "2026-05-02T19:13:00Z"
  tasks_completed: 3
  files_changed: 4
---

# Phase 2 Plan 03: Concurrent Guard + Audit Logs + Password Revoke Summary

**One-liner:** Concurrent refresh guard with 5-second INTERVAL subquery, [ZakiAudit] logs on all 5 session lifecycle events, and post-password-change session revocation in passwordResetConfirmHandler.

## What Was Built

### Task 1: backend/src/zaki-auth.js + backend/src/login-handler.js

| Change | Detail |
|--------|--------|
| mintZakiSession audit log | `console.log([ZakiAudit] session_mint userId=<id> ip=<ip>)` after INSERT, before signAccessToken |
| signAccessTokenForUser export | Thin wrapper over private signAccessToken — used by concurrent guard to mint token without new session row |
| loginHandler audit log | `console.log([ZakiAudit] login userId=<id> ip=<ip>)` after mintZakiSession resolves, before Set-Cookie |

### Task 2: backend/src/auth-endpoints.js

| Change | Detail |
|--------|--------|
| Import update | Added `signAccessTokenForUser` to `from "./zaki-auth.js"` import |
| tryConcurrentRefreshGuard helper | Secondary dbGet with JOIN zaki_users and `INTERVAL '5 seconds'` guard SQL; returns `{accessToken, userId}` or null |
| handleRefresh — primary-miss path | If primary session lookup returns null, invoke guard; 200 on hit, 401 on miss |
| handleRefresh — rotate-race path | Catch SESSION_NOT_FOUND from rotateRefreshToken, invoke guard; 200 on hit, 401 on miss |
| handleRefresh audit log | `[ZakiAudit] session_refresh` logged on all 3 success paths (normal, primary-miss guard, rotate-race guard) |
| handleLogout audit log | dbGet user_id before UPDATE, then `[ZakiAudit] session_revoke reason=logout` |
| Removed old SESSION_NOT_FOUND catch | Guard logic now handles this case — no more top-level 401 return on SESSION_NOT_FOUND |

### Task 3: backend/src/index.js

| Change | Detail |
|--------|--------|
| Import added | `import { revokeAllSessionsForUser } from "./zaki-auth.js"` at line 96 |
| passwordResetConfirmHandler | `await revokeAllSessionsForUser(record.user_id)` after UPDATE zaki_users SET password_hash |
| Audit log | `[ZakiAudit] session_revoke userId=<id> reason=password_change` on success |
| Error handling | Best-effort try/catch — password change succeeds even if revoke errors |

## Test Results

| Test File | Tests | Result |
|-----------|-------|--------|
| auth-endpoints.test.js | 11/11 | GREEN (AUTH-06, AUTH-07 refresh/logout + OATH-07/08/11 no regression) |
| zaki-auth.test.js | 14/14 | GREEN (AUTH-07 session_mint + OATH-01/02/07/12 no regression) |
| login-handler.test.js | 1/1 | GREEN (AUTH-07 login) |
| require-auth-user.test.js | 18/18 | GREEN (no regression from 02-02) |
| **Total** | **44/44** | **ALL GREEN** |

**AUTH-06:** Concurrent refresh guard GREEN — 3 tests (primary-miss hit, primary-miss miss, rotate-race hit).
**AUTH-07:** All 5 lifecycle events GREEN — login, mint, refresh (3 paths), revoke-logout, revoke-password-change.
**AUTH-08:** revokeAllSessionsForUser in passwordResetConfirmHandler GREEN.

## Audit Log Inventory

| Event | File | Format |
|-------|------|--------|
| login | backend/src/login-handler.js | `[ZakiAudit] login userId=<id> ip=<ip>` |
| session_mint | backend/src/zaki-auth.js | `[ZakiAudit] session_mint userId=<id> ip=<ip>` |
| session_refresh (normal) | backend/src/auth-endpoints.js | `[ZakiAudit] session_refresh userId=<id> ip=<ip>` |
| session_refresh (guard primary-miss) | backend/src/auth-endpoints.js | `[ZakiAudit] session_refresh userId=<id> ip=<ip> guard=primary_miss` |
| session_refresh (guard rotate-race) | backend/src/auth-endpoints.js | `[ZakiAudit] session_refresh userId=<id> ip=<ip> guard=rotate_race` |
| session_revoke (logout) | backend/src/auth-endpoints.js | `[ZakiAudit] session_revoke userId=<id> reason=logout ip=<ip>` |
| legacy_typ_path | backend/src/require-auth-user.js | `[ZakiAudit] legacy_typ_path userId=<id> ip=<ip>` (added in 02-02) |
| session_revoke (password_change) | backend/src/index.js | `[ZakiAudit] session_revoke userId=<id> reason=password_change` |

Total ZakiAudit lines: 8 across 4 files (plan required 7 or more).

## revokeAllSessionsForUser Usage Confirmation

Added ONLY to `passwordResetConfirmHandler` in index.js — NOT to signup/upsert flow. Verified: grep around signup path shows no call.

## Commits

| Hash | Description |
|------|-------------|
| `ed649a5` | feat(02-03): add [ZakiAudit] session_mint+login logs + signAccessTokenForUser export (AUTH-07) |
| `cc36791` | feat(02-03): concurrent refresh guard + session_refresh/revoke audit logs in auth-endpoints.js (AUTH-06, AUTH-07) |
| `1e7efec` | feat(02-03): wire revokeAllSessionsForUser into passwordResetConfirmHandler (AUTH-08) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing jose + supertest dependencies in worktree backend**
- **Found during:** Task 1 test run
- **Issue:** `backend/package.json` in the worktree was missing `jose` (dependency) and `supertest` (devDependency). The HEAD commit already had them, but the worktree's package.json was from the pre-02 state and `npm install` had not been run.
- **Fix:** Verified HEAD's package.json already had both packages. Ran `npm install` to populate node_modules. No package.json change needed (it was already correct at HEAD).
- **Files modified:** none (install only)
- **Commit:** N/A (install artifact, not committed)

**2. [Rule 3 - Blocking] Worktree index.js was at pre-02-02 state**
- **Found during:** Task 3 pre-read — grep found old inline requireAuthUser at line 3486 instead of 02-02 factory wiring
- **Issue:** `git reset --soft` had left working tree files in the older (6e9ccce) state for modified files, while HEAD (a67edc7) had the 02-02 changes.
- **Fix:** `git checkout HEAD -- backend/src/index.js` to restore the 02-02 wiring before editing.
- **Files modified:** backend/src/index.js (restored to correct state)
- **Commit:** part of Task 3 commit `1e7efec`

## Known Stubs

None. All audit log paths are wired to real console.log calls with real data. The concurrent guard uses real dbGet SQL. The revoke call uses real revokeAllSessionsForUser.

## Threat Flags

None. All trust boundaries in the plan's threat model are now mitigated:
- T-02-11 (DoS via refresh race): Guard returns existing token within 5s window.
- T-02-12 (Elevation via guard): Guard resolves user_id from original refresh_token_hash subquery — cannot grant token for different user.
- T-02-13 (Repudiation): All 8 ZakiAudit events implemented and emitting.
- T-02-14 (Elevation after password change): revokeAllSessionsForUser called immediately after password UPDATE.
- T-02-15 (Info disclosure in logs): Accepted — userId + IP only, no PII beyond existing access logs.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `backend/src/auth-endpoints.js` has INTERVAL '5 seconds' | FOUND |
| `backend/src/zaki-auth.js` has session_mint log | FOUND |
| `backend/src/login-handler.js` has login log | FOUND |
| `backend/src/index.js` has revokeAllSessionsForUser import | FOUND |
| `backend/src/index.js` has revokeAllSessionsForUser call | FOUND |
| `node --check backend/src/index.js` | PASS |
| Commit ed649a5 exists | FOUND |
| Commit cc36791 exists | FOUND |
| Commit 1e7efec exists | FOUND |
| 44 tests GREEN | PASS |
