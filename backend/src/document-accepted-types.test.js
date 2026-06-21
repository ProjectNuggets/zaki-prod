import { describe, expect, test } from "@jest/globals";
import {
  DEFAULT_ACCEPTED_DOCUMENT_TYPES,
  buildAcceptedDocumentTypesFallback,
  normalizeAcceptedDocumentTypesPayload,
} from "./document-accepted-types.js";

describe("document accepted types contract", () => {
  test("fallback returns a conservative document allowlist", () => {
    const payload = buildAcceptedDocumentTypesFallback();

    expect(payload).toMatchObject({
      success: true,
      degraded: true,
      source: "fallback",
      reason: "upstream_unavailable",
    });
    expect(payload.types["application/pdf"]).toEqual([".pdf"]);
    expect(payload.types["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]).toEqual([
      ".docx",
    ]);
    expect(Object.values(payload.types).flat()).not.toContain(".png");
  });

  test("normalizes upstream MIME-to-extension payloads", () => {
    const payload = normalizeAcceptedDocumentTypesPayload({
      success: true,
      types: {
        " Application/PDF ": [".PDF", ".pdf", "pdf", ".unsafe/path"],
        "text/plain": [".TXT", "", ".md"],
        not_a_mime: [".exe"],
        "image/png": "not-an-array",
      },
    });

    expect(payload.success).toBe(true);
    expect(payload.types).toEqual({
      "application/pdf": [".pdf"],
      "text/plain": [".txt", ".md"],
    });
  });

  test("falls back when upstream omits usable types", () => {
    const payload = normalizeAcceptedDocumentTypesPayload({ types: { "text/plain": ["txt"] } });

    expect(payload).toEqual({
      success: true,
      degraded: true,
      source: "fallback",
      reason: "upstream_empty",
      types: DEFAULT_ACCEPTED_DOCUMENT_TYPES,
    });
  });
});
