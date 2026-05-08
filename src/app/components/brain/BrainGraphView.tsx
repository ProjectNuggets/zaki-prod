// BrainGraphView (V1.7) — cytoscape.js + fcose.
//
// Replaces the prior d3-force/Canvas implementation with a force-directed
// cytoscape graph that matches Obsidian's UX:
//   - fcose layout with live tunable forces (per-edge relevance-weighted)
//   - hover preview rendered from cached node payload (no round trip)
//   - color presets toggle: community / link_type / kind
//   - smooth zoom + pan on infinite canvas
//   - click → opens detail panel (with "Show local graph" button)
//   - shift-click → toggles compose selection
//
// Data sources:
//   - useBrainGraph(userId, filters) for the global view
//   - useBrainLocalGraph(userId, {center_key, depth}) for the drilldown
//   - useBrainMemory(userId, key) for the detail panel
//
// Local-graph mode is an internal state flag; clicking "Back to global" unsets it.

import cytoscape from "cytoscape";
import type { Core, NodeSingular, ElementDefinition, StylesheetCSS } from "cytoscape";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useBrainGraph, useBrainLocalGraph, useBrainMemory } from "@/queries";
import type {
  BrainGraphEdge,
  BrainGraphFetchOpts,
  BrainGraphNode,
  BrainLocalGraphResponse,
  BrainMemoryDetail,
} from "@/lib/api";
import {
  EDGE_COLOR,
  importancePercentileRanks,
  importanceToRadius,
  nodeColor,
  type ColorPreset,
} from "./brainColors";

// Audit (2026-05-08) — migrated from cytoscape-cose-bilkent to fcose.
// cose-bilkent's function-form idealEdgeLength threw RangeError in
// FDLayout.calcGrid every layout run (132 console entries per page
// load), silently disabling the per-edge relevance-weighted layout
// the V1.11 hotfix-3 was meant to deliver. fcose is the same Bilkent
// group's successor with active maintenance and reliable function-
// form support. Same force-directed feel, no aesthetic regression.
// Repro details in docs/brain-cose-bilkent-reproduction-2026-05-08.md.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — no types ship with cytoscape-fcose
import fcose from "cytoscape-fcose";

// Register the layout once. cytoscape.use is idempotent in practice but we
// guard with a module-level flag to be safe under HMR.
let _fcoseRegistered = false;
function ensureFcose() {
  if (_fcoseRegistered) return;
  try {
    cytoscape.use(fcose);
  } catch {
    // already registered (HMR re-entry)
  }
  _fcoseRegistered = true;
}
ensureFcose();

// ── Props ────────────────────────────────────────────────────

export interface BrainGraphFilters {
  excludeOrphans: boolean;
  linkTypes: string[];
  search: string;
  maxNodes: number;
  colorPreset: ColorPreset;
  semanticEdgeThreshold: number;
  nodeRepulsion: number;
  idealEdgeLength: number;
  gravity: number;
  edgeElasticity: number;
  textFadeThreshold: number;
  nodeSizeScale: number;
  linkThickness: number;
}

