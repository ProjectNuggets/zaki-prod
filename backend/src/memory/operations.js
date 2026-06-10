/**
 * Memory Operations - Clean, scalable CRUD (S-tier)
 * 
 * Graceful degradation: Works with or without embeddings
 */

import crypto from "node:crypto";
import { z } from "zod";
import { dbQuery, dbGet, dbAll, hasPgVector, withDbTransaction } from "../db.js";
import { callNovaTypChat, parseJsonObjectFromText } from "./nova-chat.js";
import {
  buildMemoryCapturePolicyConfig,
  normalizeMemoryPolicy,
} from "./policy.js";

// ============================================================================
// Storage Detection
// ============================================================================

export async function checkStorage() {
  return await getCachedStorageSupport(false);
}

function resolveStorageCacheTtlMs() {
  const raw = Number.parseInt(String(process.env.ZAKI_MEMORY_STORAGE_CACHE_TTL_MS || ""), 10);
  if (!Number.isFinite(raw)) return 30_000;
  return Math.min(300_000, Math.max(1_000, raw));
}

const STORAGE_CACHE_TTL_MS = resolveStorageCacheTtlMs();
const storageSupportCache = {
  value: null,
  checkedAt: 0,
};
let storageSupportProbe = hasPgVector;

async function getCachedStorageSupport(forceRefresh = false) {
  const now = Date.now();
  if (
    !forceRefresh &&
    typeof storageSupportCache.value === "boolean" &&
    now - storageSupportCache.checkedAt < STORAGE_CACHE_TTL_MS
  ) {
    return storageSupportCache.value;
  }
  const next = await storageSupportProbe();
  storageSupportCache.value = next;
  storageSupportCache.checkedAt = now;
  return next;
}

export async function refreshStorageSupportCache() {
  return await getCachedStorageSupport(true);
}

export function setStorageSupportProbeForTests(probe) {
  storageSupportProbe = typeof probe === "function" ? probe : hasPgVector;
  storageSupportCache.value = null;
  storageSupportCache.checkedAt = 0;
}

function resolveTimeoutMs(envName, fallbackMs) {
  const raw = Number.parseInt(String(process.env[envName] || ""), 10);
  if (!Number.isFinite(raw)) return fallbackMs;
  return Math.min(30_000, Math.max(500, raw));
}

const RELEVANCE_TIMEOUT_MS = resolveTimeoutMs("ZAKI_MEMORY_RELEVANCE_TIMEOUT_MS", 8_000);
const EMBEDDING_TIMEOUT_MS = resolveTimeoutMs("ZAKI_MEMORY_EMBEDDING_TIMEOUT_MS", 4_500);

function isChatMemoryVectorEnabled() {
  return String(process.env.ZAKI_CHAT_MEMORY_VECTOR_ENABLED || "").toLowerCase() !== "false";
}

function resolveChatMemorySemanticMin() {
  const raw = Number.parseFloat(String(process.env.ZAKI_CHAT_MEMORY_SEMANTIC_MIN || ""));
  // Default 0.10: all-MiniLM-L6-v2 produces low ABSOLUTE cosines for short
  // query↔fact pairs (correct matches ~0.25-0.36, weakest ~0.10; noise ~0.06-0.12).
  // A higher floor (the old 0.5) filtered out every correct match and silently
  // disabled semantic recall. Relevance is enforced by cosine ORDERING + top-k cap,
  // not this floor — which only drops near-zero garbage. Re-tune if the embedder model changes.
  if (!Number.isFinite(raw)) return 0.1;
  return Math.min(1, Math.max(0, raw));
}

function resolveChatMemoryEmbedTimeoutMs() {
  return resolveTimeoutMs("ZAKI_CHAT_MEMORY_EMBED_TIMEOUT_MS", 1_200);
}

// Always-on "feels known" identity core: a tiny, high-confidence, deterministic
// profile injected every chat turn. Query-independent — reuses the existing
// diverse-selection + bucketed-render machinery, gated by the confidence floor.
function resolveIdentityCoreMinConfidence() {
  const raw = Number.parseFloat(
    String(process.env.ZAKI_CHAT_MEMORY_IDENTITY_CORE_MIN_CONFIDENCE || "")
  );
  if (!Number.isFinite(raw)) return 0.85;
  return Math.min(1, Math.max(0, raw));
}

const IDENTITY_CORE_MIN_CONFIDENCE = resolveIdentityCoreMinConfidence();
const IDENTITY_CORE_MAX_ITEMS = 6;
const IDENTITY_CORE_MAX_CHARS = 350;

function isIdentityCoreEnabled() {
  return (
    String(process.env.ZAKI_CHAT_MEMORY_IDENTITY_CORE_ENABLED || "").toLowerCase() !== "false"
  );
}

function shouldDebug() {
  return String(process.env.MEMORY_DEBUG || "").toLowerCase() === "true";
}

function isAbortError(error) {
  if (!error || typeof error !== "object") return false;
  return error.name === "AbortError";
}

