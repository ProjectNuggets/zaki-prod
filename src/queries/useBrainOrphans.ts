import { useQuery } from "@tanstack/react-query";
import { fetchBrainOrphans, type BrainOrphansResponse } from "@/lib/api";

export function useBrainOrphans(userId: string, opts?: { limit?: number; enabled?: boolean }) {
  return useQuery<BrainOrphansResponse>({
    queryKey: ["brain", "orphans", userId, opts?.limit],
    queryFn: () => fetchBrainOrphans(userId, { limit: opts?.limit }),
    enabled: !!userId && opts?.enabled !== false,
    staleTime: 30_000,
  });
}
