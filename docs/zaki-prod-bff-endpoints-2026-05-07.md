# ZAKI BFF Endpoint Inventory — 2026-05-07

**Authored:** 2026-05-07 by the FE/UI agent (Phase 1 audit, sourced via Explore subagent)
**Source:** `backend/src/` — Express BFF that proxies to nullalis gateway (127.0.0.1:3000) and the learning service.
**Total endpoints:** 163

## Counts at a glance

| Group | Count | Notes |
|---|---:|---|
| Routed → nullalis gateway | 48 | All `/api/agent/*` and `/api/agent/brain/*` |
| Routed → learning service | 33 | All `/api/learning/*` plus 1 internal |
| Handled locally (BFF) | 82 | Auth, billing, memory, workspaces, admin, accounts |
| Webhooks | 3 | Stripe (1) + Creem (2 alias paths) |

## Architectural finding — P1

`backend/src/index.js` is **11,300+ lines**. Mirrors the `src/app/components/ChatArea.tsx` (6,460 lines) pattern on the backend side: one mega-file orchestrating most local endpoints inline. Maintenance debt. Phase 4 candidate for splitting into feature modules. Not blocking today but every new feature added to it compounds the debt.

## By feature area

### Health (5)
- `GET /health` (local)
- `GET /ready` (local)
- `GET /api/memory/health` (local)
- `GET /api/learning/health` (learning proxy)
- `GET /api/learning/books/:bookId/health` (learning proxy)

### Auth — public, no token (10)
- `POST /signup` + `/api/signup`
- `POST /login` + `/api/login`
- `POST /password-reset/request` + `/api/password-reset/request`
- `POST /password-reset/confirm` + `/api/password-reset/confirm`
- `GET /verify` + `/api/verify`

### Legal / consent (2)
- `GET /api/legal/consent-status` (optional auth)
- `POST /api/legal/re-consent` (auth)

### Profile + account (6, all auth)
- `GET /api/profile`, `PATCH /api/profile`
- `GET /api/usage/quota`
- `GET /api/account/export`
- `POST /api/account/delete`
- `GET /api/account/learning/audit`

### Workspaces (14, mostly auth)
- `GET /workspaces`, `/api/workspaces` (optional auth)
- `GET /workspace/:slug`, `/api/workspace/:slug` (optional auth)
- `POST /workspace/:slug/update`, `/api/workspace/:slug/update`
- `POST /api/zaki/workspaces`, `DELETE /api/zaki/workspaces/:slug`

### Billing (9, mostly auth)
- `GET /api/billing/config`
- `POST /api/billing/checkout`
- `POST /api/billing/sync`
- `POST /api/billing/portal`
- `POST /api/billing/cancel`
- `POST /api/admin/billing/reconcile`
- `GET /api/entitlements`
- `POST /api/billing/webhook` (Stripe, raw body, no auth — webhook signature verifies)
- `POST /api/billing/creem/webhook` + `/api/webhooks/creem` (Creem aliases, raw body, no auth)

### Memory system (22, all auth except `/health`)
Under `backend/src/memory/routes.js`:
- `POST /api/memory` (store)
- `GET /api/memory/list`, `/api/memory/activity`, `/api/memory/search`
- `PATCH /api/memory/:id`, `/api/memory/preferences`
- `DELETE /api/memory/:id`
- `POST /api/memory/capture`, `/api/memory/preview`
- `POST /api/memory/confirmations/:id/confirm`, `/api/memory/confirmations/:id/reject`
- `GET /api/memory/confirmations`, `/api/memory/conflicts`
- `POST /api/memory/conflicts/:id/resolve`
- `POST /api/memory/context`, `/api/memory/autosave`, `/api/memory/undo/:id`
- `POST /api/memory/end-session`

### Admin (8, auth)
- `GET /api/admin/rate-limits`, `PATCH /api/admin/rate-limits`
- `GET /api/admin/admins`, `POST /api/admin/admins`, `DELETE /api/admin/admins/:email`
- `GET /api/admin/student-verification`, `POST /api/admin/student-verification`
- `GET /api/admin/telemetry/memory`, `/api/admin/telemetry/billing`

### Access codes (6, auth)
- `POST /api/access-code/redeem`
- `GET /api/admin/access-codes`, `POST /api/admin/access-codes`, `PATCH /api/admin/access-codes/:id`
- `POST /api/access-code/purchase/checkout`, `/api/access-code/purchase/resend`

### Documents / upload (6)
- `GET /api/documents/accepted-file-types` (public — intentional)
- `POST /workspace/:slug/upload`, `/api/workspace/:slug/upload` (auth)
- `POST /workspace/:slug/upload-and-embed`, `/api/workspace/:slug/upload-and-embed` (auth)
- `POST /workspace/:slug/documents/remove`, `/api/workspace/:slug/documents/remove` (auth)

