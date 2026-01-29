import { MessageBubble } from "./MessageBubble";
import { ThinkingIndicator } from "./ThinkingIndicator";
import type { Message } from "@/types";

interface StreamingMessageProps {
  content: string;
  isStreaming: boolean;
  className?: string;
}

export function StreamingMessage({
  content,
  isStreaming,
  className,
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
      ) : (
        <MessageBubble
          message={message}
          isStreaming={isStreaming}
          showActions={false}
        />
      )}
    </div>
  );
}
