# ZAKI V2 Multi-Agent Execution Board

Date: 2026-05-30
Owner: Codex orchestrator / integration owner

## Objective

Finish ZAKI commercial V1 as one coherent S-tier app: public Agent, Chat/Spaces,
Brain, Dashboard, and Settings; private-beta Learning and Hire; Design waitlist;
hidden operator page; truthful wiring to Nullalis and the ZAKI BFF.

This file is the working board for external agents. Each worker should be given
only its assigned section and prompt. The orchestrator owns final merge judgment.

## Current Repo State

App integration checkout:

- Path: `/Users/nova/Desktop/zaki-prod`
- Branch: `codex/zaki-prod-finalization`
- Status at board creation: clean, ahead of origin

Active app worktrees:

- `/Users/nova/Desktop/zaki-prod-agent` on `codex/v2-agent-closeout`
- `/Users/nova/Desktop/zaki-prod-hire` on `codex/zaki-hire`

Backend checkout:

- `/Users/nova/Desktop/nullalis`
- Branch: `main`
- Status at board creation: clean

Design source:

- `/Users/nova/Desktop/ZAKI Design System/v2/`

## Read Before Any Work

Every ZAKI app worker must read:

1. `AGENTS.md`
2. `docs/multi-agent-execution-board-2026-05-30.md`
3. `docs/multi-agent-finalization-plan-2026-05-30.md`
4. `docs/zaki-client-value-activation-map-2026-05-30.md`
5. `docs/nullalis-user-config-surface-map-2026-05-30.md`
6. `docs/zaki-v2-surface-activation-inventory-2026-05-30.md`
7. The relevant design file in `/Users/nova/Desktop/ZAKI Design System/v2/`

Backend workers must also read:

1. `/Users/nova/Desktop/nullalis/docs/ui-handoff.md`
2. `/Users/nova/Desktop/nullalis/docs/openapi-v1.yaml`
3. `/Users/nova/Desktop/nullalis/docs/online-agent-contract.md`
4. `/Users/nova/Desktop/nullalis/docs/extension-ws-contract.md`
5. `/Users/nova/Desktop/nullalis/docs/operations/v1-readiness-report.md`

## Operating Rules

- No worker merges to the integration branch. Workers prepare branches and
  reports; the orchestrator reviews and merges.
- No worker edits another worker's worktree.
- No worker claims production-ready without tests and named remaining gaps.
- No worker invents UI from a mockup unless the backend/BFF route exists or the
  feature is explicitly marked gated/read-only/hidden.
- No worker exposes Learn/Hire as public. They are private beta.
- No worker exposes Design as working product. It is waitlist/early access.
- No worker exposes hidden/operator pages in normal navigation.
- No worker exposes raw saved secrets after save.
- `src/lib/api.ts`, `backend/src/index.js`, `backend/src/agent-bff-contract.js`,
  `backend/src/platform-policy.js`, and route registration are orchestrator
  coordination files. Workers can propose edits, but must call them out in the
  report.

## Parallelism Policy

Run at most four implementation agents at once:

1. Agent surface
2. Backend activation contracts
3. Brain surface
4. Release QA harness

Settings starts implementation after Agent channel work and the backend channel
contract are stable enough to avoid BFF/API collisions. Learning, Design, Hire,
and Operator start after the public Agent/Brain/Settings shape is stable.

## File Ownership

| Area | Owner | Files |
|---|---|---|
| Integration and merge | Agent 0 | all shared files |
| Agent surface | Agent 1 | `src/app/components/ChatArea.tsx`, `InputArea.tsx`, `src/app/components/chat/*`, `src/app/components/agent/*`, Agent tests |
| Backend activation | Agent 2 | `/Users/nova/Desktop/nullalis`, backend docs/tests |
| Brain surface | Agent 3 | Brain components/routes/tests, Brain styling |
| Settings control plane | Agent 4 | `src/app/components/settings/*`, settings tests, coordinated API/BFF files |
| Release QA | Agent 5 | `e2e/*`, Playwright config/helpers, QA docs |
| Learning beta | Agent 6 | Learning components/API/tests |
| Design waitlist | Agent 7 | Design route/components/API tests |
| Hire beta | Agent 8 | `/Users/nova/Desktop/zaki-prod-hire` |
| Operator page | Agent 9 | admin/operator components/routes/tests, guarded BFF usage |

