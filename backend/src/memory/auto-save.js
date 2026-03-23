/**
 * Auto-Save with Undo
 * 
 * S-tier UX: Save immediately, allow short undo window
 */

import { storeMemory, deleteMemory, findConflict, createConflict } from "./operations.js";
import { dbGet, dbQuery } from "../db.js";
import { sanitizeExtractedMemories } from "../memory-extraction.js";

const DEFAULT_UNDO_WINDOW_MS = Math.max(
  1000,
  Number(process.env.ZAKI_MEMORY_UNDO_WINDOW_MS || 5000)
);

export function getMemoryUndoWindowMs() {
  return DEFAULT_UNDO_WINDOW_MS;
}

export async function upsertUndoWindow({ memoryId, userId, expiresAt }) {
  await dbQuery(
    `INSERT INTO memory_undo_windows (memory_id, user_id, expires_at, used_at, created_at)
     VALUES ($1, $2, $3, NULL, NOW())
     ON CONFLICT (memory_id)
     DO UPDATE SET
       user_id = EXCLUDED.user_id,
       expires_at = EXCLUDED.expires_at,
       used_at = NULL,
       created_at = NOW()`,
    [memoryId, userId, expiresAt]
  );
}

export async function autoSaveWithUndo({ userId, message, threadId = null }) {
  // Extract facts
  const { extractFacts } = await import("../memory-extraction.js");
  const facts = sanitizeExtractedMemories(await extractFacts(message));
  
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
          sourceThreadId: threadId,
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
        const expiresAt = new Date(Date.now() + DEFAULT_UNDO_WINDOW_MS).toISOString();
        saved.push({
          id: result.id,
          content: fact.content,
          type: fact.type,
          undoUntil: expiresAt,
        });
        await upsertUndoWindow({
          memoryId: result.id,
          userId,
          expiresAt,
        });
      }
    } catch (err) {
      console.warn("[AutoSave] Failed:", err.message);
    }
  }

  return { saved, duplicates, conflicts };
}

export async function undoMemory({ userId, memoryId }) {
  const windowRow = await dbGet(
    `SELECT memory_id, user_id, expires_at, used_at
     FROM memory_undo_windows
     WHERE memory_id = $1`,
    [memoryId]
  );

  if (!windowRow) {
    return { error: "Undo expired or not found", success: false };
  }

  if (String(windowRow.user_id || "") !== String(userId || "")) {
    return { error: "Unauthorized", success: false };
  }

  if (windowRow.used_at) {
    return { error: "Undo expired or not found", success: false };
  }

  const expiresAt = Date.parse(String(windowRow.expires_at || ""));
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    await dbQuery(
      `UPDATE memory_undo_windows
       SET used_at = NOW()
       WHERE memory_id = $1 AND used_at IS NULL`,
      [memoryId]
    );
    return { error: "Undo window expired", success: false };
  }

  const deleted = await deleteMemory(memoryId, userId);
  if (!deleted) {
    await dbQuery(
      `UPDATE memory_undo_windows
       SET used_at = NOW()
       WHERE memory_id = $1 AND used_at IS NULL`,
      [memoryId]
    );
    return { error: "Memory not found", success: false };
  }

  await dbQuery(
    `UPDATE memory_undo_windows
     SET used_at = NOW()
     WHERE memory_id = $1 AND used_at IS NULL`,
    [memoryId]
  );

  return { success: true };
}
