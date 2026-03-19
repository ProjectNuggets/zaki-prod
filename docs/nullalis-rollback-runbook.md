# Nullalis Rollback Runbook

## Automatic failure behavior

If rollout or smoke fails, the deploy workflow:

1. rolls Nullalis back to the previously running image
2. waits for the rollback rollout to settle
3. sets `ZAKI_AGENT_BACKEND_ENABLED=false` on `zaki-api`

This keeps normal chat alive while failing closed on the agent path.

## Manual rollback

Use the last-known-good image stored in ConfigMap `nullclaw-deploy-state`.

1. Read the image:

```bash
kubectl -n zaki-bot-staging get configmap nullclaw-deploy-state -o jsonpath='{.data.last_known_good_image}'
```

2. Re-run the `Deploy Nullalis` workflow with that image ref.

## Post-rollback checks

- `kubectl get pods -n zaki-bot-staging -l app.kubernetes.io/name=nullclaw`
- `kubectl rollout status deploy/nullclaw -n zaki-bot-staging`
- verify `zaki-api` has `ZAKI_AGENT_BACKEND_ENABLED=false` if the rollback was failure-driven
