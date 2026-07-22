# ZAKI Website

The public ZAKI website and the source for the `zaki-website` container image.

## ZAKI Website V5

**V5 promotion candidate - 2026-07-13. Staging qualification required before production.**

The visual and interaction direction is frozen. V5 keeps the cinematic welcome,
four-product story, guided landing experience, and cream/black/red/coral system
while release work is limited to product truth, legal, accessibility, metadata,
runtime configuration, and deployment verification.

The active V5 source is [`launch-draft/`](launch-draft/). The previous Vite/React
website is preserved, unchanged, under
[`archive/react-vite-legacy/`](archive/react-vite-legacy/).

## V5 Experience Lock

- The cinematic welcome screen and four-agent selector.
- The "Let ZAKI drive" guided landing-page experience.
- The homepage story, current-work section, digital-worker cards, and footer.
- The Nova Nuggets particle mark on the welcome screen and in the footer.
- Product pages for Agent, Spaces, Minutes, and Design.
- Pricing, Privacy, Terms, and the ZEE Run game.
- The current cream, black, red, and coral visual system.

This lock protects the approved experience. It does not authorize production
promotion without the staging and owner gates below.

## Product Truth In This Draft

| Surface | Draft status | Primary handoff |
|---|---|---|
| Agent | Available now | `https://app.chatzaki.com/agent` |
| Spaces | Available now | `https://app.chatzaki.com/spaces` |
| Minutes | Coming next | App waitlist intent |
| Design | Coming next | App waitlist intent |
| Brain | Memory layer behind ZAKI | No separate marketing product page |

Reconfirm this table against app entitlements and product readiness before any
production promotion. Website copy must not lead the application state.

## Routes

- `/`
- `/products/agent/`
- `/products/spaces/`
- `/products/minutes/`
- `/products/design/`
- `/pricing/`
- `/play/`
- `/privacy/`
- `/terms/`
- `/compliance/`

## Run Locally

Requires Node.js 20 or newer.

```bash
cd website
npm ci
npm run dev
```

Open `http://127.0.0.1:4173/`.

## Verify And Build

```bash
cd website
npm run typecheck
npm test
npm run build
```

`npm run build` copies the V5 static source to `website/dist` and runs the
same smoke checks against the built output. No runtime JavaScript dependency is
installed by the active package; the browser libraries required by the draft
are committed under `launch-draft/site/js/`.

The container can be checked with:

```bash
docker build -t zaki-website:launch-draft website
docker run --rm -p 8080:80 zaki-website:launch-draft
curl -fsS http://127.0.0.1:8080/healthz
```

## Repository Layout

```text
website/
  launch-draft/                 ZAKI Website V5 source
  archive/
    react-vite-legacy/          Previous website source, preserved intact
    launch-draft-unused-assets/ Unused draft assets, preserved for reference
  scripts/                      Active build and local-preview utilities
  Dockerfile                    Static launch-draft image
  nginx.conf                    Container routing, headers, and cache policy
```

Archived code is excluded from active builds and deployment images.

## Promotion Gates

The source-side blockers are closed in V5. These operational gates remain and
require explicit evidence or owner sign-off:

1. **Infra staging:** publish an immutable image, promote it to staging by SHA,
   and verify routes, caching, health, rollback, and mobile behavior.
2. **Legal approval:** the V5 pages carry policy `2026-07-12.v4`; owner/lawyer
   approval remains the authority for the policy, not the website implementation.
3. **Internationalization:** V5 is English-only. Arabic and any
   further locales remain a separate reviewed delivery.
4. **Live launch quality:** run accessibility, performance, SEO, consent,
   browser, CTA, and broken-link passes against the pinned staging image.
5. **Provenance:** third-party browser-library and font notices are recorded in
   [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md); the release owner must
   retain source proof for project visual assets and reference-derived work.

## Infrastructure Ownership

Merging a website change publishes an immutable
`ghcr.io/projectnuggets/zaki-website` image. Production and staging promotion
remain owned by `zaki-infra`, whose Helm values pin explicit SHA tags. Do not
change an infrastructure image tag until the launch gates above are reconciled.

## Freeze Rule

Treat `launch-draft/` as the V5 release line. Changes after promotion should name the reason,
owner, acceptance check, and launch gate it closes. Keep visual changes small,
reversible, and screenshot-verified at desktop and mobile sizes.
