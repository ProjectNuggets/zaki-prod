# ZAKI V2 Finalization Multi-Agent Plan

> ⚠️ **ARCHIVED 2026-07-12 — do not work from this document.** The live multi-agent
> coordination board for the whole platform is **`zaki-infra/docs/COORDINATION.md`**
> (repo registry, task claims, cross-repo handoffs, and the agent notes log where
> agents leave messages to each other). Backlog:
> `zaki-infra/docs/superpowers/ROADMAP-2026-07-11.md`. Retained for audit context only.

Date: 2026-05-30
Owner: Codex orchestrator

## Goal

Bring ZAKI prod to commercial V1 readiness with S-tier V2 UI/UX and truthful
end-to-end wiring. Public launch surfaces are Dashboard, Agent, Chat/Spaces,
Brain, and Settings. Learn/Hire stay private beta. Design is waitlist.

Product execution order is fixed:

1. Agent
2. Brain
3. Learning
4. Design
5. Hire
6. Hidden operator page

Only one product owns implementation at a time. Parallel workers may do
read-only review, documentation, or non-overlapping test work unless the
orchestrator explicitly opens another lane.

## External Best-Practice Inputs

The operating model follows:

- Orchestrator-worker multi-agent pattern: lead agent decomposes, assigns
  focused work, and synthesizes results.
- Isolated git worktrees/branches for parallel implementation.
- Repo-level `AGENTS.md` plus living execution docs for long-running work.
- Focused subagents with limited scope, explicit deliverables, and verification
  commands.

References:

- https://www.anthropic.com/engineering/multi-agent-research-system
- https://code.claude.com/docs/en/sub-agents
- https://git-scm.com/docs/git-worktree
- https://developers.openai.com/codex/guides/agents-md
- https://developers.openai.com/cookbook/articles/codex_exec_plans

## Current Repo State

Authoritative app checkout:

- `/Users/nova/Desktop/zaki-prod`
- Branch: `codex/zaki-prod-finalization`
- Current branch is ahead of `origin/codex/zaki-prod-finalization`.
- Worktree was clean at the 2026-05-30 execution-board checkpoint.

Related worktrees:

- `/Users/nova/Desktop/zaki-prod-agent` on `codex/v2-agent-closeout`
- `/Users/nova/Desktop/zaki-prod-hire` on `codex/zaki-hire`

Authoritative backend checkout:

- `/Users/nova/Desktop/nullalis`
- Branch: `main`
- Latest observed commit: `b7d1eb4b docs(ops): finalize V1 readiness report`

Nullalis backend is S1-S6 production-readiness merged. ZAKI app still needs
app-level UI, Settings, Brain, and E2E release gates.

Whole-repo client-value scan:

- `docs/zaki-client-value-activation-map-2026-05-30.md`
- This is now the channel-first activation source of truth. Workers should use
  it to decide whether a backend capability is launch, partial, private beta,
  operator-only, or hidden.

Execution board:

- `docs/multi-agent-execution-board-2026-05-30.md`
- This is the numbered worker plan and prompt source. Use it for Agent 1 through
  Agent 9 assignments, worktree ownership, dependencies, and verification
  commands.

## Why Multi-Agent Now

Good parallel lanes:

- Brain V2 UI can proceed independently from Agent action coverage.
- Settings route-level control plane can proceed independently from Agent visual
  polish if shared API types are not changed.
- E2E/release matrix can be built mostly read-only after each lane stabilizes.
- Hire/Learn/Design can adapt V2 style in their own branches without blocking
  public V1 surfaces.

Bad parallel lanes:

- Two agents editing `src/lib/api.ts`.
- Two agents editing `src/app/components/settings/SettingsPage.tsx`.
- Two agents editing Agent composer/rail/chrome at the same time.
- Branches that all rebuild shared V2 primitives differently.

The orchestrator owns shared contracts and final merges.

## Workstream Ownership

### W0 - Orchestrator / Integration

Owner: this Codex thread.

Scope:

- Maintain `AGENTS.md`, this plan, and the Nullalis config map.
- Keep branch/worktree model clean.
- Review worker diffs before merge.
- Resolve shared code conflicts.
- Run final verification matrix.
- Decide product visibility copy.

Do not delegate final merge judgment.

### W1 - Agent Closeout

Branch suggestion: `codex/v2-agent-closeout`

Scope:

- Agent V6 visual parity.
- Composer input parity and popup polish.
- Narration, reasoning summary, tool calls, approvals, artifacts, trace,
  extension/browser states.
- Button-by-button wiring audit.
- Desktop/mobile visual QA.

Primary files:

