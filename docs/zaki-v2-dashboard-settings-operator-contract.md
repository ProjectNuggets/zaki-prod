# ZAKI V2 Dashboard, Settings, and Operator Contract

Date: 2026-05-25
Status: UI/UX contract before implementation
Owner: CTO/Product

## Purpose

This document defines the screen contract for the first V2 workstream:

1. Dashboard.
2. Main Settings and Profile.
3. Product-by-product rollout template.
4. Operator/internal page.

No product UI implementation should start until these contracts are accepted.

## Design Concept

ZAKI V2 is the accepted product design system.

The source artifact is:

- `/Users/nova/Desktop/ZAKI Design System.zip`

The product app follows V2, not V1. Existing V1 styling in the repo is migration debt until replaced. New product UI should not preserve warm/soft V1 patterns for continuity.

ZAKI V2 should feel like a tactical premium command system.

It should be:

- Minimal, but not empty.
- Operational, but not enterprise-cluttered.
- Calm, but visibly powerful.
- Human-readable, but built on exact product/meter/memory truth.
- Monospace-forward in chrome, labels, usage, meters, tables, and controls.
- Low-radius, hairline-structured, and dark/paper stage ready.

Avoid:

- Generic AI hero cards inside the app.
- Purple/blue gradient-driven identity.
- Card-inside-card sections.
- Dashboard as marketing copy.
- Product-specific settings on global pages.
- Hidden global policy inside product panels.
- Intentional V1 product styling.
- Pill-heavy product chrome.
- Blurred shadow elevation on product surfaces.
- Warm/soft marketing visual language in app surfaces.

Preferred app surface style:

- Full-width bands or unframed layouts for page structure.
- Hairline panels for repeated product/status items or modals.
- Dense, scan-friendly dashboard rows.
- Clear left navigation.
- Strong empty/error/loading/disabled states.
- Icons for tools and controls.
- Text only where it carries decision value.
- Product scope always visible.
- Memory scope always explicit.
- Meter and entitlement state visible where usage decisions happen.

V2 mobile is not fully solved by the source artifact. Mobile hardening is part of implementation, not a later polish pass.

## Dashboard Contract

### Dashboard Role

The signed-in dashboard is the user's ZAKI command center.

It is not:

- Agent landing page.
- Chat home.
- Settings page.
- Marketing page.
- Operator page.

It owns:

- Product launch.
- Plan and usage status.
- Product availability.
- Memory scope visibility.
- Active work overview.
- Trust/status signals.
- Recommended next action.

### Signed-In Dashboard Zones

| Zone | Purpose | Data source |
| --- | --- | --- |
| Identity/status row | Confirm account, plan, product health, and quick profile/settings access. | Auth store, `/api/meter/status`, `/api/products/registry`. |
| Usage strip | Weekly allowance, 5-hour window, reset timing, current plan. | `/api/meter/status`. |
| Product launcher | Open Agent, Chat, Learn, Hire, Design, Brain. | `/api/products/registry`. |
| Active work | Agent runs/tasks, scheduled work, recent Chat/Learn/Hire activity. | Product BFFs, initially Agent runtime facade. |
| Memory scopes | Personal Brain, Workspace, Learner, Hire, Design, Session. | Product registry, Brain/memory APIs. |
| Product health | Enabled/degraded/readOnly/maintenance/private beta/waitlist. | Product registry and operator state. |
| Recent usage | Per-product weekly usage rows. | `/api/meter/status`. |
| Getting unstuck | Support/help links, status, settings deep links. | Static + operator status where available. |

### Signed-In Dashboard Priority

Above the fold:

1. User identity and plan.
2. Weekly remaining.
3. 5-hour remaining.
4. Primary Agent launcher.
5. Product family launcher.

Below the fold:

1. Active work.
2. Memory scopes.
3. Product health.
4. Recent usage.
5. Beta/waitlist products.

### Guest Homepage Contract

Guest `chatzaki.com` is public, but it should still feel like the same product system.

Above the fold:

- ZAKI Agent as the main product.
- One-line explanation of the product family.
- Start free.
- Sign in.
- View pricing.

Second viewport:

- Product family cards:
  - Agent.
  - Chat.
  - Learn private beta.
  - Hire private beta.
  - Design waitlist.

Trust strip:

- Memory control.
- Browser control boundaries.
- Usage transparency.
- Data export/delete.

Do not overload the homepage with internal operational details.

### Dashboard Component Contracts

#### Usage Meter Component

Inputs:

- plan tier.
- weekly limit, used, remaining, resetAt.
- 5-hour limit, used, remaining, resetAt.
- pendingFirstUse.
- product usage rows.

States:

- loading.
- active.
- pending first use.
- warning under 20 percent.
- exhausted.
- unavailable.

Rules:

- Reset time must be explicit.
- No rollover language must be clear in Settings; dashboard can summarize.
- Do not show fake precision if backend only has weighted units.
- If unit label says "hours", conversion must be product-approved. Otherwise show "allowance" or "credits".

#### Product Card Component

Inputs:

- product id.
- label.
- lifecycle.
- operational state.
- route.
- memory scope.
- weekly usage.
- access/beta state.

States:

- enabled.
- degraded.
- readOnly.
- maintenance.
- disabled.
- hidden.
- private beta.
- waitlist.

Rules:

- `hidden` products do not appear in normal user launcher.
- `disabled` products can appear if useful for product-family clarity.
- `maintenance` products are visible but blocked.
- `readOnly` products open in read-only mode.
- Private beta products show request/access status.

#### Active Work Component

Initial implementation source:

- Agent tasks/runs/traces.
- Scheduled jobs.
- Recent product activity where available.

States:

- no active work.
- running.
- waiting for approval.
- failed.
- completed recently.

Rules:

- Approval pending must be visually prominent.
- Long-running Agent work must not disappear into chat history.
- Operator-only diagnostic language stays out of customer dashboard.

#### Memory Scope Component

Inputs:

- product registry memory scope.
- Brain/memory counts when available.
- last memory activity when available.

States:

- configured.
- empty.
- disabled.
- degraded.
- needs review.

Rules:

- Personal Brain is not Workspace Memory.
- Learner Memory is not Agent memory.
- Hire Memory is not personal Brain unless explicitly promoted.
- Session memory is ephemeral.

## Global Settings Contract

Settings is a full governance surface. It may start as a sheet, but the V2 IA must be route-ready.

### Settings Sections

| Section | Owns | Must not own |
| --- | --- | --- |
| Account | email, display name, auth basics, locale, theme | product runtime behavior |
| Profile | public-facing/user-facing identity fields | billing, usage |
| Billing | plan, checkout, portal, invoices, cancellation, renewal | product operational state |
| Usage | weekly meter, 5-hour window, per-product ledger, reset logic | product-specific runtime diagnostics |
| Products | product access, beta status, operational state, launch links | billing logic |
| Connections | OAuth providers, account links, channels if account-wide | product-local reply behavior |
| Memory & Data | scopes, export, import, deletion, retention | live Agent run controls |
| Developer Access | browser extension, future CLI/local/API clients, revocation | normal product navigation |
| Privacy & Security | consent, deletion, data controls, sessions/devices | product-specific settings |

### Profile Menu Contract

Profile menu should be small and decisive:

- Account identity.
- Personal account/profile.
- Settings.
- Usage remaining.
- Sign out.

Optional later:

- Switch workspace/team, if team product exists.
- Manage plan shortcut.

Do not add product-specific controls to the profile menu.

### Settings Acceptance

Settings V2 is accepted when:

- A user can find billing in one click from Settings.
- A user can find usage in one click from Settings.
- A user can see every product state in Products.
- A user can see every memory scope in Memory & Data.
- A user can export/delete account data from the correct governance area.
- Agent settings do not duplicate global Settings.
- All sections have loading, empty, error, disabled, and permission-denied states.

## Product Rollout Contract

Each product must be completed as a vertical slice.

### Product Surface

Must include:

- Primary workflow.
- Product-specific navigation.
- Empty state.
- Loading state.
- Error state.
- Usage/limit state.
- Memory/provenance touchpoint if relevant.
- Product-local settings entry.

### Product Settings Tab

Must include only behavior local to that product.

Examples:

- Agent: autonomy, browser control mode, response style, proactive behavior, channels.
- Chat: workspace defaults, sharing, Workspace Memory, files/context.
- Learn: study preferences, cadence, source defaults, learner memory.
- Hire: role/candidate/pipeline preferences, retention shortcuts, hire memory.
- Design: early access preferences and project/brand defaults later.

