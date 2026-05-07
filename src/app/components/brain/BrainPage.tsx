import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores";
import { useBrainGraph } from "@/queries";
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

type BrainTab = "timeline" | "graph";

// Debounce search input -> server-side ?search= filter to avoid hammering the
// backend on every keystroke.
const SEARCH_DEBOUNCE_MS = 250;

export function BrainPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const userId = String(user?.id ?? "");
  const [tab, setTab] = useState<BrainTab>("timeline");
  const [degradedDismissed, setDegradedDismissed] = useState(false);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  // V1.11 (2026-05-07) — explicit compose-modal toggle. Pre-V1.11 the modal
  // auto-opened the moment a user shift-click-selected a 2nd node, which
  // was startling (the brain audit flagged it). Now the modal opens only
  // on explicit user action via the floating "Compose from N" button below.
  const [composeOpen, setComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // V1.7 graph state
  const [filters, setFilters] = useState<BrainFilters>(DEFAULT_FILTERS);
  const [centerKey, setCenterKey] = useState<string | null>(null);
  const [highlightKeys, setHighlightKeys] = useState<string[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<number | null>(null);

  // Debounce search input into filters.search
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchQuery]);

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
  });

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
    <div className="flex h-full min-h-0 flex-col overflow-y-auto py-8">
      <div className="mx-auto max-w-7xl px-6">
        <header className="mb-6">
          <h1 className="text-xl font-semibold text-zaki-text">{t("brain.title")}</h1>
          <p className="text-sm text-zaki-muted">{t("brain.subtitle")}</p>
        </header>

        {semanticDegraded && !degradedDismissed && (
          <div className="mb-4">
            <BrainSemanticDegradedBanner onDismiss={() => setDegradedDismissed(true)} />
          </div>
        )}

        <div className="mb-6 flex gap-2 border-b border-zaki-border">
          <TabButton active={tab === "timeline"} onClick={() => setTab("timeline")}>
            {t("brain.tabs.timeline")}
          </TabButton>
          <TabButton active={tab === "graph"} onClick={() => setTab("graph")}>
            {t("brain.tabs.graph")}
          </TabButton>
        </div>
      </div>

      {tab === "timeline" ? (
        <div className="mx-auto max-w-4xl px-6" data-testid="brain-timeline-slot">
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
        <div data-testid="brain-graph-slot" className="mx-auto max-w-screen-2xl px-3 sm:px-5">
          {/* Search bar — debounced into ?search= */}
          <div className="mb-3">
            <div className="relative">
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
                className="w-full rounded-zaki-lg border border-zaki-border bg-zaki-raised py-2 pl-8 pr-8 text-sm text-zaki-text placeholder:text-zaki-muted focus:border-[#f10202] focus:outline-none focus:ring-1 focus:ring-[#f10202]/30"
                data-testid="brain-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  aria-label={t("brain.graph.search.clear")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-zaki-muted hover:text-zaki-text"
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
          <div className="mb-3 flex items-baseline justify-between gap-3 px-1 text-xs text-zaki-muted">
            <div>
              {t("brain.counterStrip.showing", {
                defaultValue: "Showing {{visible}} of {{total}} memories",
                visible: initialGraphQuery.data?.nodes?.length ?? 0,
                total: totalNodes,
              })}
              {(initialGraphQuery.data?.edges?.length ?? 0) > 0 ? (
                <>
                  {" · "}
                  {t("brain.counterStrip.edges", {
                    defaultValue: "{{count}} edges",
                    count: initialGraphQuery.data?.edges?.length ?? 0,
                  })}
                </>
              ) : null}
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

          {/* Main row: filter panel + graph + right rails */}
          <div className="flex flex-col gap-3 lg:flex-row">
            <BrainFilterPanel filters={filters} onChange={setFilters} />

            {/*
              V1.11 (2026-05-07) — full-bleed dark canvas. The graph
              container wraps the cytoscape view in a deep-black panel
              so the rendered nodes/edges sit on a true Obsidian-style
              canvas instead of the page's lighter chrome. Border + soft
              shadow keep it framed within the layout without competing
              with the surrounding rails. Pillar 1 — visible memory
              starts with making the surface itself feel intentional.
            */}
            <div className="min-w-0 flex-1 overflow-hidden rounded-zaki-lg border border-zaki-border bg-[#0a0a0a] shadow-md">
              <BrainGraphView
                userId={userId}
                selectedIds={selectedNodeIds}
                onSelectionChange={setSelectedNodeIds}
                filters={effectiveFilters}
                highlightKeys={highlightKeys}
                selectedCommunityId={selectedCommunityId}
                centerKey={centerKey}
                onCenterKeyChange={setCenterKey}
              />
            </div>

            <div className="flex w-72 shrink-0 flex-col gap-3">
              <BrainCommunityLegend
                userId={userId}
                selectedCommunityId={selectedCommunityId}
                onSelectCommunity={setSelectedCommunityId}
              />
              <BrainOrphanRail userId={userId} onPick={handlePickKey} />
            </div>
          </div>

          {/*
            V1.11 (2026-05-07) — Floating "Compose from N" trigger button
            replaces the auto-opening modal. Shows when ≥2 nodes are
            selected and the modal isn't already open. User clicks to
            open; on close, both modal state AND node selection clear so
            the next compose flow starts fresh.
          */}
          {selectedNodeIds.length >= 2 && !composeOpen ? (
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full bg-[#f10202] px-4 py-3 text-sm font-medium text-white shadow-lg transition hover:bg-[#f10202]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f10202]/40"
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
        </div>
      )}
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-[#f10202] text-zaki-text"
          : "border-transparent text-zaki-muted hover:text-zaki-text"
      }`}
    >
      {children}
    </button>
  );
}
