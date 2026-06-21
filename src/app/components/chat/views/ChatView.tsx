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
import { QuickReplyChips, type QuickReplyItem } from "../QuickReplyChips";
import {
  buildAgentInspectorPanelModel,
  type AgentInspectorPanelEvent,
} from "../AgentInspectorPanelModel";
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

type AgentReplySourceItem = {
  id: string;
  kind: "website" | "document";
  label: string;
  meta: string;
  summary: string;
  href: string | null;
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

function isGenericArtifactLabel(label: string) {
  const normalized = label.trim().toLowerCase();
  return (
    !normalized ||
    /^(artifact|artifact_event|produce_document|create_document|write_file|save_file|export|generated file|generated output)$/.test(
      normalized
    ) ||
    /(?:^|\/)api\/agent\/artifacts\//i.test(label)
  );
}

function artifactDisplayLabel(item: { label: string; files: string[] }) {
  const label = String(item.label || "").trim();
  if (label && !isGenericArtifactLabel(label)) return label;
  const file = item.files.find((candidate) => !isGenericArtifactLabel(String(candidate || "")));
  return file || (label && !isGenericArtifactLabel(label) ? label : "Artifact");
}

function isDocumentLikeLabel(value: string | null | undefined) {
  const label = String(value || "").trim();
  if (!label) return false;
  if (/\.(md|mdx|txt|pdf|docx?|pptx?|xlsx?|csv|json|yaml|yml|html?)$/i.test(label)) {
    return true;
  }
  return /(^|\/)(docs?|sources?|research|references?|briefs?)\//i.test(label);
}

function firstMeaningfulFile(files: string[]) {
  return files.find((file) => isDocumentLikeLabel(file)) ?? files.find(Boolean) ?? null;
}

function toReplySourceItem(event: AgentInspectorPanelEvent): AgentReplySourceItem | null {
  const href = event.href || extractUrl(event.summary) || extractUrl(event.label);
  if (href) {
    return {
      id: event.id,
      kind: "website",
      label: websiteLabel(href) || event.label || href,
      meta: "website",
      summary: event.summary,
      href,
    };
  }

  const file = firstMeaningfulFile(event.files);
  const label = file || event.label;
  if (
    !label ||
    (event.category !== "file" &&
      event.category !== "retrieval" &&
      !isDocumentLikeLabel(label))
  ) {
    return null;
  }

  return {
    id: event.id,
    kind: "document",
    label,
    meta: event.files.length > 1 ? `${event.files.length} files` : "document",
    summary: event.summary,
    href: null,
  };
}

function uniqueReplySources(events: AgentInspectorPanelEvent[]) {
  const seen = new Set<string>();
  const sources: AgentReplySourceItem[] = [];
  for (const event of events) {
    const item = toReplySourceItem(event);
    if (!item) continue;
    const key = `${item.kind}:${item.href || item.label}:${item.summary}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push(item);
  }
  return sources.slice(0, 6);
}

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

function buildQuickReplyItems({
  botMode,
  message,
  entries,
}: {
  botMode: boolean;
  message: Message;
  entries: NullalisTranscriptEntry[];
}): QuickReplyItem[] | undefined {
  if (!botMode || message.role !== "assistant") return undefined;
  const content = String(message.content || "").trim();
  if (!content) return undefined;

  const alreadyUsedFacet = hasFacetDelegate(entries) || hasFacetLanguage(content);
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
    {
      id: "remember",
      label: "Save to brain",
      prefill: "Save the key takeaway from this conversation to my brain.",
      icon: "brain",
    },
  ];
  if (alreadyUsedFacet || !FACETABLE_REPLY_RE.test(content)) return answerAware;
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

function AgentReplyEvidence({
  entries,
  isStreaming = false,
  onOpenArtifacts,
  onOpenSources,
}: AgentReplyEvidenceProps) {
  if (entries.length === 0) return null;

  const model = buildAgentInspectorPanelModel(entries);
  const primaryArtifact = model.artifacts[0] ?? null;
  const visibleSources = uniqueReplySources(model.sources);

  if (!primaryArtifact && visibleSources.length === 0) return null;

  const artifactTitle = primaryArtifact ? artifactDisplayLabel(primaryArtifact) : "Artifact";
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
      {visibleSources.length > 0 ? (
        <details className="zaki-agent-reply-sources" data-testid="agent-reply-sources">
          <summary className="zaki-agent-reply-sources__trigger">
            <span className="zaki-agent-reply-sources__kicker">sources</span>
            <span>
              Used {visibleSources.length} source{visibleSources.length === 1 ? "" : "s"}
            </span>
            <span className="zaki-agent-reply-sources__domains">
              {visibleSources.slice(0, 2).map((item) => item.label).join(" / ")}
            </span>
            <span className="zaki-agent-reply-sources__chevron" aria-hidden>
              -&gt;
            </span>
          </summary>
          <div className="zaki-agent-reply-sources__list">
            {visibleSources.map((item, index) => {
              const sourceIsWeb = item.kind === "website";
              const content = (
                <>
                  <span className="zaki-agent-reply-sources__index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {sourceIsWeb ? (
                    <Globe2 className="size-3" aria-hidden />
                  ) : (
                    <FileText className="size-3" aria-hidden />
                  )}
                  <span className="zaki-agent-reply-sources__main">
                    <span>{item.label}</span>
                    {item.summary ? <small>{item.summary}</small> : null}
                  </span>
                  <span className="meta">{item.meta}</span>
                </>
              );
              if (item.href) {
                return (
                  <a
                    key={item.id}
                    className="zaki-agent-reply-sources__item"
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {content}
                  </a>
                );
              }
              return onOpenSources ? (
                <button
                  key={item.id}
                  type="button"
                  className="zaki-agent-reply-sources__item"
                  onClick={onOpenSources}
                >
                  {content}
                </button>
              ) : (
                <span key={item.id} className="zaki-agent-reply-sources__item">
                  {content}
                </span>
              );
            })}
            {onOpenSources ? (
              <button
                type="button"
                className="zaki-agent-reply-sources__panel-link"
                onClick={onOpenSources}
              >
                Open evidence panel
                <ExternalLink className="size-3" aria-hidden />
              </button>
            ) : null}
          </div>
        </details>
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
        const quickReplyItems = buildQuickReplyItems({
          botMode,
          message: msg,
          entries: evidenceEntries,
        });

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
              <QuickReplyChips
                onPick={onQuickReply}
                isRtl={isRtl}
                className="ms-12"
                items={quickReplyItems}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
