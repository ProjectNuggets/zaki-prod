import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchBrainMemory, type BrainMemoryDetail, type BrainGraphNode } from "@/lib/api";

export const brainMemoryKeys = {
  detail: (key: string) => ["brain", "memory", key] as const,
};

/**
 * Fetches the full M3 drilldown for a memory node.
 * Falls back gracefully to null while backend isn't live (404 → null).
 * Panel renders from graph-node data in that case.
 */
export function useBrainMemory(userId: string, key: string | null) {
  return useQuery<BrainMemoryDetail | null>({
    queryKey: brainMemoryKeys.detail(key ?? ""),
    queryFn: async () => {
      if (!key) return null;
      try {
        return await fetchBrainMemory(userId, key);
      } catch {
        // 404 or not-yet-live backend — caller falls back to graph-node data
        return null;
      }
    },
    enabled: !!userId && !!key,
    staleTime: 30_000,
    retry: false, // don't hammer a 404 endpoint
  });
}

/**
 * Returns a prefetch function for S1 — call on idle to warm the M3 cache
 * for visible nodes before the user clicks them.
 */
export function useBrainMemoryPrefetch(userId: string) {
  const queryClient = useQueryClient();
  return (nodes: Pick<BrainGraphNode, "id">[]) => {
    for (const node of nodes) {
      void queryClient.prefetchQuery({
        queryKey: brainMemoryKeys.detail(node.id),
        queryFn: async () => {
          try {
            return await fetchBrainMemory(userId, node.id);
          } catch {
            return null;
          }
        },
        staleTime: 30_000,
      });
    }
  };
}
