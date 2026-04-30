import { useQuery } from "@tanstack/react-query";
import { fetchBrainGraph, type BrainGraphResponse } from "@/lib/api";

export function useBrainGraph(
  userId: string,
  opts?: { since?: number; max_nodes?: number; node_kinds?: string },
) {
  return useQuery<BrainGraphResponse>({
    queryKey: ["brain", "graph", userId, opts ?? {}],
    queryFn: () => fetchBrainGraph(userId, opts),
    enabled: !!userId,
    staleTime: 30_000,
  });
}
