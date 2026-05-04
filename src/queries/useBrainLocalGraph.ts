import { useQuery } from "@tanstack/react-query";
import { fetchBrainLocalGraph, type BrainLocalGraphResponse } from "@/lib/api";

export function useBrainLocalGraph(
  userId: string,
  opts: { center_key: string | null; depth?: number; max_nodes?: number },
) {
  return useQuery<BrainLocalGraphResponse>({
    queryKey: [
      "brain",
      "local-graph",
      userId,
      opts.center_key,
      opts.depth ?? 1,
      opts.max_nodes ?? 50,
    ],
    queryFn: () =>
      fetchBrainLocalGraph(userId, {
        center_key: opts.center_key as string,
        depth: opts.depth,
        max_nodes: opts.max_nodes,
      }),
    enabled: !!userId && !!opts.center_key,
    staleTime: 30_000,
  });
}
