# Nullalis Code Truth and UI Activation Audit

Date: 2026-05-25
Status: Deep-dive audit from code truth
Owner: CTO/Product

## Purpose

This document maps Nullalis from the code truth so ZAKI prod can surface all real user value in the V1/V2 app and website without inventing capabilities that do not exist.

The practical question is:

> What can ZAKI Agent already do, what is already wired in zaki-prod, what is hidden, and what must be promoted into product UX?

## Repositories Inspected

Nullalis source:

- `/Users/nova/Desktop/nullalis/STATUS.md`
- `/Users/nova/Desktop/nullalis/docs/ROADMAP.md`
- `/Users/nova/Desktop/nullalis/docs/online-agent-contract.md`
- `/Users/nova/Desktop/nullalis/docs/agent-lifecycle-spec.md`
- `/Users/nova/Desktop/nullalis/docs/slash-commands-spec.md`
- `/Users/nova/Desktop/nullalis/docs/scheduler-automation-contract.md`
- `/Users/nova/Desktop/nullalis/docs/openapi-access.md`
- `/Users/nova/Desktop/nullalis/docs/mcp-client.md`
- `/Users/nova/Desktop/nullalis/docs/extension-ws-contract.md`
- `/Users/nova/Desktop/nullalis/.spike/playwright-mcp/README.md`
- `/Users/nova/Desktop/nullalis/.spike/nullalis-extension/README.md`
- `/Users/nova/Desktop/nullalis/.spike/nullalis-extension/docs/SECURITY.md`
- `/Users/nova/Desktop/nullalis/src/gateway.zig`
- `/Users/nova/Desktop/nullalis/src/tools/root.zig`
- `/Users/nova/Desktop/nullalis/src/tools/memory_store.zig`
- `/Users/nova/Desktop/nullalis/src/tools/memory_recall.zig`
- `/Users/nova/Desktop/nullalis/src/tools/brain_graph.zig`
- `/Users/nova/Desktop/nullalis/src/tools/compose_memory.zig`
- `/Users/nova/Desktop/nullalis/src/user_settings.zig`

ZAKI prod source:

- `/Users/nova/Desktop/zaki-prod/backend/src/index.js`
- `/Users/nova/Desktop/zaki-prod/backend/src/platform-policy.js`
- `/Users/nova/Desktop/zaki-prod/backend/src/platform-meter.js`
- `/Users/nova/Desktop/zaki-prod/backend/src/meter-contract.js`
- `/Users/nova/Desktop/zaki-prod/backend/src/agent-metering.js`
- `/Users/nova/Desktop/zaki-prod/backend/src/agent-bff-contract.js`
- `/Users/nova/Desktop/zaki-prod/backend/src/bot-bff.js`
- `/Users/nova/Desktop/zaki-prod/src/routes.tsx`
- `/Users/nova/Desktop/zaki-prod/src/lib/api.ts`
- `/Users/nova/Desktop/zaki-prod/src/lib/slashCommands.ts`
- `/Users/nova/Desktop/zaki-prod/src/app/components/ChatArea.tsx`
- `/Users/nova/Desktop/zaki-prod/src/app/components/chat/NullalisTurnTimeline.tsx`
- `/Users/nova/Desktop/zaki-prod/src/app/components/chat/NullalisRuntimeWidgets.tsx`
- `/Users/nova/Desktop/zaki-prod/src/app/components/chat/views/ZakiDashboard.tsx`
- `/Users/nova/Desktop/zaki-prod/src/app/components/brain/BrainPage.tsx`
- `/Users/nova/Desktop/zaki-prod/src/app/components/agent/PowerUserSheet.tsx`
- `/Users/nova/Desktop/zaki-prod/src/app/components/agent/ZakiSettingsSheet.tsx`

No Nullalis code was changed.

## Executive Conclusion

Nullalis is not a simple chat backend. It is a full agent runtime with:

- User-scoped provisioning and runtime state.
- Rich SSE event stream.
- Approvals and execution modes.
- Tool registry.
- Graph memory and memory governance primitives.
- Sessions, tasks, cron/jobs, traces, artifacts, sharing, voice, files, browser, OpenAPI, MCP, channels, secrets, diagnostics, usage, and GDPR purge.

ZAKI prod already wires important parts:

- Central product registry and meter.
- Agent chat stream and legacy bot alias.
- Agent provisioning.
- Settings, heartbeat, Telegram, secrets, attachments, voice.
- Sessions, history, approvals, mode changes, compaction.
- Brain graph, timeline, search, local graph, orphans, communities, diff, compose, memory detail.
- Slash command palette.
- Cron management.
- Brain page with graph/timeline/compose and memory mention UX.

The gap is product activation:

- Agent is still entered through the Spaces route instead of its own `/agent` product surface.
- Tasks/jobs/traces/artifacts/browser/OpenAPI are present in Nullalis but not exposed as first-class zaki-prod BFF/frontend surfaces.
- Browser extension control exists as a runtime spike and gateway contract, but production pairing and full tool parity are not yet zaki-prod UX.
- OpenAPI connector exists in Nullalis but has no product-facing connector inventory, run timeline, or meter attribution surface.
- The Agent run ledger is not yet a durable user product view in zaki-prod.

The next app slice should therefore be "Agent workbench activation", not another generic UI polish pass.

## Nullalis Code Truth

### Runtime Profile

Nullalis is a single-binary Zig runtime behind ZAKI Agent. Its status docs describe it as a shared multi-tenant runtime: one gateway process, many logical users. It includes:

- 293 Zig files and a large runtime surface.
- 15 LLM providers.
- 48 tools.
- 20 channel integrations.
- 9-stage memory retrieval over Postgres, SQLite, markdown projection, vector plane, and supporting caches.
- Postgres as canonical production storage.
- pgvector/vector store as derived semantic plane.
- Filesystem workspace as a first-class agent workspace.

Product implication:

- The app should not present ZAKI Agent as "a chat space with a better model".
- It should present it as a persistent personal agent runtime with visible work, memory, tools, browser, files, approvals, and accountability.

### Gateway Surfaces

Nullalis gateway exposes these major families:

Public:

- `GET /api/v1/share/artifact/:share_code`
- `GET /api/v1/share/:share_code`

Internal-token gated:

- `POST /api/v1/users/provision`
- `GET /api/v1/channels/health`
- `GET /api/v1/security/review`
- `POST /api/v1/chat/stream`
- `GET /api/v1/chat/events`
- `GET /api/v1/extension/ws`

Per-user route families:

- `GET/PUT onboarding`
- `GET config`
- `GET/PATCH/PUT settings`
- `GET/PUT heartbeat`
- `GET/POST/PATCH/PUT/DELETE cron`
- `GET secrets`
- `GET/PUT/DELETE secrets/:key`
- `POST secrets/:key/prepare`
- `GET secrets/:key/audit`
- `GET/POST/DELETE channels/:channel/bindings`
- `POST channels/telegram/connect`
- `POST/DELETE channels/telegram/disconnect`
- `POST voice/transcribe`
- `POST voice/synthesize`
- `POST attachments`
- `GET tasks`
- `GET tasks/:task_id`
- `POST tasks/:task_id/stop`
- `GET jobs`
- `GET diagnostics/context`
- `GET diagnostics/memory-doctor`
- `GET usage`
- `DELETE data`

Brain:

- `GET brain/graph`
- `GET brain/timeline`
- `GET brain/search`
- `GET brain/documents`
- `GET brain/diff`
- `GET brain/local-graph`
- `GET brain/orphans`
- `GET brain/me`
- `GET brain/communities`
- `POST brain/communities/recompute`
- `GET brain/memory/:key`
- `POST brain/compose`

Sessions:

- `GET sessions`
- `GET/DELETE sessions/:key`
- `POST sessions/:key/compact`
- `GET sessions/:key/context`
- `GET/POST sessions/:key/export`
- `GET sessions/:key/history`
- `POST sessions/:key/approve`
- `POST sessions/:key/mode`

Traces:

- `GET traces`
- `GET traces/:run_id`
- `POST traces/:run_id/share`
- `DELETE traces/:run_id/share`

Artifacts:

- `GET artifacts`
- `GET artifacts/:id`
- `PUT artifacts/:id`
- `GET artifacts/:id/v/:version`
- `GET artifacts/:id/history`
- `GET artifacts/:id/diff/:from/:to`
- `POST artifacts/:id/share`
- `DELETE artifacts/:id/share`
- `POST artifacts/:id/export`

Product implication:

- The existing zaki-prod BFF is not yet a complete product facade for the runtime.
- The missing BFF/frontend routes are tasks, jobs, traces, artifacts, browser/extension pairing, and OpenAPI connector activity.

### Agent Stream Contract

Nullalis defines a rich SSE contract:

- `status`
- `progress`
- `reasoning_summary`
- `tool_start`
- `tool_result`
- `approval_required`
- `task_update`
- `reply_start`
- `token`
- `error`
- `done`

Contract rule: every turn ends with exactly one `done`.

Approval model:

- One pending approval slot per session.
- `allow-once` and `deny` are supported.
- `allow-always` is accepted but behaves as allow-once in v1.

Product implication:

- ZAKI should show a live "what the agent is doing" timeline, not just text streaming.
- Approvals are not settings. They are in-flow run controls.
- `done` is the natural place to trigger meter receipt, durable run finalization, and UI state collapse.

### Tools

Nullalis tool modules include:

- Files: `file_read`, `file_write`, `file_edit`, `file_append`, hashed variants.
- Shell/git: `shell`, `git_operations`.
- Web/API: `web_search`, `web_fetch`, `http_request`, `openapi`.
- Browser: `browser`, `browser_open`, `extension_navigate`.
- Memory/Brain: `memory_store`, `memory_recall`, `memory_list`, `memory_timeline`, `memory_forget`, `memory_edit`, `memory_archive`, `memory_demote`, `memory_purge_topic`, `memory_maintain`, `brain_graph`, `compose_memory`, `wiki_link`, `context_snapshot`, `transcript_read`.
- Scheduling: `schedule`, `cron_add`, `cron_list`, `cron_remove`, `cron_run`, `cron_runs`, `cron_update`.
- Multi-agent/tasks: `spawn`, `delegate`, `message`, `task_list`, `task_get`, `task_stop`.
- Artifacts/docs/images: `artifact_create`, `artifact_get`, `artifact_list`, `artifact_update`, `produce_document`, `image_info`, `image_generate`, `screenshot`.
- Runtime/control: `runtime_info`, `set_execution_mode`, `skill_registry`, `todo`, `calculator`, `time_now`, `pushover`, `composio`.

Subagent restriction is explicit in `src/tools/root.zig`: subagents do not receive recursive or side-effect-heavy tools such as `spawn`, `delegate`, `message`, scheduling, memory, composio, and browser.

Product implication:

- The UX should classify tool activity into understandable lanes: files, browser, API, memory, tasks, scheduling, artifacts.
- Tool names should not leak as the primary UX. They should appear in the detail view and audit trail.
- Subagent activity needs a task view because Nullalis already models tasks and task lanes.

### Memory and Brain

Nullalis memory is a major differentiator.

The code/docs show:

- Postgres canonical memory rows.
- Typed graph edges.
- Entity nodes and communities.
- Memory events.
- Embeddings/vector store.
- BM25 plus pgvector cosine via RRF.
- Graph neighbor expansion.
- Warm continuity retrieval.
- Bi-temporal close-out with validity/invalidity fields.
- Supersession filtering.
- Memory tools for storing, recalling, editing, forgetting, archiving, demoting, purging, maintaining.

Important implementation details:

- `memory_store` structured triple path goes through extraction persistence, contradiction judge, entity coref, edge insert/source attribution, and vector sync.
- `memory_recall` uses the full memory runtime when available and avoids surfacing internal/superseded rows.
- `brain_graph` exposes structure-focused graph actions: local graph, communities, orphans, diff.
- `compose_memory` validates source references server-side before writing a synthesized memory.
- `brain/compose` enforces `compose:` key prefix to avoid overwriting unrelated memories.
- `DELETE /api/v1/users/:id/data` has a strict `PURGE-USER-<id>` confirmation and purges sessions, Postgres state, vector rows, and filesystem state.

Product implication:

- Brain is a control plane, not an Agent settings tab.
- Personal Brain should be visible as a graph/timeline/provenance product surface.
- Agent should show memory reads/writes in context during a run.
- Spaces memory should only persist if it becomes governed Workspace Memory. Otherwise it should stay session/workspace context, not a competing weak long-term memory.

### Product Settings

Nullalis product settings are intentionally narrow:

- `assistant_mode`: fast, balanced, deep.
- `group_activation`: mention, always.
- `proactive_updates`: boolean.
- `voice_replies`: boolean.
- `session_timeout_minutes`: 5-180.
- `autonomy`: read_only, supervised, full.

`src/user_settings.zig` strips operator-owned top-level config keys. Tenant config may carry only `product_settings`.

Operator-owned runtime keys include infrastructure such as providers, memory config, MCP servers, OpenAPI specs, sidecar, heartbeat, tenant identity, secrets, and channel infrastructure.

Product implication:

- Agent-local settings should stay minimal and focused.
- Global Settings owns identity, billing, usage, OAuth/connections, product access, memory/data, developer access, privacy.
- Product settings should not become a dumping ground for provider, memory, billing, or connector authority.

### Browser Control

Nullalis has two browser paths:

1. Server-side Playwright MCP
2. User browser extension WebSocket

Server browser:

- Good for public or anonymous web tasks.
- Per-session BrowserContext.
- Idle reap.
- SSRF deny list.
- Bounded DOM/text/screenshot outputs.
- `evaluate_js` gated.

User extension:

- Endpoint: `GET /api/v1/extension/ws`.
- Extension sends auth frame.
- Gateway hub routes commands to a connected browser extension.
- Current wired tool is `extension_navigate`.
- Contract lists more tools still to wire: click, type, fill_form, screenshot, get_text, get_dom, wait_for, scroll, list_tabs.
- Extension security docs show active-tab posture, no cookie/webRequest permission, STOP behavior, and loopback `ws://` restriction.

