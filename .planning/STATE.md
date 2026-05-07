---
gsd_state_version: 1.0
milestone: learn
milestone_name: ZAKI Learn DeepTutor Parity
status: planning
last_updated: "2026-05-07"
last_activity: 2026-05-07
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 28
  completed_plans: 3
  percent: 11
---

# ZAKI Learn State

## Current Position

Phase: 01 Learn UI Parity And Route Truth
Plan: 01-04 Space page sections
Status: 01-03 complete; ready to execute 01-04
Last activity: 2026-05-07 - completed Co-Writer upstream-shape parity pass.

## Locked Decisions

- Use `docs/zaki-learning-integration-spec.md` as product/security truth.
- Use `/Users/nova/Desktop/zaki-learning-engine` as upstream UI and backend capability reference.
- Do not invent a new Learn dashboard around upstream sections.
- Port/adapt upstream UI shape into ZAKI shell.
- Keep raw provider/model/API-key settings operator-managed.
- Keep all local commits local until explicit push approval.

## Recent Browser Truth

- `/learn?view=books` renders DeepTutor-style book library and `New book` opens creator flow.
- `/learn?view=workspaces` now routes to Solve/Vision panel instead of falling back to Chat.
- `/learn?view=chat` currently shows chat shell but backend WebSocket connection can fail when local learning engine/backend is unavailable.
- `/learn?view=writer` renders the Co-Writer document list; local browser creation is currently blocked by "Learning is not enabled for this environment", so full editor live navigation needs recheck once the learning backend is enabled.

## Completed Plans

- 01-01: Route parity manifest and browser audit.
- 01-02: Sources/Knowledge page shape.
- 01-03: Co-Writer page shape.

## Next Command

Execute Phase 01 Plan 01-04: port/adapt Space page sections from upstream.
