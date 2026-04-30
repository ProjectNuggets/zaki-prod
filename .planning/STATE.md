---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: milestone
status: unknown
last_updated: "2026-04-30T19:30:30Z"
last_activity: 2026-04-30
progress:
  total_phases: 1
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# ZAKI Web — Project State

**Project:** zaki-prod (ZAKI web frontend)
**Stack:** Vite + React 18 + TypeScript + Tailwind + Zustand + TanStack Query
**Current milestone:** V1.5 Frontend
**Last activity:** 2026-04-30
**Last session stopped at:** Completed v1.5-frontend-04-PLAN.md

## Phase Status

| Phase | Name | Status |
|-------|------|--------|
| v1.5-frontend | V1.5 Frontend — Brain Page + Audit Fixes | In Progress (plan 04 done) |

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
