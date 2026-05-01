import { useMemo, useState } from "react";
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
    <div className="mx-auto max-w-4xl px-6 py-8">
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

      {tab === "timeline" ? (
        <div data-testid="brain-timeline-slot">
          <BrainTimelineView userId={userId} />
        </div>
      ) : (
        <div data-testid="brain-graph-slot" className="relative">
          <BrainGraphView
            userId={userId}
            selectedIds={selectedNodeIds}
            onSelectionChange={setSelectedNodeIds}
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
