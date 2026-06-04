import type { Space } from "@/types";
import {
  Folder,
  Plus,
  Search,
  Settings,
  Trash2,
  Compass,
  Pencil,
  Briefcase,
  Code2,
  GraduationCap,
  MessageSquareText,
  FileText,
  Sparkles,
} from "lucide-react";
import { SkeletonSpaceGrid } from "../../ui/skeleton";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { MetaLabel } from "@/app/components/ui/zaki";

interface SpacesViewProps {
  spacesList: Space[];
  isLoading?: boolean;
  onCreateSpace: () => void;
  onViewSpace: (id: string) => void;
}

type SpaceTemplate = {
  id: string;
  label: string;
  description: string;
  icon: typeof Compass;
  color: string;
  spaceName: string;
  spaceDescription: string;
  instructions: string;
};

const TEMPLATES: SpaceTemplate[] = [
  {
    id: "research",
    label: "Research",
    description: "Synthesize sources. Find the signal.",
    icon: Compass,
    color: "#219171",
    spaceName: "Research",
    spaceDescription: "A space for deep dives and investigations.",
    instructions:
      "You are a research assistant for this workspace. Help me explore topics deeply, compare sources, identify gaps, and synthesize findings. Prefer clarity over certainty. When I share documents, ground your answers in their content and cite where claims come from. If I ask for a summary, lead with the bottom line.",
  },
  {
    id: "writing",
    label: "Writing",
    description: "Draft, edit, and refine. Keep your voice.",
    icon: Pencil,
    color: "#d97706",
    spaceName: "Writing",
    spaceDescription: "A space for drafts, edits, and finished pieces.",
    instructions:
      "You are a writing partner for this workspace. Help me draft, revise, and polish. Match my voice from previous conversations. Ask clarifying questions before rewriting large sections. When I share reference material, treat it as source of truth for facts and tone.",
  },
  {
    id: "client",
    label: "Client brief",
    description: "Prep deliverables. Stay on brief.",
    icon: Briefcase,
    color: "#2563eb",
    spaceName: "Client brief",
    spaceDescription: "A space for one client engagement.",
    instructions:
      "You are helping me prepare deliverables for a specific client. When I share the brief, treat it as the source of truth for scope, tone, and constraints. Flag any assumptions I am making. Help me structure proposals, decks, and communications that stay on brief.",
  },
  {
    id: "code",
    label: "Code project",
    description: "Review code. Ship faster.",
    icon: Code2,
    color: "#7c3aed",
    spaceName: "Code project",
    spaceDescription: "A space for one codebase or shipping effort.",
    instructions:
      "You are a senior engineer on this project. When I share code, review it for correctness, readability, and edge cases before suggesting changes. Ask before making architectural decisions. Match the existing style. When I pin documents, treat them as the project's source of truth.",
  },
  {
    id: "study",
    label: "Study",
    description: "Learn and retain. With a tutor.",
    icon: GraduationCap,
    color: "#16a34a",
    spaceName: "Study",
    spaceDescription: "A space to learn one subject deeply.",
    instructions:
      "You are my tutor for this subject. Teach in small, connected steps. Check my understanding with quick questions before moving on. Use examples from my own context when you can. When I share notes or textbooks, prefer them over general knowledge.",
  },
];

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

  const openTemplate = (template: SpaceTemplate) => {
    window.dispatchEvent(
      new CustomEvent("zaki:create-space-from-template", {
        detail: {
          name: template.spaceName,
          description: template.spaceDescription,
          instructions: template.instructions,
        },
      })
    );
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

  const renderHeader = () => (
    <div className="mb-8">
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <div className="size-9 border border-zaki-brand/30 bg-zaki-brand/10 flex items-center justify-center text-zaki-brand">
          <Folder className="size-4" />
        </div>
        <h1 className="font-mono-ui font-semibold text-zaki-primary text-xl tracking-normal uppercase">
          {t("spacesView.title")}
        </h1>
      </div>
      <p className="text-sm text-zaki-secondary">
        Workspaces for focused, ongoing work.
      </p>
    </div>
  );

  const renderToolbar = () => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
      <div className="flex-1 flex items-center gap-2 border border-zaki bg-zaki-hover px-3 py-2 text-sm text-zaki-secondary">
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
        className="inline-flex min-h-9 items-center gap-1.5 border border-zaki bg-zaki-hover px-3 py-1.5 font-mono-ui text-[11px] font-medium uppercase text-zaki-secondary hover:text-zaki-primary hover:bg-zaki-active transition-colors"
        onClick={() => setSortOrder((prev) => (prev === "recent" ? "alpha" : "recent"))}
        aria-label={t("spacesView.sortToggleAria")}
      >
        {sortOrder === "recent" ? t("spacesView.sortRecent") : t("spacesView.sortAlpha")}
      </button>
    </div>
  );

  const renderTemplates = () => (
    <div className="mb-10">
      <div className="mb-3">
        <MetaLabel icon={<Sparkles className="size-3.5 text-zaki-brand" />}>
          Start with a template
        </MetaLabel>
      </div>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => openTemplate(template)}
              className={cn(
                "group border border-zaki bg-zaki-raised p-4 text-left transition-colors duration-200",
                "hover:border-zaki-strong hover:bg-zaki-hover",
                "dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)] dark:hover:bg-[#1a1714]",
                isRtl && "text-right"
              )}
            >
              <div
                className="inline-flex size-9 items-center justify-center border mb-3"
                style={{
                  backgroundColor: `${template.color}1a`,
                  color: template.color,
                  borderColor: `${template.color}66`,
                }}
              >
                <Icon className="size-4" />
              </div>
              <div className="font-mono-ui font-semibold text-xs uppercase text-zaki-primary mb-1">
                {template.label}
              </div>
              <div className="text-xs text-zaki-secondary leading-relaxed">
                {template.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderExplainer = () => (
    <div className="border border-zaki bg-zaki-raised p-5 dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)]">
      <div className="mb-4">
        <MetaLabel>What makes a Space</MetaLabel>
      </div>
      <p className="mb-4 border-l border-zaki-brand/40 pl-3 font-mono-ui text-[11px] uppercase leading-relaxed text-zaki-secondary">
        Chat spaces keep workspace context for focused threads. ZAKI Agent Brain remains the personal graph memory for autonomous work.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <div className="inline-flex size-8 items-center justify-center border border-zaki-brand/30 bg-zaki-brand/10 text-zaki-brand">
            <Sparkles className="size-4" />
          </div>
          <div className="font-mono-ui font-semibold text-xs uppercase text-zaki-primary">
            Master prompt
          </div>
          <p className="text-xs text-zaki-secondary leading-relaxed">
            Persistent instructions that apply to every chat in this space. Set the tone, role, and rules once.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="inline-flex size-8 items-center justify-center border border-zaki-accent/30 bg-zaki-accent/15 text-zaki-accent">
            <FileText className="size-4" />
          </div>
          <div className="font-mono-ui font-semibold text-xs uppercase text-zaki-primary">
            Documents
          </div>
          <p className="text-xs text-zaki-secondary leading-relaxed">
            Files ZAKI can reference to give grounded answers from your material. Upload once, use across threads.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <div
            className="inline-flex size-8 items-center justify-center border"
            style={{ backgroundColor: "rgba(217, 119, 6, 0.15)", borderColor: "rgba(217, 119, 6, 0.45)", color: "#d97706" }}
          >
            <MessageSquareText className="size-4" />
          </div>
          <div className="font-mono-ui font-semibold text-xs uppercase text-zaki-primary">
            Threads
          </div>
          <p className="text-xs text-zaki-secondary leading-relaxed">
            Multiple conversations inside one space, sharing the master prompt and documents.
          </p>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div
        className="px-4 sm:px-6 md:px-10 py-8 md:py-10 max-w-6xl mx-auto w-full"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {renderHeader()}
        {renderToolbar()}
        <SkeletonSpaceGrid />
      </div>
    );
  }

  const renderSpaceCard = (space: Space) => (
    <div
      key={space.id}
      className="group relative border border-zaki bg-zaki-raised p-4 transition-colors duration-200 hover:border-zaki-strong hover:bg-zaki-hover cursor-pointer dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)] dark:hover:bg-[#1a1714]"
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
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center border border-zaki-brand/30 bg-zaki-brand/10 text-zaki-brand">
          <Folder className="size-4" />
        </span>
        <div
          className={cn(
            "flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity",
            isRtl && "flex-row-reverse"
          )}
        >
          <button
            type="button"
            className="size-7 border border-transparent flex items-center justify-center text-zaki-muted hover:text-zaki-primary hover:border-zaki hover:bg-zaki-hover transition-colors"
            onClick={(event) => {
              event.stopPropagation();
              window.dispatchEvent(
                new CustomEvent("zaki:open-space-settings", { detail: { id: space.id } })
              );
            }}
            aria-label={t("spacesView.spaceSettingsAria", { title: space.title })}
          >
            <Settings className="size-3.5" />
          </button>
          {!space.fixed && (
            <button
              type="button"
              className="size-7 border border-transparent flex items-center justify-center text-zaki-muted hover:text-zaki-brand hover:border-zaki-brand/30 hover:bg-zaki-brand/10 transition-colors"
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
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="font-mono-ui font-semibold text-xs uppercase text-zaki-primary truncate mb-1">
        {space.title}
      </div>

      {editingId === space.id ? (
        <textarea
          className={cn(
            "zaki-space-desc-input w-full bg-zaki-hover border border-zaki px-2 py-1.5 text-xs text-zaki-secondary outline-none focus:outline-none focus:ring-0",
            isRtl ? "text-right" : "text-left"
          )}
          rows={2}
          maxLength={200}
          value={descriptionDraft}
          onChange={(event) => setDescriptionDraft(event.target.value)}
          onBlur={() => commitDescription(space.id)}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            event.stopPropagation();
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
            "w-full text-xs text-zaki-secondary zaki-line-clamp-2 hover:text-zaki-primary transition-colors leading-relaxed",
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

      <div className="mt-3 pt-3 border-t border-zaki flex items-center gap-2">
        <span className="inline-flex items-center border border-zaki bg-zaki-hover text-zaki-secondary font-mono-ui text-[10px] font-medium uppercase px-2 py-0.5">
          {t("spacesView.chatsCount", { count: space.threads?.length ?? 0 })}
        </span>
      </div>
    </div>
  );

  const renderCreateCard = () => (
    <button
      type="button"
      onClick={onCreateSpace}
      className={cn(
        "border border-dashed border-zaki-brand/30 bg-transparent p-4 transition-colors duration-200 hover:border-zaki-brand hover:bg-zaki-brand/5 zaki-pressable flex flex-col items-start",
        isRtl ? "text-right items-end" : "text-left"
      )}
    >
      <span className="size-9 border border-zaki-brand/30 bg-zaki-brand/10 text-zaki-brand flex items-center justify-center mb-3">
        <Plus className="size-4" />
      </span>
      <div className="font-mono-ui font-semibold text-xs uppercase text-zaki-primary mb-1">
        {t("spacesView.createCta")}
      </div>
      <div className="text-xs text-zaki-secondary leading-relaxed">
        Start a blank workspace with a custom master prompt.
      </div>
    </button>
  );

  return (
    <div
      className="px-4 sm:px-6 md:px-10 py-8 md:py-10 max-w-6xl mx-auto w-full"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {renderHeader()}

      {renderTemplates()}

      {renderExplainer()}

      {/* Your spaces */}
      <div className="mt-10">
        <div className="mb-3">
          <MetaLabel icon={<Folder className="size-3.5 text-zaki-brand" />}>
            Your spaces
          </MetaLabel>
        </div>

        {renderToolbar()}

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {renderCreateCard()}
          {sortedSpaces.map((space) => renderSpaceCard(space))}
        </div>
      </div>
    </div>
  );
}
