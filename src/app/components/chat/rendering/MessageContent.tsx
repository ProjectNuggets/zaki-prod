import { useDeferredValue, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { parseMessageMarkdown } from "./parseMessageMarkdown";
import { parseAssistantContent } from "./parseAssistantImages";
import { BlockRenderer } from "./BlockRenderer";
import type { MessageBlock } from "./types";

export type MessageContentProps = {
  content: string;
  streaming?: boolean;
  streamingVariant?: "standard" | "final_reply_reveal";
  role: "assistant" | "user";
  surface?: "chat" | "shared" | "bot";
  preserveUserFormatting?: boolean;
};

export function MessageContent({
  content,
  streaming = false,
  streamingVariant = "standard",
  role,
  surface = "chat",
  preserveUserFormatting = false,
}: MessageContentProps) {
  const isAssistant = role === "assistant";
  const shouldRenderStructured = isAssistant || preserveUserFormatting;
  const deferredContent = useDeferredValue(content);
  const parseSource = streaming && isAssistant ? deferredContent : content;
  const blockCacheRef = useRef<Map<string, { block: MessageBlock; key: string }>>(new Map());
  const document = useMemo(() => {
    if (!shouldRenderStructured) {
      blockCacheRef.current = new Map();
      return { blocks: [] as MessageBlock[] };
    }
    const parsedBlocks = isAssistant
      ? parseAssistantContent(parseSource, { streaming: streaming && isAssistant })
      : parseMessageMarkdown(parseSource, {
          streaming: streaming && isAssistant,
        }).blocks;
    const parsed = { blocks: parsedBlocks };
    const prev = blockCacheRef.current;
    const next = new Map<string, { block: MessageBlock; key: string }>();
    const stableBlocks = parsed.blocks.map((block) => {
      const key = JSON.stringify(block);
      const cached = prev.get(block.id);
      if (cached && cached.key === key) {
        next.set(block.id, cached);
        return cached.block;
      }
      const entry = { block, key };
      next.set(block.id, entry);
      return block;
    });
    blockCacheRef.current = next;
    return { blocks: stableBlocks };
  }, [parseSource, shouldRenderStructured, streaming, isAssistant]);

  if (!shouldRenderStructured) {
    return (
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-current [overflow-wrap:anywhere]">
        {content}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "zaki-message-content w-full max-w-[72ch] text-left rtl:text-right",
        surface === "shared" && "max-w-[70ch]",
        isAssistant ? "space-y-3.5" : "space-y-2.5 text-sm leading-relaxed",
      )}
    >
      {document.blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
      {streaming &&
      isAssistant &&
      streamingVariant !== "final_reply_reveal" &&
      content.trim() ? (
        <div aria-hidden className="inline-flex h-5 items-end">
          <span className="zaki-streaming-caret inline-block" />
        </div>
      ) : null}
    </div>
  );
}