// Wraps an arbitrary promise with a timeout. Used to bound embedding calls on the
// live chat retrieval path so a slow provider can never stall the response.
async function withTimeout(promise, { timeoutMs, label }) {
  let timer = null;
  const timeoutPromise = new Promise((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
    if (typeof timer.unref === "function") {
      timer.unref();
    }
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function fetchWithTimeout(url, options, { timeoutMs, label }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  if (typeof timeout.unref === "function") {
    timeout.unref();
  }
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(`${label} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeUserId(userId) {
  return String(userId || "").trim().toLowerCase();
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripPreferenceFillers(value) {
  return String(value || "")
    .replace(/\b(?:you know|kind of|sort of|basically|i guess|you know what i mean)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CANONICAL_ENTITY_REPLACEMENTS = [
  { regex: /\bryadh\b/gi, value: "Riyadh" },
  { regex: /\briyadh\b/gi, value: "Riyadh" },
  { regex: /\bdamascus\b/gi, value: "Damascus" },
  { regex: /\bhamburg\b/gi, value: "Hamburg" },
  { regex: /\bcairo\b/gi, value: "Cairo" },
  { regex: /\bdubai\b/gi, value: "Dubai" },
  { regex: /\balgeria\b/gi, value: "Algeria" },
];

function canonicalizeEntityValue(value) {
  let next = String(value || "").replace(/\s+/g, " ").trim();
  if (!next) return "";
  for (const replacement of CANONICAL_ENTITY_REPLACEMENTS) {
    next = next.replace(replacement.regex, replacement.value);
  }
  return next.trim();
}

const FAST_CONTEXT_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "for", "with", "from", "that", "this",
  "what", "which", "who", "how", "when", "where", "why", "are", "is", "am",
  "was", "were", "be", "been", "being", "to", "of", "in", "on", "at", "by",
  "my", "me", "i", "im", "i'm", "it", "its", "about", "given", "would", "could",
  "should", "can", "you", "your", "we", "our", "they", "their",
  "انا", "أنا", "عندي", "لدي", "عن", "في", "من", "على", "مع", "الى", "إلى", "ما",
  "ماذا", "كيف", "هل", "هذه", "هذا", "ذلك", "تلك", "انا", "لي", "مني", "عني",
]);

function tokenizeFastContext(value) {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .map((token) => {
      const lower = token.toLowerCase();
      if (["live", "lives", "living"].includes(lower)) return "live";
      if (["travel", "travels", "traveling", "travelling", "traveled", "travelled"].includes(lower)) {
        return "travel";
      }
      if (["riyadh", "ryadh"].includes(lower)) return "riyadh";
      if (["prefer", "prefers", "preference", "preferences"].includes(lower)) return "prefer";
      if (["work", "works", "working"].includes(lower)) return "work";
      return singularizeEnglishWord(lower);
    })
    .filter((token) => {
      if (!token) return false;
      if (FAST_CONTEXT_STOPWORDS.has(token)) return false;
      if (/^[a-z0-9]+$/i.test(token) && token.length < 3) return false;
      if (/^[\u0600-\u06FF]+$/u.test(token) && token.length < 2) return false;
      return true;
    });
}

function scoreFastContextMemory(memory, queryTokens) {
  const contentTokens = new Set(tokenizeFastContext(memory?.content || ""));
  if (contentTokens.size === 0 || queryTokens.length === 0) return 0;

  let overlap = 0;
  for (const token of queryTokens) {
    if (contentTokens.has(token)) overlap += 1;
  }
  if (overlap === 0) return 0;

  const domain = getMemoryConflictDomain(memory);
  let score = overlap * 10;
  if (domain === "identity") score += 6;
  if (domain === "preference") score += 5;
  if (domain === "constraint") score += 7;
  score += Math.round(getMemoryImportanceScore(memory) * 4);
  score += Math.round(getMemoryConfidenceScore(memory) * 3);
  return score;
}

const MAX_STORED_MEMORY_CHARS = 500;
const MAX_METADATA_JSON_CHARS = 2000;
const ALLOWED_MEMORY_TYPES = new Set([
  "context",
  "fact",
  "preference",
  "emotion",
  "event",
  "goal",
  "relationship",
  "struggle",
]);
const ALLOWED_MEMORY_STATUSES = new Set(["active", "outdated"]);

function normalizeStoredContent(value) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= MAX_STORED_MEMORY_CHARS) return normalized;
  return normalized.slice(0, MAX_STORED_MEMORY_CHARS).trim();
}

function normalizeStoredType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "context";
  return ALLOWED_MEMORY_TYPES.has(normalized) ? normalized : "context";
}

function normalizeMemoryStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "active";
  return ALLOWED_MEMORY_STATUSES.has(normalized) ? normalized : "active";
}

function sanitizeStoredMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  let serialized = "";
  try {
    serialized = JSON.stringify(value);
  } catch {
    return {};
  }
  if (!serialized || serialized.length > MAX_METADATA_JSON_CHARS) {
    return {};
  }

  const safe = {};
  if (typeof value.conflictKey === "string" && value.conflictKey.trim()) {
    safe.conflictKey = value.conflictKey.trim().slice(0, 180);
  }
  if (value.polarity !== undefined && value.polarity !== null) {
    const lower = String(value.polarity).toLowerCase();
    if (["positive", "negative", "neutral", "1", "-1", "0"].includes(lower)) {
      safe.polarity = value.polarity;
    }
  }
  if (typeof value.userVerified === "boolean") {
    safe.userVerified = value.userVerified;
  }
  if (typeof value.editedFrom === "string" && value.editedFrom.trim()) {
    safe.editedFrom = value.editedFrom.trim().slice(0, 120);
  }
  if (typeof value.source === "string" && value.source.trim()) {
    safe.source = value.source.trim().toLowerCase().slice(0, 64);
  }
  return safe;
}

const EN_UNCOUNTABLE_WORDS = new Set([
  "news",
  "series",
  "species",
  "chess",
  "physics",
  "mathematics",
  "economics",
]);

function singularizeEnglishWord(word) {
  const lower = String(word || "").toLowerCase();
  if (!/^[a-z]+$/.test(lower)) return word;
  if (EN_UNCOUNTABLE_WORDS.has(lower)) return lower;
  if (lower.length <= 3) return lower;
  if (lower.endsWith("ies") && lower.length > 4) {
    return `${lower.slice(0, -3)}y`;
  }
  if (/(ches|shes|sses|xes|zes)$/.test(lower) && lower.length > 4) {
    return lower.slice(0, -2);
  }
  if (lower.endsWith("s") && !/(ss|us|is)$/.test(lower)) {
    return lower.slice(0, -1);
  }
  return lower;
}

function normalizePreferenceValue(value) {
  const normalized = normalizeText(stripPreferenceFillers(value));
  if (!normalized) return normalized;
  const withoutEnglishArticles = normalized.replace(/^(the|a|an)\s+/, "");
  const withoutInfinitivePrefix = withoutEnglishArticles
    .replace(/^to\s+/, "")
    .replace(/\bto\b$/i, "");
  const words = withoutInfinitivePrefix
    .split(" ")
    .map((word) => word.replace(/^ال/, ""))
    .filter(Boolean);

  if (words.length === 0) return "";

  const normalizedWords = [...words];
  normalizedWords[normalizedWords.length - 1] = singularizeEnglishWord(normalizedWords[normalizedWords.length - 1]);

  return normalizedWords.join(" ").trim();
}

function normalizeStoredMemoryContent(content, type = "context", metadata = null) {
  const normalizedType = normalizeStoredType(type);
  const conflictKey = metadata && typeof metadata === "object" ? metadata.conflictKey : null;
  const base = normalizeStoredContent(content);
  if (!base) return "";

  if (normalizedType === "preference") {
    const fingerprint = buildConflictFingerprint({
      content: base,
      conflictKey,
      polarity: metadata?.polarity,
    });
    const polarity = fingerprint?.polarity ?? 1;
    const value = normalizePreferenceValue(fingerprint?.value || base);
    if (!value) return base;
    if (polarity < 0) return `Dislikes ${canonicalizeEntityValue(value)}`;
    if (/\bprefer/i.test(base)) return `Prefers ${canonicalizeEntityValue(value)}`;
    return `Likes ${canonicalizeEntityValue(value)}`;
  }

  if (normalizedType === "goal") {
    const match = base.match(/^Plans to travel to\s+(.+)$/i);
    if (match) {
      return `Plans to travel to ${canonicalizeEntityValue(match[1])}`;
    }
  }

  if (normalizedType === "fact") {
    const liveMatch = base.match(/^Lives in\s+(.+)$/i);
    if (liveMatch) return `Lives in ${canonicalizeEntityValue(liveMatch[1])}`;
    const fromMatch = base.match(/^From\s+(.+)$/i);
    if (fromMatch) return `From ${canonicalizeEntityValue(fromMatch[1])}`;
  }

  return canonicalizeEntityValue(base);
}

function chooseNormalizedPreferenceValue(keyValue, contentValue) {
  const normalizedKey = normalizePreferenceValue(keyValue || "");
  const normalizedContent = normalizePreferenceValue(contentValue || "");
  if (!normalizedKey) return normalizedContent;
  if (!normalizedContent) return normalizedKey;
  return normalizedContent.length <= normalizedKey.length ? normalizedContent : normalizedKey;
}

function toPolarity(value) {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return value;
  const lower = String(value).toLowerCase();
  if (["positive", "pos", "like", "yes"].includes(lower)) return 1;
  if (["negative", "neg", "dislike", "no"].includes(lower)) return -1;
  return 0;
}

function extractConflictKey(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  const lower = text.toLowerCase();

  const patterns = [
    { regex: /^name is\s+([^.,]+)/i, key: "identity:name", type: "identity" },
    { regex: /my name is\s+([^.,]+)/i, key: "identity:name", type: "identity" },
    { regex: /^lives in\s+([^.,]+)/i, key: "identity:location", type: "identity" },
    { regex: /i live in\s+([^.,]+)/i, key: "identity:location", type: "identity" },
    { regex: /^works at\s+([^.,]+)/i, key: "identity:occupation", type: "identity" },
    { regex: /^works as\s+([^.,]+)/i, key: "identity:occupation", type: "identity" },
    { regex: /i work as\s+([^.,]+)/i, key: "identity:occupation", type: "identity" },
    { regex: /my job is\s+([^.,]+)/i, key: "identity:occupation", type: "identity" },
    { regex: /i speak\s+([^.,]+)/i, key: "identity:language", type: "identity" },
    { regex: /^likes?\s+([^.,]+)/i, key: "preference", polarity: 1 },
    { regex: /^dislikes?\s+([^.,]+)/i, key: "preference", polarity: -1 },
    { regex: /(?:user|the user)\s+(?:likes|loves|enjoys|prefers)\s+([^.,]+)/i, key: "preference", polarity: 1 },
    { regex: /(?:user|the user)\s+(?:doesn't like|does not like|dislikes|hates)\s+([^.,]+)/i, key: "preference", polarity: -1 },
    { regex: /i (like|love|enjoy|prefer)\s+([^.,]+)/i, key: "preference", polarity: 1 },
    { regex: /i\s+(?:dont like|don't like|do not like|dislike|hate)\s+([^.,]+)/i, key: "preference", polarity: -1 },
    { regex: /my favorite\s+([^.,]+)/i, key: "preference", polarity: 1 },
    { regex: /i am allergic to\s+([^.,]+)/i, key: "constraint", polarity: -1 },
    { regex: /i (cant|can't|cannot) eat\s+([^.,]+)/i, key: "constraint", polarity: -1 },
    { regex: /i avoid\s+([^.,]+)/i, key: "constraint", polarity: -1 },
  ];

  const arabicPatterns = [
    { regex: /(اسمي|انا اسمي)\s+([^.,]+)/i, key: "identity:name", type: "identity" },
    { regex: /(أعيش في|انا عايش في)\s+([^.,]+)/i, key: "identity:location", type: "identity" },
    { regex: /(أعمل|عملي)\s+([^.,]+)/i, key: "identity:occupation", type: "identity" },
    { regex: /(أتحدث|بتكلم|لغتي)\s+([^.,]+)/i, key: "identity:language", type: "identity" },
    { regex: /(أحب|احب|أفضّل|افضل|بحب)\s+([^.,]+)/i, key: "preference", polarity: 1 },
    { regex: /(لا أحب|لا احب|أكره|اكره|ما بحب|مابحب)\s+([^.,]+)/i, key: "preference", polarity: -1 },
    { regex: /المستخدم\s+(?:يحب|يفضّل)\s+([^.,]+)/i, key: "preference", polarity: 1 },
    { regex: /المستخدم\s+(?:لا يحب|يكره)\s+([^.,]+)/i, key: "preference", polarity: -1 },
    { regex: /(لدي حساسية من|لا أستطيع تناول)\s+([^.,]+)/i, key: "constraint", polarity: -1 },
  ];

  for (const p of [...patterns, ...arabicPatterns]) {
    const match = text.match(p.regex);
    if (!match) continue;
    const rawValue = match[2] || match[1];
    const value =
      p.key === "preference" || p.key === "constraint"
        ? normalizePreferenceValue(rawValue)
        : normalizeText(rawValue);
    const key =
      p.key === "preference" || p.key === "constraint"
        ? `${p.key}:${value}`
        : p.key;
    return {
      key,
      value,
      polarity: p.polarity ?? 0,
      domain: p.key,
      raw: lower,
    };
  }

  return null;
}

function buildConflictFingerprint({ content, conflictKey, polarity }) {
  if (!content && !conflictKey) return null;
  if (!conflictKey) {
    return extractConflictKey(content);
  }

  const normalizedKey = String(conflictKey).toLowerCase();
  const parts = normalizedKey.split(":");
  const domain = parts[0] || "";
  const valueFromKey = parts.length > 1 ? parts.slice(1).join(":") : null;
  const fromContent = extractConflictKey(content);
  const normalizedValue =
    domain === "preference" || domain === "constraint"
      ? chooseNormalizedPreferenceValue(valueFromKey, fromContent?.value)
      : (fromContent?.value || valueFromKey || null);
  const normalizedKeyValue =
    domain === "preference" || domain === "constraint"
      ? (normalizedValue ? `${domain}:${normalizedValue}` : normalizedKey)
      : normalizedKey;

  return {
    key: normalizedKeyValue,
    domain: domain || fromContent?.domain,
    value: normalizedValue,
    polarity: toPolarity(polarity ?? fromContent?.polarity ?? 0),
    raw: String(content || "").toLowerCase(),
  };
}

function buildSemanticMemoryKey(memory) {
  const metadata = memory?.metadata || {};
  const fingerprint = buildConflictFingerprint({
    content: memory?.content,
    conflictKey: metadata.conflictKey,
    polarity: metadata.polarity,
  });

  if (fingerprint?.key) {
    if (fingerprint.domain === "preference" || fingerprint.domain === "constraint") {
      return `${fingerprint.key}:${toPolarity(fingerprint.polarity)}`;
    }
    if (fingerprint.domain === "identity") {
      const identityValue = normalizeText(fingerprint.value || "");
      return identityValue ? `${fingerprint.key}:${identityValue}` : fingerprint.key;
    }
    return fingerprint.key;
  }

  const type = String(memory?.type || "context").toLowerCase();
  const normalizedContent = normalizeText(memory?.content || "");
  if (!normalizedContent) return null;
  return `${type}:${normalizedContent}`;
}

function scoreMemoryRowPreference(row) {
  const normalizedContent = normalizeText(row?.content || "");
  const hasFiller = /\b(?:you know|kind of|sort of|basically|i guess)\b/i.test(String(row?.content || ""));
  const retrieval = toFiniteNumber(row?.retrieval_score, 0);
  const importance = getMemoryImportanceScore(row);
  const confidence = getMemoryConfidenceScore(row);
  const normalizationPenalty = toFiniteNumber(row?._normalizationPenalty, 0);
  return (
    retrieval * 100 +
    importance * 10 +
    confidence * 5 -
    normalizedContent.length * 0.01 -
    (hasFiller ? 8 : 0) -
    normalizationPenalty * 4
  );
}

function dedupeMemoryRows(rows) {
  const dedupedByKey = new Map();
  const passthrough = [];
  for (const row of rows || []) {
    const key = buildSemanticMemoryKey(row);
    if (!key) {
      passthrough.push(row);
      continue;
    }
    const existing = dedupedByKey.get(key);
    if (!existing) {
      dedupedByKey.set(key, row);
      continue;
    }
    if (scoreMemoryRowPreference(row) > scoreMemoryRowPreference(existing)) {
      dedupedByKey.set(key, row);
    }
  }
  return [...passthrough, ...dedupedByKey.values()];
}

function isMemoryIntrospectionQuery(query) {
  const text = String(query || "").trim();
  if (!text) return false;
  return [
    /\bwhat do you know about me\b/i,
    /\bwhat do you remember about me\b/i,
    /\bwho am i\b/i,
    /\bwhere do i live\b/i,
    /\bwhere am i from\b/i,
    /(?:^|[\s:;,.!?؟،-])(شو بتعرف عني|ماذا تعرف عني|شو بتتذكر عني|وين بعيش|من وين أنا|من وين انا|وين ساكن|وين ساكنة)(?:[\s:;,.!?؟،-]|$)/,
  ].some((pattern) => pattern.test(text));
}

function isLocationIntrospectionQuery(query) {
  const text = String(query || "").trim();
  if (!text) return false;
  return [
    /\bwhere do i live\b/i,
    /\bwhere am i from\b/i,
    /(?:^|[\s:;,.!?؟،-])(وين بعيش|من وين أنا|من وين انا|وين ساكن|وين ساكنة)(?:[\s:;,.!?؟،-]|$)/,
  ].some((pattern) => pattern.test(text));
}

function isOriginIntrospectionQuery(query) {
  const text = String(query || "").trim();
  if (!text) return false;
  return [
    /\bwhere am i from\b/i,
    /(?:^|[\s:;,.!?؟،-])(من وين أنا|من وين انا|من أين أنا|من اين انا)(?:[\s:;,.!?؟،-]|$)/,
  ].some((pattern) => pattern.test(text));
}

function selectDiverseIntrospectionMemories(rows, limit = 3) {
  const ranked = rankFallbackCandidates(dedupeMemoryRows(rows));
  if (ranked.length === 0) return [];

  const picks = [];
  const usedIds = new Set();
  const takeFirst = (predicate) => {
    const hit = ranked.find((row) => !usedIds.has(String(row?.id || "")) && predicate(row));
    if (!hit) return;
    usedIds.add(String(hit.id || ""));
    picks.push(hit);
  };

  takeFirst((row) => getMemoryConflictDomain(row) === "identity");
  takeFirst((row) => String(row?.type || "").toLowerCase() === "preference");
  takeFirst((row) => String(row?.type || "").toLowerCase() === "goal");

  for (const row of ranked) {
    if (picks.length >= limit) break;
    const id = String(row?.id || "");
    if (!id || usedIds.has(id)) continue;
    usedIds.add(id);
    picks.push(row);
  }

  return picks.slice(0, Math.max(1, Math.min(5, Number(limit) || 3)));
}

function normalizeMemoryRowForUse(row) {
  if (!row || typeof row !== "object") return row;
  const metadata = getMemoryMetadata(row);
  const originalContent = String(row.content || "");
  const originalConflictKey = String(metadata.conflictKey || "");
  const normalizedContent = normalizeStoredMemoryContent(row.content, row.type, metadata);
  const nextMetadata = { ...metadata };
  const fingerprint = buildConflictFingerprint({
    content: normalizedContent,
    conflictKey: nextMetadata.conflictKey,
    polarity: nextMetadata.polarity,
  });
  if (fingerprint?.key) {
    nextMetadata.conflictKey = fingerprint.key;
    nextMetadata.polarity = fingerprint.polarity ?? nextMetadata.polarity ?? 0;
  }
  const normalizationPenalty =
    (normalizedContent !== originalContent ? 1 : 0) +
    (String(nextMetadata.conflictKey || "") !== originalConflictKey ? 1 : 0);
  return {
    ...row,
    content: normalizedContent,
    metadata: nextMetadata,
    _normalizationPenalty: normalizationPenalty,
  };
}

function escapeLikePattern(value) {
  return String(value || "").replace(/[\\%_]/g, "\\$&");
}

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getMemoryMetadata(memory) {
  const metadata = memory?.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return metadata;
}

function getMemoryConflictDomain(memory) {
  const metadata = getMemoryMetadata(memory);
  const conflictKey = String(metadata?.conflictKey || "").toLowerCase().trim();
  if (!conflictKey) return "";
  return conflictKey.split(":")[0] || "";
}

function getMemoryConfidenceScore(memory) {
  const explicit = toFiniteNumber(memory?.confidence_score, NaN);
  if (Number.isFinite(explicit)) {
    return Math.min(1, Math.max(0, explicit));
  }
  const metadata = getMemoryMetadata(memory);
  if (metadata.userVerified === true) return 0.95;
  return 0.8;
}

function getMemoryImportanceScore(memory) {
  return Math.min(
    1,
    Math.max(0, toFiniteNumber(memory?.importance_score ?? memory?.importance, 0.5))
  );
}

function getMemoryActionabilityScore(memory) {
  const type = String(memory?.type || "").toLowerCase().trim();
  const domain = getMemoryConflictDomain(memory);

  let score = 0.1;
  if (type === "goal") score += 0.45;
  if (type === "preference") score += 0.35;
  if (type === "struggle") score += 0.32;
  if (type === "event") score += 0.18;
  if (type === "relationship") score += 0.16;
  if (type === "emotion") score += 0.08;
  if (type === "fact") score += 0.06;

  if (domain === "constraint") score += 0.5;
  if (domain === "preference") score += 0.2;
  if (domain === "identity") score += 0.06;

  return Math.min(1, Math.max(0, score));
}

function rankFallbackCandidates(rows) {
  return [...(rows || [])].sort((a, b) => {
    const aScore =
      getMemoryActionabilityScore(a) * 0.5 +
      getMemoryConfidenceScore(a) * 0.3 +
      getMemoryImportanceScore(a) * 0.2;
    const bScore =
      getMemoryActionabilityScore(b) * 0.5 +
      getMemoryConfidenceScore(b) * 0.3 +
      getMemoryImportanceScore(b) * 0.2;
    return bScore - aScore;
  });
}

function selectPersonalizationFallbackMemories(rows, limit = 2) {
  const boundedLimit = Math.max(1, Math.min(5, Number(limit) || 2));
  const ranked = rankFallbackCandidates(rows);
  if (ranked.length === 0) return [];

  const highConfidence = ranked.filter((row) => getMemoryConfidenceScore(row) >= 0.75);
  const selectedPool = highConfidence.length > 0 ? highConfidence : ranked;
  return selectedPool.slice(0, boundedLimit);
}

function rankContextCandidates(rows) {
  return [...(rows || [])].sort((a, b) => {
    const aScore =
      toFiniteNumber(a?.retrieval_score, 0) * 0.4 +
      getMemoryReplyUsefulnessScore(a) * 0.3 +
      getMemoryImportanceScore(a) * 0.15 +
      getMemoryActionabilityScore(a) * 0.1 +
      getMemoryConfidenceScore(a) * 0.05;
    const bScore =
      toFiniteNumber(b?.retrieval_score, 0) * 0.4 +
      getMemoryReplyUsefulnessScore(b) * 0.3 +
      getMemoryImportanceScore(b) * 0.15 +
      getMemoryActionabilityScore(b) * 0.1 +
      getMemoryConfidenceScore(b) * 0.05;
    return bScore - aScore;
  });
}

function getMemoryReplyUsefulnessScore(memory) {
  const bucket = getChatContextBucket(memory);
  const metadata = getMemoryMetadata(memory);
  const source = String(metadata?.source || "").toLowerCase();
  const normalizedContent = String(memory?.content || "").toLowerCase();
  let score = 0.2;

  if (bucket === "preferences") score += 0.34;
  else if (bucket === "active") score += 0.3;
  else if (bucket === "profile") score += 0.22;
  else if (bucket === "recent") score += 0.04;

  if (metadata.userVerified === true) score += 0.08;
  if (typeof metadata.editedFrom === "string" && metadata.editedFrom.trim()) score += 0.08;
  if (String(memory?.status || "active").toLowerCase() === "outdated") score -= 0.5;
  if (source === "session_end") score -= 0.12;
  if (normalizedContent.includes("project") || normalizedContent.includes("launch")) score += 0.05;
  if (/^(prefer|likes?|dislikes?|working on|preparing|planning|building|tracking)\b/i.test(normalizedContent)) {
    score += 0.04;
  }

  return Math.min(1, Math.max(0, score));
}

function createActivityTimestamp(value) {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) {
    return new Date(0).toISOString();
  }
  return parsed.toISOString();
}

function normalizeMemoryActivityRows({ memories = [], limit = 8 }) {
  const activity = [];

  for (const memory of memories) {
    const metadata = getMemoryMetadata(memory);
    const createdAt = createActivityTimestamp(memory?.created_at || memory?.createdAt);
    const updatedAt = createActivityTimestamp(memory?.updated_at || memory?.updatedAt || createdAt);
    const status = String(memory?.status || "active").toLowerCase();
    let kind = "saved";
    let occurredAt = createdAt;

    if (status === "outdated" && updatedAt > createdAt) {
      kind = "outdated";
      occurredAt = updatedAt;
    } else if (typeof metadata.editedFrom === "string" && metadata.editedFrom.trim() && updatedAt > createdAt) {
      kind = "edited";
      occurredAt = updatedAt;
    }

    activity.push({
      id: memory.id,
      kind,
      content: String(memory?.content || "").trim(),
      type: String(memory?.type || "").trim() || "context",
      threadId: memory?.threadId || memory?.source_thread_id || null,
      source: String(metadata?.source || "").trim().toLowerCase() || null,
      occurredAt,
    });
  }

  return activity
    .filter((item) => item.content && item.occurredAt)
    .sort((a, b) => {
      if (a.occurredAt === b.occurredAt) {
        return String(b.id || "").localeCompare(String(a.id || ""));
      }
      return a.occurredAt < b.occurredAt ? 1 : -1;
    })
    .slice(0, Math.max(1, Math.min(50, Number(limit) || 8)));
}

export async function getMemoryActivity(userId, limit = 8) {
  const normalizedUserId = normalizeUserId(userId);
  const boundedLimit = Math.max(1, Math.min(50, Number(limit) || 8));
  const fetchLimit = Math.max(boundedLimit * 4, 16);

  const memories = await dbAll(
    `SELECT id, content, type, status, metadata, created_at, updated_at, source_thread_id as "threadId"
     FROM memories
     WHERE user_id = $1
     ORDER BY GREATEST(created_at, updated_at) DESC, id DESC
     LIMIT $2`,
    [normalizedUserId, fetchLimit]
  );

  return normalizeMemoryActivityRows({ memories, limit: boundedLimit });
}

const sessionDeltaInjectionCache = new Map();
const MAX_SESSION_DELTA_CACHE_SIZE = 10_000;

function makeSessionDeltaCacheKey(userId, threadId) {
  return `${normalizeUserId(userId)}::${String(threadId || "").trim().toLowerCase()}`;
}

function shouldInjectSessionDeltaForThread({ userId, currentThreadId }) {
  const normalizedThreadId = String(currentThreadId || "").trim().toLowerCase();
  if (!normalizedThreadId) return false;
  const cacheKey = makeSessionDeltaCacheKey(userId, normalizedThreadId);
  if (sessionDeltaInjectionCache.has(cacheKey)) {
    return false;
  }
  sessionDeltaInjectionCache.set(cacheKey, Date.now());
  if (sessionDeltaInjectionCache.size > MAX_SESSION_DELTA_CACHE_SIZE) {
    const firstKey = sessionDeltaInjectionCache.keys().next().value;
    if (firstKey) {
      sessionDeltaInjectionCache.delete(firstKey);
    }
  }
  return true;
}

function toShortSessionDeltaLine(content, maxChars = 140) {
  const normalized = String(content || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars - 1).trimEnd()}…`;
}

export function resetSessionDeltaInjectionCacheForTests() {
  sessionDeltaInjectionCache.clear();
}

export function rankContextCandidatesForTests(rows) {
  return rankContextCandidates(rows);
}

export function selectPersonalizationFallbackMemoriesForTests(rows, limit = 2) {
  return selectPersonalizationFallbackMemories(rows, limit);
}

function encodeMemoryCursor(row) {
  const createdAt = row?.created_at || row?.createdAt;
  const id = row?.id;
  if (!createdAt || !id) return null;
  const raw = `${new Date(createdAt).toISOString()}|${id}`;
  return Buffer.from(raw, "utf8").toString("base64url");
}

function decodeMemoryCursor(cursor) {
  const value = String(cursor || "").trim();
  if (!value) return null;
  let decoded = "";
  try {
    decoded = Buffer.from(value, "base64url").toString("utf8");
  } catch {
    try {
      decoded = Buffer.from(value, "base64").toString("utf8");
    } catch {
      return null;
    }
  }
  const [createdAtRaw, id] = decoded.split("|");
  const createdAt = new Date(String(createdAtRaw || ""));
  if (!id || Number.isNaN(createdAt.getTime())) return null;
  return { createdAt: createdAt.toISOString(), id };
}

function isSemanticDuplicate({
  existingFingerprint,
  incomingFingerprint,
  existingContent,
  incomingContent,
}) {
  if (!existingFingerprint?.key || !incomingFingerprint?.key) return false;
  if (existingFingerprint.key !== incomingFingerprint.key) return false;

  if (incomingFingerprint.domain === "preference" || incomingFingerprint.domain === "constraint") {
    const existingPolarity = toPolarity(existingFingerprint.polarity);
    const incomingPolarity = toPolarity(incomingFingerprint.polarity);
    if (existingPolarity && incomingPolarity) {
      return existingPolarity === incomingPolarity;
    }
    // If one side has no explicit polarity but key/value match, treat as duplicate.
    return true;
  }

  if (incomingFingerprint.domain === "identity") {
    if (existingFingerprint.value && incomingFingerprint.value) {
      return normalizeText(existingFingerprint.value) === normalizeText(incomingFingerprint.value);
    }
  }

  return normalizeText(existingContent) === normalizeText(incomingContent);
}

export async function findDuplicateMemory({
  userId,
  content,
  conflictKey = null,
  polarity = null,
}) {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedContent = String(content || "").trim();
  if (!normalizedUserId || !normalizedContent) return null;

  const hash = hashText(normalizedContent);
  const exact = await dbGet(
    `SELECT id, content, type, metadata
     FROM memories
     WHERE user_id = $1
       AND content_hash = $2
       AND COALESCE(status, 'active') = 'active'
     LIMIT 1`,
    [normalizedUserId, hash]
  );
  if (exact) return exact;

  const incomingFingerprint = buildConflictFingerprint({
    content: normalizedContent,
    conflictKey,
    polarity,
  });
  if (!incomingFingerprint?.key) return null;

  const existing = await dbAll(
    `SELECT id, content, type, metadata
     FROM memories
     WHERE user_id = $1
       AND COALESCE(status, 'active') = 'active'
     ORDER BY created_at DESC
     LIMIT 300`,
    [normalizedUserId]
  );

  for (const row of existing) {
    const metadata = row.metadata || {};
    const existingFingerprint = buildConflictFingerprint({
      content: row.content,
      conflictKey: metadata.conflictKey,
      polarity: metadata.polarity,
    });
    if (
      isSemanticDuplicate({
        existingFingerprint,
        incomingFingerprint,
        existingContent: row.content,
        incomingContent: normalizedContent,
      })
    ) {
      return row;
    }
  }

  return null;
}

function getNovaApiBase() {
  const base = (process.env.NOVA_TYP_BASE_URL || "").trim();
  if (!base) {
    throw new Error("NOVA_TYP_BASE_URL not configured");
  }
  const normalized = base.replace(/\/+$/, "");
  return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
}

async function filterRelevantMemories({ query, memories, allowFallback = false }) {
  const normalizedQuery = String(query || "").trim();
  if (!normalizedQuery || memories.length === 0) return [];

  const baseUrl = (process.env.NOVA_TYP_BASE_URL || "").trim();
  if (!baseUrl) {
    return allowFallback ? memories : [];
  }
  const payload = {
    query: normalizedQuery,
    memories: memories.map((m) => ({ id: m.id, content: m.content, type: m.type })),
  };

  const ResponseSchema = z.object({
    relevant_ids: z.array(z.string()).optional(),
  });

  try {
    const { content, transport } = await callNovaTypChat({
      messages: [
        {
          role: "system",
          content:
            "You are a relevance filter. Return JSON {\"relevant_ids\": [\"id1\", ...]} for memories that are directly relevant to answering the query. If none are relevant, return an empty array. Only use ids from the provided list.",
        },
        { role: "user", content: JSON.stringify(payload) },
      ],
      jsonMode: true,
      temperature: 0,
      maxTokens: 200,
      timeoutMs: RELEVANCE_TIMEOUT_MS,
      label: "Relevance check",
    });
    if (!content) return [];
    if (shouldDebug()) {
      console.log(`[Memory] Relevance transport: ${transport}`);
    }
    const parsed = parseJsonObjectFromText(content);
    const validated = ResponseSchema.safeParse(parsed);
    if (!validated.success) return [];

    const relevantIds = new Set(validated.data.relevant_ids || []);
    return memories.filter((m) => relevantIds.has(m.id));
  } catch (err) {
    console.warn("[Memory] Relevance check failed:", err.message);
    return allowFallback ? memories : [];
  }
}

// ============================================================================
// Embeddings (with graceful degradation)
// ============================================================================

export async function getEmbeddings(texts) {
  const NOVA_TYP_API_KEY = (process.env.NOVA_TYP_API_KEY || "").trim();
  const apiBase = getNovaApiBase();
  const input = Array.isArray(texts) ? texts : [texts];

  const response = await fetchWithTimeout(
    `${apiBase}/v1/openai/embeddings`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(NOVA_TYP_API_KEY ? { Authorization: `Bearer ${NOVA_TYP_API_KEY}` } : {}),
      },
      body: JSON.stringify({ model: "all-MiniLM-L6-v2", input }),
    },
    {
      timeoutMs: EMBEDDING_TIMEOUT_MS,
      label: "Embedding request",
    }
  );
  
  if (!response.ok) {
    throw new Error(`Embedding failed: ${response.status}`);
  }
  
  const data = await response.json();
  const vectors = Array.isArray(data?.embeddings)
    ? data.embeddings
    : Array.isArray(data?.data)
      ? data.data
          .map((entry) => entry?.embedding)
          .filter((embedding) => Array.isArray(embedding))
      : [];
  if (vectors.length === 0) {
    throw new Error("Embedding payload missing vectors.");
  }
  return {
    embeddings: vectors,
    provider: "novatyp",
    dims: Array.isArray(vectors[0]) ? vectors[0].length : 384,
  };
}

export async function probeEmbeddingsProvider() {
  try {
    const result = await getEmbeddings(["memory health probe"]);
    return {
      ok: true,
      provider: result.provider,
      dims: result.dims,
      vectors: Array.isArray(result.embeddings) ? result.embeddings.length : 0,
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || String(error),
    };
  }
}

// ============================================================================
// Core Operations
// ============================================================================

export function hashText(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export async function getMemoryPreferences(userId) {
  const normalizedUserId = normalizeUserId(userId);
  const row = await dbGet(
    `SELECT policy, updated_at
     FROM zaki_memory_preferences
     WHERE user_id = $1
     LIMIT 1`,
    [normalizedUserId]
  );
  const policy = normalizeMemoryPolicy(row?.policy) || "balanced";
  return {
    policy,
    source: row ? "stored" : "default",
    updatedAt: row?.updated_at || null,
  };
}

export async function setMemoryPreferences(userId, { policy }) {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) {
    throw new Error("Invalid memory user.");
  }
  const normalizedPolicy = normalizeMemoryPolicy(policy);
  if (!normalizedPolicy) {
    throw new Error("Invalid memory policy.");
  }
  const row = await dbGet(
    `INSERT INTO zaki_memory_preferences (user_id, policy, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET policy = EXCLUDED.policy, updated_at = NOW()
     RETURNING policy, updated_at`,
    [normalizedUserId, normalizedPolicy]
  );
  return {
    policy: normalizeMemoryPolicy(row?.policy) || normalizedPolicy,
    source: "stored",
    updatedAt: row?.updated_at || null,
  };
}

export async function resolveMemoryCapturePolicy(userId) {
  const preferences = await getMemoryPreferences(userId);
  return {
    ...preferences,
    capturePolicy: buildMemoryCapturePolicyConfig(preferences.policy),
  };
}

export async function storeMemory({
  userId,
  content,
  type = "context",
  sourceThreadId = null,
  importanceScore = null,
  confidenceScore = null,
  metadata = null,
}) {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedContent = normalizeStoredMemoryContent(content, type, metadata);
  if (!normalizedUserId || !normalizedContent) {
    throw new Error("Invalid memory payload.");
  }
  const normalizedType = normalizeStoredType(type);
  const hash = hashText(normalizedContent);
  const isPg = await checkStorage();
  const resolvedMetadata = sanitizeStoredMetadata(metadata);
  const normalizedFingerprint = buildConflictFingerprint({
    content: normalizedContent,
    conflictKey: resolvedMetadata.conflictKey,
    polarity: resolvedMetadata.polarity,
  });
  if (normalizedFingerprint?.key) {
    resolvedMetadata.conflictKey = normalizedFingerprint.key;
    resolvedMetadata.polarity = normalizedFingerprint.polarity ?? 0;
  }
  
  // Check duplicates: exact hash + semantic key/polarity.
  if (isPg) {
    const duplicate = await findDuplicateMemory({
      userId: normalizedUserId,
      content: normalizedContent,
      conflictKey: resolvedMetadata.conflictKey,
      polarity: resolvedMetadata.polarity,
    });
    if (duplicate?.id) {
      return { id: duplicate.id, duplicate: true };
    }
  }
  
  // Get embeddings (graceful degradation - S-tier)
  let embedding = null;
  try {
    const result = await getEmbeddings(normalizedContent);
    embedding = result.embeddings[0];
  } catch (err) {
    console.warn("[Memory] No embeddings:", err.message);
  }

  const importance = importanceScore || calculateImportance(normalizedContent, normalizedType);
  // Persist the extractor's confidence so high-confidence facts (e.g. identity
  // at 0.9) clear the identity-core floor (0.85). Without this, every fact fell
  // back to the column default (0.8) and the always-on core stayed empty.
  const confidence = Number.isFinite(Number(confidenceScore))
    ? Math.max(0, Math.min(1, Number(confidenceScore)))
    : 0.8;
  const id = crypto.randomUUID();
  let storedId = id;
  
  if (isPg) {
    let insertResult;
    if (embedding) {
      insertResult = await dbQuery(
        `INSERT INTO memories
         (id, user_id, content, content_hash, type, embedding, importance_score, confidence_score, source_thread_id, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::vector, $7, $8, $9, $10, NOW())
         ON CONFLICT (user_id, content_hash) DO NOTHING
         RETURNING id`,
        [
          id,
          normalizedUserId,
          normalizedContent,
          hash,
          normalizedType,
          `[${embedding.join(",")}]`,
          importance,
          confidence,
          sourceThreadId,
          resolvedMetadata,
        ]
      );
    } else {
      insertResult = await dbQuery(
        `INSERT INTO memories
         (id, user_id, content, content_hash, type, importance_score, confidence_score, source_thread_id, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         ON CONFLICT (user_id, content_hash) DO NOTHING
         RETURNING id`,
        [
          id,
          normalizedUserId,
          normalizedContent,
          hash,
          normalizedType,
          importance,
          confidence,
          sourceThreadId,
          resolvedMetadata,
        ]
      );
    }

    const insertedId = insertResult?.rows?.[0]?.id;
    if (!insertedId) {
      const duplicate = await dbGet(
        `SELECT id
         FROM memories
         WHERE user_id = $1 AND content_hash = $2
         LIMIT 1`,
        [normalizedUserId, hash]
      );
      return { id: duplicate?.id || id, duplicate: true };
    }
    storedId = insertedId;
  }

  return { id: storedId, duplicate: false, importance };
}

export async function deleteMemory(id, userId) {
  const normalizedUserId = normalizeUserId(userId);
  const result = await dbQuery(
    "DELETE FROM memories WHERE id = $1 AND user_id = $2 RETURNING id",
    [id, normalizedUserId]
  );
  return result.rowCount > 0;
}

export async function updateMemory({
  id,
  userId,
  content,
  type,
  status,
}) {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) {
    throw new Error("Invalid memory user.");
  }

  return await withDbTransaction(async (client) => {
    const existingResult = await client.query(
      `SELECT id, content, type, status, metadata
       FROM memories
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [id, normalizedUserId]
    );
    const existing = existingResult.rows?.[0];
    if (!existing) {
      return { error: "not_found" };
    }

    const existingMetadata = sanitizeStoredMetadata(existing.metadata || {});
    const nextType =
      type === undefined ? normalizeStoredType(existing.type) : normalizeStoredType(type);
    const nextStatus =
      status === undefined ? normalizeMemoryStatus(existing.status) : normalizeMemoryStatus(status);
    const nextContent =
      content === undefined
        ? normalizeStoredContent(existing.content)
        : normalizeStoredMemoryContent(content, nextType, existingMetadata);

    if (!nextContent) {
      return { error: "invalid_content" };
    }

    const nextMetadata = sanitizeStoredMetadata(existingMetadata);
    const contentChanged =
      normalizeText(existing.content || "") !== normalizeText(nextContent) ||
      normalizeStoredType(existing.type) !== nextType;

    if (contentChanged && !nextMetadata.editedFrom) {
      nextMetadata.editedFrom = String(existingMetadata.editedFrom || id)
        .trim()
        .slice(0, 120);
    }

    const nextHash = hashText(nextContent);
    const duplicateResult = await client.query(
      `SELECT id
       FROM memories
       WHERE user_id = $1 AND content_hash = $2 AND id <> $3
       LIMIT 1`,
      [normalizedUserId, nextHash, id]
    );
    const duplicateId = duplicateResult.rows?.[0]?.id || null;
    if (duplicateId) {
      return { error: "duplicate", duplicateId };
    }

    if (contentChanged) {
      let embeddingLiteral = null;
      let embeddingProvider = null;
      try {
        const embeddingResult = await getEmbeddings(nextContent);
        const nextEmbedding = embeddingResult?.embeddings?.[0];
        if (Array.isArray(nextEmbedding) && nextEmbedding.length > 0) {
          embeddingLiteral = `[${nextEmbedding.join(",")}]`;
          embeddingProvider = embeddingResult.provider || null;
        }
      } catch (error) {
        console.warn("[Memory] Could not refresh embedding for edited memory:", error.message);
      }

      await client.query(
        `UPDATE memories
         SET content = $1,
             content_hash = $2,
             type = $3,
             status = $4,
             metadata = $5,
             embedding = $6::vector,
             embedding_provider = $7,
             updated_at = NOW()
         WHERE id = $8 AND user_id = $9`,
        [
          nextContent,
          nextHash,
          nextType,
          nextStatus,
          nextMetadata,
          embeddingLiteral,
          embeddingProvider,
          id,
          normalizedUserId,
        ]
      );
    } else {
      await client.query(
        `UPDATE memories
         SET type = $1,
             status = $2,
             metadata = $3,
             updated_at = NOW()
         WHERE id = $4 AND user_id = $5`,
        [nextType, nextStatus, nextMetadata, id, normalizedUserId]
      );
    }

    const updatedResult = await client.query(
      `SELECT id, content, type, status, metadata, created_at, updated_at, source_thread_id as "threadId"
       FROM memories
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [id, normalizedUserId]
    );
    return { memory: updatedResult.rows?.[0] || null };
  });
}

export async function getMemories(userId, { limit = 100, cursor = null } = {}) {
  const normalizedUserId = normalizeUserId(userId);
  const pageLimit = Math.max(1, Math.min(100, Number(limit) || 100));
  const cursorValue = decodeMemoryCursor(cursor);
  const fetchLimit = Math.min(pageLimit * 3, 300);

  const rows = cursorValue
    ? await dbAll(
        `SELECT id, content, type, status, content_hash, metadata, created_at, updated_at, importance_score as importance, source_thread_id as "threadId"
         FROM memories
         WHERE user_id = $1
           AND COALESCE(status, 'active') = 'active'
           AND (
             created_at < $2::timestamptz
             OR (created_at = $2::timestamptz AND id < $3)
           )
         ORDER BY created_at DESC, id DESC
         LIMIT $4`,
        [normalizedUserId, cursorValue.createdAt, cursorValue.id, fetchLimit]
      )
    : await dbAll(
        `SELECT id, content, type, status, content_hash, metadata, created_at, updated_at, importance_score as importance, source_thread_id as "threadId"
         FROM memories
         WHERE user_id = $1
           AND COALESCE(status, 'active') = 'active'
         ORDER BY created_at DESC, id DESC
         LIMIT $2`,
        [normalizedUserId, fetchLimit]
      );

  const deduped = dedupeMemoryRows(rows);
  const page = deduped.slice(0, pageLimit);
  const hasMore = deduped.length > pageLimit || rows.length >= fetchLimit;
  const last = page[page.length - 1];

  return {
    memories: page,
    nextCursor: hasMore && last ? encodeMemoryCursor(last) : null,
    hasMore,
  };
}

// ============================================================================
// Conflict detection + auto-supersede (newest wins, no user prompt)
// ============================================================================

/**
 * Auto-supersede: mark an existing memory as outdated so live retrieval
 * (which filters on status='active') stops surfacing it. Used when newer
 * information contradicts an older memory — newest wins, deterministically,
 * with no review/confirmation step.
 */
export async function markMemoryOutdated({ userId, memoryId }) {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId || !memoryId) {
    return { success: false };
  }
  const result = await dbQuery(
    `UPDATE memories
     SET status = 'outdated', updated_at = NOW()
     WHERE id = $1 AND user_id = $2 AND COALESCE(status, 'active') = 'active'`,
    [memoryId, normalizedUserId]
  );
  return { success: (result?.rowCount ?? 0) > 0 };
}

