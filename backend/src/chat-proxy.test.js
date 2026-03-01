import { describe, expect, it } from "@jest/globals";
import { buildStreamUpstreamPayload, extractStreamMessage } from "./chat-proxy.js";

describe("chat proxy payload helpers", () => {
  it("extracts and trims stream message", () => {
    expect(extractStreamMessage({ message: "  hello  " })).toBe("hello");
    expect(extractStreamMessage({ message: "" })).toBe("");
    expect(extractStreamMessage(null)).toBe("");
  });

  it("preserves existing payload fields when replacing message", () => {
    const payload = buildStreamUpstreamPayload(
      {
        message: "original",
        mode: "chat",
        attachments: [{ name: "image.png" }],
        promptPrefix: "Act as a tutor",
      },
      "enriched"
    );

    expect(payload.message).toBe("enriched");
    expect(payload.mode).toBe("chat");
    expect(payload.attachments).toEqual([{ name: "image.png" }]);
    expect(payload.promptPrefix).toContain("You are ZAKI");
    expect(payload.promptPrefix).toContain("Act as a tutor");
  });

  it("adds identity guardrails when no prompt prefix exists", () => {
    const payload = buildStreamUpstreamPayload(
      {
        message: "hello",
        mode: "chat",
      },
      "hello"
    );

    expect(payload.promptPrefix).toContain("You are ZAKI");
    expect(payload.promptPrefix).toContain("Never claim to be Anthropic");
  });

  it("maps webSearch compatibility flag to webSearchEnabled", () => {
    const payload = buildStreamUpstreamPayload(
      {
        message: "hello",
        webSearch: true,
      },
      "hello"
    );

    expect(payload.webSearch).toBe(true);
    expect(payload.webSearchEnabled).toBe(true);
    expect(payload.mode).toBe("query");
  });

  it("respects explicit webSearchEnabled over legacy key", () => {
    const payload = buildStreamUpstreamPayload(
      {
        message: "hello",
        webSearch: true,
        webSearchEnabled: false,
      },
      "hello"
    );

    expect(payload.webSearchEnabled).toBe(false);
    expect(payload.mode).toBeUndefined();
  });

  it("keeps explicit mode untouched", () => {
    const payload = buildStreamUpstreamPayload(
      {
        message: "hello",
        webSearchEnabled: true,
        mode: "chat",
      },
      "hello"
    );

    expect(payload.mode).toBe("chat");
  });
});
