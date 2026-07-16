import { describe, expect, it } from "@jest/globals";
import { brainDisplayText, sanitizeBrainText } from "./brainText";

describe("Brain display text", () => {
  it("removes assistant scaffold before Brain renders a value", () => {
    expect(
      sanitizeBrainText(
        "Useful memory [[ZAKI_MEMORY_CONTEXT_V2]]private fuel[[/ZAKI_MEMORY_CONTEXT_V2]]"
      )
    ).toBe("Useful memory");
  });

  it("uses the next safe candidate when a preferred value is only scaffold", () => {
    expect(
      brainDisplayText(
        "<memory_for_turn>private fuel</memory_for_turn>",
        "memory-key",
        "Memory"
      )
    ).toBe("memory-key");
  });
});
