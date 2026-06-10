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

  it("extracts compound preference statements as actionable memories", async () => {
    const result = await extractFacts("I prefer concise answers and weekly plans.");
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ content: "Likes concise answers" }),
        expect.objectContaining({ content: "Likes weekly plans" }),
      ])
    );
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

  it("extracts phone details for downstream review classification", async () => {
    const result = await extractFacts("My phone number is +49 170 123 4567.");
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: "Reach me at +49 170 123 4567",
          type: "fact",
        }),
      ])
    );
  });

  it("extracts Arabic health details for downstream review classification", async () => {
    const result = await extractFacts("أعاني من القلق المزمن.");
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: "Health detail: القلق المزمن",
          type: "struggle",
        }),
      ])
    );
  });

  it("does not extract memories from interrogative questions", async () => {
    // The reported bug: "do I have any travel plans?" was stored as a memory.
    expect(await extractFacts("do I have any travel plans?")).toEqual([]);
    // Guard also blocks questions that contain extractable patterns.
    expect(await extractFacts("do I like coffee?")).toEqual([]);
    expect(await extractFacts("where do I live?")).toEqual([]);
    // Arabic interrogative.
    expect(await extractFacts("هل لدي أي خطط سفر؟")).toEqual([]);
  });

  it("does not treat ordinary 'I have <noun>' as a health detail", async () => {
    const result = await extractFacts("I have a meeting tomorrow.");
    expect(
      result.some((item) => /^Health detail:/i.test(String(item?.content || "")))
    ).toBe(false);
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

  it("splits compound preference statements into atomic memories", () => {
    const result = sanitizeExtractedMemories([
      {
        content: "Prefers concise answers and weekly plans",
        type: "preference",
        confidence: 0.9,
        polarity: "positive",
      },
    ]);

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: "Prefers concise answers",
          type: "preference",
        }),
        expect.objectContaining({
          content: "Prefers weekly plans",
          type: "preference",
        }),
      ])
    );
  });

  it("keeps missing confidence as null instead of silently defaulting to autosave threshold", () => {
    const result = sanitizeExtractedMemories([
      {
        content: "Prefers concise answers",
        type: "preference",
      },
    ]);

    expect(result).toEqual([
      expect.objectContaining({
        content: "Prefers concise answers",
        confidence: null,
      }),
    ]);
  });

  it("preserves Arabic preference memories through sanitization", () => {
    const result = sanitizeExtractedMemories([
      {
        content: "أفضل الإجابات المختصرة",
        type: "preference",
        confidence: 0.9,
      },
    ]);

    expect(result).toEqual([
      expect.objectContaining({
        content: "Prefers الإجابات المختصرة",
        type: "preference",
      }),
    ]);
  });

  it("dedupes semantically equivalent memories via canonical conflict keys", () => {
    const result = sanitizeExtractedMemories([
      { content: "Likes coffee", type: "preference", conflict_key: "preference:coffee", confidence: 0.8 },
      { content: "Likes Coffee", type: "preference", conflict_key: "preference:coffee", confidence: 0.9 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("Likes Coffee"); // higher-confidence survivor
  });

  it("keeps opposite-polarity memories on the same key as separate", () => {
    const result = sanitizeExtractedMemories([
      { content: "Likes coffee", type: "preference", conflict_key: "preference:coffee", polarity: "positive", confidence: 0.9 },
      { content: "Dislikes coffee", type: "preference", conflict_key: "preference:coffee", polarity: "negative", confidence: 0.9 },
    ]);
    expect(result).toHaveLength(2);
  });
});
