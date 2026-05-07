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

File: `src/app/components/chat/views/ZakiHomeView.tsx` (577 lines). Renders for `view === "home"` inside ChatArea (`/` and `/spaces` paths land here when no space is selected).

Composed of: hero (welcome + headline + memory CTA + menu), QuickStartGrid (3-card prompts), MissionCard (4-slide rotating mission), CapabilitiesCard (capabilities + limitations bullet lists), MemoryPopover (modal-ish overlay for memory clarity).

**Strengths up front.** This file uses `t()` consistently with `returnObjects: true` for arrays — this is the right i18n pattern, not the `AUTH_COPY` / `sidebarCopy` anti-pattern. Other components should match this.

**P0**

- **Mission slides auto-rotate every 30s with no pause mechanism** (line 454-457). WCAG 2.2.2: auto-advancing content lasting more than 5s must offer pause/stop/hide. Today: only manual selection dots. Doesn't respect `prefers-reduced-motion`. Cheap fix: wrap `setInterval` in a `useEffect` that bails when the user prefers reduced motion, and pause on hover or while a dot has focus.
- **MemoryPopover lacks dialog semantics** (line 196). Visually a modal: dim trigger, fixed-positioned, escape-closes, click-outside-closes. Functionally not announced as a dialog: no `role="dialog"`, no `aria-modal="true"`, no `aria-labelledby`, no focus trap, no return-focus-to-trigger. Screen-reader users get a confusing experience.
- **`stageClasses` array uses 8 hex literals per visual theme × 4 stage tones = 16+ off-brand color tokens** (lines 188-193). Five color families (blue, yellow-cream, terracotta, green, plus borders) — none from the ZAKI palette (red + teal + warm desert). Visually inconsistent and brand-disrespectful. **Fix:** map each stage to an existing semantic token (`--zaki-info`, `--zaki-warning`, `--zaki-error`, `--zaki-success`).
- **Stale brand color `#ffb38f`** in dark-mode override on the memory CTA (line 484) and stage label icon (line 226). Peach/salmon — not in the palette. Brand red is `#f10202`. Same lineage as the "Orange" logo. **Fix:** map to `--zaki-brand` or a brand-tinted dark token.

**P1**

- **MemoryPopover positioning is 60+ lines of manual viewport math** (line 350-412). Hand-rolled flip + clamp logic. Should use `@floating-ui/react` or Radix's positioning primitives. Maintenance + edge-case bugs (e.g., not handling viewport zoom, RTL flipping).
- **`bg-white/80` and `bg-white/85` literals without dark-mode overrides** (lines 477, 511) and partial overrides (`bg-white/85 dark:bg-[#15100f]` line 484, line 215). Visual breakage in dark mode.
- **Quick start cards use `dark:!bg-[#0c0a09]`** with `!important` (lines 48, 80). `!` flag indicates a fight with another rule — investigate why and remove the override.
- **Dead props.** `primarySpace`, `onGoToThread`, `onDeleteThread` are typed in props but `void`-ed at lines 303-305 (i.e., never used). Dead code from a previous design. Remove from prop signature.
- **MissionCard auto-rotate even when reduced.** No pause-on-hover, no pause-on-focus. Even after the WCAG fix, this is visually distracting on a screen the user may be reading. Replace 30s interval with: rotate-on-click only, or rotate-on-blur only.
- **`fixed z-[120]`** popover with arbitrary z-index (line 200) — should use `--zaki-z-modal` (50) or `--zaki-z-tooltip` (70). Inventing a new layer.
- **Hero h1 mixes `LogoArabicOrange` icon with text headline** (lines 466-471). The "Orange" logo (stale name + stale color) on the brand-defining surface.

**P2**

- **MemoryPopover stage icons are arbitrary** (lines 187, 231): cycles through Brain, CalendarClock, AlertTriangle, CheckCircle2. AlertTriangle is an error icon used decoratively — misleading semantically.
- **Hero menu has only 2 items** ("About ZAKI" → external chatzaki.com, "About Nova Nuggets" → external novanuggets.com). Both `target="_blank"` to public sites. Reasonable, but the menu trigger feels heavyweight for two static external links — could be simpler footer or "About" tab.
- **`MetaLabel`** with `<Sparkles className="text-zaki-brand">` (line 52) — uses brand red for the meta-label icon. Consistent with brand discipline but check if it's overused (brand red should be sparing per DESIGN.md).