- `src/app/components/ChatArea.tsx`
- `src/app/components/InputArea.tsx`
- `src/app/components/chat/AgentInspectorRail.tsx`
- `src/app/components/chat/NullalisRuntimeWidgets.tsx`
- `src/app/components/agent/*`
- `src/lib/api.ts` only if required and coordinated.

### W2 - Brain V2

Branch suggestion: `codex/v2-brain-closeout`

Scope:

- V2 Brain parity with design files.
- Graph-first canvas, filters, timeline, communities, orphans, detail,
  compose-from-selection, mobile behavior.
- Memory governance actions where BFF contracts exist.

Primary files:

- Brain route/components under `src/app/components`
- Brain API wrappers in `src/lib/api.ts` only if coordinated.

### W3 - Settings Control Plane

Branch suggestion: `codex/v2-settings-control-plane`

Scope:

- Route-level `/settings` as canonical control plane.
- Channels, Secrets, Models & Providers, Browser Extension & Devices,
  Memory & Brain, Developer Access, Privacy & Data.
- Remove/soft-deprecate V1 Agent settings sheet ownership.
- Keep unsupported capabilities read-only, gated, or hidden.

Primary files:

- `src/app/components/settings/SettingsPage.tsx`
- `src/app/components/sidebar/SettingsModal.tsx`
- `src/lib/api.ts`
- `backend/src/agent-bff-contract.js`
- `backend/src/index.js`

### W4 - Learning Beta Surface

Branch suggestion: `codex/v2-learning-closeout`

Scope:

- Keep Learning private beta.
- Align Learning surface and settings with V2 product chrome.
- Verify central meter/entitlement contract and local engine readiness.
- Preserve Learning memory distinction from Agent memory and Brain.

Primary files:

- Learning route/components.
- Learning quota/BFF files only if coordinated.

### W5 - Design Waitlist Surface

Branch suggestion: `codex/v2-design-waitlist`

Scope:

- Add a truthful coming-soon/waitlist product surface.
- Keep Design gated until backend/product contracts exist.
- Match V2 visual language without implying general availability.

### W6 - Hire Beta Surface

Branch suggestion: `codex/v2-hire-closeout`

Scope:

- Keep Hire private beta.
- Align with the central product registry and meter contract.
- Do not merge Hire branch work into public app until orchestrator review.

Existing worktree:

- `/Users/nova/Desktop/zaki-prod-hire` on `codex/zaki-hire`

### W7 - Hidden Operator Control Plane

Branch suggestion: `codex/v2-operator-control-plane`

Scope:

- Expand the existing internal admin surface into a hidden operator page.
- Full access must be limited to `as@novanuggets.com` through the backend
  super-admin guard.
- Do not show the operator page in normal product navigation.
- Operator page can summarize product states, meters, beta access, telemetry,
  access codes, admin users, waitlist, and health where backend routes exist.

Primary files:

- `src/app/components/admin/AdminAccessCodesPage.tsx`
- `src/routes.tsx`
- `src/lib/api.ts`
- `backend/src/index.js` only if guard gaps are found.

### W8 - Release E2E / QA Matrix

Branch suggestion: `codex/v2-release-e2e`

Scope:

- Signed-in Playwright flow for `/`, `/agent`, `/brain`, `/settings`.
- Gateway-up local smoke.
- Failure states.
- Desktop and mobile screenshots.
- Public visibility assertions: Agent/Chat/Brain public; Learn/Hire beta;
  Design waitlist.

Primary files:

- Existing test harnesses.
- New E2E docs/scripts/tests.

## Merge Order

1. W1 Agent Closeout into orchestrator branch.
2. W2 Brain V2 into orchestrator branch.
3. W3 Settings Control Plane into orchestrator branch.
4. W4 Learning Beta into orchestrator branch after product gating is confirmed.
5. W5 Design Waitlist into orchestrator branch.
6. W6 Hire Beta into orchestrator branch after Hire branch review.
7. W7 Hidden Operator Control Plane.
8. W8 Release E2E after surfaces settle.

If two branches touch `src/lib/api.ts`, merge the branch with the smallest API
delta first, then rebase/adapt the other manually.

## Required Review Checklist

For each worker branch:

- `git status --short --branch`
- `git diff --stat`
- `git diff --check`
- Focused unit tests.
- `npm run typecheck`
- `npm run build`
- Visual screenshots for changed UI.
- Manual smoke notes for live local gateway if route behavior changed.

## Prompt - Agent Closeout Worker

Copy/paste:

```text
You are the ZAKI Agent V2 closeout worker. Work in your own branch/worktree only.

Repository: /Users/nova/Desktop/zaki-prod
Create or use branch: codex/v2-agent-closeout

Read first:
- AGENTS.md
- docs/multi-agent-finalization-plan-2026-05-30.md
- docs/nullalis-user-config-surface-map-2026-05-30.md
- docs/zaki-v2-surface-activation-inventory-2026-05-30.md
- docs/agent-v6-parity-contract.md
- /Users/nova/Desktop/nullalis/docs/ui-handoff.md
- /Users/nova/Desktop/nullalis/docs/online-agent-contract.md
- /Users/nova/Desktop/nullalis/docs/extension-ws-contract.md
- /Users/nova/Desktop/ZAKI Design System/v2/V2 Agent v6.html
- /Users/nova/Desktop/ZAKI Design System/v2/V2 Agent · Mobile.html

Goal:
Finish /agent as an S-tier V2 production workbench. Preserve backend contracts. Make the UI visually and behaviorally align with V2 Agent v6 and the code truth.

Scope:
- Agent chrome, session rail, conversation, composer, + menu, right panel, narration, tool calls, approvals, artifacts, trace, browser/extension states.
- Audit every visible Agent button/control for backend wiring: mode, autonomy, reasoning, approval approve/deny, cancel, attachments, cron, artifacts, traces, extension status.
- Do not implement the final model-picker strategy beyond existing selected_model surfaces unless orchestrator asks.
- Do not move global settings; only deep-link to Settings where needed.

Deliverables:
- Focused code changes.
- Tests for changed controls.
- Desktop 1440x1000 and mobile 390x844 screenshots.
- Report: changed files, tests run, remaining gaps, any backend/BFF blockers.

Verification:
npm test -- --runInBand src/app/components/ChatArea.test.tsx src/app/components/InputArea.test.tsx src/app/components/chat/AgentInspectorRail.test.tsx src/app/components/chat/NullalisRuntimeWidgets.test.tsx
npm run typecheck
npm run build
git diff --check
```

## Prompt - Settings Control Plane Worker

Copy/paste:

```text
You are the ZAKI Settings V2 control-plane worker. Work in your own branch/worktree only.

Repository: /Users/nova/Desktop/zaki-prod
Create or use branch: codex/v2-settings-control-plane

Read first:
- AGENTS.md
- docs/multi-agent-finalization-plan-2026-05-30.md
- docs/nullalis-user-config-surface-map-2026-05-30.md
- docs/zaki-v2-surface-activation-inventory-2026-05-30.md
- docs/zaki-v2-dashboard-settings-operator-contract.md
- /Users/nova/Desktop/nullalis/docs/config-authority-map.md
- /Users/nova/Desktop/nullalis/docs/state-secrets-wiring.md
- /Users/nova/Desktop/nullalis/docs/ui-handoff.md
- /Users/nova/Desktop/ZAKI Design System/v2/V2 Settings.html

Goal:
Make /settings the canonical MECE control plane for ZAKI commercial V1.

Scope:
- Sections: Account & Security, Billing & Usage, Products & Access, Connections, Channels, Secrets & API Keys, Models & Providers, Browser Extension & Devices, Memory & Brain, Developer Access, Privacy & Data.
- Bind only real BFF/backend routes. Unsupported provider/OpenAPI connector/BYOK actions must be read-only, gated, or hidden.
- Move product-global Telegram/secrets/browser extension ownership out of Agent sheet conceptually; Agent can keep deep links only.
- Secrets must be metadata-only after save. Never show saved values.
- Include Nullalis truth gap note: OpenAPI ProductSettings schema is stale for autonomy/dream/query_expansion/selected_model. Do not block UI if ZAKI BFF already supports them.

Deliverables:
- Settings UI/code/tests.
- Any BFF facades needed for already-shipped Nullalis routes, after coordinating shared API changes.
- Report: changed files, tests run, remaining unsupported capabilities, backend/BFF contracts still needed.

Verification:
npm test -- --runInBand src/app/components/settings/SettingsPage.test.tsx src/app/components/sidebar/SettingsModal.test.tsx src/lib/api.test.ts
npm --prefix backend test -- --runInBand backend/src/agent-bff-contract.test.js backend/src/bot-bff.test.js backend/src/nullalis-secrets.test.js
npm run typecheck
npm run build
git diff --check
```

## Prompt - Learning Beta Worker

Copy/paste:

