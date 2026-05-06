import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import type { DragEvent, ReactNode, RefObject } from "react";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock3,
  FileText,
  FolderUp,
  GraduationCap,
  Image,
  Layers,
  PenLine,
  Plus,
  RefreshCw,
  Send,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  analyzeLearningVision,
  createLearningBook,
  createLearningCoWriterDocument,
  createLearningKnowledge,
  createLearningNotebook,
  createLearningTutorAgent,
  getLearningBook,
  getLearningBookSpine,
  getLearningCoWriterDocument,
  getLearningNotebook,
  getLearningQuestionEntry,
  getLearningSolveSession,
  getLearningTutorAgent,
  getLearningTutorAgentHistory,
  learningKeys,
  learningRequest,
  listLearningKnowledgeFiles,
  listLearningBooks,
  listLearningCoWriterDocuments,
  listLearningKnowledge,
  listLearningNotebooks,
  listLearningQuestions,
  listLearningSolveSessions,
  listLearningTutorAgents,
  runLearningCoWriterEdit,
  updateLearningCoWriterDocument,
  uploadLearningKnowledge,
  type LearningJson,
} from "@/lib/learningApi";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";

type LearningTab =
  | "sources"
  | "books"
  | "notebooks"
  | "writer"
  | "review"
  | "agents"
  | "workspaces";

type Item = Record<string, unknown>;
type LearningObjectType =
  | "source"
  | "book"
  | "notebook"
  | "document"
  | "question"
  | "agent"
  | "solve";

type SelectedLearningObject = {
  type: LearningObjectType;
  id: string;
  item: Item;
};

const tabs: Array<{ id: LearningTab; label: string; icon: typeof BookOpen }> = [
  { id: "sources", label: "Sources", icon: Upload },
  { id: "books", label: "Books", icon: BookOpen },
  { id: "notebooks", label: "Notebooks", icon: FileText },
  { id: "writer", label: "Co-writer", icon: PenLine },
  { id: "review", label: "Review", icon: GraduationCap },
  { id: "agents", label: "Tutors", icon: Bot },
  { id: "workspaces", label: "Solve", icon: Layers },
];

function asRecord(value: unknown): Item {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Item)
    : {};
}

function itemList(value: unknown, keys: string[]): Item[] {
  if (Array.isArray(value)) return value.filter(isItem);
  const record = asRecord(value);
  for (const key of keys) {
    const nested = record[key];
    if (Array.isArray(nested)) return nested.filter(isItem);
  }
  return [];
}

function isItem(value: unknown): value is Item {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function textOf(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function itemTitle(item: Item, fallback: string) {
  return (
    textOf(item.title) ||
    textOf(item.name) ||
    textOf(item.id) ||
    textOf(item.book_id) ||
    textOf(item.session_id) ||
    fallback
  );
}

function itemId(item: Item, fallback = "") {
  return (
    textOf(item.id) ||
    textOf(item.name) ||
    textOf(item.book_id) ||
    textOf(item.notebook_id) ||
    textOf(item.session_id) ||
    textOf(item.bot_id) ||
    fallback
  );
}

function numericOf(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function boolText(value: unknown) {
  if (typeof value === "boolean") return value ? "running" : "stopped";
  return "";
}

function itemStatus(item: Item) {
  return (
    textOf(item.status) ||
    textOf(item.state) ||
    textOf(item.phase) ||
    boolText(item.running) ||
    "ready"
  );
}

function statusTone(status: string) {
  const normalized = status.toLowerCase();
  if (["ready", "healthy", "completed", "done", "running"].includes(normalized)) {
    return "bg-emerald-500";
  }
  if (["generating", "processing", "planning", "partial", "queued"].includes(normalized)) {
    return "bg-amber-500";
  }
  if (["error", "failed"].includes(normalized)) return "bg-rose-500";
  return "bg-zaki-muted";
}

function relativeTime(value: unknown): string {
  const raw = typeof value === "string" || typeof value === "number" ? value : "";
  if (!raw) return "";
  const seconds = typeof raw === "number" && raw < 10_000_000_000 ? raw : null;
  const millis = seconds ? seconds * 1000 : new Date(raw).getTime();
  if (!Number.isFinite(millis)) return "";
  const diffMs = Date.now() - millis;
  if (diffMs < 60_000) return "now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function displayCount(item: Item) {
  const raw =
    item.chapter_count ??
    item.page_count ??
    item.record_count ??
    item.entry_count ??
    item.message_count ??
    asRecord(item.statistics).raw_documents;
  const count = numericOf(raw, -1);
  return count >= 0 ? String(count) : "";
}

function JsonPreview({ value }: { value: unknown }) {
  return (
    <pre className="max-h-48 overflow-auto rounded-zaki-md border border-zaki-border bg-zaki-base p-3 text-xs leading-relaxed text-zaki-secondary">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-block size-2 rounded-full",
        ok ? "bg-emerald-500" : "bg-amber-500",
      )}
    />
  );
}

function EmptyLine({ label }: { label: string }) {
  return (
    <div className="rounded-zaki-md border border-dashed border-zaki-border px-4 py-6 text-center text-sm text-zaki-muted">
      {label}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-zaki-border py-5 last:border-b-0">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-zaki-text">{title}</h2>
        {subtitle ? <p className="text-sm text-zaki-muted">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || "");
      resolve(raw.includes(",") ? raw.split(",").slice(1).join(",") : raw);
    };
    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });
}

