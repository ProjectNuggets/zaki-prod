# ZAKI Agent and Nullalis Integration Audit

Date: 2026-05-25
Status: Code-truth audit
Owner: CTO/Product

## Scope

This audit covers the current `zaki-prod` integration with Nullalis, the local Nullalis runtime repo, the browser-control work, central metering, and the product IA implications for the first commercial release.

Inputs inspected:

- `zaki-prod` backend product registry, meter, Agent proxy, dashboard, Settings, and BFF contracts.
- `nullalis` runtime docs, gateway contracts, tool registry, browser extension gateway, Playwright MCP, and Claude project memory.
- Claude memory note: native connectors are the target direction; Composio remains fallback/legacy during migration.

No production code changed in this audit.

## Executive Read

The central app foundation is real: `zaki-prod` already owns the product registry, plan ladder, meter grants, meter receipts, anonymous sessions, Settings IA, Dashboard command center, and Agent proxy. Nullalis is also much stronger than a simple chat backend: it has persistent user-scoped runtime state, graph/memory machinery, SSE runtime events, approvals, multi-agent tools, sandboxing, Playwright browser MCP, and a browser-extension gateway.

The gap is not capability. The gap is productization and trust wiring.

For V1, ZAKI must become Agent-first. The current app still routes the flagship Agent through the legacy Spaces/Bot thread, and the browser extension is not yet production-authenticated or tool-complete. Central metering exists, but its five-hour burst window and final enforcement semantics need the next hardening slice.

## Code Truth

### ZAKI Prod

- Product ids, states, memory scopes, current/future products, and meter weights live in `backend/src/platform-policy.js`.
- Current products are `spaces`, `agent`, `learn`, and `brain`; `hire`, `design`, `cli`, `local_app`, and `extensions` are already represented as future architecture.
- Product state is operational: `enabled`, `disabled`, `maintenance`, `degraded`, `hidden`, `readOnly`.
- Central meter contract lives in `backend/src/meter-contract.js`.
- Meter status, grants, and receipts are exposed by `backend/src/index.js` through `/api/meter/status`, `/api/meter/grants`, and `/api/meter/receipts`.
- Weekly allowance is anchored to first metered use after entitlement activation and has no rollover in `backend/src/platform-meter.js`.
- The five-hour window is currently a rolling lookback from `now - N hours`, not a stored window with a user-visible fixed reset.
- Agent chat goes through `POST /api/agent/chat/stream`, receives a central meter grant first, probes Nullalis `/ready`, then proxies to Nullalis `/api/v1/chat/stream`.
- Agent chat still runs the legacy prompt quota after the central meter grant. That is acceptable as a bridge, but it cannot remain the final authority.
- Agent meter usage facts are estimated from frontend payload and SSE stream metrics in `backend/src/agent-metering.js`; Nullalis does not yet provide the full raw usage facts needed for final commercial accounting.
- The dashboard product card for `agent` currently routes to `/spaces/${ZAKI_BOT_SPACE_ID}/threads/${ZAKI_BOT_THREAD_ID}` in `src/app/components/chat/views/ZakiDashboard.tsx`, so the flagship product still enters through the legacy Spaces route.
- Settings already has the correct platform shape: Account, Connections, Billing, Products, Usage, Memory & Data, Developer Access, Privacy.

### Nullalis

