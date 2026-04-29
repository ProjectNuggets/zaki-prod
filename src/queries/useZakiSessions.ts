import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAgentSessions, type AgentSession } from "@/lib/api";
import { normalizeZakiSessionKey } from "@/lib/zakiSessions";
import { useHiddenSessions } from "@/queries/useHiddenSessions";

export const zakiSessionKeys = {
  all: ["zaki-sessions"] as const,
};

/** Parse last_active which can be epoch seconds (number) or ISO string */
function parseLastActive(value: unknown): number {
  if (typeof value === "number") return value * 1000; // epoch seconds → ms
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }
  return 0;
}

export function useZakiSessions(enabled = true) {
  const { hidden } = useHiddenSessions();
  const query = useQuery({
    queryKey: zakiSessionKeys.all,
    queryFn: async (): Promise<AgentSession[]> => {
      try {
        const { data, response } = await listAgentSessions();
        if (!response.ok) {
          console.warn("[useZakiSessions] API returned", response.status);
          return [];
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
      } catch (err) {
        console.warn("[useZakiSessions] fetch failed:", err);
        return [];
      }
    },
    enabled,
    refetchInterval: 30_000,
    staleTime: 10_000,
    retry: 1,
  });

  const filtered = useMemo(() => {
    if (!query.data) return query.data;
    if (hidden.size === 0) return query.data;
    return query.data.filter(
      (s) =>
        !hidden.has(s.session_key) && !hidden.has(normalizeZakiSessionKey(s.session_key))
    );
  }, [query.data, hidden]);

  return { ...query, data: filtered } as typeof query;
}
