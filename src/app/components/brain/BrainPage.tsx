import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Shield, X } from "lucide-react";
import { useAuthStore } from "@/stores";
import { useBrainGraph, useBrainMe } from "@/queries";
import { SkeletonBrainPage } from "@/app/components/ui/skeleton";
import { BrainEmptyState } from "./BrainEmptyState";
import { BrainSemanticDegradedBanner } from "./BrainSemanticDegradedBanner";
import { sanitizeBrainText } from "./brainText";
import { brainHealth } from "./brainHealth";
import { BrainGalaxyView, type GalaxyScope } from "./galaxy/BrainGalaxyView";
import { BrainHome } from "./galaxy/BrainHome";
import { BrainDisplayPanel } from "./galaxy/BrainDisplayPanel";
import { DEFAULT_FX } from "./galaxy/engine/lod";
import type { GalaxyHandle } from "./galaxy/GalaxyRenderer";
import type { BrainViewMode, RenderQuality } from "./galaxy/engine/interface";
import { BrainComposeModal } from "./BrainComposeModal";
import { BrainFilterPanel, DEFAULT_FILTERS, type BrainFilters } from "./BrainFilterPanel";
import { BrainTimeScrubber } from "./BrainTimeScrubber";
import { BrainInsightsStrip } from "./BrainInsightsStrip";
import {
  colorForCommunity,
  KIND_COLOR,
  KIND_LABEL,
  RECENCY_COLOR,
  RECENCY_LABEL,
  recencyBucket,
  STATUS_COLOR,
  STATUS_LABEL,
  type ColorPreset,
  type RecencyBucket,
} from "./brainColors";
import { V2StatusStrip } from "@/app/components/v2";
import { readPendingIntent, writePendingIntent, type PendingIntent } from "@/lib/pendingIntent";

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

