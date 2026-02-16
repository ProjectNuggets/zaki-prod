import "@/styles/fonts.css";
import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useParams } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { MobileSidebar } from "./components/MobileSidebar";
import { MobileHeader } from "./components/MobileHeader";
import { SkipLink } from "./components/SkipLink";
import { LoginScreen } from "./components/LoginScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "./components/ui/sonner";
import { OnboardingModal } from "./components/onboarding/OnboardingModal";
import { clearAuthToken, fetchCurrentUser } from "@/lib/api";
import { useAuthStore, useUIStore, useNavigationStore } from "@/stores";

export default function App() {
  const location = useLocation();
  const params = useParams();
  const scrollTimerRef = useRef<number | null>(null);
  const scrollTargetRef = useRef<HTMLElement | null>(null);
  
  // Auth state from Zustand
  const { token, user, isLoading: authLoading, setUser, setLoading, logout } = useAuthStore();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  
  // UI state from Zustand
  const {
    themePreference,
    systemTheme,
    setSystemTheme,
    resolvedTheme,
    setMobileSidebarOpen,
  } = useUIStore();

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

  // Show scrollbars only while actively scrolling, then fade after 3s
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleScroll = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const scrollable = target?.closest?.(".zaki-scrollbar-fade") as HTMLElement | null;
      if (!scrollable) return;
      scrollTargetRef.current = scrollable;
      scrollable.classList.add("is-scrolling");
      if (scrollTimerRef.current) {
        window.clearTimeout(scrollTimerRef.current);
      }
      scrollTimerRef.current = window.setTimeout(() => {
        scrollTargetRef.current?.classList.remove("is-scrolling");
      }, 3000);
    };
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("scroll", handleScroll, true);
      if (scrollTimerRef.current) {
        window.clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user?.username || authLoading) return;
    const key = `zaki:onboarding:v1:${String(user.username).toLowerCase()}`;
    const completed = window.localStorage.getItem(key) === "done";
    setOnboardingOpen(!completed);
  }, [user?.username, authLoading]);

  const completeOnboarding = () => {
    if (typeof window !== "undefined" && user?.username) {
      const key = `zaki:onboarding:v1:${String(user.username).toLowerCase()}`;
      window.localStorage.setItem(key, "done");
    }
    setOnboardingOpen(false);
  };

  const openCreateSpace = () => {
    window.dispatchEvent(new Event("zaki:view-spaces"));
    window.dispatchEvent(new Event("zaki:open-create-space"));
  };

  const openMemory = () => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setMobileSidebarOpen(true);
      window.setTimeout(() => {
        window.dispatchEvent(new Event("zaki:open-memory"));
      }, 0);
      return;
    }
    window.dispatchEvent(new Event("zaki:open-memory"));
  };

  const openSettings = () => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setMobileSidebarOpen(true);
      window.setTimeout(() => {
        window.dispatchEvent(new Event("zaki:open-settings"));
      }, 0);
      return;
    }
    window.dispatchEvent(new Event("zaki:open-settings"));
  };

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
    <>
      <SkipLink />
      {/* Mobile sidebar drawer */}
      <MobileSidebar />
      
      <div className="zaki-app flex flex-col md:flex-row w-full h-screen overflow-hidden font-sans text-zaki-primary dark:text-[#efe6d9]">
        {/* Mobile header with hamburger menu */}
        <MobileHeader />
        
        {/* Desktop sidebar - hidden on mobile */}
        <div className="hidden md:block">
          <Sidebar />
        </div>
        
        <main id="main-content" role="main" className="flex-1 flex flex-col min-w-0 overflow-hidden border-l-0 bg-[#FDF6EE] dark:bg-[#0f0b08]">
          <div className="zaki-main-shell">
            <div className="zaki-main-panel">
              <div className="zaki-main-inner">
                <ErrorBoundary>
                  <Outlet />
                </ErrorBoundary>
              </div>
            </div>
          </div>
        </main>
        <Toaster />
      </div>
      <OnboardingModal
        isOpen={onboardingOpen}
        userName={user?.fullName || user?.username || "there"}
        onClose={completeOnboarding}
        onCreateSpace={openCreateSpace}
        onOpenMemory={openMemory}
        onOpenSettings={openSettings}
      />
    </>
  );
}
