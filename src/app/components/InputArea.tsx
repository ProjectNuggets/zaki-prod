import { Plus, ArrowUp, Sparkles, Paperclip, Search, GraduationCap, File as FileIcon, FileText, X, Zap, Check, Mic, Square } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useEntitlements } from "@/queries";
import { resolveEffectiveEntitlement } from "@/lib/entitlements";
import { trackProductEvent } from "@/lib/productTelemetry";
import { transcribeAudio } from "@/lib/api";
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
  const entitlements = entitlementsResult?.data ?? null;
  const effectiveEntitlement = resolveEffectiveEntitlement(entitlements);
  const isPremium = effectiveEntitlement.premium;
  const activeViaAccessCode = effectiveEntitlement.source === "access_code";
  const canToggleQueryMode = typeof onToggleQueryMode === "function";
  const canToggleWebSearch = typeof onToggleWebSearch === "function";

  // ── Voice recording (STT) ──────────────────────────────────────────
  const MAX_RECORDING_SECONDS = 60;
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSecondsLeft, setRecordingSecondsLeft] = useState(MAX_RECORDING_SECONDS);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingCancelledRef = useRef(false);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearRecordingTimers = useCallback(() => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Prefer webm (Chrome/Edge), fall back to mp4 (Safari/iOS), then wav
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "audio/wav";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recordingCancelledRef.current = false;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        // Stop all tracks to release the mic
        stream.getTracks().forEach((t) => t.stop());
        clearRecordingTimers();
        if (recordingCancelledRef.current) return;
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size === 0) return;
        setIsTranscribing(true);
        try {
          const buf = await blob.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = "";
          bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
          const b64 = btoa(binary);
          const format = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "m4a" : "wav";
          const result = await transcribeAudio(b64, format);
          const transcribedText = result.data?.text?.trim();
          if (transcribedText) {
            setInputValue((prev) => (prev ? `${prev} ${transcribedText}` : transcribedText));
            textareaRef.current?.focus();
            void trackProductEvent({ event: "voice_dictate_completed", source: "chat_input" });
          } else {
            toast.info("No speech detected");
            void trackProductEvent({ event: "voice_dictate_failed", source: "chat_input" });
          }
        } catch {
          toast.error("Voice transcription failed");
          void trackProductEvent({ event: "voice_dictate_failed", source: "chat_input" });
        } finally {
          setIsTranscribing(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSecondsLeft(MAX_RECORDING_SECONDS);
      void trackProductEvent({ event: "voice_dictate_started", source: "chat_input" });

      // Countdown tick
      recordingIntervalRef.current = setInterval(() => {
        setRecordingSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      // Hard cap — auto-stop and transcribe whatever was recorded
      recordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }, MAX_RECORDING_SECONDS * 1000);
    } catch {
      toast.error("Microphone access denied");
      void trackProductEvent({ event: "voice_dictate_failed", source: "chat_input" });
    }
  }, [clearRecordingTimers]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      recordingCancelledRef.current = false;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      recordingCancelledRef.current = true;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearRecordingTimers();
    }
  }, [clearRecordingTimers]);

  useEffect(() => clearRecordingTimers, [clearRecordingTimers]);

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
      <form onSubmit={handleSubmit} className="zaki-input-form relative z-10" dir={isRtl ? "rtl" : "ltr"}>
        <div className="rounded-zaki-xl border border-zaki-strong bg-zaki-raised font-body shadow-[0px_16px_36px_rgba(15,15,15,0.06)] overflow-visible p-0">
          {showUpgradeStrip ? (
            <div
              className={cn(
                "w-full rounded-full bg-zaki-raised text-zaki-muted text-2xs px-3 py-1.5 flex items-center gap-2 leading-[16px] translate-y-[2px]",
                isRtl ? "justify-end text-right" : "justify-start text-left"
              )}
            >
              {isRtl ? (
                <>
                  <button
                    type="button"
                    className="inline-flex items-center rounded-full bg-zaki-success px-2 py-0.5 text-2xs font-semibold text-zaki-success transition-colors hover:brightness-95"
                    onClick={() => {
                      if (!isPremium) {
                        void trackProductEvent({
                          event: "upgrade_cta_clicked",
                          source: "chat_input",
                          language: isRtl ? "ar" : "en",
                          plan: "personal",
                          interval: "monthly",
                        }).catch(() => {
                          // Best-effort telemetry only.
                        });
                      }
                      navigate("/pricing?source=chat_input");
                    }}
                  >
                    {activeViaAccessCode
                      ? t("input.manageAccessCta")
                      : isPremium
                      ? t("sidebar.profile.managePlan")
                      : t("input.upgradeCta")}
                  </button>
                  <span className="text-zaki-secondary">
                    {activeViaAccessCode ? t("input.accessLabel") : t("input.upgradeLabel")}
                  </span>
                  <span className="inline-flex size-4 items-center justify-center rounded-full bg-zaki-elevated text-zaki-muted">
                    <Zap className="size-3" />
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-flex size-4 items-center justify-center rounded-full bg-zaki-elevated text-zaki-muted">
                    <Zap className="size-3" />
                  </span>
                  <span className="text-zaki-secondary">
                    {activeViaAccessCode ? t("input.accessLabel") : t("input.upgradeLabel")}
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center rounded-full bg-zaki-success px-2 py-0.5 text-2xs font-semibold text-zaki-success transition-colors hover:brightness-95"
                    onClick={() => {
                      if (!isPremium) {
                        void trackProductEvent({
                          event: "upgrade_cta_clicked",
                          source: "chat_input",
                          language: isRtl ? "ar" : "en",
                          plan: "personal",
                          interval: "monthly",
                        }).catch(() => {
                          // Best-effort telemetry only.
                        });
                      }
                      navigate("/pricing?source=chat_input");
                    }}
                  >
                    {activeViaAccessCode
                      ? t("input.manageAccessCta")
                      : isPremium
                      ? t("sidebar.profile.managePlan")
                      : t("input.upgradeCta")}
                  </button>
                </>
              )}
            </div>
          ) : null}
          <div
            className={cn(
              "w-full rounded-[16px] border border-zaki-strong bg-zaki-raised font-body px-3 py-2.5 flex flex-col gap-2 relative dark:bg-[#141210]",
              showUpgradeStrip ? "mt-2" : "mt-0"
            )}
          >
        {attachments.length > 0 && (
          <div className="flex flex-col gap-2 px-1">
            <div className="flex flex-wrap gap-2">
              {previews.map((preview, index) =>
                preview.url ? (
                  <div
                    key={`${preview.file.name}-${index}`}
                    className="relative size-[56px] rounded-zaki-md bg-zaki-elevated border border-zaki-strong overflow-hidden flex items-center justify-center"
                  >
                    <img
                      src={preview.url}
                      alt={preview.file.name}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      className={cn(
                        "absolute -top-1 size-5 rounded-full bg-zaki-elevated shadow border border-zaki-strong flex items-center justify-center text-zaki-muted hover:text-zaki-secondary focus-visible:ring-2 focus-visible:ring-zaki-accent",
                        isRtl ? "-left-1" : "-right-1"
                      )}
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
              {previews.map((preview, index) =>
                preview.url ? null : (
                  <div
                    key={`${preview.file.name}-${index}`}
                    className="inline-flex items-center gap-2 rounded-full border border-zaki-strong bg-zaki-elevated pl-3 pr-2 py-1 text-xs text-zaki-secondary"
                  >
                    <FileIcon className="size-3.5 text-zaki-muted" />
                    <span className="max-w-[200px] truncate">{preview.file.name}</span>
                    <button
                      type="button"
                      className="size-5 rounded-full flex items-center justify-center text-zaki-muted hover:bg-zaki-sunken hover:text-zaki-secondary focus-visible:ring-2 focus-visible:ring-zaki-accent"
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
              "zaki-input-field flex-1 bg-transparent font-body text-zaki-primary placeholder-zaki text-sm px-1 py-1.5 resize-none min-h-[30px] max-h-[160px] overflow-y-auto outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 zaki-scrollbar-fade",
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
              className="size-9 bg-zaki-elevated rounded-full flex items-center justify-center border border-zaki-strong hover:bg-zaki-sunken dark:hover:bg-zaki-dark-hover transition-colors focus-visible:ring-2 focus-visible:ring-zaki-accent focus-visible:ring-offset-2"
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
                className={cn(
                  "absolute bottom-10 w-56 rounded-zaki-lg border border-zaki-strong bg-zaki-raised font-body shadow-[0px_16px_30px_rgba(15,15,15,0.12)] p-1 z-30 dark:bg-[#1a1714]",
                  isRtl ? "right-0" : "left-0"
                )}
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
                  className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary transition-colors hover:bg-zaki-hover"
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
                  <span className="flex-1 text-left rtl:text-right">{t("input.menu.studyLearn")}</span>
                  <span className={cn(
                    "inline-flex shrink-0 items-center rounded-full border border-zaki-strong bg-zaki-elevated px-2 py-0.5 text-[10px] font-semibold text-zaki-muted",
                    isRtl ? "mr-auto" : "ml-auto"
                  )}>
                    {t("input.menu.comingSoonPill")}
                  </span>
                </button>
                <div className="my-1 h-px bg-zaki-subtle" />
                <button
                  className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary transition-colors hover:bg-zaki-hover"
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
                  <span className="flex-1 text-left rtl:text-right">{t("input.menu.generateImage")}</span>
                  <span className={cn(
                    "inline-flex shrink-0 items-center rounded-full border border-zaki-strong bg-zaki-elevated px-2 py-0.5 text-[10px] font-semibold text-zaki-muted",
                    isRtl ? "mr-auto" : "ml-auto"
                  )}>
                    {t("input.menu.comingSoonPill")}
                  </span>
                </button>
              </div>
            )}
            </div>
          ) : null}
          {zakiBotMode ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
              className="zaki-button-bounce size-11 sm:size-9 bg-zaki-elevated rounded-full flex items-center justify-center border border-zaki-strong hover:bg-zaki-sunken dark:hover:bg-zaki-dark-hover focus-visible:ring-2 focus-visible:ring-zaki-accent focus-visible:ring-offset-2 transition-colors disabled:opacity-60"
              aria-label={t("input.menu.uploadFile")}
              title={t("input.menu.uploadFile")}
            >
              <Paperclip className="size-4 text-zaki-muted" />
            </button>
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
              "group relative size-9 rounded-full flex items-center justify-center border transition-colors",
              webSearchArmed
                ? "bg-zaki-accent/10 border-zaki-accent/40 text-zaki-accent"
                : "bg-zaki-elevated border-zaki-strong text-zaki-muted hover:bg-zaki-sunken dark:hover:bg-zaki-dark-hover",
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
            <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full border border-zaki-strong bg-zaki-elevated px-2 py-0.5 text-[10px] font-semibold text-zaki-muted opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
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
          {/* Mic button — STT voice input (available on all chat surfaces) */}
          {!isStopMode ? (
            <>
              {isRecording ? (
                <>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide text-zaki-muted tabular-nums"
                    aria-live="polite"
                  >
                    {`Recording ${recordingSecondsLeft}s`}
                  </span>
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="zaki-button-bounce size-11 sm:size-9 rounded-full flex items-center justify-center border border-zaki-strong bg-zaki-elevated hover:bg-zaki-sunken focus-visible:ring-2 focus-visible:ring-zaki-accent focus-visible:ring-offset-2 transition-colors"
                    aria-label="Cancel recording"
                  >
                    <X className="size-4 text-zaki-muted" />
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing || isSending}
                className={cn(
                  "zaki-button-bounce size-11 sm:size-9 rounded-full flex items-center justify-center border focus-visible:ring-2 focus-visible:ring-zaki-accent focus-visible:ring-offset-2 disabled:opacity-60 transition-colors",
                  isRecording
                    ? "bg-zaki-brand hover:bg-zaki-brand-hover border-zaki-brand/30"
                    : "bg-zaki-elevated hover:bg-zaki-sunken border-zaki-strong"
                )}
                aria-label={isRecording ? "Stop recording" : isTranscribing ? "Transcribing..." : "Voice input"}
              >
                {isTranscribing ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-zaki-muted border-t-transparent" />
                ) : isRecording ? (
                  <Square className="size-3.5 text-white" />
                ) : (
                  <Mic className="size-4 text-zaki-muted" />
                )}
              </button>
            </>
          ) : null}
          <button
            type={isStopMode ? "button" : "submit"}
            onClick={isStopMode ? onStop : undefined}
            disabled={isStopMode ? typeof onStop !== "function" : !canSend}
            className="zaki-button-bounce size-11 sm:size-9 bg-zaki-brand hover:bg-zaki-brand-hover rounded-full flex items-center justify-center border border-zaki-brand/30 shadow-[0_2px_8px_rgba(241,2,2,0.15)] hover:shadow-[0_8px_24px_rgba(241,2,2,0.25)] transition-shadow disabled:opacity-60 disabled:shadow-none focus-visible:ring-2 focus-visible:ring-zaki-accent focus-visible:ring-offset-2"
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
                  : "border-zaki-strong bg-zaki-elevated text-zaki-muted"
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
