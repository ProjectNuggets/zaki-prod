# ZAKI Homepage — SCRAMBLE Redesign Spec

> **One implementable spec.** Consolidates the differentiator research, the 8-scene flow, the scramble visual system, and the final copy into a single buildable plan.
>
> **The signature:** every word on the page is *born scrambled and resolves into clarity*, and a faint field of glyphs churns behind it and settles as you scroll. The whole page is one motion — **scramble → clarity** — which *is* the argument: ZAKI takes the noise of your day and makes sense of it.
>
> **Positioning (code-verified):** "A persistent personal AI agent with graph memory that can reason, work, use tools, control a browser safely, and explain its usage." North Star: "ZAKI is the user-owned AI operating system." The page sells four messages — **Enter ZAKI's mind** (open), **ZAKI is a day-to-day AI** (middle), **Never build alone** / **Never start the next chapter alone** (close).

---

## 0. GROUND TRUTH — what the code actually is (verified, do not assume)

All paths absolute. Read before editing.

| Concern | Reality |
|---|---|
| Markup | `/Users/nova/Desktop/zaki-prod/website/src/pages/HomeV4.tsx` — React, SSR-prerendered. Scripts are vanilla, injected client-only. |
| Script loader | `/Users/nova/Desktop/zaki-prod/website/src/hooks/useZakiPage.ts` — `useZakiHomePage()`. Ordered, `async=false`, `data-zaki`-tagged. `HOME_SCRIPTS = [zaki-home, zaki-chapters, zaki-mind, zaki-constellation]` after `VENDOR_SCRIPTS = [gsap, ScrollTrigger, lenis]`. `HOME_CSS = [foundation, home, chapters, mind]`. |
| **The scramble engine ALREADY EXISTS** | `/Users/nova/Desktop/zaki-prod/website/public/zaki/scripts/zaki-mind.js` (248 lines) already implements **(A)** `window.ZakiScramble` text engine (L36–87, auto-binds `[data-scramble]` via IntersectionObserver @ threshold 0.6), **(B)** the ambient field `buildField()` (L93–193), and **(C)** full teardown in `__zakiMind.destroy` (L235–247). It renders on the **shared `gsap.ticker`** (L230), not a separate rAF. **This spec extends what's there — it does NOT create a new `zaki-scramble.js` file.** |
| Field host | `buildField()` looks for `document.getElementById('mind-field')` (L94). **That element does NOT exist in `HomeV4.tsx` yet** — so the field currently no-ops. Adding the host turns it on. |
| Field CSS | `zaki-mind.css` is 22 lines (Lenis support + overflow guard only). Its own header says "The WebGL `#mind-field` host, theming, and fallbacks land in Stage 2." **Field styling is not written yet.** |
| Stale duplicate | `/Users/nova/Desktop/zaki-prod/website/public/zaki/scripts/zaki-home.js` **L392–407** still has the old standalone SCRAMBLE IIFE binding `.kicker, .fcol-k`. This **double-binds** with the new engine. Must be removed (see Build Step 6). |
| `splitHeadline` conflict | `zaki-home.js` L60–88 rewrites `#hero-h1` innerHTML on `fonts.ready` (builds `.hl-line > .hl-inner`, adds `.lit`). The headline scramble must compose with it, not fight it (see Scene 1 + Build Step 1). |
| Teardown contract | `useZakiPage.ts` `cleanup()` calls `window.__zakiMind.destroy()` **before** removing `<script>`s. Any rAF/observer/canvas MUST be torn down there or it leaks across SPA nav (explicitly-fixed bug — do not reintroduce). The existing `destroy` already handles the field, scrambleIO, lenis, ticker. |
| Reduced-motion | `var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches` in both files. `scrambleEl` early-returns to final text (L43); `buildField` returns null (L95). |
| Kill switches | `html.no-anim` (`zaki-home.js` L18 `forceVisible()` failsafe when rAF never ticks), `reduce`, and the `mind-on` gate (`docEl.classList.add('mind-on')` only when Lenis is live, L210). |
| Smooth scroll | Lenis is **local** to `zaki-mind.js` (L201). The field reads `lenis.velocity` directly (L146) — already wired, no `window.__zakiScroll` channel needed. `lenis.on('scroll', ST.update)` already wired (L206). |
| Theming | `body[data-stage="dark"|"light"]` flips tokens (`zaki-home.js` L99–106 toggles the attribute by scroll). Dark `--bg:#0C0A09`, `--ink-1:#F4EFE7`. Light `--bg:#F8F2E9`, `--ink-1:#1F1A14`. Brand `--red-700:#f10202`, `--teal-900:#219171`. Field already reads stage and tints (L134–137: warm-white `240,234,222` on dark, ink `26,22,18` on light). |
| Section ids (confirmed) | `hero, reframe, intention, agent, memory, spaces, design, learn, career, day, trust, story, cta` — each `<section data-stage data-screen-label>`. |
| Eyebrow format | `.kicker` contains `<span class="ix">NN</span>` + trailing text node; `.fcol-k` in footer. The OLD engine targeted `k.lastChild` (the trailing text). |
| Key elements | Hero headline `h1#hero-h1.display-xl[data-split]` with `<em class="hl">`. CTAs `.btn-primary.btn-lg`, `#cta-primary .cta-label`. Constellation host `#cta .resolve-con[data-constellation]`. Rail `#chap-rail`, progress `#scroll-progress`. Hero art wrapper `.hero-atlas`. |

