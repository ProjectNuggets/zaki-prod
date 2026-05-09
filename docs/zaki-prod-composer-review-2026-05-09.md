---
phase: composer-followups-and-meter-compact
reviewed: 2026-05-09
depth: standard
commits_in_scope:
  - 18328cd "fix(composer): address review findings from cee921d"
  - 467dbe7 "feat(composer): schedule a follow-up from the plus menu"
  - b8a603d "fix(composer): fold compact action into the context meter"
files_reviewed:
  - src/app/components/ChatArea.tsx
  - src/app/components/chat/views/ChatView.tsx
  - src/app/components/InputArea.tsx
  - src/app/components/agent/ScheduleFollowUpDialog.tsx
  - src/queries/useAgentScheduledFollowUps.ts
  - src/queries/useTextToSpeech.ts
  - src/i18n/locales/en.json
  - src/i18n/locales/ar.json
findings:
  P0: 0
  P1: 4
  P2: 7
status: issues_found
---

# Composer review (last 3 commits) — 2026-05-09

## Summary

Three composer commits reviewed: TTS hardening + compact toast i18n + approval dedupe (`18328cd`), Schedule-a-follow-up plus-menu flow (`467dbe7`), and folding the compact action into the context meter (`b8a603d`).

No ship-blockers (P0). Four P1s worth fixing before next deploy: an i18n leak in the weekly preview (English day names rendered in Arabic), a stale comment in ChatArea after the timeline approval card was removed, a discoverability gap on the now-clickable context meter (no visual "click me" affordance until you hover), and a stale tooltip-key reference (`compactPreflightActionBusy`) still in use. Seven P2s for naming/dead-type cleanup, in-render ref mutation, and Date object stability in `useMemo`.

i18n key parity en/ar checks out for everything in scope — no English-only strings, no orphan keys. No tests reference the deleted `zaki-compact-preflight` testid (verified via grep across `e2e/` and `src/`). No em dashes in any user-visible string introduced by these commits (em dashes that exist in en.json predate this series — `cee921d` for `readAloudError`, older for the `proGate`/`sparseNotice` ones). No emojis introduced. Brand-token discipline mostly holds; one hex-literal smell in the new dialog, called out below.

---

## P1 — ship-soon

### P1-01: Weekly preview leaks English day name into Arabic UI

**File:** `src/app/components/agent/ScheduleFollowUpDialog.tsx:112-118`

```ts
if (schedule.kind === "weekly") {
  return t("scheduleFollowUp.preview.weekly", {
    defaultValue: "Every {{day}} at {{time}}",
    day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][schedule.dow],
    time: `${pad(schedule.hour)}:${pad(schedule.minute)}`,
  });
}
```

`day` is a hardcoded English literal interpolated into the Arabic translation `"كل {{day}} عند {{time}}"`. In `ar` mode this renders as e.g. "كل Mon عند 09:00".

The dialog only ever produces `dow=1` today (the "Mondays 9am" chip), so the bug is small in surface area, but the i18n contract is violated and any future weekly chip multiplies the leak.

**Fix:** localize the day via `Intl.DateTimeFormat`, or via a `scheduleFollowUp.days.{0..6}` key set:

```ts
const dayName = new Intl.DateTimeFormat(isRtl ? "ar" : undefined, { weekday: "long" })
  .format(new Date(2024, 0, 7 + schedule.dow)); // Jan 7 2024 was a Sunday
```

Add corresponding `scheduleFollowUp.preview.weekly` translation does not need changes — only the interpolated `day` value should be localized.

---

### P1-02: Stale comment in ChatArea contradicts the dedupe commit

**File:** `src/app/components/ChatArea.tsx:6291-6297`

```tsx
{/* 2026-05-08 — Inline approval banner. The same
    ApprovalRequiredCard renders inside the timeline for
    historical context, but ZAKI agent actions need the
    user to act NOW — so we promote a copy directly above
    the composer where the user's attention lives. The
    card hides itself when there is no pending request,
    so the slot collapses cleanly. */}
```

This comment is now actively wrong. Commit `18328cd` removed the timeline copy (in `ChatView.tsx`) precisely so that the inline above-composer banner is the single source of truth. The comment still claims "the same ApprovalRequiredCard renders inside the timeline for historical context", which will mislead the next reader and could justify a regression.

**Fix:** rewrite the comment to reflect that this is the only render of `ApprovalRequiredCard` (the timeline copy was dropped in `18328cd`). Two-line minimum: "single source of truth, decided actions surface here above the composer where attention lives."

---

### P1-03: Discoverability — armed context meter has no visible "click me" cue until hover

