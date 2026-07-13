import "@/styles/fonts.css";
import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sidebar } from "./components/Sidebar";
import { MobileSidebar } from "./components/MobileSidebar";
import { MobileHeader } from "./components/MobileHeader";
import { ProductRail } from "./components/ProductRail";
import { AppTopbar } from "./components/AppTopbar";
import { SkipLink } from "./components/SkipLink";
import { LoginScreen } from "./components/LoginScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "./components/ui/sonner";
import {
  buildApiUrl,
  fetchCurrentUser,
  fetchProfile,
  fetchLegalConsentStatus,
  requestLogout,
  submitLegalReconsent,
} from "@/lib/api";
import { useAuthStore, useUIStore, useNavigationStore } from "@/stores";
import { ZAKI_BOT_SPACE_ID, ZAKI_BOT_THREAD_ID } from "@/lib/zakiBot";
import { consumeWebsiteCommandIntentFromUrl } from "@/lib/pendingIntent";
import { getInitialLegalPolicyVersion } from "@/lib/legalPolicy";

const PUBLIC_WEBSITE_PATHS = new Set([
  "/",
  "/pricing",
  "/story",
  "/faq",
  "/contact",
  "/autism-guidance",
  "/vs-chatgpt",
  "/zaki-vs-spaces",
  "/best-arabic-ai-assistant",
  "/zaki-vs-openclaw",
  "/zaki-bot",
  "/privacy",
  "/terms",
  "/compliance",
  "/legal",
  "/ar",
  "/ar/zaki-bot",
  "/ar/story",
  "/ar/faq",
  "/ar/contact",
  "/ar/autism-guidance",
  "/ar/privacy",
  "/ar/terms",
  "/ar/compliance",
]);

const PUBLIC_WEBSITE_PREFIXES = ["/products/", "/how-to/", "/ar/products/", "/artifact/"];

function normalizePathname(pathname: string) {
  return String(pathname || "").replace(/\/+$/, "") || "/";
}

function isGatedProductPath(pathname: string) {
  const normalized = normalizePathname(pathname);
  return normalized === "/learn" || normalized === "/hire" || normalized === "/design";
}

function isPublicWebsitePath(pathname: string) {
  const normalized = normalizePathname(pathname);
  return (
    PUBLIC_WEBSITE_PATHS.has(normalized) ||
    PUBLIC_WEBSITE_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  );
}

function isAnonymousAllowedPath(pathname: string) {
  const normalized = normalizePathname(pathname);
  return (
    isPublicWebsitePath(normalized) ||
    isGatedProductPath(normalized) ||
    normalized === "/spaces" ||
    normalized.startsWith("/spaces/") ||
    normalized === "/pricing/success"
  );
}

function getSafeNextPath(value: string | null) {
  const raw = String(value || "").trim();
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "";
  try {
    const parsed = new URL(raw, "https://zaki.local");
    if (parsed.origin !== "https://zaki.local") return "";
    const normalized = normalizePathname(parsed.pathname);
    return normalized === "/" ? "" : normalized;
  } catch {
    return "";
  }
}

