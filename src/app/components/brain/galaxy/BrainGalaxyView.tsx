import { useCallback, useEffect, useMemo, useState } from "react";
import { useBrainGraph } from "@/queries";
import type { BrainFilters } from "../BrainFilterPanel";
import { buildRenderModel } from "./model";
import { GalaxyRenderer } from "./GalaxyRenderer";
import { prefersReducedMotion, resolveQuality } from "./engine/lod";
import { type GraphRendererOptions } from "./engine/interface";

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
// BrainGraphView. Fetches the same graph (shared React Query cache), builds the
// engine render model, and owns renderer options: ember focus (click), seed-and-
// expand depth, search-as-highlight (from the filter search box), and the time-
// scrubber glow.
export function BrainGalaxyView({
  userId,
  selectedIds,
  onSelectionChange,
  filters,
  selfKey,
  highlightKeys,
}: BrainGalaxyViewProps) {
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focusDepth] = useState(1); // depth slider arrives with the display panel (P4)

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

  const searchIds = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return null;
    return model.nodes
      .filter((n) => n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q))
      .map((n) => n.id);
  }, [filters.search, model]);

  // Clear focus if the focused node is no longer in the graph (filter change,
  // data reload, or user switch) — otherwise the ember would dim everything
  // around a node that no longer exists.
  useEffect(() => {
    if (focusId && !model.nodes.some((n) => n.id === focusId)) {
      setFocusId(null);
    }
  }, [model, focusId]);

  const handleSelect = useCallback(
    (id: string, additive: boolean) => {
      if (additive) {
        // shift-click → toggle compose selection
        onSelectionChange(
          selectedIds.includes(id)
            ? selectedIds.filter((x) => x !== id)
            : [...selectedIds, id],
        );
        return;
      }
      // click → toggle ember focus
      setFocusId((prev) => (prev === id ? null : id));
    },
    [onSelectionChange, selectedIds],
  );

  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const quality = useMemo(
    () => resolveQuality(model.nodes.length, reducedMotion),
    [model.nodes.length, reducedMotion],
  );

  const options = useMemo<GraphRendererOptions>(
    () => ({
      view: "spatial",
      quality,
      selectedIds,
      focusId,
      focusDepth,
      highlightIds,
      searchIds,
      onSelect: handleSelect,
    }),
    [quality, selectedIds, focusId, focusDepth, highlightIds, searchIds, handleSelect],
  );

  return <GalaxyRenderer model={model} options={options} className="zaki-brain-v2__galaxy" />;
}

export default BrainGalaxyView;
