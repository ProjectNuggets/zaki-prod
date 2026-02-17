import { useNavigate } from 'react-router-dom';
import { useNavigationStore } from '@/stores';

/**
 * Navigation hook that syncs Zustand store with React Router
 * 
 * Use this instead of calling navigationStore actions directly
 * when you need to change routes.
 */
export function useNavigation() {
  const navigate = useNavigate();
  const store = useNavigationStore();
  
  // Wrap navigation actions to sync with React Router
  const goHome = () => {
    store.goHome();
    navigate('/');
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
  
  const clearThread = () => {
    store.clearThread();
    navigate('/');
  };

  return {
    // State from store
    currentView: store.view,
    activeSpaceId: store.spaceId,
    activeThreadId: store.threadId,
    
    // Navigation actions (with routing)
    goHome,
    goToSpaces,
    goToSpace,
    goToThread,
    clearThread,
  };
}
