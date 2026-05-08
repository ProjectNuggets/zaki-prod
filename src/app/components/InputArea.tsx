import { Plus, ArrowUp, Paperclip, Search, File as FileIcon, FileText, X, Zap, Check, Mic, Square } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useEntitlements } from "@/queries";
import { resolveEffectiveEntitlement } from "@/lib/entitlements";
import { trackProductEvent } from "@/lib/productTelemetry";
import { transcribeAudio, type AgentSessionMode } from "@/lib/api";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";
import {
  getDisplayOrder,
  resolveCanonical,
  type SlashCommand,
} from "@/lib/slashCommands";
import { toast } from "sonner";
import { SlashCommandPalette } from "./chat/SlashCommandPalette";

const MAX_RECORDING_SECONDS = 60;
const SLASH_LISTBOX_ID = "slash-command-listbox";

const slashOptionId = (index: number) => `slash-command-option-${index}`;

function detectSlash(value: string): { active: boolean; filter: string } {
  if (!value.startsWith("/")) return { active: false, filter: "" };
  if (value.includes(" ") || value.includes("\n")) return { active: false, filter: "" };
  return { active: true, filter: value.slice(1) };
}

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
  zakiMode = "execute",
  onZakiModeChange,
  zakiModePending = false,
  zakiContextPressurePercent = null,
  zakiContextTooltipCopy = null,
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
  zakiMode?: AgentSessionMode | null;
  onZakiModeChange?: (mode: AgentSessionMode) => void | Promise<void>;
  zakiModePending?: boolean;
  zakiContextPressurePercent?: number | null;
  zakiContextTooltipCopy?: string | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOnboardingControlsLocked, setIsOnboardingControlsLocked] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashHighlight, setSlashHighlight] = useState(0);
  const [showAliases, setShowAliases] = useState(false);
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
  const slashFilter = useMemo(() => detectSlash(inputValue).filter, [inputValue]);
  const filteredSlashCommands = useMemo<SlashCommand[]>(
    () => getDisplayOrder({ filter: slashFilter, showAliases, isOperator: false }).flat,
    [slashFilter, showAliases],
  );
  const effectiveZakiMode: AgentSessionMode = zakiMode ?? "execute";
  const showZakiModeHint = zakiBotMode && effectiveZakiMode !== "execute";
  const zakiContextTooltip = zakiContextTooltipCopy || t("input.zaki.contextTooltip");

  const handleToggleAliases = useCallback(() => {
    setShowAliases((value) => !value);
    setSlashHighlight(0);
  }, []);

  const handleSlashSelect = useCallback((cmd: SlashCommand) => {
    const canonical = resolveCanonical(cmd);
    const next = canonical + (cmd.takesArgs ? " " : "");
    setInputValue(next);
    setSlashOpen(false);
    setSlashHighlight(0);
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      const end = next.length;
      textarea.setSelectionRange(end, end);
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    });
  }, []);

  // Phase 4-B (2026-05-08) — Compaction meter visibility threshold.
  //
  // The percent comes straight from the backend's
  // `context_pressure_percent` (zakiSessionUiStore.setContextPressure ←
  // ChatArea.refreshContextGauge ← fetchAgentSessionContext). It is
  // already sourced from real token pressure, no local heuristic.
  //
  // Earlier behavior surfaced the meter at any pressure > 0, which made
  // the ring appear from the very first message and feel like it was
  // "running fast" as natural per-turn growth landed. A new conversation
  // at 8% on turn 2 followed by 14% on turn 3 reads as motion when the
  // user hasn't yet entered the pressure window where compaction matters.
  // Threshold lifted to 40% so the meter only appears once context is
  // actually starting to fill and stays out of the way otherwise.
  const COMPACTION_VISIBILITY_THRESHOLD = 40;
  const showZakiContextMeter =
    zakiBotMode &&
    typeof zakiContextPressurePercent === "number" &&
    zakiContextPressurePercent >= COMPACTION_VISIBILITY_THRESHOLD;
  const zakiContextValue = Math.max(0, Math.min(100, Math.round(zakiContextPressurePercent ?? 0)));
  // M3: tiered color by pressure, brand-coherent: ≤50% teal (success),
  // ≤75% amber (warning), >75% red (brand). Resolves via CSS variables so
  // theme changes propagate.
  const pressureColor =
    zakiContextValue <= 50
      ? "var(--zaki-success)"
      : zakiContextValue <= 75
        ? "var(--zaki-warning)"
        : "var(--zaki-brand)";

  // ── Voice recording (STT) ──────────────────────────────────────────
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
        if (blob.size === 0) {
          toast.info(t("input.voice.errorGeneric"));
          void trackProductEvent({ event: "voice_dictate_failed", source: "chat_input" });
          return;
        }
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
            toast.info(t("input.voice.errorGeneric"));
            void trackProductEvent({ event: "voice_dictate_failed", source: "chat_input" });
          }
        } catch {
          toast.error(t("input.voice.errorGeneric"));
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
      toast.error(t("input.voice.errorMicAccess"));
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

  // Release any pending timers and stop an active recorder on unmount.
  useEffect(() => {
    return () => {
      clearRecordingTimers();
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        recordingCancelledRef.current = true;
        mediaRecorderRef.current.stop();
      }
    };
  }, [clearRecordingTimers]);

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
  }, [inputValue.length, placeholderSuggestions.length]);

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

  const handleOpenZakiAttachmentPicker = useCallback(() => {
    if (!isOnboardingControlsLocked) {
      setMenuOpen(false);
    }
    fileInputRef.current?.click();
  }, [isOnboardingControlsLocked]);

  const handleSelectZakiMode = useCallback(
    (mode: AgentSessionMode) => {
      if (!onZakiModeChange || zakiModePending) return;
      void onZakiModeChange(mode);
      if (!isOnboardingControlsLocked) {
        setMenuOpen(false);
      }
    },
    [isOnboardingControlsLocked, onZakiModeChange, zakiModePending]
  );

  return (
    <div
      className="zaki-input-shell w-full max-w-3xl mx-auto px-4 pb-6 z-10 relative"
      style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
    >
      {/* Input Box */}
      <form onSubmit={handleSubmit} className="zaki-input-form relative z-10" dir={isRtl ? "rtl" : "ltr"}>
        <SlashCommandPalette
          open={slashOpen}
          filter={slashFilter}
          highlightIndex={slashHighlight}
          onHighlightChange={setSlashHighlight}
          onSelect={handleSlashSelect}
          onDismiss={() => setSlashOpen(false)}
          showAliases={showAliases}
          onToggleAliases={handleToggleAliases}
          isOperator={false}
          isRtl={isRtl}
          listboxId={SLASH_LISTBOX_ID}
          optionId={slashOptionId}
        />
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
            role="combobox"
            aria-expanded={slashOpen}
            aria-controls={SLASH_LISTBOX_ID}
            aria-autocomplete="list"
            aria-activedescendant={
              slashOpen && filteredSlashCommands.length > 0
                ? slashOptionId(slashHighlight)
                : undefined
            }
            onChange={(e) => {
              const value = e.target.value;
              setInputValue(value);
              const { active } = detectSlash(value);
              setSlashOpen(active);
              if (active) setSlashHighlight(0);
              if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
                textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
              }
            }}
            onKeyDown={(event) => {
              if (slashOpen && filteredSlashCommands.length > 0) {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setSlashHighlight((index) => (index + 1) % filteredSlashCommands.length);
                  return;
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setSlashHighlight(
                    (index) =>
                      (index - 1 + filteredSlashCommands.length) % filteredSlashCommands.length,
                  );
                  return;
                }
                if (event.key === "Tab") {
                  event.preventDefault();
                  const cmd = filteredSlashCommands[slashHighlight];
                  if (cmd) handleSlashSelect(cmd);
                  return;
                }
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  const cmd = filteredSlashCommands[slashHighlight];
                  if (cmd) handleSlashSelect(cmd);
                  return;
                }
              }
              if (slashOpen && event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setSlashOpen(false);
                setInputValue("");
                return;
              }
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
                {zakiBotMode ? (
                  <>
                    <button
                      className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors"
                      type="button"
                      role="menuitem"
                      onClick={handleOpenZakiAttachmentPicker}
                      data-testid="zaki-composer-upload"
                    >
                      <Paperclip className="size-4 text-zaki-muted" />
                      {t("input.zaki.uploadFile")}
                    </button>
                    <div className="my-1 h-px bg-zaki-subtle" />
                    {(["plan", "execute", "review"] as AgentSessionMode[]).map((mode) => {
                      const selected = effectiveZakiMode === mode;
                      return (
                        <button
                          key={mode}
                          className={cn(
                            "w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm transition-colors",
                            selected
                              ? "bg-zaki-hover text-zaki-primary"
                              : "text-zaki-primary hover:bg-zaki-hover",
                            (zakiModePending || !onZakiModeChange) && "opacity-60 cursor-not-allowed"
                          )}
                          type="button"
                          role="menuitemradio"
                          aria-checked={selected}
                          onClick={() => handleSelectZakiMode(mode)}
                          disabled={zakiModePending || !onZakiModeChange}
                          data-testid={`zaki-composer-mode-${mode}`}
                        >
                          <span className="flex-1 text-left rtl:text-right">
                            {t(`zakiControls.modes.${mode}`)}
                          </span>
                          {selected ? (
                            <Check className={cn("size-4 text-zaki-primary", isRtl ? "mr-auto" : "ml-auto")} />
                          ) : null}
                        </button>
                      );
                    })}
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            )}
          </div>
          {/* Phase 4-B (2026-05-08) — Mode indicator. The 3-pill always-on row
              was redundant with the "+" composer menu's mode selector; it
              shouted the available modes at every turn. The composer menu
              is the source of truth for switching mode. We surface only
              the active selection, and only when it is something other
              than the default "execute" — Plan / Review get a subtle
              brand-tinted pill, Execute stays silent. */}
          {showZakiModeHint ? (
            <button
              type="button"
              onClick={() => handleSelectZakiMode("execute")}
              disabled={zakiModePending || !onZakiModeChange}
              aria-label={t("input.zaki.modeHint", { mode: t(`zakiControls.modes.${effectiveZakiMode}`) })}
              data-testid="zaki-mode-hint"
              className={cn(
                "inline-flex items-center gap-1 rounded-full bg-zaki-brand-10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zaki-brand transition-colors hover:bg-zaki-brand-15",
                (zakiModePending || !onZakiModeChange) && "opacity-60 cursor-not-allowed"
              )}
            >
              {t(`zakiControls.modes.${effectiveZakiMode}`)}
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
          {/* M3: Context pressure meter — conic-gradient ring with tiered color */}
          {showZakiContextMeter ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="group inline-flex size-9 items-center justify-center rounded-full border border-zaki-strong bg-zaki-elevated text-zaki-muted transition-colors hover:bg-zaki-sunken focus-visible:ring-2 focus-visible:ring-zaki-accent focus-visible:ring-offset-2"
                  aria-label={t("input.zaki.contextAria", { percent: zakiContextValue })}
                  data-testid="zaki-context-meter"
                >
                  <span
                    className="relative block size-4 rounded-full"
                    style={{
                      background: `conic-gradient(${pressureColor} ${zakiContextValue}%, rgba(120,114,106,0.18) ${zakiContextValue}% 100%)`,
                    }}
                  >
                    <span className="absolute inset-[3px] rounded-full bg-zaki-elevated" />
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8} className="max-w-[220px]">
                <div className="space-y-0.5">
                  <div>{t("input.zaki.contextPercent", { percent: zakiContextValue })}</div>
                  <div className="text-[11px] opacity-90">{zakiContextTooltip}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : null}
          {/* Mic button — STT voice input (available on all chat surfaces) */}
          {!isStopMode ? (
            <>
              {isRecording ? (
                <>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide text-zaki-muted tabular-nums"
                    aria-hidden="true"
                  >
                    {`${t("input.voice.recording")} ${recordingSecondsLeft}s`}
                  </span>
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="zaki-button-bounce size-11 sm:size-9 rounded-full flex items-center justify-center border border-zaki-strong bg-zaki-elevated hover:bg-zaki-sunken focus-visible:ring-2 focus-visible:ring-zaki-accent focus-visible:ring-offset-2 transition-colors"
                    aria-label={t("input.voice.stop")}
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
                aria-label={isRecording ? t("input.voice.stop") : isTranscribing ? t("input.voice.listening") : t("input.voice.tapToRecord")}
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
                ? "border-zaki-strong bg-zaki-error text-zaki-error"
                : quotaBadge.tone === "warning"
                  ? "border-zaki-warning bg-zaki-warning text-zaki-warning"
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