**Z-index map (where the field sits):**
```
grain ............ 90
nav ............. 100
scroll-progress . 120
thread-svg ........ 2
.wrap (content) ... 3   ← all text
hero-atlas ........ 0
>>> #mind-field .. -1   ← the ambient field host (NEW in markup + CSS)
```

---

## 1. THE THROUGH-LINE

One motion: **scramble → clarity**. The day starts as noise — scattered glyphs, open loops, a head full of tabs. You step into ZAKI's mind and watch the noise *resolve*. Each scene resolves one more thing, until the final scene resolves the last word: **alone → together**.

**Emotional arc:** Awe (enter the mind) → Recognition (this is my day) → Relief (it acts) → Being-known (it remembers me) → Trust (I own this) → Belonging (never alone).

Twelve existing chapters collapse into **8 scenes**, each ONE idea, full-screen.

**Two coordinated scramble layers, present on every scene:**

- **The Scramble Field (ambient backdrop)** — one fixed full-bleed glyph field behind all content. Its density/order is the scroll's emotional readout: turbulent at the top, calming and thinning as you descend; near-still by the final scene. One continuous organism, never a per-section gimmick. Reacts to cursor (brightens within a radius) and scroll velocity (agitates while you fling). **This is `buildField()` in `zaki-mind.js`, currently dormant** — turned on by adding the `#mind-field` host + CSS and extending it to track the scroll-position gradient.
- **Scramble Resolve (foreground type)** — every eyebrow, headline, and key noun arrives scrambled and decodes into clarity on enter, with differentiated modes per scene role so it never feels like one repeated trick. **This is `window.ZakiScramble` + `[data-scramble]`, already implemented** — extended with a `data-scramble-mode` attribute and scene wiring.

`#chap-rail` stays — now **8 dots**, one per scene.

---

## 2. THE 8 SCENES — copy + DOM map

Each scene reuses an existing `HomeV4.tsx` section id. Accent/scramble-emphasis words are **bold**. Eyebrows use the existing `.ix` index + mono-label pattern and are tagged `[data-scramble][data-scramble-mode]`.

