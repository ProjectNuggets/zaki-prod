# Release Handoff: Yearly Billing Foundation (Student + Personal)

## Scope delivered
- Added yearly interval support for `student` and `personal` checkout.
- Added per-tier interval availability in billing config.
- Added interval exposure in entitlements response.
- Kept paid-user behavior unchanged: active paid users are blocked from duplicate checkout and should switch in billing portal.
- Kept campaign offer logic out of scope for this release.

## Backend changes
- New env vars:
  - `STRIPE_PRICE_STUDENT_YEARLY`
  - `STRIPE_PRICE_PERSONAL_YEARLY`
- New interval-aware Stripe pricing catalog and lookup helpers.
- `POST /api/billing/checkout` now accepts optional `interval` (`monthly` default).
- `.edu` eligibility remains enforced for all student checkouts (monthly + yearly).
- Stripe checkout metadata now includes `billing_interval`.
- Sync/entitlements derive interval via `stripe_price_id` mapping.
- `GET /api/billing/config` now includes `configured.pricingAvailability`:
  - `student.monthly|yearly`
  - `personal.monthly|yearly`
- `GET /api/entitlements` now includes `plan.interval`.

## Frontend changes
- Pricing page supports monthly/yearly selection for paid plans.
- Uses backend `pricingAvailability` for per-tier fallback.
- If yearly is unavailable for a tier, that tier gracefully falls back to monthly.
- Checkout payload now includes `interval`.
- Yearly checkout path restricted to Stripe provider.

## Required Stripe inputs
Provide these before enabling yearly in production:
- Student yearly Stripe price ID -> `STRIPE_PRICE_STUDENT_YEARLY=price_1T4g1L1CujkYBN77jp9hQTDV`
- Personal yearly Stripe price ID -> `STRIPE_PRICE_PERSONAL_YEARLY=price_1T4g0l1CujkYBN77K3qk5gvU`

## Deployment sequence
1. Deploy backend + frontend with yearly env vars unset (safe no-op for yearly).
2. Set yearly env vars in staging.
3. Run staging checkout/webhook/entitlement validation.
4. Promote to production.
5. Set yearly env vars in production.
6. Monitor billing logs/alerts for 24h.

## Rollback
- Immediate rollback lever: unset one or both yearly env vars.
- Result:
  - Yearly checkout disables per affected tier.
  - Monthly remains available.
  - Existing subscriptions remain intact.

## Validation evidence (local)
- Backend lint: pass
- Backend tests: pass
- Frontend tests: pass
- Frontend typecheck: pass
- Frontend build: pass
- Release check: pass (`RELEASE_CHECK_VALIDATE_PROD_CONFIG=false`)

## Staging matrix to execute
1. Student monthly checkout succeeds for `.edu`.
2. Student yearly checkout succeeds for `.edu`.
3. Student yearly rejected for non-`.edu`.
4. Personal monthly checkout succeeds.
5. Personal yearly checkout succeeds.
6. Missing yearly env for one tier blocks only that tier yearly path.
7. Webhook updates plan tier/status and interval correctly.
8. Active paid user gets portal-first switching path (no duplicate checkout).