### Sidebar — desktop nav

File: `src/app/components/Sidebar.tsx` (2,357 lines)

The navigation entry to most features. Three modes (Spaces / ZAKI bot / Learning) via `sidebarMode`, profile menu in the footer, and 8+ modal triggers (settings, sessions, cron, secrets, diagnostics, power-user, memory, space-settings).

**P0 — functional bugs**

- **Pin button label is inverted** (lines 1706, 1906). `{thread.pinned ? "Unpin" : "Pinned"}` — when a thread is NOT pinned, the button label reads "Pinned" (a state, not an action). Convention: buttons describe the action they perform on click. Should be `"Unpin" : "Pin"`. Two locations (space-pinned and user-spaces threads).
- **Invisible text on premium badge** (line 2018). `isPremium ? "bg-zaki-success text-zaki-success" : "bg-zaki-sunken text-zaki-success"` — premium branch sets foreground green on a green background. WCAG fail (contrast 1:1). Free branch is fine.
- **Tautological ternary** (line 1985). `isPremium ? "text-zaki-success" : "text-zaki-success"` — both branches identical. Either dead code or copy-paste error: free users probably should display in a different color (e.g., `text-zaki-muted`).
- **Hardcoded English aria-labels** breaking RTL/Arabic users using screen readers (lines 1326, 1339, 1364, 1409, 1429): `"Main navigation"`, `"Open home"`, `"Spaces"`, `"Open profile"`, `"Collapse sidebar"`. Plus context menu labels: `"Unpin"`, `"Pinned"`, `"Rename"`, `"Delete"` (lines 1706-1922 area), `"Delete space"` dialog (line 2173 + body 2174), `aria-label="Memory viewer"` (line 2197).
- **`bg-white` thread context menu has no dark-mode override** (line 1894). Renders pure white on the dark canvas. Visual + functional bug.
- **"Settings" and "Language" buttons both open the same `SettingsModal`** (lines 2100 and 2113). Duplicate entry in profile menu — language switching should either be its own surface or be removed from menu and merged into Settings.

**P1**

- **2,357 lines in one component.** Same mega-file pattern as ChatArea + index.js. Profile menu, memory drawer, all 8 modals, and the entire space/thread tree rendered inline. Phase 4 split: profile menu → `SidebarProfileMenu`, modal stack → `SidebarModals`, space tree → `SpaceTree`.
- **30 `useState` declarations** in the component. Modal-state booleans (8+) should be a single store: one active modal at a time.
- **Brand-orange gradient where brand is red** (line 2203): `linear-gradient(135deg,#E56A54_0%,#219171_100%)` — `#E56A54` is salmon/orange, NOT in the ZAKI palette. Brand is `#f10202` + teal `#219171`. Stale color from pre-finalization era (same lineage as `LogoArabicOrange`).
- **`fileStatusTone` uses non-brand Tailwind colors** (lines 99-109): `bg-emerald-50/text-emerald-700`, `bg-amber-50/text-amber-700`, `bg-rose-50/text-rose-700`. Should use `--zaki-success`, `--zaki-warning`, `--zaki-error`.
- **`APP_VERSION = "1.5.69"` hardcoded** at line 57. Should come from `import.meta.env.VITE_APP_VERSION` or a generated build constant. Will drift silently (it probably already has).
- **40 `isRtl ?` ternaries with hardcoded en/ar pairs** (e.g., `sidebarCopy` constant lines 111-125, `fileStatusTone.label` lines 100-108). Same i18n bypass anti-pattern as LoginScreen, at scale.
- **20+ hex literals** (`#88735A`, `#141210`, `#1a1714`, `#2a2018`, `#0c0a09`, `#fff8f0`, `#f3e7d9`, `#E56A54`, `#ffb6a4`, `#efe6d9`, `rgba(15,15,15,0.12)`, `rgba(0,0,0,0.45)`, `rgba(241,2,2,0.18)`).
- **Memory viewer dialog (line 2195) is `role="dialog" aria-modal="true"` but `useFocusTrap` (imported line 20) is not applied to it.** Keyboard users can Tab out of the dialog into background controls. Need to verify focus trap is actually wired.
- **Custom `×` glyph as close button** (line 2221) instead of Lucide `X` icon. Inconsistent with the rest of the app.