interface Props {
  userId: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  searchQuery?: string;
  filters: BrainGraphFilters;
  /** Keys to flash for time-scrubber animation; nodes get a glow. */
  highlightKeys?: string[];
  /** Optional cluster filter from BrainCommunityLegend. */
  selectedCommunityId?: number | null;
  /** Controlled drilldown center; null = global mode. */
  centerKey: string | null;
  onCenterKeyChange: (key: string | null) => void;
  /** Canonical "you" anchor from /brain/me — null until loaded. The
   *  matching node gets a .self class so the user can spot themselves
   *  in the overview. Auto-anchoring focus-mode here is deferred until
   *  backend connects identity to activity edges. */
  selfKey?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────

function edgeStyle(type: BrainGraphEdge["type"]) {
  switch (type) {
    case "typed":
      return { color: EDGE_COLOR.typed, line: "solid", width: 2 };
    case "semantic":
      return { color: EDGE_COLOR.semantic, line: "dashed", width: 1.4 };
    case "reference":
      return { color: EDGE_COLOR.reference, line: "dotted", width: 1.2 };
    case "session":
    default:
      return { color: EDGE_COLOR.session, line: "solid", width: 0.8 };
  }
}

// V1.11 hotfix-4 (2026-05-07) — per-edge relevance from REAL data.
//
// Earlier hotfix used an edge-type heuristic (typed=1.0, semantic=0.45,
// session=0.2). That was wrong: the database only has ONE kind of edge —
// LLM-extracted typed predicates. The "semantic / session / reference"
// taxonomy I was using doesn't exist in memory_edges. Honest fix: use
// the actual per-edge fields the DB already stores.
//
//   confidence (0..1) — extractor LLM's certainty for this triple
//   weight     (≥0)   — vote count: how many times this exact triple
//                       was re-asserted across conversations + community
//                       detection's importance multiplier
//
// relevance = clamp01(confidence × tanh(weight / 3))
//   - confidence carries veracity ("am I sure this is true")
//   - tanh(weight/3) saturates around weight=3-5 so a fact attested 10
//     times isn't 10× tighter than one attested twice — votes still
//     count but with diminishing returns
//
// runLayout maps relevance → idealEdgeLength via:
//   length = base * (1.5 - relevance)
//   relevance 1.0 → 0.5×base (tight: high-confidence, multi-attestation)
//   relevance 0.0 → 1.5×base (loose: weak / unconfirmed)
//
// Edges without confidence/weight (older session/semantic/reference
// types if any survive in cache) fall back to 0.5 — neutral pull.
function edgeRelevance(edge: BrainGraphEdge): number {
  // Audit (2026-05-08) — extended to use weight for semantic edges. The
  // prior implementation returned a constant 0.5 for everything except
  // "typed" edges. With 99% of edges being "semantic" in real corpora,
  // every non-typed edge produced uniform relevance → uniform layout
  // distance. The fcose migration restored the function-form path; this
  // extension gives it variance to actually use.
  if (edge.type === "session") {
    // Co-occurrence in a conversation has no per-pair similarity signal.
    // Neutral pull is the right default.
    return 0.5;
  }
  if (edge.type === "semantic") {
    // Cosine similarity above the storage threshold (~0.72). Remap
    // [0.7, 1.0] linearly to [0, 1] so the strongest semantic links
    // pull tightly and the weak ones (just above threshold) pull
    // loosely. Below 0.7 falls to 0 (rare, but defensive).
    const w =
      typeof edge.weight === "number" && Number.isFinite(edge.weight)
        ? Math.max(0, Math.min(1, edge.weight))
        : 0.5;
    return Math.max(0, Math.min(1, (w - 0.7) / 0.3));
  }
  if (edge.type !== "typed") {
    // reference / unknown — neutral pull as before.
    return 0.5;
  }
  // typed edges — confidence × tanh(weight/3). Vote-style; weight is
  // the count of corroborating extractions.
  const conf =
    typeof edge.confidence === "number" && Number.isFinite(edge.confidence)
      ? Math.max(0, Math.min(1, edge.confidence))
      : 1.0;
  const w =
    typeof edge.weight === "number" && Number.isFinite(edge.weight)
      ? Math.max(0, edge.weight)
      : 1.0;
  // tanh saturates: weight=1 → 0.32, weight=3 → 0.76, weight=10 → 0.99.
  const voteFactor = Math.tanh(w / 3);
  return Math.max(0, Math.min(1, conf * voteFactor));
}

function fetchOptsFromFilters(f: BrainGraphFilters): BrainGraphFetchOpts {
  // Audit (2026-05-08) — search is now a CLIENT-SIDE highlight overlay,
  // not a server-side filter. Sending search to the backend caused the
  // canvas to re-render a different node set on every keystroke (slow,
  // jarring). Now: backend returns the full default graph; the search
  // effect below applies .search-hit / .search-out cytoscape classes
  // so matching nodes pop and non-matching dim. Feels alive — the
  // graph reacts to typing instead of swapping out.
  void f.search;
  return {
    max_nodes: f.maxNodes,
    exclude_orphans: f.excludeOrphans,
    link_types: f.linkTypes.length > 0 ? f.linkTypes.join(",") : undefined,
  };
}

function buildElementsFromGlobal(
  nodes: BrainGraphNode[],
  edges: BrainGraphEdge[],
  preset: ColorPreset,
  sizeScale: number,
  linkThickness: number,
  highlightSet: Set<string>,
  filterCommunityId: number | null,
  semanticEdgeThreshold: number,
): ElementDefinition[] {
  const els: ElementDefinition[] = [];
  // Audit (2026-05-07) — semantic-edge threshold. 99% of edges in the
  // test corpus were type "semantic" (vector similarity above the
  // agent's storage threshold ~0.72). At that bar everything connects
  // to everything; visually a clique. The threshold here filters
  // semantic edges by weight: only show pairs above the user-chosen
  // similarity. Default 0.85 keeps the strong cross-conversation
  // connections, drops the noise. Typed/session/reference edges are
  // always shown — they carry explicit meaning regardless of weight.
  // Keep the original list for the degree fallback so node sizes don't
  // collapse when semantic edges are hidden.
  const visibleEdges = edges.filter((e) => {
    if (e.type !== "semantic") return true;
    const w = (e as { weight?: number }).weight;
    return typeof w === "number" && w >= semanticEdgeThreshold;
  });
  // Build degree map for fallback importance + filter pass
  // Use the full edge set so importance fallback stays meaningful even
  // when semantic edges are hidden visually.
  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }
  const maxDeg = Math.max(1, ...degree.values());

  // Audit (2026-05-07) — percentile remap for importance. Real ZAKI
  // corpora cluster importance values tightly; raw linear remap to
  // 5–18px collapsed visual variance. Compute percentile rank across
  // the visible nodes once, feed it to importanceToRadius. Smallest
  // 10% always paint at 5px, largest 10% at ~17–18px regardless of
  // the underlying distribution.
  const percentileRanks = importancePercentileRanks(
    nodes,
    (n) => n.id,
    (n) => {
      const raw =
        typeof n.importance === "number"
          ? n.importance
          : typeof n.importance_score === "number"
          ? n.importance_score
          : (degree.get(n.id) ?? 0) / maxDeg;
      return Number.isFinite(raw) ? raw : null;
    },
  );

