# Spaces Classic — S-Tier Productization (Design Spec)

- **Status:** Locked (awaiting spec review → writing-plans)
- **Date:** 2026-06-09
- **Branch:** `saas-v1/spaces-classic` (cut from `saas-v1/chat-meter` @ `507f22d`)
- **Owner of this slice:** Chat/Spaces spoke UI/UX, end-to-end
- **Working style:** Drive with slice checkpoints; verify each slice against the DESIGN.md Review Ritual before claiming done.

---

## 1. Goal

Finalize and productize the **Chat/Spaces** spoke to S-tier — ready for paying users — **within the existing architecture** (no `ChatArea` decomposition, no routing rewrite). The visual identity is **"Spaces Classic inside the V2 app shell":** Spaces deliberately preserves a softer, calmer V1 product feel as a *differentiator* from the dense operational Agent surface. The fix is **palette discipline + sidebar authority + state/wiring completeness**, not a layout rewrite.

This pass is **UI/UX only**. Feature builds (members/sharing, archive, duplicate, bulk actions) are explicitly deferred to a later effort; this pass only ensures the surface is **honest** (no dead buttons, no UI implying unbuilt workflows).

---

## 2. Scope

### In scope — Chat/Spaces-owned
- Views: `SpacesView`, `SpaceDetailView`, `ZakiHomeView` (spaces home), `ReadyState`, `EmptyState`, `ChatView` on its `botMode=false` path
- Modals/sheets: `CreateSpaceModal`, `EditInstructionsModal`, `sidebar/SpaceSettingsSheet`
- Canonical left **Sidebar** (`<Sidebar chrome="context" />`, `App.tsx:379`) + `sidebar/*` (visual cleanup only — structure is already correct)
- Spaces composer affordances in `InputArea` (web-search, query-mode, attachments, voice, plain text — **not** the agent chips)
- `BackgroundPattern` + its `--zaki-pattern-*` vars (retune within the Spaces scope)

### In scope — shared rendering (used by Spaces, also by Agent)
- `MessageBubble`, `MessageActions`, `MessageContent`, `BlockRenderer`, `InlineTextRenderer`, `rendering/blocks/*` (CodeBlock, TableBlock, QuoteBlock, DownloadButtonBlock, …), `QuickReplyChips`
- These are **token-mapping / a11y** fixes that are visually equivalent and improve both surfaces. **The Agent surface must not regress** — verify light/dark on both after editing shared files.

### Out of scope (do not touch)
- Agent spoke: `ZakiDashboard`, `AgentInspectorRail`, `V2StatusStrip`, `AgentSessionRail`, `BotToolCallBlock`, `ReasoningBlock`, `Nullalis*`, `BrowserViewFeedPanel`, `BotStatusRail`, `BrainMentionPopover`, agent composer chips.
- The discriminator everywhere: `isZakiBotActiveSpace = isZakiBotSpaceId(activeWorkspaceSlug)` — **false = Chat/Spaces** (our scope), true = Agent.
- **Metering display.** The meter is owned by the **Dashboard** (hub), not Spaces. Spaces shows only a graceful **limit notice** when a send is blocked — never a meter widget.
- Feature builds (members/sharing/archive/duplicate/bulk) — deferred.

---

## 3. Locked design decisions

1. **Preserve (V1 character = differentiation):**
   - Product skeleton: ProductRail + AppTopbar + main shell.
   - Canonical left context Sidebar (already persistent for `/spaces` via the 232px grid column in `App.tsx:368`). It owns space search, create, switch, and thread nav. **No second/internal sidebar; no nav duplicated in main content.** The space-card grid on the landing is a *launcher/discovery* surface, not competing nav — keep it.
   - Patterned background (`BackgroundPattern`, rendered only for Spaces at `ChatArea.tsx:8306`). Kept, but **retuned**.
   - Rounded message bubbles (`rounded-zaki-xl` + tail corner, `MessageBubble.tsx:215`). **Never squared.** Assistant replies stay transparent full-width prose.
   - Spaces landing: templates + explainer + space-card launchers — kept, hierarchy/colors cleaned.

2. **Borrow (V2 discipline only):**
   - Exact `--v2-*` tokens (values in §5). Use existing tokens/aliases — **no hardcoded hex in components**.
   - **Single ember accent** (`#D24430`) replaces the rainbow template/category colors.
   - Hairline borders + darker neutral surfaces.
   - Sidebar nav authority (already structurally present — visual cleanup only).

