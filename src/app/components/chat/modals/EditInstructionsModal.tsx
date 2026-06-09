import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { ModalShell } from "@/app/components/ui/ModalShell";

interface EditInstructionsModalProps {
  isOpen: boolean;
  initialValue: string;
  onClose: () => void;
  onSave: (instructions: string) => void;
}

export function EditInstructionsModal({
  isOpen,
  initialValue,
  onClose,
  onSave,
}: EditInstructionsModalProps) {
  const [value, setValue] = useState(initialValue);

  // Sync initial value when modal opens
  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Edit instructions"
      className="w-full max-w-[460px] overflow-hidden"
      containerClassName="items-start overflow-y-auto py-6 sm:items-center sm:py-4"
    >
      <div className="max-h-[calc(100vh-3rem)] overflow-y-auto px-5 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg font-semibold text-zaki-primary dark:text-zaki-dark-primary">
            Edit instructions
          </div>
          <button
            type="button"
            className="zaki-icon-btn size-9"
            onClick={onClose}
            aria-label="Close instructions edit"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4">
          <textarea
            className="w-full rounded-zaki-md border border-zaki-strong px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus resize-none"
            rows={4}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            className="zaki-spaces-btn zaki-spaces-btn--secondary w-full sm:w-auto"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="zaki-spaces-btn zaki-spaces-btn--primary w-full sm:w-auto"
            onClick={() => {
              onSave(value);
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
