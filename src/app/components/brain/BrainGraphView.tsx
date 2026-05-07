// BrainGraphView (V1.7) — cytoscape.js + cose-bilkent.
//
// Replaces the prior d3-force/Canvas implementation with a force-directed
// cytoscape graph that matches Obsidian's UX:
//   - cose-bilkent layout with live tunable forces
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
import { ChevronDown, ChevronUp, X } from "lucide-react";
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
  importanceToRadius,
  nodeColor,
  type ColorPreset,
} from "./brainColors";

// cose-bilkent has no shipped types; declare it.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — no types ship with cytoscape-cose-bilkent
import coseBilkent from "cytoscape-cose-bilkent";

// Register the layout once. cytoscape.use is idempotent in practice but we
// guard with a module-level flag to be safe under HMR.
let _coseBilkentRegistered = false;
function ensureCoseBilkent() {
  if (_coseBilkentRegistered) return;
  try {
    cytoscape.use(coseBilkent);
  } catch {
    // already registered (HMR re-entry)
  }
  _coseBilkentRegistered = true;
}
ensureCoseBilkent();

// ── Props ────────────────────────────────────────────────────

export interface BrainGraphFilters {
  excludeOrphans: boolean;
  linkTypes: string[];
  search: string;
  maxNodes: number;
  colorPreset: ColorPreset;
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

// V1.11 hotfix (2026-05-07) — per-edge relevance score (0..1) drives
// `idealEdgeLength` so node distance reflects how related two nodes are
// in Nova's words: "if two nodes are closer to each other that means
// they are more relevant to each other."
//
// Hierarchy of edge meaning, strongest first:
//   1.0 typed      — explicit predicate (RELATES_TO, IS, SUPERSEDES). The
//                    extractor asserted a specific semantic claim. Tightest
//                    pull because these are first-class facts.
//   0.65 reference — a memory cites another by key. Authorial intent.
//   0.45 semantic  — cosine-similarity nearest-neighbor. Real but noisy
//                    (the threshold lets through some weak pairs).
//   0.20 session   — co-occurred in the same conversation. Loose: two
//                    facts mentioned in one chat aren't necessarily related.
//
// runLayout maps relevance → idealEdgeLength via:
//   length = base * (1.5 - relevance)
//   relevance 1.0 → 0.5×base (tight)
//   relevance 0.0 → 1.5×base (loose)
function edgeRelevance(type: BrainGraphEdge["type"]): number {
  switch (type) {
    case "typed":
      return 1.0;
    case "reference":
      return 0.65;
    case "semantic":
      return 0.45;
    case "session":
    default:
      return 0.2;
  }
}

function fetchOptsFromFilters(f: BrainGraphFilters): BrainGraphFetchOpts {
  return {
    max_nodes: f.maxNodes,
    exclude_orphans: f.excludeOrphans,
    search: f.search || undefined,
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
): ElementDefinition[] {
  const els: ElementDefinition[] = [];
  // Build degree map for fallback importance + filter pass
  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }
  const maxDeg = Math.max(1, ...degree.values());

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
    const radius = importanceToRadius(importance) * sizeScale;
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

  for (const e of edges) {
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
        // layout. Read by runLayout's idealEdgeLength callback.
        relevance: edgeRelevance(e.type),
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
    const s = edgeStyle(t);
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
        relevance: edgeRelevance(t),
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
    );
  }, [
    centerKey,
    localQuery.data,
    globalQuery.data,
    filters.colorPreset,
    filters.nodeSizeScale,
    filters.linkThickness,
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
  const totalSkipped = !centerKey ? globalQuery.data?.total_skipped ?? 0 : 0;
  const trimmed = !centerKey ? globalQuery.data?.trimmed ?? false : false;

  return (
    <div className="relative w-full" data-testid="brain-graph-canvas-wrap">
      {/* Mode bar */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zaki-muted">
        <div>
          {centerKey ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exitLocalMode}
                className="rounded-zaki-md border border-zaki-border px-2 py-0.5 text-xs text-zaki-text hover:border-[#f10202]"
                data-testid="brain-back-to-global"
              >
                {t("brain.graph.backToGlobal", { defaultValue: "← Back to global" })}
              </button>
              <span className="font-mono text-zaki-text">{centerKey}</span>
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
            <span>
              {trimmed
                ? t("brain.graph.trimmed", {
                    defaultValue: "Trimmed: {{n}} nodes hidden.",
                    n: totalSkipped,
                  })
                : null}
            </span>
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
          className="size-full min-h-[640px] rounded-zaki-lg border border-zaki-border bg-black/60"
          data-testid="brain-graph-canvas"
        />

        {isLoading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-zaki-muted">
            {t("brain.graph.loading", { defaultValue: "Loading graph..." })}
          </div>
        )}

        {isError && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-zaki-muted">
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
  // V1.11 hotfix-3 (2026-05-07) — per-edge relevance-weighted layout.
  //
  // Nova: "node distance should show relevance. if two nodes are closer
  // to each other that means they are more relevant to each other."
  //
  // The earlier hotfix-2 comment claimed cose-bilkent rejects function
  // values for idealEdgeLength. That diagnosis was wrong — the real
  // cause of "Invalid array length" was NaN propagating from node
  // importance into radius/opacity arrays. With NaN clamped at the
  // source (buildElementsFromGlobal line ~164), function-based
  // idealEdgeLength is safe.
  //
  // Mapping:
  //   length = base * (1.5 - relevance)
  //   typed predicate (relevance 1.0) → 0.5 × base (tight pull)
  //   reference        (0.65)         → 0.85 × base
  //   semantic         (0.45)         → 1.05 × base
  //   session          (0.20)         → 1.30 × base (loose)
  //
  // Try/catch wraps the function call: if a future cose-bilkent build
  // tightens the type, we fall back to the slider-driven constant rather
  // than crash the graph.
  const baseOpts: Record<string, unknown> = {
    name: "cose-bilkent",
    animate: true,
    animationDuration: 600,
    animationEasing: "ease-out",
    randomize: true,
    nodeRepulsion: f.nodeRepulsion,
    edgeElasticity: f.edgeElasticity,
    gravity: f.gravity,
    numIter: 2500,
    fit: true,
    padding: 30,
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
      "[brain] cose-bilkent rejected per-edge idealEdgeLength; falling back to constant",
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
  const [historyOpen, setHistoryOpen] = useState(false);
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
      className="absolute inset-y-0 right-0 z-20 flex w-72 flex-col border-l border-white/10 bg-black/85 backdrop-blur-xl"
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

        {history.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setHistoryOpen((o) => !o)}
              className="flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-white/40 hover:text-white/60"
            >
              {t("brain.graph.detail.priorVersions", {
                defaultValue: "Prior versions",
                count: history.length,
              })}
              {historyOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>
            {historyOpen && (
              <div className="mt-2 space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="rounded-zaki-md border border-white/10 bg-white/5 px-2.5 py-2">
                    <p className="mb-1 text-[10px] text-white/40">
                      {new Date(h.valid_from * 1000).toLocaleDateString()}
                      {h.valid_to ? ` → ${new Date(h.valid_to * 1000).toLocaleDateString()}` : ""}
                    </p>
                    <p className="text-[11px] text-white/60">{h.content}</p>
                  </div>
                ))}
              </div>
            )}
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
          <div className="mt-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-center text-[10px] font-semibold text-amber-400">
            {t("brain.graph.superseded", { defaultValue: "Superseded" })}
          </div>
        )}
      </div>
    </div>
  );
}
