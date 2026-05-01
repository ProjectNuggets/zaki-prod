# v1.5 Frontend Code Review

**Reviewed:** 2026-05-01
**Depth:** standard (cross-file wiring checked where relevant)
**Files Reviewed:** 25

---

## Summary

Overall the v1.5 frontend implementation is solid. The brain page components, query hooks, and session list wiring are clean and follow established patterns in the codebase. Most issues are in the warning/info range. There are no critical data-loss or security bugs. Two behavioral bugs stand out as real runtime problems: a dead `useEffect` condition in `SidebarModeSwitch` that breaks nav highlighting on direct URL load, and a stale closure in `BrainTimelineView`'s `IntersectionObserver` that can fire duplicate pagination requests.

---

## Warnings

### WR-01: Dead `useEffect` condition in `SidebarModeSwitch` — brain nav never highlights on direct URL load

**File:** `src/app/components/sidebar/SidebarModeSwitch.tsx:52`

**Issue:** The effect that is supposed to sync `sidebarMode` when the user navigates directly to `/brain` (e.g. via bookmarks, sharing a link, or browser history) has a tautological condition that is always false. The body of the `if` block never executes.

```ts
// Current — always false, body is dead code
if (sidebarMode === "brain" && sidebarMode !== "brain") {
  setSidebarMode("brain");
}
```

The only place `sidebarMode` is set to `"brain"` is the brain button's `onClick` (line 181), so clicking the nav item works correctly. Arriving at `/brain` any other way leaves `sidebarMode` stuck at `"zaki"` (the initial store value), so the brain nav item does not show the active indicator and the sidebar keeps rendering the Zaki session list.

**Fix:** Check the pathname, not the current store value.

```ts
useEffect(() => {
  if (location.pathname === "/brain" && sidebarMode !== "brain") {
    setSidebarMode("brain");
  }
}, [location.pathname, sidebarMode, setSidebarMode]);
```

---

### WR-02: Stale `isFetchingNextPage` closure in `BrainTimelineView` can fire duplicate page fetches

**File:** `src/app/components/brain/BrainTimelineView.tsx:44-59`

**Issue:** The `IntersectionObserver` is rebuilt only when `hasNextPage` or `fetchNextPage` changes. `isFetchingNextPage` is read inside the callback but is not in the dependency array, so the observer closes over the value of `isFetchingNextPage` at creation time (almost always `false`). If the sentinel is still visible in the viewport when a fetch is in flight, the guard `!isFetchingNextPage` evaluates the stale `false` and calls `fetchNextPage()` again.

```ts
// Current — isFetchingNextPage captured stale
useEffect(() => {
  // ...
  const obs = new IntersectionObserver((items) => {
    for (const it of items) {
      if (it.isIntersecting && hasNextPage && !isFetchingNextPage) { // stale
        fetchNextPage();
      }
    }
  }, { rootMargin: "200px" });
  obs.observe(node);
  return () => obs.disconnect();
}, [hasNextPage, fetchNextPage]); // isFetchingNextPage missing
```

TanStack Query deduplicates concurrent calls for the same `pageParam`, so this does not produce duplicate data in the list, but the redundant network request fires on every intersection event while a fetch is in progress.

**Fix:** Add `isFetchingNextPage` to the dependency array.

```ts
}, [hasNextPage, fetchNextPage, isFetchingNextPage]);
```

---

### WR-03: `BrainComposeModal` can call `onClose` twice after a successful synthesis

**File:** `src/app/components/brain/BrainComposeModal.tsx:64-67`

**Issue:** After a successful synthesis the component starts an 800 ms timer that calls `onClose()`. If the user clicks the Cancel button before the timer fires, `onClose` is called immediately by the button handler, and then called a second time by the still-pending timer. In the current parent (`BrainPage`), `onClose` is `() => setSelectedNodeIds([])`. Calling it twice on an already-empty array is harmless today, but the timer cleanup only runs on unmount (not on explicit close), so this is a latent bug if `onClose` is ever given side effects such as navigation or an API call.

**Fix:** Cancel the timer when the user explicitly closes, not only on unmount.

```ts
const handleClose = useCallback(() => {
  if (closeTimerRef.current) {
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }
  setJustSynthesized(false);
  onClose();
}, [onClose]);
```

Then use `handleClose` in place of every direct `onClose()` reference in the JSX.

---

## Info

### IN-01: `BrainPage` renders `BrainEmptyState` prematurely when `user.id` is not yet resolved

**File:** `src/app/components/brain/BrainPage.tsx:19-48`

**Issue:** `userId` is derived as `String(user?.id ?? "")`. When `user` is not null (the user is logged in and has a token) but `user.id` has not yet been populated (e.g. the profile fetch is in flight after auth resolves), `userId` is `""`. With `enabled: !!userId = false`, the graph query never fires, `graphQuery.isLoading` is `false`, and `totalNodes` defaults to `0`. This causes `BrainEmptyState` to render briefly even for users who have memories. `App.tsx` blocks on the token check but not on the full profile object, so the window exists.

The same pattern applies to `ZakiDashboard.tsx:137` where `useBrainGraph("")` is called and `memoryCount` defaults to `0`, showing "No memories yet" in the dashboard card.

**Fix:** Guard before the empty-state check.

```tsx
// BrainPage.tsx
if (!userId) return <SkeletonBrainPage />;
if (graphQuery.isLoading) return <SkeletonBrainPage />;
```

---

### IN-02: `BrainGraphView` uses array-index keys for SVG edges

**File:** `src/app/components/brain/BrainGraphView.tsx:239,248`

**Issue:** Both the `<path>` (semantic edges) and `<line>` (other edges) elements use `key={i}` where `i` is the positional index in `data.edges.map(...)`. If the edge list changes (e.g. after a compose mutation invalidates the graph query and the response returns edges in a different order), React will reuse the wrong DOM nodes and may produce brief visual glitches.

**Fix:** Use a stable key derived from the edge endpoints.

```tsx
key={`${e.source}:${e.target}:${e.type}`}
```

---

### IN-03: Export anchor not appended to the document in `SessionManagementSheet`

**File:** `src/app/components/agent/SessionManagementSheet.tsx:115-119`

**Issue:** The download is triggered by creating an `<a>` element, setting `href` and `download`, and calling `.click()` without appending it to `document.body`. This works in Chrome but is unreliable in Firefox and older Safari, where `.click()` on a detached anchor does not reliably trigger a file download.

**Fix:**

```ts
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
```

---

### IN-04: `selectedNodes` in `BrainPage` is a new array reference on every render

**File:** `src/app/components/brain/BrainPage.tsx:27-28`

**Issue:** `selectedNodes` is computed with an inline `.filter()` call, producing a new array reference on every render of `BrainPage`. This array is passed to `BrainComposeModal` as a prop and appears in that component's `useEffect` dependency array `[open, selectedNodes, title]`. The effect re-runs on every parent render even when the selection content has not changed. When `open` is `true` and `title` is non-empty, the effect exits on the `!title` guard so there is no observable bug today, but the unnecessary re-runs are wasteful.

**Fix:** Memoize `selectedNodes` in `BrainPage`.

```ts
const selectedNodes = useMemo(
  () => (graphQuery.data?.nodes ?? []).filter((n) => selectedNodeIds.includes(n.id)),
  [graphQuery.data?.nodes, selectedNodeIds],
);
```

---

_Reviewed: 2026-05-01_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
