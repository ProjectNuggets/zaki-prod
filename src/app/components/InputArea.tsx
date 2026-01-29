import { Plus, ArrowUp, Sparkles, Paperclip, Search, Bot, GraduationCap, File as FileIcon, X, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/hooks/useFocusTrap";

export function InputArea({
  onSend,
  attachments,
  setAttachments,
  isSending = false,
  webSearchEnabled = false,
  onToggleWebSearch,
}: {
  onSend: (text: string, attachments: File[]) => void;
  attachments: File[];
  setAttachments: (value: File[] | ((prev: File[]) => File[])) => void;
  isSending?: boolean;
  webSearchEnabled?: boolean;
  onToggleWebSearch?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upgradeModalRef = useFocusTrap<HTMLDivElement>(upgradeOpen);

  const submitMessage = () => {
    if (isSending) {
      return;
    }
    if (inputValue.trim() || attachments.length > 0) {
      onSend(inputValue, attachments);
      setInputValue("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage();
  };

  const previews = useMemo(
    () =>
      attachments.map((file) => ({
        file,
        url: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      })),
    [attachments]
  );

  useEffect(() => {
    return () => {
      previews.forEach((preview) => {
        if (preview.url) {
          URL.revokeObjectURL(preview.url);
        }
      });
    };
  }, [previews]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const upgradeModal =
    upgradeOpen && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
            <div className="absolute inset-0" onClick={() => setUpgradeOpen(false)} role="button" aria-label="Close upgrade" />
            <div ref={upgradeModalRef} className="relative w-[420px] max-w-[calc(100%-2rem)] rounded-zaki-2xl border border-zaki bg-white shadow-[0px_24px_60px_rgba(15,15,15,0.18)] px-6 py-5">
              <div className="text-lg font-semibold text-zaki-primary">Upgrades are brewing</div>
              <div className="mt-2 text-sm text-zaki-secondary">
                We only offer the FREE plan right now. Our backend goblins are forging unlimited and specialized
                plans as we speak — with prices that won’t scare your coffee.
              </div>
              <div className="mt-5 flex items-center justify-end">
                <button
                  type="button"
                  className="rounded-full px-4 py-2 text-sm text-white bg-zaki-primary hover:bg-zaki-active transition-colors"
                  onClick={() => setUpgradeOpen(false)}
                >
                  Sounds good
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="zaki-input-shell w-full max-w-3xl mx-auto px-4 pb-6 z-10 relative">
      {/* Input Box */}
      <form 
        onSubmit={handleSubmit}
        className="zaki-input-form bg-zaki-raised rounded-[22px] shadow-sm border border-zaki-subtle overflow-visible flex flex-col min-h-[88px] relative z-10"
      >
        <div className="bg-zaki-sunken text-zaki-muted text-[11px] px-3 py-2 grid grid-cols-[1fr_auto_1fr] items-center leading-[16px]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zaki-muted">Web search</span>
            <button
              type="button"
              onClick={onToggleWebSearch}
              className={`h-5 w-9 rounded-full border transition-colors ${
                webSearchEnabled
                  ? "bg-zaki-brand border-zaki-focus"
                  : "bg-white border-zaki"
              }`}
              aria-pressed={webSearchEnabled}
            >
              <span
                className={`block h-4 w-4 rounded-full shadow transition-transform ${
                  webSearchEnabled ? "translate-x-4 bg-white" : "translate-x-0.5 bg-zaki-muted"
                }`}
              />
            </button>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <span className="inline-flex size-4 items-center justify-center rounded-full bg-white text-zaki-muted">
              <Zap className="size-3" />
            </span>
            <span>Access premium models & features</span>
            <button
              type="button"
              className="text-zaki-success font-medium hover:underline text-[11px] leading-[16px]"
              onClick={() => setUpgradeOpen(true)}
            >
              Upgrade
            </button>
          </div>
          <div />
        </div>
        <div className="p-3 flex flex-col gap-2 relative">
        {attachments.length > 0 && (
          <div className="flex flex-col gap-2 px-2">
            <div className="flex flex-wrap gap-2">
              {previews.map((preview, index) =>
                preview.url ? (
                  <div
                    key={`${preview.file.name}-${index}`}
                    className="relative size-[56px] rounded-zaki-md bg-zaki-elevated border border-zaki overflow-hidden flex items-center justify-center"
                  >
                    <img
                      src={preview.url}
                      alt={preview.file.name}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      className="absolute -top-1 -right-1 size-5 rounded-full bg-white shadow border border-zaki flex items-center justify-center text-zaki-muted hover:text-zaki-secondary focus-visible:ring-2 focus-visible:ring-zaki-brand"
                      onClick={() =>
                        setAttachments((prev) => prev.filter((_, i) => i !== index))
                      }
                      aria-label={`Remove ${preview.file.name}`}
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ) : null
              )}
            </div>
            <div className="flex flex-col gap-2">
              {previews.map((preview, index) =>
                preview.url ? null : (
                  <div
                    key={`${preview.file.name}-${index}`}
                    className="flex items-center justify-between rounded-zaki-md border border-zaki bg-zaki-elevated px-3 py-2 text-xs text-zaki-secondary"
                  >
                    <div className="flex items-center gap-2">
                      <FileIcon className="size-4 text-zaki-muted" />
                      <span className="max-w-[220px] truncate">{preview.file.name}</span>
                    </div>
                    <button
                      type="button"
                      className="text-zaki-muted hover:text-zaki-secondary focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:rounded"
                      onClick={() =>
                        setAttachments((prev) => prev.filter((_, i) => i !== index))
                      }
                      aria-label={`Remove ${preview.file.name}`}
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        )}
        <div className="zaki-input-row flex items-center gap-2 px-1">
           <div className="relative" ref={menuRef}>
             <button
               type="button"
               className="size-8 bg-zaki-elevated rounded-full flex items-center justify-center hover:bg-zaki-active transition-colors focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
               onClick={() => setMenuOpen((open) => !open)}
               aria-haspopup="menu"
               aria-expanded={menuOpen}
               aria-label="Add options"
             >
                <Plus className="size-4 text-zaki-muted" />
             </button>
             {menuOpen && (
               <div
                 className="absolute left-0 bottom-10 w-56 rounded-zaki-lg border border-zaki-subtle bg-white shadow-[0px_16px_30px_rgba(15,15,15,0.12)] p-1 z-30"
                 role="menu"
               >
                 <button
                   className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors"
                   type="button"
                   role="menuitem"
                   onClick={() => setMenuOpen(false)}
                 >
                   <Sparkles className="size-4 text-zaki-muted" />
                   Generate image
                 </button>
                 <button
                   className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors"
                   type="button"
                   role="menuitem"
                   onClick={() => {
                     setMenuOpen(false);
                     fileInputRef.current?.click();
                   }}
                 >
                   <Paperclip className="size-4 text-zaki-muted" />
                   Upload image or file
                 </button>
                 <button
                   className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors"
                   type="button"
                   role="menuitem"
                   onClick={() => setMenuOpen(false)}
                 >
                   <Search className="size-4 text-zaki-muted" />
                   Deep research
                 </button>
                 <button
                   className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors"
                   type="button"
                   role="menuitem"
                   onClick={() => setMenuOpen(false)}
                 >
                   <Bot className="size-4 text-zaki-muted" />
                   Agent mode
                 </button>
                 <button
                   className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors"
                   type="button"
                   role="menuitem"
                   onClick={() => setMenuOpen(false)}
                 >
                   <GraduationCap className="size-4 text-zaki-muted" />
                   Study and learn
                 </button>
               </div>
             )}
           </div>
           {webSearchEnabled && (
             <span className="zaki-agent-prefix text-zaki-brand text-sm font-medium">@agent</span>
           )}
           <textarea 
             id="chat-input"
             ref={textareaRef}
             rows={1}
             className="zaki-input-field flex-1 bg-transparent outline-none text-zaki-primary placeholder-[#b09472] text-base px-1 py-1 resize-none min-h-[24px] max-h-[160px] overflow-y-auto"
             placeholder="Ask anything"
             autoComplete="off"
             value={inputValue}
             disabled={isSending}
             onChange={(e) => {
               setInputValue(e.target.value);
               if (textareaRef.current) {
                 textareaRef.current.style.height = "auto";
                 textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
               }
             }}
             onKeyDown={(event) => {
               if (event.key === "Enter" && !event.shiftKey) {
                 event.preventDefault();
                 submitMessage();
               }
             }}
           />
           <button
             type="submit"
             className="size-8 bg-zaki-secondary rounded-full flex items-center justify-center hover:bg-zaki-brand focus-visible:bg-zaki-brand active:bg-zaki-brand transition-colors disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
             disabled={isSending}
             aria-label="Send message"
           >
              <ArrowUp className="size-4 text-white" />
           </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length) {
              setAttachments((prev) => [...prev, ...files]);
            }
            event.target.value = "";
          }}
        />
        </div>
      </form>
      {upgradeModal}
      
      <div className="text-center mt-2">
         <p className="text-zaki-disabled text-xs">Zaki can make mistakes. Consider checking important information.</p>
      </div>
    </div>
  );
}
