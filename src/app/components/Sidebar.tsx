import { 
  LogoArabicOrange, SideBarIcon, SearchIcon, AddIcon, 
  EditIcon, BookIcon, FolderIcon, ChevronDownIcon, CenterLogo
} from "./icons";
import { MoreHorizontal, Pin, Pencil, Trash2, Folder, Briefcase, BookOpen, GraduationCap, Sparkles, Palette, FileText, Moon, Settings, Globe, HelpCircle, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuthStore, useUIStore, useSpacesStore } from "@/stores";
import { useNavigation } from "@/hooks/useNavigation";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { SkeletonSpaceList } from "./ui/skeleton";
import type { Space, Thread } from "@/types";

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
  // TODO: Fetch actual plan from user profile
  const planLabel = "FREE" as "FREE" | "PRO";
  const [openMenu, setOpenMenu] = useState<{ type: "space" | "thread"; id: string } | null>(null);
  const [editingItem, setEditingItem] = useState<{ type: "space" | "thread"; id: string } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ type: "space" | "thread"; id: string; label: string } | null>(null);
  const [spaces, setSpaces] = useState<SidebarSpace[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [spacesError, setSpacesError] = useState("");
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const isDark = resolvedTheme() === "dark";
  
  // Focus trap refs for modals
  const settingsModalRef = useFocusTrap<HTMLDivElement>(settingsOpen);
  const profileEditModalRef = useFocusTrap<HTMLDivElement>(profileEditOpen);
  const deleteConfirmModalRef = useFocusTrap<HTMLDivElement>(!!confirmDelete);

  const isActive = (item: string) => activeItem === item;
  const isSpaceActive = (spaceId: string) => expandedSpace === spaceId;
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
    let isMounted = true;
    const loadWorkspaces = async () => {
      setSpacesLoading(true);
      setSpacesError("");
      try {
        const response = await apiRequest("/workspaces");
        if (!response.ok) {
          throw new Error("Failed to load workspaces.");
        }
        const data = (await response.json()) as {
          workspaces?: { slug: string; name: string; description?: string }[];
        };
        const workspaces = data.workspaces ?? [];
        const workspaceSpaces = await Promise.all(
          workspaces.map(async (workspace, index) => {
            let threads: Thread[] = [];
            try {
              const threadResponse = await apiRequest(
                `/workspace/${workspace.slug}/threads`
              );
              if (threadResponse.ok) {
                const threadData = (await threadResponse.json()) as {
                  threads?: { slug: string; name: string }[];
                };
                threads =
                  threadData.threads?.map((thread) => ({
                    id: thread.slug,
                    label: thread.name || "Thread",
                  })) ?? [];
              }
            } catch {
              threads = [];
            }
            return {
              id: workspace.slug,
              title: workspace.name,
              description: workspace.description || "Workspace",
              icon: index === 0 ? "zaki" : "folder",
              color: index === 0 ? "#D24430" : "#88735A",
              instructions: "",
              pinnedFiles: [],
              pinned: false,
              fixed: index === 0,
              threads,
            } satisfies Space;
          })
        );

        if (!isMounted) return;
        setSpaces(workspaceSpaces);
        const firstSpace = workspaceSpaces[0];
        if (firstSpace) {
          setExpandedSpace((prev) => prev ?? firstSpace.id);
        }
      } catch (error) {
        if (!isMounted) return;
        setSpacesError("Unable to load workspaces. Check your session.");
        setSpaces([]);
      } finally {
        if (isMounted) setSpacesLoading(false);
      }
    };

    loadWorkspaces();
    return () => {
      isMounted = false;
    };
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
          await apiRequest(`/workspace/${parentSpace.id}/thread/${id}`, {
            method: "DELETE",
          });
        } catch {
          setSpacesError("Unable to delete thread.");
        }
      }
    }
    if (type === "space") {
      try {
        await apiRequest(`/workspace/${id}`, {
          method: "DELETE",
        });
      } catch {
        setSpacesError("Unable to delete workspace.");
      }
    }
    if (type === "space") {
      setSpaces((prev) => prev.filter((space) => space.id !== id));
      if (expandedSpace === id) {
        const fallback = spaces.find((space) => space.id !== id)?.id ?? null;
        setExpandedSpace(fallback);
      }
    } else {
      setSpaces((prev) =>
        prev.map((space) => ({
          ...space,
          threads: space.threads.filter((thread) => thread.id !== id),
        }))
      );
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
              }
            : space
        )
      );
    };
    const handleDeleteThread = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string }>).detail;
      if (!detail?.id) return;
      setSpaces((prev) =>
        prev.map((space) => ({
          ...space,
          threads: space.threads.filter((thread) => thread.id !== detail.id),
        }))
      );
      if (activeItem === detail.id) {
        window.dispatchEvent(new Event("zaki:clear-thread"));
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
    window.addEventListener("zaki:create-space", handleCreateSpace);
    window.addEventListener("zaki:create-thread", handleCreateThread);
    window.addEventListener("zaki:update-space", handleUpdateSpace);
    window.addEventListener("zaki:delete-thread", handleDeleteThread);
    window.addEventListener("zaki:rename-thread", handleRenameThread);
    return () => {
      window.removeEventListener("zaki:create-space", handleCreateSpace);
      window.removeEventListener("zaki:create-thread", handleCreateThread);
      window.removeEventListener("zaki:update-space", handleUpdateSpace);
      window.removeEventListener("zaki:delete-thread", handleDeleteThread);
      window.removeEventListener("zaki:rename-thread", handleRenameThread);
    };
  }, [spaces]);

  return (
    <div
      className={cn(
        "zaki-sidebar h-full flex flex-col bg-white shrink-0 transition-[width,padding] duration-300",
        collapsed ? "w-[72px] py-4 px-2" : "w-[272px] py-5 px-3.5"
      )}
    >
      {collapsed ? (
        <>
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              className="size-9 rounded-xl bg-[#fff4e8] border border-[#f3e5d4] flex items-center justify-center"
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
              className="size-9 rounded-xl border border-transparent hover:border-[#EBEBEB] hover:bg-[#f8f2e9] transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#D24430] focus-visible:ring-offset-2"
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
                "size-9 rounded-xl text-[#d24430] flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-[#D24430] focus-visible:ring-offset-2",
                isActive("new-space") ? "bg-[#fa7319]/20" : "bg-[#fa7319]/15 hover:bg-[#fa7319]/20"
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
                "size-9 rounded-xl transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#D24430] focus-visible:ring-offset-2",
                isActive("spaces") ? "bg-[#f8f2e9]" : "hover:bg-[#f8f2e9]"
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
                "size-9 rounded-xl transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#D24430] focus-visible:ring-offset-2",
                isActive("library") ? "bg-[#f8f2e9]" : "hover:bg-[#f8f2e9]"
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
                "size-9 rounded-xl transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#D24430] focus-visible:ring-offset-2",
                isActive("search") ? "bg-[#f8f2e9]" : "hover:bg-[#f8f2e9]"
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
                "size-9 rounded-xl transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#D24430] focus-visible:ring-offset-2",
                isActive("research") ? "bg-[#f8f2e9]" : "hover:bg-[#f8f2e9]"
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
              className="size-9 rounded-xl flex items-center justify-center transition-colors bg-[#faf6f0] hover:bg-[#f0e6d8] focus-visible:ring-2 focus-visible:ring-[#D24430] focus-visible:ring-offset-2"
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
                "size-10 rounded-full flex items-center justify-center text-[#1f1a14] font-medium text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#D24430] focus-visible:ring-offset-2",
                isActive("profile") ? "bg-[#f0e6d8]" : "bg-[#faf6f0] hover:bg-[#f0e6d8]"
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
          className="bg-white p-1.5 rounded-lg border border-transparent hover:border-[#EBEBEB] transition-colors focus-visible:ring-2 focus-visible:ring-[#D24430] focus-visible:ring-offset-2"
          onClick={() => setCollapsed(true)}
          type="button"
          aria-label="Collapse sidebar"
        >
          <SideBarIcon />
        </button>
      </div>

      {/* Search */}
      <div className="bg-[#f8f2e9] rounded-[10px] flex items-center p-2 gap-2 mb-5">
        <SearchIcon />
        <input 
          type="text" 
          placeholder="Search..." 
          className="bg-transparent border-none outline-none text-[#b09472] placeholder-[#b09472] text-sm w-full font-medium"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 mb-5">
        <button
          className={cn(
            "flex items-center gap-2 p-1.5 rounded-lg transition-colors text-left group",
            isActive("new-space") ? "bg-[#f8f2e9]" : "hover:bg-[#f8f2e9]"
          )}
          onClick={() => {
            setActiveItem("new-space");
            window.dispatchEvent(new Event("zaki:view-spaces"));
            window.dispatchEvent(new Event("zaki:open-create-space"));
          }}
          type="button"
        >
          <div className="bg-[#fa7319]/15 rounded-full size-5 flex items-center justify-center">
            <AddIcon />
          </div>
          <span className="text-[#d24430] text-sm font-medium">New space</span>
        </button>

        <button
          className={cn(
            "flex items-center gap-2 p-1.5 rounded-lg transition-colors text-left group",
            isActive("spaces") ? "bg-[#f8f2e9]" : "hover:bg-[#f8f2e9]"
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
          <span className="text-[#655543] text-sm font-medium">Spaces</span>
        </button>

        <button
          className={cn(
            "flex items-center gap-2 p-1.5 rounded-lg transition-colors text-left group",
            isActive("library") ? "bg-[#f8f2e9]" : "hover:bg-[#f8f2e9]"
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
          <span className="text-[#655543] text-sm font-medium">Library</span>
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#EBEBEB] w-full mb-5" />

      {/* Space Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="text-[#a08462] text-xs font-medium mb-2 pl-1.5">Space</div>
        {spacesLoading && (
          <div className="mb-3">
            <SkeletonSpaceList />
          </div>
        )}
        {spacesError && (
          <div className="text-xs text-[#d24430] mb-3 pl-1.5">{spacesError}</div>
        )}
        
        <div className="flex flex-col gap-1">
          {spaces.filter((space) => space.fixed).map((space) => (
            <div key={space.id}>
              <div className="relative group">
                <button
                  onClick={() => {
                    setExpandedSpace(space.id);
                    setActiveItem(space.id);
                    window.dispatchEvent(new Event("zaki:clear-thread"));
                    window.dispatchEvent(new CustomEvent("zaki:view-space", { detail: { id: space.id } }));
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 p-1.5 rounded-lg transition-colors text-left group",
                    isSpaceActive(space.id) ? "bg-[#f8f2e9]" : "hover:bg-[#f8f2e9]"
                  )}
                  type="button"
                >
                  <div className="size-5 flex items-center justify-center">
                    <div className="scale-[0.6]">
                      <CenterLogo />
                    </div>
                  </div>
                  <span className="text-[#655543] text-sm font-medium flex-1">{space.title}</span>
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
                          "w-full text-left text-[#655543] text-sm font-medium py-1.5 px-2 rounded-lg",
                          isActive(thread.id) ? "bg-[#f8f2e9]" : "hover:bg-[#f8f2e9]"
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
                    className="flex items-center gap-2 p-1.5 rounded-lg transition-colors text-left group hover:bg-[#f8f2e9]"
                    onClick={() => createThreadInSpace(space.id)}
                    type="button"
                  >
                    <div className="bg-[#faf6f0] rounded-full size-5 flex items-center justify-center">
                      <AddIcon color="#88735A" />
                    </div>
                    <span className="text-[#88735a] text-sm font-medium">New chat</span>
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
                    window.dispatchEvent(new Event("zaki:clear-thread"));
                    window.dispatchEvent(new CustomEvent("zaki:view-space", { detail: { id: space.id } }));
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 p-1.5 rounded-lg transition-colors text-left group",
                    isSpaceActive(space.id) ? "bg-[#f8f2e9]" : "hover:bg-[#f8f2e9]"
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
                      className="flex-1 bg-white border border-[#e7dbc9] rounded-md px-2 py-1 text-sm text-[#655543] outline-none"
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
                    <span className="text-[#655543] text-sm font-medium flex-1">{space.title}</span>
                  )}
                  <div className="flex items-center gap-1">
                {!space.fixed && (
                  <button
                    type="button"
                    className="size-6 rounded-md p-0 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[#f8f2e9] transition"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenu(openMenu?.id === space.id ? null : { type: "space", id: space.id });
                    }}
                    data-menu-button
                    aria-haspopup="menu"
                    aria-expanded={openMenu?.id === space.id}
                  >
                    <MoreHorizontal className="size-4 text-[#b09472]" />
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
                {openMenu?.type === "space" && openMenu.id === space.id && (
                  <div
                    className="absolute right-0 top-9 w-36 rounded-xl border border-[#EBEBEB] bg-white shadow-[0px_12px_24px_rgba(15,15,15,0.12)] p-1 z-20"
                    role="menu"
                    data-menu
                  >
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-[#1f1a14] hover:bg-[#f8f2e9]"
                      onClick={() => togglePinned("space", space.id)}
                    >
                      <Pin className="size-3.5 text-[#88735A]" />
                      {space.pinned ? "Unpin" : "Pinned"}
                    </button>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-[#1f1a14] hover:bg-[#f8f2e9]"
                      onClick={() => startRename("space", space.id, space.title)}
                    >
                      <Pencil className="size-3.5 text-[#88735A]" />
                      Rename
                    </button>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-[#d24430] hover:bg-[#fff3f0]"
                      onClick={() => setConfirmDelete({ type: "space", id: space.id, label: space.title })}
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {isSpaceActive(space.id) && (
                <div className="pl-6 flex flex-col gap-1 mt-1">
                  {space.threads.map((thread) => (
                    <div key={thread.id} className="relative group">
                      <button
                        className={cn(
                          "w-full text-left text-[#655543] text-sm font-medium py-1.5 px-2 rounded-lg",
                          isActive(thread.id) ? "bg-[#f8f2e9]" : "hover:bg-[#f8f2e9]"
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
                            className="w-full bg-white border border-[#e7dbc9] rounded-md px-2 py-1 text-sm text-[#655543] outline-none"
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
                        className="absolute right-0 top-1/2 -translate-y-1/2 size-6 rounded-md p-0 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[#f8f2e9] transition focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[#D24430] focus-visible:ring-offset-2"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenMenu(openMenu?.id === thread.id ? null : { type: "thread", id: thread.id });
                        }}
                        data-menu-button
                        aria-haspopup="menu"
                        aria-expanded={openMenu?.id === thread.id}
                        aria-label={`${thread.label} options`}
                      >
                        <MoreHorizontal className="size-4 text-[#b09472]" />
                      </button>
                      {openMenu?.type === "thread" && openMenu.id === thread.id && (
                        <div
                          className="absolute right-0 top-8 w-36 rounded-xl border border-[#EBEBEB] bg-white shadow-[0px_12px_24px_rgba(15,15,15,0.12)] p-1 z-20"
                          role="menu"
                          data-menu
                        >
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-[#1f1a14] hover:bg-[#f8f2e9]"
                            onClick={() => togglePinned("thread", thread.id)}
                          >
                            <Pin className="size-3.5 text-[#88735A]" />
                            {thread.pinned ? "Unpin" : "Pinned"}
                          </button>
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-[#1f1a14] hover:bg-[#f8f2e9]"
                            onClick={() => startRename("thread", thread.id, thread.label)}
                          >
                            <Pencil className="size-3.5 text-[#88735A]" />
                            Rename
                          </button>
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-[#d24430] hover:bg-[#fff3f0]"
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
                    className="flex items-center gap-2 p-1.5 rounded-lg transition-colors text-left group hover:bg-[#f8f2e9]"
                    onClick={() => createThreadInSpace(space.id)}
                    type="button"
                  >
                    <div className="bg-[#faf6f0] rounded-full size-5 flex items-center justify-center">
                      <AddIcon color="#88735A" />
                    </div>
                    <span className="text-[#88735a] text-sm font-medium">New chat</span>
                  </button>
                </div>
              )}
            </div>
          ))}

        </div>
      </div>

      {/* Footer Profile */}
      <div className="mt-4 pt-3 border-t border-[#EBEBEB] relative">
        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-[#f8f2e9]"
          )}
          onClick={() => {
            setActiveItem("profile");
            setProfileMenuOpen((open) => !open);
          }}
          role="button"
          tabIndex={0}
          data-profile-button
        >
          <div className="size-10 bg-[#faf6f0] rounded-full flex items-center justify-center text-[#1f1a14] font-medium text-base overflow-hidden">
            {profileImageUrl ? (
              <img src={profileImageUrl} alt={userName} className="h-full w-full object-cover" />
            ) : (
              userInitials
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[#1f1a14] text-sm font-medium truncate">{userName}</div>
            <div
              className={cn(
                "text-xs font-semibold uppercase tracking-wider",
                planLabel === "PRO" ? "text-[#0c291d]" : "text-[#219171]"
              )}
            >
              {planLabel === "PRO" ? "Plus" : "Free"}
            </div>
          </div>
        </div>
        {profileMenuOpen && (
          <div
            className="absolute bottom-14 right-0 w-[230px] rounded-2xl border border-[#EBEBEB] bg-white shadow-[0px_14px_30px_rgba(15,15,15,0.12)] p-1 z-20"
            role="menu"
            data-profile-menu
          >
            <button
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-[#f8f2e9] transition-colors"
              type="button"
              onClick={() => {
                setProfileMenuOpen(false);
                setProfileEditOpen(true);
              }}
            >
              <div className="size-7 rounded-full bg-[#faf6f0] flex items-center justify-center text-xs font-medium text-[#1f1a14] overflow-hidden">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt={userName} className="h-full w-full object-cover" />
                ) : (
                  userInitials
                )}
              </div>
              <div className="min-w-0 text-left">
                <div className="text-sm text-[#1f1a14] font-medium truncate">{userName}</div>
                <div className="text-xs text-[#a3a3a3] truncate">Manage profile</div>
              </div>
              <span className={cn(
                "ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider",
                planLabel === "PRO" ? "bg-[#c2f5da] text-[#0c291d]" : "bg-[#efefef] text-[#219171]"
              )}>
                {planLabel}
              </span>
            </button>
            <div className="h-px bg-[#f1f1f1] my-1" />
            <button
              className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[#1f1a14] hover:bg-[#f8f2e9] transition-colors"
              type="button"
              onClick={() => setThemePreference(isDark ? "light" : "dark")}
            >
              <Moon className="size-4 text-[#88735A]" />
              Dark mode
              <span className="ml-auto text-[#a3a3a3] text-xs">{isDark ? "On" : "Off"}</span>
            </button>
            <button
              className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[#1f1a14] hover:bg-[#f8f2e9] transition-colors"
              type="button"
              onClick={() => {
                setProfileMenuOpen(false);
                setSettingsOpen(true);
              }}
            >
              <Settings className="size-4 text-[#88735A]" />
              Settings
            </button>
            <button className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[#1f1a14] hover:bg-[#f8f2e9] transition-colors" type="button">
              <Globe className="size-4 text-[#88735A]" />
              Language
            </button>
            <button className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[#1f1a14] hover:bg-[#f8f2e9] transition-colors" type="button">
              <HelpCircle className="size-4 text-[#88735A]" />
              Need help?
            </button>
            <div className="h-px bg-[#f1f1f1] my-1" />
            <button
              className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[#d24430] hover:bg-[#fff3f0] transition-colors"
              type="button"
              onClick={() => {
                setProfileMenuOpen(false);
                logout();
              }}
            >
              <LogOut className="size-4" />
              Log out
            </button>
            <div className="px-2.5 pt-1 text-[10px] text-[#a3a3a3]">v1.5.69 · Terms & Conditions</div>
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
          <div ref={settingsModalRef} className="relative w-[560px] max-w-[calc(100%-2rem)] rounded-3xl border border-[#ebe3d6] bg-white shadow-[0px_24px_60px_rgba(15,15,15,0.18)]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f1ece3]">
              <div>
                <div className="text-lg font-semibold text-[#1f1a14]">Settings</div>
                <div className="text-xs text-[#a3a3a3]">Manage your preferences and account</div>
              </div>
              <button
                type="button"
                className="size-8 rounded-full bg-[#faf6f0] text-[#655543] hover:bg-[#f0e6d8] transition-colors"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close settings"
              >
                <span className="block text-lg leading-none">x</span>
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-6">
              <div>
                <div className="text-sm font-semibold text-[#1f1a14]">Profile</div>
                <div className="mt-3 grid gap-3">
                  <label className="flex flex-col gap-1 text-xs text-[#88735A]">
                    Display name
                    <input
                      className="rounded-xl border border-[#e7dbc9] px-3 py-2 text-sm text-[#1f1a14] outline-none focus:border-[#b09472]"
                      defaultValue={userName}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-[#88735A]">
                    Email
                    <input
                      className="rounded-xl border border-[#e7dbc9] px-3 py-2 text-sm text-[#1f1a14] outline-none focus:border-[#b09472]"
                      defaultValue={userName}
                    />
                  </label>
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-[#1f1a14]">Preferences</div>
                <div className="mt-3 grid gap-3">
                  <label className="flex items-center justify-between rounded-2xl border border-[#f1ece3] px-3 py-2 text-sm text-[#655543]">
                    Theme
                    <select
                      className="rounded-lg border border-[#e7dbc9] bg-white px-2 py-1 text-sm text-[#1f1a14]"
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
                  <label className="flex items-center justify-between rounded-2xl border border-[#f1ece3] px-3 py-2 text-sm text-[#655543]">
                    Language
                    <select className="rounded-lg border border-[#e7dbc9] bg-white px-2 py-1 text-sm text-[#1f1a14]">
                      <option>English</option>
                      <option>Arabic</option>
                    </select>
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-[#f1ece3] px-3 py-2 text-sm text-[#655543]">
                    Auto-generate titles
                    <input type="checkbox" className="size-4 accent-[#b09472]" defaultChecked />
                  </label>
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-[#1f1a14]">Data & storage</div>
                <div className="mt-3 grid gap-3">
                  <button className="w-full rounded-2xl border border-[#f1ece3] px-3 py-2 text-sm text-[#655543] hover:bg-[#f8f2e9] transition-colors" type="button">
                    Clear local cache
                  </button>
                  <button className="w-full rounded-2xl border border-[#f1ece3] px-3 py-2 text-sm text-[#655543] hover:bg-[#f8f2e9] transition-colors" type="button">
                    Manage attachments
                  </button>
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-[#1f1a14]">Privacy</div>
                <div className="mt-3 grid gap-3">
                  <label className="flex items-center justify-between rounded-2xl border border-[#f1ece3] px-3 py-2 text-sm text-[#655543]">
                    Allow chat analytics
                    <input type="checkbox" className="size-4 accent-[#b09472]" />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-[#f1ece3] px-3 py-2 text-sm text-[#655543]">
                    Save chat history
                    <input type="checkbox" className="size-4 accent-[#b09472]" defaultChecked />
                  </label>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#f1ece3]">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm text-[#655543] hover:bg-[#f8f2e9] transition-colors"
                onClick={() => setSettingsOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm text-white bg-[#655543] hover:bg-[#504335] transition-colors"
                onClick={() => setSettingsOpen(false)}
              >
                Save changes
              </button>
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
          <div ref={profileEditModalRef} className="relative w-[460px] max-w-[calc(100%-2rem)] rounded-3xl border border-[#ebe3d6] bg-white shadow-[0px_24px_60px_rgba(15,15,15,0.18)] px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-[#1f1a14]">Profile</div>
                <div className="text-xs text-[#a3a3a3]">Update your display name and photo</div>
              </div>
              <button
                type="button"
                className="size-8 rounded-full bg-[#faf6f0] text-[#655543] hover:bg-[#f0e6d8] transition-colors"
                onClick={() => setProfileEditOpen(false)}
                aria-label="Close profile editor"
              >
                <span className="block text-lg leading-none">x</span>
              </button>
            </div>
            <div className="mt-5 flex items-center gap-4">
              <div className="size-16 rounded-full bg-[#faf6f0] flex items-center justify-center text-[#1f1a14] font-semibold text-lg overflow-hidden">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt={userName} className="h-full w-full object-cover" />
                ) : (
                  userInitials
                )}
              </div>
              <label className="text-sm text-[#655543] cursor-pointer">
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
                <span className="rounded-full border border-[#e7dbc9] px-3 py-2 text-xs text-[#655543] hover:bg-[#f8f2e9] transition-colors">
                  Upload photo
                </span>
              </label>
            </div>
            <div className="mt-5">
              <label className="flex flex-col gap-1 text-xs text-[#88735A]">
                Display name
                <input
                  className="rounded-xl border border-[#e7dbc9] px-3 py-2 text-sm text-[#1f1a14] outline-none focus:border-[#b09472]"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </label>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm text-[#655543] hover:bg-[#f8f2e9] transition-colors"
                onClick={() => setProfileEditOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm text-white bg-[#655543] hover:bg-[#504335] transition-colors"
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
          <div ref={deleteConfirmModalRef} className="relative w-[420px] max-w-[calc(100%-2rem)] rounded-3xl border border-[#ebe3d6] bg-white shadow-[0px_24px_60px_rgba(15,15,15,0.18)] px-6 py-5">
            <div className="text-lg font-semibold text-[#1f1a14]">Delete {confirmDelete.type}</div>
            <div className="mt-2 text-sm text-[#655543]">
              Deleting this {confirmDelete.type} will delete the chat and content permanently. There is no way to retrieve the content of the deleted {confirmDelete.type === "space" ? "chats in this space" : "chat"} after deletion.
            </div>
            <div className="mt-4 text-xs text-[#a3a3a3]">Selected: {confirmDelete.label}</div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm text-[#655543] hover:bg-[#f8f2e9] transition-colors"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm text-white bg-[#d24430] hover:bg-[#b63a28] transition-colors"
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
        </>
      )}
    </div>
  );
}
