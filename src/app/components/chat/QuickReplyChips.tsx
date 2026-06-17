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

import {
  ArrowRight,
  Brain,
  FileCheck2,
  MessageSquareQuote,
  RotateCcw,
  Scissors,
  Smile,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type QuickReplyKind = "deeper" | "angle" | "remember";
export type QuickReplyIcon =
  | "arrow"
  | "brain"
  | "critic"
  | "blunt"
  | "plan"
  | "tighten"
  | "sideways";
export type QuickReplyItem = {
  id: string;
  label: string;
  prefill: string;
  icon?: QuickReplyIcon;
};

const KINDS: readonly QuickReplyKind[] = ["deeper", "angle", "remember"];

const ICONS: Record<QuickReplyIcon, React.ComponentType<{ className?: string }>> = {
  arrow: ArrowRight,
  brain: Brain,
  critic: MessageSquareQuote,
  blunt: RotateCcw,
  plan: FileCheck2,
  tighten: Scissors,
  sideways: Smile,
};

const DEFAULT_ICONS: Record<QuickReplyKind, QuickReplyIcon> = {
  deeper: "arrow",
  angle: "blunt",
  remember: "brain",
};

function fallbackItems(t: ReturnType<typeof useTranslation>["t"]): QuickReplyItem[] {
  return KINDS.map((kind) => ({
    id: kind,
    label: t(`zakiControls.quickReplies.${kind}.label`),
    prefill: t(`zakiControls.quickReplies.${kind}.prefill`),
    icon: DEFAULT_ICONS[kind],
  }));
}

export function QuickReplyChips({
  onPick,
  isRtl = false,
  className,
  items,
}: {
  onPick: (prefill: string) => void;
  isRtl?: boolean;
  className?: string;
  items?: QuickReplyItem[];
}) {
  const { t } = useTranslation();
  const visibleItems = items && items.length > 0 ? items : fallbackItems(t);
  return (
    <div
      role="group"
      aria-label={t("zakiControls.quickReplies.aria")}
      className={cn(
        "zaki-quick-reply-strip flex flex-wrap items-center gap-2 pt-1",
        isRtl && "flex-row-reverse",
        className
      )}
      data-testid="quick-reply-chips"
    >
      {visibleItems.map((item) => {
        const Icon = ICONS[item.icon || "arrow"];
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onPick(item.prefill)}
            data-testid={`quick-reply-${item.id}`}
            className={cn(
              "zaki-quick-reply v2-btn v2-btn--sm inline-flex min-h-0 items-center gap-1.5 px-2.5 py-1 text-[11px] normal-case tracking-[0.02em]",
              isRtl && "flex-row-reverse"
            )}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