```text
You are the ZAKI Learning beta surface worker. Work in your own branch/worktree only.

Repository: /Users/nova/Desktop/zaki-prod
Create or use branch: codex/v2-learning-closeout

Read first:
- AGENTS.md
- docs/multi-agent-finalization-plan-2026-05-30.md
- docs/nullalis-user-config-surface-map-2026-05-30.md
- docs/zaki-v2-surface-activation-inventory-2026-05-30.md
- /Users/nova/Desktop/ZAKI Design System/v2/

Goal:
Make Learning truthful, private-beta, V2-aligned, and centrally metered.

Scope:
- Preserve Learning memory as product-specific memory, distinct from Agent memory and Brain governance.
- Ensure product gating, plan/meter usage, and beta copy come from central contracts.
- Do not expose Learning as generally available.
- Keep backend contract changes coordinated with the orchestrator.

Deliverables:
- Focused UI/code/tests.
- Report: changed files, tests run, product-gating status, remaining backend blockers.

Verification:
npm test -- --runInBand <learning-related tests>
npm --prefix backend test -- --runInBand backend/src/learning-quota.test.js
npm run typecheck
npm run build
git diff --check
```

## Prompt - Design Waitlist Worker

Copy/paste:

```text
You are the ZAKI Design waitlist surface worker. Work in your own branch/worktree only.

Repository: /Users/nova/Desktop/zaki-prod
Create or use branch: codex/v2-design-waitlist

Read first:
- AGENTS.md
- docs/multi-agent-finalization-plan-2026-05-30.md
- docs/zaki-v2-surface-activation-inventory-2026-05-30.md
- /Users/nova/Desktop/ZAKI Design System/v2/

Goal:
Create a V2-aligned coming-soon/waitlist surface for ZAKI Design without implying launch readiness.

Scope:
- Product tile, route placeholder, waitlist/early-access CTA if backend route exists.
- Keep product state and entitlement truthful.
- Do not invent Design runtime functionality.

Deliverables:
- Focused UI/code/tests.
- Report: changed files, tests run, what remains hidden.

Verification:
npm test -- --runInBand <design-related tests>
npm run typecheck
npm run build
git diff --check
```

## Prompt - Hire Beta Worker

Copy/paste:

```text
You are the ZAKI Hire beta surface worker. Work in the dedicated Hire worktree unless the orchestrator gives a new one.

Repository: /Users/nova/Desktop/zaki-prod-hire
Branch: codex/zaki-hire

Read first:
- AGENTS.md from the main app checkout if present
- docs/multi-agent-finalization-plan-2026-05-30.md from the main app checkout
- docs/nullalis-user-config-surface-map-2026-05-30.md from the main app checkout

Goal:
Make Hire V2-aligned, private-beta, and centrally metered without leaking beta functionality to public users.

Scope:
- Product surface and settings only where backend contracts exist.
- Central meter grant/receipt contract alignment.
- Product registry state is operational, not billing entitlement.
- Do not merge until orchestrator review.

Deliverables:
- Focused UI/code/tests.
- Report: changed files, tests run, metering contract status, remaining blockers.

Verification:
npm test -- --runInBand <hire-related tests>
npm run typecheck
npm run build
git diff --check
```

## Prompt - Hidden Operator Worker

Copy/paste:

```text
You are the ZAKI hidden operator control-plane worker. Work in your own branch/worktree only.

Repository: /Users/nova/Desktop/zaki-prod
Create or use branch: codex/v2-operator-control-plane

Read first:
- AGENTS.md
- docs/multi-agent-finalization-plan-2026-05-30.md
- docs/nullalis-user-config-surface-map-2026-05-30.md
- src/app/components/admin/AdminAccessCodesPage.tsx
- src/routes.tsx
- backend/src/index.js admin guard routes

Goal:
Expand the existing hidden internal admin page into a production operator page, accessible only to as@novanuggets.com.

Scope:
- Do not add normal navigation links.
- Enforce full access through the existing backend super-admin guard.
- Show only real backend-backed operator data: access codes, beta access, admin users, waitlist, telemetry, rate limits, health, product states, and meter diagnostics where routes exist.
- If a panel lacks a route, render it hidden or as operator backlog, not as fake data.

Deliverables:
- Focused UI/code/tests.
- Report: changed files, tests run, access-control proof, remaining operator gaps.

Verification:
npm test -- --runInBand <admin/operator tests> src/lib/api.test.ts
npm --prefix backend test -- --runInBand <admin guard tests>
npm run typecheck
npm run build
git diff --check
```

## Prompt - Brain V2 Worker

Copy/paste:

