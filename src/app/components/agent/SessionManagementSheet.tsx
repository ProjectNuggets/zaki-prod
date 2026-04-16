import { useCallback, useState } from "react";
import {
  Clock3,
  Download,
  Loader2,
  MessageSquare,
  Shrink,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteAgentSession,
  compactAgentSession,
  exportAgentSession,
} from "@/lib/api";
import { useZakiSessions } from "@/queries/useZakiSessions";
import { cn } from "@/lib/utils";
import { EmptyState, InlineConfirm, SheetShell } from "@/app/components/ui/zaki";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  activeSessionKey?: string | null;
  onSwitchSession?: (sessionKey: string) => void;
};

function formatRelativeTime(value?: string | number | null) {
  if (value == null) return "—";
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

function shortSessionLabel(key: string) {
  // agent:zaki-bot:user:42:thread:abc → "abc"
  // agent:zaki-bot:user:42:main → "main"
  const parts = key.split(":");
  const last = parts[parts.length - 1];
  if (last === "main") return "Main session";
  return last || key;
}

export function SessionManagementSheet({
  isOpen,
  onClose,
  activeSessionKey,
  onSwitchSession,
}: Props) {
  const { data: sessions = [], isLoading: loading, refetch: loadSessions } = useZakiSessions(isOpen);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [confirmingDeleteKey, setConfirmingDeleteKey] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (sessionKey: string) => {
      if (sessionKey === activeSessionKey) {
        toast.error("Cannot delete the active session");
        return;
      }
      setActionInProgress(`delete:${sessionKey}`);
      try {
        await deleteAgentSession(sessionKey);
        loadSessions();
        toast.success("Session deleted");
      } catch {
        toast.error("Failed to delete session");
      } finally {
        setActionInProgress(null);
      }
    },
    [activeSessionKey]
  );

  const handleCompact = useCallback(async (sessionKey: string) => {
    setActionInProgress(`compact:${sessionKey}`);
    try {
      const { data } = await compactAgentSession(sessionKey);
      toast.success(
        data?.tokens_before && data?.tokens_after
          ? `Compacted: ${new Intl.NumberFormat("en-US").format(data.tokens_before)} → ${new Intl.NumberFormat("en-US").format(data.tokens_after)} tokens`
          : "Session compacted"
      );
      loadSessions();
    } catch {
      toast.error("Failed to compact session");
    } finally {
      setActionInProgress(null);
    }
  }, [loadSessions]);

  const handleExport = useCallback(async (sessionKey: string) => {
    setActionInProgress(`export:${sessionKey}`);
    try {
      const { data } = await exportAgentSession(sessionKey);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `session-${shortSessionLabel(sessionKey)}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Session exported");
    } catch {
      toast.error("Failed to export session");
    } finally {
      setActionInProgress(null);
    }
  }, []);

  const isActioning = (action: string, key: string) =>
    actionInProgress === `${action}:${key}`;

  return (
    <SheetShell
      isOpen={isOpen}
      onClose={onClose}
      title="Sessions"
      icon={<MessageSquare className="size-4" />}
      description="Manage your agent sessions"
      padded={false}
    >
      <div className="px-4 py-3">
        {loading && sessions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-zaki-brand" />
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="size-5" />}
            title="No sessions found"
            helper="Start a conversation to create one."
          />
        ) : (
            <div className="flex flex-col gap-2">
              {sessions.map((session) => {
                const isActive = session.session_key === activeSessionKey;
                return (
                  <div
                    key={session.session_key}
                    className={cn(
                      "group relative rounded-zaki-xl border p-3 text-xs transition-colors",
                      isActive
                        ? "border-zaki-accent/40 bg-zaki-accent/10"
                        : "border-zaki-strong bg-zaki-elevated hover:border-zaki-accent/40 dark:bg-[#1a1714]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={cn(
                          "min-w-0 text-left",
                          onSwitchSession && !isActive && "cursor-pointer hover:opacity-80"
                        )}
                        role={onSwitchSession && !isActive ? "button" : undefined}
                        tabIndex={onSwitchSession && !isActive ? 0 : undefined}
                        onClick={
                          onSwitchSession && !isActive
                            ? () => onSwitchSession(session.session_key)
                            : undefined
                        }
                        onKeyDown={
                          onSwitchSession && !isActive
                            ? (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  onSwitchSession(session.session_key);
                                }
                              }
                            : undefined
                        }
                      >
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="size-3.5 shrink-0 text-zaki-accent" />
                          <span className="font-medium truncate text-zaki-primary">
                            {shortSessionLabel(session.session_key)}
                          </span>
                          {isActive && (
                            <span className="ml-1 rounded-full bg-zaki-accent px-2 py-0.5 text-[10px] font-medium text-white">
                              active
                            </span>
                          )}
                        </div>
                      </div>

                      {confirmingDeleteKey === session.session_key ? (
                        <InlineConfirm
                          label="Delete session?"
                          disabled={isActioning("delete", session.session_key)}
                          onConfirm={() => {
                            handleDelete(session.session_key);
                            setConfirmingDeleteKey(null);
                          }}
                          onCancel={() => setConfirmingDeleteKey(null)}
                        />
                      ) : (
                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            title="Compact session"
                            disabled={!!actionInProgress}
                            onClick={() => handleCompact(session.session_key)}
                            className="rounded-full p-1.5 text-zaki-secondary transition-colors hover:bg-zaki-hover hover:text-zaki-primary"
                            aria-label="Compact session"
                          >
                            {isActioning("compact", session.session_key) ? (
                              <Loader2 className="size-3.5 animate-spin text-zaki-brand" />
                            ) : (
                              <Shrink className="size-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            title="Export session"
                            disabled={!!actionInProgress}
                            onClick={() => handleExport(session.session_key)}
                            className="rounded-full p-1.5 text-zaki-secondary transition-colors hover:bg-zaki-hover hover:text-zaki-primary"
                            aria-label="Export session"
                          >
                            {isActioning("export", session.session_key) ? (
                              <Loader2 className="size-3.5 animate-spin text-zaki-brand" />
                            ) : (
                              <Download className="size-3.5" />
                            )}
                          </button>
                          {!isActive && (
                            <button
                              type="button"
                              title="Delete session"
                              disabled={!!actionInProgress}
                              onClick={() => setConfirmingDeleteKey(session.session_key)}
                              className="rounded-full p-1.5 text-zaki-brand transition-colors hover:bg-zaki-brand/10"
                              aria-label="Delete session"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-zaki-secondary">
                      {typeof session.message_count === "number" && (
                        <span className="rounded-full bg-zaki-hover px-2 py-0.5 font-medium">
                          {session.message_count} msgs
                        </span>
                      )}
                      {typeof session.token_count === "number" && (
                        <span className="rounded-full bg-zaki-hover px-2 py-0.5 font-mono-ui font-medium">
                          {new Intl.NumberFormat("en-US").format(session.token_count)} tokens
                        </span>
                      )}
                      {session.last_active && (
                        <span className="flex items-center gap-0.5">
                          <Clock3 className="size-3" />
                          {formatRelativeTime(session.last_active)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </SheetShell>
  );
}
