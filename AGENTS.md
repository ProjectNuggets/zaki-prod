# AGENTS.md - ZAKI Prod Finalization Protocol

Scope: entire `zaki-prod` repository.

This repo is the commercial ZAKI web app and BFF. It coordinates product
surfaces across ZAKI Agent, Chat/Spaces, Brain, Learn, Hire, Design, billing,
usage, identity, and settings.

## 1. Read First

Before editing code, read:

1. `docs/multi-agent-finalization-plan-2026-05-30.md`
2. `docs/nullalis-user-config-surface-map-2026-05-30.md`
3. `docs/zaki-v2-surface-activation-inventory-2026-05-30.md`
4. `docs/zaki-prod-end-state-spec.md`
5. `docs/agent-v6-parity-contract.md`
6. The relevant V2 mockup in `/Users/nova/Desktop/ZAKI Design System/v2/`

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

Branch naming:

- `codex/v2-agent-closeout`
- `codex/v2-brain-closeout`
- `codex/v2-learning-closeout`
- `codex/v2-design-waitlist`
- `codex/v2-hire-closeout`
- `codex/v2-settings-control-plane`
- `codex/v2-operator-control-plane`
- `codex/v2-release-e2e`

Each agent must:

- State its branch/worktree in the first response.
- Read this file and the relevant docs above.
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

- `zaki-prod` currently has active dirty work on `codex/zaki-prod-finalization`.
- `/Users/nova/Desktop/zaki-prod-hire` is the dedicated Hire worktree.
- `/Users/nova/Desktop/nullalis` is the production backend truth on `main`.
- Nullalis backend S1-S6 are merged and documented as backend-ready, but ZAKI UI
  release gates remain open until app-level E2E proves each exposed feature.
