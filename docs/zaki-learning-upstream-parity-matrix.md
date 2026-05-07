# ZAKI Learn Upstream Parity Matrix

Last updated: May 7, 2026

## Verdict

ZAKI Learn is at hosted SaaS parity for the learning-relevant DeepTutor product
surface that normal users should touch. The remaining differences are deliberate
hosted adaptations:

- raw provider/model/API-key/base-url settings are operator-managed only
- local server filesystem folder linking is replaced by browser folder/archive
  upload now and connector-backed folder linking in V1.1
- raw plugin/tool execution is not exposed as an unrestricted endpoint; it must
  remain behind ZAKI skills/capability allowlists
- deployment, health, provider tests, retention, backup, and DR are internal
  operator routes

Release status: **limited production rollout can proceed after real provider
smokes pass with the chosen operator AI stack.**

## Verification Baseline

Latest local verification:

- ZAKI frontend `http://localhost:5173/learn?view=agents` loads.
- ZAKI backend `/health` is healthy.
- ZAKI backend `/ready` reports learning dependency ready.
- Learning engine `/healthz` and `/readyz` return OK.
- Full Learn parity E2E: `8 passed`.
- Backend learning tests: `33 passed`.
- Learning-engine provider/runtime tests: `54 passed`.
- Typecheck passed.

## Status Legend

| Status | Meaning |
| --- | --- |
| `Available` | Normal ZAKI users can reach the feature through ZAKI Learn. |
| `Hosted-adapted` | Feature exists, but adjusted for SaaS auth, tenancy, safety, quota, or shell integration. |
| `Operator-only` | Feature is intentionally internal/admin-only. |
| `V1.1` | Not in first hosted release, explicitly carried forward. |

## User-Facing Capability Matrix

| Upstream area | DeepTutor capability | ZAKI status | ZAKI surface/API | Notes |
| --- | --- | --- | --- | --- |
| Chat | General tutor chat with streamed responses | Available | `/learn?view=chat`, `/api/learning/ws`, `/api/learning/chat/ws` | Uses ZAKI auth and quota. |
| Chat | RAG-backed chat | Available | Chat sources/tools controls, `/api/learning/ws` | KB selection is user-managed; provider routing is not. |
| Chat | Web search-assisted chat | Hosted-adapted | Chat tools controls | Search provider is operator-managed. |
| Chat | Save chat output to notebook | Available | Chat composer save flow, `/api/learning/notebooks/records/manual` | Covered by E2E. |
| Sessions | List, inspect, rename, delete sessions | Available | `/api/learning/sessions/*` | ZAKI BFF handles tenant user id. |
| Sources/Knowledge | Create knowledge base | Available | `/learn?view=sources`, `/api/learning/knowledge/create` | Multipart upload byte-limited by BFF. |
| Sources/Knowledge | Upload documents | Available | `/api/learning/knowledge/:kbName/upload` | Includes PDF/text/document formats from engine policy. |
| Sources/Knowledge | Upload images | Available | Same upload routes | Included in hosted upload policy and E2E. |
| Sources/Knowledge | Browser folder upload | Available | `/api/learning/knowledge/:kbName/upload-folder` | Browser-provided relative paths only. |
| Sources/Knowledge | Archive upload | Available | `/api/learning/knowledge/:kbName/upload-archive` | Server extraction must remain safe and size-bound. |
| Sources/Knowledge | Reindex and progress | Available | `/api/learning/knowledge/:kbName/reindex`, progress routes | User-owned library operation. |
| Sources/Knowledge | Delete KB/files view | Available | `/api/learning/knowledge/*` | Tenant-scoped by engine. |
| Sources/Knowledge | Local filesystem `link-folder` | V1.1 | Connector-backed folder linking target | Not safe for hosted multi-user server paths. |
| Books | Generate AI book proposal | Available | `/learn?view=books`, `/api/learning/books` | E2E covers book route and create flow wiring. |
| Books | Confirm proposal and spine | Available | `/api/learning/books/confirm-proposal`, `/confirm-spine` | User edits content, not provider settings. |
| Books | Compile page | Available | `/api/learning/books/compile-page` | Upstream engine action. |
| Books | Reader with spine/pages | Available | `LearningBookWorkspace`, `/api/learning/books/:id/*` | DeepTutor-shaped book UI, no dashboard wrapper. |
| Books | Regenerate/insert/delete/move/change blocks | Available | `/api/learning/books/*-block`, `/move-block`, `/change-block-type` | Hosted sanitizer strips operator fields. |
| Books | Deep dive/supplement | Available | `/api/learning/books/deep-dive`, `/supplement` | Normal user learning action. |
| Books | Quiz attempts/remediation | Available | `/api/learning/books/quiz-attempt` | Also feeds review/question flows. |
| Notebooks | Create/list/detail notebooks | Available | `/learn?view=notebooks`, `/api/learning/notebooks/*` | Covered by E2E. |
| Notebooks | Manual record save | Available | `/api/learning/notebooks/records/manual` | Validates summary before forwarding. |
| Notebooks | Summary-streamed record save | Available | `/api/learning/notebooks/records/with-summary` | Upstream route exposed through BFF. |
| Notebooks | Export/download records | Available | Notebook UI export helpers | Covered by E2E. |
| Question Bank | Generate custom questions | Available | `/learn?view=quiz`, `/api/learning/questions/generate/ws` | E2E verifies hosted config payload. |
| Question Bank | Mimic paper mode | Available | `/learn?view=quiz`, `/api/learning/questions/mimic/ws` | PDF upload is encoded through UI path. |
| Question Bank | Entries CRUD | Available | `/api/learning/questions/entries/*` | Category links and update/delete exposed. |
| Question Bank | Categories CRUD | Available | `/api/learning/questions/categories/*` | Review route uses same surface. |
| Review | All/bookmarked/wrong-only review | Available | `/learn?view=review` | E2E route smoke covers controls. |
| Co-Writer | Documents list/create/detail/update/delete | Available | `/learn?view=writer`, `/api/learning/co-writer/documents/*` | Upstream-shaped editor in ZAKI shell. |
| Co-Writer | Edit, React edit, stream edit | Available | `/api/learning/co-writer/edit*` | Streaming route remains BFF-proxied. |
| Co-Writer | Automark | Available | `/api/learning/co-writer/automark` | Normal user writing action. |
| Co-Writer | History/tool-call inspection | Available | `/api/learning/co-writer/history*`, `/tool-calls/*` | Useful for result trace/debug in product. |
| Co-Writer | Markdown export | Available | `/api/learning/co-writer/export/markdown` | Size-capped by BFF. |
| Space | Chat history, notebooks, questions, skills, memory | Available | `/learn?view=space` | Upstream Space sections adapted into ZAKI Learn. |
| Memory | View/update/refresh/clear learning memory | Available | `/api/learning/memory*` | User-managed learning memory, distinct from provider settings. |
| Skills | List/create/update/delete skills and tags | Available | `/api/learning/skills*` | Normal user can manage skills content. |
| Deep Solve | Solve workspace and session history | Available | `/learn?view=solve`, `/api/learning/solve/ws`, `/api/learning/solve/sessions*` | E2E covers capability routing. |
| Deep Research | Research mode/depth/source controls | Available | `/learn?view=research`, `/api/learning/ws` with `deep_research` | E2E verifies hosted config. |
| Visualize | Visualization generation | Available | `/learn?view=visualize`, `/api/learning/ws` with `visualize` | Generated HTML rendering is script-disabled by default. |
| Math Animator | Math animation generation | Available | `/learn?view=math-animation`, `/api/learning/ws` with `math_animator` | Requires operator-installed Manim/runtime deps. |
| Vision Solver | Image solve/analyze | Available | `/learn?view=workspaces`, `/api/learning/vision/analyze`, `/vision/solve/ws` | Requires multimodal LLM route. |
| TutorBot | List/create/start/stop/delete/destroy bots | Available | `/learn?view=agents`, `/api/learning/tutor-agents*` | Browser smoke shows running bots. |
| TutorBot | Bot chat over WebSocket | Available | `/api/learning/tutor-agents/:agentId/ws` | Tenant-scoped registry fixed in engine. |
| TutorBot | Profiles/souls/templates | Available | Agents tabs and `/souls/*` routes | Profile editor preserves unsaved edits. |
| TutorBot | Files/history | Available | `/files/*`, `/history` | User-scoped and workspace-restricted in hosted mode. |
| TutorBot | Channels | Hosted-adapted | Channels tab, `/channels/schema` | Allowlist: WhatsApp, Telegram, Discord, Email, Slack. |

