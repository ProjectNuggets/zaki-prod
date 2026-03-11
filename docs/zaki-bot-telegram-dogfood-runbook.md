# ZAKI BOT Telegram Dogfood Runbook (Dev)

This runbook is for dev deployment validation where each dogfooder connects a personal Telegram bot token in **ZAKI BOT** space.

## 1) Backend env requirements

Set these in zaki-prod backend runtime:

- `ZAKI_AGENT_BACKEND_ENABLED=true`
- `NULLCLAW_BASE_URL=https://<nullalis-dev-domain>`
- `NULLCLAW_INTERNAL_TOKEN=<internal-token>`
- `ZAKI_AGENT_WEBHOOK_BASE_URL=https://<nullalis-dev-domain>`

Notes:
- `ZAKI_AGENT_WEBHOOK_BASE_URL` is used as default when the UI does not provide webhook URL.
- URL must be HTTPS and publicly reachable by Telegram.

## 2) Dogfooder onboarding steps

For each user:

1. Open **ZAKI BOT** space.
2. Open ZAKI BOT settings panel.
3. Paste Telegram bot token.
4. Leave webhook URL empty (default header flow) unless overriding.
5. Click **Connect Telegram**.
6. Send a message to the bot from Telegram app.
7. Verify reply arrives in Telegram and app history.

Important:
- One dogfooder = one bot token.
- Do not share a single bot token across multiple users.

## 3) Go/no-go smoke checklist

Run per user:

1. App -> ZAKI BOT reply works (SSE stream visible).
2. Telegram inbound message reaches same user thread.
3. Telegram outbound reply works.
4. No cross-user history or token leakage.

Run once per deployment:

1. `GET /health` returns 200.
2. `GET /ready` returns 200.
3. `GET /api/agent/diagnostics` indicates upstream reachable.

## 4) Fast troubleshooting

If Telegram connect fails:

1. Confirm backend env `ZAKI_AGENT_WEBHOOK_BASE_URL` is set and HTTPS.
2. Confirm bot token format is valid (`<digits>:<token>`).
3. Confirm nullalis domain is reachable from internet.

If app responds but Telegram does not:

1. Check that webhook connect succeeded for that user.
2. Verify user-specific bot token was saved (not shared token).
3. Verify Telegram message was sent to the exact bot tied to that token.

If cross-user confusion appears:

1. Validate each request includes canonical `X-Zaki-User-Id`.
2. Validate each user has distinct `telegram_bot_token`.
