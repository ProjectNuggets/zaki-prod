import { useQuery } from "@tanstack/react-query";
import { fetchBrainDiff, type BrainDiffResponse } from "@/lib/api";

export function useBrainDiff(
  userId: string,
  opts: { date: string | null; window_days?: number; enabled?: boolean },
) {
  return useQuery<BrainDiffResponse>({
    queryKey: ["brain", "diff", userId, opts.date, opts.window_days ?? 1],
    queryFn: () =>
      fetchBrainDiff(userId, { date: opts.date as string, window_days: opts.window_days }),
    enabled: !!userId && !!opts.date && opts.enabled !== false,
    staleTime: 30_000,
  });
}