```text
You are the ZAKI Brain V2 closeout worker. Work in your own branch/worktree only.

Repository: /Users/nova/Desktop/zaki-prod
Create or use branch: codex/v2-brain-closeout

Read first:
- AGENTS.md
- docs/multi-agent-finalization-plan-2026-05-30.md
- docs/nullalis-user-config-surface-map-2026-05-30.md
- docs/zaki-v2-surface-activation-inventory-2026-05-30.md
- docs/zaki-prod-brain-data-truth-2026-05-08.md
- /Users/nova/Desktop/nullalis/docs/ui-handoff.md section 2.2 and Brain/memory sections
- /Users/nova/Desktop/ZAKI Design System/v2/V2 Brain.html
- /Users/nova/Desktop/ZAKI Design System/v2/V2 Brain v2.html

Goal:
Finish /brain as the canonical user memory surface for ZAKI V1.

Scope:
- V2 visual parity: graph-first canvas, filters rail, detail panel, timeline/search, communities, orphans, mobile behavior.
- Preserve existing behavior: URL state, search debounce, filters, keyboard shortcuts, compose-from-selection.
- Add user-facing memory governance only where BFF contracts already exist. If forget/purge/export actions are not bridged, document the blocker.
- Keep Settings Memory & Brain section as a launchpad/deep-link, not a duplicate partial Brain.

Deliverables:
- Brain UI/code/tests.
- Desktop 1440x1000 and mobile 390x844 screenshots.
- Report: changed files, tests run, remaining BFF/backend blockers.

Verification:
npm test -- --runInBand <brain-related test files> src/lib/api.test.ts
npm run typecheck
npm run build
git diff --check
```

## Prompt - Release E2E Worker

Copy/paste:

```text
You are the ZAKI V1 release E2E and QA matrix worker. Work in your own branch/worktree only.

Repository: /Users/nova/Desktop/zaki-prod
Create or use branch: codex/v2-release-e2e

Read first:
- AGENTS.md
- docs/multi-agent-finalization-plan-2026-05-30.md
- docs/zaki-v2-surface-activation-inventory-2026-05-30.md
- /Users/nova/Desktop/nullalis/docs/operations/v1-readiness-report.md
- /Users/nova/Desktop/nullalis/docs/operations/verification-matrix.md

Goal:
Build the app-level proof that commercial V1 public surfaces are production-ready.

Scope:
- Signed-in test user flow for /, /agent, /brain, /settings.
- Gateway-up smoke for agent actions: chat stream, mode/autonomy/reasoning payload, cancel, approvals, attachments, artifacts, trace share, extension diagnostics, cron/jobs, brain graph/search/timeline/detail.
- Product visibility assertions: Agent/Chat/Brain public, Learn/Hire private beta, Design waitlist.
- Desktop 1440x1000 and mobile 390x844 screenshots.
- Failure-state checks for gateway unavailable and unsupported/gated products.

Deliverables:
- E2E tests or runbook scripts matching existing repo patterns.
- docs/zaki-v1-app-release-verification-2026-05-30.md with exact commands and expected results.
- Report: what is verified, what remains manual, blockers.

Verification:
npm test -- --runInBand <new/focused tests>
npm run typecheck
npm run build
git diff --check
```

## Immediate Next Slice

Do not start all implementation workers at once from the orchestrator checkout.

Recommended sequence:

1. Orchestrator reviews/stages the current in-progress V2/BFF changes or creates
   a clean integration checkpoint.
2. Start W1 Agent Closeout in a separate worktree.
3. Start W2 Brain V2 after Agent shared API ownership is stable.
4. Start W3 Settings after orchestrator locks `src/lib/api.ts` ownership.
5. Start Learning, Design, Hire, and Operator only after public Agent/Brain
   direction is stable, unless the work is read-only review.
6. Start W8 Release E2E after product surfaces have merge candidates.

## Current High-Priority Gaps

1. Agent UI closeout is close but not final.
2. Brain is not V2 complete.
3. Settings has the right route-level direction but needs deeper control-plane
   ownership.
4. Agent channel wiring now has Telegram/Slack/Discord/Email status and
   bindings in the orchestrator base. Telegram is the only direct
   connect/disconnect path; Slack/Discord/Email still need self-service
   connect/test/disconnect contracts before full launch.
5. Browser extension pairing/revocation is not yet user-productized.
6. Provider/BYOK/OpenAI-compatible API needs a real profile contract before UI
   create/test/delete.
7. Hidden operator page exists as an internal admin route, but it needs an
   expanded control-plane UX and explicit full-access guard validation for
   `as@novanuggets.com`.
8. Nullalis OpenAPI ProductSettings schema needs sync with code.
9. Memory governance needs user-facing forget, purge PII dry-run/apply, export,
   provenance, and Brain deep links.
10. App-level E2E is the remaining confidence gate after backend S1-S6.
