# ZAKI Learning Integration Spec

Last updated: May 6, 2026

## Purpose

This document is the implementation target for bringing the learning engine into
ZAKI production as a first-class product area.

The learning engine repository is `ProjectNuggets/zaki-learning-engine`. It is a
private downstream service derived from DeepTutor. ZAKI production must not expose
that implementation detail, brand, internal service token, or direct API surface
to browser clients.

## Decision

ZAKI will use the learning engine as a backend capability provider and build a
ZAKI-native frontend.

We will not embed, iframe, or port the upstream Next.js frontend into production.
That frontend has its own routing, auth assumptions, app shell, settings model,
and direct browser-to-engine API base. ZAKI already owns central auth, billing,
Spaces, memory, Brain, agent mode, telemetry, and product navigation. The most
reliable integration is therefore:

```text
Browser
  -> ZAKI frontend
  -> ZAKI backend /api/learning/*
  -> zaki-learning-engine /api/v1/*
```

## Non-Negotiables

- Browser clients never call the learning engine directly.
- Browser clients never receive or send `X-Internal-Token`.
- ZAKI central auth is the only browser-facing user authentication.
- ZAKI backend derives the canonical user id from the authenticated session.
- ZAKI backend injects `X-Zaki-User-Id` and `X-Internal-Token` downstream.
- Learning data is tenant-bound by the authenticated ZAKI user id.
- Upstream learning-engine updates are mirrored into `upstream/main` first.
- ZAKI production changes live on the learning-engine `main` branch.
- Production images use immutable SHA tags, not `latest`.
- No user-facing production copy mentions DeepTutor.

## Source Code Truth

### ZAKI Production

- Frontend routes: `src/routes.tsx`
- Navigation state: `src/stores/navigationStore.ts`
- Existing authenticated API helpers: `src/lib/api.ts`
- Existing agent BFF pattern: `backend/src/agent-client.js`,
  `backend/src/agent-proxy-contract.js`, `backend/src/index.js`
- Existing auth middleware: `backend/src/require-auth-user.js`

### Learning Engine

- Production contract: `docs/zaki-production-contract.md`
- Internal auth/tenant middleware: `deeptutor/services/zaki_runtime.py`
- Tenant-aware paths: `deeptutor/services/path_service.py`
- Unified streaming: `deeptutor/api/routers/unified_ws.py`
- Sessions: `deeptutor/api/routers/sessions.py`
- Book/lesson engine: `deeptutor/api/routers/book.py`
- Knowledge bases: `deeptutor/api/routers/knowledge.py`
- Quiz/question notebook: `deeptutor/api/routers/question_notebook.py`
- Notebook: `deeptutor/api/routers/notebook.py`

## Product Goal

All upstream learning-engine capabilities should be available through ZAKI
surfaces over time as ZAKI-owned offerings, even when they overlap with existing
ZAKI product areas. Overlap is intentional: these capabilities can become
separate learning, writing, research, visualization, automation, or advanced
study offerings inside ZAKI.

- tutor chat
- source upload and RAG-backed study
- document, image, and mixed attachment upload
- browser folder upload where supported
- generated lessons/books
- lesson reader
- quizzes
- question review and follow-up tutoring
- notebooks/saved learning records
- progress and weak-area tracking
- learning from existing ZAKI Spaces
- co-writer workflows
- deep research
- deep solve
- visualization
- math animation
- tutorbot/managed tutor agents
- skill/tool selection where product-safe
- model/provider use through operator-controlled routing

Exceptions:

- raw provider/model settings remain operator-managed only
- local server filesystem folder linking is not exposed in hosted multi-user
  production; connector-backed folder linking, for example Google Drive, is
  targeted for V1.1

## Hosted ZAKI vs Local Learning-Engine Deployment

The hosted ZAKI product and a local learning-engine deployment have different
trust boundaries.

Local deployment can reasonably support local machine workflows such as linking
a filesystem folder, because the user and server are usually the same operator.

Hosted ZAKI cannot expose arbitrary server-local folder paths to users. In hosted
multi-user production, equivalent workflows must use one of these patterns:

- browser file upload
- browser folder upload using `webkitdirectory` where supported
- drag-and-drop folder upload where browser support allows it
- zipped folder upload with server-side safe extraction
- connector-backed folder linking, for example Google Drive, OneDrive, or
  SharePoint

No upload feature should be dropped. The adaptation is about the safe transport
and trust boundary, not about removing capability.