  const visible = new Set<string>();
  for (const n of nodes) {
    if (
      filterCommunityId !== null &&
      filterCommunityId !== undefined &&
      n.community_id !== filterCommunityId
    ) {
      continue;
    }
    visible.add(n.id);
    // V1.11 hotfix (2026-05-07) — clamp importance to a finite [0, 1].
    // typeof NaN === "number", so the prior type-guard let NaN values
    // pass through (from malformed API rows or 0/0 fallback paths).
    // NaN propagates into radius (6 + 30*NaN = NaN) AND opacity
    // (0.45 + 0.55*NaN = NaN); cytoscape allocates internal arrays
    // sized by those values, throwing "Invalid array length" at mount.
    // Fixed at the source: a single safe finite-clamp here means every
    // downstream consumer (radius, opacity, importance data binding)
    // gets a clean number.
    const rawImportance =
      typeof n.importance === "number"
        ? n.importance
        : typeof n.importance_score === "number"
        ? n.importance_score
        : (degree.get(n.id) ?? 0) / maxDeg;
    const importance = Number.isFinite(rawImportance)
      ? Math.max(0, Math.min(1, rawImportance))
      : 0.3;
    const percentile = percentileRanks.get(n.id) ?? 0.5;
    const radius = importanceToRadius(percentile) * sizeScale;
    const color = nodeColor(preset, n);
    const label = n.display_label ?? "";
    const isArchived = n.valid_to !== null;
    const isHighlight = highlightSet.has(n.id) || (n.key ? highlightSet.has(n.key) : false);
    const classes: string[] = [];
    if (isArchived) classes.push("archived");
    if (isHighlight) classes.push("highlighted");
    els.push({
      group: "nodes",
      data: {
        id: n.id,
        key: n.key ?? n.id,
        label,
        color,
        size: radius * 2,
        kind: n.kind,
        summary: n.summary,
        community_name: n.community_name ?? null,
        community_id: n.community_id ?? null,
        importance,
        valid_to: n.valid_to,
        link_type: n.link_type ?? null,
        display_label: n.display_label ?? null,
        // V1.11 (2026-05-07) — per-node base opacity scaled by importance.
        // The pre-V1.11 graph rendered all mono-mode nodes at full opacity,
        // and the size-only hierarchy (8-24px radius) was hard to read on
        // a dark canvas because every node painted at the same brightness.
        // Opacity 0.45 (low importance) → 1.0 (high) gives the eye anchor
        // points without changing color. High-importance hubs naturally
        // dominate; leaves recede. Works across all color presets, not
        // just mono. Override classes (.dimmed, .archived, .focus) win
        // via stylesheet specificity.
        opacity: Math.max(0.45, Math.min(1, 0.45 + 0.55 * (importance ?? 0.3))),
      },
      classes: classes.join(" "),
    });
  }

  for (const e of visibleEdges) {
    if (!visible.has(e.source) || !visible.has(e.target)) continue;
    const s = edgeStyle(e.type);
    els.push({
      group: "edges",
      data: {
        id: `${e.source}->${e.target}-${e.type}`,
        source: e.source,
        target: e.target,
        edgeType: e.type,
        edgeColor: s.color,
        lineStyle: s.line,
        edgeWeight: s.width * linkThickness,
        predicate: (e as { predicate?: string }).predicate ?? null,
        // V1.11 (2026-05-07) — per-edge relevance for relevance-weighted
        // layout. Read by runLayout's idealEdgeLength callback. Real
        // confidence × weight from the gateway (V1.11 hotfix-4); falls
        // back to 0.5 if the gateway didn't emit either field (legacy
        // cached data only).
        relevance: edgeRelevance(e),
        confidence:
          (e as { confidence?: number }).confidence ??
          (e.type === "typed" ? 1.0 : null),
        edgeRawWeight: (e as { weight?: number }).weight ?? null,
      },
    });
  }
  return els;
}

function buildElementsFromLocal(
  resp: BrainLocalGraphResponse,
  preset: ColorPreset,
  sizeScale: number,
  linkThickness: number,
  semanticEdgeThreshold: number,
): ElementDefinition[] {
  const els: ElementDefinition[] = [];
  for (const n of resp.nodes) {
    const importance = typeof n.importance === "number" ? n.importance : Math.max(0, 1 - n.hop_distance * 0.25);
    const isCenter = n.key === resp.center_key;
    const radius = importanceToRadius(importance) * sizeScale * (isCenter ? 1.6 : 1);
    const color = nodeColor(preset, {
      kind: n.kind,
      community_id: n.community_id ?? null,
      link_type: n.link_type ?? null,
    });
    els.push({
      group: "nodes",
      data: {
        id: n.key,
        key: n.key,
        label: n.display_label ?? "",
        color,
        size: radius * 2,
        kind: n.kind,
        summary: n.summary,
        community_name: n.community_name ?? null,
        community_id: n.community_id ?? null,
        importance,
        valid_to: n.valid_to,
        link_type: n.link_type ?? null,
        hop_distance: n.hop_distance,
      },
      classes: isCenter ? "center" : "",
    });
  }
  for (const e of resp.edges) {
    const t: BrainGraphEdge["type"] = e.predicate ? "typed" : "semantic";
    // Local-graph edges don't carry weight; fall back to 1.0 so they
    // pass any reasonable threshold. The user's threshold still gates
    // global semantic edges; local view stays whole.
    if (t === "semantic") {
      const w = (e as { weight?: number }).weight ?? 1.0;
      if (w < semanticEdgeThreshold) continue;
    }
    const s = edgeStyle(t);
    // Local-graph endpoint doesn't yet emit confidence/weight; synthesize
    // a typed-edge object for edgeRelevance to inspect.
    const synth: BrainGraphEdge = {
      type: t,
      source: e.source,
      target: e.target,
      predicate: e.predicate ?? undefined,
      confidence: 1.0,
      weight: 1.0,
    } as BrainGraphEdge;
    els.push({
      group: "edges",
      data: {
        id: `${e.source}->${e.target}`,
        source: e.source,
        target: e.target,
        edgeType: t,
        edgeColor: s.color,
        lineStyle: s.line,
        edgeWeight: s.width * linkThickness,
        predicate: e.predicate ?? null,
        relevance: edgeRelevance(synth),
        confidence: 1.0,
        edgeRawWeight: 1.0,
      },
    });
  }
  return els;
}

