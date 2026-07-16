import { create } from "zustand";
import { notifyAuthSessionCleared } from "@/lib/authSessionEvents";

interface User {
  id?: number | string;
  username?: string;
  fullName?: string | null;
  role?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isHydrating: boolean;
  isLoading: boolean;
  // Actions
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setHydrating: (hydrating: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,        // NOT seeded from localStorage — FE-01
  user: null,
  isHydrating: true,  // Boot starts in hydrating state — FE-02
  isLoading: true,

  setToken: (token) => {
    if (token) {
      set({ token });
    } else {
      const hadAuthenticatedSession = Boolean(get().token || get().user);
      set({ token: null, user: null, isHydrating: false, isLoading: false });
      if (hadAuthenticatedSession) notifyAuthSessionCleared();
    }
  },

  setUser: (user) => set({ user }),

  setHydrating: (isHydrating) => set({ isHydrating, isLoading: isHydrating }),

  logout: () => {
    const hadAuthenticatedSession = Boolean(get().token || get().user);
    set({ token: null, user: null, isHydrating: false, isLoading: false });
    if (hadAuthenticatedSession) notifyAuthSessionCleared();
  },
}));

export type { AuthState };
