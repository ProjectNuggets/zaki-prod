/**
 * Memory Extraction - LLM + Pattern Fallback
 * 
 * Extract facts, preferences, emotions from user messages.
 * Pure function, no side effects.
 */

import { z } from "zod";
import { dbGet, dbQuery } from "./db.js";
import { callNovaTypChat, parseJsonObjectFromText } from "./memory/nova-chat.js";

function resolveTimeoutMs(envName, fallbackMs) {
  const raw = Number.parseInt(String(process.env[envName] || ""), 10);
  if (!Number.isFinite(raw)) return fallbackMs;
  return Math.min(30_000, Math.max(500, raw));
}

const EXTRACTION_TIMEOUT_MS = resolveTimeoutMs("ZAKI_MEMORY_EXTRACTION_TIMEOUT_MS", 12_000);
const TRANSLATION_TIMEOUT_MS = resolveTimeoutMs("ZAKI_MEMORY_TRANSLATION_TIMEOUT_MS", 5_000);

// LLM Extraction Schema
const MemorySchema = z.object({
  content: z.string(),
  type: z.enum(["fact", "preference", "emotion", "event", "goal", "relationship", "struggle"]),
  confidence: z.number().min(0).max(1).optional(),
  conflict_key: z.string().optional(),
  polarity: z.enum(["positive", "negative", "neutral"]).optional(),
});

const ClassificationSchema = z.enum([
  "user_statement",
  "fictional",
  "draft",
  "quote",
  "instruction",
  "roleplay",
]);

const ALLOWED_EXTRACTED_TYPES = new Set([
  "fact",
  "preference",
  "emotion",
  "event",
  "goal",
  "relationship",
  "struggle",
]);
const MAX_EXTRACTED_MEMORIES_PER_MESSAGE = 12;

const ExtractionResponseSchema = z.object({
  classification: ClassificationSchema.optional(),
  memories: z.array(MemorySchema).optional(),
});

