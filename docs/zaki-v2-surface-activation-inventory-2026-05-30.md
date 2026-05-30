# ZAKI V2 Surface Activation Inventory

Date: 2026-05-30

Purpose: turn the current ZAKI prod + Nullalis code truth into a user-facing activation map. A backend feature is not product-ready until it is surfaced in the app, routed through the ZAKI BFF, tested end to end, and represented truthfully in Settings, Agent, Brain, or operator-only pages.

## Readiness Rule

Production-ready means all five are true:

1. The Nullalis/backend route or tool exists and is documented.
2. ZAKI prod exposes the route through a stable authenticated BFF API.
3. The relevant UI surface lets the user see, configure, run, stop, revoke, or inspect it.
4. Failure states are named, user-safe, and visible.
5. A signed-in E2E test covers the flow against the local gateway.

Client-side affordance alone does not count. Backend readiness alone does not count.

## Current Code Truth

### SaaS Spine Smoke Status

Local signed-in smoke on 2026-05-30 now confirms:

- `/ready` reports BFF ready, database connected, and Learning ready; Design remains intentionally not configured.
- Public `/api/meter/status` issues a durable anonymous session and Free meter snapshot.
- Signed-in `/api/entitlements`, `/api/usage/summary`, `/api/meter/status`, and `/api/usage/quota?surface=learning` resolve the same effective plan for the local test account: Personal via access-code/local entitlement.
- Billing config, product registry, central meter, learning usage, agent extension diagnostics, artifact list, trace list, and secret vault all return 2xx locally.
- Root and backend dependency audits are clean after the non-forcing npm audit fix; backend audit reports 0 vulnerabilities.

### Route-Level Surfaces

- `/` is the signed-in Dashboard and should remain the command center.
- `/agent` is the flagship ZAKI Agent workbench.
- `/brain` is the Personal Brain/graph memory surface.
- `/settings` exists as a route-level V2 surface.
- `/learn`, `/design`, and private-beta product surfaces exist or are represented, but V1 public exposure should stay gated.

### Settings Today

`src/app/components/settings/SettingsPage.tsx` currently covers:

- Account profile and language/theme.
- Google OAuth status.
- Billing, entitlements, product registry, product states, central meter usage.
- Channels control-plane rows for Agent Telegram, private-beta Learning tutor channels, and operator-managed Slack/Discord/Teams/Email.
- Secrets & API keys with write-only add/rotate and delete through the Agent secret-vault BFF.
- Models/providers readiness rows for operator routing, OpenAI-compatible provider profiles, and OpenAPI connectors.
- Browser extension/device diagnostics using the per-user extension BFF route.
- Agent memory toggles: dream reflection and query expansion.
- Product/client registry rows for CLI/local/extensions.
- Export account data and delete account.

Still missing from route-level Settings:

- Full channel binding management for non-Telegram channels.
- Secret test/audit metadata once the BFF exposes last-used/test/audit fields.
- User-managed BYOK/provider profile create/test/delete.
- Generic OpenAI-compatible API/provider configuration with safe profile storage.
- OpenAPI connector configuration with vault-backed `auth_ref`.
- Browser extension pairing/revocation and device inventory.
- Agent runtime defaults as a focused settings section.
- SaaS confidence status for these controls: backend/BFF foundations exist for Google OAuth, central meter, billing config, product registry, agent secrets, Telegram connect/disconnect, learning channel schema, and extension diagnostics; route-level Settings now exposes the control-plane status and only enables actions already backed by contracts.

### Agent Today

The Agent surface has strong runtime plumbing:

- Per-turn controls for mode, autonomy, assistant mode, and reasoning effort.
- Attachments uploaded into the Agent workspace.
- SSE parsing for narration, tool start/result, approvals, artifacts, system notices, and done.
- Approval cards with stable approval IDs.
- Inspector rail tabs for plan, cron, sources, artifacts, browser, and trace.
- Runtime facades for cron, artifacts, traces, tasks, diagnostics, context, and memory doctor.

Confirmed gaps:

- Stop now calls `POST /api/agent/sessions/:sessionKey/cancel` before client abort. The route is represented in the BFF contract and `src/lib/api.ts` exposes `cancelAgentSession`.
- Extension diagnostics are bridged through `GET /api/agent/diagnostics/extension` and return per-user paired/disconnected/last-command state.
- Agent browser UI distinguishes app browser and extension activity visually, but pairing/revocation/status is not productized.
- The old Agent settings sheet still owns channel setup, while global Settings should own channel/account-level configuration.
- The old secrets sheet still tries to reveal stored values; Nullalis D8 changed secrets to metadata-only GET.

### Brain Today

The Brain route is real and has meaningful backend coverage:

- Graph, local graph, orphan facts, diff, communities, recompute, timeline, search, memory detail, self anchor, and compose routes are proxied through ZAKI prod.
- URL state, search debounce, filters, overlays, keyboard shortcuts, and compose-from-selection exist.

Remaining product work:

- Bring the surface fully to V2 visual parity with the design system.
- Add user-facing memory governance actions around forget, purge PII, export, and source/provenance where supported.
- Add E2E coverage for graph/timeline/search/panel/compose/empty/error states.
- Ensure Settings Memory & Brain links to the canonical Brain actions instead of duplicating partial controls.

## Nullalis Capabilities That Need User Surfaces

### Channels

Backend code supports a broad channel catalog. Active/available families include Telegram, Discord, Slack, Webhooks, WhatsApp, Email, Matrix, iMessage, and MaixCam, with other channels marked coming soon or build-flag dependent.

