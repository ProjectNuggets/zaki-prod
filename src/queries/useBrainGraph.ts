import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  fetchBrainGraph,
  type BrainGraphFetchOpts,
  type BrainGraphResponse,
} from "@/lib/api";

export type BrainGraphQueryOptions = {
  enabled?: boolean;
};

export function useBrainGraph(
  userId: string,
  opts?: BrainGraphFetchOpts,
  queryOptions?: BrainGraphQueryOptions
) {
  return useQuery<BrainGraphResponse>({
    queryKey: [
      "brain",
      "graph",
      userId,
      opts?.since,
      opts?.max_nodes,
      opts?.node_kinds,
      opts?.search,
      opts?.link_types,
      opts?.exclude_orphans,
      opts?.semantic_min_weight,
    ],
    queryFn: () => fetchBrainGraph(userId, opts),
    enabled: !!userId && (queryOptions?.enabled ?? true),
    staleTime: 30_000,
    // Keep the previous graph on screen while a param change (max_nodes /
    // cutoff / filters) refetches — no whole-page skeleton flash.
    placeholderData: keepPreviousData,
  });
}
