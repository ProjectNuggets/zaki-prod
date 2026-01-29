import { cn } from "@/lib/utils";
import { ChatMarkdown } from "../ChatMarkdown";
import { CenterLogo } from "../icons";
import { MessageActions } from "./MessageActions";

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: { name: string; type: string; url: string }[];
  chatId?: number;
}

export interface MessageBubbleProps {
  message: Message;
  showActions?: boolean;
  isStreaming?: boolean;
}

export function MessageBubble({ message, showActions = true, isStreaming = false }: MessageBubbleProps) {
  // isStreaming can be used to show typing indicator or disable actions
  void isStreaming;
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        "zaki-message-row flex gap-4",
        isUser ? "justify-end items-start" : "justify-start items-start"
      )}
    >
      {!isUser && (
        <div className="size-8 shrink-0 flex items-start justify-center pt-[6px]">
          <div className="scale-75">
            <CenterLogo />
          </div>
        </div>
      )}

      <div
        className={cn(
          "zaki-message-stack max-w-[80%] flex flex-col gap-2",
          isUser ? "items-end" : "items-start"
        )}
      >
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((attachment) => (
              <div
                key={attachment.url}
                className="size-[88px] overflow-hidden rounded-zaki-lg border border-zaki bg-zaki-elevated"
              >
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
        {message.content && (
          <div
            className={cn(
              "zaki-message-bubble rounded-zaki-lg px-4 py-3 text-sm leading-relaxed",
              isUser
                ? "zaki-user-bubble bg-zaki-bubble-user text-zaki-bubble-user"
                : "zaki-assistant-bubble bg-transparent text-zaki-primary"
            )}
          >
            {!isUser ? (
              <ChatMarkdown content={message.content} />
            ) : (
              message.content
            )}
          </div>
        )}
        {showActions && !isUser && <MessageActions />}
      </div>

      {isUser && <div className="size-8 shrink-0" aria-hidden="true" />}
    </div>
  );
}