## Product Shape

Learning becomes a first-class ZAKI area and the anchor for related upstream
capabilities:

- Route: `/learn`
- Sidebar mode: `learning`
- Main surfaces:
  - learning dashboard
  - tutor session
  - source library
  - lesson/book reader
  - quiz/review
  - saved notes/notebooks
  - progress/weak areas
  - co-writer
  - research workspace
  - solve workspace
  - visualization workspace
  - math animation workspace
  - managed tutor agents

Learning should feel like ZAKI, not like a separate product. Use the existing
ZAKI shell, sidebar, typography, theme, auth, toasts, error states, telemetry,
and query conventions.

## Capability Map

| Capability | Learning-engine source | ZAKI production surface |
| --- | --- | --- |
| Tutor chat | `/api/v1/ws`, `/api/v1/sessions` | `/learn/session/:id` |
| Session list/history | `/api/v1/sessions` | Learning dashboard and sidebar rail |
| Source upload/RAG | `/api/v1/knowledge/*` | Source library and Space-to-learn action |
| Generated lessons/books | `/api/v1/book/books*` | Lesson builder and reader |
| Book progress | `/api/v1/book/books/:id`, `/api/v1/book/ws` | Progress timeline and lesson status |
| Quiz generation | unified WS capability `deep_question` | Quiz builder inside session/lesson |
| Quiz attempts | `/api/v1/book/quiz-attempt`, `/api/v1/sessions/:id/quiz-results` | Quiz viewer and progress |
| Question bank | `/api/v1/question-notebook/*` | Review page and weak-area loop |
| Notebooks | `/api/v1/notebook/*` | Saved notes/learning records |
| Memory | `/api/v1/memory` | Controlled ZAKI memory writes only |
| Co-writer | `/api/v1/co_writer/*` | ZAKI learning/writing workspace |
| Deep research | unified WS capability `deep_research` | Research workspace |
| Deep solve | unified WS capability `deep_solve` | Problem-solving workspace |
| Visualize | unified WS capability `visualize` | Visualization workspace |
| Math animator | unified WS capability `math_animator` | Math animation workspace |
| Tutorbot | `/api/v1/tutorbot/*` | Managed tutor agents and channel-ready automations |
| Settings | `/api/v1/settings/*` | Split into user and operator planes |
| Skills/tools | `/api/v1/skills/*`, runtime config | Operator curated, optional user toggles |

## Settings Split

Learning settings must be separated into two planes.

### User-Managed Settings

User-managed settings are safe preferences that affect the user's learning
experience without changing platform security, cost controls, external
dependencies, or provider routing.

Examples:

- preferred language
- tutor tone
- difficulty level
- target level
- quiz question count defaults
- quiz style preference
- lesson length preference
- source selection per session
- whether to include citations where available
- learning reminders if ZAKI later supports them
- saved notebooks/categories
- bookmarked lessons/questions
- local dashboard layout preferences

Frontend route:

- `/learn/settings`

BFF route family:

- `GET /api/learning/me/settings`
- `PATCH /api/learning/me/settings`

Policy:

- user settings are tenant-scoped
- values are validated by ZAKI backend before forwarding or storing
- user settings cannot contain provider secrets or model ids unless those ids
  are selected from an operator-approved catalog

### Operator-Managed Settings

Operator-managed settings control runtime behavior, security, external systems,
cost, and platform reliability.

Examples:

- learning engine base URL
- internal service token
- model routing policy
- allowed model catalog
- provider credentials
- embedding provider
- RAG provider defaults
- web search providers and API keys
- external dependency enablement
- upload size limits
- accepted file types
- image/document/folder upload policy
- cloud connector enablement
- rate limits and concurrency limits
- billing/quota mapping
- public output policy
- CORS/origin policy
- feature flags
- rollout cohorts
- retention policy
- backup/restore policy
- image tag pinning

Operator values are set by environment, Helm/Kubernetes secrets, database-backed
admin config, or an internal admin surface. They are not editable by normal users.

BFF/admin route family, if needed:

- `GET /api/internal/learning/status`
- `GET /api/internal/learning/config`
- `PATCH /api/internal/learning/config`

Policy:

- never return secrets
- show redacted provider/config state only
- require admin/operator auth
- audit every operator mutation
- fail closed when required operator config is missing

## Backend BFF Contract

Add a ZAKI backend BFF module for learning.

Required files:

- `backend/src/learning-client.js`
- `backend/src/learning-bff-contract.js`
- `backend/src/learning-bff-contract.test.js`
- route registration in `backend/src/index.js`

Required environment:

- `LEARNING_ENGINE_BASE_URL`
- `LEARNING_ENGINE_INTERNAL_TOKEN`
- `LEARNING_ENGINE_REQUEST_TIMEOUT_MS`
- `LEARNING_ENGINE_STREAM_TIMEOUT_MS`
- `ZAKI_LEARNING_ENABLED`

Forwarded downstream headers:

- `X-Internal-Token`
- `X-Zaki-User-Id`
- `X-Request-Id`

Never forward:

- browser bearer token
- refresh cookie
- raw user email as identity
- arbitrary client-supplied internal headers

### Initial BFF Routes

Health and readiness:

- `GET /api/learning/health`
- `GET /api/internal/learning/status`

Sessions:

- `GET /api/learning/sessions`
- `GET /api/learning/sessions/:sessionId`
- `PATCH /api/learning/sessions/:sessionId`
- `DELETE /api/learning/sessions/:sessionId`
- `POST /api/learning/sessions/:sessionId/quiz-results`

Unified tutor stream:

- WebSocket `/api/learning/ws`

Books/lessons:

- `GET /api/learning/books`
- `POST /api/learning/books`
- `GET /api/learning/books/:bookId`
- `DELETE /api/learning/books/:bookId`
- `GET /api/learning/books/:bookId/pages/:pageId`
- `POST /api/learning/books/confirm-proposal`
- `POST /api/learning/books/confirm-spine`
- `POST /api/learning/books/compile-page`
- `POST /api/learning/books/regenerate-block`
- `POST /api/learning/books/insert-block`
- `POST /api/learning/books/delete-block`
- `POST /api/learning/books/move-block`
- `POST /api/learning/books/change-block-type`
- `POST /api/learning/books/deep-dive`
- `POST /api/learning/books/quiz-attempt`
- `POST /api/learning/books/supplement`
- `POST /api/learning/books/page-chat-session`
- `POST /api/learning/books/rebuild`
- WebSocket `/api/learning/book/ws`

Knowledge:

- `GET /api/learning/knowledge/supported-file-types`
- `GET /api/learning/knowledge/list`
- `POST /api/learning/knowledge/create`
- `GET /api/learning/knowledge/:kbName`
- `POST /api/learning/knowledge/:kbName/upload`
- `POST /api/learning/knowledge/:kbName/upload-folder`
- `POST /api/learning/knowledge/:kbName/upload-archive`
- `DELETE /api/learning/knowledge/:kbName`
- `POST /api/learning/knowledge/:kbName/reindex`
- `GET /api/learning/knowledge/:kbName/progress`

Connector-backed folder linking, V1.1:

- `GET /api/learning/connectors`
- `POST /api/learning/knowledge/:kbName/connectors/google-drive/link`
- `POST /api/learning/knowledge/:kbName/connectors/google-drive/sync`
- `DELETE /api/learning/knowledge/:kbName/connectors/google-drive/:linkId`

Hosted production must not expose upstream local filesystem folder linking.

Question bank:

- `GET /api/learning/questions/entries`
- `POST /api/learning/questions/entries/upsert`
- `GET /api/learning/questions/entries/lookup/by-question`
- `PATCH /api/learning/questions/entries/:entryId`
- `DELETE /api/learning/questions/entries/:entryId`
- `GET /api/learning/questions/categories`
- `POST /api/learning/questions/categories`
- `PATCH /api/learning/questions/categories/:categoryId`
- `DELETE /api/learning/questions/categories/:categoryId`

Notebooks:

- `GET /api/learning/notebooks`
- `POST /api/learning/notebooks`
- `GET /api/learning/notebooks/:notebookId`
- `PUT /api/learning/notebooks/:notebookId`
- `DELETE /api/learning/notebooks/:notebookId`
- record add/update/delete routes as needed

Co-writer:

- `GET /api/learning/co-writer/documents`
- `POST /api/learning/co-writer/documents`
- `GET /api/learning/co-writer/documents/:documentId`
- `PATCH /api/learning/co-writer/documents/:documentId`
- `DELETE /api/learning/co-writer/documents/:documentId`
- stream/edit routes as needed behind the same BFF contract

Managed tutor agents:

- `GET /api/learning/tutor-agents`
- `POST /api/learning/tutor-agents`
- `GET /api/learning/tutor-agents/:agentId`
- `PATCH /api/learning/tutor-agents/:agentId`
- `DELETE /api/learning/tutor-agents/:agentId`
- channel configuration routes only after operator approval and quota policy