If a worker needs a shared file outside its ownership, it must add a report item:
`Shared-file change requested: <file> <why> <risk>`.

## Dependency Graph

```text
Agent 1 Agent Closeout -> Agent 4 Settings Control Plane
Agent 1 Agent Closeout -> Agent 5 Release QA

Agent 2 Backend Contracts -> Agent 4 Settings Control Plane
Agent 2 Backend Contracts -> Agent 1 Agent Closeout checks
Agent 2 Backend Contracts -> Agent 3 Brain Memory Governance

Agent 3 Brain V2 -> Agent 5 Release QA

Agent 4 Settings -> Agent 5 Release QA

Agent 6 Learning -> Agent 5 Release QA
Agent 7 Design -> Agent 5 Release QA
Agent 8 Hire -> Agent 5 Release QA

Agent 9 Operator -> Agent 5 Release QA
```

## Wave Plan

### Wave 0 - Coordination Lock

Owner: Agent 0 orchestrator.

Deliverable:

- This execution board exists.
- `AGENTS.md` points workers to it.
- Current worktrees are clean or known.
- First worker prompts are issued.

### Wave 1 - Public Core

Start now:

- Agent 1: Agent surface closeout.
- Agent 2: Backend activation contracts, starting with channels.
- Agent 3: Brain V2 surface.
- Agent 5: Release QA harness, smoke scaffolding only.

Do not start Settings implementation yet. Settings can do read-only audit only.

Wave 1 merge gates:

- Agent 1 branch ready and reviewed.
- Agent 2 channel contract proposal/branch ready and reviewed.
- Agent 3 has Brain shell and route parity ready enough for Settings links.
- Agent 5 has harness without brittle final assertions.

### Wave 2 - Control Plane

Start after Wave 1 channel/API shape is stable:

- Agent 4: Settings control plane implementation.
- Agent 2 continues memory governance, extension device, provider profile, and
  OpenAI-compatible contracts as backend follow-ups.
- Agent 5 turns scaffolding into real signed-in E2E assertions.

Wave 2 merge gates:

- `/settings` covers channels, secrets, browser devices, memory/brain, usage,
  products/access, privacy/data, and provider readiness truthfully.
- Agent, Brain, Settings pass focused tests and app build.

### Wave 3 - Beta And Internal Surfaces

Start after public Agent/Brain/Settings are stable:

- Agent 6: Learning private beta V2.
- Agent 7: Design waitlist.
- Agent 8: Hire private beta review and merge prep.
- Agent 9: Hidden operator control plane.

Wave 3 merge gates:

- Learn/Hire remain private beta.
- Design remains waitlist/early access.
- Operator page is hidden and guarded.

### Wave 4 - Release Lock

Owner: Agent 0 + Agent 5.

Deliverable:

- Full signed-in E2E for `/`, `/agent`, `/brain`, `/settings`.
- Desktop `1440x1000` and mobile `390x844` screenshots.
- Gateway-up local smoke.
- Product visibility assertions.
- Final release report.

## Agent 0 - Orchestrator / Integration

Do not trigger separately. This is the current owner thread.

Responsibilities:

- Review every worker branch.
- Keep shared files coherent.
- Merge in the dependency order.
- Run final verification.
- Decide whether backend contract gaps block a UI claim.
- Keep product visibility truthful.

Review checklist:

1. `git status --short --branch`
2. `git diff --stat`
3. `git diff --check`
4. Focused test output
5. `npm run typecheck`
6. `npm run build`
7. UI screenshots if visual work changed
8. No public claim without backend/BFF/E2E

## Agent 1 - Agent Surface Closeout

Status: start now.

Worktree:

- `/Users/nova/Desktop/zaki-prod-agent`

Branch:

- `codex/v2-agent-closeout`

Mission:

Finish `/agent` as the flagship Codex/Manus-level workbench with V2 visual
parity and production-grade runtime wiring.

Scope:

- Agent chrome, session rail, conversation area, composer, `+` menu, status
  strip, right inspector, narration, tool calls, approvals, artifacts, traces,
  cron, browser/extension states, context meter.
- Button-by-button wiring: mode, autonomy, assistant mode, reasoning effort,
  cancel, approval approve/deny, attachments, artifact open/share/revoke/export,
  trace share/open/revoke, cron create/edit/delete/run, session export/compact.
- Preserve model picker deferral. Do not build the final model strategy.
- Do not move global Settings ownership. Deep-link to `/settings` where needed.

Primary files:

- `src/app/components/ChatArea.tsx`
- `src/app/components/InputArea.tsx`
- `src/app/components/chat/AgentInspectorRail.tsx`
- `src/app/components/chat/NullalisRuntimeWidgets.tsx`
- `src/app/components/agent/*`
- Agent tests

Avoid unless explicitly needed:

- `src/lib/api.ts`
- `backend/src/index.js`
- `backend/src/agent-bff-contract.js`

Verification:

```bash
npm test -- --runInBand src/app/components/ChatArea.test.tsx src/app/components/InputArea.test.tsx src/app/components/chat/AgentInspectorRail.test.tsx src/app/components/chat/NullalisRuntimeWidgets.test.tsx
npm --prefix backend test -- --runInBand backend/src/agent-bff-contract.test.js backend/src/bot-bff.test.js
npm run typecheck
npm run build
git diff --check
```

Report:

- Changed files.
- Tests run with summary.
- Screenshot paths for desktop/mobile `/agent`.
- Every visible control audited: wired, gated, hidden, or blocked.
- Backend/BFF blockers.

## Agent 2 - Backend Activation Contracts

Status: start now.

Repo:

- `/Users/nova/Desktop/nullalis`

Branch:

- `prod-readiness/s7-zaki-ui-activation-contracts`

Mission:

Expose backend value through stable, user-safe contracts that ZAKI UI can bind
without guessing. Start with channels.

Slice order:

1. Channels: Slack, Discord, Email, WhatsApp connect/test/disconnect/status with
   vault-backed secret refs. Keep Telegram stable. Keep hidden channels hidden.
2. Memory governance: forget by topic/id, PII purge dry-run/apply, export,
   provenance counts, user scope isolation.
3. Extension devices: pairing initiation, device inventory, revoke, timeout,
   last-command state. Keep diagnostics separate.
4. Provider profiles: OpenAI-compatible/BYOK profile list/create/update/test/
   delete with vault refs and policy states.
5. OpenAPI/Composio/MCP inventory: read-only configured status unless
   user-managed auth contracts are complete.

Required docs:

- Update `docs/openapi-v1.yaml`
- Update `docs/ui-handoff.md`
- Update `docs/online-agent-contract.md` or `docs/extension-ws-contract.md`
  where relevant
- Update deferred register/status docs if Nullalis uses them for this item

Verification:

```bash
zig build -Dengines=base,sqlite,postgres
zig build test -Dengines=base,sqlite,postgres --summary all
git diff --check
```

Report:

- Routes added/changed.
- Exact request/response shapes.
- Tests run with summary.
- What ZAKI UI can now expose.
- What must remain hidden.

## Agent 3 - Brain V2 Surface

Status: start now after creating a separate worktree.

Suggested worktree:

```bash
git worktree add /Users/nova/Desktop/zaki-prod-brain -b codex/v2-brain-closeout /Users/nova/Desktop/zaki-prod
```

Mission:

Make `/brain` the canonical personal memory surface: graph-first, V2 visual
quality, user-scoped, provenance-aware, and ready for Settings deep links.

Scope:

- V2 shell against `V2 Brain.html` and `V2 Brain v2.html`.
- Graph-first canvas, filters rail, timeline, communities, orphan facts,
  memory detail, search, compose-from-selection, empty/error states.
- Memory governance only where BFF/backend contract exists; otherwise show
  truthful disabled/deep-link status.
- Keep Agent memory, Learning memory, Hire memory, and Workspace memory separate
  in copy and data flow.

Primary files:

- Brain components/routes under `src/app/components`
- Brain tests
- Brain styling

Avoid unless coordinated:

- `src/lib/api.ts`
- Backend BFF routes

Verification:

```bash
npm test -- --runInBand <brain-related test files>
npm run typecheck
npm run build
git diff --check
```

Report:

- Changed files.
- Tests run with summary.
- Screenshot paths for desktop/mobile `/brain`.
- Memory governance actions: wired, gated, hidden, or blocked.

## Agent 4 - Settings Control Plane

Status: read-only audit now; implementation starts after Wave 1 API/channel
shape is stable.

Suggested worktree:

```bash
git worktree add /Users/nova/Desktop/zaki-prod-settings -b codex/v2-settings-control-plane /Users/nova/Desktop/zaki-prod
```

Mission:

Make `/settings` the canonical MECE control plane for commercial V1.

Scope:

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

Rules:

- Bind only real BFF/backend routes.
- Unsupported provider/OpenAPI/BYOK actions are read-only, gated, or hidden.
- Secrets are metadata-only after save.
- Browser extension diagnostics are not enough for device management; pair/revoke
  needs backend contract.
- Agent-local settings remain minimal.

Primary files:

- `src/app/components/settings/SettingsPage.tsx`
- `src/app/components/sidebar/SettingsModal.tsx`
- Settings tests

Shared files only with explicit report:

- `src/lib/api.ts`
- `backend/src/index.js`
- `backend/src/agent-bff-contract.js`

Verification:

```bash
npm test -- --runInBand src/app/components/settings/SettingsPage.test.tsx src/app/components/sidebar/SettingsModal.test.tsx src/lib/api.test.ts
npm --prefix backend test -- --runInBand backend/src/agent-bff-contract.test.js backend/src/bot-bff.test.js backend/src/nullalis-secrets.test.js
npm run typecheck
npm run build
git diff --check
```

Report:

- Changed files.
- Tests run with summary.
- Which settings rows are launch, partial, private beta, operator-only, hidden.
- Remaining backend/BFF blockers.

## Agent 5 - Release QA / E2E Matrix

Status: start now for harness and smoke scaffolding only. Tight assertions wait
until surfaces stabilize.

Suggested worktree:

```bash
git worktree add /Users/nova/Desktop/zaki-prod-qa -b codex/v2-release-e2e /Users/nova/Desktop/zaki-prod
```

Mission:

Create the release confidence gate for ZAKI V1.

Scope:

- Signed-in Playwright for `/`, `/agent`, `/brain`, `/settings`.
- Gateway-up local smoke.
- Desktop and mobile screenshots.
- Product visibility assertions: Agent/Chat/Brain public; Learn/Hire beta;
  Design waitlist.
- Failure-state checks for backend unavailable, extension disconnected, empty
  Brain, no artifacts/traces, quota low.

Avoid:

- Product implementation files unless only adding stable `data-testid`
  attributes and reporting them.

Verification:

```bash
npm run typecheck
npm run build
npm test -- --runInBand <qa helper tests if added>
git diff --check
```

Report:

- Test matrix coverage.
- Commands to run locally.
- Screenshot paths.
- Surfaces still too unstable for strict assertions.

## Agent 6 - Learning Private Beta

Status: start in Wave 3.

Suggested worktree:

```bash
git worktree add /Users/nova/Desktop/zaki-prod-learning -b codex/v2-learning-closeout /Users/nova/Desktop/zaki-prod
```

Mission:

Make Learning V2-aligned, centrally metered, and clearly private beta.

Scope:

- Study plan, tasks, sessions, dashboard, knowledge base, books, notebooks,
  co-writer, tutor agents, tutor channels, generated outputs.
- Preserve Learning memory as learner memory, not Agent Brain.
- Keep public product gating truthful.

Verification:

```bash
npm test -- --runInBand <learning-related tests>
npm --prefix backend test -- --runInBand backend/src/learning-quota.test.js
npm run typecheck
npm run build
git diff --check
```

## Agent 7 - Design Waitlist

Status: start in Wave 3.

Suggested worktree:

```bash
git worktree add /Users/nova/Desktop/zaki-prod-design -b codex/v2-design-waitlist /Users/nova/Desktop/zaki-prod
```

Mission:

