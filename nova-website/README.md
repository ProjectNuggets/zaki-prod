# Nova Nuggets website

This package is the standalone Nova Nuggets company website for `novanuggets.com`. It is separate from the ZAKI application and the ChatZaki marketing website.

## Local feedback loop

```bash
npm ci
npm run dev
```

The default local URL is `http://localhost:4174`. Use `npm run dev -- --port 4319` when the default port is occupied.

## Release gates

```bash
npm run typecheck
npm run build
git diff --check
```

The production build prerenders and validates every route. Browser QA is required at `1440x1000` and `390x844`, including keyboard navigation, reduced motion, console errors, and Axe WCAG checks.

## Container

Build with `nova-website/` as the Docker context:

```bash
docker build -t novanuggets-website:local .
docker run --rm -p 8080:80 novanuggets-website:local
curl --fail http://127.0.0.1:8080/healthz
```

The image serves the prerendered site with nginx. Hashed assets receive immutable caching; HTML is not cached. Security headers and `/healthz` are configured in `nginx/default.conf`.

## Production cutover

1. Publish an immutable image from the approved release commit.
2. Deploy to the infrastructure-owned staging hostname.
3. Run route, visual, accessibility, link, form, header, and performance checks.
4. Preserve the current Framer deployment and DNS values as the rollback target.
5. Point one canonical hostname to the new website and permanently redirect the other.
6. Verify apex and `www`, TLS, canonical tags, sitemap, robots, health, logs, and the qualification flow.

Do not cut DNS until the contact submission destination is approved and production smoke is green.
