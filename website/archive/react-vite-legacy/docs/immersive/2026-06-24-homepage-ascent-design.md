# ZAKI Homepage — "The Next Chapter" (Ascent)
### Design spec · 2026-06-24

> **One line:** a cinematic, rising journey where you arrive carrying your next chapter and ZAKI lifts you into it — *a mind that's with you, never alone.*

This spec is the agreed design. It precedes the implementation plan (writing-plans). Build target: the English homepage `/Users/nova/Desktop/zaki-prod/website/src/pages/HomeV4.tsx` and the `public/zaki/` vanilla layer, deployed to `staging.chatzaki.com`.

---

## 1. The job, the feeling, the promise

- **Primary job:** make the visitor *feel the vision*. This is a cinematic emotional story, not a product tour or a conversion funnel. Product proof is woven in as *support* — moments where ZAKI visibly empowers you — never the lead.
- **The feeling:** **empowerment & possibility** — hopeful, ascendant, rising. The visitor should leave thinking *"I can do so much more now."*
- **The promise:** *a mind that's with you — never alone.* You arrive carrying something (a goal, a next chapter). The page lifts you, scene by scene, until you're standing in it — not alone.
- **References:** sui.io (bold editorial typography, scale, negative space) + everswap (cinematic scroll journey, atmosphere). sui's *look*, everswap's *soul*.
- **The four messages, and where they land:**
  - "Enter ZAKI's mind" → Scene 1 (open) + Scene 7 CTA (bookend)
  - "ZAKI is a day-to-day AI" → threaded through the copy (the companion present across your day)
  - "Never build alone" → earned in Scene 4 (it remembers you), paid in Scene 7
  - "Never start the next chapter of your life alone" → Scene 7 (the summit; the word *alone* settles last)

---

## 2. Visual & motion system — how "ascent" is *felt*

Empowerment is built into the medium, not stated. Three devices:

1. **The palette rises.** Not flat dark/light alternation — a directional climb. The page opens deep and grounded (near-black `#0C0A09`, the weight you carry) and *lifts* as you scroll — warming through, ending open and luminous (warm paper `#F8F2E9` + a dawn-gold glow) at the summit. You literally climb toward light. Driven by one global **altitude value** (scroll progress 0→1) that interpolates the background + ink tokens. Brand red `--brand #f10202` stays the energy accent throughout.
2. **The motion rises.** Elements enter from below and lift into place. Subtle upward parallax. Pacing *tightens* with altitude — early scenes breathe, later ones gain momentum toward the peak. The hero **pins and you rise out of it**; 2–3 signature scenes pin and transform; the rest reveal with upward motion.
3. **Scramble = potential resolving.** The signature, used as a *scalpel* — only the one pivotal word per scene (your goal, "mind," "alone"). Chaos resolving into capability *is* the empowerment metaphor; it earns its place only where meaning turns.

**Type:** Cabinet Grotesk Extrabold, massive (`clamp(46px, 8.4vw, 130px)`); DM Mono eyebrows; Plus Jakarta Sans body. Huge negative space.

**Zee — the companion, personified.** The playful pixel mascot is "never alone" made visible: a small presence that rises *with* you, one pose per beat (peeks you in → listens → works → stays beside you → waits → stands with you at the top). Deliberate warm/playful contrast against the serious editorial type — that contrast is the soul. Never clutters the type; sits as a small, living companion at the edge of each scene.

**Contrast is non-negotiable:** text legibility passes WCAG AA at *every* step of the rising palette (the bright/dawn end is the risk — verify dark ink on dawn-gold).

---

## 3. The 7-scene arc

A **carried-goal thread** runs through it (see §4): you name your goal in Scene 2; it travels up the page as a glowing token and resolves at the summit — so the page is literally *about you* by the end. That is what earns "never alone."

Each scene is a *different kind of moment* (the antidote to "monotone"). For each: altitude, beat, the distinct treatment, the demo distilled to its **one lift**, Zee, accent word, and copy.

### Scene 1 — Threshold · `#hero` · altitude: ground (darkest)
- **Beat:** arrival. The weight you carry; the invitation in.
- **Treatment:** pinned full-bleed editorial type. As you scroll you **rise out of it** — the line lifts and dims, handing to Scene 2. Pure, vast, minimal. Zee peeks in at the lower edge (invite/wave pose).
- **Demo:** none — type + Zee only.
- **Accent (scramble):** *mind.*
- **Copy:**
  - eyebrow: `Your AI · 01`
  - headline: `Enter ZAKI's mind.`
  - subhead: `Not a tool you manage. A mind that's with you — and lifts what you're carrying.`
  - cta: `Enter ZAKI's mind` (→ signupUrl) · scroll cue `Begin`

