import { useEffect, useState, useCallback } from "react";
import { X, AlertTriangle, Info, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SystemNoticeKind =
  | "system_notice"
  | "compaction"
  | "provider_fallback"
  | "connector_stale"
  | "multimodal_failure";

export interface SystemNoticePayload {
  kind: SystemNoticeKind;
  message: string | null;
}

interface ActiveNotice extends SystemNoticePayload {
  id: string;
}

// ---------------------------------------------------------------------------
// Internal event bus (module-level singleton — no Zustand required for
// transient toasts; this keeps the component self-contained)
// ---------------------------------------------------------------------------

type NoticeListener = (notice: SystemNoticePayload) => void;
const listeners = new Set<NoticeListener>();

/**
 * Call this from the SSE handler to push a system notice into the stack.
 * Works from any context (event loop / async callback).
 */
export function emitSystemNotice(notice: SystemNoticePayload): void {
  listeners.forEach((fn) => fn(notice));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultMessage(kind: SystemNoticeKind): string {
  switch (kind) {
    case "compaction":
      return "Context window compacted to continue the conversation.";
    case "provider_fallback":
      return "Switched to a fallback provider to maintain service.";
    case "connector_stale":
      return "A connector session expired and was refreshed.";
    case "multimodal_failure":
      return "Multimodal processing failed; falling back to text-only mode.";
    default:
      return "A system event occurred.";
  }
}

function noticeIcon(kind: SystemNoticeKind) {
  const cls = "size-3.5 shrink-0 mt-0.5";
  switch (kind) {
    case "compaction":
      return <Zap className={cn(cls, "text-amber-500")} />;
    case "provider_fallback":
    case "connector_stale":
      return <AlertTriangle className={cn(cls, "text-amber-500")} />;
    case "multimodal_failure":
      return <AlertTriangle className={cn(cls, "text-red-500")} />;
    default:
      return <Info className={cn(cls, "text-zaki-muted")} />;
  }
}

let noticeCounter = 0;

// ---------------------------------------------------------------------------
// SystemNoticesStack component
// ---------------------------------------------------------------------------

interface SystemNoticesStackProps {
  className?: string;
  /** Auto-dismiss delay in ms. Set to 0 to disable auto-dismiss. */
  autoDismissMs?: number;
}

/**
 * Mount once at the ChatArea shell level (above the view-switch).
 * Listens for emitSystemNotice() calls and renders dismissible notice strips.
 */
export function SystemNoticesStack({
  className,
  autoDismissMs = 8000,
}: SystemNoticesStackProps) {
  const [notices, setNotices] = useState<ActiveNotice[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotices((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    const handle = (notice: SystemNoticePayload) => {
      const id = `notice-${++noticeCounter}`;
      setNotices((prev) => [...prev, { ...notice, id }]);

      if (autoDismissMs > 0) {
        const timer = window.setTimeout(() => dismiss(id), autoDismissMs);
        return () => window.clearTimeout(timer);
      }
    };

    listeners.add(handle);
    return () => {
      listeners.delete(handle);
    };
  }, [autoDismissMs, dismiss]);

  if (notices.length === 0) return null;

  return (
    <div
      className={cn("flex flex-col gap-1 px-4 pt-2", className)}
      aria-live="polite"
      aria-label="System notices"
    >
      {notices.map((notice) => (
        <div
          key={notice.id}
          className="flex items-start gap-2 rounded-zaki-md border border-amber-200/60 bg-amber-50/80 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200 backdrop-blur-sm"
          role="status"
        >
          {noticeIcon(notice.kind)}
          <span className="flex-1 leading-relaxed">
            {notice.message || defaultMessage(notice.kind)}
          </span>
          <button
            type="button"
            className="ml-1 shrink-0 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
            onClick={() => dismiss(notice.id)}
            aria-label="Dismiss notice"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
