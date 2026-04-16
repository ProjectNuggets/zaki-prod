import { create } from "zustand";
import { ZAKI_BOT_SPACE_ID } from "@/lib/zakiBot";

type ViewType = "home" | "about" | "spaces" | "space-detail" | "chat";
export type SidebarMode = "zaki" | "spaces";

interface NavigationState {
  view: ViewType;
  spaceId: string | null;
  threadId: string | null;
  sidebarMode: SidebarMode;
}

interface NavigationStore extends NavigationState {
  // Actions
  goHome: () => void;
  goToAbout: () => void;
  goToSpaces: () => void;
  goToSpace: (spaceId: string) => void;
  goToThread: (spaceId: string, threadId: string) => void;
  goToZakiSession: (sessionKey: string) => void;
  clearThread: () => void;
  setSidebarMode: (mode: SidebarMode) => void;

  // Computed (using selectors in components)
  showZakiHome: () => boolean;
  showSpacesView: () => boolean;
  showSpaceDetail: () => boolean;
  showChatView: () => boolean;
}

export const useNavigationStore = create<NavigationStore>((set, get) => ({
  view: "home",
  spaceId: null,
  threadId: null,
  sidebarMode: "zaki",

  goHome: () => {
    set({ view: "home", spaceId: null, threadId: null, sidebarMode: "zaki" });
  },

  goToAbout: () => {
    set({ view: "about", spaceId: null, threadId: null, sidebarMode: "zaki" });
  },

  goToSpaces: () => {
    set({ view: "spaces", spaceId: null, threadId: null, sidebarMode: "spaces" });
  },

  goToSpace: (spaceId) => {
    set({ view: "space-detail", spaceId, threadId: null, sidebarMode: "spaces" });
  },

  goToThread: (spaceId, threadId) => {
    const isZaki = String(spaceId || "").trim().toLowerCase() === ZAKI_BOT_SPACE_ID;
    set({ view: "chat", spaceId, threadId, sidebarMode: isZaki ? "zaki" : "spaces" });
  },

  goToZakiSession: (sessionKey) => {
    set({ view: "chat", spaceId: ZAKI_BOT_SPACE_ID, threadId: sessionKey, sidebarMode: "zaki" });
  },

  clearThread: () => {
    set({ view: "home", spaceId: null, threadId: null, sidebarMode: "zaki" });
  },

  setSidebarMode: (mode) => {
    set({ sidebarMode: mode });
  },

  // Computed
  showZakiHome: () => get().view === "home",
  showSpacesView: () => get().view === "spaces",
  showSpaceDetail: () => get().view === "space-detail",
  showChatView: () => get().view === "chat",
}));
