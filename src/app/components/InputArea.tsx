import { Plus, ArrowUp, Sparkles, Paperclip, Search, Bot, GraduationCap, File as FileIcon, X, Zap, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { cn } from "@/lib/utils";
import { useBillingPortal, useCheckout, useEntitlements } from "@/queries";
import { toast } from "sonner";

export function InputArea({
  onSend,
  attachments,
  setAttachments,
  isSending = false,
  webSearchEnabled = false,
  onToggleWebSearch,
  memoryMode = "autosave",
  onToggleMemoryMode,
}: {
  onSend: (text: string, attachments: File[]) => void;
  attachments: File[];
  setAttachments: (value: File[] | ((prev: File[]) => File[])) => void;
  isSending?: boolean;
  webSearchEnabled?: boolean;
  onToggleWebSearch?: () => void;
  memoryMode?: "autosave" | "manual";
  onToggleMemoryMode?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir?.() === "rtl" || i18n.language?.startsWith("ar");
  const placeholderSuggestions = useMemo(
    () => t("input.placeholders", { returnObjects: true }) as string[],
    [t]
  );
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upgradeModalRef = useFocusTrap<HTMLDivElement>(upgradeOpen);
  const wasSendingRef = useRef(isSending);
  const { data: entitlementsResult } = useEntitlements();
  const checkout = useCheckout();
  const portal = useBillingPortal();
  const planTier = entitlementsResult?.data?.plan?.tier ?? "free";
  const planStatus = entitlementsResult?.data?.plan?.status ?? "inactive";
  const isPremium =
    ["student", "personal"].includes(planTier) &&
    ["active", "trialing", "past_due"].includes(planStatus);
  const isPersonal =
    planTier === "personal" && ["active", "trialing", "past_due"].includes(planStatus);

  const gateProFeature = () => {
    setMenuOpen(false);
    toast(t("billing.proGate"));
    setUpgradeOpen(true);
  };
  const proBadgeClass = cn(
    "text-[10px] font-semibold uppercase tracking-wide text-zaki-success bg-zaki-success rounded-full px-2 py-0.5",
    isRtl ? "mr-auto" : "ml-auto"
  );

  // Auto-focus textarea when response completes (isSending: true → false)
  useEffect(() => {
    if (wasSendingRef.current && !isSending) {
      // Response just finished — focus the input for seamless continuation
      textareaRef.current?.focus();
    }
    wasSendingRef.current = isSending;
  }, [isSending]);

  // Rotate placeholder suggestions every 4 seconds (only when input is empty and not focused)
  useEffect(() => {
    if (inputValue.length > 0) return; // Don't rotate if user is typing
    
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholderSuggestions.length);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [inputValue.length]);

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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/60 backdrop-blur-[1px]">
            <div className="absolute inset-0" onClick={() => setUpgradeOpen(false)} role="button" aria-label="Close upgrade" />
            <div
              ref={upgradeModalRef}
              dir={isRtl ? "rtl" : "ltr"}
              className={cn(
                "relative w-[420px] max-w-[calc(100%-2rem)] rounded-zaki-2xl border border-zaki dark:border-zaki-dark bg-white dark:bg-zaki-dark-card shadow-[0px_24px_60px_rgba(15,15,15,0.18)] px-6 py-5",
                isRtl ? "text-right" : "text-left"
              )}
            >
              <div className="text-lg font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                {t("billing.upgradeTitle")}
              </div>
              <div className="mt-2 text-sm text-zaki-secondary dark:text-zaki-dark-muted">
                {t("billing.upgradeSubtitle")}
              </div>

              <div className="mt-4 grid gap-3">
                {[
                  {
                    tier: "student",
                    label: t("billing.plans.student.label"),
                    price: t("billing.plans.student.price"),
                    desc: t("billing.plans.student.desc"),
                  },
                  {
                    tier: "personal",
                    label: t("billing.plans.personal.label"),
                    price: t("billing.plans.personal.price"),
                    desc: t("billing.plans.personal.desc"),
                  },
                ].map((plan) => (
                  <button
                    key={plan.tier}
                    type="button"
                    className={cn(
                      "w-full rounded-zaki-lg border px-4 py-3 transition-colors",
                      isRtl ? "text-right" : "text-left",
                      plan.tier === planTier
                        ? "border-zaki-brand bg-zaki-brand/10"
                        : "border-zaki-subtle hover:border-zaki-strong hover:bg-zaki-hover"
                    )}
                    onClick={async () => {
                      try {
                        await checkout.mutateAsync(plan.tier as "student" | "personal");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Checkout failed");
                      }
                    }}
                  >
                    <div className={cn("flex items-center justify-between", isRtl && "flex-row-reverse")}>
                      <div className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                        {plan.label}
                      </div>
                      <div className="text-xs text-zaki-muted dark:text-zaki-dark-muted">{plan.price}</div>
                    </div>
                    <div className="mt-1 text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
                      {plan.desc}
                    </div>
                  </button>
                ))}
              </div>

              <div className={cn("mt-5 flex items-center justify-between", isRtl && "flex-row-reverse")}>
                <button
                  type="button"
                  className="text-xs text-zaki-muted hover:text-zaki-primary transition-colors"
                  onClick={() => setUpgradeOpen(false)}
                >
                  {t("billing.notNow")}
                </button>
                <button
                  type="button"
                  className="rounded-full px-4 py-2 text-sm text-white bg-zaki-brand hover:bg-zaki-brand-hover transition-colors"
                  onClick={async () => {
                    try {
                      await portal.mutateAsync();
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Unable to open billing portal");
                    }
                  }}
                >
                  {t("billing.managePlan")}
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
      <form onSubmit={handleSubmit} className="zaki-input-form relative z-10" dir="ltr">
        <div className="rounded-[20px] border border-[#e5d3bd] dark:border-zaki-dark bg-[#efe2d3] dark:bg-zaki-dark-card shadow-[0px_16px_36px_rgba(15,15,15,0.06)] overflow-visible p-0">
          <div
            className={cn(
              "w-full rounded-full bg-[#efe2d3] dark:bg-zaki-dark-card text-zaki-muted text-2xs px-3 py-1.5 flex items-center gap-2 leading-[16px] translate-y-[2px]",
              isRtl ? "justify-end text-right" : "justify-start text-left"
            )}
          >
            {isRtl ? (
              <>
                <button
                  type="button"
                  className="inline-flex items-center rounded-full bg-zaki-success px-2 py-0.5 text-2xs font-semibold text-zaki-success transition-colors hover:brightness-95"
                  onClick={async () => {
                    if (isPremium) {
                      try {
                        await portal.mutateAsync();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Unable to open billing portal");
                      }
                    } else {
                      setUpgradeOpen(true);
                    }
                  }}
                >
                  {isPremium ? "Manage" : t("input.upgradeCta")}
                </button>
                <span className="text-zaki-secondary">
                  {isPremium ? `${t("input.upgradeLabel")} · ${planTier.toUpperCase()}` : t("input.upgradeLabel")}
                </span>
                <span className="inline-flex size-4 items-center justify-center rounded-full bg-white text-zaki-muted">
                  <Zap className="size-3" />
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex size-4 items-center justify-center rounded-full bg-white text-zaki-muted">
                  <Zap className="size-3" />
                </span>
                <span className="text-zaki-secondary">
                  {isPremium ? `${t("input.upgradeLabel")} · ${planTier.toUpperCase()}` : t("input.upgradeLabel")}
                </span>
                <button
                  type="button"
                  className="inline-flex items-center rounded-full bg-zaki-success px-2 py-0.5 text-2xs font-semibold text-zaki-success transition-colors hover:brightness-95"
                  onClick={async () => {
                    if (isPremium) {
                      try {
                        await portal.mutateAsync();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Unable to open billing portal");
                      }
                    } else {
                      setUpgradeOpen(true);
                    }
                  }}
                >
                  {isPremium ? "Manage" : t("input.upgradeCta")}
                </button>
              </>
            )}
          </div>
          <div className="w-full mt-2 rounded-[16px] border border-[#ead7c1] dark:border-zaki-dark bg-[#fffaf4] dark:bg-[#15110d] px-3 py-2.5 flex flex-col gap-2 relative">
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
                      className="absolute -top-1 -right-1 size-5 rounded-full bg-white shadow border border-zaki flex items-center justify-center text-zaki-muted hover:text-zaki-secondary focus-visible:ring-2 focus-visible:ring-zaki-accent"
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
                      className="text-zaki-muted hover:text-zaki-secondary focus-visible:ring-2 focus-visible:ring-zaki-accent focus-visible:rounded"
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
        <div className="flex items-end gap-2 px-1">
          <textarea 
            id="chat-input"
            ref={textareaRef}
            rows={1}
            className={cn(
              "zaki-input-field flex-1 bg-transparent text-zaki-primary placeholder-zaki text-sm px-1 py-1.5 resize-none min-h-[30px] max-h-[160px] overflow-y-auto outline-none focus:outline-none zaki-scrollbar-fade",
              isRtl ? "text-right" : "text-left"
            )}
            placeholder={placeholderSuggestions[placeholderIndex]}
            autoComplete="off"
            dir="auto"
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
        </div>
        <div className="zaki-input-row flex items-center gap-2 px-1 pt-0.5">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="size-9 bg-[#f6eee4] dark:bg-zaki-dark-elevated rounded-xl flex items-center justify-center hover:bg-zaki-hover dark:hover:bg-zaki-dark-hover transition-colors focus-visible:ring-2 focus-visible:ring-zaki-accent focus-visible:ring-offset-2"
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
                  onClick={() => {
                    if (!isPersonal) {
                      gateProFeature();
                      return;
                    }
                    setMenuOpen(false);
                  }}
                >
                  <Sparkles className="size-4 text-zaki-muted" />
                  Generate image
                  <span className={proBadgeClass}>{t("billing.proBadge")}</span>
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
                  onClick={() => {
                    if (!isPersonal) {
                      gateProFeature();
                      return;
                    }
                    setMenuOpen(false);
                  }}
                >
                  <Search className="size-4 text-zaki-muted" />
                  Deep research
                  <span className={proBadgeClass}>{t("billing.proBadge")}</span>
                </button>
                <button
                  className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (!isPersonal) {
                      gateProFeature();
                      return;
                    }
                    setMenuOpen(false);
                  }}
                >
                  <Bot className="size-4 text-zaki-muted" />
                  Agent mode
                  <span className={proBadgeClass}>{t("billing.proBadge")}</span>
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
          <button
            type="button"
            onClick={onToggleWebSearch}
            className={cn(
              "size-9 rounded-xl flex items-center justify-center border transition-colors",
              webSearchEnabled
                ? "bg-zaki-accent/15 border-zaki-accent/30 text-zaki-accent"
                : "bg-[#f6eee4] border-[#ead7c1] text-zaki-muted hover:bg-zaki-hover dark:bg-zaki-dark-elevated dark:border-zaki-dark dark:text-zaki-dark-muted dark:hover:bg-zaki-dark-hover"
            )}
            aria-pressed={webSearchEnabled}
            aria-label="Toggle web search"
          >
            <Search className="size-4" />
          </button>
          <button
            type="button"
            onClick={onToggleMemoryMode}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-1 text-2xs transition-colors",
              "bg-[#f6eee4] border-[#ead7c1] text-zaki-secondary hover:bg-zaki-hover dark:bg-zaki-dark-elevated dark:border-zaki-dark dark:text-zaki-dark-subtle dark:hover:bg-zaki-dark-hover"
            )}
            title={memoryMode === "autosave" ? "Auto-save memories with 3s undo" : "Manually confirm each memory"}
          >
            <span className="text-zaki-muted">Memory</span>
            <span className="h-4 w-px bg-[#e4d6c4] dark:bg-zaki-dark-hover" />
            <span className="capitalize">{memoryMode === "autosave" ? "Auto" : "Manual"}</span>
            <ChevronDown className="size-3 text-zaki-muted" />
          </button>
          <span className="flex-1" />
          <button
            type="submit"
            className="zaki-button-bounce size-9 bg-zaki-brand hover:bg-zaki-brand-hover rounded-xl flex items-center justify-center border border-zaki-brand/30 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-zaki-accent focus-visible:ring-offset-2"
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
        </div>
      </form>
      {upgradeModal}
      
      <div className="text-center mt-2">
         <p className="text-zaki-disabled text-xs" dir={isRtl ? "rtl" : "ltr"}>
           {t("input.disclaimer")}
         </p>
      </div>
    </div>
  );
}
