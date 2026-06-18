import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import type { ChangeEvent, ClipboardEvent, DragEvent, KeyboardEvent, ReactNode, RefObject } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  AtSign,
  BarChart3,
  Bookmark,
  BookOpen,
  Bot,
  Bold,
  Brain,
  BrainCircuit,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clapperboard,
  ClipboardList,
  Clock3,
  Code2,
  Copy,
  Database,
  Download,
  Eraser,
  ExternalLink,
  FileSearch,
  FileText,
  FolderOpen,
  FolderUp,
  GraduationCap,
  Globe,
  Heading1,
  Heading2,
  Heart,
  History,
  Italic,
  Image,
  Layers,
  Lightbulb,
  List,
  ListOrdered,
  Loader2,
  MessageSquare,
  Microscope,
  NotebookPen,
  Paperclip,
  Pencil,
  PenLine,
  Play,
  Plus,
  Quote,
  Search,
  Send,
  Settings,
  Save,
  Square,
  Sparkles,
  Star,
  Target,
  Trash2,
  Upload,
  RefreshCw,
  User,
  Wand2,
  X,
  type LucideIcon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { buildApiUrl, type MeterWindowSnapshot, type ProductOperationalState } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useMeterStatus } from "@/queries";
import {
  formatUsagePercentLabel,
  getRoundedUsagePercent,
  getUsagePercent,
} from "@/lib/usageDisplay";
import { useProductRegistry } from "@/queries/useProducts";
import { useAuthStore } from "@/stores";
import {
  V2Badge,
  V2StatusStrip,
  V2UsageGauge,
} from "@/app/components/v2";
import { useLearningProtectedAsset } from "./learningProtectedAsset";
import {
  addLearningNotebookRecordManual,
  analyzeLearningVision,
  clearLearningMemory,
  completeLearningStudyTask,
  createLearningStudyTask,
  createLearningStudyPlan,
  createLearningBook,
  createLearningCoWriterDocument,
  createLearningKnowledge,
  createLearningNotebook,
  createLearningQuestionCategory,
  createLearningSkill,
  createLearningTutorAgent,
  createLearningTutorAgentSoul,
  deleteLearningTutorAgentSoul,
  deleteLearningNotebook,
  deleteLearningNotebookRecord,
  deleteLearningQuestionCategory,
  deleteLearningQuestionEntry,
  deleteLearningKnowledge,
  deleteLearningCoWriterDocument,
  deleteLearningSkill,
  getLearningBook,
  getLearningBookSpine,
  getLearningCoWriterDocument,
  getLearningNotebook,
  getLearningQuestionEntry,
  getLearningSession,
  getLearningSolveSession,
  getLearningTutorAgent,
  getLearningTutorAgentActiveTurns,
  getLearningTutorAgentChannelsSchema,
  getLearningTutorAgentHistory,
  learningKeys,
  listLearningTutorAgentFiles,
  openLearningSocket,
  prepareLearningSocketAuth,
  reindexLearningKnowledge,
  listLearningKnowledgeFiles,
  listLearningBooks,
  listLearningCoWriterDocuments,
  listLearningKnowledge,
  listLearningDashboardRecent,
  listLearningSessions,
  listLearningNotebooks,
  listLearningQuestionCategories,
  listLearningQuestions,
  listLearningSkills,
  listLearningSolveSessions,
  listLearningTutorAgents,
  listLearningTutorAgentRecent,
  listLearningTutorAgentSouls,
  getLearningKnowledgeSupportedFileTypes,
  getLearningMemory,
  getLearningStudyState,
  getLearningSkill,
  destroyLearningTutorAgent,
  refreshLearningMemory,
  runLearningCoWriterAutoMark,
  runLearningCoWriterEdit,
  stopLearningTutorAgent,
  setDefaultLearningKnowledge,
  removeLearningQuestionEntryCategory,
  renameLearningQuestionCategory,
  updateLearningQuestionEntry,
  updateLearningSkill,
  updateLearningCoWriterDocument,
  updateLearningTutorAgentFile,
  updateLearningTutorAgent,
  updateLearningTutorAgentSoul,
  updateLearningStudyProfile,
  updateLearningMemory,
  uploadLearningKnowledge,
  uploadLearningKnowledgeArchive,
  uploadLearningKnowledgeFolder,
  type LearningKnowledgeUploadPolicy,
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
import {
  learningNotebookExportFilename,
  learningNotebookMarkdown,
  learningNotebookRecordExportFilename,
  learningNotebookRecordMarkdown,
} from "./learningNotebookExport";
import { buildLearningSpaceReferences } from "./learningSpaceReferences";
import {
  LearningNextActionRow,
  LearningQualityChecklist,
  LearningRunStateStrip,
  LearningStudyPlanHome,
  LearningStudySetupPanel,
  STUDY_PROFILE_STORAGE_KEY,
  compactMessageExcerpt,
  readLearningStudyProfile,
  writeLearningStudyProfile,
  type LearningRunState,
  type LearningStudyAction,
  type LearningStudyProfile,
} from "./LearningStudyLoop";

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

type LearningChannelJsonSchema = {
  type?: string | string[];
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  properties?: Record<string, LearningChannelJsonSchema>;
  items?: LearningChannelJsonSchema;
  anyOf?: LearningChannelJsonSchema[];
};

type LearningChannelSchemaEntry = {
  name: string;
  display_name: string;
  default_config: Record<string, unknown>;
  secret_fields: string[];
  json_schema: LearningChannelJsonSchema;
};

const LearningWriteGateContext = createContext<() => void>(() => {});

function useLearningWriteGate() {
  return useContext(LearningWriteGateContext);
}

const LEARNING_PRODUCT_ID = "learning";

type LearningOperationalState = ProductOperationalState | "privateBeta" | "loading" | "unknown";

function formatLearningReset(value: string | null | undefined) {
  if (!value) return "reset pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "reset pending";
  return `resets ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function formatLearningUsagePercent(used: number | null, limit: number | null) {
  const percent = getUsagePercent({ used, limit });
  return formatUsagePercentLabel(percent);
}

function getLearningWindow(meterWindow: MeterWindowSnapshot | null | undefined) {
  return {
    used: typeof meterWindow?.used === "number" ? meterWindow.used : null,
    limit: typeof meterWindow?.limit === "number" ? meterWindow.limit : null,
    remaining: typeof meterWindow?.remaining === "number" ? meterWindow.remaining : null,
    resetAt: meterWindow?.resetAt || null,
  };
}

function learningStateTone(state: LearningOperationalState): "accent" | "success" | "warn" | "danger" {
  if (state === "enabled") return "success";
  if (state === "degraded" || state === "readOnly" || state === "privateBeta" || state === "loading") return "warn";
  if (state === "disabled" || state === "maintenance" || state === "hidden") return "danger";
  return "accent";
}

function learningStateLabel(state: LearningOperationalState) {
  const labels: Record<LearningOperationalState, string> = {
    enabled: "Operational",
    disabled: "Disabled",
    maintenance: "Maintenance",
    degraded: "Degraded",
    hidden: "Unavailable",
    readOnly: "Read-only",
    privateBeta: "Private beta",
    loading: "Syncing",
    unknown: "Registry pending",
  };
  return labels[state] ?? "Registry pending";
}

function learningStateMessage(state: LearningOperationalState) {
  if (state === "disabled") return "Learn is disabled centrally. Existing study material is visible, but new learning work is paused.";
  if (state === "maintenance") return "Learn is in maintenance. Keep reading saved material; generation and mutations may be paused.";
  if (state === "readOnly") return "Learn is read-only from the central registry. Saved material is available; new expensive work should wait.";
  if (state === "degraded") return "Learn is degraded. Core study flows remain visible while upstream learning services recover.";
  if (state === "privateBeta") return "Learn is in private beta. Access is controlled centrally; learner memory remains separate.";
  return "";
}

type LearningChannelSchemaCatalog = {
  channels: Record<string, LearningChannelSchemaEntry>;
  global?: { json_schema?: LearningChannelJsonSchema; secret_fields?: string[] };
};
const TUTOR_PROFILE_FILES = [
  "SOUL.md",
  "USER.md",
  "TOOLS.md",
  "AGENTS.md",
  "HEARTBEAT.md",
] as const;
type TutorProfileFile = (typeof TUTOR_PROFILE_FILES)[number];
type NotebookCreateDraft = { name: string; description: string };
type CoWriterCreateDraft = { title?: string; content: string };
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
  events?: Item[];
  attachments?: LearningAttachment[];
};

type LearningTurnRetryDraft = {
  websocketPayload: Record<string, unknown>;
  userMessage: TutorChatMessage;
  label: string;
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
  solve: "chat",
  workspaces: "workspaces",
  vision: "workspaces",
  research: "chat",
  quiz: "chat",
  visualize: "chat",
  "math-animation": "chat",
  "math-animator": "chat",
};

const viewToCapabilityPreset: Record<string, string> = {
  solve: "deep_solve",
  research: "deep_research",
  quiz: "deep_question",
  visualize: "visualize",
  "math-animation": "math_animator",
  "math-animator": "math_animator",
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

const LEGACY_PENDING_DRAFT_STORAGE_KEY = "zaki.learn.pendingDraft";
const PENDING_DRAFT_STORAGE_KEY_PREFIX = "zaki.learn.pendingDraft";

function learningUserStorageKey(user: { id?: unknown; username?: unknown } | null | undefined) {
  const rawKey = textOf(user?.id) || textOf(user?.username) || "anonymous";
  return encodeURIComponent(rawKey);
}

function pendingLearningDraftStorageKey(
  user: { id?: unknown; username?: unknown } | null | undefined,
) {
  return `${PENDING_DRAFT_STORAGE_KEY_PREFIX}:${learningUserStorageKey(user)}`;
}

function notebookSummary(value: unknown, fallback: string) {
  const text = textOf(value, fallback).replace(/\s+/g, " ").trim();
  return (text || fallback).slice(0, 240);
}

function learningChannelSchemaCatalog(value: unknown): LearningChannelSchemaCatalog {
  const record = asRecord(value);
  const rawChannels = asRecord(record.channels);
  const channels: Record<string, LearningChannelSchemaEntry> = {};
  for (const [name, rawValue] of Object.entries(rawChannels)) {
    const entry = asRecord(rawValue);
    const jsonSchema = asRecord(entry.json_schema) as LearningChannelJsonSchema;
    channels[name] = {
      name: textOf(entry.name, name),
      display_name: textOf(entry.display_name, name),
      default_config: asRecord(entry.default_config),
      secret_fields: Array.isArray(entry.secret_fields) ? entry.secret_fields.map(String) : [],
      json_schema: jsonSchema,
    };
  }
  return { channels, global: asRecord(record.global) as LearningChannelSchemaCatalog["global"] };
}

function resolveLearningChannelSchemaVariant(schema: LearningChannelJsonSchema): LearningChannelJsonSchema {
  if (!schema.anyOf?.length) return schema;
  const first = schema.anyOf.find((variant) => variant.type !== "null") ?? schema.anyOf[0] ?? {};
  return {
    ...first,
    title: schema.title ?? first.title,
    description: schema.description ?? first.description,
  };
}

function isLearningChannelNullable(schema: LearningChannelJsonSchema) {
  return (
    (Array.isArray(schema.type) && schema.type.includes("null")) ||
    Boolean(schema.anyOf?.some((variant) => variant.type === "null"))
  );
}

function defaultLearningChannelValue(schema: LearningChannelJsonSchema): unknown {
  if (schema.default !== undefined) return schema.default;
  const variant = resolveLearningChannelSchemaVariant(schema);
  switch (variant.type) {
    case "boolean":
      return false;
    case "integer":
    case "number":
      return 0;
    case "array":
      return [];
    case "object":
      return {};
    case "string":
    default:
      return "";
  }
}

function humanizeLearningChannelKey(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function learningSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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

function tutorAgentId(item: Item, fallback = "") {
  return textOf(item.bot_id) || textOf(item.agent_id) || textOf(item.id) || itemId(item, fallback);
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
  const authUser = useAuthStore((state) => state.user);
  const [searchParams] = useSearchParams();
  const productRegistry = useProductRegistry();
  const meterStatus = useMeterStatus();
  const requestedView = searchParams.get("view");
  const requestedDocumentId = searchParams.get("doc") || "";
  const requestedAgentId = searchParams.get("agent") || "";
  const requestedSessionId = searchParams.get("session") || "";
  const requestedCapability =
    searchParams.get("capability") ||
    (requestedView ? viewToCapabilityPreset[requestedView.trim().toLowerCase()] : "") ||
    "";
  const [tab, setTab] = useState<LearningTab>(() => normalizeLearningTab(requestedView));
  const [chatCapabilityPreset, setChatCapabilityPreset] = useState(requestedCapability);
  const [kbName, setKbName] = useState("main");
  const [bookTopic, setBookTopic] = useState("");
  const [notebookName, setNotebookName] = useState("");
  const [selectedWriterDocumentId, setSelectedWriterDocumentId] = useState(
    () => requestedDocumentId,
  );
  const [agentId, setAgentId] = useState("");
  const [agentName, setAgentName] = useState("");
  const [agentPersona, setAgentPersona] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState(
    () => requestedAgentId || window.localStorage.getItem("zaki.learn.selectedAgentId") || "",
  );
  const [visionQuestion, setVisionQuestion] = useState("");
  const [visionImage, setVisionImage] = useState<File | null>(null);
  const [, setLastResult] = useState<unknown>(null);
  const [selectedObject, setSelectedObject] = useState<SelectedLearningObject | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const pendingDraftStorageKey = useMemo(() => pendingLearningDraftStorageKey(authUser), [
    authUser?.id,
    authUser?.username,
  ]);

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    folderInputRef.current?.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    setTab(normalizeLearningTab(requestedView));
  }, [requestedView]);

  useEffect(() => {
    setChatCapabilityPreset(requestedCapability);
  }, [requestedCapability]);

  useEffect(() => {
    if (normalizeLearningTab(requestedView) !== "writer") {
      setSelectedWriterDocumentId("");
      return;
    }
    setSelectedWriterDocumentId(requestedDocumentId);
  }, [requestedView, requestedDocumentId]);

  useEffect(() => {
    if (normalizeLearningTab(requestedView) === "agents" && requestedAgentId) {
      setSelectedAgentId(requestedAgentId);
      window.localStorage.setItem("zaki.learn.selectedAgentId", requestedAgentId);
    }
  }, [requestedView, requestedAgentId]);

  const openTutorAgentChat = useCallback((nextAgentId: string) => {
    const trimmed = nextAgentId.trim();
    if (!trimmed) return;
    setSelectedAgentId(trimmed);
    window.localStorage.setItem("zaki.learn.selectedAgentId", trimmed);
    const params = new URLSearchParams(window.location.search);
    params.set("view", "agents");
    params.set("agent", trimmed);
    window.history.pushState(null, "", `/learn?${params.toString()}`);
  }, []);

  const closeTutorAgentChat = useCallback(() => {
    setSelectedAgentId("");
    window.localStorage.removeItem("zaki.learn.selectedAgentId");
    const params = new URLSearchParams(window.location.search);
    params.set("view", "agents");
    params.delete("agent");
    window.history.pushState(null, "", `/learn?${params.toString()}`);
  }, []);

  const knowledge = useQuery({
    queryKey: learningKeys.knowledge,
    queryFn: listLearningKnowledge,
    retry: 1,
  });
  const knowledgeUploadPolicy = useQuery({
    queryKey: learningKeys.knowledgeUploadPolicy,
    queryFn: getLearningKnowledgeSupportedFileTypes,
    retry: 1,
  });
  const sessions = useQuery({
    queryKey: learningKeys.sessions,
    queryFn: () => listLearningSessions(100),
    retry: 1,
  });
  const dashboardRecent = useQuery({
    queryKey: learningKeys.dashboardRecent,
    queryFn: () => listLearningDashboardRecent(50),
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
  const recentAgents = useQuery({
    queryKey: learningKeys.tutorAgentRecent,
    queryFn: () => listLearningTutorAgentRecent(3),
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

  const learningProduct = useMemo(
    () =>
      (productRegistry.data?.data?.products ?? []).find(
        (product) => product.productId === LEARNING_PRODUCT_ID,
      ) ?? null,
    [productRegistry.data?.data?.products],
  );
  const learningMeter = meterStatus.data?.data?.products?.[LEARNING_PRODUCT_ID] ?? null;
  const centralProductState = learningProduct?.state || learningMeter?.state || null;
  const productState: LearningOperationalState = productRegistry.isLoading
    ? "loading"
    : centralProductState
      ? centralProductState
      : learningProduct?.lifecycle && learningProduct.lifecycle !== "current"
      ? "privateBeta"
      : "unknown";
  const productWeekly = getLearningWindow(learningMeter?.weekly ?? meterStatus.data?.data?.weekly);
  const productRolling = getLearningWindow(learningMeter?.rolling ?? meterStatus.data?.data?.rolling);
  const productWeeklyUsageLabel = formatLearningUsagePercent(productWeekly.used, productWeekly.limit);
  const productRollingUsageLabel =
    productRolling.limit != null
      ? `${getRoundedUsagePercent(
          getUsagePercent({ used: productRolling.used, limit: productRolling.limit })
        )}% of this capacity window`
      : null;
  const learningWritesDisabled =
    productState === "disabled" ||
    productState === "maintenance" ||
    productState === "hidden" ||
    productState === "readOnly";
  const learningStateBanner = learningStateMessage(productState);
  const learningWriteDisabledMessage =
    learningStateBanner || "Learn writes are paused by central product state.";
  const assertLearningWritesAllowed = useCallback(() => {
    if (!learningWritesDisabled) return;
    throw new Error(learningWriteDisabledMessage);
  }, [learningWriteDisabledMessage, learningWritesDisabled]);

  const knowledgeItems = useMemo(
    () => itemList(knowledge.data, ["knowledge_bases", "items", "databases"]),
    [knowledge.data],
  );
  const sessionItems = useMemo(
    () => itemList(sessions.data, ["sessions", "items"]),
    [sessions.data],
  );
  const dashboardRecentItems = useMemo(
    () => itemList(dashboardRecent.data, ["items", "activities", "recent"]),
    [dashboardRecent.data],
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
  const recentAgentItems = useMemo(
    () => itemList(recentAgents.data, ["bots", "items"]),
    [recentAgents.data],
  );
  const agentSoulItems = useMemo(
    () => itemList(agentSouls.data, ["souls", "items", "templates"]),
    [agentSouls.data],
  );
  const solveItems = useMemo(
    () => itemList(solveSessions.data, ["sessions", "items"]),
    [solveSessions.data],
  );

  const createKb = useMutation({
    mutationFn: ({ name, files }: { name: string; files: FileList | File[] }) => {
      assertLearningWritesAllowed();
      return createLearningKnowledge(name, files);
    },
    onSuccess: (payload) => {
      setLastResult(payload);
      toast.success("Source library created");
      void queryClient.invalidateQueries({ queryKey: learningKeys.knowledge });
    },
    onError: (error) => toast.error(error.message),
  });

  const uploadKb = useMutation({
    mutationFn: ({ name, files }: { name: string; files: FileList | File[] }) => {
      assertLearningWritesAllowed();
      return uploadLearningKnowledge(name, files);
    },
    onSuccess: (payload) => {
      setLastResult(payload);
      toast.success("Upload started");
      void queryClient.invalidateQueries({ queryKey: learningKeys.knowledge });
    },
    onError: (error) => toast.error(error.message),
  });

  const uploadKbFolder = useMutation({
    mutationFn: ({ name, files }: { name: string; files: FileList | File[] }) => {
      assertLearningWritesAllowed();
      return uploadLearningKnowledgeFolder(name, files);
    },
    onSuccess: (payload) => {
      setLastResult(payload);
      toast.success("Folder upload started");
      void queryClient.invalidateQueries({ queryKey: learningKeys.knowledge });
    },
    onError: (error) => toast.error(error.message),
  });

  const uploadKbArchive = useMutation({
    mutationFn: ({ name, files }: { name: string; files: FileList | File[] }) => {
      assertLearningWritesAllowed();
      return uploadLearningKnowledgeArchive(name, files);
    },
    onSuccess: (payload) => {
      setLastResult(payload);
      toast.success("Archive upload started");
      void queryClient.invalidateQueries({ queryKey: learningKeys.knowledge });
    },
    onError: (error) => toast.error(error.message),
  });

  const reindexKb = useMutation({
    mutationFn: (name: string) => {
      assertLearningWritesAllowed();
      return reindexLearningKnowledge(name);
    },
    onSuccess: (payload) => {
      setLastResult(payload);
      toast.success("Reindex started");
      void queryClient.invalidateQueries({ queryKey: learningKeys.knowledge });
    },
    onError: (error) => toast.error(error.message),
  });

  const setDefaultKb = useMutation({
    mutationFn: (name: string) => {
      assertLearningWritesAllowed();
      return setDefaultLearningKnowledge(name);
    },
    onSuccess: (payload) => {
      setLastResult(payload);
      toast.success("Default source library updated");
      void queryClient.invalidateQueries({ queryKey: learningKeys.knowledge });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteKb = useMutation({
    mutationFn: (name: string) => {
      assertLearningWritesAllowed();
      return deleteLearningKnowledge(name);
    },
    onSuccess: (payload) => {
      setLastResult(payload);
      toast.success("Knowledge base deleted");
      void queryClient.invalidateQueries({ queryKey: learningKeys.knowledge });
    },
    onError: (error) => toast.error(error.message),
  });

  const createBook = useMutation({
    mutationFn: (payload: LearningJson) => {
      assertLearningWritesAllowed();
      return createLearningBook(payload);
    },
    onSuccess: (payload) => {
      setLastResult(payload);
      setBookTopic("");
      toast.success("Book request sent");
      void queryClient.invalidateQueries({ queryKey: learningKeys.books });
    },
    onError: (error) => toast.error(error.message),
  });

  const createNotebook = useMutation({
    mutationFn: ({ name, description }: NotebookCreateDraft) => {
      assertLearningWritesAllowed();
      return createLearningNotebook({
        name,
        description,
        color: "#f10202",
        icon: "book",
      });
    },
    onSuccess: (payload) => {
      setLastResult(payload);
      setNotebookName("");
      toast.success("Notebook created");
      void queryClient.invalidateQueries({ queryKey: learningKeys.notebooks });
    },
    onError: (error) => toast.error(error.message),
  });

  const createDocument = useMutation({
    mutationFn: ({ title, content }: CoWriterCreateDraft) => {
      assertLearningWritesAllowed();
      return createLearningCoWriterDocument({ title, content });
    },
    onSuccess: (payload) => {
      setLastResult(payload);
      const createdId = itemId(asRecord(payload));
      if (createdId) setSelectedWriterDocumentId(createdId);
      toast.success("Document created");
      void queryClient.invalidateQueries({ queryKey: learningKeys.coWriterDocuments });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteDocument = useMutation({
    mutationFn: (documentId: string) => {
      assertLearningWritesAllowed();
      return deleteLearningCoWriterDocument(documentId);
    },
    onSuccess: (payload) => {
      setLastResult(payload);
      toast.success("Document deleted");
      void queryClient.invalidateQueries({ queryKey: learningKeys.coWriterDocuments });
    },
    onError: (error) => toast.error(error.message),
  });

  const createAgent = useMutation({
    mutationFn: () => {
      assertLearningWritesAllowed();
      return createLearningTutorAgent({
        bot_id: agentId,
        name: agentName || agentId,
        persona: agentPersona,
      });
    },
    onSuccess: (payload) => {
      setLastResult(payload);
      setAgentId("");
      setAgentName("");
      setAgentPersona("");
      toast.success("Tutor created");
      void queryClient.invalidateQueries({ queryKey: learningKeys.tutorAgents });
      void queryClient.invalidateQueries({ queryKey: learningKeys.tutorAgentRecent });
    },
    onError: (error) => toast.error(error.message),
  });

  const destroyAgent = useMutation({
    mutationFn: (nextAgentId: string) => {
      assertLearningWritesAllowed();
      return destroyLearningTutorAgent(nextAgentId);
    },
    onSuccess: (payload) => {
      setLastResult(payload);
      toast.success("Tutor deleted");
      void queryClient.invalidateQueries({ queryKey: learningKeys.tutorAgents });
      void queryClient.invalidateQueries({ queryKey: learningKeys.tutorAgentRecent });
    },
    onError: (error) => toast.error(error.message),
  });

  const stopAgent = useMutation({
    mutationFn: (nextAgentId: string) => {
      assertLearningWritesAllowed();
      return stopLearningTutorAgent(nextAgentId);
    },
    onSuccess: (payload) => {
      setLastResult(payload);
      toast.success("Tutor stopped");
      void queryClient.invalidateQueries({ queryKey: learningKeys.tutorAgents });
      void queryClient.invalidateQueries({ queryKey: learningKeys.tutorAgentRecent });
    },
    onError: (error) => toast.error(error.message),
  });

  const startAgent = useMutation({
    mutationFn: (nextAgentId: string) => {
      assertLearningWritesAllowed();
      return createLearningTutorAgent({ bot_id: nextAgentId });
    },
    onSuccess: (payload) => {
      setLastResult(payload);
      toast.success("Tutor started");
      void queryClient.invalidateQueries({ queryKey: learningKeys.tutorAgents });
      void queryClient.invalidateQueries({ queryKey: learningKeys.tutorAgentRecent });
    },
    onError: (error) => toast.error(error.message),
  });

  const analyzeVision = useMutation({
    mutationFn: async () => {
      assertLearningWritesAllowed();
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
    mutationFn: ({ file, content }: { file: "summary" | "profile"; content: string }) => {
      assertLearningWritesAllowed();
      return updateLearningMemory(file, content);
    },
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

  const openLearningChatSession = (sessionId: string) => {
    const trimmed = sessionId.trim();
    if (!trimmed) return;
    setTab("chat");
    setChatCapabilityPreset("");
    const params = new URLSearchParams(window.location.search);
    params.set("view", "chat");
    params.delete("capability");
    params.set("session", trimmed);
    window.history.pushState(null, "", `/learn?${params.toString()}`);
  };

  const openLearningChatDraft = (content: string, capability = "") => {
    const trimmed = content.trim();
    if (!trimmed) return;
    window.localStorage.setItem(
      pendingDraftStorageKey,
      JSON.stringify({
        content: trimmed,
        capability,
        createdAt: new Date().toISOString(),
      }),
    );
    setTab("chat");
    setChatCapabilityPreset(capability);
    const params = new URLSearchParams(window.location.search);
    params.set("view", "chat");
    if (capability) params.set("capability", capability);
    else params.delete("capability");
    params.delete("session");
    window.history.pushState(null, "", `/learn?${params.toString()}`);
  };

  return (
    <div
      className="zaki-app-v2 h-full overflow-hidden bg-[var(--v2-bg)]"
      data-product-id={LEARNING_PRODUCT_ID}
    >
      <V2StatusStrip
        aria-live="polite"
        items={[
          {
            id: "state",
            label: "Learn",
            value: learningStateLabel(productState),
            active: true,
            tone: learningStateTone(productState),
          },
          {
            id: "meter",
            label: "Central meter",
            value: productWeekly.limit != null ? productWeeklyUsageLabel : "linked",
          },
          {
            id: "memory",
            label: "Memory",
            value: learningProduct?.memoryScope || "learner_memory",
          },
        ]}
      />
      <LearningWriteGateContext.Provider value={assertLearningWritesAllowed}>
      <div className="grid h-[calc(100%-30px)] min-h-0 grid-rows-[auto_1fr]">
        <div className="border-b border-[var(--v2-hairline)] bg-[var(--v2-bg)] px-3 py-2">
          <div className="grid gap-2 lg:grid-cols-[1fr_260px_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <V2Badge tone={learningStateTone(productState)} dot>
                  {learningStateLabel(productState)}
                </V2Badge>
                {learningProduct?.lifecycle && learningProduct.lifecycle !== "current" ? (
                  <V2Badge tone="warn">Private beta</V2Badge>
                ) : null}
                {productRegistry.isError || meterStatus.isError ? (
                  <V2Badge tone="warn">Central state degraded</V2Badge>
                ) : null}
              </div>
              <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--v2-ink-3)]">
                Sources / study plans / notebooks / books / tutor loop. Global account, billing,
                privacy, and product usage stay in central settings.
              </p>
            </div>
            <V2UsageGauge
              label="Learning usage"
              used={productWeekly.used}
              limit={productWeekly.limit}
              detail={formatLearningReset(productWeekly.resetAt)}
              reset={formatLearningReset(productWeekly.resetAt)}
              className="hidden p-2 lg:block [&_.v2-usage-gauge__bar]:mt-2 [&_.v2-usage-gauge__foot]:mt-1 [&_.v2-usage-gauge__number]:mt-1 [&_.v2-usage-gauge__number_strong]:text-[20px]"
            />
            <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
              <a href="/settings#settings-billing" className="v2-btn v2-btn--sm">
                Usage settings
              </a>
              <a href="/settings#settings-privacy" className="v2-btn v2-btn--sm">
                Privacy
              </a>
            </div>
          </div>
          {learningStateBanner ? (
            <div className="mt-2 border border-[var(--v2-hairline-strong)] bg-[var(--v2-bg-sunken)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--v2-ink-2)]">
              {learningStateBanner}
              {productRollingUsageLabel
                ? ` ${productRollingUsageLabel}.`
                : ""}
            </div>
          ) : null}
        </div>
        <div className="min-h-0 overflow-hidden">
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
            readOnly={learningWritesDisabled}
          />
        ) : tab === "chat" ? (
          <LearningChatPanel
            kbName={kbName}
            setKbName={setKbName}
            capabilityPreset={chatCapabilityPreset}
            requestedSessionId={requestedSessionId}
            requestedView={requestedView || "chat"}
            knowledgeItems={knowledgeItems}
            sessionItems={sessionItems}
            bookItems={bookItems}
            notebookItems={notebookItems}
            questionItems={questionItems}
            skillItems={skillItems}
            readOnly={learningWritesDisabled}
            readOnlyReason={learningWriteDisabledMessage}
          />
        ) : tab === "sources" ? (
          <SourcesPanel
            kbName={kbName}
            setKbName={setKbName}
            createKb={createKb}
            uploadKb={uploadKb}
            uploadKbFolder={uploadKbFolder}
            uploadKbArchive={uploadKbArchive}
            reindexKb={reindexKb}
            setDefaultKb={setDefaultKb}
            deleteKb={deleteKb}
            items={knowledgeItems}
            uploadPolicy={knowledgeUploadPolicy.data}
            folderInputRef={folderInputRef}
            onOpen={(item) => openObject("source", item, "main")}
          />
        ) : tab === "notebooks" ? (
          <NotebooksPanel
            notebookName={notebookName}
            setNotebookName={setNotebookName}
            createNotebook={createNotebook}
            items={notebookItems}
            onOpenChatSession={openLearningChatSession}
            onStartStudyFromNotebook={openLearningChatDraft}
          />
        ) : tab === "writer" ? (
          <WriterPanel
            createDocument={createDocument}
            deleteDocument={deleteDocument}
            selectedDocumentId={selectedWriterDocumentId}
            setSelectedDocumentId={setSelectedWriterDocumentId}
            items={documentItems}
            knowledgeItems={knowledgeItems}
            notebookItems={notebookItems}
            onResult={setLastResult}
          />
        ) : tab === "review" ? (
          <QuestionBankPanel
            items={questionItems}
            onOpen={(item: Item) =>
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
            recentActivityItems={dashboardRecentItems}
            onOpenChatSession={openLearningChatSession}
            onOpenQuestion={(item) =>
              openObject("question", item, `question-${questionItems.indexOf(item) + 1}`)
            }
            onStartStudyFromNotebook={openLearningChatDraft}
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
            startAgent={startAgent}
            stopAgent={stopAgent}
            destroyAgent={destroyAgent}
            items={agentItems}
            recentItems={recentAgentItems}
            souls={agentSoulItems}
            channelsSchema={agentChannelsSchema.data}
            notebookItems={notebookItems}
            selectedAgentId={selectedAgentId}
            onOpenAgentChat={openTutorAgentChat}
            onCloseAgentChat={closeTutorAgentChat}
            onResult={setLastResult}
          />
        ) : tab === "workspaces" ? (
          <WorkspacesPanel
            visionQuestion={visionQuestion}
            setVisionQuestion={setVisionQuestion}
            setVisionImage={setVisionImage}
            analyzeVision={analyzeVision}
            solveItems={solveItems}
            onOpenCapability={(capability) => {
              setChatCapabilityPreset(capability);
              setTab("chat");
              const params = new URLSearchParams(window.location.search);
              params.set("view", "chat");
              if (capability) params.set("capability", capability);
              else params.delete("capability");
              window.history.pushState(null, "", `/learn?${params.toString()}`);
            }}
            onOpen={(item) => openObject("solve", item, `solve-${solveItems.indexOf(item) + 1}`)}
          />
        ) : null}
        </div>
      </div>
      <LearningDetailSheet
        selected={selectedObject}
        onClose={() => setSelectedObject(null)}
        onResult={setLastResult}
      />
      </LearningWriteGateContext.Provider>
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

const learningStarterActions = [
  {
    label: "Understand a topic",
    capability: "",
    prompt: "Help me understand this topic from first principles: ",
  },
  {
    label: "Solve a problem",
    capability: "deep_solve",
    prompt: "Solve this step by step, show the reasoning, then give me a similar practice problem:\n\n",
  },
  {
    label: "Make a quiz",
    capability: "deep_question",
    prompt: "Create an answer-keyed quiz for this topic. Include difficulty levels and explanations:\n\n",
  },
  {
    label: "Summarize notes",
    capability: "",
    prompt: "Summarize these notes into key ideas, weak points, and review questions:\n\n",
  },
  {
    label: "Make study plan",
    capability: "",
    prompt: "",
    opensStudySetup: true,
  },
] as const;

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
  mode: "notes",
  depth: "quick",
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

function latestLearningResultEvent(message: TutorChatMessage) {
  return [...(message.events ?? [])].reverse().find((event) => textOf(event.type) === "result");
}

function learningResultMetadata(message: TutorChatMessage) {
  return asRecord(latestLearningResultEvent(message)?.metadata);
}

function learningRecords(value: unknown): Item[] {
  return Array.isArray(value) ? value.filter(isItem) : [];
}

function learningSourceRecords(metadata: Item): Item[] {
  const candidates = [
    metadata.sources,
    metadata.citations,
    metadata.references,
    metadata.source_documents,
    metadata.search_results,
  ];
  const records = candidates.flatMap((value) => learningRecords(value));
  const seen = new Set<string>();
  return records.filter((record) => {
    const label =
      textOf(record.title) ||
      textOf(record.name) ||
      textOf(record.source) ||
      textOf(record.url) ||
      textOf(record.link);
    if (!label) return false;
    const key = `${label}:${textOf(record.url) || textOf(record.link)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function safeLearningSourceUrl(value: unknown) {
  const url = textOf(value).trim();
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : "";
}

function stripLearningCodeFence(value: string) {
  return value
    .trim()
    .replace(/^```[a-zA-Z0-9_-]*\s*([\s\S]*?)\s*```$/i, "$1")
    .trim();
}

function removeLearningFencedCode(value: string) {
  return value.replace(/```(?:svg|mermaid|html|javascript|js)?\s*[\s\S]*?```/gi, "").trim();
}

function learningStringList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => textOf(item)).filter(Boolean) : [];
}

function learningNumberList(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => Number(item)).filter((item) => Number.isFinite(item))
    : [];
}

