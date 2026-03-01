import "@/styles/fonts.css";
import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sidebar } from "./components/Sidebar";
import { MobileSidebar } from "./components/MobileSidebar";
import { MobileHeader } from "./components/MobileHeader";
import { SkipLink } from "./components/SkipLink";
import { LoginScreen } from "./components/LoginScreen";
import { LegalPage } from "./components/LegalPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "./components/ui/sonner";
import { OnboardingModal } from "./components/onboarding/OnboardingModal";
import {
  clearAuthToken,
  fetchCurrentUser,
  fetchProfile,
  fetchLegalConsentStatus,
  submitLegalReconsent,
} from "@/lib/api";
import { useAuthStore, useUIStore, useNavigationStore } from "@/stores";

const LEGAL_POLICY_VERSION_FALLBACK = "2026-02-17.v2";

function getInitialLegalPolicyVersion() {
  if (typeof window !== "undefined") {
    const value = (
      window as Window & { __ZAKI_LEGAL_POLICY_VERSION__?: string }
    ).__ZAKI_LEGAL_POLICY_VERSION__;
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return LEGAL_POLICY_VERSION_FALLBACK;
}

export default function App() {
  const location = useLocation();
  const params = useParams();
  const scrollTimerRef = useRef<number | null>(null);
  const scrollTargetRef = useRef<HTMLElement | null>(null);
  const { t } = useTranslation();
  
  // Auth state from Zustand
  const { token, user, isLoading: authLoading, setUser, setLoading, logout } = useAuthStore();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [legalPolicyVersion, setLegalPolicyVersion] = useState(
    getInitialLegalPolicyVersion
  );
  const [legalReconsentRequired, setLegalReconsentRequired] = useState(false);
  const [legalReconsentChecked, setLegalReconsentChecked] = useState(false);
  const [legalReconsentSubmitting, setLegalReconsentSubmitting] = useState(false);
  const [legalReconsentError, setLegalReconsentError] = useState("");
  
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
      .then(async ({ data, response }) => {
        if (!isMounted) return;
        if (!response.ok || !data?.success) {
          clearAuthToken();
          logout();
          return;
        }
        const nextUser = data.user ?? null;
        if (!nextUser) {
          setUser(null);
          return;
        }
        let mergedUser = nextUser;
        try {
          const profileResult = await fetchProfile();
          if (
            profileResult.response.ok &&
            profileResult.data?.success &&
            profileResult.data.user
          ) {
            mergedUser = {
              ...nextUser,
              fullName: profileResult.data.user.fullName ?? nextUser.fullName ?? null,
            };
          }
        } catch {
          // Keep session user payload when profile lookup fails.
        }
        if (!isMounted) return;
        setUser(mergedUser);
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
    if (completed) {
      setOnboardingOpen(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setOnboardingOpen(true);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [user?.username, authLoading]);

  useEffect(() => {
    if (!token || !user?.username || authLoading) {
      setLegalReconsentRequired(false);
      setLegalReconsentChecked(false);
      setLegalReconsentError("");
      return;
    }

    let isMounted = true;
    fetchLegalConsentStatus(true)
      .then(({ response, data }) => {
        if (!isMounted || !response.ok) return;
        const nextVersion = String(data?.policyVersion || "").trim();
        if (nextVersion) {
          setLegalPolicyVersion(nextVersion);
        }
        const requiresReconsent = Boolean(data?.requiresReconsent);
        setLegalReconsentRequired(requiresReconsent);
        if (!requiresReconsent) {
          setLegalReconsentChecked(false);
          setLegalReconsentError("");
        }
      })
      .catch(() => {
        // Keep current access if status check fails; user can continue.
      });

    return () => {
      isMounted = false;
    };
  }, [token, user?.username, authLoading]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOpenOnboarding = () => {
      setOnboardingOpen(true);
    };
    window.addEventListener("zaki:open-onboarding", handleOpenOnboarding);
    return () => {
      window.removeEventListener("zaki:open-onboarding", handleOpenOnboarding);
    };
  }, []);

  const dismissOnboarding = () => {
    setOnboardingOpen(false);
  };

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

  const handleLegalReconsent = async () => {
    if (!legalReconsentChecked) {
      setLegalReconsentError(t("app.legal.errorConsentRequired"));
      return;
    }
    setLegalReconsentSubmitting(true);
    setLegalReconsentError("");
    try {
      const { response, data } = await submitLegalReconsent(legalPolicyVersion);
      if (!response.ok || !data?.success || data.requiresReconsent) {
        setLegalReconsentError(
          data?.error || t("app.legal.errorSaveFailed")
        );
        return;
      }
      setLegalReconsentRequired(false);
      setLegalReconsentChecked(false);
    } catch {
      setLegalReconsentError(t("app.legal.errorSaveFailed"));
    } finally {
      setLegalReconsentSubmitting(false);
    }
  };

  if (!token && !authLoading && location.pathname === "/legal") {
    return <LegalPage />;
  }

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
            {t("app.loadingSession")}
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
      
      <div className="zaki-app flex flex-col md:flex-row w-full h-[100dvh] overflow-x-hidden overflow-y-hidden font-sans text-zaki-primary dark:text-[#efe6d9]">
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
      {legalReconsentRequired && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-zaki-subtle bg-white p-6 shadow-[0px_20px_60px_rgba(0,0,0,0.35)] dark:border-[#2a2018] dark:bg-[#0F0B0A]">
            <h2 className="text-lg font-semibold text-zaki-primary dark:text-[#efe6d9]">
              {t("app.legal.title")}
            </h2>
            <p className="mt-2 text-sm text-zaki-secondary dark:text-[#c9b8a4]">
              {t("app.legal.body", { policyVersion: legalPolicyVersion })}
            </p>
            <label className="mt-4 flex items-start gap-3 rounded-zaki-md border border-zaki-strong bg-zaki-base/70 px-3 py-3 text-xs font-medium text-zaki-secondary dark:border-[#2a2018] dark:bg-[#14100d] dark:text-[#c9b8a4]">
              <input
                type="checkbox"
                checked={legalReconsentChecked}
                onChange={(event) => setLegalReconsentChecked(event.target.checked)}
                className="mt-0.5 size-4 rounded border border-zaki-strong bg-white accent-[#D97757] dark:border-[#3a3026] dark:bg-[#0f0b08]"
              />
              <span className="leading-relaxed">
                {t("app.legal.checkboxPrefix")}{" "}
                <a
                  href="/legal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-zaki-brand hover:underline"
                >
                  {t("app.legal.checkboxLink")}
                </a>
                .
              </span>
            </label>
            {legalReconsentError && (
              <div className="mt-3 rounded-zaki-md border border-zaki-strong bg-zaki-error px-3 py-2 text-xs text-zaki-brand dark:border-[#3a1f1b] dark:bg-[rgba(210,68,48,0.18)] dark:text-[#ffe7e2]">
                {legalReconsentError}
              </div>
            )}
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-zaki-md border border-zaki-strong px-4 py-2 text-xs font-semibold text-zaki-secondary hover:text-zaki-primary dark:border-[#2a2018] dark:text-[#c9b8a4] dark:hover:text-[#efe6d9]"
                onClick={() => {
                  clearAuthToken();
                  logout();
                  setLegalReconsentRequired(false);
                  setLegalReconsentChecked(false);
                  setLegalReconsentError("");
                }}
              >
                {t("app.legal.signOut")}
              </button>
              <button
                type="button"
                disabled={!legalReconsentChecked || legalReconsentSubmitting}
                className="rounded-zaki-md bg-zaki-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-zaki-brand-hover disabled:opacity-60"
                onClick={handleLegalReconsent}
              >
                {legalReconsentSubmitting
                  ? t("app.legal.saving")
                  : t("app.legal.accept")}
              </button>
            </div>
          </div>
        </div>
      )}
      <OnboardingModal
        isOpen={onboardingOpen}
        userName={user?.fullName || user?.username || t("home.guestName")}
        onDismiss={dismissOnboarding}
        onComplete={completeOnboarding}
        onCreateSpace={openCreateSpace}
        onOpenMemory={openMemory}
        onOpenSettings={openSettings}
      />
    </>
  );
}
