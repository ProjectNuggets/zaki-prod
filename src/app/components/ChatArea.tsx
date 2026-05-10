import { BackgroundPattern } from "./BackgroundPattern";
import { InputArea, type InputAreaHandle } from "./InputArea";
import { SandboxBadge } from "@/app/components/agent/SandboxBadge";
import { Share2, MoreVertical, Download, Brain, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  autoTitleThread,
  autoTitleAgentSession,
  apiRequest,
  buildApiUrl,
  captureMemory,
  fetchMemoryActivity,
  fetchAgentHistory,
  fetchAgentMe,
  fetchAgentSession,
  fetchAgentSessionContext,
  compactAgentSession,
  fetchBotRuntimeStatus,
  setAgentSessionMode,
  approveAgentSession,
  fetchUsageQuota,
  getApiBase,
  provisionAgent,
  uploadAgentAttachment,
  type AgentSessionMode,
  type MemoryActivity,
  type MemoryCaptureResponse,
  type UsageQuotaSurface,
} from "@/lib/api";
import { DEFAULT_THREAD_LABEL, isDefaultThreadLabel } from "@/lib/threadTitles";
import { createAnonymousThreadId } from "@/lib/anonymousSpaces";
import { openSpacesMemoryViewer, type MemoryViewerTab } from "@/lib/spacesMemory";
import { trackProductEvent } from "@/lib/productTelemetry";
import {
  readResponseFormattingConfig,
  RESPONSE_FORMATTING_EVENT,
  type ResponseFormattingConfig,
} from "@/lib/responseFormatting";
import {
  SpacesView,
  ZakiHomeView,
  ChatView,
  ReadyState,
  CreateSpaceModal,
  EditInstructionsModal,
  ApprovalRequiredCard,
} from "./chat";
import { ZakiDashboard } from "./chat/views/ZakiDashboard";
import type { BotToolCall } from "./chat/BotToolCallBlock";
import type {
  BotReasoningSummary,
  NullalisApprovalRequest,
  NullalisNarrationFrame,
  NullalisNarrationPhase,
  NullalisTaskItem,
  NullalisTaskStatus,
  NullalisTranscriptEntry,
  BotReplyStart,
  BotStatusEvent,
  ZakiUsageSummary,
  ZakiProcessSnapshot,
  ZakiTranscriptEntryKind,
} from "./chat/BotStatusRail";

import { useNavigationStore, useAuthStore, useZakiSessionUiStore } from "@/stores";
import { mapAgentSessionToZakiSessionUi } from "@/stores/zakiSessionUiStore";
import { ShareModal } from "./ShareModal";
import { toast } from "sonner";
import type { PinnedFile, Space, Message } from "@/types";
import { useMessages } from "@/queries/useThreads";
import { spaceKeys } from "@/queries/useSpaces";
import { useZakiSessions, zakiSessionKeys } from "@/queries/useZakiSessions";
import { prepareAutoTitleExchange } from "@/lib/sessionAutoTitle";
import { useMessageReactions } from "@/queries/useMessageReactions";
import { MemoryCaptureToast } from "./memory/MemoryCaptureToast";
import { ZakiExperimentalNotice } from "./ZakiExperimentalNotice";
import { MemoryImportSheet } from "./onboarding/MemoryImportSheet";
import { OnboardingTour } from "./onboarding/OnboardingTour";
import { useOnboardingProgress } from "@/queries/useOnboardingProgress";
import { useBrainGraph } from "@/queries/useBrainGraph";
import {
  createZakiBotThread,
  isZakiBotSpaceId,
  ZAKI_BOT_LABEL,
  ZAKI_BOT_SPACE_ID,
  ZAKI_BOT_THREAD_ID,
} from "@/lib/zakiBot";
import {
  buildCanonicalZakiThreadSessionKey,
  normalizeZakiSessionKey,
} from "@/lib/zakiSessions";
import {
  getActivationProgress,
  markFirstMemorySaved,
  markFirstMessageSent,
  type ActivationProgress,
} from "@/lib/retention";
import {
  SystemNoticesStack,
  emitSystemNotice,
  type SystemNoticeKind,
  type SystemNoticePayload,
} from "./ui/zaki/SystemNotice";

const SYSTEM_NOTICE_KINDS: readonly SystemNoticeKind[] = [
  "compaction",
  "provider_fallback",
  "connector_stale",
  "multimodal_failure",
  "generic",
];

