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
  completed_plans: 7
  percent: 25
---

# ZAKI Learn State

## Current Position

Phase: 02 BFF Security And Multi-User Hardening
Plan: 02-06 Backend security test pass
Status: 02-05 complete; ready to execute 02-06
Last activity: 2026-05-07 - redacted user-visible knowledge provider and embedding labels and verified learning setting surfaces keep provider/model routing operator-managed.

## Locked Decisions

- Use `docs/zaki-learning-integration-spec.md` as product/security truth.
- Use `/Users/nova/Desktop/zaki-learning-engine` as upstream UI and backend capability reference.
- Do not invent a new Learn dashboard around upstream sections.
- Port/adapt upstream UI shape into ZAKI shell.
- Keep raw provider/model/API-key settings operator-managed.
- Keep all local commits local until explicit push approval.

## Recent Browser Truth

- `/learn?view=books` renders DeepTutor-style book library and `New book` opens creator flow.
- `/learn?view=workspaces` renders advanced workspace entry points for Deep Solve, Deep Research, Quiz Generation, Visualize, Math Animator, plus Image solve.
- Browser: Deep Research entry opens `/learn?view=chat&capability=deep_research` behavior inside the shared chat area with Sources, KB selector, Settings, Mode, and Depth controls visible.
- Browser: `/learn?view=solve`, `/learn?view=research`, `/learn?view=quiz`, `/learn?view=visualize`, and `/learn?view=math-animation` now open the matching chat capability directly.
- Browser: `/learn?view=chat`, `/tutorbot`, `/books`, `/knowledge`, `/writer`, `/space`, `/workspaces`, `/solve`, `/research`, `/quiz`, `/visualize`, and `/math-animation` passed route truth checks with no DeepTutor branding and no learning-disabled blocker.
- BFF: Learning JSON mutation proxy routes sanitize request bodies before forwarding.
- BFF: Learning payload sanitizer strips snake_case, camelCase, and mixed-case provider/model/API-key/base URL variants recursively.
- BFF: Raw learning uploads use a byte-counting stream limiter before proxying, including chunked requests without `Content-Length`.
- BFF: Learning WebSocket JSON messages are strict-root allowlisted and recursively sanitized before quota checks and upstream forwarding.
- UI: Generated interactive HTML blocks render with script-disabled sandbox, restrictive CSP, and sanitizer coverage.
- UI: User-facing learning settings expose behavior/source/tutor/content settings only; provider/model infrastructure labels are redacted.
- `/learn?view=chat` currently shows chat shell but backend WebSocket connection can fail when local learning engine/backend is unavailable.
- `/learn?view=writer` renders the Co-Writer document list; local browser creation is currently blocked by "Learning is not enabled for this environment", so full editor live navigation needs recheck once the learning backend is enabled.
- `/learn?view=space` renders Space mini-nav, Chat History, Memory tabs, and Skills editor controls in-browser.
- `/learn?view=tutorbot` can create a temporary TutorBot, open the full ZAKI Learn chat surface, connect over authenticated WebSocket, send a message, receive upstream error payloads, and delete the temporary bot. Current local provider/model routing returns `404`, which is operator configuration outside the user surface.

## Completed Plans

- 01-01: Route parity manifest and browser audit.
- 01-02: Sources/Knowledge page shape.
- 01-03: Co-Writer page shape.
- 01-04: Space page sections.
- 01-05: TutorBot management and chat surfaces.
- 01-06: Advanced workspace entry points.
- 01-07: Browser parity verification and UI code review.
- 02-01: Mutation proxy sanitization.
- 02-02: Raw upload byte limits.
- 02-03: WebSocket schema and quota hardening.
- 02-04: Generated HTML renderer safety.
- 02-05: User/operator settings split.

## Next Command

Execute Phase 02 Plan 02-06: backend security test pass.
