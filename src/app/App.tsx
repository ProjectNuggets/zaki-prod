import "@/styles/fonts.css";
import { useEffect } from "react";
import { Outlet, useLocation, useParams } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { LoginScreen } from "./components/LoginScreen";
import { Toaster } from "./components/ui/sonner";
import { clearAuthToken, fetchCurrentUser } from "@/lib/api";
import { useAuthStore, useUIStore, useNavigationStore } from "@/stores";

export default function App() {
  const location = useLocation();
  const params = useParams();
  
  // Auth state from Zustand
  const { token, isLoading: authLoading, setUser, setLoading, logout } = useAuthStore();
  
  // UI state from Zustand
  const { themePreference, systemTheme, setSystemTheme, resolvedTheme } = useUIStore();

  // Sync navigation store with React Router location (without triggering re-renders)
  useEffect(() => {
    const path = location.pathname;
    const { spaceId, threadId } = params;
    
    // Directly update the store state based on URL
    const store = useNavigationStore.getState();
    
    if (path === '/spaces' && !spaceId) {
      store.goToSpaces();
    } else if (path === '/library') {
      store.goToLibrary();
    } else if (spaceId && threadId) {
      store.goToThread(spaceId as string, threadId as string);
    } else if (spaceId) {
      store.goToSpace(spaceId as string);
    } else {
      store.goHome();
    }
  }, [location.pathname, params]);

  // Sync theme to DOM
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme() === "dark");
  }, [themePreference, systemTheme, resolvedTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setSystemTheme(media.matches ? "dark" : "light");
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [setSystemTheme]);

  // Fetch user on mount if token exists
  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    fetchCurrentUser()
      .then(({ data, response }) => {
        if (!isMounted) return;
        if (!response.ok || !data?.success) {
          clearAuthToken();
          logout();
          return;
        }
        setUser(data.user ?? null);
      })
      .catch(() => {
        if (!isMounted) return;
        clearAuthToken();
        logout();
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token, setUser, setLoading, logout]);

  if (!token && !authLoading) {
    return <LoginScreen />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#fff8f0] dark:bg-[#0f0b08] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {/* Spinner */}
          <div className="size-8 border-2 border-[#88735A]/20 border-t-[#88735A] rounded-full animate-spin" />
          <div className="text-sm text-zaki-muted dark:text-[#c9b8a4]">
            Loading session...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="zaki-app flex w-full h-screen overflow-hidden font-sans text-zaki-primary dark:text-[#efe6d9]">
      <Sidebar />
      <Outlet />
      <Toaster />
    </div>
  );
}
