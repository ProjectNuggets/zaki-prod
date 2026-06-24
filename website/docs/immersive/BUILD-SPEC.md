# ZAKI Immersive Homepage — BUILD SPEC

**"Enter ZAKI's mind."**

Single, ordered, implementable build spec for rebuilding the ZAKI marketing homepage (`HomeV4.tsx`) as an immersive, scroll-choreographed WebGL experience — without breaking the existing vanilla animation layer, SSR/prerender pipeline, or the app-handoff contract.

- **Target page:** `/Users/nova/Desktop/zaki-prod/website/src/pages/HomeV4.tsx` (live English `/`)
- **Loader hook:** `/Users/nova/Desktop/zaki-prod/website/src/hooks/useZakiPage.ts`
- **Existing animation layer (DO NOT rewrite):** `/Users/nova/Desktop/zaki-prod/website/public/zaki/scripts/{zaki-home,zaki-chapters,zaki-constellation}.js`
- **New animation layer:** `public/zaki/scripts/zaki-mind.js` + `public/zaki/styles/zaki-mind.css` + `public/zaki/vendor/{lenis,ogl,gsap,ScrollTrigger}*.js`
- **Staging verification host:** `https://staging.chatzaki.com` (the marketing site; app handoff target on staging is `https://app-staging.chatzaki.ai`)
- **Branch in flight:** `staging` (see git context). Build through the existing `public/ → dist/ → nginx` static pipeline; image is `linux/amd64`.

---

## 0. Architectural ground rules (read before any stage)

These are invariants. Every stage below respects them.

### 0.1 The two-layer model is sacred
1. **React/Vite app** (`src/**`) — bundled, hydrated, runs in `renderToString` at prerender.
2. **Vanilla "zaki" layer** (`public/zaki/**`) — IIFE scripts + CSS injected at runtime via `useZakiPage`'s `useEffect`. **Never runs in `renderToString`.**

All new WebGL/scroll code goes in layer 2. **Never** `import 'ogl'`/`import 'lenis'` under `src/` or in `entry-server.tsx` — `ssr.noExternal: true` would bundle it into the SSR path (no `window`/WebGL in Node) and crash `npm run build` at `validate-prerender.mjs`. Vendoring as UMD globals under `public/zaki/vendor/` keeps GL strictly client-only for free.

### 0.2 Ownership boundaries — what `zaki-mind.js` may touch
`zaki-mind.js` **owns**: the OGL canvas, the Lenis instance, all its own `ScrollTrigger`s, and the single shared rAF loop driving Lenis + GL render.

`zaki-mind.js` **must only READ, never WRITE** (these are driven every frame by `zaki-home.js`/`zaki-chapters.js`):
- Thread SVG: `#thread-fg`/`#thread-halo` `d`+`strokeDashoffset`, `#thread-comet`, `#thread-tail`, `#thread-grad`, `#thread-forks`/`#thread-ticks`/`#thread-nodes`/`#thread-ripples`
- `#hero-glow` inline `background` (cursor-driven), `.btn-primary.btn-lg` inline `transform` (magnetic)
- `#hero-h1` inner structure (`splitHeadline` rewrites it), `.reveal` `.in` + `transitionDelay`
- `body[data-stage]`, `#scroll-progress` transform, `#nav.solid`, `html.is-ready`/`html.no-anim`

### 0.3 One clock
Lenis, GSAP ScrollTrigger, and the OGL render must share ONE rAF via the GSAP ticker. No library runs its own loop.
```js
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
// OGL render is also called from this ticker — not its own requestAnimationFrame
```
Because Lenis dispatches native `scroll` events, the existing `zaki-home.js` Thread/rail/`body[data-stage]`/`#scroll-progress` logic keeps working unchanged.

### 0.4 The single safety net (the one rule that makes this shippable)
The page must be **fully functional, legible, and on-brand with the WebGL layer entirely absent.** Three independent kill switches, each tested every stage:
- `prefers-reduced-motion: reduce` → no Lenis, no rAF, no flight; render one static frame (or skip WebGL, let the 2D `zaki-constellation.js` run on `.resolve-con`).
- **No WebGL** (`getContext` fails) → `html.no-webgl`, field hidden via CSS, 2D constellation runs as today.
- `html.no-anim` (frozen-frame failsafe set by `zaki-home.js`) → `#mind-field{display:none}`, mind loop stops.

If any of these fires, the existing DOM/CSS site (copy, layout, nav, footer, handoffs) stands on its own. The WebGL field is a **backdrop, never load-bearing.**

### 0.5 GSAP wiring decision
GSAP 3.13 is already an npm dependency, but the vanilla layer can't import it. **Decision: vendor `gsap.min.js` + `ScrollTrigger.min.js` into `public/zaki/vendor/`** exposing `window.gsap`. This keeps the whole motion system in one loading model and avoids coupling the vanilla layer to React bundle timing. (Alternative — `window.gsap = gsap` in `main.tsx` after hydration — is rejected for consistency.)

### 0.6 Vendor load order (set once in the hook)
```
CSS:  zaki-foundation.css, zaki-home.css, zaki-chapters.css, zaki-mind.css(NEW)
JS:   /zaki/vendor/gsap.min.js            (window.gsap)
      /zaki/vendor/ScrollTrigger.min.js
      /zaki/vendor/lenis.umd.js           (window.Lenis)
      /zaki/vendor/ogl.umd.js             (window.ogl)
      /zaki/scripts/zaki-home.js          (UNCHANGED)
      /zaki/scripts/zaki-chapters.js      (UNCHANGED)
      /zaki/scripts/zaki-mind.js          (NEW)
      /zaki/scripts/zaki-constellation.js (UNCHANGED — now conditional fallback)
```
Vendor scripts are plain `<script src>` (no `defer`/`async`), so append order = execution order. They must finish before `zaki-mind.js` runs.

---

## STAGE 1 — Foundation: Lenis + GSAP/ScrollTrigger + scroll-linked reveals + grain bug

**Goal:** Replace native scroll with Lenis smooth-scroll, wire GSAP ScrollTrigger to it, convert the discrete `IntersectionObserver` reveals into scroll-linked motion (without breaking the existing reveal system), and fix the confirmed `.grain` horizontal-overflow bug. **No WebGL yet.** At the end of Stage 1 the site looks identical but scrolls like an award site, and the foundation for Stages 2–3 is in place.

### 1.1 Files to create
- `/Users/nova/Desktop/zaki-prod/website/public/zaki/vendor/gsap.min.js` (pinned 3.13.x UMD, exposes `window.gsap`)
- `/Users/nova/Desktop/zaki-prod/website/public/zaki/vendor/ScrollTrigger.min.js` (pinned 3.13.x UMD)
- `/Users/nova/Desktop/zaki-prod/website/public/zaki/vendor/lenis.umd.js` (pinned Lenis UMD, exposes `window.Lenis`)
- `/Users/nova/Desktop/zaki-prod/website/public/zaki/scripts/zaki-mind.js` (the new IIFE — Stage 1 ships only its Lenis + ScrollTrigger + reveal-upgrade portion; GL is added in Stage 2)
- `/Users/nova/Desktop/zaki-prod/website/public/zaki/styles/zaki-mind.css` (Stage 1 ships the `#mind-field` host rule stub + the grain fix override + reveal tuning; GL visuals added Stage 2)

### 1.2 Files to edit
- `/Users/nova/Desktop/zaki-prod/website/src/hooks/useZakiPage.ts`
- `/Users/nova/Desktop/zaki-prod/website/public/zaki/styles/zaki-home.css` (grain fix — see 1.6)

### 1.3 Dependency-loading decision
**Vendored vanilla, not npm.** Per §0.1/§0.5. Drop the four UMD files in `public/zaki/vendor/`, commit them (`public/` is not gitignored; ships in the Docker image). Zero `vite.config.js` changes.

