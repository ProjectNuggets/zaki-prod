import { captureMemory, type MemoryCaptureResponse } from "./api";

type CaptureMemory = typeof captureMemory;

const MEMORY_IMPORT_CHUNK_MAX_CHARS = 6_000;
const MEMORY_IMPORT_CHUNK_MAX_NONEMPTY_LINES = 8;

export type MemoryImportAbsorption = {
  saved: MemoryCaptureResponse["saved"];
  superseded: MemoryCaptureResponse["superseded"];
  duplicates: MemoryCaptureResponse["duplicates"];
  skipped: MemoryCaptureResponse["skipped"];
  absorbedCount: number;
};

export class MemoryImportPartialError extends Error {
  readonly partial: MemoryImportAbsorption;

  constructor(partial: MemoryImportAbsorption) {
    super(
      `Imported ${partial.absorbedCount} ${partial.absorbedCount === 1 ? "memory" : "memories"} before the import stopped. Undo the saved memories before retrying.`
    );
    this.name = "MemoryImportPartialError";
    this.partial = partial;
  }
}

function buildMemoryImportAbsorption({
  saved,
  superseded,
  duplicates,
  skipped,
}: Omit<MemoryImportAbsorption, "absorbedCount">): MemoryImportAbsorption {
  return {
    saved,
    superseded,
    duplicates,
    skipped,
    absorbedCount: saved.length + duplicates.length,
  };
}

export async function settleMemoryUndosNewestFirst<TMemory, TResult>(
  memories: readonly TMemory[],
  undo: (memory: TMemory) => Promise<TResult>
): Promise<PromiseSettledResult<TResult>[]> {
  const results: PromiseSettledResult<TResult>[] = [];
  for (const memory of [...memories].reverse()) {
    try {
      results.push({ status: "fulfilled", value: await undo(memory) });
    } catch (reason) {
      results.push({ status: "rejected", reason });
      break;
    }
  }
  return results;
}

export function splitMemoryImportDump(dump: string): string[] {
  const lines = String(dump || "").replace(/\r\n?/g, "\n").split("\n");
  const chunks: string[] = [];
  let currentLines: string[] = [];
  let currentChars = 0;
  let currentNonemptyLines = 0;

  const flush = () => {
    const chunk = currentLines.join("\n").trim();
    if (chunk) chunks.push(chunk);
    currentLines = [];
    currentChars = 0;
    currentNonemptyLines = 0;
  };

  for (const line of lines) {
    if (line.length > MEMORY_IMPORT_CHUNK_MAX_CHARS) {
      throw new Error("A memory import entry is too long. Split that entry and try again.");
    }
    const lineChars = line.length + (currentLines.length > 0 ? 1 : 0);
    const nonemptyIncrement = line.trim() ? 1 : 0;
    if (
      currentLines.length > 0 &&
      (currentChars + lineChars > MEMORY_IMPORT_CHUNK_MAX_CHARS ||
        currentNonemptyLines + nonemptyIncrement > MEMORY_IMPORT_CHUNK_MAX_NONEMPTY_LINES)
    ) {
      flush();
    }
    currentLines.push(line);
    currentChars += line.length + (currentLines.length > 1 ? 1 : 0);
    currentNonemptyLines += nonemptyIncrement;
  }
  flush();
  return chunks;
}

export async function absorbMemoryImport(
  dump: string,
  threadId: string | null,
  capture: CaptureMemory = captureMemory
): Promise<MemoryImportAbsorption> {
  const chunks = splitMemoryImportDump(dump);
  const saved: MemoryCaptureResponse["saved"] = [];
  const superseded: MemoryCaptureResponse["superseded"] = [];
  const duplicates: MemoryCaptureResponse["duplicates"] = [];
  const skipped: MemoryCaptureResponse["skipped"] = [];

  for (const message of chunks) {
    try {
      const { response, data } = await capture({ message, threadId });
      if (!response.ok || !data) {
        throw new Error("Memory import failed");
      }
      if (Array.isArray(data.saved)) saved.push(...data.saved);
      if (Array.isArray(data.superseded)) superseded.push(...data.superseded);
      if (Array.isArray(data.duplicates)) duplicates.push(...data.duplicates);
      if (Array.isArray(data.skipped)) skipped.push(...data.skipped);
    } catch (error) {
      const partial = buildMemoryImportAbsorption({ saved, superseded, duplicates, skipped });
      if (partial.absorbedCount > 0) {
        throw new MemoryImportPartialError(partial);
      }
      throw error instanceof Error ? error : new Error("Memory import failed");
    }
  }

  const absorption = buildMemoryImportAbsorption({ saved, superseded, duplicates, skipped });

  if (absorption.absorbedCount === 0) {
    throw new Error("No memories were absorbed");
  }

  return absorption;
}
