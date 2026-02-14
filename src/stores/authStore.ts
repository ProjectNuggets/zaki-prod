import { create } from "zustand";
import { getAuthToken, setAuthToken, clearAuthToken } from "@/lib/api";

interface User {
  id?: number | string;
  username?: string;
  fullName?: string | null;
  role?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  
  // Actions
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  initFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: getAuthToken(), // Read from localStorage on init
  user: null,
  isLoading: !!getAuthToken(), // Start loading if token exists (needs validation)
  
  setToken: (token) => {
    if (token) {
      setAuthToken(token);
    } else {
      clearAuthToken();
    }
    set({ token });
  },
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => {
    clearAuthToken();
    set({ token: null, user: null });
  },
  initFromStorage: () => set({ token: getAuthToken() }),
}));
