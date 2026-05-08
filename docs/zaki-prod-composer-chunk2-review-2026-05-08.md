---
commit: 0fccdb5
title: "feat(composer): chunk 2 — compact pre-flight, per-turn toggles, snippets"
reviewed: 2026-05-08
reviewer: Claude (gsd-code-reviewer)
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/app/components/InputArea.tsx
  - src/app/components/ChatArea.tsx
  - src/lib/expansionShortcuts.ts
  - src/lib/expansionShortcuts.test.ts
  - src/i18n/locales/en.json
  - src/i18n/locales/ar.json
findings:
  critical: 2
  warning: 5
  info: 3
  total: 10
status: issues_found
---

# Composer Chunk 2 Review — 2026-05-08

Real bugs only. Style and perf out of scope.

## Summary

Three of the eight focus questions surfaced concrete bugs. The big ones:

1. **Per-turn toggles are dead wires (CR-01).** The commit message says "FE plumb-through guarantees the wire is in place so the toggles aren't lying" — but the toggles ARE lying. `handleSend` only `console.debug`s `options` and never threads them into the actual SSE/turn payload. The user clicks the eye-off icon, sends, and nothing changes server-side. This is exactly the failure mode the comment claims to prevent.
2. **/compact pre-flight button leaks state (CR-02).** Clicking "Compact" calls `onSend("/compact", [])` directly, bypassing `submitMessage`. The user's draft text, staged attachments, draft sessionStorage, and per-turn toggles all survive — they will silently ride along with the user's NEXT real message, including a "private" or "extended thinking" flag the user thought they consumed.
3. **Expansion onChange has a fast-typing race (WR-01).** The rAF imperative `el.value = expanded.value` write can stomp characters typed between the expansion's `setInputValue` and the rAF firing. Controlled-input model fights the imperative write.

The 70% pre-flight threshold (Q1) is technically defensible — it is a render-or-don't-render decision for a separate UI element, not a re-introduction of bucket coloring on the meter. But the rationale in the inline comment ("70% — chosen as the conventional waterline") is the same kind of FE-invented threshold the prior commit (4cd8045) explicitly walked away from. Logged as IN-01.

Quick-reply path (Q7) genuinely ignores per-turn toggles. Whether intentional or not, that contradicts the "toggle resets on send so it never carries over silently" promise — they don't reset, because they're never read in that path. Logged as WR-04.

---

## Critical

### CR-01: Per-turn toggles are wired into nothing

**File:** `src/app/components/ChatArea.tsx:5053-5062`

The commit message explicitly claims:

> The FE plumb-through ensures the wire is in place and the toggles aren't lying about doing something.

It is lying. `handleSend` receives `options` and only does:

```ts
if (options && (options.privateTurn || options.extendedThinking)) {
  console.debug("[zaki] turn options", options);
}
```

`options` is never passed onward. The function continues into the existing send pipeline, builds the SSE payload (or whatever the agent runtime expects), and the `privateTurn` / `extendedThinking` flags do not appear in the payload at any point downstream. A user toggling the eye-off icon and clicking send will send a message that the brain DOES store, every time. Same for extended-thinking.

This is not "wire is in place" — the wire literally terminates at `console.debug`. There is no SSE field, no API param, no header, no metadata channel. The toggles render correctly, reset correctly on local send, and have zero effect on agent behavior.

**Fix:** Either (a) actually thread `options` into the payload that the agent receives — find where the user-message body is constructed for `/api/agent/sessions/.../message` (or the SSE endpoint) and add `private_turn` / `extended_thinking` fields per the agreed backend contract; or (b) explicitly hide the toggles behind a feature flag until the backend is ready and remove the misleading commit-message claim. Shipping non-functional toggles to users with a tooltip that promises "this exchange will not be stored" is a trust hazard, especially given the GDPR framing in the commit message.

---

### CR-02: /compact pre-flight button bypasses send pipeline and leaks composer state

