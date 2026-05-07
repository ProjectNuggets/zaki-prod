import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CheckCircle2,
  ClipboardList,
  Database,
  Layers,
  Loader2,
  MessageSquare,
  NotebookPen,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  LearningBookBlockContent,
  type LearningBookQuizAttempt,
} from "./LearningBookBlockContent";
import { buildLearningBookCreatePayload } from "./learningBookCreatePayload";
import { LearningBookProgressTimeline } from "./LearningBookProgressTimeline";
import {
  emptyLearningBookProgress,
  getLearningBookProgressEventBookId,
  learningBookProgressEventShouldRefresh,
  learningBookProgressHasActivity,
  learningBookProgressIsComplete,
  reduceLearningBookProgressEvent,
  type LearningBookProgress,
  type LearningBookProgressEvent,
} from "./learningBookProgress";
import {
  changeLearningBookBlockType,
  compileLearningBookPage,
  confirmLearningBookProposal,
  confirmLearningBookSpine,
  createLearningBookDeepDive,
  deleteLearningBook,
  deleteLearningBookBlock,
  getLearningBook,
  getLearningBookHealth,
  getLearningNotebook,
  getLearningSession,
  insertLearningBookBlock,
  learningKeys,
  moveLearningBookBlock,
  openLearningSocket,
  rebuildLearningBook,
  recordLearningBookQuizAttempt,
  refreshLearningBookFingerprints,
  regenerateLearningBookBlock,
  setLearningBookPageChatSession,
  type LearningJson,
} from "@/lib/learningApi";
import { cn } from "@/lib/utils";

type Item = Record<string, unknown>;
type BookStatus = "draft" | "spine_ready" | "compiling" | "ready" | "error" | "archived" | string;
type PageStatus = "pending" | "planning" | "generating" | "ready" | "partial" | "error" | string;
type BlockType =
  | "text"
  | "callout"
  | "quiz"
  | "user_note"
  | "figure"
  | "interactive"
  | "animation"
  | "code"
  | "timeline"
  | "flash_cards"
  | "deep_dive"
  | "section"
  | "concept_graph"
  | string;

type LearningBook = {
  id: string;
  title: string;
  description?: string;
  status: BookStatus;
  proposal?: Item | null;
  knowledge_bases?: string[];
  language?: string;
  page_count?: number;
  chapter_count?: number;
  created_at?: number;
  updated_at?: number;
  metadata?: Item;
};

type LearningBookPage = {
  id: string;
  book_id?: string;
  title: string;
  learning_objectives: string[];
  content_type?: string;
  status: PageStatus;
  order?: number;
  blocks: LearningBookBlock[];
  parent_page_id?: string;
  error?: string;
};

type LearningBookBlock = {
  id: string;
  type: BlockType;
  status?: string;
  title?: string;
  params?: Item;
  payload?: Item;
  metadata?: Item;
  error?: string;
};

type ParentSelection<TChild extends string | number> =
  | { mode: "all" }
  | { mode: "subset"; ids: TChild[] };

type BookSourceChild<TChild extends string | number> = {
  id: TChild;
  title: string;
  subtitle?: string;
};

type BookSourceSelection<TChild extends string | number> = Map<string, ParentSelection<TChild>>;
type BookCreatorSourceTab = "knowledge" | "notebooks" | "questions" | "chats";

type BookChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

type LearningBookDetail = {
  book: LearningBook;
  spine: Item | null;
  pages: LearningBookPage[];
  progress?: Item;
};