### 1.4 Hook changes (`useZakiPage.ts`)
Add the vendor list and the new CSS, and add teardown for the mind layer.

```ts
const VENDOR_SCRIPTS = [
  "/zaki/vendor/gsap.min.js",
  "/zaki/vendor/ScrollTrigger.min.js",
  "/zaki/vendor/lenis.umd.js",
  "/zaki/vendor/ogl.umd.js",          // harmless in Stage 1; consumed from Stage 2
];

const HOME_SCRIPTS = [
  "/zaki/scripts/zaki-home.js",
  "/zaki/scripts/zaki-chapters.js",
  "/zaki/scripts/zaki-mind.js",        // NEW — after home+chapters, before constellation
  "/zaki/scripts/zaki-constellation.js",
];

const HOME_CSS = [
  "/zaki/styles/zaki-foundation.css",
  "/zaki/styles/zaki-home.css",
  "/zaki/styles/zaki-chapters.css",
  "/zaki/styles/zaki-mind.css",        // NEW — last so it can override safely
];
```

In `useZakiHomePage`, load `[...VENDOR_SCRIPTS, ...HOME_SCRIPTS]`. In `cleanup`, call mind/galaxy teardown **before** removing nodes:
```ts
function cleanup(links, scripts) {
  if (typeof window !== "undefined") {
    (window as any).__zakiMind?.destroy?.();
    (window as any).__zakiGalaxyStop?.();
  }
  links.forEach((l) => l?.remove());
  scripts.forEach((s) => s.remove());
}
```
This is the critical SPA-leak fix: the hook removes script *elements* but not their listeners/observers/rAF/GL contexts. `__zakiMind.destroy()` must cancel its rAF, kill its ScrollTriggers, destroy Lenis, lose the GL context, and disconnect observers.

### 1.5 `zaki-mind.js` — Stage 1 scope (IIFE skeleton)
```js
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.__zakiMindInit) return;            // guard double-init on SPA re-entry
  window.__zakiMindInit = true;

  var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var gsap = window.gsap, ST = window.ScrollTrigger, Lenis = window.Lenis;
  if (!gsap || !ST) { window.__zakiMindInit = false; return; } // fail safe → native site
  gsap.registerPlugin(ST);

  var lenis = null, raf = 0;
  var ro = null;

  // ---- Lenis (skip entirely under reduce) ----
  if (!reduce && Lenis) {
    lenis = new Lenis({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true, syncTouch: false, wheelMultiplier: 1, lerp: 0.1,
    });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  // ---- Scroll-linked reveals (see 1.7) ----
  buildScrollReveals();

  // ---- Menu lock parity: body.menu-open <-> lenis.stop/start ----
  if (lenis) {
    var mo = new MutationObserver(function () {
      if (document.body.classList.contains('menu-open')) lenis.stop(); else lenis.start();
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  // ---- Re-measure the Thread after Lenis changes scroll metrics ----
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { window.ZAKI && window.ZAKI.rebuild && window.ZAKI.rebuild(); });
  });

  // ---- Teardown the hook can call ----
  window.__zakiMind = {
    destroy: function () {
      cancelAnimationFrame(raf);
      ST.getAll().forEach(function (s) { s.kill(); });
      if (lenis) { gsap.ticker.remove(lenis.raf); lenis.destroy(); }
      if (ro) ro.disconnect();
      window.__zakiMindInit = false;
      // GL teardown added in Stage 2
    }
  };
})();
```

### 1.6 The confirmed `.grain` horizontal-overflow bug — fix
**Root cause (verified):** `zaki-home.css:153` declares `.grain{position:fixed;inset:-50%;...}` and the keyframe at `zaki-home.css:156` translates it up to `translate(4%,4%)`. `inset:-50%` makes the element 200%×200% of the viewport positioned at `-50%`, and the positive translate during the animation pushes its right/bottom edges past the viewport. On a fixed element with no clipping ancestor this can produce a phantom horizontal scroll region (and on some engines a transient horizontal scrollbar), which **also corrupts `scrollWidth`/`scrollHeight` measurements** the Thread relies on.

**Fix (preferred, in `zaki-home.css`):** constrain the document and keep grain from overflowing.
```css
/* zaki-home.css — replace the .grain rule block (lines ~152–157) */
.grain{position:fixed;inset:0;z-index:90;pointer-events:none;opacity:.045;mix-blend-mode:overlay;
  background-image:url(/zaki/assets/grain.png); /* keep existing bg-image/size */
  will-change:transform;animation:grain 7s steps(6) infinite;}
@keyframes grain{
  0%{transform:translate(0,0);}20%{transform:translate(-3%,2%);}40%{transform:translate(2%,-3%);}
  60%{transform:translate(-2%,1%);}80%{transform:translate(2%,2%);}100%{transform:translate(0,0);}}
@media (prefers-reduced-motion:reduce){.grain{animation:none;}}
```
Change `inset:-50%` → `inset:0` and add a tiled/repeating background (the translate only needs a few % of slack, not a 50% oversize). If the grain texture must visibly translate without revealing an edge, instead keep a modest oversize but clip globally:
```css
/* belt-and-suspenders global clip — put in zaki-mind.css so it's an additive override */
html, body { overflow-x: clip; }      /* clip (not hidden) preserves position:sticky */
.grain { inset: -8%; }                 /* small bleed, fully covered by the 2% translate */
```
**Decision:** ship `overflow-x: clip` on `html, body` in `zaki-mind.css` AND reduce the grain bleed to `-8%` with capped translate. `clip` is chosen over `hidden` so it never establishes a scroll container that would break the Thread's `scrollHeight` math or `position: sticky`. Verify no element legitimately needs to paint outside the viewport horizontally (the footer wordmark bleeds **down**, not sideways — safe).

### 1.7 Convert discrete reveals → scroll-linked (without breaking the existing system)
**Constraint:** `zaki-home.js` owns `.reveal` `.in` toggling via `IntersectionObserver` + `data-d` stagger, plus a frozen-frame failsafe that force-adds `.in`. Do **not** remove or fight that — it is the reduced-motion/no-anim safety net.

**Approach (additive, non-destructive):** `zaki-mind.js` adds a *parallel* scroll-linked enhancement only when smooth scroll is active (`!reduce` and Lenis present). It does not touch `.in`; it adds a transient transform on a wrapper, scrubbed by ScrollTrigger, that resolves to the element's natural position by the time `.in` is applied. Practically:
- For each `.reveal[data-d]`, create a ScrollTrigger with `scrub:true`, `start:'top 90%'`, `end:'top 60%'`, that tweens a CSS custom property `--reveal-shift` (e.g. `24px → 0`) and `--reveal-fade` (`0 → 1`). Add to `zaki-mind.css`:
  ```css
  html.mind-on .reveal{transform:translateY(var(--reveal-shift,0));opacity:var(--reveal-fade,1);}
  html.mind-on .reveal.in{--reveal-shift:0;--reveal-fade:1;} /* once IO fires, lock to rest */
  ```
  Gate the whole thing behind `html.mind-on` (set by `zaki-mind.js` only when smooth scroll is live). When `mind-on` is absent (reduce/no-webgl/no-anim), the existing `.reveal`/`.reveal.in` CSS in foundation governs exactly as today — **zero regression.**
- **Do not** convert the hero headline split, kicker scramble, presence typing, or agent run — those are choreographed by the existing scripts and are upgraded as *signature moments* in Stage 3, not as generic reveals.

This gives the "rises as you scroll" feel while keeping the IO system as the authoritative end-state setter and the safety net intact.

### 1.8 No markup change required in Stage 1
`HomeV4.tsx` is untouched in Stage 1. (The single `#mind-field` host is added in Stage 2.)

