# Nullalis User Config Surface Map

Date: 2026-05-30
Owner: ZAKI app finalization orchestrator
Source checkout: `/Users/nova/Desktop/nullalis` at `main` commit `b7d1eb4b`

Companion app activation map:
`docs/zaki-client-value-activation-map-2026-05-30.md`

## Purpose

Map Nullalis code truth to ZAKI Settings and product surfaces so the V2 app
exposes every production-grade user-facing capability without leaking
operator-only runtime config.

## Baseline Read

Nullalis main includes the production-readiness sprint line:

- S1 memory privacy / PII purge
- S2 approval consolidation
- S3 durable trace share records
- S4 extension browser readiness
- S5 observability and SLOs
- S6 verification matrix

Backend readiness baseline:

`/Users/nova/Desktop/nullalis/docs/operations/v1-readiness-report.md`

## Configuration Planes

Nullalis already defines the right authority split in
`docs/config-authority-map.md`.

| Plane | Owner | ZAKI UI Treatment |
|---|---|---|
| Operator plane | Deployment/Helm/runtime config | Read-only health/status in operator pages. Do not expose as user settings. |
| Tenant preference plane | User/product UX | Route-level Settings fields. |
| Tenant integration plane | User/channel onboarding | Settings Connections, Channels, Secrets, Browser Devices. |
| Derived plane | Runtime only | Status/diagnostics only; never persisted from UI. |

## Tenant Preference Settings

Code source:

- `/Users/nova/Desktop/nullalis/src/user_settings.zig`
- `GET|PATCH /api/v1/users/{id}/settings`
- ZAKI BFF aliases: `/v1/me/bot/settings`, plus app API wrappers in
  `src/lib/api.ts`

Current user-writable fields in code:

| Field | Values / Type | Product Meaning | ZAKI Surface |
|---|---|---|---|
| `assistant_mode` | `fast`, `balanced`, `deep` | Runtime preset / speed vs depth | Agent runtime defaults |
| `group_activation` | `mention`, `always` | Group/channel response policy | Channels / Agent runtime defaults |
| `proactive_updates` | boolean | Allow proactive outbound updates | Notifications / Agent defaults |
| `voice_replies` | boolean | Enable TTS/audio replies | Voice / Channels |
| `session_timeout_minutes` | 5-180 | Agent idle session TTL | Agent runtime defaults |
| `autonomy` | `read_only`, `supervised`, `full` | Tool approval posture | Agent runtime defaults |
| `dream_enabled` | boolean | Nightly memory reflection job | Memory & Brain |
| `query_expansion_enabled` | boolean | LLM query expansion for recall | Memory & Brain |
| `selected_model` | allowlisted model id or null | Per-user model picker | Models & Providers / later composer chip |

Important gap:

`docs/openapi-v1.yaml` still documents only the older five ProductSettings
fields. The Zig code and ZAKI TS types include the newer fields. Before final
API lock, the backend docs should be synced for `autonomy`, `dream_enabled`,
`query_expansion_enabled`, and `selected_model`.

## Secrets Vault

Code/doc sources:

- `/Users/nova/Desktop/nullalis/src/gateway/secret_vault.zig`
- `/Users/nova/Desktop/nullalis/src/zaki_state.zig`
- `/Users/nova/Desktop/nullalis/docs/state-secrets-wiring.md`
- ZAKI BFF: `/api/agent/secrets`, `/api/agent/secrets/:key`

Nullalis contract:

- `GET /api/v1/users/{id}/secrets` lists keys.
- `GET /api/v1/users/{id}/secrets/{key}` returns metadata only, never value.
- `POST /api/v1/users/{id}/secrets/{key}/prepare` issues a short confirmation
  token.
- `PUT /api/v1/users/{id}/secrets/{key}` writes value with confirmation token.
- `DELETE /api/v1/users/{id}/secrets/{key}` deletes with confirmation token.
- `GET /api/v1/users/{id}/secrets/{key}/audit` lists recent mutations.

ZAKI status:

- BFF already hides the prepare token from the browser for PUT/DELETE.
- ZAKI Settings currently lists keys and supports add/rotate/delete.
- Missing: BFF route for secret audit metadata; connection-test flows per key.

Settings target:

- Metadata-only secret rows.
- Add/rotate flow.
- Delete with explicit confirmation.
- Audit trail once exposed through the BFF.
- Test actions only when a concrete provider/channel contract exists.

## Channels

Code/doc sources:

- `/Users/nova/Desktop/nullalis/src/channels/`
- `/Users/nova/Desktop/nullalis/docs/ui-handoff.md`
- `/Users/nova/Desktop/nullalis/docs/openapi-v1.yaml`

Channel implementations exist for Telegram, Slack, Discord, Email, Teams,
WhatsApp, Signal, Line, Lark, Matrix, iMessage, IRC, Nostr, OneBot, QQ,
Mattermost, MaixCam, and CLI depending on build/config.

Launch interpretation from `src/channels/root.zig`:

- V1 keeper/default set: CLI, Telegram, Discord, Slack, WhatsApp, Email, and
  MaixCam.
- Public-launch now: Telegram.
- Launch next after contract hardening: Slack, Discord, Email, then WhatsApp.
- Hidden/niche: MaixCam until the product story is clear.
- Future client: CLI belongs in Developer Access later.
- Hidden until deliberately promoted: Teams, Signal, Line, Lark, Matrix,
  iMessage, IRC, Nostr, OneBot, QQ, Mattermost.

Production user routes currently documented and wired:

- Telegram connect/disconnect:
  `/api/v1/users/{id}/channels/telegram/connect`
  `/api/v1/users/{id}/channels/telegram/disconnect`
- Channel identity bindings:
  `/api/v1/users/{id}/channels/{channel}/bindings`
  `/api/v1/users/{id}/channels/{channel}/bindings/{binding_id}`

ZAKI status:

- Telegram is bridged through `/v1/me/bot/telegram/*` and
  `/api/agent/channels/telegram/*`.
- Other channels should appear as read-only/coming-soon rows until BFF has
  status, validate, connect, test, disconnect, and binding flows.

Settings target:

- Channels tab owns channel connection state.
- Product surfaces may show quick status and deep-link to Settings.
- Do not keep Telegram setup as an Agent-only sheet long term.

### Agent Channel Wiring Verdict

Fully mapped today:

- Telegram has ZAKI BFF routes, TS client helpers, Settings rows, and the
  downstream Nullalis connect/disconnect routes.

Partially mapped today:

- Nullalis exposes generic channel identity bindings, but ZAKI does not yet
  expose productized BFF routes for listing, binding, or revoking identities per
  channel.
- ZAKI now contains the first BFF/UI pass for Telegram/Slack/Discord/Email
  status and identity bindings.

Not production-mapped in ZAKI today:

- Slack, Discord, Email direct self-service connect/test/disconnect; WhatsApp;
  Teams; Signal; Line; Lark; Matrix; iMessage; IRC; Nostr; OneBot; QQ;
  Mattermost; MaixCam; and CLI.

Product priority within that list:

- Slack, Discord, and Email need direct self-service connection contracts.
- WhatsApp deserves the next backend contract review.
- CLI belongs to Developer Access later.
- MaixCam remains hidden until the product story is clear.
- Teams is enterprise backlog because code/docs mention it but V1 keeper status
  is not settled.
- The remaining adapters stay hidden.

Required central contract before these become user-facing:

- `GET /api/agent/channels` for status and capability flags.
- `POST /api/agent/channels/{channel}/connect` for provider-specific connect.
- `POST /api/agent/channels/{channel}/test` for a safe connection test.
- `POST /api/agent/channels/{channel}/disconnect` for revocation.
- `GET|POST|DELETE /api/agent/channels/{channel}/bindings` for identity
  bindings.

The browser extension is not a chat channel. It belongs to Browser Extension &
Devices: diagnostics are mapped, while pairing, revocation, and device inventory
still need a product contract.

## Browser Extension

Code/doc sources:

- `/Users/nova/Desktop/nullalis/src/extension_ws/`
- `/Users/nova/Desktop/nullalis/docs/extension-ws-contract.md`

Production contract:

- Extension WebSocket endpoint: `GET /api/v1/extension/ws`
- Diagnostics:
  `/api/v1/diagnostics/extension/status`
  `/api/v1/diagnostics/extension/users/{user_id}`
- Ten tools: `extension_navigate`, `extension_click`, `extension_type`,
  `extension_fill_form`, `extension_screenshot`, `extension_get_text`,
  `extension_get_dom`, `extension_wait_for`, `extension_scroll`,
  `extension_list_tabs`.

ZAKI status:

- Per-user diagnostics are bridged through `/api/agent/diagnostics/extension`.
- Missing: end-user pairing, revocation, token/device inventory.

Settings target:

- Browser Extension & Devices owns pairing status, installed/device inventory,
  revoke, reconnect, and troubleshooting.
