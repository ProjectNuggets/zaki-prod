# ZAKI V1 Release QA / E2E Matrix

Date: 2026-05-30, integrated 2026-05-31
Owner: Agent 5 — Release QA / E2E Matrix, integrated by Agent 0
Integration branch: `codex/zaki-prod-finalization`

## Purpose

This is the **release confidence gate** scaffolding for ZAKI V1. Per the
multi-agent execution board, Agent 5 (Wave 1) delivers a signed-in Playwright
harness and smoke scaffolding **without brittle final assertions** while the
product surfaces (Agent, Brain, Settings, dashboard) are still stabilizing.

The harness mocks the entire backend at the page layer, so the gate runs against
the Vite dev server alone — **no live Nullalis gateway required**.

## Deliverables

| File | Role |
|---|---|
| `e2e/support/release-harness.ts` | Shared signed-in bootstrap + shell mocks + product-registry fixture + failure-state overrides + visibility source of truth |
| `e2e/release-smoke.spec.ts` | Confidence gate: `/`, `/agent`, `/brain`, `/settings` mount signed-in without ErrorBoundary/login; backend-unavailable stays user-safe |
| `e2e/release-screens.spec.ts` | Desktop 1440×1000 + mobile 390×844 screenshot flow for the four routes |
| `e2e/release-visibility.spec.ts` | Visibility gate: ProductRail public-vs-gated (firm) + dashboard tags (scaffold, skips until stable) |
| `docs/release-qa-matrix-2026-05-30.md` | This document |

Product implementation changes are limited to enforcing the V1 public exposure
rule: Agent, Chat, and Brain are open; Learn and Hire are private beta; Design
is waitlist. No `data-testid` attributes were added in this pass (existing
testids were sufficient for scaffolding; see "Stable selectors" below).

## Test Matrix

### Layer 1 — Signed-in smoke (firm, runs every CI)

| Route | Assertion | Status |
|---|---|---|
| `/` | App shell mounts; no ErrorBoundary; not on login | Firm |
| `/agent` | App shell mounts; no ErrorBoundary; not on login | Firm |
| `/brain` | App shell mounts; no ErrorBoundary; not on login | Firm |
| `/settings` | App shell mounts; no ErrorBoundary; not on login | Firm |
| all four | No fatal React console errors (filtered allowlist) | Firm |

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

| Surface | Expected tier | Firm check (ProductRail) | Strict tag (dashboard) |
|---|---|---|---|
| Agent | Public | Enabled button | "Live" (deferred) |
| Chat / Spaces | Public | Enabled button | "Live" (deferred) |
| Brain | Public (control plane) | Enabled button | "Control plane" (deferred) |
| Learn | Beta | Disabled button | "Private beta" |
| Hire | Beta (gated) | Disabled button | "Private beta" (deferred) |
| Design | Waitlist | Disabled button | "Waitlist" (deferred) |

The ProductRail-layer assertions are **firm and stable** (small shell
component). The dashboard explicit-tag assertions are **scaffolded** and skip
themselves until the dashboard product grid reliably renders — see "Surfaces
too unstable for strict assertions".

### Layer 4 — Screenshots

| Device | Viewport | Routes | Output |
|---|---|---|---|
| Desktop | 1440×1000 | `/`, `/agent`, `/brain`, `/settings` | `e2e/__screenshots__/release/desktop-<route>.png` |
| Mobile | 390×844 | `/`, `/agent`, `/brain`, `/settings` | `e2e/__screenshots__/release/mobile-<route>.png` |

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
npm run test:e2e -- release-smoke.spec.ts release-visibility.spec.ts
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

## Surfaces too unstable for strict assertions (deferred to Wave 2)

1. **Dashboard product grid** (`/` → ZakiDashboard). Reaching it depends on
   `view === "home" && sidebarMode === "zaki"` plus registry/meter query
   settling. The explicit visibility tags ("Private beta" / "Waitlist" /
   "Control plane") are deterministic *once the grid renders*, so the
   visibility spec asserts them only when present and otherwise skips.
2. **Agent workbench internals** (composer, inspector rail, artifacts/traces/
   cron). Per the activation map, action-by-action E2E is still outstanding;
   the smoke gate only proves the route mounts.
3. **Brain V2 deep interactions**. The harness now models the canonical
   `/api/agent/brain/*` route family with a small populated graph/timeline so
   the release screenshot is not a skeleton. Strict assertions for graph
   physics, node detail, compose-from-selection, diff animation, and
   community recompute remain deferred to Wave 2/local-gateway E2E.
4. **Settings deep flows** (channel connect/test, provider profiles, memory
   governance). Backend contracts are still being finalized; smoke proves the
   settings blocks mount.

## Worker Ready Report

See the bottom of this turn's response and the in-repo summary. The static gates
(typecheck, build, `git diff --check`) are the merge prerequisites; the
Playwright smoke/visibility/screenshot specs are the runtime confidence layer.
