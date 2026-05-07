# ZAKI Frontend Audit — Phase 1 (in progress)

**Authored:** 2026-05-07 by the FE/UI agent
**Mission:** every route, every wire, every API. Findings tiered P0 / P1 / P2 across functional, UX, visual, a11y, i18n, perf.
**Scope:** ZAKI bot (chat surface) + brain page. Reference-only: learning page composer. Out of scope: marketing site, learning content surfaces.

This document is updated incrementally as findings land. Companion docs:

- `docs/zaki-prod-bff-endpoints-2026-05-07.md` — BFF endpoint inventory (running)
- `docs/zaki-prod-api-client-2026-05-07.md` — frontend API client inventory (running)
- `docs/zaki-prod-design-direction-2026-05-07.md` — Phase 2 output (not yet started)

## Tiering legend

- **P0** — fix on sight. Data loss, security, broken paying-user path, runtime crash, a11y violation, i18n breaking ar.
- **P1** — propose then ship. Booth/launch-blocker UX, retention-blocker, structural visual debt.
- **P2** — defer. Polish, nice-to-haves.

---

## Route inventory

Source: `src/routes.tsx`. Frontend uses `react-router-dom` `createBrowserRouter`. All non-public routes nest under the `App` shell (`<Outlet />`).

| Path | Component | Purpose | Notes |
|---|---|---|---|
| `/` (index) | `ChatArea` | Home view — pre-conversation state | ChatArea decides what to render via internal state |
| `/spaces` | `ChatArea` | Spaces list view | ChatArea internal state |
| `/spaces/:spaceId` | `ChatArea` | Space detail | ChatArea internal state |
| `/spaces/:spaceId/threads/:threadId` | `ChatArea` | Active chat / thread | ChatArea internal state |
| `/about` | `ChatArea` | About / info view | ChatArea internal state |
| `/reset` | `ChatArea` | Password reset (token in query) | Renders LoginScreen reset form |
| `/pricing` | `PricingPage` | Plans + checkout entry | EXISTS — handoff doc said "no /pricing page", was wrong |
| `/pricing/success` | `BillingSuccessPage` | Stripe success return | Wired |
| `/help` | `HelpPage` | Help / support | Standalone |
| `/legal` | `LegalPage` | Terms + privacy | Public-accessible (no auth gate) |
| `/internal/admin-access-codes` | `AdminAccessCodesPage` | Admin: access-code provisioning | Should be auth-gated to admins only — verify |
| `/brain` | `BrainPage` | Visible memory graph | V1.11 hero artifact |
| `/learn` | `LearningPage` | Learning surface | Out of scope (WIP) |
| `/share/:token` | `SharedConversation` | Public shared conversation | Outside App layout (no sidebar) |
| `/public/legal` | redirect → `/legal` | Backward-compat alias | |
| `*` | redirect → `/` | Catch-all | |

**Architectural observation P1.** `ChatArea.tsx` is 6,460 lines and serves 6 different routes via internal state branching (home / spaces list / space detail / thread / about / reset). This is a maintenance, performance, and testability red flag. Recommend Phase 4 split into `HomeView` / `SpacesListView` / `SpaceDetailView` / `ThreadView` route components with shared hooks. NOT urgent — works today — but every new feature added to ChatArea compounds the debt.

**Architectural observation P1.** `Sidebar.tsx` is 2,357 lines. Same pattern at smaller scale.

---

## Findings — by surface

(Filled in as the audit progresses. See subsections below.)

### LoginScreen (entry point)

File: `src/app/components/LoginScreen.tsx` (945 lines)

User journey: unauthenticated landing → tabs (Sign in / Create / Reset) → form submit → JWT in store → redirect to `/`.

**P0**

- **i18n bypass via `AUTH_COPY` constant.** ~180 lines of `{ en: {...}, ar: {...} }` strings hard-coded in the component. `useTranslation()` is imported but only used to detect locale (`i18n.language`). Every visible string lives in this constant, not in i18next resources. This silently violates the project i18n discipline and blocks adding any new locale without editing TSX. **Fix:** migrate the entire `AUTH_COPY` block to `i18n/en/auth.json` + `i18n/ar/auth.json`, replace inline reads with `t("auth.title.signup", { defaultValue: ... })`.
- **Hex-literal sprawl.** 30+ inline hex / rgba values: `#0c0a09`, `#141210`, `#efe6d9`, `#c9b8a4`, `#1a1714`, `#a79079`, `#8e7b66`, `rgba(240,236,230,0.1)`, `rgba(241,2,2,0.25)`, etc. The brain-canvas dark-lock exception does NOT extend to LoginScreen. Per DESIGN.md: hex literals are a code smell. **Fix:** replace all with `--zaki-*` tokens / Tailwind utilities. Bonus: `rgba(241,2,2,0.25)` is `--zaki-brand-25` territory and should be a token.

**P1**

