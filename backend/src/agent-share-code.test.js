import { describe, it, expect } from "@jest/globals";
import { isSafeAgentShareCode } from "./agent-share-code.js";

describe("isSafeAgentShareCode min-length (>=16)", () => {
  it("rejects codes shorter than 16 chars", () => {
    expect(isSafeAgentShareCode("a".repeat(8))).toBe(false);
    expect(isSafeAgentShareCode("a".repeat(15))).toBe(false);
  });
  it("accepts a 16-char code (boundary)", () => {
    expect(isSafeAgentShareCode("a".repeat(16))).toBe(true);
  });
  it("accepts a realistic long random share code", () => {
    expect(isSafeAgentShareCode("Ab3_dEf-Gh1jkLmn0pqRsTuvwXyz")).toBe(true);
  });
  it("rejects codes longer than 128 chars", () => {
    expect(isSafeAgentShareCode("a".repeat(129))).toBe(false);
  });
  it("rejects empty / whitespace / non-string / leading-underscore", () => {
    expect(isSafeAgentShareCode("")).toBe(false);
    expect(isSafeAgentShareCode("   ")).toBe(false);
    expect(isSafeAgentShareCode(null)).toBe(false);
    expect(isSafeAgentShareCode("_" + "a".repeat(20))).toBe(false);
  });
});
