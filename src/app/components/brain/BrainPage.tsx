import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores";
import { useBrainGraph } from "@/queries";
import { SkeletonBrainPage } from "@/app/components/ui/skeleton";
import { BrainEmptyState } from "./BrainEmptyState";
import { BrainSemanticDegradedBanner } from "./BrainSemanticDegradedBanner";
import { BrainGraphView } from "./BrainGraphView";
import { BrainTimelineView } from "./BrainTimelineView";

type BrainTab = "timeline" | "graph";

export function BrainPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const userId = String(user?.id ?? "");
  const [tab, setTab] = useState<BrainTab>("timeline");
  const [degradedDismissed, setDegradedDismissed] = useState(false);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);

  const graphQuery = useBrainGraph(userId);

  if (graphQuery.isLoading) return <SkeletonBrainPage />;

  const totalNodes = graphQuery.data?.total_nodes_in_corpus ?? 0;
  const semanticDegraded = graphQuery.data?.semantic_degraded ?? false;

  if (totalNodes === 0) {
    return (
      <BrainEmptyState
        onMigrate={() => {
          // TODO(plan 09/10): wire to the same import panel ZakiDashboard uses
          // For now, navigate to the dashboard import flow trigger
          window.location.assign("/?import=memories");
        }}
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
        <div data-testid="brain-graph-slot">
          <BrainGraphView
            userId={userId}
            selectedIds={selectedNodeIds}
            onSelectionChange={setSelectedNodeIds}
          />
        </div>
      )}
      {/* Plan 09 mounts BrainComposeModal here, gated on selectedNodeIds.length >= 2 */}
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
