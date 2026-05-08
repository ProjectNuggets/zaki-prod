import { useState, useEffect, useRef } from "react";
import { Plus, MessageSquare, Loader2, Download, Share2, Pencil, Trash2, Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { formatSessionTime } from "@/lib/zakiBot";
import { formatZakiSessionLabel, normalizeZakiSessionKey } from "@/lib/zakiSessions";
import type { AgentSession } from "@/lib/api";
import { useSessionTitleOverlay } from "@/queries/useSessionTitleOverlay";

interface ZakiSessionListProps {
  sessions: AgentSession[];
  isLoading: boolean;
  activeSessionKey: string | null;
  onSelectSession: (sessionKey: string) => void;
  onCreateSession: () => void;
  isRtl: boolean;
  /** Download the session's history as a JSON file. Optional so older
   *  call sites without the handler keep working. */
  onDownloadSession?: (sessionKey: string, label: string) => void;
  /** Open the share dialog for the given session. Selects the session
   *  first if needed so the share modal can read its messages. */
  onShareSession?: (sessionKey: string) => void;
  /** Permanent delete via /api/agent/sessions/:key DELETE. Optional. */
  onDeleteSession?: (sessionKey: string, label: string) => void;
}

export function ZakiSessionList({
  sessions,
  isLoading,
  activeSessionKey,
  onSelectSession,
  onCreateSession,
  isRtl,
  onDownloadSession,
  onShareSession,
  onDeleteSession,
}: ZakiSessionListProps) {
  const { getLabel: getOverlayLabel, setLabel: setOverlayLabel } = useSessionTitleOverlay();
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (renamingKey && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingKey]);
  const commitRename = (sessionKey: string, fallback: string) => {
    const trimmed = renameDraft.trim();
    if (trimmed && trimmed !== fallback) {
      setOverlayLabel(sessionKey, trimmed);
    }
    setRenamingKey(null);
    setRenameDraft("");
  };
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 text-zaki-muted animate-spin" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-zaki-hover flex items-center justify-center mb-3">
          <MessageSquare className="w-6 h-6 text-zaki-muted" />
        </div>
        <p className="text-sm text-zaki-primary font-medium mb-1">
          {t("zakiControls.sessionList.emptyTitle")}
        </p>
        <p className="text-xs text-zaki-secondary mb-4">
          {t("zakiControls.sessionList.emptyHelper")}
        </p>
        <button
          onClick={onCreateSession}
          className="flex items-center gap-2 px-3 py-2 bg-zaki-brand text-white text-sm font-medium rounded-zaki-xl hover:bg-zaki-brand-hover transition-colors"
          type="button"
        >
          <Plus className="size-4" />
          {t("zakiControls.sessionList.newSession")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {sessions.map((session) => {
        const normalizedSessionKey = normalizeZakiSessionKey(session.session_key);
        const isActive =
          activeSessionKey != null &&
          normalizedSessionKey === normalizeZakiSessionKey(activeSessionKey);
        const baseLabel = formatZakiSessionLabel({
          sessionKey: normalizedSessionKey,
          title: session.title,
        });
        const overlayLabel = getOverlayLabel(normalizedSessionKey);
        const label = overlayLabel || baseLabel;
        const isRenaming = renamingKey === normalizedSessionKey;
        const time = formatSessionTime(session.last_active);
        const mode = session.mode ?? null;
        const live = session.live === true;
        const lastChannel = session.last_channel ?? null;
        const pendingApprovalCount =
          typeof session.pending_approval_count === "number"
            ? Math.max(0, session.pending_approval_count)
            : 0;

        return (
          <div
            key={normalizedSessionKey}
            className={cn(
              "zaki-thread-item group relative w-full py-2 px-2.5 rounded-lg flex items-center gap-2",
              isRtl && "text-right flex-row-reverse",
              isActive ? "zaki-nav-active" : ""
            )}
          >
            <button
              type="button"
              disabled={isRenaming}
              className={cn(
                "flex flex-1 items-center gap-2 text-left min-w-0",
                isRtl && "text-right flex-row-reverse",
              )}
              onClick={() => onSelectSession(normalizedSessionKey)}
            >
              <div className="relative shrink-0">
                <MessageSquare className="size-3.5 text-zaki-muted" />
              </div>
              <div className="flex-1 min-w-0">
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitRename(normalizedSessionKey, baseLabel);
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        setRenamingKey(null);
                        setRenameDraft("");
                      }
                    }}
                    onBlur={() => commitRename(normalizedSessionKey, baseLabel)}
                    className="w-full rounded-zaki-md border border-zaki-accent bg-zaki-raised px-2 py-1 text-sm text-zaki-primary outline-none"
                    aria-label={t("zakiControls.sessionList.renameInput", {
                      defaultValue: "Session name",
                    })}
                  />
                ) : (
                  <div className="text-sm font-medium text-zaki-secondary truncate">{label}</div>
                )}
                <div className="mt-0.5 flex items-center gap-1.5">
                  {mode ? (
                    <span className="inline-flex items-center rounded-full bg-zaki-raised px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zaki-muted">
                      {mode}
                    </span>
                  ) : null}
                  <span
                    aria-label={live ? "live" : "idle"}
                    className={`size-2 rounded-full ${live ? "bg-green-500" : "bg-zaki-muted/40"}`}
                  />
                  {lastChannel ? (
                    <span className="inline-flex items-center rounded-full bg-zaki-raised px-1.5 py-0.5 text-[10px] text-zaki-muted">
                      {lastChannel}
                    </span>
                  ) : null}
                  {pendingApprovalCount > 0 ? (
                    <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[#f10202] px-1 text-[10px] font-bold text-white">
                      {pendingApprovalCount}
                    </span>
                  ) : null}
                  {time ? (
                    <span className="text-2xs text-zaki-muted">{time}</span>
                  ) : null}
                </div>
              </div>
            </button>
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(pointer:coarse)]:opacity-60">
              {!isRenaming ? (
                <button
                  type="button"
                  className="rounded-full p-1 text-zaki-muted transition-colors hover:bg-zaki-hover hover:text-zaki-primary focus-visible:ring-2 focus-visible:ring-zaki-accent"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenamingKey(normalizedSessionKey);
                    setRenameDraft(label);
                  }}
                  aria-label={t("zakiControls.sessionList.renameSessionAria", {
                    defaultValue: "Rename {{label}}",
                    label,
                  })}
                  title={t("zakiControls.sessionList.renameSession", {
                    defaultValue: "Rename session",
                  })}
                >
                  <Pencil className="size-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  className="rounded-full p-1 text-zaki-brand transition-colors hover:bg-zaki-brand/10 focus-visible:ring-2 focus-visible:ring-zaki-accent"
                  onMouseDown={(e) => {
                    // mousedown so the click runs before the input's onBlur
                    e.preventDefault();
                    commitRename(normalizedSessionKey, baseLabel);
                  }}
                  aria-label={t("zakiControls.sessionList.confirmRenameAria", {
                    defaultValue: "Save name",
                  })}
                >
                  <Check className="size-3.5" />
                </button>
              )}
              {onShareSession ? (
                <button
                  type="button"
                  className="rounded-full p-1 text-zaki-muted transition-colors hover:bg-zaki-hover hover:text-zaki-primary focus-visible:ring-2 focus-visible:ring-zaki-accent"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShareSession(normalizedSessionKey);
                  }}
                  aria-label={t("zakiControls.sessionList.shareSessionAria", {
                    defaultValue: "Share {{label}}",
                    label,
                  })}
                  title={t("zakiControls.sessionList.shareSession", {
                    defaultValue: "Share session",
                  })}
                >
                  <Share2 className="size-3.5" />
                </button>
              ) : null}
              {onDownloadSession ? (
                <button
                  type="button"
                  className="rounded-full p-1 text-zaki-muted transition-colors hover:bg-zaki-hover hover:text-zaki-primary focus-visible:ring-2 focus-visible:ring-zaki-accent"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownloadSession(normalizedSessionKey, label);
                  }}
                  aria-label={t("zakiControls.sessionList.downloadSessionAria", {
                    defaultValue: "Download {{label}}",
                    label,
                  })}
                  title={t("zakiControls.sessionList.downloadSession", {
                    defaultValue: "Download session",
                  })}
                >
                  <Download className="size-3.5" />
                </button>
              ) : null}
              {onDeleteSession && !isRenaming ? (
                <button
                  type="button"
                  className="rounded-full p-1 text-zaki-muted transition-colors hover:bg-zaki-brand/10 hover:text-zaki-brand focus-visible:ring-2 focus-visible:ring-zaki-brand"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(normalizedSessionKey, label);
                  }}
                  aria-label={t("zakiControls.sessionList.deleteSessionAria", {
                    defaultValue: "Delete {{label}}",
                    label,
                  })}
                  title={t("zakiControls.sessionList.deleteSession", {
                    defaultValue: "Delete session",
                  })}
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        );
      })}

      {/* New session button */}
      <button
        className={cn(
          "flex items-center gap-2 p-1.5 rounded-lg transition-colors group hover:bg-zaki-hover mt-1",
          isRtl ? "text-right flex-row-reverse" : "text-left"
        )}
        onClick={onCreateSession}
        type="button"
      >
        <div className="bg-zaki-brand-15 rounded-full size-5 flex items-center justify-center">
          <Plus className="size-3 text-zaki-brand" />
        </div>
        <span className="text-zaki-brand text-sm font-medium">
          {t("zakiControls.sessionList.newSession")}
        </span>
      </button>
    </div>
  );
}
