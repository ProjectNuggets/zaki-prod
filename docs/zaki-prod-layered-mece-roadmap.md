# ZAKI Prod Layered MECE Roadmap

Date: 2026-05-20
Status: Execution roadmap
Owner: CTO/Product

This roadmap turns the production strategy into a layered, MECE execution model. Each concern has one primary owner. Product screens can reference platform data, but they do not become alternate owners of global account, plan, usage, memory, or privacy policy.

## External Lessons

The reference pattern from leading AI products is:

- Global account, plan, data controls, memory controls, and billing belong in central settings.
- Product-local controls should stay close to the product, but only for behavior inside that product.
- Usage limits must be visible enough for users to plan work.
- Rolling/session windows are acceptable only when the product explains what resets and when.

Sources used for this operating model:

- OpenAI ChatGPT pricing and plan structure: https://openai.com/chatgpt/pricing
- OpenAI Data Controls: https://help.openai.com/en/articles/7730893-how-chatgpt-uses-browsing-and-memory
- OpenAI Memory FAQ: https://help.openai.com/en/articles/8590148-memory-faq
- Anthropic Claude Pro usage: https://support.anthropic.com/en/articles/8324991-about-claude-s-pro-plan-usage

ZAKI should beat the reference products on usage clarity and memory scope clarity.

## MECE Ownership Map

| Layer | Primary owner | Owns | Does not own |
| --- | --- | --- | --- |
| L0 Product Contract | `PRODUCT.md`, `DESIGN.md`, ADRs | plan model, product model, design rules, release bar | route handlers or component details |
| L1 Identity | Identity module | login, refresh, OAuth, provider identities, sessions, future device auth | product access policy |
| L2 Commercial | Commercial module | plans, subscriptions, Stripe, entitlements, pricing migration | runtime usage counters |
| L3 Usage | Usage module | usage ledger, weekly allowance, burst windows, product weights, summaries | product business logic |
| L4 Product Router | Router module | product catalog, route access, entitlement checks, launch paths | product internals |
| L5 Memory Control Plane | Memory module | personal/workspace/learner/session scope policy, export/delete/disable | product UI layout |
| L6 Product Domains | Spaces, Agent, Learn, Brain | product workflows and product-local settings | account, billing, global usage, global memory policy |
| L7 Global Settings | Settings shell | account, OAuth, billing, platform usage, memory/data/privacy, developer access | product-specific runtime tuning |
| L8 Dashboard | Dashboard shell | operational command center, product launchers, allowance status, memory health | deep editing of any one product |
| L9 Admin/Ops | Admin/Ops module | support view, audit trails, health, runtime config, reconciliation | user-facing product flows |
| L10 Quality/Release | QA and observability | tests, E2E, a11y, visual checks, performance, release gates | product decisions |

## Settings Architecture

Main Settings is the platform control plane:

- Account and profile.
- OAuth and connected identities.
- Billing and subscription.
- Platform usage: plan, weekly allowance, burst window, per-product usage.
- Memory and data controls by scope.
- Privacy, export, delete account.
- Sessions, devices, developer access when CLI/local/extensions launch.

Agent Settings is a product-local control panel:

- Response style.
- Autonomy level.
- Channels such as Telegram.
- Heartbeat/proactive behavior.
- Runtime diagnostics.
- Agent usage diagnostics only.

Agent Settings must not own:

- Subscription plan.
- Billing.
- Platform weekly allowance.
- Global memory policy.
- OAuth account linking.
- Data export/delete account.

Learn Settings, if added, owns only learner-local behavior:

- Learning preferences.
- Study cadence.
- Learner memory reset/export shortcut.
- Source/notebook defaults.

Spaces Settings owns only workspace-local behavior:

- Space metadata.
- Sharing/collaboration.
- Workspace Memory enable/disable for that space.
- Files/context defaults.

## Layered Success Criteria

The app is S-tier only when all layers pass:

- A new user can sign in, understand plan and usage, and launch any product.
- A paid user sees one coherent plan and usage story across all products.
- Memory is inspectable by scope and never appears as one vague bucket.
- Agent settings are focused and do not duplicate global settings.
- Learn and Spaces have product-local controls without owning global policy.
- Support/admin can explain a user's auth, entitlement, usage, memory, and routing decisions from one trail.
- Every product route has auth, entitlement, usage, memory side-effect, and audit policy.
- Main dashboard and Settings are polished on desktop and mobile.
- Tests, typecheck, build, browser validation, accessibility, and performance checks run before release claims.

