# ZAKI Backend

This backend manages ZAKI user accounts (email + verification) and creates NOVA.TYP users when verified users log in.

## Setup

1) Copy the environment file:

```
cp .env.example .env
```

2) Edit `.env` and set:
- `DATABASE_URL` (ex: `postgres://user:pass@localhost:5433/zaki`)
- `NOVA_TYP_BASE_URL` (ex: `https://typ.novanuggets.com`)
- `NOVA_TYP_API_KEY` (admin API key from NOVA.TYP)
- `ZAKI_AGENT_BACKEND_ENABLED` (`true` to enable Nullclaw adapter route)
- `NULLCLAW_BASE_URL` (ex: `https://agent-staging.zaki.com`)
- `NULLCLAW_INTERNAL_TOKEN` (must match Nullclaw `X-Internal-Token` allowlist)
- `ZAKI_ALLOWED_ORIGINS` (comma-separated list of frontend origins)
- `ZAKI_BILLING_PROVIDER` (`stripe`, `creem`, `paddle`, `external`, or `none`; default `stripe`)
- `ZAKI_EXTERNAL_CHECKOUT_URL_STUDENT` (required when `ZAKI_BILLING_PROVIDER=paddle|external`)
- `ZAKI_EXTERNAL_CHECKOUT_URL_PERSONAL` (required when `ZAKI_BILLING_PROVIDER=paddle|external`)
- `ZAKI_EXTERNAL_PORTAL_URL` (optional portal/manage URL when `ZAKI_BILLING_PROVIDER=paddle|external`)
- `ZAKI_EXTERNAL_PROVIDER_LABEL` (optional provider name shown in UI, default `Paddle`)
- `CREEM_API_KEY` (required when `ZAKI_BILLING_PROVIDER=creem`)
- `CREEM_PRODUCT_ID_STUDENT` (required when `ZAKI_BILLING_PROVIDER=creem`)
- `CREEM_PRODUCT_ID_PERSONAL` (required when `ZAKI_BILLING_PROVIDER=creem`)
- `CREEM_API_BASE_URL` (optional, default `https://api.creem.io`)
- `CREEM_SUCCESS_URL` (optional custom success redirect URL)
- `CREEM_WEBHOOK_SECRET` (required to verify Creem webhook signatures)
- `ZAKI_SUPER_ADMIN_EMAILS` (comma-separated super admins; can add/remove admins)
- `ZAKI_ADMIN_EMAILS` (legacy bootstrap allowlist; deprecated for runtime access control)
- `ZAKI_PUBLIC_URL` (public backend URL for verification links)
- `ZAKI_APP_URL` (public frontend URL for password reset links)
- `ZAKI_DEFAULT_WORKSPACE_SLUG` (workspace slug to auto-assign new users)
- `ZAKI_WORKSPACE_SOFT_HIDE_FALLBACK_ENABLED` (default `true`; when NOVA delete cannot be confirmed, hide workspace from that user in ZAKI list as fallback)
- `ZAKI_LEGAL_POLICY_VERSION` (current required policy version, ex: `2026-02-17.v2`)
- `ZAKI_MEMORY_ALERT_WEBHOOK_URL` (optional webhook for memory pipeline alerts)
- `ZAKI_MEMORY_ALERT_WEBHOOK_TOKEN` (optional bearer token for alert webhook)
- `ZAKI_EMAIL_MODE` (`console`, `smtp`, `resend`, or `non`)
- `ZAKI_RESET_TTL_MINUTES` (password reset TTL in minutes)

3) Validate runtime config before deployment:

```
npm run config:check
```

Production safety notes:
- Set `NODE_ENV=production`
- `ZAKI_ALLOWED_ORIGINS` must contain only real frontend origins (no `localhost` or `file://`)
- `ZAKI_LEGAL_POLICY_VERSION` must be explicitly set
- Do not use verification bypass modes (`ZAKI_EMAIL_MODE=non|none|no`) in production

4) Install and run:

```
npm install
npm run dev
```