3. **Deliberate deviations from the V2 *Spaces mock*** (the mock is the "full dense V2" that was rejected): we do **not** square bubbles, do **not** add the ember authorship rail, do **not** flatten the background, do **not** add the 3-tab right panel (PROMPT/FILES/MEMORY), and do **not** adopt the mock's Thmanyah font. We keep **current fonts** (Plus Jakarta prose / DM Mono chrome / Zain Arabic).

4. **Per-space color identity:** keep per-space color-coding as a feature, but replace the rainbow with a **curated, V2-harmonized swatch set** (muted/desaturated tones that read correctly on the dark stage). Templates lose category colors → ember + neutral.

5. **Honesty over unbuilt features:** do not surface workflows that don't exist (matches DESIGN.md "don't pretend the workflow exists"). Verify the legacy "Private" badge is not rendered in the current UI; remove if it's dead code.

6. **Mechanism:** a scoped class **`.zaki-spaces-classic`** applied from `ChatArea` for `/spaces`, `/spaces/:id`, and `/spaces/:id/threads/:id`. Inside that scope, retune `--zaki-pattern-*` from warm brown → V2 neutrals (low opacity) and host any Spaces-Classic-specific overrides.

---

## 4. Surface boundary & key anchors (verified in code)

| Concern | Anchor |
|---|---|
| Shell grid (Spaces = non-wide → keeps 232px sidebar) | `App.tsx:364-380` |
| URL → view sync | `App.tsx:119-152` |
| Spaces/Agent discriminator + quota surface (`app_chat` vs `zaki_bot`) | `ChatArea.tsx:3239-3249` |
| Spaces view render branch | `ChatArea.tsx:8027-8044` |
| Spaces home (`ZakiHomeView`, sidebarMode≠"zaki") | `ChatArea.tsx:8070-8078` |
| Background pattern (Spaces only) | `ChatArea.tsx:8306` |
| Rounded user bubble | `MessageBubble.tsx:210-221` |
| Canonical sidebar mount | `App.tsx:379` (`Sidebar chrome="context"`) |
| Pattern vars (warm V1) | `src/styles/index.css:249-267` |

**To confirm in Slice 0:** `SpaceDetailView` reachability (audit found `showSpaceDetail` may be gated off at `ChatArea.tsx:~2830`); and whether thread **pinning** persists to the backend (`Sidebar.tsx:1800-1803` updates local state only).

---

## 5. Token map (V1 → V2) — exact values

Existing `--v2-*` tokens (and `--zaki-*` aliases) already exist in `src/styles/v2.css`. Replace hardcoded hex with these. Values below are the migration targets.

**Surfaces** — light / dark:
- base `--v2-bg`: `#F4F1EC` / `#0A0908`
- raised `--v2-bg-raised`: `#FBF9F5` / `#131110`
- sunken `--v2-bg-sunken`: `#ECE7DF` / `#050403`

**Hairlines** — light / dark:
- `--v2-hairline`: `rgba(14,13,11,0.10)` / `rgba(236,231,223,0.10)`
- `--v2-hairline-strong`: `rgba(14,13,11,0.20)` / `rgba(236,231,223,0.22)`
- `--v2-hairline-faint`: `rgba(14,13,11,0.06)` / `rgba(236,231,223,0.05)`

**Ember accent** (both stages):
- `--v2-accent` `#D24430`; hover `#B83A28`; active `#9F3122`; dim `rgba(210,68,48,0.55)`; faint `rgba(210,68,48,0.12)`; hairline `rgba(210,68,48,0.35)`

**Ink/text** — light / dark:
- `--v2-ink-1` `#0E0D0B` / `#ECE7DF`; `--v2-ink-2` `#3D3A35` / `#B8B2A9`; `--v2-ink-3` `#6B6660` / `#807A72`; `--v2-ink-4` `#9C968E` / `#565049`

**Semantic** (status only, where meaning is real):
- success `#21916F` (+faint `0.12`); warn `#C28D2C` (+faint `0.12`); danger = ember `#D24430` (+faint `0.12`)

