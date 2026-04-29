import { cn } from "@/lib/utils";
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
  ApprovalRequiredCard,
  ContextGauge,
  TaskChecklist,
} from "../NullalisRuntimeWidgets";
import type { ContextGaugeData } from "../NullalisRuntimeWidgets";
import {
  NullalisTurnTimeline,
  type TimelineRevealPhase,
} from "../NullalisTurnTimeline";
import { SystemNoticesStack } from "@/app/components/ui/zaki";

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
  onApprovalAction?: (requestId: string, approved: boolean) => void | Promise<void>;
  contextGaugeData?: ContextGaugeData | null;
  zakiUsageSummary?: ZakiUsageSummary | null;
  botMode?: boolean;
  firstMessageTransition: boolean;
  turnStartedAt?: number | null;
  turnDurationMs?: number | null;
  onCopyMessage?: (message: Message) => void;
  onRegenerateMessage?: (message: Message) => void;
  onThumbsUpMessage?: (message: Message) => void;
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
  onApprovalAction,
  contextGaugeData = null,
  zakiUsageSummary = null,
  botMode = false,
  firstMessageTransition,
  turnStartedAt = null,
  turnDurationMs = null,
  onCopyMessage,
  onRegenerateMessage,
  onThumbsUpMessage,
}: ChatViewProps) {
  // Unified timeline surface: Nullalis (native reasoning) or bot mode
  // (sidecar-driven narration) both render through NullalisTurnTimeline.
  // Bot mode is treated as a Nullalis-compatible mode for rendering.
  const timelineMode = nullalisMode || botMode;
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
        <ApprovalRequiredCard
          request={nullalisApprovalRequest}
          onApprove={onApprovalAction ? (id) => onApprovalAction(id, true) : undefined}
          onDeny={onApprovalAction ? (id) => onApprovalAction(id, false) : undefined}
        />
        <ContextGauge data={contextGaugeData} />
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
        firstMessageTransition && "zaki-chat-enter"
      )}
    >
      <SystemNoticesStack className="-mb-2" />
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
                  onCopy={onCopyMessage}
                  onRegenerate={onRegenerateMessage}
                  onThumbsUp={onThumbsUpMessage}
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
              onCopy={onCopyMessage}
              onRegenerate={onRegenerateMessage}
              onThumbsUp={onThumbsUpMessage}
            />
            {isLast && msg.role === "assistant"
              ? renderTimelineArtifacts({ phase: "done" })
              : null}
          </div>
        );
      })}
    </div>
  );
}
