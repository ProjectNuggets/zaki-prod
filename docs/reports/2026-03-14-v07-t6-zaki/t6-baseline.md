# T6 ZAKI Prod Baseline

Date: 2026-03-14  
Target repo: `zaki-prod`  
Working branch: `feat/t6-bff-dev`

## Nullalis Contract Source of Truth
1. nullalis branch: `v0.7-t6-contract-freeze`
2. nullalis SHA: `72a732a`
3. contract freeze doc: `../nullalis/docs/reports/2026-03-14-v07-t6/t6-nullalis-contract-freeze.md`
4. product API contract: `../nullalis/docs/reports/2026-03-14-v07-t6/t6-product-api-contract.md`
5. API audit: `../nullalis/docs/reports/2026-03-14-v07-t6/t6-api-audit.md`
6. execution handoff: `../nullalis/docs/reports/2026-03-14-v07-t6/t6-zaki-prod-execution-handoff.md`

## Locked Architecture Rule Applied
1. nullalis remains private runtime only.
2. ZAKI BFF is the canonical client-facing API.
3. frontend clients must not call nullalis directly.
4. `/v1/me/bot/*` is implemented as a frontend-agnostic product API surface.

## Baseline Validation
Commands run:
```bash
npm --prefix backend run lint
npm --prefix backend test -- --runInBand backend/src/bot-bff.test.js backend/src/agent-bff-contract.test.js backend/src/agent-proxy-contract.test.js backend/src/agent-and-chat-quota.integration.test.js
```

Result:
1. lint passed
2. focused backend contract/integration tests passed

## Staging Gate Status
Not runnable from this session because nullalis staging env vars were not configured.
