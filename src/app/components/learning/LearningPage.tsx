import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import type { ChangeEvent, ClipboardEvent, DragEvent, KeyboardEvent, ReactNode, RefObject } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUp,
  AtSign,
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  BrainCircuit,
  ChevronDown,
  CheckCircle2,
  Clapperboard,
  ClipboardList,
  Clock3,
  Code2,
  Copy,
  Database,
  FileSearch,
  FileText,
  FolderUp,
  GraduationCap,
  Globe,
  Heart,
  History,
  Image,
  Layers,
  Lightbulb,
  Loader2,
  MessageSquare,
  Microscope,
  NotebookPen,
  Paperclip,
  PenLine,
  Plus,
  Search,
  Send,
  Settings,
  Square,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Wand2,
  X,
  type LucideIcon,
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
  deleteLearningCoWriterDocument,
  getLearningBook,
  getLearningBookSpine,
  getLearningCoWriterDocument,
  getLearningNotebook,
  getLearningQuestionEntry,
  getLearningSolveSession,
  getLearningTutorAgent,
  getLearningTutorAgentChannelsSchema,
  getLearningTutorAgentHistory,
  learningKeys,
  openLearningSocket,
  prepareLearningSocketAuth,
  listLearningKnowledgeFiles,
  listLearningBooks,
  listLearningCoWriterDocuments,
  listLearningKnowledge,
  listLearningSessions,
  listLearningNotebooks,
  listLearningQuestions,
  listLearningSkills,
  listLearningSolveSessions,
  listLearningTutorAgents,
  listLearningTutorAgentSouls,
  getLearningMemory,
  destroyLearningTutorAgent,
  updateLearningCoWriterDocument,
  updateLearningMemory,
  uploadLearningKnowledge,
  type LearningJson,
} from "@/lib/learningApi";
import {
  classifyLearningFile,
  formatLearningBytes,
  LEARNING_ATTACHMENT_ACCEPT,
  LEARNING_MAX_ATTACHMENT_BYTES,
  LEARNING_MAX_TOTAL_ATTACHMENT_BYTES,
  learningDocIconFor,
  type LearningAttachment,
} from "@/lib/learningAttachments";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { LearningSpacePickerModal } from "./LearningSpacePickerModal";
import { LearningBookWorkspace } from "./LearningBookWorkspace";
import { buildLearningSpaceReferences } from "./learningSpaceReferences";

type LearningTab =
  | "chat"
  | "sources"
  | "books"
  | "notebooks"
  | "writer"
  | "review"
  | "agents"
  | "space"
  | "workspaces";

type Item = Record<string, unknown>;
type CoWriterCreateDraft = { title: string; content: string };
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

type TutorChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  capability?: string;
  thinking?: string[];
  attachments?: LearningAttachment[];
};

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

const CO_WRITER_SAMPLE_TEMPLATE = `# Learning Draft

> A structured markdown workspace for notes, reports, tutorials, and AI-assisted drafts.

## Outline

- Context
- Key ideas
- Examples
- Questions to review

## Notes

Start writing here.
`;

const viewToLearningTab: Record<string, LearningTab> = {
  chat: "chat",
  tutorbot: "agents",
  agents: "agents",
  writer: "writer",
  "co-writer": "writer",
  books: "books",
  book: "books",
  sources: "sources",
  knowledge: "sources",
  space: "space",
  notebooks: "notebooks",
  review: "review",
  questions: "review",
  solve: "workspaces",
  workspaces: "workspaces",
  vision: "workspaces",
};

function normalizeLearningTab(value: string | null): LearningTab {
  return viewToLearningTab[String(value || "chat").trim().toLowerCase()] || "chat";
}

function asRecord(value: unknown): Item {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Item)
    : {};
}