**File:** `src/app/components/InputArea.tsx:774-784`

```tsx
<button
  onClick={() => {
    if (sendLocked || isSending) return;
    onSend("/compact", []);
  }}
  ...
>
```

The handler calls `onSend` directly, NOT `submitMessage()`. As a result, none of the post-send cleanup runs. Concretely, after the user clicks Compact:

| State | submitMessage clears it? | Compact button clears it? |
|---|---|---|
| `inputValue` (draft text) | yes (line 465) | **no** |
| `attachments` | yes (cleared by ChatArea on a normal send) | **no** |
| `draftStorageKey` sessionStorage | yes (lines 469-475) | **no** |
| `privateTurn` toggle | yes (line 467) | **no** |
| `extendedThinking` toggle | yes (line 468) | **no** |

Concrete failure modes:

1. User types a sensitive prompt, toggles `privateTurn` ON, sees the pre-flight banner and clicks Compact instead. `/compact` is sent (without the privateTurn flag — `onSend("/compact", [])` passes no options). The sensitive draft + privateTurn toggle stay armed. User's NEXT keystroke causes them to type more into a still-private draft. They eventually press Enter — fine, that turn is private. But if they instead clear the draft and start typing a non-private message, the `privateTurn` toggle is STILL on (the visible UI tells them so, but if they don't notice)... actually OK, the visible UI tells them. So this is mostly a "user has to manually reset" annoyance.
2. User stages 3 image attachments, sees the pre-flight banner, clicks Compact. `/compact` is sent with `[]` — fine. But the 3 attachments stay in `attachments` state, ride along with whatever the user types next. If the user forgets they're staged (or the chip rendering is below fold), attachments leak into a turn the user didn't intend them for.
3. User has a long draft typed, clicks Compact. Draft is preserved (good!). But if `draftStorageKey` is in play, it stays in sessionStorage. Less severe.

Also note: the `onSend("/compact", [])` adapter at ChatArea:6255 forwards as `handleSend("/compact", [], undefined, undefined)`. The text "/compact" is then trimmed, validated, and sent through the regular message pipeline as user text content. There is **no FE-side interception** that converts "/compact" into the actual `compactAgentSession()` API call (`src/lib/api.ts:1754`). The slash-command list in `src/lib/slashCommands.ts:79` is purely autocomplete metadata. So the entire "Compact" feature is "the agent backend is expected to detect literal `/compact` in user text and act on it." If the backend doesn't, the button does nothing visible (a `/compact` user message bubble appears in the transcript and the agent replies normally). Worth confirming with nullalis.

**Fix:** Route the pre-flight button through the actual compaction API or a dedicated handler:

```tsx
onClick={async () => {
  if (sendLocked || isSending) return;
  await onCompactRequested?.();   // new prop, calls compactAgentSession() in ChatArea
  // OR if keeping the slash-command path, at minimum reset toggles + clear draft + clear attachments + sessionStorage so the
  // user gets a clean composer after clicking. Easiest: extract the cleanup half of submitMessage into a helper and call it
  // here with empty text/attachments, then onSend("/compact", []).
}}
```

