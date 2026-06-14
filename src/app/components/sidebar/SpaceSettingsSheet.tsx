import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  SheetShell,
  SectionHeader,
  TypeToConfirmDialog,
} from "@/app/components/ui/zaki";
import { COLOR_PICKER_FALLBACK_HEX } from "@/app/components/chat/spaceSwatches";
import type { PinnedFile } from "@/types";

type FileStatusTone = {
  chip: string;
  label: string;
};

type SpaceTarget = {
  id: string;
  title: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  instructions?: string | null;
  pinnedFiles?: PinnedFile[] | null;
  fixed?: boolean;
};

type SpaceSettingsDraft = {
  title: string;
  description: string;
  icon: string;
  color: string;
  instructions: string;
};

type Props = {
  isOpen: boolean;
  space: SpaceTarget | null;
  onClose: () => void;
  onSave: (draft: SpaceSettingsDraft) => void;
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
  onClose,
  onSave,
  onUploadFiles,
  onRemoveFile,
  onDelete,
  removingDocumentKey,
  fileStatusTone,
}: Props) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.toLowerCase().startsWith("ar");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [draft, setDraft] = useState<SpaceSettingsDraft>({
    title: "",
    description: "",
    icon: "",
    color: "",
    instructions: "",
  });

  useEffect(() => {
    if (!space || !isOpen) return;
    setDraft({
      title: space.title || "",
      description: space.description || "",
      icon: space.icon || "",
      color: space.color || "",
      instructions: space.instructions || "",
    });
  }, [isOpen, space]);

  if (!isOpen || !space) return null;

  return (
    <>
      <SheetShell
        isOpen={isOpen}
        onClose={onClose}
        title={space.title}
        subtitle={t("sidebar.spaceSettingsSubtitle")}
        width="md"
        side={isRtl ? "left" : "right"}
        footer={
          <div className={cn("flex flex-wrap items-center gap-2", isRtl ? "justify-start" : "justify-end")}>
            <button type="button" className="zaki-spaces-btn zaki-spaces-btn--secondary" onClick={onClose}>
              {t("settingsModal.footer.cancel")}
            </button>
            <button
              type="button"
              className="zaki-spaces-btn zaki-spaces-btn--primary"
              onClick={() => onSave({
                title: draft.title.trim(),
                description: draft.description.trim(),
                icon: draft.icon.trim(),
                color: draft.color.trim(),
                instructions: draft.instructions.trim(),
              })}
              disabled={!draft.title.trim()}
            >
              {t("settingsModal.footer.saveChanges")}
            </button>
          </div>
        }
      >
        <div className="space-y-8" dir={isRtl ? "rtl" : "ltr"}>
          <section className="space-y-3">
            <SectionHeader title={isRtl ? "الهوية" : "Identity"} />
            <label className="block">
              <SectionLabel>{isRtl ? "اسم المساحة" : "Space name"}</SectionLabel>
              <input
                className="mt-2 w-full rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-3 text-sm text-zaki-primary outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zaki-brand"
                type="text"
                maxLength={80}
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
                placeholder={
                  isRtl ? "اكتب اسمًا واضحًا للمساحة" : "Give this space a clear name"
                }
              />
            </label>
            <label className="block">
              <SectionLabel>{isRtl ? "الوصف" : "Description"}</SectionLabel>
              <textarea
                className="mt-2 min-h-[84px] w-full rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-3 text-sm text-zaki-primary outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zaki-brand"
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
                placeholder={isRtl ? "ماذا يحدث داخل هذه المساحة؟" : "What is this space for?"}
              />
            </label>
            {!space.fixed ? (
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <label className="block">
                  <SectionLabel>{isRtl ? "الأيقونة" : "Icon"}</SectionLabel>
                  <input
                    className="mt-2 w-full rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-3 text-sm text-zaki-primary outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zaki-brand"
                    type="text"
                    maxLength={12}
                    value={draft.icon}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, icon: event.target.value }))
                    }
                    placeholder={isRtl ? "رمز قصير" : "Short icon"}
                  />
                </label>
                <label className="block">
                  <SectionLabel>{isRtl ? "اللون" : "Color"}</SectionLabel>
                  <input
                    className="mt-2 h-[46px] w-full min-w-[96px] rounded-zaki-lg border border-zaki bg-zaki-raised px-2 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zaki-brand"
                    type="color"
                    value={
                      /^#[0-9a-f]{6}$/i.test(draft.color.trim())
                        ? draft.color.trim()
                        : COLOR_PICKER_FALLBACK_HEX
                    }
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, color: event.target.value }))
                    }
                  />
                </label>
              </div>
            ) : null}
          </section>

          <section className="space-y-3">
            <SectionHeader title={t("sidebar.sharedContext")} subtitle={t("sidebar.sharedContextSubtitle")} />
            <div className="space-y-3">
              <label className="block">
                <SectionLabel>{t("sidebar.instructionsTitle")}</SectionLabel>
                <textarea
                  className="mt-2 min-h-[116px] w-full rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-3 text-sm text-zaki-primary outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zaki-brand"
                  value={draft.instructions}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, instructions: event.target.value }))
                  }
                  placeholder={t("sidebar.instructionsBody")}
                />
              </label>

              <button
                type="button"
                className={cn(
                  "w-full rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-3 transition-colors hover:border-zaki-brand/30 hover:bg-zaki-hover",
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
                  <span className="shrink-0 rounded-full bg-zaki-sunken px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zaki-secondary">
                    {t("sidebar.filesBadge", { count: space.pinnedFiles?.length ?? 0 })}
                  </span>
                </div>
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeader title={t("sidebar.workspaceFilesTitle")} />
            <div className="space-y-2">
              {(space.pinnedFiles ?? []).length > 0 ? (
                (space.pinnedFiles ?? []).map((file) => {
                  const status = file.status ?? "embedded";
                  const tone = fileStatusTone[status];
                  const removeKey = `${space.id}:${String(file.location || "")}`;
                  return (
                    <div
                      key={`${file.name}:${file.size}:${file.type}:${file.location ?? ""}`}
                      className={cn(
                        "flex items-start justify-between gap-3 rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-3",
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
                        className="shrink-0 rounded-full border border-zaki px-2.5 py-1 text-[11px] text-zaki-secondary hover:bg-zaki-hover disabled:opacity-50"
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
                <div className="rounded-zaki-lg border border-dashed border-zaki bg-zaki-sunken px-4 py-4 text-sm text-zaki-muted">
                  {t("sidebar.workspaceFilesEmpty")}
                </div>
              )}
            </div>
          </section>

          {!space.fixed ? (
            <section className="space-y-3 rounded-zaki-lg border border-[var(--v2-accent-hairline)] bg-[var(--v2-danger-faint)] p-4">
              <SectionHeader title={t("sidebar.dangerZone")} subtitle={t("sidebar.dangerZoneBody")} />
              <button
                type="button"
                className={cn(
                  "w-full rounded-zaki-lg border border-[var(--v2-accent-hairline)] bg-zaki-raised px-4 py-3 text-sm text-zaki-brand transition-colors hover:bg-[var(--v2-accent-faint)]",
                  isRtl ? "text-right" : "text-left"
                )}
                onClick={() => setDeleteConfirmOpen(true)}
              >
                Delete space
              </button>
            </section>
          ) : null}
        </div>
      </SheetShell>

      <TypeToConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Delete space"
        body={`Deleting this space will remove the chat and content permanently. There is no way to retrieve the content of the deleted chats in this space after deletion.`}
        confirmPhrase={space.title || space.id}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          setDeleteConfirmOpen(false);
          onDelete();
        }}
      />
    </>
  );
}
