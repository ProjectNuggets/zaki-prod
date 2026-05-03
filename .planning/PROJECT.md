# ZAKI — Project

**Project:** zaki-prod
**Stack:** Node.js + Express (backend) · Vite + React 18 + TypeScript + Tailwind + Zustand + TanStack Query (frontend) · PostgreSQL (DigitalOcean managed) · DOKS fra1 (Kubernetes) · Cloudflare → nginx ingress
**Repo:** /Users/nova/Desktop/zaki-prod

---

## What This Is

ZAKI is an AI assistant platform. Users interact with AI agents through a web frontend. The backend is a Node.js/Express BFF that orchestrates identity, billing, memory, and downstream AI services (Nullalis agent backend, NOVA.TYP workspace/knowledge service, DeepTutor).

**Core value:** A user logs in, talks to the AI, the AI remembers context and executes tasks.

---

## Current Milestone: v2.0 — ZAKI-owned Oath

**Goal:** Remove NOVA.TYP from the auth critical path. ZAKI becomes the identity provider, issues its own JWTs, and standardizes the internal service contract across all downstream services.

**Target features:**
- ZAKI session layer (zaki-auth.js + zaki_sessions table, jose JWT)
- ZAKI JWT issuance on login (iss:"zaki", 15-min access + 30-day HttpOnly refresh cookie)
- Dual-auth requireAuthUser: ZAKI-first local validation, 60-day legacy TYP fallback
- Frontend token moves from localStorage to in-memory Zustand
- TYP fully behind server-side adapter (browser never sees TYP token)
- Legacy TYP auth sunset at Day 60 gate

**Key constraints:**
- Zero user-visible disruption throughout all 5 phases
- requireAuthUser return shape `{ email, zakiUser, sessionUser }` unchanged
- 60-day migration window (TYP token TTL = 30 days, 2x safety margin)
- jose (npm) is the only new dependency
- SameSite=Strict cookie viable (app.chatzaki.com + api.chatzaki.com share eTLD+1)
- No ALTER TABLE on existing tables in Phase 1 (CREATE TABLE only — doadmin confirmed)
- Nullalis: zero changes (already on X-Internal-Token + X-Zaki-User-Id contract)
- TYP pod: zero changes

---

## Active Requirements

See REQUIREMENTS.md — SUN category (Phase 5 legacy sunset).

## Validated Requirements (v2.0 Phases 1-4)

- **OATH-01..12** — ZAKI session mint: zaki-auth.js, zaki_sessions table, jose JWT, /api/auth/refresh, /api/auth/logout (Phase 1)
- **AUTH-01..08** — Dual-auth requireAuthUser: ZAKI-first local verify, TYP fallback, concurrent refresh guard, audit logs, revokeAllSessions on password change (Phase 2)
- **FE-01..04** — Frontend token in Zustand memory: authStore (no localStorage), api.ts reads store, boot hydration via POST /api/auth/refresh, X-Zaki-Session-Upgrade interceptor (Phase 3)
- **TYP-01..04** — TYP adapter: typ-client.js (admin key only), login stripped of TYP call, workspace routes wired to nova_user_id, typ_session_token column dropped (Phase 4)

---

## Validated Requirements (v1.5 Frontend)

All REQ-V15-001 through REQ-V15-025 shipped and verified:
- Brain page (graph, timeline, compose, empty state, degraded banner)
- Sidebar Brain entry + Dashboard Brain card
- Compaction SSE, ContextGauge, SystemNoticesStack
- SandboxBadge, y/n shortcuts, ApprovalRequiredCard i18n
- ZakiSessionList + SessionManagementSheet wiring
- Dead code removal (chatStore, dead components, unused API helpers)
- ThumbsDown feedback, all i18n strings, full typecheck + test pass

---

## Out of Scope (deferred)

- OAuth providers (Google, GitHub SSO) — after v2.0 Oath is stable
- MFA / TOTP — after v2.0 session layer is in place
- External IdP (ZITADEL, Keycloak) — not the right fit; ZAKI owns this layer
- DeepTutor multi-user integration — enters on the v2.0 service contract after Phase 4
- Code splitting / bundle optimization — tracked in post-release.md
- Voice input end-to-end, global search, conversation branching — post-release.md

---

## Key Decisions (locked)

**Auth architecture:**
- ZAKI issues HS256 JWTs; discriminator is `iss === "zaki"` (TYP tokens have no iss claim)
- Refresh token stored as SHA-256 hash in zaki_sessions; delivered as HttpOnly Strict cookie
- Token stored in Zustand memory (not localStorage) after Phase 3
- Internal service contract: X-Internal-Token + X-Zaki-User-Id + X-Request-Id (Nullalis already on this)
- jose (npm) for JWT signing/verification — no external IdP

**Frontend:**
- API calls use `apiRequest()` from src/lib/api.ts
- AgentSessionMode = "plan" | "execute" | "review"
- New types/functions extend src/lib/api.ts — never create src/lib/api/ directory
- All user-facing strings through useTranslation() + i18n files

**Infrastructure:**
- Secrets in k8s Secrets (zaki namespace) — rotation requires rolling restart
- ZAKI_JWT_SIGNING_KEY: 256-bit hex, kid header for zero-downtime rotation
- Cookie domain: Domain=.chatzaki.com (same eTLD+1, SameSite=Strict works)
- Cloudflare → nginx → DOKS; Express must have trust proxy set

---

## Architecture

```
[Browser]
  Zustand memory (access JWT, 15 min)
  HttpOnly cookie (refresh token, 30 day, Path=/api/auth/refresh)
       ↓ Authorization: Bearer <ZAKI JWT>
[zaki-prod backend — api.chatzaki.com]
  requireAuthUser():
    iss==="zaki" → jose.jwtVerify() local, <1ms, no network
    else         → legacy TYP /system/refresh-user (migration window only)
       ↓ { email, zakiUser, sessionUser }
  requireAgentContext() → resolveCanonicalAgentUserId()
       ↓ X-Internal-Token + X-Zaki-User-Id + X-Request-Id
[Nullalis — nullclaw-router.zaki.svc.cluster.local]
[TYP — typ:3001 (cluster-internal adapter only)]
```

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Architecture with current state

---

*Last updated: 2026-05-03 — Phase 4 (typ-adapter) complete. TYP is now fully behind server-side adapter. Browser never touches TYP tokens.*