Make Design a truthful V2 waitlist/early-access surface without implying engine
availability.

Scope:

- Product tile, route, waitlist/early access CTA if backend route exists.
- Product registry and entitlement truth.
- No invented Design runtime.

Verification:

```bash
npm test -- --runInBand <design-related tests>
npm run typecheck
npm run build
git diff --check
```

## Agent 8 - Hire Private Beta

Status: start in Wave 3 or when Hire branch is ready for orchestrator review.

Worktree:

- `/Users/nova/Desktop/zaki-prod-hire`

Branch:

- `codex/zaki-hire`

Mission:

Prepare Hire for private beta integration with central meter, entitlement,
memory scope, and V2 visual rules.

Rules:

- Do not expose Hire publicly.
- Do not let Hire own billing. It reports raw usage facts to central meter.
- Keep untracked `artifacts/` out of commits unless they are intentional.

Verification:

```bash
npm test -- --runInBand <hire-related tests>
npm run typecheck
npm run build
git diff --check
```

## Agent 9 - Hidden Operator Control Plane

Status: start in Wave 3 after Settings shape is stable.

Suggested worktree:

```bash
git worktree add /Users/nova/Desktop/zaki-prod-operator -b codex/v2-operator-control-plane /Users/nova/Desktop/zaki-prod
```

Mission:

Expand the hidden internal operator surface for production operations.

Scope:

- Access codes, beta access, admin users, waitlist, telemetry, rate limits,
  health, product states, meter diagnostics where routes exist.
- Full access only for `as@novanuggets.com` through backend super-admin guard.
- No normal navigation link.

Verification:

```bash
npm test -- --runInBand <admin/operator tests> src/lib/api.test.ts
npm --prefix backend test -- --runInBand <admin guard tests>
npm run typecheck
npm run build
git diff --check
```

## Worker Ready Report Template

Every worker ends with:

```text
Branch/worktree:
Changed files:
What shipped:
What is gated/hidden:
Shared-file changes requested:
Tests run:
Screenshots:
Remaining blockers:
Recommended merge order:
```

## Orchestrator Self-Review

Before issuing prompts, the orchestrator verifies:

- Every worker has a single primary ownership area.
- No two active workers own the same app surface.
- Settings implementation is delayed until Agent/backend channel shape is
  stable.
- Backend contracts are explicit before user-facing UI claims.
- Public surfaces remain Agent, Chat/Spaces, Brain, Dashboard, Settings.
- Learn/Hire remain beta; Design remains waitlist.
- QA has a branch but does not force brittle assertions before surfaces land.

## Copy/Paste Prompts

Use the prompts below verbatim unless you intentionally change branch/worktree
assignments.

### Prompt For Agent 1

```text
You are Agent 1: ZAKI Agent Surface Closeout.

Worktree: /Users/nova/Desktop/zaki-prod-agent
Branch: codex/v2-agent-closeout

Read first:
- AGENTS.md
- docs/multi-agent-execution-board-2026-05-30.md, Agent 1 section
- docs/zaki-client-value-activation-map-2026-05-30.md
- docs/agent-v6-parity-contract.md
- /Users/nova/Desktop/nullalis/docs/ui-handoff.md
- /Users/nova/Desktop/nullalis/docs/online-agent-contract.md
- /Users/nova/Desktop/nullalis/docs/extension-ws-contract.md
- /Users/nova/Desktop/ZAKI Design System/v2/V2 Agent v6.html
- /Users/nova/Desktop/ZAKI Design System/v2/V2 Agent · Mobile.html

Mission:
Finish /agent as the flagship V2 workbench. Preserve backend contracts. Make the UI visually and behaviorally production-grade.

Scope:
- Agent chrome, session rail, conversation, composer, + menu, status strip, inspector rail, narration, tool calls, approvals, artifacts, traces, cron, browser/extension state, context meter.
- Audit every visible button/control for backend wiring.
- Keep model picker deferred.
- Do not move global Settings ownership; deep-link to /settings where appropriate.

Deliver:
- Code/tests/screenshots.
- Report using the Worker Ready Report Template.

Verification:
npm test -- --runInBand src/app/components/ChatArea.test.tsx src/app/components/InputArea.test.tsx src/app/components/chat/AgentInspectorRail.test.tsx src/app/components/chat/NullalisRuntimeWidgets.test.tsx
npm --prefix backend test -- --runInBand backend/src/agent-bff-contract.test.js backend/src/bot-bff.test.js
npm run typecheck
npm run build
git diff --check
```

