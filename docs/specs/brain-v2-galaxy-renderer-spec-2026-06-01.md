# Brain V2 — "Galaxy" Renderer Spec & Production Plan

**Date:** 2026-06-01
**Branch:** `brain-activation`
**Owner:** Brain page (differentiator surface)
**Status:** Proposed — pending go-ahead to execute
**Goal:** Make the Brain page a world-competition-winning, S-tier surface that is *clear for the user and adds real value* — not a pretty hairball.

---

## 0. Thesis — where we actually win

Renderer is table stakes. The differentiator is **meaningful layout + focus + time**, powered by backend signals most competitors don't have:

- **Semantic-weighted edges** (`semantic` edges with `weight`, `typed` edges with LLM `confidence`) → forces organize by *meaning*, not just connectivity.
- **LLM-named communities** (LPA clusters) → color + spatial clustering = instant legibility.
- **Focus + context** via `/brain/local-graph?center_key&depth` → Obsidian-style seed-and-expand.
- **Time as a dimension** via `/brain/diff` births/deaths + the stratigraphy scrubber → the graph *moves through time*. Almost nobody does this well.

The aesthetic target (V2 Brain v2 mockup) and the cutting edge (Obsidian's experimental "Galaxy" 3D renderer) **converge**: instanced WebGL nodes, additive bloom hot-cores, FBM nebula background, Bézier filament edges, `d3-force(-3d)` layout, seed+expand focus.

---

## 1. Decisions (locked)

### 1.1 Rendering engine — **Three.js + WebGL (custom "Galaxy" renderer).** Replace cytoscape.

| Option | Verdict |
|---|---|
| Retheme cytoscape (SVG) | ❌ SVG ceiling ~1–2k elements; cannot do bloom/nebula/instancing. Caps the differentiator. |
| Sigma.js (WebGL 2D) | ❌ 2D-only, less control over the galaxy aesthetic + custom passes. |
| **Three.js + `d3-force-3d`** | ✅ **Chosen.** Full control: instanced meshes, `UnrealBloomPass`, FBM shader, Bézier filaments, V2 tokens. Spatial (2.5D + optional true-3D) and Tactical views from one engine. |
| WebGPU (GraphGPU/GraphWaGu) | ⏳ Frontier, overkill for our scale (hundreds–low-thousands/user), immature fallbacks. Keep as future swap-in behind the same renderer interface. |

**Layout:** `d3-force-3d` (constrained to a plane for Spatial-2.5D; full 3D when toggled). Forces: charge (repulsion), link (spring strength = edge `weight`/`confidence`), community-centroid attraction, gentle centering. Layout runs in the animation loop and settles live.

### 1.2 Views — **two, from one renderer**

- **Spatial (default, the "wow"):** depth-cued 2.5D field. Instanced node points sized by `importance`, additive bloom so dense clusters self-brighten, FBM amber nebula background, ember focus node with pulsing halos, curved filament threads drawn from focus outward. **Optional true-3D toggle** (orbit controls) for the immersive view.
- **Tactical (the "clarity"):** crisp flat schematic — solid/dashed/dotted typed edges, visible labels, community swatches. The analytical, legible counterpart. This is the colorblind/legibility/screenshot-friendly mode.

### 1.3 App-shell fit — **live inside existing shell**

Reuse `ProductRail` + `Sidebar` + `AppTopbar` from `App.tsx`. The Brain page renders inside `<Outlet/>` and supplies only: **filters rail (220px) · canvas · detail panel (380px)** plus its own in-canvas overlays (insights strip, display panel, legend, controls). Do **not** rebuild the global 40px product rail or topbar from the standalone mockup.

### 1.4 Data fidelity — **real data only, graceful degrade. No fabricated metrics.**

- **Scope:** render as a *separation* indicator (Personal brain = active; Workspace/Learner/Hire = separate, governance link to Settings). Do **not** build a multi-scope blend filter — it contradicts a tested product decision.
- Map every mockup panel to a real backend field (see §5). Anything with no backing field is **omitted**, not faked.
- Surface `trimmed`/`total_skipped`/`semantic_degraded` honestly (banner + counter).

### 1.5 Uncap the backend? — **Yes, raise the render ceiling; No, don't remove all limits.** (see §6)

---

## 2. Architecture

```
src/app/components/brain/
  BrainPage.tsx                # orchestrator: shell region, state (URL-synced), view switch
  galaxy/
    GalaxyRenderer.tsx         # React wrapper around the Three.js scene (imperative handle)
    engine/
      scene.ts                 # Three.js scene/camera/renderer/composer setup
      nodes.ts                 # InstancedMesh node field; size=importance, color=community/kind
      edges.ts                 # quadratic-Bézier filament lines (LineSegments2 / custom geom)
      bloom.ts                 # UnrealBloomPass + additive blending config
      nebula.ts                # full-sphere FBM GLSL background shader
      forces.ts                # d3-force-3d sim: charge/link(weight)/community/center
      focus.ts                 # ember focus + seed-and-expand (depth-of-field hops)
      picking.ts               # GPU/raycast hover + select, hover-label
      lod.ts                   # level-of-detail + quality tiers (perf + reduced-motion)
      tactical.ts              # flat schematic styling pass
      interface.ts             # GraphRenderer interface (future WebGPU swap-in)
  panels/
    BrainFiltersRail.tsx       # scope (separation) / clusters / time-stratigraphy scrubber / footer stats
    BrainDisplayPanel.tsx      # in-canvas Obsidian-style: View seg (Spatial/Tactical), Labels/Threads/Blooms/Motion toggles, depth sliders
    BrainInsightsStrip.tsx     # in-canvas top-left: +N this week, corrected, new edges, forgotten (real)
    BrainLegend.tsx            # in-canvas bottom-left: swatches per view
    BrainCanvasControls.tsx    # in-canvas bottom-right: zoom/fit/relayout
    BrainDetailPanel.tsx       # right 380px: title/meta, content, supersede chain, sources, edges, activity, footer actions
  BrainSearchOverlay.tsx       # ⌘/-triggered fuzzy search over /brain/search
  BrainEmptyState.tsx          # (reuse) cold corpus
  BrainSemanticDegradedBanner.tsx # (reuse) honesty banner
  brainColors.ts               # (reuse/extend) community/kind/edge palettes → V2 tokens
```

**Data flow:** existing query hooks are reused unchanged (`useBrainGraph`, `useBrainMe`, `useBrainTimeline`, `useBrainLocalGraph`, `useBrainCommunities`, `useBrainOrphans`, `useBrainDiff`, `useBrainMemory`, `useBrainCompose`). The renderer is a pure function of `{nodes, edges, communities, focus, filters}`; React owns data + state, the engine owns pixels.

**New deps:** `three`, `d3-force-3d`, `three/examples/jsm` post-processing (bundled with three), `three-forcegraph` optional. (`postprocessing` lib optional for nicer bloom.) Estimated added bundle ~150–200KB gzipped, lazy-loaded on the `/brain` route only (code-split).

---

## 3. Rendering spec — Spatial ("Galaxy")

- **Nodes:** single `InstancedMesh` (one draw call, vault-size independent). Radius ∝ `importance` percentile (5–18px equiv). Color by active preset (community / kind / link_type / mono) using V2 tokens (`--g-bg*` ramp + community palette). Stale (`valid_to` set) → `--g-bg-wisp`. Self/`me` node → ring marker.
- **Bloom:** additive blending so dense clusters bloom into hot white cores; `UnrealBloomPass` for soft halos. Quality-tiered (off on low-end / reduced-motion).
- **Nebula:** full-sphere FBM GLSL shader, amber/ember tint from `--v2-accent`, blend `screen` (dark) / `multiply` (light). Driven by `--g-*` stage tokens; disabled with `no-graph-motion`.
- **Edges:** quadratic-Bézier filaments with perpendicular bow. Style by type: `session` gray, `semantic` dashed (opacity ∝ weight), `reference` brown, `typed` accent w/ confidence. Drawn from focus outward on select (thread-draw animation).
- **Ember focus:** focused node → `--v2-accent` with 3-layer pulsing halos + subtle drift. Neighbors (seed+expand, 1–5 hops via `/brain/local-graph`) stay bright; everything else dims.
- **Motion:** idle "breathe" (≤0.6% scale, ≤0.2° rotate, 14s). All motion honors `prefers-reduced-motion` and the Motion toggle.

## 3b. Rendering spec — Tactical (clarity)

Flat orthographic projection of the same layout; visible labels (DM Mono, decluttered by importance + zoom), solid/dashed/dotted typed edges, community swatches, no bloom/nebula. This is the legible, accessible, screenshot mode and the colorblind-safe fallback (shape/dash encodes edge type, not just color).

---

## 4. Interaction model

| Action | Behavior |
|---|---|
| Hover node | Hover-label (name + scope/kind), neighbors stay lit, rest dim |
| Click node | Select → ember focus → load `/brain/memory/:key` into detail panel |
| Shift-click | Multi-select → "Compose from N" → `BrainComposeModal` → `POST /brain/compose` |
| Double-click / "focus" | Enter local-graph (`center_key`), depth slider 1–5 hops |
| `/` or ⌘K | Search overlay over `/brain/search` |
| Time scrubber | `/brain/diff?date` → births glow green, deaths fade; presets 1d/7d/30d/90d/all |
| Cluster click | Filter/highlight community members; recompute via `POST /communities/recompute` |
| Display panel | Toggle Spatial/Tactical, Labels/Threads/Blooms/Motion, depth-of-field |
| Canvas controls | Zoom in/out, fit, relayout |
| Esc | Collapse panel / exit local-graph |

All view/focus/search/cluster/depth state is **URL-synced** (shareable links, back-button), matching the current page's model.

---

## 5. Detail panel — real-data mapping (no fabrication)

| Mockup block | Backend source (`BrainMemoryDetail`) | If missing |
|---|---|---|
| Title / summary | `summary` | always present |
| Meta: score | `importance_score` / `confidence_score` | hide field |
| Meta: age | `created_at` | always |
| Content excerpt | `content` | "no expanded content" |
| **Supersede chain** | `valid_history[]` (`content`, `valid_from`, `valid_to`) | hide block |
| **Sources** | `source.snippet` / `source.timestamp` (+ documents) | hide block |
| **Connected edges** | `linked_memories[]` (`link_type`, `summary`) | "no connections" |
| **Activity** | `events[]` (event_type, created_at) → derived counts | hide block |
| Pin / Edit / Supersede / Forget | actions (compose/forget endpoints where available) | disable unsupported |

"Cited 12×" style metrics are derived from `events`/`linked_memories` length **only if present** — never hardcoded.

---

## 6. Backend: uncap + hardening plan

**The nuance:** "uncap" for UX, "cap" for abuse — complementary.

### 6.1 Raise the render ceiling (UX) — so the graph shows the *whole* personal brain
- **Frontend:** raise `BrainFilters` max-nodes default from 1000 → render-all (omit `max_nodes`, let upstream + buffer govern) with a high safety cap (e.g. 8000) and LOD. WebGL handles this trivially.
- **Buffer headroom:** a ~5k-node / ~12k-edge graph ≈ 1–2MB JSON, within the 5MB `NULLCLAW_JSON_PROXY_MAX_BYTES`. For power users, allow a higher buffer **on the brain graph route specifically** (e.g. 16MB) rather than globally. Keep streaming-size guard.
- **Honesty:** keep surfacing `trimmed` / `total_skipped` / `total_nodes_in_corpus` ("showing N of M, M−N trimmed").

### 6.2 Harden (abuse / production) — concrete, file-referenced
1. **Param bounds** ([index.js:15311-15344](backend/src/index.js)): clamp `max_nodes` ≤ 8000, `depth` ≤ 6, `limit` ≤ 1000, validate `semantic_min_weight` ∈ [0,1], `date` format, `window_days` ≤ 365. Reject/clamp before proxying.
2. **Wire the existing quota** — `brain_memory` policy exists at [platform-policy.js:165](backend/src/platform-policy.js) but is unwired. Add a `requireBrainQuotaForIngress` mirroring `requireDesignQuotaForIngress` ([index.js:12601](backend/src/index.js), mounted [index.js:15455](backend/src/index.js)) on `/api/agent/brain`.
3. **Dev-bypass guard** — refuse to honor `NULLCLAW_DEV_USER_ID` when `NODE_ENV==='production'` (hard fail at startup).
4. **Key/cursor validation** — bound length + charset on `:key` ([index.js:15419](backend/src/index.js)) and pagination cursors.
5. **Metrics** — log graph response size (nodes/edges/bytes), `semantic_degraded` frequency, upstream error rate. Feeds capacity planning + alerting.
6. **Tests** — integration tests for param clamping, quota, dev-bypass refusal, degraded passthrough (current coverage is contract-presence only).

**Verdict:** Yes, uncap the *render default* + add buffer headroom so users see their whole brain; simultaneously add a hard safety cap + wire the quota so it can't be weaponized. This is one cohesive production-ready change set.

---

## 7. Performance & LOD

- Instanced rendering → one draw call for all nodes.
- Quality tiers (auto by FPS + device): `high` (bloom+nebula+threads), `balanced` (no nebula), `lite` (Tactical, no post-fx). `prefers-reduced-motion` → `lite` + static layout.
- Layout: cap force iterations; freeze on settle; web-worker the sim if main-thread stalls >16ms at high node counts.
- Lazy-load the whole galaxy bundle on `/brain` only (route code-split).

---

## 8. Accessibility & brand

- **A11y:** Tactical view is the accessible path — visible labels, keyboard node-cycling, ARIA live region announcing selection, focus-visible rings, shape/dash edge encoding (not color-only). Search + detail panel fully keyboard-navigable. Honor reduced-motion globally.
- **BRAND_LAW:** DM Mono chrome, Plus Jakarta prose, single molten accent `#D24430`, hairlines (no shadows), radius 0/2/4, tabular numerics, uppercase 0.16em labels, dual-stage dark/light via `[data-v2-stage]`. **No hardcoded hex** — all via `--v2-*` / `--g-*` tokens. No purple/teal as brand (current cytoscape uses purple typed-edges → migrate to accent ramp).

---

## 9. Testing

- Unit: data adapters (graph→render model), force config, color mapping, detail-field mapping (degrade paths).
- Component: filters rail (scope-separation tests preserved), display panel toggles, detail panel degrade, search overlay.
- Engine: deterministic layout seed for snapshot of node positions; renderer smoke (mount/unmount/no leak).
- Visual: preview-tool screenshots (Spatial high / Tactical / light stage / empty / degraded / reduced-motion).
- Fixtures: rich + sparse + cold-corpus + trimmed datasets (live Nullalis may be unavailable in CI).

---

## 10. Phased build plan

1. **P0 — Scaffolding:** route stays in-shell; new `galaxy/` skeleton; `GraphRenderer` interface; lazy bundle; keep current page behind a flag until parity.
2. **P1 — Spatial core:** scene + instanced nodes + d3-force-3d + semantic-weighted forces + community color. Render real graph.
3. **P2 — Galaxy fx:** bloom, FBM nebula, Bézier filaments, ember focus, idle breathe + quality tiers.
4. **P3 — Focus & time:** seed-and-expand (local-graph), depth slider, time scrubber/diff, search overlay.
5. **P4 — Tactical view + display panel:** view toggle, schematic styling, toggles, legend, canvas controls.
6. **P5 — Detail panel:** real-data mapping, supersede chain, sources, edges, activity, actions.
7. **P6 — Filters rail + insights:** scope-separation, clusters, footer stats, insights strip.
8. **P7 — Backend uncap + hardening** (§6): param bounds, quota wiring, dev-guard, buffer, metrics, tests.
9. **P8 — A11y, reduced-motion, light stage, mobile, perf pass.**
10. **P9 — Cutover:** remove cytoscape, flip flag, full verification (preview screenshots + tests).

---

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Sparse/cold corpus looks empty | Strong empty + seed states; insights derived only when data exists |
| Live Nullalis unavailable for visual tuning | Build/verify against fixtures + dev-user; graceful degrade |
| Bloom/nebula cost on low-end/mobile | Quality tiers + reduced-motion → Tactical/lite |
| 3D depth ambiguity hurting clarity | Spatial defaults to 2.5D; true-3D is opt-in; Tactical always available |
| Bundle size | Route-level code-split; lazy-load engine |
| Scope-separation regression | Preserve existing passing tests; no multi-scope blend |

---

## 12. Confidence

**High** on design, the Three.js renderer, the data mapping, and the backend uncap+hardening — I have the emission shapes, the current code, the canonical mockup, the token system, and the SOTA techniques. **Medium (managed)** only on live-data visual fine-tuning, which depends on Nullalis connectivity / corpus richness — mitigated via fixtures + graceful degrade + preview verification. Net: **confident to execute end-to-end.**

---

## 13. Pre-build verification — what the codebase sweep found (2026-06-01)

### 13.1 Infra already in prod (ZERO porting) ✅
- **V2 token system is fully in prod** — [src/styles/v2.css:5-131](../../src/styles/v2.css) defines all `--v2-*` tokens (accent `#d24430`, ink-1..5, bg, hairline, spacing, radius 0/2/4, motion). Plus a legacy bridge mapping `--zaki-*` → `--v2-*`.
- **Dark/light staging is wired** — `data-v2-stage` is applied in [App.tsx](../../src/app/App.tsx) from `useUIStore.resolvedTheme()`, plus `.dark` on `<html>`. Brain inherits theme automatically. (Use the page container, not `body`, for `data-view`/`dp-collapsed` to avoid global leakage.)
- **V2 component library exists** — 13+ components in `src/app/components/v2/` incl. **V2Button, V2SegmentedControl, V2Panel, V2Meter, V2Badge, V2StatusStrip, V2Tabs**. The display-panel toggles/segmented/sliders map directly to these.
- **Fonts loaded** — DM Mono + Plus Jakarta Sans in [src/styles/fonts.css](../../src/styles/fonts.css).

### 13.2 What I DO need to add
- **`--g-*` graph ramp is NOT in prod** (confirmed absent). Add ~30 lines deriving `--g-bg`/`--g-edge`/`--g-overlay`/`--g-grid`/`--g-bloom*` (dark+light) from existing `--v2-ink`/`--v2-bg`/`--v2-accent`. Cheap, isolated.
- **Deps:** add `three` + `d3-force-3d` (+ `@types/three`). `cytoscape`, `cytoscape-fcose`, `d3-force`, `@types/d3-force` already present (remove cytoscape at cutover).
- **Lazy route:** no `React.lazy` anywhere today (all eager). Introduce `lazy()`+`Suspense` for `/brain` so the Three.js chunk loads only there. New pattern for the repo.
- **Replace** the 80-line `.zaki-brain-v2` block in v2.css.

### 13.3 Tooling
- Vite 6 / React 18.3 / TS 5.9 / **npm**. Tests = **Jest 30 + jsdom + ts-jest** (not vitest). No WebGL/canvas in jsdom → **mock the renderer in tests** exactly as `BrainGraphView` is mocked today (`jest.mock("./galaxy/GalaxyRenderer", …)`). Verify with `npm run test -- --runInBand`, `npm run typecheck`, `npm run build`.

### 13.4 Logic to PORT (don't reinvent) — from current impl
- **Edge relevance** (`edgeRelevance`): session→0.5; semantic→`(w-0.7)/0.3`; typed→`conf·tanh(w/3)`; reference→0.5. Feed as d3-force-3d link strength.
- **Ideal edge length:** `max(20, base·(1.5−relevance))`.
- **Importance:** `radius = 5 + 13·percentile`; opacity `0.45 + 0.55·imp`; percentile-rank helper; degree-centrality fallback; local-graph hop decay `1 − 0.25·hop`, center ×1.6.
- **Filters:** `fetchOptsFromFilters` (search is client-side highlight, not a server filter — preserve). Query hooks + queryKeys + staleTimes reused unchanged.
- **⚠️ `DEFAULT_FILTERS.maxNodes = 50` today** — this is the real cap users hit. Uncap per §6 (raise default; LOD handles the rest).

### 13.5 Hard contracts I must NOT break
- **e2e gate** [e2e/v2-production-ui.spec.ts:87-96](../../e2e/v2-production-ui.spec.ts): `/brain` must land **graph-first** with visible `data-testid`s **`brain-graph-slot`, `brain-graph-canvas-wrap`, `brain-search-input`, `brain-filter-panel`**, and **`brain-timeline-slot` count 0** by default. New V2 elements must carry these same testids.
- **Scope-separation tests** ([BrainFilterPanel.test.tsx](../../src/app/components/brain/BrainFilterPanel.test.tsx)): Personal = this surface; Workspace/Learner/Hire kept separate; governance → Settings. No multi-scope blend.

### 13.6 BRAND_LAW palette tension (decision)
Current `brainColors.ts` uses purple/pink/teal for kind/link/edge encodings (`#a78bfa`, `#ec4899`, `#c084fc`, teal `#219171`) — which **BRAND_LAW forbids as brand color**. Decision: migrate categorical encodings to a **token-derived restrained palette** (ink ramp + accent + success/warn for semantic states; communities may use a muted categorical ramp as *data* encoding, not chrome). This is part of the S-tier polish, not optional.

### 13.7 Known caveat (unchanged)
Dev proxy to Nullalis was removed (all traffic via BFF) — live graph data needs the backend running + Nullalis upstream. Visual build/verify proceeds on **fixtures + graceful degrade + preview screenshots**; live-data tuning is the one managed-risk item.

**Net: full context confirmed. Ready to execute.**
