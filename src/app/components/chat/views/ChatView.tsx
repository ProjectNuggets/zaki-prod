import { cn } from "@/lib/utils";
import { MessageBubble, type Message } from "../index";
import { ThinkingIndicator } from "../ThinkingIndicator";
import { StreamingBubble } from "../StreamingBubble";
import { SkeletonMessage } from "../../ui/skeleton";

interface ChatViewProps {
  messages: Message[];
  isHistoryLoading: boolean;
  isStreaming: boolean;
  firstMessageTransition: boolean;
}

export function ChatView({
  messages,
  isHistoryLoading,
  isStreaming,
  firstMessageTransition,
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
        const isStreamingMessage = isLast && msg.role === 'assistant' && isStreaming;
        
        // Show thinking indicator for empty streaming assistant message
        if (isStreamingMessage && !msg.content.trim()) {
          return <ThinkingIndicator key={msg.id} />;
        }
        
        // Show streaming bubble with typing effect for assistant message being streamed
        if (isStreamingMessage && msg.content.trim()) {
          return <StreamingBubble key={msg.id} content={msg.content} />;
        }
        
        return <MessageBubble key={msg.id} message={msg} />;
      })}
    </div>
  );
}
