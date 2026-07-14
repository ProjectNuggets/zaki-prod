import { absorbMemoryImport, settleMemoryUndosNewestFirst } from "./memoryImport";

describe("absorbMemoryImport", () => {
  it("returns the real absorbed count from saved, updated, and already-known memories", async () => {
    const capture = jest.fn(async () => ({
      response: { ok: true } as Response,
      data: {
        saved: [{ id: "1" }],
        superseded: [{ memoryId: "2" }],
        duplicates: [{ content: "known" }, { content: "known too" }],
        skipped: [],
      },
    }));

    const result = await absorbMemoryImport("memory dump", "thread-1", capture as never);

    expect(capture).toHaveBeenCalledWith({ message: "memory dump", threadId: "thread-1" });
    expect(result.absorbedCount).toBe(3);
  });

  it("sends a bulk export in bounded chunks without dropping any import lines", async () => {
    const importLines = Array.from(
      { length: 25 },
      (_, index) => `[2026-07-${String(index + 1).padStart(2, "0")}] - I prefer tool ${index + 1}.`
    );
    const capture = jest.fn(async (_payload: { message: string; threadId: string | null }) => ({
      response: { ok: true } as Response,
      data: {
        saved: [{
          id: String(capture.mock.calls.length),
          content: "saved chunk",
          type: "preference",
          state: "saved_reversible" as const,
          undoUntil: "2026-07-14T16:00:00.000Z",
        }],
        superseded: [],
        duplicates: [],
        skipped: [],
      },
    }));

    const result = await absorbMemoryImport(importLines.join("\n"), "thread-1", capture as never);

    expect(capture.mock.calls.length).toBeGreaterThan(1);
    const sentChunks = capture.mock.calls.map(([payload]) => payload.message);
    expect(sentChunks.every((chunk) => chunk.length <= 6_000)).toBe(true);
    for (const line of importLines) {
      expect(sentChunks.some((chunk) => chunk.includes(line))).toBe(true);
    }
    expect(result.saved).toHaveLength(capture.mock.calls.length);
  });

  it("rejects an import when the backend absorbed nothing", async () => {
    const capture = jest.fn(async () => ({
      response: { ok: true } as Response,
      data: { saved: [], superseded: [], duplicates: [], skipped: [{ reason: "policy" }] },
    }));

    await expect(absorbMemoryImport("memory dump", null, capture as never)).rejects.toThrow(
      "No memories were absorbed"
    );
  });
});

describe("settleMemoryUndosNewestFirst", () => {
  it("waits for each undo from newest to oldest so supersession chains stay restorable", async () => {
    const order: string[] = [];
    const results = await settleMemoryUndosNewestFirst(
      [{ id: "old" }, { id: "middle" }, { id: "new" }],
      async (memory) => {
        order.push(memory.id);
        return memory.id;
      }
    );

    expect(order).toEqual(["new", "middle", "old"]);
    expect(results).toEqual([
      { status: "fulfilled", value: "new" },
      { status: "fulfilled", value: "middle" },
      { status: "fulfilled", value: "old" },
    ]);
  });

  it("stops at the first failed newer undo so older supersession links stay intact", async () => {
    const order: string[] = [];
    const results = await settleMemoryUndosNewestFirst(
      [{ id: "old" }, { id: "middle" }, { id: "new" }],
      async (memory) => {
        order.push(memory.id);
        if (memory.id === "middle") throw new Error("network failed");
        return memory.id;
      }
    );

    expect(order).toEqual(["new", "middle"]);
    expect(results[0]).toEqual({ status: "fulfilled", value: "new" });
    expect(results[1]).toEqual({ status: "rejected", reason: expect.any(Error) });
  });
});
