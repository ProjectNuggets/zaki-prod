import { V2SegmentedControl } from "@/app/components/v2";
import type { GalaxyScope } from "./BrainGalaxyView";
import type { BrainViewMode, RenderQuality } from "./engine/interface";
import { brainDisplayText } from "../brainText";

// Only the two that carry real meaning. Bloom/nebula/motion were decorative
// gimmicks (and off by default) — removed. Labels + Edges are faithful toggles.
const FX_TOGGLES: ReadonlyArray<{ key: keyof RenderQuality; label: string }> = [
  { key: "labels", label: "Labels" },
  { key: "threads", label: "Edges" },
];

export interface BrainDisplayPanelProps {
  view: BrainViewMode;
  onViewChange: (view: BrainViewMode) => void;
  fx: RenderQuality;
  onToggleFx: (key: keyof RenderQuality) => void;
  depth: number;
  onDepthChange: (depth: number) => void;
  /** A node is focused — only then does Focus depth do anything, so it's hidden otherwise. */
  hasFocus: boolean;
  onFit: () => void;
  scope: GalaxyScope;
  onScopeChange: (scope: GalaxyScope) => void;
}

// Display panel (lives in the filters-rail): scope breadcrumb, view switch, FX
// toggles, focus depth, and canvas controls. The galaxy "look" (bloom/nebula)
// lives here as opt-in toggles; the default is the clean nodes+edges view.
export function BrainDisplayPanel({
  view,
  onViewChange,
  fx,
  onToggleFx,
  depth,
  onDepthChange,
  hasFocus,
  onFit,
  scope,
  onScopeChange,
}: BrainDisplayPanelProps) {
  return (
    <div className="zaki-galaxy-panel" data-testid="brain-display-panel">
      <ScopeBreadcrumb scope={scope} onScopeChange={onScopeChange} />

      <div className="zaki-galaxy-panel__group">
        <span className="zaki-galaxy-panel__label">View</span>
        <V2SegmentedControl
          ariaLabel="Graph view mode"
          value={view}
          onChange={onViewChange}
          fullWidth
          options={[
            { id: "spatial", label: "3D" },
            { id: "tactical", label: "Flat" },
          ]}
        />
      </div>

      <div className="zaki-galaxy-panel__group">
        <span className="zaki-galaxy-panel__label">Display</span>
        <div className="zaki-galaxy-panel__toggles">
          {FX_TOGGLES.map((toggle) => (
            <button
              key={toggle.key}
              type="button"
              className="zaki-galaxy-panel__toggle"
              aria-pressed={fx[toggle.key]}
              onClick={() => onToggleFx(toggle.key)}
            >
              {toggle.label}
            </button>
          ))}
        </div>
      </div>

      {hasFocus && (
        <div className="zaki-galaxy-panel__group">
          <label className="zaki-galaxy-panel__label" htmlFor="brain-focus-depth">
            Focus depth · {depth}
          </label>
          <input
            id="brain-focus-depth"
            className="zaki-galaxy-panel__range"
            type="range"
            min={1}
            max={5}
            step={1}
            value={depth}
            onChange={(event) => onDepthChange(Number(event.target.value))}
          />
        </div>
      )}

      <div className="zaki-galaxy-panel__controls">
        <button type="button" className="v2-btn v2-btn--sm" onClick={onFit}>
          Recenter view
        </button>
      </div>
    </div>
  );
}

// Where-am-I + escape hatches for the clusters-first scope. Overview offers
// "Explore everything" (the full galaxy); a cluster / everything shows a back
// affordance to the cluster overview.
function ScopeBreadcrumb({
  scope,
  onScopeChange,
}: {
  scope: GalaxyScope;
  onScopeChange: (scope: GalaxyScope) => void;
}) {
  if (scope.kind === "overview") {
    return (
      <div className="zaki-galaxy-panel__scope">
        <span className="zaki-galaxy-panel__scope-title">Clusters</span>
        <span className="zaki-galaxy-panel__scope-hint">Tap a cluster to open it</span>
        <button
          type="button"
          className="zaki-galaxy-panel__scope-link"
          onClick={() => onScopeChange({ kind: "all" })}
        >
          Explore everything →
        </button>
      </div>
    );
  }

  const here = scope.kind === "cluster" ? brainDisplayText(scope.name, "Theme") : "Everything";
  return (
    <div className="zaki-galaxy-panel__scope">
      <button
        type="button"
        className="zaki-galaxy-panel__scope-back"
        onClick={() => onScopeChange({ kind: "overview" })}
      >
        ← All clusters
      </button>
      <span className="zaki-galaxy-panel__scope-title" title={here}>
        {here}
      </span>
    </div>
  );
}

export default BrainDisplayPanel;