**File:** `src/app/components/InputArea.tsx:1218-1280`

Folding compact into the meter is right. The cost is visible affordance: when armed, the only cues are (a) ring + border switch from neutral to `text-zaki-warning` (still a 16px circle), (b) `cursor: pointer` (only on hover — touch users get nothing), (c) tooltip text on hover. There is no "Compact" word, no pulsing nudge, no badge, and no animation when the meter first crosses the arming line. The previous standalone preflight rail had an explicit `Compact` button in the user's primary attention zone above the textarea.

This is a real UX regression for mobile/touch and for users who don't hover the gauge. The compact action is also costly (spends backend tokens to summarize), so under-discoverability is the entire reason a preflight rail existed.

**Fix options, smallest first:**
1. Add a tiny pulse / brief "ping" animation when `compactArmed` first becomes true (one-shot, useEffect on the transition). Catches the eye without permanent noise.
2. Optionally show a one-off floating label/chip near the meter ("Compact?") for ~3s on first arming per session. Auto-dismiss.
3. On touch devices (`@media (hover: none)`), keep an inline label next to the ring so the affordance is always discoverable.

The ring color shift alone (the only persistent signal today) is below threshold for "I should click this" — the same color is also used elsewhere for "warning, FYI" semantics in the app.

---

### P1-04: Stale i18n key name still referenced after rename

**File:** `src/app/components/InputArea.tsx:1291-1300`

```tsx
{t(
  isCompacting
    ? "input.zaki.compactPreflightActionBusy"
    : "input.zaki.contextCompactHint",
  ...
)}
```

The commit message for `b8a603d` says: "Stale keys removed: compactPreflight, compactPreflightAction." But `compactPreflightActionBusy` (which is conceptually the same family) was kept. The key still exists in both en.json:438 and ar.json:438, so this works at runtime. The smell is naming consistency: the meter no longer is a "preflight" — it's a meter. Keeping the busy state under a `preflight` namespace will confuse the next person searching the codebase to e.g. tweak the spinner copy.

**Fix:** rename to `input.zaki.contextCompactBusy` (paralleling `contextCompactHint` and `contextCompactAria`), update the two locale files plus the one call site. Pure rename, no behavior change.

---

## P2 — nice-to-fix

### P2-01: `compactArmedRef.current` mutated during render

**File:** `src/app/components/InputArea.tsx:335-341`

```ts
const compactArmedRef = useRef(false);
if (hasZakiContextValue) {
  if (zakiContextValue >= compactShowLine) compactArmedRef.current = true;
  else if (zakiContextValue < compactHideLine) compactArmedRef.current = false;
} else {
  compactArmedRef.current = false;
}
```

Mutating a ref during render is technically allowed by React (refs are not part of the commit diff), but it's a documented anti-pattern under concurrent rendering — if the render is discarded (e.g. Suspense, transition), the hysteresis state can latch incorrectly. Today there's no concurrent suspension on this tree so it works, but the pattern is fragile.

**Fix:** move into a `useEffect`:

```ts
useEffect(() => {
  if (!hasZakiContextValue) {
    compactArmedRef.current = false;
    return;
  }
  if (zakiContextValue >= compactShowLine) compactArmedRef.current = true;
  else if (zakiContextValue < compactHideLine) compactArmedRef.current = false;
}, [hasZakiContextValue, zakiContextValue, compactShowLine, compactHideLine]);
```

…or convert to `useState` so the armed value is part of the React state machine. Either is fine; the current shape is a smell more than a bug.

This finding was already partially raised in chunk1/chunk2 reviews of this file — same antipattern, not addressed.

---

### P2-02: `tomorrow9` / `weekdays9` chips compute Date in render, drift across midnight

**File:** `src/app/components/agent/ScheduleFollowUpDialog.tsx:78-83, 99-101`

```ts
case "tomorrow9": {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return { kind: "at_datetime", date: d };
}
```

`useMemo` recomputes `schedule` only when `quick` or `customDateTime` changes, not when wall-clock time changes. If the dialog is opened at 23:55 on May 8 and the user picks "Tomorrow 9am", `schedule.date` is May 9 09:00 — correct. But if they let the dialog sit open past midnight before submitting, the preview text shows "Sat May 9 09:00" while wall-clock is now May 9, so "tomorrow" is now May 10 — UX is now lying about what "tomorrow" means.

`in_minutes` has a different shape of the same issue: `previewText` uses `Date.now()` at the time of useMemo, so the displayed "Fires: …" timestamp drifts further from now as the dialog stays open.

