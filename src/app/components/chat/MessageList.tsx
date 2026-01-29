import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Message, MessageBubble } from "./MessageBubble";
import { StreamingIndicator } from "./StreamingIndicator";

interface MessageListProps {
  messages: Message[];
  isStreaming?: boolean;
  firstMessageTransition?: boolean;
  onScroll?: (isAtBottom: boolean) => void;
}

export function MessageList({
  messages,
  isStreaming = false,
  firstMessageTransition = false,
  onScroll,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (scrollRef.current && autoScrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Auto-scroll during streaming
  useEffect(() => {
    if (scrollRef.current && isStreaming && autoScrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 48;
    autoScrollRef.current = isAtBottom;
    onScroll?.(isAtBottom);
  };

  return (
    <div
      ref={scrollRef}
      className={cn(
        "zaki-chat-thread max-w-3xl mx-auto pt-16 pb-6 px-4 flex flex-col gap-6 overflow-y-auto",
        firstMessageTransition && "zaki-chat-enter"
      )}
      onScroll={handleScroll}
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isStreaming && <StreamingIndicator />}
    </div>
  );
}
