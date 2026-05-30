import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Boxes, CircleDot, Shield, SlidersHorizontal, X } from "lucide-react";
import { useAuthStore } from "@/stores";
import { useBrainGraph, useBrainMe } from "@/queries";
import { SkeletonBrainPage } from "@/app/components/ui/skeleton";
import { BrainEmptyState } from "./BrainEmptyState";
import { BrainSemanticDegradedBanner } from "./BrainSemanticDegradedBanner";
import { BrainGraphView } from "./BrainGraphView";
import { BrainTimelineView } from "./BrainTimelineView";
import { BrainComposeModal } from "./BrainComposeModal";
import { BrainFilterPanel, DEFAULT_FILTERS, type BrainFilters } from "./BrainFilterPanel";
import { BrainOrphanRail } from "./BrainOrphanRail";
import { BrainCommunityLegend } from "./BrainCommunityLegend";
import { BrainTimeScrubber } from "./BrainTimeScrubber";
import { BrainInsightsStrip } from "./BrainInsightsStrip";
import { KIND_COLOR, KIND_LABEL } from "./brainColors";
import { V2Badge, V2StatusStrip, V2Tabs } from "@/app/components/v2";
import type { BrainGraphNode } from "@/lib/api";

type BrainTab = "timeline" | "graph";

// V1.11 (2026-05-07) — Brain page UX rework. Pre-V1.11 the graph tab
// rendered three always-visible columns (filter panel, canvas, side
// rails), eating ~576px of horizontal chrome before the canvas got any
// room. Obsidian's actual Graph View pattern is a full-bleed canvas
// with chrome that surfaces on demand: a small icon button cluster
// in the top-right toggles overlay panels for filters / clusters /
// orphans. Only one panel at a time; click the same icon to close.
// This `activePanel` state is the single-source-of-truth for that
// floating-overlay shape.
type ActivePanel = "filters" | "clusters" | "orphans" | null;

// Debounce search input -> server-side ?search= filter to avoid hammering the
// backend on every keystroke.
const SEARCH_DEBOUNCE_MS = 250;

