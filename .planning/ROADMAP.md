# ZAKI Web — Roadmap

## Active Milestone: V1.5 Frontend

**Goal:** Surface the V1.5 backend capabilities to users. Close all frontend audit findings. Ship Brain page (memory graph + timeline + compose), fix all broken/invisible features, and wire the agent posture HUD.

**Ship target:** 2026-05-05

---

## Phase v1.5-frontend: V1.5 Frontend — Brain Page + Audit Fixes

**Goal:** Implement the Brain page (memory graph, timeline, compose flow), fix all 7 critical + 14 high audit findings, complete WS2–WS5 wiring gaps, and ship a clean agent posture HUD. All V1.5 backend endpoints become user-visible.

**Workstreams:**
1. Brain page + dashboard + sidebar entry (WS1) — new /brain route, graph view, timeline, compose
2. Compaction gauge + notice fixes (WS2) — C3, C4, C5, M3 from audit
3. Agent runtime polish (WS3) — C2, H7, H8, sandbox badge, y/n shortcuts, i18n
4. Session list wiring (WS4) — H1, H2, H3, H4, H5, mode/live/channel/approvals
5. Unlock value (WS5) — valid_to deprecated visual, compose badges
6. Quick fixes — C6, H9, H14, L1
7. Debt cleanup — C1, H6, H10, H11, H13, M9, M10

**Requirements:** REQ-V15-001 through REQ-V15-025 (all listed in REQUIREMENTS.md)

**Plans:** 13/13 plans complete

Plans:
- [x] v1.5-frontend-01-PLAN.md — Quick fixes + debt cleanup (C1, C6, H5, H6, H10, H11, H14, L1)
- [x] v1.5-frontend-02-PLAN.md — Brain API types + fetch wrappers + 3 query hooks
- [x] v1.5-frontend-03-PLAN.md — WS2 fixes (C3 SSE, C4 ContextGauge, C5 SystemNoticesStack, M3 conic gradient)
- [x] v1.5-frontend-04-PLAN.md — WS3 fixes (C2 SandboxBadge, H7 y/n shortcuts, H8 ApprovalRequiredCard i18n)
- [x] v1.5-frontend-05-PLAN.md — WS4 fixes (H1+H2+H3 ZakiSessionList, H4 SessionManagementSheet metadata)
- [x] v1.5-frontend-06-PLAN.md — Brain skeleton + empty + degraded banner + BrainPage shell + /brain route
- [x] v1.5-frontend-07-PLAN.md — BrainTimelineView (infinite scroll, cursor, deprecated visual)
- [x] v1.5-frontend-08-PLAN.md — BrainGraphView (SVG spring physics, multi-select, mobile fallback)
- [x] v1.5-frontend-09-PLAN.md — BrainComposeModal slide-up panel + POST /brain/compose
- [x] v1.5-frontend-10-PLAN.md — Sidebar Brain entry + Dashboard Brain card
- [x] v1.5-frontend-11-PLAN.md — i18n debt (H9 requiresTelegram, L6 voice, L10 task)
- [x] v1.5-frontend-12-PLAN.md — Final debt (H13 dead helpers, M9 Telegram, M10 ThumbsDown, M4 mode pills, M8 SSE warn, L4 gauge fallback)
- [x] v1.5-frontend-13-PLAN.md — Verification gate (typecheck + tests + requirements coverage report)

**Wave structure:**
- Wave 1 (parallel): plans 01, 02, 03, 04, 05
- Wave 2: plan 06
- Wave 3 (parallel): plans 07, 08
- Wave 4 (sequential as needed): plans 09, 10, 11→12
- Wave 5: plan 13

**Status:** Complete

---

## Active Milestone: ZAKI-owned Oath

**Goal:** Remove NOVA.TYP from the auth critical path. ZAKI issues its own HS256 JWTs. TYP becomes a downstream adapter. Every downstream service speaks X-Internal-Token + X-Zaki-User-Id. Zero user-visible disruption throughout.

