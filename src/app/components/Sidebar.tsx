import { 
  LogoArabicRed, SideBarIcon, SearchIcon, AddIcon, 
  ChevronDownIcon, CenterLogo
} from "./icons";
import { MoreHorizontal, Pin, Pencil, Trash2, Folder, Briefcase, BookOpen, GraduationCap, Sparkles, Palette, FileText, Moon, Settings, Globe, HelpCircle, LogOut, Brain, ShieldCheck, Bot, Library, LayoutGrid, MessageSquare, PenLine, Database, Activity, Upload, User, Clock3, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  apiRequest,
  deleteAgentSession,
} from "@/lib/api";
import { trackProductEvent } from "@/lib/productTelemetry";
import { useAuthStore, useUIStore, useSpacesStore, useNavigationStore } from "@/stores";
import { useNavigation } from "@/hooks/useNavigation";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { SkeletonSpaceList } from "./ui/skeleton";
import { toast } from "sonner";
import type { PinnedFile, Space, Thread } from "@/types";
import { MemoryViewer } from "./memory/MemoryViewer";
import { spaceKeys, useSpaces } from "@/queries/useSpaces";
import { useEntitlements, useZakiSessions, zakiSessionKeys } from "@/queries";
import {
  hasActiveSubscription,
  resolveCommercialPlanId,
  resolveEffectiveEntitlement,
} from "@/lib/entitlements";
import { useTranslation } from "react-i18next";
import { SidebarModeSwitch } from "./sidebar/SidebarModeSwitch";
import { DEFAULT_SPACE_SWATCH } from "./chat/spaceSwatches";
import { ZakiSessionList } from "./sidebar/ZakiSessionList";
import { SpaceSettingsSheet } from "./sidebar/SpaceSettingsSheet";
import { DEFAULT_THREAD_LABEL, isDefaultThreadLabel } from "@/lib/threadTitles";
import { createAnonymousSpaces, createAnonymousThreadId } from "@/lib/anonymousSpaces";
import {
  isZakiBotSpaceId,
  ZAKI_BOT_LABEL,
  ZAKI_BOT_SPACE_ID,
} from "@/lib/zakiBot";
import {
  extractThreadSlugFromSessionKey,
  isThreadLaneZakiSessionKey,
  normalizeZakiSessionKey,
} from "@/lib/zakiSessions";
import {
  InlineConfirm,
  TypeToConfirmDialog,
} from "@/app/components/ui/zaki";

// Sidebar uses threads as required array
type SidebarSpace = Omit<Space, 'threads'> & { threads: Thread[] };
const APP_VERSION = "1.5.69";

type SidebarProps = {
  chrome?: "full" | "context";
};

type AgentControlTab =
  | "plan"
  | "controls"
  | "approvals"
  | "cron"
  | "evidence"
  | "browser"
  | "artifacts"
  | "trace"
  | "context"
  | "memory"
  | "usage";

const PENDING_AGENT_CONTROLS_TAB_KEY = "zaki:pendingPowerUserTab";

type LearningSubnavEntry = {
  view: string;
  label: string;
  icon: LucideIcon;
};

const LEARNING_SUBNAV: LearningSubnavEntry[] = [
  { view: "chat", label: "Chat", icon: MessageSquare },
  { view: "agents", label: "TutorBot", icon: Bot },
  { view: "writer", label: "Co-Writer", icon: PenLine },
  { view: "books", label: "Book", icon: Library },
  { view: "sources", label: "Knowledge", icon: BookOpen },
  { view: "space", label: "Space", icon: LayoutGrid },
];

const LEARNING_VIEW_ALIASES: Record<string, string> = {
  tutorbot: "agents",
  "co-writer": "writer",
  book: "books",
  knowledge: "sources",
  notebooks: "space",
  questions: "space",
  review: "space",
  solve: "chat",
};

function normalizeLearningView(value: string | null) {
  const normalized = String(value || "chat").trim().toLowerCase();
  return LEARNING_VIEW_ALIASES[normalized] || normalized || "chat";
}

const HIRE_SUBNAV: LearningSubnavEntry[] = [
  { view: "dashboard", label: "Dashboard", icon: Activity },
  { view: "pipeline", label: "Pipeline", icon: Briefcase },
  { view: "profile", label: "Profile", icon: User },
  { view: "import", label: "Import", icon: Upload },
  { view: "activity", label: "Activity", icon: Clock3 },
];

function normalizeHireView(value: string | null) {
  const normalized = String(value || "dashboard").trim().toLowerCase();
  return HIRE_SUBNAV.some((item) => item.view === normalized) ? normalized : "dashboard";
}