function safeLearningChartColor(value: string, fallback: string) {
  const color = value.trim();
  if (
    /^#[0-9a-f]{3,8}$/i.test(color) ||
    /^rgba?\([\d\s.,%+-]+\)$/i.test(color) ||
    /^hsla?\([\d\s.,%+-]+deg?\)$/i.test(color) ||
    /^[a-z]+$/i.test(color)
  ) {
    return color;
  }
  return fallback;
}

function escapeLearningSvgText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseLearningMermaidFlowchart(source: string) {
  const clean = stripLearningCodeFence(source).replace(/\r/g, "");
  const nodes = new Map<string, string>();
  const edges: Array<[string, string]> = [];
  const addNode = (id: string, label?: string) => {
    const cleanId = id.trim().replace(/[^A-Za-z0-9_-]/g, "");
    if (!cleanId) return "";
    if (!nodes.has(cleanId)) nodes.set(cleanId, label?.trim() || cleanId.replace(/_/g, " "));
    if (label?.trim()) nodes.set(cleanId, label.trim());
    return cleanId;
  };

  const labelPattern = /([A-Za-z][\w-]*)\s*(?:\["([^"]+)"\]|\("([^"]+)"\)|\{([^}]+)\})/g;
  for (const match of clean.matchAll(labelPattern)) {
    addNode(match[1] || "", match[2] || match[3] || match[4]);
  }

  const edgePattern =
    /([A-Za-z][\w-]*)(?:\s*(?:\["[^"]+"\]|\("[^"]+"\)|\{[^}]+\}))?\s*-+>\s*([A-Za-z][\w-]*)(?:\s*(?:\["[^"]+"\]|\("[^"]+"\)|\{[^}]+\}))?/g;
  for (const match of clean.matchAll(edgePattern)) {
    const from = addNode(match[1] || "");
    const to = addNode(match[2] || "");
    if (from && to) edges.push([from, to]);
  }

  return { nodes: Array.from(nodes.entries()), edges };
}

function LearningMermaidPreview({ source, description }: { source: string; description: string }) {
  const diagram = useMemo(() => parseLearningMermaidFlowchart(source), [source]);
  const nodes = diagram.nodes.slice(0, 16);
  if (!nodes.length) return <LearningSourcePreview source={source} label="Mermaid source" />;

  const width = 820;
  const nodeWidth = 190;
  const nodeHeight = 52;
  const rowGap = 28;
  const height = Math.max(160, nodes.length * (nodeHeight + rowGap) + 32);
  const positions = new Map(
    nodes.map(([id], index) => [
      id,
      {
        x: 56 + (index % 2) * 320,
        y: 20 + index * (nodeHeight + rowGap),
      },
    ]),
  );
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#c33a24"/>
    </marker>
  </defs>
  <rect width="${width}" height="${height}" rx="14" fill="#fffaf5"/>
  ${diagram.edges
    .map(([from, to]) => {
      const a = positions.get(from);
      const b = positions.get(to);
      if (!a || !b) return "";
      return `<path d="M${a.x + nodeWidth} ${a.y + nodeHeight / 2} C ${a.x + nodeWidth + 52} ${a.y + nodeHeight / 2}, ${b.x - 52} ${b.y + nodeHeight / 2}, ${b.x} ${b.y + nodeHeight / 2}" fill="none" stroke="#c33a24" stroke-width="2" marker-end="url(#arrow)" opacity="0.72"/>`;
    })
    .join("")}
  ${nodes
    .map(([id, label]) => {
      const pos = positions.get(id)!;
      return `<g>
        <rect x="${pos.x}" y="${pos.y}" width="${nodeWidth}" height="${nodeHeight}" rx="8" fill="#ffffff" stroke="#e5d6c8"/>
        <text x="${pos.x + 14}" y="${pos.y + 22}" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#2b2118">${escapeLearningSvgText(label).slice(0, 34)}</text>
        <text x="${pos.x + 14}" y="${pos.y + 40}" font-family="system-ui, sans-serif" font-size="11" fill="#8a7665">${escapeLearningSvgText(id)}</text>
      </g>`;
    })
    .join("")}
</svg>`;
  return (
    <figure className="rounded-zaki-md border border-zaki-border bg-zaki-base p-3">
      <img
        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
        alt={description || "Generated diagram"}
        className="h-auto w-full rounded-zaki-md"
      />
      {description ? <figcaption className="mt-2 text-xs text-zaki-muted">{description}</figcaption> : null}
      <details className="mt-2 text-xs text-zaki-muted">
        <summary className="cursor-pointer">Source</summary>
        <pre className="mt-2 max-h-40 overflow-auto rounded-zaki-md bg-zaki-raised p-3">
          <code>{stripLearningCodeFence(source)}</code>
        </pre>
      </details>
    </figure>
  );
}

function LearningSvgPreview({ source, description }: { source: string; description: string }) {
  const clean = stripLearningCodeFence(source);
  if (!clean.trim().startsWith("<svg")) return <LearningSourcePreview source={source} label="SVG source" />;
  return (
    <figure className="rounded-zaki-md border border-zaki-border bg-zaki-base p-3">
      <img
        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(clean)}`}
        alt={description || "Generated SVG visualization"}
        className="h-auto w-full rounded-zaki-md"
      />
      {description ? <figcaption className="mt-2 text-xs text-zaki-muted">{description}</figcaption> : null}
    </figure>
  );
}

function LearningSourcePreview({ source, label }: { source: string; label: string }) {
  return (
    <div className="rounded-zaki-md border border-dashed border-zaki-border bg-zaki-base p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-zaki-text">
        <Code2 className="size-3.5 text-zaki-muted" />
        {label}
      </div>
      <pre className="max-h-[260px] overflow-auto rounded-zaki-md bg-zaki-raised p-3 text-xs leading-5 text-zaki-text">
        <code>{stripLearningCodeFence(source)}</code>
      </pre>
    </div>
  );
}

function learningStripJsComments(value: string) {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function findBalancedLearningFragment(source: string, startIndex: number, openChar: string, closeChar: string) {
  let depth = 0;
  let quote = "";
  let escaped = false;
  let start = -1;
  for (let index = Math.max(0, startIndex); index < source.length; index += 1) {
    const char = source[index] || "";
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === openChar) {
      if (depth === 0) start = index;
      depth += 1;
    } else if (char === closeChar && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) return source.slice(start, index + 1);
    }
  }
  return "";
}

function findLearningJsObjectForKey(source: string, key: string) {
  const pattern = new RegExp(`\\b${key}\\s*:`, "i");
  const match = pattern.exec(source);
  if (!match) return "";
  const openIndex = source.indexOf("{", match.index + match[0].length);
  if (openIndex < 0) return "";
  return findBalancedLearningFragment(source, openIndex, "{", "}");
}

function normalizeLearningJsObjectLiteral(value: string) {
  return learningStripJsComments(value)
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
    .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_match, body: string) =>
      JSON.stringify(body.replace(/\\'/g, "'")),
    )
    .replace(/,\s*([}\]])/g, "$1")
    .trim();
}

function parseLearningJsObjectLiteral(value: string) {
  try {
    return asRecord(JSON.parse(normalizeLearningJsObjectLiteral(value)));
  } catch {
    return {};
  }
}

function extractLearningChartObject(source: string) {
  const clean = learningStripJsComments(source).trim();
  const directObject = findBalancedLearningFragment(clean, clean.indexOf("{"), "{", "}");
  const parsedDirect = directObject ? parseLearningJsObjectLiteral(directObject) : {};
  if (Object.keys(asRecord(parsedDirect.data)).length || Array.isArray(asRecord(parsedDirect.data).datasets)) {
    return parsedDirect;
  }
  const dataObject = findLearningJsObjectForKey(clean, "data");
  const parsedData = dataObject ? parseLearningJsObjectLiteral(dataObject) : {};
  if (Object.keys(parsedData).length) {
    return {
      type: clean.match(/\btype\s*:\s*["']([^"']+)["']/i)?.[1] || "bar",
      data: parsedData,
    };
  }
  return {};
}

export function parseLearningChartJsConfig(source: string) {
  const clean = stripLearningCodeFence(source)
    .replace(/^const\s+\w+\s*=\s*/i, "")
    .replace(/^export\s+default\s+/i, "")
    .replace(/;\s*$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(clean);
    return asRecord(parsed);
  } catch {
    const extracted = extractLearningChartObject(clean);
    if (Object.keys(extracted).length) return extracted;
    const type = clean.match(/\btype\s*:\s*["']([^"']+)["']/i)?.[1] || "bar";
    const labelsRaw = clean.match(/\blabels\s*:\s*\[([\s\S]*?)\]/i)?.[1] || "";
    const labels = Array.from(labelsRaw.matchAll(/["']([^"']+)["']/g)).map((match) => match[1]);
    const datasets = Array.from(clean.matchAll(/\{[^{}]*\bdata\s*:\s*\[([\s\S]*?)\][^{}]*\}/gi))
      .map((match, index) => {
        const block = match[0] || "";
        const label = block.match(/\blabel\s*:\s*["']([^"']+)["']/i)?.[1] || `Series ${index + 1}`;
        const color =
          block.match(/\bbackgroundColor\s*:\s*["']([^"']+)["']/i)?.[1] ||
          block.match(/\bborderColor\s*:\s*["']([^"']+)["']/i)?.[1] ||
          "";
        const data = (match[1] || "")
          .split(",")
          .map((item) => Number(item.trim()))
          .filter((item) => Number.isFinite(item));
        return { label, data, backgroundColor: color, borderColor: color };
      })
      .filter((dataset) => dataset.data.length);
    return labels.length && datasets.length ? { type, data: { labels, datasets } } : {};
  }
}

function LearningChartJsPreview({ source, description }: { source: string; description: string }) {
  const chart = useMemo(() => parseLearningChartJsConfig(source), [source]);
  const data = asRecord(chart.data);
  const labels = learningStringList(data.labels).slice(0, 10);
  const datasets = learningRecords(data.datasets).slice(0, 3);
  const firstValues = learningNumberList(datasets[0]?.data).slice(0, labels.length);
  if (!labels.length || !firstValues.length) {
    return <LearningSourcePreview source={source} label="Chart.js source" />;
  }

  const chartType = textOf(chart.type, "bar").toLowerCase();
  const width = 820;
  const height = 360;
  const margin = { top: 28, right: 28, bottom: 70, left: 64 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const allValues = datasets.flatMap((dataset) => learningNumberList(dataset.data).slice(0, labels.length));
  const maxValue = Math.max(1, ...allValues);
  const minValue = Math.min(0, ...allValues);
  const span = Math.max(1, maxValue - minValue);
  const colors = ["#c33a24", "#2f7d68", "#7b4fd6"];
  const xFor = (index: number, offset = 0) =>
    margin.left + (index + 0.5 + offset) * (plotWidth / Math.max(1, labels.length));
  const yFor = (value: number) => margin.top + ((maxValue - value) / span) * plotHeight;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img">
  <rect width="${width}" height="${height}" rx="14" fill="#fffaf5"/>
  <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotHeight}" stroke="#d8c8b8"/>
  <line x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${margin.left + plotWidth}" y2="${margin.top + plotHeight}" stroke="#d8c8b8"/>
  <text x="${margin.left}" y="20" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#2b2118">${escapeLearningSvgText(description || "Generated chart").slice(0, 86)}</text>
  ${[0, 0.25, 0.5, 0.75, 1]
    .map((tick) => {
      const value = maxValue - tick * span;
      const y = yFor(value);
      return `<line x1="${margin.left}" y1="${y}" x2="${margin.left + plotWidth}" y2="${y}" stroke="#eadfd4"/><text x="${margin.left - 10}" y="${y + 4}" text-anchor="end" font-family="system-ui, sans-serif" font-size="10" fill="#8a7665">${escapeLearningSvgText(String(Math.round(value * 100) / 100))}</text>`;
    })
    .join("")}
  ${labels
    .map((label, index) => {
      const x = xFor(index);
      return `<text x="${x}" y="${height - 34}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="#6f5f52" transform="rotate(-28 ${x} ${height - 34})">${escapeLearningSvgText(label).slice(0, 18)}</text>`;
    })
    .join("")}
  ${datasets
    .map((dataset, datasetIndex) => {
      const values = learningNumberList(dataset.data).slice(0, labels.length);
      const color =
        safeLearningChartColor(
          textOf(dataset.backgroundColor) || textOf(dataset.borderColor),
          colors[datasetIndex % colors.length] || "#c33a24",
        );
      if (chartType.includes("line")) {
        const points = values.map((value, index) => `${xFor(index)} ${yFor(value)}`).join(" ");
        return `<polyline points="${points}" fill="none" stroke="${escapeLearningSvgText(color)}" stroke-width="3"/>${values
          .map((value, index) => `<circle cx="${xFor(index)}" cy="${yFor(value)}" r="4" fill="${escapeLearningSvgText(color)}"/>`)
          .join("")}`;
      }
      const groupWidth = plotWidth / Math.max(1, labels.length);
      const barWidth = Math.max(10, (groupWidth * 0.66) / Math.max(1, datasets.length));
      return values
        .map((value, index) => {
          const x = xFor(index) - (barWidth * datasets.length) / 2 + datasetIndex * barWidth;
          const y = yFor(Math.max(value, 0));
          const baseY = yFor(0);
          return `<rect x="${x}" y="${y}" width="${barWidth - 3}" height="${Math.max(2, baseY - y)}" rx="4" fill="${escapeLearningSvgText(color)}" opacity="0.86"/>`;
        })
        .join("");
    })
    .join("")}
  ${datasets
    .map((dataset, index) => `<circle cx="${margin.left + index * 180}" cy="${height - 14}" r="5" fill="${escapeLearningSvgText(colors[index % colors.length] || "#c33a24")}"/><text x="${margin.left + 10 + index * 180}" y="${height - 10}" font-family="system-ui, sans-serif" font-size="11" fill="#6f5f52">${escapeLearningSvgText(textOf(dataset.label, `Series ${index + 1}`)).slice(0, 24)}</text>`)
    .join("")}
</svg>`;

  return (
    <figure className="rounded-zaki-md border border-zaki-border bg-zaki-base p-3">
      <img
        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
        alt={description || "Generated chart"}
        className="h-auto w-full rounded-zaki-md"
      />
      {description ? <figcaption className="mt-2 text-xs text-zaki-muted">{description}</figcaption> : null}
      <details className="mt-2 text-xs text-zaki-muted">
        <summary className="cursor-pointer">Source</summary>
        <pre className="mt-2 max-h-40 overflow-auto rounded-zaki-md bg-zaki-raised p-3">
          <code>{stripLearningCodeFence(source)}</code>
        </pre>
      </details>
    </figure>
  );
}

function LearningVisualizationPreview({
  renderType,
  language,
  content,
  description,
}: {
  renderType: string;
  language: string;
  content: string;
  description: string;
}) {
  const kind = (renderType || language || "").toLowerCase();
  if (kind === "svg" || language === "svg" || content.trim().startsWith("<svg")) {
    return <LearningSvgPreview source={content} description={description} />;
  }
  if (kind === "mermaid" || language === "mermaid") {
    return <LearningMermaidPreview source={content} description={description} />;
  }
  if (kind === "chartjs" || kind === "chart.js" || language === "javascript" || language === "js") {
    return <LearningChartJsPreview source={content} description={description} />;
  }
  return <LearningSourcePreview source={content} label={kind === "chartjs" ? "Chart.js source" : "Artifact source"} />;
}

function LearningSourceList({ metadata }: { metadata: Item }) {
  const sources = learningSourceRecords(metadata).slice(0, 6);
  if (!sources.length) return null;
  return (
    <div className="mt-3 rounded-zaki-md border border-zaki-border bg-zaki-base p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-zaki-text">
        <FileSearch className="size-3.5 text-zaki-muted" />
        Sources
      </div>
      <ul className="space-y-1.5">
        {sources.map((source, index) => {
          const title =
            textOf(source.title) ||
            textOf(source.name) ||
            textOf(source.source) ||
            textOf(source.url) ||
            `Source ${index + 1}`;
          const url = safeLearningSourceUrl(source.url) || safeLearningSourceUrl(source.link);
          const snippet = textOf(source.snippet) || textOf(source.summary) || textOf(source.description);
          return (
            <li key={`${title}-${index}`} className="text-xs leading-5 text-zaki-muted">
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-zaki-text underline-offset-2 hover:underline"
                >
                  {title}
                </a>
              ) : (
                <span className="font-medium text-zaki-text">{title}</span>
              )}
              {snippet ? <span className="ml-1">{snippet}</span> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function learningAssetUrl(url: string, type: string) {
  if (!url) return "";
  if (/^data:/i.test(url)) {
    if (type === "image" && /^data:image\//i.test(url)) return url;
    if (type === "video" && /^data:video\//i.test(url)) return url;
    return "";
  }
  if (/^(https?:|blob:|data:)/i.test(url)) return url;
  if (url.startsWith("/api/outputs/")) {
    return buildApiUrl(`/api/learning/outputs/${url.slice("/api/outputs/".length)}`);
  }
  if (url.startsWith("/api/attachments/")) {
    return buildApiUrl(`/api/learning/attachments/${url.slice("/api/attachments/".length)}`);
  }
  if (url.startsWith("/api/v1/")) {
    return buildApiUrl(`/api/learning/${url.slice("/api/v1/".length)}`);
  }
  return buildApiUrl(url);
}

function LearningAdvancedResultBlock({ message }: { message: TutorChatMessage }) {
  const metadata = learningResultMetadata(message);
  if (!Object.keys(metadata).length) return null;

  if (message.capability === "deep_research") {
    const outlinePreview = asRecord(metadata.outline_preview);
    const subTopics = learningRecords(metadata.sub_topics).length
      ? learningRecords(metadata.sub_topics)
      : learningRecords(outlinePreview.sub_topics);
    if (!subTopics.length) return null;
    const topic = textOf(metadata.topic) || textOf(outlinePreview.topic) || "Research Outline";
    return (
      <section className="mt-3 rounded-zaki-lg border border-zaki-border bg-zaki-raised p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-zaki-text">
          <Microscope className="size-3.5 text-zaki-muted" />
          Research Outline
          <span className="truncate font-normal text-zaki-muted">{topic}</span>
        </div>
        <ol className="space-y-2">
          {subTopics.map((item, index) => (
            <li key={`${topic}-${index}`} className="rounded-zaki-md border border-zaki-border bg-zaki-base px-3 py-2">
              <div className="text-xs font-semibold text-zaki-text">
                {textOf(item.title, `Sub-topic ${index + 1}`)}
              </div>
              {textOf(item.overview) ? (
                <div className="mt-1 text-xs leading-5 text-zaki-muted">{textOf(item.overview)}</div>
              ) : null}
            </li>
          ))}
        </ol>
        <LearningSourceList metadata={metadata} />
      </section>
    );
  }

  if (message.capability === "visualize") {
    const renderType = textOf(metadata.render_type, "visualization");
    const code = asRecord(metadata.code);
    const language = textOf(code.language).toLowerCase();
    const content = textOf(code.content);
    const analysis = asRecord(metadata.analysis);
    if (!content && !textOf(metadata.response)) return null;
    const description = textOf(analysis.description) || textOf(metadata.response);
    const responseText = removeLearningFencedCode(textOf(metadata.response));
    return (
      <section className="mt-3 rounded-zaki-lg border border-zaki-border bg-zaki-raised p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-zaki-text">
          <BarChart3 className="size-3.5 text-zaki-muted" />
          Visualization
          <span className="rounded-zaki-sm bg-zaki-hover px-1.5 py-0.5 font-mono text-[10px] text-zaki-muted">
            {renderType}
          </span>
        </div>
        {responseText ? (
          <p className="mb-2 text-xs leading-5 text-zaki-muted">{responseText}</p>
        ) : null}
        {textOf(analysis.description) ? (
          <p className="mb-2 text-xs leading-5 text-zaki-muted">{textOf(analysis.description)}</p>
        ) : null}
        {content ? (
          <LearningVisualizationPreview
            renderType={renderType}
            language={language}
            content={content}
            description={description}
          />
        ) : null}
      </section>
    );
  }

  if (message.capability === "math_animator") {
    const artifacts = learningRecords(metadata.artifacts);
    const code = asRecord(metadata.code);
    const response = textOf(metadata.response);
    const source = textOf(code.content);
    if (!artifacts.length && !source && !response) return null;
    return (
      <section className="mt-3 space-y-3 rounded-zaki-lg border border-zaki-border bg-zaki-raised p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-zaki-text">
          <Clapperboard className="size-3.5 text-zaki-muted" />
          Math Animator
        </div>
        {response ? <p className="text-xs leading-5 text-zaki-muted">{response}</p> : null}
        {artifacts.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {artifacts.map((artifact, index) => {
              const type = textOf(artifact.type);
              const url = learningAssetUrl(textOf(artifact.url), type);
              const label = textOf(artifact.label) || textOf(artifact.filename, `Artifact ${index + 1}`);
              if (!url) return null;
              return (
                <LearningMathArtifactFigure
                  key={`${url}-${index}`}
                  artifact={artifact}
                  index={index}
                  type={type}
                  url={url}
                  label={label}
                />
              );
            })}
          </div>
        ) : null}
        {source ? (
          <details className="rounded-zaki-md border border-zaki-border bg-zaki-base">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-zaki-text">
              View Manim Code
            </summary>
            <pre className="max-h-[320px] overflow-auto border-t border-zaki-border p-3 text-xs leading-5 text-zaki-text">
              <code>{source}</code>
            </pre>
          </details>
        ) : null}
      </section>
    );
  }

  return null;
}

function LearningMathArtifactFigure({
  artifact,
  index,
  type,
  url,
  label,
}: {
  artifact: Item;
  index: number;
  type: string;
  url: string;
  label: string;
}) {
  const asset = useLearningProtectedAsset(url);
  const filename = textOf(artifact.filename) || undefined;
  const linkHref = asset.src || undefined;
  const unavailable = asset.status === "error";

  return (
    <figure key={`${url}-${index}`} className="rounded-zaki-md border border-zaki-border bg-zaki-base p-2">
      {asset.status === "loading" ? (
        <div className="flex min-h-24 items-center justify-center rounded-zaki-sm bg-zaki-raised text-xs text-zaki-muted">
          Loading artifact...
        </div>
      ) : unavailable ? (
        <div className="flex min-h-24 items-center justify-center rounded-zaki-sm border border-dashed border-zaki-border bg-zaki-raised px-3 text-center text-xs text-zaki-muted">
          Artifact preview is unavailable. Refresh the page and try again.
        </div>
      ) : type === "video" ? (
        <video
          src={asset.src}
          controls
          playsInline
          preload="metadata"
          aria-label={label}
          className="aspect-video w-full rounded-zaki-sm bg-black object-contain"
        />
      ) : (
        <img src={asset.src} alt={label} className="max-h-[280px] w-full rounded-zaki-sm object-contain" />
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        <figcaption className="min-w-0 truncate text-[11px] text-zaki-muted">{label}</figcaption>
        <div className="flex shrink-0 items-center gap-1.5">
          <a
            href={linkHref}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!linkHref}
            onClick={(event) => {
              if (!linkHref) event.preventDefault();
            }}
            className={cn(
              "inline-flex items-center gap-1 rounded-zaki-sm px-1.5 py-1 text-[11px] font-medium text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text",
              !linkHref && "pointer-events-none opacity-50",
            )}
          >
            <ExternalLink className="size-3" />
            Open
          </a>
          <a
            href={linkHref}
            download={filename}
            aria-disabled={!linkHref}
            onClick={(event) => {
              if (!linkHref) event.preventDefault();
            }}
            className={cn(
              "inline-flex items-center gap-1 rounded-zaki-sm px-1.5 py-1 text-[11px] font-medium text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text",
              !linkHref && "pointer-events-none opacity-50",
            )}
          >
            <Download className="size-3" />
            Download
          </a>
        </div>
      </div>
    </figure>
  );
}

function learningAdvancedResultMarkdown(message: TutorChatMessage) {
  const metadata = learningResultMetadata(message);
  if (!Object.keys(metadata).length) return "";

  if (message.capability === "deep_research") {
    const outlinePreview = asRecord(metadata.outline_preview);
    const subTopics = learningRecords(metadata.sub_topics).length
      ? learningRecords(metadata.sub_topics)
      : learningRecords(outlinePreview.sub_topics);
    if (!subTopics.length) return "";
    const topic = textOf(metadata.topic) || textOf(outlinePreview.topic) || "Research Outline";
    const sources = learningSourceRecords(metadata);
    return [
      "### Research Outline",
      "",
      `Topic: ${topic}`,
      "",
      ...subTopics.flatMap((item, index) => [
        `${index + 1}. ${textOf(item.title, `Sub-topic ${index + 1}`)}`,
        textOf(item.overview) ? `   ${textOf(item.overview)}` : "",
      ]),
      sources.length ? "" : "",
      sources.length ? "Sources:" : "",
      ...sources.map((source, index) => {
        const title =
          textOf(source.title) ||
          textOf(source.name) ||
          textOf(source.source) ||
          textOf(source.url) ||
          `Source ${index + 1}`;
        const url = safeLearningSourceUrl(source.url) || safeLearningSourceUrl(source.link);
        return `- ${title}${url ? `: ${url}` : ""}`;
      }),
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (message.capability === "visualize") {
    const renderType = textOf(metadata.render_type, "visualization");
    const code = asRecord(metadata.code);
    const content = textOf(code.content);
    const language = textOf(code.language, renderType);
    const parts = ["### Visualization", "", `Render type: ${renderType}`];
    if (textOf(metadata.response)) parts.push("", textOf(metadata.response));
    if (content) parts.push("", `\`\`\`${language}`, content, "```");
    return parts.join("\n");
  }

  if (message.capability === "math_animator") {
    const artifacts = learningRecords(metadata.artifacts);
    const code = asRecord(metadata.code);
    const source = textOf(code.content);
    const parts = ["### Math Animator"];
    if (textOf(metadata.response)) parts.push("", textOf(metadata.response));
    if (artifacts.length) {
      parts.push("", "Artifacts:");
      artifacts.forEach((artifact) => {
        const label = textOf(artifact.label) || textOf(artifact.filename, "Artifact");
        const url = textOf(artifact.url);
        parts.push(`- ${label}${url ? `: ${url}` : ""}`);
      });
    }
    if (source) {
      parts.push("", "```python", source, "```");
    }
    return parts.join("\n");
  }

  return "";
}