export async function findConflict({ userId, content, conflictKey = null, polarity = null }) {
  const normalizedUserId = normalizeUserId(userId);
  const newKey = buildConflictFingerprint({ content, conflictKey, polarity });
  if (!newKey) return null;

  const existing = await dbAll(
    `SELECT id, content, type, metadata
     FROM memories
     WHERE user_id = $1
       AND COALESCE(status, 'active') = 'active'
     ORDER BY created_at DESC
     LIMIT 200`,
    [normalizedUserId]
  );

  for (const memory of existing) {
    const meta = memory.metadata || {};
    const existingKey = buildConflictFingerprint({
      content: memory.content,
      conflictKey: meta.conflictKey,
      polarity: meta.polarity,
    }) || extractConflictKey(memory.content);
    if (!existingKey) continue;
    if (existingKey.key !== newKey.key) continue;

    // Preferences/constraints: conflict when polarity flips for same key/value
    if (newKey.domain === "preference" || newKey.domain === "constraint") {
      if (existingKey.polarity && newKey.polarity && existingKey.polarity !== newKey.polarity) {
        return {
          memoryId: memory.id,
          content: memory.content,
          type: memory.type,
        };
      }
      if (!existingKey.polarity || !newKey.polarity) {
        if (normalizeText(memory.content) !== normalizeText(content)) {
          return {
            memoryId: memory.id,
            content: memory.content,
            type: memory.type,
          };
        }
      }
      continue;
    }

    // Identity facts: conflict when value changes
    if (newKey.domain === "identity") {
      if (existingKey.value && newKey.value && existingKey.value !== newKey.value) {
        return {
          memoryId: memory.id,
          content: memory.content,
          type: memory.type,
        };
      }
      if (!existingKey.value || !newKey.value) {
        if (normalizeText(memory.content) !== normalizeText(content)) {
          return {
            memoryId: memory.id,
            content: memory.content,
            type: memory.type,
          };
        }
      }
      return {
        memoryId: memory.id,
        content: memory.content,
        type: memory.type,
      };
    }
  }

  return null;
}


