import { Plus, ArrowUp, Paperclip, Search, File as FileIcon, FileText, X, Zap, Check, Mic, Square, CalendarClock } from "lucide-react";
import { ScheduleFollowUpDialog } from "@/app/components/agent/ScheduleFollowUpDialog";
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useEntitlements, useBrainSearch } from "@/queries";
import { BrainMentionPopover } from "./chat/BrainMentionPopover";
import type { BrainGraphNode } from "@/lib/api";
import {
  usePinnedContext,
  buildPinnedContextPrefix,
} from "@/queries/usePinnedContext";
import { PinContextSheet } from "@/app/components/agent/PinContextSheet";
import { Pin } from "lucide-react";
import { resolveEffectiveEntitlement } from "@/lib/entitlements";
import { trackProductEvent } from "@/lib/productTelemetry";
import { transcribeAudio, type AgentSessionMode } from "@/lib/api";
import { applyExpansion } from "@/lib/expansionShortcuts";
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

/**
 * Brain @-mention detection — looks at the substring before the cursor
 * for the most recent "@" preceded by start-of-string or whitespace.
 * Returns the active filter (everything after that @ up to the cursor)
 * and the @ position so callers can splice on selection.
 */
export function detectMention(
  value: string,
  cursorPos: number,
): { active: boolean; filter: string; startPos: number } {
  if (!value || cursorPos < 1) return { active: false, filter: "", startPos: -1 };
  const before = value.slice(0, cursorPos);
  const at = before.lastIndexOf("@");
  if (at === -1) return { active: false, filter: "", startPos: -1 };
  // The @ must be at start-of-string or preceded by whitespace.
  if (at > 0 && !/\s/.test(before.charAt(at - 1))) {
    return { active: false, filter: "", startPos: -1 };
  }
  const fragment = before.slice(at + 1);
  // No whitespace in the fragment — once the user types a space, the
  // mention closes.
  if (/\s/.test(fragment)) return { active: false, filter: "", startPos: -1 };
  return { active: true, filter: fragment, startPos: at };
}

