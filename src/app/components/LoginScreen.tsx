import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { LogoArabicOrange } from "./icons";
import { requestPublicSignup, requestLogin } from "@/lib/api";

export function LoginScreen({
  onSuccess,
}: {
  onSuccess: (token: string) => void;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsLoading(true);

    try {
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
          setError("Sign up failed. Please check your details and try again.");
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
        setError("Login failed. Check your credentials and try again.");
        return;
      }

      onSuccess(data.token);
    } catch (err) {
      setError(
        mode === "signup"
          ? "Sign up failed. Please try again."
          : "Login failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fff8f0] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[28px] border border-[#efe4d6] bg-white shadow-[0px_22px_60px_rgba(15,15,15,0.12)] p-8">
        <div className="flex items-center">
          <LogoArabicOrange />
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-[#1f1a14]">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        {mode === "login" && null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <label className="flex flex-col gap-2 text-xs font-semibold text-[#88735A]">
              Full name
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your full name"
                className="rounded-xl border border-[#e7dbc9] px-4 py-2 text-sm text-[#1f1a14] outline-none focus:border-[#b09472]"
                autoComplete="name"
                required
              />
            </label>
          )}
          {mode === "signup" && (
            <label className="flex flex-col gap-2 text-xs font-semibold text-[#88735A]">
              Date of birth
              <input
                type="date"
                value={dateOfBirth}
                onChange={(event) => setDateOfBirth(event.target.value)}
                className="rounded-xl border border-[#e7dbc9] px-4 py-2 text-sm text-[#1f1a14] outline-none focus:border-[#b09472]"
                autoComplete="bday"
                required
              />
            </label>
          )}
          <label className="flex flex-col gap-2 text-xs font-semibold text-[#88735A]">
            Email
            <input
              type="text"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="rounded-xl border border-[#e7dbc9] px-4 py-2 text-sm text-[#1f1a14] outline-none focus:border-[#b09472]"
              autoComplete="email"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-[#88735A]">
            Password
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
                className="w-full rounded-xl border border-[#e7dbc9] px-4 py-2 pr-12 text-sm text-[#1f1a14] outline-none focus:border-[#b09472]"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b09472] hover:text-[#655543]"
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
          {mode === "signup" && (
            <label className="flex flex-col gap-2 text-xs font-semibold text-[#88735A]">
              Confirm password
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your password"
                className="w-full rounded-xl border border-[#e7dbc9] px-4 py-2 text-sm text-[#1f1a14] outline-none focus:border-[#b09472]"
                autoComplete="new-password"
                required
              />
            </label>
          )}

          {notice && (
            <div className="rounded-xl border border-[#d8e7d1] bg-[#f3fbef] px-3 py-2 text-xs text-[#2f6a36]">
              {notice}
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-[#f6d5ce] bg-[#fff3f0] px-3 py-2 text-xs text-[#d24430]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={
              isLoading ||
              password.length === 0 ||
              (mode === "signup" && confirmPassword.length === 0)
            }
            className="w-full rounded-xl bg-[#1f1a14] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2b241c] disabled:opacity-60"
          >
            {isLoading
              ? mode === "signup"
                ? "Creating account..."
                : "Signing in..."
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        {mode === "login" && null}
        <button
          type="button"
          className="mt-4 text-xs font-semibold text-[#655543] hover:text-[#1f1a14]"
          onClick={() => {
            setError("");
            setNotice("");
            setMode(mode === "signup" ? "login" : "signup");
            if (mode === "signup") {
              setFullName("");
              setDateOfBirth("");
              setConfirmPassword("");
            }
          }}
        >
          {mode === "signup"
            ? "Have an account? Sign in"
            : "New here? Create an account"}
        </button>
      </div>
    </div>
  );
}
