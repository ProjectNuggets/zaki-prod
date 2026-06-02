import { V2SegmentedControl } from "@/app/components/v2";
import type { BrainViewMode, RenderQuality } from "./engine/interface";

const FX_TOGGLES: ReadonlyArray<{ key: keyof RenderQuality; label: string }> = [
  { key: "labels", label: "Labels" },
  { key: "threads", label: "Edges" },
  { key: "bloom", label: "Bloom" },
  { key: "nebula", label: "Nebula" },
  { key: "motion", label: "Motion" },
];

export interface BrainDisplayPanelProps {
  view: BrainViewMode;
  onViewChange: (view: BrainViewMode) => void;
  fx: RenderQuality;
  onToggleFx: (key: keyof RenderQuality) => void;
  depth: number;
  onDepthChange: (depth: number) => void;
  onFit: () => void;
  onRelayout: () => void;
}

// In-canvas display panel (top-left overlay): view switch, FX toggles, focus
// depth, and canvas controls. The galaxy "look" (bloom/nebula) lives here as
// opt-in toggles; the default is the clean nodes+edges view.
export function BrainDisplayPanel({
  view,
  onViewChange,
  fx,
  onToggleFx,
  depth,
  onDepthChange,
  onFit,
  onRelayout,
}: BrainDisplayPanelProps) {
  return (
    <div className="zaki-galaxy-panel" data-testid="brain-display-panel">
      <div className="zaki-galaxy-panel__group">
        <span className="zaki-galaxy-panel__label">View</span>
        <V2SegmentedControl
          ariaLabel="Graph view mode"
          value={view}
          onChange={onViewChange}
          fullWidth
          options={[
            { id: "spatial", label: "Spatial" },
            { id: "tactical", label: "Tactical" },
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

      <div className="zaki-galaxy-panel__controls">
        <button type="button" className="v2-btn v2-btn--sm" onClick={onFit}>
          Fit
        </button>
        <button type="button" className="v2-btn v2-btn--sm" onClick={onRelayout}>
          Relayout
        </button>
      </div>
    </div>
  );
}

export default BrainDisplayPanel;
