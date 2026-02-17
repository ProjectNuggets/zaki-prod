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
      className="w-[460px]"
    >
      <div className="px-6 py-5">
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
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            className="zaki-btn zaki-btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="zaki-btn zaki-btn-primary"
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
