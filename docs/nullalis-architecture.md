# Nullalis Architecture Ownership

## Summary

`NULL-ALIS` owns Nullalis application code, provider integrations, tests, and published container images.

`zaki-prod` owns the live Nullalis runtime in Kubernetes:
- deployment manifest
- runtime config values
- secret contract
- rollout workflow
- smoke checks
- rollback behavior

## Production boundary

- Browser traffic never talks to Nullalis directly.
- `zaki-api` is the only browser-facing relay for agent chat.
- `zaki-api` depends on:
  - `NULLCLAW_BASE_URL`
  - `NULLCLAW_INTERNAL_TOKEN`
- Together AI remains implemented only inside `NULL-ALIS`.
- `zaki-prod` chooses and validates the live Together AI runtime values used in production.

## Deployment flow

1. `NULL-ALIS` publishes an immutable image such as `ghcr.io/projectnuggets/null-alis:sha-<commit>`.
2. Operator promotes that image from `zaki-prod`.
3. `zaki-prod` applies runtime config and deployment state together.
4. `zaki-prod` rolls Nullalis.
5. `zaki-prod` runs direct and relay smoke checks.
6. `zaki-prod` marks the image as last-known-good or fails closed.
