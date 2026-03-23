/**
 * Memory Routes - Clean Express routes
 * 
 * No business logic here - just routing and parameter validation.
 * All operations imported from operations.js
 */

import {
  storeMemory as storeMemoryOp,
  deleteMemory as deleteMemoryOp,
  getMemories as getMemoriesOp,
  findDuplicateMemory as findDuplicateMemoryOp,
  searchMemories as searchMemoriesOp,
  buildContext as buildContextOp,
  stageMemory as stageMemoryOp,
  getPendingConfirmations as getPendingConfirmationsOp,
  getPendingConfirmationCount as getPendingConfirmationCountOp,
  confirmMemory as confirmMemoryOp,
  rejectMemory as rejectMemoryOp,
  findConflict as findConflictOp,
  createConflict as createConflictOp,
  getConflicts as getConflictsOp,
  getConflictCount as getConflictCountOp,
  resolveConflict as resolveConflictOp,
  checkStorage as checkStorageOp,
  probeEmbeddingsProvider as probeEmbeddingsProviderOp,
  getMemoryPreferences as getMemoryPreferencesOp,
  resolveMemoryCapturePolicy as resolveMemoryCapturePolicyOp,
  setMemoryPreferences as setMemoryPreferencesOp,
  updateMemory as updateMemoryOp,
  getMemoryActivity as getMemoryActivityOp,
} from "./operations.js";
import { normalizeMemoryPolicy } from "./policy.js";

import {
  autoSaveWithUndo as autoSaveWithUndoOp,
  undoMemory as undoMemoryOp,
} from "./auto-save.js";
import { processChatMemoryCapture as processChatMemoryCaptureOp } from "./capture.js";

import {
  extractFacts as extractFactsOp,
  sanitizeExtractedMemories,
  probeMemoryExtractionProvider as probeMemoryExtractionProviderOp,
} from "../memory-extraction.js";
import {
  recordMemoryTelemetry,
  setMemoryTelemetrySseClients,
} from "./telemetry.js";

function normalizeScopedUserId(value) {
  return String(value || "").trim().toLowerCase();
}

function getRequestedScopedUserIds(req) {
  const ids = [
    normalizeScopedUserId(req.params?.userId),
    normalizeScopedUserId(req.query?.userId),
    normalizeScopedUserId(req.body?.userId),
  ].filter(Boolean);
  return [...new Set(ids)];
}

const MAX_MESSAGE_CHARS = 8000;
const MAX_MEMORY_CONTENT_CHARS = 500;
const MAX_THREAD_ID_CHARS = 160;
const MAX_QUERY_CHARS = 500;
const MAX_CONTEXT_CHARS = 4000;
const MAX_METADATA_JSON_CHARS = 2000;
const MAX_PAGE_LIMIT = 100;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_MEMORY_TYPES = new Set([
  "context",
  "fact",
  "preference",
  "emotion",
  "event",
  "goal",
  "relationship",
  "struggle",
]);

function toBoundedString(value, { maxChars, trim = true } = {}) {
  if (value === undefined || value === null) return "";
  const normalized = trim
    ? String(value).replace(/\s+/g, " ").trim()
    : String(value);
  if (!normalized) return "";
  if (!maxChars || normalized.length <= maxChars) return normalized;
  return normalized.slice(0, maxChars).trim();
}

