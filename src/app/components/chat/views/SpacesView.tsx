import type { Space } from "@/types";
import { Folder, MoreHorizontal, Plus, Search, Share2 } from "lucide-react";
import { SkeletonSpaceGrid } from "../../ui/skeleton";
import { useEffect, useMemo, useRef, useState } from "react";

interface SpacesViewProps {
  spacesList: Space[];
  isLoading?: boolean;
  onCreateSpace: () => void;
  onViewSpace: (id: string) => void;
}

export function SpacesView({
  spacesList,
  isLoading = false,
  onCreateSpace,
  onViewSpace,
}: SpacesViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [confirmSpaceId, setConfirmSpaceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"recent" | "alpha">("recent");
  const confirmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!confirmSpaceId) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!confirmRef.current) return;
      if (!confirmRef.current.contains(event.target as Node)) {
        setConfirmSpaceId(null);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setConfirmSpaceId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [confirmSpaceId]);

  const commitDescription = (spaceId: string) => {
    window.dispatchEvent(
      new CustomEvent("zaki:update-space", {
        detail: { id: spaceId, description: descriptionDraft.trim() },
      })
    );
    setEditingId(null);
  };

  const filteredSpaces = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return spacesList;
    return spacesList.filter((space) => {
      return (
        space.title.toLowerCase().includes(query) ||
        (space.description ?? "").toLowerCase().includes(query)
      );
    });
  }, [spacesList, searchQuery]);

  const sortedSpaces = useMemo(() => {
    if (sortOrder === "alpha") {
      return [...filteredSpaces].sort((a, b) => a.title.localeCompare(b.title));
    }
    return filteredSpaces;
  }, [filteredSpaces, sortOrder]);

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 md:px-10 py-8 md:py-10 max-w-6xl mx-auto w-full">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="size-9 rounded-full bg-zaki-sunken flex items-center justify-center text-zaki-muted text-xs font-semibold">SP</div>
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold text-zaki-primary">Spaces</div>
            <div className="size-8 rounded-full border border-zaki-subtle bg-white flex items-center justify-center text-zaki-muted">
              <Share2 className="size-4" />
            </div>
            <div className="size-8 rounded-full border border-zaki-subtle bg-white flex items-center justify-center text-zaki-muted">
              <MoreHorizontal className="size-4" />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex-1 flex items-center gap-2 rounded-full border border-zaki-subtle bg-white px-4 py-2 text-sm text-zaki-secondary">
            <Search className="size-4 text-zaki-muted" />
            <span className="text-zaki-muted">Search spaces...</span>
          </div>
          <span className="zaki-btn-sm border border-zaki-subtle bg-white text-zaki-secondary">Sort by: recent</span>
        </div>

        <SkeletonSpaceGrid />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 md:px-10 py-8 md:py-10 max-w-6xl mx-auto w-full">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="size-9 rounded-full bg-zaki-sunken flex items-center justify-center text-zaki-muted text-xs font-semibold">SP</div>
        <div className="flex items-center gap-2">
          <div className="text-lg font-semibold text-zaki-primary">Spaces</div>
          <button className="size-8 rounded-full border border-zaki-subtle bg-white flex items-center justify-center text-zaki-muted hover:bg-zaki-hover" aria-label="Share spaces">
            <Share2 className="size-4" />
          </button>
          <button className="size-8 rounded-full border border-zaki-subtle bg-white flex items-center justify-center text-zaki-muted hover:bg-zaki-hover" aria-label="Spaces menu">
            <MoreHorizontal className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex-1 flex items-center gap-2 rounded-full border border-zaki-subtle bg-white px-4 py-2 text-sm text-zaki-secondary">
          <Search className="size-4 text-zaki-muted" />
          <input
            className="flex-1 bg-transparent outline-none placeholder-zaki text-sm"
            placeholder="Search spaces..."
            aria-label="Search spaces"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
        <button
          type="button"
          className="zaki-btn-sm border border-zaki-subtle bg-white text-zaki-secondary hover:bg-zaki-hover flex items-center gap-1.5"
          onClick={() => setSortOrder((prev) => (prev === "recent" ? "alpha" : "recent"))}
          aria-label="Toggle sort order"
        >
          Sort: {sortOrder === "recent" ? "recent" : "A–Z"}
        </button>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <button
          type="button"
          onClick={onCreateSpace}
          className="rounded-zaki-xl border border-dashed border-zaki-strong bg-zaki-raised/70 p-4 md:p-5 text-left hover:bg-zaki-hover transition-colors zaki-pressable"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-zaki-secondary">
            <span className="size-6 rounded-full border border-zaki-subtle bg-white flex items-center justify-center">
              <Plus className="size-4 text-zaki-muted" />
            </span>
            Create new space
          </div>
        </button>
        {sortedSpaces.map((space) => (
          <div
            key={space.id}
            className="relative rounded-zaki-xl border border-zaki-subtle bg-white p-4 md:p-5 shadow-[0px_6px_18px_rgba(15,15,15,0.06)] cursor-pointer hover:shadow-[0px_10px_24px_rgba(15,15,15,0.08)] transition-shadow"
            role="button"
            onClick={() => setConfirmSpaceId(space.id)}
          >
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-zaki-primary whitespace-nowrap">
                  <Folder className="size-4 text-zaki-muted" />
                  <span className="truncate">{space.title}</span>
                </div>
                <div className="text-xs text-zaki-disabled mt-2">
                  {(space.threads?.length ?? 0)} chats
                </div>
                <div className="text-2xs text-zaki-muted mt-6">Updated recently</div>
              </div>
              <div className="flex flex-col items-end gap-2 w-full sm:w-[80%]">
                <div className="flex items-center justify-end gap-2 w-full">
                  {confirmSpaceId === space.id && (
                    <div
                      ref={confirmRef}
                      className="rounded-full border border-zaki-subtle bg-white px-3 py-1 text-2xs text-zaki-secondary shadow-[0px_10px_24px_rgba(15,15,15,0.12)]"
                      role="button"
                      tabIndex={0}
                      aria-label="Start new chat"
                      onClick={(event) => {
                        event.stopPropagation();
                        setConfirmSpaceId(null);
                        onViewSpace(space.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setConfirmSpaceId(null);
                          onViewSpace(space.id);
                        }
                        if (event.key === "Escape") {
                          setConfirmSpaceId(null);
                        }
                      }}
                    >
                      Start new chat
                    </div>
                  )}
                  <button
                    type="button"
                    className="size-7 rounded-md border border-transparent hover:border-zaki-subtle hover:bg-zaki-hover flex items-center justify-center text-zaki-muted"
                    onClick={(event) => {
                      event.stopPropagation();
                      window.dispatchEvent(
                        new CustomEvent("zaki:open-space-settings", { detail: { id: space.id } })
                      );
                    }}
                    aria-label={`${space.title} settings`}
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </div>
                <div className="w-full">
                  {editingId === space.id ? (
                    <textarea
                      className="zaki-space-desc-input w-full rounded-zaki-lg border border-zaki-subtle bg-white px-3 py-2 text-xs text-zaki-secondary outline-none focus:outline-none focus:ring-0"
                      rows={3}
                      maxLength={200}
                      value={descriptionDraft}
                      onChange={(event) => setDescriptionDraft(event.target.value)}
                      onBlur={() => commitDescription(space.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          commitDescription(space.id);
                        }
                        if (event.key === "Escape") {
                          setEditingId(null);
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      className="w-full text-right text-xs text-zaki-secondary zaki-line-clamp-3 hover:text-zaki-primary"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingId(space.id);
                        setDescriptionDraft(space.description ?? "");
                      }}
                    >
                      {space.description || "Add a short description…"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
