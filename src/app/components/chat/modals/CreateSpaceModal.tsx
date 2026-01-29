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
      <div ref={modalRef} className="relative w-[420px] max-w-[calc(100%-2rem)] rounded-3xl border border-[#ebe3d6] bg-white shadow-[0px_24px_60px_rgba(15,15,15,0.18)] px-6 py-5">
        <div className="text-lg font-semibold text-[#1f1a14]">Create new space</div>
        <div className="mt-2 text-sm text-[#a3a3a3]">Organize chats, files, and ideas in one place.</div>
        <div className="mt-5 flex flex-col gap-3">
          <label className="text-xs text-[#88735A]">
            Space name
            <input
              className="mt-1 w-full rounded-xl border border-[#e7dbc9] px-3 py-2 text-sm text-[#1f1a14] outline-none focus:border-[#b09472]"
              value={spaceName}
              onChange={(event) => setSpaceName(event.target.value)}
              placeholder="Marketing research"
            />
          </label>
          <label className="text-xs text-[#88735A]">
            Description
            <textarea
              className="mt-1 w-full rounded-xl border border-[#e7dbc9] px-3 py-2 text-sm text-[#1f1a14] outline-none focus:border-[#b09472] resize-none"
              rows={3}
              value={spaceDescription}
              onChange={(event) => setSpaceDescription(event.target.value)}
              placeholder="Describe what this space is for"
            />
          </label>
          <label className="text-xs text-[#88735A]">
            Instructions
            <textarea
              className="mt-1 w-full rounded-xl border border-[#e7dbc9] px-3 py-2 text-sm text-[#1f1a14] outline-none focus:border-[#b09472] resize-none"
              rows={3}
              value={spaceInstructions}
              onChange={(event) => setSpaceInstructions(event.target.value)}
              placeholder="Add guidance for the assistant in this space"
            />
          </label>
          <div className="text-xs text-[#88735A]">
            Pinned documents
            <div className="mt-2 flex flex-col gap-2">
              <label className="w-full rounded-xl border border-dashed border-[#e7dbc9] px-3 py-2 text-sm text-[#655543] hover:bg-[#f8f2e9] transition-colors cursor-pointer">
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
                      className="flex items-center justify-between rounded-xl border border-[#efe4d6] bg-[#faf6f0] px-3 py-2 text-xs text-[#655543]"
                    >
                      <div className="flex items-center gap-2">
                        <FileIcon className="size-4 text-[#88735A]" />
                        <span className="max-w-[200px] truncate">{file.name}</span>
                      </div>
                      <button
                        type="button"
                        className="text-[#88735A] hover:text-[#655543]"
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
            className="rounded-full px-4 py-2 text-sm text-[#655543] hover:bg-[#f8f2e9] transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm text-white bg-[#655543] hover:bg-[#D24430] active:scale-[0.98] transition-[transform,background-color]"
            onClick={handleCreate}
          >
            Create space
          </button>
        </div>
      </div>
    </div>
  );
}
