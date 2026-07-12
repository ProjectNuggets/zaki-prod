import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BookOpen,
  Brain,
  CalendarClock,
  CloudRain,
  Download,
  Edit2,
  FileText,
  Filter,
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
import { apiRequest, patchMemory } from "@/lib/api";
import { SkeletonMemoryViewer } from "../ui/skeleton";
import { useMemoryPolicy } from "./MemoryModeToggle";
import { EmptyState, InlineConfirm, type MemoryRole } from "@/app/components/ui/zaki";

type MemoryMetadata = {
  conflictKey?: string;
  polarity?: number;
  userVerified?: boolean;
  editedFrom?: string;
  source?: string;
  channel?: string;
  lane?: string;
  imageRef?: string;
  imageUrl?: string;
  [key: string]: unknown;
};

interface MemoryRecord {
  id: string;
  content: string;
  type: string;
  status?: "active" | "outdated" | string;
  createdAt?: string;
  created_at?: string;
  updated_at?: string;
  threadId?: string | null;
  source?: string | null;
  role?: MemoryRole | string | null;
  at?: string | null;
  metadata?: MemoryMetadata | null;
}

interface MemoryViewerProps {
  userId: string;
  initialSearchQuery?: string | null;
  initialTab?: string;
  refreshKey?: number;
}

type MemorySummaryGroup =
  | "about_you"
  | "preferences"
  | "ongoing_work"
  | "relationships";

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

function getSummaryGroupForMemory(memory: MemoryRecord): MemorySummaryGroup {
  switch (memory.type) {
    case "preference":
      return "preferences";
    case "goal":
    case "context":
    case "episode":
    case "event":
    case "struggle":
      return "ongoing_work";
    case "relationship":
      return "relationships";
    case "fact":
    case "emotion":
    default:
      return "about_you";
  }
}

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

function panelViewForTab(tab?: string): "facts" | "timeline" {
  return tab === "timeline" ? "timeline" : "facts";
}