Advanced capability workspaces:

- `POST /api/learning/research/sessions`
- `GET /api/learning/research/sessions/:sessionId`
- `POST /api/learning/solve/sessions`
- `GET /api/learning/solve/sessions/:sessionId`
- `POST /api/learning/visualizations`
- `GET /api/learning/visualizations/:artifactId`
- `POST /api/learning/math-animations`
- `GET /api/learning/math-animations/:artifactId`

These routes may internally use the unified WebSocket capability contract, but
the ZAKI product surface should have named BFF entry points for entitlement,
quota, telemetry, and UX clarity.

## WebSocket Proxy Requirements

ZAKI backend must own browser WebSocket access.

Browser connects to:

```text
/api/learning/ws
```

ZAKI backend connects upstream to:

```text
${LEARNING_ENGINE_BASE_URL}/api/v1/ws
```

The backend must:

- authenticate the browser before upgrade
- derive canonical ZAKI user id
- inject internal downstream headers
- reject unauthenticated upgrades
- reject if learning feature is disabled
- limit message size
- enforce idle timeout
- close upstream when browser closes
- close browser when upstream closes
- not log message content by default
- include request id in structured logs

## Frontend Contract

Required files:

- `src/lib/learningApi.ts`
- `src/queries/useLearningSessions.ts`
- `src/queries/useLearningBooks.ts`
- `src/queries/useLearningKnowledge.ts`
- `src/queries/useLearningQuestions.ts`
- `src/app/components/learning/LearningPage.tsx`
- `src/app/components/learning/LearningDashboard.tsx`
- `src/app/components/learning/LearningSessionView.tsx`
- `src/app/components/learning/LearningBookReader.tsx`
- `src/app/components/learning/LearningQuizView.tsx`
- `src/app/components/learning/LearningSourcesPanel.tsx`
- `src/app/components/learning/LearningSettingsPage.tsx`

Navigation:

- extend `SidebarMode` with `learning`
- add `/learn`
- add `/learn/sessions/:sessionId`
- add `/learn/books/:bookId`
- add `/learn/books/:bookId/pages/:pageId`
- add `/learn/settings`

Feature flag:

- `VITE_ZAKI_LEARNING_ENABLED`

Frontend API rule:

- use ZAKI backend helpers from `src/lib/api.ts`
- do not use learning-engine `NEXT_PUBLIC_API_BASE` logic
- do not copy upstream frontend direct-fetch patterns

## ZAKI UX Requirements

Learning must use ZAKI-native design:

- existing shell and sidebar
- existing auth/loading behavior
- existing error/toast conventions
- existing theme and typography
- existing mobile header behavior
- existing i18n structure
- lucide icons where appropriate
- no DeepTutor branding or copy

Initial dashboard should show:

- active tutor sessions
- current lessons/books
- source library status
- recent quiz performance
- weak areas
- next recommended action

Tutor session should show:

- conversation stream
- selected sources
- capability/status trail where useful
- generated quiz cards
- follow-up question panel
- save-to-notebook action

Lesson reader should show:

- page outline
- generated content blocks
- source anchors/citations where available
- quiz blocks
- progress state
- deep-dive/supplement actions

## Spaces Integration

Spaces are the bridge from existing ZAKI work to learning.

Required actions:

- "Study this Space"
- "Create lesson from Space files"
- "Quiz me from this Space"
- "Save learning output to Space"

Rules:

- Space files are not blindly copied to the learning engine.
- ZAKI backend creates or maps a tenant-scoped learning knowledge base.
- The user chooses which Space files are included.
- File type and size limits are enforced before forwarding.
- Learning outputs can link back to Spaces, but source data remains scoped to
  the authenticated user.

## Brain and Memory Integration

Learning must not dump raw study traces into ZAKI memory.

Allowed durable memory candidates:

- stable user learning preferences
- long-term goals
- confirmed weak areas
- confirmed mastery signals
- explicitly saved notes

Not allowed by default:

- every quiz answer
- raw lesson pages
- full tutor transcripts
- temporary confusion during one session
- sensitive source excerpts

Memory writes should use the existing ZAKI memory policy flow. When uncertain,
prefer review/confirmation over automatic save.

## Billing and Quota

