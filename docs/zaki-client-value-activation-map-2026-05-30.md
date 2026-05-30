# ZAKI Client Value Activation Map

Date: 2026-05-30
Owner: ZAKI V2 finalization orchestrator

## Purpose

This scan treats every backend capability as product debt until one of four
decisions is explicit:

1. Surface it to the user with BFF wiring, UI, named failure states, and E2E.
2. Gate it behind private beta or early access.
3. Keep it operator-only.
4. Hide it because the contract, safety model, or product story is not ready.

The scan started with channels, then covered ZAKI prod, the Agent BFF,
Nullalis tools/routes, Brain/memory, Learning, Design, Spaces/Chat, platform
billing/metering, admin/operator routes, and website/public endpoints.

## Sources Scanned

- App checkout: `/Users/nova/Desktop/zaki-prod-agent`
- Backend checkout: `/Users/nova/Desktop/nullalis`
- ZAKI BFF route table: `backend/src/index.js`
- Platform registry/meter: `backend/src/platform-policy.js`,
  `backend/src/platform-meter.js`
- App API clients: `src/lib/api.ts`, `src/lib/learningApi.ts`,
  `src/lib/designApi.ts`
- Agent Settings/UI surfaces: `src/app/components/settings/SettingsPage.tsx`,
  `src/app/components/ChatArea.tsx`, `src/app/components/InputArea.tsx`,
  `src/app/components/chat/*`, `src/app/components/agent/*`
- Nullalis channel catalog: `src/channels/root.zig`,
  `src/channel_catalog.zig`, `src/config_types.zig`
- Nullalis HTTP contract: `docs/openapi-v1.yaml`
- Nullalis UI handoff: `docs/ui-handoff.md`
- Nullalis production readiness report:
  `docs/operations/v1-readiness-report.md`

## Activation Classes

| Class | Meaning | UI rule |
|---|---|---|
| Launch | Ready enough for public V1 | User can configure, run, revoke, and see failures |
| Partial | Backend exists but client contract is incomplete | Show status/read-only only, or hide the action |
| Private beta | Product is real but not public | Gate behind beta state and early-access copy |
| Operator-only | Runtime/deployment config, not a user setting | Hidden operator page only |
| Hidden | Code exists, but product or safety story is weak | No public claim |

## Channels First

Nullalis has a broad channel catalog, but the V1 default and comments identify a
much narrower product set. ZAKI should not expose every adapter just because the
code exists.

| Channel | Backend truth | ZAKI surface today | Verdict | Product action |
|---|---|---|---|---|
| Telegram | V1 keeper; OpenAPI has connect/disconnect plus bindings | Settings has direct connect/disconnect, status, and bindings | Launch | Keep. Move any remaining Agent-only setup into Settings deep links |
| Slack | V1 keeper; config, events route, bindings, adapter code | Settings has status + bindings; runtime app creds are operator-managed | Partial | Add self-service connect/test/disconnect contract before claiming full user setup |
| Discord | V1 keeper; gateway config, bindings, adapter code | Settings has status + bindings; runtime app creds are operator-managed | Partial | Same as Slack |
| Email | V1 keeper; IMAP/SMTP config and adapter code | Settings has status + bindings; runtime mailbox creds are operator-managed | Partial | Add mailbox profile contract with vault refs and test action |
| WhatsApp | V1 keeper; webhook route documented, adapter present | Not surfaced | Candidate | Add connect/test/disconnect and product copy before surfacing |
| MaixCam | V1 keeper; niche/send-only value | Not surfaced | Hidden for V1 | Keep internal until there is a product story |
| Teams | Code/config/docs mention it, but it is not in the V1 keeper/default list | Not surfaced | Enterprise backlog | Do not expose until build/config status is reconciled |
| CLI | Built-in channel/client path | Product registry has future client | Future | Developer Access later, not a launch channel |
| Signal, iMessage, Matrix, Mattermost, IRC, Line, Lark, OneBot, QQ | Root comments mark many as delete-eligible or flag-gated; some webhook docs exist | Not surfaced | Hidden | Keep out of V1 UX |
| Nostr | Adapter/config exists outside the V1 keeper set | Not surfaced | Hidden | Keep out of V1 UX |

