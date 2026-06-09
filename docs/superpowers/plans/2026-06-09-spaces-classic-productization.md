# Spaces Classic Productization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (slice-checkpoint batches, matching the chosen working style) or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finalize the Chat/Spaces spoke to S-tier as "Spaces Classic inside the V2 app shell" — V2 palette/token discipline, ember-only accent, canonical sidebar, full state matrix, a11y + mobile hardening — while preserving Spaces' softer V1 identity (patterned background retuned + clearer, rounded bubbles, template/explainer landing).

**Architecture:** Scoped `.zaki-spaces-classic` class applied from `ChatArea` over the Spaces routes hosts a pattern retune + curated per-space swatch palette. Hardcoded colors across ~14 files are replaced with existing `--v2-*`/`zaki-*` tokens, enforced by a permanent guard test. No `ChatArea` decomposition, no routing rewrite, no font change. Meter stays in the Dashboard.

**Tech Stack:** Vite 6, React + TS, Tailwind v4 (`@theme inline`, tokens in `src/styles/*.css`), Jest + React Testing Library, Playwright (e2e), `lucide-react`, `react-i18next` (en/ar).

**Spec:** `docs/superpowers/specs/2026-06-09-spaces-classic-productization-design.md`

---

## File Structure

**New:**
- `src/styles/spaces-classic.css` — the `.zaki-spaces-classic` scope: retuned `--zaki-pattern-*` (clearer/contrasted, V2 neutral) + curated `--zaki-space-swatch-*` palette tokens. Imported from `src/styles/index.css`. **Single source of truth for the swatch palette** (allowlisted in the guard test).
- `src/app/components/chat/spaceSwatches.ts` — exports `SPACE_SWATCHES` (list of swatch **token var names**, not literals) + `DEFAULT_SPACE_SWATCH` for fallbacks. Consumed by the icon/color pickers and sidebar identity dots.
- `src/test/spacesTokenDiscipline.test.ts` — permanent guard: asserts the in-scope Spaces source files contain **no hardcoded hex/`rgba()` literals** in component code (allowlist: `spaces-classic.css`).
- Slice 4 state components (created when elaborated): e.g. `src/app/components/chat/views/states/SpacesErrorState.tsx`, `SpacesLimitNotice.tsx` (names finalized at Slice 4 start).

**Modified (Spaces-owned):** `views/SpacesView.tsx`, `views/SpaceDetailView.tsx`, `views/ZakiHomeView.tsx`, `views/EmptyState.tsx`, `views/ReadyState.tsx`, `modals/CreateSpaceModal.tsx`, `modals/EditInstructionsModal.tsx`, `Sidebar.tsx`, `sidebar/SpaceSettingsSheet.tsx`, `sidebar/ProfileMenu.tsx`, `sidebar/ZakiSessionList.tsx`, `sidebar/DeleteConfirmModal.tsx`, `ChatArea.tsx` (apply scope class; Spaces render branches only).

**Modified (shared rendering — verify Agent no-regress):** `MessageBubble.tsx`, `MessageActions.tsx`, `rendering/InlineTextRenderer.tsx`, `rendering/BlockRenderer.tsx`, `rendering/blocks/{QuoteBlock,TableBlock,CodeBlock,DownloadButtonBlock}.tsx`, `QuickReplyChips.tsx`.

**Styles:** `src/styles/index.css` (pattern var defs `:249-267`; import new sheet), `src/styles/v2.css` (token reference only — do not redefine).

---

## Verification commands

- Typecheck: `npm run typecheck` → expect no output (pass).
- Unit/guard tests: `npm test -- <path>` (jest). Full: `npm test`.
- Dev server / preview: use the `preview_*` tools (start, snapshot, screenshot, resize, console_logs). Routes: `/spaces`, `/spaces/:id`, `/spaces/:id/threads/:id`.
- Baseline (already captured): typecheck clean, 558 tests/68 suites green.

---

# SLICE 0 — Isolation & Baseline

Branch + baseline already done (`saas-v1/spaces-classic` @ base `507f22d`; typecheck clean; 558 tests green). Remaining:

### Task 0.1: Capture current-state baseline (light/dark/mobile)

**Files:** none (evidence only).

