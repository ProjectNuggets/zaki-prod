# ZAKI Homepage "The Next Chapter" (Ascent) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the ZAKI homepage as a cinematic, rising "ascent" journey — 7 distinct full-screen scenes, a palette that climbs dark→dawn with scroll, a carried-goal personalization thread, Zee as the visible companion, and scramble used only on the one accent word per scene.

**Architecture:** Two layers (unchanged): the React page `src/pages/HomeV4.tsx` (markup + copy, CSS bundled into `<head>` via Vite imports), and the vanilla `public/zaki/` layer (Lenis + GSAP ScrollTrigger motion in `zaki-mind.js`, styles in `zaki-scenes.css`). One global **altitude** value (scroll 0→1) drives the rising palette via CSS `color-mix`. Each scene is a self-contained `.scene` unit built and verified independently.

**Tech Stack:** React 18 + Vite 6 (SSR prerender), GSAP 3.13 + ScrollTrigger (vendored), Lenis 1.1 (vendored), vanilla canvas 2D (Scene 4 graph only). No new dependencies.

**Spec:** `docs/immersive/2026-06-24-homepage-ascent-design.md` (read it first).

## Global Constraints

- **Verification model:** every task ends green only when (a) `npm run build` prints `Validated 22 prerendered routes`, (b) the stated Playwright assertion passes against `npm run preview` on `http://localhost:4174` (the **production** build — dev has a StrictMode caveat fixed in Task 1), (c) a screenshot is reviewed, and (d) after the scene tasks, it is deployed to staging and re-checked live.
- **CSS loads in `<head>`** (already fixed) — never reintroduce JS-injected CSS for the home page. New scene CSS is added to `public/zaki/styles/zaki-scenes.css`, which is imported in `HomeV4.tsx`.
- **Scramble = scalpel:** the engine binds only `.hl, .hlt, [data-scramble]`. Exactly **one** `.hl` accent per scene headline. Do not re-broaden it.
- **Three kill switches must always leave a working page:** `prefers-reduced-motion:reduce`, no-WebGL/no-canvas, and no-JS. The DOM + CSS + copy + CTAs must stand alone.
- **No horizontal scroll** at any width (`scrollWidth === clientWidth`). **60fps** target. **WCAG AA** text contrast at every altitude step.
- **Copy is verbatim from the spec §3.** Honest "Soon" on Design/Learn/Career. No new product claims, no prices, no model names.
- **App-handoff CTAs** use the existing component vars `signupUrl` / `signinUrl` / `agentUrl` (already `appHandoffUrl(...)`); staging handoffs must resolve to `app-staging.chatzaki.ai`.
- **Deploy flow (every scene task that deploys):** commit → `git push origin main` → `docker buildx build --platform linux/amd64 --push -t ghcr.io/projectnuggets/zaki-website:sha-<SHA> website/` → bump `charts/zaki-website/values-staging.yaml` (tag + `rollme`) in `/Users/nova/Desktop/zaki-infra` → `git push origin staging` → poll a content discriminator until 3 consecutive hits.

---

## File Structure

- `src/main.tsx` — remove `<React.StrictMode>` wrapper (Task 1).
- `src/pages/HomeV4.tsx` — the 7 scenes' markup + copy; imports the scene CSS.
- `public/zaki/styles/zaki-scenes.css` — the `.scene` system (exists) + rising palette + per-scene styles + facets + token + mobile.
- `public/zaki/scripts/zaki-mind.js` — Lenis/ScrollTrigger engine (exists) + altitude driver + per-scene choreography (pins, reveals, the agent run-on-scroll, the memory graph, the token).
- `public/zaki/scripts/zaki-home.js` / `zaki-chapters.js` — READ-ONLY owners of the intent capture, run demo, boundary scene, memory list. zaki-mind.js observes them; never rewrites them.
- Existing scene CSS/JS for hero+reframe is the template — extend, don't fork.

---

## Task 1: Foundation — StrictMode fix + altitude driver + rising palette

