/**
 * ZAKI Memory Layer
 * 
 * Semantic memory storage and retrieval using pgvector.
 * Falls back to in-memory store if pgvector is unavailable.
 * 
 * Providers: NOVA.TYP (primary, 384 dims) → Together.ai (fallback, 768 dims)
 */

import crypto from "node:crypto";
import { dbQuery, dbGet, dbAll, hasPgVector } from "./db.js";

// =============================================================================
// Configuration
// =============================================================================

function getConfig() {
  return {
    novatypBaseUrl: process.env.NOVA_TYP_BASE_URL || "https://typ.novanuggets.com",
    novatypApiKey: process.env.NOVA_TYP_API_KEY || "",
    togetherApiKey: process.env.TOGETHER_API_KEY || "",
  };
}

const NOVATYP_DIMS = 384;
const TOGETHER_DIMS = 768;

// In-memory fallback store
const memoryStoreFallback = new Map();
let usePgVector = null; // null = not checked yet

// =============================================================================
// Embedding Provider
// =============================================================================

async function getEmbeddings(texts) {
  const config = getConfig();
  const textArray = Array.isArray(texts) ? texts : [texts];
  
  // Try NOVA.TYP first
  if (config.novatypApiKey) {
    try {
      const response = await fetch(`${config.novatypBaseUrl}/api/v1/openai/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.novatypApiKey}`,
        },
        body: JSON.stringify({ input: textArray, model: "all-MiniLM-L6-v2" }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.length) {
          return {
            embeddings: data.data.map((item) => item.embedding),
            provider: "novatyp",
            model: "all-MiniLM-L6-v2",
            dims: NOVATYP_DIMS,
          };
        }
      }
    } catch (err) {
      console.warn("[Memory] NOVA.TYP failed:", err.message);
    }
  }

  // Fallback to Together.ai
  if (config.togetherApiKey) {
    try {
      const response = await fetch("https://api.together.xyz/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.togetherApiKey}`,
        },
        body: JSON.stringify({
          input: textArray,
          model: "togethercomputer/m2-bert-80M-8k-retrieval",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.length) {
          return {
            embeddings: data.data.map((item) => item.embedding),
            provider: "together",
            model: "m2-bert-80M-8k-retrieval",
            dims: TOGETHER_DIMS,
          };
        }
      }
    } catch (err) {
      console.warn("[Memory] Together.ai failed:", err.message);
    }
  }

  throw new Error("All embedding providers failed");
}

function hashText(text) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const mag = Math.sqrt(normA) * Math.sqrt(normB);
  return mag === 0 ? 0 : dot / mag;
}

// =============================================================================
// Storage Layer (pgvector with in-memory fallback)
// =============================================================================

async function checkStorage() {
  if (usePgVector === null) {
    try {
      usePgVector = await hasPgVector();
      console.log(`[Memory] Storage: ${usePgVector ? "pgvector" : "in-memory"}`);
    } catch {
      usePgVector = false;
    }
  }
  return usePgVector;
}

async function storeMemory({ userId, content, type = "context", metadata = {} }) {
  const hash = hashText(content);
  const isPg = await checkStorage();

  // Check for duplicates
  if (isPg) {
    const existing = await dbGet(
      "SELECT id FROM memories WHERE user_id = $1 AND content_hash = $2",
      [userId, hash]
    );
    if (existing) return { id: existing.id, duplicate: true };
  } else {
    for (const [id, mem] of memoryStoreFallback.entries()) {
      if (mem.userId === userId && mem.hash === hash) {
        return { id, duplicate: true };
      }
    }
  }

  const { embeddings, provider, dims } = await getEmbeddings(content);
  const embedding = embeddings[0];

  if (isPg) {
    // Store with pgvector
    const vectorStr = `[${embedding.join(",")}]`;
    const result = await dbQuery(
      `INSERT INTO memories (user_id, content, content_hash, type, embedding, embedding_provider, metadata)
       VALUES ($1, $2, $3, $4, $5::vector, $6, $7)
       RETURNING id`,
      [userId, content, hash, type, vectorStr, provider, JSON.stringify(metadata)]
    );
    return { id: result.rows[0].id, duplicate: false };
  } else {
    // In-memory fallback
    const id = crypto.randomUUID();
    memoryStoreFallback.set(id, {
      id, userId, content, hash, type, embedding, provider, dims, metadata,
      createdAt: new Date().toISOString(),
    });
    return { id, duplicate: false };
  }
}

