import { useEffect, useRef, useState } from "react";
import { CenterLogo } from "../icons";
import { ChatMarkdown } from "../ChatMarkdown";
import { MessageActions } from "./MessageActions";
import { cn } from "@/lib/utils";

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
  isStreaming = true,
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

  // Reset when content starts fresh (new message)
  useEffect(() => {
    if (content.length < 10 && displayedContent.length > content.length + 50) {
      // Likely a new message, reset
      charIndexRef.current = 0;
      setDisplayedContent("");
      setIsTypingPhase(true);
    }
  }, [content, displayedContent]);

  return (
    <div className="zaki-message-row flex gap-4 justify-start items-start zaki-message-enter-assistant">
      <div className="size-8 shrink-0 flex items-start justify-center pt-[6px]">
        <div className="scale-75">
          <CenterLogo />
        </div>
      </div>

      <div className="zaki-message-stack max-w-[80%] flex flex-col gap-2 items-start">
        <div className="zaki-message-bubble zaki-assistant-bubble rounded-zaki-lg px-4 py-3 text-sm leading-relaxed bg-transparent text-zaki-primary">
          <ChatMarkdown content={displayedContent} />
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