**Migration window:** 60 days (TYP token TTL 30 days × 2 safety margin)

---

## Phase 01-zaki-mints-sessions: ZAKI mints sessions

**Goal:** Backend issues ZAKI-owned JWTs and HttpOnly refresh cookies on login. Zero user-visible change. TYP token stored server-side only.

**Requirements:** OATH-01, OATH-02, OATH-03, OATH-04, OATH-05, OATH-06, OATH-07, OATH-08, OATH-09, OATH-10, OATH-11, OATH-12

**Plans:** 4/4 plans complete

Plans:
- [x] 01-01-PLAN.md — Wave 0: RED test stubs (zaki-auth, auth-endpoints, login-zaki integration)
- [x] 01-02-PLAN.md — Wave 1: zaki-auth.js (6 exports) + db.js zaki_sessions table + config-validation.js ZAKI_JWT_SIGNING_KEY
- [x] 01-03-PLAN.md — Wave 2: auth-endpoints.js (/refresh + /logout) + index.js wiring + CORS X-Zaki-Session-Upgrade
- [x] 01-04-PLAN.md — Wave 3: login-handler.js extracted + ZAKI session mint + best-effort TYP 5s timeout

**Status:** Complete — VERIFICATION.md PASS 6/6

---

## Phase 02-replace-requireauthuser: Replace requireAuthUser (dual-auth window)

**Goal:** Replace requireAuthUser with ZAKI-first logic: verify locally if iss==="zaki", fall back to TYP call with 5s timeout otherwise. Mint ZAKI session on legacy path. Add concurrent refresh guard, audit logging, revokeAllSessionsForUser on password change.

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08

**Plans:** 3/3 plans complete

Plans:
- [x] 02-01-PLAN.md — Wave 1: RED test stubs for AUTH-01..08 (require-auth-user.test.js + auth-endpoints/zaki-auth/login-handler test extensions)
- [x] 02-02-PLAN.md — Wave 2: requireAuthUser + requireBotBffContext dual-auth replacement (extracted module + index.js wiring) [AUTH-01..05]
- [x] 02-03-PLAN.md — Wave 3: Concurrent refresh guard + audit logs + password-change revokeAllSessions [AUTH-06, AUTH-07, AUTH-08]

**Wave structure:**
- Wave 1: 02-01 (RED tests, no production code)
- Wave 2: 02-02 (require-auth-user.js + index.js auth wiring) [AUTH-01..05]
- Wave 3: 02-03 (auth-endpoints.js + zaki-auth.js + login-handler.js + index.js password-reset wiring) [AUTH-06..08] — sequential after 02-02 because both modify index.js

**Status:** Plans complete — pending execution

---

## Phase 03-frontend-token-memory: Frontend moves to memory

**Goal:** api.ts reads access token from Zustand store (not localStorage). On app boot, POST /api/auth/refresh to hydrate token. Watch X-Zaki-Session-Upgrade on every response and silently swap token in-memory.

**Requirements:** FE-01, FE-02, FE-03, FE-04

**Plans:** 0/? plans

**Status:** Not started

---

## Phase 04-typ-adapter: TYP becomes an adapter

**Goal:** Remove TYP /request-token call from loginHandler. Workspace routes resolve typ_session_token from DB (server-side novaAdminRequest with nova_user_id). Drop typ_session_token column. Browser never touches TYP tokens.

**Requirements:** TYP-01, TYP-02, TYP-03, TYP-04

**Plans:** 0/? plans

**Status:** Not started

---

## Phase 05-legacy-sunset: Legacy sunset (Day 60 gate)

**Goal:** After 45-day checkpoint confirms zero legacy path usage, add ZAKI_LEGACY_TYP_AUTH_CUTOFF env var. After cutoff date, legacy path returns 401 session_expired. Remove legacy code path.

**Requirements:** SUN-01, SUN-02, SUN-03

**Plans:** 0/? plans

**Status:** Not started
