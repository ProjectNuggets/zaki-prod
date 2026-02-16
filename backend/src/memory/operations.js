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

function normalizePreferenceValue(value) {
  const normalized = normalizeText(value);
  if (!normalized) return normalized;
  const withoutEnglishArticles = normalized.replace(/^(the|a|an)\s+/, "");
  const arabicWords = withoutEnglishArticles
    .split(" ")
    .map((word) => word.replace(/^ال/, ""))
    .filter(Boolean);
  return arabicWords.join(" ").trim();
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
    { regex: /^likes\s+([^.,]+)/i, key: "preference", polarity: 1 },
    { regex: /^dislikes\s+([^.,]+)/i, key: "preference", polarity: -1 },
    { regex: /(?:user|the user)\s+(?:likes|loves|enjoys|prefers)\s+([^.,]+)/i, key: "preference", polarity: 1 },
    { regex: /(?:user|the user)\s+(?:doesn't like|does not like|dislikes|hates)\s+([^.,]+)/i, key: "preference", polarity: -1 },
    { regex: /i (like|love|enjoy|prefer)\s+([^.,]+)/i, key: "preference", polarity: 1 },
    { regex: /i (dont|don't|do not|dislike|hate)\s+([^.,]+)/i, key: "preference", polarity: -1 },
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
  const hash = hashText(content);
  const isPg = await checkStorage();
  const resolvedMetadata = metadata ? { ...metadata } : {};
  const normalizedFingerprint = buildConflictFingerprint({
    content,
    conflictKey: resolvedMetadata.conflictKey,
    polarity: resolvedMetadata.polarity,
  });
  if (normalizedFingerprint?.key) {
    resolvedMetadata.conflictKey = normalizedFingerprint.key;
    resolvedMetadata.polarity = normalizedFingerprint.polarity ?? 0;
  }
  
  // Check dupes
  if (isPg) {
    const existing = await dbGet(
      "SELECT id FROM memories WHERE user_id = $1 AND content_hash = $2",
      [normalizedUserId, hash]
    );
    if (existing) return { id: existing.id, duplicate: true };
  }
  
  // Get embeddings (graceful degradation - S-tier)
  let embedding = null;
  try {
    const result = await getEmbeddings(content);
    embedding = result.embeddings[0];
  } catch (err) {
    console.warn("[Memory] No embeddings:", err.message);
  }

  const importance = importanceScore || calculateImportance(content, type);
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
          content,
          hash,
          type,
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
          content,
          hash,
          type,
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

export async function getMemories(userId) {
  const normalizedUserId = normalizeUserId(userId);
  return await dbAll(
    `SELECT id, content, type, content_hash, metadata, created_at, importance_score as importance, source_thread_id as "threadId"
     FROM memories WHERE user_id = $1 ORDER BY created_at DESC`,
    [normalizedUserId]
  );
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
  const id = crypto.randomUUID();
  await dbQuery(
    `INSERT INTO memory_confirmations 
     (id, user_id, content, type, source_thread_id, source_message_id, conflict_key, polarity, confidence_score, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW())`,
    [
      id,
      normalizedUserId,
      content,
      type,
      sourceThreadId,
      null,
      conflictKey,
      polarity,
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
  const id = crypto.randomUUID();
  await dbQuery(
    `INSERT INTO memory_conflicts
     (id, user_id, new_content, new_type, new_confidence_score, conflicting_memory_id, conflicting_content, conflicting_type, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW())`,
    [
      id,
      normalizedUserId,
      newContent,
      newType,
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
  // First, try to find relevant memories via text search
  let memories = [];
  let usedFallback = false;
  
  if (query) {
    memories = await dbAll(
      `SELECT id, content, type, importance_score FROM memories 
       WHERE user_id = $1 AND (content ILIKE $2 OR $2 ILIKE '%' || content || '%')
       ORDER BY importance_score DESC, last_accessed_at DESC NULLS LAST
       LIMIT 10`,
      [normalizedUserId, `%${query}%`]
    );
  }
  
  // If no query matches, or query is empty, get the most important memories
  // This ensures we always inject context about the person (e.g., their name)
  if (memories.length === 0) {
    memories = await dbAll(
      `SELECT id, content, type, importance_score FROM memories 
       WHERE user_id = $1
       ORDER BY importance_score DESC, created_at DESC
       LIMIT 10`,
      [normalizedUserId]
    );
    usedFallback = true;
  }
  
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