**P2**

- **`backdrop-blur-[2px]`** arbitrary value (line 2184). Pick a backdrop blur token and use it consistently across all modals.
- **Two "help" entries** ("How to use" → onboarding modal, "Help" → /help page). Distinct purposes but the labels don't make that clear. Rename to "Show me how" + "Help center" or similar.
- **`gap-3 mb-4`** etc. — Tailwind default spacing utilities used liberally. Mostly aligned to 4px grid but mix of `mt-6 / pt-3 / py-4 / mb-2 / mb-3 / mb-5` reads as ad-hoc rather than scale-disciplined. Visual rhythm review in Phase 2.

**Architecture notes**

- 5 Zustand stores read in one component (`useAuthStore`, `useUIStore`, `useSpacesStore`, `useNavigationStore`, `useZakiSessionUiStore`). Cross-store reads make this brittle to refactor.
- `goToThread`, `goToSpace`, `goToZakiBot`, `goToZakiHome` etc. — navigation helpers in `useNavigation()`. Good abstraction; but the Sidebar still also uses raw `navigate("/help")`, `navigate("/legal")` etc. Inconsistent: pick one.
- ZAKI bot session list (`<ZakiSessionList>`) is its own component — good. The pattern should extend: `<SpaceTree>`, `<ProfileMenu>`, etc.

### Chat thread — `/spaces/:spaceId/threads/:threadId`

Files: `src/app/components/chat/views/ChatView.tsx` (238 lines), `src/app/components/chat/MessageBubble.tsx` (216 lines), `src/app/components/InputArea.tsx` (1,014 lines), `src/app/components/chat/StreamingMessage.tsx` (76 lines), plus supporting widgets (`ThinkingIndicator`, `MessageActions`, `BotStatusRail`, `NullalisRuntimeWidgets`, `NullalisTurnTimeline`).

**ChatView strengths.** Well-decomposed (238 lines), cleanly prop-driven, three-mode rendering (timelineMode / final_reply_reveal / regular). `t()` used correctly throughout. Comment discipline good (V1.10/V1.11 hotfix anchors).

**MessageBubble strengths.** Compact (216 lines), uses `MessageContent` for assistant rendering (image inline, code blocks, etc.), `SourceChip` for channel attribution, "why this answer" memory-source disclosure. The bot pillar is well-served at the bubble level.

**InputArea — major surface.** The composer where the user actually does the work. Most opinionated component in this audit so far. 1,014 lines.

**P0**

- **"Generate Image" menu item shows "coming soon" but the feature ships today** (`InputArea.tsx` line 783-803). `image_generate` tool works (Move 3 commit 16b852e wired the inline rendering). Today the menu item shows a stale "coming soon" pill + toast. **Decision needed before fix:** is this a deliberate gate (Nova wants a dedicated image-gen UI before exposing the menu entry) or a stale "coming soon" left from before the tool shipped? If stale, simplest fix is to set the textarea to a starter prompt like `"Generate an image of "` and focus, dropping the "coming soon" pill. NOT auto-fixed — flagging for your call.
- **Off-brand pressure-meter colors `#22c55e` and `#f59e0b`** (lines 137-140). Hardcoded green / amber / red. `#f59e0b` matches `--zaki-warning` exactly (already a token), so that's a one-line swap. `#22c55e` (green) has no token equivalent — brand "low pressure" should arguably be `--zaki-success` (teal `#219171`). Visual change vs convention; needs design call before fix.
- **Quota badge uses raw Tailwind `red-200/red-50/red-700` and `amber-200/amber-50/amber-700`** (lines 996-1000). Off-brand. Needs a `bg-zaki-warning` utility (token exists at `--zaki-warning-bg` but no utility class generated). Add the utility in `theme.css` `@theme` block, then map. **Token-coverage gap.**
- **Assistant error bubble uses raw `border-rose-200/bg-rose-50/text-rose-900` plus dark equivalents** (`MessageBubble.tsx` line 153). Rose is not in the brand palette. Should be `border-zaki-strong bg-zaki-error text-zaki-error` (the `--zaki-error` token IS the brand red `#f10202` so this is on-brand naturally).

