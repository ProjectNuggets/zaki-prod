/**
 * Memory Extraction - LLM + Pattern Fallback
 * 
 * Extract facts, preferences, emotions from user messages.
 * Pure function, no side effects.
 */

import { z } from "zod";
import { dbGet, dbQuery } from "./db.js";

// LLM Extraction Schema
const MemorySchema = z.object({
  content: z.string(),
  type: z.enum(["fact", "preference", "emotion", "event", "goal", "relationship", "struggle"]),
  confidence: z.number().min(0).max(1).optional(),
  conflict_key: z.string().optional(),
  polarity: z.enum(["positive", "negative", "neutral"]).optional(),
});

const ExtractionResponseSchema = z.object({
  memories: z.array(MemorySchema),
});

const DEFAULT_PROMPT = `Extract personal information from this message as structured memories.
Only extract things about the USER (not others, not general knowledge).

Return JSON: {"memories": [{"content": "...", "type": "...", "confidence": 0.9, "conflict_key": "...", "polarity": "positive"}]}

Types:
- fact: Objective info (name, job, location)
- preference: Likes/dislikes
- emotion: How they feel
- event: Life events
- goal: Objectives/aspirations
- relationship: People they mention
- struggle: Challenges/problems

Conflict key:
- ALWAYS output conflict_key as a canonical English slug (lowercase, no spaces).
- For preferences: "preference:coffee", "preference:spicy-food", "preference:black"
- For constraints: "constraint:peanuts"
- For identity: "identity:name", "identity:location", "identity:occupation"
- ONLY use conflict_key "identity:name" when the user explicitly states their name (e.g., "my name is", "call me", "I go by").
- Do NOT treat states/conditions/emotions (e.g., "I'm sick", "I'm tired", "I'm happy") as names.
Polarity:
- positive (likes/has/is)
- negative (dislikes/doesn't/avoid)
- neutral (facts that don't have polarity)

Message: `;

function slugifyValue(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function canonicalizeConflictKey(conflictKey) {
  if (!conflictKey) return null;
  const raw = String(conflictKey);
  const [domainRaw, ...rest] = raw.split(":");
  const domain = (domainRaw || "").toLowerCase().trim();
  const valueRaw = rest.join(":").trim();
  if (!domain) return null;
  if (!valueRaw) return domain;
  const slug = slugifyValue(valueRaw);
  if (!slug) {
    return `${domain}:${valueRaw.toLowerCase()}`;
  }
  return `${domain}:${slug}`;
}

function shouldDebug() {
  return String(process.env.MEMORY_DEBUG || "").toLowerCase() === "true";
}

const NON_NAME_TOKENS = new Set([
  "sick",
  "ill",
  "tired",
  "sleepy",
  "happy",
  "sad",
  "angry",
  "upset",
  "stressed",
  "anxious",
  "ok",
  "okay",
  "fine",
  "good",
  "bad",
  "hungry",
  "thirsty",
  "busy",
  "free",
  "available",
]);

const AR_NON_NAME_TOKENS = new Set([
  "مريض",
  "تعبان",
  "تعبانة",
  "مرهق",
  "مرهقة",
  "نعسان",
  "نعسانة",
  "سعيد",
  "سعيدة",
  "حزين",
  "حزينة",
  "متوتر",
  "متوترة",
  "قلقان",
  "قلقانة",
  "جوعان",
  "جوعانة",
  "عطشان",
  "عطشانة",
  "مشغول",
  "مشغولة",
  "متاح",
  "متاحة",
]);

function looksLikeName(value) {
  const cleaned = String(value || "").trim();
  if (!cleaned) return false;
  const tokens = cleaned.split(/\s+/).map((t) => t.toLowerCase());
  if (tokens.some((t) => NON_NAME_TOKENS.has(t) || AR_NON_NAME_TOKENS.has(t))) {
    return false;
  }
  // Accept if it starts with a capital letter (Latin) or is short and alphabetic.
  if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(cleaned)) return true;
  if (/^[A-Za-z][A-Za-z\s]{1,20}$/.test(cleaned)) return true;
  // Arabic name-like (no digits/punct, short)
  if (/^[\u0600-\u06FF\s]{2,20}$/.test(cleaned)) return true;
  return false;
}

