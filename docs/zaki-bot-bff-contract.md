# ZAKI BOT BFF Contract

Last updated: March 26, 2026

## Summary

ZAKI-PROD exposes two compatible backend surfaces for ZAKI BOT:

1. Existing agent routes under `/api/agent/*`
2. Action-style aliases under `/v1/me/bot/*`

The alias surface is additive and backward compatible. Existing `/api/agent/*` routes remain valid, but the product settings plane now uses `/v1/me/bot/*` as its canonical route family.

## Auth and user scope

- ZAKI is the source of truth for authenticated user identity.
- Backend routes derive the BOT user scope from the authenticated ZAKI user.
- Client-supplied `user_id` values are not trusted.
- Forwarded upstream headers continue to include:
  - `X-Internal-Token`
  - `X-Zaki-User-Id`
  - `X-Request-Id`
- Production smoke checks may use a tightly scoped internal-token bypass for:
  - `POST /api/agent/chat/stream`
  - `GET /api/agent/diagnostics`
  - `POST /v1/me/bot/chat/stream`
  This is restricted to internal-token callers and canonical numeric `X-Zaki-User-Id` values.

## Route mapping

| Alias | Existing route | Notes |
| --- | --- | --- |
| `POST /v1/me/bot/provision` | `POST /api/agent/provision` | Canonical user id is injected server-side |
| `GET /v1/me/bot/onboarding` | `GET /api/agent/onboarding` | Same response contract |
| `PUT /v1/me/bot/onboarding` | `PUT /api/agent/onboarding` | Same request/response contract |
| `POST /v1/me/bot/chat/stream` | `POST /api/agent/chat/stream` | SSE contract unchanged |
| `GET /v1/me/bot/settings` | `GET /api/agent/config` | Read config |
| `PATCH /v1/me/bot/settings` | `PATCH /api/agent/config` | Update config |
| `GET /v1/me/bot/heartbeat` | `GET /api/agent/heartbeat` | Canonical heartbeat status for the settings plane |
| `PUT /v1/me/bot/heartbeat` | `PUT /api/agent/heartbeat` | Heartbeat remains boolean-only in the product UX |
| `POST /v1/me/bot/telegram/connect` | `POST /api/agent/channels/telegram/connect` | Connect Telegram |
| `POST /v1/me/bot/telegram/disconnect` | `DELETE /api/agent/channels/telegram/disconnect` or `POST /api/agent/channels/telegram/disconnect` | Disconnect alias is POST-friendly for frontend actions |
| `GET /v1/me/bot/usage` | `GET /api/usage/quota?surface=zaki_bot` | Returns zaki_bot quota shape |

## Product-facing route policy

For the ZAKI settings plane:

- onboarding uses `/v1/me/bot/onboarding`
- settings use `/v1/me/bot/settings`
- heartbeat uses `/v1/me/bot/heartbeat`
- Telegram connect/disconnect use `/v1/me/bot/telegram/*`

Legacy `/api/agent/*` routes remain for compatibility and lower-level integrations, but product UI should not depend on them.

## Telegram connect behavior

The canonical product route is `POST /v1/me/bot/telegram/connect`.

Normal product usage does not require users to supply:

- `webhook_url`
- `webhook_base_url`
- `webhook_secret_token`

Instead:

- the backend injects `X-Webhook-Base-Url` from `ZAKI_AGENT_WEBHOOK_BASE_URL`
- Nullalis derives the user-specific webhook path
- product UI confirms connected state after refresh rather than trusting the mutation response alone

When the platform webhook base is missing or invalid, the BFF fails fast with a stable operator-facing error instead of letting Telegram setup appear partially successful.

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
