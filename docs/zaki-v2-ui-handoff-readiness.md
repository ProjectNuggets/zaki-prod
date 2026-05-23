# ZAKI V2 UI Handoff Readiness

Date: 2026-05-23
Status: ready to receive Claude design files, not final-design complete
Owner: CTO/Product

This note defines what is stable enough for V2 UI/UX files to target.

## Readiness Decision

ZAKI is ready to ingest Claude design files for the app shell, dashboard, settings, product surfaces, and website because the central platform contracts now exist locally.

The V2 work should be treated as wiring and design-system replacement on top of these contracts, not a fresh product model discussion.

## Stable Product Logic

The app follows this MECE ownership model:

- Main logo opens the global dashboard/control center.
- Settings owns account, billing, platform usage, product access, memory/data/privacy, OAuth, sessions, and future developer access.
- Product surfaces own their workflows:
  - Spaces/Chat: workspace and thread execution.
  - Agent: active sessions, approvals, tools, channels, heartbeat, runtime diagnostics.
  - Learn: study loop, sources, books, notebooks, tutor agents, learner memory.
  - Brain/Memory: personal graph, search, timeline, review, provenance, conflicts.
- Product-local settings must link back to global Settings for billing, global usage, OAuth, privacy, and cross-product memory policy.

## Stable API Contracts

V2 UI should consume these contracts first:

- `GET /api/products/registry`
  - Product catalog, lifecycle, operational state, route, entry point, and memory scope.
- `GET /api/meter/status`
  - Plan tier, rolling five-hour window, weekly allowance, reset times, product states, grant policies, and per-product weighted usage windows.
  - Supports authenticated users and anonymous sessions.
- `POST /api/meter/grants`
  - Central grant contract for downstream products such as Hire.
- `POST /api/meter/receipts`
  - Central receipt contract. Products report raw facts; central app computes weighted debit.
- `GET /api/usage/summary`
  - Transitional compatibility endpoint for current Settings per-product rows.
  - Do not treat it as the final source of truth for the V2 usage dashboard.

Frontend clients now include:

- `fetchMeterStatus()`
- `useMeterStatus()`
- `fetchAnonymousMeterStatus()`
- `useAnonymousMeterStatus()`
- `fetchProductRegistry()`
- `useProductRegistry()`
- `fetchPlatformUsageSummary()` as compatibility only.

## Current Metering Coverage

Central metering is wired as follows:

- Hire: central grant/receipt API contract exists for downstream Hire to consume.
- Learning: HTTP mutations and websocket turns issue central grants and write receipts.
- Spaces/Chat: authenticated and anonymous chat issue central grants and write receipts.
- Agent: direct `/api/agent/chat/stream` and `/v1/me/bot/chat/stream` issue central grants and write receipts.

Failed upstream calls write failed receipts with zero weighted debit.
Settings now reads product usage rows from `/api/meter/status`; `GET /api/usage/summary` is fallback compatibility only.

## Current Dashboard IA

The signed-in root surface is now the global command center. V2 should preserve this responsibility and replace the visual system around it:

- Plan card from `/api/meter/status`.
- Weekly allowance card from `/api/meter/status`.
- Five-hour rolling window card from `/api/meter/status`.
- Product launch cards from `/api/products/registry`.
- Product usage rows from the central meter product breakdown.
- Product state badges from registry and meter status.
- Memory scope rows from product registry metadata.
- Agent launcher routes to the Agent product surface, not back to the command center.
- Spaces/Chat and Learn launch directly to their product routes.
- Hire and Design remain visible as product-family members but are gated by operational state until ready.
- Anonymous/free dashboard data uses the anonymous meter status client when there is no auth token.

## Current Settings IA

Settings V1 has been reorganized into the same MECE buckets V2 should target:

- Account: profile, theme, language.
- Connections: connected identity/provider status, currently Google.
- Billing: current plan, billing portal, cancellation.
- Products: product access, operational state, lifecycle, entry point, and memory scope.
- Usage: platform weekly allowance, five-hour window, and per-product weighted usage.
- Memory & Data: memory scope ownership and account export, with a link to Brain/Memory controls.
- Developer Access: future CLI, local app, and extensions clients from the product registry.
- Privacy: destructive account deletion only.

## What Claude Design Files Should Provide

The design files should focus on:

- App shell and navigation.
- Main dashboard/control center.
- Settings V2 IA and visual system.
- Usage meter components for weekly and five-hour windows.
- Product access/state components.
- Memory scope and provenance components.
- Product surfaces for Spaces/Chat, Agent, Learn, Brain, Hire placeholder, and future Design placeholder.
- Website V2 and pricing pages for Free, Personal, Pro, Pro MAX.
- Empty, loading, error, limit-reached, disabled, maintenance, degraded, and read-only states.
- Desktop and mobile frames.
- EN and AR behavior where layout changes.

## V2 Integration Rules

- Do not invent a second billing or usage model in the UI.
- Do not place global usage, billing, OAuth, or account deletion inside Agent settings.
- Do not merge memory scopes visually into one anonymous bucket.
- Do not hide future products from architecture; gate them by product state and UI policy.
- Use `meter/status` for global allowance cards.
- Use `products/registry` for product launchers, product state, memory scope, and future product rows.
- Use product-local endpoints only for product-local workflows.

## Known Gaps Before Final S-Tier Claim

These are acceptable while receiving design files, but must be closed before final launch:

- Dashboard V1 is contract-wired; visual V2 replacement and responsive polish are still pending.
- Anonymous/free dashboard data is wired at component level; public entry routing beyond Spaces still needs final product decision.
- Full Memory Control Plane governance is not complete.
- Pricing/checkout still needs final Free/Personal/Pro/Pro MAX migration.
- Auth future-surface foundation for CLI/local/extensions remains a later slice.
- Admin/support command center is not yet built.
- Visual regression, accessibility, bundle, and E2E release harness still need final gates.

## Intake Checklist

When Claude design files arrive:

- Map frames to: Dashboard, Settings, Spaces/Chat, Agent, Learn, Brain/Memory, Website, Pricing.
- Extract tokens: color, type, spacing, radius, elevation, motion.
- Identify new components and map each to an existing contract or mark backend gap.
- Reject any design that duplicates global Settings inside a product surface.
- Preserve current working backend contracts unless a design requirement proves a missing contract.
