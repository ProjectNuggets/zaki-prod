import { BackgroundPattern } from "./BackgroundPattern";
import { InputArea } from "./InputArea";
import { ChevronDownIcon, CenterLogo } from "./icons";
import { Copy, RefreshCw, ThumbsUp, MoreVertical, Share2, Download, File as FileIcon, X, Search, Pencil, Folder, Briefcase, BookOpen, GraduationCap, Sparkles, Palette } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: { name: string; type: string; url: string }[];
}

export function ChatArea() {
  const [messagesByThread, setMessagesByThread] = useState<Record<string, Message[]>>({});
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSpacesView, setShowSpacesView] = useState(false);
  const [spacesList, setSpacesList] = useState<{
    id: string;
    title: string;
    description?: string;
    instructions?: string;
    pinnedFiles?: { name: string; type: string; size: number }[];
    icon?: string;
    color?: string;
    fixed?: boolean;
    threads?: { id: string; label: string }[];
  }[]>([]);
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const [spaceName, setSpaceName] = useState("");
  const [spaceDescription, setSpaceDescription] = useState("");
  const [spaceInstructions, setSpaceInstructions] = useState("");
  const [spaceFiles, setSpaceFiles] = useState<File[]>([]);
  const [showLibraryView, setShowLibraryView] = useState(false);
  const [showSpaceDetail, setShowSpaceDetail] = useState(false);
  const [showZakiHome, setShowZakiHome] = useState(false);
  const [spaceDetail, setSpaceDetail] = useState<{
    id: string;
    title: string;
    description?: string;
    instructions?: string;
    pinnedFiles?: { name: string; type: string; size: number }[];
    icon?: string;
    color?: string;
    fixed?: boolean;
    threads?: { id: string; label: string }[];
  } | null>(null);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const iconPickerRef = useRef<HTMLDivElement>(null);
  const [editInstructionsOpen, setEditInstructionsOpen] = useState(false);
  const [editInstructionsValue, setEditInstructionsValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [zakiMenuOpen, setZakiMenuOpen] = useState(false);
  const [zakiThreadMenuOpen, setZakiThreadMenuOpen] = useState<string | null>(null);
  const zakiMenuRef = useRef<HTMLDivElement>(null);
  const zakiThreadMenuRef = useRef<HTMLDivElement>(null);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [librarySlug, setLibrarySlug] = useState("");
  const [libraryResults, setLibraryResults] = useState<{ id: string; text: string; score?: number; metadata?: Record<string, string> }[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragCounter = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  const serializeChat = () => {
    const messages = activeThreadId ? messagesByThread[activeThreadId] ?? [] : [];
    return {
      exportedAt: new Date().toISOString(),
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        attachments: msg.attachments?.map((attachment) => ({
          name: attachment.name,
          type: attachment.type,
          url: attachment.url,
        })),
      })),
    };
  };

  const handleShare = async () => {
    const payload = serializeChat();
    const text = payload.messages
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join("\n\n")
      .trim();
    const shareText = text || "Shared chat from Zaki";

    try {
      if (navigator.share) {
        await navigator.share({ title: "Zaki Chat", text: shareText });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
      }
    } finally {
      setMenuOpen(false);
    }
  };

  const handleExport = () => {
    const payload = serializeChat();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "zaki-chat-export.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
  };

  const handleSend = (text: string, files: File[]) => {
    const threadId = activeThreadId ?? `thread-${Date.now()}`;
    if (!activeThreadId) {
      const title = text.trim().split(/\n+/)[0].slice(0, 48) || "New chat";
      window.dispatchEvent(new CustomEvent("zaki:thread-created", { detail: { id: threadId, label: title } }));
      setActiveThreadId(threadId);
      setShowZakiHome(false);
      setShowSpaceDetail(false);
      setShowSpacesView(false);
      setShowLibraryView(false);
    }
    const attachmentsForMessage = files
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file),
      }));
    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      attachments: attachmentsForMessage.length ? attachmentsForMessage : undefined,
    };
    setMessagesByThread((prev) => ({
      ...prev,
      [threadId]: [...(prev[threadId] ?? []), newUserMsg],
    }));
    setAttachments([]);
    
    // Mock response
    setTimeout(() => {
      setMessagesByThread((prev) => ({
        ...prev,
        [threadId]: [
          ...(prev[threadId] ?? []),
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: "I am Zaki, your AI assistant. I can help you with research, analysis, and writing in both Arabic and English. How can I assist you further?"
          },
        ],
      }));
    }, 1000);
  };

  useEffect(() => {
    if (scrollRef.current && autoScrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeThreadId, messagesByThread]);

  useEffect(() => {
    window.dispatchEvent(new Event("zaki:request-spaces"));
    const handleSelectThread = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string | null }>).detail;
      setActiveThreadId(detail?.id ?? null);
      setShowSpacesView(false);
      setShowLibraryView(false);
      setShowZakiHome(false);
    };
    const handleClearThread = () => {
      setActiveThreadId(null);
      setAttachments([]);
    };
    const handleViewSpaces = () => {
      setShowSpacesView(true);
      setActiveThreadId(null);
      setAttachments([]);
      setShowLibraryView(false);
      setShowZakiHome(false);
    };
    const handleSpacesData = (event: Event) => {
      const detail = (event as CustomEvent<{
        spaces: {
          id: string;
          title: string;
          description?: string;
          instructions?: string;
          pinnedFiles?: { name: string; type: string; size: number }[];
          icon?: string;
          color?: string;
          fixed?: boolean;
          threads?: { id: string; label: string }[];
        }[];
      }>).detail;
      setSpacesList(detail?.spaces ?? []);
      if (spaceDetail) {
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
      setShowLibraryView(true);
      setShowSpacesView(false);
      setShowSpaceDetail(false);
      setShowZakiHome(false);
      setActiveThreadId(null);
      setAttachments([]);
    };
    const handleViewSpace = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string }>).detail;
      const selected = spacesList.find((space) => space.id === detail?.id) ?? null;
      setSpaceDetail(selected);
      setShowZakiHome(false);
      setShowSpaceDetail(true);
      setShowSpacesView(false);
      setShowLibraryView(false);
      setActiveThreadId(null);
      setAttachments([]);
    };
    const handleViewZakiHome = () => {
      setShowZakiHome(true);
      setShowSpaceDetail(false);
      setShowSpacesView(false);
      setShowLibraryView(false);
      setActiveThreadId(null);
      setAttachments([]);
    };
    window.addEventListener("zaki:select-thread", handleSelectThread);
    window.addEventListener("zaki:clear-thread", handleClearThread);
    window.addEventListener("zaki:view-spaces", handleViewSpaces);
    window.addEventListener("zaki:spaces-data", handleSpacesData);
    window.addEventListener("zaki:open-create-space", handleOpenCreateSpace);
    window.addEventListener("zaki:view-library", handleViewLibrary);
    window.addEventListener("zaki:view-space", handleViewSpace);
    window.addEventListener("zaki:view-zaki-home", handleViewZakiHome);
    return () => {
      window.removeEventListener("zaki:select-thread", handleSelectThread);
      window.removeEventListener("zaki:clear-thread", handleClearThread);
      window.removeEventListener("zaki:view-spaces", handleViewSpaces);
      window.removeEventListener("zaki:spaces-data", handleSpacesData);
      window.removeEventListener("zaki:open-create-space", handleOpenCreateSpace);
      window.removeEventListener("zaki:view-library", handleViewLibrary);
      window.removeEventListener("zaki:view-space", handleViewSpace);
      window.removeEventListener("zaki:view-zaki-home", handleViewZakiHome);
    };
  }, [spacesList, spaceDetail]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (iconPickerRef.current && !iconPickerRef.current.contains(event.target as Node)) {
        setIconPickerOpen(false);
      }
    };
    if (iconPickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [iconPickerOpen]);

  useEffect(() => {
    const handleZakiOutside = (event: MouseEvent) => {
      if (zakiMenuRef.current && !zakiMenuRef.current.contains(event.target as Node)) {
        setZakiMenuOpen(false);
      }
      if (zakiThreadMenuRef.current && !zakiThreadMenuRef.current.contains(event.target as Node)) {
        setZakiThreadMenuOpen(null);
      }
    };
    if (zakiMenuOpen || zakiThreadMenuOpen) {
      document.addEventListener("mousedown", handleZakiOutside);
    }
    return () => document.removeEventListener("mousedown", handleZakiOutside);
  }, [zakiMenuOpen, zakiThreadMenuOpen]);

  useEffect(() => {
    if (showSpacesView || showLibraryView || showSpaceDetail) {
      window.dispatchEvent(new Event("zaki:request-spaces"));
    }
  }, [showSpacesView, showLibraryView, showSpaceDetail]);

  const messages = activeThreadId ? messagesByThread[activeThreadId] ?? [] : [];
  const showReady = !activeThreadId || messages.length === 0;
  const zakiExamples = [
    "Draft a bold brand manifesto for a rebellious fintech.",
    "Summarize this meeting and pull out the 3 real decisions.",
    "Give me a brutally honest UX critique of this flow.",
  ];
  const zakiRamadanExamples = [
    "Suggest a cozy iftar menu for tonight with one protein, one side, one drink.",
    "Tell me when my favorite series airs and which channel it's on.",
    "Write a short, warm Ramadan greeting I can send to my team.",
  ];
  const zakiCapabilities = [
    "Fast synthesis, sharper wording, fewer fluff calories.",
    "Keeps your tone consistent across docs and decks.",
    "Turns chaos into checklists, calmly and without judgement.",
  ];
  const zakiLimitations = [
    "May occasionally hallucinate; verify critical facts.",
    "No mind-reading (yet). Clarity in = magic out.",
    "Not a lawyer, doctor, or your ex’s therapist.",
  ];
  const iconOptions = [
    { id: "folder", icon: Folder },
    { id: "briefcase", icon: Briefcase },
    { id: "book", icon: BookOpen },
    { id: "graduation", icon: GraduationCap },
    { id: "sparkles", icon: Sparkles },
    { id: "palette", icon: Palette },
  ];
  const colorOptions = ["#E24A3B", "#F57C1F", "#F2B705", "#20A559", "#2F7EEA", "#7B4BE4", "#FF6FB1"];
  const zakiSpace = spacesList.find((space) => space.id === "zaki");

  const toSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const runLibrarySearch = async () => {
    if (!librarySlug || !libraryQuery.trim()) {
      return;
    }
    setLibraryLoading(true);
    setLibraryError("");
    try {
      const baseUrl = (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE_URL ?? "";
      const response = await fetch(`${baseUrl}/v1/workspace/${librarySlug}/vector-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: libraryQuery, topN: 5, scoreThreshold: 0.5 }),
      });
      if (!response.ok) {
        throw new Error("Search failed");
      }
      const data = (await response.json()) as { results?: { id: string; text: string; score?: number; metadata?: Record<string, string> }[] };
      setLibraryResults(data.results ?? []);
    } catch (error) {
      setLibraryError("Unable to fetch results. Check your workspace slug or API configuration.");
    } finally {
      setLibraryLoading(false);
    }
  };

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

  return (
    <div
      className="flex-1 relative flex flex-col h-full bg-white"
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
      {dragActive && (
        <div className="absolute inset-0 z-30 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
          <div className="rounded-2xl border border-[#e9dfd2] bg-white px-5 py-3 text-sm text-[#655543] shadow-[0px_10px_24px_rgba(15,15,15,0.12)]">
            Drop files to attach
          </div>
        </div>
      )}
      <div className="relative h-full m-4 rounded-[28px] border border-[#e9dfd2] bg-[#FFFBF5] overflow-hidden flex flex-col">
        {/* Background */}
        <BackgroundPattern />

        <div className="relative z-20 flex flex-col h-full">
          {/* Header / Breadcrumb */}
          <div className="px-6 py-4 flex items-center gap-2">
            <span className="text-[#b09472] text-sm">Research & Analysis</span>
            <span className="text-[#a3a3a3] text-sm">/</span>
            <div className="flex items-center gap-1 cursor-pointer hover:bg-[#F8F2E9] px-1 py-0.5 rounded">
               <span className="text-[#1f1a14] text-sm font-medium">New chat</span>
               <div className="bg-[#f8f2e9] rounded p-0.5">
                 <ChevronDownIcon color="#B09472" />
               </div>
            </div>
            <div className="ml-auto relative" ref={menuRef}>
              <button
                type="button"
                className="size-8 rounded-full border border-[#ebebeb] bg-white/80 flex items-center justify-center text-[#88735A] hover:bg-[#f8f2e9] transition-colors"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <MoreVertical className="size-4" />
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-40 rounded-2xl border border-[#EBEBEB] bg-white shadow-[0px_14px_30px_rgba(15,15,15,0.12)] p-1"
                  role="menu"
                >
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[#1f1a14] hover:bg-[#f8f2e9] transition-colors"
                    role="menuitem"
                    onClick={handleShare}
                  >
                    <Share2 className="size-4 text-[#88735A]" />
                    Share
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[#1f1a14] hover:bg-[#f8f2e9] transition-colors"
                    role="menuitem"
                    onClick={handleExport}
                  >
                    <Download className="size-4 text-[#88735A]" />
                    Export
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
        {showLibraryView ? (
          <div className="px-10 py-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-10 rounded-full bg-[#f6efe6] flex items-center justify-center text-[#88735A] text-xs font-semibold">LB</div>
              <div>
                <div className="text-lg font-semibold text-[#1f1a14]">Library</div>
                <div className="text-sm text-[#a3a3a3]">Search pinned documents inside each workspace</div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              <div className="rounded-2xl border border-[#efe4d6] bg-white p-4">
                <div className="text-xs text-[#88735A] font-semibold mb-3">Workspaces</div>
                <div className="flex flex-col gap-2">
                  {spacesList.map((space) => {
                    const slug = toSlug(space.title);
                    return (
                      <button
                        key={space.id}
                        type="button"
                        className={librarySlug === slug
                          ? "rounded-xl border border-[#e7dbc9] bg-[#f8f2e9] px-3 py-2 text-left text-sm text-[#1f1a14]"
                          : "rounded-xl border border-transparent hover:bg-[#f8f2e9] px-3 py-2 text-left text-sm text-[#655543]"
                        }
                        onClick={() => setLibrarySlug(slug)}
                      >
                        <div className="text-sm font-medium">{space.title}</div>
                        <div className="text-xs text-[#a3a3a3] truncate">{space.description || "Workspace documents"}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-2xl border border-[#efe4d6] bg-white p-5">
                <div className="text-sm font-semibold text-[#1f1a14]">Vector search</div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 rounded-full border border-[#efe4d6] bg-[#fffdfa] px-3 py-2 text-sm">
                    <Search className="size-4 text-[#b09472]" />
                    <input
                      className="flex-1 bg-transparent outline-none text-[#1f1a14] placeholder-[#b09472]"
                      placeholder="Search within selected workspace"
                      value={libraryQuery}
                      onChange={(event) => setLibraryQuery(event.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="rounded-full bg-[#1f1a14] text-white text-sm px-4 py-2 hover:bg-[#2b241c] transition-colors"
                    onClick={runLibrarySearch}
                    disabled={libraryLoading}
                  >
                    {libraryLoading ? "Searching..." : "Search"}
                  </button>
                </div>
                {libraryError && (
                  <div className="mt-3 text-sm text-[#d24430]">{libraryError}</div>
                )}
                <div className="mt-4 flex flex-col gap-3">
                  {libraryResults.length === 0 && !libraryLoading && (
                    <div className="text-sm text-[#a3a3a3]">No results yet. Choose a workspace and search.</div>
                  )}
                  {libraryResults.map((result) => (
                    <div key={result.id} className="rounded-2xl border border-[#efe4d6] bg-[#fffdfa] p-4">
                      <div className="text-xs text-[#88735A]">Score: {result.score?.toFixed(2) ?? "N/A"}</div>
                      <div className="text-sm text-[#1f1a14] mt-2 whitespace-pre-line">{result.text}</div>
                      {result.metadata?.title && (
                        <div className="text-xs text-[#a3a3a3] mt-2">Source: {result.metadata.title}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : showSpacesView ? (
          <div className="px-10 py-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-10 rounded-full bg-[#f6efe6] flex items-center justify-center text-[#88735A] text-xs font-semibold">SP</div>
              <div>
                <div className="text-lg font-semibold text-[#1f1a14]">Spaces</div>
                <div className="text-sm text-[#a3a3a3]">Manage and explore your spaces in one place</div>
              </div>
              <button
                type="button"
                className="ml-auto rounded-full bg-[#655543] text-white text-sm px-4 py-2 hover:bg-[#D24430] active:scale-[0.98] transition-[transform,background-color]"
                onClick={() => setCreateSpaceOpen(true)}
              >
                Create new space
              </button>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 rounded-full border border-[#efe4d6] bg-white px-4 py-2 text-sm text-[#b09472]">
                Search spaces...
              </div>
              <button className="text-sm text-[#88735A]">Sort by recent</button>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {spacesList.map((space) => (
                <div
                  key={space.id}
                  className="rounded-2xl border border-[#efe4d6] bg-white p-4 shadow-[0px_6px_18px_rgba(15,15,15,0.06)]"
                  role="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("zaki:view-space", { detail: { id: space.id } }));
                  }}
                >
                  <div className="text-sm font-semibold text-[#1f1a14]">{space.title}</div>
                  <div className="text-xs text-[#a3a3a3] mt-1">
                    {space.description || "Space description"}
                  </div>
                  <div className="text-[10px] text-[#c1b6a5] mt-3">Updated recently</div>
                </div>
              ))}
            </div>
          </div>
        ) : showZakiHome ? (
          <div className="px-10 py-12">
            <div className="flex items-center justify-between mb-10">
              <div className="flex-1 flex flex-col items-center gap-1">
                <div className="text-xl font-semibold text-[#1f1a14] tracking-tight">ZAKI</div>
                <div className="text-base text-[#a3a3a3]">ZAKI understands.</div>
              </div>
              <div className="relative" ref={zakiMenuRef}>
                <button
                  type="button"
                  className="size-9 rounded-full border border-[#efe4d6] bg-white flex items-center justify-center text-[#88735A] hover:bg-[#f8f2e9] transition-colors"
                  onClick={() => setZakiMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={zakiMenuOpen}
                >
                  <MoreVertical className="size-4" />
                </button>
                {zakiMenuOpen && (
                  <div className="absolute right-0 mt-2 w-40 rounded-2xl border border-[#EBEBEB] bg-white shadow-[0px_14px_30px_rgba(15,15,15,0.12)] p-1">
                    <button className="w-full text-left px-3 py-2 text-sm text-[#1f1a14] hover:bg-[#f8f2e9] rounded-xl" type="button">
                      About ZAKI
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-[#d24430] hover:bg-[#fff3f0] rounded-xl" type="button">
                      Clear chats
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-[#efe4d6] bg-[#fff8f0] p-5 shadow-[0px_18px_40px_rgba(15,15,15,0.08)]">
                <div className="text-[11px] text-[#D24430] font-semibold mb-4 uppercase tracking-wider">Examples</div>
                <div className="flex flex-col gap-3">
                  {zakiExamples.map((example) => (
                    <button
                      key={example}
                      type="button"
                      className="rounded-2xl border border-[#f1dbc5] bg-white px-4 py-3 text-sm text-[#1f1a14] text-left hover:bg-[#f8f2e9] hover:shadow-[0px_8px_18px_rgba(15,15,15,0.08)] transition-all border-l-4 border-l-[#D24430]"
                      onClick={() => handleSend(example, [])}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-[#efe4d6] bg-[#fff8f0] p-5 shadow-[0px_18px_40px_rgba(15,15,15,0.08)]">
                <div className="text-[11px] text-[#D24430] font-semibold mb-4 uppercase tracking-wider">Examples · Ramadan Special</div>
                <div className="flex flex-col gap-3">
                  {zakiRamadanExamples.map((example) => (
                    <button
                      key={example}
                      type="button"
                      className="rounded-2xl border border-[#f1dbc5] bg-white px-4 py-3 text-sm text-[#1f1a14] text-left hover:bg-[#f8f2e9] hover:shadow-[0px_8px_18px_rgba(15,15,15,0.08)] transition-all border-l-4 border-l-[#D24430]"
                      onClick={() => handleSend(example, [])}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2 mt-6">
              <div className="rounded-3xl border border-[#efe4d6] bg-white/90 p-5 shadow-[0px_18px_40px_rgba(15,15,15,0.08)]">
                <div className="text-[11px] text-[#88735A] font-semibold mb-4 uppercase tracking-wider">Capabilities</div>
                <div className="flex flex-col gap-3 text-sm text-[#1f1a14] text-center">
                  {zakiCapabilities.map((item) => (
                    <div key={item} className="rounded-2xl border border-[#efe4d6] bg-[#fffdfa] px-4 py-3">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-[#efe4d6] bg-white/90 p-5 shadow-[0px_18px_40px_rgba(15,15,15,0.08)]">
                <div className="text-[11px] text-[#88735A] font-semibold mb-4 uppercase tracking-wider">Limitations</div>
                <div className="flex flex-col gap-3 text-sm text-[#1f1a14] text-center">
                  {zakiLimitations.map((item) => (
                    <div key={item} className="rounded-2xl border border-[#efe4d6] bg-[#fffdfa] px-4 py-3">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {zakiSpace && (zakiSpace.threads?.length ?? 0) > 0 && (
              <div className="mt-10">
                <div className="text-xs text-[#88735A] font-semibold mb-3">Recent chats</div>
                <div className="flex flex-col gap-2">
                  {zakiSpace.threads?.map((thread) => (
                    <div key={thread.id} className="flex items-center justify-between rounded-xl border border-[#efe4d6] bg-white px-4 py-3 text-sm text-[#1f1a14]">
                      <button
                        type="button"
                        className="flex-1 text-left font-medium"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent("zaki:select-thread", { detail: { id: thread.id } }));
                        }}
                      >
                        {thread.label}
                      </button>
                      <div className="relative" ref={zakiThreadMenuRef}>
                        <button
                          type="button"
                          className="size-8 rounded-full hover:bg-[#f8f2e9] flex items-center justify-center text-[#88735A]"
                          onClick={() => setZakiThreadMenuOpen((prev) => (prev === thread.id ? null : thread.id))}
                        >
                          <MoreVertical className="size-4" />
                        </button>
                        {zakiThreadMenuOpen === thread.id && (
                          <div className="absolute right-0 mt-2 w-32 rounded-2xl border border-[#EBEBEB] bg-white shadow-[0px_14px_30px_rgba(15,15,15,0.12)] p-1">
                            <button className="w-full text-left px-3 py-2 text-sm text-[#1f1a14] hover:bg-[#f8f2e9] rounded-xl" type="button">
                              Rename
                            </button>
                            <button
                              className="w-full text-left px-3 py-2 text-sm text-[#d24430] hover:bg-[#fff3f0] rounded-xl"
                              type="button"
                              onClick={() => {
                                window.dispatchEvent(new CustomEvent("zaki:delete-thread", { detail: { id: thread.id } }));
                                setZakiThreadMenuOpen(null);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : showSpaceDetail && spaceDetail ? (
          <div className="px-10 py-8">
            <button
              type="button"
              className="text-xs text-[#88735A] hover:text-[#655543] mb-4"
              onClick={() => {
                setShowSpacesView(true);
                setShowSpaceDetail(false);
              }}
            >
              ← All spaces
            </button>
            <div className="flex items-start gap-4">
              <div className="relative">
                <button
                  type="button"
                  className="size-12 rounded-full bg-[#f6efe6] flex items-center justify-center"
                  onClick={() => {
                    if (!spaceDetail.fixed) {
                      setIconPickerOpen((open) => !open);
                    }
                  }}
                  aria-haspopup="menu"
                  aria-expanded={iconPickerOpen}
                >
                  {(() => {
                    if (spaceDetail.icon === "zaki") {
                      return <CenterLogo />;
                    }
                    const Icon = iconOptions.find((option) => option.id === (spaceDetail.icon ?? "folder"))?.icon ?? Folder;
                    return <Icon className="size-5" style={{ color: spaceDetail.color ?? "#88735A" }} />;
                  })()}
                </button>
                {iconPickerOpen && !spaceDetail.fixed && (
                  <div
                    ref={iconPickerRef}
                    className="absolute top-14 left-0 w-[220px] rounded-2xl border border-[#2b2b2b] bg-[#303030] text-white shadow-[0px_18px_36px_rgba(0,0,0,0.35)] p-3 z-30"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className="size-6 rounded-full border border-white/20"
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            window.dispatchEvent(
                              new CustomEvent("zaki:update-space", {
                                detail: { id: spaceDetail.id, color },
                              })
                            );
                          }}
                        />
                      ))}
                    </div>
                    <div className="h-px bg-white/10 mb-3" />
                    <div className="grid grid-cols-6 gap-2">
                      {iconOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className="size-7 rounded-lg hover:bg-white/10 flex items-center justify-center"
                          onClick={() => {
                            window.dispatchEvent(
                              new CustomEvent("zaki:update-space", {
                                detail: { id: spaceDetail.id, icon: option.id },
                              })
                            );
                          }}
                        >
                          <option.icon className="size-4 text-white" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-lg font-semibold text-[#1f1a14]">{spaceDetail.title}</div>
                  <span className="text-[10px] uppercase tracking-wide rounded-full bg-[#efefef] text-[#655543] px-2 py-0.5">Private</span>
                </div>
                <div className="text-sm text-[#a3a3a3] mt-1">{spaceDetail.description}</div>
              </div>
              <button
                type="button"
                className="rounded-full bg-[#655543] text-white text-sm px-4 py-2 hover:bg-[#D24430] active:scale-[0.98] transition-[transform,background-color]"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("zaki:create-thread", { detail: { spaceId: spaceDetail.id } }));
                }}
              >
                New chat
              </button>
            </div>
            <div className="mt-6">
              <InputArea onSend={handleSend} attachments={attachments} setAttachments={setAttachments} />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#efe4d6] bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-[#88735A] font-semibold">Project files</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-xs text-[#88735A] hover:text-[#655543]"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="text-xs text-[#d24430] hover:text-[#b63a28]"
                      onClick={() => {
                        if (spaceDetail?.id) {
                          window.dispatchEvent(
                            new CustomEvent("zaki:update-space", {
                              detail: { id: spaceDetail.id, pinnedFiles: [] },
                            })
                          );
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="text-sm text-[#1f1a14] mt-1">{spaceDetail.pinnedFiles?.length ?? 0} files</div>
              </div>
              <div className="rounded-2xl border border-[#efe4d6] bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-[#88735A] font-semibold">Instructions</div>
                  {!spaceDetail.fixed && (
                    <button
                      type="button"
                      className="text-[#88735A] hover:text-[#655543]"
                      onClick={() => {
                        setEditInstructionsValue(spaceDetail.instructions || "");
                        setEditInstructionsOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  )}
                </div>
                <div className={`text-sm mt-1 ${spaceDetail.fixed ? "text-[#a3a3a3]" : "text-[#1f1a14]"} line-clamp-2`}>
                  {spaceDetail.fixed ? "ZAKI doesn't take instructions from anyone." : (spaceDetail.instructions || "No instructions yet.")}
                </div>
              </div>
            </div>
            <div className="mt-6">
              <div className="text-xs text-[#88735A] font-semibold mb-3">Chats in this space</div>
              <div className="flex flex-col gap-2">
                {(spaceDetail.threads ?? []).map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    className="flex items-center justify-between rounded-xl border border-[#efe4d6] bg-white px-4 py-3 text-sm text-[#1f1a14] hover:bg-[#f8f2e9]"
                  >
                    <span
                      className="font-medium flex-1 text-left"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent("zaki:select-thread", { detail: { id: thread.id } }));
                        setShowSpaceDetail(false);
                      }}
                      role="button"
                    >
                      {thread.label}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#a3a3a3]">Recently updated</span>
                      {spaceDetail.fixed && (
                        <button
                          type="button"
                          className="text-xs text-[#d24430] hover:text-[#b63a28]"
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent("zaki:delete-thread", { detail: { id: thread.id } }));
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </button>
                ))}
                {(!spaceDetail.threads || spaceDetail.threads.length === 0) && (
                  <div className="text-sm text-[#a3a3a3]">No chats yet. Start one above.</div>
                )}
              </div>
            </div>
          </div>
        ) : showReady ? (
          <div className="min-h-full flex flex-col items-center justify-center px-4 py-16">
            <div className="flex flex-col items-center gap-2 mb-6">
              <div className="scale-110">
                <CenterLogo />
              </div>
              <div className="text-[#1f1a14] text-sm font-medium">ZKAI</div>
              <div className="text-[#a3a3a3] text-base">Ready when you are</div>
            </div>
            <div className="w-full max-w-3xl">
              <InputArea onSend={handleSend} attachments={attachments} setAttachments={setAttachments} />
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto pt-20 pb-4 px-4 flex flex-col gap-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end items-start' : 'justify-start items-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="size-8 shrink-0 flex items-start justify-center pt-[6px]">
                     <div className="scale-75"><CenterLogo /></div>
                  </div>
                )}

                <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {msg.attachments.map((attachment) => (
                        <div
                          key={attachment.url}
                          className="size-[88px] overflow-hidden rounded-2xl border border-[#efe4d6] bg-[#faf6f0]"
                        >
                          <img
                            src={attachment.url}
                            alt={attachment.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.content && (
                    <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-[#EADBC8] text-[#1f1a14]' 
                        : 'bg-transparent text-[#1f1a14]'
                    }`}>
                      {msg.content}
                    </div>
                  )}
                  {msg.role === 'assistant' && (
                    <div className="group mt-1 flex items-center gap-3 text-[#a3a3a3]">
                      <button
                        type="button"
                        className="hover:text-[#655543] transition-colors"
                        title="Copy"
                      >
                        <Copy className="size-3.5" />
                      </button>
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          className="hover:text-[#655543] transition-colors"
                          title="Regenerate response"
                        >
                          <RefreshCw className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          className="hover:text-[#655543] transition-colors"
                          title="Good response"
                        >
                          <ThumbsUp className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="size-8 shrink-0 bg-[#faf6f0] rounded-full flex items-center justify-center text-xs font-medium text-[#1f1a14]">
                    TA
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Area */}
      {!showReady && !showLibraryView && !showSpacesView && !showSpaceDetail && (
        <div className="relative z-20">
          <InputArea onSend={handleSend} attachments={attachments} setAttachments={setAttachments} />
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length && spaceDetail) {
            const pinnedFiles = files.map((file) => ({ name: file.name, type: file.type, size: file.size }));
            window.dispatchEvent(
              new CustomEvent("zaki:update-space", {
                detail: { id: spaceDetail.id, pinnedFiles },
              })
            );
          }
          event.target.value = "";
        }}
      />
      {editInstructionsOpen && spaceDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="absolute inset-0" onClick={() => setEditInstructionsOpen(false)} role="button" aria-label="Close instructions edit" />
          <div className="relative w-[420px] max-w-[calc(100%-2rem)] rounded-3xl border border-[#ebe3d6] bg-white shadow-[0px_24px_60px_rgba(15,15,15,0.18)] px-6 py-5">
            <div className="text-lg font-semibold text-[#1f1a14]">Edit instructions</div>
            <div className="mt-4">
              <textarea
                className="w-full rounded-xl border border-[#e7dbc9] px-3 py-2 text-sm text-[#1f1a14] outline-none focus:border-[#b09472] resize-none"
                rows={4}
                value={editInstructionsValue}
                onChange={(event) => setEditInstructionsValue(event.target.value)}
              />
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm text-[#655543] hover:bg-[#f8f2e9] transition-colors"
                onClick={() => setEditInstructionsOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm text-white bg-[#1f1a14] hover:bg-[#2b241c] transition-colors"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("zaki:update-space", {
                      detail: { id: spaceDetail.id, instructions: editInstructionsValue },
                    })
                  );
                  setEditInstructionsOpen(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {createSpaceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="absolute inset-0" onClick={() => setCreateSpaceOpen(false)} role="button" aria-label="Close create space" />
          <div className="relative w-[420px] max-w-[calc(100%-2rem)] rounded-3xl border border-[#ebe3d6] bg-white shadow-[0px_24px_60px_rgba(15,15,15,0.18)] px-6 py-5">
            <div className="text-lg font-semibold text-[#1f1a14]">Create new space</div>
            <div className="mt-2 text-sm text-[#a3a3a3]">Organize chats, files, and ideas in one place.</div>
            <div className="mt-5 flex flex-col gap-3">
              <label className="text-xs text-[#88735A]">
                Space name
                <input
                  className="mt-1 w-full rounded-xl border border-[#e7dbc9] px-3 py-2 text-sm text-[#1f1a14] outline-none focus:border-[#b09472]"
                  value={spaceName}
                  onChange={(event) => setSpaceName(event.target.value)}
                  placeholder="Marketing research"
                />
              </label>
              <label className="text-xs text-[#88735A]">
                Description
                <textarea
                  className="mt-1 w-full rounded-xl border border-[#e7dbc9] px-3 py-2 text-sm text-[#1f1a14] outline-none focus:border-[#b09472] resize-none"
                  rows={3}
                  value={spaceDescription}
                  onChange={(event) => setSpaceDescription(event.target.value)}
                  placeholder="Describe what this space is for"
                />
              </label>
              <label className="text-xs text-[#88735A]">
                Instructions
                <textarea
                  className="mt-1 w-full rounded-xl border border-[#e7dbc9] px-3 py-2 text-sm text-[#1f1a14] outline-none focus:border-[#b09472] resize-none"
                  rows={3}
                  value={spaceInstructions}
                  onChange={(event) => setSpaceInstructions(event.target.value)}
                  placeholder="Add guidance for the assistant in this space"
                />
              </label>
              <div className="text-xs text-[#88735A]">
                Pinned documents
                <div className="mt-2 flex flex-col gap-2">
                  <label className="w-full rounded-xl border border-dashed border-[#e7dbc9] px-3 py-2 text-sm text-[#655543] hover:bg-[#f8f2e9] transition-colors cursor-pointer">
                    Upload documents for this space
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      onChange={(event) => {
                        const files = Array.from(event.target.files ?? []);
                        if (files.length) {
                          setSpaceFiles((prev) => [...prev, ...files]);
                        }
                        event.target.value = "";
                      }}
                    />
                  </label>
                  {spaceFiles.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {spaceFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between rounded-xl border border-[#efe4d6] bg-[#faf6f0] px-3 py-2 text-xs text-[#655543]"
                        >
                          <div className="flex items-center gap-2">
                            <FileIcon className="size-4 text-[#88735A]" />
                            <span className="max-w-[200px] truncate">{file.name}</span>
                          </div>
                          <button
                            type="button"
                            className="text-[#88735A] hover:text-[#655543]"
                            onClick={() =>
                              setSpaceFiles((prev) => prev.filter((_, i) => i !== index))
                            }
                            aria-label={`Remove ${file.name}`}
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm text-[#655543] hover:bg-[#f8f2e9] transition-colors"
                onClick={() => setCreateSpaceOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm text-white bg-[#655543] hover:bg-[#D24430] active:scale-[0.98] transition-[transform,background-color]"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("zaki:create-space", {
                      detail: {
                        name: spaceName,
                        description: spaceDescription,
                        instructions: spaceInstructions,
                        pinnedFiles: spaceFiles.map((file) => ({
                          name: file.name,
                          type: file.type,
                          size: file.size,
                        })),
                      },
                    })
                  );
                  setSpaceName("");
                  setSpaceDescription("");
                  setSpaceInstructions("");
                  setSpaceFiles([]);
                  setCreateSpaceOpen(false);
                }}
              >
                Create space
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
