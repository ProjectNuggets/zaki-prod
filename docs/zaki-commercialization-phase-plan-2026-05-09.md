# ZAKI Commercialization Phase Plan

> **HISTORICAL — 2026-05-09.** This completed phase plan is retained for audit context and is not the
> current execution source of truth. Use the live coordination board and roadmap linked from
> `AGENTS.md`; use `docs/zaki-agent-first-v1-product-spec.md` for current product direction.

Status: historical phase plan.
Owner: Codex in this workspace.
Date locked: 2026-05-09.

This document records the execution model used to move ZAKI from the earlier beta/student-personal model into a commercial product model.

## Mission

Ship the new ZAKI commercial model end to end:

- Spaces becomes the anonymous freemium entry point.
- ZAKI Agent becomes a paid product at 29 USD/month.
- ZAKI Learn becomes a paid product at 19 USD/month.
- ZAKI Complete becomes a paid bundle at 39 USD/month.
- Existing active legacy paid users keep access and are treated as ZAKI Complete.
- Whole-app access codes remain V1 marketing/gift access.
- Google login, email verification, payment, routing, product pages, and migration all work together.

Nothing in this plan is intentionally deferred. If a phase discovers a blocker, the blocker must be fixed or explicitly recorded before moving on.

## Locked Decisions

### Product Catalog

| Product | Commercial Role | Price | Access |
| --- | --- | ---: | --- |
| Spaces Free | Freemium acquisition surface | Free | Anonymous daily quota, no memory |
| ZAKI Agent | Paid personal agent product | 29 USD/month | Account required |
| ZAKI Learn | Paid learning product | 19 USD/month | Account required |
| ZAKI Complete | Paid bundle | 39 USD/month | Agent, Learn, and uncapped Spaces |
| Access Code | Marketing/gift pass | Existing 30-day code | Whole-app access for V1 |

### Entitlement Rules

- Anonymous Spaces users get 10 messages per day.
- Anonymous users cannot use durable memory.
- Durable memory requires an authenticated account.
- Existing active legacy paid users receive ZAKI Complete access.
- Existing canceled legacy users do not receive paid access.
- Access codes grant whole-app paid access in V1.
- Product-specific access codes are out of scope for this commercialization pass and belong to V2.

### Pricing Rules

- ZAKI Agent: 29 USD/month.
- ZAKI Learn: 19 USD/month.
- ZAKI Complete: 39 USD/month.
- Complete should be presented as the recommended paid plan.
- Current active legacy 13 USD/month ZAKI-PERSONAL subscriber is grandfathered into Complete-level access at the existing subscription price until cancellation.

### Auth Rules

- Email/password remains supported.
- Resend remains the email delivery provider.
- Google OAuth is added end to end.
- Google users with a verified Google email are treated as email verified.
- Google login must preserve checkout intent.

## Phase Gates

Each phase must exit with evidence. Evidence can be tests, provider API checks, local browser verification, or a written migration snapshot.

| Phase | Name | Goal | Exit Gate |
| --- | --- | --- | --- |
| 1 | Product Entitlement Contract | Define product-aware entitlements while preserving legacy compatibility. | Free, access-code, legacy paid, Agent, Learn, and Complete permissions resolve correctly. |
| 2 | Stripe Live Catalog | Create and wire live Stripe products and prices. | Live checkout can be created for Agent, Learn, and Complete with correct prices. |
| 3 | Legacy Migration Safety | Preserve existing paid access without breaking canceled users. | Active legacy paid user maps to Complete; canceled users remain free. |
| 4 | Anonymous Spaces | Make Spaces usable without registration. | Incognito user can chat within daily quota; memory and paid surfaces remain gated. |
| 5 | Payment UX | Replace old Student/Personal pricing with the new products. | Pricing, success, settings, and plan badges show the new model and route correctly. |
| 6 | Google OAuth | Add Google login end to end. | New and existing users can authenticate through Google; checkout intent survives. |
| 7 | Resend Verification | Verify real email delivery and verification/reset flows. | Signup verification and password reset emails are delivered and functional. |
| 8 | Website Evolution | Update homepage and product pages without a redesign. | No stale beta copy; product pages and CTAs match the new commercial model. |
| 9 | App Routing And Guards | Align app routes with anonymous, free, and paid states. | Anonymous, free, access-code, legacy, and paid users land on the right surfaces. |
| 10 | End-To-End Verification | Prove the full funnel. | Automated tests plus manual provider checks pass with no P0/P1 blockers. |
| 11 | Deployment Readiness | Prepare production promotion. | Infra env contracts, live price IDs, webhook config, and rollout checklist are complete. |

