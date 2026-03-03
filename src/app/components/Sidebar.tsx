import { 
  LogoArabicOrange, SideBarIcon, SearchIcon, AddIcon, 
  EditIcon, ChevronDownIcon, CenterLogo
} from "./icons";
import { MoreHorizontal, Pin, Pencil, Trash2, Folder, Briefcase, BookOpen, GraduationCap, Sparkles, Palette, FileText, Moon, Settings, Globe, HelpCircle, LogOut, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, updateProfile } from "@/lib/api";
import { trackProductEvent } from "@/lib/productTelemetry";
import { useAuthStore, useUIStore, useSpacesStore } from "@/stores";
import { useNavigation } from "@/hooks/useNavigation";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { SkeletonSpaceList } from "./ui/skeleton";
import { toast } from "sonner";
import type { PinnedFile, Space, Thread } from "@/types";
import { MemoryViewer } from "./memory/MemoryViewer";
import { useSpaces } from "@/queries/useSpaces";
import { useEntitlements } from "@/queries";
import { useTranslation } from "react-i18next";
import { SettingsModal } from "./sidebar/SettingsModal";
import { ZakiBotControlPanel } from "./agent/ZakiBotControlPanel";
import {
  isZakiBotSpaceId,
  ZAKI_BOT_LABEL,
  ZAKI_BOT_SPACE_ID,
} from "@/lib/zakiBot";

// Sidebar uses threads as required array
type SidebarSpace = Omit<Space, 'threads'> & { threads: Thread[] };
const APP_VERSION = "1.5.69";

