# Brain Page Code Review — V1.5 + V1.6

**Reviewed:** 2026-05-02
**Depth:** standard (cross-file wiring checked where relevant)
**Files Reviewed:** 32

---

## V1.5 findings — status

| ID | File | Verdict |
|----|------|---------|
| WR-01 | `SidebarModeSwitch.tsx` — dead useEffect condition | ✅ CLOSED — uses `location.pathname` |
| WR-02 | `BrainTimelineView.tsx` — stale `isFetchingNextPage` closure | ✅ CLOSED — `isFetchingRef` pattern in rewrite |
| WR-03 | `BrainComposeModal.tsx` — double `onClose` on cancel-after-success | ✅ CLOSED — `handleClose` cancels timer |
| IN-01 | `BrainPage.tsx` — empty-userId renders `BrainEmptyState` prematurely | ✅ CLOSED — `if (!userId \|\| isLoading)` guard |
| IN-02 | `BrainGraphView.tsx` — SVG edge array-index keys | ✅ CLOSED — Canvas 2D, no SVG keys |
| IN-03 | `SessionManagementSheet.tsx` — detached anchor unreliable in Firefox | ✅ CLOSED — `document.body.appendChild` |
| IN-04 | `BrainPage.tsx` — `selectedNodes` new reference every render | ✅ CLOSED — `useMemo` in place |

All v1.5 findings resolved. No regressions detected.

---

## V1.6 findings

### Info

#### IN-V6-01: `draw()` captured by closure — not stable across data reloads

**File:** `src/app/components/brain/BrainGraphView.tsx`

`draw()` is defined inside the component body and called from two sites: the RAF `loop()` closure (inside the `useEffect([data])`) and a bare `useEffect(() => { draw(); })`. Both work correctly today because React re-runs the bare effect after every render, keeping the canvas in sync with interaction state.

The risk: if `data` changes while a RAF tick is in flight, the tick's `draw()` call will use the new `simNodesRef` (which was just replaced) with the old `viewTransformRef` (unchanged). This is a 1-frame glitch and is imperceptible in practice. No action needed for V1.6; V1.7 canvas refactor can extract `draw` into a stable `useCallback`.

---

#### IN-V6-02: `connectedIds` useMemo tracks `simLinksRef.current.length`, not content

**File:** `src/app/components/brain/BrainGraphView.tsx` (around line 308–318)

```ts
const connectedIds = useMemo<Set<string> | null>(() => {
  ...
  simLinksRef.current.forEach(...)
  ...
}, [focusId]); // simLinksRef.current.length appears in comment but not dep
```

Ref mutations are invisible to React. The memo re-runs only when `focusId` changes. If the edge list changes (e.g. after a compose invalidation refreshes `/brain/graph`) without `focusId` changing, the spotlight set stays stale for one render cycle.

In practice this does not occur: compose mutations clear `selectedIds` → `focusId` becomes `null` → memo returns `null` → next render with new data rebuilds. Safe for V1.6.

---

#### IN-V6-03: Timeline slider `maxSecs` drifts behind real "now" for long-lived sessions

**File:** `src/app/components/brain/BrainTimelineView.tsx`

`maxSecs.current` is initialised at component mount and updated only when the user clicks "Now" reset. If the page is left open for hours, the slider's right edge is behind the actual present. New memories saved during that session would not be reachable via the slider without a page reload or clicking "Now".

The "Now" reset button (`handleResetToNow`) refreshes `maxSecs.current` and works correctly. The UX is acceptable for the V1.6 scaffold; V1.7 can tie `maxSecs` to a `Date.now()` getter polled on focus.

---

#### IN-V6-04: Search query persists across tab switches

**File:** `src/app/components/brain/BrainPage.tsx`

`searchQuery` state lives in `BrainPage` and is not cleared when the user switches to the Timeline tab and back. The search input therefore retains its value on return to the Graph tab, which keeps the dim-non-matching filter active. This is consistent (state is preserved) but may be surprising if the user expects a clean graph on return.

Consider clearing `searchQuery` on tab switch or showing a persistent chip ("X filter active") if query is non-empty. Low priority.

---

#### IN-V6-05: localStorage position key uses raw userId — no namespace collision guard

**File:** `src/app/components/brain/BrainGraphView.tsx`

The S2 persistence key is `brain-graph-positions-${userId}`. If `userId` is a small integer (e.g. `1`), a different app running on the same origin that also writes `brain-graph-positions-1` would corrupt the layout. This is a shared-localhost dev concern only (no production origin collision risk). Safe for production; worth noting if the app ever runs as a micro-frontend.

---

## Acceptance checklist

✅ Layout converges — no corner clustering (sunflower warm-start + per-kind gravity)
✅ Smooth zoom + pan — Canvas 2D at 60fps, non-passive wheel, pointer capture
✅ Hover feels instant — S1 `requestIdleCallback` prefetch every 60 frames
✅ Click opens drilldown — M3 `DetailPanel` with full schema + 404 fallback to graph-node data
✅ Search filters graph — M2 search bar above graph, S3 dim-non-match to 0.15 opacity
✅ Timeline slider scaffolded — S5 range input driving `?to=<unix>` param
✅ Position persistence — S2 localStorage save on settle + unmount, restore on mount
✅ i18n green — all new strings in en.json + ar.json
✅ a11y green — keyboard nav (Arrow/Enter/Escape), sr-only node list, focus ring, ARIA labels
✅ TypeScript clean — zero production errors (noUncheckedIndexedAccess compliant)
✅ No new npm dependencies beyond approved `d3-force`

---

_Reviewed: 2026-05-02_
_Reviewer: Claude Sonnet 4.6_
_Depth: standard_
