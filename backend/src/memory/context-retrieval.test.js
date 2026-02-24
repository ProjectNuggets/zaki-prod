import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

const dbAllMock = jest.fn();
const dbGetMock = jest.fn();
const dbQueryMock = jest.fn();
const hasPgVectorMock = jest.fn();

async function loadOperations() {
  jest.resetModules();
  jest.unstable_mockModule("../db.js", () => ({
    dbAll: dbAllMock,
    dbGet: dbGetMock,
    dbQuery: dbQueryMock,
    hasPgVector: hasPgVectorMock,
  }));
  return await import("./operations.js");
}

describe("memory context retrieval behavior", () => {
  const originalFetch = global.fetch;
  const originalBaseUrl = process.env.NOVA_TYP_BASE_URL;
  const originalApiKey = process.env.NOVA_TYP_API_KEY;

  beforeEach(() => {
    dbAllMock.mockReset();
    dbGetMock.mockReset();
    dbQueryMock.mockReset();
    hasPgVectorMock.mockReset();
    hasPgVectorMock.mockResolvedValue(false);
    process.env.NOVA_TYP_BASE_URL = "https://example.com";
    process.env.NOVA_TYP_API_KEY = "test-key";
    global.fetch = originalFetch;
  });

  afterEach(() => {
    process.env.NOVA_TYP_BASE_URL = originalBaseUrl;
    process.env.NOVA_TYP_API_KEY = originalApiKey;
    global.fetch = originalFetch;
  });

  it("falls back to top actionable memories when relevance returns none", async () => {
    const {
      buildContext,
      setStorageSupportProbeForTests,
      selectPersonalizationFallbackMemoriesForTests,
    } = await loadOperations();
    setStorageSupportProbeForTests(async () => false);

    const candidates = [
      {
        id: "m-generic",
        content: "Lives in Dubai",
        type: "fact",
        metadata: {},
        retrieval_score: 0.95,
        importance_score: 0.8,
        confidence_score: 0.95,
      },
      {
        id: "m-goal",
        content: "Wants to pass the PMP exam",
        type: "goal",
        metadata: {},
        retrieval_score: 0.78,
        importance_score: 0.75,
        confidence_score: 0.85,
      },
      {
        id: "m-constraint",
        content: "Avoids peanuts",
        type: "preference",
        metadata: { conflictKey: "constraint:peanuts" },
        retrieval_score: 0.72,
        importance_score: 0.7,
        confidence_score: 0.9,
      },
    ];

    dbAllMock.mockResolvedValue(candidates);
    dbGetMock.mockResolvedValue(null);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "{\"relevant_ids\":[]}" } }],
      }),
    });

    const result = await buildContext({
      userId: "user@example.com",
      query: "What should I eat today?",
      maxChars: 400,
    });

    const expectedFallback = selectPersonalizationFallbackMemoriesForTests(candidates, 2);
    expect(result.context).toContain("About this person:");
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources.length).toBeLessThanOrEqual(2);
    expect(result.sources.map((source) => source.id)).toEqual(
      expectedFallback.map((source) => source.id)
    );
  });

  it("ranks actionable memories above generic ones when base scores are equal", async () => {
    const { rankContextCandidatesForTests } = await loadOperations();
    const ranked = rankContextCandidatesForTests([
      {
        id: "generic",
        content: "Lives in city center",
        type: "fact",
        metadata: {},
        retrieval_score: 0.8,
        importance_score: 0.7,
        confidence_score: 0.85,
      },
      {
        id: "actionable",
        content: "Avoids gluten",
        type: "preference",
        metadata: { conflictKey: "constraint:gluten" },
        retrieval_score: 0.8,
        importance_score: 0.7,
        confidence_score: 0.85,
      },
    ]);

    expect(ranked[0]?.id).toBe("actionable");
  });

  it("injects one short session-end delta memory at thread start, once per thread", async () => {
    const { buildContext, setStorageSupportProbeForTests, resetSessionDeltaInjectionCacheForTests } =
      await loadOperations();
    setStorageSupportProbeForTests(async () => false);
    resetSessionDeltaInjectionCacheForTests();

    const regularMemory = {
      id: "m-1",
      content: "Likes concise answers",
      type: "preference",
      metadata: { conflictKey: "preference:concise-answers" },
      retrieval_score: 0.91,
      importance_score: 0.74,
      confidence_score: 0.88,
      created_at: "2026-02-23T00:00:00.000Z",
    };

    dbAllMock.mockResolvedValue([regularMemory]);
    dbGetMock.mockResolvedValue({
      id: "delta-1",
      content: "Preparing for a data interview and practicing SQL daily.",
      type: "goal",
      metadata: { source: "session_end" },
      source_thread_id: "thread-old",
      importance_score: 0.9,
      confidence_score: 0.8,
      created_at: "2026-02-22T22:00:00.000Z",
    });

    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "{\"relevant_ids\":[\"m-1\"]}" } }],
        }),
      });

    const first = await buildContext({
      userId: "user@example.com",
      query: "Can you help me continue?",
      currentThreadId: "thread-new",
      maxChars: 400,
    });

    const second = await buildContext({
      userId: "user@example.com",
      query: "Any tips for today?",
      currentThreadId: "thread-new",
      maxChars: 400,
    });

    expect(first.context).toContain("Last time:");
    expect(first.sources[0]?.id).toBe("delta-1");
    expect(second.context).not.toContain("Last time:");
    expect(dbGetMock).toHaveBeenCalledTimes(1);
  });
});