Known production gap:

- Current docs still describe token/user id paste for extension auth.
- This is not acceptable for production. zaki-prod must own pairing, scoped token minting, revocation, and device inventory.

Product implication:

- Browser is a first-class Agent panel, not just a hidden tool.
- The UI must distinguish server browser from user browser extension.
- User browser extension should require account auth, not anonymous.
- STOP must be visible whenever the browser is controlled.

### OpenAPI and API Connectors

Nullalis has a delivered universal OpenAPI connector:

- Operator-owned `api_specs`.
- One `openapi` meta-tool with `list`, `describe`, and `invoke`.
- Agent cannot supply arbitrary specs at runtime.
- HTTPS-only.
- SSRF-safe egress.
- Bounded spec and response sizes.
- Read-only vs read-write modes.
- Write methods require approval and read-only specs hard-refuse writes.
- Static credentials currently use env-based auth references.
- OAuth2/OpenID are not v1.

Product implication:

- This is a major Agent value surface: "connect structured APIs safely".
- It belongs under Developer Access or Agent Connectors once productized.
- API calls must show operation id, method, approval state, result, duration, response size, and meter receipt.
- This should not be mixed with OAuth account connections until the native connector contract is finalized.

### MCP

Nullalis consumes MCP servers from `mcp_servers` and exposes tools/resources/prompts. It also has an MCP server mode with deny-by-default tool exposure.

Product implication:

- MCP belongs under Developer Access and Agent Connectors.
- User-facing UX should show connected server, tools exposed, health, and permission risk.
- It should not bypass central product registry, auth, metering, or audit.

### Channels

Nullalis channel modules include:

- Telegram
- WhatsApp
- Slack
- Discord
- Email
- Teams
- Matrix
- Signal
- iMessage
- Line
- Lark
- Mattermost
- IRC
- Nostr
- OneBot
- QQ
- Maixcam

Current gateway/product routes expose:

- Generic channel bindings.
- Telegram connect/disconnect as the most productized route.
- Channel health.
- Webhook handlers for multiple channel types.

Product implication:

- Telegram is ready for Agent settings UX.
- Other channels should appear only when the setup flow is real enough.
- Channel identity belongs under global Connections when it affects account-wide access, and under Agent local settings when it is only reply behavior.

### Scheduling and Jobs

Nullalis docs split:

- `schedule` as the user-facing durable automation tool.
- `cron_*` as lower-level scheduler/operator/internal tooling.
- Heartbeat as wake/timer lane, not exact-time scheduling.

Gateway exposes:

- `GET/POST/PATCH/PUT/DELETE cron`.
- `GET jobs`.
- Tooling for `schedule` and `cron_*`.

zaki-prod currently has cron management sheets and schedule dialogs, but not a product-level jobs/runs dashboard.

Product implication:

- Jobs should appear as "Scheduled work" in the Agent product, not only as cron JSON.
- User value is reminders, reports, follow-ups, recurring work, and background agent tasks.
- The UI should not teach users cron first.

### Tasks, Subagents, and Background Work

Nullalis has:

- Task ledger.
- Task delivery.
- Task states.
- `GET tasks`, `GET tasks/:id`, `POST tasks/:id/stop`.
- SSE `task_update`.
- Subagent session lanes.
- Spawn/delegate tools for main agent profile.

zaki-prod currently parses `task_update` events in the chat stream but does not expose task list/detail/stop as BFF/API functions or product views.

Product implication:

- Agent should have a task drawer or right-side "Work" panel.
- Long-running work should not disappear when a turn has no final text.
- Task stop should be exposed for queued tasks; running task interruption requires runtime support.

### Traces and Share

Nullalis has trace list/detail/share routes:

- Run trace list.
- Sanitized trace event timeline.
- Opaque public share links.
- Share sanitizer redacts risky data.
- Public shares are in-memory and do not survive gateway restart in v1.

zaki-prod currently does not expose trace list/detail/share through the Agent product surface.

Product implication:

- Competition-grade agent UX needs run replay/history.
- The user should see: what happened, tools used, approvals, files, browser actions, memory side effects, and usage.
- Public share is a powerful marketing mechanic, but it must be honest about lifetime and sanitization.

### Artifacts

Nullalis has artifacts manager endpoints and tools:

- Create/list/get/update artifact tools.
- List/get/history/diff/edit/share/revoke/export routes.
- Version graph.
- Public sanitized artifact share.
- Authenticated artifact endpoints return 503 when persistent state is unavailable, not a dishonest empty result.
- Export endpoint currently returns 501 until produce_document bridge lands.

zaki-prod does not yet have Agent artifact API wrappers or an Agent artifacts panel.

Product implication:

- Artifacts are the natural bridge from chat to work product.
- Agent workbench needs an artifacts/files panel.
- Artifact shares can support website "look what ZAKI built" narratives.
- Export should stay hidden or clearly disabled until the bridge is real.

### Voice, Attachments, Multimodal

Nullalis gateway exposes:

- `POST voice/transcribe`
- `POST voice/synthesize`
- `POST attachments`

zaki-prod already wraps:

- `uploadAgentAttachment`
- `transcribeAudio`
- `synthesizeSpeech`

ChatArea uploads all files to the agent workspace, then sends short markers such as `[IMAGE:<path>]` or file-read instructions. This is the right pattern because it avoids huge chat payloads.

Product implication:

- The composer should expose file and image attachment value confidently.
- Voice should remain simple until browser/app surfaces mature.
- Attachments should feed artifacts and memory only through explicit policy.

## ZAKI Prod Wiring Truth

### Central Platform

Already strong:

- Product ids: spaces, agent, learn, hire, design, brain, cli, local_app, extensions.
- The Learn product uses registry id `learning`, but the internal product id is `learn`.
- Product states: enabled, disabled, maintenance, degraded, hidden, readOnly.
- Plan ladder: free, personal, pro, pro_max.
- Memory scopes: personal_brain, workspace_memory, learner_memory, hire_memory, design_memory, session_memory.
- Product weights and capability weights.
- `/api/products/registry`.
- `/api/meter/status`.
- `/api/meter/grants`.
- `/api/meter/receipts`.
- Anonymous metering with durable anonymous session id.
- Weekly allowance anchored to first metered use after entitlement activation.
- No rollover.
- Five-hour rolling window currently implemented as lookback.

Needed:

- Persist five-hour burst windows if we want fixed user-visible reset semantics.
- Continue replacing legacy prompt quota with central meter authority.
- Product cards should route Agent to `/agent`, not legacy `/spaces/zaki-bot/threads/main`.

### Agent BFF

Already wired:

- `POST /api/agent/chat/stream`
- `POST /api/agent/provision`
- `GET /api/agent/me`
- onboarding
- config get
- secrets list/get/put/delete
- attachments
- voice transcribe/synthesize
- Telegram connect/disconnect
- heartbeat
- cron
- sessions list/get/delete/compact/context/export/history/approve/mode
- brain graph/local-graph/orphans/diff/communities/recompute/timeline/search/memory/me/compose

Missing BFF wrappers:

- `/api/agent/tasks`
- `/api/agent/tasks/:taskId`
- `/api/agent/tasks/:taskId/stop`
- `/api/agent/jobs`
- `/api/agent/traces`
- `/api/agent/traces/:runId`
- `/api/agent/traces/:runId/share`
- `/api/agent/artifacts`
- `/api/agent/artifacts/:id`
- artifact history/diff/share/revoke/export
- extension pairing/status/revoke/device inventory
- browser session status
- OpenAPI connector inventory/activity
- channel bindings beyond Telegram as user-facing product APIs

### Frontend Routes

Current route truth:

- `/` shows website home for guests, `ChatArea` for signed-in users.
- `/spaces`, `/spaces/:spaceId`, `/spaces/:spaceId/threads/:threadId` all use `ChatArea`.
- `/brain` uses `BrainPage`.
- `/learn` uses `LearningPage`.
- There is no authenticated `/agent` route.
- Public `/products/:productId` exists for website product pages.

Product mismatch:

- The website can have `/products/agent`, but the authenticated app lacks `/agent`.
- The product registry says Agent route is `/`, while dashboard overrides Agent to legacy Spaces route.
- This keeps backward compatibility but harms flagship positioning.

### Frontend Agent Stream

Already good:

- ChatArea parses the Nullalis SSE classes.
- It extracts reasoning summaries, progress, tools, tasks, approvals, usage summary, context gauge, and system notices.
- It snapshots turn timelines after streaming ends.
- `NullalisTurnTimeline` composes reasoning and compact tool rows.
- `ApprovalRequiredCard` supports approve/deny.
- `PowerUserSheet` exposes controls, approvals, context, memory, usage.
- `ZakiSettingsSheet` exposes narrow product-local settings.
- Slash command catalog is generated from Nullalis docs and includes the broad command set.

Needed:

- Stop treating Agent as a special Space.
- Promote timeline, approvals, tasks, browser, artifacts, memory context, and usage into a dedicated workbench layout.
- Replace hidden/product-local diagnostics with a clear "Run details" model.
- Add durable run history UI instead of only per-turn local snapshots.

### Brain Frontend

Already strong:

- `/brain` exists.
- Graph and timeline tabs.
- Search.
- Full-bleed graph canvas.
- Floating filter/cluster/orphan overlays.
- Local graph drilldown.
- Community recompute.
- Time scrubber/diff.
- Compose from selected memories.
- Memory detail panel.
- `@` brain mention search in composer.