### Product Operator Page

Must include:

- product state.
- user entitlement/access.
- usage facts.
- recent errors.
- health/readiness.
- memory scope diagnostics.
- support actions.
- audit trail.

## Operator/Internal Contract

### Current Code Truth

Existing route:

- `/internal/admin-access-codes`

Existing admin page currently includes:

- Access code management.
- Admin members.
- Student verification.
- Rate limit controls for Spaces/Agent preview/route throttles.
- Learning AI stack status and tests.

Existing backend/internal surfaces include:

- Product registry: `/api/products/registry`.
- Meter status/grants/receipts.
- Billing telemetry: `/api/admin/telemetry/billing`.
- Memory telemetry: `/api/admin/telemetry/memory`.
- Learning deployment readiness: `/api/internal/learning/deployment-readiness`.
- Learning operator AI stack endpoints.
- Website beta waitlist admin endpoint.
- Billing reconciliation and webhook health routes.

### Target Operator Route

Target route:

- `/internal/operator`

Legacy route:

- `/internal/admin-access-codes` remains as alias or child page until migration is complete.

### Operator IA

| Section | Purpose |
| --- | --- |
| Overview | platform health, product states, billing health, meter health, active incidents. |
| Users | identity lookup, entitlement, plan, product access, usage, memory scope summary. |
| Access Codes | current access-code management. |
| Products | registry state, lifecycle, maintenance/degraded/readOnly controls. |
| Usage & Meter | grants, receipts, weighted usage, reset windows, over-limit decisions. |
| Billing | provider health, webhook health, reconciliation, plan transitions. |
| Agent Runtime | Nullalis health, sessions, tasks, traces, browser extension, connectors. |
| Chat | workspace/chat health, anonymous sessions, workspace memory. |
| Learn | deployment readiness, AI stack tests, private beta access, learner memory. |
| Hire | central meter readiness, private beta access, downstream health. |
| Design | waitlist and future early-access state. |
| Memory | personal/workspace/learner/hire/design/session scope diagnostics. |
| Telemetry & Audit | product events, client errors, support audit log. |
| Settings/Flags | operator-only config, feature gates, product state overrides. |

### Operator Safety Rules

- Operator UI must be permission-gated.
- Destructive actions require confirmation and audit logging.
- Billing and entitlement changes must show source of truth.
- Product state is operational, not billing entitlement.
- Operator pages may show technical detail; customer pages should not.
- No secrets are shown raw.
- Any action that changes user access, product state, memory, or billing needs an audit event.

## First Implementation Sequence

### Slice V2-01: Dashboard Spec To UI

Build only the signed-in dashboard and guest homepage structure needed for `chatzaki.com`.

Acceptance:

- Guest `/` renders public Agent-first entry.
- Signed-in `/` renders command dashboard.
- Main logo returns to `/`.
- Product launcher derives from registry.
- Usage cards derive from meter.
- No product-specific settings on dashboard.
- Dashboard supports EN/AR text hooks.

### Slice V2-02: Settings And Profile

Build Settings as a route-ready governance surface.

Acceptance:

- Sections match this contract.
- Profile menu stays small.
- Billing, Usage, Products, Memory & Data, Developer Access are discoverable.
- Existing Settings modal behavior is preserved or cleanly migrated.

### Slice V2-03: Operator IA Baseline

Create `/internal/operator` shell and map current admin tools into it.

Acceptance:

- Existing `/internal/admin-access-codes` remains usable.
- Operator shell shows current access-code/admin/rate-limit/learning controls.
- Product registry, meter, billing telemetry, memory telemetry, learning readiness are represented as panels or placeholders with contract notes.

### Slice V2-04+: Product Vertical Slices

Order:

1. Agent.
2. Chat.
3. Learn.
4. Hire.
5. Design placeholder.

Each product slice must include surface, settings, operator page, meter, memory, and validation.

## Dashboard Do Not Build Yet

Do not build these into the first dashboard slice:

- Full Agent workbench.
- Full run replay.
- Full Memory Control Plane editing.
- Full billing portal redesign.
- Full operator controls.
- CLI/local app flows.
- Design product workflow.

Show clear links/placeholders where the product model requires them, but keep the first dashboard focused.

## Verification Gates

Every V2 UI slice must pass:

