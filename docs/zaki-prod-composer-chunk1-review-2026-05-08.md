---
phase: composer-chunk1
commit: ef9eff7
reviewed: 2026-05-08
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/app/components/chat/rendering/extractGeneratedImages.ts
  - src/app/components/chat/rendering/extractGeneratedImages.test.ts
  - src/app/components/chat/MessageBubble.tsx
  - src/app/components/chat/QuickReplyChips.tsx
  - src/app/components/chat/views/ChatView.tsx
  - src/app/components/InputArea.tsx
  - src/app/components/ChatArea.tsx
findings:
  p0: 0
  p1: 5
  p2: 7
  total: 12
status: issues_found
---

# Composer Chunk 1 — Code Review (commit ef9eff7)

Reviewed against the prompt's eight focus points plus a generic sweep. No P0 (security / data-loss) issues. Five P1s worth fixing before this ships to users; seven P2s for the follow-up pass.

## Summary

The `extractGeneratedImages` helper itself is clean (regex `lastIndex` reset is correctly inside the per-event loop, JS is single-threaded so no actual race). The bugs are concentrated in the integration layer: dedupe miss-fires inside fenced code blocks, drag-drop overlay gets stuck on cross-window drag-out, Safari clipboard items are missed, and a draft-persistence write-races against thread switching. ArrowUp gate is correct. Quick-replies have one real concern (i18n/comment mismatch on "remember") plus an attachment-discard surprise.

---

## P1 — Real bugs, fix before ship

### P1-01: Dedupe regex matches images inside fenced code blocks, suppressing the genuine reply

**File:** `src/app/components/chat/MessageBubble.tsx:99-105`

When the assistant writes a generated image AND, in the same reply, demonstrates the markdown syntax inside a fenced code block, the dedupe filter removes the real image:

```
Here's the image:
![cat](https://x.com/cat.png)

(Markdown syntax: ```![alt](url)```)
```

The dedupe regex scans `message.content` raw — it has no idea what's inside ` ``` ` fences. parseAssistantContent will not render the fenced occurrence as an image, but the dedupe SET will still contain that URL, and `images.filter(... !inlineUrls.has(img.url))` drops the hoisted image. Net effect: image vanishes from the bubble.

**Fix:** strip fenced/inline code spans before scanning, or run the dedupe against the parsed-block tree instead of raw content.

```ts
const stripped = (message.content || "")
  .replace(/```[\s\S]*?```/g, "")
  .replace(/`[^`\n]*`/g, "");
