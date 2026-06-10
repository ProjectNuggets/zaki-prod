import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const extractFactsMock = jest.fn();
const sanitizeExtractedMemoriesMock = jest.fn();
const findDuplicateMemoryMock = jest.fn();
const findConflictMock = jest.fn();
const markMemoryOutdatedMock = jest.fn();
const storeMemoryMock = jest.fn();
const getMemoryUndoWindowMsMock = jest.fn();
const upsertUndoWindowMock = jest.fn();

async function loadCaptureModule() {
  jest.resetModules();
  jest.unstable_mockModule("../memory-extraction.js", () => ({
    extractFacts: extractFactsMock,
    sanitizeExtractedMemories: sanitizeExtractedMemoriesMock,
  }));
  jest.unstable_mockModule("./operations.js", () => ({
    findConflict: findConflictMock,
    findDuplicateMemory: findDuplicateMemoryMock,
    markMemoryOutdated: markMemoryOutdatedMock,
    storeMemory: storeMemoryMock,
  }));
  jest.unstable_mockModule("./auto-save.js", () => ({
    getMemoryUndoWindowMs: getMemoryUndoWindowMsMock,
    upsertUndoWindow: upsertUndoWindowMock,
  }));
  return await import("./capture.js");
}

describe("memory capture", () => {
  beforeEach(() => {
    [
      extractFactsMock,
      sanitizeExtractedMemoriesMock,
      findDuplicateMemoryMock,
      findConflictMock,
      markMemoryOutdatedMock,
      storeMemoryMock,
      getMemoryUndoWindowMsMock,
      upsertUndoWindowMock,
    ].forEach((m) => m.mockReset());

    extractFactsMock.mockResolvedValue([]);
    sanitizeExtractedMemoriesMock.mockImplementation((memories) => memories);
    findDuplicateMemoryMock.mockResolvedValue(null);
    findConflictMock.mockResolvedValue(null);
    markMemoryOutdatedMock.mockResolvedValue({ success: true });
    storeMemoryMock.mockResolvedValue({ id: "mem-1" });
    getMemoryUndoWindowMsMock.mockReturnValue(5000);
    upsertUndoWindowMock.mockResolvedValue({ success: true });
  });

  it("classifies fresh→save, duplicate→duplicate, conflict→supersede", async () => {
    const { classifyMemoryCandidate } = await loadCaptureModule();

    expect(
      classifyMemoryCandidate({ fact: { content: "x", confidence: 0.9 } })
    ).toEqual(expect.objectContaining({ action: "save", reason: "auto_save" }));
    expect(
      classifyMemoryCandidate({ fact: { content: "x" }, duplicate: true })
    ).toEqual(expect.objectContaining({ action: "duplicate" }));
    expect(
      classifyMemoryCandidate({ fact: { content: "x" }, conflict: true })
    ).toEqual(expect.objectContaining({ action: "supersede" }));
  });

  it("auto-saves a high-confidence preference with an undo window", async () => {
    const { processChatMemoryCapture } = await loadCaptureModule();
    extractFactsMock.mockResolvedValue([
      {
        content: "Prefers concise answers",
        type: "preference",
        confidence: 0.92,
        conflictKey: "preference:concise-answers",
        polarity: "positive",
      },
    ]);

    const result = await processChatMemoryCapture({
      userId: "user@example.com",
      message: "I prefer concise answers",
      threadId: "thread-1",
    });

    expect(result.saved).toEqual([
      expect.objectContaining({
        id: "mem-1",
        content: "Prefers concise answers",
        state: "saved_reversible",
        superseded: false,
      }),
    ]);
    expect(upsertUndoWindowMock).toHaveBeenCalledTimes(1);
    expect(result.superseded).toEqual([]);
  });

  it("auto-saves sensitive content like anything else (no review gate)", async () => {
    const { processChatMemoryCapture } = await loadCaptureModule();
    extractFactsMock.mockResolvedValue([
      { content: "Reach me at alice@example.com", type: "fact", confidence: 0.95 },
    ]);

    const result = await processChatMemoryCapture({
      userId: "user@example.com",
      message: "My email is alice@example.com",
    });

    expect(storeMemoryMock).toHaveBeenCalledTimes(1);
    expect(result.saved).toEqual([
      expect.objectContaining({ content: "Reach me at alice@example.com" }),
    ]);
  });

  it("auto-saves even when confidence is missing", async () => {
    const { processChatMemoryCapture } = await loadCaptureModule();
    extractFactsMock.mockResolvedValue([
      { content: "Prefers concise answers", type: "preference", confidence: null },
    ]);

    const result = await processChatMemoryCapture({
      userId: "user@example.com",
      message: "I prefer concise answers",
    });

    expect(result.saved).toHaveLength(1);
    expect(storeMemoryMock).toHaveBeenCalledTimes(1);
  });

  it("skips capture entirely when the policy is disabled (off)", async () => {
    const { processChatMemoryCapture } = await loadCaptureModule();

    const result = await processChatMemoryCapture({
      userId: "u@x.co",
      message: "I love sushi",
      policy: { id: "off", disabled: true },
    });

    expect(result).toEqual({
      saved: [],
      duplicates: [],
      superseded: [],
      skipped: [],
    });
    expect(extractFactsMock).not.toHaveBeenCalled();
    expect(findDuplicateMemoryMock).not.toHaveBeenCalled();
    expect(storeMemoryMock).not.toHaveBeenCalled();
    expect(markMemoryOutdatedMock).not.toHaveBeenCalled();
  });

  it("auto-supersedes a contradictory memory (newest wins), then saves the new one", async () => {
    const { processChatMemoryCapture } = await loadCaptureModule();
    extractFactsMock.mockResolvedValue([
      {
        content: "Lives in Hamburg",
        type: "fact",
        confidence: 0.91,
        conflictKey: "identity:location",
        polarity: "neutral",
      },
    ]);
    findConflictMock.mockResolvedValue({
      memoryId: "mem-old",
      content: "Lives in Berlin",
      type: "fact",
    });

    const result = await processChatMemoryCapture({
      userId: "user@example.com",
      message: "I live in Hamburg",
    });

    expect(markMemoryOutdatedMock).toHaveBeenCalledWith({
      userId: "user@example.com",
      memoryId: "mem-old",
    });
    expect(result.superseded).toEqual([
      expect.objectContaining({ memoryId: "mem-old", content: "Lives in Berlin" }),
    ]);
    expect(storeMemoryMock).toHaveBeenCalledTimes(1);
    expect(result.saved).toEqual([
      expect.objectContaining({ content: "Lives in Hamburg", superseded: true }),
    ]);
  });

  it("skips duplicates without storing or superseding", async () => {
    const { processChatMemoryCapture } = await loadCaptureModule();
    extractFactsMock.mockResolvedValue([
      { content: "Likes tea", type: "preference", confidence: 0.9 },
    ]);
    findDuplicateMemoryMock.mockResolvedValue({ id: "dup-1" });

    const result = await processChatMemoryCapture({
      userId: "u@x.co",
      message: "I like tea",
    });

    expect(result.duplicates).toEqual([
      expect.objectContaining({ content: "Likes tea" }),
    ]);
    expect(storeMemoryMock).not.toHaveBeenCalled();
    expect(markMemoryOutdatedMock).not.toHaveBeenCalled();
  });
});
