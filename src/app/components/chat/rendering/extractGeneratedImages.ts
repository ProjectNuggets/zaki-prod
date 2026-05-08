// Phase 4-B (2026-05-08) — Hoist agent-generated images into the chat reply.
//
// The image_generate tool returns a body like:
//
//   model: flux/dev
//   prompt: "a cat"
//   ![cat](https://...png)
//   Saved: /workspace/images/...
//   Download: https://...png
//
// The compact tool row already parses that into ToolResultBody → ImageBlock,
// but the image lives inside a collapsed tool expansion which buries the
// payload — the agent's reply ("Here's your cat!") shows above, the picture
// shows below in a tool widget. Per Nova: agent-generated images should
// render in the chat area as the reply itself.
//
// This helper scans a message's turnEvents for image_generate tool_result
// payloads, pulls every markdown image URL, and returns the unique set.
// MessageBubble renders those URLs as standalone image blocks at the top
// of the assistant bubble. Duplicates with URLs already present in the
// assistant text content are filtered by the caller (parseAssistantContent
// emits image blocks for any inline ![](...)).

import type { PersistedTurnEvent } from "../MessageBubble";

const TOOL_IMAGE_MARKDOWN_RE = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;

export type GeneratedImage = {
  url: string;
  alt: string;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isImageGenerateEvent(event: PersistedTurnEvent): boolean {
  const eventType = String(event.eventType || "").toLowerCase();
  if (
    eventType !== "tool_result" &&
    eventType !== "toolcallresult" &&
    eventType !== "tool_call_result" &&
    eventType !== "toolresult"
  ) {
    return false;
  }
  const payload = asRecord(event.payload);
  if (!payload) return false;
  const source = asRecord(payload.content) ?? payload;
  const tool =
    asString(source.name) ?? asString(source.toolName) ?? asString(source.tool);
  return tool === "image_generate";
}

function extractResultText(event: PersistedTurnEvent): string {
  const payload = asRecord(event.payload);
  if (!payload) return "";
  const source = asRecord(payload.content) ?? payload;
  return (
    asString(source.result) ??
    asString(source.output_preview) ??
    asString(source.outputPreview) ??
    asString(source.output) ??
    asString(payload.output_preview) ??
    asString(payload.output) ??
    ""
  );
}

export function extractGeneratedImages(
  turnEvents: readonly PersistedTurnEvent[] | undefined | null
): GeneratedImage[] {
  if (!turnEvents || turnEvents.length === 0) return [];
  const seen = new Set<string>();
  const result: GeneratedImage[] = [];
  for (const event of turnEvents) {
    if (!isImageGenerateEvent(event)) continue;
    const text = extractResultText(event);
    if (!text) continue;
    let match: RegExpExecArray | null;
    TOOL_IMAGE_MARKDOWN_RE.lastIndex = 0;
    while ((match = TOOL_IMAGE_MARKDOWN_RE.exec(text)) !== null) {
      const url = match[2];
      if (!url || seen.has(url)) continue;
      seen.add(url);
      result.push({ url, alt: match[1]?.trim() || "Generated image" });
    }
  }
  return result;
}