- Agent Browser panel shows live run status and deep-links to Settings.

## Model Providers And OpenAI-Compatible APIs

Code/doc sources:

- `/Users/nova/Desktop/nullalis/src/providers/`
- `/Users/nova/Desktop/nullalis/src/providers/compatible.zig`
- `/Users/nova/Desktop/nullalis/src/agent/model_capabilities.zig`
- `/Users/nova/Desktop/nullalis/src/user_settings.zig`

Production truth:

- User can select an allowlisted model via `selected_model`.
- Provider routing, API keys, fallback providers, and custom OpenAI-compatible
  endpoints are operator/runtime config today.
- Generic OpenAPI tool ingestion exists, but user credential binding through
  secret-vault `auth_ref` is deferred in Nullalis.

Settings target:

- V1: show model selection and operator-provider readiness truthfully.
- V1: do not ship arbitrary BYOK/provider profile create/test/delete without a
  safe BFF contract.
- Next slice: define the Provider Profile contract with vault-backed secrets:
  label, provider kind, base URL, auth secret ref, model allowlist, test result,
  policy state.

## Memory And Brain

Code/doc sources:

- `/Users/nova/Desktop/nullalis/src/memory/`
- `/Users/nova/Desktop/nullalis/src/tools/memory_*.zig`
- `/Users/nova/Desktop/nullalis/src/tools/brain_graph.zig`
- ZAKI BFF brain routes in `backend/src/index.js`

User-facing capabilities:

- Memory store, recall, timeline, doctor, forget, purge PII, graph traversal.
- Brain routes: graph, local graph, orphans, diff, communities, recompute,
  timeline, search, documents, memory detail, self anchor, compose.

ZAKI status:

- Brain BFF routes are broad and mostly present.
- Brain V2 surface still needs visual completion and governance actions.
- Settings should deep-link to Brain for memory review/governance instead of
  duplicating partial Brain controls.

## Automations And Jobs

Code/doc sources:

- `/Users/nova/Desktop/nullalis/src/tools/cron_*.zig`
- `/Users/nova/Desktop/nullalis/src/tools/schedule.zig`
- Gateway routes: `/api/v1/users/{id}/cron`, `/api/v1/users/{id}/jobs`

ZAKI status:

- BFF exposes `/api/agent/cron` CRUD-like facade and `/api/agent/jobs`.
- Agent right panel has Cron tab.

Settings target:

- Settings can own global scheduled work list later.
- Agent panel owns in-flow automation visibility for the active agent.

## Data And Privacy

User-facing/account-level:

- Export account data in ZAKI app.
- Delete account/data through ZAKI backend and Nullalis GDPR purge.
- PII memory purge for phone/email via `memory_purge_pii`.

Hidden V1 claims:

- Address/name PII detection.
- PII at-rest encryption for `pii_tagged` rows.
- Bi-temporal contradiction classifier.
- Per-cell isolated pods.

## Immediate Product Mapping

| ZAKI Settings Section | Backend Truth To Bind |
|---|---|
| Agent Runtime Defaults | `/v1/me/bot/settings`: assistant_mode, autonomy, session timeout |
| Models & Providers | `selected_model`; operator provider readiness; provider profile contract later |
| Channels | Telegram connect/disconnect; Slack/Discord/Email bindings/status; WhatsApp contract next |
| Secrets & API Keys | `/api/agent/secrets*`; metadata-only vault |
| Browser Extension & Devices | `/api/agent/diagnostics/extension`; pairing contract needed |
| Memory & Brain | `dream_enabled`, `query_expansion_enabled`, Brain route deep links |
| Developer Access | Future CLI/local/extensions tokens; do not claim complete |
| Privacy & Data | export/delete; memory PII purge once BFF action exists |

## Backend Follow-Up Requests

1. Sync Nullalis `docs/openapi-v1.yaml` ProductSettings with code.
2. Expose BFF route for secret mutation audit if we want audit rows in Settings.
3. Define browser extension pairing/revocation API, not only diagnostics.
4. Define provider profile/BYOK/OpenAI-compatible API contract with vault-backed
   secret refs.
5. Expose memory governance actions from ZAKI BFF if not already present:
   forget, purge PII dry-run/apply, export memories.
6. Add channel connect/test/disconnect contracts for Slack, Discord, Email, and
   WhatsApp using vault-backed secret refs.
7. Reconcile Teams docs/config/build status before any user-facing Teams claim.
