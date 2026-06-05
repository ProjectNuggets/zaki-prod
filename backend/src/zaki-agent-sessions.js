import { DEFAULT_THREAD_LABEL, isDefaultThreadLabel } from "./thread-auto-title.js";

const LEGACY_MAIN_RE = /^agent:zaki-bot:user:([^:]+):main$/;
const CANONICAL_RE = /^agent:zaki-bot:user:([^:]+):(thread|task|cron):(.+)$/;

export function buildCanonicalZakiThreadSessionKey(userId, threadId = "main") {
  const safeUserId = String(userId || "").trim();
  const safeThreadId = String(threadId || "").trim() || "main";
  return `agent:zaki-bot:user:${safeUserId}:thread:${safeThreadId}`;
}

export function normalizeZakiSessionKey(sessionKey) {
  const trimmed = String(sessionKey || "").trim();
  const legacy = trimmed.match(LEGACY_MAIN_RE);
  if (legacy?.[1]) {
    return buildCanonicalZakiThreadSessionKey(legacy[1], "main");
  }
  return trimmed;
}

export function parseZakiSessionKey(sessionKey) {
  const normalized = normalizeZakiSessionKey(sessionKey);
  const canonical = normalized.match(CANONICAL_RE);
  if (!canonical) {
    return {
      raw: String(sessionKey || ""),
      normalized,
      userId: null,
      lane: "unknown",
      value: null,
      threadId: null,
    };
  }
  const lane = canonical[2];
  const value = canonical[3] || null;
  return {
    raw: String(sessionKey || ""),
    normalized,
    userId: canonical[1] || null,
    lane,
    value,
    threadId: lane === "thread" ? value : null,
  };
}

export function isThreadLaneZakiSessionKey(sessionKey) {
  return parseZakiSessionKey(sessionKey).lane === "thread";
}

function parseTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1_000_000_000_000 ? value : value * 1000;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function normalizeTitle(value) {
  const title = String(value || "").trim();
  return title || "";
}

function looksLikeDateTitle(value) {
  const title = normalizeTitle(value);
  if (!title) return false;
  if (/^\d{4}-\d{1,2}-\d{1,2}(?:[ t]\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?z?)?$/i.test(title)) {
    return true;
  }
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}(?:,\s*)?(?:\d{1,2}:\d{2}\s*(?:am|pm)?)?$/i.test(title)) {
    return true;
  }
  if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,\s*)?(?:\d{4})?(?:,\s*)?(?:\d{1,2}:\d{2}\s*(?:am|pm)?)?$/i.test(title)) {
    return true;
  }
  return false;
}

function looksLikeInternalGeneratedTitle(value) {
  const title = normalizeTitle(value);
  if (!title) return false;
  if (/^thread-\d+$/i.test(title)) {
    return true;
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(title)) {
    return true;
  }
  if (/^[0-9a-hjkmnp-tv-z]{12,32}$/i.test(title) && /\d/.test(title)) {
    return true;
  }
  if (/^anon-\d{8,}$/i.test(title)) {
    return true;
  }
  if (/^codex-[a-z0-9_-]*\d{8,}$/i.test(title)) {
    return true;
  }
  return false;
}

export function isPlaceholderZakiSessionTitle(value) {
  const title = normalizeTitle(value);
  if (!title) return true;
  if (isDefaultThreadLabel(title)) return true;
  const lower = title.toLowerCase();
  return (
    lower === "session" ||
    lower === "untitled" ||
    looksLikeDateTitle(title) ||
    looksLikeInternalGeneratedTitle(title)
  );
}

export function overlayZakiAgentSessionTitles({ upstreamSessions = [], localThreads = [] }) {
  const normalized = normalizeZakiAgentBackendSessions(upstreamSessions);
  const localTitles = new Map();

  for (const local of Array.isArray(localThreads) ? localThreads : []) {
    const sessionKey = normalizeZakiSessionKey(local?.session_key);
    if (!sessionKey) continue;
    const parsed = parseZakiSessionKey(sessionKey);
    const localTitle = normalizeTitle(local?.title);
    if (parsed.lane === "thread" && localTitle && !isPlaceholderZakiSessionTitle(localTitle)) {
      localTitles.set(sessionKey, localTitle);
    }
  }

  return normalized.map((session) => {
    const sessionKey = normalizeZakiSessionKey(session?.session_key);
    const localTitle = localTitles.get(sessionKey);
    if (!localTitle || !isPlaceholderZakiSessionTitle(session?.title)) return session;
    return {
      ...session,
      title: localTitle,
    };
  });
}

