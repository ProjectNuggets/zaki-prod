import { BackgroundPattern } from "./BackgroundPattern";
import { InputArea } from "./InputArea";
import { Share2, MoreVertical, Download, Brain, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "@/lib/api";
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
  MemoryConfirmationPanel,
} from "./chat";

import { useMemoryMode } from "./memory/MemoryModeToggle";
import { useNavigationStore, useAuthStore } from "@/stores";
import { ShareModal } from "./ShareModal";
import { toast } from "sonner";
import type { PinnedFile, Space, Message } from "@/types";
import { useMessages } from "@/queries/useThreads";
import { MemoryRail } from "./memory/MemoryRail";
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

const HOME_STARTER_MESSAGE = "hello, how are you zaki";
const MEMORY_STATUS_SYNC_THROTTLE_MS = 1200;
const THREAD_ATTACHMENT_UNAVAILABLE_MESSAGE =
  "Thread file grounding is not live yet. Upload documents from the workspace tools so ZAKI can actually use them.";

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
  if (/\btable\b/i.test(text) || /(?:^|\s)(جدول|table)(?:\s|$)/i.test(text)) return "table";
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

function normalizeAssistantFormatting(prompt: string, content: string) {
  const format = getRequestedResponseFormat(prompt);
  const text = String(content || "").trim();
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

export function ChatArea() {
  const { i18n } = useTranslation();
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
  const [responseFormattingConfig, setResponseFormattingConfig] =
    useState<ResponseFormattingConfig>(() => readResponseFormattingConfig());
  const historyLoadedRef = useRef<Record<string, boolean>>({});
  const [firstMessageTransition, setFirstMessageTransition] = useState(false);
  const [queryModeEnabled, setQueryModeEnabled] = useState(false);
  const streamAbortRef = useRef<AbortController | null>(null);

  // Memory state - works for both auto-save and manual modes
  const [pendingMemories, setPendingMemories] = useState<Array<{id: string; content: string; type: string; confirmationId?: string; _mode: "autosave" | "manual"}>>([]);
  const [showMemoryToast, setShowMemoryToast] = useState(false);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [memoryConflictCount, setMemoryConflictCount] = useState(0);
  const [showConflictToast, setShowConflictToast] = useState(false);
  // Memory chip removed
  const lastMemoryRequestRef = useRef<{ message: string; threadId?: string; mode: "autosave" | "manual" } | null>(null);
  const memoryQueueRef = useRef<Array<{ id: string; content: string; type: string; confirmationId?: string; _mode: "autosave" | "manual" }>>([]);
  const memoryFlushTimerRef = useRef<number | null>(null);
  const autoDismissTimerRef = useRef<number | null>(null);
  const memoryInFlightRef = useRef(false);
  const queuedMemoryCheckRef = useRef<{ message: string; threadId?: string; mode?: "autosave" | "manual" } | null>(null);
  const memorySeenRef = useRef<Set<string>>(new Set());
  const memoryConflictSeenRef = useRef<Set<string>>(new Set());
  const conflictCountRef = useRef(0);
  const memoryStatusHydratedRef = useRef(false);
  const lastMemoryStatusSyncAtRef = useRef(0);
  const authUser = useAuthStore((s) => s.user);
  const authUserId = useMemo(() => {
    const fallbackEmail =
      typeof authUser === "object" && authUser !== null
        ? String((authUser as { email?: string }).email || "")
        : "";
    return String(authUser?.username || fallbackEmail).trim().toLowerCase();
  }, [authUser]);
  const [activationProgress, setActivationProgress] = useState<ActivationProgress>({
    firstMessageSent: false,
    firstMemorySaved: false,
    completed: false,
  });
  
  // Memory mode: autosave (default) or manual
  const [memoryMode, setMemoryMode] = useMemoryMode();

  // Clear pending memories when switching modes to prevent stale state
  const prevModeRef = useRef(memoryMode);
  useEffect(() => {
    if (prevModeRef.current !== memoryMode) {
      // Mode changed - keep manual pending memories visible until resolved
      const hasManualPending = pendingMemories.some((m) => m._mode === "manual");
      if (prevModeRef.current === "manual" && hasManualPending) {
        setShowMemoryToast(true);
      } else if (memoryMode === "autosave") {
        setShowMemoryToast(false);
      }
      prevModeRef.current = memoryMode;
    }
  }, [memoryMode, pendingMemories]);

  useEffect(() => {
    if (pendingMemories.some((m) => m._mode === "manual" || m._mode === "autosave")) {
      setShowMemoryToast(true);
    }
  }, [pendingMemories]);

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
  const showReady = !activeThreadId || messages.length === 0;
  const primarySpace = spacesList[0] ?? null;
  const homeConversationSpaceId = useMemo(() => {
    const zakiSpace = spacesList.find(
      (space) => String(space.id || "").trim().toLowerCase() === "zaki"
    );
    if (zakiSpace?.id) return zakiSpace.id;
    const fixedSpace = spacesList.find((space) => Boolean(space.fixed));
    return fixedSpace?.id ?? primarySpace?.id ?? null;
  }, [primarySpace?.id, spacesList]);
  const activeSpace = spacesList.find((space) => space.id === activeWorkspaceSlug) ?? null;
  const activeThread = activeSpace?.threads?.find((thread) => thread.id === activeThreadId) ?? null;
  const headerSpaceName = activeSpace?.title || chatCopy.spaceFallback;
  const headerThreadName = activeThread?.label || chatCopy.newChat;

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
    activeWorkspaceSlug,
    activeThreadId
  );

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
      let settled = false;

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
          const chunk =
            (typeof payload.textResponse === "string" && payload.textResponse) ||
            (typeof payload.content === "string" && payload.content) ||
            (typeof payload.message === "string" && payload.message) ||
            (typeof payload.error === "string" && payload.error) ||
            "";
          if (payload.close || payload.type === "finalizeResponseStream") {
            ws.close();
            return;
          }
          if (chunk) {
            accumulated += chunk;
            updateAssistantContent(threadSlug, assistantId, accumulated);
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
        rejectOnce(new Error("Connection failed."));
      };
      ws.onclose = () => resolveOnce();
    });
  }, [updateAssistantContent]);

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
      String(workspaceSlug || "").trim().toLowerCase() === "zaki-agent";
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

    if (!response.ok) {
      console.error(`[Chat] Stream failed: ${response.status}`);
      let message = `Chat request failed (${response.status}).`;
      let errorCode: string | null = null;
      const requestId = response.headers.get("x-request-id");
      const errorContentType = response.headers.get("content-type") || "";
      try {
        if (errorContentType.includes("application/json")) {
          const data = (await response.json()) as {
            error?: string;
            message?: string;
            code?: string;
          };
          if (typeof data.code === "string" && data.code.trim()) {
            errorCode = data.code.trim();
          }
          if (typeof data.message === "string" && data.message.trim()) {
            message = data.message;
          } else if (typeof data.error === "string" && data.error.trim()) {
            message = data.error;
          } else if (errorCode === "access_expired") {
            message = "Access code required. Redeem a fresh code to keep chatting.";
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

    const readPayloadChunk = (
      payload: Record<string, unknown>,
      eventType?: string
    ): { done?: boolean; chunk?: string } => {
      if (eventType === "done") {
        return { done: true };
      }
      if (eventType === "error") {
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

      if (eventType === "memory_used" && Array.isArray(payload.sources)) {
        updateAssistantSources(
          threadSlug,
          assistantId,
          payload.sources as Array<{ id: string; content: string; type: string }>
        );
        return {};
      }

      if (payload?.type === "memoryUsed" && Array.isArray(payload.sources)) {
        updateAssistantSources(
          threadSlug,
          assistantId,
          payload.sources as Array<{ id: string; content: string; type: string }>
        );
        return {};
      }

      if (payload?.type === "abort" && typeof payload.error === "string" && payload.error.trim()) {
        throw new Error(payload.error.trim());
      }

      if (payload?.type === "error" || payload?.error === true) {
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

      if (payload?.close === true || payload?.type === "finalizeResponseStream") {
        return { done: true };
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
    
    // If JSON response, check for agent invocation URL
    if (contentType.includes("application/json")) {
      const data = (await response.json()) as Record<string, unknown>;
      const agentUrl =
        (data.agentInvocationUrl as string | undefined) ||
        (data.invocationUrl as string | undefined) ||
        (data.websocketUrl as string | undefined) ||
        (data.wsUrl as string | undefined) ||
        (data.url as string | undefined);
      
      if (agentUrl) {
        await streamAgentInvocation(agentUrl, threadSlug, assistantId, signal);
        return;
      }

      const result = readPayloadChunk(data);
      if (result.chunk) {
        updateAssistantContent(
          threadSlug,
          assistantId,
          normalizeAssistantFormatting(message, result.chunk)
        );
      }
      return;
    }

    // Stream SSE/text response
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let accumulated = "";
    let buffer = "";
    let streamClosed = false;

    const appendChunk = (chunk: string) => {
      if (!chunk) return;
      accumulated += chunk;
      updateAssistantContent(threadSlug, assistantId, accumulated);
    };

    const processRawData = (raw: string) => {
      const value = raw.trim();
      if (!value || value === "[DONE]") {
        if (value === "[DONE]") streamClosed = true;
        return;
      }
      try {
        const payload = JSON.parse(value) as Record<string, unknown>;
        const result = readPayloadChunk(payload);
        if (result.done) {
          streamClosed = true;
          return;
        }
        if (result.chunk) {
          appendChunk(result.chunk);
        }
        return;
      } catch {
        appendChunk(raw);
      }
    };

    const processSseBlock = (block: string) => {
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
        processRawData(line);
      }

      if (dataLines.length > 0) {
        const payloadText = dataLines.join("\n");
        try {
          const payload = JSON.parse(payloadText) as Record<string, unknown>;
          const result = readPayloadChunk(payload, eventType);
          if (result.done) {
            streamClosed = true;
            return;
          }
          if (result.chunk) {
            appendChunk(result.chunk);
          }
          return;
        } catch {
          processRawData(payloadText);
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
        processSseBlock(block);
        if (streamClosed) break;
        separatorIndex = buffer.indexOf("\n\n");
      }
    }

    const trailing = buffer.trim();
    if (!streamClosed && trailing) {
      processSseBlock(trailing);
    }

    const finalized = normalizeAssistantFormatting(message, accumulated);
    if (finalized && finalized !== accumulated) {
      updateAssistantContent(threadSlug, assistantId, finalized);
    }
  }, [
    spacesList,
    responseFormattingConfig.disableResponseEnvelope,
    queryModeEnabled,
    streamAgentInvocation,
    updateAssistantContent,
    updateAssistantSources,
  ]);

  // Check for memories - Auto-Save or Manual mode
  const flushMemoryQueue = useCallback(() => {
    if (memoryQueueRef.current.length === 0) return;
    setPendingMemories((prev) => {
      const merged = [...prev, ...memoryQueueRef.current];
      memoryQueueRef.current = [];
      return merged;
    });
    setShowMemoryToast(true);
    if (memoryMode === "autosave") {
      if (autoDismissTimerRef.current) {
        window.clearTimeout(autoDismissTimerRef.current);
      }
      autoDismissTimerRef.current = window.setTimeout(() => {
        setShowMemoryToast(false);
        setPendingMemories((prev) => prev.filter((m) => m._mode !== "autosave"));
      }, 8000);
    }
  }, [memoryMode]);

  const syncMemoryStatus = useCallback(
    async (notifyOnNewConflicts = false) => {
      if (!authUserId) return;
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

        if (!memoryStatusHydratedRef.current) {
          memoryStatusHydratedRef.current = true;
          if (conflictCount > 0) {
            setShowConflictToast(true);
          }
        } else if (notifyOnNewConflicts && conflictCount > previousConflictCount) {
          setShowConflictToast(true);
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

        if (pendingCount <= 0) {
          let hasAutosaveMemories = false;
          setPendingMemories((prev) => {
            const autosaveOnly = prev.filter((memory) => memory._mode === "autosave");
            hasAutosaveMemories = autosaveOnly.length > 0;
            return autosaveOnly;
          });
          if (!hasAutosaveMemories) {
            setShowMemoryToast(false);
          }
          return;
        }

        const pendingResponse = await apiRequest("/api/memory/confirmations?limit=50");
        if (!pendingResponse.ok) return;

        const pendingData = (await pendingResponse.json()) as {
          confirmations?: Array<{
            id: string;
            content: string;
            type: string;
          }>;
          pending?: Array<{
            id: string;
            content: string;
            type: string;
          }>;
        };
        const incoming = (
          Array.isArray(pendingData.confirmations)
            ? pendingData.confirmations
            : Array.isArray(pendingData.pending)
              ? pendingData.pending
              : []
        ).map((memory) => ({
          id: memory.id,
          content: memory.content,
          type: memory.type,
          confirmationId: memory.id,
          _mode: "manual" as const,
        }));

        if (incoming.length === 0) {
          setPendingMemories((prev) => {
            const autosaveOnly = prev.filter((memory) => memory._mode === "autosave");
            if (autosaveOnly.length === 0) {
              setShowMemoryToast(false);
            }
            return autosaveOnly;
          });
          return;
        }

        setPendingMemories((prev) => {
          const autosaveOnly = prev.filter((memory) => memory._mode === "autosave");
          const incomingById = new Map(
            incoming.map((memory) => [memory.confirmationId || memory.id, memory])
          );
          const mergedManual = Array.from(incomingById.values());
          return [...autosaveOnly, ...mergedManual];
        });
        setShowMemoryToast(true);
      } catch {
        // Sync is best-effort and should never block chat.
      }
    },
    [authUserId]
  );

  const requestMemoryStatusSync = useCallback(
    (notifyOnNewConflicts = false, force = false) => {
      if (!authUserId) return;
      const now = Date.now();
      const elapsed = now - lastMemoryStatusSyncAtRef.current;
      if (!force && elapsed < MEMORY_STATUS_SYNC_THROTTLE_MS) {
        return;
      }
      lastMemoryStatusSyncAtRef.current = now;
      void syncMemoryStatus(notifyOnNewConflicts);
    },
    [authUserId, syncMemoryStatus]
  );

  const checkForSavedMemories = useCallback(async (message: string, threadId?: string, modeOverride?: "autosave" | "manual") => {
    if (!authUserId) return;
    if (memoryInFlightRef.current) {
      queuedMemoryCheckRef.current = { message, threadId, mode: modeOverride };
      return;
    }
    
    const activeMode = modeOverride ?? memoryMode;
    const endpoint = activeMode === "autosave" 
      ? "/api/memory/autosave" 
      : "/api/memory/preview";
    lastMemoryRequestRef.current = { message, threadId, mode: activeMode };
    memoryInFlightRef.current = true;
    
    try {
      const response = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify({
          message,
          threadId: threadId ?? activeThreadId,
        }),
      });
      
      if (!response.ok) {
        setMemoryError("Memory save failed. Retry?");
        return;
      }
      
      const data = await response.json();
      setMemoryError(null);
      const conflicts = data.conflicts || [];
      const duplicates = Array.isArray(data.duplicates) ? data.duplicates : [];
      if (conflicts.length > 0) {
        const newConflicts = conflicts.filter((conflict: { id?: string }) => {
          if (!conflict?.id) return true;
          if (memoryConflictSeenRef.current.has(conflict.id)) return false;
          memoryConflictSeenRef.current.add(conflict.id);
          return true;
        });
        if (newConflicts.length > 0) {
          setShowConflictToast(true);
        }
      }
      
      // Different response shapes for different modes
      const memories = (activeMode === "autosave" ? (data.saved || []) : (data.pending || [])).map(
        (m: { id: string; content: string; type: string; confirmationId?: string }) => ({
          ...m,
          _mode: activeMode,
        })
      );

      if (memories.length === 0 && duplicates.length > 0 && conflicts.length === 0) {
        const firstDuplicate = String(duplicates[0]?.content || "").trim();
        toast.info(
          duplicates.length === 1 && firstDuplicate
            ? `Already remembered: "${firstDuplicate}".`
            : `Already remembered ${duplicates.length} memories.`
        );
        if (firstDuplicate && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("zaki:open-memory", {
              detail: { query: firstDuplicate },
            })
          );
        }
      }
      
      if (memories.length > 0) {
        const uniqueMemories = memories.filter((m: { id: string; confirmationId?: string }) => {
          const key = m.confirmationId || m.id;
          if (memorySeenRef.current.has(key)) return false;
          memorySeenRef.current.add(key);
          return true;
        });
        if (uniqueMemories.length === 0) return;
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
        memoryQueueRef.current = [...memoryQueueRef.current, ...uniqueMemories];
        if (memoryFlushTimerRef.current) {
          window.clearTimeout(memoryFlushTimerRef.current);
        }
        memoryFlushTimerRef.current = window.setTimeout(() => {
          flushMemoryQueue();
          memoryFlushTimerRef.current = null;
        }, 600);
      }
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
        checkForSavedMemories(next.message, next.threadId, next.mode);
      }
    }
  }, [
    authUserId,
    activationProgress.firstMemorySaved,
    activeThreadId,
    flushMemoryQueue,
    isRtl,
    memoryMode,
    requestMemoryStatusSync,
  ]);

  useEffect(() => {
    if (!authUserId) {
      conflictCountRef.current = 0;
      memoryStatusHydratedRef.current = false;
      lastMemoryStatusSyncAtRef.current = 0;
      setMemoryConflictCount(0);
      setShowConflictToast(false);
      return;
    }
    requestMemoryStatusSync(false, true);
  }, [authUserId, requestMemoryStatusSync]);

  useEffect(() => {
    if (!authUserId) return;
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
                  if (nextConflictCount > conflictCountRef.current) {
                    setShowConflictToast(true);
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
                  if (nextPendingCount <= 0) {
                    let hasAutosaveMemories = false;
                    setPendingMemories((prev) => {
                      const autosaveOnly = prev.filter((memory) => memory._mode === "autosave");
                      hasAutosaveMemories = autosaveOnly.length > 0;
                      return autosaveOnly;
                    });
                    if (!hasAutosaveMemories) {
                      setShowMemoryToast(false);
                    }
                  } else {
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
  }, [authUserId, requestMemoryStatusSync]);

  useEffect(() => {
    if (!authUserId) return;

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
  }, [authUserId, requestMemoryStatusSync]);

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

    let threadId = activeThreadId;
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
    setIsStreaming(true);
    const streamController = new AbortController();
    streamAbortRef.current = streamController;

    const sendText = files.length > 0
      ? `[Attachments: ${files.map((file) => file.name).join(", ")}]\n\n${trimmed}`
      : trimmed;

    try {
      await streamChatMessage({
        workspaceSlug: resolvedWorkspaceSlug,
        threadSlug: threadId,
        message: sendText,
        assistantId: assistantMessageId,
        signal: streamController.signal,
      });
      
      // Keep chat UX responsive: memory save runs in background.
      void checkForSavedMemories(trimmed, threadId);
    } catch (error) {
      if (isAbortError(error)) {
        updateAssistantError(threadId, assistantMessageId, "Generation stopped.", "aborted");
        return;
      }
      if (error instanceof ChatRequestError && error.code === "access_expired") {
        toast.error(error.message);
        navigate("/pricing");
        return;
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
      setIsStreaming(false);
    }
  }, [
    activeThreadId,
    activeWorkspaceSlug,
    activationProgress.firstMessageSent,
    authUserId,
    checkForSavedMemories,
    isRtl,
    isStreaming,
    navigate,
    primarySpace?.id,
    streamChatMessage,
    updateAssistantError,
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

  const handleHomeStartConversation = useCallback(() => {
    const workspaceSlug = homeConversationSpaceId;
    if (!workspaceSlug) {
      goToSpaces();
      return;
    }
    handleSend(HOME_STARTER_MESSAGE, [], workspaceSlug);
  }, [goToSpaces, handleSend, homeConversationSpaceId]);

  const handleExampleSelect = useCallback(
    (example: string) => {
      handleSend(example, []);
    },
    [handleSend]
  );

  // Track previous thread for summarization on switch
  const prevThreadRef = useRef<{ id: string; workspaceSlug: string; title: string } | null>(null);

  // Summarize conversation when leaving a thread
  useEffect(() => {
    const prevThread = prevThreadRef.current;
    
    // If we had a previous thread and we're switching away from it
    if (prevThread && prevThread.id !== activeThreadId) {
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
        }).catch((err) => {
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
  }, [activeThreadId, activeWorkspaceSlug, activeThread?.label, messagesByThread]);

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
      setFileUploadSpaceId(detail.id);
      fileInputRef.current?.click();
    };

    const handleViewZakiHome = () => {
      goHome();
      setAttachments([]);
    };

    window.addEventListener("zaki:clear-thread", handleClearThread);
    window.addEventListener("zaki:view-spaces", handleViewSpaces);
    window.addEventListener("zaki:spaces-data", handleSpacesData);
    window.addEventListener("zaki:open-create-space", handleOpenCreateSpace);
    window.addEventListener("zaki:view-space", handleViewSpace);
    window.addEventListener("zaki:edit-space-instructions", handleEditSpaceInstructions);
    window.addEventListener("zaki:upload-space-files", handleUploadSpaceFiles);
    window.addEventListener("zaki:view-zaki-home", handleViewZakiHome);

    return () => {
      window.removeEventListener("zaki:clear-thread", handleClearThread);
      window.removeEventListener("zaki:view-spaces", handleViewSpaces);
      window.removeEventListener("zaki:spaces-data", handleSpacesData);
      window.removeEventListener("zaki:open-create-space", handleOpenCreateSpace);
      window.removeEventListener("zaki:view-space", handleViewSpace);
      window.removeEventListener("zaki:edit-space-instructions", handleEditSpaceInstructions);
      window.removeEventListener("zaki:upload-space-files", handleUploadSpaceFiles);
      window.removeEventListener("zaki:view-zaki-home", handleViewZakiHome);
    };
  }, [activeWorkspaceSlug, clearThread, goHome, goToSpaces, spacesList]);

  useEffect(() => {
    return () => {
      if (memoryFlushTimerRef.current) {
        window.clearTimeout(memoryFlushTimerRef.current);
      }
      if (autoDismissTimerRef.current) {
        window.clearTimeout(autoDismissTimerRef.current);
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
          onStartConversation={handleHomeStartConversation}
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
          onSelectExample={handleExampleSelect}
        />
      );
    }

    return (
      <ChatView
        messages={messages}
        isHistoryLoading={isHistoryLoading}
        isStreaming={isStreaming}
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
          toast.info(THREAD_ATTACHMENT_UNAVAILABLE_MESSAGE);
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
                        setShowMemoryPanel(true);
                      }}
                      aria-label={chatCopy.reviewMemoriesAria}
                    >
                      <Brain className="size-4 text-zaki-muted" />
                      {chatCopy.reviewMemories}
                      {pendingMemories.length > 0 && (
                        <span className="ml-auto bg-zaki-brand text-white text-xs px-2 py-0.5 rounded-full">
                          {pendingMemories.length}
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
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 z-20"
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
              <InputArea
                onSend={handleSend}
                attachments={attachments}
                setAttachments={setAttachments}
                isSending={isStreaming}
                onStop={handleStopStreaming}
                queryModeEnabled={queryModeEnabled}
                onToggleQueryMode={() => setQueryModeEnabled((prev) => !prev)}
                memoryMode={memoryMode}
                onToggleMemoryMode={() => setMemoryMode(memoryMode === "autosave" ? "manual" : "autosave")}
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

              const { valid, invalid } = splitFilesByAcceptedTypes(
                files,
                acceptedWorkspaceTypes
              );
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
                    existingPinned.map((file) => [
                      `${file.name}:${file.size}:${file.type}`,
                      file,
                    ])
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
                  toast.error(
                    error instanceof Error ? error.message : chatCopy.unableToUpload
                  );
                });
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

      {/* Memory Toast - Mode-dependent rendering */}
      {showMemoryToast && pendingMemories.length > 0 && authUserId && (
        <MemoryRail
          memoryMode={pendingMemories.some((m) => m._mode === "manual") ? "manual" : memoryMode}
          memories={
            pendingMemories.some((m) => m._mode === "manual")
              ? pendingMemories.filter((m) => m._mode === "manual")
              : pendingMemories.filter((m) => m._mode === "autosave")
          }
          userId={authUserId}
          position={toastPosition}
          onResolve={(resolvedId) => {
            setPendingMemories((prev) => {
              const next = prev.filter((m) => (m.confirmationId || m.id) !== resolvedId);
              if (next.filter((m) => m._mode === "manual").length === 0) {
                setShowMemoryToast(false);
              }
              return next;
            });
            requestMemoryStatusSync(false, true);
          }}
          onDismiss={() => {
            setShowMemoryToast(false);
            setPendingMemories((prev) => prev.filter((m) => m._mode !== "autosave"));
          }}
        />
      )}

      {showConflictToast && memoryConflictCount > 0 && (
        <div
          className="fixed z-40"
          aria-live="polite"
          style={{
            left: toastPosition.left,
            width: toastPosition.width,
            bottom: toastPosition.bottom + (showMemoryToast ? 48 : 16),
          }}
        >
          <div className="rounded-full border border-zaki-subtle dark:border-zaki-dark bg-white/95 dark:bg-zaki-dark-card px-3 py-1.5 text-2xs text-zaki-secondary dark:text-zaki-dark-subtle shadow-[0px_8px_20px_rgba(15,15,15,0.08)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-zaki-hover text-zaki-brand">
                !
              </span>
              <span className="truncate">
                {memoryConflictCount} memory conflict{memoryConflictCount > 1 ? "s" : ""} detected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-zaki-brand font-semibold hover:underline"
                onClick={() => {
                  window.dispatchEvent(new Event("zaki:open-memory"));
                  setShowConflictToast(false);
                }}
              >
                Review
              </button>
              <button
                type="button"
                className="text-zaki-muted dark:text-zaki-dark-muted font-medium hover:underline"
                onClick={() => {
                  setShowConflictToast(false);
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
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
                    checkForSavedMemories(last.message, last.threadId, last.mode);
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

      {/* P0 Fix: Memory Confirmation Panel - Full review UI */}
      {authUserId && (
        <MemoryConfirmationPanel
          userId={authUserId}
          isOpen={showMemoryPanel}
          onClose={() => setShowMemoryPanel(false)}
        />
      )}
    </div>
  );
}
