# Plan: Settings Batch

Spec: `.planning/specs/2026-07-12-settings-batch.md`.

## Execution shape
One sub-agent, one worktree, serial commits. All three items share
SettingsPage.tsx + i18n files — no parallelism.

**Branch: `ux/settings-batch-2026-07`, created FROM `ux/dashboard-quick-wins-2026-07`
(commit e1745f1), NOT from main.** PR #66 is awaiting approval; this batch stacks
on it. Its PR (when the human authorizes one) will target main and auto-shrink
once #66 merges.

## Commit order
0. chore(planning): add settings-batch spec + plan
1. feat(settings): section rhythm — 44px section gaps, header bands, right rail, density (+chip demotion to tray)
2. feat(settings): info tooltips for meter/billing/PII labels (EN+AR)
3. feat(settings): reset-to-defaults for Agent tenant defaults (EN+AR)

## Verification (agent-run)
- typecheck, build, `git diff --check`
- Focused tests: SettingsPage/SettingsChannelsSection + new primitive
- en/ar parity check
- frontend-e2e is known-red on main — out of scope

## Orchestrator follow-up
- Two-pass review; visual verification signed-in via staging proxy (desktop +
  mobile, both themes); present to CEO for confirmation. **PR only after CEO
  confirms.**
