# Brain Page Code Review — V1.6 Deep Audit

**Reviewed:** 2026-05-02
**Depth:** thorough (full file read + cross-file analysis)
**Files Reviewed:** 12

- `src/app/components/brain/BrainGraphView.tsx`
- `src/app/components/brain/BrainPage.tsx`
- `src/app/components/brain/BrainTimelineView.tsx`
- `src/app/components/brain/BrainComposeModal.tsx`
- `src/app/components/brain/BrainEmptyState.tsx`
- `src/app/components/brain/BrainSemanticDegradedBanner.tsx`
- `src/queries/useBrainGraph.ts`
- `src/queries/useBrainTimeline.ts`
- `src/queries/useBrainMemory.ts`
- `src/queries/useBrainCompose.ts`
- `src/lib/api.ts` (lines 1616–1801, brain section)
- `src/i18n/locales/en.json` + `ar.json` (brain key)

---

## Critical (CR) — must fix before merge

No critical findings. No injection vulnerabilities, no hardcoded secrets, no auth bypasses, no data-loss paths.

---

## Warnings (WR) — should fix, real bugs or UX regressions

### WR-01: `edgeOpacity` performs O(E × N) linear scan during search — measurable jank

**File:** `src/app/components/brain/BrainGraphView.tsx` lines 530–533

**Issue:** During search, `edgeOpacity` calls `nodes.find(n => n.id === src)` and `nodes.find(n => n.id === tgt)` for every edge in the draw call. `draw()` runs at 60 fps during RAF and also fires after every React render (the unconditional `useEffect` on line 860). For 200 nodes and 400 edges this is ~160,000 comparisons per second just to resolve IDs that d3-force has already resolved. `link.source` and `link.target` are `SimNode` objects after `forceLink` initialization — they already carry `.ref`.

**Impact:** Typing into the search bar triggers a React re-render per keystroke, which triggers `draw()`, which does the full O(E × N) scan. On real data (300–500 nodes, 600–1000 edges) this causes visible frame drops during search typing.

**Fix:** Replace the two `nodes.find` calls with direct casts — d3-force resolves `link.source`/`link.target` to full `SimNode` objects when `forceLink().links()` is called:

```ts
// Before (inside edgeOpacity, lines 531–532):
const srcMatch = matchesSearch(
  nodes.find(n => n.id === src)?.ref ?? { summary: "" } as BrainGraphNode,
  searchQuery,
);
const tgtMatch = matchesSearch(
  nodes.find(n => n.id === tgt)?.ref ?? { summary: "" } as BrainGraphNode,
  searchQuery,
);

// After — O(1), no array scan needed:
const srcMatch = matchesSearch((link.source as SimNode).ref, searchQuery);
const tgtMatch = matchesSearch((link.target as SimNode).ref, searchQuery);
```

The `.ref` property is always present after simulation setup. `src`/`tgt` id variables at the top of `edgeOpacity` remain useful for the `connectedIds`/`hovered` checks above the search branch.

---

### WR-02: `draw()` in RAF loop captures stale `selectedIds`, `searchQuery`, `focusId`, `connectedIds` — one stale frame per interaction

**File:** `src/app/components/brain/BrainGraphView.tsx` lines 454–479, 488, 860

**Issue:** `draw()` is declared in the component body and closes over React render-time values: `selectedIds`, `focusId`, `connectedIds`, `searchQuery`. The RAF `loop()` captured `draw` when `useEffect([data])` ran. On subsequent renders (e.g., when `selectedIds` changes after a click), React creates a new `draw` with updated closure values, but `loop()` still calls the old one.

The unconditional `useEffect(() => { draw(); })` on line 860 corrects this after each render — so the stale frame lasts only ~16 ms. This is the root of IN-V6-01.

**Impact:** One stale frame per interaction. Imperceptible at 60fps on fast devices. On 30fps devices, or when keyboard nav fires Enter rapidly (cycles nodes and opens detail in quick succession), the stale selection ring or spotlight dim is visible as a flicker.

**Fix:** Promote the interaction-driven values into refs so both the RAF path and the render path read the same source:

```ts
const selectedIdsRef = useRef<string[]>(selectedIds);
const searchQueryRef = useRef<string>(searchQuery);
const focusIdRef = useRef<string | null>(null);
const connectedIdsRef = useRef<Set<string> | null>(null);

useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);
useEffect(() => { searchQueryRef.current = searchQuery; }, [searchQuery]);
useEffect(() => { focusIdRef.current = focusId; }, [focusId]);
useEffect(() => { connectedIdsRef.current = connectedIds; }, [connectedIds]);
```

Then `draw()` reads from these refs. The `useEffect(() => { draw(); })` on line 860 remains for the sparse (no-RAF) redraw path.

---

### WR-03: `sr-only` list `<li>` nodes announce content twice to screen readers

**File:** `src/app/components/brain/BrainGraphView.tsx` lines 930–934

**Issue:** Each `<li>` has both `aria-label` (`t("brain.graph.nodeAriaLabel", { summary })`) AND the raw text `{n.summary}` as its child. NVDA, JAWS, and Orca announce the `aria-label` as the accessible name, then separately read the text content. The memory summary is heard twice in rapid succession for every node in the list.

