# ZAKI Learn Parity Audit

Date: 2026-05-06

## Verdict

ZAKI Learn is now on the right architecture and the core DeepTutor chat contract
is wired: central ZAKI auth, tenant-bound downstream calls, unified chat
streaming, attachments, capabilities, Space context, history references, book
page references, notebook record references, question bank references, skills,
and memory.

It is not yet product-parity with the full local DeepTutor web app. Backend/API
coverage is broad. User-facing ZAKI coverage is still incomplete for several
rich workspaces, especially the full book reader/editor, Co-Writer editor,
solve/vision workbench, artifact viewers, utility Space pages, and production
governance.

Practical readiness: controlled internal beta after P0 below. Full production
parity after P0 and P1 are closed and verified against the local DeepTutor app.

## What Is On Par

- Auth path: browser -> ZAKI backend -> learning engine. Browser does not call
  the learning engine directly.
- Tenant binding: ZAKI forwards `X-Zaki-User-Id`; learning engine stores tenant
  data under hashed per-user roots.
- Internal service auth: ZAKI forwards `X-Internal-Token`; learning engine
  validates it for HTTP and WebSocket traffic.
- Operator-managed provider routing: HTTP tutor-agent payloads strip provider
  fields; knowledge provider query forwarding was removed; learning WebSocket
  messages now strip root-level provider/model fields before forwarding.
- Unified chat: ZAKI Learn can send DeepTutor-compatible turns with attachments,
  capability config, tools, knowledge bases, book references, notebook
  references, history references, question bank references, skills, and memory.
- Hosted-safe local folder handling: local linked folders remain excluded from
  hosted ZAKI production. Cloud folder connectors remain V1.1.

## Not Yet On Par

- Book workspace: ZAKI can create/list/open books and reference pages, but does
  not yet expose the full DeepTutor reader/editor experience: spine editor, page
  reader, block actions, page chat, deep dive, supplement, quiz attempts,
  progress timeline, and book health workflow.
- Co-Writer: backend routes are proxied, but ZAKI does not yet have the full
  document editor/workflow parity with DeepTutor's Co-Writer screens.
- Solve and vision: ZAKI has solve/vision entry points, but the dedicated
  workbench UX, session playback, and artifact handling are not fully ported.
- Math/visualize artifacts: the composer can request these capabilities, but
  ZAKI still needs first-class artifact rendering and history affordances.
- Space utility pages: notebooks, question bank, skills, memory, and chat
  history exist as DeepTutor utility pages; ZAKI currently has partial native
  panels and pickers, not full operational management screens.
- Settings: user-managed learning settings and operator-managed learning config
  are conceptually separated, but the final ZAKI settings surfaces and admin
  controls are not complete.
- Governance: quota, retention, export, account deletion, and disaster recovery
  gates from the integration spec are not implemented end to end.
- Tests: the port has type/build/smoke coverage, but lacks focused frontend
  tests for picker payloads, WebSocket sanitization, and parity workflows.

## Code Review Findings

1. P1: `LearningSpacePickerModal` fetches details for every listed book or
   notebook as soon as the picker opens. This is acceptable for small local test
   data, but production tenants with many books/notebooks will create a request
   burst and slow the picker. Move to an active-item/lazy-load model matching
   DeepTutor's book picker.

2. P1: WebSocket sanitization strips only root-level operator-managed fields.
   Current ZAKI client sends root-level chat payloads, so this blocks the known
   bypass. Before broad rollout, add tested recursive sanitization or an
   allowlist schema per learning WebSocket route so future nested config fields
   cannot reintroduce provider/model overrides.

3. P1: `LearningPage.tsx` is too large and now owns dashboard, chat, Space
   pickers, capability forms, panels, drawers, and tutorbot UI in one module.
   This increases regression risk. Split into `LearningChatPanel`,
   `LearningSpacePickerModal`, `LearningBookPanel`, and API-specific hooks before
   adding more parity UI.

4. P0: Production readiness gates are not complete: quotas, retention, export,
   account deletion, and backup/restore policy are still documented but not
   enforced.

## Backlog To Final Product

### P0 - Blockers Before Internal Beta

- Add automated tests for learning BFF auth, tenant header forwarding, blocked
  provider/model fields, and WebSocket payload sanitization.
- Add frontend tests for Space picker payloads:
  `history_references`, `book_references`, `notebook_references`,
  `question_notebook_references`, `skills`, and `memory_references`.
- Implement quotas before forwarding expensive learning requests: chat turns,
  solve, book generation, upload size/storage, external search, and artifact
  generation.
- Define and implement account deletion for learning tenant data, with audit
  status for async deletion.
- Add production health/readiness checks for learning engine dependency
  availability and config completeness.

### P1 - DeepTutor Product Parity

- Port full Book UI: library, reader, spine editor, block actions, page chat,
  deep dive, supplement, quiz attempt, rebuild, progress, and health.
- Port full Co-Writer UI: document editor, history, tool calls, automark,
  export, and saved document lifecycle.
- Port full Solve/Vision UX: solve sessions, image/document workflows, streamed
  progress, result review, and session reopen.
- Port artifact viewers for Math Animator and Visualize outputs.
- Build full Space management pages for chat history, notebooks, question bank,
  skills, and memory, using ZAKI labels and layout.
- Add save-to-notebook and save-to-Space workflows from chat outputs.

### P2 - Hosted ZAKI Polish

- Replace bulk picker detail loading with lazy loading and pagination.
- Add Google Drive or similar cloud-folder source linking as hosted-safe V1.1
  replacement for DeepTutor local linked folders.
- Add learning-specific usage analytics and operator dashboards.
- Add import/export for learning sessions, notebooks, books, and sources.
- Add release runbooks for learning engine mirror updates and ZAKI rollout.

## Readiness Definition

ZAKI Learn is "ready like DeepTutor" when:

- every DeepTutor learning-relevant user capability is reachable in ZAKI without
  DeepTutor branding,
- hosted-unsafe local folder behavior is replaced by safe cloud connector flows,
- users cannot set provider/model/API-key routing from the browser,
- all learning data is tenant-scoped and covered by deletion/export/retention,
- P0 and P1 tests pass in CI,
- a side-by-side smoke run confirms the same workflows work in local DeepTutor
  and in ZAKI Learn.