**P1**

- **InputArea is 1,014 lines.** Voice/STT (~150 LoC), slash command logic, mode picker, web search, query mode, file upload, context meter, attachments — all inline. Phase 4 split into `useVoiceRecorder()` hook + `<ComposerToolbar>` + `<ComposerTextarea>` + `<ComposerActions>`.
- **No paste-to-attach.** The learning composer (`LearningPage.tsx` line 3035) handles `onPaste` for file/image attachments. ZAKI doesn't. Asymmetry — Nova's note that "learning has a better text input" maps directly. Add `onPaste` handler that filters DataTransfer items, accepts images/files, appends to `attachments`.
- **No drag-and-drop overlay** for files. Power-user feature; same family as paste.
- **No context chips above textarea.** Learning shows skill chips, memory file chips, source chips (`SpaceContextChip`) so the user sees what context their message will be sent with. ZAKI knows the active session, mode, channel, web-search state — but they're scattered as toggles in the toolbar. A unified row of chips above the textarea ("ZAKI bot · execute mode · web search on") would give the user the same clarity.
- **Capability-aware placeholder.** Learning's textarea changes placeholder by capability (`"Describe the math animation..."` etc.). ZAKI rotates through `t("input.placeholders")` array — generic. Could be smarter: detect mode (plan/execute/review) and tailor placeholder ("Plan with ZAKI..." / "Ask ZAKI to do..." / "Review ZAKI's work...").
- **Mode picker terminology overlap.** `["plan", "execute", "review"]` are workflow phases. The v1.11 handoff mentions "fast / balanced / deep" presets (response-style picker). Two orthogonal concepts; verify both are exposed and labeled clearly so users don't conflate them.
- **Web search arm + Query mode toggle** feel functionally adjacent. UX confusion potential. Phase 2 design call: are these one toggle or two?
- **Three-button voice flow** (Mic / Square / X) is busy. Common pattern: one button toggles record/stop, separate cancel only during recording. Already close but conditional rendering is complex.
- **MessageBubble dead prop** `isStreaming` accepted then `void`-ed (line 74). Remove from prop signature.
- **MessageActions `visible={false}`** (line 174) but actions still render — verify the prop semantic isn't dead.
- **Image attachments lack zoom/lightbox** (line 115-122). Same affordance gap as the just-shipped `image_generate` inline images. Could share the same `ImageBlock` component for consistency.

**P2**

- **`zakiContextValue` clamps to `[0,100]` and rounds before display** — fine, but the conic-gradient visualization at low values (1-5%) renders as a tiny sliver. Could threshold display at >5%.
- **`isUser && <div className="size-8 shrink-0" aria-hidden="true" />`** (line 213) — empty-spacer div for alignment. Functional but layout-via-div smell. Use grid or margin instead.

### Token coverage gap (cross-cutting from chat audit)

Concrete additions needed in `src/styles/tokens.css` + `src/styles/theme.css` `@theme` block to support proper migration off the off-brand colors found in:
- `bg-zaki-warning` utility (subtle warning bg) — for quota badge, future warning chips
- `text-zaki-warning` utility — for warning text
- A "low pressure" / "neutral healthy" utility — green isn't in the brand; using teal `--zaki-success` for "low pressure" could work but visually different from the convention

Filing this as a cross-cutting Phase 2 prep task: extend token coverage so utilities exist for every semantic the UI needs. Eliminate the temptation to reach for raw Tailwind colors.

### Brain page — `/brain`

Files (12, 2,889 lines total): `BrainPage.tsx` (460), `BrainGraphView.tsx` (1,108 — incl. `DetailPanel` + `HoverTooltip` inline), `BrainFilterPanel.tsx` (310), `BrainTimelineView.tsx` (225), `BrainComposeModal.tsx` (174), `BrainTimeScrubber.tsx` (167), `brainColors.ts` (155), `BrainCommunityLegend.tsx` (141), `BrainOrphanRail.tsx` (92), `BrainSemanticDegradedBanner.tsx` (28), `BrainEmptyState.tsx` (23), `index.ts` (6).

