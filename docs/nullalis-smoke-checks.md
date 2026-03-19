# Nullalis Smoke Checks

## Direct smoke

Script: `infra/nullalis/smoke-direct.sh`

Checks:
- `/health`
- `/ready`
- `/internal/diagnostics`
- effective provider is `together-ai/moonshotai/kimi-k2.5`
- effective state backend is `postgres`
- runtime is not degraded
- direct `/api/v1/chat/stream` returns SSE frames

## Relay smoke

Script: `infra/nullalis/smoke-relay.sh`

Checks:
- `GET /api/agent/diagnostics`
- upstream health is healthy
- upstream ready is healthy
- provider summary is `together-ai/moonshotai/kimi-k2.5`
- `POST /api/agent/chat/stream` returns SSE frames

## Smoke identity

Relay smoke requires a real `zaki_users.id`.
Use the workflow input `smoke_user_id` and keep it stable for operations.
