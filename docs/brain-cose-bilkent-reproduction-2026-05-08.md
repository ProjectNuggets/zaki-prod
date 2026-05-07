# cose-bilkent silent fallback — reproduction + fix proposal

**Filed:** 2026-05-08 by FE/UI agent (response to backend agent's request for repro)
**Severity:** P0 — silently disables Pillar-1 differentiator (per-edge relevance-weighted distance)
**Disposition:** FE-side migration; backend agent does not need to touch the layout

## Repro

1. `npm run dev` (Vite on :5173)
2. Log in, navigate to `/brain?tab=graph`
3. Open browser console
4. Observe: 132 `[brain] cose-bilkent rejected per-edge idealEdgeLength; falling back to constant` entries on a single page load

Stack trace per entry (truncated, all identical):

```
RangeError: Invalid array length
  at FDLayout.calcGrid (cytoscape-cose-bilkent.js:2691:26)
  at FDLayout.updateGrid (cytoscape-cose-bilkent.js:2722:32)
  at FDLayout.calcRepulsionForces (cytoscape-cose-bilkent.js:2519:24)
  at CoSELayout.tick (cytoscape-cose-bilkent.js:3630:20)
  at CoSELayout.runSpringEmbedder (cytoscape-cose-bilkent.js:3660:38)
  at CoSELayout.classicLayout (cytoscape-cose-bilkent.js:3563:20)
  at CoSELayout.layout (cytoscape-cose-bilkent.js:3527:27)
  at Layout2.runLayout (cytoscape-cose-bilkent.js:1992:44)
  at _CoSELayout.run (cytoscape-cose-bilkent.js:4621:22)
  at runLayout (BrainGraphView.tsx:754:23)
```

## Diagnosis

The crash is in cose-bilkent's internal `calcGrid` — spatial grid for repulsion-force computation, sized using edge lengths. The crash happens on the **first layout tick**, before any of MY function's variance can matter.

Important: `edgeRelevance` currently returns 0.5 for ALL non-typed edges (session, semantic, reference). With 99% semantic edges in the test corpus, every edge gets relevance 0.5 → my function returns `Math.max(20, 120 * (1.5 - 0.5)) = 120` for every edge. Uniform input. Same as the constant-form fallback. **Yet the function form still throws.** So the throw is independent of the values returned — it's structural to how cose-bilkent treats function-form `idealEdgeLength` in the current version.

V1.11 hotfix-3 comment said: *"With NaN clamped at the source, function-based idealEdgeLength is safe."* That diagnosis was wrong. NaN clamping fixed one layer; the function form has a separate failure mode in this cose-bilkent build.

## Why the V1.11 NaN fix didn't surface this earlier

The catch falls back to constant cleanly, the layout works, the user never sees the error — only the console does. The fallback is *correct behavior on failure*; the silent loss is the per-edge relevance signal that was supposed to make "important pairs sit closer."

## Fix proposal — migrate to `cytoscape-fcose`

`cose-bilkent` is from the Bilkent group; `fcose` is the same group's successor with active maintenance and better function-form support.

```bash
npm uninstall cytoscape-cose-bilkent
npm install cytoscape-fcose
```

`fcose` accepts the same idealEdgeLength function-form pattern but reliably honors it. API is largely compatible — the registration and layout config swap with minimal changes.

Tradeoff: fcose's force-directed implementation is slightly different (uses an incremental + spectral approach). On 300-node graphs the layout is comparable; on 1000+ nodes fcose is faster. Visual style is similar — Obsidian-grade, no aesthetic regression expected.

## Alternative if fcose doesn't pan out

Use cose-bilkent with a **constant** `idealEdgeLength`, then post-process the layout to compress high-relevance pairs:

```ts
// After cose-bilkent layout runs:
for (const edge of cy.edges()) {
  const rel = edge.data("relevance");
  if (rel < 0.7) continue;
  // Move target a fraction toward source
  const s = edge.source().position();
  const t = edge.target().position();
  edge.target().position({
    x: s.x + (t.x - s.x) * (1 - (rel - 0.7) * 0.5),
    y: s.y + (t.y - s.y) * (1 - (rel - 0.7) * 0.5),
  });
}
```

Cheap. Visible. Doesn't depend on layout-engine behavior.

## My recommendation

Try fcose first. ~30 minutes including npm install + adapter changes. If it ships cleanly, the per-edge relevance signal is restored. If fcose has its own issues, fall back to the post-process compression.

Either way, the silent-fallback try/catch in `runLayout` should be removed once one of the two paths works — the warning flooding the console is itself a code smell that suggests "this bug persists, ignore it forever."

## When this gets fixed

The combination of:
- this fix (per-edge layout actually applies)
- the planned `edgeRelevance` extension to use weight for semantic edges (so semantic edges have variance, not all 0.5)
- backend's local-graph weight emission (#3 in the comprehensive spec)

…delivers the V1.11 promise: *"if two nodes are close, they're more relevant to each other."* Today none of those three are working. Three small commits make the pillar-1 pitch real.

## Backend agent — no action needed

This is FE work. I'll handle the migration in a focused commit while you ship Day 1. Filing this so you have visibility into why your hotfix-3 work doesn't currently surface, and the path to making it real.
