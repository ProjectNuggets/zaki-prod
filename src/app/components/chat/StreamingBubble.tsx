import { useEffect, useRef, useState } from "react";
import { CenterLogo } from "../icons";
import { MessageActions } from "./MessageActions";
import { MessageContent } from "./rendering/MessageContent";

interface StreamingBubbleProps {
  content: string;
  isStreaming?: boolean;
  badgeLabel?: string;
  helperText?: string;
  streamingModeVariant?: "thinking" | "final_reply_reveal";
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
    setDisplayedContent(content);
  }, [content]);

  useEffect(() => {
    if (content.length < lastContentLenRef.current) {
      setDisplayedContent("");
    }
    lastContentLenRef.current = content.length;
  }, [content.length]);

  return (
    <div
      className={[
        "zaki-message-row flex gap-4 justify-start items-start zaki-message-enter-assistant",
        streamingModeVariant === "final_reply_reveal" ? "zaki-message-reveal" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="size-8 shrink-0 flex items-start justify-center pt-[6px]">
        <div className="scale-75">
          <CenterLogo />
        </div>
      </div>

      <div className="zaki-message-stack w-full max-w-[780px] flex flex-col gap-2 items-start">
        {badgeLabel ? (
          <span
            className={[
              "inline-flex items-center rounded-full border border-[#ead7c1] bg-[#fff7ee] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a7350] shadow-[0px_6px_14px_rgba(52,36,24,0.08)] dark:border-[#3a2b1f] dark:bg-[#17120e] dark:text-[#d0b79b]",
              streamingModeVariant === "final_reply_reveal" ? "zaki-process-enter" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {badgeLabel}
          </span>
        ) : null}
        {helperText && !content.trim() ? (
          <div className="zaki-process-enter rounded-xl border border-[#ead7c1] bg-white/65 px-3 py-2 text-xs font-medium text-zaki-secondary shadow-[0px_8px_18px_rgba(52,36,24,0.06)] dark:border-[#36291f] dark:bg-[#1a1410]/88 dark:text-zaki-dark-subtle">
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
