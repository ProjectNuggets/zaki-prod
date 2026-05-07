# Brain Graph — why it doesn't tell a story

**Authored:** 2026-05-07 by the FE/UI agent during Phase 1 audit
**Question Nova asked:** *"why are nodes at equal distance, and equal size and how to make them really tell a story, the graph now show nodes that are all connected to each other"*

This doc answers each part with the actual data + code, then proposes fixes ordered by leverage.

## Live data snapshot (test user, default view)

```
nodeCount:       40
edgeCount:       789
edgesPerNode:    39.5  (≈ fully-connected mesh)

importance:
  range:         0.652 – 0.912
  median:        0.808
  buckets:
    0.5–0.7:     7 nodes  (17.5%)
    0.7–0.9:     27 nodes (67.5%)
    0.9–1.0:     6 nodes  (15%)

edge types:
  semantic:      780  (98.9%)
  session:       9    (1.1%)

edge weights:
  range:         0.72 – 1.00
  median:        0.80

per-node degree:
  min:           39
  median:        39
  max:           41    (every node connects to ~every other node)

node kinds:
  daily:         27
  core:          13
```

These are real numbers from a logged-in session against the test corpus. The diagnosis below uses them.

---

## 1. Why nodes look equal size

Code: `brainColors.ts::importanceToRadius(importance)` maps importance∈[0,1] linearly to **4–14px** radius.

Data: importance values are crammed in **[0.652, 0.912]** (range 0.26).

Math: with importance∈[0.652, 0.912] and the function `4 + 10*i`, every node gets a radius in `[10.5px, 13.1px]`. **The visual range is 2.6 pixels** — the difference between a 10px circle and a 13px circle is almost imperceptible at the canvas zoom level.

```
importance 0.65  →  radius 10.5px
importance 0.81  →  radius 12.1px   (median node)
importance 0.91  →  radius 13.1px
```

**Root cause.** Two layered:

- **(a) Importance scoring has poor variance.** The corpus's importance values cluster tightly in 0.65–0.91. Why? Likely the agent assigns importance generously (most things matter "a lot" because the user said them on purpose). The 4-point spread compresses into a ~2.6px visual spread.
- **(b) Linear mapping over a narrow data range.** Even with a good range, linear remap from the data domain to the visual range wastes the visual budget on values that don't occur. If real importance only spans 0.65–0.91, the radius range allocated to importance < 0.65 is dead pixels.

**Fixes (ordered by leverage):**

1. **Percentile remap, not linear value remap.** Sort nodes by importance, give bottom decile 4px, top decile 14px, linear in between. Always uses the full visual range regardless of underlying distribution. One-line change in `importanceToRadius` — pass the corpus distribution.
2. **Use a non-linear curve.** Apply `Math.pow(i, 1.5)` or a logistic to amplify small differences at the high end where most nodes live.
3. **Widen the radius range.** 4–14 is Obsidian-calibrated for "tiny dots." V1.11 hotfix-c picked it after Nova rejected 6–36 as too-blob-like. Consider 5–22 (4.4× ratio) — more headroom for hubs without making leaves too small.
4. **Get the backend to widen importance range.** Most leverage-per-effort but cross-team. Ask the agent's importance scoring to push outliers further apart. Probably not worth it unless we control the scoring algorithm.

Recommendation: **percentile remap + slight widen to 5–18px**. Pure frontend, deterministic, makes hubs visibly hubs.

---

## 2. Why nodes look equally distant

Code: `BrainGraphView.tsx::runLayout` configures cose-bilkent with a per-edge `idealEdgeLength` function:

```js
idealEdgeLength: (edge) => {
  const r = edge.data("relevance");
  const rel = typeof r === "number" && Number.isFinite(r) ? Math.max(0, Math.min(1, r)) : 0.5;
  return Math.max(20, f.idealEdgeLength * (1.5 - rel));
},
```

Wrapped in try/catch with a constant fallback.

**Bug 1 — silent regression.** The function-based path *always* throws `RangeError: Invalid array length` deep inside cose-bilkent's `FDLayout.calcGrid`. The catch hits every layout run; **the layout always falls back to the constant edge length**. I logged ~24 entries per page load. Pillar-1 differentiator silently disabled.

