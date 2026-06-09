import { useEffect, useRef, useState } from "react";
import { Folder, Briefcase, BookOpen, GraduationCap, Sparkles, Palette, FileText } from "lucide-react";
import { InputArea } from "../../InputArea";
import { useTranslation } from "react-i18next";
import type { PinnedFileStatus, Space } from "@/types";
import { MetaLabel, EmptyState } from "@/app/components/ui/zaki";
import { SPACE_SWATCHES, DEFAULT_SPACE_SWATCH } from "../spaceSwatches";

interface SpaceDetailViewProps {
  spaceDetail: Space;
  attachments: File[];
  setAttachments: (value: File[] | ((prev: File[]) => File[])) => void;
  isStreaming: boolean;
  queryModeEnabled: boolean;
  onToggleQueryMode: () => void;
  onSend: (text: string, files: File[]) => void;
  onGoToSpaces: () => void;
  onGoToThread: (spaceId: string, threadId: string) => void;
  onCreateThread: (spaceId: string) => void;
  onUpdateSpace: (id: string, updates: Partial<Space>) => void;
  onDeleteThread: (threadId: string) => void;
  onEditInstructions: (instructions: string) => void;
  onUploadFiles: () => void;
}

const iconOptions = [
  { id: "folder", icon: Folder },
  { id: "briefcase", icon: Briefcase },
  { id: "book", icon: BookOpen },
  { id: "graduation", icon: GraduationCap },
  { id: "sparkles", icon: Sparkles },
  { id: "palette", icon: Palette },
  { id: "file", icon: FileText },
];

const colorOptions = SPACE_SWATCHES;

const fileStatusTone: Record<PinnedFileStatus, { chip: string; labelKey: string; dot: string }> = {
  embedded: {
    chip: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    labelKey: "spaceDetailView.fileStatus.embedded",
    dot: "bg-emerald-500",
  },
  processing: {
    chip: "bg-amber-50 text-amber-700 border border-amber-200",
    labelKey: "spaceDetailView.fileStatus.processing",
    dot: "bg-amber-500",
  },
  failed: {
    chip: "bg-rose-50 text-rose-700 border border-rose-200",
    labelKey: "spaceDetailView.fileStatus.failed",
    dot: "bg-rose-500",
  },
};

