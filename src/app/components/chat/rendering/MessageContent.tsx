import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { parseMessageMarkdown } from "./parseMessageMarkdown";
import { BlockRenderer } from "./BlockRenderer";
import type { MessageDocument } from "./types";

export type MessageContentProps = {
  content: string;
  streaming?: boolean;
  streamingVariant?: "standard" | "final_reply_reveal";
  role: "assistant" | "user";
  surface?: "chat" | "shared" | "bot";
  preserveUserFormatting?: boolean;
};

function emptyDocument(): MessageDocument {
  return { blocks: [] };
}

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
  const finalDocument = useMemo(
    () => (streaming && isAssistant ? emptyDocument() : parseMessageMarkdown(content)),
    [content, isAssistant, streaming],
  );
  const [streamingDocument, setStreamingDocument] = useState<MessageDocument>(finalDocument);

  useEffect(() => {
    if (!shouldRenderStructured) {
      setStreamingDocument(emptyDocument());
      return;
    }
    if (!streaming || !isAssistant) {
      setStreamingDocument(parseMessageMarkdown(content));
      return;
    }
    const handle = window.setTimeout(() => {
      setStreamingDocument(parseMessageMarkdown(content, { streaming: true }));
    }, 90);
    return () => window.clearTimeout(handle);
  }, [content, isAssistant, shouldRenderStructured, streaming]);

  if (!shouldRenderStructured) {
    return (
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-current [overflow-wrap:anywhere]">
        {content}
      </div>
    );
  }

  const document = streaming && isAssistant ? streamingDocument : finalDocument;

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
