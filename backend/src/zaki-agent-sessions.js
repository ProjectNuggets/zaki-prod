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

function chooseLastActive(...values) {
  let chosen = null;
  let chosenTs = 0;
  for (const value of values) {
    const ts = parseTimestamp(value);
    if (ts > chosenTs) {
      chosen = value ?? null;
      chosenTs = ts;
    }
  }
  return chosen;
}

function normalizeTitle(value) {
  const title = String(value || "").trim();
  return title || "";
}

export function mergeZakiAgentSessions({ upstreamSessions = [], localThreads = [] }) {
  const merged = new Map();

  for (const upstream of Array.isArray(upstreamSessions) ? upstreamSessions : []) {
    const sessionKey = normalizeZakiSessionKey(upstream?.session_key);
    if (!sessionKey) continue;
    merged.set(sessionKey, {
      ...upstream,
      session_key: sessionKey,
      title: normalizeTitle(upstream?.title) || undefined,
    });
  }

  for (const local of Array.isArray(localThreads) ? localThreads : []) {
    const sessionKey = normalizeZakiSessionKey(local?.session_key);
    if (!sessionKey) continue;
    const parsed = parseZakiSessionKey(sessionKey);
    const existing = merged.get(sessionKey) || null;
    const localTitle = normalizeTitle(local?.title);
    const shouldUseLocalTitle =
      parsed.lane === "thread" && localTitle && !isDefaultThreadLabel(localTitle);

    merged.set(sessionKey, {
      ...existing,
      session_key: sessionKey,
      title: shouldUseLocalTitle
        ? localTitle
        : normalizeTitle(existing?.title) || localTitle || undefined,
      created_at: local?.created_at ?? existing?.created_at,
      last_active: chooseLastActive(local?.last_active, existing?.last_active),
      message_count: Math.max(local?.message_count ?? 0, existing?.message_count ?? 0),
      token_count: existing?.token_count ?? undefined,
      live: existing?.live === true,
    });
  }

  return Array.from(merged.values()).sort(
    (a, b) => parseTimestamp(b?.last_active) - parseTimestamp(a?.last_active),
  );
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
