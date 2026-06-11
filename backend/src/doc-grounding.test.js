import { describe, expect, it } from "@jest/globals";
import {
  DOC_CONTEXT_MARKER_OPEN,
  DOC_CONTEXT_MARKER_CLOSE,
  shouldFetchDocContext,
  normalizeVectorResults,
  buildDocContextBlock,
  extractDocSources,
  fetchWorkspaceDocContext,
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

describe("fetchWorkspaceDocContext", () => {
  const okResp = (json) => ({ ok: true, json: async () => json });

  it("returns block + sources when the engine returns chunks", async () => {
    let calledPath = null;
    let calledBody = null;
    const adminRequest = async (path, opts) => {
      calledPath = path;
      calledBody = JSON.parse(opts.body);
      return okResp({ results: [{ id: "1", text: "Net-30 terms.", metadata: { title: "c.pdf" }, score: 0.8 }] });
    };
    const out = await fetchWorkspaceDocContext({ adminRequest, slug: "space-1", message: "what are the payment terms?" });
    expect(calledPath).toBe("/v1/workspace/space-1/vector-search");
    expect(calledBody.query).toBe("what are the payment terms?");
    expect(out.block).toContain('<document name="c.pdf">');
    expect(out.sources).toEqual([
      expect.objectContaining({ id: "1", title: "c.pdf" }),
    ]);
  });

  it("returns empty for greetings WITHOUT calling the engine", async () => {
    let called = false;
    const adminRequest = async () => { called = true; return okResp({ results: [] }); };
    const out = await fetchWorkspaceDocContext({ adminRequest, slug: "s", message: "hi" });
    expect(called).toBe(false);
    expect(out).toEqual({ block: "", sources: [] });
  });

  it("returns empty when the engine reports no embeddings", async () => {
    const adminRequest = async () => okResp({ results: [], message: "No embeddings found for this workspace." });
    const out = await fetchWorkspaceDocContext({ adminRequest, slug: "s", message: "summarize my uploaded doc" });
    expect(out).toEqual({ block: "", sources: [] });
  });

  it("never throws — non-ok response or a thrown adminRequest yields empty", async () => {
    const bad = await fetchWorkspaceDocContext({ adminRequest: async () => ({ ok: false }), slug: "s", message: "tell me about the report" });
    expect(bad).toEqual({ block: "", sources: [] });
    const threw = await fetchWorkspaceDocContext({ adminRequest: async () => { throw new Error("boom"); }, slug: "s", message: "tell me about the report" });
    expect(threw).toEqual({ block: "", sources: [] });
  });
});