- `docs/zaki-runtime-contract.md` says Postgres is canonical, markdown is a projection/manual-edit mirror, and pgvector is derived.
- `docs/online-agent-contract.md` defines a strong SSE contract: `status`, `progress`, `reasoning_summary`, `tool_start`, `tool_result`, `approval_required`, `task_update`, `reply_start`, `token`, `error`, and exactly one terminal `done`.
- `docs/agent-lifecycle-spec.md` defines lifecycle, task states, memory stages, subagent restrictions, cron behavior, and hot/warm/cold memory.
- `src/tools/root.zig` registers `delegate` and `spawn` by default for the main profile, with explicit opt-out through `NULLALIS_ENABLE_MULTIAGENT=0`.
- Subagent profiles exclude `spawn`, `delegate`, `message`, scheduling, memory, composio, and browser tools.
- `src/tools/root.zig` registers extension tools only when an `ExtensionWsHub` exists, and today only `extension_navigate` is wired.
- `docs/extension-ws-contract.md` confirms the remaining extension tools are a follow-up recipe, not current production parity.
- `.spike/playwright-mcp` is a server-side browser MCP for public/non-auth web tasks. It has SSRF defense, per-session BrowserContext isolation, capped text/DOM/screenshot output, and gated `evaluate_js`.
- `.spike/nullalis-extension` is the user-browser path for logged-in websites. It blocks commands before `auth_ack`, rejects non-loopback `ws://`, persists STOP state, and avoids cookie/webRequest permissions.
- `docs/openapi-access.md`, `src/openapi/`, and `src/tools/openapi.zig` show the universal OpenAPI connector is delivered. Operators register `api_specs`; the Agent receives one `openapi` meta-tool with `list`, `describe`, and `invoke` modes. Specs are operator-owned, not tenant-settable.
- OpenAPI invoke is approval-aware: GET/HEAD/OPTIONS classify as read-only, write methods classify as mutating, and `read_only` specs hard-refuse write operations before approval can override them.

## Findings

### P0 - Agent is not yet a first-class app surface

`zaki-prod` has an `agent` product in the registry, but the UI still opens it through the fixed ZAKI Bot Spaces thread. This preserves compatibility, but it is not the product model we want to launch.

Impact:

- Brand positioning is wrong: users feel they opened a chat space, not the flagship autonomous agent.
- Agent browser runs, approvals, artifacts, memory, and usage cannot get their own natural layout.
- V2 UI handoff will be harder if the route model remains product-local to Spaces.

Required:

- Add an `/agent` workbench route.
- Keep the old Spaces/Bot thread as compatibility, not as the flagship entry.
- Root logo opens the platform Dashboard. Dashboard opens Agent as the primary action.

### P0 - Browser extension is not production-authenticated or tool-complete

Nullalis has the gateway endpoint and `extension_navigate`, but not the full user-browser tool family. The current extension pairing model is also not production-ready: docs still describe pasting a token and user id into the extension.

Impact:

- We cannot ship "Agent controls your browser" as a competition-grade V1 until pairing, STOP, session visibility, audit, and tool parity are finished.
- Direct extension use should never expose internal service tokens or ask users to paste runtime identities.

Required:

- `zaki-prod` owns extension pairing, scoped token minting, revocation, device inventory, and user-facing status.
- Nullalis verifies scoped extension/session tokens, not broad internal tokens.
- Wire the remaining extension tools: click, type, fill form, screenshot, text, DOM, wait, scroll, list tabs, and close/disconnect where appropriate.
- Every command needs audit facts: user, product, session, origin, command, approval state, result, duration, and meter grant/receipt ids.

### P1 - Central meter exists, but five-hour and receipt semantics need hardening

The central meter can issue grants and record receipts. It supports product states, anonymous sessions, idempotency, short-lived signed grants, and weighted debits.

Gaps:

- The five-hour window is a sliding lookback, not a persisted window with a clear reset time.
- Receipt `maxExceeded` is recorded but not rejected or reconciled.
- Agent still uses legacy prompt quota after central grant.
- Agent receipts are estimated locally instead of reading complete runtime facts from Nullalis.

Required:

- Persist burst windows per identity and plan meter group.
- Define exact over-max behavior: cap, debit actual with alert, or reject follow-up grants until reconciled.
- Retire legacy prompt quota from product ingress once central meter enforcement is verified.
- Ingest runtime-supplied raw facts from Nullalis `done`/usage events.

### P1 - Memory is strong in Nullalis, but governance is not finished in ZAKI Prod

Nullalis memory is a real differentiator: Postgres canonical state, graph expansion, retrieval traces, durable facts, checkpoints, and hot/warm/cold lifecycle are present in docs/code. `zaki-prod` also has explicit memory scopes in the product registry.

Gap:

- The central Memory Control Plane is not done.
- Spaces memory must become governed Workspace Memory or be frozen.
- User-scoped memory must remain canonical by ZAKI user id, not email strings or product-local identifiers.

