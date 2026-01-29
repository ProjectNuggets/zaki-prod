import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { LogoArabicOrange } from "./icons";
import { requestPublicSignup, requestLogin, requestPasswordReset, confirmPasswordReset } from "@/lib/api";
import { useAuthStore } from "@/stores";

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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

        const { data } = await requestPublicSignup({
          email: email.trim(),
          password,
          name: fullName.trim(),
          dateOfBirth: dateOfBirth.trim(),
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

      setToken(data.token);
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
    <div className="min-h-screen bg-zaki-base flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[28px] border border-zaki bg-white shadow-[0px_22px_60px_rgba(15,15,15,0.12)] p-8">
        <div className="flex items-center">
          <LogoArabicOrange />
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-zaki-primary">
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
            <div className="rounded-zaki-md border border-zaki-strong bg-zaki-base px-3 py-2 text-xs text-zaki-secondary">
              Enter your new password below.
            </div>
          )}
          {mode === "signup" && (
            <label className="flex flex-col gap-2 text-xs font-semibold text-zaki-muted">
              Full name
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your full name"
                className="rounded-zaki-md border border-zaki-strong px-4 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus"
                autoComplete="name"
                required
              />
            </label>
          )}
          {mode === "signup" && (
            <label className="flex flex-col gap-2 text-xs font-semibold text-zaki-muted">
              Date of birth
              <input
                type="date"
                value={dateOfBirth}
                onChange={(event) => setDateOfBirth(event.target.value)}
                className="rounded-zaki-md border border-zaki-strong px-4 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus"
                autoComplete="bday"
                required
              />
            </label>
          )}
          {(mode === "login" ||
            mode === "signup" ||
            mode === "reset-request") && (
            <label className="flex flex-col gap-2 text-xs font-semibold text-zaki-muted">
              Email
              <input
                type="text"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="rounded-zaki-md border border-zaki-strong px-4 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus"
                autoComplete="email"
                required
              />
            </label>
          )}

          {(mode === "login" || mode === "signup") && (
            <label className="flex flex-col gap-2 text-xs font-semibold text-zaki-muted">
              Password
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                  className="w-full rounded-zaki-md border border-zaki-strong px-4 py-2 pr-12 text-sm text-zaki-primary outline-none focus:border-zaki-focus"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zaki-muted hover:text-zaki-secondary"
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

          {mode === "login" && (
            <button
              type="button"
              className="text-left text-xs font-semibold text-zaki-secondary hover:text-zaki-primary"
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
            <label className="flex flex-col gap-2 text-xs font-semibold text-zaki-muted">
              Confirm password
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your password"
                className="w-full rounded-zaki-md border border-zaki-strong px-4 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus"
                autoComplete="new-password"
                required
              />
            </label>
          )}

          {mode === "reset-confirm" && (
            <>
              <label className="flex flex-col gap-2 text-xs font-semibold text-zaki-muted">
                New password
                <input
                  type={showPassword ? "text" : "password"}
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  placeholder="New password"
                  className="w-full rounded-zaki-md border border-zaki-strong px-4 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus"
                  autoComplete="new-password"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-xs font-semibold text-zaki-muted">
                Confirm new password
                <input
                  type={showPassword ? "text" : "password"}
                  value={resetConfirm}
                  onChange={(event) => setResetConfirm(event.target.value)}
                  placeholder="Repeat new password"
                  className="w-full rounded-zaki-md border border-zaki-strong px-4 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus"
                  autoComplete="new-password"
                  required
                />
              </label>
            </>
          )}

          {notice && (
            <div className="rounded-zaki-md border border-zaki-strong bg-zaki-success px-3 py-2 text-xs text-zaki-success">
              {notice}
            </div>
          )}
          {error && (
            <div className="rounded-zaki-md border border-zaki-strong bg-zaki-error px-3 py-2 text-xs text-zaki-brand">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={
              isLoading ||
              ((mode === "login" || mode === "signup") && password.length === 0) ||
              (mode === "signup" && confirmPassword.length === 0) ||
              (mode === "reset-confirm" &&
                (resetPassword.length === 0 || resetConfirm.length === 0))
            }
            className="w-full rounded-zaki-md bg-zaki-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zaki-active disabled:opacity-60"
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
          className="mt-4 text-xs font-semibold text-zaki-secondary hover:text-zaki-primary"
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
