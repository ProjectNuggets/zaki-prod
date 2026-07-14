import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import { useBrainCommunities, useBrainGraph } from "@/queries";
import { KIND_LABEL } from "../brainColors";
import type { BrainFilters } from "../BrainFilterPanel";
import {
  buildClusterOverviewModel,
  buildRenderModel,
  filterGraphByCommunity,
  parseClusterNodeId,
} from "./model";
import { GalaxyRenderer, type GalaxyHandle } from "./GalaxyRenderer";
import { BrainDetailPanel } from "./BrainDetailPanel";
import { clampQuality, prefersReducedMotion } from "./engine/lod";
import type { BrainViewMode, GraphRendererOptions, RenderQuality } from "./engine/interface";
import { brainDisplayText, sanitizeBrainText } from "../brainText";

// What the canvas is scoped to. Default is "overview" (the cluster constellation
// — clusters-first). Tapping a hub drills into "cluster"; "all" is the opt-in
// full-corpus galaxy ("Explore everything").
export type GalaxyScope =
  | { kind: "overview" }
  | { kind: "cluster"; id: number; name: string }
  | { kind: "all" };

interface NodeBrief {
  title: string;
  kind: string;
  theme: string | null;
  createdAt: number | undefined;
  degree: number;
  /** Set for cluster hubs (member count) instead of degree. */
  memberCount?: number;
}

// created_at may be seconds or ms; render a coarse "x ago".
function briefAge(ts: number): string {
  const ms = ts < 1e12 ? ts * 1000 : ts;
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

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

    // Brief "executive" card shown on hover — instant, from the graph data (no
    // fetch). Member nodes show kind/theme/age/connections; cluster hubs show
    // the theme name + size.
    const [hoverId, setHoverId] = useState<string | null>(null);
    const briefById = useMemo(() => {
      const deg = new Map<string, number>();
      for (const e of graph.data?.edges ?? []) {
        deg.set(e.source, (deg.get(e.source) ?? 0) + 1);
        deg.set(e.target, (deg.get(e.target) ?? 0) + 1);
      }
      const map = new Map<string, NodeBrief>();
      for (const n of graph.data?.nodes ?? []) {
        // Only show a real LLM theme name — skip "Cluster 19716777" fallbacks.
        const communityName = sanitizeBrainText(n.community_name);
        const named = communityName && !/^Cluster \d+$/.test(communityName);
        map.set(n.id, {
          title: brainDisplayText(n.display_label, n.summary, n.key, n.id),
          kind: KIND_LABEL[n.kind] ?? n.kind,
          theme: named ? communityName : null,
          createdAt: n.created_at,
          degree: deg.get(n.id) ?? 0,
        });
      }
      return map;
    }, [graph.data]);

    const hoverBrief = useMemo<NodeBrief | null>(() => {
      if (!hoverId) return null;
      const cid = parseClusterNodeId(hoverId);
      if (cid != null) {
        const c = communities.data?.communities.find((x) => x.community_id === cid);
        if (!c) return null;
        return {
          title: brainDisplayText(c.name, `Theme ${cid}`),
          kind: "Theme",
          theme: null,
          createdAt: undefined,
          degree: 0,
          memberCount: c.member_count,
        };
      }
      return briefById.get(hoverId) ?? null;
    }, [hoverId, briefById, communities.data]);

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

    // Drilled into a cluster: how many of its members are actually on screen vs
    // the community's full-corpus size. They match at this corpus size, but a
    // large cluster can exceed the node cap — so be honest rather than implying
    // the drill-in shows everything.
    const clusterCount = useMemo(() => {
      if (scope.kind !== "cluster") return null;
      const total =
        communities.data?.communities.find((c) => c.community_id === scope.id)?.member_count ??
        null;
      return { shown: model.nodes.length, total };
    }, [scope, communities.data, model.nodes.length]);

    // Clear focus if the focused node leaves the graph (filter / data change).
    useEffect(() => {
      if (focusId && !model.nodes.some((n) => n.id === focusId)) {
        onFocusChange(null, null);
      }
    }, [model, focusId, onFocusChange]);

    // Clear a stale hover brief when the model/scope changes (the hovered node
    // may no longer exist → avoid showing a brief for a node that's gone).
    useEffect(() => {
      if (hoverId && !model.nodes.some((n) => n.id === hoverId)) setHoverId(null);
    }, [model, hoverId]);

    const handleSelect = useCallback(
      (id: string, additive: boolean) => {
        // In the overview, a click is "drill into this cluster", not a select.
        if (isOverview) {
          const cid = parseClusterNodeId(id);
          if (cid != null) {
            const c = communities.data?.communities.find((x) => x.community_id === cid);
            onScopeChange({
              kind: "cluster",
              id: cid,
              name: brainDisplayText(c?.name, `Theme ${cid}`),
            });
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

    // Reactive prefers-reduced-motion — re-clamps if the OS setting changes
    // mid-session (not just read once at mount).
    const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
    useEffect(() => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      const onChange = () => setReducedMotion(mql.matches);
      onChange();
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }, []);
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
        forces: {
          center: filters.gravity,
          repel: filters.nodeRepulsion,
          linkDistance: filters.idealEdgeLength,
          linkStrength: filters.edgeElasticity,
        },
        selectedIds,
        focusId,
        focusDepth: depth,
        highlightIds,
        searchIds,
        onSelect: handleSelect,
        onHover: setHoverId,
      }),
      [
        view,
        quality,
        filters.nodeSizeScale,
        filters.textFadeThreshold,
        filters.gravity,
        filters.nodeRepulsion,
        filters.idealEdgeLength,
        filters.edgeElasticity,
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
        {searchIds ? (
          <div className="zaki-galaxy-searchcount" role="status">
            {searchIds.length} {searchIds.length === 1 ? "match" : "matches"}
          </div>
        ) : clusterCount && clusterCount.total != null ? (
          <div className="zaki-galaxy-searchcount" role="status">
            {clusterCount.shown >= clusterCount.total
              ? `${clusterCount.total} ${clusterCount.total === 1 ? "memory" : "memories"}`
              : `Showing ${clusterCount.shown} of ${clusterCount.total}`}
          </div>
        ) : null}
        {focusId ? (
          // Selected: the full memory detail lives in the card (no separate
          // right rail → the canvas gets the room).
          <div className="zaki-galaxy-card zaki-galaxy-card--detail">
            <BrainDetailPanel
              userId={userId}
              memoryKey={keyByNodeId.get(focusId) ?? focusId}
              onClose={() => onFocusChange(null, null)}
            />
          </div>
        ) : hoverBrief ? (
          <div className="zaki-galaxy-brief" role="status">
            <div className="zaki-galaxy-brief__title">{hoverBrief.title}</div>
            <div className="zaki-galaxy-brief__meta">
              {hoverBrief.kind}
              {hoverBrief.theme ? ` · ${hoverBrief.theme}` : ""}
              {hoverBrief.createdAt ? ` · ${briefAge(hoverBrief.createdAt)}` : ""}
              {hoverBrief.memberCount != null
                ? ` · ${hoverBrief.memberCount} memories`
                : ` · ${hoverBrief.degree} connection${hoverBrief.degree === 1 ? "" : "s"}`}
            </div>
            <div className="zaki-galaxy-brief__hint">Click to open · Shift-drag to spin</div>
          </div>
        ) : null}
      </>
    );
  },
);

export default BrainGalaxyView;
