# Agent Session Projection Cleanup

Nullalis is the canonical source of truth for ZAKI Agent sessions and history.
ZAKI Prod keeps `zaki_bot_threads` only as a local title/projection overlay for
matching Nullalis thread sessions. Local-only rows are cleanup debt.

## Dry Run

```bash
npm --prefix backend run agent:sessions:cleanup-projections -- --limit=500
```

The script compares local `zaki_bot_threads` / `zaki_bot_messages` rows against
`GET /api/v1/users/:id/sessions` in Nullalis and prints JSON:

- `stale_rows`: local rows with no canonical Nullalis session.
- `nullalis_errors`: users whose canonical session list could not be checked.
- `deleted`: `null` in dry-run mode.

## Apply

Run apply only after reviewing the dry-run output:

```bash
npm --prefix backend run agent:sessions:cleanup-projections -- --user-id=42 --apply
```

`--apply` hard-deletes only matching local `zaki_bot_messages` and
`zaki_bot_threads` rows for stale Agent projections. It never deletes Nullalis
sessions.

## Required Env

- `DATABASE_URL`
- `NULLALIS_BASE_URL` or legacy `NULLCLAW_BASE_URL`
- `NULLALIS_INTERNAL_TOKEN` or legacy `NULLCLAW_INTERNAL_TOKEN`

## Production Rule

Do not run this automatically on startup. It is a guarded operator action for
local projection cleanup after validating that Nullalis has the expected
canonical session state.
