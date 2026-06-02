import { forwardRef, useCallback, useEffect, useMemo } from "react";
import { useBrainCommunities, useBrainGraph } from "@/queries";
import type { BrainFilters } from "../BrainFilterPanel";
import {
  buildClusterOverviewModel,
  buildRenderModel,
  filterGraphByCommunity,
  parseClusterNodeId,
} from "./model";
import { GalaxyRenderer, type GalaxyHandle } from "./GalaxyRenderer";
import { clampQuality, prefersReducedMotion } from "./engine/lod";
import type { BrainViewMode, GraphRendererOptions, RenderQuality } from "./engine/interface";

// What the canvas is scoped to. Default is "overview" (the cluster constellation
// — clusters-first). Tapping a hub drills into "cluster"; "all" is the opt-in
// full-corpus galaxy ("Explore everything").
export type GalaxyScope =
  | { kind: "overview" }
  | { kind: "cluster"; id: number; name: string }
  | { kind: "all" };

export interface BrainGalaxyViewProps {
  userId: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  filters: BrainFilters;
  selfKey: string | null;
  /** Node keys to glow (time scrubber births/affected window). */
  highlightKeys: string[];
  // Controlled view state — owned by BrainPage so the display panel lives in the
  // page's filters-rail and the detail panel in the page's detail-rail (rather
  // than as canvas overlays).
  view: BrainViewMode;
  fx: RenderQuality;
  depth: number;
  focusId: string | null;
  /** Emits the focused node id (for the engine) and its memory key (for detail). */
  onFocusChange: (id: string | null, key: string | null) => void;
  /** Clusters-first scope: overview hubs → drill into a cluster → full galaxy. */
  scope: GalaxyScope;
  onScopeChange: (scope: GalaxyScope) => void;
}

// WebGL renderer container — the galaxy counterpart of BrainGraphView. Owns no
// chrome of its own anymore: view/FX/depth/focus are controlled by BrainPage so
// every panel uses a real page slot. Just builds the render model, derives
// search/highlight, and forwards the imperative handle (fit/relayout).
export const BrainGalaxyView = forwardRef<GalaxyHandle, BrainGalaxyViewProps>(
  function BrainGalaxyView(
    {
      userId,
      selectedIds,
      onSelectionChange,
      filters,
      selfKey,
      highlightKeys,
      view,
      fx,
      depth,
      focusId,
      onFocusChange,
      scope,
      onScopeChange,
    },
    ref,
  ) {
    const graph = useBrainGraph(userId, {
      max_nodes: filters.maxNodes,
      exclude_orphans: filters.excludeOrphans,
      link_types: filters.linkTypes.length > 0 ? filters.linkTypes.join(",") : undefined,
      semantic_min_weight: filters.semanticEdgeThreshold,
    });
    const communities = useBrainCommunities(userId);

    // Scope picks the data the engine draws. Overview → cluster hubs; cluster →
    // that community's members (client-side filter of the one graph fetch); all →
    // the full corpus. Overview falls back to the full galaxy when no
    // communities have been computed yet, so the canvas is never empty.
    const overviewModel = useMemo(
      () => buildClusterOverviewModel(communities.data?.communities),
      [communities.data],
    );
    // True only when hubs are actually on screen — gates click-as-drill-in.
    const isOverview = scope.kind === "overview" && overviewModel.nodes.length > 0;

    const model = useMemo(() => {
      if (scope.kind === "overview") {
        // Stay blank while communities load (don't flash the full hairball);
        // if there are genuinely no clusters, fall back to the full corpus.
        if (communities.isLoading) return { nodes: [], edges: [] };
        if (overviewModel.nodes.length > 0) return overviewModel;
      }
      const source =
        scope.kind === "cluster" ? filterGraphByCommunity(graph.data, scope.id) : graph.data;
      return buildRenderModel(source, {
        colorPreset: filters.colorPreset,
        selfKey,
        semanticEdgeThreshold: filters.semanticEdgeThreshold,
      });
    }, [
      scope,
      communities.isLoading,
      overviewModel,
      graph.data,
      filters.colorPreset,
      filters.semanticEdgeThreshold,
      selfKey,
    ]);

    const keyIndex = useMemo(() => {
      const map = new Map<string, string>();
      for (const n of graph.data?.nodes ?? []) {
        map.set(n.id, n.id);
        if (n.key) map.set(n.key, n.id);
      }
      return map;
    }, [graph.data]);

    // id → memory key, from the SAME graph the galaxy renders (link_types
    // applied), so the detail fetch always resolves the right key.
    const keyByNodeId = useMemo(() => {
      const map = new Map<string, string>();
      for (const n of graph.data?.nodes ?? []) map.set(n.id, n.key ?? n.id);
      return map;
    }, [graph.data]);

    const highlightIds = useMemo(
      () => highlightKeys.map((k) => keyIndex.get(k)).filter((x): x is string => Boolean(x)),
      [highlightKeys, keyIndex],
    );

    const searchIds = useMemo(() => {
      const q = filters.search.trim().toLowerCase();
      if (!q) return null;
      return model.nodes
        .filter((n) => n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q))
        .map((n) => n.id);
    }, [filters.search, model]);

    // Clear focus if the focused node leaves the graph (filter / data change).
    useEffect(() => {
      if (focusId && !model.nodes.some((n) => n.id === focusId)) {
        onFocusChange(null, null);
      }
    }, [model, focusId, onFocusChange]);

    const handleSelect = useCallback(
      (id: string, additive: boolean) => {
        // In the overview, a click is "drill into this cluster", not a select.
        if (isOverview) {
          const cid = parseClusterNodeId(id);
          if (cid != null) {
            const c = communities.data?.communities.find((x) => x.community_id === cid);
            onScopeChange({ kind: "cluster", id: cid, name: c?.name ?? `Cluster ${cid}` });
          }
          return;
        }
        if (additive) {
          onSelectionChange(
            selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id],
          );
          return;
        }
        const next = focusId === id ? null : id;
        onFocusChange(next, next ? (keyByNodeId.get(next) ?? next) : null);
      },
      [
        isOverview,
        communities.data,
        onScopeChange,
        onSelectionChange,
        selectedIds,
        focusId,
        onFocusChange,
        keyByNodeId,
      ],
    );

    const reducedMotion = useMemo(() => prefersReducedMotion(), []);
    const quality = useMemo(
      () => clampQuality(fx, model.nodes.length, reducedMotion),
      [fx, model.nodes.length, reducedMotion],
    );

    const options = useMemo<GraphRendererOptions>(
      () => ({
        view,
        quality,
        nodeScale: filters.nodeSizeScale,
        labelFade: filters.textFadeThreshold,
        selectedIds,
        focusId,
        focusDepth: depth,
        highlightIds,
        searchIds,
        onSelect: handleSelect,
      }),
      [
        view,
        quality,
        filters.nodeSizeScale,
        filters.textFadeThreshold,
        selectedIds,
        focusId,
        depth,
        highlightIds,
        searchIds,
        handleSelect,
      ],
    );

    return (
      <>
        <GalaxyRenderer
          ref={ref}
          model={model}
          options={options}
          className="zaki-brain-v2__galaxy"
        />
        {searchIds && (
          <div className="zaki-galaxy-searchcount" role="status">
            {searchIds.length} {searchIds.length === 1 ? "match" : "matches"}
          </div>
        )}
      </>
    );
  },
);

export default BrainGalaxyView;