Channel ownership:

- Global Settings owns channel configuration, identity bindings, secrets, and
  tests.
- Agent can show quick status and deep-link to Settings.
- Learning tutor channels stay product-specific and private beta.
- Browser extension is not a chat channel; it belongs in Browser Extension &
  Devices.

## Platform And Commercial Spine

Code truth:

- Product ids: `spaces`, `agent`, `learn`, `hire`, `design`, `brain`, `cli`,
  `local_app`, `extensions`.
- Plan ids: Free, Personal, Pro, Pro MAX.
- Product states are operational, not billing entitlement.
- Meter policy has product weights and capability weights.
- Weekly allowance is non-rollover and is anchored by the current metering
  policy implementation.
- BFF routes exist for auth, profile, legal consent, entitlements, central
  meter, grants, receipts, usage, billing config, checkout, portal, cancel,
  account export, account delete, and access-code redemption.

Client value to surface:

- Dashboard: plan, weekly allowance, rolling 5-hour allowance, product states,
  reset times, and beta/waitlist states.
- Settings Billing & Usage: plan, receipts, quota, billing portal, cancellation,
  payment status, product access.
- Settings Products & Access: launch products, beta products, future clients.
- Operator page: access codes, student verification, rate limits, admins,
  waitlist, telemetry, product states, backend health.

Gaps:

- Public feedback/waitlist/telemetry endpoints still need production rate-limit
  confidence before the website is final.
- Operator page must be hidden and guarded for `as@novanuggets.com`.
- Product registry says Learn is enabled, but strategy says Learn is private
  beta. The launch UI must gate it even when the operational state is enabled.

## Agent

Backend/user value already present:

- Chat streaming, SSE event grammar, narration/progress/reasoning/tool events.
- Session mode switching, active turn cancel, approvals, session history,
  session detail, compact/export/delete.
- Attachments with idempotency.
- Artifacts: list, get, update, history, diff, share, revoke share, export,
  download.
- Traces: list, get, share, revoke, public share viewer.
- Cron/automations: list, add, update, remove, run, runs.
- Tasks/jobs: list, detail, stop where supported.
- Browser extension diagnostics and ten extension tools.
- Voice transcribe/synthesize.
- Secret vault metadata/write-only storage.
- Channel status and identity bindings.
- Context diagnostics and memory doctor.
- Brain deep links through memory/graph routes.

Client value already surfaced or partly surfaced:

- Agent composer controls for mode, autonomy, assistant mode, reasoning effort.
- Attachments, approvals, stop/cancel, sessions, inspector rail, artifacts,
  traces, cron, browser diagnostics, runtime panels.
- Settings exposes Telegram/Slack/Discord/Email channel status and bindings,
  secret rows, provider readiness rows, extension diagnostics, and memory
  toggles.

Remaining Agent activation work:

1. Complete action-by-action E2E for every visible button.
2. Confirm downstream mode/autonomy/reasoning/settings consumption with local
   gateway logs and API responses.
3. Finish extension pairing, revocation, and device inventory. Diagnostics are
   not enough.
4. Add artifact open/export/download/share/revoke flows to the UI test matrix.
5. Add trace share/open/revoke flows to the UI test matrix.
6. Add cron create/edit/delete/run flows to the UI test matrix.
7. Add memory governance actions: forget topic, purge PII dry-run/apply, export
   memories when exposed through ZAKI BFF.
8. Make the context meter reflect real token pressure, not only decorative
   status.
9. Surface Composio, OpenAPI connectors, and MCP as either configured,
   operator-managed, or hidden. Do not imply user self-service until contracts
   exist.
10. Keep model picker deferred until strategy and provider profile contracts are
    settled.

## Brain And Memory

Code truth:

- Nullalis memory tools include store, recall, list, timeline, edit, forget,
  purge topic, purge PII, maintain, doctor, and graph traversal.
- ZAKI BFF proxies graph, local graph, orphans, diff, communities, recompute,
  timeline, search, documents, memory detail, self anchor, and compose.
- Legacy Spaces memory still exists in ZAKI prod with capture, confirmation,
  conflict, activity, events, undo, and viewer routes.
- Agent disables the legacy Spaces memory pipeline for the ZAKI Bot path.

Client value to surface:

- Brain must become the canonical personal memory control plane.
- Settings Memory & Brain should only expose global toggles and links to
  canonical Brain actions.
- User-scoped memory must show provenance, source, confidence, recency, and
  delete/purge actions.
- Workspace/Spaces memory should be a separate governed workspace memory if it
  survives. It should not be mixed with Agent memory or Learning memory.

Gaps:

- Brain needs full V2 visual completion.
- Memory governance actions are not yet route-level product UX.
- Spaces memory is still weaker than Agent memory. Keep it disabled for Agent
  and either harden it into Workspace Memory or keep it session/workspace-only.
- Brain community/orphan/diff behavior needs current local gateway E2E before
  final public claims.

## Spaces / Chat

Code truth:

- AnythingLLM-derived workspace/thread/chat/upload routes still exist.
- Workspaces can be created, updated, deleted, threaded, uploaded, embedded,
  and shared through legacy routes.
- Spaces/Chat uses its own workspace memory scope in the platform registry.

Client value to surface:

- Public V1 can expose Chat/Spaces as a lightweight chat/workspace product.
- Workspace memory must be described as workspace context, not Agent Brain.
- Main navigation naming needs a product decision: keep Spaces for URL/history
  continuity or rename the visible product to ZAKI Chat.

Gaps:

- Workspace memory governance is not S-tier yet.
- Chat/Spaces V2 visual parity remains after Agent and Brain.
- The legacy route set must not leak old AnythingLLM product language.

## Learning

Code truth:

- Learning BFF is extensive: study profile/plans/tasks, sessions, dashboard,
  plugins, books/spine/pages, knowledge bases/files/progress, notebooks,
  records, co-writer, questions, skills/tags, memory refresh/clear, tutor
  agents, tutor channels schema/history/files/turns, solve sessions, and vision.
- Learning usage is connected to central usage/quota.
- Learning memory is distinct from Agent memory and workspace memory.

Client value to surface:

- Keep Learning private beta.
- Give beta users a V2 surface for study plan, active task, knowledge base,
  tutor session, generated outputs, notebooks, and tutor channel status.
- Settings should show Learning access and beta state, but not public-launch it.

Gaps:

- V2 product chrome and beta gating need final integration.
- Learning channel configuration must stay product-specific unless it is a
  global channel identity.
- E2E needs local Learning engine coverage before any public claim.

## Design

Code truth:

- Design BFF has health, project list, and create project routes.
- Design is intentionally disabled/not configured in local readiness.
- Product registry includes Design with disabled state.

Client value to surface:

- Public V1 should show Design as early access/waitlist only.
- The surface can collect interest and explain status, but it must not claim a
  working design engine unless configured.

Gaps:

- No public working product claim until backend is configured and E2E exists.
- Settings Products & Access should show waitlist/early access state.

## Hire

Code truth:

- Hire work is in a separate branch/worktree and should integrate through the
  central product registry and meter contracts.
- Product registry includes Hire as disabled/future with its own memory scope.

Client value to surface:

- Keep Hire private beta.
- It must report raw usage facts to the central meter, not own billing logic.
- Settings should show beta access state when the branch is merged.

Gaps:

- Do not merge Hire UI without central meter, entitlement, memory, and V2
  product-chrome review.

## Developer Clients And Integrations

Code/backend truth:

- Product registry already names CLI, Local App, and Extensions.
- Nullalis has Composio, OpenAPI tool, MCP mentions, provider routing, and
  OpenAI-compatible provider support.