### Scene 2 — Your chapter · `#intention` · altitude: low, first warmth
- **Beat:** name what you're moving forward. The page becomes *yours*.
- **Treatment:** **interactive, input-led.** Pick a chip or type your goal; your words crystallize into a glowing **token** that begins its climb up the page. Zee leans in, listening.
- **Demo essence:** the existing intent capture (`#intent-pick`, `#intent-form`, `#intent-remembered`, localStorage `zaki_intent_v1`) — kept, restyled to the scene; on submit, the token visual appears.
- **Accent:** *move forward*
- **Copy:**
  - eyebrow: `Begin · 02`
  - headline: `What are you trying to move forward?`
  - subhead: `Name one thing. From here, the page is about that — and so is ZAKI.`
  - body: `Pick one or say it in your words. It stays on this device, and you can forget it anytime — it just travels with you from here.`
  - chips (unchanged keys): Move a project forward · Bring an idea to life · Understand something hard · Find the right opportunity · Organize everything around me
  - submit: `Remember`

### Scene 3 — It acts · `#agent` · altitude: rising, first real lift
- **Beat:** the first empowerment — ZAKI does the work toward *your* goal.
- **Treatment:** **pinned demo.** The agent run *executes as you scroll through it* — the task line is your goal, phases complete one by one, tools fire, deliverables land. You watch the work lift off you. Zee works (focused/thinking pose).
- **Demo essence:** the existing run console (`#run`, `#run-phases`, tools, deliverables) distilled — the run *plays on scroll progress*, task line carries `data-intent-echo`. One clear lift: "it did the thing, for me."
- **Accent (scramble):** *does the work.*
- **Copy:**
  - eyebrow: `In action · 03`
  - headline: `Give it the outcome.\nIt does the work.`
  - subhead: `Not an answer you copy out — a result you can use. It plans, uses real tools, creates the files, follows through. Every step visible; nothing ships without your yes.`
  - cta: `Watch ZAKI run` (→ agentUrl)

### Scene 4 — It remembers you · `#memory` · altitude: mid, warm
- **Beat:** being *known* — companion, not tool. This is what makes "never alone" true.
- **Treatment:** a **living memory graph** — soft nodes of what ZAKI holds about you, *your goal at the center*. Organic, intimate, slower. (The one place a constellation-like visual genuinely earns its keep.) Zee beside it (heart pose).
- **Demo essence:** the memory list (`#mem-list`) reimagined as a small living graph, the Project node = your goal (`data-intent-echo`); controls Inspect / Correct / Forget remain.
- **Accent:** *the person*
- **Copy:**
  - eyebrow: `Continuity · 04`
  - headline: `It remembers the person,\nnot the prompt.`
  - subhead: `Your goals, your preferences, the corrections you've made — held in one living memory you can see, correct, or forget. It's yours, and it carries everywhere ZAKI goes.`
  - cta: `See how memory stays yours` (→ `#trust`)

### Scene 5 — Every world · `#spaces` · altitude: brightening
- **Beat:** it scales across all of you — work, learning, what's next.
- **Treatment:** **layered worlds** — the Spaces window + suite panels rising/fanning, each its own world, one shared mind. Honest `Soon` labels. Breadth without sprawl. Zee pops between worlds.
- **Demo essence:** the spaces window (`#spaces` demo) kept as the lead panel; Design/Learn/Career fold in as "Soon" worlds.
- **Accent (scramble):** *your life.*
- **Copy:**
  - eyebrow: `Many worlds · 05`
  - headline: `One mind.\nEvery part of your life.`
  - subhead: `A world for each project, class, or client — its own docs and threads, nothing leaking between them. The same intelligence shows up in the shape each moment needs.`
  - facets: Spaces — In context · **Live** · Design — In creation · Soon · Learn — In growth · Soon · Career — In motion · Soon
  - cta: `Open Spaces` (→ `/spaces`)

### Scene 6 — Because you let it · `#trust` · altitude: near-summit
- **Beat:** trust that makes power safe — you own it, it waits for you. A held breath before the top.
- **Treatment:** **interactive set-piece** — the permission boundary; ZAKI reaches a real action and stops; *you* approve or deny, and it responds. Intimate, quiet. Zee waits at the boundary.
- **Demo essence:** the existing boundary scene (`#boundary-scene`, `.permission-card`, approve/deny) kept — distilled to one clear approve/deny moment.
- **Accent:** *you let it*
- **Copy:**
  - eyebrow: `Your life stays yours · 06`
  - headline: `It knows you\nbecause you let it.`
  - subhead: `Personal intelligence asks for personal trust. You own the memory — inspect it, scope it, delete it. ZAKI reaches the boundary of any real action and waits for your yes. Privacy isn't a setting here; it's the architecture.`
  - cta: `Read the security model` (→ `/story`)

