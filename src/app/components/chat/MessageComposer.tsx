import { useRef, useState } from "react";
import { InputArea } from "../InputArea";
import { File as FileIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageComposerProps {
  onSend?: (text: string, attachments: File[]) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  className?: string;
}

export function MessageComposer({
  onSend,
  disabled,
  isStreaming,
  className,
}: MessageComposerProps) {
  const [attachments, setAttachments] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragActive(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    dragCounter.current = 0;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setAttachments((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setAttachments((prev) => [...prev, ...Array.from(files)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = (text: string) => {
    onSend?.(text, attachments);
    setAttachments([]);
  };

  return (
    <div
      className={cn("relative", className)}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragActive && (
        <div className="absolute inset-0 z-50 bg-zaki-brand/10 border-2 border-dashed border-zaki-focus rounded-zaki-lg flex items-center justify-center">
          <div className="bg-white dark:bg-[#16120e] px-6 py-4 rounded-zaki-md shadow-lg text-center">
            <FileIcon className="size-8 mx-auto mb-2 text-zaki-brand" />
            <p className="text-sm font-medium text-zaki-primary dark:text-zaki-primary">
              Drop files here
            </p>
          </div>
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-2 bg-zaki-hover dark:bg-[#2a2118] rounded-lg text-xs text-zaki-secondary dark:text-[#b8a99a]"
            >
              <FileIcon className="size-3.5" />
              <span className="max-w-[120px] truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="ml-1 text-zaki-muted hover:text-zaki-brand transition-colors"
                aria-label={`Remove ${file.name}`}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <InputArea
        onSend={handleSend}
        attachments={attachments}
        setAttachments={setAttachments}
        isSending={disabled || isStreaming}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        aria-label="Select files"
      />
    </div>
  );
}