async function translatePreferenceValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^[a-z0-9\s-]+$/i.test(raw)) {
    return raw.toLowerCase();
  }

  const cached = await dbGet(
    "SELECT translated_text FROM memory_translation_cache WHERE source_text = $1",
    [raw]
  );
  if (cached?.translated_text) {
    return cached.translated_text;
  }

  const baseUrl = (process.env.NOVA_TYP_BASE_URL || "").trim();
  if (!baseUrl) return null;
  const apiBase = baseUrl.replace(/\/+$/, "");
  const NOVA_TYP_API_KEY = (process.env.NOVA_TYP_API_KEY || "").trim();

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
              "Translate the user preference value to a short English noun phrase. Reply with only the translation, no punctuation.",
          },
          { role: "user", content: raw },
        ],
        temperature: 0.2,
        max_tokens: 20,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const translated = data.choices?.[0]?.message?.content?.trim();
    if (!translated) return null;
    await dbQuery(
      `INSERT INTO memory_translation_cache (source_text, translated_text, language, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (source_text) DO UPDATE
       SET translated_text = EXCLUDED.translated_text, updated_at = NOW()`,
      [raw, translated, "auto"]
    );
    return translated;
  } catch {
    return null;
  }
}

export async function extractFacts(message) {
  // Try LLM first
  let llmMemories = [];
  try {
    llmMemories = await extractWithLLM(message);
  } catch (err) {
    console.warn("LLM extraction failed, using patterns:", err.message);
  }

  // Always run pattern fallback for short/ambiguous messages
  const skipTranslation = llmMemories.some((m) => m.conflictKey);
  const patternMemories = await extractWithPatterns(message, { skipTranslation });

  if (shouldDebug()) {
    console.log(`[Memory] LLM memories: ${llmMemories.length}, pattern memories: ${patternMemories.length}`);
  }

  if (llmMemories.length === 0) {
    return patternMemories;
  }

  if (patternMemories.length === 0) {
    return llmMemories;
  }

  // Merge with de-dupe by content + type
  const seen = new Set();
  const merged = [];
  for (const memory of [...llmMemories, ...patternMemories]) {
    const key = `${memory.type}:${memory.content}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(memory);
  }
  if (shouldDebug()) {
    console.log(`[Memory] Extracted ${merged.length} total memories`);
  }
  return merged;
}

async function extractWithLLM(message) {
  const NOVA_TYP_API_KEY = (process.env.NOVA_TYP_API_KEY || "").trim();
  
  const baseUrl = (process.env.NOVA_TYP_BASE_URL || "").trim();
  if (!baseUrl) {
    throw new Error("NOVA_TYP_BASE_URL not configured");
  }
  
  const apiBase = baseUrl.replace(/\/+$/, "");
  const response = await fetch(`${apiBase}/api/v1/openai/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(NOVA_TYP_API_KEY ? { Authorization: `Bearer ${NOVA_TYP_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: DEFAULT_PROMPT },
        { role: "user", content: message },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`LLM request failed: ${response.status}`);
  }
  
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    return [];
  }
  
  const parsed = JSON.parse(content);
  const validated = ExtractionResponseSchema.safeParse(parsed);
  
  if (!validated.success) {
    console.warn("LLM response validation failed:", validated.error);
    return [];
  }
  
  return validated.data.memories.map(m => ({
    content: m.content,
    type: m.type,
    confidence: m.confidence || 0.8,
    conflictKey: canonicalizeConflictKey(m.conflict_key) || null,
    polarity: m.polarity || null,
  }));
}

async function extractWithPatterns(message, { skipTranslation = false } = {}) {
  const facts = [];
  const lower = message.toLowerCase();
  
  // Pattern: I am/I'm ...
  const nameMatch = message.match(/(?:my name is|call me|i go by) ([a-zA-Z\s]+?)(?:\.|,|$|and)/i);
  if (nameMatch) {
    const candidate = nameMatch[1].trim();
    if (looksLikeName(candidate)) {
      facts.push({
        content: `Name is ${candidate}`,
        type: "fact",
        confidence: 0.9,
        conflictKey: canonicalizeConflictKey("identity:name"),
        polarity: "neutral",
      });
    }
  }
  
  // Pattern: I love/like/enjoy ...
  const likeMatch = message.match(/(?:i love|i like|i enjoy|i prefer|i'm into) (.+?)(?:\.|,|because|when|$)/i);
  if (likeMatch) {
    const value = likeMatch[1].trim();
    const translated = skipTranslation ? null : await translatePreferenceValue(value);
    const normalizedValue = translated || value;
    facts.push({
      content: `Likes ${value}`,
      type: "preference",
      confidence: 0.8,
      conflictKey: canonicalizeConflictKey(`preference:${normalizedValue}`),
      polarity: "positive",
    });
  }
  
  // Pattern: I hate/don't like/dislike ...
  const dislikeMatch = message.match(/(?:i hate|i don't like|i dislike) (.+?)(?:\.|,)/i);
  if (dislikeMatch) {
    const value = dislikeMatch[1].trim();
    const translated = skipTranslation ? null : await translatePreferenceValue(value);
    const normalizedValue = translated || value;
    facts.push({
      content: `Dislikes ${value}`,
      type: "preference",
      confidence: 0.8,
      conflictKey: canonicalizeConflictKey(`preference:${normalizedValue}`),
      polarity: "negative",
    });
  }
  
  // Pattern: I want to learn ...
  const goalMatch = message.match(/(?:i want to learn|i'm learning|i'd like to learn) (.+?)(?:\.|,)/i);
  if (goalMatch) {
    facts.push({
      content: `Wants to learn ${goalMatch[1].trim()}`,
      type: "goal",
      confidence: 0.85,
      polarity: "neutral",
    });
  }
  
  // Pattern: I work at... / I live in...
  const workMatch = message.match(/(?:i work at|i work for|my job is) (.+?)(?:\.|,|as)/i);
  if (workMatch) {
    const value = workMatch[1].trim();
    facts.push({
      content: `Works at ${value}`,
      type: "fact",
      confidence: 0.9,
      conflictKey: canonicalizeConflictKey("identity:occupation"),
      polarity: "neutral",
    });
  }
  
  const liveMatch = message.match(/(?:i live in|i'm from|i'm living in) (.+?)(?:\.|,|now)/i);
  if (liveMatch) {
    const value = liveMatch[1].trim();
    facts.push({
      content: `Lives in ${value}`,
      type: "fact",
      confidence: 0.9,
      conflictKey: canonicalizeConflictKey("identity:location"),
      polarity: "neutral",
    });
  }

  // Arabic fallback patterns
  const arNameMatch = message.match(/(?:اسمي|انا اسمي|نادوني|لقبي)\s+([^.,]+)/i);
  if (arNameMatch) {
    const candidate = arNameMatch[1].trim();
    if (looksLikeName(candidate)) {
      facts.push({
        content: `Name is ${candidate}`,
        type: "fact",
        confidence: 0.85,
        conflictKey: canonicalizeConflictKey("identity:name"),
        polarity: "neutral",
      });
    }
  }

  const arLikeMatch = message.match(/(?:أحب|احب|أفضّل|افضل|بحب)\s+([^.,]+)/i);
  if (arLikeMatch) {
    const value = arLikeMatch[1].trim();
    const translated = skipTranslation ? null : await translatePreferenceValue(value);
    const normalizedValue = translated || value;
    facts.push({
      content: `Likes ${value}`,
      type: "preference",
      confidence: 0.8,
      conflictKey: canonicalizeConflictKey(`preference:${normalizedValue}`),
      polarity: "positive",
    });
  }

  const arDislikeMatch = message.match(/(?:لا أحب|لا احب|أكره|اكره|ما بحب|مابحب)\s+([^.,]+)/i);
  if (arDislikeMatch) {
    const value = arDislikeMatch[1].trim();
    const translated = skipTranslation ? null : await translatePreferenceValue(value);
    const normalizedValue = translated || value;
    facts.push({
      content: `Dislikes ${value}`,
      type: "preference",
      confidence: 0.8,
      conflictKey: canonicalizeConflictKey(`preference:${normalizedValue}`),
      polarity: "negative",
    });
  }

  const arLiveMatch = message.match(/(?:أعيش في|أسكن في)\s+([^.,]+)/i);
  if (arLiveMatch) {
    const value = arLiveMatch[1].trim();
    facts.push({
      content: `Lives in ${value}`,
      type: "fact",
      confidence: 0.85,
      conflictKey: canonicalizeConflictKey("identity:location"),
      polarity: "neutral",
    });
  }
  
  return facts;
}
