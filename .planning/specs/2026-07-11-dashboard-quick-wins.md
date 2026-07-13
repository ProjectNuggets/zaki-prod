# Spec: Dashboard & Chrome Quick Wins (UX feedback batch 1)

Date: 2026-07-11
Source: "ZAKI todos and feedback" doc (deadline 23.07.2026), items triaged with CEO on 2026-07-11.
Status: Agreed — decisions below are locked; copy proposals are review-vetoable in the PR.

## Problem

The V2 dashboard, pricing page, settings page, and cross-section chrome shipped
with polish gaps that make the product feel busier and less finished than it is:
copy that confuses, a banner that scrolls away, colliding meter text, a nav trap
on /pricing, a dead keyboard-shortcut hint, and inconsistent top-right chrome.

## Scope

Eight independent fixes. Frontend-only; no BFF contract changes. Every
user-facing string change updates **both** `src/i18n/locales/en.json` and
`src/i18n/locales/ar.json` (no hardcoded strings, no `isRtl ?` ternaries).

### 1. Sticky status strip
- File: `src/app/components/chat/views/ZakiDashboard.tsx` (~line 1454, `V2StatusStrip`).
- Behavior: the strip (`ONLINE / PLAN / WEEKLY RESET / IDENTITY`) stays pinned at
  the top of the dashboard scroll container at every viewport height
  (`position: sticky; top: 0` + opaque background + z-index above content).
- Done when: scrolling the dashboard never moves the strip out of frame; no
  visual overlap artifacts in light/dark, LTR/RTL.

### 2. Usage meter text overlap
- Files: `ZakiDashboard.tsx` meter row (~lines 549–591); keys
  `zakiDashboard.meter.runsHeadline` + `remainingOfLimit` (en.json:159–160, also
  duplicated ~2175 — fix both usage sites if both render).
- Behavior: `≈ N agent runs · or N chats` and `N of N left` never collide at any
  width — flex layout with gap; wrap or truncate under narrow widths.
- Done when: no overlap at 1440px, 1024px, and 390px, EN and AR, with 1–4 digit values.

### 3. Hero block trim (signed-in and guest variants)
- Files: `ZakiDashboard.tsx` (~1181–1200); keys `zakiDashboard.command.*`.
- Eyebrow `signedEyebrow`: "Signed in · context and progress stay connected" →
  **"Signed in"** (AR: "تم تسجيل الدخول"). Guest eyebrow: keep, but drop any
  redundant tail the same way if present.
- Subtitle `signedCopy`: "Choose the lane. Name the outcome. ZAKI brings the
  right intelligence and carries it forward." → **"Name the outcome. ZAKI
  handles the rest."** (AR: "سمِّ النتيجة، وزكي يتولى الباقي."). Apply the same
  tightening to the guest subtitle if one renders.
- Title `Let's <rotating word>.` stays untouched.
- Done when: dashboard hero shows short eyebrow + title + one-line subtitle; AR
  reads naturally (native-quality, not literal).

### 4. Meter-lock panel copy + i18n
- Files: `ZakiDashboard.tsx` ~1704 (hardcoded EN strings — must move to i18n);
  keys `creditsExhaustedCopy` / `capacityWindowCopy` (en.json ~2026–2028).
- New copy (proposal, PR-vetoable):
  - capacity window with time: "Your draft stays saved here. More room opens at {{reset}}."
  - capacity window, no time known: "Your draft stays saved here. More room opens soon."
    (Never render a bare "–" — this is the reported bug.)
  - credits exhausted: "Your draft stays saved here. Sign up, wait for the weekly
    reset, or pick a plan with more room."
- Done when: no hardcoded EN in the lock panel; the dash case is impossible;
  AR keys exist and render.

### 5. Pricing page: back affordance + cutoff
- File: `src/app/components/PricingPage.tsx`.
- Add a back control (top-left, arrow + label, i18n'd) → `navigate(-1)` with
  fallback to `/` when there is no history entry. Keyboard: Escape triggers the
  same. RTL: arrow mirrors.
- Fix the bottom clipping so "No active code." (`summaryInactive`, en.json:1361)
  is fully visible — container padding/height fix.
- Done when: user can leave /pricing without browser-back; full Access-code
  section visible at 1440×1000 and 390×844.

### 6. Settings stray "+" / spacing bug
- File: `src/app/components/settings/SettingsPage.tsx` (~2100 region, above the
  Products list near the weekly-allowance header).
- Remove the orphan "+" and collapse the excess whitespace; section header
  spacing consistent with adjacent sections.
- Done when: no stray glyph; vertical rhythm matches neighboring sections.

### 7. New-thread shortcut ⌘⇧O
- File: `src/app/components/agent/AgentSessionRail.tsx` (~290) + the agent
  surface that owns `onCreateSession`.
- Chrome reserves ⌘N — rebind: register a real `keydown` handler for
  Cmd/Ctrl+Shift+O (guard: not in inputs/textareas/contenteditable, not
  repeated) that triggers new thread; update the badge to `⌘⇧O`; add matching
  aria/tooltip if present.
- Done when: pressing ⌘⇧O in the agent view creates a new thread; badge matches
  reality; no interference with browser shortcuts.

### 8. Chat top-right chrome parity
- File: `src/app/components/AppTopbar.tsx` — `if (isSpacesRoute) return null;`
  (line ~87) hides the entire topbar on chat/spaces.
- Render the topbar on spaces routes so LIGHT (theme) + profile (TA) are present
  and fixed like on dashboard/agent. If the full breadcrumb clashes with the
  spaces layout, render at minimum the right-side cluster; must not overlap the
  spaces sidebar or composer on desktop or mobile.
- Done when: /spaces shows the same top-right chrome as / and /agent, fixed
  while scrolling, both themes, LTR/RTL, desktop + mobile.

## Security / tenancy

None of these touch auth, quota enforcement, or BFF contracts. Meter *display*
strings only — no changes to meter math or gating logic.

## Definition of done (batch)

- All eight items meet their per-item done criteria.
- `npm run typecheck`, `npm run build`, focused tests for touched files
  (`AppTopbar.test.tsx` and any meter/dashboard tests), `git diff --check` clean.
- en.json and ar.json stay key-synchronized; no new hardcoded user-facing strings.
- Signed-in screenshots (1440×1000 + 390×844) of: dashboard (top and scrolled),
  pricing page bottom, agent rail, chat with topbar — attached to the PR.
- Atomic commit per item (8 commits), branch off current main, PR opened —
  no merge.