function isItem(value: unknown): value is Item {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
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
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

export function LearningPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const requestedView = searchParams.get("view");
  const [tab, setTab] = useState<LearningTab>(() => normalizeLearningTab(requestedView));
  const [kbName, setKbName] = useState("main");
  const [bookTopic, setBookTopic] = useState("");
  const [notebookName, setNotebookName] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [, setWriterText] = useState("");
  const [agentId, setAgentId] = useState("");
  const [agentName, setAgentName] = useState("");
  const [agentPersona, setAgentPersona] = useState("");
  const [visionQuestion, setVisionQuestion] = useState("");
  const [visionImage, setVisionImage] = useState<File | null>(null);
  const [, setLastResult] = useState<unknown>(null);
  const [selectedObject, setSelectedObject] = useState<SelectedLearningObject | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    folderInputRef.current?.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    setTab(normalizeLearningTab(requestedView));
  }, [requestedView]);

  const knowledge = useQuery({
    queryKey: learningKeys.knowledge,
    queryFn: listLearningKnowledge,
    retry: 1,
  });
  const sessions = useQuery({
    queryKey: learningKeys.sessions,
    queryFn: () => listLearningSessions(100),
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
  const skills = useQuery({
    queryKey: learningKeys.skills,
    queryFn: listLearningSkills,
    retry: 1,
  });
  const memory = useQuery({
    queryKey: learningKeys.memory,
    queryFn: getLearningMemory,
    retry: 1,
  });
  const agents = useQuery({
    queryKey: learningKeys.tutorAgents,
    queryFn: listLearningTutorAgents,
    retry: 1,
  });
  const agentSouls = useQuery({
    queryKey: learningKeys.tutorAgentSouls,
    queryFn: listLearningTutorAgentSouls,
    retry: 1,
  });
  const agentChannelsSchema = useQuery({
    queryKey: learningKeys.tutorAgentChannelsSchema,
    queryFn: getLearningTutorAgentChannelsSchema,
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
  const sessionItems = useMemo(
    () => itemList(sessions.data, ["sessions", "items"]),
    [sessions.data],
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
  const skillItems = useMemo(
    () => itemList(skills.data, ["skills", "items"]),
    [skills.data],
  );
  const agentItems = useMemo(() => itemList(agents.data, ["bots", "items"]), [agents.data]);
  const agentSoulItems = useMemo(
    () => itemList(agentSouls.data, ["souls", "items", "templates"]),
    [agentSouls.data],
  );
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
    mutationFn: (payload: LearningJson) => createLearningBook(payload),
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
    mutationFn: ({ title, content }: CoWriterCreateDraft) =>
      createLearningCoWriterDocument({ title, content }),
    onSuccess: (payload) => {
      setLastResult(payload);
      setDocumentTitle("");
      setWriterText("");
      toast.success("Document created");
      void queryClient.invalidateQueries({ queryKey: learningKeys.coWriterDocuments });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteDocument = useMutation({
    mutationFn: (documentId: string) => deleteLearningCoWriterDocument(documentId),
    onSuccess: (payload) => {
      setLastResult(payload);
      toast.success("Document deleted");
      void queryClient.invalidateQueries({ queryKey: learningKeys.coWriterDocuments });
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

  const destroyAgent = useMutation({
    mutationFn: (nextAgentId: string) => destroyLearningTutorAgent(nextAgentId),
    onSuccess: (payload) => {
      setLastResult(payload);
      toast.success("Tutor deleted");
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

  const saveMemory = useMutation({
    mutationFn: ({ file, content }: { file: "summary" | "profile"; content: string }) =>
      updateLearningMemory(file, content),
    onSuccess: (payload) => {
      setLastResult(payload);
      toast.success("Memory saved");
      void queryClient.invalidateQueries({ queryKey: learningKeys.memory });
    },
    onError: (error) => toast.error(error.message),
  });

  const openObject = (type: LearningObjectType, item: Item, fallback: string) => {
    const id = itemId(item, fallback).trim();
    if (!id) return;
    setSelectedObject({ type, id, item });
  };

  return (
    <div className="h-full overflow-hidden bg-zaki-base">
      <div className="h-full">
        {tab === "books" ? (
          <LearningBookWorkspace
            bookTopic={bookTopic}
            setBookTopic={setBookTopic}
            createBook={createBook}
            items={bookItems}
            knowledgeItems={knowledgeItems}
            sessionItems={sessionItems}
            notebookItems={notebookItems}
            questionItems={questionItems}
          />
        ) : tab === "chat" ? (
          <LearningChatPanel
            kbName={kbName}
            setKbName={setKbName}
            knowledgeItems={knowledgeItems}
            sessionItems={sessionItems}
            bookItems={bookItems}
            notebookItems={notebookItems}
            questionItems={questionItems}
            skillItems={skillItems}
          />
        ) : tab === "sources" ? (
          <SourcesPanel
            kbName={kbName}
            setKbName={setKbName}
            createKb={createKb}
            uploadKb={uploadKb}
            items={knowledgeItems}
            folderInputRef={folderInputRef}
            onOpen={(item) => openObject("source", item, "main")}
          />
        ) : tab === "notebooks" ? (
          <NotebooksPanel
            notebookName={notebookName}
            setNotebookName={setNotebookName}
            createNotebook={createNotebook}
            items={notebookItems}
            onOpen={(item) =>
              openObject("notebook", item, `notebook-${notebookItems.indexOf(item) + 1}`)
            }
          />
        ) : tab === "writer" ? (
          <WriterPanel
            documentTitle={documentTitle}
            setDocumentTitle={setDocumentTitle}
            createDocument={createDocument}
            deleteDocument={deleteDocument}
            items={documentItems}
            onOpen={(item) =>
              openObject("document", item, `document-${documentItems.indexOf(item) + 1}`)
            }
          />
        ) : tab === "review" ? (
          <ReviewPanel
            items={questionItems}
            onOpen={(item) =>
              openObject("question", item, `question-${questionItems.indexOf(item) + 1}`)
            }
          />
        ) : tab === "space" ? (
          <LearningSpacePanel
            notebookName={notebookName}
            setNotebookName={setNotebookName}
            createNotebook={createNotebook}
            sessionItems={sessionItems}
            notebookItems={notebookItems}
            questionItems={questionItems}
            skillItems={skillItems}
            memory={memory.data}
            saveMemory={saveMemory}
            onOpenNotebook={(item) =>
              openObject("notebook", item, `notebook-${notebookItems.indexOf(item) + 1}`)
            }
            onOpenQuestion={(item) =>
              openObject("question", item, `question-${questionItems.indexOf(item) + 1}`)
            }
          />
        ) : tab === "agents" ? (
          <AgentsPanel
            agentId={agentId}
            setAgentId={setAgentId}
            agentName={agentName}
            setAgentName={setAgentName}
            agentPersona={agentPersona}
            setAgentPersona={setAgentPersona}
            createAgent={createAgent}
            destroyAgent={destroyAgent}
            items={agentItems}
            souls={agentSoulItems}
            channelsSchema={agentChannelsSchema.data}
            onOpen={(item) => openObject("agent", item, `agent-${agentItems.indexOf(item) + 1}`)}
          />
        ) : tab === "workspaces" ? (
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
      <LearningDetailSheet
        selected={selectedObject}
        onClose={() => setSelectedObject(null)}
        onResult={setLastResult}
      />
    </div>
  );
}

type LearningToolName =
  | "brainstorm"
  | "rag"
  | "web_search"
  | "code_execution"
  | "reason"
  | "paper_search";

type LearningToolDef = {
  name: LearningToolName;
  label: string;
  icon: LucideIcon;
};

type LearningResearchSource = "kb" | "web" | "papers";

type LearningResearchSourceDef = {
  name: LearningResearchSource;
  label: string;
  icon: LucideIcon;
};

type LearningCapabilityDef = {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
  allowedTools: LearningToolName[];
  defaultTools: LearningToolName[];
};

const learningTools: LearningToolDef[] = [
  { name: "brainstorm", label: "Brainstorm", icon: Lightbulb },
  { name: "rag", label: "RAG", icon: Database },
  { name: "web_search", label: "Web Search", icon: Globe },
  { name: "code_execution", label: "Code", icon: Code2 },
  { name: "reason", label: "Reason", icon: Sparkles },
  { name: "paper_search", label: "Arxiv Search", icon: FileSearch },
];

const learningResearchSources: LearningResearchSourceDef[] = [
  { name: "kb", label: "Knowledge Base", icon: Database },
  { name: "web", label: "Web", icon: Globe },
  { name: "papers", label: "Papers", icon: FileSearch },
];

const learningCapabilities: LearningCapabilityDef[] = [
  {
    value: "",
    label: "Chat",
    description: "Flexible conversation with any tool",
    icon: MessageSquare,
    allowedTools: [
      "brainstorm",
      "rag",
      "web_search",
      "code_execution",
      "reason",
      "paper_search",
    ],
    defaultTools: [],
  },
  {
    value: "deep_solve",
    label: "Deep Solve",
    description: "Multi-step reasoning & problem solving",
    icon: BrainCircuit,
    allowedTools: ["rag", "web_search", "code_execution", "reason"],
    defaultTools: ["rag", "web_search", "code_execution", "reason"],
  },
  {
    value: "deep_question",
    label: "Quiz Generation",
    description: "Auto-validated question generation",
    icon: PenLine,
    allowedTools: ["rag", "web_search", "code_execution"],
    defaultTools: ["rag", "web_search", "code_execution"],
  },
  {
    value: "deep_research",
    label: "Deep Research",
    description: "Comprehensive multi-agent research",
    icon: Microscope,
    allowedTools: [],
    defaultTools: [],
  },
  {
    value: "math_animator",
    label: "Math Animator",
    description: "Generate math videos or storyboard images",
    icon: Clapperboard,
    allowedTools: [],
    defaultTools: [],
  },
  {
    value: "visualize",
    label: "Visualize",
    description: "Generate SVG, Chart.js, or Mermaid visualizations",
    icon: BarChart3,
    allowedTools: [],
    defaultTools: [],
  },
];

type DeepQuestionMode = "custom" | "mimic";
type DeepQuestionFormConfig = {
  mode: DeepQuestionMode;
  topic: string;
  num_questions: number;
  difficulty: string;
  question_type: string;
  preference: string;
  paper_path: string;
  max_questions: number;
};

type MathAnimatorFormConfig = {
  output_mode: "video" | "image";
  quality: "low" | "medium" | "high";
  style_hint: string;
};

type VisualizeFormConfig = {
  render_mode: "auto" | "svg" | "chartjs" | "mermaid" | "html";
};

type ResearchMode = "" | "notes" | "report" | "comparison" | "learning_path";
type ResearchDepth = "" | "quick" | "standard" | "deep" | "manual";
type DeepResearchFormConfig = {
  mode: ResearchMode;
  depth: ResearchDepth;
  sources: LearningResearchSource[];
  manual_subtopics?: number;
  manual_max_iterations?: number;
};

const defaultQuizConfig: DeepQuestionFormConfig = {
  mode: "custom",
  topic: "",
  num_questions: 3,
  difficulty: "auto",
  question_type: "auto",
  preference: "",
  paper_path: "",
  max_questions: 10,
};

const defaultMathAnimatorConfig: MathAnimatorFormConfig = {
  output_mode: "video",
  quality: "medium",
  style_hint: "",
};

const defaultVisualizeConfig: VisualizeFormConfig = {
  render_mode: "auto",
};

const defaultResearchConfig: DeepResearchFormConfig = {
  mode: "",
  depth: "",
  sources: ["kb", "web", "papers"],
};

const composerInputClass =
  "h-[30px] rounded-lg border border-[var(--border)]/30 bg-[var(--background)]/50 px-2.5 text-[12px] text-[var(--foreground)] outline-none transition-colors hover:border-[var(--border)]/50 focus:border-[var(--primary)]/35 placeholder:text-[var(--muted-foreground)]/40";

function titleCase(value: string) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function summarizeQuizConfig(cfg: DeepQuestionFormConfig) {
  if (cfg.mode === "mimic") {
    return ["Mimic Paper", cfg.paper_path.trim() || "no paper", `Max ${cfg.max_questions}`].join(
      " · ",
    );
  }
  return [
    "Custom",
    `${cfg.num_questions} questions`,
    titleCase(cfg.difficulty || "auto"),
    titleCase(cfg.question_type || "auto"),
  ].join(" · ");
}

function buildQuizConfig(cfg: DeepQuestionFormConfig) {
  if (cfg.mode === "mimic") {
    return {
      mode: "mimic",
      paper_path: cfg.paper_path.trim(),
      max_questions: cfg.max_questions,
    };
  }
  return {
    mode: "custom",
    num_questions: cfg.num_questions,
    difficulty: cfg.difficulty === "auto" ? "" : cfg.difficulty,
    question_type: cfg.question_type === "auto" ? "" : cfg.question_type,
    preference: cfg.preference.trim(),
  };
}

function summarizeMathAnimatorConfig(cfg: MathAnimatorFormConfig) {
  return [titleCase(cfg.output_mode), titleCase(cfg.quality)].join(" · ");
}

function buildMathAnimatorConfig(cfg: MathAnimatorFormConfig) {
  return {
    output_mode: cfg.output_mode,
    quality: cfg.quality,
    style_hint: cfg.style_hint.trim(),
  };
}

function summarizeVisualizeConfig(cfg: VisualizeFormConfig) {
  const labels: Record<VisualizeFormConfig["render_mode"], string> = {
    auto: "Auto",
    chartjs: "Chart.js",
    svg: "SVG",
    mermaid: "Mermaid",
    html: "HTML",
  };
  return labels[cfg.render_mode];
}

function buildVisualizeConfig(cfg: VisualizeFormConfig) {
  return { render_mode: cfg.render_mode };
}

function validateResearchConfig(cfg: DeepResearchFormConfig) {
  const errors: Record<string, string> = {};
  if (!cfg.mode) errors.mode = "Required";
  if (!cfg.depth) errors.depth = "Required";
  return errors;
}

function summarizeResearchConfig(cfg: DeepResearchFormConfig) {
  if (Object.keys(validateResearchConfig(cfg)).length) return undefined;
  const modeLabels: Record<string, string> = {
    notes: "Study Notes",
    report: "Report",
    comparison: "Comparison",
    learning_path: "Learning Path",
  };
  return [
    modeLabels[cfg.mode] ?? cfg.mode,
    titleCase(cfg.depth),
    cfg.sources.length ? cfg.sources.join("+") : "llm-only",
  ].join(" · ");
}

function buildResearchConfig(cfg: DeepResearchFormConfig) {
  const errors = validateResearchConfig(cfg);
  if (Object.keys(errors).length) {
    throw new Error("Deep research settings are incomplete.");
  }
  return {
    mode: cfg.mode,
    depth: cfg.depth,
    sources: [...cfg.sources],
    ...(cfg.depth === "manual" && cfg.manual_subtopics != null
      ? { manual_subtopics: cfg.manual_subtopics }
      : {}),
    ...(cfg.depth === "manual" && cfg.manual_max_iterations != null
      ? { manual_max_iterations: cfg.manual_max_iterations }
      : {}),
  };
}

function ComposerField({
  label,
  width,
  children,
}: {
  label: string;
  width?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col", width)}>
      <span className="mb-0.5 text-[10px] font-medium text-[var(--muted-foreground)]/60">
        {label}
      </span>
      {children}
    </label>
  );
}

function CollapsibleConfigSection({
  collapsed,
  summary,
  onToggleCollapsed,
  bodyClassName,
  children,
}: {
  collapsed: boolean;
  summary?: string;
  onToggleCollapsed: () => void;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="flex w-full items-center gap-1.5 px-3.5 py-1.5 text-left transition-colors hover:opacity-80"
      >
        <ChevronDown
          size={10}
          className={cn(
            "shrink-0 text-[var(--muted-foreground)]/40 transition-transform",
            collapsed && "-rotate-90",
          )}
        />
        <span className="text-[10px] font-medium text-[var(--muted-foreground)]/55">
          Settings
        </span>
        {collapsed && summary ? (
          <span className="min-w-0 truncate text-[10px] text-[var(--muted-foreground)]/30">
            - {summary}
          </span>
        ) : null}
      </button>
      {!collapsed ? <div className={bodyClassName ?? "px-3.5 pb-2.5"}>{children}</div> : null}
    </div>
  );
}

function QuizConfigPanel({
  value,
  onChange,
  uploadedPdf,
  onUploadPdf,
  collapsed,
  onToggleCollapsed,
}: {
  value: DeepQuestionFormConfig;
  onChange: (next: DeepQuestionFormConfig) => void;
  uploadedPdf: File | null;
  onUploadPdf: (file: File | null) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const update = <K extends keyof DeepQuestionFormConfig>(
    key: K,
    next: DeepQuestionFormConfig[K],
  ) => onChange({ ...value, [key]: next });

  return (
    <CollapsibleConfigSection
      collapsed={collapsed}
      summary={summarizeQuizConfig(value)}
      onToggleCollapsed={onToggleCollapsed}
      bodyClassName="space-y-2.5 px-3.5 pb-2.5"
    >
      <div className="inline-flex rounded-lg border border-[var(--border)]/25 p-0.5">
        {(["custom", "mimic"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => update("mode", mode)}
            className={cn(
              "rounded-md px-3 py-1 text-[11px] font-medium transition-all",
              value.mode === mode
                ? "bg-[var(--muted)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted-foreground)]/50 hover:text-[var(--muted-foreground)]",
            )}
          >
            {mode === "custom" ? "Custom" : "Mimic Paper"}
          </button>
        ))}
      </div>

      {value.mode === "custom" ? (
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
          <ComposerField label="Count" width="w-[60px]">
            <input
              type="number"
              min={1}
              max={50}
              value={value.num_questions}
              onChange={(event) =>
                update("num_questions", Math.max(1, Number(event.target.value) || 1))
              }
              className={`${composerInputClass} w-full`}
            />
          </ComposerField>
          <ComposerField label="Difficulty" width="w-[100px]">
            <select
              value={value.difficulty}
              onChange={(event) => update("difficulty", event.target.value)}
              className={`${composerInputClass} w-full`}
            >
              <option value="auto">Auto</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </ComposerField>
          <ComposerField label="Type" width="w-[110px]">
            <select
              value={value.question_type}
              onChange={(event) => update("question_type", event.target.value)}
              className={`${composerInputClass} w-full`}
            >
              <option value="auto">Auto</option>
              <option value="choice">Multiple Choice</option>
              <option value="written">Written</option>
              <option value="coding">Coding</option>
            </select>
          </ComposerField>
          <ComposerField label="Preference" width="min-w-[140px] flex-1">
            <input
              type="text"
              value={value.preference}
              onChange={(event) => update("preference", event.target.value)}
              placeholder="Extra constraints..."
              className={`${composerInputClass} w-full`}
            />
          </ComposerField>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
          <ComposerField label="Paper" width="min-w-[180px] flex-[1.3]">
            {uploadedPdf ? (
              <div className="flex h-[30px] items-center gap-2 rounded-lg border border-[var(--border)]/30 bg-[var(--background)]/50 px-2.5 text-[12px]">
                <FileText size={12} className="shrink-0 text-[var(--primary)]/60" />
                <span className="min-w-0 truncate text-[var(--foreground)]">
                  {uploadedPdf.name}
                </span>
                <button
                  type="button"
                  onClick={() => onUploadPdf(null)}
                  className="ml-auto shrink-0 text-[var(--muted-foreground)]/40 transition-colors hover:text-[var(--foreground)]"
                  aria-label="Remove PDF"
                >
                  <X size={11} />
                </button>
              </div>
            ) : (
              <label
                className={cn(
                  "flex h-[30px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed px-2.5 text-[12px] transition-colors",
                  dragOver
                    ? "border-[var(--primary)]/35 text-[var(--primary)]"
                    : "border-[var(--border)]/35 text-[var(--muted-foreground)]/50 hover:border-[var(--border)]/55 hover:text-[var(--foreground)]",
                )}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  const file = event.dataTransfer.files[0];
                  if (file?.type === "application/pdf") {
                    onUploadPdf(file);
                    update("paper_path", "");
                  }
                }}
              >
                <Upload size={11} />
                <span>Upload PDF</span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file) {
                      onUploadPdf(file);
                      update("paper_path", "");
                    }
                    event.target.value = "";
                  }}
                />
              </label>
            )}
          </ComposerField>
          <ComposerField label="Parsed Dir" width="min-w-[120px] flex-1">
            <input
              type="text"
              value={value.paper_path}
              onChange={(event) => {
                onUploadPdf(null);
                update("paper_path", event.target.value);
              }}
              placeholder="e.g. 2211asm1"
              className={`${composerInputClass} w-full`}
            />
          </ComposerField>
          <ComposerField label="Max" width="w-[60px]">
            <input
              type="number"
              min={1}
              max={100}
              value={value.max_questions}
              onChange={(event) =>
                update("max_questions", Math.max(1, Number(event.target.value) || 1))
              }
              className={`${composerInputClass} w-full`}
            />
          </ComposerField>
        </div>
      )}
    </CollapsibleConfigSection>
  );
}

function ResearchConfigPanel({
  value,
  collapsed,
  onChange,
  onToggleCollapsed,
}: {
  value: DeepResearchFormConfig;
  collapsed: boolean;
  onChange: (next: DeepResearchFormConfig) => void;
  onToggleCollapsed: () => void;
}) {
  const update = <K extends keyof DeepResearchFormConfig>(
    key: K,
    next: DeepResearchFormConfig[K],
  ) => onChange({ ...value, [key]: next });

  return (
    <CollapsibleConfigSection
      collapsed={collapsed}
      summary={summarizeResearchConfig(value)}
      onToggleCollapsed={onToggleCollapsed}
      bodyClassName="space-y-2 px-3.5 pb-2.5"
    >
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        <ComposerField label="Mode" width="min-w-[130px] flex-1">
          <select
            value={value.mode}
            onChange={(event) => update("mode", event.target.value as ResearchMode)}
            className={`${composerInputClass} w-full`}
          >
            <option value="">Select...</option>
            <option value="notes">Study Notes</option>
            <option value="report">Report</option>
            <option value="comparison">Comparison</option>
            <option value="learning_path">Learning Path</option>
          </select>
        </ComposerField>
        <ComposerField label="Depth" width="min-w-[130px] flex-1">
          <select
            value={value.depth}
            onChange={(event) => update("depth", event.target.value as ResearchDepth)}
            className={`${composerInputClass} w-full`}
          >
            <option value="">Select...</option>
            <option value="quick">Quick</option>
            <option value="standard">Standard</option>
            <option value="deep">Deep</option>
            <option value="manual">Manual</option>
          </select>
        </ComposerField>
      </div>
      {value.depth === "manual" ? (
        <div className="space-y-1.5 rounded-md bg-[var(--muted-foreground)]/5 px-3 py-2">
          {[
            { key: "manual_subtopics", label: "Sub-topics", min: 1, max: 10, fallback: 3 },
            { key: "manual_max_iterations", label: "Iterations", min: 1, max: 8, fallback: 3 },
          ].map((slider) => (
            <div key={slider.key} className="flex items-center gap-2">
              <span className="shrink-0 text-[10px] text-[var(--muted-foreground)]/60">
                {slider.label}
              </span>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={1}
                value={Number(value[slider.key as keyof DeepResearchFormConfig] ?? slider.fallback)}
                onChange={(event) =>
                  update(
                    slider.key as keyof DeepResearchFormConfig,
                    Number(event.target.value) as never,
                  )
                }
                className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--muted-foreground)]/15 accent-[var(--primary)]"
              />
              <span className="w-5 text-center text-[11px] font-semibold tabular-nums text-[var(--foreground)]">
                {Number(value[slider.key as keyof DeepResearchFormConfig] ?? slider.fallback)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </CollapsibleConfigSection>
  );
}

function MathAnimatorConfigPanel({
  value,
  collapsed,
  onChange,
  onToggleCollapsed,
}: {
  value: MathAnimatorFormConfig;
  collapsed: boolean;
  onChange: (next: MathAnimatorFormConfig) => void;
  onToggleCollapsed: () => void;
}) {
  return (
    <CollapsibleConfigSection
      collapsed={collapsed}
      summary={summarizeMathAnimatorConfig(value)}
      onToggleCollapsed={onToggleCollapsed}
      bodyClassName="flex flex-wrap items-end gap-x-3 gap-y-2 px-3.5 pb-2.5"
    >
      <ComposerField label="Output" width="w-[100px]">
        <select
          value={value.output_mode}
          onChange={(event) =>
            onChange({ ...value, output_mode: event.target.value as MathAnimatorFormConfig["output_mode"] })
          }
          className={`${composerInputClass} w-full`}
        >
          <option value="video">Video</option>
          <option value="image">Image</option>
        </select>
      </ComposerField>
      <ComposerField label="Quality" width="w-[100px]">
        <select
          value={value.quality}
          onChange={(event) =>
            onChange({ ...value, quality: event.target.value as MathAnimatorFormConfig["quality"] })
          }
          className={`${composerInputClass} w-full`}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </ComposerField>
      <ComposerField label="Style Hint" width="min-w-[160px] flex-1">
        <input
          type="text"
          value={value.style_hint}
          onChange={(event) => onChange({ ...value, style_hint: event.target.value })}
          placeholder="Style, pacing, color..."
          className={`${composerInputClass} w-full`}
        />
      </ComposerField>
    </CollapsibleConfigSection>
  );
}

function VisualizeConfigPanel({
  value,
  collapsed,
  onChange,
  onToggleCollapsed,
}: {
  value: VisualizeFormConfig;
  collapsed: boolean;
  onChange: (next: VisualizeFormConfig) => void;
  onToggleCollapsed: () => void;
}) {
  return (
    <CollapsibleConfigSection
      collapsed={collapsed}
      summary={summarizeVisualizeConfig(value)}
      onToggleCollapsed={onToggleCollapsed}
      bodyClassName="flex flex-wrap items-end gap-x-3 gap-y-2 px-3.5 pb-2.5"
    >
      <ComposerField label="Render Mode" width="w-[120px]">
        <select
          value={value.render_mode}
          onChange={(event) =>
            onChange({ ...value, render_mode: event.target.value as VisualizeFormConfig["render_mode"] })
          }
          className={`${composerInputClass} w-full`}
        >
          <option value="auto">Auto</option>
          <option value="chartjs">Chart.js</option>
          <option value="svg">SVG</option>
          <option value="mermaid">Mermaid</option>
          <option value="html">HTML</option>
        </select>
      </ComposerField>
    </CollapsibleConfigSection>
  );
}

function makeClientId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function shouldAppendLearningContent(eventType: string, payload: Item) {
  if (eventType !== "content") return false;
  const metadata = asRecord(payload.metadata);
  const callId = textOf(metadata.call_id);
  const callKind = textOf(metadata.call_kind);
  return !callId || callKind === "llm_final_response";
}

function learningEventText(eventType: string, payload: Item) {
  const content = textOf(payload.content) || textOf(payload.message);
  if (content) return content;
  const stage = textOf(payload.stage);
  if (eventType === "stage_start" && stage) return `Started ${stage}`;
  if (eventType === "stage_end" && stage) return `Finished ${stage}`;
  const metadata = asRecord(payload.metadata);
  return textOf(metadata.label) || textOf(metadata.status);
}

function LearningAttachmentChip({
  attachment,
  onRemove,
  compact = false,
}: {
  attachment: LearningAttachment;
  onRemove?: () => void;
  compact?: boolean;
}) {
  if (attachment.type === "image" && attachment.previewUrl) {
    return (
      <div className="group relative" title={attachment.filename}>
        <div
          className={cn(
            "overflow-hidden rounded-zaki-md border border-zaki-border bg-zaki-raised",
            compact ? "h-11 w-11" : "h-16 w-16",
          )}
        >
          <img
            src={attachment.previewUrl}
            alt={attachment.filename}
            className="h-full w-full object-cover"
          />
        </div>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove attachment"
            className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-zaki-text text-zaki-base opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
          >
            <X className="size-2.5" />
          </button>
        ) : null}
      </div>
    );
  }

  const icon = learningDocIconFor(attachment.filename);
  const Icon = icon.Icon;
  const sizeLabel = attachment.size ? formatLearningBytes(attachment.size) : "";

  return (
    <div className="group relative" title={attachment.filename}>
      <div
        className={cn(
          "flex items-center gap-2 rounded-zaki-md border border-zaki-border bg-zaki-raised px-2 text-left",
          compact ? "h-11 w-[132px]" : "h-16 w-[160px]",
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-zaki-sm bg-zaki-base">
          <Icon className={cn("size-5", icon.tint)} strokeWidth={1.6} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-zaki-text">
            {attachment.filename}
          </div>
          <div className="truncate text-[10px] uppercase text-zaki-muted">
            {sizeLabel ? `${icon.label} - ${sizeLabel}` : icon.label}
          </div>
        </div>
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove attachment"
          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-zaki-text text-zaki-base opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
        >
          <X className="size-2.5" />
        </button>
      ) : null}
    </div>
  );
}

function SpaceContextChip({
  icon: Icon,
  label,
  onRemove,
}: {
  icon: LucideIcon;
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex max-w-[220px] items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--background)]/60 px-2 py-1 text-[11px] font-medium text-[var(--muted-foreground)]">
      <Icon size={11} strokeWidth={1.8} className="shrink-0" />
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="ml-0.5 text-[var(--muted-foreground)]/50 transition-colors hover:text-[var(--foreground)]"
      >
        <X size={11} />
      </button>
    </span>
  );
}

function LearningChatPanel({
  kbName,
  setKbName,
  knowledgeItems,
  sessionItems,
  bookItems,
  notebookItems,
  questionItems,
  skillItems,
}: {
  kbName: string;
  setKbName: (name: string) => void;
  knowledgeItems: Item[];
  sessionItems: Item[];
  bookItems: Item[];
  notebookItems: Item[];
  questionItems: Item[];
  skillItems: Item[];
}) {
  const [messages, setMessages] = useState<TutorChatMessage[]>([]);
  const [thinking, setThinking] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [capability, setCapability] = useState("");
  const [capabilityMenuOpen, setCapabilityMenuOpen] = useState(false);
  const [toolMenuOpen, setToolMenuOpen] = useState(false);
  const [spaceMenuOpen, setSpaceMenuOpen] = useState(false);
  const [spacePickerOpen, setSpacePickerOpen] = useState<LearningSpacePickerKey | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [quizConfig, setQuizConfig] = useState<DeepQuestionFormConfig>(defaultQuizConfig);
  const [quizPdf, setQuizPdf] = useState<File | null>(null);
  const [mathAnimatorConfig, setMathAnimatorConfig] =
    useState<MathAnimatorFormConfig>(defaultMathAnimatorConfig);
  const [visualizeConfig, setVisualizeConfig] =
    useState<VisualizeFormConfig>(defaultVisualizeConfig);
  const [researchConfig, setResearchConfig] =
    useState<DeepResearchFormConfig>(defaultResearchConfig);
  const [selectedTools, setSelectedTools] = useState<Set<LearningToolName>>(new Set());
  const [selectedResearchSources, setSelectedResearchSources] = useState<
    Set<LearningResearchSource>
  >(new Set(["kb", "web", "papers"]));
  const [attachments, setAttachments] = useState<LearningAttachment[]>([]);
  const [selectedHistorySessions, setSelectedHistorySessions] = useState<
    SelectedHistorySpaceItem[]
  >([]);
  const [selectedBooks, setSelectedBooks] = useState<SelectedBookSpaceItem[]>([]);
  const [selectedNotebooks, setSelectedNotebooks] = useState<SelectedNotebookSpaceItem[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestionSpaceItem[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillsAutoMode, setSkillsAutoMode] = useState(false);
  const [selectedMemoryFiles, setSelectedMemoryFiles] = useState<LearningMemoryFile[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [socketAuthReady, setSocketAuthReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState(() => makeClientId("learn-session"));
  const socketRef = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragCounterRef = useRef(0);
  const attachmentErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attachmentsRef = useRef<LearningAttachment[]>([]);
  const messagesRef = useRef<TutorChatMessage[]>([]);
  const thinkingRef = useRef<string[]>([]);
  const activeAssistantIdRef = useRef<string | null>(null);
  const activeTurnIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const activeCapability =
    learningCapabilities.find((entry) => entry.value === capability) ??
    learningCapabilities[0]!;
  const ActiveCapabilityIcon = activeCapability.icon;
  const visibleTools = learningTools.filter((tool) =>
    activeCapability.allowedTools.includes(tool.name),
  );
  const isResearchMode = capability === "deep_research";
  const isQuizMode = capability === "deep_question";
  const isMathAnimatorMode = capability === "math_animator";
  const isVisualizeMode = capability === "visualize";
  const ragActive = selectedTools.has("rag") || isResearchMode;
  const researchErrors = validateResearchConfig({
    ...researchConfig,
    sources: Array.from(selectedResearchSources),
  });
  const canSend =
    connected &&
    !streaming &&
    Boolean(
      input.trim() ||
        attachments.length ||
        selectedHistorySessions.length ||
        selectedBooks.length ||
        selectedNotebooks.length ||
        selectedQuestions.length ||
        selectedSkills.length ||
        skillsAutoMode ||
        selectedMemoryFiles.length ||
        isQuizMode,
    ) &&
    !(isResearchMode && Object.keys(researchErrors).length > 0);
  const spaceSelectionCounts = {
    chatHistory: selectedHistorySessions.length,
    books: selectedBooks.reduce((total, book) => total + book.pages.length, 0),
    notebooks: selectedNotebooks.reduce((total, notebook) => total + notebook.records.length, 0),
    questionBank: selectedQuestions.length,
    skills: skillsAutoMode ? 1 : selectedSkills.length,
    memory: selectedMemoryFiles.length,
  };
  const spaceSelectionCount =
    spaceSelectionCounts.chatHistory +
    spaceSelectionCounts.books +
    spaceSelectionCounts.notebooks +
    spaceSelectionCounts.questionBank +
    spaceSelectionCounts.skills +
    spaceSelectionCounts.memory;
  const knowledgeBaseNames = useMemo(() => {
    const names = new Set<string>();
    knowledgeItems.forEach((item) => {
      const name = textOf(item.name) || textOf(item.title);
      if (name) names.add(name);
    });
    if (kbName.trim()) names.add(kbName.trim());
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [knowledgeItems, kbName]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  useEffect(() => {
    return () => {
      if (attachmentErrorTimerRef.current) {
        clearTimeout(attachmentErrorTimerRef.current);
      }
      const previews = [
        ...attachmentsRef.current,
        ...messagesRef.current.flatMap((message) => message.attachments ?? []),
      ];
      previews.forEach((attachment) => {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      });
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSocketAuthReady(false);
    void prepareLearningSocketAuth().finally(() => {
      if (!cancelled) setSocketAuthReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!socketAuthReady) return undefined;
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
      const content = learningEventText(eventType, payload);
      const nextSessionId = textOf(payload.session_id);
      const nextTurnId = textOf(payload.turn_id);
      if (nextSessionId) setSessionId(nextSessionId);
      if (nextTurnId) activeTurnIdRef.current = nextTurnId;

      if (eventType === "session") {
        const metadata = asRecord(payload.metadata);
        const metadataSessionId = textOf(metadata.session_id);
        if (metadataSessionId) setSessionId(metadataSessionId);
        return;
      }

      if (
        eventType === "thinking" ||
        eventType === "observation" ||
        eventType === "progress" ||
        eventType === "stage_start" ||
        eventType === "stage_end" ||
        eventType === "tool_call" ||
        eventType === "tool_result"
      ) {
        if (content) {
          thinkingRef.current = [...thinkingRef.current, content];
          setThinking(thinkingRef.current.slice(-6));
        }
        return;
      }

      if (shouldAppendLearningContent(eventType, payload)) {
        const assistantId = activeAssistantIdRef.current || makeClientId("assistant");
        activeAssistantIdRef.current = assistantId;
        const thinkingSnapshot = thinkingRef.current;
        setMessages((items) => {
          const existingIndex = items.findIndex((item) => item.id === assistantId);
          if (existingIndex >= 0) {
            return items.map((item, index) =>
              index === existingIndex
                ? {
                    ...item,
                    content: `${item.content}${content}`,
                    thinking:
                      item.thinking ??
                      (thinkingSnapshot.length ? [...thinkingSnapshot] : undefined),
                  }
                : item,
            );
          }
          return [
            ...items,
            {
              id: assistantId,
              role: "assistant",
              content,
              capability: capability || "chat",
              thinking: thinkingSnapshot.length ? [...thinkingSnapshot] : undefined,
            },
          ];
        });
        return;
      }

      if (eventType === "result") {
        const thinkingSnapshot = thinkingRef.current;
        const assistantId = activeAssistantIdRef.current || makeClientId("assistant");
        if (content) {
          setMessages((items) => {
            const existingIndex = items.findIndex((item) => item.id === assistantId);
            if (existingIndex >= 0) {
              return items.map((item, index) =>
                index === existingIndex
                  ? {
                      ...item,
                      content: content.length > item.content.length ? content : item.content,
                      thinking:
                        item.thinking ??
                        (thinkingSnapshot.length ? [...thinkingSnapshot] : undefined),
                    }
                  : item,
              );
            }
            return [
              ...items,
              {
                id: assistantId,
                role: "assistant",
                content,
                capability: capability || "chat",
                thinking: thinkingSnapshot.length ? [...thinkingSnapshot] : undefined,
              },
            ];
          });
        }
        activeAssistantIdRef.current = null;
        activeTurnIdRef.current = null;
        thinkingRef.current = [];
        setThinking([]);
        return;
      }

      if (eventType === "done") {
        activeAssistantIdRef.current = null;
        activeTurnIdRef.current = null;
        thinkingRef.current = [];
        setThinking([]);
        setStreaming(false);
        return;
      }

      if (eventType === "error") {
        setMessages((items) => [
          ...items,
          {
            id: makeClientId("error"),
            role: "system",
            content: content ? `Error: ${content}` : "Learning stream returned an error.",
          },
        ]);
        activeAssistantIdRef.current = null;
        activeTurnIdRef.current = null;
        thinkingRef.current = [];
        setThinking([]);
        setStreaming(false);
      }
    };
    socket.onerror = () => {
      setMessages((items) => [
        ...items,
        {
          id: makeClientId("socket-error"),
          role: "system",
          content: "Learning chat connection failed.",
        },
      ]);
      setStreaming(false);
    };
    socket.onclose = () => {
      setConnected(false);
      setStreaming(false);
    };
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [socketAuthReady]);

  const showAttachmentError = (message: string) => {
    setAttachmentError(message);
    if (attachmentErrorTimerRef.current) clearTimeout(attachmentErrorTimerRef.current);
    attachmentErrorTimerRef.current = setTimeout(() => {
      setAttachmentError(null);
      attachmentErrorTimerRef.current = null;
    }, 4000);
  };

  const addFiles = async (files: File[]) => {
    if (!files.length) return;
    let runningTotal = attachments.reduce((sum, attachment) => sum + attachment.size, 0);
    const accepted: File[] = [];

    for (const file of files) {
      const kind = classifyLearningFile(file);
      if (!kind) {
        showAttachmentError(`Unsupported file type: ${file.name}`);
        continue;
      }
      if (file.size > LEARNING_MAX_ATTACHMENT_BYTES) {
        showAttachmentError(`File too large: ${file.name}`);
        continue;
      }
      if (runningTotal + file.size > LEARNING_MAX_TOTAL_ATTACHMENT_BYTES) {
        showAttachmentError("Too many files, skipped some.");
        break;
      }
      runningTotal += file.size;
      accepted.push(file);
    }

    if (!accepted.length) return;

    try {
      const nextAttachments = await Promise.all(
        accepted.map(async (file) => {
          const kind = classifyLearningFile(file) ?? "file";
          return {
            id: makeClientId("attachment"),
            type: kind,
            filename: file.name,
            base64: await fileToBase64(file),
            mime_type: file.type || undefined,
            size: file.size,
            previewUrl: kind === "image" ? URL.createObjectURL(file) : undefined,
          } satisfies LearningAttachment;
        }),
      );
      setAttachments((items) => [...items, ...nextAttachments]);
    } catch {
      showAttachmentError("Unable to read the selected file.");
    }
  };

  const handleFileInput = async (event: ChangeEvent<HTMLInputElement>) => {
    await addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const handlePaste = async (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    if (!files.length) return;
    event.preventDefault();
    await addFiles(files);
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current += 1;
    if (event.dataTransfer.types.includes("Files")) setDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setDragging(false);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    dragCounterRef.current = 0;
    await addFiles(Array.from(event.dataTransfer.files));
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments((items) => {
      const removed = items.find((attachment) => attachment.id === attachmentId);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return items.filter((attachment) => attachment.id !== attachmentId);
    });
  };

  const selectCapability = (value: string) => {
    const nextCapability =
      learningCapabilities.find((entry) => entry.value === value) ?? learningCapabilities[0]!;
    setCapability(nextCapability.value);
    setSelectedTools(new Set(nextCapability.defaultTools));
    setPanelCollapsed(false);
    setCapabilityMenuOpen(false);
    setToolMenuOpen(false);
  };

  const toggleTool = (toolName: LearningToolName) => {
    if (!activeCapability.allowedTools.includes(toolName)) return;
    setSelectedTools((current) => {
      const next = new Set(current);
      if (next.has(toolName)) next.delete(toolName);
      else next.add(toolName);
      return next;
    });
  };

  const toggleResearchSource = (source: LearningResearchSource) => {
    setSelectedResearchSources((current) => {
      const next = new Set(current);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      setResearchConfig((config) => ({ ...config, sources: Array.from(next) }));
      return next;
    });
  };

  const sendMessage = async () => {
    const fallbackContent = attachments.some((attachment) => attachment.type === "image")
      ? "Please analyze the attached image(s)."
      : isQuizMode
        ? "Generate quiz questions using the selected settings."
        : isMathAnimatorMode
          ? "Generate a math animation from the prompt and attached references."
          : isVisualizeMode
            ? "Create a visualization from the prompt and attached data."
            : "Please use the selected context to help with this request.";
    const content =
      input.trim() ||
      (attachments.length ||
      selectedHistorySessions.length ||
      selectedBooks.length ||
      selectedNotebooks.length ||
      selectedQuestions.length ||
      selectedSkills.length ||
      skillsAutoMode ||
      selectedMemoryFiles.length ||
      isQuizMode ||
      isMathAnimatorMode ||
      isVisualizeMode
        ? fallbackContent
        : "");
    const socket = socketRef.current;
    if (!content || !socket || socket.readyState !== WebSocket.OPEN) return;
    let config: Record<string, unknown> | undefined;
    let sentAttachments = attachments;
    try {
      if (isQuizMode) {
        config = buildQuizConfig(quizConfig);
        if (quizConfig.mode === "mimic" && quizPdf) {
          sentAttachments = [
            ...sentAttachments,
            {
              id: makeClientId("attachment"),
              type: "file",
              filename: quizPdf.name,
              base64: await fileToBase64(quizPdf),
              mime_type: quizPdf.type || "application/pdf",
              size: quizPdf.size,
            },
          ];
        }
      } else if (isMathAnimatorMode) {
        config = buildMathAnimatorConfig(mathAnimatorConfig);
      } else if (isVisualizeMode) {
        config = { ...buildVisualizeConfig(visualizeConfig) };
      } else if (isResearchMode) {
        config = buildResearchConfig({
          ...researchConfig,
          sources: Array.from(selectedResearchSources),
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Capability settings are incomplete.");
      return;
    }
    const spaceReferences = buildLearningSpaceReferences({
      selectedHistorySessions,
      selectedBooks,
      selectedNotebooks,
      selectedQuestions,
      selectedSkills,
      skillsAutoMode,
      selectedMemoryFiles,
    });
    setMessages((items) => [
      ...items,
      {
        id: makeClientId("user"),
        role: "user",
        content,
        capability: capability || "chat",
        attachments: sentAttachments,
      },
    ]);
    setInput("");
    setAttachments([]);
    setSelectedHistorySessions([]);
    setSelectedBooks([]);
    setSelectedNotebooks([]);
    setSelectedQuestions([]);
    setSelectedSkills([]);
    setSkillsAutoMode(false);
    setSelectedMemoryFiles([]);
    setPanelCollapsed(true);
    setStreaming(true);
    activeAssistantIdRef.current = makeClientId("assistant");
    activeTurnIdRef.current = null;
    thinkingRef.current = [];
    setThinking([]);
    socket.send(
      JSON.stringify({
        type: "start_turn",
        content,
        capability: capability || null,
        session_id: sessionId,
        knowledge_bases: kbName.trim() ? [kbName.trim()] : [],
        tools: Array.from(selectedTools),
        config,
        ...spaceReferences,
        attachments: sentAttachments.map((attachment) => ({
          type: attachment.type,
          filename: attachment.filename,
          base64: attachment.base64,
          mime_type: attachment.mime_type,
        })),
      }),
    );
  };

  const cancelStreaming = () => {
    const socket = socketRef.current;
    const turnId = activeTurnIdRef.current;
    if (socket && socket.readyState === WebSocket.OPEN && turnId) {
      socket.send(JSON.stringify({ type: "cancel_turn", turn_id: turnId }));
    }
    activeAssistantIdRef.current = null;
    activeTurnIdRef.current = null;
    thinkingRef.current = [];
    setThinking([]);
    setStreaming(false);
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) void sendMessage();
    }
  };

  const hasMessages = messages.length > 0 || thinking.length > 0;

  const handleNewChat = () => {
    attachments.forEach((attachment) => {
      if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    });
    setMessages([]);
    setThinking([]);
    setInput("");
    setAttachments([]);
    setSessionId(makeClientId("learn-session"));
    activeAssistantIdRef.current = null;
    activeTurnIdRef.current = null;
    thinkingRef.current = [];
  };

  const handleDownloadMarkdown = () => {
    if (!messages.length) return;
    const markdown = messages
      .map((message) => {
        const speaker =
          message.role === "user" ? "User" : message.role === "assistant" ? "Assistant" : "System";
        return `## ${speaker}\n\n${message.content}`;
      })
      .join("\n\n");
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${sessionId}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-[calc(100vh-7.5rem)] min-h-[680px] flex-col overflow-hidden bg-[var(--background)]">
      <div className="mx-auto flex w-full max-w-[960px] items-center justify-between px-6 pb-0 pt-3">
        <span className="text-[15px] font-semibold text-[var(--foreground)]">
          {activeCapability.label}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!messages.length}
            className="rounded-lg border border-[var(--border)]/50 px-3 py-1.5 text-[12px] font-medium text-[var(--muted-foreground)] transition-colors hover:border-[var(--border)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save to Notebook
          </button>
          <button
            type="button"
            onClick={handleDownloadMarkdown}
            disabled={!messages.length}
            title="Download chat history as Markdown"
            className="rounded-lg border border-[var(--border)]/50 px-3 py-1.5 text-[12px] font-medium text-[var(--muted-foreground)] transition-colors hover:border-[var(--border)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Download Markdown
          </button>
          <button
            type="button"
            onClick={handleNewChat}
            className="rounded-lg border border-[var(--border)]/50 px-3 py-1.5 text-[12px] font-medium text-[var(--muted-foreground)] transition-colors hover:border-[var(--border)] hover:text-[var(--foreground)]"
          >
            New chat
          </button>
        </div>
      </div>
      <div className="mx-auto flex min-h-0 w-full max-w-[960px] flex-1 flex-col overflow-hidden px-6">
        {!hasMessages ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
            <div className="text-center">
              <h1 className="font-serif text-[36px] font-medium text-[var(--foreground)]">
                What would you like to learn?
              </h1>
              <p className="mt-4 text-[15px] text-[var(--muted-foreground)]">
                Ask anything - I'm here to help you understand.
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto min-h-0 w-full flex-1 space-y-7 overflow-y-auto pr-4 [scrollbar-gutter:stable]">
            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[75%] space-y-1.5">
                    <div className="flex justify-end pr-1">
                      <span className="text-[10px] tracking-wide text-[var(--muted-foreground)]">
                        {learningCapabilities.find((entry) => entry.value === message.capability)
                          ?.label ?? "Chat"}
                      </span>
                    </div>
                    {message.attachments?.length ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        {message.attachments.map((attachment) => (
                          <LearningAttachmentChip
                            key={attachment.id}
                            attachment={attachment}
                            compact
                          />
                        ))}
                      </div>
                    ) : null}
                    <div className="rounded-2xl bg-[var(--secondary)] px-4 py-2.5 text-[14px] leading-relaxed text-[var(--foreground)] shadow-sm">
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={message.id} className="group relative w-full">
                  {message.thinking?.length ? (
                    <div className="mb-2 border-l-2 border-[var(--border)] pl-2 text-xs text-[var(--muted-foreground)]">
                      {message.thinking.slice(-4).map((entry, entryIndex) => (
                        <p key={`${message.id}-thinking-${entryIndex}`}>{entry}</p>
                      ))}
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      "prose prose-sm max-w-none whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--foreground)]",
                      message.role === "system" && "text-amber-700",
                    )}
                  >
                    {message.content}
                  </div>
                  <div className="mt-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard?.writeText(message.content)}
                      className="inline-flex items-center gap-1 px-0.5 py-0.5 text-[11px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                    >
                      <Copy className="size-3" />
                      Copy
                    </button>
                  </div>
                </div>
              ),
            )}
            {thinking.length ? (
              <div className="text-xs text-[var(--muted-foreground)]">
                {thinking.map((entry, index) => (
                  <p key={`learning-thinking-${index}`}>{entry}</p>
                ))}
              </div>
            ) : null}
            <div ref={bottomRef} className="h-px w-full shrink-0" />
          </div>
        )}

        <div className={cn("relative z-20 mx-auto w-full shrink-0 pb-5", hasMessages && "pt-1")}>
          {hasMessages ? (
            <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-transparent to-[var(--background)]/72" />
          ) : null}
          <div
        className={cn(
          "relative rounded-2xl border bg-[var(--card)] shadow-[0_1px_8px_rgba(0,0,0,0.03)] transition-colors",
          dragging
            ? "border-[var(--primary)] bg-[var(--primary)]/[0.03]"
            : "border-[var(--border)]",
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {dragging ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-[var(--primary)]/50 bg-[var(--primary)]/[0.04]">
            <div className="flex flex-col items-center gap-1 text-[var(--primary)]">
              <Paperclip size={22} strokeWidth={1.6} />
              <span className="text-[13px] font-medium">Drop files here</span>
              <span className="text-[11px] text-[var(--primary)]/70">
                Images, Office docs, code & text
              </span>
            </div>
          </div>
        ) : null}
        {spaceSelectionCount > 0 ? (
          <div className="flex flex-wrap gap-2 px-4 pt-3.5">
            {selectedHistorySessions.map((session) => (
              <SpaceContextChip
                key={`history-${session.id}`}
                icon={MessageSquare}
                label={session.title}
                onRemove={() =>
                  setSelectedHistorySessions((items) =>
                    items.filter((item) => item.id !== session.id),
                  )
                }
              />
            ))}
            {selectedBooks.map((book) => (
              <SpaceContextChip
                key={`book-${book.id}`}
                icon={BookOpen}
                label={`${book.title} · ${book.pages.length} chapters`}
                onRemove={() =>
                  setSelectedBooks((items) => items.filter((item) => item.id !== book.id))
                }
              />
            ))}
            {selectedNotebooks.map((notebook) => (
              <SpaceContextChip
                key={`notebook-${notebook.id}`}
                icon={FileText}
                label={`${notebook.title} · ${notebook.records.length} records`}
                onRemove={() =>
                  setSelectedNotebooks((items) =>
                    items.filter((item) => item.id !== notebook.id),
                  )
                }
              />
            ))}
            {selectedQuestions.map((question) => (
              <SpaceContextChip
                key={`question-${question.id}`}
                icon={GraduationCap}
                label={question.title}
                onRemove={() =>
                  setSelectedQuestions((items) =>
                    items.filter((item) => item.id !== question.id),
                  )
                }
              />
            ))}
            {skillsAutoMode ? (
              <SpaceContextChip
                icon={Sparkles}
                label="Skills Auto"
                onRemove={() => setSkillsAutoMode(false)}
              />
            ) : null}
            {selectedSkills.map((skill) => (
              <SpaceContextChip
                key={`skill-${skill}`}
                icon={Star}
                label={skill}
                onRemove={() =>
                  setSelectedSkills((items) => items.filter((item) => item !== skill))
                }
              />
            ))}
            {selectedMemoryFiles.map((file) => (
              <SpaceContextChip
                key={`memory-${file}`}
                icon={Brain}
                label={file === "summary" ? "Memory · Summary" : "Memory · Profile"}
                onRemove={() =>
                  setSelectedMemoryFiles((items) => items.filter((item) => item !== file))
                }
              />
            ))}
          </div>
        ) : null}
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleComposerKeyDown}
          placeholder={
            capability === "math_animator"
              ? "Describe the math animation or storyboard you want..."
              : capability === "visualize"
                ? "Describe the chart or diagram you want to visualize..."
                : "How can I help you today?"
          }
          rows={1}
          className="w-full resize-none overflow-hidden bg-transparent px-4 pb-2 pt-3.5 text-[15px] leading-relaxed text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
          style={{ minHeight: 48 }}
        />
        {attachments.length ? (
          <div className="flex flex-wrap gap-2 px-4 pb-3">
            {attachments.map((attachment) => (
              <LearningAttachmentChip
                key={attachment.id}
                attachment={attachment}
                onRemove={() => removeAttachment(attachment.id)}
              />
            ))}
          </div>
        ) : null}
        {attachmentError ? (
          <div className="px-4 pb-2 text-xs text-red-600">{attachmentError}</div>
        ) : null}
        <div className="border-t border-[var(--border)]/35 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setCapabilityMenuOpen((open) => !open)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 px-1 py-1.5 text-[12px] transition-colors",
                  capabilityMenuOpen
                    ? "text-[var(--foreground)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                )}
              >
                <ActiveCapabilityIcon size={14} strokeWidth={1.6} />
                <span className="font-medium">{activeCapability.label}</span>
                <ChevronDown
                  size={11}
                  className={cn("transition-transform", capabilityMenuOpen && "rotate-180")}
                />
              </button>
              {capabilityMenuOpen ? (
                <div className="absolute bottom-full left-0 z-50 mb-1.5 w-[280px] rounded-xl border border-[var(--border)] bg-[var(--popover)] py-1.5 shadow-lg backdrop-blur-md">
                  {learningCapabilities.map((entry) => {
                    const Icon = entry.icon;
                    const selected = capability === entry.value;
                    return (
                      <button
                        key={entry.value}
                        type="button"
                        onClick={() => selectCapability(entry.value)}
                        className={cn(
                          "flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors",
                          selected ? "bg-[var(--muted)]" : "hover:bg-[var(--muted)]/50",
                        )}
                      >
                        <Icon
                          size={16}
                          strokeWidth={1.6}
                          className={cn(
                            "shrink-0",
                            selected
                              ? "text-[var(--primary)]"
                              : "text-[var(--muted-foreground)]",
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium text-[var(--foreground)]">
                            {entry.label}
                          </div>
                          <div className="truncate text-[11px] text-[var(--muted-foreground)]">
                            {entry.description}
                          </div>
                        </div>
                        {selected ? (
                          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="h-3.5 w-px bg-[var(--border)]/30" />

            <div className="flex min-w-0 flex-1 items-center gap-1">
              {isResearchMode ? (
                <div className="relative flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setToolMenuOpen((open) => !open)}
                    className="inline-flex shrink-0 items-center gap-1 px-1.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                  >
                    <Layers size={12} strokeWidth={1.7} />
                    Sources
                    <ChevronDown
                      size={10}
                      className={cn("transition-transform", toolMenuOpen && "rotate-180")}
                    />
                  </button>
                  {selectedResearchSources.size > 0 ? (
                    <div className="flex items-center gap-[3px] overflow-hidden">
                      {learningResearchSources
                        .filter((source) => selectedResearchSources.has(source.name))
                        .map((source, index) => (
                          <span
                            key={source.name}
                            className="shrink-0 text-[10px] text-[var(--muted-foreground)]/35"
                          >
                            {index > 0 ? (
                              <span className="text-[12px] leading-none">·</span>
                            ) : null}
                            {source.label}
                          </span>
                        ))}
                    </div>
                  ) : null}
                  {toolMenuOpen ? (
                    <div className="absolute bottom-full left-0 z-50 mb-1.5 min-w-[180px] rounded-lg border border-[var(--border)] bg-[var(--popover)] py-1 shadow-lg backdrop-blur-md">
                      {learningResearchSources.map((source) => {
                        const active = selectedResearchSources.has(source.name);
                        const Icon = source.icon;
                        return (
                          <button
                            key={source.name}
                            type="button"
                            onClick={() => toggleResearchSource(source.name)}
                            className={cn(
                              "flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[12px] transition-colors hover:bg-[var(--muted)]/40",
                              active
                                ? "text-[var(--primary)]"
                                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                            )}
                          >
                            <Icon size={13} strokeWidth={1.7} />
                            <span className="flex-1 font-medium">{source.label}</span>
                            {active ? (
                              <div className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : visibleTools.length > 0 ? (
                <div className="relative flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setToolMenuOpen((open) => !open)}
                    className="inline-flex shrink-0 items-center gap-1 px-1.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                  >
                    <Sparkles size={12} strokeWidth={1.7} />
                    Tools
                    <ChevronDown
                      size={10}
                      className={cn("transition-transform", toolMenuOpen && "rotate-180")}
                    />
                  </button>
                  {selectedTools.size > 0 ? (
                    <div className="flex items-center gap-[3px] overflow-hidden">
                      {visibleTools
                        .filter((tool) => selectedTools.has(tool.name))
                        .map((tool, index) => (
                          <span
                            key={tool.name}
                            className="shrink-0 text-[10px] text-[var(--muted-foreground)]/35"
                          >
                            {index > 0 ? (
                              <span className="text-[12px] leading-none">·</span>
                            ) : null}
                            {tool.label}
                          </span>
                        ))}
                    </div>
                  ) : null}
                  {toolMenuOpen ? (
                    <div className="absolute bottom-full left-0 z-50 mb-1.5 min-w-[180px] rounded-lg border border-[var(--border)] bg-[var(--popover)] py-1 shadow-lg backdrop-blur-md">
                      {visibleTools.map((tool) => {
                        const active = selectedTools.has(tool.name);
                        const Icon = tool.icon;
                        return (
                          <button
                            key={tool.name}
                            type="button"
                            onClick={() => toggleTool(tool.name)}
                            className={cn(
                              "flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[12px] transition-colors hover:bg-[var(--muted)]/40",
                              active
                                ? "text-[var(--primary)]"
                                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                            )}
                          >
                            <Icon size={13} strokeWidth={1.7} />
                            <span className="flex-1 font-medium">{tool.label}</span>
                            {active ? (
                              <div className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach files"
                aria-label="Attach files"
                className="inline-flex shrink-0 items-center gap-1 px-1.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              >
                <Paperclip size={12} strokeWidth={1.7} />
                Attach
              </button>

              <div className="relative flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setSpaceMenuOpen((open) => !open)}
                  className="inline-flex shrink-0 items-center gap-1 px-1.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                >
                  <AtSign size={12} strokeWidth={1.7} />
                  Space
                  <ChevronDown
                    size={10}
                    className={cn("transition-transform", spaceMenuOpen && "rotate-180")}
                  />
                </button>
                {spaceSelectionCount > 0 ? (
                  <span className="shrink-0 rounded-full bg-[var(--primary)]/10 px-1.5 py-px text-[9px] font-semibold text-[var(--primary)]">
                    {spaceSelectionCount}
                  </span>
                ) : null}
                {spaceMenuOpen ? (
                  <div className="absolute bottom-full left-0 z-50 mb-1.5 w-[260px] rounded-xl border border-[var(--border)] bg-[var(--popover)] py-1.5 shadow-lg backdrop-blur-md">
                    {[
                      { key: "chat_history", label: "Chat history", icon: MessageSquare },
                      { key: "books", label: "Books", icon: BookOpen },
                      { key: "notebooks", label: "Notebooks", icon: FileText },
                      {
                        key: "question_bank",
                        label: "Question Bank",
                        icon: GraduationCap,
                      },
                      { key: "skills", label: "Skills", icon: Star },
                      { key: "memory", label: "Memory", icon: Brain },
                    ].map((entry) => {
                      const Icon = entry.icon;
                      const count =
                        entry.key === "books"
                          ? spaceSelectionCounts.books
                          : entry.key === "chat_history"
                            ? spaceSelectionCounts.chatHistory
                          : entry.key === "notebooks"
                            ? spaceSelectionCounts.notebooks
                            : entry.key === "question_bank"
                              ? spaceSelectionCounts.questionBank
                              : entry.key === "skills"
                                ? spaceSelectionCounts.skills
                                : entry.key === "memory"
                                  ? spaceSelectionCounts.memory
                                  : 0;
                      return (
                        <button
                          key={entry.key}
                          type="button"
                          onClick={() => {
                            setSpaceMenuOpen(false);
                            setSpacePickerOpen(entry.key as LearningSpacePickerKey);
                          }}
                          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[12px] transition-colors hover:bg-[var(--muted)]/40"
                        >
                          <Icon
                            size={13}
                            strokeWidth={1.7}
                            className="shrink-0 text-[var(--muted-foreground)]"
                          />
                          <span className="flex-1 font-medium text-[var(--foreground)]">
                            {entry.label}
                          </span>
                          {count > 0 ? (
                            <span className="rounded-full bg-[var(--primary)]/10 px-1.5 py-px text-[9px] font-semibold text-[var(--primary)]">
                              {count}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <select
                value={kbName}
                onChange={(event) => setKbName(event.target.value)}
                disabled={!ragActive}
                title={ragActive ? "Select Knowledge Base" : "Enable Knowledge Base source first"}
                className={cn(
                  "h-[28px] appearance-none rounded-full border bg-transparent py-0 pl-2.5 pr-5 text-[11px] outline-none transition-colors",
                  ragActive
                    ? "cursor-pointer border-[var(--border)]/40 text-[var(--muted-foreground)] hover:border-[var(--border)] hover:text-[var(--foreground)]"
                    : "cursor-not-allowed border-transparent text-[var(--border)]",
                )}
                style={{
                  backgroundImage: ragActive
                    ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")"
                    : "none",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 6px center",
                }}
              >
                <option value="">{ragActive ? "No KB" : "-"}</option>
                {knowledgeBaseNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              {streaming ? (
                <button
                  type="button"
                  onClick={cancelStreaming}
                  title="Stop generating"
                  aria-label="Stop generating"
                  className="group relative inline-flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-[0_4px_12px_rgba(195,90,44,0.18)] transition-[background-color,box-shadow] hover:bg-[var(--primary)]/90 hover:shadow-[0_6px_16px_rgba(195,90,44,0.28)]"
                >
                  <span className="pointer-events-none absolute inset-0 animate-spin rounded-full border-[1.5px] border-white/30 border-t-white/85 opacity-90 transition-opacity group-hover:opacity-40" />
                  <Square size={9} strokeWidth={2.6} className="relative z-10 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={!canSend}
                  aria-label="Send"
                  className="rounded-full bg-[var(--primary)] p-[7px] text-white shadow-[0_4px_12px_rgba(195,90,44,0.15)] transition-[transform,opacity,box-shadow] hover:shadow-[0_6px_16px_rgba(195,90,44,0.22)] disabled:opacity-25 disabled:shadow-none"
                >
                  <ArrowUp size={15} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={LEARNING_ATTACHMENT_ACCEPT}
            className="hidden"
            onChange={handleFileInput}
          />
          {(isQuizMode || isMathAnimatorMode || isVisualizeMode || isResearchMode) ? (
            <div className="border-t border-[var(--border)]/15">
              {isQuizMode ? (
                <QuizConfigPanel
                  value={quizConfig}
                  onChange={setQuizConfig}
                  uploadedPdf={quizPdf}
                  onUploadPdf={setQuizPdf}
                  collapsed={panelCollapsed}
                  onToggleCollapsed={() => setPanelCollapsed((collapsed) => !collapsed)}
                />
              ) : isMathAnimatorMode ? (
                <MathAnimatorConfigPanel
                  value={mathAnimatorConfig}
                  onChange={setMathAnimatorConfig}
                  collapsed={panelCollapsed}
                  onToggleCollapsed={() => setPanelCollapsed((collapsed) => !collapsed)}
                />
              ) : isVisualizeMode ? (
                <VisualizeConfigPanel
                  value={visualizeConfig}
                  onChange={setVisualizeConfig}
                  collapsed={panelCollapsed}
                  onToggleCollapsed={() => setPanelCollapsed((collapsed) => !collapsed)}
                />
              ) : (
                <ResearchConfigPanel
                  value={{ ...researchConfig, sources: Array.from(selectedResearchSources) }}
                  onChange={(next) => {
                    setResearchConfig(next);
                    setSelectedResearchSources(new Set(next.sources));
                  }}
                  collapsed={panelCollapsed}
                  onToggleCollapsed={() => setPanelCollapsed((collapsed) => !collapsed)}
                />
              )}
            </div>
          ) : null}
        </div>
      </div>
        </div>
      </div>
      <LearningSpacePickerModal
        open={spacePickerOpen}
        onClose={() => setSpacePickerOpen(null)}
        sessionItems={sessionItems}
        bookItems={bookItems}
        notebookItems={notebookItems}
        questionItems={questionItems}
        skillItems={skillItems}
        selectedHistorySessions={selectedHistorySessions}
        selectedBooks={selectedBooks}
        selectedNotebooks={selectedNotebooks}
        selectedQuestions={selectedQuestions}
        selectedSkills={selectedSkills}
        skillsAutoMode={skillsAutoMode}
        selectedMemoryFiles={selectedMemoryFiles}
        onChangeHistorySessions={setSelectedHistorySessions}
        onChangeBooks={setSelectedBooks}
        onChangeNotebooks={setSelectedNotebooks}
        onChangeQuestions={setSelectedQuestions}
        onChangeSkills={setSelectedSkills}
        onChangeSkillsAuto={setSkillsAutoMode}
        onChangeMemory={setSelectedMemoryFiles}
      />
    </div>
  );
}

function LearningSpacePanel({
  notebookName,
  setNotebookName,
  createNotebook,
  sessionItems,
  notebookItems,
  questionItems,
  skillItems,
  memory,
  saveMemory,
  onOpenNotebook,
  onOpenQuestion,
}: {
  notebookName: string;
  setNotebookName: (value: string) => void;
  createNotebook: UseMutationResult<unknown, Error, string, unknown>;
  sessionItems: Item[];
  notebookItems: Item[];
  questionItems: Item[];
  skillItems: Item[];
  memory: unknown;
  saveMemory: UseMutationResult<
    unknown,
    Error,
    { file: "summary" | "profile"; content: string },
    unknown
  >;
  onOpenNotebook: (item: Item) => void;
  onOpenQuestion: (item: Item) => void;
}) {
  const memoryRecord = asRecord(memory);
  const [activeSection, setActiveSection] = useState<
    "chat_history" | "notebooks" | "question_bank" | "skills" | "memory"
  >("notebooks");
  const [summaryDraft, setSummaryDraft] = useState("");
  const [profileDraft, setProfileDraft] = useState("");
  const spaceItems = [
    {
      key: "chat_history" as const,
      label: "Chat History",
      description: "Review and reopen previous conversations.",
      icon: History,
      count: sessionItems.length,
    },
    {
      key: "notebooks" as const,
      label: "Notebooks",
      description: "Organize saved outputs from chat, research, Co-Writer, and more.",
      icon: NotebookPen,
      count: notebookItems.length,
    },
    {
      key: "question_bank" as const,
      label: "Question Bank",
      description: "Review and organize quiz questions across sessions.",
      icon: ClipboardList,
      count: questionItems.length,
    },
    {
      key: "skills" as const,
      label: "Skills",
      description: "Behavior playbooks that guide chat responses.",
      icon: Wand2,
      count: skillItems.length,
    },
    {
      key: "memory" as const,
      label: "Memory",
      description: "Long-form memory the assistant carries across sessions.",
      icon: Brain,
      count: 2,
    },
  ];

  useEffect(() => {
    setSummaryDraft(textOf(memoryRecord.summary));
    setProfileDraft(textOf(memoryRecord.profile));
  }, [memoryRecord.summary, memoryRecord.profile]);

  return (
    <div className="flex h-full min-h-0 bg-zaki-base">
      <aside className="flex h-full w-[224px] shrink-0 flex-col border-r border-zaki-border bg-zaki-raised">
        <div className="flex items-center gap-2.5 border-b border-zaki-border px-4 py-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-zaki-lg border border-zaki-border bg-zaki-base text-zaki-text">
            <Layers className="size-3.5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold leading-tight tracking-tight text-zaki-text">
              Space
            </h1>
            <p className="mt-0.5 line-clamp-1 text-[10.5px] leading-snug text-zaki-muted">
              Your personal learning library.
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-2 py-3">
          {spaceItems.map(({ key, label, description, icon: Icon, count }) => {
            const active = activeSection === key;
            return (
              <button
                key={key}
                type="button"
                title={description}
                onClick={() => setActiveSection(key)}
                className={cn(
                  "group flex h-12 w-full items-center gap-2.5 rounded-zaki-lg px-2.5 text-left transition-colors",
                  active
                    ? "bg-zaki-hover text-zaki-text"
                    : "text-zaki-muted hover:bg-zaki-hover/70 hover:text-zaki-text",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-zaki-lg border transition-colors",
                    active
                      ? "border-zaki-border bg-zaki-base text-zaki-text shadow-sm"
                      : "border-zaki-border bg-zaki-base/60 text-zaki-muted group-hover:text-zaki-text",
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-tight tracking-tight">
                  {label}
                </span>
                <span className="rounded-full bg-zaki-base px-1.5 py-0.5 text-[10px] text-zaki-muted">
                  {count}
                </span>
                {active ? (
                  <span className="h-4 w-0.5 shrink-0 rounded-full bg-zaki-brand" />
                ) : null}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto px-6 py-6">
        {activeSection === "chat_history" ? (
          <SpaceContentBlock
            icon={History}
            title="Chat History"
            description="Browse and reopen previous conversations from your learning space."
            count={`${sessionItems.length} conversations`}
          >
            <ItemList
              items={sessionItems}
              empty="No conversations yet."
              variant="generic"
            />
          </SpaceContentBlock>
        ) : activeSection === "notebooks" ? (
          <SpaceContentBlock
            icon={NotebookPen}
            title="Notebooks"
            description="Save and organize outputs from chat, research, and Co-Writer sessions into a personal library."
            count={`${notebookItems.length} notebooks`}
          >
            <NotebooksPanel
              notebookName={notebookName}
              setNotebookName={setNotebookName}
              createNotebook={createNotebook}
              items={notebookItems}
              onOpen={onOpenNotebook}
            />
          </SpaceContentBlock>
        ) : activeSection === "question_bank" ? (
          <SpaceContentBlock
            icon={ClipboardList}
            title="Question Bank"
            description="Review and organize quiz questions across sessions."
            count={`${questionItems.length} questions`}
          >
            <ReviewPanel items={questionItems} onOpen={onOpenQuestion} />
          </SpaceContentBlock>
        ) : activeSection === "skills" ? (
          <SpaceContentBlock
            icon={Wand2}
            title="Skills"
            description="Behavior playbooks that guide chat responses."
            count={`${skillItems.length} skills`}
          >
            <ItemList
              items={skillItems}
              empty="No learning skills returned yet."
              variant="generic"
            />
          </SpaceContentBlock>
        ) : (
          <SpaceContentBlock
            icon={Brain}
            title="Memory"
            description="Long-form memory the assistant carries across sessions."
            count="2 files"
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-normal text-zaki-muted">
                  Summary
                </label>
                <textarea
                  value={summaryDraft}
                  onChange={(event) => setSummaryDraft(event.target.value)}
                  className="min-h-44 w-full resize-y rounded-zaki-md border border-zaki-border bg-zaki-base p-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
                  placeholder="Learning summary memory"
                />
                <button
                  type="button"
                  disabled={saveMemory.isPending}
                  onClick={() => saveMemory.mutate({ file: "summary", content: summaryDraft })}
                  className="mt-2 inline-flex h-9 items-center justify-center rounded-zaki-md bg-zaki-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Save summary
                </button>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-normal text-zaki-muted">
                  Profile
                </label>
                <textarea
                  value={profileDraft}
                  onChange={(event) => setProfileDraft(event.target.value)}
                  className="min-h-44 w-full resize-y rounded-zaki-md border border-zaki-border bg-zaki-base p-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
                  placeholder="Learning profile memory"
                />
                <button
                  type="button"
                  disabled={saveMemory.isPending}
                  onClick={() => saveMemory.mutate({ file: "profile", content: profileDraft })}
                  className="mt-2 inline-flex h-9 items-center justify-center rounded-zaki-md bg-zaki-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Save profile
                </button>
              </div>
            </div>
          </SpaceContentBlock>
        )}
      </main>
    </div>
  );
}

function SpaceContentBlock({
  icon: Icon,
  title,
  description,
  count,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  count: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-zaki-border pb-5 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-3.5">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-zaki-lg border border-zaki-border bg-zaki-raised text-zaki-text shadow-sm">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[19px] font-semibold leading-tight tracking-tight text-zaki-text">
                {title}
              </h1>
              <span className="rounded-full border border-zaki-border bg-zaki-raised px-2 py-0.5 text-[10.5px] font-medium text-zaki-muted">
                {count}
              </span>
            </div>
            <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-zaki-muted">
              {description}
            </p>
          </div>
        </div>
      </header>
      {children}
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
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [section, setSection] = useState<"files" | "add" | "settings">("files");
  const readyBytes = files.reduce((sum, file) => sum + file.size, 0);
  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => itemTitle(item, "source").toLowerCase().includes(normalized));
  }, [items, query]);
  const selectedItem = useMemo(() => {
    if (selectedName) {
      const matched = items.find((item) => itemId(item) === selectedName);
      if (matched) return matched;
    }
    return items[0] ?? null;
  }, [items, selectedName]);
  const effectiveName = selectedItem ? itemId(selectedItem) : selectedName;
  const selectedFiles = useQuery({
    queryKey: ["learning", "knowledge", effectiveName, "files"],
    queryFn: () => listLearningKnowledgeFiles(effectiveName || ""),
    enabled: Boolean(effectiveName && section === "files"),
  });
  const sourceFileItems = itemList(selectedFiles.data, ["files", "items", "documents"]);

  useEffect(() => {
    if (!selectedName && items[0]) {
      setSelectedName(itemId(items[0]));
    }
  }, [items, selectedName]);

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
    <div className="flex h-full min-h-0 bg-zaki-base">
      <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-zaki-border bg-zaki-raised">
        <div className="space-y-2.5 px-3 pb-2 pt-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-semibold text-zaki-text">Knowledge Bases</h2>
              <span className="rounded-full bg-zaki-hover px-1.5 py-0.5 text-[10px] text-zaki-muted">
                {items.length}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSection("add");
              setSelectedName(null);
            }}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-zaki-lg bg-zaki-brand px-3 py-1.5 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90"
          >
            <Plus className="size-3.5" />
            New knowledge base
          </button>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zaki-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search knowledge bases..."
              className="w-full rounded-zaki-lg border border-zaki-border bg-zaki-base py-1.5 pl-8 pr-3 text-[12px] text-zaki-text outline-none transition-colors placeholder:text-zaki-muted focus:border-zaki-strong"
            />
          </div>
        </div>

        <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
          {filteredItems.map((item, index) => {
            const name = itemId(item, `source-${index + 1}`);
            const selected = effectiveName === name;
            const status = itemStatus(item);
            const isDefault = Boolean(item.is_default) || name === "main";
            return (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setSelectedName(name);
                  setKbName(name);
                  setSection("files");
                }}
                className={cn(
                  "group relative flex w-full items-start gap-2.5 rounded-zaki-lg px-2.5 py-2 text-left transition-colors",
                  selected
                    ? "bg-zaki-hover text-zaki-text"
                    : "text-zaki-muted hover:bg-zaki-hover/70 hover:text-zaki-text",
                )}
              >
                {selected ? (
                  <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-zaki-brand" />
                ) : null}
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-zaki-md border border-zaki-border bg-zaki-base">
                  {isDefault ? (
                    <Star className="size-3.5 text-amber-500" fill="currentColor" />
                  ) : (
                    <Database className="size-3.5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{name}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-zaki-muted">
                    <span className={cn("size-1.5 rounded-full", statusTone(status))} />
                    {status}
                    {displayCount(item) ? ` · ${displayCount(item)} files` : ""}
                  </span>
                </span>
              </button>
            );
          })}
          {!filteredItems.length ? (
            <div className="rounded-zaki-lg border border-dashed border-zaki-border px-4 py-8 text-center">
              <Database className="mx-auto mb-2 size-5 text-zaki-muted" />
              <div className="text-[12.5px] font-medium text-zaki-text">
                {items.length ? "No matches" : "No knowledge bases yet"}
              </div>
              {!items.length ? (
                <p className="mt-1 text-[11px] leading-relaxed text-zaki-muted">
                  Create one to get started.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </aside>

      <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-zaki-base">
        <div className="border-b border-zaki-border bg-zaki-raised px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[18px] font-semibold tracking-tight text-zaki-text">
                  {effectiveName || "No knowledge base selected"}
                </h1>
                {effectiveName === "main" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    <Star className="size-3" fill="currentColor" />
                    Default
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[12px] text-zaki-muted">
                {effectiveName
                  ? "Files, uploads, and library settings."
                  : "Pick a knowledge base from the list, or create a new one to get started."}
              </p>
            </div>
            {selectedItem ? (
              <button
                type="button"
                onClick={() => onOpen(selectedItem)}
                className="rounded-zaki-md border border-zaki-border px-2.5 py-1.5 text-xs font-medium text-zaki-text hover:bg-zaki-hover"
              >
                Details
              </button>
            ) : null}
          </div>

          <nav className="-mb-3 mt-3 flex gap-1 overflow-x-auto">
            {[
              { key: "files" as const, label: "Files", Icon: FileText },
              { key: "add" as const, label: "Add documents", Icon: Upload },
              { key: "settings" as const, label: "Settings", Icon: Settings },
            ].map(({ key, label, Icon }) => {
              const active = section === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSection(key)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-t-zaki-md border-b-2 px-3 py-2 text-[12.5px] font-medium transition-colors",
                    active
                      ? "border-zaki-brand text-zaki-text"
                      : "border-transparent text-zaki-muted hover:text-zaki-text",
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {section === "files" ? (
            selectedFiles.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-20 text-sm text-zaki-muted">
                <Loader2 className="size-4 animate-spin" />
                Loading files...
              </div>
            ) : sourceFileItems.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {sourceFileItems.map((item, index) => (
                  <LearningItemCard
                    key={`${itemTitle(item, "file")}-${index}`}
                    item={item}
                    fallback={`File ${index + 1}`}
                    icon={FileText}
                  />
                ))}
              </div>
            ) : (
              <EmptyLine label={effectiveName ? "No files yet. Add one using the Add documents tab." : "No knowledge base selected."} />
            )
          ) : section === "add" ? (
            <div className="mx-auto max-w-3xl">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <input
                  value={kbName}
                  onChange={(event) => setKbName(event.target.value)}
                  placeholder="Knowledge base name"
                  className="h-10 min-w-0 flex-1 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
                />
                <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-zaki-md border border-zaki-border px-4 text-sm font-semibold text-zaki-text hover:bg-zaki-hover">
                  <Upload className="size-4" />
                  Pick files
                  <input
                    type="file"
                    multiple
                    accept={LEARNING_ATTACHMENT_ACCEPT}
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
                  {files.length ? `${files.length} files ready` : "Choose files..."}
                </div>
                <div className="mt-1 text-xs text-zaki-muted">
                  {files.length
                    ? formatLearningBytes(readyBytes)
                    : "Click to browse supported documents, or drop files here."}
                </div>
              </button>

              {files.length ? (
                <div className="rounded-zaki-lg border border-zaki-border bg-zaki-raised p-3">
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
                        className="flex items-center gap-2 rounded-zaki-md border border-zaki-border bg-zaki-base px-2 py-2 text-xs text-zaki-secondary"
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
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {selectedItem ? (
                <DetailBlock
                  title="Knowledge base settings"
                  rows={[
                    ["Name", itemTitle(selectedItem, "Knowledge base")],
                    ["Status", itemStatus(selectedItem)],
                    ["Files", displayCount(selectedItem) || "0"],
                    ["Default", String(Boolean(selectedItem.is_default) || effectiveName === "main")],
                  ]}
                />
              ) : (
                <EmptyLine label="No knowledge base selected." />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
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
  createDocument,
  deleteDocument,
  items,
  onOpen,
}: {
  documentTitle: string;
  setDocumentTitle: (value: string) => void;
  createDocument: UseMutationResult<unknown, Error, CoWriterCreateDraft, unknown>;
  deleteDocument: UseMutationResult<unknown, Error, string, unknown>;
  items: Item[];
  onOpen: (item: Item) => void;
}) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const createDraft = (content = "") => {
    const title = documentTitle.trim() || "Untitled draft";
    createDocument.mutate({ title, content });
  };

  return (
    <div className="flex h-full min-h-full flex-col overflow-hidden bg-zaki-base">
      <header className="flex shrink-0 items-center justify-between border-b border-zaki-border px-6 py-3">
        <div className="flex items-center gap-3">
          <PenLine className="size-[18px] text-zaki-muted" />
          <div>
            <div className="text-sm font-semibold text-zaki-text">Co-Writer</div>
            <div className="text-xs text-zaki-muted">Manage your markdown drafts and projects.</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={documentTitle}
            onChange={(event) => setDocumentTitle(event.target.value)}
            placeholder="Untitled draft"
            className="hidden h-8 w-44 rounded-zaki-md border border-zaki-border bg-zaki-raised px-2.5 text-xs text-zaki-text outline-none placeholder:text-zaki-muted focus:border-zaki-brand sm:block"
          />
          <button
            type="button"
            onClick={() => createDraft(CO_WRITER_SAMPLE_TEMPLATE)}
            disabled={createDocument.isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-zaki-md border border-zaki-border px-3 text-xs font-medium text-zaki-text transition-colors hover:bg-zaki-hover disabled:opacity-60"
          >
            <FileText className="size-3.5" />
            From template
          </button>
          <button
            type="button"
            onClick={() => createDraft()}
            disabled={createDocument.isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-zaki-md bg-zaki-brand px-3 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {createDocument.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            New draft
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-zaki-lg border border-dashed border-zaki-border bg-zaki-base px-8 py-16 text-center">
            <PenLine className="size-7 text-zaki-muted" />
            <div>
              <p className="text-base font-medium text-zaki-text">No drafts yet</p>
              <p className="mt-1 text-sm text-zaki-muted">Start a new markdown draft to begin writing.</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => createDraft()}
                disabled={createDocument.isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-zaki-md bg-zaki-brand px-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {createDocument.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                New draft
              </button>
              <button
                type="button"
                onClick={() => createDraft(CO_WRITER_SAMPLE_TEMPLATE)}
                disabled={createDocument.isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-zaki-md border border-zaki-border px-3 text-sm font-medium text-zaki-text transition-colors hover:bg-zaki-hover disabled:opacity-60"
              >
                <FileText className="size-4" />
                From template
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item, index) => {
              const id = itemId(item, `document-${index + 1}`);
              const isPendingDelete = pendingDeleteId === id;
              const isDeleting = deleteDocument.isPending && deleteDocument.variables === id;
              return (
                <div
                  key={id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpen(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onOpen(item);
                    }
                  }}
                  className="group relative flex h-44 cursor-pointer flex-col rounded-zaki-lg border border-zaki-border bg-zaki-raised p-4 text-left transition-colors hover:border-zaki-brand/40 hover:bg-zaki-hover hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zaki-brand"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <FileText className="mt-0.5 size-3.5 shrink-0 text-zaki-muted" />
                      <div className="min-w-0">
                        <div
                          className="truncate text-sm font-medium text-zaki-text"
                          title={itemTitle(item, "Untitled draft")}
                        >
                          {itemTitle(item, "Untitled draft")}
                        </div>
                        <div className="text-[10px] text-zaki-muted/80">
                          Updated {relativeTime(item.updated_at ?? item.created_at) || "unknown"}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!id || deleteDocument.isPending) return;
                        if (isPendingDelete) {
                          deleteDocument.mutate(id);
                        } else {
                          setPendingDeleteId(id);
                        }
                      }}
                      disabled={deleteDocument.isPending}
                      title={isPendingDelete ? "Click again to confirm" : "Delete draft"}
                      className={cn(
                        "shrink-0 rounded-zaki-md p-1 transition-colors disabled:opacity-50",
                        isPendingDelete
                          ? "bg-rose-500/15 text-rose-600"
                          : "text-zaki-muted/70 opacity-0 hover:bg-rose-500/10 hover:text-rose-600 group-hover:opacity-100",
                      )}
                    >
                      {isDeleting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="mt-3 line-clamp-4 flex-1 text-xs leading-relaxed text-zaki-muted">
                    {textOf(item.preview) || textOf(item.summary) || textOf(item.content) || "Empty draft"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
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
  destroyAgent,
  items,
  souls,
  channelsSchema,
  onOpen,
}: {
  agentId: string;
  setAgentId: (value: string) => void;
  agentName: string;
  setAgentName: (value: string) => void;
  agentPersona: string;
  setAgentPersona: (value: string) => void;
  createAgent: UseMutationResult<unknown, Error, void, unknown>;
  destroyAgent: UseMutationResult<unknown, Error, string, unknown>;
  items: Item[];
  souls: Item[];
  channelsSchema: unknown;
  onOpen: (item: Item) => void;
}) {
  const [activeTab, setActiveTab] = useState<"bots" | "profiles" | "channels" | "souls">("bots");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const channelEntries = Object.entries(asRecord(asRecord(channelsSchema).channels));
  const tabs = [
    { key: "bots" as const, label: "Bots", icon: Bot },
    { key: "profiles" as const, label: "Profiles", icon: FileText },
    { key: "channels" as const, label: "Channels", icon: Settings },
    { key: "souls" as const, label: "Soul Templates", icon: Heart },
  ];

  return (
    <div className="h-full overflow-y-auto bg-zaki-base">
      <div className="mx-auto max-w-[960px] px-6 py-8">
        <div className="mb-6">
          <h1 className="text-[24px] font-semibold tracking-tight text-zaki-text">
            TutorBot Agents
          </h1>
          <p className="mt-1 text-[13px] text-zaki-muted">
            Manage your in-process TutorBot instances.
          </p>
        </div>

        <div className="mb-6 flex items-center gap-1 border-b border-zaki-border pb-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-zaki-lg px-3 py-1.5 text-[13px] transition-colors",
                  active
                    ? "bg-zaki-hover font-medium text-zaki-text"
                    : "text-zaki-muted hover:text-zaki-text",
                )}
              >
                <Icon className="size-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "bots" ? (
          <div className="space-y-5">
            <section className="rounded-zaki-lg border border-zaki-border bg-zaki-raised p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Plus className="size-4 text-zaki-muted" />
                <h2 className="text-[13.5px] font-semibold text-zaki-text">Create bot</h2>
                <span className="ml-1 text-[11.5px] text-zaki-muted">
                  Persona and channel settings are user-managed; provider routing is operator-managed.
                </span>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <input
                  value={agentId}
                  onChange={(event) => setAgentId(event.target.value)}
                  placeholder="Bot id"
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
                className="mt-3 min-h-28 w-full resize-y rounded-zaki-md border border-zaki-border bg-zaki-base p-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
              />
              <button
                type="button"
                disabled={!agentId.trim() || createAgent.isPending}
                onClick={() => createAgent.mutate()}
                className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-zaki-md bg-zaki-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {createAgent.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Bot className="size-4" />
                )}
                Create bot
              </button>
            </section>

            {items.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((item, index) => {
                  const id = itemId(item, `agent-${index + 1}`);
                  const pendingDelete = pendingDeleteId === id;
                  const deleting = destroyAgent.isPending && destroyAgent.variables === id;
                  return (
                    <div
                      key={id}
                      className="group rounded-zaki-lg border border-zaki-border bg-zaki-raised p-4 transition-colors hover:border-zaki-brand/40 hover:bg-zaki-hover"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => onOpen(item)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <Bot className="size-4 shrink-0 text-zaki-muted" />
                            <span className="truncate text-sm font-semibold text-zaki-text">
                              {itemTitle(item, id)}
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-zaki-muted">
                            {textOf(item.description) || textOf(item.persona) || "No persona returned."}
                          </p>
                        </button>
                        <button
                          type="button"
                          disabled={destroyAgent.isPending}
                          title={pendingDelete ? "Click again to confirm" : "Delete bot"}
                          onClick={() => {
                            if (pendingDelete) {
                              destroyAgent.mutate(id);
                            } else {
                              setPendingDeleteId(id);
                            }
                          }}
                          className={cn(
                            "rounded-zaki-md p-1 transition-colors disabled:opacity-50",
                            pendingDelete
                              ? "bg-rose-500/15 text-rose-600"
                              : "text-zaki-muted opacity-0 hover:bg-rose-500/10 hover:text-rose-600 group-hover:opacity-100",
                          )}
                        >
                          {deleting ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </button>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-[11px] text-zaki-muted">
                        <span className={cn("size-1.5 rounded-full", statusTone(itemStatus(item)))} />
                        {itemStatus(item)}
                        {textOf(item.started_at) ? ` · started ${relativeTime(item.started_at)}` : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyLine label="No bots yet." />
            )}
          </div>
        ) : activeTab === "profiles" ? (
          <div className="space-y-3">
            {items.length ? (
              items.map((item, index) => (
                <button
                  key={itemId(item, `profile-${index + 1}`)}
                  type="button"
                  onClick={() => onOpen(item)}
                  className="flex w-full items-center justify-between gap-3 rounded-zaki-lg border border-zaki-border bg-zaki-raised px-4 py-3 text-left hover:bg-zaki-hover"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-zaki-text">
                      {itemTitle(item, `Profile ${index + 1}`)}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-zaki-muted">
                      {textOf(item.bot_id) || textOf(item.id)}
                    </span>
                  </span>
                  <FileText className="size-4 shrink-0 text-zaki-muted" />
                </button>
              ))
            ) : (
              <EmptyLine label="No profiles yet." />
            )}
          </div>
        ) : activeTab === "channels" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {channelEntries.length ? (
              channelEntries.map(([name, value]) => {
                const channel = asRecord(value);
                return (
                  <div key={name} className="rounded-zaki-lg border border-zaki-border bg-zaki-raised p-4">
                    <div className="flex items-center gap-2">
                      <Settings className="size-4 text-zaki-muted" />
                      <h2 className="text-sm font-semibold text-zaki-text">
                        {textOf(channel.display_name, name)}
                      </h2>
                    </div>
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-zaki-muted">
                      {textOf(asRecord(channel.json_schema).description) || "Channel configuration schema available."}
                    </p>
                  </div>
                );
              })
            ) : (
              <EmptyLine label="No channel schemas returned yet." />
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {souls.length ? (
              souls.map((item, index) => (
                <div
                  key={itemId(item, `soul-${index + 1}`)}
                  className="rounded-zaki-lg border border-zaki-border bg-zaki-raised p-4"
                >
                  <div className="flex items-center gap-2">
                    <Heart className="size-4 text-zaki-muted" />
                    <h2 className="truncate text-sm font-semibold text-zaki-text">
                      {itemTitle(item, `Soul template ${index + 1}`)}
                    </h2>
                  </div>
                  <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-zaki-muted">
                    {textOf(item.content) || textOf(item.description) || "No template content returned."}
                  </p>
                </div>
              ))
            ) : (
              <EmptyLine label="No soul templates returned yet." />
            )}
          </div>
        )}
      </div>
    </div>
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
    <div className="space-y-4">
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
      <TutorAgentChatPanel agentId={agentId} history={history} />
    </div>
  );
}

function normalizeTutorHistoryMessage(item: Item, index: number): TutorChatMessage | null {
  const roleRaw = textOf(item.role, "assistant").toLowerCase();
  const role = roleRaw === "user" ? "user" : roleRaw === "system" ? "system" : "assistant";
  const content =
    textOf(item.content) ||
    textOf(item.message) ||
    textOf(item.text) ||
    textOf(item.response);
  if (!content) return null;
  return {
    id: textOf(item.id, `history-${index}`),
    role,
    content,
  };
}

function TutorAgentChatPanel({ agentId, history }: { agentId: string; history: Item[] }) {
  const [messages, setMessages] = useState<TutorChatMessage[]>([]);
  const [thinking, setThinking] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [socketAuthReady, setSocketAuthReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const thinkingRef = useRef<string[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const historyKey = history
    .map((item, index) => textOf(item.id) || textOf(item.created_at) || String(index))
    .join("|");
  const initialMessages = useMemo(
    () =>
      history
        .map((item, index) => normalizeTutorHistoryMessage(item, index))
        .filter((item): item is TutorChatMessage => Boolean(item))
        .slice(-8),
    [historyKey],
  );

  useEffect(() => {
    setMessages(initialMessages);
    setThinking([]);
    thinkingRef.current = [];
    setInput("");
  }, [agentId, initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  useEffect(() => {
    let cancelled = false;
    setSocketAuthReady(false);
    void prepareLearningSocketAuth().finally(() => {
      if (!cancelled) setSocketAuthReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  useEffect(() => {
    if (!socketAuthReady) return undefined;
    const socket = openLearningSocket(
      `/api/learning/tutor-agents/${encodeURIComponent(agentId)}/ws`,
    );
    socketRef.current = socket;
    if (!socket) {
      setConnected(false);
      return undefined;
    }

    socket.onopen = () => setConnected(true);
    socket.onmessage = (event) => {
      let data: Item = {};
      try {
        data = JSON.parse(String(event.data)) as Item;
      } catch {
        data = { type: "content", content: String(event.data) };
      }
      const eventType = textOf(data.type, "content");
      const content = textOf(data.content) || textOf(data.message);

      if (eventType === "thinking") {
        if (content) {
          thinkingRef.current = [...thinkingRef.current, content];
          setThinking(thinkingRef.current);
        }
        return;
      }
      if (eventType === "content" || eventType === "proactive") {
        const thinkingSnapshot = thinkingRef.current;
        if (content) {
          setMessages((items) => [
            ...items,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content,
              thinking: thinkingSnapshot.length ? [...thinkingSnapshot] : undefined,
            },
          ]);
        }
        thinkingRef.current = [];
        setThinking([]);
        return;
      }
      if (eventType === "done") {
        setStreaming(false);
        thinkingRef.current = [];
        setThinking([]);
        return;
      }
      if (eventType === "error") {
        setMessages((items) => [
          ...items,
          {
            id: `error-${Date.now()}`,
            role: "system",
            content: content ? `Error: ${content}` : "Tutor stream returned an error.",
          },
        ]);
        thinkingRef.current = [];
        setThinking([]);
        setStreaming(false);
      }
    };
    socket.onerror = () => {
      setMessages((items) => [
        ...items,
        {
          id: `socket-error-${Date.now()}`,
          role: "system",
          content: "Tutor stream connection failed.",
        },
      ]);
      setStreaming(false);
    };
    socket.onclose = () => {
      setConnected(false);
      setStreaming(false);
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [agentId, socketAuthReady]);

  const sendMessage = () => {
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
    thinkingRef.current = [];
    setThinking([]);
    setStreaming(true);
    socket.send(JSON.stringify({ content, chat_id: "web" }));
  };

  return (
    <div className="rounded-zaki-lg border border-zaki-border bg-zaki-raised">
      <div className="flex items-center justify-between border-b border-zaki-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-zaki-text">Tutor chat</h3>
          <p className="text-xs text-zaki-muted">
            {connected ? "Connected" : "Connecting"} through the ZAKI learning gateway
          </p>
        </div>
        <span
          className={cn(
            "rounded-zaki-sm px-2 py-1 text-[11px] font-semibold",
            connected
              ? "bg-emerald-500/10 text-emerald-700"
              : "bg-amber-500/10 text-amber-700",
          )}
        >
          {streaming ? "Thinking" : connected ? "Live" : "Offline"}
        </span>
      </div>
      <div className="max-h-80 space-y-3 overflow-auto p-4">
        {messages.length || thinking.length ? (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "rounded-zaki-md border px-3 py-2 text-sm",
                  message.role === "user"
                    ? "ml-8 border-zaki-brand/30 bg-zaki-brand/10 text-zaki-text"
                    : message.role === "system"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "mr-8 border-zaki-border bg-zaki-base text-zaki-text",
                )}
              >
                {message.thinking?.length ? (
                  <div className="mb-2 border-l-2 border-zaki-border pl-2 text-xs text-zaki-muted">
                    {message.thinking.slice(-3).map((entry, index) => (
                      <p key={`${message.id}-thinking-${index}`}>{entry}</p>
                    ))}
                  </div>
                ) : null}
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
              </div>
            ))}
            {thinking.length ? (
              <div className="mr-8 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 py-2 text-xs text-zaki-muted">
                {thinking.slice(-3).map((entry, index) => (
                  <p key={`active-thinking-${index}`}>{entry}</p>
                ))}
              </div>
            ) : null}
            <div ref={bottomRef} />
          </>
        ) : (
          <EmptyLine label="Send a message to start this tutor conversation." />
        )}
      </div>
      <div className="flex gap-2 border-t border-zaki-border p-3">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Ask this tutor..."
          className="h-10 min-w-0 flex-1 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
        />
        <button
          type="button"
          disabled={!connected || !input.trim() || streaming}
          onClick={sendMessage}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-zaki-md bg-zaki-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Send className="size-4" />
          Send
        </button>
      </div>
    </div>
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
