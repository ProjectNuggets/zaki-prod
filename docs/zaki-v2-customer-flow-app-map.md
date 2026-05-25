# ZAKI V2 Customer Flow and App Map

Date: 2026-05-25
Status: Design/spec contract before V2 UI implementation
Owner: CTO/Product

## Purpose

This document defines the customer flow and app map before the V2 UI pass. It is the source of truth for what the user sees first, how Settings is organized, how products are introduced, and how operator/internal surfaces mirror the product model.

This does not replace the existing platform contracts. It sits above:

- `docs/zaki-v1-app-map.md`
- `docs/zaki-prod-end-state-spec.md`
- `docs/zaki-prod-layered-mece-roadmap.md`
- `docs/nullalis-code-truth-ui-activation-audit-2026-05-25.md`

## Decisions Locked For This Slice

- `chatzaki.com` guest route is a public product-family entry point.
- Signed-in root `/` is the platform dashboard.
- Main logo always returns to the signed-in dashboard.
- ZAKI Agent is the main consumer product.
- ZAKI Chat is the customer-facing label for the current Spaces product. The legacy `/spaces` route remains during migration.
- ZAKI Learn and ZAKI Hire are private beta products.
- ZAKI Design is early access / waitlist.
- Settings is global governance.
- Product settings are local and minimal.
- Operator/internal pages exist today and must become the internal mirror of the product registry, meter, billing, runtime, and support model.

## North Star

The app should feel like a premium AI operating system, not a pile of AI demos.

The first user question is:

> What can ZAKI do for me, what do I have access to, what is left, and where do I go next?

Every screen must answer one MECE job:

- Dashboard: where am I in the platform?
- Settings: who am I, what do I pay for, what is connected, what data exists?
- Product surface: what work am I doing in this product?
- Product settings: how should this product behave for me?
- Operator/internal: what is the truth behind user access, usage, health, support, and product state?

## Top-Level Customer Flow

### Flow 1: Guest Arrives At `chatzaki.com`

Entry: unauthenticated `GET /`

Primary job:

- Understand ZAKI as an Agent-first product family.
- Start cost-effective free usage without registration.
- See paid plan path without pressure.

Required first-viewport signals:

- ZAKI Agent is the primary consumer product.
- The product family includes Agent, Chat, Learn, Hire, and Design.
- Free usage exists.
- Private beta products are clearly labeled.
- Trust and memory are visible without requiring deep reading.

Primary CTAs:

- Start free.
- Sign in.
- View pricing.

Secondary CTAs:

- Explore Agent.
- Explore Chat.
- Join Learn beta.
- Join Hire beta.
- Join Design waitlist.

Anonymous/free rules:

- Central app issues durable `anonymousSessionId`.
- Anonymous free usage is cost-capped by central meter.
- Anonymous users can use safe, low-cost product paths only.
- Anonymous users do not get browser extension pairing, durable personal Brain, OAuth connections, developer access, or paid private-beta access.
- If anonymous user signs up, session state and useful context should migrate where policy allows.

### Flow 2: Guest Starts Free

Entry options:

- `Start free` from homepage.
- `Try Agent` from Agent product card.
- `Open Chat` from Chat product card.

Recommended V2 behavior:

- Agent opens in a safe anonymous preview mode if runtime cost policy allows it.
- Chat remains the fallback free path if Agent preview needs stricter cost control.
- The UI must state what is unavailable anonymously without making the product feel broken.

Anonymous limits:

- Text-only or reduced-tool Agent.
- Session/workspace context only.
- No browser extension.
- No long-lived personal Brain writes.
- No private beta products.

Upgrade/sign-up prompt timing:

- After first meaningful value, not before.
- When user hits a limit.
- When user asks for memory, browser control, private beta, connected accounts, export, or durable history.

### Flow 3: User Signs In

Entry:

- Header Sign in.
- Limit reached prompt.
- Product gate prompt.
- Pricing checkout return.

After auth:

- Route to signed-in `/` dashboard, unless there is an explicit return target.
- Dashboard shows plan, usage, products, memory status, and next recommended action.
- If user came from a product gate, show product context in the dashboard and a clear continue CTA.