function primaryLearningMessageContent(message: TutorChatMessage) {
  const content = message.content.trim();
  if (message.capability === "visualize" && Object.keys(learningResultMetadata(message)).length) {
    return removeLearningFencedCode(content);
  }
  return message.content;
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
  capabilityPreset,
  requestedSessionId,
  requestedView,
  knowledgeItems,
  sessionItems,
  bookItems,
  notebookItems,
  questionItems,
  skillItems,
  readOnly = false,
  readOnlyReason = "Learn is read-only.",
}: {
  kbName: string;
  setKbName: (name: string) => void;
  capabilityPreset: string;
  requestedSessionId: string;
  requestedView: string;
  knowledgeItems: Item[];
  sessionItems: Item[];
  bookItems: Item[];
  notebookItems: Item[];
  questionItems: Item[];
  skillItems: Item[];
  readOnly?: boolean;
  readOnlyReason?: string;
}) {
  const authUser = useAuthStore((state) => state.user);
  const pendingDraftStorageKey = useMemo(() => pendingLearningDraftStorageKey(authUser), [
    authUser?.id,
    authUser?.username,
  ]);
  const studyProfileStorageKey = useMemo(() => {
    return `${STUDY_PROFILE_STORAGE_KEY}:${learningUserStorageKey(authUser)}`;
  }, [authUser?.id, authUser?.username]);
  const isPrimaryChatView = ((requestedView || "chat").trim().toLowerCase() || "chat") === "chat";
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
  const [saveNotebookOpen, setSaveNotebookOpen] = useState(false);
  const [saveNotebookIds, setSaveNotebookIds] = useState<string[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [socketAuthReady, setSocketAuthReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [runState, setRunState] = useState<LearningRunState>({
    phase: "idle",
    label: "Ready",
  });
  const [lastTurnRetryLabel, setLastTurnRetryLabel] = useState("");
  const [studyProfile, setStudyProfile] = useState<LearningStudyProfile>(() =>
    readLearningStudyProfile(studyProfileStorageKey),
  );
  const [studyDraft, setStudyDraft] = useState<LearningStudyProfile>(() =>
    readLearningStudyProfile(studyProfileStorageKey),
  );
  const [studyPanelOpen, setStudyPanelOpen] = useState(false);
  const [studyDraftDirty, setStudyDraftDirty] = useState(false);
  const [completingStudyTaskId, setCompletingStudyTaskId] = useState("");
  const sessionScope = (requestedView || "chat").trim().toLowerCase() || "chat";
  const sessionStorageKey = `zaki.learn.sessionId.${sessionScope}`;
  const [restoredSessionId, setRestoredSessionId] = useState(
    () =>
      requestedSessionId ||
      window.localStorage.getItem(sessionStorageKey) ||
      (sessionScope === "chat" ? window.localStorage.getItem("zaki.learn.sessionId") : "") ||
      "",
  );
  const [sessionId, setSessionId] = useState(
    () => restoredSessionId || makeClientId("learn-session"),
  );
  const socketRef = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const capabilityMenuRef = useRef<HTMLDivElement | null>(null);
  const toolMenuRef = useRef<HTMLDivElement | null>(null);
  const spaceMenuRef = useRef<HTMLDivElement | null>(null);
  const dragCounterRef = useRef(0);
  const attachmentErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attachmentsRef = useRef<LearningAttachment[]>([]);
  const messagesRef = useRef<TutorChatMessage[]>([]);
  const thinkingRef = useRef<string[]>([]);
  const lastTurnRetryRef = useRef<LearningTurnRetryDraft | null>(null);
  const activeAssistantIdRef = useRef<string | null>(null);
  const activeTurnIdRef = useRef<string | null>(null);
  const restoredActiveTurnIdRef = useRef("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  const studyStateQuery = useQuery({
    queryKey: learningKeys.study,
    queryFn: getLearningStudyState,
    enabled: isPrimaryChatView,
    staleTime: 60_000,
  });
  const assertChatWritesAllowed = useCallback(() => {
    if (!readOnly) return;
    throw new Error(readOnlyReason);
  }, [readOnly, readOnlyReason]);

  const saveStudyProfileMutation = useMutation({
    mutationFn: (profile: LearningStudyProfile) => {
      assertChatWritesAllowed();
      return updateLearningStudyProfile(profile);
    },
    onSuccess: (payload) => {
      const nextProfile = payload.profile;
      setStudyProfile(nextProfile);
      setStudyDraft(nextProfile);
      setStudyDraftDirty(false);
      writeLearningStudyProfile(nextProfile, studyProfileStorageKey);
      setQuizConfig((config) => ({ ...config, difficulty: nextProfile.difficulty || "medium" }));
      void queryClient.invalidateQueries({ queryKey: learningKeys.study });
      setStudyPanelOpen(false);
      toast.success("Study setup saved");
    },
    onError: (error) => {
      toast.error(error.message || "Study setup could not be saved");
    },
  });

  const createStudyPlanMutation = useMutation({
    mutationFn: (profile: LearningStudyProfile) => {
      assertChatWritesAllowed();
      return createLearningStudyPlan(profile);
    },
    onSuccess: (payload) => {
      const nextProfile = payload.profile;
      setStudyProfile(nextProfile);
      setStudyDraft(nextProfile);
      setStudyDraftDirty(false);
      writeLearningStudyProfile(nextProfile, studyProfileStorageKey);
      setQuizConfig((config) => ({ ...config, difficulty: nextProfile.difficulty || "medium" }));
      void queryClient.invalidateQueries({ queryKey: learningKeys.study });
      setStudyPanelOpen(false);
      toast.success("Study plan saved");
      selectCapability("");
      setInput(buildStudyPlanPrompt(nextProfile));
    },
    onError: (error) => {
      toast.error(error.message || "Study plan could not be created");
    },
  });

  const createStudyTaskMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createLearningStudyTask>[0]) => {
      assertChatWritesAllowed();
      return createLearningStudyTask(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: learningKeys.study });
      toast.success("Added to study plan");
    },
    onError: (error) => {
      toast.error(error.message || "Could not add this item to the study plan");
    },
  });

  const completeStudyTaskMutation = useMutation({
    mutationFn: (taskId: string) => {
      assertChatWritesAllowed();
      return completeLearningStudyTask(taskId);
    },
    onMutate: (taskId) => {
      setCompletingStudyTaskId(taskId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: learningKeys.study });
      toast.success("Study task completed");
    },
    onError: (error) => {
      toast.error(error.message || "Study task could not be completed");
    },
    onSettled: () => {
      setCompletingStudyTaskId("");
    },
  });

  const persistSessionId = useCallback((
    nextSessionId: string,
    mode: "push" | "replace" = "replace",
    options: { restore?: boolean } = {},
  ) => {
    const trimmed = nextSessionId.trim();
    if (!trimmed) return;
    setSessionId(trimmed);
    if (options.restore !== false) {
      setRestoredSessionId(trimmed);
    }
    window.localStorage.setItem(sessionStorageKey, trimmed);
    if (sessionScope === "chat") window.localStorage.setItem("zaki.learn.sessionId", trimmed);
    const params = new URLSearchParams(window.location.search);
    params.set("view", requestedView || params.get("view") || "chat");
    if (capability) params.set("capability", capability);
    else params.delete("capability");
    params.set("session", trimmed);
    const nextUrl = `/learn?${params.toString()}`;
    if (window.location.pathname === "/learn") {
      if (mode === "push") window.history.pushState(null, "", nextUrl);
      else window.history.replaceState(null, "", nextUrl);
    }
  }, [capability, requestedView, sessionScope, sessionStorageKey]);

  useEffect(() => {
    const nextProfile = readLearningStudyProfile(studyProfileStorageKey);
    setStudyProfile(nextProfile);
    setStudyDraft(nextProfile);
    setStudyDraftDirty(false);
    setStudyPanelOpen(false);
  }, [isPrimaryChatView, studyProfileStorageKey]);

  useEffect(() => {
    if (!studyStateQuery.data?.profile) return;
    if (studyPanelOpen && studyDraftDirty) return;
    const nextProfile = studyStateQuery.data.profile;
    setStudyProfile(nextProfile);
    setStudyDraft(nextProfile);
    setStudyDraftDirty(false);
    writeLearningStudyProfile(nextProfile, studyProfileStorageKey);
  }, [studyDraftDirty, studyPanelOpen, studyProfileStorageKey, studyStateQuery.data?.profile]);

  useEffect(() => {
    const scopedSessionId =
      requestedSessionId ||
      window.localStorage.getItem(sessionStorageKey) ||
      (sessionScope === "chat" ? window.localStorage.getItem("zaki.learn.sessionId") : "") ||
      "";
    setRestoredSessionId(scopedSessionId);
    setSessionId(scopedSessionId || makeClientId("learn-session"));
    if (scopedSessionId) {
      window.localStorage.setItem(sessionStorageKey, scopedSessionId);
      if (sessionScope === "chat") window.localStorage.setItem("zaki.learn.sessionId", scopedSessionId);
      return;
    }
    setMessages([]);
    setThinking([]);
    thinkingRef.current = [];
    activeAssistantIdRef.current = null;
    activeTurnIdRef.current = null;
  }, [requestedSessionId, sessionScope, sessionStorageKey]);

  const restoredSession = useQuery({
    queryKey: [...learningKeys.sessions, "detail", restoredSessionId],
    enabled: Boolean(restoredSessionId),
    queryFn: () => getLearningSession(restoredSessionId),
    refetchInterval: (query) => {
      const root = asRecord(query.state.data);
      return itemList(root, ["active_turns"]).length || textOf(root.active_turn_id) ? 2000 : false;
    },
    retry: false,
  });
  const restoredMessages = useMemo(
    () =>
      itemList(restoredSession.data, ["messages", "items", "history"])
        .map((item, index) => normalizeTutorHistoryMessage(item, index))
        .filter((message): message is TutorChatMessage => Boolean(message)),
    [restoredSession.data],
  );
  const restoredActiveTurnId = useMemo(() => {
    const root = asRecord(restoredSession.data);
    const activeTurn = itemList(root, ["active_turns"])[0];
    return textOf(activeTurn?.id) || textOf(root.active_turn_id);
  }, [restoredSession.data]);

  useEffect(() => {
    restoredActiveTurnIdRef.current = restoredActiveTurnId;
  }, [restoredActiveTurnId]);

  useEffect(() => {
    if (!restoredSessionId || streaming) return;
    setMessages(restoredMessages);
    setThinking([]);
    thinkingRef.current = [];
    activeAssistantIdRef.current = null;
    activeTurnIdRef.current = null;
  }, [restoredMessages, restoredSessionId, streaming]);

  useEffect(() => {
    if (!restoredActiveTurnId) return;
    activeTurnIdRef.current = restoredActiveTurnId;
    setStreaming(true);
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "subscribe_turn",
          turn_id: restoredActiveTurnId,
          after_seq: 0,
        }),
      );
    }
  }, [restoredActiveTurnId]);

  useEffect(() => {
    if (!capabilityPreset) {
      setCapability("");
      setCapabilityMenuOpen(false);
      return;
    }
    if (!learningCapabilities.some((entry) => entry.value === capabilityPreset)) return;
    setCapability(capabilityPreset);
    setCapabilityMenuOpen(false);
  }, [capabilityPreset]);

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

  useEffect(() => {
    if (!isResearchMode) return;
    setResearchConfig((current) => ({
      ...current,
      mode: current.mode || defaultResearchConfig.mode,
      depth: current.depth || defaultResearchConfig.depth,
      sources: current.sources.length ? current.sources : defaultResearchConfig.sources,
    }));
    setSelectedResearchSources((current) =>
      current.size ? current : new Set(defaultResearchConfig.sources),
    );
  }, [isResearchMode]);

  const canSend =
    connected &&
    !streaming &&
    !readOnly &&
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
    if (!capabilityMenuOpen && !toolMenuOpen && !spaceMenuOpen) return undefined;

    const closeMenusForOutsideTarget = (target: Node) => {
      if (capabilityMenuOpen && !capabilityMenuRef.current?.contains(target)) {
        setCapabilityMenuOpen(false);
      }
      if (toolMenuOpen && !toolMenuRef.current?.contains(target)) {
        setToolMenuOpen(false);
      }
      if (spaceMenuOpen && !spaceMenuRef.current?.contains(target)) {
        setSpaceMenuOpen(false);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node) closeMenusForOutsideTarget(event.target);
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setCapabilityMenuOpen(false);
      setToolMenuOpen(false);
      setSpaceMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [capabilityMenuOpen, toolMenuOpen, spaceMenuOpen]);

  useEffect(() => {
    if (!saveNotebookOpen || saveNotebookIds.length || !notebookItems.length) return;
    const firstId = itemId(notebookItems[0]!, "notebook-1");
    if (firstId) setSaveNotebookIds([firstId]);
  }, [notebookItems, saveNotebookIds.length, saveNotebookOpen]);

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
    setRunState({ phase: "connecting", label: "Connecting to ZAKI learning" });
    if (!socket) {
      setConnected(false);
      setRunState({ phase: "error", label: "Learning chat connection unavailable." });
      return undefined;
    }
    socket.onopen = () => {
      setConnected(true);
      setRunState((current) =>
        current.phase === "connecting" ? { phase: "idle", label: "Ready" } : current,
      );
      const turnId = restoredActiveTurnIdRef.current;
      if (turnId) {
        socket.send(
          JSON.stringify({
            type: "subscribe_turn",
            turn_id: turnId,
            after_seq: 0,
          }),
        );
      }
    };
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
      if (nextSessionId) persistSessionId(nextSessionId, "replace", { restore: false });
      if (nextTurnId) activeTurnIdRef.current = nextTurnId;

      if (eventType === "session") {
        const metadata = asRecord(payload.metadata);
        const metadataSessionId = textOf(metadata.session_id);
        if (metadataSessionId) persistSessionId(metadataSessionId, "replace", { restore: false });
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
          setRunState({ phase: "working", label: content });
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
        setMessages((items) => {
          const existingIndex = items.findIndex((item) => item.id === assistantId);
          if (existingIndex >= 0) {
            return items.map((item, index) =>
              index === existingIndex
                ? {
                    ...item,
                    content: content && content.length > item.content.length ? content : item.content,
                    events: [...(item.events ?? []), payload],
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
              events: [payload],
              thinking: thinkingSnapshot.length ? [...thinkingSnapshot] : undefined,
            },
          ];
        });
        activeAssistantIdRef.current = null;
        activeTurnIdRef.current = null;
        thinkingRef.current = [];
        setThinking([]);
        setRunState({ phase: "complete", label: "Answer ready" });
        return;
      }

      if (eventType === "done") {
        activeAssistantIdRef.current = null;
        activeTurnIdRef.current = null;
        thinkingRef.current = [];
        setThinking([]);
        setStreaming(false);
        setRunState({ phase: "complete", label: "Answer ready" });
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
        setRunState({
          phase: "error",
          label: content ? `Learning stream error: ${content}` : "Learning stream returned an error.",
        });
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
      setRunState({ phase: "error", label: "Learning chat connection failed." });
    };
    socket.onclose = () => {
      setConnected(false);
      setStreaming(false);
      setRunState((current) =>
        current.phase === "working" || current.phase === "connecting"
          ? { phase: "error", label: "Learning chat disconnected." }
          : current,
      );
    };
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [persistSessionId, socketAuthReady]);

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
    setSpaceMenuOpen(false);
  };

  const startStarterAction = (action: (typeof learningStarterActions)[number]) => {
    if ("opensStudySetup" in action && action.opensStudySetup) {
      setStudyPanelOpen(true);
      return;
    }
    selectCapability(action.capability);
    setInput(action.prompt);
    setPanelCollapsed(action.capability ? false : panelCollapsed);
  };

  useEffect(() => {
    window.localStorage.removeItem(LEGACY_PENDING_DRAFT_STORAGE_KEY);
    const raw = window.localStorage.getItem(pendingDraftStorageKey);
    if (!raw) return;
    window.localStorage.removeItem(pendingDraftStorageKey);
    try {
      const parsed = asRecord(JSON.parse(raw));
      const createdAt = Date.parse(textOf(parsed.createdAt));
      if (Number.isFinite(createdAt) && Date.now() - createdAt > 5 * 60 * 1000) return;
      const content = textOf(parsed.content);
      const nextCapability = textOf(parsed.capability);
      if (!content) return;
      if (nextCapability && learningCapabilities.some((entry) => entry.value === nextCapability)) {
        selectCapability(nextCapability);
      } else {
        selectCapability("");
      }
      setInput(content);
    } catch {
      // Invalid local handoff payloads are ignored; they are same-device convenience state.
    }
  }, [pendingDraftStorageKey]);

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

  const saveStudyProfile = (nextProfile: LearningStudyProfile) => {
    if (readOnly) {
      toast.error(readOnlyReason);
      return;
    }
    saveStudyProfileMutation.mutate(nextProfile);
  };

  const buildStudyPlanPrompt = (profile: LearningStudyProfile) => {
    const lines = [
      `Build me a practical study plan${profile.course ? ` for ${profile.course}` : ""}.`,
      profile.examDate ? `Exam or deadline: ${profile.examDate}.` : "",
      profile.goal ? `Goal: ${profile.goal}.` : "",
      profile.topics ? `Topics: ${profile.topics}.` : "",
      profile.weakTopics ? `Weak topics: ${profile.weakTopics}.` : "",
      profile.weeklyHours ? `Available study time: ${profile.weeklyHours} hours per week.` : "",
      profile.preferredStyle && profile.preferredStyle !== "balanced"
        ? `Preferred study style: ${profile.preferredStyle}.`
        : "",
      "Include a weekly schedule, retrieval practice, spaced review, and what I should save to my notebook.",
    ].filter(Boolean);
    return lines.join("\n");
  };

  const startStudyPlan = () => {
    if (readOnly) {
      toast.error(readOnlyReason);
      return;
    }
    const nextProfile = studyDraft;
    createStudyPlanMutation.mutate(nextProfile);
  };

  const startStudyTask = (task: Item) => {
    const source = asRecord(task.source);
    const route = textOf(source.route, requestedView || "chat");
    const nextCapability = textOf(source.capability);
    if (nextCapability && learningCapabilities.some((entry) => entry.value === nextCapability)) {
      selectCapability(nextCapability);
    } else {
      selectCapability("");
    }
    const promptParts = [
      `Help me complete this study task: ${textOf(task.title, "Study task")}.`,
      textOf(task.description),
      studyProfile.course ? `Course: ${studyProfile.course}.` : "",
      studyProfile.topics ? `Topics: ${studyProfile.topics}.` : "",
      studyProfile.weakTopics ? `Weak topics: ${studyProfile.weakTopics}.` : "",
      route === "notebooks"
        ? "Guide me on what to save into my notebook and what to review from it."
        : "",
      route === "quiz" ? "Generate answer-keyed questions with explanations." : "",
      route === "solve" ? "Give me one practice problem first, then solve it step by step." : "",
      route === "visualize" ? "Create a diagram or animation plan for the hardest concept." : "",
    ].filter(Boolean);
    setInput(promptParts.join("\n"));
  };

  const completeStudyTask = (taskId: string) => {
    if (readOnly) {
      toast.error(readOnlyReason);
      return;
    }
    if (!taskId || completeStudyTaskMutation.isPending) return;
    completeStudyTaskMutation.mutate(taskId);
  };

  const applyStudyAction = (action: LearningStudyAction, message: TutorChatMessage) => {
    if (readOnly) {
      toast.error(readOnlyReason);
      return;
    }
    if (action === "save") {
      setSaveNotebookOpen(true);
      return;
    }
    const excerpt = compactMessageExcerpt(message.content);
    if (action === "study_plan") {
      createStudyTaskMutation.mutate({
        kind: message.capability === "deep_question" ? "quiz" : "review",
        title: `Review: ${compactMessageExcerpt(message.content, 96) || "Saved learning item"}`,
        description: "Review this answer and turn it into retained understanding.",
        source: {
          route: requestedView || "chat",
          sessionId,
          messageId: message.id,
          capability: message.capability || "chat",
          excerpt,
        },
      });
      return;
    }
    if (action === "quiz") {
      selectCapability("deep_question");
      setQuizConfig((config) => ({
        ...config,
        difficulty: studyProfile.difficulty || config.difficulty,
        preference: "Include the answer key, explanations, and one follow-up review prompt per question.",
      }));
      setInput(`Create a focused quiz from this material:\n\n${excerpt}`);
      return;
    }
    if (action === "flashcards") {
      selectCapability("deep_question");
      setQuizConfig((config) => ({
        ...config,
        question_type: "short_answer",
        difficulty: studyProfile.difficulty || config.difficulty,
        preference: "Generate concise flashcards with front/back pairs, answer keys, and one spaced-review hint per card.",
      }));
      setInput(`Generate flashcards from this material. Use front/back format and keep each card atomic:\n\n${excerpt}`);
      return;
    }
    if (action === "lesson") {
      selectCapability("");
      setInput(
        `Turn this into a structured lesson/book outline with sections, examples, practice checks, and notebook-ready summary:\n\n${excerpt}`,
      );
      return;
    }
    if (action === "check_answer") {
      selectCapability("deep_solve");
      setInput(
        `Check my answer against this material. Mark what is correct, what is wrong, explain the fix, and give a confidence rating.\n\nMaterial:\n${excerpt}\n\nMy answer:\n`,
      );
      return;
    }
    if (action === "regenerate") {
      selectCapability(message.capability && message.capability !== "chat" ? message.capability : "");
      setInput(
        `Regenerate this with stricter quality controls. Validate any answer key, cite sources when relevant, mark uncertainty, and make the explanation clearer.\n\nPrevious output:\n${excerpt}`,
      );
      return;
    }
    if (action === "simplify") {
      selectCapability("");
      setInput(`Explain this more simply, then give me a quick check question:\n\n${excerpt}`);
      return;
    }
    if (action === "practice") {
      selectCapability("deep_solve");
      setInput(`Give me one similar practice problem, let me try first, then solve it step by step:\n\n${excerpt}`);
      return;
    }
    if (action === "visualize") {
      selectCapability("visualize");
      setInput(`Create a clear study diagram for this concept:\n\n${excerpt}`);
      return;
    }
    selectCapability("deep_research");
    setInput(`Research this topic and give me a concise study brief with sources:\n\n${excerpt}`);
  };

  const sendMessage = async () => {
    if (readOnly) {
      toast.error(readOnlyReason);
      return;
    }
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
    persistSessionId(sessionId, "replace", { restore: false });
    const userMessage: TutorChatMessage = {
      id: makeClientId("user"),
      role: "user",
      content,
      capability: capability || "chat",
      attachments: sentAttachments,
    };
    const websocketPayload = {
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
    };
    lastTurnRetryRef.current = {
      websocketPayload,
      userMessage,
      label: compactMessageExcerpt(content, 96),
    };
    setLastTurnRetryLabel(compactMessageExcerpt(content, 96));
    setMessages((items) => [...items, userMessage]);
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
    setRunState({ phase: "working", label: "Starting learning turn" });
    activeAssistantIdRef.current = makeClientId("assistant");
    activeTurnIdRef.current = null;
    thinkingRef.current = [];
    setThinking([]);
    socket.send(JSON.stringify(websocketPayload));
  };

  const retryLastTurn = () => {
    const draft = lastTurnRetryRef.current;
    const socket = socketRef.current;
    if (!draft) return;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setRunState({ phase: "error", label: "Learning chat is not connected. Retry when it reconnects." });
      return;
    }
    setMessages((items) => [
      ...items,
      {
        ...draft.userMessage,
        id: makeClientId("retry-user"),
      },
    ]);
    setStreaming(true);
    activeAssistantIdRef.current = makeClientId("assistant");
    activeTurnIdRef.current = null;
    thinkingRef.current = [];
    setThinking([]);
    setRunState({ phase: "working", label: "Retrying last learning turn" });
    socket.send(JSON.stringify(draft.websocketPayload));
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
    setRunState({ phase: "idle", label: "Stopped" });
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) void sendMessage();
    }
  };

  const hasMessages = messages.length > 0 || thinking.length > 0;

  const buildChatMarkdown = () =>
    messages
      .map((message) => {
        const speaker =
          message.role === "user" ? "User" : message.role === "assistant" ? "Assistant" : "System";
        const advancedResult = learningAdvancedResultMarkdown(message);
        return `## ${speaker}\n\n${[message.content, advancedResult].filter(Boolean).join("\n\n")}`;
      })
      .join("\n\n");

  const notebookRecordType = (): "solve" | "question" | "research" | "chat" => {
    if (capability === "deep_solve") return "solve";
    if (capability === "deep_question") return "question";
    if (capability === "deep_research") return "research";
    return "chat";
  };

  const saveChatToNotebook = useMutation({
    mutationFn: () => {
      assertChatWritesAllowed();
      if (!saveNotebookIds.length) throw new Error("Choose at least one notebook.");
      const firstUserMessage = messages.find((message) => message.role === "user");
      const firstAssistantMessage = messages.find((message) => message.role === "assistant");
      const titleSource = textOf(firstUserMessage?.content, activeCapability.label);
      return addLearningNotebookRecordManual({
        notebook_ids: saveNotebookIds,
        record_type: notebookRecordType(),
        title: titleSource.slice(0, 120),
        summary: notebookSummary(firstAssistantMessage?.content, titleSource),
        user_query: textOf(firstUserMessage?.content, titleSource),
        output: buildChatMarkdown(),
        metadata: {
          source: "zaki_learn",
          session_id: sessionId,
          capability,
          capability_label: activeCapability.label,
        },
        kb_name: kbName || null,
      });
    },
    onSuccess: () => {
      toast.success("Saved to notebook");
      setSaveNotebookOpen(false);
      void queryClient.invalidateQueries({ queryKey: learningKeys.notebooks });
    },
    onError: (error) => toast.error(error.message),
  });

  const handleNewChat = () => {
    attachments.forEach((attachment) => {
      if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    });
    setMessages([]);
    setThinking([]);
    setInput("");
    setAttachments([]);
    setSessionId(makeClientId("learn-session"));
    setRestoredSessionId("");
    window.localStorage.removeItem(sessionStorageKey);
    if (sessionScope === "chat") window.localStorage.removeItem("zaki.learn.sessionId");
    const params = new URLSearchParams(window.location.search);
    params.set("view", requestedView || params.get("view") || "chat");
    if (capability) params.set("capability", capability);
    else params.delete("capability");
    params.delete("session");
    if (window.location.pathname === "/learn") {
      window.history.replaceState(null, "", `/learn?${params.toString()}`);
    }
    activeAssistantIdRef.current = null;
    activeTurnIdRef.current = null;
    thinkingRef.current = [];
    setRunState({ phase: "idle", label: "Ready" });
  };

  const handleDownloadMarkdown = () => {
    if (!messages.length) return;
    const markdown = buildChatMarkdown();
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${sessionId}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full min-h-[680px] flex-col overflow-hidden bg-[var(--v2-bg)]">
      <div className="mx-auto flex w-full max-w-[980px] items-center justify-between border-b border-[var(--v2-hairline)] px-4 py-2">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--v2-ink-1)]">
          {activeCapability.label}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSaveNotebookOpen(true)}
            disabled={!messages.length || readOnly}
            className="v2-btn v2-btn--sm"
          >
            Save to Notebook
          </button>
          <button
            type="button"
            onClick={handleDownloadMarkdown}
            disabled={!messages.length}
            title="Download chat history as Markdown"
            className="v2-btn v2-btn--sm"
          >
            Download Markdown
          </button>
          <button
            type="button"
            onClick={handleNewChat}
            className="v2-btn v2-btn--sm"
          >
            New chat
          </button>
        </div>
      </div>
      <div className="mx-auto flex min-h-0 w-full max-w-[980px] flex-1 flex-col overflow-hidden px-4">
        <LearningStudySetupPanel
          profile={studyDraft}
          savedProfile={studyProfile}
          open={studyPanelOpen}
          onOpenChange={setStudyPanelOpen}
          onChange={(nextProfile) => {
            setStudyDraft(nextProfile);
            setStudyDraftDirty(true);
          }}
          onSave={() => saveStudyProfile(studyDraft)}
          onBuildPlan={startStudyPlan}
          notebooksCount={notebookItems.length}
          readOnly={readOnly}
          readOnlyReason={readOnlyReason}
        />
        {readOnly ? (
          <div className="mb-3 border border-[var(--v2-hairline-strong)] bg-[var(--v2-bg-sunken)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--v2-ink-2)]">
            {readOnlyReason}
          </div>
        ) : null}
        {!hasMessages && !studyPanelOpen ? (
          <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-1 pb-36 pt-8">
            <div className="text-center">
              <h1 className="font-mono text-[24px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-ink-1)]">
                What would you like to learn?
              </h1>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--v2-ink-3)]">
                Ask anything - I'm here to help you understand.
              </p>
            </div>
            <div className="mt-7 flex max-w-[720px] flex-wrap justify-center gap-2">
              {learningStarterActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => startStarterAction(action)}
                  disabled={readOnly}
                  className="v2-btn v2-btn--sm"
                >
                  {action.label}
                </button>
              ))}
            </div>
            <LearningStudyPlanHome
              plan={studyStateQuery.data?.plan}
              onBuildPlan={startStudyPlan}
              onOpenSetup={() => setStudyPanelOpen(true)}
              onStartTask={startStudyTask}
              onCompleteTask={completeStudyTask}
              completingTaskId={completingStudyTaskId}
              readOnly={readOnly}
            />
          </div>
        ) : hasMessages ? (
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
                  {primaryLearningMessageContent(message) ? (
                    <div
                      className={cn(
                        "prose prose-sm max-w-none whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--foreground)]",
                        message.role === "system" && "text-amber-700",
                      )}
                    >
                      {primaryLearningMessageContent(message)}
                    </div>
                  ) : null}
                  <LearningAdvancedResultBlock message={message} />
                  {message.role === "assistant" ? (
                    <>
                      <LearningQualityChecklist message={message} />
                      <LearningNextActionRow
                        onAction={(action) => applyStudyAction(action, message)}
                        canSave={notebookItems.length > 0}
                        disabled={readOnly}
                      />
                    </>
                  ) : null}
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
        ) : (
          <div className="min-h-0 flex-1" />
        )}

        <div className={cn("relative z-20 mx-auto w-full shrink-0 pb-5", hasMessages && "pt-1")}>
          {hasMessages ? (
            <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-transparent to-[var(--background)]/72" />
          ) : null}
          <LearningRunStateStrip
            state={runState}
            connected={connected}
            streaming={streaming}
            hasMessages={hasMessages}
            steps={thinking}
            retryLabel={lastTurnRetryLabel}
            onRetry={runState.phase === "error" && lastTurnRetryRef.current ? retryLastTurn : undefined}
          />
          <div
        className={cn(
          "relative border bg-[var(--v2-bg-raised)] transition-colors",
          dragging
            ? "border-[var(--v2-accent)] bg-[var(--v2-bg-sunken)]"
            : "border-[var(--v2-hairline-strong)]",
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {dragging ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center border border-dashed border-[var(--v2-accent)] bg-[var(--v2-bg-sunken)]">
            <div className="flex flex-col items-center gap-1 font-mono uppercase tracking-[0.12em] text-[var(--v2-accent)]">
              <Paperclip size={22} strokeWidth={1.6} />
              <span className="text-[12px] font-medium">Drop files here</span>
              <span className="text-[10px] text-[var(--v2-ink-3)]">
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
        <div className="border-t border-[var(--v2-hairline)] px-3 py-2">
          <div className="flex items-center gap-2 max-sm:flex-wrap">
            <div ref={capabilityMenuRef} className="relative shrink-0">
              <button
                type="button"
                aria-label="Learning capability menu"
                onClick={() => {
                  setCapabilityMenuOpen((open) => !open);
                  setToolMenuOpen(false);
                  setSpaceMenuOpen(false);
                }}
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

            <div className="flex min-w-0 flex-1 items-center gap-1 max-sm:min-w-[calc(100%-48px)] max-sm:overflow-hidden">
              {isResearchMode ? (
                <div ref={toolMenuRef} className="relative flex items-center gap-0.5">
                  <button
                    type="button"
                    aria-label="Learning sources menu"
                    onClick={() => {
                      setToolMenuOpen((open) => !open);
                      setCapabilityMenuOpen(false);
                      setSpaceMenuOpen(false);
                    }}
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
                <div ref={toolMenuRef} className="relative flex items-center gap-0.5">
                  <button
                    type="button"
                    aria-label="Learning tools menu"
                    onClick={() => {
                      setToolMenuOpen((open) => !open);
                      setCapabilityMenuOpen(false);
                      setSpaceMenuOpen(false);
                    }}
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

              <div ref={spaceMenuRef} className="relative flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label="Learning space context menu"
                  onClick={() => {
                    setSpaceMenuOpen((open) => !open);
                    setCapabilityMenuOpen(false);
                    setToolMenuOpen(false);
                  }}
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

            <div className="ml-auto flex shrink-0 items-center gap-1.5 max-sm:ml-0">
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
      {saveNotebookOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-zaki-lg border border-zaki-border bg-zaki-base shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-zaki-border px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-zaki-text">Save to Notebook</h2>
                <p className="mt-1 text-xs leading-relaxed text-zaki-muted">
                  Choose one or more notebooks. ZAKI will save this session with a short summary.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSaveNotebookOpen(false)}
                className="rounded-zaki-md p-1 text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text"
                title="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="max-h-[360px] overflow-y-auto px-5 py-4">
              {notebookItems.length ? (
                <div className="space-y-2">
                  {notebookItems.map((notebook, index) => {
                    const id = itemId(notebook, `notebook-${index + 1}`);
                    const selected = saveNotebookIds.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setSaveNotebookIds((current) =>
                            current.includes(id)
                              ? current.filter((value) => value !== id)
                              : [...current, id],
                          );
                        }}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-zaki-lg border p-3 text-left transition-colors",
                          selected
                            ? "border-zaki-brand/50 bg-zaki-brand/10"
                            : "border-zaki-border bg-zaki-raised hover:bg-zaki-hover",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded border",
                            selected
                              ? "border-zaki-brand bg-zaki-brand text-white"
                              : "border-zaki-border bg-zaki-base",
                          )}
                        >
                          {selected ? <CheckCircle2 className="size-3" /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-zaki-text">
                            {itemTitle(notebook, id)}
                          </span>
                          <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-zaki-muted">
                            {textOf(notebook.description) || "No description."}
                          </span>
                          <span className="mt-2 block text-[11px] text-zaki-muted">
                            {displayCount(notebook) || "0"} records
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-zaki-lg border border-dashed border-zaki-border px-6 py-10 text-center text-sm text-zaki-muted">
                  Create a notebook first, then return here to save this chat.
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-zaki-border px-5 py-4">
              <span className="text-xs text-zaki-muted">
                {saveNotebookIds.length} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSaveNotebookOpen(false)}
                  className="h-9 rounded-zaki-md border border-zaki-border px-3 text-sm font-medium text-zaki-text hover:bg-zaki-hover"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!messages.length || !saveNotebookIds.length || saveChatToNotebook.isPending}
                  onClick={() => saveChatToNotebook.mutate()}
                  className="inline-flex h-9 items-center gap-2 rounded-zaki-md bg-zaki-brand px-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saveChatToNotebook.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <NotebookPen className="size-4" />
                  )}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
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
  recentActivityItems,
  onOpenChatSession,
  onOpenQuestion,
  onStartStudyFromNotebook,
}: {
  notebookName: string;
  setNotebookName: (value: string) => void;
  createNotebook: UseMutationResult<unknown, Error, NotebookCreateDraft, unknown>;
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
  recentActivityItems: Item[];
  onOpenChatSession: (sessionId: string) => void;
  onOpenQuestion: (item: Item) => void;
  onStartStudyFromNotebook: (content: string, capability?: string) => void;
}) {
  const memoryRecord = asRecord(memory);
  const [activeSection, setActiveSection] = useState<
    "recent_activity" | "chat_history" | "notebooks" | "question_bank" | "skills" | "memory"
  >("recent_activity");
  const [summaryDraft, setSummaryDraft] = useState("");
  const [profileDraft, setProfileDraft] = useState("");
  const [chatQuery, setChatQuery] = useState("");
  const [memoryFile, setMemoryFile] = useState<LearningMemoryFile>("summary");
  const [memoryView, setMemoryView] = useState<"edit" | "preview">("edit");
  const [skillOriginalName, setSkillOriginalName] = useState("");
  const [skillName, setSkillName] = useState("");
  const [skillDescription, setSkillDescription] = useState("");
  const [skillContent, setSkillContent] = useState("");
  const [skillTags, setSkillTags] = useState("");
  const [skillError, setSkillError] = useState("");
  const queryClient = useQueryClient();
  const assertLearningWritesAllowed = useLearningWriteGate();
  const activeMemoryDraft = memoryFile === "summary" ? summaryDraft : profileDraft;
  const activeMemoryUpdated =
    textOf(memoryRecord[`${memoryFile}_updated_at`]) ||
    textOf(memoryRecord.updated_at) ||
    "Not updated yet";
  const filteredSessions = useMemo(() => {
    const needle = chatQuery.trim().toLowerCase();
    if (!needle) return sessionItems;
    return sessionItems.filter((item) =>
      [itemTitle(item, ""), textOf(item.last_message), textOf(item.preview), textOf(item.summary)]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [chatQuery, sessionItems]);
  const spaceItems = [
    {
      key: "recent_activity" as const,
      label: "Recent Activity",
      description: "Review the latest learning activity across chat, research, solve, and generation flows.",
      icon: Clock3,
      count: recentActivityItems.length,
    },
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

  const refreshMemory = useMutation({
    mutationFn: () => {
      assertLearningWritesAllowed();
      return refreshLearningMemory({});
    },
    onSuccess: (payload) => {
      toast.success("Memory refreshed");
      void queryClient.invalidateQueries({ queryKey: learningKeys.memory });
      const record = asRecord(payload);
      if (textOf(record.summary)) setSummaryDraft(textOf(record.summary));
      if (textOf(record.profile)) setProfileDraft(textOf(record.profile));
    },
    onError: (error) => toast.error(error.message),
  });

  const clearMemory = useMutation({
    mutationFn: () => {
      assertLearningWritesAllowed();
      return clearLearningMemory(memoryFile);
    },
    onSuccess: () => {
      if (memoryFile === "summary") setSummaryDraft("");
      if (memoryFile === "profile") setProfileDraft("");
      toast.success("Memory cleared");
      void queryClient.invalidateQueries({ queryKey: learningKeys.memory });
    },
    onError: (error) => toast.error(error.message),
  });

  const loadSkillForEdit = async (name: string) => {
    setSkillError("");
    setSkillOriginalName(name);
    setSkillName(name);
    setSkillDescription("");
    setSkillContent("");
    setSkillTags("");
    try {
      const detail = asRecord(await getLearningSkill(name));
      setSkillName(textOf(detail.name, name));
      setSkillDescription(textOf(detail.description));
      setSkillContent(textOf(detail.content));
      const tags = Array.isArray(detail.tags) ? detail.tags.map((tag) => textOf(tag)).filter(Boolean) : [];
      setSkillTags(tags.join(", "));
    } catch (error) {
      setSkillError(error instanceof Error ? error.message : String(error));
    }
  };

  const resetSkillEditor = () => {
    setSkillOriginalName("");
    setSkillName("");
    setSkillDescription("");
    setSkillContent("");
    setSkillTags("");
    setSkillError("");
  };

  const saveSkill = useMutation({
    mutationFn: () => {
      assertLearningWritesAllowed();
      const name = skillName.trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
        throw new Error("Skill name must use lowercase letters, numbers, and hyphens.");
      }
      const tags = skillTags
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);
      const payload = {
        name,
        description: skillDescription,
        content: skillContent,
        tags,
        rename_to: skillOriginalName && name !== skillOriginalName ? name : undefined,
      };
      return skillOriginalName ? updateLearningSkill(skillOriginalName, payload) : createLearningSkill(payload);
    },
    onSuccess: () => {
      toast.success("Skill saved");
      resetSkillEditor();
      void queryClient.invalidateQueries({ queryKey: learningKeys.skills });
    },
    onError: (error) => setSkillError(error.message),
  });

  const deleteSkill = useMutation({
    mutationFn: (name: string) => {
      assertLearningWritesAllowed();
      return deleteLearningSkill(name);
    },
    onSuccess: () => {
      toast.success("Skill deleted");
      resetSkillEditor();
      void queryClient.invalidateQueries({ queryKey: learningKeys.skills });
    },
    onError: (error) => toast.error(error.message),
  });

  const openRecentActivity = (item: Item) => {
    const sessionRef = textOf(item.session_ref);
    const sessionId = sessionRef.startsWith("sessions/")
      ? sessionRef.slice("sessions/".length)
      : textOf(item.session_id) || textOf(item.id);
    if (sessionId) onOpenChatSession(sessionId);
  };

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

      <div className="min-w-0 flex-1 overflow-y-auto px-6 py-6">
        {activeSection === "recent_activity" ? (
          <SpaceContentBlock
            icon={Clock3}
            title="Recent Activity"
            description="Browse the latest learning activity returned by the learning engine dashboard feed."
            count={`${recentActivityItems.length} activities`}
          >
            <ItemList
              items={recentActivityItems}
              empty="No recent learning activity yet."
              variant="generic"
              onOpen={openRecentActivity}
            />
          </SpaceContentBlock>
        ) : activeSection === "chat_history" ? (
          <SpaceContentBlock
            icon={History}
            title="Chat History"
            description="Browse, search, and reopen previous conversations from your learning space."
            count={`${sessionItems.length} conversations`}
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-sm text-zaki-muted focus-within:border-zaki-brand">
                <Search className="size-4" />
                <input
                  value={chatQuery}
                  onChange={(event) => setChatQuery(event.target.value)}
                  placeholder="Search chat history..."
                  className="min-w-0 flex-1 bg-transparent text-zaki-text outline-none placeholder:text-zaki-muted"
                />
              </label>
              <button
                type="button"
                onClick={() => queryClient.invalidateQueries({ queryKey: learningKeys.sessions })}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-zaki-md border border-zaki-border px-3 text-sm font-semibold text-zaki-text hover:bg-zaki-hover"
              >
                <RefreshCw className="size-4" />
                Refresh
              </button>
            </div>
            <ItemList
              items={filteredSessions}
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
              onOpenChatSession={onOpenChatSession}
              onStartStudyFromNotebook={onStartStudyFromNotebook}
            />
          </SpaceContentBlock>
        ) : activeSection === "question_bank" ? (
          <SpaceContentBlock
            icon={ClipboardList}
            title="Question Bank"
            description="Review and organize quiz questions across sessions. Filter bookmarked and wrong answers."
            count={`${questionItems.length} questions`}
          >
            <QuestionBankPanel items={questionItems} onOpen={onOpenQuestion} />
          </SpaceContentBlock>
        ) : activeSection === "skills" ? (
          <SpaceContentBlock
            icon={Wand2}
            title="Skills"
            description="Behavior playbooks that guide chat responses. Create, edit, tag, and delete user-managed skills."
            count={`${skillItems.length} skills`}
          >
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="space-y-2">
                {skillItems.length ? (
                  skillItems.map((item, index) => {
                    const name = itemTitle(item, `skill-${index + 1}`);
                    const tags = Array.isArray(item.tags)
                      ? item.tags.map((tag) => textOf(tag)).filter(Boolean)
                      : [];
                    return (
                      <div
                        key={name}
                        className="group rounded-zaki-lg border border-zaki-border bg-zaki-base p-4 transition-colors hover:bg-zaki-hover"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-zaki-text">{name}</h3>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zaki-muted">
                              {textOf(item.description) || "No description returned."}
                            </p>
                            {tags.length ? (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full bg-zaki-raised px-2 py-0.5 text-[10px] font-medium text-zaki-muted"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => void loadSkillForEdit(name)}
                              className="inline-flex size-8 items-center justify-center rounded-zaki-md text-zaki-muted hover:bg-zaki-base hover:text-zaki-text"
                              title="Edit skill"
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              disabled={deleteSkill.isPending}
                              onClick={() => {
                                if (!window.confirm(`Delete skill "${name}"?`)) return;
                                deleteSkill.mutate(name);
                              }}
                              className="inline-flex size-8 items-center justify-center rounded-zaki-md text-zaki-muted hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                              title="Delete skill"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <EmptyLine label="No learning skills returned yet." />
                )}
              </div>
              <div className="rounded-zaki-lg border border-zaki-border bg-zaki-base p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zaki-text">
                      {skillOriginalName ? "Edit skill" : "Create skill"}
                    </h3>
                    <p className="mt-1 text-xs text-zaki-muted">
                      User-managed behavior only. Provider and model routing stay operator-managed.
                    </p>
                  </div>
                  {skillOriginalName ? (
                    <button
                      type="button"
                      onClick={resetSkillEditor}
                      className="rounded-zaki-md border border-zaki-border px-2 py-1 text-xs text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text"
                    >
                      New
                    </button>
                  ) : null}
                </div>
                <div className="space-y-3">
                  <input
                    value={skillName}
                    onChange={(event) => setSkillName(event.target.value)}
                    placeholder="skill-name"
                    className="h-10 w-full rounded-zaki-md border border-zaki-border bg-zaki-raised px-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
                  />
                  <input
                    value={skillDescription}
                    onChange={(event) => setSkillDescription(event.target.value)}
                    placeholder="Description"
                    className="h-10 w-full rounded-zaki-md border border-zaki-border bg-zaki-raised px-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
                  />
                  <input
                    value={skillTags}
                    onChange={(event) => setSkillTags(event.target.value)}
                    placeholder="tags, comma-separated"
                    className="h-10 w-full rounded-zaki-md border border-zaki-border bg-zaki-raised px-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
                  />
                  <textarea
                    value={skillContent}
                    onChange={(event) => setSkillContent(event.target.value)}
                    placeholder="# My Skill&#10;&#10;Describe how the assistant should behave when this skill is active."
                    className="min-h-56 w-full resize-y rounded-zaki-md border border-zaki-border bg-zaki-raised p-3 font-mono text-sm leading-relaxed text-zaki-text outline-none focus:border-zaki-brand"
                  />
                  {skillError ? <p className="text-xs text-rose-600">{skillError}</p> : null}
                  <button
                    type="button"
                    disabled={saveSkill.isPending || !skillName.trim() || !skillContent.trim()}
                    onClick={() => saveSkill.mutate()}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-zaki-md bg-zaki-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saveSkill.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Save skill
                  </button>
                </div>
              </div>
            </div>
          </SpaceContentBlock>
        ) : (
          <SpaceContentBlock
            icon={Brain}
            title="Memory"
            description="Long-form memory the assistant carries across sessions: your running summary and learner profile."
            count="2 files"
          >
            <div className="space-y-4">
              <div className="flex flex-col gap-3 border-b border-zaki-border pb-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-1">
                  {([
                    ["summary", "Summary", BookOpen],
                    ["profile", "Profile", User],
                  ] as Array<[LearningMemoryFile, string, LucideIcon]>).map(([value, label, Icon]) => {
                    const active = memoryFile === value;
                    const MemoryIcon = Icon as LucideIcon;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setMemoryFile(value as LearningMemoryFile)}
                        className={cn(
                          "inline-flex h-9 items-center gap-2 rounded-zaki-md px-3 text-sm font-medium transition-colors",
                          active ? "bg-zaki-hover text-zaki-text" : "text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text",
                        )}
                      >
                        <MemoryIcon className="size-4" />
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    {(["edit", "preview"] as const).map((view) => (
                      <button
                        key={view}
                        type="button"
                        onClick={() => setMemoryView(view)}
                        className={cn(
                          "h-8 rounded-zaki-md px-3 text-xs font-medium capitalize transition-colors",
                          memoryView === view ? "bg-zaki-hover text-zaki-text" : "text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text",
                        )}
                      >
                        {view}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-zaki-muted">Updated: {activeMemoryUpdated}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="max-w-xl text-xs leading-relaxed text-zaki-muted">
                  {memoryFile === "summary"
                    ? "Running summary of the learning journey. Auto-updated after conversations and editable here."
                    : "User identity, preferences, learning style, and knowledge levels. Auto-updated after conversations and editable here."}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={saveMemory.isPending}
                    onClick={() =>
                      saveMemory.mutate({
                        file: memoryFile,
                        content: memoryFile === "summary" ? summaryDraft : profileDraft,
                      })
                    }
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-zaki-md border border-zaki-border px-3 text-sm font-semibold text-zaki-text hover:bg-zaki-hover disabled:opacity-60"
                  >
                    {saveMemory.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Save
                  </button>
                  <button
                    type="button"
                    disabled={refreshMemory.isPending}
                    onClick={() => refreshMemory.mutate()}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-zaki-md border border-zaki-border px-3 text-sm font-semibold text-zaki-text hover:bg-zaki-hover disabled:opacity-60"
                  >
                    {refreshMemory.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    Refresh
                  </button>
                  <button
                    type="button"
                    disabled={clearMemory.isPending}
                    onClick={() => {
                      if (!window.confirm(`Clear ${memoryFile} memory?`)) return;
                      clearMemory.mutate();
                    }}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-zaki-md border border-zaki-border px-3 text-sm font-semibold text-zaki-text hover:bg-zaki-hover disabled:opacity-60"
                  >
                    {clearMemory.isPending ? <Loader2 className="size-4 animate-spin" /> : <Eraser className="size-4" />}
                    Clear
                  </button>
                </div>
              </div>

              {memoryView === "edit" ? (
                <div>
                  <textarea
                    value={activeMemoryDraft}
                    onChange={(event) => {
                      if (memoryFile === "summary") setSummaryDraft(event.target.value);
                      else setProfileDraft(event.target.value);
                    }}
                    spellCheck={false}
                    className="min-h-[480px] w-full resize-y rounded-zaki-lg border border-zaki-border bg-zaki-base p-4 font-mono text-sm leading-7 text-zaki-text outline-none focus:border-zaki-brand"
                    placeholder={
                      memoryFile === "summary"
                        ? "## Current Focus\n- ...\n\n## Accomplishments\n- ...\n\n## Open Questions\n- ..."
                        : "## Identity\n- ...\n\n## Learning Style\n- ...\n\n## Knowledge Level\n- ...\n\n## Preferences\n- ..."
                    }
                  />
                  <p className="mt-2 text-[11px] text-zaki-muted">Markdown supported</p>
                </div>
              ) : activeMemoryDraft.trim() ? (
                <div className="learning-markdown rounded-zaki-lg border border-zaki-border bg-zaki-base px-6 py-5 text-sm leading-relaxed text-zaki-text">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeMemoryDraft}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex min-h-80 flex-col items-center justify-center rounded-zaki-lg border border-dashed border-zaki-border text-center">
                  <Brain className="mb-3 size-6 text-zaki-muted" />
                  <p className="text-sm font-medium text-zaki-text">No {memoryFile} yet</p>
                  <p className="mt-1 max-w-xs text-xs text-zaki-muted">
                    Refresh from a session or write directly in the editor.
                  </p>
                </div>
              )}
            </div>
          </SpaceContentBlock>
        )}
      </div>
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
  uploadKbFolder,
  uploadKbArchive,
  reindexKb,
  setDefaultKb,
  deleteKb,
  items,
  uploadPolicy,
  folderInputRef,
  onOpen,
}: {
  kbName: string;
  setKbName: (value: string) => void;
  createKb: UseMutationResult<unknown, Error, { name: string; files: FileList | File[] }, unknown>;
  uploadKb: UseMutationResult<unknown, Error, { name: string; files: FileList | File[] }, unknown>;
  uploadKbFolder: UseMutationResult<unknown, Error, { name: string; files: FileList | File[] }, unknown>;
  uploadKbArchive: UseMutationResult<unknown, Error, { name: string; files: FileList | File[] }, unknown>;
  reindexKb: UseMutationResult<unknown, Error, string, unknown>;
  setDefaultKb: UseMutationResult<unknown, Error, string, unknown>;
  deleteKb: UseMutationResult<unknown, Error, string, unknown>;
  items: Item[];
  uploadPolicy?: LearningKnowledgeUploadPolicy;
  folderInputRef: RefObject<HTMLInputElement>;
  onOpen: (item: Item) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [filesUploadMode, setFilesUploadMode] = useState<"files" | "folder">("files");
  const [archiveFiles, setArchiveFiles] = useState<File[]>([]);
  const [dropActive, setDropActive] = useState(false);
  const [selectionError, setSelectionError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [section, setSection] = useState<"files" | "add" | "versions" | "settings">("files");
  const readyBytes = files.reduce((sum, file) => sum + file.size, 0);
  const archiveReadyBytes = archiveFiles.reduce((sum, file) => sum + file.size, 0);
  const sourceAccept = uploadPolicy?.accept?.trim() || LEARNING_ATTACHMENT_ACCEPT;
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
  const metadata = asRecord(selectedItem?.metadata);
  const updatedLabel =
    relativeTime(metadata.last_updated) ||
    relativeTime(selectedItem?.updated_at) ||
    relativeTime(selectedItem?.created_at) ||
    "unknown";
  const lastIndexedLabel =
    relativeTime(metadata.last_indexed_at) ||
    relativeTime(selectedItem?.last_indexed_at);
  const selectedIsDefault = Boolean(selectedItem?.is_default) || effectiveName === "main";

  useEffect(() => {
    if (!selectedName && items[0]) {
      setSelectedName(itemId(items[0]));
    }
  }, [items, selectedName]);

  const fileExtensionAllowed = (filename: string) => {
    const allowed = new Set((uploadPolicy?.extensions || []).map((ext) => ext.toLowerCase()));
    if (!allowed.size) return true;
    const cleanName = filename.split(/[\\/]/).pop() || filename;
    const dot = cleanName.lastIndexOf(".");
    if (dot < 0) return false;
    return allowed.has(cleanName.slice(dot).toLowerCase());
  };
  const validateSelection = (picked: File[], mode: "files" | "archive") => {
    const maxBytes = Math.max(
      1,
      Number(uploadPolicy?.max_file_size_bytes || LEARNING_MAX_ATTACHMENT_BYTES),
    );
    const archiveExts = new Set([".zip", ".tar", ".tgz", ".gz"]);
    const errors: string[] = [];
    picked.forEach((file) => {
      const cleanName = file.name.split(/[\\/]/).pop() || file.name;
      const dot = cleanName.lastIndexOf(".");
      const ext = dot >= 0 ? cleanName.slice(dot).toLowerCase() : "";
      if (mode === "archive") {
        const archiveName = cleanName.toLowerCase();
        if (!archiveExts.has(ext) && !archiveName.endsWith(".tar.gz")) {
          errors.push(`${cleanName}: unsupported archive type`);
        }
      } else if (!fileExtensionAllowed(cleanName)) {
        errors.push(`${cleanName}: unsupported file type`);
      }
      if (file.size > maxBytes) {
        errors.push(`${cleanName}: exceeds ${formatLearningBytes(maxBytes)}`);
      }
    });
    return errors;
  };
  const handlePicked = (picked: FileList | File[], mode: "files" | "folder" = "files") => {
    const incoming = Array.from(picked);
    if (!incoming.length) return;
    const errors = validateSelection(incoming, "files");
    if (errors.length) {
      setSelectionError(errors.slice(0, 3).join("; "));
      return;
    }
    setSelectionError("");
    const byKey = new Map(files.map((file) => [`${file.name}:${file.size}`, file]));
    incoming.forEach((file) => byKey.set(`${file.name}:${file.size}`, file));
    setFiles(Array.from(byKey.values()));
    setFilesUploadMode(mode);
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
    } else if (filesUploadMode === "folder") {
      uploadKbFolder.mutate(payload);
    } else {
      uploadKb.mutate(payload);
    }
    setFiles([]);
    setFilesUploadMode("files");
  };
  const commitArchiveUpload = () => {
    if (!archiveFiles.length || !kbName.trim()) return;
    const errors = validateSelection(archiveFiles, "archive");
    if (errors.length) {
      setSelectionError(errors.slice(0, 3).join("; "));
      return;
    }
    setSelectionError("");
    uploadKbArchive.mutate({ name: kbName.trim(), files: archiveFiles });
    setArchiveFiles([]);
  };
  const handleReindex = () => {
    if (!effectiveName || reindexKb.isPending) return;
    reindexKb.mutate(effectiveName);
  };
  const handleSetDefault = () => {
    if (!effectiveName || selectedIsDefault || setDefaultKb.isPending) return;
    setDefaultKb.mutate(effectiveName);
  };
  const handleDelete = () => {
    if (!effectiveName || deleteKb.isPending) return;
    if (!window.confirm(`Delete knowledge base "${effectiveName}"?`)) return;
    deleteKb.mutate(effectiveName, {
      onSuccess: () => {
        setSelectedName(null);
        setSection("files");
      },
    });
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

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-zaki-base">
        <div className="border-b border-zaki-border bg-zaki-raised px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[18px] font-semibold tracking-tight text-zaki-text">
                  {effectiveName || "No knowledge base selected"}
                </h1>
                {selectedIsDefault ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    <Star className="size-3" fill="currentColor" />
                    Default
                  </span>
                ) : null}
                {selectedItem ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-zaki-hover px-2 py-0.5 text-[10px] font-medium text-zaki-secondary">
                    <span className={cn("size-1.5 rounded-full", statusTone(itemStatus(selectedItem)))} />
                    {itemStatus(selectedItem)}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[12px] text-zaki-muted">
                {effectiveName
                  ? `Indexing managed by ZAKI · Updated ${updatedLabel}${
                      lastIndexedLabel ? ` · Last indexed ${lastIndexedLabel}` : ""
                    }`
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
              { key: "versions" as const, label: "Index versions", Icon: Layers },
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
                    accept={sourceAccept}
                    className="hidden"
                    onChange={(event) => {
                      if (event.target.files?.length) handlePicked(event.target.files, "files");
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
                      if (event.target.files?.length) handlePicked(event.target.files, "folder");
                      event.target.value = "";
                    }}
                  />
                </label>
                <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-zaki-md border border-zaki-border px-4 text-sm font-semibold text-zaki-text hover:bg-zaki-hover">
                  <Layers className="size-4" />
                  Pick archive
                  <input
                    type="file"
                    multiple
                    accept=".zip,.tar,.tgz,.tar.gz"
                    className="hidden"
                    onChange={(event) => {
                      if (event.target.files?.length) {
                        const picked = Array.from(event.target.files);
                        const errors = validateSelection(picked, "archive");
                        if (errors.length) {
                          setSelectionError(errors.slice(0, 3).join("; "));
                        } else {
                          setSelectionError("");
                          setArchiveFiles(picked);
                        }
                      }
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>

              <div className="mb-4 rounded-zaki-lg border border-zaki-border bg-zaki-raised px-3 py-2 text-[12px] leading-relaxed text-zaki-muted">
                Hosted ZAKI accepts browser files, images, browser folder selections, and archives. Server-local folder paths are intentionally not exposed in multi-user production.
              </div>
              {selectionError ? (
                <div className="mb-4 rounded-zaki-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] leading-relaxed text-red-700">
                  {selectionError}
                </div>
              ) : null}

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
                  {files.length
                    ? `${files.length} ${filesUploadMode === "folder" ? "folder " : ""}files ready`
                    : "Choose files..."}
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
                      {filesUploadMode === "folder" ? "Upload folder to existing library" : "Upload to existing library"}
                    </button>
                  </div>
                </div>
              ) : null}
              {archiveFiles.length ? (
                <div className="mt-4 rounded-zaki-lg border border-zaki-border bg-zaki-raised p-3">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-zaki-text">
                        <Layers className="size-4 text-zaki-brand" />
                        Archive ready
                      </div>
                      <p className="mt-1 text-xs text-zaki-muted">
                        {archiveFiles.length} archive file{archiveFiles.length === 1 ? "" : "s"} · {formatLearningBytes(archiveReadyBytes)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setArchiveFiles([])}
                      className="rounded-zaki-md border border-zaki-border px-2 py-1 text-xs text-zaki-muted hover:bg-zaki-base hover:text-zaki-text"
                    >
                      Clear
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={!kbName.trim() || uploadKbArchive.isPending}
                    onClick={commitArchiveUpload}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-zaki-md border border-zaki-border px-3 text-sm font-semibold text-zaki-text hover:bg-zaki-hover disabled:opacity-60"
                  >
                    <Upload className="size-4" />
                    Upload archive to existing library
                  </button>
                </div>
              ) : null}
            </div>
          ) : section === "versions" ? (
            <div className="mx-auto max-w-3xl space-y-4">
              <div className="rounded-zaki-lg border border-zaki-border bg-zaki-raised p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-zaki-text">Index versions</h2>
                    <p className="mt-1 text-xs leading-relaxed text-zaki-muted">
                      Review index state and start a hosted-safe reindex job for this knowledge base.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!effectiveName || reindexKb.isPending}
                    onClick={handleReindex}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-zaki-md bg-zaki-brand px-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {reindexKb.isPending ? <Loader2 className="size-4 animate-spin" /> : <Layers className="size-4" />}
                    Reindex
                  </button>
                </div>
              </div>
              {selectedItem ? (
                <DetailBlock
                  title="Index state"
                  rows={[
                    ["Indexing", "Managed by ZAKI"],
                    ["Updated", updatedLabel],
                    ["Last indexed", lastIndexedLabel || "not returned"],
                    ["Raw documents", displayCount(selectedItem) || "0"],
                    ["Needs reindex", String(Boolean(selectedItem.needs_reindex))],
                  ]}
                />
              ) : (
                <EmptyLine label="No knowledge base selected." />
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {selectedItem ? (
                <>
                  <DetailBlock
                    title="Knowledge base settings"
                    rows={[
                      ["Name", itemTitle(selectedItem, "Knowledge base")],
                      ["Status", itemStatus(selectedItem)],
                      ["Files", displayCount(selectedItem) || "0"],
                      ["Default", String(selectedIsDefault)],
                      ["Indexing", "Managed by ZAKI"],
                    ]}
                  />
                  <div className="rounded-zaki-lg border border-zaki-border bg-zaki-raised p-4">
                    <h2 className="text-sm font-semibold text-zaki-text">Actions</h2>
                    <p className="mt-1 text-xs leading-relaxed text-zaki-muted">
                      User-safe library actions. Provider routing and external dependencies remain operator-managed.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={!effectiveName || selectedIsDefault || setDefaultKb.isPending}
                        onClick={handleSetDefault}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-zaki-md border border-zaki-border px-3 text-sm font-semibold text-zaki-text hover:bg-zaki-hover disabled:opacity-60"
                      >
                        {setDefaultKb.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Star className="size-4" />
                        )}
                        Set default
                      </button>
                      <button
                        type="button"
                        disabled={!effectiveName || reindexKb.isPending}
                        onClick={handleReindex}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-zaki-md border border-zaki-border px-3 text-sm font-semibold text-zaki-text hover:bg-zaki-hover disabled:opacity-60"
                      >
                        <Layers className="size-4" />
                        Reindex
                      </button>
                      <button
                        type="button"
                        disabled={!effectiveName || deleteKb.isPending}
                        onClick={handleDelete}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-zaki-md border border-rose-200 px-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <EmptyLine label="No knowledge base selected." />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NotebooksPanel({
  notebookName,
  setNotebookName,
  createNotebook,
  items,
  onOpenChatSession,
  onStartStudyFromNotebook,
}: {
  notebookName: string;
  setNotebookName: (value: string) => void;
  createNotebook: UseMutationResult<unknown, Error, NotebookCreateDraft, unknown>;
  items: Item[];
  onOpenChatSession: (sessionId: string) => void;
  onStartStudyFromNotebook: (content: string, capability?: string) => void;
}) {
  const queryClient = useQueryClient();
  const assertLearningWritesAllowed = useLearningWriteGate();
  const [notebookDescription, setNotebookDescription] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId && items.some((item, index) => itemId(item, `notebook-${index + 1}`) === selectedId)) {
      return;
    }
    const first = items[0];
    setSelectedId(first ? itemId(first, "notebook-1") : "");
    setExpandedRecordId(null);
  }, [items, selectedId]);

  const selectedSummary = useMemo(
    () => items.find((item, index) => itemId(item, `notebook-${index + 1}`) === selectedId) ?? null,
    [items, selectedId],
  );

  const detailQuery = useQuery({
    queryKey: ["learning", "notebook", selectedId],
    enabled: Boolean(selectedId),
    queryFn: () => getLearningNotebook(selectedId),
    retry: 1,
  });

  const selectedDetail = asRecord(detailQuery.data ?? selectedSummary ?? {});
  const records = itemList(selectedDetail, ["records", "items"]);

  const downloadMarkdownFile = (filename: string, markdown: string) => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadNotebook = () => {
    if (!Object.keys(selectedDetail).length) return;
    downloadMarkdownFile(
      learningNotebookExportFilename(selectedDetail),
      learningNotebookMarkdown(selectedDetail, records),
    );
  };

  const downloadRecord = (record: Item, index: number) => {
    downloadMarkdownFile(
      learningNotebookRecordExportFilename(selectedDetail, record, index),
      learningNotebookRecordMarkdown(record, index),
    );
  };

  const notebookStudyContext = () =>
    learningNotebookMarkdown(selectedDetail, records).slice(0, 16_000);
  const notebookRecordKind = (record: Item) =>
    textOf(record.type) || textOf(record.record_type) || "record";

  const latestRecordTime = useMemo(() => {
    const times = records
      .map((record) => Date.parse(textOf(record.created_at) || textOf(record.updated_at)))
      .filter(Number.isFinite);
    return times.length ? new Date(Math.max(...times)).toISOString() : "";
  }, [records]);
  const recordTypeCounts = useMemo(
    () =>
      records.reduce<Record<string, number>>((counts, record) => {
        const type = notebookRecordKind(record);
        counts[type] = (counts[type] || 0) + 1;
        return counts;
      }, {}),
    [records],
  );

  const startNotebookStudyAction = (
    action: "summary" | "quiz" | "flashcards" | "weekly" | "weak",
  ) => {
    const name = itemTitle(selectedDetail, itemTitle(selectedSummary ?? {}, "Notebook"));
    const context = notebookStudyContext();
    if (!context.trim()) return;
    const prompts = {
      summary: {
        capability: "",
        content: `Summarize this notebook into a clean study brief. Include key concepts, formulas/facts, examples, and what I should review next.\n\n${context}`,
      },
      quiz: {
        capability: "deep_question",
        content: `Create an answer-keyed quiz from this notebook. Include explanations, difficulty tags, and one follow-up review prompt per question.\n\n${context}`,
      },
      flashcards: {
        capability: "deep_question",
        content: `Generate concise flashcards from this notebook. Use front/back format, keep each card atomic, include answer keys, and add spaced-review hints.\n\n${context}`,
      },
      weekly: {
        capability: "",
        content: `Create a "what I learned this week" review from the notebook "${name}". Highlight progress, remaining gaps, and a practical next study session.\n\n${context}`,
      },
      weak: {
        capability: "deep_solve",
        content: `Find weak topics from this notebook, then create a targeted practice plan with similar problems and step-by-step remediation.\n\n${context}`,
      },
    }[action];
    onStartStudyFromNotebook(prompts.content, prompts.capability);
  };

  const startNotebookRecordStudyAction = (
    record: Item,
    index: number,
    action: "quiz" | "flashcards" | "practice" | "check",
  ) => {
    const title = itemTitle(record, `Record ${index + 1}`);
    const context = learningNotebookRecordMarkdown(record, index).slice(0, 8_000);
    if (!context.trim()) return;
    const prompts = {
      quiz: {
        capability: "deep_question",
        content: `Create a short answer-keyed quiz from this saved notebook record. Include explanations and one review hint per question.\n\n${context}`,
      },
      flashcards: {
        capability: "deep_question",
        content: `Turn this saved notebook record into concise flashcards. Use front/back format and include spaced-review hints.\n\n${context}`,
      },
      practice: {
        capability: "deep_solve",
        content: `Create similar practice problems from this saved notebook record, then solve the first one step by step.\n\n${context}`,
      },
      check: {
        capability: "deep_solve",
        content: `Check my answer using this saved notebook record as reference. Tell me what is correct, what is wrong, and what to review next.\n\nReference record: ${title}\n\n${context}\n\nMy answer:\n`,
      },
    }[action];
    onStartStudyFromNotebook(prompts.content, prompts.capability);
  };

  const deleteNotebook = useMutation({
    mutationFn: (notebookId: string) => {
      assertLearningWritesAllowed();
      return deleteLearningNotebook(notebookId);
    },
    onSuccess: (_, notebookId) => {
      if (selectedId === notebookId) {
        setSelectedId("");
        setExpandedRecordId(null);
      }
      toast.success("Notebook deleted");
      void queryClient.invalidateQueries({ queryKey: learningKeys.notebooks });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteRecord = useMutation({
    mutationFn: ({ notebookId, recordId }: { notebookId: string; recordId: string }) => {
      assertLearningWritesAllowed();
      return deleteLearningNotebookRecord(notebookId, recordId);
    },
    onSuccess: (_, variables) => {
      setExpandedRecordId(null);
      toast.success("Record removed");
      void queryClient.invalidateQueries({ queryKey: learningKeys.notebooks });
      void queryClient.invalidateQueries({ queryKey: ["learning", "notebook", variables.notebookId] });
    },
    onError: (error) => toast.error(error.message),
  });

  const handleCreate = () => {
    try {
      assertLearningWritesAllowed();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Learn writes are paused.");
      return;
    }
    const name = notebookName.trim();
    if (!name) return;
    createNotebook.mutate(
      { name, description: notebookDescription.trim() },
      {
        onSuccess: () => setNotebookDescription(""),
      },
    );
  };

  return (
    <div className="space-y-6">
      <section className="rounded-zaki-lg border border-zaki-border bg-zaki-base p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="size-4 text-zaki-muted" />
          <h2 className="text-sm font-semibold text-zaki-text">Create notebook</h2>
          <span className="ml-1 text-xs text-zaki-muted">Give it a name and short description.</span>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input
            value={notebookName}
            onChange={(event) => setNotebookName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && notebookName.trim()) handleCreate();
            }}
            placeholder="Notebook name"
            className="h-10 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-sm text-zaki-text outline-none placeholder:text-zaki-muted focus:border-zaki-brand"
          />
          <input
            value={notebookDescription}
            onChange={(event) => setNotebookDescription(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && notebookName.trim()) handleCreate();
            }}
            placeholder="Description"
            className="h-10 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-sm text-zaki-text outline-none placeholder:text-zaki-muted focus:border-zaki-brand"
          />
          <button
            type="button"
            disabled={!notebookName.trim() || createNotebook.isPending}
            onClick={handleCreate}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-zaki-md bg-zaki-brand px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {createNotebook.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Create
          </button>
        </div>
      </section>

      <section className="rounded-zaki-lg border border-zaki-border bg-zaki-base p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <NotebookPen className="size-4 text-zaki-muted" />
            <h2 className="text-sm font-semibold text-zaki-text">Your notebooks</h2>
            <span className="rounded-full bg-zaki-hover px-1.5 py-0.5 text-[10px] text-zaki-muted">
              {items.length}
            </span>
          </div>
          <span className="text-xs text-zaki-muted">Click a notebook to inspect its records.</span>
        </div>

        <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-2 overflow-y-auto pr-1 xl:sticky xl:top-8 xl:max-h-[calc(100vh-12rem)]">
            {items.length ? (
              items.map((notebook, index) => {
                const id = itemId(notebook, `notebook-${index + 1}`);
                const active = selectedId === id;
                const name = itemTitle(notebook, id);
                return (
                  <div
                    key={id}
                    className={cn(
                      "group relative w-full rounded-zaki-lg border p-3.5 text-left transition-colors",
                      active
                        ? "border-zaki-brand/40 bg-zaki-brand/10 shadow-sm"
                        : "border-zaki-border bg-zaki-raised hover:bg-zaki-hover",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(id);
                        setExpandedRecordId(null);
                      }}
                      className="block w-full text-left"
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className="mt-1.5 size-2.5 shrink-0 rounded-full ring-2 ring-zaki-base"
                          style={{ backgroundColor: textOf(notebook.color, "#f10202") }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-zaki-text">{name}</div>
                          <p className="mt-0.5 line-clamp-1 min-h-[1.1em] text-xs leading-relaxed text-zaki-muted">
                            {textOf(notebook.description) || <span className="italic opacity-70">No description.</span>}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-2 text-[10.5px] tabular-nums text-zaki-muted">
                            <span>{displayCount(notebook) || "0"} records</span>
                            <span className="truncate text-right">
                              {relativeTime(notebook.updated_at) || ""}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      disabled={deleteNotebook.isPending}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (window.confirm(`Delete notebook "${name}"?`)) deleteNotebook.mutate(id);
                      }}
                      title="Delete"
                      className="absolute right-1.5 top-1.5 rounded-zaki-md p-1.5 text-zaki-muted opacity-0 transition-opacity hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-40 group-hover:opacity-100"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="rounded-zaki-lg border border-dashed border-zaki-border px-6 py-10 text-center text-sm text-zaki-muted">
                No notebooks yet. Create one to organize outputs.
              </div>
            )}
          </div>

          <div className="flex min-h-[560px] flex-col overflow-hidden rounded-zaki-lg border border-zaki-border bg-zaki-raised p-4 xl:h-[calc(100vh-12rem)]">
            {detailQuery.isLoading ? (
              <div className="flex min-h-[320px] items-center justify-center">
                <Loader2 className="size-5 animate-spin text-zaki-muted" />
              </div>
            ) : selectedId && Object.keys(selectedDetail).length ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 pb-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: textOf(selectedDetail.color, "#f10202") }}
                    />
                    <h3 className="truncate text-[15px] font-semibold text-zaki-text">
                      {itemTitle(selectedDetail, itemTitle(selectedSummary ?? {}, "Notebook"))}
                    </h3>
                    {textOf(selectedDetail.description) ? (
                      <span className="hidden truncate text-xs text-zaki-muted md:inline">
                        {textOf(selectedDetail.description)}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    <span className="text-[11px] tabular-nums text-zaki-muted">
                      {records.length} records
                    </span>
                    <button
                      type="button"
                      disabled={!records.length}
                      onClick={() => startNotebookStudyAction("summary")}
                      className="inline-flex h-8 items-center gap-1.5 rounded-zaki-md border border-zaki-border bg-zaki-base px-2.5 text-xs font-medium text-zaki-text hover:bg-zaki-hover disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Sparkles className="size-3.5" />
                      Summarize
                    </button>
                    <button
                      type="button"
                      disabled={!records.length}
                      onClick={() => startNotebookStudyAction("quiz")}
                      className="inline-flex h-8 items-center gap-1.5 rounded-zaki-md border border-zaki-border bg-zaki-base px-2.5 text-xs font-medium text-zaki-text hover:bg-zaki-hover disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <PenLine className="size-3.5" />
                      Make quiz
                    </button>
                    <button
                      type="button"
                      disabled={!records.length}
                      onClick={() => startNotebookStudyAction("flashcards")}
                      className="inline-flex h-8 items-center gap-1.5 rounded-zaki-md border border-zaki-border bg-zaki-base px-2.5 text-xs font-medium text-zaki-text hover:bg-zaki-hover disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Layers className="size-3.5" />
                      Flashcards
                    </button>
                    <button
                      type="button"
                      disabled={!records.length}
                      onClick={() => startNotebookStudyAction("weekly")}
                      className="inline-flex h-8 items-center gap-1.5 rounded-zaki-md border border-zaki-border bg-zaki-base px-2.5 text-xs font-medium text-zaki-text hover:bg-zaki-hover disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <CalendarDays className="size-3.5" />
                      Weekly review
                    </button>
                    <button
                      type="button"
                      disabled={!records.length}
                      onClick={() => startNotebookStudyAction("weak")}
                      className="inline-flex h-8 items-center gap-1.5 rounded-zaki-md border border-zaki-border bg-zaki-base px-2.5 text-xs font-medium text-zaki-text hover:bg-zaki-hover disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Target className="size-3.5" />
                      Weak topics
                    </button>
                    <button
                      type="button"
                      onClick={downloadNotebook}
                      aria-label="Download notebook as Markdown"
                      className="inline-flex h-8 items-center gap-2 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-xs font-medium text-zaki-text hover:bg-zaki-hover"
                    >
                      <Download className="size-3.5" />
                      Download Markdown
                    </button>
                  </div>
                </div>

                <div className="mb-2 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-zaki-muted">
                  Memory overview
                </div>
                <div className="mb-3 grid shrink-0 gap-2 md:grid-cols-4">
                  <div className="rounded-zaki-md border border-zaki-border bg-zaki-base px-3 py-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-zaki-muted">
                      Saved records
                    </div>
                    <div className="mt-1 text-lg font-semibold tabular-nums text-zaki-text">
                      {records.length}
                    </div>
                  </div>
                  <div className="rounded-zaki-md border border-zaki-border bg-zaki-base px-3 py-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-zaki-muted">
                      Chat captures
                    </div>
                    <div className="mt-1 text-lg font-semibold tabular-nums text-zaki-text">
                      {recordTypeCounts.chat || 0}
                    </div>
                  </div>
                  <div className="rounded-zaki-md border border-zaki-border bg-zaki-base px-3 py-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-zaki-muted">
                      Review material
                    </div>
                    <div className="mt-1 text-lg font-semibold tabular-nums text-zaki-text">
                      {(recordTypeCounts.question || 0) + (recordTypeCounts.solve || 0)}
                    </div>
                  </div>
                  <div className="rounded-zaki-md border border-zaki-border bg-zaki-base px-3 py-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-zaki-muted">
                      Last saved
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold text-zaki-text">
                      {relativeTime(latestRecordTime) || "No saves yet"}
                    </div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="divide-y divide-zaki-border">
                    {records.length ? (
                      records.map((record, index) => {
                        const id = itemId(record, `record-${index + 1}`);
                        const type = notebookRecordKind(record);
                        const badge = notebookRecordBadge(type);
                        const BadgeIcon = badge.icon;
                        const expanded = expandedRecordId === id;
                        const metadata = asRecord(record.metadata);
                        const sessionId = textOf(metadata.session_id);
                        return (
                          <div key={id} className="group">
                            <button
                              type="button"
                              onClick={() => setExpandedRecordId(expanded ? null : id)}
                              className="flex w-full items-center gap-3 px-1 py-3.5 text-left transition-colors hover:bg-zaki-hover/70"
                            >
                              <span className="shrink-0 text-zaki-muted">
                                {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                              </span>
                              <span
                                className={cn(
                                  "inline-flex shrink-0 items-center gap-1 rounded-zaki-md px-2 py-0.5 text-[11px] font-medium",
                                  badge.className,
                                )}
                              >
                                <BadgeIcon className="size-3" />
                                {badge.label}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-sm font-medium text-zaki-text">
                                {itemTitle(record, "Untitled record")}
                              </span>
                              <span className="shrink-0 text-[11px] tabular-nums text-zaki-muted">
                                {relativeTime(record.created_at) || ""}
                              </span>
                            </button>

                            {expanded ? (
                              <div className="pb-4 pl-8 pr-1">
                                {textOf(record.summary) ? (
                                  <p className="mb-3 text-sm leading-6 text-zaki-text/85">
                                    {textOf(record.summary)}
                                  </p>
                                ) : null}
                                {type !== "chat" && textOf(record.user_query) ? (
                                  <div className="mb-3 flex items-baseline gap-2 text-xs">
                                    <span className="shrink-0 font-medium text-zaki-muted">Query:</span>
                                    <span className="text-zaki-text/70">{textOf(record.user_query)}</span>
                                  </div>
                                ) : null}
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                  <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-zaki-muted">
                                    Study this record
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => startNotebookRecordStudyAction(record, index, "quiz")}
                                    className="inline-flex h-8 items-center gap-2 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-xs font-medium text-zaki-text hover:bg-zaki-hover"
                                  >
                                    <PenLine className="size-3.5" />
                                    Quiz from record
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => startNotebookRecordStudyAction(record, index, "flashcards")}
                                    className="inline-flex h-8 items-center gap-2 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-xs font-medium text-zaki-text hover:bg-zaki-hover"
                                  >
                                    <Layers className="size-3.5" />
                                    Flashcards
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => startNotebookRecordStudyAction(record, index, "practice")}
                                    className="inline-flex h-8 items-center gap-2 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-xs font-medium text-zaki-text hover:bg-zaki-hover"
                                  >
                                    <BrainCircuit className="size-3.5" />
                                    Practice
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => startNotebookRecordStudyAction(record, index, "check")}
                                    className="inline-flex h-8 items-center gap-2 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-xs font-medium text-zaki-text hover:bg-zaki-hover"
                                  >
                                    <CheckCircle2 className="size-3.5" />
                                    Check answer
                                  </button>
                                  {type === "chat" && sessionId ? (
                                    <button
                                      type="button"
                                      onClick={() => onOpenChatSession(sessionId)}
                                      className="inline-flex h-8 items-center gap-2 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-xs font-medium text-zaki-text hover:bg-zaki-hover"
                                    >
                                      <ExternalLink className="size-3.5" />
                                      Open chat session
                                      <ArrowRight className="size-3.5" />
                                    </button>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => downloadRecord(record, index)}
                                    aria-label={`Download ${itemTitle(record, "record")} as Markdown`}
                                    className="inline-flex h-8 items-center gap-2 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-xs font-medium text-zaki-text hover:bg-zaki-hover"
                                  >
                                    <Download className="size-3.5" />
                                    Download
                                  </button>
                                  <button
                                    type="button"
                                    disabled={deleteRecord.isPending}
                                    onClick={() => {
                                      if (window.confirm("Remove this record?")) {
                                        deleteRecord.mutate({ notebookId: selectedId, recordId: id });
                                      }
                                    }}
                                    className="inline-flex h-8 items-center gap-2 rounded-zaki-md border border-rose-200 px-3 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                                  >
                                    <Trash2 className="size-3.5" />
                                    Remove
                                  </button>
                                </div>
                                <div className="learning-markdown max-h-[320px] overflow-y-auto rounded-zaki-md border border-zaki-border bg-zaki-base p-3 text-xs leading-5 text-zaki-text">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {textOf(record.output) || "_No output saved._"}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-6 py-12 text-center text-sm text-zaki-muted">
                        This notebook is empty for now.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[320px] items-center justify-center rounded-zaki-lg border border-dashed border-zaki-border text-sm text-zaki-muted">
                Select a notebook to inspect its saved records.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function notebookRecordBadge(type: string): { label: string; className: string; icon: LucideIcon } {
  switch (type) {
    case "chat":
      return {
        label: "Chat",
        className: "bg-sky-100 text-sky-700",
        icon: MessageSquare,
      };
    case "tutorbot":
      return {
        label: "TutorBot",
        className: "bg-violet-100 text-violet-700",
        icon: Bot,
      };
    case "research":
      return {
        label: "Research",
        className: "bg-emerald-100 text-emerald-700",
        icon: Search,
      };
    case "co_writer":
      return {
        label: "Co-Writer",
        className: "bg-amber-100 text-amber-700",
        icon: Pencil,
      };
    case "solve":
      return {
        label: "Solve",
        className: "bg-blue-100 text-blue-700",
        icon: BrainCircuit,
      };
    case "question":
      return {
        label: "Question",
        className: "bg-rose-100 text-rose-700",
        icon: ClipboardList,
      };
    default:
      return {
        label: type,
        className: "bg-zaki-hover text-zaki-muted",
        icon: NotebookPen,
      };
  }
}

function WriterPanel({
  createDocument,
  deleteDocument,
  selectedDocumentId,
  setSelectedDocumentId,
  items,
  knowledgeItems,
  notebookItems,
  onResult,
}: {
  createDocument: UseMutationResult<unknown, Error, CoWriterCreateDraft, unknown>;
  deleteDocument: UseMutationResult<unknown, Error, string, unknown>;
  selectedDocumentId: string;
  setSelectedDocumentId: (value: string) => void;
  items: Item[];
  knowledgeItems: Item[];
  notebookItems: Item[];
  onResult: (value: unknown) => void;
}) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const createDraft = (content = "") => {
    createDocument.mutate({ content });
  };

  if (selectedDocumentId) {
    return (
      <CoWriterDocumentEditor
        documentId={selectedDocumentId}
        onBack={() => setSelectedDocumentId("")}
        onResult={onResult}
        deleteDocument={deleteDocument}
        knowledgeItems={knowledgeItems}
        notebookItems={notebookItems}
      />
    );
  }

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

      <div className="flex-1 overflow-y-auto px-6 py-6">
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
                  onClick={() => setSelectedDocumentId(id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedDocumentId(id);
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
      </div>
    </div>
  );
}

function CoWriterDocumentEditor({
  documentId,
  onBack,
  onResult,
  deleteDocument,
  knowledgeItems,
  notebookItems,
}: {
  documentId: string;
  onBack: () => void;
  onResult: (value: unknown) => void;
  deleteDocument: UseMutationResult<unknown, Error, string, unknown>;
  knowledgeItems: Item[];
  notebookItems: Item[];
}) {
  const queryClient = useQueryClient();
  const assertLearningWritesAllowed = useLearningWriteGate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [instruction, setInstruction] = useState("");
  const [action, setAction] = useState<"rewrite" | "shorten" | "expand">("rewrite");
  const [source, setSource] = useState<"none" | "rag" | "web">("none");
  const [kbName, setKbName] = useState("");
  const [notebookId, setNotebookId] = useState("");
  const [status, setStatus] = useState("");
  const [editorCollapsed, setEditorCollapsed] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [pendingClear, setPendingClear] = useState<"clear" | "template" | null>(null);
  const wordCount = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  const charCount = markdown.length;
  const selectedKbName = kbName || itemTitle(knowledgeItems[0] || {}, "");

  const documentQuery = useQuery({
    queryKey: ["learning", "co-writer", "document", documentId],
    queryFn: () => getLearningCoWriterDocument(documentId),
    retry: 1,
  });

  useEffect(() => {
    const record = asRecord(documentQuery.data);
    if (!Object.keys(record).length) return;
    setTitle(itemTitle(record, "Untitled draft"));
    setMarkdown(textOf(record.content));
  }, [documentQuery.data]);

  useEffect(() => {
    if (!kbName && knowledgeItems[0]) {
      setKbName(itemTitle(knowledgeItems[0], ""));
    }
  }, [kbName, knowledgeItems]);

  useEffect(() => {
    if (!notebookId && notebookItems[0]) {
      setNotebookId(itemId(notebookItems[0]));
    }
  }, [notebookId, notebookItems]);

  const updateDocument = useMutation({
    mutationFn: () => {
      assertLearningWritesAllowed();
      return updateLearningCoWriterDocument(documentId, {
        title: title.trim() || null,
        content: markdown,
      });
    },
    onSuccess: (payload) => {
      onResult(payload);
      setStatus("Saved");
      toast.success("Document saved");
      void queryClient.invalidateQueries({ queryKey: learningKeys.coWriterDocuments });
      void queryClient.invalidateQueries({
        queryKey: ["learning", "co-writer", "document", documentId],
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const fullDraftEdit = useMutation({
    mutationFn: () => {
      assertLearningWritesAllowed();
      if (!instruction.trim()) throw new Error("Enter an editing instruction first.");
      return runLearningCoWriterEdit({
        text: markdown,
        instruction: instruction.trim(),
        action,
        source: source === "none" ? null : source,
        kb_name: source === "rag" ? selectedKbName || null : null,
      });
    },
    onSuccess: (payload) => {
      const edited = textOf(asRecord(payload).edited_text);
      if (edited) setMarkdown(edited);
      onResult(payload);
      setStatus(`Applied ${action} to the full draft`);
    },
    onError: (error) => toast.error(error.message),
  });

  const autoMark = useMutation({
    mutationFn: () => {
      assertLearningWritesAllowed();
      return runLearningCoWriterAutoMark({ text: markdown });
    },
    onSuccess: (payload) => {
      const marked = textOf(asRecord(payload).marked_text);
      if (marked) setMarkdown(marked);
      onResult(payload);
      setStatus("Applied auto-mark annotations");
    },
    onError: (error) => toast.error(error.message),
  });

  const saveToNotebook = useMutation({
    mutationFn: () => {
      assertLearningWritesAllowed();
      if (!notebookId) throw new Error("Choose a notebook first.");
      return addLearningNotebookRecordManual({
        notebook_ids: [notebookId],
        record_type: "co_writer",
        title: title.trim() || "Untitled draft",
        summary: notebookSummary(markdown, title.trim() || "Co-Writer draft"),
        user_query: "Co-Writer draft",
        output: markdown,
        metadata: {
          source: "zaki_learn",
          document_id: documentId,
        },
        kb_name: selectedKbName || null,
      });
    },
    onSuccess: (payload) => {
      onResult(payload);
      setStatus("Saved to notebook");
      toast.success("Saved to notebook");
      void queryClient.invalidateQueries({ queryKey: learningKeys.notebooks });
    },
    onError: (error) => toast.error(error.message),
  });

  const insertSnippet = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setMarkdown((value) => `${value}${snippet}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${markdown.slice(0, start)}${snippet}${markdown.slice(end)}`;
    setMarkdown(next);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + snippet.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const downloadMarkdown = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(title || "zaki-draft").replace(/[^a-z0-9-_]+/gi, "-")}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const confirmClearAction = () => {
    if (pendingClear === "clear") {
      setMarkdown("");
      setStatus("Draft cleared");
    }
    if (pendingClear === "template") {
      setMarkdown(CO_WRITER_SAMPLE_TEMPLATE);
      setStatus("Loaded example template");
    }
    setPendingClear(null);
  };

  const toolbar = [
    { label: "H1", Icon: Heading1, snippet: "# Heading\n\n" },
    { label: "H2", Icon: Heading2, snippet: "## Heading\n\n" },
    { label: "Bold", Icon: Bold, snippet: "**bold text**" },
    { label: "Italic", Icon: Italic, snippet: "_italic text_" },
    { label: "Quote", Icon: Quote, snippet: "> Quote\n\n" },
    { label: "Bulleted list", Icon: List, snippet: "- Item\n" },
    { label: "Numbered list", Icon: ListOrdered, snippet: "1. Item\n" },
    { label: "Code", Icon: Code2, snippet: "```text\ncode\n```\n" },
  ];

  if (documentQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 bg-zaki-base text-sm text-zaki-muted">
        <Loader2 className="size-4 animate-spin" />
        Loading draft...
      </div>
    );
  }

  if (documentQuery.isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-zaki-base text-center">
        <AlertTriangle className="size-7 text-amber-500" />
        <div>
          <p className="text-sm font-semibold text-zaki-text">Draft unavailable</p>
          <p className="mt-1 text-xs text-zaki-muted">The document could not be loaded.</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-9 items-center gap-2 rounded-zaki-md border border-zaki-border px-3 text-sm text-zaki-text hover:bg-zaki-hover"
        >
          <ArrowLeft className="size-4" />
          Back to drafts
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-full flex-col overflow-hidden bg-zaki-base">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zaki-border px-4 py-1.5">
        <div className="flex min-w-0 items-center gap-3 text-sm text-zaki-muted">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex shrink-0 items-center gap-1 rounded-zaki-md px-1.5 py-0.5 text-xs font-medium text-zaki-muted transition-colors hover:bg-zaki-hover hover:text-zaki-text"
            title="Back to documents"
          >
            <ArrowLeft className="size-3.5" />
            <span>Co-Writer</span>
          </button>
          <span className="text-zaki-muted/50">/</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => updateDocument.mutate()}
            maxLength={120}
            spellCheck={false}
            placeholder="Untitled draft"
            aria-label="Document title"
            className="min-w-0 max-w-96 flex-1 rounded-zaki-md border border-transparent bg-transparent px-2 py-0.5 font-medium text-zaki-text outline-none hover:bg-zaki-hover focus:border-zaki-brand focus:bg-zaki-raised"
          />
          <span className="hidden text-xs sm:inline">
            {wordCount} words · {charCount} chars
          </span>
          {updateDocument.isPending ? (
            <span className="hidden items-center gap-1 text-[10px] text-zaki-muted sm:inline-flex">
              <Loader2 className="size-2.5 animate-spin" />
              Saving...
            </span>
          ) : status ? (
            <span className="hidden text-[10px] text-zaki-muted sm:inline">{status}</span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setPendingClear("clear")}
            className="inline-flex size-8 items-center justify-center rounded-zaki-md text-rose-600 hover:bg-rose-50"
            title="Clear"
          >
            <Eraser className="size-4" />
          </button>
          <button
            type="button"
            onClick={downloadMarkdown}
            className="inline-flex size-8 items-center justify-center rounded-zaki-md text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text"
            title="Export Markdown"
          >
            <Download className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setPendingClear("template")}
            className="inline-flex size-8 items-center justify-center rounded-zaki-md text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text"
            title="Load Example Template"
          >
            <FileText className="size-4" />
          </button>
          <button
            type="button"
            disabled={updateDocument.isPending}
            onClick={() => updateDocument.mutate()}
            className="inline-flex h-8 items-center gap-1.5 rounded-zaki-md bg-zaki-brand px-3 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {updateDocument.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
            Save
          </button>
        </div>
      </header>

      <div className="flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-zaki-border px-3 py-1">
        {toolbar.map(({ label, Icon, snippet }) => (
          <button
            key={label}
            type="button"
            title={label}
            onClick={() => insertSnippet(snippet)}
            className="shrink-0 rounded-zaki-md p-1.5 text-zaki-muted transition-colors hover:bg-zaki-hover hover:text-zaki-text"
          >
            <Icon className="size-4" />
          </button>
        ))}
        <div className="mx-1 h-4 w-px shrink-0 bg-zaki-border" />
        <button
          type="button"
          onClick={() => setEditorCollapsed((value) => !value)}
          className="shrink-0 rounded-zaki-md px-2 py-1 text-[10px] font-medium text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text"
        >
          {editorCollapsed ? "Show editor" : "Hide editor"}
        </button>
        <button
          type="button"
          onClick={() => setPreviewCollapsed((value) => !value)}
          className="shrink-0 rounded-zaki-md px-2 py-1 text-[10px] font-medium text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text"
        >
          {previewCollapsed ? "Show preview" : "Hide preview"}
        </button>
        <span className="ml-auto shrink-0 rounded bg-zaki-hover px-1.5 py-0.5 text-[10px] text-zaki-muted">GFM</span>
      </div>

      <div className="grid shrink-0 gap-2 border-b border-zaki-border p-3 lg:grid-cols-[1fr_11rem_11rem_11rem_auto_auto]">
        <input
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          placeholder="Tell AI what to do with the draft..."
          className="h-9 rounded-zaki-md border border-zaki-border bg-zaki-raised px-3 text-sm text-zaki-text outline-none placeholder:text-zaki-muted focus:border-zaki-brand"
        />
        <select
          value={action}
          onChange={(event) => setAction(event.target.value as "rewrite" | "shorten" | "expand")}
          className="h-9 rounded-zaki-md border border-zaki-border bg-zaki-raised px-2 text-sm text-zaki-text outline-none focus:border-zaki-brand"
        >
          <option value="rewrite">Rewrite</option>
          <option value="shorten">Shorten</option>
          <option value="expand">Expand</option>
        </select>
        <select
          value={source}
          onChange={(event) => setSource(event.target.value as "none" | "rag" | "web")}
          className="h-9 rounded-zaki-md border border-zaki-border bg-zaki-raised px-2 text-sm text-zaki-text outline-none focus:border-zaki-brand"
        >
          <option value="none">No source</option>
          <option value="rag">Knowledge base</option>
          <option value="web">Web</option>
        </select>
        <select
          value={kbName}
          onChange={(event) => setKbName(event.target.value)}
          disabled={!knowledgeItems.length}
          className="h-9 rounded-zaki-md border border-zaki-border bg-zaki-raised px-2 text-sm text-zaki-text outline-none focus:border-zaki-brand disabled:opacity-60"
        >
          {knowledgeItems.length ? (
            knowledgeItems.map((item, index) => {
              const name = itemTitle(item, `kb-${index + 1}`);
              return (
                <option key={name} value={name}>
                  {name}
                </option>
              );
            })
          ) : (
            <option value="">No libraries</option>
          )}
        </select>
        <button
          type="button"
          disabled={fullDraftEdit.isPending || !instruction.trim()}
          onClick={() => fullDraftEdit.mutate()}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-zaki-md bg-zaki-brand px-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {fullDraftEdit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
          Full Draft
        </button>
        <button
          type="button"
          disabled={autoMark.isPending || !markdown.trim()}
          onClick={() => autoMark.mutate()}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-zaki-md border border-zaki-border px-3 text-sm font-semibold text-zaki-text hover:bg-zaki-hover disabled:opacity-60"
        >
          {autoMark.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Auto-mark
        </button>
      </div>

      <div className="grid shrink-0 gap-2 border-b border-zaki-border px-3 py-2 lg:grid-cols-[1fr_auto_auto]">
        <select
          value={notebookId}
          onChange={(event) => setNotebookId(event.target.value)}
          disabled={!notebookItems.length}
          className="h-9 rounded-zaki-md border border-zaki-border bg-zaki-raised px-2 text-sm text-zaki-text outline-none focus:border-zaki-brand disabled:opacity-60"
        >
          {notebookItems.length ? (
            notebookItems.map((item, index) => {
              const id = itemId(item, `notebook-${index + 1}`);
              return (
                <option key={id} value={id}>
                  {itemTitle(item, id)}
                </option>
              );
            })
          ) : (
            <option value="">No notebooks</option>
          )}
        </select>
        <button
          type="button"
          disabled={saveToNotebook.isPending || !notebookId || !markdown.trim()}
          onClick={() => saveToNotebook.mutate()}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-zaki-md border border-zaki-border px-3 text-sm font-semibold text-zaki-text hover:bg-zaki-hover disabled:opacity-60"
        >
          {saveToNotebook.isPending ? <Loader2 className="size-4 animate-spin" /> : <NotebookPen className="size-4" />}
          Save to Notebook
        </button>
        <button
          type="button"
          disabled={deleteDocument.isPending}
          onClick={() => {
            if (!window.confirm(`Delete draft "${title || documentId}"?`)) return;
            deleteDocument.mutate(documentId, {
              onSuccess: () => {
                onBack();
              },
            });
          }}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-zaki-md border border-rose-200 px-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
        >
          {deleteDocument.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          Delete
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {!editorCollapsed ? (
          <div className={cn("flex min-h-0 flex-col", previewCollapsed ? "w-full" : "w-1/2")}>
            <div className="flex shrink-0 items-center justify-between border-b border-zaki-border px-3 py-1">
              <span className="text-xs font-medium text-zaki-muted">Editor</span>
            </div>
            <textarea
              ref={textareaRef}
              value={markdown}
              onChange={(event) => setMarkdown(event.target.value)}
              spellCheck={false}
              className="min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-[13px] leading-relaxed text-zaki-text outline-none placeholder:text-zaki-muted"
              placeholder="Start writing in Markdown..."
            />
          </div>
        ) : null}
        {!previewCollapsed ? (
          <div className={cn("flex min-h-0 flex-col border-l border-zaki-border", editorCollapsed ? "w-full" : "w-1/2")}>
            <div className="flex shrink-0 items-center justify-between border-b border-zaki-border px-3 py-1">
              <span className="text-xs font-medium text-zaki-muted">Preview</span>
            </div>
            <div className="learning-markdown min-h-0 flex-1 overflow-y-auto p-5 text-sm leading-relaxed text-zaki-text">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {markdown || "_Nothing to preview yet._"}
              </ReactMarkdown>
            </div>
          </div>
        ) : null}
      </div>

      {pendingClear ? (
        <div className="fixed inset-x-0 bottom-5 z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-3 rounded-zaki-lg border border-zaki-border bg-zaki-raised px-4 py-3 shadow-lg">
          <span className="text-sm text-zaki-text">
            {pendingClear === "clear" ? "Clear this draft?" : "Replace this draft with the example template?"}
          </span>
          <button
            type="button"
            onClick={() => setPendingClear(null)}
            className="h-8 rounded-zaki-md border border-zaki-border px-3 text-xs font-semibold text-zaki-text hover:bg-zaki-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmClearAction}
            className="h-8 rounded-zaki-md bg-zaki-brand px-3 text-xs font-semibold text-white"
          >
            Confirm
          </button>
        </div>
      ) : null}
    </div>
  );
}

type QuestionBankFilter = "all" | "bookmarked" | "wrong";

function questionEntryId(item: Item, fallback: string) {
  return textOf(item.id) || textOf(item.entry_id) || fallback;
}

function questionCategoryId(item: Item) {
  return textOf(item.id) || textOf(item.category_id);
}

function questionEntryCategories(item: Item) {
  return itemList(item.categories, []);
}

function QuestionBankPanel({ items, onOpen }: { items: Item[]; onOpen: (item: Item) => void }) {
  const queryClient = useQueryClient();
  const assertLearningWritesAllowed = useLearningWriteGate();
  const [filter, setFilter] = useState<QuestionBankFilter>("all");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [renamingCategory, setRenamingCategory] = useState<{ id: string; name: string } | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: [...learningKeys.questions, "categories"],
    queryFn: listLearningQuestionCategories,
    retry: 1,
  });
  const categories: Item[] = useMemo(
    () => itemList(categoriesQuery.data, ["items", "categories"]),
    [categoriesQuery.data],
  );
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeCategoryId) {
        const categoriesForEntry = questionEntryCategories(item);
        if (!categoriesForEntry.some((category: Item) => questionCategoryId(category) === activeCategoryId)) {
          return false;
        }
      }
      if (filter === "bookmarked") return Boolean(item.bookmarked);
      if (filter === "wrong") return item.is_correct === false;
      return true;
    });
  }, [activeCategoryId, filter, items]);

  const refreshQuestions = () => {
    void queryClient.invalidateQueries({ queryKey: learningKeys.questions });
    void queryClient.invalidateQueries({ queryKey: [...learningKeys.questions, "categories"] });
  };

  const toggleBookmark = useMutation({
    mutationFn: ({ id, bookmarked }: { id: string; bookmarked: boolean }) => {
      assertLearningWritesAllowed();
      return updateLearningQuestionEntry(id, { bookmarked });
    },
    onMutate: ({ id }) => setPendingActionId(id),
    onSuccess: refreshQuestions,
    onError: (error) => toast.error(error.message),
    onSettled: () => setPendingActionId(null),
  });
  const deleteEntry = useMutation({
    mutationFn: (id: string) => {
      assertLearningWritesAllowed();
      return deleteLearningQuestionEntry(id);
    },
    onMutate: (id) => setPendingActionId(id),
    onSuccess: refreshQuestions,
    onError: (error) => toast.error(error.message),
    onSettled: () => setPendingActionId(null),
  });
  const removeFromCategory = useMutation({
    mutationFn: ({ entryId, categoryId }: { entryId: string; categoryId: string }) => {
      assertLearningWritesAllowed();
      return removeLearningQuestionEntryCategory(entryId, categoryId);
    },
    onMutate: ({ entryId }) => setPendingActionId(entryId),
    onSuccess: refreshQuestions,
    onError: (error) => toast.error(error.message),
    onSettled: () => setPendingActionId(null),
  });
  const createCategory = useMutation({
    mutationFn: (name: string) => {
      assertLearningWritesAllowed();
      return createLearningQuestionCategory(name);
    },
    onSuccess: () => {
      setNewCategoryName("");
      refreshQuestions();
    },
    onError: (error) => toast.error(error.message),
  });
  const renameCategory = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => {
      assertLearningWritesAllowed();
      return renameLearningQuestionCategory(id, name);
    },
    onSuccess: () => {
      setRenamingCategory(null);
      refreshQuestions();
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteCategory = useMutation({
    mutationFn: (id: string) => {
      assertLearningWritesAllowed();
      return deleteLearningQuestionCategory(id);
    },
    onSuccess: (_, id) => {
      if (activeCategoryId === id) setActiveCategoryId(null);
      refreshQuestions();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-zaki-lg border border-zaki-border bg-zaki-base">
        <button
          type="button"
          onClick={() => setManagerOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-zaki-text hover:bg-zaki-hover"
        >
          <span className="flex items-center gap-2">
            <FolderOpen className="size-3.5 text-zaki-muted" />
            Manage Categories
            <span className="rounded-full bg-zaki-hover px-1.5 py-0.5 text-[10px] text-zaki-muted">
              {categories.length}
            </span>
          </span>
          <ChevronDown className={cn("size-3.5 text-zaki-muted transition-transform", managerOpen && "rotate-180")} />
        </button>

        {managerOpen ? (
          <div className="border-t border-zaki-border px-4 pb-4 pt-3">
            <div className="space-y-1.5">
              {categories.length ? (
                categories.map((category: Item, index: number) => {
                  const id = questionCategoryId(category) || `category-${index}`;
                  const name = itemTitle(category, id);
                  const renaming = renamingCategory?.id === id;
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between gap-2 rounded-zaki-md bg-zaki-hover/60 px-3 py-2"
                    >
                      {renaming ? (
                        <input
                          autoFocus
                          value={renamingCategory.name}
                          onChange={(event) =>
                            setRenamingCategory({ id, name: event.target.value })
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && renamingCategory.name.trim()) {
                              renameCategory.mutate({ id, name: renamingCategory.name.trim() });
                            }
                            if (event.key === "Escape") setRenamingCategory(null);
                          }}
                          onBlur={() => {
                            if (renamingCategory?.name.trim()) {
                              renameCategory.mutate({ id, name: renamingCategory.name.trim() });
                            } else {
                              setRenamingCategory(null);
                            }
                          }}
                          className="min-w-0 flex-1 rounded-zaki-sm border border-zaki-border bg-zaki-base px-2 py-1 text-xs text-zaki-text outline-none focus:border-zaki-brand"
                        />
                      ) : (
                        <span className="min-w-0 flex-1 truncate text-xs text-zaki-text">
                          {name}
                          <span className="ml-1.5 text-zaki-muted">
                            ({numericOf(category.entry_count)})
                          </span>
                        </span>
                      )}
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setRenamingCategory({ id, name })}
                          className="rounded-zaki-sm p-1 text-zaki-muted hover:bg-zaki-base hover:text-zaki-text"
                          title="Rename category"
                        >
                          <Pencil className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Delete this category?")) deleteCategory.mutate(id);
                          }}
                          className="rounded-zaki-sm p-1 text-zaki-muted hover:bg-red-500/10 hover:text-red-600"
                          title="Delete category"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="py-2 text-center text-xs text-zaki-muted">No categories yet.</p>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && newCategoryName.trim()) {
                    createCategory.mutate(newCategoryName.trim());
                  }
                }}
                placeholder="New category name..."
                className="h-9 min-w-0 flex-1 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-sm text-zaki-text outline-none placeholder:text-zaki-muted focus:border-zaki-brand"
              />
              <button
                type="button"
                disabled={!newCategoryName.trim() || createCategory.isPending}
                onClick={() => createCategory.mutate(newCategoryName.trim())}
                className="inline-flex size-9 items-center justify-center rounded-zaki-md bg-zaki-brand text-white disabled:opacity-40"
                title="Create category"
              >
                {createCategory.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {[
            ["all", "All"],
            ["bookmarked", "Bookmarked"],
            ["wrong", "Wrong Only"],
          ].map(([value, label]) => {
            const active = filter === value && !activeCategoryId;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setFilter(value as QuestionBankFilter);
                  setActiveCategoryId(null);
                }}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-zaki-md px-3 text-xs font-medium transition-colors",
                  active
                    ? "bg-zaki-hover text-zaki-text"
                    : "text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text",
                )}
              >
                {value === "bookmarked" ? <Bookmark className="size-3.5" /> : null}
                {value === "wrong" ? <AlertTriangle className="size-3.5" /> : null}
                {label}
              </button>
            );
          })}
          {categories.length ? <span className="mx-1 text-zaki-border">|</span> : null}
          {categories.map((category: Item, index: number) => {
            const id = questionCategoryId(category) || `category-${index}`;
            const active = activeCategoryId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveCategoryId(id);
                  setFilter("all");
                }}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-zaki-md px-3 text-xs font-medium transition-colors",
                  active
                    ? "bg-zaki-hover text-zaki-text"
                    : "text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text",
                )}
              >
                <FolderOpen className="size-3.5" />
                {itemTitle(category, id)}
              </button>
            );
          })}
        </div>
        <span className="shrink-0 text-xs text-zaki-muted">Total: {filteredItems.length}</span>
      </div>

      {filteredItems.length ? (
        <ul className="space-y-3">
          {filteredItems.map((item, index) => {
            const id = questionEntryId(item, `question-${index + 1}`);
            const disabled = pendingActionId === id;
            const options = asRecord(item.options);
            const categoriesForEntry = questionEntryCategories(item);
            const question = textOf(item.question) || itemTitle(item, "Question");
            const isCorrect = item.is_correct === true;
            const bookmarked = Boolean(item.bookmarked);
            return (
              <li
                key={id}
                className={cn(
                  "rounded-zaki-lg border border-zaki-border bg-zaki-base px-5 py-4 shadow-sm",
                  disabled && "opacity-60",
                )}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      {textOf(item.difficulty) ? (
                        <span className="rounded-zaki-sm bg-zaki-hover px-1.5 py-0.5 text-[10px] font-medium uppercase text-zaki-muted">
                          {textOf(item.difficulty)}
                        </span>
                      ) : null}
                      <span className="rounded-zaki-sm bg-zaki-hover px-1.5 py-0.5 text-[10px] font-medium text-zaki-muted">
                        {textOf(item.question_type, "question")}
                      </span>
                      <span
                        className={cn(
                          "rounded-zaki-sm px-1.5 py-0.5 text-[10px] font-semibold",
                          isCorrect
                            ? "bg-emerald-500/10 text-emerald-700"
                            : "bg-red-500/10 text-red-700",
                        )}
                      >
                        {isCorrect ? "Correct" : "Incorrect"}
                      </span>
                    </div>
                    <div className="learning-markdown text-sm font-medium leading-relaxed text-zaki-text">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{question}</ReactMarkdown>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleBookmark.mutate({ id, bookmarked: !bookmarked })}
                      disabled={disabled}
                      title={bookmarked ? "Remove bookmark" : "Bookmark"}
                      className={cn(
                        "rounded-zaki-md p-1.5 text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text disabled:opacity-40",
                        bookmarked && "text-zaki-brand",
                      )}
                    >
                      <Bookmark className="size-4" fill={bookmarked ? "currentColor" : "none"} />
                    </button>
                    {activeCategoryId ? (
                      <button
                        type="button"
                        onClick={() => removeFromCategory.mutate({ entryId: id, categoryId: activeCategoryId })}
                        disabled={disabled}
                        title="Remove from category"
                        className="rounded-zaki-md p-1.5 text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text disabled:opacity-40"
                      >
                        <X className="size-4" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Delete this entry?")) deleteEntry.mutate(id);
                      }}
                      disabled={disabled}
                      title="Delete"
                      className="rounded-zaki-md p-1.5 text-zaki-muted hover:bg-red-500/10 hover:text-red-600 disabled:opacity-40"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                {Object.keys(options).length ? (
                  <div className="mb-3 space-y-1.5">
                    {Object.entries(options).map(([key, value]) => {
                      const userAnswer = textOf(item.user_answer).toUpperCase();
                      const correctAnswer = textOf(item.correct_answer).toUpperCase();
                      const optionKey = key.toUpperCase();
                      const isUserAnswer = userAnswer === optionKey;
                      const isCorrectAnswer = correctAnswer === optionKey;
                      return (
                        <div
                          key={key}
                          className={cn(
                            "flex items-start gap-2.5 rounded-zaki-md border px-3 py-2 text-[13px]",
                            isCorrectAnswer
                              ? "border-emerald-300 bg-emerald-500/10"
                              : isUserAnswer && !isCorrect
                                ? "border-red-300 bg-red-500/10"
                                : "border-transparent bg-zaki-hover/50",
                          )}
                        >
                          <span className="mt-px shrink-0 font-semibold text-zaki-muted">{optionKey}.</span>
                          <span className="min-w-0 flex-1 text-zaki-text">{textOf(value)}</span>
                          {isCorrectAnswer ? (
                            <span className="mt-px shrink-0 text-[10px] font-medium text-emerald-700">
                              Correct
                            </span>
                          ) : null}
                          {isUserAnswer && !isCorrect ? (
                            <span className="mt-px shrink-0 text-[10px] font-medium text-red-700">
                              Your pick
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mb-3 grid gap-2 text-[13px] sm:grid-cols-2">
                    <QuestionAnswerBox
                      label={`Your Answer ${isCorrect ? "✓" : "✗"}`}
                      value={textOf(item.user_answer, "-")}
                      tone={isCorrect ? "good" : "bad"}
                    />
                    <QuestionAnswerBox
                      label="Reference Answer"
                      value={textOf(item.correct_answer, "-")}
                      tone="good"
                    />
                  </div>
                )}

                {textOf(item.explanation) ? (
                  <div className="mb-3 rounded-zaki-md border border-blue-300/60 bg-blue-500/10 px-3 py-2.5">
                    <div className="mb-1 text-[11px] font-medium uppercase tracking-normal text-blue-700">
                      Explanation
                    </div>
                    <div className="learning-markdown text-[13px] leading-relaxed text-zaki-text">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{textOf(item.explanation)}</ReactMarkdown>
                    </div>
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zaki-muted">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpen(item)}
                      className="inline-flex items-center gap-1.5 rounded-zaki-md border border-zaki-border bg-zaki-hover/50 px-2.5 py-1 hover:bg-zaki-hover hover:text-zaki-text"
                    >
                      <FileSearch className="size-3" />
                      Details
                    </button>
                    {textOf(item.session_title) ? (
                      <span className="inline-flex items-center gap-1.5 rounded-zaki-md border border-zaki-border bg-zaki-hover/50 px-2.5 py-1">
                        <MessageSquare className="size-3" />
                        {textOf(item.session_title)}
                      </span>
                    ) : null}
                    {categoriesForEntry.map((category: Item, categoryIndex: number) => (
                      <span
                        key={`${id}-category-${categoryIndex}`}
                        className="inline-flex items-center gap-1 rounded-zaki-md bg-zaki-hover px-2 py-1"
                      >
                        <FolderOpen className="size-3" />
                        {itemTitle(category, "Category")}
                      </span>
                    ))}
                  </div>
                  <span>
                    {textOf(item.created_at)
                      ? new Date(numericOf(item.created_at) * 1000).toLocaleString()
                      : ""}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-zaki-lg border border-dashed border-zaki-border text-center">
          <div className="mb-3 rounded-zaki-lg bg-zaki-hover p-2.5 text-zaki-muted">
            <ClipboardList className="size-5" />
          </div>
          <p className="text-sm font-medium text-zaki-text">No entries yet</p>
          <p className="mt-1.5 max-w-xs text-sm text-zaki-muted">
            Questions from your quizzes will appear here.
          </p>
        </div>
      )}
    </div>
  );
}

function QuestionAnswerBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "bad";
}) {
  return (
    <div
      className={cn(
        "rounded-zaki-md border px-3 py-2.5",
        tone === "good"
          ? "border-emerald-300/70 bg-emerald-500/10"
          : "border-red-300/70 bg-red-500/10",
      )}
    >
      <div
        className={cn(
          "mb-1 text-[11px] font-medium uppercase tracking-normal",
          tone === "good" ? "text-emerald-700" : "text-red-700",
        )}
      >
        {label}
      </div>
      <div className="learning-markdown text-zaki-text">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
      </div>
    </div>
  );
}

function LearningChannelField({
  fieldKey,
  schema,
  value,
  onChange,
  secretFields,
  path,
}: {
  fieldKey: string;
  schema: LearningChannelJsonSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  secretFields: Set<string>;
  path: string;
}) {
  const variant = resolveLearningChannelSchemaVariant(schema);
  const label = schema.title || variant.title || humanizeLearningChannelKey(fieldKey);
  const description = schema.description || variant.description;
  const enumValues = variant.enum ?? schema.enum;
  const isSecret = secretFields.has(path);

  if (variant.type === "boolean") {
    return (
      <label className="flex items-start gap-2 text-[13px] text-zaki-text">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5"
        />
        <span>
          {label}
          {description ? <span className="ml-1 text-[11px] text-zaki-muted">- {description}</span> : null}
        </span>
      </label>
    );
  }

  if (Array.isArray(enumValues) && enumValues.length) {
    return (
      <label className="block text-[12px] font-medium text-zaki-muted">
        {label}
        <select
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1 block h-9 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-[13px] text-zaki-text outline-none focus:border-zaki-brand"
        >
          {enumValues.map((option) => (
            <option key={String(option)} value={String(option)}>
              {String(option)}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (variant.type === "array" && (variant.items?.type === "string" || !variant.items)) {
    const lines = Array.isArray(value) ? value.map(String) : [];
    return (
      <label className="block text-[12px] font-medium text-zaki-muted">
        {label}
        <textarea
          value={lines.join("\n")}
          onChange={(event) =>
            onChange(
              event.target.value
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean),
            )
          }
          rows={Math.max(3, Math.min(8, lines.length + 1))}
          className="mt-1 w-full rounded-zaki-md border border-zaki-border bg-zaki-base px-3 py-2 font-mono text-[13px] text-zaki-text outline-none focus:border-zaki-brand"
        />
        {description ? <span className="mt-1 block text-[11px] font-normal text-zaki-muted">{description}</span> : null}
      </label>
    );
  }

  if (variant.type === "object" && variant.properties) {
    const record = asRecord(value);
    return (
      <fieldset className="space-y-2.5 rounded-zaki-lg border border-zaki-border/70 px-3 py-2.5">
        <legend className="px-1 text-[12px] font-medium text-zaki-muted">{label}</legend>
        {description ? <p className="text-[11px] text-zaki-muted">{description}</p> : null}
        {Object.entries(variant.properties).map(([key, child]) => (
          <LearningChannelField
            key={key}
            fieldKey={key}
            schema={child}
            value={record[key] ?? defaultLearningChannelValue(child)}
            onChange={(next) => onChange({ ...record, [key]: next })}
            secretFields={secretFields}
            path={path ? `${path}.${key}` : key}
          />
        ))}
      </fieldset>
    );
  }

  if (variant.type === "integer" || variant.type === "number") {
    return (
      <label className="block text-[12px] font-medium text-zaki-muted">
        {label}
        <input
          type="number"
          value={typeof value === "number" ? value : ""}
          onChange={(event) => {
            const raw = event.target.value;
            if (!raw) {
              onChange(isLearningChannelNullable(schema) ? null : 0);
              return;
            }
            onChange(variant.type === "integer" ? parseInt(raw, 10) : parseFloat(raw));
          }}
          className="mt-1 block h-9 w-40 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-[13px] text-zaki-text outline-none focus:border-zaki-brand"
        />
        {description ? <span className="mt-1 block text-[11px] font-normal text-zaki-muted">{description}</span> : null}
      </label>
    );
  }

  const stringValue = value === null || value === undefined ? "" : String(value);
  return (
    <label className="block text-[12px] font-medium text-zaki-muted">
      {label}
      <input
        type={isSecret ? "password" : "text"}
        autoComplete={isSecret ? "new-password" : "off"}
        spellCheck={!isSecret}
        value={stringValue}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next === "" && isLearningChannelNullable(schema) ? null : next);
        }}
        placeholder={isSecret ? "Leave blank to keep saved secret" : undefined}
        className={cn(
          "mt-1 block h-9 w-full rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-[13px] text-zaki-text outline-none focus:border-zaki-brand",
          isSecret && "font-mono",
        )}
      />
      {description ? <span className="mt-1 block text-[11px] font-normal text-zaki-muted">{description}</span> : null}
    </label>
  );
}

function TutorChannelsPanel({
  bots,
  channelsSchema,
}: {
  bots: Item[];
  channelsSchema: unknown;
}) {
  const queryClient = useQueryClient();
  const assertLearningWritesAllowed = useLearningWriteGate();
  const catalog = useMemo(() => learningChannelSchemaCatalog(channelsSchema), [channelsSchema]);
  const channelEntries = useMemo(() => Object.entries(catalog.channels), [catalog.channels]);
  const [selectedBot, setSelectedBot] = useState("");
  const [activeChannel, setActiveChannel] = useState("");
  const [channels, setChannels] = useState<Record<string, unknown>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!selectedBot && bots[0]) setSelectedBot(tutorAgentId(bots[0], "agent-1"));
  }, [bots, selectedBot]);

  useEffect(() => {
    if (!activeChannel && channelEntries[0]) setActiveChannel(channelEntries[0][0]);
  }, [activeChannel, channelEntries]);

  useEffect(() => {
    if (!selectedBot) return;
    let cancelled = false;
    setLoadingDetail(true);
    getLearningTutorAgent(selectedBot)
      .then((payload) => {
        if (cancelled) return;
        const raw = asRecord(asRecord(payload).channels);
        const next: Record<string, unknown> = {
          send_progress: raw.send_progress !== false,
          send_tool_hints: Boolean(raw.send_tool_hints),
        };
        for (const [name, entry] of channelEntries) {
          const rawConfig = asRecord(raw[name]);
          next[name] = Object.keys(rawConfig).length ? rawConfig : entry.default_config;
        }
        setChannels(next);
      })
      .catch((error) => toast.error(error.message))
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedBot, channelEntries]);

  const saveChannels = useMutation({
    mutationFn: () => {
      assertLearningWritesAllowed();
      if (!selectedBot) throw new Error("Choose a tutor first.");
      return updateLearningTutorAgent(selectedBot, { channels });
    },
    onSuccess: () => {
      toast.success("Channels saved");
      void queryClient.invalidateQueries({ queryKey: learningKeys.tutorAgents });
      void queryClient.invalidateQueries({ queryKey: learningKeys.tutorAgentRecent });
      void queryClient.invalidateQueries({ queryKey: ["learning", "tutor-agent", selectedBot] });
    },
    onError: (error) => toast.error(error.message),
  });

  if (!bots.length) {
    return <EmptyLine label="Create a bot first to configure channels." />;
  }

  const activeEntry = activeChannel ? catalog.channels[activeChannel] : undefined;
  const activeValue = activeChannel ? asRecord(channels[activeChannel]) : {};
  const activeSecretFields = new Set(activeEntry?.secret_fields ?? []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-[12px] font-medium text-zaki-muted">Bot</label>
        <select
          value={selectedBot}
          onChange={(event) => setSelectedBot(event.target.value)}
          className="h-9 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-[13px] text-zaki-text outline-none focus:border-zaki-brand"
        >
          {bots.map((bot, index) => {
            const id = tutorAgentId(bot, `agent-${index + 1}`);
            return (
              <option key={id} value={id}>
                {itemTitle(bot, id)} ({id})
              </option>
            );
          })}
        </select>
        <button
          type="button"
          disabled={saveChannels.isPending || loadingDetail}
          onClick={() => saveChannels.mutate()}
          className="inline-flex h-9 items-center gap-2 rounded-zaki-md bg-zaki-brand px-3 text-[12px] font-semibold text-white disabled:opacity-50"
        >
          {saveChannels.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Save
        </button>
      </div>

      <div className="rounded-zaki-lg border border-zaki-border bg-zaki-raised p-4">
        <h3 className="text-[13px] font-semibold text-zaki-text">Delivery</h3>
        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-2 text-[13px] text-zaki-text">
            <input
              type="checkbox"
              checked={channels.send_progress !== false}
              onChange={(event) => setChannels((current) => ({ ...current, send_progress: event.target.checked }))}
            />
            Stream progress text to channels
          </label>
          <label className="flex items-center gap-2 text-[13px] text-zaki-text">
            <input
              type="checkbox"
              checked={Boolean(channels.send_tool_hints)}
              onChange={(event) => setChannels((current) => ({ ...current, send_tool_hints: event.target.checked }))}
            />
            Stream tool hints to channels
          </label>
        </div>
      </div>

      {loadingDetail || !channelEntries.length ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-zaki-muted" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[190px_1fr]">
          <aside className="h-fit rounded-zaki-lg border border-zaki-border bg-zaki-raised p-2">
            <div className="space-y-1">
              {channelEntries.map(([name, entry]) => {
                const enabled = asRecord(channels[name]).enabled === true;
                const active = activeChannel === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setActiveChannel(name)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-zaki-md px-2.5 py-2 text-left text-[13px] transition-colors",
                      active ? "bg-zaki-hover font-medium text-zaki-text" : "text-zaki-muted hover:text-zaki-text",
                    )}
                  >
                    <span className="truncate">{entry.display_name}</span>
                    {enabled ? <span className="ml-2 size-1.5 shrink-0 rounded-full bg-emerald-500" /> : null}
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="space-y-3 rounded-zaki-lg border border-zaki-border bg-zaki-raised p-4">
            {activeEntry ? (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-semibold text-zaki-text">{activeEntry.display_name}</h3>
                  <code className="text-[11px] text-zaki-muted">{activeEntry.name}</code>
                </div>
                {activeEntry.json_schema.description ? (
                  <p className="text-xs leading-relaxed text-zaki-muted">
                    {activeEntry.json_schema.description}
                  </p>
                ) : null}
                {Object.entries(activeEntry.json_schema.properties ?? {}).map(([key, schema]) => (
                  <LearningChannelField
                    key={key}
                    fieldKey={key}
                    schema={schema}
                    value={activeValue[key] ?? defaultLearningChannelValue(schema)}
                    onChange={(next) =>
                      setChannels((current) => ({
                        ...current,
                        [activeEntry.name]: {
                          ...asRecord(current[activeEntry.name]),
                          [key]: next,
                        },
                      }))
                    }
                    secretFields={activeSecretFields}
                    path={key}
                  />
                ))}
              </>
            ) : (
              <EmptyLine label="No channel schemas returned yet." />
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function TutorProfilesPanel({ bots, souls }: { bots: Item[]; souls: Item[] }) {
  const queryClient = useQueryClient();
  const assertLearningWritesAllowed = useLearningWriteGate();
  const [selectedBot, setSelectedBot] = useState("");
  const [activeFile, setActiveFile] = useState<TutorProfileFile>("SOUL.md");
  const [files, setFiles] = useState<Record<string, string>>({});
  const [editor, setEditor] = useState("");
  const [activeView, setActiveView] = useState<"edit" | "preview">("edit");
  const [selectedSoulId, setSelectedSoulId] = useState("_custom");
  const [sourceSoulId, setSourceSoulId] = useState<string | null>(null);
  const [pendingSoulId, setPendingSoulId] = useState<string | null>(null);
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveMode, setSaveMode] = useState<"file_only" | "update_template" | "new_template">("file_only");
  const [newTemplateName, setNewTemplateName] = useState("");
  const loadedProfileKeyRef = useRef("");

  useEffect(() => {
    if (!selectedBot && bots[0]) setSelectedBot(tutorAgentId(bots[0], "agent-1"));
  }, [bots, selectedBot]);

  const filesQuery = useQuery({
    queryKey: ["learning", "tutor-agent-files", selectedBot],
    queryFn: () => listLearningTutorAgentFiles(selectedBot),
    enabled: Boolean(selectedBot),
  });

  const soulTemplates = useMemo(
    () =>
      souls.map((soul, index) => ({
        id: itemId(soul, `soul-${index + 1}`),
        name: itemTitle(soul, `Soul template ${index + 1}`),
        content: textOf(soul.content) || textOf(soul.description),
      })),
    [souls],
  );

  const activeSoulTemplate = useMemo(
    () => soulTemplates.find((soul) => soul.id === selectedSoulId) ?? null,
    [selectedSoulId, soulTemplates],
  );
  const sourceSoulTemplate = useMemo(
    () => soulTemplates.find((soul) => soul.id === sourceSoulId) ?? null,
    [sourceSoulId, soulTemplates],
  );

  const matchSoulId = useCallback(
    (content: string) => soulTemplates.find((soul) => soul.content === content)?.id ?? "_custom",
    [soulTemplates],
  );

  const hasChanges = editor !== (files[activeFile] ?? "");

  useEffect(() => {
    if (!selectedBot || !filesQuery.data) return;
    const record = asRecord(filesQuery.data);
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      next[key] = textOf(value);
    }
    setFiles(next);
    const profileKey = `${selectedBot}:${activeFile}`;
    if (loadedProfileKeyRef.current !== profileKey) {
      setEditor(next[activeFile] ?? "");
      setActiveView("edit");
      loadedProfileKeyRef.current = profileKey;
    }
  }, [activeFile, filesQuery.data, selectedBot]);

  useEffect(() => {
    if (activeFile !== "SOUL.md" || hasChanges) return;
    const matched = matchSoulId(files["SOUL.md"] ?? "");
    setSelectedSoulId(matched);
    setSourceSoulId(matched === "_custom" ? null : matched);
  }, [activeFile, files, hasChanges, matchSoulId]);

  const applySoulSelection = useCallback(
    (nextId: string) => {
      if (nextId === "_custom") {
        setSelectedSoulId("_custom");
        setSourceSoulId(null);
        return;
      }
      const soul = soulTemplates.find((item) => item.id === nextId);
      if (!soul) return;
      setSelectedSoulId(nextId);
      setSourceSoulId(nextId);
      setEditor(soul.content);
      setActiveView("edit");
    },
    [soulTemplates],
  );

  const handleSoulSelect = (nextId: string) => {
    if (hasChanges) {
      setPendingSoulId(nextId);
      setReplaceModalOpen(true);
      return;
    }
    applySoulSelection(nextId);
  };

  const saveProfile = useMutation({
    mutationFn: async ({
      mode,
      templateName,
    }: {
      mode: "file_only" | "update_template" | "new_template";
      templateName?: string;
    }) => {
      assertLearningWritesAllowed();
      if (!selectedBot) throw new Error("Choose a tutor first.");
      if (activeFile === "SOUL.md") {
        const content = editor.trim();
        if (!content) throw new Error("SOUL.md is empty.");

        if (mode === "update_template") {
          if (!sourceSoulTemplate) throw new Error("No template selected to update.");
          await updateLearningTutorAgentSoul(sourceSoulTemplate.id, {
            name: sourceSoulTemplate.name,
            content: editor,
          });
        } else if (mode === "new_template") {
          const rawName = (templateName || "").trim();
          const id = learningSlug(rawName);
          if (!rawName || !id) throw new Error("Template name is required.");
          const existing = new Set(soulTemplates.map((soul) => soul.id));
          let nextId = id;
          let suffix = 2;
          while (existing.has(nextId)) {
            nextId = `${id}-${suffix}`;
            suffix += 1;
          }
          await createLearningTutorAgentSoul({ id: nextId, name: rawName, content: editor });
          setSelectedSoulId(nextId);
          setSourceSoulId(nextId);
        }
      }

      await updateLearningTutorAgentFile(selectedBot, activeFile, editor);
      if (activeFile === "SOUL.md") {
        await updateLearningTutorAgent(selectedBot, { persona: editor });
      }
    },
    onSuccess: () => {
      toast.success(`${activeFile} saved`);
      setFiles((current) => ({ ...current, [activeFile]: editor }));
      setSaveModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["learning", "tutor-agent-files", selectedBot] });
      void queryClient.invalidateQueries({ queryKey: learningKeys.tutorAgents });
      void queryClient.invalidateQueries({ queryKey: learningKeys.tutorAgentSouls });
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSaveClick = () => {
    if (activeFile !== "SOUL.md") {
      saveProfile.mutate({ mode: "file_only" });
      return;
    }
    setSaveMode(sourceSoulTemplate ? "update_template" : "file_only");
    setNewTemplateName(`${selectedBot || "custom"} soul`);
    setSaveModalOpen(true);
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "s") {
      event.preventDefault();
      handleSaveClick();
    }
  };

  if (!bots.length) {
    return <EmptyLine label="Create a bot first to edit profiles." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-[12px] font-medium text-zaki-muted">Bot</label>
        <select
          value={selectedBot}
          onChange={(event) => setSelectedBot(event.target.value)}
          className="h-9 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-[13px] text-zaki-text outline-none focus:border-zaki-brand"
        >
          {bots.map((bot, index) => {
            const id = tutorAgentId(bot, `agent-${index + 1}`);
            return (
              <option key={id} value={id}>
                {itemTitle(bot, id)} ({id})
              </option>
            );
          })}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b border-zaki-border pb-2">
        {TUTOR_PROFILE_FILES.map((filename) => (
          <button
            key={filename}
            type="button"
            onClick={() => setActiveFile(filename)}
            className={cn(
              "rounded-zaki-lg px-2.5 py-1 text-[12px] transition-colors",
              activeFile === filename
                ? "bg-zaki-hover font-medium text-zaki-text"
                : "text-zaki-muted hover:text-zaki-text",
            )}
          >
            {filename.replace(".md", "")}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(["edit", "preview"] as const).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setActiveView(view)}
              className={cn(
                "rounded-zaki-lg px-3 py-1.5 text-[12px] transition-colors",
                activeView === view
                  ? "bg-zaki-hover font-medium text-zaki-text"
                  : "text-zaki-muted hover:text-zaki-text",
              )}
            >
              {view === "edit" ? "Edit" : "Preview"}
            </button>
          ))}
          {activeFile === "SOUL.md" ? (
            <>
              <select
                value={selectedSoulId}
                onChange={(event) => handleSoulSelect(event.target.value)}
                className="h-8 rounded-zaki-md border border-zaki-border bg-zaki-base px-2.5 text-[12px] text-zaki-text outline-none focus:border-zaki-brand"
              >
                <option value="_custom">Custom</option>
                {soulTemplates.map((soul) => (
                  <option key={soul.id} value={soul.id}>
                    {soul.name}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-zaki-muted">
                {activeSoulTemplate
                  ? hasChanges
                    ? `Editing template "${activeSoulTemplate.name}"`
                    : `Using "${activeSoulTemplate.name}"`
                  : "Custom soul"}
              </span>
            </>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleSaveClick}
          disabled={saveProfile.isPending || !hasChanges}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-zaki-md px-3 text-[12px] font-semibold disabled:opacity-50",
            hasChanges
              ? "bg-zaki-brand text-white"
              : "border border-zaki-border text-zaki-muted",
          )}
        >
          {saveProfile.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          Save
        </button>
      </div>

      {filesQuery.isLoading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="size-5 animate-spin text-zaki-muted" />
        </div>
      ) : activeView === "edit" ? (
        <div>
          <textarea
            value={editor}
            onChange={(event) => setEditor(event.target.value)}
            onKeyDown={handleEditorKeyDown}
            spellCheck={false}
            placeholder={`Edit ${activeFile}...`}
            className="min-h-[420px] w-full resize-y rounded-zaki-lg border border-zaki-border bg-zaki-base px-5 py-4 font-mono text-[13px] leading-7 text-zaki-text outline-none focus:border-zaki-brand"
          />
          <p className="mt-2 text-[11px] text-zaki-muted">
            Cmd+S to save · Markdown supported{hasChanges ? " · Unsaved changes" : ""}
          </p>
        </div>
      ) : editor.trim() ? (
        <div className="rounded-zaki-lg border border-zaki-border bg-zaki-raised px-6 py-5">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{editor}</ReactMarkdown>
        </div>
      ) : (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-zaki-lg border border-dashed border-zaki-border text-center">
          <p className="text-sm font-medium text-zaki-text">{activeFile} is empty</p>
          <p className="mt-1 text-[13px] text-zaki-muted">Switch to Edit to add content.</p>
        </div>
      )}

      {saveModalOpen && activeFile === "SOUL.md" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-zaki-lg border border-zaki-border bg-zaki-base p-5 shadow-xl">
            <h3 className="text-[15px] font-semibold text-zaki-text">Save SOUL.md</h3>
            <p className="mt-1 text-[12px] text-zaki-muted">
              Save only this bot profile, overwrite the selected template, or save a new reusable template.
            </p>
            <div className="mt-4 space-y-2">
              <label className="flex items-center gap-2 text-[12px] text-zaki-text">
                <input
                  type="radio"
                  name="save-mode"
                  checked={saveMode === "file_only"}
                  onChange={() => setSaveMode("file_only")}
                />
                Save profile only
              </label>
              {sourceSoulTemplate ? (
                <label className="flex items-center gap-2 text-[12px] text-zaki-text">
                  <input
                    type="radio"
                    name="save-mode"
                    checked={saveMode === "update_template"}
                    onChange={() => setSaveMode("update_template")}
                  />
                  Save and overwrite template "{sourceSoulTemplate.name}"
                </label>
              ) : null}
              <label className="flex items-center gap-2 text-[12px] text-zaki-text">
                <input
                  type="radio"
                  name="save-mode"
                  checked={saveMode === "new_template"}
                  onChange={() => setSaveMode("new_template")}
                />
                Save and create new template
              </label>
            </div>
            {saveMode === "new_template" ? (
              <label className="mt-4 block text-[12px] font-medium text-zaki-muted">
                Template name
                <input
                  value={newTemplateName}
                  onChange={(event) => setNewTemplateName(event.target.value)}
                  placeholder="e.g. IELTS Mentor"
                  className="mt-1 h-10 w-full rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-[13px] text-zaki-text outline-none focus:border-zaki-brand"
                />
              </label>
            ) : null}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                disabled={saveProfile.isPending}
                className="rounded-zaki-md border border-zaki-border px-3 py-1.5 text-[12px] text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveProfile.mutate({ mode: saveMode, templateName: newTemplateName })}
                disabled={
                  saveProfile.isPending ||
                  (saveMode === "new_template" && !newTemplateName.trim())
                }
                className="inline-flex items-center gap-1.5 rounded-zaki-md bg-zaki-brand px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
              >
                {saveProfile.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                {saveMode === "update_template"
                  ? "Save and overwrite"
                  : saveMode === "new_template"
                    ? "Save and create"
                    : "Save profile"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {replaceModalOpen && activeFile === "SOUL.md" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-zaki-lg border border-zaki-border bg-zaki-base p-5 shadow-xl">
            <h3 className="text-[15px] font-semibold text-zaki-text">Replace SOUL.md content?</h3>
            <p className="mt-1 text-[12px] text-zaki-muted">
              You have unsaved changes. Switching templates will replace the current editor content.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setReplaceModalOpen(false);
                  setPendingSoulId(null);
                }}
                className="rounded-zaki-md border border-zaki-border px-3 py-1.5 text-[12px] text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingSoulId) applySoulSelection(pendingSoulId);
                  setReplaceModalOpen(false);
                  setPendingSoulId(null);
                }}
                className="rounded-zaki-md bg-zaki-brand px-3 py-1.5 text-[12px] font-semibold text-white"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TutorSoulsPanel({ souls }: { souls: Item[] }) {
  const queryClient = useQueryClient();
  const assertLearningWritesAllowed = useLearningWriteGate();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");

  const soulIds = useMemo(
    () => new Set(souls.map((soul, index) => itemId(soul, `soul-${index + 1}`))),
    [souls],
  );
  const newSoulId = learningSlug(newName);

  const invalidateSouls = () => {
    void queryClient.invalidateQueries({ queryKey: learningKeys.tutorAgentSouls });
  };

  const createSoul = useMutation({
    mutationFn: (payload: LearningJson) => {
      assertLearningWritesAllowed();
      return createLearningTutorAgentSoul(payload);
    },
    onSuccess: () => {
      toast.success("Soul template created");
      setCreating(false);
      setNewName("");
      setNewContent("");
      invalidateSouls();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateSoul = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: LearningJson }) => {
      assertLearningWritesAllowed();
      return updateLearningTutorAgentSoul(id, payload);
    },
    onSuccess: () => {
      toast.success("Soul template saved");
      setEditingId(null);
      setEditName("");
      setEditContent("");
      invalidateSouls();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteSoul = useMutation({
    mutationFn: (id: string) => {
      assertLearningWritesAllowed();
      return deleteLearningTutorAgentSoul(id);
    },
    onSuccess: () => {
      toast.success("Soul template deleted");
      setPendingDeleteId(null);
      setEditingId(null);
      invalidateSouls();
    },
    onError: (error) => toast.error(error.message),
  });

  const startEdit = (soul: Item, fallback: string) => {
    setCreating(false);
    setPendingDeleteId(null);
    setEditingId(itemId(soul, fallback));
    setEditName(itemTitle(soul, fallback));
    setEditContent(textOf(soul.content) || textOf(soul.description));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditContent("");
  };

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setPendingDeleteId(null);
    setNewName("");
    setNewContent("");
  };

  const submitCreate = () => {
    const name = newName.trim();
    if (!name || !newSoulId) return;
    if (soulIds.has(newSoulId)) {
      toast.error(`Soul ID "${newSoulId}" already exists`);
      return;
    }
    createSoul.mutate({ id: newSoulId, name, content: newContent });
  };

  const submitEdit = () => {
    if (!editingId || !editName.trim()) return;
    updateSoul.mutate({
      id: editingId,
      payload: { name: editName.trim(), content: editContent },
    });
  };

  const handleTextareaSave = (
    event: KeyboardEvent<HTMLTextAreaElement>,
    save: () => void,
  ) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "s") {
      event.preventDefault();
      save();
    }
  };

  const busy = createSoul.isPending || updateSoul.isPending || deleteSoul.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-zaki-muted">
          Reusable soul templates for creating and updating TutorBot profiles.
        </p>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex h-8 items-center gap-1.5 rounded-zaki-md border border-zaki-border px-3 text-[12px] font-medium text-zaki-muted transition-colors hover:bg-zaki-hover hover:text-zaki-text"
        >
          <Plus className="size-3" />
          New Soul
        </button>
      </div>

      {creating ? (
        <section className="rounded-zaki-lg border border-zaki-border bg-zaki-raised p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-zaki-text">New Soul</h2>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-zaki-md p-1 text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="grid gap-3">
            <label className="block text-[12px] font-medium text-zaki-muted">
              Name
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="e.g. Creative Writer"
                className="mt-1 h-10 w-full rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-[13px] text-zaki-text outline-none focus:border-zaki-brand"
              />
              {newSoulId ? (
                <span className="mt-1 block text-[11px] font-normal text-zaki-muted">
                  ID: {newSoulId}
                </span>
              ) : null}
            </label>
            <label className="block text-[12px] font-medium text-zaki-muted">
              Content
              <textarea
                value={newContent}
                onChange={(event) => setNewContent(event.target.value)}
                onKeyDown={(event) => handleTextareaSave(event, submitCreate)}
                placeholder="Define the soul in markdown..."
                rows={10}
                spellCheck={false}
                className="mt-1 w-full rounded-zaki-md border border-zaki-border bg-zaki-base px-3 py-2 font-mono text-[13px] leading-6 text-zaki-text outline-none focus:border-zaki-brand"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-zaki-md px-3 py-1.5 text-[12px] text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitCreate}
                disabled={busy || !newName.trim() || !newSoulId}
                className="inline-flex items-center gap-1.5 rounded-zaki-md bg-zaki-brand px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {createSoul.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                Create
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {!souls.length && !creating ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-zaki-lg border border-dashed border-zaki-border text-center">
          <div className="mb-3 rounded-zaki-lg bg-zaki-hover p-2.5 text-zaki-muted">
            <Heart className="size-4" />
          </div>
          <p className="text-sm font-medium text-zaki-text">No souls yet</p>
          <p className="mt-1.5 max-w-xs text-[13px] text-zaki-muted">
            Create your first reusable TutorBot soul template.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {souls.map((soul, index) => {
            const id = itemId(soul, `soul-${index + 1}`);
            const isEditing = editingId === id;
            const pendingDelete = pendingDeleteId === id;
            const deleting = deleteSoul.isPending && deleteSoul.variables === id;
            const title = itemTitle(soul, `Soul template ${index + 1}`);
            const content = textOf(soul.content) || textOf(soul.description);

            if (isEditing) {
              return (
                <section
                  key={id}
                  className="rounded-zaki-lg border border-zaki-brand bg-zaki-raised p-5"
                >
                  <div className="grid gap-3">
                    <label className="block text-[12px] font-medium text-zaki-muted">
                      Name
                      <input
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        className="mt-1 h-10 w-full rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-[13px] text-zaki-text outline-none focus:border-zaki-brand"
                      />
                    </label>
                    <label className="block text-[12px] font-medium text-zaki-muted">
                      Content
                      <textarea
                        value={editContent}
                        onChange={(event) => setEditContent(event.target.value)}
                        onKeyDown={(event) => handleTextareaSave(event, submitEdit)}
                        rows={12}
                        spellCheck={false}
                        className="mt-1 w-full rounded-zaki-md border border-zaki-border bg-zaki-base px-3 py-2 font-mono text-[13px] leading-6 text-zaki-text outline-none focus:border-zaki-brand"
                      />
                    </label>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-zaki-md px-3 py-1.5 text-[12px] text-zaki-muted hover:bg-zaki-hover hover:text-zaki-text"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={submitEdit}
                        disabled={busy || !editName.trim()}
                        className="inline-flex items-center gap-1.5 rounded-zaki-md bg-zaki-brand px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
                      >
                        {updateSoul.isPending ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Save className="size-3.5" />
                        )}
                        Save
                      </button>
                    </div>
                  </div>
                </section>
              );
            }

            return (
              <section
                key={id}
                className="group flex items-start justify-between gap-4 rounded-zaki-lg border border-zaki-border bg-zaki-raised px-5 py-4 transition-colors hover:border-zaki-brand/40 hover:bg-zaki-hover"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Heart className="size-3.5 shrink-0 text-zaki-muted" />
                    <h2 className="truncate text-sm font-semibold text-zaki-text">{title}</h2>
                    <span className="shrink-0 text-[11px] text-zaki-muted">{id}</span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 pl-6 text-[12px] leading-5 text-zaki-muted">
                    {content.replace(/^#.*\n+/g, "").slice(0, 240) || "No template content returned."}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    aria-label={`Edit ${title}`}
                    title={`Edit ${title}`}
                    onClick={() => startEdit(soul, id)}
                    className="inline-flex size-8 items-center justify-center rounded-zaki-md border border-zaki-border text-zaki-muted transition-colors hover:bg-zaki-base hover:text-zaki-text"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={pendingDelete ? `Confirm delete ${title}` : `Delete ${title}`}
                    title={pendingDelete ? "Click again to confirm" : `Delete ${title}`}
                    disabled={deleteSoul.isPending}
                    onClick={() => {
                      if (pendingDelete) {
                        deleteSoul.mutate(id);
                      } else {
                        setPendingDeleteId(id);
                      }
                    }}
                    className={cn(
                      "inline-flex size-8 items-center justify-center rounded-zaki-md border transition-colors disabled:opacity-50",
                      pendingDelete
                        ? "border-rose-500/40 bg-rose-500/10 text-rose-600"
                        : "border-zaki-border text-zaki-muted hover:bg-rose-500/10 hover:text-rose-600",
                    )}
                  >
                    {deleting ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
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
  startAgent,
  stopAgent,
  destroyAgent,
  items,
  recentItems,
  souls,
  channelsSchema,
  notebookItems,
  selectedAgentId,
  onOpenAgentChat,
  onCloseAgentChat,
  onResult,
}: {
  agentId: string;
  setAgentId: (value: string) => void;
  agentName: string;
  setAgentName: (value: string) => void;
  agentPersona: string;
  setAgentPersona: (value: string) => void;
  createAgent: UseMutationResult<unknown, Error, void, unknown>;
  startAgent: UseMutationResult<unknown, Error, string, unknown>;
  stopAgent: UseMutationResult<unknown, Error, string, unknown>;
  destroyAgent: UseMutationResult<unknown, Error, string, unknown>;
  items: Item[];
  recentItems: Item[];
  souls: Item[];
  channelsSchema: unknown;
  notebookItems: Item[];
  selectedAgentId: string;
  onOpenAgentChat: (agentId: string) => void;
  onCloseAgentChat: () => void;
  onResult: (value: unknown) => void;
}) {
  const [activeTab, setActiveTab] = useState<"bots" | "profiles" | "channels" | "souls">("bots");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [selectedCreateSoulId, setSelectedCreateSoulId] = useState("_custom");
  const createSoulTemplates = useMemo(
    () =>
      souls.map((soul, index) => ({
        id: itemId(soul, `soul-${index + 1}`),
        name: itemTitle(soul, `Soul template ${index + 1}`),
        content: textOf(soul.content) || textOf(soul.description),
      })),
    [souls],
  );
  const tabs = [
    { key: "bots" as const, label: "Bots", icon: Bot },
    { key: "profiles" as const, label: "Profiles", icon: FileText },
    { key: "channels" as const, label: "Channels", icon: Settings },
    { key: "souls" as const, label: "Soul Templates", icon: Heart },
  ];

  const selectCreateSoul = (nextSoulId: string) => {
    setSelectedCreateSoulId(nextSoulId);
    if (nextSoulId === "_custom") return;
    const soul = createSoulTemplates.find((template) => template.id === nextSoulId);
    if (soul) setAgentPersona(soul.content);
  };

  useEffect(() => {
    if (!agentId && !agentName && !agentPersona) {
      setSelectedCreateSoulId("_custom");
    }
  }, [agentId, agentName, agentPersona]);

  if (selectedAgentId) {
    return (
      <TutorAgentChatWorkspace
        agentId={selectedAgentId}
        notebookItems={notebookItems}
        onBack={onCloseAgentChat}
        onResult={onResult}
      />
    );
  }

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
            {recentItems.length ? (
              <section className="rounded-zaki-lg border border-zaki-border bg-zaki-raised p-4">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-normal text-zaki-muted">
                  <Clock3 className="size-3.5" />
                  Recent tutors
                </div>
                <div className="space-y-1">
                  {recentItems.map((item, index) => {
                    const id = tutorAgentId(item, `recent-agent-${index + 1}`);
                    const updated = textOf(item.updated_at) || textOf(item.last_active_at);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onOpenAgentChat(id)}
                        className="flex w-full items-center gap-2 rounded-zaki-md px-2 py-1.5 text-left text-[13px] text-zaki-muted transition-colors hover:bg-zaki-hover hover:text-zaki-text"
                      >
                        <span className={cn("size-1.5 rounded-full", statusTone(itemStatus(item)))} />
                        <span className="min-w-0 flex-1 truncate">{itemTitle(item, id)}</span>
                        {updated ? (
                          <span className="shrink-0 text-[10px] tabular-nums text-zaki-muted">
                            {relativeTime(updated)}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

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
                  aria-describedby="learning-create-bot-id-help"
                  className="h-10 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
                />
                <input
                  value={agentName}
                  onChange={(event) => setAgentName(event.target.value)}
                  placeholder="Display name"
                  className="h-10 rounded-zaki-md border border-zaki-border bg-zaki-base px-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
                />
              </div>
              <p id="learning-create-bot-id-help" className="mt-2 text-[12px] text-zaki-muted">
                Bot id is required to enable Create bot. Display name and soul can be changed later.
              </p>
              <div className="mt-3">
                <label className="mb-1 block text-[12px] font-medium text-zaki-muted">
                  Soul
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => selectCreateSoul("_custom")}
                    className={cn(
                      "rounded-zaki-md px-2.5 py-1 text-[12px] transition-colors",
                      selectedCreateSoulId === "_custom"
                        ? "bg-zaki-brand text-white"
                        : "bg-zaki-hover text-zaki-muted hover:text-zaki-text",
                    )}
                  >
                    Custom
                  </button>
                  {createSoulTemplates.map((soul) => (
                    <button
                      key={soul.id}
                      type="button"
                      onClick={() => selectCreateSoul(soul.id)}
                      className={cn(
                        "rounded-zaki-md px-2.5 py-1 text-[12px] transition-colors",
                        selectedCreateSoulId === soul.id
                          ? "bg-zaki-brand text-white"
                          : "bg-zaki-hover text-zaki-muted hover:text-zaki-text",
                      )}
                    >
                      {soul.name}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={agentPersona}
                onChange={(event) => {
                  setAgentPersona(event.target.value);
                  setSelectedCreateSoulId("_custom");
                }}
                placeholder="Persona and teaching style"
                className="mt-3 min-h-28 w-full resize-y rounded-zaki-md border border-zaki-border bg-zaki-base p-3 text-sm text-zaki-text outline-none focus:border-zaki-brand"
              />
              <button
                type="button"
                disabled={!agentId.trim() || createAgent.isPending}
                onClick={() => createAgent.mutate()}
                title={!agentId.trim() ? "Enter a bot id to enable Create bot." : undefined}
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
                  const id = tutorAgentId(item, `agent-${index + 1}`);
                  const pendingDelete = pendingDeleteId === id;
                  const deleting = destroyAgent.isPending && destroyAgent.variables === id;
                  const running = Boolean(item.running) || itemStatus(item) === "running";
                  const stopping = stopAgent.isPending && stopAgent.variables === id;
                  const starting = startAgent.isPending && startAgent.variables === id;
                  return (
                    <div
                      key={id}
                      className="group rounded-zaki-lg border border-zaki-border bg-zaki-raised p-4 transition-colors hover:border-zaki-brand/40 hover:bg-zaki-hover"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => onOpenAgentChat(id)}
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
                          onClick={() => onOpenAgentChat(id)}
                          className="rounded-zaki-md border border-zaki-border px-2 py-1 text-xs font-semibold text-zaki-text opacity-0 transition-opacity hover:bg-zaki-base group-hover:opacity-100"
                        >
                          Chat
                        </button>
                        {running ? (
                          <button
                            type="button"
                            disabled={stopAgent.isPending}
                            title="Stop tutor"
                            onClick={() => stopAgent.mutate(id)}
                            className="rounded-zaki-md p-1 text-zaki-muted opacity-0 transition-colors hover:bg-zaki-base hover:text-zaki-text disabled:opacity-50 group-hover:opacity-100"
                          >
                            {stopping ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Square className="size-3.5" />
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={startAgent.isPending}
                            title="Start tutor"
                            onClick={() => startAgent.mutate(id)}
                            className="rounded-zaki-md p-1 text-zaki-muted opacity-0 transition-colors hover:bg-zaki-base hover:text-zaki-text disabled:opacity-50 group-hover:opacity-100"
                          >
                            {starting ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Play className="size-3.5" />
                            )}
                          </button>
                        )}
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
          <TutorProfilesPanel bots={items} souls={souls} />
        ) : activeTab === "channels" ? (
          <TutorChannelsPanel bots={items} channelsSchema={channelsSchema} />
        ) : (
          <TutorSoulsPanel souls={souls} />
        )}
      </div>
    </div>
  );
}

function TutorAgentChatWorkspace({
  agentId,
  notebookItems,
  onBack,
  onResult,
}: {
  agentId: string;
  notebookItems: Item[];
  onBack: () => void;
  onResult: (value: unknown) => void;
}) {
  const queryClient = useQueryClient();
  const [notebookId, setNotebookId] = useState(() => itemId(notebookItems[0] || {}));
  const [exportStatus, setExportStatus] = useState("");
  const [chatMessages, setChatMessages] = useState<TutorChatMessage[]>([]);
  const detail = useQuery({
    queryKey: ["learning", "tutor-agent", agentId],
    queryFn: () => getLearningTutorAgent(agentId),
    retry: 1,
  });
  const activeTurns = useQuery({
    queryKey: ["learning", "tutor-agent", agentId, "turns", "active"],
    queryFn: () => getLearningTutorAgentActiveTurns(agentId),
    refetchInterval: (query) =>
      itemList(query.state.data, ["items", "turns", "active_turns"]).length ? 2000 : false,
    retry: 1,
  });
  const activeTurnItems = itemList(activeTurns.data, ["items", "turns", "active_turns"]);
  const activeTurnCount = activeTurnItems.length;
  const history = useQuery({
    queryKey: ["learning", "tutor-agent", agentId, "history"],
    queryFn: () => getLearningTutorAgentHistory(agentId),
    refetchInterval: activeTurnCount ? 2000 : false,
    retry: 1,
  });
  const detailRecord = asRecord(detail.data);
  const historyItems = itemList(history.data, ["messages", "items", "history"]);
  const title = itemTitle(detailRecord, agentId);
  const running = Boolean(detailRecord.running) || itemStatus(detailRecord) === "running";

  useEffect(() => {
    if (!notebookId && notebookItems[0]) {
      setNotebookId(itemId(notebookItems[0]));
    }
  }, [notebookId, notebookItems]);

  const restoredMessages = historyItems
    .map((item, index) => normalizeTutorHistoryMessage(item, index))
    .filter((item): item is TutorChatMessage => Boolean(item));
  const messagesForExport = chatMessages.length ? chatMessages : restoredMessages;

  const transcriptMarkdown = messagesForExport
    .map((message) => `## ${message.role}\n\n${message.content}`)
    .join("\n\n");

  const saveToNotebook = useMutation({
    mutationFn: () => {
      if (!notebookId) throw new Error("Choose a notebook first.");
      return addLearningNotebookRecordManual({
        notebook_ids: [notebookId],
        record_type: "tutorbot",
        title: title || agentId,
        summary: notebookSummary(transcriptMarkdown, title || "TutorBot chat"),
        user_query: "TutorBot chat",
        output: transcriptMarkdown || "No messages yet.",
        metadata: {
          source: "zaki_learn_tutorbot",
          bot_id: agentId,
          bot_name: title,
          total_message_count: messagesForExport.length,
        },
        kb_name: null,
      });
    },
    onSuccess: (payload) => {
      onResult(payload);
      setExportStatus("Saved to notebook");
      toast.success("Tutor chat saved");
      void queryClient.invalidateQueries({ queryKey: learningKeys.notebooks });
    },
    onError: (error) => toast.error(error.message),
  });

  const downloadMarkdown = () => {
    const blob = new Blob([transcriptMarkdown || `# ${title || agentId}\n\nNo messages yet.`], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(title || agentId).replace(/[^a-z0-9-_]+/gi, "-")}-tutorbot.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleTutorTurnComplete = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ["learning", "tutor-agent", agentId, "history"],
    });
    void queryClient.invalidateQueries({ queryKey: learningKeys.tutorAgents });
    void queryClient.invalidateQueries({ queryKey: learningKeys.tutorAgentRecent });
  }, [agentId, queryClient]);

  useEffect(() => {
    if (activeTurnCount) return;
    void queryClient.invalidateQueries({
      queryKey: ["learning", "tutor-agent", agentId, "history"],
    });
  }, [activeTurnCount, agentId, queryClient]);

  return (
    <div className="flex h-full min-h-full flex-col overflow-hidden bg-zaki-base">
      <header className="flex shrink-0 items-center gap-3 border-b border-zaki-border px-5 py-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-zaki-md p-1.5 text-zaki-muted transition-colors hover:bg-zaki-hover hover:text-zaki-text"
          title="Back to bots"
        >
          <ArrowLeft className="size-4" />
        </button>
        <Bot className="size-4 text-zaki-muted" />
        <span className="truncate text-sm font-medium text-zaki-text">
          {detail.isLoading ? "Loading tutor..." : title}
        </span>
        {running ? <span className="size-2 rounded-full bg-emerald-500" /> : null}
        {exportStatus ? <span className="text-[10px] text-zaki-muted">{exportStatus}</span> : null}
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <select
            value={notebookId}
            onChange={(event) => setNotebookId(event.target.value)}
            disabled={!notebookItems.length}
            className="hidden h-8 max-w-52 rounded-zaki-md border border-zaki-border bg-zaki-raised px-2 text-xs text-zaki-text outline-none focus:border-zaki-brand disabled:opacity-60 sm:block"
          >
            {notebookItems.length ? (
              notebookItems.map((item, index) => {
                const id = itemId(item, `notebook-${index + 1}`);
                return (
                  <option key={id} value={id}>
                    {itemTitle(item, id)}
                  </option>
                );
              })
            ) : (
              <option value="">No notebooks</option>
            )}
          </select>
          <button
            type="button"
            disabled={!notebookId || saveToNotebook.isPending}
            onClick={() => saveToNotebook.mutate()}
            className="rounded-zaki-md border border-zaki-border px-3 py-1.5 text-xs font-medium text-zaki-muted transition-colors hover:border-zaki-border hover:text-zaki-text disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save to Notebook
          </button>
          <button
            type="button"
            onClick={downloadMarkdown}
            className="rounded-zaki-md border border-zaki-border px-3 py-1.5 text-xs font-medium text-zaki-muted transition-colors hover:border-zaki-border hover:text-zaki-text"
          >
            Download Markdown
          </button>
        </div>
      </header>

      {detail.isError || history.isError ? (
        <div className="mx-auto mt-8 max-w-xl rounded-zaki-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Some tutor details could not be loaded. Chat can still connect if the WebSocket is available.
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        <TutorAgentChatPanel
          agentId={agentId}
          history={historyItems}
          activeTurnCount={activeTurnCount}
          onMessagesChange={setChatMessages}
          onTurnComplete={handleTutorTurnComplete}
        />
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
  onOpenCapability,
  onOpen,
}: {
  visionQuestion: string;
  setVisionQuestion: (value: string) => void;
  setVisionImage: (value: File | null) => void;
  analyzeVision: UseMutationResult<unknown, Error, void, unknown>;
  solveItems: Item[];
  onOpenCapability: (capability: string) => void;
  onOpen: (item: Item) => void;
}) {
  const workspaceEntries = [
    {
      capability: "deep_solve",
      title: "Deep Solve",
      description: "Multi-step reasoning and problem solving with tools.",
      Icon: BrainCircuit,
    },
    {
      capability: "deep_research",
      title: "Deep Research",
      description: "Comprehensive multi-agent research with source controls.",
      Icon: Microscope,
    },
    {
      capability: "deep_question",
      title: "Quiz Generation",
      description: "Generate custom or paper-mimic quiz questions.",
      Icon: PenLine,
    },
    {
      capability: "visualize",
      title: "Visualize",
      description: "Create SVG, Chart.js, Mermaid, or HTML visualizations.",
      Icon: BarChart3,
    },
    {
      capability: "math_animator",
      title: "Math Animator",
      description: "Generate math videos or storyboard images.",
      Icon: Clapperboard,
    },
  ];

  return (
    <Section
      title="Advanced workspaces"
      subtitle="Open upstream learning modes through the ZAKI-hosted chat gateway."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {workspaceEntries.map(({ capability, title, description, Icon }) => (
          <button
            key={capability}
            type="button"
            onClick={() => onOpenCapability(capability)}
            className="group flex min-h-32 flex-col rounded-zaki-lg border border-zaki-border bg-zaki-raised p-4 text-left transition-colors hover:border-zaki-brand/50 hover:bg-zaki-hover"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-zaki-md bg-zaki-base text-zaki-muted group-hover:text-zaki-brand">
                <Icon className="size-4" />
              </span>
              <h3 className="text-sm font-semibold text-zaki-text">{title}</h3>
            </div>
            <p className="text-xs leading-relaxed text-zaki-muted">{description}</p>
          </button>
        ))}
      </div>

      <h3 className="mb-3 text-sm font-semibold text-zaki-text">Image solve</h3>
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
  const assertLearningWritesAllowed = useLearningWriteGate();
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
      assertLearningWritesAllowed();
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
  const metadata = asRecord(item.metadata);
  const content =
    textOf(item.content) ||
    textOf(item.message) ||
    textOf(item.text) ||
    textOf(item.response);
  if (!content) return null;
  const events = learningRecords(item.events);
  const thinking = itemList(item.thinking, ["thinking", "progress"]).map((entry) =>
    typeof entry === "string" ? entry : learningEventText(textOf(asRecord(entry).type), asRecord(entry)),
  ).filter(Boolean);
  return {
    id: textOf(item.id, `history-${index}`),
    role,
    content,
    capability: textOf(item.capability) || textOf(metadata.capability),
    events: events.length ? events : undefined,
    thinking: thinking.length ? thinking : undefined,
  };
}

function TutorAgentChatPanel({
  agentId,
  history,
  activeTurnCount = 0,
  onMessagesChange,
  onTurnComplete,
}: {
  agentId: string;
  history: Item[];
  activeTurnCount?: number;
  onMessagesChange?: (messages: TutorChatMessage[]) => void;
  onTurnComplete?: () => void;
}) {
  const assertLearningWritesAllowed = useLearningWriteGate();
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
        .filter((item): item is TutorChatMessage => Boolean(item)),
    [historyKey],
  );

  useEffect(() => {
    if ((streaming || activeTurnCount) && messages.length) return;
    setMessages(initialMessages);
    setThinking([]);
    thinkingRef.current = [];
    if (!streaming && !activeTurnCount) setInput("");
  }, [agentId, activeTurnCount, initialMessages, messages.length, streaming]);

  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

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
        onTurnComplete?.();
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
  }, [agentId, onTurnComplete, socketAuthReady]);

  const sendMessage = () => {
    try {
      assertLearningWritesAllowed();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Learn writes are paused.");
      return;
    }
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
  const activityActive = streaming || activeTurnCount > 0;

  return (
    <div className="flex h-full min-h-0 flex-col bg-zaki-base">
      <div className="flex shrink-0 items-center justify-between border-b border-zaki-border px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold text-zaki-text">Tutor chat</h3>
          <p className="text-xs text-zaki-muted">
            {activityActive
              ? "Working in the ZAKI learning gateway"
              : connected
                ? "Connected through the ZAKI learning gateway"
                : "Connecting through the ZAKI learning gateway"}
          </p>
        </div>
        <span
          className={cn(
            "rounded-zaki-sm px-2 py-1 text-[11px] font-semibold",
            activityActive
              ? "bg-zaki-brand/10 text-zaki-brand"
              : connected
              ? "bg-emerald-500/10 text-emerald-700"
              : "bg-amber-500/10 text-amber-700",
          )}
        >
          {activityActive ? "Working" : connected ? "Live" : "Offline"}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 [scrollbar-gutter:stable]">
        <div className="mx-auto w-full max-w-[960px] space-y-5">
        {messages.length || thinking.length ? (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "text-sm",
                  message.role === "user"
                    ? "ml-auto max-w-[80%] rounded-zaki-lg rounded-br-md bg-zaki-brand px-4 py-2.5 text-white"
                    : message.role === "system"
                      ? "rounded-zaki-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800"
                      : "max-w-full text-zaki-text",
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
              <div className="border-l-2 border-zaki-border pl-3 text-xs text-zaki-muted">
                {thinking.slice(-3).map((entry, index) => (
                  <p key={`active-thinking-${index}`}>{entry}</p>
                ))}
              </div>
            ) : null}
            {activityActive && !thinking.length ? (
              <div className="flex items-center gap-2 text-[13px] text-zaki-muted">
                <Loader2 className="size-3.5 animate-spin" />
                <span>{activeTurnCount ? "Still working. You can leave and return." : "Thinking..."}</span>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </>
        ) : (
          <EmptyLine label="Send a message to start this tutor conversation." />
        )}
        </div>
      </div>
      <div className="shrink-0 border-t border-zaki-border px-6 py-3">
        <div className="mx-auto flex w-full max-w-[960px] gap-2">
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
            disabled={!connected || !input.trim() || activityActive}
            onClick={sendMessage}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-zaki-md bg-zaki-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Send className="size-4" />
            Send
          </button>
        </div>
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
