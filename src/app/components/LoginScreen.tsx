import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { LogoArabicRed } from "./icons";
import {
  requestPublicSignup,
  requestLogin,
  requestPasswordReset,
  confirmPasswordReset,
  redeemAccessCode,
  fetchLegalConsentStatus,
  fetchCurrentUser,
  fetchProfile,
  buildGoogleOAuthStartUrl,
  fetchGoogleOAuthStatus,
  getFreshAuthToken,
  requestCandidateSessionLogout,
  beginCandidateAuthTransaction,
  completeCandidateAuthTransaction,
  isCurrentCandidateAuthTransaction,
  waitForCandidateAuthTransaction,
  GOOGLE_OAUTH_POPUP_COMPLETE_MESSAGE,
  GOOGLE_OAUTH_POPUP_FAILURE_MESSAGE,
  type CandidateAuthTransaction,
} from "@/lib/api";
import { clearPendingIntent, readPendingIntent } from "@/lib/pendingIntent";
import { sanitizeLocalReturnTo } from "@/lib/localReturnTo";
import { getConfiguredTurnstileSiteKey } from "@/lib/runtimeEnv";
import { useAuthStore } from "@/stores";
import { getInitialLegalPolicyVersion } from "@/lib/legalPolicy";
import { AUTH_COPY } from "./loginCopy";

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const GOOGLE_REAUTH_POPUP_POLL_MS = 250;
const GOOGLE_REAUTH_POPUP_CLOSE_GRACE_MS = 500;
const PRICING_INTENT_SOURCES = new Set([
  "website_pricing",
  "website_product_agent",
  "website_product_learn",
  "website_product_complete",
  "website_product_spaces",
  "website_nav_pricing",
  "website_footer_pricing",
  "pricing_split",
  "product_split",
  "upgrade",
  "settings",
  "chat_input",
  "billing_success",
  "access_expired",
]);

type AuthMode = "login" | "signup" | "reset-request" | "reset-confirm";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      reset?: (widgetId: string) => void;
      remove?: (widgetId: string) => void;
    };
  }
}

function getTurnstileSiteKey() {
  return String(getConfiguredTurnstileSiteKey() || "").trim();
}

export function hasExplicitPricingIntent(input: {
  pathname: string;
  searchParams: URLSearchParams;
}) {
  if (input.pathname !== "/pricing") return false;

  const { searchParams } = input;
  if (searchParams.get("plan")) return true;
  if (searchParams.get("interval")) return true;
  if (searchParams.get("intent")) return true;
  if (searchParams.get("autostart") === "1") return true;

  const source = String(searchParams.get("source") || "")
    .trim()
    .toLowerCase();
  return PRICING_INTENT_SOURCES.has(source);
}

function getSafeRelativeReturnTo(value: string | null) {
  return sanitizeLocalReturnTo(value, {
    fallback: "",
    stripSearchParams: ["auth"],
    allowRoot: false,
  });
}

function getPostLoginReturnTo(location: ReturnType<typeof useLocation>) {
  const searchParams = new URLSearchParams(location.search);
  const next = getSafeRelativeReturnTo(searchParams.get("next"));
  if (next) return next;
  const directProtectedReturnTo = getDirectProtectedReturnTo(location);
  if (directProtectedReturnTo) return directProtectedReturnTo;
  if (
    location.pathname === "/pricing" &&
    !hasExplicitPricingIntent({
      pathname: location.pathname,
      searchParams,
    })
  ) {
    return "/";
  }
  return "";
}

function getDirectProtectedReturnTo(location: ReturnType<typeof useLocation>) {
  const normalizedPath = String(location.pathname || "").replace(/\/+$/, "") || "/";
  if (
    normalizedPath !== "/agent" &&
    normalizedPath !== "/brain" &&
    normalizedPath !== "/settings"
  ) {
    return "";
  }
  return getSafeRelativeReturnTo(`${location.pathname}${location.search}${location.hash}`);
}

function isSameReturnRoute(left: string, right: string) {
  try {
    const leftPath = new URL(left, "https://zaki.local").pathname.replace(/\/+$/, "") || "/";
    const rightPath = new URL(right, "https://zaki.local").pathname.replace(/\/+$/, "") || "/";
    return leftPath === rightPath;
  } catch {
    return false;
  }
}

function getSafeAuthErrorMessage(message: unknown, fallback: string) {
  const text = String(message || "").trim();
  if (!text) return fallback;
  if (/\bNOVA[._-]?TYP\b|\bTYP\b|NOVA_TYP_|TLS certificate|not configured/i.test(text)) {
    return fallback;
  }
  return text;
}

type GoogleOAuthErrorCopy = {
  errors: {
    googleConsentRequired: string;
    googleAgeUnverifiable: string;
    googleUnderage: string;
    googleOAuthFailed: string;
    googleOAuthCancelled: string;
    googleOAuthIncomplete: string;
    googleOAuthUnavailable: string;
  };
};

function getGoogleOAuthFailureCopy(errorCode: unknown, copy: GoogleOAuthErrorCopy) {
  const oauthErrorCopy: Record<string, string> = {
    google_consent_required: copy.errors.googleConsentRequired,
    google_consent_stale: copy.errors.googleConsentRequired,
    age_verification_required: copy.errors.googleAgeUnverifiable,
    minimum_age: copy.errors.googleUnderage,
    google_oauth_failed: copy.errors.googleOAuthFailed,
    google_oauth_cancelled: copy.errors.googleOAuthCancelled,
    google_oauth_missing_code: copy.errors.googleOAuthIncomplete,
    google_oauth_unconfigured: copy.errors.googleOAuthUnavailable,
    google_oauth_start_failed: copy.errors.googleOAuthUnavailable,
  };
  return oauthErrorCopy[String(errorCode || "").trim()] ?? copy.errors.googleOAuthFailed;
}


export type AuthenticatedUser = {
  id?: number | string;
  username?: string;
  fullName?: string | null;
  role?: string;
};

export type AuthenticatedSession = {
  token: string;
  user: AuthenticatedUser;
  candidateAuthTransaction?: CandidateAuthTransaction;
  returnTo?: string;
};