- Secret vault exists, but user-managed connector/provider profiles are not
  complete product contracts yet.

Client value to surface:

- Developer Access should eventually own CLI/local app tokens, extension setup,
  API keys, and connector inventory.
- Settings Models & Providers should show only what is actually configurable by
  the user.
- Operator-managed integrations should be read-only status rows or hidden.

Gaps:

- Provider profile contract needed: label, provider kind, base URL, model
  allowlist, secret ref, test result, policy state.
- OpenAPI connector contract needed: spec registration, auth ref, test result,
  allowed scopes, revoke.
- Composio user-facing connection model needs a clear auth/session contract.

## Website And Public Endpoints

Code truth:

- Website feedback, beta waitlist, telemetry, and public share routes exist.
- Admin routes can inspect waitlist, telemetry, billing memory, rate limits,
  access codes, admins, and student verification.

Client value to surface:

- Website should sell Agent as the main consumer product.
- Learn and Hire are private beta.
- Design is early access/waitlist.
- Dashboard and app should be in English for V1; Arabic dashboard can remain as
  the lean bilingual exception.

Gaps:

- Website comes after app surfaces are truthful.
- Public endpoint rate limiting must be verified before launch.
- Public claims must match the launch surface: Agent, Chat/Spaces, Brain;
  Learning/Hire beta; Design waitlist.

## Next Execution Order

1. Channels and Settings control plane:
   finish channel matrix, move global config into Settings, keep unsupported
   channels hidden.
2. Agent production readiness:
   action-by-action E2E, context meter, artifacts/traces/cron/extension flows,
   memory governance, backend consumption checks.
3. Brain V2:
   graph-first UI, memory governance, source/provenance, search/timeline/detail
   E2E.
4. Chat/Spaces:
   decide visible naming, remove old product language, harden or limit workspace
   memory.
5. Learning private beta:
   V2 beta surface and settings mapping.
6. Design waitlist:
   truthful early-access surface.
7. Hire beta integration:
   merge only after central meter/settings/memory review.
8. Operator page:
   hidden, guarded, comprehensive.
9. Website:
   final public story after app truth is complete.

## Backend Prompts Needed

### Channel Contract Prompt

Ask the backend agent for a central channel control-plane contract:

- `GET /api/v1/users/{id}/channels` returns channel status for V1 launch
  channels.
- `POST /api/v1/users/{id}/channels/{channel}/connect`
- `POST /api/v1/users/{id}/channels/{channel}/test`
- `POST /api/v1/users/{id}/channels/{channel}/disconnect`
- Preserve provider-specific payload validation.
- Use vault secret refs, never return saved secret values.
- Include Telegram, Slack, Discord, Email first.
- Evaluate WhatsApp as the next candidate.
- Keep Signal/iMessage/Matrix/Mattermost/IRC/Line/Lark/OneBot/QQ/Nostr hidden
  unless deliberately promoted.

### Provider / OpenAI-Compatible Contract Prompt

Ask for a user-managed provider profile contract:

- Profile fields: label, provider kind, base URL, auth style, vault secret ref,
  model allowlist, default model, policy state, last test result.
- Routes: list, create, update, test, delete.
- Explicitly support OpenAI-compatible APIs.
- Do not expose raw key values after save.
- Return safe errors for invalid base URL, auth failure, model unavailable, and
  policy blocked.

### Memory Governance Contract Prompt

Ask for ZAKI BFF coverage over existing Nullalis memory governance:

- Forget by topic or memory id.
- PII purge dry-run and apply for phone/email/all.
- Export memory data.
- Return affected counts, provenance, and user-safe failure reasons.
- Preserve user scope and cross-user isolation tests.

### Extension Device Contract Prompt

Ask for the missing user device layer:

- Pairing initiation and token issuance.
- Device inventory.
- Revoke device.
- Last command and failure state.
- Timeout/disconnected state.
- Keep diagnostics separate from user device management.
