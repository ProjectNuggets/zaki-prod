import { useQuery } from "@tanstack/react-query";
import { fetchBrainSearch, type BrainSearchResponse } from "@/lib/api";

export const brainSearchKeys = {
  results: (userId: string, q: string) => ["brain", "search", userId, q] as const,
};

/**
 * M2: Fetches matching memories for a search query.
 *
 * - Only fires when `q` is non-empty (2+ chars to avoid hammering on every keystroke).
 * - Falls back gracefully to null while backend isn't live (404 → null).
 *   The graph's local string filter (matchesSearch) continues to work in fallback mode.
 * - `staleTime: 10_000` — search results are short-lived; re-fetch after 10s if re-focused.
 * - `retry: false` — don't hammer a 404 endpoint.
 *
 * Swap: when M2 backend lands, remove the try/catch null-return and let errors propagate.
 */
export function useBrainSearch(userId: string, q: string) {
  return useQuery<BrainSearchResponse | null>({
    queryKey: brainSearchKeys.results(userId, q),
    queryFn: async () => {
      if (!q || q.length < 2) return null;
      try {
        return await fetchBrainSearch(userId, q);
      } catch {
        // 404 or not-yet-live backend — local matchesSearch filter stays active
        return null;
      }
    },
    enabled: !!userId && q.length >= 2,
    staleTime: 10_000,
    retry: false,
  });
}