export function Sidebar({ chrome = "full" }: SidebarProps) {
  const { t, i18n } = useTranslation();
  const contextOnly = chrome === "context";
  const isRtl = i18n.language?.toLowerCase().startsWith("ar");
  const location = useLocation();
  const activeLearningView = normalizeLearningView(
    new URLSearchParams(location.search).get("view")
  );
  const activeHireView = normalizeHireView(
    new URLSearchParams(location.search).get("view")
  );
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
  // Get state from stores
  const { user, logout } = useAuthStore();
  const { resolvedTheme, setThemePreference, sidebarCollapsed: collapsed, setSidebarCollapsed } = useUIStore();
  const effectiveCollapsed = !contextOnly && collapsed;
  const { setSpaces: setGlobalSpaces } = useSpacesStore();
  const {
    currentView,
    activeSpaceId,
    activeThreadId,
    activeZakiSessionKey,
    goHome,
    goToAbout,
    goToSpace,
    goToSpaces,
    goToThread,
    goToZakiBot,
    goToZakiHome,
    setSidebarMode,
  } = useNavigation();
  const { sidebarMode, zakiSessionKey: storedZakiSessionKey } = useNavigationStore();
  const {
    data: zakiSessions = [],
    isLoading: zakiSessionsLoading,
    isError: zakiSessionsError,
    refetch: refetchZakiSessions,
  } = useZakiSessions(Boolean(user) && sidebarMode === "zaki");
  const activeSessionKey =
    isZakiBotSpaceId(activeSpaceId) && (activeZakiSessionKey || storedZakiSessionKey)
      ? normalizeZakiSessionKey(activeZakiSessionKey || storedZakiSessionKey || "")
      : null;
  const totalPendingApprovals = useMemo(
    () =>
      zakiSessions.reduce(
        (sum, session) => sum + Math.max(0, session.pending_approval_count ?? 0),
        0
      ),
    [zakiSessions]
  );
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setCollapsed = setSidebarCollapsed;
  const [expandedSpace, setExpandedSpace] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState("new-space");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [memorySearchQuery, setMemorySearchQuery] = useState("");
  const [memoryInitialTab, setMemoryInitialTab] = useState<
    "memories" | "pending" | "conflicts"
  >("memories");
  const [memoryConflictCount, setMemoryConflictCount] = useState(0);
  const { data: entitlementsResult } = useEntitlements();
  const entitlements = entitlementsResult?.data ?? null;
  const planTierRaw = entitlements?.plan?.tier ?? "free";
  const commercialPlanId = resolveCommercialPlanId(entitlements);
  const effectiveEntitlement = resolveEffectiveEntitlement(entitlements);
  const hasSubscription = hasActiveSubscription(entitlements);
  const isPremium = effectiveEntitlement.premium;
  const activeViaAccessCode = effectiveEntitlement.source === "access_code";
  const planLabel =
    activeViaAccessCode
      ? t("sidebar.profile.planBadge.codeActive")
      : commercialPlanId === "agent"
      ? t("pricingPage.plans.agent.label")
      : commercialPlanId === "learn"
      ? t("pricingPage.plans.learn.label")
      : commercialPlanId === "complete" || commercialPlanId === "legacy_personal" || planTierRaw === "pro" || planTierRaw === "personal" || planTierRaw === "student"
      ? t("pricingPage.plans.complete.label")
      : t("sidebar.profile.planBadge.free");
  const planDisplay =
    activeViaAccessCode
      ? t("sidebar.profile.planBadge.codeActive")
      : commercialPlanId === "agent"
      ? t("pricingPage.plans.agent.label")
      : commercialPlanId === "learn"
      ? t("pricingPage.plans.learn.label")
      : commercialPlanId === "complete" || commercialPlanId === "legacy_personal" || planTierRaw === "pro" || planTierRaw === "personal" || planTierRaw === "student"
      ? t("pricingPage.plans.complete.label")
      : t("pricingPage.plans.free.label");
  const [openMenu, setOpenMenu] = useState<{ type: "thread"; id: string } | null>(null);
  const [spaceSettingsOpen, setSpaceSettingsOpen] = useState(false);
  const [spaceSettingsTarget, setSpaceSettingsTarget] = useState<SidebarSpace | null>(null);
  const [spaceNameDraft, setSpaceNameDraft] = useState("");
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
  const isDark = resolvedTheme() === "dark";
  const [spaceSearchQuery, setSpaceSearchQuery] = useState("");
  const [removingDocumentKey, setRemovingDocumentKey] = useState<string | null>(null);
  const expandStorageKey = user?.username ? `zaki:expanded-space:${user.username}` : "zaki:expanded-space";

  const requestAgentControls = useCallback(
    (tab: AgentControlTab) => {
      const dispatch = () => {
        window.dispatchEvent(
          new CustomEvent("zaki:open-power-user", {
            detail: { tab },
          })
        );
      };
      if (location.pathname !== "/agent") {
        try {
          window.sessionStorage.setItem(PENDING_AGENT_CONTROLS_TAB_KEY, tab);
        } catch {
          // Non-critical handoff; the backup event below still handles same-tick navigation.
        }
        navigate("/agent");
        window.setTimeout(dispatch, 0);
        return;
      }
      dispatch();
    },
    [location.pathname, navigate]
  );

  const openSettingsSection = useCallback(
    (sectionId?: string) => {
      const hash = sectionId ? `#${sectionId}` : "";
      navigate(`/settings${hash}`);
      window.dispatchEvent(new Event("zaki:onboarding-settings-opened"));
    },
    [navigate]
  );

  useEffect(() => {
    const handleOpenMemory = (event: Event) => {
      if (!user?.username) return;
      const detail = (event as CustomEvent<{
        query?: string;
        tab?: "memories" | "pending" | "conflicts";
      }>).detail;
      const nextQuery = String(detail?.query || "").trim();
      const nextTab =
        detail?.tab === "pending" || detail?.tab === "conflicts" || detail?.tab === "memories"
          ? detail.tab
          : "memories";
      setMemorySearchQuery(nextQuery);
      setMemoryInitialTab(nextTab);
      setMemoryOpen(true);
      window.dispatchEvent(new Event("zaki:onboarding-memory-opened"));
    };
    const handleOpenSettings = () => {
      if (!user?.username) return;
      setProfileMenuOpen(false);
      openSettingsSection();
    };
    const handleCloseMemory = () => {
      setMemoryOpen(false);
      setMemorySearchQuery("");
      setMemoryInitialTab("memories");
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
  }, [openSettingsSection, user?.username]);

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

  // Focus trap retained for confirmDelete lifecycle (handled via primitives)
  useFocusTrap<HTMLDivElement>(!!confirmDelete);

  const isActive = (item: string) => activeItem === item;
  const isZakiBotNavActive =
    isZakiBotSpaceId(activeSpaceId) ||
    (currentView === "home" && activeItem === "zaki") ||
    activeItem === ZAKI_BOT_SPACE_ID;
  const isSpaceExpanded = (spaceId: string) => expandedSpace === spaceId;
  const isSpaceActive = (spaceId: string) => {
    if (activeItem === spaceId) return true;
    const space = spaces.find((entry) => entry.id === spaceId);
    if (!space) return false;
    return space.threads.some((thread) => thread.id === activeItem);
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
  const zakiThreadSessions = useMemo(
    () => zakiSessions.filter((session) => isThreadLaneZakiSessionKey(session.session_key)),
    [zakiSessions]
  );

  const blurButtonOnPointerClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0) {
      event.currentTarget.blur();
    }
  };

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

  const openAboutView = useCallback(() => {
    setExpandedSpace("zaki");
    setActiveItem("zaki");
    goToAbout();
    window.dispatchEvent(new Event("zaki:clear-thread"));
    window.dispatchEvent(new Event("zaki:view-zaki-home"));
  }, [goToAbout]);

  const openZakiBotView = useCallback(() => {
    setSpaceSearchQuery("");
    setExpandedSpace(ZAKI_BOT_SPACE_ID);
    setActiveItem(ZAKI_BOT_SPACE_ID);
    goToZakiBot();
    window.dispatchEvent(new Event("zaki:close-mobile-sidebar"));
  }, [goToZakiBot]);

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
    if (currentView === "chat" && activeThreadId) {
      setActiveItem(activeThreadId);
      if (activeSpaceId) {
        setExpandedSpace(activeSpaceId);
      }
      return;
    }
    if (currentView === "space-detail" && activeSpaceId) {
      setActiveItem(activeSpaceId);
      setExpandedSpace(activeSpaceId);
      return;
    }
    if (currentView === "spaces") {
      setActiveItem("new-space");
      return;
    }
    if (currentView === "home") {
      setActiveItem("zaki");
    }
  }, [activeSpaceId, activeThreadId, currentView]);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(expandStorageKey) : null;
    if (stored && stored !== "none" && stored !== expandedSpace) {
      setExpandedSpace(stored);
    }
    if (!user) {
      const anonymousSpaces = createAnonymousSpaces() as SidebarSpace[];
      setSpaces(anonymousSpaces);
      setSpacesError("");
      setExpandedSpace((prev) => prev ?? anonymousSpaces[0]?.id ?? null);
      return;
    }
    if (!spacesData) {
      return;
    }
    setSpaces(spacesData as SidebarSpace[]);
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
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [confirmDelete, memoryOpen, spaceSettingsOpen]);

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
    const applyRename = <TSpace extends { id: string; title: string; threads?: { id: string; label: string }[] }>(
      items: TSpace[]
    ): TSpace[] =>
      items.map((space) => {
        if (editingItem.type === "space" && space.id === editingItem.id) {
          return { ...space, title: trimmed };
        }
        if (editingItem.type === "thread") {
          return {
            ...space,
            threads: (space.threads ?? []).map((thread) =>
              thread.id === editingItem.id ? { ...thread, label: trimmed } : thread
            ),
          };
        }
        return space;
      });

    setSpaces((prev) => applyRename(prev));
    queryClient.setQueryData(spaceKeys.all, (prev: Space[] | undefined) =>
      prev ? applyRename(prev) : prev
    );
    if (editingItem.type === "thread") {
      window.dispatchEvent(
        new CustomEvent("zaki:rename-thread", {
          detail: { id: editingItem.id, label: trimmed },
        })
      );
    }
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
      try {
        await createThreadInSpace(newSpace.id);
      } catch {
        goToSpace(newSpace.id);
      }
    } catch (error) {
      setSpacesError("Unable to create a workspace. Check your permissions.");
    }
  };

  const createThreadInSpace = async (spaceId: string | null) => {
    if (isZakiBotSpaceId(spaceId)) {
      setExpandedSpace(ZAKI_BOT_SPACE_ID);
      setActiveItem(ZAKI_BOT_SPACE_ID);
      goToZakiHome();
      window.dispatchEvent(new Event("zaki:clear-thread"));
      window.dispatchEvent(new Event("zaki:close-mobile-sidebar"));
      return;
    }
    const resolvedSpaceId =
      spaceId
        ? spaceId
        : spaces.find((space) => !space.fixed)?.id ??
          spaces.find((space) => space.id !== "zaki")?.id ??
          spaces[0]?.id ??
          null;

    if (!resolvedSpaceId) {
      return;
    }
    if (!user) {
      const threadId = createAnonymousThreadId();
      setSpaces((prev) =>
        prev.map((space) =>
          space.id === resolvedSpaceId
            ? {
                ...space,
                threads: [
                  ...space.threads,
                  { id: threadId, label: DEFAULT_THREAD_LABEL, pinned: false },
                ],
              }
            : space
        )
      );
      setExpandedSpace(resolvedSpaceId);
      setActiveItem(threadId);
      goToThread(resolvedSpaceId, threadId);
      window.dispatchEvent(
        new CustomEvent("zaki:thread-created", {
          detail: { id: threadId, label: DEFAULT_THREAD_LABEL, spaceId: resolvedSpaceId },
        })
      );
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
        thread?: { slug?: string; id?: string; name?: string; label?: string };
      };
      const threadId = data.thread?.slug ?? data.thread?.id ?? `thread-${Date.now()}`;
      const threadName = data.thread?.name ?? data.thread?.label;
      const threadLabel = isDefaultThreadLabel(threadName)
        ? DEFAULT_THREAD_LABEL
        : threadName ?? DEFAULT_THREAD_LABEL;

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
    [goToSpace]
  );

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
        name?: string;
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
                title: typeof detail.name === "string" && detail.name.trim().length > 0
                  ? detail.name.trim()
                  : space.title,
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
      if (typeof detail.name === "string") {
        const normalizedName = detail.name.trim();
        if (normalizedName) {
          updatePayload.name = normalizedName;
        }
      }
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
      const detail = (event as CustomEvent<{ id: string; spaceId?: string; label: string }>).detail;
      if (!detail?.id || !detail?.label) return;
      setSpaces((prev) =>
        prev.map((space) =>
          detail.spaceId && space.id !== detail.spaceId
            ? space
            : {
                ...space,
                threads: space.threads.map((thread) =>
                  thread.id === detail.id ? { ...thread, label: detail.label } : thread
                ),
              }
        )
      );
    };
    const handleOpenSpaceSettings = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string }>).detail;
      const target = spaces.find((space) => space.id === detail?.id);
      if (!target) return;
      setSpaceSettingsTarget(target);
      setSpaceNameDraft(target.title ?? "");
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
        "zaki-sidebar h-full flex flex-col border-r-0 shrink-0 transition-[width,padding] duration-300",
        contextOnly && "zaki-sidebar--context",
        effectiveCollapsed ? "w-[72px] py-4 px-2" : "w-[272px] py-5 px-3.5"
      )}
    >
      {effectiveCollapsed ? (
        <>
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              className="size-10 rounded-zaki-md bg-zaki-selected border border-zaki flex items-center justify-center"
              onClick={openAboutView}
              aria-label="Open home"
            >
              <LogoArabicRed className="h-6 w-8 shrink-0" />
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

          <div className="mt-6 flex flex-col items-center gap-2.5">
            <button
              className={cn(
                "size-9 rounded-zaki-md flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2",
                sidebarMode === "spaces" ? "bg-zaki-hover" : "hover:bg-zaki-hover"
              )}
              onClick={() => goToSpaces()}
              type="button"
              title="Spaces"
              aria-label="Spaces"
            >
              <Folder className="size-4 text-zaki-muted" />
            </button>
            <button
              className={cn(
                "size-9 rounded-zaki-md transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2",
                isZakiBotNavActive ? "bg-zaki-hover" : "hover:bg-zaki-hover"
              )}
              onClick={openZakiBotView}
              onMouseUp={blurButtonOnPointerClick}
              type="button"
              title={ZAKI_BOT_LABEL}
              aria-label={ZAKI_BOT_LABEL}
            >
              <CenterLogo className="size-4 text-zaki-brand" />
            </button>
            <button
              className={cn(
                "size-9 rounded-zaki-md transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2",
                sidebarMode === "learning" ? "bg-zaki-hover" : "hover:bg-zaki-hover"
              )}
              onClick={() => {
                setSidebarMode("learning");
                navigate("/learn");
              }}
              onMouseUp={blurButtonOnPointerClick}
              type="button"
              title={t("sidebar.learning")}
              aria-label={t("sidebar.learning")}
            >
              <GraduationCap className="size-4 text-zaki-muted" />
            </button>
            <button
              className={cn(
                "size-9 rounded-zaki-md transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2",
                sidebarMode === "hire" ? "bg-zaki-hover" : "hover:bg-zaki-hover"
              )}
              onClick={() => {
                setSidebarMode("hire");
                navigate("/hire");
              }}
              onMouseUp={blurButtonOnPointerClick}
              type="button"
              title={t("sidebar.hire")}
              aria-label={t("sidebar.hire")}
            >
              <Briefcase className="size-4 text-zaki-muted" />
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
      {contextOnly ? (
        <div className="zaki-sidebar-v2-head">
          <div>
            <div className="zaki-sidebar-v2-kicker">
              {sidebarMode === "zaki"
                ? t("sidebar.context.agent", { defaultValue: "Agent" })
                : sidebarMode === "learning"
                ? t("sidebar.context.learn", { defaultValue: "Learn" })
                : sidebarMode === "brain"
                ? t("sidebar.context.brain", { defaultValue: "Brain" })
                : t("sidebar.context.chat", { defaultValue: "Chat" })}
            </div>
            <div className="zaki-sidebar-v2-title">
              {sidebarMode === "zaki"
                ? t("sidebar.context.threads", { defaultValue: "Threads" })
                : sidebarMode === "learning"
                ? t("sidebar.context.learningTools", { defaultValue: "Learning tools" })
                : sidebarMode === "brain"
                ? t("sidebar.context.memoryGraph", { defaultValue: "Memory graph" })
                : t("sidebar.context.workspaces", { defaultValue: "Workspaces" })}
            </div>
          </div>
          {sidebarMode === "zaki" ? (
            <button
              type="button"
              className="zaki-sidebar-v2-icon"
              onClick={() =>
                requestAgentControls(totalPendingApprovals > 0 ? "approvals" : "controls")
              }
              aria-label={t("zakiControls.common.controls")}
            >
              <ShieldCheck className="size-4" />
              {totalPendingApprovals > 0 ? (
                <span className="zaki-sidebar-v2-count">{totalPendingApprovals}</span>
              ) : null}
            </button>
          ) : sidebarMode === "spaces" ? (
            <button
              type="button"
              className="zaki-sidebar-v2-icon"
              onClick={openCreateSpaceFlow}
              aria-label={t("sidebar.actions.createSpace")}
            >
              <AddIcon color="currentColor" />
            </button>
          ) : null}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 mb-4 pr-1">
          <button
            type="button"
            onClick={openAboutView}
          >
            <LogoArabicRed />
          </button>
          <button
            className="size-10 shrink-0 rounded-zaki-md border border-transparent hover:border-zaki-subtle hover:bg-zaki-hover dark:hover:bg-zaki-dark-hover transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
            onClick={() => setCollapsed(true)}
            type="button"
            aria-label="Collapse sidebar"
          >
            <SideBarIcon />
          </button>
        </div>
      )}

      {/* Search */}
      {(!contextOnly || sidebarMode === "spaces") && (
        <div className="zaki-sidebar-v2-search bg-zaki-hover rounded-[10px] flex items-center p-2.5 gap-2 mb-2">
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
      )}
      
      {/* Mode Switch */}
      {!contextOnly ? (
        <SidebarModeSwitch
          sidebarMode={sidebarMode}
          onSelectZaki={() => {
            openHomeView();
          }}
          onSelectSpaces={() => {
            goToSpaces();
          }}
          isRtl={!!isRtl}
          onOpenControls={() => {
            requestAgentControls(totalPendingApprovals > 0 ? "approvals" : "controls");
          }}
          controlBadgeCount={totalPendingApprovals}
          onOpenSettings={() => openSettingsSection()}
          onOpenCron={() => requestAgentControls("cron")}
          onOpenSecrets={() => openSettingsSection("settings-secrets")}
          onOpenDiagnostics={() => openSettingsSection("settings-developer-access")}
        />
      ) : sidebarMode === "zaki" ? (
        <div className="zaki-sidebar-v2-action-row" aria-label={t("sidebar.context.agentActions", { defaultValue: "Agent actions" })}>
          <button type="button" onClick={() => openSettingsSection()}>
            {t("zakiControls.sidebarMenu.settings")}
          </button>
        </div>
      ) : null}

      {/* Divider */}
      {!contextOnly && <div className="h-px bg-zaki-sunken w-full mb-5" />}

      {/* Space Section */}
      <div className="flex-1 overflow-y-auto zaki-scrollbar-fade">
        {sidebarMode === "zaki" ? (
          <ZakiSessionList
            sessions={zakiThreadSessions}
            isLoading={zakiSessionsLoading}
            isError={zakiSessionsError}
            activeSessionKey={activeSessionKey}
            onSelectSession={(sessionKey) => {
              const threadSlug = extractThreadSlugFromSessionKey(sessionKey);
              if (!threadSlug) return;
              goToThread(ZAKI_BOT_SPACE_ID, threadSlug, { zakiSessionKey: sessionKey });
            }}
            onDeleteSession={async (sessionKey, _label) => {
              // Confirmation surfaces inline in ZakiSessionList via the
              // app's InlineConfirm pattern; this callback only fires
              // after the user confirms.
              void _label;
              try {
                const { response } = await deleteAgentSession(sessionKey);
                if (!response.ok) throw new Error(`delete ${response.status}`);
                const normalizedDeletedKey = normalizeZakiSessionKey(sessionKey);
                queryClient.setQueryData(zakiSessionKeys.all, (previous: unknown) =>
                  Array.isArray(previous)
                    ? previous.filter(
                        (session) =>
                          normalizeZakiSessionKey(String(session?.session_key || "")) !==
                          normalizedDeletedKey,
                      )
                    : previous,
                );
                await queryClient.invalidateQueries({ queryKey: zakiSessionKeys.all });
                if (activeSessionKey === sessionKey) {
                  // Active session got nuked. Bounce to the ZAKI home so the
                  // user isn't stuck on a 404 thread.
                  goToZakiHome();
                  window.dispatchEvent(new Event("zaki:clear-thread"));
                }
                toast.success(
                  t("zakiControls.sessionList.deleteSuccess", {
                    defaultValue: "Session deleted.",
                  }),
                );
              } catch {
                toast.error(
                  t("zakiControls.sessionList.deleteError", {
                    defaultValue: "Couldn't delete the session. Try again.",
                  }),
                );
              }
            }}
            onCreateSession={() => {
              // Reset to the Zaki welcome view so the user gets a visibly
              // fresh dashboard. Keep the Zaki space active (not null) so
              // SSE narration and the thinking card keep routing correctly —
              // otherwise reasoning frames leak into the assistant reply.
              setExpandedSpace(ZAKI_BOT_SPACE_ID);
              setActiveItem(ZAKI_BOT_SPACE_ID);
              goToZakiHome();
              window.dispatchEvent(new Event("zaki:clear-thread"));
              window.dispatchEvent(new Event("zaki:close-mobile-sidebar"));
              toast.success("New session started");
            }}
            onRetry={() => {
              void refetchZakiSessions();
            }}
            isRtl={!!isRtl}
          />
        ) : sidebarMode === "learning" ? (
          <div className="flex flex-col gap-1">
            {LEARNING_SUBNAV.map((item) => {
              const Icon = item.icon;
              const active = activeLearningView === item.view;
              return (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => {
                    navigate(`/learn?view=${item.view}`);
                    window.dispatchEvent(new Event("zaki:close-mobile-sidebar"));
                  }}
                  className={cn(
                    "relative flex w-full items-center gap-2 rounded-lg p-1.5 text-sm font-medium transition-colors",
                    isRtl ? "flex-row-reverse text-right" : "text-left",
                    active
                      ? "bg-zaki-hover text-zaki-primary"
                      : "text-zaki-secondary hover:bg-zaki-hover hover:text-zaki-primary"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {active && (
                    <div
                      className={cn(
                        "absolute top-1/2 h-[60%] w-[3px] -translate-y-1/2 rounded-r-sm bg-zaki-brand",
                        isRtl ? "right-0 rounded-l-sm rounded-r-none" : "left-0"
                      )}
                    />
                  )}
                  <span className="flex size-5 items-center justify-center">
                    <Icon className="size-4 text-zaki-muted" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        ) : sidebarMode === "brain" ? (
          <div className="zaki-sidebar-v2-static">
            <button type="button" onClick={() => navigate("/brain")}>
              <Brain className="size-4" />
              <span>{t("sidebar.brain")}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMemorySearchQuery("");
                setMemoryOpen(true);
              }}
            >
              <Database className="size-4" />
              <span>{t("sidebar.profile.memory")}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/settings")}
            >
              <Settings className="size-4" />
              <span>{t("sidebar.profile.settings")}</span>
            </button>
          </div>
        ) : sidebarMode === "hire" ? (
          <div className="flex flex-col gap-1">
            {HIRE_SUBNAV.map((item) => {
              const Icon = item.icon;
              const active = activeHireView === item.view;
              return (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => {
                    navigate(`/hire?view=${item.view}`);
                    window.dispatchEvent(new Event("zaki:close-mobile-sidebar"));
                  }}
                  className={cn(
                    "relative flex w-full items-center gap-2 rounded-lg p-1.5 text-sm font-medium transition-colors",
                    isRtl ? "flex-row-reverse text-right" : "text-left",
                    active
                      ? "bg-zaki-hover text-zaki-primary"
                      : "text-zaki-secondary hover:bg-zaki-hover hover:text-zaki-primary"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {active && (
                    <div
                      className={cn(
                        "absolute top-1/2 h-[60%] w-[3px] -translate-y-1/2 rounded-r-sm bg-zaki-brand",
                        isRtl ? "right-0 rounded-l-sm rounded-r-none" : "left-0"
                      )}
                    />
                  )}
                  <span className="flex size-5 items-center justify-center">
                    <Icon className="size-4 text-zaki-muted" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <>
        <div className={cn("text-zaki-muted text-xs font-medium mb-2", isRtl ? "pr-1.5 text-right" : "pl-1.5")}>{t("sidebar.section.space")}</div>
        {spacesLoading && (
          <div className="mb-3">
            <SkeletonSpaceList />
          </div>
        )}
        {spacesError && (
          <div className={cn("text-xs text-zaki-brand mb-3", isRtl ? "pr-1.5 text-right" : "pl-1.5")}>{spacesError}</div>
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
              <AddIcon color="currentColor" />
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
                      className="size-7 rounded-md p-0 flex items-center justify-center opacity-100 transition hover:bg-zaki-hover focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2 md:opacity-0 md:group-hover:opacity-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        openSettingsSection();
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
                <div className={cn("flex flex-col gap-1 mt-1", isRtl ? "pr-6" : "pl-6")}>
                  {space.threads.map((thread) => (
                    <div key={thread.id} className="relative group">
                      {confirmDelete?.type === "thread" && confirmDelete.id === thread.id ? (
                        <div className={cn("px-2 py-1.5", isRtl && "text-right")}>
                          <InlineConfirm
                            label={`Delete "${thread.label}"?`}
                            onConfirm={() => {
                              performDelete("thread", thread.id);
                              setConfirmDelete(null);
                            }}
                            onCancel={() => setConfirmDelete(null)}
                          />
                        </div>
                      ) : (
                      <button
                        className={cn(
                          "zaki-thread-item w-full text-left text-zaki-secondary text-sm font-medium py-1.5 px-2 rounded-lg",
                          isRtl && "text-right",
                          isActive(thread.id) ? "zaki-nav-active" : ""
                        )}
                        title={thread.label}
                        onClick={() => {
                          setExpandedSpace(space.id);
                          setActiveItem(thread.id);
                          goToThread(space.id, thread.id);
                        }}
                        type="button"
                      >
                        <span title={thread.label}>{thread.label}</span>
                      </button>
                      )}
                      <button
                        type="button"
                        className={cn(
                          "absolute top-1/2 -translate-y-1/2 size-6 rounded-md p-0 flex items-center justify-center opacity-100 transition hover:bg-zaki-hover focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2 md:opacity-0 md:group-hover:opacity-100",
                          isRtl ? "left-0" : "right-0"
                        )}
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
                          className={cn(
                            "absolute top-8 w-36 rounded-zaki-md border border-zaki-subtle bg-white shadow-[0px_12px_24px_rgba(15,15,15,0.12)] p-1 z-20",
                            isRtl ? "left-0" : "right-0"
                          )}
                          role="menu"
                          data-menu
                        >
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-zaki-primary hover:bg-zaki-hover"
                            onClick={() => togglePinned("thread", thread.id)}
                          >
                            <Pin className="size-3.5 text-zaki-muted" />
                            {thread.pinned ? "Unpin" : "Pin"}
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
                    className={cn(
                      "flex items-center gap-2 p-1.5 rounded-lg transition-colors group hover:bg-zaki-hover",
                      isRtl ? "text-right flex-row-reverse" : "text-left"
                    )}
                    onClick={() => createThreadInSpace(space.id)}
                    type="button"
                    data-onboarding-id="sidebar-space-new-thread"
                    data-onboarding-space-id={space.id}
                  >
                    <div className="bg-zaki-elevated rounded-full size-5 flex items-center justify-center">
                      <AddIcon color="var(--v2-ink-3)" />
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
                        return <Icon className="size-4" style={{ color: space.color ?? DEFAULT_SPACE_SWATCH }} />;
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
                        className="size-7 rounded-md p-0 flex items-center justify-center opacity-100 transition hover:bg-zaki-hover focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2 md:opacity-0 md:group-hover:opacity-100"
                        onClick={() => {
                          setSpaceSettingsTarget(space);
                          setSpaceNameDraft(space.title ?? "");
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
                <div className={cn("flex flex-col gap-1 mt-1", isRtl ? "pr-6" : "pl-6")}>
                  {space.threads.map((thread) => (
                    <div key={thread.id} className="relative group">
                      {confirmDelete?.type === "thread" && confirmDelete.id === thread.id ? (
                        <div className={cn("px-2 py-1.5", isRtl && "text-right")}>
                          <InlineConfirm
                            label={`Delete "${thread.label}"?`}
                            onConfirm={() => {
                              performDelete("thread", thread.id);
                              setConfirmDelete(null);
                            }}
                            onCancel={() => setConfirmDelete(null)}
                          />
                        </div>
                      ) : (
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
                          <span title={thread.label}>{thread.label}</span>
                        )}
                      </button>
                      )}
                      <button
                        type="button"
                        className={cn(
                          "absolute top-1/2 -translate-y-1/2 size-6 rounded-md p-0 flex items-center justify-center opacity-100 transition hover:bg-zaki-hover focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2 md:opacity-0 md:group-hover:opacity-100",
                          isRtl ? "left-0" : "right-0"
                        )}
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
                          className={cn(
                            "absolute top-8 w-36 rounded-zaki-md border border-zaki-subtle bg-white shadow-[0px_12px_24px_rgba(15,15,15,0.12)] p-1 z-20",
                            isRtl ? "left-0" : "right-0"
                          )}
                          role="menu"
                          data-menu
                        >
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-zaki-primary hover:bg-zaki-hover"
                            onClick={() => togglePinned("thread", thread.id)}
                          >
                            <Pin className="size-3.5 text-zaki-muted" />
                            {thread.pinned ? "Unpin" : "Pin"}
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
                    className={cn(
                      "flex items-center gap-2 p-1.5 rounded-lg transition-colors group hover:bg-zaki-hover",
                      isRtl ? "text-right flex-row-reverse" : "text-left"
                    )}
                    onClick={() => createThreadInSpace(space.id)}
                    type="button"
                    data-onboarding-id="sidebar-space-new-thread"
                    data-onboarding-space-id={space.id}
                  >
                    <div className="bg-zaki-elevated rounded-full size-5 flex items-center justify-center">
                      <AddIcon color="var(--v2-ink-3)" />
                    </div>
                    <span className="text-zaki-muted text-sm font-medium">{t("sidebar.actions.newChat")}</span>
                  </button>
                </div>
              )}
            </div>
          ))}

        </div>
          </>
        )}
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
	                isPremium ? "text-zaki-success" : "text-zaki-muted"
	              )}
	            >
	              {planDisplay}
	            </div>
          </div>
        </button>
        {profileMenuOpen && (
		          <div
		            className={cn(
		              "absolute bottom-14 w-[240px] rounded-zaki-lg border border-zaki-subtle bg-zaki-raised p-1 z-20",
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
	                isPremium ? "bg-zaki-success text-zaki-success" : "bg-zaki-sunken text-zaki-muted"
	              )}>
	                {planLabel}
	              </span>
	            </div>
	            <div className="h-px bg-zaki-sunken my-1" />
	            <Link
	              className={cn(profileMenuItemBase, "text-sm text-zaki-primary hover:bg-zaki-hover")}
	              to="/pricing?source=settings"
		              onClick={() => {
		                if (!isPremium) {
                    void trackProductEvent({
                      event: "upgrade_cta_clicked",
                      source: "settings",
                      language: isRtl ? "ar" : "en",
                      plan: "personal",
                      interval: "monthly",
                    }).catch(() => {
                      // Best-effort telemetry only.
                    });
                  }
                  setProfileMenuOpen(false);
		              }}
	            >
	              <Sparkles className="size-4 text-zaki-muted" />
	              {activeViaAccessCode
                  ? t("settingsModal.plan.manageAccess")
                  : hasSubscription
                  ? t("sidebar.profile.managePlan")
                  : t("sidebar.profile.upgradePlan")}
		            </Link>
		            <button
	              className={cn(profileMenuItemBase, "text-sm text-zaki-primary hover:bg-zaki-hover")}
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
	              className={cn(profileMenuItemBase, "text-sm text-zaki-primary hover:bg-zaki-hover")}
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
                  className={cn(profileMenuItemBase, "text-sm text-zaki-primary hover:bg-zaki-hover")}
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    requestAgentControls(totalPendingApprovals > 0 ? "approvals" : "controls");
                  }}
              data-testid="profile-menu-power-user"
                >
                  <ShieldCheck className="size-4 text-zaki-muted" />
                  {t("zakiControls.common.controls")}
                </button>
	            <button
	              className={cn(profileMenuItemBase, "text-sm text-zaki-primary hover:bg-zaki-hover")}
              type="button"
              onClick={() => {
                setProfileMenuOpen(false);
                navigate("/settings");
                window.dispatchEvent(new Event("zaki:onboarding-settings-opened"));
              }}
              data-onboarding-id="profile-menu-settings"
	            >
	              <Settings className="size-4 text-zaki-muted" />
	              {t("sidebar.profile.settings")}
		            </button>
	            <button
	              className={cn(profileMenuItemBase, "text-sm text-zaki-primary hover:bg-zaki-hover")}
	              type="button"
              onClick={() => {
                setProfileMenuOpen(false);
                navigate("/settings#settings-account");
	              }}
	            >
	              <Globe className="size-4 text-zaki-muted" />
	              {t("sidebar.profile.language")}
		            </button>
	            <button
	              className={cn(profileMenuItemBase, "text-sm text-zaki-primary hover:bg-zaki-hover")}
	              type="button"
              onClick={() => {
                setProfileMenuOpen(false);
                // Reset all stages to pending so the staged tour replays
                // from the welcome card. ChatArea listens for this and
                // clears localStorage. Then navigate the user to the
                // ZAKI home where the hero card lives — otherwise the
                // reset is invisible until they happen to come back.
                window.dispatchEvent(new Event("zaki:reset-onboarding"));
                setExpandedSpace(ZAKI_BOT_SPACE_ID);
                setActiveItem(ZAKI_BOT_SPACE_ID);
                goToZakiHome();
                toast.success(
                  t("sidebar.profile.howToUseReset", {
                    defaultValue: "Restarting the tour.",
                  }),
                );
              }}
              data-onboarding-id="profile-menu-how-to-use"
	            >
	              <HelpCircle className="size-4 text-zaki-muted" />
	              {t("sidebar.profile.howToUse")}
	            </button>
	            <button
	              className={cn(profileMenuItemBase, "text-sm text-zaki-primary hover:bg-zaki-hover")}
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
	              className={cn(profileMenuItemBase, "text-sm text-zaki-brand hover:bg-zaki-error")}
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
      {confirmDelete?.type === "space" && (
        <TypeToConfirmDialog
          isOpen={true}
          title="Delete space"
          body={`Deleting this space will delete the chat and content permanently. There is no way to retrieve the content of the deleted chats in this space after deletion.`}
          confirmPhrase={confirmDelete.label}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            performDelete(confirmDelete.type, confirmDelete.id);
            setConfirmDelete(null);
          }}
        />
      )}
      {memoryOpen && user?.username && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/60 backdrop-blur-[2px]">
          <div
            className="absolute inset-0"
            onClick={() => {
              setMemoryOpen(false);
              setMemorySearchQuery("");
              setMemoryInitialTab("memories");
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-zaki-subtle dark:border-zaki-dark bg-[linear-gradient(135deg,#fff8f0_0%,#f3e7d9_100%)] dark:bg-[linear-gradient(140deg,#1a1714_0%,#141210_58%,#0c0a09_100%)]">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-[linear-gradient(135deg,#E56A54_0%,#219171_100%)] flex items-center justify-center">
                  <Brain className="size-5 text-white" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-zaki-primary dark:text-zaki-dark-primary">{t("sidebar.memory.title")}</div>
                  <div className="text-xs text-zaki-disabled dark:text-zaki-dark-muted">{t("sidebar.memory.subtitle")}</div>
                </div>
              </div>
              <button
                type="button"
                className="zaki-icon-btn size-9"
                onClick={() => {
                  setMemoryOpen(false);
                  setMemorySearchQuery("");
                  setMemoryInitialTab("memories");
                }}
                aria-label={t("sidebar.memory.closeAria")}
              >
                <span className="block text-lg leading-none">×</span>
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto px-6 py-6 bg-zaki-base/60">
              <MemoryViewer
                userId={user.username}
                initialSearchQuery={memorySearchQuery}
                initialTab={memoryInitialTab}
              />
            </div>
          </div>
        </div>
      )}
        </>
      )}
      <SpaceSettingsSheet
        isOpen={spaceSettingsOpen}
        space={spaceSettingsTarget}
        nameDraft={spaceNameDraft}
        onNameChange={setSpaceNameDraft}
        onClose={() => {
          setSpaceSettingsOpen(false);
          setSpaceSettingsTarget(null);
        }}
        onSave={() => {
          if (!spaceSettingsTarget) return;
          const trimmedName = spaceNameDraft.trim();
          if (!trimmedName) return;
          window.dispatchEvent(
            new CustomEvent("zaki:update-space", {
              detail: { id: spaceSettingsTarget.id, name: trimmedName },
            })
          );
          setSpaceSettingsOpen(false);
          setSpaceSettingsTarget(null);
        }}
        onEditInstructions={() => {
          if (!spaceSettingsTarget) return;
          setSpaceSettingsOpen(false);
          setSpaceSettingsTarget(null);
          window.dispatchEvent(
            new CustomEvent("zaki:edit-space-instructions", {
              detail: { id: spaceSettingsTarget.id },
            })
          );
        }}
        onUploadFiles={() => {
          if (!spaceSettingsTarget) return;
          setSpaceSettingsOpen(false);
          setSpaceSettingsTarget(null);
          window.dispatchEvent(
            new CustomEvent("zaki:upload-space-files", {
              detail: { id: spaceSettingsTarget.id },
            })
          );
        }}
        onRemoveFile={(file) => {
          if (!spaceSettingsTarget) return;
          removeWorkspaceDocument(spaceSettingsTarget.id, file);
        }}
        onDelete={() => {
          if (!spaceSettingsTarget) return;
          setSpaceSettingsOpen(false);
          setSpaceSettingsTarget(null);
          setConfirmDelete({
            type: "space",
            id: spaceSettingsTarget.id,
            label: spaceSettingsTarget.title || spaceSettingsTarget.id,
          });
        }}
        removingDocumentKey={removingDocumentKey}
        fileStatusTone={fileStatusTone}
      />
    </nav>
  );
}
