import { Globe2, Monitor, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrowserFrame } from "@/types";
import { V2InlineRow, V2Panel, V2PanelHead } from "@/app/components/v2";

export type BrowserViewFeedPanelProps = {
  /** Latest browser frame emitted by the agent, or null when none yet. */
  frame: BrowserFrame | null;
  /** Closes the view-feed (clears the active frame). */
  onClose: () => void;
  className?: string;
  embedded?: boolean;
};

/**
 * Watch-only in-app browser view-feed. Renders the latest screenshot the
 * agent runtime emits on the per-turn SSE stream (`browser_frame`). The
 * user can WATCH the agent browse but cannot send input back — there are
 * deliberately no input controls here.
 *
 * `frame.frame` is RAW base64 PNG data; it is prefixed with
 * `data:image/png;base64,` at render time.
 */
export function BrowserViewFeedPanel({
  frame,
  onClose,
  className,
  embedded = false,
}: BrowserViewFeedPanelProps) {
  const title = frame?.title?.trim() || "Browser";
  const url = frame?.url?.trim() || "";

  const content = (
    <>
      <V2PanelHead>
        <span>
          <Monitor className="size-4" aria-hidden />
          Browser
        </span>
        <button
          type="button"
          className="zaki-browser-view__close"
          onClick={onClose}
          aria-label="Close browser view"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </V2PanelHead>

      {frame && frame.frame?.trim() ? (
        <div className="zaki-browser-view__body">
          <h3 className="zaki-browser-view__title" title={title}>
            {title}
          </h3>
          {url ? (
            <V2InlineRow
              icon={<Globe2 className="size-4" aria-hidden />}
              title={url}
            />
          ) : null}
          <figure className="zaki-browser-view__frame">
            <img
              className="zaki-browser-view__img"
              src={`data:image/png;base64,${frame.frame}`}
              alt={
                title !== "Browser"
                  ? `Agent browser view: ${title}`
                  : "Agent browser view"
              }
            />
          </figure>
        </div>
      ) : (
        <div className="zaki-browser-view__empty" role="status">
          <Globe2 className="size-6" aria-hidden />
          <p>Waiting for the agent to browse…</p>
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <section
        aria-label="Browser view"
        className={cn("zaki-browser-view", "zaki-browser-view--embedded", className)}
      >
        {content}
      </section>
    );
  }

  return (
    <V2Panel aria-label="Browser view" className={cn("zaki-browser-view", className)}>
      {content}
    </V2Panel>
  );
}

export default BrowserViewFeedPanel;