// 2026-05-08 — Imperative API for sending a turn that bypasses the
// textarea draft. Used by:
//   - the high-pressure /compact pre-flight banner (sends the literal
//     "/compact" command without disturbing the user's in-progress
//     draft or staged attachments — actually, attachments tag along
//     so a user with a file ready can still get the file delivered
//     after compaction)
//   - the quick-reply chips path in ChatArea (sends the chip prefill
//     while honoring per-turn toggles that live in InputArea state)
// Both routes flow through the same submitMessage logic so toggles,
// drafts, sessionStorage, and attachment-clearing all stay consistent.
export type InputAreaHandle = {
  submitWith: (text: string) => void;
};

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
  zakiCompactionThresholdPct = null,
  zakiContextTooltipCopy = null,
  threadKey = null,
  lastUserMessage = null,
  composerHandleRef = null,
  onCompact,
  isCompacting = false,
  agentUserId = null,
}: {
  onSend: (text: string, attachments: File[]) => void;
  /** Programmatic compact handler. When provided, the high-pressure
   *  pre-flight banner button calls this directly via the agent
   *  /compact endpoint instead of sending the literal "/compact" text
   *  through the chat pipeline. */
  onCompact?: () => Promise<void> | void;
  /** True while the compact request is in flight; banner button shows
   *  a spinner and disables to avoid double-submits. */
  isCompacting?: boolean;
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
  /** Backend-reported compaction trigger threshold (from agent
   *  diagnostics report.compaction_threshold_pct). When provided, the
   *  pre-flight banner fires 10pp BELOW this value so the user has a
   *  chance to /compact before the agent fires compaction itself. When
   *  null, falls back to a conservative 70% FE default. */
  zakiCompactionThresholdPct?: number | null;
  zakiContextTooltipCopy?: string | null;
  /** Stable identifier for the active thread/space, used to scope draft
   *  persistence and last-message recall. Null = no persistence. */
  threadKey?: string | null;
  /** Last sent user message text in this thread; ↑ on empty input
   *  recalls it for editing. */
  lastUserMessage?: string | null;
  /** Imperative escape hatch for parent-driven sends (compact pre-flight,
   *  quick replies). When invoked, runs through the same submitMessage
   *  pipeline — toggles, drafts, attachments all reset consistently. */
  composerHandleRef?: MutableRefObject<InputAreaHandle | null> | null;
  /** Resolved agent user id for brain mention search. When null, the
   *  @-mention popover stays inert. */
  agentUserId?: string | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scheduleFollowUpOpen, setScheduleFollowUpOpen] = useState(false);
  const [pinContextOpen, setPinContextOpen] = useState(false);
  const [isOnboardingControlsLocked, setIsOnboardingControlsLocked] = useState(false);
  // 2026-05-08 — Drop-overlay visual state. Tracks pixel-level dragenter
  // depth (a dragenter on a child fires another dragenter) so the overlay
  // doesn't flicker as the cursor moves over inner elements.
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragDepthRef = useRef(0);
  // 2026-05-08 — Per-thread draft persistence (table-stakes #6).
  // Drafts are scoped to threadKey via sessionStorage so navigating
  // away and back restores in-flight typing. Null threadKey skips
  // persistence (e.g. pre-thread empty states).
  const draftStorageKey = threadKey ? `zaki:draft:${threadKey}` : null;
  const [inputValue, setInputValue] = useState<string>(() => {
    if (!draftStorageKey || typeof window === "undefined") return "";
    try {
      return window.sessionStorage.getItem(draftStorageKey) ?? "";
    } catch {
      return "";
    }
  });
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashHighlight, setSlashHighlight] = useState(0);
  const [showAliases, setShowAliases] = useState(false);
  // Brain @-mention state. Cursor position is sampled on every change /
  // selectionchange so the popover can detect a mention even if the
  // user types in the middle of the line.
  const [mentionState, setMentionState] = useState<{
    open: boolean;
    filter: string;
    startPos: number;
  }>({ open: false, filter: "", startPos: -1 });
  const [mentionHighlight, setMentionHighlight] = useState(0);
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

  // Brain mention search. Only fires when the popover is open AND we
  // have a user id to scope the query to. The hook itself bails on
  // queries shorter than 2 chars and on 404 backends.
  const mentionEnabled = Boolean(zakiBotMode && agentUserId && mentionState.open);
  const { data: brainSearchData, isLoading: brainSearchLoading } = useBrainSearch(
    mentionEnabled ? (agentUserId as string) : "",
    mentionEnabled ? mentionState.filter : "",
  );
  const mentionResults: BrainGraphNode[] = useMemo(
    () => (mentionEnabled && brainSearchData?.results ? brainSearchData.results : []),
    [mentionEnabled, brainSearchData],
  );

  // Pinned-context state. Per-thread persistence via sessionStorage; we
  // gate visibility on zakiBotMode so the chip rail / plus-menu entry
  // never shows in the Web channel where pins have no meaning.
  const pinnedThreadKey = zakiBotMode ? threadKey : null;
  const { pins: pinnedMemories, pin: pinMemory, unpin: unpinMemory, limit: pinLimit } =
    usePinnedContext(pinnedThreadKey);
  const effectiveZakiMode: AgentSessionMode = zakiMode ?? "execute";
  const showZakiModeHint = zakiBotMode && effectiveZakiMode !== "execute";
  const zakiContextTooltip = zakiContextTooltipCopy || t("input.zaki.contextTooltip");

  // 2026-05-08 — Composer-level paste + drag-drop for files.
  //
  // Paste: Cmd/Ctrl+V into the textarea picks up image / file blobs from
  // clipboardData.files. We only preventDefault when there ARE files —
  // plain-text pastes fall through to the textarea's normal behavior.
  //
  // Drag-drop: dragenter / dragover / dragleave / drop wired on the form
  // container. dragenter depth counted via ref so the overlay doesn't
  // flicker when the cursor crosses an inner element. drop reads
  // dataTransfer.files and appends to attachments.
  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const cd = event.clipboardData;
      if (!cd) return;
      // Path 1 (Chrome/Firefox): clipboardData.files is populated for
      // image/file pastes. Path 2 (Safari, sometimes Chrome screenshots):
      // files is empty but clipboardData.items has entries with
      // kind === "file" — read them via getAsFile(). Cover both.
      const collected: File[] = Array.from(cd.files || []);
      if (collected.length === 0 && cd.items) {
        for (const item of Array.from(cd.items)) {
          if (item.kind === "file") {
            const f = item.getAsFile();
            if (f) collected.push(f);
          }
        }
      }
      if (collected.length === 0) return;
      event.preventDefault();
      setAttachments((prev) => [...prev, ...collected]);
    },
    [setAttachments]
  );

  // Window-level reset for drag-out-of-window. Native dragleave fires when
  // the cursor crosses an internal boundary but NOT when it exits the
  // window edge — without this the depth counter stays >0 and the overlay
  // sticks open after the user drags away. dragend fires when the source
  // releases on the page or anywhere else; we also listen for `drop`
  // outside the form (so a user dropping in another part of the app
  // doesn't leave our overlay up).
  useEffect(() => {
    if (!isDraggingFile) return;
    const reset = () => {
      dragDepthRef.current = 0;
      setIsDraggingFile(false);
    };
    window.addEventListener("dragend", reset);
    window.addEventListener("drop", reset);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("dragend", reset);
      window.removeEventListener("drop", reset);
      window.removeEventListener("blur", reset);
    };
  }, [isDraggingFile]);

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLFormElement>) => {
    if (!event.dataTransfer?.types.includes("Files")) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    if (dragDepthRef.current === 1) setIsDraggingFile(true);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLFormElement>) => {
    if (!event.dataTransfer?.types.includes("Files")) return;
    // Required so drop fires on this element.
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLFormElement>) => {
    if (!event.dataTransfer?.types.includes("Files")) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDraggingFile(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLFormElement>) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
      dragDepthRef.current = 0;
      setIsDraggingFile(false);
      const files = Array.from(event.dataTransfer.files || []);
      if (files.length === 0) return;
      setAttachments((prev) => [...prev, ...files]);
    },
    [setAttachments]
  );

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

  /**
   * Insert the selected memory into the textarea by splicing
   * "@<short_label> " in place of the in-progress @-token. Uses the
   * memory's display_label or summary, truncated so a long memory
   * doesn't take over the composer.
   */
  const handleMentionSelect = useCallback(
    (memory: BrainGraphNode) => {
      if (mentionState.startPos < 0) return;
      const textarea = textareaRef.current;
      const cursor = textarea?.selectionStart ?? mentionState.startPos + mentionState.filter.length + 1;
      const label = (memory.display_label || memory.summary || "").trim();
      const trimmedLabel =
        label.length > 60 ? `${label.slice(0, 57).trim()}...` : label;
      const insertion = `@${trimmedLabel} `;
      const before = inputValue.slice(0, mentionState.startPos);
      const after = inputValue.slice(cursor);
      const next = `${before}${insertion}${after}`;
      setInputValue(next);
      setMentionState({ open: false, filter: "", startPos: -1 });
      setMentionHighlight(0);
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.focus();
        const newCursor = before.length + insertion.length;
        ta.setSelectionRange(newCursor, newCursor);
        ta.style.height = "auto";
        ta.style.height = `${ta.scrollHeight}px`;
      });
    },
    [inputValue, mentionState],
  );

  // 2026-05-08 — Compaction meter mirrors token pressure 1:1.
  //
  // Source of truth chain:
  //   nullalis runtime emits compaction.auto pressure=NN% in its logs and
  //   exposes the same percent via /api/v1/users/{u}/sessions/{k}/context
  //     ↓ (proxied unchanged by Express BFF backend/src/index.js:10200)
  //   /api/agent/sessions/{k}/context → context_pressure_percent
  //     ↓
  //   ChatArea.refreshContextGauge → setContextPressure → store
  //     ↓
  //   InputArea reads activeSessionUi.contextPressurePercent
  //
  // No FE-side buckets. No tiered colors. Single brand-teal ring.
  // The real compaction trigger is per-session
  // (report.compaction_threshold_pct, surfaced in PowerUserSheet
  // diagnostics) — anything else here would be the FE inventing a signal
  // it does not own.
  //
  // P2-05: distinguish "unknown" (null — /context has not landed yet) from
  // "known-empty" (0 — backend says zero pressure). Unknown renders an
  // empty outline ring, known-empty renders the green 0% so the user can
  // tell whether the meter has data.
  const showZakiContextMeter = zakiBotMode;
  const hasZakiContextValue = typeof zakiContextPressurePercent === "number";
  const zakiContextValue = hasZakiContextValue
    ? Math.max(0, Math.min(100, Math.round(zakiContextPressurePercent as number)))
    : 0;
  const pressureColor = "var(--zaki-accent)";

  // Table-stakes #10 (2026-05-08, refined per WR-05 review) —
  // High-pressure pre-flight nudge.
  //
  // The agent's actual compaction trigger lives in
  // report.compaction_threshold_pct (per-session, dynamic). When that
  // value is plumbed to InputArea (zakiCompactionThresholdPct), we lead
  // it by 10pp so the user has a chance to /compact BEFORE the agent
  // fires compaction. Without backend-reported threshold, fall back to
  // a conservative 70% — clearly labeled as the FE default.
  //
  // Hysteresis: once the banner shows, it stays open until pressure
  // drops 5pp below the show line. Otherwise the user types one
  // character that nudges pressure up to the show line, the banner
  // appears, the next character drops below, the banner hides — flicker.
  const COMPACT_FALLBACK_SHOW_AT = 70;
  const COMPACT_LEAD_PP = 10;
  const COMPACT_HYSTERESIS_PP = 5;
  const compactShowLine =
    typeof zakiCompactionThresholdPct === "number" && zakiCompactionThresholdPct > 0
      ? Math.max(0, zakiCompactionThresholdPct - COMPACT_LEAD_PP)
      : COMPACT_FALLBACK_SHOW_AT;
  const compactHideLine = Math.max(0, compactShowLine - COMPACT_HYSTERESIS_PP);
  const compactArmedRef = useRef(false);
  if (hasZakiContextValue) {
    if (zakiContextValue >= compactShowLine) compactArmedRef.current = true;
    else if (zakiContextValue < compactHideLine) compactArmedRef.current = false;
  } else {
    compactArmedRef.current = false;
  }
  // When pressure is past the show line, the context meter itself
  // becomes the compact trigger. No separate rail. Hysteresis keeps
  // the meter from flickering between actionable/inert states.
  const compactArmed =
    zakiBotMode && !isSending && hasZakiContextValue && compactArmedRef.current;

  // P1-03 — discoverability nudge. When the meter first becomes armed
  // we briefly pulse a ring around it so the user notices the new
  // affordance without us adding a permanent label.
  const [armedPulse, setArmedPulse] = useState(false);
  const wasArmedRef = useRef(false);
  useEffect(() => {
    if (compactArmed && !wasArmedRef.current) {
      setArmedPulse(true);
      const timer = setTimeout(() => setArmedPulse(false), 1800);
      wasArmedRef.current = true;
      return () => clearTimeout(timer);
    }
    if (!compactArmed) wasArmedRef.current = false;
  }, [compactArmed]);

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

  // submitMessage centralizes every send path so toggles, drafts, and
  // attachments reset uniformly. textOverride lets parent-driven sends
  // (compact pre-flight, quick reply chips) bypass the textarea draft
  // while still flowing through this single pipeline.
  const submitMessage = useCallback(
    (textOverride?: string) => {
      if (isSending || sendLocked) return;
      const text = textOverride !== undefined ? textOverride : inputValue;
      if (!text.trim() && attachments.length === 0) return;
      // Prepend pinned-memory context so the agent sees the user's
      // explicitly-pinned brain entries on every turn. The pins live in
      // sessionStorage per thread; we DON'T mutate the textarea so the
      // user keeps seeing only what they typed.
      const pinnedPrefix = buildPinnedContextPrefix(pinnedMemories);
      const wireText = pinnedPrefix && text ? `${pinnedPrefix}${text}` : text;
      onSend(wireText, attachments);
      // Always clear the textarea after a send. For an override path
      // (compact / quick reply) the textarea may have held an unrelated
      // draft — that draft is intentionally consumed because the user
      // is sending a different message, and they can ↑ to recall.
      setInputValue("");
      if (attachments.length > 0) setAttachments([]);
      if (draftStorageKey && typeof window !== "undefined") {
        try {
          window.sessionStorage.removeItem(draftStorageKey);
        } catch {
          /* ignore */
        }
      }
    },
    [
      isSending,
      sendLocked,
      inputValue,
      attachments,
      onSend,
      setAttachments,
      draftStorageKey,
      pinnedMemories,
    ]
  );

  useImperativeHandle(
    composerHandleRef,
    () => ({
      submitWith: (text: string) => submitMessage(text),
    }),
    [submitMessage, composerHandleRef]
  );

  // 2026-05-08 — Draft persistence side-effects.
  //
  // (a) When threadKey changes, hydrate the new thread's draft into the
  //     textarea so navigating thread A → B → A restores A's in-progress
  //     text. Both branches handle the "no key" case by clearing.
  // (b) Persist every keystroke to sessionStorage. sessionStorage (not
  //     localStorage) so closing the browser doesn't surface stale drafts
  //     across sessions, and so multi-tab edits don't fight.
  //
  // P1-4 fix: track the previous draftStorageKey via ref so the persist
  // effect can detect "we just switched threads, the inputValue still
  // holds the OLD thread's text" and skip a write that would otherwise
  // briefly stamp the old draft under the new key before hydrate (a)
  // overwrites it. Without this guard, A → B momentarily writes A's
  // text under B's storage key.
  const prevDraftKeyRef = useRef<string | null>(draftStorageKey);
  useEffect(() => {
    if (!draftStorageKey || typeof window === "undefined") {
      setInputValue("");
      prevDraftKeyRef.current = draftStorageKey;
      return;
    }
    try {
      const restored = window.sessionStorage.getItem(draftStorageKey) ?? "";
      setInputValue(restored);
    } catch {
      setInputValue("");
    }
    prevDraftKeyRef.current = draftStorageKey;
    // intentional: re-run only when the thread switches
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftStorageKey || typeof window === "undefined") return;
    // Skip the write that fires immediately after a thread switch where
    // inputValue is still the OLD thread's text awaiting hydrate.
    if (prevDraftKeyRef.current !== draftStorageKey) return;
    try {
      if (inputValue) {
        window.sessionStorage.setItem(draftStorageKey, inputValue);
      } else {
        window.sessionStorage.removeItem(draftStorageKey);
      }
    } catch {
      /* ignore quota / disabled storage */
    }
  }, [draftStorageKey, inputValue]);

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
      <form
        onSubmit={handleSubmit}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="zaki-input-form relative z-10"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {isDraggingFile ? (
          <div
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-zaki-xl border-2 border-dashed border-zaki-brand bg-zaki-brand-10 backdrop-blur-sm"
            aria-hidden
          >
            <div className="flex flex-col items-center gap-1 text-sm font-medium text-zaki-brand">
              <Plus className="size-5" />
              <span>{t("input.dropFile")}</span>
            </div>
          </div>
        ) : null}
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
        <BrainMentionPopover
          open={mentionState.open && Boolean(zakiBotMode && agentUserId)}
          filter={mentionState.filter}
          results={mentionResults}
          isLoading={brainSearchLoading}
          highlightIndex={mentionHighlight}
          onHighlightChange={setMentionHighlight}
          onSelect={handleMentionSelect}
          onDismiss={() =>
            setMentionState({ open: false, filter: "", startPos: -1 })
          }
          isRtl={isRtl}
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
        {zakiBotMode && pinnedMemories.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-1.5 px-1"
            data-testid="zaki-pinned-context-rail"
          >
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-zaki-muted">
              <Pin className="size-3 text-zaki-brand" />
              {t("input.zaki.pinnedRailLabel", { defaultValue: "Pinned" })}
            </span>
            {pinnedMemories.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 rounded-full border border-zaki-strong bg-zaki-elevated px-2 py-0.5 text-[11px] text-zaki-primary"
              >
                <span className="max-w-[160px] truncate">{p.label}</span>
                <button
                  type="button"
                  onClick={() => unpinMemory(p.id)}
                  className="rounded-full p-0.5 text-zaki-muted transition-colors hover:bg-zaki-hover hover:text-zaki-primary"
                  aria-label={t("pinContext.unpinAria", {
                    defaultValue: "Unpin {{label}}",
                    label: p.label,
                  })}
                >
                  <X className="size-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
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
            onPaste={handlePaste}
            onChange={(e) => {
              let value = e.target.value;
              const ta = e.target;
              // Table-stakes #13 — Espanso-style snippet expansion. Only
              // fires when the user has just typed a `:trigger ` at the
              // caret (start of input or after whitespace + the trailing
              // space). Pasting `:weather` mid-paragraph never expands;
              // editing earlier in the input never expands.
              //
              // WR-01 (review fix) — set state only, do NOT write
              // el.value imperatively. The previous version raced with
              // fast typing: characters typed between the controlled
              // re-render and the rAF stamp got overwritten. Now React
              // owns the value and we restore the caret on the next tick
              // when the DOM has settled.
              const expanded = applyExpansion(value, ta.selectionStart ?? value.length);
              let nextCaret: number | null = null;
              if (expanded) {
                value = expanded.value;
                nextCaret = expanded.caret;
              }
              setInputValue(value);
              if (nextCaret !== null) {
                requestAnimationFrame(() => {
                  const el = textareaRef.current;
                  if (!el) return;
                  // Only restore the caret if the DOM still reflects the
                  // expansion we just applied — guards against further
                  // typing landing before rAF fires.
                  if (el.value === value && nextCaret !== null) {
                    el.setSelectionRange(nextCaret, nextCaret);
                  }
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                });
              }
              const { active } = detectSlash(value);
              setSlashOpen(active);
              if (active) setSlashHighlight(0);
              // Brain @-mention detection. Use the post-expansion caret
              // when available so an expansion that just landed doesn't
              // mis-detect a mention from the snippet.
              const cursor = nextCaret ?? ta.selectionStart ?? value.length;
              const mention = detectMention(value, cursor);
              if (mention.active && zakiBotMode && agentUserId) {
                setMentionState({
                  open: true,
                  filter: mention.filter,
                  startPos: mention.startPos,
                });
                setMentionHighlight(0);
              } else if (mentionState.open) {
                setMentionState({ open: false, filter: "", startPos: -1 });
              }
              if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
                textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
              }
            }}
            onKeyDown={(event) => {
              // Brain @-mention keyboard navigation. Takes priority
              // over slash because the user can have only one popover
              // open at a time and mentions can occur mid-text.
              const mentionResultsCount = mentionResults.length;
              if (mentionState.open && mentionResultsCount > 0) {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setMentionHighlight((index) => (index + 1) % mentionResultsCount);
                  return;
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setMentionHighlight(
                    (index) =>
                      (index - 1 + mentionResultsCount) % mentionResultsCount,
                  );
                  return;
                }
                if (event.key === "Tab" || (event.key === "Enter" && !event.shiftKey)) {
                  event.preventDefault();
                  const memory = mentionResults[mentionHighlight];
                  if (memory) handleMentionSelect(memory);
                  return;
                }
              }
              if (mentionState.open && event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setMentionState({ open: false, filter: "", startPos: -1 });
                return;
              }
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
              // 2026-05-08 — table-stakes #5: ↑ on empty input recalls
              // the last user message in this thread for editing. Match
              // Slack/iMessage muscle memory. Only fires when value is
              // empty AND a previous user message exists, so it does
              // not interfere with normal cursor navigation.
              if (
                event.key === "ArrowUp" &&
                !event.shiftKey &&
                !event.metaKey &&
                !event.ctrlKey &&
                inputValue.length === 0 &&
                typeof lastUserMessage === "string" &&
                lastUserMessage.length > 0
              ) {
                event.preventDefault();
                setInputValue(lastUserMessage);
                requestAnimationFrame(() => {
                  const el = textareaRef.current;
                  if (!el) return;
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                  const end = lastUserMessage.length;
                  el.setSelectionRange(end, end);
                });
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
                    <button
                      className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors"
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setScheduleFollowUpOpen(true);
                      }}
                      data-testid="zaki-composer-schedule-followup"
                    >
                      <CalendarClock className="size-4 text-zaki-muted" />
                      {t("input.zaki.scheduleFollowUp", { defaultValue: "Schedule a follow-up" })}
                    </button>
                    <button
                      className="w-full flex items-center gap-2 rounded-zaki-md px-2.5 py-2 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors"
                      type="button"
                      role="menuitem"
                      disabled={!agentUserId}
                      onClick={() => {
                        setMenuOpen(false);
                        setPinContextOpen(true);
                      }}
                      data-testid="zaki-composer-pin-context"
                    >
                      <Pin className="size-4 text-zaki-muted" />
                      {t("input.zaki.pinContext", { defaultValue: "Pin a memory" })}
                      {pinnedMemories.length > 0 ? (
                        <span className="ml-auto inline-flex items-center rounded-full bg-zaki-brand/10 px-1.5 text-[10px] font-semibold text-zaki-brand">
                          {pinnedMemories.length}
                        </span>
                      ) : null}
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
          {/* M3: Context pressure meter. When pressure crosses the
               compact-arming line the meter itself becomes the compact
               trigger — click to free space. Hysteresis on
               compactArmedRef keeps it from flickering. */}
          {showZakiContextMeter ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    if (!compactArmed || isCompacting) return;
                    if (onCompact) {
                      void onCompact();
                    } else {
                      submitMessage("/compact");
                    }
                  }}
                  disabled={compactArmed && isCompacting}
                  className={cn(
                    "group relative inline-flex size-9 items-center justify-center rounded-full border bg-zaki-elevated transition-colors focus-visible:ring-2 focus-visible:ring-offset-2",
                    compactArmed
                      ? "cursor-pointer border-zaki-warning text-zaki-warning hover:bg-zaki-warning/10 focus-visible:ring-zaki-warning"
                      : "cursor-default border-zaki-strong text-zaki-muted hover:bg-zaki-sunken focus-visible:ring-zaki-accent",
                    compactArmed && isCompacting && "opacity-70"
                  )}
                  aria-label={
                    compactArmed
                      ? t("input.zaki.contextCompactAria", {
                          percent: zakiContextValue,
                          defaultValue:
                            "Context at {{percent}} percent. Click to compact.",
                        })
                      : hasZakiContextValue
                        ? t("input.zaki.contextAria", { percent: zakiContextValue })
                        : t("input.zaki.contextAriaUnknown")
                  }
                  data-testid="zaki-context-meter"
                  data-armed={compactArmed ? "true" : "false"}
                >
                  {armedPulse ? (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-full border-2 border-zaki-warning animate-ping opacity-70"
                    />
                  ) : null}
                  {compactArmed && isCompacting ? (
                    <span className="size-4 animate-spin rounded-full border-2 border-zaki-warning border-t-transparent" />
                  ) : (
                    <span
                      className={cn(
                        "relative block size-4 rounded-full",
                        !hasZakiContextValue && "border border-dashed border-zaki-muted/50"
                      )}
                      style={
                        hasZakiContextValue
                          ? {
                              background: `conic-gradient(${
                                compactArmed ? "var(--zaki-warning)" : pressureColor
                              } ${zakiContextValue}%, rgba(120,114,106,0.18) ${zakiContextValue}% 100%)`,
                            }
                          : undefined
                      }
                    >
                      {hasZakiContextValue ? (
                        <span className="absolute inset-[3px] rounded-full bg-zaki-elevated" />
                      ) : null}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8} className="max-w-[240px]">
                <div className="space-y-0.5">
                  <div>
                    {hasZakiContextValue
                      ? t("input.zaki.contextPercent", { percent: zakiContextValue })
                      : t("input.zaki.contextPercentUnknown")}
                  </div>
                  {compactArmed ? (
                    <div className="text-[11px] font-medium text-zaki-warning">
                      {t(
                        isCompacting
                          ? "input.zaki.contextCompactBusy"
                          : "input.zaki.contextCompactHint",
                        {
                          defaultValue: isCompacting
                            ? "Compacting..."
                            : "Click to compact and free space.",
                        },
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] opacity-90">{zakiContextTooltip}</div>
                  )}
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
      <ScheduleFollowUpDialog
        isOpen={scheduleFollowUpOpen}
        onClose={() => setScheduleFollowUpOpen(false)}
        defaultPrompt={inputValue}
      />
      <PinContextSheet
        isOpen={pinContextOpen}
        onClose={() => setPinContextOpen(false)}
        agentUserId={agentUserId}
        pins={pinnedMemories}
        onPin={pinMemory}
        onUnpin={unpinMemory}
        limit={pinLimit}
      />
    </div>
  );
}
