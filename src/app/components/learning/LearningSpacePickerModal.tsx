import { useEffect, useState } from "react";
import {
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  FileText,
  GraduationCap,
  MessageSquare,
  Search as SearchIcon,
  Star,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getLearningBook,
  getLearningBookSpine,
  getLearningNotebook,
} from "@/lib/learningApi";

type Item = Record<string, unknown>;

type LearningSpacePickerKey =
  | "chat_history"
  | "books"
  | "notebooks"
  | "question_bank"
  | "skills"
  | "memory";

type SelectedHistorySpaceItem = {
  id: string;
  title: string;
};

type SelectedBookSpaceItem = {
  id: string;
  title: string;
  pages: Array<{
    id: string;
    title: string;
    chapterTitle?: string;
  }>;
};

type SelectedNotebookSpaceItem = {
  id: string;
  title: string;
  records: Array<{
    id: string;
    title: string;
    summary?: string;
    type?: string;
  }>;
};

type SelectedQuestionSpaceItem = {
  id: number;
  title: string;
};

type LearningMemoryFile = "summary" | "profile";

function asRecord(value: unknown): Item {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Item) : {};
}

function arrayOfItems(value: unknown): Item[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function textOf(value: unknown, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value).trim() || fallback;
}

function itemTitle(item: Item, fallback: string) {
  return (
    textOf(item.title) ||
    textOf(item.name) ||
    textOf(item.book_title) ||
    textOf(item.notebook_name) ||
    textOf(item.session_id) ||
    fallback
  );
}

function itemId(item: Item, fallback = "") {
  return (
    textOf(item.id) ||
    textOf(item.book_id) ||
    textOf(item.notebook_id) ||
    textOf(item.session_id) ||
    textOf(item.document_id) ||
    textOf(item.entry_id) ||
    textOf(item.bot_id) ||
    fallback
  );
}

function extractBookPages(detail: unknown, spine: unknown) {
  const detailRecord = asRecord(detail);
  const bookRecord = asRecord(detailRecord.book ?? detail);
  const spineRecord = asRecord(spine);
  const pageCandidates = [
    ...arrayOfItems(bookRecord.pages),
    ...arrayOfItems(detailRecord.pages),
    ...arrayOfItems(spineRecord.pages),
    ...arrayOfItems(spineRecord.chapters),
  ];
  const pageMap = new Map<string, { id: string; title: string; chapterTitle?: string }>();
  pageCandidates.forEach((page, index) => {
    const id =
      textOf(page.id) ||
      textOf(page.page_id) ||
      textOf(page.slug) ||
      textOf(page.key) ||
      String(index + 1);
    const title =
      textOf(page.title) ||
      textOf(page.name) ||
      textOf(page.heading) ||
      textOf(page.chapter_title) ||
      `Chapter ${index + 1}`;
    pageMap.set(id, {
      id,
      title,
      chapterTitle: textOf(page.chapter_title) || textOf(page.section_title) || undefined,
    });
  });

  arrayOfItems(bookRecord.chapters).forEach((chapter, index) => {
    const pages = arrayOfItems(chapter.pages);
    if (!pages.length) {
      const id = textOf(chapter.id) || textOf(chapter.chapter_id) || String(index + 1);
      if (!pageMap.has(id)) {
        pageMap.set(id, {
          id,
          title: textOf(chapter.title) || textOf(chapter.name) || `Chapter ${index + 1}`,
        });
      }
    }
    pages.forEach((page, pageIndex) => {
      const id = textOf(page.id) || textOf(page.page_id) || `${index + 1}-${pageIndex + 1}`;
      if (!pageMap.has(id)) {
        pageMap.set(id, {
          id,
          title: textOf(page.title) || textOf(page.name) || `Page ${pageIndex + 1}`,
          chapterTitle: textOf(chapter.title) || textOf(chapter.name) || undefined,
        });
      }
    });
  });

  return Array.from(pageMap.values());
}

function extractNotebookRecords(detail: unknown) {
  const detailRecord = asRecord(detail);
  const notebookRecord = asRecord(detailRecord.notebook ?? detail);
  const records = [
    ...arrayOfItems(notebookRecord.records),
    ...arrayOfItems(notebookRecord.items),
    ...arrayOfItems(detailRecord.records),
  ];
  return records.map((record, index) => {
    const id = textOf(record.id) || textOf(record.record_id) || String(index + 1);
    return {
      id,
      title:
        textOf(record.title) ||
        textOf(record.question) ||
        textOf(record.content).slice(0, 80) ||
        `Record ${index + 1}`,
      summary: textOf(record.summary) || textOf(record.content).slice(0, 140) || undefined,
      type: textOf(record.type) || textOf(record.kind) || undefined,
    };
  });
}

