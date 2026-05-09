import { Copy, RefreshCw, ThumbsDown, ThumbsUp, Volume2, Square, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTextToSpeechForMessage } from "@/queries/useTextToSpeech";

interface MessageActionsProps {
  onCopy?: () => void;
  onRegenerate?: () => void;
  onThumbsUp?: () => void;
  onThumbsDown?: () => void;
  visible?: boolean;
  /** Message id + text for the read-aloud button. Both required to
   *  enable the button — assistant messages with no readable content
   *  hide the button. */
  messageId?: string;
  messageText?: string;
  /** Persisted reaction state for visual highlighting (up = green pin
   *  on a good answer, down = red pin on a rejected one). null when
   *  no reaction has been applied. */
  reaction?: "up" | "down" | null;
}

export function MessageActions({
  onCopy,
  onRegenerate,
  onThumbsUp,
  onThumbsDown,
  visible = true,
  messageId,
  messageText,
  reaction = null,
}: MessageActionsProps) {
  const { t } = useTranslation();
  const ttsTargetId = messageId || "";
  const { status: ttsStatus, toggle: ttsToggle } = useTextToSpeechForMessage(ttsTargetId);
  const ttsAvailable = Boolean(messageId && messageText && messageText.trim().length > 0);
  const ttsActive = ttsStatus !== null;

  return (
    <div
      className={`mt-1 flex items-center gap-1 text-zaki-muted transition-opacity focus-within:opacity-100 ${
        visible ? "" : "opacity-0 group-hover:opacity-100"
      }`}
    >
      {ttsAvailable ? (
        <button
          type="button"
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-zaki-accent focus-visible:ring-offset-1",
            ttsActive
              ? "bg-zaki-brand-10 text-zaki-brand"
              : "hover:bg-zaki-elevated hover:text-zaki-secondary"
          )}
          title={t(
            ttsActive
              ? "messageActions.readAloudStop"
              : "messageActions.readAloud"
          )}
          aria-label={t(
            ttsActive
              ? "messageActions.readAloudStop"
              : "messageActions.readAloud"
          )}
          aria-pressed={ttsActive}
          onClick={async () => {
            try {
              await ttsToggle(ttsTargetId, messageText || "");
            } catch {
              toast.error(t("messageActions.readAloudError"));
            }
          }}
        >
          {ttsStatus === "fetching" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : ttsStatus === "playing" ? (
            <Square className="size-3.5" />
          ) : (
            <Volume2 className="size-3.5" />
          )}
        </button>
      ) : null}
      <button
        type="button"
        className="inline-flex size-7 items-center justify-center rounded-full hover:bg-zaki-elevated hover:text-zaki-secondary transition-colors focus-visible:ring-2 focus-visible:ring-zaki-accent focus-visible:ring-offset-1"
        title="Copy"
        aria-label="Copy message"
        onClick={onCopy}
      >
        <Copy className="size-3.5" />
      </button>
      <button
        type="button"
        className="inline-flex size-7 items-center justify-center rounded-full hover:bg-zaki-elevated hover:text-zaki-secondary transition-colors focus-visible:ring-2 focus-visible:ring-zaki-accent focus-visible:ring-offset-1"
        title="Regenerate response"
        aria-label="Regenerate response"
        onClick={onRegenerate}
      >
        <RefreshCw className="size-3.5" />
      </button>
      <button
        type="button"
        aria-pressed={reaction === "up"}
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-zaki-accent focus-visible:ring-offset-1",
          reaction === "up"
            ? "bg-zaki-accent/15 text-zaki-accent"
            : "hover:bg-zaki-elevated hover:text-zaki-secondary",
        )}
        title="Good response"
        aria-label="Mark as good response"
        onClick={onThumbsUp}
      >
        <ThumbsUp className="size-3.5" />
      </button>
      <button
        type="button"
        aria-pressed={reaction === "down"}
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-zaki-accent focus-visible:ring-offset-1",
          reaction === "down"
            ? "bg-zaki-brand/15 text-zaki-brand"
            : "hover:bg-zaki-elevated hover:text-zaki-secondary",
        )}
        title={t("messageActions.thumbsDown")}
        aria-label={t("messageActions.thumbsDown")}
        onClick={onThumbsDown}
      >
        <ThumbsDown className="size-3.5" />
      </button>
    </div>
  );
}