**Impact:** VoiceOver/NVDA users navigating the sr-only list hear each entry duplicated. Disorienting at scale (hundreds of nodes).

**Fix:** Use `aria-label` without text content:

```tsx
// Current:
<li key={n.id} aria-label={t("brain.graph.nodeAriaLabel", { summary: n.summary })}>
  {n.summary}
</li>

// Fixed — aria-label carries the full accessible name, no inner text:
<li key={n.id} aria-label={t("brain.graph.nodeAriaLabel", { summary: n.summary })} />
```

---

### WR-04: Detail panel close does not return focus to canvas

**File:** `src/app/components/brain/BrainGraphView.tsx` lines 156–158, 979–983

**Issue:** When the detail panel is dismissed via the X button (`onClose`), focus is released to `document.body` or the next tabbable element in the DOM. The canvas (`tabIndex={0}`, `role="application"`) should reclaim focus so keyboard navigation continues without requiring the user to re-tab to the graph.

**Impact:** Keyboard-only users must manually re-tab back to the canvas after every drilldown. With `role="application"` declaring this is a self-contained interaction region, this violates the expected focus management contract.

**Fix:**

```tsx
// In BrainGraphView, update the onClose prop passed to DetailPanel (line 980):
onClose={() => {
  setDetailNodeId(null);
  onSelectionChange([]);
  requestAnimationFrame(() => canvasRef.current?.focus()); // defer past AnimatePresence exit
}}
```

The `requestAnimationFrame` defer ensures the canvas receives focus after the panel's exit animation completes (if any). Also apply in the `handleKeyDown` Escape branch — though focus already stays on the canvas in that path since the keydown originated there.

---

## Info (IN) — nice-to-fix, low risk

### IN-01: Arabic plural forms incomplete for `priorVersions`

**File:** `src/i18n/locales/ar.json`, `brain.graph.detail`

**Issue:** Arabic (CLDR) has six plural categories. The current AR translation provides only `priorVersions_one` and `priorVersions_other`. For counts 2, 3–10, and 11–99, i18next falls back to `_other` ("{{count}} نسخ سابقة"), which is grammatically incorrect in Arabic. The `history.length > 0` guard means count=0 never renders the label, but counts of 2–10 are common for actively edited memories.

**Fix:**

```json
"priorVersions_one": "{{count}} نسخة سابقة",
"priorVersions_two": "نسختان سابقتان",
"priorVersions_few": "{{count}} نسخ سابقة",
"priorVersions_many": "{{count}} نسخة سابقة",
"priorVersions_other": "{{count}} نسخ سابقة"
```

---

### IN-02: `detailNode` useMemo uses mutable ref length as dependency

**File:** `src/app/components/brain/BrainGraphView.tsx` lines 298–302

**Issue:** `[detailNodeId, simNodesRef.current.length]` in the useMemo dep array reads a mutable ref at dep-evaluation time. If a graph refresh returns the same number of nodes but with different node data (e.g., `importance_score` now present), the memo returns the stale `.ref`. This works around the exhaustive-deps rule with `eslint-disable` comments rather than solving the underlying problem.

**Fix:** Introduce a `simVersion` counter (plain state) incremented each time `simNodesRef` is rebuilt in the data effect. Use it as the dep:

```ts
const [simVersion, setSimVersion] = useState(0);
// Inside useEffect([data]), after setting simNodesRef.current:
setSimVersion(v => v + 1);

const detailNode = useMemo(
  () => simNodesRef.current.find(n => n.id === detailNodeId)?.ref ?? null,
  [detailNodeId, simVersion], // no eslint-disable needed
);
```

The `connectedIds` useMemo (IN-06) can use the same `simVersion` dep to fix stale neighbor sets after topology changes.

---

### IN-03: z-order sort allocates a new array on every draw call

**File:** `src/app/components/brain/BrainGraphView.tsx` lines 582–583

**Issue:** `const sorted = [...nodes].sort(...)` runs inside `draw()` on every frame. At 60fps this is 60 array copies per second. The sort result is stable (kind never changes per node during a session).

**Fix:** Compute once when `simNodesRef` is rebuilt and store in a separate ref:

```ts
const sortedNodesRef = useRef<SimNode[]>([]);
// Inside useEffect([data]), after building nodes:
const order: Record<string, number> = { conversation: 0, daily: 1, core: 2 };
sortedNodesRef.current = [...nodes].sort(
  (a, b) => (order[a.ref.kind] ?? 0) - (order[b.ref.kind] ?? 0)
);
```

Then replace `sorted.forEach` in `draw()` with `sortedNodesRef.current.forEach`.

---

### IN-04: `localStorage` position data type-asserted without runtime validation

**File:** `src/app/components/brain/BrainGraphView.tsx` lines 338–344

