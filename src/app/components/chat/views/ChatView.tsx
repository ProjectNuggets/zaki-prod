import { cn } from "@/lib/utils";
import { MessageBubble, type Message } from "../index";
import { StreamingMessage } from "../StreamingMessage";
import { SkeletonMessage } from "../../ui/skeleton";
import type { BotToolCall } from "../BotToolCallBlock";
import type {
  BotReasoningSummary,
  NullalisApprovalRequest,
  NullalisNarrationFrame,
  NullalisTaskItem,
  NullalisTranscriptEntry,
  BotReplyStart,
  BotStatusEvent,
  ZakiUsageSummary,
  ZakiProcessSnapshot,
} from "../BotStatusRail";
import { BotProcessRail } from "../BotProcessRail";
import {
  ApprovalRequiredCard,
  ContextGauge,
  NullalisWorklog,
  NarrationStatusLine,
  TaskChecklist,
  UsageCostFooter,
} from "../NullalisRuntimeWidgets";
import type { ContextGaugeData } from "../NullalisRuntimeWidgets";
import { NullalisTurnTimeline } from "../NullalisTurnTimeline";
import { isTurnTimelineEnabled } from "@/lib/turnTimelineFlag";
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
  botToolCalls?: BotToolCall[];
  botStatusEvents?: BotStatusEvent[];
  botReasoningSummary?: BotReasoningSummary | null;
  botReplyStart?: BotReplyStart | null;
  botProcessSnapshot?: ZakiProcessSnapshot | null;
  botProcessCompact?: boolean;
  showBotTimeline?: boolean;
  nullalisMode?: boolean;
  nullalisNarrationFrame?: NullalisNarrationFrame | null;
  nullalisTranscriptEntries?: NullalisTranscriptEntry[];
  nullalisTranscriptEntryCount?: number;
  nullalisTaskItems?: NullalisTaskItem[];
  nullalisApprovalRequest?: NullalisApprovalRequest | null;
  onApprovalAction?: (requestId: string, approved: boolean) => void | Promise<void>;
  contextGaugeData?: ContextGaugeData | null;
  zakiUsageSummary?: ZakiUsageSummary | null;
  botMode?: boolean;
  streamingMode?: "thinking" | "researching" | "writing";
  firstMessageTransition: boolean;
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
  botToolCalls = [],
  botStatusEvents = [],
  botReasoningSummary = null,
  botReplyStart = null,
  botProcessSnapshot = null,
  botProcessCompact = false,
  showBotTimeline = false,
  nullalisMode = false,
  nullalisNarrationFrame = null,
  nullalisTranscriptEntries = [],
  nullalisTranscriptEntryCount = 0,
  nullalisTaskItems = [],
  nullalisApprovalRequest = null,
  onApprovalAction,
  contextGaugeData = null,
  zakiUsageSummary = null,
  botMode = false,
  streamingMode = "thinking",
  firstMessageTransition,
  onCopyMessage,
  onRegenerateMessage,
  onThumbsUpMessage,
}: ChatViewProps) {
  const latestMessage = messages[messages.length - 1] ?? null;
  const inlineBotProcessRail =
    showBotTimeline &&
    botMode &&
    !nullalisMode &&
    isStreaming &&
    latestMessage?.role === "assistant" &&
    !String(latestMessage?.content || "").trim() &&
    streamingModeVariant !== "final_reply_reveal";
  const showDetachedBotProcessRail =
    showBotTimeline &&
    !inlineBotProcessRail &&
    botProcessCompact;
  const hasNullalisArtifacts =
    nullalisMode &&
    botMode &&
    (nullalisTranscriptEntries.length > 0 ||
      Boolean(nullalisNarrationFrame) ||
      nullalisTaskItems.length > 0 ||
      Boolean(nullalisApprovalRequest) ||
      zakiUsageSummary?.usageTokens != null ||
      zakiUsageSummary?.costUsd != null);

  const useTurnTimeline = isTurnTimelineEnabled();

  const renderNullalisArtifacts = (options?: { compact?: boolean }) => {
    if (!hasNullalisArtifacts) return null;
    return (
      <div className="flex flex-col items-start gap-1.5">
        {useTurnTimeline ? (
          <NullalisTurnTimeline
            entries={nullalisTranscriptEntries}
            frame={nullalisNarrationFrame}
            isStreaming={isStreaming}
            compact={options?.compact}
            usage={zakiUsageSummary}
          />
        ) : (
          <NullalisWorklog
            entries={nullalisTranscriptEntries}
            entryCount={nullalisTranscriptEntryCount}
            frame={nullalisNarrationFrame}
            isStreaming={isStreaming}
            compact={options?.compact}
          />
        )}
        <TaskChecklist tasks={nullalisTaskItems} />
        <ApprovalRequiredCard
          request={nullalisApprovalRequest}
          onApprove={onApprovalAction ? (id) => onApprovalAction(id, true) : undefined}
          onDeny={onApprovalAction ? (id) => onApprovalAction(id, false) : undefined}
        />
        <ContextGauge data={contextGaugeData} />
        {useTurnTimeline ? null : <UsageCostFooter usage={zakiUsageSummary} />}
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
            nullalisMode &&
            botMode &&
            !String(msg.content || "").trim() &&
            streamingModeVariant !== "final_reply_reveal"
          ) {
            return <div key={msg.id}>{renderNullalisArtifacts({ compact: false })}</div>;
          }
          if (inlineBotProcessRail) {
            return (
              <BotProcessRail
                key={msg.id}
                isStreaming={isStreaming}
                stage={isStreaming ? streamingMode : "writing"}
                toolCalls={botToolCalls}
                statusEvents={botStatusEvents}
                reasoningSummary={botReasoningSummary}
                replyStart={botReplyStart}
                snapshot={botProcessSnapshot}
                compact={false}
              />
            );
          }
          return (
            <div key={msg.id} className="flex flex-col gap-2">
              {nullalisMode && nullalisNarrationFrame && !useTurnTimeline && (
                <NarrationStatusLine
                  frame={nullalisNarrationFrame}
                  isStreaming={isStreamingMessage}
                />
              )}
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
              {renderNullalisArtifacts({ compact: true })}
            </div>
          );
        }

        const replayEntries =
          msg.role === "assistant" && useTurnTimeline
            ? replayTimelines?.[msg.id]
            : undefined;

        return (
          <div key={msg.id}>
            {replayEntries && replayEntries.length > 0 ? (
              <div className="mb-2 flex flex-col items-start gap-1.5">
                <NullalisTurnTimeline
                  entries={replayEntries}
                  frame={null}
                  isStreaming={false}
                  compact
                />
              </div>
            ) : null}
            <MessageBubble
              message={msg}
              onCopy={onCopyMessage}
              onRegenerate={onRegenerateMessage}
              onThumbsUp={onThumbsUpMessage}
            />
            {isLast && msg.role === "assistant"
              ? renderNullalisArtifacts({ compact: true })
              : null}
          </div>
        );
      })}
      {showDetachedBotProcessRail ? (
        <BotProcessRail
          isStreaming={isStreaming}
          stage={isStreaming ? streamingMode : "writing"}
          toolCalls={botToolCalls}
          statusEvents={botStatusEvents}
          reasoningSummary={botReasoningSummary}
          replyStart={botReplyStart}
          snapshot={botProcessSnapshot}
          compact={botProcessCompact}
        />
      ) : null}
    </div>
  );
}
