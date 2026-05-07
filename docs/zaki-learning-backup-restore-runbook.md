# ZAKI Learn Backup, Restore, And Disaster Recovery Runbook

Last updated: 2026-05-07

## Scope

This runbook covers hosted ZAKI Learn tenant data stored by the downstream
learning engine plus the ZAKI backend governance tables that track export,
delete, quota, and retention state.

The browser never talks directly to the learning engine. ZAKI authenticates the
user and forwards `X-Internal-Token` plus `X-Zaki-User-Id`; the learning engine
maps that user id to:

```text
${LEARNING_ENGINE_TENANT_DATA_ROOT}/user_<sha256-prefix>/
```

## Recovery Objectives

- RPO: 24 hours by default (`ZAKI_LEARNING_RPO_HOURS`)
- RTO: 4 hours by default (`ZAKI_LEARNING_RTO_HOURS`)
- Backup cadence: every 24 hours by default (`ZAKI_LEARNING_BACKUP_FREQUENCY_HOURS`)
- Restore drill cadence: every 30 days by default (`ZAKI_LEARNING_RESTORE_DRILL_FREQUENCY_DAYS`)

## Required Configuration

- `LEARNING_ENGINE_TENANT_DATA_ROOT` or `ZAKI_TENANT_DATA_ROOT`
- `ZAKI_LEARNING_BACKUPS_ENABLED=true`
- `ZAKI_LEARNING_BACKUP_PROVIDER`, for example `s3`, `r2`, or `volume-snapshot`
- `ZAKI_LEARNING_BACKUP_TARGET`, for example `s3://zaki-learning-prod`
- `ZAKI_LEARNING_ENGINE_IMAGE_TAG`, immutable image tag for the learning engine
- `ZAKI_LEARNING_LAST_RESTORE_DRILL_AT`, updated after each successful drill

Operators can inspect the current gate state with:

```bash
curl -H "Authorization: Bearer $ZAKI_SUPER_ADMIN_TOKEN" \
  "$ZAKI_BACKEND_URL/api/internal/learning/disaster-recovery"
```

The response must have `disasterRecovery.ready: true` before paid-user rollout.

## Backup Procedure

1. Pause no traffic for normal backups. The tenant root must be snapshotted with
   filesystem-consistent tooling supplied by the platform.
2. Snapshot the learning tenant data root:

   ```bash
   # Example shape; use platform-native snapshot tooling in production.
   rsync -a --delete "$LEARNING_ENGINE_TENANT_DATA_ROOT/" "$BACKUP_MOUNT/learning-users/"
   ```

3. Back up ZAKI Postgres using the existing database backup process. The backup
   must include:

   - `zaki_users`
   - `zaki_daily_prompt_usage`
   - `zaki_runtime_settings`
   - `zaki_learning_account_audit_events`

4. Record backup metadata outside the application host:

   - backup id
   - source image tag
   - ZAKI backend commit
   - learning engine commit/image tag
   - tenant data root path
   - database backup id
   - timestamp

## Restore Drill Procedure

Use a staging environment. Never restore a production snapshot over production
without an incident commander approving the change.

1. Provision a clean staging ZAKI backend and learning engine using immutable
   image tags.
2. Restore the database snapshot into staging.
3. Restore the learning tenant data root snapshot into staging.
4. Configure staging with the restored tenant data root and internal token.
5. Log in as a test user included in the snapshot.
6. Verify:

   - `/api/internal/learning/status` reports configured and ready
   - `/api/learning/sessions` lists restored sessions
   - `/api/learning/books` lists restored books
   - `/api/learning/knowledge/list` lists restored knowledge bases
   - `/api/account/export` includes a learning snapshot
   - `/api/account/learning/audit` lists prior export/delete events

7. Record the successful drill timestamp in `ZAKI_LEARNING_LAST_RESTORE_DRILL_AT`.
8. Record evidence in the release checklist:

   - staging URL
   - backup id
   - database backup id
   - learning engine image tag
   - ZAKI backend commit
   - test user id or hashed subject
   - verification timestamp

## Disaster Recovery Procedure

1. Declare incident owner and freeze deploys.
2. Identify the most recent valid database backup and learning tenant snapshot
   inside the RPO window.
3. Deploy ZAKI backend and learning engine from immutable image tags.
4. Restore database and tenant data root.
5. Rotate `LEARNING_ENGINE_INTERNAL_TOKEN` if compromise is suspected.
6. Run readiness checks:

   ```bash
   curl "$ZAKI_BACKEND_URL/api/internal/learning/status" \
     -H "Authorization: Bearer $ZAKI_SUPER_ADMIN_TOKEN"
   curl "$ZAKI_BACKEND_URL/api/internal/learning/disaster-recovery" \
     -H "Authorization: Bearer $ZAKI_SUPER_ADMIN_TOKEN"
   ```

7. Run a browser smoke for the Learn routes before reopening traffic.
8. Document data loss window, restored backup ids, and user impact.

## Release Gate

Paid-user rollout is blocked unless:

- the disaster recovery endpoint reports `ready: true`
- the latest restore drill is inside the configured drill window
- immutable ZAKI backend and learning engine image tags are recorded
- the backup target is outside the application host
- account export/delete audit state is included in database backups