// Brain V2 closeout (2026-05-30) — the desktop filters rail
// (.zaki-brain-v2__filters-rail) is always visible above 900px, while the
// floating filters overlay is the ≤900px mechanism (the rail is set to
// display:none there). Without this guard, pressing `f` or loading
// `?panel=filters` on a desktop viewport rendered BrainFilterPanel twice —
// the always-on rail *and* the overlay — duplicating the SCOPE block and the
// governance Settings deep-link in the DOM/accessibility tree. This hook makes
// the rail and overlay mutually exclusive, matching the CSS breakpoint. It is
// test-safe: jsdom has no matchMedia, so it reports "not narrow" (overlay off).
function useMediaMatch(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

// < 900px: rail hidden → use the controls overlay. ≤ 1280px: detail rail hidden
// → show the focused memory in a drawer instead.
const useBrainNarrow = () => useMediaMatch("(max-width: 900px)");

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
  //
  // Legacy ?tab=home/explore/graph links are accepted by ignoring the tab
  // param; Brain now ships as one graph-first overview page.
  const initialPanel: ActivePanel = (() => {
    const p = searchParams.get("panel");
    return p === "filters" || p === "clusters" || p === "orphans" ? p : null;
  })();
  const initialQ = searchParams.get("q") ?? "";

  const [degradedDismissed, setDegradedDismissed] = useState(false);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  // V1.11 (2026-05-07) — explicit compose-modal toggle. Pre-V1.11 the modal
  // auto-opened the moment a user shift-click-selected a 2nd node, which
  // was startling (the brain audit flagged it). Now the modal opens only
  // on explicit user action via the floating "Compose from N" button below.
  const [composeOpen, setComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialQ);
  const [debouncedSearch, setDebouncedSearch] = useState(initialQ);
  const [recoveryIntent] = useState<PendingIntent | null>(() => {
    const intent = readPendingIntent();
    return intent?.productId === "brain" ? intent : null;
  });
  const searchInputRef = useRef<HTMLInputElement>(null);

  // V1.7 graph state
  const [filters, setFilters] = useState<BrainFilters>(DEFAULT_FILTERS);
  const [highlightKeys, setHighlightKeys] = useState<string[]>([]);
  // V1.11 — floating-overlay panel toggle (Obsidian Graph View pattern).
  // null = canvas-only (default); set by clicking a corner icon.
  const [activePanel, setActivePanel] = useState<ActivePanel>(initialPanel);
  const isNarrow = useBrainNarrow();
  const graphSectionRef = useRef<HTMLDivElement | null>(null);

  // Debounce search input into filters.search
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchQuery]);

  // State -> URL sync. Preserve q + panel; legacy tab params are ignored but
  // left alone so old shared links keep loading the unified page.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) next.set("q", debouncedSearch); else next.delete("q");
    if (activePanel) next.set("panel", activePanel); else next.delete("panel");
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, activePanel]);

  // Keyboard shortcut in the graph section: "/" focuses search. (Hold Shift +
  // drag to spin the 3D graph — handled in the engine.)
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const inEditable =
        !!target?.closest?.("input, textarea, [contenteditable='true']");
      if (inEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "/") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const effectiveFilters = useMemo<BrainFilters>(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );

  const navigate = useNavigate();
  // Initial probe to detect empty corpus + degraded state. Uses the same
  // filter args the graph view will use so the cache is warm.
  // MUST mirror BrainGalaxyView's useBrainGraph args EXACTLY (including
  // link_types) so the React Query keys match → one shared fetch. If they
  // diverge, the page makes a second, unfiltered fetch and the "Showing N of M"
  // counter + legend (read off this query) disagree with what the canvas draws.
  const initialGraphQuery = useBrainGraph(userId, {
    max_nodes: effectiveFilters.maxNodes,
    exclude_orphans: effectiveFilters.excludeOrphans,
    link_types:
      effectiveFilters.linkTypes.length > 0 ? effectiveFilters.linkTypes.join(",") : undefined,
    semantic_min_weight: effectiveFilters.semanticEdgeThreshold,
  });

  // Audit (2026-05-08) — canonical "you" anchor from /brain/me. Used
  // to mark the self node visually in the graph (.self class). Auto-
  // anchoring focus-mode on the self node is deferred until backend
  // wires identity-to-activity edges (today self is graph-orphan in
  // the test corpus); for now it's a visible self-marker only.
  const meQuery = useBrainMe(userId);
  const selfKey = meQuery.data?.key ?? null;

  // Galaxy view state lives here (not inside the renderer) so its chrome uses
  // the page's real slots: the display panel in the filters-rail, the memory
  // detail in the detail-rail.
  const [galaxyView, setGalaxyView] = useState<BrainViewMode>("spatial");
  const [galaxyFx, setGalaxyFx] = useState<RenderQuality>(DEFAULT_FX);
  const [galaxyDepth, setGalaxyDepth] = useState(1);
  // focusId drives the engine ember; the detail card resolves the memory key
  // itself (from the same graph the galaxy renders, link_types applied), so the
  // page only needs to track which node is focused.
  const [galaxyFocusId, setGalaxyFocusId] = useState<string | null>(null);
  const galaxyRef = useRef<GalaxyHandle>(null);
  const toggleGalaxyFx = useCallback((key: keyof RenderQuality) => {
    setGalaxyFx((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);
  const handleGalaxyFocus = useCallback((id: string | null) => {
    setGalaxyFocusId(id);
  }, []);
  // Clusters-first: land on the cluster-hub overview, not the full hairball.
  const [galaxyScope, setGalaxyScope] = useState<GalaxyScope>({ kind: "overview" });
  const changeGalaxyScope = useCallback((scope: GalaxyScope) => {
    setGalaxyScope(scope);
    setGalaxyFocusId(null);
  }, []);

  const selectedNodes = useMemo(
    () =>
      (initialGraphQuery.data?.nodes ?? []).filter((n) =>
        selectedNodeIds.includes(n.id),
      ),
    [initialGraphQuery.data?.nodes, selectedNodeIds],
  );

  if (!userId || initialGraphQuery.isLoading) return <SkeletonBrainPage />;

  const health = brainHealth({
    requestFailed: initialGraphQuery.isError,
    hasUsableData: initialGraphQuery.data != null,
    semanticDegraded: initialGraphQuery.data?.semantic_degraded ?? false,
  });
  const brainUnavailable = health === "unavailable";
  const brainStale = health === "stale";
  const totalNodes = brainUnavailable
    ? 0
    : initialGraphQuery.data?.total_nodes_in_corpus ?? 0;
  const semanticDegraded = health === "degraded";

  if (!brainUnavailable && totalNodes === 0) {
    return <BrainEmptyState onMigrate={() => navigate("/")} />;
  }

  // Memory key → node id. The galaxy focuses by node id, but the time scrubber
  // (and timeline) hand us memory keys. Built from the page's graph fetch.
  const nodeIdByKey = new Map<string, string>();
  for (const n of initialGraphQuery.data?.nodes ?? []) {
    nodeIdByKey.set(n.id, n.id);
    if (n.key) nodeIdByKey.set(n.key, n.id);
  }

  // Clicking a memory in the time scrubber or overview takes you to it: focus
  // the node, show the full galaxy, and scroll the graph into view.
  const handlePickKey = (key: string) => {
    const id = nodeIdByKey.get(key) ?? key;
    setGalaxyScope({ kind: "all" });
    setGalaxyFocusId(id);
    window.requestAnimationFrame(() => {
      graphSectionRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
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
            value: brainUnavailable ? "--" : totalNodes.toLocaleString(),
            tone: brainUnavailable ? "warn" : "accent",
          },
          {
            id: "view",
            label: t("brain.status.view", { defaultValue: "View" }),
            value: brainUnavailable
              ? t("brain.status.unavailable", { defaultValue: "Unavailable" })
              : t("brain.status.graphOverview", { defaultValue: "Graph + overview" }),
          },
          {
            id: "health",
            label: brainUnavailable
              ? t("brain.status.memoryUnavailable", { defaultValue: "Memory unavailable" })
              : brainStale
              ? t("brain.status.cachedData", { defaultValue: "Using cached memory" })
              : semanticDegraded
              ? t("brain.status.semanticDegraded", { defaultValue: "Semantic degraded" })
              : t("brain.status.semanticReady", { defaultValue: "Semantic ready" }),
            tone: brainUnavailable || brainStale || semanticDegraded ? "warn" : "success",
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
              {t("brain.governance.brainSettingsLink", {
                defaultValue: "Memory settings",
              })}
            </Link>
          </div>
        </header>

        {recoveryIntent ? (
          <section
            className="border border-[var(--v2-accent-hairline)] bg-[var(--v2-accent-faint)] p-3"
            role="region"
            aria-label={t("brain.recovery.ariaLabel", {
              defaultValue: "Preserved work",
            })}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-[var(--v2-accent-text)]">
                  {t("brain.recovery.title", { defaultValue: "Your work is still here" })}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-[var(--v2-ink-1)]">
                  {recoveryIntent.prompt}
                </p>
              </div>
              <button
                type="button"
                className="v2-btn v2-btn--accent v2-btn--sm shrink-0"
                onClick={() => {
                  writePendingIntent({
                    productId: "spaces",
                    taskKind: "chat",
                    prompt: recoveryIntent.prompt,
                    source: "brain_recovery",
                    returnTo: "/spaces",
                    replayMode: "draft",
                  });
                  navigate("/spaces");
                }}
              >
                {t("brain.recovery.continueInSpaces", {
                  defaultValue: "Continue in Spaces",
                })}
              </button>
            </div>
          </section>
        ) : null}

        {brainUnavailable ? (
          <BrainUnavailableState />
        ) : null}

        {!brainUnavailable && semanticDegraded && !degradedDismissed && (
          <div className="zaki-brain-v2__banner">
            <BrainSemanticDegradedBanner onDismiss={() => setDegradedDismissed(true)} />
          </div>
        )}

        {!brainUnavailable ? <BrainInsightsStrip userId={userId} total={totalNodes} /> : null}

      </div>

      {brainUnavailable ? null : (
        <>
        {/*
          V1.11 (2026-05-07) — Graph row goes wide. Pre-V1.11 the graph
          slot was constrained by `mx-auto max-w-7xl` (1280px), which
          squeezed the canvas between the filter panel (288px) and the
          right rails (288px), leaving only ~700px for the graph itself
          even on wide displays. The graph is the centerpiece of the
          brain page; it deserves the spotlight. Now: max-w-screen-2xl
          (1536px) gives substantially more horizontal room while still
          preventing the layout from spreading uncomfortably wide on
          ultra-wide monitors. Header above remains max-w-7xl —
          they don't need the extra width.
        */}
        <div
          ref={graphSectionRef}
          data-testid="brain-graph-slot"
          className="zaki-brain-v2__graph-shell"
        >
          <aside className="zaki-brain-v2__filters-rail" aria-label={t("brain.panel.filters", { defaultValue: "Filters" })}>
            <BrainDisplayPanel
              view={galaxyView}
              onViewChange={setGalaxyView}
              fx={galaxyFx}
              onToggleFx={toggleGalaxyFx}
              depth={galaxyDepth}
              onDepthChange={setGalaxyDepth}
              hasFocus={galaxyFocusId != null}
              onFit={() => galaxyRef.current?.fit()}
              scope={galaxyScope}
              onScopeChange={changeGalaxyScope}
            />
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
            <BrainGalaxyView
              ref={galaxyRef}
              userId={userId}
              selectedIds={selectedNodeIds}
              onSelectionChange={setSelectedNodeIds}
              filters={effectiveFilters}
              selfKey={selfKey}
              highlightKeys={highlightKeys}
              view={galaxyView}
              fx={galaxyFx}
              depth={galaxyDepth}
              focusId={galaxyFocusId}
              onFocusChange={handleGalaxyFocus}
              scope={galaxyScope}
              onScopeChange={changeGalaxyScope}
            />

            {/* Narrow screens: the rail is hidden < 900px, so surface a single
                "Controls" button that opens the full controls (display + filters)
                in an overlay. (Without this, mobile has no graph controls.) */}
            {isNarrow && activePanel !== "filters" && (
              <button
                type="button"
                className="zaki-brain-v2__controls-toggle"
                onClick={() => setActivePanel("filters")}
                data-testid="brain-controls-toggle"
              >
                {t("brain.panel.controls", { defaultValue: "Controls" })}
              </button>
            )}
            {activePanel === "filters" && isNarrow && (
              <FloatingOverlay onClose={() => setActivePanel(null)}>
                <BrainDisplayPanel
                  view={galaxyView}
                  onViewChange={setGalaxyView}
                  fx={galaxyFx}
                  onToggleFx={toggleGalaxyFx}
                  depth={galaxyDepth}
                  onDepthChange={setGalaxyDepth}
                  hasFocus={galaxyFocusId != null}
                  onFit={() => galaxyRef.current?.fit()}
                  scope={galaxyScope}
                  onScopeChange={changeGalaxyScope}
                />
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

          {/* Colour legend sits UNDER the canvas (was above). The selected
              memory's detail shows in the on-canvas card, so there's no right
              rail — the canvas gets the full width. */}
          {filters.colorPreset !== "mono" ? (
            <div className="zaki-brain-v2__legend-row">
              <BrainColorLegend
                colorPreset={filters.colorPreset}
                nodes={initialGraphQuery.data?.nodes ?? []}
              />
            </div>
          ) : null}
          </section>
        </div>
        <div className="zaki-brain-v2__home-slot" data-testid="brain-home-slot">
          <BrainHome
            userId={userId}
            graph={initialGraphQuery.data}
            graphLoading={initialGraphQuery.isLoading}
            onPickMemoryKey={handlePickKey}
          />
        </div>
        </>
      )}
    </div>
  );
}

function BrainUnavailableState() {
  const { t } = useTranslation();
  return (
    <section className="zaki-brain-v2__unavailable" data-testid="brain-unavailable-state">
      <div>
        <p>{t("brain.unavailable.eyebrow", { defaultValue: "Memory layer unavailable" })}</p>
        <h2>
          {t("brain.unavailable.title", {
            defaultValue: "Brain is waiting for the memory state manager",
          })}
        </h2>
      </div>
      <p>
        {t("brain.unavailable.body", {
          defaultValue:
            "ZAKI is running, but the Brain graph cannot read the active memory store in the current runtime. The route is healthy; the backend memory layer is degraded.",
        })}
      </p>
      <Link
        to="/settings#settings-memory-data"
        className="zaki-brain-v2__governance-link"
        data-testid="brain-unavailable-settings-link"
      >
        <Shield className="size-3.5" aria-hidden="true" />
        {t("brain.governance.manageLink", {
          defaultValue: "Memory & privacy in Settings",
        })}
      </Link>
    </section>
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
  return (
    <div className="absolute inset-x-3 bottom-3 z-20 flex max-h-[70%] flex-col sm:inset-x-auto sm:right-3 sm:top-14 sm:max-h-[calc(100%-4.5rem)]">
      <button
        type="button"
        onClick={onClose}
        aria-label={t("brain.panel.close", { defaultValue: "Close panel" })}
        className="absolute right-2 top-2 z-30 flex size-6 items-center justify-center rounded-[2px] bg-black/40 text-white/60 transition-colors hover:bg-black/60 hover:text-white"
      >
        <X className="size-3" />
      </button>
      <div className="flex h-full min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// Audit (2026-05-07) — Kind legend chips. Translates internal node-kind
// vocabulary (core / daily / conversation) into life categories. The
// color dot mirrors what the canvas paints, so users connect color to
// meaning at a glance. Order is fixed (core first because it's the
// "you" identity layer); kinds with zero visible nodes hide so the
// strip stays compact on narrow viewports.
// Legend for the active "Color by" dimension — turns the colors into meaning.
// Derives entries from the rendered nodes (kinds/communities present, recency
// buckets, live/archived counts) so the swatches always match what's on screen.
type LegendNode = {
  kind?: string;
  community_id?: number | null;
  community_name?: string | null;
  created_at?: number;
  valid_to?: number | null;
};
const LEGEND_CODENAME = /\b(nullalis|null[\s_-]?alis|panther|neptune)\b/i;

function legendItems(
  colorPreset: ColorPreset,
  nodes: LegendNode[],
): Array<{ key: string; color: string; label: string; count: number }> {
  if (colorPreset === "kind") {
    const counts: Record<string, number> = {};
    for (const n of nodes) {
      const k = String(n.kind || "");
      if (k) counts[k] = (counts[k] || 0) + 1;
    }
    return ["core", "daily", "conversation"]
      .filter((k) => (counts[k] ?? 0) > 0)
      .map((k) => ({ key: k, color: KIND_COLOR[k] ?? "#6b7280", label: KIND_LABEL[k] ?? k, count: counts[k]! }));
  }
  if (colorPreset === "recency") {
    const now = Date.now();
    const counts: Record<RecencyBucket, number> = { week: 0, month: 0, older: 0 };
    for (const n of nodes) if (typeof n.created_at === "number") counts[recencyBucket(n.created_at, now)]++;
    return (["week", "month", "older"] as RecencyBucket[])
      .filter((b) => counts[b] > 0)
      .map((b) => ({ key: b, color: RECENCY_COLOR[b], label: RECENCY_LABEL[b], count: counts[b] }));
  }
  if (colorPreset === "status") {
    let live = 0;
    let archived = 0;
    for (const n of nodes) (n.valid_to != null ? archived++ : live++);
    const out: Array<{ key: string; color: string; label: string; count: number }> = [];
    if (live) out.push({ key: "live", color: STATUS_COLOR.live, label: STATUS_LABEL.live, count: live });
    if (archived)
      out.push({ key: "archived", color: STATUS_COLOR.archived, label: STATUS_LABEL.archived, count: archived });
    return out;
  }
  if (colorPreset === "community") {
    const map = new Map<number, { name: string; count: number }>();
    for (const n of nodes) {
      const c = n.community_id;
      if (c == null) continue;
      const communityName = sanitizeBrainText(n.community_name);
      const cur = map.get(c) ?? { name: communityName, count: 0 };
      cur.count++;
      if (communityName) cur.name = communityName;
      map.set(c, cur);
    }
    // The legend highlights real LLM-named themes; "Cluster 19716777" fallbacks
    // (and internal codenames) are still colored on the canvas but skipped here.
    const isFallback = (name: string) =>
      !name || /^Cluster \d+$/.test(name) || LEGEND_CODENAME.test(name);
    return [...map.entries()]
      .filter(([, v]) => !isFallback(v.name))
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8)
      .map(([id, v]) => ({ key: String(id), color: colorForCommunity(id), label: v.name, count: v.count }));
  }
  return [];
}

function BrainColorLegend({ colorPreset, nodes }: { colorPreset: ColorPreset; nodes: LegendNode[] }) {
  const items = legendItems(colorPreset, nodes);
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="brain-color-legend">
      {items.map((it) => (
        <span
          key={it.key}
          className="inline-flex items-center gap-1.5 rounded-[2px] border border-zaki-border bg-zaki-raised/60 px-2 py-0.5"
        >
          <span className="size-2 rounded-[1px]" style={{ backgroundColor: it.color }} aria-hidden="true" />
          <span className="max-w-[140px] truncate text-zaki-text" title={it.label}>
            {it.label}
          </span>
          <span className="font-mono-ui text-zaki-muted">{it.count}</span>
        </span>
      ))}
    </div>
  );
}
