import { useCallback, useMemo } from "react";
import { useBrainGraph } from "@/queries";
import type { BrainFilters } from "../BrainFilterPanel";
import { buildRenderModel } from "./model";
import { GalaxyRenderer } from "./GalaxyRenderer";
import { DEFAULT_RENDER_QUALITY, type GraphRendererOptions } from "./engine/interface";

export interface BrainGalaxyViewProps {
  userId: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  filters: BrainFilters;
  selfKey: string | null;
}

// Data + state container for the Galaxy renderer — the WebGL counterpart of
// BrainGraphView. Fetches the same graph (shared React Query cache), builds the
// engine render model, and owns the renderer options. Focus/local-graph, time
// highlighting, and community filtering arrive in P3.
export function BrainGalaxyView({
  userId,
  selectedIds,
  onSelectionChange,
  filters,
  selfKey,
}: BrainGalaxyViewProps) {
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

  const handleSelect = useCallback(
    (id: string, additive: boolean) => {
      if (!additive) {
        onSelectionChange([id]);
        return;
      }
      onSelectionChange(
        selectedIds.includes(id)
          ? selectedIds.filter((x) => x !== id)
          : [...selectedIds, id],
      );
    },
    [onSelectionChange, selectedIds],
  );

  const options = useMemo<GraphRendererOptions>(
    () => ({
      view: "spatial",
      quality: DEFAULT_RENDER_QUALITY,
      selectedIds,
      focusId: null,
      onSelect: handleSelect,
    }),
    [selectedIds, handleSelect],
  );

  return <GalaxyRenderer model={model} options={options} className="zaki-brain-v2__galaxy" />;
}

export default BrainGalaxyView;
