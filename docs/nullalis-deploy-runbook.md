# Nullalis Deploy Runbook

## Standard deploy

Run the `Deploy Nullalis` workflow in `zaki-prod` with:

- `cluster`: target DOKS cluster
- `namespace`: Nullalis namespace
- `deployment`: usually `nullclaw`
- `container`: usually `nullclaw`
- `image_ref`: immutable GHCR image to promote
- `backend_namespace`: usually `zaki`
- `backend_deployment`: usually `zaki-api`
- `smoke_user_id`: existing `zaki_users.id` used for relay smoke

## What the workflow does

1. Loads kubeconfig for the target cluster.
2. Verifies deployment prerequisites and required secret keys.
3. Applies the production-owned runtime ConfigMaps.
4. Applies the authoritative deployment manifest.
5. Waits for rollout.
6. Port-forwards Nullalis and `zaki-api`.
7. Runs direct smoke against Nullalis.
8. Runs relay smoke through `zaki-api`.
9. Enables `ZAKI_AGENT_BACKEND_ENABLED=true` and stores the last-known-good image on success.

## When not to deploy

Do not promote if:
- `TOGETHER_API_KEY` is missing
- Nullalis is already in an unstable rollout loop
- you do not have a valid `smoke_user_id`
