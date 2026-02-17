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

    expect(payload).toEqual({
      message: "enriched",
      mode: "chat",
      attachments: [{ name: "image.png" }],
      promptPrefix: "Act as a tutor",
    });
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
