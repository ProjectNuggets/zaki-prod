import "@/styles/fonts.css";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sidebar } from "./components/Sidebar";
import { MobileSidebar } from "./components/MobileSidebar";
import { MobileHeader } from "./components/MobileHeader";
import { ProductRail } from "./components/ProductRail";
import { AppTopbar } from "./components/AppTopbar";
import { SkipLink } from "./components/SkipLink";
import { LoginScreen, type AuthenticatedSession } from "./components/LoginScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "./components/ui/sonner";
import {
  AUTH_REQUIRED_EVENT,
  beginCandidateAuthTransaction,
  completeCandidateAuthTransaction,
  fetchCurrentUser,
  fetchProfile,
  getStrictFreshAuthToken,
  GOOGLE_OAUTH_POPUP_COMPLETE_MESSAGE,
  GOOGLE_OAUTH_POPUP_FAILURE_MESSAGE,
  markAuthSessionChanged,
  fetchLegalConsentStatus,
  requestCandidateSessionLogout,
  requestLogout,
  submitLegalReconsent,
  type CandidateAuthTransaction,
} from "@/lib/api";
import { AUTH_SESSION_CLEARED_EVENT } from "@/lib/authSessionEvents";
import {
  useAnonymousWorkClaimStore,
  useAuthStore,
  useNavigationStore,
  useSpacesStore,
  useUIStore,
  useZakiSessionUiStore,
} from "@/stores";
import { ZAKI_BOT_SPACE_ID, ZAKI_BOT_THREAD_ID } from "@/lib/zakiBot";
import { useAnonymousWorkClaim } from "@/hooks/useAnonymousWorkClaim";
import {
  clearPendingIntent,
  consumeWebsiteCommandIntentFromUrl,
  PENDING_INTENT_STORAGE_FAILURE_EVENT,
  type PendingIntentStorageFailureDetail,
} from "@/lib/pendingIntent";
import {
  beginGoogleOAuthTransition,
  consumeGoogleOAuthTransition,
} from "@/lib/googleOAuthTransition";
import { ANONYMOUS_WORK_LEDGER_KEY } from "@/lib/anonymousWork";
import { getInitialLegalPolicyVersion } from "@/lib/legalPolicy";
import { getProductLaunchState } from "@/lib/productRoutes";
import { useTextToSpeechStore } from "@/queries/useTextToSpeech";

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
const GOOGLE_OAUTH_POPUP_FAILURE_CODES = new Set([
  "google_consent_required",
  "google_consent_stale",
  "age_verification_required",
  "minimum_age",
  "google_oauth_failed",
  "google_oauth_cancelled",
  "google_oauth_missing_code",
  "google_oauth_unconfigured",
  "google_oauth_start_failed",
]);
const ACCOUNT_STORAGE_PRINCIPAL_KEY = "zaki:account-storage-principal:v1";

function normalizePathname(pathname: string) {
  return String(pathname || "").replace(/\/+$/, "") || "/";
}

function isGatedProductPath(pathname: string) {
  const normalized = normalizePathname(pathname);
  return getProductLaunchState(normalized.slice(1)) === "coming_soon";
}