### 1.9 Verify on staging
1. `npm run build` locally — must pass through `validate-prerender.mjs` (no SSR import touches GL/Lenis). Confirm `dist/zaki/vendor/{gsap,ScrollTrigger,lenis}*.js` exist.
2. Deploy to staging (existing `linux/amd64` image build + staging promote flow, mirroring recent `deploy(staging): promote website` commits).
3. On `https://staging.chatzaki.com/`:
   - Scroll feels smooth/eased (Lenis active); mouse wheel and trackpad both smooth, touch uses native momentum.
   - **No horizontal scrollbar at any width** (the grain fix) — check 1440, 1180, 900, 600, 375.
   - The Living Thread still draws and the comet still tracks (proves `window.ZAKI.rebuild()` re-measured against Lenis metrics and we didn't write `#scroll-progress`).
   - Chapter rail still highlights the active chapter; nav goes `.solid` on scroll; `body[data-stage]` still flips dark/light per section.
   - DevTools: emulate `prefers-reduced-motion: reduce` → Lenis disabled, native scroll, reveals instant, no errors. `html.mind-on` absent.
   - Mobile menu open → page scroll locked (Lenis `stop()`), close → restored.
   - Navigate `/` → `/pricing` → `/` and confirm no duplicated smooth-scroll/jank (proves `__zakiMind.destroy()` ran on unmount).

---

## STAGE 2 — WebGL constellation field (OGL)

**Goal:** Stand up the single fixed-position OGL canvas ("ZAKI's mind"), built from the **exact same data model** as the existing 2D constellation (so "ZAKI remembering you" is preserved), with dust + node + edge layers and additive fake-bloom. Camera is static/ambient in Stage 2; scroll choreography lands in Stage 3. The 2D constellation becomes the no-WebGL fallback.

### 2.1 Files to create
- `/Users/nova/Desktop/zaki-prod/website/public/zaki/vendor/ogl.umd.js` (already added in Stage 1 vendor list; ensure present and pinned — exposes `window.ogl`)

### 2.2 Files to edit
- `/Users/nova/Desktop/zaki-prod/website/public/zaki/scripts/zaki-mind.js` (add the GL field)
- `/Users/nova/Desktop/zaki-prod/website/public/zaki/styles/zaki-mind.css` (host + `--con-*` block + fallback hides)
- `/Users/nova/Desktop/zaki-prod/website/src/pages/HomeV4.tsx` (the ONE markup add)
- `/Users/nova/Desktop/zaki-prod/website/public/zaki/scripts/zaki-constellation.js` (extract pure data fns into a shared global; otherwise unchanged behavior)

### 2.3 The one markup add (`HomeV4.tsx`)
Add as the **first child of `<main id="top">`** (or sibling right after `.grain`):
```tsx
<div className="mind-field" id="mind-field" data-mind aria-hidden="true"
     data-quiet data-no-labels />
```
This is the only React change to the homepage in the entire build. It is prerender-safe (static div), and the GL only attaches after hydration.

### 2.4 `zaki-mind.css` — host + theming + fallbacks
```css
.mind-field{position:fixed;inset:0;z-index:0;pointer-events:none;
  opacity:0;transition:opacity 1.2s var(--ease);
  /* themeable palette, echoing zaki-chapters.css .resolve-con */
  --con-line:rgba(244,239,231,.10);
  --con-line-live:rgba(96,226,197,.55);
  --con-core:#60E2C5;
  --con-node:rgba(244,239,231,.5);
  --con-you:#FA2E2E;
  --con-glow:rgba(41,195,154,.16);}
.mind-field.is-live{opacity:1;}
html.no-anim .mind-field, html.no-webgl .mind-field{display:none;}
@media (prefers-reduced-motion:reduce){ .mind-field{ /* one static frame only, see 2.9 */ } }
```
`z-index:0` sits below content (`.wrap` z3), Thread (z2), nav (z100), grain (z90). `pointer-events:none` → cursor read off `window`. Fixed → does not inflate `scrollHeight` (Thread-safe).

### 2.5 Data model — reuse `zaki-constellation.js` verbatim, add a depth axis
Refactor the **pure** functions out of `zaki-constellation.js` into a shared global (e.g. `window.ZakiMindData`) without changing the 2D behavior:
- `readIntent()` → reads `localStorage['zaki_intent_v1']` (the SAME key the CH.3 writer in `zaki-chapters.js` sets), returns trimmed `.text` or `null`.
- `POOL` (15 life-like labels), `shuffle()`, `cap()`, `truncate(s,22)`.
- Node build: index 0 = core `{core:true,label:'ZAKI',r:22}`; ring nodes on `ang=(i/n)*2π − π/2 + jitter`, `rad≈0.34–0.36`, `bx=0.5+cos(ang)*rad*0.92`, `by=0.5+sin(ang)*rad`. `youIndex=0` (unshifted) = the visitor's intention: `you:true`, red, `r:9`, halo, label `truncate(cap(intent),22)` or `'your goal'`.
- Edges: core→every ring node (you-edge `live:true`); + 3 (or 5 dense) random ring↔ring (`live:false`).

**Only addition — depth `z`:**
```js
node.z  = node.core ? 0 : node.you ? 0.18 : (Math.random()*2-1)*0.6;
node.bz = node.z;
// world: X=(bx-0.5)*spanX, Y=-(by-0.5)*spanY, Z=bz*spanZ
```
The 2D ring becomes a 3D shell around the ZAKI core, intention node nearest camera. Every label/color/edge meaning preserved.

### 2.6 Three pooled OGL layers (one canvas)
`Renderer({alpha:true, antialias:false, dpr})`, one `Camera`, one `Transform` root. All additive, depthTest off, drawn back-to-front:
- **Layer A — Dust** (`gl.POINTS`, budget per tier §5): position in a deep frustum volume; attributes `aRandom`(vec3), `aSize`. Vertex shader drifts on `uTime`, applies cursor parallax + scroll-velocity turbulence, perspective `gl_PointSize`. Fragment: soft radial falloff × twinkle × `uDustAlpha`. This is the "flying through space" substrate.
- **Layer B — Nodes** (`gl.POINTS`, exactly `nodes.length`): attrs `aBasePos`, `aColor` (core teal `#60E2C5`, you red `#FA2E2E`, others `--con-node`), `aRadius`, `aFlags`(isCore,isYou,born,lit). With ≤9 nodes, use per-node uniform arrays (no buffer churn). Fragment renders TWO concentric radial falloffs (tight core + wide halo) summed → fake bloom under additive blend.
- **Layer C — Edges + sparks** (`gl.LINES`): 2 verts/edge sampled from node world positions each frame; `aLive`/`aFlash` pick idle (faint `--con-line`) vs live (teal dashed via `uDashOffset`). Travelling spark = additive points at `mix(nodeA,nodeB,fract(uTime*0.35+i*0.27))` along live edges.

Shared uniforms: `uTime`, `uScroll`(0..1), `uVelocity`(smoothed), `uPointer`(vec2 −1..1), `uExposure`, `uDustAlpha`, `uGlow`. One rAF (the §0.3 ticker) updates uniforms + `renderer.render({scene,camera})`.

### 2.7 Bloom approach — single-pass additive (no heavy post-stack)
Default = baked-sprite glow (the two-falloff fragment) over dark `--bg` via `blendFunc(ONE, ONE)`. Recall pulses = expanding ring sprites (life 0→1 ~1100ms, alpha `(1-life)*0.5`, red for you-node else teal) — the exact 2D ripple, now additive. **Real single-pass bloom** (half-res RT + one separable blur, ACES tonemap) is gated to `tier:high` only (§5). Feed colors from `--con-*` read via `getComputedStyle(#mind-field)`. Dust tint shifts subtly with `body[data-stage]` (warmer on light, cold on dark) sampled from `--ink-3`/`--hair` so it always sits behind content legibly.

### 2.8 No-WebGL fallback wiring (keep the 2D constellation)
```js
var gl; try { gl = canvas.getContext('webgl2') || canvas.getContext('webgl'); } catch(e){}
if (!gl) {
  document.documentElement.classList.add('no-webgl');   // CSS hides #mind-field
  // DO NOT touch .resolve-con — let zaki-constellation.js run on it as today
} else {
  // WebGL is live → suppress the 2D constellation so #cta doesn't double-render:
  var rc = document.querySelector('.resolve-con');
  if (rc) rc.__con = true;                               // preempt initAll() guard
  // ...build the field; field renders the CH.12 destination instead (Stage 3 §3.7)
}
```
`rc.__con = true` must be set **before** `zaki-constellation.js`'s `initAll()` runs — load order (§0.6) puts `zaki-mind.js` before `zaki-constellation.js`, so this preemption is reliable.

### 2.9 Reduced-motion / no-anim / visibility
- `reduce` → **skip WebGL entirely** (cheapest, recommended): let the 2D fallback run on `.resolve-con`, do not build the field. (Or render one static frame.) No rAF, no Lenis (already off from Stage 1), no pointer listeners.
- `html.no-anim` → CSS hides `#mind-field`; `__zakiMind` stops its loop. Page must look correct with field gone.
- `document.visibilitychange` hidden → `cancelAnimationFrame` + `lenis.stop()`; visible → resume + one catch-up frame.

### 2.10 Extend teardown (`window.__zakiMind.destroy`)
Add to the Stage 1 destroy:
```js
gl && gl.getExtension('WEBGL_lose_context')?.loseContext();
canvas && canvas.remove();
window.removeEventListener('pointermove', onPointer);
document.removeEventListener('visibilitychange', onVis);
```

### 2.11 Verify on staging
1. `npm run build` passes; confirm `dist/zaki/vendor/ogl.umd.js` exists and `#mind-field` is in the prerendered `/` HTML (static div) but the canvas only appears post-hydration.
2. On `https://staging.chatzaki.com/`:
   - A subtle starfield/constellation backdrop fades in (`.is-live`), sitting *behind* all text/cards; text fully legible on both dark and light chapters.
   - The you-node renders red with the visitor's intention label if `zaki_intent_v1` is set in localStorage (set it via CH.3 first, then reload); else `'your goal'`.
   - **`#cta` does NOT double-render** a constellation (WebGL field owns it; 2D suppressed). Confirm only one constellation visual at the final CTA.
   - DevTools → disable WebGL (or run in a no-WebGL context) → `html.no-webgl`, `#mind-field` hidden, and the **original 2D `.resolve-con` constellation renders** at `#cta`. Site fully intact.
   - `prefers-reduced-motion: reduce` → no WebGL canvas, 2D fallback present, zero console errors.
   - No FPS cliff: scroll the full page, watch the perf monitor; nodes/edges ≤9/≤16 so cost is dust-bound.
   - Route away and back → no stacked GL contexts (check `WEBGL_lose_context` fired; `about://gpu` or repeated nav without context-count growth).

---

## STAGE 3 — Per-chapter scroll choreography

**Goal:** Turn the static field into a single continuous camera flight through 13 chapter "stations," and layer the per-chapter signature moments on top — all keyed to the **real section ids** and synced to the existing `zaki-chapters.js` events. This is where "Enter ZAKI's mind" becomes a narrative.

### 3.1 Files to edit
- `/Users/nova/Desktop/zaki-prod/website/public/zaki/scripts/zaki-mind.js` (camera spline + per-chapter triggers)
- `/Users/nova/Desktop/zaki-prod/website/public/zaki/styles/zaki-mind.css` (any pin-spacer/exposure helpers)

No further `HomeV4.tsx` change — every hook below already exists in the DOM.

### 3.2 One global flight (Catmull-Rom spline through 13 stations)
A single page-spanning ScrollTrigger feeds `uScroll`; the camera lerps along a spline through one station per chapter (read directly from the same scroll fraction the Thread comet uses, so they move together).
```js
ST.create({ trigger:'#top', start:'top top', end:'bottom bottom', scrub:0.8,
  onUpdate:function(self){ uScroll = self.progress; } });
```
Camera position + lookAt + fov are evaluated from `uScroll` along Catmull-Rom splines (never snap between stations → continuous flight).

**Station table (document order, real ids):**

| # | id | Camera intent | Focus |
|---|----|---------------|-------|
| 1 | `hero` | Deep pull-in from far z, fast | core ZAKI, far |
| 2 | `reframe` | Slow lateral drift, slight roll | core, mid |
| 3 | `intention` | Push toward the empty slot where you-node crystallizes | you-node slot |
| 4 | `agent` | Bank along core→you live edge | edge midpoint |
| 5 | `memory` | Dolly so 3 nodes pull forward in depth | selected mem nodes |
| 6 | `spaces` | Pull back; four ring nodes fan in parallax | ring cluster |
| 7 | `design` | Gentle parallax glide (beat) | drifting ring |
| 8 | `learn` | Gentle parallax glide (beat) | drifting ring |
| 9 | `career` | Gentle parallax glide (beat) | drifting ring |
| 10 | `day` | Slow orbital arc around the core | core orbit |
| 11 | `trust` | Approach a bright threshold plane; stop short | boundary plane |
| 11.5 | `story` | Soft retreat, dust thins | core, far |
| 12 | `cta` | Final arrival: full field assembles, you-node front | whole graph |

Exposure: on each station ease `uExposure`/`uDustAlpha`/`uGlow` down on light chapters (content legible on cream) and up on dark. Drive via a `MutationObserver` on `body[data-stage]`, tween over `--t-base` (520ms).

### 3.3 CH.1 Hero — fly-in through particles (`#hero`, `#hero-h1`)
Load-time intro timeline (not scrubbed), plays once on `is-ready`: camera z far→hero over ~1.6s `power3.out`, `uDustAlpha` 0→1, `uWarp` high→0 (hyperspace streak settling). Fire `#mind-field.is-live` at t0. Sequence GL warp to settle ~200ms **before** `splitHeadline()` lits `#hero-h1` (so text lands on a calmed field). Do not touch `#hero-glow`/`#hero-dots`.

### 3.4 CH.2 Reframe — word assembles from particles (`#reframe`, `#morph-word`)
Morph cycle stays owned by `zaki-chapters.js`. `zaki-mind.js` reads `#morph-word`'s live `getBoundingClientRect()`, sets `uAssembleTarget`(screen rect) + scrubs `uAssembleProgress` 0→1→0 (peak at section center); flagged dust `mix(driftPos, projectedTargetPos, uAssembleProgress)` so the word looks *made of memory*. Re-sample the box each pinned frame / on `.rf.on` flips. Reduce → `uAssembleProgress=0`, word shows normally.

### 3.5 CH.3 Intention — intent crystallizes into a node (the emotional pivot)
Two triggers:
1. **Scroll** ST on `#intention` `start:'top 60%'` pre-positions camera at the empty you-node slot, rendered as a faint "potential" node (low born/glow).
2. **Event** — listen via `MutationObserver` on `body` class for `body.has-intent` (and a `storage` event for cross-tab) — both set by the `zaki-chapters.js` writer when a chip is picked / form submitted. On fire, read `zaki_intent_v1` → `field.crystallize(text)`.

`crystallize(text)` (~1.2s TL): re-label you-node `truncate(cap(text),22)`; tween `born 0→1`, `glow 0→1.4`, `radius→9`; flash core→you edge live + recall ripple; brief camera lean-in; snap red; pull ~80 nearby dust into the node then absorb. This is the visual twin of the `data-intent-echo` text echo (`zaki-chapters.js` echoes the same value into the agent task line + memory Project item + `#cta-primary` label). `#intent-edit`/`#intent-forget` re-fire `crystallize(newText)` or fade back to `'your goal'`. Reduce → node at full state instantly, no lean.

### 3.6 CH.4 Agent — packets stream along the live edge (`#agent`, `#run-phases`)
Run choreography stays owned by `zaki-chapters.js`. `zaki-mind.js` **observes** `#run-phases li` class changes (`MutationObserver`, `.active`/`.done`). Each phase→`.done` emits a pooled packet of additive particles streaming `mix(core, youNode, t)` (~700ms `power1.in`). Brighten edge `flash` at phases 3 & 5 (tool-light moments). On `finish()` (last `li.done` / `#run-learn` visible) → convergent burst + one big recall ripple ("the work landed on your goal"). Mirror the 2500ms failsafe: if no phase events by the time `#agent` is centered, play the stream once. Reduce/`no-anim` → edge steadily live with a static spark, no packets.

### 3.7 CH.5 Memory — selected memories pull forward in depth (`#memory`, `#mem-list`)
Scrub: as `#memory` crosses center, three ring nodes ease `bz → bz+0.5` (forward, growing via perspective). Map them to the `.mlayer` cards / preselected `data-type` items; the **Project item carries `data-intent-echo`** (the user's intent) → pull *that* node forward most (personalized memory dominant). Click: selecting a `.mem-item` (single-select owned by `zaki-chapters.js`) pulls its mapped node a touch further + soft ripple (echoes the WAAPI nudge). **Continuity zone:** tint dust + node glow toward `--con-line-live` teal across `#memory` AND `#spaces` so the field agrees with the Thread's red→teal→red spine. Reduce → static mid-depth.

### 3.8 CH.6 Spaces — four worlds fan and rejoin (`#spaces`)
Scrub `uFan` 0→1→0: four ring nodes split into a parallax fan (spread in x AND z so they separate by motion), hold, converge back toward core as the section exits — mirrors the Thread's "Spaces fork beat" (`.thread-fork`). Global flight pulls back to frame all four. No pin.

### 3.9 CH.7–9 Beats (`#design`, `#learn`, `#career`)
Three gentle parallax glides, low motion (honest "Soon" beats). Drifting ring, no node events.

### 3.10 CH.10 Day — orbital arc (`#day`)
Base camera does a slow orbit around the core (one revolution mapped to the section's scroll length, echoing the 6-moment timeline). Dust slows. No node events.

### 3.11 CH.11 Trust — permission becomes a threshold of light (`#trust`, `#boundary-scene`, `.permission-card`)
The set-piece. 2D boundary DOM scene owned by `zaki-chapters.js` (`settle()` moves `#boundary-presence` to 58%, grows `#boundary-trail` to 54%, shows `#boundary-wait`, adds `.turn`; approve→trail 94%/presence 90%; deny→"Held"). GL counterpart synced to the same events:
- ST on `#boundary-scene` `start:'top 60%'` **with pin** (`pin:true, end:'+=80%'`) — the one place pinning is worth it (hold while the user decides). **`pin:false` on `pointer:coarse`** (mobile).
- On enter (scrubbed during pin): camera approaches a bright vertical threshold plane (additive light wall) and stops short; held sparks pile up just before it. When `#boundary-presence` gets `.turn`, freeze the GL "presence" mote at the plane, pulse `#boundary-wait` glow.
- **Approve** (`.pc-btn.approve` click → card `.approved`): plane opens, held sparks stream through (maps to trail→94%, presence→90%).
- **Deny** (`.pc-btn.deny`): plane dims/hardens, sparks retract ("Held · waits for you").
- Reduce/`no-anim` → settled waiting state, `pin:false` (never trap scroll).

### 3.12 CH.11.5 Story + CH.12 CTA — arrival (`#story`, `#cta`, `#cta-primary`)
- `#story`: dust thins (`uDustAlpha` down), field recedes — a quiet breath.
- `#cta`: the **whole constellation assembles at full density/brightness**, you-node front-and-center, every core→node edge live, sparks travelling, ambient pulses — the WebGL replacement for `.resolve-con`. The `#cta-primary .cta-label` already reads `"Continue: <Intent>"` (set by `zaki-chapters.js`); the you-node visually *is* that intent. Clamp `uScroll` easing so the field holds composed while the footer scrolls in.

### 3.13 Lenis ↔ rail/Thread click jumps
Delegate clicks on `#chap-rail` buttons and `.thread-hit` circles to `lenis.scrollTo(target)` for perfectly-eased rail jumps (Lenis intercepts anchor smooth-scroll; if not, call `scrollTo` explicitly). Never write `#scroll-progress`.

### 3.14 Verify on staging
On `https://staging.chatzaki.com/`, scroll slowly top→bottom and confirm each station:
- Hero hyperspace fly-in plays once, settles before headline lines mask in.
- CH.2 word visibly assembles from dust at section center.
- **CH.3:** with no stored intent, scroll past `#intention` → faint potential node at the slot. Then pick a chip / submit the form → the you-node **crystallizes red with your text**, camera leans in, core→you edge flashes. Reload → node persists (localStorage). Confirm the SAME text appears in the agent task line, memory Project item, and the `#cta` button label ("Continue: …").
- CH.4: scrolling through `#agent`, packets stream core→you as phases complete; convergent burst at finish.
- CH.5: three memory nodes pull forward; the Project (intent) node is the dominant one; clicking a `.mem-item` nudges its node.
- `#memory`/`#spaces` dust shifts teal (continuity zone); CH.6 four nodes fan and rejoin.
- CH.10 slow orbit; CH.11 pin holds, camera stops at the light plane; **Approve** opens it and sparks cross; **Deny** hardens it. On mobile width the pin is disabled (no scroll trap).
- CH.12 full constellation assembles, you-node front, holds while footer enters.
- Reduced-motion: none of the above animates; static frame or 2D fallback; all copy/CTAs reachable.

---

## STAGE 4 — Micro-interactions, polish, and final copy

**Goal:** Cursor parallax, scroll-velocity turbulence, the GL "lean" toward CTAs, and integrate the rewritten world-class copy into `HomeV4.tsx`.

### 4.1 Files to edit
- `/Users/nova/Desktop/zaki-prod/website/public/zaki/scripts/zaki-mind.js` (cursor parallax, velocity turbulence, CTA glow lean)
- `/Users/nova/Desktop/zaki-prod/website/src/pages/HomeV4.tsx` (copy — headings, subheads, body, eyebrows; preserve every `id`, `data-*`, class, and CTA href)

### 4.2 Cursor-reactive parallax
One `pointermove` on `window` (passive, rAF-throttled) → `uPointer`(−1..1 from viewport center). Dust offsets along `uPointer` scaled by per-particle depth (near moves more); nodes get a gentler camera-space yaw/pitch ≤3° (echoes the 2D `pull = max(0,0.16−d)*0.5` reaction, now 3D). `pointerType==='touch'` ignored. **Does not** conflict with `#hero-glow` (separate element, `#hero` only) — `#mind-field` is `pointer-events:none` and reads the global pointer.

### 4.3 Scroll-velocity turbulence
Smooth Lenis velocity (`uVelocity += (raw-uVelocity)*0.1`, clamp magnitude). Feed dust vertex shader: fast scroll streaks dust along travel axis + low-amp curl wobble; at rest, gentle drift. Rapid flicks briefly re-introduce `uWarp` (hero streak) — the page *feels* like flight. Clamp so text stays legible on light stages.

### 4.4 Magnetic CTAs — leave the existing one alone
`zaki-home.js` already does the magnetic inline `transform` on `.btn-primary.btn-lg`. **Do not duplicate or override it** (don't write that element's transform). Only add a GL response: when the cursor is within a CTA's bounds, briefly raise `uGlow` on the nearest node so the field "leans" toward the button. No transform writes.

### 4.5 Integrate the final copy (`HomeV4.tsx`)
Replace the hardcoded body copy/headings/subheads/eyebrows per chapter with the rewrite in §6 below. **Constraints:**
- Preserve every `id`, `data-stage`, `data-screen-label`, `data-split`, `data-w`, `data-intent-echo`, `data-eg-fallback`, `data-phase`, `data-tool`, `data-constellation`, class name, and CTA `href`/handoff (`signupUrl`/`signinUrl`/`agentUrl`, plain `/agent`/`/spaces`/`/pricing`/`/story` and `#anchor`s).
- Keep the `<br/>` line breaks and `*emphasis*` markup the scripts/CSS expect (`splitHeadline` and `.hl` units depend on the heading structure).
- The morph list `data-w` values (`an agent`/`a space`/`a design partner`/`a tutor`/`a career engine`) stay exactly — they drive the CH.2 animation and match the copy.
- Chip labels + `data-key`/`data-eg` stay exactly (they key the intent writer).
- "Soon" statuses stay honest (CH.7–9).
- Do not invent new routes; every CTA maps to an existing handoff.

### 4.6 Verify on staging
- Cursor parallax: moving the mouse parallaxes the dust/field subtly; no jank; off on touch.
- Velocity turbulence: a fast flick smears the dust then settles; text never becomes unreadable on cream chapters.
- CTA hover: nearest node glows; the existing magnetic button motion is unchanged (no double transform).
- Copy reads as the §6 rewrite, all CTAs land on the correct app-handoff URLs (`?source=…&intent=…[&auth=…]`); confirm staging handoffs point at `app-staging.chatzaki.ai` (not prod `chatzaki.ai`).
- Re-run reduced-motion + no-WebGL: copy + handoffs fully intact.

---

## STAGE 5 — Responsive + performance sweep

**Goal:** Tier the field by device, add an FPS governor, lock mobile behavior, and pass the perf bar (60fps desktop, smooth-degraded mobile).

### 5.1 Files to edit
- `/Users/nova/Desktop/zaki-prod/website/public/zaki/scripts/zaki-mind.js` (tiering, FPS governor, mobile gates)
- `/Users/nova/Desktop/zaki-prod/website/public/zaki/styles/zaki-mind.css` (any mobile-specific exposure tweaks)

### 5.2 Performance tiers (set once at boot)
```js
var dpr = Math.min(window.devicePixelRatio||1, 2);          // hard DPR clamp
var mem = navigator.deviceMemory||4, cores = navigator.hardwareConcurrency||4;
var coarse = matchMedia('(pointer:coarse)').matches;
var tier = (coarse||mem<=4||cores<=4) ? 'low'
        : (mem>=8&&cores>=8&&innerWidth>=1280) ? 'high' : 'mid';
```
| Tier | Dust budget | DPR cap | Bloom |
|------|-------------|---------|-------|
| high | ~6000 | 2 | single-pass RT bloom (§2.7) |
| mid | ~2500 | 1.75 | baked-sprite glow |
| low | ~900 | 1.25 | baked-sprite glow |

Nodes/edges always full (≤9/≤16, negligible). Only **dust** scales — design the shader so changing `COUNT` needs no other change.

### 5.3 FPS governor (one-way ratchet down)
Sample mean frame time over a ~1.5s rolling window; if > ~22ms, drop one tier (cut dust budget, disable RT bloom). Never ratchet back up mid-session. If `navigator.connection?.saveData` → force `low` + cap ticker at 30fps.

### 5.4 Mobile (`< 1180px`, `pointer:coarse`)
Existing CSS hides the Thread SVG + chapter rail below 1180px, so the field becomes the **primary spatial cue** — keep it on at `low` tier (~900 dust, DPR ≤1.25, no RT bloom, `uWarp`/turbulence halved). Lenis `syncTouch:false` → native momentum; turbulence driven by Lenis velocity. **Drop pinning** for the CH.11 boundary beat (`pin:false` under coarse — pinned touch scroll is fragile; play as non-pinned scrubbed scene). Cursor parallax off (no hover); rely on velocity turbulence.

### 5.5 Visibility/focus pause
Tab hidden → `cancelAnimationFrame` + `lenis.stop()`; visible → resume + one catch-up frame. Don't burn cycles in a background tab.

### 5.6 Verify on staging
- Desktop (high tier, ≥1280px): sustained ~60fps scrolling the full page (perf monitor); RT bloom visible on hero/CTA.
- Resize across 1440 → 1180 → 900 → 600 → 375: no horizontal scroll (Stage 1 grain fix holds), field re-sizes, tier drops appropriately, no layout shift in content.
- Real mobile device / coarse-pointer emulation: field present at low tier, smooth native-momentum scroll, CH.11 not pinned (no scroll trap), no overheating/jank.
- Throttle CPU 4× in DevTools → FPS governor drops a tier within ~1.5s; no permanent stutter.
- `saveData` emulation → low tier, 30fps cap.
- Background the tab, return → field resumes cleanly, one catch-up frame, no error.

---

## STAGE 6 — Arabic (RTL) port

**Goal:** Bring the immersive experience to the Arabic locale with correct RTL layout, Zain typography, mirrored choreography, and the same safety nets. (English `/` renders `HomeV4`; the Arabic home is the locale variant — port the same hooks.)

### 6.1 Files to edit
- The Arabic home page component (the `ar` counterpart of `HomeV4.tsx` — locate via `routeRegistry.ts` / the `ar` route; same structure, same ids/`data-*`).
- `/Users/nova/Desktop/zaki-prod/website/public/zaki/scripts/zaki-mind.js` (RTL awareness)
- `/Users/nova/Desktop/zaki-prod/website/public/zaki/styles/zaki-mind.css` (RTL exposure/positioning if any)
- Arabic copy strings (mirror §6, professionally translated; not machine).

### 6.2 RTL correctness
- The page sets `<html dir="rtl" lang="ar">` (prerender sets `dir` per `routeRegistry`). The field is `position:fixed; inset:0` — direction-agnostic — but **flight/choreography that uses left/right semantics must mirror**:
  - CH.3 you-node slot, CH.6 fan direction, CH.11 threshold-plane approach: mirror the x-axis under `dir=rtl` (read `document.documentElement.dir === 'rtl'` once; negate camera x and node x offsets).
  - The Thread (`zaki-home.js`) lives in the gutter; confirm the gutter side under RTL and ensure the field's intention node / fan don't fight the Thread's mirrored side.
- Typography: Arabic uses `--f-arabic` ('Zain'); GL labels (`data-no-labels` is set on `#mind-field`, so the field draws no text labels on the homepage) — no Arabic text in WebGL needed. If labels are ever enabled, render Zain to a texture.
- `localStorage['zaki_intent_v1']` is locale-agnostic; the crystallize label uses whatever text the Arabic CH.3 writer stores — confirm `truncate(...,22)` handles Arabic graphemes acceptably (truncate by code points, not bytes).

### 6.3 Verify on staging
- On the Arabic staging URL: layout is RTL, copy is Arabic (Zain), nav/footer mirrored.
- Field present; CH.3 you-node crystallizes on the correct (mirrored) side; CH.6 fan and CH.11 plane approach mirror correctly; nothing collides with the Thread.
- All three safety nets still hold (reduced-motion, no-WebGL → 2D fallback, no-anim).
- App handoffs from the Arabic page carry the correct `source`/`intent` and staging host.

---

## 5bis. Risks + the single safety net

### Risks (ranked)
1. **SPA navigation GL/listener leak (HIGH).** The hook removes script *elements*, not their rAF/observers/GL contexts. The existing never-called `Constellation.destroy()` is a latent leak proving this. **Mitigation:** `window.__zakiMind.destroy()` (real teardown) called from the hook `cleanup` *before* node removal (§1.4, §2.10). Verify by routing `/ ↔ /pricing` repeatedly with no context-count growth.
2. **Double-render at `#cta` (MEDIUM).** Both the WebGL field and the 2D `.resolve-con` could draw a constellation. **Mitigation:** preempt `resolveConHost.__con = true` before `initAll()` when WebGL is live (§2.8); when WebGL is absent, the field is hidden and 2D runs alone. Verify exactly one constellation at `#cta`.
3. **Writing a script-owned property (MEDIUM).** Touching `#scroll-progress`, `#thread-*`, `body[data-stage]`, `#hero-glow`, or the magnetic transform would corrupt the existing layer. **Mitigation:** the read-only ownership list (§0.2); reviewer checklist on every PR. Verify Thread/comet/rail still behave after every stage.
4. **Thread mis-measure after Lenis (MEDIUM).** Lenis changes scroll metrics; the Thread anchors to the layout. **Mitigation:** call `window.ZAKI.rebuild()` once after Lenis + canvas init (double-rAF). Verify the Thread spans to the footer, not a collapsed layout.
5. **Prerender/SSR crash from a stray GL import (MEDIUM).** Any `import 'ogl'/'lenis'` under `src/` would be bundled into the SSR path (`ssr.noExternal:true`) and crash `validate-prerender.mjs`. **Mitigation:** vendored UMD only, never imported in `src/`/`entry-server.tsx`. Verify `npm run build` passes the validation gate.
6. **Mobile pin scroll-trap (MEDIUM).** Pinned scroll on touch is fragile. **Mitigation:** `pin:false` under `pointer:coarse` for CH.11 (§5.4). Verify on a real device.
7. **Perf cliff on weak GPUs (MEDIUM).** Fullscreen particles + bloom. **Mitigation:** DPR clamp ≤2, dust-only tiering, FPS governor ratchet-down, IO/visibility pause (§5). Verify with 4× CPU throttle.
8. **`.grain` horizontal overflow (LOW, confirmed bug).** `inset:-50%` + translate. **Mitigation:** `inset:-8%` + capped translate + `overflow-x:clip` on `html,body` (§1.6). Verify no horizontal scrollbar at any width.
9. **Reduced-motion regression in reveals (LOW).** The scroll-linked reveal upgrade must not break the IO end-state. **Mitigation:** gate behind `html.mind-on`; the existing `.reveal.in` CSS governs when absent (§1.7). Verify reduce path shows content instantly.
10. **`grain.png` asset path assumption (LOW).** §1.6 references a grain background image; confirm the actual grain source in `zaki-home.css` (it may be a generated/data-URI texture) and preserve it when editing the rule — only change `inset` and the keyframe, not the texture.

### The single safety net (non-negotiable)
**The DOM/CSS site must be 100% functional with the entire WebGL/Lenis layer removed.** Three independent kill switches each produce a fully working site:
- `prefers-reduced-motion: reduce` → native scroll, instant reveals, no field (or static frame), 2D constellation at `#cta`.
- **No WebGL** → `html.no-webgl`, field hidden, 2D `zaki-constellation.js` runs as today.
- `html.no-anim` (frozen-frame) → field hidden, mind loop stopped.

Every stage's verification explicitly re-tests all three. If the immersive layer ever fails, the visitor still sees the full ZAKI homepage — copy, layout, nav, footer, Thread (where supported), and every app-handoff CTA — exactly as it ships today.

---

## 6. Final homepage copy — mapped to real chapter ids

Headlines preserve existing `<br/>` breaks and `*emphasis*`. Every CTA maps to an existing handoff. "Soon" stays honest.

### CH.1 — Hero (`#hero` · `01 Hero`)
- **Eyebrow:** ZAKI · Your AI, on your side
- **Headline:** Whatever comes next, *ZAKI is on your side.*
- **Subhead:** Not another chatbot you have to manage. One AI that plans, acts, follows through, and remembers you.
- **Body:** Tell it what you're trying to do. ZAKI doesn't just answer — it takes the work from here, keeps the context you've built together, and stays with you long after the conversation ends.
- **CTAs:** `Meet ZAKI` (→ `signupUrl`) · `Sign in` (→ `signinUrl`)

### CH.2 — One intelligence (`#reframe` · `02 One intelligence`)
- **Eyebrow:** One intelligence
- **Headline:** Not five AI tools.<br/>One intelligence.
- **Subhead:** Most AI lives in a dozen tabs that don't know each other. ZAKI is one mind that becomes whatever the moment needs.
- **Body:** When the work is complex, it becomes an agent. When you need a place to think, it becomes a space. For an idea, a design partner. To learn, a tutor. For your career, an engine. Same intelligence, same memory — it just changes shape.
- **CTAs:** none (morph beat). `data-w` list unchanged: `an agent` / `a space` / `a design partner` / `a tutor` / `a career engine`.

### CH.3 — Intention (`#intention` · `03 Intention`)
- **Eyebrow:** Start here
- **Headline:** What are you trying to<br/>move forward?
- **Subhead:** Not "how can I help?" — a real starting point. Tell ZAKI the outcome you're after, and it remembers it from here.
- **Body:** Pick a direction or write your own. This isn't a search box; it's the first thing ZAKI keeps about you. It stays on this device until you're ready — then it carries through everything that follows.
- **Chips (labels unchanged, keep `data-key`/`data-eg`):** `Move a project forward` · `Bring an idea to life` · `Understand something difficult` · `Find the right opportunity` · `Organize everything around me` — submit: `Remember`

### CH.4 — Agent (`#agent` · `04 Agent`)
- **Eyebrow:** ZAKI Agent · Live
- **Headline:** Give it the outcome.<br/>ZAKI handles the path.
- **Subhead:** This is the part other AI skips. ZAKI plans the steps, uses real tools, and does the work — then brings it back for your call.
- **Body:** It researches, searches the web, writes files, builds spreadsheets, drafts the outreach, and delegates the busywork. You watch it run, you stay in control, and nothing ships without your approval. You set the destination; it walks the road.
- **CTAs:** `Watch ZAKI run` (→ `agentUrl`) · cap chips unchanged (Plan & act · Use tools · Create files & images · Delegate · Schedule · Approvals)

### CH.5 — Memory (`#memory` · `05 Memory`)
- **Eyebrow:** ZAKI Brain · Your memory
- **Headline:** It remembers the person,<br/>not just the prompt.
- **Subhead:** Every other AI forgets you the moment you close the tab. ZAKI keeps what matters — and lets you see exactly what it knows.
- **Body:** Preferences, projects, the corrections you've made, the deadlines you're chasing — held in a living memory you can inspect, correct, or forget at any time. It's your brain, owned by you. The longer you work together, the more it feels like working with someone who already gets it.
- **CTAs:** `See how memory works` (→ `#trust`) · controls unchanged (Inspect · Correct · Forget). Keep `data-intent-echo` on the Project item.

### CH.6 — Spaces (`#spaces` · `06 Spaces`)
- **Eyebrow:** ZAKI Spaces · Live
- **Headline:** Keep every conversation<br/>in its world.
- **Subhead:** One launch, one course, one client — each gets its own space, with its own context, docs, and history.
- **Body:** No more scrolling one endless thread looking for the thing you said last week. Spaces keep work separated and whole: shared files, the conversation that built them, and ZAKI carrying the thread of each world so you never have to re-explain it.
- **CTAs:** `Open Spaces` (→ `/spaces`)

### CH.7 — Design (`#design` · `07 Design`)
- **Eyebrow:** ZAKI Design · Soon
- **Headline:** From idea to<br/>something you can see.
- **Subhead:** Describe the feeling. ZAKI shapes the directions — and remembers the taste you keep choosing.
- **Body:** A design partner that learns what "right" looks like for you. It proposes, you steer, and every choice teaches it your eye — so the next round starts closer to yours.
- **CTA:** `Soon` (status, non-interactive)

### CH.8 — Learn (`#learn` · `08 Learn`)
- **Eyebrow:** ZAKI Learn · Soon
- **Headline:** Learn the way<br/>your mind works.
- **Subhead:** Not a course you fall behind in. A tutor that knows where you are and meets you there.
- **Body:** It sees what you've mastered, where the gaps are, and what's next — then teaches to that, at your pace. Progress that's actually yours, remembered between every session.
- **CTA:** `Soon` (status, non-interactive)

### CH.9 — Career (`#career` · `09 Career`)
- **Eyebrow:** ZAKI Career · Soon
- **Headline:** Let the right<br/>role find you.
- **Subhead:** Stop searching against the world. Start matching from who you already are.
- **Body:** Because it already knows your work, your goals, and your standards, ZAKI matches you to roles that actually fit — ranks them honestly, and never moves without your say-so.
- **CTA:** `Soon` (status, non-interactive)

### CH.10 — A day with ZAKI (`#day` · `10 A day with ZAKI`)
- **Eyebrow:** A day with ZAKI
- **Headline:** One day.<br/>One intelligence beside you.
- **Subhead:** Not six apps you check. One presence that moves through the day with you.
- **Body:** Morning planning, midday research, an afternoon it handles while you focus, the loose ends it ties up by evening — and the quiet work it does while you sleep. Same memory, same context, all day. You never start from scratch, because it never forgets where you left off.
- **CTAs:** none (timeline)

### CH.11 — Trust (`#trust` · `11 Trust`)
- **Eyebrow:** Trust & control
- **Headline:** Close enough to know you.<br/>Built to protect you.
- **Subhead:** Memory this personal only works if it's truly yours. So ZAKI hands you the controls — and stops at every line until you say go.
- **Body:** Inspect what it knows. Correct it. Export it. Delete it. ZAKI reaches the boundary of any real action and waits for your approval — it never crosses on its own. The memory is yours to own, see, and end at any time.
- **CTAs:** `Read our story` (→ `/story`) · permission scene: `Deny` / `Approve`

### CH.11.5 — The origin (`#story` · `The origin`)
- **Eyebrow:** The origin
- **Headline:** Designed by agents.<br/>*Built to remember.*
- **Subhead:** ZAKI was built the way it works — agents planning, acting, and remembering, together.
- **Body:** Nine layers of memory. Three tiers of recall. One living graph that turns everything you share into something ZAKI can actually use. The continuity you feel isn't a feature bolted on — it's the foundation it was built on.
- **CTA:** `Read the full story` (→ `/story`)

### CH.12 — A new chapter (`#cta` · `12 A new chapter`)
- **Eyebrow:** A new chapter
- **Headline:** Never build *alone.*
- **Subhead:** One intelligence that plans, acts, remembers you, and stays. Whatever comes next, you won't face it by yourself.
- **Body:** Bring the thing you've been carrying. ZAKI takes it from here — and remembers everything you build together.
- **CTA:** `Meet ZAKI` (→ `signupUrl`; label becomes `Continue: <your intent>` once an intention is captured — owned by `zaki-chapters.js`, do not re-implement)

**Voice honored throughout:** human, precise, lightly warm, companion-not-tool; differentiation explicit (one intelligence vs scattered tools in CH.2; acts-not-chats in CH.4; remembers-the-person in CH.5; continuity in CH.10; user-owned memory + approval boundary in CH.11). All "Soon" products honest. Every CTA maps to a real handoff already in `HomeV4.tsx`.

---

## 7. Build/ship checklist (every stage)

1. Vendor files committed under `public/zaki/vendor/` (UMD, pinned): `gsap.min.js`, `ScrollTrigger.min.js`, `lenis.umd.js`, `ogl.umd.js`. Never imported in `src/` or `entry-server.tsx`.
2. New IIFE `public/zaki/scripts/zaki-mind.js` — reduce + WebGL feature-detect, `host.__mind`/`__zakiMindInit` guard, real `destroy()`.
3. New `public/zaki/styles/zaki-mind.css` — `#mind-field` layout, `--con-*` block, grain `overflow-x:clip` fix, `.no-webgl`/`.no-anim` hides, `html.mind-on` reveal gating.
4. `src/hooks/useZakiPage.ts` — prepend `VENDOR_SCRIPTS`, insert `zaki-mind.js` before `zaki-constellation.js`, append `zaki-mind.css`, call `window.__zakiMind?.destroy()` + `window.__zakiGalaxyStop?.()` in `cleanup`.
5. `src/pages/HomeV4.tsx` — add the single `#mind-field` host (Stage 2); integrate §6 copy (Stage 4) preserving all ids/`data-*`/hrefs.
6. `npm run build` passes including `validate-prerender.mjs`; confirm `dist/zaki/vendor/*` exists; on a prerendered `/`, GL starts only after hydration and the 2D constellation does not double-render at `#cta`.
7. Deploy via the existing staging promote flow (`linux/amd64` image); verify on `https://staging.chatzaki.com` per each stage's checklist; confirm app handoffs resolve to `app-staging.chatzaki.ai`.

---

## 8. Key file references (absolute)

**Create**
- `/Users/nova/Desktop/zaki-prod/website/public/zaki/scripts/zaki-mind.js`
- `/Users/nova/Desktop/zaki-prod/website/public/zaki/styles/zaki-mind.css`
- `/Users/nova/Desktop/zaki-prod/website/public/zaki/vendor/{gsap.min,ScrollTrigger.min,lenis.umd,ogl.umd}.js`

**Edit**
- `/Users/nova/Desktop/zaki-prod/website/src/hooks/useZakiPage.ts` (vendor scripts + CSS + teardown)
- `/Users/nova/Desktop/zaki-prod/website/src/pages/HomeV4.tsx` (one `#mind-field` host + §6 copy)
- `/Users/nova/Desktop/zaki-prod/website/public/zaki/styles/zaki-home.css` (`.grain` rule, lines ~152–157)
- The Arabic home component + Arabic copy strings (Stage 6; locate via `/Users/nova/Desktop/zaki-prod/website/src/lib/routeRegistry.ts`)

**Reuse data model from (lift pure fns into a shared global; keep as no-WebGL/reduced-motion fallback)**
- `/Users/nova/Desktop/zaki-prod/website/public/zaki/scripts/zaki-constellation.js` (`readIntent`, `POOL`, `shuffle`, node/edge build, `youIndex`)

**Unchanged owners (READ-ONLY from `zaki-mind.js`)**
- `/Users/nova/Desktop/zaki-prod/website/public/zaki/scripts/zaki-home.js` (Thread / rail / stage / `window.ZAKI.rebuild`)
- `/Users/nova/Desktop/zaki-prod/website/public/zaki/scripts/zaki-chapters.js` (intent writer `zaki_intent_v1`, agent run, boundary scene)

**Pipeline (do not change)**
- `/Users/nova/Desktop/zaki-prod/website/vite.config.js` (`.js`; `ssr.noExternal:true`)
- `/Users/nova/Desktop/zaki-prod/website/src/entry-server.tsx`, `/Users/nova/Desktop/zaki-prod/website/src/main.tsx`
- `/Users/nova/Desktop/zaki-prod/website/scripts/{prerender,validate-prerender}.mjs`
- `/Users/nova/Desktop/zaki-prod/website/Dockerfile`

**Staging host injection (infra)**
- `/Users/nova/Desktop/zaki-infra/charts/zaki-website/values-staging.yaml` (`APP_BASE_URL: https://app-staging.chatzaki.ai`)
