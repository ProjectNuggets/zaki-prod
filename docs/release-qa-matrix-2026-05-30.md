# ZAKI V1 Release QA / E2E Matrix

Date: 2026-05-30, integrated 2026-05-31, release-locked 2026-06-17
Owner: Agent 5 — Release QA / E2E Matrix, integrated by Agent 0
Integration branch: `codex/zaki-prod-finalization`

## Purpose

This is the **release confidence gate** for ZAKI V1. The final lock covers the
signed-in public spine, gated beta/waitlist routes, website-to-app handoff
metadata, and hidden operator access.

The harness mocks the entire backend at the page layer, so the gate runs against
the Vite dev server alone — **no live Nullalis gateway required**.

## Deliverables

| File | Role |
|---|---|
| `e2e/support/release-harness.ts` | Shared signed-in bootstrap + shell mocks + product-registry fixture + failure-state overrides + visibility source of truth |
| `e2e/release-smoke.spec.ts` | Confidence gate: `/`, `/agent`, `/spaces`, `/brain`, `/settings` mount signed-in without ErrorBoundary/login; backend-unavailable stays user-safe |
| `e2e/release-screens.spec.ts` | Desktop 1440×1000 + mobile 390×844 screenshot flow for the five public routes plus gates |
| `e2e/release-visibility.spec.ts` | Visibility gate: ProductRail public-vs-gated + dashboard command strip contextual states |
| `e2e/release-lock.spec.ts` | Final lock: marketing CTAs carry `source` + `intent`; operator routes stay hidden and guarded |
| `docs/release-qa-matrix-2026-05-30.md` | This document |

Product implementation changes are limited to enforcing the V1 public exposure
rule: Agent, Chat, and Brain are open; Learn and Hire are private beta; Design
is waitlist. The app-integrated website and standalone `website/` shell now use
the same product truth and explicit app handoff metadata.

## Test Matrix

### Layer 1 — Signed-in smoke (firm, runs every CI)

| Route | Assertion | Status |
|---|---|---|
| `/` | App shell mounts; no ErrorBoundary; not on login | Firm |
| `/agent` | App shell mounts; no ErrorBoundary; not on login | Firm |
| `/spaces` | App shell mounts; no ErrorBoundary; not on login | Firm |
| `/brain` | App shell mounts; no ErrorBoundary; not on login | Firm |
| `/settings` | App shell mounts; no ErrorBoundary; not on login | Firm |
| all five | No fatal React console errors (filtered allowlist) | Firm |

### Layer 2 — Failure states (user-safe, no crash)

| Scenario | Harness override | Assertion | Status |
|---|---|---|---|
| Backend unavailable | `gatewayDown` / `auth/refresh → 502` | No ErrorBoundary, falls back gracefully | Firm (smoke) |
| Extension disconnected | `extensionDisconnected` | Diagnostics report disconnected | Scaffolded |
| Empty Brain | `emptyBrain` | Empty graph/timeline/search render | Scaffolded |
| Quota low | `quotaLow` | Meter shows near-exhausted weekly allowance | Scaffolded |

Overrides 2–4 are wired into `mockReleaseShell(page, { … })` and ready for
Wave 2 strict assertions; the smoke spec currently exercises only the
backend-unavailable path firmly.

### Layer 3 — Product visibility

| Surface | Expected tier | Firm check (ProductRail) | Dashboard command strip |
|---|---|---|---|
| Agent | Public | Enabled button | Tab visible |
| Chat / Spaces | Public | Enabled button | Tab visible |
| Brain | Public (control plane) | Enabled button | Tab visible |
| Learn | Beta | Disabled button | "Private beta" |
| Hire | Beta (gated) | Disabled button | Coming-soon hint |
| Design | Waitlist | Disabled button | Coming-soon hint |

The ProductRail-layer assertions are firm and stable. The dashboard layer now
asserts the command strip and contextual hints instead of the removed product
grid.

### Layer 4 — Website and operator release lock

| Scenario | Assertion | Status |
|---|---|---|
| Product marketing CTAs | App-bound links include `source` and `intent` | Firm |
| Standalone `website/` package | Secondary shell only; old beta/student/paid Spaces claims removed | Firm |
| Normal navigation | No `/internal/operator` or `/internal/admin-access-codes` links | Firm |
| Non-superadmin direct operator visit | Redirects to `/`, no crash | Firm |

### Layer 5 — Screenshots

| Device | Viewport | Routes | Output |
|---|---|---|---|
| Desktop | 1440×1000 | `/`, `/agent`, `/spaces`, `/brain`, `/settings`, `/learn`, `/hire`, `/design` | `e2e/__screenshots__/release/desktop-<route>.png` |
| Mobile | 390×844 | `/`, `/agent`, `/spaces`, `/brain`, `/settings`, `/learn`, `/hire`, `/design` | `e2e/__screenshots__/release/mobile-<route>.png` |

Screenshots are **generated artifacts** (gitignored, reproducible via
`release-screens.spec.ts`) — not committed, to avoid binary churn.

## Commands

```bash
# From the integration worktree: /Users/nova/Desktop/zaki-prod
npm ci                              # first-time setup (worktree has no node_modules)

# Static gates (no browser/server)
npm run typecheck
npm run build
git diff --check

# Release E2E (Vite dev server auto-started by playwright.config.ts webServer)
npx playwright install chromium     # first-time browser install
npm run test:e2e -- release-smoke.spec.ts release-visibility.spec.ts release-lock.spec.ts
npm --prefix website run typecheck
npm --prefix website run build
npm run test:e2e -- release-screens.spec.ts          # captures screenshots once; non-desktop project skips by design
npx playwright test --list          # validate specs compile/discover

# Jest helper tests: none added this pass (verification placeholder N/A)
```

## Stable selectors used / available

The scaffolding leans on selectors that already exist in product code:

- App shell root: `.zaki-app-v2`
- ProductRail nav: `.zaki-product-rail`, per-button `title` attribute
- ErrorBoundary fallback text: `"Something went wrong"`
- Settings blocks: `data-testid="settings-account|billing|products-access|…"`
- Brain slots: `data-testid="brain-timeline-slot|graph-slot|search-input"`
- Agent topbar: `data-testid="agent-focus-toggle|inspector-toggle"`

## Remaining strict-flow gaps

1. **Agent workbench internals** (composer, inspector rail, artifacts/traces/
   cron). Per the activation map, action-by-action E2E is still outstanding;
   the smoke gate only proves the route mounts.
2. **Brain V2 deep interactions**. The harness now models the canonical
   `/api/agent/brain/*` route family with a small populated graph/timeline so
   the release screenshot is not a skeleton. Strict assertions for graph
   physics, node detail, compose-from-selection, diff animation, and
   community recompute remain deferred to Wave 2/local-gateway E2E.
3. **Settings deep flows** (channel connect/test, provider profiles, memory
   governance). Backend contracts are still being finalized; smoke proves the
   settings blocks mount.

## Worker Ready Report

See the bottom of this turn's response and the in-repo summary. The static gates
(typecheck, build, `git diff --check`) are the merge prerequisites; the
Playwright smoke/visibility/screenshot specs are the runtime confidence layer.