**Bug 2 — even if it worked, edge weights are too uniform.** Median 0.80, range 0.72–1.00. The function output range is `base * (1.5 - 1.0)` to `base * (1.5 - 0.72)` = `0.5×base` to `0.78×base` — **only 28% spread**. Every distance is ~75% of base. Equal looking.

**Bug 3 — `relevance` field doesn't exist in the data.** The edge schema has `weight` (per the BFF), not `relevance`. The function reads `edge.data("relevance")` which returns `undefined`, falls into the `0.5` default branch, returns `base * 1.0` for every edge. Even before cose-bilkent throws, **every edge gets the same length input**.

Three bugs stacked. Any one of them produces equal distances; together they guarantee it.

**Fixes:**

1. **Fix bug 3 first.** Read `edge.data("weight")` not `"relevance"`. Or normalize the field name when building elements (`buildElementsFromGlobal` should set `relevance` from `weight`).
2. **Diagnose bug 1.** The cose-bilkent crash is likely because the function returns dramatic length variance (0.5×base to 1.5×base) that overflows internal grid pre-allocation. Test by clamping the returned length to a tighter band.
3. **For bug 2,** apply the same percentile remap as importance: stretch the data's actual range (0.72–1.00) across the full layout-multiplier range. Edges in the bottom quartile of weight → 1.5× base (loose). Top quartile → 0.5× base (tight).
4. **Per-edge-type baselines** are already coded in `idealEdgeLengthForType`. **And not used.** The function is exported but never called. The actual layout function reads only `weight`. Wire `idealEdgeLengthForType` × percentile-remap-by-type for two stacked anchors.

Recommendation: **fix bug 3 (weight not relevance) → diagnose bug 1 → wire `idealEdgeLengthForType` and apply percentile remap within type**. Three small commits. Each verifiable.

---

## 3. Why every node connects to every other

This is the deepest problem.

Data:
- 789 edges across 40 nodes = **39.5 edges per node** average
- 780 of 789 edges are type `"semantic"` (98.9%)
- Median per-node degree is 39 — basically a clique

The agent generates **vector-similarity edges** between every pair of memories above some threshold. With a small test corpus that's all from one session, *every memory is semantically similar to every other memory*. The "semantic" edges aren't noise — they're working as designed. But they overwhelm the typed edges (preference, attribute, supersession, relationship, etc.) that are the *meaningful* connections.

Looking at the data: only 9 typed edges (all "session"). Zero `preference`, zero `attribute`, zero `relationship`, zero `supersession`. Either the typed-edge generation is rare (only fires on explicit predicates the agent extracts), or this corpus is mostly self-test memories that didn't trigger predicates.

**The graph the user sees today: 99% noise (semantic similarity), 1% signal (typed predicates).**

**Fixes:**

1. **Default-hide semantic edges.** Filter at render time. Show only typed edges + session edges by default. Add a toggle in `BrainFilterPanel` ("Show semantic similarity") that adds them back, opt-in. **This single change transforms the graph from spaghetti to a meaningful sparse network.**
2. **Top-K semantic per node.** If you want some semantic edges visible by default, only render the top 3 most-similar per node. Cuts edge count from 780 to ~120, but each is the strongest link.
3. **Edge-weight threshold slider.** The Filters panel has Mono/Community/Link/Kind color toggles + node-size + link-thickness — but no edge-weight cutoff. Add a threshold slider; default at the 75th percentile of weights.
4. **Backend: tighten the similarity threshold.** ~0.72 cosine similarity is a low bar. 0.85+ would produce far fewer edges, all stronger. Cross-team coordination needed.

Recommendation: **(1) default-hide semantic edges + (3) edge-weight threshold slider** in one frontend commit. The bottleneck isn't backend — the data is there, the UI just shows everything. Hide noise, surface signal.

---

## 4. Why colors don't carry meaning

