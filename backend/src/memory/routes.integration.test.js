import { describe, it, expect, jest } from "@jest/globals";
import { createMemoryRoutes } from "./routes.js";

const OWNER_EMAIL = "owner@example.com";
const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";

function createMockApp() {
  const routes = new Map();
  const register = (method) => (path, handler) => {
    routes.set(`${method} ${path}`, handler);
  };

  return {
    routes,
    get: register("GET"),
    post: register("POST"),
    patch: register("PATCH"),
    delete: register("DELETE"),
  };
}

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function invokeRoute(
  app,
  {
    method,
    path,
    params = {},
    query = {},
    body = {},
    headers = {},
  }
) {
  const handler = app.routes.get(`${method} ${path}`);
  if (!handler) {
    throw new Error(`Missing route handler: ${method} ${path}`);
  }
  const req = { method, path, params, query, body, headers };
  const res = createMockRes();
  await handler(req, res);
  return res;
}

function buildAuthedUser(email = OWNER_EMAIL) {
  return async () => ({
    email,
    zakiUser: { id: 1, email },
  });
}

describe("memory routes integration", () => {
  it("runs provider probes in health route when probe flag is enabled", async () => {
    const app = createMockApp();
    const checkStorage = jest.fn(async () => true);
    const probeMemoryExtractionProvider = jest.fn(async () => ({
      ok: true,
      transport: "workspace_chat",
      extracted: 1,
    }));
    const probeEmbeddingsProvider = jest.fn(async () => ({
      ok: true,
      provider: "novatyp",
      dims: 384,
      vectors: 1,
    }));

    createMemoryRoutes(app, {
      requireAuthUser: buildAuthedUser(),
      dependencies: {
        checkStorage,
        probeMemoryExtractionProvider,
        probeEmbeddingsProvider,
      },
    });

    const res = await invokeRoute(app, {
      method: "GET",
      path: "/api/memory/health",
      query: { probe: "1" },
    });

    expect(res.statusCode).toBe(200);
    expect(checkStorage).toHaveBeenCalledTimes(1);
    expect(probeMemoryExtractionProvider).toHaveBeenCalledTimes(1);
    expect(probeEmbeddingsProvider).toHaveBeenCalledTimes(1);
    expect(res.body?.provider?.extraction?.transport).toBe("workspace_chat");
    expect(res.body?.provider?.embeddings?.dims).toBe(384);
  });

  it("stages preview memories under authenticated scope", async () => {
    const app = createMockApp();
    const extractFacts = jest.fn(async () => [
      {
        content: "Likes blue",
        type: "preference",
        conflictKey: "preference:blue",
        polarity: "positive",
      },
    ]);
    const findDuplicateMemory = jest.fn(async () => null);
    const findConflict = jest.fn(async () => null);
    const stageMemory = jest.fn(async () => ({ id: VALID_UUID, status: "pending" }));

    createMemoryRoutes(app, {
      requireAuthUser: buildAuthedUser(),
      dependencies: {
        extractFacts,
        findDuplicateMemory,
        findConflict,
        stageMemory,
      },
    });

    const res = await invokeRoute(app, {
      method: "POST",
      path: "/api/memory/preview",
      body: {
        message: "I like blue",
        userId: OWNER_EMAIL,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(stageMemory).toHaveBeenCalledTimes(1);
    expect(stageMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: OWNER_EMAIL,
        content: "Likes blue",
        type: "preference",
      })
    );
    expect(res.body?.pending).toHaveLength(1);
    expect(res.body?.duplicates).toEqual([]);
    expect(res.body?.conflicts).toEqual([]);
  });

  it("drops invalid extracted memories before staging preview results", async () => {
    const app = createMockApp();
    const extractFacts = jest.fn(async () => [
      {
        content: "Likes all of those cities",
        type: "preference",
        conflictKey: "preference:allofthosecity",
        polarity: "positive",
      },
      {
        content: "Plans to travel to Dubai",
        type: "goal",
        polarity: "neutral",
      },
      {
        content: "",
        type: "fact",
      },
    ]);
    const findDuplicateMemory = jest.fn(async () => null);
    const findConflict = jest.fn(async () => null);
    const stageMemory = jest.fn(async () => ({ id: VALID_UUID, status: "pending" }));

    createMemoryRoutes(app, {
      requireAuthUser: buildAuthedUser(),
      dependencies: {
        extractFacts,
        findDuplicateMemory,
        findConflict,
        stageMemory,
      },
    });

    const res = await invokeRoute(app, {
      method: "POST",
      path: "/api/memory/preview",
      body: {
        message: "I love all of those cities and plan to travel to Dubai",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(stageMemory).toHaveBeenCalledTimes(1);
    expect(stageMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Plans to travel to Dubai",
        type: "goal",
      })
    );
    expect(res.body?.pending).toHaveLength(1);
    expect(res.body?.pending[0]?.content).toBe("Plans to travel to Dubai");
  });

  it("blocks cross-tenant scoped requests on legacy path", async () => {
    const app = createMockApp();
    const getMemories = jest.fn(async () => []);

    createMemoryRoutes(app, {
      requireAuthUser: buildAuthedUser(),
      dependencies: { getMemories },
    });

    const res = await invokeRoute(app, {
      method: "GET",
      path: "/api/memory/list/:userId",
      params: { userId: "other@example.com" },
    });

    expect(res.statusCode).toBe(403);
    expect(getMemories).not.toHaveBeenCalled();
  });

  it("rejects invalid conflict actions before resolution", async () => {
    const app = createMockApp();
    const resolveConflict = jest.fn(async () => ({ success: true }));

    createMemoryRoutes(app, {
      requireAuthUser: buildAuthedUser(),
      dependencies: { resolveConflict },
    });

    const res = await invokeRoute(app, {
      method: "POST",
      path: "/api/memory/conflicts/:id/resolve",
      params: { id: VALID_UUID },
      body: { action: "invalid_choice" },
    });

    expect(res.statusCode).toBe(400);
    expect(String(res.body?.error || "")).toContain("keep_existing");
    expect(resolveConflict).not.toHaveBeenCalled();
  });

  it("passes scoped user and normalized message to autosave", async () => {
    const app = createMockApp();
    const autoSaveWithUndo = jest.fn(async () => ({
      saved: [{ id: VALID_UUID }],
      duplicates: [],
    }));

    createMemoryRoutes(app, {
      requireAuthUser: buildAuthedUser(),
      dependencies: { autoSaveWithUndo },
    });

    const res = await invokeRoute(app, {
      method: "POST",
      path: "/api/memory/autosave",
      body: {
        message: "  I   like   blue  ",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(autoSaveWithUndo).toHaveBeenCalledTimes(1);
    expect(autoSaveWithUndo).toHaveBeenCalledWith({
      userId: OWNER_EMAIL,
      message: "I like blue",
      threadId: null,
    });
  });

  it("uses the simplified capture route for normal chat memory ingestion", async () => {
    const app = createMockApp();
    const processChatMemoryCapture = jest.fn(async () => ({
      saved: [
        {
          id: VALID_UUID,
          content: "Prefers concise answers",
          type: "preference",
          state: "saved_reversible",
          undoUntil: "2026-03-13T12:34:56.000Z",
        },
      ],
      review: [],
      duplicates: [],
      conflicts: [],
      skipped: [],
    }));

    createMemoryRoutes(app, {
      requireAuthUser: buildAuthedUser(),
      dependencies: {
        processChatMemoryCapture,
        resolveMemoryCapturePolicy: jest.fn(async () => ({
          policy: "balanced",
          source: "stored",
          capturePolicy: { id: "balanced" },
        })),
      },
    });

    const res = await invokeRoute(app, {
      method: "POST",
      path: "/api/memory/capture",
      body: {
        message: "  I prefer concise answers  ",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(processChatMemoryCapture).toHaveBeenCalledWith({
      userId: OWNER_EMAIL,
      message: "I prefer concise answers",
      threadId: null,
      policy: { id: "balanced" },
    });
    expect(res.body?.saved).toHaveLength(1);
    expect(res.body?.review).toEqual([]);
  });

  it("roundtrips memory preferences under authenticated scope", async () => {
    const app = createMockApp();
    const getMemoryPreferences = jest.fn(async () => ({
      policy: "balanced",
      source: "default",
    }));
    const setMemoryPreferences = jest.fn(async () => ({
      policy: "save_less",
      source: "stored",
    }));

    createMemoryRoutes(app, {
      requireAuthUser: buildAuthedUser(),
      dependencies: { getMemoryPreferences, setMemoryPreferences },
    });

    const getRes = await invokeRoute(app, {
      method: "GET",
      path: "/api/memory/preferences",
    });
    const patchRes = await invokeRoute(app, {
      method: "PATCH",
      path: "/api/memory/preferences",
      body: { policy: "save_less" },
    });

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body?.policy).toBe("balanced");
    expect(getMemoryPreferences).toHaveBeenCalledWith(OWNER_EMAIL);
    expect(patchRes.statusCode).toBe(200);
    expect(setMemoryPreferences).toHaveBeenCalledWith(OWNER_EMAIL, {
      policy: "save_less",
    });
    expect(patchRes.body?.policy).toBe("save_less");
  });

  it("updates an existing memory record with scoped ownership", async () => {
    const app = createMockApp();
    const updateMemory = jest.fn(async () => ({
      memory: {
        id: VALID_UUID,
        content: "Prefers concise weekly plans",
        type: "preference",
        status: "outdated",
      },
    }));

    createMemoryRoutes(app, {
      requireAuthUser: buildAuthedUser(),
      dependencies: { updateMemory },
    });

    const res = await invokeRoute(app, {
      method: "PATCH",
      path: "/api/memory/:id",
      params: { id: VALID_UUID },
      body: {
        content: "Prefers concise weekly plans",
        type: "preference",
        status: "outdated",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(updateMemory).toHaveBeenCalledWith({
      id: VALID_UUID,
      userId: OWNER_EMAIL,
      content: "Prefers concise weekly plans",
      type: "preference",
      status: "outdated",
    });
    expect(res.body?.memory?.status).toBe("outdated");
  });

  it("returns recent activity under authenticated scope", async () => {
    const app = createMockApp();
    const getMemoryActivity = jest.fn(async () => [
      {
        id: VALID_UUID,
        kind: "saved",
        content: "Prefers concise answers",
        type: "preference",
        threadId: "thread-1",
        occurredAt: "2026-03-23T10:00:00.000Z",
      },
    ]);

    createMemoryRoutes(app, {
      requireAuthUser: buildAuthedUser(),
      dependencies: { getMemoryActivity },
    });

    const res = await invokeRoute(app, {
      method: "GET",
      path: "/api/memory/activity",
      query: { limit: "9" },
    });

    expect(res.statusCode).toBe(200);
    expect(getMemoryActivity).toHaveBeenCalledWith(OWNER_EMAIL, 9);
    expect(res.body?.activities).toHaveLength(1);
    expect(res.body?.activities?.[0]?.kind).toBe("saved");
  });

  it("clamps confirmations limit and keeps user scoped", async () => {
    const app = createMockApp();
    const getPendingConfirmations = jest.fn(async () => []);

    createMemoryRoutes(app, {
      requireAuthUser: buildAuthedUser(),
      dependencies: { getPendingConfirmations },
    });

    const res = await invokeRoute(app, {
      method: "GET",
      path: "/api/memory/confirmations",
      query: { limit: "999" },
    });

    expect(res.statusCode).toBe(200);
    expect(getPendingConfirmations).toHaveBeenCalledWith(OWNER_EMAIL, 100);
  });

  it("supports paginated memory list responses", async () => {
    const app = createMockApp();
    const getMemories = jest.fn(async () => ({
      memories: [{ id: VALID_UUID, content: "Likes blue", type: "preference" }],
      nextCursor: "cursor-2",
      hasMore: true,
    }));

    createMemoryRoutes(app, {
      requireAuthUser: buildAuthedUser(),
      dependencies: { getMemories },
    });

    const res = await invokeRoute(app, {
      method: "GET",
      path: "/api/memory/list",
      query: { limit: "999", cursor: "cursor-1" },
    });

    expect(res.statusCode).toBe(200);
    expect(getMemories).toHaveBeenCalledWith(
      OWNER_EMAIL,
      expect.objectContaining({ limit: 100, cursor: "cursor-1" })
    );
    expect(res.body?.memories).toHaveLength(1);
    expect(res.body?.nextCursor).toBe("cursor-2");
    expect(res.body?.hasMore).toBe(true);
  });

  it("supports full manual memory journey from capture to conflict resolution", async () => {
    const app = createMockApp();
    const pending = [];
    const stored = [];
    const conflicts = [];
    const uuidPool = [
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
      "00000000-0000-4000-8000-000000000003",
      "00000000-0000-4000-8000-000000000004",
    ];
    let idIndex = 0;
    const nextId = () => uuidPool[idIndex++] || VALID_UUID;

    const extractFacts = jest.fn(async (message) => {
      if (String(message).toLowerCase().includes("don't like blue")) {
        return [
          {
            content: "Dislikes blue",
            type: "preference",
            conflictKey: "preference:blue",
            polarity: "negative",
          },
        ];
      }
      if (String(message).toLowerCase().includes("like blue")) {
        return [
          {
            content: "Likes blue",
            type: "preference",
            conflictKey: "preference:blue",
            polarity: "positive",
          },
        ];
      }
      return [];
    });

    const findDuplicateMemory = jest.fn(async () => null);

    const findConflict = jest.fn(async ({ conflictKey, polarity }) => {
      const incomingPolarity = polarity === "negative" ? "negative" : "positive";
      const existing = stored.find(
        (memory) =>
          memory.metadata?.conflictKey === conflictKey &&
          memory.metadata?.polarity &&
          memory.metadata.polarity !== incomingPolarity
      );
      if (!existing) return null;
      return {
        memoryId: existing.id,
        content: existing.content,
        type: existing.type,
      };
    });

    const stageMemory = jest.fn(async ({ content, type, conflictKey, polarity }) => {
      const id = nextId();
      pending.push({ id, userId: OWNER_EMAIL, content, type, conflictKey, polarity });
      return { id, status: "pending" };
    });

    const getPendingConfirmations = jest.fn(async () =>
      pending.map((item) => ({
        id: item.id,
        content: item.content,
        type: item.type,
      }))
    );

    const confirmMemory = jest.fn(async (confirmationId, userId) => {
      const index = pending.findIndex(
        (item) => item.id === confirmationId && item.userId === userId
      );
      if (index < 0) return { error: "Not found" };
      const [confirmed] = pending.splice(index, 1);
      const memory = {
        id: nextId(),
        userId,
        content: confirmed.content,
        type: confirmed.type,
        metadata: {
          conflictKey: confirmed.conflictKey,
          polarity: confirmed.polarity,
        },
      };
      stored.push(memory);
      return { success: true, memory: { id: memory.id, duplicate: false } };
    });

    const getMemories = jest.fn(async (userId) =>
      stored
        .filter((item) => item.userId === userId)
        .map((item) => ({ id: item.id, content: item.content, type: item.type }))
    );

    const createConflict = jest.fn(async ({ newContent, newType, conflictMemory }) => {
      const id = nextId();
      conflicts.push({
        id,
        userId: OWNER_EMAIL,
        newContent,
        newType,
        conflictingMemoryId: conflictMemory?.memoryId || null,
        status: "pending",
      });
      return { id };
    });

    const getConflicts = jest.fn(async (userId) =>
      conflicts
        .filter((item) => item.userId === userId && item.status === "pending")
        .map((item) => ({
          id: item.id,
          new_content: item.newContent,
          new_type: item.newType,
          conflicting_memory_id: item.conflictingMemoryId,
        }))
    );

    const getConflictCount = jest.fn(async (userId) =>
      conflicts.filter((item) => item.userId === userId && item.status === "pending").length
    );

    const resolveConflict = jest.fn(async ({ userId, conflictId, action }) => {
      const conflict = conflicts.find(
        (item) => item.id === conflictId && item.userId === userId && item.status === "pending"
      );
      if (!conflict) return { error: "Not found" };
      if (action === "use_new") {
        if (conflict.conflictingMemoryId) {
          const index = stored.findIndex((item) => item.id === conflict.conflictingMemoryId);
          if (index >= 0) stored.splice(index, 1);
        }
        stored.push({
          id: nextId(),
          userId,
          content: conflict.newContent,
          type: conflict.newType,
          metadata: { conflictKey: "preference:blue", polarity: "negative" },
        });
      }
      conflict.status = "resolved";
      return { success: true, resolution: action };
    });

    createMemoryRoutes(app, {
      requireAuthUser: buildAuthedUser(),
      dependencies: {
        extractFacts,
        findDuplicateMemory,
        findConflict,
        stageMemory,
        getPendingConfirmations,
        confirmMemory,
        getMemories,
        createConflict,
        getConflicts,
        getConflictCount,
        resolveConflict,
      },
    });

    const previewPositive = await invokeRoute(app, {
      method: "POST",
      path: "/api/memory/preview",
      body: { message: "I like blue" },
    });
    expect(previewPositive.statusCode).toBe(200);
    expect(previewPositive.body?.pending).toHaveLength(1);

    const listPending = await invokeRoute(app, {
      method: "GET",
      path: "/api/memory/confirmations",
    });
    expect(listPending.statusCode).toBe(200);
    expect(listPending.body?.confirmations).toHaveLength(1);

    const pendingId = String(listPending.body?.confirmations?.[0]?.id || "");
    expect(pendingId).toBeTruthy();

    const confirmPending = await invokeRoute(app, {
      method: "POST",
      path: "/api/memory/confirmations/:id/confirm",
      params: { id: pendingId },
    });
    expect(confirmPending.statusCode).toBe(200);
    expect(confirmPending.body?.success).toBe(true);

    const listMemoriesAfterConfirm = await invokeRoute(app, {
      method: "GET",
      path: "/api/memory/list",
    });
    expect(listMemoriesAfterConfirm.statusCode).toBe(200);
    expect(listMemoriesAfterConfirm.body?.memories?.some((m) => m.content === "Likes blue")).toBe(
      true
    );

    const previewNegative = await invokeRoute(app, {
      method: "POST",
      path: "/api/memory/preview",
      body: { message: "I don't like blue" },
    });
    expect(previewNegative.statusCode).toBe(200);
    expect(previewNegative.body?.conflicts).toHaveLength(1);

    const listConflicts = await invokeRoute(app, {
      method: "GET",
      path: "/api/memory/conflicts",
    });
    expect(listConflicts.statusCode).toBe(200);
    expect(listConflicts.body?.count).toBe(1);

    const conflictId = String(listConflicts.body?.conflicts?.[0]?.id || "");
    expect(conflictId).toBeTruthy();

    const resolve = await invokeRoute(app, {
      method: "POST",
      path: "/api/memory/conflicts/:id/resolve",
      params: { id: conflictId },
      body: { action: "use_new" },
    });
    expect(resolve.statusCode).toBe(200);
    expect(resolve.body?.success).toBe(true);

    const listConflictsAfterResolve = await invokeRoute(app, {
      method: "GET",
      path: "/api/memory/conflicts",
    });
    expect(listConflictsAfterResolve.statusCode).toBe(200);
    expect(listConflictsAfterResolve.body?.count).toBe(0);

    const listMemoriesAfterResolve = await invokeRoute(app, {
      method: "GET",
      path: "/api/memory/list",
    });
    expect(listMemoriesAfterResolve.statusCode).toBe(200);
    expect(
      listMemoriesAfterResolve.body?.memories?.some((m) => m.content === "Dislikes blue")
    ).toBe(true);
    expect(
      listMemoriesAfterResolve.body?.memories?.some((m) => m.content === "Likes blue")
    ).toBe(false);
  });
});
