import { useEffect, useRef, useState } from "react";
import { CenterLogo } from "../icons";
import { ChatMarkdown } from "../ChatMarkdown";
import { MessageActions } from "./MessageActions";

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

      <div className="zaki-message-stack max-w-[80%] flex flex-col gap-2 items-start">
        <div
          className={[
            "zaki-message-bubble zaki-assistant-bubble rounded-zaki-lg px-4 py-3 text-sm leading-relaxed text-zaki-primary",
            isStreaming
              ? "border border-[#ead7c1] bg-[linear-gradient(140deg,#fffaf4_0%,#fff3e4_100%)] shadow-[0px_10px_24px_rgba(52,36,24,0.10)]"
              : "bg-transparent",
          ].join(" ")}
        >
          {isStreaming ? (
            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[#8f6c4b]">
              <span className="inline-block size-1.5 rounded-full bg-zaki-brand animate-pulse" aria-hidden />
              Live response
            </div>
          ) : null}
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
