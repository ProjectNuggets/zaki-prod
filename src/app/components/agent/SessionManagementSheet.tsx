import { useCallback, useEffect, useState } from "react";
import {
  Clock3,
  Download,
  Loader2,
  MessageSquare,
  Shrink,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  listAgentSessions,
  deleteAgentSession,
  compactAgentSession,
  exportAgentSession,
  type AgentSession,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/app/components/ui/sheet";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  activeSessionKey?: string | null;
  onSwitchSession?: (sessionKey: string) => void;
};

function formatRelativeTime(dateStr?: string | null) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
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
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await listAgentSessions();
      setSessions(data?.sessions ?? []);
    } catch {
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadSessions();
  }, [isOpen, loadSessions]);

  const handleDelete = useCallback(
    async (sessionKey: string) => {
      if (sessionKey === activeSessionKey) {
        toast.error("Cannot delete the active session");
        return;
      }
      setActionInProgress(`delete:${sessionKey}`);
      try {
        await deleteAgentSession(sessionKey);
        setSessions((prev) => prev.filter((s) => s.session_key !== sessionKey));
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
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-[380px] border-l border-zinc-200 bg-white p-0 dark:border-zinc-700 dark:bg-zinc-900 sm:w-[420px]"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <SheetTitle className="text-sm font-semibold">Sessions</SheetTitle>
          <SheetDescription className="sr-only">
            Manage your agent sessions
          </SheetDescription>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3" style={{ maxHeight: "calc(100vh - 60px)" }}>
          {loading && sessions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-zinc-400" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-500">No sessions found</p>
          ) : (
            <div className="flex flex-col gap-2">
              {sessions.map((session) => {
                const isActive = session.session_key === activeSessionKey;
                return (
                  <div
                    key={session.session_key}
                    className={cn(
                      "group relative rounded-lg border p-3 text-xs transition-colors",
                      isActive
                        ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-600/40 dark:bg-emerald-950/20"
                        : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-zinc-600"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        className="min-w-0 text-left"
                        onClick={() => onSwitchSession?.(session.session_key)}
                      >
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="size-3.5 shrink-0 text-zinc-500" />
                          <span className="font-medium truncate">
                            {shortSessionLabel(session.session_key)}
                          </span>
                          {isActive && (
                            <span className="ml-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                              active
                            </span>
                          )}
                        </div>
                      </button>

                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          title="Compact session"
                          disabled={!!actionInProgress}
                          onClick={() => handleCompact(session.session_key)}
                          className="rounded p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        >
                          {isActioning("compact", session.session_key) ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Shrink className="size-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          title="Export session"
                          disabled={!!actionInProgress}
                          onClick={() => handleExport(session.session_key)}
                          className="rounded p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        >
                          {isActioning("export", session.session_key) ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Download className="size-3.5" />
                          )}
                        </button>
                        {!isActive && (
                          <button
                            type="button"
                            title="Delete session"
                            disabled={!!actionInProgress}
                            onClick={() => handleDelete(session.session_key)}
                            className="rounded p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-950/40"
                          >
                            {isActioning("delete", session.session_key) ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                      {typeof session.message_count === "number" && (
                        <span>{session.message_count} msgs</span>
                      )}
                      {typeof session.token_count === "number" && (
                        <span>
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
      </SheetContent>
    </Sheet>
  );
}
