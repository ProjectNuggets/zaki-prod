# ZAKI Prod As-Is Audit

Date: 2026-05-19
Scope: frontend, backend, routes, memory, product surfaces, auth, billing, usage, and production readiness.

## Executive Read

ZAKI is no longer a small chat wrapper. The repository is a multi-product AI platform with Spaces, Agent, Brain, Learning, pricing, billing, admin, public website, sharing, memory, OAuth, and websocket proxying. The product has real depth, but the current architecture is carrying too much in too few places.

The biggest truth from the code is this: the product has strong feature coverage but weak product-system boundaries. The backend gateway, frontend shell, usage model, and memory model all grew organically around earlier plan names and separate product launches. For production finalising, the goal should not be a cosmetic UI polish pass. The goal should be a ZAKI control plane: one account, one plan, one usage ledger, one auth system, one product router, and a clean memory governance layer across Spaces, Agent, and Learning.

## Codebase Shape

- Tracked files: 944.
- `src` + `backend/src` LOC: 123,052.
- Largest files:
  - `backend/src/index.js`: 13,975 LOC.
  - `src/app/components/learning/LearningPage.tsx`: 10,377 LOC.
  - `src/app/components/ChatArea.tsx`: 6,908 LOC.
  - `src/app/components/learning/LearningBookWorkspace.tsx`: 3,183 LOC.
  - `src/lib/api.ts`: 2,539 LOC.
  - `src/app/components/Sidebar.tsx`: 2,491 LOC.
  - `backend/src/memory/operations.js`: 2,327 LOC.
  - `src/app/components/agent/ZakiSettingsSheet.tsx`: 1,888 LOC.
  - `src/app/components/memory/MemoryViewer.tsx`: 1,540 LOC.
  - `src/app/components/brain/BrainGraphView.tsx`: 1,321 LOC.

This is the core production risk: ownership is hard because key user journeys are concentrated in multi-thousand-line files. These files are not only long; they hold multiple product responsibilities.

## Frontend Routes

Route config lives in `src/routes.tsx`.

The app currently has:

- Authenticated/public home split at `/`.
- Spaces routes:
  - `/spaces`
  - `/spaces/:spaceId`
  - `/spaces/:spaceId/threads/:threadId`
- Public/website routes:
  - `/pricing`, `/pricing/success`, `/products/:productId`, `/story`, `/faq`, `/contact`, comparison/how-to/legal routes, Arabic equivalents.
- Product routes:
  - `/brain`
  - `/learn`
  - `/zaki-bot` redirect to `/products/agent`
- Admin route:
  - `/internal/admin-access-codes`
- Share route outside app shell:
  - `/share/:token`

Route-level code splitting is not implemented. `ChatArea`, `BrainPage`, `LearningPage`, website pages, admin pages, and pricing are all eagerly imported from `src/routes.tsx`. This explains the oversized production bundle and should be treated as a launch blocker for perceived quality.

## Frontend App Shell

`src/app/App.tsx` handles:

- Font imports.
- React Router outlet.
- Public website gating.
- Anonymous Spaces gating.
- Auth hydration through `/api/auth/refresh`.
- User profile fetch.
- Legal consent checks.
- Theme syncing.
- Navigation-store sync.
- Desktop/mobile sidebar shell.
- Skip link and main landmark.

This is a functional shell, but it mixes platform concerns with rendering. The end-state should make `App.tsx` mostly composition:

- `AuthBootstrap`
- `LegalConsentGate`
- `ThemeProvider`
- `ProductShell`
- `PublicShell`

## Frontend Product Surfaces

### Spaces and Chat

`src/app/components/ChatArea.tsx` is the central chat surface for Spaces and Agent-in-app experience. It handles:

- Messages by thread.
- Streaming state.
- Agent session state.
- Agent approvals.
- Brain pinned context.
- Memory toasts and memory status.
- Workspace uploads.
- Sharing.
- Thread auto-title.
- Composer placement and viewport metrics.
- Drag/drop.
- ZAKI Agent/Spaces mode switching.

The file is carrying too much state and too many side effects. This increases regression risk when touching UI, memory, or product routing.

