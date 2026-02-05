/**
 * Auto-Save with Undo
 * 
 * S-tier UX: Save immediately, allow 3-second undo
 */

import { storeMemory, deleteMemory } from "./operations.js";

// Simple in-memory undo buffer (3-second TTL)
const undoBuffer = new Map();

export async function autoSaveWithUndo({ userId, message, threadId = null }) {
  // Extract facts
  const { extractFacts } = await import("../memory-extraction.js");
  const facts = await extractFacts(message);
  
  if (facts.length === 0) {
    return { saved: [], duplicates: [] };
  }

  const saved = [];
  const duplicates = [];

  for (const fact of facts) {
    try {
      const result = await storeMemory({
        userId,
        content: fact.content,
        type: fact.type,
        sourceThreadId: threadId,
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

  return { saved, duplicates };
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
