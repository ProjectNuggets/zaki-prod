import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { extractFacts, sanitizeExtractedMemories } from "./memory-extraction.js";

describe("memory extraction", () => {
  const originalBaseUrl = process.env.NOVA_TYP_BASE_URL;
  const originalWorkspaceSlug = process.env.ZAKI_DEFAULT_WORKSPACE_SLUG;
  const originalMemoryWorkspaceSlug = process.env.ZAKI_MEMORY_WORKSPACE_SLUG;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.NOVA_TYP_BASE_URL = "";
    process.env.ZAKI_DEFAULT_WORKSPACE_SLUG = "zaky";
    delete process.env.ZAKI_MEMORY_WORKSPACE_SLUG;
    global.fetch = originalFetch;
  });

  afterEach(() => {
    process.env.NOVA_TYP_BASE_URL = originalBaseUrl;
    process.env.ZAKI_DEFAULT_WORKSPACE_SLUG = originalWorkspaceSlug;
    if (originalMemoryWorkspaceSlug === undefined) {
      delete process.env.ZAKI_MEMORY_WORKSPACE_SLUG;
    } else {
      process.env.ZAKI_MEMORY_WORKSPACE_SLUG = originalMemoryWorkspaceSlug;
    }
    global.fetch = originalFetch;
  });

  it("extracts repeated like statements as separate preferences", async () => {
    const result = await extractFacts("I like georgin and I like blue.");
    expect(result.map((item) => item.content)).toEqual(
      expect.arrayContaining(["Likes georgin", "Likes blue"])
    );
  });

  it("normalizes malformed preference phrasing from LLM output", async () => {
    process.env.NOVA_TYP_BASE_URL = "https://example.com";
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                classification: "user_statement",
                memories: [
                  {
                    content: "like to orange",
                    type: "preference",
                    confidence: 0.9,
                  },
                ],
              }),
            },
          },
        ],
      }),
    });

    const result = await extractFacts("I like oranges.");
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("Likes orange");
    expect(result[0].conflictKey).toBe("preference:orange");
    expect(result[0].polarity).toBe("positive");
  });

  it("normalizes prefer phrasing without leaking the raw verb into content", async () => {
    process.env.NOVA_TYP_BASE_URL = "https://example.com";
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                classification: "user_statement",
                memories: [
                  {
                    content: "Prefers concise replies",
                    type: "preference",
                    confidence: 0.9,
                  },
                ],
              }),
            },
          },
        ],
      }),
    });

    const result = await extractFacts("I prefer concise replies.");
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("Prefers concise replies");
    expect(result[0].conflictKey).toBe("preference:concise-reply");
    expect(result[0].polarity).toBe("positive");
  });

  it("normalizes nested malformed prefer phrasing from LLM output", async () => {
    process.env.NOVA_TYP_BASE_URL = "https://example.com";
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                classification: "user_statement",
                memories: [
                  {
                    content: "Likes Prefers concise replies",
                    type: "preference",
                    confidence: 0.9,
                  },
                ],
              }),
            },
          },
        ],
      }),
    });

    const result = await extractFacts("I prefer concise replies.");
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("Prefers concise replies");
    expect(result[0].conflictKey).toBe("preference:concise-reply");
    expect(result[0].polarity).toBe("positive");
  });

  it("strips conversational filler from preference memories", async () => {
    process.env.NOVA_TYP_BASE_URL = "https://example.com";
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                classification: "user_statement",
                memories: [
                  {
                    content: "Likes travel you know",
                    type: "preference",
                    confidence: 0.9,
                  },
                ],
              }),
            },
          },
        ],
      }),
    });

    const result = await extractFacts("I like travel, you know.");
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("Likes travel");
    expect(result[0].conflictKey).toBe("preference:travel");
  });

  it("falls back to pattern extraction when LLM classification is not user_statement", async () => {
    process.env.NOVA_TYP_BASE_URL = "https://example.com";
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                classification: "instruction",
                memories: [],
              }),
            },
          },
        ],
      }),
    });

    const result = await extractFacts("I like blue");
    expect(result.some((item) => item.content === "Likes blue")).toBe(true);
  });

  it("dedupes semantically equivalent preferences using canonical conflict keys", async () => {
    process.env.NOVA_TYP_BASE_URL = "https://example.com";
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                classification: "user_statement",
                memories: [
                  {
                    content: "Likes oranges",
                    type: "preference",
                    confidence: 0.7,
                    conflict_key: "preference:oranges",
                    polarity: "positive",
                  },
                  {
                    content: "Likes orange",
                    type: "preference",
                    confidence: 0.9,
                    conflict_key: "preference:orange",
                    polarity: "positive",
                  },
                ],
              }),
            },
          },
        ],
      }),
    });

    const result = await extractFacts("I like oranges.");
    expect(result).toHaveLength(1);
    expect(result[0].conflictKey).toBe("preference:orange");
    expect(result[0].content).toBe("Likes orange");
  });

  it("keeps opposite polarity preferences as separate memories", async () => {
    process.env.NOVA_TYP_BASE_URL = "https://example.com";
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                classification: "user_statement",
                memories: [
                  {
                    content: "Likes coffee",
                    type: "preference",
                    confidence: 0.8,
                    conflict_key: "preference:coffee",
                    polarity: "positive",
                  },
                  {
                    content: "Dislikes coffee",
                    type: "preference",
                    confidence: 0.9,
                    conflict_key: "preference:coffee",
                    polarity: "negative",
                  },
                ],
              }),
            },
          },
        ],
      }),
    });

    const result = await extractFacts("I like coffee but I dislike coffee.");
    expect(result).toHaveLength(2);
    const polarities = result.map((item) => item.polarity).sort();
    expect(polarities).toEqual(["negative", "positive"]);
  });

  it("falls back to pattern extraction when LLM call aborts", async () => {
    process.env.NOVA_TYP_BASE_URL = "https://example.com";
    global.fetch = async () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      throw error;
    };

    const result = await extractFacts("I like tea");
    expect(result.some((item) => item.content === "Likes tea")).toBe(true);
  });

  it("falls back to workspace chat when openai-compatible route is unauthorized", async () => {
    process.env.NOVA_TYP_BASE_URL = "https://example.com";
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "",
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          textResponse: JSON.stringify({
            classification: "user_statement",
            memories: [
              {
                content: "Likes mango",
                type: "preference",
                confidence: 0.9,
                conflict_key: "preference:mango",
                polarity: "positive",
              },
            ],
          }),
        }),
      });

    const result = await extractFacts("I like mango");
    expect(result.some((item) => item.content === "Likes mango")).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[1][0]).toContain("/api/v1/workspace/zaky/chat");
  });

  it("rejects vague compound LLM memories and preserves atomic pattern facts", async () => {
    process.env.NOVA_TYP_BASE_URL = "https://example.com";
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                classification: "user_statement",
                memories: [
                  {
                    content: "Likes all of those cities",
                    type: "preference",
                    confidence: 0.92,
                    conflict_key: "preference:allofthosecity",
                    polarity: "positive",
                  },
                  {
                    content: "Likes travel and plan to travel to Dubai",
                    type: "preference",
                    confidence: 0.88,
                    conflict_key: "preference:travelandplantotraveltodubai",
                    polarity: "positive",
                  },
                ],
              }),
            },
          },
        ],
      }),
    });

    const result = await extractFacts(
      "I love to travel and plan to travel to Dubai, Cairo, Algeria, Riyadh and I am from Damascus but live in Hamburg and I love all of those cities."
    );

    expect(result.map((item) => item.content)).toEqual(
      expect.arrayContaining([
        "From Damascus",
        "Lives in Hamburg",
        "Plans to travel to Dubai",
        "Plans to travel to Cairo",
        "Plans to travel to Algeria",
        "Plans to travel to Riyadh",
      ])
    );
    expect(result.some((item) => item.content === "Likes all of those cities")).toBe(false);
    expect(result.some((item) => item.content === "Likes travel and plan to travel to Dubai")).toBe(false);
  });

  it("drops unresolved LLM references instead of storing them as preferences", async () => {
    process.env.NOVA_TYP_BASE_URL = "https://example.com";
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                classification: "user_statement",
                memories: [
                  {
                    content: "Likes that place",
                    type: "preference",
                    confidence: 0.9,
                    conflict_key: "preference:that-place",
                    polarity: "positive",
                  },
                ],
              }),
            },
          },
        ],
      }),
    });

    const result = await extractFacts("I like that place.");
    expect(result).toEqual([]);
  });

  it("extracts origin and residence separately from one sentence", async () => {
    const result = await extractFacts("I am from Damascus but live in Hamburg.");
    expect(result.map((item) => item.content)).toEqual(
      expect.arrayContaining(["From Damascus", "Lives in Hamburg"])
    );
  });

  it("sanitizes mocked extracted memories defensively", () => {
    const result = sanitizeExtractedMemories([
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
        content: "Unknown thing",
        type: "mystery",
      },
    ]);

    expect(result).toEqual([
      expect.objectContaining({
        content: "Plans to travel to Dubai",
        type: "goal",
      }),
    ]);
  });
});
