# ZAKI Agent-First V1 Product Spec

Date: 2026-05-25
Status: Source-of-truth target for V1 commercial release
Owner: CTO/Product

## Decision

The main consumer product is ZAKI Agent.

ZAKI Chat/Spaces, ZAKI Learn, ZAKI Hire, ZAKI Design, Brain, CLI, local app, and extensions are product family surfaces around the Agent. They must share one identity, one product registry, one plan ladder, one central meter, one Settings control plane, and explicit memory scopes.

The V1 wedge is:

> A persistent personal AI agent with graph memory that can reason, work, use tools, control a browser safely, and explain its usage.

## Product Status

| Surface | V1 status | Role |
| --- | --- | --- |
| ZAKI Agent | Main consumer product | Persistent personal agent, graph memory, task execution, browser control |
| ZAKI Chat/Spaces | Supporting product | General chat/workspace conversations and project context |
| Brain | Control plane | Personal memory, graph, provenance, review, import/export/delete |
| ZAKI Learn | Private beta | Learner memory, study plans, tutor flows |
| ZAKI Hire | Private beta | Hiring workflows, candidate/job memory, central meter client |
| ZAKI Design | Early access/waitlist | Future design product, placeholder in registry and website |
| Browser Extension | V1 client | User-side browser control for logged-in websites |
| CLI/local app | Coming soon | Future Agent clients, authenticated through central app |

## Platform Ownership

`zaki-prod` owns:

- User identity, auth sessions, anonymous sessions, OAuth/account linking visibility.
- Product registry and operational product state.
- Plan ladder, billing, entitlements, Stripe, upgrades/downgrades.
- Central meter grants, receipts, weighted debits, weekly allowance, five-hour burst.
- Dashboard, Settings, product routing, extension pairing, device/client inventory.
- Memory governance surfaces and product-scope policy.
- Durable user-facing audit and support explainability.

Nullalis owns:

- Agent runtime, tool execution, graph/personal memory internals, runtime state.
- SSE event stream and runtime lifecycle.
- Agent tool registry, sandboxing, subagents, browser MCP, extension command execution.
- Raw usage facts, runtime health, tool/action trace facts.
- Runtime-native connector mechanics where agreed by contract.

Products own:

- Product-local workflow state and product-local settings only.
- Raw usage facts for their work.
- Product-specific memory records inside the central memory scope model.

Products do not own:

- Billing.
- Global usage limits.
- Global OAuth/account identity.
- Account deletion/export.
- Global memory policy.

## V1 User Flow

1. User lands on the website and understands ZAKI Agent as the flagship product.
2. User opens the app.
3. The top-left ZAKI logo opens Dashboard.
4. Dashboard shows plan, weekly allowance, five-hour burst, Agent status, browser extension status, memory state, and product launchers.
5. User opens ZAKI Agent.
6. Agent workbench shows conversation, task timeline, browser/live run panel, approvals, artifacts, and memory/usage context.
7. If a task needs the user's logged-in browser, the Agent asks the user to connect the extension through a pairing flow owned by `zaki-prod`.
8. User approves or denies risky actions inline.
9. Agent runs, emits events, reports raw usage facts, and receives central usage receipts.
10. User can later inspect usage in Settings, memory in Brain, and run history in Agent.

## App Surface Model

The app has three distinct layers:

1. Dashboard: operational command center.
2. Product surfaces: Agent, Chat/Spaces, Learn, Hire, Design.
3. Governance surfaces: Settings and Brain.

The Dashboard is not Agent settings and not a marketing page. It should answer:

- What can I use now?
- What is left in my weekly and five-hour windows?
- What does ZAKI remember?
- Which products are available or in beta?
- Are my browser/clients connected?
- What needs my attention?

Agent product settings stay minimal:

- Autonomy level.
- Response/work style.
- Browser control mode.
- Proactive/heartbeat behavior.
- Runtime diagnostics.

Main Settings owns everything global:

- Account.
- Connections/OAuth.
- Billing.
- Products.
- Usage.
- Memory & Data.
- Developer Access.
- Privacy.
- Future client/device access.

## Agent Workbench

The Agent workbench should become its own route, preferably `/agent`.

Required zones:

- Conversation composer and transcript.
- Runtime timeline: status, reasoning summaries, tools, approvals, tasks, errors, done.
- Browser panel: server browser or extension-controlled user browser, current URL, screenshot/live preview, STOP, session close.
- Artifacts/files panel.
- Memory context panel: what memory was read, what was proposed for write, provenance.
- Usage panel: current plan, weekly remaining, five-hour remaining, run debit after completion.

The current fixed Spaces/Bot thread can remain as compatibility, but it should not be the flagship product entry.

## Browser Control Model

