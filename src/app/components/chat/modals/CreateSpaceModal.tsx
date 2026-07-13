import { useEffect, useState } from "react";
import { X } from "lucide-react";
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
  initialValues?: {
    name?: string;
    description?: string;
    instructions?: string;
  } | null;
}

export function CreateSpaceModal({
  isOpen,
  onClose,
  onCreate,
  initialValues,
}: CreateSpaceModalProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir?.() === "rtl" || i18n.language?.startsWith("ar");
  const [spaceName, setSpaceName] = useState("");
  const [spaceDescription, setSpaceDescription] = useState("");
  const [spaceInstructions, setSpaceInstructions] = useState("");

  // Pre-fill from initialValues when modal opens
  useEffect(() => {
    if (isOpen && initialValues) {
      setSpaceName(initialValues.name ?? "");
      setSpaceDescription(initialValues.description ?? "");
      setSpaceInstructions(initialValues.instructions ?? "");
    }
  }, [isOpen, initialValues]);

  if (!isOpen) return null;

  const handleCreate = () => {
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
      className="w-full max-w-[460px] overflow-hidden"
      containerClassName="items-start overflow-y-auto py-6 sm:items-center sm:py-4"
    >
      <div className="max-h-[calc(100vh-3rem)] overflow-y-auto px-5 py-5 sm:px-6" dir={isRtl ? "rtl" : "ltr"}>
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
              className="mt-1 w-full rounded-zaki-md border border-zaki-strong px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus resize-none"
              rows={3}
              value={spaceInstructions}
              onChange={(event) => setSpaceInstructions(event.target.value)}
              placeholder={t("createSpaceModal.placeholders.instructions")}
            />
          </label>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            className="zaki-spaces-btn zaki-spaces-btn--secondary w-full sm:w-auto"
            onClick={onClose}
          >
            {t("createSpaceModal.actions.cancel")}
          </button>
          <button
            type="button"
            className="zaki-spaces-btn zaki-spaces-btn--primary zaki-pressable w-full sm:w-auto"
            onClick={handleCreate}
            disabled={spaceName.trim().length === 0}
          >
            {t("createSpaceModal.actions.create")}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
