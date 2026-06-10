import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Boxes, ExternalLink, FileText, Globe2 } from "lucide-react";
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
import { QuickReplyChips } from "../QuickReplyChips";
import { buildAgentInspectorPanelModel } from "../AgentInspectorPanelModel";
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
  /** S1 (2026-05-08) — fires the chosen prefill as a fresh user message
   *  immediately. Renders one row of chips below the last assistant
   *  message when the chat is idle. */
  onQuickReply?: (prefill: string) => void;
  onOpenAgentArtifacts?: () => void;
  onOpenAgentSources?: () => void;
  isRtl?: boolean;
}

type AgentReplyEvidenceProps = {
  entries: NullalisTranscriptEntry[];
  isStreaming?: boolean;
  onOpenArtifacts?: () => void;
  onOpenSources?: () => void;
};

function extractUrl(value: string | null | undefined): string | null {
  const match = String(value || "").match(/https?:\/\/[^\s)\]}>,"]+/i);
  return match?.[0] ?? null;
}

function websiteLabel(value: string | null | undefined): string | null {
  const url = extractUrl(value);
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

function isWebSource(item: { label: string; meta: string | null; summary: string }) {
  return Boolean(
    websiteLabel(item.label) ||
      websiteLabel(item.summary) ||
      /\b(web_search|web_fetch|browser|search result|website|url)\b/i.test(
        [item.label, item.meta, item.summary].filter(Boolean).join(" ")
      )
  );
}

function AgentReplyEvidence({
  entries,
  isStreaming = false,
  onOpenArtifacts,
  onOpenSources,
}: AgentReplyEvidenceProps) {
  if (entries.length === 0) return null;

  const model = buildAgentInspectorPanelModel(entries);
  const primaryArtifact = model.artifacts[0] ?? null;
  const touched = [
    ...model.artifacts.map((event) => ({
      id: `artifact:${event.id}`,
      kind: "artifact" as const,
      label: event.files[0] || event.label || "Artifact",
      meta: event.meta || "artifact",
      summary: event.summary,
    })),
    ...model.sources.map((event) => ({
      id: `source:${event.id}`,
      kind: "source" as const,
      label: event.files[0] || event.label || "Source",
      meta: event.meta || "source",
      summary: event.summary,
    })),
  ];
  const seen = new Set<string>();
  const visibleTouched = touched
    .filter((item) => {
      const key = `${item.kind}:${item.label}:${item.summary}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);

  if (!primaryArtifact && visibleTouched.length === 0) return null;

  const artifactTitle = primaryArtifact?.files[0] || primaryArtifact?.label || "Artifact";
  const artifactMeta =
    primaryArtifact?.meta || (isStreaming ? "live capture" : "captured output");

  return (
    <div className="zaki-agent-reply-evidence" aria-label="Agent reply evidence">
      {primaryArtifact ? (
        <div className="zaki-agent-reply-artifact" data-testid="agent-reply-artifact">
          <div className="zaki-agent-reply-artifact__head">
            <span className="zaki-agent-reply-artifact__type">
              <Boxes className="size-3" aria-hidden />
              artifact
            </span>
            {onOpenArtifacts ? (
              <button
                type="button"
                className="zaki-agent-reply-artifact__action"
                onClick={onOpenArtifacts}
              >
                open in panel
                <ExternalLink className="size-3" aria-hidden />
              </button>
            ) : (
              <span className="zaki-agent-reply-artifact__action is-static">
                in panel
              </span>
            )}
          </div>
          <div className="zaki-agent-reply-artifact__body">
            <div className="zaki-agent-reply-artifact__title">{artifactTitle}</div>
            <div className="zaki-agent-reply-artifact__sub">{artifactMeta}</div>
            {primaryArtifact.summary ? (
              <div className="zaki-agent-reply-artifact__preview">
                {primaryArtifact.summary}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {visibleTouched.length > 0 ? (
        <div className="zaki-agent-reply-touched" data-testid="agent-reply-touched">
          <span className="zaki-agent-reply-touched__label">
            {visibleTouched.some((item) => item.kind === "source") ? "sources" : "files"}
          </span>
          {visibleTouched.map((item) => {
            const onClick = item.kind === "artifact" ? onOpenArtifacts : onOpenSources;
            const sourceIsWeb = item.kind === "source" && isWebSource(item);
            const itemLabel =
              item.kind === "source"
                ? websiteLabel(item.label) || websiteLabel(item.summary) || item.label
                : item.label;
            const content = (
              <>
                {item.kind === "artifact" ? (
                  <Boxes className="size-3" aria-hidden />
                ) : sourceIsWeb ? (
                  <Globe2 className="size-3" aria-hidden />
                ) : (
                  <FileText className="size-3" aria-hidden />
                )}
                <span>{itemLabel}</span>
                <span className="meta">{sourceIsWeb ? "website" : item.meta}</span>
              </>
            );
            return onClick ? (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "zaki-agent-reply-touched__item",
                  item.kind === "artifact"
                    ? "is-artifact"
                    : sourceIsWeb
                      ? "is-source is-web"
                      : "is-source"
                )}
                onClick={onClick}
              >
                {content}
              </button>
            ) : (
              <span
                key={item.id}
                className={cn(
                  "zaki-agent-reply-touched__item",
                  item.kind === "artifact"
                    ? "is-artifact"
                    : sourceIsWeb
                      ? "is-source is-web"
                      : "is-source"
                )}
              >
                {content}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
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
  onQuickReply,
  onOpenAgentArtifacts,
  onOpenAgentSources,
  isRtl = false,
}: ChatViewProps) {
  const { t, i18n } = useTranslation();
  // Unified timeline surface: Nullalis (native reasoning) or bot mode
  // (sidecar-driven narration) both render through NullalisTurnTimeline.
  // Bot mode is treated as a Nullalis-compatible mode for rendering.
  const timelineMode = nullalisMode || botMode;
  const showSourceChips = false;
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
                  createdAt={msg.createdAt}
                  locale={i18n.language}
                />
                {botMode ? (
                  <AgentReplyEvidence
                    entries={nullalisTranscriptEntries}
                    isStreaming={isStreamingMessage}
                    onOpenArtifacts={onOpenAgentArtifacts}
                    onOpenSources={onOpenAgentSources}
                  />
                ) : null}
              </div>
            );
          }
          return (
            <div key={msg.id} className="flex flex-col gap-2">
              {renderTimelineArtifacts({ phase: "revealing" })}
              {renderAgentSteps(msg)}
              {String(msg.content || "").trim() ? (
                <MessageBubble
                  message={msg}
                  isStreaming={isStreamingMessage}
                  botMode={botMode}
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
              {renderGeneratedFiles(msg)}
              {botMode ? (
                <AgentReplyEvidence
                  entries={nullalisTranscriptEntries}
                  isStreaming={isStreamingMessage}
                  onOpenArtifacts={onOpenAgentArtifacts}
                  onOpenSources={onOpenAgentSources}
                />
              ) : null}
            </div>
          );
        }

        const replayEntries =
          msg.role === "assistant" ? replayTimelines?.[msg.id] : undefined;
        const evidenceEntries =
          msg.role === "assistant"
            ? replayEntries ?? (isLast ? nullalisTranscriptEntries : [])
            : [];

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
            {renderAgentSteps(msg)}
            <MessageBubble
              message={msg}
              botMode={botMode}
              showSourceChip={showSourceChips}
              onCopy={onCopyMessage}
              onRegenerate={onRegenerateMessage}
              onThumbsUp={onThumbsUpMessage}
              onThumbsDown={onThumbsDownMessage}
              reaction={getReaction ? getReaction(msg.id) : null}
            />
            {renderGeneratedFiles(msg)}
            {botMode && msg.role === "assistant" ? (
              <AgentReplyEvidence
                entries={evidenceEntries}
                isStreaming={false}
                onOpenArtifacts={onOpenAgentArtifacts}
                onOpenSources={onOpenAgentSources}
              />
            ) : null}
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
