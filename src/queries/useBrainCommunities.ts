import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BrainRecomputeConflictError,
  fetchBrainCommunities,
  postBrainCommunitiesRecompute,
  type BrainCommunitiesRecomputeResponse,
  type BrainCommunitiesResponse,
} from "@/lib/api";

export function useBrainCommunities(userId: string) {
  return useQuery<BrainCommunitiesResponse>({
    queryKey: ["brain", "communities", userId],
    queryFn: () => fetchBrainCommunities(userId),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useBrainCommunitiesRecompute(userId: string) {
  const qc = useQueryClient();
  return useMutation<BrainCommunitiesRecomputeResponse, Error>({
    mutationFn: () => postBrainCommunitiesRecompute(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brain", "communities", userId] });
      qc.invalidateQueries({ queryKey: ["brain", "graph", userId] });
    },
  });
}

export { BrainRecomputeConflictError };
