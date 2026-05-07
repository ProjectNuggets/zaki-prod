# Phase 02 Context: BFF Security And Multi-User Hardening

## Objective

Make the ZAKI learning BFF secure by construction for hosted multi-user production.

## Source Truth

- `docs/zaki-learning-integration-spec.md`
- `backend/src/index.js`
- `backend/src/learning-client.js`
- `backend/src/learning-bff-contract.js`
- `backend/src/learning-quota.js`
- `backend/src/learning-upload-limits.js`
- `backend/src/learning-ws-policy.js`

## Known Review Findings To Keep Closed

- Generated HTML cannot run scripts by default.
- Every learning mutation must sanitize or allowlist request bodies.
- Chunked uploads must not bypass byte caps.
- Passive WebSockets must not consume prompt quota.
- Source selections must clearly distinguish whole-parent selection from child-level selection.