// ============================================================================
// Context Building
// ============================================================================

export async function buildContext({
  userId,
  query,
  maxChars = 2000,
  currentThreadId = null,
}) {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedThreadId = String(currentThreadId || "").trim() || null;
  let memories = [];
  let usedFallback = false;

  if (query) {
    const trimmedQuery = String(query).trim();
    const lexicalPattern = `%${escapeLikePattern(trimmedQuery)}%`;

    const lexicalPromise = dbAll(
      `SELECT id, content, type, metadata, importance_score, confidence_score, source_thread_id, created_at,
              CASE
                WHEN LOWER(content) = LOWER($2) THEN 1.0
                WHEN content ILIKE $3 ESCAPE '\\' THEN 0.82
                WHEN $2 ILIKE '%' || content || '%' THEN 0.74
                ELSE 0.6
              END AS retrieval_score
       FROM memories
       WHERE user_id = $1
         AND COALESCE(status, 'active') = 'active'
         AND (content ILIKE $3 ESCAPE '\\' OR $2 ILIKE '%' || content || '%')
       ORDER BY retrieval_score DESC, importance_score DESC, last_accessed_at DESC NULLS LAST
       LIMIT 20`,
      [normalizedUserId, trimmedQuery, lexicalPattern]
    );

    let vectorRows = [];
    try {
      const storageSupportsVectors = await checkStorage();
      if (storageSupportsVectors) {
        const embeddingResult = await getEmbeddings(trimmedQuery);
        const queryEmbedding = embeddingResult?.embeddings?.[0];
        if (Array.isArray(queryEmbedding) && queryEmbedding.length > 0) {
          const vectorLiteral = `[${queryEmbedding.join(",")}]`;
          vectorRows = await dbAll(
            `SELECT id, content, type, metadata, importance_score, confidence_score, source_thread_id, created_at,
                    (1 - (embedding <=> $2::vector)) AS retrieval_score
             FROM memories
             WHERE user_id = $1
               AND COALESCE(status, 'active') = 'active'
               AND embedding IS NOT NULL
             ORDER BY embedding <=> $2::vector ASC, importance_score DESC
             LIMIT 20`,
            [normalizedUserId, vectorLiteral]
          );
        }
      }
    } catch (err) {
      console.warn("[Memory] Vector context lookup unavailable:", err.message);
    }

    const lexicalRows = await lexicalPromise;
    memories = rankContextCandidates(
      dedupeMemoryRows([...(vectorRows || []), ...(lexicalRows || [])])
    ).slice(0, 12);
  }

  // If no relevant candidates were found, fall back to highest-signal memories.
  if (memories.length === 0) {
    memories = await dbAll(
      `SELECT id, content, type, metadata, importance_score, confidence_score, source_thread_id, created_at
       FROM memories
       WHERE user_id = $1
         AND COALESCE(status, 'active') = 'active'
       ORDER BY importance_score DESC, created_at DESC
       LIMIT 12`,
      [normalizedUserId]
    );
    usedFallback = true;
  }

  memories = dedupeMemoryRows(memories);
  
  if (memories.length === 0) {
    return { context: "", sources: [] };
  }

  if (query) {
    const filtered = await filterRelevantMemories({
      query,
      memories,
      allowFallback: !usedFallback,
    });
    if (filtered.length === 0) {
      const forcedFallback = selectPersonalizationFallbackMemories(memories, 2);
      if (forcedFallback.length === 0) {
        return { context: "", sources: [] };
      }
      memories = forcedFallback;
    } else {
      memories = filtered;
    }
  } else {
    return { context: "", sources: [] };
  }

  if (normalizedThreadId && shouldInjectSessionDeltaForThread({
    userId: normalizedUserId,
    currentThreadId: normalizedThreadId,
  })) {
    const sessionDelta = await dbGet(
      `SELECT id, content, type, metadata, importance_score, confidence_score, source_thread_id, created_at
       FROM memories
       WHERE user_id = $1
         AND COALESCE(status, 'active') = 'active'
         AND metadata->>'source' = 'session_end'
         AND ($2::text IS NULL OR COALESCE(source_thread_id, '') <> $2)
       ORDER BY created_at DESC
       LIMIT 1`,
      [normalizedUserId, normalizedThreadId]
    );

    if (sessionDelta?.id) {
      const existingIds = new Set(memories.map((memory) => String(memory?.id || "")));
      if (!existingIds.has(String(sessionDelta.id))) {
        memories = [sessionDelta, ...memories];
      }
    }
  }
  
  // Build context string with character limit
  let context = "About this person:\n";
  let charCount = context.length;
  const usedMemories = [];
  
  for (const m of memories) {
    const metadata = getMemoryMetadata(m);
    const isSessionDelta = metadata?.source === "session_end";
    const lineContent = isSessionDelta
      ? `Last time: ${toShortSessionDeltaLine(m.content)}`
      : String(m.content || "");
    const line = `- ${lineContent}\n`;
    if (charCount + line.length > maxChars) break;
    context += line;
    charCount += line.length;
    usedMemories.push(m);
  }
  
  return { context, sources: usedMemories };
}

