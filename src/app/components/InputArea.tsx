import { Plus, ArrowUp, Sparkles, Paperclip, Search, GraduationCap, File as FileIcon, FileText, X, Zap, Check } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useEntitlements } from "@/queries";
import { trackProductEvent } from "@/lib/productTelemetry";
import { toast } from "sonner";

export function InputArea({
  onSend,
  attachments,
  setAttachments,
  isSending = false,
  onStop,
  queryModeEnabled = false,
  onToggleQueryMode,
  webSearchArmed = false,
  onToggleWebSearch,
  showUpgradeStrip = true,
  sendLocked = false,
  zakiBotMode = false,
  quotaBadge = null,
}: {
  onSend: (text: string, attachments: File[]) => void;
  attachments: File[];
  setAttachments: (value: File[] | ((prev: File[]) => File[])) => void;
  isSending?: boolean;
  onStop?: () => void;
  queryModeEnabled?: boolean;
  onToggleQueryMode?: () => void;
  webSearchArmed?: boolean;
  onToggleWebSearch?: () => void;
  showUpgradeStrip?: boolean;
  sendLocked?: boolean;
  zakiBotMode?: boolean;
  quotaBadge?: {
    label: string;
    tone: "neutral" | "warning" | "danger";
  } | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOnboardingControlsLocked, setIsOnboardingControlsLocked] = useState(false);
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
  const wasSendingRef = useRef(isSending);
  const navigate = useNavigate();
  const { data: entitlementsResult } = useEntitlements();
  const planTier = entitlementsResult?.data?.plan?.tier ?? "free";
  const planStatus = entitlementsResult?.data?.plan?.status ?? "inactive";
  const isPremium =
    ["student", "personal"].includes(planTier) &&
    ["active", "trialing", "past_due"].includes(planStatus);
  const canToggleQueryMode = typeof onToggleQueryMode === "function";
  const canToggleWebSearch = typeof onToggleWebSearch === "function";

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
    if (isSending || sendLocked) {
      return;
    }
    if (inputValue.trim() || attachments.length > 0) {
      onSend(inputValue, attachments);
      setInputValue("");
    }
  };

  const canSend =
    !sendLocked && (inputValue.trim().length > 0 || attachments.length > 0);
  const isStopMode = isSending;

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
    const handleOnboardingControlsState = (event: Event) => {
      const detail = (event as CustomEvent<{ locked?: boolean; forceOpen?: boolean }>).detail;
      const locked = Boolean(detail?.locked);
      setIsOnboardingControlsLocked(locked);
      if (detail?.forceOpen) {
        setMenuOpen(true);
      }
    };

    window.addEventListener("zaki:onboarding-controls-menu-state", handleOnboardingControlsState);
    return () => {
      window.removeEventListener("zaki:onboarding-controls-menu-state", handleOnboardingControlsState);
    };
  }, []);

  useEffect(() => {
    const handleFocusComposer = () => {
      textareaRef.current?.focus();
    };
    window.addEventListener("zaki:focus-composer", handleFocusComposer);
    return () => {
      window.removeEventListener("zaki:focus-composer", handleFocusComposer);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOnboardingControlsLocked) return;
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (isOnboardingControlsLocked) return;
      if (event.key === "Escape") {
        setMenuOpen(false);
        if (webSearchArmed && canToggleWebSearch) {
          onToggleWebSearch?.();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOnboardingControlsLocked, canToggleWebSearch, onToggleWebSearch, webSearchArmed]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const handleToggleQueryMode = () => {
    if (!canToggleQueryMode) return;
    onToggleQueryMode?.();
    if (!isOnboardingControlsLocked) {
      setMenuOpen(false);
    }
    if (queryModeEnabled) {
      toast.success(t("input.queryMode.offToast"));
      return;
    }
    toast.info(t("input.queryMode.onToast"));
  };

  return (
    <div
      className="zaki-input-shell w-full max-w-3xl mx-auto px-4 pb-6 z-10 relative"
      style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
    >
      {/* Input Box */}
      <form onSubmit={handleSubmit} className="zaki-input-form relative z-10" dir="ltr">
        <div className="rounded-[20px] border border-[#e5d3bd] dark:border-zaki-dark bg-[#efe2d3] dark:bg-zaki-dark-card shadow-[0px_16px_36px_rgba(15,15,15,0.06)] overflow-visible p-0">
          {showUpgradeStrip ? (
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
                    onClick={() => {
                      void trackProductEvent({
                        event: "upgrade_cta_clicked",
                        source: "chat_input",
                        language: isRtl ? "ar" : "en",
                        plan: isPremium ? (planTier === "student" || planTier === "personal" ? planTier : "personal") : "personal",
                        interval: "monthly",
                      }).catch(() => {
                        // Best-effort telemetry only.
                      });
                      navigate("/pricing?source=chat_input");
                    }}
                  >
                    {isPremium ? t("sidebar.profile.managePlan") : t("input.upgradeCta")}
                  </button>
                  <span className="text-zaki-secondary">
                    {t("input.upgradeLabel")}
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
                    {t("input.upgradeLabel")}
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center rounded-full bg-zaki-success px-2 py-0.5 text-2xs font-semibold text-zaki-success transition-colors hover:brightness-95"
                    onClick={() => {
                      void trackProductEvent({
                        event: "upgrade_cta_clicked",
                        source: "chat_input",
                        language: isRtl ? "ar" : "en",
                        plan: isPremium ? (planTier === "student" || planTier === "personal" ? planTier : "personal") : "personal",
                        interval: "monthly",
                      }).catch(() => {
                        // Best-effort telemetry only.
                      });
                      navigate("/pricing?source=chat_input");
                    }}
                  >
                    {isPremium ? t("sidebar.profile.managePlan") : t("input.upgradeCta")}
                  </button>
                </>
              )}
            </div>
          ) : null}
          <div
            className={cn(
              "w-full rounded-[16px] border border-[#ead7c1] dark:border-zaki-dark bg-[#fffaf4] dark:bg-[#15110d] px-3 py-2.5 flex flex-col gap-2 relative",
              showUpgradeStrip ? "mt-2" : "mt-0"
            )}
          >
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
          {!zakiBotMode ? (
            <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="size-9 bg-[#f6eee4] dark:bg-zaki-dark-elevated rounded-xl flex items-center justify-center hover:bg-zaki-hover dark:hover:bg-zaki-dark-hover transition-colors focus-visible:ring-2 focus-visible:ring-zaki-accent focus-visible:ring-offset-2"
              onClick={() =>
                setMenuOpen((open) => {
                  const nextOpen = isOnboardingControlsLocked ? true : !open;
                  if (nextOpen) {
                    window.dispatchEvent(new CustomEvent("zaki:onboarding-chat-controls-opened"));
                  }
                  return nextOpen;
                })
              }
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={t("input.menu.addOptions")}
              data-onboarding-id="chat-controls-button"
            >
              <Plus className="size-4 text-zaki-muted" />
            </button>
            {menuOpen && (
              <div
                className="absolute left-0 bottom-10 w-56 rounded-zaki-lg border border-zaki-subtle bg-white shadow-[0px_16px_30px_rgba(15,15,15,0.12)] p-1 z-30"
                role="menu"
              >
                <button
                  className={cn(
                    "w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm transition-colors",
                    queryModeEnabled
                      ? "bg-zaki-accent/10 text-zaki-primary"
                      : "text-zaki-primary hover:bg-zaki-hover",
                    !canToggleQueryMode && "opacity-60 cursor-not-allowed"
                  )}
                  type="button"
                  role="menuitem"
                  onClick={handleToggleQueryMode}
                  disabled={!canToggleQueryMode}
                  data-onboarding-id="chat-control-query-mode"
                >
                  <FileText className="size-4 text-zaki-muted" />
                  {t("input.queryMode.label")}
                  {queryModeEnabled ? (
                    <span className={cn("ml-auto inline-flex items-center gap-1 rounded-full bg-zaki-accent/20 px-2 py-0.5 text-[10px] font-semibold text-zaki-accent", isRtl && "ml-0 mr-auto")}>
                      <Check className="size-3" />
                      {t("input.queryMode.onBadge")}
                    </span>
                  ) : null}
                </button>
                <button
                  className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (!isOnboardingControlsLocked) {
                      setMenuOpen(false);
                    }
                    window.dispatchEvent(new CustomEvent("zaki:upload-active-space-files"));
                  }}
                  data-onboarding-id="chat-control-upload-file"
                >
                  <Paperclip className="size-4 text-zaki-muted" />
                  {t("input.menu.uploadFile")}
                </button>
                <button
                  className="group relative w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (!isOnboardingControlsLocked) {
                      setMenuOpen(false);
                    }
                    toast.info(t("input.menu.comingSoonToast"));
                  }}
                  data-onboarding-id="chat-control-study-learn"
                >
                  <GraduationCap className="size-4 text-zaki-muted" />
                  {t("input.menu.studyLearn")}
                  <span className={cn(
                    "pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-zaki-subtle bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-zaki-muted opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:border-zaki-dark dark:bg-zaki-dark-card dark:text-zaki-dark-muted",
                    isRtl ? "left-2" : "right-2"
                  )}>
                    {t("input.menu.comingSoonPill")}
                  </span>
                </button>
                <div className="my-1 h-px bg-zaki-subtle" />
                <button
                  className="group relative w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (!isOnboardingControlsLocked) {
                      setMenuOpen(false);
                    }
                    toast.info(t("input.menu.comingSoonToast"));
                  }}
                  data-onboarding-id="chat-control-generate-image"
                >
                  <Sparkles className="size-4 text-zaki-muted" />
                  {t("input.menu.generateImage")}
                  <span className={cn(
                    "pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-zaki-subtle bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-zaki-muted opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:border-zaki-dark dark:bg-zaki-dark-card dark:text-zaki-dark-muted",
                    isRtl ? "left-2" : "right-2"
                  )}>
                    {t("input.menu.comingSoonPill")}
                  </span>
                </button>
              </div>
            )}
            </div>
          ) : null}
          {!zakiBotMode ? (
            <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("zaki:onboarding-web-search-clicked"));
              onToggleWebSearch?.();
            }}
            disabled={!canToggleWebSearch}
            className={cn(
              "group relative size-11 sm:size-9 rounded-xl flex items-center justify-center border transition-colors",
              webSearchArmed
                ? "bg-zaki-accent/10 border-zaki-accent/40 text-zaki-accent"
                : "bg-[#f6eee4] border-[#ead7c1] text-zaki-muted hover:bg-zaki-hover dark:bg-zaki-dark-elevated dark:border-zaki-dark dark:text-zaki-dark-muted dark:hover:bg-zaki-dark-hover",
              !canToggleWebSearch && "opacity-60 cursor-not-allowed"
            )}
            aria-label={
              webSearchArmed
                ? t("input.webSearch.disableAriaLabel")
                : t("input.webSearch.enableAriaLabel")
            }
            title={
              webSearchArmed
                ? t("input.webSearch.disableTitle")
                : t("input.webSearch.enableTitle")
            }
            data-onboarding-id="chat-web-search-button"
          >
            <Search className="size-4" />
            <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full border border-zaki-subtle bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-zaki-muted opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 dark:border-zaki-dark dark:bg-zaki-dark-card dark:text-zaki-dark-muted">
              {webSearchArmed
                ? t("input.webSearch.onPill")
                : t("input.webSearch.offPill")}
            </span>
            </button>
          ) : null}
          {!zakiBotMode && webSearchArmed ? (
            <button
              type="button"
              onClick={onToggleWebSearch}
              className="inline-flex items-center rounded-full border border-zaki-accent/30 bg-zaki-accent/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zaki-accent"
            >
              {t("input.webSearch.activePill")}
            </button>
          ) : null}
          {!zakiBotMode && queryModeEnabled ? (
            <span className="inline-flex items-center rounded-full border border-zaki-accent/30 bg-zaki-accent/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zaki-accent">
              {t("input.queryMode.activePill")}
            </span>
          ) : null}
          <span className="flex-1" />
          <button
            type={isStopMode ? "button" : "submit"}
            onClick={isStopMode ? onStop : undefined}
            disabled={isStopMode ? typeof onStop !== "function" : !canSend}
            className="zaki-button-bounce size-11 sm:size-9 bg-zaki-brand hover:bg-zaki-brand-hover rounded-xl flex items-center justify-center border border-zaki-brand/30 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-zaki-accent focus-visible:ring-offset-2"
            aria-label={isStopMode ? t("input.stopAria") : t("input.sendAria")}
          >
            {isStopMode ? (
              <X className="size-4 text-white" />
            ) : (
              <ArrowUp className="size-4 text-white" />
            )}
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
      {quotaBadge ? (
        <div className="mt-1 flex justify-center">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
              quotaBadge.tone === "danger"
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300"
                : quotaBadge.tone === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300"
                  : "border-zaki-subtle bg-white text-zaki-muted dark:border-zaki-dark dark:bg-zaki-dark-elevated dark:text-zaki-dark-muted"
            )}
          >
            {quotaBadge.label}
          </span>
        </div>
      ) : null}
      <div className={cn("text-center", quotaBadge ? "mt-1" : "mt-2")}>
         <p className="text-zaki-disabled text-xs" dir={isRtl ? "rtl" : "ltr"}>
           {t("input.disclaimer")}
         </p>
      </div>
    </div>
  );
}
