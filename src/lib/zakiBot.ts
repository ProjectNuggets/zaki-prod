import type { Space, Thread } from "@/types";

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
  const parts = key.split(":");
  const last = parts[parts.length - 1];
  if (last === "main") return "Main session";
  return last || key;
}

/**
 * Session title overrides (local, per-browser).
 * Stored in localStorage because the backend doesn't expose a rename
 * endpoint yet. Once PATCH /api/agent/sessions/:key lands, migrate to that.
 */
const SESSION_TITLE_KEY = "zaki:session-titles:v1";

function readSessionTitles(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SESSION_TITLE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeSessionTitles(map: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SESSION_TITLE_KEY, JSON.stringify(map));
  } catch {
    // Storage full or disabled. Best-effort only.
  }
}

/** Get a custom title for a session key. Returns null if none set. */
export function getSessionTitleOverride(sessionKey: string): string | null {
  if (!sessionKey) return null;
  const titles = readSessionTitles();
  const value = titles[sessionKey];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

/** Set a custom title for a session. Empty/whitespace removes the override. */
export function setSessionTitleOverride(sessionKey: string, title: string) {
  if (!sessionKey) return;
  const titles = readSessionTitles();
  const trimmed = String(title || "").trim();
  if (trimmed) {
    titles[sessionKey] = trimmed;
  } else {
    delete titles[sessionKey];
  }
  writeSessionTitles(titles);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("zaki:session-titles-changed"));
  }
}

/** Delete the local title override (e.g. after backend delete). */
export function clearSessionTitleOverride(sessionKey: string) {
  setSessionTitleOverride(sessionKey, "");
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
