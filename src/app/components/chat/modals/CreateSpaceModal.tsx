import { useState } from "react";
import { File as FileIcon, X } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

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
  const [spaceName, setSpaceName] = useState("");
  const [spaceDescription, setSpaceDescription] = useState("");
  const [spaceInstructions, setSpaceInstructions] = useState("");
  const [spaceFiles, setSpaceFiles] = useState<File[]>([]);
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
      <div className="absolute inset-0" onClick={onClose} role="button" aria-label="Close create space" />
      <div ref={modalRef} className="relative w-[420px] max-w-[calc(100%-2rem)] rounded-zaki-2xl border border-zaki bg-white shadow-[0px_24px_60px_rgba(15,15,15,0.18)] px-6 py-5">
        <div className="text-lg font-semibold text-zaki-primary">Create new space</div>
        <div className="mt-2 text-sm text-zaki-disabled">Organize chats, files, and ideas in one place.</div>
        <div className="mt-5 flex flex-col gap-3">
          <label className="text-xs text-zaki-muted">
            Space name
            <input
              className="mt-1 w-full rounded-zaki-md border border-zaki-strong px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus"
              value={spaceName}
              onChange={(event) => setSpaceName(event.target.value)}
              placeholder="Marketing research"
            />
          </label>
          <label className="text-xs text-zaki-muted">
            Description
            <textarea
              className="mt-1 w-full rounded-zaki-md border border-zaki-strong px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus resize-none"
              rows={3}
              value={spaceDescription}
              onChange={(event) => setSpaceDescription(event.target.value)}
              placeholder="Describe what this space is for"
            />
          </label>
          <label className="text-xs text-zaki-muted">
            Instructions
            <textarea
              className="mt-1 w-full rounded-zaki-md border border-zaki-strong px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus resize-none"
              rows={3}
              value={spaceInstructions}
              onChange={(event) => setSpaceInstructions(event.target.value)}
              placeholder="Add guidance for the assistant in this space"
            />
          </label>
          <div className="text-xs text-zaki-muted">
            Pinned documents
            <div className="mt-2 flex flex-col gap-2">
              <label className="w-full rounded-zaki-md border border-dashed border-zaki-strong px-3 py-2 text-sm text-zaki-secondary hover:bg-zaki-hover transition-colors cursor-pointer">
                Upload documents for this space
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
                        aria-label={`Remove ${file.name}`}
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
            className="rounded-full px-4 py-2 text-sm text-zaki-secondary hover:bg-zaki-hover transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm text-white bg-zaki-secondary hover:bg-zaki-brand active:scale-[0.98] transition-[transform,background-color]"
            onClick={handleCreate}
          >
            Create space
          </button>
        </div>
      </div>
    </div>
  );
}
