import { useUIStore } from "@/stores";

export type MemoryViewerTab = "memories" | "pending" | "conflicts";

type OpenSpacesMemoryViewerOptions = {
  enabled: boolean;
  query?: string;
  tab?: MemoryViewerTab;
};

export function openSpacesMemoryViewer({
  enabled,
  query,
  tab,
}: OpenSpacesMemoryViewerOptions) {
  if (!enabled || typeof window === "undefined") return;

  const dispatchOpenMemory = () => {
    if (query || tab) {
      window.dispatchEvent(
        new CustomEvent("zaki:open-memory", {
          detail: {
            ...(query ? { query } : {}),
            ...(tab ? { tab } : {}),
          },
        })
      );
      return;
    }

    window.dispatchEvent(new Event("zaki:open-memory"));
  };

  if (window.matchMedia("(max-width: 767px)").matches) {
    useUIStore.getState().setMobileSidebarOpen(true);
    window.setTimeout(dispatchOpenMemory, 0);
    return;
  }

  dispatchOpenMemory();
}
