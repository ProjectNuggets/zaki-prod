# Nova Nuggets website

The production website for `novanuggets.com`. This package is independent from the ChatZAKI marketing site in `website/`.

## Local development

```bash
npm ci
npm run dev -- --port 4319
```

The qualification form uses `http://localhost:8787` locally. Run the ZAKI BFF separately when testing real submissions. Browser-only visual work does not require the BFF.

## Verification

```bash
npm run typecheck
npm run build
npm audit --audit-level=high
docker build -t nova-nuggets-website:local .
```

The production build prerenders every route and validates canonical metadata and the sitemap.

## Runtime configuration

The container writes `/env.js` at startup from:

- `NOVA_WEBSITE_API_BASE_URL` — ZAKI BFF origin used for qualification submissions.
- `NOVA_WEBSITE_ENVIRONMENT` — environment label (`production` or `staging`).

Defaults are production-safe and point to `https://api.chatzaki.com`.

## Deployment contract

- Image: `ghcr.io/projectnuggets/nova-nuggets-website:sha-<zaki-prod-commit>`
- Health: `GET /healthz`
- Staging: `https://novanuggets-staging.alis24.com`
- Production canonical host: `https://novanuggets.com`
- `www.novanuggets.com` redirects to the apex host.
- Legacy `/blog` redirects to `/field-notes/`.
- Rollback is an immutable image-tag change in `zaki-infra`.

Keep the Framer DNS records available until staging smoke, form delivery, owner visual sign-off, and rollback verification are all green.