Nova's authority lifted the V1.11 "don't refactor for taste" guard — but the V1.11 invariants (NaN clamping, dark-locked overlay panel colors, importance-driven node sizing, per-edge relevance-weighted layout) stay. Hotfix comments documenting them are excellent and stay too.

**Strengths.** This is the cleanest surface in the audit. BrainPage uses a single-source `activePanel` state (Obsidian Graph View pattern). Heavy V1.11 hotfix comments document every non-obvious decision (the "why" comments DESIGN.md asked for). i18n via `t()` consistent throughout. Source attribution rendering in DetailPanel is the Pillar 1 trust-builder ("I can see exactly where ZAKI learned this"). Per-edge relevance-weighted layout fixes "important things sit close together."

**P0 — silent runtime regression (caught in live preview)**

`runLayout` in `BrainGraphView.tsx:867-891` wraps the per-edge `idealEdgeLength` function in a try/catch. Live preview against 40 nodes / 789 edges shows the function call **always throws `RangeError: Invalid array length`** deep inside cose-bilkent's `FDLayout.calcGrid` → `updateGrid` → `calcRepulsionForces` chain. Every layout run logs the warning + falls back to the constant. Net effect: **per-edge relevance-weighted distance — Nova's "if two nodes are close, they're more relevant" Pillar 1 differentiator — is never actually applied**.

V1.11 hotfix-3 comment claimed: "with NaN clamped at the source, function-based idealEdgeLength is safe." Reality (live preview, 2026-05-07): the function returns finite numbers ≥ 20, but cose-bilkent's internal grid sizing rejects something downstream. Stack trace points at `calcGrid` (line 2691 of cose-bilkent v.4-7-1), not at `idealEdgeLength` evaluation itself. The crash is in the layout iteration loop, not at the first call.

**Diagnosis path (next investigation):** likely candidate is dramatic length variance from the function (`relevance 1.0 → 0.5×base`, `relevance 0.2 → 1.3×base`) producing grid cell counts that overflow cose-bilkent's pre-allocated array. Test by clamping the returned length to a tighter range (e.g. `[0.7×base, 1.3×base]` instead of `[0.5×base, 1.3×base]`) and seeing if the error stops.

**Severity: P0 because it's a silent loss of a load-bearing differentiator.** Logging this for the brain investigation queue. Not introduced by recent changes — pre-existing on main. Console also gets spammed (~24 entries per page load).

**P0 — atomic ship-ready (small token migration + a11y)**

- **Off-brand `text-red-500` error in `BrainComposeModal:148`** → `text-zaki-error`.
- **Off-brand `bg-amber-500/15 text-amber-400` Superseded badge in `BrainGraphView:1101`** → `bg-zaki-warning text-zaki-warning` (using new utilities I just shipped).
- **Off-brand `border-amber-400/60 bg-amber-50 text-amber-900` in `BrainSemanticDegradedBanner:11`** plus dark variants → `border-zaki-warning bg-zaki-warning text-zaki-warning`. Single utility set works in both modes now that `--zaki-warning-bg` is translucent rgba.
- **Off-brand `bg-emerald-500` / `bg-amber-500` tone dots in `BrainTimeScrubber:140`** → `bg-zaki-success` / `bg-zaki-warning`. Emerald is not in the brand; teal substitution is brand-coherent.
- **Hardcoded English `aria-label="Close panel"` in `BrainPage.tsx:434`** → `t("brain.panel.close", { defaultValue: "Close panel" })`.
- **TabButton (Timeline / Graph) has no tab semantics**: missing `role="tablist"` on container, `role="tab"`, `aria-selected`, `aria-controls`. Screen readers don't announce tab state. Add proper Radix Tabs primitive (already a dep) or inline ARIA.
- **`#f10202` hex literal used 8+ times across `BrainPage.tsx` and `BrainGraphView.tsx`** instead of the `--zaki-brand` token / `text-zaki-brand` utility. Examples: focus border (`BrainPage:187`), compose-from-N button (`BrainPage:347`), PanelToggle active state (`BrainPage:400`), TabButton active border (`BrainPage:453`), depth slider accent (`BrainGraphView:757`), selected count chip (`BrainGraphView:776`), importance fill bar (`BrainGraphView:975`), Show Local button (`BrainGraphView:1095`), title field focus (`BrainComposeModal:131,143`), submit button (`BrainComposeModal:163`), success label (`BrainComposeModal:153`). Brand-canvas exception explicitly does NOT extend to brand red — that's a token. Migrate all to `var(--zaki-brand)` (inline styles) or `bg-zaki-brand` / `text-zaki-brand` / `border-zaki-brand` utilities.
- **Inline `<svg>` for search + clear icons in `BrainPage:166-179, 200-214`** instead of Lucide `Search` / `X` (already imported `X` at line 4). Inconsistency.