## Evidence Log

| Date | Phase | Evidence | Status |
| --- | --- | --- | --- |
| 2026-05-09 | 1 | Added product-aware entitlement contract with backward-compatible effective fields, commercial product permissions, legacy Complete mapping, access-code whole-app mapping, frontend API type support, Spaces quota context, and Nullalis tier bridge updates. | PASS |
| 2026-05-09 | 1 | `npm --prefix backend test -- src/effective-entitlements.test.js src/nullalis-entitlement.test.js src/learning-quota.test.js src/agent-and-chat-quota.integration.test.js --runInBand` passed 67/67 tests. | PASS |
| 2026-05-09 | 1 | `node --check backend/src/index.js && node --check backend/src/effective-entitlements.js && node --check backend/src/nullalis-entitlement.js` passed. | PASS |
| 2026-05-09 | 1 | `npm run typecheck` passed. | PASS |
| 2026-05-09 | 2 | Created idempotent live Stripe catalog script and wired backend pricing config for ZAKI Agent, ZAKI Learn, and ZAKI Complete. Live prices: Agent `price_1TVHH91CujkYBN77tBq1e7As` at 29 USD/month, Learn `price_1TVHHA1CujkYBN77jCyWFlJe` at 19 USD/month, Complete `price_1TVHHC1CujkYBN77avv8nFnI` at 39 USD/month. | PASS |
| 2026-05-09 | 2 | `npm --prefix backend run billing:ensure-commercial-catalog` reran idempotently with `productCreated=false` and `priceCreated=false` for Agent, Learn, and Complete. | PASS |
| 2026-05-09 | 2 | `npm --prefix backend run billing:smoke-commercial-checkout` created and immediately expired live Checkout Sessions for Agent, Learn, and Complete with correct USD monthly amounts. | PASS |
| 2026-05-09 | 2 | `npm --prefix backend test -- src/billing-pricing.test.js src/config-validation.test.js src/billing-stripe-webhook-handler.integration.test.js src/effective-entitlements.test.js src/nullalis-entitlement.test.js --runInBand` passed 85/85 tests. | PASS |
| 2026-05-09 | 2 | `node --check backend/scripts/ensure-commercial-stripe-catalog.js`, `node --check backend/scripts/smoke-commercial-stripe-checkout.js`, backend syntax checks, and `npm run typecheck` passed. | PASS |
| 2026-05-09 | 3 | Live Stripe legacy migration snapshot found 3 subscriptions: 1 active legacy ZAKI-PERSONAL at 13 USD/month and 2 canceled legacy subscriptions. The active subscription maps to `legacy_personal` / ZAKI Complete; both canceled subscriptions map to Spaces Free. | PASS |
| 2026-05-09 | 3 | Added period-end guard so stale `active` subscription rows with known expired `current_period_end` do not keep paid access after cancellation/webhook drift. | PASS |
| 2026-05-09 | 3 | `npm --prefix backend run billing:snapshot-legacy-migration` passed against live Stripe and masked customer emails in output. | PASS |
| 2026-05-09 | 3 | `npm --prefix backend test -- src/effective-entitlements.test.js src/nullalis-entitlement.test.js src/billing-stripe-webhook-handler.integration.test.js --runInBand` passed 72/72 tests. | PASS |
| 2026-05-09 | 4 | Added anonymous Spaces quota storage, hashed anonymous quota consumption, registration-free anonymous thread creation, and a stateless anonymous Spaces chat route that never injects durable memory. | PASS |
| 2026-05-09 | 4 | Updated the app shell, sidebar, Spaces view, chat history loading, uploads, streaming, and auto-title behavior so anonymous `/spaces` users avoid authenticated workspace APIs and paid/memory-only actions. | PASS |
| 2026-05-09 | 4 | `npm --prefix backend test -- src/daily-quota.test.js src/agent-and-chat-quota.integration.test.js src/effective-entitlements.test.js --runInBand` passed 27/27 tests. | PASS |
| 2026-05-09 | 4 | `node --check backend/src/index.js && node --check backend/src/daily-quota.js && node --check backend/src/db.js` and `npm run typecheck` passed. | PASS |
| 2026-05-09 | 4 | Clean Playwright browser context loaded `/spaces` without login, opened `/spaces/zaky/threads/anon-*`, sent a real anonymous message, received a Spaces reply, stayed on the anonymous thread route, and logged no protected API failures. Screenshot: `.playwright-anonymous-spaces.png`. | PASS |
| 2026-05-09 | 5 | Replaced Student/Personal pricing UX with Spaces Free, ZAKI Agent, ZAKI Learn, and ZAKI Complete; made Complete recommended; preserved whole-app access-code purchase/redeem; updated sidebar badges, billing success copy, telemetry plan IDs, and public `/pricing` auth intent routing. | PASS |
| 2026-05-09 | 5 | Clean Playwright browser context loaded `/pricing` without a login wall, showed Agent/Learn/Complete, had no Student/Personal/Open beta copy, and clicking Complete routed to sign-in with `plan=complete&autostart=1` preserved. Screenshot: `.playwright-pricing-public.png`. | PASS |
| 2026-05-09 | 5 | `npm test -- src/app/components/PricingPage.test.tsx src/app/components/BillingSuccessPage.test.tsx --runInBand` passed 12/12 tests. | PASS |
| 2026-05-09 | 5 | `npm run typecheck`, locale JSON validation, `node --check backend/src/index.js`, and focused backend billing/entitlement tests passed. | PASS |
| 2026-05-09 | 6 | Added Google OAuth start/status/callback endpoints, signed state, server-side code exchange, Google ID tokeninfo validation, verified-email user create/link behavior, refresh-cookie session minting, Google login UI, and checkout-intent preservation. | PASS |
| 2026-05-09 | 6 | Added focused tests for OAuth config detection, callback URI resolution, local return URL sanitization, signed state tamper/expiry rejection, Google token payload validation, and existing/new Google user linking. `npm --prefix backend test -- src/google-oauth.test.js src/google-oauth-user.test.js src/config-validation.test.js src/auth-endpoints.test.js src/zaki-auth.test.js --runInBand` passed 42/42 tests. | PASS |
| 2026-05-09 | 6 | `node --check backend/src/index.js && node --check backend/src/google-oauth.js && node --check backend/src/google-oauth-user.js` and `npm run typecheck` passed. | PASS |
| 2026-05-09 | 6 | Local stack aligned to the Google-registered callback: backend on `8787`, frontend on `5179`, `GET /api/auth/google/status` returned enabled, OAuth start returned a Google redirect with callback `http://localhost:8787/api/auth/google/callback`, and Google accepted the redirect URI to the sign-in page. | PASS |
| 2026-05-09 | 6 | Successful Google consent callback remains pending a real Google account sign-in. The app has not been marked production-ready for OAuth until redirect/cookie/checkout continuation is verified after consent. | BLOCKED |
| 2026-05-09 | 7 | Corrected ignored local Resend sender override from placeholder domain to verified `chatzaki.com` sender domain so local app runs with the same verified sender identity. | PASS |
| 2026-05-09 | 7 | Added `backend/scripts/smoke-resend-auth-flows.js` and package script `email:smoke-resend-auth` to validate Resend domain status plus real signup, verification, password reset request, reset confirm, and login-with-reset-password through the local backend. | PASS |
| 2026-05-09 | 7 | `npm --prefix backend run email:smoke-resend-auth` passed. Resend reported `chatzaki.com` as `verified` in `eu-west-1`; signup and reset messages were accepted using Resend's official delivered test recipient; verification link, reset token, and login after reset all worked; generated smoke user was deleted. | PASS |
| 2026-05-09 | 7 | `node --check backend/scripts/smoke-resend-auth-flows.js` passed. | PASS |
| 2026-05-09 | 8 | Added a public logged-out homepage plus product deep-dive pages for Spaces, ZAKI Agent, ZAKI Learn, and ZAKI Complete. The authenticated root app route remains intact for signed-in users. | PASS |
| 2026-05-09 | 8 | Product pages route through `/products/:productId`, CTAs preserve pricing intents for Agent/Learn/Complete, Spaces routes to anonymous `/spaces`, and copied product screenshots are served from `public/marketing/` as real product previews. | PASS |
| 2026-05-09 | 8 | `npm test -- src/app/components/WebsitePage.test.tsx src/app/components/PricingPage.test.tsx --runInBand` passed 13/13 tests; `npm run typecheck` passed. | PASS |
| 2026-05-09 | 8 | Browser smoke verified `/` and `/products/learn` on desktop and `/products/learn` on mobile. No stale beta/student pricing copy appeared on the new public website pages; only the expected unauthenticated refresh 401 was logged. Screenshots: `zaki-website-home.png`, `zaki-website-learn.png`, `zaki-website-learn-mobile.png`. | PASS |
| 2026-05-09 | 9 | Aligned product route/payment attribution by adding product-page telemetry sources end to end across website CTAs, pricing query parsing, checkout context types, backend checkout validation, access-code checkout validation, and product-event validation. | PASS |
| 2026-05-09 | 9 | Changed authenticated Agent and Learn free previews from daily quota behavior to weekly quota behavior using UTC week-start buckets, `X-Zaki-Quota-Period`, and `weekly_limit_reached` payloads. Anonymous Spaces remains a 10/day no-memory quota. | PASS |
| 2026-05-09 | 9 | Verified the commercial boundary: Agent unlocks Agent only and does not uncapp Spaces; Learn unlocks Learn only; Complete, access-code, and active legacy users keep whole-app access including uncapped Spaces. | PASS |
| 2026-05-09 | 9 | Updated admin quota UI/API metadata, power-user usage surfaces, frontend quota copy, and README route docs to show Spaces daily plus Agent/Learn weekly quota periods. | PASS |
| 2026-05-09 | 9 | `npm --prefix backend test -- src/daily-quota.test.js src/agent-and-chat-quota.integration.test.js src/learning-quota.test.js src/effective-entitlements.test.js --runInBand` passed 39/39 tests. | PASS |
| 2026-05-09 | 9 | `node --check backend/src/index.js && node --check backend/src/daily-quota.js && node --check backend/src/quota-route-handlers.js && node --check backend/src/learning-quota.js`, `npm run typecheck`, `npm test -- src/app/components/WebsitePage.test.tsx src/app/components/PricingPage.test.tsx --runInBand`, and `npm test -- src/app/components/agent/PowerUserSheet.test.tsx --runInBand` passed. | PASS |
| 2026-05-09 | 10 | Live local entitlement/quota smoke created a verified throwaway user, checked free, Agent, Learn, Complete, legacy personal, and access-code states, verified Spaces daily plus Agent/Learn weekly quota periods, confirmed commercial billing catalog presence, and deleted the test user. | PASS |
| 2026-05-09 | 10 | Corrected local persisted runtime rate-limit drift from old values to the locked product contract: Spaces 10/day, Agent preview 10/week, Learn preview 10/week. Backend was restarted so runtime memory matched the DB setting. | PASS |
| 2026-05-09 | 10 | Live Stripe smoke created and expired Checkout Sessions for Agent, Learn, and Complete against live mode; live legacy snapshot still found 1 active legacy subscriber mapped to Complete and 2 canceled subscribers mapped to free. | PASS |
| 2026-05-09 | 10 | Live Resend smoke verified `chatzaki.com`, delivered signup/reset test messages, validated email verification, password reset confirm, login after reset, and deleted the smoke user. | PASS |
| 2026-05-09 | 10 | Browser sweep verified `/`, all `/products/*`, `/pricing`, `/spaces`, Learn CTA source preservation, paid pricing intent login with Google visible, desktop route copy, and mobile Learn overflow. Only expected unauthenticated refresh 401 appeared. Screenshot: `phase10-zaki-learn-mobile.png`. | PASS |
| 2026-05-09 | 10 | Market quota check against official OpenAI, Anthropic, and Google support docs supports the chosen model: constrained free tiers with reset windows are standard; 10/day anonymous Spaces plus 10/week Agent/Learn preview is a conservative, defensible launch quota. | PASS |
| 2026-05-09 | 10 | `npm --prefix backend test -- --runInBand` passed 51/51 suites and 432/432 tests. `npm test -- --runInBand` passed 38/38 suites and 278/278 tests. `npm run build`, `npm run typecheck`, and `npm --prefix backend run lint` passed. | PASS |
| 2026-05-09 | 10 | Successful Google consent callback remains the only manual external verification gap; Google OAuth status/start are enabled and Google accepts the registered localhost callback, but a real account consent flow has not been completed in-browser. | BLOCKED |
| 2026-05-09 | 11 | Updated env/docs to reflect production contract: commercial Stripe price IDs, Google OAuth settings, Resend settings, anonymous Spaces daily quota, Agent weekly quota, and Learn weekly quota. | PASS |
| 2026-05-09 | 11 | `npm --prefix backend run config:check` passed locally with Resend email mode and current origins. | PASS |
| 2026-05-09 | 11 | Production push gate remains closed until the manual Google consent callback is completed and production secret values are copied into the deployment secret store, not committed. | BLOCKED |

