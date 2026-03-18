import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const extractFactsMock = jest.fn();
const sanitizeExtractedMemoriesMock = jest.fn();
const findDuplicateMemoryMock = jest.fn();
const findConflictMock = jest.fn();
const createConflictMock = jest.fn();
const stageMemoryMock = jest.fn();
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
    createConflict: createConflictMock,
    findConflict: findConflictMock,
    findDuplicateMemory: findDuplicateMemoryMock,
    stageMemory: stageMemoryMock,
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
    extractFactsMock.mockReset();
    sanitizeExtractedMemoriesMock.mockReset();
    findDuplicateMemoryMock.mockReset();
    findConflictMock.mockReset();
    createConflictMock.mockReset();
    stageMemoryMock.mockReset();
    storeMemoryMock.mockReset();
    getMemoryUndoWindowMsMock.mockReset();
    upsertUndoWindowMock.mockReset();

    extractFactsMock.mockResolvedValue([]);
    sanitizeExtractedMemoriesMock.mockImplementation((memories) => memories);
    findDuplicateMemoryMock.mockResolvedValue(null);
    findConflictMock.mockResolvedValue(null);
    createConflictMock.mockResolvedValue({ id: "conf-1" });
    stageMemoryMock.mockResolvedValue({ id: "pending-1" });
    storeMemoryMock.mockResolvedValue({ id: "mem-1" });
    getMemoryUndoWindowMsMock.mockReturnValue(5000);
    upsertUndoWindowMock.mockResolvedValue({ success: true });
  });

  it("routes obvious PII to review instead of autosave", async () => {
    const { processChatMemoryCapture } = await loadCaptureModule();
    extractFactsMock.mockResolvedValue([
      {
        content: "Reach me at alice@example.com",
        type: "fact",
        confidence: 0.95,
      },
    ]);

    const result = await processChatMemoryCapture({
      userId: "user@example.com",
      message: "My email is alice@example.com",
    });

    expect(result.saved).toEqual([]);
    expect(result.review).toEqual([
      expect.objectContaining({
        content: "Reach me at alice@example.com",
        reason: "pii_email",
      }),
    ]);
    expect(storeMemoryMock).not.toHaveBeenCalled();
  });

  it("routes missing-confidence memories to review", async () => {
    const { classifyMemoryCandidate } = await loadCaptureModule();

    const result = classifyMemoryCandidate({
      fact: {
        content: "Prefers concise answers",
        type: "preference",
        confidence: null,
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        action: "needs_review",
        reason: "missing_confidence",
        confidence: null,
      })
    );
  });

  it("autosaves high-confidence non-sensitive preferences with undo window", async () => {
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
      }),
    ]);
    expect(upsertUndoWindowMock).toHaveBeenCalledTimes(1);
    expect(result.review).toEqual([]);
  });

  it("creates conflict records for contradictory memories", async () => {
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
      id: "mem-old",
      content: "Lives in Berlin",
      type: "fact",
    });

    const result = await processChatMemoryCapture({
      userId: "user@example.com",
      message: "I live in Hamburg",
    });

    expect(createConflictMock).toHaveBeenCalledTimes(1);
    expect(result.conflicts).toEqual([
      expect.objectContaining({
        id: "conf-1",
        content: "Lives in Hamburg",
        conflictingContent: "Lives in Berlin",
      }),
    ]);
    expect(result.saved).toEqual([]);
  });
});