function isHiddenProductPath(pathname: string) {
  const normalized = normalizePathname(pathname);
  return getProductLaunchState(normalized.slice(1)) === "hidden";
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
    isHiddenProductPath(normalized) ||
    normalized === "/spaces" ||
    normalized.startsWith("/spaces/") ||
    // WP-F (spec F5) — /agent resolves for an anonymous visitor. The tier matrix promises
    // "Agent: anonymous = preview only", so a deep link here must land on the plan preview,
    // NOT a full-screen login wall. The route itself (AgentRoute) is what keeps this safe:
    // signed out it renders the tool-less preview, never the authenticated workbench.
    //
    // /brain is deliberately NOT here. Brain is a real surface and its anonymous story (F8)
    // is a separate decision — it still gates.
    normalized === "/agent" ||
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

function getGoogleOAuthPopupFailureCode(value: string | null) {
  const code = String(value || "").trim();
  if (!code) return "";
  return GOOGLE_OAUTH_POPUP_FAILURE_CODES.has(code) ? code : "google_oauth_failed";
}

function getPrincipalKey(user: AuthenticatedSession["user"] | null | undefined) {
  const id = String(user?.id ?? "").trim();
  if (id) return `id:${id}`;

  const username = String(user?.username ?? "").trim().toLowerCase();
  return username ? `username:${username}` : "";
}

function isAccountScopedLocalStorageKey(key: string) {
  return (
    key === ANONYMOUS_WORK_LEDGER_KEY ||
    key === "zaki:pending-intent:v1" ||
    key === "zaki:pinned-threads" ||
    key === "zaki:session-titles" ||
    key === "zaki:agentDeletedSessionKeys" ||
    key === "zaki:expanded-space" ||
    key === "zaki:memory-bridge-offered" ||
    key === "zaki-memory-mode" ||
    key.startsWith("zaki:reactions:") ||
    key.startsWith("zaki:activation:v1:") ||
    key.startsWith("zaki:expanded-space:") ||
    key.startsWith("zaki:memory-bridge-offered:") ||
    key.startsWith("zaki.learn.")
  );
}

function readAccountStoragePrincipal() {
  if (typeof window === "undefined") return "";
  try {
    return String(window.localStorage.getItem(ACCOUNT_STORAGE_PRINCIPAL_KEY) || "").trim();
  } catch {
    return "";
  }
}

function writeAccountStoragePrincipal(principal: string | null | undefined) {
  if (typeof window === "undefined") return;
  try {
    const normalized = String(principal || "").trim();
    if (normalized) {
      window.localStorage.setItem(ACCOUNT_STORAGE_PRINCIPAL_KEY, normalized);
    } else {
      window.localStorage.removeItem(ACCOUNT_STORAGE_PRINCIPAL_KEY);
    }
  } catch {
    // A blocked storage implementation cannot prevent the safe in-memory reset.
  }
}

function clearAccountScopedBrowserState(
  { preserveAnonymousWork = false, preserveSharedLocalStorage = false } = {}
) {
  if (!preserveAnonymousWork && !preserveSharedLocalStorage) clearPendingIntent();
  if (typeof window === "undefined") return;

  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith("zaki:")) {
        window.sessionStorage.removeItem(key);
      }
    }
  } catch {
    // A blocked sessionStorage implementation cannot prevent the account switch.
  }

  // localStorage is shared across same-origin tabs. When another tab has
  // already published a new account owner, only that tab can safely replace
  // shared persisted state; this tab must clear its own memory/session data
  // without deleting the new owner's titles, pins, or learning state.
  if (preserveSharedLocalStorage) return;

  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      const isPreservedAnonymousWork =
        preserveAnonymousWork && (key === ANONYMOUS_WORK_LEDGER_KEY || key === "zaki:pending-intent:v1");
      if (key && !isPreservedAnonymousWork && isAccountScopedLocalStorageKey(key)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // A blocked localStorage implementation cannot prevent the account switch.
  }
}

function resetAccountScopedStores() {
  useNavigationStore.getState().goHome();
  useSpacesStore.setState({
    spaces: [],
    activeSpaceId: null,
    activeSpace: null,
    isLoading: false,
    error: null,
    createModalOpen: false,
  });
  useZakiSessionUiStore.setState({ sessions: {}, sandbox: null });
  useAnonymousWorkClaimStore.getState().reset();
  useTextToSpeechStore.getState().reset();
}

/**
 * Maps the router location onto the navigation store. The location-sync
 * effect applies it on every URL change, and a legitimate authenticated
 * commit re-applies it after resetAccountScopedStores() so the account-scope
 * wipe cannot bounce a deep link (e.g. /agent) onto the home dashboard.
 */
