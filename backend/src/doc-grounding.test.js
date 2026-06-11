import { describe, expect, it } from "@jest/globals";
import {
  DOC_CONTEXT_MARKER_OPEN,
  DOC_CONTEXT_MARKER_CLOSE,
  shouldFetchDocContext,
  normalizeVectorResults,
  buildDocContextBlock,
  extractDocSources,
} from "./doc-grounding.js";

describe("shouldFetchDocContext", () => {
  it("skips greetings and trivially short messages", () => {
    expect(shouldFetchDocContext("hi")).toBe(false);
    expect(shouldFetchDocContext("  thanks  ")).toBe(false);
    expect(shouldFetchDocContext("سلام")).toBe(false);
    expect(shouldFetchDocContext("ok")).toBe(false);
  });
  it("fetches for substantive questions", () => {
    expect(shouldFetchDocContext("summarize the contract I uploaded")).toBe(true);
    expect(shouldFetchDocContext("ما هي شروط العقد؟")).toBe(true);
  });
});

describe("normalizeVectorResults", () => {
  it("keeps only non-empty text chunks and pulls a title", () => {
    const out = normalizeVectorResults({
      results: [
        { id: "1", text: "  chunk one  ", metadata: { title: "contract.pdf" }, score: 0.8 },
        { id: "2", text: "", metadata: { title: "x" } },
        { id: "3", text: "chunk three", metadata: { chunkSource: "notes.txt" } },
        { bad: true },
      ],
    });
    expect(out).toEqual([
      { id: "1", text: "chunk one", title: "contract.pdf", score: 0.8 },
      { id: "3", text: "chunk three", title: "notes.txt", score: null },
    ]);
  });
  it("returns [] for junk", () => {
    expect(normalizeVectorResults(null)).toEqual([]);
    expect(normalizeVectorResults({})).toEqual([]);
  });
});

describe("buildDocContextBlock", () => {
  it("returns '' for no chunks", () => {
    expect(buildDocContextBlock([])).toBe("");
  });
  it("wraps engine-native <attached_documents> in the strippable marker", () => {
    const block = buildDocContextBlock([
      { id: "1", text: "Payment is net-30.", title: "contract.pdf", score: 0.9 },
    ]);
    expect(block.startsWith(DOC_CONTEXT_MARKER_OPEN)).toBe(true);
    expect(block.trimEnd().endsWith(DOC_CONTEXT_MARKER_CLOSE)).toBe(true);
    expect(block).toContain("<attached_documents>");
    expect(block).toContain('<document name="contract.pdf">');
    expect(block).toContain("Payment is net-30.");
  });
  it("caps to 6 chunks and sanitizes quotes in the name", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ id: String(i), text: `c${i}`, title: `d"${i}".pdf` }));
    const block = buildDocContextBlock(many);
    expect((block.match(/<document /g) || []).length).toBe(6);
    expect(block).not.toContain('name="d"');
  });
});

describe("extractDocSources", () => {
  it("returns one citation per distinct document with a snippet", () => {
    const out = extractDocSources([
      { id: "1", text: "alpha beta gamma", title: "a.pdf", score: 0.7 },
      { id: "2", text: "second chunk same doc", title: "a.pdf", score: 0.6 },
      { id: "3", text: "other doc", title: "b.txt", score: 0.5 },
    ]);
    expect(out.map((s) => s.title)).toEqual(["a.pdf", "b.txt"]);
    expect(out[0]).toMatchObject({ id: "1", title: "a.pdf" });
    expect(out[0].snippet).toContain("alpha");
  });
});
