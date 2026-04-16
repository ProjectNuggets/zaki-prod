import { useEffect, useRef, useState } from "react";
import { Plus, MessageSquare, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  shortSessionLabel,
  formatSessionTime,
  getSessionTitleOverride,
  setSessionTitleOverride,
} from "@/lib/zakiBot";
import { extractThreadSlug } from "@/queries/useZakiSessions";
import { InlineConfirm } from "@/app/components/ui/zaki";
import type { AgentSession } from "@/lib/api";

interface ZakiSessionListProps {
  sessions: AgentSession[];
  isLoading: boolean;
  activeSessionKey: string | null;
  onSelectSession: (sessionKey: string) => void;
  onCreateSession: () => void;
  onDeleteSession?: (sessionKey: string) => void | Promise<void>;
  isRtl: boolean;
}

export function ZakiSessionList({
  sessions,
  isLoading,
  activeSessionKey,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  isRtl,
}: ZakiSessionListProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [titleOverrides, setTitleOverrides] = useState<Record<string, string>>({});
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Load title overrides from localStorage and subscribe to changes
  useEffect(() => {
    const refresh = () => {
      if (typeof window === "undefined") return;
      try {
        const raw = window.localStorage.getItem("zaki:session-titles:v1");
        setTitleOverrides(raw ? (JSON.parse(raw) ?? {}) : {});
      } catch {
        setTitleOverrides({});
      }
    };
    refresh();
    if (typeof window === "undefined") return;
    window.addEventListener("zaki:session-titles-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("zaki:session-titles-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!openMenu) return;
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [openMenu]);

  const startRename = (sessionKey: string, currentLabel: string) => {
    setOpenMenu(null);
    setRenamingKey(sessionKey);
    setRenameDraft(currentLabel);
  };

  const commitRename = () => {
    if (!renamingKey) return;
    setSessionTitleOverride(renamingKey, renameDraft);
    setRenamingKey(null);
    setRenameDraft("");
  };

  const cancelRename = () => {
    setRenamingKey(null);
    setRenameDraft("");
  };

  const confirmDelete = async (sessionKey: string) => {
    if (!onDeleteSession) {
      setConfirmingDelete(null);
      return;
    }
    try {
      await onDeleteSession(sessionKey);
    } finally {
      setConfirmingDelete(null);
    }
  };

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
        <p className="text-sm text-zaki-primary font-medium mb-1">No sessions yet</p>
        <p className="text-xs text-zaki-secondary mb-4">Start a conversation with ZAKI</p>
        <button
          onClick={onCreateSession}
          className="flex items-center gap-2 px-3 py-2 bg-zaki-brand text-white text-sm font-medium rounded-zaki-xl hover:bg-zaki-brand-hover transition-colors"
          type="button"
        >
          <Plus className="size-4" />
          New session
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {sessions.map((session) => {
        const sessionSlug = extractThreadSlug(session.session_key);
        const isActive = activeSessionKey != null && (
          sessionSlug === activeSessionKey ||
          session.session_key === activeSessionKey
        );
        const override = titleOverrides[session.session_key];
        const defaultLabel = session.title || shortSessionLabel(session.session_key);
        const label = override && override.trim() ? override : defaultLabel;
        const time = formatSessionTime(session.last_active);
        const isRenaming = renamingKey === session.session_key;
        const isConfirming = confirmingDelete === session.session_key;
        const menuOpen = openMenu === session.session_key;

        // Delete confirmation row
        if (isConfirming) {
          return (
            <div
              key={session.session_key}
              className={cn("py-1 px-1", isRtl && "flex justify-end")}
            >
              <InlineConfirm
                label="Delete session?"
                onConfirm={() => confirmDelete(session.session_key)}
                onCancel={() => setConfirmingDelete(null)}
              />
            </div>
          );
        }

        return (
          <div key={session.session_key} className="relative group">
            <button
              type="button"
              className={cn(
                "zaki-thread-item w-full text-left py-2 px-2.5 rounded-lg flex items-center gap-2",
                isRtl && "text-right flex-row-reverse",
                isActive ? "zaki-nav-active" : ""
              )}
              onClick={() => {
                if (isRenaming) return;
                onSelectSession(session.session_key);
              }}
            >
              <div className="relative shrink-0">
                <MessageSquare className="size-3.5 text-zaki-muted" />
                {session.live && (
                  <div className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-zaki-success" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={(event) => setRenameDraft(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    onBlur={commitRename}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitRename();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        cancelRename();
                      }
                    }}
                    className="w-full bg-zaki-hover rounded-md px-1.5 py-0.5 text-sm font-medium text-zaki-primary outline-none focus:ring-2 focus:ring-zaki-accent/20"
                  />
                ) : (
                  <div className="text-sm font-medium text-zaki-secondary truncate">{label}</div>
                )}
                {time && !isRenaming && (
                  <div className="text-2xs text-zaki-muted">{time}</div>
                )}
              </div>
              {session.message_count != null && session.message_count > 0 && !isRenaming && (
                <span className="text-2xs text-zaki-muted shrink-0 mr-1">
                  {session.message_count}
                </span>
              )}
            </button>

            {/* Menu trigger */}
            {!isRenaming && (
              <button
                type="button"
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 size-6 rounded-md p-0 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-zaki-hover transition-opacity",
                  isRtl ? "left-1" : "right-1"
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenMenu(menuOpen ? null : session.session_key);
                }}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={`${label} options`}
              >
                <MoreHorizontal className="size-3.5 text-zaki-muted" />
              </button>
            )}

            {/* Dropdown menu */}
            {menuOpen && (
              <div
                ref={menuRef}
                className={cn(
                  "absolute top-8 z-20 w-36 rounded-zaki-md border border-zaki-strong bg-zaki-raised shadow-zaki-lg p-1 dark:bg-[#1a1714] dark:border-[rgba(240,236,230,0.12)]",
                  isRtl ? "left-0" : "right-0"
                )}
                role="menu"
              >
                <button
                  type="button"
                  className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-xs text-zaki-primary hover:bg-zaki-hover"
                  onClick={() => startRename(session.session_key, label)}
                >
                  <Pencil className="size-3.5 text-zaki-muted" />
                  Rename
                </button>
                {onDeleteSession && (
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-xs text-zaki-brand hover:bg-zaki-brand/10"
                    onClick={() => {
                      setOpenMenu(null);
                      setConfirmingDelete(session.session_key);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </button>
                )}
              </div>
            )}
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
        <span className="text-zaki-brand text-sm font-medium">New session</span>
      </button>
    </div>
  );
}
