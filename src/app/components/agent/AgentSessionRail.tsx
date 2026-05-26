import { Activity, Brain, PanelRight, Plus, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AgentSession } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ZakiSessionList } from "@/app/components/sidebar/ZakiSessionList";

type AgentSessionRailProps = {
  sessions: AgentSession[];
  isLoading: boolean;
  activeSessionKey: string | null;
  activeMode: string | null;
  isStreaming: boolean;
  live: boolean | null;
  pendingApprovals: number;
  contextLabel: string;
  quotaLabel: string;
  isRtl: boolean;
  onSelectSession: (sessionKey: string) => void;
  onCreateSession: () => void;
  onDownloadSession: (sessionKey: string, label: string) => void;
  onShareSession: (sessionKey: string) => void;
  onDeleteSession: (sessionKey: string, label: string) => void;
  onOpenMemory: () => void;
  onOpenControls: () => void;
};

export function AgentSessionRail({
  sessions,
  isLoading,
  activeSessionKey,
  activeMode,
  isStreaming,
  live,
  pendingApprovals,
  contextLabel,
  quotaLabel,
  isRtl,
  onSelectSession,
  onCreateSession,
  onDownloadSession,
  onShareSession,
  onDeleteSession,
  onOpenMemory,
  onOpenControls,
}: AgentSessionRailProps) {
  const { t } = useTranslation();
  const liveActive = isStreaming || live === true;

  return (
    <aside className="zaki-agent-session-rail" aria-label={t("agent.sessionRail.ariaLabel", { defaultValue: "Agent sessions" })}>
      <div className="zaki-agent-session-rail__head">
        <div className="min-w-0">
          <div className="zaki-agent-session-rail__kicker">
            {t("agent.sessionRail.kicker", { defaultValue: "Agent" })}
          </div>
          <h2>{t("agent.sessionRail.title", { defaultValue: "Sessions" })}</h2>
        </div>
        <button
          type="button"
          className="zaki-agent-session-rail__icon"
          onClick={onCreateSession}
          aria-label={t("agent.sessionRail.newSession", { defaultValue: "New session" })}
        >
          <Plus aria-hidden="true" />
        </button>
      </div>

      <div className="zaki-agent-session-rail__summary" aria-label={t("agent.sessionRail.currentState", { defaultValue: "Current agent state" })}>
        <div className="zaki-agent-session-rail__summary-cell">
          <span>{t("agent.sessionRail.status", { defaultValue: "Status" })}</span>
          <strong className={cn(liveActive && "is-live")}>
            <i aria-hidden="true" />
            {liveActive
              ? t("agent.sessionRail.live", { defaultValue: "Live" })
              : t("agent.sessionRail.ready", { defaultValue: "Ready" })}
          </strong>
        </div>
        <div className="zaki-agent-session-rail__summary-cell">
          <span>{t("agent.sessionRail.mode", { defaultValue: "Mode" })}</span>
          <strong>{activeMode ?? "execute"}</strong>
        </div>
      </div>

      <div className="zaki-agent-session-rail__actions">
        <button type="button" onClick={onOpenControls}>
          <ShieldCheck aria-hidden="true" />
          <span>{t("agent.sessionRail.controls", { defaultValue: "Controls" })}</span>
          {pendingApprovals > 0 ? <b>{pendingApprovals}</b> : null}
        </button>
        <button type="button" onClick={onOpenMemory}>
          <Brain aria-hidden="true" />
          <span>{t("agent.sessionRail.memory", { defaultValue: "Memory" })}</span>
        </button>
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
          isRtl={isRtl}
        />
      </div>

      <div className="zaki-agent-session-rail__foot">
        <div>
          <Activity aria-hidden="true" />
          <span>{contextLabel}</span>
        </div>
        <div>
          <PanelRight aria-hidden="true" />
          <span>{quotaLabel}</span>
        </div>
      </div>
    </aside>
  );
}