### Sidebar

`src/app/components/Sidebar.tsx` handles:

- Product navigation.
- Space list and thread list.
- ZAKI Agent sessions.
- Profile menu.
- Settings modal.
- ZAKI settings, sessions, cron, secrets, diagnostics, memory, power user sheets.
- Space settings and deletion flows.

The sidebar is not just navigation; it is also a product command center. In the target app, the command center should be explicit and centralized, not hidden inside sidebar incidental state.

### Learning

`src/app/components/learning/LearningPage.tsx` is a complete product inside one file. It owns:

- Chat, sources, books, notebooks, writer, review, agents, space, workspaces.
- Study profile and study plan.
- Knowledge bases.
- Websocket learning sessions.
- Learning memory selection.
- Tutor agents and channels.
- File uploads and protected assets.

Learning is feature-rich, but it is too concentrated. It needs product modules around capabilities, not one page file.

### Brain

Brain has a separate route and UI (`BrainPage`, `BrainGraphView`) and is mostly tied to the Agent/Nullclaw brain backend. It is the strongest “memory as brain” surface today, but it is not yet the universal memory/control-plane surface for the whole product.

## Backend Routes

`backend/src/index.js` is an overloaded gateway monolith. Literal route registrations plus dynamic route helpers cover:

- Health/readiness.
- Auth and Google OAuth.
- Website feedback/waitlist/telemetry.
- Signup/login/verification/password reset.
- Legal consent/profile/account export/delete.
- Billing config/checkout/sync/portal/cancel/entitlements/webhooks.
- Admins, rate limits, student verification, access codes.
- Spaces workspace/thread/chat/upload routes.
- Agent chat/history/diagnostics/provision/config/secrets/attachments/voice/telegram/heartbeat/cron/sessions/approvals.
- Agent Brain graph/timeline/search/memory/compose routes.
- Learning BFF, books, knowledge, notebooks, questions, skills, solve, vision, tutor agents, websockets.
- Share links.
- Websocket proxying for Agent and Learning.

The route surface is large enough that production should have explicit route modules and OpenAPI contract coverage. Keeping all of this in `index.js` makes every production change harder than it needs to be.

## Database

`backend/src/db.js` creates and alters tables during startup. There is one migration file in `backend/migrations/drop_typ_session_token.sql`, but the active schema management is mostly inline DDL in application startup.

Current tables created from code:

- `zaki_users`
- `zaki_admin_members`
- `zaki_workspace_metadata`
- `verification_tokens`
- `password_reset_tokens`
- `legal_consent_events`
- `shared_conversations`
- `access_codes`
- `access_code_redemptions`
- `zaki_learning_account_audit_events`
- `zaki_learning_study_profiles`
- `zaki_learning_study_plans`
- `zaki_learning_study_tasks`
- `access_code_orders`
- `billing_webhook_events`
- `product_analytics_events`
- `website_feedback_posts`
- `website_feedback_votes`
- `website_beta_waitlist`
- `zaki_bot_messages`
- `zaki_bot_threads`
- `zaki_daily_prompt_usage`
- `zaki_anonymous_prompt_usage`
- `zaki_runtime_settings`
- `zaki_bot_messages_legacy`
- `zaki_bot_messages_new`
- `zaki_hidden_workspaces`
- `memories`
- `memory_triggers`
- `memory_confirmations`
- `zaki_memory_preferences`
- `memory_translation_cache`
- `memory_conflicts`
- `memory_notifications`
- `memory_undo_windows`
- `zaki_sessions`

Startup DDL is pragmatic, but it is not a world-class production schema workflow. The target needs versioned migrations, migration tests, rollback plans, and schema ownership by domain.

## Auth and OAuth

Current auth is a good baseline:

- ZAKI JWT access token with 15-minute TTL.
- HttpOnly refresh cookie.
- Refresh token rotation.
- Concurrent refresh guard.
- Session revocation and session cap.
- No auth token localStorage coupling in `authStore`.
- Google OAuth with signed state, nonce cookie, return-to sanitization, token validation, and account creation/linking.

Current gaps:

