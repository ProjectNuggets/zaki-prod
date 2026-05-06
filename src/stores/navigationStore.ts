import { create } from "zustand";
import { ZAKI_BOT_SPACE_ID } from "@/lib/zakiBot";

type ViewType = "home" | "about" | "spaces" | "space-detail" | "chat";
export type SidebarMode = "zaki" | "spaces" | "brain" | "learning";

interface NavigationState {
  view: ViewType;
  spaceId: string | null;
  threadId: string | null;
  zakiSessionKey: string | null;
  sidebarMode: SidebarMode;
}

interface NavigationStore extends NavigationState {
  // Actions
  goHome: () => void;
  goToAbout: () => void;
  goToSpaces: () => void;
  goToSpace: (spaceId: string) => void;
  goToThread: (
    spaceId: string,
    threadId: string,
    options?: { zakiSessionKey?: string | null }
  ) => void;
  goToZakiSession: (sessionKey: string, threadId?: string | null) => void;
  goToZakiHome: () => void;
  clearThread: () => void;
  setSidebarMode: (mode: SidebarMode) => void;
  setZakiSessionKey: (sessionKey: string | null) => void;

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
  zakiSessionKey: null,
  sidebarMode: "zaki",

  goHome: () => {
    set({ view: "home", spaceId: null, threadId: null, zakiSessionKey: null, sidebarMode: "zaki" });
  },

  goToAbout: () => {
    set({ view: "about", spaceId: null, threadId: null, zakiSessionKey: null, sidebarMode: "zaki" });
  },

  goToSpaces: () => {
    set({ view: "spaces", spaceId: null, threadId: null, zakiSessionKey: null, sidebarMode: "spaces" });
  },

  goToSpace: (spaceId) => {
    set({ view: "space-detail", spaceId, threadId: null, zakiSessionKey: null, sidebarMode: "spaces" });
  },

  goToThread: (spaceId, threadId, options) => {
    const isZaki = String(spaceId || "").trim().toLowerCase() === ZAKI_BOT_SPACE_ID;
    const current = get();
    const nextZakiSessionKey = isZaki
      ? Object.prototype.hasOwnProperty.call(options || {}, "zakiSessionKey")
        ? options?.zakiSessionKey ?? null
        : current.spaceId === spaceId && current.threadId === threadId
        ? current.zakiSessionKey
        : null
      : null;
    set({
      view: "chat",
      spaceId,
      threadId,
      zakiSessionKey: nextZakiSessionKey,
      sidebarMode: isZaki ? "zaki" : "spaces",
    });
  },

  goToZakiSession: (sessionKey, threadId = null) => {
    set({
      view: "chat",
      spaceId: ZAKI_BOT_SPACE_ID,
      threadId,
      zakiSessionKey: sessionKey,
      sidebarMode: "zaki",
    });
  },

  // Like clearThread, but keeps the Zaki space active so SSE narration,
  // approvals, and other zaki-only surfaces keep receiving events while the
  // welcome dashboard is visible.
  goToZakiHome: () => {
    set({ view: "home", spaceId: ZAKI_BOT_SPACE_ID, threadId: null, zakiSessionKey: null, sidebarMode: "zaki" });
  },

  clearThread: () => {
    set({ view: "home", spaceId: null, threadId: null, zakiSessionKey: null, sidebarMode: "zaki" });
  },

  setSidebarMode: (mode) => {
    set({ sidebarMode: mode });
  },

  setZakiSessionKey: (sessionKey) => {
    set({ zakiSessionKey: sessionKey });
  },

  // Computed
  showZakiHome: () => get().view === "home",
  showSpacesView: () => get().view === "spaces",
  showSpaceDetail: () => get().view === "space-detail",
  showChatView: () => get().view === "chat",
}));
