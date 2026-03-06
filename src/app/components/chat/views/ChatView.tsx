import { cn } from "@/lib/utils";
import { MessageBubble, type Message } from "../index";
import { StreamingMessage } from "../StreamingMessage";
import { SkeletonMessage } from "../../ui/skeleton";
import { BotToolCallBlock, type BotToolCall } from "../BotToolCallBlock";
import { BotStatusRail, type BotStatusEvent } from "../BotStatusRail";

interface ChatViewProps {
  messages: Message[];
  isHistoryLoading: boolean;
  isStreaming: boolean;
  streamingLabel?: string;
  streamingPillLabel?: string;
  botToolCalls?: BotToolCall[];
  botStatusEvents?: BotStatusEvent[];
  showBotTimeline?: boolean;
  botMode?: boolean;
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
  botToolCalls = [],
  botStatusEvents = [],
  showBotTimeline = false,
  botMode = false,
  firstMessageTransition,
  onCopyMessage,
  onRegenerateMessage,
  onThumbsUpMessage,
}: ChatViewProps) {
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
          return (
            <StreamingMessage
              key={msg.id}
              content={msg.content}
              isStreaming={isStreamingMessage}
              thinkingLabel={streamingLabel}
              thinkingPillLabel={streamingPillLabel}
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
      {showBotTimeline
        ? botToolCalls.map((toolCall) => (
            <BotToolCallBlock key={toolCall.id} toolCall={toolCall} />
          ))
        : null}
      {showBotTimeline && isStreaming && botToolCalls.length === 0 ? (
        <BotStatusRail
          events={botStatusEvents}
          isStreaming={isStreaming}
          fallbackText={streamingLabel || "Analyzing request"}
        />
      ) : null}
    </div>
  );
}
