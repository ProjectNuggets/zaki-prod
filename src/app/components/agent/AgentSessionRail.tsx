import { useEffect, useId, useMemo, useState } from "react";
import { MessageSquare, Plus, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AgentSession } from "@/lib/api";
import { ZakiSessionList } from "@/app/components/sidebar/ZakiSessionList";
import {
  formatZakiSessionLabel,
  isInternalProbeZakiSession,
  normalizeZakiSessionKey,
  parseZakiSessionKey,
  parseZakiSessionTimestampMs,
} from "@/lib/zakiSessions";
import { useSessionTitleOverlay } from "@/queries/useSessionTitleOverlay";

type AgentSessionRailProps = {
  sessions: AgentSession[];
  isLoading: boolean;
  activeSessionKey: string | null;
  isRtl: boolean;
  onSelectSession: (sessionKey: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionKey: string, label: string) => void;
  onRenameSession?: (sessionKey: string, label: string) => void | Promise<void>;
};

const INITIAL_SESSION_LIMIT = 72;
const SESSION_LIMIT_STEP = 72;

function getSessionRecencyMs(session: AgentSession) {
  const value = session.last_active ?? session.created_at ?? null;
  return parseZakiSessionTimestampMs(value);
}

function pluralizeThread(count: number) {
  return count === 1 ? "thread" : "threads";
}

export function AgentSessionRail({
  sessions,
  isLoading,
  activeSessionKey,
  isRtl,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onRenameSession,
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
  const realThreadSessions = useMemo(() => {
    const byNormalizedKey = new Map<string, AgentSession>();
    for (const session of sessions) {
      const normalizedKey = normalizeZakiSessionKey(session.session_key);
      const parsed = parseZakiSessionKey(normalizedKey);
      if (parsed.lane !== "thread" || !parsed.threadId) continue;
      if (
        normalizedKey !== normalizedActiveSessionKey &&
        isInternalProbeZakiSession({ sessionKey: normalizedKey, title: session.title })
      ) {
        continue;
      }
      const existing = byNormalizedKey.get(normalizedKey);
      if (!existing || getSessionRecencyMs(session) > getSessionRecencyMs(existing)) {
        byNormalizedKey.set(normalizedKey, { ...session, session_key: normalizedKey });
      }
    }
    return [...byNormalizedKey.values()].sort((a, b) => {
        const byRecency = getSessionRecencyMs(b) - getSessionRecencyMs(a);
        if (byRecency !== 0) return byRecency;
        return normalizeZakiSessionKey(a.session_key).localeCompare(
          normalizeZakiSessionKey(b.session_key)
        );
      });
  }, [normalizedActiveSessionKey, sessions]);
  const filteredSessions = useMemo(() => {
    return realThreadSessions.filter((session) => {
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
  }, [getOverlayLabel, realThreadSessions, trimmedQuery]);
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
  const visibleCount = visibleSessions.length;
  const sessionSummary = hasFilter
    ? t("agent.sessionRail.filteredSummary", {
        defaultValue: "{{shown}} of {{total}} matching",
        shown: visibleCount,
        total: filteredSessions.length,
      })
    : hasOverflow
      ? t("agent.sessionRail.loadedSummary", {
          defaultValue: "{{shown}} of {{total}} threads",
          shown: visibleCount,
          total: realThreadSessions.length,
        })
      : t("agent.sessionRail.totalSummary", {
          defaultValue: "{{total}} {{threadLabel}}",
          total: realThreadSessions.length,
          threadLabel: pluralizeThread(realThreadSessions.length),
        });

  useEffect(() => {
    setVisibleLimit(INITIAL_SESSION_LIMIT);
  }, [trimmedQuery, realThreadSessions.length]);

  return (
    <aside
      className="zaki-agent-session-rail"
      aria-label={t("agent.sessionRail.ariaLabel", { defaultValue: "Agent sessions" })}
    >
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
        {realThreadSessions.length > 0 ? (
          <div className="zaki-agent-session-rail__summary" aria-live="polite">
            <span>{sessionSummary}</span>
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
          </div>
        ) : null}
      </div>

      <div className="zaki-agent-session-rail__list">
        {realThreadSessions.length > 0 && filteredSessions.length === 0 && !isLoading ? (
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
            onDeleteSession={onDeleteSession}
            onRenameSession={onRenameSession}
            showRuntimeBadges={false}
            showCreateButton={false}
            isRtl={isRtl}
          />
        )}
      </div>

      <div className="zaki-agent-session-rail__foot">
        {realThreadSessions.length > 0 && hasOverflow ? (
          <div className="zaki-agent-session-rail__meta">
            <span>{sessionSummary}</span>
            <button
              type="button"
              onClick={() => setVisibleLimit((limit) => limit + SESSION_LIMIT_STEP)}
            >
              {t("agent.sessionRail.more", { defaultValue: "More" })}
            </button>
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