- [ ] **Step 1: Start the dev server** via `preview_start`. Confirm it serves.
- [ ] **Step 2: Authenticate/reach Spaces.** Navigate to `/spaces`. If auth-gated, note the anonymous-allowed path (App.tsx:92-96 permits `/spaces`). Capture console errors via `preview_console_logs`.
- [ ] **Step 3: Screenshot baseline** at desktop (≥1280w) and mobile (390w), light + dark, for: spaces list, a space detail, a thread, the create-space modal, the sidebar. Save under `docs/superpowers/plans/assets/baseline/` (or attach inline). These are the before/after reference.
- [ ] **Step 4: Commit** any captured assets:
```bash
git add docs/superpowers/plans/assets/baseline 2>/dev/null || true
git commit -q -m "docs(spaces): capture Spaces baseline screenshots" || echo "no assets to commit"
```

### Task 0.2: Resolve the two open questions

**Files:** read-only investigation; record findings in the plan.

- [ ] **Step 1: SpaceDetailView reachability.** Read `ChatArea.tsx` around the `showSpaceDetail` flag (~:2830) and the `space-detail` render branch (~:8030). Determine: is `/spaces/:id` rendering `SpaceDetailView`, or is it routed straight into a thread? Record the answer (it decides whether Slice-1/2/4 work on `SpaceDetailView` is user-visible or sidebar-only).
- [ ] **Step 2: Thread-pin persistence.** Read `Sidebar.tsx:1800-1822` (`togglePinned`) and search for a PATCH/POST that persists `pinned`. Record: WIRED or LOCAL-ONLY. (Drives the Slice-4 pin task: either keep, persist, or hide the control.)
- [ ] **Step 3:** Note both findings in a short comment block appended to this plan file under "Slice 0 findings", and commit.

### Task 0.3: Scaffold the `.zaki-spaces-classic` scope (no visual change yet)

**Files:**
- Create: `src/styles/spaces-classic.css`
- Modify: `src/styles/index.css` (add `@import "./spaces-classic.css";` near the other imports)
- Modify: `ChatArea.tsx` (add the scope class to the Spaces surface wrapper; the element that currently hosts Spaces views + `BackgroundPattern` at ~:8306)

- [ ] **Step 1: Create the scope sheet** with the current (unchanged) pattern values first, so applying the class is a verified no-op:
```css
/* src/styles/spaces-classic.css
 * Spaces Classic scope: V1 character (pattern + soft chat) on V2 discipline.
 * This file is the SINGLE source of truth for the per-space swatch palette
 * and the Spaces-scoped background pattern retune. (Allowlisted in the
 * spaces-token-discipline guard test.)
 */
.zaki-spaces-classic {
  /* Pattern retune lands in Task 1.5 — start as a no-op mirror of index.css */
}
.dark .zaki-spaces-classic {
}
```
- [ ] **Step 2: Import it** in `src/styles/index.css` after the existing token sheets (so the scope can override `--zaki-pattern-*`).
- [ ] **Step 3: Apply the class** in `ChatArea.tsx` to the Spaces surface container (the branch that renders Spaces views + `BackgroundPattern`, gated by `!isAgentSurface`). Do not change any other styling.
- [ ] **Step 4: Verify no-op.** `npm run typecheck` (pass). Reload preview; screenshot `/spaces` light+dark — must be pixel-equivalent to the Task 0.1 baseline.
- [ ] **Step 5: Commit**
```bash
git add src/styles/spaces-classic.css src/styles/index.css src/app/components/ChatArea.tsx
git commit -m "feat(spaces): scaffold .zaki-spaces-classic scope (no-op)"
```

**Slice 0 checkpoint:** baseline captured; two questions answered; scope class live as a verified no-op. → Review.

---

# SLICE 1 — Palette & Token Discipline

### Task 1.1: Guard test — fail on hardcoded color literals

**Files:**
- Create: `src/test/spacesTokenDiscipline.test.ts`