## Phase 1: Product Entitlement Contract

### Build

- Introduce canonical commercial plan identifiers:
  - spaces_free
  - agent
  - learn
  - complete
  - legacy_personal
  - access_code
- Keep backward-compatible fields during migration so current UI and tests can move incrementally.
- Add product permission shape:
  - Spaces access, quota mode, memory eligibility, uncapped status.
  - Agent access and preview limits.
  - Learn access and preview limits.
  - Billing plan identity and legacy/grandfathered status.
- Treat active legacy ZAKI-PERSONAL as Complete access.
- Treat active access code as Complete access for V1.

### Verify

- Unit tests for each entitlement source.
- API response snapshot tests for legacy and new plan states.
- Manual Stripe subscription snapshot confirming the active legacy subscriber.

## Phase 2: Stripe Live Catalog

### Build

- Create live Stripe products:
  - ZAKI Agent
  - ZAKI Learn
  - ZAKI Complete
- Create live monthly prices:
  - 29 USD/month for Agent.
  - 19 USD/month for Learn.
  - 39 USD/month for Complete.
- Add Stripe metadata that identifies the ZAKI plan for webhook processing.
- Create or reuse Stripe products idempotently by metadata so reruns do not create duplicate commercial products.
- Keep existing products and prices active until the new flow is live and verified.
- Update backend configuration contract to use the new price IDs.

