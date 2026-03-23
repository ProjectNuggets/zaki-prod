import {
  createConflict,
  findConflict,
  findDuplicateMemory,
  stageMemory,
  storeMemory,
} from "./operations.js";
import { extractFacts, sanitizeExtractedMemories } from "../memory-extraction.js";
import { getMemoryUndoWindowMs, upsertUndoWindow } from "./auto-save.js";
import { classifySensitiveMemoryCandidate } from "./sensitivity.js";

const DEFAULT_AUTO_SAVE_MIN_CONFIDENCE = Number(
  process.env.ZAKI_MEMORY_AUTO_SAVE_MIN_CONFIDENCE || 0.85
);
const REVIEW_IF_CONFIDENCE_MISSING =
  String(process.env.ZAKI_MEMORY_REVIEW_IF_CONFIDENCE_MISSING || "true")
    .trim()
    .toLowerCase() !== "false";

function normalizeConfidence(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(1, parsed));
}

function buildSkippedEntry(fact, reason, stage = "policy", detail = null) {
  return {
    content: String(fact?.content || "").trim(),
    type: String(fact?.type || "").trim(),
    reason,
    stage,
    ...(detail ? { detail } : {}),
  };
}

export function classifyMemoryCandidate({
  fact,
  duplicate = false,
  conflict = false,
  policy = {},
}) {
  const confidence = normalizeConfidence(fact?.confidence);
  const sensitivity = classifySensitiveMemoryCandidate(fact);
  const sensitive = Boolean(sensitivity.sensitive);
  const autoSaveMinConfidence = Math.max(
    0,
    Math.min(
      1,
      Number(policy.autoSaveMinConfidence ?? DEFAULT_AUTO_SAVE_MIN_CONFIDENCE)
    )
  );
  const alwaysReview = policy.alwaysReview === true;
  const reviewIfConfidenceMissing =
    policy.reviewIfConfidenceMissing ?? REVIEW_IF_CONFIDENCE_MISSING;

  if (duplicate) {
    return {
      action: "duplicate",
      reason: "duplicate",
      confidence,
      sensitive,
    };
  }
  if (conflict) {
    return {
      action: "conflict",
      reason: "conflict",
      confidence,
      sensitive,
    };
  }
  if (sensitive) {
    return {
      action: "needs_review",
      reason: sensitivity.reason || "sensitive",
      confidence,
      sensitive,
      sensitiveCategory: sensitivity.category || null,
    };
  }
  if (alwaysReview) {
    return {
      action: "needs_review",
      reason: "policy_review",
      confidence,
      sensitive,
    };
  }
  if (confidence == null && reviewIfConfidenceMissing) {
    return {
      action: "needs_review",
      reason: "missing_confidence",
      confidence,
      sensitive,
    };
  }
  if (confidence < autoSaveMinConfidence) {
    return {
      action: "needs_review",
      reason: "low_confidence",
      confidence,
      sensitive,
    };
  }
  return {
    action: "save_reversible",
    reason: "auto_save",
    confidence,
    sensitive,
  };
}

export async function processChatMemoryCapture({
  userId,
  message,
  threadId = null,
  policy = {},
}) {
  const rawExtracted = await extractFacts(message);
  const extracted = sanitizeExtractedMemories(rawExtracted);
  if (extracted.length === 0) {
    return { saved: [], review: [], duplicates: [], conflicts: [], skipped: [] };
  }

  const saved = [];
  const review = [];
  const duplicates = [];
  const conflicts = [];
  const skipped = [];
  const undoWindowMs = getMemoryUndoWindowMs();

  for (const fact of extracted) {
    const duplicate = await findDuplicateMemory({
      userId,
      content: fact.content,
      conflictKey: fact.conflictKey,
      polarity: fact.polarity,
    });
    const conflictMemory = duplicate
      ? null
      : await findConflict({
          userId,
          content: fact.content,
          conflictKey: fact.conflictKey,
          polarity: fact.polarity,
        });

    const decision = classifyMemoryCandidate({
      fact,
      duplicate: Boolean(duplicate),
      conflict: Boolean(conflictMemory),
      policy,
    });

    if (decision.action === "duplicate") {
      duplicates.push({
        content: fact.content,
        type: fact.type,
      });
      continue;
    }

    if (decision.action === "conflict") {
      const createdConflict = await createConflict({
        userId,
        newContent: fact.content,
        newType: fact.type,
        newConfidenceScore: decision.confidence,
        sourceThreadId: threadId,
        conflictMemory,
      });
      conflicts.push({
        id: createdConflict.id,
        content: fact.content,
        type: fact.type,
        conflictingContent: conflictMemory?.content,
        conflictingType: conflictMemory?.type,
      });
      continue;
    }

    if (decision.action === "needs_review") {
      const staged = await stageMemory({
        userId,
        content: fact.content,
        type: fact.type,
        sourceThreadId: threadId,
        confidenceScore: decision.confidence,
        conflictKey: fact.conflictKey,
        polarity: fact.polarity,
      });
      if (staged?.duplicate) {
        duplicates.push({
          content: fact.content,
          type: fact.type,
        });
        continue;
      }
      if (!staged?.id) {
        skipped.push(
          buildSkippedEntry(fact, "stage_failed", "policy", "stage_memory_missing_identifier")
        );
        continue;
      }
      review.push({
        id: staged.id,
        content: fact.content,
        type: fact.type,
        state: "needs_review",
        reason: decision.reason,
      });
      continue;
    }

    if (decision.action === "save_reversible") {
      const metadata = fact.conflictKey
        ? { conflictKey: fact.conflictKey, polarity: fact.polarity }
        : null;
      const stored = await storeMemory({
        userId,
        content: fact.content,
        type: fact.type,
        sourceThreadId: threadId,
        metadata,
      });
      if (stored.duplicate) {
        duplicates.push({
          content: fact.content,
          type: fact.type,
        });
        continue;
      }
      if (!stored?.id) {
        skipped.push(
          buildSkippedEntry(fact, "save_failed", "policy", "store_memory_missing_identifier")
        );
        continue;
      }
      const undoUntil = new Date(Date.now() + undoWindowMs).toISOString();
      await upsertUndoWindow({
        memoryId: stored.id,
        userId,
        expiresAt: undoUntil,
      });
      saved.push({
        id: stored.id,
        content: fact.content,
        type: fact.type,
        state: "saved_reversible",
        undoUntil,
      });
      continue;
    }

    skipped.push({
      ...buildSkippedEntry(fact, decision.reason, "policy"),
    });
  }

  if (
    extracted.length > 0 &&
    saved.length === 0 &&
    review.length === 0 &&
    duplicates.length === 0 &&
    conflicts.length === 0
  ) {
    console.warn("[Memory] capture produced no actionable result", {
      userId,
      threadId,
      extractedCount: extracted.length,
      skipped,
    });
  }

  return {
    saved,
    review,
    duplicates,
    conflicts,
    skipped,
  };
}
