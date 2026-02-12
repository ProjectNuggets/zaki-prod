import { 
  LogoArabicOrange, SideBarIcon, SearchIcon, AddIcon, 
  EditIcon, BookIcon, FolderIcon, ChevronDownIcon, CenterLogo
} from "./icons";
import { MoreHorizontal, Pin, Pencil, Trash2, Folder, Briefcase, BookOpen, GraduationCap, Sparkles, Palette, FileText, Moon, Settings, Globe, HelpCircle, LogOut, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuthStore, useUIStore, useSpacesStore } from "@/stores";
import { useNavigation } from "@/hooks/useNavigation";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { SkeletonSpaceList } from "./ui/skeleton";
import { toast } from "sonner";
import type { Space, Thread } from "@/types";
import { MemoryViewer } from "./memory/MemoryViewer";
import { useSpaces } from "@/queries/useSpaces";

// Sidebar uses threads as required array
type SidebarSpace = Omit<Space, 'threads'> & { threads: Thread[] };

export function Sidebar() {
  // Get state from stores
  const { user, logout } = useAuthStore();
  const { themePreference, resolvedTheme, setThemePreference, sidebarCollapsed: collapsed, setSidebarCollapsed } = useUIStore();
  const { setSpaces: setGlobalSpaces } = useSpacesStore();
  const { goToThread } = useNavigation();
  const setCollapsed = setSidebarCollapsed;
  const [expandedSpace, setExpandedSpace] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState("new-space");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  // TODO: Fetch actual plan from user profile
  const planLabel = "FREE" as "FREE" | "PRO";
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
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const isDark = resolvedTheme() === "dark";
  const [lastSynced, setLastSynced] = useState<Date>(new Date());
  
  // Focus trap refs for modals
  const settingsModalRef = useFocusTrap<HTMLDivElement>(settingsOpen);
  const spaceSettingsModalRef = useFocusTrap<HTMLDivElement>(spaceSettingsOpen);
  const profileEditModalRef = useFocusTrap<HTMLDivElement>(profileEditOpen);
  const deleteConfirmModalRef = useFocusTrap<HTMLDivElement>(!!confirmDelete);

  const isActive = (item: string) => activeItem === item;
  const isSpaceActive = (spaceId: string) => expandedSpace === spaceId;
  
  // Format relative time for "Last synced" badge
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins === 1) return "1 min ago";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    return "today";
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
  useEffect(() => {
    if (!displayName) {
      setDisplayName(user?.username?.trim() || "User");
    }
  }, [user?.username, displayName]);

  const userName = displayName.trim() || "User";
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

  useEffect(() => {
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
    const firstSpace = spacesData[0];
    if (firstSpace) {
      setExpandedSpace((prev) => prev ?? firstSpace.id);
    }
  }, [user, spacesData]);

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
    if (!settingsOpen) {
      return;
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [settingsOpen]);

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
        // DEBUG: Log full error details
        alert(`Delete failed: ${message}\n\nCheck console for details.\nSpace ID: ${id}`);
        return; // Don't update state on failure
      }
    }
    setOpenMenu(null);
  };

  const createSpace = async (
    name?: string,
    description?: string,
    instructions?: string,
    pinnedFiles?: { name: string; type: string; size: number }[]
  ) => {
    const trimmedName = name?.trim();
    if (!trimmedName) return;
    try {
      const response = await apiRequest("/zaki/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: trimmedName }),
      });
      if (!response.ok) {
        throw new Error("Failed to create workspace.");
      }
      const data = (await response.json()) as {
        workspace?: { slug: string; name: string; description?: string };
      };
      if (!data.workspace) {
        throw new Error("Workspace not returned.");
      }
      const newSpace: SidebarSpace = {
        id: data.workspace.slug,
        title: data.workspace.name,
        description: description ?? data.workspace.description ?? "Workspace",
        instructions: instructions ?? "",
        pinnedFiles: pinnedFiles ?? [],
        pinned: false,
        threads: [],
      };
      setSpaces((prev) => [...prev, newSpace]);
      setExpandedSpace(newSpace.id);
      setActiveItem(newSpace.id);
      window.dispatchEvent(new Event("zaki:clear-thread"));
    } catch (error) {
      setSpacesError("Unable to create a workspace. Check your permissions.");
    }
  };

  const createThreadInSpace = async (spaceId: string | null) => {
    if (!spaceId) {
      return;
    }
    try {
      const response = await apiRequest(`/workspace/${spaceId}/thread/new`, {
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
          space.id === spaceId
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
      setExpandedSpace(spaceId);
      setActiveItem(threadId);
      goToThread(spaceId, threadId);
    } catch (error) {
      setSpacesError("Unable to create a new chat.");
    }
  };

  const toggleSpace = (spaceId: string) => {
    setExpandedSpace((prev) => (prev === spaceId ? null : spaceId));
  };

  useEffect(() => {
    const handleCreateSpace = (event: Event) => {
      const detail = (event as CustomEvent<{
        name?: string;
        description?: string;
        instructions?: string;
        pinnedFiles?: { name: string; type: string; size: number }[];
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
        pinnedFiles?: { name: string; type: string; size: number }[];
        icon?: string;
        color?: string;
        description?: string;
      }>).detail;
      if (!detail?.id) return;
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
    window.addEventListener("zaki:create-space", handleCreateSpace);
    window.addEventListener("zaki:create-thread", handleCreateThread);
    window.addEventListener("zaki:update-space", handleUpdateSpace);
    window.addEventListener("zaki:delete-thread", handleDeleteThread);
    window.addEventListener("zaki:rename-thread", handleRenameThread);
    window.addEventListener("zaki:open-space-settings", handleOpenSpaceSettings);
    return () => {
      window.removeEventListener("zaki:create-space", handleCreateSpace);
      window.removeEventListener("zaki:create-thread", handleCreateThread);
      window.removeEventListener("zaki:update-space", handleUpdateSpace);
      window.removeEventListener("zaki:delete-thread", handleDeleteThread);
      window.removeEventListener("zaki:rename-thread", handleRenameThread);
      window.removeEventListener("zaki:open-space-settings", handleOpenSpaceSettings);
    };
  }, [spaces]);

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
              onClick={() => {
                setExpandedSpace("zaki");
                setActiveItem("zaki");
                window.dispatchEvent(new Event("zaki:clear-thread"));
                window.dispatchEvent(new Event("zaki:view-zaki-home"));
              }}
            >
              <LogoArabicOrange />
            </button>
            <button
              className="size-9 rounded-zaki-md border border-transparent hover:border-zaki-subtle hover:bg-zaki-hover dark:hover:bg-zaki-dark-hover transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
              onClick={() => setCollapsed(false)}
              type="button"
              title="Expand sidebar"
              aria-label="Expand sidebar"
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
              onClick={() => {
                setActiveItem("new-space");
                window.dispatchEvent(new Event("zaki:view-spaces"));
                window.dispatchEvent(new Event("zaki:open-create-space"));
              }}
              type="button"
              title="New space"
              aria-label="Create new space"
            >
              <AddIcon />
            </button>
            <button
              className={cn(
                "size-9 rounded-zaki-md transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2",
                isActive("spaces") ? "bg-zaki-hover" : "hover:bg-zaki-hover"
              )}
              onClick={() => {
                setActiveItem("spaces");
                window.dispatchEvent(new Event("zaki:view-spaces"));
              }}
              type="button"
              title="Spaces"
              aria-label="View spaces"
            >
              <EditIcon />
            </button>
            <button
              className={cn(
                "size-9 rounded-zaki-md transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2",
                isActive("library") ? "bg-zaki-hover" : "hover:bg-zaki-hover"
              )}
              onClick={() => {
                setActiveItem("library");
                window.dispatchEvent(new Event("zaki:view-library"));
              }}
              type="button"
              title="Library"
              aria-label="View library"
            >
              <BookIcon />
            </button>
            <button
              className={cn(
                "size-9 rounded-zaki-md transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2",
                isActive("search") ? "bg-zaki-hover" : "hover:bg-zaki-hover"
              )}
              onClick={() => setActiveItem("search")}
              type="button"
              title="Search"
              aria-label="Search"
            >
              <SearchIcon />
            </button>
          </div>

          <div className="mt-6 flex flex-col items-center gap-2">
            <button
              className={cn(
                "size-9 rounded-zaki-md transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2",
                isActive("research") ? "bg-zaki-hover" : "hover:bg-zaki-hover"
              )}
              onClick={() => {
                setExpandedSpace("research");
                setActiveItem("research");
              }}
              type="button"
              title="Research & Analysis"
              aria-label="Research and analysis"
            >
              <FolderIcon />
            </button>
            <button
              className="size-9 rounded-zaki-md flex items-center justify-center transition-colors bg-zaki-elevated hover:bg-zaki-active focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
              onClick={() => createThreadInSpace(expandedSpace ?? spaces[0]?.id ?? null)}
              type="button"
              title="New chat"
              aria-label="New chat"
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
          onClick={() => {
            setExpandedSpace("zaki");
            setActiveItem("zaki");
            window.dispatchEvent(new Event("zaki:clear-thread"));
            window.dispatchEvent(new Event("zaki:view-zaki-home"));
          }}
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
          placeholder="Search spaces"
          className="bg-transparent border-none outline-none text-zaki-muted placeholder-zaki text-sm w-full font-medium"
        />
      </div>
      
      {/* Last synced badge — trust signal */}
      <div className="flex items-center gap-1.5 text-2xs text-zaki-muted mb-4 pl-1">
        <span className="inline-block size-1.5 rounded-full bg-zaki-accent animate-pulse" />
        <span>Synced {formatRelativeTime(lastSynced)}</span>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 mb-5">
        <button
          className={cn(
            "flex items-center gap-2 p-1.5 rounded-lg transition-colors text-left group",
            isActive("new-space") ? "bg-zaki-hover" : "hover:bg-zaki-hover"
          )}
          onClick={() => {
            setActiveItem("new-space");
            window.dispatchEvent(new Event("zaki:view-spaces"));
            window.dispatchEvent(new Event("zaki:open-create-space"));
          }}
          type="button"
        >
          <div className="bg-zaki-brand-15 rounded-full size-5 flex items-center justify-center">
            <AddIcon />
          </div>
          <span className="text-zaki-brand text-sm font-medium">New space</span>
        </button>

        <button
          className={cn(
            "flex items-center gap-2 p-1.5 rounded-lg transition-colors text-left group",
            isActive("spaces") ? "bg-zaki-hover" : "hover:bg-zaki-hover"
          )}
          onClick={() => {
            setActiveItem("spaces");
            window.dispatchEvent(new Event("zaki:view-spaces"));
          }}
          type="button"
        >
          <div className="size-5 flex items-center justify-center">
             <EditIcon />
          </div>
          <span className="text-zaki-secondary text-sm font-medium">Spaces</span>
        </button>

        <button
          className={cn(
            "flex items-center gap-2 p-1.5 rounded-lg transition-colors text-left group",
            isActive("library") ? "bg-zaki-hover" : "hover:bg-zaki-hover"
          )}
          onClick={() => {
            setActiveItem("library");
            window.dispatchEvent(new Event("zaki:view-library"));
          }}
          type="button"
        >
          <div className="size-5 flex items-center justify-center">
             <BookIcon />
          </div>
          <span className="text-zaki-secondary text-sm font-medium">Library</span>
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-zaki-sunken w-full mb-5" />

      {/* Space Section */}
      <div className="flex-1 overflow-y-auto bg-[#FDF6EE] dark:bg-[#0f0b08] zaki-scrollbar-fade">
        <div className="text-zaki-muted text-xs font-medium mb-2 pl-1.5">Space</div>
        {spacesLoading && (
          <div className="mb-3">
            <SkeletonSpaceList />
          </div>
        )}
        {spacesError && (
          <div className="text-xs text-zaki-brand mb-3 pl-1.5">{spacesError}</div>
        )}
        
        {/* Empty State - No Spaces */}
        {!spacesLoading && spaces.filter((s) => !s.fixed).length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-zaki-hover flex items-center justify-center mb-3">
              <Folder className="w-6 h-6 text-zaki-muted" />
            </div>
            <p className="text-sm text-zaki-primary font-medium mb-1">No spaces yet</p>
            <p className="text-xs text-zaki-secondary mb-4">Create your first space to get started</p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("zaki:create-space"))}
              className="flex items-center gap-2 px-3 py-2 bg-zaki-brand text-white text-sm font-medium rounded-zaki-xl hover:bg-zaki-brand-hover transition-colors"
              type="button"
            >
              <AddIcon className="w-4 h-4" />
              Create Space
            </button>
          </div>
        )}
        
        <div className="flex flex-col gap-1">
          {spaces.filter((space) => space.fixed).map((space) => (
            <div key={space.id}>
              <div className="relative group">
                <button
                  onClick={() => {
                    setExpandedSpace(space.id);
                    setActiveItem(space.id);
                    window.dispatchEvent(new CustomEvent("zaki:view-space", { detail: { id: space.id } }));
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 p-1.5 rounded-lg transition-colors text-left group",
                    isSpaceActive(space.id) ? "bg-zaki-hover" : "hover:bg-zaki-hover"
                  )}
                  type="button"
                >
                  <div className="size-5 flex items-center justify-center">
                    <div className="scale-[0.6]">
                      <CenterLogo />
                    </div>
                  </div>
                  <span className="text-zaki-secondary text-sm font-medium flex-1">{space.title}</span>
                  {space.threads.length > 0 && (
                    <span
                      className={cn(
                        "inline-flex transition-transform",
                        isSpaceActive(space.id) ? "rotate-0" : "-rotate-90"
                      )}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleSpace(space.id);
                      }}
                      role="button"
                    >
                      <ChevronDownIcon />
                    </span>
                  )}
                </button>
              </div>
              {isSpaceActive(space.id) && (
                <div className="pl-6 flex flex-col gap-1 mt-1">
                  {space.threads.map((thread) => (
                    <div key={thread.id} className="relative group">
                      <button
                        className={cn(
                          "zaki-thread-item w-full text-left text-zaki-secondary text-sm font-medium py-1.5 px-2 rounded-lg",
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
                    </div>
                  ))}
                  <button
                    className="flex items-center gap-2 p-1.5 rounded-lg transition-colors text-left group hover:bg-zaki-hover"
                    onClick={() => createThreadInSpace(space.id)}
                    type="button"
                  >
                    <div className="bg-zaki-elevated rounded-full size-5 flex items-center justify-center">
                      <AddIcon color="#88735A" />
                    </div>
                    <span className="text-zaki-muted text-sm font-medium">New chat</span>
                  </button>
                </div>
              )}
            </div>
          ))}
          {spaces.filter((space) => !space.fixed).map((space) => (
            <div key={space.id}>
              <div className="relative group">
                <button
                  onClick={() => {
                    setExpandedSpace(space.id);
                    setActiveItem(space.id);
                    window.dispatchEvent(new CustomEvent("zaki:view-space", { detail: { id: space.id } }));
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 p-1.5 rounded-lg transition-colors text-left group",
                    isSpaceActive(space.id) ? "bg-zaki-hover" : "hover:bg-zaki-hover"
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
                    <span className="text-zaki-secondary text-sm font-medium flex-1">{space.title}</span>
                  )}
                  <div className="flex items-center gap-1">
                {!space.fixed && (
                  <button
                    type="button"
                    className="size-7 rounded-md p-0 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-zaki-hover transition focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
                    onClick={(event) => {
                      event.stopPropagation();
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
                      <span
                        className={cn(
                          "inline-flex transition-transform",
                          isSpaceActive(space.id) ? "rotate-0" : "-rotate-90"
                        )}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleSpace(space.id);
                        }}
                        role="button"
                      >
                        <ChevronDownIcon />
                      </span>
                    )}
                  </div>
                </button>
              </div>

              {isSpaceActive(space.id) && (
                <div className="pl-6 flex flex-col gap-1 mt-1">
                  {space.threads.map((thread) => (
                    <div key={thread.id} className="relative group">
                      <button
                        className={cn(
                          "zaki-thread-item w-full text-left text-zaki-secondary text-sm font-medium py-1.5 px-2 rounded-lg",
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
                  >
                    <div className="bg-zaki-elevated rounded-full size-5 flex items-center justify-center">
                      <AddIcon color="#88735A" />
                    </div>
                    <span className="text-zaki-muted text-sm font-medium">New chat</span>
                  </button>
                </div>
              )}
            </div>
          ))}

        </div>
      </div>

      {/* Footer Profile */}
      <div className="mt-4 pt-3 border-t border-zaki-subtle relative">
        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-zaki-hover"
          )}
          onClick={() => {
            setActiveItem("profile");
            setProfileMenuOpen((open) => !open);
          }}
          role="button"
          tabIndex={0}
          data-profile-button
        >
          <div className="size-10 bg-zaki-elevated rounded-full flex items-center justify-center text-zaki-primary font-medium text-base overflow-hidden">
            {profileImageUrl ? (
              <img src={profileImageUrl} alt={userName} className="h-full w-full object-cover" />
            ) : (
              userInitials
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-zaki-primary text-sm font-medium truncate">{userName}</div>
            <div
              className={cn(
                "text-xs font-semibold uppercase tracking-wider",
                planLabel === "PRO" ? "text-zaki-success" : "text-zaki-success"
              )}
            >
              {planLabel === "PRO" ? "Plus" : "Free"}
            </div>
          </div>
        </div>
        {profileMenuOpen && (
          <div
            className="absolute bottom-14 right-0 w-[230px] rounded-zaki-lg border border-zaki-subtle bg-white shadow-[0px_14px_30px_rgba(15,15,15,0.12)] p-1 z-20"
            role="menu"
            data-profile-menu
          >
            <button
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-zaki-md hover:bg-zaki-hover transition-colors"
              type="button"
              onClick={() => {
                setProfileMenuOpen(false);
                setProfileEditOpen(true);
              }}
            >
              <div className="size-7 rounded-full bg-zaki-elevated flex items-center justify-center text-xs font-medium text-zaki-primary overflow-hidden">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt={userName} className="h-full w-full object-cover" />
                ) : (
                  userInitials
                )}
              </div>
              <div className="min-w-0 text-left">
                <div className="text-sm text-zaki-primary font-medium truncate">{userName}</div>
                <div className="text-xs text-zaki-disabled truncate">Manage profile</div>
              </div>
              <span className={cn(
                "ml-auto text-2xs font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider",
                planLabel === "PRO" ? "bg-zaki-success text-zaki-success" : "bg-zaki-sunken text-zaki-success"
              )}>
                {planLabel}
              </span>
            </button>
            <div className="h-px bg-zaki-sunken my-1" />
            <button
              className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors"
              type="button"
              onClick={() => setThemePreference(isDark ? "light" : "dark")}
            >
              <Moon className="size-4 text-zaki-muted" />
              Dark mode
              <span className="ml-auto text-zaki-disabled text-xs">{isDark ? "On" : "Off"}</span>
            </button>
            <button
              className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors"
              type="button"
              onClick={() => {
                setProfileMenuOpen(false);
                setMemoryOpen(true);
              }}
            >
              <Brain className="size-4 text-zaki-muted" />
              Memory
            </button>
            <button
              className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors"
              type="button"
              onClick={() => {
                setProfileMenuOpen(false);
                setSettingsOpen(true);
              }}
            >
              <Settings className="size-4 text-zaki-muted" />
              Settings
            </button>
            <button className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors" type="button">
              <Globe className="size-4 text-zaki-muted" />
              Language
            </button>
            <button className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors" type="button">
              <HelpCircle className="size-4 text-zaki-muted" />
              Need help?
            </button>
            <div className="h-px bg-zaki-sunken my-1" />
            <button
              className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-brand hover:bg-zaki-error transition-colors"
              type="button"
              onClick={() => {
                setProfileMenuOpen(false);
                logout();
              }}
            >
              <LogOut className="size-4" />
              Log out
            </button>
            <div className="px-2.5 pt-1 text-2xs text-zaki-disabled">v1.5.69 · Terms & Conditions</div>
          </div>
        )}
      </div>
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div
            className="absolute inset-0"
            onClick={() => setSettingsOpen(false)}
            role="button"
            aria-label="Close settings"
          />
          <div ref={settingsModalRef} className="relative w-[620px] max-w-[calc(100%-2rem)] rounded-[28px] border border-zaki-subtle bg-white dark:bg-zaki-dark-card dark:border-zaki-dark shadow-[0px_30px_80px_rgba(15,15,15,0.18)]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zaki-subtle dark:border-zaki-dark bg-zaki-base/80 dark:bg-zaki-dark-elevated">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card flex items-center justify-center text-zaki-brand text-sm font-semibold">
                  S
                </div>
                <div>
                  <div className="text-lg font-semibold text-zaki-primary dark:text-zaki-dark-primary">Settings</div>
                  <div className="text-xs text-zaki-muted dark:text-zaki-dark-muted">Profile, preferences, and data controls</div>
                </div>
              </div>
              <button
                type="button"
                className="size-9 rounded-full border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card text-zaki-secondary dark:text-zaki-dark-muted hover:bg-zaki-hover dark:hover:bg-zaki-dark-hover transition-colors"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close settings"
              >
                <span className="block text-lg leading-none">×</span>
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zaki-muted dark:text-zaki-dark-muted">Profile</div>
                <div className="mt-3 grid gap-3 rounded-2xl border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-elevated px-4 py-4 shadow-[0px_10px_24px_rgba(15,15,15,0.04)]">
                  <label className="flex flex-col gap-1 text-xs text-zaki-muted dark:text-zaki-dark-muted">
                    Display name
                    <input
                      className="rounded-zaki-md border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card px-3 py-2 text-sm text-zaki-primary dark:text-zaki-dark-primary outline-none focus:border-zaki-focus"
                      defaultValue={userName}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-zaki-muted dark:text-zaki-dark-muted">
                    Email
                    <input
                      className="rounded-zaki-md border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card px-3 py-2 text-sm text-zaki-primary dark:text-zaki-dark-primary outline-none focus:border-zaki-focus"
                      defaultValue={userName}
                    />
                  </label>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zaki-muted dark:text-zaki-dark-muted">Preferences</div>
                <div className="mt-3 grid gap-3 rounded-2xl border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-elevated px-4 py-4 shadow-[0px_10px_24px_rgba(15,15,15,0.04)]">
                  <label className="flex items-center justify-between rounded-zaki-lg border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card px-3 py-2 text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
                    Theme
                    <select
                      className="rounded-lg border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card px-2 py-1 text-sm text-zaki-primary dark:text-zaki-dark-primary"
                      value={themePreference}
                      onChange={(event) =>
                        setThemePreference(event.target.value as "light" | "dark" | "system")
                      }
                    >
                      <option value="light">Light</option>
                      <option value="system">System</option>
                      <option value="dark">Dark</option>
                    </select>
                  </label>
                  <label className="flex items-center justify-between rounded-zaki-lg border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card px-3 py-2 text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
                    Language
                    <select className="rounded-lg border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card px-2 py-1 text-sm text-zaki-primary dark:text-zaki-dark-primary">
                      <option>English</option>
                      <option>Arabic</option>
                    </select>
                  </label>
                  <label className="flex items-center justify-between rounded-zaki-lg border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card px-3 py-2 text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
                    Auto-generate titles
                    <input type="checkbox" className="size-4 accent-zaki" defaultChecked />
                  </label>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zaki-muted dark:text-zaki-dark-muted">Data & storage</div>
                <div className="mt-3 grid gap-3 rounded-2xl border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-elevated px-4 py-4 shadow-[0px_10px_24px_rgba(15,15,15,0.04)]">
                  <button className="w-full rounded-zaki-lg border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card px-3 py-2 text-sm text-zaki-secondary dark:text-zaki-dark-subtle hover:bg-zaki-hover dark:hover:bg-zaki-dark-hover transition-colors" type="button">
                    Clear local cache
                  </button>
                  <button className="w-full rounded-zaki-lg border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card px-3 py-2 text-sm text-zaki-secondary dark:text-zaki-dark-subtle hover:bg-zaki-hover dark:hover:bg-zaki-dark-hover transition-colors" type="button">
                    Manage attachments
                  </button>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zaki-muted dark:text-zaki-dark-muted">Privacy</div>
                <div className="mt-3 grid gap-3 rounded-2xl border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-elevated px-4 py-4 shadow-[0px_10px_24px_rgba(15,15,15,0.04)]">
                  <label className="flex items-center justify-between rounded-zaki-lg border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card px-3 py-2 text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
                    Allow chat analytics
                    <input type="checkbox" className="size-4 accent-zaki" />
                  </label>
                  <label className="flex items-center justify-between rounded-zaki-lg border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card px-3 py-2 text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
                    Save chat history
                    <input type="checkbox" className="size-4 accent-zaki" defaultChecked />
                  </label>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-zaki-subtle dark:border-zaki-dark bg-zaki-base/80 dark:bg-zaki-dark-elevated">
              <div className="text-xs text-zaki-muted dark:text-zaki-dark-muted">Changes apply immediately</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="zaki-btn zaki-btn-secondary"
                  onClick={() => setSettingsOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="zaki-btn bg-zaki-brand text-white hover:bg-zaki-brand-hover transition-colors"
                  onClick={() => setSettingsOpen(false)}
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {profileEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div
            className="absolute inset-0"
            onClick={() => setProfileEditOpen(false)}
            role="button"
            aria-label="Close profile editor"
          />
          <div ref={profileEditModalRef} className="relative w-[460px] max-w-[calc(100%-2rem)] rounded-zaki-2xl border border-zaki bg-white shadow-[0px_24px_60px_rgba(15,15,15,0.18)] px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-zaki-primary">Profile</div>
                <div className="text-xs text-zaki-disabled">Update your display name and photo</div>
              </div>
              <button
                type="button"
                className="size-11 md:size-8 rounded-full bg-zaki-elevated text-zaki-secondary hover:bg-zaki-active transition-colors"
                onClick={() => setProfileEditOpen(false)}
                aria-label="Close profile editor"
              >
                <span className="block text-lg leading-none">×</span>
              </button>
            </div>
            <div className="mt-5 flex items-center gap-4">
              <div className="size-16 rounded-full bg-zaki-elevated flex items-center justify-center text-zaki-primary font-semibold text-lg overflow-hidden">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt={userName} className="h-full w-full object-cover" />
                ) : (
                  userInitials
                )}
              </div>
              <label className="text-sm text-zaki-secondary cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const nextUrl = URL.createObjectURL(file);
                    setProfileImageUrl(nextUrl);
                    event.target.value = "";
                  }}
                />
                <span className="rounded-full border border-zaki-strong px-3 py-2 text-xs text-zaki-secondary hover:bg-zaki-hover transition-colors">
                  Upload photo
                </span>
              </label>
            </div>
            <div className="mt-5">
              <label className="flex flex-col gap-1 text-xs text-zaki-muted">
                Display name
                <input
                  className="rounded-zaki-md border border-zaki-strong px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </label>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                className="zaki-btn zaki-btn-secondary"
                onClick={() => setProfileEditOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="zaki-btn bg-zaki-secondary text-white hover:bg-zaki-secondary transition-colors"
                onClick={() => setProfileEditOpen(false)}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="absolute inset-0" onClick={() => setConfirmDelete(null)} role="button" aria-label="Close confirmation" />
          <div ref={deleteConfirmModalRef} className="relative w-[420px] max-w-[calc(100%-2rem)] rounded-zaki-2xl border border-zaki bg-white shadow-[0px_24px_60px_rgba(15,15,15,0.18)] px-6 py-5">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div
            className="absolute inset-0"
            onClick={() => setMemoryOpen(false)}
            role="button"
            aria-label="Close memory"
          />
          <div className="relative w-[720px] max-w-[calc(100%-2rem)] rounded-zaki-2xl border border-zaki bg-white shadow-[0px_24px_60px_rgba(15,15,15,0.18)]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zaki">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Brain className="size-5 text-white" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-zaki-primary">Your Memory</div>
                  <div className="text-xs text-zaki-disabled">What ZAKI remembers about you</div>
                </div>
              </div>
              <button
                type="button"
                className="size-11 md:size-8 rounded-full bg-zaki-elevated text-zaki-secondary hover:bg-zaki-active transition-colors"
                onClick={() => setMemoryOpen(false)}
                aria-label="Close memory"
              >
                <span className="block text-lg leading-none">×</span>
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto px-6 py-6">
              <MemoryViewer userId={user.username} />
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
            role="button"
            aria-label="Close space settings"
          />
          <div
            ref={spaceSettingsModalRef}
            className="relative w-[420px] max-w-[calc(100%-2rem)] rounded-zaki-2xl border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card shadow-[0px_24px_60px_rgba(15,15,15,0.18)]"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zaki-subtle dark:border-zaki-dark">
              <div>
                <div className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">Space settings</div>
                <div className="text-xs text-zaki-muted dark:text-zaki-dark-muted mt-1 truncate">
                  {spaceSettingsTarget.title}
                </div>
              </div>
              <button
                type="button"
                className="size-8 rounded-full border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card text-zaki-secondary dark:text-zaki-dark-muted hover:bg-zaki-hover dark:hover:bg-zaki-dark-hover transition-colors"
                onClick={() => {
                  setSpaceSettingsOpen(false);
                  setSpaceSettingsTarget(null);
                }}
                aria-label="Close space settings"
              >
                <span className="block text-lg leading-none">×</span>
              </button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-2xs uppercase tracking-[0.2em] text-zaki-muted">Description</label>
                <textarea
                  className="w-full rounded-zaki-lg border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-elevated px-3 py-2 text-sm text-zaki-secondary dark:text-zaki-dark-subtle outline-none focus-visible:ring-2 focus-visible:ring-zaki-brand"
                  rows={3}
                  maxLength={200}
                  value={spaceDescriptionDraft}
                  onChange={(event) => setSpaceDescriptionDraft(event.target.value)}
                  placeholder="Describe what this space is for…"
                />
                <div className="text-[10px] text-zaki-muted text-right">
                  {spaceDescriptionDraft.length}/200
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="text-2xs uppercase tracking-[0.2em] text-zaki-muted">Workspace tools</div>
                <button
                  type="button"
                  className="w-full rounded-zaki-lg border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-elevated px-3 py-2 text-left text-sm text-zaki-secondary dark:text-zaki-dark-subtle hover:bg-zaki-hover dark:hover:bg-zaki-dark-hover transition-colors"
                  onClick={() => {
                    setSpaceSettingsOpen(false);
                    window.dispatchEvent(
                      new CustomEvent("zaki:edit-space-instructions", { detail: { id: spaceSettingsTarget.id } })
                    );
                  }}
                >
                  Edit instructions
                </button>
                <button
                  type="button"
                  className="w-full rounded-zaki-lg border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-elevated px-3 py-2 text-left text-sm text-zaki-secondary dark:text-zaki-dark-subtle hover:bg-zaki-hover dark:hover:bg-zaki-dark-hover transition-colors"
                  onClick={() => {
                    setSpaceSettingsOpen(false);
                    window.dispatchEvent(
                      new CustomEvent("zaki:upload-space-files", { detail: { id: spaceSettingsTarget.id } })
                    );
                  }}
                >
                  Add project files
                </button>
              </div>
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
    </nav>
  );
}