Learning uses a separate `learning` quota surface. It is not counted under
`zaki_bot` because Learn has different cost drivers: uploads, source indexing,
generated books, notebooks, research, solve, visualization, and tutor agents.

All learning-relevant hosted capabilities remain available to users unless the
capability is unsafe for SaaS. Limits scale by ZAKI entitlement tier. Provider,
model, API-key, base URL, and external dependency settings remain
operator-managed.

Initial hosted quota matrix:

| Dimension | Free | Student | Personal / access code | State |
| --- | ---: | ---: | ---: | --- |
| Daily prompt/mutating turns | Runtime setting | Runtime setting | Runtime setting | Enforced |
| Max learning request/upload bytes | 25 MB | 100 MB | 100 MB | Enforced |
| Max files per request | 20 | 100 | 250 | Surfaced; parser-level counter next |
| Image upload | Enabled | Enabled | Enabled | Enforced by route availability |
| Browser folder upload | Enabled | Enabled | Enabled | Enforced by route availability |
| Archive upload | Enabled | Enabled | Enabled | Enforced by route availability |
| Cloud folder connectors | V1.1 | V1.1 | V1.1 | Not hosted in V1 |
| Tenant source storage | 250 MB | 2 GB | 10 GB | Planned |
| Artifact storage | 100 MB | 1 GB | 5 GB | Planned |
| Generated books/day | 1 | 5 | 20 | Planned |
| External searches/day | 3 | 25 | 100 | Planned |
| Concurrent learning sessions | 1 | 3 | 5 | Planned |

Backend quota checks happen before forwarding to the learning engine. The BFF
first applies the operator global request cap, then applies the authenticated
plan-specific Learn cap.

## Data and Retention

Tenant data lives under the learning engine tenant root:

```text
${LEARNING_ENGINE_TENANT_DATA_ROOT}/user_<sha256-prefix>/
```

ZAKI must define:

- deletion behavior when a ZAKI account is deleted
- export behavior for learning sessions, notes, sources, and lessons
- retention for uploaded source files
- retention for generated artifacts
- backup and restore expectations
- disaster recovery procedure for tenant data

Account deletion must include learning data deletion or a documented async
deletion job with audit status.

ZAKI records learning export/delete governance events in
`zaki_learning_account_audit_events`. Audit rows store request ids, action,
status, non-PII subject hash, resource counts, deleted resource types, and error
counts. They must not copy exported source, notebook, lesson, memory, or tutor
content into the audit ledger. Account deletion records a `started` event before
destructive cleanup and records success or failure after the learning-engine
delete attempt.

## Operator Dependencies

The learning engine may require:

- LLM provider credentials
- embedding provider credentials
- RAG/index dependencies
- optional search provider credentials
- Python runtime dependencies
- writable tenant storage
- image generation or math animation dependencies if enabled later

Operator config must decide what is enabled. User settings only select from
operator-approved choices.

## Deployment Contract

Learning engine image:

```text
ghcr.io/projectnuggets/zaki-learning-engine:<immutable-sha-tag>
```

Required learning engine env:

- `LEARNING_ENGINE_INTERNAL_AUTH_REQUIRED=true`
- `LEARNING_ENGINE_INTERNAL_TOKEN`
- `LEARNING_ENGINE_TENANT_DATA_ROOT=/data/users`

Required ZAKI backend env:

- `LEARNING_ENGINE_BASE_URL`
- `LEARNING_ENGINE_INTERNAL_TOKEN`
- `ZAKI_LEARNING_ENABLED`

Rollout sequence:

1. deploy learning engine private service
2. verify `/healthz` and `/readyz`
3. configure ZAKI backend env
4. deploy BFF routes with frontend flag off
5. run backend smoke tests
6. enable internal/operator cohort
7. enable frontend flag for limited cohort
8. monitor usage, errors, storage, and cost
9. expand rollout

## Test Gate

Backend tests:

- learning client injects internal headers
- client strips untrusted browser internal headers
- auth required on every user route
- canonical user id is forwarded
- missing operator config fails closed
- disabled feature returns stable error
- upstream 401/403/404/5xx map to stable ZAKI errors
- WebSocket proxy authenticates before upgrade
- WebSocket proxy closes both sides correctly
- upload limits enforced before forwarding

Learning engine tests:

- internal auth rejects missing token
- tenant data separates two users
- `/healthz`, `/readyz`, `/livez` remain unauthenticated
- startup config caveat remains covered
- session/book/knowledge paths resolve inside tenant root

Frontend tests:

- `/learn` hidden when flag disabled
- auth hydration gates learning queries
- no direct learning-engine URL is used
- dashboard empty/loading/error states
- session streaming renders events
- quiz answer flow records result
- user settings cannot edit operator settings

E2E smoke:

- login
- open `/learn`
- create source-backed tutor session
- upload small supported file
- ask tutor question
- generate quiz
- answer quiz
- save note
- reload and verify session persists
- verify another user cannot see the first user's data

## Migration Plan

This is additive. No existing ZAKI user path should break.

Phase 0: repository and image

- mirror upstream into `upstream/main`
- keep ZAKI adaptation on learning-engine `main`
- publish backend-only image
- document startup caveat and tenant contract

Phase 1: backend BFF foundation

- add learning client
- add auth-forwarding tests
- add health/session routes
- add WebSocket proxy
- ship with frontend flag off

Phase 2: minimal ZAKI frontend

- add `/learn`
- add dashboard
- add session list/detail
- add tutor WebSocket streaming
- add empty/error/loading states

Phase 3: source-backed study

- add knowledge upload/list
- add Space-to-learning mapping
- enforce upload limits
- add progress polling

Phase 4: lessons/books

- expose book create/list/detail
- build ZAKI-native lesson reader
- render core block types
- add compile/progress updates

Phase 5: quiz and review

- render quiz cards
- record quiz attempts
- expose question bank
- add follow-up tutor panel
- add weak-area dashboard

Phase 6: notebooks and memory integration

- add saved learning notes
- integrate controlled memory writes
- add export/delete flows

Phase 7: operator/admin hardening

- add internal status/config surface
- add metrics and alerts
- define quota billing policy
- finalize backup/retention runbooks

Phase 8: full upstream offering coverage

- add co-writer workspace
- add deep research workspace
- add deep solve workspace
- add visualization workspace
- add math animation workspace
- add managed tutor agents
- add connector-backed folder linking, starting with Google Drive if approved
- keep raw provider/model controls operator-managed

## Blind Spots and Risks

1. WebSocket proxy complexity
   The learning engine uses WebSockets for unified streaming and book progress.
   ZAKI backend must proxy upgrades securely and reliably.

2. Cost growth
   Book generation, RAG, quiz generation, and external search can become
   expensive. Quotas must be enforced before broad rollout.

3. Storage growth
   Per-user source uploads, indexes, generated lessons, and artifacts need
   quotas, cleanup, backup, and delete behavior.

4. File safety
   Document, image, folder, and archive uploads require strict validation, type
   limits, size limits, safe extraction, path traversal protection, malware-scan
   hooks where available, and safe output paths. Do not expose arbitrary
   generated files.

5. Provider dependency drift
   LLM, embedding, and search provider config must be operator-owned and tested
   at deploy time.

6. Upstream update drift
   Upstream can change route contracts. We need mirrored upstream branches,
   contract tests, and controlled merges into ZAKI adaptation.

7. Broad offering surface
   The engine includes chat, book, quiz, notebook, memory, skills, co-writer,
   search, tutorbot, visualization, and math animation. ZAKI should expose all
   of them as ZAKI-owned offerings over phased releases, with feature flags,
   quotas, and operator-owned dependency controls.

8. Identity parity
   Learning engine tenancy depends on canonical ZAKI user id. Production must
   preserve that id as the stable tenant key.

9. Memory pollution
   Learning activity can produce noisy signals. Only durable, user-relevant
   insights should enter ZAKI memory.

10. UX fragmentation
   Copying upstream UI would fragment the product. The ZAKI-native frontend is
   mandatory for consistency and long-term maintainability.

## Open Decisions

- Should first rollout include generated books, or start with tutor chat plus
  quiz?
- Which file types are enabled for production day one?
- Which browser folder-upload path ships first: direct folder upload, zipped
  folder upload, or cloud connector?
- Which model/provider routes are allowed for free, student, personal, and pro
  plans?
- Should learning-generated notebooks live only in learning, or also surface in
  Spaces?
- What is the account-deletion SLA for learning tenant data?
- Which connector-backed folder source should ship first for V1.1, for example
  Google Drive?

## Implementation North Star

The correct implementation is boring at the trust boundary and rich in the
product surface:

- central ZAKI auth
- private downstream learning engine
- strict BFF route contract
- tenant isolation by canonical user id
- operator-owned dependencies
- user-owned learning preferences
- ZAKI-native frontend
- feature flags and contract tests before rollout
