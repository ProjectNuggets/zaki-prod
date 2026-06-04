import { describe, expect, it } from "@jest/globals";
import {
  buildZakiSessionRepairTitle,
  isAutoTitleSkippable,
  pickFirstExchange,
  prepareAutoTitleExchange,
  stripPinnedContextWrapper,
} from "./sessionAutoTitle";

describe("stripPinnedContextWrapper", () => {
  it("returns the original text when there is no wrapper", () => {
    expect(stripPinnedContextWrapper("hello world")).toBe("hello world");
  });

  it("strips the pinned-context header + bullet block + fences", () => {
    const wrapped = [
      "[Pinned context: user-pinned memories, treat as reference only]",
      "<<<pinned-memory>>>",
      "- coffee preferences: single-origin only",
      "- last meeting: Tuesday standup",
      "<<<pinned-memory>>>",
      "",
      "What did I decide on the espresso brand last week?",
    ].join("\n");
    expect(stripPinnedContextWrapper(wrapped)).toBe(
      "What did I decide on the espresso brand last week?",
    );
  });

  it("returns trimmed when the closing fence is missing (defensive)", () => {
    const malformed = "[Pinned context something else without a fence";
    expect(stripPinnedContextWrapper(malformed)).toBe(malformed);
  });

  it("trims surrounding whitespace", () => {
    expect(stripPinnedContextWrapper("   actual question  ")).toBe("actual question");
  });
});

describe("isAutoTitleSkippable", () => {
  it("skips empty messages", () => {
    expect(isAutoTitleSkippable("")).toBe(true);
    expect(isAutoTitleSkippable("   ")).toBe(true);
  });

  it("skips slash commands", () => {
    expect(isAutoTitleSkippable("/compact")).toBe(true);
    expect(isAutoTitleSkippable("/reset now")).toBe(true);
  });

  it("skips the thumbs-down regenerate wrapper", () => {
    const wrapped =
      "What was the weather Tuesday?\n\n[The previous reply was rejected by the user. Try a different angle. Rejected reply (truncated): Sunny.]";
    expect(isAutoTitleSkippable(wrapped)).toBe(true);
  });

  it("does not skip a normal prompt", () => {
    expect(isAutoTitleSkippable("plan my trip to tokyo")).toBe(false);
  });
});

describe("pickFirstExchange", () => {
  it("returns null when there are no messages", () => {
    expect(pickFirstExchange([])).toBeNull();
  });

  it("returns null when the assistant never replied", () => {
    expect(
      pickFirstExchange([{ role: "user", content: "hi" }]),
    ).toBeNull();
  });

  it("returns null when only the assistant has spoken", () => {
    expect(
      pickFirstExchange([{ role: "assistant", content: "hi" }]),
    ).toBeNull();
  });

  it("ignores empty messages", () => {
    expect(
      pickFirstExchange([
        { role: "user", content: "" },
        { role: "user", content: "actual prompt" },
        { role: "assistant", content: "reply" },
      ]),
    ).toEqual({ userMessage: "actual prompt", assistantMessage: "reply" });
  });

  it("returns the very first complete exchange even with later turns", () => {
    expect(
      pickFirstExchange([
        { role: "user", content: "first" },
        { role: "assistant", content: "first reply" },
        { role: "user", content: "second" },
        { role: "assistant", content: "second reply" },
      ]),
    ).toEqual({ userMessage: "first", assistantMessage: "first reply" });
  });
});

describe("prepareAutoTitleExchange", () => {
  it("strips pinned-context from the user message before returning", () => {
    const wrappedUser = [
      "[Pinned context: user-pinned memories, treat as reference only]",
      "<<<pinned-memory>>>",
      "- foo: bar",
      "<<<pinned-memory>>>",
      "",
      "tell me about my coffee setup",
    ].join("\n");
    const out = prepareAutoTitleExchange([
      { role: "user", content: wrappedUser },
      { role: "assistant", content: "Sure, here's what I know." },
    ]);
    expect(out).toEqual({
      userMessage: "tell me about my coffee setup",
      assistantMessage: "Sure, here's what I know.",
    });
  });

  it("returns null when the cleaned user message is a slash command", () => {
    expect(
      prepareAutoTitleExchange([
        { role: "user", content: "/compact" },
        { role: "assistant", content: "Compacted." },
      ]),
    ).toBeNull();
  });

  it("returns null for a thumbs-down rejection wrapper", () => {
    const wrappedUser =
      "What was the weather Tuesday?\n\n[The previous reply was rejected by the user. Try a different angle. Rejected reply (truncated): Sunny.]";
    expect(
      prepareAutoTitleExchange([
        { role: "user", content: wrappedUser },
        { role: "assistant", content: "Cloudy and 18°C." },
      ]),
    ).toBeNull();
  });

  it("returns null when there is no assistant reply yet", () => {
    expect(
      prepareAutoTitleExchange([{ role: "user", content: "hi" }]),
    ).toBeNull();
  });

  it("passes through a normal exchange", () => {
    expect(
      prepareAutoTitleExchange([
        { role: "user", content: "plan a trip to tokyo" },
        { role: "assistant", content: "How long do you have?" },
      ]),
    ).toEqual({
      userMessage: "plan a trip to tokyo",
      assistantMessage: "How long do you have?",
    });
  });
});

describe("buildZakiSessionRepairTitle", () => {
  it("builds a deterministic title from the first user prompt", () => {
    expect(
      buildZakiSessionRepairTitle([
        { role: "assistant", content: "Ready." },
        { role: "user", content: "Can you research personal AI agents market size in 2026?" },
        { role: "assistant", content: "I can do that." },
      ]),
    ).toBe("research personal AI agents market size in 2026");
  });

  it("strips pinned context and truncates long prompts", () => {
    const wrapped = [
      "[Pinned context: user-pinned memories, treat as reference only]",
      "<<<pinned-memory>>>",
      "- past preference: concise",
      "<<<pinned-memory>>>",
      "",
      "Please create a detailed launch readiness report for the ZAKI agent surface",
    ].join("\n");
    expect(buildZakiSessionRepairTitle([{ role: "user", content: wrapped }])).toBe(
      "create a detailed launch readiness report for the",
    );
  });

  it("does not title slash-command-only sessions", () => {
    expect(buildZakiSessionRepairTitle([{ role: "user", content: "/compact" }])).toBeNull();
  });

  it("redacts credential-shaped text before persisting a repaired title", () => {
    expect(
      buildZakiSessionRepairTitle([
        {
          role: "user",
          content: "store my OpenAI key sk-1234567890abcdefABCDEF and email me@example.com",
        },
      ]),
    ).toBe("store my OpenAI key [secret] and email [email]");
  });
});