async function searchMemories({ userId, query, limit = 5, minScore = 0.3 }) {
  const { embeddings, provider, model } = await getEmbeddings(query);
  const queryEmb = embeddings[0];
  const isPg = await checkStorage();

  if (isPg) {
    // pgvector cosine similarity search
    const vectorStr = `[${queryEmb.join(",")}]`;
    const rows = await dbAll(
      `SELECT id, content, type, metadata, created_at,
              1 - (embedding <=> $1::vector) as score
       FROM memories
       WHERE user_id = $2
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [vectorStr, userId, limit * 2] // fetch extra to filter by minScore
    );
    
    const results = rows
      .filter((r) => r.score >= minScore)
      .slice(0, limit)
      .map((r) => ({
        id: r.id,
        content: r.content,
        type: r.type,
        score: r.score,
        createdAt: r.created_at,
        metadata: r.metadata || {},
      }));

    const total = await dbGet("SELECT COUNT(*) as count FROM memories WHERE user_id = $1", [userId]);
    return { results, provider, model, totalSearched: Number(total?.count || 0) };
  } else {
    // In-memory fallback
    const results = [];
    for (const mem of memoryStoreFallback.values()) {
      if (mem.userId !== userId) continue;
      if (mem.embedding.length !== queryEmb.length) continue;
      const score = cosineSimilarity(queryEmb, mem.embedding);
      if (score >= minScore) {
        results.push({
          id: mem.id,
          content: mem.content,
          type: mem.type,
          score,
          createdAt: mem.createdAt,
          metadata: mem.metadata,
        });
      }
    }
    results.sort((a, b) => b.score - a.score);
    return {
      results: results.slice(0, limit),
      provider,
      model,
      totalSearched: memoryStoreFallback.size,
    };
  }
}

async function getMemories(userId) {
  const isPg = await checkStorage();
  if (isPg) {
    const rows = await dbAll(
      "SELECT id, content, type, metadata, created_at FROM memories WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    return rows.map((r) => ({
      id: r.id,
      content: r.content,
      type: r.type,
      createdAt: r.created_at,
      metadata: r.metadata || {},
    }));
  } else {
    const memories = [];
    for (const mem of memoryStoreFallback.values()) {
      if (mem.userId === userId) {
        memories.push({
          id: mem.id,
          content: mem.content,
          type: mem.type,
          createdAt: mem.createdAt,
          metadata: mem.metadata,
        });
      }
    }
    return memories;
  }
}

async function deleteMemory(id, userId) {
  const isPg = await checkStorage();
  if (isPg) {
    const result = await dbQuery(
      "DELETE FROM memories WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    return result.rowCount > 0;
  } else {
    const mem = memoryStoreFallback.get(id);
    if (!mem || mem.userId !== userId) return false;
    return memoryStoreFallback.delete(id);
  }
}

// =============================================================================
// Context Builder for LLM Injection
// =============================================================================

async function buildContext({ userId, query, maxChars = 2000 }) {
  const { results, provider, model } = await searchMemories({
    userId, query, limit: 8, minScore: 0.25,
  });

  if (!results.length) return { context: "", sources: [], provider, model };

  const sources = [];
  
  // Categorize memories
  const facts = results.filter((r) => r.type === "fact");
  const prefs = results.filter((r) => r.type === "preference");
  const contexts = results.filter((r) => r.type === "context" || !r.type);

  // Build buddy-style context
  const lines = [];
  
  // Extract name if we have it
  const nameFact = facts.find((f) => 
    /\b(name is|i'm |i am |call me )\b/i.test(f.content)
  );
  const nameMatch = nameFact?.content.match(/(?:name is|i'm |i am |call me )(\w+)/i);
  const userName = nameMatch?.[1];

  // Opening line - who is this person?
  if (userName) {
    lines.push(`You're chatting with ${userName} — someone you know.`);
    sources.push({ id: nameFact.id, snippet: nameFact.content.slice(0, 80), score: nameFact.score });
  } else {
    lines.push("You're chatting with someone you've talked to before.");
  }

  // Add personality/identity facts naturally
  const identityFacts = facts.filter((f) => 
    f !== nameFact && /\b(work|job|developer|engineer|founder|student|live|from)\b/i.test(f.content)
  );
  if (identityFacts.length) {
    const identitySnippets = identityFacts.slice(0, 2).map((f) => {
      sources.push({ id: f.id, snippet: f.content.slice(0, 80), score: f.score });
      return f.content;
    });
    lines.push(`What you know: ${identitySnippets.join(". ")}`);
  }

  // Add preferences conversationally
  if (prefs.length) {
    const prefSnippets = prefs.slice(0, 3).map((p) => {
      sources.push({ id: p.id, snippet: p.content.slice(0, 80), score: p.score });
      // Clean up the preference text
      return p.content
        .replace(/^(i |my )/i, "They ")
        .replace(/^they they/i, "They");
    });
    lines.push(`Their style: ${prefSnippets.join(". ")}`);
  }

  // Add relevant context from past conversations
  if (contexts.length) {
    const relevantContext = contexts.slice(0, 2).map((c) => {
      sources.push({ id: c.id, snippet: c.content.slice(0, 80), score: c.score });
      return c.content;
    });
    lines.push(`Relevant from past chats: ${relevantContext.join(". ")}`);
  }

  // Add a natural instruction
  lines.push("");
  lines.push("Use this context naturally — don't explicitly mention you \"remember\" things unless they ask. Just be a good friend who knows them.");

  const context = lines.join("\n");
  
  // Truncate if too long
  const finalContext = context.length > maxChars 
    ? context.slice(0, maxChars) + "..."
    : context;

  return { context: finalContext, sources, provider, model };
}

// =============================================================================
// Fact Extraction from Messages
// =============================================================================

function extractFacts(message) {
  // Simple pattern matching for common fact types
  const facts = [];
  const text = message.toLowerCase();
  
  // Preferences
  if (/\b(i prefer|i like|i love|i hate|i don't like|my favorite)\b/.test(text)) {
    facts.push({ content: message, type: "preference" });
  }
  
  // Personal info (name, work, location)
  if (/\b(my name is|i am|i'm|i work at|i live in|i'm from)\b/.test(text)) {
    facts.push({ content: message, type: "fact" });
  }
  
  // Remember requests
  if (/\b(remember that|don't forget|keep in mind)\b/.test(text)) {
    facts.push({ content: message.replace(/^(remember that|don't forget|keep in mind)\s*/i, ""), type: "fact" });
  }

  return facts;
}

async function processMessage({ userId, message, autoExtract = true }) {
  if (!autoExtract) return { extracted: 0 };
  
  const facts = extractFacts(message);
  let stored = 0;
  
  for (const fact of facts) {
    try {
      const result = await storeMemory({ userId, content: fact.content, type: fact.type });
      if (!result.duplicate) stored++;
    } catch (err) {
      console.warn("[Memory] Failed to store extracted fact:", err.message);
    }
  }
  
  return { extracted: stored };
}

// =============================================================================
// Conversation Summarization (LLM-based)
// =============================================================================

/**
 * Summarize a conversation and extract key memories using LLM
 * @param {Object} params
 * @param {string} params.userId - User ID for storing memories
 * @param {Array} params.messages - Array of {role, content} messages
 * @param {string} params.threadId - Optional thread ID for metadata
 * @param {string} params.threadTitle - Optional thread title
 */
async function summarizeConversation({ userId, messages, threadId, threadTitle }) {
  const config = getConfig();
  
  if (!messages || messages.length < 2) {
    return { summary: null, memories: [], skipped: "too_short" };
  }

  // Format conversation for the LLM
  const conversationText = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  // Truncate if too long (keep last ~6000 chars)
  const maxConvoLength = 6000;
  const truncatedConvo = conversationText.length > maxConvoLength
    ? "...(earlier conversation truncated)...\n\n" + conversationText.slice(-maxConvoLength)
    : conversationText;

  const systemPrompt = `You analyze conversations and extract useful memories. Be concise and specific.

Output JSON with this exact structure:
{
  "summary": "1-2 sentence summary of what was discussed/accomplished",
  "facts": ["any new facts learned about the user (name, job, location, etc)"],
  "preferences": ["any preferences or opinions the user expressed"],
  "topics": ["main topics discussed"],
  "action_items": ["any tasks, plans, or follow-ups mentioned"],
  "mood": "user's apparent mood (positive/neutral/negative/frustrated)"
}

Rules:
- Only include facts/preferences that are clearly stated, not implied
- Keep each item to 1 short sentence max
- If nothing notable, return empty arrays
- Be specific, not generic ("prefers TypeScript" not "has coding preferences")`;

  const userPrompt = `Analyze this conversation:\n\n${truncatedConvo}`;

  // Try NOVA.TYP first, then Together
  let analysis = null;
  
  if (config.novatypApiKey) {
    try {
      const response = await fetch(`${config.novatypBaseUrl}/api/v1/openai/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.novatypApiKey}`,
        },
        body: JSON.stringify({
          model: "gemma-3-4b",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 800,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          // Extract JSON from response (handle markdown code blocks)
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analysis = JSON.parse(jsonMatch[0]);
          }
        }
      }
    } catch (err) {
      console.warn("[Memory] NOVA.TYP summarization failed:", err.message);
    }
  }

  // Fallback to Together.ai
  if (!analysis && config.togetherApiKey) {
    try {
      const response = await fetch("https://api.together.xyz/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.togetherApiKey}`,
        },
        body: JSON.stringify({
          model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 800,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analysis = JSON.parse(jsonMatch[0]);
          }
        }
      }
    } catch (err) {
      console.warn("[Memory] Together.ai summarization failed:", err.message);
    }
  }

  if (!analysis) {
    return { summary: null, memories: [], error: "summarization_failed" };
  }

  // Store extracted memories
  const storedMemories = [];
  const timestamp = new Date().toISOString();
  const metadata = { threadId, threadTitle, extractedAt: timestamp };

  // Store facts
  for (const fact of analysis.facts || []) {
    if (fact && fact.trim()) {
      try {
        const result = await storeMemory({ 
          userId, 
          content: fact.trim(), 
          type: "fact",
          metadata,
        });
        if (!result.duplicate) storedMemories.push({ type: "fact", content: fact });
      } catch (err) {
        console.warn("[Memory] Failed to store fact:", err.message);
      }
    }
  }

  // Store preferences
  for (const pref of analysis.preferences || []) {
    if (pref && pref.trim()) {
      try {
        const result = await storeMemory({ 
          userId, 
          content: pref.trim(), 
          type: "preference",
          metadata,
        });
        if (!result.duplicate) storedMemories.push({ type: "preference", content: pref });
      } catch (err) {
        console.warn("[Memory] Failed to store preference:", err.message);
      }
    }
  }

  // Store conversation summary as episode
  if (analysis.summary) {
    const episodeContent = [
      analysis.summary,
      analysis.topics?.length ? `Topics: ${analysis.topics.join(", ")}` : null,
      analysis.action_items?.length ? `Action items: ${analysis.action_items.join("; ")}` : null,
    ].filter(Boolean).join(". ");

    try {
      const result = await storeMemory({
        userId,
        content: episodeContent,
        type: "episode",
        metadata: { ...metadata, mood: analysis.mood },
      });
      if (!result.duplicate) storedMemories.push({ type: "episode", content: episodeContent });
    } catch (err) {
      console.warn("[Memory] Failed to store episode:", err.message);
    }
  }

  console.log(`[Memory] Summarized conversation for ${userId}: ${storedMemories.length} new memories`);

  return {
    summary: analysis.summary,
    mood: analysis.mood,
    topics: analysis.topics,
    actionItems: analysis.action_items,
    memories: storedMemories,
  };
}

// =============================================================================
// Health Check
// =============================================================================

async function checkHealth() {
  const config = getConfig();
  const isPg = await checkStorage();
  
  return {
    storage: isPg ? "pgvector" : "in-memory",
    storeSize: isPg 
      ? Number((await dbGet("SELECT COUNT(*) as c FROM memories"))?.c || 0)
      : memoryStoreFallback.size,
    providers: {
      novatyp: { configured: !!config.novatypApiKey },
      together: { configured: !!config.togetherApiKey },
    },
    dims: { novatyp: NOVATYP_DIMS, together: TOGETHER_DIMS },
  };
}

// =============================================================================
// Express Routes
// =============================================================================

function createMemoryRoutes(app) {
  app.get("/api/memory/health", async (req, res) => {
    try {
      const health = await checkHealth();
      res.json({ ok: true, ...health });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/api/memory/store", async (req, res) => {
    try {
      const { userId, content, type, metadata } = req.body;
      if (!userId || !content) {
        return res.status(400).json({ error: "userId and content required" });
      }
      const result = await storeMemory({ userId, content, type, metadata });
      res.status(201).json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/memory/search", async (req, res) => {
    try {
      const { userId, query, limit, minScore } = req.body;
      if (!userId || !query) {
        return res.status(400).json({ error: "userId and query required" });
      }
      const result = await searchMemories({ userId, query, limit, minScore });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/memory/context", async (req, res) => {
    try {
      const { userId, query, maxChars } = req.body;
      if (!userId || !query) {
        return res.status(400).json({ error: "userId and query required" });
      }
      const result = await buildContext({ userId, query, maxChars });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/memory/list/:userId", async (req, res) => {
    try {
      const memories = await getMemories(req.params.userId);
      res.json({ memories, count: memories.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/memory/:id", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId required" });
      const deleted = await deleteMemory(req.params.id, userId);
      res.json({ deleted });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Summarize a conversation and extract memories
  app.post("/api/memory/summarize", async (req, res) => {
    try {
      const { userId, messages, threadId, threadTitle } = req.body;
      if (!userId || !messages) {
        return res.status(400).json({ error: "userId and messages required" });
      }
      const result = await summarizeConversation({ userId, messages, threadId, threadTitle });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  console.log("[Memory] Routes registered at /api/memory/*");
}

export {
  getEmbeddings,
  storeMemory,
  searchMemories,
  getMemories,
  deleteMemory,
  buildContext,
  extractFacts,
  processMessage,
  summarizeConversation,
  checkHealth,
  createMemoryRoutes,
};