**Fix:** for `at_datetime` kinds we want absolute, so this is fine — but for `in_minutes` consider recomputing on submit only. Or, accept the drift as not worth a timer for a dialog that should be dismissed in seconds. Pragmatic call: ship as-is and add a `// known minor: preview drifts` note. P2.

---

### P2-03: Hex literal in custom-datetime input violates brand-token discipline

**File:** `src/app/components/agent/ScheduleFollowUpDialog.tsx:205, 233, 248, 53`

```tsx
className="… dark:bg-[#141210]"
```

Three inputs (`type=datetime-local`, textarea, `type=text`) and `SheetShell` itself all hardcode `dark:bg-[#141210]`. The token system has `bg-zaki-raised` for this; the `#141210` is the dark-mode override that should already be inside that token. This pattern was inherited from `SheetShell.tsx:53` (which has the same hex), so it's not novel — but the new dialog spreads the hex to three more sites, multiplying the cleanup surface.

**Fix:** plumb a `bg-zaki-raised-dark` token (or fix `bg-zaki-raised` to do the right thing in dark mode) and remove the `dark:bg-[#141210]` literals. Out of scope for this commit if the surrounding system uses the same pattern, but log the debt.

Same nitpick: hex `rgba(241,2,2,0.18)` and `rgba(241,2,2,0.25)` in `shadow-[…]` literals at lines 189 and 264. `241,2,2` is the brand red `#f10202`; should be `rgb(var(--zaki-brand) / 0.18)` so a brand-color rebrand doesn't have to grep for these.

---

### P2-04: `daily` and `raw` kinds are dead surface in this commit

**File:** `src/queries/useAgentScheduledFollowUps.ts:40, 43, 73, 91`

```ts
export type FollowUpSchedule =
  | { kind: "in_minutes"; minutes: number }
  | { kind: "at_datetime"; date: Date }
  | { kind: "daily"; hour: number; minute: number }
  | { kind: "weekdays"; hour: number; minute: number }
  | { kind: "weekly"; dow: number; hour: number; minute: number }
  | { kind: "raw"; expression: string };
```

`daily` and `raw` are never produced by the dialog. `compileSchedule` handles them and `previewText` does not (silently returns `null`). If a future caller passes `kind: "daily"`, the user sees the "Pick a future date and time." invalid-state copy even though the schedule compiles fine — confusing.

**Fix:** either (a) drop the unused union members until a real caller appears, or (b) add the missing `previewText` branch for `daily` (`Every day at HH:MM`) and add a chip if you want it surfaced. Lean toward (a) — YAGNI.

---

### P2-05: `defaultPrompt` reset clobbers user edits if parent re-emits while dialog is open

**File:** `src/app/components/agent/ScheduleFollowUpDialog.tsx:63-70`

```ts
useEffect(() => {
  if (isOpen) {
    setPrompt(defaultPrompt || "");
    setName("");
    setQuick("in1h");
    setCustomDateTime(defaultCustomDateTime());
  }
}, [isOpen, defaultPrompt]);
```

If the parent (`InputArea`) somehow re-renders with a changed `inputValue` while the dialog is already open and the user has edited the prompt, this effect will overwrite their edit. Current `InputArea` wiring (`defaultPrompt={inputValue}`) means every keystroke in the textarea changes `defaultPrompt`. The dialog is visually a sheet over the composer — if focus management lets the user keep typing in the underlying textarea, every keystroke nukes the dialog's `prompt` state.

In practice, the sheet is modal so the textarea probably can't be focused. But the safety is fragile. The intent (per commit message) is: "Defaults the prompt to whatever is in the composer textarea so the user doesn't retype." That should be a one-time copy at open, not a continuous mirror.

**Fix:** depend only on `isOpen`, not on `defaultPrompt`. Capture the parent value once when the dialog opens:

```ts
const initialPromptRef = useRef("");
useEffect(() => {
  if (isOpen) {
    initialPromptRef.current = defaultPrompt || "";
    setPrompt(initialPromptRef.current);
    setName("");
    setQuick("in1h");
    setCustomDateTime(defaultCustomDateTime());
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isOpen]);
```

