---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: milestone
status: Milestone complete
last_updated: "2026-05-02T19:27:41.519Z"
last_activity: 2026-05-02
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# ZAKI Web — Project State

**Project:** zaki-prod (ZAKI web backend + frontend)
**Stack:** Node.js + Express + PostgreSQL (backend), Vite + React 18 + TypeScript + Tailwind + Zustand + TanStack Query (frontend)
**Current milestone:** ZAKI-owned Oath (central auth takeover — 5-phase migration)
**Last activity:** 2026-05-02
**Last session stopped at:** Phase 1 all 4 plans executed, awaiting gsd-verifier

## Phase Status

| Phase | Name | Status |
|-------|------|--------|
| 01-zaki-mints-sessions | ZAKI mints sessions (backend only, zero user impact) | Plans complete — pending verification |
| 02-replace-requireauthuser | Replace requireAuthUser (dual-auth window) | Not started |
| 03-frontend-token-memory | Frontend moves to memory store | Not started |
| 04-typ-adapter | TYP becomes an adapter | Not started |
| 05-legacy-sunset | Legacy sunset (Day 60 gate) | Not started |

## Key Decisions (locked)

- API calls use `apiRequest()` from src/lib/api.ts — never `fetch + authHeaders()` (authHeaders doesn't exist)
- AgentSessionMode = "plan" | "execute" | "review" (NOT "fast" | "balanced" | "deep")
- SidebarModeSwitch.tsx = ZAKI/Spaces nav toggle (NOT agent mode selector)
- New types/functions extend src/lib/api.ts — never create src/lib/api/ directory
- Brain graph renderer: SVG + custom spring physics (no new deps unless d3-force approved)
- Brain entry navigates to /brain route (not a ChatArea view state)
- Compose flow: in-place panel slides up from bottom of graph (not modal/sheet)
- userId: `String(useAuthStore().user?.id ?? "")`
- Timeline hook: useInfiniteQuery (NOT useQuery)
- All user-facing strings through useTranslation() + i18n files

## Architecture Notes

- Routes: src/routes.tsx — Brain route is a direct child (not through ChatArea)
- Components: src/app/components/{brain,chat,sidebar,agent,...}
- Stores: src/stores/ (Zustand)
- Queries: src/queries/ (TanStack Query)
- Skeletons: src/app/components/ui/skeleton.tsx (existing file, extend it)
- ErrorBoundary already wraps Outlet in App.tsx
- Brain icon already imported in Sidebar.tsx
