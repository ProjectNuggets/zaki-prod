import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BrainApiError,
  fetchBrainMemory,
  type BrainMemoryDetail,
  type BrainGraphNode,
} from "@/lib/api";

export const brainMemoryKeys = {
  // Memory keys are only unique inside a Nullalis user scope. Include userId
  // so account switches and local auth bypass tests cannot reuse another
  // user's cached detail payload.
  detail: (userId: string, key: string) => ["brain", "memory", userId, key] as const,
};

/**
 * Fetches the full M3 drilldown for a memory node.
 * Falls back to graph-node data only when the specific memory is missing
 * (404). Transport/proxy/JSON failures stay visible as query errors.
 */
export function useBrainMemory(userId: string, key: string | null) {
  return useQuery<BrainMemoryDetail | null>({
    queryKey: brainMemoryKeys.detail(userId, key ?? ""),
    queryFn: async () => {
      if (!key) return null;
      try {
        return await fetchBrainMemory(userId, key);
      } catch (error) {
        // Historical/deleted nodes can legitimately 404 while the graph cache
        // is still warm. Other failures should render as query errors instead
        // of silently degrading to stale graph-node summary text.
        if (error instanceof BrainApiError && error.status === 404) {
          return null;
        }
        throw error;
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
        queryKey: brainMemoryKeys.detail(userId, node.id),
        queryFn: async () => {
          try {
            return await fetchBrainMemory(userId, node.id);
          } catch (error) {
            if (error instanceof BrainApiError && error.status === 404) {
              return null;
            }
            throw error;
          }
        },
        staleTime: 30_000,
      });
    }
  };
}
