import { ThinkingIndicator } from "./ThinkingIndicator";
import { StreamingBubble } from "./StreamingBubble";
import type { Message } from "@/types";

interface StreamingMessageProps {
  content: string;
  isStreaming: boolean;
  className?: string;
  thinkingLabel?: string;
  thinkingPillLabel?: string;
  streamingBadgeLabel?: string;
  streamingHelperText?: string;
  streamingModeVariant?: "thinking" | "final_reply_reveal";
  botMode?: boolean;
  onCopyMessage?: (message: Message) => void;
  onRegenerateMessage?: (message: Message) => void;
  onThumbsUpMessage?: (message: Message) => void;
}

export function StreamingMessage({
  content,
  isStreaming,
  className,
  thinkingLabel,
  thinkingPillLabel,
  streamingBadgeLabel,
  streamingHelperText,
  streamingModeVariant = "thinking",
  botMode = false,
  onCopyMessage,
  onRegenerateMessage,
  onThumbsUpMessage,
}: StreamingMessageProps) {
  // Show thinking indicator when streaming but no content yet
  const showThinking = isStreaming && !content.trim();

  return (
    <div className={className}>
      {showThinking ? (
        botMode && streamingModeVariant === "final_reply_reveal" ? (
          <StreamingBubble
            content=""
            isStreaming
            badgeLabel={streamingBadgeLabel}
            helperText={streamingHelperText}
            streamingModeVariant={streamingModeVariant}
          />
        ) : botMode ? (
          <div className="hidden" aria-hidden />
        ) : (
          <ThinkingIndicator
            label={thinkingLabel}
            pillLabel={thinkingPillLabel}
          />
        )
      ) : isStreaming ? (
        <StreamingBubble
          content={content}
          isStreaming
          badgeLabel={streamingBadgeLabel}
          helperText={streamingModeVariant === "final_reply_reveal" ? streamingHelperText : undefined}
          streamingModeVariant={streamingModeVariant}
        />
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
