import { create } from "zustand";

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

export const useAuthStore = create<AuthState>((set) => ({
  token: null,        // NOT seeded from localStorage — FE-01
  user: null,
  isHydrating: true,  // Boot starts in hydrating state — FE-02
  isLoading: true,

  setToken: (token) => {
    if (token) {
      set({ token });
    } else {
      set({ token: null, user: null, isHydrating: false, isLoading: false });
    }
  },

  setUser: (user) => set({ user }),

  setHydrating: (isHydrating) => set({ isHydrating, isLoading: isHydrating }),

  logout: () => set({ token: null, user: null, isHydrating: false, isLoading: false }),
}));

export type { AuthState };
