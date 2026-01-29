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
      <div ref={modalRef} className="relative w-[420px] max-w-[calc(100%-2rem)] rounded-3xl border border-[#ebe3d6] bg-white shadow-[0px_24px_60px_rgba(15,15,15,0.18)] px-6 py-5">
        <div className="text-lg font-semibold text-[#1f1a14]">Edit instructions</div>
        <div className="mt-4">
          <textarea
            className="w-full rounded-xl border border-[#e7dbc9] px-3 py-2 text-sm text-[#1f1a14] outline-none focus:border-[#b09472] resize-none"
            rows={4}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm text-[#655543] hover:bg-[#f8f2e9] transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm text-white bg-[#1f1a14] hover:bg-[#2b241c] transition-colors"
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
