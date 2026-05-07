---
gsd_state_version: 1.0
milestone: learn
milestone_name: ZAKI Learn DeepTutor Parity
status: executing
last_updated: "2026-05-07"
last_activity: 2026-05-07
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 28
  completed_plans: 24
  percent: 86
---

# ZAKI Learn State

## Current Position

Phase: 05 Final Parity Audit And Release Gate
Plan: 05-01 Full upstream-vs-ZAKI feature matrix
Status: Phase 04 complete; Phase 05 starting
Last activity: 2026-05-07 - completed operator deployment readiness gate: super-admin deployment readiness endpoint, immutable ZAKI and learning-engine image checks, learning-engine mirror/source commit pinning, final-user setup runbook, route/function user-test plan, popup outside-click/Escape fix, full Learn parity E2E, typecheck, backend governance tests, and backend syntax checks passing.

## Locked Decisions

- Use `docs/zaki-learning-integration-spec.md` as product/security truth.
- Use `/Users/nova/Desktop/zaki-learning-engine` as upstream UI and backend capability reference.
- Do not invent a new Learn dashboard around upstream sections.
- Port/adapt upstream UI shape into ZAKI shell.
- Keep raw provider/model/API-key settings operator-managed.
- Keep all local commits local until explicit push approval.
- Treat `/api/learning/*` as the native ZAKI Learn product API; the downstream learning-engine `/api/v1/*` surface is an internal implementation contract.
- Use Together.ai as the cost-first Learn launch provider only through operator-managed routing; normal users must never receive provider keys or raw model controls.

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
- `/learn?view=space` Question Bank renders upstream-style Manage Categories, All, Bookmarked, Wrong Only, total count, and empty state; local category create/delete was browser-smoked and cleaned back to zero categories.
- `/learn?view=review` renders the same Question Bank surface directly.
- `/learn?view=quiz` renders the Quiz Generation chat capability with Custom/Mimic Paper, count, difficulty, type, and preference controls.
- E2E: every ZAKI Learn route now has route/function smoke coverage in `e2e/learning-parity.spec.ts`.
- UI: Learn composer Capability, Tools/Sources, and Space popups close on outside click and Escape without navigating away from Learn.
- BFF: `GET /api/internal/learning/deployment-readiness` reports paid-user deployment gates for central auth, learning config, tenant root, immutable image refs, source mirror pinning, retention, and DR readiness.

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
- 02-06: Backend security test pass.
- 03-01: Tutor chat and session parity.
- 03-02: Book/lesson reader and block action parity.
- 03-03: Quiz, review, question bank, weak-area loop parity.
- 03-04: Notebooks and save/export flows.
- 03-05: Deep research, deep solve, visualization, and math animation parity.
- 03-06: Source upload, image upload, browser folder upload, archive upload, and connector-ready seams.
- 04-01: Quota model and enforcement matrix.
- 04-02: Data deletion/export implementation and audit state.
- 04-03: Retention and cleanup policies.
- 04-04: Backup/restore drill and disaster recovery runbook.
- 04-05: Operator deployment checklist with immutable image tags.

## Next Command

Execute Phase 05 Plan 05-01: full upstream-vs-ZAKI feature matrix.