### Threads / chat (8, auth)
- `POST /workspace/:slug/thread/new` + `/api/...`
- `POST /workspace/:slug/thread/:threadSlug/update` + `/api/...`
- `POST /workspace/:slug/thread/:threadSlug/auto-title` + `/api/...`
- `DELETE /workspace/:slug/thread/:threadSlug` + `/api/...`
- `GET /workspace/:slug/thread/:threadSlug/chats` + `/api/...`
- `POST /workspace/:slug/thread/:threadSlug/stream-chat` + `/api/...` (SSE proxy to nullalis)

### Agent + brain — proxy to nullalis (48, auth)
- `/api/agent/me`, `/api/agent/chat/stream` (SSE), `/api/agent/provision`
- `/api/agent/onboarding`, `/api/agent/config`, `/api/agent/heartbeat`
- `/api/agent/secrets/*`, `/api/agent/attachments`
- `/api/agent/voice/transcribe`, `/api/agent/voice/synthesize`
- `/api/agent/channels/telegram/connect`
- `/api/agent/cron/*` (CRUD on scheduled tasks)
- `/api/agent/sessions/*`, `/api/agent/sessions/:sessionKey/*`
- `/api/agent/history`, `/api/agent/diagnostics`
- `/api/agent/brain/*` (graph, local-graph, orphans, diff, communities, timeline, search, memory/:key, compose)

### Learning — proxy to learning service (33, auth)
Out of scope for this audit. Listed for completeness:
- `/api/learning/sessions/*`
- `/api/learning/books/*`
- `/api/learning/knowledge/*`
- `/api/learning/tutor-agents/*`
- `/api/learning/notebooks/records/manual`
- `/api/internal/learning/*` (status, retention, DR, readiness)

### Sharing (5)
- `POST /api/share/create` (auth)
- `GET /api/share/list` (auth)
- `GET /api/share/:token` (public)
- `POST /api/share/:token/view` (public)
- `DELETE /api/share/:token` (auth)

### Telemetry + feedback (9 — auth gaps here, see findings)
- `GET /api/website-feedback` (**public**)
- `POST /api/website-feedback` (**public**)
- `POST /api/website-feedback/:id/vote` (**public**)
- `POST /api/website-beta-waitlist` (**public**)
- `GET /api/admin/website-beta-waitlist` (auth)
- `POST /api/telemetry/client-error` (**public**)
- `POST /api/telemetry/product-event` (**public**)

## Findings

### P0 — Public abuse vectors

**`/api/website-feedback` POST + vote are fully public, no auth, no rate limit visible at route level.** Any unauthenticated client can post arbitrary feedback rows + spam votes. Exposure: storage bloat, content moderation surface, vote-stuffing, potential injection into admin views. **Action:** verify rate limiting at middleware level (the agent didn't see it; doesn't mean it isn't there). If there isn't, add per-IP cap + content length validation + content moderation hook. File a backend-needs spec.

**`/api/telemetry/client-error` + `/api/telemetry/product-event` are public.** Standard for telemetry endpoints (they need to fire from logged-out states like login screen errors), but they accept whatever the client sends. Verify there's a server-side schema validator + size cap, otherwise a malicious client can fill telemetry storage. Same disposition as above: confirm rate limit, file backend-needs if absent.

**`/api/website-beta-waitlist`** — public POST, same concern. Lower priority because it's a single field (email).

### P1 — Surface confusion

**Duplicate routes** — every workspace/auth endpoint exists at both `/foo` and `/api/foo`. Intentional for deployment flexibility, but it doubles the surface area to test, doubles the surface area for bugs, and means the FE never knows which is canonical. Recommend Phase 4: pick one (`/api/*`), 301 the other, deprecate by GA.

**`backend/src/index.js` is 11,300+ lines.** Architectural debt mirrors `ChatArea.tsx`. Phase 4 split candidate.

### P2 — Health endpoint sprawl

Five health endpoints with different scopes. Fine for observability, but a single `/health` with sub-checks would be cleaner.

## Stream + webhook endpoints — operational notes

- **SSE streams:**
  - `POST /api/agent/chat/stream` (the bot)
  - `POST /workspace/:slug/thread/:threadSlug/stream-chat` (legacy stream, alias)
  - `POST /api/learning/knowledge/tasks/:taskId/stream` (out of scope)
- **Webhooks (raw body, signature-verified):**
  - `POST /api/billing/webhook` — Stripe
  - `POST /api/billing/creem/webhook`, `POST /api/webhooks/creem` — Creem (two alias paths to one handler)

## Notes for next-phase work

- The `/api/agent/*` proxy is the chat bot's entire transport. Any UI work that adds an agent capability (e.g., a new tool result type, a new SSE event) lands here.
- The brain page hits `/api/agent/brain/*` exclusively — those endpoints are stable per the V1.11 handoff.
- Settings UX redesign will lean heavily on `/api/profile`, `/api/agent/onboarding`, `/api/agent/config`, `/api/usage/quota`, `/api/entitlements`, `/api/billing/*` — most of those are wired and typed.
- Pricing + Stripe path uses `/api/billing/config` (returns plan SKUs + prices) → `/api/billing/checkout` → Stripe redirect → `/api/billing/webhook` → entitlement update. The webhook handler is in `billing-stripe-webhook-handler.js` and has integration tests. Looks production-ready already.