- [ ] **Step 1: Write the failing test.** It scans each in-scope component file for hex (`#abc`/`#aabbcc`/8-digit) and `rgba(` literals in source, ignoring comments. Allowlist `spaces-classic.css` and `spaceSwatches.ts`’s var-name references (no literals there by design).
```ts
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
// In-scope Spaces component files (token discipline enforced here).
const FILES = [
  "app/components/chat/views/SpacesView.tsx",
  "app/components/chat/views/SpaceDetailView.tsx",
  "app/components/chat/views/ZakiHomeView.tsx",
  "app/components/chat/views/EmptyState.tsx",
  "app/components/chat/views/ReadyState.tsx",
  "app/components/chat/modals/CreateSpaceModal.tsx",
  "app/components/chat/modals/EditInstructionsModal.tsx",
  "app/components/chat/QuickReplyChips.tsx",
  "app/components/chat/rendering/InlineTextRenderer.tsx",
  "app/components/chat/rendering/BlockRenderer.tsx",
  "app/components/chat/rendering/blocks/QuoteBlock.tsx",
  "app/components/chat/rendering/blocks/TableBlock.tsx",
  "app/components/chat/rendering/blocks/CodeBlock.tsx",
  "app/components/chat/rendering/blocks/DownloadButtonBlock.tsx",
  "app/components/Sidebar.tsx",
  "app/components/sidebar/SpaceSettingsSheet.tsx",
  "app/components/sidebar/ProfileMenu.tsx",
  "app/components/sidebar/ZakiSessionList.tsx",
  "app/components/sidebar/DeleteConfirmModal.tsx",
];

const HEX = /#[0-9a-fA-F]{3,8}\b/;
const RGBA = /\brgba?\(/;

function offendingLines(src: string): string[] {
  return src.split("\n").reduce<string[]>((acc, line, i) => {
    const code = line.replace(/\/\/.*$/, "");
    if (HEX.test(code) || RGBA.test(code)) acc.push(`${i + 1}: ${line.trim()}`);
    return acc;
  }, []);
}

describe("Spaces token discipline (DESIGN.md: no hardcoded hex in components)", () => {
  for (const rel of FILES) {
    it(`${rel} has no hardcoded color literals`, () => {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
      expect(offendingLines(src)).toEqual([]);
    });
  }
});
```
- [ ] **Step 2: Run it, expect FAIL** with many offending lines:
```
npm test -- spacesTokenDiscipline
```
Expected: multiple files report non-empty offending-line arrays (~68 sites).
- [ ] **Step 3: Commit the failing guard** (red baseline):
```bash
git add src/test/spacesTokenDiscipline.test.ts
git commit -m "test(spaces): guard against hardcoded color literals (red)"
```

### Task 1.2: Define the curated per-space swatch palette

**Files:**
- Modify: `src/styles/spaces-classic.css` (add swatch tokens)
- Create: `src/app/components/chat/spaceSwatches.ts`

- [ ] **Step 1: Add swatch tokens** to `spaces-classic.css` — a small curated set of muted, desaturated, V2-stage-correct tones + ember, with light/dark variants. (Exact values tuned against the dark stage at this step; example shape:)
```css
.zaki-spaces-classic {
  --zaki-space-swatch-ember: var(--v2-accent);
  --zaki-space-swatch-slate: #5b6670;   /* muted, low-chroma; final values tuned in preview */
  --zaki-space-swatch-moss:  #5e6b55;
  --zaki-space-swatch-clay:  #7a5d50;
  --zaki-space-swatch-indigo:#56607e;
  --zaki-space-swatch-plum:  #6d5a6b;
  --zaki-space-swatch-sand:  #7d7561;
  --zaki-space-swatch-default: var(--v2-ink-3);
}
.dark .zaki-spaces-classic {
  /* dark-stage variants (slightly lifted for legibility on #0A0908) */
}
```
- [ ] **Step 2: Export var-name references** (no literals) for TS consumers:
```ts
// src/app/components/chat/spaceSwatches.ts
export const SPACE_SWATCHES = [
  "var(--zaki-space-swatch-ember)",
  "var(--zaki-space-swatch-slate)",
  "var(--zaki-space-swatch-moss)",
  "var(--zaki-space-swatch-clay)",
  "var(--zaki-space-swatch-indigo)",
  "var(--zaki-space-swatch-plum)",
  "var(--zaki-space-swatch-sand)",
] as const;
export const DEFAULT_SPACE_SWATCH = "var(--zaki-space-swatch-default)";
```
- [ ] **Step 3: Typecheck** (`npm run typecheck`, pass). Preview the swatch tokens against the dark stage; tune values until they read as a coherent muted family (not rainbow), screenshot.
- [ ] **Step 4: Commit**
```bash
git add src/styles/spaces-classic.css src/app/components/chat/spaceSwatches.ts
git commit -m "feat(spaces): curated V2-harmonized per-space swatch palette"
```

