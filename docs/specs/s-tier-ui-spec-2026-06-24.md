# ZAKI — S-Tier UI Spec (smoothness · soft actions · coherence)

**Date:** 2026-06-24
**Status:** Spec — no code yet. Hand to an implementer (me or you).
**Scope:** The product app (`src/`). Marketing site touched only in §7.
**Grounding:** Token values, primitives, and file refs below are verified against the live tree (`theme.css`, `v2.css`, `tokens.css`, `routes.tsx`, `V2Button.tsx`, `skeleton.tsx`).

---

## 0. What "S-tier" means for ZAKI

ZAKI is a dense, mono-forward control plane — a *precision instrument*, not a consumer toy. So S-tier here is **restraint, not flourish**:

- **Motion confirms causality.** Every animation answers "what just happened / where did it go." No decorative motion.
- **Coherence over novelty.** One token system, one motion grammar, one button. The premium feeling comes from *nothing being slightly off*, not from new effects.
- **Soft, not slow.** Soft actions = every interactive element acknowledges press/hover/focus within ~120ms with a small, consistent gesture. Never a dead click.
- **Honest under failure.** A confident-looking wrong state (e.g. "0% used" when the meter failed) is worse than an honest "—". S-tier degrades gracefully.

The work below is almost entirely **token + CSS + small wiring**, because the components are already good. This is a finishing pass, not a redesign.

---

## 1. Coherence layer — the split-brain token fix (highest ROI, do first)

### The problem
Two token systems coexist. The hand-built **V2 surfaces (Agent, Brain)** read `v2.css` and are correct. But the **shadcn `ui/` primitives** (button, card, dialog, badge, input, switch — consumed by 22+ files incl. Pricing, Billing, Admin, Settings) resolve their classes (`rounded-md`, `bg-destructive`, `ring`) through `theme.css`'s `@theme inline`, which is **still V1**:

| Token (`theme.css`) | V1 value now | Reads as |
|---|---|---|
| `--radius` | `0.75rem` (12px) → sm 8 / md 10 / lg 12 / xl 16 | soft, rounded — violates "low radius" |
| `--destructive` | `#f10202` | neon pure-red, clashes with ember |
| `--ring` | `#88735A` | brown focus ring, not brand |
| `--chart-1` | `#f10202` | neon red in charts |

Meanwhile `v2.css` already exposes the correct values **and already aliases the `--zaki-*` layer to them** (`--zaki-radius-md: var(--v2-r-2)` = 4px, `--zaki-error: var(--v2-danger)`). The shadcn layer is the only thing still pointed at V1.

### The fix — one file, ~10 lines, zero component edits
Re-point the four V1 tokens in `src/styles/theme.css` `:root` (and `.dark`) at the V2 ladder:

```
--radius: 0.25rem;          /* 4px → derived sm 0 / md 2 / lg 4 / xl 8 — matches v2-r-0..3 */
--destructive: #d24430;     /* = var(--v2-danger); ember IS the danger color in V2 */
--ring: #d24430;            /* = var(--v2-accent); brand focus ring */
--chart-1: #d24430;         /* ember, not neon */
```

Notes:
- `radius-sm → 0` is **intentional**: small chips/badges go sharp-cornered, which is on-contract (dense, hairline). If any input looks too sharp, bump `--radius` to `0.375rem` (6px → sm 2 / md 4 / lg 6 / xl 10) — still V2-legal.
- Keep `--primary: #1F1A14` (near-black) — it's correct for V2's ink-forward buttons.
- **Do not** delete `theme.css`. shadcn needs it; we're correcting values, not removing the bridge.

### Verification (the only reason this isn't a blind commit)
It restyles money surfaces. After the change, screenshot at **1440×1000 and 390×844**: `/pricing`, `/` (dashboard), `/agent` (chat), `/settings`, `/pricing/success`. Eyeball radius + red. Adjust `--radius` once if needed. ~2 minutes of looking. (No functional risk — pure presentational tokens.)