function toBoundedInt(value, { fallback, min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function isTruthyQuery(value) {
  return ["1", "true", "yes", "on", "probe", "llm", "provider"].includes(
    String(value || "").trim().toLowerCase()
  );
}

function normalizeMemoryType(type) {
  const normalized = String(type || "").trim().toLowerCase();
  if (!normalized) return "context";
  return ALLOWED_MEMORY_TYPES.has(normalized) ? normalized : "context";
}

function sanitizeMetadataInput(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  try {
    const raw = JSON.stringify(metadata);
    if (!raw || raw.length > MAX_METADATA_JSON_CHARS) {
      return null;
    }
  } catch {
    return null;
  }

  const safe = {};
  if (typeof metadata.conflictKey === "string") {
    const value = toBoundedString(metadata.conflictKey, { maxChars: 180 });
    if (value) safe.conflictKey = value;
  }
  if (metadata.polarity !== undefined && metadata.polarity !== null) {
    const lower = String(metadata.polarity).toLowerCase();
    if (["positive", "negative", "neutral", "1", "-1", "0"].includes(lower)) {
      safe.polarity = metadata.polarity;
    }
  }
  if (typeof metadata.userVerified === "boolean") {
    safe.userVerified = metadata.userVerified;
  }
  if (typeof metadata.editedFrom === "string") {
    const value = toBoundedString(metadata.editedFrom, { maxChars: 120 });
    if (value) safe.editedFrom = value;
  }
  if (typeof metadata.source === "string") {
    const value = toBoundedString(metadata.source, { maxChars: 64 });
    if (value) safe.source = value.toLowerCase();
  }
  return Object.keys(safe).length ? safe : null;
}

function isValidUuid(value) {
  return UUID_REGEX.test(String(value || ""));
}

export async function resolveAuthenticatedMemoryUser(req, res, requireAuthUser) {
  if (typeof requireAuthUser !== "function") {
    res.status(500).json({ error: "Memory auth is not configured." });
    return null;
  }

  const authResult = await requireAuthUser(req, res);
  if (!authResult) return null;

  const authenticatedUserId = normalizeScopedUserId(authResult.email);
  if (!authenticatedUserId) {
    res.status(400).json({ error: "Invalid authenticated user." });
    return null;
  }

  const requestedUserIds = getRequestedScopedUserIds(req);
  if (requestedUserIds.length > 1) {
    res.status(400).json({ error: "Conflicting userId values in request." });
    return null;
  }
  if (requestedUserIds.length === 1 && requestedUserIds[0] !== authenticatedUserId) {
    res.status(403).json({ error: "Forbidden: memory access is scoped to your account." });
    return null;
  }

  return {
    userId: authenticatedUserId,
    authResult,
  };
}

export function createMemoryRoutes(app, { requireAuthUser, dependencies = {} } = {}) {
  const {
    storeMemory = storeMemoryOp,
    deleteMemory = deleteMemoryOp,
    getMemories = getMemoriesOp,
    findDuplicateMemory = findDuplicateMemoryOp,
    searchMemories = searchMemoriesOp,
    buildContext = buildContextOp,
    stageMemory = stageMemoryOp,
    getPendingConfirmations = getPendingConfirmationsOp,
    getPendingConfirmationCount = getPendingConfirmationCountOp,
    confirmMemory = confirmMemoryOp,
    rejectMemory = rejectMemoryOp,
    findConflict = findConflictOp,
    createConflict = createConflictOp,
    getConflicts = getConflictsOp,
    getConflictCount = getConflictCountOp,
    resolveConflict = resolveConflictOp,
    checkStorage = checkStorageOp,
    extractFacts = extractFactsOp,
    probeMemoryExtractionProvider = probeMemoryExtractionProviderOp,
    probeEmbeddingsProvider = probeEmbeddingsProviderOp,
    getMemoryPreferences = getMemoryPreferencesOp,
    resolveMemoryCapturePolicy = resolveMemoryCapturePolicyOp,
    setMemoryPreferences = setMemoryPreferencesOp,
    updateMemory = updateMemoryOp,
    getMemoryActivity = getMemoryActivityOp,
    autoSaveWithUndo = autoSaveWithUndoOp,
    undoMemory = undoMemoryOp,
    processChatMemoryCapture = processChatMemoryCaptureOp,
  } = dependencies || {};

  const requireMemoryUser = (req, res) =>
    resolveAuthenticatedMemoryUser(req, res, requireAuthUser);

  const sseSubscribers = new Map();
  const countSseSubscribers = () => {
    let total = 0;
    for (const set of sseSubscribers.values()) {
      total += set.size;
    }
    return total;
  };

  const sendSse = (res, event, payload) => {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(payload || {})}\n\n`);
      return true;
    } catch {
      return false;
    }
  };

  const addSseSubscriber = (userId, res) => {
    const key = normalizeScopedUserId(userId);
    if (!key) return;
    const set = sseSubscribers.get(key) || new Set();
    set.add(res);
    sseSubscribers.set(key, set);
    setMemoryTelemetrySseClients(countSseSubscribers());
    recordMemoryTelemetry("sse.connect");
  };

  const removeSseSubscriber = (userId, res) => {
    const key = normalizeScopedUserId(userId);
    if (!key) return;
    const set = sseSubscribers.get(key);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) {
      sseSubscribers.delete(key);
    }
    setMemoryTelemetrySseClients(countSseSubscribers());
    recordMemoryTelemetry("sse.disconnect");
  };

  const publishMemoryStatus = async (userId, reason = "update") => {
    const key = normalizeScopedUserId(userId);
    const targets = sseSubscribers.get(key);
    if (!targets || targets.size === 0) return;
    try {
      const [pending, conflicts] = await Promise.all([
        getPendingConfirmationCount(key),
        getConflictCount(key),
      ]);
      const payload = {
        pending: Number(pending || 0),
        conflicts: Number(conflicts || 0),
        reason,
        timestamp: new Date().toISOString(),
      };
      for (const client of [...targets]) {
        const ok = sendSse(client, "status", payload);
        if (!ok) {
          removeSseSubscriber(key, client);
        }
      }
      recordMemoryTelemetry("push.status");
    } catch {
      recordMemoryTelemetry("pipeline.error");
    }
  };

  if (process.env.NODE_ENV !== "test") {
    const heartbeatTimer = setInterval(() => {
      for (const [userId, clients] of sseSubscribers.entries()) {
        for (const client of [...clients]) {
          const ok = sendSse(client, "ping", {
            userId,
            timestamp: new Date().toISOString(),
          });
          if (!ok) {
            removeSseSubscriber(userId, client);
          }
        }
      }
    }, 25_000);
    if (typeof heartbeatTimer.unref === "function") {
      heartbeatTimer.unref();
    }
  }

  // ==========================================================================
  // Health check
  // ==========================================================================
  
  app.get("/api/memory/health", async (req, res) => {
    try {
      const storage = await checkStorage();
      const includeProviderProbe =
        isTruthyQuery(req.query?.probe) ||
        isTruthyQuery(req.query?.provider) ||
        isTruthyQuery(req.query?.llm);

      if (includeProviderProbe) {
        const scope = await requireMemoryUser(req, res);
        if (!scope) return;
      }

      const payload = {
        ok: true,
        storage: storage ? "pgvector" : "fallback",
        timestamp: new Date().toISOString(),
      };

      if (includeProviderProbe) {
        const [extraction, embeddings] = await Promise.all([
          probeMemoryExtractionProvider(),
          probeEmbeddingsProvider(),
        ]);
        payload.provider = {
          extraction,
          embeddings,
        };
        payload.sessionSummarization = {
          enabled: String(process.env.ZAKI_ENABLE_SESSION_SUMMARIZATION || "").toLowerCase() === "true",
          extractionReady: Boolean(extraction?.ok),
        };
      }

      res.json(payload);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/api/memory/events", async (req, res) => {
    const scope = await requireMemoryUser(req, res);
    if (!scope) return;

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    sendSse(res, "ready", { ok: true, timestamp: new Date().toISOString() });
    addSseSubscriber(scope.userId, res);
    void publishMemoryStatus(scope.userId, "initial");

    req.on("close", () => {
      removeSseSubscriber(scope.userId, res);
    });
  });

  // ==========================================================================
  // Core memory CRUD
  // ==========================================================================
  
  app.post("/api/memory", async (req, res) => {
    try {
      const scope = await requireMemoryUser(req, res);
      if (!scope) return;
      recordMemoryTelemetry("request.direct_save");

      const { content, type, metadata, threadId } = req.body || {};
      const normalizedContent = toBoundedString(content, {
        maxChars: MAX_MEMORY_CONTENT_CHARS,
      });
      if (!normalizedContent) {
        return res.status(400).json({ error: "content required" });
      }
      const normalizedThreadId = toBoundedString(threadId, {
        maxChars: MAX_THREAD_ID_CHARS,
      });
      
      const result = await storeMemory({
        userId: scope.userId,
        content: normalizedContent,
        type: normalizeMemoryType(type),
        metadata: sanitizeMetadataInput(metadata),
        sourceThreadId: normalizedThreadId || null,
      });
      if (result?.duplicate) {
        recordMemoryTelemetry("store.duplicate");
      } else {
        recordMemoryTelemetry("store.saved");
      }
      void publishMemoryStatus(scope.userId, "direct_save");
      res.json(result);
    } catch (err) {
      recordMemoryTelemetry("pipeline.error");
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/memory/preferences", async (req, res) => {
    try {
      const scope = await requireMemoryUser(req, res);
      if (!scope) return;
      const preferences = await getMemoryPreferences(scope.userId);
      res.json(preferences);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/memory/preferences", async (req, res) => {
    try {
      const scope = await requireMemoryUser(req, res);
      if (!scope) return;
      const { policy } = req.body || {};
      const normalizedPolicy = normalizeMemoryPolicy(policy);
      if (!normalizedPolicy) {
        return res.status(400).json({ error: "Invalid memory policy." });
      }
      const preferences = await setMemoryPreferences(scope.userId, {
        policy: normalizedPolicy,
      });
      res.json(preferences);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/memory/:id", async (req, res) => {
    try {
      const scope = await requireMemoryUser(req, res);
      if (!scope) return;
      if (!isValidUuid(req.params.id)) {
        return res.status(400).json({ error: "Invalid memory id." });
      }

      const { content, type, status } = req.body || {};
      if (content === undefined && type === undefined && status === undefined) {
        return res.status(400).json({ error: "At least one field is required." });
      }

      const normalizedContent =
        content === undefined
          ? undefined
          : toBoundedString(content, { maxChars: MAX_MEMORY_CONTENT_CHARS });
      if (content !== undefined && !normalizedContent) {
        return res.status(400).json({ error: "content required" });
      }

      const normalizedStatus =
        status === undefined
          ? undefined
          : ["active", "outdated"].includes(String(status || "").trim().toLowerCase())
            ? String(status || "").trim().toLowerCase()
            : null;
      if (status !== undefined && !normalizedStatus) {
        return res.status(400).json({ error: "status must be active or outdated" });
      }

      const result = await updateMemory({
        id: req.params.id,
        userId: scope.userId,
        content: normalizedContent,
        type: type === undefined ? undefined : normalizeMemoryType(type),
        status: normalizedStatus,
      });

      if (result?.error === "not_found") {
        return res.status(404).json({ error: "Memory not found." });
      }
      if (result?.error === "duplicate") {
        return res.status(409).json({
          error: "Updated memory duplicates an existing memory.",
          duplicateId: result.duplicateId || null,
        });
      }
      if (result?.error === "invalid_content") {
        return res.status(400).json({ error: "content required" });
      }

      void publishMemoryStatus(scope.userId, "update");
      res.json(result);
    } catch (err) {
      recordMemoryTelemetry("pipeline.error");
      res.status(500).json({ error: err.message });
    }
  });

  const listMemoriesHandler = async (req, res) => {
    try {
      const scope = await requireMemoryUser(req, res);
      if (!scope) return;

      const boundedLimit = toBoundedInt(req.query.limit, {
        fallback: 100,
        min: 1,
        max: MAX_PAGE_LIMIT,
      });
      const cursor = toBoundedString(req.query.cursor, { maxChars: 300 });
      const result = await getMemories(scope.userId, {
        limit: boundedLimit,
        cursor: cursor || null,
      });
      const memories = Array.isArray(result) ? result : result?.memories || [];
      const nextCursor = Array.isArray(result) ? null : result?.nextCursor || null;
      const hasMore = Array.isArray(result) ? false : Boolean(result?.hasMore);
      res.json({ memories, count: memories.length, nextCursor, hasMore });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
  app.get("/api/memory/list", listMemoriesHandler);
  app.get("/api/memory/list/:userId", listMemoriesHandler);

  app.get("/api/memory/activity", async (req, res) => {
    try {
      const scope = await requireMemoryUser(req, res);
      if (!scope) return;
      const limit = toBoundedInt(req.query.limit, {
        fallback: 8,
        min: 1,
        max: 50,
      });
      const activities = await getMemoryActivity(scope.userId, limit);
      res.json({ activities });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/memory/search", async (req, res) => {
    try {
      const scope = await requireMemoryUser(req, res);
      if (!scope) return;

      const { query, limit = 5 } = req.body || {};
      const normalizedQuery = toBoundedString(query, {
        maxChars: MAX_QUERY_CHARS,
      });
      if (!normalizedQuery) {
        return res.status(400).json({ error: "query required" });
      }
      const boundedLimit = toBoundedInt(limit, {
        fallback: 5,
        min: 1,
        max: 20,
      });
      const results = await searchMemories({
        userId: scope.userId,
        query: normalizedQuery,
        limit: boundedLimit,
      });
      res.json({ results });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/memory/:id", async (req, res) => {
    try {
      const scope = await requireMemoryUser(req, res);
      if (!scope) return;
      recordMemoryTelemetry("request.delete");
      if (!isValidUuid(req.params.id)) {
        return res.status(400).json({ error: "Invalid memory id." });
      }

      const success = await deleteMemory(req.params.id, scope.userId);
      if (success) {
        recordMemoryTelemetry("store.deleted");
      }
      void publishMemoryStatus(scope.userId, "delete");
      res.json({ deleted: success });
    } catch (err) {
      recordMemoryTelemetry("pipeline.error");
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================================================
  // Simplified normal-chat capture flow
  // ==========================================================================

  app.post("/api/memory/capture", async (req, res) => {
    try {
      const scope = await requireMemoryUser(req, res);
      if (!scope) return;
      recordMemoryTelemetry("request.capture");

      const { message, threadId } = req.body || {};
      const normalizedMessage = toBoundedString(message, {
        maxChars: MAX_MESSAGE_CHARS,
      });
      if (!normalizedMessage) {
        return res.status(400).json({ error: "message required" });
      }
      const normalizedThreadId = toBoundedString(threadId, {
        maxChars: MAX_THREAD_ID_CHARS,
      });

      const { capturePolicy } = await resolveMemoryCapturePolicy(scope.userId);
      const result = await processChatMemoryCapture({
        userId: scope.userId,
        message: normalizedMessage,
        threadId: normalizedThreadId || null,
        policy: capturePolicy,
      });

      recordMemoryTelemetry(
        "store.saved",
        Array.isArray(result?.saved) ? result.saved.length : 0
      );
      recordMemoryTelemetry(
        "queue.pending",
        Array.isArray(result?.review) ? result.review.length : 0
      );
      recordMemoryTelemetry(
        "store.duplicate",
        Array.isArray(result?.duplicates) ? result.duplicates.length : 0
      );
      recordMemoryTelemetry(
        "queue.conflict",
        Array.isArray(result?.conflicts) ? result.conflicts.length : 0
      );
      void publishMemoryStatus(scope.userId, "capture");
      res.json(result);
    } catch (err) {
      recordMemoryTelemetry("pipeline.error");
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================================================
  // Manual Mode: Confirmation Flow
  // ==========================================================================
  
  app.post("/api/memory/preview", async (req, res) => {
    try {
      const scope = await requireMemoryUser(req, res);
      if (!scope) return;
      recordMemoryTelemetry("request.preview");

      const { message, threadId } = req.body || {};
      const normalizedMessage = toBoundedString(message, {
        maxChars: MAX_MESSAGE_CHARS,
      });
      if (!normalizedMessage) {
        return res.status(400).json({ error: "message required" });
      }
      const normalizedThreadId = toBoundedString(threadId, {
        maxChars: MAX_THREAD_ID_CHARS,
      });
      
      // Extract facts
      const facts = sanitizeExtractedMemories(await extractFacts(normalizedMessage));
      recordMemoryTelemetry("extract.fact", facts.length);
      
      if (facts.length === 0) {
        void publishMemoryStatus(scope.userId, "preview_empty");
        return res.json({ pending: [], duplicates: [] });
      }
      
      const results = { pending: [], duplicates: [], conflicts: [] };
      
      for (const fact of facts) {
        const duplicate = await findDuplicateMemory({
          userId: scope.userId,
          content: fact.content,
          conflictKey: fact.conflictKey,
          polarity: fact.polarity,
        });
        if (duplicate) {
          results.duplicates.push({
            content: fact.content,
            type: fact.type,
          });
          continue;
        }
        
        const conflict = await findConflict({
          userId: scope.userId,
          content: fact.content,
          conflictKey: fact.conflictKey,
          polarity: fact.polarity,
        });
        if (conflict) {
          const { id } = await createConflict({
            userId: scope.userId,
            newContent: fact.content,
            newType: fact.type,
            newConfidenceScore: 0.8,
            sourceThreadId: normalizedThreadId || null,
            conflictMemory: conflict,
          });
          results.conflicts.push({
            id,
            content: fact.content,
            type: fact.type,
            conflictingContent: conflict.content,
            conflictingType: conflict.type,
          });
          continue;
        }

        // Stage for confirmation
        const staged = await stageMemory({
          userId: scope.userId,
          content: fact.content,
          type: fact.type,
          sourceThreadId: normalizedThreadId || null,
          confidenceScore: 0.8,
          conflictKey: fact.conflictKey,
          polarity: fact.polarity,
        });
        if (staged?.error || !staged?.id) {
          continue;
        }
        if (staged?.duplicate) {
          results.duplicates.push({
            content: fact.content,
            type: fact.type,
          });
          continue;
        }
        
        results.pending.push({
          id: staged.id,
          content: fact.content,
          type: fact.type,
          confirmationId: staged.id,
        });
      }
      recordMemoryTelemetry("queue.pending", results.pending.length);
      recordMemoryTelemetry("store.duplicate", results.duplicates.length);
      recordMemoryTelemetry("queue.conflict", results.conflicts.length);
      void publishMemoryStatus(scope.userId, "preview");
      res.json(results);
    } catch (err) {
      recordMemoryTelemetry("pipeline.error");
      res.status(500).json({ error: err.message });
    }
  });

  const getConfirmationsHandler = async (req, res) => {
    try {
      const scope = await requireMemoryUser(req, res);
      if (!scope) return;

      const confirmations = await getPendingConfirmations(
        scope.userId,
        toBoundedInt(req.query.limit, {
          fallback: 50,
          min: 1,
          max: MAX_PAGE_LIMIT,
        })
      );
      res.json({ confirmations });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
  app.get("/api/memory/confirmations", getConfirmationsHandler);
  app.get("/api/memory/confirmations/:userId", getConfirmationsHandler);

  app.post("/api/memory/confirmations/:id/confirm", async (req, res) => {
    try {
      const scope = await requireMemoryUser(req, res);
      if (!scope) return;
      if (!isValidUuid(req.params.id)) {
        return res.status(400).json({ error: "Invalid confirmation id." });
      }

      const result = await confirmMemory(req.params.id, scope.userId);
      
      if (result.error) {
        return res.status(404).json(result);
      }
      recordMemoryTelemetry("user.confirm");
      if (result?.memory?.duplicate) {
        recordMemoryTelemetry("store.duplicate");
      } else {
        recordMemoryTelemetry("store.saved");
      }
      void publishMemoryStatus(scope.userId, "confirm");
      res.json(result);
    } catch (err) {
      recordMemoryTelemetry("pipeline.error");
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/memory/confirmations/:id/reject", async (req, res) => {
    try {
      const scope = await requireMemoryUser(req, res);
      if (!scope) return;
      if (!isValidUuid(req.params.id)) {
        return res.status(400).json({ error: "Invalid confirmation id." });
      }

      const result = await rejectMemory(req.params.id, scope.userId);
      recordMemoryTelemetry("user.reject");
      void publishMemoryStatus(scope.userId, "reject");
      res.json(result);
    } catch (err) {
      recordMemoryTelemetry("pipeline.error");
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================================================
  // Conflicts: Always ask user
  // ==========================================================================

  const getConflictsHandler = async (req, res) => {
    try {
      const scope = await requireMemoryUser(req, res);
      if (!scope) return;

      const conflicts = await getConflicts(
        scope.userId,
        toBoundedInt(req.query.limit, {
          fallback: 50,
          min: 1,
          max: MAX_PAGE_LIMIT,
        })
      );
      const count = await getConflictCount(scope.userId);
      res.json({ conflicts, count });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
  app.get("/api/memory/conflicts", getConflictsHandler);
  app.get("/api/memory/conflicts/:userId", getConflictsHandler);

  const getStatusHandler = async (req, res) => {
    try {
      const scope = await requireMemoryUser(req, res);
      if (!scope) return;

      const [pending, conflicts] = await Promise.all([
        getPendingConfirmationCount(scope.userId),
        getConflictCount(scope.userId),
      ]);
      res.json({ pending, conflicts });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
  app.get("/api/memory/status", getStatusHandler);
  app.get("/api/memory/status/:userId", getStatusHandler);

  app.post("/api/memory/conflicts/:id/resolve", async (req, res) => {
    try {
      const scope = await requireMemoryUser(req, res);
      if (!scope) return;
      if (!isValidUuid(req.params.id)) {
        return res.status(400).json({ error: "Invalid conflict id." });
      }

      const { action } = req.body || {};
      if (!["keep_existing", "use_new"].includes(String(action || ""))) {
        return res
          .status(400)
          .json({ error: "action must be keep_existing or use_new" });
      }
      const result = await resolveConflict({
        userId: scope.userId,
        conflictId: req.params.id,
        action,
      });
      if (result.error) {
        return res.status(404).json(result);
      }
      recordMemoryTelemetry(
        action === "use_new" ? "user.resolve_use_new" : "user.resolve_keep_existing"
      );
      void publishMemoryStatus(scope.userId, "resolve");
      res.json(result);
    } catch (err) {
      recordMemoryTelemetry("pipeline.error");
      res.status(500).json({ error: err.message });
    }
  });

  // Context retrieval - POST
  app.post("/api/memory/context", async (req, res) => {
    try {
      const scope = await requireMemoryUser(req, res);
      if (!scope) return;

      const { query, maxChars = 2000 } = req.body || {};
      const normalizedQuery = toBoundedString(query, {
        maxChars: MAX_QUERY_CHARS,
      });
      const boundedMaxChars = toBoundedInt(maxChars, {
        fallback: 2000,
        min: 200,
        max: MAX_CONTEXT_CHARS,
      });
      const context = await buildContext({
        userId: scope.userId,
        query: normalizedQuery,
        maxChars: boundedMaxChars,
      });
      res.json(context);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Context retrieval - GET (convenience)
  const getContextHandler = async (req, res) => {
    try {
      const scope = await requireMemoryUser(req, res);
      if (!scope) return;

      const { q: query, max } = req.query;
      const maxChars = toBoundedInt(max, {
        fallback: 2000,
        min: 200,
        max: MAX_CONTEXT_CHARS,
      });
      const normalizedQuery = toBoundedString(query, {
        maxChars: MAX_QUERY_CHARS,
      });
      const context = await buildContext({ 
        userId: scope.userId,
        query: normalizedQuery, 
        maxChars 
      });
      res.json(context);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
  app.get("/api/memory/context", getContextHandler);
  app.get("/api/memory/context/:userId", getContextHandler);

  // Auto-Save with Undo window
  app.post("/api/memory/autosave", async (req, res) => {
    try {
      const scope = await requireMemoryUser(req, res);
      if (!scope) return;
      recordMemoryTelemetry("request.autosave");

      const { message, threadId } = req.body || {};
      const normalizedMessage = toBoundedString(message, {
        maxChars: MAX_MESSAGE_CHARS,
      });
      if (!normalizedMessage) {
        return res.status(400).json({ error: "message required" });
      }
      const normalizedThreadId = toBoundedString(threadId, {
        maxChars: MAX_THREAD_ID_CHARS,
      });
      
      const result = await autoSaveWithUndo({
        userId: scope.userId,
        message: normalizedMessage,
        threadId: normalizedThreadId || null,
      });
      recordMemoryTelemetry("store.saved", Array.isArray(result?.saved) ? result.saved.length : 0);
      recordMemoryTelemetry(
        "store.duplicate",
        Array.isArray(result?.duplicates) ? result.duplicates.length : 0
      );
      recordMemoryTelemetry(
        "queue.conflict",
        Array.isArray(result?.conflicts) ? result.conflicts.length : 0
      );
      void publishMemoryStatus(scope.userId, "autosave");
      res.json(result);
    } catch (err) {
      console.error("[AutoSave] Error:", err);
      recordMemoryTelemetry("pipeline.error");
      res.status(500).json({ error: err.message });
    }
  });

  // Undo memory within active window
  app.post("/api/memory/undo/:id", async (req, res) => {
    try {
      const scope = await requireMemoryUser(req, res);
      if (!scope) return;
      if (!isValidUuid(req.params.id)) {
        return res.status(400).json({ error: "Invalid memory id." });
      }

      const result = await undoMemory({ userId: scope.userId, memoryId: req.params.id });
      if (result?.success) {
        recordMemoryTelemetry("user.undo");
      }
      void publishMemoryStatus(scope.userId, "undo");
      res.json(result);
    } catch (err) {
      recordMemoryTelemetry("pipeline.error");
      res.status(500).json({ error: err.message });
    }
  });

  console.log("[Memory] Routes registered");
}
