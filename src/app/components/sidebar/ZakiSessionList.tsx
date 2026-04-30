import { Plus, MessageSquare, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { formatSessionTime } from "@/lib/zakiBot";
import { formatZakiSessionLabel, normalizeZakiSessionKey } from "@/lib/zakiSessions";
import type { AgentSession } from "@/lib/api";

interface ZakiSessionListProps {
  sessions: AgentSession[];
  isLoading: boolean;
  activeSessionKey: string | null;
  onSelectSession: (sessionKey: string) => void;
  onCreateSession: () => void;
  isRtl: boolean;
}

export function ZakiSessionList({
  sessions,
  isLoading,
  activeSessionKey,
  onSelectSession,
  onCreateSession,
  isRtl,
}: ZakiSessionListProps) {
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
        const label = formatZakiSessionLabel({
          sessionKey: normalizedSessionKey,
          title: session.title,
        });
        const time = formatSessionTime(session.last_active);
        const hasPendingApproval =
          typeof session.pending_approval_count === "number" && session.pending_approval_count > 0;

        return (
          <button
            key={normalizedSessionKey}
            type="button"
            className={cn(
              "zaki-thread-item w-full text-left py-2 px-2.5 rounded-lg flex items-center gap-2",
              isRtl && "text-right flex-row-reverse",
              isActive ? "zaki-nav-active" : ""
            )}
            onClick={() => onSelectSession(normalizedSessionKey)}
          >
            <div className="relative shrink-0">
              <MessageSquare className="size-3.5 text-zaki-muted" />
              {hasPendingApproval ? (
                <div className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-amber-500" />
              ) : null}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-zaki-secondary truncate">{label}</div>
              {time && (
                <div className="mt-0.5 text-2xs text-zaki-muted">
                  <span className="text-zaki-muted">{time}</span>
                </div>
              )}
            </div>
          </button>
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
