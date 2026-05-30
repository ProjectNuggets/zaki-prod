# Agent 1 Merge Handoff

Date: 2026-05-30
Source branch: `codex/v2-agent-closeout`
Target branch: `codex/zaki-prod-finalization`
Source commit: `e4a2e21 feat: activate launch Agent channels`

## Status

Agent 1 reports the Agent UI surface is done and green. The branch was not a
clean merge because the integration branch already had the orchestration docs
commits, while Agent 1 had one unmerged source commit.

The orchestrator integrated the source/test portion of `e4a2e21` manually and
excluded committed `dist/` build artifacts. The divergent documentation edits
from the Agent branch were not taken verbatim because the integration branch now
has the newer activation map and execution board.

## Integrated Files

- `backend/src/index.js`
- `backend/src/agent-bff-contract.js`
- `backend/src/agent-bff-contract.test.js`
- `src/lib/api.ts`
- `src/lib/api.test.ts`
- `src/app/components/settings/SettingsPage.tsx`
- `src/app/components/sidebar/SettingsModal.test.tsx`

## Deliberately Excluded

- `dist/*` build artifacts from `e4a2e21`
- Stale doc edits that conflicted with the orchestration docs:
  - `docs/multi-agent-finalization-plan-2026-05-30.md`
  - `docs/nullalis-user-config-surface-map-2026-05-30.md`

## Coordination Notes

- This change activates a launch-channel facade in ZAKI prod for Telegram,
  Slack, Discord, and Email status/bindings.
- Telegram remains the only channel with direct connect/disconnect in the
  current app contract.
- Slack, Discord, and Email bindings/status are useful now, but direct
  self-service connect/test/disconnect still depend on Agent 2 backend channel
  contracts.
- Settings ownership is now partially updated by Agent 1. Agent 4 should treat
  this integration as the base and avoid recreating a parallel channel model.

## Agent 1 Reported Verification

- Focused frontend: 4 suites / 59 tests passed.
- BFF focused: 2 suites / 44 tests passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- `git diff --check` passed.

## Orchestrator Verification Required

Before merging this integration onward, run:

```bash
npm test -- --runInBand src/app/components/ChatArea.test.tsx src/app/components/InputArea.test.tsx src/app/components/chat/AgentInspectorRail.test.tsx src/app/components/chat/NullalisRuntimeWidgets.test.tsx src/app/components/settings/SettingsPage.test.tsx src/app/components/sidebar/SettingsModal.test.tsx src/lib/api.test.ts
npm --prefix backend test -- --runInBand backend/src/agent-bff-contract.test.js backend/src/bot-bff.test.js
npm run typecheck
npm run build
git diff --check
```

## Deferred Items

- Attachment idempotency across `uploadAgentAttachment`, the BFF header forward,
  and contract tests.
- Channel direct test route for Slack/Discord/Email/WhatsApp.
- Cron run/runs endpoint completion if missing in UI or BFF.
- Memory-governance BFF routes.
- Extension device pairing/revocation contract.