**P1 — Day 4 polish per V1.11 handoff doc, deferred but ready to ship**

These were called out as "post-summit / V1.12" but Nova's lift means we can pull them forward. They compound for marketing:

- **URL deep-linking:** `/brain?center=<key>&panel=clusters&q=<search>` should restore state. Today: refresh loses everything. Critical for the Pillar 1 "post your brain to Twitter" beat — sharing the URL needs to land the recipient on the same view.
- **Keyboard shortcuts:** `f` toggle filters panel, `c` toggle clusters, `o` toggle loose facts, `Esc` close active panel, `/` focus search. Linear/Obsidian-grade affordance. None today.
- **Copy-key button** next to the memory key in DetailPanel. Today: must triple-click + copy. Quick paperclip icon button + tooltip.
- **Supersede chain stepper.** Today: prior versions render as a flat list. Should be a stepper showing valid_from → valid_to ranges with a "current" pin. The chain is ZAKI's V1.10 truth-maintenance differentiator; surfacing it visually matters.
- **Empty state revamp.** `BrainEmptyState.tsx` is 23 lines. The brief says "Obsidian-style 'your brain starts here' illustration." First-time user moment.
- **Mobile responsive.** Floating overlay panels collapse to bottom-sheet under 768px. Today: probably broken at narrow widths (panels fixed at right-3 + width assumptions).
- **DetailPanel RTL flipping.** `inset-y-0 right-0` hardcoded LTR. In Arabic/RTL, the panel should sit on the left. Today: stays right.
- **Panel collision check.** When DetailPanel is open AND user toggles Filters, both right-anchored surfaces. Need stacking rule (DetailPanel takes precedence, OR panels nest, OR panels relocate).

**P1 — taste / structural improvements (Nova's call before shipping)**

These are the things I'd want to change beyond the polish list. Each is a discussion, not a unilateral fix:

1. **BrainComposeModal slides up from canvas bottom (line 95: `absolute inset-x-0 bottom-0`).** Steals canvas viewport. Two alternatives: (a) corner-anchored card (top-right under the PanelToggle cluster), (b) true full-overlay above canvas. I'd pick (a) — keeps canvas visible while composing. Your call.
2. **`Compose from N` button is `fixed bottom-6 right-6` (line 343).** Outside the canvas, anchored to viewport. May overlap with sidebar collapse / mobile UI. Should probably move inside the canvas (bottom-right of canvas instead of bottom-right of viewport).
3. **Search bar has no `⌘K` / `/` shortcut affordance.** Most users won't discover the keyboard shortcut. Inline `⌘K` chip on the search input's right side, like Linear / Cron. Cheap, big discoverability win.
4. **First-time-on-brain-page tutorial.** A user with 50 nodes seeing them for the first time has no idea what to do. A 3-step coachmark sequence (hover for tooltip → click for detail → drag/scroll to navigate) would be a 30-second onboarding. Optional first-load flag in localStorage.
5. **The DetailPanel `Show local graph` button enters local mode but the visual transition is abrupt.** Brief animation (200ms ease) on canvas swap would feel premium.
6. **Importance bar in DetailPanel is a thin red bar** (line 973-979). Could be smarter — small histogram showing this node's importance vs the corpus distribution. "You're in the top 5% by importance."
7. **Compose modal references chips have no remove affordance.** Once a node is added, can't remove without going back to canvas. Add `×` to each chip.

**P2 — defer**

- BrainComposeModal `textarea rows={3}` — auto-resize would help.
- BrainComposeModal markdown live-preview pane.
- BrainComposeModal Cmd+Enter to submit.
- DetailPanel "captured timestamp" → "X days ago" + absolute on hover.
- DetailPanel `historyOpen` toggle has no animation.
- Linked memories `line-clamp-2` truncation — hover to expand.

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
