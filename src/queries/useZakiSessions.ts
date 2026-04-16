import { useQuery } from "@tanstack/react-query";
import { listAgentSessions, type AgentSession } from "@/lib/api";

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

/**
 * Normalize session key to a canonical form for deduplication.
 * "agent:zaki-bot:user:1:thread:main" and "agent:zaki-bot:user:1:main"
 * are the same session. Normalize both to "agent:zaki-bot:user:1:main".
 */
function canonicalSessionKey(key: string): string {
  return key.replace(/:thread:main$/, ":main");
}

/**
 * Extract the thread slug from a session key.
 * Handles all known formats:
 *   "agent:zaki-bot:user:1:main" → "main"
 *   "agent:zaki-bot:user:1:thread:abc" → "abc"
 *   "agent:zaki-bot:user:1:task:5" → "task:5"
 *   "agent:zaki-bot:user:1:thread:telegram:thread:123" → "telegram:thread:123"
 */
function extractThreadSlug(key: string): string {
  // Match :thread:<slug> pattern (everything after :thread:)
  const threadMatch = key.match(/:thread:(.+)$/);
  if (threadMatch?.[1]) return threadMatch[1];
  // Match :task:<id> pattern
  const taskMatch = key.match(/:task:(.+)$/);
  if (taskMatch?.[1]) return `task:${taskMatch[1]}`;
  // Match :main suffix
  if (key.endsWith(":main")) return "main";
  // Fallback: last segment
  const parts = key.split(":");
  return parts[parts.length - 1] || "main";
}

/** Exported so sidebar can use it for navigation */
export { extractThreadSlug };

export function useZakiSessions(enabled = true) {
  return useQuery({
    queryKey: zakiSessionKeys.all,
    queryFn: async (): Promise<AgentSession[]> => {
      try {
        const { data, response } = await listAgentSessions();
        if (!response.ok) {
          console.warn("[useZakiSessions] API returned", response.status);
          return [];
        }
        const raw = data?.sessions ?? [];

        // Filter out stub sessions that weren't created through the UI
        // (backend dev/test artifacts like task:N, req-N, codex-worklog-* with no messages)
        const visible = raw.filter((session) => {
          const slug = extractThreadSlug(session.session_key);
          // Always show "main" session (default entry)
          if (slug === "main") return true;
          const hasMessages = (session.message_count ?? 0) > 0;
          // Hide empty task/req artifacts regardless of age
          if (/^task:/.test(slug)) return hasMessages;
          if (/^req-/.test(slug)) return hasMessages;
          // Everything else must have at least one message to show up
          return hasMessages;
        });

        // Deduplicate by canonical key, preferring live sessions then higher message count
        const byKey = new Map<string, AgentSession>();
        for (const session of visible) {
          const canonical = canonicalSessionKey(session.session_key);
          const existing = byKey.get(canonical);
          if (!existing) {
            byKey.set(canonical, session);
          } else if (session.live && !existing.live) {
            // Prefer live over persisted
            byKey.set(canonical, session);
          } else if (
            !existing.live &&
            !session.live &&
            (session.message_count ?? 0) > (existing.message_count ?? 0)
          ) {
            // Between two persisted, keep the one with more messages
            byKey.set(canonical, session);
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
}
