/**
 * Auth-screen copy (login / signup / password reset), en + ar.
 *
 * Lives in its own module — with no React imports — so that `src/i18n/parity.test.ts`
 * can hold it to the SAME en/ar parity gate as the JSON locale bundles. Before WP-M
 * these ~120 strings were inline in LoginScreen.tsx and outside the gate entirely,
 * which meant an English sentence could ship into the Arabic auth screen unnoticed.
 *
 * Every key added to `en` MUST be added to `ar`, and vice versa.
 */
export const AUTH_COPY = {
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
    reauth: {
      title: "Session expired",
      detail: "Sign in again to continue. Your work is still here.",
    },
    eyebrow: {
      signup: "Start",
      resetRequest: "Reset",
      resetConfirm: "New password",
      login: "Welcome back",
    },
    fields: {
      fullName: "Full name",
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
      oauthPrefix: "By continuing with Google you agree to the",
      terms: "Terms",
      privacy: "Privacy Notice",
      compliance: "Security & Compliance",
      // WP-M: ZAKI no longer collects a date of birth, so minimum age is ATTESTED
      // via the Terms rather than proved with a birthdate. The age language must
      // not vanish silently just because the field did — this line is what carries
      // the minimum-age representation now, on both the email and Google paths.
      ageAttestation:
        "By continuing you confirm you meet the minimum age in our Terms.",
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
      consentRequired: "Please accept Terms, Privacy & Compliance to create an account.",
      signupFailed: "Sign up failed. Please check your details and try again.",
      loginFailed: "Login failed. Check your credentials and try again.",
      loginServiceDown:
        "Login service is temporarily unavailable. Please try again in a moment.",
      activationCodeInvalid: "Activation code is invalid or expired.",
      genericSignupFailed: "Sign up failed. Please try again.",
      genericResetFailed: "Password reset failed. Please try again.",
      genericLoginFailed: "Login failed. Please try again.",
      captchaRequired: "Complete the verification challenge before creating an account.",
      googleConsentRequired:
        "Please accept Terms, Privacy & Compliance, then continue with Google again.",
      // WP-M: this used to tell people to "create your account with your email
      // address instead", because email was the path that collected a birthdate.
      // It no longer does — so we must not send anyone down a route that cannot
      // help them. The backend only emits `age_verification_required` if the
      // dormant age gate is re-enabled, in which case NO path can create an
      // account and support is the only honest next step.
      googleAgeUnverifiable:
        "We can't verify your age right now, so we're unable to create an account. Please contact support@chatzaki.com.",
      googleUnderage: "You are not old enough to create a ZAKI account.",
      googleOAuthFailed: "Google sign-in failed. Please try again.",
      googlePopupBlocked:
        "We couldn't open Google sign-in. Allow pop-ups for ZAKI and try again.",
      // WP-B10 — each of these used to be an UNMAPPED code that produced a blank login
      // form with no message. Every one now names what happened and what to do next.
      googleOAuthCancelled:
        "Google sign-in was cancelled. Try again, or sign in with your email and password.",
      googleOAuthIncomplete:
        "Google sign-in didn't complete. Try again, or sign in with your email and password.",
      googleOAuthUnavailable:
        "Google sign-in isn't available right now. Sign in with your email and password instead.",
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
    reauth: {
      title: "انتهت الجلسة",
      detail: "سجّل الدخول مجددًا للمتابعة. عملك ما زال محفوظًا هنا.",
    },
    eyebrow: {
      signup: "ابدأ",
      resetRequest: "استعادة",
      resetConfirm: "كلمة مرور جديدة",
      login: "مرحبًا بعودتك",
    },
    fields: {
      fullName: "الاسم الكامل",
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
      oauthPrefix: "بالمتابعة باستخدام Google فإنك توافق على",
      terms: "شروط الاستخدام",
      privacy: "إشعار الخصوصية",
      compliance: "الأمان والامتثال",
      ageAttestation: "بالمتابعة، فإنك تؤكد أنك تستوفي الحد الأدنى للعمر المذكور في شروطنا.",
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
      consentRequired: "يرجى الموافقة على الشروط والخصوصية والامتثال لإنشاء الحساب.",
      signupFailed: "فشل إنشاء الحساب. يرجى مراجعة بياناتك والمحاولة مرة أخرى.",
      loginFailed: "فشل تسجيل الدخول. تحقق من بياناتك ثم حاول مرة أخرى.",
      loginServiceDown:
        "خدمة تسجيل الدخول غير متاحة مؤقتًا. يرجى المحاولة بعد قليل.",
      activationCodeInvalid: "رمز التفعيل غير صالح أو منتهي الصلاحية.",
      genericSignupFailed: "فشل إنشاء الحساب. حاول مرة أخرى.",
      genericResetFailed: "فشلت إعادة تعيين كلمة المرور. حاول مرة أخرى.",
      genericLoginFailed: "فشل تسجيل الدخول. حاول مرة أخرى.",
      captchaRequired: "أكمل تحدي التحقق قبل إنشاء الحساب.",
      googleConsentRequired:
        "يرجى الموافقة على الشروط والخصوصية والامتثال ثم المتابعة باستخدام Google مرة أخرى.",
      googleAgeUnverifiable:
        "لا يمكننا التحقق من عمرك حاليًا، لذا يتعذر إنشاء الحساب. يرجى التواصل مع support@chatzaki.com.",
      googleUnderage: "عمرك لا يسمح بإنشاء حساب ZAKI.",
      googleOAuthFailed: "فشل تسجيل الدخول عبر Google. يرجى المحاولة مرة أخرى.",
      googlePopupBlocked:
        "تعذر فتح تسجيل الدخول عبر Google. اسمح بالنوافذ المنبثقة لـ ZAKI ثم حاول مرة أخرى.",
      googleOAuthCancelled:
        "تم إلغاء تسجيل الدخول عبر Google. حاول مرة أخرى أو سجّل الدخول ببريدك الإلكتروني وكلمة المرور.",
      googleOAuthIncomplete:
        "لم يكتمل تسجيل الدخول عبر Google. حاول مرة أخرى أو سجّل الدخول ببريدك الإلكتروني وكلمة المرور.",
      googleOAuthUnavailable:
        "تسجيل الدخول عبر Google غير متاح حاليًا. سجّل الدخول ببريدك الإلكتروني وكلمة المرور بدلًا من ذلك.",
    },
  },
} as const;
