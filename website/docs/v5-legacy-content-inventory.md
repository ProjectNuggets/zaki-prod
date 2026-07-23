# V5 legacy content inventory

Reviewed: 2026-07-23
Sources: `archive/react-vite-legacy`, `scripts/legacy-url-inventory.json`, and the active V5 route set.

## Keep or reuse

| Legacy material | V5 decision | Reason |
| --- | --- | --- |
| V4 favicon mark | Reused in V5 site icon, Apple icon, and manifest | It is the established recognisable mark. |
| Legal, privacy, compliance, FAQ, and contact intent | Retain current V5 routes; keep legacy FAQ/contact redirects | These remain current trust and support destinations. |
| Core Agent and Spaces product intent | Rewrite as the V5 product pages | The current pages are source-backed and describe visible controls rather than the old broad promises. |
| Sitemap/legacy URL coverage | Keep the enforced 301 map | Existing indexed URLs should resolve to a relevant V5 route instead of disappearing. |

## Retire rather than revive

| Legacy material | V5 decision | Reason |
| --- | --- | --- |
| `/story` | Redirect to home | Its old architecture and availability claims are not an approved current business narrative. |
| `/use-cases`, comparison pages, and topical SEO shells | Redirect to the closest product or home | They carried stale positioning and should not be republished without an approved, source-backed brief. |
| Old Arabic mirror and Arabic how-to pages | Redirect to English home/current V5 route | V5 is English-only; a token Arabic stub would be worse than a reviewed full RTL release. |
| Learn, Hire, Career references | Do not surface on any public V5 route | They are parked product engines, not the current public product set. |

## Rewrite only with a new brief

- A dedicated company story or use-cases page, with approved present-tense claims and proof points.
- Arabic content only when it ships as a fully reviewed RTL experience, not an English layout with translated labels.
- Detailed product capability, pricing, security, or performance claims only after the product/business owner supplies evidence and approved wording.
- Higgsfield Zee portraits when supplied. The V4 sunglasses bot remains the compact Agent-selector fallback and limited Agent-page signature; it does not replace the live tour avatar.

## Current V5 publishing guardrails

- The public product family is Agent, Chat/Spaces, Minutes, and Design. Brain is the Agent memory view, not a fifth spoke.
- Staging sends `X-Robots-Tag: noindex, nofollow, noarchive`; production retains normal crawlability.
- `llms.txt`, schema, canonical URLs, static product H1s, metadata, and the sitemap describe the V5 source of truth.
- The public Terms & Conditions page remains policy version `2026-07-12.v4`; policy-owner/legal approval is still required for substantive legal changes.
