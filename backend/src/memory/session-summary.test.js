import { describe, expect, it, jest } from "@jest/globals";
import { summarizeConversation } from "./session-summary.js";

describe("session memory summarization", () => {
  it("skips when there are no user messages", async () => {
    const result = await summarizeConversation(
      {
        userId: "user@example.com",
        messages: [{ role: "assistant", content: "hello" }],
      },
      {}
    );

    expect(result).toEqual(
      expect.objectContaining({
        skipped: true,
        reason: "no_user_messages",
      })
    );
  });

  it("stores extracted memories and tracks duplicates", async () => {
    const extractFacts = jest
      .fn()
      .mockResolvedValueOnce([
        { content: "Likes coffee", type: "preference", conflictKey: "preference:coffee", polarity: "positive" },
      ])
      .mockResolvedValueOnce([
        { content: "Likes coffee", type: "preference", conflictKey: "preference:coffee", polarity: "positive" },
      ]);

    const findConflict = jest.fn(async () => null);
    const createConflict = jest.fn(async () => ({ id: "c1" }));
    const storeMemory = jest
      .fn()
      .mockResolvedValueOnce({ id: "m1", duplicate: false })
      .mockResolvedValueOnce({ duplicate: true });

    const result = await summarizeConversation(
      {
        userId: "USER@Example.com",
        messages: [
          { role: "user", content: "I like coffee" },
          { role: "assistant", content: "Noted" },
          { role: "user", content: "I like coffee" },
        ],
        threadId: "thread-1",
      },
      { extractFacts, findConflict, createConflict, storeMemory }
    );

    expect(result.skipped).toBe(false);
    expect(result.processedMessages).toBe(2);
    expect(result.extracted).toBe(2);
    expect(result.stored).toBe(1);
    expect(result.duplicates).toBe(1);
    expect(result.conflicts).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.storedIds).toEqual(["m1"]);
    expect(findConflict).toHaveBeenCalledTimes(2);
    expect(createConflict).not.toHaveBeenCalled();
    expect(storeMemory).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userId: "user@example.com",
        content: "Likes coffee",
        sourceThreadId: "thread-1",
      })
    );
  });

  it("creates conflicts instead of storing when contradiction is found", async () => {
    const extractFacts = jest.fn(async () => [
      {
        content: "Dislikes coffee",
        type: "preference",
        conflictKey: "preference:coffee",
        polarity: "negative",
      },
    ]);
    const findConflict = jest.fn(async () => ({
      id: "existing-memory",
      content: "Likes coffee",
      type: "preference",
    }));
    const createConflict = jest.fn(async () => ({ id: "conflict-1" }));
    const storeMemory = jest.fn(async () => ({ id: "m1", duplicate: false }));

    const result = await summarizeConversation(
      {
        userId: "user@example.com",
        messages: [{ role: "user", content: "I don't like coffee anymore" }],
      },
      { extractFacts, findConflict, createConflict, storeMemory }
    );

    expect(result.skipped).toBe(false);
    expect(result.extracted).toBe(1);
    expect(result.stored).toBe(0);
    expect(result.conflicts).toBe(1);
    expect(result.conflictIds).toEqual(["conflict-1"]);
    expect(storeMemory).not.toHaveBeenCalled();
    expect(createConflict).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user@example.com",
        newContent: "Dislikes coffee",
      })
    );
  });

  it("deduplicates repeated extracted facts within one session", async () => {
    const extractFacts = jest
      .fn()
      .mockResolvedValueOnce([
        { content: "Likes tea", type: "preference", conflictKey: "preference:tea", polarity: "positive" },
        { content: "Likes tea", type: "preference", conflictKey: "preference:tea", polarity: "positive" },
      ])
      .mockResolvedValueOnce([
        { content: "Likes tea", type: "preference", conflictKey: "preference:tea", polarity: "positive" },
      ]);
    const findConflict = jest.fn(async () => null);
    const createConflict = jest.fn(async () => ({ id: "c1" }));
    const storeMemory = jest.fn(async () => ({ id: "m-tea", duplicate: false }));

    const result = await summarizeConversation(
      {
        userId: "user@example.com",
        messages: [
          { role: "user", content: "I like tea" },
          { role: "user", content: "I like tea very much" },
        ],
      },
      { extractFacts, findConflict, createConflict, storeMemory }
    );

    expect(result.skipped).toBe(false);
    expect(result.stored).toBe(1);
    expect(result.duplicates).toBe(0);
    expect(result.conflicts).toBe(0);
    expect(result.skippedFacts).toBe(2);
    expect(storeMemory).toHaveBeenCalledTimes(1);
    expect(createConflict).not.toHaveBeenCalled();
  });

  it("continues processing when extraction throws for one message", async () => {
    const extractFacts = jest
      .fn()
      .mockRejectedValueOnce(new Error("extract failed"))
      .mockResolvedValueOnce([
        { content: "Lives in Dubai", type: "fact", conflictKey: "identity:location", polarity: "neutral" },
      ]);
    const findConflict = jest.fn(async () => null);
    const createConflict = jest.fn(async () => ({ id: "c1" }));
    const storeMemory = jest.fn(async () => ({ id: "m2", duplicate: false }));

    const result = await summarizeConversation(
      {
        userId: "user@example.com",
        messages: [
          { role: "user", content: "message 1" },
          { role: "user", content: "message 2" },
        ],
      },
      { extractFacts, findConflict, createConflict, storeMemory }
    );

    expect(result.skipped).toBe(false);
    expect(result.errors).toBe(1);
    expect(result.stored).toBe(1);
    expect(storeMemory).toHaveBeenCalledTimes(1);
  });

  it("caps fact volume to protect stability", async () => {
    const burstFacts = Array.from({ length: 20 }).map((_, index) => ({
      content: `Fact ${index + 1}`,
      type: "fact",
      conflictKey: `fact:${index + 1}`,
      polarity: "neutral",
    }));
    const extractFacts = jest.fn(async () => burstFacts);
    const findConflict = jest.fn(async () => null);
    const createConflict = jest.fn(async () => ({ id: "c1" }));
    let storedIndex = 0;
    const storeMemory = jest.fn(async () => {
      storedIndex += 1;
      return { id: `m${storedIndex}`, duplicate: false };
    });

    const result = await summarizeConversation(
      {
        userId: "user@example.com",
        messages: [
          { role: "user", content: "first" },
          { role: "assistant", content: "assistant message should not be processed" },
        ],
      },
      { extractFacts, findConflict, createConflict, storeMemory }
    );

    expect(result.skipped).toBe(false);
    expect(result.factsCapped).toBe(true);
    expect(result.skippedFacts).toBeGreaterThan(0);
    expect(storeMemory).toHaveBeenCalledTimes(8);
    expect(createConflict).not.toHaveBeenCalled();
  });
});