**Issue:** `JSON.parse(raw) as Array<{ id: string; x: number; y: number }>` assumes the stored shape is valid. If stale data from a previous version contains `NaN` or `Infinity` values, those propagate to node positions. The null checks in `draw()` (`if (a.x == null)`) do not catch `NaN`, so affected nodes render invisible but remain hit-testable with undefined behavior.

**Fix:**

```ts
return new Map(
  arr
    .filter(p =>
      typeof p.id === "string" &&
      Number.isFinite(p.x) &&
      Number.isFinite(p.y)
    )
    .map(p => [p.id, { x: p.x, y: p.y }])
);
```

---

### IN-05: `connectedIds` useMemo reads stale topology after graph refresh when `focusId` unchanged

**File:** `src/app/components/brain/BrainGraphView.tsx` lines 308–318

**Issue:** `connectedIds` depends only on `[focusId]`. A graph re-fetch that adds or removes edges for the focused node doesn't change `focusId`, so the spotlight shows stale neighbors until the user closes and re-opens the panel. Stale window is at most `staleTime` (30 s). Previously documented as IN-V6-02.

**Fix:** Add `simVersion` (from IN-02) to deps: `[focusId, simVersion]`.

---

## Previously documented (carried forward)

| ID | Description | V1.6 Status |
|----|-------------|-------------|
| IN-V6-01 | `draw()` stale closure from RAF loop | **Promoted to WR-02** — flicker is reproducible in rapid keyboard nav. |
| IN-V6-02 | `connectedIds` useMemo reads stale links | **Remains IN-05** — impact bounded to 30 s; fix via `simVersion` dep. |
| IN-V6-03 | Timeline slider `maxSecs` drift after extended open | **Remains IN** — "Now" button fully mitigates it. |
| IN-V6-04 | `searchQuery` persists across tab switches | **Remains IN** — intentional, consistent UX. |
| IN-V6-05 | `localStorage` key namespace | **Clean** — userId-scoped, no collision risk. |

---

## Acceptance checklist

### Blocking (fix before merge)
- [x] **WR-01** ✅ Fixed — `(link.source as SimNode).ref` direct cast, commit `dc73940`
- [x] **WR-03** ✅ Fixed — `<li aria-label=... />` self-closing, commit `dc73940`
- [x] **WR-04** ✅ Fixed — `requestAnimationFrame(() => canvasRef.current?.focus())`, commit `dc73940`

### Should fix soon (V1.7)
- [x] **WR-02** ✅ Fixed — `selectedIdsRef`, `searchQueryRef`, `focusIdRef`, `connectedIdsRef` added, commit `dc73940`
- [x] **IN-01** ✅ Fixed — Arabic `_two`, `_few`, `_many` plural forms added, commit `dc73940`
- [x] **IN-02** ✅ Fixed — `simVersion` state counter, commit `dc73940`
- [x] **IN-05** ✅ Fixed — `simVersion` added to `connectedIds` deps, commit `dc73940`

### Nice-to-have
- [x] **IN-03** ✅ Fixed — `sortedNodesRef` hoisted, commit `dc73940`
- [x] **IN-04** ✅ Fixed — `Number.isFinite` guard on localStorage parse, commit `dc73940`

### Confirmed clean
- [x] Coordinate math consistent across `draw()`, `hitTest()`, `tooltipPos()` — verified algebraically
- [x] RAF cleanup on `data` effect re-run and unmount — no dangling loops
- [x] `IntersectionObserver` re-creation on `hasNextPage` change — no missed intersections
- [x] `useBrainGraph` called in both `BrainPage` and `BrainGraphView` — TanStack Query deduplicates to a single network request
- [x] `useBrainTimeline` queryKey with `{to: undefined}` — serializes same as `{}` (JSON.stringify drops undefined), distinct from `{to: 1234}` when slider moves
- [x] Compose modal submit guard (`!compose.isPending`) prevents double-submit
- [x] `closeTimerRef` cleared on modal close and unmount — no timer leaks
- [x] `BrainComposeModal` title auto-suggest effect — `!title` guard prevents re-trigger loop; `split(/[\.\!\?]/)[0]` always returns at least one element (the `?? ""` is dead code, not a bug)
- [x] Canvas `fillText()` — no XSS risk (bitmap rendering)
- [x] `fetchBrainMemory` URL-encodes the key via `encodeURIComponent` — no path traversal
- [x] Keyboard nav bounds after data refresh — `if (n)` guard handles stale `kbIdxRef` index; modulo wraps on next keypress
- [x] `role="application"` on canvas — correct ARIA usage for custom keyboard widget per ARIA spec
- [x] All i18n keys used by brain components present in both `en.json` and `ar.json` (pluralization keys use i18next `_one`/`_other` suffix pattern, not bare key — confirmed correct)
- [x] `ResizeObserver` on canvas — no feedback loop (physical device pixels vs CSS dimensions)
- [x] All hooks called unconditionally before early returns — correct React hook order maintained
- [x] `common.dismiss` key exists in both locales — `BrainSemanticDegradedBanner` clean
- [x] Compose modal `absolute` positioning anchors to `relative` `brain-graph-slot` div in `BrainPage` — correct stacking context

---

_Reviewed: 2026-05-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
