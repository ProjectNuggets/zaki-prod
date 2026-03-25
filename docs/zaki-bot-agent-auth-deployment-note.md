# ZAKI BOT Agent Auth Deployment Note

This note documents the auth behavior behind **ZAKI BOT** space startup and the failure mode that appeared during local development.

## Summary

Two different issues overlapped:

1. Frontend auth bootstrap race
2. Local internal-token mismatch between `zaki-prod` backend and Nullalis

Both must be understood separately.

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

Production stability depends on two layers now being correct:

### 1. Frontend startup behavior is now correct

The frontend no longer fires protected agent bootstrap calls before auth hydration finishes.

That should remain stable across environments because it is app logic, not deployment-specific behavior.

### 2. Helm/Kubernetes should own internal-token alignment

Production should not rely on local `.env` placeholders such as `dev-internal-token`.

Helm/Kubernetes should inject the same real internal service token into:

- `zaki-prod` backend
- Nullalis

That makes backend-to-Nullalis auth deterministic and avoids local-style config drift.

## Required deployment contract

Deployment must preserve this separation:

### Browser -> zaki-prod backend

- Auth mechanism: bearer/session auth for the signed-in user

### zaki-prod backend -> Nullalis

- Auth mechanism: internal service token
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

## Pre-deploy checks

Before rollout:

1. Confirm frontend build includes the auth-ready gating change
2. Confirm `NULLCLAW_BASE_URL` points at the intended Nullalis service
3. Confirm `NULLCLAW_INTERNAL_TOKEN` is sourced from the shared cluster secret
4. Confirm Nullalis is configured to accept that same token

## Post-deploy smoke checks

Run these after deployment:

1. Sign in and open `ZAKI BOT` space
2. Confirm initial route load does **not** return `401` on `/api/agent/provision`
3. Confirm ZAKI BOT can provision and start chat normally
4. Confirm logged-out users are still blocked from protected routes
5. Confirm invalid/expired browser tokens still fail safely

## If `401 /api/agent/provision` appears again

Check in this order:

1. Frontend startup timing
   - Did a protected agent request fire before auth hydration completed?
2. Browser auth
   - Did `/system/refresh-user` succeed for the signed-in token?
3. Internal service auth
   - Are `zaki-prod` and Nullalis using the same internal token?
4. Service routing
   - Is `NULLCLAW_BASE_URL` pointing at the correct Nullalis instance?

## Most likely recurrence risk

The main recurrence risk is config drift:

- backend internal token changes
- Nullalis internal token does not change with it
- or one service is rolled with stale secret material

That is a deployment/config problem, not a frontend auth problem.

## Operational recommendation

Treat the internal service token as a cluster-managed secret with one source of truth. Do not depend on local defaults or manually copied values for any shared environment.
