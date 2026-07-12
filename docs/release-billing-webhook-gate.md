# Release Gate: Billing Webhook E2E

Use this before handing to merge/release engineer.

## 1) Required Environment

Backend production-like env:

- `NODE_ENV=production`
- `ZAKI_BILLING_PROVIDER=stripe`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STUDENT`
- `STRIPE_PRICE_PERSONAL`
- `STRIPE_PRICE_STUDENT_YEARLY`
- `STRIPE_PRICE_PERSONAL_YEARLY`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_PRO_MAX`
- `STRIPE_PRICE_ACCESS_CODE_MONTHLY`
- `ZAKI_ALLOWED_ORIGINS` (real frontend domains only)
- Optional billing alerting:
  - `ZAKI_BILLING_ALERT_WEBHOOK_URL`
  - `ZAKI_BILLING_ALERT_WEBHOOK_TOKEN`
  - `ZAKI_BILLING_ALERT_TIMEOUT_MS`
  - `ZAKI_BILLING_ALERT_COOLDOWN_MS`

Smoke user/admin credentials:

- `SMOKE_USER_EMAIL`
- `SMOKE_USER_PASSWORD`
- `SMOKE_ADMIN_EMAIL`
- `SMOKE_ADMIN_PASSWORD`

## 2) Full Release Check Command

Run:

```bash
RELEASE_CHECK_RUN_MEMORY_SMOKE=true \
RELEASE_CHECK_RUN_BILLING_E2E=true \
npm run release:check
```

Notes:
- `release:check` runs lint/tests/typecheck/build and optional smoke gates.
- Billing smoke opens a checkout URL and waits for webhook + entitlement update.
- Do not call `/api/billing/sync` during this gate.

## 3) Billing E2E-Only Command

Run:

```bash
SMOKE_BASE_URL=https://your-api-url \
SMOKE_USER_EMAIL=<verified_free_user> \
SMOKE_USER_PASSWORD='<pwd>' \
SMOKE_ADMIN_EMAIL=<admin_user> \
SMOKE_ADMIN_PASSWORD='<pwd>' \
npm run smoke:billing
```

Behavior:
- Creates checkout session.
- Waits for operator to complete checkout.
- Polls `/api/admin/telemetry/billing` for Stripe processed event count increase.
- Polls `/api/entitlements` for premium activation.
- Fails on timeout (`SMOKE_BILLING_WEBHOOK_TIMEOUT_MS`, default 10m).

## 4) Required-Mode Secrets Check

The smoke script supports `SMOKE_REQUIRE_SECRETS=true`. When set, a missing
`SMOKE_USER_EMAIL` / `SMOKE_USER_PASSWORD` / `SMOKE_ADMIN_EMAIL` /
`SMOKE_ADMIN_PASSWORD` fails loudly (`REQUIRED-MODE FAILURE: ...`) instead of
just throwing — the gate cannot be silently skipped by leaving secrets unset.

`release:check` already runs the billing smoke in required mode whenever it's
enabled (`RELEASE_CHECK_RUN_BILLING_E2E=true`). The `RELEASE_CHECK_RUN_BILLING_E2E`
default itself stays opt-in (off by default) until staging + Stripe test
secrets are provisioned. Once those exist, flip enforcement on by default by
removing the opt-in check in `scripts/release-check-next-release.mjs`.

## 5) Pass/Fail Criteria

Pass when:
- Stripe processed count increases from baseline.
- User entitlements switch to premium without running `/api/billing/sync`.
- No blocking errors in backend logs.

Fail when:
- Checkout URL creation fails.
- Webhook processed count does not increase within timeout.
- Entitlements remain free after webhook processing.

## 6) Staging Webhook Stress Drill

Run:

```bash
BILLING_STRESS_BASE_URL=https://your-api-url \
BILLING_STRESS_WEBHOOK_SECRET=<stripe_webhook_secret> \
BILLING_STRESS_EVENTS=200 \
BILLING_STRESS_CONCURRENCY=20 \
BILLING_STRESS_DUPLICATES_EVERY=10 \
BILLING_STRESS_OUT_OF_ORDER=true \
BILLING_STRESS_ADMIN_TOKEN=<optional_admin_bearer_token> \
npm run stress:billing-webhook
```

Behavior:
- Sends signed Stripe-style `customer.subscription.updated` events in parallel.
- Optionally injects duplicate IDs and out-of-order created timestamps.
- Fails non-zero on any non-2xx response.
- If `BILLING_STRESS_ADMIN_TOKEN` is provided, prints Stripe telemetry deltas for processed/duplicates.
