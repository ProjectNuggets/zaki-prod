/**
 * Memory Routes - Clean Express routes
 * 
 * No business logic here - just routing and parameter validation.
 * All operations imported from operations.js
 */

import {
  storeMemory,
  deleteMemory,
  getMemories,
  searchMemories,
  buildContext,
  stageMemory,
  getPendingConfirmations,
  confirmMemory,
  rejectMemory,
  checkStorage,
} from "./operations.js";

import { autoSaveWithUndo, undoMemory } from "./auto-save.js";

import { extractFacts } from "../memory-extraction.js";

export function createMemoryRoutes(app) {
  // ==========================================================================
  // Health check
  // ==========================================================================
  
  app.get("/api/memory/health", async (req, res) => {
    try {
      const storage = await checkStorage();
      res.json({
        ok: true,
        storage: storage ? "pgvector" : "fallback",
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ==========================================================================
  // Core memory CRUD
  // ==========================================================================
  
  app.post("/api/memory", async (req, res) => {
    try {
      const { userId, content, type, metadata, threadId } = req.body;
      
      if (!userId || !content) {
        return res.status(400).json({ error: "userId and content required" });
      }
      
      const result = await storeMemory({
        userId,
        content,
        type,
        metadata,
        sourceThreadId: threadId,
      });
      
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/memory/list/:userId", async (req, res) => {
    try {
      const memories = await getMemories(req.params.userId);
      res.json({ memories, count: memories.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/memory/search", async (req, res) => {
    try {
      const { userId, query, limit = 5 } = req.body;
      const results = await searchMemories({ userId, query, limit });
      res.json({ results });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/memory/:id", async (req, res) => {
    try {
      const { userId } = req.body;
      const success = await deleteMemory(req.params.id, userId);
      res.json({ deleted: success });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================================================
  // Manual Mode: Confirmation Flow
  // ==========================================================================
  
  app.post("/api/memory/preview", async (req, res) => {
    try {
      const { userId, message, threadId } = req.body;
      
      if (!userId || !message) {
        return res.status(400).json({ error: "userId and message required" });
      }
      
      // Extract facts
      const facts = await extractFacts(message);
      
      if (facts.length === 0) {
        return res.json({ pending: [], duplicates: [] });
      }
      
      const results = { pending: [], duplicates: [] };
      
      for (const fact of facts) {
        // Check hash dupes
        const { default: crypto } = await import("node:crypto");
        const hash = crypto.createHash("sha256").update(fact.content).digest("hex");
        
        const existing = await getMemories(userId);
        const dupe = existing.find(m => m.content_hash === hash || m.content === fact.content);
        
        if (dupe) {
          results.duplicates.push({
            content: fact.content,
            type: fact.type,
          });
          continue;
        }
        
        // Stage for confirmation
        const { id } = await stageMemory({
          userId,
          content: fact.content,
          type: fact.type,
          sourceThreadId: threadId,
          confidenceScore: 0.8,
        });
        
        results.pending.push({
          id,
          content: fact.content,
          type: fact.type,
          confirmationId: id,
        });
      }
      
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/memory/confirmations/:userId", async (req, res) => {
    try {
      const confirmations = await getPendingConfirmations(
        req.params.userId,
        parseInt(req.query.limit) || 50
      );
      res.json({ confirmations });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/memory/confirmations/:id/confirm", async (req, res) => {
    try {
      const { userId } = req.body;
      const result = await confirmMemory(req.params.id, userId);
      
      if (result.error) {
        return res.status(404).json(result);
      }
      
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/memory/confirmations/:id/reject", async (req, res) => {
    try {
      const { userId } = req.body;
      const result = await rejectMemory(req.params.id, userId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Context retrieval - POST
  app.post("/api/memory/context", async (req, res) => {
    try {
      const { userId, query, maxChars = 2000 } = req.body;
      const context = await buildContext({ userId, query, maxChars });
      res.json(context);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Context retrieval - GET (convenience)
  app.get("/api/memory/context/:userId", async (req, res) => {
    try {
      const { q: query, max } = req.query;
      const maxChars = max ? parseInt(max, 10) : 2000;
      const context = await buildContext({ 
        userId: req.params.userId, 
        query, 
        maxChars 
      });
      res.json(context);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Auto-Save with 3s Undo
  app.post("/api/memory/autosave", async (req, res) => {
    try {
      const { userId, message, threadId } = req.body;
      
      if (!userId || !message) {
        return res.status(400).json({ error: "userId and message required" });
      }
      
      const result = await autoSaveWithUndo({ userId, message, threadId });
      res.json(result);
    } catch (err) {
      console.error("[AutoSave] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Undo memory within 3s window
  app.post("/api/memory/undo/:id", async (req, res) => {
    try {
      const { userId } = req.body;
      const result = await undoMemory({ userId, memoryId: req.params.id });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  console.log("[Memory] Routes registered");
}
