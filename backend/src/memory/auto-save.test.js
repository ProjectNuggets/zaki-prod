import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const dbGetMock = jest.fn();
const dbQueryMock = jest.fn();
const transactionQueryMock = jest.fn();
const withDbTransactionMock = jest.fn(async (run) =>
  run({ query: transactionQueryMock })
);
const deleteMemoryMock = jest.fn();

async function loadAutoSaveModule() {
  jest.resetModules();
  jest.unstable_mockModule("../db.js", () => ({
    dbGet: dbGetMock,
    dbQuery: dbQueryMock,
    withDbTransaction: withDbTransactionMock,
  }));
  jest.unstable_mockModule("./operations.js", () => ({
    deleteMemory: deleteMemoryMock,
    findConflict: jest.fn(),
    markMemoryOutdated: jest.fn(),
    storeMemory: jest.fn(),
  }));
  jest.unstable_mockModule("../memory-extraction.js", () => ({
    sanitizeExtractedMemories: jest.fn((memories) => memories),
  }));
  return import("./auto-save.js");
}

describe("memory undo", () => {
  beforeEach(() => {
    dbGetMock.mockReset();
    dbQueryMock.mockReset();
    transactionQueryMock.mockReset();
    withDbTransactionMock.mockClear();
    deleteMemoryMock.mockReset();
  });

  it("reactivates the prior memory when undoing a superseding save", async () => {
    dbGetMock.mockResolvedValue({
      memory_id: "mem-new",
      user_id: "user@example.com",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      used_at: null,
      superseded_memory_id: "mem-old",
    });
    transactionQueryMock
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1 });

    const { undoMemory } = await loadAutoSaveModule();
    const result = await undoMemory({
      userId: "user@example.com",
      memoryId: "mem-new",
    });

    expect(result).toEqual({ success: true });
    expect(transactionQueryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("DELETE FROM memories"),
      ["mem-new", "user@example.com"]
    );
    expect(transactionQueryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("status = 'active'"),
      ["mem-old", "user@example.com"]
    );
    expect(transactionQueryMock).toHaveBeenNthCalledWith(
      3,
      expect.stringMatching(/UPDATE memory_undo_windows[\s\S]*used_at = NOW\(\)/),
      ["mem-new", "user@example.com"]
    );
  });
});
