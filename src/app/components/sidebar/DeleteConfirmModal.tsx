import { useFocusTrap } from "@/hooks/useFocusTrap";

interface DeleteConfirmModalProps {
  item: { type: "space" | "thread"; id: string; label: string } | null;
  onClose: () => void;
  onConfirm: (type: "space" | "thread", id: string) => void;
}

export function DeleteConfirmModal({
  item,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(!!item);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
      <div className="absolute inset-0" onClick={onClose} role="button" aria-label="Close confirmation" />
      <div ref={modalRef} className="relative w-[420px] max-w-[calc(100%-2rem)] rounded-3xl border border-[#ebe3d6] bg-white shadow-[0px_24px_60px_rgba(15,15,15,0.18)] px-6 py-5">
        <div className="text-lg font-semibold text-[#1f1a14]">Delete {item.type}</div>
        <div className="mt-2 text-sm text-[#655543]">
          Deleting this {item.type} will delete the chat and content permanently. There is no way to retrieve the content of the deleted {item.type === "space" ? "chats in this space" : "chat"} after deletion.
        </div>
        <div className="mt-4 text-xs text-[#a3a3a3]">Selected: {item.label}</div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm text-[#655543] hover:bg-[#f8f2e9] transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm text-white bg-[#d24430] hover:bg-[#b63a28] transition-colors"
            onClick={() => {
              onConfirm(item.type, item.id);
              onClose();
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
