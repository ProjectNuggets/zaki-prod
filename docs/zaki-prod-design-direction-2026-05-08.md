# ZAKI — Design Direction (Phase 2)

**Authored:** 2026-05-08 by FE/UI agent
**Anchored in:** `docs/zaki-prod-audit-2026-05-07.md` (Phase 1 audit) + `docs/zaki-prod-brain-data-truth-2026-05-08.md` + `docs/zaki-prod-brain-research-best-in-class-2026-05-07.md` + `.claude/DESIGN.md` (the contract).
**Bound to Nova's directive:** *"distinctive ZAKI taste also should be present, the [things I like] expose everything the user needs cleanly. taste vector: claude code or codex, for functionality and buttons."*
**Supersedes:** scattered design intent across V1.11 hotfix comments. This is the canonical design contract going forward.

This doc is a forward-looking design contract for ZAKI's UI. It synthesizes what the audit found, what the research says, and where Nova's taste lands, then sets concrete direction for the next 13 person-days of execution and beyond.

It is not a style guide (that's `.claude/DESIGN.md`). It is the **why** that frames the **what**.

---

## 1. Premise — what ZAKI's UI should feel like

ZAKI is the AI that is *yours*. Three implications for UI:

**Sovereign-feeling, not service-feeling.** Most chat UIs feel like rented surfaces — clean, generic, polite. ZAKI must feel owned. Accumulating. Specific to *you*. The brain page is the canonical surface where this lives. The chat thread is where it grows.

**Show the work, don't hide it.** Other AI agents are black boxes pretending to be friendly. ZAKI shows you the agent's mind, the supersede chain, the source of every fact, the autonomy mode it's running in, the cost it just spent. Transparency is the moat. Hiding the agent's process to look polished defeats the pitch.

**Restraint where it earns trust, density where it earns time.** The surface should feel like Linear (deliberate restraint) and Cron (depth on demand) — not Notion (everything-everywhere) or ChatGPT (sterile minimalism). Important things are visible; rare things are reachable.

The voice that comes out of these three: **a quiet, dense, opinionated tool that reveals more the longer you use it.**

## 2. Taste vector

From Nova: *"Claude Code or Codex CLI"* for functionality and buttons. Plus the products he named (Linear, Cron, Obsidian, Cursor, Perplexity) all share one virtue: *they expose everything the user needs cleanly*.

Translated to ZAKI's GUI:

- **Monospace-aware where data is dense.** Use `font-mono-ui` (DM Mono) for memory keys, session IDs, edge weights, importance scores, timestamps. Numerals are tabular. The brain DetailPanel, the diagnostics sheet, the cron schedule list — these should feel like a CLI hexdump *legible*, not a pretty card stack.
- **Keyboard-first.** Already shipped on the brain page (`f`/`c`/`o`/`Esc`/`/`). Extend pattern: `⌘K` global command palette (like Linear/Raycast/Cursor), `j`/`k` for list navigation, `Enter` to act, `Esc` to dismiss. Keyboard hints visible on hover. Power users live by this; novice users discover it.
- **Earn every pixel.** No decorative icons. No gradients that don't say something. No card-with-floating-icon-and-three-bullets unless those bullets are what the surface is for. Each pixel either conveys a fact, an action, or a state — or it isn't there.
- **Status visible at a glance.** Linear's "X/Y completed" + colored dot. ZAKI's equivalents: the live thinking-mode badge, the context-pressure ring, the autonomy mode pill, the channel-source attribution chip. Some shipped, some pending. All small and information-dense.

What it's NOT (per `.claude/DESIGN.md` anti-patterns + the audit):

- AI-slop fonts (Inter, Roboto, Arial, system-ui). ZAKI uses Cabinet Grotesk + Plus Jakarta Sans + DM Mono.
- AI-slop colors (purple/pink gradients, cosmic backgrounds, aurora blobs, cyan glow). ZAKI is red `#f10202` + teal `#219171` + warm desert.
- AI-slop layouts (centered hero with three floating cards, glassmorphism for its own sake).
- Em dashes in user-visible copy. Periods, colons, semicolons, parentheses.
- Emojis in code or UI unless explicitly asked.

## 3. The North Star — paid users that stick

Every design decision passes through one filter:

> *Does this make ZAKI more visibly **yours**, more visibly **smart**, and more clearly **worth paying for**?*

If the answer is "no" or "I don't know," the decision is wrong.

This is why the brain page audit pivoted from "polish the rendering" to "the data isn't there." Polish that doesn't make ZAKI more visibly yours/smart/worth-paying-for is decoration.

Three operational subgoals derived from the North Star:

**(a) Visible accumulation.** The user should see the brain growing every day. The insights strip ("16 new this week / 3,063 total") is the first beat. The supersede chain stepper is the second ("ZAKI corrected himself 17 times"). The roadmap promises that over time this becomes acquisition material — users tweet their graph. Today the data isn't dense enough; once backend ships the backfill (per `docs/zaki-prod-brain-data-truth-2026-05-08.md`), this lights up.

**(b) Visible differentiation.** The user should see *what makes ZAKI different from ChatGPT* every time they use it. Cross-channel attribution chips on messages ("from Slack 14:05"). Source attribution on memories. The brain page itself. The autonomy mode pill on the composer. The supersede chain. The Five Pillars need to surface in copy too — onboarding, pricing, settings descriptions.

**(c) Visible upgrade pressure.** The user should see what they'd unlock by paying. Today: zero tier gates in product. Free users have no pressure. Move 5 redesign of ZakiSettingsSheet adds tier gates with `🔒 Pro` badges per feature. Pricing page hero leads with the differentiator. Cap-lift moment is celebrated visually when free user hits limit.

## 4. Visual system (reaffirmed from `.claude/DESIGN.md`)

Already canonical — see `.claude/DESIGN.md`. Restated here for completeness so the design contract is self-contained:

### Typography (locked)

| Role | Font | Variable |
|---|---|---|
| Display (h1–h3) | Cabinet Grotesk Bold/Extrabold | `var(--zaki-font-display)` |
| Body / UI | Plus Jakarta Sans Regular/Medium | `var(--zaki-font-body)` |
| Arabic | Zain Regular/Bold | `var(--zaki-font-arabic)` |
| Code / mono / data | DM Mono | `var(--zaki-font-mono)` |
| Logo (wordmark only) | Climate Crisis | `var(--zaki-font-logo)` |

Tailwind classes: `font-display`, `font-body`, `font-arabic`, `font-mono-ui`, `font-logo`.

Sizes: scale in `tokens.css` from `--zaki-text-2xs` (11px) to `--zaki-text-3xl` (30px). No invented intermediate sizes.

### Color (locked)

**Brand red `#f10202`** — CTAs, brand signature, destructive actions, identity-card moments. Sparse and surgical.

**Brand teal `#219171`** — focus rings, active dots, success states, info, "low pressure" indicators, semantic-status accents. The "subtle accent" color.

**Warm desert neutrals** — surfaces, text, borders. Light + dark variants in `tokens.css`.

**Off-limits:** purple, pink, generic green, generic blue, cosmic gradients, glassmorphism for its own sake.

**The brain canvas exception** is the only sanctioned dark-locked surface (`#0a0a0a` bg + `text-white/X` opacity tints). Documented invariants in `BrainPage.tsx` / `BrainGraphView.tsx`. Don't theme-couple.

### Spacing & rhythm

4px base unit. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Use these via `--zaki-space-*` tokens or matching Tailwind utilities. Don't invent 5/10/18/22.

Touch targets: 44px mobile, 36px dense desktop. Buttons, icon-toggles, list rows respect minimums.

### Motion

Defaults: 150ms (fast), 200ms (base), 300ms (slow). Anything longer is decoration.

Always honor `prefers-reduced-motion`. The home view's mission auto-rotate already does (commit cd3d4f6); brain page animations should pattern-match.

Anti-pattern: infinite-loop ambient animation on critical content. The thinking-indicator dots are the meaningful exception — *that* motion is the message.

### Token coverage extension (Phase 4 prerequisite)

The audit found ~120 inline hex literals across 8 files in dark-mode overrides. Root cause: `--zaki-*` tokens don't have dark-mode variants for surface depths beyond `--zaki-surface-base/raised/elevated/sunken`.

Fix scope: add `bg-zaki-dark-card`, `bg-zaki-dark-elevated-deep`, `border-zaki-dark-strong`, `text-zaki-dark-muted-deep` etc. as raw CSS classes in `tokens.css`, drawing from the colors already inlined as hex. Then sweep call sites. Mechanical, no UX risk, ~1 day.

This unblocks every other surface refactor — once tokens cover the use cases, surfaces don't reach for hex.

## 5. Surface design contracts

Per major surface, the *design intent* — not the line-by-line spec.

### Chat thread (the bot — Pillar 2/3)

**Feel:** dense, alive, transparent. The composer is where work happens; the message stack is where ZAKI shows its work.

**Anchors:**
- Composer is the focus of attention. Mode pills (plan/execute/review), context pressure ring, web search arm, voice input, slash commands. Already mostly shipped. The pressure ring deserves better discoverability — it surfaces only when bot mode AND pressure > 0; that bar is too high. Consider always-visible in bot mode.
- Live thinking-mode badge in the chat header (Move 5 brief) — clickable to flip mode. Settings is canonical, badge is shortcut.
- Message bubbles already have source-attribution chips. Strengthen: channel + timestamp always visible, not just on hover.
- Image generation works (commit 16b852e); add the same affordance for any generated artifact (charts, diagrams, code blocks).

**What's missing:**
- Activity rail / status indicator. When the agent is doing something not yet visible (running a tool, fetching, scheduling), a small persistent indicator shows it. Cursor's pattern.
- Better empty state. ChatArea's home view ("Your Brain / Everything ZAKI remembers") is good for branding but doesn't pitch what's possible. Sample prompts could be smarter — show "Try asking ZAKI to remember X" or "Try connecting Telegram."

### Sidebar (navigation — every pillar)

**Feel:** sparse, mode-switching, never the focus. The sidebar holds context; the canvas holds attention.

**Anchors:**
- Three modes (Spaces / ZAKI bot / Learning) via `sidebarMode`. Mode picker top-of-sidebar — already there.
- Search input below the mode picker (today: in profile-menu shape; better: persistent and `⌘K`-bound globally).
- Spaces tree below.
- Profile menu in the footer.

**What's missing:**
- Global `⌘K` palette. The brain page has `/`-focuses-search, but a cross-app palette ("New chat / Open brain / Manage cron / Connect Telegram / Settings → Channels") is a 1-day Phase 4 add and unlocks most of the keyboard discipline.
- The footer profile menu has the "Settings" + "Language" duplicate (audit P0 #14). Both open the same SettingsModal. Collapse.
- No "what's running" indicator. If ZAKI is currently working in the background (cron job firing, channel reply pending), the sidebar should show it.

### `/brain` page (the differentiator — Pillar 1)

**Feel:** the most distinctive surface in ZAKI. The pitch made physical. Every detail says *"this is your mind, externalized."*

**FE work is done.** Pending backend density (per `docs/zaki-prod-brain-data-truth-2026-05-08.md`). Once backend backfills topics/entities/edges:
- Topic chips become primary nav (replaces or complements kind legend)
- Focus-mode-as-primary turns on (anchor on `/brain/me`, neighbors fan out)
- Insights strip enriches with topic counts ("47 memories about Family")
- DetailPanel renders typed cards (Person card, Project card, Event card)
- Linked-references panel shows back-edges

Until then: no further FE work. Polish on empty data is wasted.

### Settings (canonical config surface — every pillar)

Today: split between SettingsModal (account/theme) + ZakiSettingsSheet (agent). Two surfaces, two sidebar entries, conflated in the user's mental model.

**Direction:** consolidate into a single `/settings` route with sidebar-nav. Sections in priority order:

1. **Identity** — display name, email, avatar, member-since, "ZAKI knows me as..." pulled from `boss_identity`
2. **Channels** — Telegram (current), Slack (coming), web, voice. Per-channel autonomy override later.
3. **Brain** — memory preferences, what ZAKI should/shouldn't remember, supersede / forget controls. Cross-link to `/brain`.
4. **Models** 🔒 — model picker (free is locked to default; Pro unlocks Anthropic/OpenAI/local). Tier gates VISIBLE.
5. **Autonomy** — 3-card visual picker (Read-only / Supervised / Full) with concrete examples per card.
6. **Response Style** — 3-card visual picker (Fast / Balanced / Deep) with token-cost framing.
7. **Privacy** — data export, data delete, who-can-see-what.
8. **Plan** — current tier, usage, upgrade. CTAs deep-link to `/pricing`.
9. **Advanced** — diagnostics gated behind developer mode toggle.

Entry from the sidebar profile menu collapses to one "Settings" entry. The "Language" duplicate goes away (becomes a row inside Identity).

**Visual mode pickers (Move 5 brief, finally shipped):**

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ ⚡ Fast          │  │ ⚖ Balanced (rec) │  │ 🧠 Deep          │
│                  │  │                  │  │                  │
│ Snappy answers,  │  │ Default. Smart   │  │ Heavy reasoning, │
│ small context.   │  │ middle ground.   │  │ slower replies.  │
│                  │  │                  │  │                  │
│ ~1k tokens/turn  │  │ ~4k tokens/turn  │  │ ~16k tokens/turn │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

Selected card: brand-red border. Unselected: subtle border. Each card is keyboard-reachable (`Tab`-then-`Space`).

Same pattern for Autonomy: Read-only (ZAKI can search but won't act) / Supervised (asks before risky actions) / Full (acts autonomously, you approve daily summary).

### `/pricing` page (the conversion surface — Pillar 5)

**Feel:** confident, calm, specific. *Sells* what ZAKI does, doesn't beg.

**Today:** transactional — straight to plan cards.

**Direction:**
1. **Hero with the pitch line.** *"The AI that's actually yours."* Sub: *"Memory you can see. Cross-channel. Self-correcting. Yours."* Visual: a small motion-loop of the brain graph accruing nodes over time. (Or static if motion is too much.)
2. **Five Pillars row.** One concise card each: Brain, Presence, Worker, Person, Wallet. Same primitives that show up everywhere else.
3. **Plan cards** (current). Two plans: Free, Pro (rename from Personal — match the brief). Toggle for monthly/yearly with explicit "Save 20%" callout.
4. **Comparison table.** Rows = features (visible memory, cross-channel, voice, scheduled tasks, model freedom, etc.). Columns = Free / Pro. ✓ / ✗ / "Limited" cells. Single most conversion-significant section.
5. **Trust signals.** Privacy/security one-liners. Optional: founder-narrative card ("Built by Nova in Hamburg, paired with Claude. Independent. Not VC-burning-cash.")
6. **FAQ.** 6–8 questions. Money-back, billing cycles, data ownership, can I export, etc.
7. **Footer CTA.** Repeat the primary plan CTA. Some users scroll past the cards then bounce; the footer captures them.

Move 9 (Stripe + paywall + cap-lift webhook) is wired backend-wise. The visible paywall trigger surface is missing — when free user hits cap, where do they see it? Pre-launch design: a dismissible banner on the chat composer + a paywall modal on the next attempted action.

### Onboarding (the first-impression — every pillar)

**Today:** two modals (Simple intro + Guided tour) live-walkthrough-shaped. Don't pitch the Five Pillars.

**Direction:** rewrite SimpleOnboardingModal as a 3-step pitch + 2-step tour:

- **Step 1 — Pitch ("Here's what ZAKI does that ChatGPT doesn't"):**
  Three lines, no choices. *"ZAKI remembers everything you say, across every channel you live in, and corrects himself when wrong."* Brand-red CTA: "Show me."
- **Step 2 — Brain teaser:**
  Mini graph render (could be the empty-state seed visual, growing). *"Your brain starts here. Every conversation adds to it."*
- **Step 3 — Channels:**
  *"Same brain, every channel. Connect Telegram now or later."* CTA: "Connect Telegram" (deep-link) or "Skip → start chatting."
- **Step 4 — First action:**
  *"Pick a topic to teach ZAKI about you."* Three quick-start chips: "What I do," "Who matters to me," "What I'm working on." Click → seeds first chat.
- **Step 5 — Tour offer:**
  *"Want a 60-second tour? You can always re-trigger from the menu."* Yes → guided. No → done.

The Guided tour (OnboardingModal 1056 lines) keeps its sophisticated spotlighting machinery; the content gets re-pointed to the new value-prop highlights (the brain page, the cron sheet, the autonomy picker).

### Mobile (every pillar)

**Today:** desktop sidebar in a Radix drawer.

**Direction (Phase 4):**
- Bottom-tab nav: Chat / Brain / Tasks / Settings. Replaces the hamburger drawer for primary nav.
- Swipe-between-threads on the chat surface.
- Long-press a message: copy / share / regenerate / superseed-this-fact.
- Long-press a brain node: focus-on / forget / open-detail.
- Pull-to-refresh on lists.

Mobile is a first-class form factor. Today it's a viewport.

## 6. Information density principle

Tools differ from apps by how much they trust the user.

ZAKI is a tool. Trust the user.

That means:
- Show the agent's working state. Don't hide tool calls; render them in a collapsible inline rail (already done in chat).
- Show the cost. Token counts, USD, cap percent. Already in usage section; surface in chat header too.
- Show the source. Every memory traces to a conversation. Render it.
- Show the supersede. Every correction is visible.
- Show the autonomy. Mode pill always visible; never let the user wonder which mode they're in.

Density without clutter is the discipline. Linear and Cron get this right. Slack and ChatGPT don't — they hide the work to look polished, but power users feel infantilized.

## 7. Anti-patterns (final list)

These will NOT appear in ZAKI:

- **AI-slop fonts:** Inter, Roboto, Arial, system-ui as primary text.
- **AI-slop palettes:** purple/pink gradients, cosmic backgrounds, aurora blobs, cyan/teal glows that don't say something.
- **AI-slop layouts:** centered hero with three floating cards as the default; glassmorphism for its own sake; auto-loop ambient animation on critical content.
- **Hidden agent process:** if ZAKI ran a tool, the user sees what tool, on what input, with what output (collapsible).
- **Em dashes in user-visible copy.** Use periods, colons, parentheses.
- **Emojis in product UI** unless Nova explicitly asks. Words over icons.
- **Hex literals in components.** Tokens or arbitrary-value `var(--zaki-*)` inline.
- **Hardcoded English in JSX.** Always `t()` with a `defaultValue`.
- **Re-rolled primitives.** If shadcn/Radix has it, use it.
- **Aria-label-only English.** RTL screen-reader support is non-negotiable.
- **Trim/loss messages framed as failure.** "Showing N of M" honestly; never "Trimmed: X hidden" implying we couldn't fit.
- **Auto-anchor on empty data.** If a feature would land the user on emptiness (focus-mode on a graph-orphan self-node, brain on a 0-memory account), don't.
- **Decorative motion.** If it doesn't communicate, it doesn't move.

## 8. Execution sequence

After this doc is greenlit, the work proceeds in this order:

### Phase 4-A — token + i18n + brand mechanical sweep (~2 days)

1. Token coverage extension in `tokens.css` for dark-mode variants
2. Sweep ~120 hex literals across 8 files into utilities
3. Migrate `AUTH_COPY` (LoginScreen 180 lines) + `sidebarCopy` (Sidebar) + `ERROR_COPY` (ZakiSettingsSheet) to i18next resources
4. Sweep hardcoded English `aria-label` strings in Sidebar
5. Rename `LogoArabicOrange` → `Logo` (or `LogoBrand`); replace asset; sweep imports
6. Migrate PowerUserSheet 18 off-brand colors to brand tokens
7. Sweep brain page's deferred 8x `#f10202` hex literals to `bg-zaki-brand` / `text-zaki-brand` utilities

Pure mechanical. No UX risk. Verifiable per-file.

### Phase 4-B — Move 5 ZakiSettingsSheet redesign (~3 days)

1. Settings consolidation: SettingsModal + ZakiSettingsSheet → `/settings` route with sidebar-nav
2. Visual mode pickers (Response Style, Autonomy) — 3 cards each with descriptions and token-cost framing
3. Tier gates visible: every Pro feature shows with `🔒 Pro` badge for free users
4. Live thinking-mode badge in chat header (clickable shortcut to mode change)
5. Per-section content moved per the contract above (Identity / Channels / Brain / Models / Autonomy / Response Style / Privacy / Plan / Advanced)

### Phase 4-C — pitch surfaces (~2 days)

1. Onboarding rewrite: 5-step flow with Five Pillars per the contract above
2. Pricing page hero + Five Pillars row + comparison table + trust signals + FAQ + footer CTA

### Phase 4-D — global affordances (~2 days)

1. `⌘K` global command palette (cross-app navigation, action quick-access)
2. Activity rail / "what's ZAKI doing" indicator
3. Cron sheet discoverability (sidebar entry or chat-composer link)

### Phase 4-E — mobile-first (~3 days)

1. Bottom-tab nav (Chat / Brain / Tasks / Settings) on mobile
2. Swipe between threads
3. Long-press menus on messages + brain nodes
4. Pull-to-refresh

### Phase 4-F — brain resumes (when backend lands)

When backend ships the backfill (`docs/ui-needs-backend-brain-comprehensive-2026-05-07.md` items #1, #2, #3):
1. Topic chips primary nav
2. Focus-mode-as-primary auto-anchor
3. Typed memory cards in DetailPanel
4. Linked-references panel
5. Insights strip topics integration

Total ~12–14 person-days for Phase 4 execution, excluding F (backend-blocked).

---

## What this doc commits us to

1. The visual system in `.claude/DESIGN.md` is the only system. No new fonts, no new colors, no new spacing scales.
2. The North Star filter applies to every decision: *Does this make ZAKI more visibly **yours**, more visibly **smart**, and more clearly **worth paying for**?*
3. The Five Pillars (Brain / Presence / Worker / Person / Wallet) are surfaced in user-visible copy across onboarding, pricing, settings, empty states.
4. Tier gates are visible in product. Free users see what they'd unlock.
5. The agent's process is shown, not hidden.
6. Restraint where it earns trust. Density where it earns time.

When in doubt, the brain page is the taste benchmark — Obsidian-grade restraint with ZAKI's brand layered cleanly. The other surfaces should match its bar.

This is the contract. Execution starts when greenlit.
