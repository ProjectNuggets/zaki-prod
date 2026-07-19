/**
 * Memory import helpers.
 *
 * WP-MEM6: the import no longer has a transport of its own. The pasted dump is sent through the
 * NORMAL agent send path, so it lands in the store the agent and the Brain page actually read.
 * Previously it POSTed /api/memory/capture, which writes the Hub store (public.memories, keyed by
 * email) — a store the agent cannot see. Users imported a profile, were told it was stored, and the
 * agent knew none of it.
 *
 * What remains here is pure text shaping. No network, no imports.
 */

/** Section headers the import prompt asks the foreign model to emit (MemoryImportSheet). */
const SECTION_HEADERS = ["instructions", "identity", "work", "projects", "preferences"] as const;

/**
 * Tolerant header matcher. The foreign model is *asked* for these headers but nothing guarantees the
 * formatting, so accept the shapes real models actually produce: "## Identity", "**2. Identity**",
 * "IDENTITY", "3) Work:", "- Preferences".
 */
const SECTION_HEADER_RE = new RegExp(
  `^[\\s#*_>-]*(?:\\d+[.)]\\s*)?[#*_\\s]*(${SECTION_HEADERS.join("|")})\\b[\\s:*_#-]*$`,
  "i"
);

/**
 * Per-message ceiling. The server rejects >8000 chars with a non-retryable 400
 * (MAX_STREAM_MESSAGE_CHARS in backend/src/index.js), and we prepend a short instruction line, so
 * leave headroom rather than sit on the limit.
 *
 * ponytail: one constant mirroring a server constant that changes rarely, not a config knob.
 * Ceiling: if the server cap moves this must move with it — the split tests pin the relationship.
 */
const SECTION_MAX_CHARS = 7000;

/** Entry lines look like "[2026-07-18] - fact". Fall back to any substantive line. */
const ENTRY_LINE_RE = /^\s*\[[^\]]+\]\s*-\s*\S/;

function isHeaderLine(line: string): boolean {
  return SECTION_HEADER_RE.test(line.trim());
}

/**
 * Split an oversized section on entry boundaries, repeating its header on every part so each turn
 * still carries the context that gives its entries meaning.
 */
function splitOversizedSection(header: string | null, body: string[]): string[] {
  const prefix = header ? `${header}\n` : "";
  const parts: string[] = [];
  let current: string[] = [];

  const flush = () => {
    if (current.length === 0) return;
    parts.push(`${prefix}${current.join("\n")}`.trim());
    current = [];
  };

  for (const line of body) {
    // A single line that cannot fit is unsplittable — fail loudly rather than silently truncate
    // someone's memories.
    if (prefix.length + line.length > SECTION_MAX_CHARS) {
      throw new Error("One line of this import is too long to send. Shorten it and try again.");
    }
    const projected = prefix.length + current.join("\n").length + line.length + 1;
    if (projected > SECTION_MAX_CHARS && current.length > 0) flush();
    current.push(line);
  }
  flush();
  return parts;
}

/**
 * Split a pasted dump into agent-sized turns on SEMANTIC boundaries.
 *
 * The previous implementation chunked blindly at 6000 chars / 8 non-empty lines, which could cut a
 * section away from the header that gave its entries meaning. Here a chunk is a section.
 *
 * If the dump has fewer than two recognisable headers we do NOT guess — the whole dump goes as one
 * turn (still size-bounded). A wrong split is worse than no split.
 */
export function splitMemoryImportBySection(dump: string): string[] {
  const normalized = String(dump || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const headerIndexes = lines.reduce<number[]>((acc, line, i) => {
    if (isHeaderLine(line)) acc.push(i);
    return acc;
  }, []);

  // Not enough structure to split on meaning — send it whole (still size-bounded).
  if (headerIndexes.length < 2) {
    return splitOversizedSection(null, lines).filter(Boolean);
  }

  const sections: string[] = [];
  // Any preamble before the first header belongs with the first section, not dropped.
  const preamble = lines.slice(0, headerIndexes[0]);

  headerIndexes.forEach((start, idx) => {
    const end = idx + 1 < headerIndexes.length ? headerIndexes[idx + 1] : lines.length;
    const header = lines[start] ?? null;
    const body = lines.slice(start + 1, end);
    const withPreamble =
      idx === 0 && preamble.some((l) => l.trim()) ? [...preamble, ...body] : body;
    if (!withPreamble.some((l) => l.trim())) return; // empty section, skip
    sections.push(...splitOversizedSection(header, withPreamble));
  });

  return sections.filter(Boolean);
}

/**
 * Wrap a section as a user turn.
 *
 * The entry count turns a vague "save these" into a checkable contract, which is the only
 * client-side lever we have: the engine's own prompt tells the model to store selectively and to
 * confirm each write, both of which suppress bulk saving.
 */
export function buildMemoryImportTurn(section: string, index: number, total: number): string {
  const lines = section.split("\n");
  const entryCount =
    lines.filter((l) => ENTRY_LINE_RE.test(l)).length ||
    lines.filter((l) => l.trim() && !isHeaderLine(l)).length;
  const part = total > 1 ? `, part ${index} of ${total}` : "";
  return `Here are my memories${part} — ${entryCount} ${
    entryCount === 1 ? "entry" : "entries"
  }. Save each one as a separate memory, then confirm what you saved.\n\n${section}`;
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