Needed:

- Brain should become the canonical Memory Control Plane across scopes.
- It should visually distinguish Personal Brain from Workspace/Learner/Hire/Design/Session scopes when those are ready.
- Agent run memory reads/writes should deep-link into Brain.

## User Value Matrix

| Domain | Code truth | Current zaki-prod surface | Hidden user value | Required activation |
| --- | --- | --- | --- | --- |
| Agent workbench | Nullalis stream, tools, sessions, tasks, traces, artifacts | ChatArea in Spaces route | Persistent agent OS, not a chat thread | Add `/agent` route and workbench shell |
| Runtime timeline | SSE events and trace store | Live per-turn timeline | Explainable work history | Durable run ledger and run detail |
| Approvals | `approval_required`, `sessions/:key/approve` | Inline card and PowerUserSheet | Trust and control | Move approvals into Agent workbench command zone |
| Modes | `/mode`, `sessions/:key/mode` | PowerUserSheet | Plan/execute/review control | Keep product-local, visible in workbench |
| Tasks/subagents | task ledger and endpoints | SSE parsing only | Long-running work management | Add task BFF wrappers and task panel |
| Jobs/schedule | `schedule`, cron/jobs endpoints | Cron sheet | Reminders/reports/follow-ups | Add "Scheduled work" UX, do not lead with cron |
| Brain memory | Graph/timeline/search/compose endpoints | Strong `/brain` route | Personal graph memory differentiator | Make Brain a governance pillar and link from runs |
| Memory reads/writes | memory tools and diagnostics | PowerUser memory diagnostics | "Why does ZAKI know this?" | Add run memory context and provenance |
| Browser server | Playwright MCP | Not productized | Public web task execution | Add browser panel/status/STOP |
| User browser extension | WS hub and extension spike | Not productized | Logged-in website automation | Add pairing, scoped token, device status, full tool parity |
| OpenAPI connector | operator `api_specs`, `openapi` tool | Not surfaced | Safe structured API work | Add connector inventory and run attribution |
| MCP | MCP client/server support | Not surfaced | Developer extensibility | Add Developer Access contract |
| Artifacts | artifact tools/routes/share | Not surfaced | Work products, diffs, share links | Add artifacts panel and BFF wrappers |
| Files/attachments | attachment route and file tools | Upload markers in composer | Agent can work on real documents | Improve attachment panel and artifact conversion |
| Voice | STT/TTS routes | API wrappers | Multimodal UX | Keep simple, avoid overemphasis |
| Channels | many channel modules, Telegram productized | Telegram settings | Agent across messaging apps | Expand channel UX only when setup is complete |
| Secrets | secret vault routes | API wrappers, no broad UX | Safe credentials | Move to Settings Developer Access/Connections |
| Usage | Nullalis usage endpoint plus central meter | Central meter dashboard/settings, legacy quotas | Transparent allowance | Central meter remains authority; Nullalis supplies raw facts |
| GDPR/data | Nullalis purge route and zaki account cleanup | Settings privacy/data | Trust and compliance | Scope-aware export/delete |

## MECE Target App Model

### Platform Layer

Owned by zaki-prod:

- Identity.
- Auth.
- Billing.
- Product registry.
- Product state.
- Entitlements.
- Meter.
- OAuth/connections inventory.
- Device/client inventory.
- Settings.
- Dashboard.
- Account deletion/export.

### Product Layer

Product surfaces:

- Agent.
- Chat/Spaces.
- Learn.
- Hire.
- Design.

Each product owns workflow UX, not global policy.

### Governance Layer

Governance surfaces:

- Settings.
- Brain.
- Usage.
- Developer Access.
- Privacy.
- Admin/support when authorized.

### Runtime Layer

Downstream services:

- Nullalis for Agent.
- Learning engine.
- Hire service.
- Future Design service.
- Spaces/Chat service.

Each downstream reports raw facts and obeys grants. None owns final billing.

## S-Tier Agent Workbench Concept

Desktop route: `/agent`

Primary zones:

- Left product rail: Dashboard, Agent, Chat, Learn, Hire, Brain, Settings.
- Center: conversation and composer.
- Right adaptive panel:
  - Work timeline.
  - Browser.
  - Tasks.
  - Artifacts.
  - Memory context.
  - Usage.
  - Approvals.

Panel behavior:

- Default: Work timeline.
- If browser active: browser panel promoted.
- If approval pending: approval promoted.
- If artifact created: artifact panel badge.
- If memory written/read: memory panel badge.
- If run done: collapse live details into "Worked for X" with expandable trace.

Mobile:

- Center-first conversation.
- Bottom/sheet tabs: Work, Browser, Memory, Files, Usage.
- STOP and approval actions remain persistent.

## Route and Product Corrections