---

## 2. Motion system — consolidate to two curves + a duration scale

### The problem
Three easing curves are loose in the tree, plus generic `ease` on the shared tokens:
- `cubic-bezier(0.2, 0.8, 0.2, 1)` — `--v2-ease-out` (the good standard curve)
- `cubic-bezier(0.34, 1.4, 0.64, 1)` — message-entrance overshoot
- `cubic-bezier(0.16, 1, 0.3, 1)` — a one-off in v2.css:5827
- `--zaki-transition-fast/base/slow: …ms ease` (tokens.css:224-227) — generic, the "two-tier feel" the audit flagged

### The fix — name two curves, route everything through them
In `src/styles/tokens.css` (near :224):

```
--zaki-ease-standard:   cubic-bezier(0.2, 0.8, 0.2, 1);   /* adopt the existing v2-ease-out */
--zaki-ease-emphasized: cubic-bezier(0.34, 1.4, 0.64, 1); /* the overshoot — entrances, success */

--zaki-dur-fast: 120ms;   /* press, hover, focus — "soft action" tier */
--zaki-dur-base: 180ms;   /* state changes, toggles, color */
--zaki-dur-slow: 240ms;   /* drawers, expanding panels */
--zaki-dur-page: 320ms;   /* route / view transitions */

--zaki-transition-fast: var(--zaki-dur-fast) var(--zaki-ease-standard);
--zaki-transition-base: var(--zaki-dur-base) var(--zaki-ease-standard);
--zaki-transition-slow: var(--zaki-dur-slow) var(--zaki-ease-standard);
--zaki-transition-sidebar: var(--zaki-dur-slow) var(--zaki-ease-standard);
```

Every existing consumer of the transition tokens inherits the signature curve with **zero component edits**. Retire the `0.16,1,0.3,1` one-off opportunistically (map to `--zaki-ease-standard`).

### Rule of thumb
- **Movement / appearance** (something enters, succeeds, lands) → `emphasized`.
- **Everything else** (hover, color, border, toggle) → `standard`.

### Reduced motion — preserve, don't touch
The codebase already has a thorough `prefers-reduced-motion` story (global kill-switch + targeted overrides + JS `matchMedia` in heavy surfaces). **All new motion must live under that umbrella** — use the transition tokens (already gated) rather than inline `transition:` so the kill-switch keeps covering them.

---

## 3. Soft-action vocabulary — the interaction grammar

Define one gesture per interaction state, applied consistently. Most already exist on `.v2-btn` (`:active` + `--v2-elev-press`); this codifies and spreads them.

| State | Gesture | Technique | Token |
|---|---|---|---|
| **Hover** (button/row/card) | bg/border lifts one step | `background`/`border-color` shift | `--zaki-transition-fast` |
| **Press** | scale `0.97` + inset press shadow | `transform: scale(.97)` on `:active` | `--zaki-dur-fast` + `--v2-elev-press` (exists) |
| **Focus-visible** | ember ring, no layout shift | `outline: 2px solid var(--v2-accent); outline-offset: 1px` | — |
| **Active / selected nav** | sliding indicator (see §4.5) | single positioned element, `transform` | `--zaki-transition-base` |
| **Disabled** | 50% opacity, no gesture | `opacity:.5; pointer-events:none` | — |
| **Loading** | label → inline spinner, width held | swap content, fixed min-width | `--zaki-dur-base` |
| **Success confirm** | brief ember→success tick | one-shot class, `emphasized` curve | `--v2-success` |

**Spread plan:** these belong on `.v2-btn`, `.zaki-btn` (after §6 convergence), nav rail items, sidebar rows, and table action buttons. Implement as 1–2 shared utility classes (`.soft-press`, `.soft-focus`) in `index.css`, applied where missing — not per-component CSS.

---

## 4. Perceived-performance — kill the specific jank moments