## Vertical Slices

The slices below are ordered by dependency and risk. Each slice must end with a local commit and verification evidence.

- [x] **S01: Platform product and plan contract** `risk:high` `depends:[]`
  > After this: backend exposes Free/Personal/Pro/Pro MAX platform policy while preserving legacy commercial behavior.

- [x] **S02: Platform usage summary compatibility endpoint** `risk:high` `depends:[S01]`
  > After this: `/api/usage/summary` returns platform plan, allowance intent, burst intent, and current product usage from legacy counters.

- [x] **S03: Global Settings usage surface** `risk:medium` `depends:[S02]`
  > After this: main Settings shows platform usage, and Agent Settings is labeled as Agent usage rather than global plan authority.

- [x] **S04: Authenticated UX baseline audit** `risk:high` `depends:[S03]`
  > After this: test user login, dashboard, Settings, Agent Settings, Spaces, Learn, Brain, and logout are browser-verified with screenshots and issue notes.

- [x] **S05: MECE Settings IA cleanup** `risk:high` `depends:[S04]`
  > After this: main Settings has clean sections for Account, OAuth, Billing, Usage, Memory/Data, Privacy, and future Developer Access; product settings only link back to global controls.

- [x] **S06: Dashboard command center v1** `risk:high` `depends:[S02,S05]`
  > After this: authenticated dashboard shows plan, weekly allowance, burst window, product launchers, product usage, and memory health from platform contracts.

- [x] **S07: Central usage ledger schema and repository** `risk:high` `depends:[S02]`
  > After this: usage events can be written/read from a canonical ledger without changing enforcement.

- [ ] **S08: Weekly allowance aggregation** `risk:high` `depends:[S07]`
  > After this: `/api/usage/summary` reports real weekly used/remaining/reset values from ledger aggregation.

- [ ] **S09: Five-hour burst window persistence** `risk:high` `depends:[S07]`
  > After this: users have a stored burst/session window with visible reset/remaining state.

- [ ] **S10: Product usage weights and enforcement bridge** `risk:high` `depends:[S08,S09]`
  > After this: Spaces, Agent, and Learn can consume normalized usage units while legacy counters remain available for rollback.

- [ ] **S11: Pricing and Stripe plan ladder migration** `risk:high` `depends:[S01,S08]`
  > After this: pricing UI and checkout use Free/Personal/Pro/Pro MAX, with legacy plan aliases and webhook replay preserved.

- [ ] **S12: Memory Control Plane API contract** `risk:high` `depends:[S05]`
  > After this: memory capture/list/update/delete/export interfaces exist with explicit personal/workspace/learner/session scopes.

- [ ] **S13: Spaces Workspace Memory migration** `risk:high` `depends:[S12]`
  > After this: Spaces memory writes use canonical user identity and workspace scope, with old ambiguous capture frozen or migrated.

- [ ] **S14: Agent Brain personal memory governance** `risk:medium` `depends:[S12]`
  > After this: Agent Brain remains personal memory authority, with inspect/edit/delete/export surfaced through global Memory controls.

- [ ] **S15: Learn learner memory governance** `risk:medium` `depends:[S12]`
  > After this: learner memory and progress state are visible and controllable without merging into personal Brain by default.

- [ ] **S16: Product Router policy metadata** `risk:high` `depends:[S01,S07,S12]`
  > After this: each protected route declares auth, entitlement, usage event, memory side effects, and audit policy.

- [ ] **S17: Backend modular monolith extraction wave 1** `risk:medium` `depends:[S16]`
  > After this: Identity, Commercial, Usage, Product Router, and Memory route registration boundaries exist without behavior changes.

- [ ] **S18: Product surface polish wave** `risk:medium` `depends:[S05,S06,S16]`
  > After this: Spaces, Agent, Learn, and Brain screens follow the same navigation, empty/error/loading, quota, and memory provenance language.

- [ ] **S19: Future client auth foundation** `risk:medium` `depends:[S17]`
  > After this: CLI/local/extensions are represented by client/session/token contracts, revocation UI data, and usage attribution, without shipping the clients yet.

