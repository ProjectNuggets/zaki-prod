import { Copy, RefreshCw, ThumbsUp } from "lucide-react";

interface MessageActionsProps {
  onCopy?: () => void;
  onRegenerate?: () => void;
  onThumbsUp?: () => void;
  visible?: boolean;
}

export function MessageActions({
  onCopy,
  onRegenerate,
  onThumbsUp,
  visible = true,
}: MessageActionsProps) {
  return (
    <div className={`group mt-1 flex items-center gap-3 text-zaki-disabled ${visible ? "" : "opacity-0 group-hover:opacity-100 transition-opacity"}`}>
      <button
        type="button"
        className="hover:text-zaki-secondary transition-colors focus-visible:ring-2 focus-visible:ring-zaki-accent focus-visible:ring-offset-1 focus-visible:rounded p-1"
        title="Copy"
        aria-label="Copy message"
        onClick={onCopy}
      >
        <Copy className="size-3.5" />
      </button>
      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
        <button
          type="button"
          className="hover:text-zaki-secondary transition-colors focus-visible:ring-2 focus-visible:ring-zaki-accent focus-visible:ring-offset-1 focus-visible:rounded p-1"
          title="Regenerate response"
          aria-label="Regenerate response"
          onClick={onRegenerate}
        >
          <RefreshCw className="size-3.5" />
        </button>
        <button
          type="button"
          className="hover:text-zaki-secondary transition-colors focus-visible:ring-2 focus-visible:ring-zaki-accent focus-visible:ring-offset-1 focus-visible:rounded p-1"
          title="Good response"
          aria-label="Mark as good response"
          onClick={onThumbsUp}
        >
          <ThumbsUp className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
