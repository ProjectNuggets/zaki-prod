import {
  extractFacts as extractFactsOp,
  sanitizeExtractedMemories,
} from "../memory-extraction.js";
import {
  storeMemory as storeMemoryOp,
  findDuplicateMemory as findDuplicateMemoryOp,
  findConflict as findConflictOp,
  markMemoryOutdated as markMemoryOutdatedOp,
} from "./operations.js";

const DEFAULT_MAX_USER_MESSAGES = Number.parseInt(
  process.env.ZAKI_SESSION_MEMORY_MAX_USER_MESSAGES || "8",
  10
);
const DEFAULT_MAX_FACTS_PER_MESSAGE = Number.parseInt(
  process.env.ZAKI_SESSION_MEMORY_MAX_FACTS_PER_MESSAGE || "8",
  10
);
const DEFAULT_MAX_TOTAL_FACTS = Number.parseInt(
  process.env.ZAKI_SESSION_MEMORY_MAX_TOTAL_FACTS || "64",
  10
);
const MAX_USER_MESSAGES = Number.isFinite(DEFAULT_MAX_USER_MESSAGES)
  ? Math.min(Math.max(DEFAULT_MAX_USER_MESSAGES, 1), 20)
  : 8;
const MAX_FACTS_PER_MESSAGE = Number.isFinite(DEFAULT_MAX_FACTS_PER_MESSAGE)
  ? Math.min(Math.max(DEFAULT_MAX_FACTS_PER_MESSAGE, 1), 20)
  : 8;
const MAX_TOTAL_FACTS = Number.isFinite(DEFAULT_MAX_TOTAL_FACTS)
  ? Math.min(Math.max(DEFAULT_MAX_TOTAL_FACTS, 1), 200)
  : 64;
const MAX_MESSAGE_CHARS = 8000;

function normalizeMessageContent(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function pickRecentUserMessages(messages, maxMessages = MAX_USER_MESSAGES) {
  if (!Array.isArray(messages) || messages.length === 0) return [];
  const userMessages = messages
    .filter((message) => String(message?.role || "").toLowerCase() === "user")
    .map((message) => normalizeMessageContent(message?.content))
    .filter(Boolean)
    .map((content) => (content.length > MAX_MESSAGE_CHARS ? content.slice(0, MAX_MESSAGE_CHARS) : content));
  if (userMessages.length <= maxMessages) return userMessages;
  return userMessages.slice(-maxMessages);
}

function buildFactMetadata(fact) {
  if (!fact?.conflictKey) return null;
  return {
    conflictKey: fact.conflictKey,
    polarity: fact.polarity,
    source: "session_end",
  };
}

function buildFactDedupeKey(fact) {
  const type = String(fact?.type || "context").trim().toLowerCase() || "context";
  const content = normalizeMessageContent(fact?.content).toLowerCase();
  if (!content) return null;
  return `${type}:${content}`;
}

export async function summarizeConversation(
  { userId, messages, threadId, threadTitle, policy = {} },
  dependencies = {}
) {
  const extractFacts = dependencies.extractFacts || extractFactsOp;
  const storeMemory = dependencies.storeMemory || storeMemoryOp;
  const findDuplicateMemory =
    dependencies.findDuplicateMemory || findDuplicateMemoryOp;
  const findConflict = dependencies.findConflict || findConflictOp;
  const markMemoryOutdated = dependencies.markMemoryOutdated || markMemoryOutdatedOp;

  const scopedUserId = String(userId || "").trim().toLowerCase();
  if (!scopedUserId) {
    return { skipped: true, reason: "invalid_user" };
  }

  if (policy?.disabled) {
    return { skipped: true, reason: "policy_off" };
  }

  const userMessages = pickRecentUserMessages(messages);
  if (userMessages.length === 0) {
    return { skipped: true, reason: "no_user_messages" };
  }

  const result = {
    skipped: false,
    processedMessages: userMessages.length,
    extracted: 0,
    stored: 0,
    superseded: 0,
    duplicates: 0,
    errors: 0,
    storedIds: [],
    skippedFacts: 0,
    factsCapped: false,
    threadId: threadId || null,
    threadTitle: threadTitle || null,
  };
  const seenFacts = new Set();
  let totalFactsProcessed = 0;

  for (const message of userMessages) {
    if (totalFactsProcessed >= MAX_TOTAL_FACTS) {
      result.factsCapped = true;
      break;
    }

    let facts = [];
    try {
      facts = sanitizeExtractedMemories(await extractFacts(message));
    } catch (error) {
      result.errors += 1;
      console.warn("[Memory] Session extract failed:", error?.message || error);
      continue;
    }

    if (!Array.isArray(facts) || facts.length === 0) continue;
    const boundedFacts = facts.slice(0, MAX_FACTS_PER_MESSAGE);
    result.extracted += boundedFacts.length;
    if (facts.length > boundedFacts.length) {
      result.skippedFacts += facts.length - boundedFacts.length;
      result.factsCapped = true;
    }

    for (const fact of boundedFacts) {
      if (totalFactsProcessed >= MAX_TOTAL_FACTS) {
        result.factsCapped = true;
        break;
      }
      totalFactsProcessed += 1;

      const dedupeKey = buildFactDedupeKey(fact);
      if (!dedupeKey) {
        result.skippedFacts += 1;
        continue;
      }
      if (seenFacts.has(dedupeKey)) {
        result.skippedFacts += 1;
        continue;
      }
      seenFacts.add(dedupeKey);

      try {
        const duplicate = await findDuplicateMemory({
          userId: scopedUserId,
          content: fact.content,
          conflictKey: fact.conflictKey,
          polarity: fact.polarity,
        });
        if (duplicate) {
          result.duplicates += 1;
          continue;
        }

        // Auto-supersede: newer info wins. Mark the contradicted memory
        // outdated (live retrieval filters on status='active') then save the new.
        const conflict = await findConflict({
          userId: scopedUserId,
          content: fact.content,
          conflictKey: fact.conflictKey,
          polarity: fact.polarity,
        });
        if (conflict?.memoryId) {
          await markMemoryOutdated({
            userId: scopedUserId,
            memoryId: conflict.memoryId,
          });
          result.superseded += 1;
        }

        const stored = await storeMemory({
          userId: scopedUserId,
          content: fact.content,
          type: fact.type,
          sourceThreadId: threadId || null,
          confidenceScore: fact.confidence,
          metadata: buildFactMetadata(fact),
        });

        if (stored?.duplicate) {
          result.duplicates += 1;
          continue;
        }

        result.stored += 1;
        if (stored?.id) result.storedIds.push(stored.id);
      } catch (error) {
        result.errors += 1;
        console.warn("[Memory] Session store failed:", error?.message || error);
      }
    }
  }

  return result;
}

export default summarizeConversation;
