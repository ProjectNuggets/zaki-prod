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
  
  return {
    goHome: () => {
      store.goHome();
      navigate('/');
    },
    
    goToSpaces: () => {
      store.goToSpaces();
      navigate('/spaces');
    },
    
    goToLibrary: () => {
      store.goToLibrary();
      navigate('/library');
    },
    
    goToSpace: (spaceId: string) => {
      store.goToSpace(spaceId);
      navigate(`/spaces/${spaceId}`);
    },
    
    goToThread: (spaceId: string, threadId: string) => {
      store.goToThread(spaceId, threadId);
      navigate(`/spaces/${spaceId}/threads/${threadId}`);
    },
    
    clearThread: () => {
      store.clearThread();
      navigate('/');
    },
    
    // Computed helpers
    ...store,
  };
}