function buildStylesheet(textFadeThreshold: number): StylesheetCSS[] {
  return [
    {
      selector: "node",
      css: {
        "background-color": "data(color)",
        width: "data(size)",
        height: "data(size)",
        // V1.11 (2026-05-07) — labels hidden by default. They surface
        // only when a node is in the focused neighborhood (hover or
        // click), explicitly selected, time-highlighted, or the local-
        // graph center. Achieves Obsidian's visual restraint without
        // removing the information — hover any node and its label +
        // neighbors' labels appear.
        label: "",
        // V1.11 (2026-05-07) — per-node opacity reflects importance.
        // Hubs paint at full brightness, leaves at ~45%. The eye gets
        // anchor points instead of a uniform mass. Specificity-wins
        // overrides for .dimmed (0.18), .archived (0.5), and .focus
        // (1.0) below.
        opacity: "data(opacity)",
        color: "#e5e7eb",
        "font-size": 10,
        "text-outline-width": 2,
        "text-outline-color": "#000",
        "text-valign": "bottom",
        "text-halign": "center",
        "text-margin-y": 2,
        "min-zoomed-font-size": Math.max(2, Math.floor(textFadeThreshold * 12)),
        "border-width": 0,
      },
    },
    {
      // V1.11 — labels appear on focused neighborhood (hover or click),
      // selected nodes, time-highlighted nodes, and the local-graph center.
      // Force full opacity so emphasis-worthy nodes pop regardless of
      // their importance-based base opacity.
      selector: "node.focus, node.center, node.highlighted, node:selected",
      css: {
        label: "data(label)",
        opacity: 1,
      } as Record<string, unknown>,
    },
    {
      selector: "node.archived",
      css: { opacity: 0.5 } as Record<string, unknown>,
    },
    {
      selector: "node.highlighted",
      css: {
        "border-width": 4,
        "border-color": "#fbbf24",
        "border-opacity": 1,
      },
    },
    {
      selector: "node.center",
      css: {
        "border-width": 4,
        "border-color": "#f10202",
        "border-opacity": 1,
      },
    },
    // Audit (2026-05-08) — Self-marker. Double-ring border in brand red
    // distinguishes the user's identity anchor from regular nodes and
    // from the .center (which is a transient navigation focus). Label
    // always visible so the user can spot themselves without hovering.
    {
      selector: "node.self",
      css: {
        "border-width": 3,
        "border-color": "#f10202",
        "border-style": "double",
        "border-opacity": 1,
        label: "data(label)",
        opacity: 1,
      } as Record<string, unknown>,
    },
    {
      selector: "node:selected",
      css: {
        "border-width": 3,
        "border-color": "#f10202",
        "border-opacity": 1,
      },
    },
    {
      selector: "node.dimmed",
      css: { opacity: 0.18 } as Record<string, unknown>,
    },
    {
      selector: "edge",
      css: {
        "line-color": "data(edgeColor)",
        "line-style": "data(lineStyle)",
        width: "data(edgeWeight)",
        "curve-style": "bezier",
        "target-arrow-shape": "none",
        opacity: 0.55,
      },
    },
    {
      selector: "edge.dimmed",
      css: { opacity: 0.08 } as Record<string, unknown>,
    },
    {
      selector: "edge.focus",
      css: { opacity: 0.95 } as Record<string, unknown>,
    },
    // Audit (2026-05-08) — search overlay. Matching nodes pop with the
    // brand red ring; non-matching dim further than the standard
    // `.dimmed` so the matches dominate. Edges between two matches
    // stay bright; any edge touching a non-match dims away.
    {
      selector: "node.search-hit",
      css: {
        "border-width": 4,
        "border-color": "#f10202",
        "border-opacity": 1,
        opacity: 1,
      } as Record<string, unknown>,
    },
    {
      selector: "node.search-out",
      css: { opacity: 0.1 } as Record<string, unknown>,
    },
    {
      selector: "edge.search-out",
      css: { opacity: 0.04 } as Record<string, unknown>,
    },
  ];
}

// ── Main component ───────────────────────────────────────────

