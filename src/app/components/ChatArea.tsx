import { BackgroundPattern } from "./BackgroundPattern";
import { InputArea } from "./InputArea";
import { Share2, MoreVertical, Download, Brain, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { CSSProperties } from "react";
import { apiRequest } from "@/lib/api";
import {
  LibraryView,
  SpacesView,
  ZakiHomeView,
  ChatView,
  ReadyState,
  CreateSpaceModal,
  EditInstructionsModal,
  MemoryConfirmationPanel,
} from "./chat";

import { AutoSaveToast } from "./memory/AutoSaveToast";
import { MemoryToast } from "./memory/MemoryToast";
import { useMemoryMode } from "./memory/MemoryModeToggle";
import { useNavigationStore, useAuthStore } from "@/stores";
import { ShareModal } from "./ShareModal";
import { toast } from "sonner";
import type { Space, Message, LibraryResult } from "@/types";
import { useMessages } from "@/queries/useThreads";
import { MemoryRail } from "./memory/MemoryRail";

export function ChatArea() {
  const { i18n } = useTranslation();
  const isRtl = i18n.language?.toLowerCase().startsWith("ar");
  useAuthStore(); // For auth context, values used elsewhere
  const {
    view,
    threadId: activeThreadId,
    spaceId: activeWorkspaceSlug,
    goHome,
    goToSpaces,
    goToLibrary,
    goToThread,
    clearThread,
  } = useNavigationStore();

  // View states
  const showZakiHome = view === "home";
  const showSpacesView = view === "spaces";
  const showLibraryView = view === "library";
  const showSpaceDetail = false;

  // Message state
  const [messagesByThread, setMessagesByThread] = useState<Record<string, Message[]>>({});
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const historyLoadedRef = useRef<Record<string, boolean>>({});
  const [firstMessageTransition, setFirstMessageTransition] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  // Memory state - works for both auto-save and manual modes
  const [pendingMemories, setPendingMemories] = useState<Array<{id: string; content: string; type: string; confirmationId?: string; _mode: "autosave" | "manual"}>>([]);
  const [showMemoryToast, setShowMemoryToast] = useState(false);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  // Memory chip removed
  const lastMemoryRequestRef = useRef<{ message: string; threadId?: string; mode: "autosave" | "manual" } | null>(null);
  const memoryQueueRef = useRef<Array<{ id: string; content: string; type: string; confirmationId?: string; _mode: "autosave" | "manual" }>>([]);
  const memoryFlushTimerRef = useRef<number | null>(null);
  const autoDismissTimerRef = useRef<number | null>(null);
  const memoryInFlightRef = useRef(false);
  const queuedMemoryCheckRef = useRef<{ message: string; threadId?: string; mode?: "autosave" | "manual" } | null>(null);
  const memorySeenRef = useRef<Set<string>>(new Set());
  const authUser = useAuthStore((s) => s.user);
  
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

  // Spaces state
  const [spacesList, setSpacesList] = useState<Space[]>([]);
  const [editSpaceId, setEditSpaceId] = useState<string | null>(null);
  const [fileUploadSpaceId, setFileUploadSpaceId] = useState<string | null>(null);

  const toastPosition = useMemo(() => {
    const left = inputWidth ? inputLeft : 16;
    const width =
      inputWidth ||
      (typeof window !== "undefined"
        ? Math.min(window.innerWidth - 32, 896)
        : 640);
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
    const anchorTop = inputTop || inputOffset;
    const bottom = viewportHeight - Math.max(0, anchorTop - 12);
    return { left, width, bottom };
  }, [inputHeight, inputLeft, inputOffset, inputTop, inputWidth]);


  // Library state
  const [libraryQuery, setLibraryQuery] = useState("");
  const [librarySlug, setLibrarySlug] = useState("");
  const [libraryResults, setLibraryResults] = useState<LibraryResult[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState("");

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

  // Computed values
  const messages = activeThreadId ? messagesByThread[activeThreadId] ?? [] : [];
  const showReady = !activeThreadId || messages.length === 0;
  const primarySpace = spacesList[0] ?? null;
  const activeSpace = spacesList.find((space) => space.id === activeWorkspaceSlug) ?? null;
  const activeThread = activeSpace?.threads?.find((thread) => thread.id === activeThreadId) ?? null;
  const headerSpaceName = activeSpace?.title || "Space";
  const headerThreadName = activeThread?.label || "New chat";

  const handleCopyMessage = useCallback(async (message: Message) => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Unable to copy message");
    }
  }, []);

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
  }, [messages.length, showZakiHome, showLibraryView, showSpacesView, showSpaceDetail, updateScrollIndicator]);

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
      toast.success("Chat exported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to export this chat");
    } finally {
      setMenuOpen(false);
    }
  }, [serializeChat, headerThreadName]);

  // Strip memory context prefix from user messages (injected by backend for AI context)
  const stripMemoryContext = (content: string): string => {
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
      };
      return { ...prev, [threadSlug]: updated };
    });
  }, []);

  // Stream via WebSocket for agent invocation URLs
  const streamAgentInvocation = useCallback(async (
    agentUrl: string,
    threadSlug: string,
    assistantId: string
  ) => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(agentUrl);
      let accumulated = "";

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const chunk = payload.textResponse ?? payload.error ?? "";
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

      ws.onerror = () => reject(new Error("Connection failed."));
      ws.onclose = () => resolve();
    });
  }, [updateAssistantContent]);

  // Stream chat message via fetch (POST)
  const streamChatMessage = useCallback(async ({
    workspaceSlug,
    threadSlug,
    message,
    assistantId,
  }: {
    workspaceSlug: string;
    threadSlug: string;
    message: string;
    assistantId: string;
  }) => {
    const activeSpace = spacesList.find((s) => s.id === workspaceSlug);
    const instructions = activeSpace?.instructions ?? "";

    console.log(`[Chat] Sending message to ${workspaceSlug}/${threadSlug}`);
    const response = await apiRequest(
      `/workspace/${workspaceSlug}/thread/${threadSlug}/stream-chat`,
      {
        method: "POST",
        body: JSON.stringify({
          message,
          ...(instructions ? { promptPrefix: `${instructions}\n\n` } : {}),
          ...(webSearchEnabled ? { webSearch: true } : {}),
        }),
      }
    );

    console.log(`[Chat] Response status: ${response.status}`);

    if (!response.ok || !response.body) {
      console.error(`[Chat] Stream failed: ${response.status}`);
      throw new Error("Chat stream failed.");
    }

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
        await streamAgentInvocation(agentUrl, threadSlug, assistantId);
        return;
      }
      
      if (typeof data.message === "string") {
        updateAssistantContent(threadSlug, assistantId, data.message);
      }
      return;
    }

    // Stream SSE/text response
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let accumulated = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      const text = decoder.decode(value, { stream: true });
      const lines = text.split("\n");
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        // Handle SSE format: data: {...}
        if (line.startsWith("data: ")) {
          try {
            const payload = JSON.parse(line.slice(6));
            const chunk = payload.textResponse ?? payload.content ?? "";
            if (chunk) {
              accumulated += chunk;
              updateAssistantContent(threadSlug, assistantId, accumulated);
            }
          } catch {
            // If not JSON, treat as plain text chunk
            accumulated += line.slice(6);
            updateAssistantContent(threadSlug, assistantId, accumulated);
          }
        } else {
          // Plain text streaming
          try {
            const payload = JSON.parse(line);
            const chunk = payload.textResponse ?? payload.content ?? "";
            if (chunk) {
              accumulated += chunk;
              updateAssistantContent(threadSlug, assistantId, accumulated);
            }
          } catch {
            // Not JSON, use as-is
            accumulated += line;
            updateAssistantContent(threadSlug, assistantId, accumulated);
          }
        }
      }
    }
  }, [spacesList, webSearchEnabled, streamAgentInvocation, updateAssistantContent]);

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
      }, 3000);
    }
  }, [memoryMode]);

  const checkForSavedMemories = useCallback(async (message: string, threadId?: string, modeOverride?: "autosave" | "manual") => {
    // Note: username is the email in ZAKI's auth system
    if (!authUser?.username) return;
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
          userId: authUser.username,
          message,
          threadId: threadId ?? activeThreadId,
        }),
      });
      
      if (!response.ok) {
        setMemoryError("Memory save failed. Retry?");
        return;
      }
      
      const data = await response.json();
      
      // Different response shapes for different modes
      const memories = (activeMode === "autosave" ? (data.saved || []) : (data.pending || [])).map(
        (m: { id: string; content: string; type: string; confirmationId?: string }) => ({
          ...m,
          _mode: activeMode,
        })
      );
      
      if (memories.length > 0) {
        const uniqueMemories = memories.filter((m) => {
          const key = m.confirmationId || m.id;
          if (memorySeenRef.current.has(key)) return false;
          memorySeenRef.current.add(key);
          return true;
        });
        if (uniqueMemories.length === 0) return;
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
      if (queuedMemoryCheckRef.current) {
        const next = queuedMemoryCheckRef.current;
        queuedMemoryCheckRef.current = null;
        checkForSavedMemories(next.message, next.threadId, next.mode);
      }
    }
  }, [authUser?.username, activeThreadId, memoryMode, flushMemoryQueue]);

  // Handle send message
  const handleSend = useCallback(async (text: string, files: File[]) => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Message is empty");
      return;
    }
    if (isStreaming) return;
    const resolvedWorkspaceSlug = activeWorkspaceSlug ?? primarySpace?.id ?? null;
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

    const sendText = files.length > 0
      ? `[Attachments: ${files.map((file) => file.name).join(", ")}]\n\n${trimmed}`
      : trimmed;

    try {
      await streamChatMessage({
        workspaceSlug: resolvedWorkspaceSlug,
        threadSlug: threadId,
        message: sendText,
        assistantId: assistantMessageId,
      });
      
      // P0 Fix: Check for auto-saved memories after response
      await checkForSavedMemories(trimmed, threadId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send message");
    } finally {
      setIsStreaming(false);
    }
  }, [activeThreadId, activeWorkspaceSlug, primarySpace?.id, isStreaming, streamChatMessage, checkForSavedMemories]);

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
        if (messages[i]?.role === "user") {
          userMessage = messages[i];
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

  const handleExampleSelect = useCallback(
    (example: string) => {
      handleSend(example, []);
    },
    [handleSend]
  );

  // Library search
  const runLibrarySearch = useCallback(async () => {
    if (!librarySlug || !libraryQuery.trim()) {
      return;
    }
    setLibraryLoading(true);
    setLibraryError("");
    try {
      const response = await apiRequest(`/v1/workspace/${librarySlug}/vector-search`, {
        method: "POST",
        body: JSON.stringify({
          query: libraryQuery,
          topN: 5,
          scoreThreshold: 0.5,
        }),
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Vector search requires an API key.");
        }
        throw new Error("Search failed");
      }
      const data = (await response.json()) as { results?: LibraryResult[] };
      setLibraryResults(data.results ?? []);
    } catch (error) {
      setLibraryError(
        error instanceof Error
          ? error.message
          : "Unable to fetch results. Check your workspace slug or API configuration."
      );
    } finally {
      setLibraryLoading(false);
    }
  }, [librarySlug, libraryQuery]);

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
      if (!showReady || showLibraryView || showSpacesView || showSpaceDetail || activeThreadId) {
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
  }, [showReady, showLibraryView, showSpacesView, showSpaceDetail]);

  // Track input height to pad chat list (ChatGPT-style spacing)
  useEffect(() => {
    const inputEl = inputWrapRef.current;
    if (!inputEl) return;
    if (typeof ResizeObserver === "undefined") {
      // Fallback: single measurement without observing
      const target = inputEl.querySelector<HTMLElement>(".zaki-input-form") ?? inputEl;
      const rect = target.getBoundingClientRect();
      setInputHeight(rect.height);
      setInputLeft(rect.left);
      setInputWidth(rect.width);
      setInputTop(rect.top);
      return;
    }
    const updateMetrics = () => {
      const target = inputEl.querySelector<HTMLElement>(".zaki-input-form") ?? inputEl;
      const rect = target.getBoundingClientRect();
      setInputHeight(rect.height);
      setInputLeft(rect.left);
      setInputWidth(rect.width);
      setInputTop(rect.top);
    };
    updateMetrics();
    const observer = new ResizeObserver(updateMetrics);
    observer.observe(inputEl);
    window.addEventListener("resize", updateMetrics);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateMetrics);
    };
  }, [inputWrapRef]);

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

    const handleViewLibrary = () => {
      goToLibrary();
      setAttachments([]);
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
    window.addEventListener("zaki:view-library", handleViewLibrary);
    window.addEventListener("zaki:view-space", handleViewSpace);
    window.addEventListener("zaki:edit-space-instructions", handleEditSpaceInstructions);
    window.addEventListener("zaki:upload-space-files", handleUploadSpaceFiles);
    window.addEventListener("zaki:view-zaki-home", handleViewZakiHome);

    return () => {
      window.removeEventListener("zaki:clear-thread", handleClearThread);
      window.removeEventListener("zaki:view-spaces", handleViewSpaces);
      window.removeEventListener("zaki:spaces-data", handleSpacesData);
      window.removeEventListener("zaki:open-create-space", handleOpenCreateSpace);
      window.removeEventListener("zaki:view-library", handleViewLibrary);
      window.removeEventListener("zaki:view-space", handleViewSpace);
      window.removeEventListener("zaki:edit-space-instructions", handleEditSpaceInstructions);
      window.removeEventListener("zaki:upload-space-files", handleUploadSpaceFiles);
      window.removeEventListener("zaki:view-zaki-home", handleViewZakiHome);
    };
  }, [activeWorkspaceSlug, clearThread, goHome, goToLibrary, goToSpaces, spacesList]);

  useEffect(() => {
    return () => {
      if (memoryFlushTimerRef.current) {
        window.clearTimeout(memoryFlushTimerRef.current);
      }
      if (autoDismissTimerRef.current) {
        window.clearTimeout(autoDismissTimerRef.current);
      }
    };
  }, []);

  // Render main content based on view
  const renderContent = () => {
    if (showLibraryView) {
      return (
        <LibraryView
          spacesList={spacesList}
          librarySlug={librarySlug}
          setLibrarySlug={setLibrarySlug}
          libraryQuery={libraryQuery}
          setLibraryQuery={setLibraryQuery}
          libraryResults={libraryResults}
          libraryLoading={libraryLoading}
          libraryError={libraryError}
          onSearch={runLibrarySearch}
        />
      );
    }

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
      return <ReadyState ref={readyRef} onStartChat={handleStartChat} onSelectExample={handleExampleSelect} />;
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
      className="zaki-chat flex-1 relative flex flex-col h-full bg-transparent"
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
          setAttachments((prev) => [...prev, ...files]);
        }
      }}
    >
      {/* Drag overlay */}
      {dragActive && (
        <div className="absolute inset-0 z-30 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
          <div className="rounded-zaki-lg border border-zaki bg-white px-5 py-3 text-sm text-zaki-secondary shadow-[0px_10px_24px_rgba(15,15,15,0.12)]">
            Drop files to attach
          </div>
        </div>
      )}

      <div className="relative h-full rounded-none border-0 bg-transparent overflow-hidden flex flex-col">
        {/* Background */}
        <BackgroundPattern />

        <div className="relative z-20 flex flex-col h-full">
          {/* Header / Breadcrumb */}
          {!showZakiHome ? (
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
                  aria-label="Share conversation"
                >
                  <Share2 className="size-4 text-zaki-muted" />
                  Share
                </button>
                <button
                  type="button"
                  className="size-11 md:size-8 rounded-full border border-zaki-subtle bg-white/80 flex items-center justify-center text-zaki-muted hover:bg-zaki-hover transition-colors focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="More options"
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
                      aria-label="Review memories"
                    >
                      <Brain className="size-4 text-zaki-muted" />
                      Review Memories
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
                      aria-label="Export conversation as JSON"
                    >
                      <Download className="size-4 text-zaki-muted" />
                      Export JSON
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
            className="flex-1 relative z-10 overflow-y-auto zaki-scrollbar-fade"
            ref={scrollRef}
            style={{
              paddingBottom:
                !showZakiHome && !showLibraryView && !showSpacesView && !showSpaceDetail
                  ? Math.max(24, inputHeight + 24)
                  : undefined,
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

          {showScrollToBottom && !showZakiHome && !showLibraryView && !showSpacesView && !showSpaceDetail && (
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
                aria-label="Scroll to bottom"
              >
                <ChevronDown className="size-5 mx-auto" />
              </button>
            </div>
          )}

          {/* Input Area */}
          {!showZakiHome && !showLibraryView && !showSpacesView && !showSpaceDetail && (
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
                webSearchEnabled={webSearchEnabled}
                onToggleWebSearch={() => setWebSearchEnabled((prev) => !prev)}
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
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length && fileUploadSpaceId) {
                const pinnedFiles = files.map((file) => ({
                  name: file.name,
                  type: file.type,
                  size: file.size,
                }));
                window.dispatchEvent(
                  new CustomEvent("zaki:update-space", {
                    detail: { id: fileUploadSpaceId, pinnedFiles },
                  })
                );
              }
              setFileUploadSpaceId(null);
              event.target.value = "";
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
      {showMemoryToast && pendingMemories.length > 0 && authUser?.username && (
        <MemoryRail
          memoryMode={pendingMemories.some((m) => m._mode === "manual") ? "manual" : memoryMode}
          memories={
            pendingMemories.some((m) => m._mode === "manual")
              ? pendingMemories.filter((m) => m._mode === "manual")
              : pendingMemories.filter((m) => m._mode === "autosave")
          }
          userId={authUser.username}
          position={toastPosition}
          onResolve={(resolvedId) => {
            setPendingMemories((prev) => {
              const next = prev.filter((m) => (m.confirmationId || m.id) !== resolvedId);
              if (next.filter((m) => m._mode === "manual").length === 0) {
                setShowMemoryToast(false);
              }
              return next;
            });
          }}
          onDismiss={() => {
            setShowMemoryToast(false);
            setPendingMemories((prev) => prev.filter((m) => m._mode !== "autosave"));
          }}
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
      {authUser?.username && (
        <MemoryConfirmationPanel
          userId={authUser.username}
          isOpen={showMemoryPanel}
          onClose={() => setShowMemoryPanel(false)}
        />
      )}
    </div>
  );
}
