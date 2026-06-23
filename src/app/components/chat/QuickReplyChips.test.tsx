import "@testing-library/jest-dom";
import { describe, expect, it } from "@jest/globals";
import { buildAgentQuickReplyItems } from "./QuickReplyChips";
import type { Message } from "@/types";

describe("buildAgentQuickReplyItems", () => {
  it("uses facet prompts for strategy-shaped Agent replies", () => {
    const message: Message = {
      id: "assistant-1",
      role: "assistant",
      content: "The GTM strategy needs sharper positioning and pricing.",
    };

    expect(buildAgentQuickReplyItems({ message, entries: [] })?.map((item) => item.label)).toEqual([
      "Ask the critic",
      "Get the blunt take",
      "Try the sideways take",
    ]);
  });

  it("uses answer actions after a facet has already run", () => {
    const message: Message = {
      id: "assistant-1",
      role: "assistant",
      content: "My inner critic says the launch plan is too broad.",
    };

    expect(buildAgentQuickReplyItems({ message, entries: [] })?.map((item) => item.label)).toEqual([
      "Tighten this",
      "Turn into plan",
    ]);
  });

  it("does not build Agent suggestions for empty replies", () => {
    const message: Message = {
      id: "assistant-1",
      role: "assistant",
      content: "",
    };

    expect(buildAgentQuickReplyItems({ message, entries: [] })).toBeUndefined();
  });
});