**Files:**
- Modify: `src/main.tsx` (remove StrictMode wrapper)
- Modify: `public/zaki/scripts/zaki-mind.js` (altitude driver on the shared ticker)
- Modify: `public/zaki/styles/zaki-scenes.css` (rising-palette body vars)

**Interfaces:**
- Produces: a CSS custom property `--altitude` on `:root` (0.0 at page top → 1.0 at bottom), updated every frame; and body palette vars `--bg`/`--ink-1`/`--ink-2`/`--ink-3` interpolated by altitude. Later tasks read `--altitude` for per-scene exposure and rely on the palette being continuous.

- [ ] **Step 1: Remove StrictMode (the dev-only double-mount breaks the imperative script/animation layer; no production impact — StrictMode's double-invoke is dev-only).**

In `src/main.tsx`, change the render wrapper from:
```tsx
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```
to:
```tsx
// StrictMode removed: its dev-only double-invoke remounts the page effect and
// races the async vanilla-script injection (pins/choreography fail to register
// in dev). Production is unaffected. See ascent plan Task 1.
root.render(<App />);
```
(If the import of `React` becomes unused, leave it — other files may rely on the JSX runtime; do not touch imports beyond this.)

- [ ] **Step 2: Add the altitude driver in `zaki-mind.js`.** Place it right after the Lenis block, before teardown. It runs on the shared `gsap.ticker` (one clock):

```js
  /* ---- Altitude driver: one scroll-progress value (0 top -> 1 bottom) ---- */
  var altTickFn = null;
  (function () {
    var root = document.documentElement;
    function altitude() {
      var de = document.documentElement;
      var max = de.scrollHeight - de.clientHeight;
      var p = max > 0 ? (window.scrollY || de.scrollTop) / max : 0;
      if (p < 0) p = 0; else if (p > 1) p = 1;
      root.style.setProperty('--altitude', p.toFixed(4));
    }
    altitude();                       // paint initial (also correct under reduce/no-anim)
    if (!reduce) { altTickFn = altitude; gsap.ticker.add(altTickFn); }
  })();
```
Then in `window.__zakiMind.destroy`, add before resetting the init flag:
```js
      if (altTickFn) { gsap.ticker.remove(altTickFn); altTickFn = null; }
```

- [ ] **Step 3: Add the rising palette in `zaki-scenes.css`.** Replace the per-stage `data-stage` reliance for the home page with a continuous climb. Add near the top of `zaki-scenes.css`:

```css
/* ---- Rising palette: ground (dark) -> summit (dawn), driven by --altitude ---- */
:root { --altitude: 0; }
body {
  /* oklab interpolation = perceptually even climb. Tuned non-linear via the
     two stops so mid-altitude keeps AA contrast (see Task 1 verify). */
  --bg:    color-mix(in oklab, #0C0A09, #F4EAD8 calc(var(--altitude) * 100%));
  --ink-1: color-mix(in oklab, #F4EFE7, #1F1A14 calc(var(--altitude) * 100%));
  --ink-2: color-mix(in oklab, #C2BAAE, #564737 calc(var(--altitude) * 100%));
  --ink-3: color-mix(in oklab, #8B8378, #88735A calc(var(--altitude) * 100%));
  background: var(--bg);
  color: var(--ink-1);
  transition: none;
}
/* reduced-motion / no-anim: hold a legible grounded frame */
@media (prefers-reduced-motion: reduce) { :root { --altitude: 0 !important; } }
html.no-anim { /* altitude stays at its last painted value; bg already legible */ }
```

- [ ] **Step 4: Verify build + the climb.**

Run: `cd /Users/nova/Desktop/zaki-prod/website && npm run build`
Expected: ends with `Validated 22 prerendered routes.`

Run preview: `pkill -f "vite preview.*4174"; nohup npx vite preview --host 0.0.0.0 --port 4174 >/tmp/prev.log 2>&1 &` then wait for `http://localhost:4174/` to return 200.

Playwright assertion (navigate to `http://localhost:4174/`, then evaluate):
```js
() => new Promise(res => { let n=0; (function w(){ if(window.__zakiMindInit||n++>80){
  const top = getComputedStyle(document.body).backgroundColor;
  window.scrollTo(0, document.documentElement.scrollHeight);
  setTimeout(()=>{ const bottom = getComputedStyle(document.body).backgroundColor;
    res({ topBg: top, bottomBg: bottom, climbed: top !== bottom,
          altAtBottom: getComputedStyle(document.documentElement).getPropertyValue('--altitude').trim() }); }, 600);
} else requestAnimationFrame(w); })(); })
```
Expected: `climbed: true`, `altAtBottom` ≈ `1`, top bg dark (`rgb(12,10,9)`-ish), bottom bg warm-light.

- [ ] **Step 5: Verify AA contrast at altitude 0, 0.25, 0.5, 0.75, 1.** Evaluate per step: set `document.documentElement.style.setProperty('--altitude', v)`, read computed `--bg` and `--ink-1`, compute WCAG contrast ratio. Each must be ≥ 4.5:1 for body text. If a mid step fails, tune the `#F4EAD8`/`#1F1A14` stops (e.g., keep ink lighter longer by using a 3-stop gradient via a JS-set var) until all pass. Record the ratios.

- [ ] **Step 6: Verify dev now works (StrictMode fix).** `pkill -f "vite.*4173"; nohup npm run dev …`; navigate dev `http://localhost:4173/`; assert `window.ScrollTrigger.getAll().length > 0` (choreography registers in dev now).

- [ ] **Step 7: Commit.**
```bash
git add src/main.tsx public/zaki/scripts/zaki-mind.js public/zaki/styles/zaki-scenes.css
git commit -m "feat(website): ascent foundation — altitude driver + rising palette, remove StrictMode"
```

---

## Task 2: Scene 1 — Threshold (pinned rise-out)

**Files:**
- Modify: `src/pages/HomeV4.tsx` (`#hero` block — copy + Zee)
- Modify: `public/zaki/styles/zaki-scenes.css` (Zee companion slot)
- Modify: `public/zaki/scripts/zaki-mind.js` (hero pin already exists; confirm rise-out)

**Interfaces:**
- Consumes: `.scene`, `.scene-eyebrow/.scene-h1/.scene-lede/.scene-cta`, the hero pin timeline (exist).
- Produces: a reusable `.scene-zee` companion element pattern (absolute, lower-edge, `aria-hidden`) reused by later scenes.

- [ ] **Step 1: Set Scene 1 copy + Zee** in the `#hero` `.scene-inner` (keep the pattern; one `.hl`):
```tsx
<span className="scene-eyebrow">Your AI · 01</span>
<h1 className="scene-h1">Enter <em className="hl">ZAKI&rsquo;s mind.</em></h1>
<p className="scene-lede">Not a tool you manage. A mind that&rsquo;s with you — and lifts what you&rsquo;re carrying.</p>
<div className="scene-cta">
  <a className="btn btn-primary btn-lg" href={signupUrl}>Enter ZAKI&rsquo;s mind
    <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </a>
</div>
```
Add, as the last child of `#hero` (sibling of `.scene-inner`, before `.scene-cue`):
```tsx
<img className="scene-zee zee-hero" src="/zaki/bot/wave.png" alt="" aria-hidden="true" />
```

- [ ] **Step 2: Add Zee CSS** to `zaki-scenes.css`:
```css
.scene-zee { position: absolute; z-index: 1; pointer-events: none; image-rendering: pixelated;
  width: clamp(72px, 9vw, 128px); height: auto; opacity: 0; }
.scene-zee.is-in { opacity: 1; transition: opacity .8s ease, transform .8s ease; }
.zee-hero { right: clamp(20px, 6vw, 96px); bottom: clamp(24px, 8vh, 90px); }
@media (max-width: 720px) { .scene-zee { width: 64px; } }
```

- [ ] **Step 3: Reveal Zee on enter.** In `zaki-mind.js`, in the choreography block, after the hero pin, add:
```js
    [].forEach.call(document.querySelectorAll('.scene-zee'), function (z) {
      ST.create({ trigger: z.closest('.scene'), start: 'top 80%', once: true,
        onEnter: function () { z.classList.add('is-in'); } });
    });
```

- [ ] **Step 4: Verify.** Build (22 routes). Preview + Playwright: assert `#hero .hl` text is `ZAKI’s mind.`, exactly one `.hl` in `#hero`, `.zee-hero` present, hero pin still registered (`getAll().filter(s=>s.pin).length >= 1`), no console errors. Screenshot the hero — confirm massive type, Zee peeking, grounded-dark palette.

- [ ] **Step 5: Commit.**
```bash
git add src/pages/HomeV4.tsx public/zaki/styles/zaki-scenes.css public/zaki/scripts/zaki-mind.js
git commit -m "feat(website): Scene 1 threshold — copy + Zee companion"
```

---

## Task 3: Scene 2 — Intention + carried-goal token

**Files:**
- Modify: `src/pages/HomeV4.tsx` (`#intention` → `.scene`, keep intent-capture blocks verbatim, add token)
- Modify: `public/zaki/styles/zaki-scenes.css` (token + intent-in-scene styles)
- Modify: `public/zaki/scripts/zaki-mind.js` (token show-on-capture, travels with altitude)

**Interfaces:**
- Consumes (READ-ONLY, owned by `zaki-chapters.js`): `#intent-pick`, `#intent-form`, `#intent-input`, `#intent-remembered`, `#intent-value`, `localStorage['zaki_intent_v1']`, and the `body.has-intent` class + `[data-intent-echo]` echo it already drives.
- Produces: a `#goal-token` element (fixed, rises with `--altitude`) showing the captured goal; relies on `zaki_intent_v1` already populated by the existing writer.

- [ ] **Step 1: Rebuild `#intention` as a `.scene`** (stage left as `data-stage="dark"` for fallback, but the rising palette governs), preserving the three intent-capture blocks verbatim (lift them in unchanged — `#intent-pick`, `#intent-form`, `#intent-remembered`). Headline accent on `move forward`:
```tsx
<section className="scene" data-stage="dark" data-reveal data-screen-label="02 Begin" id="intention">
  <div className="scene-inner">
    <span className="scene-eyebrow">Begin · 02</span>
    <h2 className="scene-h1">What are you trying to <em className="hl">move forward?</em></h2>
    <p className="scene-lede">Name one thing. From here, the page is about that — and so is ZAKI.</p>
    {/* PASTE the existing #intent-pick, #intent-form, #intent-remembered blocks here, unchanged */}
  </div>
  <img className="scene-zee zee-left" src="/zaki/bot/wave.png" alt="" aria-hidden="true" />
</section>
```

- [ ] **Step 2: Add the goal token markup** as a direct child of the page root (next to `#scroll-progress`):
```tsx
<div id="goal-token" aria-hidden="true"><span className="gt-dot"></span><span className="gt-text"></span></div>
```

- [ ] **Step 3: Token CSS** in `zaki-scenes.css`:
```css
#goal-token { position: fixed; left: 50%; z-index: 60; transform: translateX(-50%);
  /* rises from ~80vh (capture) toward ~12vh (summit) as altitude climbs */
  top: calc(82vh - var(--altitude) * 70vh);
  display: none; align-items: center; gap: 8px; padding: 7px 14px; border-radius: 99px;
  background: color-mix(in oklab, var(--bg), var(--brand) 14%); border: 1px solid var(--brand-30);
  font-family: 'DM Mono', ui-monospace, monospace; font-size: 12px; color: var(--ink-1);
  box-shadow: 0 0 24px var(--brand-20); pointer-events: none; max-width: 60vw; }
body.has-intent #goal-token { display: inline-flex; }
#goal-token .gt-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--brand); }
#goal-token .gt-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (max-width: 720px) { #goal-token { display: none !important; } }
.zee-left { left: clamp(20px, 6vw, 96px); bottom: clamp(24px, 8vh, 90px); }
```

- [ ] **Step 4: Populate the token from the stored goal** in `zaki-mind.js` (read-only of the existing key + class):
```js
  (function () {
    var t = document.getElementById('goal-token'); if (!t) return;
    var txt = t.querySelector('.gt-text');
    function sync() {
      try { var v = JSON.parse(localStorage.getItem('zaki_intent_v1') || 'null');
        if (v && v.text) { txt.textContent = v.text; } } catch (e) {}
    }
    sync();
    // the existing writer toggles body.has-intent; re-read shortly after a submit
    var mo = new MutationObserver(sync);
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('storage', sync);
  })();
```
(Add `mo.disconnect()` to teardown.)

- [ ] **Step 5: Verify.** Build (22 routes). Preview + Playwright: click a chip → assert `body.has-intent` true, `#goal-token` display !== none, `.gt-text` equals the chip's goal, `localStorage.zaki_intent_v1` set. Scroll down → assert `#goal-token` `top` decreases (rises). Reload → token persists. Confirm exactly one `.hl` in `#intention`. Screenshot. No console errors, no horizontal overflow.

- [ ] **Step 6: Commit.**
```bash
git add src/pages/HomeV4.tsx public/zaki/styles/zaki-scenes.css public/zaki/scripts/zaki-mind.js
git commit -m "feat(website): Scene 2 intention — editorial + carried-goal token"
```

---

## Task 4: Scene 3 — Agent (pinned, run executes on scroll)

**Files:**
- Modify: `src/pages/HomeV4.tsx` (`#agent` → `.scene` statement + the run panel kept, simplified)
- Modify: `public/zaki/styles/zaki-scenes.css` (agent panel layout within a scene)
- Modify: `public/zaki/scripts/zaki-mind.js` (pin `#agent`, scrub the run phases by progress)

**Interfaces:**
- Consumes: existing run markup `#run`, `#run-phases li`, the task line with `[data-intent-echo]` (the existing echo already injects the goal here).
- Produces: a pinned ScrollTrigger that adds `.done` to `#run-phases li` in sequence as pin progress 0→1.

- [ ] **Step 1: Rebuild `#agent`** as a `.scene` with the headline + lede + CTA (accent `does the work.`), and keep the run panel (`#run` with `#run-phases`, task line carrying `data-intent-echo`) as the scene's visual, simplified to phases + the task line + Zee (working pose). Copy verbatim from spec §3 Scene 3. Keep `#run`, `#run-phases`, `#run-task-v`'s `data-intent-echo`. Drop the tools/deliverables sub-panels if they crowd the cinematic frame (optional — keep if they read clean at scene scale).

- [ ] **Step 2: Pin + scrub the run** in `zaki-mind.js`:
```js
  (function () {
    var run = document.getElementById('agent'); if (!run || reduce) return;
    var phases = [].slice.call(document.querySelectorAll('#run-phases li'));
    if (!phases.length) return;
    gsap.timeline({ scrollTrigger: { trigger: run, start: 'top top', end: '+=120%', pin: true, scrub: 0.5,
      onUpdate: function (self) {
        var k = Math.floor(self.progress * phases.length);
        phases.forEach(function (li, i) { li.classList.toggle('done', i < k); li.classList.toggle('active', i === k); });
      } } });
  })();
```
(Existing `zaki-chapters.js` run choreography also targets `#run-phases`; the IntersectionObserver play there is harmless but to avoid a double-driver, the pin's `onUpdate` is authoritative — verify no fight; if it fights, the existing IO play self-completes once and the scrub takes over.)

- [ ] **Step 3: Verify.** Build (22 routes). Preview + Playwright: assert `#agent` pin registered (`getAll().filter(s=>s.pin && s.trigger.id==='agent').length===1`); set goal in Scene 2 then scroll to `#agent` and assert the task line text contains the goal (echo); scrub by setting scroll positions across the pin and assert the count of `#run-phases li.done` increases monotonically 0→6. Mobile (`pointer:coarse` emulation): assert the agent pin is NOT created (Task 9 gating) — defer that assert to Task 9. Screenshot mid-run. No errors.

- [ ] **Step 4: Commit.**
```bash
git add src/pages/HomeV4.tsx public/zaki/styles/zaki-scenes.css public/zaki/scripts/zaki-mind.js
git commit -m "feat(website): Scene 3 agent — pinned run executes on scroll, on your goal"
```

---

## Task 5: Scene 4 — It remembers you (living memory graph)

**Files:**
- Modify: `src/pages/HomeV4.tsx` (`#memory` → `.scene` + a graph host + the memory list kept as data source)
- Modify: `public/zaki/styles/zaki-scenes.css` (graph host)
- Modify: `public/zaki/scripts/zaki-mind.js` (canvas graph: nodes from `#mem-list`, goal at center)

**Interfaces:**
- Consumes: existing `#mem-list .mem-item` (the memory items; the Project item carries `data-intent-echo` = the goal).
- Produces: a `<canvas>` inside `#mem-graph`; a small graph renderer on the shared ticker with full teardown; respects reduce (static frame) and no-canvas (the list stays visible as fallback).

- [ ] **Step 1: Rebuild `#memory`** as a `.scene` (headline accent `the person`, copy from spec). Keep `#mem-list` (the items are the graph's data + the no-canvas fallback) inside the scene, plus add `<div id="mem-graph" aria-hidden="true"></div>` and Zee (heart pose).

- [ ] **Step 2: Graph CSS:** `#mem-graph { position: relative; width: 100%; max-width: 720px; aspect-ratio: 16/10; }` and on canvas-capable: `html:not(.no-canvas) #memory .mem-list { /* optional: visually de-emphasize, graph leads */ }` (keep list in DOM for a11y).

- [ ] **Step 3: Canvas graph** in `zaki-mind.js` — read labels from `#mem-list .mem-text` (the Project node = the goal, placed at center, brand-red), others orbit; soft links to center; gentle drift; cursor parallax; tier/DPR clamp; pause off-screen + on `document.hidden`; full destroy. (Reuse the data/visual approach from the retired `zaki-constellation.js` — it already builds a center+ring node graph with drift, ripples, pointer reaction; port that into a `buildMemGraph()` reading the real memory items, center node = goal.) On no-WebGL/no-canvas → add `html.no-canvas`, skip; list remains.

- [ ] **Step 4: Verify.** Build (22 routes). Preview + Playwright: assert `#mem-graph canvas` exists and is sized; assert the center node label equals the goal when set (or the Project item text otherwise). Reduced-motion emulation → assert no rAF graph (one static frame or list-only), no errors. Screenshot. Route `/ → /pricing → /` and assert no leaked canvas/rAF (graph teardown).

- [ ] **Step 5: Commit.**
```bash
git add src/pages/HomeV4.tsx public/zaki/styles/zaki-scenes.css public/zaki/scripts/zaki-mind.js
git commit -m "feat(website): Scene 4 memory — living graph centered on your goal"
```

---

## Task 6: Scene 5 — Every world (layered worlds + facets)

**Files:**
- Modify: `src/pages/HomeV4.tsx` (`#spaces` → `.scene` + spaces window kept + facet rows)
- Modify: `public/zaki/styles/zaki-scenes.css` (facets — re-add the `.scene-facets` rules; worlds layout)

**Interfaces:**
- Consumes: existing spaces window demo markup (kept as the lead visual).
- Produces: `.scene-facets` styled rows (Live/Soon).

- [ ] **Step 1: Rebuild `#spaces`** as a `.scene` (headline `One mind.\nEvery part of <em class="hl">your life.</em>`, copy from spec). Keep the spaces window demo as the lead panel; add the `.scene-facets` list (Spaces Live; Design/Learn/Career Soon) verbatim from spec; CTA `Open Spaces` → `/spaces`; Zee (between-worlds pose).

- [ ] **Step 2: Re-add `.scene-facets` CSS** (it was removed in the revert) to `zaki-scenes.css`:
```css
.scene-facets { list-style: none; margin: clamp(28px,4.5vh,48px) 0 clamp(32px,5vh,50px); padding: 0; max-width: 580px; }
.scene-facets li { display: flex; align-items: center; gap: 14px; padding: 16px 2px; border-top: 1px solid var(--hair); }
.scene-facets li:last-child { border-bottom: 1px solid var(--hair); }
.scene-facets b { font-family: 'Cabinet Grotesk', system-ui, sans-serif; font-weight: 700; font-size: 18px; color: var(--ink-1); min-width: 88px; }
.scene-facets span { font-family: 'DM Mono', ui-monospace, monospace; font-size: 12px; color: var(--ink-3); margin-right: auto; }
.scene-facets i { font-family: 'DM Mono', ui-monospace, monospace; font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; padding: 3px 10px; border-radius: 99px; font-style: normal; }
.fct-live { color: var(--teal-900); background: var(--teal-12); }
.fct-soon { color: var(--ink-3); background: var(--hair); }
```

- [ ] **Step 3: Verify.** Build (22 routes). Preview + Playwright: 4 `.scene-facets li`, exactly one `.hl` in `#spaces`, `Live` on Spaces + `Soon` on the other three, no horizontal overflow. Screenshot (brightening palette here). No errors.

- [ ] **Step 4: Commit.**
```bash
git add src/pages/HomeV4.tsx public/zaki/styles/zaki-scenes.css
git commit -m "feat(website): Scene 5 worlds — spaces + honest Soon facets"
```

---

## Task 7: Scene 6 — Because you let it (trust set-piece)

**Files:**
- Modify: `src/pages/HomeV4.tsx` (`#trust` → `.scene` + the boundary scene kept)
- Modify: `public/zaki/styles/zaki-scenes.css` (boundary within a scene)

**Interfaces:**
- Consumes (READ-ONLY, owned by `zaki-chapters.js`): `#boundary-scene`, `#boundary-presence`, `#boundary-wait`, `.permission-card`, `.pc-btn.approve/.deny` and their existing approve/deny handlers.

- [ ] **Step 1: Rebuild `#trust`** as a `.scene` (headline `It knows you\nbecause <em class="hl">you let it.</em>`, copy from spec). Keep the boundary scene + permission card markup verbatim (the JS handlers stay working). CTA `Read the security model` → `/story`; Zee (waiting pose) at the boundary line.

- [ ] **Step 2: Verify.** Build (22 routes). Preview + Playwright: click `.pc-btn.approve` → assert `.permission-card.approved`; reload + click `.pc-btn.deny` → assert `.permission-card.denied`. One `.hl` in `#trust`. Screenshot (near-summit, warm). No errors.

- [ ] **Step 3: Commit.**
```bash
git add src/pages/HomeV4.tsx public/zaki/styles/zaki-scenes.css
git commit -m "feat(website): Scene 6 trust — interactive permission set-piece"
```

---

## Task 8: Scene 7 — The summit (resolved goal, brightest)

**Files:**
- Modify: `src/pages/HomeV4.tsx` (`#cta` → `.scene`, resolved-goal CTA preserved)
- Modify: `public/zaki/styles/zaki-scenes.css` (summit brightness boost + dawn glow)

**Interfaces:**
- Consumes: `#cta-primary .cta-label` (the existing `zaki-chapters.js` echo sets it to `Continue: <goal>` when a goal is stored, else `Enter ZAKI's mind`).

- [ ] **Step 1: Rebuild `#cta`** as a `.scene` (two-line headline ending `the next chapter <em class="hl">alone.</em>`, copy from spec). Preserve `#cta-primary` with `.cta-label` verbatim + the ghost `Read the story` → `/story`. Zee (triumph/sunglasses pose) standing at the top. Add a `.scene-glow` dawn gradient.

- [ ] **Step 2: Summit brightness** in `zaki-scenes.css` — at the page bottom `--altitude` ≈ 1 already makes it light; add `#cta .scene-glow { background: radial-gradient(80% 60% at 50% 30%, rgba(255,210,140,.18), transparent 70%); }` for the dawn-gold.

- [ ] **Step 3: Verify.** Build (22 routes). Preview + Playwright: scroll to `#cta`; assert body bg is light (altitude≈1) and AA contrast holds; set a goal in Scene 2, scroll to `#cta`, assert `.cta-label` text starts with `Continue:` and contains the goal; one `.hl` (`alone.`) in `#cta`. Screenshot the summit. No errors, no overflow.

- [ ] **Step 4: Commit + DEPLOY the full ascent to staging** (first full deploy of all 7 scenes; follow the Global Constraints deploy flow; discriminator: `grep -c "goal-token"` on the served homepage ≥ 1, 3 consecutive). Verify live on `https://staging.chatzaki.com`: 7 scenes, pins on hero+agent(+trust if pinned), palette climbs, no console errors, no overflow.

---

## Task 9: Polish — mobile, performance, accessibility, Zee art, copy final

**Files:**
- Modify: `public/zaki/scripts/zaki-mind.js` (mobile gating, perf, visibility)
- Modify: `public/zaki/styles/zaki-scenes.css` (mobile type/spacing)
- Modify: `src/pages/HomeV4.tsx` (final copy + final Zee art paths)

- [ ] **Step 1: Mobile gating.** In `zaki-mind.js`, wrap all pin creations (hero, agent, trust) so that under `matchMedia('(pointer:coarse)').matches` they are NOT created (scenes free-scroll; the agent run plays once via IntersectionObserver instead of scrub; the token is already hidden ≤720px). Verify at 390px: no pins, no horizontal overflow, all scenes legible, palette still climbs.
```js
var coarse = matchMedia('(pointer:coarse)').matches;
// guard each `pin: true` timeline: if (!coarse) { …create pin… } else { …play-once fallback… }
```

- [ ] **Step 2: Performance.** Confirm: canvas only in Scene 4; DPR clamp ≤2 (already); demos lazy (graph builds on first enter via ScrollTrigger, not at load); `gsap.ticker` callbacks paused on `document.hidden` (altitude + graph check `document.hidden`). Throttle CPU 4× in DevTools; assert no permanent <30fps. Record.

- [ ] **Step 3: Accessibility full pass.** `prefers-reduced-motion` emulation → no pins, instant reveals, altitude held at 0 (grounded, legible), graph static/absent, all copy + CTAs reachable, tab order sane. Re-verify AA contrast across the climb (Task 1 ratios still hold with final copy). Keyboard: every CTA + the intent form reachable and operable.

- [ ] **Step 4: Final copy + Zee art.** Replace any draft copy with the spec §3 verbatim copy. Swap in the final Zee pose art per scene (use the asset list filenames once provided; until then keep the existing `/zaki/bot/*.png` mapped per beat). One `.hl` per scene — re-assert across all 7.

- [ ] **Step 5: Full-page verification + deploy.** Build (22 routes). Full scroll-through at 1440 and 390: no console errors, `scrollWidth===clientWidth` at both, ~7 scenes, the climb reads as one rising arc, Zee present per beat, the goal threads hero→agent→memory→summit. Deploy to staging (Global Constraints flow), re-verify live.

- [ ] **Step 6: Commit.**
```bash
git add -A
git commit -m "feat(website): ascent polish — mobile, perf, a11y, final copy + Zee"
```

---

## Self-Review (done by author)

- **Spec coverage:** §2 visual/motion → Task 1 (palette/altitude) + per-scene motion. §3 all 7 scenes → Tasks 2–8 (one each), copy verbatim. §4 carried-goal thread → Task 3 (token) + echoes in Tasks 4 (memory center), 8 (CTA label). §5 build approach → Task 1 (engine, StrictMode), scene-as-unit throughout, mobile/perf/a11y → Task 9. §6 assets → Task 9 Step 4 (art swap; non-blocking). §7 sequence → task order matches. §8 out-of-scope honored (no Arabic, no new claims). No gaps.
- **Placeholders:** none — each step has real code or an exact command + expected result. The Zee art filenames are the one intentional late-bind (Task 9 Step 4), with existing `/zaki/bot/*.png` as the working default until assets arrive.
- **Type/name consistency:** `--altitude`, `#goal-token`/`.gt-text`, `#mem-graph`, `.scene-zee`/`.is-in`, `.scene-facets`, `#run-phases li.done` used consistently across tasks. Deploy discriminators differ per task (intentional).

---

## Out of scope (this plan)

Arabic/RTL, the other product pages, net-new product features. Per spec §8.