### Task 1.3: Replace pickers' rainbow with the swatch set

**Files:** Modify `SpaceDetailView.tsx` (colorOptions `:35`, fallback `:123`), `sidebar/SpaceSettingsSheet.tsx` (swatch pills), `Sidebar.tsx` (identity dot fallbacks `:1864`,`:2035`).

- [ ] **Step 1:** Replace the hardcoded `colorOptions = ["#E24A3B", …]` array with `SPACE_SWATCHES`; render swatches via `style={{ backgroundColor: swatch }}` (swatch = a `var(--…)`). Replace `?? "#88735A"` fallbacks with `?? DEFAULT_SPACE_SWATCH`.
- [ ] **Step 2:** Do the same in `SpaceSettingsSheet.tsx` and the sidebar identity dots.
- [ ] **Step 3: Typecheck** + preview: open a space's color picker; confirm the muted family renders and selecting one persists (existing `zaki:update-space` wiring). Screenshot light/dark.
- [ ] **Step 4: Commit** `git commit -am "refactor(spaces): pickers use curated swatch tokens, not rainbow"`

### Task 1.4: Replace remaining hardcoded colors → V2 tokens (per file group)

Work file-by-file using the spec's line-referenced inventory (spec §6 Axis 1). For each: map each literal to the closest existing `--v2-*`/`zaki-*` token (spec §5 table), preserving the visual intent (surface→raised/sunken, border→hairline, accent→ember, status→semantic only where real). **Do not** change radii on message bubbles. Run the guard test per group to watch it go green file-by-file.

- [ ] **Step 1: Views group** — `SpacesView.tsx`, `ZakiHomeView.tsx`, `EmptyState.tsx`, `ReadyState.tsx`. Templates lose category colors → neutral cards + ember "featured". Run `npm test -- spacesTokenDiscipline` → these files now pass. Preview `/spaces` + spaces home, light/dark. Commit.
- [ ] **Step 2: Modals group** — `CreateSpaceModal.tsx`, `EditInstructionsModal.tsx`. Warm gradients/browns → V2 raised/hairline/ink. Run guard; preview create-space + edit-instructions; commit.
- [ ] **Step 3: Shared blocks group** — `InlineTextRenderer.tsx`, `BlockRenderer.tsx`, `QuoteBlock.tsx`, `TableBlock.tsx`, `CodeBlock.tsx`, `DownloadButtonBlock.tsx`, `QuickReplyChips.tsx`. Map inline-code/quote/table/callout surfaces → tokens. **Verify on BOTH Spaces and Agent** (these render in both) light/dark — Agent must not regress. Run guard; commit.
- [ ] **Step 4: Sidebar group** — `Sidebar.tsx`, `SpaceSettingsSheet.tsx`, `ProfileMenu.tsx`, `ZakiSessionList.tsx`, `DeleteConfirmModal.tsx`. Warm→teal profile gradient (`:2310-2312`) → ember/neutral; warm pills/shadows/`dark:bg-[#…]` menu hexes → tokens; tame `rounded-full` chrome toward V2 low-radius where it's product chrome (keep avatar circles). Run guard; preview sidebar (spaces + zaki modes), profile menu, settings sheet; commit.
- [ ] **Step 5: Full guard green.** `npm test -- spacesTokenDiscipline` → all files pass. `npm run typecheck` pass. `npm test` (full) green. Commit if anything pending.

### Task 1.5: Retune the background pattern (clearer + contrasted, V2 neutral)

**Files:** Modify `src/styles/spaces-classic.css`.

- [ ] **Step 1:** Override `--zaki-pattern-start/mid/end/glow-1/glow-2` inside `.zaki-spaces-classic` (and `.dark .zaki-spaces-classic`) with cool V2 neutrals derived from inks/surfaces. Per user direction, push contrast UP so the pattern reads clearly (more present than a faint texture) — raise the SVG `g opacity` effect via stronger stop colors and/or glow alpha, stopping short of noise behind text.
- [ ] **Step 2: Preview + tune.** Reload `/spaces` and a thread; screenshot light + dark. Confirm the pattern is visibly clearer than baseline yet text over it stays legible (check a message thread and the landing). Iterate values until it reads right.
- [ ] **Step 3: Verify scope isolation.** Confirm the Agent surface (no `.zaki-spaces-classic`, no `BackgroundPattern`) is unchanged.
- [ ] **Step 4: Commit** `git commit -am "feat(spaces): retune background pattern to clearer V2-neutral contrast"`

