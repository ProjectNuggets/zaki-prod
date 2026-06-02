import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBrainGraph } from "@/queries";
import type { BrainFilters } from "../BrainFilterPanel";
import { buildRenderModel } from "./model";
import { GalaxyRenderer, type GalaxyHandle } from "./GalaxyRenderer";
import { BrainDisplayPanel } from "./BrainDisplayPanel";
import { BrainDetailPanel } from "./BrainDetailPanel";
import { DEFAULT_FX, clampQuality, prefersReducedMotion } from "./engine/lod";
import type { BrainViewMode, GraphRendererOptions, RenderQuality } from "./engine/interface";

export interface BrainGalaxyViewProps {
  userId: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  filters: BrainFilters;
  selfKey: string | null;
  /** Node keys to glow (time scrubber births/affected window). */
  highlightKeys: string[];
}

// Data + state container for the Galaxy renderer — the WebGL counterpart of
// BrainGraphView. Owns view mode, FX toggles, and focus depth (the display
// panel), plus ember focus, search-as-highlight, and the time-scrubber glow.
export function BrainGalaxyView({
  userId,
  selectedIds,
  onSelectionChange,
  filters,
  selfKey,
  highlightKeys,
}: BrainGalaxyViewProps) {
  const [focusId, setFocusId] = useState<string | null>(null);
  const [depth, setDepth] = useState(1);
  const [view, setView] = useState<BrainViewMode>("spatial");
  const [fx, setFx] = useState<RenderQuality>(DEFAULT_FX);
  const galaxyRef = useRef<GalaxyHandle>(null);

  const graph = useBrainGraph(userId, {
    max_nodes: filters.maxNodes,
    exclude_orphans: filters.excludeOrphans,
    link_types: filters.linkTypes.length > 0 ? filters.linkTypes.join(",") : undefined,
    semantic_min_weight: filters.semanticEdgeThreshold,
  });

  const model = useMemo(
    () =>
      buildRenderModel(graph.data, {
        colorPreset: filters.colorPreset,
        selfKey,
        semanticEdgeThreshold: filters.semanticEdgeThreshold,
      }),
    [graph.data, filters.colorPreset, filters.semanticEdgeThreshold, selfKey],
  );

  // key → render-node-id resolution (diff/scrubber emit keys; the engine keys
  // everything by node id).
  const keyIndex = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of graph.data?.nodes ?? []) {
      map.set(n.id, n.id);
      if (n.key) map.set(n.key, n.id);
    }
    return map;
  }, [graph.data]);

  const highlightIds = useMemo(
    () => highlightKeys.map((k) => keyIndex.get(k)).filter((x): x is string => Boolean(x)),
    [highlightKeys, keyIndex],
  );

  // node id → memory key (the detail endpoint is keyed by `key`).
  const keyByNodeId = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of graph.data?.nodes ?? []) {
      if (n.key) map.set(n.id, n.key);
    }
    return map;
  }, [graph.data]);
  const focusedKey = focusId ? keyByNodeId.get(focusId) ?? focusId : null;

  const searchIds = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return null;
    return model.nodes
      .filter((n) => n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q))
      .map((n) => n.id);
  }, [filters.search, model]);

  // Clear focus if the focused node is no longer in the graph (filter change,
  // data reload, or user switch).
  useEffect(() => {
    if (focusId && !model.nodes.some((n) => n.id === focusId)) {
      setFocusId(null);
    }
  }, [model, focusId]);

  const handleSelect = useCallback(
    (id: string, additive: boolean) => {
      if (additive) {
        onSelectionChange(
          selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id],
        );
        return;
      }
      setFocusId((prev) => (prev === id ? null : id));
    },
    [onSelectionChange, selectedIds],
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
      selectedIds,
      focusId,
      focusDepth: depth,
      highlightIds,
      searchIds,
      onSelect: handleSelect,
    }),
    [view, quality, selectedIds, focusId, depth, highlightIds, searchIds, handleSelect],
  );

  const toggleFx = useCallback((key: keyof RenderQuality) => {
    setFx((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <>
      <GalaxyRenderer ref={galaxyRef} model={model} options={options} className="zaki-brain-v2__galaxy" />
      <BrainDisplayPanel
        view={view}
        onViewChange={setView}
        fx={fx}
        onToggleFx={toggleFx}
        depth={depth}
        onDepthChange={setDepth}
        onFit={() => galaxyRef.current?.fit()}
        onRelayout={() => galaxyRef.current?.relayout()}
      />
      <BrainDetailPanel userId={userId} memoryKey={focusedKey} onClose={() => setFocusId(null)} />
    </>
  );
}

export default BrainGalaxyView;