// Legacy lower-level selector retained for compatibility; normal chat should use
// buildChatMemoryContext so all runtime callers share one retrieval contract.
export async function buildFastContext({
  userId,
  query,
  maxChars = 800,
  currentThreadId = null,
  limit = 3,
}) {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedThreadId = String(currentThreadId || "").trim() || null;
  const normalizedQuery = String(query || "").trim();
  if (!normalizedUserId || !normalizedQuery) {
    return { context: "", sources: [] };
  }

  const boundedLimit = Math.max(1, Math.min(6, Number(limit) || 3));
  const introspectionQuery = isMemoryIntrospectionQuery(normalizedQuery);
  const locationIntrospectionQuery = isLocationIntrospectionQuery(normalizedQuery);
  const originIntrospectionQuery = isOriginIntrospectionQuery(normalizedQuery);
  const queryTokens = tokenizeFastContext(normalizedQuery);
  if (queryTokens.length === 0 && !introspectionQuery) {
    return { context: "", sources: [] };
  }
  let memories = await dbAll(
    `SELECT id, content, type, metadata, importance_score, confidence_score, source_thread_id, created_at,
            0.0 AS retrieval_score
     FROM memories
     WHERE user_id = $1
       AND COALESCE(status, 'active') = 'active'
     ORDER BY importance_score DESC, last_accessed_at DESC NULLS LAST, created_at DESC
     LIMIT $2`,
    [normalizedUserId, 50]
  );

  // Semantic recall: merge a pgvector cosine candidate source into the keyword
  // candidate pool so memories that are relevant but do NOT lexically overlap the
  // query are still surfaced on the live chat path. Fully fail-open: any error
  // (no vector storage, slow/failed embedding, SQL error) leaves the keyword
  // behavior untouched.
  const semanticVectorScores = new Map();
  // Introspection / location / origin queries are deterministic special-cases with
  // their own exact-match selection; semantic recall targets the general token-overlap
  // path, so skip the embedding call for those to preserve their no-provider contract.
  const eligibleForSemanticRecall =
    !introspectionQuery && !locationIntrospectionQuery && !originIntrospectionQuery;
  if (eligibleForSemanticRecall && isChatMemoryVectorEnabled()) {
    try {
      const storageSupportsVectors = await checkStorage();
      if (storageSupportsVectors) {
        const semanticMin = resolveChatMemorySemanticMin();
        const embedTimeoutMs = resolveChatMemoryEmbedTimeoutMs();
        const embeddingResult = await withTimeout(getEmbeddings(normalizedQuery), {
          timeoutMs: embedTimeoutMs,
          label: "Chat memory embedding",
        });
        const queryEmbedding = embeddingResult?.embeddings?.[0];
        if (Array.isArray(queryEmbedding) && queryEmbedding.length > 0) {
          const vectorLiteral = `[${queryEmbedding.join(",")}]`;
          const vectorRows = await dbAll(
            `SELECT id, content, type, metadata, importance_score, confidence_score, source_thread_id, created_at,
                    (1 - (embedding <=> $2::vector)) AS retrieval_score
             FROM memories
             WHERE user_id = $1
               AND COALESCE(status, 'active') = 'active'
               AND embedding IS NOT NULL
             ORDER BY embedding <=> $2::vector ASC, importance_score DESC
             LIMIT 20`,
            [normalizedUserId, vectorLiteral]
          );
          const semanticCandidates = (vectorRows || [])
            .filter((row) => Number(row?.retrieval_score || 0) >= semanticMin)
            .map((row) => normalizeMemoryRowForUse(row));
          for (const candidate of semanticCandidates) {
            semanticVectorScores.set(
              String(candidate?.id || ""),
              Number(candidate?.retrieval_score || 0)
            );
          }
          // Prepend so dedupeMemoryRows keeps the semantic candidate when an id
          // collides with a keyword-pool row, but score/sort below decides order.
          memories = [...semanticCandidates, ...memories];
        }
      }
    } catch (err) {
      console.warn("[Memory] Fast-path semantic recall unavailable:", err?.message || err);
    }
  }

  memories = dedupeMemoryRows(memories.map((memory) => normalizeMemoryRowForUse(memory)))
    .map((memory) => {
      const keywordScore = introspectionQuery
        ? scoreFastContextMemory(memory, queryTokens) + getMemoryConfidenceScore(memory) * 2
        : scoreFastContextMemory(memory, queryTokens);
      // A semantic-only candidate (no lexical overlap) scores 0 on keywords; give
      // it a positive score derived from cosine similarity so it survives the
      // keyword-overlap filter below. Scaled to sit alongside lexical scores.
      const semanticScore = semanticVectorScores.has(String(memory?.id || ""))
        ? 5 + semanticVectorScores.get(String(memory?.id || "")) * 10
        : 0;
      return {
        ...memory,
        retrieval_score: Math.max(keywordScore, semanticScore),
      };
    })
    .filter((memory) => introspectionQuery || Number(memory.retrieval_score || 0) > 0)
    .sort((a, b) => {
      const scoreDiff = Number(b.retrieval_score || 0) - Number(a.retrieval_score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      const importanceDiff = getMemoryImportanceScore(b) - getMemoryImportanceScore(a);
      if (importanceDiff !== 0) return importanceDiff;
      const confidenceDiff = getMemoryConfidenceScore(b) - getMemoryConfidenceScore(a);
      if (confidenceDiff !== 0) return confidenceDiff;
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });

  if (originIntrospectionQuery) {
    const originOnly = memories.filter(
      (memory) => String(memory?.content || "").toLowerCase().startsWith("from ")
    );
    if (originOnly.length > 0) {
      memories = originOnly.slice(0, 1);
    }
  } else if (locationIntrospectionQuery) {
    const locationOnly = memories.filter(
      (memory) => getMemoryConflictDomain(memory) === "identity"
    );
    if (locationOnly.length > 0) {
      memories = locationOnly.slice(0, 1);
    }
  } else if (introspectionQuery) {
    memories = selectDiverseIntrospectionMemories(memories, boundedLimit);
  } else {
    memories = memories.slice(0, boundedLimit);
  }

  if (introspectionQuery && memories.length === 0) {
    const fallbackRows = (await dbAll(
      `SELECT id, content, type, metadata, importance_score, confidence_score, source_thread_id, created_at
       FROM memories
       WHERE user_id = $1
         AND COALESCE(status, 'active') = 'active'
       ORDER BY importance_score DESC, last_accessed_at DESC NULLS LAST, created_at DESC
       LIMIT 12`,
      [normalizedUserId]
    )).map((row) => normalizeMemoryRowForUse(row));
    memories = originIntrospectionQuery
      ? selectDiverseIntrospectionMemories(
          fallbackRows.filter((row) => String(row?.content || "").toLowerCase().startsWith("from ")),
          1
        )
      : locationIntrospectionQuery
      ? selectDiverseIntrospectionMemories(
          fallbackRows.filter((row) => getMemoryConflictDomain(row) === "identity"),
          1
        )
      : selectDiverseIntrospectionMemories(fallbackRows, boundedLimit);
  }
  if (!introspectionQuery && memories.length === 0) {
    memories = selectPersonalizationFallbackMemories(
      (await dbAll(
        `SELECT id, content, type, metadata, importance_score, confidence_score, source_thread_id, created_at
         FROM memories
         WHERE user_id = $1
           AND COALESCE(status, 'active') = 'active'
         ORDER BY importance_score DESC, last_accessed_at DESC NULLS LAST, created_at DESC
         LIMIT 12`,
        [normalizedUserId]
      )).map((row) => normalizeMemoryRowForUse(row)),
      boundedLimit
    );
  }
  if (memories.length === 0) {
    return { context: "", sources: [] };
  }

  if (
    normalizedThreadId &&
    shouldInjectSessionDeltaForThread({
      userId: normalizedUserId,
      currentThreadId: normalizedThreadId,
    })
  ) {
    const sessionDelta = await dbGet(
      `SELECT id, content, type, metadata, importance_score, confidence_score, source_thread_id, created_at
       FROM memories
       WHERE user_id = $1
         AND COALESCE(status, 'active') = 'active'
         AND metadata->>'source' = 'session_end'
         AND ($2::text IS NULL OR COALESCE(source_thread_id, '') <> $2)
       ORDER BY created_at DESC
       LIMIT 1`,
      [normalizedUserId, normalizedThreadId]
    );
    if (sessionDelta?.id) {
      const existingIds = new Set(memories.map((memory) => String(memory?.id || "")));
      if (!existingIds.has(String(sessionDelta.id))) {
        memories = [sessionDelta, ...memories].slice(0, boundedLimit);
      }
    }
  }

  let context = "About this person:\n";
  let charCount = context.length;
  const usedMemories = [];

  for (const memory of memories) {
    const metadata = getMemoryMetadata(memory);
    const isSessionDelta = metadata?.source === "session_end";
    const lineContent = isSessionDelta
      ? `Last time: ${toShortSessionDeltaLine(memory.content)}`
      : String(memory.content || "");
    const line = `- ${lineContent}\n`;
    if (charCount + line.length > maxChars) break;
    context += line;
    charCount += line.length;
    usedMemories.push(memory);
  }

  if (usedMemories.length === 0) {
    return { context: "", sources: [] };
  }

  return { context, sources: usedMemories };
}

function getChatContextBucket(memory) {
  const metadata = getMemoryMetadata(memory);
  const conflictKey = String(metadata?.conflictKey || "").toLowerCase();
  const content = String(memory?.content || "");
  const normalizedContent = content.toLowerCase();
  const type = String(memory?.type || "").toLowerCase();

  if (
    conflictKey.startsWith("identity:") ||
    /^name is\b/i.test(content) ||
    /^from\b/i.test(content) ||
    /^lives in\b/i.test(content)
  ) {
    return "profile";
  }

  if (
    type === "preference" ||
    conflictKey.startsWith("preference:") ||
    conflictKey.startsWith("constraint:")
  ) {
    return "preferences";
  }

  if (
    type === "goal" ||
    type === "event" ||
    type === "struggle" ||
    /^(working on|preparing|launching|building|tracking|trying to|planning to)\b/i.test(content) ||
    normalizedContent.includes("project") ||
    normalizedContent.includes("launch")
  ) {
    return "active";
  }

  return "recent";
}

function buildBucketedChatContext(memories, maxChars = 800) {
  const bucketOrder = [
    { key: "profile", title: "Profile", limit: 2 },
    { key: "preferences", title: "Preferences", limit: 2 },
    { key: "active", title: "Active", limit: 3 },
    { key: "recent", title: "Recent", limit: 3 },
  ];

  const grouped = new Map(bucketOrder.map((bucket) => [bucket.key, []]));
  for (const memory of memories) {
    const bucket = getChatContextBucket(memory);
    const bucketEntry = grouped.get(bucket);
    if (!bucketEntry) continue;
    if (bucketEntry.length >= bucketOrder.find((entry) => entry.key === bucket).limit) {
      continue;
    }
    bucketEntry.push(memory);
  }

  let context = "";
  let charCount = 0;
  const usedMemories = [];

  for (const bucket of bucketOrder) {
    const entries = grouped.get(bucket.key) || [];
    if (entries.length === 0) continue;

    const header = `${bucket.title}:\n`;
    if (charCount + header.length > maxChars) break;
    context += header;
    charCount += header.length;

    for (const memory of entries) {
      const line = `- ${String(memory?.content || "").trim()}\n`;
      if (charCount + line.length > maxChars) break;
      context += line;
      charCount += line.length;
      usedMemories.push(memory);
    }

    if (usedMemories.length > 0 && charCount + 1 <= maxChars) {
      context += "\n";
      charCount += 1;
    }
  }

  return {
    context: context.trim(),
    sources: usedMemories,
  };
}

// Deterministic, query-independent identity core. Pulls the user's top active
// memories, keeps only high-confidence (or user-verified) facts, then reuses the
// diverse-selection + bucketed-render machinery to emit a tiny bounded profile.
// Returns "" when nothing qualifies.
export async function buildIdentityCore({ userId }) {
  const trusted = (
    await dbAll(
      `SELECT id, content, type, metadata, importance_score, confidence_score, source_thread_id, created_at
       FROM memories
       WHERE user_id = $1
         AND COALESCE(status, 'active') = 'active'
       ORDER BY importance_score DESC, last_accessed_at DESC NULLS LAST, created_at DESC
       LIMIT 40`,
      [normalizeUserId(userId)]
    )
  )
    .map((row) => normalizeMemoryRowForUse(row))
    .filter(
      (row) =>
        getMemoryConfidenceScore(row) >= IDENTITY_CORE_MIN_CONFIDENCE ||
        getMemoryMetadata(row).userVerified === true
    );

  if (trusted.length === 0) return "";

  const picks = selectDiverseIntrospectionMemories(trusted, IDENTITY_CORE_MAX_ITEMS);
  return buildBucketedChatContext(picks, IDENTITY_CORE_MAX_CHARS).context || "";
}

export async function buildChatMemoryContext({
  userId,
  query,
  maxChars = 800,
  currentThreadId = null,
  limit = 6,
  mode = "default",
}) {
  const prefs = await getMemoryPreferences(userId);
  if (normalizeMemoryPolicy(prefs?.policy) === "off") {
    return { context: "", sources: [], core: "" };
  }
  const coreEnabled = isIdentityCoreEnabled();
  const core = coreEnabled ? await buildIdentityCore({ userId }) : "";
  const normalizedMode =
    mode === "introspection_summary" || mode === "introspection_fact" ? mode : "default";
  const boundedLimit = Math.max(1, Math.min(6, Number(limit) || 6));
  const effectiveLimit =
    normalizedMode === "introspection_summary"
      ? Math.max(boundedLimit, 4)
      : normalizedMode === "introspection_fact"
      ? Math.min(boundedLimit, 1)
      : boundedLimit;
  const fallbackFloor =
    normalizedMode === "introspection_summary"
      ? 4
      : normalizedMode === "introspection_fact"
      ? 1
      : 3;
  const base = await buildFastContext({
    userId,
    query,
    maxChars,
    currentThreadId,
    limit: effectiveLimit,
  });

  const sources = dedupeMemoryRows(
    (base.sources || []).map((memory) => normalizeMemoryRowForUse(memory))
  );

  if (sources.length < fallbackFloor) {
    const fallbackRows = (
      await dbAll(
        `SELECT id, content, type, metadata, importance_score, confidence_score, source_thread_id, created_at
         FROM memories
         WHERE user_id = $1
           AND COALESCE(status, 'active') = 'active'
         ORDER BY importance_score DESC, last_accessed_at DESC NULLS LAST, created_at DESC
         LIMIT 12`,
        [normalizeUserId(userId)]
      )
    ).map((memory) => normalizeMemoryRowForUse(memory));

    const seenIds = new Set(sources.map((memory) => String(memory?.id || "")));
    for (const memory of fallbackRows) {
      const memoryId = String(memory?.id || "");
      if (!memoryId || seenIds.has(memoryId)) continue;
      sources.push(memory);
      seenIds.add(memoryId);
      if (sources.length >= effectiveLimit) break;
    }
  }

  if (sources.length > effectiveLimit) {
    sources.length = effectiveLimit;
  }

  if (sources.length === 0) {
    return { context: "", sources: [], core };
  }

  const bucketed = buildBucketedChatContext(sources, maxChars);
  return { context: bucketed.context, sources: bucketed.sources, core };
}

export function normalizeMemoryRecordForMaintenance(row) {
  const metadata = sanitizeStoredMetadata(row?.metadata || {});
  const content = normalizeStoredMemoryContent(row?.content, row?.type, metadata);
  const fingerprint = buildConflictFingerprint({
    content,
    conflictKey: metadata.conflictKey,
    polarity: metadata.polarity,
  });
  if (fingerprint?.key) {
    metadata.conflictKey = fingerprint.key;
    metadata.polarity = fingerprint.polarity ?? metadata.polarity ?? 0;
  }
  return {
    content,
    type: normalizeStoredType(row?.type),
    metadata,
  };
}

export async function searchMemories({ userId, query, limit = 5 }) {
  const normalizedUserId = normalizeUserId(userId);
  return await dbAll(
    `SELECT id, content, type, 0.8 AS similarity
     FROM memories
     WHERE user_id = $1
       AND COALESCE(status, 'active') = 'active'
       AND content ILIKE $2
     ORDER BY created_at DESC LIMIT $3`,
    [normalizedUserId, `%${query}%`, limit]
  );
}

function calculateImportance(content, type) {
  const weights = {
    goal: 0.9, event: 0.85, fact: 0.8, relationship: 0.8,
    struggle: 0.75, preference: 0.7, emotion: 0.5
  };
  return weights[type] || 0.6;
}