export function BrainGraphView({
  userId,
  selectedIds,
  onSelectionChange,
  filters,
  highlightKeys,
  selectedCommunityId = null,
  centerKey,
  onCenterKeyChange,
  selfKey = null,
}: Props) {
  const { t } = useTranslation();

  const setCenterKey = onCenterKeyChange;
  const [depth, setDepth] = useState<number>(1);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  // V1.11 (2026-05-07) — Obsidian-style hover-highlight. Transient
  // companion to focusedNodeId; mouseover sets, mouseout clears.
  // Click takes precedence (focusedNodeId ?? hoveredNodeId in the
  // effective-id useEffect below).
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoverData, setHoverData] = useState<{
    node: NodeSingular;
    x: number;
    y: number;
  } | null>(null);

  // Data
  const fetchOpts = useMemo(() => fetchOptsFromFilters(filters), [filters]);
  const globalQuery = useBrainGraph(userId, fetchOpts);
  const localQuery = useBrainLocalGraph(userId, {
    center_key: centerKey,
    depth,
  });
  const memoryQuery = useBrainMemory(userId, focusedNodeId);

  // Cytoscape instance
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  // Stable refs for handlers
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  // Build elements
  const highlightSet = useMemo(
    () => new Set(highlightKeys ?? []),
    [highlightKeys],
  );

  const elements = useMemo<ElementDefinition[] | null>(() => {
    if (centerKey) {
      if (!localQuery.data) return null;
      return buildElementsFromLocal(
        localQuery.data,
        filters.colorPreset,
        filters.nodeSizeScale,
        filters.linkThickness,
        filters.semanticEdgeThreshold,
      );
    }
    if (!globalQuery.data) return null;
    return buildElementsFromGlobal(
      globalQuery.data.nodes,
      globalQuery.data.edges,
      filters.colorPreset,
      filters.nodeSizeScale,
      filters.linkThickness,
      highlightSet,
      selectedCommunityId,
      filters.semanticEdgeThreshold,
    );
  }, [
    centerKey,
    localQuery.data,
    globalQuery.data,
    filters.colorPreset,
    filters.nodeSizeScale,
    filters.linkThickness,
    filters.semanticEdgeThreshold,
    highlightSet,
    selectedCommunityId,
  ]);

  // Initial mount — create the cytoscape instance once.
  useEffect(() => {
    if (!containerRef.current || cyRef.current) return;
    const cy = cytoscape({
      container: containerRef.current,
      wheelSensitivity: 0.2,
      minZoom: 0.1,
      maxZoom: 4.0,
      style: buildStylesheet(filters.textFadeThreshold),
      elements: [],
      boxSelectionEnabled: false,
      autoungrabify: false,
    });
    cyRef.current = cy;

    cy.on("mouseover", "node", (evt) => {
      const node = evt.target as NodeSingular;
      const renderedPos = node.renderedPosition();
      setHoverData({ node, x: renderedPos.x, y: renderedPos.y });
      // V1.11 (2026-05-07) — Obsidian-style hover-highlight. Hover sets
      // a transient hoveredNodeId; the focus useEffect dims non-neighbors
      // and lights up the hovered node + its closed neighborhood. Click
      // (focusedNodeId) takes precedence over hover when both are set.
      setHoveredNodeId(node.id());
    });
    cy.on("mouseout", "node", () => {
      setHoverData(null);
      setHoveredNodeId(null);
    });
    cy.on("position", "node", () => {
      setHoverData((cur) => {
        if (!cur) return cur;
        const r = cur.node.renderedPosition();
        return { ...cur, x: r.x, y: r.y };
      });
    });
    cy.on("pan zoom", () => {
      setHoverData((cur) => {
        if (!cur) return cur;
        const r = cur.node.renderedPosition();
        return { ...cur, x: r.x, y: r.y };
      });
    });

    cy.on("tap", "node", (evt) => {
      const node = evt.target as NodeSingular;
      const id = node.id();
      const orig = evt.originalEvent as MouseEvent;
      if (orig?.shiftKey) {
        // toggle selection for compose
        const cur = selectedIdsRef.current;
        const next = cur.includes(id)
          ? cur.filter((x) => x !== id)
          : [...cur, id];
        onSelectionChangeRef.current(next);
        return;
      }
      setFocusedNodeId(id);
    });

    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        // tap on background — clear focus
        setFocusedNodeId(null);
        setHoverData(null);
      }
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push fresh elements on data change + run layout.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !elements) return;
    cy.elements().remove();
    cy.add(elements);
    runLayout(cy, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements]);

  // Re-run layout when forces change (without full element replace).
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !elements) return;
    runLayout(cy, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.nodeRepulsion,
    filters.idealEdgeLength,
    filters.gravity,
    filters.edgeElasticity,
  ]);

  // Update stylesheet when text-fade threshold changes.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.style(buildStylesheet(filters.textFadeThreshold));
  }, [filters.textFadeThreshold]);

  // Reflect selectedIds on the cy graph as :selected.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.batch(() => {
      cy.nodes().unselect();
      for (const id of selectedIds) cy.getElementById(id).select();
    });
  }, [selectedIds]);

  // Audit (2026-05-08) — Search overlay. Applies cytoscape classes to
  // matching / non-matching nodes when filters.search is non-empty.
  // Search is now a pure visual highlight (not a server-side filter),
  // so the canvas reacts to typing instead of swapping out node sets.
  // Match logic: case-insensitive substring against display_label /
  // summary / key — covers what users see in the hover tooltip.
  // Edges between two matches stay bright; any edge touching a
  // non-match dims away.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const q = filters.search.trim().toLowerCase();
    cy.batch(() => {
      cy.elements().removeClass("search-hit search-out");
      if (!q) return;
      const matchingIds = new Set<string>();
      cy.nodes().forEach((n) => {
        const label = String(n.data("display_label") ?? "").toLowerCase();
        const summary = String(n.data("summary") ?? "").toLowerCase();
        const key = String(n.data("key") ?? n.id() ?? "").toLowerCase();
        if (label.includes(q) || summary.includes(q) || key.includes(q)) {
          matchingIds.add(n.id());
        }
      });
      cy.nodes().forEach((n) => {
        if (matchingIds.has(n.id())) n.addClass("search-hit");
        else n.addClass("search-out");
      });
      cy.edges().forEach((e) => {
        const sIn = matchingIds.has(e.source().id());
        const tIn = matchingIds.has(e.target().id());
        if (!(sIn && tIn)) e.addClass("search-out");
      });
    });
  }, [filters.search, elements]);

  // Audit (2026-05-08) — Self-marker. Tags the canonical "you" anchor
  // from /brain/me with a .self class so the user can spot themselves
  // in the overview. Today it's a visible-only marker (auto-anchor-on-
  // self deferred until backend wires identity-to-activity edges and
  // self has a real neighborhood).
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.batch(() => {
      cy.nodes().removeClass("self");
      if (!selfKey) return;
      const self = cy.getElementById(selfKey);
      if (self.length) self.addClass("self");
    });
  }, [selfKey, elements]);

  // V1.11 (2026-05-07) — Apply focus dimming when EITHER focusedNodeId
  // (click, persistent) OR hoveredNodeId (hover, transient) is set.
  // Click takes precedence over hover via the `??` fallback so a
  // user who clicked a node keeps that focus even when hovering
  // elsewhere; mouseout clears hover but doesn't disturb the click
  // focus. Neighborhood nodes get `.focus` class (added in V1.11)
  // so labels surface for the hovered/clicked node + its neighbors,
  // matching Obsidian's signature interaction.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const effectiveId = focusedNodeId ?? hoveredNodeId;
    cy.batch(() => {
      cy.elements().removeClass("dimmed focus");
      if (!effectiveId) return;
      const focus = cy.getElementById(effectiveId);
      if (!focus.length) return;
      const neighborhood = focus.closedNeighborhood();
      cy.elements().not(neighborhood).addClass("dimmed");
      neighborhood.nodes().addClass("focus");
      neighborhood.edges().addClass("focus");
    });
  }, [focusedNodeId, hoveredNodeId, elements]);

  // V1.11 (2026-05-07) — Cluster-zoom on legend click. When the user
  // picks a community in BrainCommunityLegend, fit the camera to the
  // members of that community with a smooth animation. Without this
  // the click only filtered the visible set; users had to manually
  // zoom/pan to find the cluster. Padding 60 keeps the cluster
  // breathing-room from the canvas edges.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || selectedCommunityId === null || selectedCommunityId === undefined) return;
    const clusterNodes = cy.nodes().filter(
      (node) => node.data("community_id") === selectedCommunityId,
    );
    if (clusterNodes.length === 0) return;
    cy.animate({
      fit: { eles: clusterNodes, padding: 60 },
      duration: 600,
    });
  }, [selectedCommunityId, elements]);

  const focusedNodeData = useMemo<{
    node: BrainGraphNode | null;
  }>(() => {
    const cy = cyRef.current;
    if (!cy || !focusedNodeId) return { node: null };
    const n = cy.getElementById(focusedNodeId);
    if (!n.length) return { node: null };
    const d = n.data();
    return {
      node: {
        id: d.id,
        key: d.key,
        kind: d.kind,
        created_at: 0,
        session_id: null,
        summary: d.summary,
        valid_to: d.valid_to ?? null,
        importance: d.importance,
        community_id: d.community_id,
        community_name: d.community_name,
        link_type: d.link_type,
        display_label: d.display_label,
      },
    };
  }, [focusedNodeId, elements]);

  const enterLocalMode = useCallback((key: string) => {
    setCenterKey(key);
    setFocusedNodeId(null);
  }, []);

  const exitLocalMode = useCallback(() => {
    setCenterKey(null);
    setFocusedNodeId(null);
  }, []);

  const isLoading = centerKey ? localQuery.isLoading : globalQuery.isLoading;
  const isError = centerKey ? localQuery.isError : globalQuery.isError;
  return (
    <div className="relative w-full" data-testid="brain-graph-canvas-wrap">
      {/* Mode bar */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-white/55">
        <div>
          {centerKey ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exitLocalMode}
                className="rounded-zaki-md border border-white/10 px-2 py-0.5 text-xs text-white/85 hover:border-[#f10202]"
                data-testid="brain-back-to-global"
              >
                {t("brain.graph.backToGlobal", { defaultValue: "← Back to global" })}
              </button>
              <span className="font-mono text-white/85">{centerKey}</span>
              <label className="flex items-center gap-1">
                <span>{t("brain.graph.depth", { defaultValue: "Depth" })}</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={1}
                  value={depth}
                  onChange={(e) => setDepth(Number(e.target.value))}
                  className="w-20 accent-[#f10202]"
                  data-testid="brain-depth-slider"
                />
                <span className="w-3 text-right">{depth}</span>
              </label>
            </div>
          ) : (
            // Audit (2026-05-08) — dropped redundant "Trimmed: NN nodes
            // hidden" label. The counter strip in BrainPage already
            // shows "Showing N of M memories" honestly. The "Trimmed"
            // framing here read as a failure ("we couldn't fit your
            // brain") when the truth is "we hid the low-importance
            // noise so the signal is visible." Counter strip is the
            // canonical surface; this duplicate is gone.
            <span aria-hidden />
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <span className="rounded-full bg-[#f10202]/10 px-2 py-0.5 text-[#f10202]">
              {t("brain.graph.selected", {
                defaultValue: "{{n}} selected",
                n: selectedIds.length,
              })}
            </span>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative">
        <div
          ref={containerRef}
          className="size-full min-h-[640px] rounded-zaki-lg border border-white/10 bg-black/60"
          data-testid="brain-graph-canvas"
        />

        {isLoading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/55">
            {t("brain.graph.loading", { defaultValue: "Loading graph..." })}
          </div>
        )}

        {isError && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/55">
            {t("brain.error.loadFailed")}
          </div>
        )}

        {/* Hover tooltip — rendered from cached node payload */}
        {hoverData && (
          <HoverTooltip
            data={hoverData.node.data() as Record<string, unknown>}
            x={hoverData.x}
            y={hoverData.y}
          />
        )}

        {/* Detail panel */}
        {focusedNodeData.node && (
          <DetailPanel
            node={focusedNodeData.node}
            detail={memoryQuery.data ?? null}
            loading={memoryQuery.isLoading}
            onClose={() => setFocusedNodeId(null)}
            onShowLocal={(key) => enterLocalMode(key)}
            t={t}
          />
        )}
      </div>
    </div>
  );
}

