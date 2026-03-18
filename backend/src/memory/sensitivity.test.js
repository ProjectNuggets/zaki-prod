import { describe, expect, it } from "@jest/globals";
import { classifySensitiveMemoryCandidate } from "./sensitivity.js";

describe("memory sensitivity classifier", () => {
  it("detects phone numbers without requiring an explicit keyword", () => {
    const result = classifySensitiveMemoryCandidate({
      content: "Reach me on +49 170 123 4567",
      type: "fact",
    });

    expect(result).toEqual(
      expect.objectContaining({
        sensitive: true,
        reason: "pii_phone",
      })
    );
  });

  it("detects email addresses as sensitive contact details", () => {
    const result = classifySensitiveMemoryCandidate({
      content: "alice@example.com",
      type: "fact",
    });

    expect(result).toEqual(
      expect.objectContaining({
        sensitive: true,
        reason: "pii_email",
      })
    );
  });

  it("detects Arabic medical details as sensitive", () => {
    const result = classifySensitiveMemoryCandidate({
      content: "أعاني من القلق وأتناول دواء يومي",
      type: "fact",
    });

    expect(result).toEqual(
      expect.objectContaining({
        sensitive: true,
        reason: "sensitive_health",
      })
    );
  });

  it("detects address-like content without the literal word address", () => {
    const result = classifySensitiveMemoryCandidate({
      content: "12 Baker Street, London",
      type: "fact",
    });

    expect(result).toEqual(
      expect.objectContaining({
        sensitive: true,
        reason: "pii_address",
      })
    );
  });
});