**Pattern retune** (inside `.zaki-spaces-classic`): redefine `--zaki-pattern-start/mid/end/glow-1/glow-2` from warm brown to cool V2 neutrals derived from the surfaces/inks above. **The pattern should read clearly — more present and contrasted than a faint texture** (per user direction), while staying within the V2 neutral palette (no warmth, no color). Push the stroke/glow contrast against the surface up so the pattern is legible in both light and dark, stopping short of visual noise behind text. Exact values chosen and screenshotted in Slice 0/1 (tune for clarity, verify legibility of overlaid content).

**Per-space swatch set** (curated, replaces rainbow): a small set of muted/desaturated V2-stage tones + ember. Defined as tokens in Slice 1; applied to the icon/color picker (`SpaceDetailView`, `SpaceSettingsSheet`) and space identity dots in the sidebar.

---

## 6. Gap inventory (what "not yet S-tier" means here)

### Axis 1 — Visual & token discipline (~68 hardcoded-color sites)
Representative (line-referenced; full list enumerated during execution):
- `SpacesView.tsx`: `dark:bg-[#141210]`/`rgba(240,236,230,0.08)` (L211/239/303); 5 rainbow template colors `#219171/#d97706/#2563eb/#7c3aed/#16a34a` (L47-91); inline rgba template icons (L272, 218-220).
- `SpaceDetailView.tsx`: 7 rainbow picker colors (L35); fallback `#88735A` (L123); off-scale radii `rounded-[3px]/[2px]` (L112/129/139); mixed `.zaki-btn` (L180).
- `CreateSpaceModal.tsx`: warm gradients + browns (L125-126/133/153/155).
- `Sidebar.tsx` + `sidebar/*`: ~40 sites incl. warm→teal profile gradient `#E56A54→#219171` (L2310-2312), fallback `#88735A` (L1864/2035), `dark:bg-[#141210]` menu hexes, `SpaceSettingsSheet` warm pills/rgba, `rounded-full` pill chrome, shadow `rgba(15,15,15,…)`.
- Shared blocks: `InlineTextRenderer.tsx:37` (inline code), `QuoteBlock.tsx:6`, `TableBlock.tsx:7/17/44/61`, `CodeBlock.tsx:30`, `DownloadButtonBlock.tsx:12`, `BlockRenderer.tsx:172` (callout).
- Shell: `App.tsx:365` `dark:text-[#efe6d9]`.

### Axis 2 — Accessibility & motion
- Hover-only actions with **no keyboard path**: space-card settings/delete (`SpacesView.tsx:321-355`), sidebar/thread rows.
- Touch targets < 44px: `MessageActions` (size-7 = 28px), small sidebar icon buttons.
- Missing focus-visible rings on cards/thread rows; missing `aria-live` on streaming; icon-only/color-only affordances without labels.
- Un-i18n'd strings in `EditInstructionsModal` ("Edit instructions"/"Cancel"/"Save").
- No focus trap/return in the icon picker; contrast-risk muted grays.
- No `prefers-reduced-motion` handling.

### Axis 3 — Mobile/responsive
- Largely responsive already (grids use `sm:/md:/lg:`). Real gaps: hover-only actions unreachable on touch (fixed by Axis-2 work), sheet-vs-modal polish, composer must keep memory/limit state visible, sidebar ↔ `MobileSidebar` drawer parity, no clip/overflow at 360-390px.

### Axis 4 — Designed states + wiring integrity
- **States — missing:** `SpacesView` (empty / error / permission / limit-notice / degraded); `SpaceDetailView` (initial-load skeleton / limit / degraded); `ChatView` (limit-notice → points to Dashboard, **not a meter**; permission; disabled); `CreateSpaceModal` (error). Implemented already: SpaceDetail empty/error(file)/readOnly, ChatView empty/loading/error/streaming, modal disabled-on-empty.
- **Wiring:** nearly all Spaces controls are WIRED to real API calls (create/open/settings/delete/rename/description/search/sort/icon+color persist/upload/remove/instructions/threads). One **PARTIAL**: thread pinning (local only — confirm/fix persistence). Deferred features (members/sharing/archive/duplicate/bulk) stay hidden. Verify "Private" badge not rendered.

---

## 7. Execution — 6 slices (each ends in a verified checkpoint)

> Checkpoint = relevant Review Ritual dimensions pass (desktop, mobile, keyboard, light/dark, a11y, meter/memory truth) on the live preview + green typecheck/tests, with before/after proof. Pause for review at slice boundaries.

