import type { Space, Thread } from "@/types";
import { formatZakiSessionFallbackLabel } from "@/lib/zakiSessions";

export const ZAKI_BOT_SPACE_ID = "zaki-bot";
export const ZAKI_BOT_THREAD_ID = "main";
export const ZAKI_BOT_LABEL = "ZAKI";
export const ZAKI_BOT_THREAD_LABEL = "Direct chat";
export const ZAKI_BOT_DESCRIPTION = "Your personal AI partner";

export function createZakiBotThread(): Thread {
  return {
    id: ZAKI_BOT_THREAD_ID,
    label: ZAKI_BOT_THREAD_LABEL,
  };
}

export function createZakiBotSpace(): Space {
  return {
    id: ZAKI_BOT_SPACE_ID,
    title: ZAKI_BOT_LABEL,
    description: ZAKI_BOT_DESCRIPTION,
    icon: "sparkles",
    fixed: true,
    threads: [createZakiBotThread()],
  };
}

export function isZakiBotSpaceId(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase() === ZAKI_BOT_SPACE_ID;
}

/** Extract a human-readable label from a session key.
 *  e.g. "agent:zaki-bot:user:42:thread:abc" → "abc"
 *       "agent:zaki-bot:user:42:main" → "Main session" */
export function shortSessionLabel(key: string) {
  return formatZakiSessionFallbackLabel(key);
}

/** Format a date value as relative time (e.g. "3m ago", "2h ago").
 *  Handles both epoch seconds (number) and ISO 8601 strings. */
export function formatSessionTime(value?: string | number | null) {
  if (value == null) return "";
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}
