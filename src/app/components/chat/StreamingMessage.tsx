import { ThinkingIndicator } from "./ThinkingIndicator";
import { StreamingBubble } from "./StreamingBubble";
import type { Message } from "@/types";

interface StreamingMessageProps {
  content: string;
  isStreaming: boolean;
  className?: string;
  onCopyMessage?: (message: Message) => void;
  onRegenerateMessage?: (message: Message) => void;
  onThumbsUpMessage?: (message: Message) => void;
}

export function StreamingMessage({
  content,
  isStreaming,
  className,
  onCopyMessage,
  onRegenerateMessage,
  onThumbsUpMessage,
}: StreamingMessageProps) {
  const message: Message = {
    id: "streaming",
    role: "assistant",
    content,
  };

  // Show thinking indicator when streaming but no content yet
  const showThinking = isStreaming && !content.trim();

  return (
    <div className={className}>
      {showThinking ? (
        <ThinkingIndicator />
      ) : isStreaming ? (
        <StreamingBubble content={content} isStreaming />
      ) : (
        <StreamingBubble
          content={content}
          isStreaming={false}
          showActions
          onCopyMessage={onCopyMessage}
          onRegenerateMessage={onRegenerateMessage}
          onThumbsUpMessage={onThumbsUpMessage}
        />
      )}
    </div>
  );
}
