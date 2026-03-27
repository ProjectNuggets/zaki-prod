import { BackgroundPattern } from "./BackgroundPattern";
import { InputArea } from "./InputArea";
import { Share2, MoreVertical, Download, Brain, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import {
  apiRequest,
  buildApiUrl,
  captureMemory,
  fetchMemoryActivity,
  fetchAgentHistory,
  fetchUsageQuota,
  getApiBase,
  provisionAgent,
  type MemoryActivity,
  type MemoryCaptureResponse,
  type UsageQuotaSurface,
} from "@/lib/api";
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
} from "./chat";
import type { BotToolCall } from "./chat/BotToolCallBlock";
import type { BotStatusEvent } from "./chat/BotStatusRail";

import { useNavigationStore, useAuthStore } from "@/stores";
import { ShareModal } from "./ShareModal";
import { toast } from "sonner";
import type { PinnedFile, Space, Message } from "@/types";
import { useMessages } from "@/queries/useThreads";
import { MemoryCaptureToast } from "./memory/MemoryCaptureToast";
import { ZakiExperimentalNotice } from "./ZakiExperimentalNotice";
import {
  ZakiBootstrapCard,
  hasSeenZakiBootstrapCard,
} from "./ZakiBootstrapCard";
import {
  createZakiBotThread,
  isZakiBotSpaceId,
  ZAKI_BOT_LABEL,
  ZAKI_BOT_SPACE_ID,
  ZAKI_BOT_THREAD_ID,
} from "@/lib/zakiBot";
import {
  getActivationProgress,
  markFirstMemorySaved,
  markFirstMessageSent,
  type ActivationProgress,
} from "@/lib/retention";

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

