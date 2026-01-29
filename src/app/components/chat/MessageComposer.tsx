import { useRef, useState } from "react";
import { InputArea } from "../InputArea";
import { File as FileIcon, X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageComposerProps {
  onSend?: (text: string, attachments: File[]) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
  className?: string;
  inputOffset?: number;
}

export function MessageComposer({
  onSend,
  disabled,
  isStreaming,
  placeholder = "Ask anything...",
  className,
  inputOffset = 0,
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
    if (e.target.files && e.target.files.length > 0) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files)]);
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
        <div className="absolute inset-0 z-50 bg-[#D24430]/10 border-2 border-dashed border-[#D24430] rounded-2xl flex items-center justify-center">
          <div className="bg-white dark:bg-[#16120e] px-6 py-4 rounded-xl shadow-lg text-center">
            <FileIcon className="size-8 mx-auto mb-2 text-[#D24430]" />
            <p className="text-sm font-medium text-[#1f1a14] dark:text-[#efe6d9]">
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
              className="flex items-center gap-2 px-3 py-2 bg-[#f8f2e9] dark:bg-[#2a2118] rounded-lg text-xs text-[#655543] dark:text-[#b8a99a]"
            >
              <FileIcon className="size-3.5" />
              <span className="max-w-[120px] truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="ml-1 text-[#88735A] hover:text-[#D24430] transition-colors"
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
        disabled={disabled}
        isStreaming={isStreaming}
        placeholder={placeholder}
        onFileSelect={() => fileInputRef.current?.click()}
        offset={inputOffset}
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