export default function App() {
  const location = useLocation();
  const scrollTimerRef = useRef<number | null>(null);
  const scrollTargetRef = useRef<HTMLElement | null>(null);
  const { t } = useTranslation();
  const normalizedPath = normalizePathname(location.pathname);
  const isGatedProductRoute = isGatedProductPath(normalizedPath);
  const isWorkspaceRoute = false;
  const isDashboardRoute = normalizedPath === "/";
  const isAgentRoute = normalizedPath === "/agent";
  const isBrainRoute = normalizedPath === "/brain";
  const isSettingsRoute = normalizedPath === "/settings";
  const isWideSurfaceRoute =
    isDashboardRoute ||
    isAgentRoute ||
    isBrainRoute ||
    isSettingsRoute ||
    isGatedProductRoute;
  const isPublicWebsiteRoute = isPublicWebsitePath(normalizedPath);
  const isAnonymousAllowedRoute = isAnonymousAllowedPath(normalizedPath);
  const searchParams = new URLSearchParams(location.search);
  const hasExplicitAuthIntent =
    searchParams.has("auth") || Boolean(getSafeNextPath(searchParams.get("next")));
  
  // Auth state from Zustand
  const { token, user, isHydrating, setToken, setUser, setHydrating, logout } = useAuthStore();
  const [legalPolicyVersion, setLegalPolicyVersion] = useState(
    getInitialLegalPolicyVersion
  );
  const [legalReconsentRequired, setLegalReconsentRequired] = useState(
    searchParams.get("legalConsent") === "required"
  );
  const [legalReconsentChecked, setLegalReconsentChecked] = useState(false);
  const [legalReconsentSubmitting, setLegalReconsentSubmitting] = useState(false);
  const [legalReconsentError, setLegalReconsentError] = useState("");
  
  // UI state from Zustand
  const {
    themePreference,
    systemTheme,
    setSystemTheme,
    resolvedTheme,
  } = useUIStore();
  const appStage = resolvedTheme() === "dark" ? "dark" : "light";

  // Sync navigation store with React Router location (without triggering re-renders)
  useEffect(() => {
    const path = location.pathname;
    const threadMatch = path.match(/^\/spaces\/([^/]+)\/threads\/([^/]+)/);
    const spaceMatch = path.match(/^\/spaces\/([^/]+)$/);
    const agentThreadId = new URLSearchParams(location.search).get("thread");
    const spaceId = threadMatch?.[1] ?? spaceMatch?.[1] ?? null;
    const threadId = threadMatch?.[2] ?? null;
    
    // Directly update the store state based on URL
    const store = useNavigationStore.getState();
    
    if (path === '/about') {
      store.goToAbout();
    } else if (path === '/agent') {
      store.goToThread(
        ZAKI_BOT_SPACE_ID,
        agentThreadId && agentThreadId.trim() ? agentThreadId.trim() : ZAKI_BOT_THREAD_ID
      );
    } else if (path === '/brain') {
      store.setSidebarMode("brain");
    } else if (path === '/learn' || path === '/hire' || path === '/design') {
      store.goHome();
    } else if (path === '/spaces' && !spaceId) {
      store.goToSpaces();
    } else if (spaceId && threadId) {
      store.goToThread(decodeURIComponent(spaceId), decodeURIComponent(threadId));
    } else if (spaceId) {
      store.goToSpace(decodeURIComponent(spaceId));
    } else {
      store.goHome();
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    consumeWebsiteCommandIntentFromUrl({
      pathname: location.pathname,
      search: location.search,
    });
  }, [location.pathname, location.search]);

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

  // FE-02 + FE-03: Boot hydration — call /api/auth/refresh before rendering routes.
  // Public routes still need this because access tokens are memory-only; a
  // returning paid user may arrive with only the HttpOnly refresh cookie.
  // The HttpOnly refresh cookie is sent automatically (credentials: include via raw fetch).
  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      try {
        const res = await fetch(buildApiUrl("/api/auth/refresh"), {
          method: "POST",
          credentials: "include",
        });
        if (!isMounted) return;
        if (res.ok) {
          const data = (await res.json()) as { token?: string };
          if (data.token && isMounted) {
            setToken(data.token);
            // Now fetch user profile with the new token
            try {
              const { response: ur, data: ud } = await fetchCurrentUser();
              if (!isMounted) return;
              if (ur.ok && ud?.success && ud.user) {
                let mergedUser = ud.user;
                try {
                  const profileResult = await fetchProfile();
                  if (profileResult.response.ok && profileResult.data?.success && profileResult.data.user) {
                    mergedUser = { ...ud.user, fullName: profileResult.data.user.fullName ?? ud.user.fullName ?? null };
                  }
                } catch {
                  // Keep base user if profile lookup fails
                }
                if (isMounted) setUser(mergedUser);
              } else if (isMounted) {
                logout();
              }
            } catch {
              if (isMounted) logout();
            }
          }
        } else {
          // 401 from /api/auth/refresh — no valid session
          if (isMounted) logout();
        }
      } catch {
        if (isMounted) logout();
      } finally {
        if (isMounted) setHydrating(false);
      }
    }

    void hydrate();

    return () => { isMounted = false; };
  }, []); // Run once on mount — empty deps (FE-02)

  useEffect(() => {
    if (!token || !user?.username || isHydrating) {
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
        // A Google-created account marked by the callback remains gated even if
        // the follow-up status request is temporarily unavailable.
      });

    return () => {
      isMounted = false;
    };
  }, [token, user?.username, isHydrating]);

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

  if (!token && !isHydrating && (hasExplicitAuthIntent || !isAnonymousAllowedRoute)) {
    return <LoginScreen />;
  }

  if (isHydrating) {
    return (
      <div className="zaki-v2-loading" data-v2-stage={appStage}>
        <div className="flex flex-col items-center gap-4">
          <div className="zaki-v2-loading__mark" aria-hidden="true" />
          <div className="zaki-v2-loading__label">
            {t("app.loadingSession")}
          </div>
        </div>
      </div>
    );
  }

  if (isPublicWebsiteRoute && normalizedPath !== "/") {
    return (
      <>
        <SkipLink />
        <main id="main-content" role="main" className="min-h-screen">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
        <Toaster />
      </>
    );
  }

  return (
    <>
      <SkipLink />
      {/* Mobile sidebar drawer */}
      <MobileSidebar />
      
      <div
        className={`zaki-app zaki-app-v2 flex w-full h-[100dvh] flex-col overflow-x-hidden overflow-y-hidden font-sans text-zaki-primary md:grid dark:text-[#efe6d9] ${
          isWideSurfaceRoute
            ? "md:grid-cols-[40px_minmax(0,1fr)]"
            : "md:grid-cols-[40px_232px_minmax(0,1fr)]"
        }`}
        data-v2-stage={appStage}
        data-v2-density="comfortable"
      >
        {/* Mobile header with hamburger menu */}
        <MobileHeader />

        {/* Desktop product rail and contextual navigation */}
        <ProductRail />
        <div className={isWideSurfaceRoute ? "hidden" : "hidden min-h-0 overflow-hidden md:block"}>
          <Sidebar chrome="context" />
        </div>
        
        <main id="main-content" role="main" className="flex min-w-0 flex-1 flex-col overflow-hidden border-l-0 zaki-shell-surface">
          <AppTopbar />
          <div className={isWorkspaceRoute ? "zaki-main-shell zaki-main-shell--workspace" : "zaki-main-shell"}>
            <div className={isWorkspaceRoute ? "zaki-main-panel zaki-main-panel--workspace" : "zaki-main-panel"}>

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
          <div className="zaki-legal-reconsent-v2 w-full max-w-lg p-6">
            <h2>
              {t("app.legal.title")}
            </h2>
            <p className="mt-3 text-sm leading-6">
              {t("app.legal.body", { policyVersion: legalPolicyVersion })}
            </p>
            <label className="mt-4 flex items-start gap-3 px-3 py-3 text-xs">
              <input
                type="checkbox"
                checked={legalReconsentChecked}
                onChange={(event) => setLegalReconsentChecked(event.target.checked)}
                className="mt-0.5 size-4 border border-zaki-strong bg-transparent accent-[var(--v2-accent)]"
              />
              <span className="leading-relaxed">
                {t("app.legal.checkboxPrefix")}{" "}
                <a
                  href="https://chatzaki.com/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-zaki-brand hover:underline"
                >
                  {t("app.legal.termsLink")}
                </a>
                {", "}
                <a
                  href="https://chatzaki.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-zaki-brand hover:underline"
                >
                  {t("app.legal.privacyLink")}
                </a>
                {" & "}
                <a
                  href="https://chatzaki.com/compliance"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-zaki-brand hover:underline"
                >
                  {t("app.legal.complianceLink")}
                </a>
                .
              </span>
            </label>
            {legalReconsentError && (
              <div className="mt-3 border border-[var(--v2-accent-hairline)] bg-[var(--v2-danger-faint)] px-3 py-2 text-xs text-[var(--v2-danger)]">
                {legalReconsentError}
              </div>
            )}
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                className="v2-btn v2-btn--sm"
                onClick={() => {
                  void requestLogout().then(({ response }) => {
                    if (response.ok) {
                      logout();
                      setLegalReconsentRequired(false);
                      setLegalReconsentChecked(false);
                      setLegalReconsentError("");
                    } else {
                      setLegalReconsentError(
                        t("app.legal.signOutError", {
                          defaultValue:
                            "Unable to sign out securely. Check your connection and try again.",
                        })
                      );
                    }
                  }).catch(() => {
                    setLegalReconsentError(
                      t("app.legal.signOutError", {
                        defaultValue:
                          "Unable to sign out securely. Check your connection and try again.",
                      })
                    );
                  });
                }}
              >
                {t("app.legal.signOut")}
              </button>
              <button
                type="button"
                disabled={!legalReconsentChecked || legalReconsentSubmitting}
                className="v2-btn v2-btn--accent v2-btn--sm"
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
    </>
  );
}