### Verify

- Stripe API confirms live products and prices.
- Checkout sessions can be created for each product.
- Webhook handling maps each price to the correct entitlement.

## Phase 3: Legacy Migration Safety

### Build

- Snapshot live customers and subscriptions.
- Map active legacy ZAKI-PERSONAL subscriptions to Complete-level access.
- Leave canceled subscriptions as unpaid.
- Avoid mutating existing subscription prices unless explicitly required.
- Preserve portal/cancel behavior for legacy paid users.

### Verify

- Active legacy subscriber sees Complete access.
- Canceled legacy users see free access.
- Billing portal opens for legacy subscriber.

## Phase 4: Anonymous Spaces

### Build

- Allow app entry into Spaces without login.
- Create anonymous quota identity using browser-local anonymous ID plus server-side abuse controls.
- Enforce 10 anonymous Spaces messages per day.
- Disable memory creation, profile memory, saved memory review, Learn, Agent, billing, and account settings for anonymous users.
- Add upgrade prompts at quota exhaustion, memory entry points, and paid product entry points.

### Verify

- Incognito user can send Spaces messages.
- Anonymous user is blocked after daily quota.
- Anonymous user cannot activate memory.
- Authenticated user retains existing saved behavior.

## Phase 5: Payment UX

### Build

- Replace Student/Personal pricing cards with:
  - Spaces Free
  - ZAKI Agent
  - ZAKI Learn
  - ZAKI Complete
  - Access Code
