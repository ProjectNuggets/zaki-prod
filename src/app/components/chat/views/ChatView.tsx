import { cn } from "@/lib/utils";
import { MessageBubble, type Message, StreamingIndicator } from "../index";
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
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isStreaming && <StreamingIndicator />}
    </div>
  );
}
