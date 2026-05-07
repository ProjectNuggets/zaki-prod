// BrainFilterPanel — right sidebar of the V1.7 graph view.
//
// Mirrors Obsidian's settings layout: filters / display / forces / colors.
// Sliders mutate state held in BrainPage (passed as callbacks); the cytoscape
// instance reads the same state to recompute layout / styles.

import { useTranslation } from "react-i18next";
import { BRAIN_LINK_TYPES } from "@/lib/api";
import type { ColorPreset } from "./brainColors";
import { LINK_TYPE_COLOR } from "./brainColors";

export interface BrainFilters {
  excludeOrphans: boolean;
  linkTypes: string[]; // empty = all
  search: string;
  maxNodes: number;
  colorPreset: ColorPreset;
  // forces
  nodeRepulsion: number; // cose-bilkent
  idealEdgeLength: number;
  gravity: number;
  edgeElasticity: number;
  // display
  textFadeThreshold: number; // 0..1 zoom
  nodeSizeScale: number; // multiplier
  linkThickness: number; // multiplier
}

export const DEFAULT_FILTERS: BrainFilters = {
  excludeOrphans: true,
  linkTypes: [],
  search: "",
  maxNodes: 300,
  // V1.11 (2026-05-07): default flipped from "community" to "mono".
  // Obsidian-aesthetic visual restraint — every node renders muted gray;
  // border styles (selected, highlighted, center) carry emphasis. Users
  // who want the 12-color community palette can switch preset.
  colorPreset: "mono",
  nodeRepulsion: 8000,
  idealEdgeLength: 120,
  gravity: 0.4,
  edgeElasticity: 0.45,
  textFadeThreshold: 0.6,
  nodeSizeScale: 1,
  linkThickness: 1,
};

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
      className="flex w-72 shrink-0 flex-col gap-5 overflow-y-auto rounded-zaki-lg border border-white/10 bg-[#181818] p-4 text-sm text-white/85"
      data-testid="brain-filter-panel"
    >
      <Section title={t("brain.filterPanel.filters", { defaultValue: "Filters" })}>
        <ToggleRow
          label={t("brain.filterPanel.excludeOrphans", { defaultValue: "Hide orphans" })}
          value={filters.excludeOrphans}
          onChange={(v) => set("excludeOrphans", v)}
        />
        <NumberRow
          label={t("brain.filterPanel.maxNodes", { defaultValue: "Max nodes" })}
          min={50}
          max={1000}
          step={50}
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
                className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs transition ${
                  active
                    ? "border-white/85 bg-white/10 text-white/85"
                    : "border-white/10 text-white/55 hover:border-white/40"
                }`}
                data-testid={`brain-link-type-pill-${lt}`}
              >
                <span
                  className="size-2 rounded-full"
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

      <Section title={t("brain.filterPanel.colors", { defaultValue: "Colors" })}>
        <div className="flex flex-wrap gap-1">
          {(["mono", "community", "link_type", "kind"] as ColorPreset[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => set("colorPreset", p)}
              className={`flex-1 rounded-zaki-md border px-2 py-1 text-xs capitalize ${
                filters.colorPreset === p
                  ? "border-[#f10202] bg-[#f10202]/10 text-white/85"
                  : "border-white/10 text-white/55 hover:border-white/40"
              }`}
              data-testid={`brain-color-preset-${p}`}
            >
              {p === "link_type" ? "link type" : p}
            </button>
          ))}
        </div>
      </Section>

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
          label={t("brain.filterPanel.linkThickness", { defaultValue: "Link thickness" })}
          min={0.5}
          max={3}
          step={0.1}
          value={filters.linkThickness}
          onChange={(v) => set("linkThickness", v)}
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

      <Section title={t("brain.filterPanel.forces", { defaultValue: "Forces" })}>
        <SliderRow
          label={t("brain.filterPanel.repel", { defaultValue: "Repel force" })}
          min={1000}
          max={20000}
          step={500}
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
          label={t("brain.filterPanel.center", { defaultValue: "Center force" })}
          min={0}
          max={1.5}
          step={0.05}
          value={filters.gravity}
          onChange={(v) => set("gravity", v)}
        />
        <SliderRow
          label={t("brain.filterPanel.linkForce", { defaultValue: "Link force" })}
          min={0.05}
          max={1.5}
          step={0.05}
          value={filters.edgeElasticity}
          onChange={(v) => set("edgeElasticity", v)}
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
        className="size-4 accent-[#f10202]"
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
        className="w-20 rounded-zaki-md border border-white/10 bg-[#1f1f1f] px-2 py-0.5 text-sm text-white/85 focus:border-[#f10202] focus:outline-none"
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
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-white/85">{label}</span>
        <span className="text-white/55">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#f10202]"
      />
    </div>
  );
}
