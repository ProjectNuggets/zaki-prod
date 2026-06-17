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
  buildGoogleOAuthStartUrl,
  fetchGoogleOAuthStatus,
} from "@/lib/api";
import { clearPendingIntent, readPendingIntent } from "@/lib/pendingIntent";
import { useAuthStore } from "@/stores";

const LEGAL_POLICY_VERSION_FALLBACK = "2026-06-17.v2";
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
  const raw = String(value || "").trim();
  if (
    !raw ||
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("//")
  ) {
    return "";
  }
  const parsed = new URL(raw.startsWith("/") ? raw : `/${raw}`, "https://zaki.local");
  parsed.searchParams.delete("auth");
  const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  return normalized === "/" ? "" : normalized;
}

function getPostLoginReturnTo(location: ReturnType<typeof useLocation>) {
  const searchParams = new URLSearchParams(location.search);
  const next = getSafeRelativeReturnTo(searchParams.get("next"));
  if (next) return next;
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

const AUTH_COPY = {
  en: {
    title: {
      signup: "Create a ZAKI account",
      resetRequest: "Reset your password",
      resetConfirm: "Set a new password",
      login: "Sign in to ZAKI",
    },
    chrome: {
      product: "ZAKI",
      descriptor: "Secure workspace access",
    },
    eyebrow: {
      signup: "Start",
      resetRequest: "Reset",
      resetConfirm: "New password",
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
      forgotPassword: "Forgot password?",
      createAccount: "Create account",
      creatingAccount: "Creating account...",
      sendResetLink: "Send reset link",
      sendingResetLink: "Sending link...",
      updatePassword: "Update password",
      updatingPassword: "Updating password...",
      signIn: "Sign in",
      signingIn: "Signing in...",
      continueWithGoogle: "Continue with Google",
      googleUnavailable: "Google sign-in is not configured yet",
      haveAccount: "Have an account? Sign in",
      newHere: "New here? Create an account",
      backToSignIn: "Back to sign in",
      showActivationCode: "Have an activation code?",
      hideActivationCode: "Hide activation code",
    },
    subtitles: {
      login: "Use your email or Google account to continue.",
      signup: "Create one account for Agent, Spaces, Brain, and billing.",
      resetRequest: "Enter the account email and we will send a secure reset link.",
      resetConfirm: "Choose a new password for this account.",
    },
    preservedWork: {
      title: "Return saved.",
      body: "After authentication, ZAKI will bring you back to {{target}}.",
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
      signup: "أنشئ حساب ZAKI",
      resetRequest: "إعادة تعيين كلمة المرور",
      resetConfirm: "عيّن كلمة مرور جديدة",
      login: "تسجيل الدخول إلى ZAKI",
    },
    chrome: {
      product: "ZAKI",
      descriptor: "دخول آمن إلى مساحة العمل",
    },
    eyebrow: {
      signup: "ابدأ",
      resetRequest: "استعادة",
      resetConfirm: "كلمة مرور جديدة",
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
      email: "you@company.com",
      password: "أدخل كلمة المرور",
      confirmPassword: "أعد إدخال كلمة المرور",
      newPassword: "أدخل كلمة مرور جديدة",
      confirmNewPassword: "أعد إدخال كلمة المرور الجديدة",
      accessCode: "رمز التفعيل",
    },
    resetHint: "أدخل كلمة المرور الجديدة أدناه.",
    consent: {
      prefix: "أوافق على",
      link: "الشروط والخصوصية والامتثال",
    },
    actions: {
      forgotPassword: "هل نسيت كلمة المرور؟",
      createAccount: "إنشاء الحساب",
      creatingAccount: "جارٍ إنشاء الحساب...",
      sendResetLink: "إرسال رابط إعادة التعيين",
      sendingResetLink: "جارٍ إرسال الرابط...",
      updatePassword: "تحديث كلمة المرور",
      updatingPassword: "جارٍ تحديث كلمة المرور...",
      signIn: "تسجيل الدخول",
      signingIn: "جارٍ تسجيل الدخول...",
      continueWithGoogle: "المتابعة باستخدام Google",
      googleUnavailable: "تسجيل الدخول عبر Google غير مهيأ بعد",
      haveAccount: "لديك حساب؟ سجّل الدخول",
      newHere: "جديد هنا؟ أنشئ حسابًا",
      backToSignIn: "العودة إلى تسجيل الدخول",
      showActivationCode: "لديك رمز تفعيل؟",
      hideActivationCode: "إخفاء رمز التفعيل",
    },
    subtitles: {
      login: "استخدم بريدك أو حساب Google للمتابعة.",
      signup: "حساب واحد لـ Agent والمساحات والذاكرة والفوترة.",
      resetRequest: "أدخل بريد الحساب وسنرسل لك رابطًا آمنًا لإعادة التعيين.",
      resetConfirm: "اختر كلمة مرور جديدة لهذا الحساب.",
    },
    preservedWork: {
      title: "تم حفظ وجهة الرجوع.",
      body: "بعد التحقق من الهوية، سيعيدك ZAKI إلى {{target}}.",
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
  const [mode, setMode] = useState<AuthMode>(initialToken ? "reset-confirm" : "login");
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
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false);
  const postLoginReturnTo = getPostLoginReturnTo(location);
  const hasPreservedWork = Boolean(postLoginReturnTo);

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
      const returnTo = getPostLoginReturnTo(location);
      const explicitNext = getSafeRelativeReturnTo(
        new URLSearchParams(location.search).get("next")
      );
      const pendingIntent = readPendingIntent();
      const pendingReturnTo = getSafeRelativeReturnTo(pendingIntent?.returnTo ?? null);
      if (pendingReturnTo && (!explicitNext || explicitNext !== pendingReturnTo)) {
        clearPendingIntent();
      }
      if (returnTo) {
        navigate(returnTo, { replace: true });
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

  const modeCopyKey: "login" | "signup" | "resetRequest" | "resetConfirm" =
    mode === "reset-request"
      ? "resetRequest"
      : mode === "reset-confirm"
        ? "resetConfirm"
        : mode;
  const modeTitle = copy.title[modeCopyKey];
  const modeSubtitle = copy.subtitles[modeCopyKey];
  const modeEyebrow = copy.eyebrow[modeCopyKey];
  const preservedWorkBody = copy.preservedWork.body.replace(
    "{{target}}",
    postLoginReturnTo
  );
  const submitDisabled =
    isLoading ||
    ((mode === "login" || mode === "signup" || mode === "reset-request") &&
      email.trim().length === 0) ||
    ((mode === "login" || mode === "signup") && password.length === 0) ||
    (mode === "signup" &&
      (!fullName.trim() ||
        !dateOfBirth.trim() ||
        confirmPassword.length === 0 ||
        !signupLegalConsent)) ||
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

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      lang={locale}
      className="zaki-app-v2 zaki-auth-v2"
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
        <section className="zaki-auth-v2__panel" aria-labelledby="zaki-auth-title">
          <div className="zaki-auth-v2__panel-head">
            <span className="zaki-auth-v2__eyebrow">{modeEyebrow}</span>
            <h1 id="zaki-auth-title">{modeTitle}</h1>
            <p>{modeSubtitle}</p>
            {hasPreservedWork && (mode === "login" || mode === "signup") ? (
              <div className="zaki-auth-v2__callout zaki-auth-v2__callout--compact">
                <strong>{copy.preservedWork.title}</strong>
                <span>{preservedWorkBody}</span>
              </div>
            ) : null}
          </div>

          {(mode === "login" || mode === "signup") && googleOAuthEnabled ? (
            <div className="zaki-auth-v2__oauth-wrap">
              <button
                type="button"
                className="zaki-auth-v2__oauth"
                onClick={() => {
                  window.location.href = buildGoogleOAuthStartUrl(postLoginReturnTo || "/");
                }}
              >
                <span aria-hidden>G</span>
                {copy.actions.continueWithGoogle}
              </button>
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
                required
              />
              {fieldErrors.fullName ? (
                <em className="zaki-auth-v2__field-error">{fieldErrors.fullName}</em>
              ) : null}
            </label>
          )}
          {mode === "signup" && (
            <label className="zaki-auth-v2__field">
              <span>{copy.fields.dateOfBirth}</span>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(event) => {
                  setDateOfBirth(event.target.value);
                  clearFieldError("dateOfBirth");
                }}
                id="signup-bday"
                name="bday"
                autoComplete="bday"
                required
              />
              {fieldErrors.dateOfBirth ? (
                <em className="zaki-auth-v2__field-error">{fieldErrors.dateOfBirth}</em>
              ) : null}
            </label>
          )}
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
                <a href={isRtl ? "/ar/terms?from=signup" : "/terms?from=signup"}>
                  {copy.consent.link}
                </a>
                .
              </span>
            </label>
          )}

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
}