ZAKI Agent ships with two browser paths:

### Server Browser

Use for public or unauthenticated web work.

Source of truth:

- Nullalis `.spike/playwright-mcp`.

Rules:

- SSRF-protected.
- Per-session BrowserContext isolation.
- User can see current browser state.
- `evaluate_js` remains disabled unless explicitly enabled by operator policy.
- Meter tool calls, screenshots, external API calls, and runtime.

### User Browser Extension

Use for websites that need the user's logged-in browser, extensions, or local browser state.

Source of truth:

- Nullalis `.spike/nullalis-extension`.
- Nullalis `docs/extension-ws-contract.md`.

Rules:

- No internal token paste.
- No user id paste.
- `zaki-prod` issues a scoped, revocable extension pairing token.
- Nullalis validates the scoped token and binds it to the canonical ZAKI user.
- Extension status appears in Dashboard, Settings Developer Access, and Agent workbench.
- Every command shows activity and can be stopped.
- Commands before authenticated connection are dropped.
- Expensive or mutating browser actions require a valid central grant or trusted zaki-prod proxy context.

## Metering Model

The central meter is authoritative.

Plan ladder:

- Free.
- Personal.
- Pro.
- Pro MAX.

Pricing direction:

- Personal: EUR 20/month.
- Pro: EUR 99/month.
- Pro MAX: EUR 200/month.

Usage windows:

- Weekly allowance: starts on first metered use after entitlement activation for paid users, or first metered use for anonymous/free sessions.
- Weekly unused allowance expires at reset; no rollover.
- Five-hour burst: must be persisted as a fixed user-visible window, not only a sliding lookback.

Product usage:

- Every product requests a grant before expensive work.
- Every product reports raw usage facts after work.
- Central app computes weighted debit.
- Product weights are configurable and can change over time without changing product code.
- Downstream services never decide final billing.

Receipt facts:

- `inputTokens`.
- `outputTokens`.
- `model`.
- `toolCalls`.
- `externalApiCalls`.
- `durationMs`.
- `storageBytes`.
- `jobRuntimeMs`.
- Product/run metadata.

## Memory Model

Using one database is acceptable. Unclear ownership is not.

Required scopes:

| Scope | Authority | Purpose |
| --- | --- | --- |
| Personal Brain | Agent/Brain | User identity, goals, preferences, relationships, long-running context |
| Workspace Memory | Chat/Spaces | Project/space facts, decisions, working context |
| Learner Memory | Learn | Study profile, weak topics, plans, progress |
| Hire Memory | Hire | Candidate, role, pipeline, interview context |
| Design Memory | Design | Design assets, brand context, project preferences |
| Session Memory | Runtime | Temporary continuity, promotable only by policy |

User-scoped memory must use canonical ZAKI user ids. Product-local ids, email strings, and thread ids can be metadata, not authority.

Spaces memory should be kept only if it becomes governed Workspace Memory. If it cannot meet the scope/provenance/delete/export bar, freeze durable writes for production and keep only session/workspace context.

## Anonymous/Free Rules

Free can work without registration only when the central app creates a durable anonymous session and grants every expensive action.

Anonymous should be allowed for low-risk, cost-controlled trials. These should not include:

- User-browser extension pairing.
- Secrets.
- Durable personal Brain.
- Long-running automation.
- Expensive external tool runs.
- Private beta products unless explicitly allowed.

Anonymous usage must be migratable to an account where policy allows it, and deletable under privacy controls.

## V1 Success Definition

ZAKI Agent V1 is ready for the commercial release only when:

- Dashboard is the platform command center, not a product-local welcome card.
- Agent has its own workbench route and feels like the main product.
- Browser extension can be paired without copying internal tokens.
- Agent browser runs are visible, stoppable, auditable, and metered.
- Central meter can explain every grant and receipt across Agent, Chat/Spaces, Learn, Hire, Design, and future clients.
- Weekly and five-hour reset behavior is clear in the UI.
- Memory scopes are explicit and inspectable.
- Agent settings are minimal and product-local.
- Main Settings owns account, billing, usage, products, memory/data, developer access, and privacy.
- Nullalis reports raw usage facts; `zaki-prod` computes final billing debit.
- No V1 route bypasses auth, entitlement, product state, meter, memory side-effect policy, or audit policy.

## Next Implementation Slices

1. Persist the five-hour burst window and define over-max receipt policy.
2. Add `/agent` workbench route contract and keep old Spaces/Bot path as compatibility.
3. Define and implement extension pairing endpoints in `zaki-prod`.
4. Ask Nullalis to wire extension tool parity and raw usage facts.
5. Add durable Agent run/action ledger.
6. Implement Memory Control Plane scope APIs.
7. Integrate Claude V2 UI files onto these contracts.