The simplest correct version is a new `onCompactRequested` prop on InputArea wired in ChatArea to call `compactAgentSession(threadId)` directly. That bypasses the user-message bubble entirely (cleaner: `/compact` doesn't appear in transcript) and eliminates the dead-text-in-transcript ambiguity.

---

## Warning

### WR-01: Expansion onChange has a fast-typing race that stomps characters

**File:** `src/app/components/InputArea.tsx:871-900`

```tsx
onChange={(e) => {
  let value = e.target.value;
  const ta = e.target;
  const expanded = applyExpansion(value, ta.selectionStart ?? value.length);
  if (expanded) {
    value = expanded.value;
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.value = expanded.value;          // <-- imperative write
      el.setSelectionRange(expanded.caret, expanded.caret);
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    });
  }
  setInputValue(value);
  ...
}}
```

Race trace, fast typing of `:weather f` (rapid keys):

1. **onChange #1** for `:weather ` (after the space): expansion fires, `setInputValue("What's the weather today? ")`, rAF #1 scheduled.
2. React commits, DOM value becomes `"What's the weather today? "`, cursor moves to end.
3. **onChange #2** for `"What's the weather today? f"` (the next typed char appended after commit): no expansion match, `setInputValue("What's the weather today? f")`. React commits, DOM value becomes `"What's the weather today? f"`.
4. **rAF #1 fires**: `el.value = expanded.value` writes back the OLD expanded value `"What's the weather today? "`, **overwriting the `f`** the user just typed. `setSelectionRange(26, 26)` then resets cursor to before where `f` was.
5. The `inputValue` React state is now `"What's the weather today? f"` but the DOM is `"What's the weather today? "`. Controlled-input invariant broken.
6. The next keystroke's `onChange` fires with `e.target.value = "What's the weather today? X"` (browser sees DOM as "What's the weather today? " + new char), and React resyncs to that — silently dropping the `f`.

The two ingredients are: (a) the imperative `el.value = expanded.value` inside rAF, which has no business being there (React already set it via the controlled `value` prop on commit), and (b) the rAF executes after subsequent onChange + commit cycles when the user types fast.

Severity: warning, not critical, because (a) the race window is short (one paint frame) and (b) it only loses chars typed in the immediate post-expansion frame, which is uncommon. But it is a real correctness bug.

**Fix:** Drop the imperative `el.value = expanded.value` inside rAF — it's redundant with `setInputValue(value)` and is the source of the stomp. Keep only the cursor + height logic:

```tsx
if (expanded) {
  value = expanded.value;
  requestAnimationFrame(() => {
    const el = textareaRef.current;
    if (!el) return;
    // Don't write el.value — React's controlled value already did.
    el.setSelectionRange(expanded.caret, expanded.caret);
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  });
}
```

Even safer: gate the rAF cursor restore on the DOM value still matching `expanded.value`:

```tsx
requestAnimationFrame(() => {
  const el = textareaRef.current;
  if (!el || el.value !== expanded.value) return;
  el.setSelectionRange(expanded.caret, expanded.caret);
  ...
});
```

That way if the user has typed past the expansion already, we leave their cursor alone.

---

### WR-02: Cursor positioning after expansion may flicker on slow paints

**File:** `src/app/components/InputArea.tsx:883-890`

Related to WR-01 but distinct. Sequence on a normal-speed expansion:

1. `setInputValue(expanded.value)` schedules React commit.
2. React commits, browser sets DOM `value` programmatically. **Most browsers reset selection to end-of-value when `value` is set imperatively** (Firefox specifically; Chrome/Safari preserve when possible).
3. Browser paints the textarea with cursor at end (correct for `:weather ` → cursor at position 26, which IS end of `"What's the weather today? "`, length 26).
4. rAF callback fires AFTER paint, calls `setSelectionRange(26, 26)`. Cursor was already at 26.

So in the happy path the rAF cursor write is a no-op. The flicker risk is when the expansion has trailing text after the caret (test case at expansionShortcuts.test.ts:42-49 — `:brief and then more`). After expansion: value is `"Brief me on what I missed. and then more"`, caret should be at index 27 (after "Brief me on what I missed. "). On commit, the browser places the cursor at end-of-value (index 40), then rAF moves it to 27 on the NEXT paint. User briefly sees their cursor at end-of-line before it jumps back to mid-line — visible flicker on slow devices.

**Fix:** Do the cursor restore synchronously right after `setInputValue` using `useLayoutEffect` keyed on a "pending expansion" ref, or use `flushSync` to commit immediately and then set selection — both run before paint. Alternatively, set selection twice: once synchronously on the still-pre-commit DOM and once in rAF as the safety net. Lowest-effort acceptable fix: leave the rAF, accept the one-frame flicker, and document it. But WR-01 fix should land first.

---

### WR-03: Compact pre-flight click sends literal "/compact" text — relies on undocumented backend interception

**File:** `src/app/components/InputArea.tsx:778`

```tsx
onSend("/compact", []);
```

There is no FE-side interception of `/compact`. `compactAgentSession()` exists at `src/lib/api.ts:1754` and is only called from `SessionManagementSheet.tsx:92`. The slash-command palette at `src/lib/slashCommands.ts:79` is an autocomplete dropdown, not a router.

So the pre-flight button works iff the agent backend (nullalis) detects literal `/compact` user text and routes it to compaction. If it doesn't:

- A `/compact` user-message bubble appears in the transcript (visual noise).
- The agent replies as if to a regular message.
- Compaction does not happen, but the banner disappears (it gates on `!isSending`, then the next /context refresh re-evaluates).

This is the same backend-contract gap as CR-01 but at least visually the user can tell it didn't work.

**Fix:** Pair with CR-02 — call `compactAgentSession(activeThreadId)` directly from a new InputArea prop, skip the user-text path entirely. As a bonus, no `/compact` bubble appears in transcript.

---

### WR-04: Per-turn toggles silently ignored on quick-reply (S1) path

**File:** `src/app/components/ChatArea.tsx:6026-6035` (quick-reply handler) + `src/app/components/InputArea.tsx:457-468` (submitMessage reset block)

The quick-reply chip handler at ChatArea:6026 calls `handleSend(prefill, carryAttachments)` — three positional args, no `options`. The `privateTurn` and `extendedThinking` toggles live in `InputArea` local state and are not surfaced to ChatArea, so quick-reply by construction cannot read them.

This produces a UX inconsistency:

- User toggles "private turn" ON in the composer.
- User clicks a quick-reply chip ("Yes, do it" or similar).
- The turn is sent **without** the privateTurn flag (toggle ignored).
- The toggle remains ON because `submitMessage()` was not called and the reset block at InputArea:466-468 didn't run.
- User types a follow-up, which IS now privateTurn (the toggle is still ON, and they likely don't realize).
- User has zero indication that the chip-sent turn was not private.

This contradicts the commit-message claim "Toggle resets on send so it never carries over silently" — it carries over silently across the chip click.

**Fix (pick one):**

a. Lift `privateTurn`/`extendedThinking` to ChatArea state (or a dedicated store), pass to InputArea as controlled props, and read them in the quick-reply handler. Reset in both paths.

b. Disable quick-reply chips when either toggle is on (and add a tooltip "Disable private turn / extended thinking to use quick replies"). Lower-effort, more honest.

c. Keep state local but expose a `getTurnOptions()` ref/imperative handle from InputArea that ChatArea calls before invoking handleSend on chip click. Ugly but minimal change.

(b) is probably the right call given the toggles are a privacy contract — "disabled because you've armed a privacy mode" is a clear signal, whereas (a) hides behavior change behind a click the user might not associate with their toggle state.

---

### WR-05: 70% pre-flight threshold conditionalizes UI on a never-rendered intermediate state

**File:** `src/app/components/InputArea.tsx:289-302`

```tsx
const SHOW_COMPACT_PREFLIGHT_AT = 70;
const showCompactPreflight =
  zakiBotMode &&
  !isSending &&
  hasZakiContextValue &&
  zakiContextValue >= SHOW_COMPACT_PREFLIGHT_AT;
```

Two issues:

1. **Hysteresis:** No lower bound to dismiss. If pressure oscillates around 70% (the agent reports 71% → 69% → 71% across consecutive turns), the banner flickers in/out turn-by-turn. Real backends emit pressure deltas that aren't monotonic. **Fix:** show at ≥70%, hide only at <65% (5pp hysteresis band) — same approach as virtually every alert UI.

2. **Comparison with `compaction_threshold_pct`:** The agent owns the actual compaction threshold and reports it via `report.compaction_threshold_pct` (per the cited prior wire-up). Hardcoding 70% means the user sees the pre-flight nudge BEFORE the agent considers itself near-full. If the agent's threshold is 85%, the user gets nagged 15pp early; if it's 60%, the agent has already auto-compacted and the user sees the banner unnecessarily on a fresh compaction. **Fix:** use the agent-reported threshold, fall back to 70% only if absent:

```tsx
const preflightAt = report?.compaction_threshold_pct ?? 70;
const showCompactPreflight =
  zakiBotMode &&
  !isSending &&
  hasZakiContextValue &&
  zakiContextValue >= preflightAt - 10;  // start nudging 10pp before backend would auto-compact
```

This aligns the FE nudge with the backend's actual posture and stops re-introducing arbitrary numbers — exactly the principle from commit 4cd8045 ("FE never owns the pressure").

---

## Info

### IN-01: 70% threshold inline rationale doesn't match the prior commit's stance

**File:** `src/app/components/InputArea.tsx:290-300`

The inline comment says:

> 70% — chosen as the conventional waterline; the agent owns the actual compaction trigger and can fire whenever it wants

This is technically true (the meter itself doesn't bucket-color), so it's not a strict regression of commit 4cd8045's "no arbitrary FE thresholds." But the rationale here ("conventional waterline") is exactly the kind of FE-invented number that commit deleted. It's defensible only because it's a render-or-don't-render decision for a separate UI element rather than a state classification on the meter. Tighten the comment to say so explicitly, AND act on WR-05 to use the agent-reported threshold. Otherwise the next code-review pass will (correctly) flag this as the same anti-pattern coming back.

---

### IN-02: TurnOptions type duplicated, not imported

**File:** `src/app/components/ChatArea.tsx:5057`

`handleSend` inline-types its `options` parameter as `{ privateTurn?: boolean; extendedThinking?: boolean }` rather than importing the `TurnOptions` type that InputArea exports at line 33. If `TurnOptions` gains a third field, ChatArea won't catch it at the type boundary — values passed by InputArea will be silently lost.

**Fix:**

```ts
// ChatArea.tsx
import { InputArea, type TurnOptions } from "./InputArea";

const handleSend = useCallback(async (
  text: string,
  files: File[],
  preferredWorkspaceSlug?: string | null,
  options?: TurnOptions,
) => { ... });
```

---

### IN-03: console.debug in production path is a debug artifact

**File:** `src/app/components/ChatArea.tsx:5060-5061`

The `console.debug("[zaki] turn options", options)` is committed to a production code path with `// eslint-disable-next-line no-console`. The commit message says it's a "hook point for future telemetry" but in its current form it's a debug log that fires on every send with a toggle armed. If telemetry is the goal, replace with `trackProductEvent({...})` (already imported at InputArea.tsx:9) so it actually flows somewhere queryable.

Becomes a critical issue if combined with privacy concerns: a user who armed `privateTurn` sees their intent ("I don't want this stored") logged to the browser console, where it will be captured by any session-replay tool the org runs. Worth promoting to warning if a Sentry/LogRocket/FullStory integration is enabled.

---

## Out of scope (perf / style)

Not flagged per review charter:

- The `onSend={(text, files, options) => void handleSend(text, files, undefined, options)}` lambda at ChatArea:6255 allocates fresh per render. Verified InputArea is not memoized (`export function InputArea({...})`, no `React.memo`) and `onSend` does not appear in any `useEffect`/`useCallback`/`useMemo` dependency array within InputArea. So the fresh allocation has no observable side effect. Not a bug.
- Visual contrast nit: the Compact button uses the same `bg-zaki-warning` translucent fill as the banner background, so they read as flat tones rather than distinct affordance + container. UX polish, not correctness.
- Duplicate height-recalc at InputArea:888-889 (inside rAF) and 896-899 (always-runs after setInputValue) is wasteful but produces only a brief flicker. Out of scope.

---

_Reviewed: 2026-05-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
