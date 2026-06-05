// BrainFilterPanel — right sidebar of the V1.7 graph view.
//
// Mirrors Obsidian's settings layout: filters / display / forces / colors.
// Sliders mutate state held in BrainPage (passed as callbacks); the cytoscape
// instance reads the same state to recompute layout / styles.

import { useTranslation } from "react-i18next";
import { BRAIN_LINK_TYPES } from "@/lib/api";
import type { ColorPreset } from "./brainColors";
import { LINK_TYPE_COLOR } from "./brainColors";

// "Color by" dimensions surfaced in the rail (link_type colors edges, not nodes,
// so it isn't offered here). Theme leads — it's the default and most legible.
const COLOR_BY_OPTIONS: ReadonlyArray<{ id: ColorPreset; label: string }> = [
  { id: "community", label: "Theme" },
  { id: "kind", label: "Kind" },
  { id: "recency", label: "Recency" },
  { id: "status", label: "Status" },
  { id: "mono", label: "Mono" },
];

export interface BrainFilters {
  excludeOrphans: boolean;
  linkTypes: string[]; // empty = all
  search: string;
  maxNodes: number;
  colorPreset: ColorPreset;
  // Audit (2026-05-07) — semantic-similarity edges flood the graph.
  // 99% of edges in the test corpus were type "semantic" (vector
  // similarity above ~0.72 cosine), drowning the typed/session edges
  // that carry actual meaning. A binary on/off toggle was the wrong
  // tool — semantic edges aren't pure noise, they just need a
  // tighter threshold than the agent uses for storage. The server's
  // semantic graph floor is 0.70, so the slider starts there: 0.70 shows
  // all semantic links the gateway is willing to emit, 1.0 shows almost
  // none, and default 0.85 keeps the strongest cross-conversation links.
  semanticEdgeThreshold: number;
  // forces
  nodeRepulsion: number; // cose-bilkent
  idealEdgeLength: number;
  gravity: number;
  edgeElasticity: number;
  // display
  textFadeThreshold: number; // 0..1 zoom
  nodeSizeScale: number; // multiplier
}

export const DEFAULT_FILTERS: BrainFilters = {
  excludeOrphans: true,
  linkTypes: [],
  search: "",
  // P8 uncap — show the whole personal brain by default (the old 50 showed ~1%
  // of a 4.6k-node corpus). WebGL handles thousands of instanced nodes; LOD +
  // the backend safety cap (≤8000) govern the ceiling.
  maxNodes: 2000,
  // Audit (2026-05-07) — flipped default from "mono" to "kind". Mono is
  // Obsidian-style visual restraint, but Obsidian users have manually
  // organized vaults; ZAKI users haven't organized anything. Color by
  // kind gives them organization for free — facts about you (red),
  // recent activity (teal), conversation excerpts (warm neutral). The
  // mono preset is still available as a deliberate aesthetic choice.
  // Default to Theme (LLM clusters) so the graph opens as labeled, colored
  // regions — the #1 "perceive your data" lever (was mono → no color meaning).
  colorPreset: "community",
  semanticEdgeThreshold: 0.85,
  // Forces — galaxy-native d3-force-3d values (see DEFAULT_FORCES). repel =
  // |charge|, gravity = center strength, idealEdgeLength = link distance,
  // edgeElasticity = link spring. These reproduce the prior baseline look.
  nodeRepulsion: 140,
  idealEdgeLength: 120,
  gravity: 0.04,
  edgeElasticity: 0.4,
  textFadeThreshold: 0.6,
  nodeSizeScale: 1,
};

// Turn the raw 0.70–1.00 semantic cutoff into a word. The number is meaningless
// to a user ("0.85"?); the word says what they'll see. Higher cutoff = stricter
// = fewer, stronger links.
export function formatConnectionStrength(v: number): string {
  if (v >= 0.98) return "Strongest only";
  if (v >= 0.9) return "Strong";
  if (v >= 0.82) return "Balanced";
  if (v >= 0.75) return "Loose";
  return "Show all";
}

interface Props {
  filters: BrainFilters;
  onChange: (next: BrainFilters) => void;
}

