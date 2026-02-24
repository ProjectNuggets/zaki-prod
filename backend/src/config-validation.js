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

  if (!legalPolicyVersion) {
    pushIssue(
      errors,
      "ZAKI_LEGAL_POLICY_VERSION",
      "ZAKI_LEGAL_POLICY_VERSION must be explicitly set in production."
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
