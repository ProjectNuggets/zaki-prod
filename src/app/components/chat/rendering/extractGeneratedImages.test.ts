import "@testing-library/jest-dom";
import { describe, expect, it } from "@jest/globals";
import { extractGeneratedImages } from "./extractGeneratedImages";
import type { PersistedTurnEvent } from "../MessageBubble";

describe("extractGeneratedImages", () => {
  it("returns no images when turnEvents is empty/undefined", () => {
    expect(extractGeneratedImages(undefined)).toEqual([]);
    expect(extractGeneratedImages(null)).toEqual([]);
    expect(extractGeneratedImages([])).toEqual([]);
  });

  it("ignores tool_result events for non-image_generate tools", () => {
    const events: PersistedTurnEvent[] = [
      {
        eventType: "tool_result",
        payload: {
          name: "bash",
          result: "![chart](https://example.com/cat.png)",
        },
      },
    ];
    expect(extractGeneratedImages(events)).toEqual([]);
  });

  it("extracts a markdown image URL from an image_generate tool result", () => {
    const events: PersistedTurnEvent[] = [
      {
        eventType: "tool_result",
        payload: {
          name: "image_generate",
          result:
            "model: flux/dev\nprompt: cat\n![cat](https://together-ai-uploaded-user-images.s3.us-east-2.amazonaws.com/cat.png)\nSaved: /workspace/images/cat.png",
        },
      },
    ];
    expect(extractGeneratedImages(events)).toEqual([
      {
        url: "https://together-ai-uploaded-user-images.s3.us-east-2.amazonaws.com/cat.png",
        alt: "cat",
      },
    ]);
  });

  it("dedupes the same URL appearing in multiple events", () => {
    const events: PersistedTurnEvent[] = [
      {
        eventType: "tool_result",
        payload: {
          name: "image_generate",
          result: "![](https://x.com/a.png)",
        },
      },
      {
        eventType: "toolCallResult",
        payload: {
          name: "image_generate",
          result: "![cat](https://x.com/a.png)",
        },
      },
    ];
    expect(extractGeneratedImages(events)).toEqual([
      { url: "https://x.com/a.png", alt: "Generated image" },
    ]);
  });

  it("falls back to default alt when the markdown alt is empty", () => {
    const events: PersistedTurnEvent[] = [
      {
        eventType: "tool_result",
        payload: { name: "image_generate", result: "![](https://x.com/y.png)" },
      },
    ];
    expect(extractGeneratedImages(events)[0]?.alt).toBe("Generated image");
  });

  it("handles wrapped { content: { name, result } } payloads", () => {
    const events: PersistedTurnEvent[] = [
      {
        eventType: "tool_result",
        payload: {
          content: {
            name: "image_generate",
            output_preview: "![mountain](https://x.com/m.png)",
          },
        },
      },
    ];
    expect(extractGeneratedImages(events)).toEqual([
      { url: "https://x.com/m.png", alt: "mountain" },
    ]);
  });

  it("supports multiple distinct images in one event", () => {
    const events: PersistedTurnEvent[] = [
      {
        eventType: "tool_result",
        payload: {
          name: "image_generate",
          result:
            "![one](https://x.com/1.png)\n![two](https://x.com/2.png)\n![three](https://x.com/3.png)",
        },
      },
    ];
    const out = extractGeneratedImages(events);
    expect(out).toHaveLength(3);
    expect(out.map((i) => i.url)).toEqual([
      "https://x.com/1.png",
      "https://x.com/2.png",
      "https://x.com/3.png",
    ]);
  });

  it("ignores tool_result with no parseable URL", () => {
    const events: PersistedTurnEvent[] = [
      {
        eventType: "tool_result",
        payload: { name: "image_generate", result: "image generation failed: rate limit" },
      },
    ];
    expect(extractGeneratedImages(events)).toEqual([]);
  });
});