export function LearningSpacePickerModal({
  open,
  onClose,
  sessionItems,
  bookItems,
  notebookItems,
  questionItems,
  skillItems,
  selectedHistorySessions,
  selectedBooks,
  selectedNotebooks,
  selectedQuestions,
  selectedSkills,
  skillsAutoMode,
  selectedMemoryFiles,
  onChangeHistorySessions,
  onChangeBooks,
  onChangeNotebooks,
  onChangeQuestions,
  onChangeSkills,
  onChangeSkillsAuto,
  onChangeMemory,
}: {
  open: LearningSpacePickerKey | null;
  onClose: () => void;
  sessionItems: Item[];
  bookItems: Item[];
  notebookItems: Item[];
  questionItems: Item[];
  skillItems: Item[];
  selectedHistorySessions: SelectedHistorySpaceItem[];
  selectedBooks: SelectedBookSpaceItem[];
  selectedNotebooks: SelectedNotebookSpaceItem[];
  selectedQuestions: SelectedQuestionSpaceItem[];
  selectedSkills: string[];
  skillsAutoMode: boolean;
  selectedMemoryFiles: LearningMemoryFile[];
  onChangeHistorySessions: (items: SelectedHistorySpaceItem[]) => void;
  onChangeBooks: (items: SelectedBookSpaceItem[]) => void;
  onChangeNotebooks: (items: SelectedNotebookSpaceItem[]) => void;
  onChangeQuestions: (items: SelectedQuestionSpaceItem[]) => void;
  onChangeSkills: (items: string[]) => void;
  onChangeSkillsAuto: (value: boolean) => void;
  onChangeMemory: (items: LearningMemoryFile[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [expandedBookIds, setExpandedBookIds] = useState<Set<string>>(new Set());
  const [expandedNotebookIds, setExpandedNotebookIds] = useState<Set<string>>(new Set());
  const [bookPagesById, setBookPagesById] = useState<
    Record<string, Array<{ id: string; title: string; chapterTitle?: string }>>
  >({});
  const [notebookRecordsById, setNotebookRecordsById] = useState<
    Record<string, Array<{ id: string; title: string; summary?: string; type?: string }>>
  >({});

  useEffect(() => {
    if (open) setQuery("");
    if (open === "books") setExpandedBookIds(new Set(selectedBooks.map((book) => book.id)));
    if (open === "notebooks") {
      setExpandedNotebookIds(new Set(selectedNotebooks.map((notebook) => notebook.id)));
    }
  }, [open]);

  const loadBookPages = async (bookId: string) => {
    if (!bookId || bookPagesById[bookId] !== undefined) return;
    setBookPagesById((current) =>
      current[bookId] === undefined ? { ...current, [bookId]: [] } : current,
    );
    const [detail, spine] = await Promise.allSettled([
      getLearningBook(bookId),
      getLearningBookSpine(bookId),
    ]);
    setBookPagesById((current) => ({
      ...current,
      [bookId]: extractBookPages(
        detail.status === "fulfilled" ? detail.value : null,
        spine.status === "fulfilled" ? spine.value : null,
      ),
    }));
  };

  const loadNotebookRecords = async (notebookId: string) => {
    if (!notebookId || notebookRecordsById[notebookId] !== undefined) return;
    setNotebookRecordsById((current) =>
      current[notebookId] === undefined ? { ...current, [notebookId]: [] } : current,
    );
    const detail = await getLearningNotebook(notebookId).catch(() => null);
    setNotebookRecordsById((current) => ({
      ...current,
      [notebookId]: extractNotebookRecords(detail),
    }));
  };

  const toggleExpandedBook = (bookId: string) => {
    setExpandedBookIds((current) => {
      const next = new Set(current);
      if (next.has(bookId)) next.delete(bookId);
      else next.add(bookId);
      return next;
    });
    void loadBookPages(bookId);
  };

  const toggleExpandedNotebook = (notebookId: string) => {
    setExpandedNotebookIds((current) => {
      const next = new Set(current);
      if (next.has(notebookId)) next.delete(notebookId);
      else next.add(notebookId);
      return next;
    });
    void loadNotebookRecords(notebookId);
  };

  useEffect(() => {
    if (open !== "books") return;
    selectedBooks.forEach((book) => void loadBookPages(book.id));
  }, [open, selectedBooks]);

  useEffect(() => {
    if (open !== "notebooks") return;
    selectedNotebooks.forEach((notebook) => void loadNotebookRecords(notebook.id));
  }, [open, selectedNotebooks]);

  if (!open) return null;

  const title =
    open === "chat_history"
      ? "Select History Sessions"
      : open === "books"
        ? "Select Books"
        : open === "notebooks"
          ? "Select Notebooks"
          : open === "question_bank"
            ? "Select Question Bank Entries"
            : open === "skills"
              ? "Select Skills"
              : "Select Memory";
  const eyebrow =
    open === "chat_history"
      ? "Chat History Reference"
      : open === "books"
        ? "Book Reference"
        : open === "notebooks"
          ? "Notebook Reference"
          : open === "question_bank"
            ? "Question Bank Reference"
            : open === "skills"
              ? "Skills Reference"
              : "Memory Reference";
  const Icon =
    open === "chat_history"
      ? MessageSquare
      : open === "books"
        ? BookOpen
        : open === "notebooks"
          ? FileText
          : open === "question_bank"
            ? GraduationCap
            : open === "skills"
              ? Star
              : Brain;

  const keyword = query.trim().toLowerCase();
  const filterItems = (items: Item[]) =>
    keyword
      ? items.filter((item, index) =>
          `${itemTitle(item, String(index))} ${textOf(item.description)} ${textOf(item.question)} ${textOf(item.last_message)}`
            .toLowerCase()
            .includes(keyword),
        )
      : items;

  const selectedCount =
    open === "chat_history"
      ? selectedHistorySessions.length
      : open === "books"
        ? selectedBooks.length
        : open === "notebooks"
          ? selectedNotebooks.length
          : open === "question_bank"
            ? selectedQuestions.length
            : open === "skills"
              ? skillsAutoMode
                ? 1
                : selectedSkills.length
              : selectedMemoryFiles.length;
  const visibleSessions = open === "chat_history" ? filterItems(sessionItems) : [];
  const visibleBooks = open === "books" ? filterItems(bookItems) : [];
  const visibleNotebooks = open === "notebooks" ? filterItems(notebookItems) : [];
  const visibleQuestions = open === "question_bank" ? filterItems(questionItems) : [];
  const visibleSkills = open === "skills" ? filterItems(skillItems) : [];
  const emptyMessage =
    open === "chat_history"
      ? "No matching sessions found."
      : open === "books"
        ? "No books found."
        : open === "notebooks"
          ? "No notebooks found."
          : open === "question_bank"
            ? "No question bank entries found."
            : open === "skills"
              ? "No skills found."
              : "";

  const toggleHistorySession = (item: Item, index: number) => {
    const id = itemId(item, `session-${index}`);
    const title = itemTitle(item, `Session ${index + 1}`);
    onChangeHistorySessions(
      selectedHistorySessions.some((entry) => entry.id === id)
        ? selectedHistorySessions.filter((entry) => entry.id !== id)
        : [...selectedHistorySessions, { id, title }],
    );
  };

  const setBookPages = (
    bookId: string,
    bookTitle: string,
    pages: SelectedBookSpaceItem["pages"],
  ) => {
    onChangeBooks(
      pages.length
        ? [
            ...selectedBooks.filter((entry) => entry.id !== bookId),
            { id: bookId, title: bookTitle, pages },
          ]
        : selectedBooks.filter((entry) => entry.id !== bookId),
    );
  };

  const toggleBookPage = (
    bookId: string,
    bookTitle: string,
    page: SelectedBookSpaceItem["pages"][number],
  ) => {
    const currentPages = selectedBooks.find((book) => book.id === bookId)?.pages ?? [];
    const nextPages = currentPages.some((entry) => entry.id === page.id)
      ? currentPages.filter((entry) => entry.id !== page.id)
      : [...currentPages, page];
    setBookPages(bookId, bookTitle, nextPages);
  };

  const toggleBookAll = (
    bookId: string,
    bookTitle: string,
    pages: SelectedBookSpaceItem["pages"],
  ) => {
    const currentPages = selectedBooks.find((book) => book.id === bookId)?.pages ?? [];
    const allSelected = pages.length > 0 && pages.every((page) =>
      currentPages.some((entry) => entry.id === page.id),
    );
    setBookPages(bookId, bookTitle, allSelected ? [] : pages);
  };

  const setNotebookRecords = (
    notebookId: string,
    notebookTitle: string,
    records: SelectedNotebookSpaceItem["records"],
  ) => {
    onChangeNotebooks(
      records.length
        ? [
            ...selectedNotebooks.filter((entry) => entry.id !== notebookId),
            { id: notebookId, title: notebookTitle, records },
          ]
        : selectedNotebooks.filter((entry) => entry.id !== notebookId),
    );
  };

  const toggleNotebookRecord = (
    notebookId: string,
    notebookTitle: string,
    record: SelectedNotebookSpaceItem["records"][number],
  ) => {
    const currentRecords =
      selectedNotebooks.find((notebook) => notebook.id === notebookId)?.records ?? [];
    const nextRecords = currentRecords.some((entry) => entry.id === record.id)
      ? currentRecords.filter((entry) => entry.id !== record.id)
      : [...currentRecords, record];
    setNotebookRecords(notebookId, notebookTitle, nextRecords);
  };

  const toggleNotebookAll = (
    notebookId: string,
    notebookTitle: string,
    records: SelectedNotebookSpaceItem["records"],
  ) => {
    const currentRecords =
      selectedNotebooks.find((notebook) => notebook.id === notebookId)?.records ?? [];
    const allSelected = records.length > 0 && records.every((record) =>
      currentRecords.some((entry) => entry.id === record.id),
    );
    setNotebookRecords(notebookId, notebookTitle, allSelected ? [] : records);
  };

  const toggleQuestion = (item: Item, index: number) => {
    const rawId = Number(itemId(item, String(index)));
    const id = Number.isFinite(rawId) ? rawId : index;
    const title = itemTitle(item, textOf(item.question, `Question ${index + 1}`));
    onChangeQuestions(
      selectedQuestions.some((entry) => entry.id === id)
        ? selectedQuestions.filter((entry) => entry.id !== id)
        : [...selectedQuestions, { id, title }],
    );
  };

  const skillName = (item: Item, index: number) =>
    textOf(item.name) || textOf(item.id) || itemTitle(item, `skill-${index}`);
  const toggleSkill = (item: Item, index: number) => {
    const name = skillName(item, index);
    onChangeSkillsAuto(false);
    onChangeSkills(
      selectedSkills.includes(name)
        ? selectedSkills.filter((entry) => entry !== name)
        : [...selectedSkills, name],
    );
  };

  const toggleMemory = (file: LearningMemoryFile) => {
    onChangeMemory(
      selectedMemoryFiles.includes(file)
        ? selectedMemoryFiles.filter((entry) => entry !== file)
        : [...selectedMemoryFiles, file],
    );
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-[var(--background)]/65 p-4 backdrop-blur-md">
      <div className="surface-card w-full max-w-4xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-[0_22px_70px_rgba(0,0,0,0.18)]">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
              <Icon className="h-3 w-3" />
              {eyebrow}
            </div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              Choose context to ground the next learning turn.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="bg-[var(--background)]/40 p-5">
          {open !== "memory" ? (
            <div className="mb-4 flex items-center gap-2">
              <div className="relative flex-1">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] py-2.5 pl-9 pr-3 text-[13px] text-[var(--foreground)] outline-none transition focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/15"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (open === "chat_history") onChangeHistorySessions([]);
                  if (open === "books") onChangeBooks([]);
                  if (open === "notebooks") onChangeNotebooks([]);
                  if (open === "question_bank") onChangeQuestions([]);
                  if (open === "skills") {
                    onChangeSkills([]);
                    onChangeSkillsAuto(false);
                  }
                }}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-[12px] font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Clear
              </button>
            </div>
          ) : null}

          {open === "skills" ? (
            <button
              type="button"
              onClick={() => {
                onChangeSkillsAuto(!skillsAutoMode);
                if (!skillsAutoMode) onChangeSkills([]);
              }}
              className={cn(
                "mb-3 flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                skillsAutoMode
                  ? "border-[var(--primary)]/40 bg-[var(--primary)]/8"
                  : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/40",
              )}
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />
              <div>
                <div className="text-[14px] font-medium text-[var(--foreground)]">Auto</div>
                <p className="mt-0.5 text-[12px] leading-5 text-[var(--muted-foreground)]">
                  Let the model auto-select relevant skills for this turn.
                </p>
              </div>
            </button>
          ) : null}

          <div className="max-h-[56vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            <div className="divide-y divide-[var(--border)]">
              {open === "chat_history"
                ? visibleSessions.map((item, index) => {
                    const id = itemId(item, `session-${index}`);
                    const active = selectedHistorySessions.some((entry) => entry.id === id);
                    const lastMessage = textOf(item.last_message);
                    const messageCount = textOf(item.message_count);
                    return (
                      <LearningSpacePickerRow
                        key={id}
                        active={active}
                        icon={MessageSquare}
                        title={itemTitle(item, `Session ${index + 1}`)}
                        description={[
                          lastMessage,
                          messageCount ? `${messageCount} messages` : "",
                        ]
                          .filter(Boolean)
                          .join(" / ")}
                        onClick={() => toggleHistorySession(item, index)}
                      />
                    );
                  })
                : null}
              {open === "books"
                ? visibleBooks.map((item, index) => {
                    const id = itemId(item, `book-${index}`);
                    const title = itemTitle(item, `Book ${index + 1}`);
                    const expanded = expandedBookIds.has(id);
                    const pages = bookPagesById[id];
                    const selectedPages = selectedBooks.find((entry) => entry.id === id)?.pages ?? [];
                    const allSelected = Boolean(
                      pages?.length && pages.every((page) =>
                        selectedPages.some((entry) => entry.id === page.id),
                      ),
                    );
                    return (
                      <div key={id} className="divide-y divide-[var(--border)]">
                        <LearningSpacePickerRow
                          active={allSelected}
                          icon={BookOpen}
                          trailingIcon={ChevronDown}
                          trailingActive={expanded}
                          title={title}
                          description={
                            pages
                              ? `${pages.length} chapters${textOf(item.description) ? ` / ${textOf(item.description)}` : ""}`
                              : expanded
                                ? "Loading chapters..."
                                : "Expand to choose chapters"
                          }
                          onClick={() => toggleExpandedBook(id)}
                          onSelectAll={pages?.length ? () => toggleBookAll(id, title, pages) : undefined}
                        />
                        {expanded && pages?.map((page) => {
                          const active = selectedPages.some((entry) => entry.id === page.id);
                          return (
                            <LearningSpacePickerRow
                              key={`${id}-${page.id}`}
                              active={active}
                              inset
                              icon={FileText}
                              title={page.title}
                              description={page.chapterTitle}
                              onClick={() => toggleBookPage(id, title, page)}
                            />
                          );
                        })}
                      </div>
                    );
                  })
                : null}
              {open === "notebooks"
                ? visibleNotebooks.map((item, index) => {
                    const id = itemId(item, `notebook-${index}`);
                    const title = itemTitle(item, `Notebook ${index + 1}`);
                    const expanded = expandedNotebookIds.has(id);
                    const records = notebookRecordsById[id];
                    const selectedRecords =
                      selectedNotebooks.find((entry) => entry.id === id)?.records ?? [];
                    const allSelected = Boolean(
                      records?.length && records.every((record) =>
                        selectedRecords.some((entry) => entry.id === record.id),
                      ),
                    );
                    return (
                      <div key={id} className="divide-y divide-[var(--border)]">
                        <LearningSpacePickerRow
                          active={allSelected}
                          icon={FileText}
                          trailingIcon={ChevronDown}
                          trailingActive={expanded}
                          title={title}
                          description={
                            records
                              ? `${records.length} records${textOf(item.description) ? ` / ${textOf(item.description)}` : ""}`
                              : expanded
                                ? "Loading records..."
                                : "Expand to choose records"
                          }
                          onClick={() => toggleExpandedNotebook(id)}
                          onSelectAll={records?.length ? () => toggleNotebookAll(id, title, records) : undefined}
                        />
                        {expanded && records?.map((record) => {
                          const active = selectedRecords.some((entry) => entry.id === record.id);
                          return (
                            <LearningSpacePickerRow
                              key={`${id}-${record.id}`}
                              active={active}
                              inset
                              icon={FileText}
                              title={record.title}
                              description={[record.type, record.summary].filter(Boolean).join(" / ")}
                              onClick={() => toggleNotebookRecord(id, title, record)}
                            />
                          );
                        })}
                      </div>
                    );
                  })
                : null}
              {open === "question_bank"
                ? visibleQuestions.map((item, index) => {
                    const rawId = Number(itemId(item, String(index)));
                    const id = Number.isFinite(rawId) ? rawId : index;
                    const active = selectedQuestions.some((entry) => entry.id === id);
                    return (
                      <LearningSpacePickerRow
                        key={id}
                        active={active}
                        icon={GraduationCap}
                        title={itemTitle(item, textOf(item.question, `Question ${index + 1}`))}
                        description={[textOf(item.difficulty), textOf(item.session_title)]
                          .filter(Boolean)
                          .join(" / ")}
                        onClick={() => toggleQuestion(item, index)}
                      />
                    );
                  })
                : null}
              {open === "skills"
                ? visibleSkills.map((item, index) => {
                    const name = skillName(item, index);
                    const active = !skillsAutoMode && selectedSkills.includes(name);
                    return (
                      <LearningSpacePickerRow
                        key={name}
                        active={active}
                        muted={skillsAutoMode}
                        icon={Star}
                        title={name}
                        description={textOf(item.description) || arrayOfItems(item.tags).join(", ")}
                        onClick={() => toggleSkill(item, index)}
                      />
                    );
                  })
                : null}
              {open !== "memory" &&
              !visibleSessions.length &&
              !visibleBooks.length &&
              !visibleNotebooks.length &&
              !visibleQuestions.length &&
              !visibleSkills.length ? (
                <div className="px-4 py-10 text-center text-[13px] text-[var(--muted-foreground)]">
                  {emptyMessage}
                </div>
              ) : null}
              {open === "memory"
                ? ([
                    {
                      key: "summary" as const,
                      title: "Summary",
                      description: "Inject the assistant's running summary of past learning sessions.",
                      icon: Brain,
                    },
                    {
                      key: "profile" as const,
                      title: "Profile",
                      description: "Inject the learner profile, preferences, goals, and background.",
                      icon: FileText,
                    },
                  ]).map((item) => (
                    <LearningSpacePickerRow
                      key={item.key}
                      active={selectedMemoryFiles.includes(item.key)}
                      icon={item.icon}
                      title={item.title}
                      description={item.description}
                      onClick={() => toggleMemory(item.key)}
                    />
                  ))
                : null}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-[12px] text-[var(--muted-foreground)]">
              {selectedCount} selected
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={!selectedCount}
              className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Use Selected ({selectedCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LearningSpacePickerRow({
  active,
  muted,
  inset,
  icon: Icon,
  trailingIcon: TrailingIcon,
  trailingActive,
  title,
  description,
  onClick,
  onSelectAll,
}: {
  active: boolean;
  muted?: boolean;
  inset?: boolean;
  icon: LucideIcon;
  trailingIcon?: LucideIcon;
  trailingActive?: boolean;
  title: string;
  description?: string;
  onClick: () => void;
  onSelectAll?: () => void;
}) {
  return (
    <div className={cn("flex w-full items-stretch", active ? "bg-[var(--primary)]/8" : "")}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left transition-colors",
          inset && "pl-9",
          !active && "hover:bg-[var(--muted)]/40",
          muted && "opacity-55",
        )}
      >
        <div
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
            active
              ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
              : "border-[var(--border)] text-transparent",
          )}
        >
          <CheckCircle2 size={12} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[14px] font-medium text-[var(--foreground)]">
            <Icon size={14} strokeWidth={1.7} className="shrink-0 text-[var(--primary)]" />
            <span className="truncate">{title}</span>
          </div>
          {description ? (
            <p className="mt-0.5 line-clamp-2 text-[12px] leading-5 text-[var(--muted-foreground)]">
              {description}
            </p>
          ) : null}
        </div>
        {TrailingIcon ? (
          <TrailingIcon
            size={16}
            className={cn(
              "mt-1 shrink-0 text-[var(--muted-foreground)] transition-transform",
              trailingActive && "rotate-180",
            )}
          />
        ) : null}
      </button>
      {onSelectAll ? (
        <button
          type="button"
          onClick={onSelectAll}
          className="shrink-0 border-l border-[var(--border)] px-3 text-[11px] font-semibold uppercase tracking-normal text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        >
          {active ? "Clear" : "All"}
        </button>
      ) : null}
    </div>
  );
}