The default preset is `mono` — every node muted gray (#6b7280). The presets exist (community, link_type, kind) but require the user to flip a toggle they don't know exists.

The preset choices map to *graph-internal* concepts:
- `community` — Louvain-community-id (algorithmic clusters; users don't think this way)
- `link_type` — predicate type (`preference`/`attribute`/etc — technical jargon)
- `kind` — `core`/`daily`/`conversation` — closer to user mental models but the labels are still internal

Users have *life* mental models: people, places, projects, habits, preferences, facts about themselves. The `kind` field is the closest match — `core` ≈ "facts about you," `daily` ≈ "things from this week," `conversation` ≈ "from chats." But the legend doesn't translate.

**Fix:**

1. **Default preset → `kind`** (not mono). Mono is "Obsidian aesthetic" but Obsidian users have manually-organized vaults; ZAKI users haven't organized anything. Color *gives* them organization without asking.
2. **Translate kind labels to user language.** "Facts about you" / "From your week" / "From conversations." Add a legend chip strip near the canvas so the user sees what the colors mean without opening Filters.
3. **Map kind colors to the brand palette.** Today: `core: #f10202` (brand red — works), `daily: #22c55e` (off-brand green), `conversation: #6b7280` (mono gray). Should be: `core: brand red`, `daily: teal `(--zaki-success)`, `conversation: warm desert neutral`. Brand-coherent + meaningful.

---

## 5. Bonus diagnosis: edge styling is configured but invisible

The cytoscape stylesheet sets edge `line-color` from `data(edgeColor)` and width from `data(edgeWeight)`. The `EDGE_COLOR` map gives semantic edges a blue (#7b9fd4), session edges gray, etc. Should be visible.

But the canvas reads as a uniform mesh. Why?

- 780 of 789 edges are semantic → all blue → no visual differentiation
- Edge weights are uniform → all the same width → no visual differentiation
- Default opacity is 0.55 → edges blend into background

**Fix bundles with #3 above.** Once typed edges become the default visible set, color differences carry meaning (red = preference, blue = attribute, etc.). Today the styling code is correct; the data flooding it is the problem.

---

## Synthesis — what the brain page actually needs

In rough leverage order. Each is a separate atomic commit. Verifiable independently.

| # | Change | Files | Visible win |
|---|---|---|---|
| **1** | **Default-hide semantic edges + edge-weight threshold slider** | `BrainGraphView`, `BrainFilterPanel` | Graph stops being a clique. Each node shows its 0–5 *meaningful* connections. |
| **2** | **Default preset → `kind` + brand-coherent kind colors + plain-language legend chip strip** | `BrainPage`, `BrainCommunityLegend` (or new `BrainKindLegend`), `brainColors.ts` | Graph stops being grey dots. Color carries meaning at first glance. |
| **3** | **Fix the "weight" not "relevance" bug + diagnose cose-bilkent throw + percentile remap** | `BrainGraphView`, `brainColors.ts` | Edge length carries meaning. Important things sit close. |
| **4** | **Importance percentile remap → wider radius range (5–18px)** | `brainColors.ts` | Hubs visibly hubs. Leaves visibly leaves. |
| **5** | **Insights strip above canvas** ("12 new things this week," "2 corrections this month," etc.) | `BrainPage` + new `BrainInsightsStrip`, plus a backend-needs spec | Personal narrative. The Tweet asset. |
| **6** | **Search → canvas response (highlight + dim, not re-render)** | `BrainGraphView` | Search feels alive. The graph reacts to typing. |

Items 1–4 are pure frontend, can ship today. Item 5 needs a backend endpoint (`/api/agent/brain/insights` aggregating counts). Item 6 is pure frontend but bigger.

The recommended sequence: **1, 2, 4, 3, 5, 6**. After 1+2 the graph already tells a story. After 4 the visual hierarchy holds at a glance. 3 fixes a known regression. 5 is the marketing asset. 6 is the polish that ties it together.

## What I'd ship next, post this doc

**Item 1 + Item 2 in one commit.** They're complementary: hiding noise + adding semantic color produces the biggest visual transformation in a single ship. The graph stops being "abstract dots" and starts being "I see what's here."

After that: filing the insights backend-needs spec, then 3, 4, 6 in sequence.