### Flow 4: Signed-In Dashboard

Entry:

- Main logo.
- `/`
- Post-auth default.
- Post-checkout success return after entitlement sync.

Dashboard is not a product surface. It is the command center.

It answers:

- My plan.
- My weekly remaining allowance.
- My 5-hour remaining allowance.
- Product availability.
- Product health.
- Memory status by scope.
- Active/pending work.
- Recent usage.
- Next recommended product action.

It does not contain:

- Agent command center/welcome card.
- Product-specific runtime tuning.
- Deep memory editing.
- Billing forms.
- Operator controls.

### Flow 5: User Opens Settings

Entry:

- Profile menu.
- Dashboard usage card.
- Product access row.
- Memory status row.
- Limit reached state.

Settings is global.

Top-level tabs:

- Account.
- Profile.
- Billing.
- Usage.
- Products.
- Connections.
- Memory & Data.
- Developer Access.
- Privacy & Security.

Settings must not duplicate product settings. It should deep-link into product-local settings where needed.

### Flow 6: User Opens A Product

Product entry always comes from:

- Dashboard product card.
- Primary navigation.
- Direct route.
- Relevant Settings deep link.

Every product follows the same end-to-end sequence:

1. Product surface.
2. Product-local settings tab.
3. Product usage and limits.
4. Product memory scope.
5. Operator/internal view.
6. E2E validation.

## Route Model

### Public Routes

| Route | Purpose | Notes |
| --- | --- | --- |
| `/` | Public product-family homepage for guests | Signed-in users see dashboard. |
| `/products/agent` | Public Agent product page | Existing product-page pattern. |
| `/products/spaces` | Public Chat/Spaces product page | Rename label to ZAKI Chat over time. |
| `/products/learn` | Public/private beta Learn page | Request beta. |
| `/products/hire` | Public/private beta Hire page | Request beta. |
| `/products/design` | Design early access page | Join waitlist. |
| `/pricing` | Free, Personal, Pro, Pro MAX | Monthly pricing and usage policy. |
| `/legal` | Legal and policies | Existing route. |
| `/help` | Help and support | Existing route. |

Do not use public `/agent` for marketing in V2 because authenticated `/agent` is now the product workbench route.

### Authenticated App Routes

| Route | Surface | Owner | V2 role |
| --- | --- | --- | --- |
| `/` | Dashboard | Platform | Main command center. |
| `/agent` | ZAKI Agent | Agent | Main consumer product. |
| `/agent/runs/:runId` | Agent run detail | Agent | Durable trace and work replay. |
| `/agent/browser` | Browser control | Agent + Developer Access | Server browser and extension status. |
| `/agent/connectors` | API connectors | Agent + Developer Access | OpenAPI/native connector activity. |
| `/chat` | ZAKI Chat | Chat/Spaces | New customer-facing alias. |
| `/spaces` | Spaces legacy route | Chat/Spaces | Compatibility route. |
| `/spaces/:spaceId/threads/:threadId` | Chat thread | Chat/Spaces | Existing route. |
| `/learn` | ZAKI Learn | Learn | Private beta surface. |
| `/hire` | ZAKI Hire | Hire | Private beta surface. |
| `/design` | ZAKI Design | Design | Early access placeholder. |
| `/brain` | Brain / Memory | Memory control plane | Memory governance. |
| `/settings` | Settings | Platform | Global governance. |
| `/settings/:section` | Settings section | Platform | Deep-linkable tabs. |
| `/internal/operator` | Operator command center | Ops | Target internal route. |
| `/internal/admin-access-codes` | Legacy admin route | Ops | Existing route, kept during migration. |

### Route Rule

Public product pages explain products. Authenticated product routes let users do work.

This avoids a conflict where `/agent` means marketing for one user and workbench for another.

## Product Family Map

