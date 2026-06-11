import {
  findConflict,
  findDuplicateMemory,
  pruneEpisodicMemories,
  pruneOutdatedMemories,
  storeMemory,
} from "./operations.js";
import { extractMemories, sanitizeExtractedMemories } from "../memory-extraction.js";
import { getMemoryUndoWindowMs, upsertUndoWindow } from "./auto-save.js";

function normalizeConfidence(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(1, parsed));
}

function buildSkippedEntry(fact, reason, stage = "store", detail = null) {
  return {
    content: String(fact?.content || "").trim(),
    type: String(fact?.type || "").trim(),
    reason,
    stage,
    ...(detail ? { detail } : {}),
  };
}

/**
 * Classify a candidate memory. The review/approval flow has been removed:
 * capture is binary (on/off). When memory is on, every extracted fact is saved
 * (reversibly, with an undo window). The only branches are:
 *   - duplicate  → skip (already known)
 *   - supersede  → newer info contradicts an existing memory; mark the old one
 *                  outdated (newest wins) then save the new one
 *   - save       → store it
 * Sensitive content is saved like anything else, and contradictions resolve
 * deterministically via supersession + similarity recall (no user prompt).
 */
export function classifyMemoryCandidate({ fact, duplicate = false, conflict = false }) {
  const confidence = normalizeConfidence(fact?.confidence);
  if (duplicate) {
    return { action: "duplicate", reason: "duplicate", confidence };
  }
  if (conflict) {
    return { action: "supersede", reason: "supersede", confidence };
  }
  return { action: "save", reason: "auto_save", confidence };
}

export async function processChatMemoryCapture({
  userId,
  message,
  threadId = null,
  policy = {},
}) {
  if (policy?.disabled) {
    return { saved: [], duplicates: [], superseded: [], skipped: [] };
  }

  const { facts, episodic } = await extractMemories(message);
  const extracted = sanitizeExtractedMemories(facts);
  if (extracted.length === 0 && episodic.length === 0) {
    return { saved: [], duplicates: [], superseded: [], skipped: [] };
  }

  const saved = [];
  const duplicates = [];
  const superseded = [];
  const skipped = [];
  const undoWindowMs = getMemoryUndoWindowMs();

  for (const fact of extracted) {
    const duplicate = await findDuplicateMemory({
      userId,
      content: fact.content,
      conflictKey: fact.conflictKey,
      polarity: fact.polarity,
    });
    if (duplicate) {
      duplicates.push({ content: fact.content, type: fact.type });
      continue;
    }

    // Auto-supersede: when newer info contradicts an existing memory, the old row
    // is marked outdated AND the new row inserted in ONE transaction inside
    // storeMemory (atomic newest-wins; live retrieval filters status='active') —
    // no review queue, no conflict prompt.
    const conflictMemory = await findConflict({
      userId,
      content: fact.content,
      conflictKey: fact.conflictKey,
      polarity: fact.polarity,
    });
    if (conflictMemory?.memoryId) {
      superseded.push({
        memoryId: conflictMemory.memoryId,
        content: conflictMemory.content,
        type: conflictMemory.type,
      });
    }

    const metadata = fact.conflictKey
      ? { conflictKey: fact.conflictKey, polarity: fact.polarity }
      : null;
    const stored = await storeMemory({
      userId,
      content: fact.content,
      type: fact.type,
      sourceThreadId: threadId,
      confidenceScore: fact.confidence,
      metadata,
      supersedeMemoryId: conflictMemory?.memoryId || null,
    });
    if (stored?.duplicate) {
      duplicates.push({ content: fact.content, type: fact.type });
      continue;
    }
    if (!stored?.id) {
      skipped.push(
        buildSkippedEntry(fact, "save_failed", "store", "store_memory_missing_identifier")
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
      superseded: Boolean(conflictMemory?.memoryId),
    });
  }

  for (const sentence of episodic) {
    const stored = await storeMemory({
      userId,
      content: sentence.content,
      type: "episodic",
      sourceThreadId: threadId,
      confidenceScore: 0.5,
    });
    if (!stored?.id || stored.duplicate) continue;
    const undoUntil = new Date(Date.now() + undoWindowMs).toISOString();
    await upsertUndoWindow({ memoryId: stored.id, userId, expiresAt: undoUntil });
    saved.push({
      id: stored.id,
      content: sentence.content,
      type: "episodic",
      state: "saved_reversible",
      undoUntil,
    });
  }

  if (episodic.length > 0) {
    try { await pruneEpisodicMemories(userId); } catch { /* best-effort */ }
  }
  // A supersede just created outdated rows — opportunistically sweep expired ones.
  if (superseded.length > 0) {
    try { await pruneOutdatedMemories(userId); } catch { /* best-effort */ }
  }

  return { saved, duplicates, superseded, skipped };
}