## Internal Or Hosted-Adapted Matrix

| Upstream area | DeepTutor capability | ZAKI status | Decision |
| --- | --- | --- | --- |
| Settings | LLM provider/model/API-key/base-url UI | Operator-only | Exposed only through deployment config and readiness gates, not normal users. |
| Settings | Embedding provider/model/API-key/base-url UI | Operator-only | Same as LLM routing. |
| Settings | Search provider/API-key/base-url UI | Operator-only | Same as LLM routing. |
| Settings | Theme/sidebar/local UI settings | Hosted-adapted | ZAKI shell owns product UI and navigation. |
| System | LLM/embedding/search test endpoints | Operator-only | Should feed `/api/internal/learning/deployment-readiness`; never expose secrets. |
| System | Runtime topology/status | Operator-only | Super-admin/deployment diagnostics only. |
| Plugins | Raw tool execution endpoints | Hosted-adapted | Must be routed through ZAKI skills/capability allowlists, quota, and tenant context. |
| Dashboard | Recent dashboard cards | Hosted-adapted | Replaced by ZAKI Learn route surfaces and side panel structure. |
| Attachments | Raw attachment retrieval | Hosted-adapted | Used internally by session/vision/chat flows; browser should receive only tenant-safe references. |
| Local folders | Server filesystem path linking/sync | V1.1 | Replace with Google Drive/OneDrive/SharePoint style connectors. |
| Provider choice | Kimi/OpenAI/Claude/Gemini model switching | Operator-only | Together Kimi K2.5 is cost-first launch route; OpenAI/others fallback by operator policy. |

## Release Blockers Before Broad Paid Rollout

1. Run real provider smokes with production-like operator config:
   - LLM chat/completion with `moonshotai/Kimi-K2.5`
   - JSON/structured output
   - image input
   - embeddings with `intfloat/multilingual-e5-large-instruct`
   - search provider
2. Confirm `/api/internal/learning/deployment-readiness` is green with immutable image refs, source commit, retention, DR, and AI stack config.
3. Run a two-user isolation smoke against the live engine:
   - user A creates source/book/bot/notebook
   - user B cannot list, read, update, delete, or chat with A's objects
4. Run route-by-route browser walkthrough from `docs/zaki-learning-operator-deployment-checklist.md`.
5. Decide whether raw plugin execution needs a V1 launch UX or remains behind skills/capability allowlists.