function applyLocationToNavigationStore(pathname: string, search: string) {
  const threadMatch = pathname.match(/^\/spaces\/([^/]+)\/threads\/([^/]+)/);
  const spaceMatch = pathname.match(/^\/spaces\/([^/]+)$/);
  const agentThreadId = new URLSearchParams(search).get("thread");
  const spaceId = threadMatch?.[1] ?? spaceMatch?.[1] ?? null;
  const threadId = threadMatch?.[2] ?? null;

  const store = useNavigationStore.getState();

  if (pathname === "/about") {
    store.goToAbout();
  } else if (pathname === "/agent") {
    store.goToThread(
      ZAKI_BOT_SPACE_ID,
      agentThreadId && agentThreadId.trim() ? agentThreadId.trim() : ZAKI_BOT_THREAD_ID
    );
  } else if (pathname === "/brain") {
    store.setSidebarMode("brain");
  } else if (isGatedProductPath(pathname) || isHiddenProductPath(pathname)) {
    store.goHome();
  } else if (pathname === "/spaces" && !spaceId) {
    store.goToSpaces();
  } else if (spaceId && threadId) {
    store.goToThread(decodeURIComponent(spaceId), decodeURIComponent(threadId));
  } else if (spaceId) {
    store.goToSpace(decodeURIComponent(spaceId));
  } else {
    store.goHome();
  }
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const scrollTimerRef = useRef<number | null>(null);
  const scrollTargetRef = useRef<HTMLElement | null>(null);
  const { t } = useTranslation();
  const normalizedPath = normalizePathname(location.pathname);
  const isGatedProductRoute = isGatedProductPath(normalizedPath);
  const isHiddenProductRoute = isHiddenProductPath(normalizedPath);
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
    isGatedProductRoute ||
    isHiddenProductRoute;
  const isPublicWebsiteRoute = isPublicWebsitePath(normalizedPath);
  const isAnonymousAllowedRoute = isAnonymousAllowedPath(normalizedPath);
  const searchParams = new URLSearchParams(location.search);
  const isGoogleOAuthPopup = searchParams.get("oauthPopup") === "google";
  const googleOAuthPopupFailureCode = getGoogleOAuthPopupFailureCode(
    searchParams.get("error")
  );
  const hasExplicitAuthIntent =
    searchParams.has("auth") || Boolean(getSafeNextPath(searchParams.get("next")));
  
  // Auth state from Zustand
  const { token, user, isHydrating, setHydrating, logout } = useAuthStore();
  const [legalPolicyVersion, setLegalPolicyVersion] = useState(
    getInitialLegalPolicyVersion
  );
  const [legalReconsentRequired, setLegalReconsentRequired] = useState(
    searchParams.get("legalConsent") === "required"
  );
  const [legalReconsentChecked, setLegalReconsentChecked] = useState(false);
  const [legalReconsentSubmitting, setLegalReconsentSubmitting] = useState(false);
  const [legalReconsentError, setLegalReconsentError] = useState("");
  const [reauthRequired, setReauthRequired] = useState(false);
  const [authSurfaceEpoch, setAuthSurfaceEpoch] = useState(0);
  const [storageRecovery, setStorageRecovery] =
    useState<PendingIntentStorageFailureDetail | null>(null);
  const [storageRecoveryError, setStorageRecoveryError] = useState("");
  const storageRecoveryActionRef = useRef<HTMLButtonElement | null>(null);
  const storageRecoveryTextRef = useRef<HTMLTextAreaElement | null>(null);
  const storageRecoveryReturnFocusRef = useRef<HTMLElement | null>(null);
  const oauthPopupNotificationSentRef = useRef(false);
  const reauthPrincipalRef = useRef("");
  const reauthTransactionRef = useRef<CandidateAuthTransaction | null>(null);
  // Async auth commits (boot hydration, wall/overlay logins) need the URL that
  // is current when they land, not the one captured when their closure formed.
  const locationRef = useRef(location);
  locationRef.current = location;
  const interactiveStoragePrincipalRef = useRef<string | undefined>(undefined);
  const initialGoogleOAuthSearchRef = useRef(location.search);
  // UI state from Zustand
  const {
    themePreference,
    systemTheme,
    setSystemTheme,
    resolvedTheme,
  } = useUIStore();
  const appStage = resolvedTheme() === "dark" ? "dark" : "light";

  const resetAccountScope = useCallback(
    ({ preserveAnonymousWork = false, preserveSharedLocalStorage = false } = {}) => {
      queryClient.clear();
      clearAccountScopedBrowserState({ preserveAnonymousWork, preserveSharedLocalStorage });
      resetAccountScopedStores();
      setStorageRecovery(null);
      setStorageRecoveryError("");
      storageRecoveryActionRef.current = null;
      storageRecoveryTextRef.current = null;
      storageRecoveryReturnFocusRef.current = null;
      setLegalPolicyVersion(getInitialLegalPolicyVersion());
      setLegalReconsentRequired(false);
      setLegalReconsentChecked(false);
      setLegalReconsentSubmitting(false);
      setLegalReconsentError("");
      setAuthSurfaceEpoch((epoch) => epoch + 1);
    },
    [queryClient]
  );

  const clearReauthenticationTransaction = useCallback(() => {
    completeCandidateAuthTransaction(reauthTransactionRef.current);
    reauthTransactionRef.current = null;
    reauthPrincipalRef.current = "";
  }, []);

  const notifyGoogleOAuthPopup = useCallback(
    (message: { type: string; error?: string }) => {
      if (
        typeof window === "undefined" ||
        !window.opener ||
        oauthPopupNotificationSentRef.current
      ) {
        return false;
      }
      oauthPopupNotificationSentRef.current = true;
      window.opener.postMessage(message, window.location.origin);
      window.close();
      return true;
    },
    []
  );

  /**
   * The sole client-side commit point for a verified principal. It keeps the
   * token and user atomic, clears prior-account state before a switch, and
   * records the browser-storage owner so sibling tabs can fail closed.
   */
  const commitAuthenticatedSession = useCallback(
    (
      session: AuthenticatedSession,
      {
        allowPreservedWork = false,
        source = "interactive",
        googleOAuthStoragePrincipalAtStart,
        interactiveStoragePrincipalAtStart,
      }: {
        allowPreservedWork?: boolean;
        source?: "hydrate" | "interactive";
        googleOAuthStoragePrincipalAtStart?: string;
        interactiveStoragePrincipalAtStart?: string;
      } = {}
    ) => {
      const nextPrincipal = getPrincipalKey(session.user);
      if (!nextPrincipal) {
        return {
          committed: false,
          preservesMountedWork: false,
          switchedMountedPrincipal: false,
          resetAccountScopedState: false,
          rejectedByNewerStorageOwner: false,
        };
      }

      const mountedPrincipal = getPrincipalKey(useAuthStore.getState().user);
      const storagePrincipal = readAccountStoragePrincipal();
      // A boot refresh has no proof that it is still the newest browser
      // session. If another tab has already claimed a different principal,
      // reject this stale hydration rather than deleting that account's shared
      // localStorage and writing the old marker back.
      if (
        source === "hydrate" &&
        storagePrincipal &&
        storagePrincipal !== nextPrincipal &&
        storagePrincipal !== googleOAuthStoragePrincipalAtStart
      ) {
        return {
          committed: false,
          preservesMountedWork: false,
          switchedMountedPrincipal: false,
          resetAccountScopedState: false,
          rejectedByNewerStorageOwner: false,
        };
      }
      // An interactive candidate records the owner when authentication starts.
      // If a different owner appears before its profile verification commits,
      // that candidate is stale even in a cold tab with no mounted principal.
      // Without a captured owner, retain the mounted-account guard for legacy
      // callers that can only prove the principal currently in this tab.
      if (
        source === "interactive" &&
        storagePrincipal &&
        storagePrincipal !== nextPrincipal &&
        (interactiveStoragePrincipalAtStart !== undefined
          ? storagePrincipal !== interactiveStoragePrincipalAtStart
          : Boolean(mountedPrincipal && storagePrincipal !== mountedPrincipal))
      ) {
        return {
          committed: false,
          preservesMountedWork: false,
          switchedMountedPrincipal: false,
          resetAccountScopedState: false,
          rejectedByNewerStorageOwner: true,
        };
      }
      const preservesStoredAccount = storagePrincipal === nextPrincipal;
      const switchesMountedPrincipal = Boolean(
        mountedPrincipal && mountedPrincipal !== nextPrincipal
      );
      const preservesMountedWork = Boolean(
        allowPreservedWork &&
          mountedPrincipal &&
          mountedPrincipal === nextPrincipal &&
          (!storagePrincipal || storagePrincipal === nextPrincipal)
      );

      const resetAccountScopedState =
        !preservesMountedWork && (!preservesStoredAccount || switchesMountedPrincipal);
      if (resetAccountScopedState) {
        // A first authenticated commit after anonymous work should retain only
        // the explicit anonymous handoff. Any known account owner means the
        // browser data is private and must be cleared before the new principal.
        resetAccountScope({
          preserveAnonymousWork: !mountedPrincipal && !storagePrincipal,
          // A sibling tab can publish this principal before its StorageEvent is
          // delivered here. Clear this tab's A-owned memory/session data while
          // retaining B's already-replaced shared localStorage.
          preserveSharedLocalStorage: preservesStoredAccount && switchesMountedPrincipal,
        });
      }

      markAuthSessionChanged();
      useAuthStore.setState({
        token: session.token,
        user: session.user,
        isHydrating: false,
        isLoading: false,
      });
      writeAccountStoragePrincipal(nextPrincipal);
      return {
        committed: true,
        preservesMountedWork,
        switchedMountedPrincipal: switchesMountedPrincipal,
        resetAccountScopedState,
        rejectedByNewerStorageOwner: false,
      };
    },
    [resetAccountScope]
  );

  const failClosedSession = useCallback(
    ({ clearStoragePrincipal = false, preserveSharedLocalStorage = false } = {}) => {
      resetAccountScope({ preserveSharedLocalStorage });
      if (clearStoragePrincipal) writeAccountStoragePrincipal("");
      markAuthSessionChanged();
      useAuthStore.setState({
        token: null,
        user: null,
        isHydrating: false,
        isLoading: false,
      });
      setReauthRequired(false);
      clearReauthenticationTransaction();
    },
    [clearReauthenticationTransaction, resetAccountScope]
  );

  /**
   * A refresh/profile failure must clear this tab, but it must not erase an
   * account another tab has already published while this tab's StorageEvent is
   * still queued. Explicit local logout continues to clear its own marker.
   */
  const failClosedHydration = useCallback(() => {
    const mountedPrincipal = getPrincipalKey(useAuthStore.getState().user);
    const storagePrincipal = readAccountStoragePrincipal();
    if (storagePrincipal && storagePrincipal !== mountedPrincipal) {
      failClosedSession({ preserveSharedLocalStorage: true });
      return;
    }
    markAuthSessionChanged();
    logout();
  }, [failClosedSession, logout]);

  // Sync navigation store with React Router location (without triggering re-renders)
  useEffect(() => {
    applyLocationToNavigationStore(location.pathname, location.search);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleAuthRequired = (event: Event) => {
      event.preventDefault();
      if (!reauthTransactionRef.current) {
        reauthPrincipalRef.current = getPrincipalKey(useAuthStore.getState().user);
        reauthTransactionRef.current = beginCandidateAuthTransaction();
      }
      setReauthRequired(true);
    };
    const handleStorageFailure = (event: Event) => {
      const detail = (event as CustomEvent<PendingIntentStorageFailureDetail>).detail;
      if (detail?.prompt) {
        setStorageRecovery(detail);
        setStorageRecoveryError("");
      }
    };
    const handleAuthSessionCleared = () => {
      // Explicit logout/revocation is an account boundary even if the next
      // login happens without reloading this tab.
      failClosedSession({ clearStoragePrincipal: true });
    };
    const handleExternalAccountTransition = (event: StorageEvent) => {
      if (event.key !== ACCOUNT_STORAGE_PRINCIPAL_KEY) return;
      const incomingPrincipal = String(event.newValue || "").trim();
      const mountedPrincipal = getPrincipalKey(useAuthStore.getState().user);
      // Another tab refreshed/logged in as the same principal; the current
      // tab's account-scoped data remains valid. Any other change fails closed.
      if (incomingPrincipal && mountedPrincipal === incomingPrincipal) return;
      if (!mountedPrincipal && !useAuthStore.getState().token) return;
      failClosedSession({ preserveSharedLocalStorage: true });
    };
    window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
    window.addEventListener(PENDING_INTENT_STORAGE_FAILURE_EVENT, handleStorageFailure);
    window.addEventListener(AUTH_SESSION_CLEARED_EVENT, handleAuthSessionCleared);
    window.addEventListener("storage", handleExternalAccountTransition);
    return () => {
      window.removeEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
      window.removeEventListener(PENDING_INTENT_STORAGE_FAILURE_EVENT, handleStorageFailure);
      window.removeEventListener(AUTH_SESSION_CLEARED_EVENT, handleAuthSessionCleared);
      window.removeEventListener("storage", handleExternalAccountTransition);
      clearReauthenticationTransaction();
    };
  }, [clearReauthenticationTransaction, failClosedSession]);

  useEffect(() => {
    if (
      !isGoogleOAuthPopup ||
      !googleOAuthPopupFailureCode ||
      !window.opener ||
      oauthPopupNotificationSentRef.current
    ) {
      return;
    }
    notifyGoogleOAuthPopup({
      type: GOOGLE_OAUTH_POPUP_FAILURE_MESSAGE,
      error: googleOAuthPopupFailureCode,
    });
  }, [googleOAuthPopupFailureCode, isGoogleOAuthPopup, notifyGoogleOAuthPopup]);

  useEffect(() => {
    if (
      !isGoogleOAuthPopup ||
      googleOAuthPopupFailureCode ||
      isHydrating ||
      !token ||
      !user?.username ||
      !window.opener ||
      oauthPopupNotificationSentRef.current
    ) {
      return;
    }
    notifyGoogleOAuthPopup({ type: GOOGLE_OAUTH_POPUP_COMPLETE_MESSAGE });
  }, [
    googleOAuthPopupFailureCode,
    isGoogleOAuthPopup,
    isHydrating,
    notifyGoogleOAuthPopup,
    token,
    user?.username,
  ]);

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
  // The candidate-auth guard in api.ts serializes this refresh with any later
  // reauthentication attempt, so an old boot refresh cannot replace a newly
  // selected browser account.
  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      try {
        // A callback error has already been encoded into the popup URL. Do not
        // run an ordinary hydration that could mutate shared account state
        // before the popup tells its opener about that error.
        if (isGoogleOAuthPopup && googleOAuthPopupFailureCode) return;
        // A regular Google callback reloads the page, so an in-memory
        // interactive guard cannot survive it. This same-tab, one-use proof is
        // carried in the server-signed OAuth return route and still requires
        // the current storage owner to match the owner at click time.
        const googleOAuthTransition = consumeGoogleOAuthTransition(
          initialGoogleOAuthSearchRef.current
        );
        const freshToken = await getStrictFreshAuthToken();
        if (!isMounted) return;
        if (!freshToken) {
          if (
            isGoogleOAuthPopup &&
            notifyGoogleOAuthPopup({
              type: GOOGLE_OAUTH_POPUP_FAILURE_MESSAGE,
              error: "google_oauth_failed",
            })
          ) {
            return;
          }
          failClosedHydration();
          return;
        }

        // Resolve identity using the exact refreshed token. This avoids a
        // profile call reading an unrelated global token if the session changes
        // while hydration is in progress.
        const { response: ur, data: ud } = await fetchCurrentUser(freshToken);
        if (!isMounted) return;
        if (!ur.ok || !ud?.success || !ud.user) {
          if (
            isGoogleOAuthPopup &&
            notifyGoogleOAuthPopup({
              type: GOOGLE_OAUTH_POPUP_FAILURE_MESSAGE,
              error: "google_oauth_failed",
            })
          ) {
            return;
          }
          failClosedHydration();
          return;
        }

        let mergedUser = ud.user;
        try {
          const profileResult = await fetchProfile(freshToken);
          if (profileResult.response.ok && profileResult.data?.success && profileResult.data.user) {
            mergedUser = {
              ...ud.user,
              fullName: profileResult.data.user.fullName ?? ud.user.fullName ?? null,
            };
          }
        } catch {
          // Keep the authenticated base profile if enrichment is unavailable.
        }
        if (isMounted) {
          // The popup is a transport notification only. The preserved opener
          // owns candidate-token verification and the sole shared-storage
          // commit; a popup must never erase or republish account state first.
          if (
            isGoogleOAuthPopup &&
            notifyGoogleOAuthPopup({ type: GOOGLE_OAUTH_POPUP_COMPLETE_MESSAGE })
          ) {
            return;
          }
          const commit = commitAuthenticatedSession(
            { token: freshToken, user: mergedUser },
            {
              allowPreservedWork: true,
              source: "hydrate",
              googleOAuthStoragePrincipalAtStart:
                googleOAuthTransition?.storagePrincipal,
            }
          );
          if (!commit.committed) {
            if (googleOAuthTransition) {
              // The callback minted B's browser-wide refresh session. If C
              // claimed ownership after A began this OAuth handoff, revoke B
              // by its bearer without reading or clearing C's refresh cookie.
              void requestCandidateSessionLogout(freshToken);
            }
            failClosedSession({ preserveSharedLocalStorage: true });
          } else {
            if (commit.resetAccountScopedState) {
              const { pathname, search } = locationRef.current;
              applyLocationToNavigationStore(pathname, search);
            }
            if (googleOAuthTransition) {
              navigate(googleOAuthTransition.returnTo, { replace: true });
            }
          }
          }
        }
      } catch {
        if (
          isMounted &&
          isGoogleOAuthPopup &&
          notifyGoogleOAuthPopup({
            type: GOOGLE_OAUTH_POPUP_FAILURE_MESSAGE,
            error: "google_oauth_failed",
          })
        ) {
          return;
        }
        if (isMounted) {
          failClosedHydration();
        }
      } finally {
        if (isMounted) setHydrating(false);
      }
    }

    void hydrate();

    return () => { isMounted = false; };
  }, [
    commitAuthenticatedSession,
    failClosedHydration,
    failClosedSession,
    googleOAuthPopupFailureCode,
    isGoogleOAuthPopup,
    navigate,
    notifyGoogleOAuthPopup,
  ]);

  useEffect(() => {
    if (!token || !user?.username || isHydrating) {
      setLegalReconsentRequired(false);
      setLegalReconsentChecked(false);
      setLegalReconsentError("");
      return;
    }

    let isMounted = true;
    const tokenAtRequest = token;
    const principalAtRequest = getPrincipalKey(user);
    fetchLegalConsentStatus(true)
      .then(({ response, data }) => {
        if (
          !isMounted ||
          !response.ok ||
          useAuthStore.getState().token !== tokenAtRequest ||
          getPrincipalKey(useAuthStore.getState().user) !== principalAtRequest
        ) {
          return;
        }
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

  // The one post-auth anonymous-work claim, shared by credential login AND the
  // Google OAuth return. It keys off the token appearing, so every sign-in path
  // gets it — Google returns used to claim nothing at all.
  useAnonymousWorkClaim();

  const handleLegalReconsent = async () => {
    if (!legalReconsentChecked) {
      setLegalReconsentError(t("app.legal.errorConsentRequired"));
      return;
    }
    const tokenAtSubmit = token;
    const principalAtSubmit = getPrincipalKey(user);
    const isSubmittingForCurrentSession = () =>
      useAuthStore.getState().token === tokenAtSubmit &&
      getPrincipalKey(useAuthStore.getState().user) === principalAtSubmit;
    setLegalReconsentSubmitting(true);
    setLegalReconsentError("");
    try {
      const { response, data } = await submitLegalReconsent(legalPolicyVersion);
      if (!isSubmittingForCurrentSession()) {
        return;
      }
      if (!response.ok || !data?.success || data.requiresReconsent) {
        setLegalReconsentError(
          data?.error || t("app.legal.errorSaveFailed")
        );
        return;
      }
      setLegalReconsentRequired(false);
      setLegalReconsentChecked(false);
    } catch {
      if (isSubmittingForCurrentSession()) {
        setLegalReconsentError(t("app.legal.errorSaveFailed"));
      }
    } finally {
      if (isSubmittingForCurrentSession()) {
        setLegalReconsentSubmitting(false);
      }
    }
  };

  const handleAuthenticated = (session: AuthenticatedSession) => {
    const transaction = reauthTransactionRef.current;
    if (
      session.candidateAuthTransaction &&
      session.candidateAuthTransaction !== transaction
    ) {
      return;
    }

    try {
      const allowsPreservation = Boolean(
        transaction &&
          reauthPrincipalRef.current &&
          reauthPrincipalRef.current === getPrincipalKey(session.user)
      );
      const commit = commitAuthenticatedSession(session, {
        allowPreservedWork: allowsPreservation,
        source: "interactive",
        interactiveStoragePrincipalAtStart: interactiveStoragePrincipalRef.current,
      });
      if (!commit.committed) {
        if (commit.rejectedByNewerStorageOwner) {
          // This bearer is bound to B's candidate session and deliberately
          // omits the browser refresh cookie, so it cannot revoke C's session.
          void requestCandidateSessionLogout(session.token);
        }
        failClosedSession({ preserveSharedLocalStorage: true });
        return;
      }
      setReauthRequired(false);

      if (commit.resetAccountScopedState) {
        const { pathname, search } = locationRef.current;
        applyLocationToNavigationStore(pathname, search);
      }

      if (!commit.preservesMountedWork) {
        if (session.returnTo) {
          navigate(session.returnTo, { replace: true });
        } else if (commit.switchedMountedPrincipal) {
          navigate("/", { replace: true });
        }
      }
    } finally {
      reauthPrincipalRef.current = "";
      interactiveStoragePrincipalRef.current = undefined;
      if (reauthTransactionRef.current === transaction) clearReauthenticationTransaction();
    }
  };

  const handleCandidateAuthenticationFailed = () => {
    // Credentials/OAuth may already have replaced the shared refresh cookie by
    // the time candidate identity verification fails. Clear all A-owned state
    // immediately. If a sibling tab has already published a different
    // principal, this tab is stale instead: preserve that account's shared
    // storage and tell LoginScreen not to revoke its newer refresh cookie.
    const mountedPrincipal = getPrincipalKey(useAuthStore.getState().user);
    const reauthPrincipal = reauthPrincipalRef.current || mountedPrincipal;
    const storagePrincipal = readAccountStoragePrincipal();
    const hasNewerStorageOwner = Boolean(
      storagePrincipal && storagePrincipal !== reauthPrincipal
    );
    failClosedSession(
      hasNewerStorageOwner
        ? { preserveSharedLocalStorage: true }
        : { clearStoragePrincipal: true }
    );
    interactiveStoragePrincipalRef.current = undefined;
    navigate("/?auth=login", { replace: true });
    return !hasNewerStorageOwner;
  };

  const captureInteractiveStoragePrincipal = useCallback(() => {
    interactiveStoragePrincipalRef.current = readAccountStoragePrincipal();
  }, []);

  const beginFullPageGoogleOAuthTransition = useCallback((returnTo: string) => {
    return beginGoogleOAuthTransition(
      returnTo,
      interactiveStoragePrincipalRef.current ?? readAccountStoragePrincipal()
    );
  }, []);

  const renderStorageRecoveryDialog = () => {
    if (!storageRecovery) return null;
    return (
      <AlertDialogPrimitive.Root open>
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay className="fixed inset-0 z-[110] bg-black/60" />
          <AlertDialogPrimitive.Content
            asChild
            onOpenAutoFocus={(event) => {
              const activeElement = document.activeElement;
              storageRecoveryReturnFocusRef.current =
                activeElement instanceof HTMLElement && activeElement !== document.body
                  ? activeElement
                  : null;
              event.preventDefault();
              storageRecoveryActionRef.current?.focus();
            }}
            onCloseAutoFocus={(event) => {
              const returnFocus = storageRecoveryReturnFocusRef.current;
              storageRecoveryReturnFocusRef.current = null;
              if (returnFocus?.isConnected) {
                event.preventDefault();
                returnFocus.focus();
              }
            }}
          >
            <section className="fixed left-1/2 top-1/2 z-[110] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 border border-[var(--v2-accent-hairline)] bg-[var(--v2-bg)] p-4 shadow-2xl">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-[var(--v2-accent-text)]">
                {t("app.recovery.eyebrow")}
              </p>
              <AlertDialogPrimitive.Title asChild>
                <h2 className="mt-2 font-mono-ui text-lg text-[var(--v2-ink-1)]">
                  {t("app.recovery.title")}
                </h2>
              </AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description asChild>
                <p className="mt-2 text-sm text-[var(--v2-ink-2)]">
                  {t("app.recovery.body")}
                </p>
              </AlertDialogPrimitive.Description>
              <textarea
                ref={storageRecoveryTextRef}
                className="mt-4 min-h-28 w-full resize-y border border-[var(--v2-hairline-strong)] bg-[var(--v2-bg-sunken)] p-3 font-mono-ui text-xs text-[var(--v2-ink-1)]"
                readOnly
                value={storageRecovery.prompt}
                aria-label={t("app.recovery.workLabel")}
              />
              {storageRecoveryError ? (
                <p className="mt-2 text-xs text-[var(--v2-danger)]" role="alert">
                  {storageRecoveryError}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                {storageRecoveryError ? (
                  <>
                    <button
                      type="button"
                      className="v2-btn v2-btn--ghost v2-btn--sm"
                      onClick={() => {
                        storageRecoveryTextRef.current?.focus();
                        storageRecoveryTextRef.current?.select();
                      }}
                    >
                      {t("app.recovery.selectWork")}
                    </button>
                    <button
                      ref={storageRecoveryActionRef}
                      type="button"
                      className="v2-btn v2-btn--accent v2-btn--sm"
                      onClick={() => {
                        setStorageRecovery(null);
                        setStorageRecoveryError("");
                        navigate("/spaces");
                      }}
                    >
                      {t("app.recovery.openSpacesManually")}
                    </button>
                  </>
                ) : (
                  <button
                    ref={storageRecoveryActionRef}
                    type="button"
                    className="v2-btn v2-btn--accent v2-btn--sm"
                    onClick={() => {
                      const writeText = navigator.clipboard?.writeText;
                      if (!writeText) {
                        setStorageRecoveryError(t("app.recovery.copyFailed"));
                        return;
                      }
                      void writeText.call(navigator.clipboard, storageRecovery.prompt)
                        .then(() => {
                          setStorageRecovery(null);
                          setStorageRecoveryError("");
                          navigate("/spaces");
                        })
                        .catch(() => {
                          setStorageRecoveryError(t("app.recovery.copyFailed"));
                        });
                    }}
                  >
                    {t("app.recovery.copyAndOpenSpaces")}
                  </button>
                )}
              </div>
            </section>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>
    );
  };

  if (!token && !isHydrating && (hasExplicitAuthIntent || !isAnonymousAllowedRoute)) {
    return (
      <>
        <LoginScreen
          onAuthenticated={handleAuthenticated}
          onAuthenticationStarted={captureInteractiveStoragePrincipal}
          onGoogleOAuthStarted={beginFullPageGoogleOAuthTransition}
        />
        {renderStorageRecoveryDialog()}
      </>
    );
  }

  if (isHydrating) {
    return (
      <>
        <div className="zaki-v2-loading" data-v2-stage={appStage}>
          <div className="flex flex-col items-center gap-4">
            <div className="zaki-v2-loading__mark" aria-hidden="true" />
            <div className="zaki-v2-loading__label">
              {t("app.loadingSession")}
            </div>
          </div>
        </div>
        {renderStorageRecoveryDialog()}
      </>
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
        {renderStorageRecoveryDialog()}
      </>
    );
  }

  return (
    <Fragment key={authSurfaceEpoch}>
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
      {reauthRequired ? (
        <LoginScreen
          presentation="overlay"
          onAuthenticated={handleAuthenticated}
          onAuthenticationFailed={handleCandidateAuthenticationFailed}
          candidateAuthTransaction={reauthTransactionRef.current}
          onAuthenticationStarted={captureInteractiveStoragePrincipal}
        />
      ) : null}
      {renderStorageRecoveryDialog()}
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
                      markAuthSessionChanged();
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
    </Fragment>
  );
}
