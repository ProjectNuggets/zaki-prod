// Phase 4-B (2026-05-08) — S1 quick-reply chips.
//
// Renders below the last assistant message as a small strip of one-click
// continuations. Cuts typing for the most common follow-up shapes in a
// persistent-thread agent. Click → fires the prefill text immediately as
// a new user message (no edit step). Only shows when the chat is idle
// (not streaming) so we never compete with the typing indicator.
//
// The three default shapes are tuned to ZAKI's persistent-thread nature:
//   - "Go deeper"  — request more detail on the same point
//   - "Try another angle" — explicit redirect, useful when the answer
//     missed the mark; cheaper than typing "no, try again"
//   - "Save to brain" — fires a plain-prose prompt asking ZAKI to
//     persist the key takeaway from the current conversation into its
//     memory (the agent owns the actual remember tool call)
//
// i18n: zakiControls.quickReplies.{deeper,angle,remember}.{label,prefill}.

import { ArrowRight, RotateCcw, Brain } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type QuickReplyKind = "deeper" | "angle" | "remember";

const KINDS: readonly QuickReplyKind[] = ["deeper", "angle", "remember"];

const ICONS: Record<QuickReplyKind, React.ComponentType<{ className?: string }>> = {
  deeper: ArrowRight,
  angle: RotateCcw,
  remember: Brain,
};

export function QuickReplyChips({
  onPick,
  isRtl = false,
  className,
}: {
  onPick: (prefill: string) => void;
  isRtl?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="group"
      aria-label={t("zakiControls.quickReplies.aria")}
      className={cn(
        "flex flex-wrap items-center gap-2 pt-1",
        isRtl && "flex-row-reverse",
        className
      )}
      data-testid="quick-reply-chips"
    >
      {KINDS.map((kind) => {
        const Icon = ICONS[kind];
        const label = t(`zakiControls.quickReplies.${kind}.label`);
        const prefill = t(`zakiControls.quickReplies.${kind}.prefill`);
        return (
          <button
            key={kind}
            type="button"
            onClick={() => onPick(prefill)}
            data-testid={`quick-reply-${kind}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-zaki bg-zaki-raised px-3 py-1.5 text-xs font-medium text-zaki-secondary transition-colors hover:border-zaki-brand-40 hover:bg-zaki-brand-10 hover:text-zaki-brand focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2 dark:bg-zaki-dark-card dark:border-zaki-dark-card",
              isRtl && "flex-row-reverse"
            )}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