type LoginScreenProps = {
  presentation?: "page" | "overlay";
  onAuthenticated?: (session: AuthenticatedSession) => void;
  /** Captures the browser storage owner when an interactive authentication starts. */
  onAuthenticationStarted?: () => void;
  /** Return false when another tab has already superseded this candidate cookie. */
  onAuthenticationFailed?: () => boolean | void;
  candidateAuthTransaction?: CandidateAuthTransaction | null;
};

export function LoginScreen({
  presentation = "page",
  onAuthenticated,
  onAuthenticationStarted,
  onAuthenticationFailed,
  candidateAuthTransaction = null,
}: LoginScreenProps = {}) {
  const { i18n } = useTranslation();
  const { setToken, setUser } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const locale = i18n.language?.toLowerCase().startsWith("ar") ? "ar" : "en";
  const isRtl = locale === "ar";
  const copy = useMemo(() => AUTH_COPY[locale], [locale]);
  const initialToken =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/reset")
      ? new URLSearchParams(window.location.search).get("token") || ""
      : "";
  const [resetToken, setResetToken] = useState(initialToken);
  const [mode, setMode] = useState<AuthMode>(initialToken ? "reset-confirm" : "login");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [loginAccessCode, setLoginAccessCode] = useState("");
  const [showLoginAccessCode, setShowLoginAccessCode] = useState(false);
  const [signupLegalConsent, setSignupLegalConsent] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [legalPolicyVersion, setLegalPolicyVersion] = useState(
    getInitialLegalPolicyVersion
  );
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false);
  const [candidateAuthReady, setCandidateAuthReady] = useState(
    presentation !== "overlay"
  );
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const reauthReturnFocusRef = useRef<HTMLElement | null>(null);
  const googleReauthPopupRef = useRef<Window | null>(null);
  const googleReauthPopupWatchRef = useRef<number | null>(null);
  const googleReauthPopupCloseGraceRef = useRef<number | null>(null);
  const googleReauthPopupAttemptRef = useRef<number | null>(null);
  const candidateAuthTransactionRef = useRef<CandidateAuthTransaction | null>(null);
  const ownsCandidateAuthTransactionRef = useRef(false);
  const reauthAttemptRef = useRef(0);
  const onAuthenticatedRef = useRef(onAuthenticated);
  const onAuthenticationStartedRef = useRef(onAuthenticationStarted);
  const onAuthenticationFailedRef = useRef(onAuthenticationFailed);
  const googleOAuthCopyRef = useRef<GoogleOAuthErrorCopy>(copy);
  onAuthenticatedRef.current = onAuthenticated;
  onAuthenticationStartedRef.current = onAuthenticationStarted;
  onAuthenticationFailedRef.current = onAuthenticationFailed;
  googleOAuthCopyRef.current = copy;
  const turnstileSiteKey = getTurnstileSiteKey();
  const postLoginReturnTo = getPostLoginReturnTo(location);

  const stopGoogleReauthPopupWatch = useCallback(() => {
    if (googleReauthPopupWatchRef.current !== null) {
      window.clearInterval(googleReauthPopupWatchRef.current);
      googleReauthPopupWatchRef.current = null;
    }
    if (googleReauthPopupCloseGraceRef.current !== null) {
      window.clearTimeout(googleReauthPopupCloseGraceRef.current);
      googleReauthPopupCloseGraceRef.current = null;
    }
  }, []);

  const watchGoogleReauthPopup = useCallback(
    (popup: Window, attempt: number) => {
      stopGoogleReauthPopupWatch();
      googleReauthPopupRef.current = popup;
      googleReauthPopupAttemptRef.current = attempt;
      googleReauthPopupWatchRef.current = window.setInterval(() => {
        if (
          googleReauthPopupRef.current !== popup ||
          googleReauthPopupAttemptRef.current !== attempt ||
          !popup.closed
        ) {
          return;
        }
        stopGoogleReauthPopupWatch();
        // The callback popup posts its result immediately before closing. A
        // browser can schedule this poll before that cross-window message, so
        // preserve the trusted popup identity briefly and let the message win.
        googleReauthPopupCloseGraceRef.current = window.setTimeout(() => {
          googleReauthPopupCloseGraceRef.current = null;
          if (
            googleReauthPopupRef.current !== popup ||
            googleReauthPopupAttemptRef.current !== attempt
          ) {
            return;
          }
          googleReauthPopupRef.current = null;
          googleReauthPopupAttemptRef.current = null;
          if (reauthAttemptRef.current !== attempt) return;
          setNotice("");
          setError(
            getGoogleOAuthFailureCopy("google_oauth_cancelled", googleOAuthCopyRef.current)
          );
        }, GOOGLE_REAUTH_POPUP_CLOSE_GRACE_MS);
      }, GOOGLE_REAUTH_POPUP_POLL_MS);
    },
    [stopGoogleReauthPopupWatch]
  );

  useEffect(() => {
    if (presentation !== "overlay") {
      setCandidateAuthReady(true);
      return;
    }

    const transaction = candidateAuthTransaction ?? beginCandidateAuthTransaction();
    const ownsTransaction = !candidateAuthTransaction;
    candidateAuthTransactionRef.current = transaction;
    ownsCandidateAuthTransactionRef.current = ownsTransaction;
    let active = true;
    setCandidateAuthReady(false);

    void waitForCandidateAuthTransaction(transaction).then((ready) => {
      if (
        active &&
        ready &&
        candidateAuthTransactionRef.current === transaction &&
        isCurrentCandidateAuthTransaction(transaction)
      ) {
        setCandidateAuthReady(true);
      }
    });

    return () => {
      active = false;
      reauthAttemptRef.current += 1;
      stopGoogleReauthPopupWatch();
      googleReauthPopupRef.current?.close();
      googleReauthPopupRef.current = null;
      googleReauthPopupAttemptRef.current = null;
      if (candidateAuthTransactionRef.current === transaction) {
        candidateAuthTransactionRef.current = null;
        if (ownsTransaction) {
          completeCandidateAuthTransaction(transaction);
        }
      }
    };
  }, [
    candidateAuthTransaction,
    presentation,
    stopGoogleReauthPopupWatch,
  ]);

  /**
   * A successful credential/OAuth exchange can rotate the browser-wide refresh
   * cookie before candidate profile verification finishes. If that verification
   * fails, keeping the old account mounted would let a later reload adopt the
   * replacement cookie over old account state. Revoke best-effort and hand the
   * enclosing App a fail-closed account-boundary signal instead.
   */
  const failCandidateAuthentication = useCallback(
    (transaction: CandidateAuthTransaction | null, candidateAccessToken: string | null = null) => {
      // A continuation can outlive its overlay after another tab has claimed
      // the browser session. It no longer owns the candidate cookie, so it
      // must be a no-op rather than revoking that newer account.
      if (
        presentation !== "overlay" ||
        !transaction ||
        !isCurrentCandidateAuthTransaction(transaction)
      ) {
        return;
      }
      reauthAttemptRef.current += 1;
      stopGoogleReauthPopupWatch();
      googleReauthPopupRef.current?.close();
      googleReauthPopupRef.current = null;
      googleReauthPopupAttemptRef.current = null;
      completeCandidateAuthTransaction(transaction);
      if (candidateAuthTransactionRef.current === transaction) {
        candidateAuthTransactionRef.current = null;
      }
      setCandidateAuthReady(false);
      const onAuthenticationFailed = onAuthenticationFailedRef.current;
      // The parent resets immediately and decides whether this candidate still
      // owns the shared cookie. Never revoke a session another tab published
      // while this tab's StorageEvent was still queued.
      const shouldRevokeCandidateSession = onAuthenticationFailed
        ? onAuthenticationFailed() !== false
        : true;
      if (shouldRevokeCandidateSession && candidateAccessToken) {
        void requestCandidateSessionLogout(candidateAccessToken);
      }
      if (!onAuthenticationFailed) {
        setToken(null);
        setUser(null);
      }
    },
    [presentation, setToken, setUser, stopGoogleReauthPopupWatch]
  );

  const setModeClean = useCallback(
    (nextMode: AuthMode) => {
      setMode(nextMode);
      setError("");
      setNotice("");
      setFieldErrors({});
      if (nextMode !== "login") {
        setLoginAccessCode("");
        setShowLoginAccessCode(false);
      }
      if (nextMode !== "signup") {
        setFullName("");
        setConfirmPassword("");
        setSignupLegalConsent(false);
        setTurnstileToken("");
        setTurnstileReady(false);
        if (turnstileWidgetIdRef.current && window.turnstile?.remove) {
          window.turnstile.remove(turnstileWidgetIdRef.current);
        } else if (turnstileWidgetIdRef.current && window.turnstile?.reset) {
          window.turnstile.reset(turnstileWidgetIdRef.current);
        }
        turnstileWidgetIdRef.current = null;
      }
      if (nextMode !== "reset-confirm") {
        setResetPassword("");
        setResetConfirm("");
        if (nextMode !== "reset-request") {
          setResetToken("");
          clearResetUrl();
        }
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const verified = String(url.searchParams.get("verified") || "").trim();
    const authMode = String(url.searchParams.get("auth") || "").trim();
    if (authMode === "signup") {
      setModeClean("signup");
    } else if (authMode === "login") {
      setModeClean("login");
    }

    if (verified) {
      setModeClean("login");
      if (verified === "success") {
        setNotice(copy.notices.verifiedSuccess);
        setError("");
      } else if (verified === "already_verified") {
        setNotice(copy.notices.verifiedAlready);
        setError("");
      } else if (verified === "expired") {
        setError(copy.errors.verificationExpired);
        setNotice("");
      } else if (verified === "invalid_token") {
        setError(copy.errors.verificationInvalid);
        setNotice("");
      } else if (verified === "missing_token") {
        setError(copy.errors.verificationMissing);
        setNotice("");
      }
    }

    // Google OAuth bounced the user back because signup was refused. Explain why
    // — a blocked signup must never look like a silent failure.
    //
    // WP-B10: #87 mapped the four SIGNUP-REFUSAL codes, but the backend also emits
    // `google_oauth_unconfigured`, `google_oauth_missing_code` and (now)
    // `google_oauth_cancelled` + `google_oauth_start_failed`. Those fell through the map,
    // so `message` was undefined and the user landed on a BLANK login form with no
    // explanation — which is precisely what "cancel Google → silent failure" looked like.
    // Every code is mapped now, and the `??` fallback guarantees an unknown code can
    // never be silent again.
    const oauthError = String(url.searchParams.get("error") || "").trim();
    if (oauthError) {
      // Never silent: an unrecognized code still gets friendly, actionable copy.
      setError(getGoogleOAuthFailureCopy(oauthError, copy));
      setNotice("");
    }

    if (authMode || verified || oauthError) {
      url.searchParams.delete("auth");
      url.searchParams.delete("verified");
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [copy, setModeClean]);

  useEffect(() => {
    let cancelled = false;
    fetchLegalConsentStatus(false)
      .then(({ data, response }) => {
        if (cancelled || !response.ok) return;
        const nextVersion = String(data?.policyVersion || "").trim();
        if (nextVersion) {
          setLegalPolicyVersion(nextVersion);
        }
      })
      .catch(() => {
        // Keep fallback version on network failures.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchGoogleOAuthStatus()
      .then(({ response, data }) => {
        if (cancelled || !response.ok) return;
        setGoogleOAuthEnabled(Boolean(data?.enabled));
      })
      .catch(() => {
        setGoogleOAuthEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (presentation !== "overlay") return;
    let active = true;
    const handleGooglePopupMessage = (event: MessageEvent) => {
      const messageType = event.data?.type;
      const attempt = googleReauthPopupAttemptRef.current;
      const transaction = candidateAuthTransactionRef.current;
      if (
        attempt === null ||
        !transaction ||
        event.origin !== window.location.origin ||
        event.source !== googleReauthPopupRef.current ||
        (messageType !== GOOGLE_OAUTH_POPUP_COMPLETE_MESSAGE &&
          messageType !== GOOGLE_OAUTH_POPUP_FAILURE_MESSAGE)
      ) {
        return;
      }
      const popup = googleReauthPopupRef.current;
      googleReauthPopupRef.current = null;
      googleReauthPopupAttemptRef.current = null;
      stopGoogleReauthPopupWatch();
      popup?.close();
      const isCurrentAttempt = () =>
        active &&
        reauthAttemptRef.current === attempt &&
        candidateAuthTransactionRef.current === transaction &&
        isCurrentCandidateAuthTransaction(transaction);

      if (messageType === GOOGLE_OAUTH_POPUP_FAILURE_MESSAGE) {
        if (isCurrentAttempt()) {
          setNotice("");
          setError(getGoogleOAuthFailureCopy(event.data?.error, googleOAuthCopyRef.current));
        }
        return;
      }
      setIsLoading(true);
      void (async () => {
        let candidateAccessToken: string | null = null;
        try {
          candidateAccessToken = await getFreshAuthToken({
            persist: false,
            candidateAuthTransaction: transaction,
          });
          if (!isCurrentAttempt()) {
            failCandidateAuthentication(transaction, candidateAccessToken);
            return;
          }
          if (!candidateAccessToken) {
            setError(getGoogleOAuthFailureCopy("google_oauth_failed", googleOAuthCopyRef.current));
            failCandidateAuthentication(transaction, candidateAccessToken);
            return;
          }
          const freshToken = candidateAccessToken;
          // The refresh cookie may now belong to a different Google account. Verify
          // the candidate token before it touches the mounted session.
          const { response, data } = await fetchCurrentUser(freshToken);
          if (!isCurrentAttempt()) {
            failCandidateAuthentication(transaction, candidateAccessToken);
            return;
          }
          if (!response.ok || !data?.success || !data.user) {
            setError(getGoogleOAuthFailureCopy("google_oauth_failed", googleOAuthCopyRef.current));
            failCandidateAuthentication(transaction, candidateAccessToken);
            return;
          }
          let mergedUser = data.user;
          try {
            const profileResult = await fetchProfile(freshToken);
            if (
              profileResult.response.ok &&
              profileResult.data?.success &&
              profileResult.data.user
            ) {
              mergedUser = {
                ...data.user,
                fullName:
                  profileResult.data.user.fullName ?? data.user.fullName ?? null,
              };
            }
          } catch {
            // The authenticated base profile is sufficient to resume the session.
          }
          if (!isCurrentAttempt()) {
            failCandidateAuthentication(transaction, candidateAccessToken);
            return;
          }
          const session: AuthenticatedSession = {
            token: freshToken,
            user: mergedUser,
            ...(ownsCandidateAuthTransactionRef.current
              ? {}
              : { candidateAuthTransaction: transaction }),
          };
          if (onAuthenticatedRef.current) {
            if (ownsCandidateAuthTransactionRef.current) {
              completeCandidateAuthTransaction(transaction);
              candidateAuthTransactionRef.current = null;
            }
            onAuthenticatedRef.current(session);
          } else {
            completeCandidateAuthTransaction(transaction);
            candidateAuthTransactionRef.current = null;
            setToken(session.token);
            setUser(session.user);
          }
        } catch {
          if (isCurrentAttempt()) {
            setError(getGoogleOAuthFailureCopy("google_oauth_failed", googleOAuthCopyRef.current));
          }
          failCandidateAuthentication(transaction, candidateAccessToken);
        } finally {
          if (active && reauthAttemptRef.current === attempt) {
            setIsLoading(false);
          }
        }
      })();
    };
    window.addEventListener("message", handleGooglePopupMessage);
    return () => {
      active = false;
      window.removeEventListener("message", handleGooglePopupMessage);
      stopGoogleReauthPopupWatch();
      googleReauthPopupRef.current?.close();
      googleReauthPopupRef.current = null;
      googleReauthPopupAttemptRef.current = null;
    };
  }, [
    failCandidateAuthentication,
    presentation,
    setToken,
    setUser,
    stopGoogleReauthPopupWatch,
  ]);

  useEffect(() => {
    if (mode !== "signup" || !turnstileSiteKey) {
      setTurnstileReady(false);
      return;
    }

    let cancelled = false;
    const renderWidget = () => {
      if (
        cancelled ||
        !turnstileContainerRef.current ||
        !window.turnstile ||
        turnstileWidgetIdRef.current
      ) {
        return;
      }
      turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: turnstileSiteKey,
        callback: (token) => {
          setTurnstileToken(String(token || ""));
          setTurnstileReady(true);
        },
        "expired-callback": () => {
          setTurnstileToken("");
          setTurnstileReady(false);
        },
        "error-callback": () => {
          setTurnstileToken("");
          setTurnstileReady(false);
        },
      });
    };

    if (window.turnstile) {
      renderWidget();
      return () => {
        cancelled = true;
        if (turnstileWidgetIdRef.current && window.turnstile?.remove) {
          window.turnstile.remove(turnstileWidgetIdRef.current);
          turnstileWidgetIdRef.current = null;
        }
      };
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${TURNSTILE_SCRIPT_SRC}"]`
    );
    const script = existing || document.createElement("script");
    if (!existing) {
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", renderWidget);
    return () => {
      cancelled = true;
      script.removeEventListener("load", renderWidget);
      if (turnstileWidgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
        turnstileWidgetIdRef.current = null;
      }
    };
  }, [mode, turnstileSiteKey]);

  const clearResetUrl = () => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    window.history.replaceState({}, "", url.pathname + url.search);
  };

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  useEffect(() => {
    if (loginAccessCode.trim()) {
      setShowLoginAccessCode(true);
    }
  }, [loginAccessCode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setFieldErrors({});
    setIsLoading(true);

    const transaction =
      presentation === "overlay" ? candidateAuthTransactionRef.current : null;
    if (
      presentation === "overlay" &&
      (!candidateAuthReady ||
        !transaction ||
        !isCurrentCandidateAuthTransaction(transaction))
    ) {
      setIsLoading(false);
      return;
    }

    if (mode === "login" || mode === "signup") {
      onAuthenticationStartedRef.current?.();
    }

    const reauthAttempt =
      presentation === "overlay" ? reauthAttemptRef.current + 1 : null;
    if (reauthAttempt !== null) {
      reauthAttemptRef.current = reauthAttempt;
      stopGoogleReauthPopupWatch();
      googleReauthPopupRef.current?.close();
      googleReauthPopupRef.current = null;
      googleReauthPopupAttemptRef.current = null;
    }
    const isCurrentReauthAttempt = () =>
      presentation !== "overlay" ||
      (reauthAttempt !== null &&
        reauthAttemptRef.current === reauthAttempt &&
        candidateAuthTransactionRef.current === transaction &&
        isCurrentCandidateAuthTransaction(transaction));
    let candidateSessionMayHaveChanged = false;
    let candidateAccessToken: string | null = null;

    try {
      if (mode === "reset-request") {
        if (!email.trim()) {
          setFieldErrors({ email: copy.errors.emailRequired });
          setError(copy.errors.emailRequired);
          return;
        }
        const { data } = await requestPasswordReset(email.trim());
        setNotice(
          data?.message ||
            copy.notices.resetSent
        );
        return;
      }

      if (mode === "reset-confirm") {
        if (!resetToken) {
          setError(copy.errors.resetTokenMissing);
          return;
        }
        if (!resetPassword) {
          setFieldErrors({ resetPassword: copy.errors.passwordRequired });
          setError(copy.errors.passwordRequired);
          return;
        }
        if (resetPassword !== resetConfirm) {
          setFieldErrors({ resetConfirm: copy.errors.passwordsMismatch });
          setError(copy.errors.passwordsMismatch);
          return;
        }

        const { data, response } = await confirmPasswordReset({
          token: resetToken,
          password: resetPassword,
        });
        if (!response.ok || !data?.success) {
          setError(copy.errors.resetFailed);
          return;
        }
        setNotice(data?.message || copy.notices.passwordUpdated);
        setResetPassword("");
        setResetConfirm("");
        setResetToken("");
        clearResetUrl();
        setModeClean("login");
        return;
      }

      if (mode === "signup") {
        if (!fullName.trim()) {
          setFieldErrors({ fullName: copy.errors.fullNameRequired });
          setError(copy.errors.fullNameRequired);
          return;
        }
        if (!email.trim()) {
          setFieldErrors({ email: copy.errors.emailRequired });
          setError(copy.errors.emailRequired);
          return;
        }
        if (!password) {
          setFieldErrors({ password: copy.errors.passwordRequired });
          setError(copy.errors.passwordRequired);
          return;
        }
        if (password !== confirmPassword) {
          setFieldErrors({ confirmPassword: copy.errors.passwordsMismatch });
          setError(copy.errors.passwordsMismatch);
          return;
        }
        if (!signupLegalConsent) {
          setError(copy.errors.consentRequired);
          return;
        }
        if (turnstileSiteKey && !turnstileToken) {
          setError(copy.errors.captchaRequired);
          return;
        }

        // WP-M: no dateOfBirth. `legalConsentAccepted` is the ToS attestation that
        // now carries the minimum-age representation — it stays mandatory.
        const { data } = await requestPublicSignup({
          email: email.trim(),
          password,
          name: fullName.trim(),
          legalConsentAccepted: true,
          legalPolicyVersion,
          ...(postLoginReturnTo ? { returnTo: postLoginReturnTo } : {}),
          ...(turnstileSiteKey ? { turnstileToken: turnstileToken || null } : {}),
        });
        if (!data?.success) {
          setError(data?.error || copy.errors.signupFailed);
          return;
        }

        setNotice(
          data?.verificationLink
            ? `${copy.notices.verificationLink} ${data.verificationLink}`
            : data?.message || copy.notices.verifyEmail
        );
        setModeClean("login");
        return;
      }

      if (!email.trim()) {
        setFieldErrors({ email: copy.errors.emailRequired });
        setError(copy.errors.emailRequired);
        return;
      }
      if (!password) {
        setFieldErrors({ password: copy.errors.passwordRequired });
        setError(copy.errors.passwordRequired);
        return;
      }

      const { data, response } = await requestLogin({
        username: email.trim() || undefined,
        password,
      });
      candidateAccessToken = data?.token ?? null;
      candidateSessionMayHaveChanged = Boolean(
        presentation === "overlay" && response.ok && data?.valid && candidateAccessToken
      );
      if (!isCurrentReauthAttempt()) {
        if (candidateSessionMayHaveChanged) {
          failCandidateAuthentication(transaction, candidateAccessToken);
        }
        return;
      }

      if (!response.ok || !data?.valid || !data?.token) {
        const fallback =
          response.status >= 500
            ? copy.errors.loginServiceDown
            : copy.errors.loginFailed;
        setError(getSafeAuthErrorMessage(data?.message || data?.error, fallback));
        return;
      }

      const normalizedCode = loginAccessCode.trim();
      if (normalizedCode) {
        const { response: codeResponse, data: codeData } = await redeemAccessCode(
          normalizedCode,
          data.token
        );
        if (!isCurrentReauthAttempt()) {
          failCandidateAuthentication(transaction, candidateAccessToken);
          return;
        }
        if (!codeResponse.ok || !codeData?.success) {
          setError(codeData?.error || copy.errors.activationCodeInvalid);
          failCandidateAuthentication(transaction, candidateAccessToken);
          return;
        }
      }

      let session: AuthenticatedSession;
      try {
        // The login response proves credentials, but it does not prove which principal
        // the new token belongs to. Resolve that identity using the candidate token before
        // mutating the mounted session, otherwise an expired account can be resumed as a
        // different account when the profile lookup fails.
        const { response: ur, data: ud } = await fetchCurrentUser(data.token);
        if (!isCurrentReauthAttempt()) {
          failCandidateAuthentication(transaction, candidateAccessToken);
          return;
        }
        if (!ur.ok || !ud?.success || !ud.user) {
          setError(copy.errors.genericLoginFailed);
          failCandidateAuthentication(transaction, candidateAccessToken);
          return;
        }
        let mergedUser = ud.user;
        try {
          const profileResult = await fetchProfile(data.token);
          if (profileResult.response.ok && profileResult.data?.success && profileResult.data.user) {
            mergedUser = { ...ud.user, fullName: profileResult.data.user.fullName ?? ud.user.fullName ?? null };
          }
        } catch {
          // The authenticated base profile is sufficient to resume the session.
        }
        if (!isCurrentReauthAttempt()) {
          failCandidateAuthentication(transaction, candidateAccessToken);
          return;
        }
        session = {
          token: data.token,
          user: mergedUser,
          ...(transaction && !ownsCandidateAuthTransactionRef.current
            ? { candidateAuthTransaction: transaction }
            : {}),
        };
      } catch {
        if (isCurrentReauthAttempt()) {
          setError(copy.errors.genericLoginFailed);
        }
        if (candidateSessionMayHaveChanged) {
          failCandidateAuthentication(transaction, candidateAccessToken);
        }
        return;
      }
      setLoginAccessCode("");
      setShowLoginAccessCode(false);
      const returnTo = getPostLoginReturnTo(location);
      if (presentation !== "overlay" && returnTo) {
        session.returnTo = returnTo;
      }
      const explicitNext = getSafeRelativeReturnTo(
        new URLSearchParams(location.search).get("next")
      );
      const pendingIntent = readPendingIntent();
      const pendingReturnTo = getSafeRelativeReturnTo(pendingIntent?.returnTo ?? null);
      const directProtectedReturnTo = getDirectProtectedReturnTo(location);

      // The anonymous-work claim does NOT run here any more. It runs in App's
      // post-auth effect, which EVERY sign-in path reaches — credential login
      // and the Google OAuth return, which never passes through this component
      // and so never had its work claimed at all. That effect owns the claim,
      // the ledger, and the redirect to the imported thread.
      //
      // What matters here is that we no longer destroy the pending intent on the
      // way out. When this login is honoring the intent, it must SURVIVE the
      // navigation: it is the instruction to replay the visitor's prompt, and
      // clearing it here meant ChatArea's replay always found an empty slot —
      // so the visitor landed in a thread with neither an import nor a replay.
      // Whoever consumes it clears it: App, when an import made the replay
      // redundant; ChatArea, when it actually replays.
      //
      // An intent this login is NOT honoring is stale — it would ambush the user
      // with an unrelated prompt later — so that one still gets dropped.
      const honorsPendingIntent = Boolean(
        pendingReturnTo &&
          ((explicitNext && explicitNext === pendingReturnTo) ||
            (directProtectedReturnTo &&
              isSameReturnRoute(directProtectedReturnTo, pendingReturnTo)))
      );
      if (pendingReturnTo && !honorsPendingIntent) {
        clearPendingIntent();
      }

      if (!isCurrentReauthAttempt()) {
        if (candidateSessionMayHaveChanged) {
          failCandidateAuthentication(transaction, candidateAccessToken);
        }
        return;
      }
      if (onAuthenticatedRef.current) {
        if (transaction && ownsCandidateAuthTransactionRef.current) {
          completeCandidateAuthTransaction(transaction);
          candidateAuthTransactionRef.current = null;
        }
        onAuthenticatedRef.current(session);
      } else if (returnTo) {
        if (transaction) {
          completeCandidateAuthTransaction(transaction);
          candidateAuthTransactionRef.current = null;
        }
        setToken(session.token);
        setUser(session.user);
        navigate(returnTo, { replace: true });
      } else {
        if (transaction) {
          completeCandidateAuthTransaction(transaction);
          candidateAuthTransactionRef.current = null;
        }
        setToken(session.token);
        setUser(session.user);
      }
    } catch (err) {
      if (isCurrentReauthAttempt()) {
        setError(
          mode === "signup"
            ? copy.errors.genericSignupFailed
            : mode === "reset-request" || mode === "reset-confirm"
              ? copy.errors.genericResetFailed
              : copy.errors.genericLoginFailed
        );
      }
      if (candidateSessionMayHaveChanged) {
        failCandidateAuthentication(transaction, candidateAccessToken);
      }
    } finally {
      if (presentation !== "overlay" || reauthAttemptRef.current === reauthAttempt) {
        setIsLoading(false);
      }
    }
  };

  const modeCopyKey: "login" | "signup" | "resetRequest" | "resetConfirm" =
    mode === "reset-request"
      ? "resetRequest"
      : mode === "reset-confirm"
        ? "resetConfirm"
        : mode;
  const modeTitle = copy.title[modeCopyKey];
  const modeSubtitle = copy.subtitles[modeCopyKey];
  const modeEyebrow = copy.eyebrow[modeCopyKey];
  const submitDisabled =
    isLoading ||
    (presentation === "overlay" && !candidateAuthReady) ||
    ((mode === "login" || mode === "signup" || mode === "reset-request") &&
      email.trim().length === 0) ||
    ((mode === "login" || mode === "signup") && password.length === 0) ||
    (mode === "signup" &&
      (!fullName.trim() ||
        confirmPassword.length === 0 ||
        !signupLegalConsent ||
        (Boolean(turnstileSiteKey) && !turnstileReady))) ||
    (mode === "reset-confirm" &&
      (resetPassword.length === 0 || resetConfirm.length === 0));
  const submitLabel = isLoading
    ? mode === "signup"
      ? copy.actions.creatingAccount
      : mode === "reset-request"
        ? copy.actions.sendingResetLink
        : mode === "reset-confirm"
          ? copy.actions.updatingPassword
          : copy.actions.signingIn
    : mode === "signup"
      ? copy.actions.createAccount
      : mode === "reset-request"
        ? copy.actions.sendResetLink
        : mode === "reset-confirm"
          ? copy.actions.updatePassword
          : copy.actions.signIn;

  const content = (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      lang={locale}
      className={`zaki-app-v2 zaki-auth-v2 ${
        presentation === "overlay" ? "zaki-auth-v2--overlay" : ""
      }`}
      role={presentation === "overlay" ? "dialog" : undefined}
      aria-modal={presentation === "overlay" ? true : undefined}
      aria-label={presentation === "overlay" ? copy.reauth.title : undefined}
    >
      <header className="zaki-auth-v2__topbar">
        <div className="zaki-auth-v2__brand">
          <LogoArabicRed className="zaki-auth-v2__logo" />
          <div>
            <strong>{copy.chrome.product}</strong>
            <span>{copy.chrome.descriptor}</span>
          </div>
        </div>
      </header>

      <main className="zaki-auth-v2__frame">
        {presentation === "overlay" ? (
          <div className="zaki-auth-v2__reauth" role="status">
            <DialogPrimitive.Title asChild>
              <strong>{copy.reauth.title}</strong>
            </DialogPrimitive.Title>
            <DialogPrimitive.Description asChild>
              <span>{copy.reauth.detail}</span>
            </DialogPrimitive.Description>
          </div>
        ) : null}
        <section className="zaki-auth-v2__panel" aria-labelledby="zaki-auth-title">
          <div className="zaki-auth-v2__panel-head">
            <span className="zaki-auth-v2__eyebrow">{modeEyebrow}</span>
            <h1 id="zaki-auth-title">{modeTitle}</h1>
            <p>{modeSubtitle}</p>
          </div>

          {(mode === "login" || mode === "signup") && googleOAuthEnabled ? (
            <div className="zaki-auth-v2__oauth-wrap">
              <button
                type="button"
                className="zaki-auth-v2__oauth"
                disabled={isLoading || (presentation === "overlay" && !candidateAuthReady)}
                onClick={() => {
                  if (mode === "signup" && !signupLegalConsent) {
                    setError(copy.errors.consentRequired);
                    return;
                  }
                  if (presentation === "overlay") {
                    const transaction = candidateAuthTransactionRef.current;
                    if (
                      !candidateAuthReady ||
                      !transaction ||
                      !isCurrentCandidateAuthTransaction(transaction)
                    ) {
                      return;
                    }
                  }
                  onAuthenticationStartedRef.current?.();
                  // Consent travels on BOTH entry points. "Continue with Google"
                  // from the login screen can still create a brand-new account,
                  // and that account must never exist without a consent record.
                  // The clickwrap notice below is the attestation in login mode.
                  const oauthUrl = buildGoogleOAuthStartUrl(
                    presentation === "overlay"
                      ? "/?oauthPopup=google"
                      : postLoginReturnTo || "/",
                    {
                      legalConsentAccepted: true,
                      legalPolicyVersion,
                    }
                  );
                  if (presentation === "overlay") {
                    const attempt = reauthAttemptRef.current + 1;
                    reauthAttemptRef.current = attempt;
                    stopGoogleReauthPopupWatch();
                    googleReauthPopupRef.current?.close();
                    googleReauthPopupRef.current = null;
                    googleReauthPopupAttemptRef.current = null;
                    const popup = window.open(
                      oauthUrl,
                      "zaki-google-reauth",
                      "popup=yes,width=520,height=720,resizable=yes,scrollbars=yes"
                    );
                    if (!popup) {
                      setError(copy.errors.googlePopupBlocked);
                      return;
                    }
                    watchGoogleReauthPopup(popup, attempt);
                    popup.focus();
                    return;
                  }
                  window.location.href = oauthUrl;
                }}
              >
                <span aria-hidden>G</span>
                {copy.actions.continueWithGoogle}
              </button>
              <p className="zaki-auth-v2__oauth-legal">
                {copy.consent.oauthPrefix}{" "}
                <a
                  href={isRtl ? "https://chatzaki.com/ar/terms?from=google" : "https://chatzaki.com/terms?from=google"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.consent.terms}
                </a>
                {isRtl ? "، " : ", "}
                <a
                  href={isRtl ? "https://chatzaki.com/ar/privacy?from=google" : "https://chatzaki.com/privacy?from=google"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.consent.privacy}
                </a>
                {isRtl ? "، و" : ", and "}
                <a
                  href={isRtl ? "https://chatzaki.com/ar/compliance?from=google" : "https://chatzaki.com/compliance?from=google"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.consent.compliance}
                </a>
                .
              </p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="zaki-auth-v2__form">
          {mode === "reset-confirm" && (
            <div className="zaki-auth-v2__callout">
              {copy.resetHint}
            </div>
          )}
          {mode === "signup" && (
            <label className="zaki-auth-v2__field">
              <span>{copy.fields.fullName}</span>
              <input
                type="text"
                value={fullName}
                onChange={(event) => {
                  setFullName(event.target.value);
                  clearFieldError("fullName");
                }}
                placeholder={copy.placeholders.fullName}
                id="signup-name"
                name="name"
                autoComplete="name"
                aria-invalid={Boolean(fieldErrors.fullName)}
                required
              />
              {fieldErrors.fullName ? (
                <em className="zaki-auth-v2__field-error">{fieldErrors.fullName}</em>
              ) : null}
            </label>
          )}
          {/* WP-M: the date-of-birth field lived here. It is gone — the age gate is
              off, so the birthdate was collected and never enforced, and an unused
              sensitive field is a GDPR liability rather than a control. Minimum age
              is now attested through the Terms; see the consent clickwrap below. */}
          {(mode === "login" ||
            mode === "signup" ||
            mode === "reset-request") && (
            <label className="zaki-auth-v2__field">
              <span>{copy.fields.email}</span>
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  clearFieldError("email");
                }}
                placeholder={copy.placeholders.email}
                id={mode === "signup" ? "signup-email" : "login-email"}
                name={mode === "signup" ? "email" : "username"}
                autoComplete={mode === "login" ? "username" : "email"}
                aria-invalid={Boolean(fieldErrors.email)}
                required
              />
              {fieldErrors.email ? (
                <em className="zaki-auth-v2__field-error">{fieldErrors.email}</em>
              ) : null}
            </label>
          )}

          {(mode === "login" || mode === "signup") && (
            <label className="zaki-auth-v2__field">
              <span>{copy.fields.password}</span>
              <div className="zaki-auth-v2__password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    clearFieldError("password");
                  }}
                  placeholder={copy.placeholders.password}
                  id={mode === "signup" ? "signup-password" : "login-password"}
                  name={mode === "signup" ? "new-password" : "current-password"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  aria-invalid={Boolean(fieldErrors.password)}
                  required
                />
                <button
                  type="button"
                  className="zaki-auth-v2__password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? copy.aria.hidePassword : copy.aria.showPassword}
                >
                  {showPassword ? (
                    <EyeOff aria-hidden className="zaki-auth-v2__password-icon" />
                  ) : (
                    <Eye aria-hidden className="zaki-auth-v2__password-icon" />
                  )}
                </button>
              </div>
              {fieldErrors.password ? (
                <em className="zaki-auth-v2__field-error">{fieldErrors.password}</em>
              ) : null}
            </label>
          )}

          {mode === "signup" && (
            <label className="zaki-auth-v2__field">
              <span>{copy.fields.confirmPassword}</span>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  clearFieldError("confirmPassword");
                }}
                placeholder={copy.placeholders.confirmPassword}
                id="signup-password-confirm"
                name="new-password-confirm"
                autoComplete="new-password"
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                required
              />
              {fieldErrors.confirmPassword ? (
                <em className="zaki-auth-v2__field-error">{fieldErrors.confirmPassword}</em>
              ) : null}
            </label>
          )}

          {mode === "signup" && (
            <label className="zaki-auth-v2__consent">
              <input
                type="checkbox"
                checked={signupLegalConsent}
                onChange={(event) => setSignupLegalConsent(event.target.checked)}
                required
              />
              <span>
                {copy.consent.prefix}{" "}
                <a
                  href={isRtl ? "https://chatzaki.com/ar/terms?from=signup" : "https://chatzaki.com/terms?from=signup"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.consent.terms}
                </a>
                {isRtl ? "، " : ", "}
                <a
                  href={isRtl ? "https://chatzaki.com/ar/privacy?from=signup" : "https://chatzaki.com/privacy?from=signup"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.consent.privacy}
                </a>
                {isRtl ? "، و" : ", and "}
                <a
                  href={isRtl ? "https://chatzaki.com/ar/compliance?from=signup" : "https://chatzaki.com/compliance?from=signup"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.consent.compliance}
                </a>
                .
              </span>
            </label>
          )}

          {/* The minimum-age representation. WP-M removed the DOB field, not the age
              rule: users now attest to the minimum age in our Terms instead of
              handing us a birthdate we never enforced. */}
          {mode === "signup" && (
            <p className="zaki-auth-v2__age-attestation" data-testid="signup-age-attestation">
              {copy.consent.ageAttestation}
            </p>
          )}

          {mode === "signup" && turnstileSiteKey ? (
            <div className="zaki-auth-v2__turnstile" ref={turnstileContainerRef} />
          ) : null}

          {mode === "login" ? (
            <div className="zaki-auth-v2__inline-actions">
              <button
                type="button"
                className="zaki-auth-v2__link-button"
                onClick={() => setShowLoginAccessCode((prev) => !prev)}
              >
                {showLoginAccessCode ? copy.actions.hideActivationCode : copy.actions.showActivationCode}
              </button>
              <button
                type="button"
                className="zaki-auth-v2__link-button"
                onClick={() => {
                  setModeClean("reset-request");
                }}
              >
                {copy.actions.forgotPassword}
              </button>
            </div>
          ) : null}

          {mode === "login" && showLoginAccessCode ? (
            <label className="zaki-auth-v2__field">
              <span>{copy.fields.accessCode}</span>
              <input
                type="text"
                value={loginAccessCode}
                onChange={(event) => setLoginAccessCode(event.target.value)}
                placeholder={copy.placeholders.accessCode}
                id="login-access-code"
                name="access-code"
                autoComplete="off"
              />
            </label>
          ) : null}

          {mode === "reset-confirm" && (
            <>
              <label className="zaki-auth-v2__field">
                <span>{copy.fields.newPassword}</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={resetPassword}
                  onChange={(event) => {
                    setResetPassword(event.target.value);
                    clearFieldError("resetPassword");
                  }}
                  placeholder={copy.placeholders.newPassword}
                  id="reset-password"
                  name="new-password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.resetPassword)}
                  required
                />
                {fieldErrors.resetPassword ? (
                  <em className="zaki-auth-v2__field-error">{fieldErrors.resetPassword}</em>
                ) : null}
              </label>
              <label className="zaki-auth-v2__field">
                <span>{copy.fields.confirmNewPassword}</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={resetConfirm}
                  onChange={(event) => {
                    setResetConfirm(event.target.value);
                    clearFieldError("resetConfirm");
                  }}
                  placeholder={copy.placeholders.confirmNewPassword}
                  id="reset-password-confirm"
                  name="new-password-confirm"
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.resetConfirm)}
                  required
                />
                {fieldErrors.resetConfirm ? (
                  <em className="zaki-auth-v2__field-error">{fieldErrors.resetConfirm}</em>
                ) : null}
              </label>
            </>
          )}

          {notice && (
            <div className="zaki-auth-v2__notice zaki-auth-v2__notice--success" role="status">
              {notice}
            </div>
          )}
          {error && Object.keys(fieldErrors).length === 0 && (
            <div className="zaki-auth-v2__notice zaki-auth-v2__notice--error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitDisabled}
            className="zaki-auth-v2__submit"
          >
            {submitLabel}
          </button>
        </form>

          <button
            type="button"
            className="zaki-auth-v2__switch"
            onClick={() => {
              if (mode === "signup") {
                setModeClean("login");
              } else if (mode === "login") {
                setModeClean("signup");
              } else {
                setModeClean("login");
              }
            }}
          >
            {mode === "signup"
              ? copy.actions.haveAccount
              : mode === "login"
                ? copy.actions.newHere
                : copy.actions.backToSignIn}
          </button>
        </section>
      </main>
    </div>
  );

  if (presentation === "overlay") {
    return (
      <DialogPrimitive.Root open>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Content
            asChild
            onOpenAutoFocus={() => {
              const activeElement = document.activeElement;
              reauthReturnFocusRef.current =
                activeElement instanceof HTMLElement && activeElement !== document.body
                  ? activeElement
                  : null;
            }}
            onCloseAutoFocus={(event) => {
              const returnFocus = reauthReturnFocusRef.current;
              reauthReturnFocusRef.current = null;
              if (returnFocus?.isConnected) {
                event.preventDefault();
                returnFocus.focus();
              }
            }}
            onEscapeKeyDown={(event) => event.preventDefault()}
            onPointerDownOutside={(event) => event.preventDefault()}
          >
            {content}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }

  return content;
}
