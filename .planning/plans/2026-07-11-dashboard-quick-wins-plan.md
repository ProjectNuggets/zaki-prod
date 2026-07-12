# Plan: Dashboard & Chrome Quick Wins

Spec: `.planning/specs/2026-07-11-dashboard-quick-wins.md` (governs behavior; this file governs execution only).

## Execution shape

**One sub-agent, one isolated worktree, serial commits.** Items 1–4 share
`ZakiDashboard.tsx`; items 3, 4, 5, 7 share `en.json`/`ar.json`. Parallel agents
would collide on those files, so parallelism buys nothing here.

Branch: `ux/dashboard-quick-wins-2026-07` off current `main` (0703062).

## Commit order (one atomic commit per line)

0. chore(planning): add spec + plan artifacts
1. fix(dashboard): sticky status strip
2. fix(dashboard): usage meter line no longer overlaps
3. feat(dashboard): trim hero eyebrow + tighten subtitle (EN+AR)
4. fix(dashboard): meter-lock panel copy via i18n, no dash fallback (EN+AR)
5. feat(pricing): back affordance + fix access-code cutoff (EN+AR)
6. fix(settings): remove stray "+" and excess space above Products
7. feat(agent): rebind new-thread shortcut to ⌘⇧O with real handler
8. fix(chrome): render AppTopbar right cluster on spaces routes

Ordering rationale: dashboard items first (same file, rebase-free), then
independent surfaces, then the cross-cutting topbar change last (touches layout
most broadly).

## Verification (agent-run, per AGENTS.md §8)

- `npm run typecheck`, `npm run build`, `git diff --check`
- Focused tests: `AppTopbar.test.tsx` + any dashboard/meter/pricing tests touched
- en/ar key-set parity check for every i18n commit

## Orchestrator follow-up (not agent work)

- Visual verification with signed-in screenshots on the staging-proxied local
  dev server (orchestrator checkout), desktop + mobile, EN + AR
- Per-agent diff review, holistic PR review, open PR against main (no merge)
