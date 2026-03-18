# T6 ZAKI Product API Contract

Date: 2026-03-14  
Source contract: nullalis `72a732a` / `v0.7-t6-contract-freeze`

## Canonical BFF Surface
1. `POST /v1/me/bot/provision`
2. `GET /v1/me/bot/onboarding`
3. `PUT /v1/me/bot/onboarding`
4. `GET /v1/me/bot/settings`
5. `PATCH /v1/me/bot/settings`
6. `POST /v1/me/bot/chat/stream`
7. `POST /v1/me/bot/telegram/connect`
8. `POST /v1/me/bot/telegram/disconnect`
9. `GET /v1/me/bot/usage`

## Stable Error Catalog
1. `temporary_contention`
2. `unauthorized`
3. `forbidden`
4. `invalid_telegram_token`
5. `provision_failed`
6. `settings_update_failed`
7. `usage_unavailable`

Standard error shape:
```json
{
  "error": "temporary_contention",
  "message": "Agent is busy on another node. Retry shortly.",
  "retryable": true,
  "request_id": "req_123"
}
```

## Product DTOs
### BotProvisionStatus
```json
{ "status": "provisioned" }
```

### BotOnboardingState
```json
{ "completed": true, "completed_at_s": 1760000000 }
```

### BotSettingsProfile
```json
{
  "assistant_mode": "balanced",
  "group_activation": "mention",
  "proactive_updates": true,
  "voice_replies": false,
  "session_timeout_minutes": 30
}
```

### TelegramConnectionState
```json
{ "status": "connected", "channel": "telegram" }
```

### BotUsageSummary
```json
{ "state": "normal", "requests_day": 4, "tokens_day": 0, "tokens_month": 0 }
```

Current note:
1. `requests_day` is derived from the existing ZAKI BOT daily quota counter.
2. `tokens_day` and `tokens_month` are emitted as `0` until token telemetry is wired in zaki-prod.
