import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchBrainTimeline, type BrainTimelineResponse } from "@/lib/api";

export function useBrainTimeline(userId: string, opts?: { limit?: number; kind?: string }) {
  return useInfiniteQuery<BrainTimelineResponse>({
    queryKey: ["brain", "timeline", userId, opts ?? {}],
    queryFn: ({ pageParam }) =>
      fetchBrainTimeline(userId, {
        cursor: pageParam as string | undefined,
        limit: opts?.limit,
        kind: opts?.kind,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled: !!userId,
  });
}
