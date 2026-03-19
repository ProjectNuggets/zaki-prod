# Nullalis Runtime Contract

## Authoritative location

Production-owned Nullalis runtime assets live under:

- `infra/nullalis/runtime/runtime-config.env`
- `infra/nullalis/runtime/config.json.tmpl`
- `infra/nullalis/runtime/entrypoint.sh`
- `infra/nullalis/deployment.yaml`

## Required Kubernetes secret keys

Secret name: `nullclaw-runtime-secrets`

Required:
- `TOGETHER_API_KEY`
- `INTERNAL_SERVICE_TOKEN`
- `POSTGRES_CONNECTION_STRING`

Optional but supported:
- `PGBOUNCER_CONNECTION_STRING`
- `COMPOSIO_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `PGBOUNCER_DB_HOST`
- `PGBOUNCER_DB_PORT`
- `PGBOUNCER_DB_NAME`
- `PGBOUNCER_DB_USER`
- `PGBOUNCER_DB_PASSWORD`
- `PGBOUNCER_ADMIN_USER`
- `PGBOUNCER_ADMIN_PASSWORD`
- `PGBOUNCER_STATS_USER`
- `PGBOUNCER_STATS_PASSWORD`

## Required runtime defaults

- primary provider: `together-ai`
- primary model: `moonshotai/kimi-k2.5`
- primary ref: `together-ai/moonshotai/kimi-k2.5`
- provider base URL: `https://api.together.xyz/v1`
- state backend: `postgres`

## Backend dependency contract

`zaki-api` should only depend on:

- `NULLCLAW_BASE_URL`
- `NULLCLAW_INTERNAL_TOKEN`

`zaki-api` must not encode provider-specific logic.