### Prompt For Agent 2

```text
You are Agent 2: Nullalis Backend Activation Contracts for ZAKI V2.

Repo: /Users/nova/Desktop/nullalis
Create/use branch: prod-readiness/s7-zaki-ui-activation-contracts

Read first:
- /Users/nova/Desktop/zaki-prod/AGENTS.md
- /Users/nova/Desktop/zaki-prod/docs/multi-agent-execution-board-2026-05-30.md, Agent 2 section
- /Users/nova/Desktop/zaki-prod/docs/zaki-client-value-activation-map-2026-05-30.md
- docs/ui-handoff.md
- docs/openapi-v1.yaml
- docs/online-agent-contract.md
- docs/extension-ws-contract.md
- docs/operations/v1-readiness-report.md

Mission:
Expose backend value through stable user-safe contracts that ZAKI UI can bind without guessing.

Start with channels:
- Slack, Discord, Email, WhatsApp status/connect/test/disconnect using vault-backed secret refs.
- Keep Telegram stable.
- Keep hidden channels hidden.

Then continue, if time permits:
- Memory governance: forget, PII purge dry-run/apply, export, provenance counts.
- Extension devices: pair, inventory, revoke, timeout, last command.
- Provider profiles: OpenAI-compatible/BYOK list/create/update/test/delete with vault refs.

Deliver:
- Code/tests/docs.
- OpenAPI and handoff updates.
- Report using the Worker Ready Report Template.

Verification:
zig build -Dengines=base,sqlite,postgres
zig build test -Dengines=base,sqlite,postgres --summary all
git diff --check
```

### Prompt For Agent 3

```text
You are Agent 3: ZAKI Brain V2 Surface.

Create worktree if needed:
git worktree add /Users/nova/Desktop/zaki-prod-brain -b codex/v2-brain-closeout /Users/nova/Desktop/zaki-prod

Worktree: /Users/nova/Desktop/zaki-prod-brain
Branch: codex/v2-brain-closeout

Read first:
- AGENTS.md
- docs/multi-agent-execution-board-2026-05-30.md, Agent 3 section
- docs/zaki-client-value-activation-map-2026-05-30.md
- docs/zaki-prod-brain-data-truth-2026-05-08.md
- /Users/nova/Desktop/nullalis/docs/ui-handoff.md
- /Users/nova/Desktop/ZAKI Design System/v2/V2 Brain.html
- /Users/nova/Desktop/ZAKI Design System/v2/V2 Brain v2.html

Mission:
Make /brain the canonical personal memory surface: graph-first, V2 visual quality, user-scoped, provenance-aware, Settings-link ready.

Scope:
- V2 Brain shell, graph canvas, filters, timeline, communities, orphans, detail, search, compose-from-selection, empty/error/mobile states.
- Memory governance only where BFF/backend contract exists; otherwise mark gated/blocked truthfully.
- Keep Agent, Learning, Hire, and Workspace memories separate.

Deliver:
- Code/tests/screenshots.
- Report using the Worker Ready Report Template.

Verification:
npm test -- --runInBand <brain-related test files>
npm run typecheck
npm run build
git diff --check
```

### Prompt For Agent 4

