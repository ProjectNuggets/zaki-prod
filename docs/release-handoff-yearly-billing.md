# Release Handoff: Yearly Billing (Student + Personal + Pro + Pro Max)

## Scope delivered
- Added yearly interval support for `student`, `personal`, `pro`, and `pro_max` checkout.
- Added per-tier interval availability in billing config.
- Added interval exposure in entitlements response.
- Kept paid-user behavior unchanged: active paid users are blocked from duplicate checkout and should switch in billing portal.
- Kept campaign offer logic out of scope for this release.

## Backend changes
- New env vars:
  - `STRIPE_PRICE_STUDENT_YEARLY`
  - `STRIPE_PRICE_PERSONAL_YEARLY`
  - `STRIPE_PRICE_PRO_YEARLY`
  - `STRIPE_PRICE_PRO_MAX_YEARLY`
- New interval-aware Stripe pricing catalog and lookup helpers.
- `POST /api/billing/checkout` now accepts optional `interval` (`monthly` default).
- Student eligibility is `.edu` or manual verification (`student_verified`) for monthly + yearly.
- Stripe checkout metadata now includes `billing_interval`.
- Sync/entitlements derive interval via `stripe_price_id` mapping.
- `GET /api/billing/config` now includes `configured.pricingAvailability`:
  - `student.monthly|yearly`
  - `personal.monthly|yearly`
- `GET /api/entitlements` now includes `plan.interval`.

## Frontend changes
- Pricing page supports monthly/yearly selection for paid plans.
- Uses backend `pricingAvailability` for per-tier fallback.
- If yearly is unavailable for a tier, that yearly choice is disabled; it never falls back to monthly checkout.
- Checkout payload now includes `interval`.
- Yearly checkout path restricted to Stripe provider.

## Required Stripe inputs
Provide these before enabling pricing in production:
- Student monthly Stripe price ID -> `STRIPE_PRICE_STUDENT=price_1T40ht1CujkYBN77y4T61VjX`
- Student yearly Stripe price ID -> `STRIPE_PRICE_STUDENT_YEARLY=price_1T4g1L1CujkYBN77jp9hQTDV`
- Personal monthly Stripe price ID -> `STRIPE_PRICE_PERSONAL=price_1T6CFu1CujkYBN77O7JWWFhc`
- Personal yearly Stripe price ID -> `STRIPE_PRICE_PERSONAL_YEARLY=price_1T6CHR1CujkYBN77SaxD21T7`
- Access-code purchase Stripe price ID -> `STRIPE_PRICE_ACCESS_CODE_MONTHLY=price_1T6CIm1CujkYBN778pLtnDoJ`
- Pro yearly Stripe price ID -> `STRIPE_PRICE_PRO_YEARLY` (owner-provided; no amount is inferred in code)
- Pro Max yearly Stripe price ID -> `STRIPE_PRICE_PRO_MAX_YEARLY` (owner-provided; no amount is inferred in code)

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
2. Student monthly checkout succeeds for manually verified student account.
3. Student yearly checkout succeeds for `.edu`.
4. Student yearly checkout succeeds for manually verified student account.
5. Student yearly rejected for non-`.edu` and not manually verified.
6. Personal monthly checkout succeeds.
7. Personal yearly checkout succeeds.
8. Pro yearly checkout succeeds.
9. Pro Max yearly checkout succeeds.
10. Missing yearly env for one tier blocks only that tier yearly path.
11. Webhook updates plan tier/status and interval correctly.
12. Active paid user gets portal-first switching path (no duplicate checkout).
