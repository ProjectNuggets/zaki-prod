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

  it("stores extracted memories and skips repeated facts within the same session", async () => {
    const extractFacts = jest
      .fn()
      .mockResolvedValueOnce([
        { content: "Likes coffee", type: "preference", conflictKey: "preference:coffee", polarity: "positive", confidence: 0.93 },
      ])
      .mockResolvedValueOnce([
        { content: "Likes coffee", type: "preference", conflictKey: "preference:coffee", polarity: "positive", confidence: 0.93 },
      ]);

    const findConflict = jest.fn(async () => null);
    const findDuplicateMemory = jest.fn(async () => null);
    const createConflict = jest.fn(async () => ({ id: "c1" }));
    const stageMemory = jest.fn(async () => ({ id: "pending-1", duplicate: false }));
    const storeMemory = jest.fn().mockResolvedValueOnce({ id: "m1", duplicate: false });

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
      { extractFacts, findDuplicateMemory, findConflict, createConflict, stageMemory, storeMemory }
    );

    expect(result.skipped).toBe(false);
    expect(result.processedMessages).toBe(2);
    expect(result.extracted).toBe(2);
    expect(result.stored).toBe(1);
    expect(result.duplicates).toBe(0);
    expect(result.skippedFacts).toBe(1);
    expect(result.conflicts).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.storedIds).toEqual(["m1"]);
    expect(findConflict).toHaveBeenCalledTimes(1);
    expect(findDuplicateMemory).toHaveBeenCalledTimes(1);
    expect(stageMemory).not.toHaveBeenCalled();
    expect(createConflict).not.toHaveBeenCalled();
    expect(storeMemory).toHaveBeenCalledTimes(1);
    expect(storeMemory).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userId: "user@example.com",
        content: "Likes coffee",
        sourceThreadId: "thread-1",
        metadata: expect.objectContaining({
          source: "session_end",
        }),
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
        confidence: 0.9,
      },
    ]);
    const findDuplicateMemory = jest.fn(async () => null);
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
      { extractFacts, findDuplicateMemory, findConflict, createConflict, stageMemory: jest.fn(), storeMemory }
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
        sourceThreadId: null,
      })
    );
  });

  it("deduplicates repeated extracted facts within one session", async () => {
    const extractFacts = jest
      .fn()
      .mockResolvedValueOnce([
        { content: "Likes tea", type: "preference", conflictKey: "preference:tea", polarity: "positive", confidence: 0.92 },
        { content: "Likes tea", type: "preference", conflictKey: "preference:tea", polarity: "positive", confidence: 0.92 },
      ])
      .mockResolvedValueOnce([
        { content: "Likes tea", type: "preference", conflictKey: "preference:tea", polarity: "positive", confidence: 0.92 },
      ]);
    const findConflict = jest.fn(async () => null);
    const findDuplicateMemory = jest.fn(async () => null);
    const createConflict = jest.fn(async () => ({ id: "c1" }));
    const stageMemory = jest.fn(async () => ({ id: "pending-1", duplicate: false }));
    const storeMemory = jest.fn(async () => ({ id: "m-tea", duplicate: false }));

    const result = await summarizeConversation(
      {
        userId: "user@example.com",
        messages: [
          { role: "user", content: "I like tea" },
          { role: "user", content: "I like tea very much" },
        ],
      },
      { extractFacts, findDuplicateMemory, findConflict, createConflict, stageMemory, storeMemory }
    );

    expect(result.skipped).toBe(false);
    expect(result.stored).toBe(1);
    expect(result.duplicates).toBe(0);
    expect(result.conflicts).toBe(0);
    expect(result.skippedFacts).toBe(1);
    expect(storeMemory).toHaveBeenCalledTimes(1);
    expect(stageMemory).not.toHaveBeenCalled();
    expect(createConflict).not.toHaveBeenCalled();
  });

  it("continues processing when extraction throws for one message", async () => {
    const extractFacts = jest
      .fn()
      .mockRejectedValueOnce(new Error("extract failed"))
      .mockResolvedValueOnce([
        { content: "Lives in Dubai", type: "fact", conflictKey: "identity:location", polarity: "neutral", confidence: 0.93 },
      ]);
    const findConflict = jest.fn(async () => null);
    const findDuplicateMemory = jest.fn(async () => null);
    const createConflict = jest.fn(async () => ({ id: "c1" }));
    const stageMemory = jest.fn(async () => ({ id: "pending-1", duplicate: false }));
    const storeMemory = jest.fn(async () => ({ id: "m2", duplicate: false }));

    const result = await summarizeConversation(
      {
        userId: "user@example.com",
        messages: [
          { role: "user", content: "message 1" },
          { role: "user", content: "message 2" },
        ],
      },
      { extractFacts, findDuplicateMemory, findConflict, createConflict, stageMemory, storeMemory }
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
      confidence: 0.92,
    }));
    const extractFacts = jest.fn(async () => burstFacts);
    const findConflict = jest.fn(async () => null);
    const findDuplicateMemory = jest.fn(async () => null);
    const createConflict = jest.fn(async () => ({ id: "c1" }));
    const stageMemory = jest.fn(async () => ({ id: "pending-1", duplicate: false }));
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
      { extractFacts, findDuplicateMemory, findConflict, createConflict, stageMemory, storeMemory }
    );

    expect(result.skipped).toBe(false);
    expect(result.factsCapped).toBe(true);
    expect(result.skippedFacts).toBeGreaterThan(0);
    expect(storeMemory).toHaveBeenCalledTimes(8);
    expect(createConflict).not.toHaveBeenCalled();
  });

  it("drops invalid extracted memories before session storage", async () => {
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
        confidence: 0.91,
      },
      {
        content: "Likes travel and plan to travel to Dubai",
        type: "preference",
        polarity: "positive",
      },
    ]);
    const findConflict = jest.fn(async () => null);
    const findDuplicateMemory = jest.fn(async () => null);
    const createConflict = jest.fn(async () => ({ id: "c1" }));
    const stageMemory = jest.fn(async () => ({ id: "pending-1", duplicate: false }));
    const storeMemory = jest.fn(async () => ({ id: "m1", duplicate: false }));

    const result = await summarizeConversation(
      {
        userId: "user@example.com",
        messages: [{ role: "user", content: "compound message" }],
      },
      { extractFacts, findDuplicateMemory, findConflict, createConflict, stageMemory, storeMemory }
    );

    expect(result.skipped).toBe(false);
    expect(result.extracted).toBe(1);
    expect(result.stored).toBe(1);
    expect(result.skippedFacts).toBe(0);
    expect(storeMemory).toHaveBeenCalledTimes(1);
    expect(storeMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Plans to travel to Dubai",
        type: "goal",
      })
    );
    expect(createConflict).not.toHaveBeenCalled();
  });

  it("routes session-end memories to review when ask-before-saving policy is active", async () => {
    const extractFacts = jest.fn(async () => [
      {
        content: "Prefers concise weekly plans",
        type: "preference",
        confidence: 0.94,
        conflictKey: "preference:concise-weekly-plans",
        polarity: "positive",
      },
    ]);
    const findDuplicateMemory = jest.fn(async () => null);
    const findConflict = jest.fn(async () => null);
    const createConflict = jest.fn(async () => ({ id: "c1" }));
    const stageMemory = jest.fn(async () => ({ id: "pending-1", duplicate: false }));
    const storeMemory = jest.fn(async () => ({ id: "m1", duplicate: false }));

    const result = await summarizeConversation(
      {
        userId: "user@example.com",
        messages: [{ role: "user", content: "I prefer concise weekly plans" }],
        policy: { id: "ask_before_saving", alwaysReview: true },
      },
      {
        extractFacts,
        findDuplicateMemory,
        findConflict,
        createConflict,
        stageMemory,
        storeMemory,
      }
    );

    expect(result.review).toBe(1);
    expect(result.reviewIds).toEqual(["pending-1"]);
    expect(stageMemory).toHaveBeenCalledTimes(1);
    expect(storeMemory).not.toHaveBeenCalled();
    expect(createConflict).not.toHaveBeenCalled();
  });
});
