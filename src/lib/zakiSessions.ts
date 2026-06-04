import { DEFAULT_THREAD_LABEL, isDefaultThreadLabel } from "./threadTitles";

export type ZakiSessionLane = "thread" | "task" | "cron" | "unknown";

export interface ParsedZakiSessionKey {
  raw: string;
  normalized: string;
  userId: string | null;
  lane: ZakiSessionLane;
  value: string | null;
  threadId: string | null;
}

const LEGACY_MAIN_RE = /^agent:zaki-bot:user:([^:]+):main$/;
const CANONICAL_RE = /^agent:zaki-bot:user:([^:]+):(thread|task|cron):(.+)$/;

export function buildCanonicalZakiThreadSessionKey(userId: string, threadId = "main") {
  const safeUserId = String(userId || "").trim();
  const safeThreadId = String(threadId || "").trim() || "main";
  return `agent:zaki-bot:user:${safeUserId}:thread:${safeThreadId}`;
}

export function normalizeZakiSessionKey(key: string) {
  const trimmed = String(key || "").trim();
  const legacy = trimmed.match(LEGACY_MAIN_RE);
  if (legacy?.[1]) {
    return buildCanonicalZakiThreadSessionKey(legacy[1], "main");
  }
  return trimmed;
}

export function parseZakiSessionKey(key: string): ParsedZakiSessionKey {
  const normalized = normalizeZakiSessionKey(key);
  const canonical = normalized.match(CANONICAL_RE);
  if (!canonical) {
    return {
      raw: String(key || ""),
      normalized,
      userId: null,
      lane: "unknown",
      value: null,
      threadId: null,
    };
  }

  const lane = canonical[2] as ZakiSessionLane;
  const value = canonical[3] || null;

  return {
    raw: String(key || ""),
    normalized,
    userId: canonical[1] || null,
    lane,
    value,
    threadId: lane === "thread" ? value : null,
  };
}

export function isThreadLaneZakiSessionKey(key: string) {
  return parseZakiSessionKey(key).lane === "thread";
}

export function extractThreadSlugFromSessionKey(key: string) {
  const parsed = parseZakiSessionKey(key);
  if (parsed.lane === "thread") return parsed.threadId || "main";
  return null;
}

/**
 * Heuristic — does the value look like an opaque random identifier
 * (UUID, base32, etc.) rather than a human-meaningful word? Used to
 * decide whether to show the raw threadId or a date-stamped fallback.
 */
function looksLikeOpaqueId(value: string): boolean {
  if (!value) return false;
  if (value.length >= 16) return true;
  return /^[a-f0-9]{8,}$|^[A-Z0-9]{8,}$/i.test(value);
}

function looksLikeDateTitle(value: string): boolean {
  const title = String(value || "").trim();
  if (!title) return false;
  if (/^\d{4}-\d{1,2}-\d{1,2}(?:[ t]\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?z?)?$/i.test(title)) {
    return true;
  }
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}(?:,\s*)?(?:\d{1,2}:\d{2}\s*(?:am|pm)?)?$/i.test(title)) {
    return true;
  }
  return /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,\s*)?(?:\d{4})?(?:,\s*)?(?:\d{1,2}:\d{2}\s*(?:am|pm)?)?$/i.test(title);
}

function isPlaceholderSessionTitle(value: string): boolean {
  const title = String(value || "").trim();
  if (!title) return true;
  if (isDefaultThreadLabel(title)) return true;
  const lower = title.toLowerCase();
  return lower === "session" || lower === "untitled" || looksLikeDateTitle(title);
}

function formatShortDate(input: string | number | null | undefined): string | null {
  if (input == null) return null;
  const d = typeof input === "number" ? new Date(input) : new Date(String(input));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatZakiSessionFallbackLabel(
  key: string,
  opts?: { createdAt?: string | number | null },
): string {
  const parsed = parseZakiSessionKey(key);
  const dateStamp = formatShortDate(opts?.createdAt);
  if (parsed.lane === "thread") {
    if (!parsed.threadId || parsed.threadId === "main") return "Main";
    // Opaque ids and date stamps are internal implementation detail.
    // The backend overlays first-interaction titles for real sessions;
    // until that arrives, show a neutral new-thread state.
    if (looksLikeOpaqueId(parsed.threadId)) return "New thread";
    return parsed.threadId;
  }
  if (parsed.lane === "task") {
    return parsed.value ? `Task ${parsed.value}` : "Task";
  }
  if (parsed.lane === "cron") {
    return parsed.value ? `Cron ${parsed.value}` : "Cron";
  }
  // Unknown lane (non-canonical key shape). Use the trailing segment
  // when it's something the user might recognize, otherwise fall back
  // to the date stamp so rows are at least uniquely distinguishable.
  const tail = key.split(":").pop()?.trim();
  if (tail && tail !== "main" && !looksLikeOpaqueId(tail)) return tail;
  if (dateStamp) return dateStamp;
  return "Session";
}

export function formatZakiSessionLabel({
  sessionKey,
  title,
  createdAt,
}: {
  sessionKey: string;
  title?: string | null;
  createdAt?: string | number | null;
}) {
  const normalizedTitle = String(title || "").trim();
  if (normalizedTitle && !isPlaceholderSessionTitle(normalizedTitle)) {
    return normalizedTitle;
  }
  if (normalizedTitle === DEFAULT_THREAD_LABEL) {
    return normalizedTitle;
  }
  return formatZakiSessionFallbackLabel(sessionKey, { createdAt });
}
