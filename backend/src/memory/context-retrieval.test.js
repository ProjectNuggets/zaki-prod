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
    withDbTransaction: async (callback) =>
      callback({
        query: dbQueryMock,
      }),
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

  it("prefers preferences and active work over episodic recent details when reply usefulness is higher", async () => {
    const { rankContextCandidatesForTests } = await loadOperations();
    const ranked = rankContextCandidatesForTests([
      {
        id: "episodic",
        content: "Chatted about lunch yesterday",
        type: "event",
        metadata: {},
        retrieval_score: 0.92,
        importance_score: 0.4,
        confidence_score: 0.8,
      },
      {
        id: "preference",
        content: "Prefers concise answers",
        type: "preference",
        metadata: { conflictKey: "preference:concise-answers" },
        retrieval_score: 0.8,
        importance_score: 0.7,
        confidence_score: 0.9,
      },
      {
        id: "active",
        content: "Working on the summit launch deck",
        type: "goal",
        metadata: {},
        retrieval_score: 0.79,
        importance_score: 0.82,
        confidence_score: 0.88,
      },
    ]);

    expect(ranked.slice(0, 2).map((memory) => memory.id).sort()).toEqual([
      "active",
      "preference",
    ]);
    expect(ranked[2]?.id).toBe("episodic");
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

  it("buildFastContext returns the lexical match without any LLM relevance/rerank call", async () => {
    const { buildFastContext, setStorageSupportProbeForTests } = await loadOperations();
    setStorageSupportProbeForTests(async () => true);

    dbAllMock.mockResolvedValue([
      {
        id: "m-1",
        content: "Likes winter city breaks",
        type: "preference",
        metadata: { conflictKey: "preference:winter-city-break" },
        retrieval_score: 0.9,
        importance_score: 0.7,
        confidence_score: 0.9,
      },
    ]);
    dbGetMock.mockResolvedValue(null);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embeddings: [[0.1, 0.2, 0.3, 0.4]] }),
    });

    const result = await buildFastContext({
      userId: "user@example.com",
      query: "I want ideas based on my winter travel preferences",
      maxChars: 400,
      limit: 3,
    });

    expect(result.context).toContain("About this person:");
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]?.id).toBe("m-1");
    // The fast path performs only an embedding lookup; it must never make an
    // LLM chat-completion (relevance/rerank) call.
    const calledUrls = global.fetch.mock.calls.map(([url]) => String(url));
    expect(calledUrls.some((url) => url.includes("/chat/completions"))).toBe(false);
  });

  it("buildFastContext returns a semantic vector candidate that does not lexically match the query", async () => {
    const { buildFastContext, setStorageSupportProbeForTests } = await loadOperations();
    setStorageSupportProbeForTests(async () => true);

    // Keyword candidate pool: no memory overlaps the query lexically.
    const keywordPool = [
      {
        id: "m-keyword",
        content: "Owns a golden retriever",
        type: "fact",
        metadata: {},
        retrieval_score: 0,
        importance_score: 0.6,
        confidence_score: 0.8,
        created_at: "2026-02-28T22:23:20.000Z",
      },
    ];
    // Vector candidate: semantically related to the query but shares no tokens.
    const vectorRows = [
      {
        id: "m-vector",
        content: "Enjoys hiking in the mountains on weekends",
        type: "preference",
        metadata: { conflictKey: "preference:hiking" },
        retrieval_score: 0.91,
        importance_score: 0.7,
        confidence_score: 0.85,
        created_at: "2026-02-28T22:23:25.000Z",
      },
    ];

    dbAllMock
      .mockResolvedValueOnce(keywordPool)
      .mockResolvedValueOnce(vectorRows);
    dbGetMock.mockResolvedValue(null);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embeddings: [[0.1, 0.2, 0.3, 0.4]] }),
    });

    const result = await buildFastContext({
      userId: "user@example.com",
      query: "what are my outdoor plans this Saturday",
      maxChars: 400,
      limit: 3,
    });

    // The semantic-only candidate (no token overlap with the query) is surfaced
    // purely via the pgvector cosine source, not the keyword pool.
    expect(result.sources.map((source) => source.id)).toContain("m-vector");
    expect(result.context.toLowerCase()).toContain("hiking");
    // Embedding provider was actually consulted for the live path.
    expect(global.fetch).toHaveBeenCalled();
  });

  it("buildFastContext falls open to the keyword path when embedding generation throws", async () => {
    const { buildFastContext, setStorageSupportProbeForTests } = await loadOperations();
    setStorageSupportProbeForTests(async () => true);

    dbAllMock.mockResolvedValue([
      {
        id: "m-1",
        content: "Likes winter city breaks",
        type: "preference",
        metadata: { conflictKey: "preference:winter-city-break" },
        retrieval_score: 0,
        importance_score: 0.7,
        confidence_score: 0.9,
      },
    ]);
    dbGetMock.mockResolvedValue(null);
    global.fetch = jest.fn().mockRejectedValue(new Error("embedding provider down"));

    let result;
    await expect(
      (async () => {
        result = await buildFastContext({
          userId: "user@example.com",
          query: "I want ideas based on my winter travel preferences",
          maxChars: 400,
          limit: 3,
        });
      })()
    ).resolves.toBeUndefined();

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]?.id).toBe("m-1");
    expect(result.context).toContain("About this person:");
    // Embedding generation was attempted on the live path but failed; result is
    // still produced via the keyword path.
    expect(global.fetch).toHaveBeenCalled();
  });

  it("buildFastContext retrieves identity location for direct location questions", async () => {
    const { buildFastContext, setStorageSupportProbeForTests } = await loadOperations();
    setStorageSupportProbeForTests(async () => true);

    dbAllMock.mockResolvedValue([
      {
        id: "m-live",
        content: "Lives in Hamburg",
        type: "fact",
        metadata: { conflictKey: "identity:location" },
        retrieval_score: 0,
        importance_score: 0.8,
        confidence_score: 0.9,
      },
    ]);
    dbGetMock.mockResolvedValue(null);
    global.fetch = jest.fn();

    const result = await buildFastContext({
      userId: "user@example.com",
      query: "where do I live?",
      maxChars: 400,
      limit: 3,
    });

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]?.content).toBe("Lives in Hamburg");
    expect(result.context).toContain("Lives in Hamburg");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("buildFastContext retrieves origin facts for direct origin questions", async () => {
    const { buildFastContext, setStorageSupportProbeForTests } = await loadOperations();
    setStorageSupportProbeForTests(async () => true);

    dbAllMock.mockResolvedValue([
      {
        id: "m-from",
        content: "From Damascus",
        type: "fact",
        metadata: {},
        retrieval_score: 0,
        importance_score: 0.8,
        confidence_score: 0.9,
      },
      {
        id: "m-live",
        content: "Lives in Hamburg",
        type: "fact",
        metadata: { conflictKey: "identity:location" },
        retrieval_score: 0,
        importance_score: 0.8,
        confidence_score: 0.9,
      },
    ]);
    dbGetMock.mockResolvedValue(null);
    global.fetch = jest.fn();

    const result = await buildFastContext({
      userId: "user@example.com",
      query: "where am I from?",
      maxChars: 400,
      limit: 3,
    });

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]?.content).toBe("From Damascus");
    expect(result.context).toContain("From Damascus");
    expect(result.context).not.toContain("Lives in Hamburg");
  });

  it("buildFastContext prefers clean memory variants for introspection prompts", async () => {
    const { buildFastContext, setStorageSupportProbeForTests } = await loadOperations();
    setStorageSupportProbeForTests(async () => true);

    dbAllMock.mockResolvedValue([
      {
        id: "m-noisy",
        content: "Likes travel you know",
        type: "preference",
        metadata: { conflictKey: "preference:travelyouknow" },
        retrieval_score: 0,
        importance_score: 0.7,
        confidence_score: 0.8,
        created_at: "2026-02-28T22:23:30.779Z",
      },
      {
        id: "m-clean",
        content: "Likes travel",
        type: "preference",
        metadata: { conflictKey: "preference:travel" },
        retrieval_score: 0,
        importance_score: 0.7,
        confidence_score: 0.8,
        created_at: "2026-02-28T22:23:30.524Z",
      },
    ]);
    dbGetMock.mockResolvedValue(null);
    global.fetch = jest.fn();

    const result = await buildFastContext({
      userId: "user@example.com",
      query: "what do you know about me?",
      maxChars: 400,
      limit: 3,
    });

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]?.id).toBe("m-clean");
    expect(result.context).toContain("Likes travel");
    expect(result.context).not.toContain("Likes travel you know");
  });

  it("buildFastContext returns a diverse memory set for introspection prompts", async () => {
    const { buildFastContext, setStorageSupportProbeForTests } = await loadOperations();
    setStorageSupportProbeForTests(async () => true);

    dbAllMock.mockResolvedValue([
      {
        id: "m-goal-1",
        content: "Plans to travel to Ryadh",
        type: "goal",
        metadata: {},
        retrieval_score: 0,
        importance_score: 0.9,
        confidence_score: 0.8,
        created_at: "2026-02-28T22:23:30.779Z",
      },
      {
        id: "m-goal-2",
        content: "Plans to travel to Algeria",
        type: "goal",
        metadata: {},
        retrieval_score: 0,
        importance_score: 0.9,
        confidence_score: 0.8,
        created_at: "2026-02-28T22:23:29.779Z",
      },
      {
        id: "m-pref",
        content: "Likes travel",
        type: "preference",
        metadata: { conflictKey: "preference:travel" },
        retrieval_score: 0,
        importance_score: 0.7,
        confidence_score: 0.8,
        created_at: "2026-02-28T22:23:28.779Z",
      },
      {
        id: "m-live",
        content: "Lives in Hamburg",
        type: "fact",
        metadata: { conflictKey: "identity:location" },
        retrieval_score: 0,
        importance_score: 0.8,
        confidence_score: 0.9,
        created_at: "2026-02-28T22:23:27.779Z",
      },
    ]);
    dbGetMock.mockResolvedValue(null);
    global.fetch = jest.fn();

    const result = await buildFastContext({
      userId: "user@example.com",
      query: "what do you know about me?",
      maxChars: 500,
      limit: 3,
    });

    expect(result.sources).toHaveLength(3);
    expect(result.context).toContain("Lives in Hamburg");
    expect(result.context).toContain("Likes travel");
    expect(result.context).toContain("Plans to travel to Riyadh");
  });

  it("buildFastContext treats Arabic introspection prompts as introspection and includes identity memory", async () => {
    const { buildFastContext, setStorageSupportProbeForTests } = await loadOperations();
    setStorageSupportProbeForTests(async () => true);

    dbAllMock.mockResolvedValue([
      {
        id: "m-pref",
        content: "Likes travel to",
        type: "preference",
        metadata: { conflictKey: "preference:travelyouknow" },
        retrieval_score: 0,
        importance_score: 0.7,
        confidence_score: 0.8,
        created_at: "2026-02-28T22:23:28.779Z",
      },
      {
        id: "m-live",
        content: "Lives in hamburg",
        type: "fact",
        metadata: { conflictKey: "identity:location" },
        retrieval_score: 0,
        importance_score: 0.8,
        confidence_score: 0.9,
        created_at: "2026-02-28T22:23:27.779Z",
      },
      {
        id: "m-goal",
        content: "Plans to travel to Ryadh",
        type: "goal",
        metadata: {},
        retrieval_score: 0,
        importance_score: 0.9,
        confidence_score: 0.8,
        created_at: "2026-02-28T22:23:26.779Z",
      },
    ]);
    dbGetMock.mockResolvedValue(null);
    global.fetch = jest.fn();

    const result = await buildFastContext({
      userId: "user@example.com",
      query: "شو بتعرف عني؟",
      maxChars: 500,
      limit: 3,
    });

    expect(result.context).toContain("Lives in Hamburg");
    expect(result.context).toContain("Likes travel");
    expect(result.context).toContain("Plans to travel to Riyadh");
  });

  it("buildChatMemoryContext groups selected memories into stable buckets and recalls session-end entries", async () => {
    const { buildChatMemoryContext, setStorageSupportProbeForTests } = await loadOperations();
    setStorageSupportProbeForTests(async () => true);

    dbAllMock.mockResolvedValue([
      {
        id: "m-from",
        content: "From Damascus",
        type: "fact",
        metadata: { conflictKey: "identity:origin" },
        retrieval_score: 0.9,
        importance_score: 0.8,
        confidence_score: 0.9,
      },
      {
        id: "m-pref",
        content: "Prefers concise answers",
        type: "preference",
        metadata: { conflictKey: "preference:concise-answers" },
        retrieval_score: 0.88,
        importance_score: 0.8,
        confidence_score: 0.9,
      },
      {
        id: "m-active",
        content: "Preparing Lausanne Summit note",
        type: "goal",
        metadata: {},
        retrieval_score: 0.86,
        importance_score: 0.85,
        confidence_score: 0.9,
      },
      {
        id: "m-delta",
        content: "Last time: drafted a short recap.",
        type: "goal",
        metadata: { source: "session_end" },
        retrieval_score: 0.95,
        importance_score: 0.9,
        confidence_score: 0.8,
      },
    ]);
    dbGetMock.mockResolvedValue(null);
    global.fetch = jest.fn();

    const result = await buildChatMemoryContext({
      userId: "user@example.com",
      query: "Help me write my summit update",
      maxChars: 500,
      currentThreadId: "thread-new",
      limit: 6,
    });

    expect(result.context).toContain("Profile:");
    expect(result.context).toContain("Preferences:");
    expect(result.context).toContain("Active:");
    expect(result.context).toContain("From Damascus");
    expect(result.context).toContain("Prefers concise");
    expect(result.context).toContain("Preparing Lausanne Summit note");
    // Session-summary memories are now recalled like any other memory (the
    // exclusion that previously dropped source === "session_end" was removed).
    expect(result.context).toContain("Last time:");
    expect(result.sources.map((source) => source.id)).toEqual([
      "m-from",
      "m-pref",
      "m-active",
      "m-delta",
    ]);
  });

  it("buildChatMemoryContext recalls session-summary memories that match the query", async () => {
    const { buildChatMemoryContext, setStorageSupportProbeForTests } = await loadOperations();
    setStorageSupportProbeForTests(async () => true);

    dbAllMock.mockResolvedValue([
      {
        id: "m-summary",
        content: "Wrapped up the Lausanne Summit deck and shipped the recap.",
        type: "goal",
        metadata: { source: "session_end" },
        retrieval_score: 0.95,
        importance_score: 0.9,
        confidence_score: 0.85,
      },
    ]);
    dbGetMock.mockResolvedValue(null);
    global.fetch = jest.fn();

    const result = await buildChatMemoryContext({
      userId: "user@example.com",
      query: "Remind me where I left off on the Lausanne Summit deck",
      maxChars: 500,
      currentThreadId: "thread-new",
      limit: 6,
    });

    expect(result.sources.map((source) => source.id)).toContain("m-summary");
  });

  it("buildChatMemoryContext supports introspection summary mode with stable filtered sources", async () => {
    const { buildChatMemoryContext, setStorageSupportProbeForTests } = await loadOperations();
    setStorageSupportProbeForTests(async () => true);

    dbAllMock.mockResolvedValue([
      {
        id: "m-from",
        content: "From Damascus",
        type: "fact",
        metadata: { conflictKey: "identity:origin" },
        retrieval_score: 0,
        importance_score: 0.85,
        confidence_score: 0.95,
        created_at: "2026-02-28T22:23:30.779Z",
      },
      {
        id: "m-live",
        content: "Lives in Hamburg",
        type: "fact",
        metadata: { conflictKey: "identity:location" },
        retrieval_score: 0,
        importance_score: 0.82,
        confidence_score: 0.94,
        created_at: "2026-02-28T22:23:29.779Z",
      },
      {
        id: "m-pref",
        content: "Prefers concise answers",
        type: "preference",
        metadata: { conflictKey: "preference:concise-answers" },
        retrieval_score: 0,
        importance_score: 0.8,
        confidence_score: 0.9,
        created_at: "2026-02-28T22:23:28.779Z",
      },
      {
        id: "m-active",
        content: "Preparing Lausanne Summit note",
        type: "goal",
        metadata: {},
        retrieval_score: 0,
        importance_score: 0.88,
        confidence_score: 0.89,
        created_at: "2026-02-28T22:23:27.779Z",
      },
      {
        id: "m-session",
        content: "Last time: drafted a short recap.",
        type: "goal",
        metadata: { source: "session_end" },
        retrieval_score: 0,
        importance_score: 0.92,
        confidence_score: 0.85,
        created_at: "2026-02-28T22:23:26.779Z",
      },
    ]);
    dbGetMock.mockResolvedValue(null);
    global.fetch = jest.fn();

    const result = await buildChatMemoryContext({
      userId: "user@example.com",
      query: "what do you remember about me?",
      maxChars: 500,
      currentThreadId: "thread-new",
      limit: 2,
      mode: "introspection_summary",
    });

    expect(result.context).toContain("Profile:");
    expect(result.context).toContain("Preferences:");
    expect(result.context).toContain("Active:");
    // Session-summary memories are now recalled in introspection summaries too.
    expect(result.context).toContain("Last time:");
    expect(result.sources.map((source) => source.id)).toEqual(
      expect.arrayContaining(["m-from", "m-pref", "m-active"])
    );
    expect(result.sources.map((source) => source.id)).toContain("m-session");
    expect(result.sources.length).toBeGreaterThanOrEqual(3);
  });

  it("buildChatMemoryContext supports introspection fact mode with narrower source selection", async () => {
    const { buildChatMemoryContext, setStorageSupportProbeForTests } = await loadOperations();
    setStorageSupportProbeForTests(async () => true);

    dbAllMock.mockResolvedValue([
      {
        id: "m-from",
        content: "From Damascus",
        type: "fact",
        metadata: { conflictKey: "identity:origin" },
        retrieval_score: 0,
        importance_score: 0.85,
        confidence_score: 0.95,
        created_at: "2026-02-28T22:23:30.779Z",
      },
      {
        id: "m-live",
        content: "Lives in Hamburg",
        type: "fact",
        metadata: { conflictKey: "identity:location" },
        retrieval_score: 0,
        importance_score: 0.82,
        confidence_score: 0.94,
        created_at: "2026-02-28T22:23:29.779Z",
      },
      {
        id: "m-pref",
        content: "Prefers concise answers",
        type: "preference",
        metadata: { conflictKey: "preference:concise-answers" },
        retrieval_score: 0,
        importance_score: 0.8,
        confidence_score: 0.9,
        created_at: "2026-02-28T22:23:28.779Z",
      },
    ]);
    dbGetMock.mockResolvedValue(null);
    global.fetch = jest.fn();

    const result = await buildChatMemoryContext({
      userId: "user@example.com",
      query: "where am I from?",
      maxChars: 500,
      currentThreadId: "thread-new",
      limit: 4,
      mode: "introspection_fact",
    });

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]?.id).toBe("m-from");
    expect(result.context).toContain("Profile:");
    expect(result.context).toContain("From Damascus");
    expect(result.context).not.toContain("Prefers concise answers");
  });

  it("buildIdentityCore returns high-confidence facts only and excludes low-confidence", async () => {
    const { buildIdentityCore } = await loadOperations();

    dbAllMock.mockResolvedValue([
      {
        id: "m-live",
        content: "Lives in Riyadh",
        type: "fact",
        metadata: { conflictKey: "identity:location" },
        importance_score: 0.9,
        confidence_score: 0.92,
        created_at: "2026-02-28T22:23:30.779Z",
      },
      {
        id: "m-pref",
        content: "Prefers concise answers",
        type: "preference",
        metadata: { conflictKey: "preference:concise-answers" },
        importance_score: 0.8,
        confidence_score: 0.9,
        created_at: "2026-02-28T22:23:29.779Z",
      },
      {
        id: "m-jazz",
        content: "Maybe likes jazz",
        type: "preference",
        metadata: { conflictKey: "preference:jazz" },
        importance_score: 0.7,
        confidence_score: 0.4,
        created_at: "2026-02-28T22:23:28.779Z",
      },
    ]);
    dbGetMock.mockResolvedValue(null);
    global.fetch = jest.fn();

    const core = await buildIdentityCore({ userId: "user@example.com" });

    expect(typeof core).toBe("string");
    expect(core).toContain("Lives in Riyadh");
    expect(core).not.toContain("Maybe likes jazz");
    expect(core.length).toBeLessThanOrEqual(400);
  });

  it("buildChatMemoryContext returns a string core field", async () => {
    const { buildChatMemoryContext, setStorageSupportProbeForTests } = await loadOperations();
    setStorageSupportProbeForTests(async () => true);

    dbAllMock.mockResolvedValue([
      {
        id: "m-live",
        content: "Lives in Riyadh",
        type: "fact",
        metadata: { conflictKey: "identity:location" },
        retrieval_score: 0.9,
        importance_score: 0.9,
        confidence_score: 0.92,
        created_at: "2026-02-28T22:23:30.779Z",
      },
    ]);
    dbGetMock.mockResolvedValue(null);
    global.fetch = jest.fn();

    const result = await buildChatMemoryContext({
      userId: "user@example.com",
      query: "where do I live?",
      maxChars: 500,
      currentThreadId: "thread-new",
      limit: 6,
    });

    expect(typeof result.core).toBe("string");
  });

  it("buildChatMemoryContext returns empty context/sources/core when policy is off", async () => {
    const { buildChatMemoryContext, setStorageSupportProbeForTests } =
      await loadOperations();
    setStorageSupportProbeForTests(async () => true);

    // The preferences query carries policy "off" for this user.
    dbGetMock.mockImplementation(async (sql) => {
      if (/zaki_memory_preferences/.test(sql)) {
        return { policy: "off" };
      }
      return null;
    });
    dbAllMock.mockResolvedValue([
      {
        id: "m-live",
        content: "Lives in Riyadh",
        type: "fact",
        metadata: { conflictKey: "identity:location" },
        retrieval_score: 0.9,
        importance_score: 0.9,
        confidence_score: 0.92,
        created_at: "2026-02-28T22:23:30.779Z",
      },
    ]);
    global.fetch = jest.fn();

    const result = await buildChatMemoryContext({
      userId: "user@example.com",
      query: "where do I live?",
      limit: 6,
    });

    expect(result).toEqual({ context: "", sources: [], core: "" });
  });

  it("extractConflictKey distinguishes spoken languages for identity:language dedup (English)", async () => {
    const { findDuplicateMemory } = await loadOperations();

    // Both rows carry the identity:language conflict key (domain "identity").
    // The actual spoken-language VALUE ("arabic" vs "spanish") is derived from
    // content by extractConflictKey via the new "i speak ..." pattern. Without
    // that pattern both values collapse to the key suffix and the two distinct
    // languages would be wrongly treated as duplicates.
    dbGetMock.mockResolvedValue(null); // no exact content-hash match
    dbAllMock.mockResolvedValue([
      {
        id: "mem-lang-en",
        content: "I speak Arabic",
        type: "fact",
        metadata: { conflictKey: "identity:language" },
      },
    ]);

    const duplicate = await findDuplicateMemory({
      userId: "user@example.com",
      content: "I speak Spanish",
      conflictKey: "identity:language",
    });

    // Different spoken languages must NOT be deduped.
    expect(duplicate).toBeNull();
  });

  it("extractConflictKey treats the same spoken language as an identity:language duplicate (English)", async () => {
    const { findDuplicateMemory } = await loadOperations();

    dbGetMock.mockResolvedValue(null);
    dbAllMock.mockResolvedValue([
      {
        id: "mem-lang-en",
        content: "I speak Arabic",
        type: "fact",
        metadata: { conflictKey: "identity:language" },
      },
    ]);

    const duplicate = await findDuplicateMemory({
      userId: "user@example.com",
      content: "i speak arabic",
      conflictKey: "identity:language",
    });

    // Same spoken language (case-insensitive) is a duplicate.
    expect(duplicate).toEqual(
      expect.objectContaining({ id: "mem-lang-en" })
    );
  });

  it("extractConflictKey distinguishes spoken languages for identity:language dedup (Arabic)", async () => {
    const { findDuplicateMemory } = await loadOperations();

    dbGetMock.mockResolvedValue(null);
    dbAllMock.mockResolvedValue([
      {
        id: "mem-lang-ar",
        content: "أتحدث العربية",
        type: "fact",
        metadata: { conflictKey: "identity:language" },
      },
    ]);

    const duplicate = await findDuplicateMemory({
      userId: "user@example.com",
      content: "أتحدث الإنجليزية",
      conflictKey: "identity:language",
    });

    expect(duplicate).toBeNull();
  });
});
