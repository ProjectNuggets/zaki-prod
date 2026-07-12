# ZAKI hub

ZAKI’s commercial web hub: the customer-facing SPA, authenticated backend-for-frontend, and
standalone marketing site. This repository owns identity, billing, usage, product access, settings,
and the browser surfaces that connect users to the platform’s product engines.

The current public product set is ZAKI Agent, Chat/Spaces, and Brain. Learn is gated, Design is a
waitlist surface, and Hire remains repo-local and is not deployed. Product visibility is controlled
by the central registry, entitlements, meter state, routes, and matching UI copy—not by whether a
component happens to exist in this repository.

## Repository surfaces

| Path | Runtime | Responsibility |
| --- | --- | --- |
| repository root (`@zaki/web`) | React 18 + TypeScript + Vite | The `zaki-web` SPA: Dashboard, Agent, Chat/Spaces, Brain, Settings, auth, billing, and gated product routes |
| `backend/` (`zaki-backend`) | Node.js + Express | The `zaki-api` BFF: sole browser auth authority, wallet/metering, billing, product policy, and authenticated spoke proxies |
| `website/` (`@zaki/website`) | React + Vite SSR/prerender | The standalone `chatzaki.com` marketing shell |

ZAKI is a hub-and-spoke platform. The BFF is the only browser-facing door to the product engines:

```text
browser -> zaki-web -> zaki-api
                         |-> nullalis (Agent and the only Brain writer)
                         |-> zaki-chat-engine (Chat/Spaces)
                         |-> gated learning/design engines
                         `-> managed Postgres for hub identity, billing, and wallet state

nullalis -> Postgres zaki_bot schema -> pgvector memory_embeddings (1024 dimensions)
```

The Brain is nullalis’s `zaki_bot` Postgres schema and 1024-dimensional pgvector store. Nullalis is
its only writer; the hub reads it through authenticated `/api/agent/brain/*` proxy routes. This is
separate from the legacy Spaces-side memory layer documented in [MEMORY_SYSTEM.md](MEMORY_SYSTEM.md).

For the complete cross-repository topology and data flow, use the
[ZAKI platform map](https://github.com/ProjectNuggets/zaki-infra/blob/staging/docs/PLATFORM.md).

## Development

### Requirements

- Node.js 20 (see `.nvmrc`)
- npm
- PostgreSQL when running `zaki-api` locally
- the required upstream engines when changing BFF-to-spoke behavior

Install both JavaScript dependency sets:

```bash
nvm use
npm ci
npm --prefix backend ci
```

Run the SPA and BFF in separate terminals:

```bash
npm run dev
npm --prefix backend run dev
```

The SPA defaults to `http://localhost:5173`; the local BFF defaults to
`http://localhost:8787`. Start from `.env.local.example` and the backend’s checked-in environment
examples. Do not commit credentials.

Most frontend work does not require every engine on a laptop. The recommended contributor path is
to proxy the local SPA to staging through the BFF; follow
[docs/contributing-proxy-to-staging.md](docs/contributing-proxy-to-staging.md) so session cookies and
CORS remain correct.

## Verification

Run checks with Node 20:

```bash
npm test -- --runInBand
npm --prefix backend test -- --runInBand
npm run typecheck
npm run build
npm run test:e2e -- e2e/release-smoke.spec.ts
git diff --check
```

Focused tests should accompany the surface being changed. User-facing changes also require signed-in
desktop (`1440x1000`) and mobile (`390x844`) verification for the affected route.

## Deployment

This repository builds the `zaki-web`, `zaki-api`, and `zaki-website` images. It does not deploy
them directly and does not own live Kubernetes configuration.

Production deployment is GitOps-controlled by `zaki-infra`:

1. Application repositories publish immutable `sha-<commit>` images.
2. `zaki-infra` pins the exact image tag in the appropriate Helm values.
3. ArgoCD reconciles staging from the infra `staging` branch and production from `main`.

Use the platform map’s
[GitOps section](https://github.com/ProjectNuggets/zaki-infra/blob/staging/docs/PLATFORM.md#5-gitops--deploy-flow)
and the
[image promotion runbook](https://github.com/ProjectNuggets/zaki-infra/blob/staging/docs/image-promotion-runbook.md)
for rollout mechanics. Railway and `latest`-tag deployment instructions are historical and have
been archived under `docs/archive/`.

## Project guidance

- [AGENTS.md](AGENTS.md) — repository protocol and live coordination-board link
- [CONTRIBUTING.md](CONTRIBUTING.md) — contributor entry point
- [PRODUCT.md](PRODUCT.md) — historical product baseline, interpreted through the Agent-first spec
- [docs/zaki-agent-first-v1-product-spec.md](docs/zaki-agent-first-v1-product-spec.md) — current product direction
- [docs/zaki-prod-end-state-spec.md](docs/zaki-prod-end-state-spec.md) — platform end-state contract
- [docs/API.md](docs/API.md) — partial legacy API notes; code and BFF contracts remain authoritative

## License

Proprietary. Copyright Nova Nuggets. All rights reserved.
