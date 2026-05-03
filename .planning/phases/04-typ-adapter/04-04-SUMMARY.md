---
phase: 04-typ-adapter
plan: "04"
subsystem: database
tags: [postgres, migration, schema, zaki_sessions, typ]

requires:
  - phase: 04-01
    provides: typ-client.js adapter that replaced direct TYP calls
  - phase: 04-02
    provides: login-handler.js stripped of all TYP code
  - phase: 04-03
    provides: index.js + streamChatHandler wired to typ-client.js

provides:
  - zaki_sessions table without typ_session_token column (CREATE TABLE clean)
  - Idempotent ALTER TABLE DROP COLUMN in initDb() for running production DBs
  - backend/migrations/drop_typ_session_token.sql for audit trail and manual re-run

affects: [05-legacy-sunset, database, zaki_sessions, typ]

tech-stack:
  added: []
  patterns:
    - "Idempotent ALTER TABLE IF EXISTS after CREATE TABLE in initDb() for live DB migrations"
    - "Migration SQL files in backend/migrations/ for audit trail alongside inline initDb() application"

key-files:
  created:
    - backend/migrations/drop_typ_session_token.sql
  modified:
    - backend/src/db.js

key-decisions:
  - "ALTER TABLE placed after all three CREATE INDEX statements for zaki_sessions — ensures column dropped on next restart of any running production DB"
  - "Migration file kept as audit trail even though initDb() applies it automatically — enables manual re-run and auditing"
  - "Pre-existing agent-client.test.js failure (NULLCLAW vs NULLALIS error message mismatch) is out of scope — not caused by this plan and deferred"

requirements-completed: [TYP-03]

duration: 15min
completed: 2026-05-02
---

# Phase 04 Plan 04: TYP-03 DB Schema Cleanup Summary

**Dropped typ_session_token column from zaki_sessions — removed from CREATE TABLE definition, added idempotent ALTER TABLE DROP COLUMN to initDb(), created migrations/drop_typ_session_token.sql for audit trail**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-02T20:30:00Z
- **Completed:** 2026-05-02T20:45:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Removed `typ_session_token TEXT` from the `CREATE TABLE IF NOT EXISTS zaki_sessions` block in db.js
- Added `ALTER TABLE zaki_sessions DROP COLUMN IF EXISTS typ_session_token` to initDb() after the three CREATE INDEX statements — ensures the column is dropped on the running production DB when the server restarts post-deployment
- Created `backend/migrations/drop_typ_session_token.sql` with the same idempotent SQL for audit trail and manual re-execution
- Full backend test suite: 319/320 passing (1 pre-existing unrelated failure)
- Zero references to `typ_session_token` in any source file outside the DROP statement and migration file

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove typ_session_token from db.js schema and create migration file** - `f14b7bb` (feat)
2. **Task 2: Full codebase sweep + test suite green check** - no new commit (verification-only task, sweep confirmed clean)

## Files Created/Modified

- `backend/src/db.js` - Removed `typ_session_token TEXT` from CREATE TABLE zaki_sessions; added `ALTER TABLE zaki_sessions DROP COLUMN IF EXISTS typ_session_token` after the three CREATE INDEX statements
- `backend/migrations/drop_typ_session_token.sql` - Idempotent migration SQL for audit trail and manual re-execution

## Decisions Made

- ALTER TABLE placed immediately after the three CREATE INDEX statements (idx_zaki_sessions_user_id, idx_zaki_sessions_active, idx_zaki_sessions_refresh_hash) to keep the migration adjacent to the table definition
- Migration SQL file created even though initDb() applies it automatically — provides an audit trail and enables ops team to run it manually on staging before prod restart

## Deviations from Plan

None — plan executed exactly as written. The Task 2 acceptance criteria noted "0 failed tests" but there is 1 pre-existing failure in `agent-client.test.js` (NULLCLAW vs NULLALIS error message mismatch from the d28 rename debt). This failure existed at the target commit (057b3a9) and is not caused by this plan.

## Issues Encountered

**Worktree state:** The worktree was initialized with `git reset --soft` to the target commit, which moved HEAD but left the working tree with files from the newer `6e9ccce` commit. Individual files were restored via `git checkout 057b3a9 -- <file>` before editing. This is expected behavior for parallel worktree execution.

**Pre-existing test failure:** `agent-client.test.js` fails on "NULLCLAW_BASE_URL is not configured." vs "NULLALIS_BASE_URL is not configured." — this is a pre-existing mismatch from the NULLCLAW-to-NULLALIS rename (commit `283c654`). The test was not updated. Deferred to deferred-items as it is out of scope for this plan.

## User Setup Required

None — no external service configuration required. The ALTER TABLE in initDb() will execute automatically on the next server restart after deployment.

## Next Phase Readiness

- TYP-03 complete: typ_session_token is fully removed from schema definition and will be dropped from the running DB on next restart
- Phase 04 (04-typ-adapter) is now complete — all 4 plans executed (04-01 through 04-04)
- Phase 05 (legacy sunset) can proceed: no typ_session_token anywhere in source, schema clean, TYP behind adapter

## Self-Check: PASSED

- `backend/src/db.js`: FOUND
- `backend/migrations/drop_typ_session_token.sql`: FOUND
- `.planning/phases/04-typ-adapter/04-04-SUMMARY.md`: FOUND
- Commit `f14b7bb`: FOUND
- Commit `76fe00b`: FOUND

---
*Phase: 04-typ-adapter*
*Completed: 2026-05-02*
