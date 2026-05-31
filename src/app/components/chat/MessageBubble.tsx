import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { CenterLogo } from "../icons";
import { MessageActions } from "./MessageActions";
import { MessageContent } from "./rendering/MessageContent";
import { ImageBlock } from "./rendering/blocks/ImageBlock";
import { extractGeneratedImages } from "./rendering/extractGeneratedImages";
import { SourceChip } from "@/app/components/ui/zaki";

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

function formatMessageTime(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return null;
  }
}

function isImageAttachment(type?: string | null, name?: string | null) {
  const t = String(type || "").toLowerCase();
  if (t.startsWith("image/")) return true;
  const n = String(name || "").toLowerCase();
  return /\.(png|jpe?g|gif|webp|avif|svg|bmp)$/.test(n);
}

export interface PersistedTurnEvent {
  eventType: string;
  payload: Record<string, unknown>;
  ts?: number;
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
  channel?: string | null;
  lane?: string | null;
  createdAt?: string | null;
  turnEvents?: PersistedTurnEvent[];
}

export interface MessageBubbleProps {
  message: Message;
  showActions?: boolean;
  isStreaming?: boolean;
  animate?: boolean;
  botMode?: boolean;
  showSourceChip?: boolean;
  onCopy?: (message: Message) => void;
  onRegenerate?: (message: Message) => void;
  onThumbsUp?: (message: Message) => void;
  onThumbsDown?: (message: Message) => void;
  /** Persisted reaction state — drives the highlight and the reason
   *  input that appears under thumbed-down messages. */
  reaction?: "up" | "down" | null;
}

export function MessageBubble({
  message,
  showActions = true,
  isStreaming = false,
  animate = true,
  botMode = false,
  showSourceChip = true,
  onCopy,
  onRegenerate,
  onThumbsUp,
  onThumbsDown,
  reaction = null,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isAssistantError = !isUser && Boolean(message.error);
  const [showWhy, setShowWhy] = useState(false);
  const memorySources = message.memorySources || [];
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir?.() === "rtl" || i18n.language?.startsWith("ar");
  const messageTime = formatMessageTime(message.createdAt);
  const agentRune = isStreaming ? "▸" : isAssistantError ? "!" : "✓";

  // 2026-05-08 — Hoist agent-generated images out of the collapsed
  // tool-result expansion into the main reply slot. The image_generate
  // tool's URL is the actual reply for an image-gen prompt; rendering
  // it inline (above the text) makes the chat read like a normal "here
  // you go" exchange instead of forcing the user to expand a worklog
  // row to see the picture.
  // Dedupe against URLs already inlined in message.content (the agent
  // sometimes repeats the markdown ![](...) in its final reply, which
  // parseAssistantContent will render as its own image block — we
  // suppress those here to avoid two copies of the same image).
  const generatedImages = useMemo(() => {
    if (isUser) return [];
    const images = extractGeneratedImages(message.turnEvents);
    if (images.length === 0) return [];
    // Strip fenced code blocks before scanning for inline image URLs —
    // parseAssistantContent treats markdown image syntax inside code
    // fences as code, not as a rendered image, so dedupe shouldn't
    // suppress hoisted images just because the syntax appears in a
    // fence (e.g. a tutorial showing the markdown).
    const md = (message.content || "").replace(/```[\s\S]*?```/g, "");
    const inlineUrls = new Set<string>();
    const re = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(md)) !== null) {
      if (match[1]) inlineUrls.add(match[1]);
    }
    return images.filter((img) => !inlineUrls.has(img.url));
  }, [isUser, message.turnEvents, message.content]);

  return (
    <div
      className={cn(
        "group zaki-message-row flex gap-4 font-body",
        isUser ? "zaki-message-row--user" : "zaki-message-row--assistant",
        !isUser && isStreaming && "is-streaming",
        isUser ? "justify-end items-start" : "justify-start items-start",
        animate && (isUser ? "zaki-message-enter-user" : "zaki-message-enter-assistant")
      )}
      data-message-role={message.role}
      data-streaming={!isUser && isStreaming ? "true" : undefined}
    >
      {!isUser && (
        <div
          className="zaki-message-avatar size-8 shrink-0 flex items-start justify-center pt-[6px]"
          data-state={isStreaming ? "streaming" : isAssistantError ? "error" : "done"}
        >
          {botMode ? (
            <span className="zaki-message-rune" aria-hidden>
              {agentRune}
            </span>
          ) : (
            <div className="scale-75">
              <CenterLogo />
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          "zaki-message-stack flex flex-col gap-2",
          isUser ? "max-w-[80%] items-end" : "w-full max-w-[780px] items-start"
        )}
      >
        {botMode && !isUser ? (
          <div className="zaki-message-meta zaki-message-meta--assistant">
            <strong>ZAKI</strong>
            {isAssistantError ? (
              <>
                <span className="sep">.</span>
                <span className="badge is-error">error</span>
              </>
            ) : null}
            {messageTime ? (
              <>
                <span className="sep">.</span>
                <span>{messageTime}</span>
              </>
            ) : null}
          </div>
        ) : null}
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
        {generatedImages.length > 0 ? (
          <div className="flex w-full flex-col gap-2">
            {generatedImages.map((img) => (
              <ImageBlock
                key={img.url}
                block={{ id: `gen-${img.url}`, type: "image", url: img.url, alt: img.alt }}
              />
            ))}
          </div>
        ) : null}
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
                    ? "zaki-assistant-bubble w-full rounded-zaki-xl border border-zaki-strong bg-zaki-error px-4 py-3 text-zaki-error"
                    : "zaki-assistant-bubble w-full bg-transparent px-0 py-0 text-zaki-primary"
              )}
            >
              {botMode && isUser ? (
                <div className="zaki-message-meta zaki-message-meta--user">
                  <strong>You</strong>
                  {messageTime ? (
                    <>
                      <span className="sep">.</span>
                      <span>{messageTime}</span>
                    </>
                  ) : null}
                </div>
              ) : null}
              {!isUser ? (
                <MessageContent content={content} role="assistant" surface="chat" />
              ) : (
                content
              )}
            </div>
          );
        })()}
        {showSourceChip ? (
          <SourceChip
            channel={message.channel || "web"}
            lane={message.lane || "main"}
            at={message.createdAt}
            className={cn("mt-0.5", isUser && "self-end")}
          />
        ) : null}
        {showActions && !isUser && (
          <>
            <MessageActions
              visible={false}
              messageId={message.id}
              messageText={stripToolCallMarkup(message.content || "")}
              onCopy={onCopy ? () => onCopy(message) : undefined}
              onRegenerate={onRegenerate ? () => onRegenerate(message) : undefined}
              onThumbsUp={onThumbsUp ? () => onThumbsUp(message) : undefined}
              onThumbsDown={onThumbsDown ? () => onThumbsDown(message) : undefined}
              reaction={reaction}
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
