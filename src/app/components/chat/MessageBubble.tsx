import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { CenterLogo } from "../icons";
import { MessageActions } from "./MessageActions";
import { MessageContent } from "./rendering/MessageContent";

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: { name: string; type: string; url: string }[];
  chatId?: number;
  memorySources?: { id: string; content: string; type: string }[];
  error?: boolean;
  errorCode?: string | null;
}

export interface MessageBubbleProps {
  message: Message;
  showActions?: boolean;
  isStreaming?: boolean;
  animate?: boolean;
  onCopy?: (message: Message) => void;
  onRegenerate?: (message: Message) => void;
  onThumbsUp?: (message: Message) => void;
}

export function MessageBubble({
  message,
  showActions = true,
  isStreaming = false,
  animate = true,
  onCopy,
  onRegenerate,
  onThumbsUp,
}: MessageBubbleProps) {
  // isStreaming can be used to show typing indicator or disable actions
  void isStreaming;
  const isUser = message.role === 'user';
  const isAssistantError = !isUser && Boolean(message.error);
  const [showWhy, setShowWhy] = useState(false);
  const memorySources = message.memorySources || [];
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "zaki-message-row flex gap-4",
        isUser ? "justify-end items-start" : "justify-start items-start",
        animate && (isUser ? "zaki-message-enter-user" : "zaki-message-enter-assistant")
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
          "zaki-message-stack flex flex-col gap-2",
          isUser ? "max-w-[80%] items-end" : "w-full max-w-[780px] items-start"
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
              "zaki-message-bubble text-sm leading-relaxed",
              isUser
                ? "zaki-user-bubble rounded-zaki-lg bg-zaki-bubble-user px-4 py-3 text-zaki-bubble-user"
                : isAssistantError
                  ? "zaki-assistant-bubble w-full rounded-[18px] border border-rose-200 bg-rose-50/90 px-4 py-3 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100"
                  : "zaki-assistant-bubble w-full bg-transparent px-0 py-0 text-zaki-primary"
            )}
          >
            {!isUser ? (
              <MessageContent content={message.content} role="assistant" surface="chat" />
            ) : (
              message.content
            )}
          </div>
        )}
        {showActions && !isUser && (
          <>
            <MessageActions
              onCopy={onCopy ? () => onCopy(message) : undefined}
              onRegenerate={onRegenerate ? () => onRegenerate(message) : undefined}
              onThumbsUp={onThumbsUp ? () => onThumbsUp(message) : undefined}
            />
            {memorySources.length > 0 && (
              <button
                type="button"
                className="text-2xs text-zaki-muted hover:text-zaki-primary transition-colors"
                onClick={() => setShowWhy((prev) => !prev)}
              >
                {showWhy ? t("chat.hideWhy") : t("chat.whyAnswer")}
              </button>
            )}
          </>
        )}
        {showWhy && memorySources.length > 0 && (
          <div className="mt-2 rounded-zaki-lg border border-zaki-subtle bg-white/80 dark:bg-zaki-dark-card px-3 py-2 text-2xs text-zaki-secondary dark:text-zaki-dark-subtle transition-all duration-200">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zaki-muted mb-1">
              <span>{t("chat.usedMemory")}</span>
              <span className="font-semibold text-zaki-secondary dark:text-zaki-dark-subtle">
                {t("chat.usedMemoryCount", { count: memorySources.length })}
              </span>
            </div>
            <div className="space-y-1">
              {memorySources.map((source) => (
                <div key={source.id} className="flex items-start gap-2">
                  <span className="text-[10px] uppercase text-zaki-muted">
                    {source.type}
                  </span>
                  <span className="text-zaki-primary dark:text-zaki-dark-primary">{source.content}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isUser && <div className="size-8 shrink-0" aria-hidden="true" />}
    </div>
  );
}
