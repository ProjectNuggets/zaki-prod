# Backup & Restore Runbook

## Goal
Prove that ZAKI PostgreSQL backups are restorable and data is usable before release.

## Prerequisites
- `DATABASE_URL` points to the source database.
- `pg_dump`, `pg_restore`, and `psql` are installed on the operator machine.
- Role used in `DATABASE_URL` can create/drop a drill database.

## Automated drill
From repo root:

```bash
npm run ops:backup-drill
```

Optional flags:

```bash
npm run ops:backup-drill -- \
  --database-url=postgresql://user:pass@host:5432/zaki \
  --backup-dir=tmp/backups \
  --admin-database=postgres \
  --keep-drill-db=true
```

## Expected output
- A custom-format dump: `tmp/backups/<db>-<timestamp>.dump`
- A drill evidence file: `tmp/backups/<db>-<timestamp>.drill.json`
- JSON report with:
  - `ok: true`
  - source and drill database names
  - row counts for `zaki_users`, `memories`, and `memory_confirmations`

## Validation checklist
1. Drill command exits with code `0`.
2. Evidence JSON exists and reports `ok: true`.
3. Row counts are non-negative and plausible for current environment.
4. Drill DB is removed automatically unless `--keep-drill-db=true`.

## Failure handling
1. Keep the generated `.dump` artifact.
2. Record failing command and stderr in incident notes.
3. Re-run with `--keep-drill-db=true` for deeper inspection.
4. Do not deploy until a successful drill is recorded.
