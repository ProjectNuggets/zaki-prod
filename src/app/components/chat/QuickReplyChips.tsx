import {
  ArrowRight,
  FileCheck2,
  MessageSquareQuote,
  RotateCcw,
  Scissors,
  Smile,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";
import type { NullalisTranscriptEntry } from "./BotStatusRail";

export type QuickReplyIcon =
  | "arrow"
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

const ICONS: Record<QuickReplyIcon, React.ComponentType<{ className?: string }>> = {
  arrow: ArrowRight,
  critic: MessageSquareQuote,
  blunt: RotateCcw,
  plan: FileCheck2,
  tighten: Scissors,
  sideways: Smile,
};

const FACET_AGENT_RE = /\bthe-(critic|bully|comedian)\b/i;
const FACETABLE_REPLY_RE =
  /\b(strategy|marketing|positioning|pricing|plan|proposal|roadmap|critique|review|decision|recommend|should|risk|moat|gtm|go[-\s]?to[-\s]?market)\b/i;

function hasFacetDelegate(entries: NullalisTranscriptEntry[]) {
  return entries.some((entry) =>
    FACET_AGENT_RE.test(
      [
        entry.tool,
        entry.text,
        entry.inputPreview,
        entry.outputPreview,
        entry.resultSummary,
        entry.activityLabel,
      ]
        .filter(Boolean)
        .join(" ")
    )
  );
}

function hasFacetLanguage(content: string) {
  return /\b(inner critic|critic says|bully in me|comedian in me|sideways take|blunt take)\b/i.test(
    content
  );
}

export function buildAgentQuickReplyItems({
  message,
  entries,
}: {
  message: Message;
  entries: NullalisTranscriptEntry[];
}): QuickReplyItem[] | undefined {
  if (message.role !== "assistant") return undefined;
  const content = String(message.content || "").trim();
  if (!content) return undefined;

  const answerAware: QuickReplyItem[] = [
    {
      id: "tighten",
      label: "Tighten this",
      prefill: "Tighten your last answer into the clearest, shortest version.",
      icon: "tighten",
    },
    {
      id: "plan",
      label: "Turn into plan",
      prefill: "Turn your last answer into a concrete step-by-step plan.",
      icon: "plan",
    },
  ];

  if (
    hasFacetDelegate(entries) ||
    hasFacetLanguage(content) ||
    !FACETABLE_REPLY_RE.test(content)
  ) {
    return answerAware;
  }

  return [
    {
      id: "critic",
      label: "Ask the critic",
      prefill: "Give me the critic's take on your last answer.",
      icon: "critic",
    },
    {
      id: "blunt",
      label: "Get the blunt take",
      prefill: "Give me the bully's blunt take on your last answer.",
      icon: "blunt",
    },
    {
      id: "sideways",
      label: "Try the sideways take",
      prefill: "Give me the comedian's sideways take on your last answer.",
      icon: "sideways",
    },
  ];
}

export function QuickReplyChips({
  onPick,
  isRtl = false,
  className,
  items = [],
  disabled = false,
}: {
  onPick: (prefill: string) => void;
  isRtl?: boolean;
  className?: string;
  items?: QuickReplyItem[];
  disabled?: boolean;
}) {
  const { t } = useTranslation();
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
      {items.map((item) => {
        const Icon = ICONS[item.icon || "arrow"];
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onPick(item.prefill)}
            disabled={disabled}
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