Required:

- Personal Brain memory: Agent authority.
- Workspace memory: Spaces/Chat authority, project-scoped.
- Learner memory: Learn authority.
- Hire memory: Hire authority, candidate/job scoped.
- Design memory: future design context.
- Session memory: ephemeral, promotable only with policy.

Using one database is fine. The schema and governance boundaries must stay explicit.

### P1 - Native connectors strategy needs a platform contract

Claude memory says Nullalis is moving away from Composio to native OAuth/API/CLI connectors. That direction is good for reliability and latency, but it must not split account authority.

Required operating model:

- `zaki-prod` owns global identity, account linking visibility, consent UI, revocation, billing, and audit.
- Nullalis may own runtime-native connector execution and provider-specific OAuth/PKCE mechanics where needed.
- The contract between them must expose connected-account inventory, scopes, expiry, revocation, and runtime health to Settings.
- No product-local connector can silently bypass global Settings.

### P1 - Universal API connector needs product activation rules

Nullalis has shipped an operator-owned OpenAPI connector. This is a major Agent capability: point the runtime at an OpenAPI 3.x spec and the Agent can discover and invoke operations through a governed meta-tool.

Current strengths:

- One `openapi` tool avoids per-endpoint tool explosion.
- Specs are operator-owned and cannot be supplied by the Agent at runtime.
- HTTPS and SSRF-safe egress are required.
- Static credentials stay out of model context.
- Read/write approval classification reuses the existing approval engine.

Gaps for ZAKI launch:

- `zaki-prod` has no user-facing surface for connected APIs or operator-visible API specs.
- OpenAPI actions must be attributed in central metering as external API/tool usage.
- Write operations need the same durable approval and run ledger as browser/tool actions.
- Full secret-vault integration is deferred in Nullalis; current auth reads environment variables.

Required:

- Represent OpenAPI/API connectors in Settings Developer Access or Agent connectors once productized.
- Log API spec id, operation id, method, approval state, duration, response size, and meter ids.
- Keep operator-owned specs separate from user OAuth connections until the native connector model is finalized.

### P1 - Runtime events are good, but V1 needs durable action history

The SSE contract is rich and the frontend parses the important event classes. Nullalis trace state is not yet a durable product ledger.

Required:

- Durable Agent run ledger in `zaki-prod` or a shared runtime table.
- Runs, tool calls, approvals, browser commands, memory writes, files, and receipts linked by ids.
- Settings/Admin support view can explain why a run happened, what it used, what it changed, and what it cost.

### P2 - Server-side Playwright MCP is promising and should ship behind clear UX

The Playwright MCP path is strong for public web tasks: SSRF defenses, per-session isolation, capped outputs, idle reaping, and hidden `evaluate_js` by default.

Required:

- Show server-browser sessions in the Agent workbench with live preview, current URL, tool activity, STOP, and close session.
- Meter browser time, screenshots, external API/tool calls, and job runtime.
- Keep logged-in user flows on the extension path, not the server browser.

## Recommended Roadmap Implication

The next slices should stay infrastructure-first and UI-contract-ready:

1. Agent-first `/agent` route contract and workbench shell.
2. Persisted five-hour meter window and receipt over-max policy.
3. Browser extension pairing contract in `zaki-prod`.
4. Nullalis extension tool parity and usage facts.
5. OpenAPI/API connector attribution, approval, and meter facts.
6. Durable Agent run/action ledger.
7. Memory Control Plane scope APIs.
8. V2 UI integration on top of those contracts.

## Acceptance Bar

This integration is competition-ready only when:

- A new user can open Dashboard, launch ZAKI Agent, connect the browser extension without copying secrets, run a browser task, approve/deny risky actions, stop a run, and see usage update.
- A support/admin view can explain auth, product state, plan, grant, receipt, memory side effect, and runtime trace for a run.
- Nullalis can report raw usage facts and never decides final billing.
- Spaces/Chat, Learn, Hire, Design, Agent, Brain, CLI/local/extensions all use the same product registry and meter contracts.
- No internal token, user id, runtime identifier, or product-local quota leaks into user-facing setup.