// then run /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g over `stripped`
```

### P1-02: Drag overlay can get stuck open when user drags out of the window

**File:** `src/app/components/InputArea.tsx:151-170`

`dragDepthRef` counts dragenter/dragleave to handle child crossings. But when the user drags a file into the form, then drags out *past the window edge* and releases the mouse outside the document, no `dragleave` event for the form fires (the OS owns the cursor at that point), and `drop` never fires either. Depth stays at 1, overlay stays open until the next dragenter.

**Fix:** add a window-level `dragend` and `mouseleave` (on document) listener that resets depth + overlay to zero, and a `dragleave` on document with a `relatedTarget == null` check:

```ts
useEffect(() => {
  const reset = () => {
    dragDepthRef.current = 0;
    setIsDraggingFile(false);
  };
  const onWindowDragLeave = (e: DragEvent) => {
    if (e.relatedTarget == null) reset();
  };
  window.addEventListener("dragend", reset);
  window.addEventListener("drop", reset);
  document.addEventListener("dragleave", onWindowDragLeave);
  return () => {
    window.removeEventListener("dragend", reset);
    window.removeEventListener("drop", reset);
    document.removeEventListener("dragleave", onWindowDragLeave);
  };
}, []);
```

### P1-03: Safari paste delivers images via `clipboardData.items`, not `.files`

**File:** `src/app/components/InputArea.tsx:141-149`

`handlePaste` reads only `event.clipboardData?.files`. In Safari (both macOS and iOS), screenshots and copied images frequently arrive as `clipboardData.items[i].kind === "file"` with an empty `clipboardData.files`. The paste is dropped silently; user sees their image not attach.

**Fix:** fall back to `items` when `files` is empty:

```ts
const handlePaste = useCallback((event: React.ClipboardEvent<HTMLTextAreaElement>) => {
  const dt = event.clipboardData;
  if (!dt) return;
  let files: File[] = Array.from(dt.files || []);
  if (files.length === 0 && dt.items) {
    files = Array.from(dt.items)
      .filter((it) => it.kind === "file")
      .map((it) => it.getAsFile())
      .filter((f): f is File => f != null);
  }
  if (files.length === 0) return;
  event.preventDefault();
  setAttachments((prev) => [...prev, ...files]);
}, [setAttachments]);
```

### P1-04: Draft-persistence write-race on thread switch

**File:** `src/app/components/InputArea.tsx:407-433`

Two effects depend on `draftStorageKey`:

- Hydrate effect (lines 407-420): on key change, reads new key's draft and calls `setInputValue(restored)`.
- Persist effect (lines 422-433): on `[draftStorageKey, inputValue]` change, writes `inputValue` under `draftStorageKey`.

When the user switches A → B, React commits the new `draftStorageKey` while `inputValue` still holds A's text from the previous render. Both effects run after that commit. React runs them in declaration order:

1. Hydrate runs → reads B's stored draft → `setInputValue(B's text)` (schedules re-render).
2. Persist runs in the SAME post-commit cycle → writes A's text under B's key.
3. Re-render → persist runs again → overwrites with B's text.

Net: B's draft is overwritten by A's text for one tick, then restored. If the tab is closed or storage is read by another listener between steps 2 and 3, B's draft is lost / corrupted.

**Fix:** gate the persist effect on a "key-stable" guard, or track the previous key:

```ts
const prevKeyRef = useRef(draftStorageKey);
useEffect(() => {
  if (prevKeyRef.current !== draftStorageKey) {
    // Just switched threads. Skip this persist tick — hydrate owns it.
    prevKeyRef.current = draftStorageKey;
    return;
  }
  if (!draftStorageKey || typeof window === "undefined") return;
  try {
    if (inputValue) window.sessionStorage.setItem(draftStorageKey, inputValue);
    else window.sessionStorage.removeItem(draftStorageKey);
  } catch { /* ignore */ }
}, [draftStorageKey, inputValue]);
```

Or merge the two effects into one and write only inside the "same key" branch.

### P1-05: QuickReplyChips "remember" prefill no longer routes through `/remember`

**File:** `src/app/components/chat/QuickReplyChips.tsx:13-15` (header comment) vs `src/i18n/locales/en.json:920-924` and `ar.json:920-924`

The component header comment claims:

> "Save to brain" — sends `/remember` so the user lands on the remember command with prefilled cursor focus, taking advantage of the existing slash-command pipeline

But the actual prefill in both locales is plain prose ("Save the key takeaway from this conversation to my brain." / "احفظ الفكرة الأساسية…"). It does NOT start with `/`, so it bypasses `detectSlash` and goes through the normal LLM turn instead of the slash-command pipeline. The "remember" feature never fires; the user just sends a sentence.

**Fix:** either change the prefill to `"/remember "` (followed by space, mirroring `handleSlashSelect`'s `takesArgs` behavior) and adjust the click path to populate-not-send for that one kind, or update the comment to reflect that this is just a natural-language hint. Pick one — current state is broken-by-design.

---

## P2 — Worth a follow-up pass

### P2-01: Quick-reply discards staged attachments

**File:** `src/app/components/ChatArea.tsx:6011-6015`

`onQuickReply` calls `handleSend(prefill, [])` with a hard-coded empty attachments array. If the user has staged files in the composer and then clicks a quick-reply chip, the staged attachments are silently dropped. Either disable chips while attachments are staged, or pass `attachments` through.

### P2-02: `isImageGenerateEvent` tool-name compare is case-sensitive while eventType is lowercased

**File:** `src/app/components/chat/rendering/extractGeneratedImages.ts:44-58`

`eventType` is `String(event.eventType || "").toLowerCase()`, but the tool name is compared `tool === "image_generate"` without any casing normalization. If the runtime ever emits `"Image_Generate"` or camelCase, the helper silently returns nothing. Cheap defense-in-depth.

```ts
return (tool || "").toLowerCase() === "image_generate";
```

### P2-03: Dedupe URL match is exact-string; agent reply with relative path vs absolute URL won't dedupe

**File:** `src/app/components/chat/MessageBubble.tsx:99-105` + `extractGeneratedImages.ts:26`

`extractGeneratedImages` only captures `https?://...` URLs (regex requires the protocol). If the agent inlines `![cat](/workspace/images/cat.png)` in `message.content` while the tool result emits the absolute `https://together-ai-uploaded-user-images.../cat.png`, the dedupe sets contain different strings and both copies render.

Realistically the tool always emits absolute URLs so this won't bite today, but normalizing to filename or canonical-URL would harden it.

### P2-04: `lastUserMessage` IIFE runs full backwards scan on every ChatArea render

**File:** `src/app/components/ChatArea.tsx:6253-6262`

The arrow-up recall computes `lastUserMessage` via an inline IIFE that scans `messages` from the end on every parent render. For long threads this is cheap but unnecessary work — a `useMemo([messages])` keeps the same scan but skips it on unrelated re-renders.

(Out of v1 review scope per agent guidelines on perf, but it'll show up under React Profiler.)

### P2-05: Empty-thread "scratchpad" drafts are not persisted

**File:** `src/app/components/ChatArea.tsx:6249-6253` (threadKey computation)

`threadKey` is null whenever `activeThreadId` is null (pre-first-send empty state). InputArea then skips persistence entirely, so a user typing a long first message into a new thread, navigating away, and back will lose it.

This may be deliberate (no thread id to scope under), but workspace-scoped fallback (`zaki:draft:${activeWorkspaceSlug}::__new`) would cover the muscle memory cheaply. Confirm with Alfred whether scratchpad-before-first-send should persist.

### P2-06: Persist effect double-removes on submit

**File:** `src/app/components/InputArea.tsx:382-396` + `422-433`

`submitMessage` calls `removeItem(draftStorageKey)` synchronously, then `setInputValue("")`. The persist effect then fires on the empty-string change and calls `removeItem` again. Harmless but redundant — the explicit removeItem in submitMessage can be removed; the effect covers it.

### P2-07: `stripToolCallMarkup` runs four regex passes on every MessageBubble render, not memoized

**File:** `src/app/components/chat/MessageBubble.tsx:16-24` + line 177

Each render of an assistant bubble runs four regex replacements over `message.content` inline in the JSX (`(() => { const content = ... })()`). `useMemo` over `[isUser, message.content]` would skip the work on parent re-renders. Out of v1 review perf scope; flagging for the follow-up.

---

## What I checked and did NOT flag

- **`extractGeneratedImages` regex `lastIndex` race:** not a bug. JS is single-threaded; the helper resets `lastIndex` inside the per-event for-loop before each `exec` cycle. Two simultaneous `MessageBubble` renders cannot interleave executions on the same regex literal.
- **MessageBubble dedupe regex `lastIndex`:** the regex `re` is declared inside `useMemo`, so it's a fresh instance per memo run. No shared state.
- **ArrowUp gate (`inputValue.length === 0`)**: correct. Once any text is in the textarea, ArrowUp navigates the textarea normally; the recall only fires on a fully empty input. Modifier-key escape hatch is also correct.
- **Quick-reply stale closure on `isZakiBotSendLocked`:** `onQuickReply` is a fresh closure on every ChatArea render, and the `isZakiBotSendLocked` it closes over is the latest at click time. No stale-closure bug.
- **`isImageAttachment` regex** in MessageBubble: covers png/jpe?g/gif/webp/avif/svg/bmp. Fine.

---

_Reviewed: 2026-05-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