export function SpaceDetailView({
  spaceDetail,
  attachments,
  setAttachments,
  isStreaming,
  queryModeEnabled,
  onToggleQueryMode,
  onSend,
  onGoToSpaces,
  onGoToThread,
  onCreateThread,
  onUpdateSpace,
  onDeleteThread,
  onEditInstructions,
  onUploadFiles,
}: SpaceDetailViewProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir?.() === "rtl" || i18n.language?.startsWith("ar");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const iconPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!iconPickerOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!iconPickerRef.current) return;
      if (!iconPickerRef.current.contains(event.target as Node)) {
        setIconPickerOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIconPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [iconPickerOpen]);

  return (
    <div className="px-4 sm:px-6 md:px-10 py-8 max-w-6xl mx-auto w-full" dir={isRtl ? "rtl" : "ltr"}>
      <button
        type="button"
        className="text-xs text-zaki-muted hover:text-zaki-secondary mb-4 focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2 rounded px-2 py-1"
        onClick={onGoToSpaces}
        aria-label={t("spaceDetailView.backToSpaces")}
      >
        {isRtl ? "→ " : "← "}
        {t("spaceDetailView.backToSpaces")}
      </button>
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <div className="relative">
          <button
            type="button"
            className="size-12 rounded-[3px] border border-zaki-subtle bg-zaki-sunken flex items-center justify-center"
            onClick={() => {
              if (!spaceDetail.fixed) {
                setIconPickerOpen((open) => !open);
              }
            }}
            aria-haspopup="menu"
            aria-expanded={iconPickerOpen}
          >
            {(() => {
              const Icon = iconOptions.find((option) => option.id === (spaceDetail.icon ?? "folder"))?.icon ?? Folder;
              return <Icon className="size-5" style={{ color: spaceDetail.color ?? DEFAULT_SPACE_SWATCH }} />;
            })()}
          </button>
          {iconPickerOpen && !spaceDetail.fixed && (
            <div
              ref={iconPickerRef}
              className="absolute top-14 left-0 z-30 w-[min(240px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-[3px] border border-zaki-subtle bg-white p-3 text-zaki-primary"
            >
              <div className="text-2xs text-zaki-muted font-semibold uppercase tracking-wider mb-3">
                {t("spaceDetailView.appearance")}
              </div>
              <div className="flex items-center gap-2 mb-3">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="size-6 rounded-[2px] border border-zaki-subtle hover:scale-105 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      onUpdateSpace(spaceDetail.id, { color });
                      setIconPickerOpen(false);
                    }}
                  />
                ))}
              </div>
              <div className="h-px bg-zaki-subtle mb-3" />
              <div className="grid grid-cols-6 gap-2">
                {iconOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="size-8 rounded-lg hover:bg-zaki-hover flex items-center justify-center"
                    onClick={() => {
                      onUpdateSpace(spaceDetail.id, { icon: option.id });
                      setIconPickerOpen(false);
                    }}
                  >
                    <option.icon className="size-4 text-zaki-muted" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className={`flex items-center gap-2 ${isRtl ? "justify-end" : ""}`}>
            <div className="text-lg font-semibold text-zaki-primary">{spaceDetail.title}</div>
            <span className="text-2xs uppercase tracking-wide rounded-[2px] bg-zaki-sunken text-zaki-secondary px-2 py-0.5">
              {t("spaceDetailView.privateBadge")}
            </span>
          </div>
          <div className={`text-sm text-zaki-disabled mt-1 ${isRtl ? "text-right" : ""}`}>
            {spaceDetail.description}
          </div>
        </div>
        <button
          type="button"
          className="zaki-btn w-full md:w-auto bg-zaki-secondary text-white hover:bg-zaki-brand active:scale-[0.98] transition-[transform,background-color]"
          onClick={() => onCreateThread(spaceDetail.id)}
        >
          {t("spaceDetailView.newChat")}
        </button>
      </div>
      <div className="mt-6">
        <InputArea
          onSend={onSend}
          attachments={attachments}
          setAttachments={setAttachments}
          isSending={isStreaming}
          queryModeEnabled={queryModeEnabled}
          onToggleQueryMode={onToggleQueryMode}
        />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[3px] border border-zaki-subtle bg-white/90 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <MetaLabel>{t("spaceDetailView.projectFiles.title")}</MetaLabel>
              <div className={`text-sm mt-1 ${spaceDetail.fixed ? "text-zaki-disabled" : "text-zaki-primary"}`}>
                {spaceDetail.fixed
                  ? t("spaceDetailView.projectFiles.fixed")
                  : t("spaceDetailView.projectFiles.count", { count: spaceDetail.pinnedFiles?.length ?? 0 })}
              </div>
            </div>
            {!spaceDetail.fixed && (
              <button
                type="button"
                className="zaki-btn-sm bg-white border border-zaki-subtle text-zaki-secondary hover:bg-zaki-hover"
                onClick={onUploadFiles}
              >
                {t("spaceDetailView.projectFiles.upload")}
              </button>
            )}
          </div>
          {!spaceDetail.fixed && (
            <div className="mt-4 space-y-2">
              {(spaceDetail.pinnedFiles ?? []).length > 0 ? (
                (spaceDetail.pinnedFiles ?? []).map((file) => {
                  const status = file.status ?? "embedded";
                  const tone = fileStatusTone[status];
                  return (
                    <div
                      key={`${file.name}:${file.size}:${file.type}`}
                      className="flex items-start justify-between gap-3 rounded-[2px] border border-zaki-subtle bg-zaki-raised/70 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-zaki-primary">{file.name}</div>
                        <div className="mt-1 flex items-center gap-2 text-2xs text-zaki-muted">
                          <span className={`size-1.5 rounded-full ${tone.dot}`} />
                          <span>{file.type || t("spaceDetailView.projectFiles.documentTypeFallback")}</span>
                        </div>
                        {status === "failed" && file.error && (
                          <div className="mt-1 text-2xs text-rose-700">{file.error}</div>
                        )}
                      </div>
                      <span className={`shrink-0 rounded-[2px] px-2 py-1 text-2xs font-semibold ${tone.chip}`}>
                        {t(tone.labelKey)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  icon={<FileText className="size-4" />}
                  title={t("spaceDetailView.projectFiles.empty")}
                  compact
                />
              )}
            </div>
          )}
        </div>
        <div className="rounded-[3px] border border-zaki-subtle bg-white/90 p-4 md:p-5">
          <div className="flex items-center justify-between">
            <div>
              <MetaLabel>{t("spaceDetailView.instructions.title")}</MetaLabel>
              <div className={`text-sm mt-1 ${spaceDetail.fixed ? "text-zaki-disabled" : "text-zaki-primary"} line-clamp-2`}>
                {spaceDetail.fixed
                  ? t("spaceDetailView.instructions.fixed")
                  : (spaceDetail.instructions || t("spaceDetailView.instructions.empty"))}
              </div>
            </div>
            {!spaceDetail.fixed && (
              <button
                type="button"
                className="zaki-btn-sm bg-white border border-zaki-subtle text-zaki-secondary hover:bg-zaki-hover"
                onClick={() => onEditInstructions(spaceDetail.instructions || "")}
                aria-label={t("spaceDetailView.instructions.editAria")}
              >
                {t("spaceDetailView.instructions.edit")}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[3px] border border-zaki bg-zaki-raised p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <MetaLabel>{t("spaceDetailView.threads.title")}</MetaLabel>
          <div className="text-2xs text-zaki-muted">
            {t("spaceDetailView.threads.total", { count: (spaceDetail.threads ?? []).length })}
          </div>
        </div>
        <div className="flex flex-col divide-y divide-zaki-subtle">
          {(spaceDetail.threads ?? []).map((thread) => (
            <div
              key={thread.id}
              role="button"
              tabIndex={0}
              className="group flex items-center justify-between px-2 py-3 text-sm text-zaki-primary hover:bg-zaki-hover rounded-[2px] transition-colors"
              onClick={() => onGoToThread(spaceDetail.id, thread.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onGoToThread(spaceDetail.id, thread.id);
                }
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="size-2 rounded-full bg-zaki-accent/40 group-hover:bg-zaki-accent transition-colors" />
                <span className="font-medium text-left truncate">{thread.label}</span>
              </div>
              <div className="flex items-center gap-3">
                {spaceDetail.fixed && (
                  <button
                    type="button"
                    className="text-2xs text-zaki-brand hover:text-zaki-brand"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteThread(thread.id);
                    }}
                  >
                    {t("spaceDetailView.threads.delete")}
                  </button>
                )}
              </div>
            </div>
          ))}
          {(!spaceDetail.threads || spaceDetail.threads.length === 0) && (
            <EmptyState
              icon={<BookOpen className="size-4" />}
              title={t("spaceDetailView.threads.empty")}
              compact
            />
          )}
        </div>
      </div>
    </div>
  );
}
