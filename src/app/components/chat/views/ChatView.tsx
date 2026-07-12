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
import { TaskChecklist } from "../NullalisRuntimeWidgets";
import {
  NullalisTurnTimeline,
  type TimelineRevealPhase,
} from "../NullalisTurnTimeline";
import { ChatAgentSteps } from "../ChatAgentSteps";
import { GeneratedFileChip } from "../GeneratedFileChip";

interface ChatViewProps {
  messages: Message[];
  /** Active space id — used to build generated-file download URLs (normal Spaces). */
  spaceId?: string;
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
}

export function isToolOnlyTurnPlaceholder(content: string) {
  const normalized = content.trim().toLowerCase();
  return (
    normalized.startsWith("[tools ran, no direct reply this turn") ||
    normalized.startsWith("tools ran, no direct reply this turn")
  );
}

export function ChatView({
  messages,
  spaceId = "",
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
}: ChatViewProps) {
  const { t, i18n } = useTranslation();
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
      </div>
    );
  };

  // Normal Spaces always-agent narration (above the bubble). The nullALIS agent
  // space (`botMode`) has its own timeline rail and must not render this.
  const renderAgentSteps = (msg: Message) => {
    if (botMode || msg.role !== "assistant") return null;
    const steps = msg.agentSteps ?? [];
    const running = msg.agentRunning ?? false;
    if (steps.length === 0 && !running) return null;
    return <ChatAgentSteps steps={steps} running={running} />;
  };

  // Generated-file download chips (below the bubble), normal Spaces only.
  const renderGeneratedFiles = (msg: Message) => {
    if (botMode || msg.role !== "assistant") return null;
    const files = msg.agentFiles ?? [];
    if (files.length === 0) return null;
    return (
      <div className="flex flex-col items-start gap-1.5">
        {files.map((file) => (
          <GeneratedFileChip key={file.storageFilename} spaceId={spaceId} file={file} />
        ))}
      </div>
    );
  };

  const renderToolOnlyTurn = (msg: Message, hasToolOnlyTimelineEntry: boolean) => {
    const hasNoDirectReply =
      isToolOnlyTurnPlaceholder(msg.content) ||
      (!String(msg.content || "").trim() && hasToolOnlyTimelineEntry);
    if (!botMode || msg.role !== "assistant" || !hasNoDirectReply) {
      return null;
    }
    return (
      <div className="zaki-agent-tool-only-turn" role="status" data-testid={`tool-only-turn-${msg.id}`}>
        <span aria-hidden>↘</span>
        <span>
          <strong>Tools completed this turn</strong>
          <span>No direct reply was needed. Review the run timeline for results.</span>
        </span>
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
      {!botMode ? (
        <span className="sr-only" role="status" aria-live="polite">
          {isStreaming ? t("chat.streamingStatus", { defaultValue: "ZAKI is replying…" }) : ""}
        </span>
      ) : null}
      {messages.map((msg, index) => {
        const isLast = index === messages.length - 1;
        const isStreamingMessage = isLast && msg.role === "assistant" && isStreaming;
        const replayEntries =
          msg.role === "assistant" ? replayTimelines?.[msg.id] : undefined;
        const relevantTimelineEntries = replayEntries || (isLast ? nullalisTranscriptEntries : []);
        const hasToolOnlyTimelineEntry = relevantTimelineEntries.some(
          (entry) => entry.phase === "tool_only_turn" || entry.phase === "tool_only_summary"
        );
        const toolOnlyTurn = renderToolOnlyTurn(msg, hasToolOnlyTimelineEntry);

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
                  createdAt={msg.createdAt}
                  locale={i18n.language}
                />
              </div>
            );
          }
          return (
            <div key={msg.id} className="flex flex-col gap-2">
              {renderTimelineArtifacts({ phase: "revealing" })}
              {renderAgentSteps(msg)}
              {toolOnlyTurn || (String(msg.content || "").trim() ? (
                <MessageBubble
                  message={msg}
                  isStreaming={isStreamingMessage}
                  botMode={botMode}
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
              ))}
              {renderGeneratedFiles(msg)}
            </div>
          );
        }

        const activeDoneTimeline =
          msg.role === "assistant" && isLast && !isStreaming && !replayEntries
            ? renderTimelineArtifacts({ phase: "done" })
            : null;
        return (
          <div key={msg.id} className="flex flex-col gap-2">
            {replayEntries && replayEntries.length > 0 ? (
              <NullalisTurnTimeline
                entries={replayEntries}
                frame={null}
                isStreaming={false}
                revealPhase="done"
              />
            ) : activeDoneTimeline}
            {renderAgentSteps(msg)}
            {toolOnlyTurn || (
              <MessageBubble
                message={msg}
                botMode={botMode}
                onCopy={onCopyMessage}
                onRegenerate={onRegenerateMessage}
                onThumbsUp={onThumbsUpMessage}
                onThumbsDown={onThumbsDownMessage}
                reaction={getReaction ? getReaction(msg.id) : null}
              />
            )}
            {renderGeneratedFiles(msg)}
          </div>
        );
      })}
    </div>
  );
}
