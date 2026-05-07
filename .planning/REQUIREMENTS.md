# ZAKI Learn Requirements

Last updated: 2026-05-07

## Active Requirements

### Product Parity

- LEARN-PARITY-001: Tutor chat must support upstream conversation streaming, capability selection, attachments, selected sources, save-to-notebook, and session history through ZAKI routes.
- LEARN-PARITY-002: Source/knowledge library must support create/list/detail/files/settings/upload/reindex/progress using the upstream layout adapted into ZAKI.
- LEARN-PARITY-003: Books must support library, creator, proposal, spine, reader, progress, block actions, page chat, quizzes, rebuild, supplement, and delete.
- LEARN-PARITY-004: Question review must support entries, categories, attempts, bookmarks, follow-up tutoring, and weak-area loops.
- LEARN-PARITY-005: Notebooks and saved learning records must support create/list/detail/update/delete and save flows from chat/books/research/co-writer.
- LEARN-PARITY-006: Co-writer must support upstream document list, create, edit, stream/edit routes where available, templates, save, delete, and markdown workflow.
- LEARN-PARITY-007: TutorBot must support bots, profiles, channels, soul templates, chat/history, and user-safe persona/channel settings.
- LEARN-PARITY-008: Space must expose chat history, books, notebooks, question bank, skills, memory, and source selection as in upstream, adapted to hosted safety.
- LEARN-PARITY-009: Deep solve, deep research, visualization, math animation, and quiz generation must be accessible as ZAKI offerings, whether surfaced through chat modes or named workspace routes.
- LEARN-PARITY-010: User-uploaded documents, images, mixed attachments, folder uploads, and archive uploads must be preserved. Hosted adaptations must not drop local-deployment capabilities.

### UI And UX

- LEARN-UX-001: ZAKI Learn must use the ZAKI shell and the four always-on primary categories without changing their semantics.
- LEARN-UX-002: When Learn is selected, the secondary side panel must show DeepTutor-equivalent navigation under the divider.
- LEARN-UX-003: Main content should port/adapt upstream UI shape directly, not wrap it in new dashboards unless upstream has that surface.
- LEARN-UX-004: `/learn?view=books` must open the book library, not the creator or a dashboard summary.
- LEARN-UX-005: Creator panels appear only after the user selects the relevant create action.
- LEARN-UX-006: Empty/loading/error states must match upstream intent while using ZAKI theme tokens.
- LEARN-UX-007: No production UI copy may mention DeepTutor.

### Security And Multi-User

- LEARN-SEC-001: Browser clients never call the learning engine directly.
- LEARN-SEC-002: Browser clients never receive or send `X-Internal-Token`.
- LEARN-SEC-003: Every user route requires ZAKI central auth.
- LEARN-SEC-004: ZAKI backend injects canonical `X-Zaki-User-Id` and `X-Request-Id`.
- LEARN-SEC-005: All learning mutation bodies must reject or strip provider/model/api-key/base-url/internal-token fields.
- LEARN-SEC-006: WebSocket messages must be validated by allowlist schema, recursively where needed.
- LEARN-SEC-007: Chunked uploads must not bypass byte limits.
- LEARN-SEC-008: Generated/LLM HTML must not execute scripts by default.
- LEARN-SEC-009: Local server filesystem folder linking is disabled in hosted multi-user production.
- LEARN-SEC-010: Connector-backed folder linking requires explicit connector auth, tenant scoping, and operator enablement.

### Operator And User Settings

- LEARN-SET-001: User-managed settings include safe preferences only: language, tone, difficulty, target level, quiz defaults, lesson preferences, citations, bookmarks, notebooks, and dashboard layout.
- LEARN-SET-002: Operator-managed settings include providers, routing, credentials, model catalog, upload limits, quota, feature flags, retention, backup, and external dependencies.
- LEARN-SET-003: Normal users cannot edit raw provider/model/API-key/base-url values.
- LEARN-SET-004: Admin/operator surfaces never return secrets and audit every mutation.

### Governance And SaaS Readiness

- LEARN-GOV-001: Quotas must be enforced before broad rollout for prompts, streams, uploads, storage, book generation, search, visualization, and math animation.
- LEARN-GOV-002: Account deletion must delete learning data or create an audited async deletion job.
- LEARN-GOV-003: Export must cover sessions, notes, sources, lessons, quizzes, and artifacts.
- LEARN-GOV-004: Retention must be defined for source uploads, generated artifacts, sessions, notebooks, and derived indexes.
- LEARN-GOV-005: Backup/restore and disaster recovery procedures must be tested or gated before paid-user rollout.
- LEARN-GOV-006: Immutable image tags are required for production learning engine deployments.

## Deferred Requirements

- LEARN-V11-001: Google Drive folder linking.
- LEARN-V11-002: OneDrive/SharePoint folder linking.
- LEARN-V11-003: Malware scanning hook where infrastructure is available.

## Out Of Scope

- Exposing arbitrary server-local filesystem folder paths to normal hosted users.
- Exposing raw upstream provider/model settings to normal hosted users.
- Showing DeepTutor branding in production.
