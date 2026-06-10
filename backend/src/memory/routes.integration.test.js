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

  it("status route reports zero queues (review/conflict flow removed)", async () => {
    const app = createMockApp();
    createMemoryRoutes(app, { requireAuthUser: buildAuthedUser() });

    const res = await invokeRoute(app, {
      method: "GET",
      path: "/api/memory/status",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ pending: 0, conflicts: 0 });
  });

  it("passes scoped user and normalized message to autosave", async () => {
    const app = createMockApp();
    const autoSaveWithUndo = jest.fn(async () => ({
      saved: [{ id: VALID_UUID }],
      duplicates: [],
      superseded: [],
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
          superseded: false,
        },
      ],
      duplicates: [],
      superseded: [],
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
    expect(res.body?.superseded).toEqual([]);
  });

  it("roundtrips on/off memory preferences under authenticated scope", async () => {
    const app = createMockApp();
    const getMemoryPreferences = jest.fn(async () => ({
      policy: "balanced",
      source: "default",
    }));
    const setMemoryPreferences = jest.fn(async () => ({
      policy: "off",
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
      body: { policy: "off" },
    });

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body?.policy).toBe("balanced");
    expect(getMemoryPreferences).toHaveBeenCalledWith(OWNER_EMAIL);
    expect(patchRes.statusCode).toBe(200);
    expect(setMemoryPreferences).toHaveBeenCalledWith(OWNER_EMAIL, {
      policy: "off",
    });
    expect(patchRes.body?.policy).toBe("off");
  });

  it("normalizes retired policy ids to balanced on update", async () => {
    const app = createMockApp();
    const setMemoryPreferences = jest.fn(async (_userId, prefs) => ({
      policy: prefs.policy,
      source: "stored",
    }));

    createMemoryRoutes(app, {
      requireAuthUser: buildAuthedUser(),
      dependencies: { setMemoryPreferences },
    });

    const patchRes = await invokeRoute(app, {
      method: "PATCH",
      path: "/api/memory/preferences",
      body: { policy: "save_less" },
    });

    expect(patchRes.statusCode).toBe(200);
    expect(setMemoryPreferences).toHaveBeenCalledWith(OWNER_EMAIL, {
      policy: "balanced",
    });
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
});