function LearningStats({
  knowledgeCount,
  bookCount,
  notebookCount,
  documentCount,
  questionCount,
  agentCount,
  solveCount,
}: {
  knowledgeCount: number;
  bookCount: number;
  notebookCount: number;
  documentCount: number;
  questionCount: number;
  agentCount: number;
  solveCount: number;
}) {
  const stats = [
    { label: "Sources", value: knowledgeCount, icon: Upload },
    { label: "Books", value: bookCount, icon: BookOpen },
    { label: "Notes", value: notebookCount, icon: FileText },
    { label: "Drafts", value: documentCount, icon: PenLine },
    { label: "Review", value: questionCount, icon: GraduationCap },
    { label: "Tutors", value: agentCount, icon: Bot },
    { label: "Solve", value: solveCount, icon: Layers },
  ];
  return (
    <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="flex min-h-20 items-center gap-3 rounded-zaki-lg border border-zaki-border bg-zaki-raised px-3 py-3"
          >
            <div className="flex size-9 items-center justify-center rounded-zaki-md bg-zaki-hover text-zaki-brand">
              <Icon className="size-4" />
            </div>
            <div>
              <div className="text-lg font-semibold leading-none text-zaki-text">
                {stat.value}
              </div>
              <div className="mt-1 text-xs text-zaki-muted">{stat.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LearningRail({
  activeTab,
  setTab,
  books,
  documents,
  agents,
  questions,
}: {
  activeTab: LearningTab;
  setTab: (tab: LearningTab) => void;
  books: Item[];
  documents: Item[];
  agents: Item[];
  questions: Item[];
}) {
  return (
    <aside className="hidden min-w-0 rounded-zaki-lg border border-zaki-border bg-zaki-raised p-2 xl:block">
      <div className="px-2 pb-2 pt-1">
        <div className="text-xs font-semibold uppercase tracking-normal text-zaki-muted">
          Learning
        </div>
      </div>
      <nav className="space-y-1">
        {tabs.map((entry) => {
          const Icon = entry.icon;
          const active = activeTab === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={cn(
                "group flex w-full items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm transition-colors",
                active
                  ? "bg-zaki-selected font-medium text-zaki-text"
                  : "text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-left">{entry.label}</span>
              {active ? <span className="size-1.5 rounded-full bg-zaki-brand" /> : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-zaki-border pt-3">
        <RailGroup title="Recent books" items={books} empty="No books" />
        <RailGroup title="Drafts" items={documents} empty="No drafts" />
        <RailGroup title="Tutors" items={agents} empty="No tutors" />
        <RailGroup title="Review queue" items={questions} empty="No questions" />
      </div>
    </aside>
  );
}

function RailGroup({ title, items, empty }: { title: string; items: Item[]; empty: string }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-normal text-zaki-muted">
        {title}
      </div>
      <div className="border-l border-zaki-border py-1">
        {items.length ? (
          items.slice(0, 4).map((item, index) => {
            const status = itemStatus(item);
            const time = relativeTime(item.updated_at ?? item.created_at ?? item.last_active);
            return (
              <div
                key={`${title}-${itemTitle(item, "item")}-${index}`}
                className="group flex items-center gap-2 rounded-r-zaki-md py-1.5 pl-3 pr-2 text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text"
              >
                <span className={cn("size-1.5 shrink-0 rounded-full", statusTone(status))} />
                <span className="min-w-0 flex-1 truncate text-[13px]">
                  {itemTitle(item, `Item ${index + 1}`)}
                </span>
                {time ? (
                  <span className="shrink-0 text-[10px] tabular-nums text-zaki-muted">
                    {time}
                  </span>
                ) : null}
              </div>
            );
          })
        ) : (
          <div className="py-1.5 pl-3 pr-2 text-[12px] text-zaki-muted">{empty}</div>
        )}
      </div>
    </div>
  );
}

export function LearningPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<LearningTab>("sources");
  const [kbName, setKbName] = useState("main");
  const [bookTopic, setBookTopic] = useState("");
  const [notebookName, setNotebookName] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [writerText, setWriterText] = useState("");
  const [writerInstruction, setWriterInstruction] = useState("");
  const [agentId, setAgentId] = useState("");
  const [agentName, setAgentName] = useState("");
  const [agentPersona, setAgentPersona] = useState("");
  const [visionQuestion, setVisionQuestion] = useState("");
  const [visionImage, setVisionImage] = useState<File | null>(null);
  const [lastResult, setLastResult] = useState<unknown>(null);
  const [selectedObject, setSelectedObject] = useState<SelectedLearningObject | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    folderInputRef.current?.setAttribute("directory", "");
  }, []);

  const health = useQuery({
    queryKey: learningKeys.health,
    queryFn: () => learningRequest<unknown>("/api/learning/health"),
    retry: 1,
  });
  const knowledge = useQuery({
    queryKey: learningKeys.knowledge,
    queryFn: listLearningKnowledge,
    retry: 1,
  });
  const books = useQuery({
    queryKey: learningKeys.books,
    queryFn: listLearningBooks,
    retry: 1,
  });
  const notebooks = useQuery({
    queryKey: learningKeys.notebooks,
    queryFn: listLearningNotebooks,
    retry: 1,
  });
  const documents = useQuery({
    queryKey: learningKeys.coWriterDocuments,
    queryFn: listLearningCoWriterDocuments,
    retry: 1,
  });
  const questions = useQuery({
    queryKey: learningKeys.questions,
    queryFn: listLearningQuestions,
    retry: 1,
  });
  const agents = useQuery({
    queryKey: learningKeys.tutorAgents,
    queryFn: listLearningTutorAgents,
    retry: 1,
  });
  const solveSessions = useQuery({
    queryKey: learningKeys.solveSessions,
    queryFn: listLearningSolveSessions,
    retry: 1,
  });

  const knowledgeItems = useMemo(
    () => itemList(knowledge.data, ["knowledge_bases", "items", "databases"]),
    [knowledge.data],
  );
  const bookItems = useMemo(() => itemList(books.data, ["books", "items"]), [books.data]);
  const notebookItems = useMemo(
    () => itemList(notebooks.data, ["notebooks", "items"]),
    [notebooks.data],
  );
  const documentItems = useMemo(
    () => itemList(documents.data, ["documents", "items"]),
    [documents.data],
  );
  const questionItems = useMemo(
    () => itemList(questions.data, ["items", "entries", "questions"]),
    [questions.data],
  );
  const agentItems = useMemo(() => itemList(agents.data, ["bots", "items"]), [agents.data]);
  const solveItems = useMemo(
    () => itemList(solveSessions.data, ["sessions", "items"]),
    [solveSessions.data],
  );

  const createKb = useMutation({
    mutationFn: ({ name, files }: { name: string; files: FileList | File[] }) =>
      createLearningKnowledge(name, files),
    onSuccess: (payload) => {
      setLastResult(payload);
      toast.success("Source library created");
      void queryClient.invalidateQueries({ queryKey: learningKeys.knowledge });
    },
    onError: (error) => toast.error(error.message),
  });

  const uploadKb = useMutation({
    mutationFn: ({ name, files }: { name: string; files: FileList | File[] }) =>
      uploadLearningKnowledge(name, files),
    onSuccess: (payload) => {
      setLastResult(payload);
      toast.success("Upload started");
      void queryClient.invalidateQueries({ queryKey: learningKeys.knowledge });
    },
    onError: (error) => toast.error(error.message),
  });

  const createBook = useMutation({
    mutationFn: (topic: string) =>
      createLearningBook({
        user_intent: topic,
        kb_name: kbName || undefined,
      }),
    onSuccess: (payload) => {
      setLastResult(payload);
      setBookTopic("");
      toast.success("Book request sent");
      void queryClient.invalidateQueries({ queryKey: learningKeys.books });
    },
    onError: (error) => toast.error(error.message),
  });

  const createNotebook = useMutation({
    mutationFn: (name: string) =>
      createLearningNotebook({ name, description: "", color: "#f10202", icon: "book" }),
    onSuccess: (payload) => {
      setLastResult(payload);
      setNotebookName("");
      toast.success("Notebook created");
      void queryClient.invalidateQueries({ queryKey: learningKeys.notebooks });
    },
    onError: (error) => toast.error(error.message),
  });

  const createDocument = useMutation({
    mutationFn: (title: string) =>
      createLearningCoWriterDocument({ title, content: writerText }),
    onSuccess: (payload) => {
      setLastResult(payload);
      setDocumentTitle("");
      toast.success("Document created");
      void queryClient.invalidateQueries({ queryKey: learningKeys.coWriterDocuments });
    },
    onError: (error) => toast.error(error.message),
  });

  const runWriter = useMutation({
    mutationFn: () =>
      runLearningCoWriterEdit({
        text: writerText,
        instruction: writerInstruction,
        action: "rewrite",
        kb_name: kbName || undefined,
      }),
    onSuccess: (payload) => {
      setLastResult(payload);
      toast.success("Edit completed");
    },
    onError: (error) => toast.error(error.message),
  });

  const createAgent = useMutation({
    mutationFn: () =>
      createLearningTutorAgent({
        bot_id: agentId,
        name: agentName || agentId,
        persona: agentPersona,
      }),
    onSuccess: (payload) => {
      setLastResult(payload);
      setAgentId("");
      setAgentName("");
      setAgentPersona("");
      toast.success("Tutor created");
      void queryClient.invalidateQueries({ queryKey: learningKeys.tutorAgents });
    },
    onError: (error) => toast.error(error.message),
  });

  const analyzeVision = useMutation({
    mutationFn: async () => {
      const image_base64 = visionImage ? await fileToBase64(visionImage) : undefined;
      return analyzeLearningVision({
        question: visionQuestion,
        image_base64,
      } as LearningJson);
    },
    onSuccess: (payload) => {
      setLastResult(payload);
      toast.success("Analysis completed");
    },
    onError: (error) => toast.error(error.message),
  });

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["learning"] });
  };

  const openObject = (type: LearningObjectType, item: Item, fallback: string) => {
    const id = itemId(item, fallback).trim();
    if (!id) return;
    setSelectedObject({ type, id, item });
  };

  const healthOk = health.isSuccess && asRecord(health.data).status === "ok";

  return (
    <div className="h-full overflow-auto bg-zaki-base">
      <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6">
        <header className="mb-5 flex flex-col gap-4 border-b border-zaki-border pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-zaki-muted">
              <StatusDot ok={healthOk} />
              <span>{health.isError ? "Learning service unavailable" : "Learning workspace"}</span>
            </div>
            <h1 className="text-2xl font-semibold text-zaki-text">Learn</h1>
            <p className="max-w-3xl text-sm text-zaki-muted">
              Build source libraries, generate lessons, save notebooks, write with context,
              review questions, manage tutors, and solve from documents or images.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={kbName}
              onChange={(event) => setKbName(event.target.value)}
              placeholder="Source library"
              className="h-9 w-44 rounded-zaki-md border border-zaki-border bg-zaki-raised px-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
            />
            <button
              type="button"
              onClick={refreshAll}
              className="inline-flex h-9 items-center gap-2 rounded-zaki-md border border-zaki-border px-3 text-sm font-medium text-zaki-text hover:bg-zaki-hover"
            >
              <RefreshCw className="size-4" />
              Refresh
            </button>
          </div>
        </header>

        <LearningStats
          knowledgeCount={knowledgeItems.length}
          bookCount={bookItems.length}
          notebookCount={notebookItems.length}
          documentCount={documentItems.length}
          questionCount={questionItems.length}
          agentCount={agentItems.length}
          solveCount={solveItems.length}
        />

        <div className="mb-5 overflow-x-auto lg:hidden">
          <div className="flex min-w-max gap-1 rounded-zaki-md border border-zaki-border bg-zaki-raised p-1">
            {tabs.map((entry) => {
              const Icon = entry.icon;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setTab(entry.id)}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-zaki-md px-3 text-sm font-medium transition-colors",
                    tab === entry.id
                      ? "bg-zaki-brand text-white"
                      : "text-zaki-secondary hover:bg-zaki-hover hover:text-zaki-text",
                  )}
                >
                  <Icon className="size-4" />
                  {entry.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)_360px]">
          <LearningRail
            activeTab={tab}
            setTab={setTab}
            books={bookItems}
            documents={documentItems}
            agents={agentItems}
            questions={questionItems}
          />

          <div className="min-w-0 rounded-zaki-lg border border-zaki-border bg-zaki-raised px-4">
            {tab === "sources" ? (
              <SourcesPanel
                kbName={kbName}
                setKbName={setKbName}
                createKb={createKb}
                uploadKb={uploadKb}
                items={knowledgeItems}
                folderInputRef={folderInputRef}
                onOpen={(item) => openObject("source", item, "main")}
              />
            ) : null}
            {tab === "books" ? (
              <BooksPanel
                bookTopic={bookTopic}
                setBookTopic={setBookTopic}
                createBook={createBook}
                items={bookItems}
                onOpen={(item) => openObject("book", item, `book-${bookItems.indexOf(item) + 1}`)}
              />
            ) : null}
            {tab === "notebooks" ? (
              <NotebooksPanel
                notebookName={notebookName}
                setNotebookName={setNotebookName}
                createNotebook={createNotebook}
                items={notebookItems}
                onOpen={(item) =>
                  openObject("notebook", item, `notebook-${notebookItems.indexOf(item) + 1}`)
                }
              />
            ) : null}
            {tab === "writer" ? (
              <WriterPanel
                documentTitle={documentTitle}
                setDocumentTitle={setDocumentTitle}
                writerText={writerText}
                setWriterText={setWriterText}
                writerInstruction={writerInstruction}
                setWriterInstruction={setWriterInstruction}
                createDocument={createDocument}
                runWriter={runWriter}
                items={documentItems}
                onOpen={(item) =>
                  openObject("document", item, `document-${documentItems.indexOf(item) + 1}`)
                }
              />
            ) : null}
            {tab === "review" ? (
              <ReviewPanel
                items={questionItems}
                onOpen={(item) =>
                  openObject("question", item, `question-${questionItems.indexOf(item) + 1}`)
                }
              />
            ) : null}
            {tab === "agents" ? (
              <AgentsPanel
                agentId={agentId}
                setAgentId={setAgentId}
                agentName={agentName}
                setAgentName={setAgentName}
                agentPersona={agentPersona}
                setAgentPersona={setAgentPersona}
                createAgent={createAgent}
                items={agentItems}
                onOpen={(item) => openObject("agent", item, `agent-${agentItems.indexOf(item) + 1}`)}
              />
            ) : null}
            {tab === "workspaces" ? (
              <WorkspacesPanel
                visionQuestion={visionQuestion}
                setVisionQuestion={setVisionQuestion}
                setVisionImage={setVisionImage}
                analyzeVision={analyzeVision}
                solveItems={solveItems}
                onOpen={(item) => openObject("solve", item, `solve-${solveItems.indexOf(item) + 1}`)}
              />
            ) : null}
          </div>

          <aside className="rounded-zaki-lg border border-zaki-border bg-zaki-raised p-4">
            <div className="mb-3 flex items-center gap-2">
              <Activity className="size-4 text-zaki-brand" />
              <h2 className="text-sm font-semibold text-zaki-text">Last response</h2>
            </div>
            {lastResult ? (
              <JsonPreview value={lastResult} />
            ) : (
              <EmptyLine label="Run an action to inspect the service response." />
            )}
            <div className="mt-5 border-t border-zaki-border pt-4">
              <h3 className="mb-2 text-sm font-semibold text-zaki-text">Live streams</h3>
              <div className="space-y-2 text-xs text-zaki-muted">
                <p>Chat: /api/learning/ws</p>
                <p>Book progress: /api/learning/book/ws</p>
                <p>Solve: /api/learning/solve/ws</p>
                <p>Vision: /api/learning/vision/solve/ws</p>
                <p>Question generation: /api/learning/questions/generate/ws</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <LearningDetailSheet
        selected={selectedObject}
        onClose={() => setSelectedObject(null)}
        onResult={setLastResult}
      />
    </div>
  );
}

function SourcesPanel({
  kbName,
  setKbName,
  createKb,
  uploadKb,
  items,
  folderInputRef,
  onOpen,
}: {
  kbName: string;
  setKbName: (value: string) => void;
  createKb: UseMutationResult<unknown, Error, { name: string; files: FileList | File[] }, unknown>;
  uploadKb: UseMutationResult<unknown, Error, { name: string; files: FileList | File[] }, unknown>;
  items: Item[];
  folderInputRef: RefObject<HTMLInputElement>;
  onOpen: (item: Item) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [dropActive, setDropActive] = useState(false);
  const readyBytes = files.reduce((sum, file) => sum + file.size, 0);
  const handlePicked = (picked: FileList | File[]) => {
    const incoming = Array.from(picked);
    if (!incoming.length) return;
    const byKey = new Map(files.map((file) => [`${file.name}:${file.size}`, file]));
    incoming.forEach((file) => byKey.set(`${file.name}:${file.size}`, file));
    setFiles(Array.from(byKey.values()));
  };
  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDropActive(false);
    handlePicked(event.dataTransfer.files);
  };
  const commitUpload = (mode: "create" | "upload") => {
    if (!files.length || !kbName.trim()) return;
    const payload = { name: kbName.trim(), files };
    if (mode === "create") {
      createKb.mutate(payload);
    } else {
      uploadKb.mutate(payload);
    }
    setFiles([]);
  };

  return (
    <Section
      title="Source library"
      subtitle="Upload documents, images, archives, or browser-selected folders into a tenant-scoped learning library."
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row">
        <input
          value={kbName}
          onChange={(event) => setKbName(event.target.value)}
          placeholder="main"
          className="h-10 min-w-0 flex-1 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
        />
        <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-zaki-md border border-zaki-border px-4 text-sm font-semibold text-zaki-text hover:bg-zaki-hover">
          <Upload className="size-4" />
          Pick files
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files?.length) handlePicked(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-zaki-md border border-zaki-border px-4 text-sm font-semibold text-zaki-text hover:bg-zaki-hover">
          <FolderUp className="size-4" />
          Upload folder
          <input
            ref={folderInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files?.length) handlePicked(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      <button
        type="button"
        onDragEnter={(event) => {
          event.preventDefault();
          setDropActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setDropActive(true);
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={handleDrop}
        className={cn(
          "mb-4 flex w-full flex-col items-center justify-center rounded-zaki-lg border border-dashed px-5 py-7 text-center transition-colors",
          dropActive
            ? "border-zaki-brand bg-zaki-hover"
            : "border-zaki-border bg-zaki-base hover:border-zaki-strong hover:bg-zaki-hover",
        )}
      >
        <Upload className="mb-2 size-5 text-zaki-brand" />
        <div className="text-sm font-semibold text-zaki-text">
          {files.length ? `${files.length} files ready` : "Drop files here"}
        </div>
        <div className="mt-1 text-xs text-zaki-muted">
          {files.length
            ? `${Math.round(readyBytes / 1024)} KB selected`
            : "Documents, images, archives, and browser-selected folders"}
        </div>
      </button>

      {files.length ? (
        <div className="mb-5 rounded-zaki-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-zaki-text">
              <CheckCircle2 className="size-4 text-emerald-600" />
              Ready to send
            </div>
            <button
              type="button"
              onClick={() => setFiles([])}
              className="rounded-zaki-md border border-zaki-border px-2 py-1 text-xs text-zaki-muted hover:bg-zaki-base hover:text-zaki-text"
            >
              Clear
            </button>
          </div>
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            {files.slice(0, 6).map((file) => (
              <div
                key={`${file.name}:${file.size}`}
                className="flex items-center gap-2 rounded-zaki-md border border-white/70 bg-white/70 px-2 py-2 text-xs text-zaki-secondary dark:border-white/10 dark:bg-white/5"
              >
                <FileText className="size-3.5 shrink-0 text-zaki-brand" />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((item) => item !== file))}
                  className="rounded p-1 text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={!kbName.trim() || createKb.isPending}
              onClick={() => commitUpload("create")}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-zaki-md bg-zaki-brand px-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Plus className="size-4" />
              Create library from selection
            </button>
            <button
              type="button"
              disabled={!kbName.trim() || uploadKb.isPending}
              onClick={() => commitUpload("upload")}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-zaki-md border border-zaki-border px-3 text-sm font-semibold text-zaki-text hover:bg-zaki-hover disabled:opacity-60"
            >
              <Upload className="size-4" />
              Upload to existing library
            </button>
          </div>
        </div>
      ) : null}

      <ItemList
        items={items}
        empty="No source libraries returned yet."
        variant="source"
        onOpen={onOpen}
      />
    </Section>
  );
}

function BooksPanel({
  bookTopic,
  setBookTopic,
  createBook,
  items,
  onOpen,
}: {
  bookTopic: string;
  setBookTopic: (value: string) => void;
  createBook: UseMutationResult<unknown, Error, string, unknown>;
  items: Item[];
  onOpen: (item: Item) => void;
}) {
  return (
    <Section title="Lesson books" subtitle="Generate and manage structured learning paths.">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row">
        <input
          value={bookTopic}
          onChange={(event) => setBookTopic(event.target.value)}
          placeholder="What should ZAKI teach?"
          className="h-10 min-w-0 flex-1 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
        />
        <button
          type="button"
          disabled={!bookTopic.trim() || createBook.isPending}
          onClick={() => createBook.mutate(bookTopic.trim())}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-zaki-md bg-zaki-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          <BookOpen className="size-4" />
          Generate book
        </button>
      </div>
      <ItemList items={items} empty="No books returned yet." variant="book" onOpen={onOpen} />
    </Section>
  );
}

function NotebooksPanel({
  notebookName,
  setNotebookName,
  createNotebook,
  items,
  onOpen,
}: {
  notebookName: string;
  setNotebookName: (value: string) => void;
  createNotebook: UseMutationResult<unknown, Error, string, unknown>;
  items: Item[];
  onOpen: (item: Item) => void;
}) {
  return (
    <Section title="Saved notebooks" subtitle="Organize learning outputs, summaries, and records.">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row">
        <input
          value={notebookName}
          onChange={(event) => setNotebookName(event.target.value)}
          placeholder="Notebook name"
          className="h-10 min-w-0 flex-1 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
        />
        <button
          type="button"
          disabled={!notebookName.trim() || createNotebook.isPending}
          onClick={() => createNotebook.mutate(notebookName.trim())}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-zaki-md bg-zaki-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Plus className="size-4" />
          Create notebook
        </button>
      </div>
      <ItemList
        items={items}
        empty="No notebooks returned yet."
        variant="notebook"
        onOpen={onOpen}
      />
    </Section>
  );
}

function WriterPanel({
  documentTitle,
  setDocumentTitle,
  writerText,
  setWriterText,
  writerInstruction,
  setWriterInstruction,
  createDocument,
  runWriter,
  items,
  onOpen,
}: {
  documentTitle: string;
  setDocumentTitle: (value: string) => void;
  writerText: string;
  setWriterText: (value: string) => void;
  writerInstruction: string;
  setWriterInstruction: (value: string) => void;
  createDocument: UseMutationResult<unknown, Error, string, unknown>;
  runWriter: UseMutationResult<unknown, Error, void, unknown>;
  items: Item[];
  onOpen: (item: Item) => void;
}) {
  return (
    <Section title="Co-writer" subtitle="Draft, rewrite, expand, shorten, and save documents.">
      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_220px]">
        <input
          value={documentTitle}
          onChange={(event) => setDocumentTitle(event.target.value)}
          placeholder="Document title"
          className="h-10 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
        />
        <button
          type="button"
          disabled={!documentTitle.trim() || createDocument.isPending}
          onClick={() => createDocument.mutate(documentTitle.trim())}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-zaki-md border border-zaki-border px-4 text-sm font-semibold text-zaki-text hover:bg-zaki-hover disabled:opacity-60"
        >
          <FileText className="size-4" />
          Save document
        </button>
      </div>
      <textarea
        value={writerText}
        onChange={(event) => setWriterText(event.target.value)}
        placeholder="Paste a draft or selection..."
        className="mb-3 min-h-36 w-full resize-y rounded-zaki-md border border-zaki-border bg-zaki-base p-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
      />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row">
        <input
          value={writerInstruction}
          onChange={(event) => setWriterInstruction(event.target.value)}
          placeholder="Rewrite instruction"
          className="h-10 min-w-0 flex-1 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
        />
        <button
          type="button"
          disabled={!writerText.trim() || !writerInstruction.trim() || runWriter.isPending}
          onClick={() => runWriter.mutate()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-zaki-md bg-zaki-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          <PenLine className="size-4" />
          Run edit
        </button>
      </div>
      <ItemList
        items={items}
        empty="No co-writer documents returned yet."
        variant="document"
        onOpen={onOpen}
      />
    </Section>
  );
}

function ReviewPanel({ items, onOpen }: { items: Item[]; onOpen: (item: Item) => void }) {
  return (
    <Section title="Question review" subtitle="Review saved quiz questions, attempts, bookmarks, and categories.">
      <ItemList
        items={items}
        empty="No saved questions returned yet."
        variant="question"
        onOpen={onOpen}
      />
    </Section>
  );
}

function AgentsPanel({
  agentId,
  setAgentId,
  agentName,
  setAgentName,
  agentPersona,
  setAgentPersona,
  createAgent,
  items,
  onOpen,
}: {
  agentId: string;
  setAgentId: (value: string) => void;
  agentName: string;
  setAgentName: (value: string) => void;
  agentPersona: string;
  setAgentPersona: (value: string) => void;
  createAgent: UseMutationResult<unknown, Error, void, unknown>;
  items: Item[];
  onOpen: (item: Item) => void;
}) {
  return (
    <Section
      title="Tutor agents"
      subtitle="Create specialized tutors. Provider and model routing stay operator-managed."
    >
      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        <input
          value={agentId}
          onChange={(event) => setAgentId(event.target.value)}
          placeholder="tutor id"
          className="h-10 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
        />
        <input
          value={agentName}
          onChange={(event) => setAgentName(event.target.value)}
          placeholder="Display name"
          className="h-10 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
        />
      </div>
      <textarea
        value={agentPersona}
        onChange={(event) => setAgentPersona(event.target.value)}
        placeholder="Persona and teaching style"
        className="mb-3 min-h-28 w-full resize-y rounded-zaki-md border border-zaki-border bg-zaki-base p-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
      />
      <button
        type="button"
        disabled={!agentId.trim() || createAgent.isPending}
        onClick={() => createAgent.mutate()}
        className="mb-5 inline-flex h-10 items-center justify-center gap-2 rounded-zaki-md bg-zaki-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        <Bot className="size-4" />
        Create tutor
      </button>
      <ItemList
        items={items}
        empty="No tutor agents returned yet."
        variant="agent"
        onOpen={onOpen}
      />
    </Section>
  );
}

function WorkspacesPanel({
  visionQuestion,
  setVisionQuestion,
  setVisionImage,
  analyzeVision,
  solveItems,
  onOpen,
}: {
  visionQuestion: string;
  setVisionQuestion: (value: string) => void;
  setVisionImage: (value: File | null) => void;
  analyzeVision: UseMutationResult<unknown, Error, void, unknown>;
  solveItems: Item[];
  onOpen: (item: Item) => void;
}) {
  return (
    <Section
      title="Solve and vision"
      subtitle="Analyze problems from text or image. Full solve streams are available through the learning WebSocket aliases."
    >
      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_220px]">
        <input
          value={visionQuestion}
          onChange={(event) => setVisionQuestion(event.target.value)}
          placeholder="Question for image or text analysis"
          className="h-10 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
        />
        <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-zaki-md border border-zaki-border px-4 text-sm font-semibold text-zaki-text hover:bg-zaki-hover">
          <Image className="size-4" />
          Pick image
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => setVisionImage(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>
      <button
        type="button"
        disabled={!visionQuestion.trim() || analyzeVision.isPending}
        onClick={() => analyzeVision.mutate()}
        className="mb-5 inline-flex h-10 items-center justify-center gap-2 rounded-zaki-md bg-zaki-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        <Send className="size-4" />
        Analyze
      </button>
      <h3 className="mb-3 text-sm font-semibold text-zaki-text">Recent solve sessions</h3>
      <ItemList
        items={solveItems}
        empty="No solve sessions returned yet."
        variant="solve"
        onOpen={onOpen}
      />
    </Section>
  );
}

function LearningDetailSheet({
  selected,
  onClose,
  onResult,
}: {
  selected: SelectedLearningObject | null;
  onClose: () => void;
  onResult: (value: unknown) => void;
}) {
  const queryClient = useQueryClient();
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const query = useQuery({
    queryKey: ["learning", "detail", selected?.type, selected?.id],
    enabled: Boolean(selected?.id),
    retry: 1,
    queryFn: async () => {
      if (!selected) return null;
      switch (selected.type) {
        case "source":
          return {
            summary: selected.item,
            files: await listLearningKnowledgeFiles(selected.id),
          };
        case "book": {
          const [detail, spine] = await Promise.allSettled([
            getLearningBook(selected.id),
            getLearningBookSpine(selected.id),
          ]);
          return {
            detail: detail.status === "fulfilled" ? detail.value : selected.item,
            spine: spine.status === "fulfilled" ? spine.value : null,
          };
        }
        case "notebook":
          return getLearningNotebook(selected.id);
        case "document":
          return getLearningCoWriterDocument(selected.id);
        case "question":
          return getLearningQuestionEntry(selected.id);
        case "agent": {
          const [detail, history] = await Promise.allSettled([
            getLearningTutorAgent(selected.id),
            getLearningTutorAgentHistory(selected.id),
          ]);
          return {
            detail: detail.status === "fulfilled" ? detail.value : selected.item,
            history: history.status === "fulfilled" ? history.value : null,
          };
        }
        case "solve":
          return getLearningSolveSession(selected.id);
        default:
          return selected.item;
      }
    },
  });

  const documentRecord = asRecord(query.data);
  const documentDetail =
    selected?.type === "document"
      ? Object.keys(documentRecord).length
        ? documentRecord
        : selected.item
      : {};

  useEffect(() => {
    if (selected?.type !== "document") {
      setDraftTitle("");
      setDraftContent("");
      return;
    }
    setDraftTitle(itemTitle(documentDetail, itemTitle(selected.item, "")));
    setDraftContent(textOf(documentDetail.content) || textOf(selected.item.content));
  }, [documentDetail, selected]);

  const updateDocument = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No document selected.");
      return updateLearningCoWriterDocument(selected.id, {
        title: draftTitle,
        content: draftContent,
      });
    },
    onSuccess: (payload) => {
      onResult(payload);
      toast.success("Document saved");
      void queryClient.invalidateQueries({ queryKey: learningKeys.coWriterDocuments });
      void queryClient.invalidateQueries({
        queryKey: ["learning", "detail", selected?.type, selected?.id],
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const title = selected ? itemTitle(selected.item, selected.id) : "Learning item";
  const status = selected ? itemStatus(selected.item) : "";
  const detailPayload = query.data ?? selected?.item ?? {};

  return (
    <Sheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full overflow-y-auto border-zaki-border bg-zaki-base sm:max-w-2xl">
        <SheetHeader className="border-b border-zaki-border px-5 py-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-zaki-muted">
            <span className={cn("size-1.5 rounded-full", statusTone(status || "ready"))} />
            <span>{selected?.type ?? "learning"}</span>
          </div>
          <SheetTitle className="text-lg text-zaki-text">{title}</SheetTitle>
          <SheetDescription className="text-zaki-muted">
            {status ? `Status: ${status}` : "Learning object details"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-5 pb-6">
          {query.isLoading ? (
            <div className="rounded-zaki-lg border border-zaki-border bg-zaki-raised p-4 text-sm text-zaki-muted">
              Loading details...
            </div>
          ) : query.isError ? (
            <div className="rounded-zaki-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Unable to load details. Showing the list summary below.
            </div>
          ) : null}

          {selected?.type === "document" ? (
            <div className="space-y-3">
              <input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                className="h-10 w-full rounded-zaki-md border border-zaki-border bg-zaki-raised px-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
                placeholder="Document title"
              />
              <textarea
                value={draftContent}
                onChange={(event) => setDraftContent(event.target.value)}
                className="min-h-80 w-full resize-y rounded-zaki-md border border-zaki-border bg-zaki-raised p-3 text-sm leading-relaxed text-zaki-text outline-none focus:border-zaki-brand"
                placeholder="Document content"
              />
              <button
                type="button"
                disabled={updateDocument.isPending || !draftTitle.trim()}
                onClick={() => updateDocument.mutate()}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-zaki-md bg-zaki-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                <FileText className="size-4" />
                Save changes
              </button>
            </div>
          ) : null}

          {selected?.type === "book" ? <BookDetailSummary value={detailPayload} /> : null}
          {selected?.type === "source" ? <SourceDetailSummary value={detailPayload} /> : null}
          {selected?.type === "agent" ? <AgentDetailSummary agentId={selected.id} value={detailPayload} /> : null}
          {selected?.type === "notebook" ? <NotebookDetailSummary value={detailPayload} /> : null}
          {selected?.type === "question" ? <QuestionDetailSummary value={detailPayload} /> : null}
          {selected?.type === "solve" ? <SolveDetailSummary value={detailPayload} /> : null}

          <div>
            <h3 className="mb-2 text-sm font-semibold text-zaki-text">Raw payload</h3>
            <JsonPreview value={detailPayload} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BookDetailSummary({ value }: { value: unknown }) {
  const record = asRecord(asRecord(value).detail ?? value);
  const spine = asRecord(value).spine;
  const spineItems = itemList(spine, ["chapters", "pages", "items"]);
  return (
    <DetailBlock
      title="Book structure"
      rows={[
        ["Title", itemTitle(record, "Untitled book")],
        ["Status", itemStatus(record)],
        ["Chapters", displayCount(record) || String(spineItems.length)],
      ]}
    />
  );
}

function SourceDetailSummary({ value }: { value: unknown }) {
  const files = itemList(asRecord(value).files, ["files", "items"]);
  return (
    <DetailBlock
      title="Source files"
      rows={[
        ["Files", String(files.length)],
        ["Library", itemTitle(asRecord(asRecord(value).summary), "main")],
      ]}
    />
  );
}

function AgentDetailSummary({ agentId, value }: { agentId: string; value: unknown }) {
  const detail = asRecord(asRecord(value).detail ?? value);
  const history = itemList(asRecord(value).history, ["messages", "items", "history"]);
  return (
    <DetailBlock
      title="Tutor runtime"
      rows={[
        ["ID", agentId],
        ["Name", itemTitle(detail, agentId)],
        ["Status", itemStatus(detail)],
        ["History", String(history.length)],
        ["Chat stream", `/api/learning/tutor-agents/${agentId}/ws`],
      ]}
    />
  );
}

function NotebookDetailSummary({ value }: { value: unknown }) {
  const record = asRecord(value);
  const records = itemList(record, ["records", "items"]);
  return (
    <DetailBlock
      title="Notebook records"
      rows={[
        ["Name", itemTitle(record, "Notebook")],
        ["Records", String(records.length)],
        ["Updated", relativeTime(record.updated_at)],
      ]}
    />
  );
}

function QuestionDetailSummary({ value }: { value: unknown }) {
  const record = asRecord(value);
  return (
    <DetailBlock
      title="Question"
      rows={[
        ["Type", textOf(record.question_type, "question")],
        ["Difficulty", textOf(record.difficulty, "not set")],
        ["Correct", textOf(record.correct_answer, "not set")],
        ["Bookmarked", boolText(record.bookmarked) || "false"],
      ]}
    />
  );
}

function SolveDetailSummary({ value }: { value: unknown }) {
  const record = asRecord(value);
  const messages = itemList(record, ["messages", "items"]);
  return (
    <DetailBlock
      title="Solve session"
      rows={[
        ["Title", itemTitle(record, "Solve session")],
        ["Messages", String(messages.length)],
        ["Source", textOf(record.kb_name, "none")],
        ["Stream", "/api/learning/solve/ws"],
      ]}
    />
  );
}

function DetailBlock({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className="rounded-zaki-lg border border-zaki-border bg-zaki-raised p-4">
      <h3 className="mb-3 text-sm font-semibold text-zaki-text">{title}</h3>
      <div className="divide-y divide-zaki-border">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 py-2 text-sm">
            <div className="text-zaki-muted">{label}</div>
            <div className="min-w-0 break-words font-medium text-zaki-text">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ItemList({
  items,
  empty,
  variant = "generic",
  onOpen,
}: {
  items: Item[];
  empty: string;
  variant?: "source" | "book" | "notebook" | "document" | "question" | "agent" | "solve" | "generic";
  onOpen?: (item: Item) => void;
}) {
  if (!items.length) return <EmptyLine label={empty} />;
  const iconByVariant = {
    source: Upload,
    book: BookOpen,
    notebook: FileText,
    document: PenLine,
    question: GraduationCap,
    agent: Bot,
    solve: Layers,
    generic: FileText,
  };
  const Icon = iconByVariant[variant];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.slice(0, 12).map((item, index) => (
        <LearningItemCard
          key={`${itemTitle(item, "item")}-${index}`}
          item={item}
          fallback={`Item ${index + 1}`}
          icon={Icon}
          onOpen={onOpen ? () => onOpen(item) : undefined}
        />
      ))}
    </div>
  );
}

function LearningItemCard({
  item,
  fallback,
  icon: Icon,
  onOpen,
}: {
  item: Item;
  fallback: string;
  icon: typeof FileText;
  onOpen?: () => void;
}) {
  const status = itemStatus(item);
  const count = displayCount(item);
  const updated = relativeTime(item.updated_at ?? item.created_at ?? item.last_active);
  const isDefault = Boolean(item.is_default);
  const subtitle =
    textOf(item.description) ||
    textOf(item.summary) ||
    textOf(item.preview) ||
    textOf(item.explanation) ||
    textOf(item.last_message) ||
    textOf(asRecord(item.statistics).raw_documents, "Ready");

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group rounded-zaki-lg border border-zaki-border bg-zaki-base p-3 text-left transition-colors hover:border-zaki-strong hover:bg-zaki-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zaki-brand"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-zaki-md bg-zaki-raised text-zaki-brand">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isDefault ? (
              <Star className="size-3.5 shrink-0 fill-amber-500 text-amber-500" />
            ) : null}
            <div className="min-w-0 flex-1 truncate text-sm font-semibold text-zaki-text">
              {itemTitle(item, fallback)}
            </div>
          </div>
          <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-relaxed text-zaki-muted">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-zaki-muted">
        <span className="inline-flex items-center gap-1 rounded-zaki-md border border-zaki-border px-2 py-1">
          <span className={cn("size-1.5 rounded-full", statusTone(status))} />
          {status}
        </span>
        {count ? (
          <span className="rounded-zaki-md border border-zaki-border px-2 py-1">
            {count}
          </span>
        ) : null}
        {updated ? (
          <span className="inline-flex items-center gap-1 rounded-zaki-md border border-zaki-border px-2 py-1">
            <Clock3 className="size-3" />
            {updated}
          </span>
        ) : null}
        {item.needs_reindex ? (
          <span className="inline-flex items-center gap-1 rounded-zaki-md border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
            <AlertTriangle className="size-3" />
            reindex
          </span>
        ) : null}
        {item.deleted ? (
          <span className="inline-flex items-center gap-1 rounded-zaki-md border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">
            <Trash2 className="size-3" />
            deleted
          </span>
        ) : null}
      </div>
    </button>
  );
}
