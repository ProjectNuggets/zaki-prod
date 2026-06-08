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
  createdAt?: string | number | null;
  locale?: string;
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
  createdAt = null,
  locale,
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
            botMode={botMode}
            createdAt={createdAt}
            locale={locale}
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
          botMode={botMode}
          createdAt={createdAt}
          locale={locale}
        />
      ) : (
        <StreamingBubble
          content={content}
          isStreaming={false}
          botMode={botMode}
          createdAt={createdAt}
          locale={locale}
          showActions
          onCopyMessage={onCopyMessage}
          onRegenerateMessage={onRegenerateMessage}
          onThumbsUpMessage={onThumbsUpMessage}
        />
      )}
    </div>
  );
}