export function BrainPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const userId = String(user?.id ?? "");
  const [searchParams, setSearchParams] = useSearchParams();

  // Audit (2026-05-07) — URL is the single source of truth for shareable
  // brain page state. Lazy initializers seed React state from the current
  // URL on mount so a refresh / shared link / browser back lands on the
  // same view. State changes write back to the URL via setSearchParams
  // with replace:true so we don't pollute history.
  const initialTab: BrainTab =
    searchParams.get("tab") === "graph" ? "graph" : "timeline";
  const initialPanel: ActivePanel = (() => {
    const p = searchParams.get("panel");
    return p === "filters" || p === "clusters" || p === "orphans" ? p : null;
  })();
  const initialCenter = searchParams.get("center");
  const initialQ = searchParams.get("q") ?? "";
  const initialCommunity = (() => {
    const v = searchParams.get("community");
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  })();

  const [tab, setTab] = useState<BrainTab>(initialTab);
  const [degradedDismissed, setDegradedDismissed] = useState(false);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  // V1.11 (2026-05-07) — explicit compose-modal toggle. Pre-V1.11 the modal
  // auto-opened the moment a user shift-click-selected a 2nd node, which
  // was startling (the brain audit flagged it). Now the modal opens only
  // on explicit user action via the floating "Compose from N" button below.
  const [composeOpen, setComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialQ);
  const [debouncedSearch, setDebouncedSearch] = useState(initialQ);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // V1.7 graph state
  const [filters, setFilters] = useState<BrainFilters>(DEFAULT_FILTERS);
  const [centerKey, setCenterKey] = useState<string | null>(initialCenter);
  const [highlightKeys, setHighlightKeys] = useState<string[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<number | null>(initialCommunity);
  // V1.11 — floating-overlay panel toggle (Obsidian Graph View pattern).
  // null = canvas-only (default); set by clicking a corner icon.
  const [activePanel, setActivePanel] = useState<ActivePanel>(initialPanel);

  // Debounce search input into filters.search
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchQuery]);

  // State -> URL sync. Writes only on graph tab to avoid noisy URLs while
  // browsing the timeline. replace:true keeps the back button useful.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (tab === "graph") next.set("tab", "graph"); else next.delete("tab");
    if (debouncedSearch) next.set("q", debouncedSearch); else next.delete("q");
    if (activePanel) next.set("panel", activePanel); else next.delete("panel");
    if (centerKey) next.set("center", centerKey); else next.delete("center");
    if (selectedCommunityId != null) next.set("community", String(selectedCommunityId));
    else next.delete("community");
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, debouncedSearch, activePanel, centerKey, selectedCommunityId]);

  // Keyboard shortcuts on the graph tab. Linear/Obsidian-grade affordance:
  // f/c/o toggle the panel cluster, Esc collapses the active panel or
  // exits local-graph mode, "/" focuses the search input. Skipped while
  // any input/textarea has focus so typing the letters works normally.
  useEffect(() => {
    if (tab !== "graph") return;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const inEditable =
        !!target?.closest?.("input, textarea, [contenteditable='true']");
      if (event.key === "Escape") {
        if (activePanel) {
          event.preventDefault();
          setActivePanel(null);
        } else if (centerKey) {
          event.preventDefault();
          setCenterKey(null);
        }
        return;
      }
      if (inEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "f") {
        event.preventDefault();
        setActivePanel((p) => (p === "filters" ? null : "filters"));
      } else if (event.key === "c") {
        event.preventDefault();
        setActivePanel((p) => (p === "clusters" ? null : "clusters"));
      } else if (event.key === "o") {
        event.preventDefault();
        setActivePanel((p) => (p === "orphans" ? null : "orphans"));
      } else if (event.key === "/") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tab, activePanel, centerKey]);

  const effectiveFilters = useMemo<BrainFilters>(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );

  const navigate = useNavigate();
  // Initial probe to detect empty corpus + degraded state. Uses the same
  // filter args the graph view will use so the cache is warm.
  const initialGraphQuery = useBrainGraph(userId, {
    max_nodes: effectiveFilters.maxNodes,
    exclude_orphans: effectiveFilters.excludeOrphans,
    semantic_min_weight: effectiveFilters.semanticEdgeThreshold,
  });

  // Audit (2026-05-08) — canonical "you" anchor from /brain/me. Used
  // to mark the self node visually in the graph (.self class). Auto-
  // anchoring focus-mode on the self node is deferred until backend
  // wires identity-to-activity edges (today self is graph-orphan in
  // the test corpus); for now it's a visible self-marker only.
  const meQuery = useBrainMe(userId);
  const selfKey = meQuery.data?.key ?? null;

  const selectedNodes = useMemo(
    () =>
      (initialGraphQuery.data?.nodes ?? []).filter((n) =>
        selectedNodeIds.includes(n.id),
      ),
    [initialGraphQuery.data?.nodes, selectedNodeIds],
  );

  if (!userId || initialGraphQuery.isLoading) return <SkeletonBrainPage />;

  if (initialGraphQuery.isError) {
    return (
      <div className="px-6 py-16 text-center text-sm text-zaki-muted">
        {t("brain.error.loadFailed")}
      </div>
    );
  }

  const totalNodes = initialGraphQuery.data?.total_nodes_in_corpus ?? 0;
  const semanticDegraded = initialGraphQuery.data?.semantic_degraded ?? false;

  if (totalNodes === 0) {
    return <BrainEmptyState onMigrate={() => navigate("/")} />;
  }

  const handlePickKey = (key: string) => {
    setCenterKey(key);
    setSelectedCommunityId(null);
  };

  return (
    /*
      V1.11 (2026-05-07) — Scroll fix. Pre-V1.11 the outer wrapper was
      `<div className="py-8">` with no height/overflow context, so the
      page clipped at the AppShell viewport boundary and inner content
      (large graph canvas, long timeline list) couldn't scroll. Now:
       - `flex flex-col h-full min-h-0`: claim full parent height,
         allow shrink so child scroll containers compute correctly
       - `overflow-y-auto`: scroll vertically when content exceeds
       - existing `py-8` preserved for vertical breathing room
      Same pattern Obsidian-class panels use: outer flex column with
      explicit min-h-0 to defeat default flex-min-content sizing.
    */
    <div className="zaki-brain-v2">
      <V2StatusStrip
        aria-label={t("brain.status.ariaLabel", { defaultValue: "Brain status" })}
        items={[
          {
            id: "scope",
            label: t("brain.status.scope", { defaultValue: "Scope" }),
            value: t("brain.status.userScoped", { defaultValue: "Personal brain" }),
          },
          {
            id: "nodes",
            label: t("brain.status.memories", { defaultValue: "Memories" }),
            value: totalNodes.toLocaleString(),
            tone: "accent",
          },
          {
            id: "view",
            label: t("brain.status.view", { defaultValue: "View" }),
            value: tab,
          },
          {
            id: "health",
            label: semanticDegraded
              ? t("brain.status.semanticDegraded", { defaultValue: "Semantic degraded" })
              : t("brain.status.semanticReady", { defaultValue: "Semantic ready" }),
            tone: semanticDegraded ? "warn" : "success",
          },
        ]}
      />
      <div className="zaki-brain-v2__wrap">
        <header className="zaki-brain-v2__hero">
          <div>
            <p>{t("brain.status.userScoped", { defaultValue: "Personal brain" })}</p>
            <h1>{t("brain.title")}</h1>
          </div>
          <div className="zaki-brain-v2__hero-meta">
            <span>{t("brain.subtitle")}</span>
            {/*
              ZAKI Brain V2 closeout (2026-05-30) — account-level memory
              governance is owned by route-level Settings (AGENTS.md §4:
              Memory & Brain control plane). This surface stays read-only +
              compose-additive; forget / PII purge / export live in Settings
              so they are not duplicated inside the product workbench. The
              deep-link keeps the brain page "Settings-link ready".
            */}
            <Link
              to="/settings#settings-memory-data"
              className="zaki-brain-v2__governance-link"
              data-testid="brain-manage-memory-link"
            >
              <Shield className="size-3.5" aria-hidden="true" />
              {t("brain.governance.manageLink", {
                defaultValue: "Memory & privacy in Settings",
              })}
            </Link>
          </div>
        </header>

        {semanticDegraded && !degradedDismissed && (
          <div className="zaki-brain-v2__banner">
            <BrainSemanticDegradedBanner onDismiss={() => setDegradedDismissed(true)} />
          </div>
        )}

        <BrainInsightsStrip userId={userId} />

        <V2Tabs
          ariaLabel={t("brain.tabs.ariaLabel", { defaultValue: "Brain views" })}
          value={tab}
          onChange={setTab}
          fullWidth
          options={[
            { id: "timeline", label: t("brain.tabs.timeline") },
            { id: "graph", label: t("brain.tabs.graph"), count: initialGraphQuery.data?.nodes?.length ?? 0 },
          ]}
        />
      </div>

      {tab === "timeline" ? (
        <div className="zaki-brain-v2__timeline" data-testid="brain-timeline-slot">
          <BrainTimelineView userId={userId} />
        </div>
      ) : (
        /*
          V1.11 (2026-05-07) — Graph row goes wide. Pre-V1.11 the graph
          slot was constrained by `mx-auto max-w-7xl` (1280px), which
          squeezed the canvas between the filter panel (288px) and the
          right rails (288px), leaving only ~700px for the graph itself
          even on wide displays. The graph is the centerpiece of the
          brain page; it deserves the spotlight. Now: max-w-screen-2xl
          (1536px) gives substantially more horizontal room while still
          preventing the layout from spreading uncomfortably wide on
          ultra-wide monitors. Header + tabs above remain max-w-7xl —
          they don't need the extra width.
        */
        <div data-testid="brain-graph-slot" className="zaki-brain-v2__graph-shell">
          <aside className="zaki-brain-v2__filters-rail" aria-label={t("brain.panel.filters", { defaultValue: "Filters" })}>
            <BrainFilterPanel filters={filters} onChange={setFilters} />
          </aside>
          <section className="zaki-brain-v2__graph-main">
          {/* Search bar — debounced into ?search= */}
          <div className="zaki-brain-v2__search">
            <div>
              <svg
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zaki-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                />
              </svg>
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("brain.graph.search.placeholder")}
                aria-label={t("brain.graph.search.placeholder")}
                className="v2-input pl-8 pr-8"
                data-testid="brain-search-input"
              />
              {!searchQuery && (
                <kbd
                  className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center rounded border border-zaki-border bg-zaki-raised px-1.5 py-0.5 font-mono-ui text-[10px] font-semibold text-zaki-muted sm:inline-flex"
                  aria-hidden="true"
                >
                  /
                </kbd>
              )}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  aria-label={t("brain.graph.search.clear")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-zaki-muted hover:text-zaki-text"
                >
                  <svg
                    className="size-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/*
            V1.11 (2026-05-07) — Counter strip. Replaces the implicit
            "Trimmed: NN nodes hidden" message in BrainGraphView with
            an honest, scannable summary of what's on screen vs. what
            ZAKI has remembered total. Pillar 1 visible-memory beat:
            users SEE the brain accreting over time.
          */}
          {/*
            Audit (2026-05-07) — counter strip + kind legend. Counter
            stays as the Pillar-1 accretion beat ("Showing N of M
            memories"). Legend chips translate the internal node-kind
            vocabulary (core / daily / conversation) into life
            categories the user can read at a glance ("About you",
            "Daily life", "Conversations"). Each chip shows the
            color it paints in the canvas, so users connect color to
            meaning without opening the filter panel. Counts come from
            the visible node set; chips with zero nodes hide.
          */}
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3 px-1 text-xs text-zaki-muted">
            <div>
              {t("brain.counterStrip.showing", {
                defaultValue: "Showing {{visible}} of {{total}} memories",
                visible: initialGraphQuery.data?.nodes?.length ?? 0,
                total: totalNodes,
              })}
              {(() => {
                const allEdges = initialGraphQuery.data?.edges ?? [];
                const threshold = filters.semanticEdgeThreshold;
                const visibleEdgeCount = allEdges.filter((e) => {
                  if (e.type !== "semantic") return true;
                  const w = (e as { weight?: number }).weight;
                  return typeof w === "number" && w >= threshold;
                }).length;
                if (visibleEdgeCount === 0) return null;
                return (
                  <>
                    {" · "}
                    {t("brain.counterStrip.edges", {
                      defaultValue: "{{count}} edges",
                      count: visibleEdgeCount,
                    })}
                  </>
                );
              })()}
            </div>
            {filters.colorPreset === "kind" ? (
              <KindLegend nodes={initialGraphQuery.data?.nodes ?? []} />
            ) : null}
          </div>

          {/* Time scrubber row */}
          <div className="mb-3">
            <BrainTimeScrubber
              userId={userId}
              onHighlightKeys={setHighlightKeys}
              onPick={handlePickKey}
            />
          </div>

          {/*
            V1.11 (2026-05-07) — Full-bleed canvas with floating overlay
            panels. Obsidian Graph View pattern: the canvas dominates the
            viewport; chrome surfaces on demand via corner icon buttons.
            Only one overlay open at a time (single-source `activePanel`
            state), click the same icon to close. The panels themselves
            (BrainFilterPanel, BrainCommunityLegend, BrainOrphanRail)
            are unchanged — they're just positioned absolutely inside the
            canvas instead of taking always-visible columns.

            Layout:
              - Canvas:    flex-1 height, true-black bg, rounded frame
              - Top-right: vertical icon bar (filters / clusters / orphans)
              - Overlays:  absolute, slide in from right when active,
                           dismissable via X or by re-clicking the icon

            Pre-V1.11 the 3-column flex (filter | canvas | rails) ate
            ~576px of horizontal chrome before the graph got any room.
            Now the graph claims the whole viewport.
          */}
          <div className="zaki-brain-v2__canvas-frame">
            <BrainGraphView
              userId={userId}
              selectedIds={selectedNodeIds}
              onSelectionChange={setSelectedNodeIds}
              filters={effectiveFilters}
              highlightKeys={highlightKeys}
              selectedCommunityId={selectedCommunityId}
              centerKey={centerKey}
              onCenterKeyChange={setCenterKey}
              selfKey={selfKey}
            />

            {/* Top-right floating control cluster */}
            <div className="zaki-brain-v2__canvas-controls">
              <span className="zaki-brain-v2__filters-toggle">
                <PanelToggle
                  icon={SlidersHorizontal}
                  label={t("brain.panel.filters", { defaultValue: "Filters" })}
                  shortcut="F"
                  active={activePanel === "filters"}
                  onClick={() =>
                    setActivePanel(activePanel === "filters" ? null : "filters")
                  }
                />
              </span>
              <PanelToggle
                icon={Boxes}
                label={t("brain.panel.clusters", { defaultValue: "Clusters" })}
                shortcut="C"
                active={activePanel === "clusters"}
                onClick={() =>
                  setActivePanel(activePanel === "clusters" ? null : "clusters")
                }
              />
              <PanelToggle
                icon={CircleDot}
                label={t("brain.panel.orphans", { defaultValue: "Loose facts" })}
                shortcut="O"
                active={activePanel === "orphans"}
                onClick={() =>
                  setActivePanel(activePanel === "orphans" ? null : "orphans")
                }
              />
            </div>

            {/* Floating overlay panels — only one shown at a time */}
            {activePanel === "filters" && (
              <FloatingOverlay onClose={() => setActivePanel(null)}>
                <BrainFilterPanel filters={filters} onChange={setFilters} />
              </FloatingOverlay>
            )}
          </div>

          {/*
            Audit (2026-05-07) — Compose-from-N trigger relocated INSIDE
            the canvas (was fixed bottom-6 right-6 viewport-anchored).
            The viewport anchor put the button at risk of overlapping
            sidebar / mobile UI on narrow screens. Anchored to the canvas
            it lives inside the brain's visual frame and disappears
            cleanly when the compose modal opens (mutual exclusion with
            the FloatingOverlay panels: opening compose closes the active
            panel so the right slot belongs to compose).
          */}
          {selectedNodeIds.length >= 2 && !composeOpen ? (
            <button
              type="button"
              onClick={() => {
                setComposeOpen(true);
                setActivePanel(null);
              }}
              className="zaki-brain-v2__compose"
              data-testid="brain-compose-from-selection-button"
            >
              {t("brain.compose.fromSelection", { count: selectedNodeIds.length, defaultValue: "Compose from {{count}}" })}
            </button>
          ) : null}

          <BrainComposeModal
            userId={userId}
            open={composeOpen}
            selectedNodes={selectedNodes}
            onClose={() => {
              setComposeOpen(false);
              setSelectedNodeIds([]);
            }}
          />
          </section>
          <aside className="zaki-brain-v2__detail-rail" aria-label={t("brain.panel.detail", { defaultValue: "Memory detail" })}>
            {activePanel === "clusters" ? (
              <BrainCommunityLegend
                userId={userId}
                selectedCommunityId={selectedCommunityId}
                onSelectCommunity={setSelectedCommunityId}
              />
            ) : activePanel === "orphans" ? (
              <BrainOrphanRail userId={userId} onPick={handlePickKey} />
            ) : (
              <BrainDetailSummary
                nodes={selectedNodes}
                centerKey={centerKey}
                selectedCommunityId={selectedCommunityId}
              />
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

// V1.11 (2026-05-07) — Floating control button used inside the canvas
// to toggle overlay panels. Inherits the canvas's pointer-events:none
// cluster and re-enables for itself; lives in a small dark-tinted
// chip with a red-accent active state matching the rest of the page.
interface PanelToggleProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
  shortcut?: string;
}

function PanelToggle({ icon: Icon, label, active, onClick, shortcut }: PanelToggleProps) {
  // V1.11 hotfix (2026-05-07) — dropped backdrop-blur. On the deep
  // black canvas the blur created a faint translucent halo around
  // each button that read as misalignment. Solid `bg-zaki-raised/90`
  // matches the Obsidian-video gear button: clean dark chip, no
  // blur shimmer.
  const tooltip = shortcut ? `${label} (${shortcut})` : label;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={tooltip}
      title={tooltip}
      className={`pointer-events-auto flex size-9 items-center justify-center rounded-zaki-md border transition-colors ${
        active
          ? "border-zaki-brand-60 bg-zaki-brand-15 text-zaki-brand"
          : "border-white/10 bg-zaki-raised/90 text-white/60 hover:border-white/20 hover:text-white"
      }`}
    >
      <Icon className="size-4" />
    </button>
  );
}

// V1.11 (2026-05-07) — Wraps the existing side-panel components (filter,
// clusters, orphans) as a floating right-anchored overlay inside the
// canvas. The panel components keep their own width / styling; this
// wrapper just provides positioning + a close affordance + scroll
// containment when the panel content overflows the canvas height.
interface FloatingOverlayProps {
  onClose: () => void;
  children: React.ReactNode;
}

function FloatingOverlay({ onClose, children }: FloatingOverlayProps) {
  const { t } = useTranslation();
  // V1.11 hotfix (2026-05-07) — overlay polish to match the Obsidian
  // Filters panel from Nova's video (Screen Recording 2026-05-07
  // 14:05, frames 25 + 45):
  //   - Panel sits flush against the right edge with small inset
  //   - Close button is INSIDE the panel's top-right corner, not
  //     floating outside (the prior `-top-1 right-1` was negative-
  //     positioned, looked detached and misaligned)
  //   - Solid shadow-2xl gives the panel proper elevation against
  //     the dark canvas without blur shimmer
  return (
    <div className="absolute inset-x-3 bottom-3 z-20 flex max-h-[70%] flex-col rounded-zaki-lg shadow-2xl sm:inset-x-auto sm:right-3 sm:top-14 sm:max-h-[calc(100%-4.5rem)]">
      <button
        type="button"
        onClick={onClose}
        aria-label={t("brain.panel.close", { defaultValue: "Close panel" })}
        className="absolute right-2 top-2 z-30 flex size-6 items-center justify-center rounded-full bg-black/40 text-white/60 transition-colors hover:bg-black/60 hover:text-white"
      >
        <X className="size-3" />
      </button>
      <div className="flex h-full min-h-0 overflow-hidden rounded-zaki-lg">
        {children}
      </div>
    </div>
  );
}

function BrainDetailSummary({
  nodes,
  centerKey,
  selectedCommunityId,
}: {
  nodes: BrainGraphNode[];
  centerKey: string | null;
  selectedCommunityId: number | null;
}) {
  const { t } = useTranslation();
  const hasSelection = nodes.length > 0;
  return (
    <section className="zaki-brain-v2__detail-summary">
      <header>
        <div>
          <p>{t("brain.detail.title", { defaultValue: "Selection" })}</p>
          <h2>
            {hasSelection
              ? t("brain.detail.selectedCount", {
                  defaultValue: "{{count}} selected",
                  count: nodes.length,
                })
              : t("brain.detail.noSelection", { defaultValue: "No memory selected" })}
          </h2>
        </div>
        {selectedCommunityId != null ? (
          <V2Badge tone="accent">
            {t("brain.detail.community", {
              defaultValue: "Cluster {{id}}",
              id: selectedCommunityId,
            })}
          </V2Badge>
        ) : centerKey ? (
          <V2Badge tone="accent">
            {t("brain.detail.localGraph", { defaultValue: "Local graph" })}
          </V2Badge>
        ) : null}
      </header>
      {hasSelection ? (
        <ul>
          {nodes.slice(0, 6).map((node) => (
            <li key={node.id}>
              <strong>{node.display_label || node.summary}</strong>
              <span>{node.kind}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>
          {t("brain.detail.emptyHelper", {
            defaultValue:
              "Select memories on the canvas, open clusters, or inspect loose facts without leaving the graph.",
          })}
        </p>
      )}
    </section>
  );
}

// Audit (2026-05-07) — Kind legend chips. Translates internal node-kind
// vocabulary (core / daily / conversation) into life categories. The
// color dot mirrors what the canvas paints, so users connect color to
// meaning at a glance. Order is fixed (core first because it's the
// "you" identity layer); kinds with zero visible nodes hide so the
// strip stays compact on narrow viewports.
function KindLegend({ nodes }: { nodes: Array<{ kind?: string }> }) {
  const counts: Record<string, number> = {};
  for (const n of nodes) {
    const k = String(n.kind || "");
    if (!k) continue;
    counts[k] = (counts[k] || 0) + 1;
  }
  const order = ["core", "daily", "conversation"];
  const visible = order.filter((k) => (counts[k] ?? 0) > 0);
  if (visible.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((k) => (
        <span
          key={k}
          className="inline-flex items-center gap-1.5 rounded-full border border-zaki-border bg-zaki-raised/60 px-2 py-0.5"
        >
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: KIND_COLOR[k] ?? "#6b7280" }}
            aria-hidden="true"
          />
          <span className="text-zaki-text">{KIND_LABEL[k] ?? k}</span>
          <span className="font-mono-ui text-zaki-muted">{counts[k]}</span>
        </span>
      ))}
    </div>
  );
}
