import { useNavigate } from 'react-router-dom';
import { useAuthStore, useNavigationStore } from '@/stores';
import { ZAKI_BOT_SPACE_ID, ZAKI_BOT_THREAD_ID } from '@/lib/zakiBot';

function buildLoginRoute(returnTo: string) {
  return `/?auth=login&next=${encodeURIComponent(returnTo)}`;
}

/**
 * Navigation hook that syncs Zustand store with React Router
 *
 * Use this instead of calling navigationStore actions directly
 * when you need to change routes.
 */
export function useNavigation() {
  const navigate = useNavigate();
  const store = useNavigationStore();
  const token = useAuthStore((state) => state.token);

  const goHome = () => {
    store.goHome();
    navigate('/');
  };

  const goToAbout = () => {
    store.goToAbout();
    navigate('/about');
  };

  const goToSpaces = () => {
    store.goToSpaces();
    navigate('/spaces');
  };

  const goToSpace = (spaceId: string) => {
    store.goToSpace(spaceId);
    navigate(`/spaces/${spaceId}`);
  };

  const goToThread = (
    spaceId: string,
    threadId: string,
    options?: { zakiSessionKey?: string | null }
  ) => {
    store.goToThread(spaceId, threadId, options);
    if (spaceId === ZAKI_BOT_SPACE_ID) {
      const agentPath =
        threadId && threadId !== ZAKI_BOT_THREAD_ID
          ? `/agent?thread=${encodeURIComponent(threadId)}`
          : "/agent";
      navigate(token ? agentPath : buildLoginRoute(agentPath));
      return;
    }
    navigate(`/spaces/${spaceId}/threads/${threadId}`);
  };

  const goToZakiBot = () => {
    store.goToThread(ZAKI_BOT_SPACE_ID, ZAKI_BOT_THREAD_ID);
    navigate(token ? "/agent" : buildLoginRoute("/agent"));
  };

  const goToZakiSession = (sessionKey: string, threadId?: string | null) => {
    store.goToZakiSession(sessionKey, threadId ?? null);
    if (threadId) {
      const agentPath = `/agent?thread=${encodeURIComponent(threadId)}`;
      navigate(token ? agentPath : buildLoginRoute(agentPath));
      return;
    }
    navigate(token ? "/agent" : buildLoginRoute("/agent"));
  };

  const clearThread = () => {
    store.clearThread();
    navigate('/');
  };

  const goToZakiHome = () => {
    store.goToZakiHome();
    navigate(`/spaces/${ZAKI_BOT_SPACE_ID}`);
  };

  return {
    // State from store
    currentView: store.view,
    activeSpaceId: store.spaceId,
    activeThreadId: store.threadId,
    activeZakiSessionKey: store.zakiSessionKey,
    sidebarMode: store.sidebarMode,

    // Navigation actions (with routing)
    goHome,
    goToAbout,
    goToSpaces,
    goToSpace,
    goToThread,
    goToZakiBot,
    goToZakiSession,
    goToZakiHome,
    clearThread,
    setSidebarMode: store.setSidebarMode,
  };
}