- Typecheck.
- Relevant unit/component tests.
- Browser smoke on desktop and mobile width.
- Screenshot/snapshot review.
- No overlapping text.
- No clipped button labels.
- No card-inside-card layout in page sections.
- Loading, empty, error, disabled, readOnly, maintenance states where applicable.
- Existing dirty user files untouched.

## Hard Acceptance Gate

No slice is accepted because it "looks done." A slice is accepted only when all gates below pass.

| Gate | Required proof |
| --- | --- |
| Ownership | The screen owns only the jobs assigned to it in this contract. Dashboard, Settings, product settings, and Operator do not duplicate each other. |
| Backend contract | Every live data block has a named API, typed frontend client, loading state, empty state, error state, and permission-denied state. Mock data is labelled and blocked from production acceptance. |
| Meter | Any expensive product action goes through central grants before work and receipts after work. Products report raw usage facts only. Central app computes weighted debit. |
| Memory | The product memory scope is visible, correct, and separate from other scopes. Personal Brain, Workspace Memory, Learner Memory, Hire Memory, Design Memory, and session memory do not blur together. |
| Routing | Direct URL, nav click, logo click, browser back, refresh, and auth-return paths land on the correct surface. |
| Entitlement | Anonymous, free, personal, pro, and pro MAX states are checked where the slice touches access, usage, or billing. |
| Operational state | enabled, disabled, maintenance, degraded, hidden, and readOnly states are visible and tested where relevant. |
| UI quality | Desktop and mobile browser smoke pass. No overlap, clipping, card-inside-card page sections, clipped buttons, unreadable contrast, or generic AI-app visual pattern. |
| Accessibility | Keyboard walkthrough works; focus is visible; landmarks and labels are correct; dialogs trap and restore focus. |
| i18n | Customer-facing dashboard strings support EN and AR now. Other new user-facing strings use i18n hooks and are ready for later localization. |
| Security | No secrets exposed; admin/operator actions are permission-gated; destructive actions have confirmation and audit expectation. |
| Observability | The slice emits or exposes enough state for support: request failure, product state, meter state, and user entitlement where relevant. |

If one gate fails, the slice remains in progress. Visual polish cannot compensate for missing contract, meter, memory, or permission behavior.

## V2 Design Artifact Intake

The accepted V2 design files are the visual source for product implementation, but they do not override product architecture.

Use the V2 artifact as:

- visual direction.
- layout inspiration.
- interaction/motion reference.
- typography and density reference.
- product/website continuity reference.

Do not use mockups as:

- route ownership authority.
- source of billing, meter, memory, auth, or operator rules.
- permission model.
- product availability model.
- replacement for backend truth.

Every mockup must be mapped before implementation:

| Mockup artifact | Required mapping |
| --- | --- |
| Screen name | Route and owner from the app map. |
| Main zones | Dashboard, Settings, product, product settings, or Operator. |
| Data blocks | API source, loading/empty/error states, and fallback behavior. |
| Actions | Permission, entitlement, meter, and audit implications. |
| Memory references | Exact scope and governance link. |
| Navigation | Entry, exit, browser back, logo behavior, mobile behavior. |
| Visual system | Conformance to `DESIGN.md`, this contract, `DESIGN_TOKENS.md`, and app tokens. |

If a mockup combines concerns that this contract separates, preserve the visual quality but split the behavior into the correct surfaces.

## Plumbing Readiness Matrix

This matrix reflects the current repo state as of this contract update.

