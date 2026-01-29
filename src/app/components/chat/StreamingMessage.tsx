import { MessageBubble } from "./MessageBubble";
import { StreamingIndicator } from "./StreamingIndicator";
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

  return (
    <div className={className}>
      <MessageBubble
        message={message}
        isStreaming={isStreaming}
        showActions={false}
      />
      {isStreaming && <StreamingIndicator />}
    </div>
  );
}
