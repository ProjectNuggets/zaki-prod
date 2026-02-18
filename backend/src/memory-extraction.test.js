import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { extractFacts } from "./memory-extraction.js";

describe("memory extraction", () => {
  const originalBaseUrl = process.env.NOVA_TYP_BASE_URL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.NOVA_TYP_BASE_URL = "";
    global.fetch = originalFetch;
  });

  afterEach(() => {
    process.env.NOVA_TYP_BASE_URL = originalBaseUrl;
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
});
