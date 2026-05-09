---
phase: composer-chunk3
reviewed: 2026-05-08
commit: cee921d
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/queries/useTextToSpeech.ts
  - src/app/components/chat/MessageActions.tsx
  - src/app/components/chat/MessageBubble.tsx
  - src/app/components/InputArea.tsx
  - src/app/components/ChatArea.tsx
  - src/i18n/locales/en.json
  - src/i18n/locales/ar.json
findings:
  p0: 1
  p1: 5
  p2: 6
  total: 12
status: issues_found
---

# Composer Chunk 3 Review (commit cee921d)

**Scope:** Three activations: TTS read-aloud, programmatic compact, inline approval banner.
**Verdict:** Ship-blocking issues are limited to one TTS leak and one compact double-fire window. Most other findings are confusion/UX or pre-existing. Approval double-render is a real UX pothole worth fixing in this chunk.

## P0 — must fix before merge

### P0-01: TTS blob URL cache leak (unbounded)
**File:** `src/queries/useTextToSpeech.ts:54, 93`
**Issue:** `URL.createObjectURL(blob)` is called once per (messageId, format) and stored in `cache[messageId]`. There is no `URL.revokeObjectURL` anywhere. The store has no eviction, no LRU, no `stop()`-time cleanup, no unmount hook. In a long session where the user reads-aloud N distinct assistant messages, N blob URLs accumulate in the document for the lifetime of the tab. Each blob holds the full decoded audio buffer (often 100s of KB to MB).
**Fix:** Pick one of:
  - Cap the cache. Evict the oldest URL with `URL.revokeObjectURL` when size exceeds e.g. 10 entries.
  - Revoke on session/route change. Add a `stop()`-style `clearCache` that walks `cache` and revokes every URL, called from a top-level effect when `activeThreadId` flips.
  - Don't cache. Re-fetch on each click. Synthesis is fast enough that caching mostly matters for the same-message replay; a 1-entry "last played" cache covers the realistic re-click case.
```ts
// Minimal fix — bounded cache:
const MAX_TTS_CACHE = 8;
set((s) => {
  const next = { ...s.cache, [messageId]: fresh };
  const keys = Object.keys(next);
  if (keys.length > MAX_TTS_CACHE) {
    const oldest = keys[0];
    URL.revokeObjectURL(next[oldest]);
    delete next[oldest];
  }
  return { cache: next };
});
```

## P1 — fix this chunk

### P1-01: Compact button double-fire window
**File:** `src/app/components/ChatArea.tsx:2982-3007`
**Issue:** `handleCompactSession` reads `isCompacting` from the closure (`if (isCompacting) return`). `setIsCompacting(true)` schedules a state update but the callback identity does not change until React commits and re-runs `useCallback` (deps include `isCompacting`). Two rapid synchronous invocations of the same callback ref both see `isCompacting === false` and both fire `compactAgentSession(sessionKey)`. The button's `disabled` prop helps, but does not close the window for synthetic events, keyboard `Enter` fired twice, or any pathway that calls `onCompact()` outside of a re-rendered click handler.
**Fix:** Use a ref for the in-flight guard. State remains for UI; ref is the source of truth for re-entry.
```ts
const compactingRef = useRef(false);
const handleCompactSession = useCallback(async () => {
  if (compactingRef.current) return;
  compactingRef.current = true;
  setIsCompacting(true);
  try { /* ... */ } finally {
    compactingRef.current = false;
    setIsCompacting(false);
  }
}, [activeZakiSessionKey, activeThreadId, agentUserId, refreshContextGauge]);
```
Side benefit: drops `isCompacting` from `useCallback` deps — no more re-identifying on every flip.