- OAuth provider model is only Google-first; provider identity is stored on `zaki_users` (`google_sub`, `auth_provider`) instead of normalized identity rows.
- Legacy TYP fallback still exists in auth resolution.
- Future CLI/local app/extensions are not represented as first-class OAuth clients or device-code clients.
- API keys/scoped tokens for future external tools are not designed yet.

Recommendation: keep current session auth, but move to a normalized identity model before adding Apple, Microsoft, GitHub, CLI, local app, and extensions.

## Billing and Plans

Current commercial plan IDs:

- `spaces_free`
- `agent`
- `learn`
- `complete`
- `legacy_personal`
- `access_code`

This does not match the desired target:

- Free
- Personal
- Pro
- Pro MAX

Current pricing sells separate products (`agent`, `learn`, `complete`) rather than a platform plan where all products are visible and usage is governed by shared weekly allowance plus per-product limits.

The billing code is better than the plan model:

- Stripe pricing catalog exists.
- Billing transitions exist.
- Webhook event tracking exists.
- Sync and reconcile paths exist.
- Access-code purchase/redemption exists.

The target should preserve these foundations but replace the plan model with platform tiers and a product/usage catalog.

## Usage and Quotas

Current quota system:

- Spaces/app chat daily bucket.
- Anonymous Spaces daily bucket.
- Agent weekly bucket.
- Learning weekly bucket.
- Learning also has upload/storage/action/concurrency policy.
- Paid product access often bypasses quota entirely.
- Admin rate settings exist, but route-level IP rate limiting was removed because Cloudflare made IP limits unreliable.

The current quota model is fragmented and not aligned with “all products available, each product quota adds up to weekly allowance.”

Target usage model should be:

- Shared weekly allowance per plan.
- 5-hour burst/session window per plan and product.
- Per-product caps inside the shared allowance.
- Weighted usage units based on product, model, feature, duration, tokens, files, and websocket time.
- Settings usage dashboard with total remaining, per-product usage, reset times, and overage policy.
- Admin usage ledger with override/grant/refund tools.

## Spaces Memory Audit

The current Spaces memory system is stronger than expected. It is not a trivial or disposable feature.

It includes:

- `memories` table with embeddings, importance, confidence, decay, verification, source thread, status.
- `memory_confirmations` for review.
- `memory_conflicts` for contradictions.
- `memory_notifications`.
- `memory_undo_windows`.
- `zaki_memory_preferences`.
- `memory_translation_cache`.
- Policy modes: `balanced`, `ask_before_saving`, `save_less`, `save_more`.
- Sensitive candidate classification.
- Duplicate detection.
- Conflict detection.
- Confirmation and rejection.
- Undo.
- Lexical and pgvector retrieval.
- Context injection into Spaces chat.
- Memory viewer UI and toasts.

The problem is not feature count. The problem is production architecture.

Key risks:

- Memory identity is email-string scoped, while Agent and Learning use canonical numeric ZAKI user IDs.
- Memory scope is unclear. It presents user, thread, and space behavior, but storage is mostly user-global with source thread metadata.
- Capture is client-triggered after send for Spaces; backend capture during stream exists but is optional and disabled by default.
- Memory is hidden in sidebar UX, not elevated into a central memory/usage/control-plane model.
- Agent Brain is separate and stronger for graph memory. Spaces memory can conflict philosophically with “ZAKI the Agent has a brain” unless scoped deliberately.

Decision: do not remove Spaces memory blindly. Keep it if we redefine it as Workspace Memory, migrate identity to canonical user IDs, add real scope, add quality evaluation, and integrate it with the wider Memory Control Plane. If we cannot do that in the roadmap, freeze new auto-capture and keep review/export/delete controls until the migration is done.

## Agent and Brain

Agent is the richest product backend path:

- Authenticated stream chat to Nullclaw.
- Canonical user ID forwarding.
- Readiness probe.
- Weekly quota enforcement.
- Local app message persistence fallback.
- Session keys.
- History merge/fallback.
- Diagnostics.
- Provisioning.
- Secrets.
- Attachments.
- Voice.
- Telegram.
- Heartbeat.
- Cron.
- Sessions and approvals.
- Brain graph/local graph/orphans/diff/communities/timeline/search/memory/me/compose.

