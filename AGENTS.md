# AGENTS.md - ZAKI Prod Finalization Protocol

Scope: entire `zaki-prod` repository.

This repo is the commercial ZAKI web app and BFF. It coordinates product
surfaces across ZAKI Agent, Chat/Spaces, Brain, Learn, Hire, Design, billing,
usage, identity, and settings.

## 0. Platform coordination (read this FIRST)

**The live multi-agent coordination board for the whole platform lives in the central repo:**
[`zaki-infra/docs/COORDINATION.md`](https://github.com/ProjectNuggets/zaki-infra/blob/staging/docs/COORDINATION.md)
(optional local checkout: `~/Desktop/zaki-infra`, branch `staging`). It holds the
per-repo registry (owners, branch, tree state), active task claims, cross-repo handoffs, and an
**agent notes log** where concurrent agents leave messages to each other — **claim your task there
before starting, and leave a note when you finish or hand off.** Backlog:
[roadmap](https://github.com/ProjectNuggets/zaki-infra/blob/staging/docs/superpowers/ROADMAP-2026-07-11.md)
· [platform map](https://github.com/ProjectNuggets/zaki-infra/blob/staging/docs/PLATFORM.md).
If you cannot access the private infra repository, put the claim and handoff context in the relevant
zaki-prod issue or PR and ask a maintainer to mirror it to the board.
The old May-2026 boards in this repo are **archived** (`docs/archive/`) — do not work from them.

Developing this repo without running upstream services locally? See
[`docs/contributing-proxy-to-staging.md`](docs/contributing-proxy-to-staging.md).

## 1. Read First

Before editing code, read:

1. [The live coordination board](https://github.com/ProjectNuggets/zaki-infra/blob/staging/docs/COORDINATION.md) (see §0)
2. [The cross-repo platform map](https://github.com/ProjectNuggets/zaki-infra/blob/staging/docs/PLATFORM.md)
3. `docs/zaki-client-value-activation-map-2026-05-30.md`
4. `docs/nullalis-user-config-surface-map-2026-05-30.md`
5. `docs/zaki-v2-surface-activation-inventory-2026-05-30.md`
6. `docs/zaki-prod-end-state-spec.md`
7. `docs/agent-v6-parity-contract.md`
8. The relevant V2 mockup in `/Users/nova/Desktop/ZAKI Design System/v2/`

For Agent/Brain backend truth, the authoritative Nullalis checkout is:

`/Users/nova/Desktop/nullalis`

Key Nullalis docs:

- `/Users/nova/Desktop/nullalis/docs/ui-handoff.md`
- `/Users/nova/Desktop/nullalis/docs/online-agent-contract.md`
- `/Users/nova/Desktop/nullalis/docs/openapi-v1.yaml`
- `/Users/nova/Desktop/nullalis/docs/extension-ws-contract.md`
- `/Users/nova/Desktop/nullalis/docs/operations/v1-readiness-report.md`

## 2. Product Visibility

V1 public surfaces:

- ZAKI Agent
- ZAKI Chat/Spaces
- Brain

Private beta or gated:

- Learn

Repo-local and not deployed:

- Hire

Waitlist / coming soon:

- Design
- CLI
- Local app
- Additional extensions beyond the V1 browser extension

Execution order for product work:

1. Agent
2. Brain
3. Learning
4. Design
5. Hire
6. Hidden operator page

Do not expose a product as generally available unless product visibility,
entitlement, meter state, route, and UI copy all agree.

The hidden operator page must not appear in normal navigation. It can reuse the
existing internal admin route family, but full operator access is reserved for
`as@novanuggets.com` through the backend super-admin guard.

## 3. Design System

V2 overrides V1. Existing V1 styling is migration debt unless explicitly
retained for compatibility.

Visual contract:

- Dense, minimal, mono-forward, hairline-led.
- Low radius, restrained surfaces, no V1 rounded-card softness.
- `DM Mono` for Agent chrome, labels, tabs, meters, status strips, and compact
  panels.
- `Plus Jakarta Sans` for long chat prose.
- No marketing dashboard cards inside product surfaces.
- No product settings hidden inside a product workbench when they belong to
  route-level Settings.

## 4. Settings Ownership

Route-level `/settings` is the canonical control plane for account-level
configuration:

- Account & Security
- Billing & Usage
- Products & Access
- Connections
- Channels
- Secrets & API Keys
- Models & Providers
- Browser Extension & Devices
- Memory & Brain
- Developer Access
- Privacy & Data

Agent-local settings stay minimal:

- Runtime defaults: mode, autonomy, assistant mode, reasoning effort.
- Approval posture and live-run behavior.
- Browser lane quick status.
- Deep links to global Channels, Secrets, Providers, Memory, and Developer
  Access.

## 5. Backend Truth Rules

Do not invent a UI capability from a mockup. A feature is production-ready only
when all are true:

1. Backend route/tool exists.
2. BFF exposes a stable authenticated route.
3. UI lets the user see/configure/run/stop/revoke/inspect it.
4. Failure states are named and user-safe.
5. A signed-in local E2E or focused integration test covers it.

Backend readiness alone does not count. UI affordance alone does not count.

## 6. Multi-Agent Work Rules

Use isolated branches/worktrees for parallel work. Never have two agents edit
the same checkout.

Current agent work is claimed and assigned on the central board:

[`zaki-infra/docs/COORDINATION.md`](https://github.com/ProjectNuggets/zaki-infra/blob/staging/docs/COORDINATION.md)
(§2 task claims — claim before starting, leave a note in §4 when you finish or hand off)

Branch naming: `<agent-handle>/<short-task>` (e.g. `codex/settings-model-picker`,
`docs/central-coordination`). The May-era `codex/v2-*` closeout branches are
historical — see `docs/archive/`.

Each agent must:

- State its branch/worktree in the first response.
- Read this file and the relevant docs above.
- Read its task claim and the currently open roadmap wave on the live coordination board.
- Keep changes inside its assigned surface unless the orchestrator approves a
  shared contract change.
- Avoid unrelated formatting churn.
- Preserve unrelated dirty files.
- Run `git diff --check`.
- Run the focused tests for touched files.
- Run `npm run typecheck`.
- Run `npm run build` before declaring ready.
- Produce a short merge report: changed files, tests run, remaining gaps,
  screenshots if UI changed.

The orchestrator is responsible for final merges and conflict resolution.
Subagents should not merge to `main`.

## 7. Shared Code Discipline

If shared primitives are needed, put them in existing shared component/library
areas and keep them stable:

- `src/app/components/ui/`
- `src/app/components/settings/`
- `src/lib/`
- `src/queries/`

Do not duplicate large V2 primitives in product files. Extract only when it
prevents real duplication or matches existing local patterns.

## 8. Verification Baseline

For frontend/BFF changes:

```bash
npm test -- --runInBand <focused test files>
npm --prefix backend test -- --runInBand <focused backend tests>
npm run typecheck
npm run build
git diff --check
```

For visual surface changes, also capture signed-in screenshots at:

- Desktop: `1440x1000`
- Mobile: `390x844`

Required routes for final V1 app QA:

- `/`
- `/agent`
- `/brain`
- `/settings`

## 9. Known Coordination Constraints

- **Branch/tree ownership is tracked LIVE in the
  [coordination board](https://github.com/ProjectNuggets/zaki-infra/blob/staging/docs/COORDINATION.md)
  §1–§2** —
  check it before touching this tree; the snapshot below goes stale, the board does not.
- `/Users/nova/Desktop/zaki-prod` is the primary checkout — it may be mid-work on a
  feature branch with uncommitted changes owned by another session. Never assume it is
  clean; use your own worktree.
- `/Users/nova/Desktop/nullalis` is the engine truth (its `main` is the validated SHA —
  see the board registry for the current one).
- Nullalis backend capabilities are merged and documented as backend-ready, but ZAKI UI
  release gates remain open until app-level E2E proves each exposed feature.
