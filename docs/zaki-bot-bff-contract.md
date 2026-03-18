# ZAKI BOT BFF Contract

Last updated: March 13, 2026

## Summary

ZAKI-PROD exposes two compatible backend surfaces for ZAKI BOT:

1. Existing agent routes under `/api/agent/*`
2. Action-style aliases under `/v1/me/bot/*`

The alias surface is additive and backward compatible. Existing `/api/agent/*` routes remain valid.

## Auth and user scope

- ZAKI is the source of truth for authenticated user identity.
- Backend routes derive the BOT user scope from the authenticated ZAKI user.
- Client-supplied `user_id` values are not trusted.
- Forwarded upstream headers continue to include:
  - `X-Internal-Token`
  - `X-Zaki-User-Id`
  - `X-Request-Id`

## Route mapping

| Alias | Existing route | Notes |
| --- | --- | --- |
| `POST /v1/me/bot/provision` | `POST /api/agent/provision` | Canonical user id is injected server-side |
| `GET /v1/me/bot/onboarding` | `GET /api/agent/onboarding` | Same response contract |
| `PUT /v1/me/bot/onboarding` | `PUT /api/agent/onboarding` | Same request/response contract |
| `POST /v1/me/bot/chat/stream` | `POST /api/agent/chat/stream` | SSE contract unchanged |
| `GET /v1/me/bot/settings` | `GET /api/agent/config` | Read config |
| `PATCH /v1/me/bot/settings` | `PATCH /api/agent/config` | Update config |
| `POST /v1/me/bot/telegram/connect` | `POST /api/agent/channels/telegram/connect` | Connect Telegram |
| `POST /v1/me/bot/telegram/disconnect` | `DELETE /api/agent/channels/telegram/disconnect` or `POST /api/agent/channels/telegram/disconnect` | Disconnect alias is POST-friendly for frontend actions |
| `GET /v1/me/bot/usage` | `GET /api/usage/quota?surface=zaki_bot` | Returns zaki_bot quota shape |

## Telegram disconnect behavior

The disconnect path now supports:

- `DELETE /api/agent/channels/telegram/disconnect`
- `POST /api/agent/channels/telegram/disconnect`
- `POST /v1/me/bot/telegram/disconnect`

When upstream disconnect errors can be recognized, the backend normalizes them to stable UX codes:

- `invalid_token`
- `webhook_rejected`
- `secret_mismatch`
- `not_connected`

The backend preserves the upstream HTTP status code and returns JSON with at least:

```json
{
  "code": "not_connected",
  "error": "Telegram is not connected.",
  "message": "Telegram is not connected."
}
```

## Usage endpoint contract

`GET /v1/me/bot/usage` returns the same backward-compatible quota shape as `/api/usage/quota`, but it is always resolved for `surface=zaki_bot`.

Response shape:

```json
{
  "unlimited": false,
  "limit": 5,
  "used": 2,
  "remaining": 3,
  "resetAt": "2026-03-14T00:00:00.000Z",
  "bucket": "zaki_bot",
  "surface": "zaki_bot"
}
```

## Compatibility notes

- `/api/agent/*` remains the primary low-level integration surface.
- `/v1/me/bot/*` is the action-style BFF surface for user-facing BOT flows.
- No existing agent route behavior is removed or broken by this slice.