```text
You are Agent 4: ZAKI Settings Control Plane.

Do read-only audit now. Do not implement until orchestrator confirms Agent channel branch and backend channel contract are stable.

Create worktree if approved:
git worktree add /Users/nova/Desktop/zaki-prod-settings -b codex/v2-settings-control-plane /Users/nova/Desktop/zaki-prod

Read first:
- AGENTS.md
- docs/multi-agent-execution-board-2026-05-30.md, Agent 4 section
- docs/zaki-client-value-activation-map-2026-05-30.md
- docs/nullalis-user-config-surface-map-2026-05-30.md
- /Users/nova/Desktop/ZAKI Design System/v2/V2 Settings.html

Mission:
Make /settings the canonical MECE control plane for commercial V1.

Scope:
Account & Security, Billing & Usage, Products & Access, Connections, Channels, Secrets & API Keys, Models & Providers, Browser Extension & Devices, Memory & Brain, Developer Access, Privacy & Data.

Rules:
- Bind only real BFF/backend routes.
- Unsupported provider/OpenAPI/BYOK actions are read-only, gated, or hidden.
- Secrets are metadata-only after save.
- Agent-local settings stay minimal.

Deliver:
- First: audit report with exact files/routes needed.
- After approval: code/tests/screenshots and Worker Ready Report.
```

### Prompt For Agent 5

```text
You are Agent 5: ZAKI Release QA / E2E Matrix.

Create worktree if needed:
git worktree add /Users/nova/Desktop/zaki-prod-qa -b codex/v2-release-e2e /Users/nova/Desktop/zaki-prod

Read first:
- AGENTS.md
- docs/multi-agent-execution-board-2026-05-30.md, Agent 5 section
- docs/zaki-client-value-activation-map-2026-05-30.md

Mission:
Build the release confidence gate for ZAKI V1 without destabilizing product code.

Scope:
- Signed-in Playwright scaffolding for /, /agent, /brain, /settings.
- Gateway-up smoke checks.
- Desktop 1440x1000 and mobile 390x844 screenshot flow.
- Visibility assertions: Agent/Chat/Brain public; Learn/Hire beta; Design waitlist.

Do not add brittle final assertions until surfaces stabilize.

Verification:
npm run typecheck
npm run build
npm test -- --runInBand <qa helper tests if added>
git diff --check

Deliver:
- QA matrix, test commands, screenshot paths if captured, and Worker Ready Report.
```

### Prompt For Agent 6

```text
You are Agent 6: ZAKI Learning Private Beta V2.

Do not start implementation until orchestrator opens Wave 3.

Create worktree when approved:
git worktree add /Users/nova/Desktop/zaki-prod-learning -b codex/v2-learning-closeout /Users/nova/Desktop/zaki-prod

Read AGENTS.md and docs/multi-agent-execution-board-2026-05-30.md Agent 6 section.

Mission:
Make Learning V2-aligned, centrally metered, and clearly private beta. Preserve learner memory as distinct from Agent Brain and workspace memory.
```

### Prompt For Agent 7

```text
You are Agent 7: ZAKI Design Waitlist.

Do not start implementation until orchestrator opens Wave 3.

Create worktree when approved:
git worktree add /Users/nova/Desktop/zaki-prod-design -b codex/v2-design-waitlist /Users/nova/Desktop/zaki-prod

Read AGENTS.md and docs/multi-agent-execution-board-2026-05-30.md Agent 7 section.

Mission:
Make Design a truthful V2 waitlist/early-access surface. Do not imply working Design engine availability.
```

### Prompt For Agent 8

```text
You are Agent 8: ZAKI Hire Private Beta.

Worktree: /Users/nova/Desktop/zaki-prod-hire
Branch: codex/zaki-hire

Read /Users/nova/Desktop/zaki-prod/AGENTS.md and /Users/nova/Desktop/zaki-prod/docs/multi-agent-execution-board-2026-05-30.md Agent 8 section.

Mission:
Prepare Hire for private beta integration with central meter, entitlement, memory scope, and V2 visual rules. Do not expose Hire publicly. Keep untracked artifacts out of commits unless intentional.
```

### Prompt For Agent 9

```text
You are Agent 9: ZAKI Hidden Operator Control Plane.

Do not start implementation until orchestrator opens Wave 3.

Create worktree when approved:
git worktree add /Users/nova/Desktop/zaki-prod-operator -b codex/v2-operator-control-plane /Users/nova/Desktop/zaki-prod

Read AGENTS.md and docs/multi-agent-execution-board-2026-05-30.md Agent 9 section.

Mission:
Expand the hidden internal operator surface for access codes, beta access, admins, waitlist, telemetry, rate limits, health, product states, and meter diagnostics. Full access only for as@novanuggets.com through backend super-admin guard. No normal navigation link.
```