export function BrainFilterPanel({ filters, onChange }: Props) {
  const { t } = useTranslation();
  const set = <K extends keyof BrainFilters>(key: K, value: BrainFilters[K]) =>
    onChange({ ...filters, [key]: value });

  const toggleLinkType = (lt: string) => {
    const next = filters.linkTypes.includes(lt)
      ? filters.linkTypes.filter((x) => x !== lt)
      : [...filters.linkTypes, lt];
    set("linkTypes", next);
  };

  return (
    <aside
      // V1.11 hotfix (2026-05-07) — bg switched from zaki-raised/60
      // (60% opacity → translucent over dark canvas, hard to read per
      // Nova's "lists are not really visible when opened" feedback)
      // to solid #181818 matching Obsidian's filter panel from frame 45
      // of Nova's video. Solid dark panel reads cleanly against the
      // #0a0a0a canvas; the graph is still visible behind everywhere
      // the panel doesn't cover.
      className="flex w-72 shrink-0 flex-col gap-5 overflow-y-auto rounded-[2px] border border-white/10 bg-[#181818] p-4 text-sm text-white/85"
      data-testid="brain-filter-panel"
    >

      <Section title={t("brain.filterPanel.filters", { defaultValue: "Filters" })}>
        <ToggleRow
          label={t("brain.filterPanel.excludeOrphans", { defaultValue: "Hide orphans" })}
          value={filters.excludeOrphans}
          onChange={(v) => set("excludeOrphans", v)}
        />
        <SliderRow
          label={t("brain.filterPanel.semanticThreshold", { defaultValue: "Connection strength" })}
          min={0.7}
          max={1}
          step={0.05}
          value={filters.semanticEdgeThreshold}
          onChange={(v) => set("semanticEdgeThreshold", v)}
          formatValue={formatConnectionStrength}
          hint={t("brain.filterPanel.semanticThresholdHint", {
            defaultValue: "Lines link memories that look alike. Higher = only the strongest links.",
          })}
        />
        <NumberRow
          label={t("brain.filterPanel.maxNodes", { defaultValue: "Max nodes" })}
          min={50}
          max={8000}
          step={250}
          value={filters.maxNodes}
          onChange={(v) => set("maxNodes", v)}
        />
      </Section>

      <Section title={t("brain.filterPanel.linkTypes", { defaultValue: "Link types" })}>
        <div className="flex flex-wrap gap-1.5">
          {BRAIN_LINK_TYPES.map((lt) => {
            const active = filters.linkTypes.includes(lt);
            const color = LINK_TYPE_COLOR[lt];
            return (
              <button
                key={lt}
                type="button"
                onClick={() => toggleLinkType(lt)}
                className={`flex items-center gap-1.5 rounded-[2px] border px-2 py-0.5 text-xs transition ${
                  active
                    ? "border-white/85 bg-white/10 text-white/85"
                    : "border-white/10 text-white/55 hover:border-white/40"
                }`}
                data-testid={`brain-link-type-pill-${lt}`}
              >
                <span
                  className="size-2 rounded-[1px]"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                {lt}
              </button>
            );
          })}
        </div>
        {filters.linkTypes.length > 0 && (
          <button
            type="button"
            onClick={() => set("linkTypes", [])}
            className="mt-2 text-xs text-white/55 underline-offset-2 hover:underline"
          >
            {t("brain.filterPanel.clearLinkTypes", { defaultValue: "Clear" })}
          </button>
        )}
      </Section>

      <Section title={t("brain.filterPanel.colorBy", { defaultValue: "Color by" })}>
        <div className="flex flex-wrap gap-1">
          {COLOR_BY_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => set("colorPreset", id)}
              className={`flex-1 rounded-[2px] border px-2 py-1 text-xs ${
                filters.colorPreset === id
                  ? "border-zaki-brand bg-zaki-brand-10 text-white/85"
                  : "border-white/10 text-white/55 hover:border-white/40"
              }`}
              data-testid={`brain-color-preset-${id}`}
            >
              {t(`brain.filterPanel.colorBy.${id}`, { defaultValue: label })}
            </button>
          ))}
        </div>
      </Section>

      {/* Display — node size + text fade are wired live into the galaxy engine.
          (Link thickness was dropped: WebGL basic lines ignore width — it would
          need fat-line geometry.) */}
      <Section title={t("brain.filterPanel.display", { defaultValue: "Display" })}>
        <SliderRow
          label={t("brain.filterPanel.nodeSize", { defaultValue: "Node size" })}
          min={0.5}
          max={2}
          step={0.1}
          value={filters.nodeSizeScale}
          onChange={(v) => set("nodeSizeScale", v)}
        />
        <SliderRow
          label={t("brain.filterPanel.textFade", { defaultValue: "Text fade" })}
          min={0.2}
          max={1.5}
          step={0.05}
          value={filters.textFadeThreshold}
          onChange={(v) => set("textFadeThreshold", v)}
        />
      </Section>

      {/* Forces — live d3-force-3d tuning (ranges calibrated to the Obsidian
          reference). Changes re-settle from the current layout without a rebuild
          or camera reset. */}
      <Section title={t("brain.filterPanel.forces", { defaultValue: "Forces" })}>
        <SliderRow
          label={t("brain.filterPanel.repel", { defaultValue: "Repel force" })}
          min={20}
          max={500}
          step={10}
          value={filters.nodeRepulsion}
          onChange={(v) => set("nodeRepulsion", v)}
        />
        <SliderRow
          label={t("brain.filterPanel.linkDistance", { defaultValue: "Link distance" })}
          min={40}
          max={300}
          step={10}
          value={filters.idealEdgeLength}
          onChange={(v) => set("idealEdgeLength", v)}
        />
        <SliderRow
          label={t("brain.filterPanel.linkForce", { defaultValue: "Link force" })}
          min={0.02}
          max={1.2}
          step={0.02}
          value={filters.edgeElasticity}
          onChange={(v) => set("edgeElasticity", v)}
        />
        <SliderRow
          label={t("brain.filterPanel.center", { defaultValue: "Center force" })}
          min={0}
          max={0.3}
          step={0.01}
          value={filters.gravity}
          onChange={(v) => set("gravity", v)}
        />
      </Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-white/55">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
      <span className="text-white/85">{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-zaki-brand"
      />
    </label>
  );
}

function NumberRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="text-white/85">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 rounded-zaki-md border border-white/10 bg-[#1f1f1f] px-2 py-0.5 text-sm text-white/85 focus:border-zaki-brand focus:outline-none"
      />
    </label>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  /** Render the value as a word instead of the raw number (e.g. "Balanced"). */
  formatValue?: (v: number) => string;
  /** One-line plain-English explanation under the slider. */
  hint?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-white/85">{label}</span>
        <span className="text-white/55">{formatValue ? formatValue(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-zaki-brand"
      />
      {hint ? <p className="mt-1 text-[11px] leading-snug text-white/40">{hint}</p> : null}
    </div>
  );
}
