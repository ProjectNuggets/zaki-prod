import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import {
  checkStorage,
  getEmbeddings,
  refreshStorageSupportCache,
  setStorageSupportProbeForTests,
} from "./operations.js";

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
});
