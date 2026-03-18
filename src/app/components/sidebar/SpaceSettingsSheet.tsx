import { Brain, FileText, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/app/components/ui/sheet";
import { cn } from "@/lib/utils";
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
  nameDraft: string;
  onNameChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  onEditInstructions: () => void;
  onUploadFiles: () => void;
  onRemoveFile: (file: PinnedFile) => void;
  onDelete: () => void;
  removingDocumentKey: string | null;
  fileStatusTone: Record<"embedded" | "processing" | "failed", FileStatusTone>;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zaki-muted dark:text-zaki-dark-muted">
      {children}
    </div>
  );
}

export function SpaceSettingsSheet({
  isOpen,
  space,
  nameDraft,
  onNameChange,
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
        side={isRtl ? "left" : "right"}
        hideCloseButton
        dir={isRtl ? "rtl" : "ltr"}
        className="w-full max-w-[100vw] gap-0 border-l border-[#eadcca] bg-[#f6f1ea] p-0 text-zaki-primary sm:max-w-[720px] dark:border-[#2b2119] dark:bg-[#120e0b] dark:text-zaki-dark-primary"
      >
        <div className="relative flex h-full flex-col">
          <div className="sticky top-0 z-20 border-b border-[#e7d8c6] bg-[#f6f1ea]/96 px-5 py-4 backdrop-blur dark:border-[#2b2119] dark:bg-[#120e0b]/95">
            <div className={cn("flex items-start justify-between gap-4", isRtl && "flex-row-reverse")}>
              <div className={cn("min-w-0", isRtl && "text-right")}>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#e6d8c8] bg-white/88 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:border-[#2d231b] dark:bg-[#1a140f] dark:text-zaki-dark-muted">
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
                className="inline-flex size-10 items-center justify-center rounded-2xl border border-[#e6d8c8] bg-white/88 text-zaki-muted transition-colors hover:bg-[#f0e8de] hover:text-zaki-primary dark:border-[#2d231b] dark:bg-[#18120d] dark:text-zaki-dark-muted dark:hover:bg-[#211812] dark:hover:text-zaki-dark-primary"
                onClick={onClose}
                aria-label={isRtl ? "إغلاق إعدادات المساحة" : "Close space settings"}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="relative flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-8">
              <section className="border-b border-[#e6d8c8] pb-6 dark:border-[#2b2119]">
                <label className="block">
                  <SectionLabel>{isRtl ? "اسم المساحة" : "Space name"}</SectionLabel>
                  <input
                    className="mt-2 w-full rounded-2xl border border-[#ddd0c1] bg-white px-4 py-3 text-sm text-zaki-primary outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zaki-brand dark:border-[#2b2119] dark:bg-[#17120f] dark:text-zaki-dark-primary"
                    type="text"
                    maxLength={80}
                    value={nameDraft}
                    onChange={(event) => onNameChange(event.target.value)}
                  placeholder={
                    isRtl ? "اكتب اسمًا واضحًا للمساحة" : "Give this space a clear name"
                  }
                />
                </label>
              </section>

              <section className="border-b border-[#e6d8c8] pb-6 dark:border-[#2b2119]">
                <SectionLabel>{t("sidebar.sharedContext")}</SectionLabel>
                <p className="mt-2 text-xs leading-5 text-zaki-muted dark:text-zaki-dark-muted">
                  {t("sidebar.sharedContextSubtitle")}
                </p>
                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    className={cn(
                      "w-full rounded-2xl border border-[#e1d4c6] bg-white px-4 py-3 transition-colors hover:border-zaki-brand/30 hover:bg-[#fcfaf7] dark:border-[#2b2119] dark:bg-[#17120f] dark:hover:bg-[#1b1511]",
                      isRtl ? "text-right" : "text-left"
                    )}
                    onClick={onEditInstructions}
                  >
                    <div className={cn("flex items-start justify-between gap-3", isRtl && "flex-row-reverse")}>
                      <div className={cn("min-w-0", isRtl && "text-right")}>
                        <div className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                          {t("sidebar.instructionsTitle")}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-zaki-muted dark:text-zaki-dark-muted">
                          {t("sidebar.instructionsBody")}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#f2e9de] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zaki-secondary dark:bg-[#221a15] dark:text-zaki-dark-subtle">
                        {t("sidebar.editAction")}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={cn(
                      "w-full rounded-2xl border border-[#e1d4c6] bg-white px-4 py-3 transition-colors hover:border-zaki-brand/30 hover:bg-[#fcfaf7] dark:border-[#2b2119] dark:bg-[#17120f] dark:hover:bg-[#1b1511]",
                      isRtl ? "text-right" : "text-left"
                    )}
                    onClick={onUploadFiles}
                  >
                    <div className={cn("flex items-start justify-between gap-3", isRtl && "flex-row-reverse")}>
                      <div className={cn("min-w-0", isRtl && "text-right")}>
                        <div className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                          {t("sidebar.knowledgeFilesTitle")}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-zaki-muted dark:text-zaki-dark-muted">
                          {t("sidebar.knowledgeFilesBody")}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#f2e9de] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zaki-secondary dark:bg-[#221a15] dark:text-zaki-dark-subtle">
                        {t("sidebar.filesBadge", { count: space.pinnedFiles?.length ?? 0 })}
                      </span>
                    </div>
                  </button>
                </div>
              </section>

              <section className="border-b border-[#e6d8c8] pb-6 dark:border-[#2b2119]">
                <SectionLabel>{t("sidebar.contextSummaryTitle")}</SectionLabel>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className={cn("flex items-start gap-3 rounded-2xl border border-[#e1d4c6] bg-white px-4 py-3 dark:border-[#2b2119] dark:bg-[#17120f]", isRtl && "flex-row-reverse text-right")}>
                    <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f6efe6] text-zaki-brand dark:bg-[#221913]">
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
                  <div className={cn("flex items-start gap-3 rounded-2xl border border-[#e1d4c6] bg-white px-4 py-3 dark:border-[#2b2119] dark:bg-[#17120f]", isRtl && "flex-row-reverse text-right")}>
                    <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f6efe6] text-zaki-brand dark:bg-[#221913]">
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

              <section className="border-b border-[#e6d8c8] pb-6 dark:border-[#2b2119]">
                <SectionLabel>{t("sidebar.workspaceFilesTitle")}</SectionLabel>
                <div className="mt-4 space-y-2">
                  {(space.pinnedFiles ?? []).length > 0 ? (
                    (space.pinnedFiles ?? []).map((file) => {
                      const status = file.status ?? "embedded";
                      const tone = fileStatusTone[status];
                      const removeKey = `${space.id}:${String(file.location || "")}`;
                      return (
                        <div
                          key={`${file.name}:${file.size}:${file.type}:${file.location ?? ""}`}
                          className={cn(
                            "flex items-start justify-between gap-3 rounded-2xl border border-[#e1d4c6] bg-white px-4 py-3 dark:border-[#2b2119] dark:bg-[#17120f]",
                            isRtl && "flex-row-reverse text-right"
                          )}
                        >
                          <div className={cn("min-w-0", isRtl && "text-right")}>
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
                            className="shrink-0 rounded-full border border-[#ddd0c1] px-2.5 py-1 text-[11px] text-zaki-secondary hover:bg-[#f3ebe1] disabled:opacity-50 dark:border-[#2b2119] dark:text-zaki-dark-subtle dark:hover:bg-[#211914]"
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
                    <div className="rounded-2xl border border-dashed border-[#dfd1c2] bg-[#fbf8f4] px-4 py-4 text-sm text-zaki-muted dark:border-[#2b2119] dark:bg-[#140f0c] dark:text-zaki-dark-muted">
                      {t("sidebar.workspaceFilesEmpty")}
                    </div>
                  )}
                </div>
              </section>

              {!space.fixed ? (
                <section className="rounded-2xl border border-rose-200/80 bg-[rgba(210,68,48,0.05)] p-4 dark:border-rose-900/40 dark:bg-rose-950/10">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700/90 dark:text-rose-300">
                    {t("sidebar.dangerZone")}
                  </div>
                  <div className="mt-2 text-xs leading-5 text-rose-800/80 dark:text-rose-200/80">
                    {t("sidebar.dangerZoneBody")}
                  </div>
                  <button
                    type="button"
                    className={cn(
                      "mt-4 w-full rounded-2xl border border-rose-200 bg-[#fff9f7] px-4 py-3 text-sm text-zaki-brand transition-colors hover:bg-[rgba(210,68,48,0.08)] dark:border-rose-900/40 dark:bg-zaki-dark-card",
                      isRtl ? "text-right" : "text-left"
                    )}
                    onClick={onDelete}
                  >
                    Delete space
                  </button>
                </section>
              ) : null}
            </div>
          </div>

          <div className="sticky bottom-0 z-20 border-t border-[#e7d8c6] bg-[#f6f1ea]/96 px-5 py-4 backdrop-blur dark:border-[#2b2119] dark:bg-[#120e0b]/95">
            <div className={cn("flex flex-wrap items-center gap-2", isRtl ? "justify-start" : "justify-end")}>
              <button type="button" className="zaki-btn zaki-btn-secondary" onClick={onClose}>
                {t("settingsModal.footer.cancel")}
              </button>
              <button
                type="button"
                className="zaki-btn bg-zaki-accent text-white transition-colors hover:bg-zaki-accent-hover"
                onClick={onSave}
              >
                {t("settingsModal.footer.saveChanges")}
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