**Slice 1 checkpoint:** guard green (0 hardcoded colors), ember-only accent, swatch family, retuned clearer pattern, bubbles/landing preserved, Agent un-regressed, full tests green. → Review (desktop+mobile, light+dark).

---

# SLICE 2 — Accessibility & Motion
*(Concrete task outlines; elaborated to bite-sized TDD steps at slice start. RTL tests assert attributes/behavior; visual focus states verified in preview + keyboard-only pass.)*

- **2.1 focus-visible everywhere** — add focus-visible ring (token) to space cards (`SpacesView.tsx:305+`), thread rows (`SpaceDetailView.tsx:287+`, `Sidebar.tsx` thread rows), action buttons. *Test:* RTL — element is focusable (`tabIndex`/native) and gets the ring class on focus.
- **2.2 keyboard path for hover-only actions** — space-card settings/delete (`SpacesView.tsx:321-355`) and sidebar row menus reveal on `focus-within`, not only `group-hover`; ensure Enter/Space activate. *Test:* RTL — buttons reachable by keyboard, fire handlers.
- **2.3 44px touch targets** — `MessageActions` (size-7→≥44px hit area via padding/min-size), small sidebar icon buttons. *Test:* RTL/style assertion on min size class.
- **2.4 aria-live + labels** — `aria-live="polite"` on the streaming message region (`ChatView`/`StreamingMessage`); `aria-label` on icon-only buttons and color-only file-status (`SpaceDetailView` status chips); space cards `role=button` get accessible names. *Test:* RTL — `getByRole`/`getByLabelText` resolve.
- **2.5 i18n modal strings** — `EditInstructionsModal` "Edit instructions"/"Cancel"/"Save" → `t(...)` keys (add to en + ar locale files). *Test:* RTL — renders translated keys; locale files contain keys (en+ar).
- **2.6 focus trap + return** — icon/color picker dropdown (`SpaceDetailView:126-165`) and sheets trap focus and restore to the trigger on close (reuse `useFocusTrap` from `src/hooks`). *Test:* RTL — focus stays within while open, returns to trigger on close.
- **2.7 contrast** — bump contrast-risk muted grays to pass AA against their surfaces (use `--v2-ink-2/3` per stage). *Verify:* axe/contrast check in preview.
- **2.8 prefers-reduced-motion** — wrap Spaces animations (message enter, any transition) so `@media (prefers-reduced-motion: reduce)` disables transform/opacity motion. Add to `spaces-classic.css`/`index.css`. *Verify:* emulate reduced-motion in preview; motion suppressed.

**Slice 2 checkpoint:** keyboard-only nav works end-to-end; axe clean; reduced-motion honored; tests green. → Review.

---

# SLICE 3 — Mobile Hardening
*(Outlines; elaborate at slice start. Verify with `preview_resize` at 360–390w, light+dark.)*

- **3.1 touch-reachable actions** — confirm 2.2 reveal-on-focus also yields a touch path (actions not gated behind hover); add always-visible affordance on touch where needed.
- **3.2 sheets over cramped modals** — confirm `CreateSpaceModal`/`SpaceSettingsSheet` present as bottom sheets on mobile (they already use `items-start`/sheet-ish patterns — verify, fix if cramped).
- **3.3 no clip/overflow** — audit `/spaces`, space detail, thread, composer at 360w; fix any `max-w`/fixed-px overflow; ensure composer keeps memory/limit state visible (DESIGN.md: composer must not hide memory state).
- **3.4 sidebar↔drawer parity** — `MobileSidebar` drawer exposes the same canonical nav (search/create/switch/threads) as the desktop `Sidebar`; verify and align visuals to Slice-1 tokens.

**Slice 3 checkpoint:** no clip/overflow at mobile widths; drawer parity; light+dark. → Review.

---

# SLICE 4 — Designed States + Wiring Integrity
*(Outlines; elaborate at slice start with TDD. Limit-state is a notice that points to the Dashboard — NEVER a meter widget.)*

