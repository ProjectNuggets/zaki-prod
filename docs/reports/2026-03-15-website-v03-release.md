# Website v0.3 Release Checkpoint

Date: 2026-03-16
Branch: `website-v0.3-polish`
Scope: website-only release hardening for public deployment

## Summary

This sprint finished the final narrative and route-polish pass for the public website inside `zaki-prod`. The website remains on the routed React + SSR/prerender architecture already in place. No backend or app contracts were changed.

The website now presents a clearer public product model:

- `Spaces` as the live structured workspace layer for focused execution
- `ZAKI` as the public beta for persistent personal intelligence
- `ZAKI Chat` retained only as transitional clarification where needed
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
- `/zaki-vs-spaces/`
- `/best-arabic-ai-assistant/`
- `/how-to/how-zaki-and-spaces-work/`
- `/how-to/what-to-use-spaces-for/`
- `/how-to/what-to-use-zaki-for/`
- `/how-to/write-arabic-emails-ai/`
- `/how-to/translate-dialects-arabic-english/`
- `/how-to/create-social-media-content-arabic/`

## What changed

- Tightened homepage hero, product ladder, feature-grid, pricing, and beta framing.
- Tightened ZAKI page hero and waitlist language.
- Improved FAQ wording to be more direct and less promotional.
- Reframed the story page around `Why ZAKI`.
- Tightened comparison and how-to route intros so they align with the current product truth.
- Added product-education pages for:
  - `How ZAKI and Spaces work together`
  - `What to use Spaces for`
  - `What to use ZAKI for`
- Reframed comparison/read-more content around `Spaces + ZAKI` instead of `ZAKI Chat + ZAKI`.
- Fixed Arabic footer links that previously pointed to non-existent localized comparison routes.
- Reduced `Nullalis` prominence in public-facing metadata and launch copy.
- Reframed the community section so it is clearly representative, not a live community feed.
- Normalized primary CTA button styling so the light-site buttons now use one accent family consistently.
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

- `Validated 25 prerendered routes.`

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

## Manual QA

Browser QA completed across:

- Desktop:
  - `/`
  - `/zaki-bot/`
  - `/faq/`
  - `/story/`
  - `/zaki-vs-spaces/`
  - `/vs-chatgpt/`
  - `/best-arabic-ai-assistant/`
  - `/how-to/how-zaki-and-spaces-work/`
  - `/how-to/what-to-use-spaces-for/`
  - `/how-to/what-to-use-zaki-for/`
  - `/privacy/`
- Arabic / RTL:
  - `/ar/`
  - `/ar/zaki-bot/`
  - `/ar/faq/`
  - `/ar/story/`
  - `/ar/contact/`
  - `/ar/privacy/`
- Mobile sanity:
  - `/`
  - `/zaki-bot/`
  - `/zaki-vs-spaces/`
  - `/ar/`

QA findings:

- all reviewed routes returned `200`
- no horizontal overflow was detected on the reviewed desktop/mobile/Arabic surfaces
- homepage, ZAKI page, FAQ, story, comparison, and new how-to routes rendered with the expected titles and H1s
- CTA flow targets remained present on homepage, pricing, footer, and read-more surfaces
- no blocker found in the reviewed public pages

## Recommendation

Status: `GO`

Reason:

The website is now code-complete for the public release checkpoint, automated gates pass, and the manual browser QA pass did not find a blocker on the reviewed desktop, mobile, and Arabic RTL surfaces.

## Next actions

1. Clean generated `website/dist` output before final commit/merge so the diff stays source-only.
2. Merge this website checkpoint to `DEV`.
3. Move from website work to app polish and deployment readiness unless a new blocker appears.
