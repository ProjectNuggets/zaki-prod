# ZAKI Hire Backup And Restore Runbook

Status: planning source of truth.
Last updated: 2026-05-19.

## Reader And Action

Reader: a ZAKI operator responsible for disaster recovery.

Post-read action: back up and restore all production ZAKI Hire data stores
without losing tenant isolation or generated application artifacts.

## Scope

ZAKI Hire has four data categories:

- PostgreSQL primary state
- tenant-scoped graph companion stores
- tenant-scoped vector companion stores
- generated document and artifact storage

PostgreSQL is the durable source of truth for hosted production. Graph and
vector stores are companion stores and should be rebuildable where practical.
Generated artifacts must still be backed up because users may rely on exact
resumes, cover letters, outreach drafts, PDFs, and exported packages.

## Recovery Objectives

Default targets:

- RPO: 24 hours
- RTO: 4 hours
- backup cadence: every 24 hours
- restore drill cadence: every 30 days

Paid enterprise plans can require tighter targets, but those are separate
commercial commitments and must be reflected in infrastructure, monitoring, and
staffing.

## Required Configuration

```bash
ZAKI_HIRE_BACKUPS_ENABLED=true
ZAKI_HIRE_BACKUP_PROVIDER=s3
ZAKI_HIRE_BACKUP_TARGET=s3://zaki-hire-prod
ZAKI_HIRE_LAST_RESTORE_DRILL_AT=<ISO-timestamp>
ZAKI_HIRE_RETENTION_CLEANUP_ENABLED=true
HIRE_DATABASE_URL=<postgres-or-pgbouncer-connection>
HIRE_TENANT_DATA_ROOT=/data/users
HIRE_ARTIFACT_STORAGE_PROVIDER=s3
HIRE_ARTIFACT_STORAGE_BUCKET=zaki-hire-prod
```

## Backup Contents

PostgreSQL backup must include:

- hire leads and lead versions
- pipeline state
- profile records
- profile ingestion records
- generated package metadata
- source settings and policy selections
- user preferences
- scan and generation task metadata
- activity and follow-up records
- usage summaries
- audit events
- export/delete records

Artifact backup must include:

- generated resumes
- generated cover letters
- outreach drafts
- follow-up drafts
- generated PDFs
- uploaded resumes and profile evidence if stored outside PostgreSQL
- any export bundles not already expired

Companion-store backup must include either:

- snapshots of Kuzu and LanceDB tenant stores, or
- a tested rebuild process from PostgreSQL plus artifacts

If rebuild is the chosen path, the restore drill must prove that ranking,
matching, and graph views work after rebuild.

## Backup Procedure

1. Confirm the production readiness endpoint reports backups enabled.
2. Run PostgreSQL backup using the production database backup mechanism.
3. Snapshot or sync tenant artifact storage.
4. Snapshot companion graph/vector stores or record the rebuild job input.
5. Write a backup manifest containing:
   - backup timestamp
   - database backup id
   - artifact snapshot id
   - companion-store snapshot or rebuild policy
   - ZAKI API image tag
   - engine image tag
   - engine source commit
   - source policy version
   - schema migration version
6. Store the manifest with the backup.
7. Emit an operator event for backup success or failure.

## Staging Restore Drill

Run this before paid-user rollout and then on the configured drill cadence.

1. Provision a clean staging environment.
2. Deploy ZAKI API and `zaki-hire-engine` from immutable image tags recorded in
   the backup manifest.
3. Restore the PostgreSQL backup into staging.
4. Restore tenant artifacts into staging storage.
5. Restore or rebuild graph/vector companion stores.
6. Rotate internal tokens and provider credentials for staging.
7. Run migrations only if the release procedure explicitly requires them.
8. Run health and readiness checks.
9. Log in as two staged test users.
10. Verify:
    - `/hire` dashboard loads
    - profile data is restored
    - leads and pipeline state are restored
    - generated documents open
    - activity and follow-ups are restored
    - scoring or matching works after graph/vector restore or rebuild
    - account export includes restored Hire data
    - account deletion removes restored tenant data
    - user A cannot read user B data or artifacts
11. Record the successful drill timestamp.

## Incident Restore Procedure

1. Freeze risky writes if data integrity is uncertain.
2. Identify blast radius: one tenant, many tenants, engine service, database,
   artifacts, or companion stores.
3. Select the newest valid backup inside the RPO.
4. Deploy immutable ZAKI API and engine images compatible with the backup
   manifest.
5. Restore PostgreSQL.
6. Restore artifacts.
7. Restore or rebuild companion stores.
8. Rotate internal token if compromise is suspected.
9. Run readiness checks.
10. Run tenant-specific smoke tests.
11. Re-enable writes.
12. Record incident timeline, backup ids, restore ids, and verification results.

## Account Export

Account export must include:

- profile records
- leads and lead versions
- pipeline history
- generated package metadata
- generated documents or expiring links to an export bundle
- activity and follow-up records
- user preferences
- audit events
- usage summary where applicable

Export must not include operator provider secrets, internal tokens, global source
credentials, or another tenant's artifacts.

## Account Deletion

Deletion must cover:

- PostgreSQL tenant rows
- generated artifacts
- tenant graph store
- tenant vector store
- pending tasks
- task logs
- cached source pages where stored per tenant
- usage and audit records according to retention policy

Deletion should produce an audit event with actor id, tenant id, started time,
finished time, and per-store result. The user-facing result should be clear even
if an operator must investigate a partial cleanup.

## Restore Blockers

Do not declare disaster recovery ready when:

- PostgreSQL backup is missing
- artifact backup is missing
- companion stores cannot be restored or rebuilt
- restore drill has not run recently
- engine image or source commit is not recorded
- schema migration version is unknown
- cross-tenant artifact checks are missing
- restored export/delete flows are untested

## Paid-User Gate

ZAKI Hire cannot be offered to paid users until a staging restore drill proves
that a restored user can open `/hire`, inspect profile/leads/generated
documents, run a basic matching or generation flow, export data, delete account
data, and remain isolated from a second restored tenant.