function extractSystemNoticePayload(
  payload: Record<string, unknown>
): SystemNoticePayload | null {
  const rawKind =
    (typeof payload.kind === "string" && payload.kind.trim().toLowerCase()) ||
    "";
  const kind: SystemNoticeKind = (
    SYSTEM_NOTICE_KINDS as readonly string[]
  ).includes(rawKind)
    ? (rawKind as SystemNoticeKind)
    : "generic";
  const rawSeverity =
    (typeof payload.severity === "string" &&
      payload.severity.trim().toLowerCase()) ||
    "";
  const severity =
    rawSeverity === "info" || rawSeverity === "warning" || rawSeverity === "error"
      ? rawSeverity
      : undefined;
  const message =
    (typeof payload.message === "string" && payload.message.trim()) || null;
  const detail =
    (typeof payload.detail === "string" && payload.detail.trim()) || null;
  const runId =
    (typeof payload.run_id === "string" && payload.run_id.trim()) ||
    (typeof payload.runId === "string" && payload.runId.trim()) ||
    null;
  const idFromPayload =
    (typeof payload.id === "string" && payload.id.trim()) || null;
  const id =
    idFromPayload ||
    (runId ? `${kind}:${runId}` : null) ||
    `${kind}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    kind,
    severity,
    message,
    detail,
    runId,
  };
}

class ChatRequestError extends Error {
  status: number;
  code: string | null;

  constructor(message: string, status: number, code?: string | null) {
    super(message);
    this.name = "ChatRequestError";
    this.status = status;
    this.code = code ?? null;
  }
}

const MEMORY_STATUS_SYNC_THROTTLE_MS = 1200;
const NULLALIS_NARRATION_PHASES = new Set<NullalisNarrationPhase>([
  "thinking",
  "tool_start",
  "tool_done",
  "waiting",
  "plan_step",
  "error_recovery",
  "listening",
  "speaking",
]);

function isNullalisNarrationPhase(value: unknown): value is NullalisNarrationPhase {
  return (
    typeof value === "string" &&
    NULLALIS_NARRATION_PHASES.has(value.trim().toLowerCase() as NullalisNarrationPhase)
  );
}

function numericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Build a canonical nullalis session key from the agent user ID and thread slug.
 *
 * Must match the backend BFF's buildCanonicalThreadSessionKey in bot-bff.js,
 * which always uses the `:thread:<slug>` suffix (including for "main").
 * Earlier versions of this function special-cased "main" to `agent:zaki-bot:user:N:main`
 * (no `:thread:` segment) which caused a mismatch: messages were persisted
 * under `:thread:main` by the backend but we were fetching history for
 * `:main`, so the latest messages appeared to disappear on refresh.
 */
function buildAgentSessionKey(threadSlug: string, agentUserId: string | null) {
  const safeThread = String(threadSlug || "main").trim() || "main";
  const safeUser = String(agentUserId || "").trim();
  if (!safeUser) return null; // not yet resolved
  return buildCanonicalZakiThreadSessionKey(safeUser, safeThread);
}

function isAbortError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes("aborted") || message.includes("abort");
  }
  return false;
}

function getFileExtension(name: string) {
  const normalized = String(name || "").trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf(".");
  return dotIndex >= 0 ? normalized.slice(dotIndex) : "";
}

function formatAcceptedTypeHint(types: Record<string, string[]>) {
  return Array.from(
    new Set(
      Object.values(types || {})
        .flat()
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean)
    )
  )
    .slice(0, 8)
    .join(", ");
}

function splitFilesByAcceptedTypes(
  files: File[],
  acceptedTypes: Record<string, string[]>
) {
  const mimeTypes = new Set(Object.keys(acceptedTypes || {}).map((value) => value.toLowerCase()));
  const extensions = new Set(
    Object.values(acceptedTypes || {})
      .flat()
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean)
  );

  if (mimeTypes.size === 0 && extensions.size === 0) {
    return { valid: files, invalid: [] as File[] };
  }

  const valid: File[] = [];
  const invalid: File[] = [];
  for (const file of files) {
    const mime = String(file.type || "").trim().toLowerCase();
    const extension = getFileExtension(file.name);
    if ((mime && mimeTypes.has(mime)) || (extension && extensions.has(extension))) {
      valid.push(file);
    } else {
      invalid.push(file);
    }
  }
  return { valid, invalid };
}

function getRequestedResponseFormat(prompt: string) {
  const text = String(prompt || "").trim();
  if (!text) return null;
  const tableFormatIntentPatterns = [
    /\b(?:as|into|in)\s+(?:a\s+)?(?:markdown\s+)?table\b/i,
    /\b(?:return|respond|reply|output|format|present|show|organize|summari[sz]e|compare)\b[\s\S]{0,80}\b(?:a\s+)?(?:markdown\s+)?table\b/i,
    /\b(?:table|tabular)\s+format\b/i,
    /(?:^|\s)(?:please|kindly)\s+use\s+(?:a\s+)?(?:markdown\s+)?table(?:\s|$)/i,
    /(?:^|\s)(?:حولها|حوّلها|رتبها|قدّمها|اعرضها|لخّصها|لخصها|قارنها)\s+(?:في|ب)?\s*جدول(?:\s|$)/i,
    /(?:^|\s)(?:على شكل جدول|بصيغة جدول|بتنسيق جدول|جدول مقارنة)(?:\s|$)/i,
  ];
  if (tableFormatIntentPatterns.some((pattern) => pattern.test(text))) return "table";
  if (
    /\b(?:bullet|bullets|bullet points)\b/i.test(text) ||
    /(?:^|\s)(نقاط|بنقاط|تعداد|bullet)(?:\s|$)/i.test(text)
  ) {
    return "bullets";
  }
  if (
    /\b(?:concise|brief|short|briefly)\b/i.test(text) ||
    /(?:^|\s)(باختصار|مختصر|بشكل مختصر)(?:\s|$)/i.test(text)
  ) {
    return "concise";
  }
  return null;
}

function getRequestedBulletCount(prompt: string) {
  const text = String(prompt || "").trim();
  if (!text) return null;
  const match = text.match(/\b(\d+)\s+bullets?\b/i);
  if (match) return Number(match[1]);
  const arabicNumberMatch = text.match(/(\d+)\s+(?:نقاط|بنقاط)/i);
  if (arabicNumberMatch) return Number(arabicNumberMatch[1]);
  return null;
}

const RESPONSE_FORMAT_ENVELOPE_OPEN = "[[ZAKI_RESPONSE_FORMAT_V1]]";
const RESPONSE_FORMAT_ENVELOPE_CLOSE = "[[/ZAKI_RESPONSE_FORMAT_V1]]";

function stripResponseFormatEnvelope(content: string) {
  const text = String(content || "");
  if (!text) return "";
  const openIndex = text.indexOf(RESPONSE_FORMAT_ENVELOPE_OPEN);
  const closeIndex = text.indexOf(RESPONSE_FORMAT_ENVELOPE_CLOSE);
  if (openIndex === -1 || closeIndex === -1 || closeIndex <= openIndex) {
    return text.trim();
  }
  const head = text.slice(0, openIndex);
  const tail = text.slice(closeIndex + RESPONSE_FORMAT_ENVELOPE_CLOSE.length);
  return `${head}${tail}`.trim();
}

function normalizeAssistantFormatting(prompt: string, content: string) {
  const format = getRequestedResponseFormat(prompt);
  const text = stripResponseFormatEnvelope(content);
  if (!format || !text) return text;

  if (format === "bullets") {
    if (/^\s*[-*•]\s+/m.test(text)) return text;
    const cleaned = text.replace(/^•\s*/, "").trim();
    let parts = cleaned
      .split(/\s*;\s+/)
      .map((part) => part.trim().replace(/[.,\s]+$/g, ""))
      .filter(Boolean);
    if (parts.length < 2) {
      parts = cleaned
        .split(/,\s+(?=(?:and\s+)?(?:they|you|it|this|that|these|those)\b)/i)
        .map((part) => part.trim().replace(/^(and|و)\s+/i, "").replace(/[.,\s]+$/g, ""))
        .filter(Boolean);
    }
    if (parts.length < 2) {
      parts = cleaned
        .split(/\s*,\s+/)
        .map((part) => part.trim().replace(/^(and|و)\s+/i, "").replace(/[.,\s]+$/g, ""))
        .filter(Boolean);
    }
    const requestedCount = getRequestedBulletCount(prompt);
    if (requestedCount && parts.length > requestedCount) {
      const head = parts.slice(0, requestedCount - 1);
      const tail = parts.slice(requestedCount - 1).join(", ");
      parts = [...head, tail];
    }
    if (parts.length >= 2) {
      return parts.map((part) => `- ${part}`).join("\n");
    }
  }

  return text;
}

function buildAgentInvocationUrl(invocationId: string, baseHint?: string | null) {
  const normalizedId = String(invocationId || "").trim();
  if (!normalizedId) return null;

  const candidateBase = String(baseHint || "").trim() || getApiBase();
  const httpUrl = buildApiUrl(`/api/agent-invocation/${encodeURIComponent(normalizedId)}`);
  const sourceUrl = candidateBase
    ? `${candidateBase.replace(/\/+$/, "")}/api/agent-invocation/${encodeURIComponent(normalizedId)}`
    : httpUrl;

  if (!sourceUrl) return null;
  return sourceUrl.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
}

function normalizeAgentSocketUrl(rawUrl: string | null | undefined) {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) return null;

  let normalized = trimmed;
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    normalized.startsWith("ws://")
  ) {
    normalized = normalized.replace(/^ws:/i, "wss:");
  }

  try {
    const parsed = new URL(normalized);
    if (
      /^\/agent-invocation\/[^/]+$/i.test(parsed.pathname) &&
      !parsed.pathname.startsWith("/api/")
    ) {
      parsed.pathname = `/api${parsed.pathname}`;
      normalized = parsed.toString();
    }
  } catch {
    // Keep best-effort normalized string.
  }

  return normalized;
}

function extractVisibleAgentChunk(payload: Record<string, unknown>) {
  const content = payload.content;
  if (typeof content === "string") {
    const trimmed = content.trim();
    return trimmed || null;
  }
  if (content && typeof content === "object") {
    const typedContent = content as Record<string, unknown>;
    const nested =
      typedContent.message ||
      typedContent.content ||
      typedContent.status ||
      typedContent.toolName ||
      typedContent.tool ||
      typedContent.name;
    return typeof nested === "string" && nested.trim() ? nested.trim() : null;
  }
  const direct =
    payload.message ||
    payload.content ||
    payload.status ||
    payload.toolName ||
    payload.tool;
  return typeof direct === "string" && direct.trim() ? direct.trim() : null;
}

export function inferStreamingModeFromContext(rawValue: string): "thinking" | "researching" | "writing" {
  const normalized = String(rawValue || "").trim().toLowerCase();
  if (!normalized) return "thinking";
  if (
    normalized.includes("preparing final reply") ||
    normalized.includes("finalizing reply") ||
    normalized.includes("using cached response") ||
    normalized.includes("cached response") ||
    normalized.includes("cached answer")
  ) {
    return "writing";
  }
  if (
    normalized.includes("gathering context") ||
    normalized.includes("retrieving memory") ||
    normalized.includes("trimming context") ||
    normalized.includes("preparing model request") ||
    normalized.includes("reflecting on tool results")
  ) {
    return "thinking";
  }
  if (normalized.includes("running tools")) {
    return "researching";
  }
  if (
    normalized.includes("search") ||
    normalized.includes("web") ||
    normalized.includes("retrieval") ||
    normalized.includes("browse") ||
    normalized.includes("lookup") ||
    normalized.includes("tool") ||
    normalized.includes("fetch") ||
    normalized.includes("crawl") ||
    normalized.includes("exa") ||
    normalized.includes("brave") ||
    normalized.includes("looking up") ||
    normalized.includes("query")
  ) {
    return "researching";
  }
  if (
    normalized.includes("compose") ||
    normalized.includes("final") ||
    normalized.includes("respond") ||
    normalized.includes("draft") ||
    normalized.includes("summarize") ||
    normalized.includes("summary") ||
    normalized.includes("write")
  ) {
    return "writing";
  }
  return "thinking";
}

function normalizeProgressText(rawValue: string | null | undefined) {
  return String(rawValue || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeReasoningSummaryText(rawValue: string | null | undefined) {
  return String(rawValue || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").replace(/\s+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


function isCacheLikeText(rawValue: string | null | undefined) {
  const normalized = normalizeProgressText(rawValue).toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("cached response") ||
    normalized.includes("cache hit") ||
    normalized.includes("using cached") ||
    normalized.includes("cached answer")
  );
}

function humanizeProcessToken(rawValue: string | null | undefined) {
  const normalized = normalizeProgressText(rawValue)
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
  if (!normalized) return "";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatProcessDuration(durationMs?: number | null) {
  if (typeof durationMs !== "number") return null;
  if (durationMs >= 1000) return `${(durationMs / 1000).toFixed(1)}s`;
  return `${durationMs}ms`;
}

type TaskProgressContext = {
  isTaskProgress: boolean;
  taskId: string | null;
  taskState: string | null;
};

function extractTaskProgressContext(progress: {
  phase?: string | null;
  state?: string | null;
  label?: string | null;
  text?: string | null;
}): TaskProgressContext {
  const phase = normalizeProgressText(progress.phase).toLowerCase();
  const label = normalizeProgressText(progress.label || progress.text);
  const directMatch = label.match(/^task\s+([a-z0-9_-]+)\s*:\s*(.+)$/i);
  const fallbackIdMatch = label.match(/\b(task_[a-z0-9_-]+)\b/i);
  const isTaskProgress = phase === "task" || Boolean(directMatch || fallbackIdMatch);
  if (!isTaskProgress) {
    return {
      isTaskProgress: false,
      taskId: null,
      taskState: null,
    };
  }
  const taskId = (directMatch?.[1] || fallbackIdMatch?.[1] || "").trim() || null;
  const taskState = normalizeProgressText(directMatch?.[2] || progress.state) || null;
  return {
    isTaskProgress: true,
    taskId,
    taskState,
  };
}

function buildProcessMetaParts(event: {
  phase?: string | null;
  tool?: string | null;
  taskId?: string | null;
  durationMs?: number | null;
}) {
  const taskContext = extractTaskProgressContext(event);
  return [
    taskContext.isTaskProgress ? "Task" : humanizeProcessToken(event.phase),
    taskContext.taskId || normalizeProgressText(event.taskId) || "",
    event.tool ? `Tool: ${event.tool}` : "",
    formatProcessDuration(event.durationMs),
  ].filter(Boolean);
}

export function buildLatestStatusMeta(event: BotStatusEvent | null | undefined) {
  if (!event) return null;
  const parts = buildProcessMetaParts(event);
  return parts.length > 0 ? parts.join(" • ") : null;
}

function isTaskProgressEvent(event: {
  phase?: string | null;
  taskId?: string | null;
  text?: string | null;
  label?: string | null;
}) {
  return extractTaskProgressContext(event).isTaskProgress || Boolean(normalizeProgressText(event.taskId));
}

function buildProgressEventText(progress: {
  text?: string | null;
  phase?: string | null;
  state?: string | null;
}) {
  const explicit = normalizeProgressText(progress.text);
  if (explicit) return explicit;
  return normalizeProgressText([progress.phase, progress.state].filter(Boolean).join(" • ")) || "Processing update";
}

function buildProgressFingerprint(progress: {
  text?: string | null;
  phase?: string | null;
  state?: string | null;
  tool?: string | null;
}) {
  return [
    normalizeProgressText(progress.text).toLowerCase(),
    normalizeProgressText(progress.phase).toLowerCase(),
    normalizeProgressText(progress.state).toLowerCase(),
    normalizeProgressText(progress.tool).toLowerCase(),
  ].join("|");
}

function classifyProgressTerminal(progress: {
  state?: string | null;
  text?: string | null;
}) {
  const combined = normalizeProgressText([progress.state, progress.text].filter(Boolean).join(" ")).toLowerCase();
  if (!combined) return null;
  if (
    combined.includes("error") ||
    combined.includes("failed") ||
    combined.includes("failure")
  ) {
    return "error" as const;
  }
  if (
    combined.includes("done") ||
    combined.includes("complete") ||
    combined.includes("completed") ||
    combined.includes("finished") ||
    combined.includes("finalizing reply")
  ) {
    return "done" as const;
  }
  return null;
}

function extractReasoningSummaryPayload(payload: Record<string, unknown>) {
  const source =
    (payload.content && typeof payload.content === "object"
      ? (payload.content as Record<string, unknown>)
      : payload) || payload;
  const summaryRaw =
    (typeof source.summary === "string" && source.summary) ||
    (typeof payload.summary === "string" && payload.summary) ||
    (typeof source.text === "string" && source.text) ||
    (typeof payload.text === "string" && payload.text) ||
    (typeof source.label === "string" && source.label) ||
    (typeof payload.label === "string" && payload.label) ||
    (typeof source.message === "string" && source.message) ||
    (typeof payload.message === "string" && payload.message) ||
    "";
  const phaseRaw =
    (typeof source.phase === "string" && source.phase) ||
    (typeof payload.phase === "string" && payload.phase) ||
    "";
  const toolRaw =
    (typeof source.tool === "string" && source.tool) ||
    (typeof source.toolName === "string" && source.toolName) ||
    (typeof payload.tool === "string" && payload.tool) ||
    "";
  const iterationRaw =
    typeof source.iteration === "number"
      ? source.iteration
      : typeof payload.iteration === "number"
        ? payload.iteration
        : undefined;

  const text = normalizeReasoningSummaryText(summaryRaw);
  if (!text) return null;
  return {
    text,
    phase: normalizeProgressText(phaseRaw) || null,
    tool: normalizeProgressText(toolRaw) || null,
    iteration:
      typeof iterationRaw === "number" && Number.isFinite(iterationRaw)
        ? Math.max(0, Math.trunc(iterationRaw))
        : null,
  };
}

function extractReplyStartPayload(payload: Record<string, unknown>) {
  const source =
    (payload.content && typeof payload.content === "object"
      ? (payload.content as Record<string, unknown>)
      : payload) || payload;
  const streamKindRaw =
    (typeof source.stream_kind === "string" && source.stream_kind) ||
    (typeof source.streamKind === "string" && source.streamKind) ||
    (typeof payload.stream_kind === "string" && payload.stream_kind) ||
    (typeof payload.streamKind === "string" && payload.streamKind) ||
    "";
  const deliveryModeRaw =
    (typeof source.delivery_mode === "string" && source.delivery_mode) ||
    (typeof source.deliveryMode === "string" && source.deliveryMode) ||
    (typeof payload.delivery_mode === "string" && payload.delivery_mode) ||
    (typeof payload.deliveryMode === "string" && payload.deliveryMode) ||
    "";
  const liveRaw =
    typeof source.live === "boolean"
      ? source.live
      : typeof payload.live === "boolean"
        ? payload.live
        : null;

  const streamKind = normalizeProgressText(streamKindRaw) || null;
  const deliveryMode = normalizeProgressText(deliveryModeRaw) || null;
  if (!streamKind && !deliveryMode && liveRaw == null) return null;
  return {
    streamKind,
    deliveryMode,
    live: typeof liveRaw === "boolean" ? liveRaw : null,
  };
}

export function extractProgressPayload(payload: Record<string, unknown>) {
  const source =
    (payload.content && typeof payload.content === "object"
      ? (payload.content as Record<string, unknown>)
      : payload) || payload;
  const phaseRaw =
    (typeof source.phase === "string" && source.phase) ||
    (typeof payload.phase === "string" && payload.phase) ||
    "";
  const stateRaw =
    (typeof source.state === "string" && source.state) ||
    (typeof payload.state === "string" && payload.state) ||
    "";
  const labelRaw =
    (typeof source.label === "string" && source.label) ||
    (typeof source.status === "string" && source.status) ||
    (typeof payload.label === "string" && payload.label) ||
    "";
  const toolRaw =
    (typeof source.tool === "string" && source.tool) ||
    (typeof source.toolName === "string" && source.toolName) ||
    (typeof payload.tool === "string" && payload.tool) ||
    undefined;
  const toolUseIdRaw =
    (typeof source.tool_use_id === "string" && source.tool_use_id) ||
    (typeof source.toolUseId === "string" && source.toolUseId) ||
    (typeof payload.tool_use_id === "string" && payload.tool_use_id) ||
    (typeof payload.toolUseId === "string" && payload.toolUseId) ||
    undefined;
  const groupIdRaw =
    (typeof source.group_id === "string" && source.group_id) ||
    (typeof source.groupId === "string" && source.groupId) ||
    (typeof payload.group_id === "string" && payload.group_id) ||
    (typeof payload.groupId === "string" && payload.groupId) ||
    undefined;
  const iterationRaw =
    typeof source.iteration === "number"
      ? source.iteration
      : typeof payload.iteration === "number"
        ? payload.iteration
        : undefined;
  const durationMsRaw =
    typeof source.duration_ms === "number"
      ? source.duration_ms
      : typeof source.durationMs === "number"
        ? source.durationMs
        : typeof payload.duration_ms === "number"
          ? payload.duration_ms
          : typeof payload.durationMs === "number"
            ? payload.durationMs
            : undefined;

  const phase = String(phaseRaw || "").trim() || null;
  const state = String(stateRaw || "").trim() || null;
  const label = String(labelRaw || "").trim() || null;
  const tool = String(toolRaw || "").trim() || null;
  const iteration =
    typeof iterationRaw === "number" && Number.isFinite(iterationRaw)
      ? Math.max(0, Math.trunc(iterationRaw))
      : null;
  const durationMs =
    typeof durationMsRaw === "number" && Number.isFinite(durationMsRaw)
      ? Math.max(0, Math.trunc(durationMsRaw))
      : null;

  const fallbackText = extractVisibleAgentChunk(source);
  const text = label || fallbackText;
  const taskContext = extractTaskProgressContext({ phase, state, label, text });
  if (!text && !phase && !state && !tool) return null;
  return {
    phase,
    state,
    label,
    tool,
    toolUseId: String(toolUseIdRaw || "").trim() || null,
    groupId: String(groupIdRaw || "").trim() || null,
    heartbeat: source.heartbeat === true || payload.heartbeat === true,
    command: extractNullalisCommand(source),
    files: extractNullalisFiles(source),
    taskId: taskContext.taskId,
    iteration,
    durationMs,
    text: text || null,
  };
}

export function inferStreamingModeFromProgress(progress: {
  text?: string | null;
  phase?: string | null;
  state?: string | null;
  label?: string | null;
  tool?: string | null;
}) {
  const taskContext = extractTaskProgressContext(progress);
  if (taskContext.isTaskProgress) {
    return "researching" as const;
  }
  return inferStreamingModeFromContext(
    [progress.phase, progress.state, progress.text, progress.tool]
      .filter(Boolean)
      .join(" ")
  );
}

type ZakiProgressTerminalReason = "done" | "error" | "abort" | "stream_end" | null;

type ZakiTranscriptSeed = {
  id: string;
  kind: ZakiTranscriptEntryKind;
  text: string;
  timestamp: number;
  meta?: string | null;
  state?: "active" | "done" | "error" | null;
};

type BuildZakiProcessSnapshotInput = {
  statusEvents: BotStatusEvent[];
  reasoningSummary: BotReasoningSummary | null;
  replyStart: BotReplyStart | null;
  toolCalls: BotToolCall[];
  latestAssistantMessageContent: string;
  progressTerminalReason: ZakiProgressTerminalReason;
};

function normalizeNarrativeKey(rawValue: string | null | undefined) {
  return normalizeProgressText(rawValue)
    .toLowerCase()
    .replace(/\biteration\s+\d+\b/g, "")
    .replace(/[.,!?;:()[\]{}"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toSentenceCase(rawValue: string | null | undefined) {
  const text = normalizeProgressText(rawValue);
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatTranscriptDuration(durationMs?: number | null) {
  return formatProcessDuration(durationMs) || null;
}

function buildTranscriptMeta(options: {
  durationMs?: number | null;
  phase?: string | null;
  state?: "active" | "done" | "error" | null;
}) {
  const parts = [
    options.state === "done"
      ? "Completed"
      : options.state === "error"
        ? "Failed"
        : options.phase
          ? humanizeProcessToken(options.phase)
          : "",
    formatTranscriptDuration(options.durationMs),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" • ") : null;
}

function deriveNarrativeText(event: {
  text?: string | null;
  phase?: string | null;
  state?: string | null;
  source?: BotStatusEvent["source"];
  tool?: string | null;
  taskId?: string | null;
  terminal?: BotStatusEvent["terminal"];
}) {
  const normalizedText = normalizeProgressText(event.text);
  const normalized = normalizedText.toLowerCase();
  const taskContext = extractTaskProgressContext(event);
  const toolName = normalizeProgressText(event.tool) || null;

  if (event.source === "summary" && normalizedText) {
    return toSentenceCase(normalizedText);
  }
  if (event.terminal === "error") {
    if (taskContext.taskId) return `Task ${taskContext.taskId} failed`;
    if (toolName) return `${toolName} failed`;
    return toSentenceCase(normalizedText || "Something interrupted the reply");
  }
  if (event.terminal === "done") {
    if (taskContext.taskId) return `Completed task ${taskContext.taskId}`;
    if (toolName) return `Finished ${toolName}`;
  }
  if (taskContext.isTaskProgress) {
    return taskContext.taskId ? `Running task ${taskContext.taskId}` : "Running task";
  }
  if (
    normalized.includes("cached response") ||
    normalized.includes("cache hit") ||
    normalized.includes("cached answer")
  ) {
    return "Reusing a cached answer";
  }
  if (
    normalized.includes("preparing final reply") ||
    normalized.includes("finalizing reply") ||
    normalized.includes("final reply")
  ) {
    return "Preparing the final reply";
  }
  if (toolName && (!normalized || normalized === toolName.toLowerCase() || normalized === "running tools")) {
    return `Using ${toolName}`;
  }

  switch (normalized) {
    case "":
      return null;
    case "processing request":
      return "Getting started";
    case "preparing model request":
      return "Checking context and shaping the answer";
    case "trimming context":
      return "Trimming context to keep the request focused";
    case "thinking":
      return "Thinking through the request";
    case "checking context and memory":
      return "Checking context and memory";
    case "thinking through the request":
      return "Thinking through the request";
    case "gathering context":
      return "Checking context and shaping the answer";
    case "retrieving memory":
      return "Checking memory and recent context";
    case "running tools":
      return toolName ? `Using ${toolName}` : "Using tools to gather what I need";
    case "reflecting on tool results":
      return "Reviewing tool results";
    case "compose":
    case "draft":
    case "writing":
      return "Drafting the answer";
    default:
      if (normalized.startsWith("using ") && toolName) {
        return `Using ${toolName}`;
      }
      return toSentenceCase(normalizedText);
  }
}

function buildTranscriptEntryFromStatusEvent(event: BotStatusEvent): ZakiTranscriptSeed | null {
  const text = deriveNarrativeText(event);
  if (!text) return null;
  const taskContext = extractTaskProgressContext(event);
  const kind: ZakiTranscriptEntryKind =
    event.source === "summary"
      ? "narration"
      : taskContext.isTaskProgress
        ? "task"
        : event.tool
          ? "tool"
          : event.source === "fallback"
            ? "transition"
            : "status";
  return {
    id: event.id,
    kind,
    text,
    timestamp: event.timestamp,
    meta: buildTranscriptMeta({
      durationMs: event.durationMs,
      phase:
        kind === "tool"
          ? "tool"
          : taskContext.isTaskProgress
            ? "task"
            : event.phase,
      state:
        event.terminal === "error"
          ? "error"
          : event.terminal === "done"
            ? "done"
            : "active",
    }),
    state:
      event.terminal === "error"
        ? "error"
        : event.terminal === "done"
          ? "done"
          : "active",
  };
}

function buildTranscriptEntriesFromToolCall(toolCall: BotToolCall): ZakiTranscriptSeed[] {
  const activeState: ZakiTranscriptSeed = {
    id: `${toolCall.id}:start`,
    kind: "tool",
    text: `Using ${toolCall.name}`,
    timestamp: toolCall.startedAt || toolCall.timestamp,
    meta: buildTranscriptMeta({
      phase: "tool",
      state: toolCall.result ? (toolCall.result.ok ? "done" : "error") : "active",
      durationMs: toolCall.durationMs,
    }),
    state: toolCall.result ? (toolCall.result.ok ? "done" : "error") : "active",
  };

  if (!toolCall.result) return [activeState];

  return [
    activeState,
    {
      id: `${toolCall.id}:result`,
      kind: "tool",
      text: toolCall.result.ok ? `Finished ${toolCall.name}` : `${toolCall.name} failed`,
      timestamp: toolCall.finishedAt || toolCall.timestamp,
      meta: buildTranscriptMeta({
        phase: "tool",
        state: toolCall.result.ok ? "done" : "error",
        durationMs:
          toolCall.durationMs ??
          (typeof toolCall.finishedAt === "number"
            ? Math.max(0, toolCall.finishedAt - toolCall.startedAt)
            : null),
      }),
      state: toolCall.result.ok ? "done" : "error",
    },
  ];
}

function dedupeTranscriptEntries(entries: ZakiTranscriptSeed[]) {
  const sorted = [...entries].sort((left, right) => {
    if (left.timestamp !== right.timestamp) return left.timestamp - right.timestamp;
    return left.id.localeCompare(right.id);
  });

  return sorted.reduce<ZakiTranscriptSeed[]>((acc, entry) => {
    const key = [
      entry.kind,
      normalizeNarrativeKey(entry.text),
      normalizeNarrativeKey(entry.meta),
    ].join("|");
    const last = acc[acc.length - 1];
    if (
      last &&
      [
        last.kind,
        normalizeNarrativeKey(last.text),
        normalizeNarrativeKey(last.meta),
      ].join("|") === key
    ) {
      acc[acc.length - 1] = entry;
      return acc;
    }
    acc.push(entry);
    return acc;
  }, []);
}

function buildZakiTranscriptEntries(input: {
  statusEvents: BotStatusEvent[];
  replyStart: BotReplyStart | null;
  toolCalls: BotToolCall[];
}) {
  const seeds: ZakiTranscriptSeed[] = [];
  input.statusEvents.forEach((event) => {
    const next = buildTranscriptEntryFromStatusEvent(event);
    if (next) seeds.push(next);
  });
  input.toolCalls.forEach((toolCall) => {
    seeds.push(...buildTranscriptEntriesFromToolCall(toolCall));
  });
  if (input.replyStart) {
    seeds.push({
      id: `${input.replyStart.id}:reply`,
      kind: "transition",
      text: "Preparing the final reply",
      timestamp: input.replyStart.timestamp,
      meta: "Transition",
      state: "active",
    });
  }

  return dedupeTranscriptEntries(seeds).slice(-8);
}

function buildCurrentAction(input: {
  phase: ZakiProcessSnapshot["phase"];
  reasoningSummary: BotReasoningSummary | null;
  replyStart: BotReplyStart | null;
  latestTaskEvent: BotStatusEvent | null;
  activeToolCall: BotToolCall | null;
  latestStatusEvent: BotStatusEvent | null;
  isCacheHit: boolean;
}) {
  if (input.phase === "error") {
    const latestError =
      [input.latestStatusEvent, input.latestTaskEvent]
        .filter(Boolean)
        .find((event) => event?.terminal === "error") ?? null;
    return {
      kind: "status" as const,
      text: deriveNarrativeText(latestError || { text: "Something interrupted the reply." }) || "Something interrupted the reply.",
      meta: latestError ? buildLatestStatusMeta(latestError) : null,
    };
  }
  if (input.isCacheHit) {
    return {
      kind: "transition" as const,
      text: "Reusing a cached answer",
      meta: null,
    };
  }
  if (input.replyStart || input.phase === "reply_ready" || input.phase === "revealing" || input.phase === "complete") {
    return {
      kind: "transition" as const,
      text: "Preparing the final reply",
      meta: null,
    };
  }
  if (input.reasoningSummary) {
    return {
      kind: "narration" as const,
      text: toSentenceCase(input.reasoningSummary.text),
      meta: input.reasoningSummary.phase ? humanizeProcessToken(input.reasoningSummary.phase) : null,
    };
  }
  if (input.latestTaskEvent) {
    return {
      kind: "task" as const,
      text: deriveNarrativeText(input.latestTaskEvent) || "Running task",
      meta: buildLatestStatusMeta(input.latestTaskEvent),
    };
  }
  if (input.activeToolCall) {
    return {
      kind: "tool" as const,
      text: `Using ${input.activeToolCall.name}`,
      meta: buildTranscriptMeta({
        phase: "tool",
        state: "active",
      }),
    };
  }
  if (input.latestStatusEvent) {
    return {
      kind: "status" as const,
      text: deriveNarrativeText(input.latestStatusEvent) || "Getting started",
      meta: buildLatestStatusMeta(input.latestStatusEvent),
    };
  }
  return {
    kind: "transition" as const,
    text: "Getting started",
    meta: null,
  };
}

export function buildZakiProcessSnapshot(input: BuildZakiProcessSnapshotInput): ZakiProcessSnapshot {
  const latestStatusEvent = input.statusEvents[input.statusEvents.length - 1] ?? null;
  const latestStatusText = latestStatusEvent?.text || null;
  const latestStatusMeta = buildLatestStatusMeta(latestStatusEvent);
  const latestRunningTool = [...input.toolCalls]
    .reverse()
    .find((toolCall) => !toolCall.result) ?? null;
  const latestResolvedTool = input.toolCalls[input.toolCalls.length - 1] ?? null;
  const latestToolName =
    latestRunningTool?.name ||
    latestResolvedTool?.name ||
    input.reasoningSummary?.tool ||
    latestStatusEvent?.tool ||
    latestStatusEvent?.taskId ||
    null;
  const hasTools = input.toolCalls.length > 0;
  const hasTaskProgress = input.statusEvents.some((event) => isTaskProgressEvent(event));
  const isCacheHit =
    isCacheLikeText(input.reasoningSummary?.text) ||
    isCacheLikeText(latestStatusText);
  const isReplyReplay =
    input.replyStart?.streamKind === "final_reply" &&
    input.replyStart?.deliveryMode === "buffered_replay" &&
    input.replyStart?.live === false;
  const replyRevealStarted =
    Boolean(isReplyReplay) && input.latestAssistantMessageContent.trim().length > 0;

  let phase: ZakiProcessSnapshot["phase"] = "ack";
  if (input.progressTerminalReason === "error") {
    phase = "error";
  } else if (isReplyReplay && replyRevealStarted) {
    phase = "revealing";
  } else if (isReplyReplay) {
    phase = "reply_ready";
  } else if (input.progressTerminalReason === "done" || input.progressTerminalReason === "stream_end") {
    phase = "complete";
  } else if (
    hasTaskProgress ||
    (hasTools && (latestRunningTool || input.reasoningSummary?.tool || latestStatusEvent?.tool))
  ) {
    phase = "tooling";
  } else if (input.reasoningSummary?.text || latestStatusText) {
    phase =
      latestStatusText === "Processing request" &&
      !input.reasoningSummary?.text &&
      input.statusEvents.length === 1
        ? "ack"
        : "working";
  }

  const transcriptEntries = buildZakiTranscriptEntries({
    statusEvents: input.statusEvents,
    replyStart: isReplyReplay ? input.replyStart : null,
    toolCalls: input.toolCalls,
  });
  const latestTaskEvent =
    [...input.statusEvents]
      .reverse()
      .find((event) => isTaskProgressEvent(event) && event.terminal !== "done" && event.terminal !== "error") ?? null;
  const currentAction = buildCurrentAction({
    phase,
    reasoningSummary: input.reasoningSummary,
    replyStart: isReplyReplay ? input.replyStart : null,
    latestTaskEvent,
    activeToolCall: latestRunningTool,
    latestStatusEvent,
    isCacheHit,
  });
  const filteredTranscriptEntries = transcriptEntries.filter(
    (entry) => normalizeNarrativeKey(entry.text) !== normalizeNarrativeKey(currentAction.text)
  );

  const workStartedAtCandidates = [
    ...input.statusEvents.map((event) => event.timestamp),
    ...input.toolCalls.map((toolCall) => toolCall.startedAt || toolCall.timestamp),
    input.reasoningSummary?.timestamp,
    input.replyStart?.timestamp,
  ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const workStartedAt =
    workStartedAtCandidates.length > 0 ? Math.min(...workStartedAtCandidates) : null;

  return {
    phase,
    summaryText: input.reasoningSummary?.text || null,
    latestStatusText,
    latestStatusMeta,
    latestToolName,
    currentActionText: currentAction.text,
    currentActionMeta: currentAction.meta,
    currentActionKind: currentAction.kind,
    transcriptEntries: filteredTranscriptEntries,
    workStartedAt,
    hasTools,
    isCacheHit,
    isReplyReplay: Boolean(isReplyReplay),
    replyRevealStarted,
  };
}

function extractToolCallPayload(payload: Record<string, unknown>) {
  const source =
    (payload.content && typeof payload.content === "object"
      ? (payload.content as Record<string, unknown>)
      : payload) || payload;
  const requestId =
    (typeof source.requestId === "string" && source.requestId) ||
    (typeof source.request_id === "string" && source.request_id) ||
    (typeof payload.requestId === "string" && payload.requestId) ||
    (typeof payload.request_id === "string" && payload.request_id) ||
    undefined;
  const name =
    (typeof source.name === "string" && source.name) ||
    (typeof source.toolName === "string" && source.toolName) ||
    (typeof source.tool === "string" && source.tool) ||
    "unknown_tool";
  const args =
    source.arguments && typeof source.arguments === "object"
      ? (source.arguments as Record<string, unknown>)
      : {};
  return { requestId, name, arguments: args };
}

function extractToolResultPayload(payload: Record<string, unknown>) {
  const source =
    (payload.content && typeof payload.content === "object"
      ? (payload.content as Record<string, unknown>)
      : payload) || payload;
  const requestId =
    (typeof source.requestId === "string" && source.requestId) ||
    (typeof source.request_id === "string" && source.request_id) ||
    (typeof payload.requestId === "string" && payload.requestId) ||
    (typeof payload.request_id === "string" && payload.request_id) ||
    undefined;
  const name =
    (typeof source.name === "string" && source.name) ||
    (typeof source.toolName === "string" && source.toolName) ||
    (typeof source.tool === "string" && source.tool) ||
    undefined;
  const okRaw = source.ok ?? source.success;
  const ok =
    okRaw === true ||
    (okRaw !== false && typeof source.error !== "string");
  const error = typeof source.error === "string" ? source.error : undefined;
  const result =
    source.result ??
    source.output_preview ??
    source.outputPreview ??
    source.output ??
    undefined;
  const durationMs = numericValue(source.duration_ms ?? source.durationMs);
  return { requestId, name, ok, error, result, durationMs };
}

export function extractNullalisNarrationFrame(
  payload: Record<string, unknown>,
  now = Date.now()
): NullalisNarrationFrame | null {
  if (!isNullalisNarrationPhase(payload.phase)) return null;
  const phase = payload.phase.trim().toLowerCase() as NullalisNarrationPhase;
  const stepIndex =
    numericValue(payload.step_index ?? payload.stepIndex) ??
    numericValue(payload.index);
  const stepTotal =
    numericValue(payload.step_total ?? payload.stepTotal ?? payload.total);
  const durationMs = numericValue(payload.duration_ms ?? payload.durationMs);
  return {
    id: `zaki-runtime-narration-${now}-${Math.random().toString(36).slice(2, 8)}`,
    phase,
    label:
      (typeof payload.label === "string" && payload.label.trim()) ||
      (typeof payload.status === "string" && payload.status.trim()) ||
      (typeof payload.message === "string" && payload.message.trim()) ||
      (phase === "thinking" ? "Thinking..." : phase.replace(/_/g, " ")),
    tool: typeof payload.tool === "string" ? payload.tool : null,
    iteration: numericValue(payload.iteration),
    durationMs,
    stepIndex,
    stepTotal,
    timestamp: now,
  };
}

export function extractNullalisTaskItem(
  payload: Record<string, unknown>,
  now = Date.now()
): NullalisTaskItem | null {
  const taskId =
    (typeof payload.task_id === "string" && payload.task_id.trim()) ||
    (typeof payload.taskId === "string" && payload.taskId.trim()) ||
    "";
  if (!taskId) return null;
  const rawStatus = String(payload.status || payload.state || "queued")
    .trim()
    .toLowerCase();
  const status: NullalisTaskStatus =
    rawStatus === "succeeded"
      ? "succeeded"
      : rawStatus === "done" ||
          rawStatus === "running" ||
          rawStatus === "queued" ||
          rawStatus === "failed" ||
          rawStatus === "cancelled" ||
          rawStatus === "blocked" ||
          rawStatus === "deferred"
        ? rawStatus
        : "queued";
  return {
    taskId,
    status,
    description:
      (typeof payload.description === "string" && payload.description.trim()) ||
      (typeof payload.label === "string" && payload.label.trim()) ||
      taskId,
    progressPct: numericValue(payload.progress_pct ?? payload.progressPct),
    updatedAt: now,
  };
}

function extractNullalisApprovalRequest(
  payload: Record<string, unknown>,
  now = Date.now()
): NullalisApprovalRequest {
  return {
    id: `approval-${now}-${Math.random().toString(36).slice(2, 8)}`,
    tool:
      (typeof payload.tool === "string" && payload.tool.trim()) ||
      (typeof payload.tool_name === "string" && payload.tool_name.trim()) ||
      "tool",
    reason:
      (typeof payload.reason === "string" && payload.reason.trim()) ||
      "Mutating operation requires approval.",
    riskLevel:
      (typeof payload.risk_level === "string" && payload.risk_level.trim()) ||
      (typeof payload.riskLevel === "string" && payload.riskLevel.trim()) ||
      "unknown",
    timestamp: now,
  };
}

export function extractNullalisUsageSummary(
  payload: Record<string, unknown>
): ZakiUsageSummary | null {
  const usageTokens = numericValue(payload.usage_tokens ?? payload.usageTokens);
  const costUsd = numericValue(payload.cost_usd ?? payload.costUsd);
  if (usageTokens == null && costUsd == null) return null;
  return { usageTokens, costUsd };
}

export function extractNullalisReasoningNarrationFrame(
  payload: Record<string, unknown>,
  now = Date.now()
): NullalisNarrationFrame | null {
  const summary = extractReasoningSummaryPayload(payload);
  if (!summary) return null;
  const phase = isNullalisNarrationPhase(summary.phase)
    ? (summary.phase.trim().toLowerCase() as NullalisNarrationPhase)
    : "thinking";
  return {
    id: `zaki-runtime-summary-${now}-${Math.random().toString(36).slice(2, 8)}`,
    phase,
    label: summary.text,
    tool: summary.tool,
    iteration: summary.iteration,
    durationMs: null,
    stepIndex: null,
    stepTotal: null,
    timestamp: now,
  };
}

function normalizeNullalisTranscriptLabel(label: string | null | undefined, phase?: string | null) {
  const raw = normalizeProgressText(label).replace(/\.+$/, "");
  const key = raw.toLowerCase();
  const mapped: Record<string, string> = {
    "analyzing request": "Analyzing the request",
    "gathering context": "Checking context and memory",
    "checking context and memory": "Checking context and memory",
    "retrieving memory": "Searching saved memory",
    "trimming context": "Trimming context to keep the request focused",
    "thinking": "Thinking through the request",
    "thinking through the request": "Thinking through the request",
    "preparing model request": "Preparing the model request",
    "model response received": "Reading the model response",
    "processing model response": "Processing the model response",
    "preparing final reply": "Preparing the final reply",
    "preparing the final answer": "Preparing the final answer",
    "finalizing reply": "Finalizing the response",
    "finishing the response": "Finishing the response",
    "response ready": "Response ready",
  };
  if (mapped[key]) return mapped[key];
  if (raw) return raw;
  if (phase === "waiting") return "Waiting for provider";
  if (phase === "error_recovery") return "Retrying after a transient issue";
  if (phase === "speaking") return "Preparing the spoken response";
  if (phase === "listening") return "Listening for input";
  return "Processing request";
}

function extractNullalisFiles(payload: Record<string, unknown>) {
  const candidates: string[] = [];
  const appendArray = (value: unknown) => {
    if (!Array.isArray(value)) return;
    for (const item of value) {
      if (typeof item === "string" && item.trim()) {
        candidates.push(item.trim());
      }
    }
  };
  appendArray(payload.files);
  appendArray(payload.file_paths);
  appendArray(payload.filePaths);
  appendArray(payload.paths);

  const preview =
    (typeof payload.output_preview === "string" && payload.output_preview) ||
    (typeof payload.outputPreview === "string" && payload.outputPreview) ||
    (typeof payload.result === "string" && payload.result) ||
    (typeof payload.output === "string" && payload.output) ||
    "";
  const filePattern =
    /(?:^|[\s"'`])((?:\.{1,2}\/|\/|[A-Za-z0-9_.-]+\/)[A-Za-z0-9_./-]+\.[A-Za-z0-9]{1,8})(?=$|[\s"'`,:;)])/g;
  for (const match of preview.matchAll(filePattern)) {
    const filePath = String(match[1] || "").trim();
    if (filePath && !filePath.includes("://")) {
      candidates.push(filePath);
    }
  }

  return Array.from(new Set(candidates)).slice(0, 4);
}

function extractNullalisCommand(payload: Record<string, unknown>) {
  const command =
    (typeof payload.command === "string" && payload.command.trim()) ||
    (typeof payload.cmd === "string" && payload.cmd.trim()) ||
    "";
  if (command) return command;
  const preview =
    (typeof payload.output_preview === "string" && payload.output_preview) ||
    (typeof payload.outputPreview === "string" && payload.outputPreview) ||
    "";
  const firstLine = preview.split(/\r?\n/).find((line) => line.trim());
  if (!firstLine) return null;
  const trimmed = firstLine.trim();
  if (trimmed.startsWith("$ ")) return trimmed.slice(2).trim() || null;
  return null;
}

function inferNullalisIntent(input: {
  text?: string | null;
  phase?: string | null;
  tool?: string | null;
  files?: string[];
  command?: string | null;
}): NullalisTranscriptEntry["intent"] {
  const haystack = [input.text, input.phase, input.tool, input.command, ...(input.files ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (haystack.includes("memory")) return "memory";
  if (haystack.includes("context") || haystack.includes("prompt")) return "context";
  if (haystack.includes("plan") || haystack.includes("step")) return "planning";
  if (haystack.includes("approval")) return "approval";
  if (haystack.includes("final") || haystack.includes("response ready")) return "final";
  if (haystack.includes("model")) return "model";
  if (haystack.includes("test") || haystack.includes("jest") || haystack.includes("vitest")) {
    return "test";
  }
  if (haystack.includes("git ") || haystack.includes("commit") || haystack.includes("push")) {
    return "git";
  }
  if (input.files?.length) return "file";
  if (input.tool) return "tool";
  if (haystack.includes("thinking")) return "thinking";
  return "status";
}

function nullalisImportance(input: {
  source?: NullalisTranscriptEntry["source"];
  kind: NullalisTranscriptEntry["kind"];
  text?: string | null;
  intent?: NullalisTranscriptEntry["intent"];
  files?: string[];
  command?: string | null;
  durationMs?: number | null;
}) {
  const text = normalizeProgressText(input.text).toLowerCase();
  if (input.source === "reasoning_summary") return 90;
  if (input.kind === "approval") return 95;
  if (input.kind === "tool") return input.files?.length || input.command ? 88 : 78;
  if (input.kind === "task") return 76;
  if (input.kind === "transition") return 65;
  if (input.intent === "memory" || input.intent === "context") return 70;
  if (
    text === "processing request" ||
    text === "preparing the model request" ||
    text === "reading the model response"
  ) {
    return 25;
  }
  if (input.intent === "model") return 35;
  return 55;
}

function nullalisEntryId(prefix: string, now: number) {
  return `zaki-runtime-${prefix}-${now}-${Math.random().toString(36).slice(2, 8)}`;
}

export function extractNullalisTranscriptEntry(
  eventType: string | null | undefined,
  payload: Record<string, unknown>,
  now = Date.now()
): NullalisTranscriptEntry | null {
  const payloadType = typeof payload.type === "string" ? payload.type : null;
  const type = (eventType || payloadType || "").trim().toLowerCase();

  if (type === "reasoning_summary") {
    const summary = extractReasoningSummaryPayload(payload);
    if (!summary) return null;
    const intent = inferNullalisIntent({
      text: summary.text,
      phase: summary.phase,
      tool: summary.tool,
    });
    return {
      id: nullalisEntryId("summary", now),
      kind: "narration",
      intent,
      text: summary.text,
      timestamp: now,
      importance: 90,
      phase: summary.phase,
      tool: summary.tool,
      groupKey: `summary:${normalizeProgressText(summary.text).toLowerCase()}`,
      source: "reasoning_summary",
    };
  }

  if (type === "progress") {
    const frame = extractNullalisNarrationFrame(payload, now);
    if (!frame) return null;
    const tool = String(frame.tool || "").trim();
    const label = normalizeNullalisTranscriptLabel(frame.label, frame.phase);
    let text = label;
    if (frame.phase === "tool_start") {
      text = tool ? `Using ${tool}` : label || "Using a tool";
    } else if (frame.phase === "tool_done") {
      const duration = frame.durationMs != null ? ` · ${Math.round(frame.durationMs)}ms` : "";
      text = tool ? `${tool} completed${duration}` : label || `Tool completed${duration}`;
    } else if (frame.phase === "plan_step" && frame.stepIndex != null && frame.stepTotal != null) {
      text = `Step ${frame.stepIndex}/${frame.stepTotal}: ${label}`;
    }
    const files = extractNullalisFiles(payload);
    const command = extractNullalisCommand(payload);
    const toolUseId =
      (typeof payload.tool_use_id === "string" && payload.tool_use_id.trim()) ||
      (typeof payload.toolUseId === "string" && payload.toolUseId.trim()) ||
      null;
    const taskId =
      (typeof payload.task_id === "string" && payload.task_id.trim()) ||
      (typeof payload.taskId === "string" && payload.taskId.trim()) ||
      null;
    const groupId =
      (typeof payload.group_id === "string" && payload.group_id.trim()) ||
      (typeof payload.groupId === "string" && payload.groupId.trim()) ||
      null;
    const heartbeat = payload.heartbeat === true;
    const intent = inferNullalisIntent({
      text,
      phase: frame.phase,
      tool: frame.tool,
      files,
      command,
    });
    const kind =
      frame.phase === "tool_start" || frame.phase === "tool_done"
        ? "tool"
        : frame.phase === "plan_step"
          ? "task"
          : frame.phase === "error_recovery"
            ? "status"
            : "narration";
    return {
      id: frame.id.replace("zaki-runtime-narration", "zaki-runtime-transcript"),
      kind,
      intent,
      text,
      timestamp: frame.timestamp,
      importance: nullalisImportance({
        source: "progress",
        kind,
        text,
        intent,
        files,
        command,
        durationMs: frame.durationMs,
      }),
      phase: frame.phase,
      tool: frame.tool,
      toolUseId,
      taskId,
      durationMs: frame.durationMs,
      files,
      command,
      heartbeat,
      resultState: frame.phase === "tool_done" ? "done" : frame.phase === "tool_start" ? "running" : null,
      groupKey:
        toolUseId
          ? `tool-use:${toolUseId}`
          : taskId
            ? `task:${taskId}`
            : groupId
              ? `group:${groupId}`
              : frame.tool && (frame.phase === "tool_start" || frame.phase === "tool_done")
                ? `tool:${frame.tool}`
                : `${intent}:${normalizeProgressText(text).toLowerCase()}`,
      source: "progress",
    };
  }

  if (type === "status" || type === "statusresponse") {
    const progress = extractProgressPayload(payload);
    const text =
      progress?.text ||
      (typeof payload.label === "string" && payload.label.trim()) ||
      (typeof payload.message === "string" && payload.message.trim()) ||
      (typeof payload.status === "string" && payload.status.trim()) ||
      "";
    if (!text) return null;
    const intent = inferNullalisIntent({
      text,
      phase: progress?.phase,
      tool: progress?.tool,
    });
    const normalizedText = normalizeNullalisTranscriptLabel(text, progress?.phase);
    return {
      id: nullalisEntryId("status", now),
      kind: "status",
      intent,
      text: normalizedText,
      timestamp: now,
      importance: nullalisImportance({
        source: "progress",
        kind: "status",
        text: normalizedText,
        intent,
        durationMs: progress?.durationMs,
      }),
      phase: progress?.phase ?? null,
      tool: progress?.tool ?? null,
      toolUseId: progress?.toolUseId ?? null,
      taskId: progress?.taskId ?? null,
      durationMs: progress?.durationMs ?? null,
      status: progress?.state ?? null,
      files: progress?.files ?? [],
      command: progress?.command ?? null,
      heartbeat: progress?.heartbeat === true,
      resultState: progress?.state === "done" ? "done" : progress?.state === "error" ? "failed" : null,
      groupKey: progress?.toolUseId
        ? `tool-use:${progress.toolUseId}`
        : progress?.taskId
          ? `task:${progress.taskId}`
          : progress?.groupId
            ? `group:${progress.groupId}`
            : `${intent}:${normalizeProgressText(normalizedText).toLowerCase()}`,
      source: "progress",
    };
  }

  if (type === "tool_start") {
    const tool =
      (typeof payload.tool === "string" && payload.tool.trim()) ||
      (typeof payload.name === "string" && payload.name.trim()) ||
      "tool";
    const files = extractNullalisFiles(payload);
    const command = extractNullalisCommand(payload);
    const toolUseId =
      (typeof payload.tool_use_id === "string" && payload.tool_use_id.trim()) ||
      (typeof payload.toolUseId === "string" && payload.toolUseId.trim()) ||
      null;
    const inputPreview =
      (typeof payload.input_preview === "string" && payload.input_preview.trim()) ||
      (typeof payload.inputPreview === "string" && payload.inputPreview.trim()) ||
      null;
    const activityLabel =
      (typeof payload.activity_label === "string" && payload.activity_label.trim()) ||
      (typeof payload.activityLabel === "string" && payload.activityLabel.trim()) ||
      null;
    const intent = inferNullalisIntent({ text: `Using ${tool}`, tool, files, command });
    return {
      id: nullalisEntryId("tool-start", now),
      kind: "tool",
      intent,
      text: activityLabel || `Using ${tool}`,
      timestamp: now,
      importance: nullalisImportance({
        source: "tool",
        kind: "tool",
        text: activityLabel || `Using ${tool}`,
        intent,
        files,
        command,
      }),
      phase: "tool_start",
      tool,
      toolUseId,
      files,
      command,
      inputPreview,
      activityLabel,
      resultState: "running",
      groupKey: toolUseId ? `tool-use:${toolUseId}` : `tool:${tool}`,
      source: "tool",
    };
  }

  if (type === "tool_result") {
    const toolResult = extractToolResultPayload(payload);
    const tool = toolResult.name || "tool";
    const duration = toolResult.durationMs != null ? ` · ${Math.round(toolResult.durationMs)}ms` : "";
    const files = extractNullalisFiles(payload);
    const command = extractNullalisCommand(payload);
    const toolUseId =
      (typeof payload.tool_use_id === "string" && payload.tool_use_id.trim()) ||
      (typeof payload.toolUseId === "string" && payload.toolUseId.trim()) ||
      null;
    const outputPreview =
      (typeof payload.output_preview === "string" && payload.output_preview.trim()) ||
      (typeof payload.outputPreview === "string" && payload.outputPreview.trim()) ||
      (typeof toolResult.result === "string" && toolResult.result.trim()) ||
      null;
    const resultSummary =
      (typeof payload.result_summary === "string" && payload.result_summary.trim()) ||
      (typeof payload.resultSummary === "string" && payload.resultSummary.trim()) ||
      null;
    const outputTruncated =
      payload.output_truncated === true || payload.outputTruncated === true;
    const exitCode = numericValue(payload.exit_code ?? payload.exitCode);
    const text = toolResult.ok ? `${tool} completed${duration}` : `${tool} failed`;
    const intent = inferNullalisIntent({ text, tool, files, command });
    return {
      id: nullalisEntryId("tool-result", now),
      kind: "tool",
      intent,
      text,
      timestamp: now,
      importance: nullalisImportance({
        source: "tool",
        kind: "tool",
        text,
        intent,
        files,
        command,
        durationMs: toolResult.durationMs,
      }),
      phase: "tool_done",
      tool,
      toolUseId,
      durationMs: toolResult.durationMs,
      status: toolResult.ok ? "done" : "failed",
      files,
      command,
      outputPreview,
      outputTruncated,
      resultSummary,
      exitCode,
      resultState: toolResult.ok ? "done" : "failed",
      groupKey: toolUseId ? `tool-use:${toolUseId}` : `tool:${tool}`,
      source: "tool",
    };
  }

  if (type === "task_update") {
    const task = extractNullalisTaskItem(payload, now);
    if (!task) return null;
    const taskName = task.description || task.taskId;
    const statusCopy =
      task.status === "running"
        ? "Running"
        : task.status === "done" || task.status === "succeeded"
          ? "Completed"
          : task.status === "queued"
            ? "Queued"
            : task.status.charAt(0).toUpperCase() + task.status.slice(1);
    const text = `${statusCopy} task: ${taskName}`;
    const intent = inferNullalisIntent({ text, phase: "task_update" });
    return {
      id: nullalisEntryId(`task-${task.taskId}`, now),
      kind: "task",
      intent,
      text,
      timestamp: task.updatedAt,
      importance: nullalisImportance({
        source: "task",
        kind: "task",
        text,
        intent,
      }),
      phase: "task_update",
      taskId: task.taskId,
      status: task.status,
      resultState:
        task.status === "done" || task.status === "succeeded"
          ? "done"
          : task.status === "failed"
            ? "failed"
            : task.status === "blocked"
              ? "blocked"
              : task.status === "queued"
                ? "queued"
                : task.status === "running"
                  ? "running"
                  : null,
      groupKey: `task:${task.taskId}`,
      source: "task",
    };
  }

  if (type === "approval_required") {
    const approval = extractNullalisApprovalRequest(payload, now);
    return {
      id: nullalisEntryId("approval", now),
      kind: "approval",
      intent: "approval",
      text: `Approval required for ${approval.tool}`,
      timestamp: approval.timestamp,
      importance: 95,
      phase: "approval_required",
      tool: approval.tool,
      status: approval.riskLevel,
      resultState: "blocked",
      groupKey: `approval:${approval.tool}`,
      source: "approval",
    };
  }

  if (type === "done") {
    return {
      id: nullalisEntryId("done", now),
      kind: "transition",
      intent: "final",
      text: "Finalized the response",
      timestamp: now,
      importance: 65,
      phase: "done",
      status: "done",
      resultState: "done",
      groupKey: "done",
      source: "done",
    };
  }

  return null;
}

function buildNullalisTranscriptFingerprint(entry: NullalisTranscriptEntry) {
  return [entry.kind, normalizeNarrativeKey(entry.text)].join("|");
}

export function ChatArea() {
  const queryClient = useQueryClient();
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const isRtl = i18n.language?.toLowerCase().startsWith("ar");
  const chatCopy = {
    spaceFallback: isRtl ? "مساحة" : "Space",
    newChat: isRtl ? "محادثة جديدة" : "New chat",
    copied: isRtl ? "تم النسخ إلى الحافظة" : "Copied to clipboard",
    copyFailed: isRtl ? "تعذر نسخ الرسالة" : "Unable to copy message",
    exported: isRtl ? "تم تصدير المحادثة" : "Chat exported",
    exportFailed: isRtl ? "تعذر تصدير هذه المحادثة" : "Unable to export this chat",
    dragPrompt: isRtl ? "أسقط الملفات داخل المساحة ليتم استخدامها" : "Drop files into a workspace to ground them",
    botUploadUnavailable: isRtl
      ? "رفع الملفات غير متاح داخل بوت زكي بعد."
      : "File uploads are not available inside ZAKI Bot yet.",
    shareConversationAria: isRtl ? "مشاركة المحادثة" : "Share conversation",
    shareConversation: isRtl ? "مشاركة" : "Share",
    moreOptionsAria: isRtl ? "خيارات إضافية" : "More options",
    reviewMemoriesAria: isRtl ? "مراجعة الذكريات" : "Review memories",
    reviewMemories: isRtl ? "مراجعة الذكريات" : "Review Memories",
    exportJsonAria: isRtl ? "تصدير المحادثة بصيغة JSON" : "Export conversation as JSON",
    exportJson: isRtl ? "تصدير JSON" : "Export JSON",
    scrollToBottomAria: isRtl ? "الانتقال إلى آخر المحادثة" : "Scroll to bottom",
    unsupportedType: (hint?: string) =>
      hint
        ? isRtl
          ? `نوع الملف غير مدعوم. استخدم أحد الأنواع التالية: ${hint}.`
          : `Unsupported type. Use one of: ${hint}.`
        : isRtl
          ? "نوع الملف غير مدعوم."
          : "Unsupported file type.",
    unsupportedUploadToast: (hint?: string) =>
      hint
        ? isRtl
          ? `نوع الملف غير مدعوم. ارفع أحد الأنواع التالية: ${hint}.`
          : `Unsupported file type. Upload one of: ${hint}.`
        : isRtl
          ? "نوع الملف غير مدعوم لرفع ملفات المساحة."
          : "Unsupported file type for workspace upload.",
    addedFile: (name: string) =>
      isRtl ? `تمت إضافة ${name} إلى ملفات المساحة.` : `Added ${name} to workspace files.`,
    addedFiles: (count: number) =>
      isRtl ? `تمت إضافة ${count} ملفات إلى ملفات المساحة.` : `Added ${count} files to workspace files.`,
    uploadFailed: isRtl ? "فشل الرفع." : "Upload failed.",
    unableToUpload: isRtl ? "تعذر رفع الملفات." : "Unable to upload files.",
    experimentalLimitReached: (resetLabel: string) =>
      isRtl
        ? `وصلت إلى حد المعاينة المجانية لهذا الأسبوع. تتم إعادة التعيين أسبوعيًا. جرّب مرة أخرى بعد ${resetLabel}.`
        : `You reached this week's free Agent preview limit. Preview usage resets weekly. Try again after ${resetLabel}.`,
    appFreeLimitReached: (resetLabel: string) =>
      isRtl
        ? `وصلت إلى حد الاستخدام المجاني اليوم. يتم إعادة التعيين يوميًا. جرّب مرة أخرى بعد ${resetLabel}.`
        : `You reached today's free limit. Free usage resets daily. Try again after ${resetLabel}.`,
    quotaBadgeNeutral: isRtl ? "معاينة أسبوعية" : "Weekly Agent preview",
    quotaBadgeWarning: isRtl ? "الاستخدام المجاني محدود" : "Limited free usage",
    quotaBadgeDanger: isRtl ? "تم بلوغ حد المعاينة" : "Agent preview limit reached",
  };
  useAuthStore(); // For auth context, values used elsewhere
  const {
    view,
    threadId: activeThreadId,
    spaceId: activeWorkspaceSlug,
    zakiSessionKey,
    goHome,
    goToSpaces,
    goToThread,
    clearThread,
    setZakiSessionKey,
  } = useNavigationStore();
  const { sidebarMode } = useNavigationStore();

  // View states
  const showZakiHome = view === "home";
  const showAbout = view === "about";
  const showSpacesView = view === "spaces";
  const showSpaceDetail = false;

  // Message state
  const [messagesByThread, setMessagesByThread] = useState<Record<string, Message[]>>({});
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [turnStartedAt, setTurnStartedAt] = useState<number | null>(null);
  const [turnDurationMs, setTurnDurationMs] = useState<number | null>(null);
  const [streamingIndicatorMode, setStreamingIndicatorMode] = useState<"thinking" | "researching" | "writing">("thinking");
  const [zakiBotToolCalls, setZakiBotToolCalls] = useState<BotToolCall[]>([]);
  const [zakiBotStatusEvents, setZakiBotStatusEvents] = useState<BotStatusEvent[]>([]);
  const [zakiBotReplyStart, setZakiBotReplyStart] = useState<BotReplyStart | null>(
    null
  );
  const [zakiBotProgressTerminalReason, setZakiBotProgressTerminalReason] = useState<
    "done" | "error" | "abort" | "stream_end" | null
  >(null);
  const [nullalisNarrationFrame, setNullalisNarrationFrame] =
    useState<NullalisNarrationFrame | null>(null);
  const [nullalisTranscriptEntries, setNullalisTranscriptEntries] = useState<
    NullalisTranscriptEntry[]
  >([]);
  const [nullalisTaskItems, setNullalisTaskItems] = useState<NullalisTaskItem[]>([]);
  const [nullalisApprovalRequest, setNullalisApprovalRequest] =
    useState<NullalisApprovalRequest | null>(null);
  const [nullalisContextGauge, setNullalisContextGauge] = useState<{
    tokenCount: number;
    contextMax: number;
    messageCount?: number;
  } | null>(null);
  const [zakiUsageSummary, setZakiUsageSummary] = useState<ZakiUsageSummary | null>(null);
  const [freeDailyQuota, setFreeDailyQuota] = useState<{
    unlimited: boolean;
    limit: number | null;
    used: number;
    remaining: number | null;
    resetAt: string | null;
    surface: UsageQuotaSurface;
    bucket: string | null;
    period?: "day" | "week" | string | null;
  } | null>(null);
  const [responseFormattingConfig, setResponseFormattingConfig] =
    useState<ResponseFormattingConfig>(() => readResponseFormattingConfig());
  const historyLoadedRef = useRef<Record<string, boolean>>({});
  const currentTurnAssistantIdRef = useRef<string | null>(null);
  const prevIsStreamingRef = useRef(false);
  const [localTurnSnapshots, setLocalTurnSnapshots] = useState<
    Record<string, NullalisTranscriptEntry[]>
  >({});
  const [firstMessageTransition, setFirstMessageTransition] = useState(false);
  // Query mode is a Spaces-only feature.
  //   - InputArea hides the toggle button in zakiBotMode (only renders
  //     in the non-zakiBotMode branch of the plus menu).
  //   - InputArea hides the active pill via `!zakiBotMode && queryModeEnabled`.
  //   - The agent stream body never includes the `mode` field — see the
  //     `isZakiAgentSpace ? agentBody : spacesBody` branch in handleSend.
  // The state stays at the ChatArea level so toggling in Spaces is
  // remembered across route switches; it's intentional that the value
  // can persist while invisible. Wire path is gated, so a ghost true
  // never reaches the agent.
  const [queryModeEnabled, setQueryModeEnabled] = useState(false);
  const [webSearchArmed, setWebSearchArmed] = useState(false);
  const streamAbortRef = useRef<AbortController | null>(null);
  const zakiBotProcessClearTimerRef = useRef<number | null>(null);
  const zakiBotProvisionedRef = useRef(false);
  const zakiBotProvisionPromiseRef = useRef<Promise<boolean> | null>(null);
  const [sessionModePending, setSessionModePending] = useState(false);
  const approvalSeenBySessionRef = useRef<Record<string, Set<string>>>({});

  // Canonical user ID for agent/nullalis routing (resolved from BFF).
  // Seed from sessionStorage so context gauge / approval work on fast re-mount.
  const [agentUserId, setAgentUserId] = useState<string | null>(
    () => sessionStorage.getItem("zaki:agentUserId")
  );
  const isZakiBotRouteActive = isZakiBotSpaceId(activeWorkspaceSlug);
  const activeZakiSessionKey = useMemo(() => {
    const stored = String(zakiSessionKey || "").trim();
    if (stored) return normalizeZakiSessionKey(stored);
    if (!isZakiBotSpaceId(activeWorkspaceSlug) || !activeThreadId) return null;
    return buildAgentSessionKey(activeThreadId, agentUserId);
  }, [activeThreadId, activeWorkspaceSlug, agentUserId, zakiSessionKey]);
  const normalizedActiveZakiSessionKey = activeZakiSessionKey
    ? normalizeZakiSessionKey(activeZakiSessionKey)
    : null;
  const { data: zakiSessions = [] } = useZakiSessions(isZakiBotRouteActive);
  const activeSessionRecord = useMemo(
    () =>
      normalizedActiveZakiSessionKey
        ? zakiSessions.find(
            (session) =>
              normalizeZakiSessionKey(session.session_key) === normalizedActiveZakiSessionKey
          ) ?? null
        : null,
    [normalizedActiveZakiSessionKey, zakiSessions]
  );
  const activeSessionUi = useZakiSessionUiStore(
    useCallback(
      (state) =>
        normalizedActiveZakiSessionKey ? state.sessions[normalizedActiveZakiSessionKey] : undefined,
      [normalizedActiveZakiSessionKey]
    )
  );
  const ensureZakiSessionUi = useZakiSessionUiStore((state) => state.ensureSession);
  const hydrateSessionUi = useZakiSessionUiStore((state) => state.hydrateSession);
  const setZakiSessionModeUi = useZakiSessionUiStore((state) => state.setMode);
  const incrementSessionApprovalCount = useZakiSessionUiStore(
    (state) => state.incrementApprovalCount
  );
  const decrementSessionApprovalCount = useZakiSessionUiStore(
    (state) => state.decrementApprovalCount
  );
  const setSessionContextPressure = useZakiSessionUiStore((state) => state.setContextPressure);
  const setZakiSandboxState = useZakiSessionUiStore((state) => state.setSandbox);
  const sandboxState = useZakiSessionUiStore((s) => s.sandbox);
  const activeSessionMode =
    activeSessionUi?.mode ??
    (activeSessionRecord?.mode === "plan" ||
    activeSessionRecord?.mode === "execute" ||
    activeSessionRecord?.mode === "review"
      ? activeSessionRecord.mode
      : null);

  // Memory state for the simplified normal-chat capture flow
  const [recentSavedMemories, setRecentSavedMemories] = useState<
    MemoryCaptureResponse["saved"]
  >([]);
  const [recentReviewCount, setRecentReviewCount] = useState(0);
  const [recentConflictCount, setRecentConflictCount] = useState(0);
  const [memoryPendingCount, setMemoryPendingCount] = useState(0);
  const [showMemoryToast, setShowMemoryToast] = useState(false);
  const [memoryToastMode, setMemoryToastMode] = useState<"saved" | "review" | "conflict">(
    "saved"
  );
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [memoryConflictCount, setMemoryConflictCount] = useState(0);
  const [memoryToastUndoError, setMemoryToastUndoError] = useState<string | null>(null);
  const [memoryToastPartialUndoCount, setMemoryToastPartialUndoCount] = useState(0);
  const lastMemoryRequestRef = useRef<{ message: string; threadId?: string } | null>(null);
  const autoDismissTimerRef = useRef<number | null>(null);
  const [isUndoingMemoryToast, setIsUndoingMemoryToast] = useState(false);
  const memoryInFlightRef = useRef(false);
  const queuedMemoryCheckRef = useRef<{ message: string; threadId?: string } | null>(null);
  const memoryConflictSeenRef = useRef<Set<string>>(new Set());
  const conflictCountRef = useRef(0);
  const memoryStatusHydratedRef = useRef(false);
  const lastMemoryStatusSyncAtRef = useRef(0);
  const pendingSessionSummaryRef = useRef<{
    threadId: string;
    queuedAt: number;
  } | null>(null);
  const sessionSummaryCueKeyRef = useRef<string | null>(null);
  const authLoading = useAuthStore((s) => s.isLoading);
  const authUser = useAuthStore((s) => s.user);
  const authUserId = useMemo(() => {
    const fallbackEmail =
      typeof authUser === "object" && authUser !== null
        ? String((authUser as { email?: string }).email || "")
        : "";
    return String(authUser?.username || fallbackEmail).trim().toLowerCase();
  }, [authUser]);
  const isAuthReady = !authLoading && Boolean(authUserId);
  // Onboarding stage progress lives per-user in localStorage; the hook
  // resolves the next pending stage for us. The hero card surfaces above
  // the composer only while welcome is still pending.
  const { progress: onboardingProgress, setStage: setOnboardingStage, reset: resetOnboarding } =
    useOnboardingProgress(authUserId);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => resetOnboarding();
    window.addEventListener("zaki:reset-onboarding", handler);
    return () => window.removeEventListener("zaki:reset-onboarding", handler);
  }, [resetOnboarding]);
  // Brain memory count drives the brain_panel stage gate — we only
  // surface "open your brain" once ZAKI has actually saved a few facts
  // worth showing.
  const onboardingBrainGraph = useBrainGraph(authUserId || "");
  const onboardingBrainCount =
    onboardingBrainGraph.data?.total_nodes_in_corpus ?? 0;
  const [memoryImportOpen, setMemoryImportOpen] = useState(false);
  const heroCardActive =
    Boolean(authUserId) && onboardingProgress.welcome === "pending";
  // Legacy holdover: ZakiExperimentalNotice still keys off this flag,
  // and the new hero replaces the bootstrap card entirely so once the
  // user dismisses the hero we treat the legacy flag as completed too.
  const [zakiBootstrapCompleted, setZakiBootstrapCompleted] = useState(true);
  const [activationProgress, setActivationProgress] = useState<ActivationProgress>({
    firstMessageSent: false,
    firstMemorySaved: false,
    completed: false,
  });
  
  useEffect(() => {
    if (!authUserId) {
      setActivationProgress({
        firstMessageSent: false,
        firstMemorySaved: false,
        completed: false,
      });
      return;
    }
    setActivationProgress(getActivationProgress(authUserId));
  }, [authUserId]);

  useEffect(() => {
    const syncResponseFormattingConfig = () => {
      setResponseFormattingConfig(readResponseFormattingConfig());
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== "zaki.responseFormattingConfig") return;
      syncResponseFormattingConfig();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(RESPONSE_FORMATTING_EVENT, syncResponseFormattingConfig);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(RESPONSE_FORMATTING_EVENT, syncResponseFormattingConfig);
    };
  }, [queryClient]);

  // UI state
  const [dragActive, setDragActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const [createSpaceInitialValues, setCreateSpaceInitialValues] = useState<
    { name?: string; description?: string; instructions?: string } | null
  >(null);
  const [editInstructionsOpen, setEditInstructionsOpen] = useState(false);
  const [editInstructionsValue, setEditInstructionsValue] = useState("");
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [inputOffset, setInputOffset] = useState(0);
  const [inputHeight, setInputHeight] = useState(0);
  const [inputLeft, setInputLeft] = useState(0);
  const [inputWidth, setInputWidth] = useState(0);
  const [inputTop, setInputTop] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1280
  );
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== "undefined" ? window.innerHeight : 800
  );

  // Spaces state
  const [spacesList, setSpacesList] = useState<Space[]>([]);
  const [editSpaceId, setEditSpaceId] = useState<string | null>(null);
  const [fileUploadSpaceId, setFileUploadSpaceId] = useState<string | null>(null);
  const [acceptedWorkspaceTypes, setAcceptedWorkspaceTypes] = useState<Record<string, string[]>>(
    {}
  );
  const [acceptedWorkspaceHint, setAcceptedWorkspaceHint] = useState("");

  const toastPosition = useMemo(() => {
    const left = inputWidth ? inputLeft : 16;
    const width =
      inputWidth ||
      Math.min(Math.max(viewportWidth - 32, 280), 896);
    const hasInputMetrics = inputWidth > 0 && inputTop > 0;
    const gap = 8;
    const bottom = hasInputMetrics
      ? Math.max(24, viewportHeight - inputTop + gap)
      : 24;
    return { left, width, bottom };
  }, [inputLeft, inputTop, inputWidth, viewportHeight, viewportWidth]);

  useEffect(() => {
    let cancelled = false;
    void apiRequest("/api/documents/accepted-file-types")
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json().catch(() => ({}))) as {
          types?: Record<string, string[]>;
        };
        if (cancelled) return;
        const nextTypes = data.types && typeof data.types === "object" ? data.types : {};
        setAcceptedWorkspaceTypes(nextTypes);
        setAcceptedWorkspaceHint(formatAcceptedTypeHint(nextTypes));
      })
      .catch(() => {
        // Best-effort only.
      });
    return () => {
      cancelled = true;
    };
  }, []);


  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  // 2026-05-08 — Imperative handle for InputArea so quick-reply chips
  // (rendered up in ChatView) can route through the same submitMessage
  // pipeline that InputArea owns. Without this, quick-reply skipped the
  // per-turn toggle reset and could send privately when the user had
  // armed privacy for a different turn.
  const composerHandleRef = useRef<InputAreaHandle | null>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const dragCounter = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const prevMessageCount = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const botAttachmentPickRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);
  const spacesListRef = useRef<Space[]>([]);
  const autoTitleAttemptsRef = useRef<Record<string, number>>({});
  const autoTitleFinalizedRef = useRef<Record<string, boolean>>({});
  const autoTitleInFlightRef = useRef<Record<string, boolean>>({});
  // Same pattern, scoped per ZAKI sessionKey instead of (spaceId, threadId).
  const autoTitleSessionAttemptsRef = useRef<Record<string, number>>({});
  const autoTitleSessionFinalizedRef = useRef<Record<string, boolean>>({});
  const autoTitleSessionInFlightRef = useRef<Record<string, boolean>>({});

  const measureInputMetrics = useCallback(() => {
    if (typeof window !== "undefined") {
      const nextWidth = window.innerWidth;
      const nextHeight = window.innerHeight;
      setViewportWidth((prev) => (prev === nextWidth ? prev : nextWidth));
      setViewportHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    }

    const inputEl = inputWrapRef.current;
    if (!inputEl) return;
    const target = inputEl.querySelector<HTMLElement>(".zaki-input-form") ?? inputEl;
    const rect = target.getBoundingClientRect();
    setInputHeight(rect.height);
    setInputLeft(rect.left);
    setInputWidth(rect.width);
    setInputTop(rect.top);
  }, []);

  // Computed values
  const messages = activeThreadId ? messagesByThread[activeThreadId] ?? [] : [];
  const primarySpace = spacesList[0] ?? null;
  const isZakiBotActiveSpace = isZakiBotSpaceId(activeWorkspaceSlug);
  const isAnonymousSpacesActive = !authUserId && !isZakiBotActiveSpace;
  const quotaSurface: UsageQuotaSurface = isZakiBotActiveSpace ? "zaki_bot" : "app_chat";
  const activeSpace =
    spacesList.find((space) => space.id === activeWorkspaceSlug) ??
    (isZakiBotActiveSpace
      ? {
          id: ZAKI_BOT_SPACE_ID,
          title: ZAKI_BOT_LABEL,
          description: "",
          icon: "sparkles",
          threads: [createZakiBotThread()],
        }
      : null);
  const activeThread =
    activeSpace?.threads?.find((thread) => thread.id === activeThreadId) ??
    (isZakiBotActiveSpace && activeThreadId === ZAKI_BOT_THREAD_ID
      ? createZakiBotThread()
      : null);
  const isMemoryPipelineEnabled = !isZakiBotActiveSpace;
  const showReady = (!activeThreadId || messages.length === 0) && !isZakiBotActiveSpace;

  // Resolve the canonical agent user ID from the BFF on first load
  useEffect(() => {
    if (!isAuthReady || !isZakiBotActiveSpace) return;
    let cancelled = false;
    void fetchAgentMe()
      .then(({ data }) => {
        if (!cancelled && data?.userId) {
          setAgentUserId(data.userId);
          try { sessionStorage.setItem("zaki:agentUserId", data.userId); } catch {}
        }
      })
      .catch(() => {
        // non-critical — session key just won't resolve until next attempt
      });
    return () => { cancelled = true; };
  }, [isAuthReady, isZakiBotActiveSpace]);

  useEffect(() => {
    if (!isZakiBotActiveSpace || !activeThreadId || !agentUserId) return;
    const canonicalKey = buildAgentSessionKey(activeThreadId, agentUserId);
    if (!canonicalKey) return;
    if (normalizeZakiSessionKey(zakiSessionKey || "") === canonicalKey) return;
    setZakiSessionKey(canonicalKey);
  }, [activeThreadId, agentUserId, isZakiBotActiveSpace, setZakiSessionKey, zakiSessionKey]);

  useEffect(() => {
    if (!normalizedActiveZakiSessionKey) return;
    ensureZakiSessionUi(normalizedActiveZakiSessionKey);
  }, [ensureZakiSessionUi, normalizedActiveZakiSessionKey]);

  useEffect(() => {
    if (!normalizedActiveZakiSessionKey || !activeSessionRecord) return;
    hydrateSessionUi(
      normalizedActiveZakiSessionKey,
      mapAgentSessionToZakiSessionUi(activeSessionRecord)
    );
  }, [activeSessionRecord, hydrateSessionUi, normalizedActiveZakiSessionKey]);

  const hydrateActiveSessionDetail = useCallback(
    async (sessionKey: string) => {
      try {
        const { response, data } = await fetchAgentSession(sessionKey);
        if (!response.ok) return;
        const nextUi = mapAgentSessionToZakiSessionUi(data);
        hydrateSessionUi(sessionKey, nextUi);
        const nextApproval = nextUi.pendingApprovals?.[0] ?? null;
        setNullalisApprovalRequest(nextApproval ?? null);
      } catch {
        // best effort only
      }
    },
    [hydrateSessionUi]
  );

  useEffect(() => {
    if (!isZakiBotActiveSpace || !normalizedActiveZakiSessionKey) return;
    void hydrateActiveSessionDetail(normalizedActiveZakiSessionKey);
  }, [hydrateActiveSessionDetail, isZakiBotActiveSpace, normalizedActiveZakiSessionKey]);

  useEffect(() => {
    if (!isZakiBotActiveSpace) return;
    let cancelled = false;
    void (async () => {
      try {
        const { response, data } = await fetchBotRuntimeStatus();
        if (cancelled) return;
        if (!response.ok) {
          setZakiSandboxState(null);
          return;
        }
        setZakiSandboxState({
          enabled: Boolean(data?.sandbox?.enabled),
          backend: data?.sandbox?.backend ?? null,
        });
      } catch {
        if (!cancelled) {
          setZakiSandboxState(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isZakiBotActiveSpace, setZakiSandboxState]);
  const headerSpaceName = activeSpace?.title || chatCopy.spaceFallback;
  const headerThreadName = activeThread?.label || chatCopy.newChat;

  useEffect(() => {
    if (!isZakiBotActiveSpace || !authUserId) {
      setZakiBootstrapCompleted(true);
      return;
    }
    setZakiBootstrapCompleted(true);
  }, [authUserId, isZakiBotActiveSpace]);
  const zakiBotQuotaInfo =
    isZakiBotActiveSpace &&
    freeDailyQuota &&
    !freeDailyQuota.unlimited &&
    typeof freeDailyQuota.limit === "number"
      ? {
          limit: freeDailyQuota.limit,
          remaining: Math.max(
            0,
            Number(freeDailyQuota.remaining ?? freeDailyQuota.limit)
          ),
        }
      : null;
  const isZakiBotSendLocked = Boolean(
    zakiBotQuotaInfo && zakiBotQuotaInfo.remaining <= 0
  );
  const latestAssistantMessageContent = useMemo(() => {
    const latestAssistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");
    return String(latestAssistant?.content || "");
  }, [messages]);
  const zakiBotProcessSnapshot = useMemo<ZakiProcessSnapshot>(() => {
    return buildZakiProcessSnapshot({
      statusEvents: zakiBotStatusEvents,
      reasoningSummary: null,
      replyStart: zakiBotReplyStart,
      toolCalls: zakiBotToolCalls,
      latestAssistantMessageContent,
      progressTerminalReason: zakiBotProgressTerminalReason,
    });
  }, [
    latestAssistantMessageContent,
    zakiBotProgressTerminalReason,
    zakiBotReplyStart,
    zakiBotStatusEvents,
    zakiBotToolCalls,
  ]);

  const handleCopyMessage = useCallback(async (message: Message) => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success(chatCopy.copied);
    } catch {
      toast.error(chatCopy.copyFailed);
    }
  }, [chatCopy.copied, chatCopy.copyFailed]);

  const updateScrollIndicator = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const isScrollable = scrollHeight - clientHeight > 120;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 24;
    autoScrollRef.current = atBottom;
    setShowScrollToBottom(isScrollable && !atBottom);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(updateScrollIndicator);
    return () => window.cancelAnimationFrame(frame);
  }, [messages.length, showZakiHome, showSpacesView, showSpaceDetail, updateScrollIndicator]);

  // Serialize chat for export
  const serializeChat = useCallback(() => {
    return {
      exportedAt: new Date().toISOString(),
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        attachments: msg.attachments,
      })),
    };
  }, [messages]);

  // Handle share
  const handleShare = useCallback(() => {
    setShareOpen(true);
  }, []);

  // Handle export
  const handleExport = useCallback(() => {
    try {
      const data = serializeChat();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${headerThreadName.replace(/\s+/g, "_")}_export.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(chatCopy.exported);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : chatCopy.exportFailed);
    } finally {
      setMenuOpen(false);
    }
  }, [chatCopy.exportFailed, chatCopy.exported, headerThreadName, serializeChat]);

  const uploadFilesToWorkspace = useCallback(
    async (workspaceSlug: string, files: File[]) => {
      const uploaded: PinnedFile[] = [];
      for (const file of files) {
        const createFormData = () => {
          const formData = new FormData();
          formData.append("file", file);
          return formData;
        };

        let response = await apiRequest(`/workspace/${workspaceSlug}/upload-and-embed`, {
          method: "POST",
          body: createFormData(),
        });

        if (!response.ok) {
          response = await apiRequest(`/workspace/${workspaceSlug}/upload`, {
            method: "POST",
            body: createFormData(),
          });
        }

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as {
            error?: string;
            message?: string;
          };
          throw new Error(
            errorData.error || errorData.message || `Failed to upload ${file.name}.`
          );
        }

        const responseData = (await response.json().catch(() => ({}))) as {
          files?: Array<{ name?: string; type?: string; size?: number; status?: "embedded" | "processing" | "failed"; location?: string | null; source?: string | null; title?: string | null }>;
        };
        const normalizedFile = responseData.files?.[0];
        uploaded.push({
          name: normalizedFile?.name || file.name,
          type: normalizedFile?.type || file.type || "document",
          size: Number(normalizedFile?.size || file.size || 0),
          status: normalizedFile?.status || "embedded",
          location: normalizedFile?.location ?? null,
          source: normalizedFile?.source ?? null,
          title: normalizedFile?.title ?? null,
        });
      }
      return uploaded;
    },
    []
  );

  const beginWorkspaceUpload = useCallback(
    (spaceId?: string | null) => {
      const resolvedSpaceId = spaceId ?? activeWorkspaceSlug ?? primarySpace?.id ?? null;
      if (!resolvedSpaceId) {
        toast.error(isRtl ? "اختر مساحة أولًا لإضافة الملفات." : "Select a space before adding files.");
        return;
      }
      if (resolvedSpaceId === ZAKI_BOT_SPACE_ID) {
        // Route to InputArea attachments (chat-level) instead of workspace grounding
        botAttachmentPickRef.current = true;
        fileInputRef.current?.click();
        return;
      }
      setFileUploadSpaceId(resolvedSpaceId);
      fileInputRef.current?.click();
    },
    [activeWorkspaceSlug, isRtl, primarySpace?.id]
  );

  const handleWorkspaceFilesSelected = useCallback(
    (targetSpaceId: string, files: File[]) => {
      if (!targetSpaceId || files.length === 0) return;

      const { valid, invalid } = splitFilesByAcceptedTypes(files, acceptedWorkspaceTypes);
      const existingPinned =
        spacesList.find((space) => space.id === targetSpaceId)?.pinnedFiles ?? [];

      if (invalid.length > 0) {
        const invalidMap = new Map(
          existingPinned.map((file) => [`${file.name}:${file.size}:${file.type}`, file])
        );
        for (const file of invalid) {
          invalidMap.set(`${file.name}:${file.size}:${file.type}`, {
            name: file.name,
            type: file.type || "document",
            size: Number(file.size || 0),
            status: "failed",
            error: chatCopy.unsupportedType(acceptedWorkspaceHint),
          });
        }
        window.dispatchEvent(
          new CustomEvent("zaki:update-space", {
            detail: {
              id: targetSpaceId,
              pinnedFiles: Array.from(invalidMap.values()),
            },
          })
        );
        toast.error(chatCopy.unsupportedUploadToast(acceptedWorkspaceHint));
      }
      if (valid.length === 0) return;

      const processingFiles: PinnedFile[] = valid.map((file) => ({
        name: file.name,
        type: file.type || "document",
        size: Number(file.size || 0),
        status: "processing",
      }));
      const processingMap = new Map(
        existingPinned.map((file) => [`${file.name}:${file.size}:${file.type}`, file])
      );
      for (const file of processingFiles) {
        processingMap.set(`${file.name}:${file.size}:${file.type}`, file);
      }
      window.dispatchEvent(
        new CustomEvent("zaki:update-space", {
          detail: {
            id: targetSpaceId,
            pinnedFiles: Array.from(processingMap.values()),
          },
        })
      );

      void uploadFilesToWorkspace(targetSpaceId, valid)
        .then((uploadedFiles) => {
          const fileMap = new Map(
            existingPinned.map((file) => [`${file.name}:${file.size}:${file.type}`, file])
          );
          for (const file of uploadedFiles) {
            fileMap.set(`${file.name}:${file.size}:${file.type}`, file);
          }
          window.dispatchEvent(
            new CustomEvent("zaki:update-space", {
              detail: {
                id: targetSpaceId,
                pinnedFiles: Array.from(fileMap.values()),
              },
            })
          );
          toast.success(
            uploadedFiles.length === 1
              ? chatCopy.addedFile(uploadedFiles[0]?.name || (isRtl ? "الملف" : "file"))
              : chatCopy.addedFiles(uploadedFiles.length)
          );
        })
        .catch((error) => {
          const failedMap = new Map(
            existingPinned.map((file) => [`${file.name}:${file.size}:${file.type}`, file])
          );
          for (const file of valid) {
            failedMap.set(`${file.name}:${file.size}:${file.type}`, {
              name: file.name,
              type: file.type || "document",
              size: Number(file.size || 0),
              status: "failed",
              error: error instanceof Error ? error.message : chatCopy.uploadFailed,
            });
          }
          window.dispatchEvent(
            new CustomEvent("zaki:update-space", {
              detail: {
                id: targetSpaceId,
                pinnedFiles: Array.from(failedMap.values()),
              },
            })
          );
          toast.error(error instanceof Error ? error.message : chatCopy.unableToUpload);
        });
    },
    [
      acceptedWorkspaceHint,
      acceptedWorkspaceTypes,
      chatCopy,
      isRtl,
      spacesList,
      uploadFilesToWorkspace,
    ]
  );

  // Strip memory context prefix from user messages (injected by backend for AI context)
  const stripMemoryContext = (content: string): string => {
    // V2 contract: [[ZAKI_MEMORY_CONTEXT_V2]] ... [[/ZAKI_MEMORY_CONTEXT_V2]] {user message}
    const v2Open = "[[ZAKI_MEMORY_CONTEXT_V2]]";
    const v2Close = "[[/ZAKI_MEMORY_CONTEXT_V2]]";
    const v2Start = content.indexOf(v2Open);
    const v2End = content.indexOf(v2Close);
    if (v2Start !== -1 && v2End !== -1 && v2End > v2Start) {
      return content.slice(v2End + v2Close.length).trim();
    }

    // Old format: [MEMORY CONTEXT - ...]...[USER MESSAGE]\n{actual message}
    const userMessageMarker = "[USER MESSAGE]\n";
    const memoryContextMarker = "[MEMORY CONTEXT";
    
    if (content.includes(memoryContextMarker) && content.includes(userMessageMarker)) {
      const userMessageIndex = content.indexOf(userMessageMarker);
      if (userMessageIndex !== -1) {
        return content.slice(userMessageIndex + userMessageMarker.length).trim();
      }
    }
    
    // New buddy format: [About this person...]...\n---\n\n{actual message}
    const buddyMarker = "[About this person";
    const separator = "\n---\n\n";
    
    if (content.includes(buddyMarker) && content.includes(separator)) {
      const sepIndex = content.indexOf(separator);
      if (sepIndex !== -1) {
        return content.slice(sepIndex + separator.length).trim();
      }
    }
    
    return content;
  };

  const { data: historyData, isLoading: isHistoryLoading } = useMessages(
    isZakiBotActiveSpace || isAnonymousSpacesActive ? null : activeWorkspaceSlug,
    isZakiBotActiveSpace || isAnonymousSpacesActive ? null : activeThreadId
  );
  const [isBotHistoryLoading, setIsBotHistoryLoading] = useState(false);

  useEffect(() => {
    spacesListRef.current = spacesList;
  }, [spacesList]);

  // Helper to update assistant message content
  const updateAssistantContent = useCallback((threadSlug: string, assistantId: string, newContent: string) => {
    setMessagesByThread((prev) => {
      const threadMessages = prev[threadSlug] ?? [];
      const assistantIndex = threadMessages.findIndex((msg) => msg.id === assistantId);
      if (assistantIndex === -1) return prev;
      const updated = [...threadMessages];
      const existingMsg = updated[assistantIndex];
      if (!existingMsg) return prev;
      updated[assistantIndex] = {
        ...existingMsg,
        content: newContent,
        error: false,
        errorCode: null,
      };
      return { ...prev, [threadSlug]: updated };
    });
  }, []);

  const updateAssistantError = useCallback(
    (threadSlug: string, assistantId: string, newContent: string, errorCode?: string | null) => {
      setMessagesByThread((prev) => {
        const threadMessages = prev[threadSlug] ?? [];
        const assistantIndex = threadMessages.findIndex((msg) => msg.id === assistantId);
        if (assistantIndex === -1) return prev;
        const updated = [...threadMessages];
        const existingMsg = updated[assistantIndex];
        if (!existingMsg) return prev;
        updated[assistantIndex] = {
          ...existingMsg,
          content: existingMsg.content?.trim()
            ? `${existingMsg.content.trim()}\n\n${newContent}`
            : newContent,
          error: true,
          errorCode: errorCode ?? null,
        };
        return { ...prev, [threadSlug]: updated };
      });
    },
    []
  );

  const getThreadLabel = useCallback((spaceId: string, threadId: string) => {
    const space = spacesListRef.current.find((entry) => entry.id === spaceId);
    const thread = space?.threads?.find((entry) => entry.id === threadId);
    return String(thread?.label || "").trim();
  }, []);

  const getAutoTitleKey = useCallback((spaceId: string, threadId: string) => {
    return `${spaceId}::${threadId}`;
  }, []);

  const applyThreadLabelUpdate = useCallback((spaceId: string, threadId: string, label: string) => {
    queryClient.setQueryData<Space[] | undefined>(spaceKeys.all, (previous) =>
      Array.isArray(previous)
        ? previous.map((space) =>
            space.id === spaceId
              ? {
                  ...space,
                  threads: (space.threads ?? []).map((thread) =>
                    thread.id === threadId ? { ...thread, label } : thread
                  ),
                }
              : space
          )
        : previous
    );
    setSpacesList((prev) =>
      prev.map((space) =>
        space.id === spaceId
          ? {
              ...space,
              threads: (space.threads ?? []).map((thread) =>
                thread.id === threadId ? { ...thread, label } : thread
              ),
            }
          : space
      )
    );
    window.dispatchEvent(
      new CustomEvent("zaki:rename-thread", {
        detail: { id: threadId, spaceId, label },
      })
    );
  }, []);

  const maybeAutoTitleThread = useCallback(
    async (
      spaceId: string,
      threadId: string,
      exchange?: { userMessage: string; assistantMessage: string }
    ) => {
      if (!authUserId) return;
      if (!spaceId || !threadId || isZakiBotSpaceId(spaceId)) return;
      const autoTitleKey = getAutoTitleKey(spaceId, threadId);
      if (autoTitleFinalizedRef.current[autoTitleKey]) return;
      if (autoTitleInFlightRef.current[autoTitleKey]) return;

      const currentLabel = getThreadLabel(spaceId, threadId);
      if (!isDefaultThreadLabel(currentLabel)) {
        autoTitleFinalizedRef.current[autoTitleKey] = true;
        return;
      }

      if (!exchange?.userMessage?.trim() || !exchange?.assistantMessage?.trim()) {
        return;
      }

      const attempts = autoTitleAttemptsRef.current[autoTitleKey] ?? 0;
      if (attempts >= 2) {
        autoTitleFinalizedRef.current[autoTitleKey] = true;
        return;
      }

      autoTitleAttemptsRef.current[autoTitleKey] = attempts + 1;
      autoTitleInFlightRef.current[autoTitleKey] = true;

      try {
        const { response, data } = await autoTitleThread(spaceId, threadId, {
          userMessage: exchange.userMessage.trim(),
          assistantMessage: exchange.assistantMessage.trim(),
          currentLabel,
        });

        if (!response.ok || !data) {
          return;
        }

        if (data.status === "updated" && data.thread?.name) {
          const latestLabel = getThreadLabel(spaceId, threadId);
          if (!isDefaultThreadLabel(latestLabel)) {
            autoTitleFinalizedRef.current[autoTitleKey] = true;
            await queryClient.invalidateQueries({ queryKey: spaceKeys.all });
            return;
          }
          autoTitleFinalizedRef.current[autoTitleKey] = true;
          applyThreadLabelUpdate(spaceId, threadId, data.thread.name);
          await queryClient.invalidateQueries({ queryKey: spaceKeys.all });
          return;
        }

        if (data.reason === "not_default_label") {
          autoTitleFinalizedRef.current[autoTitleKey] = true;
          await queryClient.invalidateQueries({ queryKey: spaceKeys.all });
          return;
        }

        if (data.reason !== "generation_failed") {
          autoTitleFinalizedRef.current[autoTitleKey] = true;
        }
      } catch {
        // Best-effort only.
      } finally {
        autoTitleInFlightRef.current[autoTitleKey] = false;
      }
    },
    [applyThreadLabelUpdate, authUserId, getAutoTitleKey, getThreadLabel, queryClient]
  );

  /**
   * ZAKI session auto-title — mirror of maybeAutoTitleThread but scoped
   * by sessionKey. Strips any pinned-context wrapper from the user
   * message before sending so the BE sees the actual question, not the
   * fenced reference block.
   */
  const maybeAutoTitleSession = useCallback(
    async (
      sessionKey: string,
      exchange?: { userMessage: string; assistantMessage: string },
    ) => {
      if (!sessionKey) return;
      if (autoTitleSessionFinalizedRef.current[sessionKey]) return;
      if (autoTitleSessionInFlightRef.current[sessionKey]) return;

      const cleaned = prepareAutoTitleExchange([
        { role: "user", content: exchange?.userMessage ?? "" },
        { role: "assistant", content: exchange?.assistantMessage ?? "" },
      ]);
      if (!cleaned) return;

      const attempts = autoTitleSessionAttemptsRef.current[sessionKey] ?? 0;
      if (attempts >= 2) {
        autoTitleSessionFinalizedRef.current[sessionKey] = true;
        return;
      }

      autoTitleSessionAttemptsRef.current[sessionKey] = attempts + 1;
      autoTitleSessionInFlightRef.current[sessionKey] = true;

      try {
        const { response, data } = await autoTitleAgentSession(sessionKey, {
          userMessage: cleaned.userMessage,
          assistantMessage: cleaned.assistantMessage,
          currentLabel: "",
        });

        if (!response.ok || !data) return;

        if (data.status === "updated" && data.session?.title) {
          autoTitleSessionFinalizedRef.current[sessionKey] = true;
          await queryClient.invalidateQueries({ queryKey: zakiSessionKeys.all });
          return;
        }

        // BE says "already has a title" — stop retrying.
        if (data.reason === "not_default_label") {
          autoTitleSessionFinalizedRef.current[sessionKey] = true;
          await queryClient.invalidateQueries({ queryKey: zakiSessionKeys.all });
          return;
        }

        // Don't finalize on a transient generation_failed — the BE
        // pattern lets us retry up to 2x for those.
        if (data.reason !== "generation_failed") {
          autoTitleSessionFinalizedRef.current[sessionKey] = true;
        }
      } catch {
        // Best-effort only.
      } finally {
        autoTitleSessionInFlightRef.current[sessionKey] = false;
      }
    },
    [queryClient],
  );

  const updateAssistantSources = useCallback(
    (threadSlug: string, assistantId: string, sources: Array<{ id: string; content: string; type: string }>) => {
      setMessagesByThread((prev) => {
        const threadMessages = prev[threadSlug] ?? [];
        const assistantIndex = threadMessages.findIndex((msg) => msg.id === assistantId);
        if (assistantIndex === -1) return prev;
        const updated = [...threadMessages];
        const existingMsg = updated[assistantIndex];
        if (!existingMsg) return prev;
        updated[assistantIndex] = {
          ...existingMsg,
          memorySources: sources,
        };
        return { ...prev, [threadSlug]: updated };
      });
    },
    []
  );

  const clearZakiBotProgressVisuals = useCallback((options?: { preserveNullalisArtifacts?: boolean }) => {
    if (zakiBotProcessClearTimerRef.current) {
      window.clearTimeout(zakiBotProcessClearTimerRef.current);
      zakiBotProcessClearTimerRef.current = null;
    }
    setZakiBotToolCalls([]);
    setZakiBotStatusEvents([]);
    setZakiBotReplyStart(null);
    setZakiBotProgressTerminalReason(null);
    setNullalisNarrationFrame(null);
    if (!options?.preserveNullalisArtifacts) {
      setNullalisTranscriptEntries([]);
      setNullalisTaskItems([]);
      setNullalisApprovalRequest(null);
      setZakiUsageSummary(null);
    }
  }, []);

  const refreshContextGauge = useCallback(async () => {
    try {
      const sessionKey = activeZakiSessionKey || buildAgentSessionKey(activeThreadId || "main", agentUserId);
      if (!sessionKey) return; // agent user ID not yet resolved
      const { response, data } = await fetchAgentSessionContext(sessionKey);
      // Don't clobber a good in-store pressure value with `null` on a
      // 4xx/5xx or on a 200 that omitted the field. Only write when the
      // response succeeded AND we actually have a numeric pressure.
      if (!response.ok) return;
      const pressurePct =
        typeof data?.context_pressure_percent === "number"
          ? data.context_pressure_percent
          : typeof data?.context_window_used_pct === "number"
          ? data.context_window_used_pct
          : null;
      if (typeof pressurePct === "number") {
        setSessionContextPressure(sessionKey, pressurePct);
      }
      if (data && typeof data.token_count === "number") {
        setNullalisContextGauge({
          tokenCount: data.token_count,
          contextMax: data.context_window_max ?? 0,
          messageCount: data.message_count,
        });
      }
    } catch {
      // non-critical — gauge just won't update
    }
  }, [activeThreadId, activeZakiSessionKey, agentUserId, setSessionContextPressure]);

  // 2026-05-08 — Programmatic compact. Replaces the old "/compact" text
  // hack the pre-flight banner used to send. Direct API call against
  // /api/agent/sessions/:key/compact — no chat noise. After success we
  // refresh the gauge so the meter immediately reflects the freed
  // context. Toast surfaces tokens-saved when nullalis returns it.
  const [isCompacting, setIsCompacting] = useState(false);
  const compactingRef = useRef(false);
  const handleCompactSession = useCallback(async () => {
    const sessionKey = activeZakiSessionKey || buildAgentSessionKey(activeThreadId || "main", agentUserId);
    if (!sessionKey) {
      toast.error(t("zakiControls.compact.notReady", { defaultValue: "Session not ready yet." }));
      return;
    }
    if (compactingRef.current) return;
    compactingRef.current = true;
    setIsCompacting(true);
    try {
      const { response, data } = await compactAgentSession(sessionKey);
      if (!response.ok) throw new Error(`compact ${response.status}`);
      void refreshContextGauge();
      const before = data?.tokens_before;
      const after = data?.tokens_after;
      if (typeof before === "number" && typeof after === "number" && before > after) {
        toast.success(
          t("zakiControls.compact.successWithFreed", {
            defaultValue: "Context compacted. {{freed}} tokens freed.",
            freed: (before - after).toLocaleString(),
          }),
        );
      } else {
        toast.success(
          t("zakiControls.compact.success", { defaultValue: "Context compacted." }),
        );
      }
    } catch {
      toast.error(
        t("zakiControls.compact.error", { defaultValue: "Couldn't compact. Try again." }),
      );
    } finally {
      compactingRef.current = false;
      setIsCompacting(false);
    }
  }, [activeZakiSessionKey, activeThreadId, agentUserId, refreshContextGauge, t]);

  const finalizeZakiBotProgress = useCallback(
    (reason: "done" | "error" | "abort" | "stream_end") => {
      if (!isZakiBotActiveSpace) return;
      if (reason === "abort") {
        clearZakiBotProgressVisuals();
        return;
      }
      setZakiBotProgressTerminalReason(reason);
      if (reason === "done") {
        setStreamingIndicatorMode("writing");
        setNullalisNarrationFrame(null);
        // NOTE: Do NOT clear nullalisApprovalRequest here — the approval card
        // must persist until the user explicitly approves or denies. The card
        // manages its own decided state internally. Clearing here would race
        // with pending approvals since "done" fires when the SSE stream ends,
        // which can happen while an approval is still waiting for user action.
        refreshContextGauge();
        // Auto-title the session from the first complete user/assistant
        // exchange. Best-effort, non-blocking — bailouts inside the
        // helper handle "already titled" / generation failure / etc.
        const sessionKey = activeZakiSessionKey;
        const threadMessages = activeThreadId ? messagesByThread[activeThreadId] : undefined;
        if (sessionKey && threadMessages && threadMessages.length >= 2) {
          let firstUser: string | null = null;
          let firstAssistant: string | null = null;
          for (const m of threadMessages) {
            if (!firstUser && m.role === "user" && m.content?.trim()) {
              firstUser = m.content;
              continue;
            }
            if (firstUser && !firstAssistant && m.role === "assistant" && m.content?.trim()) {
              firstAssistant = m.content;
              break;
            }
          }
          if (firstUser && firstAssistant) {
            void maybeAutoTitleSession(sessionKey, {
              userMessage: firstUser,
              assistantMessage: firstAssistant,
            });
          }
        }
      }
    },
    [
      clearZakiBotProgressVisuals,
      isZakiBotActiveSpace,
      refreshContextGauge,
      activeZakiSessionKey,
      activeThreadId,
      messagesByThread,
      maybeAutoTitleSession,
    ]
  );

  useEffect(() => {
    if (!isZakiBotActiveSpace || !normalizedActiveZakiSessionKey) return;
    // Initial fetch on mount + recurring polling while the user is in
    // ZAKI bot mode. Without periodic refresh, out-of-band pressure
    // changes (another channel posting into the same session, background
    // compaction landing) wouldn't reach the UI until the next user turn.
    //
    // P2-01: setTimeout chaining (not setInterval) — the next poll only
    // fires after the previous one resolves, so a slow response can't be
    // overrun by a faster-stale one. P2-02: skip the tick entirely while
    // document.hidden so backgrounded tabs do not hammer the agent.
    let cancelled = false;
    let timer: number | null = null;
    const POLL_MS = 15_000;
    const tick = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && !document.hidden) {
        await refreshContextGauge();
      }
      if (cancelled) return;
      timer = window.setTimeout(tick, POLL_MS);
    };
    void tick();
    // Resume immediately on visibility change so a tab that was hidden
    // during a tick doesn't have to wait POLL_MS for fresh data.
    const onVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        void refreshContextGauge();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isZakiBotActiveSpace, normalizedActiveZakiSessionKey, refreshContextGauge]);

  const upsertZakiBotToolCall = useCallback(
    (payload: Record<string, unknown>) => {
      if (!isZakiBotActiveSpace) return;
      const { requestId, name, arguments: args } = extractToolCallPayload(payload);
      setZakiBotProgressTerminalReason(null);
      setStreamingIndicatorMode("researching");
      setZakiBotToolCalls((prev) => {
        if (requestId) {
          const existingIndex = prev.findIndex((call) => call.requestId === requestId);
          if (existingIndex >= 0) {
            const next = [...prev];
            const existingCall = next[existingIndex];
            if (!existingCall) return prev;
            next[existingIndex] = {
              ...existingCall,
              name,
              arguments: args,
            };
            return next;
          }
        }
        const now = Date.now();
        return [
          ...prev,
          {
            id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            requestId,
            name,
            arguments: args,
            timestamp: now,
            startedAt: now,
          },
        ];
      });
    },
    [isZakiBotActiveSpace]
  );

  const applyZakiBotToolResult = useCallback(
    (payload: Record<string, unknown>) => {
      if (!isZakiBotActiveSpace) return;
      const { requestId, name, ok, error, result, durationMs: explicitDurationMs } =
        extractToolResultPayload(payload);
      setZakiBotProgressTerminalReason(null);
      setZakiBotToolCalls((prev) => {
        if (!prev.length) {
          const now = Date.now();
          const startedAt =
            explicitDurationMs != null ? Math.max(0, now - explicitDurationMs) : now;
          return [
            {
              id: `tool-${now}-${Math.random().toString(36).slice(2, 8)}`,
              requestId,
              name: name || "unknown_tool",
              arguments: {},
              timestamp: startedAt,
              startedAt,
              finishedAt: now,
              durationMs: explicitDurationMs ?? 0,
              result: { ok, error, result },
            },
          ];
        }
        const next = [...prev];
        let targetIndex = -1;
        if (requestId) {
          targetIndex = next.findIndex((call) => call.requestId === requestId);
        }
        if (targetIndex < 0 && name) {
          const normalizedName = name.trim().toLowerCase();
          targetIndex = [...next]
            .reverse()
            .findIndex((call) => String(call.name || "").trim().toLowerCase() === normalizedName);
          if (targetIndex >= 0) {
            targetIndex = next.length - 1 - targetIndex;
          }
        }
        if (targetIndex < 0) {
          targetIndex = [...next]
            .reverse()
            .findIndex((call) => !call.result);
          if (targetIndex >= 0) {
            targetIndex = next.length - 1 - targetIndex;
          }
        }
        if (targetIndex < 0) return prev;
        const existingCall = next[targetIndex];
        if (!existingCall) return prev;
        const finishedAt =
          typeof existingCall.finishedAt === "number" ? existingCall.finishedAt : Date.now();
        const durationMs = explicitDurationMs ?? Math.max(0, finishedAt - existingCall.startedAt);
        next[targetIndex] = {
          ...existingCall,
          ...(name ? { name } : {}),
          finishedAt,
          durationMs,
          result: { ok, error, result },
        };
        return next;
      });
    },
    [isZakiBotActiveSpace]
  );

  const upsertZakiBotProgressTool = useCallback(
    (toolName: string, state: string | null, label: string | null, durationMs: number | null) => {
      if (!isZakiBotActiveSpace) return;
      const normalizedTool = toolName.trim().toLowerCase();
      if (!normalizedTool) return;
      const normalizedState = String(state || "").trim().toLowerCase();
      const isTerminal =
        normalizedState.includes("done") ||
        normalizedState.includes("complete") ||
        normalizedState.includes("success") ||
        normalizedState.includes("ok") ||
        normalizedState.includes("fail") ||
        normalizedState.includes("error") ||
        normalizedState.includes("abort") ||
        normalizedState.includes("cancel");
      const isFailure =
        normalizedState.includes("fail") ||
        normalizedState.includes("error") ||
        normalizedState.includes("abort") ||
        normalizedState.includes("cancel");
      const now = Date.now();

      setZakiBotToolCalls((prev) => {
        const next = [...prev];
        const targetIndex = [...next]
          .reverse()
          .findIndex((call) => {
            const callName = String(call.name || "").trim().toLowerCase();
            if (!callName) return false;
            return callName === normalizedTool || callName.includes(normalizedTool) || normalizedTool.includes(callName);
          });
        const resolvedIndex =
          targetIndex >= 0 ? next.length - 1 - targetIndex : next.findIndex((call) => !call.result);

        if (resolvedIndex >= 0) {
          const existing = next[resolvedIndex];
          if (!existing) return prev;
          const startedAt =
            typeof existing.startedAt === "number"
              ? existing.startedAt
              : durationMs != null
                ? Math.max(0, now - durationMs)
                : now;
          const finishedAt =
            isTerminal && durationMs != null
              ? startedAt + durationMs
              : isTerminal
                ? now
                : existing.finishedAt;
          const computedDurationMs =
            durationMs != null
              ? durationMs
              : typeof finishedAt === "number"
                ? Math.max(0, finishedAt - startedAt)
                : existing.durationMs;
          next[resolvedIndex] = {
            ...existing,
            name: existing.name || toolName,
            startedAt,
            ...(typeof finishedAt === "number" ? { finishedAt } : {}),
            ...(typeof computedDurationMs === "number" ? { durationMs: computedDurationMs } : {}),
            ...(isTerminal
              ? {
                  result: {
                    ok: !isFailure,
                    error: isFailure ? label || "Tool failed." : undefined,
                    result: existing.result?.result,
                  },
                }
              : {}),
          };
          return next;
        }

        const startedAt = durationMs != null ? Math.max(0, now - durationMs) : now;
        const finishedAt = isTerminal ? startedAt + (durationMs ?? 0) : undefined;
        return [
          ...next,
          {
            id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: toolName,
            arguments: {},
            timestamp: now,
            startedAt,
            ...(typeof finishedAt === "number" ? { finishedAt } : {}),
            ...(durationMs != null ? { durationMs } : {}),
            ...(isTerminal
              ? {
                  result: {
                    ok: !isFailure,
                    error: isFailure ? label || "Tool failed." : undefined,
                    result: undefined,
                  },
                }
              : {}),
          },
        ];
      });
    },
    [isZakiBotActiveSpace]
  );

  const pushZakiBotProgressEvent = useCallback(
    (
      payload: Record<string, unknown>,
      source: "progress" | "status" = "progress"
    ) => {
      if (!isZakiBotActiveSpace) return;
      const progress = extractProgressPayload(payload);
      if (!progress) return;
      const mode = inferStreamingModeFromProgress(progress);
      setZakiBotProgressTerminalReason(null);
      setStreamingIndicatorMode(mode);
      if (progress.tool) {
        upsertZakiBotProgressTool(progress.tool, progress.state, progress.text, progress.durationMs);
      }
      const text = buildProgressEventText(progress);
      const fingerprint = buildProgressFingerprint({
        text,
        phase: progress.phase,
        state: progress.state,
        tool: progress.tool,
      });
      const terminal = classifyProgressTerminal({ state: progress.state, text });
      setZakiBotStatusEvents((prev) => {
        const last = prev[prev.length - 1];
        if (last?.fingerprint === fingerprint) {
          if (
            last.iteration === progress.iteration &&
            last.durationMs === progress.durationMs &&
            last.terminal === terminal
          ) {
            return prev;
          }
          const next = [...prev];
          const currentLast = next[next.length - 1];
          if (!currentLast) return prev;
          next[next.length - 1] = {
            ...currentLast,
            text,
            timestamp: Date.now(),
            taskId: progress.taskId,
            durationMs: progress.durationMs,
            iteration: progress.iteration,
            terminal,
          };
          return next;
        }
        if (!fingerprint) {
          return prev;
        }
        const next = [
          ...prev,
          {
            id: `progress-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            text,
            timestamp: Date.now(),
            fingerprint,
            source,
            phase: progress.phase,
            state: progress.state,
            label: progress.label,
            tool: progress.tool,
            taskId: progress.taskId,
            iteration: progress.iteration,
            durationMs: progress.durationMs,
            terminal,
          } satisfies BotStatusEvent,
        ];
        return next.slice(-16);
      });
    },
    [isZakiBotActiveSpace, upsertZakiBotProgressTool]
  );

  const pushNullalisTranscriptEntry = useCallback(
    (entry: NullalisTranscriptEntry | null) => {
      if (!isZakiBotActiveSpace || !entry) return;
      const fingerprint = buildNullalisTranscriptFingerprint(entry);
      setNullalisTranscriptEntries((prev) => {
        const last = prev[prev.length - 1];
        if (last && buildNullalisTranscriptFingerprint(last) === fingerprint) {
          return prev;
        }
        const recentDuplicate = [...prev]
          .slice(-4)
          .some(
            (candidate) =>
              buildNullalisTranscriptFingerprint(candidate) === fingerprint &&
              Math.abs(entry.timestamp - candidate.timestamp) < 5000
          );
        if (recentDuplicate) return prev;
        return [...prev, entry].slice(-40);
      });
    },
    [isZakiBotActiveSpace]
  );

  const pushNullalisNarrationFrame = useCallback(
    (payload: Record<string, unknown>) => {
      if (!isZakiBotActiveSpace) return;
      const frame = extractNullalisNarrationFrame(payload);
      if (!frame) return;
      setZakiBotProgressTerminalReason(null);
      setStreamingIndicatorMode(
        frame.phase === "tool_start" || frame.phase === "tool_done"
          ? "researching"
          : frame.phase === "speaking"
            ? "writing"
            : "thinking"
      );
      setNullalisNarrationFrame(frame);
      pushNullalisTranscriptEntry(extractNullalisTranscriptEntry("progress", payload, frame.timestamp));
      if (frame.tool && frame.phase === "tool_start") {
        upsertZakiBotToolCall({
          type: "toolCallInvocation",
          tool: frame.tool,
          name: frame.tool,
        });
      }
      if (frame.tool && frame.phase === "tool_done") {
        upsertZakiBotProgressTool(frame.tool, "done", frame.label, frame.durationMs ?? null);
      }
    },
    [
      isZakiBotActiveSpace,
      pushNullalisTranscriptEntry,
      upsertZakiBotProgressTool,
      upsertZakiBotToolCall,
    ]
  );

  const upsertNullalisTaskItem = useCallback(
    (payload: Record<string, unknown>) => {
      if (!isZakiBotActiveSpace) return;
      const taskItem = extractNullalisTaskItem(payload);
      if (!taskItem) return;
      setZakiBotProgressTerminalReason(null);
      setStreamingIndicatorMode(taskItem.status === "running" ? "researching" : "thinking");
      setNullalisTaskItems((prev) => {
        const existingIndex = prev.findIndex((item) => item.taskId === taskItem.taskId);
        if (existingIndex < 0) return [...prev, taskItem].slice(-8);
        const next = [...prev];
        next[existingIndex] = { ...next[existingIndex], ...taskItem };
        return next.slice(-8);
      });
      pushNullalisTranscriptEntry(
        extractNullalisTranscriptEntry("task_update", payload, taskItem.updatedAt)
      );
      setNullalisNarrationFrame({
        id: `zaki-runtime-task-${taskItem.taskId}-${taskItem.updatedAt}`,
        phase: "plan_step",
        label:
          taskItem.status === "running"
            ? `Running ${taskItem.description || taskItem.taskId}`
            : `${taskItem.description || taskItem.taskId} ${taskItem.status}`,
        tool: null,
        iteration: null,
        durationMs: null,
        stepIndex: null,
        stepTotal: null,
        timestamp: taskItem.updatedAt,
      });
    },
    [isZakiBotActiveSpace, pushNullalisTranscriptEntry]
  );

  const updateNullalisReasoningSummary = useCallback(
    (payload: Record<string, unknown>) => {
      if (!isZakiBotActiveSpace) return;
      const summary = extractReasoningSummaryPayload(payload);
      if (summary) {
        setZakiBotProgressTerminalReason(null);
        setStreamingIndicatorMode(
          inferStreamingModeFromContext(
            [summary.phase, summary.tool, summary.text].filter(Boolean).join(" ")
          )
        );
      }
      const frame = extractNullalisReasoningNarrationFrame(payload);
      if (!frame) return;
      setNullalisNarrationFrame(frame);
      pushNullalisTranscriptEntry(
        extractNullalisTranscriptEntry("reasoning_summary", payload, frame.timestamp)
      );
    },
    [isZakiBotActiveSpace, pushNullalisTranscriptEntry]
  );

  const markZakiBotReplyStart = useCallback(
    (payload: Record<string, unknown>) => {
      if (!isZakiBotActiveSpace) return;
      const replyStart = extractReplyStartPayload(payload);
      if (!replyStart) return;
      setZakiBotProgressTerminalReason(null);
      setStreamingIndicatorMode("writing");
      setZakiBotReplyStart({
        id: `reply-start-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        streamKind: replyStart.streamKind,
        deliveryMode: replyStart.deliveryMode,
        live: replyStart.live,
      });
    },
    [isZakiBotActiveSpace]
  );

  const applyQuotaHeaders = useCallback((headers: Headers, fallbackSurface: UsageQuotaSurface) => {
    const limitRaw = String(headers.get("x-zaki-quota-limit") || "").trim().toLowerCase();
    if (!limitRaw) return;
    const remainingRaw = String(headers.get("x-zaki-quota-remaining") || "").trim().toLowerCase();
    const resetAtRaw = String(headers.get("x-zaki-quota-reset-at") || "").trim();
    const headerSurface = String(headers.get("x-zaki-quota-surface") || "").trim().toLowerCase();
    const headerBucket = String(headers.get("x-zaki-quota-bucket") || "").trim();
    const headerPeriod = String(headers.get("x-zaki-quota-period") || "").trim().toLowerCase();
    const normalizedSurface: UsageQuotaSurface =
      headerSurface === "zaki_bot"
        ? "zaki_bot"
        : headerSurface === "learning"
          ? "learning"
          : fallbackSurface;
    const unlimited = limitRaw === "unlimited";
    const parsedLimit = Number(limitRaw);
    const parsedRemaining = Number(remainingRaw);
    setFreeDailyQuota({
      unlimited,
      limit: unlimited || !Number.isFinite(parsedLimit) ? null : parsedLimit,
      used:
        unlimited || !Number.isFinite(parsedLimit) || !Number.isFinite(parsedRemaining)
          ? 0
          : Math.max(0, parsedLimit - parsedRemaining),
      remaining:
        unlimited || !Number.isFinite(parsedRemaining)
          ? null
          : Math.max(0, Math.floor(parsedRemaining)),
      resetAt: resetAtRaw || null,
      surface: normalizedSurface,
      bucket: headerBucket || null,
      period: headerPeriod || null,
    });
  }, []);

  const refreshUsageQuota = useCallback(async () => {
    if (!authUserId) {
      setFreeDailyQuota({
        unlimited: false,
        limit: 10,
        used: 0,
        remaining: 10,
        resetAt: null,
        surface: "app_chat",
        bucket: "anonymous_spaces",
        period: "day",
      });
      return;
    }
    try {
      const { response, data } = await fetchUsageQuota(quotaSurface);
      if (!response.ok) return;
      const normalizedSurface: UsageQuotaSurface =
        data.surface === "zaki_bot"
          ? "zaki_bot"
          : data.surface === "learning"
            ? "learning"
            : quotaSurface;
      setFreeDailyQuota({
        unlimited: data.unlimited === true,
        limit: typeof data.limit === "number" ? data.limit : null,
        used: Math.max(0, Number(data.used || 0)),
        remaining: typeof data.remaining === "number" ? Math.max(0, Number(data.remaining)) : null,
        resetAt: typeof data.resetAt === "string" ? data.resetAt : null,
        surface: normalizedSurface,
        bucket: typeof data.bucket === "string" && data.bucket.trim() ? data.bucket.trim() : null,
        period: typeof data.period === "string" ? data.period : null,
      });
    } catch {
      // Best-effort status sync.
    }
  }, [authUserId, quotaSurface]);

  useEffect(() => {
    void refreshUsageQuota();
  }, [refreshUsageQuota]);

  // Stream via WebSocket for agent invocation URLs
  const streamAgentInvocation = useCallback(async (
    agentUrl: string,
    threadSlug: string,
    assistantId: string,
    signal?: AbortSignal
  ) => {
    return new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        resolve();
        return;
      }
      const ws = new WebSocket(agentUrl);
      let accumulated = "";
      let supportsAgentStreaming = false;
      let hasAnswer = false;
      let autoReplySent = false;
      let settled = false;
      let sawTerminalEvent = false;

      const cleanup = () => {
        signal?.removeEventListener("abort", handleAbort);
      };

      const resolveOnce = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };

      const rejectOnce = (error: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };

      const handleAbort = () => {
        finalizeZakiBotProgress("abort");
        try {
          ws.close(1000, "aborted");
        } catch {
          // Ignore close errors on aborted stream.
        }
        resolveOnce();
      };

      signal?.addEventListener("abort", handleAbort, { once: true });

      ws.onmessage = (event) => {
        if (signal?.aborted) {
          return;
        }
        try {
          const payload = JSON.parse(event.data);
          if (!payload?.type && supportsAgentStreaming) {
            return;
          }

          if (payload?.type === "WAITING_ON_INPUT") {
            if (hasAnswer) {
              ws.send(
                JSON.stringify({
                  type: "awaitingFeedback",
                  feedback: "/exit",
                })
              );
              return;
            }
            if (!autoReplySent) {
              ws.send(
                JSON.stringify({
                  type: "awaitingFeedback",
                  feedback: "",
                })
              );
              autoReplySent = true;
            }
            return;
          }

          if (payload?.type === "reportStreamEvent" && payload?.content) {
            supportsAgentStreaming = true;
            const report = payload.content as { type?: string; content?: unknown };
            const reportPayload =
              report?.content && typeof report.content === "object"
                ? ({ ...(report.content as Record<string, unknown>), type: report.type } as Record<string, unknown>)
                : ({ type: report?.type, content: report?.content } as Record<string, unknown>);
            if (report?.type === "removeStatusResponse") return;
            if (isZakiBotActiveSpace && report?.type === "progress") {
              pushZakiBotProgressEvent(reportPayload, "progress");
              return;
            }
            if (isZakiBotActiveSpace && report?.type === "statusResponse") {
              pushZakiBotProgressEvent(reportPayload, "status");
              return;
            }
            if (isZakiBotActiveSpace && report?.type === "reasoning_summary") {
              updateNullalisReasoningSummary(reportPayload);
              return;
            }
            if (isZakiBotActiveSpace && report?.type === "reply_start") {
              markZakiBotReplyStart(reportPayload);
              return;
            }
            if (isZakiBotActiveSpace && report?.type === "toolCallInvocation") {
              upsertZakiBotToolCall({ content: report.content, type: "toolCallInvocation" });
              return;
            }
            if (
              isZakiBotActiveSpace &&
              (report?.type === "toolCallResult" || report?.type === "tool_result")
            ) {
              applyZakiBotToolResult({ content: report.content, type: report?.type });
              return;
            }
            if (report?.type === "fullTextResponse") {
              accumulated = String(report.content || "");
              updateAssistantContent(threadSlug, assistantId, accumulated);
              if (accumulated) hasAnswer = true;
              return;
            }
            if (report?.type === "textResponseChunk") {
              accumulated += String(report.content || "");
              updateAssistantContent(threadSlug, assistantId, accumulated);
              if (accumulated) hasAnswer = true;
              return;
            }
            if (report?.type === "toolCallInvocation") return;
            if (report?.type === "statusResponse") return;
          }

          if (payload?.type === "progress") {
            if (isZakiBotActiveSpace) {
              pushZakiBotProgressEvent(payload, "progress");
            }
            return;
          }

          if (payload?.type === "statusResponse") {
            if (isZakiBotActiveSpace) {
              pushZakiBotProgressEvent(payload, "status");
            }
            return;
          }
          if (payload?.type === "reasoning_summary") {
            if (isZakiBotActiveSpace) {
              updateNullalisReasoningSummary(payload);
            }
            return;
          }
          if (payload?.type === "reply_start") {
            if (isZakiBotActiveSpace) {
              markZakiBotReplyStart(payload);
            }
            return;
          }

          if (payload?.type === "toolCallInvocation") {
            if (isZakiBotActiveSpace) {
              upsertZakiBotToolCall(payload);
            }
            return;
          }
          if (payload?.type === "toolCallResult" || payload?.type === "tool_result") {
            if (isZakiBotActiveSpace) {
              applyZakiBotToolResult(payload);
            }
            return;
          }

          if (payload?.type === "wssFailure") {
            sawTerminalEvent = true;
            finalizeZakiBotProgress("error");
            const errorText =
              (typeof payload.content === "string" && payload.content) ||
              "Agent connection failed.";
            updateAssistantError(threadSlug, assistantId, errorText, "agent_error");
            ws.close();
            return;
          }

          if (payload?.type === "error" || payload?.error === true) {
            sawTerminalEvent = true;
            finalizeZakiBotProgress("error");
            const errorText =
              (typeof payload.message === "string" && payload.message) ||
              (typeof payload.error === "string" && payload.error) ||
              "Agent connection failed.";
            updateAssistantError(threadSlug, assistantId, errorText, "agent_error");
            ws.close();
            return;
          }

          if (payload?.type === "done") {
            sawTerminalEvent = true;
            finalizeZakiBotProgress("done");
            ws.close();
            return;
          }

          const rawChunk =
            (typeof payload.textResponse === "string" && payload.textResponse) ||
            (typeof payload.content === "string" && payload.content) ||
            (typeof payload.message === "string" && payload.message) ||
            (typeof payload.error === "string" && payload.error) ||
            "";
          if (rawChunk) {
            if (
              payload.type === "textResponse" ||
              payload.type === "fullTextResponse"
            ) {
              accumulated = rawChunk;
            } else {
              accumulated += rawChunk;
            }
            updateAssistantContent(threadSlug, assistantId, accumulated);
            if (accumulated) hasAnswer = true;
          }

          if (payload.close || payload.type === "finalizeResponseStream") {
            sawTerminalEvent = true;
            finalizeZakiBotProgress("done");
            ws.close();
            return;
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        if (signal?.aborted) {
          resolveOnce();
          return;
        }
        finalizeZakiBotProgress("error");
        rejectOnce(new Error("Connection failed."));
      };
      ws.onclose = () => {
        if (!signal?.aborted && !sawTerminalEvent) {
          finalizeZakiBotProgress("stream_end");
        }
        resolveOnce();
      };
    });
  }, [
    applyZakiBotToolResult,
    finalizeZakiBotProgress,
    isZakiBotActiveSpace,
    pushZakiBotProgressEvent,
    markZakiBotReplyStart,
    updateNullalisReasoningSummary,
    updateAssistantContent,
    updateAssistantError,
    upsertZakiBotToolCall,
  ]);

  // Stream chat message via fetch (POST)
  const streamChatMessage = useCallback(async ({
    workspaceSlug,
    threadSlug,
    message,
    assistantId,
    signal,
    disableResponseEnvelope = false,
  }: {
    workspaceSlug: string;
    threadSlug: string;
    message: string;
    assistantId: string;
    signal?: AbortSignal;
    disableResponseEnvelope?: boolean;
  }) => {
    const activeSpace = spacesList.find((s) => s.id === workspaceSlug);
    const instructions = activeSpace?.instructions ?? "";
    const shouldDisableResponseEnvelope =
      responseFormattingConfig.disableResponseEnvelope || disableResponseEnvelope;
    const isZakiAgentSpace =
      String(workspaceSlug || "").trim().toLowerCase() === ZAKI_BOT_SPACE_ID;
    const isAnonymousSpaces = !authUserId && !isZakiAgentSpace;
    const requestPath = isZakiAgentSpace
      ? "/api/agent/chat/stream"
      : isAnonymousSpaces
        ? `/api/anonymous/workspace/${workspaceSlug}/thread/${threadSlug}/stream-chat`
        : `/workspace/${workspaceSlug}/thread/${threadSlug}/stream-chat`;
    const requestBody = isZakiAgentSpace
      ? {
          message,
          threadId: threadSlug,
          spaceId: workspaceSlug,
        }
      : {
          message,
          mode: queryModeEnabled ? "query" : "chat",
          ...(shouldDisableResponseEnvelope ? { disableResponseEnvelope: true } : {}),
          ...(instructions ? { promptPrefix: `${instructions}\n\n` } : {}),
        };

    console.log(`[Chat] Sending message to ${workspaceSlug}/${threadSlug}`);
    const response = await apiRequest(requestPath, {
      method: "POST",
      body: JSON.stringify(requestBody),
      signal,
      skipAuth: isAnonymousSpaces,
    });

    console.log(`[Chat] Response status: ${response.status}`);
    const agentBaseHeader = response.headers.get("x-zaki-agent-base");

    if (!response.ok) {
      console.error(`[Chat] Stream failed: ${response.status}`);
      let message = `Chat request failed (${response.status}).`;
      let errorCode: string | null = null;
      let quotaResetAt: string | null = null;
      let quotaSurfaceCode: UsageQuotaSurface | null = null;
      const requestId = response.headers.get("x-request-id");
      const errorContentType = response.headers.get("content-type") || "";
      try {
        if (errorContentType.includes("application/json")) {
          const data = (await response.json()) as {
            error?: string;
            message?: string;
            code?: string;
            limit?: number;
            resetAt?: string;
            surface?: string;
            period?: string;
          };
          if (typeof data.code === "string" && data.code.trim()) {
            errorCode = data.code.trim();
          }
          if (typeof data.resetAt === "string" && data.resetAt.trim()) {
            quotaResetAt = data.resetAt.trim();
          }
          if (typeof data.surface === "string" && data.surface.trim().toLowerCase() === "zaki_bot") {
            quotaSurfaceCode = "zaki_bot";
          } else if (typeof data.surface === "string" && data.surface.trim().toLowerCase() === "app_chat") {
            quotaSurfaceCode = "app_chat";
          }
          if (typeof data.message === "string" && data.message.trim()) {
            message = data.message;
          } else if (typeof data.error === "string" && data.error.trim()) {
            message = data.error;
          } else if (errorCode === "access_expired") {
            message = "Access code required. Redeem a fresh code to keep chatting.";
          } else if (errorCode === "daily_limit_reached" || errorCode === "weekly_limit_reached") {
            const resetLabel = quotaResetAt
              ? new Date(quotaResetAt).toLocaleString()
              : errorCode === "weekly_limit_reached"
                ? "next week"
                : "tomorrow";
            const isBotQuota = quotaSurfaceCode === "zaki_bot" || isZakiAgentSpace;
            if (isBotQuota) {
              message = chatCopy.experimentalLimitReached(resetLabel);
            } else {
              message = chatCopy.appFreeLimitReached(resetLabel);
            }
          }
        } else {
          const text = (await response.text()).trim();
          if (text) {
            message = text;
          }
        }
      } catch {
        // Keep fallback message.
      }
      if (requestId) {
        message = `${message} (Ref: ${requestId})`;
      }
      throw new ChatRequestError(message, response.status, errorCode);
    }

    const resolveAgentUrl = (payload: Record<string, unknown>): string | null => {
      const direct =
        (payload.agentInvocationUrl as string | undefined) ||
        (payload.invocationUrl as string | undefined) ||
        (payload.websocketUrl as string | undefined) ||
        (payload.wsUrl as string | undefined) ||
        (payload.url as string | undefined);
      if (direct) return normalizeAgentSocketUrl(direct);
      const socketId =
        (payload.websocketUUID as string | undefined) ||
        (payload.websocketUuid as string | undefined);
      if (socketId) return buildAgentInvocationUrl(socketId, agentBaseHeader);
      return null;
    };

    const readPayloadChunk = (
      payload: Record<string, unknown>,
      eventType?: string
    ): { done?: boolean; chunk?: string; agentUrl?: string } => {
      const payloadType = typeof payload.type === "string" ? payload.type : "";
      if (isZakiAgentSpace && (eventType === "ready" || eventType === "reply_start")) {
        if (eventType === "reply_start") {
          markZakiBotReplyStart({ ...payload, type: "reply_start" });
        }
        return {};
      }
      if (isZakiAgentSpace && eventType === "token") {
        const tokenChunk =
          (typeof payload.delta === "string" && payload.delta) ||
          (typeof payload.token === "string" && payload.token) ||
          (typeof payload.text === "string" && payload.text) ||
          (typeof payload.chunk === "string" && payload.chunk) ||
          (typeof payload.content === "string" && payload.content) ||
          "";
        return tokenChunk ? { chunk: tokenChunk } : {};
      }
      if (isZakiAgentSpace && payloadType === "token") {
        const tokenChunk =
          (typeof payload.delta === "string" && payload.delta) ||
          (typeof payload.token === "string" && payload.token) ||
          (typeof payload.text === "string" && payload.text) ||
          (typeof payload.chunk === "string" && payload.chunk) ||
          (typeof payload.content === "string" && payload.content) ||
          "";
        return tokenChunk ? { chunk: tokenChunk } : {};
      }
      if (
        eventType === "done" ||
        payloadType === "done" ||
        payload.close === true ||
        payloadType === "finalizeResponseStream"
      ) {
        if (isZakiAgentSpace) {
          const usageSummary = extractNullalisUsageSummary(payload);
          if (usageSummary) {
            setZakiUsageSummary(usageSummary);
          }
          if (typeof payload.duration_ms === "number") {
            setTurnDurationMs(payload.duration_ms);
          }
          // Extract inline context data if nullalis sends it with done
          if (
            typeof payload.context_tokens === "number" &&
            typeof payload.context_max === "number"
          ) {
            setNullalisContextGauge({
              tokenCount: payload.context_tokens as number,
              contextMax: payload.context_max as number,
              messageCount:
                typeof payload.message_count === "number"
                  ? (payload.message_count as number)
                  : undefined,
            });
          }
          pushNullalisTranscriptEntry(extractNullalisTranscriptEntry("done", payload));
          setNullalisNarrationFrame(null);
        }
        if (isZakiAgentSpace) {
          finalizeZakiBotProgress("done");
        }
        const finalChunk =
          isZakiAgentSpace
            ? (typeof payload.message === "string" && payload.message) ||
              (typeof payload.text === "string" && payload.text) ||
              (typeof payload.content === "string" && payload.content) ||
              ""
            : "";
        return finalChunk ? { done: true, chunk: finalChunk } : { done: true };
      }
      if (eventType === "error") {
        if (isZakiAgentSpace) {
          finalizeZakiBotProgress("error");
        }
        const msg =
          (typeof payload.message === "string" && payload.message) ||
          (typeof payload.error === "string" && payload.error) ||
          "Agent stream failed.";
        throw new ChatRequestError(
          msg,
          502,
          typeof payload.code === "string" ? payload.code : "chat_error"
        );
      }

      if (isMemoryPipelineEnabled && eventType === "memory_used" && Array.isArray(payload.sources)) {
        updateAssistantSources(
          threadSlug,
          assistantId,
          payload.sources as Array<{ id: string; content: string; type: string }>
        );
        return {};
      }
      if (isMemoryPipelineEnabled && payload?.type === "memoryUsed" && Array.isArray(payload.sources)) {
        updateAssistantSources(
          threadSlug,
          assistantId,
          payload.sources as Array<{ id: string; content: string; type: string }>
        );
        return {};
      }

      if (payload?.type === "agentInitWebsocketConnection") {
        const agentUrl = resolveAgentUrl(payload);
        if (agentUrl) {
          return { agentUrl };
        }
      }
      // **D1.5** — nullalis tool_only_turn event (D1.4 emit). Fires
      // when the model produced tool/spawn calls but no post-tool
      // assistant text. Without this handler, the gateway falls back
      // to emitting EMPTY_TURN_PLACEHOLDER text ("[tools ran, no
      // direct reply this turn — results may arrive on a follow-up.]")
      // which the user reads as the final reply and closes the
      // window before the async subagent result arrives. With this
      // handler, the frontend can render structured chrome instead.
      //
      // Minimum-viable implementation: log + push as a transcript
      // entry so the chrome rail shows "[N tools ran, M subagents
      // dispatched]". Full UX (replacing the placeholder text bubble
      // with a structured "awaiting subagent" tile + deep-link to
      // task status) is a follow-up after the design is locked.
      if (
        isZakiAgentSpace &&
        (eventType === "tool_only_turn" || payloadType === "tool_only_turn")
      ) {
        const toolCount =
          typeof payload.tool_calls_executed === "number"
            ? (payload.tool_calls_executed as number)
            : 0;
        const taskIds = Array.isArray(payload.spawned_task_ids)
          ? (payload.spawned_task_ids as string[])
          : [];
        const iters =
          typeof payload.iterations_used === "number"
            ? (payload.iterations_used as number)
            : 0;
        // eslint-disable-next-line no-console
        console.info("[zaki-runtime] tool_only_turn", {
          tool_calls_executed: toolCount,
          spawned_task_ids: taskIds,
          iterations_used: iters,
        });
        pushNullalisTranscriptEntry({
          kind: "tool_only_turn",
          toolCallsExecuted: toolCount,
          spawnedTaskIds: taskIds,
          iterationsUsed: iters,
          timestamp: Date.now(),
        } as unknown as ZakiTranscriptSeed);
        // Don't return done — the gateway will still emit a final
        // chunk (placeholder or real) plus the close frame.
        return {};
      }
      if (eventType === "system_notice" || payloadType === "system_notice") {
        const notice = extractSystemNoticePayload(payload);
        if (notice) emitSystemNotice(notice);
        return {};
      }
      if (isZakiAgentSpace) {
        if (eventType === "progress" || payloadType === "progress") {
          const frame = extractNullalisNarrationFrame(payload);
          if (frame) {
            pushNullalisNarrationFrame(payload);
            return {};
          }
          pushZakiBotProgressEvent(payload, "progress");
          return {};
        }
        if (eventType === "tool_start" || payloadType === "tool_start") {
          pushNullalisTranscriptEntry(extractNullalisTranscriptEntry("tool_start", payload));
          upsertZakiBotToolCall({
            ...payload,
            type: "toolCallInvocation",
            name: payload.name ?? payload.tool,
            tool: payload.tool ?? payload.name,
          });
          return {};
        }
        if (eventType === "tool_result" || payloadType === "tool_result") {
          pushNullalisTranscriptEntry(extractNullalisTranscriptEntry("tool_result", payload));
          applyZakiBotToolResult({ ...payload, type: "tool_result" });
          return {};
        }
        if (eventType === "task_update" || payloadType === "task_update") {
          upsertNullalisTaskItem(payload);
          return {};
        }
        if (eventType === "approval_required" || payloadType === "approval_required") {
          const approvalRequest = extractNullalisApprovalRequest(payload);
          setNullalisApprovalRequest(approvalRequest);
          if (approvalRequest?.id) {
            const sessionKey =
              activeZakiSessionKey || buildAgentSessionKey(activeThreadId || "main", agentUserId);
            if (sessionKey) {
              const seenSet =
                approvalSeenBySessionRef.current[sessionKey] ||
                (approvalSeenBySessionRef.current[sessionKey] = new Set<string>());
              if (!seenSet.has(approvalRequest.id)) {
                seenSet.add(approvalRequest.id);
                incrementSessionApprovalCount(sessionKey, approvalRequest);
              }
            }
          }
          pushNullalisTranscriptEntry(extractNullalisTranscriptEntry("approval_required", payload));
          setNullalisNarrationFrame({
            id: `zaki-runtime-approval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            phase: "waiting",
            label: "Waiting for tool approval...",
            tool: typeof payload.tool === "string" ? payload.tool : null,
            iteration: null,
            durationMs: null,
            stepIndex: null,
            stepTotal: null,
            timestamp: Date.now(),
          });
          return {};
        }
        if (eventType === "reasoning_summary" || payloadType === "reasoning_summary") {
          updateNullalisReasoningSummary(payload);
          return {};
        }
        if (
          eventType === "status" ||
          payloadType === "statusResponse" ||
          payloadType === "status"
        ) {
          pushNullalisTranscriptEntry(
            extractNullalisTranscriptEntry(eventType || payloadType, payload)
          );
          pushZakiBotProgressEvent(payload, "status");
          return {};
        }
      }
      // Fallback handlers — use isZakiAgentSpace (frozen at call time) rather
      // than isZakiBotActiveSpace (reactive) so a mid-stream space switch can't
      // route events to the wrong state.
      if (eventType === "progress" || payload?.type === "progress") {
        if (isZakiAgentSpace) {
          pushZakiBotProgressEvent(payload, "progress");
        }
        return {};
      }
      if (
        eventType === "status" ||
        payload?.type === "statusResponse" ||
        payload?.type === "toolCallInvocation"
      ) {
        if (isZakiAgentSpace) {
          if (payload?.type === "toolCallInvocation") {
            upsertZakiBotToolCall(payload);
            return {};
          }
          pushZakiBotProgressEvent(payload, "status");
          return {};
        }
        return {};
      }
      if (eventType === "reasoning_summary" || payload?.type === "reasoning_summary") {
        if (isZakiAgentSpace) {
          updateNullalisReasoningSummary(payload);
        }
        return {};
      }
      if (eventType === "reply_start" || payload?.type === "reply_start") {
        if (isZakiAgentSpace) {
          markZakiBotReplyStart(payload);
        }
        return {};
      }
      if (payload?.type === "toolCallResult" || payload?.type === "tool_result") {
        if (isZakiAgentSpace) {
          applyZakiBotToolResult(payload);
        }
        return {};
      }
      if (payload?.type === "abort" && typeof payload.error === "string" && payload.error.trim()) {
        if (isZakiAgentSpace) {
          finalizeZakiBotProgress("error");
        }
        throw new Error(payload.error.trim());
      }

      if (payload?.type === "error" || payload?.error === true) {
        if (isZakiAgentSpace) {
          finalizeZakiBotProgress("error");
        }
        const errorMessage =
          (typeof payload.message === "string" && payload.message.trim()) ||
          (typeof payload.error === "string" && payload.error.trim()) ||
          "ZAKI couldn't finish that reply. Please try again.";
        throw new ChatRequestError(
          errorMessage,
          502,
          typeof payload.code === "string" ? payload.code : "chat_error"
        );
      }

      // C3: system notice events — handle before the isZakiAgentSpace text filter
      // so that these events surface on all views (not just agent mode).
      if (
        eventType === "system_notice" || payloadType === "system_notice" ||
        eventType === "compaction" || eventType === "provider_fallback" ||
        eventType === "connector_stale" || eventType === "multimodal_failure"
      ) {
        const notice: SystemNoticePayload | null =
          eventType === "system_notice" || payloadType === "system_notice"
            ? (() => {
                const kind = (
                  typeof payload.kind === "string" ? payload.kind : "system_notice"
                ) as SystemNoticeKind;
                const message =
                  typeof payload.message === "string" ? payload.message : null;
                return { kind, message };
              })()
            : ({
                kind: eventType as SystemNoticeKind,
                message: (payload as { message?: string }).message ?? null,
              } as SystemNoticePayload);
        if (notice) emitSystemNotice(notice);
        return {};
      }

      if (isZakiAgentSpace) {
        const explicitTextPayload =
          payloadType === "textResponse" ||
          payloadType === "textResponseChunk" ||
          payloadType === "fullTextResponse" ||
          payloadType === "text";
        if (!explicitTextPayload) {
          return {};
        }
      }

      const chunk =
        (typeof payload.delta === "string" && payload.delta) ||
        (typeof payload.textResponse === "string" && payload.textResponse) ||
        (typeof payload.content === "string" && payload.content) ||
        (typeof payload.message === "string" && payload.message) ||
        "";

      if (!chunk && eventType && process.env.NODE_ENV === "development") {
        console.warn("[zaki:sse] unhandled event type:", eventType, payload);
      }

      return chunk ? { chunk } : {};
    };

    const contentType = response.headers.get("content-type") || "";
    applyQuotaHeaders(response.headers, isZakiAgentSpace ? "zaki_bot" : "app_chat");
    let sawTerminalEvent = false;
    
    // If JSON response, check for agent invocation URL
    if (contentType.includes("application/json")) {
      const data = (await response.json()) as Record<string, unknown>;
      const agentUrl = resolveAgentUrl(data);
      if (agentUrl) {
        await streamAgentInvocation(agentUrl, threadSlug, assistantId, signal);
        return { content: "" };
      }

      const result = readPayloadChunk(data);
      if (result.agentUrl) {
        await streamAgentInvocation(result.agentUrl, threadSlug, assistantId, signal);
        return { content: "" };
      }
      if (result.chunk) {
        const normalized = normalizeAssistantFormatting(message, result.chunk);
        updateAssistantContent(
          threadSlug,
          assistantId,
          normalized
        );
        return { content: normalized };
      }
      if (result.done) {
        sawTerminalEvent = true;
      }
      if (isZakiAgentSpace && !sawTerminalEvent && !signal?.aborted) {
        finalizeZakiBotProgress("stream_end");
      }
      return { content: "" };
    }

    if (!response.body) {
      throw new Error("Chat stream returned no data.");
    }

    // Stream SSE/text response
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let accumulated = "";
    let buffer = "";
    let streamClosed = false;
    let renderedLength = 0;
    let renderRaf: number | null = null;

    const flushRenderedContent = () => {
      if (renderRaf != null) {
        window.cancelAnimationFrame(renderRaf);
        renderRaf = null;
      }
      if (renderedLength === accumulated.length) return;
      renderedLength = accumulated.length;
      updateAssistantContent(threadSlug, assistantId, accumulated);
    };

    const appendChunk = (chunk: string) => {
      if (!chunk) return;
      accumulated += chunk;
      if (renderRaf != null) return;
      renderRaf = window.requestAnimationFrame(() => {
        renderRaf = null;
        if (renderedLength === accumulated.length) return;
        renderedLength = accumulated.length;
        updateAssistantContent(threadSlug, assistantId, accumulated);
      });
    };

    const processRawData = async (raw: string) => {
      const value = raw.trim();
      if (!value || value === "[DONE]") {
        if (value === "[DONE]") {
          streamClosed = true;
          sawTerminalEvent = true;
          if (isZakiAgentSpace) {
            finalizeZakiBotProgress("done");
          }
        }
        return;
      }
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(value) as Record<string, unknown>;
      } catch {
        appendChunk(raw);
        return;
      }

      const result = readPayloadChunk(payload);
        if (result.agentUrl) {
          streamClosed = true;
          await streamAgentInvocation(result.agentUrl, threadSlug, assistantId, signal);
          accumulated = "";
          return;
        }
      if (result.chunk) {
        appendChunk(result.chunk);
      }
      if (result.done) {
        sawTerminalEvent = true;
        flushRenderedContent();
        streamClosed = true;
        return;
      }
    };

    const processSseBlock = async (block: string) => {
      const normalized = block.replace(/\r/g, "");
      const lines = normalized.split("\n");
      const dataLines: string[] = [];
      let eventType = "";

      for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        if (!line || line.startsWith(":")) continue;
        if (line.startsWith("event:")) {
          eventType = line.slice(6).trim();
          continue;
        }
        if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trimStart());
          continue;
        }
        // Fallback: non-SSE chunked line
        await processRawData(line);
      }

      if (dataLines.length > 0) {
        const payloadText = dataLines.join("\n");
        try {
          const payload = JSON.parse(payloadText) as Record<string, unknown>;
          const result = readPayloadChunk(payload, eventType);
          if (result.chunk) {
            appendChunk(result.chunk);
          }
          if (result.done) {
            sawTerminalEvent = true;
            flushRenderedContent();
            streamClosed = true;
            return;
          }
          if (result.agentUrl) {
            flushRenderedContent();
            await streamAgentInvocation(result.agentUrl, threadSlug, assistantId, signal);
            try {
              await reader.cancel();
            } catch {
              // ignore cancel errors
            }
            streamClosed = true;
            return;
          }
          return;
        } catch {
          await processRawData(payloadText);
        }
      }
    };

    while (!streamClosed) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });

      // Handle SSE event boundaries when present
      let separatorIndex = buffer.indexOf("\n\n");
      while (separatorIndex !== -1) {
        const block = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        await processSseBlock(block);
        if (streamClosed) break;
        separatorIndex = buffer.indexOf("\n\n");
      }
    }

    const trailing = buffer.trim();
    if (!streamClosed && trailing) {
      await processSseBlock(trailing);
    }

    if (isZakiAgentSpace && !sawTerminalEvent && !signal?.aborted) {
      finalizeZakiBotProgress("stream_end");
    }

    flushRenderedContent();
    const finalized = normalizeAssistantFormatting(message, accumulated);
    if (finalized && finalized !== accumulated) {
      updateAssistantContent(threadSlug, assistantId, finalized);
    }
    return { content: finalized || accumulated };
  }, [
    applyQuotaHeaders,
    applyZakiBotToolResult,
    authUserId,
    finalizeZakiBotProgress,
    isRtl,
    isZakiBotActiveSpace,
    isMemoryPipelineEnabled,
    markZakiBotReplyStart,
    pushNullalisNarrationFrame,
    pushNullalisTranscriptEntry,
    pushZakiBotProgressEvent,
    queryModeEnabled,
    responseFormattingConfig.disableResponseEnvelope,
    spacesList,
    streamAgentInvocation,
    updateAssistantContent,
    updateAssistantSources,
    updateNullalisReasoningSummary,
    upsertNullalisTaskItem,
    upsertZakiBotToolCall,
  ]);

  const clearMemoryToastDismiss = useCallback(() => {
    if (autoDismissTimerRef.current) {
      window.clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
  }, []);

  const dismissMemoryToast = useCallback(() => {
    setShowMemoryToast(false);
    setRecentSavedMemories([]);
    setRecentReviewCount(0);
    setRecentConflictCount(0);
    setMemoryToastUndoError(null);
    setMemoryToastPartialUndoCount(0);
    clearMemoryToastDismiss();
  }, [clearMemoryToastDismiss]);

  const scheduleMemoryToastDismiss = useCallback(() => {
    clearMemoryToastDismiss();
    autoDismissTimerRef.current = window.setTimeout(() => {
      dismissMemoryToast();
    }, 5000);
  }, [clearMemoryToastDismiss, dismissMemoryToast]);

  const presentMemoryToast = useCallback(
    ({
      saved,
      reviewCount,
      conflictCount,
      mode,
    }: {
      saved: MemoryCaptureResponse["saved"];
      reviewCount: number;
      conflictCount: number;
      mode: "saved" | "review" | "conflict";
    }) => {
      const shouldShow = saved.length > 0 || reviewCount > 0 || conflictCount > 0;
      setRecentSavedMemories(saved);
      setRecentReviewCount(reviewCount);
      setRecentConflictCount(conflictCount);
      setMemoryToastMode(mode);
      setShowMemoryToast(shouldShow);

      if (!shouldShow) {
        clearMemoryToastDismiss();
        return;
      }

      if (mode === "saved") {
        scheduleMemoryToastDismiss();
      } else {
        clearMemoryToastDismiss();
      }
    },
    [clearMemoryToastDismiss, scheduleMemoryToastDismiss]
  );

  const openMemoryViewer = useCallback((query?: string, tab?: MemoryViewerTab) => {
    openSpacesMemoryViewer({ enabled: isMemoryPipelineEnabled, query, tab });
  }, [isMemoryPipelineEnabled]);

  const maybeShowSessionSummaryCue = useCallback(
    async (threadId?: string | null) => {
      if (!authUserId || !isMemoryPipelineEnabled) return;
      const pendingSummary = pendingSessionSummaryRef.current;
      const scopedThreadId = String(threadId || pendingSummary?.threadId || "").trim();
      if (!pendingSummary || !scopedThreadId || pendingSummary.threadId !== scopedThreadId) {
        return;
      }

      try {
        const { response, data } = await fetchMemoryActivity(8);
        if (!response.ok) return;
        const activities = Array.isArray(data?.activities) ? data.activities : [];
        const matchingActivity = activities.find((activity: MemoryActivity) => {
          const activityThreadId = String(activity?.threadId || "").trim();
          const occurredAt = Date.parse(String(activity?.occurredAt || ""));
          if (!activityThreadId || activityThreadId !== scopedThreadId) return false;
          if (!Number.isFinite(occurredAt) || occurredAt < pendingSummary.queuedAt - 1000) {
            return false;
          }
          return ["saved", "review", "conflict"].includes(String(activity?.kind || ""));
        });

        if (!matchingActivity) return;
        const cueKey = `${matchingActivity.kind}:${matchingActivity.id}:${matchingActivity.occurredAt}`;
        if (sessionSummaryCueKeyRef.current === cueKey) return;
        sessionSummaryCueKeyRef.current = cueKey;
        pendingSessionSummaryRef.current = null;

        const targetTab =
          matchingActivity.kind === "review"
            ? "pending"
            : matchingActivity.kind === "conflict"
              ? "conflicts"
              : "memories";

        toast.info(t("memory.sessionSummaryUpdated"), {
          action: {
            label: t("memory.open"),
            onClick: () => openMemoryViewer(undefined, targetTab),
          },
        });
      } catch {
        // Best-effort cue only.
      }
    },
    [authUserId, isMemoryPipelineEnabled, openMemoryViewer, t]
  );

  const syncMemoryStatus = useCallback(
    async (notifyOnNewConflicts = false) => {
      if (!authUserId || !isMemoryPipelineEnabled) return;
      try {
        const statusResponse = await apiRequest("/api/memory/status");
        if (!statusResponse.ok) return;
        const statusData = (await statusResponse.json()) as {
          pending?: number;
          conflicts?: number;
        };

        const pendingCount = Math.max(0, Number(statusData.pending || 0));
        const conflictCount = Math.max(0, Number(statusData.conflicts || 0));
        const previousConflictCount = conflictCountRef.current;

        setMemoryPendingCount(pendingCount);
        if (!memoryStatusHydratedRef.current) {
          memoryStatusHydratedRef.current = true;
        } else if (notifyOnNewConflicts && conflictCount > previousConflictCount) {
          presentMemoryToast({
            saved: [],
            reviewCount: 0,
            conflictCount: conflictCount - previousConflictCount,
            mode: "conflict",
          });
        }

        conflictCountRef.current = conflictCount;
        setMemoryConflictCount(conflictCount);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("zaki:memory-conflicts-count", {
              detail: { count: conflictCount },
            })
          );
        }
        void maybeShowSessionSummaryCue();

      } catch {
        // Sync is best-effort and should never block chat.
      }
    },
    [authUserId, isMemoryPipelineEnabled, maybeShowSessionSummaryCue, presentMemoryToast]
  );

  const requestMemoryStatusSync = useCallback(
    (notifyOnNewConflicts = false, force = false) => {
      if (!authUserId || !isMemoryPipelineEnabled) return;
      const now = Date.now();
      const elapsed = now - lastMemoryStatusSyncAtRef.current;
      if (!force && elapsed < MEMORY_STATUS_SYNC_THROTTLE_MS) {
        return;
      }
      lastMemoryStatusSyncAtRef.current = now;
      void syncMemoryStatus(notifyOnNewConflicts);
    },
    [authUserId, isMemoryPipelineEnabled, syncMemoryStatus]
  );

  const checkForSavedMemories = useCallback(async (message: string, threadId?: string) => {
    if (!authUserId || !isMemoryPipelineEnabled) return;
    if (memoryInFlightRef.current) {
      queuedMemoryCheckRef.current = { message, threadId };
      return;
    }

    lastMemoryRequestRef.current = { message, threadId };
    memoryInFlightRef.current = true;

    try {
      const { response, data } = await captureMemory({
        message,
        threadId: threadId ?? activeThreadId,
      });

      if (!response.ok || !data) {
        setMemoryError("Memory save failed. Retry?");
        return;
      }

      setMemoryError(null);
      setMemoryToastUndoError(null);
      setMemoryToastPartialUndoCount(0);
      const saved = Array.isArray(data.saved) ? data.saved : [];
      const review = Array.isArray(data.review) ? data.review : [];
      const conflicts = Array.isArray(data.conflicts) ? data.conflicts : [];
      const duplicates = Array.isArray(data.duplicates) ? data.duplicates : [];

      if (conflicts.length > 0) {
        const newConflicts = conflicts.filter((conflict: { id?: string }) => {
          if (!conflict?.id) return true;
          if (memoryConflictSeenRef.current.has(conflict.id)) return false;
          memoryConflictSeenRef.current.add(conflict.id);
          return true;
        });
        if (newConflicts.length > 0) {
          presentMemoryToast({
            saved: [],
            reviewCount: 0,
            conflictCount: newConflicts.length,
            mode: "conflict",
          });
        }
      }

      if (saved.length === 0 && review.length === 0 && duplicates.length > 0 && conflicts.length === 0) {
        const firstDuplicate = String(duplicates[0]?.content || "").trim();
        toast.info(
          duplicates.length === 1 && firstDuplicate
            ? t("memory.duplicateSingle", { content: firstDuplicate })
            : t("memory.duplicateMultiple", { count: duplicates.length })
        );
        return;
      }

      if (saved.length > 0) {
        if (authUserId && !activationProgress.firstMemorySaved) {
          const nextProgress = markFirstMemorySaved(authUserId);
          setActivationProgress(nextProgress);
          void trackProductEvent({
            event: "first_memory_saved",
            source: "chat_input",
            language: isRtl ? "ar" : "en",
            plan: null,
            interval: null,
          }).catch(() => {
            // Best-effort telemetry only.
          });
          if (nextProgress.completed) {
            void trackProductEvent({
              event: "activation_completed",
              source: "chat_input",
              language: isRtl ? "ar" : "en",
              plan: null,
              interval: null,
            }).catch(() => {
              // Best-effort telemetry only.
            });
          }
        }
      }
      presentMemoryToast({
        saved,
        reviewCount: review.length,
        conflictCount: conflicts.length,
        mode: conflicts.length > 0 ? "conflict" : review.length > 0 ? "review" : "saved",
      });
    } catch (err) {
      // Silent fail - not critical for chat
      console.log("[Memory] Check failed:", err);
      setMemoryError("Memory save failed. Retry?");
    } finally {
      memoryInFlightRef.current = false;
      requestMemoryStatusSync(true);
      if (queuedMemoryCheckRef.current) {
        const next = queuedMemoryCheckRef.current;
        queuedMemoryCheckRef.current = null;
        checkForSavedMemories(next.message, next.threadId);
      }
    }
  }, [
    authUserId,
    activationProgress.firstMemorySaved,
    activeThreadId,
    isMemoryPipelineEnabled,
    isRtl,
    presentMemoryToast,
    requestMemoryStatusSync,
    t,
  ]);

  useEffect(() => {
    if (!isMemoryPipelineEnabled) {
      conflictCountRef.current = 0;
      memoryStatusHydratedRef.current = false;
      lastMemoryStatusSyncAtRef.current = 0;
      pendingSessionSummaryRef.current = null;
      sessionSummaryCueKeyRef.current = null;
      queuedMemoryCheckRef.current = null;
      memoryInFlightRef.current = false;
      if (
        showMemoryToast ||
        recentSavedMemories.length > 0 ||
        recentReviewCount > 0 ||
        recentConflictCount > 0 ||
        memoryToastUndoError ||
        memoryToastPartialUndoCount > 0
      ) {
        dismissMemoryToast();
      }
      if (memoryPendingCount !== 0) setMemoryPendingCount(0);
      if (memoryConflictCount !== 0) setMemoryConflictCount(0);
      if (memoryError !== null) setMemoryError(null);
      return;
    }
    if (!authUserId) {
      conflictCountRef.current = 0;
      memoryStatusHydratedRef.current = false;
      lastMemoryStatusSyncAtRef.current = 0;
      pendingSessionSummaryRef.current = null;
      sessionSummaryCueKeyRef.current = null;
      if (memoryPendingCount !== 0) setMemoryPendingCount(0);
      if (memoryConflictCount !== 0) setMemoryConflictCount(0);
      return;
    }
    requestMemoryStatusSync(false, true);
  }, [
    authUserId,
    dismissMemoryToast,
    isMemoryPipelineEnabled,
    memoryConflictCount,
    memoryError,
    memoryPendingCount,
    memoryToastPartialUndoCount,
    memoryToastUndoError,
    recentConflictCount,
    recentReviewCount,
    recentSavedMemories.length,
    requestMemoryStatusSync,
    showMemoryToast,
  ]);

  useEffect(() => {
    if (!authUserId || !isMemoryPipelineEnabled) return;
    let cancelled = false;
    let reconnectTimer: number | null = null;
    let controller: AbortController | null = null;

    const connect = async () => {
      while (!cancelled) {
        controller = new AbortController();
        try {
          const response = await apiRequest("/api/memory/events", {
            method: "GET",
            headers: { Accept: "text/event-stream" },
            signal: controller.signal,
          });
          if (!response.ok || !response.body) {
            throw new Error(`SSE connection failed (${response.status})`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (!cancelled) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let boundary = buffer.indexOf("\n\n");
            while (boundary !== -1) {
              const block = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2);

              let eventName = "message";
              const dataLines = [];
              for (const rawLine of block.split("\n")) {
                const line = rawLine.trimEnd();
                if (!line || line.startsWith(":")) continue;
                if (line.startsWith("event:")) {
                  eventName = line.slice(6).trim();
                  continue;
                }
                if (line.startsWith("data:")) {
                  dataLines.push(line.slice(5).trim());
                }
              }

              if (eventName === "status") {
                try {
                  const payload = JSON.parse(dataLines.join("\n") || "{}") as {
                    pending?: number;
                    conflicts?: number;
                  };
                  const nextPendingCount = Math.max(0, Number(payload.pending || 0));
                  const nextConflictCount = Math.max(
                    0,
                    Number(payload.conflicts || 0)
                  );
                  const previousConflictCount = conflictCountRef.current;
                  setMemoryPendingCount(nextPendingCount);
                  if (nextConflictCount > conflictCountRef.current) {
                    presentMemoryToast({
                      saved: [],
                      reviewCount: 0,
                      conflictCount: nextConflictCount - conflictCountRef.current,
                      mode: "conflict",
                    });
                  }
                  conflictCountRef.current = nextConflictCount;
                  setMemoryConflictCount(nextConflictCount);
                  if (typeof window !== "undefined" && nextConflictCount !== previousConflictCount) {
                    window.dispatchEvent(
                      new CustomEvent("zaki:memory-conflicts-count", {
                        detail: { count: nextConflictCount },
                      })
                    );
                  }
                  if (nextPendingCount > 0) {
                    requestMemoryStatusSync(true);
                  }
                } catch {
                  // Ignore malformed events and rely on sync fallback.
                  requestMemoryStatusSync(true);
                }
              }

              boundary = buffer.indexOf("\n\n");
            }
          }
        } catch {
          // Push updates are best-effort; focus/visibility refresh remains fallback.
        } finally {
          controller = null;
        }

        if (cancelled) break;
        await new Promise<void>((resolve) => {
          reconnectTimer = window.setTimeout(resolve, 1500);
        });
      }
    };

    void connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      controller?.abort();
    };
  }, [authUserId, isMemoryPipelineEnabled, presentMemoryToast, requestMemoryStatusSync]);

  useEffect(() => {
    if (!authUserId || !isMemoryPipelineEnabled) return;

    const handleFocus = () => {
      requestMemoryStatusSync(true, true);
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        requestMemoryStatusSync(true, true);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [authUserId, isMemoryPipelineEnabled, requestMemoryStatusSync]);

  const ensureZakiBotProvisioned = useCallback(
    async (silent = false) => {
      if (!isZakiBotActiveSpace) return true;
      if (!isAuthReady) return false;
      if (zakiBotProvisionedRef.current) return true;
      if (zakiBotProvisionPromiseRef.current) {
        return zakiBotProvisionPromiseRef.current;
      }

      const pending = (async () => {
        const { response, data } = await provisionAgent({
          spaceId: ZAKI_BOT_SPACE_ID,
          threadId: activeThreadId || ZAKI_BOT_THREAD_ID,
        });
        if (!response.ok) {
          const message = String(
            (data as { error?: string; message?: string } | null)?.error ||
              (data as { error?: string; message?: string } | null)?.message ||
              "Unable to initialize ZAKI."
          );
          if (!silent) toast.error(message);
          return false;
        }
        zakiBotProvisionedRef.current = true;
        return true;
      })()
        .catch((error) => {
          if (!silent) {
            toast.error(error instanceof Error ? error.message : "Unable to initialize ZAKI.");
          }
          return false;
        })
        .finally(() => {
          zakiBotProvisionPromiseRef.current = null;
        });

      zakiBotProvisionPromiseRef.current = pending;
      return pending;
    },
    [isAuthReady, isZakiBotActiveSpace]
  );

  useEffect(() => {
    if (!isZakiBotActiveSpace || !isAuthReady) return;
    void ensureZakiBotProvisioned(true);
  }, [ensureZakiBotProvisioned, isAuthReady, isZakiBotActiveSpace]);

  useEffect(() => {
    zakiBotProvisionedRef.current = false;
    zakiBotProvisionPromiseRef.current = null;
  }, [authUserId]);

  useEffect(() => {
    if (isZakiBotActiveSpace) return;
    clearZakiBotProgressVisuals();
  }, [clearZakiBotProgressVisuals, isZakiBotActiveSpace]);

  useEffect(() => {
    if (!isZakiBotActiveSpace) return;
    if (isStreaming) {
      if (zakiBotProcessClearTimerRef.current) {
        window.clearTimeout(zakiBotProcessClearTimerRef.current);
        zakiBotProcessClearTimerRef.current = null;
      }
      setZakiBotProgressTerminalReason(null);
      return;
    }
    if (
      zakiBotToolCalls.length === 0 &&
      zakiBotStatusEvents.length === 0 &&
      !zakiBotReplyStart
    ) {
      return;
    }
    if (zakiBotProcessClearTimerRef.current) {
      window.clearTimeout(zakiBotProcessClearTimerRef.current);
    }
    const latestStatusEvent = zakiBotStatusEvents[zakiBotStatusEvents.length - 1];
    const latestStatusText = String(latestStatusEvent?.text || "").toLowerCase();
    const latestLooksCached =
      latestStatusText.includes("cached response") ||
      latestStatusText.includes("cache hit") ||
      latestStatusText.includes("using cached");

    const clearDelayMs =
      zakiBotProgressTerminalReason === "error"
        ? 2400
        : zakiBotProgressTerminalReason === "abort"
          ? 0
          : latestLooksCached
            ? 1800
            : zakiBotToolCalls.length > 0
              ? 1500
              : 1200;

    if (clearDelayMs <= 0) {
      clearZakiBotProgressVisuals({ preserveNullalisArtifacts: true });
      return;
    }

    zakiBotProcessClearTimerRef.current = window.setTimeout(() => {
      clearZakiBotProgressVisuals({ preserveNullalisArtifacts: true });
    }, clearDelayMs);

    return () => {
      if (zakiBotProcessClearTimerRef.current) {
        window.clearTimeout(zakiBotProcessClearTimerRef.current);
        zakiBotProcessClearTimerRef.current = null;
      }
    };
  }, [
    clearZakiBotProgressVisuals,
    isStreaming,
    isZakiBotActiveSpace,
    zakiBotProgressTerminalReason,
    zakiBotReplyStart,
    zakiBotStatusEvents,
    zakiBotToolCalls,
  ]);

  // Snapshot the current turn's transcript entries into localTurnSnapshots
  // when the stream ends, so past-turn timelines persist after
  // nullalisTranscriptEntries is cleared on the next turn.
  useEffect(() => {
    const wasStreaming = prevIsStreamingRef.current;
    prevIsStreamingRef.current = isStreaming;
    if (!wasStreaming || isStreaming) return;
    if (!isZakiBotActiveSpace) return;
    const msgId = currentTurnAssistantIdRef.current;
    if (!msgId) return;
    if (!nullalisTranscriptEntries.length) return;
    const snapshot = nullalisTranscriptEntries.slice();
    setLocalTurnSnapshots((prev) => ({ ...prev, [msgId]: snapshot }));
    currentTurnAssistantIdRef.current = null;
  }, [isStreaming, isZakiBotActiveSpace, nullalisTranscriptEntries]);

  // Multi-session: allow any threadId in the agent space (no longer force "main")

  // Handle send message
  const handleSend = useCallback(async (
    text: string,
    files: File[],
    preferredWorkspaceSlug?: string | null
  ) => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Message is empty");
      return;
    }
    if (isStreaming) return;
    if (!authUserId && files.length > 0) {
      toast.error("Sign in to upload files to Spaces.");
      return;
    }
    const resolvedWorkspaceSlug = preferredWorkspaceSlug ?? activeWorkspaceSlug ?? primarySpace?.id ?? null;
    if (!resolvedWorkspaceSlug) {
      toast.error("Select a workspace before sending a message");
      return;
    }

    const isZakiBotTarget = isZakiBotSpaceId(resolvedWorkspaceSlug);
    if (isZakiBotTarget) {
      const provisioned = await ensureZakiBotProvisioned(false);
      if (!provisioned) return;
    }
    // For ZAKI bot without an activeThreadId, generate a new thread slug.
    // The nullalis backend creates the session on first message.
    let threadId = activeThreadId || (isZakiBotTarget ? `thread-${Date.now()}` : null);
    if (!threadId) {
      try {
        const response = await apiRequest(
          authUserId
            ? `/workspace/${resolvedWorkspaceSlug}/thread/new`
            : `/api/anonymous/workspace/${resolvedWorkspaceSlug}/thread/new`,
          {
            method: "POST",
            skipAuth: !authUserId,
            body: !authUserId
              ? JSON.stringify({ slug: `anon-${Date.now()}`, name: DEFAULT_THREAD_LABEL })
              : undefined,
          }
        );
        if (!response.ok) {
          throw new Error("Unable to create thread.");
        }
        const data = (await response.json()) as {
          thread?: { slug?: string; id?: string; name?: string; label?: string };
        };
        threadId = data.thread?.slug ?? data.thread?.id ?? `thread-${Date.now()}`;
        const threadName = data.thread?.name ?? data.thread?.label;
        const label = isDefaultThreadLabel(threadName)
          ? DEFAULT_THREAD_LABEL
          : threadName || DEFAULT_THREAD_LABEL;
        window.dispatchEvent(
          new CustomEvent("zaki:thread-created", {
            detail: { id: threadId, label, spaceId: resolvedWorkspaceSlug },
          })
        );
      } catch (error) {
        toast.error("Unable to start a new chat");
        return;
      }
    }

    if (!threadId) return;

    if (authUserId && !activationProgress.firstMessageSent) {
      const nextProgress = markFirstMessageSent(authUserId);
      setActivationProgress(nextProgress);
      void trackProductEvent({
        event: "first_message_sent",
        source: "chat_input",
        language: isRtl ? "ar" : "en",
        plan: null,
        interval: null,
      }).catch(() => {
        // Best-effort telemetry only.
      });
      if (nextProgress.completed) {
        void trackProductEvent({
          event: "activation_completed",
          source: "chat_input",
          language: isRtl ? "ar" : "en",
          plan: null,
          interval: null,
        }).catch(() => {
          // Best-effort telemetry only.
        });
      }
    }

    // Show all attachments (images AND documents) in the user's message so
    // they can see what they sent. MessageBubble renders images as thumbnails
    // and non-images as file pills.
    const attachmentsForMessage = files.map((file) => ({
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file),
    }));
    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;
    currentTurnAssistantIdRef.current = assistantMessageId;

    setMessagesByThread((prev) => ({
        ...prev,
        [threadId]: [
          ...(prev[threadId] ?? []),
          {
            id: userMessageId,
            role: "user" as const,
            content: trimmed,
            attachments: attachmentsForMessage,
          },
          {
            id: assistantMessageId,
            role: "assistant" as const,
            content: "",
          },
        ],
      }));

    setAttachments([]);
    const manualAgentPrefix = /^@agent\b/i.test(trimmed);
    const agentRequested = webSearchArmed || manualAgentPrefix;
    if (isZakiBotTarget) {
      clearZakiBotProgressVisuals();
      {
        const now = Date.now();
        const frame: NullalisNarrationFrame = {
          id: `zaki-runtime-start-${now}`,
          phase: "thinking",
          label: "Thinking...",
          tool: null,
          iteration: null,
          durationMs: null,
          stepIndex: null,
          stepTotal: null,
          timestamp: now,
        };
        setNullalisNarrationFrame(frame);
        setNullalisTranscriptEntries([
          {
            id: `zaki-runtime-start-entry-${now}`,
            kind: "narration",
            intent: "thinking",
            text: "Starting the request",
            timestamp: now,
            importance: 20,
            phase: "thinking",
            resultState: "running",
            groupKey: "fallback:start",
            source: "fallback",
          },
        ]);
      }
      setZakiBotStatusEvents([
        {
          id: `progress-${Date.now()}-ack`,
          text: "Processing request",
          timestamp: Date.now(),
          fingerprint: "processing request|||",
          source: "fallback",
        },
      ]);
    }
    setStreamingIndicatorMode(agentRequested ? "researching" : "thinking");
    setTurnStartedAt(Date.now());
    setTurnDurationMs(null);
    setIsStreaming(true);
    const streamController = new AbortController();
    streamAbortRef.current = streamController;
    const normalizedText = manualAgentPrefix ? trimmed.replace(/^@agent\b\s*/i, "").trim() : trimmed;
    const searchAgentInstruction = normalizedText
      ? `@agent search the web for ${normalizedText}`.trim()
      : "@agent search the web";
    // Unified file delivery (matches SOTA agents like Claude Code):
    //   All files (images + documents) are uploaded to the user's agent
    //   workspace at attachments/<safe_name>. The message only carries a
    //   short marker with the path — NOT inlined bytes. This keeps payload
    //   size bounded (tens of bytes per file) and avoids the BFF 8000-char
    //   message cap. Server-side:
    //     - Images     → multimodal pipeline reads the file, base64-encodes
    //                    for the provider. Triggered by [IMAGE:<path>] marker.
    //     - Documents  → agent calls file_read, which runs pdftotext /
    //                    pandoc / libreoffice extraction as needed.
    const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB — matches nullalis cap
    let attachmentMarkers = "";
    if (files.length > 0) {
      const parts: string[] = [];
      for (const file of files) {
        try {
          if (file.size > MAX_UPLOAD_BYTES) {
            toast.error(`${file.name} is too large (max 20 MB)`);
            continue;
          }
          // Upload to agent workspace (images and documents — same endpoint).
          let uploadedPath: string;
          try {
            const { data } = await uploadAgentAttachment(file);
            uploadedPath = data?.path ?? `attachments/${file.name}`;
          } catch (uploadErr) {
            const msg = uploadErr instanceof Error ? uploadErr.message : "upload failed";
            toast.error(`Failed to upload ${file.name}: ${msg}`);
            parts.push(`[Attachment failed to upload: ${file.name}]`);
            continue;
          }

          if (file.type.startsWith("image/")) {
            // Multimodal marker — nullalis reads the file, encodes, and
            // passes to the vision-capable provider.
            parts.push(`[IMAGE:${uploadedPath}]`);
          } else {
            // Agent-readable document — instruct the agent to read via tool.
            parts.push(
              `[User uploaded file: ${uploadedPath}]\n` +
              `Use the file_read tool with path="${uploadedPath}" to read its contents. ` +
              `Server will auto-extract text from PDF/DOCX/XLSX/PPTX/ODT/RTF/EPUB and plain-text formats.`
            );
          }
        } catch {
          parts.push(`[Attachment: ${file.name} (read error)]`);
        }
      }
      attachmentMarkers = parts.join("\n\n");
    }
    const sendText = agentRequested
      ? manualAgentPrefix
        ? attachmentMarkers
          ? `@agent ${attachmentMarkers}\n\n${normalizedText || trimmed}`.trim()
          : `@agent ${normalizedText || trimmed}`.trim()
        : attachmentMarkers
          ? `${searchAgentInstruction}\n\n${attachmentMarkers}`.trim()
          : searchAgentInstruction
      : attachmentMarkers
        ? `${attachmentMarkers}\n\n${trimmed}`
        : trimmed;

    try {
      const streamResult = await streamChatMessage({
        workspaceSlug: resolvedWorkspaceSlug,
        threadSlug: threadId,
        message: sendText,
        assistantId: assistantMessageId,
        signal: streamController.signal,
      });
      if (isZakiBotTarget && agentUserId) {
        const sessionKey = buildAgentSessionKey(threadId, agentUserId);
        if (sessionKey) {
          await queryClient.invalidateQueries({ queryKey: zakiSessionKeys.all });
          await hydrateActiveSessionDetail(sessionKey);
        }
      }
      void maybeAutoTitleThread(resolvedWorkspaceSlug, threadId, {
        userMessage: trimmed,
        assistantMessage: String(streamResult?.content || "").trim(),
      });
      setWebSearchArmed(false);
      
      // Keep chat UX responsive: memory save runs in background.
      void checkForSavedMemories(trimmed, threadId);
    } catch (error) {
      if (isAbortError(error)) {
        if (isZakiBotTarget) {
          finalizeZakiBotProgress("abort");
        }
        updateAssistantError(threadId, assistantMessageId, "Generation stopped.", "aborted");
        return;
      }
      if (error instanceof ChatRequestError && error.code === "access_expired") {
        if (isZakiBotTarget) {
          finalizeZakiBotProgress("error");
        }
        toast.error(error.message);
        navigate("/pricing");
        return;
      }
      if (isZakiBotTarget) {
        finalizeZakiBotProgress("error");
      }
      const errorMessage =
        error instanceof Error ? error.message : "ZAKI couldn't finish that reply. Please try again.";
      updateAssistantError(
        threadId,
        assistantMessageId,
        errorMessage,
        error instanceof ChatRequestError ? error.code : "chat_error"
      );
      toast.error(errorMessage);
    } finally {
      if (streamAbortRef.current === streamController) {
        streamAbortRef.current = null;
      }
      if (!isZakiBotTarget) {
        setStreamingIndicatorMode("thinking");
      }
      setIsStreaming(false);
    }
  }, [
    activeThreadId,
    activeWorkspaceSlug,
    activationProgress.firstMessageSent,
    agentUserId,
    authUserId,
    checkForSavedMemories,
    clearZakiBotProgressVisuals,
    ensureZakiBotProvisioned,
    finalizeZakiBotProgress,
    hydrateActiveSessionDetail,
    isRtl,
    isStreaming,
    navigate,
    primarySpace?.id,
    queryClient,
    streamChatMessage,
    maybeAutoTitleThread,
    updateAssistantError,
    webSearchArmed,
  ]);

  const handleStopStreaming = useCallback(() => {
    streamAbortRef.current?.abort();
  }, []);

  const handleRegenerateMessage = useCallback(
    (message: Message) => {
      if (isStreaming) return;
      const idx = messages.findIndex((msg) => msg.id === message.id);
      if (idx <= 0) {
        toast.error("No previous user message to regenerate");
        return;
      }
      let userMessage: Message | null = null;
      for (let i = idx - 1; i >= 0; i -= 1) {
        const candidate = messages[i];
        if (candidate && candidate.role === "user") {
          userMessage = candidate;
          break;
        }
      }
      if (!userMessage?.content?.trim()) {
        toast.error("No previous user message to regenerate");
        return;
      }
      handleSend(userMessage.content, []);
    },
    [handleSend, isStreaming, messages]
  );

  // Message reactions live in localStorage scoped to the active thread.
  // Thumbs-up = persistent green highlight ("good answer", personal
  // annotation). Thumbs-down = red highlight + immediate regenerate
  // with a rejection-context wrapper, so the agent gets another swing.
  const reactionsThreadKey = activeThreadId
    ? `${activeWorkspaceSlug || "_"}::${activeThreadId}`
    : null;
  const { getReaction, setReaction } = useMessageReactions(reactionsThreadKey);

  const handleThumbsUpMessage = useCallback(
    (message: Message) => {
      const current = getReaction(message.id);
      // Toggle: clicking again clears the reaction.
      setReaction(message.id, current === "up" ? null : "up");
    },
    [getReaction, setReaction],
  );

  const handleThumbsDownMessage = useCallback(
    (message: Message) => {
      if (isStreaming) {
        toast.error(t("messageActions.thumbsDownStreaming", {
          defaultValue: "Wait for the reply to finish before rating.",
        }));
        return;
      }
      // Find the previous user turn so we can re-issue it with a
      // rejection-context wrapper.
      const idx = messages.findIndex((m) => m.id === message.id);
      let userMessage: Message | null = null;
      for (let i = idx - 1; i >= 0; i -= 1) {
        const candidate = messages[i];
        if (candidate && candidate.role === "user") {
          userMessage = candidate;
          break;
        }
      }
      if (!userMessage?.content?.trim()) {
        toast.error(t("messageActions.thumbsDownNoUser", {
          defaultValue: "No previous prompt to retry.",
        }));
        return;
      }
      // Mark the rejected reply persistently so the user can scroll back
      // and see what they previously thumbed-down.
      setReaction(message.id, "down");
      const rejected = (message.content || "").trim().slice(0, 400);
      const wrapped =
        `${userMessage.content}\n\n` +
        `[The previous reply was rejected by the user. Try a different angle.\n` +
        `Rejected reply (truncated): ${rejected}]`;
      handleSend(wrapped, []);
    },
    [getReaction, setReaction, messages, handleSend, isStreaming, t],
  );

  const handleApprovalAction = useCallback(
    async (requestId: string, approved: boolean) => {
      const sessionKey = activeZakiSessionKey || buildAgentSessionKey(activeThreadId || "main", agentUserId);
      if (!sessionKey) {
        toast.error("Agent user ID not yet resolved — try again in a moment");
        return;
      }
      try {
        await approveAgentSession(sessionKey, {
          approved,
          approval_id: requestId,
          tool: nullalisApprovalRequest?.tool,
          reason: approved ? undefined : "User denied from UI",
        });
        decrementSessionApprovalCount(sessionKey, requestId);
        setNullalisApprovalRequest(null);
        await queryClient.invalidateQueries({ queryKey: zakiSessionKeys.all });
        await hydrateActiveSessionDetail(sessionKey);
      } catch (err) {
        console.error("[approval]", err);
        toast.error(approved ? "Failed to send approval" : "Failed to send denial");
        throw err; // re-throw so the card stays in the loading state
      }
    },
    [
      activeThreadId,
      activeZakiSessionKey,
      agentUserId,
      decrementSessionApprovalCount,
      hydrateActiveSessionDetail,
      nullalisApprovalRequest,
      queryClient,
      t,
    ]
  );

  const handleSessionModeChange = useCallback(
    async (mode: AgentSessionMode) => {
      const sessionKey =
        activeZakiSessionKey || buildAgentSessionKey(activeThreadId || "main", agentUserId);
      if (!sessionKey) {
        toast.error(t("zakiControls.errors.sessionNotReady"));
        return;
      }
      const previousMode = activeSessionUi?.mode ?? "execute";
      if (previousMode === mode) return;
      setSessionModePending(true);
      setZakiSessionModeUi(sessionKey, mode);
      try {
        const { response, data } = await setAgentSessionMode(sessionKey, mode);
        if (!response.ok) {
          throw new Error(data?.error || data?.message || t("zakiControls.errors.updateModeFailed"));
        }
        await queryClient.invalidateQueries({ queryKey: zakiSessionKeys.all });
        await hydrateActiveSessionDetail(sessionKey);
      } catch (error) {
        setZakiSessionModeUi(sessionKey, previousMode);
        toast.error(error instanceof Error ? error.message : t("zakiControls.errors.updateModeFailed"));
      } finally {
        setSessionModePending(false);
      }
    },
    [
      activeSessionUi?.mode,
      activeThreadId,
      activeZakiSessionKey,
      agentUserId,
      hydrateActiveSessionDetail,
      queryClient,
      setZakiSessionModeUi,
      t,
    ]
  );

  useEffect(() => {
    const handleApprovalResolved = (event: Event) => {
      const detail = (
        event as CustomEvent<{ sessionKey?: string | null; requestId?: string | null }>
      ).detail;
      const resolvedSessionKey = normalizeZakiSessionKey(String(detail?.sessionKey || ""));
      const currentSessionKey = normalizeZakiSessionKey(
        String(activeZakiSessionKey || buildAgentSessionKey(activeThreadId || "main", agentUserId) || "")
      );
      if (!resolvedSessionKey || resolvedSessionKey !== currentSessionKey) return;
      if (detail?.requestId && nullalisApprovalRequest?.id === detail.requestId) {
        setNullalisApprovalRequest(null);
      }
    };
    window.addEventListener("zaki:approval-resolved", handleApprovalResolved);
    return () => {
      window.removeEventListener("zaki:approval-resolved", handleApprovalResolved);
    };
  }, [activeThreadId, activeZakiSessionKey, agentUserId, nullalisApprovalRequest?.id]);

  // ZakiSessionList per-row share button dispatches this event after
  // navigating to the chosen session. We queue the requested sessionKey
  // and only open the share modal once activeZakiSessionKey matches,
  // so we never share against the previous thread's hydrated state.
  const pendingShareSessionKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ sessionKey?: string } | undefined>)
        .detail;
      const requested = detail?.sessionKey || null;
      if (!requested || requested === activeZakiSessionKey) {
        setShareOpen(true);
      } else {
        pendingShareSessionKeyRef.current = requested;
      }
    };
    window.addEventListener("zaki:open-share", handler);
    return () => window.removeEventListener("zaki:open-share", handler);
  }, [activeZakiSessionKey]);
  useEffect(() => {
    if (
      pendingShareSessionKeyRef.current &&
      activeZakiSessionKey === pendingShareSessionKeyRef.current
    ) {
      pendingShareSessionKeyRef.current = null;
      setShareOpen(true);
    }
  }, [activeZakiSessionKey]);

  // H7: y/n keyboard shortcuts — fire approve/deny when an approval card is visible
  useEffect(() => {
    if (!nullalisApprovalRequest) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable
      )
        return;
      if (e.key === "y" || e.key === "Y") {
        e.preventDefault();
        void handleApprovalAction(nullalisApprovalRequest.id, true);
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        void handleApprovalAction(nullalisApprovalRequest.id, false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [nullalisApprovalRequest, handleApprovalAction]);

  const handleStartChat = useCallback(() => {
    const spaceId = activeWorkspaceSlug ?? primarySpace?.id ?? null;
    if (!spaceId) {
      goToSpaces();
      return;
    }
    window.dispatchEvent(new CustomEvent("zaki:create-thread", { detail: { spaceId } }));
  }, [activeWorkspaceSlug, goToSpaces, primarySpace?.id]);

  // Track previous thread for summarization on switch
  const prevThreadRef = useRef<{ id: string; workspaceSlug: string; title: string } | null>(null);

  // Summarize conversation when leaving a thread
  useEffect(() => {
    const prevThread = prevThreadRef.current;
    
    // If we had a previous thread and we're switching away from it
    if (prevThread && prevThread.id !== activeThreadId && !isZakiBotSpaceId(prevThread.workspaceSlug)) {
      const prevMessages = messagesByThread[prevThread.id];
      
      // Only summarize if there were meaningful messages (at least 2 exchanges)
      if (prevMessages && prevMessages.length >= 4) {
        // Fire and forget - don't block UI
        apiRequest("/api/memory/end-session", {
          method: "POST",
          body: JSON.stringify({
            messages: prevMessages.map((m) => ({ role: m.role, content: m.content })),
            threadId: prevThread.id,
            threadTitle: prevThread.title,
          }),
        })
          .then((response) => {
            if (!response.ok) return;
            pendingSessionSummaryRef.current = {
              threadId: prevThread.id,
              queuedAt: Date.now(),
            };
            window.setTimeout(() => {
              void maybeShowSessionSummaryCue(prevThread.id);
            }, 2500);
            window.setTimeout(() => {
              void maybeShowSessionSummaryCue(prevThread.id);
            }, 7000);
          })
          .catch((err) => {
            console.warn("[Memory] Failed to summarize session:", err);
          });
      }
    }

    // Update the ref with current thread info
    if (activeThreadId && activeWorkspaceSlug) {
      prevThreadRef.current = {
        id: activeThreadId,
        workspaceSlug: activeWorkspaceSlug,
        title: activeThread?.label || "Chat",
      };
    } else {
      prevThreadRef.current = null;
    }
  }, [activeThreadId, activeWorkspaceSlug, activeThread?.label, maybeShowSessionSummaryCue, messagesByThread]);

  // Auto-scroll effect
  useEffect(() => {
    if (scrollRef.current && autoScrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeThreadId, messagesByThread]);

  // Load thread history from React Query
  useEffect(() => {
    if (!activeThreadId || !activeWorkspaceSlug) return;
    if (!historyData || historyLoadedRef.current[activeThreadId]) return;
    if (messagesByThread[activeThreadId]?.length) {
      historyLoadedRef.current[activeThreadId] = true;
      return;
    }

    const cleaned = historyData.map((entry) => ({
      ...entry,
      content: entry.role === "user" ? stripMemoryContext(entry.content ?? "") : (entry.content ?? ""),
    }));

    setMessagesByThread((prev) => ({
      ...prev,
      [activeThreadId]: cleaned,
    }));
    historyLoadedRef.current[activeThreadId] = true;
  }, [activeThreadId, activeWorkspaceSlug, historyData, messagesByThread]);

  useEffect(() => {
    if (!isZakiBotActiveSpace || !activeThreadId || !isAuthReady) {
      setIsBotHistoryLoading(false);
      return;
    }
    if (historyLoadedRef.current[activeThreadId]) {
      setIsBotHistoryLoading(false);
      return;
    }
    if (messagesByThread[activeThreadId]?.length) {
      historyLoadedRef.current[activeThreadId] = true;
      setIsBotHistoryLoading(false);
      return;
    }

    let cancelled = false;
    setIsBotHistoryLoading(true);

    void fetchAgentHistory(ZAKI_BOT_SPACE_ID, activeThreadId, "app")
      .then(({ response, data }) => {
        if (cancelled || !response.ok) return;
        const history = Array.isArray(data.history)
          ? data.history.map((entry: Record<string, unknown>, index: number) => ({
              id: String(entry.id || `bot-history-${index}`),
              role: String(entry.role) === "assistant" ? "assistant" as const : "user" as const,
              content: String(entry.content || ""),
              turnEvents: Array.isArray((entry as { events?: unknown }).events)
                ? ((entry as { events?: unknown }).events as Array<{
                    eventType?: string;
                    payload?: Record<string, unknown>;
                    ts?: number;
                  }>)
                    .filter((e) => typeof e?.eventType === "string")
                    .map((e) => ({
                      eventType: String(e.eventType),
                      payload: (e.payload ?? {}) as Record<string, unknown>,
                      ts: typeof e.ts === "number" ? e.ts : undefined,
                    }))
                : undefined,
            }))
          : [];
        setMessagesByThread((prev) => ({
          ...prev,
          [activeThreadId]: history,
        }));
        historyLoadedRef.current[activeThreadId] = true;
      })
      .catch(() => {
        // Ensure loading clears on error
      })
      .finally(() => {
        if (!cancelled) setIsBotHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeThreadId, isAuthReady, isZakiBotActiveSpace, messagesByThread]);

  // First message transition effect
  useEffect(() => {
    if (messages.length === 1 && prevMessageCount.current === 0) {
      setFirstMessageTransition(true);
      const timeout = window.setTimeout(() => {
        setFirstMessageTransition(false);
      }, 420);
      prevMessageCount.current = messages.length;
      return () => window.clearTimeout(timeout);
    }
    prevMessageCount.current = messages.length;
  }, [messages.length]);

  // Input offset effect
  useEffect(() => {
    const updateOffset = () => {
      if (!showReady || showSpacesView || showSpaceDetail || activeThreadId) {
        setInputOffset(0);
        return;
      }
      const container = containerRef.current;
      const input = inputWrapRef.current;
      if (!container || !input) return;
      const containerRect = container.getBoundingClientRect();
      const inputRect = input.getBoundingClientRect();
      const currentTop = inputRect.top - containerRect.top;
      const readyRect = readyRef.current?.getBoundingClientRect();
      if (!readyRect) return;
      const readyBottom = readyRect.bottom - containerRect.top;
      const gap = 12;
      setInputOffset(readyBottom + gap - currentTop);
    };

    const frame = window.requestAnimationFrame(updateOffset);
    window.addEventListener("resize", updateOffset);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateOffset);
    };
  }, [showReady, showSpacesView, showSpaceDetail, activeThreadId]);

  // Track input height to pad chat list (ChatGPT-style spacing)
  useEffect(() => {
    const inputEl = inputWrapRef.current;
    if (!inputEl) return;
    if (typeof ResizeObserver === "undefined") {
      // Fallback: single measurement without observing
      measureInputMetrics();
      return;
    }
    measureInputMetrics();
    const observer = new ResizeObserver(measureInputMetrics);
    observer.observe(inputEl);
    window.addEventListener("resize", measureInputMetrics);
    window.addEventListener("scroll", measureInputMetrics, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measureInputMetrics);
      window.removeEventListener("scroll", measureInputMetrics, true);
    };
  }, [measureInputMetrics]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(measureInputMetrics);
    return () => window.cancelAnimationFrame(frame);
  }, [
    measureInputMetrics,
    inputOffset,
    showReady,
    showSpacesView,
    showSpaceDetail,
    activeThreadId,
  ]);

  // Click outside menu effect
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Event listeners for spaces data and navigation
  useEffect(() => {
    window.dispatchEvent(new Event("zaki:request-spaces"));

    const handleClearThread = () => {
      clearThread();
      setAttachments([]);
    };

    const handleViewSpaces = () => {
      goToSpaces();
      setAttachments([]);
    };

    const handleSpacesData = (event: Event) => {
      const detail = (event as CustomEvent<{ spaces: Space[] }>).detail;
      setSpacesList(detail?.spaces ?? []);
    };

    const handleRenameThread = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; label: string }>).detail;
      if (!detail?.id || !detail?.label) return;
      setSpacesList((prev) =>
        prev.map((space) => ({
          ...space,
          threads: (space.threads ?? []).map((thread) =>
            thread.id === detail.id ? { ...thread, label: detail.label } : thread
          ),
        }))
      );
    };

    const handleOpenCreateSpace = () => {
      setCreateSpaceInitialValues(null);
      setCreateSpaceOpen(true);
    };

    const handleCreateSpaceFromTemplate = (event: Event) => {
      const detail = (event as CustomEvent<{
        name?: string;
        description?: string;
        instructions?: string;
      }>).detail;
      setCreateSpaceInitialValues(detail ?? null);
      setCreateSpaceOpen(true);
    };

    const handleViewSpace = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string }>).detail;
      if (detail?.id) {
        window.dispatchEvent(new CustomEvent("zaki:create-thread", { detail: { spaceId: detail.id } }));
      }
      setAttachments([]);
    };

    const handleEditSpaceInstructions = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string }>).detail;
      const selected = spacesList.find((space) => space.id === detail?.id);
      if (!selected) return;
      setEditSpaceId(selected.id);
      setEditInstructionsValue(selected.instructions ?? "");
      setEditInstructionsOpen(true);
    };

    const handleUploadSpaceFiles = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string }>).detail;
      if (!detail?.id) return;
      beginWorkspaceUpload(detail.id);
    };

    const handleUploadActiveSpaceFiles = () => {
      beginWorkspaceUpload();
    };

    const handleViewZakiHome = () => {
      goHome();
      setAttachments([]);
    };

    window.addEventListener("zaki:clear-thread", handleClearThread);
    window.addEventListener("zaki:view-spaces", handleViewSpaces);
    window.addEventListener("zaki:spaces-data", handleSpacesData);
    window.addEventListener("zaki:rename-thread", handleRenameThread);
    window.addEventListener("zaki:open-create-space", handleOpenCreateSpace);
    window.addEventListener("zaki:create-space-from-template", handleCreateSpaceFromTemplate);
    window.addEventListener("zaki:view-space", handleViewSpace);
    window.addEventListener("zaki:edit-space-instructions", handleEditSpaceInstructions);
    window.addEventListener("zaki:upload-space-files", handleUploadSpaceFiles);
    window.addEventListener("zaki:upload-active-space-files", handleUploadActiveSpaceFiles);
    window.addEventListener("zaki:view-zaki-home", handleViewZakiHome);

    return () => {
      window.removeEventListener("zaki:clear-thread", handleClearThread);
      window.removeEventListener("zaki:view-spaces", handleViewSpaces);
      window.removeEventListener("zaki:spaces-data", handleSpacesData);
      window.removeEventListener("zaki:rename-thread", handleRenameThread);
      window.removeEventListener("zaki:open-create-space", handleOpenCreateSpace);
      window.removeEventListener("zaki:create-space-from-template", handleCreateSpaceFromTemplate);
      window.removeEventListener("zaki:view-space", handleViewSpace);
      window.removeEventListener("zaki:edit-space-instructions", handleEditSpaceInstructions);
      window.removeEventListener("zaki:upload-space-files", handleUploadSpaceFiles);
      window.removeEventListener("zaki:upload-active-space-files", handleUploadActiveSpaceFiles);
      window.removeEventListener("zaki:view-zaki-home", handleViewZakiHome);
    };
  }, [beginWorkspaceUpload, clearThread, goHome, goToSpaces, spacesList]);

  useEffect(() => {
    return () => {
      if (autoDismissTimerRef.current) {
        window.clearTimeout(autoDismissTimerRef.current);
      }
      if (zakiBotProcessClearTimerRef.current) {
        window.clearTimeout(zakiBotProcessClearTimerRef.current);
        zakiBotProcessClearTimerRef.current = null;
      }
      streamAbortRef.current?.abort();
    };
  }, []);

  // Render main content based on view
  const renderContent = () => {
    if (showSpacesView) {
      return (
        <SpacesView
          spacesList={spacesList}
          onCreateSpace={() => setCreateSpaceOpen(true)}
          onViewSpace={(id) => {
            if (!authUserId) {
              const existingThreadId =
                spacesList.find((space) => space.id === id)?.threads?.[0]?.id ??
                createAnonymousThreadId();
              goToThread(id, existingThreadId);
              navigate(`/spaces/${encodeURIComponent(id)}/threads/${encodeURIComponent(existingThreadId)}`);
              return;
            }
            window.dispatchEvent(new CustomEvent("zaki:view-space", { detail: { id } }));
          }}
        />
      );
    }

    if (showAbout) {
      return (
        <ZakiHomeView
          primarySpace={primarySpace}
          onSendExample={(example) => handleSend(example, [])}
          onGoToThread={goToThread}
          onDeleteThread={(threadId, spaceId) => {
            window.dispatchEvent(new CustomEvent("zaki:delete-thread", { detail: { id: threadId, spaceId } }));
          }}
        />
      );
    }

    if (showZakiHome) {
      if (sidebarMode === "zaki") {
        return (
          <ZakiDashboard
            onSendExample={(example) => handleSend(example, [])}
            heroActive={heroCardActive}
            onHeroTypeIntro={() => {
              setOnboardingStage("welcome", "done");
              setZakiBootstrapCompleted(true);
              if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("zaki:focus-composer"));
              }
            }}
            onHeroOpenImport={() => setMemoryImportOpen(true)}
            onHeroDismiss={() => {
              setOnboardingStage("welcome", "skipped");
              setZakiBootstrapCompleted(true);
            }}
          />
        );
      }
      return (
        <ZakiHomeView
          primarySpace={primarySpace}
          onSendExample={(example) => handleSend(example, [])}
          onGoToThread={goToThread}
          onDeleteThread={(threadId, spaceId) => {
            window.dispatchEvent(new CustomEvent("zaki:delete-thread", { detail: { id: threadId, spaceId } }));
          }}
        />
      );
    }

    if (showReady) {
      return (
        <ReadyState
          ref={readyRef}
          onStartChat={handleStartChat}
        />
      );
    }

    const zakiStreamingModeVariant =
      isZakiBotActiveSpace && zakiBotProcessSnapshot.isReplyReplay
        ? "final_reply_reveal"
        : "thinking";
    const zakiStreamingBadgeLabel = isZakiBotActiveSpace
      ? zakiBotProcessSnapshot.isCacheHit
        ? isRtl
          ? "استجابة مخزنة"
          : "Cache hit"
        : zakiBotProcessSnapshot.isReplyReplay
          ? isRtl
            ? "الرد النهائي"
            : "Final reply"
          : undefined
      : undefined;
    const zakiStreamingHelperText =
      isZakiBotActiveSpace && zakiBotProcessSnapshot.isReplyReplay
        ? isRtl
          ? "الإجابة جاهزة"
          : "Answer is ready"
        : undefined;

    const replayTimelines: Record<string, NullalisTranscriptEntry[]> = {};
    if (isZakiBotActiveSpace) {
      for (const m of messages) {
        if (m.role !== "assistant") continue;
        const snapshot = localTurnSnapshots[m.id];
        if (snapshot && snapshot.length) {
          replayTimelines[m.id] = snapshot;
          continue;
        }
        const events = (m as { turnEvents?: Array<{ eventType: string; payload: Record<string, unknown>; ts?: number }> })
          .turnEvents;
        if (!Array.isArray(events) || events.length === 0) continue;
        const entries: NullalisTranscriptEntry[] = [];
        for (const e of events) {
          const ts = typeof e.ts === "number" ? e.ts : Date.now();
          const entry = extractNullalisTranscriptEntry(e.eventType, e.payload ?? {}, ts);
          if (entry) entries.push(entry);
        }
        if (entries.length) replayTimelines[m.id] = entries;
      }
    }

    return (
      <ChatView
        messages={messages}
        replayTimelines={replayTimelines}
        isHistoryLoading={isHistoryLoading || (isZakiBotActiveSpace && isBotHistoryLoading)}
        isStreaming={isStreaming}
        streamingLabel={
          streamingIndicatorMode === "researching"
            ? t("chat.researching")
            : streamingIndicatorMode === "writing"
              ? (isRtl ? "يكتب" : "Writing")
              : t("chat.thinking")
        }
        streamingPillLabel={
          isZakiBotActiveSpace && zakiBotReplyStart?.streamKind === "final_reply"
            ? isRtl
              ? "الرد النهائي"
              : "Final reply"
            : streamingIndicatorMode === "researching"
              ? t("chat.researching")
              : undefined
        }
        streamingBadgeLabel={zakiStreamingBadgeLabel}
        streamingHelperText={zakiStreamingHelperText}
        streamingModeVariant={zakiStreamingModeVariant}
        botReplyStart={isZakiBotActiveSpace ? zakiBotReplyStart : null}
        nullalisMode={isZakiBotActiveSpace}
        nullalisNarrationFrame={isZakiBotActiveSpace ? nullalisNarrationFrame : null}
        nullalisTranscriptEntries={isZakiBotActiveSpace ? nullalisTranscriptEntries : []}
        nullalisTaskItems={isZakiBotActiveSpace ? nullalisTaskItems : []}
        nullalisApprovalRequest={isZakiBotActiveSpace ? nullalisApprovalRequest : null}
        contextGaugeData={isZakiBotActiveSpace ? nullalisContextGauge : null}
        zakiUsageSummary={isZakiBotActiveSpace ? zakiUsageSummary : null}
        botMode={isZakiBotActiveSpace}
        firstMessageTransition={firstMessageTransition}
        turnStartedAt={turnStartedAt}
        turnDurationMs={turnDurationMs}
        onCopyMessage={handleCopyMessage}
        onRegenerateMessage={handleRegenerateMessage}
        onThumbsUpMessage={handleThumbsUpMessage}
        onThumbsDownMessage={handleThumbsDownMessage}
        getReaction={getReaction}
        onQuickReply={(prefill) => {
          // S1 — one-click follow-up. Route through the composer handle
          // (not handleSend directly) so the per-turn toggles, drafts,
          // and attachments all reset uniformly with a normal send.
          if (isZakiBotSendLocked) return;
          composerHandleRef.current?.submitWith(prefill);
        }}
        isRtl={isRtl}
      />
    );
  };

  return (
    <div
      ref={containerRef}
      className="zaki-chat flex-1 relative flex min-h-0 flex-col h-full bg-transparent overflow-x-hidden"
      style={
        {
          "--zaki-input-height": `${inputHeight}px`,
          "--zaki-input-offset": `${inputOffset}px`,
          "--zaki-input-left": `${inputLeft}px`,
          "--zaki-input-width": `${inputWidth}px`,
        } as CSSProperties
      }
      onDragEnter={(event) => {
        event.preventDefault();
        dragCounter.current += 1;
        setDragActive(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        dragCounter.current -= 1;
        if (dragCounter.current <= 0) {
          setDragActive(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragCounter.current = 0;
        setDragActive(false);
        const files = Array.from(event.dataTransfer.files ?? []);
        if (files.length) {
          const targetSpaceId = activeWorkspaceSlug ?? primarySpace?.id ?? null;
          if (!targetSpaceId) {
            toast.error(isRtl ? "اختر مساحة أولًا لإضافة الملفات." : "Select a space before adding files.");
            return;
          }
          if (targetSpaceId === ZAKI_BOT_SPACE_ID) {
            // Route to InputArea attachments (chat-level) instead of workspace grounding
            setAttachments((prev) => [...prev, ...files]);
            return;
          }
          handleWorkspaceFilesSelected(targetSpaceId, files);
        }
      }}
    >
      {/* Drag overlay */}
      {dragActive && (
        <div className="absolute inset-0 z-30 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
          <div className="rounded-zaki-lg border border-zaki bg-white px-5 py-3 text-sm text-zaki-secondary shadow-[0px_10px_24px_rgba(15,15,15,0.12)]">
            {chatCopy.dragPrompt}
          </div>
        </div>
      )}

      <div className="relative h-full rounded-none border-0 bg-transparent overflow-hidden flex flex-col">
        {/* Background */}
        <BackgroundPattern />

        <div className="relative z-20 flex flex-col h-full">
          {/* Header / Breadcrumb */}
          {!showZakiHome && !showSpacesView ? (
            <div className="px-6 py-4 flex items-center gap-2" dir="ltr">
              <span
                className="zaki-subheader-pill"
                dir={isRtl ? "rtl" : "ltr"}
                title={`${headerSpaceName} / ${headerThreadName}`}
              >
                {headerSpaceName}
                <span className="text-zaki-muted">/</span>
                {headerThreadName}
              </span>
              <SandboxBadge
                active={isZakiBotActiveSpace}
                sandbox={sandboxState}
                className="ml-2"
              />
              <div className="relative z-30 ml-auto flex items-center gap-2" ref={menuRef}>
                <button
                  type="button"
                  className="zaki-share-pill inline-flex items-center gap-2 rounded-full border border-zaki-subtle bg-white/80 px-3 py-1.5 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
                  onClick={handleShare}
                  aria-label={chatCopy.shareConversationAria}
                >
                  <Share2 className="size-4 text-zaki-muted" />
                  {chatCopy.shareConversation}
                </button>
                <button
                  type="button"
                  className="size-11 md:size-8 rounded-full border border-zaki-subtle bg-white/80 flex items-center justify-center text-zaki-muted hover:bg-zaki-hover transition-colors focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label={chatCopy.moreOptionsAria}
                >
                  <MoreVertical className="size-4" />
                </button>
                {menuOpen && (
                  <div
                    className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-zaki-lg border border-zaki-subtle bg-white shadow-[0px_14px_30px_rgba(15,15,15,0.12)] p-1"
                    role="menu"
                  >
                    <button
                      type="button"
                      className="w-full cursor-pointer rounded-zaki-md px-3 py-2.5 text-left text-sm text-zaki-primary hover:bg-zaki-hover transition-colors focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        openMemoryViewer();
                      }}
                      aria-label={chatCopy.reviewMemoriesAria}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                          <Brain className="size-4 shrink-0 text-zaki-muted" />
                          <span className="truncate">{chatCopy.reviewMemories}</span>
                        </span>
                        {memoryPendingCount + memoryConflictCount > 0 ? (
                          <span className="shrink-0 bg-zaki-brand text-white text-xs px-2 py-0.5 rounded-full">
                            {memoryPendingCount + memoryConflictCount}
                          </span>
                        ) : null}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="w-full cursor-pointer rounded-zaki-md px-3 py-2.5 text-left text-sm text-zaki-primary hover:bg-zaki-hover transition-colors focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
                      role="menuitem"
                      onClick={handleExport}
                      aria-label={chatCopy.exportJsonAria}
                    >
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <Download className="size-4 shrink-0 text-zaki-muted" />
                        <span>{chatCopy.exportJson}</span>
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
	          ) : (
	            <div className="h-[64px]" aria-hidden="true" />
	          )}

          {/* C5: System notices — rendered here so they appear on ALL views
              (home, spaces, chat, brain) regardless of which view is active */}
          <SystemNoticesStack className="-mb-2" />

          {/* Main Content */}
          <div
            className="flex-1 relative z-10 overflow-y-auto overflow-x-hidden overscroll-y-contain zaki-scrollbar-fade"
            ref={scrollRef}
            style={{
              paddingBottom:
                !showZakiHome && !showSpacesView && !showSpaceDetail
                  ? Math.max(24, inputHeight + 24)
                  : undefined,
              WebkitOverflowScrolling: "touch",
            }}
            onScroll={() => {
              if (!scrollRef.current) return;
              if (scrollRafRef.current) return;
              scrollRafRef.current = window.requestAnimationFrame(() => {
                if (!scrollRef.current) return;
                const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
                const atBottom = scrollTop + clientHeight >= scrollHeight - 48;
                autoScrollRef.current = atBottom;
                setShowScrollToBottom(scrollHeight - clientHeight > 120 && !atBottom);
                scrollRafRef.current = null;
              });
            }}
          >
            {renderContent()}
          </div>

          {showScrollToBottom && !showZakiHome && !showSpacesView && !showSpaceDetail && (
            <div
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 z-30"
              style={{ bottom: Math.max(24, inputHeight + 24 + inputOffset) + 20 }}
            >
              <button
                type="button"
                className="pointer-events-auto size-10 rounded-full border border-zaki-subtle bg-white/90 text-zaki-muted hover:text-zaki-primary hover:bg-zaki-hover shadow-[0px_10px_24px_rgba(15,15,15,0.16)] transition-colors"
                onClick={() => {
                  const el = scrollRef.current;
                  if (!el) return;
                  el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
                  autoScrollRef.current = true;
                  setShowScrollToBottom(false);
                }}
                aria-label={chatCopy.scrollToBottomAria}
              >
                <ChevronDown className="size-5 mx-auto" />
              </button>
            </div>
          )}

          {/* Input Area */}
          {!showAbout && !showSpacesView && !showSpaceDetail && (
            <div
              ref={inputWrapRef}
              className="zaki-input-float relative z-20"
              style={{ transform: `translateY(${inputOffset}px)` }}
            >
              <ZakiExperimentalNotice
                active={isZakiBotActiveSpace && zakiBootstrapCompleted}
              />
              {/* Single source of truth for ApprovalRequiredCard. The
                  timeline copy was dropped in 18328cd so the decided
                  state has one owner. Surfaces directly above the
                  composer where the user's attention is. */}
              {isZakiBotActiveSpace && nullalisApprovalRequest ? (
                <div className="px-1 pb-2">
                  <ApprovalRequiredCard
                    request={nullalisApprovalRequest}
                    onApprove={handleApprovalAction ? (id) => handleApprovalAction(id, true) : undefined}
                    onDeny={handleApprovalAction ? (id) => handleApprovalAction(id, false) : undefined}
                  />
                </div>
              ) : null}
              <InputArea
                composerHandleRef={composerHandleRef}
                onSend={handleSend}
                onCompact={handleCompactSession}
                isCompacting={isCompacting}
                agentUserId={isZakiBotActiveSpace ? agentUserId : null}
                attachments={attachments}
                setAttachments={setAttachments}
                isSending={isStreaming}
                onStop={handleStopStreaming}
                queryModeEnabled={queryModeEnabled}
                onToggleQueryMode={() => setQueryModeEnabled((prev) => !prev)}
                webSearchArmed={webSearchArmed}
                onToggleWebSearch={() => setWebSearchArmed((prev) => !prev)}
                // 2026-05-08 — Hide on the ZAKI landing/home view per
                // Nova: the upsell pill bolted above the textarea was
                // visual noise on the splash. Keep it only in real
                // workspace chats where the slot is otherwise empty.
                showUpgradeStrip={!isZakiBotActiveSpace && !showZakiHome}
                sendLocked={isZakiBotSendLocked}
                zakiBotMode={isZakiBotActiveSpace}
                threadKey={
                  activeThreadId
                    ? `${activeWorkspaceSlug || "_"}::${activeThreadId}`
                    : null
                }
                lastUserMessage={
                  (() => {
                    for (let i = messages.length - 1; i >= 0; i--) {
                      const m = messages[i];
                      if (m && m.role === "user" && typeof m.content === "string" && m.content.trim()) {
                        return m.content;
                      }
                    }
                    return null;
                  })()
                }
                zakiMode={activeSessionMode ?? "execute"}
                onZakiModeChange={isZakiBotActiveSpace ? handleSessionModeChange : undefined}
                zakiModePending={isZakiBotActiveSpace ? sessionModePending : false}
                zakiContextPressurePercent={
                  isZakiBotActiveSpace
                    ? activeSessionUi?.contextPressurePercent ??
                      activeSessionRecord?.context_pressure_percent ??
                      null
                    : null
                }
                quotaBadge={
                  zakiBotQuotaInfo
                    ? {
                        label:
                          zakiBotQuotaInfo.remaining <= 0
                            ? chatCopy.quotaBadgeDanger
                            : zakiBotQuotaInfo.remaining <= 2
                              ? chatCopy.quotaBadgeWarning
                              : chatCopy.quotaBadgeNeutral,
                        tone:
                          zakiBotQuotaInfo.remaining <= 0
                            ? "danger"
                            : zakiBotQuotaInfo.remaining <= 2
                              ? "warning"
                              : "neutral",
                      }
                    : null
                }
              />
            </div>
          )}

          {/* Hidden file input for space files */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept={Object.values(acceptedWorkspaceTypes).flat().join(",")}
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (botAttachmentPickRef.current) {
                botAttachmentPickRef.current = false;
                if (files.length) {
                  setAttachments((prev) => [...prev, ...files]);
                }
                event.target.value = "";
                return;
              }
              const targetSpaceId = fileUploadSpaceId;
              setFileUploadSpaceId(null);
              event.target.value = "";
              if (!targetSpaceId || files.length === 0) return;
              handleWorkspaceFilesSelected(targetSpaceId, files);
            }}
          />
        </div>
      </div>

      {/* Modals */}
      <EditInstructionsModal
        isOpen={editInstructionsOpen}
        initialValue={editInstructionsValue}
        onClose={() => {
          setEditInstructionsOpen(false);
          setEditSpaceId(null);
        }}
        onSave={(instructions) => {
          if (editSpaceId) {
            window.dispatchEvent(
              new CustomEvent("zaki:update-space", {
                detail: { id: editSpaceId, instructions },
              })
            );
          }
        }}
      />

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        workspaceSlug={activeWorkspaceSlug || ""}
        threadSlug={activeThreadId || ""}
        threadTitle={headerThreadName}
        messages={messages}
      />

      <MemoryImportSheet
        isOpen={memoryImportOpen}
        onClose={() => setMemoryImportOpen(false)}
        onImport={async (dump) => {
          setOnboardingStage("welcome", "done");
          setZakiBootstrapCompleted(true);
          handleSend(dump, []);
        }}
      />

      {sidebarMode === "zaki" ? (
        <OnboardingTour
          progress={onboardingProgress}
          setStage={setOnboardingStage}
          gates={{
            compactionArmed: (() => {
              const g = nullalisContextGauge;
              if (!g || !g.tokenCount || !g.contextMax) return false;
              return g.tokenCount / g.contextMax >= 0.6;
            })(),
            // Brain panel tooltip anchors at the dashboard's brain
            // entry. Only fire when both the anchor is in the DOM
            // (showZakiHome === true) and the user has enough memories
            // to make the nudge meaningful.
            brainPanelEligible: showZakiHome && onboardingBrainCount >= 5,
          }}
        />
      ) : null}

      <CreateSpaceModal
        isOpen={createSpaceOpen}
        initialValues={createSpaceInitialValues}
        onClose={() => {
          setCreateSpaceOpen(false);
          setCreateSpaceInitialValues(null);
        }}
        onCreate={(data) => {
          window.dispatchEvent(
            new CustomEvent("zaki:create-space", { detail: data })
          );
          setCreateSpaceInitialValues(null);
        }}
      />

      {showMemoryToast && authUserId && (
        <MemoryCaptureToast
          position={toastPosition}
          tone={memoryToastMode}
          savedCount={recentSavedMemories.length}
          reviewCount={recentReviewCount}
          conflictCount={recentConflictCount}
          processing={isUndoingMemoryToast}
          onUndo={
            recentSavedMemories.length > 0
              ? async () => {
                  if (isUndoingMemoryToast) return;
                  setIsUndoingMemoryToast(true);
                  setMemoryToastUndoError(null);
                  setMemoryToastPartialUndoCount(0);
                  try {
                    const results = await Promise.allSettled(
                      recentSavedMemories.map((memory) =>
                        apiRequest(`/api/memory/undo/${memory.id}`, {
                          method: "POST",
                        }).then(async (response) => {
                          let data: { success?: boolean; error?: string | null } | null = null;
                          try {
                            data = (await response.json()) as {
                              success?: boolean;
                              error?: string | null;
                            };
                          } catch {
                            data = null;
                          }
                          return {
                            id: memory.id,
                            ok: response.ok && data?.success !== false,
                            error:
                              typeof data?.error === "string" && data.error.trim()
                                ? data.error.trim()
                                : null,
                          };
                        })
                      )
                    );

                    const failedIds = new Set<string>();
                    let firstError: string | null = null;
                    for (const result of results) {
                      if (result.status === "fulfilled" && result.value.ok) continue;
                      if (result.status === "fulfilled") {
                        failedIds.add(result.value.id);
                        if (!firstError && result.value.error) {
                          firstError = result.value.error;
                        }
                        continue;
                      }
                      if (!firstError && result.reason instanceof Error) {
                        firstError = result.reason.message;
                      }
                    }

                    if (failedIds.size === 0) {
                      if (recentReviewCount > 0 || recentConflictCount > 0) {
                        setRecentSavedMemories([]);
                        setMemoryToastMode(
                          recentConflictCount > 0 ? "conflict" : recentReviewCount > 0 ? "review" : "saved"
                        );
                        setShowMemoryToast(true);
                        clearMemoryToastDismiss();
                      } else {
                        dismissMemoryToast();
                      }
                      requestMemoryStatusSync(false, true);
                      return;
                    }

                    const failedMemories = recentSavedMemories.filter((memory) => failedIds.has(memory.id));
                    const partialUndoCount = recentSavedMemories.length - failedMemories.length;
                    setRecentSavedMemories(failedMemories);
                    setMemoryToastPartialUndoCount(partialUndoCount);
                    setMemoryToastUndoError(
                      firstError ||
                        t(
                          partialUndoCount > 0
                            ? "memory.undoPartialError"
                            : "memory.undoFailed"
                        )
                    );
                    setShowMemoryToast(
                      failedMemories.length > 0 || recentReviewCount > 0 || recentConflictCount > 0
                    );
                    requestMemoryStatusSync(false, true);
                  } finally {
                    setIsUndoingMemoryToast(false);
                  }
                }
              : undefined
          }
          onOpenMemory={() => {
            dismissMemoryToast();
            openMemoryViewer();
          }}
          onReview={() => {
            dismissMemoryToast();
            openMemoryViewer(
              undefined,
              memoryToastMode === "conflict" || recentConflictCount > 0 ? "conflicts" : "pending"
            );
          }}
          onDismiss={dismissMemoryToast}
          undoError={memoryToastUndoError}
          partialUndoCount={memoryToastPartialUndoCount}
        />
      )}

      {memoryError && (
        <div
          className="fixed z-50"
          aria-live="polite"
          style={{
            left: toastPosition.left,
            width: toastPosition.width,
            bottom: toastPosition.bottom + 36,
          }}
        >
          <div className="rounded-full border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card px-3 py-1.5 text-2xs text-zaki-secondary dark:text-zaki-dark-subtle shadow-[0px_8px_20px_rgba(15,15,15,0.08)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-zaki-brand/10 text-zaki-brand text-[10px] font-semibold">
                !
              </span>
              <span>{memoryError}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-zaki-brand font-semibold hover:underline"
                  onClick={() => {
                    const last = lastMemoryRequestRef.current;
                    if (last) {
                      checkForSavedMemories(last.message, last.threadId);
                    }
                    setMemoryError(null);
                  }}
              >
                Retry
              </button>
              <button
                type="button"
                className="text-zaki-muted dark:text-zaki-dark-muted font-medium hover:underline"
                onClick={() => setMemoryError(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