export function MemoryViewer({
  userId,
  initialSearchQuery = "",
  initialTab = "memories",
  refreshKey = 0,
}: MemoryViewerProps) {
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMoreMemories, setHasMoreMemories] = useState(false);
  const [loadingMoreMemories, setLoadingMoreMemories] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState("context");
  const [editStatus, setEditStatus] = useState<"active" | "outdated">("active");
  const [savingMemoryId, setSavingMemoryId] = useState<string | null>(null);
  const [pendingDeleteMemoryId, setPendingDeleteMemoryId] = useState<string | null>(null);
  const [panelView, setPanelView] = useState<"facts" | "timeline">(
    panelViewForTab(initialTab)
  );
  const [searchQuery, setSearchQuery] = useState(String(initialSearchQuery || "").trim());
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.toLowerCase().startsWith("ar");
  const locale = i18n.language || undefined;
  const {
    policy: memoryPolicy,
    setPolicy: setMemoryPolicy,
    loading: memoryPolicyLoading,
    saving: memoryPolicySaving,
  } = useMemoryPolicy();

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

  useEffect(() => {
    void fetchMemories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, refreshKey]);

  useEffect(() => {
    const nextQuery = String(initialSearchQuery || "").trim();
    if (!nextQuery) return;
    setPanelView(panelViewForTab(initialTab));
    setTypeFilter("all");
    setSearchQuery(nextQuery);
  }, [initialSearchQuery, initialTab]);

  useEffect(() => {
    setPanelView(panelViewForTab(initialTab));
  }, [initialTab]);

  useEffect(() => {
    // Both Facts (dossier) and Timeline (list) render from the memories list.
    void fetchMemories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelView, userId]);

  const deleteMemory = async (memoryId: string) => {
    setPendingDeleteMemoryId(null);
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

  const beginEditMemory = (memory: MemoryRecord) => {
    setEditingMemoryId(memory.id);
    setEditContent(memory.content);
    setEditType(memory.type);
    setEditStatus(memory.status === "outdated" ? "outdated" : "active");
  };

  const cancelEditMemory = () => {
    setEditingMemoryId(null);
    setEditContent("");
    setEditType("context");
    setEditStatus("active");
  };

  const applyMemoryPatch = async (
    memoryId: string,
    patch: { content?: string; type?: string; status?: "active" | "outdated" }
  ) => {
    setSavingMemoryId(memoryId);
    try {
      const { response, data } = await patchMemory(memoryId, patch);
      if (!response.ok || !data?.memory) {
        throw new Error(
          data?.error || t("memoryViewer.errors.updateMemory")
        );
      }
      const nextMemory = {
        ...(data.memory as MemoryRecord),
        createdAt: normalizeCreatedAt(
          (data.memory as MemoryRecord).createdAt ||
            (data.memory as MemoryRecord).created_at
        ),
      };
      setMemories((prev) =>
        prev.map((memory) => (memory.id === memoryId ? nextMemory : memory))
      );
      return true;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("memoryViewer.errors.updateMemory")
      );
      return false;
    } finally {
      setSavingMemoryId(null);
    }
  };

  const saveEditedMemory = async (memoryId: string) => {
    const saved = await applyMemoryPatch(memoryId, {
      content: editContent.trim(),
      type: editType,
      status: editStatus,
    });
    if (!saved) return;
    cancelEditMemory();
    toast.success(t("memoryViewer.toasts.memoryUpdated"));
  };

  const setMemoryStatus = async (
    memoryId: string,
    status: "active" | "outdated"
  ) => {
    const saved = await applyMemoryPatch(memoryId, { status });
    if (!saved) return;
    toast.success(
      status === "outdated"
        ? t("memoryViewer.toasts.memoryMarkedOutdated")
        : t("memoryViewer.toasts.memoryRestored")
    );
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


  const notebookGroups = useMemo(() => {
    const orderedMemories = memories
      .filter((memory) => (memory.status || "active") !== "outdated")
      .sort((a, b) => {
      const aTime = new Date(a.createdAt || a.created_at || "").getTime();
      const bTime = new Date(b.createdAt || b.created_at || "").getTime();
      return bTime - aTime;
      });

    const grouped = new Map<MemorySummaryGroup, string[]>([
      ["about_you", []],
      ["preferences", []],
      ["ongoing_work", []],
      ["relationships", []],
    ]);

    for (const memory of orderedMemories) {
      if (memory.type === "episodic") continue; // episodic is Timeline-only, not Facts
      const bucket = grouped.get(getSummaryGroupForMemory(memory));
      if (!bucket) continue;
      const content = String(memory.content || "").trim();
      if (!content || bucket.includes(content)) continue;
      if (bucket.length < 3) {
        bucket.push(content);
      }
    }

    return [
      {
        id: "about_you" as const,
        icon: Brain,
        title: t("memoryViewer.notebook.groups.about_you.title"),
        body: t("memoryViewer.notebook.groups.about_you.body"),
        items: grouped.get("about_you") || [],
      },
      {
        id: "preferences" as const,
        icon: SlidersHorizontal,
        title: t("memoryViewer.notebook.groups.preferences.title"),
        body: t("memoryViewer.notebook.groups.preferences.body"),
        items: grouped.get("preferences") || [],
      },
      {
        id: "ongoing_work" as const,
        icon: Target,
        title: t("memoryViewer.notebook.groups.ongoing_work.title"),
        body: t("memoryViewer.notebook.groups.ongoing_work.body"),
        items: grouped.get("ongoing_work") || [],
      },
      {
        id: "relationships" as const,
        icon: Users,
        title: t("memoryViewer.notebook.groups.relationships.title"),
        body: t("memoryViewer.notebook.groups.relationships.body"),
        items: grouped.get("relationships") || [],
      },
    ];
  }, [memories, t]);

  const memoriesListContent = (
    <>
      <div className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-4 dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)]">
        <div className="grid gap-3 md:grid-cols-[1fr_200px_auto] md:items-center">
          <label className="relative block">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 size-4 text-zaki-muted", isRtl ? "right-3" : "left-3")} />
            <input
              type="text"
              placeholder={t("memoryViewer.memories.searchPlaceholder")}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className={cn(
                "w-full rounded-zaki-md bg-zaki-hover border-0 px-10 py-2.5 text-sm text-zaki-primary placeholder:text-zaki-muted outline-none focus:ring-2 focus:ring-zaki-brand/20 transition-shadow",
                isRtl && "text-right"
              )}
            />
          </label>

          <label className={cn("inline-flex items-center gap-2 rounded-zaki-md bg-zaki-hover border-0 px-3 py-2 text-xs text-zaki-secondary", isRtl && "flex-row-reverse")}>
            <Filter className="size-3.5" />
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="bg-transparent text-sm text-zaki-primary outline-none"
            >
              <option value="all">{t("memoryViewer.memories.allTypes")}</option>
              {availableTypes.map((type) => (
                <option key={type} value={type}>
                  {t(`memory.types.${type}`, { defaultValue: getTypeStyle(type).label })}
                </option>
              ))}
            </select>
          </label>

          <div className="text-xs text-zaki-muted">
            {t("memoryViewer.memories.shownCount", { count: filteredMemories.length })}
          </div>
        </div>
      </div>

      {filteredMemories.length === 0 ? (
        <EmptyState
          icon={<Brain className="size-6" />}
          title={
            searchQuery || typeFilter !== "all"
              ? t("memoryViewer.memories.emptyFilteredTitle")
              : t("memoryViewer.memories.emptyTitle")
          }
          helper={
            searchQuery || typeFilter !== "all"
              ? t("memoryViewer.memories.emptyFilteredBody")
              : t("memoryViewer.memories.emptyBody")
          }
          action={
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setTypeFilter("all");
              }}
              className="inline-flex items-center rounded-full bg-zaki-brand text-white px-5 py-2 text-sm font-semibold shadow-[0_8px_24px_rgba(241,2,2,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-zaki-brand-hover"
            >
              {searchQuery || typeFilter !== "all"
                ? t("memoryViewer.memories.emptyFilteredBody")
                : t("memoryViewer.memories.emptyTitle")}
            </button>
          }
        />
      ) : (
        <>
          <div className="space-y-5 max-h-[520px] overflow-y-auto pr-1">
            {groupedMemories.map(([dateLabel, dayMemories]) => (
              <section key={dateLabel}>
                <div className={cn("mb-3 flex items-center gap-2", isRtl && "flex-row-reverse")}>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-zaki-hover px-3 py-1 text-2xs font-semibold text-zaki-secondary">
                    <CalendarClock className="size-3.5" />
                    {dateLabel}
                  </div>
                  <div className="h-px flex-1 bg-zaki-subtle/40 dark:bg-[rgba(240,236,230,0.08)]" />
                </div>

                <div className="space-y-3 zaki-cascade">
                  {dayMemories.map((memory) => {
                    const typeStyle = getTypeStyle(memory.type);
                    const Icon = typeStyle.icon;
                    const conflictKey = memory.metadata?.conflictKey;
                    const isEditing = editingMemoryId === memory.id;
                    const isSaving = savingMemoryId === memory.id;
                    const isOutdated = (memory.status || "active") === "outdated";

                    return (
                      <article
                        key={memory.id}
                        className="group rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-4 shadow-zaki-md hover:shadow-zaki-lg hover:-translate-y-0.5 transition-all duration-200 dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)]"
                      >
                        <div className={cn("flex items-start gap-3", isRtl && "flex-row-reverse")}>
                          <div className={cn("size-9 rounded-full flex items-center justify-center", typeStyle.iconClass)}>
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
                              <span className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
                                isOutdated
                                  ? "border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300"
                                  : "bg-zaki-hover text-zaki-muted"
                              )}>
                                {isOutdated
                                  ? t("memoryViewer.memories.outdatedBadge")
                                  : t("memoryViewer.memories.storedBadge")}
                              </span>
                              {memory.metadata?.editedFrom ? (
                                <span className="inline-flex items-center rounded-full bg-zaki-hover px-2 py-0.5 text-[10px] font-medium text-zaki-secondary">
                                  {t("memoryViewer.memories.editedBadge")}
                                </span>
                              ) : null}
                              {conflictKey ? (
                                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-800 px-2 py-0.5 text-[10px] font-medium dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                                  {conflictKey}
                                </span>
                              ) : null}
                            </div>

                            {isEditing ? (
                              <div className="mt-2 space-y-3">
                                <textarea
                                  value={editContent}
                                  onChange={(event) => setEditContent(event.target.value)}
                                  rows={3}
                                  className="w-full rounded-zaki-md bg-zaki-hover border-0 px-3 py-2 text-sm text-zaki-primary outline-none focus:ring-2 focus:ring-zaki-brand/20 transition-shadow"
                                />
                                <div className="grid gap-2 md:grid-cols-2">
                                  <select
                                    value={editType}
                                    onChange={(event) => setEditType(event.target.value)}
                                    className="rounded-zaki-md bg-zaki-hover border-0 px-3 py-2 text-sm text-zaki-primary outline-none focus:ring-2 focus:ring-zaki-brand/20 transition-shadow"
                                  >
                                    {Object.keys(memoryTypeStyles).map((type) => (
                                      <option key={type} value={type}>
                                        {t(`memory.types.${type}`, {
                                          defaultValue: getTypeStyle(type).label,
                                        })}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    value={editStatus}
                                    onChange={(event) =>
                                      setEditStatus(
                                        event.target.value === "outdated"
                                          ? "outdated"
                                          : "active"
                                      )
                                    }
                                    className="rounded-zaki-md bg-zaki-hover border-0 px-3 py-2 text-sm text-zaki-primary outline-none focus:ring-2 focus:ring-zaki-brand/20 transition-shadow"
                                  >
                                    <option value="active">
                                      {t("memoryViewer.memories.statusActive")}
                                    </option>
                                    <option value="outdated">
                                      {t("memoryViewer.memories.statusOutdated")}
                                    </option>
                                  </select>
                                </div>
                              </div>
                            ) : (
                              <p className="mt-2 text-sm text-zaki-primary leading-relaxed">
                                {memory.content}
                              </p>
                            )}

                            <div className={cn("mt-3 flex flex-wrap items-center gap-2", isRtl && "justify-end")}>
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    className="inline-flex items-center rounded-full bg-zaki-brand text-white px-4 py-1.5 text-xs font-semibold shadow-[0_8px_24px_rgba(241,2,2,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-zaki-brand-hover disabled:opacity-60 disabled:translate-y-0"
                                    disabled={isSaving}
                                    onClick={() => void saveEditedMemory(memory.id)}
                                  >
                                    {isSaving
                                      ? t("memoryViewer.memories.savingEdit")
                                      : t("memoryViewer.memories.saveEdit")}
                                  </button>
                                  <button
                                    type="button"
                                    className="inline-flex items-center rounded-full text-zaki-muted hover:text-zaki-primary hover:bg-zaki-hover px-4 py-1.5 text-xs font-medium transition-colors"
                                    disabled={isSaving}
                                    onClick={cancelEditMemory}
                                  >
                                    {t("memoryViewer.memories.cancelEdit")}
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 rounded-full text-zaki-muted hover:text-zaki-primary hover:bg-zaki-hover px-3 py-1.5 text-xs font-medium transition-colors"
                                    disabled={isSaving}
                                    onClick={() => beginEditMemory(memory)}
                                  >
                                    <Edit2 className="size-3.5" />
                                    {t("memoryViewer.memories.edit")}
                                  </button>
                                  <button
                                    type="button"
                                    className="inline-flex items-center rounded-full text-zaki-muted hover:text-zaki-primary hover:bg-zaki-hover px-3 py-1.5 text-xs font-medium transition-colors"
                                    disabled={isSaving}
                                    onClick={() =>
                                      void setMemoryStatus(
                                        memory.id,
                                        isOutdated ? "active" : "outdated"
                                      )
                                    }
                                  >
                                    {isOutdated
                                      ? t("memoryViewer.memories.restore")
                                      : t("memoryViewer.memories.markOutdated")}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {pendingDeleteMemoryId === memory.id ? (
                            <InlineConfirm
                              label={t("memoryViewer.delete.confirm")}
                              onConfirm={() => void deleteMemory(memory.id)}
                              onCancel={() => setPendingDeleteMemoryId(null)}
                              disabled={isSaving}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPendingDeleteMemoryId(memory.id)}
                              disabled={isSaving}
                              className="shrink-0 inline-flex size-8 items-center justify-center rounded-full text-zaki-muted hover:bg-zaki-brand/10 hover:text-zaki-brand transition-colors disabled:opacity-50"
                              aria-label={t("memoryViewer.delete.aria")}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
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
              className="inline-flex items-center rounded-full bg-zaki-hover text-zaki-secondary hover:text-zaki-primary hover:bg-zaki-active px-4 py-1.5 text-xs font-medium transition-colors disabled:opacity-60"
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
        <div className={cn("flex items-center justify-between gap-2 border-t border-zaki pt-3 dark:border-[rgba(240,236,230,0.08)]", isRtl && "flex-row-reverse")}>
          <button
            type="button"
            onClick={() => {
              toast.info(t("memoryViewer.toasts.refreshing"));
              void fetchMemories();
            }}
            className="inline-flex items-center gap-2 text-sm text-zaki-secondary hover:text-zaki-primary transition-colors"
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
  );

  const dossierGroupsGrid = () => (
    <div className="grid gap-3 lg:grid-cols-2 zaki-cascade">
      {notebookGroups
        .map((group) => {
          const Icon = group.icon;
          const hasItems = group.items.length > 0;
          return (
            <section
              key={group.id}
              className="rounded-zaki-xl border border-zaki bg-zaki-raised px-4 py-4 shadow-zaki-md transition-all hover:shadow-zaki-lg dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)]"
            >
              <div className={cn("flex items-start gap-3", isRtl && "flex-row-reverse")}>
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-zaki-brand/10 text-zaki-brand">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="font-display text-sm font-semibold text-zaki-primary">
                    {group.title}
                  </h4>
                  <p className="mt-1 text-xs leading-5 text-zaki-secondary">
                    {group.body}
                  </p>
                </div>
              </div>
              {hasItems ? (
                <ul className={cn("mt-4 space-y-2", isRtl && "text-right")}>
                  {group.items.map((item) => (
                    <li
                      key={`${group.id}:${item}`}
                      className="rounded-zaki-md border border-zaki bg-zaki-hover px-3 py-2 text-sm leading-6 text-zaki-primary dark:border-[rgba(240,236,230,0.08)]"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-4 rounded-zaki-md border border-dashed border-zaki bg-zaki-hover px-3 py-3 text-xs text-zaki-muted dark:border-[rgba(240,236,230,0.08)]">
                  {t("memoryViewer.notebook.empty")}
                </div>
              )}
            </section>
          );
        })}
    </div>
  );

  if (loading) {
    return <SkeletonMemoryViewer />;
  }

  if (error) {
    return (
      <div className="rounded-zaki-xl border border-zaki-brand/20 bg-zaki-brand/5 p-6 font-body">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-full bg-zaki-brand/10 flex items-center justify-center flex-shrink-0 text-zaki-brand">
            <AlertTriangle className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-zaki-primary text-sm">
              {t("memoryViewer.errorCard.title")}
            </p>
            <p className="mt-1 text-xs text-zaki-secondary">{error}</p>
            <button
              type="button"
              onClick={() => {
                void fetchMemories();
              }}
              className="mt-4 inline-flex items-center rounded-full bg-zaki-brand text-white px-4 py-1.5 text-xs font-semibold shadow-[0_8px_24px_rgba(241,2,2,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-zaki-brand-hover"
            >
              {t("memoryViewer.errorCard.retry")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-5 font-body", isRtl && "rtl text-right")}>
      <div className="rounded-zaki-xl border border-zaki bg-zaki-raised px-4 py-4 shadow-zaki-md dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)]">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-full bg-zaki-brand/10 flex items-center justify-center text-zaki-brand">
            <Brain className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-zaki-primary dark:text-zaki-dark-primary">
              {t("memoryViewer.notebook.title")}
            </h3>
            <p className="mt-1 text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
              {t("memoryViewer.notebook.body")}
            </p>
            <p className="mt-2 text-xs text-zaki-muted dark:text-zaki-dark-muted">
              {t("memoryViewer.notebook.helper")}
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-zaki-md border border-zaki bg-zaki-hover px-4 py-3 dark:border-[rgba(240,236,230,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                  {t("memoryPanel.onoff.title", { defaultValue: "Memory" })}
                </div>
                <p className="mt-1 text-xs leading-5 text-zaki-secondary dark:text-zaki-dark-subtle">
                  {t("memoryPanel.onoff.hint", {
                    defaultValue:
                      "When on, ZAKI remembers useful details and uses them in chat.",
                  })}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={memoryPolicy !== "off"}
                aria-label={t("memoryPanel.onoff.title", { defaultValue: "Memory" })}
                disabled={memoryPolicyLoading || memoryPolicySaving}
                onClick={() => {
                  void (async () => {
                    // "On" deliberately resets to the default "balanced" policy;
                    // the panel does not expose the granular capture modes.
                    const nextPolicy =
                      memoryPolicy === "off" ? "balanced" : "off";
                    const saved = await setMemoryPolicy(nextPolicy);
                    if (!saved) {
                      toast.error(t("memoryViewer.policy.saveFailed"));
                      return;
                    }
                    toast.success(t("memoryViewer.policy.saved"));
                  })();
                }}
                className={cn(
                  "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zaki-brand",
                  memoryPolicy !== "off"
                    ? "border-zaki-brand bg-zaki-brand"
                    : "border-zaki-strong bg-zaki-subtle"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 transform rounded-full bg-white shadow-zaki-sm transition-transform",
                    memoryPolicy !== "off" ? "translate-x-5" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>
          </div>
      </div>

      <div className={cn("flex items-center justify-between gap-3", isRtl && "flex-row-reverse")}>
            <div
              role="tablist"
              aria-label={t("memoryViewer.notebook.title")}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border border-zaki bg-zaki-hover p-1 dark:border-[rgba(240,236,230,0.08)]",
                isRtl && "flex-row-reverse"
              )}
            >
              <button
                type="button"
                role="tab"
                aria-selected={panelView === "facts"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zaki-brand",
                  panelView === "facts"
                    ? "bg-zaki-raised text-zaki-primary shadow-zaki-sm dark:bg-[#141210]"
                    : "text-zaki-muted hover:text-zaki-secondary"
                )}
                onClick={() => setPanelView("facts")}
              >
                <Sparkles className="size-3.5" />
                {t("memoryViewer.panel.tabs.facts", { defaultValue: "Facts" })}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={panelView === "timeline"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zaki-brand",
                  panelView === "timeline"
                    ? "bg-zaki-raised text-zaki-primary shadow-zaki-sm dark:bg-[#141210]"
                    : "text-zaki-muted hover:text-zaki-secondary"
                )}
                onClick={() => setPanelView("timeline")}
              >
                <CalendarClock className="size-3.5" />
                {t("memoryViewer.panel.tabs.timeline", { defaultValue: "Timeline" })}
              </button>
            </div>
          </div>

          <div key={panelView}>
            {panelView === "facts" ? dossierGroupsGrid() : memoriesListContent}
          </div>
    </div>
  );
}
