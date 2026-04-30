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

**Status:** In Progress (Wave 1b: plans 04+05 running)
