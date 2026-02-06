/**
 * Memory Modes - Dual-mode memory system
 * 
 * AUTO (default): Saves immediately, returns ID for undo
 * MANUAL: Stages for explicit confirmation
 */

import crypto from "node:crypto";

export function createMemoryModeHandlers(deps) {
  const { extractFacts, storeMemory, dbQuery, dbGet } = deps;

  return {
    /**
     * AUTO mode: Save immediately, return IDs for undo
     */
    async autoSave({ userId, message, threadId }) {
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
            });
          }
        } catch (err) {
          console.warn("[Memory] Auto-save failed:", err.message);
        }
      }

      return { saved, duplicates };
    },

    /**
     * MANUAL mode: Stage for explicit confirmation
     */
    async stage({ userId, message, threadId }) {
      const facts = await extractFacts(message);
      
      if (facts.length === 0) {
        return { pending: [], duplicates: [] };
      }

      const pending = [];
      const duplicates = [];

      for (const fact of facts) {
        // Check for duplicates
        const hash = crypto
          .createHash("sha256")
          .update(fact.content)
          .digest("hex");
        
        const existing = await dbGet(
          "SELECT id FROM memories WHERE user_id = $1 AND content_hash = $2",
          [userId, hash]
        );

        if (existing) {
          duplicates.push({ content: fact.content, type: fact.type });
          continue;
        }

        // Stage for confirmation
        const id = crypto.randomUUID();
        await dbQuery(
          `INSERT INTO memory_confirmations 
           (id, user_id, content, type, source_thread_id, confidence_score, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())`,
          [id, userId, fact.content, fact.type, threadId, 0.8]
        );

        pending.push({ id, content: fact.content, type: fact.type });
      }

      return { pending, duplicates };
    },

    /**
     * Confirm a staged memory
     */
    async confirm({ userId, confirmationId }) {
      const row = await dbGet(
        "SELECT * FROM memory_confirmations WHERE id = $1 AND user_id = $2",
        [confirmationId, userId]
      );

      if (!row) {
        return { error: "Not found" };
      }

      // Store as memory
      const result = await storeMemory({
        userId,
        content: row.content,
        type: row.type,
        sourceThreadId: row.source_thread_id,
      });

      // Mark as confirmed
      await dbQuery(
        "UPDATE memory_confirmations SET status = 'confirmed', confirmed_at = NOW() WHERE id = $1",
        [confirmationId]
      );

      return { success: true, memory: result };
    },

    /**
     * Reject/cancel a staged memory
     */
    async reject({ userId, confirmationId }) {
      await dbQuery(
        "UPDATE memory_confirmations SET status = 'rejected' WHERE id = $1 AND user_id = $2",
        [confirmationId, userId]
      );
      return { success: true };
    },

    /**
     * Undo saved memory (within timeout)
     */
    async undo({ userId, memoryId }) {
      await dbQuery(
        "DELETE FROM memories WHERE id = $1 AND user_id = $2",
        [memoryId, userId]
      );
      return { success: true };
    },
  };
}
