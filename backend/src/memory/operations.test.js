import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import {
  checkStorage,
  getEmbeddings,
  refreshStorageSupportCache,
  setStorageSupportProbeForTests,
} from "./operations.js";

// ============================================================================
// pruneEpisodicMemories — DB mock suite
// ============================================================================

describe("pruneEpisodicMemories", () => {
  it("deletes episodic rows by TTL and caps to newest N, scoped to the user", async () => {
    const capturedCalls = [];
    const dbQueryMock = jest.fn(async (sql, params) => {
      capturedCalls.push({ sql, params });
      return { rowCount: 0, rows: [] };
    });

    jest.resetModules();
    jest.unstable_mockModule("../db.js", () => ({
      dbQuery: dbQueryMock,
      dbGet: jest.fn().mockResolvedValue(null),
      dbAll: jest.fn().mockResolvedValue([]),
      hasPgVector: jest.fn().mockResolvedValue(false),
      withDbTransaction: jest.fn(),
    }));

    const ops = await import("./operations.js");
    const result = await ops.pruneEpisodicMemories("user@example.com");

    expect(result).toEqual({ ok: true });
    expect(dbQueryMock).toHaveBeenCalledTimes(2);

    const sqls = capturedCalls.map((c) => c.sql.replace(/\s+/g, " ").trim());
    const params = capturedCalls.map((c) => c.params);

    // Both statements must target type = 'episodic'
    expect(sqls[0]).toMatch(/type\s*=\s*'episodic'/);
    expect(sqls[1]).toMatch(/type\s*=\s*'episodic'/);

    // Both statements must be scoped to the user
    expect(params[0]).toContain("user@example.com");
    expect(params[1]).toContain("user@example.com");

    // First statement: TTL-based delete (mentions created_at and interval)
    expect(sqls[0]).toMatch(/created_at/i);
    expect(sqls[0]).toMatch(/interval/i);

    // Second statement: cap/offset-based delete (mentions OFFSET)
    expect(sqls[1]).toMatch(/OFFSET/i);
  });

  it("returns {ok:false} and issues no queries when userId is empty", async () => {
    const dbQueryMock = jest.fn();
    jest.resetModules();
    jest.unstable_mockModule("../db.js", () => ({
      dbQuery: dbQueryMock,
      dbGet: jest.fn().mockResolvedValue(null),
      dbAll: jest.fn().mockResolvedValue([]),
      hasPgVector: jest.fn().mockResolvedValue(false),
      withDbTransaction: jest.fn(),
    }));

    const ops = await import("./operations.js");
    const result = await ops.pruneEpisodicMemories("");

    expect(result).toEqual({ ok: false });
    expect(dbQueryMock).not.toHaveBeenCalled();
  });
});

describe("memory operations external calls", () => {
  const originalBaseUrl = process.env.NOVA_TYP_BASE_URL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.NOVA_TYP_BASE_URL = "https://example.com";
    global.fetch = originalFetch;
    setStorageSupportProbeForTests(undefined);
  });

  afterEach(() => {
    process.env.NOVA_TYP_BASE_URL = originalBaseUrl;
    global.fetch = originalFetch;
    setStorageSupportProbeForTests(undefined);
  });

  it("returns embeddings on successful provider response", async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        embeddings: [[0.1, 0.2, 0.3]],
      }),
    });

    const result = await getEmbeddings("hello");
    expect(result.embeddings).toHaveLength(1);
    expect(result.provider).toBe("novatyp");
  });

  it("accepts openai-style embedding payloads", async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        object: "list",
        data: [{ embedding: [0.4, 0.5, 0.6] }],
      }),
    });

    const result = await getEmbeddings("hello");
    expect(result.embeddings).toEqual([[0.4, 0.5, 0.6]]);
    expect(result.dims).toBe(3);
  });

  it("throws a timeout error when embedding request aborts", async () => {
    global.fetch = async () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      throw error;
    };

    await expect(getEmbeddings("hello")).rejects.toThrow("timed out");
  });

  it("caches storage capability checks between calls", async () => {
    const spy = jest.fn().mockResolvedValue(true);
    setStorageSupportProbeForTests(spy);
    await refreshStorageSupportCache();
    await checkStorage();
    await checkStorage();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("normalizeStoredType keeps 'episodic' and still coerces unknowns to context", async () => {
    const { __normalizeStoredTypeForTest } = await import("./operations.js");
    expect(__normalizeStoredTypeForTest("episodic")).toBe("episodic");
    expect(__normalizeStoredTypeForTest("EPISODIC")).toBe("episodic");
    expect(__normalizeStoredTypeForTest("bogustype")).toBe("context");
    expect(__normalizeStoredTypeForTest("fact")).toBe("fact");
  });

  it("ranks an episodic row below a fact row at equal retrieval score", async () => {
    const { __rankContextCandidatesForTest } = await import("./operations.js");
    const now = new Date().toISOString();
    const fact = { type: "fact", retrieval_score: 0.5, importance_score: 0.5, confidence_score: 0.8, created_at: now };
    const epi = { type: "episodic", retrieval_score: 0.5, importance_score: 0.5, confidence_score: 0.8, created_at: now };
    const ranked = __rankContextCandidatesForTest([epi, fact]);
    expect(ranked[0].type).toBe("fact");
    expect(ranked[1].type).toBe("episodic");
  });

  it("getEmbeddings applies e5 query/passage prefixes only when the e5 flag is set", async () => {
    const prev = process.env.ZAKI_MEMORY_EMBED_MODEL;
    const prevBase = process.env.NOVA_TYP_BASE_URL;
    const realFetch = global.fetch;
    const calls = [];
    global.fetch = async (_url, opts) => {
      calls.push(JSON.parse(opts.body));
      return { ok: true, json: async () => ({ data: [{ embedding: [0, 0, 0] }] }) };
    };
    try {
      const { getEmbeddings } = await import("./operations.js");
      process.env.NOVA_TYP_BASE_URL = "https://example.com";

      process.env.ZAKI_MEMORY_EMBED_MODEL = "";
      await getEmbeddings("hello", { intent: "query" });
      expect(calls.at(-1).input).toEqual(["hello"]);

      process.env.ZAKI_MEMORY_EMBED_MODEL = "multilingual-e5-small";
      await getEmbeddings("hello", { intent: "query" });
      expect(calls.at(-1).input).toEqual(["query: hello"]);
      await getEmbeddings("hello", { intent: "passage" });
      expect(calls.at(-1).input).toEqual(["passage: hello"]);
    } finally {
      global.fetch = realFetch;
      if (prev === undefined) delete process.env.ZAKI_MEMORY_EMBED_MODEL; else process.env.ZAKI_MEMORY_EMBED_MODEL = prev;
      if (prevBase === undefined) delete process.env.NOVA_TYP_BASE_URL; else process.env.NOVA_TYP_BASE_URL = prevBase;
    }
  });
});
