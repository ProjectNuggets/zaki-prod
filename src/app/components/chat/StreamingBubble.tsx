import { useEffect, useRef, useState } from "react";
import { CenterLogo } from "../icons";
import { MessageActions } from "./MessageActions";
import { MessageContent } from "./rendering/MessageContent";

interface StreamingBubbleProps {
  content: string;
  isStreaming?: boolean;
  showActions?: boolean;
  onCopyMessage?: (message: { id: string; role: "assistant"; content: string }) => void;
  onRegenerateMessage?: (message: { id: string; role: "assistant"; content: string }) => void;
  onThumbsUpMessage?: (message: { id: string; role: "assistant"; content: string }) => void;
}

export function StreamingBubble({
  content,
  isStreaming = false,
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
    <div className="zaki-message-row flex gap-4 justify-start items-start zaki-message-enter-assistant">
      <div className="size-8 shrink-0 flex items-start justify-center pt-[6px]">
        <div className="scale-75">
          <CenterLogo />
        </div>
      </div>

      <div className="zaki-message-stack w-full max-w-[780px] flex flex-col gap-2 items-start">
        <div
          className={[
            "zaki-message-bubble zaki-assistant-bubble w-full px-0 py-0 text-sm leading-relaxed text-zaki-primary",
            isStreaming
              ? "bg-transparent"
              : "bg-transparent",
          ].join(" ")}
        >
          <MessageContent content={displayedContent} role="assistant" surface="chat" streaming={isStreaming} />
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