### P1-02: TTS concurrent-toggle creates duplicate audio elements
**File:** `src/queries/useTextToSpeech.ts:64, 81-82`
**Issue:** `toggle` snapshots `state = get()` once at line 64. `getOrCreateAudio(state)` checks `state.audio` from that stale snapshot. On the very first toggle for a session `state.audio === null`, so a fresh `new Audio()` is created. Line 82 commits it via `set({ audio })`. If a second toggle starts before the first commits (concurrent clicks on two different messages, or React 18 transitions), both calls see `state.audio === null`, both construct their own `Audio()`, and only the last `set` wins as the "singleton." The other audio element is now an orphan that may still be playing/fetching but is no longer reachable through `state.audio` for `pause()` calls. Subsequent stop() / cross-message-stop logic targets the wrong element.
**Fix:** Read `audio` via `get()` after the early-return guards, and commit synchronously before any `await`:
```ts
let audio = get().audio;
if (!audio) {
  audio = new Audio();
  set({ audio });
}
```
The current `getOrCreateAudio(state)` helper takes a stale param and is the trap. Either delete it or make it pull from `get()` itself.

### P1-03: Stale audio event handlers fire against new playback
**File:** `src/queries/useTextToSpeech.ts:73-79, 109-118`
**Issue:** When switching from message A (playing) to message B, line 74 calls `state.audio.pause()` but the previous `onended` / `onerror` handlers (closed over `messageId === A`) remain attached. The handlers correctly check `get().activeMessageId === messageId` and no-op when the active id has moved on, so there is no state-corruption bug today. However, if A's audio was at end-of-stream when paused, an `onerror` from a network failure on the same element can still fire and the closure-captured `messageId` is A. The current guard saves us, but it is fragile: any future refactor where the handler unconditionally calls `set` will silently break. Also, when re-clicking the same message from cache, `audio.src = blobUrl` is reassigned without resetting `currentTime` — replay-from-middle behavior is browser-dependent.
**Fix:** Null out handlers before pausing and reset state explicitly:
```ts
if (state.audio) {
  state.audio.onended = null;
  state.audio.onerror = null;
  state.audio.pause();
}
// On re-play of cached blob:
audio.currentTime = 0;
```

### P1-04: Approval banner renders twice with independent local state
**File:** `src/app/components/ChatArea.tsx:6287-6294` and `src/app/components/chat/views/ChatView.tsx:134-138`
**Issue:** `ApprovalRequiredCard` is mounted in two places when an approval is pending: above the composer (new) and inside the timeline (existing). Each instance owns its own `useState` for `submitting` / `decided`. When the user clicks Approve on the inline banner, `onApprove` fires the backend call, the inline card flips to "approved." The timeline card sees the same `request` prop unchanged (parent has not yet cleared `nullalisApprovalRequest` — note the comment at line 3019 explicitly preserves it for replay) and remains stuck on the Approve/Deny buttons. Clicking the timeline card's Approve will call `approveAgentSession` a second time. The backend probably 4xx's the duplicate, but the user sees a spinner + an indeterminate result.
**Fix options:**
  - Clear `nullalisApprovalRequest` after a successful `handleApprovalAction`, then render a static "approved/denied" history pill in the timeline (sourced from the persisted transcript). This matches the comment's intent of "preserve for replay" without leaving an active actionable card behind.
  - Lift `decided` to a parent-managed map keyed by `request.id`, passed down to both instances so they reflect the same decision. Cheaper, but bandaids the dual-render rather than fixing it.
  - Render the timeline copy as read-only (no buttons) when an inline copy is also visible. Pass a `readonly` prop.
Recommend option 1 — single source of truth in the parent.

### P1-05: Hardcoded English toasts in compact handler
**File:** `src/app/components/ChatArea.tsx:2985, 3000, 3002`
**Issue:** Three user-visible strings are inline English: `"Session not ready yet"`, `` `Context compacted${savedSummary}` ``, `"Couldn't compact — try again"`. The codebase i18ns everything else through react-i18next. The `compactPreflightActionBusy` key exists in both en/ar locales already, so the i18n table is being used; the compact toasts just got missed.
**Fix:** Add `zakiControls.compact.{sessionNotReady, success, successWithDelta, error}` and replace.

## P2 — small, fix when convenient

### P2-01: Em dash in user-visible string violates project rule
**File:** `src/i18n/locales/en.json:356` and `src/app/components/ChatArea.tsx:3002`
**Issue:** `"Couldn't read aloud — try again."` and `"Couldn't compact — try again"` both contain an em dash. The project memory rule "No Em Dashes" forbids em dashes in visible content; use a period or comma.
**Fix:** `"Couldn't read aloud. Try again."` / `"Couldn't compact. Try again."`

