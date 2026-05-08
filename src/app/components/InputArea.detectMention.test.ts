import { describe, expect, it } from "@jest/globals";
import { detectMention } from "./InputArea";

describe("detectMention", () => {
  it("detects @ at start of input", () => {
    const out = detectMention("@espr", 5);
    expect(out.active).toBe(true);
    expect(out.filter).toBe("espr");
    expect(out.startPos).toBe(0);
  });

  it("detects @ after a space", () => {
    const out = detectMention("hello @es", 9);
    expect(out.active).toBe(true);
    expect(out.filter).toBe("es");
    expect(out.startPos).toBe(6);
  });

  it("detects @ after a newline", () => {
    const value = "line one\n@es";
    const out = detectMention(value, value.length);
    expect(out.active).toBe(true);
    expect(out.filter).toBe("es");
  });

  it("does NOT trigger on @ in the middle of a word (mid-word)", () => {
    const out = detectMention("hello@world", 11);
    expect(out.active).toBe(false);
  });

  it("does NOT trigger on @ inside an email", () => {
    const out = detectMention("ping foo@bar.com tomorrow", 16);
    expect(out.active).toBe(false);
  });

  it("closes the mention as soon as the user types a space", () => {
    const out = detectMention("@espresso ", 10);
    expect(out.active).toBe(false);
  });

  it("returns inactive on empty input", () => {
    expect(detectMention("", 0).active).toBe(false);
    expect(detectMention("", 5).active).toBe(false);
  });

  it("returns inactive when there is no @ before the cursor", () => {
    expect(detectMention("nothing here", 7).active).toBe(false);
  });

  it("operates on the substring before the cursor only", () => {
    // Cursor sits before the @, so it's not part of `before`.
    const out = detectMention("hi @later", 2);
    expect(out.active).toBe(false);
  });

  it("returns the @ position as startPos so callers can splice", () => {
    const out = detectMention("write to @sara please", 14);
    expect(out.active).toBe(true);
    expect(out.filter).toBe("sara");
    expect(out.startPos).toBe(9);
  });
});
