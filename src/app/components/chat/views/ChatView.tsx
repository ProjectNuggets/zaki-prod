import { cn } from "@/lib/utils";
import { MessageBubble, type Message } from "../index";
import { StreamingMessage } from "../StreamingMessage";
import { SkeletonMessage } from "../../ui/skeleton";
import type { BotToolCall } from "../BotToolCallBlock";
import type {
  BotReasoningSummary,
  BotReplyStart,
  BotStatusEvent,
  ZakiProcessSnapshot,
} from "../BotStatusRail";
import { BotProcessRail } from "../BotProcessRail";

interface ChatViewProps {
  messages: Message[];
  isHistoryLoading: boolean;
  isStreaming: boolean;
  streamingLabel?: string;
  streamingPillLabel?: string;
  streamingBadgeLabel?: string;
  streamingHelperText?: string;
  streamingModeVariant?: "thinking" | "final_reply_reveal";
  botToolCalls?: BotToolCall[];
  botStatusEvents?: BotStatusEvent[];
  botReasoningSummary?: BotReasoningSummary | null;
  botReplyStart?: BotReplyStart | null;
  botProcessSnapshot?: ZakiProcessSnapshot | null;
  botProcessCompact?: boolean;
  showBotTimeline?: boolean;
  botMode?: boolean;
  streamingMode?: "thinking" | "researching" | "writing";
  firstMessageTransition: boolean;
  onCopyMessage?: (message: Message) => void;
  onRegenerateMessage?: (message: Message) => void;
  onThumbsUpMessage?: (message: Message) => void;
}

export function ChatView({
  messages,
  isHistoryLoading,
  isStreaming,
  streamingLabel,
  streamingPillLabel,
  streamingBadgeLabel,
  streamingHelperText,
  streamingModeVariant = "thinking",
  botToolCalls = [],
  botStatusEvents = [],
  botReasoningSummary = null,
  botReplyStart = null,
  botProcessSnapshot = null,
  botProcessCompact = false,
  showBotTimeline = false,
  botMode = false,
  streamingMode = "thinking",
  firstMessageTransition,
  onCopyMessage,
  onRegenerateMessage,
  onThumbsUpMessage,
}: ChatViewProps) {
  const latestMessage = messages[messages.length - 1] ?? null;
  const inlineBotProcessRail =
    showBotTimeline &&
    botMode &&
    isStreaming &&
    latestMessage?.role === "assistant" &&
    !String(latestMessage?.content || "").trim() &&
    streamingModeVariant !== "final_reply_reveal";

  if (isHistoryLoading) {
    return (
      <div className="zaki-chat-thread max-w-3xl mx-auto pt-16 pb-6 px-4 flex flex-col gap-6">
        <SkeletonMessage isUser={false} />
        <SkeletonMessage isUser={true} />
        <SkeletonMessage isUser={false} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "zaki-chat-thread max-w-3xl mx-auto pt-16 pb-6 px-4 flex flex-col gap-6",
        firstMessageTransition && "zaki-chat-enter"
      )}
    >
      {messages.map((msg, index) => {
        const isLast = index === messages.length - 1;
        const isStreamingMessage = isLast && msg.role === "assistant" && isStreaming;

        if (isStreamingMessage) {
          if (inlineBotProcessRail) {
            return (
              <BotProcessRail
                key={msg.id}
                isStreaming={isStreaming}
                stage={isStreaming ? streamingMode : "writing"}
                toolCalls={botToolCalls}
                statusEvents={botStatusEvents}
                reasoningSummary={botReasoningSummary}
                replyStart={botReplyStart}
                snapshot={botProcessSnapshot}
                compact={false}
              />
            );
          }
          return (
            <StreamingMessage
              key={msg.id}
              content={msg.content}
              isStreaming={isStreamingMessage}
              thinkingLabel={streamingLabel}
              thinkingPillLabel={streamingPillLabel}
              streamingBadgeLabel={streamingBadgeLabel}
              streamingHelperText={streamingHelperText}
              streamingModeVariant={streamingModeVariant}
              botMode={botMode}
            />
          );
        }

        return (
          <MessageBubble
            key={msg.id}
            message={msg}
            onCopy={onCopyMessage}
            onRegenerate={onRegenerateMessage}
            onThumbsUp={onThumbsUpMessage}
          />
        );
      })}
      {showBotTimeline && !inlineBotProcessRail ? (
        <BotProcessRail
          isStreaming={isStreaming}
          stage={isStreaming ? streamingMode : "writing"}
          toolCalls={botToolCalls}
          statusEvents={botStatusEvents}
          reasoningSummary={botReasoningSummary}
          replyStart={botReplyStart}
          snapshot={botProcessSnapshot}
          compact={botProcessCompact}
        />
      ) : null}
    </div>
  );
}