### P2-02: Empty-id store subscriptions
**File:** `src/app/components/chat/MessageActions.tsx:34-35`
**Issue:** `const ttsTargetId = messageId || ""` and `useTextToSpeechForMessage(ttsTargetId)` always subscribes, even when the read-aloud button will be hidden because `messageText` is empty. Every assistant turn whose content is tool-only still subscribes to the TTS store with id `""`. Cheap, but pointless.
**Fix:** Early-return before the hook call, or guard with `messageId ? useTextToSpeechForMessage(messageId) : { status: null, toggle: noop }` (note: must not violate Rules of Hooks — restructure as a small inner component that mounts only when `ttsAvailable`).

### P2-03: TTS catch in MessageActions swallows non-network errors
**File:** `src/app/components/chat/MessageActions.tsx:64-69`
**Issue:** The button handler does `try { await ttsToggle(...) } catch { toast.error(readAloudError) }`. The store's `toggle` only `throw`s on synthesize failure. The `audio.play()` rejection branch (line 122-127 of `useTextToSpeech.ts`) silently clears state and does NOT throw — so the user sees no feedback when autoplay is blocked. Result: click does nothing, button reverts to Volume2, no toast.
**Fix:** Have the play-rejection branch throw (or set a transient error status the hook surfaces) so the catch fires and the user gets a "tap again" toast. At minimum, log to console so it is debuggable.

### P2-04: `getOrCreateAudio` helper signature is misleading
**File:** `src/queries/useTextToSpeech.ts:33-38`
**Issue:** Takes `state` and reads `state.audio`, but the caller already has the snapshot. Worse, when it constructs a new Audio it does not call `set` — the caller has to do it on line 82 with a separate `if (!state.audio)` check on the same stale snapshot. Two places to keep in sync, easy to break (and is broken — see P1-02).
**Fix:** Inline it inside `toggle` after fixing P1-02. Delete the helper.

### P2-05: `onCopy` aria-label hardcoded English (pre-existing)
**File:** `src/app/components/chat/MessageActions.tsx` (existing copy button below the new TTS button)
**Issue:** Flagged in user prompt — pre-existing, not introduced by this commit. Worth fixing in a follow-up sweep along with P1-05 i18n cleanup.

### P2-06: `void refreshContextGauge()` swallows errors silently
**File:** `src/app/components/ChatArea.tsx:2993`
**Issue:** Fire-and-forget. If the gauge refresh fails after a successful compact, the success toast still fires and the user sees a stale gauge with no signal. Probably intentional (don't fail the whole flow), but worth a `.catch(console.warn)` for diagnostics.

## Cleared (not bugs)

- **MessageBubble TTS dedup vs. extracted images.** `stripToolCallMarkup(message.content)` returns assistant prose only; image generation surfaces via `extractGeneratedImages` are tool-result artifacts, not assistant text. No double-read risk. (Cleared per user prompt question 7.)
- **`compactAgentSession` import is unique.** Single occurrence at `ChatArea.tsx:20`, single call site at line 2991. (Cleared per user prompt question 8.)
- **User-gesture-token expiry on slow synth.** The `toggle` flow fetches THEN calls `audio.play()` after the synth resolves. Most browsers preserve the user-activation token across a single async hop in the same task. Tested mental model: click → `await fetch` → `await audio.play()` is the canonical pattern Chrome/Safari accept. The `try/catch` at line 120-127 correctly clears state on rejection. The remaining concern (no user-visible feedback on autoplay rejection) is captured in P2-03.

## Summary

Ship-blocker is P0-01 (memory leak), and you really want P1-01 (compact double-fire) and P1-04 (approval double-render UX) in this chunk too. P1-02 and P1-03 harden the TTS store against follow-on edits — recommended but the live failure mode is narrow. Everything else is polish.

The three features themselves are well-shaped: store boundaries are clean, the prop contracts on `InputArea` (`onCompact` + `isCompacting`) are sensible, and the inline approval banner solves a real "where do I click" problem. None of the findings indicate the design needs to change; all are local fixes inside the new code.

---

_Reviewed: 2026-05-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
