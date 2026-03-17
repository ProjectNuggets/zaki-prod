import { Brain, FileText, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/app/components/ui/sheet";
import type { PinnedFile } from "@/types";

type FileStatusTone = {
  chip: string;
  label: string;
};

type SpaceTarget = {
  id: string;
  title: string;
  description?: string | null;
  pinnedFiles?: PinnedFile[] | null;
  fixed?: boolean;
};

type Props = {
  isOpen: boolean;
  space: SpaceTarget | null;
  descriptionDraft: string;
  onDescriptionChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  onEditInstructions: () => void;
  onUploadFiles: () => void;
  onRemoveFile: (file: PinnedFile) => void;
  onDelete: () => void;
  removingDocumentKey: string | null;
  fileStatusTone: Record<"embedded" | "processing" | "failed", FileStatusTone>;
};

export function SpaceSettingsSheet({
  isOpen,
  space,
  descriptionDraft,
  onDescriptionChange,
  onClose,
  onSave,
  onEditInstructions,
  onUploadFiles,
  onRemoveFile,
  onDelete,
  removingDocumentKey,
  fileStatusTone,
}: Props) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.toLowerCase().startsWith("ar");

  if (!isOpen || !space) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        hideCloseButton
        className="w-full max-w-[100vw] gap-0 border-l border-zaki-subtle bg-[#f7efe6] p-0 text-zaki-primary sm:max-w-[720px] dark:border-zaki-dark dark:bg-[#120e0b] dark:text-zaki-dark-primary"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top_right,rgba(229,106,84,0.18),transparent_58%),radial-gradient(circle_at_top_left,rgba(33,145,113,0.12),transparent_52%)]" />

        <div className="relative flex h-full flex-col">
          <div className="sticky top-0 z-20 border-b border-zaki-subtle/80 bg-[#f7efe6]/95 px-5 py-4 backdrop-blur dark:border-zaki-dark dark:bg-[#120e0b]/95">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-zaki-subtle bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:border-zaki-dark dark:bg-[#1a140f] dark:text-zaki-dark-muted">
                  {t("sidebar.spaceSettings")}
                </div>
                <SheetTitle className="mt-3 text-2xl font-semibold tracking-tight text-zaki-primary dark:text-zaki-dark-primary">
                  {space.title}
                </SheetTitle>
                <SheetDescription className="mt-2 max-w-[52ch] text-sm leading-6 text-zaki-secondary dark:text-zaki-dark-subtle">
                  {t("sidebar.spaceSettingsSubtitle")}
                </SheetDescription>
              </div>
              <button
                type="button"
                className="inline-flex size-10 items-center justify-center rounded-2xl border border-zaki-subtle bg-white/80 text-zaki-muted transition-colors hover:bg-zaki-hover hover:text-zaki-primary dark:border-zaki-dark dark:bg-[#18120d] dark:text-zaki-dark-muted dark:hover:bg-[#211812] dark:hover:text-zaki-dark-primary"
                onClick={onClose}
                aria-label={t("sidebar.spaceSettings")}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="relative flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-5">
              <section className="rounded-[24px] border border-zaki-subtle/80 bg-white/92 p-4 shadow-[0px_16px_34px_rgba(15,15,15,0.06)] dark:border-zaki-dark dark:bg-[#18120d]">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zaki-muted dark:text-zaki-dark-muted">
                  {t("sidebar.basics")}
                </div>
                <label className="mt-3 block">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zaki-muted dark:text-zaki-dark-muted">
                    {isRtl ? "الوصف" : "Description"}
                  </span>
                  <textarea
                    className="mt-2 w-full rounded-[18px] border border-zaki-subtle bg-[#fff9f3] px-3 py-3 text-sm text-zaki-secondary outline-none focus-visible:ring-2 focus-visible:ring-zaki-brand dark:border-zaki-dark dark:bg-[#120e0b] dark:text-zaki-dark-subtle"
                    rows={4}
                    maxLength={200}
                    value={descriptionDraft}
                    onChange={(event) => onDescriptionChange(event.target.value)}
                    placeholder={
                      isRtl
                        ? "صف ما الذي خُصصت له هذه المساحة..."
                        : "Describe what this space is for..."
                    }
                  />
                  <div className="mt-2 text-right text-[11px] text-zaki-muted dark:text-zaki-dark-muted">
                    {descriptionDraft.length}/200
                  </div>
                </label>
              </section>

              <section className="rounded-[24px] border border-zaki-subtle/80 bg-white/92 p-4 shadow-[0px_16px_34px_rgba(15,15,15,0.06)] dark:border-zaki-dark dark:bg-[#18120d]">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zaki-muted dark:text-zaki-dark-muted">
                  {t("sidebar.sharedContext")}
                </div>
                <p className="mt-2 text-xs leading-5 text-zaki-muted dark:text-zaki-dark-muted">
                  {t("sidebar.sharedContextSubtitle")}
                </p>
                <div className="mt-4 grid gap-3">
                  <button
                    type="button"
                    className="w-full rounded-[18px] border border-zaki-subtle bg-[#fff9f3] px-3.5 py-3 text-left transition-colors hover:border-zaki-brand/30 hover:bg-white dark:border-zaki-dark dark:bg-[#120e0b] dark:hover:bg-[#17110d]"
                    onClick={onEditInstructions}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                          {t("sidebar.instructionsTitle")}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-zaki-muted dark:text-zaki-dark-muted">
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
                    className="w-full rounded-[18px] border border-zaki-subtle bg-[#fff9f3] px-3.5 py-3 text-left transition-colors hover:border-zaki-brand/30 hover:bg-white dark:border-zaki-dark dark:bg-[#120e0b] dark:hover:bg-[#17110d]"
                    onClick={onUploadFiles}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                          {t("sidebar.knowledgeFilesTitle")}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-zaki-muted dark:text-zaki-dark-muted">
                          {t("sidebar.knowledgeFilesBody")}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-zaki-sunken px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zaki-secondary dark:bg-zaki-dark-card dark:text-zaki-dark-subtle">
                        {t("sidebar.filesBadge", { count: space.pinnedFiles?.length ?? 0 })}
                      </span>
                    </div>
                  </button>
                </div>
              </section>

              <section className="rounded-[24px] border border-zaki-subtle/80 bg-white/92 p-4 shadow-[0px_16px_34px_rgba(15,15,15,0.06)] dark:border-zaki-dark dark:bg-[#18120d]">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zaki-muted dark:text-zaki-dark-muted">
                  {t("sidebar.contextSummaryTitle")}
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-3 rounded-[18px] border border-zaki-subtle bg-[#fff9f3] px-3.5 py-3 dark:border-zaki-dark dark:bg-[#120e0b]">
                    <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-zaki-brand shadow-sm dark:bg-zaki-dark-card">
                      <Brain className="size-4" />
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                        {t("sidebar.contextSummaryMemoryLabel")}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-zaki-muted dark:text-zaki-dark-muted">
                        {t("sidebar.contextSummaryMemoryBody")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-[18px] border border-zaki-subtle bg-[#fff9f3] px-3.5 py-3 dark:border-zaki-dark dark:bg-[#120e0b]">
                    <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-zaki-brand shadow-sm dark:bg-zaki-dark-card">
                      <FileText className="size-4" />
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                        {t("sidebar.contextSummarySpaceLabel")}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-zaki-muted dark:text-zaki-dark-muted">
                        {t("sidebar.contextSummarySpaceBody")}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[24px] border border-zaki-subtle/80 bg-white/92 p-4 shadow-[0px_16px_34px_rgba(15,15,15,0.06)] dark:border-zaki-dark dark:bg-[#18120d]">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zaki-muted dark:text-zaki-dark-muted">
                  {t("sidebar.workspaceFilesTitle")}
                </div>
                <div className="mt-4 space-y-2">
                  {(space.pinnedFiles ?? []).length > 0 ? (
                    (space.pinnedFiles ?? []).map((file) => {
                      const status = file.status ?? "embedded";
                      const tone = fileStatusTone[status];
                      const removeKey = `${space.id}:${String(file.location || "")}`;
                      return (
                        <div
                          key={`${file.name}:${file.size}:${file.type}:${file.location ?? ""}`}
                          className="flex items-start justify-between gap-3 rounded-[18px] border border-zaki-subtle bg-[#fff9f3] px-3.5 py-3 dark:border-zaki-dark dark:bg-[#120e0b]"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-zaki-primary dark:text-zaki-dark-primary">
                              {file.name}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zaki-muted dark:text-zaki-dark-muted">
                              <span>{file.type || "document"}</span>
                              <span className={`rounded-full px-2 py-0.5 font-semibold ${tone.chip}`}>
                                {tone.label}
                              </span>
                            </div>
                            {status === "failed" && file.error ? (
                              <div className="mt-1 text-[11px] text-rose-700">{file.error}</div>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            className="shrink-0 rounded-full border border-zaki-subtle px-2.5 py-1 text-[11px] text-zaki-secondary hover:bg-zaki-hover disabled:opacity-50 dark:border-zaki-dark dark:text-zaki-dark-subtle dark:hover:bg-zaki-dark-hover"
                            onClick={() => onRemoveFile(file)}
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
                    <div className="rounded-[18px] border border-dashed border-zaki-subtle px-3 py-3 text-sm text-zaki-muted dark:border-zaki-dark dark:text-zaki-dark-muted">
                      {t("sidebar.workspaceFilesEmpty")}
                    </div>
                  )}
                </div>
              </section>

              {!space.fixed ? (
                <section className="rounded-[24px] border border-rose-200/80 bg-rose-50/60 p-4 dark:border-rose-900/40 dark:bg-rose-950/10">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700/90 dark:text-rose-300">
                    {t("sidebar.dangerZone")}
                  </div>
                  <div className="mt-2 text-xs leading-5 text-rose-800/80 dark:text-rose-200/80">
                    {t("sidebar.dangerZoneBody")}
                  </div>
                  <button
                    type="button"
                    className="mt-4 w-full rounded-[18px] border border-rose-200 bg-white px-3 py-2 text-left text-sm text-zaki-brand transition-colors hover:bg-[rgba(210,68,48,0.08)] dark:border-rose-900/40 dark:bg-zaki-dark-card"
                    onClick={onDelete}
                  >
                    Delete space
                  </button>
                </section>
              ) : null}
            </div>
          </div>

          <div className="sticky bottom-0 z-20 border-t border-zaki-subtle/80 bg-[#f7efe6]/95 px-5 py-4 backdrop-blur dark:border-zaki-dark dark:bg-[#120e0b]/95">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-zaki-muted dark:text-zaki-dark-muted">
                {t("sidebar.spaceSettingsSubtitle")}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="zaki-btn zaki-btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="zaki-btn bg-zaki-accent text-white transition-colors hover:bg-zaki-accent-hover"
                  onClick={onSave}
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