| Area | Current state | Status | Required before production final |
| --- | --- | --- | --- |
| Public guest root `/` | Exists through `WebsiteHomePage` and public route allowlist. | Partial | Redesign as Agent-first product-family entry from V2 mockups. Confirm anonymous start path. |
| Signed-in root `/` | Routes to `ChatArea`; current home can render `ZakiDashboard`. | Partial | Convert to V2 platform dashboard and remove product-welcome behavior from this surface. |
| Main logo behavior | Sidebar ZAKI icon opens ZAKI bot/home state; mobile logo is static. | Partial | Make logo behavior explicit: signed-in logo returns dashboard, guest logo returns public root. |
| Product registry | `/api/products/registry` exists; states and memory scopes are centralized in `platform-policy.js`. | Ready foundation | Add Operator controls or documented deploy-time env workflow for changing product states. |
| Product states | enabled, disabled, maintenance, degraded, hidden, readOnly exist in policy and meter grant logic. | Ready foundation | UI needs complete state treatment across dashboard, Settings, products, and Operator. |
| Central meter status | `/api/meter/status` exists for authenticated and anonymous users. | Ready foundation | Browser and contract tests need to cover dashboard and Settings consumption. |
| Central grant API | `/api/meter/grants` exists with idempotency, signed grants, product state, plan tier, and anonymous/user support. | Ready foundation | Downstream products must verify grants before expensive work. |
| Central receipt API | `/api/meter/receipts` exists; central app computes weighted debit from raw usage facts. | Ready foundation | Agent, Learn, Chat, and Hire must all report receipts consistently. |
| Meter weights | Product and capability weights exist and are env configurable. | Ready foundation | Calibrate launch defaults and expose read-only policy in Operator. |
| Weekly reset model | Entitlement-week and no-rollover policy exists in platform policy and meter snapshot tests. | Ready foundation | UI copy must explain reset timing clearly. |
| Anonymous session | Durable anonymous session ID path exists through meter identity resolution. | Partial | Finalize retention, migration to account, allowed anonymous actions, and deletion UX. |
| Billing/subscription | Checkout, portal, cancel, sync, webhooks, reconciliation, and billing telemetry exist. | Partial | Align plans/pricing to Free, Personal, Pro, Pro MAX and test mid-month upgrade behavior. |
| Global Settings | Settings modal exists with account, billing, usage, products, memory/data, developer access, privacy sections. | Partial | Promote to route-ready `/settings` IA and slim profile menu. |
| Profile menu | Exists, but includes billing, dark mode, memory, controls, settings, language, tour, and logout. | Partial | Reduce to account/profile, Settings, usage remaining, sign out, and optional manage plan shortcut. |
| Product settings | Agent settings sheets exist; space settings exists; Learn has internal settings areas. | Partial | Normalize product-local settings tabs and link global policy back to Settings. |
| Operator/internal | `/internal/admin-access-codes` exists with access codes, admins, student verification, rate limits, and Learning AI stack. | Partial | Create `/internal/operator` shell and move current admin tools into target IA. |
| Agent runtime facade | Agent routes, diagnostics, history, proxy contracts, browser/control-plane plumbing exist. | Partial | Product surface needs V2 UX, run/work visibility, browser extension state, and operator mirror. |
| Chat/Spaces | Legacy `/spaces` routes and TYP proxy exist. | Partial | Add `/chat` alias, rename customer-facing surface, and govern Workspace Memory clearly. |
| Learn | `/learn` surface and many learning APIs exist. | Partial | Adopt central meter grant/receipt everywhere expensive and expose learner memory/settings/operator. |
| Hire | Registry product exists, disabled by default. No route in this repo. | Planned | Add private beta placeholder route, central meter contract integration, settings tab, and operator page when Hire branch is ready. |
| Design | Registry product exists, disabled by default. No route in this repo. | Planned | Add early-access placeholder, waitlist path, settings placeholder, and operator waitlist page. |
| Memory control plane | `/brain` exists and memory backend routes exist. | Partial | Surface per-product memory scopes and governance links from dashboard and Settings. |
| OAuth/connections | Google OAuth routes and Settings connection status exist. | Partial | Expand account-wide connection governance and product-local connection usage rules. |
| Developer clients | Browser extension/server browser work is planned for the Agent release; future CLI/local app are represented in registry. | Partial | Add Developer Access UX, token/client revocation model, and operator visibility. |
| Test harness | Unit tests, backend tests, Playwright config, and smoke scripts exist. | Ready foundation | Add V2 dashboard/settings/operator browser specs and production release checklist. |

Conclusion: we have enough plumbing to start Dashboard V2 without waiting, but not enough to call the commercial release complete. The release becomes complete only after each product adopts the central meter, memory scope, settings tab, and operator mirror.

## Ready For Coding Checklist

Before implementing Dashboard V2:

- This document is accepted.
- `docs/zaki-v2-customer-flow-app-map.md` is accepted.
- Dashboard wireframe is agreed at zone level.
- Anonymous default path is decided: Agent preview or Chat fallback.
- `/chat` alias timing is decided.
- Settings route timing is decided.
- Operator target route is confirmed.