function normalizedProbeCandidate(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function isInternalProbeZakiAgentSession({ sessionKey, title }) {
  const parsed = parseZakiSessionKey(sessionKey);
  if (parsed.lane !== "thread") return false;
  const titleCandidate = normalizedProbeCandidate(title);
  const idCandidates = [
    normalizedProbeCandidate(parsed.threadId),
    normalizedProbeCandidate(parsed.value),
  ].filter(Boolean);

  if (
    idCandidates.some((candidate) => {
      if (/(^|[-_])(bench|smoke|test)([-_]|$)/i.test(candidate)) return true;
      if (/^(mcp|dtaas|bench|test|smoke)[-_]/i.test(candidate)) return true;
      return false;
    })
  ) {
    return true;
  }

  return [titleCandidate, ...idCandidates].filter(Boolean).some((candidate) => {
    if (/^bench[-_]/i.test(candidate)) return true;
    if (/^r\d{1,3}[-_][a-z0-9][a-z0-9_-]*$/i.test(candidate)) return true;
    if (/^test[-_][a-z0-9][a-z0-9_-]*$/i.test(candidate)) return true;
    if (/^(codex|zaki)[-_].*(e2e|smoke|closeout|qa|test)/i.test(candidate)) return true;
    if (/^k\d+[-_].*smoke/i.test(candidate)) return true;
    if (/^health check\b/i.test(candidate)) return true;
    if (/^reply exactly[:\s]/i.test(candidate)) return true;
    if (/^smoke test\b/i.test(candidate)) return true;
    if (/^ui audit ping\b/i.test(candidate)) return true;
    if (/^approval smoke\b/i.test(candidate)) return true;
    if (/^approval reload proof\b/i.test(candidate)) return true;
    if (/^trust audit artifact\b/i.test(candidate)) return true;
    if (/pong_zaki/i.test(candidate)) return true;
    return false;
  });
}

export function listPublicZakiAgentSessions({ upstreamSessions = [], localThreads = [] }) {
  return overlayZakiAgentSessionTitles({ upstreamSessions, localThreads })
    .filter((session) => {
      const sessionKey = normalizeZakiSessionKey(session?.session_key);
      const parsed = parseZakiSessionKey(sessionKey);
      if (parsed.lane !== "thread" || !parsed.threadId) return false;
      return !isInternalProbeZakiAgentSession({ sessionKey, title: session?.title });
    })
    .sort((a, b) => {
      const bTs = parseTimestamp(b?.last_active ?? b?.created_at);
      const aTs = parseTimestamp(a?.last_active ?? a?.created_at);
      return bTs - aTs;
    });
}

export function normalizeZakiAgentBackendSessions(upstreamSessions = []) {
  const byKey = new Map();

  for (const upstream of Array.isArray(upstreamSessions) ? upstreamSessions : []) {
    const sessionKey = normalizeZakiSessionKey(upstream?.session_key);
    if (!sessionKey) continue;
    const existing = byKey.get(sessionKey);
    const normalized = {
      ...upstream,
      session_key: sessionKey,
      title: normalizeTitle(upstream?.title) || undefined,
    };
    if (!existing) {
      byKey.set(sessionKey, normalized);
      continue;
    }
    const existingTs = parseTimestamp(existing?.last_active ?? existing?.created_at);
    const nextTs = parseTimestamp(normalized?.last_active ?? normalized?.created_at);
    if (nextTs > existingTs || (normalized.live === true && existing.live !== true)) {
      byKey.set(sessionKey, normalized);
    }
  }

  return Array.from(byKey.values()).sort((a, b) => {
    const bTs = parseTimestamp(b?.last_active ?? b?.created_at);
    const aTs = parseTimestamp(a?.last_active ?? a?.created_at);
    return bTs - aTs;
  });
}

export function buildDefaultZakiThreadTitle(existingTitle) {
  const normalized = normalizeTitle(existingTitle);
  return normalized || DEFAULT_THREAD_LABEL;
}
