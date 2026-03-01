import { useState } from "react";
import { Info, X } from "lucide-react";
import { ModalShell } from "@/app/components/ui/ModalShell";
import { useTranslation } from "react-i18next";
import type { PinnedFile } from "@/types";

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    description: string;
    instructions: string;
    pinnedFiles: PinnedFile[];
  }) => void;
}

export function CreateSpaceModal({
  isOpen,
  onClose,
  onCreate,
}: CreateSpaceModalProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir?.() === "rtl" || i18n.language?.startsWith("ar");
  const [spaceName, setSpaceName] = useState("");
  const [spaceDescription, setSpaceDescription] = useState("");
  const [spaceInstructions, setSpaceInstructions] = useState("");

  if (!isOpen) return null;

  const handleCreate = () => {
    if (typeof window !== "undefined" && spaceName.trim().length > 0) {
      window.dispatchEvent(
        new CustomEvent("zaki:onboarding-space-submit", {
          detail: { name: spaceName.trim() },
        })
      );
    }
    onCreate({
      name: spaceName,
      description: spaceDescription,
      instructions: spaceInstructions,
      pinnedFiles: [],
    });
    setSpaceName("");
    setSpaceDescription("");
    setSpaceInstructions("");
    onClose();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={t("createSpaceModal.ariaLabel")}
      className="w-[460px]"
    >
      <div className="px-6 py-5" dir={isRtl ? "rtl" : "ltr"}>
        <div className={isRtl ? "flex items-start justify-between gap-3 flex-row-reverse" : "flex items-start justify-between gap-3"}>
          <div className={isRtl ? "text-right" : "text-left"}>
            <div className="text-lg font-semibold text-zaki-primary dark:text-zaki-dark-primary">
              {t("createSpaceModal.title")}
            </div>
            <div className="mt-1 text-sm text-zaki-disabled dark:text-zaki-dark-muted">
              {t("createSpaceModal.subtitle")}
            </div>
          </div>
          <button
            type="button"
            className="zaki-icon-btn size-9"
            onClick={onClose}
            aria-label={t("createSpaceModal.closeAria")}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-5 flex flex-col gap-3">
          <label className="text-xs text-zaki-muted">
            {t("createSpaceModal.fields.name")}
            <input
              data-onboarding-id="create-space-name-input"
              className="mt-1 w-full rounded-zaki-md border border-zaki-strong px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus"
              value={spaceName}
              onChange={(event) => setSpaceName(event.target.value)}
              placeholder={t("createSpaceModal.placeholders.name")}
            />
          </label>
          <label className="text-xs text-zaki-muted">
            {t("createSpaceModal.fields.description")}
            <textarea
              className="mt-1 w-full rounded-zaki-md border border-zaki-strong px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus resize-none"
              rows={3}
              value={spaceDescription}
              onChange={(event) => setSpaceDescription(event.target.value)}
              placeholder={t("createSpaceModal.placeholders.description")}
            />
          </label>
          <label className="text-xs text-zaki-muted">
            {t("createSpaceModal.fields.instructions")}
            <textarea
              data-onboarding-id="create-space-instructions-input"
              className="mt-1 w-full rounded-zaki-md border border-zaki-strong px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus resize-none"
              rows={3}
              value={spaceInstructions}
              onChange={(event) => setSpaceInstructions(event.target.value)}
              placeholder={t("createSpaceModal.placeholders.instructions")}
            />
          </label>
          <div className="rounded-[20px] border border-[#eadac7] bg-[linear-gradient(180deg,#fffaf3_0%,#fff6ec_100%)] px-3.5 py-3 dark:border-[#33271d] dark:bg-[linear-gradient(180deg,#17120e_0%,#130f0c_100%)]">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a7350] dark:text-[#c9b8a4]">
              <Info className="size-3.5 text-zaki-brand" />
              {t("createSpaceModal.scopeNotes.sectionLabel")}
            </div>
            <div className="space-y-2.5">
              <div
                data-onboarding-id="create-space-scope-space-note"
                className="rounded-[16px] border border-[#ead7bf] bg-white/80 px-3 py-2.5 text-xs leading-5 text-[#6b5240] dark:border-[#3a2b1f] dark:bg-[#1a1410] dark:text-[#d8c6b3]"
              >
                <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a7350] dark:text-[#c9b8a4]">
                  {t("createSpaceModal.scopeNotes.spaceWideLabel")}
                </span>
                <span className="mt-1 block">
                  {t("createSpaceModal.scopeNotes.spaceWideBody")}
                </span>
              </div>
              <div className="text-xs text-zaki-muted">
                {t("createSpaceModal.fields.pinnedDocuments")}
                <div
                  data-onboarding-id="create-space-documents-placeholder"
                  className="mt-2 rounded-zaki-md border border-dashed border-zaki-strong bg-white/70 px-3 py-2 text-sm text-zaki-secondary dark:bg-[#140f0c]"
                >
                  {t("createSpaceModal.fields.uploadDocuments")}
                </div>
              </div>
              <div
                data-onboarding-id="create-space-scope-thread-note"
                className="rounded-[16px] border border-[#eadfcf] bg-[#fffdf9] px-3 py-2.5 text-xs leading-5 text-[#6b5240] dark:border-[#33271d] dark:bg-[#120e0b] dark:text-[#d8c6b3]"
              >
                <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a7350] dark:text-[#c9b8a4]">
                  {t("createSpaceModal.scopeNotes.threadSpecificLabel")}
                </span>
                <span className="mt-1 block">
                  {t("createSpaceModal.scopeNotes.threadSpecificBody")}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            className="zaki-btn zaki-btn-secondary"
            onClick={onClose}
          >
            {t("createSpaceModal.actions.cancel")}
          </button>
          <button
            type="button"
            className="zaki-btn zaki-btn-primary zaki-pressable"
            onClick={handleCreate}
            disabled={spaceName.trim().length === 0}
            data-onboarding-id="create-space-submit"
          >
            {t("createSpaceModal.actions.create")}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
