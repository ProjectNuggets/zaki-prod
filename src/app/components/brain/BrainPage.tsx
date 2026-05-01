import { useMemo, useRef, useState } from "react";
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

type BrainTab = "timeline" | "graph";

export function BrainPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const userId = String(user?.id ?? "");
  const [tab, setTab] = useState<BrainTab>("timeline");
  const [degradedDismissed, setDegradedDismissed] = useState(false);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const graphQuery = useBrainGraph(userId);
  const selectedNodes = useMemo(
    () => (graphQuery.data?.nodes ?? []).filter((n) => selectedNodeIds.includes(n.id)),
    [graphQuery.data?.nodes, selectedNodeIds],
  );

  if (!userId || graphQuery.isLoading) return <SkeletonBrainPage />;

  if (graphQuery.isError) {
    return (
      <div className="px-6 py-16 text-center text-sm text-zaki-muted">
        {t("brain.error.loadFailed")}
      </div>
    );
  }

  const totalNodes = graphQuery.data?.total_nodes_in_corpus ?? 0;
  const semanticDegraded = graphQuery.data?.semantic_degraded ?? false;

  if (totalNodes === 0) {
    return (
      <BrainEmptyState
        onMigrate={() => navigate("/")}
      />
    );
  }

  return (
    <div className="py-8">
      <div className="mx-auto max-w-4xl px-6">
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
        <div data-testid="brain-graph-slot" className="relative px-3 sm:px-5">
          {/* M2/S3: Search bar — above graph only */}
          <div className="mx-auto mb-3 max-w-4xl">
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zaki-muted"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("brain.graph.search.placeholder")}
                aria-label={t("brain.graph.search.placeholder")}
                className="w-full rounded-zaki-lg border border-zaki-border bg-zaki-raised py-2 pl-8 pr-8 text-sm text-zaki-text placeholder:text-zaki-muted focus:border-[#f10202] focus:outline-none focus:ring-1 focus:ring-[#f10202]/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(""); searchInputRef.current?.focus(); }}
                  aria-label={t("brain.graph.search.clear")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-zaki-muted hover:text-zaki-text"
                >
                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <BrainGraphView
            userId={userId}
            selectedIds={selectedNodeIds}
            onSelectionChange={setSelectedNodeIds}
            searchQuery={searchQuery}
          />
          <BrainComposeModal
            userId={userId}
            open={selectedNodeIds.length >= 2}
            selectedNodes={selectedNodes}
            onClose={() => setSelectedNodeIds([])}
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
