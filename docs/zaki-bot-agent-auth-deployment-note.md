# ZAKI BOT Agent Auth Deployment Note

This note documents the auth behavior behind **ZAKI BOT** space startup and the failure mode that appeared during local development.

## Summary

Three different issues overlapped:

1. Frontend auth bootstrap race
2. Local internal-token mismatch between `zaki-prod` backend and Nullalis
3. Local canonical user-id mismatch between `zaki-prod` identity state and Nullalis identity state

All three must be understood separately.

## Request path

ZAKI BOT route startup now depends on the agent/control-plane path:

1. Browser opens `ZAKI BOT` space
2. Frontend calls `POST /api/agent/provision`
3. `zaki-prod` backend authenticates the browser bearer token
4. `zaki-prod` backend forwards the provision request to Nullalis:
   - `POST /api/v1/users/provision`
5. Backend-to-Nullalis auth uses the internal service token, not the browser bearer token

Normal app chat does **not** prove this path is healthy, because normal chat uses the regular chat/session route instead of the Nullalis provision flow.

## What failed locally

### 1. Frontend auth bootstrap race

After login, the frontend previously exposed protected UI as soon as a token existed in storage, before auth hydration had completed.

That allowed ZAKI BOT route-mount effects to fire early:

- `POST /api/agent/provision`
- initial agent history load

This produced spurious unauthorized failures during startup.

### 2. Local internal-token drift

Local `zaki-prod` backend was configured with:

- `NULLCLAW_INTERNAL_TOKEN=dev-internal-token`

But the running local Nullalis process was configured with a different real internal token.

Result:

- browser auth succeeded
- normal app chat still worked
- `POST /api/agent/provision` failed because the backend-to-Nullalis internal auth failed

This was a local config drift issue, not a user-session issue.

### 3. Local canonical identity drift

After the internal token was aligned, `POST /api/agent/provision` still failed with:

- `404 {"error":"unknown_user_id"}`

This was not a browser-auth failure.

The control-plane contract uses:

- `X-Zaki-User-Id: <canonical_user_id>`

`zaki-prod` forwards the local canonical user id from its own `public.zaki_users` row. Nullalis then validates that exact user id against its own `public.zaki_users`.

In local development, the two services were connected to different Postgres instances:

- `zaki-prod` backend: Dockerized Postgres via local `5433`
- Nullalis: local Postgres via `127.0.0.1:5432`

For the same email address, the canonical ids differed across those two databases. Example observed locally:

- `zaki-prod` database: `nova@test.com -> id=42`
- Nullalis database: `nova@test.com -> id=1`

Result:

- `zaki-prod` forwarded `X-Zaki-User-Id: 42`
- Nullalis looked for `public.zaki_users.id = 42`
- Nullalis could not find that id in its own database
- provisioning failed with `unknown_user_id`

This was a local identity-store drift issue, not a frontend issue.

## What changed in this branch

### Frontend fix

The frontend now treats `token stored` and `auth ready` as different states.

Behavior now:

1. Login stores token
2. Auth store enters loading state immediately
3. Protected ZAKI BOT bootstrap waits for confirmed hydrated auth user
4. Only then does the app call `/api/agent/provision` or route-mounted agent history fetches

This removes the mount-time race without weakening auth checks.

## Why production should be stable

Production stability depends on three layers now being correct:

### 1. Frontend startup behavior is now correct

The frontend no longer fires protected agent bootstrap calls before auth hydration finishes.

That should remain stable across environments because it is app logic, not deployment-specific behavior.

### 2. Helm/Kubernetes should own internal-token alignment

Production should not rely on local `.env` placeholders such as `dev-internal-token`.

Helm/Kubernetes should inject the same real internal service token into:

- `zaki-prod` backend
- Nullalis

That makes backend-to-Nullalis auth deterministic and avoids local-style config drift.

### 3. Helm/Kubernetes should preserve canonical identity parity

The Nullalis control-plane contract does **not** key users by email. It keys them by canonical user id:

- `X-Zaki-User-Id`

That means `zaki-prod` and Nullalis must agree on the exact `public.zaki_users.id` for a given user.

Production is stable only if:

- both services use the same canonical identity database

or

- they use replicated identity data with guaranteed id parity

It is **not** enough for both systems to contain the same email addresses.

## Required deployment contract

Deployment must preserve this separation:

### Browser -> zaki-prod backend

- Auth mechanism: bearer/session auth for the signed-in user

### zaki-prod backend -> Nullalis

- Auth mechanism: internal service token
- Identity key: canonical `X-Zaki-User-Id`
- Not exposed to the browser

These are different trust boundaries and must stay separate.

## Helm/K8s expectations

The deployment team should ensure:

1. One shared internal-token secret exists for the control-plane path
2. The exact same secret value is injected into:
   - `zaki-prod`
   - Nullalis
3. Placeholder local values are not used in deployed environments
4. Rotation updates both services together
5. `zaki-prod` and Nullalis resolve users from the same canonical identity source
6. If separate databases are used, `public.zaki_users.id` values must be identical across them

## Pre-deploy checks

Before rollout:

1. Confirm frontend build includes the auth-ready gating change
2. Confirm `NULLCLAW_BASE_URL` points at the intended Nullalis service
3. Confirm `NULLCLAW_INTERNAL_TOKEN` is sourced from the shared cluster secret
4. Confirm Nullalis is configured to accept that same token
5. Confirm `zaki-prod` and Nullalis read the same canonical identity store for `public.zaki_users`
6. For a known test user, verify the canonical user id is the same on both sides

## Post-deploy smoke checks

Run these after deployment:

1. Sign in and open `ZAKI BOT` space
2. Confirm initial route load does **not** return `401` on `/api/agent/provision`
3. Confirm initial route load does **not** return `404 {"error":"unknown_user_id"}` on `/api/agent/provision`
4. Confirm ZAKI BOT can provision and start chat normally
5. Confirm onboarding/settings endpoints load after provision
6. Confirm logged-out users are still blocked from protected routes
7. Confirm invalid/expired browser tokens still fail safely

## If `/api/agent/provision` fails again

Check in this order:

1. Frontend startup timing
   - Did a protected agent request fire before auth hydration completed?
2. Browser auth
   - Did `/system/refresh-user` succeed for the signed-in token?
3. Internal service auth
   - Are `zaki-prod` and Nullalis using the same internal token?
4. Canonical identity parity
   - Does the forwarded `X-Zaki-User-Id` exist in Nullalis' `public.zaki_users`?
   - Do both services resolve the same numeric user id for the same user?
5. Service routing
   - Is `NULLCLAW_BASE_URL` pointing at the correct Nullalis instance?

## Most likely recurrence risk

The main recurrence risks are config drift:

- backend internal token changes
- Nullalis internal token does not change with it
- or one service is rolled with stale secret material
- `zaki-prod` and Nullalis point at different Postgres instances
- or they use unsynchronized identity copies where `public.zaki_users.id` differs

That is a deployment/config problem, not a frontend auth problem.

## Operational recommendation

Treat both of these as cluster-managed deployment invariants with one source of truth:

1. internal service token
2. canonical identity store / canonical user-id parity

Do not depend on local defaults, copied `.env` files, or "same emails but different ids" assumptions in any shared environment.
