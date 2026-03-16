# Website v0.3 Release Checkpoint

Date: 2026-03-15
Branch: `website-v0.3-polish`
Scope: website-only release hardening for public deployment

## Summary

This sprint finished the final narrative and route-polish pass for the public website inside `zaki-prod`. The website remains on the routed React + SSR/prerender architecture already in place. No backend or app contracts were changed.

The website now presents a cleaner product ladder:

- `ZAKI Chat` as the live structured workspace for daily productivity
- `ZAKI` as the public beta for persistent personal intelligence
- `Nullalis` kept subordinate as an internal runtime note rather than a hero brand

## Routes reviewed

- `/`
- `/ar/`
- `/zaki-bot/`
- `/ar/zaki-bot/`
- `/faq/`
- `/ar/faq/`
- `/story/`
- `/ar/story/`
- `/contact/`
- `/ar/contact/`
- `/privacy/`
- `/ar/privacy/`
- `/terms/`
- `/ar/terms/`
- `/compliance/`
- `/ar/compliance/`
- `/vs-chatgpt/`
- `/best-arabic-ai-assistant/`
- `/how-to/write-arabic-emails-ai/`
- `/how-to/translate-dialects-arabic-english/`
- `/how-to/create-social-media-content-arabic/`

## What changed

- Tightened homepage hero, product ladder, feature-grid, pricing, and beta framing.
- Tightened ZAKI page hero and waitlist language.
- Improved FAQ wording to be more direct and less promotional.
- Reframed the story page around `Why ZAKI`.
- Tightened comparison and how-to route intros so they align with the current product truth.
- Fixed Arabic footer links that previously pointed to non-existent localized comparison routes.
- Reduced `Nullalis` prominence in public-facing metadata and launch copy.
- Reframed the community section so it is clearly representative, not a live community feed.
- Updated sitemap release date for the website checkpoint.

## What stayed unchanged

- Route architecture
- SSR/prerender pipeline
- waitlist API contract
- route registry and SEO generation model
- app/backend behavior
- public route inventory

## Automated validation

Passed:

- `npm --prefix website run build`
- `npx tsc --noEmit -p website/tsconfig.json`
- `npm --prefix backend run lint`
- `npm --prefix backend test`
- `npm run typecheck`

Prerender validation result:

- `Validated 21 prerendered routes.`

Spot checks from prerendered output confirmed expected titles and canonicals for:

- homepage
- Arabic homepage
- ZAKI page
- Arabic ZAKI page
- FAQ
- story
- comparison
- how-to

## Known non-blockers

- Vite still reports a large JS chunk warning during the website build. This is not a release blocker for correctness, but it remains a performance optimization target.
- The community request section is representative content, not a live-backed feed. It is now labeled honestly, but it is still static content.

## Remaining release risk

- Manual browser QA is still outstanding for:
  - desktop
  - mobile
  - RTL Arabic
  - CTA flow sanity
  - overflow / spacing regressions

## Recommendation

Status: `HOLD`

Reason:

The website is code-complete enough for a release candidate and all automated gates pass, but public deployment should wait for a manual browser QA pass across desktop, mobile, and Arabic RTL surfaces.

## Next actions

1. Run manual browser QA on `/`, `/zaki-bot/`, `/faq/`, `/story/`, one comparison page, one how-to page, and one legal page.
2. Verify Arabic route parity visually on `/ar/`, `/ar/zaki-bot/`, `/ar/faq/`, `/ar/story/`, and `/ar/privacy/`.
3. If that pass is clean, merge this website checkpoint to `DEV` and mark website v0.3 as `GO`.
