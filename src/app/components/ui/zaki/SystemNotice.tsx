import {
  AlertCircle,
  AlertTriangle,
  Info,
  PackageX,
  ReplaceAll,
  Scissors,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const SYSTEM_NOTICE_EVENT = "zaki:system-notice";

export type SystemNoticeKind =
  | "compaction"
  | "provider_fallback"
  | "connector_stale"
  | "multimodal_failure"
  | "generic";

export type SystemNoticeSeverity = "info" | "warning" | "error";

export interface SystemNoticePayload {
  id?: string;
  kind: SystemNoticeKind;
  severity?: SystemNoticeSeverity;
  message?: string | null;
  detail?: string | null;
  at?: string | null;
  runId?: string | null;
}

export interface SystemNoticeProps {
  kind: SystemNoticeKind;
  severity?: SystemNoticeSeverity;
  message?: string | null;
  detail?: string | null;
  at?: string | null;
  onDismiss?: () => void;
  className?: string;
}

interface KindMeta {
  icon: LucideIcon;
  title: string;
  helper: string;
  defaultSeverity: SystemNoticeSeverity;
}

const KIND_META: Record<SystemNoticeKind, KindMeta> = {
  compaction: {
    icon: Scissors,
    title: "Context was compacted",
    helper:
      "To fit the model window, older turns were summarized. Replies may reference a condensed version of earlier conversation.",
    defaultSeverity: "info",
  },
  provider_fallback: {
    icon: ReplaceAll,
    title: "Provider fallback",
    helper:
      "The primary model was unavailable. This reply came from a fallback provider. Quality may differ.",
    defaultSeverity: "warning",
  },
  connector_stale: {
    icon: PackageX,
    title: "Connector is stale",
    helper:
      "A connector (Telegram, mail, calendar, drive) has expired credentials or is out of sync. Reconnect it in the Connect pane.",
    defaultSeverity: "warning",
  },
  multimodal_failure: {
    icon: AlertTriangle,
    title: "Attachment could not be processed",
    helper:
      "The image or voice input failed to transcribe or analyze. The reply below is based on text only.",
    defaultSeverity: "warning",
  },
  generic: {
    icon: Info,
    title: "System notice",
    helper: "Nullalis emitted a notice about this turn.",
    defaultSeverity: "info",
  },
};

const SEVERITY_TONE: Record<SystemNoticeSeverity, string> = {
  info: "border-sky-400/40 bg-sky-50 text-sky-900 dark:border-sky-800/40 dark:bg-sky-950/25 dark:text-sky-200",
  warning:
    "border-amber-400/60 bg-amber-50 text-amber-900 shadow-sm dark:border-amber-700/60 dark:bg-amber-950/35 dark:text-amber-100",
  error:
    "border-rose-500/70 bg-rose-50 text-rose-950 shadow-md ring-1 ring-rose-500/20 dark:border-rose-600/70 dark:bg-rose-950/50 dark:text-rose-100",
};

const SEVERITY_ICON_OVERRIDE: Partial<Record<SystemNoticeSeverity, LucideIcon>> = {
  error: AlertCircle,
};

/**
 * Trust-critical surface per W3.5: no silent fallback.
 *
 * Renders a visible banner whenever compaction, provider fallback, connector
 * staleness, multimodal failure, or a generic backend notice occurs. Severity
 * drives the visual weight (info subtle, warning visible, error prominent).
 * Must never be hidden behind an "advanced" toggle.
 */
export function SystemNotice({
  kind,
  severity,
  message,
  detail,
  at,
  onDismiss,
  className,
}: SystemNoticeProps) {
  const meta = KIND_META[kind] ?? KIND_META.generic;
  const effectiveSeverity = severity ?? meta.defaultSeverity;
  const Icon = SEVERITY_ICON_OVERRIDE[effectiveSeverity] ?? meta.icon;
  const bodyText = (message && message.trim()) || meta.helper;

  return (
    <div
      role={effectiveSeverity === "error" ? "alert" : "status"}
      aria-live={effectiveSeverity === "error" ? "assertive" : "polite"}
      data-testid="system-notice"
      data-kind={kind}
      data-severity={effectiveSeverity}
      className={cn(
        "flex items-start gap-3 rounded-zaki-lg border px-3 py-2.5 text-xs",
        SEVERITY_TONE[effectiveSeverity],
        className
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold">{meta.title}</div>
        <div className="mt-0.5 leading-relaxed opacity-90">{bodyText}</div>
        {detail ? (
          <div className="mt-1 font-mono-ui text-[11px] opacity-80">{detail}</div>
        ) : null}
        {at ? (
          <div className="mt-1 text-[10px] uppercase tracking-[0.12em] opacity-60">
            {at}
          </div>
        ) : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-70 hover:opacity-100"
        >
          dismiss
        </button>
      ) : null}
    </div>
  );
}

interface StoredNotice extends SystemNoticePayload {
  id: string;
}

export function useSystemNotices() {
  const [notices, setNotices] = useState<StoredNotice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<SystemNoticePayload>).detail;
      if (!detail || !detail.kind) return;
      const id =
        detail.id ||
        `${detail.kind}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
      setNotices((prev) => {
        if (prev.some((n) => n.id === id)) return prev;
        return [...prev, { ...detail, id }];
      });
    };
    window.addEventListener(SYSTEM_NOTICE_EVENT, handler);
    return () => window.removeEventListener(SYSTEM_NOTICE_EVENT, handler);
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotices((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { notices, dismiss };
}

export function emitSystemNotice(payload: SystemNoticePayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<SystemNoticePayload>(SYSTEM_NOTICE_EVENT, {
      detail: payload,
    })
  );
}

function isDismissible(payload: StoredNotice) {
  const severity =
    payload.severity ?? KIND_META[payload.kind]?.defaultSeverity ?? "info";
  return severity !== "error";
}

export function SystemNoticesStack({ className }: { className?: string }) {
  const { notices, dismiss } = useSystemNotices();
  if (notices.length === 0) return null;
  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      data-testid="system-notices-stack"
    >
      {notices.map((notice) => (
        <SystemNotice
          key={notice.id}
          kind={notice.kind}
          severity={notice.severity}
          message={notice.message}
          detail={notice.detail}
          at={notice.at}
          onDismiss={
            isDismissible(notice) ? () => dismiss(notice.id) : undefined
          }
        />
      ))}
    </div>
  );
}
