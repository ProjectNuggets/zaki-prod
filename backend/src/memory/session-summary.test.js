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
    const markMemoryOutdated = jest.fn(async () => ({ success: true }));
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
      { extractFacts, findDuplicateMemory, findConflict, markMemoryOutdated, storeMemory }
    );

    expect(result.skipped).toBe(false);
    expect(result.processedMessages).toBe(2);
    expect(result.extracted).toBe(2);
    expect(result.stored).toBe(1);
    expect(result.duplicates).toBe(0);
    expect(result.skippedFacts).toBe(1);
    expect(result.superseded).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.storedIds).toEqual(["m1"]);
    expect(findConflict).toHaveBeenCalledTimes(1);
    expect(findDuplicateMemory).toHaveBeenCalledTimes(1);
    expect(markMemoryOutdated).not.toHaveBeenCalled();
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

  it("auto-supersedes a contradictory memory (newest wins), then stores the new one", async () => {
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
      memoryId: "existing-memory",
      content: "Likes coffee",
      type: "preference",
    }));
    const markMemoryOutdated = jest.fn(async () => ({ success: true }));
    const storeMemory = jest.fn(async () => ({ id: "m1", duplicate: false }));

    const result = await summarizeConversation(
      {
        userId: "user@example.com",
        messages: [{ role: "user", content: "I don't like coffee anymore" }],
      },
      { extractFacts, findDuplicateMemory, findConflict, markMemoryOutdated, storeMemory }
    );

    expect(result.skipped).toBe(false);
    expect(result.extracted).toBe(1);
    expect(result.stored).toBe(1);
    expect(result.superseded).toBe(1);
    expect(result.storedIds).toEqual(["m1"]);
    expect(markMemoryOutdated).toHaveBeenCalledWith({
      userId: "user@example.com",
      memoryId: "existing-memory",
    });
    expect(storeMemory).toHaveBeenCalledTimes(1);
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
    const markMemoryOutdated = jest.fn(async () => ({ success: true }));
    const storeMemory = jest.fn(async () => ({ id: "m-tea", duplicate: false }));

    const result = await summarizeConversation(
      {
        userId: "user@example.com",
        messages: [
          { role: "user", content: "I like tea" },
          { role: "user", content: "I like tea very much" },
        ],
      },
      { extractFacts, findDuplicateMemory, findConflict, markMemoryOutdated, storeMemory }
    );

    expect(result.skipped).toBe(false);
    expect(result.stored).toBe(1);
    expect(result.duplicates).toBe(0);
    expect(result.superseded).toBe(0);
    expect(result.skippedFacts).toBe(1);
    expect(storeMemory).toHaveBeenCalledTimes(1);
    expect(markMemoryOutdated).not.toHaveBeenCalled();
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
    const markMemoryOutdated = jest.fn(async () => ({ success: true }));
    const storeMemory = jest.fn(async () => ({ id: "m2", duplicate: false }));

    const result = await summarizeConversation(
      {
        userId: "user@example.com",
        messages: [
          { role: "user", content: "message 1" },
          { role: "user", content: "message 2" },
        ],
      },
      { extractFacts, findDuplicateMemory, findConflict, markMemoryOutdated, storeMemory }
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
    const markMemoryOutdated = jest.fn(async () => ({ success: true }));
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
      { extractFacts, findDuplicateMemory, findConflict, markMemoryOutdated, storeMemory }
    );

    expect(result.skipped).toBe(false);
    expect(result.factsCapped).toBe(true);
    expect(result.skippedFacts).toBeGreaterThan(0);
    expect(storeMemory).toHaveBeenCalledTimes(8);
    expect(markMemoryOutdated).not.toHaveBeenCalled();
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
    const markMemoryOutdated = jest.fn(async () => ({ success: true }));
    const storeMemory = jest.fn(async () => ({ id: "m1", duplicate: false }));

    const result = await summarizeConversation(
      {
        userId: "user@example.com",
        messages: [{ role: "user", content: "compound message" }],
      },
      { extractFacts, findDuplicateMemory, findConflict, markMemoryOutdated, storeMemory }
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
    expect(markMemoryOutdated).not.toHaveBeenCalled();
  });

  it("skips capture entirely when policy is disabled (off)", async () => {
    const extractFacts = jest.fn(async () => [
      {
        content: "Likes coffee",
        type: "preference",
        conflictKey: "preference:coffee",
        polarity: "positive",
        confidence: 0.93,
      },
    ]);
    const findDuplicateMemory = jest.fn(async () => null);
    const findConflict = jest.fn(async () => null);
    const markMemoryOutdated = jest.fn(async () => ({ success: true }));
    const storeMemory = jest.fn(async () => ({ id: "m1", duplicate: false }));

    const result = await summarizeConversation(
      {
        userId: "user@example.com",
        messages: [
          { role: "user", content: "I like coffee" },
          { role: "assistant", content: "Noted" },
          { role: "user", content: "I really like coffee" },
        ],
        policy: { id: "off", disabled: true },
      },
      {
        extractFacts,
        findDuplicateMemory,
        findConflict,
        markMemoryOutdated,
        storeMemory,
      }
    );

    expect(result).toEqual(
      expect.objectContaining({
        skipped: true,
        reason: "policy_off",
      })
    );
    expect(extractFacts).not.toHaveBeenCalled();
    expect(storeMemory).not.toHaveBeenCalled();
    expect(markMemoryOutdated).not.toHaveBeenCalled();
    expect(findDuplicateMemory).not.toHaveBeenCalled();
    expect(findConflict).not.toHaveBeenCalled();
  });
});