1. Add authenticated `/agent`.
2. Make product registry Agent route `/agent`.
3. Make Dashboard Agent card route `/agent`.
4. Keep `/spaces/zaki-bot/threads/main` as compatibility only.
5. Keep `/brain` as memory governance.
6. Keep Agent local settings minimal.
7. Keep platform Settings global.

## Code Review Findings To Fix Next

These are concrete issues seen in the current zaki-prod code truth, not future polish.

1. No authenticated Agent route exists.

   Evidence: `/Users/nova/Desktop/zaki-prod/src/routes.tsx` defines `/`, `/spaces`, `/brain`, and `/learn`, but no `/agent`.

   Impact: the flagship product is still experienced as a special chat/space, which weakens positioning and makes future browser/artifact/task UX cramped.

2. Dashboard opens Agent through the legacy Spaces path.

   Evidence: `/Users/nova/Desktop/zaki-prod/src/app/components/chat/views/ZakiDashboard.tsx` routes `agent` to `/spaces/${ZAKI_BOT_SPACE_ID}/threads/${ZAKI_BOT_THREAD_ID}`.

   Impact: the main product launcher contradicts the target product model.

3. The Agent BFF does not expose Nullalis tasks, jobs, traces, artifacts, browser extension pairing, OpenAPI connector inventory, or brain documents.

   Evidence: `/Users/nova/Desktop/zaki-prod/backend/src/index.js` wires chat, sessions, approvals, cron, settings, voice, attachments, Telegram, and most Brain endpoints, but route search did not find BFF handlers for those missing families.

   Impact: high-value runtime capabilities exist but cannot become stable frontend UX without raw proxy leakage.

4. PowerUser diagnostics appear to call a frontend/backend path mismatch.

   Evidence: `/Users/nova/Desktop/zaki-prod/src/lib/api.ts` calls `/api/me/diagnostics/context` and `/api/me/diagnostics/memory-doctor`; route search in `/Users/nova/Desktop/zaki-prod/backend/src/index.js` found `/api/agent/diagnostics`, but not `/api/me/diagnostics/*`.

   Impact: context and memory diagnostics can silently fail or require an accidental legacy route. This should be fixed before promoting diagnostics into Run Details.

5. Brain documents exist upstream but are not surfaced in zaki-prod.

   Evidence: Nullalis exposes `GET brain/documents`; zaki-prod currently wraps graph, timeline, search, local graph, orphans, communities, diff, compose, memory detail, and me.

   Impact: document provenance is part of memory explainability and should feed Brain and Agent run context.

6. Product usage UI still has hard-coded product names in the power-user sheet.

   Evidence: `/Users/nova/Desktop/zaki-prod/src/app/components/agent/PowerUserSheet.tsx` still renders usage with fixed chat/agent/learning assumptions.

   Impact: it will drift as Hire, Design, CLI, local app, and extensions join the central meter.

7. Agent usage receipts are still estimated from the BFF stream.

   Evidence: `/Users/nova/Desktop/zaki-prod/backend/src/agent-metering.js` computes estimated usage facts from message/payload/SSE context.

   Impact: central meter is correctly authoritative, but Nullalis should eventually report raw usage facts for tokens, tool calls, API calls, duration, storage, and job runtime.

8. Extension auth is not production UX yet.

   Evidence: Nullalis extension docs still describe user-pasted internal token/user id setup, while the runtime currently wires only `extension_navigate`.

   Impact: browser control must stay gated until zaki-prod owns pairing, scoped extension tokens, revocation, device inventory, audit, STOP, and tool parity.

9. Artifact export is not ready.

   Evidence: Nullalis artifact export route exists but currently returns 501 until the `produce_document` bridge is wired.

   Impact: artifact list/get/share/diff can be activated first; export must stay hidden or clearly disabled.

## Backend Activation Contract

Add zaki-prod BFF wrappers for these Nullalis route families:

```text
GET    /api/agent/tasks
GET    /api/agent/tasks/:taskId
POST   /api/agent/tasks/:taskId/stop
GET    /api/agent/jobs
GET    /api/agent/traces
GET    /api/agent/traces/:runId
POST   /api/agent/traces/:runId/share
DELETE /api/agent/traces/:runId/share
GET    /api/agent/artifacts
GET    /api/agent/artifacts/:id
PUT    /api/agent/artifacts/:id
GET    /api/agent/artifacts/:id/history
GET    /api/agent/artifacts/:id/diff/:from/:to
POST   /api/agent/artifacts/:id/share
DELETE /api/agent/artifacts/:id/share
```

Do not expose raw generic proxy to the browser without a reviewed allowlist. These routes should follow existing BFF patterns:

- Resolve canonical ZAKI user id.
- Add internal Nullalis token.
- Forward request id.
- Keep user id server-bound.
- Validate ids at BFF boundary where useful.
- Buffer JSON routes with size limits.
- Use central product state/meter policy for expensive routes.

## Browser Extension Contract

zaki-prod should own:

- Pairing code.
- Scoped extension token.
- Token expiry.
- Revocation.
- Device inventory.
- Connected browser status.
- Audit event per browser command.
- UI status in Dashboard, Agent workbench, and Developer Access.

Nullalis should own:

- Command execution through ExtensionWsHub.
- Command result.
- Tool risk classification.
- Browser command event emission.

Hard production rule:

- No user copies internal tokens.
- No user copies user ids.
- Anonymous users cannot pair browser extension.
- Direct expensive extension commands without grant/trusted proxy context fail.

## OpenAPI Connector Contract

For V1:

- Keep specs operator-owned.
- Show connector inventory when configured.
- Record operation id/method/spec id in run timeline.
- Treat read/write classification as part of approval UX.
- Meter API calls as tool/external API usage.
- Keep user OAuth/native connector work as separate future contract.

## Memory Scope Contract

The user is correct that products can share a DB while keeping separate schemas/scopes. The important part is authority, not physical database count.

Required memory authorities:

| Scope | Authority | Notes |
| --- | --- | --- |
| Personal Brain | Agent/Brain | User-scoped, canonical long-term brain |
| Workspace Memory | Chat/Spaces | Space/project scoped |
| Learner Memory | Learn | Study profile, weak topics, plans |
| Hire Memory | Hire | Candidate/job/pipeline context |
| Design Memory | Design | Future design/project memory |
| Session Memory | Runtime | Ephemeral continuity, promotable by policy |

Rules:

- Canonical user authority is ZAKI user id.
- Email/thread/product-local id can be metadata, not authority.
- Cross-scope unification can come later through a memory control plane.
- Spaces memory should be kept only if it can meet provenance, export, delete, source, scope, and quality bars.

## What Not To Do

- Do not rebuild Nullalis features in zaki-prod.
- Do not bury Agent capabilities in Settings.
- Do not make Dashboard into a chat command center.
- Do not expose browser extension setup by internal token paste.
- Do not advertise full browser control until extension tool parity is wired.
- Do not let product services decide billing.
- Do not conflate product state with entitlement.
- Do not treat all memory as one undifferentiated bucket.

## Next Slices

### Slice A: Agent Workbench Route and Route Contract

Goal:

- Create `/agent` as the flagship app surface.
- Update product registry/Dashboard route to `/agent`.
- Reuse existing ChatArea streaming logic without rewriting runtime behavior.

Success:

- Dashboard opens Agent as Agent.
- Old Spaces/Bot path still works.
- Agent page has clear space for timeline, browser, tasks, artifacts, memory, usage.

### Slice B: Agent Runtime Facade Completion

Goal:

- Add BFF + API client wrappers for tasks, jobs, traces, artifacts.

Success:

- Frontend can fetch tasks/jobs/traces/artifacts without raw proxy leakage.
- Existing Nullalis id validation/security posture is preserved.
- Tests cover route mapping and unauth/auth boundaries.

### Slice C: Durable Run UX

Goal:

- Promote live SSE timeline into durable run history/detail.

Success:

- User can inspect a past run.
- Run detail shows tools, approvals, tasks, memory, artifacts, usage, and errors.
- Shareable traces remain sanitized and clearly scoped.

### Slice D: Browser Activation

Goal:

- Productize server browser and extension-controlled user browser.

Success:

- User sees browser status and STOP.
- Pairing uses scoped tokens.
- Browser commands are auditable and metered.
- Extension only claims capabilities that are wired.

### Slice E: Artifacts and Work Products

Goal:

- Add Agent artifacts panel.

Success:

- Agent-created outputs are visible outside chat.
- Artifact history/diff/share work through BFF.
- Export remains hidden or disabled until the 501 bridge is resolved.

### Slice F: OpenAPI/Connector Activation

Goal:

- Show structured API connector capability without confusing it with OAuth.

Success:

- Configured API specs appear under Agent connectors/Developer Access.
- API calls appear in run details and central usage.
- Mutating operations require approval.

## Competition Readiness Definition

ZAKI Agent is competition-ready when:

- The flagship product opens at `/agent`.
- Users can understand what the agent is doing while it works.
- Browser control is visible, stoppable, paired securely, and auditable.
- Memory is visible, scoped, explainable, and controllable.
- Artifacts are first-class outputs.
- Background tasks and scheduled jobs do not disappear.
- API/tool/browser actions have approval, audit, and usage records.
- Central meter is the only billing authority.
- Settings is MECE and global.
- Agent-local controls are minimal and work-focused.
- Every important Nullalis capability has either a product surface, a clear beta gate, or an explicit "not in V1" decision.
