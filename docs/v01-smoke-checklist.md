# V0.1 Smoke Checklist (Staging)

## API smoke (automated)

Run:

```bash
PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH" \
SMOKE_BASE_URL="https://<staging-backend-url>" \
SMOKE_SKIP_SIGNUP=true \
SMOKE_ADMIN_EMAIL="<admin-email>" \
SMOKE_ADMIN_PASSWORD="<admin-password>" \
SMOKE_USER_EMAIL="<regular-user-email>" \
SMOKE_USER_PASSWORD="<regular-user-password>" \
SMOKE_LEGAL_POLICY_VERSION="2026-02-17.v2" \
npm run smoke:v01
```

Expected:
- Script exits `0`
- JSON output includes `"ok": true`

## Memory load sanity (automated)

```bash
LOAD_BASE_URL="https://<staging-backend-url>" \
LOAD_TOKEN="<jwt-or-service-token>" \
node scripts/load-memory.mjs \
  --duration=20 \
  --concurrency=8 \
  --target-rps=4 \
  --assert-min-total=30 \
  --assert-min-success-rate=0.85 \
  --assert-max-unauthorized=2
```

Expected:
- Command exits `0`
- p95 latency and success rate are within thresholds

## UI smoke (manual)

1. Login page
- Sign in with regular user
- Verify access code field is visible on login
- Verify Terms, Privacy & Compliance checkbox is required for login/signup

2. Pricing page
- Redeem valid access code
- Confirm success toast and active access summary appears

3. Chat stream + expired access handling
- For user without active access, send a message
- Confirm error toast appears and app redirects to `/pricing`

4. Settings billing and account actions
- Open Settings
- Confirm Cancel subscription button exists (Plan & Billing)
- Confirm Delete account flow requires email confirmation
- Confirm Export all data downloads JSON

5. Hidden admin page
- Open `/internal/admin-access-codes` as admin
- Create code, list code, disable code
- Verify non-admin gets blocked/“Not found”

6. Help and legal
- Open profile menu
- Verify `Need help?` opens `/help`
- Verify `Terms & Conditions` opens `/legal`

7. Re-consent on policy bump
- Temporarily set backend `ZAKI_LEGAL_POLICY_VERSION` to a newer version than user consent
- Log in with an existing user
- Verify the app blocks with re-consent modal and acceptance unblocks usage
