import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { CenterLogo } from "../icons";
import { MessageActions } from "./MessageActions";
import { MessageContent } from "./rendering/MessageContent";

/**
 * Strip raw <tool_call>{...}</tool_call> markup from assistant messages.
 * The tool invocation is rendered separately in the Worklog panel.
 */
function stripToolCallMarkup(raw: string): string {
  if (!raw) return raw;
  return raw
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "")
    .replace(/<tool_call>[\s\S]*$/g, "")
    .replace(/<tool_result>[\s\S]*?<\/tool_result>/g, "")
    .replace(/<tool_result>[\s\S]*$/g, "")
    .trim();
}

function isImageAttachment(type?: string | null, name?: string | null) {
  const t = String(type || "").toLowerCase();
  if (t.startsWith("image/")) return true;
  const n = String(name || "").toLowerCase();
  return /\.(png|jpe?g|gif|webp|avif|svg|bmp)$/.test(n);
}

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
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir?.() === "rtl" || i18n.language?.startsWith("ar");

  return (
    <div
      className={cn(
        "group zaki-message-row flex gap-4 font-body",
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
            {message.attachments.map((attachment) => {
              const isImage = isImageAttachment(attachment.type, attachment.name);
              if (isImage) {
                return (
                  <a
                    key={attachment.url}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block size-[88px] overflow-hidden rounded-zaki-lg border border-zaki-strong bg-zaki-elevated"
                  >
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="h-full w-full object-cover"
                    />
                  </a>
                );
              }
              return (
                <a
                  key={attachment.url}
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 max-w-[260px] rounded-zaki-lg border border-zaki-strong bg-zaki-elevated px-3 py-2 text-xs font-medium text-zaki-secondary hover:text-zaki-primary hover:bg-zaki-hover transition-colors"
                >
                  <FileText className="size-4 shrink-0 text-zaki-muted" />
                  <span className="truncate">{attachment.name}</span>
                </a>
              );
            })}
          </div>
        )}
        {(() => {
          const content = !isUser ? stripToolCallMarkup(message.content || "") : (message.content || "");
          if (!content) return null;
          return (
            <div
              className={cn(
                "zaki-message-bubble text-sm leading-relaxed font-body",
                isUser
                  ? cn(
                      "zaki-user-bubble rounded-zaki-xl bg-zaki-bubble-user px-3.5 py-3 text-zaki-bubble-user",
                      isRtl ? "rounded-bl-md" : "rounded-br-md"
                    )
                  : isAssistantError
                    ? "zaki-assistant-bubble w-full rounded-zaki-xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100"
                    : "zaki-assistant-bubble w-full bg-transparent px-0 py-0 text-zaki-primary"
              )}
            >
              {!isUser ? (
                <MessageContent content={content} role="assistant" surface="chat" />
              ) : (
                content
              )}
            </div>
          );
        })()}
        {showActions && !isUser && (
          <>
            <MessageActions
              visible={false}
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
          <div className="mt-2 rounded-zaki-lg border border-zaki-strong bg-zaki-raised px-3 py-2 text-2xs text-zaki-secondary transition-all duration-200">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zaki-muted mb-1">
              <span>{t("chat.usedMemory")}</span>
              <span className="font-semibold text-zaki-secondary">
                {t("chat.usedMemoryCount", { count: memorySources.length })}
              </span>
            </div>
            <div className="space-y-1">
              {memorySources.map((source) => (
                <div key={source.id} className="flex items-start gap-2">
                  <span className="text-[10px] uppercase text-zaki-muted">
                    {source.type}
                  </span>
                  <span className="text-zaki-primary">{source.content}</span>
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
