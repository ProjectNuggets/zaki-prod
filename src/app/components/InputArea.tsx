import { Plus, ArrowUp, Sparkles, Paperclip, Search, Bot, GraduationCap, File as FileIcon, X, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export function InputArea({
  onSend,
  attachments,
  setAttachments,
  isSending = false,
}: {
  onSend: (text: string, attachments: File[]) => void;
  attachments: File[];
  setAttachments: (value: File[] | ((prev: File[]) => File[])) => void;
  isSending?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-6 z-10 relative">
      {/* Input Box */}
      <form 
        onSubmit={handleSubmit}
        className="bg-[#fffdfa] rounded-[22px] shadow-sm border border-[#EBEBEB] overflow-visible flex flex-col min-h-[100px] relative z-10"
      >
        <div className="bg-[#f1e5d2] text-[#88735A] text-[11px] px-3 py-2 flex items-center gap-2 leading-[16px]">
          <span className="inline-flex size-4 items-center justify-center rounded-full bg-white text-[#88735A]">
            <Zap className="size-3" />
          </span>
          Access premium models & features
          <button
            type="button"
            className="text-[#219171] font-medium hover:underline text-[11px] leading-[16px]"
            onClick={() => setUpgradeOpen(true)}
          >
            Upgrade
          </button>
        </div>
        <div className="p-3 flex flex-col gap-2 relative">
        {attachments.length > 0 && (
          <div className="flex flex-col gap-2 px-2">
            <div className="flex flex-wrap gap-2">
              {previews.map((preview, index) =>
                preview.url ? (
                  <div
                    key={`${preview.file.name}-${index}`}
                    className="relative size-[56px] rounded-xl bg-[#faf6f0] border border-[#efe4d6] overflow-hidden flex items-center justify-center"
                  >
                    <img
                      src={preview.url}
                      alt={preview.file.name}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      className="absolute -top-1 -right-1 size-5 rounded-full bg-white shadow border border-[#efe4d6] flex items-center justify-center text-[#88735A] hover:text-[#655543]"
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
                    className="flex items-center justify-between rounded-xl border border-[#efe4d6] bg-[#faf6f0] px-3 py-2 text-xs text-[#655543]"
                  >
                    <div className="flex items-center gap-2">
                      <FileIcon className="size-4 text-[#88735A]" />
                      <span className="max-w-[220px] truncate">{preview.file.name}</span>
                    </div>
                    <button
                      type="button"
                      className="text-[#88735A] hover:text-[#655543]"
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
        <textarea 
          id="chat-input"
          ref={textareaRef}
          rows={1}
          className="w-full bg-transparent outline-none text-[#1f1a14] placeholder-[#b09472] text-base px-2 py-1 resize-none min-h-[24px] max-h-[160px] overflow-y-auto"
          placeholder="How can I help you today?"
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
        
        <div className="flex justify-between items-center px-1">
           <div className="relative" ref={menuRef}>
             <button
               type="button"
               className="size-8 bg-[#faf6f0] rounded-full flex items-center justify-center hover:bg-[#f0e6d8] transition-colors"
               onClick={() => setMenuOpen((open) => !open)}
               aria-haspopup="menu"
               aria-expanded={menuOpen}
             >
                <Plus className="size-4 text-[#88735A]" />
             </button>
             {menuOpen && (
               <div
                 className="absolute left-0 bottom-10 w-56 rounded-2xl border border-[#ececec] bg-white shadow-[0px_16px_30px_rgba(15,15,15,0.12)] p-1 z-30"
                 role="menu"
               >
                 <button
                   className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[#1f1a14] hover:bg-[#f8f2e9] transition-colors"
                   type="button"
                   role="menuitem"
                   onClick={() => setMenuOpen(false)}
                 >
                   <Sparkles className="size-4 text-[#88735A]" />
                   Generate image
                 </button>
                 <button
                   className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[#1f1a14] hover:bg-[#f8f2e9] transition-colors"
                   type="button"
                   role="menuitem"
                   onClick={() => {
                     setMenuOpen(false);
                     fileInputRef.current?.click();
                   }}
                 >
                   <Paperclip className="size-4 text-[#88735A]" />
                   Upload image or file
                 </button>
                 <button
                   className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[#1f1a14] hover:bg-[#f8f2e9] transition-colors"
                   type="button"
                   role="menuitem"
                   onClick={() => setMenuOpen(false)}
                 >
                   <Search className="size-4 text-[#88735A]" />
                   Deep research
                 </button>
                 <button
                   className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[#1f1a14] hover:bg-[#f8f2e9] transition-colors"
                   type="button"
                   role="menuitem"
                   onClick={() => setMenuOpen(false)}
                 >
                   <Bot className="size-4 text-[#88735A]" />
                   Agent mode
                 </button>
                 <button
                   className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[#1f1a14] hover:bg-[#f8f2e9] transition-colors"
                   type="button"
                   role="menuitem"
                   onClick={() => setMenuOpen(false)}
                 >
                   <GraduationCap className="size-4 text-[#88735A]" />
                   Study and learn
                 </button>
               </div>
             )}
           </div>
           
           <button
             type="submit"
             className="size-8 bg-[#655543] rounded-full flex items-center justify-center hover:bg-[#D24430] focus-visible:bg-[#D24430] active:bg-[#D24430] transition-colors disabled:opacity-60"
             disabled={isSending}
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
      {upgradeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="absolute inset-0" onClick={() => setUpgradeOpen(false)} role="button" aria-label="Close upgrade" />
          <div className="relative w-[420px] max-w-[calc(100%-2rem)] rounded-3xl border border-[#ebe3d6] bg-white shadow-[0px_24px_60px_rgba(15,15,15,0.18)] px-6 py-5">
            <div className="text-lg font-semibold text-[#1f1a14]">Upgrades are brewing</div>
            <div className="mt-2 text-sm text-[#655543]">
              We only offer the FREE plan right now. Our backend goblins are forging unlimited and specialized
              plans as we speak — with prices that won’t scare your coffee.
            </div>
            <div className="mt-5 flex items-center justify-end">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm text-white bg-[#1f1a14] hover:bg-[#2b241c] transition-colors"
                onClick={() => setUpgradeOpen(false)}
              >
                Sounds good
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="text-center mt-2">
         <p className="text-[#a3a3a3] text-xs">Zaki can make mistakes. Consider checking important information.</p>
      </div>
    </div>
  );
}
