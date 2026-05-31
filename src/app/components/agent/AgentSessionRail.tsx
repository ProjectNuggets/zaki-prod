import { useEffect, useId, useMemo, useState } from "react";
import { MessageSquare, Plus, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AgentSession } from "@/lib/api";
import { ZakiSessionList } from "@/app/components/sidebar/ZakiSessionList";
import { formatZakiSessionLabel, normalizeZakiSessionKey } from "@/lib/zakiSessions";
import { useSessionTitleOverlay } from "@/queries/useSessionTitleOverlay";

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

const INITIAL_SESSION_LIMIT = 72;
const SESSION_LIMIT_STEP = 72;

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
  const { getLabel: getOverlayLabel } = useSessionTitleOverlay();
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_SESSION_LIMIT);
  const normalizedActiveSessionKey = activeSessionKey
    ? normalizeZakiSessionKey(activeSessionKey)
    : null;
  const trimmedQuery = query.trim().toLowerCase();
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      if (!trimmedQuery) return true;
      const sessionKey = normalizeZakiSessionKey(session.session_key);
      const label =
        getOverlayLabel(sessionKey) ||
        formatZakiSessionLabel({
          sessionKey,
          title: session.title,
          createdAt: session.created_at ?? session.last_active ?? null,
        });
      const haystack = [
        label,
        sessionKey,
        session.title,
        session.mode,
        session.last_channel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(trimmedQuery);
    });
  }, [getOverlayLabel, sessions, trimmedQuery]);
  const visibleSessions = useMemo(() => {
    const next = filteredSessions.slice(0, visibleLimit);
    if (!normalizedActiveSessionKey) return next;
    const activeSession = filteredSessions.find(
      (session) => normalizeZakiSessionKey(session.session_key) === normalizedActiveSessionKey
    );
    if (
      activeSession &&
      !next.some(
        (session) => normalizeZakiSessionKey(session.session_key) === normalizedActiveSessionKey
      )
    ) {
      return [activeSession, ...next];
    }
    return next;
  }, [filteredSessions, normalizedActiveSessionKey, visibleLimit]);
  const hasOverflow = filteredSessions.length > visibleLimit;
  const hasFilter = trimmedQuery.length > 0;

  useEffect(() => {
    setVisibleLimit(INITIAL_SESSION_LIMIT);
  }, [trimmedQuery, sessions.length]);

  return (
    <aside
      className="zaki-agent-session-rail"
      aria-label={t("agent.sessionRail.ariaLabel", { defaultValue: "Agent sessions" })}
    >
      <div className="zaki-agent-session-rail__head">
        <div className="min-w-0">
          <h2>
            {t("agent.sessionRail.title", { defaultValue: "Threads" })}
            <span>{sessions.length}</span>
          </h2>
        </div>
      </div>

      <div className="zaki-agent-session-rail__tools">
        <div className="zaki-agent-session-rail__search">
          <Search aria-hidden="true" />
          <label htmlFor={searchId} className="sr-only">
            {t("agent.sessionRail.searchLabel", { defaultValue: "Search threads" })}
          </label>
          <input
            id={searchId}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("agent.sessionRail.searchPlaceholder", { defaultValue: "Search" })}
            type="search"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={t("agent.sessionRail.clearSearch", { defaultValue: "Clear search" })}
            >
              <X aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="zaki-agent-session-rail__list">
        {sessions.length > 0 && filteredSessions.length === 0 && !isLoading ? (
          <div className="zaki-agent-session-rail__empty" data-testid="agent-session-empty-filter">
            <MessageSquare aria-hidden="true" />
            <strong>
              {t("agent.sessionRail.noMatches", { defaultValue: "No matching threads" })}
            </strong>
            <span>
              {t("agent.sessionRail.noMatchesHelp", {
                defaultValue: "Clear filters or start a new thread.",
              })}
            </span>
          </div>
        ) : (
          <ZakiSessionList
            sessions={visibleSessions}
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
        )}
      </div>

      <div className="zaki-agent-session-rail__foot">
        {sessions.length > 0 ? (
          <div className="zaki-agent-session-rail__meta">
            <span>
              {t("agent.sessionRail.showing", {
                defaultValue: "{{shown}} of {{total}} visible",
                shown: Math.min(visibleSessions.length, filteredSessions.length),
                total: filteredSessions.length,
              })}
            </span>
            {hasFilter ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                }}
              >
                {t("agent.sessionRail.reset", { defaultValue: "Reset" })}
              </button>
            ) : null}
            {hasOverflow ? (
              <button
                type="button"
                onClick={() => setVisibleLimit((limit) => limit + SESSION_LIMIT_STEP)}
              >
                {t("agent.sessionRail.more", { defaultValue: "More" })}
              </button>
            ) : null}
          </div>
        ) : null}
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