function runLayout(cy: Core, f: BrainGraphFilters) {
  // Audit (2026-05-08) — migrated to fcose. cose-bilkent's function-form
  // idealEdgeLength threw RangeError in FDLayout.calcGrid every render,
  // silently disabling per-edge relevance-weighted distance. fcose
  // honors the function form reliably.
  //
  // Mapping (Nova: "node distance should show relevance"):
  //   length = base * (1.5 - relevance)
  //   typed predicate (relevance 1.0) → 0.5 × base (tight pull)
  //   semantic high   (0.85+)         → tight
  //   semantic low    (0.5)           → 1.0 × base
  //   session         (0.5)           → 1.0 × base
  //
  // Try/catch retained as a defensive backstop in case a future
  // fcose build narrows the type, but the function path now succeeds.
  const baseOpts: Record<string, unknown> = {
    name: "fcose",
    animate: true,
    animationDuration: 600,
    animationEasing: "ease-out",
    randomize: true,
    quality: "default",
    nodeRepulsion: f.nodeRepulsion,
    edgeElasticity: f.edgeElasticity,
    gravity: f.gravity,
    numIter: 2500,
    fit: true,
    padding: 30,
    // fcose-specific tuning: incremental layout for stability after
    // filter changes, but allow randomize: true on first layout to
    // avoid local minima.
    nodeSeparation: 80,
  };
  const fnOpts = {
    ...baseOpts,
    idealEdgeLength: (edge: { data: (k: string) => unknown }) => {
      const r = edge.data("relevance");
      const rel =
        typeof r === "number" && Number.isFinite(r)
          ? Math.max(0, Math.min(1, r))
          : 0.5;
      return Math.max(20, f.idealEdgeLength * (1.5 - rel));
    },
  };
  try {
    cy.layout(fnOpts as unknown as cytoscape.LayoutOptions).run();
  } catch (err) {
    // Fallback: rejected — use constant.
    // eslint-disable-next-line no-console
    console.warn(
      "[brain] fcose rejected per-edge idealEdgeLength; falling back to constant. Should not happen — investigate.",
      err,
    );
    cy.layout({
      ...baseOpts,
      idealEdgeLength: f.idealEdgeLength,
    } as unknown as cytoscape.LayoutOptions).run();
  }
}

