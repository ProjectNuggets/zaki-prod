import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AgentSession } from "@/lib/api";
import { ZakiSessionList } from "@/app/components/sidebar/ZakiSessionList";

type AgentSessionRailProps = {
  sessions: AgentSession[];
  isLoading: boolean;
  activeSessionKey: string | null;
  isRtl: boolean;
  onSelectSession: (sessionKey: string) => void;
  onCreateSession: () => void;
  onDownloadSession: (sessionKey: string, label: string) => void;
  onShareSession: (sessionKey: string) => void;
  onDeleteSession: (sessionKey: string, label: string) => void;
};

export function AgentSessionRail({
  sessions,
  isLoading,
  activeSessionKey,
  isRtl,
  onSelectSession,
  onCreateSession,
  onDownloadSession,
  onShareSession,
  onDeleteSession,
}: AgentSessionRailProps) {
  const { t } = useTranslation();

  return (
    <aside className="zaki-agent-session-rail" aria-label={t("agent.sessionRail.ariaLabel", { defaultValue: "Agent sessions" })}>
      <div className="zaki-agent-session-rail__head">
        <div className="min-w-0">
          <h2>
            {t("agent.sessionRail.title", { defaultValue: "Threads" })}
            <span>{sessions.length}</span>
          </h2>
        </div>
      </div>

      <div className="zaki-agent-session-rail__list">
        <ZakiSessionList
          sessions={sessions}
          isLoading={isLoading}
          activeSessionKey={activeSessionKey}
          onSelectSession={onSelectSession}
          onCreateSession={onCreateSession}
          onDownloadSession={onDownloadSession}
          onShareSession={onShareSession}
          onDeleteSession={onDeleteSession}
          showRuntimeBadges={false}
          isRtl={isRtl}
        />
      </div>

      <div className="zaki-agent-session-rail__foot">
        <button
          type="button"
          className="zaki-agent-session-rail__new-thread"
          onClick={onCreateSession}
        >
          <Plus aria-hidden="true" />
          <span>{t("agent.sessionRail.newThread", { defaultValue: "New thread" })}</span>
          <kbd>⌘N</kbd>
        </button>
      </div>
    </aside>
  );
}
