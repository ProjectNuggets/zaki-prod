import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Brain,
  CalendarClock,
  CloudRain,
  Download,
  FileText,
  Filter,
  GitBranch,
  Heart,
  Lightbulb,
  MessageSquareQuote,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";
import { SkeletonMemoryViewer } from "../ui/skeleton";

type MemoryMetadata = {
  conflictKey?: string;
  polarity?: number;
  userVerified?: boolean;
  editedFrom?: string;
  [key: string]: unknown;
};

interface MemoryRecord {
  id: string;
  content: string;
  type: string;
  createdAt?: string;
  created_at?: string;
  threadId?: string | null;
  metadata?: MemoryMetadata | null;
}

interface MemoryConflictRecord {
  id: string;
  new_content: string;
  new_type: string;
  new_confidence_score?: number;
  conflicting_content?: string | null;
  conflicting_type?: string | null;
  status?: string;
  created_at?: string;
}

interface PendingMemoryRecord {
  id: string;
  content: string;
  type: string;
  confidence_score?: number;
  created_at?: string;
}

interface MemoryViewerProps {
  userId: string;
  initialSearchQuery?: string | null;
}

type MemoryTypeStyle = {
  label: string;
  icon: LucideIcon;
  chipClass: string;
  iconClass: string;
};

const memoryTypeStyles: Record<string, MemoryTypeStyle> = {
  fact: {
    label: "Fact",
    icon: Lightbulb,
    chipClass:
      "border-[#d7e5ff] bg-[#edf4ff] text-[#2f4f84] dark:border-[#2a3d61] dark:bg-[#1a2436] dark:text-[#c4d8ff]",
    iconClass: "bg-[#edf4ff] text-[#2f4f84] dark:bg-[#1a2436] dark:text-[#c4d8ff]",
  },
  preference: {
    label: "Preference",
    icon: SlidersHorizontal,
    chipClass:
      "border-[#f0d6cf] bg-[#fbefeb] text-[#9f3f32] dark:border-[#5a2e27] dark:bg-[#2a1613] dark:text-[#ffb8aa]",
    iconClass: "bg-[#fbefeb] text-[#9f3f32] dark:bg-[#2a1613] dark:text-[#ffb8aa]",
  },
  context: {
    label: "Context",
    icon: MessageSquareQuote,
    chipClass:
      "border-zaki-subtle bg-zaki-hover text-zaki-secondary dark:border-zaki-dark dark:bg-zaki-dark-elevated dark:text-zaki-dark-subtle",
    iconClass: "bg-zaki-hover text-zaki-secondary dark:bg-zaki-dark-elevated dark:text-zaki-dark-subtle",
  },
  episode: {
    label: "Episode",
    icon: BookOpen,
    chipClass:
      "border-[#d5eedd] bg-[#ecf9f0] text-[#2f7352] dark:border-[#284433] dark:bg-[#162b21] dark:text-[#9fd7bc]",
    iconClass: "bg-[#ecf9f0] text-[#2f7352] dark:bg-[#162b21] dark:text-[#9fd7bc]",
  },
  emotion: {
    label: "Emotion",
    icon: Heart,
    chipClass:
      "border-[#ecd8e6] bg-[#f9edf5] text-[#8f4678] dark:border-[#4b2b43] dark:bg-[#241521] dark:text-[#e7b4d7]",
    iconClass: "bg-[#f9edf5] text-[#8f4678] dark:bg-[#241521] dark:text-[#e7b4d7]",
  },
  event: {
    label: "Event",
    icon: CalendarClock,
    chipClass:
      "border-[#e2ddf3] bg-[#f2effa] text-[#574a8f] dark:border-[#35305a] dark:bg-[#1e1b32] dark:text-[#cbc3f3]",
    iconClass: "bg-[#f2effa] text-[#574a8f] dark:bg-[#1e1b32] dark:text-[#cbc3f3]",
  },
  goal: {
    label: "Goal",
    icon: Target,
    chipClass:
      "border-[#f0e2c6] bg-[#faf3e1] text-[#8d6929] dark:border-[#554427] dark:bg-[#2a2418] dark:text-[#f4d79c]",
    iconClass: "bg-[#faf3e1] text-[#8d6929] dark:bg-[#2a2418] dark:text-[#f4d79c]",
  },
  relationship: {
    label: "Relationship",
    icon: Users,
    chipClass:
      "border-[#d4e8eb] bg-[#eaf5f7] text-[#2c6b74] dark:border-[#264147] dark:bg-[#152528] dark:text-[#a9d7de]",
    iconClass: "bg-[#eaf5f7] text-[#2c6b74] dark:bg-[#152528] dark:text-[#a9d7de]",
  },
  struggle: {
    label: "Challenge",
    icon: CloudRain,
    chipClass:
      "border-[#e2e4ed] bg-[#f1f2f8] text-[#5b6279] dark:border-[#353947] dark:bg-[#1b1e28] dark:text-[#bcc3d9]",
    iconClass: "bg-[#f1f2f8] text-[#5b6279] dark:bg-[#1b1e28] dark:text-[#bcc3d9]",
  },
};

