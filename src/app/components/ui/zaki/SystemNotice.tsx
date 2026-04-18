import { AlertTriangle, PackageX, ReplaceAll, Scissors } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const SYSTEM_NOTICE_EVENT = "zaki:system-notice";

export interface SystemNoticePayload {
  id?: string;
  kind: SystemNoticeKind;
  detail?: string | null;
  at?: string | null;
}

export type SystemNoticeKind =
  | "compaction"
  | "provider_fallback"
  | "connector_stale"
  | "multimodal_failure";

export interface SystemNoticeProps {
  kind: SystemNoticeKind;
  detail?: string | null;
  at?: string | null;
  onDismiss?: () => void;
  className?: string;
}

interface NoticeMeta {
  icon: LucideIcon;
  title: string;
  helper: string;
  tone: string;
}

const NOTICE_META: Record<SystemNoticeKind, NoticeMeta> = {
  compaction: {
    icon: Scissors,
    title: "Context was compacted",
    helper:
      "To fit the model window, older turns were summarized. Replies may reference a condensed version of earlier conversation.",
    tone: "border-amber-400/50 bg-amber-50 text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200",
  },
  provider_fallback: {
    icon: ReplaceAll,
    title: "Provider fallback",
    helper:
      "The primary model was unavailable. This reply came from a fallback provider. Quality may differ.",
    tone: "border-sky-400/50 bg-sky-50 text-sky-900 dark:border-sky-800/50 dark:bg-sky-950/30 dark:text-sky-200",
  },
  connector_stale: {
    icon: PackageX,
    title: "Connector is stale",
    helper:
      "A connector (Telegram, mail, calendar, drive) has expired credentials or is out of sync. Reconnect it in the Connect pane.",
    tone: "border-rose-400/50 bg-rose-50 text-rose-900 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-200",
  },
  multimodal_failure: {
    icon: AlertTriangle,
    title: "Attachment could not be processed",
    helper:
      "The image or voice input failed to transcribe or analyze. The reply below is based on text only.",
    tone: "border-amber-400/50 bg-amber-50 text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200",
  },
};

/**
 * Trust-critical surface per W3.5: no silent fallback.
 *
 * Renders a visible banner whenever compaction, provider fallback, connector
 * staleness, or multimodal failure occurs. Must never be hidden behind an
 * "advanced" toggle.
 */
export function SystemNotice({
  kind,
  detail,
  at,
  onDismiss,
  className,
}: SystemNoticeProps) {
  const meta = NOTICE_META[kind];
  const Icon = meta.icon;
  return (
    <div
      role="status"
      data-testid="system-notice"
      data-kind={kind}
      className={cn(
        "flex items-start gap-3 rounded-zaki-lg border px-3 py-2.5 text-xs",
        meta.tone,
        className
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold">{meta.title}</div>
        <div className="mt-0.5 leading-relaxed opacity-90">{meta.helper}</div>
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
          detail={notice.detail}
          at={notice.at}
          onDismiss={() => dismiss(notice.id)}
        />
      ))}
    </div>
  );
}