- **4.1 SpacesView states** — empty (zero spaces CTA), error (load failure + retry), permission/auth-gate, limit-notice, degraded/offline. Likely small components under `views/states/`. *Test:* RTL renders each state from props.
- **4.2 SpaceDetailView states** — initial-load skeleton, limit-notice, degraded/offline (reuse skeleton primitives already in the repo). *Test:* RTL.
- **4.3 ChatView states** — limit-notice (app_chat blocked → "limit reached, see Dashboard / upgrade", no meter), permission, disabled/readOnly composer. Wire to existing send-lock signal without introducing metering logic. *Test:* RTL — blocked state renders notice + locks composer.
- **4.4 CreateSpaceModal error state** — surface validation/submission errors inline (not just toast). *Test:* RTL — error message shows on failed submit.
- **4.5 Wiring integrity** — from Slice-0 findings: (a) thread-pin → persist if cheap, else make honest; (b) ensure no visible control is a dead no-op; (c) keep unbuilt features (members/sharing/archive/duplicate/bulk) hidden; (d) confirm legacy "Private" badge is not rendered (remove if dead). *Test:* RTL/grep guard as appropriate.

**Slice 4 checkpoint:** every designed state renders; no dead buttons; limit-notice never duplicates a meter; tests green. → Review.

---

# SLICE 5 — Review Ritual + Ship

- **5.1 Full Review Ritual** (DESIGN.md §Review Ritual) across the spoke: desktop visual, mobile visual, keyboard nav, light/dark, accessibility, product-truth (no fake workflows), meter/memory truth (meter in Dashboard; memory visible). Capture a before/after proof gallery.
- **5.2 Green gates** — `npm run typecheck`, `npm test`, and the relevant Playwright e2e (`npm run test:e2e` for spaces flows if present) pass.
- **5.3 Ship prep** — invoke `superpowers:finishing-a-development-branch` to choose merge/PR; summarize the change.

---

## Slice 0 findings (resolved 2026-06-09)

- **SpaceDetailView is DEAD code.** `ChatArea.tsx:2830` hardcodes `const showSpaceDetail = false;`, so the main-content space-detail view never renders; all render gates referencing it are permanently off. Space management is handled by the sidebar (`SpaceSettingsSheet`) — which aligns with the canonical-sidebar / no-duplicated-nav decision. **Scope adjustment:** `SpaceDetailView.tsx` gets **token cleanup only** (Slice 1, hygiene + swatch consistency) and stays in the guard list; its **a11y/mobile/state work (Slices 2–4) is SKIPPED**. The live space-management surface for a11y/visual work is `sidebar/SpaceSettingsSheet.tsx` (already in scope).
- **Thread pinning is LOCAL-ONLY.** `Sidebar.tsx:751-761` `togglePinned` mutates local state with no API call; no `/pin` endpoint exists. Slice 4.5(a): make honest — prefer client-side persistence (localStorage) so pins survive reload without assuming backend support; verify the thread `/update` PATCH can't take `pinned` first.
- **Baseline captured** (inline): dark desktop SpacesView (list+templates+explainer), light desktop ReadyState+composer (pattern very visible/warm), dark mobile SpacesView (responsive single-column, pattern faint). No console errors; `/spaces` is anonymous-reachable.
- **Extra observations for Slice 4:** composer shows an "Upgrade!" affordance and a "Share" button — review against meter-in-Dashboard + wiring honesty (Share reportedly only copies URL).

## Self-Review (against spec)

- **Spec coverage:** §6 Axis 1 → Slice 1 (guard + Tasks 1.2-1.5). Axis 2 → Slice 2. Axis 3 → Slice 3. Axis 4 states → Slice 4.1-4.4; wiring → 4.5. Pattern retune (clearer) → 1.5. Swatch decision → 1.2-1.3. Scope mechanism → 0.3. Meter-in-Dashboard → honored in 4.3 (notice only). Fonts unchanged (no task touches fonts). Agent no-regress → 1.4 Step 3, 1.5 Step 3. Open questions → 0.2.
- **Placeholders:** Slices 2-5 are deliberately task-outlines (progressive elaboration: they depend on Slice 0 baseline + chosen swatch/pattern values). They name exact files, the test to write, and the change — they are not vague "add error handling". Each elaborates to bite-sized TDD steps at slice start.
- **Type consistency:** `SPACE_SWATCHES`/`DEFAULT_SPACE_SWATCH` defined in 1.2, consumed in 1.3. Guard `FILES` list matches the modified-files set. `.zaki-spaces-classic` class created in 0.3, overridden in 1.2/1.5.
