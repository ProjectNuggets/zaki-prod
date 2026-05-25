# ZAKI V1 App Map

Date: 2026-05-25
Status: Target IA for V1 commercial release
Owner: CTO/Product

## Principles

- ZAKI Agent is the flagship product.
- Dashboard is the platform command center.
- Settings and Brain are governance surfaces, not product surfaces.
- Product routes are downstream of central auth, product state, entitlement, usage, memory, and audit policy.
- Private beta products are visible where useful, but gated honestly.
- The first release ships in English, with Dashboard also supporting English/Arabic. Full i18n comes later.

## Public Website Map

| Route | Purpose | Primary CTA |
| --- | --- | --- |
| `/` | Agent-first homepage. Explain ZAKI Agent as the product, not a generic chatbot. | Start with ZAKI Agent |
| `/agent` | Deep product page for Agent, memory, browser control, autonomy, and trust. | Try Agent / Join |
| `/chat` | ZAKI Chat/Spaces page. Supporting chat/workspace product. | Open Chat |
| `/learn` | Private beta page for ZAKI Learn. | Request beta |
| `/hire` | Private beta page for ZAKI Hire. | Request beta |
| `/design` | Early access/waitlist page for ZAKI Design. | Join waitlist |
| `/pricing` | Free, Personal, Pro, Pro MAX, usage logic, and reset clarity. | Upgrade |
| `/memory` | Brain and memory trust page. Explain personal/workspace/learner/hire/design/session memory. | See Brain |
| `/trust` | Security, privacy, browser control, data controls, deletion/export. | Review controls |
| `/download` | Browser extension now; desktop/local/CLI coming soon. | Install extension |
| `/developers` | Future CLI/local/API access and product registry contracts. | Join developer access |
| `/login` | Auth entry. | Sign in |
| `/app` | Authenticated app entry. | Open app |

## Authenticated App Map

| Route | Surface | Owner | Notes |
| --- | --- | --- | --- |
| `/` | Dashboard | Platform shell | Main logo opens here. Plan, weekly, five-hour, product launchers, memory health, extension status. |
| `/agent` | Agent workbench | Agent product | Main consumer surface. Conversation, task timeline, browser panel, approvals, artifacts, memory context, usage. |
| `/agent/runs/:runId` | Agent run detail | Agent product | Durable trace, tool calls, approvals, receipts, artifacts, memory side effects. |
| `/agent/browser` | Browser sessions | Agent product + Developer Access | Server browser and extension status, active sessions, STOP, revoke. |
| `/agent/connectors` | Agent connectors | Agent product + Developer Access | OpenAPI/API connector activity, native connector readiness, approval and usage attribution. |
| `/spaces` | Chat/Spaces list | Chat/Spaces product | Supporting chat and workspace context. |
| `/spaces/:spaceId/threads/:threadId` | Chat thread | Chat/Spaces product | Workspace memory only. Fixed ZAKI Bot thread remains compatibility, not flagship. |
| `/learn` | Learn | Learn product | Private beta; learner memory and progress. |
| `/hire` | Hire | Hire product | Private beta; central meter client and hire memory. |
| `/design` | Design | Design product | Early access/waitlist placeholder. |
| `/brain` | Brain/Memory | Memory control plane | Personal graph, memory review, provenance, import/export/delete, scope links. |
| `/settings` | Settings home | Platform governance | Account, Connections, Billing, Products, Usage, Memory & Data, Developer Access, Privacy. |
| `/settings/usage` | Usage | Platform governance | Plan, weekly allowance, five-hour window, per-product ledger. |
| `/settings/products` | Products | Platform governance | Product states, beta access, operational availability, launch links. |
| `/settings/memory` | Memory & Data | Platform governance | Cross-scope memory controls and export/delete. |
| `/settings/developer-access` | Clients/devices | Platform governance | Browser extension now; CLI/local app/API later. |
| `/settings/privacy` | Privacy | Platform governance | Data controls, account deletion, retention. |

## Navigation Model

Primary nav:

- Dashboard.
- Agent.
- Chat.
- Learn.
- Hire.
- Brain.
- Settings.

Secondary/conditional nav:

- Design waitlist.
- Browser Extension.
- Developer Access.
- Admin/Ops, when authorized.

Product state rules:

- `enabled`: open normally.
- `degraded`: open with status messaging.
- `readOnly`: browsing/history allowed, mutating actions blocked.
- `maintenance`: visible but disabled with maintenance status.
- `disabled`: visible where strategically useful, disabled.
- `hidden`: absent from user launch surfaces, still known to registry.

## Agent Workbench Layout

Desktop:

- Left rail: product nav.
- Center: Agent conversation and composer.
- Right panel: task timeline, browser/live preview, API/tool activity, approvals, memory context, artifacts, usage.
- Settings button opens global Settings. Agent-local controls are a compact product panel.

Mobile:

- Center-first conversation.
- Tabs or sheets for Timeline, Browser, Memory, Artifacts, Usage.
- STOP and approval actions remain one tap away.

## Settings IA

Settings is MECE:

- Account: profile, email, auth basics.
- Connections: OAuth/provider accounts and channels.
- Billing: plan, invoices, checkout/portal.
- Products: product access, beta state, operational state.
- Usage: central weekly and five-hour meters, product ledger.
- Memory & Data: scopes, export, import, delete, retention.
- Developer Access: browser extension, CLI, local app, API/client tokens.
- Privacy: deletion, consent, data policy, retention.

Settings must not contain product-specific runtime tuning except links into product-local settings.

## Product-Local Settings

Agent local controls:

- Autonomy.
- Browser control mode.
- Response/work style.
- Proactive behavior.
- Runtime diagnostics.

Chat/Spaces local controls:

- Space metadata.
- Sharing/collaboration.
- Workspace Memory toggle for that space.
- Files/context defaults.

Learn local controls:

- Study cadence.
- Learning preferences.
- Notebook/source defaults.
- Learner memory shortcut.

Hire local controls:

- Hiring workflow preferences.
- Candidate/job context defaults.
- Retention shortcuts for hire memory.

## App Readiness Checklist

- Logo to Dashboard works everywhere.
- Dashboard can launch Agent as the primary action.
- Agent no longer depends on the old Spaces route for flagship UX.
- Product cards derive from `/api/products/registry`.
- Usage derives from `/api/meter/status`.
- All expensive actions use `/api/meter/grants` and `/api/meter/receipts`.
- Browser extension appears in Developer Access and Agent workbench.
- OpenAPI/API connector actions appear in the Agent timeline and central meter.
- Private beta products are gated but not hidden from the product family story.
- Brain shows memory scopes, not one vague memory bucket.
- Settings remains global and does not duplicate Agent product controls.
