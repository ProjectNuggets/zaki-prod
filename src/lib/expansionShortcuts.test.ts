import "@testing-library/jest-dom";
import { describe, expect, it } from "@jest/globals";
import { applyExpansion } from "./expansionShortcuts";

describe("applyExpansion", () => {
  it("expands a known trigger at the start of input", () => {
    const out = applyExpansion(":weather ", 9);
    expect(out).not.toBeNull();
    expect(out?.value).toBe("What's the weather today? ");
    expect(out?.caret).toBe(out?.value.length);
  });

  it("expands a trigger preceded by whitespace mid-text", () => {
    const value = "Hi :tldr ";
    const out = applyExpansion(value, value.length);
    expect(out?.value).toBe("Hi Give me a 2-bullet TL;DR of the conversation above. ");
  });

  it("is case-insensitive", () => {
    const out = applyExpansion(":WEATHER ", 9);
    expect(out?.value).toBe("What's the weather today? ");
  });

  it("returns null for unknown triggers", () => {
    expect(applyExpansion(":nothing ", 9)).toBeNull();
  });

  it("returns null when the caret is not at the end of the trigger", () => {
    const value = ":weather foo";
    expect(applyExpansion(value, 4)).toBeNull(); // caret in middle of the trigger
    expect(applyExpansion(value, 12)).toBeNull(); // caret after the trigger but past the trailing space
  });

  it("does not expand a trigger embedded inside a word", () => {
    // ':weather' must follow the start of input or whitespace
    expect(applyExpansion("foo:weather ", 12)).toBeNull();
  });

  it("requires the trailing space to fire", () => {
    expect(applyExpansion(":weather", 8)).toBeNull();
  });

  it("preserves text after the caret", () => {
    const value = ":brief and then more";
    const caret = ":brief ".length;
    const out = applyExpansion(value, caret);
    expect(out?.value).toBe("Brief me on what I missed. and then more");
    expect(out?.caret).toBe("Brief me on what I missed. ".length);
  });
});
