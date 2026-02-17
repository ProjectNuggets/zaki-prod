# Rollback Runbook

## Goal
Restore service quickly after a bad deployment while preserving user data.

## Triggers
- Elevated 5xx error rate.
- Chat stream outage.
- Memory pipeline alerts (`high_error_rate`, `high_conflict_rate`, `high_sse_connections`) sustained for >5 minutes.
- Login/signup or consent flow regressions.

## Required artifacts
- Previous known-good backend image/version.
- Previous known-good frontend build/version.
- Latest backup drill evidence (`docs/backup-restore-runbook.md` process).

## Backend rollback
1. Identify last known-good release from deployment history.
2. Redeploy backend to that release.
3. Keep database schema unchanged unless migration rollback is explicitly required.
4. Run post-rollback checks:
   - `GET /health`
   - login with test account
   - `GET /api/entitlements`
   - one chat stream request
   - `GET /api/memory/status`

## Frontend rollback
1. Redeploy previous frontend build artifact.
2. Hard refresh CDN/cache for the main entrypoint.
3. Validate:
   - login page loads
   - settings modal opens
   - memory rail shows above input

## Database rollback (only when required)
1. Stop write traffic (maintenance mode or temporary API block).
2. Restore latest good snapshot to a fresh recovery database.
3. Validate key tables:
   - `zaki_users`
   - `memories`
   - `memory_confirmations`
4. Repoint backend to recovery database.
5. Resume traffic.

## Incident close checklist
1. Capture root cause and affected release SHA.
2. Add a regression test or CI gate.
3. Run backup/restore drill again before re-release.
