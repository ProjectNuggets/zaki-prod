import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemePreference = "light" | "dark" | "system";
type ToastType = "success" | "error" | "warning" | "info";
const DEFAULT_THEME_PREFERENCE: ThemePreference = "dark";
type PersistedUIState = {
  themePreference: ThemePreference;
  sidebarCollapsed: boolean;
};

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface UIState {
  // Theme
  themePreference: ThemePreference;
  systemTheme: "light" | "dark";
  
  // Sidebar
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;  // Mobile drawer state
  
  // Modals
  shareModalOpen: boolean;
  editInstructionsModalOpen: boolean;
  
  // Toasts
  toasts: Toast[];
  
  // Loading states
  globalLoading: boolean;
}

interface UIStore extends UIState {
  // Theme actions
  setThemePreference: (theme: ThemePreference) => void;
  setSystemTheme: (theme: "light" | "dark") => void;
  resolvedTheme: () => "light" | "dark";
  
  // Sidebar actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  
  // Modal actions
  setShareModalOpen: (open: boolean) => void;
  setEditInstructionsModalOpen: (open: boolean) => void;
  
  // Toast actions
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
  
  // Loading
  setGlobalLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      themePreference: DEFAULT_THEME_PREFERENCE,
      systemTheme: "dark",
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      shareModalOpen: false,
      editInstructionsModalOpen: false,
      toasts: [],
      globalLoading: false,
      
      setThemePreference: (themePreference) => set({ themePreference }),
      setSystemTheme: (systemTheme) => set({ systemTheme }),
      resolvedTheme: () => {
        const { themePreference, systemTheme } = get();
        return themePreference === "system" ? systemTheme : themePreference;
      },
      
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
      toggleMobileSidebar: () =>
        set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
      
      setShareModalOpen: (shareModalOpen) => set({ shareModalOpen }),
      setEditInstructionsModalOpen: (editInstructionsModalOpen) =>
        set({ editInstructionsModalOpen }),
      
      addToast: (message, type) => {
        const id = Date.now().toString();
        set((state) => ({
          toasts: [...state.toasts, { id, message, type }],
        }));
        // Auto-remove after 5s
        setTimeout(() => {
          set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
          }));
        }, 5000);
      },
      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
      
      setGlobalLoading: (globalLoading) => set({ globalLoading }),
    }),
    {
      name: "zaki-ui-storage",
      version: 1,
      partialize: (state) => ({
        themePreference: state.themePreference,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
      migrate: (persistedState, version) => {
        const state = (persistedState ?? {}) as Partial<UIState>;
        return {
          themePreference: version < 1
            ? DEFAULT_THEME_PREFERENCE
            : state.themePreference ?? DEFAULT_THEME_PREFERENCE,
          sidebarCollapsed: state.sidebarCollapsed ?? false,
        } satisfies PersistedUIState;
      },
    }
  )
);
