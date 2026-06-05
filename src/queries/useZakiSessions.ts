import { useQuery } from "@tanstack/react-query";
import { listAgentSessions, type AgentSession } from "@/lib/api";
import { normalizeZakiSessionKey, parseZakiSessionTimestampMs } from "@/lib/zakiSessions";

export const zakiSessionKeys = {
  all: ["zaki-sessions"] as const,
};

function parseLastActive(value: unknown): number {
  return parseZakiSessionTimestampMs(value);
}

export function useZakiSessions(enabled = true) {
  return useQuery({
    queryKey: zakiSessionKeys.all,
    queryFn: async (): Promise<AgentSession[]> => {
      const { data, response } = await listAgentSessions();
      if (!response.ok) {
        throw new Error(`Agent sessions unavailable (${response.status})`);
      }
      const raw = data?.sessions ?? [];

      // Deduplicate by canonical key, preferring live sessions then higher message count
      const byKey = new Map<string, AgentSession>();
      for (const session of raw) {
        const canonical = normalizeZakiSessionKey(session.session_key);
        const existing = byKey.get(canonical);
        if (!existing) {
          byKey.set(canonical, { ...session, session_key: canonical });
        } else if (session.live && !existing.live) {
          // Prefer live over persisted
          byKey.set(canonical, { ...session, session_key: canonical });
        } else if (
          !existing.live &&
          !session.live &&
          (session.message_count ?? 0) > (existing.message_count ?? 0)
        ) {
          // Between two persisted, keep the one with more messages
          byKey.set(canonical, { ...session, session_key: canonical });
        }
      }

      return Array.from(byKey.values()).sort(
        (a, b) => parseLastActive(b.last_active) - parseLastActive(a.last_active)
      );
    },
    enabled,
    refetchInterval: 30_000,
    staleTime: 10_000,
    retry: 1,
  });
}
