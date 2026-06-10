import { afterEach, describe, expect, it } from "@jest/globals";
import { shouldSkipChatMemoryContext } from "./injection-gate.js";

const NORMAL = { mode: "chat" };

afterEach(() => {
  delete process.env.ZAKI_SYNC_MEMORY_INJECTION_ENABLED;
});

describe("memory injection gate (always-on)", () => {
  it("injects by default for a normal personal turn", () => {
    expect(shouldSkipChatMemoryContext(NORMAL, "I'm planning a trip soon")).toBe(false);
  });

  it("injects for a recall question (the bug we fixed)", () => {
    expect(shouldSkipChatMemoryContext(NORMAL, "do I have any travel plans?")).toBe(false);
  });

  it("injects regardless of mode==='query' (no longer suppresses memory)", () => {
    expect(shouldSkipChatMemoryContext({ mode: "query" }, "what's the capital of France")).toBe(
      false
    );
  });

  it("injects for prompts longer than 500 chars", () => {
    expect(shouldSkipChatMemoryContext(NORMAL, "x".repeat(1200))).toBe(false);
  });

  it("injects for a non-allowlisted personal phrasing", () => {
    // Previously skipped: matched none of the legacy strongPersonalSignals.
    expect(shouldSkipChatMemoryContext(NORMAL, "anything coming up for me this week?")).toBe(false);
  });

  it("skips for web-search turns (both flag spellings)", () => {
    expect(shouldSkipChatMemoryContext({ webSearchEnabled: true }, "latest news")).toBe(true);
    expect(shouldSkipChatMemoryContext({ webSearch: true }, "latest news")).toBe(true);
  });

  it("skips for @agent turns (envelope must not precede the agent prefix)", () => {
    expect(shouldSkipChatMemoryContext(NORMAL, "@agent search the web for X")).toBe(true);
  });

  it("skips entirely when the kill-switch is off", () => {
    process.env.ZAKI_SYNC_MEMORY_INJECTION_ENABLED = "false";
    expect(shouldSkipChatMemoryContext(NORMAL, "I like tea")).toBe(true);
  });
});
