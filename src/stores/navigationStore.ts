import { create } from "zustand";

type ViewType = "home" | "spaces" | "library" | "space-detail" | "chat";

interface NavigationState {
  view: ViewType;
  spaceId: string | null;
  threadId: string | null;
}

interface NavigationStore extends NavigationState {
  // Actions
  goHome: () => void;
  goToSpaces: () => void;
  goToLibrary: () => void;
  goToSpace: (spaceId: string) => void;
  goToThread: (spaceId: string, threadId: string) => void;
  clearThread: () => void;
  
  // Computed (using selectors in components)
  showZakiHome: () => boolean;
  showSpacesView: () => boolean;
  showLibraryView: () => boolean;
  showSpaceDetail: () => boolean;
  showChatView: () => boolean;
}

export const useNavigationStore = create<NavigationStore>((set, get) => ({
  view: "home",
  spaceId: null,
  threadId: null,
  
  goHome: () => {
    set({ view: "home", spaceId: null, threadId: null });
  },
  
  goToSpaces: () => {
    set({ view: "spaces", spaceId: null, threadId: null });
  },
  
  goToLibrary: () => {
    set({ view: "library", spaceId: null, threadId: null });
  },
  
  goToSpace: (spaceId) => {
    set({ view: "space-detail", spaceId, threadId: null });
  },
  
  goToThread: (spaceId, threadId) => {
    set({ view: "chat", spaceId, threadId });
  },
  
  clearThread: () => {
    set({ view: "home", spaceId: null, threadId: null });
  },
  
  // Computed
  showZakiHome: () => get().view === "home",
  showSpacesView: () => get().view === "spaces",
  showLibraryView: () => get().view === "library",
  showSpaceDetail: () => get().view === "space-detail",
  showChatView: () => get().view === "chat",
}));
