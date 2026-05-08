import { useQuery } from "@tanstack/react-query";
import { fetchBrainMe, type BrainMeResponse } from "@/lib/api";

// Audit (2026-05-08) — canonical "you" anchor for the brain page.
// Backend picks the heuristic (highest-importance kind=core with
// identity metadata). FE consumes a stable BrainMeResponse.
export function useBrainMe(userId: string) {
  return useQuery<BrainMeResponse | null>({
    queryKey: ["brain", "me", userId],
    queryFn: () => fetchBrainMe(userId),
    enabled: !!userId,
    staleTime: 60_000,
  });
}
