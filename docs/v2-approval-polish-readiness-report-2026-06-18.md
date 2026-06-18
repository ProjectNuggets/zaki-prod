# V2 Approval + Polish Readiness Report — 2026-06-18

Scope: frontend polish only. No engine/BFF contract changes were made.

Verification screenshots were captured with local read-only Playwright stubs at:

- Desktop `1440x1000`: `tmp/polish-screenshots/*-1440x1000.png`
- Mobile `390x844`: `tmp/polish-screenshots/*-390x844.png`
- Approval card: `tmp/polish-screenshots/approval-card-1440x1000.png`, `tmp/polish-screenshots/approval-card-390x844.png`

| Page / surface | Polished? | Issues fixed in this pass | Owner decisions / notes |
| --- | --- | --- | --- |
| Dashboard `/` | Yes | Verified V2 command center on desktop/mobile with no horizontal overflow. Existing dense mono treatment, product visibility labels, memory bridge, active-work state, and mobile header are coherent. | None from polish pass. |
| Chat / Spaces `/spaces` | Yes | Verified mobile and desktop layout with no horizontal overflow. Existing template, explainer, toolbar, loading, and empty-space states remain presentable in V2 dark treatment. | Mobile screenshot run reused scroll state on first capture; retest showed this was a capture artifact, not layout overflow. |
| Agent `/agent` | Yes | Approval card now shows human-readable intent, risk level, key params, target/id metadata, sensitive value redaction, and clean Approve once / Allow for this session / Modify / Deny actions when the engine marks session approval safe. Medium risk is visually supervised, not alarmist. Mobile card actions fit without overflow. | The UI sends `allow_for_session: true` only from the session-scoped action. Nullalis v1 currently treats generic allow-always semantics as run-once unless the backend consumes that flag, so durable session allow behavior remains a backend/product decision. |
| Brain `/brain` | Yes | Verified home graph/timeline surface on desktop/mobile with no overflow. Empty and unavailable states already use V2-compatible styling. | Console warning in the mocked visual run came from stub timeline entries missing required `id`; the API type requires `id`, so no app change was made. |
| Settings `/settings` | Yes | Verified route-level settings control plane on desktop/mobile with sticky mobile section nav, dense rows, and V2 controls. | On very narrow mobile, active nav labels truncate; usable as-is, but owner can decide if settings nav should prefer icon-only labels on mobile. |
| Pricing `/pricing` | Yes | Reworked pricing page chrome to V2: grid background, mono headings/labels, low-radius hairline cards, no legacy rounded-card shadows/gradients, mobile full-width actions, better access-code panel and provider modal styling. | None from polish pass. |
| Learn `/learn` | Yes | Verified private-beta gate is presentable on desktop/mobile and truthful about gated access. | Product launch remains private beta. |
| Hire `/hire` | Yes | Verified private-beta gate is presentable on desktop/mobile and not exposed as public GA. | Product launch remains private beta. |
| Design `/design` | Yes | Verified waitlist gate is presentable on desktop/mobile and not exposed as public GA. | Product launch remains waitlist. |
| Arabic public route `/ar` + approval copy | Yes | Arabic route verified at desktop/mobile. Approval-card strings were added in EN and AR. | Pricing has no separate `/ar/pricing` route in current route table; Arabic pricing review requires locale switch/storage rather than a dedicated URL. |
| Empty/loading/error states | Yes | Approval pending, Agent no-run, Spaces loading/empty, Brain empty/unavailable, Settings empty rows, route loading, and app error boundary are V2-compatible and mobile-usable in inspected paths. | None from polish pass. |

## Verification Summary

- Automated visual scan covered `/`, `/spaces`, `/agent`, `/brain`, `/settings`, `/pricing`, `/learn`, `/hire`, `/design`, and `/ar` at `1440x1000` and `390x844`.
- Horizontal overflow delta was `0` on all scanned routes.
- Targeted approval-card capture verified intent/risk/params/redaction/actions at desktop and mobile sizes.
