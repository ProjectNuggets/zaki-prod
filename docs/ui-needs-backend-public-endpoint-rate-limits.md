# Backend-Needs Spec — Rate-limit public BFF endpoints

**Filed:** 2026-05-07 by FE/UI agent during Phase 1 audit
**Severity:** P0 for launch (not blocking local dev — site isn't deployed yet)
**Owner request:** backend agent (nullalis) — actually this is BFF (zaki-prod/backend/) which Nova owns directly; routing TBD.

## Problem

Five `/api/*` endpoints are intentionally unauthenticated for product reasons (feedback widget, beta waitlist, telemetry from logged-out states like LoginScreen errors). Each has schema validation and body size caps. None have per-IP or global rate limits at the route level (no `express-rate-limit` or equivalent visible in `backend/src/`).

Affected endpoints:

| Method | Path | Handler line in `backend/src/index.js` | Risk |
|---|---|---|---|
| GET | `/api/website-feedback` | 2830 | DB read flood |
| POST | `/api/website-feedback` | 2849 | Storage bloat, content moderation surface |
| POST | `/api/website-feedback/:id/vote` | 2876 | Vote-stuffing (clientId is client-supplied) |
| POST | `/api/website-beta-waitlist` | 2917 | Email pollution, downstream cleanup cost |
| POST | `/api/telemetry/client-error` | 3063 | Telemetry storage bloat |
| POST | `/api/telemetry/product-event` | 3087 | Telemetry storage bloat |

## What I want

Add per-IP rate limiting to each public endpoint before launch. Suggested defaults (open for tuning):

| Endpoint | Suggested limit |
|---|---|
| `/api/website-feedback` GET | 60 req / min / IP |
| `/api/website-feedback` POST | 5 posts / hour / IP, 1 post / 30s / IP burst |
| `/api/website-feedback/:id/vote` | 20 votes / min / IP, deduped server-side by (post_id, IP) instead of client-supplied clientId |
| `/api/website-beta-waitlist` | 3 / hour / IP |
| `/api/telemetry/*` | 30 events / min / IP, 200 events / hour / IP |

Standard `express-rate-limit` with Redis store (or in-process if Redis isn't available) is the cheapest path. Per-IP, with `X-Forwarded-For` trust set correctly behind whatever ingress sits in front.

Vote-stuffing fix specifically: the dedupe key should be `(post_id, derivedKey)` where `derivedKey` is derived server-side (hashed IP + UA, or a signed cookie set on first GET). Stop trusting client-supplied `clientId` for uniqueness.

## What I don't need

- Auth on these endpoints — they need to work logged-out by design.
- A captcha — overkill at our current traffic, defer until we see actual abuse.
- A WAF — nice but out of scope for this fix.

## How the FE will react

If a rate limit fires (HTTP 429), the FE today shows a generic error. After this fix lands, I'll add a friendly "you're posting too quickly, try again in N seconds" surface using the `Retry-After` header. No FE work needed before backend ships — current behavior degrades gracefully.

## Confirmation needed

If you (Nova / backend agent) believe there's already a middleware-level limit I missed in `backend/src/index.js` or a sibling file, point me at it and I'll close the finding. Otherwise: ship the limits before public launch.
