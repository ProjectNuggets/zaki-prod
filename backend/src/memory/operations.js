/**
 * Memory Operations - Clean, scalable CRUD (S-tier)
 * 
 * Graceful degradation: Works with or without embeddings
 */

import crypto from "node:crypto";
import { z } from "zod";
import { dbQuery, dbGet, dbAll, hasPgVector } from "../db.js";

// ============================================================================
// Storage Detection
// ============================================================================

export async function checkStorage() {
  return await hasPgVector();
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
  const normalized = normalizeText(value);
  if (!normalized) return normalized;
  const withoutEnglishArticles = normalized.replace(/^(the|a|an)\s+/, "");
  const withoutInfinitivePrefix = withoutEnglishArticles.replace(/^to\s+/, "");
  const words = withoutInfinitivePrefix
    .split(" ")
    .map((word) => word.replace(/^ال/, ""))
    .filter(Boolean);

  if (words.length === 0) return "";

  const normalizedWords = [...words];
  normalizedWords[normalizedWords.length - 1] = singularizeEnglishWord(normalizedWords[normalizedWords.length - 1]);

  return normalizedWords.join(" ").trim();
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
      ? normalizePreferenceValue(valueFromKey || fromContent?.value)
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

function dedupeMemoryRows(rows) {
  const seen = new Set();
  const deduped = [];
  for (const row of rows || []) {
    const key = buildSemanticMemoryKey(row);
    if (!key) {
      deduped.push(row);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }
  return deduped;
}

function escapeLikePattern(value) {
  return String(value || "").replace(/[\\%_]/g, "\\$&");
}

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function rankContextCandidates(rows) {
  return [...(rows || [])].sort((a, b) => {
    const aScore =
      toFiniteNumber(a?.retrieval_score, 0) * 0.75 +
      toFiniteNumber(a?.importance_score, 0.5) * 0.25;
    const bScore =
      toFiniteNumber(b?.retrieval_score, 0) * 0.75 +
      toFiniteNumber(b?.importance_score, 0.5) * 0.25;
    return bScore - aScore;
  });
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
     WHERE user_id = $1 AND content_hash = $2
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
  return base.replace(/\/+$/, "");
}

async function filterRelevantMemories({ query, memories, allowFallback = false }) {
  const normalizedQuery = String(query || "").trim();
  if (!normalizedQuery || memories.length === 0) return [];

  const baseUrl = (process.env.NOVA_TYP_BASE_URL || "").trim();
  if (!baseUrl) {
    return allowFallback ? memories : [];
  }

  const apiBase = baseUrl.replace(/\/+$/, "");
  const NOVA_TYP_API_KEY = (process.env.NOVA_TYP_API_KEY || "").trim();
  const payload = {
    query: normalizedQuery,
    memories: memories.map((m) => ({ id: m.id, content: m.content, type: m.type })),
  };

  const ResponseSchema = z.object({
    relevant_ids: z.array(z.string()).optional(),
  });

  try {
    const response = await fetch(`${apiBase}/api/v1/openai/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(NOVA_TYP_API_KEY ? { Authorization: `Bearer ${NOVA_TYP_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a relevance filter. Return JSON {\"relevant_ids\": [\"id1\", ...]} for memories that are directly relevant to answering the query. If none are relevant, return an empty array. Only use ids from the provided list.",
          },
          { role: "user", content: JSON.stringify(payload) },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`Relevance check failed: ${response.status}`);
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return [];
    const parsed = JSON.parse(content);
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

  const response = await fetch(`${apiBase}/api/v1/openai/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(NOVA_TYP_API_KEY ? { Authorization: `Bearer ${NOVA_TYP_API_KEY}` } : {}),
    },
    body: JSON.stringify({ model: "all-MiniLM-L6-v2", input }),
  });
  
  if (!response.ok) {
    throw new Error(`Embedding failed: ${response.status}`);
  }
  
  const data = await response.json();
  return {
    embeddings: data.embeddings,
    provider: "novatyp",
    dims: 384,
  };
}

// ============================================================================
// Core Operations
// ============================================================================

export function hashText(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export async function storeMemory({
  userId,
  content,
  type = "context",
  sourceThreadId = null,
  importanceScore = null,
  metadata = null,
}) {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedContent = normalizeStoredContent(content);
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
  const id = crypto.randomUUID();
  
  if (isPg) {
    if (embedding) {
      await dbQuery(
        `INSERT INTO memories 
         (id, user_id, content, content_hash, type, embedding, importance_score, source_thread_id, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::vector, $7, $8, $9, NOW())`,
        [
          id,
          normalizedUserId,
          normalizedContent,
          hash,
          normalizedType,
          `[${embedding.join(",")}]`,
          importance,
          sourceThreadId,
          resolvedMetadata,
        ]
      );
    } else {
      await dbQuery(
        `INSERT INTO memories 
         (id, user_id, content, content_hash, type, importance_score, source_thread_id, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          id,
          normalizedUserId,
          normalizedContent,
          hash,
          normalizedType,
          importance,
          sourceThreadId,
          resolvedMetadata,
        ]
      );
    }
  }

  return { id, duplicate: false, importance };
}

export async function deleteMemory(id, userId) {
  const normalizedUserId = normalizeUserId(userId);
  const result = await dbQuery(
    "DELETE FROM memories WHERE id = $1 AND user_id = $2 RETURNING id",
    [id, normalizedUserId]
  );
  return result.rowCount > 0;
}

export async function getMemories(userId, { limit = 100, cursor = null } = {}) {
  const normalizedUserId = normalizeUserId(userId);
  const pageLimit = Math.max(1, Math.min(100, Number(limit) || 100));
  const cursorValue = decodeMemoryCursor(cursor);
  const fetchLimit = Math.min(pageLimit * 3, 300);

  const rows = cursorValue
    ? await dbAll(
        `SELECT id, content, type, content_hash, metadata, created_at, importance_score as importance, source_thread_id as "threadId"
         FROM memories
         WHERE user_id = $1
           AND (
             created_at < $2::timestamptz
             OR (created_at = $2::timestamptz AND id < $3)
           )
         ORDER BY created_at DESC, id DESC
         LIMIT $4`,
        [normalizedUserId, cursorValue.createdAt, cursorValue.id, fetchLimit]
      )
    : await dbAll(
        `SELECT id, content, type, content_hash, metadata, created_at, importance_score as importance, source_thread_id as "threadId"
         FROM memories
         WHERE user_id = $1
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
// Manual Mode (Confirmation Flow)
// ============================================================================

export async function stageMemory({
  userId,
  content,
  type,
  sourceThreadId = null,
  confidenceScore = 0.8,
  conflictKey = null,
  polarity = null,
}) {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedContent = normalizeStoredContent(content);
  if (!normalizedUserId || !normalizedContent) {
    return { error: "Invalid memory payload." };
  }
  const normalizedType = normalizeStoredType(type);
  const normalizedFingerprint = buildConflictFingerprint({
    content: normalizedContent,
    conflictKey,
    polarity,
  });
  const normalizedConflictKey = normalizedFingerprint?.key || conflictKey || null;
  const normalizedPolarity =
    normalizedFingerprint?.polarity !== undefined &&
    normalizedFingerprint?.polarity !== null
      ? normalizedFingerprint.polarity
      : polarity;

  // Dedupe pending queue entries so "preview/manual" doesn't stack duplicates.
  const existingPending = await dbAll(
    `SELECT id, content, conflict_key, polarity
     FROM memory_confirmations
     WHERE user_id = $1 AND status = 'pending'
     ORDER BY created_at DESC
     LIMIT 200`,
    [normalizedUserId]
  );
  const incomingFingerprint = buildConflictFingerprint({
    content: normalizedContent,
    conflictKey: normalizedConflictKey,
    polarity: normalizedPolarity,
  });
  for (const row of existingPending) {
    const existingFingerprint = buildConflictFingerprint({
      content: row.content,
      conflictKey: row.conflict_key,
      polarity: row.polarity,
    });
    if (
      isSemanticDuplicate({
        existingFingerprint,
        incomingFingerprint,
        existingContent: row.content,
        incomingContent: normalizedContent,
      })
    ) {
      return { id: row.id, status: "pending", duplicate: true };
    }
    if (normalizeText(row.content) === normalizeText(normalizedContent)) {
      return { id: row.id, status: "pending", duplicate: true };
    }
  }

  const id = crypto.randomUUID();
  await dbQuery(
    `INSERT INTO memory_confirmations 
     (id, user_id, content, type, source_thread_id, source_message_id, conflict_key, polarity, confidence_score, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW())`,
    [
      id,
      normalizedUserId,
      normalizedContent,
      normalizedType,
      sourceThreadId,
      null,
      normalizedConflictKey,
      normalizedPolarity,
      confidenceScore,
    ]
  );
  return { id, status: "pending" };
}

export async function getPendingConfirmations(userId, limit = 50) {
  const normalizedUserId = normalizeUserId(userId);
  return await dbAll(
    `SELECT id, content, type, confidence_score, created_at
     FROM memory_confirmations WHERE user_id = $1 AND status = 'pending'
     ORDER BY created_at DESC LIMIT $2`,
    [normalizedUserId, limit]
  );
}

export async function getPendingConfirmationCount(userId) {
  const normalizedUserId = normalizeUserId(userId);
  const row = await dbGet(
    `SELECT COUNT(*)::int AS count
     FROM memory_confirmations
     WHERE user_id = $1 AND status = 'pending'`,
    [normalizedUserId]
  );
  return Number(row?.count || 0);
}

export async function confirmMemory(confirmationId, userId) {
  const normalizedUserId = normalizeUserId(userId);
  const confirmation = await dbGet(
    "SELECT * FROM memory_confirmations WHERE id = $1 AND user_id = $2",
    [confirmationId, normalizedUserId]
  );
  
  if (!confirmation) return { error: "Not found" };
  
  // Store to memories
  const metadata = {};
  if (confirmation.conflict_key) {
    metadata.conflictKey = confirmation.conflict_key;
  }
  if (confirmation.polarity) {
    metadata.polarity = confirmation.polarity;
  }
  const result = await storeMemory({
    userId: normalizedUserId,
    content: confirmation.content,
    type: confirmation.type,
    sourceThreadId: confirmation.source_thread_id,
    metadata: Object.keys(metadata).length ? metadata : null,
  });
  
  // Mark confirmed
  await dbQuery(
    "UPDATE memory_confirmations SET status = 'confirmed', updated_at = NOW() WHERE id = $1",
    [confirmationId]
  );
  
  return { success: true, memory: result };
}

export async function rejectMemory(confirmationId, userId) {
  const normalizedUserId = normalizeUserId(userId);
  await dbQuery(
    "UPDATE memory_confirmations SET status = 'rejected' WHERE id = $1 AND user_id = $2",
    [confirmationId, normalizedUserId]
  );
  return { success: true };
}

// ============================================================================
// Conflict Handling (Always ask user)
// ============================================================================

export async function findConflict({ userId, content, conflictKey = null, polarity = null }) {
  const normalizedUserId = normalizeUserId(userId);
  const newKey = buildConflictFingerprint({ content, conflictKey, polarity });
  if (!newKey) return null;

  const existing = await dbAll(
    `SELECT id, content, type, metadata FROM memories WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200`,
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

export async function createConflict({
  userId,
  newContent,
  newType,
  newConfidenceScore = 0.8,
  conflictMemory,
}) {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedNewContent = normalizeStoredContent(newContent);
  if (!normalizedUserId || !normalizedNewContent) {
    throw new Error("Invalid conflict payload.");
  }

  // Dedupe pending conflicts for the same user/fact pair.
  const pendingConflicts = await dbAll(
    `SELECT id, new_content, conflicting_memory_id
     FROM memory_conflicts
     WHERE user_id = $1 AND status = 'pending'
     ORDER BY created_at DESC
     LIMIT 200`,
    [normalizedUserId]
  );
  for (const row of pendingConflicts) {
    const sameConflictMemory =
      String(row.conflicting_memory_id || "") ===
      String(conflictMemory?.memoryId || "");
    const sameContent =
      normalizeText(row.new_content || "") === normalizeText(normalizedNewContent);
    if (sameConflictMemory && sameContent) {
      return { id: row.id, duplicate: true };
    }
  }

  const id = crypto.randomUUID();
  await dbQuery(
    `INSERT INTO memory_conflicts
     (id, user_id, new_content, new_type, new_confidence_score, conflicting_memory_id, conflicting_content, conflicting_type, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW())`,
    [
      id,
      normalizedUserId,
      normalizedNewContent,
      normalizeStoredType(newType),
      newConfidenceScore,
      conflictMemory?.memoryId || null,
      conflictMemory?.content || null,
      conflictMemory?.type || null,
    ]
  );
  return { id };
}

export async function getConflicts(userId, limit = 50) {
  const normalizedUserId = normalizeUserId(userId);
  return await dbAll(
    `SELECT id, new_content, new_type, new_confidence_score, conflicting_memory_id,
            conflicting_content, conflicting_type, status, created_at, resolved_at, resolution
     FROM memory_conflicts
     WHERE user_id = $1 AND status = 'pending'
     ORDER BY created_at DESC
     LIMIT $2`,
    [normalizedUserId, limit]
  );
}

export async function getConflictCount(userId) {
  const normalizedUserId = normalizeUserId(userId);
  const row = await dbGet(
    `SELECT COUNT(*)::int AS count
     FROM memory_conflicts
     WHERE user_id = $1 AND status = 'pending'`,
    [normalizedUserId]
  );
  return Number(row?.count || 0);
}

export async function resolveConflict({ userId, conflictId, action }) {
  const normalizedUserId = normalizeUserId(userId);
  const conflict = await dbGet(
    `SELECT * FROM memory_conflicts WHERE id = $1 AND user_id = $2`,
    [conflictId, normalizedUserId]
  );
  if (!conflict) return { error: "Not found" };

  if (action === "use_new") {
    if (conflict.conflicting_memory_id) {
      await deleteMemory(conflict.conflicting_memory_id, normalizedUserId);
    }
    await storeMemory({
      userId: normalizedUserId,
      content: conflict.new_content,
      type: conflict.new_type,
    });
    await dbQuery(
      `UPDATE memory_conflicts
       SET status = 'resolved', resolution = 'use_new', resolved_at = NOW()
       WHERE id = $1`,
      [conflictId]
    );
    return { success: true, resolution: "use_new" };
  }

  await dbQuery(
    `UPDATE memory_conflicts
     SET status = 'resolved', resolution = 'keep_existing', resolved_at = NOW()
     WHERE id = $1`,
    [conflictId]
  );
  return { success: true, resolution: "keep_existing" };
}

// ============================================================================
// Context Building
// ============================================================================

export async function buildContext({ userId, query, maxChars = 2000 }) {
  const normalizedUserId = normalizeUserId(userId);
  let memories = [];
  let usedFallback = false;

  if (query) {
    const trimmedQuery = String(query).trim();
    const lexicalPattern = `%${escapeLikePattern(trimmedQuery)}%`;

    const lexicalPromise = dbAll(
      `SELECT id, content, type, metadata, importance_score, created_at,
              CASE
                WHEN LOWER(content) = LOWER($2) THEN 1.0
                WHEN content ILIKE $3 ESCAPE '\\' THEN 0.82
                WHEN $2 ILIKE '%' || content || '%' THEN 0.74
                ELSE 0.6
              END AS retrieval_score
       FROM memories
       WHERE user_id = $1
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
            `SELECT id, content, type, metadata, importance_score, created_at,
                    (1 - (embedding <=> $2::vector)) AS retrieval_score
             FROM memories
             WHERE user_id = $1
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
      `SELECT id, content, type, metadata, importance_score
       FROM memories
       WHERE user_id = $1
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
      return { context: "", sources: [] };
    }
    memories = filtered;
  } else {
    return { context: "", sources: [] };
  }
  
  // Build context string with character limit
  let context = "About this person:\n";
  let charCount = context.length;
  const usedMemories = [];
  
  for (const m of memories) {
    const line = `- ${m.content}\n`;
    if (charCount + line.length > maxChars) break;
    context += line;
    charCount += line.length;
    usedMemories.push(m);
  }
  
  return { context, sources: usedMemories };
}

export async function searchMemories({ userId, query, limit = 5 }) {
  const normalizedUserId = normalizeUserId(userId);
  return await dbAll(
    `SELECT id, content, type, 0.8 AS similarity
     FROM memories WHERE user_id = $1 AND content ILIKE $2
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
