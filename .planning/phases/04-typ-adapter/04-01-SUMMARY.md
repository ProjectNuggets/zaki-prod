---
phase: 04-typ-adapter
plan: 01
subsystem: api
tags: [nodejs, fetch, admin-credentials, adapter-pattern, tdd, jest]

# Dependency graph
requires: []
provides:
  - backend/src/typ-client.js with fetchTypWorkspaces, fetchTypWorkspaceSlugs, requestTypChatStream
  - Admin-key TYP adapter: single crossing point for all ZAKI → TYP network calls
  - assertTypConfig() early-throw guard for missing NOVA_TYP_BASE_URL / NOVA_TYP_API_KEY
affects:
  - 04-02 (workspace routes consume fetchTypWorkspaces + fetchTypWorkspaceSlugs)
  - 04-03 (streamChatHandler consumes requestTypChatStream)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "typ-client.js follows pluggable adapter pattern identical to agent-client.js"
    - "fetchWithTimeout injected by caller on requestTypChatStream (testable, no internal timeout logic)"
    - "assertTypConfig() centralizes env validation and early-throws before any network call"

key-files:
  created:
    - backend/src/typ-client.js
    - backend/src/typ-client.test.js
  modified: []

key-decisions:
  - "All TYP calls use NOVA_TYP_API_KEY (admin key) — never forward user session tokens to TYP"
  - "fetchTypWorkspaceSlugs wraps fetchTypWorkspaces and normalizes to { success, status, slugs, error } shape matching old fetchSessionWorkspaceSlugs exactly"
  - "requestTypChatStream accepts injected fetchWithTimeout (same pluggable pattern as agent-client.js requestNullclawChatStream)"
  - "getTypApiBase() normalizes URL: strips trailing slashes, appends /api if absent — mirrors index.js getApiBase() logic"

patterns-established:
  - "TYP adapter: all calls go through typ-client.js — swapping TYP = change one file"
  - "Admin credential pattern: Bearer ${key} from assertTypConfig(), never req.headers.authorization"

requirements-completed:
  - TYP-04

# Metrics
duration: 15min
completed: 2026-05-02
---

# Phase 04 Plan 01: TYP Adapter — typ-client.js Summary

**Single-file TYP adapter with admin-key credentials: fetchTypWorkspaces, fetchTypWorkspaceSlugs, requestTypChatStream replacing scattered novaSessionRequest calls with server-side NOVA_TYP_API_KEY auth**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-02T20:35:00Z
- **Completed:** 2026-05-02T20:50:00Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments

- Created `backend/src/typ-client.js` as the single crossing point for all ZAKI backend to TYP network calls
- Three named exports cover all TYP call sites: workspace listing, slug visibility check, chat stream forwarding
- All three functions use admin credentials (NOVA_TYP_API_KEY) — no user session token ever reaches TYP
- 9 jest tests pass covering all 5 behaviors specified in the plan (TDD workflow: RED confirmed module missing, GREEN confirmed all pass)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create typ-client.js adapter with three exports** - `ea57a3b` (feat)

## Files Created/Modified

- `backend/src/typ-client.js` - TYP adapter module: fetchTypWorkspaces, fetchTypWorkspaceSlugs, requestTypChatStream with admin-key auth
- `backend/src/typ-client.test.js` - 9 jest tests covering all five plan behaviors including missing env guard, ok/non-ok response paths, admin header verification

## Decisions Made

- Used injected `fetchWithTimeout` on `requestTypChatStream` (same pluggable pattern as `agent-client.js`) so callers own timeout control and the function remains easily testable
- `fetchTypWorkspaceSlugs` wraps `fetchTypWorkspaces` internally and catches errors from missing config to return `{ success: false }` rather than throwing — preserves the same ergonomic API shape as the old `fetchSessionWorkspaceSlugs`
- `getTypApiBase()` appends `/api` suffix if absent (mirroring `getApiBase()` in index.js) so callers can configure either `https://typ.example.com` or `https://typ.example.com/api`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Worktree did not have `node_modules` installed (fresh worktree). Ran `npm install` in `backend/` directory before running tests.
- `git reset --soft` during branch base correction staged all diffs from main. Used `git restore --staged .` to clear staging area before committing only the two new files.

## Known Stubs

None - typ-client.js exports real implementations backed by `fetch` and injected `fetchWithTimeout`. No placeholder data.

## Threat Flags

No new threat surface. `NOVA_TYP_API_KEY` is read only from `process.env`, never logged or returned. `novaUserId` is a number parameter — Plan 03 enforces it comes from `zakiUser.nova_user_id` (DB column, not client input). This matches T-04-01 and T-04-02 dispositions in the plan's threat model.

## Next Phase Readiness

- `fetchTypWorkspaces` and `fetchTypWorkspaceSlugs` ready for Plan 02 to wire into workspace route handlers replacing `novaSessionRequest("/workspaces", authHeader)`
- `requestTypChatStream` ready for Plan 03 to wire into `streamChatHandler` replacing the user-token forwarding fetch call

---
*Phase: 04-typ-adapter*
*Completed: 2026-05-02*
