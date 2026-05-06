import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Code2,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  compileLearningBookPage,
  confirmLearningBookProposal,
  confirmLearningBookSpine,
  createLearningBookDeepDive,
  deleteLearningBook,
  deleteLearningBookBlock,
  getLearningBook,
  getLearningBookHealth,
  insertLearningBookBlock,
  learningKeys,
  moveLearningBookBlock,
  rebuildLearningBook,
  recordLearningBookQuizAttempt,
  regenerateLearningBookBlock,
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

function extractText(payload: Item, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
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

export function LearningBookWorkspace({
  bookTopic,
  setBookTopic,
  createBook,
  items,
}: {
  bookTopic: string;
  setBookTopic: (value: string) => void;
  createBook: UseMutationResult<unknown, Error, string, unknown>;
  items: Item[];
}) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [proposalDraft, setProposalDraft] = useState("");
  const [spineDraft, setSpineDraft] = useState("");

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
      const payload = await createBook.mutateAsync(topic);
      const root = asRecord(payload);
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
                draft={proposalDraft || jsonText(detail.book.proposal || {})}
                setDraft={setProposalDraft}
                loading={runBookAction.isPending}
                onConfirm={handleConfirmProposal}
              />
            ) : detail.book.status === "spine_ready" && detail.spine ? (
              <BookSpineView
                spine={detail.spine}
                draft={spineDraft || jsonText(detail.spine)}
                setDraft={setSpineDraft}
                loading={runBookAction.isPending}
                onConfirm={handleConfirmSpine}
              />
            ) : (
              <BookReaderView
                book={detail.book}
                page={activePage}
                health={healthQuery.data}
                loading={runBookAction.isPending}
                onRecompile={activePage ? () => handleCompilePage(activePage, true) : undefined}
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
                onDeepDive={(block) => {
                  if (!activeBook || !activePage) return;
                  const topic =
                    textOf(block.params?.topic) || textOf(block.title) || activePage.title || "this topic";
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
                onQuizCorrect={(block, isCorrect) => {
                  if (!activeBook || !activePage) return;
                  runBookAction.mutate({
                    label: "Quiz attempt recorded",
                    action: () =>
                      recordLearningBookQuizAttempt({
                        book_id: activeBook.id,
                        page_id: activePage.id,
                        block_id: block.id,
                        is_correct: isCorrect,
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
  onCreate: () => void;
  onSelect: (book: LearningBook) => void;
  onDelete: (book: LearningBook) => void;
}) {
  const stats = {
    total: allBooks.length,
    ready: allBooks.filter((book) => book.status === "ready").length,
    inProgress: allBooks.filter((book) => ["draft", "spine_ready", "compiling"].includes(book.status)).length,
    chapters: allBooks.reduce((sum, book) => sum + (book.chapter_count || 0), 0),
  };

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
      <div className="grid gap-3 border-b border-zaki-border p-5 sm:grid-cols-4">
        <BookStat icon={BookOpen} label="Total books" value={stats.total} />
        <BookStat icon={CheckCircle2} label="Ready" value={stats.ready} />
        <BookStat icon={Sparkles} label="In progress" value={stats.inProgress} />
        <BookStat icon={Layers} label="Chapters" value={stats.chapters} />
      </div>
      <div className="border-b border-zaki-border p-5">
        <div className="flex flex-col gap-3 lg:flex-row">
          <input
            value={bookTopic}
            onChange={(event) => setBookTopic(event.target.value)}
            placeholder="What should ZAKI teach?"
            className="h-10 min-w-0 flex-1 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
          />
          <button
            type="button"
            disabled={!bookTopic.trim() || creating}
            onClick={onCreate}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-zaki-md bg-zaki-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            New book
          </button>
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
  draft,
  setDraft,
  loading,
  onConfirm,
}: {
  book: LearningBook;
  draft: string;
  setDraft: (value: string) => void;
  loading: boolean;
  onConfirm: () => void;
}) {
  const proposal = asRecord(book.proposal);
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 rounded-zaki-lg border border-zaki-border bg-zaki-raised p-5">
          <div className="mb-1 text-xs font-semibold uppercase tracking-normal text-zaki-brand">
            Draft proposal
          </div>
          <h2 className="text-2xl font-semibold text-zaki-text">
            {textOf(proposal.title, book.title)}
          </h2>
          <p className="mt-2 text-sm leading-6 text-zaki-muted">
            {textOf(proposal.description, book.description || "Review and confirm the generated proposal.")}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <ProposalField label="Scope" value={textOf(proposal.scope, "Not specified")} />
            <ProposalField label="Level" value={textOf(proposal.target_level, "Not specified")} />
            <ProposalField label="Chapters" value={textOf(proposal.estimated_chapters, "Auto")} />
          </div>
        </div>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="min-h-[340px] w-full resize-y rounded-zaki-md border border-zaki-border bg-zaki-raised p-4 font-mono text-xs text-zaki-text outline-none focus:border-zaki-brand"
        />
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

function ProposalField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-zaki-md border border-zaki-border bg-zaki-base p-3">
      <div className="text-[10px] font-semibold uppercase tracking-normal text-zaki-muted">{label}</div>
      <div className="mt-1 text-sm text-zaki-text">{value}</div>
    </div>
  );
}

function BookSpineView({
  spine,
  draft,
  setDraft,
  loading,
  onConfirm,
}: {
  spine: Item;
  draft: string;
  setDraft: (value: string) => void;
  loading: boolean;
  onConfirm: () => void;
}) {
  const chapters = arrayOfRecords(spine.chapters);
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
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-3">
            {chapters.map((chapter, index) => (
              <div key={itemId(chapter, `chapter-${index}`)} className="rounded-zaki-md border border-zaki-border bg-zaki-raised p-4">
                <div className="text-xs font-semibold text-zaki-brand">Chapter {index + 1}</div>
                <div className="mt-1 text-base font-semibold text-zaki-text">
                  {textOf(chapter.title, `Chapter ${index + 1}`)}
                </div>
                <ul className="mt-2 space-y-1 text-sm text-zaki-muted">
                  {extractList(chapter, ["learning_objectives"]).map((objective, objectiveIndex) => (
                    <li key={objectiveIndex}>- {objective}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-[520px] w-full resize-y rounded-zaki-md border border-zaki-border bg-zaki-raised p-4 font-mono text-xs text-zaki-text outline-none focus:border-zaki-brand"
          />
        </div>
      </div>
    </div>
  );
}

function BookReaderView({
  book,
  page,
  health,
  loading,
  onRecompile,
  onRegenerateBlock,
  onDeleteBlock,
  onMoveBlock,
  onInsertBlock,
  onDeepDive,
  onQuizCorrect,
}: {
  book: LearningBook;
  page: LearningBookPage | null;
  health: unknown;
  loading: boolean;
  onRecompile?: () => void;
  onRegenerateBlock: (block: LearningBookBlock) => void;
  onDeleteBlock: (block: LearningBookBlock) => void;
  onMoveBlock: (block: LearningBookBlock, direction: "up" | "down") => void;
  onInsertBlock: (blockType: BlockType) => void;
  onDeepDive: (block: LearningBookBlock) => void;
  onQuizCorrect: (block: LearningBookBlock, isCorrect: boolean) => void;
}) {
  const [insertOpen, setInsertOpen] = useState(false);
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
    <div className="flex h-full flex-col">
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
      <div className="flex-1 overflow-y-auto px-8 py-8">
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
              onDeepDive={() => onDeepDive(block)}
              onQuizCorrect={(isCorrect) => onQuizCorrect(block, isCorrect)}
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
    </div>
  );
}

function BookBlock({
  block,
  canMoveUp,
  canMoveDown,
  onRegenerate,
  onDelete,
  onMove,
  onDeepDive,
  onQuizCorrect,
}: {
  block: LearningBookBlock;
  index: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onRegenerate: () => void;
  onDelete: () => void;
  onMove: (direction: "up" | "down") => void;
  onDeepDive: () => void;
  onQuizCorrect: (isCorrect: boolean) => void;
}) {
  return (
    <section className="rounded-zaki-lg border border-zaki-border bg-zaki-raised p-5">
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
      <BlockContent block={block} />
      <div className="mt-4 flex flex-wrap gap-2">
        {block.type === "quiz" ? (
          <>
            <button
              type="button"
              onClick={() => onQuizCorrect(true)}
              className="rounded-zaki-sm border border-zaki-border px-2 py-1 text-xs text-zaki-muted hover:border-zaki-brand/50 hover:text-zaki-brand"
            >
              Mark correct
            </button>
            <button
              type="button"
              onClick={() => onQuizCorrect(false)}
              className="rounded-zaki-sm border border-zaki-border px-2 py-1 text-xs text-zaki-muted hover:border-zaki-brand/50 hover:text-zaki-brand"
            >
              Mark needs review
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={onDeepDive}
          className="rounded-zaki-sm border border-zaki-border px-2 py-1 text-xs text-zaki-muted hover:border-zaki-brand/50 hover:text-zaki-brand"
        >
          Deep dive
        </button>
      </div>
    </section>
  );
}

function BlockContent({ block }: { block: LearningBookBlock }) {
  const payload = block.payload || {};
  const params = block.params || {};
  const markdown =
    extractText(payload, ["markdown", "content", "text", "body", "summary", "explanation"]) ||
    extractText(params, ["markdown", "content", "text", "body", "prompt"]);
  if (markdown) {
    return (
      <div className="prose prose-sm max-w-none text-zaki-text dark:prose-invert">
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
    );
  }
  const code = extractText(payload, ["code", "source"]);
  if (code) {
    return (
      <pre className="overflow-x-auto rounded-zaki-md bg-zaki-base p-4 text-xs text-zaki-text">
        <code>{code}</code>
      </pre>
    );
  }
  const items = extractList(payload, ["items", "bullets", "cards", "steps"]);
  if (items.length) {
    return (
      <ul className="space-y-2 text-sm text-zaki-text">
        {items.map((item, index) => (
          <li key={index} className="rounded-zaki-md bg-zaki-base px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="rounded-zaki-md border border-dashed border-zaki-border bg-zaki-base p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-zaki-muted">
        <Code2 className="size-3.5" />
        Raw block payload
      </div>
      <pre className="max-h-72 overflow-auto text-xs text-zaki-muted">{jsonText(payload)}</pre>
    </div>
  );
}