(Or stash `defaultPrompt` in a ref so the effect's identity stays stable.)

---

### P2-06: Tab-focusable button with no-op when not armed

**File:** `src/app/components/InputArea.tsx:1222-1235`

```tsx
<button
  type="button"
  onClick={() => {
    if (!compactArmed || isCompacting) return;
    ...
  }}
  disabled={compactArmed && isCompacting}
  ...
```

The meter is a `<button>` always (so keyboard users can read its `aria-label`), but `disabled` only fires when armed-and-compacting. So:
- not armed → `<button>` is enabled, tab-focusable, Enter/Space do nothing.
- armed → enabled, click works.
- armed + compacting → disabled.

The not-armed case is a no-op button that still consumes a tab stop. Screen-reader announces it as "button, Context usage X percent" with no hint that pressing it does anything.

**Fix:** when not armed, render as `<div role="img" aria-label="…">` (purely informational), or `disabled` the button when not armed. The latter is cleaner because you keep one DOM tree and the focus ring/ARIA semantics stay consistent. Set `disabled={!compactArmed || isCompacting}`.

Trade-off: today, having the not-armed button focusable means tooltips show on focus. If you want that, you have to keep the button enabled. Acceptable. Closer call than the others — log as P2 nit.

---

### P2-07: TTS singleton `Audio` lazy-init can swallow `messageId` if window is undefined

**File:** `src/queries/useTextToSpeech.ts:79-91`

```ts
set((s) => {
  if (s.audio) return { activeMessageId: messageId, status: "fetching" };
  if (typeof window === "undefined") {
    return { activeMessageId: messageId, status: "fetching" };
  }
  return { activeMessageId: messageId, status: "fetching", audio: new Audio() };
});
const audio = get().audio;
if (!audio) return;
```

In SSR (`typeof window === "undefined"`), we set `activeMessageId` and `status: "fetching"`, then bail out at `if (!audio) return;`. The store is now stuck in `{activeMessageId: <id>, status: "fetching"}` with no audio element to ever drive a state transition. Subsequent `toggle(sameMessageId, …)` calls will see `state.activeMessageId === messageId && state.status === "fetching"`, hit the early-return path on line 64-67 ("Click on the same message that's currently active → stop"), and call `state.audio?.pause()` which is a no-op, then clear state. So the user just experiences "first click does nothing visible, second click clears nothing visible" — recoverable, but the store carries phantom state across the SSR/CSR boundary if it's serialized.

This is mostly hypothetical — Zustand stores aren't serialized into SSR HTML by default in this app — but the cleaner shape is to bail out **before** mutating state when there's no `window`:

```ts
if (typeof window === "undefined") return; // no-op on the server
set((s) => s.audio
  ? { activeMessageId: messageId, status: "fetching" }
  : { activeMessageId: messageId, status: "fetching", audio: new Audio() }
);
```

---

## Verification notes

- **i18n key parity (en vs ar):** all new keys (`zakiControls.compact.*`, `input.zaki.scheduleFollowUp`, `input.zaki.contextCompactAria`, `input.zaki.contextCompactHint`, `common.cancel`, all of `scheduleFollowUp.*`) exist in both locale files. The 12 ar-only keys (`spacesView.chatsCount_two/few/many` etc.) are legitimate Arabic plural forms (CLDR plural categories), not bugs.
- **Stale testid hunt:** `grep -rn "zaki-compact-preflight"` across `src/`, `e2e/`, and `tests/` returns zero hits. Safe to delete.
- **Stale i18n key hunt:** `compactPreflight` and `compactPreflightAction` (the bare keys) are gone from every source file and every locale. Only `compactPreflightActionBusy` remains (see P1-04).
- **Em dashes in user-visible English (this series):** zero. Em dashes that exist (`readAloudError` in en.json:356, `proGate` 1166, `sparseNotice` 1704) all predate this series — `readAloudError` is from `cee921d` (the parent of the commits under review), the others older still. Out of scope for this review but worth a sweep separately.
- **No emojis introduced.** Confirmed via grep.
- **Unused imports:** none. Every lucide icon import is referenced. `submitMessage` is still used (slash-fallback in the meter click handler at line 1232).
- **Race / concurrency check on `scheduleAgentFollowUp`:** the in-process promise lock (`mutationLock`) correctly serializes the read-modify-write. Synchronous chaining via `previous.then(run, run)` plus `next.finally(...)` to clear the lock is sound. Two concurrent clicks will append both jobs in order. (Caveat: this only protects within a single tab. Two tabs racing the same array-replace endpoint can still clobber. Probably acceptable for now; flag if it becomes a bug.)
- **Date parsing in custom datetime:** `new Date("YYYY-MM-DDTHH:MM")` is interpreted as **local time** by the spec (with no offset suffix), which matches user intent. `getTime()` returns `NaN` on garbage input and the dialog disables submit — handled.
- **t() with defaultValue idiom:** every new t() call in scope passes `defaultValue`. Consistent with house style.

---

_Reviewed: 2026-05-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
