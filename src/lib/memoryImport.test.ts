import { describe, expect, it } from "@jest/globals";
import {
  buildMemoryImportTurn,
  settleMemoryUndosNewestFirst,
  splitMemoryImportBySection,
} from "./memoryImport";

const HEADERS = ["Instructions", "Identity", "Work", "Projects", "Preferences"];

function dumpWith(headers: string[], entriesPerSection = 2): string {
  return headers
    .map((h, i) =>
      [h, ...Array.from({ length: entriesPerSection }, (_, n) => `[2026-07-18] - fact ${i}-${n}`)].join("\n")
    )
    .join("\n\n");
}

describe("splitMemoryImportBySection", () => {
  it("splits the five canonical sections the import prompt asks for", () => {
    const out = splitMemoryImportBySection(dumpWith(HEADERS));
    expect(out).toHaveLength(5);
    expect(out[1]).toContain("Identity");
    expect(out[1]).toContain("fact 1-0");
  });

  it("tolerates the header shapes real models actually emit", () => {
    const out = splitMemoryImportBySection(
      ["## Identity", "[2026-07-18] - a", "**2. Work**", "[2026-07-18] - b", "PROJECTS", "[2026-07-18] - c", "4) Preferences:", "[2026-07-18] - d"].join("\n")
    );
    expect(out).toHaveLength(4);
  });

  it("sends the whole dump as ONE turn when there is not enough structure to split on", () => {
    // A wrong split is worse than no split — we must not guess.
    const out = splitMemoryImportBySection("Identity\n[2026-07-18] - only one header here");
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("only one header here");
  });

  it("keeps a preamble before the first header instead of dropping it", () => {
    const out = splitMemoryImportBySection(
      ["here is my export", "Identity", "[2026-07-18] - a", "Work", "[2026-07-18] - b"].join("\n")
    );
    expect(out.join("\n")).toContain("here is my export");
  });

  it("never emits a chunk that the server would reject, and repeats the header on each part", () => {
    const big = ["Projects", ...Array.from({ length: 400 }, (_, n) => `[2026-07-18] - project entry number ${n} with some descriptive text`)].join("\n");
    const out = splitMemoryImportBySection(`Identity\n[2026-07-18] - a\n\n${big}`);
    const projectParts = out.filter((p) => p.startsWith("Projects"));
    expect(projectParts.length).toBeGreaterThan(1);
    // 8000 is the server cap (MAX_STREAM_MESSAGE_CHARS); the prefix must still fit.
    out.forEach((chunk) => expect(buildMemoryImportTurn(chunk, 1, out.length).length).toBeLessThan(8000));
  });

  it("loses no content — every entry survives into some chunk", () => {
    const dump = dumpWith(HEADERS, 5);
    const joined = splitMemoryImportBySection(dump).join("\n");
    dump
      .split("\n")
      .filter((l) => l.startsWith("[2026-07-18]"))
      .forEach((entry) => expect(joined).toContain(entry));
  });

  it("throws rather than silently truncating a single unsplittable line", () => {
    expect(() => splitMemoryImportBySection(`Identity\n${"x".repeat(7100)}\nWork\n[2026-07-18] - b`)).toThrow(
      /too long/i
    );
  });

  it("returns nothing for an empty paste", () => {
    expect(splitMemoryImportBySection("   \n  ")).toEqual([]);
  });
});

describe("buildMemoryImportTurn", () => {
  it("states the entry count so the ask is checkable, and preserves the body verbatim", () => {
    const section = "Identity\n[2026-07-18] - a\n[2026-07-18] - b\n[2026-07-18] - c";
    const turn = buildMemoryImportTurn(section, 2, 5);
    expect(turn).toContain("part 2 of 5");
    expect(turn).toContain("3 entries");
    expect(turn.endsWith(section)).toBe(true);
  });

  it("omits the part suffix for a single-turn import and singularises one entry", () => {
    const turn = buildMemoryImportTurn("Identity\n[2026-07-18] - only", 1, 1);
    expect(turn).not.toContain("part 1 of 1");
    expect(turn).toContain("1 entry");
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

describe("WP-MEM6 regression: the loop contract the refs exist to protect", () => {
  // These do not exercise React, but they pin the invariants the two ChatArea refs were added for.
  // If either ref is removed, the loop silently sends fewer turns than there are sections — the
  // user loses memories with NO error — so the section count is the contract worth asserting.
  it("produces one turn per section, each independently sendable", () => {
    const dump = ["Identity", "[2026-07-18] - a", "Work", "[2026-07-18] - b", "Projects", "[2026-07-18] - c"].join("\n");
    const sections = splitMemoryImportBySection(dump);
    expect(sections).toHaveLength(3);
    const turns = sections.map((s, i) => buildMemoryImportTurn(s, i + 1, sections.length));
    expect(turns).toHaveLength(3);
    turns.forEach((turn, i) => {
      expect(turn).toContain(`part ${i + 1} of 3`);
      expect(turn.length).toBeLessThan(8000); // server MAX_STREAM_MESSAGE_CHARS
    });
  });

  it("keeps every turn under the server cap even for a large real-world export", () => {
    const big = ["Identity", "[2026-07-18] - name is Sam"]
      .concat(["Projects"], Array.from({ length: 300 }, (_, n) => `[2026-07-18] - project ${n} with a reasonably long description of the work`))
      .join("\n");
    const sections = splitMemoryImportBySection(big);
    expect(sections.length).toBeGreaterThan(2);
    sections.forEach((s, i) =>
      expect(buildMemoryImportTurn(s, i + 1, sections.length).length).toBeLessThan(8000)
    );
  });
});