### Scene 7 — The summit · `#cta` · altitude: peak (brightest, luminous)
- **Beat:** the payoff — you're standing in your next chapter, lifted, not alone.
- **Treatment:** the **brightest, most open** scene — dawn-gold, warm paper, air. Your goal from Scene 2 **resolves here** ("Continue: …"). The word *alone* settles last (scramble). Zee stands with you at the top (sunglasses/triumph). The climax of the palette and the thread.
- **Demo:** none — the resolved goal token + Zee + the line.
- **Accent:** *alone.* (settles)
- **Copy:**
  - eyebrow: `A new chapter · 07`
  - headline: `Never build alone.\nNever start the next chapter alone.`
  - subhead: `Whatever comes next — the launch, the move, the idea you've been carrying — you don't begin it from zero, and you don't begin it by yourself.`
  - intent echo: `Continue: <your goal>` (on the CTA label; `#cta-primary .cta-label`)
  - cta: `Enter ZAKI's mind` (→ signupUrl) · `Read the story` (→ `/story`)

---

## 4. The carried-goal thread (personalization)

- Scene 2 captures the goal → `localStorage['zaki_intent_v1']` (existing) and shows a glowing **token**.
- The token "travels" up the page (a small persistent marker that rises with scroll altitude) and the goal text echoes into Scene 3 (the agent task), Scene 4 (the Project memory node), and Scene 7 (the CTA label) via the existing `data-intent-echo` mechanism.
- **Graceful default:** if the visitor never sets a goal, the thread uses `your goal` / `the thing you're carrying` so the page is fully great without interaction.

---

## 5. Build approach

- **Scene as a unit.** Each scene = its markup + scoped styles + its own motion/demo, on the editorial `.scene` system already in place. One job each, independently testable — and built/deployed/**verified one scene at a time** ("prove one, then roll").
- **Motion engine.** Lenis smooth scroll + GSAP ScrollTrigger (already wired, one shared rAF). One global **altitude driver** (scroll 0→1) feeds the rising palette + pacing. Pins: hero, agent ("it acts"), trust set-piece; reveals (upward) for the rest. Full teardown; fix React StrictMode double-mount so dev matches prod.
- **Rising palette.** Altitude interpolates `--bg`/`--ink-*` from grounded-dark → dawn-gold-light; WCAG AA verified at each step.
- **Demos, distilled & lazy.** Each demo reduced to its one lift; initialized only near the viewport (perf); canvas only where earned (Scene 4 graph).
- **Mobile (`pointer:coarse`).** No pinning (demos become static/tap-through); palette still rises; type rescales; tested at 390px.
- **Performance.** 60fps target; DPR clamp ≤2; lazy demos; visibility/`prefers-reduced-motion` pauses.
- **Accessibility.** Full reduced-motion fallback (no pins, instant reveals, static palette or stepped); keyboard reachable; no-JS legible; no horizontal overflow.
- **Robustness.** CSS bundled in `<head>` (done — no FOUC); single scramble engine; full destroy on unmount.

---

## 6. Assets to create (you offered — here's the list)

Existing usable: `/zaki/bot/{wave,sunglasses,thinking,heart}.png`, the ZAKI mark. Custom requests, by scene:

- **Zee poses** (one per beat; transparent PNG, ~2× retina): (1) peeking/inviting at an edge, (2) leaning-in/listening, (3) working/heads-down, (4) sitting-with-you/content, (5) hopping-between-worlds, (6) waiting-patiently at a line, (7) arms-up/triumph at the summit. *(Use existing poses where they already fit; flag which are missing.)*
- **Summit art** (Scene 7): a soft dawn/altitude backdrop — warm paper + gold light, airy. (Could be CSS gradient; custom art would elevate.)
- **Worlds art** (Scene 5): light, distinct iconography/illustration for the Spaces/Design/Learn/Career worlds (optional — facets can be type-only).
- **Goal-token mark:** a small luminous glyph/shape for the carried goal (optional — can be CSS).

None of these block building; scenes ship with type/CSS first, art drops in.

---

## 7. Build sequence

1. **Foundation:** altitude driver + rising palette + the StrictMode dev fix (so the whole system works in dev too).
2. **First slice — prove it:** Scene 1 (threshold, rise-out) → Scene 2 (intention + token) → Scene 3 (agent acts, pinned demo on your goal). Deploy, review.
3. **Roll:** Scene 4 (memory graph) → Scene 5 (worlds) → Scene 6 (trust) → Scene 7 (summit + resolved goal). Deploy after each.
4. **Polish pass:** Zee art, copy final, mobile, perf/a11y sweep, full-page rhythm.

Each step deploys to staging and is verified before the next.

---

## 8. Out of scope (v1)

- Arabic / RTL (deferred by owner; the rising/mirroring is a later pass).
- The other product pages (Agent/Spaces/Pricing/Story) — separate from this homepage spec.
- Net-new product claims — copy stays within verified capabilities; Design/Learn/Career remain honest "Soon."
