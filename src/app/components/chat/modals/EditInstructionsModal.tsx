import { useState, useEffect } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

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
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);

  // Sync initial value when modal opens
  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
      <div className="absolute inset-0" onClick={onClose} role="button" aria-label="Close instructions edit" />
      <div ref={modalRef} className="relative w-[420px] max-w-[calc(100%-2rem)] rounded-zaki-2xl border border-zaki bg-white shadow-[0px_24px_60px_rgba(15,15,15,0.18)] px-6 py-5">
        <div className="text-lg font-semibold text-zaki-primary">Edit instructions</div>
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
            className="zaki-btn bg-zaki-primary text-white hover:bg-zaki-active transition-colors"
            onClick={() => {
              onSave(value);
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
