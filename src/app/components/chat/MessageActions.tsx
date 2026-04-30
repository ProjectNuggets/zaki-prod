import { Copy, RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MessageActionsProps {
  onCopy?: () => void;
  onRegenerate?: () => void;
  onThumbsUp?: () => void;
  onThumbsDown?: () => void;
  visible?: boolean;
}

export function MessageActions({
  onCopy,
  onRegenerate,
  onThumbsUp,
  onThumbsDown,
  visible = true,
}: MessageActionsProps) {
  const { t } = useTranslation();
  return (
    <div
      className={`mt-1 flex items-center gap-1 text-zaki-muted transition-opacity focus-within:opacity-100 ${
        visible ? "" : "opacity-0 group-hover:opacity-100"
      }`}
    >
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
        className="inline-flex size-7 items-center justify-center rounded-full hover:bg-zaki-elevated hover:text-zaki-secondary transition-colors focus-visible:ring-2 focus-visible:ring-zaki-accent focus-visible:ring-offset-1"
        title="Good response"
        aria-label="Mark as good response"
        onClick={onThumbsUp}
      >
        <ThumbsUp className="size-3.5" />
      </button>
      <button
        type="button"
        className="inline-flex size-7 items-center justify-center rounded-full hover:bg-zaki-elevated hover:text-zaki-secondary transition-colors focus-visible:ring-2 focus-visible:ring-zaki-accent focus-visible:ring-offset-1"
        title={t("messageActions.thumbsDown")}
        aria-label={t("messageActions.thumbsDown")}
        onClick={onThumbsDown}
      >
        <ThumbsDown className="size-3.5" />
      </button>
    </div>
  );
}
