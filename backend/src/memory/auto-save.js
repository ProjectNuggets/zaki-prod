/**
 * Auto-Save with Undo
 * 
 * S-tier UX: Save immediately, allow short undo window
 */

import { storeMemory, findConflict, markMemoryOutdated } from "./operations.js";
import { dbGet, dbQuery, withDbTransaction } from "../db.js";
import { sanitizeExtractedMemories } from "../memory-extraction.js";

const DEFAULT_UNDO_WINDOW_MS = Math.max(
  1000,
  Number(process.env.ZAKI_MEMORY_UNDO_WINDOW_MS || 5000)
);

export function getMemoryUndoWindowMs() {
  return DEFAULT_UNDO_WINDOW_MS;
}

export async function upsertUndoWindow({
  memoryId,
  userId,
  expiresAt,
  supersededMemoryId = null,
}) {
  await dbQuery(
    `INSERT INTO memory_undo_windows
       (memory_id, user_id, expires_at, used_at, created_at, superseded_memory_id)
     VALUES ($1, $2, $3, NULL, NOW(), $4)
     ON CONFLICT (memory_id)
     DO UPDATE SET
       user_id = EXCLUDED.user_id,
       expires_at = EXCLUDED.expires_at,
       superseded_memory_id = EXCLUDED.superseded_memory_id,
       used_at = NULL,
       created_at = NOW()`,
    [memoryId, userId, expiresAt, supersededMemoryId]
  );
}

export async function autoSaveWithUndo({ userId, message, threadId = null }) {
  // Extract facts
  const { extractFacts } = await import("../memory-extraction.js");
  const facts = sanitizeExtractedMemories(await extractFacts(message));
  
  if (facts.length === 0) {
    return { saved: [], duplicates: [], superseded: [] };
  }

  const saved = [];
  const duplicates = [];
  const superseded = [];

  for (const fact of facts) {
    try {
      // Auto-supersede: newest wins. Mark the contradicted memory outdated so
      // live retrieval (status='active' only) stops surfacing it, then save the new.
      const conflict = await findConflict({
        userId,
        content: fact.content,
        conflictKey: fact.conflictKey,
        polarity: fact.polarity,
      });
      if (conflict?.memoryId) {
        await markMemoryOutdated({ userId, memoryId: conflict.memoryId });
        superseded.push({
          memoryId: conflict.memoryId,
          content: conflict.content,
          type: conflict.type,
        });
      }

      const metadata = fact.conflictKey
        ? { conflictKey: fact.conflictKey, polarity: fact.polarity }
        : null;
      const result = await storeMemory({
        userId,
        content: fact.content,
        type: fact.type,
        sourceThreadId: threadId,
        confidenceScore: fact.confidence,
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
          superseded: Boolean(conflict?.memoryId),
        });
        await upsertUndoWindow({
          memoryId: result.id,
          userId,
          expiresAt,
          supersededMemoryId: conflict?.memoryId || null,
        });
      }
    } catch (err) {
      console.warn("[AutoSave] Failed:", err.message);
    }
  }

  return { saved, duplicates, superseded };
}

export async function undoMemory({ userId, memoryId }) {
  const windowRow = await dbGet(
    `SELECT memory_id, user_id, expires_at, used_at, superseded_memory_id
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

  const undone = await withDbTransaction(async (client) => {
    const deleted = await client.query(
      `DELETE FROM memories
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [memoryId, userId]
    );
    if (deleted.rowCount === 0) return false;

    if (windowRow.superseded_memory_id) {
      const restored = await client.query(
        `UPDATE memories
         SET status = 'active', updated_at = NOW()
         WHERE id = $1 AND user_id = $2 AND status = 'outdated'`,
        [windowRow.superseded_memory_id, userId]
      );
      if (restored.rowCount === 0) {
        throw new Error("Superseded memory could not be restored");
      }
    }

    const consumed = await client.query(
      `UPDATE memory_undo_windows
       SET used_at = NOW()
       WHERE memory_id = $1 AND user_id = $2 AND used_at IS NULL
       RETURNING memory_id`,
      [memoryId, userId]
    );
    if (consumed.rowCount === 0) {
      throw new Error("Undo window could not be consumed");
    }
    return true;
  });
  if (!undone) return { error: "Memory not found", success: false };

  return { success: true };
}
