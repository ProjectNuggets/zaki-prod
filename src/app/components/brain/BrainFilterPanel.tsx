// BrainFilterPanel — right sidebar of the V1.7 graph view.
//
// Mirrors Obsidian's settings layout: filters / display / forces / colors.
// Sliders mutate state held in BrainPage (passed as callbacks); the cytoscape
// instance reads the same state to recompute layout / styles.

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { BRAIN_LINK_TYPES } from "@/lib/api";
import type { ColorPreset } from "./brainColors";
import { LINK_TYPE_COLOR } from "./brainColors";

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
  linkThickness: number; // multiplier
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
  colorPreset: "mono",
  semanticEdgeThreshold: 0.85,
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
  /**
   * The Forces sliders drive the cytoscape (cose-bilkent) layout. The galaxy
   * renderer runs its own d3-force-3d sim and ignores them, so hide the section
   * on that path rather than show dead controls.
   */
  showForces?: boolean;
}

export function BrainFilterPanel({ filters, onChange, showForces = true }: Props) {
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
      <ScopeSection />

      <Section title={t("brain.filterPanel.filters", { defaultValue: "Filters" })}>
        <ToggleRow
          label={t("brain.filterPanel.excludeOrphans", { defaultValue: "Hide orphans" })}
          value={filters.excludeOrphans}
          onChange={(v) => set("excludeOrphans", v)}
        />
        <SliderRow
          label={t("brain.filterPanel.semanticThreshold", { defaultValue: "Similarity link cutoff" })}
          min={0.7}
          max={1}
          step={0.05}
          value={filters.semanticEdgeThreshold}
          onChange={(v) => set("semanticEdgeThreshold", v)}
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

      <Section title={t("brain.filterPanel.colors", { defaultValue: "Colors" })}>
        <div className="flex flex-wrap gap-1">
          {(["mono", "community", "link_type", "kind"] as ColorPreset[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => set("colorPreset", p)}
              className={`flex-1 rounded-[2px] border px-2 py-1 text-xs capitalize ${
                filters.colorPreset === p
                  ? "border-zaki-brand bg-zaki-brand-10 text-white/85"
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

      {showForces && (
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
      )}
    </aside>
  );
}

// Brain V2 closeout (2026-05-30) — SCOPE block.
//
// The V2 mockup ("V2 Brain v2.html") opens the filters rail with a SCOPE
// section listing Personal Brain / Workspace / Learner / Session as
// toggleable rows. In this build the brain graph endpoint
// (/api/agent/brain/graph) is PERSONAL-scoped only — there is no
// authenticated scope filter parameter, and Workspace / Learner / Hire
// memory are owned by separate product surfaces with their own data flow
// (AGENTS.md: "keep Agent, Learning, Hire, and Workspace memories
// separate"). Per the backend-truth rules we do NOT render fake scope
// toggles that imply a unified graph. Instead this is an honest scope
// indicator: Personal Brain is what this surface shows; the other scopes
// are named as separate, with governance routed to route-level Settings.
const SEPARATE_SCOPES = [
  { id: "workspace", key: "brain.scope.workspace", label: "Workspace" },
  { id: "learner", key: "brain.scope.learner", label: "Learner" },
  { id: "hire", key: "brain.scope.hire", label: "Hire" },
] as const;

function ScopeSection() {
  const { t } = useTranslation();
  return (
    <div data-testid="brain-scope-section">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-white/55">
        {t("brain.scope.title", { defaultValue: "Scope" })}
      </h3>
      <div className="space-y-1.5">
        <div
          className="flex items-center gap-2 rounded-[2px] border border-zaki-brand/40 bg-zaki-brand-10 px-2.5 py-1.5"
          data-testid="brain-scope-active"
        >
          <span className="size-2 shrink-0 rounded-[1px] bg-zaki-brand" aria-hidden="true" />
          <span className="flex-1 text-sm text-white/85">
            {t("brain.scope.personal", { defaultValue: "Personal brain" })}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-zaki-brand">
            {t("brain.scope.shownHere", { defaultValue: "Shown here" })}
          </span>
        </div>
        {SEPARATE_SCOPES.map((scope) => (
          <div
            key={scope.id}
            className="flex items-center gap-2 px-2.5 py-1 opacity-60"
            data-testid={`brain-scope-separate-${scope.id}`}
          >
            <span className="size-2 shrink-0 rounded-[1px] border border-white/30" aria-hidden="true" />
            <span className="flex-1 text-xs text-white/55">
              {t(scope.key, { defaultValue: scope.label })}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-white/35">
              {t("brain.scope.separate", { defaultValue: "Separate" })}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-white/45">
        {t("brain.scope.note", {
          defaultValue:
            "Workspace, Learner, and Hire memory are kept separate and live in their own surfaces.",
        })}
      </p>
      <Link
        to="/settings#settings-memory-data"
        className="mt-2 inline-flex items-center gap-1 text-xs text-white/60 underline-offset-2 transition hover:text-white hover:underline"
        data-testid="brain-scope-settings-link"
      >
        {t("brain.scope.manageLink", { defaultValue: "Memory scopes & privacy" })}
        <ArrowUpRight className="size-3" aria-hidden="true" />
      </Link>
    </div>
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
        className="w-full accent-zaki-brand"
      />
    </div>
  );
}