### Scene 1 — ENTER THE MIND · `#hero`
**Single idea:** Not a chatbot you open. A mind you step inside.
**Role:** Threshold. Awe + invitation. Lands message #1.
**Scramble mode:** `line` — headline resolves out of **max-turbulence** field one beat after load. Eyebrow `ENTER · 01` decodes first as the entry tick. The hero art (`.hero-atlas`, `#presence`) is the densest node of the field.
**Differentiator:** ONE intelligence with ONE memory, not five tools — established as a *place* before any feature (Differentiator #5).

- **Eyebrow:** `ENTER · 01`
- **Headline:** Enter **ZAKI's** **mind.** *(both words decode last, out of the storm)*
- **Subhead:** Not a chatbot you open. A mind you step inside — one intelligence that holds your whole life in view.
- **Body:** Most AI forgets you the moment you close the tab. ZAKI doesn't. One memory, one mind, working across everything you're trying to move forward.
- **CTA:** `Enter ZAKI's mind` · `Scroll to begin` (cue, with the first chapter dot pulsing)
- **DOM action:** Replace the H1 text "Whatever comes next, ZAKI is on your side." with the "Enter ZAKI's mind." statement (keep `id="hero-h1"`, `data-split`, and the `<em class="hl">` wrapper around the words that decode last). Keep `#presence`, `#hero-glow`, `#hero-dots`.

### Scene 2 — THIS IS YOUR DAY (the noise) · `#reframe`
**Single idea:** Your day is scattered across a dozen tools and a hundred open loops. That scatter is the enemy.
**Role:** Recognition + tension. **New scene** — names the problem so the resolution can land. Grounds "ZAKI is a day-to-day AI" (#4).
**Scramble mode:** `keyword` — headline resolves cleanly; day-debris fragments float in the field and **refuse to decode** (they jitter). The single word **"alone"** flickers in the noise — first planting of the closing payoff.
**Differentiator:** Day-to-day, personal, real-life surface area — the everyday problem only a personal AI owns.

- **Eyebrow:** `THE NOISE · 02`
- **Headline:** A day is a hundred **open loops.**
- **Subhead:** Scattered across a dozen tools, a hundred tabs, and everything you meant to get back to.
- **Body:** Reply to that. Find where you saved it. Follow up Monday. Each tool knows a sliver of you and nothing about the rest. So the work of holding it all together stays where it always was — on you. Doing it **alone.**
- **No CTA** — this scene is tension, not action.
- **DOM action:** Repurpose `#reframe`. Drop the existing "an agent / when the work is complex" morph copy (`.reframe-morph`, `#morph-word`); the "one intelligence" idea is now *shown* via the field, not told.

### Scene 3 — TELL IT WHAT'S NEXT (intention) · `#intention`
**Single idea:** Name the one thing you're trying to move forward — and the page becomes yours.
**Role:** The hinge. Reader participates; the journey personalizes.
**Scramble mode:** `reverse` — when the user picks/types intent, their clear words **dissolve into glyphs, get pulled into the field, and re-resolve** as a clean intention card. ZAKI ingesting chaos, returning order. Sets `data-intent-echo` for downstream scenes.
**Differentiator:** Intention → motion. ZAKI starts from *what you want to move forward*, not a blank prompt box.

- **Eyebrow:** `BEGIN · 03`
- **Headline:** What are you trying to **move forward?**
- **Subhead:** Name one thing. From here, the page is about that — and so is ZAKI.
- **Body:** Pick one, or say it in your own words. It stays on this device, shapes everything below, and you can forget it anytime. This is how ZAKI starts — not with a blank prompt, but with what actually matters to you.
- **Chips (keep existing):** Move a project forward · Bring an idea to life · Understand something difficult · Find the right opportunity · Organize everything around me
- **Input placeholder:** `…or type it: "Launch my design portfolio"`
- **Submit:** `Remember`
- **Remembered state:** `Remembered for this visit` — *ZAKI will use this below, and nowhere else.*
- **DOM action:** Keep `#intent-pick`, `#intent-form`, `#intent-input`, `#intent-remembered`, `#intent-value`, and the `localStorage zaki_intent_v1` capture intact. Add `reverse` scramble on submit; write the captured value to a `data-intent-echo` attribute (or a small `window.__zakiIntent`) read by Scenes 4, 5, 8.

### Scene 4 — IT ACTS FOR YOU (Agent) · `#agent`
**Single idea:** Give it the outcome; it plans, acts, and follows through.
**Role:** First relief. The flagship proof.
**Scramble mode:** `progress` — phase rows arrive scrambled and **decode one by one as each step completes**. Task statement resolves into the user's own intent (`data-intent-echo`). Tool chips snap from glyphs to labels as they fire.
**Differentiator:** Agent = ZAKI in action — observable multi-step execution, tools, deliverables, approvals (Differentiators #1, #7).

- **Eyebrow:** `IN ACTION · 04`
- **Headline:** Give it the outcome. **It does the work.**
- **Subhead:** Not an answer you copy out. A result you can use — built step by step, where you can watch.
- **Body:** ZAKI plans, researches, uses tools, creates the files, and follows through — then stops at something done, not something you still have to finish. Every step is visible. You can pause it, approve it, or take the wheel. This is what acts-not-chats actually means.
- **Run task line (resolves to user's intent):** "Research the partners, rank them, draft the outreach, and put the final list in a sheet — for **my design portfolio**."
- **Phase labels (decode in sequence):** Understanding the outcome → Building the criteria → Researching → Validating the shortlist → Creating the deliverables → **Ready for review**
- **Learned chip:** `Learned · put the evidence beside every recommendation`
- **CTA:** `Start with the Agent`
- **DOM action:** Keep `#run`, `#run-phases`, `#run-tools`, `#run-deliverables`, `#run-learn`. Wire phase-label `progress` decode to the existing run animation timeline. Inject `data-intent-echo` into the task line.

### Scene 5 — IT REMEMBERS YOU (Brain) · `#memory`
**Single idea:** It remembers the *person*, not just the prompt — one memory across everything.
**Role:** The emotional core. Being known. Makes "never alone" earned.
**Scramble mode:** `inverse` — memories **resolve OUT of the calming field and stay lit** (the field visibly donates order to a persistent list). Items decode into the user's real project.
**Differentiator:** Graph memory you own and can see; ONE memory shared across products (Differentiators #2, #3, #4).

- **Eyebrow:** `CONTINUITY · 05`
- **Headline:** It remembers **the person,** not the prompt.
- **Subhead:** One memory under everything — so you never explain yourself twice.
- **Body:** Your goals, your preferences, your corrections, the people and projects that matter — ZAKI holds them as a living graph you can actually see. Not a hidden list it absorbs in the dark. You can open it, fix what's wrong, export it, or forget it. It's yours, and it carries from one product to the next.
  This is what makes the difference real: **you never build alone**, because something is always holding the thread for you.
- **Memory items (decode into user's intent):** Preference · *You do deep work best before noon* · Project · **Launch my design portfolio** · Correction · *Put evidence beside every recommendation* · Deadline · *Investor update — every other Monday*
- **Controls:** `Inspect` · `Correct` · `Forget`
- **Link:** `See how memory stays yours →`
- **DOM action:** Keep `#mem-panel`, `#mem-list`. Wire `inverse` decode of memory items; inject `data-intent-echo` into the Project item.

### Scene 6 — A WORLD FOR EACH THING (Spaces + suite) · `#spaces`
**Single idea:** One mind, many worlds — every part of your life gets its own space, all sharing the same memory.
**Role:** Scale without sprawl. Where 12→8 does its heaviest lifting (folds Design/Learn/Career in).
**Scramble mode:** `split` — the resolved headline **splits and re-scrambles into the worlds**, each label decoding from the *same* glyph field (same DNA), proving they're one intelligence wearing different forms.
**Differentiator:** Spaces = worlds for your work; the suite as *contexts of one OS*, one shared memory (Differentiator #5, #15).

- **Eyebrow:** `MANY WORLDS · 06`
- **Headline:** One mind. **Many worlds.**
- **Subhead:** A space for every part of your life — all drawing on the same memory of you.
- **Body:** Give each project, class, or client its own world: shared documents, as many threads as you need, nothing leaking between them. And the same intelligence shows up in the form each moment needs — without ever making you start over or re-introduce yourself.
  One login. One memory. One ZAKI, wearing the shape the work calls for.
- **Facet cards (each label decodes from the shared field):**
  - **Spaces** — *In context · Live* — Every conversation in its own world, on shared docs.
  - **Design** — *In creation · Soon* — A rough brief becomes directions you can see and shape.
  - **Learn** — *In growth · Soon* — Understand the hard part, practice, and progress your way.
  - **Career** — *In motion · Soon* — Stronger matches, follow-ups that keep moving — you approve.
- **Honesty guardrail:** Design/Learn/Career carry **`Soon`**; only Spaces is **`Live`**. (Code-verified: Learn/Hire private beta, Design waitlist.)
- **DOM action:** `#spaces` becomes the host. Fold `#design`, `#learn`, `#career` (currently their own beat sections) into compact facet cards inside `#spaces`. Remove them as standalone sections.

### Scene 7 — YOU OWN THE MIND (Trust) · `#trust`
**Single idea:** It's close enough to know you because *you* own and control the memory.
**Role:** Trust gate. Earns the closer.
**Scramble mode:** `consent` — sensitive memory items stay **scrambled/redacted until permission is granted**; toggling a boundary *decodes* the data on demand. The field is now nearly **still and ordered** — the mind is calm because it's yours.
**Differentiator:** User-owned memory, granular permission, you control what it sees (Differentiators #3, #4, #10).

- **Eyebrow:** `YOUR LIFE STAYS YOURS · 07`
- **Headline:** It knows you because **you let it.**
- **Subhead:** Close enough to be useful. Built so you stay in control of every inch of it.
- **Body:** Personal intelligence asks for personal trust, so ZAKI earns it by design. You own the memory — inspect it, correct it, scope it, delete it. ZAKI reaches a boundary and waits for you. Nothing sensitive leaves without your yes. Privacy isn't a setting buried in a menu here. It's the architecture.
- **Permission card (decodes on approval):** `Permission needed` — ZAKI is ready to send **5 outreach emails** on your behalf. · Buttons: `Not yet` · `Approve & send` · Confirm: `Sent · logged in your activity`
- **Controls:** Inspect, correct, delete memory · Scope to one Space · Approve a tool before it runs · Revoke access anytime
- **CTA:** `Read the security model →`
- **DOM action:** Keep `#boundary`, `#boundary-scene`, `#boundary-presence`, `#boundary-wait`. Wire `consent` decode to the existing permission interaction.

### Scene 8 — NEVER ALONE (the resolution) · `#cta`
**Single idea:** Whatever the next chapter is, you don't start it alone.
**Role:** Catharsis + CTA. Lands #2 and #3 together.
**Scramble mode:** `line` — final decode. The word **"alone"** (flickering since Scene 2) finally settles into **"together"** / the line completes from chaos to clarity. The field comes to **complete rest** as one constellation. The user's intent resolves one last time inside the CTA.
**Differentiator:** Continuity and companionship — ZAKI carries *your* thing forward.

- **Eyebrow:** `A NEW CHAPTER · 08`
- **Headline:** Never build **alone.** / Never start the next chapter **alone.** *("alone" settles last — the whole page resolves into it)*
- **Subhead:** Whatever comes next — the launch, the move, the idea, the year you've been putting off — you don't begin it from zero, and you don't begin it by yourself.
- **Body:** This is the chapter where intelligence is finally on your side: day to day, holding your thread, remembering what matters. Bring the first thing you want to move forward. ZAKI remembers it from here.
- **Intent echo (resolves inside CTA):** *Bring "**launch my design portfolio**." ZAKI carries it from here.*
- **CTA:** `Enter ZAKI's mind` · `Read the story` (quiet origin link folded here: *Designed by agents. Built to remember. →*)
- **DOM action:** Keep `#cta-primary`, `.cta-label`, and `.resolve-con[data-constellation]` (the constellation is the field at rest). Fold the `#story` origin teaser into the quiet link here and remove `#story` as a standalone section. Inject `data-intent-echo` into the intent-echo line.

### Message map
- **#1 "Enter ZAKI's mind"** — Scene 1 headline + Scene 8 CTA (bookends).
- **#4 "ZAKI is a day-to-day AI"** — Scene 2 (messy day) → proven in Scene 4 → sustained in Scene 8.
- **#2 "Never build alone"** — earned in Scene 5, paid off in Scene 8 line 1.
- **#3 "Never start the next chapter alone"** — Scene 8 line 2; "alone" is the word planted in Scene 2 and settled here.

### Accuracy guardrails (honored in copy)
- Design / Learn / Career labeled **Soon**, never shipped. Only Agent + Spaces shown as **Live**.
- **No prices, no model names, no "fully autonomous"** framing — Scene 7 leans on "you stay in control" (approval-gated architecture).
- No channel/connector/voice over-claims in headlines; differentiation rests on verified pillars (agent execution, graph memory, ownership, control plane).

### 12 → 8 fold map
| Old chapter (id) | Fate |
|---|---|
| 01 Hero (`hero`) | → **Scene 1** (reframed to "Enter ZAKI's mind") |
| 02 One intelligence (`reframe`) | → **Scene 2** (repurposed to "the noise"); "one intelligence" *shown*, not told |
| 03 Intention (`intention`) | → **Scene 3** (kept; personalization hinge) |
| 04 Agent (`agent`) | → **Scene 4** |
| 05 Memory (`memory`) | → **Scene 5** |
| 06 Spaces (`spaces`) | → **Scene 6** (host) |
| 07 Design / 08 Learn / 09 Career | **Folded into Scene 6** as facet cards |
| 10 A day with ZAKI (`day`) | **Folded** — "day-to-day" reframed up front as Scene 2, threaded through 4–6 |
| The origin (`story`) | **Folded** into Scene 8 as a quiet link |
| 12 A new chapter (`cta`) | → **Scene 8** (resolution) |

---

## 3. SCRAMBLE SYSTEM — implementation plan

All work lands in **`zaki-mind.js`** + **`zaki-mind.css`** (where the engine already lives) plus the `#mind-field` host in `HomeV4.tsx`. **No new script file.** All three kill switches (`reduce`, `html.no-anim`, no-WebGL) are honored — the field is canvas-2D only, so "no-WebGL" is automatic.

### 3.A — `window.ZakiScramble` text engine (extend existing, `zaki-mind.js` L36–87)

Already present: `scrambleEl(el, opts)` does a left-to-right decode on a single element (locks char `i` when `t >= i*stagger + stagger`, random glyph before lock), reduced-motion early-returns to final, auto-binds `[data-scramble]` on enter (IntersectionObserver @ 0.6), writes `el.textContent`.

**Extensions required:**

1. **`data-scramble-mode` attribute** read in the IO callback (L78) and passed into `scrambleEl`. Add a `mode` switch that only changes how per-char **lock time** `tᵢ` is distributed (one shared loop, one code path):
   - `line` (default) — current L->R wavefront. Hero, Scene 8.
   - `keyword` — only the `<em>`/marked key word(s) cycle; rest resolves instantly. Scene 2.
   - `progress` — driven externally: expose `scrambleEl(el,{progress:0..1})` so the run timeline locks chars as steps complete. Scene 4 phase rows.
   - `reverse` — clear → glyphs → re-resolve (run the loop backwards then forward). Scene 3 intent capture.
   - `inverse` — resolve + add a persistent `.lit` class so the item stays bright after settling. Scene 5.
   - `consent` — start fully scrambled and **hold** (redacted) until a `.reveal()`/class toggle releases it. Scene 7.
   - `split` — resolve, then on a trigger re-scramble into N child labels sharing the glyph pool. Scene 6 facets.
2. **Preserve child elements:** when an element has child nodes (`<span class="ix">`, `<em class="hl">`), scramble the **text node only**, never `innerHTML` — the old `.kicker` engine targeted `k.lastChild`; generalize `scrambleEl` to walk text nodes and leave element children untouched. (Prevents destroying the `.ix` index and the headline `<em>`.)
3. **Width lock:** for proportional type (headline), only scramble **after** `splitHeadline()` has laid out lines, and scramble within the resolved line spans so width is fixed (no reflow). Mono eyebrows are metric-stable already.
4. **Glyph pool:** keep the existing `GLYPHS` const (L32); optionally add a denser `block` pool for heavy `split`/transition moments. Preserve spaces; treat final punctuation as fixed anchors revealed early.
5. **Reduced-motion / no-anim:** keep L43 instant path; additionally have `zaki-home.js` `forceVisible()` call `window.ZakiScramble` targets to final (or rely on the existing `data-final` snap). IO fallback: if no `IntersectionObserver`, resolve all targets immediately (already the case — they just stay final text).

### 3.B — Ambient Scramble Field (turn on + extend `buildField`, `zaki-mind.js` L93–193)

Already present: grid of cells with resting faintness + spontaneous re-scramble + cursor focus radius (150px) + scroll-velocity agitation (reads `lenis.velocity`), tier by viewport/pointer (`high`/`mid`/`low`), DPR clamp 2, stage-tinted, pauses when host scrolls out of view, renders on shared `gsap.ticker`, full teardown. **It only no-ops because `#mind-field` is missing.**

**Required to activate + complete:**

1. **Add the host** to `HomeV4.tsx` (Build Step 3): a single fixed full-bleed div `#mind-field` at `z-index:-1`, `aria-hidden`, `pointer-events:none`, behind `.wrap`. *Currently `buildField` reads `host.clientWidth/Height` and appends a canvas — the host must be the full viewport, not just the hero, for the field to span all 8 scenes.* (The existing `vis` IntersectionObserver pauses when the host leaves view — with a viewport-fixed host that's effectively always visible, which is correct for a continuous field; keep the `document.hidden` pause via the visibility path.)
2. **Add the CSS** to `zaki-mind.css` (Build Step 3) — host positioning, per-stage opacity, `--field-ink` tint var, reduced-motion/no-anim static frame. (Spec below.)
3. **Scroll-position turbulence gradient (new):** make field intensity track *scroll progress*, not just velocity. Read `#scroll-progress` scaleX (or `scrollY / scrollHeight`) each frame and interpolate: top of page = high re-scramble rate + higher resting alpha (turbulent); bottom = low rate + lower alpha (near-still). This is the single continuous "mind settling" readout. Add ~6 lines to `render()` computing a `calm = scrollProgress` factor that scales `p.nxt` reset range and base alpha.
4. **`burst(x,y)` (new, optional):** a method that injects a short ripple of fast re-rolls centered on a point, called at scene seams (3.C). Shares the per-frame work budget so it can't blow perf.
5. **Perf budget (already mostly there):** DPR clamp 2; tier-scaled `COUNT` (high 280 / mid 150 / low 64); pause on `document.hidden`; coarse-pointer → `low`. Keep. Optionally add a frame-time EMA auto-demote if needed.

### 3.C — Scene transitions (new wiring in `zaki-mind.js`)

Driven by **ScrollTrigger** (already registered, L30) so it's Lenis-synced and refresh-safe; fall back to IntersectionObserver if ST missing.

1. **Per-scene scramble-on-enter:** for each `section[data-screen-label]`, `ST.create({trigger, start:'top 78%', once:true, onEnter})` that scrambles the eyebrow (`decode`/`line`) and headline (mode per the scene's `data-scramble-mode`). This **supersedes** the standalone IO in `zaki-home.js` (delete it, Build Step 6) to avoid double-binding.
2. **Stage-flip curtains:** at dark↔light seams (`agent` enters light, `day`/`trust` dark, `cta` resolves), optionally scrub a denser pass keyed to scroll progress (`scrub:0.6`, reuse one controller per element) so the headline assembles as you arrive.
3. **Field coupling:** on each `onEnter`, call `field.burst(eyebrowX, eyebrowY)` so the field "spends its chaos" resolving the new heading.
4. **Hero handoff:** on `#hero` `onLeave`, scramble the `#reframe` eyebrow in — so the first scroll demonstrates the signature.
5. **Reduced-motion / no-anim:** skip ST creation entirely; all type is final, field is a static frame.

---

## 4. CSS to add to `zaki-mind.css`

```css
/* ---- Ambient scramble field host ---- */
#mind-field{
  position:fixed; inset:0; z-index:-1; pointer-events:none;
  /* the field is a whisper — per-stage opacity below */
}
body[data-stage="dark"]  #mind-field{ opacity:.10; }   /* warm grey on near-black */
body[data-stage="light"] #mind-field{ opacity:.055; }  /* fainter on paper */
html.no-anim #mind-field,
@media (prefers-reduced-motion:reduce){ #mind-field{ opacity:.05; } } /* static frame */

/* tint tokens the field reads via getComputedStyle on stage change */
body[data-stage="dark"]  { --field-ink:240,234,222; }
body[data-stage="light"] { --field-ink:26,22,18; }

/* type while resolving — no layout shift, slightly dimmed mid-decode */
.is-scrambling{ opacity:.92; }
/* persistent-lit items (Scene 5 inverse mode) */
.scramble-lit{ opacity:1; }
```
*(The field currently hardcodes its tint in `tintRGB()` L136 — optionally switch it to read `--field-ink` so theme + field stay in one place.)*

---

## 5. ORDERED BUILD SEQUENCE

Hero first (most visible), then scenes, then ambient field, then transitions, then polish. Each step: exact files + how to verify on **http://localhost:4173** (vite preview). Start the server once: `npm run build && npm run preview` in `/Users/nova/Desktop/zaki-prod/website` (preview serves the prerendered `public/zaki/*` assets used here). For pure JS/CSS asset edits under `public/`, a rebuild may not be needed — hard-refresh; for `HomeV4.tsx` edits, rebuild.

### Step 0 — Baseline
- **Do:** `cd /Users/nova/Desktop/zaki-prod/website && npm run build && npm run preview`.
- **Verify:** Open http://localhost:4173. Confirm current page loads, eyebrows still glitch in (old IIFE). Open DevTools console — no errors. Note: `#mind-field` absent, so no ambient field yet.

### Step 1 — Hero (Scene 1) copy + headline scramble
- **Files:** `HomeV4.tsx` (H1 text → "Enter ZAKI's mind.", subhead, body, CTA label; keep `id`, `data-split`, `<em class="hl">`); `zaki-mind.js` (hook headline scramble onto `splitHeadline`'s `.lit` — observe `#hero-h1` for class `lit`, then scramble the text nodes inside each `.hl-inner` with `mode:'line'`, leaving `<em>`'s element intact).
- **Verify:** Reload http://localhost:4173. Hero H1 reads "Enter ZAKI's mind."; the words decode from glyphs into clarity once, right as the line-mask reveal completes; no reflow/flicker; `<em>` styling preserved. Toggle DevTools → Rendering → "Emulate prefers-reduced-motion" → headline appears instantly as final text.

### Step 2 — Scenes 2–8 copy + eyebrows + `data-scramble-mode`
- **Files:** `HomeV4.tsx` — rewrite each section's eyebrow label (`ENTER · 01` … `A NEW CHAPTER · 08`), headline, subhead, body, CTAs per §2. Add `[data-scramble][data-scramble-mode="…"]` to each eyebrow + headline. Repurpose `#reframe` (Scene 2), fold `#design`/`#learn`/`#career` into `#spaces` facet cards (Scene 6), fold `#story` into the Scene 8 link. Update `#chap-rail` to 8 dots.
- **Verify:** Scroll the page. Each section shows the new copy; eyebrows + headlines decode on enter via the existing `[data-scramble]` engine. Design/Learn/Career appear as `Soon` facet cards inside Spaces; `#story` and the standalone Design/Learn/Career sections are gone. Rail shows 8 dots. No console errors.

### Step 3 — Turn on the ambient field
- **Files:** `HomeV4.tsx` (add `<div id="mind-field" aria-hidden="true"></div>` as a fixed full-viewport host, first child of the page root / before `.wrap`); `zaki-mind.css` (add §4 CSS). `zaki-mind.js` already builds + ticks + tears down the field — no JS change needed to activate.
- **Verify:** Reload. A faint field of mono glyphs is visible behind all content, brightening near the cursor, agitating on fast scroll. Stage flip (dark→light at `#agent`) re-tints the glyphs. Reduced-motion → field renders as a static faint frame (no animation). Navigate away (SPA) and back → DevTools Performance/Memory shows no leaked rAF/canvas (teardown via `__zakiMind.destroy`).

### Step 4 — Scroll-position turbulence gradient
- **Files:** `zaki-mind.js` `render()` — read scroll progress each frame, scale re-scramble rate + base alpha from turbulent (top) to near-still (bottom).
- **Verify:** Scroll top→bottom slowly. Field is visibly busiest at the hero and calms/thins toward the CTA; at the CTA it's near-still. Scroll back up → it re-agitates.

### Step 5 — Scene transitions + field coupling
- **Files:** `zaki-mind.js` — add ScrollTrigger per-section `onEnter` scramble wiring (3.C), `field.burst()` at seams, hero→reframe handoff; add `data-intent-echo` propagation (Scenes 4/5/8) reading the Scene 3 capture; wire mode-specific behaviors (`progress` to the run timeline, `inverse` lit, `consent` hold/release, `reverse` on intent submit, `split` facets).
- **Verify:** On each scene enter the eyebrow+headline resolve in sync with Lenis scroll (not jumpy). Submit an intent in Scene 3 → it dissolves and re-resolves as a card; Scenes 4/5/8 echo "launch my design portfolio". Scene 7 permission items stay redacted until you Approve, then decode. Scene 4 phases decode one-by-one with the run. Reduced-motion → all instant, no scrub.

### Step 6 — Remove the stale duplicate engine
- **Files:** `zaki-home.js` — **delete** the SCRAMBLE IIFE at L392–407 (now superseded by `ZakiScramble` + ST wiring); in `forceVisible()` (L17) add a snap of any in-flight scramble to final.
- **Verify:** Eyebrows still decode (now via the single engine, not double-bound). No double-glitch/flicker on `.kicker`. Footer `.fcol-k` labels: confirm they still resolve (add `[data-scramble]` to them if the IIFE was their only binding).

### Step 7 — Polish
- **Files:** `zaki-mind.js` / `zaki-mind.css` — tune field opacity per stage, glyph density per tier, decode durations; verify mobile (`pointer:coarse` → `low` tier, no cursor reactivity); confirm `#scroll-progress` and `#chap-rail` (8 dots) track correctly.
- **Verify:** Full pass at 1440px and 390px widths. 60fps scroll (DevTools Performance). No layout shift. All three kill switches produce a fully legible, motion-free, working page: (a) reduced-motion, (b) `html.no-anim` (simulate by throttling rAF / offscreen), (c) no Lenis (field still ticks via gsap.ticker fallback path — confirm or gate field to `mind-on`).

---

## 6. KEEP / RESTRUCTURE / CUT

**KEEP (do not touch the mechanics):**
- `localStorage zaki_intent_v1` capture + `#intent-pick`/`#intent-form`/`#intent-remembered` (Scene 3).
- `#run`, `#run-phases`, `#run-tools`, `#run-deliverables`, `#run-learn` (Scene 4).
- `#mem-panel`, `#mem-list` (Scene 5).
- `#boundary` permission scene (Scene 7).
- `.resolve-con[data-constellation]` (Scene 8 — the field at rest).
- `#chap-rail`, `#scroll-progress`, grain, `#nav`, Thread SVG, `splitHeadline`, magnetic CTAs.
- The entire `zaki-mind.js` engine (ZakiScramble + buildField + teardown) and its `gsap.ticker` integration.

**RESTRUCTURE:**
- `#hero` H1 → "Enter ZAKI's mind." (Scene 1).
- `#reframe` → "the noise" problem scene (Scene 2); drop `.reframe-morph` morph copy.
- `#spaces` → host for Scene 6; fold `#design`/`#learn`/`#career` into facet cards within it.
- All eyebrows/headlines → new copy + `[data-scramble][data-scramble-mode]`.
- `#chap-rail` → 8 dots.
- `tintRGB()` in `zaki-mind.js` → optionally read `--field-ink` from CSS.

**CUT:**
- `zaki-home.js` L392–407 standalone SCRAMBLE IIFE (superseded).
- Standalone `#design`, `#learn`, `#career` sections (folded into `#spaces`).
- `#day` section (folded — problem reframed up front as Scene 2).
- `#story` standalone section (folded into Scene 8 link).
- `.reframe-morph` / `#morph-word` morph interaction copy.

---

## 7. WHY THIS COHERES AS ONE STORY

One mechanic carries the whole arc: scramble→clarity is the hero's-journey engine — the problem *is* scramble (Scene 2), every scene resolves one more thing, the final word resolves last (Scene 8). The field's turbulence-to-rest gradient is a single continuous visual tied to scroll position, so it can't read as 8 disconnected panels. The four messages map cleanly (no orphans, no filler). Personalization is the spine — Scene 3's intent propagates through 4, 5, and 8, so the page is literally about the reader by the end, which is what earns "never alone." And each differentiator gets exactly one scene whose scramble *demonstrates* it: Agent = resolve-as-progress, Brain = resolve-and-persist, Trust = resolve-on-consent. Form proves function.

---

## 8. FILES TOUCHED (all absolute)

- **Markup:** `/Users/nova/Desktop/zaki-prod/website/src/pages/HomeV4.tsx` — copy, eyebrows, `data-scramble-mode`, `#mind-field` host, fold Design/Learn/Career/story, 8-dot rail.
- **Engine + field + transitions:** `/Users/nova/Desktop/zaki-prod/website/public/zaki/scripts/zaki-mind.js` — extend `scrambleEl` modes, activate/extend `buildField` (scroll gradient + `burst`), add ScrollTrigger transitions + intent-echo.
- **Field CSS:** `/Users/nova/Desktop/zaki-prod/website/public/zaki/styles/zaki-mind.css` — `#mind-field` host, per-stage opacity, `--field-ink`, kill-switch frames.
- **Remove duplicate + failsafe:** `/Users/nova/Desktop/zaki-prod/website/public/zaki/scripts/zaki-home.js` — delete L392–407, extend `forceVisible()`.
- **Loader:** `/Users/nova/Desktop/zaki-prod/website/src/hooks/useZakiPage.ts` — **no change needed** (engine already in `zaki-mind.js`, already loaded; CSS already in `HOME_CSS`).
- **Tokens (reference only):** `/Users/nova/Desktop/zaki-prod/website/public/zaki/styles/zaki-foundation.css`.

**Verification URL:** http://localhost:4173 (vite preview; `npm run build && npm run preview` in `/Users/nova/Desktop/zaki-prod/website`).
