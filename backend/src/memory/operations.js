/**
 * Memory Operations - Clean, scalable CRUD (S-tier)
 * 
 * Graceful degradation: Works with or without embeddings
 */

import crypto from "node:crypto";
import { dbQuery, dbGet, dbAll, hasPgVector } from "../db.js";

// ============================================================================
// Storage Detection
// ============================================================================

export async function checkStorage() {
  return await hasPgVector();
}

// ============================================================================
// Embeddings (with graceful degradation)
// ============================================================================

export async function getEmbeddings(texts) {
  const NOVA_TYP_BASE_URL = (process.env.NOVA_TYP_BASE_URL || "").trim();
  const NOVA_TYP_API_KEY = (process.env.NOVA_TYP_API_KEY || "").trim();
  
  if (!NOVA_TYP_BASE_URL) {
    throw new Error("NOVA_TYP_BASE_URL not configured");
  }
  
  const input = Array.isArray(texts) ? texts : [texts];
  
  const body = {
    model: "bge-m3",
    input: input,
  };
  
  if (NOVA_TYP_API_KEY) {
    body.apiKey = NOVA_TYP_API_KEY;
  }
  
  const response = await fetch(`${NOVA_TYP_BASE_URL}/v1/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
}) {
  const hash = hashText(content);
  const isPg = await checkStorage();
  
  // Check dupes
  if (isPg) {
    const existing = await dbGet(
      "SELECT id FROM memories WHERE user_id = $1 AND content_hash = $2",
      [userId, hash]
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
         (id, user_id, content, content_hash, type, embedding, importance_score, source_thread_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::vector, $7, $8, NOW())`,
        [id, userId, content, hash, type, `[${embedding.join(",")}]`, importance, sourceThreadId]
      );
    } else {
      await dbQuery(
        `INSERT INTO memories 
         (id, user_id, content, content_hash, type, importance_score, source_thread_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [id, userId, content, hash, type, importance, sourceThreadId]
      );
    }
  }

  return { id, duplicate: false, importance };
}

export async function deleteMemory(id, userId) {
  const result = await dbQuery(
    "DELETE FROM memories WHERE id = $1 AND user_id = $2 RETURNING id",
    [id, userId]
  );
  return result.rowCount > 0;
}

export async function getMemories(userId) {
  return await dbAll(
    `SELECT id, content, type, created_at, importance_score as importance, source_thread_id as "threadId"
     FROM memories WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
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
}) {
  const id = crypto.randomUUID();
  await dbQuery(
    `INSERT INTO memory_confirmations 
     (id, user_id, content, type, source_thread_id, source_message_id, confidence_score, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())`,
    [id, userId, content, type, sourceThreadId, null, confidenceScore]
  );
  return { id, status: "pending" };
}

export async function getPendingConfirmations(userId, limit = 50) {
  return await dbAll(
    `SELECT id, content, type, confidence_score, created_at
     FROM memory_confirmations WHERE user_id = $1 AND status = 'pending'
     ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
}

export async function confirmMemory(confirmationId, userId) {
  const confirmation = await dbGet(
    "SELECT * FROM memory_confirmations WHERE id = $1 AND user_id = $2",
    [confirmationId, userId]
  );
  
  if (!confirmation) return { error: "Not found" };
  
  // Store to memories
  const result = await storeMemory({
    userId,
    content: confirmation.content,
    type: confirmation.type,
    sourceThreadId: confirmation.source_thread_id,
  });
  
  // Mark confirmed
  await dbQuery(
    "UPDATE memory_confirmations SET status = 'confirmed', updated_at = NOW() WHERE id = $1",
    [confirmationId]
  );
  
  return { success: true, memory: result };
}

export async function rejectMemory(confirmationId, userId) {
  await dbQuery(
    "UPDATE memory_confirmations SET status = 'rejected' WHERE id = $1 AND user_id = $2",
    [confirmationId, userId]
  );
  return { success: true };
}

// ============================================================================
// Context Building
// ============================================================================

export async function buildContext({ userId, query, maxChars = 2000 }) {
  // First, try to find relevant memories via text search
  let memories = [];
  
  if (query) {
    memories = await dbAll(
      `SELECT content, type, importance_score FROM memories 
       WHERE user_id = $1 AND (content ILIKE $2 OR $2 ILIKE '%' || content || '%')
       ORDER BY importance_score DESC, last_accessed_at DESC NULLS LAST
       LIMIT 10`,
      [userId, `%${query}%`]
    );
  }
  
  // If no query matches, or query is empty, get the most important memories
  // This ensures we always inject context about the person (e.g., their name)
  if (memories.length === 0) {
    memories = await dbAll(
      `SELECT content, type, importance_score FROM memories 
       WHERE user_id = $1
       ORDER BY importance_score DESC, created_at DESC
       LIMIT 10`,
      [userId]
    );
  }
  
  if (memories.length === 0) {
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
  return await dbAll(
    `SELECT id, content, type, 0.8 AS similarity
     FROM memories WHERE user_id = $1 AND content ILIKE $2
     ORDER BY created_at DESC LIMIT $3`,
    [userId, `%${query}%`, limit]
  );
}

function calculateImportance(content, type) {
  const weights = {
    goal: 0.9, event: 0.85, fact: 0.8, relationship: 0.8,
    struggle: 0.75, preference: 0.7, emotion: 0.5
  };
  return weights[type] || 0.6;
}