const STATUS_STYLES: Record<string, { label: string; className: string; dot: string }> = {
  draft: {
    label: "Draft",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  spine_ready: {
    label: "Outline",
    className: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  compiling: {
    label: "Compiling",
    className: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500 animate-pulse",
  },
  ready: {
    label: "Ready",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  error: {
    label: "Error",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
  },
};

const INSERTABLE_TYPES: BlockType[] = [
  "section",
  "text",
  "callout",
  "quiz",
  "code",
  "timeline",
  "flash_cards",
  "figure",
  "interactive",
  "animation",
  "deep_dive",
  "user_note",
];

const CHANGEABLE_TYPES: BlockType[] = [
  "text",
  "section",
  "callout",
  "quiz",
  "code",
  "timeline",
  "flash_cards",
  "figure",
  "interactive",
  "animation",
  "deep_dive",
];

const CHAPTER_CONTENT_TYPES = [
  { value: "theory", label: "Theory" },
  { value: "derivation", label: "Derivation" },
  { value: "history", label: "History" },
  { value: "practice", label: "Practice" },
  { value: "concept", label: "Concept" },
];

function asRecord(value: unknown): Item {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Item) : {};
}

function textOf(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function numberOf(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function arrayOfRecords(value: unknown): Item[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function itemId(item: Item, fallback = "") {
  return (
    textOf(item.id) ||
    textOf(item.book_id) ||
    textOf(item.page_id) ||
    textOf(item.block_id) ||
    fallback
  );
}

function normalizeBook(item: Item, index = 0): LearningBook {
  return {
    id: itemId(item, `book-${index}`),
    title: textOf(item.title, `Book ${index + 1}`),
    description: textOf(item.description),
    status: textOf(item.status, "draft"),
    proposal: asRecord(item.proposal),
    knowledge_bases: Array.isArray(item.knowledge_bases)
      ? item.knowledge_bases.map(String)
      : undefined,
    language: textOf(item.language),
    page_count: numberOf(item.page_count),
    chapter_count: numberOf(item.chapter_count),
    created_at: numberOf(item.created_at),
    updated_at: numberOf(item.updated_at),
    metadata: asRecord(item.metadata),
  };
}

function normalizeBlock(item: Item, index = 0): LearningBookBlock {
  return {
    id: itemId(item, `block-${index}`),
    type: textOf(item.type, "text"),
    status: textOf(item.status, "ready"),
    title: textOf(item.title),
    params: asRecord(item.params),
    payload: asRecord(item.payload),
    metadata: asRecord(item.metadata),
    error: textOf(item.error),
  };
}

function normalizePage(item: Item, index = 0): LearningBookPage {
  return {
    id: itemId(item, `page-${index}`),
    book_id: textOf(item.book_id),
    title: textOf(item.title, `Chapter ${index + 1}`),
    learning_objectives: Array.isArray(item.learning_objectives)
      ? item.learning_objectives.map(String)
      : [],
    content_type: textOf(item.content_type),
    status: textOf(item.status, "pending"),
    order: numberOf(item.order, index),
    blocks: arrayOfRecords(item.blocks).map(normalizeBlock),
    parent_page_id: textOf(item.parent_page_id),
    error: textOf(item.error),
  };
}

function normalizeDetail(payload: unknown): LearningBookDetail | null {
  const root = asRecord(payload);
  const book = asRecord(root.book ?? root);
  const id = itemId(book);
  if (!id) return null;
  return {
    book: normalizeBook(book),
    spine: root.spine ? asRecord(root.spine) : null,
    pages: arrayOfRecords(root.pages).map(normalizePage).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    progress: asRecord(root.progress),
  };
}

function formatRelative(seconds?: number) {
  if (!seconds) return "";
  const diff = Date.now() / 1000 - seconds;
  if (diff < 60) return "just now";
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function extractList(payload: Item, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
  }
  return [];
}

function jsonText(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

function parseJsonText(value: string) {
  try {
    return JSON.parse(value) as Item;
  } catch {
    throw new Error("Invalid JSON.");
  }
}

function parseJsonDraftOrFallback(value: string, fallback: Item) {
  try {
    return value.trim() ? (JSON.parse(value) as Item) : fallback;
  } catch {
    return fallback;
  }
}

function splitLines(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function getBookPageChatSession(book: LearningBook, pageId: string) {
  const sessions = asRecord(asRecord(book.metadata).page_chat_sessions);
  return textOf(sessions[pageId]);
}

function parseBookProgressEvent(data: unknown): LearningBookProgressEvent | null {
  try {
    const payload = JSON.parse(String(data)) as unknown;
    return payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as LearningBookProgressEvent)
      : null;
  } catch {
    return null;
  }
}

function sourceLabel(item: Item, fallback: string) {
  return (
    textOf(item.name) ||
    textOf(item.title) ||
    textOf(item.label) ||
    textOf(item.id) ||
    fallback
  );
}

function numericSourceId(item: Item, fallback: number) {
  const parsed = Number(item.id ?? item.question_id ?? item.entry_id);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function recordId(item: Item, fallback: string) {
  return textOf(item.id) || textOf(item.record_id) || fallback;
}

function messageId(item: Item, fallback: number) {
  const parsed = Number(item.id ?? item.message_id ?? item.index ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function extractNotebookRecordChildren(payload: unknown): BookSourceChild<string>[] {
  const root = asRecord(payload);
  const notebook = asRecord(root.notebook ?? root);
  const records = [
    ...arrayOfRecords(notebook.records),
    ...arrayOfRecords(notebook.items),
    ...arrayOfRecords(root.records),
    ...arrayOfRecords(root.items),
  ];
  return records.map((record, index) => ({
    id: recordId(record, `record-${index}`),
    title: sourceLabel(record, `Record ${index + 1}`),
    subtitle: textOf(record.summary) || textOf(record.content),
  }));
}

function extractSessionMessageChildren(payload: unknown): BookSourceChild<number>[] {
  const root = asRecord(payload);
  const messages = [
    ...arrayOfRecords(root.messages),
    ...arrayOfRecords(root.items),
    ...arrayOfRecords(root.history),
    ...arrayOfRecords(asRecord(root.session).messages),
  ];
  return messages.map((message, index) => ({
    id: messageId(message, index),
    title: textOf(message.role, "message"),
    subtitle: textOf(message.content) || textOf(message.message),
  }));
}

function selectionCount<TChild extends string | number>(selection: BookSourceSelection<TChild>) {
  let count = 0;
  selection.forEach((value) => {
    count += value.mode === "all" ? 1 : value.ids.length;
  });
  return count;
}

function selectionToNotebookRefs(selection: BookSourceSelection<string>) {
  return Array.from(selection.entries()).map(([notebook_id, value]) => ({
    notebook_id,
    record_ids: value.mode === "all" ? [] : value.ids,
  }));
}

function selectionToChatSelections(selection: BookSourceSelection<number>) {
  return Array.from(selection.entries()).map(([session_id, value]) => ({
    session_id,
    message_ids: value.mode === "all" ? [] : value.ids,
  }));
}

function toggleStringSelection(
  values: string[],
  value: string,
  setValues: (values: string[]) => void,
) {
  setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
}

function toggleIdSelection(
  values: Array<string | number>,
  value: string | number,
  setValues: (values: Array<string | number>) => void,
) {
  setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
}

export function LearningBookWorkspace({
  bookTopic,
  setBookTopic,
  createBook,
  items,
  knowledgeItems,
  sessionItems,
  notebookItems,
  questionItems,
}: {
  bookTopic: string;
  setBookTopic: (value: string) => void;
  createBook: UseMutationResult<unknown, Error, LearningJson, unknown>;
  items: Item[];
  knowledgeItems: Item[];
  sessionItems: Item[];
  notebookItems: Item[];
  questionItems: Item[];
}) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [proposalDraft, setProposalDraft] = useState("");
  const [spineDraft, setSpineDraft] = useState("");
  const [bookProgress, setBookProgress] = useState(() => emptyLearningBookProgress());
  const [bookLanguage, setBookLanguage] = useState("en");
  const [selectedKnowledge, setSelectedKnowledge] = useState<string[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<BookSourceSelection<number>>(() => new Map());
  const [selectedNotebooks, setSelectedNotebooks] = useState<BookSourceSelection<string>>(() => new Map());
  const [selectedQuestions, setSelectedQuestions] = useState<Array<string | number>>([]);
  const progressRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const books = useMemo(() => items.map(normalizeBook), [items]);
  const filteredBooks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return books;
    return books.filter((book) =>
      `${book.title} ${book.description || ""}`.toLowerCase().includes(needle),
    );
  }, [books, query]);

  const selectedBookFromList = books.find((book) => book.id === selectedBookId) || null;

  const detailQuery = useQuery({
    queryKey: [...learningKeys.books, "detail", selectedBookId],
    enabled: Boolean(selectedBookId),
    queryFn: async () => normalizeDetail(await getLearningBook(selectedBookId || "")),
  });
  const detail = detailQuery.data || null;
  const activeBook = detail?.book || selectedBookFromList;
  const activePage =
    detail?.pages.find((page) => page.id === selectedPageId) || detail?.pages[0] || null;
  const visibleProgress =
    learningBookProgressHasActivity(bookProgress) &&
    (!learningBookProgressIsComplete(bookProgress) || activeBook?.status === "compiling")
      ? bookProgress
      : null;

  const healthQuery = useQuery({
    queryKey: [...learningKeys.books, "health", selectedBookId, activeBook?.updated_at],
    enabled: Boolean(selectedBookId && detail?.book),
    queryFn: () => getLearningBookHealth(selectedBookId || ""),
  });

  const refreshDetail = async () => {
    await queryClient.invalidateQueries({ queryKey: learningKeys.books });
    if (selectedBookId) {
      await queryClient.invalidateQueries({ queryKey: [...learningKeys.books, "detail", selectedBookId] });
      await queryClient.invalidateQueries({ queryKey: [...learningKeys.books, "health", selectedBookId] });
    }
  };

  useEffect(() => {
    setBookProgress(emptyLearningBookProgress());
  }, [selectedBookId]);

  useEffect(() => {
    if (!selectedBookId) return undefined;
    const socket = openLearningSocket("/api/learning/book/ws");
    if (!socket) return undefined;

    const scheduleRefresh = () => {
      if (progressRefreshTimerRef.current) return;
      progressRefreshTimerRef.current = setTimeout(() => {
        progressRefreshTimerRef.current = null;
        void queryClient.invalidateQueries({ queryKey: learningKeys.books });
        void queryClient.invalidateQueries({
          queryKey: [...learningKeys.books, "detail", selectedBookId],
        });
        void queryClient.invalidateQueries({
          queryKey: [...learningKeys.books, "health", selectedBookId],
        });
      }, 500);
    };

    socket.onmessage = (event) => {
      const payload = parseBookProgressEvent(event.data);
      if (!payload) return;
      const eventBookId = getLearningBookProgressEventBookId(payload);
      if (eventBookId && eventBookId !== selectedBookId) return;
      setBookProgress((current) => reduceLearningBookProgressEvent(current, payload));
      if (learningBookProgressEventShouldRefresh(payload)) {
        scheduleRefresh();
      }
    };
    socket.onerror = () => {
      setBookProgress((current) =>
        reduceLearningBookProgressEvent(current, {
          type: "error",
          content: "Book progress connection failed.",
          metadata: { book_id: selectedBookId },
        }),
      );
    };

    return () => {
      socket.close();
      if (progressRefreshTimerRef.current) {
        clearTimeout(progressRefreshTimerRef.current);
        progressRefreshTimerRef.current = null;
      }
    };
  }, [queryClient, selectedBookId]);

  const runBookAction = useMutation({
    mutationFn: async ({
      label,
      action,
    }: {
      label: string;
      action: () => Promise<unknown>;
    }) => action().then((payload) => ({ label, payload })),
    onSuccess: async ({ label }) => {
      toast.success(label);
      await refreshDetail();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleCreate = async () => {
    const topic = bookTopic.trim();
    if (!topic) return;
    try {
      const requestPayload = buildLearningBookCreatePayload({
        topic,
        language: bookLanguage,
        selectedKnowledge,
        selectedSessions: selectionToChatSelections(selectedSessions),
        selectedNotebooks: selectionToNotebookRefs(selectedNotebooks),
        selectedQuestions,
      });
      const response = await createBook.mutateAsync(requestPayload);
      const root = asRecord(response);
      const book = normalizeBook(asRecord(root.book));
      if (book.id) {
        setSelectedBookId(book.id);
        setProposalDraft(jsonText(asRecord(book.proposal || root.proposal)));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Book request failed.");
    }
  };

  const handleSelectBook = (book: LearningBook) => {
    setSelectedBookId(book.id);
    setSelectedPageId(null);
    setProposalDraft(jsonText(book.proposal || {}));
    setSpineDraft("");
  };

  const handleDeleteBook = (book: LearningBook) => {
    if (!window.confirm("Delete this book? This cannot be undone.")) return;
    runBookAction.mutate({
      label: "Book deleted",
      action: async () => {
        await deleteLearningBook(book.id);
        if (selectedBookId === book.id) {
          setSelectedBookId(null);
          setSelectedPageId(null);
        }
      },
    });
  };

  const handleConfirmProposal = () => {
    if (!activeBook) return;
    runBookAction.mutate({
      label: "Book outline requested",
      action: () =>
        confirmLearningBookProposal({
          book_id: activeBook.id,
          proposal: parseJsonText(proposalDraft || jsonText(activeBook.proposal || {})),
        }),
    });
  };

  const handleConfirmSpine = () => {
    if (!activeBook || !detail?.spine) return;
    runBookAction.mutate({
      label: "Book compilation started",
      action: () =>
        confirmLearningBookSpine({
          book_id: activeBook.id,
          spine: parseJsonText(spineDraft || jsonText(detail.spine)),
          auto_compile: true,
        }),
    });
  };

  const handleCompilePage = (page: LearningBookPage, force = false) => {
    if (!activeBook) return;
    runBookAction.mutate({
      label: force ? "Page regeneration started" : "Page compilation started",
      action: () =>
        compileLearningBookPage({
          book_id: activeBook.id,
          page_id: page.id,
          force,
        }),
    });
  };

  const handleRebuild = () => {
    if (!activeBook) return;
    if (!window.confirm("Rebuild this book using the current chapter structure?")) return;
    runBookAction.mutate({
      label: "Book rebuild started",
      action: () => rebuildLearningBook({ book_id: activeBook.id, auto_compile: true }),
    });
  };

  const handleBlockAction = (
    label: string,
    block: LearningBookBlock,
    action: (bookId: string, pageId: string, blockId: string) => Promise<unknown>,
  ) => {
    if (!activeBook || !activePage) return;
    runBookAction.mutate({
      label,
      action: () => action(activeBook.id, activePage.id, block.id),
    });
  };

  return (
    <div className="min-h-[calc(100vh-15rem)] overflow-hidden rounded-zaki-lg border border-zaki-border bg-zaki-raised">
      {!selectedBookId ? (
        <BookLibraryView
          query={query}
          setQuery={setQuery}
          books={filteredBooks}
          allBooks={books}
          bookTopic={bookTopic}
          setBookTopic={setBookTopic}
          creating={createBook.isPending}
          knowledgeItems={knowledgeItems}
          sessionItems={sessionItems}
          notebookItems={notebookItems}
          questionItems={questionItems}
          selectedKnowledge={selectedKnowledge}
          setSelectedKnowledge={setSelectedKnowledge}
          selectedSessions={selectedSessions}
          setSelectedSessions={setSelectedSessions}
          selectedNotebooks={selectedNotebooks}
          setSelectedNotebooks={setSelectedNotebooks}
          selectedQuestions={selectedQuestions}
          setSelectedQuestions={setSelectedQuestions}
          language={bookLanguage}
          setLanguage={setBookLanguage}
          onCreate={handleCreate}
          onSelect={handleSelectBook}
          onDelete={handleDeleteBook}
        />
      ) : (
        <div className="flex h-[calc(100vh-15rem)] min-h-[680px]">
          <BookSidebarView
            book={activeBook}
            pages={detail?.pages || []}
            selectedPageId={activePage?.id || null}
            loading={detailQuery.isLoading}
            rebuilding={runBookAction.isPending}
            onBack={() => {
              setSelectedBookId(null);
              setSelectedPageId(null);
            }}
            onSelectPage={(page) => {
              setSelectedPageId(page.id);
              if (!["ready", "generating"].includes(page.status)) handleCompilePage(page);
            }}
            onRebuild={handleRebuild}
          />
          <main className="min-w-0 flex-1 overflow-hidden bg-zaki-base">
            {detailQuery.isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-zaki-muted">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading book...
              </div>
            ) : !detail || !activeBook ? (
              <div className="flex h-full items-center justify-center text-sm text-zaki-muted">
                Book not found.
              </div>
            ) : detail.book.status === "draft" ? (
              <BookProposalView
                book={detail.book}
                progress={visibleProgress}
                draft={proposalDraft || jsonText(detail.book.proposal || {})}
                setDraft={setProposalDraft}
                loading={runBookAction.isPending}
                onConfirm={handleConfirmProposal}
              />
            ) : detail.book.status === "spine_ready" && detail.spine ? (
              <BookSpineView
                spine={detail.spine}
                progress={visibleProgress}
                draft={spineDraft || jsonText(detail.spine)}
                setDraft={setSpineDraft}
                loading={runBookAction.isPending}
                onConfirm={handleConfirmSpine}
              />
            ) : (
              <BookReaderView
                book={detail.book}
                page={activePage}
                progress={visibleProgress}
                health={healthQuery.data}
                loading={runBookAction.isPending}
                onRecompile={activePage ? () => handleCompilePage(activePage, true) : undefined}
                onRefreshFingerprints={() => {
                  if (!activeBook) return;
                  runBookAction.mutate({
                    label: "Source fingerprints refreshed",
                    action: () => refreshLearningBookFingerprints(activeBook.id),
                  });
                }}
                onRegenerateBlock={(block) =>
                  handleBlockAction("Block regeneration started", block, (bookId, pageId, blockId) =>
                    regenerateLearningBookBlock({ book_id: bookId, page_id: pageId, block_id: blockId }),
                  )
                }
                onDeleteBlock={(block) => {
                  if (!window.confirm(`Delete this ${block.type} block?`)) return;
                  handleBlockAction("Block deleted", block, (bookId, pageId, blockId) =>
                    deleteLearningBookBlock({ book_id: bookId, page_id: pageId, block_id: blockId }),
                  );
                }}
                onMoveBlock={(block, direction) => {
                  if (!activePage) return;
                  const index = activePage.blocks.findIndex((entry) => entry.id === block.id);
                  const newPosition = direction === "up" ? index - 1 : index + 1;
                  if (newPosition < 0 || newPosition >= activePage.blocks.length) return;
                  handleBlockAction("Block moved", block, (bookId, pageId, blockId) =>
                    moveLearningBookBlock({
                      book_id: bookId,
                      page_id: pageId,
                      block_id: blockId,
                      new_position: newPosition,
                    }),
                  );
                }}
                onChangeBlockType={(block, newType) => {
                  handleBlockAction("Block type changed", block, (bookId, pageId, blockId) =>
                    changeLearningBookBlockType({
                      book_id: bookId,
                      page_id: pageId,
                      block_id: blockId,
                      new_type: newType,
                    }),
                  );
                }}
                onInsertBlock={(blockType) => {
                  if (!activeBook || !activePage) return;
                  runBookAction.mutate({
                    label: "Block inserted",
                    action: () =>
                      insertLearningBookBlock({
                        book_id: activeBook.id,
                        page_id: activePage.id,
                        block_type: blockType,
                        compile_now: true,
                      }),
                  });
                }}
                onDeepDive={(block, requestedTopic) => {
                  if (!activeBook || !activePage) return;
                  const topic =
                    requestedTopic ||
                    textOf(block.params?.topic) ||
                    textOf(block.title) ||
                    activePage.title ||
                    "this topic";
                  runBookAction.mutate({
                    label: "Deep dive page created",
                    action: () =>
                      createLearningBookDeepDive({
                        book_id: activeBook.id,
                        parent_page_id: activePage.id,
                        topic,
                        block_id: block.id,
                        content_type: "concept",
                      }),
                  });
                }}
                onQuizAttempt={(block, attempt) => {
                  if (!activeBook || !activePage) return;
                  runBookAction.mutate({
                    label: "Quiz attempt recorded",
                    action: () =>
                      recordLearningBookQuizAttempt({
                        book_id: activeBook.id,
                        page_id: activePage.id,
                        block_id: block.id,
                        question_id: attempt.questionId,
                        user_answer: attempt.userAnswer,
                        is_correct: attempt.isCorrect,
                      }),
                  });
                }}
              />
            )}
          </main>
        </div>
      )}
    </div>
  );
}

function BookLibraryView({
  query,
  setQuery,
  books,
  allBooks,
  bookTopic,
  setBookTopic,
  creating,
  knowledgeItems,
  sessionItems,
  notebookItems,
  questionItems,
  selectedKnowledge,
  setSelectedKnowledge,
  selectedSessions,
  setSelectedSessions,
  selectedNotebooks,
  setSelectedNotebooks,
  selectedQuestions,
  setSelectedQuestions,
  language,
  setLanguage,
  onCreate,
  onSelect,
  onDelete,
}: {
  query: string;
  setQuery: (value: string) => void;
  books: LearningBook[];
  allBooks: LearningBook[];
  bookTopic: string;
  setBookTopic: (value: string) => void;
  creating: boolean;
  knowledgeItems: Item[];
  sessionItems: Item[];
  notebookItems: Item[];
  questionItems: Item[];
  selectedKnowledge: string[];
  setSelectedKnowledge: (values: string[]) => void;
  selectedSessions: BookSourceSelection<number>;
  setSelectedSessions: (values: BookSourceSelection<number>) => void;
  selectedNotebooks: BookSourceSelection<string>;
  setSelectedNotebooks: (values: BookSourceSelection<string>) => void;
  selectedQuestions: Array<string | number>;
  setSelectedQuestions: (values: Array<string | number>) => void;
  language: string;
  setLanguage: (value: string) => void;
  onCreate: () => void;
  onSelect: (book: LearningBook) => void;
  onDelete: (book: LearningBook) => void;
}) {
  const [sourceTab, setSourceTab] = useState<BookCreatorSourceTab>("knowledge");
  const [creatorCollapsed, setCreatorCollapsed] = useState(false);
  const stats = {
    total: allBooks.length,
    ready: allBooks.filter((book) => book.status === "ready").length,
    inProgress: allBooks.filter((book) => ["draft", "spine_ready", "compiling"].includes(book.status)).length,
    chapters: allBooks.reduce((sum, book) => sum + (book.chapter_count || 0), 0),
  };
  const selectedSourceCount =
    selectedKnowledge.length +
    selectionCount(selectedSessions) +
    selectionCount(selectedNotebooks) +
    selectedQuestions.length;
  const sourceTabs: Array<{
    key: BookCreatorSourceTab;
    label: string;
    icon: typeof Database;
    count: number;
  }> = [
    { key: "knowledge", label: "Libraries", icon: Database, count: selectedKnowledge.length },
    { key: "notebooks", label: "Notebooks", icon: NotebookPen, count: selectionCount(selectedNotebooks) },
    { key: "questions", label: "Questions", icon: ClipboardList, count: selectedQuestions.length },
    { key: "chats", label: "Chats", icon: MessageSquare, count: selectionCount(selectedSessions) },
  ];
  const summaryChips = sourceTabs.filter((tab) => tab.count > 0);

  return (
    <div className="flex min-h-[680px] flex-col">
      <header className="flex shrink-0 flex-col gap-4 border-b border-zaki-border px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-zaki-text">
            <BookOpen className="size-4 text-zaki-brand" />
            Books
          </div>
          <p className="mt-1 text-xs text-zaki-muted">
            Generate, browse, and study structured learning books.
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zaki-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search books"
              className="h-9 w-full rounded-zaki-md border border-zaki-border bg-zaki-base pl-9 pr-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
            />
          </div>
        </div>
      </header>
      <div className="grid gap-3 border-b border-zaki-border px-5 py-4 sm:grid-cols-4">
        <BookStat icon={BookOpen} label="Total books" value={stats.total} />
        <BookStat icon={CheckCircle2} label="Ready" value={stats.ready} />
        <BookStat icon={Sparkles} label="In progress" value={stats.inProgress} />
        <BookStat icon={Layers} label="Chapters" value={stats.chapters} />
      </div>
      <div className="border-b border-zaki-border px-5 py-5">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-zaki-lg border border-zaki-border bg-zaki-base shadow-sm">
          <button
            type="button"
            onClick={() => setCreatorCollapsed((value) => !value)}
            className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-zaki-hover"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zaki-text">
                  {creatorCollapsed ? "Inputs" : "Configure inputs"}
                </span>
                {creatorCollapsed && bookTopic.trim() ? (
                  <span className="truncate text-xs text-zaki-muted">/ {bookTopic.trim()}</span>
                ) : null}
              </div>
              {creatorCollapsed ? (
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {summaryChips.length ? (
                    summaryChips.map((chip) => (
                      <span
                        key={chip.key}
                        className="inline-flex items-center gap-1 rounded-full bg-zaki-brand/10 px-2 py-0.5 text-[11px] font-medium text-zaki-brand"
                      >
                        <chip.icon className="size-3" />
                        {chip.count} {chip.label}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-zaki-muted">No sources selected</span>
                  )}
                </div>
              ) : null}
            </div>
            <span className="inline-flex items-center gap-1 rounded-zaki-md px-2 py-1 text-[11px] text-zaki-muted">
              {creatorCollapsed ? (
                <>
                  <Pencil className="size-3" />
                  Edit
                </>
              ) : (
                <ChevronUp className="size-3.5" />
              )}
            </span>
          </button>

          {!creatorCollapsed ? (
            <div className="space-y-4 px-5 pb-5">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-normal text-zaki-muted">
                  Learning intent
                </span>
                <textarea
                  value={bookTopic}
                  onChange={(event) => setBookTopic(event.target.value)}
                  rows={5}
                  placeholder="e.g. Build intuition for transformer attention with derivations and exercises."
                  className="mt-1.5 w-full resize-none rounded-zaki-lg border border-zaki-border bg-zaki-raised px-3 py-2 text-sm leading-6 text-zaki-text outline-none focus:border-zaki-brand"
                />
              </label>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-normal text-zaki-muted">
                    Knowledge sources
                    {selectedSourceCount ? (
                      <span className="ml-2 rounded-full bg-zaki-brand/10 px-2 py-0.5 text-[10px] text-zaki-brand">
                        {selectedSourceCount} selected
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="inline-flex w-full rounded-zaki-md border border-zaki-border bg-zaki-raised p-0.5">
                  {sourceTabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setSourceTab(tab.key)}
                      className={cn(
                        "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-zaki-sm px-2 py-1.5 text-[12px] font-medium transition-colors",
                        sourceTab === tab.key
                          ? "bg-zaki-base text-zaki-text shadow-sm"
                          : "text-zaki-muted hover:text-zaki-text",
                      )}
                    >
                      <tab.icon className="size-3.5 shrink-0" />
                      <span className="truncate">{tab.label}</span>
                      {tab.count ? (
                        <span className="ml-0.5 rounded-full bg-zaki-brand/10 px-1.5 text-[10px] font-semibold text-zaki-brand">
                          {tab.count}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
                <div className="max-h-72 overflow-y-auto rounded-zaki-lg border border-zaki-border bg-zaki-raised p-1.5">
                  {sourceTab === "knowledge" ? (
                    <BookSourceGroup
                      label="Libraries"
                      items={knowledgeItems}
                      selected={selectedKnowledge}
                      getId={(item, index) => textOf(item.name) || itemId(item, `kb-${index}`)}
                      onToggle={(id) => toggleStringSelection(selectedKnowledge, id, setSelectedKnowledge)}
                      embedded
                    />
                  ) : null}
                  {sourceTab === "notebooks" ? (
                    <BookTreeSourceGroup
                      label="Notebooks"
                      items={notebookItems}
                      selected={selectedNotebooks}
                      getId={(item, index) => itemId(item, `notebook-${index}`)}
                      loadChildren={async (id) => extractNotebookRecordChildren(await getLearningNotebook(id))}
                      onChange={setSelectedNotebooks}
                      embedded
                    />
                  ) : null}
                  {sourceTab === "questions" ? (
                    <BookSourceGroup
                      label="Questions"
                      items={questionItems}
                      selected={selectedQuestions}
                      getId={(item, index) => numericSourceId(item, index)}
                      onToggle={(id) => toggleIdSelection(selectedQuestions, id, setSelectedQuestions)}
                      embedded
                    />
                  ) : null}
                  {sourceTab === "chats" ? (
                    <BookTreeSourceGroup
                      label="Chats"
                      items={sessionItems}
                      selected={selectedSessions}
                      getId={(item, index) => itemId(item, `session-${index}`)}
                      loadChildren={async (id) => extractSessionMessageChildren(await getLearningSession(id))}
                      onChange={setSelectedSessions}
                      embedded
                    />
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="text-xs text-zaki-muted">
                  Language
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    className="ml-2 rounded-zaki-md border border-zaki-border bg-zaki-raised px-2 py-1 text-xs text-zaki-text outline-none focus:border-zaki-brand"
                    aria-label="Book language"
                  >
                    <option value="en">English</option>
                    <option value="ar">Arabic</option>
                    <option value="fr">French</option>
                    <option value="es">Spanish</option>
                    <option value="de">German</option>
                  </select>
                </label>
                <button
                  type="button"
                  disabled={!bookTopic.trim() || creating}
                  onClick={onCreate}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-zaki-lg bg-zaki-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {creating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  Generate proposal
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <main className="flex-1 overflow-y-auto p-5">
        {books.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onSelect={() => onSelect(book)}
                onDelete={() => onDelete(book)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-zaki-lg border border-dashed border-zaki-border p-10 text-center text-sm text-zaki-muted">
            No books returned yet.
          </div>
        )}
      </main>
    </div>
  );
}

function BookStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-zaki-md border border-zaki-border bg-zaki-base p-3">
      <div className="mb-2 flex items-center gap-2 text-xs text-zaki-muted">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="text-xl font-semibold text-zaki-text">{value}</div>
    </div>
  );
}

function BookSourceGroup<TId extends string | number>({
  label,
  items,
  selected,
  getId,
  onToggle,
  embedded = false,
}: {
  label: string;
  items: Item[];
  selected: TId[];
  getId: (item: Item, index: number) => TId;
  onToggle: (id: TId) => void;
  embedded?: boolean;
}) {
  const [sourceQuery, setSourceQuery] = useState("");
  const needle = sourceQuery.trim().toLowerCase();
  const sourceEntries = items.map((item, index) => ({
    item,
    id: getId(item, index),
    label: sourceLabel(item, `${label} ${index + 1}`),
  }));
  const visibleItems = needle
    ? sourceEntries.filter((entry) =>
        `${entry.label} ${String(entry.id)}`.toLowerCase().includes(needle),
      )
    : sourceEntries;
  return (
    <div className={cn(!embedded && "min-h-36 rounded-zaki-md border border-zaki-border bg-zaki-base p-2")}>
      {!embedded ? <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-normal text-zaki-muted">
          {label}
        </div>
        {selected.length ? (
          <span className="rounded-full bg-zaki-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-zaki-brand">
            {selected.length}
          </span>
        ) : null}
      </div> : null}
      {items.length > 6 ? (
        <input
          value={sourceQuery}
          onChange={(event) => setSourceQuery(event.target.value)}
          placeholder={`Search ${label.toLowerCase()}`}
          className="mb-2 h-8 w-full rounded-zaki-sm border border-zaki-border bg-zaki-raised px-2 text-xs text-zaki-text outline-none focus:border-zaki-brand"
        />
      ) : null}
      {visibleItems.length ? (
        <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
          {visibleItems.map(({ id, label: itemLabel }) => {
            const checked = selected.includes(id);
            return (
              <label
                key={String(id)}
                className="flex cursor-pointer items-start gap-2 rounded-zaki-sm px-1.5 py-1 text-xs text-zaki-text hover:bg-zaki-hover"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(id)}
                  className="mt-0.5 size-3.5 rounded border-zaki-border accent-zaki-brand"
                />
                <span className="line-clamp-2 min-w-0">
                  {itemLabel}
                </span>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="rounded-zaki-sm border border-dashed border-zaki-border px-2 py-3 text-xs text-zaki-muted">
          No items.
        </div>
      )}
    </div>
  );
}

function BookTreeSourceGroup<TChild extends string | number>({
  label,
  items,
  selected,
  getId,
  loadChildren,
  onChange,
  embedded = false,
}: {
  label: string;
  items: Item[];
  selected: BookSourceSelection<TChild>;
  getId: (item: Item, index: number) => string;
  loadChildren: (id: string) => Promise<BookSourceChild<TChild>[]>;
  onChange: (selection: BookSourceSelection<TChild>) => void;
  embedded?: boolean;
}) {
  const [sourceQuery, setSourceQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [childrenById, setChildrenById] = useState<Record<string, BookSourceChild<TChild>[]>>({});
  const [loadingById, setLoadingById] = useState<Record<string, boolean>>({});
  const needle = sourceQuery.trim().toLowerCase();
  const sourceEntries = items.map((item, index) => ({
    id: getId(item, index),
    label: sourceLabel(item, `${label} ${index + 1}`),
  }));
  const visibleItems = needle
    ? sourceEntries.filter((entry) =>
        `${entry.label} ${String(entry.id)}`.toLowerCase().includes(needle),
      )
    : sourceEntries;
  const selectedCount = selectionCount(selected);

  const ensureChildren = async (id: string) => {
    if (!id || childrenById[id] !== undefined || loadingById[id]) return;
    setLoadingById((current) => ({ ...current, [id]: true }));
    try {
      const children = await loadChildren(id);
      setChildrenById((current) => ({ ...current, [id]: children }));
    } catch {
      setChildrenById((current) => ({ ...current, [id]: [] }));
    } finally {
      setLoadingById((current) => ({ ...current, [id]: false }));
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        void ensureChildren(id);
      }
      return next;
    });
  };

  const toggleParent = (id: string) => {
    const next = new Map(selected);
    if (next.has(id)) next.delete(id);
    else next.set(id, { mode: "all" });
    onChange(next);
  };

  const toggleChild = (parentId: string, childId: TChild) => {
    const children = childrenById[parentId] ?? [];
    const knownIds = children.map((child) => child.id);
    const current = selected.get(parentId);
    const ids =
      current?.mode === "all"
        ? knownIds.filter((id) => id !== childId)
        : current?.mode === "subset"
          ? current.ids.includes(childId)
            ? current.ids.filter((id) => id !== childId)
            : [...current.ids, childId]
          : [childId];
    const next = new Map(selected);
    if (ids.length) next.set(parentId, { mode: "subset", ids });
    else next.delete(parentId);
    onChange(next);
  };

  return (
    <div className={cn(!embedded && "min-h-36 rounded-zaki-md border border-zaki-border bg-zaki-base p-2")}>
      {!embedded ? <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-normal text-zaki-muted">
          {label}
        </div>
        {selectedCount ? (
          <span className="rounded-full bg-zaki-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-zaki-brand">
            {selectedCount}
          </span>
        ) : null}
      </div> : null}
      {items.length > 6 ? (
        <input
          value={sourceQuery}
          onChange={(event) => setSourceQuery(event.target.value)}
          placeholder={`Search ${label.toLowerCase()}`}
          className="mb-2 h-8 w-full rounded-zaki-sm border border-zaki-border bg-zaki-raised px-2 text-xs text-zaki-text outline-none focus:border-zaki-brand"
        />
      ) : null}
      {visibleItems.length ? (
        <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
          {visibleItems.map(({ id, label: itemLabel }) => {
            const value = selected.get(id);
            const children = childrenById[id] ?? [];
            const isExpanded = expanded.has(id);
            const indeterminate = value?.mode === "subset";
            return (
              <div key={id} className="rounded-zaki-sm hover:bg-zaki-hover">
                <div className="flex items-start gap-1 px-1.5 py-1 text-xs text-zaki-text">
                  <button
                    type="button"
                    onClick={() => toggleExpand(id)}
                    className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-zaki-muted hover:text-zaki-text"
                    aria-label={isExpanded ? `Collapse ${itemLabel}` : `Expand ${itemLabel}`}
                  >
                    {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                  </button>
                  <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      ref={(node) => {
                        if (node) node.indeterminate = Boolean(indeterminate);
                      }}
                      onChange={() => toggleParent(id)}
                      className="mt-0.5 size-3.5 rounded border-zaki-border accent-zaki-brand"
                    />
                    <span className="line-clamp-2 min-w-0">{itemLabel}</span>
                  </label>
                </div>
                {isExpanded ? (
                  <div className="ml-5 border-l border-zaki-border pl-2">
                    {loadingById[id] ? (
                      <div className="flex items-center gap-2 py-2 text-[11px] text-zaki-muted">
                        <Loader2 className="size-3 animate-spin" />
                        Loading...
                      </div>
                    ) : children.length ? (
                      <div className="space-y-0.5 pb-1">
                        {children.map((child) => {
                          const checked =
                            value?.mode === "all" ||
                            (value?.mode === "subset" && value.ids.includes(child.id));
                          return (
                            <label
                              key={String(child.id)}
                              className="flex cursor-pointer items-start gap-2 rounded-zaki-sm px-1.5 py-1 text-[11px] text-zaki-text hover:bg-zaki-hover"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleChild(id, child.id)}
                                className="mt-0.5 size-3 rounded border-zaki-border accent-zaki-brand"
                              />
                              <span className="min-w-0">
                                <span className="block truncate">{child.title}</span>
                                {child.subtitle ? (
                                  <span className="block truncate text-[10px] text-zaki-muted">
                                    {child.subtitle}
                                  </span>
                                ) : null}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-2 text-[11px] text-zaki-muted">No child items.</div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-zaki-sm border border-dashed border-zaki-border px-2 py-3 text-xs text-zaki-muted">
          No items.
        </div>
      )}
    </div>
  );
}

function BookCard({ book, onSelect, onDelete }: { book: LearningBook; onSelect: () => void; onDelete: () => void }) {
  const status = STATUS_STYLES[book.status] ?? STATUS_STYLES.draft!;
  return (
    <div className="group overflow-hidden rounded-zaki-lg border border-zaki-border bg-zaki-base transition-colors hover:border-zaki-brand/50">
      <button type="button" onClick={onSelect} className="block w-full p-4 text-left">
        <div className="mb-4 flex h-28 items-end rounded-zaki-md bg-[linear-gradient(135deg,#eef5ff_0%,#cfe1f7_55%,#9ec0e8_100%)] p-3 shadow-inner">
          <div className="line-clamp-2 text-base font-semibold text-slate-900">{book.title}</div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium", status.className)}>
            <span className={cn("size-1.5 rounded-full", status.dot)} />
            {status.label}
          </span>
          <span className="text-[11px] text-zaki-muted">{formatRelative(book.updated_at)}</span>
        </div>
        {book.description ? (
          <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-zaki-muted">{book.description}</p>
        ) : (
          <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-zaki-muted">
            Structured learning book.
          </p>
        )}
        <div className="mt-4 flex items-center gap-3 text-xs text-zaki-muted">
          <span>{book.chapter_count || 0} chapters</span>
          <span>{book.page_count || 0} pages</span>
        </div>
      </button>
      <div className="flex justify-end border-t border-zaki-border px-3 py-2">
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1 rounded-zaki-sm px-2 py-1 text-xs text-zaki-muted hover:bg-red-500/10 hover:text-red-600"
        >
          <Trash2 className="size-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}

function BookSidebarView({
  book,
  pages,
  selectedPageId,
  loading,
  rebuilding,
  onBack,
  onSelectPage,
  onRebuild,
}: {
  book: LearningBook | null;
  pages: LearningBookPage[];
  selectedPageId: string | null;
  loading: boolean;
  rebuilding: boolean;
  onBack: () => void;
  onSelectPage: (page: LearningBookPage) => void;
  onRebuild: () => void;
}) {
  return (
    <aside className="flex h-full w-[250px] shrink-0 flex-col border-r border-zaki-border bg-zaki-raised px-3 py-4">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 self-start rounded-zaki-sm px-2 py-1 text-xs font-medium text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text"
      >
        <ArrowLeft className="size-3.5" />
        All books
      </button>
      {book ? (
        <div className="mb-4 px-1">
          <div className="line-clamp-2 text-sm font-semibold text-zaki-text">{book.title}</div>
          <div className="mt-1 text-[10px] uppercase tracking-normal text-zaki-muted">
            {book.status} / {book.chapter_count || pages.length} chapters
          </div>
        </div>
      ) : null}
      {book && pages.length ? (
        <button
          type="button"
          onClick={onRebuild}
          disabled={rebuilding}
          className="mb-4 inline-flex h-9 items-center justify-center gap-2 rounded-zaki-md border border-zaki-border text-xs font-semibold text-zaki-muted hover:border-zaki-brand/50 hover:text-zaki-brand disabled:opacity-60"
        >
          {rebuilding ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
          Rebuild book
        </button>
      ) : null}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-zaki-muted">
            <Loader2 className="size-3.5 animate-spin" />
            Loading chapters
          </div>
        ) : pages.length ? (
          <div className="space-y-1">
            {pages.map((page) => {
              const active = page.id === selectedPageId;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => onSelectPage(page)}
                  className={cn(
                    "flex w-full items-start justify-between gap-2 rounded-zaki-md px-2 py-2 text-left text-xs transition-colors",
                    active
                      ? "bg-zaki-brand/12 text-zaki-text"
                      : "text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text",
                  )}
                >
                  <span className="line-clamp-2 min-w-0">{page.title}</span>
                  <span className="shrink-0 rounded-full bg-zaki-hover px-1.5 py-0.5 text-[9px] uppercase">
                    {page.status}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-zaki-md border border-dashed border-zaki-border p-3 text-xs text-zaki-muted">
            Chapters appear after the outline is confirmed.
          </div>
        )}
      </div>
    </aside>
  );
}

function BookProposalView({
  book,
  progress,
  draft,
  setDraft,
  loading,
  onConfirm,
}: {
  book: LearningBook;
  progress?: LearningBookProgress | null;
  draft: string;
  setDraft: (value: string) => void;
  loading: boolean;
  onConfirm: () => void;
}) {
  const baseProposal = asRecord(book.proposal);
  const proposal = parseJsonDraftOrFallback(draft, baseProposal);
  const updateProposal = (patch: Item) => setDraft(jsonText({ ...proposal, ...patch }));
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 rounded-zaki-lg border border-zaki-border bg-zaki-raised p-5">
          <div className="mb-1 text-xs font-semibold uppercase tracking-normal text-zaki-brand">
            Draft proposal
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-normal text-zaki-muted">
                Title
              </span>
              <input
                value={textOf(proposal.title, book.title)}
                onChange={(event) => updateProposal({ title: event.target.value })}
                className="mt-1 w-full rounded-zaki-md border border-zaki-border bg-zaki-base px-3 py-2 text-lg font-semibold text-zaki-text outline-none focus:border-zaki-brand"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-normal text-zaki-muted">
                Description
              </span>
              <textarea
                value={textOf(proposal.description, book.description || "")}
                onChange={(event) => updateProposal({ description: event.target.value })}
                rows={3}
                className="mt-1 w-full resize-none rounded-zaki-md border border-zaki-border bg-zaki-base px-3 py-2 text-sm leading-6 text-zaki-text outline-none focus:border-zaki-brand"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-normal text-zaki-muted">
                Scope
              </span>
              <input
                value={textOf(proposal.scope)}
                onChange={(event) => updateProposal({ scope: event.target.value })}
                className="mt-1 w-full rounded-zaki-md border border-zaki-border bg-zaki-base px-3 py-2 text-sm text-zaki-text outline-none focus:border-zaki-brand"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-normal text-zaki-muted">
                Target level
              </span>
              <input
                value={textOf(proposal.target_level)}
                onChange={(event) => updateProposal({ target_level: event.target.value })}
                className="mt-1 w-full rounded-zaki-md border border-zaki-border bg-zaki-base px-3 py-2 text-sm text-zaki-text outline-none focus:border-zaki-brand"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-normal text-zaki-muted">
                Estimated chapters
              </span>
              <input
                type="number"
                min={1}
                max={24}
                value={numberOf(proposal.estimated_chapters, 0)}
                onChange={(event) =>
                  updateProposal({ estimated_chapters: Number(event.target.value) || 0 })
                }
                className="mt-1 w-full rounded-zaki-md border border-zaki-border bg-zaki-base px-3 py-2 text-sm text-zaki-text outline-none focus:border-zaki-brand"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-normal text-zaki-muted">
                Language
              </span>
              <input
                value={textOf(proposal.language, book.language || "")}
                onChange={(event) => updateProposal({ language: event.target.value })}
                className="mt-1 w-full rounded-zaki-md border border-zaki-border bg-zaki-base px-3 py-2 text-sm text-zaki-text outline-none focus:border-zaki-brand"
              />
            </label>
          </div>
        </div>
        {progress ? <LearningBookProgressTimeline progress={progress} className="mb-5" /> : null}
        <details className="rounded-zaki-md border border-zaki-border bg-zaki-raised">
          <summary className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-normal text-zaki-muted">
            Advanced payload
          </summary>
          <textarea
            value={draft || jsonText(baseProposal)}
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-[220px] w-full resize-y border-t border-zaki-border bg-zaki-base p-4 font-mono text-xs text-zaki-text outline-none focus:border-zaki-brand"
          />
        </details>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-zaki-md bg-zaki-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Confirm proposal
          </button>
        </div>
      </div>
    </div>
  );
}

function BookSpineView({
  spine,
  progress,
  draft,
  setDraft,
  loading,
  onConfirm,
}: {
  spine: Item;
  progress?: LearningBookProgress | null;
  draft: string;
  setDraft: (value: string) => void;
  loading: boolean;
  onConfirm: () => void;
}) {
  const currentSpine = parseJsonDraftOrFallback(draft, spine);
  const chapters = arrayOfRecords(currentSpine.chapters);
  const updateChapters = (nextChapters: Item[]) =>
    setDraft(jsonText({ ...currentSpine, chapters: nextChapters }));
  const updateChapter = (index: number, patch: Item) => {
    updateChapters(chapters.map((chapter, chapterIndex) =>
      chapterIndex === index ? { ...chapter, ...patch } : chapter,
    ));
  };
  const moveChapter = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= chapters.length) return;
    const next = [...chapters];
    [next[index], next[target]] = [next[target]!, next[index]!];
    updateChapters(next.map((chapter, chapterIndex) => ({ ...chapter, order: chapterIndex })));
  };
  const removeChapter = (index: number) => {
    updateChapters(
      chapters
        .filter((_, chapterIndex) => chapterIndex !== index)
        .map((chapter, chapterIndex) => ({ ...chapter, order: chapterIndex })),
    );
  };
  const addChapter = () => {
    updateChapters([
      ...chapters,
      {
        id: `ch_new_${chapters.length + 1}_${Date.now().toString(36)}`,
        title: "New chapter",
        learning_objectives: [],
        content_type: "theory",
        source_anchors: [],
        prerequisites: [],
        page_ids: [],
        summary: "",
        order: chapters.length,
      },
    ]);
  };
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-start justify-between gap-4 rounded-zaki-lg border border-zaki-border bg-zaki-raised p-5">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-normal text-zaki-brand">
              Outline
            </div>
            <h2 className="text-2xl font-semibold text-zaki-text">Review chapters</h2>
            <p className="mt-2 text-sm text-zaki-muted">
              Confirm the chapter structure to start compiling the book.
            </p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-zaki-md bg-zaki-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Confirm outline
          </button>
        </div>
        {progress ? <LearningBookProgressTimeline progress={progress} className="mb-5" /> : null}
        <div className="space-y-3">
          {chapters.map((chapter, index) => (
            <div key={itemId(chapter, `chapter-${index}`)} className="rounded-zaki-md border border-zaki-border bg-zaki-raised p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 text-xs font-semibold text-zaki-brand">Chapter {index + 1}</div>
                  <input
                    value={textOf(chapter.title, `Chapter ${index + 1}`)}
                    onChange={(event) => updateChapter(index, { title: event.target.value })}
                    className="w-full rounded-zaki-sm border border-transparent bg-transparent px-2 py-1 text-base font-semibold text-zaki-text outline-none focus:border-zaki-border"
                  />
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveChapter(index, -1)}
                    disabled={index === 0}
                    className="rounded-zaki-sm border border-zaki-border p-1 text-zaki-muted hover:border-zaki-brand/50 hover:text-zaki-brand disabled:opacity-30"
                    aria-label="Move chapter up"
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveChapter(index, 1)}
                    disabled={index === chapters.length - 1}
                    className="rounded-zaki-sm border border-zaki-border p-1 text-zaki-muted hover:border-zaki-brand/50 hover:text-zaki-brand disabled:opacity-30"
                    aria-label="Move chapter down"
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeChapter(index)}
                    className="rounded-zaki-sm border border-rose-300/60 p-1 text-rose-600 hover:bg-rose-500/10"
                    aria-label="Remove chapter"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-zaki-muted">
                  Content type
                  <select
                    value={textOf(chapter.content_type, "theory")}
                    onChange={(event) => updateChapter(index, { content_type: event.target.value })}
                    className="mt-1 w-full rounded-zaki-md border border-zaki-border bg-zaki-base px-2 py-2 text-sm text-zaki-text outline-none focus:border-zaki-brand"
                  >
                    {CHAPTER_CONTENT_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-zaki-muted">
                  Summary
                  <input
                    value={textOf(chapter.summary)}
                    onChange={(event) => updateChapter(index, { summary: event.target.value })}
                    placeholder="Optional one-line description"
                    className="mt-1 w-full rounded-zaki-md border border-zaki-border bg-zaki-base px-2 py-2 text-sm text-zaki-text outline-none focus:border-zaki-brand"
                  />
                </label>
              </div>
              <label className="mt-3 block text-xs text-zaki-muted">
                Learning objectives
                <textarea
                  value={extractList(chapter, ["learning_objectives"]).join("\n")}
                  onChange={(event) =>
                    updateChapter(index, { learning_objectives: splitLines(event.target.value) })
                  }
                  rows={3}
                  className="mt-1 w-full resize-none rounded-zaki-md border border-zaki-border bg-zaki-base px-2 py-2 text-sm text-zaki-text outline-none focus:border-zaki-brand"
                />
              </label>
            </div>
          ))}
          <button
            type="button"
            onClick={addChapter}
            className="inline-flex w-full items-center justify-center gap-2 rounded-zaki-md border border-dashed border-zaki-border bg-zaki-raised px-3 py-2 text-sm font-semibold text-zaki-muted hover:border-zaki-brand/50 hover:text-zaki-brand"
          >
            <Plus className="size-4" />
            Add chapter
          </button>
          <details className="rounded-zaki-md border border-zaki-border bg-zaki-raised">
            <summary className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-normal text-zaki-muted">
              Advanced payload
            </summary>
            <textarea
              value={draft || jsonText(spine)}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-[280px] w-full resize-y border-t border-zaki-border bg-zaki-base p-4 font-mono text-xs text-zaki-text outline-none focus:border-zaki-brand"
            />
          </details>
        </div>
      </div>
    </div>
  );
}

function BookReaderView({
  book,
  page,
  progress,
  health,
  loading,
  onRecompile,
  onRefreshFingerprints,
  onRegenerateBlock,
  onDeleteBlock,
  onMoveBlock,
  onChangeBlockType,
  onInsertBlock,
  onDeepDive,
  onQuizAttempt,
}: {
  book: LearningBook;
  page: LearningBookPage | null;
  progress?: LearningBookProgress | null;
  health: unknown;
  loading: boolean;
  onRecompile?: () => void;
  onRefreshFingerprints: () => void;
  onRegenerateBlock: (block: LearningBookBlock) => void;
  onDeleteBlock: (block: LearningBookBlock) => void;
  onMoveBlock: (block: LearningBookBlock, direction: "up" | "down") => void;
  onChangeBlockType: (block: LearningBookBlock, newType: BlockType) => void;
  onInsertBlock: (blockType: BlockType) => void;
  onDeepDive: (block: LearningBookBlock, topic?: string) => void;
  onQuizAttempt: (block: LearningBookBlock, attempt: LearningBookQuizAttempt) => void;
}) {
  const [insertOpen, setInsertOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  if (!page) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zaki-muted">
        Select a chapter to start reading.
      </div>
    );
  }
  const healthRecord = asRecord(health);
  const kbDrift = asRecord(healthRecord.kb_drift);
  const hasDrift = Boolean(kbDrift.has_drift);
  const failedBlocks = page.blocks.filter((block) => block.status === "error");

  return (
    <div className="relative flex h-full flex-col">
      <header className="border-b border-zaki-border bg-zaki-raised px-8 py-5">
        <div className="mx-auto flex w-full max-w-[82ch] items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-1 text-xs font-semibold uppercase tracking-normal text-zaki-brand">
              {book.title}
            </div>
            <h1 className="text-2xl font-semibold leading-tight text-zaki-text">{page.title}</h1>
            {page.learning_objectives.length ? (
              <ul className="mt-3 space-y-1 text-sm text-zaki-muted">
                {page.learning_objectives.map((objective, index) => (
                  <li key={index}>- {objective}</li>
                ))}
              </ul>
            ) : null}
            {progress ? <LearningBookProgressTimeline progress={progress} compact className="mt-4" /> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-zaki-hover px-2.5 py-1 text-[11px] uppercase tracking-normal text-zaki-muted">
              {page.status}
            </span>
            {onRecompile ? (
              <button
                type="button"
                onClick={onRecompile}
                disabled={loading}
                className="inline-flex h-8 items-center gap-1.5 rounded-zaki-md border border-zaki-border px-2.5 text-xs font-semibold text-zaki-muted hover:border-zaki-brand/50 hover:text-zaki-brand disabled:opacity-60"
              >
                {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                Force regenerate
              </button>
            ) : null}
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className={cn("grid h-full", chatOpen ? "xl:grid-cols-[minmax(0,1fr)_360px]" : "xl:grid-cols-[minmax(0,1fr)_260px]")}>
        <div className="overflow-y-auto px-8 py-8">
        <article className="mx-auto flex w-full max-w-[82ch] flex-col gap-5">
          {hasDrift ? (
            <div className="rounded-zaki-md border border-amber-300/70 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div>
                  <div className="font-semibold">Knowledge source drift detected</div>
                  <p className="mt-1 text-xs opacity-80">
                    Some source libraries changed after this book was generated. Rebuild or regenerate stale pages.
                  </p>
                  <button
                    type="button"
                    onClick={onRefreshFingerprints}
                    disabled={loading}
                    className="mt-3 rounded-zaki-sm border border-current px-2 py-1 text-xs font-semibold disabled:opacity-60"
                  >
                    Refresh fingerprints
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {failedBlocks.length ? (
            <div className="rounded-zaki-md border border-amber-300/70 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
              <div className="mb-2 font-semibold">{failedBlocks.length} failed blocks</div>
              <div className="space-y-2">
                {failedBlocks.map((block) => (
                  <div key={block.id} className="flex flex-wrap items-center gap-2 text-xs">
                    <code className="rounded bg-white/50 px-1.5 py-0.5 dark:bg-white/10">{block.type}</code>
                    <span>{block.error || "Unknown error"}</span>
                    <button
                      type="button"
                      onClick={() => onRegenerateBlock(block)}
                      className="rounded border border-current px-1.5 py-0.5 font-medium"
                    >
                      Retry block
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {page.blocks.map((block, index) => (
            <BookBlock
              key={block.id}
              block={block}
              index={index}
              canMoveUp={index > 0}
              canMoveDown={index < page.blocks.length - 1}
              onRegenerate={() => onRegenerateBlock(block)}
              onDelete={() => onDeleteBlock(block)}
              onMove={(direction) => onMoveBlock(block, direction)}
              onChangeType={(newType) => onChangeBlockType(block, newType)}
              onDeepDive={(topic) => onDeepDive(block, topic)}
              onQuizAttempt={(attempt) => onQuizAttempt(block, attempt)}
            />
          ))}
          {!page.blocks.length ? (
            <div className="rounded-zaki-md border border-dashed border-zaki-border p-8 text-center text-sm text-zaki-muted">
              This page has no blocks yet.
            </div>
          ) : null}
          <div className="relative flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setInsertOpen((open) => !open)}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-zaki-border bg-zaki-raised px-3 py-1.5 text-xs font-semibold text-zaki-muted hover:border-zaki-brand/50 hover:text-zaki-brand"
            >
              <Plus className="size-3.5" />
              Insert block
            </button>
            {insertOpen ? (
              <div className="absolute top-full z-20 mt-2 grid w-72 grid-cols-2 gap-1 rounded-zaki-md border border-zaki-border bg-zaki-raised p-2 shadow-lg">
                {INSERTABLE_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setInsertOpen(false);
                      onInsertBlock(type);
                    }}
                    className="rounded-zaki-sm px-2 py-1 text-left text-xs text-zaki-text hover:bg-zaki-hover"
                  >
                    {type}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </article>
        </div>
        {chatOpen ? (
          <BookPageChatPanel
            book={book}
            page={page}
            onClose={() => setChatOpen(false)}
          />
        ) : (
          <PageBlockOutline page={page} />
        )}
        </div>
      </div>
      {!chatOpen ? (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="absolute bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-zaki-brand px-4 py-2 text-sm font-semibold text-white shadow-lg hover:opacity-90"
        >
          <MessageSquare className="size-4" />
          Chat
        </button>
      ) : null}
    </div>
  );
}

function PageBlockOutline({ page }: { page: LearningBookPage }) {
  const visibleBlocks = page.blocks.filter((block) => block.type !== "section" || block.title);
  if (!visibleBlocks.length) return null;
  return (
    <aside className="hidden min-h-0 border-l border-zaki-border bg-zaki-raised px-3 py-4 xl:flex xl:flex-col">
      <div className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-normal text-zaki-muted">
        Page outline
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {visibleBlocks.map((block, index) => {
          const label = block.title || textOf(block.params?.topic) || `${block.type} ${index + 1}`;
          return (
            <button
              key={block.id}
              type="button"
              onClick={() => {
                document.getElementById(`book-block-${block.id}`)?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
              className="flex w-full items-center gap-2 rounded-zaki-sm px-2 py-1.5 text-left text-xs text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text"
            >
              <span className={cn(
                "size-1.5 shrink-0 rounded-full",
                block.status === "error" ? "bg-rose-500" : block.status === "ready" ? "bg-emerald-500" : "bg-zaki-muted",
              )} />
              <span className="min-w-0 flex-1 truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function learningStreamText(eventType: string, payload: Item) {
  return (
    textOf(payload.content) ||
    textOf(payload.message) ||
    textOf(payload.delta) ||
    textOf(payload.text) ||
    (eventType === "error" ? textOf(payload.detail, "Learning stream returned an error.") : "")
  );
}

function BookPageChatPanel({
  book,
  page,
  onClose,
}: {
  book: LearningBook;
  page: LearningBookPage;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<BookChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState(
    getBookPageChatSession(book, page.id) || `book-${book.id}-page-${page.id}`,
  );
  const socketRef = useRef<WebSocket | null>(null);
  const assistantIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages([]);
    setInput("");
    setSessionId(
      getBookPageChatSession(book, page.id) || `book-${book.id}-page-${page.id}`,
    );
  }, [book.id, book.metadata, page.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming]);

  useEffect(() => {
    const socket = openLearningSocket("/api/learning/ws");
    socketRef.current = socket;
    if (!socket) {
      setConnected(false);
      return undefined;
    }

    socket.onopen = () => setConnected(true);
    socket.onmessage = (event) => {
      let payload: Item = {};
      try {
        payload = JSON.parse(String(event.data)) as Item;
      } catch {
        payload = { type: "content", content: String(event.data) };
      }
      const eventType = textOf(payload.type, "content");
      const content = learningStreamText(eventType, payload);
      const nextSessionId = textOf(payload.session_id);
      if (nextSessionId && nextSessionId !== sessionId) {
        setSessionId(nextSessionId);
        void setLearningBookPageChatSession({
          book_id: book.id,
          page_id: page.id,
          session_id: nextSessionId,
        }).catch(() => undefined);
      }

      if (["thinking", "progress", "tool_call", "tool_result", "observation"].includes(eventType)) {
        return;
      }

      if (eventType === "done" || eventType === "result") {
        if (content) appendAssistantContent(content, true);
        assistantIdRef.current = null;
        setStreaming(false);
        return;
      }

      if (eventType === "error") {
        setMessages((items) => [
          ...items,
          {
            id: `error-${Date.now()}`,
            role: "system",
            content: content || "Learning stream returned an error.",
          },
        ]);
        assistantIdRef.current = null;
        setStreaming(false);
        return;
      }

      if (content) appendAssistantContent(content);
    };
    socket.onerror = () => {
      setConnected(false);
      setStreaming(false);
      setMessages((items) => [
        ...items,
        {
          id: `socket-error-${Date.now()}`,
          role: "system",
          content: "Book chat connection failed.",
        },
      ]);
    };
    socket.onclose = () => {
      setConnected(false);
      setStreaming(false);
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [book.id, page.id]);

  const appendAssistantContent = (content: string, replace = false) => {
    const assistantId = assistantIdRef.current || `assistant-${Date.now()}`;
    assistantIdRef.current = assistantId;
    setMessages((items) => {
      const existing = items.find((message) => message.id === assistantId);
      if (existing) {
        return items.map((message) =>
          message.id === assistantId
            ? { ...message, content: replace ? content : `${message.content}${content}` }
            : message,
        );
      }
      return [...items, { id: assistantId, role: "assistant", content }];
    });
  };

  const send = () => {
    const content = input.trim();
    const socket = socketRef.current;
    if (!content || !socket || socket.readyState !== WebSocket.OPEN) return;
    setMessages((items) => [
      ...items,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content,
      },
    ]);
    setInput("");
    setStreaming(true);
    assistantIdRef.current = null;
    socket.send(
      JSON.stringify({
        type: "start_turn",
        content,
        capability: "chat",
        session_id: sessionId,
        tools: book.knowledge_bases?.length ? ["rag"] : [],
        knowledge_bases: book.knowledge_bases || [],
        book_references: [{ book_id: book.id, page_ids: [page.id] }],
      }),
    );
  };

  return (
    <aside className="flex min-h-0 border-l border-zaki-border bg-zaki-raised">
      <div className="flex min-h-0 w-full flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-zaki-border px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-zaki-text">Chapter chat</div>
            <div className="truncate text-xs text-zaki-muted">
              {connected ? "Connected" : "Connecting"} / {page.title}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-zaki-sm p-1 text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text"
            aria-label="Close chapter chat"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length ? (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "rounded-zaki-md px-3 py-2 text-sm leading-6",
                    message.role === "user"
                      ? "ml-8 bg-zaki-brand text-white"
                      : message.role === "assistant"
                        ? "mr-8 border border-zaki-border bg-zaki-base text-zaki-text"
                        : "border border-amber-300/70 bg-amber-500/10 text-amber-900 dark:text-amber-100",
                  )}
                >
                  {message.content}
                </div>
              ))}
              {streaming ? (
                <div className="mr-8 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 py-2 text-sm text-zaki-muted">
                  Thinking...
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>
          ) : (
            <div className="rounded-zaki-md border border-dashed border-zaki-border p-4 text-sm text-zaki-muted">
              Ask about this chapter. The active page is sent as context automatically.
            </div>
          )}
        </div>
        <div className="border-t border-zaki-border p-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder="Ask about this chapter..."
            className="min-h-20 w-full resize-none rounded-zaki-md border border-zaki-border bg-zaki-base p-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
          />
          <button
            type="button"
            disabled={!input.trim() || !connected || streaming}
            onClick={send}
            className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-zaki-md bg-zaki-brand text-sm font-semibold text-white disabled:opacity-60"
          >
            <Send className="size-4" />
            Send
          </button>
        </div>
      </div>
    </aside>
  );
}

function BookBlock({
  block,
  canMoveUp,
  canMoveDown,
  onRegenerate,
  onDelete,
  onMove,
  onChangeType,
  onDeepDive,
  onQuizAttempt,
}: {
  block: LearningBookBlock;
  index: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onRegenerate: () => void;
  onDelete: () => void;
  onMove: (direction: "up" | "down") => void;
  onChangeType: (newType: BlockType) => void;
  onDeepDive: (topic?: string) => void;
  onQuizAttempt: (attempt: LearningBookQuizAttempt) => void;
}) {
  return (
    <section id={`book-block-${block.id}`} className="scroll-mt-6 rounded-zaki-lg border border-zaki-border bg-zaki-raised p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-zaki-brand/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-normal text-zaki-brand">
              {block.type}
            </span>
            <span className="text-[11px] text-zaki-muted">{block.status}</span>
          </div>
          {block.title ? <h3 className="mt-2 text-base font-semibold text-zaki-text">{block.title}</h3> : null}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          <button
            type="button"
            onClick={() => onMove("up")}
            disabled={!canMoveUp}
            className="rounded-zaki-sm border border-zaki-border px-2 py-1 text-xs text-zaki-muted hover:border-zaki-brand/50 hover:text-zaki-brand disabled:opacity-40"
          >
            Up
          </button>
          <button
            type="button"
            onClick={() => onMove("down")}
            disabled={!canMoveDown}
            className="rounded-zaki-sm border border-zaki-border px-2 py-1 text-xs text-zaki-muted hover:border-zaki-brand/50 hover:text-zaki-brand disabled:opacity-40"
          >
            Down
          </button>
          <select
            value={CHANGEABLE_TYPES.includes(block.type) ? block.type : ""}
            onChange={(event) => {
              const nextType = event.target.value;
              if (nextType && nextType !== block.type) onChangeType(nextType);
            }}
            className="h-[26px] rounded-zaki-sm border border-zaki-border bg-zaki-base px-2 text-xs text-zaki-muted outline-none hover:border-zaki-brand/50 hover:text-zaki-brand"
            aria-label="Change block type"
          >
            <option value="" disabled>
              Type
            </option>
            {CHANGEABLE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onRegenerate}
            className="rounded-zaki-sm border border-zaki-border px-2 py-1 text-xs text-zaki-muted hover:border-zaki-brand/50 hover:text-zaki-brand"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-zaki-sm border border-zaki-border px-2 py-1 text-xs text-red-600 hover:border-red-500/50 hover:bg-red-500/10"
          >
            Delete
          </button>
        </div>
      </div>
      <LearningBookBlockContent
        block={block}
        onQuizAttempt={onQuizAttempt}
        onDeepDiveTopic={onDeepDive}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        {block.type === "quiz" ? (
          <>
            <button
              type="button"
              onClick={() => onQuizAttempt({ isCorrect: true })}
              className="rounded-zaki-sm border border-zaki-border px-2 py-1 text-xs text-zaki-muted hover:border-zaki-brand/50 hover:text-zaki-brand"
            >
              Mark correct
            </button>
            <button
              type="button"
              onClick={() => onQuizAttempt({ isCorrect: false })}
              className="rounded-zaki-sm border border-zaki-border px-2 py-1 text-xs text-zaki-muted hover:border-zaki-brand/50 hover:text-zaki-brand"
            >
              Mark needs review
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={() => onDeepDive()}
          className="rounded-zaki-sm border border-zaki-border px-2 py-1 text-xs text-zaki-muted hover:border-zaki-brand/50 hover:text-zaki-brand"
        >
          Deep dive
        </button>
      </div>
    </section>
  );
}
