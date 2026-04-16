import { useNavigate } from 'react-router-dom';
import { useNavigationStore } from '@/stores';
import { ZAKI_BOT_SPACE_ID, ZAKI_BOT_THREAD_ID } from '@/lib/zakiBot';

/**
 * Navigation hook that syncs Zustand store with React Router
 *
 * Use this instead of calling navigationStore actions directly
 * when you need to change routes.
 */
export function useNavigation() {
  const navigate = useNavigate();
  const store = useNavigationStore();

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

  const goToThread = (spaceId: string, threadId: string) => {
    store.goToThread(spaceId, threadId);
    navigate(`/spaces/${spaceId}/threads/${threadId}`);
  };

  const goToZakiBot = () => {
    store.goToThread(ZAKI_BOT_SPACE_ID, ZAKI_BOT_THREAD_ID);
    navigate(`/spaces/${ZAKI_BOT_SPACE_ID}/threads/${ZAKI_BOT_THREAD_ID}`);
  };

  const goToZakiSession = (sessionKey: string) => {
    store.goToZakiSession(sessionKey);
    navigate(`/spaces/${ZAKI_BOT_SPACE_ID}/threads/${encodeURIComponent(sessionKey)}`);
  };

  const clearThread = () => {
    store.clearThread();
    navigate('/');
  };

  return {
    // State from store
    currentView: store.view,
    activeSpaceId: store.spaceId,
    activeThreadId: store.threadId,
    sidebarMode: store.sidebarMode,

    // Navigation actions (with routing)
    goHome,
    goToAbout,
    goToSpaces,
    goToSpace,
    goToThread,
    goToZakiBot,
    goToZakiSession,
    clearThread,
    setSidebarMode: store.setSidebarMode,
  };
}
