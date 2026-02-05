import { BackgroundPattern } from "./BackgroundPattern";
import { InputArea } from "./InputArea";
import { Share2, MoreVertical, Download, Brain } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/api";
import {
  LibraryView,
  SpacesView,
  ZakiHomeView,
  SpaceDetailView,
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

export function ChatArea() {
  useAuthStore(); // For auth context, values used elsewhere
  const {
    view,
    threadId: activeThreadId,
    spaceId: activeWorkspaceSlug,
    goHome,
    goToSpaces,
    goToLibrary,
    goToSpace,
    goToThread,
    clearThread,
  } = useNavigationStore();

  // View states
  const showZakiHome = view === "home";
  const showSpacesView = view === "spaces";
  const showLibraryView = view === "library";
  const showSpaceDetail = view === "space-detail";

  // Message state
  const [messagesByThread, setMessagesByThread] = useState<Record<string, Message[]>>({});
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [firstMessageTransition, setFirstMessageTransition] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  // Memory state - works for both auto-save and manual modes
  const [pendingMemories, setPendingMemories] = useState<Array<{id: string; content: string; type: string; confirmationId?: string}>>([]);
  const [showMemoryToast, setShowMemoryToast] = useState(false);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const authUser = useAuthStore((s) => s.user);
  
  // Memory mode: autosave (default) or manual
  const [memoryMode, setMemoryMode] = useMemoryMode();

  // Clear pending memories when switching modes to prevent stale state
  const prevModeRef = useRef(memoryMode);
  useEffect(() => {
    if (prevModeRef.current !== memoryMode) {
      // Mode changed - clear pending memories and hide toast
      setPendingMemories([]);
      setShowMemoryToast(false);
      prevModeRef.current = memoryMode;
    }
  }, [memoryMode]);

  // UI state
  const [dragActive, setDragActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const [editInstructionsOpen, setEditInstructionsOpen] = useState(false);
  const [editInstructionsValue, setEditInstructionsValue] = useState("");
  const [inputOffset, setInputOffset] = useState(0);

  // Spaces state
  const [spacesList, setSpacesList] = useState<Space[]>([]);
  const [spaceDetail, setSpaceDetail] = useState<Space | null>(null);

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

  // Computed values
  const messages = activeThreadId ? messagesByThread[activeThreadId] ?? [] : [];
  const showReady = !activeThreadId || messages.length === 0;
  const primarySpace = spacesList[0] ?? null;
  const activeSpace = spacesList.find((space) => space.id === activeWorkspaceSlug) ?? null;
  const activeThread = activeSpace?.threads?.find((thread) => thread.id === activeThreadId) ?? null;
  const headerSpaceName = activeSpace?.title || "Space";
  const headerThreadName = activeThread?.label || "New chat";

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

  // Load thread history
  const loadThreadHistory = useCallback(async (workspaceSlug: string, threadSlug: string) => {
    setIsHistoryLoading(true);
    try {
      const response = await apiRequest(`/workspace/${workspaceSlug}/thread/${threadSlug}/chats`);
      if (!response.ok) {
        throw new Error("Unable to load chats.");
      }
      const data = (await response.json()) as {
        history?: {
          role: "user" | "assistant";
          content: string;
          chatId?: number;
          attachments?: { name: string; type: string; url: string }[];
        }[];
      };
      const loadedMessages = data.history?.map((entry, index) => ({
        id: entry.chatId ? `${entry.chatId}-${entry.role}-${index}` : `${entry.role}-${index}`,
        role: entry.role,
        // Strip memory context from user messages
        content: entry.role === 'user' ? stripMemoryContext(entry.content ?? "") : (entry.content ?? ""),
        attachments: entry.attachments,
        chatId: entry.chatId,
      })) ?? [];
      setMessagesByThread((prev) => ({
        ...prev,
        [threadSlug]: loadedMessages,
      }));
    } catch (error) {
      console.error('[ChatArea] Failed to load history:', error);
      // Only show toast if this isn't the initial load (avoid spam on app start)
      if (messagesByThread[threadSlug]) {
        toast.error("Unable to load chat history");
      }
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

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
  const checkForSavedMemories = useCallback(async (message: string) => {
    // Note: username is the email in ZAKI's auth system
    if (!authUser?.username) return;
    
    const endpoint = memoryMode === "autosave" 
      ? "/api/memory/autosave" 
      : "/api/memory/preview";
    
    try {
      const response = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify({
          userId: authUser.username,
          message,
          threadId: activeThreadId,
        }),
      });
      
      if (!response.ok) return;
      
      const data = await response.json();
      
      // Different response shapes for different modes
      const memories = memoryMode === "autosave" 
        ? (data.saved || [])
        : (data.pending || []);
      
      if (memories.length > 0) {
        setPendingMemories(memories);
        setShowMemoryToast(true);
      }
    } catch (err) {
      // Silent fail - not critical for chat
      console.log("[Memory] Check failed:", err);
    }
  }, [authUser?.username, activeThreadId, memoryMode]);

  // Handle send message
  const handleSend = useCallback(async (text: string, files: File[]) => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Message is empty");
      return;
    }
    if (isStreaming) return;
    if (!activeWorkspaceSlug) {
      toast.error("Select a workspace before sending a message");
      return;
    }

    let threadId = activeThreadId;
    if (!threadId) {
      try {
        const response = await apiRequest(`/workspace/${activeWorkspaceSlug}/thread/new`, {
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
            detail: { id: threadId, label, spaceId: activeWorkspaceSlug },
          })
        );
      } catch (error) {
        toast.error("Unable to start a new chat");
        return;
      }
    }

    if (!activeThreadId) return;

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
      [activeThreadId]: [
        ...(prev[activeThreadId] ?? []),
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
        workspaceSlug: activeWorkspaceSlug,
        threadSlug: activeThreadId,
        message: sendText,
        assistantId: assistantMessageId,
      });
      
      // P0 Fix: Check for auto-saved memories after response
      await checkForSavedMemories(trimmed);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send message");
    } finally {
      setIsStreaming(false);
    }
  }, [activeWorkspaceSlug, activeThreadId, isStreaming, streamChatMessage, checkForSavedMemories]);

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

  // Load thread history effect
  useEffect(() => {
    if (!activeThreadId || !activeWorkspaceSlug) return;
    if (messagesByThread[activeThreadId]?.length) return;
    loadThreadHistory(activeWorkspaceSlug, activeThreadId);
  }, [activeThreadId, activeWorkspaceSlug, messagesByThread, loadThreadHistory]);

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
      if (!showReady || showLibraryView || showSpacesView || showSpaceDetail) {
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
      if (spaceDetail && activeWorkspaceSlug) {
        const updated = detail?.spaces?.find((space) => space.id === spaceDetail.id);
        if (updated) {
          setSpaceDetail(updated);
        }
      }
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
      const selected = spacesList.find((space) => space.id === detail?.id) ?? null;
      setSpaceDetail(selected);
      if (detail?.id) {
        goToSpace(detail.id);
      }
      setAttachments([]);
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
    window.addEventListener("zaki:view-zaki-home", handleViewZakiHome);

    return () => {
      window.removeEventListener("zaki:clear-thread", handleClearThread);
      window.removeEventListener("zaki:view-spaces", handleViewSpaces);
      window.removeEventListener("zaki:spaces-data", handleSpacesData);
      window.removeEventListener("zaki:open-create-space", handleOpenCreateSpace);
      window.removeEventListener("zaki:view-library", handleViewLibrary);
      window.removeEventListener("zaki:view-space", handleViewSpace);
      window.removeEventListener("zaki:view-zaki-home", handleViewZakiHome);
    };
  }, [activeWorkspaceSlug, clearThread, goHome, goToLibrary, goToSpace, goToSpaces, spaceDetail, spacesList]);

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

    if (showSpaceDetail && spaceDetail) {
      return (
        <SpaceDetailView
          spaceDetail={spaceDetail}
          attachments={attachments}
          setAttachments={setAttachments}
          isStreaming={isStreaming}
          webSearchEnabled={webSearchEnabled}
          onToggleWebSearch={() => setWebSearchEnabled((prev) => !prev)}
          onSend={handleSend}
          onGoToSpaces={goToSpaces}
          onGoToThread={goToThread}
          onCreateThread={(spaceId) => {
            window.dispatchEvent(new CustomEvent("zaki:create-thread", { detail: { spaceId } }));
          }}
          onUpdateSpace={(id, updates) => {
            window.dispatchEvent(new CustomEvent("zaki:update-space", { detail: { id, ...updates } }));
          }}
          onDeleteThread={(threadId) => {
            window.dispatchEvent(new CustomEvent("zaki:delete-thread", { detail: { id: threadId, spaceId: spaceDetail.id } }));
          }}
          onEditInstructions={(instructions) => {
            setEditInstructionsValue(instructions);
            setEditInstructionsOpen(true);
          }}
          onUploadFiles={() => fileInputRef.current?.click()}
        />
      );
    }

    if (showReady) {
      return <ReadyState ref={readyRef} />;
    }

    return (
      <ChatView
        messages={messages}
        isHistoryLoading={isHistoryLoading}
        isStreaming={isStreaming}
        firstMessageTransition={firstMessageTransition}
      />
    );
  };

  return (
    <div
      ref={containerRef}
      className="zaki-chat flex-1 relative flex flex-col h-full bg-white"
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

      <div className="relative h-full m-4 rounded-[28px] border border-zaki bg-zaki-base overflow-hidden flex flex-col">
        {/* Background */}
        <BackgroundPattern />

        <div className="relative z-20 flex flex-col h-full">
          {/* Header / Breadcrumb */}
          <div className="px-6 py-4 flex items-center gap-2">
            <span className="text-zaki-muted text-sm">{headerSpaceName}</span>
            <span className="text-zaki-disabled text-sm">/</span>
            <div className="flex items-center gap-1 cursor-pointer hover:bg-zaki-hover px-1 py-0.5 rounded">
              <span className="text-zaki-primary text-sm font-medium">{headerThreadName}</span>
            </div>
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

          {/* Main Content */}
          <div
            className="flex-1 relative z-10 overflow-y-auto"
            ref={scrollRef}
            onScroll={() => {
              if (!scrollRef.current) return;
              const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
              autoScrollRef.current = scrollTop + clientHeight >= scrollHeight - 48;
            }}
          >
            {renderContent()}
          </div>

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
              if (files.length && spaceDetail) {
                const pinnedFiles = files.map((file) => ({
                  name: file.name,
                  type: file.type,
                  size: file.size,
                }));
                window.dispatchEvent(
                  new CustomEvent("zaki:update-space", {
                    detail: { id: spaceDetail.id, pinnedFiles },
                  })
                );
              }
              event.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Modals */}
      <EditInstructionsModal
        isOpen={editInstructionsOpen}
        initialValue={editInstructionsValue}
        onClose={() => setEditInstructionsOpen(false)}
        onSave={(instructions) => {
          if (spaceDetail) {
            window.dispatchEvent(
              new CustomEvent("zaki:update-space", {
                detail: { id: spaceDetail.id, instructions },
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
        memoryMode === "autosave" ? (
          <AutoSaveToast
            userId={authUser.username}
            memories={pendingMemories}
            onDismiss={() => setShowMemoryToast(false)}
          />
        ) : (
          <MemoryToast
            userId={authUser.username}
            memories={pendingMemories.map(m => ({
              ...m,
              confirmationId: m.confirmationId || m.id, // Fallback to id if no confirmationId
            }))}
            onDismiss={() => setShowMemoryToast(false)}
          />
        )
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
