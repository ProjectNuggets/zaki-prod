import { useState } from "react";
import { File as FileIcon, X } from "lucide-react";
import { ModalShell } from "@/app/components/ui/ModalShell";
import { useTranslation } from "react-i18next";

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    description: string;
    instructions: string;
    pinnedFiles: { name: string; type: string; size: number }[];
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
  const [spaceFiles, setSpaceFiles] = useState<File[]>([]);

  if (!isOpen) return null;

  const handleCreate = () => {
    onCreate({
      name: spaceName,
      description: spaceDescription,
      instructions: spaceInstructions,
      pinnedFiles: spaceFiles.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
      })),
    });
    setSpaceName("");
    setSpaceDescription("");
    setSpaceInstructions("");
    setSpaceFiles([]);
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
          <div className="text-xs text-zaki-muted">
            {t("createSpaceModal.fields.pinnedDocuments")}
            <div className="mt-2 flex flex-col gap-2">
              <label className="w-full rounded-zaki-md border border-dashed border-zaki-strong px-3 py-2 text-sm text-zaki-secondary hover:bg-zaki-hover transition-colors cursor-pointer">
                {t("createSpaceModal.fields.uploadDocuments")}
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    if (files.length) {
                      setSpaceFiles((prev) => [...prev, ...files]);
                    }
                    event.target.value = "";
                  }}
                />
              </label>
              {spaceFiles.length > 0 && (
                <div className="flex flex-col gap-2">
                  {spaceFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between rounded-zaki-md border border-zaki bg-zaki-elevated px-3 py-2 text-xs text-zaki-secondary"
                    >
                      <div className="flex items-center gap-2">
                        <FileIcon className="size-4 text-zaki-muted" />
                        <span className="max-w-[200px] truncate">{file.name}</span>
                      </div>
                      <button
                        type="button"
                        className="text-zaki-muted hover:text-zaki-secondary"
                        onClick={() =>
                          setSpaceFiles((prev) => prev.filter((_, i) => i !== index))
                        }
                        aria-label={t("createSpaceModal.removeFileAria", { name: file.name })}
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
          >
            {t("createSpaceModal.actions.create")}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
