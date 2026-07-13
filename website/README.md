# ZAKI Website

The public ZAKI website and the source for the `zaki-website` container image.

## Status

**Frozen launch draft - 2026-07-13. Not approved for production promotion.**

The current visual and interaction direction is accepted as the launch draft. It
is intentionally frozen while product, legal, domain, and infrastructure owners
align on the remaining launch gates. Changes after this point should be focused
follow-up work, not another broad redesign.

The active source is [`launch-draft/`](launch-draft/). The previous Vite/React
website is preserved, unchanged, under
[`archive/react-vite-legacy/`](archive/react-vite-legacy/).

## What Is Frozen

- The cinematic welcome screen and four-agent selector.
- The "Let ZAKI drive" guided landing-page experience.
- The homepage story, current-work section, digital-worker cards, and footer.
- The Nova Nuggets particle mark on the welcome screen and in the footer.
- Product pages for Agent, Spaces, Minutes, and Design.
- Pricing, Privacy, Terms, and the ZEE Run game.
- The current cream, black, red, and coral visual system.

This freeze protects the approved experience. It does not mean every launch
dependency is complete.

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

`npm run build` copies the frozen static source to `website/dist` and runs the
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
  launch-draft/                 Approved static launch draft
  archive/
    react-vite-legacy/          Previous website source, preserved intact
    launch-draft-unused-assets/ Unused draft assets, preserved for reference
  scripts/                      Active build and local-preview utilities
  Dockerfile                    Static launch-draft image
  nginx.conf                    Container routing, headers, and cache policy
```

Archived code is excluded from active builds and deployment images.

## Launch Gates

The following items remain open and require explicit owner sign-off:

1. **Domain contract:** the draft currently declares `novanuggets.com` as its
   canonical URL, while `zaki-infra` deploys `zaki-website` to `chatzaki.com`.
2. **Infra staging:** publish an immutable image, promote it to staging by SHA,
   and verify routes, caching, health, rollback, and mobile behavior.
3. **CTA and onboarding:** confirm every app handoff and waitlist intent against
   the real signed-in and signed-out application flows.
4. **Product availability:** decide whether Minutes and Design remain waitlist
   products or become available before launch, then align app and website copy.
5. **Pricing:** the draft shows `$0`, `$15`, `$45`, and `$95`, but pricing CTAs
   currently request access by email rather than entering checkout.
6. **Legal:** Privacy and Terms need owner/legal review against actual product
   data handling, retention, subprocessors, and consent behavior.
7. **Internationalization:** this frozen draft is English-only. Arabic and any
   further locales remain a separate reviewed delivery.
8. **Launch quality:** complete accessibility, performance, SEO metadata,
   analytics/consent, browser compatibility, and broken-link release passes.
9. **Provenance:** confirm licenses and required notices for bundled fonts,
   browser libraries, visual assets, and reference-derived implementation work.

## Infrastructure Ownership

Merging a website change publishes an immutable
`ghcr.io/projectnuggets/zaki-website` image. Production and staging promotion
remain owned by `zaki-infra`, whose Helm values pin explicit SHA tags. Do not
change an infrastructure image tag until the launch gates above are reconciled.

## Freeze Rule

Treat `launch-draft/` as read-only unless a follow-up issue names the reason,
owner, acceptance check, and launch gate it closes. Keep visual changes small,
reversible, and screenshot-verified at desktop and mobile sizes.
