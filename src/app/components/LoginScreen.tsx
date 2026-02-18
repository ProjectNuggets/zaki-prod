import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { LogoArabicOrange } from "./icons";
import {
  requestPublicSignup,
  requestLogin,
  requestPasswordReset,
  confirmPasswordReset,
  redeemAccessCode,
  fetchLegalConsentStatus,
} from "@/lib/api";
import { useAuthStore } from "@/stores";

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

export function LoginScreen() {
  const { setToken } = useAuthStore();
  const initialToken =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/reset")
      ? new URLSearchParams(window.location.search).get("token") || ""
      : "";
  const [resetToken, setResetToken] = useState(initialToken);
  const [mode, setMode] = useState<"login" | "signup" | "reset-request" | "reset-confirm">(
    initialToken ? "reset-confirm" : "login"
  );
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [loginAccessCode, setLoginAccessCode] = useState("");
  const [signupLegalConsent, setSignupLegalConsent] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [legalPolicyVersion, setLegalPolicyVersion] = useState(
    getInitialLegalPolicyVersion
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const verified = String(url.searchParams.get("verified") || "").trim();
    const authMode = String(url.searchParams.get("auth") || "").trim();
    if (!verified && authMode !== "login") {
      return;
    }

    setMode("login");
    if (verified === "success") {
      setNotice("Email verified successfully. You can sign in now.");
      setError("");
    } else if (verified === "already_verified") {
      setNotice("Email already verified. Please sign in.");
      setError("");
    } else if (verified === "expired") {
      setError("Verification link expired. Please sign up again.");
      setNotice("");
    } else if (verified === "invalid_token") {
      setError("Verification link is invalid. Please sign up again.");
      setNotice("");
    } else if (verified === "missing_token") {
      setError("Verification token is missing. Please sign up again.");
      setNotice("");
    }

    url.searchParams.delete("auth");
    url.searchParams.delete("verified");
    window.history.replaceState({}, "", url.pathname + url.search);
  }, []);

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

  const clearResetUrl = () => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    window.history.replaceState({}, "", url.pathname + url.search);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsLoading(true);

    try {
      if (mode === "reset-request") {
        if (!email.trim()) {
          setError("Email is required.");
          return;
        }
        const { data } = await requestPasswordReset(email.trim());
        setNotice(
          data?.message ||
            "If the account exists, a reset link has been sent."
        );
        return;
      }

      if (mode === "reset-confirm") {
        if (!resetToken) {
          setError("Reset token is missing.");
          return;
        }
        if (!resetPassword) {
          setError("Password is required.");
          return;
        }
        if (resetPassword !== resetConfirm) {
          setError("Passwords do not match.");
          return;
        }

        const { data, response } = await confirmPasswordReset({
          token: resetToken,
          password: resetPassword,
        });
        if (!response.ok || !data?.success) {
          setError(
            "Unable to reset your password. Please request a new link."
          );
          return;
        }
        setNotice(data?.message || "Password updated. You can sign in now.");
        setResetPassword("");
        setResetConfirm("");
        setResetToken("");
        clearResetUrl();
        setMode("login");
        return;
      }

      if (mode === "signup") {
        if (!fullName.trim()) {
          setError("Full name is required.");
          return;
        }
        if (!dateOfBirth.trim()) {
          setError("Date of birth is required.");
          return;
        }
        if (!email.trim()) {
          setError("Email is required.");
          return;
        }
        if (!password) {
          setError("Password is required.");
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
        if (!signupLegalConsent) {
          setError("Please accept Terms, Privacy & Compliance to create an account.");
          return;
        }

        const { data } = await requestPublicSignup({
          email: email.trim(),
          password,
          name: fullName.trim(),
          dateOfBirth: dateOfBirth.trim(),
          legalConsentAccepted: true,
          legalPolicyVersion,
        });
        if (!data?.success) {
          setError(data?.error || "Sign up failed. Please check your details and try again.");
          return;
        }

        setNotice(
          data?.verificationLink
            ? `Verification link (dev): ${data.verificationLink}`
            : data?.message || "Check your email to verify your account."
        );
        setMode("login");
        return;
      }

      const { data, response } = await requestLogin({
        username: email.trim() || undefined,
        password,
      });
      
      if (!response.ok || !data?.valid || !data?.token) {
        setError(data?.message || "Login failed. Check your credentials and try again.");
        return;
      }

      const normalizedCode = loginAccessCode.trim();
      if (normalizedCode) {
        const { response: codeResponse, data: codeData } = await redeemAccessCode(
          normalizedCode,
          data.token
        );
        if (!codeResponse.ok || !codeData?.success) {
          setError(codeData?.error || "Activation code is invalid or expired.");
          return;
        }
      }

      setToken(data.token);
      setLoginAccessCode("");
    } catch (err) {
      setError(
        mode === "signup"
          ? "Sign up failed. Please try again."
          : mode === "reset-request" || mode === "reset-confirm"
            ? "Password reset failed. Please try again."
            : "Login failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      dir="ltr"
      lang="en"
      className="min-h-screen bg-zaki-base dark:bg-[#0f0b08] flex items-center justify-center px-4"
    >
      <div className="w-full max-w-md rounded-[28px] border border-zaki dark:border-[#2a2018] bg-zaki-raised dark:bg-[#0F0B0A] shadow-zaki-xl dark:shadow-[0px_30px_80px_rgba(0,0,0,0.55)] p-8 text-left">
        <div className="flex items-center">
          <LogoArabicOrange />
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-zaki-primary dark:text-[#efe6d9]">
          {mode === "signup"
            ? "Create your account"
            : mode === "reset-request"
              ? "Reset your password"
              : mode === "reset-confirm"
                ? "Set a new password"
                : "Welcome back"}
        </h1>
        {mode === "login" && null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "reset-confirm" && (
            <div className="rounded-zaki-md border border-zaki-strong dark:border-[#2a2018] bg-zaki-base dark:bg-[#14100d] px-3 py-2 text-xs text-zaki-secondary dark:text-[#c9b8a4]">
              Enter your new password below.
            </div>
          )}
          {mode === "signup" && (
            <label className="flex flex-col gap-2 text-xs font-semibold text-zaki-muted dark:text-[#c9b8a4]">
              Full name
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Full name"
                className="rounded-zaki-md border border-zaki-strong dark:border-[#2a2018] bg-white dark:bg-[#14100d] px-4 py-2 text-sm text-zaki-primary dark:text-[#efe6d9] placeholder:text-zaki-muted dark:placeholder:text-[#8e7b66] outline-none focus:border-zaki-focus focus:ring-2 focus:ring-zaki-focus/20"
                autoComplete="name"
                required
              />
            </label>
          )}
          {mode === "signup" && (
            <label className="flex flex-col gap-2 text-xs font-semibold text-zaki-muted dark:text-[#c9b8a4]">
              Date of birth
              <input
                type="date"
                value={dateOfBirth}
                onChange={(event) => setDateOfBirth(event.target.value)}
                className="rounded-zaki-md border border-zaki-strong dark:border-[#2a2018] bg-white dark:bg-[#14100d] px-4 py-2 text-sm text-zaki-primary dark:text-[#efe6d9] outline-none focus:border-zaki-focus focus:ring-2 focus:ring-zaki-focus/20"
                autoComplete="bday"
                required
              />
            </label>
          )}
          {(mode === "login" ||
            mode === "signup" ||
            mode === "reset-request") && (
            <label className="flex flex-col gap-2 text-xs font-semibold text-zaki-muted dark:text-[#c9b8a4]">
              Email
              <input
                type="text"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                className="rounded-zaki-md border border-zaki-strong dark:border-[#2a2018] bg-white dark:bg-[#14100d] px-4 py-2 text-sm text-zaki-primary dark:text-[#efe6d9] placeholder:text-zaki-muted dark:placeholder:text-[#8e7b66] outline-none focus:border-zaki-focus focus:ring-2 focus:ring-zaki-focus/20"
                autoComplete="email"
                required
              />
            </label>
          )}

          {(mode === "login" || mode === "signup") && (
            <label className="flex flex-col gap-2 text-xs font-semibold text-zaki-muted dark:text-[#c9b8a4]">
              Password
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  className="w-full rounded-zaki-md border border-zaki-strong dark:border-[#2a2018] bg-white dark:bg-[#14100d] px-4 py-2 pr-12 text-sm text-zaki-primary dark:text-[#efe6d9] placeholder:text-zaki-muted dark:placeholder:text-[#8e7b66] outline-none focus:border-zaki-focus focus:ring-2 focus:ring-zaki-focus/20"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zaki-muted hover:text-zaki-secondary dark:text-[#c9b8a4] dark:hover:text-[#efe6d9]"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </label>
          )}

          {mode === "signup" && (
            <label className="flex items-start gap-3 rounded-zaki-md border border-zaki-strong dark:border-[#2a2018] bg-zaki-base/70 dark:bg-[#14100d] px-3 py-3 text-xs font-medium text-zaki-secondary dark:text-[#c9b8a4]">
              <input
                type="checkbox"
                checked={signupLegalConsent}
                onChange={(event) => setSignupLegalConsent(event.target.checked)}
                className="mt-0.5 size-4 rounded border border-zaki-strong dark:border-[#3a3026] bg-white dark:bg-[#0f0b08] accent-[#D97757]"
                required
              />
              <span className="leading-relaxed">
                I agree to the{" "}
                <a
                  href="/legal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-zaki-brand hover:underline"
                >
                  Terms, Privacy & Compliance
                </a>
                .
              </span>
            </label>
          )}

          {mode === "login" && (
            <label className="flex flex-col gap-2 text-xs font-semibold text-zaki-muted dark:text-[#c9b8a4]">
              Activation code (optional)
              <input
                type="text"
                value={loginAccessCode}
                onChange={(event) => setLoginAccessCode(event.target.value)}
                placeholder="Access code"
                className="rounded-zaki-md border border-zaki-strong dark:border-[#2a2018] bg-white dark:bg-[#14100d] px-4 py-2 text-sm text-zaki-primary dark:text-[#efe6d9] placeholder:text-zaki-muted dark:placeholder:text-[#8e7b66] outline-none focus:border-zaki-focus focus:ring-2 focus:ring-zaki-focus/20"
                autoComplete="off"
              />
            </label>
          )}

          {mode === "login" && (
            <button
              type="button"
              className="text-left text-xs font-semibold text-zaki-secondary hover:text-zaki-primary dark:text-[#c9b8a4] dark:hover:text-[#efe6d9]"
              onClick={() => {
                setError("");
                setNotice("");
                setMode("reset-request");
              }}
            >
              Forgot password?
            </button>
          )}

          {mode === "signup" && (
            <label className="flex flex-col gap-2 text-xs font-semibold text-zaki-muted dark:text-[#c9b8a4]">
              Confirm password
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm password"
                className="w-full rounded-zaki-md border border-zaki-strong dark:border-[#2a2018] bg-white dark:bg-[#14100d] px-4 py-2 text-sm text-zaki-primary dark:text-[#efe6d9] placeholder:text-zaki-muted dark:placeholder:text-[#8e7b66] outline-none focus:border-zaki-focus focus:ring-2 focus:ring-zaki-focus/20"
                autoComplete="new-password"
                required
              />
            </label>
          )}

          {mode === "reset-confirm" && (
            <>
              <label className="flex flex-col gap-2 text-xs font-semibold text-zaki-muted dark:text-[#c9b8a4]">
                New password
                <input
                  type={showPassword ? "text" : "password"}
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  placeholder="New password"
                  className="w-full rounded-zaki-md border border-zaki-strong dark:border-[#2a2018] bg-white dark:bg-[#14100d] px-4 py-2 text-sm text-zaki-primary dark:text-[#efe6d9] placeholder:text-zaki-muted dark:placeholder:text-[#8e7b66] outline-none focus:border-zaki-focus focus:ring-2 focus:ring-zaki-focus/20"
                  autoComplete="new-password"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-xs font-semibold text-zaki-muted dark:text-[#c9b8a4]">
                Confirm new password
                <input
                  type={showPassword ? "text" : "password"}
                  value={resetConfirm}
                  onChange={(event) => setResetConfirm(event.target.value)}
                  placeholder="Confirm new password"
                  className="w-full rounded-zaki-md border border-zaki-strong dark:border-[#2a2018] bg-white dark:bg-[#14100d] px-4 py-2 text-sm text-zaki-primary dark:text-[#efe6d9] placeholder:text-zaki-muted dark:placeholder:text-[#8e7b66] outline-none focus:border-zaki-focus focus:ring-2 focus:ring-zaki-focus/20"
                  autoComplete="new-password"
                  required
                />
              </label>
            </>
          )}

          {notice && (
            <div className="rounded-zaki-md border border-zaki-strong dark:border-[#1d3b30] bg-zaki-success dark:bg-[rgba(33,145,113,0.2)] px-3 py-2 text-xs text-zaki-success dark:text-[#e9fff8]">
              {notice}
            </div>
          )}
          {error && (
            <div className="rounded-zaki-md border border-zaki-strong dark:border-[#3a1f1b] bg-zaki-error dark:bg-[rgba(210,68,48,0.18)] px-3 py-2 text-xs text-zaki-brand dark:text-[#ffe7e2]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={
              isLoading ||
              ((mode === "login" || mode === "signup") && password.length === 0) ||
              (mode === "signup" && !signupLegalConsent) ||
              (mode === "signup" && confirmPassword.length === 0) ||
              (mode === "reset-confirm" &&
                (resetPassword.length === 0 || resetConfirm.length === 0))
            }
            className="w-full zaki-btn zaki-btn-primary disabled:opacity-60"
          >
            {isLoading
              ? mode === "signup"
                ? "Creating account..."
                : mode === "reset-request"
                  ? "Sending link..."
                  : mode === "reset-confirm"
                    ? "Updating password..."
                    : "Signing in..."
              : mode === "signup"
                ? "Create account"
                : mode === "reset-request"
                  ? "Send reset link"
                  : mode === "reset-confirm"
                    ? "Update password"
                    : "Sign in"}
          </button>
        </form>

        <button
          type="button"
          className="mt-4 text-xs font-semibold text-zaki-secondary hover:text-zaki-primary dark:text-[#c9b8a4] dark:hover:text-[#efe6d9]"
          onClick={() => {
            setError("");
            setNotice("");
            if (mode === "signup") {
              setMode("login");
            } else if (mode === "login") {
              setMode("signup");
            } else {
              setMode("login");
              setResetPassword("");
              setResetConfirm("");
              setResetToken("");
              clearResetUrl();
            }
            if (mode === "signup") {
              setFullName("");
              setDateOfBirth("");
              setConfirmPassword("");
              setSignupLegalConsent(false);
            }
            if (mode === "login") {
              setLoginAccessCode("");
            }
          }}
        >
          {mode === "signup"
            ? "Have an account? Sign in"
            : mode === "login"
              ? "New here? Create an account"
              : "Back to sign in"}
        </button>
      </div>
    </div>
  );
}
