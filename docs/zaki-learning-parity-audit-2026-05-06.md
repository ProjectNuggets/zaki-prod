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
  messages now use a tested root allowlist and recursively strip provider/model
  fields before forwarding.
- Learning quota gate: mutating learning BFF requests and learning WebSocket
  upgrades consume the `learning` quota surface before forwarding.
- Account export/delete: account export includes a learning snapshot when the
  learning engine is configured; account deletion enumerates and removes
  downstream learning resources before deleting the ZAKI account.
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
- Governance: quota, export, and deletion now have first-pass enforcement;
  storage caps, retention windows, backup restore, disaster recovery, and audit
  job visibility still need production completion.
- Tests: the port has type/build/smoke coverage, but lacks focused frontend
  tests for picker payloads, WebSocket sanitization, and parity workflows.

## Code Review Findings

1. Fixed: `LearningSpacePickerModal` was split out of `LearningPage.tsx` and now
   lazy-loads book pages/notebook records only for selected or expanded items.

2. Fixed: learning WebSocket client payloads now use a tested root allowlist and
   recursive operator-managed field stripping.

3. Partially fixed: `LearningPage.tsx` is smaller after extracting the Space
   picker. It still needs further splits for chat, books, Co-Writer, and
   TutorBot as product parity expands.

4. Partially fixed: learning quotas, export, and deletion have first-pass
   enforcement. Storage caps, retention windows, backup/restore, disaster
   recovery, and deletion audit visibility remain open production gates.

## Backlog To Final Product

### P0 - Blockers Before Internal Beta

- Add automated tests for learning BFF auth, tenant header forwarding, blocked
  provider/model fields, WebSocket payload sanitization, account export, and
  downstream deletion failure behavior.
- Add frontend tests for Space picker payloads:
  `history_references`, `book_references`, `notebook_references`,
  `question_notebook_references`, `skills`, and `memory_references`.
- Extend quotas beyond request counts: upload size/storage, generated artifact
  storage, external search, and per-plan capability gates.
- Add deletion/export audit status and operator-visible remediation for
  downstream learning cleanup failures.
- Define and implement retention windows, backup restore checks, and disaster
  recovery runbooks for learning tenant data.
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

- Add pagination to lazy-loaded picker detail lists where upstream supports it.
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
