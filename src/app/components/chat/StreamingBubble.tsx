import { useEffect, useRef, useState } from "react";
import { CenterLogo } from "../icons";
import { MessageActions } from "./MessageActions";
import { MessageContent } from "./rendering/MessageContent";
import { stripToolCallMarkup } from "./rendering/toolMarkup";

interface StreamingBubbleProps {
  content: string;
  isStreaming?: boolean;
  badgeLabel?: string;
  helperText?: string;
  streamingModeVariant?: "thinking" | "final_reply_reveal";
  botMode?: boolean;
  showActions?: boolean;
  onCopyMessage?: (message: { id: string; role: "assistant"; content: string }) => void;
  onRegenerateMessage?: (message: { id: string; role: "assistant"; content: string }) => void;
  onThumbsUpMessage?: (message: { id: string; role: "assistant"; content: string }) => void;
}

export function StreamingBubble({
  content,
  isStreaming = false,
  badgeLabel,
  helperText,
  streamingModeVariant = "thinking",
  botMode = false,
  showActions = false,
  onCopyMessage,
  onRegenerateMessage,
  onThumbsUpMessage,
}: StreamingBubbleProps) {
  const [displayedContent, setDisplayedContent] = useState("");
  const lastContentLenRef = useRef(0);

  useEffect(() => {
    if (!content) {
      setDisplayedContent("");
      return;
    }
    setDisplayedContent(stripToolCallMarkup(content));
  }, [content]);

  useEffect(() => {
    if (content.length < lastContentLenRef.current) {
      setDisplayedContent("");
    }
    lastContentLenRef.current = content.length;
  }, [content.length]);

  const agentRune = isStreaming ? "▸" : "✓";

  return (
    <div
      className={[
        "zaki-message-row zaki-message-row--assistant flex gap-4 justify-start items-start zaki-message-enter-assistant",
        isStreaming ? "is-streaming" : "",
        streamingModeVariant === "final_reply_reveal" ? "zaki-message-reveal" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-message-role="assistant"
      data-streaming={isStreaming ? "true" : undefined}
    >
      <div
        className="zaki-message-avatar size-8 shrink-0 flex items-start justify-center pt-[6px]"
        data-state={isStreaming ? "streaming" : "done"}
      >
        {botMode ? (
          <span className="zaki-message-rune" aria-hidden>
            {agentRune}
          </span>
        ) : (
          <div className="scale-75">
            <CenterLogo />
          </div>
        )}
      </div>

      <div className="zaki-message-stack w-full max-w-[780px] flex flex-col gap-2 items-start">
        {botMode ? (
          <div className="zaki-message-meta zaki-message-meta--assistant">
            <strong>ZAKI</strong>
          </div>
        ) : null}
        {badgeLabel ? (
          <span
            className={[
              "zaki-streaming-badge inline-flex items-center rounded-full border border-zaki bg-zaki-raised px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zaki-muted shadow-sm dark:border-[rgba(240,236,230,0.08)] dark:bg-[#141210]",
              streamingModeVariant === "final_reply_reveal" ? "zaki-process-enter" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {badgeLabel}
          </span>
        ) : null}
        {helperText && !content.trim() ? (
          <div className="zaki-streaming-helper zaki-process-enter rounded-zaki-md border border-zaki bg-zaki-raised px-3 py-2 text-xs font-medium text-zaki-secondary shadow-sm dark:border-[rgba(240,236,230,0.08)] dark:bg-[#141210]">
            {helperText}
          </div>
        ) : null}
        <div
          className={[
            "zaki-message-bubble zaki-assistant-bubble w-full px-0 py-0 text-sm leading-relaxed text-zaki-primary",
            isStreaming
              ? "bg-transparent"
              : "bg-transparent",
          ].join(" ")}
        >
          <MessageContent
            content={displayedContent}
            role="assistant"
            surface="chat"
            streaming={isStreaming}
            streamingVariant={
              streamingModeVariant === "final_reply_reveal"
                ? "final_reply_reveal"
                : "standard"
            }
          />
        </div>
        {showActions && (
          <div className="text-zaki-disabled">
            {/** Use same actions component styling via MessageActions */}
            {/* We call handlers with a minimal message object */}
            <MessageActions
              onCopy={
                onCopyMessage
                  ? () => onCopyMessage({ id: "streaming", role: "assistant", content })
                  : undefined
              }
              onRegenerate={
                onRegenerateMessage
                  ? () => onRegenerateMessage({ id: "streaming", role: "assistant", content })
                  : undefined
              }
              onThumbsUp={
                onThumbsUpMessage
                  ? () => onThumbsUpMessage({ id: "streaming", role: "assistant", content })
                  : undefined
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
