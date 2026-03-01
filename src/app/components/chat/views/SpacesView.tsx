import type { Space } from "@/types";
import { Folder, Plus, Search, Settings, Trash2 } from "lucide-react";
import { SkeletonSpaceGrid } from "../../ui/skeleton";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

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
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir?.() === "rtl" || i18n.language?.startsWith("ar");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"recent" | "alpha">("recent");

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
      <div className="px-4 sm:px-6 md:px-10 py-8 md:py-10 max-w-6xl mx-auto w-full" dir={isRtl ? "rtl" : "ltr"}>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="size-9 rounded-full bg-zaki-sunken flex items-center justify-center text-zaki-muted text-xs font-semibold">SP</div>
          <div className="text-lg font-semibold text-zaki-primary">{t("spacesView.title")}</div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex-1 flex items-center gap-2 rounded-full border border-zaki-subtle bg-white px-4 py-2 text-sm text-zaki-secondary dark:bg-zaki-dark-card">
            <Search className="size-4 text-zaki-muted" />
            <span className="text-zaki-muted">{t("spacesView.searchPlaceholder")}</span>
          </div>
          <span className="zaki-btn-sm border border-zaki-subtle bg-white text-zaki-secondary dark:bg-zaki-dark-card dark:text-zaki-dark-subtle">
            {t("spacesView.sortRecent")}
          </span>
        </div>

        <SkeletonSpaceGrid />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 md:px-10 py-8 md:py-10 max-w-6xl mx-auto w-full" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="size-9 rounded-full bg-zaki-sunken flex items-center justify-center text-zaki-muted text-xs font-semibold">SP</div>
        <div className="text-lg font-semibold text-zaki-primary">{t("spacesView.title")}</div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex-1 flex items-center gap-2 rounded-full border border-zaki-subtle bg-white px-4 py-2 text-sm text-zaki-secondary dark:bg-zaki-dark-card">
          <Search className="size-4 text-zaki-muted" />
          <input
            className={cn(
              "flex-1 bg-transparent outline-none placeholder-zaki text-sm",
              isRtl ? "text-right" : "text-left"
            )}
            placeholder={t("spacesView.searchPlaceholder")}
            aria-label={t("spacesView.searchAria")}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
        <button
          type="button"
          className="zaki-btn-sm border border-zaki-subtle bg-white text-zaki-secondary hover:bg-zaki-hover flex items-center gap-1.5 dark:bg-zaki-dark-card dark:text-zaki-dark-subtle dark:hover:bg-zaki-dark-hover"
          onClick={() => setSortOrder((prev) => (prev === "recent" ? "alpha" : "recent"))}
          aria-label={t("spacesView.sortToggleAria")}
        >
          {sortOrder === "recent" ? t("spacesView.sortRecent") : t("spacesView.sortAlpha")}
        </button>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <button
          type="button"
          onClick={onCreateSpace}
          className={cn(
            "rounded-zaki-xl border border-dashed border-zaki-strong bg-zaki-raised/70 p-4 md:p-5 hover:bg-zaki-hover transition-colors zaki-pressable",
            isRtl ? "text-right" : "text-left"
          )}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-zaki-secondary">
            <span className="size-6 rounded-full border border-zaki-subtle bg-white dark:bg-zaki-dark-card flex items-center justify-center">
              <Plus className="size-4 text-zaki-muted" />
            </span>
            {t("spacesView.createCta")}
          </div>
        </button>
        {sortedSpaces.map((space) => (
          <div
            key={space.id}
            className="relative rounded-zaki-xl border border-zaki-subtle bg-white p-4 md:p-5 shadow-[0px_6px_18px_rgba(15,15,15,0.06)] cursor-pointer hover:shadow-[0px_10px_24px_rgba(15,15,15,0.08)] transition-shadow dark:bg-zaki-dark-card dark:border-zaki-dark"
            role="button"
            tabIndex={0}
            aria-label={t("spacesView.startChatAria")}
            onClick={() => onViewSpace(space.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onViewSpace(space.id);
              }
            }}
          >
            <div className={cn("flex flex-col sm:flex-row items-start justify-between gap-4", isRtl && "sm:flex-row-reverse")}>
              <div className={cn("min-w-0 flex-1", isRtl && "text-right")}>
                <div className="flex items-center gap-2 text-sm font-semibold text-zaki-primary whitespace-nowrap dark:text-zaki-dark-primary">
                  <Folder className="size-4 text-zaki-muted" />
                  <span className="truncate">{space.title}</span>
                </div>
                <div className="text-xs text-zaki-disabled mt-2 dark:text-zaki-dark-muted">
                  {t("spacesView.chatsCount", { count: space.threads?.length ?? 0 })}
                </div>
              </div>
              <div className={cn("flex flex-col items-end gap-2 w-full sm:w-[80%]", isRtl && "items-start")}>
                <div className={cn("flex items-center justify-end gap-2 w-full", isRtl && "justify-start")}>
                  <button
                    type="button"
                    className="size-7 rounded-md border border-transparent hover:border-zaki-subtle hover:bg-zaki-hover flex items-center justify-center text-zaki-muted dark:hover:bg-zaki-dark-hover"
                    onClick={(event) => {
                      event.stopPropagation();
                      window.dispatchEvent(
                        new CustomEvent("zaki:open-space-settings", { detail: { id: space.id } })
                      );
                    }}
                    aria-label={t("spacesView.spaceSettingsAria", { title: space.title })}
                  >
                    <Settings className="size-4" />
                  </button>
                  {!space.fixed && (
                    <button
                      type="button"
                      className="size-7 rounded-md border border-transparent hover:border-zaki-strong hover:bg-zaki-error flex items-center justify-center text-zaki-brand dark:hover:bg-[rgba(210,68,48,0.18)]"
                      onClick={(event) => {
                        event.stopPropagation();
                        window.dispatchEvent(
                          new CustomEvent("zaki:delete-space", {
                            detail: { id: space.id, label: space.title },
                          })
                        );
                      }}
                      aria-label={t("spacesView.deleteSpaceAria", { title: space.title })}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
                <div className="w-full">
                  {editingId === space.id ? (
                    <textarea
                      className={cn(
                        "zaki-space-desc-input w-full rounded-zaki-lg border border-zaki-subtle bg-white px-3 py-2 text-xs text-zaki-secondary outline-none focus:outline-none focus:ring-0 dark:bg-zaki-dark-card dark:border-zaki-dark dark:text-zaki-dark-subtle",
                        isRtl ? "text-right" : "text-left"
                      )}
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
                      className={cn(
                        "w-full text-xs text-zaki-secondary zaki-line-clamp-3 hover:text-zaki-primary dark:text-zaki-dark-subtle dark:hover:text-zaki-dark-primary",
                        isRtl ? "text-right" : "text-left"
                      )}
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingId(space.id);
                        setDescriptionDraft(space.description ?? "");
                      }}
                    >
                      {space.description || t("spacesView.descriptionPlaceholder")}
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