### Slice 0 — Isolation & baseline ✅ (branch + baseline done)
- [x] Cut `saas-v1/spaces-classic` from latest; typecheck clean; 558 tests green.
- [ ] Boot dev server; capture baseline screenshots: spaces list, space detail, a thread, create modal, sidebar — **light/dark/mobile**.
- [ ] Confirm `SpaceDetailView` reachability and thread-pin persistence.
- [ ] Land the `.zaki-spaces-classic` scope wiring (no-op styling first) + finalize the pattern-retune values + the curated swatch tokens.

### Slice 1 — Palette & token discipline
- [ ] Replace **all ~68 hardcoded hex/rgba** with `--v2-*`/`zaki-*` tokens across the in-scope files.
- [ ] Collapse rainbow template colors → ember + neutral; retune per-space picker to the curated V2 swatch set.
- [ ] Retune `--zaki-pattern-*` under `.zaki-spaces-classic`; clean the warm→teal profile gradient and `rounded-full`/off-scale-radius chrome to V2.
- [ ] **Preserve** rounded bubbles + landing structure.
- [ ] Verify: Spaces **and** Agent (shared files) in light/dark; no visual regression on Agent.

### Slice 2 — Accessibility & motion
- [ ] focus-visible on every interactive element (cards, thread rows, sidebar items, action buttons).
- [ ] Keyboard path for hover-only actions (reveal on `focus-within`); 44px touch targets.
- [ ] `aria-live` on streaming; aria-labels for icon-only + color-only (file status) affordances.
- [ ] i18n the `EditInstructionsModal` strings; focus trap + return in icon picker/sheets; contrast fixes.
- [ ] Global `prefers-reduced-motion` handling for Spaces animations.
- [ ] Verify: keyboard-only nav + axe/contrast checks.

### Slice 3 — Mobile hardening
- [ ] Touch-reachable actions; sheets over cramped modals; no clip/overflow at 360-390px.
- [ ] Composer keeps memory/limit state visible; sidebar ↔ `MobileSidebar` drawer parity.
- [ ] Verify: mobile widths, light/dark.

### Slice 4 — Designed states + wiring integrity
- [ ] Build the missing state matrix: `SpacesView` (empty/error/permission/limit-notice/degraded), `SpaceDetailView` (load skeleton/limit/degraded), `ChatView` (limit-notice → Dashboard; permission; disabled), `CreateSpaceModal` (error).
- [ ] Wiring: confirm no dead buttons; fix/confirm thread-pin persistence; keep unbuilt features hidden; remove any misleading legacy affordance (e.g. stale "Private" badge if present).
- [ ] Verify: each state renders correctly; limit-notice never duplicates a meter.

### Slice 5 — Review Ritual + ship prep
- [ ] Full DESIGN.md Review Ritual across the spoke (desktop/mobile/keyboard/light-dark/a11y/meter-memory/product-truth).
- [ ] Green typecheck + tests; before/after proof gallery; summary.
- [ ] `finishing-a-development-branch` (PR/merge decision).

---

## 8. Verification standard (Review Ritual mapping)

Per DESIGN.md every major UI slice must pass: desktop visual, mobile visual, keyboard nav, light/dark stage, accessibility, product-truth (no fake workflows), and meter/memory truth (meter lives in Dashboard; memory remains visible/governable). Evidence (screenshots/test output) before any "done" claim.

---

## 9. Out of scope / deferred (explicit)

- Metering UI in Spaces (Dashboard owns the meter).
- Members / sharing / share-link, space archive, duplicate/clone, bulk actions, advanced sort, thread metadata (timestamps/counts), file preview in main detail view.
- `ChatArea` decomposition, routing/URL-state rework, font system change (no Thmanyah), Agent-surface visual work.

---

## 10. Risks & mitigations

- **Shared-file edits regress Agent.** Mitigation: token-equivalent changes only; verify Agent light/dark after Slice 1.
- **Pattern retune lands too faint or too noisy.** Mitigation: target a clear, contrasted-but-non-distracting pattern (user wants it visible); screenshot light/dark in Slice 0/1 and tune against overlaid text legibility.
- **"Spaces Classic" drifts toward full V2.** Mitigation: this spec's deviation list (§3.3) is the guardrail — bubbles stay rounded, pattern stays, landing stays.
- **Hidden quota race / fail-open.** Mitigation: Spaces only renders a graceful limit-notice; no new metering logic introduced here.