function inferStreamingModeFromContext(rawValue: string): "thinking" | "researching" | "writing" {
  const normalized = String(rawValue || "").trim().toLowerCase();
  if (!normalized) return "thinking";
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

function extractProgressPayload(payload: Record<string, unknown>) {
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
  if (!text && !phase && !state && !tool) return null;
  return { phase, state, label, tool, iteration, durationMs, text: text || null };
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
  const okRaw = source.ok;
  const ok =
    okRaw === true ||
    (okRaw !== false && typeof source.error !== "string");
  const error = typeof source.error === "string" ? source.error : undefined;
  const result = source.result;
  return { requestId, ok, error, result };
}

export function ChatArea() {
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
        ? `وصلت إلى حد الاستخدام التجريبي المجاني اليوم. الاستخدام المجاني يُعاد يوميًا وقد يتغير حسب الضغط وتعقيد الطلب. جرّب مرة أخرى بعد ${resetLabel}.`
        : `You reached today's free experimental limit. Free usage resets daily and can vary with traffic and prompt complexity. Try again after ${resetLabel}.`,
    appFreeLimitReached: (resetLabel: string) =>
      isRtl
        ? `وصلت إلى حد الاستخدام المجاني اليوم. يتم إعادة التعيين يوميًا. جرّب مرة أخرى بعد ${resetLabel}.`
        : `You reached today's free limit. Free usage resets daily. Try again after ${resetLabel}.`,
    quotaBadgeNeutral: isRtl ? "وصول تجريبي يومي" : "Daily experimental access",
    quotaBadgeWarning: isRtl ? "الاستخدام المجاني محدود" : "Limited free usage",
    quotaBadgeDanger: isRtl ? "تم بلوغ الحد التجريبي اليوم" : "Today's experimental limit reached",
  };
  useAuthStore(); // For auth context, values used elsewhere
  const {
    view,
    threadId: activeThreadId,
    spaceId: activeWorkspaceSlug,
    goHome,
    goToSpaces,
    goToThread,
    clearThread,
  } = useNavigationStore();

  // View states
  const showZakiHome = view === "home";
  const showSpacesView = view === "spaces";
  const showSpaceDetail = false;

  // Message state
  const [messagesByThread, setMessagesByThread] = useState<Record<string, Message[]>>({});
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingIndicatorMode, setStreamingIndicatorMode] = useState<"thinking" | "researching" | "writing">("thinking");
  const [zakiBotToolCalls, setZakiBotToolCalls] = useState<BotToolCall[]>([]);
  const [zakiBotStatusEvents, setZakiBotStatusEvents] = useState<BotStatusEvent[]>([]);
  const [zakiBotProgressTerminalReason, setZakiBotProgressTerminalReason] = useState<
    "done" | "error" | "abort" | "stream_end" | null
  >(null);
  const [zakiBotHistoryMode] = useState<"merged" | "app">("merged");
  const [zakiBotHistorySource, setZakiBotHistorySource] = useState<string>("");
  const [freeDailyQuota, setFreeDailyQuota] = useState<{
    unlimited: boolean;
    limit: number | null;
    used: number;
    remaining: number | null;
    resetAt: string | null;
    surface: UsageQuotaSurface;
    bucket: string | null;
  } | null>(null);
  const [responseFormattingConfig, setResponseFormattingConfig] =
    useState<ResponseFormattingConfig>(() => readResponseFormattingConfig());
  const historyLoadedRef = useRef<Record<string, boolean>>({});
  const [firstMessageTransition, setFirstMessageTransition] = useState(false);
  const [queryModeEnabled, setQueryModeEnabled] = useState(false);
  const [webSearchArmed, setWebSearchArmed] = useState(false);
  const streamAbortRef = useRef<AbortController | null>(null);
  const zakiBotProcessClearTimerRef = useRef<number | null>(null);
  const zakiBotProvisionedRef = useRef(false);
  const zakiBotProvisionPromiseRef = useRef<Promise<boolean> | null>(null);

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
  const authUser = useAuthStore((s) => s.user);
  const authUserId = useMemo(() => {
    const fallbackEmail =
      typeof authUser === "object" && authUser !== null
        ? String((authUser as { email?: string }).email || "")
        : "";
    return String(authUser?.username || fallbackEmail).trim().toLowerCase();
  }, [authUser]);
  const [zakiBootstrapCompleted, setZakiBootstrapCompleted] = useState(() =>
    authUserId ? hasSeenZakiBootstrapCard(authUserId) : true
  );
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
  }, []);

  // UI state
  const [dragActive, setDragActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
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
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const dragCounter = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const prevMessageCount = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRafRef = useRef<number | null>(null);

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
  const headerSpaceName = activeSpace?.title || chatCopy.spaceFallback;
  const headerThreadName = activeThread?.label || chatCopy.newChat;

  useEffect(() => {
    if (!isZakiBotActiveSpace || !authUserId) {
      setZakiBootstrapCompleted(true);
      return;
    }
    setZakiBootstrapCompleted(hasSeenZakiBootstrapCard(authUserId));
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
        toast.error(chatCopy.botUploadUnavailable);
        return;
      }
      setFileUploadSpaceId(resolvedSpaceId);
      fileInputRef.current?.click();
    },
    [activeWorkspaceSlug, chatCopy.botUploadUnavailable, isRtl, primarySpace?.id]
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
    isZakiBotActiveSpace ? null : activeWorkspaceSlug,
    isZakiBotActiveSpace ? null : activeThreadId
  );
  const [isBotHistoryLoading, setIsBotHistoryLoading] = useState(false);

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

  const clearZakiBotProgressVisuals = useCallback(() => {
    if (zakiBotProcessClearTimerRef.current) {
      window.clearTimeout(zakiBotProcessClearTimerRef.current);
      zakiBotProcessClearTimerRef.current = null;
    }
    setZakiBotToolCalls([]);
    setZakiBotStatusEvents([]);
    setZakiBotProgressTerminalReason(null);
  }, []);

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
      }
    },
    [clearZakiBotProgressVisuals, isZakiBotActiveSpace]
  );

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
      const { requestId, ok, error, result } = extractToolResultPayload(payload);
      setZakiBotProgressTerminalReason(null);
      setZakiBotToolCalls((prev) => {
        if (!prev.length) return prev;
        const next = [...prev];
        let targetIndex = -1;
        if (requestId) {
          targetIndex = next.findIndex((call) => call.requestId === requestId);
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
        const durationMs = Math.max(0, finishedAt - existingCall.startedAt);
        next[targetIndex] = {
          ...existingCall,
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
      const mode = inferStreamingModeFromContext(
        [progress.phase, progress.state, progress.text, progress.tool]
          .filter(Boolean)
          .join(" ")
      );
      setZakiBotProgressTerminalReason(null);
      setStreamingIndicatorMode(mode);
      if (progress.tool) {
        upsertZakiBotProgressTool(progress.tool, progress.state, progress.text, progress.durationMs);
      }
      const text =
        progress.text ||
        [progress.phase, progress.state].filter(Boolean).join(" • ") ||
        "Processing update";
      setZakiBotStatusEvents((prev) => {
        const last = prev[prev.length - 1];
        if (
          last?.text === text &&
          last.phase === progress.phase &&
          last.state === progress.state &&
          last.tool === progress.tool
        ) {
          return prev;
        }
        const next = [
          ...prev,
          {
            id: `progress-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            text,
            timestamp: Date.now(),
            source,
            phase: progress.phase,
            state: progress.state,
            label: progress.label,
            tool: progress.tool,
            iteration: progress.iteration,
            durationMs: progress.durationMs,
          } satisfies BotStatusEvent,
        ];
        return next.slice(-10);
      });
    },
    [isZakiBotActiveSpace, upsertZakiBotProgressTool]
  );

  const applyQuotaHeaders = useCallback((headers: Headers, fallbackSurface: UsageQuotaSurface) => {
    const limitRaw = String(headers.get("x-zaki-quota-limit") || "").trim().toLowerCase();
    if (!limitRaw) return;
    const remainingRaw = String(headers.get("x-zaki-quota-remaining") || "").trim().toLowerCase();
    const resetAtRaw = String(headers.get("x-zaki-quota-reset-at") || "").trim();
    const headerSurface = String(headers.get("x-zaki-quota-surface") || "").trim().toLowerCase();
    const headerBucket = String(headers.get("x-zaki-quota-bucket") || "").trim();
    const normalizedSurface: UsageQuotaSurface =
      headerSurface === "zaki_bot" ? "zaki_bot" : fallbackSurface;
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
    });
  }, []);

  const refreshUsageQuota = useCallback(async () => {
    try {
      const { response, data } = await fetchUsageQuota(quotaSurface);
      if (!response.ok) return;
      const normalizedSurface: UsageQuotaSurface =
        data.surface === "zaki_bot" ? "zaki_bot" : quotaSurface;
      setFreeDailyQuota({
        unlimited: data.unlimited === true,
        limit: typeof data.limit === "number" ? data.limit : null,
        used: Math.max(0, Number(data.used || 0)),
        remaining: typeof data.remaining === "number" ? Math.max(0, Number(data.remaining)) : null,
        resetAt: typeof data.resetAt === "string" ? data.resetAt : null,
        surface: normalizedSurface,
        bucket: typeof data.bucket === "string" && data.bucket.trim() ? data.bucket.trim() : null,
      });
    } catch {
      // Best-effort status sync.
    }
  }, [quotaSurface]);

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
    const requestPath = isZakiAgentSpace
      ? "/api/agent/chat/stream"
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
          } else if (errorCode === "daily_limit_reached") {
            const resetLabel = quotaResetAt
              ? new Date(quotaResetAt).toLocaleString()
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

    if (!response.body) {
      throw new Error("Chat stream returned no data.");
    }

    applyQuotaHeaders(response.headers, isZakiAgentSpace ? "zaki_bot" : "app_chat");

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
      if (
        eventType === "done" ||
        payloadType === "done" ||
        payload.close === true ||
        payloadType === "finalizeResponseStream"
      ) {
        if (isZakiAgentSpace) {
          finalizeZakiBotProgress("done");
        }
        return { done: true };
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
      if (eventType === "progress" || payload?.type === "progress") {
        if (isZakiBotActiveSpace) {
          pushZakiBotProgressEvent(payload, "progress");
        }
        return {};
      }
      if (
        eventType === "status" ||
        payload?.type === "statusResponse" ||
        payload?.type === "toolCallInvocation"
      ) {
        if (isZakiBotActiveSpace) {
          if (payload?.type === "toolCallInvocation") {
            upsertZakiBotToolCall(payload);
            return {};
          }
          pushZakiBotProgressEvent(payload, "status");
          return {};
        }
        return {};
      }
      if (payload?.type === "toolCallResult" || payload?.type === "tool_result") {
        if (isZakiBotActiveSpace) {
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

      const chunk =
        (typeof payload.delta === "string" && payload.delta) ||
        (typeof payload.textResponse === "string" && payload.textResponse) ||
        (typeof payload.content === "string" && payload.content) ||
        (typeof payload.message === "string" && payload.message) ||
        "";

      return chunk ? { chunk } : {};
    };

    const contentType = response.headers.get("content-type") || "";
    let sawTerminalEvent = false;
    
    // If JSON response, check for agent invocation URL
    if (contentType.includes("application/json")) {
      const data = (await response.json()) as Record<string, unknown>;
      const agentUrl = resolveAgentUrl(data);
      
      if (agentUrl) {
        await streamAgentInvocation(agentUrl, threadSlug, assistantId, signal);
        return;
      }

      const result = readPayloadChunk(data);
      if (result.agentUrl) {
        await streamAgentInvocation(result.agentUrl, threadSlug, assistantId, signal);
        return;
      }
      if (result.chunk) {
        updateAssistantContent(
          threadSlug,
          assistantId,
          normalizeAssistantFormatting(message, result.chunk)
        );
      }
      if (result.done) {
        sawTerminalEvent = true;
      }
      if (isZakiAgentSpace && !sawTerminalEvent && !signal?.aborted) {
        finalizeZakiBotProgress("stream_end");
      }
      return;
    }

    // Stream SSE/text response
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let accumulated = "";
    let buffer = "";
    let streamClosed = false;
    let renderedLength = 0;
    let renderTimer: number | null = null;

    const flushRenderedContent = () => {
      if (renderTimer) {
        window.clearTimeout(renderTimer);
        renderTimer = null;
      }
      if (renderedLength === accumulated.length) return;
      renderedLength = accumulated.length;
      updateAssistantContent(threadSlug, assistantId, accumulated);
    };

    const appendChunk = (chunk: string) => {
      if (!chunk) return;
      accumulated += chunk;
      if (renderTimer != null) return;
      renderTimer = window.setTimeout(() => {
        renderTimer = null;
        flushRenderedContent();
      }, 32);
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
          if (result.chunk) {
            appendChunk(result.chunk);
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
  }, [
    applyQuotaHeaders,
    applyZakiBotToolResult,
    finalizeZakiBotProgress,
    isRtl,
    isZakiBotActiveSpace,
    isMemoryPipelineEnabled,
    pushZakiBotProgressEvent,
    queryModeEnabled,
    responseFormattingConfig.disableResponseEnvelope,
    spacesList,
    streamAgentInvocation,
    updateAssistantContent,
    updateAssistantSources,
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
      if (zakiBotProvisionedRef.current) return true;
      if (zakiBotProvisionPromiseRef.current) {
        return zakiBotProvisionPromiseRef.current;
      }

      const pending = (async () => {
        const { response, data } = await provisionAgent({
          spaceId: ZAKI_BOT_SPACE_ID,
          threadId: ZAKI_BOT_THREAD_ID,
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
    [isZakiBotActiveSpace]
  );

  useEffect(() => {
    if (!isZakiBotActiveSpace) return;
    void ensureZakiBotProvisioned(true);
  }, [ensureZakiBotProvisioned, isZakiBotActiveSpace]);

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
    if (zakiBotToolCalls.length === 0 && zakiBotStatusEvents.length === 0) return;
    if (zakiBotProcessClearTimerRef.current) {
      window.clearTimeout(zakiBotProcessClearTimerRef.current);
    }

    const clearDelayMs =
      zakiBotProgressTerminalReason === "error"
        ? 1500
        : zakiBotProgressTerminalReason === "abort"
          ? 0
          : 600;

    if (clearDelayMs <= 0) {
      clearZakiBotProgressVisuals();
      return;
    }

    zakiBotProcessClearTimerRef.current = window.setTimeout(() => {
      clearZakiBotProgressVisuals();
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
    zakiBotStatusEvents.length,
    zakiBotToolCalls.length,
  ]);

  useEffect(() => {
    if (!isZakiBotActiveSpace) return;
    if (activeThreadId === ZAKI_BOT_THREAD_ID) return;
    navigate(`/spaces/${ZAKI_BOT_SPACE_ID}/threads/${ZAKI_BOT_THREAD_ID}`, { replace: true });
  }, [activeThreadId, isZakiBotActiveSpace, navigate]);

  // Handle send message
  const handleSend = useCallback(async (text: string, files: File[], preferredWorkspaceSlug?: string | null) => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Message is empty");
      return;
    }
    if (isStreaming) return;
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
    let threadId = isZakiBotTarget ? ZAKI_BOT_THREAD_ID : activeThreadId;
    if (!threadId) {
      try {
        const response = await apiRequest(`/workspace/${resolvedWorkspaceSlug}/thread/new`, {
          method: "POST",
        });
        if (!response.ok) {
          throw new Error("Unable to create thread.");
        }
        const data = (await response.json()) as {
          thread?: { slug: string; name: string };
        };
        threadId = data.thread?.slug ?? `thread-${Date.now()}`;
        const label = data.thread?.name || trimmed.split(/\n+/)[0]?.slice(0, 48) || "New chat";
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

    const attachmentsForMessage = files
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file),
      }));
    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;

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
    }
    setStreamingIndicatorMode(agentRequested ? "researching" : "thinking");
    setIsStreaming(true);
    const streamController = new AbortController();
    streamAbortRef.current = streamController;
    const normalizedText = manualAgentPrefix ? trimmed.replace(/^@agent\b\s*/i, "").trim() : trimmed;
    const searchAgentInstruction = normalizedText
      ? `@agent search the web for ${normalizedText}`.trim()
      : "@agent search the web";
    const attachmentLabel =
      files.length > 0 ? `[Attachments: ${files.map((file) => file.name).join(", ")}]` : "";
    const sendText = agentRequested
      ? manualAgentPrefix
        ? files.length > 0
          ? `@agent ${attachmentLabel}\n\n${normalizedText || trimmed}`.trim()
          : `@agent ${normalizedText || trimmed}`.trim()
        : files.length > 0
          ? `${searchAgentInstruction}\n\n${attachmentLabel}`.trim()
          : searchAgentInstruction
      : files.length > 0
        ? `${attachmentLabel}\n\n${trimmed}`
        : trimmed;

    try {
      await streamChatMessage({
        workspaceSlug: resolvedWorkspaceSlug,
        threadSlug: threadId,
        message: sendText,
        assistantId: assistantMessageId,
        signal: streamController.signal,
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
    authUserId,
    checkForSavedMemories,
    clearZakiBotProgressVisuals,
    ensureZakiBotProvisioned,
    finalizeZakiBotProgress,
    isRtl,
    isStreaming,
    navigate,
    primarySpace?.id,
    streamChatMessage,
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

  const handleThumbsUpMessage = useCallback(() => {
    toast.success("Thanks for the feedback");
  }, []);

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
    if (!isZakiBotActiveSpace || !activeThreadId) return;
    if (historyLoadedRef.current[activeThreadId]) return;
    if (messagesByThread[activeThreadId]?.length) {
      historyLoadedRef.current[activeThreadId] = true;
      return;
    }

    let cancelled = false;
    setIsBotHistoryLoading(true);
    void fetchAgentHistory(ZAKI_BOT_SPACE_ID, ZAKI_BOT_THREAD_ID, zakiBotHistoryMode)
      .then(({ response, data }) => {
        if (cancelled || !response.ok) return;
        const history = Array.isArray(data.history)
          ? data.history.map((entry, index) => {
              const role: "assistant" | "user" =
                entry.role === "assistant" ? "assistant" : "user";
              return {
                id: String(entry.id || `bot-history-${index}`),
                role,
                content: String(entry.content || ""),
              };
            })
          : [];
        setZakiBotHistorySource(
          String(data.historyMode || zakiBotHistoryMode) +
            ":" +
            String(data.source || "unknown")
        );
        setMessagesByThread((prev) => ({
          ...prev,
          [activeThreadId]: history,
        }));
        historyLoadedRef.current[activeThreadId] = true;
      })
      .finally(() => {
        if (!cancelled) setIsBotHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeThreadId, isZakiBotActiveSpace, messagesByThread, zakiBotHistoryMode]);

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
            window.dispatchEvent(new CustomEvent("zaki:view-space", { detail: { id } }));
          }}
        />
      );
    }

    if (showZakiHome) {
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

    return (
      <ChatView
        messages={messages}
        isHistoryLoading={isHistoryLoading || (isZakiBotActiveSpace && isBotHistoryLoading)}
        isStreaming={isStreaming}
        streamingLabel={
          streamingIndicatorMode === "researching"
            ? t("chat.researching")
            : streamingIndicatorMode === "writing"
              ? (isRtl ? "يكتب" : "Writing")
              : t("chat.thinking")
        }
        streamingPillLabel={streamingIndicatorMode === "researching" ? t("chat.researching") : undefined}
        botToolCalls={isZakiBotActiveSpace ? zakiBotToolCalls : []}
        botStatusEvents={isZakiBotActiveSpace ? zakiBotStatusEvents : []}
        showBotTimeline={isZakiBotActiveSpace}
        botMode={isZakiBotActiveSpace}
        streamingMode={streamingIndicatorMode}
        firstMessageTransition={firstMessageTransition}
        onCopyMessage={handleCopyMessage}
        onRegenerateMessage={handleRegenerateMessage}
        onThumbsUpMessage={handleThumbsUpMessage}
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
            toast.error(chatCopy.botUploadUnavailable);
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
              <span className="zaki-subheader-pill" dir={isRtl ? "rtl" : "ltr"}>
                {headerSpaceName}
                <span className="text-zaki-muted">/</span>
                {headerThreadName}
              </span>
              {isZakiBotActiveSpace ? (
                <span className="rounded-full border border-zaki-subtle bg-white/70 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-zaki-muted">
                  History {zakiBotHistorySource || `${zakiBotHistoryMode}:loading`}
                </span>
              ) : null}
              <div className="ml-auto flex items-center gap-2 relative" ref={menuRef}>
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
                    className="absolute right-0 top-full mt-2 w-40 rounded-zaki-lg border border-zaki-subtle bg-white shadow-[0px_14px_30px_rgba(15,15,15,0.12)] p-1"
                    role="menu"
                  >
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        openMemoryViewer();
                      }}
                      aria-label={chatCopy.reviewMemoriesAria}
                    >
                      <Brain className="size-4 text-zaki-muted" />
                      {chatCopy.reviewMemories}
                      {memoryPendingCount + memoryConflictCount > 0 && (
                        <span className="ml-auto bg-zaki-brand text-white text-xs px-2 py-0.5 rounded-full">
                          {memoryPendingCount + memoryConflictCount}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
                      role="menuitem"
                      onClick={handleExport}
                      aria-label={chatCopy.exportJsonAria}
                    >
                      <Download className="size-4 text-zaki-muted" />
                      {chatCopy.exportJson}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-[64px]" aria-hidden="true" />
          )}

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
          {!showZakiHome && !showSpacesView && !showSpaceDetail && (
            <div
              ref={inputWrapRef}
              className="zaki-input-float relative z-20"
              style={{ transform: `translateY(${inputOffset}px)` }}
            >
              <ZakiBootstrapCard
                active={isZakiBotActiveSpace && Boolean(authUserId) && !zakiBootstrapCompleted}
                userId={authUserId}
                onDismiss={() => setZakiBootstrapCompleted(true)}
              />
              <ZakiExperimentalNotice
                active={isZakiBotActiveSpace && zakiBootstrapCompleted}
              />
              <InputArea
                onSend={handleSend}
                attachments={attachments}
                setAttachments={setAttachments}
                isSending={isStreaming}
                onStop={handleStopStreaming}
                queryModeEnabled={queryModeEnabled}
                onToggleQueryMode={() => setQueryModeEnabled((prev) => !prev)}
                webSearchArmed={webSearchArmed}
                onToggleWebSearch={() => setWebSearchArmed((prev) => !prev)}
                showUpgradeStrip={!isZakiBotActiveSpace}
                sendLocked={isZakiBotSendLocked}
                zakiBotMode={isZakiBotActiveSpace}
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

      <CreateSpaceModal
        isOpen={createSpaceOpen}
        onClose={() => setCreateSpaceOpen(false)}
        onCreate={(data) => {
          window.dispatchEvent(
            new CustomEvent("zaki:create-space", { detail: data })
          );
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
