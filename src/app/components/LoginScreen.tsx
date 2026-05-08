import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "@/lib/api";
import { useAuthStore } from "@/stores";

const LEGAL_POLICY_VERSION_FALLBACK = "2026-02-17.v2";
const PRICING_INTENT_SOURCES = new Set([
  "website_pricing",
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

const AUTH_COPY = {
  en: {
    title: {
      signup: "Create your account",
      resetRequest: "Reset your password",
      resetConfirm: "Set a new password",
      login: "Welcome back",
    },
    fields: {
      fullName: "Full name",
      dateOfBirth: "Date of birth",
      email: "Email",
      password: "Password",
      confirmPassword: "Confirm password",
      newPassword: "New password",
      confirmNewPassword: "Confirm new password",
      accessCode: "Activation code (optional)",
    },
    placeholders: {
      fullName: "Full name",
      email: "Email address",
      password: "Password",
      confirmPassword: "Confirm password",
      newPassword: "New password",
      confirmNewPassword: "Confirm new password",
      accessCode: "Access code",
    },
    resetHint: "Enter your new password below.",
    consent: {
      prefix: "I agree to the",
      link: "Terms, Privacy & Compliance",
    },
    actions: {
      tabSignIn: "Sign in",
      tabCreate: "Create",
      tabReset: "Reset",
      forgotPassword: "Forgot password?",
      createAccount: "Create account",
      creatingAccount: "Creating account...",
      sendResetLink: "Send reset link",
      sendingResetLink: "Sending link...",
      updatePassword: "Update password",
      updatingPassword: "Updating password...",
      signIn: "Sign in",
      signingIn: "Signing in...",
      haveAccount: "Have an account? Sign in",
      newHere: "New here? Create an account",
      backToSignIn: "Back to sign in",
      showActivationCode: "Have an activation code?",
      hideActivationCode: "Hide activation code",
    },
    subtitles: {
      login: "Sign in to continue your chats and spaces.",
      signup: "Create your account to start with ZAKI.",
      resetRequest: "We will email you a secure reset link.",
      resetConfirm: "Set a new password to regain access.",
    },
    aria: {
      hidePassword: "Hide password",
      showPassword: "Show password",
    },
    notices: {
      verifiedSuccess: "Email verified successfully. You can sign in now.",
      verifiedAlready: "Email already verified. Please sign in.",
      resetSent: "If the account exists, a reset link has been sent.",
      passwordUpdated: "Password updated. You can sign in now.",
      verifyEmail: "Check your email to verify your account.",
      verificationLink: "Verification link (dev):",
    },
    errors: {
      verificationExpired: "Verification link expired. Please sign up again.",
      verificationInvalid: "Verification link is invalid. Please sign up again.",
      verificationMissing: "Verification token is missing. Please sign up again.",
      emailRequired: "Email is required.",
      resetTokenMissing: "Reset token is missing.",
      passwordRequired: "Password is required.",
      passwordsMismatch: "Passwords do not match.",
      resetFailed: "Unable to reset your password. Please request a new link.",
      fullNameRequired: "Full name is required.",
      dateOfBirthRequired: "Date of birth is required.",
      consentRequired: "Please accept Terms, Privacy & Compliance to create an account.",
      signupFailed: "Sign up failed. Please check your details and try again.",
      loginFailed: "Login failed. Check your credentials and try again.",
      loginServiceDown:
        "Login service is temporarily unavailable. Please try again in a moment.",
      activationCodeInvalid: "Activation code is invalid or expired.",
      genericSignupFailed: "Sign up failed. Please try again.",
      genericResetFailed: "Password reset failed. Please try again.",
      genericLoginFailed: "Login failed. Please try again.",
    },
  },
  ar: {
    title: {
      signup: "أنشئ حسابك",
      resetRequest: "إعادة تعيين كلمة المرور",
      resetConfirm: "عيّن كلمة مرور جديدة",
      login: "مرحبًا بعودتك",
    },
    fields: {
      fullName: "الاسم الكامل",
      dateOfBirth: "تاريخ الميلاد",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      confirmPassword: "تأكيد كلمة المرور",
      newPassword: "كلمة المرور الجديدة",
      confirmNewPassword: "تأكيد كلمة المرور الجديدة",
      accessCode: "رمز التفعيل (اختياري)",
    },
    placeholders: {
      fullName: "الاسم الكامل",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      confirmPassword: "تأكيد كلمة المرور",
      newPassword: "كلمة المرور الجديدة",
      confirmNewPassword: "تأكيد كلمة المرور الجديدة",
      accessCode: "رمز التفعيل",
    },
    resetHint: "أدخل كلمة المرور الجديدة أدناه.",
    consent: {
      prefix: "أوافق على",
      link: "الشروط والخصوصية والامتثال",
    },
    actions: {
      tabSignIn: "دخول",
      tabCreate: "إنشاء",
      tabReset: "استعادة",
      forgotPassword: "هل نسيت كلمة المرور؟",
      createAccount: "إنشاء الحساب",
      creatingAccount: "جارٍ إنشاء الحساب...",
      sendResetLink: "إرسال رابط إعادة التعيين",
      sendingResetLink: "جارٍ إرسال الرابط...",
      updatePassword: "تحديث كلمة المرور",
      updatingPassword: "جارٍ تحديث كلمة المرور...",
      signIn: "تسجيل الدخول",
      signingIn: "جارٍ تسجيل الدخول...",
      haveAccount: "لديك حساب؟ سجّل الدخول",
      newHere: "جديد هنا؟ أنشئ حسابًا",
      backToSignIn: "العودة إلى تسجيل الدخول",
      showActivationCode: "لديك رمز تفعيل؟",
      hideActivationCode: "إخفاء رمز التفعيل",
    },
    subtitles: {
      login: "سجّل الدخول لمتابعة محادثاتك ومساحاتك.",
      signup: "أنشئ حسابك للبدء مع ZAKI.",
      resetRequest: "سنرسل لك رابطًا آمنًا لإعادة تعيين كلمة المرور.",
      resetConfirm: "عيّن كلمة مرور جديدة لاستعادة الوصول.",
    },
    aria: {
      hidePassword: "إخفاء كلمة المرور",
      showPassword: "إظهار كلمة المرور",
    },
    notices: {
      verifiedSuccess: "تم تأكيد البريد الإلكتروني بنجاح. يمكنك تسجيل الدخول الآن.",
      verifiedAlready: "تم تأكيد البريد الإلكتروني مسبقًا. سجّل الدخول.",
      resetSent: "إذا كان الحساب موجودًا، فقد تم إرسال رابط إعادة التعيين.",
      passwordUpdated: "تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن.",
      verifyEmail: "تحقق من بريدك الإلكتروني لتأكيد الحساب.",
      verificationLink: "رابط التحقق (بيئة التطوير):",
    },
    errors: {
      verificationExpired: "انتهت صلاحية رابط التحقق. يرجى إنشاء حساب جديد.",
      verificationInvalid: "رابط التحقق غير صالح. يرجى إنشاء حساب جديد.",
      verificationMissing: "رمز التحقق مفقود. يرجى إنشاء حساب جديد.",
      emailRequired: "البريد الإلكتروني مطلوب.",
      resetTokenMissing: "رمز إعادة التعيين مفقود.",
      passwordRequired: "كلمة المرور مطلوبة.",
      passwordsMismatch: "كلمتا المرور غير متطابقتين.",
      resetFailed: "تعذر إعادة تعيين كلمة المرور. اطلب رابطًا جديدًا.",
      fullNameRequired: "الاسم الكامل مطلوب.",
      dateOfBirthRequired: "تاريخ الميلاد مطلوب.",
      consentRequired: "يرجى الموافقة على الشروط والخصوصية والامتثال لإنشاء الحساب.",
      signupFailed: "فشل إنشاء الحساب. يرجى مراجعة بياناتك والمحاولة مرة أخرى.",
      loginFailed: "فشل تسجيل الدخول. تحقق من بياناتك ثم حاول مرة أخرى.",
      loginServiceDown:
        "خدمة تسجيل الدخول غير متاحة مؤقتًا. يرجى المحاولة بعد قليل.",
      activationCodeInvalid: "رمز التفعيل غير صالح أو منتهي الصلاحية.",
      genericSignupFailed: "فشل إنشاء الحساب. حاول مرة أخرى.",
      genericResetFailed: "فشلت إعادة تعيين كلمة المرور. حاول مرة أخرى.",
      genericLoginFailed: "فشل تسجيل الدخول. حاول مرة أخرى.",
    },
  },
} as const;

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
  const [mode, setMode] = useState<"login" | "signup" | "reset-request" | "reset-confirm">(
    initialToken ? "reset-confirm" : "login"
  );
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [loginAccessCode, setLoginAccessCode] = useState("");
  const [showLoginAccessCode, setShowLoginAccessCode] = useState(false);
  const [signupLegalConsent, setSignupLegalConsent] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
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

  const setModeClean = useCallback(
    (nextMode: "login" | "signup" | "reset-request" | "reset-confirm") => {
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
        setDateOfBirth("");
        setConfirmPassword("");
        setSignupLegalConsent(false);
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

    if (authMode || verified) {
      url.searchParams.delete("auth");
      url.searchParams.delete("verified");
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
        if (!dateOfBirth.trim()) {
          setFieldErrors({ dateOfBirth: copy.errors.dateOfBirthRequired });
          setError(copy.errors.dateOfBirthRequired);
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

        const { data } = await requestPublicSignup({
          email: email.trim(),
          password,
          name: fullName.trim(),
          dateOfBirth: dateOfBirth.trim(),
          legalConsentAccepted: true,
          legalPolicyVersion,
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
      
      if (!response.ok || !data?.valid || !data?.token) {
        const fallback =
          response.status >= 500
            ? copy.errors.loginServiceDown
            : copy.errors.loginFailed;
        setError(data?.message || data?.error || fallback);
        return;
      }

      const normalizedCode = loginAccessCode.trim();
      if (normalizedCode) {
        const { response: codeResponse, data: codeData } = await redeemAccessCode(
          normalizedCode,
          data.token
        );
        if (!codeResponse.ok || !codeData?.success) {
          setError(codeData?.error || copy.errors.activationCodeInvalid);
          return;
        }
      }

      setToken(data.token);
      // Immediately populate the user store so dependent components (spaces, brain, etc.)
      // don't have to wait for the next page load's hydration effect.
      try {
        const { response: ur, data: ud } = await fetchCurrentUser();
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
          setUser(mergedUser);
        }
      } catch {
        // Non-fatal — user will be populated on next hydration
      }
      setLoginAccessCode("");
      setShowLoginAccessCode(false);
      if (
        location.pathname === "/pricing" &&
        !hasExplicitPricingIntent({
          pathname: location.pathname,
          searchParams: new URLSearchParams(location.search),
        })
      ) {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(
        mode === "signup"
          ? copy.errors.genericSignupFailed
          : mode === "reset-request" || mode === "reset-confirm"
            ? copy.errors.genericResetFailed
            : copy.errors.genericLoginFailed
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      lang={locale}
      className="min-h-screen bg-white dark:bg-[#0c0a09] flex items-center justify-center px-4 font-body"
    >
      <div className={`w-full max-w-md rounded-zaki-2xl border border-zaki-strong bg-zaki-raised shadow-zaki-xl p-8 dark:bg-[#141210] dark:border-[rgba(240,236,230,0.1)] dark:shadow-[0px_30px_80px_rgba(0,0,0,0.55)] ${isRtl ? "text-right" : "text-left"}`}>
        <div className="flex items-center">
          <LogoArabicRed />
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold text-zaki-primary dark:text-[#efe6d9]">
          {mode === "signup"
            ? copy.title.signup
            : mode === "reset-request"
              ? copy.title.resetRequest
              : mode === "reset-confirm"
                ? copy.title.resetConfirm
                : copy.title.login}
        </h1>
        <p className="mt-1 text-sm text-zaki-secondary dark:text-[#c9b8a4]">
          {mode === "signup"
            ? copy.subtitles.signup
            : mode === "reset-request"
              ? copy.subtitles.resetRequest
              : mode === "reset-confirm"
                ? copy.subtitles.resetConfirm
                : copy.subtitles.login}
        </p>

        {mode !== "reset-confirm" ? (
          <div
            role="tablist"
            aria-label={isRtl ? "تبديل نمط الدخول" : "Authentication mode"}
            className="mt-5 grid grid-cols-3 gap-1 rounded-full border border-zaki bg-zaki-base p-1 dark:bg-[#1a1714] dark:border-[rgba(240,236,230,0.08)]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              onClick={() => setModeClean("login")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                mode === "login"
                  ? "bg-zaki-elevated text-zaki-primary shadow-sm dark:bg-[#141210] dark:text-[#efe6d9]"
                  : "text-zaki-muted hover:text-zaki-secondary dark:text-[#a79079] dark:hover:text-[#efe6d9]"
              }`}
            >
              {copy.actions.tabSignIn}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              onClick={() => setModeClean("signup")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                mode === "signup"
                  ? "bg-zaki-elevated text-zaki-primary shadow-sm dark:bg-[#141210] dark:text-[#efe6d9]"
                  : "text-zaki-muted hover:text-zaki-secondary dark:text-[#a79079] dark:hover:text-[#efe6d9]"
              }`}
            >
              {copy.actions.tabCreate}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "reset-request"}
              onClick={() => setModeClean("reset-request")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                mode === "reset-request"
                  ? "bg-zaki-elevated text-zaki-primary shadow-sm dark:bg-[#141210] dark:text-[#efe6d9]"
                  : "text-zaki-muted hover:text-zaki-secondary dark:text-[#a79079] dark:hover:text-[#efe6d9]"
              }`}
            >
              {copy.actions.tabReset}
            </button>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "reset-confirm" && (
            <div className="rounded-zaki-md border border-zaki bg-zaki-base px-3 py-2 text-xs text-zaki-secondary dark:bg-[#1a1714] dark:border-[rgba(240,236,230,0.08)] dark:text-[#c9b8a4]">
              {copy.resetHint}
            </div>
          )}
          {mode === "signup" && (
            <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-wider text-zaki-secondary dark:text-[#c9b8a4]">
              {copy.fields.fullName}
              <input
                type="text"
                value={fullName}
                onChange={(event) => {
                  setFullName(event.target.value);
                  clearFieldError("fullName");
                }}
                placeholder={copy.placeholders.fullName}
                className="rounded-zaki-md border border-zaki-strong bg-zaki-hover px-3 py-2.5 text-sm normal-case tracking-normal text-zaki-primary placeholder:text-zaki-muted outline-none transition focus:border-zaki-accent focus:ring-2 focus:ring-[color:var(--zaki-accent)]/20 dark:border-[rgba(240,236,230,0.1)] dark:bg-[#1a1714] dark:text-[#efe6d9] dark:placeholder:text-[#8e7b66]"
                autoComplete="name"
                required
              />
              {fieldErrors.fullName ? (
                <span className="text-[11px] font-medium normal-case tracking-normal text-zaki-brand dark:text-[#ffb4aa]">{fieldErrors.fullName}</span>
              ) : null}
            </label>
          )}
          {mode === "signup" && (
            <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-wider text-zaki-secondary dark:text-[#c9b8a4]">
              {copy.fields.dateOfBirth}
              <input
                type="date"
                value={dateOfBirth}
                onChange={(event) => {
                  setDateOfBirth(event.target.value);
                  clearFieldError("dateOfBirth");
                }}
                className="rounded-zaki-md border border-zaki-strong bg-zaki-hover px-3 py-2.5 text-sm normal-case tracking-normal text-zaki-primary outline-none transition focus:border-zaki-accent focus:ring-2 focus:ring-[color:var(--zaki-accent)]/20 dark:border-[rgba(240,236,230,0.1)] dark:bg-[#1a1714] dark:text-[#efe6d9]"
                autoComplete="bday"
                required
              />
              {fieldErrors.dateOfBirth ? (
                <span className="text-[11px] font-medium normal-case tracking-normal text-zaki-brand dark:text-[#ffb4aa]">{fieldErrors.dateOfBirth}</span>
              ) : null}
            </label>
          )}
          {(mode === "login" ||
            mode === "signup" ||
            mode === "reset-request") && (
            <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-wider text-zaki-secondary dark:text-[#c9b8a4]">
              {copy.fields.email}
              <input
                type="text"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  clearFieldError("email");
                }}
                placeholder={copy.placeholders.email}
                className="rounded-zaki-md border border-zaki-strong bg-zaki-hover px-3 py-2.5 text-sm normal-case tracking-normal text-zaki-primary placeholder:text-zaki-muted outline-none transition focus:border-zaki-accent focus:ring-2 focus:ring-[color:var(--zaki-accent)]/20 dark:border-[rgba(240,236,230,0.1)] dark:bg-[#1a1714] dark:text-[#efe6d9] dark:placeholder:text-[#8e7b66]"
                autoComplete="email"
                required
              />
              {fieldErrors.email ? (
                <span className="text-[11px] font-medium normal-case tracking-normal text-zaki-brand dark:text-[#ffb4aa]">{fieldErrors.email}</span>
              ) : null}
            </label>
          )}

          {(mode === "login" || mode === "signup") && (
            <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-wider text-zaki-secondary dark:text-[#c9b8a4]">
              {copy.fields.password}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    clearFieldError("password");
                  }}
                  placeholder={copy.placeholders.password}
                  className="w-full rounded-zaki-md border border-zaki-strong bg-zaki-hover px-3 py-2.5 pr-12 text-sm normal-case tracking-normal text-zaki-primary placeholder:text-zaki-muted outline-none transition focus:border-zaki-accent focus:ring-2 focus:ring-[color:var(--zaki-accent)]/20 dark:border-[rgba(240,236,230,0.1)] dark:bg-[#1a1714] dark:text-[#efe6d9] dark:placeholder:text-[#8e7b66]"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zaki-muted hover:text-zaki-secondary dark:text-[#c9b8a4] dark:hover:text-[#efe6d9]"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? copy.aria.hidePassword : copy.aria.showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {fieldErrors.password ? (
                <span className="text-[11px] font-medium normal-case tracking-normal text-zaki-brand dark:text-[#ffb4aa]">{fieldErrors.password}</span>
              ) : null}
            </label>
          )}

          {mode === "signup" && (
            <label className="flex items-start gap-3 rounded-zaki-md border border-zaki bg-zaki-base px-3 py-3 text-xs font-medium text-zaki-secondary dark:bg-[#1a1714] dark:border-[rgba(240,236,230,0.08)] dark:text-[#c9b8a4]">
              <input
                type="checkbox"
                checked={signupLegalConsent}
                onChange={(event) => setSignupLegalConsent(event.target.checked)}
                className="mt-0.5 size-4 rounded border border-zaki-strong bg-white accent-zaki-brand dark:border-[rgba(240,236,230,0.15)] dark:bg-[#0c0a09]"
                required
              />
              <span className="leading-relaxed">
                {copy.consent.prefix}{" "}
                <a
                  href="/legal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-zaki-brand hover:underline"
                >
                  {copy.consent.link}
                </a>
                .
              </span>
            </label>
          )}

          {mode === "login" ? (
            <>
              <button
                type="button"
                className="text-left text-sm text-zaki-secondary hover:text-zaki-primary dark:text-[#c9b8a4] dark:hover:text-[#efe6d9]"
                onClick={() => setShowLoginAccessCode((prev) => !prev)}
              >
                {showLoginAccessCode ? copy.actions.hideActivationCode : copy.actions.showActivationCode}
              </button>
              {showLoginAccessCode ? (
                <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-wider text-zaki-secondary dark:text-[#c9b8a4]">
                  {copy.fields.accessCode}
                  <input
                    type="text"
                    value={loginAccessCode}
                    onChange={(event) => setLoginAccessCode(event.target.value)}
                    placeholder={copy.placeholders.accessCode}
                    className="rounded-zaki-md border border-zaki-strong bg-zaki-hover px-3 py-2.5 text-sm normal-case tracking-normal text-zaki-primary placeholder:text-zaki-muted outline-none transition focus:border-zaki-accent focus:ring-2 focus:ring-[color:var(--zaki-accent)]/20 dark:border-[rgba(240,236,230,0.1)] dark:bg-[#1a1714] dark:text-[#efe6d9] dark:placeholder:text-[#8e7b66]"
                    autoComplete="off"
                  />
                </label>
              ) : null}
            </>
          ) : null}

          {mode === "login" && (
            <button
              type="button"
              className="text-left text-sm text-zaki-secondary hover:text-zaki-primary dark:text-[#c9b8a4] dark:hover:text-[#efe6d9]"
              onClick={() => {
                setModeClean("reset-request");
              }}
            >
              {copy.actions.forgotPassword}
            </button>
          )}

          {mode === "signup" && (
            <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-wider text-zaki-secondary dark:text-[#c9b8a4]">
              {copy.fields.confirmPassword}
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  clearFieldError("confirmPassword");
                }}
                placeholder={copy.placeholders.confirmPassword}
                className="w-full rounded-zaki-md border border-zaki-strong bg-zaki-hover px-3 py-2.5 text-sm normal-case tracking-normal text-zaki-primary placeholder:text-zaki-muted outline-none transition focus:border-zaki-accent focus:ring-2 focus:ring-[color:var(--zaki-accent)]/20 dark:border-[rgba(240,236,230,0.1)] dark:bg-[#1a1714] dark:text-[#efe6d9] dark:placeholder:text-[#8e7b66]"
                autoComplete="new-password"
                required
              />
              {fieldErrors.confirmPassword ? (
                <span className="text-[11px] font-medium normal-case tracking-normal text-zaki-brand dark:text-[#ffb4aa]">{fieldErrors.confirmPassword}</span>
              ) : null}
            </label>
          )}

          {mode === "reset-confirm" && (
            <>
              <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-wider text-zaki-secondary dark:text-[#c9b8a4]">
                {copy.fields.newPassword}
                <input
                  type={showPassword ? "text" : "password"}
                  value={resetPassword}
                  onChange={(event) => {
                    setResetPassword(event.target.value);
                    clearFieldError("resetPassword");
                  }}
                  placeholder={copy.placeholders.newPassword}
                  className="w-full rounded-zaki-md border border-zaki-strong bg-zaki-hover px-3 py-2.5 text-sm normal-case tracking-normal text-zaki-primary placeholder:text-zaki-muted outline-none transition focus:border-zaki-accent focus:ring-2 focus:ring-[color:var(--zaki-accent)]/20 dark:border-[rgba(240,236,230,0.1)] dark:bg-[#1a1714] dark:text-[#efe6d9] dark:placeholder:text-[#8e7b66]"
                  autoComplete="new-password"
                  required
                />
                {fieldErrors.resetPassword ? (
                  <span className="text-[11px] font-medium normal-case tracking-normal text-zaki-brand dark:text-[#ffb4aa]">{fieldErrors.resetPassword}</span>
                ) : null}
              </label>
              <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-wider text-zaki-secondary dark:text-[#c9b8a4]">
                {copy.fields.confirmNewPassword}
                <input
                  type={showPassword ? "text" : "password"}
                  value={resetConfirm}
                  onChange={(event) => {
                    setResetConfirm(event.target.value);
                    clearFieldError("resetConfirm");
                  }}
                  placeholder={copy.placeholders.confirmNewPassword}
                  className="w-full rounded-zaki-md border border-zaki-strong bg-zaki-hover px-3 py-2.5 text-sm normal-case tracking-normal text-zaki-primary placeholder:text-zaki-muted outline-none transition focus:border-zaki-accent focus:ring-2 focus:ring-[color:var(--zaki-accent)]/20 dark:border-[rgba(240,236,230,0.1)] dark:bg-[#1a1714] dark:text-[#efe6d9] dark:placeholder:text-[#8e7b66]"
                  autoComplete="new-password"
                  required
                />
                {fieldErrors.resetConfirm ? (
                  <span className="text-[11px] font-medium normal-case tracking-normal text-zaki-brand dark:text-[#ffb4aa]">{fieldErrors.resetConfirm}</span>
                ) : null}
              </label>
            </>
          )}

          {notice && (
            <div className="rounded-zaki-md border border-zaki bg-zaki-success px-3 py-2 text-xs text-zaki-success dark:bg-[rgba(33,145,113,0.2)] dark:border-[#1d3b30] dark:text-[#e9fff8]">
              {notice}
            </div>
          )}
          {error && (
            <div className="rounded-zaki-md border border-zaki bg-zaki-error px-3 py-2 text-xs text-zaki-brand dark:bg-[rgba(241,2,2,0.18)] dark:border-[#3a1f1b] dark:text-[#ffe7e2]">
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
            className="w-full rounded-full bg-zaki-brand py-2.5 text-sm font-medium text-white shadow-[0_8px_24px_rgba(241,2,2,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(241,2,2,0.3)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {isLoading
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
                    : copy.actions.signIn}
          </button>
        </form>

        <button
          type="button"
          className="mt-4 text-sm text-zaki-secondary hover:text-zaki-primary dark:text-[#c9b8a4] dark:hover:text-[#efe6d9]"
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

        <div className="mt-4 text-xs text-zaki-muted dark:text-[#9f8f7c]">
          {isRtl ? "تسجيل دخول آمن . بنية تحتية موثوقة . امتثال قانوني" : "Secure sign-in . Trusted infrastructure . Legal compliance"}
        </div>
      </div>
    </div>
  );
}