// ── Hover tooltip ─────────────────────────────────────────────

function HoverTooltip({
  data,
  x,
  y,
}: {
  data: Record<string, unknown>;
  x: number;
  y: number;
}) {
  const label = (data.display_label as string) || (data.label as string) || (data.key as string) || "";
  const summary = (data.summary as string) ?? "";
  const community = (data.community_name as string | null) ?? null;
  const kind = (data.kind as string) ?? "";
  const importance = (data.importance as number | undefined) ?? 0;
  const offset = 14;
  return (
    <div
      className="pointer-events-none absolute z-30 max-w-xs rounded-zaki-lg border border-white/10 bg-black/85 px-3 py-2 text-xs text-white shadow-lg backdrop-blur"
      style={{
        left: x + offset,
        top: y + offset,
        // keep within bounds
        transform: "translateZ(0)",
      }}
    >
      {label && <div className="mb-1 text-sm font-medium">{label}</div>}
      <div className="mb-1 text-[10px] uppercase tracking-wider text-white/50">
        {kind}
        {community ? ` · ${community}` : " · no cluster"}
      </div>
      {summary && <p className="line-clamp-3 leading-relaxed text-white/90">{summary}</p>}
      <div className="mt-1 text-[10px] text-white/50">
        importance {Number(importance).toFixed(2)}
      </div>
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────

function DetailPanel({
  node,
  detail,
  loading,
  onClose,
  onShowLocal,
  t,
}: {
  node: BrainGraphNode;
  detail: BrainMemoryDetail | null;
  loading: boolean;
  onClose: () => void;
  onShowLocal: (key: string) => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const isDeprecated = node.valid_to !== null && node.valid_to !== undefined;
  const content = detail?.content ?? node.summary;
  const importance =
    typeof node.importance === "number"
      ? node.importance
      : detail?.importance_score;
  const linked = detail?.linked_memories ?? [];
  const history = detail?.valid_history ?? [];

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 flex max-h-[70%] flex-col rounded-t-zaki-lg border-t border-white/10 bg-black/85 backdrop-blur-xl sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:max-h-none sm:w-72 sm:rounded-none sm:border-l sm:border-t-0"
      data-testid="brain-detail-panel"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
          {node.kind}
        </span>
        <div className="flex items-center gap-2">
          {typeof importance === "number" && (
            <div className="flex items-center gap-1" title={`importance ${(importance * 100).toFixed(0)}%`}>
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#f10202]"
                  style={{ width: `${importance * 100}%` }}
                />
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-white/40 transition-colors hover:text-white"
            aria-label={t("brain.graph.detail.close", { defaultValue: "Close" })}
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {node.community_name && (
          <div className="mb-2 text-[10px] uppercase tracking-wider text-white/40">
            {node.community_name}
          </div>
        )}
        {loading && !detail ? (
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-white/10" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-white/10" />
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-white/90">{content}</p>
        )}

        {/*
          V1.11 (2026-05-07) — Source attribution section. Audit-flagged
          as the highest-wow-per-LoC change because the backend already
          serves it (BrainMemoryDetail.source: {timestamp, snippet?}) and
          BrainMemoryDetail.session_id at the top level. Pre-V1.11 this
          data was returned by /brain/memory/:key and silently ignored
          by the DetailPanel. Now users see WHERE a memory came from —
          which conversation, when, and the verbatim snippet that the
          extractor latched onto. This is the trust-builder for Pillar
          1 (visible memory): "I can see exactly where ZAKI learned
          this fact."
        */}
        {detail?.source && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {t("brain.graph.detail.captured", { defaultValue: "Captured" })}
            </p>
            <div className="rounded-zaki-md border border-white/10 bg-white/5 px-2.5 py-2">
              <p className="text-[10px] text-white/50">
                {new Date(detail.source.timestamp * 1000).toLocaleString()}
                {detail.session_id ? (
                  <span className="ml-2 break-all font-mono text-[9px] text-white/30">
                    {detail.session_id}
                  </span>
                ) : null}
              </p>
              {detail.source.snippet ? (
                <p className="mt-1.5 border-l-2 border-white/20 pl-2 text-[11px] italic leading-relaxed text-white/70">
                  &ldquo;{detail.source.snippet}&rdquo;
                </p>
              ) : null}
            </div>
          </div>
        )}

        {linked.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {t("brain.graph.detail.linked", { defaultValue: "Linked" })}
            </p>
            <div className="space-y-1.5">
              {linked.map((lm, i) => (
                <div key={i} className="flex items-start gap-2 rounded-zaki-md bg-white/5 px-2.5 py-2">
                  <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white/70">
                    {lm.link_type}
                  </span>
                  <p className="line-clamp-2 text-[11px] text-white/70">{lm.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/*
          Audit (2026-05-07) — Supersede chain stepper. Replaces the
          collapsible flat list of prior versions. The supersede chain
          is the V1.10 truth-maintenance differentiator made visible:
          "tell ZAKI he's wrong, watch him learn." Stepper pattern with
          a vertical timeline rail makes the chain feel like a journey,
          not a backlog. Always-expanded so the differentiator is the
          first thing the user notices on a corrected memory.
        */}
        {(history.length > 0 || isDeprecated) && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {t("brain.graph.detail.supersedeChain", {
                defaultValue: "Supersede chain",
                count: history.length + 1,
              })}
            </p>
            <ol className="relative space-y-3">
              <span
                className="absolute left-1 top-1 bottom-1 w-px bg-white/10"
                aria-hidden="true"
              />
              <li className="relative pl-5">
                <span
                  className="absolute left-0 top-1.5 size-2 rounded-full bg-zaki-brand ring-2 ring-zaki-brand/30"
                  aria-hidden="true"
                />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zaki-brand">
                  {isDeprecated
                    ? t("brain.graph.detail.superseded", { defaultValue: "Superseded" })
                    : t("brain.graph.detail.current", { defaultValue: "Current" })}
                  {node.created_at
                    ? ` · ${new Date(node.created_at * 1000).toLocaleDateString()}`
                    : ""}
                  {node.valid_to
                    ? ` → ${new Date(node.valid_to * 1000).toLocaleDateString()}`
                    : ""}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-white/80">{content}</p>
              </li>
              {history.map((h, i) => (
                <li key={i} className="relative pl-5">
                  <span
                    className="absolute left-0 top-1.5 size-2 rounded-full border border-white/30 bg-black"
                    aria-hidden="true"
                  />
                  <p className="text-[10px] text-white/40">
                    {new Date(h.valid_from * 1000).toLocaleDateString()}
                    {h.valid_to ? ` → ${new Date(h.valid_to * 1000).toLocaleDateString()}` : ""}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/60">{h.content}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={() => onShowLocal(node.key ?? node.id)}
          className="w-full rounded-zaki-md border border-[#f10202] bg-[#f10202]/10 px-3 py-1.5 text-xs font-medium text-[#f10202] transition hover:bg-[#f10202]/20"
          data-testid="brain-show-local-graph"
        >
          {t("brain.graph.detail.showLocal", { defaultValue: "Show local graph" })}
        </button>
        {isDeprecated && (
          <div className="mt-2 rounded-full bg-zaki-warning px-2 py-0.5 text-center text-[10px] font-semibold text-zaki-warning">
            {t("brain.graph.superseded", { defaultValue: "Superseded" })}
          </div>
        )}
      </div>
    </div>
  );
}
