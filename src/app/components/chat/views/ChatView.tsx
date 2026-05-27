import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { MessageBubble, type Message } from "../index";
import { StreamingMessage } from "../StreamingMessage";
import { ThinkingIndicator } from "../ThinkingIndicator";
import { SkeletonMessage } from "../../ui/skeleton";
import type {
  NullalisApprovalRequest,
  NullalisNarrationFrame,
  NullalisTaskItem,
  NullalisTranscriptEntry,
  BotReplyStart,
  ZakiUsageSummary,
} from "../BotStatusRail";
import {
  ContextGauge,
  TaskChecklist,
} from "../NullalisRuntimeWidgets";
import type { ContextGaugeData } from "../NullalisRuntimeWidgets";
import {
  NullalisTurnTimeline,
  type TimelineRevealPhase,
} from "../NullalisTurnTimeline";
import { QuickReplyChips } from "../QuickReplyChips";

interface ChatViewProps {
  messages: Message[];
  replayTimelines?: Record<string, NullalisTranscriptEntry[]>;
  isHistoryLoading: boolean;
  isStreaming: boolean;
  streamingLabel?: string;
  streamingPillLabel?: string;
  streamingBadgeLabel?: string;
  streamingHelperText?: string;
  streamingModeVariant?: "thinking" | "final_reply_reveal";
  botReplyStart?: BotReplyStart | null;
  nullalisMode?: boolean;
  nullalisNarrationFrame?: NullalisNarrationFrame | null;
  nullalisTranscriptEntries?: NullalisTranscriptEntry[];
  nullalisTaskItems?: NullalisTaskItem[];
  nullalisApprovalRequest?: NullalisApprovalRequest | null;
  contextGaugeData?: ContextGaugeData | null;
  zakiUsageSummary?: ZakiUsageSummary | null;
  botMode?: boolean;
  firstMessageTransition: boolean;
  turnStartedAt?: number | null;
  turnDurationMs?: number | null;
  onCopyMessage?: (message: Message) => void;
  onRegenerateMessage?: (message: Message) => void;
  onThumbsUpMessage?: (message: Message) => void;
  onThumbsDownMessage?: (message: Message) => void;
  /** Resolves the persisted reaction for a message id; null = unmarked. */
  getReaction?: (messageId: string) => "up" | "down" | null;
  /** S1 (2026-05-08) — fires the chosen prefill as a fresh user message
   *  immediately. Renders one row of chips below the last assistant
   *  message when the chat is idle. */
  onQuickReply?: (prefill: string) => void;
  isRtl?: boolean;
}

