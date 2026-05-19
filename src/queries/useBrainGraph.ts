import { useQuery } from "@tanstack/react-query";
import {
  fetchBrainGraph,
  type BrainGraphFetchOpts,
  type BrainGraphResponse,
} from "@/lib/api";

export function useBrainGraph(userId: string, opts?: BrainGraphFetchOpts) {
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
    enabled: !!userId,
    staleTime: 30_000,
  });
}