const MEMORY_PAGE_SIZE = 80;

function normalizeCreatedAt(value?: string) {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function formatDateLabel(value: string, locale?: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString(locale, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTimeLabel(value: string, locale?: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortId(id?: string | null) {
  if (!id) return null;
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}...${id.slice(-4)}`;
}

function mergeMemoriesById(
  current: MemoryRecord[],
  incoming: MemoryRecord[]
): MemoryRecord[] {
  const map = new Map<string, MemoryRecord>();
  for (const memory of current) {
    map.set(memory.id, memory);
  }
  for (const memory of incoming) {
    if (!map.has(memory.id)) {
      map.set(memory.id, memory);
    }
  }
  return Array.from(map.values());
}

function getTypeStyle(type: string) {
  return memoryTypeStyles[type] || {
    label: type || "memory",
    icon: FileText,
    chipClass:
      "border-zaki-subtle bg-zaki-hover text-zaki-secondary dark:border-zaki-dark dark:bg-zaki-dark-elevated dark:text-zaki-dark-subtle",
    iconClass: "bg-zaki-hover text-zaki-secondary dark:bg-zaki-dark-elevated dark:text-zaki-dark-subtle",
  };
}

export function MemoryViewer({ userId, initialSearchQuery = "" }: MemoryViewerProps) {
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMoreMemories, setHasMoreMemories] = useState(false);
  const [loadingMoreMemories, setLoadingMoreMemories] = useState(false);
  const [conflicts, setConflicts] = useState<MemoryConflictRecord[]>([]);
  const [pendingMemories, setPendingMemories] = useState<PendingMemoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [conflictsLoading, setConflictsLoading] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [resolvingConflictId, setResolvingConflictId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"memories" | "pending" | "conflicts">("memories");
  const [searchQuery, setSearchQuery] = useState(String(initialSearchQuery || "").trim());
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.toLowerCase().startsWith("ar");
  const locale = i18n.language || undefined;

  const fetchPendingMemories = async (showErrors = true) => {
    setPendingLoading(true);
    try {
      const response = await apiRequest("/api/memory/confirmations");
      if (!response.ok) {
        throw new Error(t("memoryViewer.errors.fetchPending"));
      }
      const data = (await response.json()) as {
        confirmations?: PendingMemoryRecord[];
        pending?: PendingMemoryRecord[];
      };
      const pending = Array.isArray(data.confirmations)
        ? data.confirmations
        : Array.isArray(data.pending)
        ? data.pending
        : [];
      setPendingMemories(pending);
    } catch (err) {
      if (showErrors) {
        const message =
          err instanceof Error ? err.message : t("memoryViewer.errors.loadPending");
        toast.error(message);
      }
    } finally {
      setPendingLoading(false);
    }
  };

  const fetchMemories = async ({
    append = false,
    cursor = null,
  }: {
    append?: boolean;
    cursor?: string | null;
  } = {}) => {
    if (append) {
      setLoadingMoreMemories(true);
    } else {
      setLoading(true);
      setError(null);
      setNextCursor(null);
      setHasMoreMemories(false);
    }
    try {
      const params = new URLSearchParams();
      params.set("limit", String(MEMORY_PAGE_SIZE));
      if (cursor) {
        params.set("cursor", cursor);
      }

      const response = await apiRequest(`/api/memory/list?${params.toString()}`);
      if (!response.ok) {
        throw new Error(t("memoryViewer.errors.fetchMemories"));
      }
      const data = (await response.json()) as {
        memories?: MemoryRecord[];
        nextCursor?: string | null;
        hasMore?: boolean;
      };
      const normalized = (Array.isArray(data.memories) ? data.memories : []).map((memory) => ({
        ...memory,
        createdAt: normalizeCreatedAt(memory.createdAt || memory.created_at),
      }));
      setMemories((prev) =>
        append ? mergeMemoriesById(prev, normalized) : normalized
      );
      const next =
        typeof data.nextCursor === "string" && data.nextCursor.trim()
          ? data.nextCursor.trim()
          : null;
      setNextCursor(next);
      setHasMoreMemories(Boolean(data.hasMore) && Boolean(next));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("memoryViewer.errors.loadMemories");
      if (!append) {
        setError(message);
      }
      toast.error(message);
    } finally {
      if (append) {
        setLoadingMoreMemories(false);
      } else {
        setLoading(false);
      }
    }
  };

  const loadMoreMemories = async () => {
    if (!hasMoreMemories || !nextCursor || loadingMoreMemories) return;
    await fetchMemories({ append: true, cursor: nextCursor });
  };

  const fetchConflicts = async (showErrors = true) => {
    setConflictsLoading(true);
    try {
      const response = await apiRequest("/api/memory/conflicts");
      if (!response.ok) {
        throw new Error(t("memoryViewer.errors.fetchConflicts"));
      }
      const data = (await response.json()) as {
        conflicts?: MemoryConflictRecord[];
        count?: number;
      };
      const nextConflicts = Array.isArray(data.conflicts) ? data.conflicts : [];
      setConflicts(nextConflicts);
      const totalCount =
        typeof data.count === "number" ? data.count : nextConflicts.length;
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("zaki:memory-conflicts-count", {
            detail: { count: totalCount },
          })
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("memoryViewer.errors.loadConflicts");
      if (showErrors) {
        toast.error(message);
      }
    } finally {
      setConflictsLoading(false);
    }
  };

  useEffect(() => {
    void fetchMemories();
    void fetchPendingMemories(false);
    void fetchConflicts(false);
  }, [userId]);

  useEffect(() => {
    const nextQuery = String(initialSearchQuery || "").trim();
    if (!nextQuery) return;
    setActiveTab("memories");
    setTypeFilter("all");
    setSearchQuery(nextQuery);
  }, [initialSearchQuery]);

  useEffect(() => {
    if (activeTab === "pending") {
      void fetchPendingMemories();
      return;
    }
    if (activeTab === "conflicts") {
      void fetchConflicts();
    }
  }, [activeTab, userId]);

  const confirmPendingMemory = async (confirmationId: string) => {
    setPendingActionId(confirmationId);
    try {
      const response = await apiRequest(`/api/memory/confirmations/${confirmationId}/confirm`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(t("memoryViewer.errors.confirmMemory"));
      }
      setPendingMemories((prev) => prev.filter((memory) => memory.id !== confirmationId));
      await fetchMemories();
      toast.success(t("memoryViewer.toasts.memoryStored"));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("memoryViewer.errors.confirmMemory");
      toast.error(message);
    } finally {
      setPendingActionId(null);
    }
  };

  const rejectPendingMemory = async (confirmationId: string) => {
    setPendingActionId(confirmationId);
    try {
      const response = await apiRequest(`/api/memory/confirmations/${confirmationId}/reject`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(t("memoryViewer.errors.rejectMemory"));
      }
      setPendingMemories((prev) => prev.filter((memory) => memory.id !== confirmationId));
      toast.success(t("memoryViewer.toasts.memorySkipped"));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("memoryViewer.errors.rejectMemory");
      toast.error(message);
    } finally {
      setPendingActionId(null);
    }
  };

  const resolveConflict = async (conflictId: string, action: "keep_existing" | "use_new") => {
    setResolvingConflictId(conflictId);
    try {
      const response = await apiRequest(`/api/memory/conflicts/${conflictId}/resolve`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        throw new Error(t("memoryViewer.errors.resolveConflict"));
      }
      const next = conflicts.filter((conflict) => conflict.id !== conflictId);
      setConflicts(next);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("zaki:memory-conflicts-count", {
            detail: { count: next.length },
          })
        );
      }
      await fetchMemories();
      toast.success(
        action === "use_new"
          ? t("memoryViewer.toasts.incomingMemorySaved")
          : t("memoryViewer.toasts.existingMemoryKept")
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : t("memoryViewer.errors.resolveConflict");
      toast.error(message);
    } finally {
      setResolvingConflictId(null);
    }
  };

  const deleteMemory = async (memoryId: string) => {
    if (!window.confirm(t("memoryViewer.delete.confirm"))) {
      return;
    }

    try {
      const response = await apiRequest(`/api/memory/${memoryId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(t("memoryViewer.errors.deleteMemory"));
      }
      setMemories((prev) => prev.filter((memory) => memory.id !== memoryId));
      toast.success(t("memoryViewer.toasts.memoryDeleted"));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("memoryViewer.errors.deleteMemory");
      toast.error(message);
    }
  };

  const filteredMemories = useMemo(() => {
    return memories
      .filter((memory) => {
        const matchesSearch =
          searchQuery.trim().length === 0 ||
          memory.content.toLowerCase().includes(searchQuery.trim().toLowerCase());
        const matchesType = typeFilter === "all" || memory.type === typeFilter;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        const aTime = new Date(a.createdAt || "").getTime();
        const bTime = new Date(b.createdAt || "").getTime();
        return bTime - aTime;
      });
  }, [memories, searchQuery, typeFilter]);

  const groupedMemories = useMemo(() => {
    const groups = new Map<string, MemoryRecord[]>();
    for (const memory of filteredMemories) {
      const createdAt = memory.createdAt || new Date().toISOString();
      const key = formatDateLabel(createdAt, locale);
      const existing = groups.get(key) || [];
      existing.push(memory);
      groups.set(key, existing);
    }
    return Array.from(groups.entries());
  }, [filteredMemories, locale]);

  const availableTypes = useMemo(() => {
    return Array.from(new Set(memories.map((memory) => memory.type))).sort();
  }, [memories]);

  const memoryStats = useMemo(() => {
    return {
      stored: memories.length,
      pending: pendingMemories.length,
      conflicts: conflicts.length,
      filtered: filteredMemories.length,
    };
  }, [memories.length, pendingMemories.length, conflicts.length, filteredMemories.length]);

  if (loading) {
    return <SkeletonMemoryViewer />;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[#e7c9c2] dark:border-[#5a2b24] bg-[#fff3f1] dark:bg-[#271713] p-6">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-full bg-[#ffe1db] dark:bg-[#3a1f1b] flex items-center justify-center flex-shrink-0 text-zaki-brand">
            <AlertTriangle className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-zaki-primary dark:text-[#ffe7e2] text-sm">
              {t("memoryViewer.errorCard.title")}
            </p>
            <p className="mt-1 text-xs text-zaki-secondary dark:text-[#ffc6bc]">{error}</p>
            <button
              type="button"
              onClick={() => {
                void fetchMemories();
                void fetchPendingMemories(false);
              }}
              className="mt-4 zaki-btn-sm zaki-btn-primary"
            >
              {t("memoryViewer.errorCard.retry")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-5", isRtl && "rtl text-right")}>
      <div className="rounded-2xl border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card px-4 py-4 shadow-[0px_14px_30px_rgba(15,15,15,0.06)]">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-[linear-gradient(135deg,#E56A54_0%,#219171_100%)] flex items-center justify-center text-white shadow-[0px_10px_24px_rgba(33,145,113,0.24)]">
            <Brain className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-zaki-primary dark:text-zaki-dark-primary">
              {t("memoryViewer.pipeline.title")}
            </h3>
            <p className="mt-1 text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
              {t("memoryViewer.pipeline.body")}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-zaki-subtle dark:border-zaki-dark bg-zaki-base dark:bg-zaki-dark-elevated px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-zaki-muted dark:text-zaki-dark-muted">
              {t("memoryViewer.pipeline.pending")}
            </div>
            <div className="mt-1 text-lg font-semibold text-zaki-primary dark:text-zaki-dark-primary">
              {memoryStats.pending}
            </div>
          </div>
          <div className="rounded-xl border border-zaki-subtle dark:border-zaki-dark bg-zaki-base dark:bg-zaki-dark-elevated px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-zaki-muted dark:text-zaki-dark-muted">
              {t("memoryViewer.pipeline.stored")}
            </div>
            <div className="mt-1 text-lg font-semibold text-zaki-primary dark:text-zaki-dark-primary">
              {memoryStats.stored}
              {hasMoreMemories ? "+" : ""}
            </div>
          </div>
          <div className="rounded-xl border border-[#f0d7d1] dark:border-[#5a2e27] bg-[#fbefeb] dark:bg-[#2a1613] px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-zaki-muted dark:text-[#d4b2ab]">
              {t("memoryViewer.pipeline.conflicts")}
            </div>
            <div className="mt-1 text-lg font-semibold text-zaki-brand dark:text-[#ffb6a4]">
              {memoryStats.conflicts}
            </div>
          </div>
          <div className="rounded-xl border border-zaki-subtle dark:border-zaki-dark bg-zaki-base dark:bg-zaki-dark-elevated px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-zaki-muted dark:text-zaki-dark-muted">
              {t("memoryViewer.pipeline.visible")}
            </div>
            <div className="mt-1 text-lg font-semibold text-zaki-primary dark:text-zaki-dark-primary">
              {memoryStats.filtered}
            </div>
          </div>
        </div>
        <div className={cn("mt-3 flex items-center gap-2 text-2xs text-zaki-muted dark:text-zaki-dark-muted", isRtl && "flex-row-reverse")}>
          <span>{t("memoryViewer.pipeline.stageExtract")}</span>
          <ArrowRight className="size-3" />
          <span>{t("memoryViewer.pipeline.stageReview")}</span>
          <ArrowRight className="size-3" />
          <span>{t("memoryViewer.pipeline.stageResolve")}</span>
          <ArrowRight className="size-3" />
          <span>{t("memoryViewer.pipeline.stageInject")}</span>
        </div>
      </div>

      <div className={cn("flex items-center gap-2", isRtl && "flex-row-reverse")}>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
            activeTab === "memories"
              ? "border-zaki-brand bg-zaki-brand text-white"
              : "border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card text-zaki-secondary dark:text-zaki-dark-subtle hover:bg-zaki-hover dark:hover:bg-zaki-dark-hover"
          )}
          onClick={() => setActiveTab("memories")}
        >
          <Sparkles className="size-3.5" />
          {t("memoryViewer.tabs.memories", { count: memories.length })}
        </button>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
            activeTab === "pending"
              ? "border-zaki-brand bg-zaki-brand text-white"
              : "border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card text-zaki-secondary dark:text-zaki-dark-subtle hover:bg-zaki-hover dark:hover:bg-zaki-dark-hover"
          )}
          onClick={() => setActiveTab("pending")}
        >
          <CalendarClock className="size-3.5" />
          {t("memoryViewer.tabs.pending", { count: pendingMemories.length })}
        </button>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
            activeTab === "conflicts"
              ? "border-zaki-brand bg-zaki-brand text-white"
              : "border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card text-zaki-secondary dark:text-zaki-dark-subtle hover:bg-zaki-hover dark:hover:bg-zaki-dark-hover"
          )}
          onClick={() => setActiveTab("conflicts")}
        >
          <AlertTriangle className="size-3.5" />
          {t("memoryViewer.tabs.conflicts", { count: conflicts.length })}
        </button>
      </div>

      {activeTab === "pending" ? (
        <div className="space-y-3">
          {pendingLoading ? (
            <div className="rounded-xl border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card px-4 py-3 text-sm text-zaki-muted dark:text-zaki-dark-muted">
              {t("memoryViewer.pending.loading")}
            </div>
          ) : pendingMemories.length === 0 ? (
            <div className="rounded-xl border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card px-4 py-6 text-center">
              <div className="inline-flex size-10 items-center justify-center rounded-full bg-zaki-success/10 text-zaki-success">
                <Sparkles className="size-5" />
              </div>
              <p className="mt-3 text-sm font-medium text-zaki-primary dark:text-zaki-dark-primary">
                {t("memoryViewer.pending.emptyTitle")}
              </p>
              <p className="mt-1 text-xs text-zaki-muted dark:text-zaki-dark-muted">
                {t("memoryViewer.pending.emptyBody")}
              </p>
            </div>
          ) : (
            pendingMemories.map((memory) => {
              const typeStyle = getTypeStyle(memory.type);
              const Icon = typeStyle.icon;
              const confidence =
                typeof memory.confidence_score === "number"
                  ? Math.round(memory.confidence_score * 100)
                  : null;
              const isProcessing = pendingActionId === memory.id;
              return (
                <article
                  key={memory.id}
                  className="rounded-2xl border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card px-4 py-4 shadow-[0px_12px_28px_rgba(15,15,15,0.06)]"
                >
                  <div className={cn("flex items-start gap-3", isRtl && "flex-row-reverse")}>
                    <div className={cn("size-9 rounded-xl flex items-center justify-center", typeStyle.iconClass)}>
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn("flex flex-wrap items-center gap-2", isRtl && "justify-end")}>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
                            typeStyle.chipClass
                          )}
                        >
                          {t(`memory.types.${memory.type}`, { defaultValue: typeStyle.label })}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-zaki-subtle dark:border-zaki-dark bg-zaki-base dark:bg-zaki-dark-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-zaki-dark-muted">
                          {t("memoryViewer.pending.reviewRequired")}
                        </span>
                        {confidence !== null && (
                          <span className="inline-flex items-center rounded-full border border-zaki-subtle dark:border-zaki-dark bg-zaki-base dark:bg-zaki-dark-elevated px-2 py-0.5 text-[10px] font-medium text-zaki-secondary dark:text-zaki-dark-subtle">
                            {t("memoryViewer.pending.confidence", { value: confidence })}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-zaki-primary dark:text-zaki-dark-primary leading-relaxed">
                        {memory.content}
                      </p>
                      <div className={cn("mt-3 text-2xs text-zaki-muted dark:text-zaki-dark-muted", isRtl && "text-right")}>
                        {memory.created_at
                          ? t("memoryViewer.pending.queuedAt", {
                              date: formatDateLabel(memory.created_at, locale),
                              time: formatTimeLabel(memory.created_at, locale),
                            })
                          : t("memoryViewer.pending.queuedRecent")}
                      </div>
                      <div className={cn("mt-3 flex items-center gap-2", isRtl && "flex-row-reverse")}>
                        <button
                          type="button"
                          className="zaki-btn-sm zaki-btn-primary disabled:opacity-60"
                          disabled={isProcessing}
                          onClick={() => void confirmPendingMemory(memory.id)}
                        >
                          {isProcessing
                            ? t("memoryViewer.pending.saving")
                            : t("memory.remember")}
                        </button>
                        <button
                          type="button"
                          className="zaki-btn-sm zaki-btn-secondary disabled:opacity-60"
                          disabled={isProcessing}
                          onClick={() => void rejectPendingMemory(memory.id)}
                        >
                          {t("memory.skip")}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      ) : activeTab === "conflicts" ? (
        <div className="space-y-3">
          {conflictsLoading ? (
            <div className="rounded-xl border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card px-4 py-3 text-sm text-zaki-muted dark:text-zaki-dark-muted">
              {t("memoryViewer.conflicts.loading")}
            </div>
          ) : conflicts.length === 0 ? (
            <div className="rounded-xl border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card px-4 py-6 text-center">
              <div className="inline-flex size-10 items-center justify-center rounded-full bg-zaki-success/10 text-zaki-success">
                <Sparkles className="size-5" />
              </div>
              <p className="mt-3 text-sm font-medium text-zaki-primary dark:text-zaki-dark-primary">
                {t("memoryViewer.conflicts.emptyTitle")}
              </p>
              <p className="mt-1 text-xs text-zaki-muted dark:text-zaki-dark-muted">
                {t("memoryViewer.conflicts.emptyBody")}
              </p>
            </div>
          ) : (
            conflicts.map((conflict) => {
              const isResolving = resolvingConflictId === conflict.id;
              const confidence =
                typeof conflict.new_confidence_score === "number"
                  ? Math.round(conflict.new_confidence_score * 100)
                  : null;

              return (
                <div
                  key={conflict.id}
                  className="rounded-2xl border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card px-4 py-4 shadow-[0px_12px_28px_rgba(15,15,15,0.06)]"
                >
                  <div className={cn("flex items-start justify-between gap-3", isRtl && "flex-row-reverse")}>
                    <div className={cn("flex items-start gap-2", isRtl && "flex-row-reverse")}>
                      <span className="mt-0.5 inline-flex size-7 items-center justify-center rounded-full bg-[rgba(210,68,48,0.12)] text-zaki-brand dark:bg-[rgba(210,68,48,0.18)] dark:text-[#ffb6a4]">
                        <AlertTriangle className="size-4" />
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                          {t("memoryViewer.conflicts.cardTitle")}
                        </div>
                        <div className="mt-1 text-2xs text-zaki-muted dark:text-zaki-dark-muted">
                          {conflict.created_at
                            ? t("memoryViewer.conflicts.detectedAt", {
                                date: formatDateLabel(conflict.created_at, locale),
                                time: formatTimeLabel(conflict.created_at, locale),
                              })
                            : t("memoryViewer.conflicts.detectedRecent")}
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-[#f0d7d1] dark:border-[#5a2e27] bg-[#fbefeb] dark:bg-[#2a1613] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zaki-brand dark:text-[#ffb6a4]">
                      {t("memory.pending")}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-zaki-subtle dark:border-zaki-dark bg-zaki-base dark:bg-zaki-dark-elevated px-3 py-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zaki-muted dark:text-zaki-dark-muted">
                        {t("memoryViewer.conflicts.currentMemory")}
                      </div>
                      <p className="mt-1.5 text-sm text-zaki-primary dark:text-zaki-dark-primary leading-relaxed">
                        {conflict.conflicting_content || t("memoryViewer.conflicts.notAvailable")}
                      </p>
                      <div className="mt-2 text-2xs text-zaki-muted dark:text-zaki-dark-muted uppercase tracking-[0.12em]">
                        {t("memoryViewer.conflicts.typeLabel")}:{" "}
                        {conflict.conflicting_type
                          ? t(`memory.types.${conflict.conflicting_type}`, {
                              defaultValue: conflict.conflicting_type,
                            })
                          : t("memoryViewer.conflicts.unknown")}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#f0d7d1] dark:border-[#5a2e27] bg-[#fff6f3] dark:bg-[#241512] px-3 py-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zaki-muted dark:text-[#d4b2ab]">
                        {t("memoryViewer.conflicts.incomingMemory")}
                      </div>
                      <p className="mt-1.5 text-sm text-zaki-primary dark:text-zaki-dark-primary leading-relaxed">
                        {conflict.new_content}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-2xs text-zaki-muted dark:text-[#d4b2ab] uppercase tracking-[0.12em]">
                        <span>
                          {t("memoryViewer.conflicts.typeLabel")}:{" "}
                          {conflict.new_type
                            ? t(`memory.types.${conflict.new_type}`, {
                                defaultValue: conflict.new_type,
                              })
                            : t("memoryViewer.conflicts.unknown")}
                        </span>
                        {confidence !== null && (
                          <span>| {t("memoryViewer.conflicts.confidence", { value: confidence })}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-2xs text-zaki-secondary dark:text-zaki-dark-subtle">
                    {t("memoryViewer.conflicts.help")}
                  </p>

                  <div className={cn("mt-4 flex items-center gap-2", isRtl && "flex-row-reverse")}>
                    <button
                      type="button"
                      className="zaki-btn-sm zaki-btn-secondary"
                      disabled={isResolving}
                      onClick={() => void resolveConflict(conflict.id, "keep_existing")}
                    >
                      {t("memoryViewer.conflicts.keepExisting")}
                    </button>
                    <button
                      type="button"
                      className="zaki-btn-sm zaki-btn-primary disabled:opacity-60"
                      disabled={isResolving}
                      onClick={() => void resolveConflict(conflict.id, "use_new")}
                    >
                      {isResolving
                        ? t("memoryViewer.conflicts.applying")
                        : t("memoryViewer.conflicts.useNew")}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card px-4 py-4">
            <div className="grid gap-3 md:grid-cols-[1fr_200px_auto] md:items-center">
              <label className="relative block">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 size-4 text-zaki-muted dark:text-zaki-dark-muted", isRtl ? "right-3" : "left-3")} />
                <input
                  type="text"
                  placeholder={t("memoryViewer.memories.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className={cn(
                    "w-full rounded-zaki-lg border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-elevated px-10 py-2.5 text-sm text-zaki-primary dark:text-zaki-dark-primary placeholder:text-zaki-muted dark:placeholder:text-zaki-dark-muted outline-none focus:border-zaki-focus",
                    isRtl && "text-right"
                  )}
                />
              </label>

              <label className={cn("inline-flex items-center gap-2 rounded-zaki-lg border border-zaki-subtle dark:border-zaki-dark bg-zaki-base dark:bg-zaki-dark-elevated px-3 py-2 text-xs text-zaki-secondary dark:text-zaki-dark-subtle", isRtl && "flex-row-reverse")}>
                <Filter className="size-3.5" />
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="bg-transparent text-sm text-zaki-primary dark:text-zaki-dark-primary outline-none"
                >
                  <option value="all">{t("memoryViewer.memories.allTypes")}</option>
                  {availableTypes.map((type) => (
                    <option key={type} value={type}>
                      {t(`memory.types.${type}`, { defaultValue: getTypeStyle(type).label })}
                    </option>
                  ))}
                </select>
              </label>

              <div className="text-xs text-zaki-muted dark:text-zaki-dark-muted">
                {t("memoryViewer.memories.shownCount", { count: filteredMemories.length })}
              </div>
            </div>
          </div>

          {filteredMemories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zaki-strong dark:border-zaki-dark bg-zaki-base dark:bg-zaki-dark-elevated px-6 py-10 text-center">
              <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-zaki-brand/10 text-zaki-brand dark:bg-zaki-brand/20 dark:text-[#ffb6a4]">
                <Brain className="size-6" />
              </div>
              <h4 className="mt-4 text-base font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                {searchQuery || typeFilter !== "all"
                  ? t("memoryViewer.memories.emptyFilteredTitle")
                  : t("memoryViewer.memories.emptyTitle")}
              </h4>
              <p className="mt-1 text-sm text-zaki-secondary dark:text-zaki-dark-subtle max-w-lg mx-auto">
                {searchQuery || typeFilter !== "all"
                  ? t("memoryViewer.memories.emptyFilteredBody")
                  : t("memoryViewer.memories.emptyBody")}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-5 max-h-[520px] overflow-y-auto pr-1">
                {groupedMemories.map(([dateLabel, dayMemories]) => (
                  <section key={dateLabel}>
                    <div className={cn("mb-3 flex items-center gap-2", isRtl && "flex-row-reverse")}>
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-zaki-subtle dark:border-zaki-dark bg-zaki-base dark:bg-zaki-dark-elevated px-3 py-1 text-2xs font-semibold text-zaki-secondary dark:text-zaki-dark-subtle">
                        <CalendarClock className="size-3.5" />
                        {dateLabel}
                      </div>
                      <div className="h-px flex-1 bg-zaki-subtle/40 dark:bg-zaki-dark" />
                    </div>

                    <div className="space-y-3">
                      {dayMemories.map((memory) => {
                        const typeStyle = getTypeStyle(memory.type);
                        const Icon = typeStyle.icon;
                        const createdAt = memory.createdAt || new Date().toISOString();
                        const conflictKey = memory.metadata?.conflictKey;

                        return (
                          <article
                            key={memory.id}
                            className="group rounded-2xl border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card px-4 py-4 shadow-[0px_10px_24px_rgba(15,15,15,0.05)] hover:border-zaki-strong dark:hover:border-[#4a3a2a] transition-colors"
                          >
                            <div className={cn("flex items-start gap-3", isRtl && "flex-row-reverse")}>
                              <div className={cn("size-9 rounded-xl flex items-center justify-center", typeStyle.iconClass)}>
                                <Icon className="size-4" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className={cn("flex flex-wrap items-center gap-2", isRtl && "justify-end")}>
                                  <span
                                    className={cn(
                                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
                                      typeStyle.chipClass
                                    )}
                                  >
                                    {t(`memory.types.${memory.type}`, { defaultValue: typeStyle.label })}
                                  </span>
                                  <span className="inline-flex items-center rounded-full border border-zaki-subtle dark:border-zaki-dark bg-zaki-base dark:bg-zaki-dark-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-zaki-dark-muted">
                                    {t("memoryViewer.memories.storedBadge")}
                                  </span>
                                  {conflictKey ? (
                                    <span className="inline-flex items-center rounded-full border border-zaki-subtle dark:border-zaki-dark bg-zaki-base dark:bg-zaki-dark-elevated px-2 py-0.5 text-[10px] font-medium text-zaki-secondary dark:text-zaki-dark-subtle">
                                      {conflictKey}
                                    </span>
                                  ) : null}
                                </div>

                                <p className="mt-2 text-sm text-zaki-primary dark:text-zaki-dark-primary leading-relaxed">
                                  {memory.content}
                                </p>

                                <div className={cn("mt-3 flex flex-wrap items-center gap-3 text-2xs text-zaki-muted dark:text-zaki-dark-muted", isRtl && "justify-end")}>
                                  <span className="inline-flex items-center gap-1">
                                    <CalendarClock className="size-3.5" />
                                    {formatTimeLabel(createdAt, locale)}
                                  </span>
                                  {memory.threadId ? (
                                    <span className="inline-flex items-center gap-1">
                                      <GitBranch className="size-3.5" />
                                      {t("memoryViewer.memories.threadLabel", {
                                        id: shortId(memory.threadId),
                                      })}
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => void deleteMemory(memory.id)}
                                className="shrink-0 inline-flex size-8 items-center justify-center rounded-lg border border-transparent text-zaki-muted dark:text-zaki-dark-muted hover:border-[#f0d7d1] dark:hover:border-[#5a2e27] hover:bg-[#fff1ed] dark:hover:bg-[#2a1613] hover:text-zaki-brand transition-colors"
                                aria-label={t("memoryViewer.delete.aria")}
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>

              {hasMoreMemories && (
                <div className={cn("flex justify-center pt-2", isRtl && "rtl")}>
                  <button
                  type="button"
                  onClick={() => void loadMoreMemories()}
                  disabled={loadingMoreMemories}
                  className="zaki-btn-sm zaki-btn-secondary disabled:opacity-60"
                >
                    {loadingMoreMemories
                      ? t("memoryViewer.memories.loadingMore")
                      : t("memoryViewer.memories.loadMore")}
                </button>
              </div>
            )}
            </>
          )}

          {memories.length > 0 && (
            <div className={cn("flex items-center justify-between gap-2 border-t border-zaki-subtle dark:border-zaki-dark pt-3", isRtl && "flex-row-reverse")}>
              <button
                type="button"
                onClick={() => {
                  toast.info(t("memoryViewer.toasts.refreshing"));
                  void fetchMemories();
                  void fetchPendingMemories(false);
                  if (activeTab === "conflicts") {
                    void fetchConflicts();
                  }
                }}
                className="inline-flex items-center gap-2 text-sm text-zaki-secondary dark:text-zaki-dark-subtle hover:text-zaki-primary dark:hover:text-zaki-dark-primary"
              >
                <RefreshCw className="size-4" />
                {t("memoryViewer.footer.refresh")}
              </button>

              <button
                type="button"
                onClick={() => {
                  try {
                    const dataBlob = new Blob([JSON.stringify(memories, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `zaki-memories-${new Date().toISOString().slice(0, 10)}.json`;
                    link.click();
                    URL.revokeObjectURL(url);
                    toast.success(t("memoryViewer.toasts.exported", { count: memories.length }));
                  } catch {
                    toast.error(t("memoryViewer.errors.exportMemories"));
                  }
                }}
                className="inline-flex items-center gap-2 text-sm text-zaki-brand hover:underline"
              >
                <Download className="size-4" />
                {t("memoryViewer.footer.exportJson")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
