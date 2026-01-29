import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemePreference = "light" | "dark" | "system";
type ToastType = "success" | "error" | "warning" | "info";

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
      themePreference: "system",
      systemTheme: "light",
      sidebarCollapsed: false,
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
      partialize: (state) => ({
        themePreference: state.themePreference,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