export function Sidebar() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.toLowerCase().startsWith("ar");
  const fileStatusTone = {
    embedded: {
      chip: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      label: isRtl ? "مضمّن" : "Embedded",
    },
    processing: {
      chip: "bg-amber-50 text-amber-700 border border-amber-200",
      label: isRtl ? "قيد المعالجة" : "Processing",
    },
    failed: {
      chip: "bg-rose-50 text-rose-700 border border-rose-200",
      label: isRtl ? "فشل" : "Failed",
    },
  } as const;
  const sidebarCopy = {
    justNow: isRtl ? "الآن" : "just now",
    oneMinuteAgo: isRtl ? "منذ دقيقة" : "1 min ago",
    minutesAgo: (count: number) => (isRtl ? `منذ ${count} دقائق` : `${count} min ago`),
    oneHourAgo: isRtl ? "منذ ساعة" : "1 hour ago",
    hoursAgo: (count: number) => (isRtl ? `منذ ${count} ساعات` : `${count} hours ago`),
    today: isRtl ? "اليوم" : "today",
    memoryTitle: isRtl ? "ذاكرتك" : "Your Memory",
    memorySubtitle: isRtl ? "ما الذي يتذكره ZAKI عنك" : "What ZAKI remembers about you",
    closeMemoryAria: isRtl ? "إغلاق الذاكرة" : "Close memory",
    closeSpaceSettingsAria: isRtl ? "إغلاق إعدادات المساحة" : "Close space settings",
    description: isRtl ? "الوصف" : "Description",
    descriptionPlaceholder: isRtl ? "صف ما الذي خُصصت له هذه المساحة..." : "Describe what this space is for...",
    workspaceTools: isRtl ? "أدوات المساحة" : "Workspace tools",
  };
  // Get state from stores
  const { user, logout, setUser } = useAuthStore();
  const { themePreference, resolvedTheme, setThemePreference, sidebarCollapsed: collapsed, setSidebarCollapsed } = useUIStore();
  const { setSpaces: setGlobalSpaces } = useSpacesStore();
  const { goHome, goToSpaces, goToThread, goToZakiBot } = useNavigation();
  const navigate = useNavigate();
  const setCollapsed = setSidebarCollapsed;
  const [expandedSpace, setExpandedSpace] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState("new-space");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [zakiBotControlsOpen, setZakiBotControlsOpen] = useState(false);
  const [memorySearchQuery, setMemorySearchQuery] = useState("");
  const [memoryConflictCount, setMemoryConflictCount] = useState(0);
  const { data: entitlementsResult } = useEntitlements();
  const planTierRaw = entitlementsResult?.data?.plan?.tier ?? "free";
  const planStatusRaw = entitlementsResult?.data?.plan?.status ?? "inactive";
  const accessActive = Boolean(entitlementsResult?.data?.access?.active);
  const isPremium =
    ["student", "personal", "pro"].includes(planTierRaw) &&
    ["active", "trialing", "past_due"].includes(planStatusRaw);
  const activeViaAccessCode = accessActive && !isPremium;
  const planLabel =
    activeViaAccessCode
      ? t("sidebar.profile.planBadge.codeActive")
      : planTierRaw === "personal"
      ? t("sidebar.profile.planBadge.personal")
      : planTierRaw === "student"
      ? t("sidebar.profile.planBadge.student")
      : planTierRaw === "pro"
      ? t("sidebar.profile.planBadge.pro")
      : t("sidebar.profile.planBadge.free");
  const planDisplay =
    activeViaAccessCode
      ? t("sidebar.profile.planBadge.codeActive")
      : planTierRaw === "personal"
      ? t("pricingPage.plans.personal.label")
      : planTierRaw === "student"
      ? t("pricingPage.plans.student.label")
      : planTierRaw === "pro"
      ? t("billing.plans.pro.label")
      : t("pricingPage.plans.free.label");
  const [openMenu, setOpenMenu] = useState<{ type: "thread"; id: string } | null>(null);
  const [spaceSettingsOpen, setSpaceSettingsOpen] = useState(false);
  const [spaceSettingsTarget, setSpaceSettingsTarget] = useState<SidebarSpace | null>(null);
  const [spaceDescriptionDraft, setSpaceDescriptionDraft] = useState("");
  const [editingItem, setEditingItem] = useState<{ type: "space" | "thread"; id: string } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ type: "space" | "thread"; id: string; label: string } | null>(null);
  const [spaces, setSpaces] = useState<SidebarSpace[]>([]);
  const {
    data: spacesData,
    isLoading: spacesLoading,
    error: spacesQueryError,
    refetch: refetchSpaces,
  } = useSpaces(!!user);
  const [spacesError, setSpacesError] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const isDark = resolvedTheme() === "dark";
  const [lastSynced, setLastSynced] = useState<Date>(new Date());
  const [spaceSearchQuery, setSpaceSearchQuery] = useState("");
  const [workspaceTypeHint, setWorkspaceTypeHint] = useState("");
  const [removingDocumentKey, setRemovingDocumentKey] = useState<string | null>(null);
  const expandStorageKey = user?.username ? `zaki:expanded-space:${user.username}` : "zaki:expanded-space";

  useEffect(() => {
    const handleOpenMemory = (event: Event) => {
      if (!user?.username) return;
      const detail = (event as CustomEvent<{ query?: string }>).detail;
      const nextQuery = String(detail?.query || "").trim();
      setMemorySearchQuery(nextQuery);
      setMemoryOpen(true);
      window.dispatchEvent(new Event("zaki:onboarding-memory-opened"));
    };
    const handleOpenSettings = () => {
      if (!user?.username) return;
      setProfileMenuOpen(false);
      setSettingsOpen(true);
      window.dispatchEvent(new Event("zaki:onboarding-settings-opened"));
    };
    const handleCloseMemory = () => {
      setMemoryOpen(false);
      setMemorySearchQuery("");
    };
    const handleConflictCount = (event: Event) => {
      const detail = (event as CustomEvent<{ count?: number }>).detail;
      if (typeof detail?.count === "number") {
        setMemoryConflictCount(detail.count);
      }
    };
    window.addEventListener("zaki:open-memory", handleOpenMemory);
    window.addEventListener("zaki:close-memory", handleCloseMemory);
    window.addEventListener("zaki:open-settings", handleOpenSettings);
    window.addEventListener("zaki:memory-conflicts-count", handleConflictCount);
    return () => {
      window.removeEventListener("zaki:open-memory", handleOpenMemory);
      window.removeEventListener("zaki:close-memory", handleCloseMemory);
      window.removeEventListener("zaki:open-settings", handleOpenSettings);
      window.removeEventListener("zaki:memory-conflicts-count", handleConflictCount);
    };
  }, [user?.username]);

  useEffect(() => {
    if (!profileMenuOpen || !user?.username) return;
    let active = true;
    apiRequest("/api/memory/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        const count = Math.max(0, Number(data.conflicts || 0));
        setMemoryConflictCount(count);
      })
      .catch(() => {
        if (!active) return;
        setMemoryConflictCount(0);
      });
    return () => {
      active = false;
    };
  }, [profileMenuOpen, user?.username]);

  useEffect(() => {
    let active = true;
    apiRequest("/api/documents/accepted-file-types")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!active || !data?.types || typeof data.types !== "object") return;
        const extensions = Array.from(
          new Set(
            Object.values(data.types)
              .flat()
              .map((value) => String(value || "").trim().toLowerCase())
              .filter(Boolean)
          )
        );
        setWorkspaceTypeHint(extensions.slice(0, 8).join(", "));
      })
      .catch(() => {
        if (!active) return;
        setWorkspaceTypeHint("");
      });
    return () => {
      active = false;
    };
  }, []);
  
  // Focus trap refs for modals
  const spaceSettingsModalRef = useFocusTrap<HTMLDivElement>(spaceSettingsOpen);
  const deleteConfirmModalRef = useFocusTrap<HTMLDivElement>(!!confirmDelete);

  const isActive = (item: string) => activeItem === item;
  const isSpaceExpanded = (spaceId: string) => expandedSpace === spaceId;
  const isSpaceActive = (spaceId: string) => {
    if (activeItem === spaceId) return true;
    const space = spaces.find((entry) => entry.id === spaceId);
    if (!space) return false;
    return space.threads.some((thread) => thread.id === activeItem);
  };
  
  // Format relative time for "Last synced" badge
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return sidebarCopy.justNow;
    if (diffMins === 1) return sidebarCopy.oneMinuteAgo;
    if (diffMins < 60) return sidebarCopy.minutesAgo(diffMins);
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return sidebarCopy.oneHourAgo;
    if (diffHours < 24) return sidebarCopy.hoursAgo(diffHours);
    return sidebarCopy.today;
  };
  const spaceIconMap: Record<string, typeof Folder> = {
    folder: Folder,
    briefcase: Briefcase,
    book: BookOpen,
    graduation: GraduationCap,
    sparkles: Sparkles,
    palette: Palette,
    file: FileText,
  };
  const normalizedSpaceSearch = spaceSearchQuery.trim().toLowerCase();
  const filteredSpaces = useMemo(() => {
    if (!normalizedSpaceSearch) return spaces;
    return spaces.filter((space) => {
      const spaceText = `${space.title} ${space.description || ""}`.toLowerCase();
      if (spaceText.includes(normalizedSpaceSearch)) return true;
      return space.threads.some((thread) =>
        String(thread.label || "").toLowerCase().includes(normalizedSpaceSearch)
      );
    });
  }, [normalizedSpaceSearch, spaces]);
  const filteredFixedSpaces = useMemo(
    () => filteredSpaces.filter((space) => space.fixed && !isZakiBotSpaceId(space.id)),
    [filteredSpaces]
  );
  const filteredUserSpaces = useMemo(
    () => filteredSpaces.filter((space) => !space.fixed),
    [filteredSpaces]
  );

  const blurButtonOnPointerClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0) {
      event.currentTarget.blur();
    }
  };

  const openSpacesView = useCallback(() => {
    setActiveItem("spaces");
    setSpaceSearchQuery("");
    goToSpaces();
    window.dispatchEvent(new Event("zaki:view-spaces"));
  }, [goToSpaces]);

  const openCreateSpaceFlow = useCallback(() => {
    setSpaceSearchQuery("");
    setActiveItem("new-space");
    goToSpaces();
    window.setTimeout(() => {
      window.dispatchEvent(new Event("zaki:view-spaces"));
      window.dispatchEvent(new Event("zaki:open-create-space"));
    }, 0);
  }, [goToSpaces]);

  const openHomeView = useCallback(() => {
    setExpandedSpace("zaki");
    setActiveItem("zaki");
    goHome();
    window.dispatchEvent(new Event("zaki:clear-thread"));
    window.dispatchEvent(new Event("zaki:view-zaki-home"));
  }, [goHome]);

  const openZakiBotView = useCallback(() => {
    setSpaceSearchQuery("");
    setExpandedSpace(ZAKI_BOT_SPACE_ID);
    setActiveItem(ZAKI_BOT_SPACE_ID);
    goToZakiBot();
    window.dispatchEvent(new Event("zaki:close-mobile-sidebar"));
  }, [goToZakiBot]);

  const resolveThreadTargetSpace = useCallback(() => {
    if (
      expandedSpace &&
      expandedSpace !== "zaki" &&
      spaces.some((space) => space.id === expandedSpace)
    ) {
      return expandedSpace;
    }
    return (
      spaces.find((space) => !space.fixed)?.id ??
      spaces.find((space) => space.id !== "zaki")?.id ??
      null
    );
  }, [expandedSpace, spaces]);

  useEffect(() => {
    setDisplayName(
      user?.fullName?.trim() ||
        user?.username?.trim() ||
        t("sidebar.profile.defaultName")
    );
  }, [user?.fullName, user?.username, t]);

  const userName = displayName.trim() || t("sidebar.profile.defaultName");
  const userInitials = useMemo(() => {
    const parts = userName.split(/[\s.@_-]+/).filter(Boolean);
    const first = parts[0];
    const second = parts[1];
    const initials =
      parts.length === 1 && first
        ? first.slice(0, 2)
        : `${first?.[0] ?? ""}${second?.[0] ?? ""}`;
    return initials.toUpperCase();
  }, [userName]);

  const profileMenuItemBase = cn(
    "w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 transition-colors",
    isRtl ? "flex-row-reverse text-right" : "text-left"
  );

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(expandStorageKey) : null;
    if (stored && stored !== "none" && stored !== expandedSpace) {
      setExpandedSpace(stored);
    }
    if (!user) {
      setSpaces([]);
      return;
    }
    if (!spacesData) {
      return;
    }
    setSpaces(spacesData as SidebarSpace[]);
    setLastSynced(new Date());
    setSpacesError("");
    if (stored === "none") {
      setExpandedSpace(null);
      return;
    }
    const firstSpace = spacesData[0];
    if (firstSpace) {
      const storedValid = stored && spacesData.some((space) => space.id === stored);
      setExpandedSpace((prev) => prev ?? (storedValid ? stored : null) ?? firstSpace.id);
    }
  }, [user, spacesData]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!expandedSpace) {
      window.localStorage.setItem(expandStorageKey, "none");
      return;
    }
    window.localStorage.setItem(expandStorageKey, expandedSpace);
  }, [expandStorageKey, expandedSpace]);

  useEffect(() => {
    if (!spacesQueryError) return;
    setSpacesError("Unable to load workspaces. Check your session.");
  }, [spacesQueryError]);
  
  // Force re-render every minute to update "Last synced" display
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-menu-button]") || target.closest("[data-menu]")) {
        return;
      }
      setOpenMenu(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleProfileOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-profile-button]") || target.closest("[data-profile-menu]")) {
        return;
      }
      setProfileMenuOpen(false);
    };
    if (profileMenuOpen) {
      document.addEventListener("mousedown", handleProfileOutside);
    }
    return () => document.removeEventListener("mousedown", handleProfileOutside);
  }, [profileMenuOpen]);

  useEffect(() => {
    const handleEscapeBlur = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const activeElement = document.activeElement as HTMLElement | null;
      if (activeElement?.closest(".zaki-sidebar")) {
        activeElement.blur();
      }
    };
    document.addEventListener("keydown", handleEscapeBlur);
    return () => document.removeEventListener("keydown", handleEscapeBlur);
  }, []);

  // Sync spaces to global store
  useEffect(() => {
    setGlobalSpaces(spaces);
  }, [spaces, setGlobalSpaces]);

  const saveDisplayName = useCallback(async (): Promise<boolean> => {
    if (!user?.username) return false;
    setProfileSaving(true);
    try {
      const nextName = displayName.trim();
      const { response, data } = await updateProfile(nextName);
      if (!response.ok || data?.error) {
        toast.error(data?.error || t("sidebar.profile.saveError"));
        return false;
      }
      setUser({
        ...user,
        fullName: nextName || null,
      });
      toast.success(t("sidebar.profile.saveSuccess"));
      return true;
    } catch (error) {
      toast.error(t("sidebar.profile.saveError"));
      return false;
    } finally {
      setProfileSaving(false);
    }
  }, [displayName, setUser, t, user]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("zaki:spaces-data", {
        detail: {
          spaces: spaces.map((space) => ({
            id: space.id,
            title: space.title,
            description: space.description,
            instructions: space.instructions,
            pinnedFiles: space.pinnedFiles,
            icon: space.icon,
            color: space.color,
            fixed: space.fixed,
            threads: space.threads.map((thread) => ({
              id: thread.id,
              label: thread.label,
            })),
          })),
        },
      })
    );
  }, [spaces]);

  useEffect(() => {
    const handleRequestSpaces = () => {
      window.dispatchEvent(
        new CustomEvent("zaki:spaces-data", {
          detail: {
            spaces: spaces.map((space) => ({
              id: space.id,
              title: space.title,
              description: space.description,
              instructions: space.instructions,
              pinnedFiles: space.pinnedFiles,
              icon: space.icon,
              color: space.color,
              fixed: space.fixed,
              threads: space.threads.map((thread) => ({
                id: thread.id,
                label: thread.label,
              })),
            })),
          },
        })
      );
    };
    window.addEventListener("zaki:request-spaces", handleRequestSpaces);
    return () => window.removeEventListener("zaki:request-spaces", handleRequestSpaces);
  }, [spaces]);

  useEffect(() => {
    const anyModalOpen =
      settingsOpen ||
      memoryOpen ||
      spaceSettingsOpen ||
      Boolean(confirmDelete);
    if (!anyModalOpen) {
      return;
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      if (spaceSettingsOpen) {
        setSpaceSettingsOpen(false);
        setSpaceSettingsTarget(null);
        return;
      }
      if (confirmDelete) {
        setConfirmDelete(null);
        return;
      }
      if (memoryOpen) {
        setMemoryOpen(false);
        return;
      }
      if (settingsOpen) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [confirmDelete, memoryOpen, settingsOpen, spaceSettingsOpen]);

  useEffect(() => {
    if (!spaceSettingsTarget) return;
    const refreshedSpace = spaces.find((space) => space.id === spaceSettingsTarget.id);
    if (!refreshedSpace) return;
    if (refreshedSpace !== spaceSettingsTarget) {
      setSpaceSettingsTarget(refreshedSpace);
    }
  }, [spaceSettingsTarget, spaces]);

  useEffect(() => {
    const handleThreadCreated = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; label: string; spaceId?: string }>).detail;
      if (!detail?.id) {
        return;
      }
      setSpaces((prev) =>
        prev.map((space) =>
          space.id === (detail.spaceId ?? expandedSpace)
            ? {
                ...space,
                threads: [
                  ...space.threads,
                  { id: detail.id, label: detail.label || "New chat", pinned: false },
                ],
              }
            : space
        )
      );
      if (detail.spaceId) {
        setExpandedSpace(detail.spaceId);
      }
      setActiveItem(detail.id);
      goToThread(detail.spaceId ?? expandedSpace ?? "", detail.id);
    };

    window.addEventListener("zaki:thread-created", handleThreadCreated);
    return () => window.removeEventListener("zaki:thread-created", handleThreadCreated);
  }, [expandedSpace]);

  const startRename = (type: "space" | "thread", id: string, currentLabel: string) => {
    setEditingItem({ type, id });
    setEditingValue(currentLabel);
    setOpenMenu(null);
  };

  const commitRename = () => {
    if (!editingItem) return;
    const trimmed = editingValue.trim();
    if (!trimmed) {
      setEditingItem(null);
      return;
    }
    setSpaces((prev) =>
      prev.map((space) => {
        if (editingItem.type === "space" && space.id === editingItem.id) {
          return { ...space, title: trimmed };
        }
        if (editingItem.type === "thread") {
          return {
            ...space,
            threads: space.threads.map((thread) =>
              thread.id === editingItem.id ? { ...thread, label: trimmed } : thread
            ),
          };
        }
        return space;
      })
    );
    syncRename(editingItem.type, editingItem.id, trimmed);
    setEditingItem(null);
  };

  const syncRename = async (
    type: "space" | "thread",
    id: string,
    label: string
  ) => {
    try {
      if (type === "space") {
        await apiRequest(`/workspace/${id}/update`, {
          method: "POST",
          body: JSON.stringify({ name: label }),
        });
        return;
      }
      const parentSpace = spaces.find((space) =>
        space.threads.some((thread) => thread.id === id)
      );
      if (!parentSpace) return;
      await apiRequest(`/workspace/${parentSpace.id}/thread/${id}/update`, {
        method: "POST",
        body: JSON.stringify({ name: label }),
      });
    } catch (error) {
      setSpacesError("Unable to rename item. Try again.");
    }
  };

  const togglePinned = (type: "space" | "thread", id: string) => {
    setSpaces((prev) =>
      prev.map((space) => {
        if (type === "space" && space.id === id) {
          return { ...space, pinned: !space.pinned };
        }
        if (type === "thread") {
          return {
            ...space,
            threads: space.threads.map((thread) =>
              thread.id === id ? { ...thread, pinned: !thread.pinned } : thread
            ),
          };
        }
        return space;
      })
    );
    setOpenMenu(null);
  };

  const performDelete = async (type: "space" | "thread", id: string) => {
    const shouldClear =
      type === "thread"
        ? activeItem === id
        : spaces.some(
            (space) =>
              space.id === id &&
              (activeItem === id || space.threads.some((thread) => thread.id === activeItem))
          );
    if (shouldClear) {
      window.dispatchEvent(new Event("zaki:clear-thread"));
    }
    if (type === "thread") {
      const parentSpace = spaces.find((space) =>
        space.threads.some((thread) => thread.id === id)
      );
      if (parentSpace) {
        try {
          const response = await apiRequest(`/workspace/${parentSpace.id}/thread/${id}`, {
            method: "DELETE",
          });
          if (!response.ok) {
            throw new Error('Delete failed');
          }
          // Only update local state if API succeeds
          setSpaces((prev) =>
            prev.map((space) => ({
              ...space,
              threads: space.threads.filter((thread) => thread.id !== id),
            }))
          );
          toast.success('Thread deleted');
        } catch {
          setSpacesError("Unable to delete thread.");
          toast.error('Failed to delete thread');
          return; // Don't update state on failure
        }
      }
    }
    if (type === "space") {
      try {
        const response = await apiRequest(`/zaki/workspaces/${id}`, {
          method: "DELETE",
        });
        
        // Check if actually succeeded
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[Delete] Space delete failed:', response.status, errorData);
          
          // Special handling for 401 (permission issue)
          if (response.status === 401) {
            throw new Error('You don\'t have permission to delete spaces. Contact admin or delete via NOVA.TYP.');
          }
          
          throw new Error(errorData?.error || errorData?.message || 'Delete failed');
        }
        
        // Parse response to confirm success
        const data = await response.json().catch(() => ({ success: true }));
        
        if (data.success === false) {
          console.error('[Delete] Space delete rejected:', data);
          throw new Error(data.error || 'Delete was rejected');
        }
        
        // Only update local state if API confirms success
        setSpaces((prev) => prev.filter((space) => space.id !== id));
        if (expandedSpace === id) {
          const fallback = spaces.find((space) => space.id !== id)?.id ?? null;
          setExpandedSpace(fallback);
        }
        toast.success('Space deleted');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to delete workspace';
        setSpacesError(message);
        toast.error(message);
        console.error('[Delete] Space delete error:', err);
        return; // Don't update state on failure
      }
    }
    setOpenMenu(null);
  };

  const createSpace = async (
    name?: string,
    description?: string,
    instructions?: string,
    pinnedFiles?: PinnedFile[]
  ) => {
    const trimmedName = name?.trim();
    if (!trimmedName) return;
    try {
      const response = await apiRequest("/zaki/workspaces", {
        method: "POST",
        body: JSON.stringify({
          name: trimmedName,
          instructions: instructions ?? "",
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to create workspace.");
      }
      const data = (await response.json()) as {
        workspace?: {
          slug: string;
          name: string;
          description?: string;
          instructions?: string;
          openAiPrompt?: string;
        };
      };
      if (!data.workspace) {
        throw new Error("Workspace not returned.");
      }
      const newSpace: SidebarSpace = {
        id: data.workspace.slug,
        title: data.workspace.name,
        description: description ?? data.workspace.description ?? "Workspace",
        instructions:
          data.workspace.instructions ??
          data.workspace.openAiPrompt ??
          instructions ??
          "",
        pinnedFiles: pinnedFiles ?? [],
        pinned: false,
        threads: [],
      };
      setSpaces((prev) => [...prev, newSpace]);
      setExpandedSpace(newSpace.id);
      setActiveItem(newSpace.id);
      window.dispatchEvent(new Event("zaki:clear-thread"));
      window.dispatchEvent(
        new CustomEvent("zaki:onboarding-space-created", {
          detail: { id: newSpace.id, title: newSpace.title },
        })
      );
    } catch (error) {
      setSpacesError("Unable to create a workspace. Check your permissions.");
    }
  };

  const createThreadInSpace = async (spaceId: string | null) => {
    if (isZakiBotSpaceId(spaceId)) {
      openZakiBotView();
      return;
    }
    const resolvedSpaceId =
      spaceId && spaces.some((space) => space.id === spaceId)
        ? spaceId
        : spaces.find((space) => !space.fixed)?.id ??
          spaces.find((space) => space.id !== "zaki")?.id ??
          spaces[0]?.id ??
          null;

    if (!resolvedSpaceId) {
      return;
    }
    try {
      const response = await apiRequest(`/workspace/${resolvedSpaceId}/thread/new`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to create thread.");
      }
      const data = (await response.json()) as {
        thread?: { slug: string; name: string };
      };
      const threadId = data.thread?.slug ?? `thread-${Date.now()}`;
      const threadLabel = data.thread?.name ?? "New chat";

      setSpaces((prev) =>
        prev.map((space) =>
          space.id === resolvedSpaceId
            ? {
                ...space,
                threads: [
                  ...space.threads,
                  { id: threadId, label: threadLabel, pinned: false },
                ],
              }
            : space
        )
      );
      setExpandedSpace(resolvedSpaceId);
      setActiveItem(threadId);
      goToThread(resolvedSpaceId, threadId);
      window.dispatchEvent(
        new CustomEvent("zaki:onboarding-thread-created", {
          detail: { id: threadId, spaceId: resolvedSpaceId },
        })
      );
    } catch (error) {
      setSpacesError("Unable to create a new chat.");
    }
  };

  const removeWorkspaceDocument = useCallback(
    async (spaceId: string, file: PinnedFile) => {
      const location = String(file.location || "").trim();
      if (!location) {
        toast.error("This file cannot be removed because its document path is missing.");
        return;
      }

      setRemovingDocumentKey(`${spaceId}:${location}`);
      try {
        const response = await apiRequest(`/workspace/${spaceId}/documents/remove`, {
          method: "POST",
          body: JSON.stringify({ locations: [location] }),
        });
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          warning?: string | null;
          workspace?: { pinnedFiles?: PinnedFile[] };
        };
        if (!response.ok) {
          throw new Error(data.error || "Unable to remove workspace document.");
        }

        const nextPinnedFiles = data.workspace?.pinnedFiles ?? [];
        setSpaces((prev) =>
          prev.map((space) =>
            space.id === spaceId ? { ...space, pinnedFiles: nextPinnedFiles } : space
          )
        );
        setSpaceSettingsTarget((prev) =>
          prev && prev.id === spaceId ? { ...prev, pinnedFiles: nextPinnedFiles } : prev
        );
        if (data.warning) {
          toast.warning(data.warning);
        } else {
          toast.success(
            t("sidebar.removeDocumentSuccess", {
              name: file.name,
            })
          );
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to remove workspace document.");
      } finally {
        setRemovingDocumentKey(null);
      }
    },
    []
  );

  const handleQuickCreateThread = useCallback(() => {
    const targetSpaceId = resolveThreadTargetSpace();
    if (!targetSpaceId) {
      openCreateSpaceFlow();
      toast.error("Create a space first to start a chat.");
      return;
    }
    setExpandedSpace(targetSpaceId);
    createThreadInSpace(targetSpaceId);
  }, [createThreadInSpace, openCreateSpaceFlow, resolveThreadTargetSpace]);

  const toggleSpace = (spaceId: string) => {
    setExpandedSpace((prev) => (prev === spaceId ? null : spaceId));
  };

  const handleSpaceToggle = (spaceId: string) => {
    const willExpand = expandedSpace !== spaceId;
    setExpandedSpace(willExpand ? spaceId : null);
    if (willExpand) {
      setActiveItem(spaceId);
    }
  };

  useEffect(() => {
    const handleCreateSpace = (event: Event) => {
      const detail = (event as CustomEvent<{
        name?: string;
        description?: string;
        instructions?: string;
        pinnedFiles?: PinnedFile[];
      }>).detail;
      createSpace(detail?.name, detail?.description, detail?.instructions, detail?.pinnedFiles);
    };
    const handleCreateThread = (event: Event) => {
      const detail = (event as CustomEvent<{ spaceId: string }>).detail;
      if (detail?.spaceId) {
        createThreadInSpace(detail.spaceId);
      }
    };
    const handleUpdateSpace = (event: Event) => {
      const detail = (event as CustomEvent<{
        id: string;
        instructions?: string;
        pinnedFiles?: PinnedFile[];
        icon?: string;
        color?: string;
        description?: string;
      }>).detail;
      if (!detail?.id) return;
      const targetSpace = spaces.find((space) => space.id === detail.id);
      if (!targetSpace) return;
      setSpaces((prev) =>
        prev.map((space) =>
          space.id === detail.id
            ? {
                ...space,
                instructions: detail.instructions ?? space.instructions,
                pinnedFiles: detail.pinnedFiles ? detail.pinnedFiles : space.pinnedFiles,
                icon: space.fixed ? space.icon : detail.icon ?? space.icon,
                color: space.fixed ? space.color : detail.color ?? space.color,
                description: detail.description ?? space.description,
              }
            : space
        )
      );
      const updatePayload: Record<string, unknown> = {};
      if (typeof detail.description === "string") {
        updatePayload.description = detail.description.trim();
      }
      if (typeof detail.instructions === "string") {
        const normalizedInstructions = detail.instructions.trim();
        updatePayload.instructions = normalizedInstructions;
        updatePayload.openAiPrompt = normalizedInstructions;
      }
      if (!targetSpace.fixed && typeof detail.icon === "string") {
        updatePayload.icon = detail.icon;
      }
      if (!targetSpace.fixed && typeof detail.color === "string") {
        updatePayload.color = detail.color;
      }
      if (Object.keys(updatePayload).length === 0) return;
      void apiRequest(`/workspace/${detail.id}/update`, {
        method: "POST",
        body: JSON.stringify(updatePayload),
      })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData?.error || errorData?.message || "Workspace sync failed."
            );
          }
        })
        .catch(() => {
          toast.error("Unable to sync workspace settings. Refreshing spaces.");
          refetchSpaces();
        });
    };
    const handleDeleteThread = async (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; spaceId?: string }>).detail;
      if (!detail?.id) return;
      
      // Find the parent space
      const parentSpace = detail.spaceId 
        ? spaces.find((s) => s.id === detail.spaceId)
        : spaces.find((space) => space.threads.some((thread) => thread.id === detail.id));
      
      // Optimistically remove from UI
      setSpaces((prev) =>
        prev.map((space) => ({
          ...space,
          threads: space.threads.filter((thread) => thread.id !== detail.id),
        }))
      );
      
      if (activeItem === detail.id) {
        window.dispatchEvent(new Event("zaki:clear-thread"));
      }
      
      // Call API to persist deletion
      if (parentSpace) {
        try {
          const response = await apiRequest(`/workspace/${parentSpace.id}/thread/${detail.id}`, {
            method: "DELETE",
          });
          if (!response.ok) {
            throw new Error("Delete failed");
          }
          toast.success("Chat deleted");
        } catch {
          // Rollback: refetch spaces on failure
          toast.error("Couldn't delete chat. Try again.");
          refetchSpaces();
        }
      }
    };
    const handleRenameThread = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; label: string }>).detail;
      if (!detail?.id || !detail?.label) return;
      setSpaces((prev) =>
        prev.map((space) => ({
          ...space,
          threads: space.threads.map((thread) =>
            thread.id === detail.id ? { ...thread, label: detail.label } : thread
          ),
        }))
      );
    };
    const handleOpenSpaceSettings = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string }>).detail;
      const target = spaces.find((space) => space.id === detail?.id);
      if (!target) return;
      setSpaceSettingsTarget(target);
      setSpaceDescriptionDraft(target.description ?? "");
      setSpaceSettingsOpen(true);
    };
    const handleDeleteSpace = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; label?: string }>).detail;
      const target = spaces.find((space) => space.id === detail?.id);
      if (!target || target.fixed) return;
      setConfirmDelete({
        type: "space",
        id: target.id,
        label: target.title || detail?.label || target.id,
      });
    };
    window.addEventListener("zaki:create-space", handleCreateSpace);
    window.addEventListener("zaki:create-thread", handleCreateThread);
    window.addEventListener("zaki:update-space", handleUpdateSpace);
    window.addEventListener("zaki:delete-thread", handleDeleteThread);
    window.addEventListener("zaki:rename-thread", handleRenameThread);
    window.addEventListener("zaki:open-space-settings", handleOpenSpaceSettings);
    window.addEventListener("zaki:delete-space", handleDeleteSpace);
    return () => {
      window.removeEventListener("zaki:create-space", handleCreateSpace);
      window.removeEventListener("zaki:create-thread", handleCreateThread);
      window.removeEventListener("zaki:update-space", handleUpdateSpace);
      window.removeEventListener("zaki:delete-thread", handleDeleteThread);
      window.removeEventListener("zaki:rename-thread", handleRenameThread);
      window.removeEventListener("zaki:open-space-settings", handleOpenSpaceSettings);
      window.removeEventListener("zaki:delete-space", handleDeleteSpace);
    };
  }, [activeItem, refetchSpaces, spaces]);

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className={cn(
        "zaki-sidebar h-full flex flex-col bg-[#FDF6EE] dark:bg-[#0f0b08] border-r-0 shrink-0 transition-[width,padding] duration-300",
        collapsed ? "w-[72px] py-4 px-2" : "w-[272px] py-5 px-3.5"
      )}
    >
      {collapsed ? (
        <>
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              className="size-9 rounded-zaki-md bg-zaki-selected border border-zaki flex items-center justify-center"
              onClick={openHomeView}
            >
              <LogoArabicOrange />
            </button>
            <button
              className="size-9 rounded-zaki-md border border-transparent hover:border-zaki-subtle hover:bg-zaki-hover dark:hover:bg-zaki-dark-hover transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
              onClick={() => setCollapsed(false)}
              onMouseUp={blurButtonOnPointerClick}
              type="button"
              title={t("sidebar.actions.expandSidebar")}
              aria-label={t("sidebar.actions.expandSidebar")}
            >
              <SideBarIcon />
            </button>
          </div>

          <div className="mt-6 flex flex-col items-center gap-2">
            <button
              className={cn(
                "size-9 rounded-zaki-md text-zaki-brand flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2",
                isActive("new-space") ? "bg-zaki-brand-20" : "bg-zaki-brand-15 hover:bg-zaki-brand-20"
              )}
              onClick={openCreateSpaceFlow}
              onMouseUp={blurButtonOnPointerClick}
              type="button"
              title={t("sidebar.nav.newSpace")}
              aria-label={t("sidebar.actions.createSpace")}
              data-onboarding-id="sidebar-create-space"
            >
              <AddIcon />
            </button>
            <button
              className={cn(
                "size-9 rounded-zaki-md transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2",
                isActive("spaces") ? "bg-zaki-hover" : "hover:bg-zaki-hover"
              )}
              onClick={openSpacesView}
              onMouseUp={blurButtonOnPointerClick}
              type="button"
              title={t("sidebar.nav.spaces")}
              aria-label={t("sidebar.actions.viewSpaces")}
            >
              <EditIcon />
            </button>
            <button
              className={cn(
                "size-9 rounded-zaki-md transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2",
                isActive(ZAKI_BOT_SPACE_ID) ? "bg-zaki-hover" : "hover:bg-zaki-hover"
              )}
              onClick={openZakiBotView}
              onMouseUp={blurButtonOnPointerClick}
              type="button"
              title={ZAKI_BOT_LABEL}
              aria-label={ZAKI_BOT_LABEL}
            >
              <CenterLogo className="size-4 text-zaki-brand" />
            </button>
          </div>

          <div className="mt-6 flex flex-col items-center gap-2">
            <button
              className="size-9 rounded-zaki-md flex items-center justify-center transition-colors bg-zaki-elevated hover:bg-zaki-active focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
              onClick={handleQuickCreateThread}
              onMouseUp={blurButtonOnPointerClick}
              type="button"
              title={t("sidebar.actions.newChat")}
              aria-label={t("sidebar.actions.newChat")}
            >
              <AddIcon color="#88735A" />
            </button>
          </div>

          <div className="mt-auto flex flex-col items-center gap-3 pt-4">
            <button
              className={cn(
                "size-10 rounded-full flex items-center justify-center text-zaki-primary font-medium text-sm transition-colors focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2",
                isActive("profile") ? "bg-zaki-active" : "bg-zaki-elevated hover:bg-zaki-active"
              )}
              onClick={() => setActiveItem("profile")}
              onMouseUp={blurButtonOnPointerClick}
              type="button"
              title="Profile"
              aria-label="Open profile"
            >
              {userInitials}
            </button>
          </div>
        </>
      ) : (
        <>
      {/* Header */}
      <div className="flex justify-between items-start mb-5">
        <button
          type="button"
          onClick={openHomeView}
        >
          <LogoArabicOrange />
        </button>
        <button
          className="size-9 rounded-lg border border-transparent hover:border-zaki-subtle hover:bg-zaki-hover dark:hover:bg-zaki-dark-hover transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
          onClick={() => setCollapsed(true)}
          type="button"
          aria-label="Collapse sidebar"
        >
          <SideBarIcon />
        </button>
      </div>

      {/* Search */}
      <div className="bg-zaki-hover rounded-[10px] flex items-center p-2.5 gap-2 mb-2">
        <SearchIcon />
        <input 
          type="text" 
          value={spaceSearchQuery}
          onChange={(event) => setSpaceSearchQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setSpaceSearchQuery("");
              (event.currentTarget as HTMLInputElement).blur();
            }
          }}
          placeholder={t("sidebar.searchPlaceholder")}
          className="bg-transparent border-none outline-none text-zaki-muted placeholder-zaki text-sm w-full font-medium"
        />
      </div>
      
      {/* Last synced badge — trust signal */}
      <div className="flex items-center gap-1.5 text-2xs text-zaki-muted mb-4 pl-1">
        <span className="inline-block size-1.5 rounded-full bg-zaki-accent animate-pulse" />
        <span>{t("sidebar.synced", { time: formatRelativeTime(lastSynced) })}</span>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 mb-5">
        <button
          className={cn(
            "flex items-center gap-2 p-1.5 rounded-lg transition-colors text-left group",
            isActive("new-space") ? "bg-zaki-hover" : "hover:bg-zaki-hover"
          )}
          onClick={openCreateSpaceFlow}
          onMouseUp={blurButtonOnPointerClick}
          type="button"
          data-onboarding-id="sidebar-create-space"
        >
          <div className="bg-zaki-brand-15 rounded-full size-5 flex items-center justify-center">
            <AddIcon />
          </div>
          <span className="text-zaki-brand text-sm font-medium">{t("sidebar.nav.newSpace")}</span>
        </button>

        <button
          className={cn(
            "flex items-center gap-2 p-1.5 rounded-lg transition-colors text-left group",
            isActive("spaces") ? "bg-zaki-hover" : "hover:bg-zaki-hover"
          )}
          onClick={openSpacesView}
          onMouseUp={blurButtonOnPointerClick}
          type="button"
        >
          <div className="size-5 flex items-center justify-center">
             <EditIcon />
          </div>
          <span className="text-zaki-secondary text-sm font-medium">{t("sidebar.nav.spaces")}</span>
        </button>

        <div className="relative group">
          <button
            className={cn(
              "w-full flex items-center gap-2 p-1.5 rounded-lg transition-colors text-left",
              isSpaceActive(ZAKI_BOT_SPACE_ID) ? "bg-zaki-hover" : "hover:bg-zaki-hover"
            )}
            onClick={openZakiBotView}
            onMouseUp={blurButtonOnPointerClick}
            type="button"
          >
            <div className="size-5 flex items-center justify-center">
              <div className="scale-[0.6]">
                <CenterLogo />
              </div>
            </div>
            <span className="text-zaki-secondary text-sm font-medium flex-1">{ZAKI_BOT_LABEL}</span>
          </button>
          <button
            type="button"
            className="absolute right-1 top-1/2 -translate-y-1/2 size-7 rounded-md p-0 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-zaki-hover transition focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
            onClick={(event) => {
              event.stopPropagation();
              setZakiBotControlsOpen(true);
            }}
            aria-label={`${ZAKI_BOT_LABEL} settings`}
          >
            <Settings className="size-4 text-zaki-muted" />
          </button>
        </div>

      </div>

      {/* Divider */}
      <div className="h-px bg-zaki-sunken w-full mb-5" />

      {/* Space Section */}
      <div className="flex-1 overflow-y-auto bg-[#FDF6EE] dark:bg-[#0f0b08] zaki-scrollbar-fade">
        <div className="text-zaki-muted text-xs font-medium mb-2 pl-1.5">{t("sidebar.section.space")}</div>
        {spacesLoading && (
          <div className="mb-3">
            <SkeletonSpaceList />
          </div>
        )}
        {spacesError && (
          <div className="text-xs text-zaki-brand mb-3 pl-1.5">{spacesError}</div>
        )}
        
        {/* Empty State - No Spaces */}
        {!spacesLoading && !normalizedSpaceSearch && spaces.filter((s) => !s.fixed).length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-zaki-hover flex items-center justify-center mb-3">
              <Folder className="w-6 h-6 text-zaki-muted" />
            </div>
            <p className="text-sm text-zaki-primary font-medium mb-1">{t("sidebar.empty.noSpaces")}</p>
            <p className="text-xs text-zaki-secondary mb-4">{t("sidebar.empty.noSpacesHelper")}</p>
            <button
              onClick={openCreateSpaceFlow}
              className="flex items-center gap-2 px-3 py-2 bg-zaki-brand text-white text-sm font-medium rounded-zaki-xl hover:bg-zaki-brand-hover transition-colors"
              type="button"
            >
              <AddIcon color="#FFFFFF" />
              {t("sidebar.actions.createSpace")}
            </button>
          </div>
        )}

        {!spacesLoading && normalizedSpaceSearch && filteredSpaces.length === 0 && (
          <div className="py-8 px-4 text-center">
            <p className="text-sm text-zaki-primary font-medium">{t("sidebar.empty.noSearchResults")}</p>
            <p className="text-xs text-zaki-secondary mt-1">{t("sidebar.empty.noSearchResultsHelper")}</p>
          </div>
        )}
        
        <div className="flex flex-col gap-1">
          {filteredFixedSpaces.map((space) => (
            <div key={space.id}>
              <div className="relative group">
                <div
                  className={cn(
                    "w-full flex items-center gap-2 rounded-lg transition-colors",
                    isSpaceActive(space.id) ? "bg-zaki-hover" : "hover:bg-zaki-hover"
                  )}
                >
                  <button
                    onClick={() =>
                      isZakiBotSpaceId(space.id) ? openZakiBotView() : handleSpaceToggle(space.id)
                    }
                    className={cn(
                      "min-w-0 flex-1 flex items-center gap-2 p-1.5 text-left",
                      isRtl && "text-right"
                    )}
                    type="button"
                  >
                    <div className="size-5 flex items-center justify-center">
                      <div className="scale-[0.6]">
                        <CenterLogo />
                      </div>
                    </div>
                    <span className={cn("text-zaki-secondary text-sm font-medium flex-1", isRtl && "text-right")}>
                      {space.title}
                    </span>
                  </button>
                  {isZakiBotSpaceId(space.id) && (
                    <button
                      type="button"
                      className="size-7 rounded-md p-0 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-zaki-hover transition focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
                      onClick={(event) => {
                        event.stopPropagation();
                        setZakiBotControlsOpen(true);
                      }}
                      aria-label={`${space.title} settings`}
                    >
                      <Settings className="size-4 text-zaki-muted" />
                    </button>
                  )}
                  {!isZakiBotSpaceId(space.id) && space.threads.length > 0 && (
                    <button
                      type="button"
                      className={cn(
                        "inline-flex shrink-0 rounded-md p-1 transition-transform hover:bg-zaki-hover focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2",
                        isSpaceExpanded(space.id) ? "rotate-0" : isRtl ? "rotate-90" : "-rotate-90"
                      )}
                      onClick={() => toggleSpace(space.id)}
                      aria-label={`${space.title} threads`}
                    >
                      <ChevronDownIcon />
                    </button>
                  )}
                </div>
              </div>
              {isSpaceExpanded(space.id) && !isZakiBotSpaceId(space.id) && (
                <div className="pl-6 flex flex-col gap-1 mt-1">
                  {space.threads.map((thread) => (
                    <div key={thread.id} className="relative group">
                      <button
                        className={cn(
                          "zaki-thread-item w-full text-left text-zaki-secondary text-sm font-medium py-1.5 px-2 rounded-lg",
                          isRtl && "text-right",
                          isActive(thread.id) ? "zaki-nav-active" : ""
                        )}
                        onClick={() => {
                          setExpandedSpace(space.id);
                          setActiveItem(thread.id);
                          goToThread(space.id, thread.id);
                        }}
                        type="button"
                      >
                        {thread.label}
                      </button>
                      <button
                        type="button"
                        className="absolute right-0 top-1/2 -translate-y-1/2 size-6 rounded-md p-0 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-zaki-hover transition focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenMenu(
                            openMenu?.type === "thread" && openMenu.id === thread.id
                              ? null
                              : { type: "thread", id: thread.id }
                          );
                        }}
                        data-menu-button
                        aria-haspopup="menu"
                        aria-expanded={openMenu?.type === "thread" && openMenu.id === thread.id}
                        aria-label={`${thread.label} options`}
                      >
                        <MoreHorizontal className="size-4 text-zaki-muted" />
                      </button>
                      {openMenu?.type === "thread" && openMenu.id === thread.id && (
                        <div
                          className="absolute right-0 top-8 w-36 rounded-zaki-md border border-zaki-subtle bg-white shadow-[0px_12px_24px_rgba(15,15,15,0.12)] p-1 z-20"
                          role="menu"
                          data-menu
                        >
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-zaki-primary hover:bg-zaki-hover"
                            onClick={() => togglePinned("thread", thread.id)}
                          >
                            <Pin className="size-3.5 text-zaki-muted" />
                            {thread.pinned ? "Unpin" : "Pinned"}
                          </button>
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-zaki-primary hover:bg-zaki-hover"
                            onClick={() => startRename("thread", thread.id, thread.label)}
                          >
                            <Pencil className="size-3.5 text-zaki-muted" />
                            Rename
                          </button>
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-zaki-brand hover:bg-zaki-error"
                            onClick={() => setConfirmDelete({ type: "thread", id: thread.id, label: thread.label })}
                          >
                            <Trash2 className="size-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    className="flex items-center gap-2 p-1.5 rounded-lg transition-colors text-left group hover:bg-zaki-hover"
                    onClick={() => createThreadInSpace(space.id)}
                    type="button"
                    data-onboarding-id="sidebar-space-new-thread"
                    data-onboarding-space-id={space.id}
                  >
                    <div className="bg-zaki-elevated rounded-full size-5 flex items-center justify-center">
                      <AddIcon color="#88735A" />
                    </div>
                    <span className="text-zaki-muted text-sm font-medium">{t("sidebar.actions.newChat")}</span>
                  </button>
                </div>
              )}
            </div>
          ))}
          {filteredUserSpaces.map((space) => (
            <div key={space.id}>
              <div className="relative group">
                <div
                  className={cn(
                    "w-full flex items-center gap-2 rounded-lg transition-colors",
                    isSpaceActive(space.id) ? "bg-zaki-hover" : "hover:bg-zaki-hover"
                  )}
                >
                  <button
                    onClick={() => handleSpaceToggle(space.id)}
                    className={cn(
                      "min-w-0 flex-1 flex items-center gap-2 p-1.5 text-left",
                      isRtl && "text-right"
                    )}
                    type="button"
                  >
                    <div className="size-5 flex items-center justify-center">
                      {(() => {
                        const Icon = spaceIconMap[space.icon ?? "folder"] ?? Folder;
                        return <Icon className="size-4" style={{ color: space.color ?? "#88735A" }} />;
                      })()}
                    </div>
                    {editingItem?.type === "space" && editingItem.id === space.id ? (
                      <input
                        className="flex-1 bg-white border border-zaki-strong rounded-md px-2 py-1 text-sm text-zaki-secondary outline-none"
                        value={editingValue}
                        onChange={(event) => setEditingValue(event.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            commitRename();
                          }
                          if (event.key === "Escape") {
                            setEditingItem(null);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className={cn("text-zaki-secondary text-sm font-medium flex-1", isRtl && "text-right")}>
                        {space.title}
                      </span>
                    )}
                  </button>
                  <div className="flex items-center gap-1">
                    {!space.fixed && (
                      <button
                        type="button"
                        className="size-7 rounded-md p-0 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-zaki-hover transition focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
                        onClick={() => {
                          setSpaceSettingsTarget(space);
                          setSpaceDescriptionDraft(space.description ?? "");
                          setSpaceSettingsOpen(true);
                        }}
                        aria-label={`${space.title} settings`}
                      >
                        <Settings className="size-4 text-zaki-muted" />
                      </button>
                    )}
                    {space.threads.length > 0 && (
                      <button
                        type="button"
                        className={cn(
                          "inline-flex shrink-0 rounded-md p-1 transition-transform hover:bg-zaki-hover focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2",
                          isSpaceExpanded(space.id) ? "rotate-0" : isRtl ? "rotate-90" : "-rotate-90"
                        )}
                        onClick={() => toggleSpace(space.id)}
                        aria-label={`${space.title} threads`}
                      >
                        <ChevronDownIcon />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {isSpaceExpanded(space.id) && (
                <div className="pl-6 flex flex-col gap-1 mt-1">
                  {space.threads.map((thread) => (
                    <div key={thread.id} className="relative group">
                      <button
                        className={cn(
                          "zaki-thread-item w-full text-left text-zaki-secondary text-sm font-medium py-1.5 px-2 rounded-lg",
                          isRtl && "text-right",
                          isActive(thread.id) ? "zaki-nav-active" : ""
                        )}
                        onClick={() => {
                          setExpandedSpace(space.id);
                          setActiveItem(thread.id);
                          goToThread(space.id, thread.id);
                        }}
                        type="button"
                      >
                        {editingItem?.type === "thread" && editingItem.id === thread.id ? (
                          <input
                            className="w-full bg-white border border-zaki-strong rounded-md px-2 py-1 text-sm text-zaki-secondary outline-none"
                            value={editingValue}
                            onChange={(event) => setEditingValue(event.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                commitRename();
                              }
                              if (event.key === "Escape") {
                                setEditingItem(null);
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          thread.label
                        )}
                      </button>
                      <button
                        type="button"
                        className="absolute right-0 top-1/2 -translate-y-1/2 size-6 rounded-md p-0 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-zaki-hover transition focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenMenu(openMenu?.id === thread.id ? null : { type: "thread", id: thread.id });
                        }}
                        data-menu-button
                        aria-haspopup="menu"
                        aria-expanded={openMenu?.id === thread.id}
                        aria-label={`${thread.label} options`}
                      >
                        <MoreHorizontal className="size-4 text-zaki-muted" />
                      </button>
                      {openMenu?.type === "thread" && openMenu.id === thread.id && (
                        <div
                          className="absolute right-0 top-8 w-36 rounded-zaki-md border border-zaki-subtle bg-white shadow-[0px_12px_24px_rgba(15,15,15,0.12)] p-1 z-20"
                          role="menu"
                          data-menu
                        >
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-zaki-primary hover:bg-zaki-hover"
                            onClick={() => togglePinned("thread", thread.id)}
                          >
                            <Pin className="size-3.5 text-zaki-muted" />
                            {thread.pinned ? "Unpin" : "Pinned"}
                          </button>
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-zaki-primary hover:bg-zaki-hover"
                            onClick={() => startRename("thread", thread.id, thread.label)}
                          >
                            <Pencil className="size-3.5 text-zaki-muted" />
                            Rename
                          </button>
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-zaki-brand hover:bg-zaki-error"
                            onClick={() => setConfirmDelete({ type: "thread", id: thread.id, label: thread.label })}
                          >
                            <Trash2 className="size-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    className="flex items-center gap-2 p-1.5 rounded-lg transition-colors text-left group hover:bg-zaki-hover"
                    onClick={() => createThreadInSpace(space.id)}
                    type="button"
                    data-onboarding-id="sidebar-space-new-thread"
                    data-onboarding-space-id={space.id}
                  >
                    <div className="bg-zaki-elevated rounded-full size-5 flex items-center justify-center">
                      <AddIcon color="#88735A" />
                    </div>
                    <span className="text-zaki-muted text-sm font-medium">{t("sidebar.actions.newChat")}</span>
                  </button>
                </div>
              )}
            </div>
          ))}

        </div>
      </div>

      {/* Footer Profile */}
      <div className="mt-4 pt-3 border-t border-zaki-subtle relative">
	        <button
			          type="button"
			          className={cn(
			            "w-full flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-zaki-hover",
			            isRtl ? "flex-row-reverse text-right" : "text-left"
			          )}
          onClick={() => {
            setActiveItem("profile");
            setProfileMenuOpen((open) => {
              const nextOpen = !open;
              if (nextOpen) {
                window.dispatchEvent(new Event("zaki:onboarding-profile-menu-opened"));
              }
              return nextOpen;
            });
	          }}
          aria-haspopup="menu"
          aria-expanded={profileMenuOpen}
          data-profile-button
          data-onboarding-id="profile-menu-trigger"
        >
          <div className="size-10 bg-zaki-elevated rounded-full flex items-center justify-center text-zaki-primary font-medium text-base">
            {userInitials}
          </div>
	          <div className="flex-1 min-w-0">
	            <div className="text-zaki-primary text-sm font-medium truncate">{userName}</div>
	            <div
	              className={cn(
	                "text-xs font-semibold",
	                !isRtl && "uppercase tracking-wider",
	                isPremium ? "text-zaki-success" : "text-zaki-success"
	              )}
	            >
	              {planDisplay}
	            </div>
          </div>
        </button>
        {profileMenuOpen && (
		          <div
		            className={cn(
		              "absolute bottom-14 w-[240px] rounded-zaki-lg border border-zaki-subtle bg-white dark:bg-[#14100d] dark:border-[#2a2018] shadow-[0px_14px_30px_rgba(15,15,15,0.12)] dark:shadow-[0px_18px_42px_rgba(0,0,0,0.45)] p-1 z-20",
		              isRtl ? "left-0" : "right-0"
		            )}
	            role="menu"
	            data-profile-menu
	          >
	            <div
	              className={cn(
                  "w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2",
                  isRtl ? "flex-row-reverse text-right" : "text-left"
                )}
            >
              <div className="size-7 rounded-full bg-zaki-elevated flex items-center justify-center text-xs font-medium text-zaki-primary">
                {userInitials}
              </div>
	              <div className={cn("min-w-0", isRtl ? "text-right" : "text-left")}>
	                <div className="text-sm text-zaki-primary font-medium truncate">{userName}</div>
	                <div className="text-xs text-zaki-disabled truncate">{t("sidebar.profile.manage")}</div>
	              </div>
	              <span className={cn(
	                "text-2xs font-semibold px-1.5 py-0.5 rounded",
	                isRtl ? "mr-auto" : "ml-auto",
	                !isRtl && "uppercase tracking-wider",
	                isPremium ? "bg-zaki-success text-zaki-success" : "bg-zaki-sunken text-zaki-success"
	              )}>
	                {planLabel}
	              </span>
	            </div>
	            <div className="h-px bg-zaki-sunken my-1" />
	            <Link
	              className={cn(profileMenuItemBase, "text-sm text-zaki-primary dark:text-[#efe6d9] hover:bg-zaki-hover dark:hover:bg-[#1b1512]")}
	              to="/pricing?source=settings"
		              onClick={() => {
		                void trackProductEvent({
                    event: "upgrade_cta_clicked",
                    source: "settings",
                    language: isRtl ? "ar" : "en",
                    plan:
                      isPremium
                        ? planTierRaw === "student" || planTierRaw === "personal"
                          ? planTierRaw
                          : "personal"
                        : "personal",
                    interval: "monthly",
                  }).catch(() => {
                    // Best-effort telemetry only.
                  });
                  setProfileMenuOpen(false);
	              }}
	            >
	              <Sparkles className="size-4 text-zaki-muted" />
	              {isPremium ? t("sidebar.profile.managePlan") : t("sidebar.profile.upgradePlan")}
		            </Link>
		            <button
	              className={cn(profileMenuItemBase, "text-sm text-zaki-primary dark:text-[#efe6d9] hover:bg-zaki-hover dark:hover:bg-[#1b1512]")}
	              type="button"
		              onClick={() => setThemePreference(isDark ? "light" : "dark")}
		            >
		              <Moon className="size-4 text-zaki-muted" />
		              {t("sidebar.profile.darkMode")}
		              <span className={cn("text-zaki-disabled text-xs", isRtl ? "mr-auto" : "ml-auto")}>
		                {isDark ? t("sidebar.profile.on") : t("sidebar.profile.off")}
		              </span>
		            </button>
	            <button
	              className={cn(profileMenuItemBase, "text-sm text-zaki-primary dark:text-[#efe6d9] hover:bg-zaki-hover dark:hover:bg-[#1b1512]")}
	              type="button"
              onClick={() => {
                setProfileMenuOpen(false);
                setMemorySearchQuery("");
                setMemoryOpen(true);
                window.dispatchEvent(new Event("zaki:onboarding-memory-opened"));
              }}
              data-onboarding-id="profile-menu-memory"
	            >
		              <Brain className="size-4 text-zaki-muted" />
		              {t("sidebar.profile.memory")}
		              {memoryConflictCount > 0 && (
		                <span className={cn(
                      "inline-flex min-w-[18px] items-center justify-center rounded-full bg-zaki-brand px-1.5 py-0.5 text-[10px] font-semibold text-white",
                      isRtl ? "mr-auto" : "ml-auto"
                    )}>
		                  {memoryConflictCount}
	                </span>
	              )}
	            </button>
	            <button
	              className={cn(profileMenuItemBase, "text-sm text-zaki-primary dark:text-[#efe6d9] hover:bg-zaki-hover dark:hover:bg-[#1b1512]")}
	              type="button"
              onClick={() => {
                setProfileMenuOpen(false);
                setSettingsOpen(true);
                window.dispatchEvent(new Event("zaki:onboarding-settings-opened"));
              }}
              data-onboarding-id="profile-menu-settings"
	            >
	              <Settings className="size-4 text-zaki-muted" />
	              {t("sidebar.profile.settings")}
		            </button>
	            <button
	              className={cn(profileMenuItemBase, "text-sm text-zaki-primary dark:text-[#efe6d9] hover:bg-zaki-hover dark:hover:bg-[#1b1512]")}
	              type="button"
		              onClick={() => {
		                setProfileMenuOpen(false);
		                setSettingsOpen(true);
	              }}
	            >
	              <Globe className="size-4 text-zaki-muted" />
	              {t("sidebar.profile.language")}
		            </button>
	            <button
	              className={cn(profileMenuItemBase, "text-sm text-zaki-primary dark:text-[#efe6d9] hover:bg-zaki-hover dark:hover:bg-[#1b1512]")}
	              type="button"
              onClick={() => {
                setProfileMenuOpen(false);
                window.dispatchEvent(new Event("zaki:open-onboarding"));
              }}
              data-onboarding-id="profile-menu-how-to-use"
	            >
	              <HelpCircle className="size-4 text-zaki-muted" />
	              {t("sidebar.profile.howToUse")}
	            </button>
	            <button
	              className={cn(profileMenuItemBase, "text-sm text-zaki-primary dark:text-[#efe6d9] hover:bg-zaki-hover dark:hover:bg-[#1b1512]")}
	              type="button"
		              onClick={() => {
		                setProfileMenuOpen(false);
		                navigate("/help");
	              }}
	            >
	              <HelpCircle className="size-4 text-zaki-muted" />
	              {t("sidebar.profile.help")}
	            </button>
	            <div className="h-px bg-zaki-sunken my-1" />
	            <button
	              className={cn(profileMenuItemBase, "text-sm text-zaki-brand dark:text-[#ffb6a4] hover:bg-zaki-error dark:hover:bg-[rgba(210,68,48,0.18)]")}
	              type="button"
		              onClick={() => {
		                setProfileMenuOpen(false);
	                logout();
	              }}
	            >
	              <LogOut className="size-4" />
	              {t("sidebar.profile.logout")}
	            </button>
	            <button
	              type="button"
	              className={cn(
	                "px-2.5 pt-1 text-2xs text-zaki-disabled hover:text-zaki-secondary",
	                isRtl ? "text-right" : "text-left"
	              )}
	              onClick={() => {
	                setProfileMenuOpen(false);
	                navigate("/legal");
	              }}
	            >
	              {t("sidebar.profile.terms", { version: APP_VERSION })}
	            </button>
          </div>
        )}
      </div>
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        displayName={displayName}
        onDisplayNameChange={setDisplayName}
        email={user?.username || ""}
        themePreference={themePreference}
        onThemeChange={(value) =>
          setThemePreference(value as "light" | "dark" | "system")
        }
        onSave={async () => {
          const saved = await saveDisplayName();
          if (saved) {
            setSettingsOpen(false);
          }
        }}
        onAccountDeleted={() => {
          setSettingsOpen(false);
          setProfileMenuOpen(false);
          logout();
        }}
        saving={profileSaving}
      />
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="absolute inset-0" onClick={() => setConfirmDelete(null)} aria-hidden="true" />
          <div
            ref={deleteConfirmModalRef}
            role="alertdialog"
            aria-modal="true"
            aria-label="Delete confirmation"
            className="relative w-[420px] max-w-[calc(100%-2rem)] rounded-zaki-2xl border border-zaki bg-white shadow-[0px_24px_60px_rgba(15,15,15,0.18)] px-6 py-5"
          >
            <div className="text-lg font-semibold text-zaki-primary">Delete {confirmDelete.type}</div>
            <div className="mt-2 text-sm text-zaki-secondary">
              Deleting this {confirmDelete.type} will delete the chat and content permanently. There is no way to retrieve the content of the deleted {confirmDelete.type === "space" ? "chats in this space" : "chat"} after deletion.
            </div>
            <div className="mt-4 text-xs text-zaki-disabled">Selected: {confirmDelete.label}</div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                className="zaki-btn zaki-btn-secondary"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="zaki-btn bg-zaki-brand text-white hover:bg-zaki-brand transition-colors"
                onClick={() => {
                  performDelete(confirmDelete.type, confirmDelete.id);
                  setConfirmDelete(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {memoryOpen && user?.username && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/60 backdrop-blur-[2px]">
          <div
            className="absolute inset-0"
            onClick={() => {
              setMemoryOpen(false);
              setMemorySearchQuery("");
            }}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Memory viewer"
            data-onboarding-id="memory-viewer-dialog"
            className="relative w-[720px] max-w-[calc(100%-2rem)] rounded-zaki-2xl border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card shadow-[0px_24px_60px_rgba(15,15,15,0.18)] dark:shadow-[0px_34px_90px_rgba(0,0,0,0.55)] overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zaki-subtle dark:border-zaki-dark bg-[linear-gradient(135deg,#fff8f0_0%,#f3e7d9_100%)] dark:bg-[linear-gradient(140deg,#21170f_0%,#16110d_58%,#120e0b_100%)]">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-[linear-gradient(135deg,#E56A54_0%,#219171_100%)] flex items-center justify-center">
                  <Brain className="size-5 text-white" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-zaki-primary dark:text-zaki-dark-primary">{sidebarCopy.memoryTitle}</div>
                  <div className="text-xs text-zaki-disabled dark:text-zaki-dark-muted">{sidebarCopy.memorySubtitle}</div>
                </div>
              </div>
              <button
                type="button"
                className="zaki-icon-btn size-9"
                onClick={() => {
                  setMemoryOpen(false);
                  setMemorySearchQuery("");
                }}
                aria-label={sidebarCopy.closeMemoryAria}
              >
                <span className="block text-lg leading-none">×</span>
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto px-6 py-6 bg-zaki-base/60 dark:bg-[#130f0c]">
              <MemoryViewer userId={user.username} initialSearchQuery={memorySearchQuery} />
            </div>
          </div>
        </div>
      )}
      {spaceSettingsOpen && spaceSettingsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/60 backdrop-blur-[1px]">
          <div
            className="absolute inset-0"
            onClick={() => {
              setSpaceSettingsOpen(false);
              setSpaceSettingsTarget(null);
            }}
            aria-hidden="true"
          />
          <div
            ref={spaceSettingsModalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Space settings"
            className="relative w-[420px] max-w-[calc(100%-2rem)] rounded-zaki-2xl border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card shadow-[0px_24px_60px_rgba(15,15,15,0.18)]"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zaki-subtle dark:border-zaki-dark">
              <div>
                <div className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">{t("sidebar.spaceSettings")}</div>
                <div className="text-xs text-zaki-muted dark:text-zaki-dark-muted mt-1 truncate">
                  {spaceSettingsTarget.title}
                </div>
                <div className="mt-2 text-[11px] text-zaki-disabled dark:text-zaki-dark-muted">
                  {t("sidebar.spaceSettingsSubtitle")}
                </div>
              </div>
              <button
                type="button"
                className="size-8 rounded-full border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card text-zaki-secondary dark:text-zaki-dark-muted hover:bg-zaki-hover dark:hover:bg-zaki-dark-hover transition-colors"
                onClick={() => {
                  setSpaceSettingsOpen(false);
                  setSpaceSettingsTarget(null);
                }}
                aria-label={sidebarCopy.closeSpaceSettingsAria}
              >
                <span className="block text-lg leading-none">×</span>
              </button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-5">
              <section className="flex flex-col gap-2">
                <div className="text-2xs uppercase tracking-[0.2em] text-zaki-muted">{t("sidebar.basics")}</div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-2xs uppercase tracking-[0.2em] text-zaki-muted">{sidebarCopy.description}</span>
                <textarea
                  className="w-full rounded-zaki-lg border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-elevated px-3 py-2 text-sm text-zaki-secondary dark:text-zaki-dark-subtle outline-none focus-visible:ring-2 focus-visible:ring-zaki-brand"
                  rows={3}
                  maxLength={200}
                  value={spaceDescriptionDraft}
                  onChange={(event) => setSpaceDescriptionDraft(event.target.value)}
                  placeholder={sidebarCopy.descriptionPlaceholder}
                />
                <div className="text-[10px] text-zaki-muted text-right">
                  {spaceDescriptionDraft.length}/200
                </div>
                </label>
              </section>

              <section className="flex flex-col gap-3">
                <div>
                  <div className="text-2xs uppercase tracking-[0.2em] text-zaki-muted">{t("sidebar.sharedContext")}</div>
                  <div className="mt-1 text-[11px] text-zaki-disabled dark:text-zaki-dark-muted">
                    {t("sidebar.sharedContextSubtitle")}
                  </div>
                </div>
                <div className="grid gap-3">
                  <button
                    type="button"
                    className="w-full rounded-zaki-xl border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-elevated px-3.5 py-3 text-left hover:bg-zaki-hover dark:hover:bg-zaki-dark-hover transition-colors"
                    onClick={() => {
                      setSpaceSettingsOpen(false);
                      setSpaceSettingsTarget(null);
                      window.dispatchEvent(
                        new CustomEvent("zaki:edit-space-instructions", { detail: { id: spaceSettingsTarget.id } })
                      );
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                          {t("sidebar.instructionsTitle")}
                        </div>
                        <div className="mt-1 text-[11px] leading-5 text-zaki-muted dark:text-zaki-dark-muted">
                          {t("sidebar.instructionsBody")}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-zaki-sunken px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zaki-secondary dark:bg-zaki-dark-card dark:text-zaki-dark-subtle">
                        {t("sidebar.editAction")}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="w-full rounded-zaki-xl border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-elevated px-3.5 py-3 text-left hover:bg-zaki-hover dark:hover:bg-zaki-dark-hover transition-colors"
                    onClick={() => {
                      setSpaceSettingsOpen(false);
                      setSpaceSettingsTarget(null);
                      window.dispatchEvent(
                        new CustomEvent("zaki:upload-space-files", { detail: { id: spaceSettingsTarget.id } })
                      );
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                          {t("sidebar.knowledgeFilesTitle")}
                        </div>
                        <div className="mt-1 text-[11px] leading-5 text-zaki-muted dark:text-zaki-dark-muted">
                          {t("sidebar.knowledgeFilesBody")}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-zaki-sunken px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zaki-secondary dark:bg-zaki-dark-card dark:text-zaki-dark-subtle">
                        {t("sidebar.filesBadge", { count: spaceSettingsTarget.pinnedFiles?.length ?? 0 })}
                      </span>
                    </div>
                  </button>
                </div>

                <div className="rounded-zaki-xl border border-zaki-subtle dark:border-zaki-dark bg-zaki-base/50 dark:bg-zaki-dark-elevated px-3.5 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zaki-muted dark:text-zaki-dark-muted">
                    {t("sidebar.contextSummaryTitle")}
                  </div>
                  <div className="mt-3 space-y-2.5">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-zaki-brand shadow-sm dark:bg-zaki-dark-card">
                        <Brain className="size-3.5" />
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                          {t("sidebar.contextSummaryMemoryLabel")}
                        </div>
                        <div className="text-[11px] text-zaki-muted dark:text-zaki-dark-muted">
                          {t("sidebar.contextSummaryMemoryBody")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-zaki-brand shadow-sm dark:bg-zaki-dark-card">
                        <FileText className="size-3.5" />
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                          {t("sidebar.contextSummarySpaceLabel")}
                        </div>
                        <div className="text-[11px] text-zaki-muted dark:text-zaki-dark-muted">
                          {t("sidebar.contextSummarySpaceBody")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {(spaceSettingsTarget.pinnedFiles ?? []).length > 0 ? (
                    (spaceSettingsTarget.pinnedFiles ?? []).map((file) => {
                      const status = file.status ?? "embedded";
                      const tone = fileStatusTone[status];
                      const removeKey = `${spaceSettingsTarget.id}:${String(file.location || "")}`;
                      return (
                        <div
                          key={`${file.name}:${file.size}:${file.type}:${file.location ?? ""}`}
                          className="flex items-start justify-between gap-3 rounded-zaki-lg border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-zaki-primary dark:text-zaki-dark-primary">
                              {file.name}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-zaki-muted dark:text-zaki-dark-muted">
                              <span>{file.type || "document"}</span>
                              <span className={`rounded-full px-2 py-0.5 font-semibold ${tone.chip}`}>
                                {tone.label}
                              </span>
                            </div>
                            {status === "failed" && file.error && (
                              <div className="mt-1 text-[11px] text-rose-700">{file.error}</div>
                            )}
                          </div>
                          <button
                            type="button"
                            className="shrink-0 rounded-full border border-zaki-subtle dark:border-zaki-dark px-2.5 py-1 text-[11px] text-zaki-secondary dark:text-zaki-dark-subtle hover:bg-zaki-hover dark:hover:bg-zaki-dark-hover disabled:opacity-50"
                            onClick={() => removeWorkspaceDocument(spaceSettingsTarget.id, file)}
                            disabled={!file.location || removingDocumentKey === removeKey}
                          >
                            {removingDocumentKey === removeKey
                              ? t("sidebar.removingAction")
                              : t("sidebar.removeAction")}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-zaki-lg border border-dashed border-zaki-subtle dark:border-zaki-dark px-3 py-3 text-sm text-zaki-muted dark:text-zaki-dark-muted">
                      {t("sidebar.workspaceFilesEmpty")}
                    </div>
                  )}
                </div>

                {!spaceSettingsTarget.fixed && (
                  <section className="rounded-zaki-xl border border-rose-200/80 bg-rose-50/55 px-3.5 py-3 dark:border-rose-900/40 dark:bg-rose-950/10">
                    <div className="text-2xs uppercase tracking-[0.2em] text-rose-700/90 dark:text-rose-300">
                      {t("sidebar.dangerZone")}
                    </div>
                    <div className="mt-2 text-[11px] leading-5 text-rose-800/80 dark:text-rose-200/80">
                      {t("sidebar.dangerZoneBody")}
                    </div>
                    <button
                      type="button"
                      className="mt-3 w-full rounded-zaki-lg border border-rose-200 bg-white px-3 py-2 text-left text-sm text-zaki-brand hover:bg-[rgba(210,68,48,0.08)] transition-colors dark:border-rose-900/40 dark:bg-zaki-dark-card"
                      onClick={() => {
                        setSpaceSettingsOpen(false);
                        setSpaceSettingsTarget(null);
                        setConfirmDelete({
                          type: "space",
                          id: spaceSettingsTarget.id,
                          label: spaceSettingsTarget.title || spaceSettingsTarget.id,
                        });
                      }}
                    >
                      Delete space
                    </button>
                  </section>
                )}
              </section>
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-t border-zaki-subtle dark:border-zaki-dark">
              <button
                type="button"
                className="zaki-btn zaki-btn-secondary"
                onClick={() => {
                  setSpaceSettingsOpen(false);
                  setSpaceSettingsTarget(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="zaki-btn bg-zaki-accent text-white hover:bg-zaki-accent-hover transition-colors zaki-pressable"
                onClick={() => {
                  if (!spaceSettingsTarget) return;
                  window.dispatchEvent(
                    new CustomEvent("zaki:update-space", {
                      detail: { id: spaceSettingsTarget.id, description: spaceDescriptionDraft.trim() },
                    })
                  );
                  setSpaceSettingsOpen(false);
                  setSpaceSettingsTarget(null);
                }}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
      {collapsed && confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="absolute inset-0" onClick={() => setConfirmDelete(null)} aria-hidden="true" />
          <div
            ref={deleteConfirmModalRef}
            role="alertdialog"
            aria-modal="true"
            aria-label="Delete confirmation"
            className="relative w-[420px] max-w-[calc(100%-2rem)] rounded-zaki-2xl border border-zaki bg-white shadow-[0px_24px_60px_rgba(15,15,15,0.18)] px-6 py-5"
          >
            <div className="text-lg font-semibold text-zaki-primary">Delete {confirmDelete.type}</div>
            <div className="mt-2 text-sm text-zaki-secondary">
              Deleting this {confirmDelete.type} will delete the chat and content permanently. There is no way to retrieve the content of the deleted {confirmDelete.type === "space" ? "chats in this space" : "chat"} after deletion.
            </div>
            <div className="mt-4 text-xs text-zaki-disabled">Selected: {confirmDelete.label}</div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                className="zaki-btn zaki-btn-secondary"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="zaki-btn bg-zaki-brand text-white hover:bg-zaki-brand transition-colors"
                onClick={() => {
                  performDelete(confirmDelete.type, confirmDelete.id);
                  setConfirmDelete(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      <ZakiBotControlPanel
        isOpen={zakiBotControlsOpen}
        onClose={() => setZakiBotControlsOpen(false)}
      />
    </nav>
  );
}
