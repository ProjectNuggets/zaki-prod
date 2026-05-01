# Brain Graph Visual Quality — Polish Plan

## Problem
Spring simulation runs synchronously (300 iterations blocking main thread), has no center gravity or
alpha cooling, and clamps nodes to canvas walls — causing corner-clustering. No zoom/pan, hover state,
or click detail panel.

## Algorithm choice: custom async RAF spring (no new deps)
- d3-force: adds ~60 KB and requires understanding force module API; overkill for ≤300 nodes
- svg-pan-zoom / react-zoom-pan-pinch: adds a dep for what is 30 lines of pointer math
- Custom: full control, zero deps, fits existing codebase style

## Implementation plan

### WS1 — Layout convergence
- Sunflower/golden-angle initial placement (deterministic, avoids corner bias)
- Async RAF loop: 5 sub-ticks/frame, alpha cooling (1.0 → 0.005 at 0.992/tick)
- Forces: repulsion (4000, capped at 280px), spring (K=0.15, rest=90px), center gravity (0.008)
- Damping 0.78; render update every 3 frames
- Sparse fallback: when `semantic_degraded=true` OR semantic edges < nodes/4, skip physics entirely
  and place via concentric rings (core r=100, daily r=240, conversation r=400)

### WS2 — Zoom + pan
- `ViewTransform { x, y, scale }` state; inner `<g>` gets `translate(x,y) scale(s)`
- Non-passive wheel listener (attached via useEffect to avoid React passive-event warning)
- Zoom-toward-cursor math using viewBox (1000×1000 square) coordinates
- Pointer drag-pan via `setPointerCapture`; track delta from drag start (stored in ref)
- Double-click: reset to `{ x:0, y:0, scale:1 }`; node double-click stops propagation

### WS3 — Hover tooltip
- Absolute `<div>` inside `.relative` wrapper; offset computed from node sim-coords → DOM pixels
- Shown when `hoverId !== null && detailNode === null` (suppress while detail panel is open)
- Content: kind color-dot + kind label + 2-line clamped summary

### WS4 — Click detail panel
- State: `detailNode: BrainGraphNode | null`
- Click on node: open panel for that node; shift-click: multi-select for compose modal
- Auto-close panel when selectedIds.length ≥ 2 (compose modal takes over)
- Content: full summary, kind badge, formatted created_at, truncated session_id, superseded badge if valid_to

### WS5 — Visual hierarchy
- `nodeRadius`: core=14, daily=10, conversation=7 (was 12/9/7)
- Hover: CSS `transform: scale(1.25)` on circle with transition
- Semantic edge: strokeWidth scaled by `weight` (0.5–2.5px range)
- Deprecated nodes: opacity 0.45 (unchanged)

## i18n keys to add
- brain.graph.fitToView
- brain.graph.ariaLabel
- brain.graph.nodeAriaLabel (with {{summary}})
- brain.graph.sparseNotice
- brain.graph.detail.saved / .session / .close

## Accessibility
- `role="button"` + `tabIndex` + `onKeyDown` (Enter/Space) on each node `<g>`
- SVG `role="img"` + `aria-label`
- Tooltip is `aria-hidden` / `pointer-events-none`

## Commit order
1. PLAN.md (this file)
2. WS1 layout + WS2 zoom/pan + WS3 tooltip + WS4 detail + WS5 hierarchy — single atomic commit
   (all in BrainGraphView.tsx; no other files change except i18n)
3. i18n keys (en.json + ar.json)