const DEFAULT_PROMPT = `You are a memory extractor.
First classify the message as one of:
- user_statement: The user is stating facts/preferences/emotions ABOUT THEMSELVES.
- fictional: The user is writing fiction/hypothetical content.
- draft: The user is drafting an email/message/content (not personal info).
- quote: The user is quoting someone/something.
- instruction: The user is instructing the assistant (summarize/translate/write/etc).
- roleplay: The user is asking you to roleplay or act as someone else.

Only extract memories if classification is user_statement. Otherwise return empty memories.

Extraction quality rules:
- Each memory must be atomic: exactly one fact, preference, goal, emotion, event, relationship, or struggle per item.
- Split compound statements into separate memories.
- Do NOT output vague references such as "this", "that", "these", "those", "all of those", "that place", or "the above".
- Do NOT merge preferences with plans, facts, or locations in one memory.
- Prefer direct canonical phrasing such as "Likes travel", "Plans to travel to Dubai", "From Damascus", "Lives in Hamburg".

Return JSON: {"classification": "...", "memories": [{"content": "...", "type": "...", "confidence": 0.9, "conflict_key": "...", "polarity": "positive"}]}

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
  const normalizedValue =
    domain === "preference" || domain === "constraint"
      ? normalizePreferenceConflictValue(valueRaw)
      : valueRaw;
  const slug = slugifyValue(normalizedValue || valueRaw);
  if (!slug) {
    return `${domain}:${String(normalizedValue || valueRaw).toLowerCase()}`;
  }
  return `${domain}:${slug}`;
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
  if (!/^[a-z]+$/.test(lower)) return lower;
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

function normalizePreferenceConflictValue(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(the|a|an|to)\s+/, "");
  if (!normalized) return "";

  const words = normalized
    .split(" ")
    .map((word) => word.replace(/^ال/, ""))
    .filter(Boolean);
  if (words.length === 0) return "";

  const last = words[words.length - 1];
  words[words.length - 1] = singularizeEnglishWord(last);
  return words.join(" ").trim();
}

function collectPatternValues(message, regex) {
  const values = [];
  const seen = new Set();
  for (const match of String(message || "").matchAll(regex)) {
    const raw = String(match?.[1] || "").trim().replace(/\s+/g, " ");
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(raw);
  }
  return values;
}

function cleanPreferenceValue(value) {
  const normalized = String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[.,!?;:]+$/g, "")
    .trim();
  if (!normalized) return "";
  return normalized
    .replace(/^to\s+/i, "")
    .replace(/\b(?:you know|kind of|sort of|basically|i guess|you know what i mean)\b/gi, " ")
    .replace(/\s+(?:and|but)\s+i\s+(?:am|m|live|work|study|plan|want|love|like|need|feel)\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePreferenceMemory(content, polarity) {
  const raw = String(content || "").replace(/\s+/g, " ").trim();
  if (!raw) {
    return {
      content: raw,
      value: null,
      polarity: polarity || null,
    };
  }

  const patterns = [
    {
      regex: /^(?:prefers?|i\s+prefer)\s+(.+)$/i,
      polarity: "positive",
      verb: "Prefers",
    },
    {
      regex:
        /^(?:likes?|i\s+(?:like|love|enjoy|(?:am|i'm)\s+into)|like to)\s+(.+)$/i,
      polarity: "positive",
      verb: "Likes",
    },
    {
      regex:
        /^(?:dislikes?|i\s+(?:don't like|dont like|do not like|dislike|hate))\s+(.+)$/i,
      polarity: "negative",
      verb: "Dislikes",
    },
  ];

  let extractedValue = "";
  let inferredPolarity = polarity || null;
  let resolvedVerb = "";
  for (const pattern of patterns) {
    const match = raw.match(pattern.regex);
    if (!match) continue;
    extractedValue = match[1] || "";
    if (!inferredPolarity) inferredPolarity = pattern.polarity;
    resolvedVerb = pattern.verb;
    break;
  }

  // Some malformed LLM outputs nest another preference verb inside the value,
  // e.g. "Likes Prefers concise replies". In that case, the inner verb should win.
  if (extractedValue) {
    for (const pattern of patterns) {
      const nestedMatch = extractedValue.match(pattern.regex);
      if (!nestedMatch) continue;
      extractedValue = nestedMatch[1] || extractedValue;
      inferredPolarity = pattern.polarity;
      resolvedVerb = pattern.verb;
      break;
    }
  }

  const value = cleanPreferenceValue(extractedValue || raw);
  if (!value) {
    return {
      content: raw,
      value: null,
      polarity: inferredPolarity || polarity || null,
    };
  }

  const resolvedPolarity = inferredPolarity || polarity || "positive";
  const verb =
    resolvedVerb ||
    (resolvedPolarity === "negative" ? "Dislikes" : "Likes");
  return {
    content: `${verb} ${value}`,
    value,
    polarity: resolvedPolarity,
  };
}

function cleanStructuredValue(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[.,!?;:]+$/g, "")
    .replace(/\s+(?:and|but)\s+i\s+(?:am|m|live|work|study|plan|want|love|like|need|feel)\b.*$/i, "")
    .trim();
}

function splitListValues(value) {
  return String(value || "")
    .split(/\s*,\s*|\s+and\s+/i)
    .map((part) => cleanStructuredValue(part))
    .filter(Boolean);
}

function normalizeFactMemory(content) {
  const raw = String(content || "").replace(/\s+/g, " ").trim();
  if (!raw) {
    return {
      content: raw,
      conflictKey: null,
    };
  }

  const patterns = [
    {
      regex: /^(?:i\s+am\s+from|i'?m\s+from|im\s+from|from)\s+(.+)$/i,
      build: (value) => ({ content: `From ${value}`, conflictKey: null }),
    },
    {
      regex: /^(?:i\s+live\s+in|i'?m\s+living\s+in|im\s+living\s+in|live in|lives in)\s+(.+)$/i,
      build: (value) => ({
        content: `Lives in ${value}`,
        conflictKey: canonicalizeConflictKey("identity:location"),
      }),
    },
    {
      regex: /^(?:i\s+work\s+(?:at|for)|works?\s+(?:at|for)|my job is)\s+(.+)$/i,
      build: (value) => ({
        content: `Works at ${value}`,
        conflictKey: canonicalizeConflictKey("identity:occupation"),
      }),
    },
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern.regex);
    if (!match) continue;
    const value = cleanStructuredValue(match[1] || "");
    if (!value) break;
    return pattern.build(value);
  }

  return {
    content: raw,
    conflictKey: null,
  };
}

function normalizeGoalMemory(content) {
  const raw = String(content || "").replace(/\s+/g, " ").trim();
  if (!raw) return { content: raw };

  const patterns = [
    {
      regex:
        /^(?:i\s+(?:plan|plans|am planning|m planning)\s+to\s+travel\s+to|plans?\s+to\s+travel\s+to|travel to)\s+(.+)$/i,
      build: (value) => `Plans to travel to ${value}`,
    },
    {
      regex:
        /^(?:i\s+(?:want|would like|d like)\s+to\s+(?:travel|visit|go)\s+to|wants?\s+to\s+(?:travel|visit|go)\s+to)\s+(.+)$/i,
      build: (value) => `Wants to visit ${value}`,
    },
    {
      regex:
        /^(?:i\s+(?:want|would like|d like)\s+to\s+learn|wants?\s+to\s+learn)\s+(.+)$/i,
      build: (value) => `Wants to learn ${value}`,
    },
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern.regex);
    if (!match) continue;
    const value = cleanStructuredValue(match[1] || "");
    if (!value) break;
    return { content: pattern.build(value) };
  }

  return { content: raw };
}

const LOW_SIGNAL_MEMORY_VALUES = [
  "all of those",
  "those",
  "these",
  "that",
  "this",
  "the above",
  "that place",
  "those cities",
  "these cities",
  "هؤلاء",
  "هذي",
  "هذه",
  "هذا",
  "تلك",
  "هاي",
  "كلهم",
];

function containsUnresolvedReference(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return false;
  return LOW_SIGNAL_MEMORY_VALUES.some((token) => normalized === token || normalized.includes(token));
}

function countClauseSignals(value) {
  const normalized = String(value || "").toLowerCase();
  if (!normalized) return 0;
  const signals = [
    /\blikes?\b/g,
    /\bdislikes?\b/g,
    /\bloves?\b/g,
    /\benjoys?\b/g,
    /\bprefers?\b/g,
    /\bplans?\b/g,
    /\bwants?\b/g,
    /\btravels?\b/g,
    /\bvisits?\b/g,
    /\blives?\b/g,
    /\bfrom\b/g,
    /\bworks?\b/g,
    /\bstudies?\b/g,
    /\bfeels?\b/g,
    /\bname is\b/g,
  ];
  return signals.reduce((count, pattern) => count + (normalized.match(pattern)?.length || 0), 0);
}

function isCompoundMemory(memory) {
  const content = String(memory?.content || "").replace(/\s+/g, " ").trim();
  if (!content) return false;
  if (!/\b(?:and|but)\b|,/.test(content)) return false;
  return countClauseSignals(content) > 1;
}

function isLowQualityExtractedMemory(memory) {
  const content = String(memory?.content || "").replace(/\s+/g, " ").trim();
  if (!content) return true;
  if (content.length > 140) return true;
  if (containsUnresolvedReference(content)) return true;
  if (isCompoundMemory(memory)) return true;

  if (memory?.type === "preference") {
    const normalized = normalizePreferenceMemory(content, memory?.polarity);
    if (!normalized.value || containsUnresolvedReference(normalized.value)) return true;
  }

  return false;
}

function normalizeExtractedMemory(memory) {
  const base = {
    content: String(memory?.content || "").replace(/\s+/g, " ").trim(),
    type: String(memory?.type || "").trim().toLowerCase(),
    confidence: memory?.confidence || 0.8,
    conflictKey: canonicalizeConflictKey(memory?.conflictKey || memory?.conflict_key) || null,
    polarity: memory?.polarity || null,
  };

  if (!base.content) return null;
  if (!ALLOWED_EXTRACTED_TYPES.has(base.type)) return null;

  if (base.type === "preference") {
    const normalized = normalizePreferenceMemory(base.content, base.polarity);
    return {
      ...base,
      content: normalized.content || base.content,
      conflictKey:
        canonicalizeConflictKey(
          base.conflictKey || (normalized.value ? `preference:${normalized.value}` : "")
        ) || null,
      polarity: normalized.polarity || base.polarity || "positive",
    };
  }

  if (base.type === "fact") {
    const normalized = normalizeFactMemory(base.content);
    return {
      ...base,
      content: normalized.content || base.content,
      conflictKey: normalized.conflictKey || base.conflictKey || null,
      polarity: base.polarity || "neutral",
    };
  }

  if (base.type === "goal") {
    const normalized = normalizeGoalMemory(base.content);
    return {
      ...base,
      content: normalized.content || base.content,
      polarity: base.polarity || "neutral",
    };
  }

  return base;
}

export function sanitizeExtractedMemories(memories, limit = MAX_EXTRACTED_MEMORIES_PER_MESSAGE) {
  const boundedLimit = Math.max(1, Math.min(50, Number(limit) || MAX_EXTRACTED_MEMORIES_PER_MESSAGE));
  const normalized = (Array.isArray(memories) ? memories : [])
    .map((memory) => normalizeExtractedMemory(memory))
    .filter(Boolean)
    .filter((memory) => !isLowQualityExtractedMemory(memory));
  return finalizeExtractedMemories(normalized).slice(0, boundedLimit);
}

function shouldDebug() {
  return String(process.env.MEMORY_DEBUG || "").toLowerCase() === "true";
}

function classifyWithHeuristics(message) {
  const text = String(message || "").trim();
  if (!text) return "instruction";

  const roleplayPatterns = [
    /roleplay/i,
    /pretend you are/i,
    /act as/i,
    /you are a/i,
  ];
  if (roleplayPatterns.some((r) => r.test(text))) return "roleplay";

  const draftPatterns = [
    /write (an|a) (email|message|letter|note|reply)/i,
    /draft (an|a) (email|message|letter|note|reply)/i,
    /compose (an|a) (email|message|letter|note|reply)/i,
    /rewrite (this|the)/i,
    /proofread/i,
  ];
  if (draftPatterns.some((r) => r.test(text))) return "draft";

  const fictionalPatterns = [
    /write (a|an) (story|poem|novel)/i,
    /fiction/i,
    /character/i,
    /imaginary/i,
    /once upon a time/i,
  ];
  if (fictionalPatterns.some((r) => r.test(text))) return "fictional";

  const quotePatterns = [
    /^>/m,
    /“[^”]+”/,
    /"[^"]+"/,
    /'[^']+'/,
  ];
  if (quotePatterns.some((r) => r.test(text))) return "quote";

  const firstPersonSignals = [
    /\bi\s+(?:like|love|enjoy|prefer|hate|dislike|want|need|have|feel|live|work|study|am|was)\b/i,
    /\bcall me\b/i,
    /\bi go by\b/i,
    /\bi am\b/i,
    /\bi'm\b/i,
    /\bim\b/i,
    /\bmy\b/i,
    /\bme\b/i,
    /أنا|انا|اسمي|عندي|لدي|أحب|احب|بحب|أكره|اكره|أفضّل|افضل|ما بحب|مابحب/,
  ];
  if (firstPersonSignals.some((r) => r.test(text))) return "user_statement";

  return "instruction";
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

  try {
    const result = await callNovaTypChat({
      messages: [
        {
          role: "system",
          content:
            "Translate the user preference value to a short English noun phrase. Reply with only the translation, no punctuation.",
        },
        { role: "user", content: raw },
      ],
      temperature: 0.2,
      maxTokens: 20,
      timeoutMs: TRANSLATION_TIMEOUT_MS,
      label: "Preference translation",
    });
    const translated = String(result?.content || "").trim();
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
  const heuristicClass = classifyWithHeuristics(message);
  // Try LLM first
  let llmMemories = [];
  let llmClassification = null;
  try {
    const llmResult = await extractWithLLM(message);
    llmMemories = Array.isArray(llmResult?.memories) ? llmResult.memories : [];
    llmClassification = llmResult?.classification || null;
  } catch (err) {
    console.warn("LLM extraction failed, using patterns:", err.message);
  }

  const classification = llmClassification || heuristicClass;

  let patternMemories = [];
  const shouldRunPatterns =
    classification === "user_statement" || heuristicClass === "user_statement";
  if (shouldRunPatterns) {
    const skipTranslation = llmMemories.some((m) => m.conflictKey);
    patternMemories = await extractWithPatterns(message, {
      skipTranslation,
      simpleOnly: false,
    });
  }

  if (classification !== "user_statement" && patternMemories.length === 0 && llmMemories.length === 0) {
    if (shouldDebug()) {
      console.log(`[Memory] Skipping extraction (classification: ${classification})`);
    }
    return [];
  }

  if (shouldDebug()) {
    console.log(
      `[Memory] LLM memories: ${llmMemories.length}, pattern memories: ${patternMemories.length}, classification: ${classification}`
    );
  }

  if (llmMemories.length === 0) return finalizeExtractedMemories(patternMemories);
  if (patternMemories.length === 0) return finalizeExtractedMemories(llmMemories);

  const merged = finalizeExtractedMemories([...llmMemories, ...patternMemories]);
  if (shouldDebug()) {
    console.log(`[Memory] Extracted ${merged.length} total memories`);
  }
  return merged;
}

function buildExtractedMemoryKey(memory) {
  if (!memory || typeof memory !== "object") return null;
  const type = String(memory.type || "").toLowerCase().trim();
  const content = String(memory.content || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  const conflictKey = canonicalizeConflictKey(memory.conflictKey || memory.conflict_key);
  const polarity = String(memory.polarity || "").toLowerCase().trim();
  if (conflictKey) {
    if (
      conflictKey.startsWith("preference:") ||
      conflictKey.startsWith("constraint:")
    ) {
      return `fingerprint:${conflictKey}:${polarity || "neutral"}`;
    }
    return `fingerprint:${conflictKey}`;
  }
  if (!type && !content) return null;
  return `content:${type}:${content}`;
}

function dedupeExtractedMemories(memories) {
  const byKey = new Map();
  const passthrough = [];

  for (const memory of memories || []) {
    const key = buildExtractedMemoryKey(memory);
    if (!key) {
      passthrough.push(memory);
      continue;
    }
    const existing = byKey.get(key);
    if (!existing || Number(memory.confidence || 0) > Number(existing.confidence || 0)) {
      byKey.set(key, memory);
    }
  }

  return [...byKey.values(), ...passthrough];
}

function finalizeExtractedMemories(memories) {
  return dedupeExtractedMemories(
    (memories || []).filter((memory) => !isLowQualityExtractedMemory(memory))
  );
}

async function extractWithLLM(message) {
  const { content, transport } = await callNovaTypChat({
    messages: [
      { role: "system", content: DEFAULT_PROMPT },
      { role: "user", content: message },
    ],
    jsonMode: true,
    temperature: 0.1,
    timeoutMs: EXTRACTION_TIMEOUT_MS,
    label: "Memory extraction",
  });

  if (!content) {
    return { classification: null, memories: [] };
  }

  if (shouldDebug()) {
    console.log(`[Memory] Extraction transport: ${transport}`);
  }

  const parsed = parseJsonObjectFromText(content);
  const validated = ExtractionResponseSchema.safeParse(parsed);
  
  if (!validated.success) {
    console.warn("LLM response validation failed:", validated.error);
    return { classification: null, memories: [] };
  }
  
  const memories = sanitizeExtractedMemories(validated.data.memories || []);

  return {
    classification: validated.data.classification || null,
    memories,
  };
}

export async function probeMemoryExtractionProvider(
  sampleMessage = "I like coffee and I live in Dubai."
) {
  try {
    const { content, transport, model } = await callNovaTypChat({
      messages: [
        { role: "system", content: DEFAULT_PROMPT },
        { role: "user", content: String(sampleMessage || "").trim() || "I like coffee." },
      ],
      jsonMode: true,
      temperature: 0,
      timeoutMs: EXTRACTION_TIMEOUT_MS,
      label: "Memory extraction probe",
    });
    const parsed = parseJsonObjectFromText(content);
    const validated = ExtractionResponseSchema.safeParse(parsed);
    if (!validated.success) {
      return {
        ok: false,
        transport,
        model,
        error: "Extraction probe returned invalid schema.",
      };
    }
    return {
      ok: true,
      transport,
      model,
      classification: validated.data.classification || null,
      extracted: Array.isArray(validated.data.memories) ? validated.data.memories.length : 0,
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || String(error),
    };
  }
}

async function extractWithPatterns(message, { skipTranslation = false, simpleOnly = false } = {}) {
  const facts = [];
  
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

  const originValues = collectPatternValues(
    message,
    /(?:i\s+am\s+from|i'?m\s+from|im\s+from)\s+([^.,!?]+?)(?=\s+(?:and|but)\s+(?:i\s+|live|work|study|plan|want|love|like)\b|[.,!?]|$)/gi
  );
  for (const rawValue of originValues) {
    const value = cleanStructuredValue(rawValue);
    if (!value) continue;
    facts.push({
      content: `From ${value}`,
      type: "fact",
      confidence: 0.88,
      polarity: "neutral",
    });
  }
  
  // Pattern: I love/like/enjoy ... (supports repeated clauses)
  const likeValues = collectPatternValues(
    message,
    /(?:i love|i like|i enjoy|i prefer|i(?:'m| am) into)\s+([^.,!?]+?)(?=\s+(?:and|but)\s+i\s+(?:love|like|enjoy|prefer|(?:am|\'m)\s+into|hate|don't like|do not like|dislike)\b|[.,!?]|$)/gi
  );
  for (const rawValue of likeValues) {
    const value = cleanPreferenceValue(rawValue);
    if (!value) continue;
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
  
  // Pattern: I hate/don't like/dislike ... (supports repeated clauses)
  const dislikeValues = collectPatternValues(
    message,
    /(?:i hate|i don't like|i do not like|i dislike)\s+([^.,!?]+?)(?=\s+(?:and|but)\s+i\s+(?:hate|don't like|do not like|dislike|love|like|enjoy|prefer|(?:am|\'m)\s+into)\b|[.,!?]|$)/gi
  );
  for (const rawValue of dislikeValues) {
    const value = cleanPreferenceValue(rawValue);
    if (!value) continue;
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
  
  if (!simpleOnly) {
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
  
  const liveValues = collectPatternValues(
    message,
    /(?:i\s+live\s+in|i'?m\s+living\s+in|im\s+living\s+in|(?:^|\s)live in)\s+([^.,!?]+?)(?=\s+(?:and|but)\s+(?:i\s+|live|work|study|plan|want|love|like)\b|[.,!?]|$)/gi
  );
  for (const rawValue of liveValues) {
    const value = cleanStructuredValue(rawValue);
    if (!value) continue;
    facts.push({
      content: `Lives in ${value}`,
      type: "fact",
      confidence: 0.9,
      conflictKey: canonicalizeConflictKey("identity:location"),
      polarity: "neutral",
    });
  }

  if (!simpleOnly) {
    const travelGoalValues = collectPatternValues(
      message,
      /(?:i\s+(?:plan|am planning|m planning)\s+to\s+travel\s+to|plan\s+to\s+travel\s+to|i\s+(?:want|would like|d like)\s+to\s+(?:travel|visit|go)\s+to|want\s+to\s+(?:travel|visit|go)\s+to|i\s+plan\s+to\s+visit|plan\s+to\s+visit)\s+([^.!?]+?)(?=\s+(?:and|but)\s+(?:i\s+am|i'?m|im|live|work|study|love|like)\b|[.!?]|$)/gi
    );
    for (const rawValue of travelGoalValues) {
      for (const destination of splitListValues(rawValue)) {
        facts.push({
          content: `Plans to travel to ${destination}`,
          type: "goal",
          confidence: 0.86,
          polarity: "neutral",
        });
      }
    }
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
    const value = cleanPreferenceValue(arLikeMatch[1].trim());
    if (value) {
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
  }

  const arDislikeMatch = message.match(/(?:لا أحب|لا احب|أكره|اكره|ما بحب|مابحب)\s+([^.,]+)/i);
  if (arDislikeMatch) {
    const value = cleanPreferenceValue(arDislikeMatch[1].trim());
    if (value) {
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