- Make Complete the recommended paid plan.
- Support pricing intent parameters:
  - plan=agent
  - plan=learn
  - plan=complete
- Update success, settings, plan badges, billing notices, and cancellation copy.
- Remove student eligibility as a primary commercial path.

### Verify

- Unauthenticated paid plan click asks for auth and returns to checkout.
- Authenticated user can start each checkout.
- Existing legacy user sees grandfathered Complete-level access.

## Phase 6: Google OAuth

### Build

- Add Google OAuth start and callback endpoints.
- Use signed or stored OAuth state for CSRF protection.
- Exchange the authorization code server-side.
- Verify Google ID token issuer, audience, expiry, subject, email, and email verification.
- Create or link users by normalized verified email.
- Mint the existing ZAKI access token and refresh cookie.
- Add Continue with Google to login and signup.
- Preserve checkout intent through OAuth state.

### Verify

- New Google user can log in.
- Existing user with the same verified email can log in.
- Invalid OAuth state fails closed.
- Pricing intent survives login.

## Phase 7: Resend Verification

### Build

- Confirm Resend sender and domain configuration.
- Verify signup email delivery.
- Verify password reset delivery.
- Ensure production does not expose development verification links.

### Verify

- Real signup email is received.
- Verification link marks the user verified.
- Password reset link updates the password.
- Resend API/domain checks pass.

## Phase 8: Website Evolution

### Build

- Update homepage messaging to reflect the full product model.
- Remove ZAKI beta positioning.
- Promote Spaces as the free entry point.
- Promote Agent, Learn, and Complete as paid products.
- Add or update product deep-dive pages:
  - Spaces
  - ZAKI Agent
  - ZAKI Learn
  - Pricing
