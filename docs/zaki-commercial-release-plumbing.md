# ZAKI Commercial Release Plumbing

Date: 2026-05-23
Status: V2 app and website foundation checklist
Owner: CTO/Product

This note defines the commercial spine for the first fully commercialized ZAKI release. The app and website must present one product family, one account model, one plan ladder, one meter, and explicit memory ownership per product.

## Spine

| Concern | Source of truth | V2 app usage | V2 website usage |
| --- | --- | --- | --- |
| Product family | `GET /api/products/registry` | Dashboard launch cards, Settings product access, route policy | Agent-first product lineup, launch status, future products |
| Plan ladder | platform policy and billing catalog | Settings billing, dashboard plan card, upgrade gates | Pricing page, checkout CTAs |
| Usage | `GET /api/meter/status` plus grants and receipts | Weekly allowance, five-hour window, product debits | Explain limits and plan value |
| Grants | `POST /api/meter/grants` | Product entry and expensive action authorization | Not public-facing |
| Receipts | `POST /api/meter/receipts` | Raw product facts become weighted debit centrally | Not public-facing |
| Identity | auth session and anonymous session contracts | Signed-in, anonymous/free, future clients | Login, checkout, anonymous-to-account migration |
| Memory | Memory Control Plane contracts | Brain, workspace memory, learner memory, future product memory | Trust, privacy, product differentiation |
| Browser control | Agent runtime, extension pairing, and central client/device policy | Agent workbench live browser panel, STOP, approvals, extension status | Agent trust story and extension install path |
| Settings | Settings shell | Account, OAuth, billing, usage, products, memory/data, developer access, privacy | Account links and support docs |
| Dashboard | signed-in root command center | Plan, usage, products, memory scopes, product routing | Not public-facing |

## Release Rules

- ZAKI Agent is the main consumer product for the first commercial release.
- Products are downstream surfaces. They do not own billing, global usage, OAuth, account deletion, or global memory policy.
- Product state is operational. Entitlement and usage allowance are commercial decisions owned centrally.
- Future products stay visible in architecture and docs. They can be disabled, maintenance, degraded, read-only, hidden, or gated in UI.
- Free usage can be anonymous only when the central app issues a durable anonymous session and grants every expensive action.
- Products report raw facts. The central app computes weighted usage and owns final debit policy.
- Weekly allowance is an entitlement-week bucket anchored to first metered use after the active entitlement starts. It resets every seven days, unused units expire at reset, and there is no rollover balance.
- Every product route must be explainable by auth state, product state, entitlement, meter grant, memory side effect, and audit trail.
- Browser extension access must be paired and revoked through `zaki-prod`; users must not paste internal service tokens or runtime user ids.

## Launch Blockers

- S08-S10: central meter authority, weights, five-hour persistence, and enforcement bridge.
- S11: Stripe and pricing migration to Free, Personal, Pro, and Pro MAX.
- S12-S15: Memory Control Plane governance across product scopes.
- S16: route policy metadata for auth, entitlement, usage, memory, and audit behavior.
- Agent-first route/workbench: `/agent` must become the flagship product surface instead of entering through the old fixed Spaces/Bot thread.
- Browser-control V1: extension pairing, Nullalis extension tool parity, live run panel, STOP, audit, and raw usage facts.
- S18: product surface polish after V2 design files land.
- Website V2: pricing, product family, trust/privacy, and checkout copy aligned to the same contracts.
- S21-S22: release harness, browser flows, accessibility, performance, visual checks, and final manual competition pass.