export function ChatView({
  messages,
  replayTimelines,
  isHistoryLoading,
  isStreaming,
  streamingLabel,
  streamingPillLabel,
  streamingBadgeLabel,
  streamingHelperText,
  streamingModeVariant = "thinking",
  botReplyStart = null,
  nullalisMode = false,
  nullalisNarrationFrame = null,
  nullalisTranscriptEntries = [],
  nullalisTaskItems = [],
  nullalisApprovalRequest = null,
  contextGaugeData = null,
  zakiUsageSummary = null,
  botMode = false,
  firstMessageTransition,
  turnStartedAt = null,
  turnDurationMs = null,
  onCopyMessage,
  onRegenerateMessage,
  onThumbsUpMessage,
  onThumbsDownMessage,
  getReaction,
  onQuickReply,
  isRtl = false,
}: ChatViewProps) {
  const { t } = useTranslation();
  // Unified timeline surface: Nullalis (native reasoning) or bot mode
  // (sidecar-driven narration) both render through NullalisTurnTimeline.
  // Bot mode is treated as a Nullalis-compatible mode for rendering.
  const timelineMode = nullalisMode || botMode;
  const showSourceChips = !botMode;
  const hasTimelineArtifacts =
    timelineMode &&
    (nullalisTranscriptEntries.length > 0 ||
      Boolean(nullalisNarrationFrame) ||
      nullalisTaskItems.length > 0 ||
      Boolean(nullalisApprovalRequest) ||
      zakiUsageSummary?.usageTokens != null ||
      zakiUsageSummary?.costUsd != null);

  // Reveal phase: final-reply tokens are landing → collapse the trail.
  const revealPhase: TimelineRevealPhase =
    botReplyStart != null
      ? isStreaming
        ? "revealing"
        : "done"
      : isStreaming
        ? "working"
        : hasTimelineArtifacts
          ? "done"
          : "working";

  const renderTimelineArtifacts = (options?: {
    compact?: boolean;
    phase?: TimelineRevealPhase;
  }) => {
    if (!timelineMode) return null;
    if (!hasTimelineArtifacts && !(isStreaming && options?.phase !== "revealing")) return null;
    return (
      <div className="flex flex-col items-start gap-1.5">
        <NullalisTurnTimeline
          entries={nullalisTranscriptEntries}
          frame={nullalisNarrationFrame}
          isStreaming={isStreaming}
          compact={options?.compact}
          revealPhase={options?.phase ?? revealPhase}
          turnStartedAt={turnStartedAt}
          turnDurationMs={turnDurationMs}
          usage={zakiUsageSummary}
        />
        <TaskChecklist tasks={nullalisTaskItems} />
      </div>
    );
  };

  if (isHistoryLoading) {
    return (
      <div className="zaki-chat-thread max-w-3xl mx-auto pt-16 pb-6 px-4 flex flex-col gap-6">
        <SkeletonMessage isUser={false} />
        <SkeletonMessage isUser={true} />
        <SkeletonMessage isUser={false} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "zaki-chat-thread max-w-3xl mx-auto pt-16 pb-6 px-4 flex flex-col gap-6",
        botMode && "zaki-chat-thread--agent",
        firstMessageTransition && "zaki-chat-enter"
      )}
    >
      {/* C4: ContextGauge is rendered persistently whenever data is available,
          independent of timelineMode or nullalisMode */}
      {contextGaugeData ? <ContextGauge data={contextGaugeData} /> : null}
      {messages.length === 0 && botMode && !isStreaming ? (
        <section className="zaki-agent-empty-v2" aria-labelledby="zaki-agent-empty-title">
          <div className="zaki-agent-empty-v2__kicker">
            <span className="zaki-agent-empty-v2__live" aria-hidden="true" />
            {t("zakiAgent.empty.kicker", { defaultValue: "Agent ready" })}
          </div>
          <h2 id="zaki-agent-empty-title">
            {t("zakiAgent.empty.title", { defaultValue: "Start with the work, not the interface." })}
          </h2>
          <p>
            {t("zakiAgent.empty.body", {
              defaultValue:
                "ZAKI can plan, execute, review, use tools, browse through approved controls, and cite personal brain memory when it matters.",
            })}
          </p>
          {onQuickReply ? (
            <div className="zaki-agent-empty-v2__actions" aria-label={t("zakiAgent.empty.actionsLabel", { defaultValue: "Example tasks" })}>
              {[
                t("zakiAgent.empty.examples.plan", { defaultValue: "Plan my next execution slice." }),
                t("zakiAgent.empty.examples.research", { defaultValue: "Research this and give me the decision." }),
                t("zakiAgent.empty.examples.review", { defaultValue: "Review the current work and find risks." }),
              ].map((example) => (
                <button key={example} type="button" onClick={() => onQuickReply(example)}>
                  {example}
                  <span aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
      {messages.map((msg, index) => {
        const isLast = index === messages.length - 1;
        const isStreamingMessage = isLast && msg.role === "assistant" && isStreaming;

        if (isStreamingMessage) {
          if (
            timelineMode &&
            !String(msg.content || "").trim() &&
            streamingModeVariant !== "final_reply_reveal"
          ) {
            return (
              <div key={msg.id}>
                {renderTimelineArtifacts({ compact: false, phase: "working" })}
              </div>
            );
          }
          if (streamingModeVariant === "final_reply_reveal") {
            return (
              <div key={msg.id} className="flex flex-col gap-2">
                {renderTimelineArtifacts({ phase: "revealing" })}
                <StreamingMessage
                  content={msg.content}
                  isStreaming={isStreamingMessage}
                  thinkingLabel={streamingLabel}
                  thinkingPillLabel={streamingPillLabel}
                  streamingBadgeLabel={streamingBadgeLabel}
                  streamingHelperText={streamingHelperText}
                  streamingModeVariant={streamingModeVariant}
                  botMode={botMode}
                />
              </div>
            );
          }
          return (
            <div key={msg.id} className="flex flex-col gap-2">
              {renderTimelineArtifacts({ phase: "revealing" })}
              {String(msg.content || "").trim() ? (
                <MessageBubble
                  message={msg}
                  isStreaming={isStreamingMessage}
                  showSourceChip={showSourceChips}
                  onCopy={onCopyMessage}
                  onRegenerate={onRegenerateMessage}
                  onThumbsUp={onThumbsUpMessage}
                  reaction={getReaction ? getReaction(msg.id) : null}
                />
              ) : (
                !botMode && (
                  <ThinkingIndicator
                    label={streamingLabel}
                    pillLabel={streamingPillLabel}
                  />
                )
              )}
            </div>
          );
        }

        const replayEntries =
          msg.role === "assistant" ? replayTimelines?.[msg.id] : undefined;

        return (
          <div key={msg.id} className="flex flex-col gap-2">
            {replayEntries && replayEntries.length > 0 ? (
              <NullalisTurnTimeline
                entries={replayEntries}
                frame={null}
                isStreaming={false}
                revealPhase="done"
              />
            ) : null}
            <MessageBubble
              message={msg}
              showSourceChip={showSourceChips}
              onCopy={onCopyMessage}
              onRegenerate={onRegenerateMessage}
              onThumbsUp={onThumbsUpMessage}
              onThumbsDown={onThumbsDownMessage}
              reaction={getReaction ? getReaction(msg.id) : null}
            />
            {isLast && msg.role === "assistant"
              ? renderTimelineArtifacts({ phase: "done" })
              : null}
            {isLast && msg.role === "assistant" && !isStreaming && onQuickReply ? (
              <QuickReplyChips onPick={onQuickReply} isRtl={isRtl} className="ms-12" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
