import { describe, expect, it } from "@jest/globals";
import { estimateChatUnits, actualChatUnits, baseUnitsForAction, deterministicGrantId } from "./chat-meter.js";

describe("chat-meter: deterministicGrantId (idempotency fix)", () => {
  it("is stable for the same key (a retry collides → charged once)", () => {
    expect(deterministicGrantId("req:ws:thread:turn")).toBe(deterministicGrantId("req:ws:thread:turn"));
  });
  it("differs for different keys (distinct turns get distinct grants)", () => {
    expect(deterministicGrantId("k1")).not.toBe(deterministicGrantId("k2"));
  });
  it("is a valid UUID shape for the Postgres uuid column", () => {
    expect(deterministicGrantId("anything")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});

describe("chat-meter: baseUnitsForAction", () => {
  it("matches the legacy per-action base units", () => {
    expect(baseUnitsForAction("spaces_chat_turn")).toBe(1);
    expect(baseUnitsForAction("memory_read")).toBe(0.25);
    expect(baseUnitsForAction("spaces_chat_search")).toBe(1.5);
    expect(baseUnitsForAction("spaces_chat_query")).toBe(1.25);
    expect(baseUnitsForAction("spaces_chat_synthetic")).toBe(0.5);
    expect(baseUnitsForAction("")).toBe(1);
  });
});

describe("chat-meter: estimateChatUnits (reserve)", () => {
  it("floors at the action base for short messages", () => {
    expect(estimateChatUnits({ inputChars: 100, action: "spaces_chat_turn" })).toBe(1);
    expect(estimateChatUnits({ inputChars: 100, action: "memory_read" })).toBe(0.25);
  });
  it("scales with message length when it exceeds the base", () => {
    // 8000 chars / 4000 = 2 units > base 1
    expect(estimateChatUnits({ inputChars: 8000, action: "spaces_chat_turn" })).toBe(2);
  });
  it("handles zero/missing input", () => {
    expect(estimateChatUnits()).toBe(1);
    expect(estimateChatUnits({ inputChars: 0, action: "memory_read" })).toBe(0.25);
  });
});

describe("chat-meter: actualChatUnits (settle)", () => {
  it("includes output chars in the count", () => {
    // (2000 in + 6000 out)/4000 = 2 units
    expect(actualChatUnits({ inputChars: 2000, outputChars: 6000, action: "spaces_chat_turn" })).toBe(2);
  });
  it("floors at the action base when input+output are tiny", () => {
    expect(actualChatUnits({ inputChars: 100, outputChars: 200, action: "spaces_chat_turn" })).toBe(1);
    expect(actualChatUnits({ inputChars: 50, outputChars: 50, action: "memory_read" })).toBe(0.25);
  });
  it("a long answer costs more than the input-only estimate (so reserve must be generous or it caps)", () => {
    const est = estimateChatUnits({ inputChars: 400, action: "spaces_chat_turn" }); // base 1
    const act = actualChatUnits({ inputChars: 400, outputChars: 12000, action: "spaces_chat_turn" }); // (400+12000)/4000 = 3.1
    expect(act).toBeGreaterThan(est);
  });
});
