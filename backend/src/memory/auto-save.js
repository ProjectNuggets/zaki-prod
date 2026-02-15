/**
 * Auto-Save with Undo
 * 
 * S-tier UX: Save immediately, allow 3-second undo
 */

import { storeMemory, deleteMemory, findConflict, createConflict } from "./operations.js";

// Simple in-memory undo buffer (3-second TTL)
const undoBuffer = new Map();

export async function autoSaveWithUndo({ userId, message, threadId = null }) {
  // Extract facts
  const { extractFacts } = await import("../memory-extraction.js");
  const facts = await extractFacts(message);
  
  if (facts.length === 0) {
    return { saved: [], duplicates: [], conflicts: [] };
  }

  const saved = [];
  const duplicates = [];
  const conflicts = [];

  for (const fact of facts) {
    try {
      const conflict = await findConflict({
        userId,
        content: fact.content,
        conflictKey: fact.conflictKey,
        polarity: fact.polarity,
      });
      if (conflict) {
        const { id } = await createConflict({
          userId,
          newContent: fact.content,
          newType: fact.type,
          newConfidenceScore: 0.8,
          conflictMemory: conflict,
        });
        conflicts.push({
          id,
          content: fact.content,
          type: fact.type,
          conflictingContent: conflict.content,
          conflictingType: conflict.type,
        });
        continue;
      }

      const metadata = fact.conflictKey
        ? { conflictKey: fact.conflictKey, polarity: fact.polarity }
        : null;
      const result = await storeMemory({
        userId,
        content: fact.content,
        type: fact.type,
        sourceThreadId: threadId,
        metadata,
      });

      if (result.duplicate) {
        duplicates.push({ content: fact.content, type: fact.type });
      } else {
        saved.push({
          id: result.id,
          content: fact.content,
          type: fact.type,
          undoUntil: Date.now() + 3000, // 3 seconds
        });
        
        // Add to undo buffer
        undoBuffer.set(result.id, {
          userId,
          expiresAt: Date.now() + 3000,
        });
      }
    } catch (err) {
      console.warn("[AutoSave] Failed:", err.message);
    }
  }

  return { saved, duplicates, conflicts };
}

export async function undoMemory({ userId, memoryId }) {
  const bufferEntry = undoBuffer.get(memoryId);
  
  if (!bufferEntry) {
    return { error: "Undo expired or not found", success: false };
  }
  
  if (bufferEntry.userId !== userId) {
    return { error: "Unauthorized", success: false };
  }
  
  if (Date.now() > bufferEntry.expiresAt) {
    undoBuffer.delete(memoryId);
    return { error: "Undo window expired", success: false };
  }
  
  // Delete the memory
  await deleteMemory(memoryId, userId);
  undoBuffer.delete(memoryId);
  
  return { success: true };
}

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of undoBuffer.entries()) {
    if (now > entry.expiresAt) {
      undoBuffer.delete(id);
    }
  }
}, 5000);
