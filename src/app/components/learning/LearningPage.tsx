import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import type { ReactNode, RefObject } from "react";
import {
  Activity,
  BookOpen,
  Bot,
  FileText,
  FolderUp,
  GraduationCap,
  Image,
  Layers,
  PenLine,
  Plus,
  RefreshCw,
  Send,
  Upload,
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
  learningKeys,
  learningRequest,
  listLearningBooks,
  listLearningCoWriterDocuments,
  listLearningKnowledge,
  listLearningNotebooks,
  listLearningQuestions,
  listLearningSolveSessions,
  listLearningTutorAgents,
  runLearningCoWriterEdit,
  uploadLearningKnowledge,
  type LearningJson,
} from "@/lib/learningApi";

type LearningTab =
  | "sources"
  | "books"
  | "notebooks"
  | "writer"
  | "review"
  | "agents"
  | "workspaces";

type Item = Record<string, unknown>;

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

  const healthOk = health.isSuccess && asRecord(health.data).status === "ok";

  return (
    <div className="h-full overflow-auto bg-zaki-base">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
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

        <div className="mb-5 overflow-x-auto">
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

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 rounded-zaki-lg border border-zaki-border bg-zaki-raised px-4">
            {tab === "sources" ? (
              <SourcesPanel
                kbName={kbName}
                setKbName={setKbName}
                createKb={createKb}
                uploadKb={uploadKb}
                items={knowledgeItems}
                folderInputRef={folderInputRef}
              />
            ) : null}
            {tab === "books" ? (
              <BooksPanel
                bookTopic={bookTopic}
                setBookTopic={setBookTopic}
                createBook={createBook}
                items={bookItems}
              />
            ) : null}
            {tab === "notebooks" ? (
              <NotebooksPanel
                notebookName={notebookName}
                setNotebookName={setNotebookName}
                createNotebook={createNotebook}
                items={notebookItems}
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
              />
            ) : null}
            {tab === "review" ? <ReviewPanel items={questionItems} /> : null}
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
              />
            ) : null}
            {tab === "workspaces" ? (
              <WorkspacesPanel
                visionQuestion={visionQuestion}
                setVisionQuestion={setVisionQuestion}
                setVisionImage={setVisionImage}
                analyzeVision={analyzeVision}
                solveItems={solveItems}
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
}: {
  kbName: string;
  setKbName: (value: string) => void;
  createKb: UseMutationResult<unknown, Error, { name: string; files: FileList | File[] }, unknown>;
  uploadKb: UseMutationResult<unknown, Error, { name: string; files: FileList | File[] }, unknown>;
  items: Item[];
  folderInputRef: RefObject<HTMLInputElement>;
}) {
  return (
    <Section
      title="Source library"
      subtitle="Upload documents, images, archives, or browser-selected folders into a tenant-scoped learning library."
    >
      <div className="mb-5 flex flex-col gap-3 lg:flex-row">
        <input
          value={kbName}
          onChange={(event) => setKbName(event.target.value)}
          placeholder="main"
          className="h-10 min-w-0 flex-1 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
        />
        <label
          className={cn(
            "inline-flex h-10 items-center justify-center gap-2 rounded-zaki-md bg-zaki-brand px-4 text-sm font-semibold text-white",
            (!kbName.trim() || createKb.isPending) && "pointer-events-none opacity-60",
          )}
        >
          <Plus className="size-4" />
          Create from files
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              if (!event.target.files?.length || !kbName.trim()) return;
              createKb.mutate({ name: kbName.trim(), files: event.target.files });
              event.target.value = "";
            }}
          />
        </label>
        <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-zaki-md border border-zaki-border px-4 text-sm font-semibold text-zaki-text hover:bg-zaki-hover">
          <Upload className="size-4" />
          Upload files
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              if (!event.target.files?.length) return;
              uploadKb.mutate({ name: kbName || "main", files: event.target.files });
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
              if (!event.target.files?.length) return;
              uploadKb.mutate({ name: kbName || "main", files: event.target.files });
              event.target.value = "";
            }}
          />
        </label>
      </div>
      <ItemList items={items} empty="No source libraries returned yet." />
    </Section>
  );
}

function BooksPanel({
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
      <ItemList items={items} empty="No books returned yet." />
    </Section>
  );
}

function NotebooksPanel({
  notebookName,
  setNotebookName,
  createNotebook,
  items,
}: {
  notebookName: string;
  setNotebookName: (value: string) => void;
  createNotebook: UseMutationResult<unknown, Error, string, unknown>;
  items: Item[];
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
      <ItemList items={items} empty="No notebooks returned yet." />
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
      <ItemList items={items} empty="No co-writer documents returned yet." />
    </Section>
  );
}

function ReviewPanel({ items }: { items: Item[] }) {
  return (
    <Section title="Question review" subtitle="Review saved quiz questions, attempts, bookmarks, and categories.">
      <ItemList items={items} empty="No saved questions returned yet." />
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
}: {
  agentId: string;
  setAgentId: (value: string) => void;
  agentName: string;
  setAgentName: (value: string) => void;
  agentPersona: string;
  setAgentPersona: (value: string) => void;
  createAgent: UseMutationResult<unknown, Error, void, unknown>;
  items: Item[];
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
      <ItemList items={items} empty="No tutor agents returned yet." />
    </Section>
  );
}

function WorkspacesPanel({
  visionQuestion,
  setVisionQuestion,
  setVisionImage,
  analyzeVision,
  solveItems,
}: {
  visionQuestion: string;
  setVisionQuestion: (value: string) => void;
  setVisionImage: (value: File | null) => void;
  analyzeVision: UseMutationResult<unknown, Error, void, unknown>;
  solveItems: Item[];
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
      <ItemList items={solveItems} empty="No solve sessions returned yet." />
    </Section>
  );
}

function ItemList({ items, empty }: { items: Item[]; empty: string }) {
  if (!items.length) return <EmptyLine label={empty} />;
  return (
    <div className="divide-y divide-zaki-border rounded-zaki-md border border-zaki-border">
      {items.slice(0, 12).map((item, index) => (
        <div key={`${itemTitle(item, "item")}-${index}`} className="p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-zaki-text">
                {itemTitle(item, `Item ${index + 1}`)}
              </div>
              <div className="mt-1 line-clamp-2 text-xs text-zaki-muted">
                {textOf(item.description) ||
                  textOf(item.summary) ||
                  textOf(item.preview) ||
                  textOf(item.status) ||
                  textOf(item.created_at) ||
                  "Ready"}
              </div>
            </div>
            <span className="shrink-0 rounded-zaki-md border border-zaki-border px-2 py-1 text-[11px] text-zaki-muted">
              {textOf(item.type) || textOf(item.record_type) || textOf(item.running, "item")}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
