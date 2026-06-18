# V1 Cutover First-Run Runbook

Date: 2026-06-18

Scope: existing beta users at commercial V1 cutover.

Goal: give each beta user a clean V1 first run without ad-hoc SQL. The
mechanism stamps an auditable cutover marker, archives beta workspace state,
resets the shared unit wallet to the current V1 plan baseline, queues the
Nullalis V1 birthday bootstrap, and offers the memory-import bridge.

## Entry Points

Owner-only admin API:

```bash
curl -X POST "$ZAKI_BFF_BASE_URL/api/admin/v1-cutover/run" \
  -H "Authorization: Bearer $OWNER_ZAKI_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun":true}'
```

Full run after owner review:

```bash
curl -X POST "$ZAKI_BFF_BASE_URL/api/admin/v1-cutover/run" \
  -H "Authorization: Bearer $OWNER_ZAKI_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirm":"V1_CUTOVER"}'
```

CLI, same service path:

```bash
npm --prefix backend run v1-cutover -- --dry-run
npm --prefix backend run v1-cutover -- --yes
npm --prefix backend run v1-cutover -- --user-id=42 --yes
```

The full batch requires `confirm: "V1_CUTOVER"` through the API or `--yes`
through the CLI. Single-user runs are intended for rehearsal and owner review.

## Per-User Behavior

1. Read and lock `zaki_v1_cutover_markers(user_id, cutover_version)`.
2. If the marker is already `completed`, log `skipped_already_completed` and
   return without touching wallet, workspaces, or Nullalis.
3. Mark the user `running` and log `started`.
4. Call Nullalis `POST /api/v1/users/{id}/v1-cutover` with a stable
   `Idempotency-Key: v1-cutover:<version>:user:<id>`.
5. On engine success, expire active meter holds, reset wallet counters to the
   current plan baseline, soft-hide beta workspace slugs, clear local agent
   projections, and mark the cutover `completed`.
6. Log `birthday_first_run_queued`, `memory_import_bridge_offered`, and
   `completed`.

## Audit Tables

- `zaki_v1_cutover_markers`: one row per user/version, including wallet
  before/after snapshot, archived workspace slugs, engine response, status, and
  actor/request metadata.
- `zaki_v1_cutover_events`: append-only event log for starts, skips, failures,
  birthday queue, memory bridge offer, and completion.
- `zaki_v1_cutover_workspace_archives`: reversible map of workspace slugs hidden
  for cutover.

Audit API:

```bash
curl "$ZAKI_BFF_BASE_URL/api/admin/v1-cutover/events?limit=200" \
  -H "Authorization: Bearer $OWNER_ZAKI_ACCESS_TOKEN"
```

## Reversibility

Feasible reversals:

- Beta workspace visibility: remove the matching rows from
  `zaki_hidden_workspaces` for slugs recorded in
  `zaki_v1_cutover_workspace_archives`, then set `restored_at`.
- Wallet: restore from `wallet_snapshot_json.before` if the user has not spent
  post-cutover units. If post-cutover usage exists, do not blindly restore old
  counters.
- Nullalis workspace archive: the engine keeps the archived workspace at
  `{user_root}/archives/v1-cutover-<version>/workspace`. Restore manually only
  for an owner-approved support case.

Not automatically reversible:

- The birthday bootstrap and memory-import offer are intentionally re-queued.
  Reverting that should be done through the onboarding endpoint only after
  owner approval.

## Owner Review Gate

Before the full batch:

1. Run `--dry-run` and inspect candidate count.
2. Run one known beta account with `--user-id=<id> --yes`.
3. Verify the next Agent turn starts from the V1 bootstrap and includes the
   memory-import bridge offer.
4. Verify the user's wallet shows plan baseline with zero weekly/top-up usage.
5. Verify audit rows in `/api/admin/v1-cutover/events`.
6. Approve the full run with `--yes` or `confirm: "V1_CUTOVER"`.

## Verification Commands

```bash
npm --prefix backend test -- --runInBand backend/src/v1-cutover.test.js
npm run typecheck
npm run build
git diff --check
```

Nullalis engine:

```bash
zig build test -Dtest-filter="v1-cutover"
git diff --check
```