- **No OAuth.** Roadmap says "Sign-in via Google OAuth, single tap" at T+5s. Today: email + password only. Adding Google/Apple OAuth removes a 30-second friction step at the top of the funnel. Highest-leverage acquisition fix.
- **Tabs incomplete a11y.** `role="tablist"` is set but the form below has no `role="tabpanel"` and no `aria-controls` linking. Screen readers can't announce panel changes correctly.
- **No password strength indicator** on signup. 2026 baseline expectation. Cheap to add.
- **No rate-limit feedback.** Repeated failed logins return generic error; backend may rate-limit but UI shows no countdown / cooldown.
- **Logo component named `LogoArabicOrange`.** Brand is red (`#f10202`), not orange. Stale name from pre-finalization era. Rename or replace.
- **Footer copy `"Secure sign-in . Trusted infrastructure . Legal compliance"`** uses literal periods as separators between phrases. Reads like placeholder. Use middot `·` or actual bullets, or rephrase.
- **Direct `window.history.replaceState` inside React effects** to clean up URL params after consuming them. Should use react-router's `useSearchParams` setter. Working but fragile.

**P2**

- "Have an activation code?" toggle — sensible, but placement just-below-password is easy to miss. Consider moving to a separate "I have a code" link near the submit button.
- DOB native date picker — UX varies wildly by platform. For 18+ verification only, an "I am 18 or older" checkbox is simpler. Defer until you decide compliance posture.
- Submit button label is a 5-deep ternary. Cosmetic readability only.

**Functional**

- Login → redirect logic at L553-561 special-cases `/pricing` to redirect to `/` only if no explicit pricing intent. Reasonable, but the same pattern isn't applied to other deep-linked auth-required surfaces (e.g. someone bookmarks `/brain` while logged out, signs in, lands on `/` instead of `/brain`). Should be a generic "post-login redirect" parameter.

**Visual**

- Card uses `rounded-zaki-2xl` ✓ and `shadow-zaki-xl` ✓ — token discipline IS partially honored where the existing utilities exist. The hex sprawl is for dark-mode overrides where token coverage was thin.

### Home view — `/` (post-login)

_(audit pending)_

### Sidebar — desktop nav

_(audit pending)_

### Chat thread — `/spaces/:spaceId/threads/:threadId`

_(audit pending)_

### Brain page — `/brain`

_(audit pending — handoff doc says don't refactor for taste; will audit accessibility + URL deep-linking + mobile)_

### Pricing page — `/pricing`

_(audit pending — exists despite handoff doc claim; need to verify wiring)_

### Help page — `/help`

_(audit pending)_

### Legal page — `/legal`

_(audit pending)_

### Settings (modal/sheet, not a route)

_(audit pending — `ZakiSettingsSheet.tsx` triggered by `zaki:open-settings` event)_

### Onboarding (modal, not a route)

_(audit pending — `OnboardingModal` + `SimpleOnboardingModal`)_

### Mobile shell — `MobileHeader` + `MobileSidebar`

_(audit pending)_

---

## Cross-cutting findings

### Backend surface (from `docs/zaki-prod-bff-endpoints-2026-05-07.md`)

- **163 BFF endpoints total** — 48 → nullalis, 33 → learning, 82 local, 3 webhooks.
- **P0 — public abuse vectors.** `/api/website-feedback` POST + vote, `/api/website-beta-waitlist` POST, `/api/telemetry/*` POST are fully public. If middleware-level rate limiting isn't in place (the audit subagent didn't see it), this is exploitable. **Action this turn:** I'll grep middleware for rate-limit registration before tiering this final.
- **P1 — duplicate route surface.** Every workspace/auth endpoint exists at both `/foo` and `/api/foo`. Intentional but doubles the test surface. Pick `/api/*` as canonical, deprecate the rest by GA.
- **P1 — `backend/src/index.js` is 11,300+ lines.** Mirrors the `ChatArea.tsx` mega-file pattern on the backend. Phase 4 split candidate.

### Frontend API client (from `docs/zaki-prod-api-client-2026-05-07.md`)

- **94 exported API functions** across 15 feature areas. 0 unused. 0 endpoint duplicates.
- **14 type-debt items** — concentrated in agent secrets / cron / memory patch / account export. Return shapes typed as `Record<string, unknown>` or `unknown`. Phase 4 cleanup.
- **Pattern inconsistency:** brain functions throw on error; memory/chat functions return `{ response, data }`. Two error idioms in one client. Phase 4 unify.

### Theme + tokens

_(running tally — first finding: LoginScreen has 30+ hex literals because token coverage for dark-mode overrides is thin. Phase 4 fix: extend `--zaki-*` token coverage so utilities exist for every color the app needs.)_

### i18n + RTL

_(running tally — first finding: LoginScreen bypasses i18next entirely via a 180-line `AUTH_COPY` constant. Audit the rest of the surface for the same pattern.)_

### Accessibility

_(running tally — first finding: LoginScreen tabs use `role="tablist"` but no matching `tabpanel` / `aria-controls`.)_

### Performance

_(running tally — first finding: `ChatArea.tsx` 6,460 lines and `index.js` 11,300 lines are split-candidates; impact on initial bundle TBD. Need to run `vite build` and check chunk sizes.)_

### Visual consistency

_(running tally — first finding: hex sprawl in LoginScreen. Will track every component's hex usage as I go.)_

---

## Synthesis

_(written at end of Phase 1 — pillar coverage map, top 10 P0/P1 findings, recommended fix order)_