ZAKI user-facing rule:

- Global Settings owns channels.
- Product-specific surfaces can show quick status and deep links only.
- Only show channels as connectable when the ZAKI BFF can list status, validate required inputs, connect/test/disconnect, and preserve secret fields safely.

First Settings implementation should include:

- Telegram: connect/disconnect/status, because BFF routes already exist.
- Read-only registry rows for other available channels until BFF connect/test/disconnect contracts are exposed.
- Clear hidden/coming-soon treatment for unsupported channels.

### Secrets Vault

Nullalis secret vault is two-phase and metadata-only after save. Production UX should not reveal saved secret values.

Current smoke status:

- `PUT /api/agent/secrets/:key`, `GET /api/agent/secrets`, metadata `GET /api/agent/secrets/:key`, and `DELETE /api/agent/secrets/:key` pass locally through the ZAKI BFF.
- Saved values are not returned by metadata GET.

Settings should own:

- Add or rotate secret.
- Delete secret with confirmation.
- Show metadata: key, created/updated time, last tested/used if exposed.
- Show audit events when BFF exposes `/audit`.
- Test connection for secrets that belong to channels/providers/connectors.

Agent-local secret sheet should be removed or replaced by a link to Settings.

### Model Providers And OpenAI-Compatible APIs

Nullalis has a large OpenAI-compatible provider layer, including named providers and `custom:<url>`. This is currently runtime/config/provider-layer capability, not a complete user self-service product surface in ZAKI prod.

Settings should eventually own:

- Provider profiles: label, provider kind, base URL, auth style, model allowlist, default model, cost/limits.
- Secret reference: API key stored in the vault, not plain UI state.
- Test call: validate credentials and model availability.
- Policy: whether the provider is operator default, user BYOK, private beta, or disabled.

Do not ship this as a simple model picker. It needs a BFF/control-plane contract first.

### OpenAPI Connector

Nullalis has a generic OpenAPI connector for arbitrary REST APIs via `api_specs`. V1 credentials are currently environment-variable based; secret-vault integration is deferred in Nullalis as D47.

ZAKI user-facing rule:

- Do not expose end-user API connector configuration until `auth_ref` can resolve through the vault or ZAKI prod owns an equivalent safe profile store.
- Settings may show an operator-managed “API connectors” read-only inventory later, but not user-managed credentials yet.

### Browser Extension

Nullalis S4 ships extension diagnostics and all ten extension tools through a mock/live-equivalent backend contract.

ZAKI still needs:

- Pairing flow owned by ZAKI prod.
- Revocation and device inventory.
- Per-user status BFF bridge.
- Agent Browser panel binding to paired/disconnected/timeout/last-command state.
- E2E flow for disconnected, paired, command failure, and successful browser tool events.

## MECE Settings Target

Route-level Settings should be the canonical control plane:

1. Account & Security
2. Billing & Usage
3. Products & Access
4. Connections
5. Channels
6. Secrets & API Keys
7. Models & Providers
8. Browser Extension & Devices
9. Memory & Brain
10. Developer Access
11. Privacy & Data

Agent product settings should stay minimal:

- Runtime defaults: mode, autonomy, reasoning effort, assistant mode.
- Approval posture and live run behavior.
- Browser lane quick status.
- Links to global Channels, Secrets, Providers, Memory, and Developer Access.

## Next Execution Slices

### Slice A — Agent Action Coverage Closeout

Goal: every visible Agent control is backend-owned and E2E tested.

Work:

- Keep `POST /api/agent/sessions/:sessionKey/cancel` and `cancelAgentSession()` under regression coverage.
- Keep `GET /api/agent/diagnostics/extension` under regression coverage.
- Audit and test buttons: mode, autonomy, reasoning, approval approve/deny/modify, attachment upload, artifact share/export/open, trace share/open, cron open/create/edit/delete, browser panel, session export/delete/compact.
- Playwright signed-in desktop and mobile pass for `/agent`.

### Slice B — Settings Control Plane Expansion

Goal: Settings exposes account-level Agent capabilities without V1 sheet residue.

Work:

- Add V2 sections/components for Channels, Secrets, Models & Providers, Browser Extension & Devices, and API Connectors.
- Move Telegram from Agent sheet into Settings Channels.
- Convert Secrets Vault to metadata-only rotate/delete/test/audit UX.
- Keep unsupported provider/API connector actions disabled or hidden until contracts exist.
- Add Jest and Playwright coverage for every section.

### Slice C — Brain V2 Completion

Goal: Brain becomes the canonical user memory surface.

Work:

- Finish V2 parity against the design files.
- Add memory governance actions where backend supports them: forget, purge PII, provenance/detail, export/deep link.
- Verify graph/timeline/search/communities/orphans/compose flows.
- Add desktop and mobile visual QA for `/brain`.

### Slice D — Cross-Surface Release Matrix

Goal: no public feature claim without a passing test.

Work:

- Build a ZAKI app E2E matrix for Dashboard, Agent, Settings, Brain.
- Include signed-in local gateway flow and backend failure-mode visibility.
- Capture screenshots for desktop 1440x1000 and mobile 390x844.
- Lock public visibility: Agent, Chat, Brain public; Learn/Hire private beta; Design waitlist/early access.

## Immediate Priority

Continue Slice A into a signed-in action matrix, then move immediately to Slice B. The remaining SaaS confidence gap is no longer the central meter or secret-vault plumbing; it is route-level Settings ownership of Channels, Secrets/API keys, provider profiles, browser extension devices, and clear private-beta gating.