### 4.1 Route fallback: blank screen → skeleton (high impact, S)
`routes.tsx:10` `RouteFallback` renders `<div className="min-h-screen bg-zaki-bg" />` — a **blank flash** on every navigation to ChatArea / Settings / Pricing (Brain already does it right with `SkeletonBrainPage`).

Fix: give the heavy routes a matching skeleton fallback.
- **ChatArea** (`/`, `/agent`, `/spaces*`): compose existing `SkeletonThreadList` + `SkeletonMessage` ×3 into a `SkeletonChatShell` (new, ~20 lines, reuses shipped pieces).
- **Settings**: a left-nav + form-rows shimmer (`Skeleton` blocks).
- **Pricing**: 4 plan-card shimmers (`SkeletonSpaceCard`-style).
- Wrap the loaded content in an `opacity 0→1` over `--zaki-dur-page` so skeleton→content is a cross-fade, not a pop.

### 4.2 Optimistic mutations with rollback (high impact, M)
Rename/delete (Sidebar.tsx:1514, ChatArea.tsx:4193/4254/5018) currently set query data imperatively in the handler → **visible snap-back on error** + correctness risk. Move to the standard TanStack shape in `src/queries/*` (useSpaces/useThreads):

```
onMutate: cancelQueries → snapshot = getQueryData → setQueryData(optimistic)
onError:  setQueryData(snapshot)            // clean rollback
onSettled: invalidateQueries               // reconcile with server
```

~10 lines per mutation, existing dependency, removes both the flicker and the data-risk.

### 4.3 Inline "Try again" on failed messages (high impact, M)
On a failed assistant turn (`chat/MessageBubble.tsx` error branch), render a **Try again** button that re-invokes the existing `handleSend` with the prior user prompt (already in thread state). Single most common recoverable failure on a streaming product; today it dead-ends.

### 4.4 Honest meter-failure state (high impact, S)
`chat/views/ZakiDashboard.tsx` + `queries/useBilling.ts`: when `useMeterStatus`/`useAnonymousMeterStatus` `isError`, today it renders a confident **0% / "full room"** bar — the worst direction (user hits paywall mid-task or over-trusts headroom). Destructure `isError`, pass a `stale/unknown` flag to `CreditMeter`, render `—` / "Usage unavailable" (reuse `settingsModal.usage.unavailable`).

### 4.5 Sliding nav indicator (low impact, S)
Product-rail active marker (`v2.css:1834-1846`) **teleports**. Render one absolutely-positioned indicator whose `transform` tracks the active item with `transition: transform var(--zaki-transition-base)`. CSS-only, no JS. High-frequency, keyboard-bound interaction — worth the polish.