| Product | Customer label | Current state | Primary route | Memory scope | Availability |
| --- | --- | --- | --- | --- | --- |
| `agent` | ZAKI Agent | Current | `/agent` | Personal Brain | Main consumer product. |
| `spaces` | ZAKI Chat | Current, legacy name Spaces | `/chat`, `/spaces` legacy | Workspace Memory | Free and paid chat/workspace product. |
| `learn` / `learning` | ZAKI Learn | Private beta | `/learn` | Learner Memory | Gated beta. |
| `hire` | ZAKI Hire | Private beta | `/hire` | Hire Memory | Gated beta. |
| `design` | ZAKI Design | Future early access | `/design` | Design Memory | Waitlist. |
| `brain` | ZAKI Brain | Control plane | `/brain` | Personal and cross-scope governance | Not a product usage surface. |
| `extensions` | Browser extension | V1 client | `/settings/developer-access` and `/agent/browser` | Personal Brain / Agent runtime | Authenticated only. |
| `cli` | ZAKI CLI | Future | `/settings/developer-access` | Personal Brain / Agent runtime | Later. |
| `local_app` | ZAKI Local App | Future | `/settings/developer-access` | Personal Brain / Agent runtime | Later. |

## Settings Ownership

### Global Settings Owns

- Account identity.
- Profile and display name.
- Email/auth/provider state.
- Billing and subscription.
- Usage across products.
- Product access and operational state.
- OAuth/connections.
- Device/client/developer access.
- Memory and data governance.
- Export/delete/retention.
- Privacy and security.

### Product Settings Own

- Product behavior only.
- Product defaults.
- Product-local channels or workflow options.
- Product-local memory shortcuts.
- Links to global Settings for billing, usage, privacy, OAuth, and cross-product memory.

## Product Completion Template

Each product is complete only after these are done:

| Layer | Requirement |
| --- | --- |
| Surface | Product route is useful, clear, and complete for its main workflow. |
| Product settings | Product-local settings exist and avoid global policy duplication. |
| Usage | Product usage appears in dashboard and Settings usage. |
| Meter | Product uses central grant/receipt contract for expensive work. |
| Memory | Product memory scope is visible and governed. |
| Empty/loading/error | Every product has real states for no data, loading, unavailable, degraded, read-only, maintenance, and limit reached. |
| Operator | Internal page exposes product state, health, user support facts, and diagnostics. |
| Verification | Unit/contract tests plus browser validation on desktop and mobile. |

## Implementation Order

Do not implement product screens before the shell and Settings are stable.

1. Dashboard V2.
2. Global Settings and Profile V2.
3. Operator/internal IA baseline.
4. ZAKI Agent surface.
5. ZAKI Agent settings tab.
6. Agent operator/runtime page.
7. ZAKI Chat surface.
8. Chat settings tab.
9. Chat operator page.
10. ZAKI Learn surface.
11. Learn settings tab.
12. Learn operator page.
13. ZAKI Hire surface.
14. Hire settings tab.
15. Hire operator page.
16. ZAKI Design placeholder/waitlist.
17. Design settings/early-access policy.
18. Design operator page.
19. Website V2 and pricing final pass.
20. Release verification harness.

## Dashboard Success Criteria

The V2 dashboard is accepted when:

- Guest `chatzaki.com` has a clear Agent-first product-family entry.
- Signed-in `/` is a dashboard, not a product welcome page.
- Main logo opens dashboard everywhere.
- User can understand plan, weekly allowance, 5-hour window, and reset timing in under 10 seconds.
- User can launch every visible product.
- Product states are honest: enabled, degraded, readOnly, maintenance, disabled, hidden.
- Memory scopes are visible by product.
- Beta and waitlist states are clear.
- No product-specific settings are hidden on the dashboard.
- Dashboard works in English and Arabic.
- Desktop and mobile layouts have no clipped text or overlapping UI.

## Open Decisions Before Implementation

These should be decided before coding Dashboard V2:

- Whether anonymous free starts with Agent preview or Chat by default.
- Whether `/chat` is introduced immediately or only after the V2 dashboard.
- Whether `/settings` becomes a route now or remains modal/sheet until the Settings V2 slice.
- Whether operator target route is `/internal/operator` while legacy `/internal/admin-access-codes` remains as alias.