- Update navigation, footer, FAQ, comparison pages, and how-to surfaces that mention stale products or prices.
- Preserve the existing visual system and site architecture.
- Keep Arabic parity for primary surfaces.

### Verify

- Website build and prerender pass.
- No stale beta copy remains for ZAKI Agent.
- CTAs route to the correct app/pricing paths.

## Phase 9: App Routing And Guards

### Build

- Route anonymous users to Spaces instead of a hard login wall.
- Gate Agent and Learn behind account and entitlement checks.
- Gate memory behind account.
- Preserve legal, pricing, billing success, and reset routes.
- Add route-level upgrade messaging for free users entering paid surfaces.

### Verify

- Anonymous app entry works.
- Free authenticated user reaches Spaces but not paid products.
- Agent subscriber reaches Agent.
- Learn subscriber reaches Learn.
- Complete, access-code, and active legacy users reach all paid products.

## Phase 10: End-To-End Verification

### Build

- Add focused backend tests for entitlement mapping, Stripe price mapping, Google OAuth, and quota behavior.
- Add frontend tests for pricing and auth routing.
- Add Playwright coverage for anonymous Spaces, checkout intent, and paid route guards.

### Verify

- Backend tests pass.
- Frontend typecheck and targeted tests pass.
- Browser verification covers the core funnel.
- Provider checks pass for Stripe, Resend, and Google.

## Phase 11: Deployment Readiness

### Build

- Update deployment env contracts for new Stripe price IDs and Google OAuth settings.
- Confirm webhook endpoint and live webhook secret.
- Confirm CORS origins for website, app, and API.
- Keep secrets in local ignored files and production secret stores only; never commit live keys.
- Document rollback plan.
- Prepare production promotion notes.

### Verify

- Runtime config check passes.
- New env vars are present in production secret plan.
- Rollout can proceed without breaking the active legacy subscriber.

### Production Secret Contract

- `STRIPE_SECRET_KEY`: live restricted/secret key for Stripe.
- `STRIPE_WEBHOOK_SECRET`: live webhook signing secret for the production backend endpoint.
- `STRIPE_PRICE_AGENT_MONTHLY=price_1TVHH91CujkYBN77tBq1e7As`
- `STRIPE_PRICE_LEARN_MONTHLY=price_1TVHHA1CujkYBN77jCyWFlJe`
- `STRIPE_PRICE_COMPLETE_MONTHLY=price_1TVHHC1CujkYBN77avv8nFnI`
- `ZAKI_BILLING_PROVIDER=stripe`
- `RESEND_API_KEY`: live Resend key.
- `RESEND_FROM="ZAKI <noreply@chatzaki.com>"` or another verified `chatzaki.com` sender.
- `ZAKI_EMAIL_MODE=resend`
- `GOOGLE_CLIENT_ID`: Google OAuth web client ID.
- `GOOGLE_CLIENT_SECRET`: Google OAuth web client secret.
- `GOOGLE_OAUTH_REDIRECT_URI`: production callback, normally `https://<api-domain>/api/auth/google/callback`.
- `GOOGLE_OAUTH_STATE_SECRET`: long random production-only HMAC secret.
- `ZAKI_APP_CHAT_DAILY_PROMPT_LIMIT=10`
- `ZAKI_ANONYMOUS_SPACES_DAILY_PROMPT_LIMIT=10`
- `ZAKI_BOT_WEEKLY_PROMPT_LIMIT=10`
- `ZAKI_LEARNING_WEEKLY_PROMPT_LIMIT=10`
- `ZAKI_ALLOWED_ORIGINS`: exact production website/app origins.

### Rollback Notes

- Keep existing legacy Stripe prices active; do not delete old products/prices.
- If checkout issues appear, disable new checkout by removing the three new price env vars or setting billing provider to `none` while leaving existing subscription webhook handling intact.
- If Google OAuth callback fails in production, leave email/password auth enabled and remove Google client env vars; the login UI will hide Google sign-in.
- If quota behavior is wrong, reset `zaki_runtime_settings` key `rate_limits` to Spaces 10/day, Agent 10/week, Learn 10/week or temporarily lower the caps from the admin runtime page.
- If public website routing regresses, routes are isolated in `WebsitePage` plus `routes.tsx`; signed-in root still falls back to the app home.

## Execution Rule

After this plan is locked, work proceeds phase by phase. Each phase must produce evidence before the next phase begins. Strategy changes require an explicit dated note in this document.
