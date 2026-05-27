import { LEGAL_POLICY_VERSION_FALLBACK } from "./legal-consent.js";

const PROD = "production";

function normalize(value) {
  return String(value || "").trim();
}

function parseCsv(value) {
  return normalize(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isTruthyBoolean(value) {
  return ["1", "true", "yes", "on"].includes(normalize(value).toLowerCase());
}

function isSkipVerificationMode(value) {
  return ["non", "none", "no"].includes(normalize(value).toLowerCase());
}

function hasHttpsUrl(value) {
  return /^https:\/\//i.test(normalize(value));
}

function hasHttpUrl(value) {
  return /^https?:\/\//i.test(normalize(value));
}

function hasUnsafeOrigin(origin) {
  return /^file:\/\//i.test(origin) || /localhost|127\.0\.0\.1/i.test(origin);
}

function pushIssue(list, key, message) {
  list.push({ key, message });
}

export function validateRuntimeConfig(env = process.env) {
  const nodeEnv = normalize(env.NODE_ENV) || "development";
  const isProduction = nodeEnv === PROD;

  const allowedOrigins = parseCsv(env.ZAKI_ALLOWED_ORIGINS);
  const superAdminEmails = parseCsv(env.ZAKI_SUPER_ADMIN_EMAILS);
  const legacyAdminEmails = parseCsv(env.ZAKI_ADMIN_EMAILS);
  const emailMode = normalize(env.ZAKI_EMAIL_MODE || "console").toLowerCase();
  const legalPolicyVersion = normalize(env.ZAKI_LEGAL_POLICY_VERSION);
  const includeVerifyLink = isTruthyBoolean(env.ZAKI_INCLUDE_VERIFY_LINK);
  const memoryAlertWebhook = normalize(env.ZAKI_MEMORY_ALERT_WEBHOOK_URL);
  const billingAlertWebhook = normalize(env.ZAKI_BILLING_ALERT_WEBHOOK_URL);
  const billingProvider = normalize(env.ZAKI_BILLING_PROVIDER || "stripe").toLowerCase();
  const stripePriceStudentYearly = normalize(env.STRIPE_PRICE_STUDENT_YEARLY);
  const stripePricePersonalYearly = normalize(env.STRIPE_PRICE_PERSONAL_YEARLY);
  const stripePriceAgentMonthly = normalize(env.STRIPE_PRICE_AGENT_MONTHLY);
  const stripePriceLearnMonthly = normalize(env.STRIPE_PRICE_LEARN_MONTHLY);
  const stripePriceCompleteMonthly = normalize(env.STRIPE_PRICE_COMPLETE_MONTHLY);
  const stripePriceAccessCodeMonthly = normalize(env.STRIPE_PRICE_ACCESS_CODE_MONTHLY);
  const stripeBillingPortalConfiguration = normalize(env.STRIPE_BILLING_PORTAL_CONFIGURATION);
  const learningEnabled = isTruthyBoolean(env.ZAKI_LEARNING_ENABLED);
  const learningBaseUrl = normalize(env.LEARNING_ENGINE_BASE_URL);
  const learningInternalToken = normalize(env.LEARNING_ENGINE_INTERNAL_TOKEN);
  const designEnabled = isTruthyBoolean(env.ZAKI_DESIGN_ENABLED);
  const designBaseUrl = normalize(env.DESIGN_ENGINE_BASE_URL);
  const designInternalToken = normalize(env.DESIGN_ENGINE_INTERNAL_TOKEN || env.ZAKI_DESIGN_INTERNAL_TOKEN);
  const nullalisDevUserId = normalize(env.NULLALIS_DEV_USER_ID || env.NULLCLAW_DEV_USER_ID);
  const googleClientId = normalize(env.GOOGLE_CLIENT_ID);
  const googleClientSecret = normalize(env.GOOGLE_CLIENT_SECRET);
  const googleRedirectUri = normalize(env.GOOGLE_OAUTH_REDIRECT_URI);
  const googleStateSecret = normalize(env.GOOGLE_OAUTH_STATE_SECRET || env.ZAKI_JWT_SIGNING_KEY);

  const errors = [];
  const warnings = [];

  if (!normalize(env.NOVA_TYP_BASE_URL)) {
    pushIssue(errors, "NOVA_TYP_BASE_URL", "NOVA_TYP_BASE_URL must be set.");
  }
  if (!normalize(env.NOVA_TYP_API_KEY)) {
    pushIssue(errors, "NOVA_TYP_API_KEY", "NOVA_TYP_API_KEY must be set.");
  }
  if (
    normalize(env.PGSSLMODE).toLowerCase() === "require" &&
    normalize(env.PGSSL_REJECT_UNAUTHORIZED).toLowerCase() === "false"
  ) {
    pushIssue(
      errors,
      "PGSSL_REJECT_UNAUTHORIZED",
      "PGSSL_REJECT_UNAUTHORIZED=false is not allowed when PGSSLMODE=require."
    );
  }

  if (!legalPolicyVersion) {
    pushIssue(
      warnings,
      "ZAKI_LEGAL_POLICY_VERSION",
      `ZAKI_LEGAL_POLICY_VERSION is not set. Falling back to ${LEGAL_POLICY_VERSION_FALLBACK}.`
    );
  }

  if (includeVerifyLink && isProduction) {
    pushIssue(
      warnings,
      "ZAKI_INCLUDE_VERIFY_LINK",
      "ZAKI_INCLUDE_VERIFY_LINK=true is usually unsafe in production."
    );
  }

  if (memoryAlertWebhook && !hasHttpUrl(memoryAlertWebhook)) {
    pushIssue(
      warnings,
      "ZAKI_MEMORY_ALERT_WEBHOOK_URL",
      "ZAKI_MEMORY_ALERT_WEBHOOK_URL should start with http:// or https://."
    );
  }
  if (billingAlertWebhook && !hasHttpUrl(billingAlertWebhook)) {
    pushIssue(
      warnings,
      "ZAKI_BILLING_ALERT_WEBHOOK_URL",
      "ZAKI_BILLING_ALERT_WEBHOOK_URL should start with http:// or https://."
    );
  }
  if (billingProvider === "stripe" && !stripePriceStudentYearly) {
    pushIssue(
      warnings,
      "STRIPE_PRICE_STUDENT_YEARLY",
      "STRIPE_PRICE_STUDENT_YEARLY is not set. Student yearly checkout will be unavailable."
    );
  }
  if (billingProvider === "stripe" && !stripePricePersonalYearly) {
    pushIssue(
      warnings,
      "STRIPE_PRICE_PERSONAL_YEARLY",
      "STRIPE_PRICE_PERSONAL_YEARLY is not set. Personal yearly checkout will be unavailable."
    );
  }
  if (billingProvider === "stripe" && !stripePriceAgentMonthly) {
    pushIssue(
      warnings,
      "STRIPE_PRICE_AGENT_MONTHLY",
      "STRIPE_PRICE_AGENT_MONTHLY is not set. ZAKI Agent checkout will be unavailable."
    );
  }
  if (billingProvider === "stripe" && !stripePriceLearnMonthly) {
    pushIssue(
      warnings,
      "STRIPE_PRICE_LEARN_MONTHLY",
      "STRIPE_PRICE_LEARN_MONTHLY is not set. ZAKI Learn checkout will be unavailable."
    );
  }
  if (billingProvider === "stripe" && !stripePriceCompleteMonthly) {
    pushIssue(
      warnings,
      "STRIPE_PRICE_COMPLETE_MONTHLY",
      "STRIPE_PRICE_COMPLETE_MONTHLY is not set. ZAKI Complete checkout will be unavailable."
    );
  }
  if (billingProvider === "stripe" && !stripePriceAccessCodeMonthly) {
    pushIssue(
      warnings,
      "STRIPE_PRICE_ACCESS_CODE_MONTHLY",
      "STRIPE_PRICE_ACCESS_CODE_MONTHLY is not set. Access-code purchase checkout will be unavailable."
    );
  }
  if (
    billingProvider === "stripe" &&
    stripePriceAgentMonthly &&
    stripePriceLearnMonthly &&
    stripePriceCompleteMonthly &&
    !stripeBillingPortalConfiguration
  ) {
    pushIssue(
      warnings,
      "STRIPE_BILLING_PORTAL_CONFIGURATION",
      "STRIPE_BILLING_PORTAL_CONFIGURATION is not set. Agent/Learn to Complete upgrades will be unavailable."
    );
  }
  if (learningEnabled) {
    if (!learningBaseUrl) {
      pushIssue(
        errors,
        "LEARNING_ENGINE_BASE_URL",
        "LEARNING_ENGINE_BASE_URL is required when ZAKI_LEARNING_ENABLED=true."
      );
    } else if (!hasHttpUrl(learningBaseUrl)) {
      pushIssue(
        errors,
        "LEARNING_ENGINE_BASE_URL",
        "LEARNING_ENGINE_BASE_URL must start with http:// or https://."
      );
    }
    if (!learningInternalToken) {
      pushIssue(
        errors,
        "LEARNING_ENGINE_INTERNAL_TOKEN",
        "LEARNING_ENGINE_INTERNAL_TOKEN is required when ZAKI_LEARNING_ENABLED=true."
      );
    }
  } else if (learningBaseUrl || learningInternalToken) {
    pushIssue(
      warnings,
      "ZAKI_LEARNING_ENABLED",
      "Learning engine config is present, but ZAKI_LEARNING_ENABLED is not true."
    );
  }
  if (designEnabled) {
    if (!designBaseUrl) {
      pushIssue(
        errors,
        "DESIGN_ENGINE_BASE_URL",
        "DESIGN_ENGINE_BASE_URL is required when ZAKI_DESIGN_ENABLED=true."
      );
    } else if (!hasHttpUrl(designBaseUrl)) {
      pushIssue(
        errors,
        "DESIGN_ENGINE_BASE_URL",
        "DESIGN_ENGINE_BASE_URL must start with http:// or https://."
      );
    }
    if (!designInternalToken) {
      pushIssue(
        errors,
        "DESIGN_ENGINE_INTERNAL_TOKEN",
        "DESIGN_ENGINE_INTERNAL_TOKEN is required when ZAKI_DESIGN_ENABLED=true."
      );
    }
  } else if (designBaseUrl || designInternalToken) {
    pushIssue(
      warnings,
      "ZAKI_DESIGN_ENABLED",
      "Design engine config is present, but ZAKI_DESIGN_ENABLED is not true."
    );
  }

  if (nullalisDevUserId && !isProduction) {
    pushIssue(
      warnings,
      "NULLALIS_DEV_USER_ID",
      "NULLALIS_DEV_USER_ID/NULLCLAW_DEV_USER_ID is a local-only agent auth bypass; unset it for multi-user smoke tests."
    );
  }

  const hasPartialGoogleOAuth =
    googleClientId || googleClientSecret || googleRedirectUri || normalize(env.GOOGLE_OAUTH_STATE_SECRET);
  if (hasPartialGoogleOAuth) {
    if (!googleClientId) {
      pushIssue(warnings, "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_ID is required to enable Google OAuth.");
    }
    if (!googleClientSecret) {
      pushIssue(warnings, "GOOGLE_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET is required to enable Google OAuth.");
    }
    if (googleRedirectUri && !hasHttpUrl(googleRedirectUri)) {
      pushIssue(warnings, "GOOGLE_OAUTH_REDIRECT_URI", "GOOGLE_OAUTH_REDIRECT_URI must start with http:// or https://.");
    }
    if (!googleStateSecret) {
      pushIssue(warnings, "GOOGLE_OAUTH_STATE_SECRET", "GOOGLE_OAUTH_STATE_SECRET or ZAKI_JWT_SIGNING_KEY is required for Google OAuth state signing.");
    }
  }

  if (superAdminEmails.length === 0) {
    pushIssue(
      warnings,
      "ZAKI_SUPER_ADMIN_EMAILS",
      "ZAKI_SUPER_ADMIN_EMAILS is not set. Falling back to in-code super admin defaults."
    );
  }
  if (legacyAdminEmails.length > 0) {
    pushIssue(
      warnings,
      "ZAKI_ADMIN_EMAILS",
      "ZAKI_ADMIN_EMAILS is deprecated for runtime admin access. Use hidden admin management with super admin control."
    );
  }

  if (emailMode === "resend") {
    if (!normalize(env.RESEND_API_KEY)) {
      pushIssue(errors, "RESEND_API_KEY", "RESEND_API_KEY is required when ZAKI_EMAIL_MODE=resend.");
    }
    if (!normalize(env.RESEND_FROM)) {
      pushIssue(errors, "RESEND_FROM", "RESEND_FROM is required when ZAKI_EMAIL_MODE=resend.");
    }
  } else if (emailMode === "smtp") {
    if (!normalize(env.SMTP_HOST)) {
      pushIssue(errors, "SMTP_HOST", "SMTP_HOST is required when ZAKI_EMAIL_MODE=smtp.");
    }
    if (!normalize(env.SMTP_USER)) {
      pushIssue(errors, "SMTP_USER", "SMTP_USER is required when ZAKI_EMAIL_MODE=smtp.");
    }
    if (!normalize(env.SMTP_PASS)) {
      pushIssue(errors, "SMTP_PASS", "SMTP_PASS is required when ZAKI_EMAIL_MODE=smtp.");
    }
    if (!normalize(env.SMTP_FROM)) {
      pushIssue(errors, "SMTP_FROM", "SMTP_FROM is required when ZAKI_EMAIL_MODE=smtp.");
    }
  }

  // SUN-02 — ZAKI_LEGACY_TYP_AUTH_CUTOFF (optional; triggers cutoff enforcement when set)
  const legacyCutoff = normalize(env.ZAKI_LEGACY_TYP_AUTH_CUTOFF);
  if (legacyCutoff) {
    const parsed = new Date(legacyCutoff).getTime();
    if (Number.isNaN(parsed)) {
      pushIssue(
        warnings,
        "ZAKI_LEGACY_TYP_AUTH_CUTOFF",
        "ZAKI_LEGACY_TYP_AUTH_CUTOFF must be a valid ISO date string (e.g. 2026-07-01T00:00:00Z)."
      );
    }
  }

  // OATH-09 — ZAKI_JWT_SIGNING_KEY: warn in dev (error in prod block below)
  const zakiSigningKeyEarly = normalize(env.ZAKI_JWT_SIGNING_KEY);
  if (!zakiSigningKeyEarly) {
    pushIssue(
      warnings,
      "ZAKI_JWT_SIGNING_KEY",
      "ZAKI_JWT_SIGNING_KEY is not set. Auth will throw at runtime. Add a 64-char hex key to .env."
    );
  } else if (!/^[0-9a-f]{64}$/i.test(zakiSigningKeyEarly)) {
    pushIssue(
      warnings,
      "ZAKI_JWT_SIGNING_KEY",
      "ZAKI_JWT_SIGNING_KEY must be a 64-character hex string (256-bit key)."
    );
  }

  if (!isProduction) {
    return {
      ok: errors.length === 0,
      isProduction,
      errors,
      warnings,
      summary: {
        nodeEnv,
        allowedOriginsCount: allowedOrigins.length,
        superAdminEmailsCount: superAdminEmails.length,
        legacyAdminEmailsCount: legacyAdminEmails.length,
        emailMode,
      },
    };
  }

  if (allowedOrigins.length === 0) {
    pushIssue(
      errors,
      "ZAKI_ALLOWED_ORIGINS",
      "ZAKI_ALLOWED_ORIGINS must include explicit production origins."
    );
  }
  if (allowedOrigins.some(hasUnsafeOrigin)) {
    pushIssue(
      errors,
      "ZAKI_ALLOWED_ORIGINS",
      "ZAKI_ALLOWED_ORIGINS contains localhost/file origins, which are not allowed in production."
    );
  }

  if (!normalize(env.ZAKI_PUBLIC_URL)) {
    pushIssue(errors, "ZAKI_PUBLIC_URL", "ZAKI_PUBLIC_URL must be set in production.");
  } else if (!hasHttpsUrl(env.ZAKI_PUBLIC_URL)) {
    pushIssue(errors, "ZAKI_PUBLIC_URL", "ZAKI_PUBLIC_URL must start with https:// in production.");
  }

  if (!normalize(env.ZAKI_APP_URL)) {
    pushIssue(errors, "ZAKI_APP_URL", "ZAKI_APP_URL must be set in production.");
  } else if (!hasHttpsUrl(env.ZAKI_APP_URL)) {
    pushIssue(errors, "ZAKI_APP_URL", "ZAKI_APP_URL must start with https:// in production.");
  }

  if (memoryAlertWebhook && !hasHttpsUrl(memoryAlertWebhook)) {
    pushIssue(
      errors,
      "ZAKI_MEMORY_ALERT_WEBHOOK_URL",
      "ZAKI_MEMORY_ALERT_WEBHOOK_URL must start with https:// in production."
    );
  }
  if (billingAlertWebhook && !hasHttpsUrl(billingAlertWebhook)) {
    pushIssue(
      errors,
      "ZAKI_BILLING_ALERT_WEBHOOK_URL",
      "ZAKI_BILLING_ALERT_WEBHOOK_URL must start with https:// in production."
    );
  }

  if (isSkipVerificationMode(emailMode)) {
    pushIssue(
      errors,
      "ZAKI_EMAIL_MODE",
      "ZAKI_EMAIL_MODE must not bypass verification in production."
    );
  }

  if (nullalisDevUserId) {
    pushIssue(
      errors,
      "NULLALIS_DEV_USER_ID",
      "NULLALIS_DEV_USER_ID/NULLCLAW_DEV_USER_ID must not be set in production because it maps all agent traffic to one configured user."
    );
  }

  if (!legalPolicyVersion) {
    pushIssue(
      errors,
      "ZAKI_LEGAL_POLICY_VERSION",
      "ZAKI_LEGAL_POLICY_VERSION must be explicitly set in production."
    );
  }

  // OATH-09 — ZAKI_JWT_SIGNING_KEY (256-bit hex, in k8s secret zaki-api-secrets)
  const zakiSigningKey = normalize(env.ZAKI_JWT_SIGNING_KEY);
  if (!zakiSigningKey) {
    pushIssue(
      errors,
      "ZAKI_JWT_SIGNING_KEY",
      "ZAKI_JWT_SIGNING_KEY must be set in production (256-bit hex string)."
    );
  } else if (!/^[0-9a-f]{64}$/i.test(zakiSigningKey)) {
    pushIssue(
      errors,
      "ZAKI_JWT_SIGNING_KEY",
      "ZAKI_JWT_SIGNING_KEY must be a 64-character hex string (256-bit key)."
    );
  }

  return {
    ok: errors.length === 0,
    isProduction,
    errors,
    warnings,
    summary: {
      nodeEnv,
      allowedOriginsCount: allowedOrigins.length,
      superAdminEmailsCount: superAdminEmails.length,
      legacyAdminEmailsCount: legacyAdminEmails.length,
      emailMode,
    },
  };
}

export function enforceRuntimeConfig(env = process.env) {
  const report = validateRuntimeConfig(env);
  if (!report.ok) {
    const details = report.errors.map((issue) => `${issue.key}: ${issue.message}`).join(" | ");
    throw new Error(`[Config] Invalid runtime configuration. ${details}`);
  }
  return report;
}