### 4.6 (Optional) native view-transition cross-fade
Wrap `navigate()` in `document.startViewTransition` where supported for a free page cross-fade. **Defer** unless §4.1 alone doesn't feel smooth — it's a nice-to-have, and skeletons fix the actual problem. (ponytail: don't add it speculatively.)

---

## 5. Accessibility — part of S-tier, not a separate track

| Fix | Surface | Technique | Effort |
|---|---|---|---|
| Destructive dialog has no focus-trap/Escape/label | `ui/zaki/TypeToConfirmDialog.tsx` | Wrap body in existing `ModalShell` (`role="alertdialog"`, uses `useFocusTrap`) + `htmlFor` on the input. Both primitives already exist. | S |
| Accent-as-small-text fails 4.5:1 (~90 rules) | `v2.css` | Add `--v2-accent-text: #c23a25` (~4.6:1) used **only** where accent is small text; leave fills/borders bright `#d24430`. | M |
| ink-4 (2.6:1) used for info text (~30 rules) | `v2.css` | Promote informational meta/caption from ink-4 → ink-3 (`#6b6660`, 5.05:1); keep ink-4 for disabled/decorative only. | M |
| Zero automated a11y coverage | `e2e/` | Add `@axe-core/playwright`, assert no critical violations on `/`, `/agent`, `/brain`, `/settings`, `/pricing`. Locks the above in. | S |

---

## 6. Button convergence — one system, via CSS

Three button languages coexist: `.v2-btn` (correct), legacy `.zaki-btn` pill (red gradient + glow), and shadcn `<Button>` (fixed by §1). V2Button already has the full variant set (`default | primary | accent | ghost | danger`).

**Lazy-correct:** redefine `.zaki-btn` / `.zaki-btn-primary` in `index.css` to match `.v2-btn` (2px radius, ember, no glow shadow) so the ~8 legacy consumers (PricingPage, BillingSuccessPage, AdminAccessCodesPage…) **visually converge with zero code edits**. Migrate call sites to `<V2Button>` opportunistically. **Do not add a 4th system.**

Also de-V1 the live shell chrome (`index.css`): `.zaki-main-panel` 28px → 8px, `.zaki-input-form` 24px → 8px, drop the glassmorphic blur + red/teal radial on `.zaki-modal-backdrop` for a flat `var(--v2-bg-overlay)`, remove the cream gradient on `.zaki-modal-panel`. CSS-only, high-visibility (primary Chat surface).

---

## 7. Hero-surface sequencing (depth-first, not breadth-first)

Land each surface to "done" before spreading. Order by where users live:

1. **Chat (`/`, `/agent`)** — §1 tokens, §4.1 ChatArea skeleton, §4.3 inline retry, §4.4 meter state, §6 shell chrome, §3 soft-press on composer/rows. *This is the flagship.*
2. **Dashboard** — §4.4 meter honesty, §3 soft actions on product cards, §4.5 sliding rail.
3. **Settings** — §1 tokens land here automatically; §4.1 skeleton; §5 destructive dialog.
4. **Pricing + Billing-success** — §1 tokens (verify conversion surface), §6 button convergence.
5. **Secondary** (Learn/admin/Help) — §6 convergence, §5 `window.confirm` → `InlineConfirm`.
6. **Marketing** (separate app) — only the cheap wins: skip-link for scroll-jacked scenes, `getComputedStyle(el).display==='none'` guard in `zaki-home.js` `buildThread`/`buildChapRail` (kills per-frame reflow), fix `BrainComposeModal.tsx:3` import `framer-motion`→`motion/react`. GSAP/Lenis weight is a separate decision.

---

## 8. Definition of "S-tier done" (per-surface acceptance)

A surface is done when:
- [ ] No blank-flash on entry (skeleton + cross-fade).
- [ ] Every interactive element has hover + press + focus-visible feedback (≤120ms).
- [ ] No raw V1 radius (>8px) or neon `#f10202` visible.
- [ ] Destructive + mutating actions are optimistic with rollback, or clearly pending.
- [ ] Every failure path shows an honest, recoverable state (retry / "unavailable") — never a confident-wrong UI.
- [ ] `prefers-reduced-motion` neutralizes all motion on the surface.
- [ ] axe: zero critical violations.

---

## 9. What we are deliberately NOT doing (ponytail)

- **No new motion/animation library.** `motion` 12.x + CSS is enough; the base is already mature.
- **No MUI removal in this pass.** It tree-shakes out (zero runtime cost) — it's hygiene, not polish. Track separately.
- **No global redesign / new components.** Every item reuses an existing token, primitive, or pattern.
- **No view-transitions** unless §4.1 proves insufficient.
- **No design-system abstraction layer.** The tokens *are* the system; correct their values, don't wrap them.

---

## Effort roll-up

| Bucket | Items | Effort |
|---|---|---|
| Coherence (§1, §2, §6) | tokens, curves, button convergence, shell chrome | S + S + M = **~1 day** |
| Smoothness (§4) | route skeletons, optimistic rollback, inline retry, meter state, sliding rail | **~1.5 days** |
| A11y (§5) | dialog trap, contrast tokens, axe | **~1 day** |
| **Total to A-tier on hero surfaces** | | **~3–4 focused days** |

Highest single ROI: **§1 (one file)**. Do it first; half the "incoherence" complaint evaporates before anything else ships.
