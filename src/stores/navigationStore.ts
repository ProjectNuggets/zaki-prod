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
  initFromHash: () => void;
  
  // Computed (using selectors in components)
  showZakiHome: () => boolean;
  showSpacesView: () => boolean;
  showLibraryView: () => boolean;
  showSpaceDetail: () => boolean;
  showChatView: () => boolean;
}

// Helper to update URL hash
const updateHash = (hash: string) => {
  if (typeof window !== "undefined") {
    window.location.hash = hash;
  }
};

// Helper to parse hash
const parseHash = (): Partial<NavigationState> => {
  if (typeof window === "undefined") return { view: "home", spaceId: null, threadId: null };
  const hash = window.location.hash.slice(1); // Remove #
  
  if (hash.startsWith("/space/")) {
    const parts = hash.split("/");
    const spaceId = parts[2] || null;
    const threadId = parts[4] || null; // /space/{id}/thread/{id}
    if (threadId) {
      return { view: "chat", spaceId, threadId };
    }
    return { view: "space-detail", spaceId, threadId: null };
  }
  
  switch (hash) {
    case "/spaces": return { view: "spaces", spaceId: null, threadId: null };
    case "/library": return { view: "library", spaceId: null, threadId: null };
    case "/home":
    default: return { view: "home", spaceId: null, threadId: null };
  }
};

// Build hash from state
const buildHash = (state: NavigationState): string => {
  switch (state.view) {
    case "spaces": return "#/spaces";
    case "library": return "#/library";
    case "space-detail": return state.spaceId ? `#/space/${state.spaceId}` : "#/home";
    case "chat": return state.spaceId && state.threadId 
      ? `#/space/${state.spaceId}/thread/${state.threadId}` 
      : "#/home";
    case "home":
    default: return "#/home";
  }
};

export const useNavigationStore = create<NavigationStore>((set, get) => ({
  view: "home",
  spaceId: null,
  threadId: null,
  
  goHome: () => {
    const newState = { view: "home" as const, spaceId: null, threadId: null };
    set(newState);
    updateHash(buildHash(newState));
  },
  goToSpaces: () => {
    const newState = { view: "spaces" as const, spaceId: null, threadId: null };
    set(newState);
    updateHash(buildHash(newState));
  },
  goToLibrary: () => {
    const newState = { view: "library" as const, spaceId: null, threadId: null };
    set(newState);
    updateHash(buildHash(newState));
  },
  goToSpace: (spaceId) => {
    const newState = { view: "space-detail" as const, spaceId, threadId: null };
    set(newState);
    updateHash(buildHash(newState));
  },
  goToThread: (spaceId, threadId) => {
    const newState = { view: "chat" as const, spaceId, threadId };
    set(newState);
    updateHash(buildHash(newState));
  },
  clearThread: () => {
    const newState = { view: "home" as const, spaceId: null, threadId: null };
    set(newState);
    updateHash(buildHash(newState));
  },
  initFromHash: () => {
    set(parseHash());
  },
  
  // Computed
  showZakiHome: () => get().view === "home",
  showSpacesView: () => get().view === "spaces",
  showLibraryView: () => get().view === "library",
  showSpaceDetail: () => get().view === "space-detail",
  showChatView: () => get().view === "chat",
}));