- [ ] **S20: Admin and support command center** `risk:medium` `depends:[S08,S11,S12,S16]`
  > After this: support can inspect a user's identity, subscription, entitlement, usage, memory scopes, route decisions, and audit events.

- [ ] **S21: Release verification harness** `risk:high` `depends:[S18,S20]`
  > After this: CI/local release check covers backend tests, frontend tests, typecheck, build, E2E happy paths, accessibility, visual checks, and bundle budgets.

- [ ] **S22: World-competition final pass** `risk:high` `depends:[S21]`
  > After this: authenticated and public app flows are manually reviewed on desktop/mobile, EN/AR, light/dark where applicable, with no open P0/P1 launch blockers.

## Boundary Map

| Producer | Consumer | Contract |
| --- | --- | --- |
| S01 | S02, S11, S16 | `platform-policy.js` plan/product policy |
| S02 | S03, S06, S08 | `/api/usage/summary` compatibility response |
| S05 | S06, S12, S18 | Settings IA ownership and global/product boundary |
| S07 | S08, S09, S10, S20 | canonical usage ledger events |
| S12 | S13, S14, S15, S20 | memory scope API and policy context |
| S16 | S17, S18, S20 | route policy metadata |
| S21 | S22 | release verification evidence |

## Proof Strategy

Every slice must prove at least one of:

- Contract proof: unit/contract tests for a module or endpoint.
- UX proof: authenticated browser flow with screenshot/snapshot.
- Migration proof: old and new behavior both work during transition.
- Governance proof: policy owner and user controls are visible.
- Release proof: typecheck, build, tests, E2E, accessibility, or bundle evidence.

## Credentials Handling

The local test account may be used for authenticated validation. Credentials must not be committed, written into docs, screenshots, logs, scripts, or env files. If automation needs them, pass them only through the browser/session being validated or through a temporary local-only mechanism that is not written to the repo.

## Current Position

Completed:

- S01 platform policy contract.
- S02 platform usage summary endpoint.
- S03 Settings usage surface.
- S04 authenticated UX baseline audit. Evidence and blockers are captured in `docs/audits/zaki-prod-s04-authenticated-ux-baseline.md`.
- S07 central meter ledger foundation through `zaki_meter_grants` and `zaki_meter_receipts`, plus grant/receipt repository helpers.
- Central meter bridge for current product ingress:
  - Hire downstream contract through `/api/meter/grants` and `/api/meter/receipts`.
  - Learning HTTP and websocket ingress.
  - Spaces/Chat authenticated and anonymous chat.
  - Agent direct stream and Bot BFF stream.
- Frontend `useMeterStatus()` and Settings usage cards now read `/api/meter/status` for plan, weekly allowance, and five-hour window state.
- `/api/meter/status` now includes per-product weighted usage windows from the central receipt ledger, and Settings usage rows consume that meter-ledger breakdown with legacy rows as fallback only.
- S05 Settings IA cleanup:
  - Main Settings is split into Account, Connections, Billing, Products, Usage, Memory & Data, Developer Access, and Privacy.
  - Memory & Data lists product memory scopes and links to `/brain`.
  - Developer Access lists future CLI/local app/extensions clients from the product registry without exposing them in product launch rows.
  - Privacy no longer owns export; export lives with Memory & Data.
  - Frontend anonymous meter status client/query exists for no-registration dashboard entry work.
- S06 Dashboard command center v1:
  - The signed-in root surface is now a platform command center instead of a product-local welcome card.
  - Dashboard allowance cards read `/api/meter/status` for plan, weekly allowance, and five-hour window state.
  - Anonymous/free dashboard data uses the anonymous meter status contract when no auth token exists.
  - Product launch cards read `/api/products/registry`, respect operational state, and keep future products visible in architecture while disabled in UI.
  - Memory scope rows are derived from product registry metadata so product surfaces remain downstream of the central memory model.

Next:

1. S08-S10 central meter authority: weekly aggregation, five-hour persistence, product weights, and enforcement bridge.
2. S11 pricing/checkout migration to Free, Personal, Pro, and Pro MAX.
3. S12-S15 Memory Control Plane governance across personal Brain, workspace memory, learner memory, and future product memory.
4. S16 product router policy metadata so every route declares auth, entitlement, meter, memory, and audit behavior.
5. Product surface polish and Website V2 after Claude V2 design files land.