Agent is the product that should define ZAKI’s “brain” identity. The UI needs to make this feel central, not experimental.

## Learning

Learning is a large, mature BFF:

- Study profile, study plan, and study tasks in ZAKI DB.
- Knowledge bases and uploads.
- Books and book workspace.
- Notebooks.
- Co-writer.
- Question bank.
- Skills.
- Solve sessions.
- Vision.
- Tutor agents and channels.
- Websocket proxy with quota enforcement.
- Learning memory endpoints proxied to the learning engine.

Learning has memory/state, but it is learning-specific:

- Study profile/plans/tasks in ZAKI DB.
- Knowledge/notebook/session artifacts upstream.
- Learning memory endpoints through the Learning BFF.

This should not be collapsed into Spaces memory. It should be represented in a unified Memory Control Plane as Learner Memory with provenance and product-specific boundaries.

## UI and Design System

Strengths:

- Clear brand direction.
- Design tokens exist.
- Dark mode exists.
- Skip link, main landmark, reduced motion, aria labels, and live regions exist in several places.
- Lucide icon usage is broad.
- ZAKI-specific UI primitives exist (`SheetShell`, `EmptyState`, `SystemNotice`, `SourceChip`, `SectionHeader`).

Weaknesses:

- The app still uses many raw hex values and dark-mode patch selectors.
- Tokens allow 20px/24px card radii and pill-heavy surfaces, which makes the UI softer than the desired clean modern control-plane app.
- There are gradients/radials and decorative treatments that should be reduced for the core app.
- Product screens are dense and inconsistent because each product evolved separately.
- Settings has plan/billing and privacy, but no real usage dashboard.
- Learning uses a separate CSS-variable visual language from the ZAKI app shell.

The target design should be minimal, precise, and operational:

- One app shell.
- One product switcher.
- One settings system.
- One usage dashboard.
- One memory governance surface.
- Product-specific depth only after the user enters the product.

## Performance

The previous production build passed, but produced a very large JS bundle:

- Main JS around 2.8 MB minified.
- CSS around 255 KB.

The main cause is eager route imports and large product files. This must be fixed before launch:

- Lazy-load Learning, Brain, Agent settings, admin, marketing, and heavy graph/visualization modules.
- Split product clients.
- Add bundle budget CI.
- Prefer route-level and capability-level chunks.

## Tests

Test coverage is broader than typical for a project at this stage.

There are backend tests for:

- Auth.
- OAuth.
- Billing.
- Entitlements.
- Quota.
- Agent BFF/proxy.
- Learning BFF/contracts/quota/retention/DR/observability.
- Memory extraction/routes/context/capture/session.
- Health/readiness.

There are frontend tests for:

- App/auth/pricing/chat/input/login.
- Learning units.
- Memory viewer/toasts.
- UI primitives.
- Rendering helpers.

There are e2e specs for:

- Auth/pricing.
- Image rendering.
- Learning parity.
- Memory capture.
- Pricing display.
- Voice dictation.

Gaps:

- No formal OpenAPI contract test suite.
- No plan/usage entitlement matrix for the desired Free/Personal/Pro/Pro MAX model.
- No visual regression suite across desktop/mobile/product screens.
- No bundle-budget CI.
- No memory quality evals.
- No route ownership map.
- No production migration verification suite.

## Production-Readiness Verdict

Current grade: A- for feature depth, B- for production architecture, B for core UI consistency.

The app can become S-tier, but not through small cleanup. It needs a platform finalisation program:

1. Define the platform control plane.
2. Replace product-specific subscriptions with platform plans.
3. Replace fragmented quota with shared weekly usage plus 5-hour burst windows.
4. Convert Spaces memory into scoped Workspace Memory or freeze it.
5. Make Agent Brain the canonical personal/graph memory authority.
6. Represent Learning memory as learner-specific state with provenance.
7. Split backend/frontend monoliths into owned modules.
8. Build the clean modern shell and settings/usage dashboard.
9. Add production quality gates.