## Migration (SQLite → Postgres)

1) Ensure `DATABASE_URL` points to Postgres.
2) Set `SQLITE_PATH` if your SQLite file is not `backend/data/zaki.sqlite`.
3) Run:

```
npm run migrate:sqlite
```

## Endpoints

- `GET /health`
- `POST /signup` — body `{ "email": "...", "password": "...", "name": "...", "dateOfBirth": "YYYY-MM-DD", "legalConsentAccepted": true, "legalPolicyVersion": "2026-02-17.v2" }`
- `GET /verify?token=...`
- `POST /login` — body `{ "email": "...", "password": "..." }`
- `POST /zaki/workspaces` — body `{ "name": "..." }` (requires Authorization header)
- `POST /password-reset/request` — body `{ "email": "..." }`
- `POST /password-reset/confirm` — body `{ "token": "...", "password": "..." }`
- `GET /api/legal/consent-status` — returns current policy version and (if authenticated) whether re-consent is required
- `POST /api/legal/re-consent` — body `{ "legalConsentAccepted": true, "legalPolicyVersion": "2026-02-17.v2" }` (requires Authorization header)
- `GET /api/billing/config` — returns billing capability flags for the signed-in user context (requires Authorization header)
- `POST /api/billing/creem/webhook` — Creem signed webhook endpoint for subscription status sync
- `POST /api/access-code/redeem` — body `{ "code": "..." }` (requires Authorization header)
- `GET /api/account/export` — export account, memory, and billing data (requires Authorization header)
- `GET /api/admin/admins` — list admin members and actor role (admin auth required)
- `POST /api/admin/admins` — add/activate admin member (super admin auth required)
- `DELETE /api/admin/admins/:email` — remove admin member (super admin auth required)
- `POST /api/admin/access-codes` — create access codes (admin auth required)
- `GET /api/admin/access-codes` — list/search access codes (admin auth required)
- `PATCH /api/admin/access-codes/:id` — update/disable access code (admin auth required)
- `POST /api/telemetry/client-error` — ingest frontend runtime errors for production observability
- `GET /api/admin/telemetry/memory` — inspect memory pipeline telemetry and recent alerts (admin auth required)
- `POST /api/agent/chat/stream` — authenticated SSE proxy to Nullclaw `/api/v1/chat/stream` (requires `ZAKI_AGENT_BACKEND_ENABLED=true`)

Billing endpoints may return `503` with code `billing_unavailable` when Stripe is not configured in the runtime environment.

If `ZAKI_MEMORY_ALERT_WEBHOOK_URL` is configured, memory telemetry alerts are forwarded as JSON POST requests to that endpoint.

## Notes

- NOVA.TYP must be in multi-user mode for user creation.
- Users are created in NOVA.TYP as `role: "default"` on first verified login.
- If `ZAKI_EMAIL_MODE=console`, verification links are logged to stdout.
- If `ZAKI_EMAIL_MODE=non`, users are auto-verified on signup.
- If `ZAKI_EMAIL_MODE=resend`, set `RESEND_API_KEY` and `RESEND_FROM`.

## Access Code Generation

Create one-time or reusable monthly access codes:

```
npm run access-code:create -- --campaign=launch --count=10 --duration=30 --max=1
```

## Admin Dashboard API

Admin access is managed by `zaki_admin_members`.

Super admins:
- Configured by `ZAKI_SUPER_ADMIN_EMAILS`.
- Can add/remove admins from hidden admin page/API.

Admins:
- Can manage access codes.
- Cannot add/remove admins.

Create codes:

```
POST /api/admin/access-codes
{
  "campaign": "launch",
  "count": 25,
  "durationDays": 30,
  "maxRedemptions": 1,
  "expiresAt": "2026-12-31",
  "active": true
}
```

List codes:

```
GET /api/admin/access-codes?search=LAUN&active=true&limit=50&offset=0
```

Update/deactivate code:

```
PATCH /api/admin/access-codes/:id
{
  "active": false
}
```
