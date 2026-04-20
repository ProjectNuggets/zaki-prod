import { useDeferredValue, useMemo } from "react";
import { cn } from "@/lib/utils";
import { parseMessageMarkdown } from "./parseMessageMarkdown";
import { BlockRenderer } from "./BlockRenderer";

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
  const document = useMemo(() => {
    if (!shouldRenderStructured) return { blocks: [] };
    return parseMessageMarkdown(parseSource, {
      streaming: streaming && isAssistant,
    });
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
          <span className="inline-block h-4 w-px animate-pulse rounded-full bg-zaki-brand/70" />
        </div>
      ) : null}
    </div>
  );
}
