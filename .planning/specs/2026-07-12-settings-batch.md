# Spec: Settings Batch — Rhythm Revamp, Tooltips, Reset-to-Defaults

Date: 2026-07-12
Source: "ZAKI todos and feedback" items #14, #15, #18; design direction approved
by CEO 2026-07-12 (artifact: settings-revamp-direction, v1) with one amendment:
**increase the inter-section gap beyond the proposal**. Item #16 (disable broken
sections) was dropped — the observed breakage was a transient control-plane
outage, already handled by existing gating.

## Scope

Three items, one surface (`/settings`). Frontend-only. Every new user-facing
string lands in both `en.json` and `ar.json` (key-parity hygiene; the full
Arabic audit remains deferred). Builds ON TOP of branch
`ux/dashboard-quick-wins-2026-07` (stacked; that PR is awaiting approval).

### 1. Section rhythm revamp (#14) — approved direction, four moves

Files: `src/app/components/settings/SettingsPage.tsx`,
`SettingsChannelsSection.tsx`, `src/styles/v2.css`. Applies to ALL sections of
the Settings page uniformly.

- **Move 1 — Section gap ≫ row gap.** Inter-section spacing: **44px** (CEO asked
  for more than the proposed 34px). Intra-section row spacing: ~13px vertical
  padding per row. Hierarchy comes from spacing, not boxes/cards (V2 rule).
- **Move 2 — Section header band.** Every section header: label left (ink-1,
  11px uppercase tracked), count/meta right (ink-4, 10px uppercase), one full
  hairline rule directly beneath the band. Consistent across all sections.
- **Move 3 — Right rail.** Within rows: name+description left; status chips and
  the action button aligned to a single right column (`display:grid;
  grid-template-columns: 1fr auto`), chips inline-before the button. RTL-safe
  (use logical properties / grid, no hardcoded left/right).
- **Move 4 — Density.** Remove the oversized vertical padding in channel rows
  (and any other rows with >18px padding); rows separated by faint hairlines.
- **Chip trim (approved):** channel rows show at most two chips in the collapsed
  row — status (e.g. "Needs setup") + credentials (e.g. "0/2 creds"). Ownership
  ("Your tokens") and bindings-count chips move into the expanded tray only
  (the info is not deleted, just demoted).
- Done when: every section shows the header band; inter-section gap 44px
  everywhere; rows grid-aligned with a clean right edge; no card chrome
  introduced; light+dark, LTR+RTL, 1440 and 390 widths clean.

### 2. Info tooltips for cryptic labels (#15)

- Add a small reusable, accessible info affordance (reuse an existing V2
  primitive if one exists in `src/app/components/ui/` or `v2/`; otherwise create
  one there): an (i) button, keyboard-focusable, `aria-describedby`, opens a
  short plain-language note on hover/focus/tap. Mono, hairline, no shadow-heavy
  popover styling.
- Attach to these labels (EN copy below is approved draft; AR translations
  natural, not literal):
  - **Weekly usage meter**: "Your one shared weekly allowance across all ZAKI
    products, shown as approximate agent runs or chats."
  - **Burst window / 5h window / capacity window**: "A rolling 5-hour limit on
    short bursts of heavy use — separate from your weekly allowance."
  - **Weekly room**: "How much of this week's allowance is left. Refills on your
    weekly reset day."
  - **Extra capacity**: "Buying capacity beyond your plan isn't available yet."
  - **Agent available now**: "Whether Agent can run right now, based on your
    remaining weekly allowance."
  - **Billing source**: "Where your plan comes from — free account, subscription,
    or access code."
  - **Billing health**: "Whether billing is set up and responding for your
    account."
  - **PII purge row** (Saved Agent memories): "Removes phone numbers and email
    addresses from what Agent remembers. Dry run previews without deleting."
- Done when: each listed label has the (i) affordance; readable in both themes;
  focus-visible ring; no clipping at viewport edges; EN+AR keys present.

### 3. Reset to defaults — Agent tenant defaults (#18)

- Add a "Reset to defaults" action in the AGENT (tenant defaults) section header
  band's right side.
- Behavior: restores the panel's documented defaults (locate the canonical
  defaults in the backend contract or existing frontend constants — do NOT
  invent values; if no canonical source exists, derive from the backend's
  fallback values and flag the source in the report). Applies via the existing
  save path, disabled while saving, success toast ("Agent defaults restored."),
  errors surface the existing error path.
- Done when: pressing it visibly resets every control in the panel and persists;
  keyboard accessible; EN+AR strings.

## Security / tenancy
Display + settings-write via existing authenticated endpoints only. No new
routes, no quota/gating logic changes.

## Definition of done (batch)
- Per-item criteria above; typecheck, build, `git diff --check`, focused tests
  for touched files (SettingsPage, SettingsChannelsSection + any tooltip
  primitive tests added).
- en/ar key parity maintained.
- NOTE: the repo's `frontend-e2e` suite is known-red on `main` (pre-existing,
  10 failures) — not a gate for this batch; do not chase those failures.
- Atomic commit per item. **NO PR** — per standing rule, work stops after
  verification + report; the human confirms before any PR is opened.
