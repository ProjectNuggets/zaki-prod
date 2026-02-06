/**
 * Memory Extraction - LLM + Pattern Fallback
 * 
 * Extract facts, preferences, emotions from user messages.
 * Pure function, no side effects.
 */

import { z } from "zod";

// LLM Extraction Schema
const MemorySchema = z.object({
  content: z.string(),
  type: z.enum(["fact", "preference", "emotion", "event", "goal", "relationship", "struggle"]),
  confidence: z.number().min(0).max(1).optional(),
});

const ExtractionResponseSchema = z.object({
  memories: z.array(MemorySchema),
});

const DEFAULT_PROMPT = `Extract personal information from this message as structured memories.
Only extract things about the USER (not others, not general knowledge).

Return JSON: {"memories": [{"content": "...", "type": "...", "confidence": 0.9}]}

Types:
- fact: Objective info (name, job, location)
- preference: Likes/dislikes
- emotion: How they feel
- event: Life events
- goal: Objectives/aspirations
- relationship: People they mention
- struggle: Challenges/problems

Message: `;

export async function extractFacts(message) {
  // Try LLM first
  try {
    const llmResult = await extractWithLLM(message);
    if (llmResult.length > 0) {
      return llmResult;
    }
  } catch (err) {
    console.warn("LLM extraction failed, using patterns:", err.message);
  }
  
  // Fallback to patterns
  return extractWithPatterns(message);
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
  }));
}

function extractWithPatterns(message) {
  const facts = [];
  const lower = message.toLowerCase();
  
  // Pattern: I am/I'm ...
  const nameMatch = message.match(/(?:my name is|i am|i'm) ([a-zA-Z\s]+?)(?:\.|,|$|and)/i);
  if (nameMatch) {
    facts.push({ content: `Name is ${nameMatch[1].trim()}`, type: "fact", confidence: 0.9 });
  }
  
  // Pattern: I love/like/enjoy ...
  const likeMatch = message.match(/(?:i love|i like|i enjoy|i prefer|i'm into) (.+?)(?:\.|,|because|when|$)/i);
  if (likeMatch) {
    facts.push({ content: `Likes ${likeMatch[1].trim()}`, type: "preference", confidence: 0.8 });
  }
  
  // Pattern: I hate/don't like/dislike ...
  const dislikeMatch = message.match(/(?:i hate|i don't like|i dislike) (.+?)(?:\.|,)/i);
  if (dislikeMatch) {
    facts.push({ content: `Dislikes ${dislikeMatch[1].trim()}`, type: "preference", confidence: 0.8 });
  }
  
  // Pattern: I want to learn ...
  const goalMatch = message.match(/(?:i want to learn|i'm learning|i'd like to learn) (.+?)(?:\.|,)/i);
  if (goalMatch) {
    facts.push({ content: `Wants to learn ${goalMatch[1].trim()}`, type: "goal", confidence: 0.85 });
  }
  
  // Pattern: I work at... / I live in...
  const workMatch = message.match(/(?:i work at|i work for|my job is) (.+?)(?:\.|,|as)/i);
  if (workMatch) {
    facts.push({ content: `Works at ${workMatch[1].trim()}`, type: "fact", confidence: 0.9 });
  }
  
  const liveMatch = message.match(/(?:i live in|i'm from|i'm living in) (.+?)(?:\.|,|now)/i);
  if (liveMatch) {
    facts.push({ content: `Lives in ${liveMatch[1].trim()}`, type: "fact", confidence: 0.9 });
  }
  
  return facts;
}
